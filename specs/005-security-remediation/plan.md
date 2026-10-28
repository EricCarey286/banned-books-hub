# Implementation Plan: Security Remediation

**Branch**: `fix_security-remediation` | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-security-remediation/spec.md`

## Summary

Close ten gaps from the application review, in priority order: refuse to start without a strong signing secret; store the admin password as a bcrypt hash; limit failed logins per address; move the admin session into a cookie that page scripts cannot read, with CSRF protection and a same-site cookie (Clarification 1, option B); add human verification and a per-address hourly limit to the two public POST endpoints; restrict the contact endpoint to one entry per request; check uploads by file signature; hide internal error detail in production; consolidate MinIO into one client with required settings; remove unused session code and dependencies. Documentation (README, `CLAUDE.md`, walkthrough, env reference) is updated in the same change.

No database schema changes are needed, so no migration is added.

**Cookie arrangement**: the frontend and API are served from subdomains of one domain (Clarification 1, option B). The admin cookie is then same-site and works in all major browsers, including Safari. This needs a custom domain and Railway configuration; see Risks.

## Technical Context

**Language/Version**: TypeScript 5.6 (frontend); TypeScript targeting ESNext, CommonJS modules (backend), Node.js 18+

**Primary Dependencies**: Backend: Express 4, jsonwebtoken, bcryptjs (now used), helmet, express-rate-limit, minio, multer, redis v5, mysql2. Frontend: React 18, React Router 7, Vite 6, Tailwind v4. New external service: Cloudflare Turnstile (human verification, server-side `siteverify` call).

**Storage**: MariaDB through stored procedures (unchanged). Redis for shared counters (login failures, public submissions) via the existing cache client. MinIO for images (unchanged buckets; configuration consolidated).

**Testing**: None configured (constitution: manual verification). Verification is by the scenarios in `quickstart.md`, run against the development environment.

**Target Platform**: Railway (Linux containers; TLS at the Railway proxy). Browsers: current Chrome, Firefox, Edge, Safari.

**Project Type**: Web application (React SPA frontend + Express API backend).

**Performance Goals**: Login and submission checks add at most one Redis round trip each. Public submissions add one Turnstile verification call with a 5-second timeout. Login with bcrypt cost 12 takes roughly a quarter of a second on the server; acceptable for one admin.

**Constraints**: No new global frontend state (constitution IV). All new settings documented and configured in Railway before deploy (constitution V and workflow policy). Backend refuses to start when required settings are missing, so Railway must be configured before the change is merged to `development`.

**Scale/Scope**: One admin account. Public traffic is modest. Single backend instance is assumed; Redis counters keep the design correct if that changes.

## Constitution Check

*Gate evaluated before Phase 0 and re-checked after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Security-First | PASS | Fallback secret removed (FR-001 to FR-003). Mutating routes keep `authenticate`. Helmet, CORS, and global rate limit unchanged. Secrets stay in env vars. |
| II. Layered Architecture | PASS | Login logic moves out of `app.ts` into `routes/adminRouter.ts` (routes) and `services/adminAuth.ts` (logic). Redis counters and Turnstile are called from middleware/services, not routes. No raw pool calls added. |
| III. Validation at the Boundary | PASS with justified codes | Missing or wrong-type input stays 400. Contact entry-count violations are 400. New codes 403, 429, 503 are not in Principle III; see Complexity Tracking. |
| IV. Lean Frontend State | PASS | `authToken` removed from `localStorage`. Auth state stays in `App.tsx`; the CSRF token is held there too, not in a global store. Turnstile widget is a local component. |
| V. Environment-Driven Configuration | PASS with required amendment | Constitution lists `MINIO_ENDPOINT` and `ADMIN_PASSWORD`, which this change replaces. New variables are added. Amendment to 1.1.0 is a task in this plan. |

**Result**: No unjustified violations. Amendment and justified status codes are tracked.

## Project Structure

### Documentation (this feature)

```text
specs/005-security-remediation/
├── spec.md
├── plan.md                 # This file
├── research.md             # Phase 0 decisions
├── data-model.md           # Phase 1: session, counters, password hash
├── quickstart.md           # Phase 1: validation scenarios
├── contracts/
│   └── http-api.md         # Phase 1: changed endpoints
├── checklists/
│   └── requirements.md
└── tasks.md                # Created by /speckit-tasks (not by this command)
```

### Source Code (repository root)

```text
backend/
├── package.json                      # remove express-session, @types/express-session; add hash-password script
├── .env.example                      # new/removed variables
├── scripts/
│   └── hash-admin-password.ts        # NEW: reads password from stdin, prints bcrypt hash
└── src/
    ├── app.ts                        # import utils/env first; mount adminRouter; new error handler; remove inline login
    ├── cache.ts                      # unchanged (used by new counters)
    ├── minioCache.ts                 # use single client from utils/config; remove second client and its env reads
    ├── middleware/
    │   ├── auth.ts                   # NEW logic: read httpOnly cookie, enforce CSRF on writes; JWT secret from utils/env
    │   ├── loginLimiter.ts           # NEW: 5 failures / 15 min / IP, Redis-backed
    │   ├── submissionLimiter.ts      # NEW: 10 submissions / hour / IP / endpoint, Redis-backed
    │   └── turnstile.ts              # NEW: requires X-Turnstile-Token, verifies via service
    ├── routes/
    │   ├── adminRouter.ts            # NEW: POST /api/admin/login, POST /api/admin/logout, GET /api/admin/validate, GET /api/admin
    │   ├── imageRouter.ts            # magic-byte check; generic errors; bucket from config
    │   ├── suggestedBookRouter.ts    # turnstile + submissionLimiter on POST; exactly one entry (planning addition, see research.md §13)
    │   └── contactFormRouter.ts      # turnstile + submissionLimiter on POST; exactly one entry
    ├── services/
    │   ├── adminAuth.ts              # NEW: verifyAdminCredentials, issueSession, csrfTokenFor
    │   ├── rateCounter.ts            # NEW: Redis INCR/EXPIRE window counter; fails open if Redis absent
    │   ├── turnstile.ts              # NEW: siteverify call with timeout
    │   └── db.ts                     # unchanged
    └── utils/
        ├── env.ts                    # NEW: validates required env at import; exits(1) with names of missing settings
        ├── config.ts                 # single MinIO client from MINIO_URL; MINIO_BUCKET_NAME required
        ├── imageSignature.ts         # NEW: JPEG, PNG, WebP, GIF signature detection
        └── helper.ts                 # unchanged

frontend/
├── .env.example                      # add VITE_TURNSTILE_SITE_KEY
└── src/
    ├── App.tsx                       # no localStorage; credentials on all API calls; csrf token in state; old token removed on load
    ├── utils/api.ts                  # apiFetch helper: credentials include, X-CSRF-Token on writes
    ├── components/
    │   ├── AdminLogin/AdminLoginModal.tsx   # login includes credentials; receives csrfToken, not JWT
    │   ├── AdminDashboard/AdminDashboard.tsx # use authFetch with cookie
    │   ├── AdminBookList/AdminBookList.tsx   # same
    │   ├── AddBookForm/AddBookForm.tsx       # same; upload uses credentials
    │   ├── AddImageForm/AddImageForm.tsx     # upload uses credentials
    │   ├── ContactForm/ContactForm.tsx       # Turnstile widget + header
    │   ├── SuggestBookForm/SuggestBookForm.tsx # Turnstile widget + header
    │   └── generic/Turnstile/TurnstileWidget.tsx # NEW: loads widget script, reports token
    └── ...

docs/env-vars.md                      # updated variable reference
docs/railway-setup.md                 # updated Railway steps
CLAUDE.md                             # updated env section, MinIO and auth notes, SPECKIT plan pointer
README.md                             # updated setup and env section
.specify/memory/constitution.md       # amendment to 1.1.0
```

**Structure Decision**: Keep the existing layered web-app structure. The one new routing file (`adminRouter.ts`) exists so the login logic leaves `app.ts` and follows the Routes → Services rule. Middleware is added only where a check runs before a handler (auth, login limit, submission limit, human verification).

## Design Decisions (summary; detail in research.md)

- **Startup gate**: `utils/env.ts` is the first project import in `app.ts`. It validates required settings and exits with the names of any missing or invalid ones. Everything else reads secrets from that module.
- **Admin session**: `POST /api/admin/login` sets an `admin_session` cookie (HTTP-only, Secure, SameSite=Strict, 24 h) containing a signed JWT with a random `jti`. The JWT is never returned in the body. The cookie is host-only on the API subdomain; the frontend subdomain is same-site with it, so the browser sends it on API calls with `credentials: "include"`.
- **Domains**: `FRONTEND_URL` is the frontend subdomain (for example `app.<domain>`); `VITE_API_URL` is the API subdomain (for example `api.<domain>`). Both use `https`. CORS continues to allow only `FRONTEND_URL`.
- **CSRF**: The login and validate responses return a `csrfToken` = HMAC(JWT_SECRET, jti). The frontend keeps it in `App.tsx` state and sends it as `X-CSRF-Token` on POST, PUT, and DELETE. The server recomputes it from the cookie's `jti`.
- **Login limit**: Check the failure counter before comparing passwords, so a blocked address is refused even with the correct password. Increment on failure; delete on success.
- **Password check**: Constant-time username comparison on digests; bcrypt compare always runs (against a dummy hash when the username is wrong), so response timing does not reveal valid usernames.
- **Human verification**: Public POSTs require `X-Turnstile-Token`, verified server-side. Missing token → 400. Verification rejected → 403. Verifier unreachable → 503 (fail closed).
- **Submission limit**: 10 per IP per endpoint per hour, counted in Redis. The counter only increments after human verification passes, so bots without a valid challenge cannot fill it, and it counts only accepted submissions.
- **Upload**: Accept only when leading bytes match JPEG, PNG, WebP, or GIF. Stored `Content-Type` comes from the detected type.
- **Errors**: Default is production-safe. Detail is shown only when `NODE_ENV === 'development'`. 5xx responses always carry a generic message. Full error is logged on the server.
- **Storage**: One MinIO client built from `MINIO_URL`; bucket from required `MINIO_BUCKET_NAME`. The duplicate client in `minioCache.ts` and the hard-coded `book-images` name in `imageRouter.ts` are removed.

## Risks and Blocking Decisions

1. **Custom domain and Railway configuration (blocking for deploy, not for code)**. Option B needs a registrable domain owned by the project, with two Railway custom domains: one for the frontend (`app.<domain>`) and one for the backend (`api.<domain>`). The code can be written and tested locally first, but the admin cookie only works end to end once both hosts share the domain. The domain name is needed before deploy.
2. **Cookie behavior in local development**: `localhost:5173` (frontend) and `localhost:3001` (API) are same-site, so `SameSite=Strict` works. `Secure` cookies on plain `http://localhost` depend on the browser; Chrome and Firefox accept them, and Safari's behavior should be checked during quickstart §4.
3. **Original option A withdrawn**: A relied on cross-site cookies, which Safari blocks (including iOS). Recorded in research.md §1.
4. **Deployed MinIO settings unverified (release gate, FR-035)**. Production may not set `MINIO_BUCKET_NAME`, in which case presigned URLs point at `books` while uploads go to `book-images`. Verify in Railway dev and prod before release.
5. **Existing `JWT_SECRET` in Railway may be shorter than 32 characters**. The backend will then refuse to start after deploy. Check the value length before merging.
6. **Ordering**: Railway must have `ADMIN_PASSWORD_HASH`, `TURNSTILE_SECRET_KEY`, and `MINIO_BUCKET_NAME` set before the new backend deploys, or the service stops at startup.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| 403 for failed human verification | The request is well-formed but refused by policy. Principle III defines 400, 422, and 501 only. | 400 would imply a malformed request; 422 would imply a field-level problem. Neither describes a failed challenge. |
| 429 for login and submission limits | Standard status for rate limiting; required by FR-009 and FR-020. | 401 or 403 would misreport the cause; 503 would imply the service is down. |
| 503 when verification is unreachable | Fail closed (FR-022) with an accurate "temporarily unavailable" status. | 500 would count as a server bug; accepting unverified submissions violates FR-022. |
| Constitution amendment (V) | Settings list changed (`MINIO_ENDPOINT`, `ADMIN_PASSWORD` removed; new settings added). | Leaving the constitution out of date would mislead the next plan's gate check. |

## Phase 0 and Phase 1 Outputs

- `research.md`: decisions and alternatives for each open technical question.
- `data-model.md`: admin session, CSRF token, counters, and password hash entities. No database schema change.
- `contracts/http-api.md`: changed endpoints, request and response shapes, status codes.
- `quickstart.md`: scenarios to run in the development environment to prove each user story.
