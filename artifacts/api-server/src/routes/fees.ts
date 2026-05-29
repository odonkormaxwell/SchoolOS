import { Router, type IRouter, type Request } from "express";
import { db, feeTypesTable, feeAssignmentsTable, paymentsTable, studentsTable, classesTable, termsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ListFeeTypesResponse,
  CreateFeeTypeBody,
  UpdateFeeTypeParams,
  UpdateFeeTypeBody,
  UpdateFeeTypeResponse,
  DeleteFeeTypeParams,
  ListFeeAssignmentsQueryParams,
  ListFeeAssignmentsResponse,
  CreateFeeAssignmentBody,
  DeleteFeeAssignmentParams,
  ListPaymentsQueryParams,
  ListPaymentsResponse,
  CreatePaymentBody,
  GetPaymentParams,
  GetPaymentResponse,
  DeletePaymentParams,
  ListFeeBalancesQueryParams,
  ListFeeBalancesResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function currentUser(req: Request): { role: string; teacherId: number | null; studentId: number | null } {
  const u = (req as any).currentUser;
  return {
    role: u?.role ?? "admin",
    teacherId: u?.teacherId ? parseInt(u.teacherId) : null,
    studentId: u?.studentId ? parseInt(u.studentId) : null,
  };
}

async function generateReceiptNumber(): Promise<string> {
  const payments = await db.select({ receiptNumber: paymentsTable.receiptNumber }).from(paymentsTable);
  const nums = payments.map(p => parseInt(p.receiptNumber.replace(/\D/g, ""))).filter(n => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 1000;
  return `RCP${String(max + 1).padStart(6, "0")}`;
}

router.get("/fee-types", async (_req, res): Promise<void> => {
  const feeTypes = await db.select().from(feeTypesTable).orderBy(feeTypesTable.name);
  res.json(ListFeeTypesResponse.parse(feeTypes));
});

router.post("/fee-types", async (req, res): Promise<void> => {
  const { role } = currentUser(req);
  if (role !== "admin" && role !== "headteacher" && role !== "accountant") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const parsed = CreateFeeTypeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [feeType] = await db.insert(feeTypesTable).values(parsed.data).returning();
  res.status(201).json(feeType);
});

router.put("/fee-types/:id", async (req, res): Promise<void> => {
  const { role } = currentUser(req);
  if (role !== "admin" && role !== "headteacher" && role !== "accountant") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const params = UpdateFeeTypeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateFeeTypeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [feeType] = await db.update(feeTypesTable).set(parsed.data).where(eq(feeTypesTable.id, params.data.id)).returning();
  if (!feeType) {
    res.status(404).json({ error: "Fee type not found" });
    return;
  }
  res.json(UpdateFeeTypeResponse.parse(feeType));
});

router.delete("/fee-types/:id", async (req, res): Promise<void> => {
  const { role } = currentUser(req);
  if (role !== "admin" && role !== "headteacher" && role !== "accountant") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const params = DeleteFeeTypeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [feeType] = await db.delete(feeTypesTable).where(eq(feeTypesTable.id, params.data.id)).returning();
  if (!feeType) {
    res.status(404).json({ error: "Fee type not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/fee-assignments", async (req, res): Promise<void> => {
  const query = ListFeeAssignmentsQueryParams.safeParse(req.query);
  let assignments = await db.select().from(feeAssignmentsTable).orderBy(feeAssignmentsTable.createdAt);
  const [feeTypes, classes, terms] = await Promise.all([
    db.select().from(feeTypesTable),
    db.select().from(classesTable),
    db.select().from(termsTable),
  ]);
  const feeTypeMap = Object.fromEntries(feeTypes.map(f => [f.id, f.name]));
  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]));
  const termMap = Object.fromEntries(terms.map(t => [t.id, t.name]));

  if (query.success) {
    if (query.data.classId) assignments = assignments.filter(a => a.classId === query.data.classId);
    if (query.data.termId) assignments = assignments.filter(a => a.termId === query.data.termId);
  }

  res.json(ListFeeAssignmentsResponse.parse(assignments.map(a => ({
    ...a,
    feeTypeName: feeTypeMap[a.feeTypeId] ?? null,
    className: a.classId ? classMap[a.classId] ?? null : null,
    termName: termMap[a.termId] ?? null,
  }))));
});

router.post("/fee-assignments", async (req, res): Promise<void> => {
  const { role } = currentUser(req);
  if (role !== "admin" && role !== "headteacher" && role !== "accountant") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const parsed = CreateFeeAssignmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [assignment] = await db.insert(feeAssignmentsTable).values(parsed.data).returning();
  res.status(201).json({ ...assignment, feeTypeName: null, className: null, termName: null });
});

router.delete("/fee-assignments/:id", async (req, res): Promise<void> => {
  const { role } = currentUser(req);
  if (role !== "admin" && role !== "headteacher" && role !== "accountant") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const params = DeleteFeeAssignmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [assignment] = await db.delete(feeAssignmentsTable).where(eq(feeAssignmentsTable.id, params.data.id)).returning();
  if (!assignment) {
    res.status(404).json({ error: "Fee assignment not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/payments", async (req, res): Promise<void> => {
  const { role, studentId } = currentUser(req);
  const query = ListPaymentsQueryParams.safeParse(req.query);
  let payments = await db.select().from(paymentsTable).orderBy(paymentsTable.paymentDate);
  const [students, feeTypes, terms, classes] = await Promise.all([
    db.select().from(studentsTable),
    db.select().from(feeTypesTable),
    db.select().from(termsTable),
    db.select().from(classesTable),
  ]);
  const studentMap = Object.fromEntries(students.map(s => [s.id, { name: `${s.firstName} ${s.lastName}`, classId: s.classId }]));
  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]));
  const feeTypeMap = Object.fromEntries(feeTypes.map(f => [f.id, f.name]));
  const termMap = Object.fromEntries(terms.map(t => [t.id, t.name]));

  if (role === "student" || role === "parent") {
    payments = studentId ? payments.filter(p => p.studentId === studentId) : [];
  } else if (role === "teacher") {
    payments = [];
  }

  if (query.success) {
    if (query.data.studentId) payments = payments.filter(p => p.studentId === query.data.studentId);
    if (query.data.termId) payments = payments.filter(p => p.termId === query.data.termId);
    if (query.data.classId) {
      const classStudentIds = students.filter(s => s.classId === query.data.classId).map(s => s.id);
      payments = payments.filter(p => classStudentIds.includes(p.studentId));
    }
  }

  res.json(ListPaymentsResponse.parse(payments.map(p => {
    const student = studentMap[p.studentId];
    return {
      ...p,
      studentName: student?.name ?? null,
      className: student?.classId ? classMap[student.classId] ?? null : null,
      feeTypeName: feeTypeMap[p.feeTypeId] ?? null,
      termName: termMap[p.termId] ?? null,
    };
  })));
});

router.post("/payments", async (req, res): Promise<void> => {
  const { role } = currentUser(req);
  if (role !== "admin" && role !== "headteacher" && role !== "accountant") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const parsed = CreatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const receiptNumber = await generateReceiptNumber();
  const [payment] = await db.insert(paymentsTable).values({ ...parsed.data, receiptNumber }).returning();
  res.status(201).json({ ...payment, studentName: null, className: null, feeTypeName: null, termName: null, collectedBy: null });
});

router.get("/payments/:id", async (req, res): Promise<void> => {
  const { role, studentId } = currentUser(req);
  const params = GetPaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, params.data.id));
  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }
  if ((role === "student" || role === "parent") && payment.studentId !== studentId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, payment.studentId));
  const [feeType] = await db.select().from(feeTypesTable).where(eq(feeTypesTable.id, payment.feeTypeId));
  const [term] = await db.select().from(termsTable).where(eq(termsTable.id, payment.termId));
  let className: string | null = null;
  if (student?.classId) {
    const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, student.classId));
    className = cls?.name ?? null;
  }
  res.json(GetPaymentResponse.parse({
    ...payment,
    studentName: student ? `${student.firstName} ${student.lastName}` : null,
    className,
    feeTypeName: feeType?.name ?? null,
    termName: term?.name ?? null,
  }));
});

router.delete("/payments/:id", async (req, res): Promise<void> => {
  const { role } = currentUser(req);
  if (role !== "admin" && role !== "headteacher" && role !== "accountant") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const params = DeletePaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [payment] = await db.delete(paymentsTable).where(eq(paymentsTable.id, params.data.id)).returning();
  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/fee-balances", async (req, res): Promise<void> => {
  const { role, studentId } = currentUser(req);
  const query = ListFeeBalancesQueryParams.safeParse(req.query);

  const [students, feeTypes, feeAssignments, payments, classes, terms] = await Promise.all([
    db.select().from(studentsTable),
    db.select().from(feeTypesTable),
    db.select().from(feeAssignmentsTable),
    db.select().from(paymentsTable),
    db.select().from(classesTable),
    db.select().from(termsTable),
  ]);

  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]));
  const feeTypeMap = Object.fromEntries(feeTypes.map(f => [f.id, f.name]));

  let filteredStudents = students.filter(s => s.status === "active");

  if (role === "student" || role === "parent") {
    filteredStudents = studentId ? filteredStudents.filter(s => s.id === studentId) : [];
  } else if (role === "teacher") {
    filteredStudents = [];
  }

  let filteredAssignments = feeAssignments;

  if (query.success) {
    if (query.data.classId) {
      filteredStudents = filteredStudents.filter(s => s.classId === query.data.classId);
      filteredAssignments = filteredAssignments.filter(a => !a.classId || a.classId === query.data.classId);
    }
    if (query.data.termId) {
      filteredAssignments = filteredAssignments.filter(a => a.termId === query.data.termId);
    }
    if (query.data.studentId) {
      filteredStudents = filteredStudents.filter(s => s.id === query.data.studentId);
    }
  }

  const balances: Array<{
    studentId: number; studentName: string; className: string | null;
    termId: number; feeTypeId: number; feeTypeName: string;
    totalFee: number; totalPaid: number; balance: number; status: string;
  }> = [];

  for (const student of filteredStudents) {
    for (const assignment of filteredAssignments) {
      const applicable = !assignment.classId || assignment.classId === student.classId;
      if (!applicable) continue;

      const paid = payments
        .filter(p => p.studentId === student.id && p.feeTypeId === assignment.feeTypeId && p.termId === assignment.termId)
        .reduce((sum, p) => sum + p.amountPaid, 0);

      const balance = assignment.amount - paid;
      const status = paid >= assignment.amount ? "paid" : paid > 0 ? "partial" : "unpaid";

      balances.push({
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        className: student.classId ? classMap[student.classId] ?? null : null,
        termId: assignment.termId,
        feeTypeId: assignment.feeTypeId,
        feeTypeName: feeTypeMap[assignment.feeTypeId] ?? "Unknown",
        totalFee: assignment.amount,
        totalPaid: paid,
        balance,
        status,
      });
    }
  }

  res.json(ListFeeBalancesResponse.parse(balances));
});

export default router;
