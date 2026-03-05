# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LogiTrack is a multi-tenant SaaS logistics management platform. Companies manage drivers, vehicles, and job assignments. Drivers use a mobile-optimised interface to update job status and record odometer readings.

## Repository Structure

```
Logistics Routing App/
├── backend/          # Node.js + Express REST API (port 4000)
│   ├── migrations/   # PostgreSQL schema (run once to set up DB)
│   └── src/
│       ├── app.js             # Express entry point, middleware stack
│       ├── config/database.js # pg Pool singleton
│       ├── middleware/auth.js  # JWT authenticate + requireRole guards
│       ├── routes/            # Thin handlers – validate input, call service
│       └── services/          # Business logic + raw SQL via pg Pool
└── frontend/         # Next.js 14 App Router (port 3000)
    ├── app/
    │   ├── (auth)/login/      # Public login page
    │   ├── admin/             # Admin-only section (layout guards role)
    │   └── driver/            # Driver-only section (layout guards role)
    ├── components/
    │   ├── admin/             # Forms/modals used in admin pages
    │   └── shared/            # StatusBadge and other shared components
    ├── lib/
    │   ├── api.ts             # Axios instance + typed API helpers
    │   └── auth.ts            # localStorage token/user helpers
    └── types/index.ts         # Shared TypeScript interfaces for all entities
```

## Development Commands

### Backend
```bash
cd backend
cp .env.example .env          # fill in DB credentials and JWT_SECRET
npm install
npm run migrate               # runs migrations/001_initial_schema.sql
npm run dev                   # nodemon with auto-restart
npm start                     # production
```

### Frontend
```bash
cd frontend
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL and Maps key
npm install
npm run dev                   # Next.js dev server with HMR
npm run build && npm start    # production build
npm run lint                  # ESLint via next lint
```

### Database Setup
PostgreSQL required. Create the database manually, then run `npm run migrate` from `backend/`.
Seed data creates one demo company + admin account: `admin@demo.com` / `Admin1234!`

## Architecture Decisions

### Multi-tenancy
Every table (except `companies`) has a `company_id` column. All service functions receive `companyId` as a parameter and include `WHERE company_id = $n` in every query. This is the primary data isolation boundary — never query without it.

### Auth Flow
1. `POST /api/auth/login` returns a JWT containing `{ userId, companyId, role }`.
2. Frontend stores token in localStorage via `lib/auth.ts`.
3. `lib/api.ts` Axios interceptor injects `Authorization: Bearer <token>` on every request.
4. Backend `middleware/auth.js` verifies JWT, re-fetches the user row, attaches `req.user`.
5. `requireRole('admin')` or `requireRole('driver')` guards protect individual routes.

### Route → Service Pattern
Routes in `src/routes/` are thin: parse/validate inputs, call the matching service, return JSON. All SQL lives in `src/services/`. Never put SQL in route files.

### Driver / User Account Relationship
Creating a driver automatically creates a linked `users` row (role = `driver`). Driver email/name updates are synced back to the `users` row. Drivers log in via their user account, then fetch their driver profile via `GET /api/drivers/me`.

### Job Status Machine
Valid transitions (enforced in `jobService.js`):
```
pending → started → in_progress → completed
               ↘                ↘
                cancelled ←──────
```
Cancellation always requires a non-empty reason string. Every transition is appended to `job_status_updates` for a full audit trail.

### Frontend Auth Guard
Each layout (`app/admin/layout.tsx`, `app/driver/layout.tsx`) checks `getUser()` from `lib/auth.ts` on mount. Wrong role or missing token redirects to `/login`. The `middleware.ts` file is a placeholder for future cookie-based SSR protection.

## API Reference

- Backend base: `http://localhost:4000/api`
- Health check: `GET /health`
- GPS ingestion (no auth — for external tracking providers): `POST /api/tracking/gps`

All other endpoints require `Authorization: Bearer <token>`. Admin endpoints use `requireRole('admin')`, driver endpoints use `requireRole('driver')`.

## Known Issues

- `backend/src/app.js` was generated with doubled single-quotes (`require(''express'')`) — a PowerShell artifact. Fix all `''` to `'` before running.
- `backend/migrations/001_initial_schema.sql` has the same doubled-quote issue in SQL string literals.
- `app/driver/jobs/[id]/page.tsx` (job detail page) was not fully written and needs to be completed.
- `app/driver/odometer/page.tsx` has not been written yet.
- No test suite exists.

## File Writing on This Machine (Windows)

The shell environment is Git Bash on Windows. The Write tool fails with EEXIST when parent directories already exist. Use this pattern for all new files:

```bash
B64=$(cat << 'HEREDOC' | base64.exe -w 0
<file content here — keep under 100 lines per call>
HEREDOC
)
echo "[System.IO.File]::WriteAllText('C:\full\path\to\file.ext', [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('$B64')))" | powershell.exe -Command -
```

Use `AppendAllText` instead of `WriteAllText` to append a second chunk to the same file.
Create directories first with: `powershell.exe -Command "New-Item -ItemType Directory -Force -Path 'C:\path' | Out-Null"`
