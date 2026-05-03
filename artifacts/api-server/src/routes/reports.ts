import { Router, type IRouter } from "express";
import { db, studentsTable, teachersTable, classesTable, termsTable, academicYearsTable, attendanceTable, paymentsTable, feeAssignmentsTable, feeTypesTable, resultsTable, subjectsTable, schoolProfileTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  GetDashboardStatsResponse,
  GetAttendanceReportQueryParams,
  GetAttendanceReportResponse,
  GetFeesReportQueryParams,
  GetFeesReportResponse,
  GetResultsReportQueryParams,
  GetResultsReportResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const [students, teachers, classes, terms, years, payments, feeAssignments, attendance] = await Promise.all([
    db.select().from(studentsTable),
    db.select().from(teachersTable),
    db.select().from(classesTable),
    db.select().from(termsTable),
    db.select().from(academicYearsTable),
    db.select().from(paymentsTable),
    db.select().from(feeAssignmentsTable),
    db.select().from(attendanceTable),
  ]);

  const currentTerm = terms.find(t => t.isCurrent);
  const currentYear = years.find(y => y.isCurrent);
  const activeStudents = students.filter(s => s.status === "active");
  const today = new Date().toISOString().split("T")[0];
  const todayAttendance = attendance.filter(a => a.date === today);

  const totalFeesExpected = feeAssignments.reduce((sum, fa) => {
    const studentCount = activeStudents.filter(s => !fa.classId || s.classId === fa.classId).length;
    return sum + fa.amount * studentCount;
  }, 0);
  const totalFeesCollected = payments.reduce((sum, p) => sum + p.amountPaid, 0);

  const classesByLevel: Record<string, { count: number; studentCount: number }> = {};
  for (const cls of classes) {
    if (!classesByLevel[cls.level]) classesByLevel[cls.level] = { count: 0, studentCount: 0 };
    classesByLevel[cls.level].count++;
  }
  for (const s of activeStudents) {
    if (s.classId) {
      const cls = classes.find(c => c.id === s.classId);
      if (cls && classesByLevel[cls.level]) classesByLevel[cls.level].studentCount++;
    }
  }

  const recentPayments = payments
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  const feeTypeIds = [...new Set(recentPayments.map(p => p.feeTypeId))];
  const feeTypes = await db.select().from(feeTypesTable);
  const feeTypeMap = Object.fromEntries(feeTypes.map(f => [f.id, f.name]));
  const studentMap = Object.fromEntries(students.map(s => [s.id, `${s.firstName} ${s.lastName}`]));

  res.json(GetDashboardStatsResponse.parse({
    totalStudents: students.length,
    totalTeachers: teachers.filter(t => t.status === "active").length,
    totalClasses: classes.length,
    activeStudents: activeStudents.length,
    currentTerm: currentTerm?.name ?? null,
    currentAcademicYear: currentYear?.name ?? null,
    totalFeesExpected,
    totalFeesCollected,
    totalFeesPending: totalFeesExpected - totalFeesCollected,
    attendanceToday: todayAttendance.filter(a => a.status === "present").length,
    totalAttendanceToday: todayAttendance.length,
    classesByLevel: Object.entries(classesByLevel).map(([level, data]) => ({
      level,
      count: data.count,
      studentCount: data.studentCount,
    })),
    recentPayments: recentPayments.map(p => ({
      id: p.id,
      studentName: studentMap[p.studentId] ?? "Unknown",
      amountPaid: p.amountPaid,
      paymentDate: p.paymentDate,
      feeTypeName: feeTypeMap[p.feeTypeId] ?? "Unknown",
    })),
  }));
});

router.get("/reports/attendance", async (req, res): Promise<void> => {
  const query = GetAttendanceReportQueryParams.safeParse(req.query);
  let attendance = await db.select().from(attendanceTable);
  const students = await db.select().from(studentsTable);
  const classes = await db.select().from(classesTable);
  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]));

  if (query.success) {
    if (query.data.classId) attendance = attendance.filter(a => a.classId === query.data.classId);
    if (query.data.termId) attendance = attendance.filter(a => a.termId === query.data.termId);
  }

  const summaryMap: Record<number, { present: number; absent: number; late: number; excused: number; total: number; classId: number }> = {};
  for (const r of attendance) {
    if (!summaryMap[r.studentId]) summaryMap[r.studentId] = { present: 0, absent: 0, late: 0, excused: 0, total: 0, classId: r.classId };
    summaryMap[r.studentId].total++;
    if (r.status === "present") summaryMap[r.studentId].present++;
    else if (r.status === "absent") summaryMap[r.studentId].absent++;
    else if (r.status === "late") summaryMap[r.studentId].late++;
    else if (r.status === "excused") summaryMap[r.studentId].excused++;
  }

  const result = students
    .filter(s => summaryMap[s.id])
    .map(s => {
      const sm = summaryMap[s.id];
      return {
        studentId: s.id,
        studentName: `${s.firstName} ${s.lastName}`,
        classId: sm.classId,
        className: classMap[sm.classId] ?? null,
        totalDays: sm.total,
        presentDays: sm.present,
        absentDays: sm.absent,
        lateDays: sm.late,
        excusedDays: sm.excused,
        attendanceRate: sm.total > 0 ? Math.round((sm.present / sm.total) * 100 * 10) / 10 : 0,
      };
    });

  res.json(GetAttendanceReportResponse.parse(result));
});

router.get("/reports/fees", async (req, res): Promise<void> => {
  const query = GetFeesReportQueryParams.safeParse(req.query);

  const [students, classes, terms, feeTypes, feeAssignments, payments] = await Promise.all([
    db.select().from(studentsTable),
    db.select().from(classesTable),
    db.select().from(feeTypesTable),
    db.select().from(feeAssignmentsTable),
    db.select().from(paymentsTable),
    db.select().from(termsTable),
  ]);

  let filteredAssignments = feeAssignments;
  let filteredPayments = payments;

  if (query.success) {
    if (query.data.classId) filteredAssignments = filteredAssignments.filter(a => !a.classId || a.classId === query.data.classId);
    if (query.data.termId) {
      filteredAssignments = filteredAssignments.filter(a => a.termId === query.data.termId);
      filteredPayments = filteredPayments.filter(p => p.termId === query.data.termId);
    }
  }

  const activeStudents = students.filter(s => s.status === "active");
  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]));
  const feeTypeMap = Object.fromEntries(feeTypes.map(f => [f.id, f.name]));
  const termMap = Object.fromEntries(terms.map(t => [t.id, t.name]));

  let totalExpected = 0;
  const byClass: Record<number, { expected: number; collected: number; count: number }> = {};
  const byFeeType: Record<number, { expected: number; collected: number }> = {};

  for (const assignment of filteredAssignments) {
    const relevantStudents = activeStudents.filter(s => !assignment.classId || s.classId === assignment.classId);
    const expected = assignment.amount * relevantStudents.length;
    totalExpected += expected;

    if (assignment.classId) {
      if (!byClass[assignment.classId]) byClass[assignment.classId] = { expected: 0, collected: 0, count: 0 };
      byClass[assignment.classId].expected += expected;
      byClass[assignment.classId].count = relevantStudents.length;
    }

    if (!byFeeType[assignment.feeTypeId]) byFeeType[assignment.feeTypeId] = { expected: 0, collected: 0 };
    byFeeType[assignment.feeTypeId].expected += expected;
  }

  const totalCollected = filteredPayments.reduce((sum, p) => sum + p.amountPaid, 0);

  for (const payment of filteredPayments) {
    const student = students.find(s => s.id === payment.studentId);
    if (student?.classId && byClass[student.classId]) byClass[student.classId].collected += payment.amountPaid;
    if (byFeeType[payment.feeTypeId]) byFeeType[payment.feeTypeId].collected += payment.amountPaid;
  }

  const currentTerm = terms.find(t => t.isCurrent);

  res.json(GetFeesReportResponse.parse({
    termName: currentTerm?.name ?? null,
    totalExpected,
    totalCollected,
    totalPending: totalExpected - totalCollected,
    collectionRate: totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100 * 10) / 10 : 0,
    byClass: Object.entries(byClass).map(([classId, data]) => ({
      className: classMap[parseInt(classId)] ?? "Unknown",
      totalExpected: data.expected,
      totalCollected: data.collected,
      balance: data.expected - data.collected,
      studentCount: data.count,
    })),
    byFeeType: Object.entries(byFeeType).map(([feeTypeId, data]) => ({
      feeTypeName: feeTypeMap[parseInt(feeTypeId)] ?? "Unknown",
      totalExpected: data.expected,
      totalCollected: data.collected,
      balance: data.expected - data.collected,
    })),
  }));
});

router.get("/reports/results", async (req, res): Promise<void> => {
  const query = GetResultsReportQueryParams.safeParse(req.query);
  let results = await db.select().from(resultsTable);
  const [classes, subjects] = await Promise.all([
    db.select().from(classesTable),
    db.select().from(subjectsTable),
  ]);

  if (query.success) {
    if (query.data.classId) results = results.filter(r => r.classId === query.data.classId);
    if (query.data.termId) results = results.filter(r => r.termId === query.data.termId);
  }

  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]));
  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s.name]));

  const grouped: Record<string, { scores: number[]; classId: number; subjectId: number | null }> = {};
  for (const r of results) {
    const key = `${r.classId}-${r.subjectId}`;
    if (!grouped[key]) grouped[key] = { scores: [], classId: r.classId, subjectId: r.subjectId };
    if (r.totalScore != null) grouped[key].scores.push(r.totalScore);
  }

  const summaries = Object.values(grouped).map(g => {
    const scores = g.scores;
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    const passing = scores.filter(s => s >= 50).length;
    return {
      className: classMap[g.classId] ?? "Unknown",
      subjectName: g.subjectId ? subjectMap[g.subjectId] ?? null : null,
      averageScore: avg != null ? Math.round(avg * 10) / 10 : null,
      highestScore: scores.length > 0 ? Math.max(...scores) : null,
      lowestScore: scores.length > 0 ? Math.min(...scores) : null,
      passRate: scores.length > 0 ? Math.round((passing / scores.length) * 100 * 10) / 10 : null,
      studentCount: scores.length,
    };
  });

  res.json(GetResultsReportResponse.parse(summaries));
});

export default router;
