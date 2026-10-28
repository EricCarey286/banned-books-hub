# Environment Variable Reference

> **This is the single source of truth for all environment variables used by Banned Books Hub.**
> When you add a new variable to the codebase, you MUST update this file AND configure the variable in Railway before merging to `development`. See `docs/workflow.md` for the full policy.

**Startup check:** the backend refuses to start if any required variable is missing or invalid. The error names each problem. Required backend variables are marked **Required** below.

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
| `FRONTEND_URL` | **Required.** Frontend hostname for CORS (no protocol) | `localhost:5173` | `dev.bannedbookshub.com` | `www.bannedbookshub.com` | `www.bannedbookshub.com` |
| `URL_PREFIX` | **Required.** Protocol for constructing the CORS origin | `http` | `https` | `https` | `http` or `https` |
| `RAILWAY_PUBLIC_DOMAIN` | Railway-assigned backend public domain (no protocol) | `localhost:3001` | Railway dev backend domain | Railway prod backend domain | `my-api.up.railway.app` |
| `ADMIN_USERNAME` | **Required.** Admin panel login username | any local username | unique dev admin username | unique prod admin username | `admin` |
| `ADMIN_PASSWORD_HASH` | **Required.** bcrypt hash of the admin password. The plain password is never stored. | hash of a local password | hash of a strong unique password | hash of a strong unique password | starts with `$2b$12$` (generate with `npm run hash-password`) |
| `JWT_SECRET` | **Required.** Secret for signing admin session tokens — **at least 32 characters, unique per environment** | random 32+ char string | random 32+ char string | random 32+ char string | output of `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `TURNSTILE_SECRET_KEY` | **Required.** Cloudflare Turnstile secret for the suggest and contact forms. Server-only. | Cloudflare test secret `1x0000000000000000000000000000000AA` | dev widget secret | prod widget secret | (from the Turnstile widget) |
| `MINIO_URL` | **Required.** Full URL to the MinIO endpoint (protocol required). Builds the single shared MinIO client. | dev bucket URL | `https://bucket-development-d7ab.up.railway.app` | `https://bucket-production-70f9.up.railway.app` | `https://bucket-development-d7ab.up.railway.app` |
| `MINIO_BUCKET_NAME` | **Required.** Bucket that holds the book cover images. Uploads and image links both use it. | the bucket that holds your images | the dev bucket that holds images | the prod bucket that holds images | `book-images` |
| `MINIO_ACCESS_KEY` | **Required.** MinIO access key credential | local key | dev bucket key | prod bucket key | (from MinIO service) |
| `MINIO_SECRET_KEY` | **Required.** MinIO secret key credential | local key | dev bucket key | prod bucket key | (from MinIO service) |
| `NODE_ENV` | Set to `development` to include error detail in API responses. Leave unset elsewhere. Full detail is always in the server log. | `development` | unset | unset | `development` |
| `REDIS_URL` | Redis connection URL (cache and shared rate-limit counters) | `redis://localhost:6379` | Railway Redis dev URL | Railway Redis prod URL | `redis://default:password@host:6379` |

### Notes

- **`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`**: On Railway, copy these from the MariaDB service's Variables tab — Railway auto-generates them when a database service is added.
- **`PORT`**: Railway injects this automatically. Do not hardcode it in Railway environment variables.
- **`FRONTEND_URL`**: The frontend's hostname without `https://`. Enter the literal custom domain (for example `www.bannedbookshub.com`), not a Railway reference, so the backend does not depend on the frontend service's generated domain.
- **`ADMIN_PASSWORD_HASH`**: Create it with `npm run hash-password` (run in `backend/`). The script hides input at the prompt, or accepts the password on stdin: `printf '%s' "$PASSWORD" | npm run hash-password`. Passwords must be at least 12 characters. The old `ADMIN_PASSWORD` variable is no longer read; delete it from Railway after the switch.
- **`JWT_SECRET`**: Must be at least 32 characters. Using the same secret across environments means a dev-issued session would be accepted by production. Always use a different value per environment.
- **`TURNSTILE_SECRET_KEY`**: Create the widget in the Cloudflare dashboard (Turnstile) and add the frontend hostnames. Local development can use Cloudflare's published test secret, which always passes.
- **`MINIO_URL`**: Parsed into the single MinIO client in `utils/config.ts`. Must include the protocol. Missing or invalid values stop the backend at startup.
- **`MINIO_BUCKET_NAME`**: Required. Before release, confirm the value in each Railway environment matches the bucket that actually holds the cover images (see the release checklist in `specs/005-security-remediation/tasks.md`, T078).
- **`REDIS_URL`**: On Railway, copy from the Redis service's Variables tab. Login and submission limits depend on Redis; if it is unavailable those limits are skipped and the global rate limit still applies.

---

## Frontend Variables (`frontend/.env`)

| Variable | Purpose | Local | Development | Production | Example / Format |
|---|---|---|---|---|---|
| `VITE_API_URL` | **Required.** Backend hostname WITHOUT protocol — Vite prepends the protocol from `VITE_URL_PREFIX` | `localhost:3001` | `api-dev.bannedbookshub.com` | `api.bannedbookshub.com` | `api.bannedbookshub.com` |
| `VITE_URL_PREFIX` | **Required.** Protocol for API requests | `http` | `https` | `https` | `http` or `https` |
| `VITE_TURNSTILE_SITE_KEY` | **Required for the suggest and contact forms.** Cloudflare Turnstile **public** site key | Cloudflare test site key `1x00000000000000000000AA` | dev widget site key | prod widget site key | (from the Turnstile widget) |

### Notes

- **Build-time values.** `VITE_` variables are copied into the JavaScript bundle when it is built. Changing one in Railway requires a redeploy of the frontend.
- **Frontend and API must be on the same domain** (for example `www.` and `api.` under `bannedbookshub.com`). The admin session cookie is same-site only, so it will not be sent across unrelated domains.
- Frontend environment variables must be prefixed `VITE_` to be exposed to browser code. Variables without this prefix are not accessible in the built bundle.
- The Turnstile site key is public and may appear in the bundle. The Turnstile **secret** key must never be given a `VITE_` prefix.

### Reserved (not yet wired into code)

The frontend service in Railway also carries a set of `GA4_*` variables (`GA4_TYPE`, `GA4_PROJECT_ID`, `GA4_PRIVATE_KEY`, `GA4_CLIENT_EMAIL`, `GA4_CLIENT_ID`, `GA4_AUTH_URI`, `GA4_TOKEN_URI`, `GA4_AUTH_PROVIDER_X509_CERT_URL`, `GA4_CLIENT_X509_CERT_URL`, `GA4_UNIVERSE_DOMAIN`, `GA4_PRIVATE_KEY_ID`) — a Google service-account credential set for the GA4 **Data API** (server-side reporting). These are not consumed anywhere in the current codebase; the existing pageview tracking (`App.tsx`) uses `react-ga4` with a hardcoded measurement ID and doesn't need them. They're reserved for a future GA4 reporting feature. Since they're not `VITE_`-prefixed they aren't bundled into client code, but a service-account private key is an unusual thing to store on the frontend service — consider moving it to the backend service (or a dedicated reporting service) when that feature is actually built.

---

## Removed Variables

These were used before the security remediation and are no longer read. Delete them from Railway after the new code is deployed.

| Variable | Replaced by |
|---|---|
| `ADMIN_PASSWORD` | `ADMIN_PASSWORD_HASH` |
| `SESSION_SECRET` | Not needed (sessions use a signed JWT in a cookie; no session store) |
| `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL` | `MINIO_URL` |

---

## Environment Isolation Summary

| Resource | Local | Development | Production |
|---|---|---|---|
| Frontend host | `localhost:5173` | `dev.bannedbookshub.com` | `www.bannedbookshub.com` |
| API host | `localhost:3001` | `api-dev.bannedbookshub.com` | `api.bannedbookshub.com` |
| Database | Local MariaDB instance | Railway MariaDB (dev service) | Railway MariaDB (prod service) |
| Object storage | Dev MinIO bucket (`bucket-development-d7ab`) | Dev MinIO bucket (`bucket-development-d7ab`) | Prod MinIO bucket (`bucket-production-70f9`) |
| Redis cache and limits | Local Redis | Railway Redis (dev service) | Railway Redis (prod service) |
| Session signing key (`JWT_SECRET`) | Unique local value | Unique dev value | Unique prod value |
| Admin password hash | Local hash | Dev hash | Prod hash |
| Turnstile widget | Test keys | Dev widget (hostname `dev.bannedbookshub.com`) | Prod widget (hostname `www.bannedbookshub.com`) |

No credentials are shared between development and production. A session token signed with the dev `JWT_SECRET` is rejected by the production backend.

---

## Adding a New Variable

When you add a new environment variable to the codebase:

1. Add the variable name and a comment to `backend/.env.example` (or `frontend/.env.example`)
2. Add a row to the appropriate table in this file (`docs/env-vars.md`)
3. Set the variable in the Railway `development` environment before merging the code to `development`
4. Set the variable in the Railway `production` environment before merging to `main`
5. Update `CLAUDE.md` Environment Variables section if the variable is part of the backend/frontend `.env` block documented there
6. If the variable is required, add it to the startup check in `backend/src/utils/env.ts`
