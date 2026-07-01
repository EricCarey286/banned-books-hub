# Quickstart Validation Guide: Security Hardening

**Date**: 2026-06-24
**Contracts**: [api-security-changes.md](./contracts/api-security-changes.md)

This guide describes how to validate that all security hardening changes work correctly
against the running application. No automated tests exist; all validation is manual.

---

## Prerequisites

1. Both servers running:
   - Backend: `cd backend && npm run dev` (listens on configured PORT)
   - Frontend: `cd frontend && npm run dev` (Vite dev server)
2. A valid `.env` file in `backend/` including the new `MINIO_ENDPOINT` variable.
3. A REST client (curl, Postman, browser DevTools, or HTTPie).
4. Admin credentials (`ADMIN_USERNAME`, `ADMIN_PASSWORD` from `.env`).

---

## Scenario 1: Unauthenticated Write Is Rejected

**Validates**: FR-001, SC-001

```bash
# Attempt to create a book without a token — must return 401
curl -X POST http://localhost:<PORT>/books \
  -H "Content-Type: application/json" \
  -d '[{"isbn":"123","title":"Test","author":"Test","banned_by":"School"}]'
```

**Expected**: `HTTP 401` with `{ "message": "Authorization token required" }`

Repeat for:
- `PUT /books/1` (edit)
- `DELETE /books/1` (delete)
- `DELETE /books` with body `{"ids":[1]}`
- `DELETE /suggested_books/1`
- `GET /suggested_books`
- `GET /contact_form`
- `POST /book-image/upload` (multipart form, no token)

All must return `HTTP 401`.

---

## Scenario 2: Authenticated Write Succeeds

**Validates**: FR-001 (positive case)

```bash
# Step 1: Log in and capture the token
TOKEN=$(curl -s -X POST http://localhost:<PORT>/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"<ADMIN_USERNAME>","password":"<ADMIN_PASSWORD>"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Step 2: Create a book with the token
curl -X POST http://localhost:<PORT>/books \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '[{"isbn":"9780000000001","title":"Security Test","author":"Tester","banned_by":"School"}]'
```

**Expected**: `HTTP 200` with `{ "message": "Books inserted successfully", "results": [...] }`

---

## Scenario 3: No Hardcoded Secrets in Source

**Validates**: FR-006, SC-002

```bash
# Search for the old hardcoded MinIO endpoint — must return nothing
grep -r "bucket-production-70f9" backend/src/

# Search for any JWT fallback string — must return nothing
grep -r "missing-key" backend/src/
```

**Expected**: Both commands produce no output.

Confirm the application still connects correctly by performing a successful image upload
(Scenario 5) after setting `MINIO_ENDPOINT` in `.env`.

---

## Scenario 4: Correct Error Codes for Bad Input

**Validates**: FR-007, SC-004

```bash
# Missing required field — must return 400, not 501
curl -X POST http://localhost:<PORT>/books \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '[{"title":"No ISBN or author"}]'
```

**Expected**: `HTTP 400` (not `501`) with `{ "message": "Validation failed", "details": {...} }`

```bash
# Non-existent ID delete — must return 404
curl -X DELETE http://localhost:<PORT>/books/999999 \
  -H "Authorization: Bearer $TOKEN"
```

**Expected**: `HTTP 404` (not `501`)

```bash
# Image not found — must return 404, not 204
curl -v http://localhost:<PORT>/book-image/nonexistent.jpg
```

**Expected**: `HTTP 404` with `{ "error": "Image not found" }` (not `204 No Content`)

---

## Scenario 5: Upload Constraints Enforced

**Validates**: FR-004, FR-005, SC-003

```bash
# Attempt to upload a file larger than 5 MB — must return 400
dd if=/dev/urandom of=/tmp/bigfile.jpg bs=1M count=6
curl -X POST http://localhost:<PORT>/book-image/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@/tmp/bigfile.jpg"
```

**Expected**: `HTTP 400` (multer rejects before handler runs)

```bash
# Attempt to upload a non-image file — must return 400
echo "I am not an image" > /tmp/test.txt
curl -X POST http://localhost:<PORT>/book-image/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@/tmp/test.txt"
```

**Expected**: `HTTP 400` `{ "error": "Only image files are permitted" }`

```bash
# Valid image upload — must succeed
curl -X POST http://localhost:<PORT>/book-image/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@/path/to/valid-cover.jpg" \
  -F "isbn=9780000000001"
```

**Expected**: `HTTP 200` `{ "message": "Upload successful", "fileName": "9780000000001.jpg" }`

---

## Scenario 6: Browser Sends No Placeholder Auth Header

**Validates**: FR-009, SC-005

1. Open the frontend (`http://localhost:5173` or Vite port) in a browser.
2. Make sure you are **not** logged in (clear localStorage if needed).
3. Open browser DevTools → Network tab.
4. Browse the public book list; click on books; submit the suggest-a-book form.
5. Inspect each request's headers.

**Expected**: No request should include an `Authorization` header of any kind.

Then:
1. Log in as admin and navigate to the dashboard.
2. Inspect requests to `/suggested_books`, `/contact_form`, `/books`.

**Expected**: Each of those requests includes `Authorization: Bearer <real-jwt>` — not
`Bearer Empty` or any placeholder value.

---

## Scenario 7: dotenv Initialized Once

**Validates**: FR-010

1. Add a temporary `console.log('dotenv loaded in:', __filename)` to `app.ts` after the
   dotenv call.
2. Start the backend and inspect the terminal output.

**Expected**: The log appears exactly once (at `app.ts`), not multiple times from `config.ts`
or `db.ts`.

3. Remove the temporary log before committing.

---

## Post-Validation Checklist

- [ ] All 7 scenarios pass
- [ ] No `501` status codes appear in any response during testing
- [ ] No `Authorization: Bearer Empty` header observed in browser DevTools
- [ ] Source tree is free of hardcoded service endpoints and credentials
- [ ] Upload of oversized and non-image files is rejected before storage
- [ ] Admin dashboard functions normally for all CRUD operations with a valid token
