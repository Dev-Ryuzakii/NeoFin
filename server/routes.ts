import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { z } from "zod";
import { ZodError } from "zod";

const transferSchema = z.object({
  toUserId: z.number(),
  amount: z.number().positive(),
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

  const httpServer = createServer(app);
  return httpServer;
}