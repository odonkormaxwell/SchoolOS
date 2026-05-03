import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable, classesTable, subjectsTable } from "./people";

export const attendanceTable = pgTable("attendance", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id),
  classId: integer("class_id").notNull().references(() => classesTable.id),
  date: text("date").notNull(),
  status: text("status").notNull().default("present"),
  termId: integer("term_id"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAttendanceSchema = createInsertSchema(attendanceTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendanceTable.$inferSelect;

export const resultsTable = pgTable("results", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id),
  classId: integer("class_id").notNull().references(() => classesTable.id),
  subjectId: integer("subject_id").notNull().references(() => subjectsTable.id),
  termId: integer("term_id").notNull(),
  classScore: real("class_score"),
  examScore: real("exam_score"),
  totalScore: real("total_score"),
  grade: text("grade"),
  remarks: text("remarks"),
  position: integer("position"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertResultSchema = createInsertSchema(resultsTable).omit({ id: true, totalScore: true, grade: true, position: true, createdAt: true, updatedAt: true });
export type InsertResult = z.infer<typeof insertResultSchema>;
export type Result = typeof resultsTable.$inferSelect;
