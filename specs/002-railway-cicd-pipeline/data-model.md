# Environment Configuration Model

This document defines every environment variable used by the application and its expected value in each environment (local, development, production).

---

## Backend Environment Variables

| Variable | Purpose | Local | Development (Railway) | Production (Railway) |
|---|---|---|---|---|
| `DB_HOST` | Database server hostname | `localhost` | Railway MariaDB dev service hostname | Railway MariaDB prod service hostname |
| `DB_PORT` | Database server port | `3306` | Railway MariaDB dev service port | Railway MariaDB prod service port |
| `DB_NAME` | Database name | `banned_books_local` | `banned_books_dev` | `banned_books` |
| `DB_USER` | Database username | local DB user | dev DB user | prod DB user |
| `DB_PASSWORD` | Database password | local DB password | dev DB password | prod DB password |
| `PORT` | HTTP port the backend listens on | `3001` | Railway sets automatically | Railway sets automatically |
| `FRONTEND_URL` | Frontend hostname used for CORS allow-list (no protocol) | `localhost:5173` | Railway dev frontend domain (no `https://`) | Railway prod frontend domain (no `https://`) |
| `URL_PREFIX` | Protocol for constructing CORS origin (`http` or `https`) | `http` | `https` | `https` |
| `RAILWAY_PUBLIC_DOMAIN` | Railway-assigned public domain for the backend service | `localhost:3001` | Railway dev backend domain | Railway prod backend domain |
| `ADMIN_USERNAME` | Admin panel login username | `admin` (local only) | unique dev admin username | unique prod admin username |
| `ADMIN_PASSWORD` | Admin panel login password | strong local password | strong dev password | strong prod password |
| `JWT_SECRET` | Secret used to sign and verify JWT tokens — must be long, random, unique per environment | any local secret (min 32 chars) | unique random string (min 32 chars) | unique random string (min 32 chars) |
| `MINIO_URL` | Full URL to the MinIO bucket endpoint (protocol included) | `https://bucket-development-d7ab.up.railway.app` | `https://bucket-development-d7ab.up.railway.app` | `https://bucket-production-70f9.up.railway.app` |
| `MINIO_ACCESS_KEY` | MinIO access key credential | dev bucket access key | dev bucket access key | prod bucket access key |
| `MINIO_SECRET_KEY` | MinIO secret key credential | dev bucket secret key | dev bucket secret key | prod bucket secret key |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` | Railway Redis dev service URL | Railway Redis prod service URL |

> **Note on `SESSION_SECRET`**: Present in the current `.env` but not consumed by any code path identified in the source. Carry it forward for now; remove once confirmed unused.

---

## Frontend Environment Variables

| Variable | Purpose | Local | Development (Railway) | Production (Railway) |
|---|---|---|---|---|
| `VITE_API_URL` | Backend hostname without protocol, used by the frontend to construct API requests | `localhost:3001` | Railway dev backend domain (no `https://`) | Railway prod backend domain (no `https://`) |
| `VITE_URL_PREFIX` | Protocol for API requests (`http` or `https`) | `http` | `https` | `https` |

> **Note on `HTTPS`**: Appears in the current `frontend/.env` but is a Vite dev server option, not a runtime application variable. Not needed in Railway deployments where TLS is handled by the proxy.

---

## Environment Summary

| Attribute | Local | Development | Production |
|---|---|---|---|
| Branch | `feature/*` (any) | `development` | `main` |
| Auto-deploy trigger | Manual (`npm run dev`) | Push/merge to `development` | Push/merge to `main` |
| Database | Local MariaDB/MySQL | Railway MariaDB (dev) | Railway MariaDB (prod) |
| Object storage | Dev MinIO bucket | Dev MinIO bucket | Prod MinIO bucket |
| Redis cache | Local Redis | Railway Redis (dev) | Railway Redis (prod) |
| URL pattern | `http://localhost:PORT` | `https://*.up.railway.app` | `https://*.up.railway.app` |
| Data risk | None — isolated local DB | Low — dev data only | **High — live data** |

---

## Isolation Guarantees

- Database credentials are unique per environment. The `DB_HOST` values are different services; no cross-environment database access is possible via Railway's networking.
- `MINIO_URL` differs between development and production, routing uploads to separate buckets.
- `JWT_SECRET` must be unique per environment. A token signed with the dev secret is rejected by the production service.
- `REDIS_URL` points to separate Redis instances. No shared cache keys between environments.
