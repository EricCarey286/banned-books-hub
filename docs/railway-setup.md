# Railway Environment Setup

This guide walks through configuring both the Railway **development** and **production** environments from scratch. Both environments follow the same structure — the differences are the branch they track and the environment variable values.

See `docs/env-vars.md` for the full variable reference.

---

## Architecture Overview

```
GitHub repository
├── development branch  →  Railway "development" environment
└── main branch         →  Railway "production" environment

Each environment contains:
├── Backend service    (Node.js, auto-deploy on branch push)
├── Frontend service   (Node.js/static, auto-deploy on branch push)
├── MariaDB service    (database, isolated per environment)
└── Redis service      (cache, isolated per environment)
```

---

## Part 1: Development Environment

### Step 1 — Create the Railway project (if not already exists)

1. Log in to [railway.app](https://railway.app) and open your dashboard
2. Click **New Project**
3. Name it `banned-books-hub` (or your preferred name)

### Step 2 — Create the development environment

Railway projects start with a default environment. Rename or create the development environment:

1. In the Railway project, click the environment selector (top of the page, shows "production" by default)
2. Click **New Environment**
3. Name it `development`
4. Select the new `development` environment for all steps below

### Step 3 — Connect GitHub and create the backend service

1. Inside the `development` environment, click **+ New**
2. Select **GitHub Repo**
3. Authorize Railway to access your GitHub account if prompted
4. Select the `EricCarey286/banned-books-hub` repository
5. Railway will ask which directory/branch to deploy:
   - **Root directory**: `backend`
   - **Branch**: `development`
   - **Start command**: `npm start` (or leave blank to use `package.json` scripts)
6. Name the service **backend-dev** (or similar)
7. Click **Deploy** — Railway builds and deploys automatically

> **Auto-deploy**: After this setup, every push to `development` triggers a new deployment of this service automatically. No further configuration is needed.

### Step 4 — Create the frontend service

1. Inside the `development` environment, click **+ New** → **GitHub Repo**
2. Select the same repository
3. Configure:
   - **Root directory**: `frontend`
   - **Branch**: `development`
   - **Build command**: `npm run build`
   - **Start command**: (leave blank for static) or `npm run preview`
4. Name the service **frontend-dev**
5. Click **Deploy**

### Step 5 — Add a MariaDB database service

1. Click **+ New** → **Database** → **Add MariaDB**
2. Railway provisions a MariaDB instance and injects connection variables automatically into the environment
3. After provisioning, click the MariaDB service → **Variables** tab
4. Note the values for: `MYSQLHOST`, `MYSQLPORT`, `MYSQLDATABASE`, `MYSQLUSER`, `MYSQLPASSWORD`
   These map to: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` in the backend service

### Step 6 — Add a Redis service

1. Click **+ New** → **Database** → **Add Redis**
2. Railway provisions a Redis instance and injects `REDIS_URL` automatically
3. Click the Redis service → **Variables** tab and note the `REDIS_URL` value

### Step 7 — Configure backend environment variables

1. Click the **backend-dev** service → **Variables** tab
2. Add the following variables (refer to the Development column in `docs/env-vars.md` for full details):

   | Variable | Value |
   |---|---|
   | `DB_HOST` | From MariaDB service variables (`MYSQLHOST`) |
   | `DB_PORT` | From MariaDB service variables (`MYSQLPORT`) |
   | `DB_NAME` | From MariaDB service variables (`MYSQLDATABASE`) |
   | `DB_USER` | From MariaDB service variables (`MYSQLUSER`) |
   | `DB_PASSWORD` | From MariaDB service variables (`MYSQLPASSWORD`) |
   | `FRONTEND_URL` | Railway domain of the frontend-dev service (no `https://`) |
   | `URL_PREFIX` | `https` |
   | `RAILWAY_PUBLIC_DOMAIN` | Railway domain of the backend-dev service (no `https://`) |
   | `ADMIN_USERNAME` | dev admin username (your choice) |
   | `ADMIN_PASSWORD` | strong unique password |
   | `JWT_SECRET` | random 32+ char string (unique to development) |
   | `SESSION_SECRET` | random string |
   | `MINIO_URL` | `https://bucket-development-d7ab.up.railway.app` |
   | `MINIO_ACCESS_KEY` | development MinIO access key |
   | `MINIO_SECRET_KEY` | development MinIO secret key |
   | `REDIS_URL` | From Redis service variables |

   > **Tip**: Railway service domains appear in each service's **Settings** tab under "Public Networking." Enable a public domain for both backend-dev and frontend-dev if not already enabled.

### Step 8 — Configure frontend environment variables

1. Click the **frontend-dev** service → **Variables** tab
2. Add:

   | Variable | Value |
   |---|---|
   | `VITE_API_URL` | Railway domain of the backend-dev service (no `https://`) |
   | `VITE_URL_PREFIX` | `https` |

3. Redeploy the frontend service after setting these variables (Railway does not auto-redeploy on variable changes — click **Redeploy** in the service's Deployments tab)

### Step 9 — Seed the development database

Connect to the MariaDB service using a database client (e.g., TablePlus, DBeaver) with the credentials from Step 5, or use the Railway CLI:

```bash
railway connect --service MariaDB --environment development
```

Import your dev database dump or run schema setup scripts to populate the development database.

### Step 10 — Verify the development environment

Follow the **Tier 2 checklist** in `specs/002-railway-cicd-pipeline/quickstart.md`:

- [ ] Railway deployment shows green for all services
- [ ] Frontend URL loads the book list
- [ ] `GET https://<backend-dev-domain>/health` returns `{"status":"healthy","cache":{"connected":true}}`
- [ ] Admin login works with development credentials
- [ ] Image upload routes to `bucket-development-d7ab.up.railway.app`

---

## Part 2: Production Environment

The production environment mirrors development but tracks `main` and uses isolated production credentials.

### Variables that differ from development

| Variable | Development value | Production value |
|---|---|---|
| `DB_HOST` | Dev MariaDB hostname | Prod MariaDB hostname |
| `DB_PORT` | Dev MariaDB port | Prod MariaDB port |
| `DB_NAME` | `banned_books_dev` | `banned_books` |
| `DB_USER` | Dev DB user | Prod DB user |
| `DB_PASSWORD` | Dev DB password | Prod DB password |
| `FRONTEND_URL` | Dev frontend domain | Prod frontend domain |
| `RAILWAY_PUBLIC_DOMAIN` | Dev backend domain | Prod backend domain |
| `ADMIN_PASSWORD` | Dev admin password | **Different** prod admin password |
| `JWT_SECRET` | Dev secret | **Different** prod secret (must be unique) |
| `MINIO_URL` | `https://bucket-development-d7ab.up.railway.app` | `https://bucket-production-70f9.up.railway.app` |
| `MINIO_ACCESS_KEY` | Dev bucket key | Prod bucket key |
| `MINIO_SECRET_KEY` | Dev bucket key | Prod bucket key |
| `REDIS_URL` | Dev Redis URL | Prod Redis URL |

### Step 1 — Create the production environment

1. In the Railway project, click the environment selector → **New Environment**
2. Name it `production`
3. Select `production` for all remaining steps

### Step 2 — Add services

Repeat Steps 3–6 from Part 1, substituting:
- **Branch**: `main` instead of `development`
- Service names: **backend-prod**, **frontend-prod** (or similar)

### Step 3 — Configure environment variables

Repeat Steps 7–8 from Part 1, using the production values from the table above. Pay special attention to:

- `MINIO_URL` must be `https://bucket-production-70f9.up.railway.app`
- `JWT_SECRET` must be different from the development secret
- `ADMIN_PASSWORD` should be different from the development admin password
- `DB_HOST` should point to the production MariaDB service (different from development)

### Step 4 — Verify production environment

Follow the **Tier 3 checklist** in `specs/002-railway-cicd-pipeline/quickstart.md`:

- [ ] Railway deployment shows green for all production services
- [ ] Production frontend URL loads the book list with production data
- [ ] `GET https://<backend-prod-domain>/health` returns healthy
- [ ] Image uploads reach `bucket-production-70f9.up.railway.app`
- [ ] Development environment is unaffected (development URL still works)

---

## Recreating an Environment from Scratch

If you ever need to rebuild an environment (e.g., after an accidental deletion):

1. Create a new Railway environment with the correct name
2. Add four services: backend (GitHub), frontend (GitHub), MariaDB, Redis
3. Link backend and frontend to the correct branch (`development` or `main`)
4. Set all environment variables from the relevant column in `docs/env-vars.md`
5. Redeploy frontend service after setting its variables
6. Restore database from a backup or dump
7. Verify using the appropriate tier checklist in `quickstart.md`

---

## Useful Railway CLI Commands

```bash
# Install Railway CLI
npm install -g @railway/cli

# Log in
railway login

# Link local directory to a Railway project + environment
railway link

# Open a service's shell
railway shell --service backend-dev --environment development

# View logs
railway logs --service backend-dev --environment development

# Connect to MariaDB
railway connect --service MariaDB --environment development
```
