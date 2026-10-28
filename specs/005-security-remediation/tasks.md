# Tasks: Security Remediation

**Input**: Design documents from `/specs/005-security-remediation/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/http-api.md, quickstart.md

**Tests**: No automated test framework is configured (constitution). Verification is by the scenarios in `quickstart.md`, run as noted in each phase's checkpoint. No test tasks are generated.

**Organization**: Tasks are grouped by user story (priority order from spec.md) so each story can be implemented and verified independently.

**Branch**: `fix_security-remediation`

**Domain**: production frontend `https://www.bannedbookshub.com`, production API `https://api.bannedbookshub.com`, dev frontend `https://dev.bannedbookshub.com`, dev API `https://api-dev.bannedbookshub.com`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: User story label (US1 to US9)
- Paths are relative to the repository root.

---

## Phase 1: Setup

**Purpose**: Shared scaffolding used by later phases.

- [ ] T001 Create `backend/scripts/` directory and `backend/tsconfig` include check so scripts compile under `backend/tsconfig.json`
- [ ] T002 [P] Add `hash-password` npm script to `backend/package.json` pointing at `scripts/hash-admin-password.ts`

---

## Phase 2: Foundational

**Purpose**: Shared pieces that several stories depend on. Blocks all user story work.

**⚠️ CRITICAL**: No user story work begins until this phase is complete.

- [ ] T003 Create `backend/src/utils/env.ts`: validate required settings on import (`JWT_SECRET` ≥ 32 chars, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` bcrypt format, `TURNSTILE_SECRET_KEY`, `MINIO_URL`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET_NAME`, `FRONTEND_URL`, `URL_PREFIX`); on failure print each missing or invalid name and call `process.exit(1)`; export validated values
- [ ] T004 [P] Create `backend/src/services/rateCounter.ts`: `incrementWindow(key, windowSeconds)` (INCR, set EXPIRE on first increment), `getCount(key)`, `resetCount(key)`; use `getCacheClient()` from `backend/src/cache.ts`; if Redis is unavailable return null and log a warning (fail open)
- [ ] T005 Make `backend/src/app.ts` import `./utils/env` as its first project import, directly after `dotenv/config`

**Checkpoint**: Backend starts with all required variables set and exits with a clear message when any is missing.

---

## Phase 3: User Story 1 - Refuse to Run Without a Strong Signing Secret (Priority: P1) 🎯 MVP

**Goal**: The fallback `'missing-key'` secret is gone; the service will not start without a ≥ 32-character `JWT_SECRET`.

**Independent Test**: Quickstart §1.1 to §1.6.

- [ ] T006 [US1] Remove the `JWT_SECRET` fallback from `backend/src/app.ts` (line with `const JWT_SECRET = process.env.JWT_SECRET || 'missing-key'`) and import the validated secret from `backend/src/utils/env.ts`
- [ ] T007 [US1] Replace `const JWT_SECRET = process.env.JWT_SECRET || 'missing-key'` in `backend/src/middleware/auth.ts` with the validated export from `backend/src/utils/env.ts`
- [ ] T008 [US1] Confirm no `missing-key` string remains: `grep -rn "missing-key" backend/src` returns nothing

**Checkpoint**: Quickstart §1 passes.

---

## Phase 4: User Story 2 - Admin Password Stored and Checked as a Hash (Priority: P1)

**Goal**: Login compares against a bcrypt hash in constant time; the plain password is no longer read.

**Independent Test**: Quickstart §2.

- [ ] T009 [US2] Create `backend/scripts/hash-admin-password.ts`: read the password from stdin (no echo, not from argv), hash with `bcryptjs` at cost 12, print the hash only
- [ ] T010 [US2] Create `backend/src/services/adminAuth.ts` with `verifyAdminCredentials(username, password)`: compare username via SHA-256 digests and `crypto.timingSafeEqual`; always run `bcrypt.compare` (against a constant dummy hash when the username does not match); return boolean
- [ ] T011 [US2] Create `backend/src/routes/adminRouter.ts` with `POST /login`: validate body fields (400 if missing), call `verifyAdminCredentials`, return 401 `{ "message": "Invalid credentials" }` on failure; on success respond `{ success, message, csrfToken }` (token issuance wired in US4)
- [ ] T012 [US2] Mount the admin router in `backend/src/app.ts` at `/api/admin` and delete the inline `POST /api/admin/login` handler and its `ADMIN_PASSWORD` comparison
- [ ] T013 [US2] Remove every read of `process.env.ADMIN_PASSWORD` from `backend/src` (confirm with `grep -rn "ADMIN_PASSWORD\b" backend/src`)

**Checkpoint**: Quickstart §2 passes with the correct and wrong passwords.

---

## Phase 5: User Story 3 - Repeated Failed Logins Are Blocked (Priority: P1)

**Goal**: Five failures per IP in 15 minutes block further attempts, including with the correct password.

**Independent Test**: Quickstart §3.

- [ ] T014 [US3] Create `backend/src/middleware/loginLimiter.ts`: before the handler, read `admin:login:fail:<ip>` via `rateCounter`; if count ≥ 5 respond 429 with `Retry-After: 900` and message "Too many failed attempts. Try again later."
- [ ] T015 [US3] In `backend/src/routes/adminRouter.ts`, add the limiter to `POST /login`; increment the failure counter on each failed attempt; delete the counter on success (`resetCount`)
- [ ] T016 [US3] Confirm the login limiter runs before `verifyAdminCredentials` so a blocked address is refused even with the correct password

**Checkpoint**: Quickstart §3.1 to §3.4 pass.

---

## Phase 6: User Story 4 - Admin Session Not Readable by Page Scripts (Priority: P2)

**Goal**: The admin JWT lives in an HTTP-only, Secure, SameSite=Strict cookie; writes need a CSRF token; the frontend no longer stores the token.

**Independent Test**: Quickstart §4 (requires the custom domain, which is now set up).

**Depends on**: US2 (login route), US1 (validated secret).

### Backend

- [ ] T017 [US4] In `backend/src/services/adminAuth.ts`, add `issueSession(username)`: sign JWT with claims `{ username, role: 'admin', jti: crypto.randomUUID() }`, `expiresIn: '24h'`, and return `{ token, csrfToken }`
- [ ] T018 [US4] In `backend/src/services/adminAuth.ts`, add `csrfTokenFor(jti)`: `HMAC-SHA256(JWT_SECRET, "csrf:" + jti)` as hex; add `csrfMatches(jti, provided)` using `timingSafeEqual`
- [ ] T019 [US4] Rewrite `backend/src/middleware/auth.ts` `authenticate`: read token from the `admin_session` cookie (cookie parsing via `cookie-parser` or a small parser), verify with `jsonwebtoken`, set `req.user`; on failure respond 401 and clear the cookie
- [ ] T020 [US4] In `backend/src/middleware/auth.ts`, for non-GET/HEAD/OPTIONS requests require `X-CSRF-Token` matching `csrfTokenFor(req.user.jti)`; respond 403 `{ "message": "Invalid CSRF token" }` on mismatch
- [ ] T021 [US4] In `backend/src/routes/adminRouter.ts`, set the cookie on successful login with `httpOnly: true, secure: true, sameSite: 'strict', maxAge: 86400000, path: '/'` and return `csrfToken` in the body (no `token` in the body)
- [ ] T022 [US4] In `backend/src/routes/adminRouter.ts`, add `POST /logout` (authenticate + CSRF) that clears `admin_session` and returns `{ success: true, message: "Logged out" }`
- [ ] T023 [US4] In `backend/src/routes/adminRouter.ts`, update `GET /validate` to return `{ valid, user, csrfToken }` and clear the cookie on 401
- [ ] T024 [US4] In `backend/src/routes/adminRouter.ts`, keep `GET /api/admin` (protected welcome route) working with the cookie; move it from `app.ts`
- [ ] T025 [US4] Confirm CORS in `backend/src/app.ts` still sets `credentials: true` with the exact frontend origin (no change expected; verify)
- [ ] T026 [US4] Add the `cookie-parser` dependency to `backend/package.json` if T019 uses it, and mount it in `backend/src/app.ts` before routes

### Frontend

- [ ] T027 [US4] Create `frontend/src/utils/api.ts` helper `apiFetch(url, options, csrfToken)`: sets `credentials: "include"`, adds `X-CSRF-Token` on POST, PUT, DELETE; keep existing `API_URL` and `URL_PREFIX` exports
- [ ] T028 [US4] In `frontend/src/App.tsx`, remove every `localStorage` read and write of `authToken` (`getAuthToken`, `getAuthHeaders`, `checkAuth`, `handleLogin`, `handleLogout`, `handleAdminLoginSuccess`); hold `csrfToken` in component state
- [ ] T029 [US4] In `frontend/src/App.tsx`, on load call `GET /api/admin/validate` with `credentials: "include"`; set `isAuthenticated`, `username`, and `csrfToken` from the response; on 401 clear state
- [ ] T030 [US4] In `frontend/src/App.tsx`, on load remove any legacy `localStorage` key `authToken` (FR-017)
- [ ] T031 [US4] In `frontend/src/App.tsx`, rewrite `authFetch` to call `apiFetch` with the current `csrfToken`
- [ ] T032 [US4] In `frontend/src/App.tsx`, implement logout by calling `POST /api/admin/logout` with CSRF, then clearing state and navigating to `/`
- [ ] T033 [US4] Update `frontend/src/components/AdminLogin/AdminLoginModal.tsx`: send `credentials: "include"` on login; the success callback receives `csrfToken` (not a JWT) and no token is stored
- [ ] T034 [P] [US4] Update `frontend/src/components/AdminDashboard/AdminDashboard.tsx` to use `authFetch` without any `Authorization` header
- [ ] T035 [P] [US4] Update `frontend/src/components/AdminBookList/AdminBookList.tsx` to use `authFetch`; remove any `Authorization` header construction
- [ ] T036 [P] [US4] Update `frontend/src/components/AddBookForm/AddBookForm.tsx` so its POST, PUT, and upload requests include credentials and `X-CSRF-Token`
- [ ] T037 [P] [US4] Update `frontend/src/components/AddImageForm/AddImageForm.tsx` upload to include credentials and `X-CSRF-Token`
- [ ] T038 [P] [US4] Update `frontend/src/components/ContactForm/ContactForm.tsx` admin path (if any) to use `authFetch`; remove any `Authorization` header
- [ ] T039 [US4] Confirm `grep -rn "authToken\|Authorization" frontend/src` returns no matches

**Checkpoint**: Quickstart §4.1 to §4.6 pass on `app.`/`api.` hosts (or `dev.`/`api-dev.` in dev).

---

## Phase 7: User Story 5 - Public Submission Forms Resist Spam (Priority: P2)

**Goal**: Suggestions and contact messages require human verification and a per-IP hourly limit; contact accepts exactly one entry; suggestions also accept exactly one entry.

**Independent Test**: Quickstart §5.

**Depends on**: Phase 2 (`rateCounter.ts`).

### Backend

- [ ] T040 [US5] Create `backend/src/services/turnstile.ts`: `verifyTurnstile(token, ip)` posts form data to `https://challenges.cloudflare.com/turnstile/v0/siteverify` with `TURNSTILE_SECRET_KEY`, `response`, `remoteip`; 5-second timeout via `AbortController`; returns `'ok' | 'rejected' | 'unavailable'`
- [ ] T041 [US5] Create `backend/src/middleware/turnstile.ts`: read `X-Turnstile-Token`; missing → 400 "Human verification is required"; `rejected` → 403 "Human verification failed"; `unavailable` → 503 "Verification is temporarily unavailable. Try again later."
- [ ] T042 [US5] Create `backend/src/middleware/submissionLimiter.ts` factory `submissionLimiter(endpointName)`: check `submit:<endpoint>:<ip>` (≥ 10 → 429 "Too many submissions. Try again later."); after a valid request is accepted, increment with a 3600-second window. Increment must happen only after verification passes (research §6).
- [ ] T043 [US5] In `backend/src/routes/contactFormRouter.ts`, add `turnstile` and `submissionLimiter('contact_form')` to `POST /`; require `Array.isArray(body)` and `body.length === 1` (400 "Invalid create: request must contain exactly one entry" otherwise); the non-array case currently returns 500
- [ ] T044 [US5] In `backend/src/routes/suggestedBookRouter.ts`, add `turnstile` and `submissionLimiter('suggested_books')` to `POST /`; require exactly one entry (400 "Invalid create: request must contain exactly one book")
- [ ] T045 [US5] Confirm the increment for `submit:*` happens only after the handler's service call succeeds, so validation failures do not consume the limit

### Frontend

- [ ] T046 [P] [US5] Create `frontend/src/components/generic/Turnstile/TurnstileWidget.tsx`: loads `https://challenges.cloudflare.com/turnstile/v0/api.js`, renders the widget with `VITE_TURNSTILE_SITE_KEY`, reports the token via `onToken(token)`, and resets on error or expiry
- [ ] T047 [US5] Add `VITE_TURNSTILE_SITE_KEY` to `frontend/.env.example`
- [ ] T048 [P] [US5] Update `frontend/src/components/SuggestBookForm/SuggestBookForm.tsx`: render `TurnstileWidget`, send `X-Turnstile-Token` with the POST, disable submit until a token exists; keep sending a single-entry array
- [ ] T049 [P] [US5] Update `frontend/src/components/ContactForm/ContactForm.tsx` public path: render `TurnstileWidget`, send `X-Turnstile-Token`; keep sending `[values]`

**Checkpoint**: Quickstart §5.1 to §5.6 pass.

---

## Phase 8: User Story 6 - Uploaded Images Checked by Content (Priority: P2)

**Goal**: Only real JPEG, PNG, WebP, or GIF bytes are stored; the declared type is ignored.

**Independent Test**: Quickstart §6.

- [ ] T050 [US6] Create `backend/src/utils/imageSignature.ts` with `detectImageType(buffer)` returning `'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | null`, using the signatures in research.md §7
- [ ] T051 [US6] In `backend/src/routes/imageRouter.ts`, replace the `file.mimetype.startsWith('image/')` check with `detectImageType(file.buffer)`; respond 400 `{ "error": "File content is not a supported image type" }` when null
- [ ] T052 [US6] In `backend/src/routes/imageRouter.ts`, use the detected type as the stored `Content-Type` in `putObject`
- [ ] T053 [US6] In `backend/src/routes/imageRouter.ts`, map multer `LIMIT_FILE_SIZE` errors to 413 `{ "message": "File is too large (limit 5 MB)" }`

**Checkpoint**: Quickstart §6.1 to §6.3 pass.

---

## Phase 9: User Story 7 - No Internal Error Detail in Production (Priority: P2)

**Goal**: Production responses carry only a generic message (and validation field names); full detail goes to the server log.

**Independent Test**: Quickstart §7.

- [ ] T054 [US7] In `backend/src/app.ts` global error handler: log full error and stack with `console.error`; respond with `message` and `details` only when `process.env.NODE_ENV === 'development'` or when the status is 4xx and `details` holds validation fields; 5xx always returns the generic message "Internal server error" with `details: null`
- [ ] T055 [US7] In `backend/src/routes/imageRouter.ts`, remove `details: err` from the 500 upload response and return `{ "message": "Upload failed" }`
- [ ] T056 [US7] Confirm `backend/src/services/contactForm.ts` and `suggestedBooks.ts` `AppError` details only carry validation field names in the 4xx path (no database text)

**Checkpoint**: Quickstart §7.1 to §7.3 pass.

---

## Phase 10: User Story 8 - One Object-Storage Configuration (Priority: P3)

**Goal**: One MinIO client, one bucket setting, presigned links point at the same host and bucket as uploads.

**Independent Test**: Quickstart §8.

**Depends on**: US6 (`imageRouter.ts` edits must land first).

- [ ] T057 [US8] In `backend/src/utils/config.ts`, build the single `minioClient` from `MINIO_URL` and `MINIO_ACCESS_KEY`/`MINIO_SECRET_KEY` (validated in `env.ts`); remove the localhost fallback; export `BUCKET_NAME` from `MINIO_BUCKET_NAME`
- [ ] T058 [US8] In `backend/src/minioCache.ts`, delete the second `new Client(...)` and the `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL`, and `MINIO_BUCKET_NAME` reads; import `minioClient` and `BUCKET_NAME` from `backend/src/utils/config.ts`; re-export them as before
- [ ] T059 [US8] In `backend/src/routes/imageRouter.ts`, replace `const BUCKETNAME = 'book-images'` with the `BUCKET_NAME` export from `backend/src/utils/config.ts`
- [ ] T060 [US8] Confirm `grep -rn "book-images\|MINIO_ENDPOINT\|new Client(" backend/src` returns only the single client in `utils/config.ts` (and no `MINIO_ENDPOINT`)
- [ ] T061 [US8] Update the `initializeBucket` and `checkMinioHealth` functions in `backend/src/minioCache.ts` to use the shared bucket name (no behavior change beyond that)

**Checkpoint**: Quickstart §8.1 to §8.7 pass, and deployed MinIO values are recorded (FR-035).

---

## Phase 11: User Story 9 - Lean Dependencies and Accurate Configuration (Priority: P3)

**Goal**: No unused packages or settings remain; `bcryptjs` is used.

**Independent Test**: Quickstart §9.

- [ ] T062 [US9] Remove `express-session` and `@types/express-session` from `backend/package.json`; run `npm install` in `backend/` to update `backend/package-lock.json`
- [ ] T063 [US9] Remove `SESSION_SECRET` and `ADMIN_PASSWORD` from `backend/.env.example`; add `ADMIN_PASSWORD_HASH`, `TURNSTILE_SECRET_KEY`, `MINIO_URL` (already present), `MINIO_BUCKET_NAME` (now required)
- [ ] T064 [P] [US9] Update `frontend/.env.example` so it lists only `VITE_API_URL`, `VITE_URL_PREFIX`, `VITE_TURNSTILE_SITE_KEY`
- [ ] T065 [US9] Confirm `grep -rn "express-session\|SESSION_SECRET" backend frontend docs README.md CLAUDE.md --exclude-dir=node_modules` returns nothing (quickstart §9.1)
- [ ] T066 [US9] Confirm `bcryptjs` has at least one import in `backend/src` (`adminAuth.ts`)

**Checkpoint**: Quickstart §9 passes.

---

## Phase 12: Documentation (Required by FR-039)

**Purpose**: Keep docs in step with the code, in the same change.

- [ ] T067 Update `docs/env-vars.md` with the required backend and frontend variables; remove `ADMIN_PASSWORD`, `SESSION_SECRET`; note `MINIO_URL` as the MinIO setting and `MINIO_BUCKET_NAME` as required
- [ ] T068 [P] Update `docs/railway-setup.md` with the custom-domain steps (`api.bannedbookshub.com`, `www.bannedbookshub.com`, dev equivalents), the `FRONTEND_URL` literal-value change, and the Turnstile hostname setup
- [ ] T069 Update `CLAUDE.md`: the Environment Variables section (backend and frontend lists), the Auth bullet (cookie + CSRF, not Bearer), the MinIO bullet (single client from `MINIO_URL`; the hard-coded endpoint claim is removed)
- [ ] T070 [P] Update `README.md`: setup steps (`npm run hash-password`), environment table, and the auth description
- [ ] T071 Update the developer walkthrough file (`/private/tmp/claude-503/-Users-ericwork-banned-books-app-banned-books-hub/efecfbca-b3a2-4504-8d22-dea66eb6fa8b/scratchpad/banned-books-hub-walkthrough.md`): the authentication, storage, error-handling, and security sections (gaps 1 to 10 now resolved); keep the file, and note in the plan that the walkthrough remains outside the repo unless moved to `docs/`
- [ ] T072 Amend `.specify/memory/constitution.md` to 1.1.0: Principle V env list (add `ADMIN_PASSWORD_HASH`, `TURNSTILE_SECRET_KEY`, `MINIO_URL`, `MINIO_BUCKET_NAME`; remove `ADMIN_PASSWORD`, `MINIO_ENDPOINT`); update `LAST_AMENDED_DATE`

---

## Phase 13: Polish & Release

**Purpose**: Cross-cutting verification and deployment gates.

- [ ] T073 Run `cd backend && npm run build` and fix any TypeScript errors
- [ ] T074 Run `cd frontend && npm run build && npm run lint` and fix any errors introduced by this change
- [ ] T075 Remove debug `console.log` statements added during implementation (constitution: workflow policy)
- [ ] T076 Run the full `quickstart.md` in the development environment (sections 1 to 9), recording results
- [ ] T077 Run quickstart §4 and §10 on `dev.bannedbookshub.com` in Chrome, Firefox, and Safari (desktop and iOS)
- [ ] T078 Verify deployed MinIO values in dev and prod (FR-035): `MINIO_URL`, `MINIO_BUCKET_NAME`, and presigned link resolution
- [ ] T079 Confirm Railway dev and prod have `ADMIN_PASSWORD_HASH`, `TURNSTILE_SECRET_KEY`, `MINIO_BUCKET_NAME`, and a `JWT_SECRET` of ≥ 32 characters before the code is merged to `development`
- [ ] T080 Record release notes: quickstart results, Safari results, deployed MinIO values, and the `FRONTEND_URL` change

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: depends on Setup; blocks all stories.
- **US1 (P1)**: after Foundational.
- **US2 (P1)**: after Foundational (uses `env.ts`); independent of US1 in code, but the gate should be verified first.
- **US3 (P1)**: after US2 (extends the login route).
- **US4 (P2)**: after US2 and US1.
- **US5 (P2)**: after Foundational (`rateCounter.ts`); independent of US2–US4 for backend; the frontend suggest and contact changes need the cookie-free public path only.
- **US6 (P2)**: independent.
- **US7 (P2)**: independent of US6, but both touch `imageRouter.ts` (T055 follows T051–T053).
- **US8 (P3)**: after US6 (`imageRouter.ts`).
- **US9 (P3)**: after US2 (bcrypt used) and US4 (session removed).
- **Documentation**: after the code it describes (T067–T072 after all story phases).
- **Polish**: last.

### Parallel opportunities

- T002, T004 can run in parallel with T001.
- Frontend tasks T034–T038 touch different files and can run in parallel after T027–T033.
- T046, T048, T049 are parallel with backend US5 work after T040–T044 define the header contract.
- Documentation tasks T067 and T068 and T070 can run in parallel.

### Implementation strategy

**MVP (recommended first delivery)**: Phases 1–5 (US1 to US3). This closes the three P1 items: the forgeable-token fallback, the plain-text password, and brute-force logins. It needs no frontend change except that the login response no longer returns a token, so the admin screen must be updated in the same deploy (T028, T033).

Because of that, **MVP must include T027–T033** before deploy, not only backend tasks. Otherwise admin login breaks.

**Incremental**: then US4 (cookie, needs the domain, now ready), US5, US6, US7, US8, US9, documentation, polish.

---

## Notes

- Mark tasks `[x]` as they complete.
- Commit after each phase checkpoint on `fix_security-remediation`.
- Railway variables (T079) must be set before merge to `development`; the backend stops at startup otherwise.
