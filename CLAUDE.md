# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Banned Books Hub is a full-stack application for browsing, managing, and reporting books banned in the United States. It has a React frontend and an Express/Node.js backend, each in their own subdirectory with independent `package.json` files.

## Commands

All commands must be run from the respective subdirectory (`frontend/` or `backend/`).

### Frontend (`cd frontend`)
```bash
npm run dev        # Start Vite dev server
npm run build      # Type-check and build to dist/
npm run lint       # ESLint
npm run preview    # Preview production build locally
```

### Backend (`cd backend`)
```bash
npm run dev        # Start with nodemon + ts-node (hot reload)
npm run build      # Compile TypeScript to JS
npm start          # Run compiled JS (production)
```

There are no tests configured for either package.

## Architecture

### Frontend (`frontend/src/`)
- **`App.tsx`** is the entry point and owns all auth state (`isAuthenticated`, JWT token in `localStorage`). It passes `authFetch` (a fetch wrapper that injects `Authorization: Bearer <token>` headers) and `apiUrl` down as props to all components that need API access.
- Routes: `/` (public home), `/login` (admin login), `/admin` (protected dashboard).
- Components are split into feature-level (`BookList`, `FeaturedBook`, `SuggestBookForm`, `ContactForm`, `AdminLogin`, `AdminDashboard`, `AdminBookList`, `AddBookForm`, `AddImageForm`) and generic UI primitives under `components/generic/` (`Button`, `Card`, `Form`, `Table`).
- `AdminDashboard` reuses a single `AdminBookList` component for three different data sources (suggested books, contact form submissions, and the main book library) via a `bookList` prop.
- Styling: Tailwind CSS v4 (via `@tailwindcss/vite` plugin, no config file needed).
- Frontend API URL is configured via `VITE_API_URL` and `VITE_URL_PREFIX` env vars (see `frontend/.env`).

### Backend (`backend/src/`)
- **`app.ts`** is the Express entry point. It wires middleware (helmet, CORS, rate limiting) and mounts routers. JWT auth middleware (`authenticate`) is defined inline here.
- **Auth**: Single admin user via env vars (`ADMIN_USERNAME`, `ADMIN_PASSWORD`). Login issues a 24h JWT. Protected routes require `Authorization: Bearer <token>`.
- **Routing**: Four routers mounted at `/books`, `/suggested_books`, `/contact_form`, `/book-image`.
- **Services layer** (`services/`): Each router delegates to a service module (`books.ts`, `suggestedBooks.ts`, `contactForm.ts`). Database calls go through `services/db.ts` which wraps a `mysql2` connection pool.
- **Image storage**: Book cover images are stored in MinIO (S3-compatible). The endpoint is configured via `MINIO_URL` (parsed in `utils/config.ts`) — never hardcode it; a missing `MINIO_URL` crashes the backend at startup. Images are served via `GET /book-image/:imgName` and uploaded via `POST /book-image/upload` (multipart form, field name `image`, optional `isbn` in body to name the file).
- **Pagination**: `DB_CONFIG.listPerPage = 15` (hardcoded); the `page` query param is accepted on `GET /books`.
- **Error handling**: Routes call `next(err)` with `AppError` instances (from `utils/helper.ts`) that carry `statusCode` and `details`. The global error handler at the bottom of `app.ts` serializes these.

### Environment Variables

> **Canonical reference**: `docs/env-vars.md` — complete variable listing with purpose, per-environment values, and examples. Update that file whenever a new variable is added.

**Backend** (`backend/.env`):
```
DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT
PORT
ADMIN_USERNAME, ADMIN_PASSWORD
JWT_SECRET
MINIO_ACCESS_KEY, MINIO_SECRET_KEY
FRONTEND_URL, URL_PREFIX
RAILWAY_PUBLIC_DOMAIN
```

**Frontend** (`frontend/.env`):
```
VITE_API_URL      # backend host:port (no protocol), e.g. localhost:3001
VITE_URL_PREFIX   # http or https
```

### Deployment
The app is deployed on Railway with two isolated environments:
- **development** — auto-deploys from the `development` branch; uses development database and `bucket-development-d7ab.up.railway.app`
- **production** — auto-deploys from the `main` branch; uses production database and `bucket-production-70f9.up.railway.app`

The backend is an HTTP server (TLS is terminated by Railway's proxy). CORS is restricted to `FRONTEND_URL` from env.

Branching model: `feature/*` → `development` → `main`. See `docs/workflow.md` for the full promotion checklist and merge policy.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at `specs/002-railway-cicd-pipeline/plan.md`.
<!-- SPECKIT END -->
