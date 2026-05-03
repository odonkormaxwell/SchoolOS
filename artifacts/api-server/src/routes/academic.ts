import { Router, type IRouter } from "express";
import { db, attendanceTable, resultsTable, studentsTable, classesTable, subjectsTable, termsTable, academicYearsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ListAttendanceQueryParams,
  ListAttendanceResponse,
  MarkAttendanceBody,
  GetAttendanceSummaryQueryParams,
  GetAttendanceSummaryResponse,
  ListResultsQueryParams,
  ListResultsResponse,
  CreateResultBody,
  UpdateResultParams,
  UpdateResultBody,
  UpdateResultResponse,
  DeleteResultParams,
  BulkCreateResultsBody,
  ListReportCardsQueryParams,
  ListReportCardsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function computeGrade(total: number): { grade: string; remarks: string } {
  if (total >= 80) return { grade: "A1", remarks: "Excellent" };
  if (total >= 70) return { grade: "B2", remarks: "Very Good" };
  if (total >= 60) return { grade: "B3", remarks: "Good" };
  if (total >= 55) return { grade: "C4", remarks: "Credit" };
  if (total >= 50) return { grade: "C5", remarks: "Credit" };
  if (total >= 45) return { grade: "C6", remarks: "Credit" };
  if (total >= 40) return { grade: "D7", remarks: "Pass" };
  if (total >= 30) return { grade: "E8", remarks: "Pass" };
  return { grade: "F9", remarks: "Fail" };
}

router.get("/attendance", async (req, res): Promise<void> => {
  const query = ListAttendanceQueryParams.safeParse(req.query);
  let records = await db.select().from(attendanceTable).orderBy(attendanceTable.date);

  const students = await db.select().from(studentsTable);
  const classes = await db.select().from(classesTable);
  const studentMap = Object.fromEntries(students.map(s => [s.id, `${s.firstName} ${s.lastName}`]));
  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]));

  if (query.success) {
    if (query.data.classId) records = records.filter(r => r.classId === query.data.classId);
    if (query.data.date) records = records.filter(r => r.date === query.data.date);
    if (query.data.termId) records = records.filter(r => r.termId === query.data.termId);
    if (query.data.studentId) records = records.filter(r => r.studentId === query.data.studentId);
  }

  res.json(ListAttendanceResponse.parse(records.map(r => ({
    ...r,
    studentName: studentMap[r.studentId] ?? null,
    className: classMap[r.classId] ?? null,
  }))));
});

router.post("/attendance", async (req, res): Promise<void> => {
  const parsed = MarkAttendanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { classId, date, termId, records } = parsed.data;

  const existing = await db.select().from(attendanceTable)
    .where(eq(attendanceTable.classId, classId));
  const existingForDate = existing.filter(e => e.date === date);
  for (const e of existingForDate) {
    await db.delete(attendanceTable).where(eq(attendanceTable.id, e.id));
  }

  const toInsert = records.map(r => ({
    studentId: r.studentId,
    classId,
    date,
    termId: termId ?? null,
    status: r.status,
    remarks: r.remarks ?? null,
  }));

  const inserted = await db.insert(attendanceTable).values(toInsert).returning();
  res.status(201).json(inserted.map(r => ({ ...r, studentName: null, className: null })));
});

router.get("/attendance/summary", async (req, res): Promise<void> => {
  const query = GetAttendanceSummaryQueryParams.safeParse(req.query);
  let records = await db.select().from(attendanceTable);
  const students = await db.select().from(studentsTable);
  const classes = await db.select().from(classesTable);
  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]));

  if (query.success) {
    if (query.data.classId) records = records.filter(r => r.classId === query.data.classId);
    if (query.data.termId) records = records.filter(r => r.termId === query.data.termId);
    if (query.data.studentId) records = records.filter(r => r.studentId === query.data.studentId);
  }

  const summaryMap: Record<number, { present: number; absent: number; late: number; excused: number; total: number; classId: number }> = {};
  for (const r of records) {
    if (!summaryMap[r.studentId]) {
      summaryMap[r.studentId] = { present: 0, absent: 0, late: 0, excused: 0, total: 0, classId: r.classId };
    }
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

  res.json(GetAttendanceSummaryResponse.parse(result));
});

router.get("/results", async (req, res): Promise<void> => {
  const query = ListResultsQueryParams.safeParse(req.query);
  let results = await db.select().from(resultsTable).orderBy(resultsTable.createdAt);

  const [students, classes, subjects, terms] = await Promise.all([
    db.select().from(studentsTable),
    db.select().from(classesTable),
    db.select().from(subjectsTable),
    db.select().from(termsTable),
  ]);
  const studentMap = Object.fromEntries(students.map(s => [s.id, `${s.firstName} ${s.lastName}`]));
  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]));
  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s.name]));
  const termMap = Object.fromEntries(terms.map(t => [t.id, t.name]));

  if (query.success) {
    if (query.data.classId) results = results.filter(r => r.classId === query.data.classId);
    if (query.data.termId) results = results.filter(r => r.termId === query.data.termId);
    if (query.data.studentId) results = results.filter(r => r.studentId === query.data.studentId);
    if (query.data.subjectId) results = results.filter(r => r.subjectId === query.data.subjectId);
  }

  res.json(ListResultsResponse.parse(results.map(r => ({
    ...r,
    studentName: studentMap[r.studentId] ?? null,
    className: classMap[r.classId] ?? null,
    subjectName: subjectMap[r.subjectId] ?? null,
    termName: termMap[r.termId] ?? null,
  }))));
});

router.post("/results", async (req, res): Promise<void> => {
  const parsed = CreateResultBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { classScore, examScore } = parsed.data;
  const classS = classScore ?? 0;
  const examS = examScore ?? 0;
  const total = classS + examS;
  const { grade, remarks } = total > 0 ? computeGrade(total) : { grade: null, remarks: null };

  const [result] = await db.insert(resultsTable).values({
    ...parsed.data,
    totalScore: total > 0 ? total : null,
    grade,
    remarks: parsed.data.remarks ?? remarks,
  }).returning();
  res.status(201).json({ ...result, studentName: null, className: null, subjectName: null, termName: null });
});

router.put("/results/:id", async (req, res): Promise<void> => {
  const params = UpdateResultParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateResultBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db.select().from(resultsTable).where(eq(resultsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Result not found" });
    return;
  }
  const classS = parsed.data.classScore ?? existing.classScore ?? 0;
  const examS = parsed.data.examScore ?? existing.examScore ?? 0;
  const total = classS + examS;
  const { grade, remarks: autoRemarks } = total > 0 ? computeGrade(total) : { grade: null, remarks: null };

  const [result] = await db.update(resultsTable).set({
    ...parsed.data,
    totalScore: total > 0 ? total : null,
    grade,
    remarks: parsed.data.remarks ?? autoRemarks,
  }).where(eq(resultsTable.id, params.data.id)).returning();

  res.json(UpdateResultResponse.parse({ ...result, studentName: null, className: null, subjectName: null, termName: null }));
});

router.delete("/results/:id", async (req, res): Promise<void> => {
  const params = DeleteResultParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [result] = await db.delete(resultsTable).where(eq(resultsTable.id, params.data.id)).returning();
  if (!result) {
    res.status(404).json({ error: "Result not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/results/bulk", async (req, res): Promise<void> => {
  const parsed = BulkCreateResultsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { classId, subjectId, termId, results } = parsed.data;

  for (const r of results) {
    await db.delete(resultsTable)
      .where(eq(resultsTable.studentId, r.studentId));
  }

  const toInsert = results.map(r => {
    const classS = r.classScore ?? 0;
    const examS = r.examScore ?? 0;
    const total = classS + examS;
    const { grade, remarks } = total > 0 ? computeGrade(total) : { grade: null, remarks: null };
    return {
      studentId: r.studentId,
      classId,
      subjectId,
      termId,
      classScore: r.classScore ?? null,
      examScore: r.examScore ?? null,
      totalScore: total > 0 ? total : null,
      grade,
      remarks: r.remarks ?? remarks,
    };
  });

  const inserted = await db.insert(resultsTable).values(toInsert).returning();
  res.status(201).json(inserted.map(r => ({ ...r, studentName: null, className: null, subjectName: null, termName: null })));
});

router.get("/report-cards", async (req, res): Promise<void> => {
  const query = ListReportCardsQueryParams.safeParse(req.query);

  const [students, classes, subjects, terms, years, attendance] = await Promise.all([
    db.select().from(studentsTable),
    db.select().from(classesTable),
    db.select().from(subjectsTable),
    db.select().from(termsTable),
    db.select().from(academicYearsTable),
    db.select().from(attendanceTable),
  ]);
  let results = await db.select().from(resultsTable);

  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]));
  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s.name]));
  const termMap = Object.fromEntries(terms.map(t => [t.id, { name: t.name, yearId: t.academicYearId }]));
  const yearMap = Object.fromEntries(years.map(y => [y.id, y.name]));

  let filteredStudents = students;
  if (query.success) {
    if (query.data.studentId) filteredStudents = filteredStudents.filter(s => s.id === query.data.studentId);
    if (query.data.classId) filteredStudents = filteredStudents.filter(s => s.classId === query.data.classId);
    if (query.data.termId) results = results.filter(r => r.termId === query.data.termId);
  }

  const termId = query.success && query.data.termId ? query.data.termId : null;

  const reportCards = filteredStudents.map(student => {
    const studentResults = results.filter(r => r.studentId === student.id);
    const className = student.classId ? classMap[student.classId] ?? "Unknown" : "Unknown";
    const termInfo = termId ? termMap[termId] : null;
    const termName = termInfo?.name ?? "Current Term";
    const yearName = termInfo?.yearId ? yearMap[termInfo.yearId] ?? "" : "";

    const resultItems = studentResults.map(r => ({
      subjectName: subjectMap[r.subjectId] ?? "Unknown",
      classScore: r.classScore,
      examScore: r.examScore,
      totalScore: r.totalScore,
      grade: r.grade,
      remarks: r.remarks,
      position: r.position,
    }));

    const scores = resultItems.map(r => r.totalScore).filter((s): s is number => s != null);
    const totalScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) : null;
    const averageScore = scores.length > 0 ? Math.round((totalScore! / scores.length) * 10) / 10 : null;
    const overallGrade = averageScore != null ? computeGrade(averageScore).grade : null;

    const studentAttendance = attendance.filter(a => a.studentId === student.id && (termId ? a.termId === termId : true));
    const totalDays = studentAttendance.length;
    const presentDays = studentAttendance.filter(a => a.status === "present" || a.status === "late").length;

    return {
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      studentId_code: student.studentId,
      className,
      termName,
      academicYearName: yearName,
      results: resultItems,
      totalScore,
      averageScore,
      overallGrade,
      classPosition: null,
      totalStudents: filteredStudents.filter(s => s.classId === student.classId).length,
      attendanceSummary: { totalDays, presentDays, attendanceRate: totalDays > 0 ? Math.round((presentDays / totalDays) * 100 * 10) / 10 : 0 },
      conductRemarks: null,
      teacherRemarks: null,
    };
  });

  res.json(ListReportCardsResponse.parse(reportCards));
});

export default router;
