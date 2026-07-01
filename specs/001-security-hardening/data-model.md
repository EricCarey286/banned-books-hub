# Data Model: Security Hardening

**Phase 1 output for**: `specs/001-security-hardening/plan.md`
**Date**: 2026-06-24

> This feature does not introduce new database tables. It hardens existing request/response
> contracts and adds a new middleware entity. The entities below represent logical structures
> relevant to the security layer.

---

## Entity: AdminSession

Represents the active authenticated context for the single admin user.

| Field | Type | Notes |
|-------|------|-------|
| `username` | string | Matched against `ADMIN_USERNAME` env var at login |
| `role` | string | Always `"admin"` for the single admin user |
| `token` | string (JWT) | Issued at login; stored in browser `localStorage` |
| `expiresAt` | timestamp | 24 hours from issue time; encoded in the JWT payload |

**Validation rules**:
- Token MUST be signed with `JWT_SECRET` env var (no fallback)
- Token MUST not be expired (`exp` claim checked by `jsonwebtoken.verify`)
- Requests to protected routes with a missing, expired, or invalid token are rejected with
  `401 Unauthorized`

**State transitions**:
```
[No session] → login succeeds → [Active session, token in localStorage]
[Active session] → logout / token expires → [No session]
```

---

## Entity: UploadConstraint

Defines the rules an uploaded file must satisfy before being accepted.

| Field | Type | Value |
|-------|------|-------|
| `maxFileSizeBytes` | number | `5_242_880` (5 MB) |
| `permittedMimeTypes` | string[] | `["image/jpeg", "image/png", "image/gif", "image/webp"]` |

**Validation rules**:
- File MUST be present (`req.file` must not be undefined)
- `file.size` MUST be ≤ `maxFileSizeBytes` (enforced by multer `limits` before handler runs)
- `file.mimetype` MUST begin with `image/` (checked in handler before MinIO call)
- Violations return `400 Bad Request` with a descriptive error message

---

## Entity: ErrorResponse

The standard structure returned for all error conditions. Replaces inconsistent ad-hoc error
shapes currently in use.

| Field | Type | Notes |
|-------|------|-------|
| `message` | string | Human-readable description of the error |
| `details` | object \| null | Optional — structured detail (e.g., list of invalid fields) |

**Status code mapping** (corrected from current `501` usage):

| Situation | HTTP Code |
|-----------|-----------|
| Missing or malformed required field | `400 Bad Request` |
| Invalid query parameter (e.g., page ≤ 0) | `400 Bad Request` |
| Invalid search term (empty string) | `400 Bad Request` |
| Uploaded file exceeds size limit | `400 Bad Request` |
| Uploaded file is not an image | `400 Bad Request` |
| Resource with given ID not found | `404 Not Found` |
| Image not found in storage | `404 Not Found` |
| No auth token / invalid / expired token | `401 Unauthorized` |
| DB insert returned 0 affected rows | `500 Internal Server Error` |

---

## No Schema Changes

No new database tables, columns, or stored procedures are added by this feature.
All existing stored procedures remain unchanged.
