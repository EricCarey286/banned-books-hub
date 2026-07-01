# API Contract Changes: Security Hardening

**Contract type**: REST API — breaking changes to authentication requirements and error codes
**Date**: 2026-06-24

> Public read endpoints are unchanged. Only the security posture of mutating and admin-read
> endpoints changes. Error code corrections are technically breaking for any consumer
> that branches on `501`; no external consumers are known.

---

## Authentication Header

Protected routes require:
```
Authorization: Bearer <jwt-token>
```

Token is obtained from `POST /api/admin/login`. It is valid for 24 hours.

**Error when missing or invalid**:
```json
HTTP 401 Unauthorized
{ "message": "Authorization token required" }
```

**Error when expired**:
```json
HTTP 401 Unauthorized
{ "message": "Invalid or expired token" }
```

---

## Book Routes (`/books`)

### `GET /books` — unchanged (public)
### `GET /books/search` — unchanged (public)
### `GET /books/featured` — unchanged (public)

### `POST /books` — now requires auth ⚠️

```
POST /books
Authorization: Bearer <token>    ← NEW: required
Content-Type: application/json
Body: [ { isbn, title, author, description?, ban_reason?, banned_by, cover_url? }, ... ]
```

**Success**: `200 OK` `{ message, results: [...] }`
**No token**: `401 Unauthorized`
**Invalid body**: `400 Bad Request` `{ message, details }` ← was `501`

### `PUT /books/:id` — now requires auth ⚠️

```
PUT /books/:id
Authorization: Bearer <token>    ← NEW: required
Content-Type: application/json
Body: { title?, author?, description?, ban_reason?, banned_by? }
```

**Success**: `200 OK` `{ message }`
**No token**: `401 Unauthorized`
**Invalid body**: `400 Bad Request` ← was `501`
**ID not found**: `404 Not Found` ← was `501`

### `DELETE /books/:id` — now requires auth ⚠️

```
DELETE /books/:id
Authorization: Bearer <token>    ← NEW: required
```

**Success**: `200 OK` `{ message }`
**No token**: `401 Unauthorized`
**ID not found**: `404 Not Found` ← was `501`

### `DELETE /books` (bulk) — now requires auth ⚠️

```
DELETE /books
Authorization: Bearer <token>    ← NEW: required
Content-Type: application/json
Body: { ids: [1, 2, 3] }
```

**Success**: `200 OK` `{ message }`
**No token**: `401 Unauthorized`
**Invalid ids array**: `400 Bad Request`
**Zero rows deleted**: `404 Not Found` ← was silent success

---

## Suggested Books Routes (`/suggested_books`)

### `POST /suggested_books` — unchanged (public, users suggest books)

**Error code correction only**:
- Validation failure: `400 Bad Request` ← was `501`

### `GET /suggested_books` — now requires auth ⚠️

```
GET /suggested_books?page=N
Authorization: Bearer <token>    ← NEW: required
```

**No token**: `401 Unauthorized`
**Invalid page**: `400 Bad Request` ← was `501`

### `DELETE /suggested_books/:id` — now requires auth ⚠️

```
DELETE /suggested_books/:id
Authorization: Bearer <token>    ← NEW: required
```

**No token**: `401 Unauthorized`
**ID not found**: `404 Not Found` ← was `501`

### `DELETE /suggested_books` (bulk) — now requires auth ⚠️

```
DELETE /suggested_books
Authorization: Bearer <token>    ← NEW: required
Body: { ids: [1, 2, 3] }
```

**No token**: `401 Unauthorized`
**Zero rows deleted**: `404 Not Found` ← was silent success

---

## Contact Form Routes (`/contact_form`)

### `POST /contact_form` — unchanged (public, users submit forms)

**Error code correction only**:
- Validation failure: `400 Bad Request` ← was `501`

### `GET /contact_form` — now requires auth ⚠️

```
GET /contact_form?page=N
Authorization: Bearer <token>    ← NEW: required
```

**No token**: `401 Unauthorized`
**Invalid page**: `400 Bad Request` ← was `501`

---

## Image Routes (`/book-image`)

### `GET /book-image/:imgName` — error code change only

**Image not found**: `404 Not Found` ← was `204 No Content`

### `POST /book-image/upload` — now requires auth + new constraints ⚠️

```
POST /book-image/upload
Authorization: Bearer <token>    ← NEW: required
Content-Type: multipart/form-data
Fields:
  image: <file>                  ← max 5 MB, must be image/* MIME type
  isbn: <string>                 ← optional, used as filename prefix
```

**Success**: `200 OK` `{ message: "Upload successful", fileName }`
**No token**: `401 Unauthorized`
**No file**: `400 Bad Request` `{ error: "No file uploaded" }`
**File too large**: `400 Bad Request` ← NEW: was previously unhandled (hung or crashed)
**Non-image file**: `400 Bad Request` `{ error: "Only image files are permitted" }` ← NEW
**MinIO failure**: `500 Internal Server Error` `{ error: "Upload failed" }`

---

## Admin Auth Routes (`/api/admin/*`) — unchanged

`POST /api/admin/login`, `GET /api/admin/validate`, `GET /api/admin` are unchanged.

---

## Frontend Contract: Authorization Header Behavior

| Browser state | Authorization header sent | Change |
|--------------|--------------------------|--------|
| User not logged in | None | ← was `Bearer Empty` |
| User logged in | `Bearer <valid-jwt>` | No change |

---

## New Environment Variable Required

| Variable | Description | Example |
|----------|-------------|---------|
| `MINIO_ENDPOINT` | Hostname of the MinIO/S3-compatible storage server | `bucket-production-70f9.up.railway.app` |

Must be added to Railway's environment configuration before deploying. The previous hardcoded
value (`bucket-production-70f9.up.railway.app`) is now sourced from this variable.
