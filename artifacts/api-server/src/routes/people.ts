import { Router, type IRouter } from "express";
import { db, teachersTable, studentsTable, classesTable, subjectsTable, classAssignmentsTable, termsTable, academicYearsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ListTeachersQueryParams,
  ListTeachersResponse,
  CreateTeacherBody,
  GetTeacherParams,
  GetTeacherResponse,
  UpdateTeacherParams,
  UpdateTeacherBody,
  UpdateTeacherResponse,
  DeleteTeacherParams,
  ListStudentsQueryParams,
  ListStudentsResponse,
  CreateStudentBody,
  GetStudentParams,
  GetStudentResponse,
  UpdateStudentParams,
  UpdateStudentBody,
  UpdateStudentResponse,
  DeleteStudentParams,
  ListClassesResponse,
  CreateClassBody,
  UpdateClassParams,
  UpdateClassBody,
  UpdateClassResponse,
  DeleteClassParams,
  ListSubjectsResponse,
  CreateSubjectBody,
  UpdateSubjectParams,
  UpdateSubjectBody,
  UpdateSubjectResponse,
  DeleteSubjectParams,
  ListClassAssignmentsQueryParams,
  ListClassAssignmentsResponse,
  CreateClassAssignmentBody,
  DeleteClassAssignmentParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function currentUser(req: any): { role: string; teacherId: number | null; studentId: number | null } {
  const u = (req as any).currentUser;
  return {
    role: u?.role ?? "admin",
    teacherId: u?.teacherId ? parseInt(u.teacherId) : null,
    studentId: u?.studentId ? parseInt(u.studentId) : null,
  };
}

async function getTeacherClassIds(teacherId: number): Promise<number[]> {
  const rows = await db.select({ classId: classAssignmentsTable.classId })
    .from(classAssignmentsTable)
    .where(eq(classAssignmentsTable.teacherId, teacherId));
  return [...new Set(rows.map(r => r.classId))];
}

async function getTeacherSubjectIds(teacherId: number): Promise<number[]> {
  const rows = await db.select({ subjectId: classAssignmentsTable.subjectId })
    .from(classAssignmentsTable)
    .where(eq(classAssignmentsTable.teacherId, teacherId));
  return [...new Set(rows.map(r => r.subjectId).filter((id): id is number => id != null))];
}

let teacherCounter = 1000;
let studentCounter = 1000;

async function getNextTeacherStaffId(): Promise<string> {
  const teachers = await db.select({ staffId: teachersTable.staffId }).from(teachersTable);
  const nums = teachers.map(t => parseInt(t.staffId.replace(/\D/g, ""))).filter(n => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : teacherCounter;
  return `TCH${String(max + 1).padStart(4, "0")}`;
}

async function getNextStudentId(): Promise<string> {
  const students = await db.select({ studentId: studentsTable.studentId }).from(studentsTable);
  const nums = students.map(s => parseInt(s.studentId.replace(/\D/g, ""))).filter(n => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : studentCounter;
  return `STU${String(max + 1).padStart(5, "0")}`;
}

router.get("/teachers", async (req, res): Promise<void> => {
  const { role, teacherId } = currentUser(req);
  const query = ListTeachersQueryParams.safeParse(req.query);
  let teachers = await db.select().from(teachersTable).orderBy(teachersTable.firstName);

  if (role === "teacher") {
    if (teacherId) {
      teachers = teachers.filter(t => t.id === teacherId);
    } else {
      teachers = [];
    }
  } else if (role === "student" || role === "parent") {
    teachers = [];
  }

  if (query.success && query.data.search) {
    const s = query.data.search.toLowerCase();
    teachers = teachers.filter(t =>
      t.firstName.toLowerCase().includes(s) ||
      t.lastName.toLowerCase().includes(s) ||
      t.staffId.toLowerCase().includes(s)
    );
  }
  res.json(ListTeachersResponse.parse(teachers));
});

router.post("/teachers", async (req, res): Promise<void> => {
  const { role } = currentUser(req);
  if (role !== "admin" && role !== "headteacher") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const parsed = CreateTeacherBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const staffId = await getNextTeacherStaffId();
  const [teacher] = await db.insert(teachersTable).values({ ...parsed.data, staffId, status: parsed.data.status ?? "active" }).returning();
  res.status(201).json(GetTeacherResponse.parse(teacher));
});

router.get("/teachers/:id", async (req, res): Promise<void> => {
  const { role, teacherId } = currentUser(req);
  const params = GetTeacherParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (role === "student" || role === "parent") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (role === "teacher" && teacherId !== params.data.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const [teacher] = await db.select().from(teachersTable).where(eq(teachersTable.id, params.data.id));
  if (!teacher) {
    res.status(404).json({ error: "Teacher not found" });
    return;
  }
  res.json(GetTeacherResponse.parse(teacher));
});

router.put("/teachers/:id", async (req, res): Promise<void> => {
  const { role } = currentUser(req);
  if (role !== "admin" && role !== "headteacher") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const params = UpdateTeacherParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTeacherBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [teacher] = await db.update(teachersTable).set(parsed.data).where(eq(teachersTable.id, params.data.id)).returning();
  if (!teacher) {
    res.status(404).json({ error: "Teacher not found" });
    return;
  }
  res.json(UpdateTeacherResponse.parse(teacher));
});

router.delete("/teachers/:id", async (req, res): Promise<void> => {
  const { role } = currentUser(req);
  if (role !== "admin" && role !== "headteacher") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const params = DeleteTeacherParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [teacher] = await db.delete(teachersTable).where(eq(teachersTable.id, params.data.id)).returning();
  if (!teacher) {
    res.status(404).json({ error: "Teacher not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/students", async (req, res): Promise<void> => {
  const { role, teacherId, studentId } = currentUser(req);
  const query = ListStudentsQueryParams.safeParse(req.query);
  const allStudents = await db.select().from(studentsTable).orderBy(studentsTable.firstName);
  const allClasses = await db.select().from(classesTable);
  const classMap = Object.fromEntries(allClasses.map(c => [c.id, c.name]));

  let students = allStudents;

  if (role === "student" || role === "parent") {
    students = studentId ? students.filter(s => s.id === studentId) : [];
  } else if (role === "teacher") {
    if (teacherId) {
      const classIds = await getTeacherClassIds(teacherId);
      students = students.filter(s => s.classId && classIds.includes(s.classId));
    } else {
      students = [];
    }
  }

  if (query.success) {
    if (query.data.classId) students = students.filter(s => s.classId === query.data.classId);
    if (query.data.search) {
      const s = query.data.search.toLowerCase();
      students = students.filter(st =>
        st.firstName.toLowerCase().includes(s) ||
        st.lastName.toLowerCase().includes(s) ||
        st.studentId.toLowerCase().includes(s)
      );
    }
  }

  res.json(ListStudentsResponse.parse(students.map(s => ({
    ...s,
    className: s.classId ? classMap[s.classId] ?? null : null,
  }))));
});

router.post("/students", async (req, res): Promise<void> => {
  const { role } = currentUser(req);
  if (role !== "admin" && role !== "headteacher") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const studentId = await getNextStudentId();
  const [student] = await db.insert(studentsTable).values({
    ...parsed.data,
    studentId,
    status: parsed.data.status ?? "active",
  }).returning();
  res.status(201).json(GetStudentResponse.parse({ ...student, className: null }));
});

router.get("/students/:id", async (req, res): Promise<void> => {
  const { role, teacherId, studentId: myStudentId } = currentUser(req);
  const params = GetStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (role === "student" || role === "parent") {
    if (myStudentId !== params.data.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  } else if (role === "teacher" && teacherId) {
    const classIds = await getTeacherClassIds(teacherId);
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, params.data.id));
    if (!student || !student.classId || !classIds.includes(student.classId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, params.data.id));
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  let className: string | null = null;
  if (student.classId) {
    const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, student.classId));
    className = cls?.name ?? null;
  }
  res.json(GetStudentResponse.parse({ ...student, className }));
});

router.put("/students/:id", async (req, res): Promise<void> => {
  const { role } = currentUser(req);
  if (role !== "admin" && role !== "headteacher") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const params = UpdateStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [student] = await db.update(studentsTable).set(parsed.data).where(eq(studentsTable.id, params.data.id)).returning();
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  res.json(UpdateStudentResponse.parse({ ...student, className: null }));
});

router.delete("/students/:id", async (req, res): Promise<void> => {
  const { role } = currentUser(req);
  if (role !== "admin" && role !== "headteacher") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const params = DeleteStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [student] = await db.delete(studentsTable).where(eq(studentsTable.id, params.data.id)).returning();
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/classes", async (req, res): Promise<void> => {
  const { role, teacherId } = currentUser(req);
  let classes = await db.select().from(classesTable).orderBy(classesTable.name);

  if (role === "teacher" && teacherId) {
    const classIds = await getTeacherClassIds(teacherId);
    classes = classes.filter(c => classIds.includes(c.id));
  } else if (role === "student" || role === "parent") {
    classes = [];
  }

  const students = await db.select({ classId: studentsTable.classId }).from(studentsTable).where(eq(studentsTable.status, "active"));
  const countMap: Record<number, number> = {};
  for (const s of students) {
    if (s.classId) countMap[s.classId] = (countMap[s.classId] ?? 0) + 1;
  }
  res.json(ListClassesResponse.parse(classes.map(c => ({ ...c, studentCount: countMap[c.id] ?? 0 }))));
});

router.post("/classes", async (req, res): Promise<void> => {
  const { role } = currentUser(req);
  if (role !== "admin" && role !== "headteacher") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const parsed = CreateClassBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [cls] = await db.insert(classesTable).values(parsed.data).returning();
  res.status(201).json({ ...cls, studentCount: 0 });
});

router.put("/classes/:id", async (req, res): Promise<void> => {
  const { role } = currentUser(req);
  if (role !== "admin" && role !== "headteacher") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const params = UpdateClassParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateClassBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [cls] = await db.update(classesTable).set(parsed.data).where(eq(classesTable.id, params.data.id)).returning();
  if (!cls) {
    res.status(404).json({ error: "Class not found" });
    return;
  }
  res.json(UpdateClassResponse.parse({ ...cls, studentCount: 0 }));
});

router.delete("/classes/:id", async (req, res): Promise<void> => {
  const { role } = currentUser(req);
  if (role !== "admin" && role !== "headteacher") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const params = DeleteClassParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [cls] = await db.delete(classesTable).where(eq(classesTable.id, params.data.id)).returning();
  if (!cls) {
    res.status(404).json({ error: "Class not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/subjects", async (_req, res): Promise<void> => {
  const subjects = await db.select().from(subjectsTable).orderBy(subjectsTable.name);
  res.json(ListSubjectsResponse.parse(subjects));
});

router.post("/subjects", async (req, res): Promise<void> => {
  const { role } = currentUser(req);
  if (role !== "admin" && role !== "headteacher") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const parsed = CreateSubjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [subject] = await db.insert(subjectsTable).values(parsed.data).returning();
  res.status(201).json(subject);
});

router.put("/subjects/:id", async (req, res): Promise<void> => {
  const { role } = currentUser(req);
  if (role !== "admin" && role !== "headteacher") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const params = UpdateSubjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateSubjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [subject] = await db.update(subjectsTable).set(parsed.data).where(eq(subjectsTable.id, params.data.id)).returning();
  if (!subject) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }
  res.json(UpdateSubjectResponse.parse(subject));
});

router.delete("/subjects/:id", async (req, res): Promise<void> => {
  const { role } = currentUser(req);
  if (role !== "admin" && role !== "headteacher") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const params = DeleteSubjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [subject] = await db.delete(subjectsTable).where(eq(subjectsTable.id, params.data.id)).returning();
  if (!subject) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/class-assignments", async (req, res): Promise<void> => {
  const { role, teacherId } = currentUser(req);
  const query = ListClassAssignmentsQueryParams.safeParse(req.query);
  let assignments = await db.select().from(classAssignmentsTable).orderBy(classAssignmentsTable.createdAt);

  if (role === "teacher" && teacherId) {
    assignments = assignments.filter(a => a.teacherId === teacherId);
  } else if (role === "student" || role === "parent") {
    assignments = [];
  }

  const [classes, teachers, subjects] = await Promise.all([
    db.select().from(classesTable),
    db.select().from(teachersTable),
    db.select().from(subjectsTable),
  ]);
  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]));
  const teacherMap = Object.fromEntries(teachers.map(t => [t.id, `${t.firstName} ${t.lastName}`]));
  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s.name]));

  if (query.success) {
    if (query.data.classId) assignments = assignments.filter(a => a.classId === query.data.classId);
    if (query.data.academicYearId) assignments = assignments.filter(a => a.academicYearId === query.data.academicYearId);
    if (query.data.termId) assignments = assignments.filter(a => a.termId === query.data.termId);
  }

  res.json(ListClassAssignmentsResponse.parse(assignments.map(a => ({
    ...a,
    isClassTeacher: a.isClassTeacher === "true",
    className: classMap[a.classId] ?? null,
    teacherName: teacherMap[a.teacherId] ?? null,
    subjectName: a.subjectId ? subjectMap[a.subjectId] ?? null : null,
  }))));
});

router.post("/class-assignments", async (req, res): Promise<void> => {
  const { role } = currentUser(req);
  if (role !== "admin" && role !== "headteacher") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const parsed = CreateClassAssignmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [assignment] = await db.insert(classAssignmentsTable).values({
    ...parsed.data,
    isClassTeacher: parsed.data.isClassTeacher ? "true" : "false",
  }).returning();
  res.status(201).json({ ...assignment, isClassTeacher: assignment.isClassTeacher === "true", className: null, teacherName: null, subjectName: null });
});

router.delete("/class-assignments/:id", async (req, res): Promise<void> => {
  const { role } = currentUser(req);
  if (role !== "admin" && role !== "headteacher") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const params = DeleteClassAssignmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [assignment] = await db.delete(classAssignmentsTable).where(eq(classAssignmentsTable.id, params.data.id)).returning();
  if (!assignment) {
    res.status(404).json({ error: "Assignment not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
