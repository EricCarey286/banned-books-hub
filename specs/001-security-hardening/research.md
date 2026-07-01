# Research: Security Hardening

**Phase 0 output for**: `specs/001-security-hardening/plan.md`
**Date**: 2026-06-24

## Decision 1: Middleware Extraction Strategy

**Decision**: Extract `authenticate` from `app.ts` into `backend/src/middleware/auth.ts` and
export it for import in each router.

**Rationale**: The function is currently defined inline in `app.ts` and is not accessible to
router modules. Moving it to a dedicated middleware module is the minimal change that makes it
importable without restructuring the project.

**Alternatives considered**:
- Wrap each router in `app.use(authenticate)` at mount time in `app.ts` — rejected because
  not all routes on a given path need auth (e.g., `GET /books` is public, only `POST /books`
  requires auth). Per-route application is more precise.
- Pass `authenticate` as a parameter to router factory functions — rejected as unnecessary
  indirection for a single function.

---

## Decision 2: Which Routes Require Authentication

**Decision**:

| Route | Auth Required | Reasoning |
|-------|--------------|-----------|
| `GET /books` | No | Public browsing |
| `GET /books/search` | No | Public search |
| `GET /books/featured` | No | Public featured book |
| `POST /books` | **Yes** | Admin creates books |
| `PUT /books/:id` | **Yes** | Admin edits books |
| `DELETE /books/:id` | **Yes** | Admin deletes books |
| `DELETE /books` | **Yes** | Admin bulk deletes |
| `GET /suggested_books` | **Yes** | Admin reads suggestions |
| `POST /suggested_books` | No | Public users suggest books |
| `DELETE /suggested_books/:id` | **Yes** | Admin moderates suggestions |
| `DELETE /suggested_books` | **Yes** | Admin bulk removes suggestions |
| `GET /contact_form` | **Yes** | Admin reads contact submissions |
| `POST /contact_form` | No | Public users submit contact form |
| `GET /book-image/:imgName` | No | Public image serving |
| `POST /book-image/upload` | **Yes** | Admin uploads cover images |

**Rationale**: Public users need to browse books, suggest books, and submit contact forms
without an account. All read and write operations that expose private data or mutate the
catalog require admin authentication.

**Alternatives considered**: Protecting `GET /suggested_books` as public — rejected because
submitter email addresses and unpublished content should not be exposed publicly.

---

## Decision 3: HTTP Status Codes for Error Cases

**Decision**: Replace all incorrect `501 Not Implemented` codes with semantically accurate
codes:

| Error Condition | Correct Code | Reasoning |
|----------------|-------------|-----------|
| Missing/empty required field | `400 Bad Request` | Client sent malformed input |
| Invalid page number | `400 Bad Request` | Client parameter is invalid |
| Invalid search term | `400 Bad Request` | Client parameter is invalid |
| Resource not found (delete by id, no rows) | `404 Not Found` | Record does not exist |
| Image not found in MinIO | `404 Not Found` | Resource does not exist |
| DB operation succeeds but zero rows affected on create | `500 Internal Server Error` | Unexpected server-side failure |

**Rationale**: `501 Not Implemented` means "the server does not support the functionality
required to fulfill the request" — it is reserved for HTTP method non-support. Using it for
validation errors misleads any client that inspects status codes.

**Alternatives considered**: Using `422 Unprocessable Entity` for semantic validation —
acceptable, but `400` is more universal and better supported by HTTP clients. Sticking with
`400` for consistency across all input errors.

---

## Decision 4: File Upload Constraints

**Decision**: Enforce a 5 MB maximum file size via multer's `limits` option and validate
that the uploaded file's MIME type begins with `image/` before storing.

**Rationale**: Without a size limit, a single malicious upload can exhaust the server's
in-memory buffer (multer uses `memoryStorage`). MIME type checking prevents non-image files
from being stored in the image bucket. The 5 MB limit accommodates high-resolution book
cover scans while keeping memory pressure predictable.

**Alternatives considered**:
- Moving to disk storage to avoid memory concerns entirely — rejected as over-engineering
  for the current traffic volume; the limit makes memory storage safe enough.
- Checking file extension instead of MIME type — rejected because extensions are trivially
  spoofed; checking `file.mimetype` is more reliable.

---

## Decision 5: MinIO Endpoint Configuration

**Decision**: Replace the hardcoded `"bucket-production-70f9.up.railway.app"` string in
`config.ts` with `process.env.MINIO_ENDPOINT`. Add the env var to Railway's configuration.

**Rationale**: The endpoint is an external service address that varies between environments
(production vs. local development). Hardcoding it violates constitution Principle V and means
anyone reading the source file can identify and probe the production MinIO instance.

**Alternatives considered**: Using a default value fallback (`|| 'localhost'`) — rejected
because a missing `MINIO_ENDPOINT` in production should be a hard failure, not a silent
redirect to localhost.

---

## Decision 6: Frontend Auth Header Fix

**Decision**: Change `getAuthHeaders` in `App.tsx` to return an empty object `{}` when no
token is present, instead of `{ Authorization: 'Bearer Empty' }`. Update `authFetch` to
conditionally spread headers only when they are non-empty.

**Rationale**: Sending `Bearer Empty` on every unauthenticated request is semantically wrong
and pollutes server access logs with spurious 401 attempts. The backend middleware correctly
handles a missing `Authorization` header; there is no reason to send a placeholder.

**Alternatives considered**: Returning `undefined` instead of `{}` — rejected because
spreading `undefined` into an object is a runtime error in some JS engines; `{}` is safe.

---

## Decision 7: Shared Frontend Types and URL Builder

**Decision**: Create `frontend/src/types/book.ts` exporting the `Book` interface, and
`frontend/src/utils/api.ts` exporting a `buildUrl(apiUrl, path)` function that reads
`VITE_URL_PREFIX` once.

**Rationale**: The `Book` interface is currently copy-pasted in 4 files. Any future field
addition requires 4 synchronized edits. Centralizing eliminates that drift risk. The URL
prefix env var read repeated in each component is similarly error-prone.

**Alternatives considered**: Using a React context for `apiUrl` instead of prop-drilling —
deferred per constitution Principle IV (no global state library unless scaling need is clear).
Prop drilling is acceptable for the current 4-component depth.

---

## Decision 8: Auth Check Frequency Reduction

**Decision**: Remove `location.pathname` from the `checkAuth` `useEffect` dependency array
in `App.tsx`. Auth check runs only on mount (and when `getAuthHeaders` reference changes,
which is stable due to `useCallback`).

**Rationale**: A JWT can be validated client-side for expiry without a network round-trip.
Firing a `GET /api/admin/validate` request on every page navigation is unnecessary overhead.
The token expiry is 24h; a single check on mount is sufficient. If the token expires during
a session, the next protected API call will return 401 and the admin can re-login.

**Alternatives considered**: Adding `jwt-decode` to decode the token client-side — deferred
to avoid a new dependency for marginal benefit; removing the pathname dependency achieves
the same reduction in API calls.
