import { pgTable, text, serial, integer, timestamp, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
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
  userId: integer("user_id").references(() => users.id),
  documentType: text("document_type").notNull(), // passport, driver_license, national_id
  documentNumber: text("document_number").notNull(),
  documentImage: text("document_image").notNull(), // URL to stored image
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id").references(() => users.id),
  toUserId: integer("to_user_id").references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: text("type").notNull(), // transfer, bill_payment, airtime, deposit, withdrawal
  status: text("status").notNull(), // pending, completed, failed
  reference: text("reference"), // payment reference for Paystack
  metadata: text("metadata"), // JSON string for additional transaction data
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const billPayments = pgTable("bill_payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
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
  userId: integer("user_id").references(() => users.id),
  transactionId: integer("transaction_id").references(() => transactions.id),
  phoneNumber: text("phone_number").notNull(),
  provider: text("provider").notNull(), // MTN, Airtel, Glo, 9mobile
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull(), // pending, completed, failed
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Create insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  email: true,
  phone: true,
});

export const insertKycDocumentSchema = createInsertSchema(kycDocuments).pick({
  documentType: true,
  documentNumber: true,
  documentImage: true,
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
export type InsertBillPayment = z.infer<typeof insertBillPaymentSchema>;
export type InsertAirtimePurchase = z.infer<typeof insertAirtimePurchaseSchema>;
export type User = typeof users.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type KycDocument = typeof kycDocuments.$inferSelect;
export type BillPayment = typeof billPayments.$inferSelect;
export type AirtimePurchase = typeof airtimePurchases.$inferSelect;