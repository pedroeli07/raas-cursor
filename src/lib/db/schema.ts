import { pgTable, text, timestamp, uuid, decimal } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").notNull().unique(),
  password: text("password"),
  role: text("role").notNull().default("USER"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  status: text("status").notNull().default("PENDING"),
  createdAt: timestamp("created_at").defaultNow(),
  referenceMonth: text("reference_month").notNull(),
  dueDate: timestamp("due_date").notNull(),
  installationId: uuid("installation_id").notNull(),
  userId: uuid("user_id").notNull(),
  customerId: uuid("customer_id"),
  invoiceNumber: text("invoice_number"),
  totalAmount: decimal("total_amount").notNull(),
  invoiceAmount: decimal("invoice_amount"),
  savings: decimal("savings"),
  savingsPercentage: decimal("savings_percentage"),
  discountPercentage: decimal("discount_percentage"),
  paidAt: timestamp("paid_at"),
  billingAddress: text("billing_address").notNull(),
  lastEmailSentAt: timestamp("last_email_sent_at"),
  lastWhatsAppSentAt: timestamp("last_whatsapp_sent_at"),
  pdfGeneratedAt: timestamp("pdf_generated_at"),
});

export const installations = pgTable("installations", {
  id: uuid("id").primaryKey().defaultRandom(),
  installationNumber: text("installation_number").notNull().unique(),
  type: text("type").notNull(), // "generator" or "consumer"
  ownerId: uuid("owner_id").notNull(),
  distributorId: uuid("distributor_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const distributors = pgTable("distributors", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations setup
export const relations = {
  invoices: {
    customer: (invoices: any) => ({
      relationName: 'user',
      columns: [invoices.customerId || invoices.userId],
      references: [users.id],
    }),
    installation: (invoices: any) => ({
      columns: [invoices.installationId],
      references: [installations.id],
    }),
  },
  installations: {
    owner: (installations: any) => ({
      columns: [installations.ownerId],
      references: [users.id],
    }),
    distributor: (installations: any) => ({
      columns: [installations.distributorId],
      references: [distributors.id],
    }),
  }
};

// Add relations and types
export type InvoiceModel = typeof invoices.$inferSelect;
export type Installation = typeof installations.$inferSelect;
export type Distributor = typeof distributors.$inferSelect;
export type User = typeof users.$inferSelect; 