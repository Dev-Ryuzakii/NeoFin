import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { z } from "zod";
import { ZodError } from "zod";
import multer from "multer";
import path from "path";

const transferSchema = z.object({
  toUserId: z.number(),
  amount: z.number().positive(),
});

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.mimetype)) {
      cb(new Error("Invalid file type. Only JPEG and PNG are allowed"));
      return;
    }
    cb(null, true);
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  app.get("/api/transactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const transactions = req.user.role === "admin"
        ? await storage.getAllTransactions()
        : await storage.getTransactions(req.user.id);
      res.json(transactions);
    } catch (error) {
      console.error("Transaction fetch error:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transfer", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { toUserId, amount } = transferSchema.parse(req.body);

      const toUser = await storage.getUser(toUserId);
      if (!toUser) {
        return res.status(400).json({ message: "Recipient not found" });
      }

      if (toUserId === req.user.id) {
        return res.status(400).json({ message: "Cannot transfer to yourself" });
      }

      // Create transaction and update balances
      await storage.updateUserBalance(req.user.id, -amount);
      await storage.updateUserBalance(toUserId, amount);

      const transaction = await storage.createTransaction({
        fromUserId: req.user.id,
        toUserId,
        amount: amount.toString(),
        type: "transfer",
        status: "completed"
      });

      res.json(transaction);
    } catch (error) {
      console.error("Transfer error:", error);
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid transfer data" });
      } else if (error instanceof Error) {
        res.status(500).json({ message: error.message || "Transfer failed" });
      } else {
        res.status(500).json({ message: "An unexpected error occurred" });
      }
    }
  });

  // KYC Routes
  app.post("/api/kyc/submit", upload.single("documentImage"), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    try {
      const kycDoc = await storage.createKycDocument({
        userId: req.user.id,
        documentType: req.body.documentType,
        documentNumber: req.body.documentNumber,
        documentImage: req.file.buffer.toString("base64"), // Store as base64 for demo
      });

      res.json(kycDoc);
    } catch (error) {
      console.error("KYC submission error:", error);
      res.status(500).json({ message: "Failed to submit KYC documents" });
    }
  });

  app.get("/api/kyc/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const documents = await storage.getKycDocuments(req.user.id);
      res.json(documents);
    } catch (error) {
      console.error("KYC status check error:", error);
      res.status(500).json({ message: "Failed to fetch KYC status" });
    }
  });

    // Admin KYC Routes
  app.get("/api/admin/kyc/pending", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.sendStatus(401);
    }

    try {
      const pendingDocs = await storage.getAllPendingKycDocuments();
      res.json(pendingDocs);
    } catch (error) {
      console.error("Pending KYC fetch error:", error);
      res.status(500).json({ message: "Failed to fetch pending KYC documents" });
    }
  });

  app.post("/api/admin/kyc/:id/verify", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.sendStatus(401);
    }

    try {
      const { status, reason } = req.body;
      const document = await storage.updateKycDocument(
        parseInt(req.params.id),
        status,
        reason
      );
      res.json(document);
    } catch (error) {
      console.error("KYC verification error:", error);
      res.status(500).json({ message: "Failed to verify KYC document" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}