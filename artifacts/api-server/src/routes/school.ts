import { Router, type IRouter } from "express";
import { db, schoolProfileTable, academicYearsTable, termsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  GetSchoolProfileResponse,
  UpdateSchoolProfileBody,
  UpdateSchoolProfileResponse,
  ListAcademicYearsResponse,
  CreateAcademicYearBody,
  GetAcademicYearParams,
  GetAcademicYearResponse,
  UpdateAcademicYearParams,
  UpdateAcademicYearBody,
  UpdateAcademicYearResponse,
  DeleteAcademicYearParams,
  SetCurrentAcademicYearParams,
  SetCurrentAcademicYearResponse,
  ListTermsQueryParams,
  ListTermsResponse,
  CreateTermBody,
  UpdateTermParams,
  UpdateTermBody,
  UpdateTermResponse,
  DeleteTermParams,
  SetCurrentTermParams,
  SetCurrentTermResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/school", async (req, res): Promise<void> => {
  let [profile] = await db.select().from(schoolProfileTable);
  if (!profile) {
    [profile] = await db.insert(schoolProfileTable).values({ name: "My School", schoolType: "public" }).returning();
  }
  res.json(GetSchoolProfileResponse.parse(profile));
});

router.put("/school", async (req, res): Promise<void> => {
  const parsed = UpdateSchoolProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  let [existing] = await db.select().from(schoolProfileTable);
  let profile;
  if (!existing) {
    [profile] = await db.insert(schoolProfileTable).values({ name: "My School", schoolType: "public", ...parsed.data }).returning();
  } else {
    [profile] = await db.update(schoolProfileTable).set(parsed.data).where(eq(schoolProfileTable.id, existing.id)).returning();
  }
  res.json(UpdateSchoolProfileResponse.parse(profile));
});

router.get("/academic-years", async (_req, res): Promise<void> => {
  const years = await db.select().from(academicYearsTable).orderBy(academicYearsTable.createdAt);
  res.json(ListAcademicYearsResponse.parse(years));
});

router.post("/academic-years", async (req, res): Promise<void> => {
  const parsed = CreateAcademicYearBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [year] = await db.insert(academicYearsTable).values({
    ...parsed.data,
    isCurrent: parsed.data.isCurrent ?? false,
  }).returning();
  res.status(201).json(GetAcademicYearResponse.parse(year));
});

router.get("/academic-years/:id", async (req, res): Promise<void> => {
  const params = GetAcademicYearParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [year] = await db.select().from(academicYearsTable).where(eq(academicYearsTable.id, params.data.id));
  if (!year) {
    res.status(404).json({ error: "Academic year not found" });
    return;
  }
  res.json(GetAcademicYearResponse.parse(year));
});

router.put("/academic-years/:id", async (req, res): Promise<void> => {
  const params = UpdateAcademicYearParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateAcademicYearBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [year] = await db.update(academicYearsTable).set(parsed.data).where(eq(academicYearsTable.id, params.data.id)).returning();
  if (!year) {
    res.status(404).json({ error: "Academic year not found" });
    return;
  }
  res.json(UpdateAcademicYearResponse.parse(year));
});

router.delete("/academic-years/:id", async (req, res): Promise<void> => {
  const params = DeleteAcademicYearParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [year] = await db.delete(academicYearsTable).where(eq(academicYearsTable.id, params.data.id)).returning();
  if (!year) {
    res.status(404).json({ error: "Academic year not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/academic-years/:id/set-current", async (req, res): Promise<void> => {
  const params = SetCurrentAcademicYearParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.update(academicYearsTable).set({ isCurrent: false });
  const [year] = await db.update(academicYearsTable).set({ isCurrent: true }).where(eq(academicYearsTable.id, params.data.id)).returning();
  if (!year) {
    res.status(404).json({ error: "Academic year not found" });
    return;
  }
  res.json(SetCurrentAcademicYearResponse.parse(year));
});

router.get("/terms", async (req, res): Promise<void> => {
  const query = ListTermsQueryParams.safeParse(req.query);
  let terms = await db.select().from(termsTable).orderBy(termsTable.createdAt);
  if (query.success && query.data.academicYearId) {
    terms = terms.filter(t => t.academicYearId === query.data.academicYearId);
  }
  const years = await db.select().from(academicYearsTable);
  const yearMap = Object.fromEntries(years.map(y => [y.id, y.name]));
  res.json(ListTermsResponse.parse(terms.map(t => ({ ...t, academicYearName: yearMap[t.academicYearId] ?? null }))));
});

router.post("/terms", async (req, res): Promise<void> => {
  const parsed = CreateTermBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [term] = await db.insert(termsTable).values({
    ...parsed.data,
    isCurrent: parsed.data.isCurrent ?? false,
  }).returning();
  res.status(201).json({ ...term, academicYearName: null });
});

router.put("/terms/:id", async (req, res): Promise<void> => {
  const params = UpdateTermParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTermBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [term] = await db.update(termsTable).set(parsed.data).where(eq(termsTable.id, params.data.id)).returning();
  if (!term) {
    res.status(404).json({ error: "Term not found" });
    return;
  }
  res.json(UpdateTermResponse.parse({ ...term, academicYearName: null }));
});

router.delete("/terms/:id", async (req, res): Promise<void> => {
  const params = DeleteTermParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [term] = await db.delete(termsTable).where(eq(termsTable.id, params.data.id)).returning();
  if (!term) {
    res.status(404).json({ error: "Term not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/terms/:id/set-current", async (req, res): Promise<void> => {
  const params = SetCurrentTermParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.update(termsTable).set({ isCurrent: false });
  const [term] = await db.update(termsTable).set({ isCurrent: true }).where(eq(termsTable.id, params.data.id)).returning();
  if (!term) {
    res.status(404).json({ error: "Term not found" });
    return;
  }
  res.json(SetCurrentTermResponse.parse({ ...term, academicYearName: null }));
});

export default router;
