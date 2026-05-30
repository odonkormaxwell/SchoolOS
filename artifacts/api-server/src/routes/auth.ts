import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { LoginBody, LoginResponse, GetMeResponse, ListUsersResponse, CreateUserBody, UpdateUserParams, UpdateUserBody, UpdateUserResponse, DeleteUserParams } from "@workspace/api-zod";
import { createHash } from "crypto";

const router: IRouter = Router();

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "school_salt_2024").digest("hex");
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { username, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (!user || user.passwordHash !== hashPassword(password)) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }
  (req as any).session = { userId: user.id };
  res.json(LoginResponse.parse({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    teacherId: user.teacherId ? parseInt(user.teacherId) : null,
    studentId: user.studentId ? parseInt(user.studentId) : null,
  }));
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  (req as any).session = null;
  res.sendStatus(204);
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const userId = (req as any).session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json(GetMeResponse.parse({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    teacherId: user.teacherId ? parseInt(user.teacherId) : null,
    studentId: user.studentId ? parseInt(user.studentId) : null,
  }));
});

router.get("/users", async (req, res): Promise<void> => {
  const users = await db.select().from(usersTable);
  res.json(ListUsersResponse.parse(users.map(u => ({
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    role: u.role,
    teacherId: u.teacherId ? parseInt(u.teacherId) : null,
    studentId: u.studentId ? parseInt(u.studentId) : null,
    createdAt: u.createdAt,
  }))));
});

router.post("/users", async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { password, teacherId, studentId, ...rest } = parsed.data;
  const [user] = await db.insert(usersTable).values({
    ...rest,
    passwordHash: hashPassword(password),
    teacherId: teacherId != null ? String(teacherId) : null,
    studentId: studentId != null ? String(studentId) : null,
  }).returning();
  res.status(201).json({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    teacherId: user.teacherId ? parseInt(user.teacherId) : null,
    studentId: user.studentId ? parseInt(user.studentId) : null,
    createdAt: user.createdAt,
  });
});

router.put("/users/:id", async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { password, teacherId, studentId, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest };
  if (password) updateData.passwordHash = hashPassword(password);
  if (teacherId !== undefined) updateData.teacherId = teacherId != null ? String(teacherId) : null;
  if (studentId !== undefined) updateData.studentId = studentId != null ? String(studentId) : null;

  const [user] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, params.data.id)).returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(UpdateUserResponse.parse({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    teacherId: user.teacherId ? parseInt(user.teacherId) : null,
    studentId: user.studentId ? parseInt(user.studentId) : null,
    createdAt: user.createdAt,
  }));
});

router.delete("/users/:id", async (req, res): Promise<void> => {
  const params = DeleteUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [user] = await db.delete(usersTable).where(eq(usersTable.id, params.data.id)).returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
