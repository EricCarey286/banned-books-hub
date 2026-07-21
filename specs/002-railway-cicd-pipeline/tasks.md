# Tasks: Railway CI/CD Pipeline & GitHub Integration

**Input**: Design documents from `specs/002-railway-cicd-pipeline/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: No automated test suite exists — validation follows `quickstart.md` checklists manually.

**Organization**: Tasks grouped by user story for independent implementation and testing.

**Labels**:
- `[P]` — parallelizable (different files, no incomplete dependencies)
- `[US#]` — maps to user story from spec.md
- `[HUMAN]` — requires action in Railway or GitHub UI, not in code/files

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Repository scaffolding and CI pipeline update before story work begins

- [x] T001 Create `docs/` directory at repository root (`mkdir -p docs` — directory only, no files yet)
- [x] T002 Update `.github/workflows/codeql.yml` to add `development` to the `pull_request.branches` list so CodeQL runs on PRs targeting `development` in addition to `main`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: `.env.example` template files are required by both the local-setup guide (US1) and the environment variable reference (US4). Both must exist before either story can be completed.

**⚠️ CRITICAL**: US1 and US4 cannot be completed until this phase is done.

- [x] T003 [P] Create `backend/.env.example` with all backend environment variable names, inline comments explaining each variable's purpose and expected format, and blank or safe placeholder values (never real credentials). Reference `data-model.md` Backend Environment Variables table for the full variable list.
- [x] T004 [P] Create `frontend/.env.example` with all frontend environment variable names, inline comments, and blank or safe placeholder values. Reference `data-model.md` Frontend Environment Variables table.

**Checkpoint**: Both `.env.example` files committed — US1 and US4 work can begin.

---

## Phase 3: User Story 1 - Local Feature Development (Priority: P1) 🎯 MVP

**Goal**: Any developer can clone the repository and get both frontend and backend running locally by following a single documented guide.

**Independent Test**: Follow `docs/local-setup.md` from a fresh clone. Both `npm run dev` commands start without errors, the homepage loads, the health endpoint returns `{"status":"healthy","cache":{"connected":true}}`, and admin login succeeds.

- [x] T005 [US1] Create `docs/local-setup.md` covering: prerequisites (Node.js 18+, local MariaDB, local Redis), clone + checkout steps, copying `.env.example` → `.env` with instructions for each variable, `npm install` + `npm run dev` for both `backend/` and `frontend/`, and the Tier 1 validation checklist from `quickstart.md`

**Checkpoint**: A developer following `docs/local-setup.md` can fully run the app locally. US1 is independently testable and deliverable at this point.

---

## Phase 4: User Story 4 - Environment Variable Documentation (Priority: P2)

**Goal**: Every environment variable is documented in one place — purpose, which environments require it, and a safe example — so no developer ever needs to read source code to configure an environment.

**Independent Test**: Cross-reference `docs/env-vars.md` against `backend/src/utils/config.ts`, `backend/src/app.ts`, and `frontend/src/` env usage. Every variable found in source must appear in the doc with a non-empty purpose and example.

- [x] T006 [P] [US4] Create `docs/env-vars.md` as the canonical environment variable reference — derive from `data-model.md`, written in prose-friendly table form for a human audience. Include: variable name, purpose, which environments require it (local / dev / prod), and a safe example value or format. Add a note at the top stating this is the single source of truth and must be updated whenever a new variable is added.
- [x] T007 [P] [US4] Create `docs/workflow.md` covering: the three-tier branching model (`feature/*` → `development` → `main`), merge policy (PRs required, checklist must pass before promoting), environment promotion checklist (pass quickstart.md Tier N before merging to Tier N+1), hotfix procedure for emergency `main` patches, and the rule that any new env var must be added to `docs/env-vars.md` and Railway before merging to `development`
- [x] T008 [US4] Update `CLAUDE.md` Environment Variables section to add a one-line cross-reference pointing to `docs/env-vars.md` as the canonical variable reference (keep existing variable list in CLAUDE.md intact — the cross-reference is additive)

**Checkpoint**: `docs/env-vars.md` and `docs/workflow.md` complete. US4 is independently testable. Railway setup documentation (US2/US3) can now be written referencing these files.

---

## Phase 5: User Story 2 - Development Environment Deployment (Priority: P2)

**Goal**: Merging to `development` automatically deploys the Railway development environment. A developer can verify the deployed change against the development database and MinIO bucket without any manual steps.

**Independent Test**: Merge a trivial change to `development`. Railway dashboard shows a new deployment within 1 minute; deployment completes within 10 minutes; development URL loads the app; `GET /health` returns healthy with Redis connected; development MinIO bucket receives image uploads.

- [x] T009 [US2] Create `docs/railway-setup.md` — Development Environment section. Cover: creating the `development` environment in Railway, linking GitHub integration to the `development` branch for auto-deploy, adding four services (backend Node.js, frontend static/Node.js, MariaDB, Redis), and setting all development environment variables from `docs/env-vars.md`. Include screenshots-style step-by-step instructions clear enough to follow without prior Railway experience.
- [x] T010 [US2] [HUMAN] In the Railway dashboard: create the `development` environment, connect the GitHub repository, and configure auto-deploy from the `development` branch
- [x] T011 [US2] [HUMAN] In the Railway `development` environment: add backend service, frontend service, MariaDB service, and Redis service. Note the MariaDB and Redis connection URLs generated by Railway — these are the values for `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/`DB_PASSWORD` and `REDIS_URL` respectively.
- [x] T012 [US2] [HUMAN] Set all environment variables in the Railway `development` environment following the Development column in `data-model.md`. Set `MINIO_URL=https://bucket-development-d7ab.up.railway.app`. Confirm `JWT_SECRET` is a unique random string (min 32 chars), not shared with production.
- [x] T013 [US2] [HUMAN] In GitHub repository Settings → Branches: add a branch protection rule for `development` requiring pull requests before merging (no direct push from collaborators; maintainer override acceptable)
- [x] T014 [US2] [HUMAN] Trigger a test deployment: push a trivial commit to `development` and verify all Tier 2 checklist items in `quickstart.md` pass

**Checkpoint**: Railway development environment live and auto-deploying. US2 independently verified via quickstart.md Tier 2.

---

## Phase 6: User Story 3 - Production Deployment (Priority: P3)

**Goal**: Merging `development` into `main` automatically deploys the Railway production environment. The production URL serves live data from the production database and production MinIO bucket without any manual steps.

**Independent Test**: Merge `development` to `main`. Railway production deployment completes within 10 minutes; production URL loads; `GET /health` returns healthy; image uploads go to `bucket-production-70f9.up.railway.app`; development environment is unaffected.

- [x] T015 [US3] Extend `docs/railway-setup.md` with a Production Environment section covering: creating the `production` environment in Railway, linking to the `main` branch, adding the same four services as development (backend, frontend, MariaDB, Redis), and setting all production environment variables including `MINIO_URL=https://bucket-production-70f9.up.railway.app`. Add a callout noting which variables differ from development (DB credentials, `MINIO_URL`, `JWT_SECRET`, `ADMIN_PASSWORD`, `FRONTEND_URL`, `RAILWAY_PUBLIC_DOMAIN`).
- [x] T016 [US3] [HUMAN] In the Railway dashboard: create the `production` environment linked to `main`, add four services (backend, frontend, MariaDB, Redis), set all production environment variables. Confirm production `DB_HOST` differs from development `DB_HOST`. Confirm `MINIO_URL` is `https://bucket-production-70f9.up.railway.app`.
- [x] T017 [US3] [HUMAN] In GitHub repository Settings → Branches: add a branch protection rule for `main` requiring pull requests, requiring all status checks to pass (CodeQL), and disabling direct pushes
- [x] T018 [US3] [HUMAN] Trigger a test production deployment: open a PR from `development` to `main`, merge it, and verify all Tier 3 checklist items in `quickstart.md` pass. Confirm the development environment remains unaffected.

**Checkpoint**: Both Railway environments live and auto-deploying independently. Full three-tier pipeline verified.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup, cross-referencing, and complete pipeline validation

- [x] T019 [P] Update `CLAUDE.md` Deployment section to describe the three-tier branching model and link to `docs/workflow.md` for the full promotion checklist
- [x] T020 [P] Add a `## Documentation` section to the repository root `README.md` (or create it if absent) listing and linking the four new docs: `local-setup.md`, `railway-setup.md`, `env-vars.md`, `workflow.md`
- [x] T021 Run the complete `quickstart.md` validation — all three tiers — to confirm the full pipeline works end-to-end after all configuration is in place
- [x] T022 Audit `docs/env-vars.md` against source code: grep `process.env` in `backend/src/` and `import.meta.env` in `frontend/src/` to confirm every variable found in source appears in the documentation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — blocks US1 and US4
- **US1 (Phase 3)**: Depends on Phase 2 (`.env.example` files) — no story dependencies
- **US4 (Phase 4)**: Depends on Phase 2 — no story dependencies; can run in parallel with US1
- **US2 (Phase 5)**: Depends on US4 completion (`docs/env-vars.md` must exist before Railway setup guide can reference it)
- **US3 (Phase 6)**: Depends on US2 completion (dev environment must be verified before prod setup begins)
- **Polish (Phase 7)**: Depends on US3 completion

### User Story Dependencies

- **US1 (P1)**: After Foundational — no story dependencies
- **US4 (P2)**: After Foundational — no story dependencies; parallel with US1
- **US2 (P2)**: After US4 — `docs/env-vars.md` must exist before `docs/railway-setup.md` can reference it
- **US3 (P3)**: After US2 — dev environment must pass Tier 2 validation before production setup begins

### Within Each Phase

- [P]-marked tasks in the same phase operate on different files and can be done simultaneously
- [HUMAN] tasks in US2 and US3 must follow the order listed (environment → services → variables → branch protection → validate)
- Documentation tasks (T005, T006, T007) can be written ahead of Railway configuration tasks

### Parallel Opportunities

- T003 and T004 (both `[P]`) can be written simultaneously
- T006, T007 (both `[P]` in US4) can be written simultaneously
- T009 documentation and T010–T013 Railway configuration can be interleaved: draft the guide section, then execute the configuration step it describes
- T019 and T020 (Polish phase `[P]`) can be done simultaneously

---

## Parallel Example: US4 (Environment Documentation)

```
# Both can be written simultaneously (different files):
Task T006: Create docs/env-vars.md
Task T007: Create docs/workflow.md

# Then sequentially:
Task T008: Update CLAUDE.md cross-reference (depends on env-vars.md existing)
```

---

## Implementation Strategy

### MVP First (US1 Only — Local Setup Working)

1. Complete Phase 1: Setup (T001, T002)
2. Complete Phase 2: Foundational (T003, T004)
3. Complete Phase 3: US1 (T005)
4. **STOP and VALIDATE**: Follow `docs/local-setup.md` from a clean clone; confirm Tier 1 checklist passes
5. Commit — local development is documented and verified

### Incremental Delivery

1. Setup + Foundational → `.env.example` files committed
2. US1 → Local setup guide complete → Tier 1 validated
3. US4 → Env var reference + workflow guide complete → Cross-reference verified
4. US2 → Railway dev environment live → Tier 2 validated → Auto-deploy confirmed
5. US3 → Railway prod environment live → Tier 3 validated → Full pipeline working
6. Polish → Documentation cross-linked, full end-to-end audit complete

---

## Notes

- `[P]` = different files, no incomplete dependencies — safe to work in parallel
- `[HUMAN]` = must be executed in the Railway or GitHub web UI, not in code
- Documentation tasks (T005–T009, T015, T019, T020) are LLM-executable
- Configuration tasks (T010–T014, T016–T018) require a human with Railway/GitHub admin access
- Never commit real credentials — `.env.example` files use only placeholder values
- After completing T014 (Tier 2 validation), confirm `data-model.md` Development column matches what is actually configured in Railway before proceeding to US3
