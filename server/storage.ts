import { User, InsertUser, Transaction, KycDocument, InsertKycDocument, BillPayment, AirtimePurchase, InsertBillPayment, InsertAirtimePurchase, VirtualCard, ExternalTransfer, ExternalBank } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { AccountService } from "./services/account";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBalance(userId: number, amount: number): Promise<User>;
  updateUser(userId: number, updates: Partial<User>): Promise<User>;

  // Transaction operations
  createTransaction(transaction: Partial<Transaction>): Promise<Transaction>;
  getTransactions(userId: number): Promise<Transaction[]>;
  getAllTransactions(): Promise<Transaction[]>;
  updateTransactionStatus(id: number, status: string): Promise<Transaction>;

  // KYC operations
  createKycDocument(document: InsertKycDocument & { userId: number }): Promise<KycDocument>;
  getKycDocuments(userId: number): Promise<KycDocument[]>;
  getAllPendingKycDocuments(): Promise<KycDocument[]>;
  updateKycDocument(id: number, status: string, reason?: string): Promise<KycDocument>;

  // Virtual Card operations
  createVirtualCard(card: Partial<VirtualCard>): Promise<VirtualCard>;
  getVirtualCards(userId: number): Promise<VirtualCard[]>;
  updateVirtualCardStatus(id: number, status: string): Promise<VirtualCard>;

  // External Transfer operations
  createExternalTransfer(transfer: Partial<ExternalTransfer>): Promise<ExternalTransfer>;
  getExternalTransfers(userId: number): Promise<ExternalTransfer[]>;
  updateExternalTransferStatus(id: number, status: string): Promise<ExternalTransfer>;
  getSupportedBanks(): Promise<ExternalBank[]>;

  // Bill Payment operations
  createBillPayment(payment: InsertBillPayment & { userId: number }): Promise<BillPayment>;
  getBillPayments(userId: number): Promise<BillPayment[]>;
  updateBillPaymentStatus(id: number, status: string): Promise<BillPayment>;

  // Airtime Purchase operations
  createAirtimePurchase(purchase: InsertAirtimePurchase & { userId: number }): Promise<AirtimePurchase>;
  getAirtimePurchases(userId: number): Promise<AirtimePurchase[]>;
  updateAirtimePurchaseStatus(id: number, status: string): Promise<AirtimePurchase>;

  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private transactions: Map<number, Transaction>;
  private kycDocuments: Map<number, KycDocument>;
  private virtualCards: Map<number, VirtualCard>;
  private externalTransfers: Map<number, ExternalTransfer>;
  private billPayments: Map<number, BillPayment>;
  private airtimePurchases: Map<number, AirtimePurchase>;

  currentId: number;
  currentTransactionId: number;
  currentKycDocumentId: number;
  currentVirtualCardId: number;
  currentExternalTransferId: number;
  currentBillPaymentId: number;
  currentAirtimePurchaseId: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.transactions = new Map();
    this.kycDocuments = new Map();
    this.virtualCards = new Map();
    this.externalTransfers = new Map();
    this.billPayments = new Map();
    this.airtimePurchases = new Map();

    this.currentId = 1;
    this.currentTransactionId = 1;
    this.currentKycDocumentId = 1;
    this.currentVirtualCardId = 1;
    this.currentExternalTransferId = 1;
    this.currentBillPaymentId = 1;
    this.currentAirtimePurchaseId = 1;

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
    const accountNumber = await AccountService.assignAccountNumber({ id } as User);

    const user: User = {
      id,
      ...insertUser,
      role: "user",
      balance: "1000",
      kycVerified: false,
      email: insertUser.email || null,
      phone: insertUser.phone || null,
      accountNumber,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(userId: number, updates: Partial<User>): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const updatedUser = { ...user, ...updates };
    this.users.set(userId, updatedUser);
    return updatedUser;
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

  async createKycDocument(document: InsertKycDocument & { userId: number }): Promise<KycDocument> {
    const id = this.currentKycDocumentId++;
    const newDocument: KycDocument = {
      id,
      ...document,
      status: "pending",
      rejectionReason: null,
      createdAt: new Date(),
      updatedAt: null,
    };

    this.kycDocuments.set(id, newDocument);

    // Update user's KYC status
    await this.updateUser(document.userId, { kycVerified: true });

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

    const updatedDocument: KycDocument = {
      ...document,
      status,
      rejectionReason: reason || null,
      updatedAt: new Date(),
    };

    this.kycDocuments.set(id, updatedDocument);

    // Update user's KYC status based on document status
    if (document.userId) {
      await this.updateUser(document.userId, { 
        kycVerified: status === "approved" 
      });
    }

    return updatedDocument;
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
  async updateTransactionStatus(id: number, status: string): Promise<Transaction> {
    const transaction = this.transactions.get(id);
    if (!transaction) throw new Error("Transaction not found");

    const updatedTransaction = { ...transaction, status };
    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }

  async createVirtualCard(card: Partial<VirtualCard>): Promise<VirtualCard> {
    const id = this.currentVirtualCardId++;
    const newCard: VirtualCard = {
      id,
      ...card,
      createdAt: new Date(),
    } as VirtualCard;

    this.virtualCards.set(id, newCard);
    return newCard;
  }

  async getVirtualCards(userId: number): Promise<VirtualCard[]> {
    return Array.from(this.virtualCards.values()).filter(
      (card) => card.userId === userId
    );
  }

  async updateVirtualCardStatus(id: number, status: string): Promise<VirtualCard> {
    const card = this.virtualCards.get(id);
    if (!card) throw new Error("Virtual card not found");

    const updatedCard = { ...card, status };
    this.virtualCards.set(id, updatedCard);
    return updatedCard;
  }

  async createExternalTransfer(transfer: Partial<ExternalTransfer>): Promise<ExternalTransfer> {
    const id = this.currentExternalTransferId++;
    const newTransfer: ExternalTransfer = {
      id,
      ...transfer,
      createdAt: new Date(),
    } as ExternalTransfer;

    this.externalTransfers.set(id, newTransfer);
    return newTransfer;
  }

  async getExternalTransfers(userId: number): Promise<ExternalTransfer[]> {
    return Array.from(this.externalTransfers.values()).filter(
      (transfer) => transfer.userId === userId
    );
  }

  async updateExternalTransferStatus(id: number, status: string): Promise<ExternalTransfer> {
    const transfer = this.externalTransfers.get(id);
    if (!transfer) throw new Error("External transfer not found");

    const updatedTransfer = { ...transfer, status };
    this.externalTransfers.set(id, updatedTransfer);
    return updatedTransfer;
  }

  async getSupportedBanks(): Promise<ExternalBank[]> {
    return [
      { id: 1, bankName: 'GTBank', bankCode: '058', createdAt: new Date() },
      { id: 2, bankName: 'OPay', bankCode: '100', createdAt: new Date() },
      { id: 3, bankName: 'Kuda Bank', bankCode: '090267', createdAt: new Date() },
      { id: 4, bankName: 'Palmpay', bankCode: '100033', createdAt: new Date() },
    ];
  }

  async createBillPayment(payment: InsertBillPayment & { userId: number }): Promise<BillPayment> {
    const id = this.currentBillPaymentId++;
    const newPayment: BillPayment = {
      id,
      ...payment,
      status: "pending",
      createdAt: new Date(),
    } as BillPayment;

    this.billPayments.set(id, newPayment);
    return newPayment;
  }

  async getBillPayments(userId: number): Promise<BillPayment[]> {
    return Array.from(this.billPayments.values()).filter(
      (payment) => payment.userId === userId
    );
  }

  async updateBillPaymentStatus(id: number, status: string): Promise<BillPayment> {
    const payment = this.billPayments.get(id);
    if (!payment) throw new Error("Bill payment not found");

    const updatedPayment = { ...payment, status };
    this.billPayments.set(id, updatedPayment);
    return updatedPayment;
  }

  async createAirtimePurchase(purchase: InsertAirtimePurchase & { userId: number }): Promise<AirtimePurchase> {
    const id = this.currentAirtimePurchaseId++;
    const newPurchase: AirtimePurchase = {
      id,
      ...purchase,
      status: "pending",
      createdAt: new Date(),
    } as AirtimePurchase;

    this.airtimePurchases.set(id, newPurchase);
    return newPurchase;
  }

  async getAirtimePurchases(userId: number): Promise<AirtimePurchase[]> {
    return Array.from(this.airtimePurchases.values()).filter(
      (purchase) => purchase.userId === userId
    );
  }

  async updateAirtimePurchaseStatus(id: number, status: string): Promise<AirtimePurchase> {
    const purchase = this.airtimePurchases.get(id);
    if (!purchase) throw new Error("Airtime purchase not found");

    const updatedPurchase = { ...purchase, status };
    this.airtimePurchases.set(id, updatedPurchase);
    return updatedPurchase;
  }
}

export const storage = new MemStorage();