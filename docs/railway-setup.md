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
   | `FRONTEND_URL` | Dev frontend custom domain, literal value (for example `dev.bannedbookshub.com`, no `https://`). Do not use a Railway reference. |
   | `URL_PREFIX` | `https` |
   | `RAILWAY_PUBLIC_DOMAIN` | Railway domain of the backend-dev service (no `https://`) |
   | `ADMIN_USERNAME` | dev admin username (your choice) |
   | `ADMIN_PASSWORD_HASH` | bcrypt hash from `npm run hash-password` (never the plain password) |
   | `JWT_SECRET` | random 32+ char string (unique to development) |
   | `TURNSTILE_SECRET_KEY` | secret key of the dev Turnstile widget (see [Custom Domains and Turnstile](#custom-domains-and-turnstile)) |
   | `MINIO_URL` | `https://bucket-development-d7ab.up.railway.app` |
   | `MINIO_BUCKET_NAME` | the bucket that holds the cover images (required) |
   | `MINIO_ACCESS_KEY` | development MinIO access key |
   | `MINIO_SECRET_KEY` | development MinIO secret key |
   | `REDIS_URL` | From Redis service variables |

   > **Do not set** `ADMIN_PASSWORD`, `SESSION_SECRET`, `MINIO_ENDPOINT`, `MINIO_PORT`, or `MINIO_USE_SSL`. They are no longer read. Delete them if they exist.

   > **Tip**: Railway service domains appear in each service's **Settings** tab under "Public Networking." Enable a public domain for both backend-dev and frontend-dev if not already enabled.

### Step 8 — Configure frontend environment variables

1. Click the **frontend-dev** service → **Variables** tab
2. Add:

   | Variable | Value |
   |---|---|
   | `VITE_API_URL` | Dev API custom domain, literal value (for example `api-dev.bannedbookshub.com`, no `https://`) |
   | `VITE_URL_PREFIX` | `https` |
   | `VITE_TURNSTILE_SITE_KEY` | site key of the dev Turnstile widget (public) |

3. Redeploy the frontend service after setting these variables. `VITE_` values are built into the app, so Railway does not pick up changes without a redeploy. Click **Redeploy** in the service's Deployments tab.

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
| `FRONTEND_URL` | `dev.bannedbookshub.com` | `www.bannedbookshub.com` |
| `RAILWAY_PUBLIC_DOMAIN` | Dev backend domain | Prod backend domain |
| `ADMIN_PASSWORD_HASH` | Dev hash | **Different** prod hash (generated from a different password) |
| `TURNSTILE_SECRET_KEY` | Dev widget secret | Prod widget secret |
| `JWT_SECRET` | Dev secret | **Different** prod secret (must be unique, 32+ characters) |
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
- `JWT_SECRET` must be different from the development secret and at least 32 characters
- `ADMIN_PASSWORD_HASH` should come from a different password than the development admin password
- `FRONTEND_URL` and `VITE_API_URL` must be the production custom domains, not the dev ones
- `DB_HOST` should point to the production MariaDB service (different from development)

### Step 4 — Verify production environment

Follow the **Tier 3 checklist** in `specs/002-railway-cicd-pipeline/quickstart.md`:

- [ ] Railway deployment shows green for all production services
- [ ] Production frontend URL loads the book list with production data
- [ ] `GET https://<backend-prod-domain>/health` returns healthy
- [ ] Image uploads reach `bucket-production-70f9.up.railway.app`
- [ ] Development environment is unaffected (development URL still works)

---

## Custom Domains and Turnstile

The admin session cookie is same-site only. The frontend and API must therefore be served from subdomains of one domain, for example:

| Environment | Frontend | API |
|---|---|---|
| Production | `www.bannedbookshub.com` | `api.bannedbookshub.com` |
| Development | `dev.bannedbookshub.com` | `api-dev.bannedbookshub.com` |

Railway's `*.up.railway.app` addresses are different sites from each other, so they cannot share the admin cookie. Set up the custom domains before logging in to the admin area.

### 1. Add the custom domain in Railway

1. Open the Railway project, pick the environment, and click the **backend** service.
2. Go to **Settings → Networking → Custom Domain** and add the API hostname.
3. Railway shows a target such as `something.up.railway.app`. Copy it.
4. Repeat for the **frontend** service with the frontend hostname.

### 2. Create the DNS records

Add one CNAME per hostname at the registrar where the domain is managed. For GoDaddy: **My Products → Domains → (domain) → DNS → Add New Record**, Type `CNAME`, Name is the part before the domain (for example `www` or `api-dev`), Value is the Railway target.

- Delete any existing record or forwarding that already uses the same name. Two records with the same name will conflict.
- Railway may also ask for a `TXT` record to verify ownership. Add it with the name and value Railway shows.
- Wait until Railway shows each domain as verified with a certificate. DNS changes can take up to an hour.

### 3. Create the Turnstile widget

1. Sign in at `dash.cloudflare.com` (a free account is enough; the domain does not need to move to Cloudflare).
2. Open **Turnstile** and click **Add widget**.
3. Under **Hostnames**, add the frontend hostname for each environment (for example `www.bannedbookshub.com` and `dev.bannedbookshub.com`). Use hostnames only, with no `https://`.
4. Copy the **Site key** into the frontend as `VITE_TURNSTILE_SITE_KEY`, and the **Secret key** into the backend as `TURNSTILE_SECRET_KEY`.

### 4. Point the services at the new hosts

| Service | Variable | Value |
|---|---|---|
| backend | `FRONTEND_URL` | the frontend custom domain (literal value) |
| backend | `URL_PREFIX` | `https` |
| frontend | `VITE_API_URL` | the API custom domain (literal value) |
| frontend | `VITE_URL_PREFIX` | `https` |

Redeploy the frontend after changing `VITE_` values.

### 5. Check it

- `https://<api-domain>/health` returns `{"status":"healthy", ...}`.
- Log in on the frontend. The response sets an `admin_session` cookie on the API domain (visible in the browser's developer tools under Application → Cookies).
- Open the admin dashboard and confirm it loads data.

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
