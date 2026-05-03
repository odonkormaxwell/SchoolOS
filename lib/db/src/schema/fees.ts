import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable, classesTable } from "./people";

export const feeTypesTable = pgTable("fee_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFeeTypeSchema = createInsertSchema(feeTypesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFeeType = z.infer<typeof insertFeeTypeSchema>;
export type FeeType = typeof feeTypesTable.$inferSelect;

export const feeAssignmentsTable = pgTable("fee_assignments", {
  id: serial("id").primaryKey(),
  feeTypeId: integer("fee_type_id").notNull().references(() => feeTypesTable.id),
  classId: integer("class_id").references(() => classesTable.id),
  termId: integer("term_id").notNull(),
  amount: real("amount").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFeeAssignmentSchema = createInsertSchema(feeAssignmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFeeAssignment = z.infer<typeof insertFeeAssignmentSchema>;
export type FeeAssignment = typeof feeAssignmentsTable.$inferSelect;

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  receiptNumber: text("receipt_number").notNull().unique(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id),
  feeTypeId: integer("fee_type_id").notNull().references(() => feeTypesTable.id),
  termId: integer("term_id").notNull(),
  amountPaid: real("amount_paid").notNull(),
  paymentDate: text("payment_date").notNull(),
  paymentMethod: text("payment_method").notNull().default("cash"),
  notes: text("notes"),
  collectedBy: text("collected_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, receiptNumber: true, collectedBy: true, createdAt: true, updatedAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
