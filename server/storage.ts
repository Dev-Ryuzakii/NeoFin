import { User, InsertUser, Transaction, KycDocument, InsertKycDocument, BillPayment, AirtimePurchase, InsertBillPayment, InsertAirtimePurchase, VirtualCard, ExternalTransfer, ExternalBank } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { AccountService } from "./services/account";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User operations
  getUser(accountNumber: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBalance(accountNumber: string, amount: number): Promise<User>;
  updateUser(accountNumber: string, updates: Partial<User>): Promise<User>;

  // Transaction operations
  createTransaction(transaction: Partial<Transaction>): Promise<Transaction>;
  getTransactions(accountNumber: string): Promise<Transaction[]>;
  getAllTransactions(): Promise<Transaction[]>;
  updateTransactionStatus(id: number, status: string): Promise<Transaction>;

  // KYC operations
  createKycDocument(document: InsertKycDocument & { accountNumber: string }): Promise<KycDocument>;
  getKycDocuments(accountNumber: string): Promise<KycDocument[]>;
  getAllPendingKycDocuments(): Promise<KycDocument[]>;
  updateKycDocument(id: number, status: string, reason?: string): Promise<KycDocument>;

  // Virtual Card operations
  createVirtualCard(card: Partial<VirtualCard>): Promise<VirtualCard>;
  getVirtualCards(accountNumber: string): Promise<VirtualCard[]>;
  updateVirtualCardStatus(id: number, status: string): Promise<VirtualCard>;

  // External Transfer operations
  createExternalTransfer(transfer: Partial<ExternalTransfer>): Promise<ExternalTransfer>;
  getExternalTransfers(accountNumber: string): Promise<ExternalTransfer[]>;
  updateExternalTransferStatus(id: number, status: string): Promise<ExternalTransfer>;
  getSupportedBanks(): Promise<ExternalBank[]>;

  // Bill Payment operations
  createBillPayment(payment: InsertBillPayment & { accountNumber: string }): Promise<BillPayment>;
  getBillPayments(accountNumber: string): Promise<BillPayment[]>;
  updateBillPaymentStatus(id: number, status: string): Promise<BillPayment>;

  // Airtime Purchase operations
  createAirtimePurchase(purchase: InsertAirtimePurchase & { accountNumber: string }): Promise<AirtimePurchase>;
  getAirtimePurchases(accountNumber: string): Promise<AirtimePurchase[]>;
  updateAirtimePurchaseStatus(id: number, status: string): Promise<AirtimePurchase>;

  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private transactions: Map<number, Transaction>;
  private kycDocuments: Map<number, KycDocument>;
  private virtualCards: Map<number, VirtualCard>;
  private externalTransfers: Map<number, ExternalTransfer>;
  private billPayments: Map<number, BillPayment>;
  private airtimePurchases: Map<number, AirtimePurchase>;

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

  async getUser(accountNumber: string): Promise<User | undefined> {
    return this.users.get(accountNumber);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const accountNumber = await AccountService.assignAccountNumber();
    const user: User = {
      accountNumber,
      ...insertUser,
      role: "user",
      balance: "1000",
      kycVerified: false,
      email: insertUser.email || null,
      phone: insertUser.phone || null,
    };
    this.users.set(accountNumber, user);
    return user;
  }

  async updateUser(accountNumber: string, updates: Partial<User>): Promise<User> {
    const user = await this.getUser(accountNumber);
    if (!user) throw new Error("User not found");

    const updatedUser = { ...user, ...updates };
    this.users.set(accountNumber, updatedUser);
    return updatedUser;
  }

  async updateUserBalance(accountNumber: string, amount: number): Promise<User> {
    const user = await this.getUser(accountNumber);
    if (!user) throw new Error("User not found");

    const newBalance = parseFloat(user.balance) + amount;
    if (newBalance < 0) throw new Error("Insufficient funds");

    const updatedUser = { ...user, balance: newBalance.toFixed(2) };
    this.users.set(accountNumber, updatedUser);
    return updatedUser;
  }

  async createKycDocument(document: InsertKycDocument & { accountNumber: string }): Promise<KycDocument> {
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
    await this.updateUser(document.accountNumber, { kycVerified: true });

    return newDocument;
  }

  async getKycDocuments(accountNumber: string): Promise<KycDocument[]> {
    return Array.from(this.kycDocuments.values()).filter(
      (doc) => doc.accountNumber === accountNumber
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
    if (document.accountNumber) {
      await this.updateUser(document.accountNumber, { 
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

  async getTransactions(accountNumber: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(
      (t) => t.fromAccountNumber === accountNumber || t.toAccountNumber === accountNumber
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

  async getVirtualCards(accountNumber: string): Promise<VirtualCard[]> {
    return Array.from(this.virtualCards.values()).filter(
      (card) => card.accountNumber === accountNumber
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

  async getExternalTransfers(accountNumber: string): Promise<ExternalTransfer[]> {
    return Array.from(this.externalTransfers.values()).filter(
      (transfer) => transfer.accountNumber === accountNumber
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

  async createBillPayment(payment: InsertBillPayment & { accountNumber: string }): Promise<BillPayment> {
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

  async getBillPayments(accountNumber: string): Promise<BillPayment[]> {
    return Array.from(this.billPayments.values()).filter(
      (payment) => payment.accountNumber === accountNumber
    );
  }

  async updateBillPaymentStatus(id: number, status: string): Promise<BillPayment> {
    const payment = this.billPayments.get(id);
    if (!payment) throw new Error("Bill payment not found");

    const updatedPayment = { ...payment, status };
    this.billPayments.set(id, updatedPayment);
    return updatedPayment;
  }

  async createAirtimePurchase(purchase: InsertAirtimePurchase & { accountNumber: string }): Promise<AirtimePurchase> {
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

  async getAirtimePurchases(accountNumber: string): Promise<AirtimePurchase[]> {
    return Array.from(this.airtimePurchases.values()).filter(
      (purchase) => purchase.accountNumber === accountNumber
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