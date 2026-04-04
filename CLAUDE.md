# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fleeterzen is a multi-tenant SaaS fleet management platform. Companies manage drivers, vehicles, and job assignments. Drivers use a mobile-optimised interface to update job status, record odometer readings, and navigate to job locations via Google Maps. A vendor portal (super-admin layer) allows the software owner to manage customer companies, plans, and billing.

## Project Location

The working copy is at `C:\LogiTrack` (moved off OneDrive to avoid sync conflicts).
Git remote: `https://github.com/Miksan100/logistics-routing-app.git`

## Repository Structure

```
LogiTrack/
├── backend/          # Node.js + Express REST API (port 4000)
│   ├── migrations/   # PostgreSQL schema migrations
│   └── src/
│       ├── app.js             # Express entry point, middleware stack
│       ├── config/database.js # pg Pool singleton (supports DATABASE_URL for Railway)
│       ├── middleware/auth.js  # JWT authenticate + requireRole guards (checks company.is_active)
│       ├── middleware/vendorAuth.js  # Vendor JWT guard (separate secret + vendor_users table)
│       ├── routes/            # Thin handlers – validate input, call service
│       └── services/          # Business logic + raw SQL via pg Pool
└── frontend/         # Next.js 14 App Router (port 3000)
    ├── app/
    │   ├── (auth)/login/      # Public login page
    │   ├── admin/             # Admin-only section
    │   │   ├── dashboard/     # Stats overview with today/all-time split
    │   │   ├── drivers/       # Driver CRUD + password reset modal
    │   │   ├── fleet/         # Vehicle CRUD
    │   │   ├── jobs/          # Job CRUD with copy and edit
    │   │   ├── analytics/     # Driver productivity + fleet usage charts
    │   │   └── job-history/   # Completed job list + Leaflet GPS route maps
    │   ├── driver/            # Driver-only section
    │   │   ├── dashboard/     # Driver's active jobs summary
    │   │   ├── jobs/          # Job list with Active/Completed/All tabs
    │   │   ├── jobs/[id]/     # Job detail: status actions, odometer prompts, Google Maps
    │   │   └── odometer/      # Manual start/end-of-day odometer recording
    │   └── vendor/            # Vendor portal (super-admin)
    │       ├── login/         # Vendor login (separate from /login)
    │       ├── dashboard/     # Platform stats
    │       ├── companies/     # Searchable company list
    │       ├── companies/[id]/# Company detail: stats, plan, status, notes, users
    │       └── companies/new/ # Create company form → credentials on success
    ├── components/
    │   ├── admin/             # DriverCard, DriverModal, VehicleModal, JobModal, ResetPasswordModal, RouteMap
    │   └── shared/            # StatusBadge
    ├── lib/
    │   ├── api.ts             # Axios instance + typed API helpers
    │   ├── auth.ts            # sessionStorage token/user helpers (per-tab isolation)
    │   ├── vendorApi.ts       # Separate Axios instance for /api/vendor/*
    │   └── vendorAuth.ts      # sessionStorage helpers using fl_vendor_token / fl_vendor_user
    └── types/index.ts         # Shared TypeScript interfaces
```

## Development Commands

### Backend
```bash
cd C:\LogiTrack\backend
# Copy .env.example to .env and fill in DB credentials and JWT_SECRET + VENDOR_JWT_SECRET
node src/app.js        # start (no nodemon — use node directly on this machine)
```

### Frontend
```bash
cd C:\LogiTrack\frontend
npm run dev            # Next.js dev server (run from Windows PowerShell, not Git Bash)
npm run build && npm start
npm run lint
```

### Database
PostgreSQL on localhost:5432, database `logistics_db` (local), user `postgres`.
Run migrations manually via psql or `node migrations/run.js` (requires node in PATH).
Migration 002 adds `vendor_users`, `plans`, and extends `companies` with billing columns.
Seed: `admin@demo.com` / `Admin1234!`

### Windows-specific notes
- Run `npm run dev` from **Windows PowerShell**, not Git Bash — Git Bash cannot find `node` for npm scripts.
- Use `/c/Program Files/nodejs/node.exe` for direct node calls from Git Bash.
- The Write tool fails with EEXIST. Use Node.js file patching: `node -e "const fs=require('fs'); let c=fs.readFileSync(path,'utf8'); ..."`

## Architecture Decisions

### Multi-tenancy
Every table (except `companies` and `vendor_users`) has a `company_id` column. All service functions include `WHERE company_id = $n`. Never query without it.

### Auth Flow — Tenant (company users)
1. `POST /api/auth/login` returns JWT `{ userId, companyId, role }`.
2. Frontend stores token in **sessionStorage** (per-tab isolation).
3. Axios interceptor injects `Authorization: Bearer <token>` on every request.
4. Backend `middleware/auth.js` verifies JWT with `JWT_SECRET`, re-fetches user row **joining companies** to check `company.is_active`. Suspended company → 403.
5. `requireRole('admin')` or `requireRole('driver')` guards protect routes.

### Auth Flow — Vendor Portal
1. `POST /api/vendor/auth/login` returns JWT `{ vendorUserId, role: 'vendor' }` signed with `VENDOR_JWT_SECRET`.
2. Frontend stores token under key `fl_vendor_token` in sessionStorage.
3. All `/api/vendor/*` routes use `middleware/vendorAuth.js` — completely isolated from tenant auth.
4. Vendor JWT is rejected by all tenant routes (wrong secret + no userId claim).

### Route → Service Pattern
Routes in `src/routes/` are thin: validate inputs, call service, return JSON. All SQL lives in `src/services/`.

### Driver / User Account Relationship
Creating a driver automatically creates a linked `users` row (role = `driver`). Driver email/name updates sync to `users`. Drivers log in via their user account. `plain_password` column stores plaintext password for admin visibility.

### Job Status Machine
```
pending → started → in_progress → completed
               ↘                ↘
                cancelled ←──────
```
Cancellation requires a non-empty reason. Every transition logged to `job_status_updates`.

### Odometer Flow
When driver starts a job: prompted for start odometer → calls `POST /api/odometer/start-day`.
When driver completes a job: prompted for end odometer → calls `POST /api/odometer/end-day`.
Both endpoints accept optional `vehicleId` in the body as fallback if driver has no permanently assigned vehicle (uses the job's `assigned_vehicle_id`).

### GPS Route Tracking
On job start: embedded Google Maps renders in-app with pickup→delivery route. Screen wake lock keeps display on.
Browser `watchPosition` records GPS points and POSTs to `POST /api/tracking/job/:jobId/track`.
Points stored in `job_gps_tracks` table. Admin views routes in Job History via Leaflet/OpenStreetMap (free).
Google Maps API key stored in `frontend/.env.local` as `NEXT_PUBLIC_MAPS_API_KEY` (also in Vercel env vars for production).
**Important:** API key is currently unrestricted — must be locked to production domain in Google Cloud Console before go-live.

### Dashboard Stats Split
`getDashboardStats` returns two sets: all-time job counts + today-only counts.
"Overall Completion Rate for Today" uses `completed_today / total_today`.

### Job Copy
Admin can copy any job (Copy icon on job cards). Pre-fills the create modal with source job data, resets scheduled date to today, prefixes title with "Copy of …".

### Vendor Portal — Company Lifecycle
Vendor creates company → transaction: insert companies row + admin users row → returns credentials.
Vendor suspends company (sets `is_active = false`) → all company sessions get 403 on next API call.
Plans stored in `plans` table. `companies.plan_status` ∈ `{trial, active, suspended, cancelled}`.

## API Reference

- Backend base: `http://localhost:4000/api`
- Health check: `GET /health`
- GPS ingestion (no auth): `POST /api/tracking/gps`
- Job GPS track (driver): `POST /api/tracking/job/:jobId/track`
- Job route (admin): `GET /api/tracking/job/:jobId/route`
- Job history list (admin): `GET /api/tracking/jobs`
- Vendor auth: `POST /api/vendor/auth/login`, `GET /api/vendor/auth/me`
- Vendor companies: `GET/POST /api/vendor/companies`, `GET /api/vendor/companies/:id`
- Vendor company actions: `PATCH /api/vendor/companies/:id/status|plan|notes`
- Vendor stats: `GET /api/vendor/stats`
- Vendor plans: `GET /api/vendor/plans`

All tenant endpoints require `Authorization: Bearer <tenant-jwt>`.
All vendor endpoints require `Authorization: Bearer <vendor-jwt>`.

## Database Tables
Standard: `companies`, `users`, `drivers`, `vehicles`, `jobs`, `job_status_updates`, `odometer_logs`, `gps_tracking`
Added: `job_gps_tracks` (id, company_id, job_id, driver_id, latitude, longitude, accuracy, timestamp)
Migration 002: `vendor_users`, `plans`; extended `companies` with plan_id, plan_status, trial_ends_at, billing_email, payment_gateway_customer_id, payment_gateway_sub_id, notes

## Frontend Dependencies
Includes `leaflet@1.9.4` and `react-leaflet@4.2.1` (v4 required for React 18 — v5 requires React 19).
RouteMap component must be loaded with `dynamic(() => import(...), { ssr: false })`.

## Production Deployment (Railway + Vercel)
`backend/src/config/database.js` accepts `DATABASE_URL` env var (Railway postgres).
When `DATABASE_URL` is set, SSL is enabled with `rejectUnauthorized: false`.
Run both migrations (001 + 002) on the production database before first deploy.

## Pre-Deployment Checklist
Must complete before going live:
- [ ] Restrict Google Maps API key to production domains (currently unrestricted)
- [ ] Set `NEXT_PUBLIC_MAPS_API_KEY` in Vercel env vars
- [ ] Set `NEXT_PUBLIC_API_URL=https://api.fleeterzen.com/api` in Vercel
- [ ] Set strong `JWT_SECRET` and `VENDOR_JWT_SECRET` in Railway (not dev values)
- [ ] Set `CORS_ORIGIN` to exact production domain in Railway
- [ ] Set `DATABASE_URL` in Railway
- [ ] Run migrations 001 + 002 on Railway Postgres
- [ ] DNS: fleeterzen.com registered, api.fleeterzen.com → Railway, app.fleeterzen.com → Vercel
- [ ] Confirm plain_password column removed before any real clients onboarded
