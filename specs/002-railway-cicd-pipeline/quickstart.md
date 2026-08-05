# Validation Guide: Railway CI/CD Pipeline & GitHub Integration

This guide walks through validating the full three-tier pipeline (local → development → production) after implementation. Complete each tier in order before promoting to the next.

---

## Tier 1: Local Environment

**Goal**: Confirm both frontend and backend run locally with all features working.

### Prerequisites

- Node.js 18+ installed
- MariaDB/MySQL running locally (or a local DB accessible)
- Redis running locally (`redis-server`)
- A populated `backend/.env` using the template from `backend/.env.example`
- A populated `frontend/.env` using the template from `frontend/.env.example`

### Steps

1. Clone the repository and check out the `development` branch:
   ```
   git clone <repo-url>
   cd banned-books-hub
   git checkout development
   ```

2. Start the backend:
   ```
   cd backend
   npm install
   npm run dev
   ```
   **Expected**: Server logs show `Listening on port 3001` (or configured port). No errors about missing env vars or failed DB connections.

3. In a second terminal, start the frontend:
   ```
   cd frontend
   npm install
   npm run dev
   ```
   **Expected**: Vite reports `Local: http://localhost:5173`. No TypeScript or import errors.

4. Open `http://localhost:5173` in a browser.

### Validation Checklist — Local

- [ ] Homepage loads and displays the book list (confirms DB connection)
- [ ] Health endpoint responds: `GET http://localhost:3001/health` returns `{"status":"healthy",...}`
- [ ] Health endpoint shows Redis connected: `cache.connected` is `true` in the response
- [ ] Admin login works: navigate to `/login`, enter credentials from `.env`, receive JWT
- [ ] Admin dashboard loads book list, suggested books, and contact form submissions
- [ ] Image upload works: add a book with an image; image appears in the dev MinIO bucket
- [ ] No `console.error` messages in the browser DevTools related to API failures

---

## Tier 2: Development Environment (Railway)

**Goal**: Confirm that a merge to `development` triggers an automatic Railway deployment and that the development environment works end-to-end against the development database and MinIO bucket.

### Prerequisites

- Railway project configured with a `development` environment
- `development` environment Railway services linked to the `development` branch
- All variables from `data-model.md` (Development column) set in Railway `development` environment
- A pull request from a feature branch has been merged into `development`

### Trigger

Push or merge any change to `development`. Railway detects the push and initiates a new deployment automatically — no manual action required.

### Validation Checklist — Development

- [ ] Railway dashboard shows a new deployment triggered within 1 minute of the merge
- [ ] Deployment completes successfully (green status, no build or start errors) within 10 minutes
- [ ] Development frontend URL loads the homepage and displays book data
- [ ] `GET https://<dev-backend-domain>/health` returns `{"status":"healthy","cache":{"connected":true}}`
- [ ] Admin login works using **development-specific** credentials (not local credentials)
- [ ] A book image can be uploaded; the image appears in the development MinIO bucket (`bucket-development-d7ab.up.railway.app`) and NOT in the production bucket
- [ ] The production environment is unaffected: the production frontend URL still works and shows production data
- [ ] Railway `development` environment variables show `MINIO_URL=https://bucket-development-d7ab.up.railway.app` and the `DB_HOST` points to the development database, not production

---

## Tier 3: Production Environment (Railway)

**Goal**: Confirm that merging `development` into `main` triggers an automatic production deployment and that the production environment works against the production database and MinIO bucket.

### Prerequisites

- Railway project `production` environment linked to the `main` branch
- All variables from `data-model.md` (Production column) set in Railway `production` environment
- Tier 2 validation passed — the change is verified in development first

### Trigger

Open a pull request from `development` to `main`. After review, merge. Railway detects the push and initiates a production deployment automatically.

### Validation Checklist — Production

- [ ] Railway dashboard shows a new deployment triggered in the `production` environment within 1 minute of the merge to `main`
- [ ] Deployment completes successfully within 10 minutes
- [ ] Production frontend URL loads the homepage and displays production data
- [ ] `GET https://<prod-backend-domain>/health` returns `{"status":"healthy","cache":{"connected":true}}`
- [ ] Admin login works using **production-specific** credentials
- [ ] Image upload routes images to the production MinIO bucket (`bucket-production-70f9.up.railway.app`)
- [ ] The development environment is unaffected: development URL still works and shows development data
- [ ] Railway `production` environment variables show `MINIO_URL=https://bucket-production-70f9.up.railway.app` and the `DB_HOST` points to the production database

---

## Rollback Procedure

If a production deployment introduces a regression:

1. In Railway, navigate to the `production` environment → select the previous successful deployment → click **Redeploy**.
2. Railway rolls back to the previously deployed image without a code change required.
3. On the GitHub side, revert the offending commit and open a new PR from `development` to `main` to restore the correct state.

---

## Environment Variable Audit (run any time)

Cross-check that every variable in `docs/env-vars.md` is set in each Railway environment:

1. Open Railway → `development` environment → Variables tab. Compare against the Development column in `data-model.md`. Every variable must be present with a non-empty value.
2. Open Railway → `production` environment → Variables tab. Compare against the Production column in `data-model.md`. Confirm `MINIO_URL` and `DB_HOST` differ from the development values.
3. Confirm no variable in either Railway environment uses a value that belongs to the other environment (especially `DB_HOST`, `MINIO_URL`, `JWT_SECRET`).
