# HTTP API Contract Changes: Security Remediation

**Feature**: 005-security-remediation | **Date**: 2026-10-28

Only endpoints whose behavior changes are listed. Unlisted endpoints keep their current contract.

Common rules:

- **Authentication for protected routes**: the `admin_session` cookie (replaces `Authorization: Bearer`). Requests must use `credentials: "include"`.
- **CSRF for writes**: POST, PUT, DELETE on protected routes also require `X-CSRF-Token` (value from login or validate).
- **Human verification for public writes**: `X-Turnstile-Token` header.
- **Error body**: `{ "message": string, "details"?: object | null }`. In production, `details` is limited to validation field lists; 5xx bodies carry only a generic message.

---

## POST /api/admin/login

**Auth**: none. **Rate limit**: login failure counter (5 per 15 min per IP) in addition to global limit.

Request body (unchanged):

```json
{ "username": "string", "password": "string" }
```

| Status | Condition | Body |
|---|---|---|
| 200 | Credentials valid, not blocked | `{ "success": true, "message": "Logged in successfully", "csrfToken": "hex" }` plus `Set-Cookie: admin_session=...` |
| 400 | Body missing `username` or `password` | `{ "message": "Username and password are required" }` |
| 401 | Credentials invalid | `{ "message": "Invalid credentials" }` (identical for wrong username and wrong password) |
| 429 | Address blocked by failure counter (checked before the password) | `{ "message": "Too many failed attempts. Try again later." }` and `Retry-After` header |

**Removed from response**: `token` (JWT no longer returned in body).

---

## POST /api/admin/logout

**Auth**: valid `admin_session` cookie. **CSRF**: `X-CSRF-Token` required.

| Status | Condition | Body |
|---|---|---|
| 200 | Session valid, cookie cleared | `{ "success": true, "message": "Logged out" }` plus `Set-Cookie: admin_session=; Max-Age=0` |
| 401 | No valid session | `{ "message": "Authorization token required" }` |
| 403 | CSRF token missing or wrong | `{ "message": "Invalid CSRF token" }` |

**New endpoint.**

---

## GET /api/admin/validate

**Auth**: `admin_session` cookie. Read-only (no CSRF).

| Status | Condition | Body |
|---|---|---|
| 200 | Session valid | `{ "valid": true, "user": { "username", "role" }, "csrfToken": "hex" }` |
| 401 | No valid session | `{ "message": "Invalid or expired token" }`; `Set-Cookie` clears `admin_session` |

**Change**: adds `csrfToken`. Used on page load in place of the `localStorage` token check.

---

## GET /api/admin

Same as validate's auth rules; response unchanged (`message`, `user`). Kept for compatibility; not used by the frontend.

---

## POST /suggested_books

**Auth**: none (public).

Request headers: `Content-Type: application/json`, `X-Turnstile-Token: string` (required).
Request body: array with **exactly one** entry (changed; previously one or more).

| Status | Condition | Body |
|---|---|---|
| 200 | Verified, under limit, valid entry | `{ "message": "Suggest Books inserted successfully", "results": [...] }` (unchanged) |
| 400 | Missing `X-Turnstile-Token` | `{ "message": "Human verification is required" }` |
| 400 | Body is not an array, is empty, or has more than one entry | `{ "message": "Invalid create: request must contain exactly one book" }` |
| 400 | Entry fails field validation | Existing validation body with `details.invalidFields` |
| 403 | Turnstile rejects token | `{ "message": "Human verification failed" }` |
| 429 | Address reached 10 accepted submissions this hour | `{ "message": "Too many submissions. Try again later." }` |
| 503 | Turnstile unreachable or times out | `{ "message": "Verification is temporarily unavailable. Try again later." }` |

---

## POST /contact_form

**Auth**: none (public). Same header and status rules as `POST /suggested_books`, with the message "Invalid create: request must contain exactly one entry" for the body-shape case.

---

## DELETE and PUT routes (books, suggested books, contact forms)

**Changed**: auth via cookie; `X-CSRF-Token` required. Bodies and success responses unchanged.

| Status | Condition | Body |
|---|---|---|
| 401 | No valid session | `{ "message": "Authorization token required" }` |
| 403 | CSRF missing or wrong | `{ "message": "Invalid CSRF token" }` |

---

## POST /book-image/upload

**Auth**: `admin_session` cookie and `X-CSRF-Token`. Multipart field `image`, optional `isbn`. Limit 5 MB (unchanged).

| Status | Condition | Body |
|---|---|---|
| 200 | Content is JPEG, PNG, WebP, or GIF | `{ "message": "Upload successful", "fileName": "string" }` (unchanged) |
| 400 | No file | `{ "error": "No file uploaded" }` (unchanged) |
| 400 | Content signature not an allowed image type (declared type ignored) | `{ "error": "File content is not a supported image type" }` |
| 413 | File over 5 MB | `{ "message": "File is too large (limit 5 MB)" }` |
| 500 | Storage failure | `{ "message": "Upload failed" }` (no provider detail) |

**Changed**: the storage error object is no longer returned (`details: err` removed).

---

## GET /book-image/:imgName

**Auth**: none. Unchanged.

---

## Health endpoints

Unchanged.
