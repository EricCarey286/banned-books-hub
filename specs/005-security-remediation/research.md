# Research: Security Remediation

**Feature**: 005-security-remediation | **Date**: 2026-10-28

No `NEEDS CLARIFICATION` markers remain in the technical context. The decisions below resolve the open technical questions. One of them (cookie scope) carries a blocking risk and is flagged.

---

## 1. Session cookie across separate domains (blocking)

**Decision**: Use the cross-site cookie with CSRF token (Clarification 1, option A) as the working design, but **do not start the cookie work until the user confirms it**, because Safari blocks it.

**Rationale**: The user chose A. The frontend and API are on separate `*.up.railway.app` hosts. Those are different sites, so a cookie must be `SameSite=None; Secure` to be sent cross-site.

**Risk found during planning**: Safari's tracking protection blocks all third-party cookies, including `SameSite=None` ones. Admin login would succeed but the session would not persist in Safari, including on iOS. Firefox and Chrome partition or restrict third-party cookies depending on settings, so behavior there is not guaranteed either.

**Alternatives considered**:
- **B: same-site subdomains of one custom domain** (for example `app.example.com` and `api.example.com`). Cookies become first-party-like in every browser; `SameSite=Lax` works. Requires a custom domain and Railway custom-domain configuration. Recommended if Safari support matters.
- **B': proxy API calls through the frontend's own domain.** Same-site, but needs a proxy route in the frontend host, adding a hop.
- **C: keep the JWT in browser storage.** Rejected by the spec; does not address the XSS gap.

**Action**: Ask the user to confirm A (accept Safari limitation) or switch to B. The rest of the plan is independent of this choice; only the cookie attributes and CSRF handling differ.

---

## 2. CSRF protection for cookie-authenticated writes

**Decision**: Synchronizer token derived statelessly: `csrfToken = HMAC-SHA256(JWT_SECRET, "csrf:" + jti)`, where `jti` is a random ID in the admin JWT. The login and validate responses return it; the frontend keeps it in `App.tsx` state and sends it as `X-CSRF-Token` on POST, PUT, and DELETE. The server recomputes and compares with `timingSafeEqual`.

**Rationale**:
- A double-submit cookie is not possible here: JavaScript on the frontend domain cannot read a cookie set by the API domain.
- No server-side session store is needed; the token is tied to the specific session because `jti` is per login.
- Works after page reload: the validate call returns a fresh token while the cookie is still valid.

**Alternatives considered**:
- **SameSite alone**: insufficient for cross-site cookies; `SameSite=None` sends the cookie on every cross-site request.
- **Server-side session table**: adds a database or Redis session store and migration burden for one admin.

---

## 3. Login failure counter storage

**Decision**: Redis counter per IP: key `admin:login:fail:<ip>`, `INCR` on failure, `EXPIRE` 900 seconds set when the key is created. Check before comparing the password; `DEL` on success. Blocked when count ≥ 5.

**Rationale**: Shared across instances; survives redeploys; the cache client is already initialized at startup. Matches FR-008 to FR-010.

**Alternatives considered**:
- **express-rate-limit with the default memory store**: per-process, reset on every deploy, so it does not meet the spec's shared-counter assumption. It is already a dependency, so it stays for the global limit only.
- **rate-limit-redis package**: adds a dependency for a 10-line counter.

**Fail-open behavior**: If Redis is unavailable the counter is skipped and the global limit still applies. Logged at `warn`. This is the spec's stated assumption (edge cases section).

---

## 4. Password hashing and comparison

**Decision**: `bcryptjs` (already installed) with cost factor 12. Store `ADMIN_PASSWORD_HASH` in the environment. Username compared through SHA-256 digests with `crypto.timingSafeEqual`. When the username does not match, bcrypt still runs against a constant dummy hash so timing does not reveal valid usernames. Validate that `ADMIN_PASSWORD_HASH` parses as bcrypt (`$2a$`, `$2b$`, or `$2y$` prefix and 60 characters) at startup.

**Rationale**: Pure JavaScript, no native build step (native `argon2` would add build risk on Railway's Nixpacks builder). Cost 12 is roughly a quarter second on a small container, acceptable for one admin.

**Alternatives considered**:
- **argon2**: stronger in theory, native dependency; rejected for build risk.
- **Plain comparison with a longer password**: rejected by the spec.

**Hash generation**: `npm run hash-password` reads the password from stdin so it does not appear in shell history or process listings.

---

## 5. Human verification provider

**Decision**: Cloudflare Turnstile. The frontend renders the widget (site key via `VITE_TURNSTILE_SITE_KEY`); the token is sent as `X-Turnstile-Token`; the backend calls `https://challenges.cloudflare.com/turnstile/v0/siteverify` with the secret key and the client IP, with a 5-second timeout. Local development uses Cloudflare's published test keys.

**Rationale**: Free; usually no puzzle for real visitors; no data-sale model; a single server-side call. Keeping the token in a header leaves the JSON body shape unchanged (the forms send arrays).

**Alternatives considered**:
- **hCaptcha**: comparable; viable fallback if Turnstile is unsuitable.
- **Google reCAPTCHA**: heavier user friction and data collection concerns.
- **Honeypot field only**: cheap, but does not meet FR-019's "valid human-verification response".

---

## 6. Submission limit

**Decision**: Redis counter per IP and endpoint: key `submit:<endpoint>:<ip>`, `INCR` after verification passes, `EXPIRE` 3600 seconds at creation. Blocked when count ≥ 10 before the insert.

**Rationale**: Same mechanism as login counters; counts only accepted submissions. Keeps one counting approach in the codebase.

---

## 7. Upload content checking

**Decision**: Hand-written signature checks on the buffer:
- JPEG: `FF D8 FF`
- PNG: `89 50 4E 47 0D 0A 1A 0A`
- GIF: `47 49 46 38` followed by `37 61` or `39 61`
- WebP: `52 49 46 46` at offset 0 and `57 45 42 50` at offset 8

The stored `Content-Type` is taken from the detected type, not from the client.

**Rationale**: Four signatures do not justify a dependency. Checking the first bytes is what FR-023 to FR-025 require.

**Alternatives considered**:
- **file-type**: detects many more formats, but its current major releases are ESM-only, which the CommonJS backend cannot import directly without changing the module setup.

---

## 8. Production error detail

**Decision**: Detail is included only when `NODE_ENV === 'development'`. Otherwise responses carry only `message` (and `details` for 4xx validation errors, which already contain only invalid field names). 5xx responses always use a generic message. The full error and stack are logged with `console.error`.

**Rationale**: Default-deny: if an environment forgets to set anything, detail stays hidden. `NODE_ENV` is the standard switch; developers set it in local `.env`.

**Alternatives considered**:
- **RAILWAY_ENVIRONMENT_NAME**: already used by the migration runner for a different purpose, and unset locally, so unset would mean "development" and leak detail if a deploy lacked it.

---

## 9. Object storage consolidation

**Decision**: One MinIO client in `utils/config.ts`, built from `MINIO_URL` (the name already set in Railway and in the local `.env`). `MINIO_BUCKET_NAME` is required. `minioCache.ts` imports the shared client and bucket; its separate client and `MINIO_ENDPOINT`/`MINIO_PORT`/`MINIO_USE_SSL` reads are removed. `imageRouter.ts` uses the shared bucket name instead of `book-images`.

**Rationale**: Keeps the deployed variable name, so no Railway rename is needed. The constitution lists `MINIO_ENDPOINT`; it is amended to match.

**Alternatives considered**:
- **Rename to `MINIO_ENDPOINT`**: would require a Railway change in every environment with no functional gain.
- **Keep two clients**: the root cause of the bug.

---

## 10. Startup validation

**Decision**: `utils/env.ts` checks required variables when imported and calls `process.exit(1)` with a message listing each missing or invalid name. `app.ts` imports it as its first project import, after `dotenv/config`. Required: `JWT_SECRET` (≥ 32 characters), `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` (bcrypt format), `TURNSTILE_SECRET_KEY`, `MINIO_URL`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET_NAME`, `FRONTEND_URL`, `URL_PREFIX`.

**Rationale**: Fail-fast is the requirement (FR-001, FR-002, FR-005, FR-033). Checking at import means nothing else reads an unvalidated secret.

**Alternatives considered**:
- **Check inside `startServer()`**: works, but modules that read secrets at import time would run first; a single import-time gate is simpler to reason about.

---

## 11. Removal of unused code

**Decision**: Remove `express-session` and `@types/express-session` from `package.json`, remove `SESSION_SECRET` from `.env.example` and the documentation. Keep `bcryptjs` (now used).

**Verification**: Search for `express-session`, `SESSION_SECRET`, and `session(` after the change; zero matches expected.

---

## 12. Contact form entry count

**Decision**: `Array.isArray(body)` and `body.length === 1`. Zero entries → 400 with the existing message; more than one → 400 "exactly one entry per request". A non-array body → 400 (currently it throws a TypeError and returns 500).

**Rationale**: The frontend already sends `[values]` (`ContactForm.tsx`), so the single-entry rule matches current behavior. The existing `for...of` over a non-array was an accidental 500 path.

---

## 13. Suggested books

**Decision**: Apply the same exactly-one-entry rule to `POST /suggested_books` as to the contact endpoint. Add human verification and the submission limit as well.

**Rationale**: The submission limit counts requests. If a suggestion request could carry many entries, one request could add many books and the limit would not bound spam. The frontend already sends one entry per request (`SuggestBookForm.tsx` sends `[values]`), so no user-visible change.

**Note**: The spec restricts only the contact endpoint (FR-021). Extending the rule to suggestions is a planning addition; record it in the walkthrough and mention it when the plan is reviewed.
