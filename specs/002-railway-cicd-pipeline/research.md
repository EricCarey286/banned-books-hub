# Research: Railway CI/CD Pipeline & GitHub Integration

## Decision 1: Railway Deployment Model

**Decision**: Use a single Railway project with two named environments — `development` and `production`.

**Rationale**: Railway's environments feature is purpose-built for this pattern. Each environment holds its own set of services, environment variables, and deployments. The GitHub integration is configured per environment: `development` environment auto-deploys from the `development` branch; `production` environment auto-deploys from `main`. This gives environment-level isolation without the overhead of managing two separate Railway projects.

**Alternatives considered**: Two separate Railway projects (one dev, one prod). Rejected because it doubles the project management surface and does not provide additional isolation — Railway environments already fully isolate services, volumes, and secrets.

---

## Decision 2: Service Architecture Per Environment

**Decision**: Each environment runs two Railway services — one backend (Node.js) and one frontend (static site). Both environments also need a MariaDB database service and a Redis service.

**Rationale**: The codebase is split into `frontend/` and `backend/` with independent build processes. Railway can host both. The backend reads `REDIS_URL` via `cache.ts` and the health route reports Redis connectivity — Redis is a live dependency, not optional. The existing `.env` confirms `REDIS_URL` is already in use.

**Alternatives considered**: Serve the built frontend from the Express backend (`express.static`). App.ts already has `app.use(express.static('dist', ...))` suggesting this may be the current approach. This remains a valid option that simplifies the Railway service count to one service per environment (backend serves frontend build). Decision on whether to keep one service or split into two is implementation detail — the spec only requires both environments work; either architecture satisfies it.

---

## Decision 3: Branch Protection Rules

**Decision**: Apply GitHub branch protection to both `development` and `main`:
- `main`: require a pull request, require all checks to pass (CodeQL), no direct push
- `development`: require a pull request from feature branches, allow direct push from maintainer for hotfixes

**Rationale**: The spec defines a three-tier branching model. Without protection rules, developers can accidentally push directly to `development` or `main` and bypass the intended promotion flow. The existing CodeQL workflow already targets `main` PRs — extending it to `development` PRs adds security scanning to the staging gate.

**Alternatives considered**: No branch protection (honor system). Rejected — accidental pushes will happen, especially under time pressure. Protection rules are free and zero-maintenance once configured.

---

## Decision 4: Database Isolation

**Decision**: Provision a separate MariaDB database service inside the Railway `development` environment. The `production` environment continues using its existing database. Neither environment's database credentials appear in the other environment's Railway variables.

**Rationale**: FR-004 and FR-005 require full database isolation. Railway's per-environment variable scoping enforces this by design — a variable set in `development` is not visible in `production` and vice versa.

**Alternatives considered**: Shared database with separate schemas. Rejected — a shared host means a connection string leak or a runaway migration in dev can affect the prod schema. Separate services is the safest model.

---

## Decision 5: Redis Isolation

**Decision**: Each Railway environment has its own Redis service. The `REDIS_URL` variable in each environment points to that environment's Redis instance.

**Rationale**: `cache.ts` uses Redis for book-list caching. If dev and prod shared a Redis instance, a `FLUSHALL` in dev or schema-incompatible cached data from a dev code change could corrupt the prod cache. Separate instances eliminate this risk.

**Alternatives considered**: Shared Redis with key-prefix namespacing (e.g., `dev:books` vs `prod:books`). Rejected — namespacing is a convention, not a hard boundary. A bug that ignores the prefix would silently pollute the other environment's data.

---

## Decision 6: Object Storage Isolation

**Decision**: Already resolved. Separate MinIO buckets exist:
- Development: `bucket-development-d7ab.up.railway.app`
- Production: `bucket-production-70f9.up.railway.app`

Each environment's `MINIO_URL` must point to its own bucket. `MINIO_ACCESS_KEY` and `MINIO_SECRET_KEY` may be the same credentials if MinIO is configured with one set of keys — or separate credentials if the bucket services were created independently. This is a configuration detail to confirm when setting up Railway environment variables.

---

## Decision 7: Documentation Structure

**Decision**: Create a `docs/` directory in the repository root with four files:
- `docs/local-setup.md` — step-by-step guide to run the app locally from a fresh clone
- `docs/railway-setup.md` — how to configure Railway environments and services
- `docs/env-vars.md` — complete environment variable reference (all vars, all envs, purpose + example)
- `docs/workflow.md` — branching workflow, merge policy, and environment promotion checklist

Additionally create `backend/.env.example` and `frontend/.env.example` as machine-readable templates for local setup.

**Rationale**: Keeps documentation close to the code, version-controlled, and discoverable without an external wiki. The four-file split separates concerns: local setup vs. cloud setup vs. variable reference vs. workflow process. Each file can be read independently.

**Alternatives considered**: Single `SETUP.md` in the root. Rejected — a single file would be too long and mix infrastructure setup with workflow guidance, making it harder to link to specific sections.

---

## Decision 8: CodeQL Workflow Update

**Decision**: Update `.github/workflows/codeql.yml` to also run on pull requests targeting `development`, in addition to `main`.

**Rationale**: The spec's branching model means all feature work passes through `development` before reaching `main`. Adding CodeQL to the `development` PR gate catches security issues before they land in staging, not just before they reach production.

**Alternatives considered**: Leave CodeQL only on `main` PRs. Acceptable fallback if the team finds development-branch analysis too slow; document the trade-off in `docs/workflow.md`.

---

## Decision 9: Local MinIO for Development

**Decision**: For local development, developers connect to the Railway development MinIO bucket (`bucket-development-d7ab.up.railway.app`) rather than running a local MinIO instance.

**Rationale**: Running a local MinIO adds setup friction (Docker required, port conflicts, data seeding). Since the development bucket is live, shared use for local dev is acceptable — images uploaded during local dev appear in the dev bucket, which is expected behavior. This is documented in `docs/local-setup.md` with a note that local uploads go to the shared development bucket.

**Alternatives considered**: Require a local MinIO via Docker Compose. Cleaner isolation but significantly increases local setup complexity. Out of scope per spec (SC-001 requires 15-minute setup time).
