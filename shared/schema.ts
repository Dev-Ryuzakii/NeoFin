import { pgTable, text, serial, integer, timestamp, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  accountNumber: text("account_number").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("user"),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull().default("0"),
  kycVerified: boolean("kyc_verified").notNull().default(false),
  email: text("email"),
  phone: text("phone"),
});

export const kycDocuments = pgTable("kyc_documents", {
  id: serial("id").primaryKey(),
  accountNumber: text("account_number").references(() => users.accountNumber),
  documentType: text("document_type").notNull(), // passport, driver_license, national_id
  documentNumber: text("document_number").notNull(),
  documentImage: text("document_image").notNull(), // Base64 encoded image
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const virtualCards = pgTable("virtual_cards", {
  id: serial("id").primaryKey(),
  accountNumber: text("account_number").references(() => users.accountNumber),
  cardNumber: text("card_number").notNull().unique(),
  expiryMonth: text("expiry_month").notNull(),
  expiryYear: text("expiry_year").notNull(),
  cvv: text("cvv").notNull(),
  status: text("status").notNull().default("active"), // active, blocked, expired
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const externalBanks = pgTable("external_banks", {
  id: serial("id").primaryKey(),
  bankName: text("bank_name").notNull(), // GTBank, OPay, etc.
  bankCode: text("bank_code").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const externalTransfers = pgTable("external_transfers", {
  id: serial("id").primaryKey(),
  accountNumber: text("account_number").references(() => users.accountNumber),
  bankId: integer("bank_id").references(() => externalBanks.id),
  recipientName: text("recipient_name").notNull(),
  recipientAccount: text("recipient_account").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull(), // pending, completed, failed
  reference: text("reference").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  fromAccountNumber: text("from_account_number").references(() => users.accountNumber),
  toAccountNumber: text("to_account_number").references(() => users.accountNumber),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: text("type").notNull(), // transfer, bill_payment, airtime, deposit, withdrawal, external_transfer
  status: text("status").notNull(), // pending, completed, failed
  reference: text("reference"), // payment reference for Paystack
  metadata: text("metadata"), // JSON string for additional transaction data
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const billPayments = pgTable("bill_payments", {
  id: serial("id").primaryKey(),
  accountNumber: text("account_number").references(() => users.accountNumber),
  transactionId: integer("transaction_id").references(() => transactions.id),
  billType: text("bill_type").notNull(), // electricity, water, cable_tv, internet
  provider: text("provider").notNull(),
  billNumber: text("bill_number").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull(), // pending, completed, failed
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const airtimePurchases = pgTable("airtime_purchases", {
  id: serial("id").primaryKey(),
  accountNumber: text("account_number").references(() => users.accountNumber),
  transactionId: integer("transaction_id").references(() => transactions.id),
  phoneNumber: text("phone_number").notNull(),
  provider: text("provider").notNull(), // MTN, Airtel, Glo, 9mobile
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull(), // pending, completed, failed
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Create insert schemas with proper validation
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  email: true,
  phone: true,
});

export const insertKycDocumentSchema = createInsertSchema(kycDocuments)
  .pick({
    documentType: true,
    documentNumber: true,
    documentImage: true,
  })
  .extend({
    documentType: z.enum(["passport", "driver_license", "national_id"]),
    documentNumber: z.string().min(1, "Document number is required"),
    documentImage: z.string().min(1, "Document image is required"),
  });

export const insertVirtualCardSchema = createInsertSchema(virtualCards).pick({
  accountNumber: true,
});

export const insertExternalTransferSchema = createInsertSchema(externalTransfers)
  .pick({
    bankId: true,
    recipientName: true,
    recipientAccount: true,
    amount: true,
  })
  .extend({
    amount: z.number().positive("Amount must be greater than 0"),
  });

export const insertBillPaymentSchema = createInsertSchema(billPayments).pick({
  billType: true,
  provider: true,
  billNumber: true,
  amount: true,
});

export const insertAirtimePurchaseSchema = createInsertSchema(airtimePurchases).pick({
  phoneNumber: true,
  provider: true,
  amount: true,
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertKycDocument = z.infer<typeof insertKycDocumentSchema>;
export type InsertVirtualCard = z.infer<typeof insertVirtualCardSchema>;
export type InsertExternalTransfer = z.infer<typeof insertExternalTransferSchema>;
export type InsertBillPayment = z.infer<typeof insertBillPaymentSchema>;
export type InsertAirtimePurchase = z.infer<typeof insertAirtimePurchaseSchema>;

export type User = typeof users.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type KycDocument = typeof kycDocuments.$inferSelect;
export type VirtualCard = typeof virtualCards.$inferSelect;
export type ExternalBank = typeof externalBanks.$inferSelect;
export type ExternalTransfer = typeof externalTransfers.$inferSelect;
export type BillPayment = typeof billPayments.$inferSelect;
export type AirtimePurchase = typeof airtimePurchases.$inferSelect;

// Add notification types
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  accountNumber: text("account_number").references(() => users.accountNumber),
  type: text("type").notNull(), // transaction, fraud_alert, budget_alert
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;