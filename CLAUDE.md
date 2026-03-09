# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LogiTrack is a multi-tenant SaaS logistics management platform. Companies manage drivers, vehicles, and job assignments. Drivers use a mobile-optimised interface to update job status, record odometer readings, and navigate to job locations via Google Maps.

## Project Location

The working copy is at `C:LogiTrack` (moved off OneDrive to avoid sync conflicts).
Git remote: `https://github.com/Miksan100/logistics-routing-app.git`

## Repository Structure

```
LogiTrack/
├── backend/          # Node.js + Express REST API (port 4000)
│   ├── migrations/   # PostgreSQL schema migrations
│   └── src/
│       ├── app.js             # Express entry point, middleware stack
│       ├── config/database.js # pg Pool singleton
│       ├── middleware/auth.js  # JWT authenticate + requireRole guards
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
    │   └── driver/            # Driver-only section
    │       ├── dashboard/     # Driver's active jobs summary
    │       ├── jobs/          # Job list with Active/Completed/All tabs
    │       ├── jobs/[id]/     # Job detail: status actions, odometer prompts, Google Maps
    │       └── odometer/      # Manual start/end-of-day odometer recording
    ├── components/
    │   ├── admin/             # DriverCard, DriverModal, VehicleModal, JobModal, ResetPasswordModal, RouteMap
    │   └── shared/            # StatusBadge
    ├── lib/
    │   ├── api.ts             # Axios instance + typed API helpers
    │   └── auth.ts            # sessionStorage token/user helpers (per-tab isolation)
    └── types/index.ts         # Shared TypeScript interfaces
```

## Development Commands

### Backend
```bash
cd C:LogiTrackackend
# Copy .env.example to .env and fill in DB credentials and JWT_SECRET
node src/app.js        # start (no nodemon — use node directly on this machine)
```

### Frontend
```bash
cd C:LogiTrackrontend
npm run dev            # Next.js dev server (run from Windows PowerShell, not Git Bash)
npm run build && npm start
npm run lint
```

### Database
PostgreSQL on localhost:5432, database `logistics_db`, user `postgres`.
Run migrations manually via psql or `node migrations/run.js` (requires node in PATH).
Seed: `admin@demo.com` / `Admin1234!`

### Windows-specific notes
- Run `npm run dev` from **Windows PowerShell**, not Git Bash — Git Bash cannot find `node` for npm scripts.
- Use `/c/Program Files/nodejs/node.exe` for direct node calls from Git Bash.
- The Write tool fails with EEXIST. Use Node.js file patching: `node -e "const fs=require('fs'); let c=fs.readFileSync(path,'utf8'); ..."`

## Architecture Decisions

### Multi-tenancy
Every table (except `companies`) has a `company_id` column. All service functions include `WHERE company_id = $n`. Never query without it.

### Auth Flow
1. `POST /api/auth/login` returns JWT `{ userId, companyId, role }`.
2. Frontend stores token in **sessionStorage** (per-tab isolation — logging in as driver in one tab doesn't affect admin in another).
3. Axios interceptor injects `Authorization: Bearer <token>` on every request.
4. Backend `middleware/auth.js` verifies JWT, re-fetches user row, attaches `req.user`.
5. `requireRole('admin')` or `requireRole('driver')` guards protect routes.

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
On job start: browser opens Google Maps deep link (free, no API key) with pickup→delivery route.
Browser `watchPosition` records GPS points and POSTs to `POST /api/tracking/job/:jobId/track`.
Points stored in `job_gps_tracks` table. Admin views routes in Job History via Leaflet/OpenStreetMap (free).

### Dashboard Stats Split
`getDashboardStats` returns two sets: all-time job counts + today-only counts.
"Overall Completion Rate for Today" uses `completed_today / total_today`.

### Job Copy
Admin can copy any job (Copy icon on job cards). Pre-fills the create modal with source job data, resets scheduled date to today, prefixes title with "Copy of …".

## API Reference

- Backend base: `http://localhost:4000/api`
- Health check: `GET /health`
- GPS ingestion (no auth): `POST /api/tracking/gps`
- Job GPS track (driver): `POST /api/tracking/job/:jobId/track`
- Job route (admin): `GET /api/tracking/job/:jobId/route`
- Job history list (admin): `GET /api/tracking/jobs`

All other endpoints require `Authorization: Bearer <token>`.

## Database Tables
Standard: `companies`, `users`, `drivers`, `vehicles`, `jobs`, `job_status_updates`, `odometer_logs`, `gps_tracking`
Added: `job_gps_tracks` (id, company_id, job_id, driver_id, latitude, longitude, accuracy, timestamp)

## Frontend Dependencies
Includes `leaflet@1.9.4` and `react-leaflet@4.2.1` (v4 required for React 18 — v5 requires React 19).
RouteMap component must be loaded with `dynamic(() => import(...), { ssr: false })`.
