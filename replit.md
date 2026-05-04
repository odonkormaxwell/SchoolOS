# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Project: SchoolPro GH

Full-stack school management system for Ghanaian primary/JHS schools.

### Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifact: `school-mgmt`, preview path `/`)
- **Backend**: Express 5 + Drizzle ORM + PostgreSQL (artifact: `api-server`, path `/api`)
- **API codegen**: Orval (from OpenAPI spec in `lib/api-spec`)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **Auth**: Cookie-based sessions (`cookieParser` + signed `sid` cookie)
- **Build**: esbuild (for API server)

### Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Theme & Branding

- **Primary color**: `#0285FF` (blue) → CSS: `hsl(209 100% 50%)`
- **Sidebar**: `#071A2C` (blue-black) → CSS: `hsl(210 73% 10%)`
- All colors defined in `artifacts/school-mgmt/src/index.css`

## Authentication & RBAC

### Test Accounts

| Username      | Password       | Role        |
|---------------|----------------|-------------|
| admin         | admin123       | admin       |
| headteacher1  | head123        | headteacher |
| teacher1      | teacher123     | teacher     |
| accountant1   | accountant123  | accountant  |
| student1      | student123     | student     |
| parent1       | parent123      | parent      |

### Password hashing

`sha256(password + "school_salt_2024")` — see `artifacts/api-server/src/routes/auth.ts`

### Permissions system

Defined in `artifacts/school-mgmt/src/lib/permissions.ts`:
- Roles: `admin`, `headteacher`, `teacher`, `accountant`, `student`, `parent`
- Modules: `dashboard`, `students`, `teachers`, `classes`, `attendance`, `fees`, `results`, `reportCards`, `reports`, `settings`, `users`
- Actions: `view`, `create`, `edit`, `delete`
- Default permissions per role are hardcoded; admin can override in Settings → Permissions tab
- Overrides stored in `localStorage` key `schoolpro_perms_v1`
- `useAuth().can(module, action)` checks the current user's permissions

### Sidebar filtering

`Layout.tsx` filters `navItems` using `can(module)` — nav items not visible to the current role are hidden.

### Route protection

`ProtectedRoute` in `App.tsx` accepts a `module` prop. If the user lacks `view` permission, it renders an "Access Denied" screen instead.

### Backend auth middleware

`artifacts/api-server/src/middleware/requireAuth.ts` — applied to all routes except `/api/auth/*` and `/api/health`. Returns 401 if session is missing.

## Database Schema

Main tables in `lib/db/src/schema/`:
- `users` — system users with `role` (text, no enum)
- `school_profile` — one-row school info
- `teachers`, `students` — staff and pupil records
- `classes`, `subjects`, `class_assignments` — curriculum
- `academic_years`, `terms` — calendar
- `attendance` — daily attendance records
- `fee_types`, `fee_assignments`, `payments` — fees management
- `results` — exam results
- `report_cards` — term report cards

## Workspace Structure

```
artifacts/
  api-server/     — Express 5 backend (@workspace/api-server)
  school-mgmt/    — React+Vite frontend (@workspace/school-mgmt)
  mockup-sandbox/ — Canvas component previews
lib/
  db/             — Drizzle ORM schema + client (@workspace/db)
  api-spec/       — OpenAPI spec + codegen (@workspace/api-spec)
  api-zod/        — Zod schemas (@workspace/api-zod)
  api-client-react/ — Orval-generated React Query hooks (@workspace/api-client-react)
```

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
