# Local Development Setup

This guide gets both the frontend and backend running on your machine from a fresh clone. Expected time: under 15 minutes.

## Prerequisites

Install these before starting:

| Tool | Version | Install |
|---|---|---|
| Node.js | 18 or higher | https://nodejs.org |
| npm | comes with Node.js | — |
| MariaDB or MySQL | 10.x / 8.x | https://mariadb.org or https://dev.mysql.com/downloads/ |
| Redis | 7.x | https://redis.io/docs/getting-started/ |

> **macOS shortcut**: `brew install mariadb redis` then `brew services start mariadb && brew services start redis`

---

## Step 1: Clone and Check Out

```bash
git clone https://github.com/EricCarey286/banned-books-hub.git
cd banned-books-hub
git checkout development
```

---

## Step 2: Set Up the Backend

### 2a. Install dependencies

```bash
cd backend
npm install
```

### 2b. Create your local `.env`

```bash
cp .env.example .env
```

Open `backend/.env` and fill in the values. Key variables for local development:

| Variable | What to set | Notes |
|---|---|---|
| `DB_HOST` | `localhost` | — |
| `DB_PORT` | `3306` | MariaDB/MySQL default |
| `DB_NAME` | `banned_books_local` | Create this database (see Step 2c) |
| `DB_USER` | your local DB username | Often `root` for local dev |
| `DB_PASSWORD` | your local DB password | Blank if not set |
| `PORT` | `3001` | Backend port |
| `FRONTEND_URL` | `localhost:5173` | Vite default |
| `URL_PREFIX` | `http` | Use http locally |
| `RAILWAY_PUBLIC_DOMAIN` | `localhost:3001` | — |
| `ADMIN_USERNAME` | any username | e.g. `admin` |
| `ADMIN_PASSWORD` | any password | e.g. `localpass` |
| `JWT_SECRET` | any long random string | Min 32 chars |
| `MINIO_URL` | `https://bucket-development-d7ab.up.railway.app` | Shared dev bucket |
| `MINIO_ACCESS_KEY` | dev bucket access key | Get from project owner |
| `MINIO_SECRET_KEY` | dev bucket secret key | Get from project owner |
| `REDIS_URL` | `redis://localhost:6379` | Local Redis default |

See `docs/env-vars.md` for full documentation of every variable.

### 2c. Create the local database

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS banned_books_local;"
```

The application connects using the stored-procedure layer — no manual schema migration is required if you restore from a dump. To get a starting schema, ask the project owner for a dev database export and import it:

```bash
mysql -u root -p banned_books_local < dev-dump.sql
```

### 2d. Start the backend

```bash
npm run dev
```

**Expected output**: The server logs `Listening on port 3001` (or the `PORT` you set). No errors about missing env vars or failed DB connections.

---

## Step 3: Set Up the Frontend

Open a **second terminal** from the repository root:

```bash
cd frontend
npm install
cp .env.example .env
```

Open `frontend/.env` and set:

```
VITE_API_URL=localhost:3001
VITE_URL_PREFIX=http
```

Then start the frontend:

```bash
npm run dev
```

**Expected output**: Vite reports `Local: http://localhost:5173`.

---

## Step 4: Validate

Open `http://localhost:5173` in a browser and check each item:

- [ ] Homepage loads and the book list is populated (confirms database connection)
- [ ] `GET http://localhost:3001/health` returns `{"status":"healthy",...}`
- [ ] `GET http://localhost:3001/health` shows `"cache":{"connected":true}` (confirms Redis)
- [ ] Navigate to `/login`, enter your `ADMIN_USERNAME` / `ADMIN_PASSWORD`, and log in successfully
- [ ] Admin dashboard loads and shows books, suggested books, and contact submissions
- [ ] Upload a book image — it should succeed and appear in the development MinIO bucket
- [ ] No `console.error` messages in browser DevTools related to API failures

If all items pass, your local environment is fully working.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Error: connect ECONNREFUSED 127.0.0.1:3306` | MariaDB not running | `brew services start mariadb` or `sudo systemctl start mariadb` |
| `Error: connect ECONNREFUSED 127.0.0.1:6379` | Redis not running | `brew services start redis` or `sudo systemctl start redis` |
| `Missing env var DB_PASSWORD` | `.env` not copied | Run `cp .env.example .env` in `backend/` |
| Blank book list | Database empty or not connected | Check `DB_NAME`, `DB_USER`, `DB_PASSWORD`; import a dev dump |
| `401 Unauthorized` on admin login | Wrong credentials | Check `ADMIN_USERNAME` / `ADMIN_PASSWORD` in `backend/.env` |
| `cache.connected: false` in `/health` | Redis not running or wrong URL | Check `REDIS_URL` in `backend/.env`; verify Redis is running |

---

## Next Steps

Once local development is working, see:
- `docs/workflow.md` — how to branch, develop, and promote changes through environments
- `docs/railway-setup.md` — how the Railway development and production environments are configured
- `docs/env-vars.md` — complete reference for every environment variable
