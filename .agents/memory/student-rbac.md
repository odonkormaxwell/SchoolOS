---
name: Student RBAC pattern
description: How role-based data isolation is implemented for students/parents across backend and frontend
---

## The rule
Students and parents are locked to their own data via a two-layer system: backend enforcement + frontend permission zero.

**Why:** Backend filtering is the security layer; frontend permissions are the UX layer. Both must be aligned.

**How to apply:**

### Backend (currentUser helper in people.ts, academic.ts, fees.ts)
```typescript
function currentUser(req: any): { role: string; teacherId: number | null; studentId: number | null }
```
- student/parent: filter GET results to own studentId; block all POST/PUT/DELETE with 403
- teacher: filter to assigned classIds (via classAssignmentsTable); block non-assigned class writes
- admin/headteacher: see everything

### Frontend (permissions.ts)
- student/parent: ALL modules set to `none()` — no module is accessible via ProtectedRoute
- ProtectedRoute: if role is student/parent and module check fails → `<Redirect to="/my-portal" />` (not Access Denied)
- Layout.tsx: isStudentOrParent check → only "My Portal" nav item shown

### Student portal (/my-portal)
- StudentPortalRoute in App.tsx: accessible without module permission check
- Non-students who hit /my-portal are redirected to /dashboard
- Tabs: Results, Attendance, Fees (with payment instructions), Report Card
- Fees tab shows "How to Pay" guide (bursar office, MoMo) when balance > 0
