import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertTransactionSchema } from "@shared/schema";
import { ZodError } from "zod";

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
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transfer", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { toUserId, amount } = insertTransactionSchema.parse(req.body);
      
      const toUser = await storage.getUser(toUserId);
      if (!toUser) {
        return res.status(400).json({ message: "Recipient not found" });
      }

      // Create transaction and update balances
      await storage.updateUserBalance(req.user.id, -amount);
      await storage.updateUserBalance(toUserId, amount);
      
      const transaction = await storage.createTransaction({
        fromUserId: req.user.id,
        toUserId,
        amount,
        type: "transfer",
        status: "completed"
      });

      res.json(transaction);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid transfer data" });
      } else {
        res.status(500).json({ message: error.message || "Transfer failed" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
