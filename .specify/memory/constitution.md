<!--
SYNC IMPACT REPORT
==================
Version change: [unversioned template] → 1.0.0
Bump rationale: Initial ratification — template placeholders fully replaced with project-specific
  content. No prior version to compare against; treating as v1.0.0 baseline.

Modified principles: N/A (first population)
Added sections:
  - Core Principles (5 principles: Security-First, Layered Architecture, Validation at
    the Boundary, Lean Frontend State, Environment-Driven Configuration)
  - Technology Stack & Constraints
  - Development Workflow
  - Governance

Templates reviewed:
  ✅ .specify/templates/plan-template.md — Constitution Check section is generic and
     auto-resolves to this file; no update required.
  ✅ .specify/templates/spec-template.md — No constitution references; no update required.
  ✅ .specify/templates/tasks-template.md — No constitution references; no update required.
  ℹ  .specify/templates/commands/ — Directory does not exist; skipped.

Deferred TODOs: None — all placeholders resolved.
-->

# Banned Books Hub Constitution

## Core Principles

### I. Security-First

Every route that mutates data (POST, PUT, DELETE, PATCH) MUST require authentication via the
`authenticate` JWT middleware before any handler logic runs. Public read routes (GET) are exempt.

- JWT tokens MUST be signed with `JWT_SECRET` from env; the fallback string `'missing-key'`
  is not acceptable in production.
- Rate limiting MUST be applied globally; security middleware (Helmet, CORS) MUST be
  initialized before any route handler.
- Sensitive credentials (DB passwords, MinIO keys, JWT secrets, external endpoints) MUST live
  exclusively in environment variables — never hardcoded in source code.
- File upload endpoints MUST enforce a maximum file size limit to prevent memory-based DoS.

### II. Layered Architecture

The backend MUST follow a strict three-layer separation: **Routes → Services → DB**.

- Routes handle HTTP concerns only: parsing params, calling services, sending responses, and
  calling `next(err)` on failure. No business logic or SQL in route handlers.
- Services own all business logic and validation. Database calls go exclusively through
  `services/db.ts`; no raw pool calls from route files.
- The DB layer (`services/db.ts`) is a thin query wrapper — no business logic lives there.
- Frontend components MUST NOT read `localStorage` or construct API URLs directly. Auth state
  is owned by `App.tsx`; components receive `authFetch` and `apiUrl` as props.

### III. Validation at the Boundary

Input MUST be validated at the service layer before any database operation is attempted.

- Required-field violations and type mismatches return HTTP `400 Bad Request`.
- Semantic validation failures (e.g., field present but logically invalid) return HTTP
  `422 Unprocessable Entity`.
- `501 Not Implemented` is reserved solely for unimplemented server capabilities and MUST NOT
  be used for validation errors.
- All errors MUST be surfaced as `AppError` instances with a meaningful `statusCode` and
  optional `details` payload, propagated to the global error handler via `next(err)`.

### IV. Lean Frontend State

The frontend MUST NOT introduce a global state library (Redux, Zustand, etc.) unless a clear
scaling need is demonstrated and documented.

- Auth state (`isAuthenticated`, `username`, token) lives in `App.tsx` and is passed down as
  props or via `authFetch`. Child components MUST NOT independently manage auth state.
- Shared TypeScript types (e.g., the `Book` interface) MUST be defined once in
  `frontend/src/types/` and imported wherever needed. Duplicate interface declarations
  across component files are not permitted.
- Environment variables (`VITE_API_URL`, `VITE_URL_PREFIX`) MUST be consumed through a
  single shared utility (e.g., `frontend/src/utils/api.ts`) rather than read directly in
  each component.

### V. Environment-Driven Configuration

All runtime configuration MUST be injected via environment variables — no production values
may be embedded in source.

- Backend: `DB_*`, `PORT`, `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`,
  `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_ENDPOINT`, `FRONTEND_URL`, `URL_PREFIX`,
  `RAILWAY_PUBLIC_DOMAIN`.
- Frontend: `VITE_API_URL`, `VITE_URL_PREFIX`.
- `dotenv` initialization MUST occur exactly once, at the application entry point
  (`backend/src/app.ts`). Repeated `require('dotenv').config()` calls in sub-modules are
  not permitted.
- Module syntax MUST be consistent: use ES `import`/`export` throughout; mixing `require()`
  and `import` in the same file is not permitted.

## Technology Stack & Constraints

**Frontend**: React 18 + TypeScript, Vite build, Tailwind CSS v4 (plugin-based, no config
file), React Router v6, React Google Analytics 4.

**Backend**: Node.js + Express + TypeScript, compiled via `ts-node` (dev) / `tsc` (prod),
JWT authentication, Helmet + express-rate-limit security layer.

**Database**: MariaDB/MySQL, accessed via `mysql2/promise` connection pool. All reads and
writes MUST go through stored procedures — no inline SQL in service files.

**Object Storage**: MinIO (S3-compatible) via the `minio` SDK. Images SHOULD be served via
pre-signed URLs or a public bucket rather than proxied through Express to avoid unnecessary
backend bandwidth consumption.

**Deployment**: Railway (both backend and frontend). TLS is terminated by Railway's proxy;
the backend runs HTTP internally. CORS is restricted to `FRONTEND_URL`.

**No test framework** is currently configured. Features SHOULD include acceptance criteria
verifiable by manual testing against the running application until automated testing is added.

## Development Workflow

- All backend commands run from `backend/`; all frontend commands run from `frontend/`.
  See `CLAUDE.md` for the full command reference.
- Changes to protected routes MUST be verified end-to-end with a valid JWT token before
  being considered complete.
- Any new environment variable added to the backend MUST be documented in `CLAUDE.md` under
  the Environment Variables section and added to Railway's env config before deployment.
- Debug `console.log` statements MUST be removed before merging to `main`. Structured error
  logging via `console.error` in catch blocks is acceptable.
- HTTP status codes returned from routes and services MUST accurately reflect the semantics
  defined in Principle III. Reviewers SHOULD flag incorrect status codes as blocking issues.

## Governance

This constitution supersedes all other informal practices for the Banned Books Hub project.
Amendments require:

1. A written description of the change and the motivation.
2. A version bump following semantic versioning (MAJOR for removals/redefinitions, MINOR for
   additions, PATCH for clarifications).
3. Updating `LAST_AMENDED_DATE` and incrementing `CONSTITUTION_VERSION`.
4. A propagation pass over dependent templates (plan, spec, tasks) to ensure consistency.

All feature plans and code reviews MUST include a "Constitution Check" confirming compliance
with the five core principles. Violations require explicit justification in the plan's
Complexity Tracking table.

**Version**: 1.0.0 | **Ratified**: 2026-06-24 | **Last Amended**: 2026-06-24
