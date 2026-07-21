# Environment Variable Reference

> **This is the single source of truth for all environment variables used by Banned Books Hub.**
> When you add a new variable to the codebase, you MUST update this file AND configure the variable in Railway before merging to `development`. See `docs/workflow.md` for the full policy.

---

## Backend Variables (`backend/.env`)

| Variable | Purpose | Local | Development | Production | Example / Format |
|---|---|---|---|---|---|
| `DB_HOST` | Database server hostname | `localhost` | Railway MariaDB dev hostname | Railway MariaDB prod hostname | `containers.railway.app` |
| `DB_PORT` | Database server port | `3306` | Railway MariaDB dev port | Railway MariaDB prod port | `3306` |
| `DB_NAME` | Database name | `banned_books_local` | `banned_books_dev` | `banned_books` | — |
| `DB_USER` | Database username | local user | dev DB user | prod DB user | `root` |
| `DB_PASSWORD` | Database password | local password | dev DB password | prod DB password | (strong password) |
| `PORT` | HTTP port the backend listens on | `3001` | Set by Railway automatically | Set by Railway automatically | `3001` |
| `FRONTEND_URL` | Frontend hostname for CORS (no protocol) | `localhost:5173` | Railway dev frontend domain | Railway prod frontend domain | `my-app.up.railway.app` |
| `URL_PREFIX` | Protocol for constructing CORS origin | `http` | `https` | `https` | `http` or `https` |
| `RAILWAY_PUBLIC_DOMAIN` | Railway-assigned backend public domain (no protocol) | `localhost:3001` | Railway dev backend domain | Railway prod backend domain | `my-api.up.railway.app` |
| `ADMIN_USERNAME` | Admin panel login username | any local username | unique dev admin username | unique prod admin username | `admin` |
| `ADMIN_PASSWORD` | Admin panel login password | any local password | strong unique password | strong unique password | (min 12 chars) |
| `JWT_SECRET` | Secret for signing and verifying JWTs — **MUST be unique per environment** | any 32+ char string | random 32+ char string | random 32+ char string | output of `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `SESSION_SECRET` | Session signing secret (carry-forward — verify if actively used) | any string | any string | any string | same generation as JWT_SECRET |
| `MINIO_URL` | Full URL to the MinIO bucket endpoint — used by `utils/config.ts` to build the single shared MinIO client (protocol required) | dev bucket URL | `https://bucket-development-d7ab.up.railway.app` | `https://bucket-production-70f9.up.railway.app` | `https://bucket-development-d7ab.up.railway.app` |
| `MINIO_BUCKET_NAME` | Name of the S3 bucket within the MinIO service — used by `minioCache.ts`. Optional, defaults to `book-images` | `book-images` | `book-images` | `book-images` | `book-images` |
| `MINIO_ACCESS_KEY` | MinIO access key credential — used by both `utils/config.ts` and `minioCache.ts` | dev bucket key | dev bucket key | prod bucket key | (from MinIO service) |
| `MINIO_SECRET_KEY` | MinIO secret key credential — used by both `utils/config.ts` and `minioCache.ts` | dev bucket key | dev bucket key | prod bucket key | (from MinIO service) |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` | Railway Redis dev URL | Railway Redis prod URL | `redis://default:password@host:6379` |

### Notes

- **`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`**: On Railway, copy these from the MariaDB service's Variables tab — Railway auto-generates them when a database service is added.
- **`PORT`**: Railway injects this automatically. Do not hardcode it in Railway environment variables.
- **`FRONTEND_URL`** and **`RAILWAY_PUBLIC_DOMAIN`**: These are Railway domain strings without `https://`. Railway assigns them when a service is created.
- **`JWT_SECRET`**: Using the same secret across environments means a dev-issued JWT would be accepted by production. Always use a different value per environment.
- **`MINIO_URL`**: The backend's `config.ts` parses this as a full URL and builds the single shared MinIO client used by both `imageRouter.ts` and `minioCache.ts`. It must include the protocol (`https://`). On Railway, reference the Bucket service's private endpoint (e.g. `${{Bucket.MINIO_PRIVATE_ENDPOINT}}`) rather than hardcoding a public URL. If unset, the backend crashes at startup — `parseMinioUrl()` throws immediately on import.
- **`REDIS_URL`**: On Railway, copy from the Redis service's Variables tab.

---

## Frontend Variables (`frontend/.env`)

| Variable | Purpose | Local | Development | Production | Example / Format |
|---|---|---|---|---|---|
| `VITE_API_URL` | Backend hostname WITHOUT protocol — Vite prepends the protocol from `VITE_URL_PREFIX` | `localhost:3001` | Railway dev backend domain (no `https://`) | Railway prod backend domain (no `https://`) | `my-api.up.railway.app` |
| `VITE_URL_PREFIX` | Protocol for API requests | `http` | `https` | `https` | `http` or `https` |

### Notes

- **`HTTPS`**: Appears in the current `frontend/.env` as a Vite dev-server option. Not a runtime application variable and not needed in Railway deployments (TLS is handled by Railway's proxy).
- Frontend environment variables must be prefixed `VITE_` to be exposed to browser code. Variables without this prefix are not accessible in the built bundle.

### Reserved (not yet wired into code)

The frontend service in Railway also carries a set of `GA4_*` variables (`GA4_TYPE`, `GA4_PROJECT_ID`, `GA4_PRIVATE_KEY`, `GA4_CLIENT_EMAIL`, `GA4_CLIENT_ID`, `GA4_AUTH_URI`, `GA4_TOKEN_URI`, `GA4_AUTH_PROVIDER_X509_CERT_URL`, `GA4_CLIENT_X509_CERT_URL`, `GA4_UNIVERSE_DOMAIN`, `GA4_PRIVATE_KEY_ID`) — a Google service-account credential set for the GA4 **Data API** (server-side reporting). These are not consumed anywhere in the current codebase; the existing pageview tracking (`App.tsx`) uses `react-ga4` with a hardcoded measurement ID and doesn't need them. They're reserved for a future GA4 reporting feature. Since they're not `VITE_`-prefixed they aren't bundled into client code, but a service-account private key is an unusual thing to store on the frontend service — consider moving it to the backend service (or a dedicated reporting service) when that feature is actually built.

---

## Environment Isolation Summary

| Resource | Local | Development | Production |
|---|---|---|---|
| Database | Local MariaDB instance | Railway MariaDB (dev service) | Railway MariaDB (prod service) |
| Object storage | Dev MinIO bucket (`bucket-development-d7ab`) | Dev MinIO bucket (`bucket-development-d7ab`) | Prod MinIO bucket (`bucket-production-70f9`) |
| Redis cache | Local Redis | Railway Redis (dev service) | Railway Redis (prod service) |
| JWT signing key | Unique local value | Unique dev value | Unique prod value |

No credentials are shared between development and production. A token signed with the dev `JWT_SECRET` is rejected by the production backend.

---

## Adding a New Variable

When you add a new environment variable to the codebase:

1. Add the variable name and a comment to `backend/.env.example` (or `frontend/.env.example`)
2. Add a row to the appropriate table in this file (`docs/env-vars.md`)
3. Set the variable in the Railway `development` environment before merging the code to `development`
4. Set the variable in the Railway `production` environment before merging to `main`
5. Update `CLAUDE.md` Environment Variables section if the variable is part of the backend/frontend `.env` block documented there
