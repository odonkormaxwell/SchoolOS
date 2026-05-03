import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const schoolProfileTable = pgTable("school_profile", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  motto: text("motto"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  region: text("region"),
  district: text("district"),
  schoolType: text("school_type").notNull().default("public"),
  logoUrl: text("logo_url"),
  headteacher: text("headteacher"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSchoolProfileSchema = createInsertSchema(schoolProfileTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSchoolProfile = z.infer<typeof insertSchoolProfileSchema>;
export type SchoolProfile = typeof schoolProfileTable.$inferSelect;

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("admin"),
  teacherId: text("teacher_id"),
  studentId: text("student_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

export const academicYearsTable = pgTable("academic_years", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  isCurrent: boolean("is_current").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAcademicYearSchema = createInsertSchema(academicYearsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAcademicYear = z.infer<typeof insertAcademicYearSchema>;
export type AcademicYear = typeof academicYearsTable.$inferSelect;

export const termsTable = pgTable("terms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  academicYearId: serial("academic_year_id").references(() => academicYearsTable.id),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  isCurrent: boolean("is_current").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTermSchema = createInsertSchema(termsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTerm = z.infer<typeof insertTermSchema>;
export type Term = typeof termsTable.$inferSelect;
