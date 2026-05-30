---
name: Drizzle-Zod date mismatch
description: How to handle Date vs string type conflicts between Zod coerce.date() and Drizzle text() columns
---

## The rule
Zod schemas generated from the OpenAPI spec use `zod.coerce.date()` for date fields, producing `Date` objects. But the DB schema uses `text()` columns for dates (storing "YYYY-MM-DD" strings). TypeScript flags this mismatch.

**Why:** The OpenAPI spec uses `format: date` which Orval/codegen maps to `z.coerce.date()`, but Drizzle text columns expect strings.

**How to apply:**
- Before any `db.insert()` or `db.update()` with a date field: `parsed.data.hireDate.toISOString().split("T")[0]`
- For optional date fields: `parsed.data.hireDate ? parsed.data.hireDate.toISOString().split("T")[0] : undefined`
- For Zod `.parse()` on a Drizzle result object: cast `result as any` — coerce.date() handles strings at runtime
- Affects: hireDate (teachers), admissionDate/dateOfBirth (students), startDate/endDate (academic years, terms), paymentDate (payments), date (attendance)
