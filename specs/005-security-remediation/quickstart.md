# Quickstart: Validate Security Remediation

**Feature**: 005-security-remediation | **Date**: 2026-10-28

Run these scenarios against the **development** environment after deploy, and locally before merge. Each maps to a user story in `spec.md`. Replace `$API` with the backend origin (for example `https://<dev-backend>`) and `$ORIGIN` with the frontend origin. Never paste real secrets into shell history; use the hash script with stdin.

## 0. Prerequisites

```bash
cd backend
npm install
npm run hash-password            # type the admin password at the prompt; copy the printed hash
```

Set in `backend/.env` (local) or Railway (dev): `JWT_SECRET` (≥ 32 chars), `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `TURNSTILE_SECRET_KEY` (local: Cloudflare test secret `1x0000000000000000000000000000000AA`), `MINIO_URL`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET_NAME`, `FRONTEND_URL`, `URL_PREFIX`. Remove `ADMIN_PASSWORD`, `SESSION_SECRET`.

Redis must be reachable (`REDIS_URL`) for the login and submission limits.

---

## 1. Startup gate (User Story 1)

| Step | Action | Expected |
|---|---|---|
| 1.1 | Start with `JWT_SECRET` unset | Process exits non-zero; message names `JWT_SECRET` |
| 1.2 | Start with `JWT_SECRET=short` | Exits non-zero; message states the 32-character minimum |
| 1.3 | Start with `ADMIN_PASSWORD_HASH` unset | Exits non-zero; message names it |
| 1.4 | Start with `ADMIN_PASSWORD_HASH=plaintext` | Exits non-zero; message says the value is not a bcrypt hash |
| 1.5 | Start with all required values valid | Starts; logs `Server running` |
| 1.6 | `grep -rn "missing-key" backend/src` | No matches |

---

## 2. Hashed password (User Story 2)

```bash
# correct password
curl -s -i -X POST "$API/api/admin/login" -H 'Content-Type: application/json' \
  -d '{"username":"<ADMIN_USERNAME>","password":"<correct>"}'
# expect 200, Set-Cookie: admin_session=...; HttpOnly; Secure; SameSite=None, no "token" in body

curl -s -X POST "$API/api/admin/login" -H 'Content-Type: application/json' \
  -d '{"username":"<ADMIN_USERNAME>","password":"wrong"}'
curl -s -X POST "$API/api/admin/login" -H 'Content-Type: application/json' \
  -d '{"username":"nobody","password":"wrong"}'
# expect identical 401 bodies: {"message":"Invalid credentials"}
```

| Step | Expected |
|---|---|
| 2.1 | Correct password → 200 |
| 2.2 | Wrong password and unknown username → identical 401 bodies |
| 2.3 | `grep -rn "ADMIN_PASSWORD\b" backend/src docs` finds no reads of the plain setting |

---

## 3. Login brute-force block (User Story 3)

Use one client address. Five wrong passwords, then the correct one:

```bash
for i in 1 2 3 4 5; do curl -s -o /dev/null -w "%{http_code}\n" -X POST "$API/api/admin/login" \
  -H 'Content-Type: application/json' -d '{"username":"<ADMIN_USERNAME>","password":"wrong"}'; done
curl -s -i -X POST "$API/api/admin/login" -H 'Content-Type: application/json' \
  -d '{"username":"<ADMIN_USERNAME>","password":"<correct>"}'
```

| Step | Expected |
|---|---|
| 3.1 | Attempts 1–5 → 401 |
| 3.2 | Attempt 6 (correct password) → 429 with `Retry-After` |
| 3.3 | Wait 15 min (or delete key `admin:login:fail:<ip>` in Redis for a faster check) → correct password → 200 |
| 3.4 | Another address is not blocked |

---

## 4. Session not readable by page scripts (User Story 4)

**Do not run this scenario until the Safari decision in `plan.md` Risk 1 is confirmed.**

| Step | Action | Expected |
|---|---|---|
| 4.1 | Log in through the admin modal in Chrome | Dashboard opens |
| 4.2 | DevTools console: `document.cookie` | Does not contain `admin_session` |
| 4.3 | DevTools console: `localStorage.getItem("authToken")` | `null` |
| 4.4 | Reload `/admin` | Still signed in (validate call succeeded) |
| 4.5 | Log out | Dashboard closes; `GET /api/admin/validate` → 401 |
| 4.6 | Load the site with an old `authToken` in localStorage | Key is removed on load |

**CSRF check** (write without the header):

```bash
curl -s -X DELETE "$API/books/<id>" -H "Cookie: admin_session=<value>"
# expect 403 {"message":"Invalid CSRF token"}
curl -s -X DELETE "$API/books/<id>" -H "Cookie: admin_session=<value>" -H "X-CSRF-Token: <csrfToken>"
# expect 200 (use a disposable test book)
```

---

## 5. Public submissions: human verification and limit (User Story 5)

```bash
# missing token
curl -s -X POST "$API/suggested_books" -H 'Content-Type: application/json' \
  -d '[{"title":"T","author":"A","banned_by":"B"}]'
# expect 400 "Human verification is required"

# Cloudflare test secret: "XXXX.DUMMY.TOKEN.XXXX" passes with secret 1x0000000000000000000000000000000AA
curl -s -X POST "$API/suggested_books" -H 'Content-Type: application/json' \
  -H 'X-Turnstile-Token: XXXX.DUMMY.TOKEN.XXXX' \
  -d '[{"title":"T","author":"A","banned_by":"B"}]'
# expect 200

# Two entries in one request
curl -s -X POST "$API/contact_form" -H 'Content-Type: application/json' \
  -H 'X-Turnstile-Token: XXXX.DUMMY.TOKEN.XXXX' \
  -d '[{"name":"a","email":"a@x.io","message":"m"},{"name":"b","email":"b@x.io","message":"m"}]'
# expect 400 "exactly one entry"
```

| Step | Expected |
|---|---|
| 5.1 | Missing token → 400 |
| 5.2 | Token rejected (secret `2x0000000000000000000000000000000AA`) → 403 |
| 5.3 | Verifier unreachable (point `TURNSTILE` URL at a closed port in a test build) → 503 |
| 5.4 | Valid token, 10 accepted suggestions from one IP → the 11th → 429 |
| 5.5 | Contact with two entries → 400; with zero entries → 400; with a non-array body → 400 (was 500) |
| 5.6 | Frontend suggest and contact forms still submit successfully in the browser |

---

## 6. Upload content check (User Story 6)

```bash
# real PNG → 200
curl -s -X POST "$API/book-image/upload" -H "Cookie: admin_session=<value>" -H "X-CSRF-Token: <csrf>" \
  -F "image=@./sample.png;type=image/png" -F "isbn=9780000000001"

# text file declared as image/png → 400
printf 'not an image' > fake.png
curl -s -X POST "$API/book-image/upload" -H "Cookie: admin_session=<value>" -H "X-CSRF-Token: <csrf>" \
  -F "image=@./fake.png;type=image/png" -F "isbn=9780000000002"

# over 5 MB → 413
head -c 6000000 /dev/urandom > big.png
curl -s -X POST "$API/book-image/upload" -H "Cookie: admin_session=<value>" -H "X-CSRF-Token: <csrf>" \
  -F "image=@./big.png;type=image/png"
```

| Step | Expected |
|---|---|
| 6.1 | Genuine PNG, JPEG, WebP, GIF → 200 |
| 6.2 | `fake.png` → 400, nothing stored |
| 6.3 | Oversized → 413 |

---

## 7. Production error detail (User Story 7)

With `NODE_ENV` unset (production default):

| Step | Action | Expected |
|---|---|---|
| 7.1 | Trigger validation error (`POST /contact_form` with `[{}]` and a valid token) | 400 with message and `details.invalidFields`; no stack |
| 7.2 | Stop MinIO (or use a bad `MINIO_URL` in a test build) and upload an image | 500 `{"message":"Upload failed"}`; no MinIO error object |
| 7.3 | Check server logs | Full error and stack present |

With `NODE_ENV=development` locally, detail may appear in 4xx/5xx bodies.

---

## 8. One object-storage configuration (User Story 8)

| Step | Action | Expected |
|---|---|---|
| 8.1 | `GET $API/books?page=1` | Each `cover_image_url` host equals the host in `MINIO_URL` |
| 8.2 | Bucket in each URL path | Equals `MINIO_BUCKET_NAME` |
| 8.3 | `curl -sI "<cover_image_url>"` | `200` with `image/*` content type |
| 8.4 | Upload an image via the admin screen, then request its link | Resolves to the uploaded image |
| 8.5 | Start with `MINIO_BUCKET_NAME` unset | Refuses to start; names the variable |
| 8.6 | `grep -rn "createClient\|new Client(" backend/src` | Exactly one MinIO client construction (`utils/config.ts`) |
| 8.7 | `grep -rn "book-images\|MINIO_ENDPOINT" backend/src` | No matches |

**Deployed verification (FR-035, release gate)**: Record the Railway dev and prod values of `MINIO_URL` and `MINIO_BUCKET_NAME`; confirm 8.1 to 8.3 against each. Note results in the release notes.

---

## 9. Dependencies and configuration (User Story 9)

| Step | Command | Expected |
|---|---|---|
| 9.1 | `grep -rn "express-session\|SESSION_SECRET" backend frontend docs README.md CLAUDE.md --exclude-dir=node_modules` | No matches |
| 9.2 | Compare `backend/.env.example` keys against `docs/env-vars.md` | Same set |
| 9.3 | `grep -rn "bcryptjs" backend/src` | At least one import (admin auth) |

---

## 10. Browser compatibility check

Repeat 4.1 to 4.5 in Safari (desktop and iOS). Expected to **fail** under option A; this is the known risk. Record the result in the release notes.
