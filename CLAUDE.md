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
npm run hash-password  # Prints a bcrypt hash for ADMIN_PASSWORD_HASH (input hidden; or pipe the password on stdin)
```

There are no tests configured for either package.

## Architecture

### Frontend (`frontend/src/`)
- **`App.tsx`** is the entry point and owns all auth state (`isAuthenticated`, `username`, and the CSRF token, all in memory). The admin session lives in an HTTP-only cookie that page scripts cannot read; the frontend never stores a token in `localStorage`. It passes `authFetch` (a wrapper around `apiFetch` in `utils/api.ts` that sends cookies with `credentials: "include"` and the `X-CSRF-Token` header on writes) and `apiUrl` down as props to components that need API access.
- Routes: `/` (public home), `/login` (admin login), `/admin` (protected dashboard).
- Components are split into feature-level (`BookList`, `FeaturedBook`, `SuggestBookForm`, `ContactForm`, `AdminLogin`, `AdminDashboard`, `AdminBookList`, `AddBookForm`, `AddImageForm`) and generic UI primitives under `components/generic/` (`Button`, `Card`, `Form`, `Table`).
- `AdminDashboard` reuses a single `AdminBookList` component for three different data sources (suggested books, contact form submissions, and the main book library) via a `bookList` prop.
- Styling: Tailwind CSS v4 (via `@tailwindcss/vite` plugin, no config file needed).
- Frontend API URL is configured via `VITE_API_URL` and `VITE_URL_PREFIX` env vars (see `frontend/.env`). The suggest and contact forms also need `VITE_TURNSTILE_SITE_KEY` (public Turnstile key).
- The public suggest and contact forms render a Cloudflare Turnstile widget (`components/generic/Turnstile/TurnstileWidget.tsx`) and send its token as `X-Turnstile-Token`. `Form` takes an optional `footer` slot and `submitDisabled` to host the widget.

### Backend (`backend/src/`)
- **`app.ts`** is the Express entry point. It imports `utils/env.ts` first (startup gate), wires middleware (helmet, CORS, rate limiting), mounts routers, and holds the global error handler.
- **Startup gate** (`utils/env.ts`): the server refuses to start, naming each problem, if `JWT_SECRET` is missing or shorter than 32 characters, `ADMIN_PASSWORD_HASH` is missing or not bcrypt, or any required setting (`ADMIN_USERNAME`, `TURNSTILE_SECRET_KEY`, `MINIO_URL`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET_NAME`, `FRONTEND_URL`, `URL_PREFIX`) is unset. Nothing reads these secrets before the gate runs.
- **Auth**: Single admin user. The password is stored only as a bcrypt hash in `ADMIN_PASSWORD_HASH` (generate with `npm run hash-password`). `services/adminAuth.ts` compares the username in constant time and always runs bcrypt, so timing does not reveal valid usernames.
  - `POST /api/admin/login` sets an `admin_session` cookie (HTTP-only, Secure, `SameSite=Strict`, 24 h) holding a signed JWT. The JWT is never returned in the body. The response includes a `csrfToken`.
  - `POST /api/admin/logout` clears the cookie. `GET /api/admin/validate` checks the cookie and returns a fresh `csrfToken`.
  - Protected routes (`middleware/auth.ts`) read the cookie. Writes (POST, PUT, DELETE) also need `X-CSRF-Token`, an HMAC of the session's `jti` keyed with `JWT_SECRET`.
  - Login is limited to 5 failed attempts per IP per 15 minutes (`middleware/loginLimiter.ts`), counted in Redis. The check runs before the password, so a blocked address is refused even with the correct password.
  - The frontend and API must be on subdomains of one domain for the cookie to be sent (`SameSite=Strict`). See `docs/railway-setup.md`.
- **Public write endpoints** (`POST /suggested_books`, `POST /contact_form`): require a valid Turnstile token in `X-Turnstile-Token` (`middleware/turnstile.ts`, `services/turnstile.ts`), are limited to 10 accepted submissions per IP per endpoint per hour (`middleware/submissionLimiter.ts`), and accept exactly one entry per request.
- **Errors**: 5xx responses return `Internal server error` (or `Upload failed`) and no internal detail. Error detail is returned only when `NODE_ENV=development`. The full error and stack always go to the server log.
- **Routing**: Five routers mounted at `/api/admin` (`routes/adminRouter.ts`), `/books`, `/suggested_books`, `/contact_form`, `/book-image`, plus `/health`.
- **Services layer** (`services/`): Each router delegates to a service module (`books.ts`, `suggestedBooks.ts`, `contactForm.ts`). Database calls go through `services/db.ts` which wraps a `mysql2` connection pool.
- **Image storage**: Book cover images are stored in MinIO (S3-compatible). `utils/config.ts` builds the single MinIO client from `MINIO_URL` and exports the single bucket name from `MINIO_BUCKET_NAME`. Uploads, the image proxy, and presigned links (`minioCache.ts`) all use that one client and bucket. Images are served via `GET /book-image/:imgName` and uploaded via `POST /book-image/upload` (admin only; multipart field `image`, optional `isbn` in body to name the file; 5 MB limit; the file's first bytes must be JPEG, PNG, WebP, or GIF, and the declared type is ignored).
- **Pagination**: `DB_CONFIG.listPerPage = 15` (hardcoded); the `page` query param is accepted on `GET /books`.
- **Error handling**: Routes call `next(err)` with `AppError` instances (from `utils/helper.ts`) that carry `statusCode` and `details`. The global error handler at the bottom of `app.ts` serializes these.

### Environment Variables

**Backend** (`backend/.env`). The backend refuses to start if a **required** variable is missing or invalid. Full descriptions are in `docs/env-vars.md`.
```
DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT
PORT
ADMIN_USERNAME
ADMIN_PASSWORD_HASH          # required; bcrypt hash from `npm run hash-password`
JWT_SECRET                   # required; 32+ characters
TURNSTILE_SECRET_KEY         # required; server-only
MINIO_URL                    # required; full URL with protocol
MINIO_BUCKET_NAME            # required
MINIO_ACCESS_KEY, MINIO_SECRET_KEY   # required
FRONTEND_URL, URL_PREFIX     # required; frontend host (literal value) and protocol
REDIS_URL                    # login and submission limits
NODE_ENV                     # "development" to show error detail; unset in deployed environments
RAILWAY_PUBLIC_DOMAIN
```

**Frontend** (`frontend/.env`):
```
VITE_API_URL              # API host (no protocol), e.g. localhost:3001 locally; api.<domain> in deployed environments
VITE_URL_PREFIX           # http or https
VITE_TURNSTILE_SITE_KEY   # public Turnstile site key (suggest and contact forms)
```

**Removed** (no longer read): `ADMIN_PASSWORD`, `SESSION_SECRET`, `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL`.

### Deployment
The app is deployed on Railway. The backend is an HTTP server behind Railway's TLS proxy. The frontend and API run on subdomains of `bannedbookshub.com` (production `www.` and `api.`; development `dev.` and `api-dev.`). This is required so the admin cookie is same-site. CORS is restricted to `FRONTEND_URL`. Custom domain and Turnstile setup is in `docs/railway-setup.md`.

### Database Migrations

**CRITICAL**: All database schema changes MUST be implemented as versioned migrations, not direct SQL modifications.

**Creating a Migration**:
1. Create `.up.sql` file in `backend/database/tables/` or `backend/database/procedures/`
2. Number sequentially (e.g., `004-add-status-column.up.sql`)
3. Wrap SQL in `BEGIN;...COMMIT;` transaction
4. Create matching `.down.sql` file with rollback SQL
5. Commit and push:
   - Push to `development` → Auto-deploys to dev database
   - Push to `main` → Requires approval, deploys to production

**Example**:
```sql
-- backend/database/tables/004-add-status-column.up.sql
BEGIN;
ALTER TABLE banned_books ADD COLUMN status VARCHAR(50) DEFAULT 'active';
COMMIT;
```

```sql
-- backend/database/tables/004-add-status-column.down.sql
BEGIN;
ALTER TABLE banned_books DROP COLUMN status;
COMMIT;
```

**Important**: Do NOT edit existing `*.Table.sql` or `*.StoredProcedure.sql` files directly. Create new migrations instead.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at `specs/005-security-remediation/plan.md`.
<!-- SPECKIT END -->
