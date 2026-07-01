# Implementation Plan: Security Hardening

**Branch**: `001-security-hardening` | **Date**: 2026-06-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-security-hardening/spec.md`

## Summary

The application currently exposes all book management routes (create, update, delete) without
authentication, stores an external service endpoint as a hardcoded string in source, uses the
wrong HTTP status code (`501 Not Implemented`) for input validation errors throughout the
service layer, sends a fabricated `Bearer Empty` authorization header from the browser when
no user is logged in, and lacks a file-size limit on image uploads. This plan remediates all
of these issues across the backend and frontend with no external dependency additions.

Technical approach: extract `authenticate` into a shared middleware module, apply it to all
mutating routes, replace the hardcoded MinIO endpoint with an env var, correct status codes
across all three service files, add multer limits and MIME validation to the upload route,
and fix the frontend auth header logic and shared type/URL-builder gaps.

## Technical Context

**Language/Version**: TypeScript (backend Node.js 18+, frontend React 18)

**Primary Dependencies**: Express + jsonwebtoken + helmet + express-rate-limit + multer +
minio SDK (backend); React 18 + React Router v6 + Vite (frontend)

**Storage**: MariaDB/MySQL via stored procedures (mysql2/promise) + MinIO object storage

**Testing**: No automated test framework — acceptance verified manually against the running
application

**Target Platform**: Railway (Linux, HTTP internal, TLS at proxy layer)

**Project Type**: Full-stack web application (React SPA + Express REST API)

**Performance Goals**: No new latency requirements beyond auth middleware overhead (~1ms per
JWT verify call, negligible)

**Constraints**: Single admin user; no new dependencies to be added; Railway deployment
environment; changes must be backward-compatible for public read endpoints

**Scale/Scope**: 14 files modified (10 backend, 4 frontend), 2 new files created (middleware
module, shared type + URL utility)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Current Status | This Feature |
|-----------|---------------|--------------|
| I. Security-First — write routes require auth | ❌ VIOLATION: POST/PUT/DELETE on `/books`, DELETE on `/suggested_books`, GET on `/contact_form` (admin read), POST on `/book-image/upload` are all unprotected | ✅ REMEDIATED by adding `authenticate` to all mutating and admin-read routes |
| II. Layered Architecture | ✅ Passing | ✅ No change; new middleware module fits the layer model |
| III. Validation at Boundary — correct status codes | ❌ VIOLATION: `501` used for input validation across all three service files | ✅ REMEDIATED by changing to `400`/`404`/`500` throughout |
| IV. Lean Frontend State — no duplicate types, no env var per-component | ❌ VIOLATION: `Book` interface duplicated in 4 components; `VITE_URL_PREFIX` read in 4 components; `Bearer Empty` sent when unauthenticated | ✅ REMEDIATED by extracting `Book` to `src/types/book.ts`, centralizing URL building in `src/utils/api.ts`, fixing auth header logic |
| V. Environment-Driven Config — no hardcoded secrets; `dotenv` once | ❌ VIOLATION: MinIO endpoint hardcoded in `config.ts`; `dotenv` called in `config.ts` and `db.ts` | ✅ REMEDIATED by moving endpoint to `MINIO_ENDPOINT` env var; removing extra `dotenv` calls |

**Gate result**: All violations are the subject of this feature. Proceeding to Phase 0.

*Post-design re-check*: No new violations introduced. Existing architecture (routes→services→DB)
preserved. No new layers or abstractions beyond what is needed. PASSED.

## Project Structure

### Documentation (this feature)

```text
specs/001-security-hardening/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api-security-changes.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (files touched by this feature)

```text
backend/
├── src/
│   ├── app.ts                          # Fix: require→import for http; remove inline authenticate
│   ├── middleware/
│   │   └── auth.ts                     # NEW: extracted authenticate middleware
│   ├── routes/
│   │   ├── bookRouter.ts               # Fix: require→import; add authenticate to POST/PUT/DELETE
│   │   ├── suggestedBookRouter.ts      # Fix: require→import; add authenticate to DELETE routes
│   │   ├── contactFormRouter.ts        # Fix: require→import; add authenticate to GET (admin read)
│   │   └── imageRouter.ts              # Fix: require→import; add authenticate to POST /upload;
│   │                                   #      add multer limits; add MIME check; fix 204→404
│   ├── services/
│   │   ├── books.ts                    # Fix: String→string; 501→400/404/500; removeMultiple affectedRows
│   │   ├── suggestedBooks.ts           # Fix: String→string; 501→400/404/500; removeMultiple affectedRows
│   │   └── contactForm.ts              # Fix: String→string; 501→400/500
│   └── utils/
│       └── config.ts                   # Fix: remove require('dotenv'); MINIO_ENDPOINT from env

frontend/
├── src/
│   ├── App.tsx                         # Fix: getAuthHeaders returns {} not Bearer Empty;
│   │                                   #      remove location.pathname from auth useEffect deps
│   ├── types/
│   │   └── book.ts                     # NEW: shared Book interface
│   ├── utils/
│   │   └── api.ts                      # NEW: buildUrl() helper centralizing URL_PREFIX
│   └── components/
│       ├── BookList/BookList.tsx        # Fix: use shared Book + buildUrl; fix nextPage bug;
│       │                               #      add setLoading(true) on page change
│       ├── AdminBookList/AdminBookList.tsx  # Fix: same as BookList
│       ├── FeaturedBook/FeaturedBook.tsx   # Fix: use shared Book + buildUrl
│       └── generic/Card/BookCard.tsx       # Fix: use shared Book + buildUrl
```

**Structure Decision**: Web application (Option 2). Backend and frontend are independent
packages under `backend/` and `frontend/` respectively.

## Complexity Tracking

> No constitution violations are introduced by this feature — all entries above are
> remediations of pre-existing violations. No complexity justification required.
