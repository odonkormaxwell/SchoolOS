---
name: Express session typing
description: The custom cookie session on req is not typed on Express Request — always cast req not session
---

## The rule
The app uses a custom in-memory session store with `req.session` set via middleware. Express's Request type has no `session` property. TypeScript errors occur.

**Why:** `express-session` is NOT installed. The session is a plain object stored in a `sessions` Record<string, ...> map. Module augmentation in app.ts doesn't reliably propagate.

**How to apply:**
- ALWAYS write `(req as any).session` — never `(req.session as any)` (the latter accesses the nonexistent property before casting)
- This applies in: app.ts middleware, requireAuth.ts, auth.ts routes, any route reading the session
