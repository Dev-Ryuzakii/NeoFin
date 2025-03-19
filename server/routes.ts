import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { PaystackService } from "./services/paystack";
import { z } from "zod";
import { ZodError } from "zod";
import multer from "multer";
import path from "path";
import { insertBillPaymentSchema, insertAirtimePurchaseSchema } from "@shared/schema";

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

  // Bill Payment Routes
  app.post("/api/bills/pay", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.user.kycVerified) return res.status(403).json({ message: "KYC verification required" });

    try {
      const billData = insertBillPaymentSchema.parse(req.body);

      // Initialize payment with Paystack
      const payment = await PaystackService.initializePayment(
        parseFloat(billData.amount.toString()),
        req.user.email!,
        {
          type: "bill_payment",
          billType: billData.billType,
          billNumber: billData.billNumber,
        }
      );

      // Create bill payment record
      const billPayment = await storage.createBillPayment({
        ...billData,
        userId: req.user.id,
      });

      // Create associated transaction
      const transaction = await storage.createTransaction({
        fromUserId: req.user.id,
        amount: billData.amount.toString(),
        type: "bill_payment",
        status: "pending",
        reference: payment.reference,
        metadata: JSON.stringify(billPayment),
      });

      res.json({
        authorization_url: payment.authorization_url,
        reference: payment.reference,
      });
    } catch (error) {
      console.error("Bill payment error:", error);
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid bill payment data" });
      } else {
        res.status(500).json({ message: "Failed to process bill payment" });
      }
    }
  });

  // Airtime Purchase Routes
  app.post("/api/airtime/purchase", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const airtimeData = insertAirtimePurchaseSchema.parse(req.body);

      // Initialize payment with Paystack
      const payment = await PaystackService.initializePayment(
        parseFloat(airtimeData.amount.toString()),
        req.user.email!,
        {
          type: "airtime_purchase",
          phoneNumber: airtimeData.phoneNumber,
          provider: airtimeData.provider,
        }
      );

      // Create airtime purchase record
      const airtimePurchase = await storage.createAirtimePurchase({
        ...airtimeData,
        userId: req.user.id,
      });

      // Create associated transaction
      const transaction = await storage.createTransaction({
        fromUserId: req.user.id,
        amount: airtimeData.amount.toString(),
        type: "airtime_purchase",
        status: "pending",
        reference: payment.reference,
        metadata: JSON.stringify(airtimePurchase),
      });

      res.json({
        authorization_url: payment.authorization_url,
        reference: payment.reference,
      });
    } catch (error) {
      console.error("Airtime purchase error:", error);
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid airtime purchase data" });
      } else {
        res.status(500).json({ message: "Failed to process airtime purchase" });
      }
    }
  });

    // Payment Webhook
  app.post("/api/webhook/paystack", async (req, res) => {
    try {
      const event = req.body;
      const reference = event.data.reference;

      // Verify the payment
      const verifiedPayment = await PaystackService.verifyPayment(reference);

      if (verifiedPayment.status === "success") {
        // Find and update the associated transaction
        const transactions = await storage.getAllTransactions();
        const transaction = transactions.find(t => t.reference === reference);

        if (transaction) {
          await storage.updateTransactionStatus(transaction.id, "completed");

          // Update the associated service status based on transaction type
          const metadata = JSON.parse(transaction.metadata || "{}");

          if (transaction.type === "bill_payment") {
            await storage.updateBillPaymentStatus(metadata.id, "completed");
          } else if (transaction.type === "airtime_purchase") {
            await storage.updateAirtimePurchaseStatus(metadata.id, "completed");
          }
        }
      }

      res.sendStatus(200);
    } catch (error) {
      console.error("Webhook processing error:", error);
      res.sendStatus(500);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}