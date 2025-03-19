import { User, InsertUser, Transaction, KycDocument, InsertKycDocument } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBalance(userId: number, amount: number): Promise<User>;
  updateUserKycStatus(userId: number, verified: boolean): Promise<User>;
  createTransaction(transaction: Partial<Transaction>): Promise<Transaction>;
  getTransactions(userId: number): Promise<Transaction[]>;
  getAllTransactions(): Promise<Transaction[]>;
  createKycDocument(document: InsertKycDocument & { userId: number }): Promise<KycDocument>;
  getKycDocuments(userId: number): Promise<KycDocument[]>;
  getAllPendingKycDocuments(): Promise<KycDocument[]>;
  updateKycDocument(id: number, status: string, reason?: string): Promise<KycDocument>;
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private transactions: Map<number, Transaction>;
  private kycDocuments: Map<number, KycDocument>;
  currentId: number;
  currentTransactionId: number;
  currentKycDocumentId: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.transactions = new Map();
    this.kycDocuments = new Map();
    this.currentId = 1;
    this.currentTransactionId = 1;
    this.currentKycDocumentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = {
      ...insertUser,
      id,
      role: "user",
      balance: "1000", 
      kycVerified: false,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserBalance(userId: number, amount: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    
    const newBalance = parseFloat(user.balance) + amount;
    if (newBalance < 0) throw new Error("Insufficient funds");
    
    const updatedUser = { ...user, balance: newBalance.toFixed(2) };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updateUserKycStatus(userId: number, verified: boolean): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const updatedUser = { ...user, kycVerified: verified };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async createTransaction(transaction: Partial<Transaction>): Promise<Transaction> {
    const id = this.currentTransactionId++;
    const newTransaction: Transaction = {
      id,
      createdAt: new Date(),
      ...transaction,
    } as Transaction;
    
    this.transactions.set(id, newTransaction);
    return newTransaction;
  }

  async getTransactions(userId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(
      (t) => t.fromUserId === userId || t.toUserId === userId
    );
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return Array.from(this.transactions.values());
  }

  async createKycDocument(document: InsertKycDocument & { userId: number }): Promise<KycDocument> {
    const id = this.currentKycDocumentId++;
    const newDocument: KycDocument = {
      id,
      ...document,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as KycDocument;

    this.kycDocuments.set(id, newDocument);
    return newDocument;
  }

  async getKycDocuments(userId: number): Promise<KycDocument[]> {
    return Array.from(this.kycDocuments.values()).filter(
      (doc) => doc.userId === userId
    );
  }

  async getAllPendingKycDocuments(): Promise<KycDocument[]> {
    return Array.from(this.kycDocuments.values()).filter(
      (doc) => doc.status === "pending"
    );
  }

  async updateKycDocument(id: number, status: string, reason?: string): Promise<KycDocument> {
    const document = this.kycDocuments.get(id);
    if (!document) throw new Error("Document not found");

    const updatedDocument = {
      ...document,
      status,
      rejectionReason: reason,
      updatedAt: new Date(),
    };

    this.kycDocuments.set(id, updatedDocument);

    if (status === "approved") {
      await this.updateUserKycStatus(document.userId, true);
    }

    return updatedDocument;
  }
}

export const storage = new MemStorage();