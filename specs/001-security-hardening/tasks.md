---

description: "Task list for Security Hardening feature"
---

# Tasks: Security Hardening

**Input**: Design documents from `specs/001-security-hardening/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅ | quickstart.md ✅

**Tests**: No automated tests — acceptance verified manually per `quickstart.md` scenarios.

**Organization**: Tasks are grouped by user story to enable independent implementation and
testing of each story. All 5 user stories are security remediations; each can be
independently verified once the foundational middleware is in place.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- File paths are relative to the repository root

---

## Phase 1: Setup

**Purpose**: Environment configuration before any code changes.

- [X] T001 Add `MINIO_ENDPOINT=bucket-production-70f9.up.railway.app` to `backend/.env` and to Railway's environment variable configuration

**Checkpoint**: `backend/.env` contains `MINIO_ENDPOINT`. Railway config updated.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extract the `authenticate` middleware into a shared module so all routers can
import it. This blocks all of Phase 3 (US1) and must complete first.

**⚠️ CRITICAL**: No US1 router changes can begin until T002 is complete.

- [X] T002 Create `backend/src/middleware/auth.ts` — move the `authenticate` function verbatim from `backend/src/app.ts` lines 47–67 into this new file; add `export` keyword; import `Request`, `Response`, `NextFunction` from `'express'` and `jwt` from `'jsonwebtoken'`; read `JWT_SECRET` from `process.env.JWT_SECRET || 'missing-key'`
- [X] T003 Update `backend/src/app.ts` — replace `const http = require("http")` with `import http from 'http'`; add `import { authenticate } from './middleware/auth'`; remove the inline `authenticate` function definition (lines 47–67); the rest of the file is unchanged

**Checkpoint**: `backend/src/middleware/auth.ts` exists and exports `authenticate`.
`app.ts` imports it without TypeScript errors (`npm run build` in `backend/` passes).

---

## Phase 3: User Story 1 — Admin Operations Require Authentication (Priority: P1) 🎯 MVP

**Goal**: Every book mutation route, admin read route, and image upload route rejects requests
that carry no valid JWT.

**Independent Test**: Scenario 1 and Scenario 2 in `quickstart.md` — unauthenticated requests
to POST/PUT/DELETE `/books`, DELETE `/suggested_books`, GET `/suggested_books`, GET
`/contact_form`, and POST `/book-image/upload` must all return HTTP 401.

### Implementation for User Story 1

- [X] T004 [P] [US1] Update `backend/src/routes/bookRouter.ts` — replace `const expressRouter = require('express')` and `const router = expressRouter.Router()` with `import { Router } from 'express'; const router = Router()`; add `import { authenticate } from '../middleware/auth'`; add `authenticate` as the second argument (before the handler) on the `router.post('/'`, `router.put('/:id'`, `router.delete('/:id'`, and `router.delete('/'` lines
- [X] T005 [P] [US1] Update `backend/src/routes/suggestedBookRouter.ts` — same `require→import` fix for expressRouter; add `import { authenticate } from '../middleware/auth'`; add `authenticate` to `router.get('/'` (admin reads suggestions), `router.delete('/:id'`, and `router.delete('/'` — do NOT add authenticate to `router.post('/')` (that remains public)
- [X] T006 [P] [US1] Update `backend/src/routes/contactFormRouter.ts` — same `require→import` fix; add `import { authenticate } from '../middleware/auth'`; add `authenticate` to `router.get('/')` only — do NOT add to `router.post('/')` (public contact form submission)
- [X] T007 [P] [US1] Update `backend/src/routes/imageRouter.ts` — replace `const expressRouter = require('express')` and `const bookImageRouter = expressRouter.Router()` with `import { Router } from 'express'; const bookImageRouter = Router()`; add `import { authenticate } from '../middleware/auth'`; add `authenticate` between the route path and the `upload.single("image")` middleware on the `bookImageRouter.post("/upload"` line

**Checkpoint**: At this point, User Story 1 is fully functional and independently testable.
Run quickstart.md Scenarios 1 and 2.

---

## Phase 4: User Story 2 — Secrets Never Exposed in Source (Priority: P2)

**Goal**: MinIO endpoint sourced from `MINIO_ENDPOINT` env var; `dotenv` initialized only
once at `app.ts` entry point.

**Independent Test**: Scenario 3 in `quickstart.md` — `grep -r "bucket-production-70f9" backend/src/` returns nothing; application still connects to MinIO successfully.

### Implementation for User Story 2

- [X] T008 [P] [US2] Update `backend/src/utils/config.ts` — remove the `require('dotenv').config()` call on line 1; change `endPoint: "bucket-production-70f9.up.railway.app"` to `endPoint: process.env.MINIO_ENDPOINT!`; no other changes to this file
- [X] T009 [P] [US2] Update `backend/src/services/db.ts` — remove `require("dotenv").config()` on line 3; no other changes to this file

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently.
Run quickstart.md Scenario 3.

---

## Phase 5: User Story 3 — File Uploads Bounded and Type-Validated (Priority: P3)

**Goal**: Uploads exceeding 5 MB are rejected by multer before the handler runs; uploads with
a non-image MIME type are rejected inside the handler; missing images return 404 not 204;
debug log statements are removed.

**Independent Test**: Scenario 5 in `quickstart.md` — oversized file upload returns HTTP 400;
non-image file upload returns HTTP 400; valid image upload succeeds.

### Implementation for User Story 3

- [X] T010 [US3] Update `backend/src/routes/imageRouter.ts` (depends on T007 completing first):
  1. Change `const upload = multer({ storage: multer.memoryStorage() })` to `const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })`
  2. In the `POST /upload` handler, directly after the `if (!file)` block, add a MIME type check: `if (!file.mimetype.startsWith('image/')) { res.status(400).json({ error: 'Only image files are permitted' }); return; }`
  3. Change `res.status(204).end()` in the `GET /:imgName` error handler to `res.status(404).json({ error: 'Image not found' })`
  4. Remove all three `console.log` debug statements (`'file: ' + file`, `'fileName: ' + fileName`, `'End. Total size = ' + size`) — keep `console.error` lines

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently.
Run quickstart.md Scenario 4 (image not found → 404) and Scenario 5.

---

## Phase 6: User Story 4 — Invalid Input Returns Accurate Errors (Priority: P4)

**Goal**: All three service files use correct HTTP status codes: `400` for bad input, `404`
for not-found, `500` for unexpected DB failure — never `501`.

**Independent Test**: Scenario 4 in `quickstart.md` — submitting a book with a missing
required field returns HTTP 400; deleting a non-existent ID returns HTTP 404.

### Implementation for User Story 4

- [X] T011 [P] [US4] Update `backend/src/services/books.ts`:
  1. Change `interface Book` field types from `String` (capital S) to `string` (lowercase) for all 7 fields
  2. In `getMultiple`: change `throw new AppError(..., 501)` to `throw new AppError(..., 400)`
  3. In `getBook`: change `throw new AppError(..., 501)` to `throw new AppError(..., 400)`
  4. In `create`: change validation failure `throw new AppError("Validation failed", 501, ...)` to `throw new AppError("Validation failed", 400, ...)`; change creation failure `throw new AppError("Creation failed", 501, ...)` to `throw new AppError("Creation failed", 500, ...)`
  5. In `update`: change validation failures `throw new AppError(..., 501, ...)` to `throw new AppError(..., 400, ...)`; change not-found throw to `throw new AppError(..., 404, ...)`
  6. In `remove`: change not-found throw from `throw new AppError(..., 501)` to `throw new AppError(..., 404)`
  7. In `removeMultiple`: after the existing `query(...)` call, add affectedRows check: `const affectedRows = (result[0] as mysql.ResultSetHeader).affectedRows || 0; if (!affectedRows) { throw new AppError('No records deleted — IDs may not exist', 404); }`

- [X] T012 [P] [US4] Update `backend/src/services/suggestedBooks.ts`:
  1. Change `interface Book` field types from `String` to `string`
  2. In `getMultiple`: `501` → `400`
  3. In `getBook`: `501` → `400`
  4. In `suggest`: validation failure `501` → `400`; creation failure `501` → `500`
  5. In `remove`: not-found `501` → `404`
  6. In `removeMultiple`: add affectedRows check same as T011 step 7, throwing `404` if zero rows deleted

- [X] T013 [P] [US4] Update `backend/src/services/contactForm.ts`:
  1. Change `interface Form` field types from `String` to `string`
  2. In `getMultiple`: `501` → `400`
  3. In `getForm`: `501` → `400`
  4. In `create`: validation failure `501` → `400`; creation failure `501` → `500`

**Checkpoint**: At this point, User Stories 1–4 should all work independently.
Run quickstart.md Scenario 4 fully.

---

## Phase 7: User Story 5 — Browser Sends Only Valid Credentials (Priority: P5)

**Goal**: No placeholder auth headers sent from the browser; shared `Book` type and URL
builder utility centralize previously duplicated code; `nextPage` prev-check bug fixed;
loading state reset on page change.

**Independent Test**: Scenario 6 in `quickstart.md` — browser DevTools shows no
`Authorization` header on any unauthenticated request; logged-in admin requests include a
real bearer token.

### Implementation for User Story 5

- [X] T014 [P] [US5] Create `frontend/src/types/book.ts` — new file exporting the `Book` interface with fields: `id: number`, `isbn: string`, `title: string`, `author: string`, `description: string`, `ban_reason: string | null`, `banned_by: string | null`, `created_at: string`, `updated_at: string`, `cover_url: string`, `[key: string]: string | number | null`
- [X] T015 [P] [US5] Create `frontend/src/utils/api.ts` — new file; read `const URL_PREFIX = import.meta.env.VITE_URL_PREFIX` at module scope; export function `buildUrl(apiUrl: string, path: string): string` that returns `` `${URL_PREFIX}://${apiUrl}${path}` ``
- [X] T016 [P] [US5] Fix `frontend/src/App.tsx`:
  1. In `getAuthHeaders` (line 43–46): change the return when no token exists from `{Authorization: 'Bearer Empty'}` to `{}`
  2. In the `checkAuth` `useEffect` dependency array (line 95): remove `location.pathname` — the array should only contain `[getAuthHeaders]`
- [X] T017 [US5] Update `frontend/src/components/BookList/BookList.tsx` (depends on T014, T015):
  1. Add `import { Book } from '../../types/book'` at the top
  2. Add `import { buildUrl } from '../../utils/api'` at the top
  3. Remove the local `Book` interface definition (lines 6–18)
  4. Remove `const URL_PREFIX = import.meta.env.VITE_URL_PREFIX` (line 5)
  5. In `fetchBooks`, change `` `${URL_PREFIX}://${apiUrl}/books?page=${pageNumber}` `` to `` buildUrl(apiUrl, `/books?page=${pageNumber}`) ``
  6. In `nextPage`, change `if (nextPage == 1)` (line 91) to `if (pageNumber === 1)`
  7. Add `setLoading(true)` at the top of the `fetchBooks` async function body (before the try block) so the loading indicator reappears on page change
- [X] T018 [US5] Update `frontend/src/components/AdminBookList/AdminBookList.tsx` (depends on T014, T015):
  1. Same import additions as T017 (use path `../../types/book` and `../../utils/api`)
  2. Remove local `Book` interface and `URL_PREFIX` constant
  3. Change fetch URL to `buildUrl(apiUrl, `/${bookList}?page=${pageNumber}`)`
  4. Fix `nextPage` prev check: `if (nextPage == 1)` → `if (pageNumber === 1)`
  5. Add `setLoading(true)` at top of `fetchBooks` body
- [X] T019 [US5] Update `frontend/src/components/FeaturedBook/FeaturedBook.tsx` (depends on T014, T015):
  1. Add `import { Book } from '../../types/book'`
  2. Add `import { buildUrl } from '../../utils/api'`
  3. Remove local `Book` interface and `URL_PREFIX` constant
  4. Change fetch URL from `` `${URL_PREFIX}://${apiUrl}/books/featured` `` to `buildUrl(apiUrl, '/books/featured')`
- [X] T020 [US5] Update `frontend/src/components/generic/Card/BookCard.tsx` (depends on T014, T015):
  1. Add `import { Book } from '../../../types/book'`
  2. Add `import { buildUrl } from '../../../utils/api'`
  3. Remove local `Book` interface and `URL_PREFIX` constant
  4. Change both image `src` expressions from `` `${URL_PREFIX}://${apiUrl}/book-image/${data.cover_url}` `` to `buildUrl(apiUrl, `/book-image/${data.cover_url}`)`

**Checkpoint**: All 5 user stories now independently functional. Run quickstart.md Scenario 6.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Verify compilation, lint, and run end-to-end validation across all stories.

- [X] T021 [P] Run `cd backend && npm run build` — fix any TypeScript compilation errors introduced by the type changes (`String`→`string`) or new imports
- [X] T022 [P] Run `cd frontend && npm run lint` — fix any ESLint errors introduced by new imports or removed declarations
- [ ] T023 Run full manual validation per `specs/001-security-hardening/quickstart.md` — execute all 7 scenarios and confirm each passes; check all scenarios listed in the Post-Validation Checklist at the bottom of that file

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — do this first (env var needed before deploy)
- **Foundational (Phase 2)**: Depends on Phase 1 — T002 blocks all of US1 router tasks
- **US1 (Phase 3)**: T004–T007 all depend on T002; they can run in parallel with each other
- **US2 (Phase 4)**: T008, T009 depend only on T001; can run in parallel with Phase 3
- **US3 (Phase 5)**: T010 depends on T007 (same file — imageRouter.ts)
- **US4 (Phase 6)**: T011–T013 are independent of all other phases; can run in parallel with Phases 3–5
- **US5 (Phase 7)**: T014–T016 can run in parallel; T017–T020 depend on T014 and T015
- **Polish (Phase 8)**: Depends on all phases completing

### User Story Dependencies

- **US1 (P1)**: Depends on T002 (auth middleware) only
- **US2 (P2)**: No story dependencies — can run after T001
- **US3 (P3)**: Depends on T007 (imageRouter US1 changes must be in before adding more to same file)
- **US4 (P4)**: No story dependencies — fully independent of all other stories
- **US5 (P5)**: No backend dependencies — frontend changes are fully independent

### Within Each User Story

- Models/types before components that use them
- New files before existing files that import them
- Same-file edits across stories must be sequential (imageRouter.ts: T007 before T010)

### Parallel Opportunities

```bash
# After T002 completes, launch US1 router changes together:
T004 — bookRouter.ts
T005 — suggestedBookRouter.ts
T006 — contactFormRouter.ts
T007 — imageRouter.ts (auth section)

# US2 and US4 can run concurrently with US1:
T008 — config.ts
T009 — db.ts
T011 — services/books.ts
T012 — services/suggestedBooks.ts
T013 — services/contactForm.ts

# US5 new files launch together:
T014 — types/book.ts
T015 — utils/api.ts
T016 — App.tsx

# After T014 + T015 complete, US5 components launch together:
T017 — BookList.tsx
T018 — AdminBookList.tsx
T019 — FeaturedBook.tsx
T020 — BookCard.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002, T003)
3. Complete Phase 3: US1 — T004, T005, T006, T007
4. **STOP and VALIDATE**: Run quickstart.md Scenarios 1 and 2
5. All write routes now require authentication — biggest security risk closed

### Incremental Delivery

1. MVP: Phases 1–3 → US1 validated → deploy
2. Add US2 (T008, T009) → run Scenario 3 → deploy
3. Add US3 (T010) → run Scenarios 4–5 → deploy
4. Add US4 (T011–T013) → run Scenario 4 fully → deploy
5. Add US5 (T014–T020) → run Scenario 6 → deploy
6. Polish: T021–T023 → full validation → final deploy

### Single Developer (Fastest Path)

With one developer, run stories in priority order (P1→P2→P3→P4→P5), treating each phase
as a focused work session. Within each phase, parallelize where noted with [P].

---

## Notes

- [P] tasks = different files, no dependencies within the phase
- [Story] label maps each task to its user story for traceability
- T010 must come after T007 (both edit `backend/src/routes/imageRouter.ts`)
- T017–T020 must come after T014 and T015 (import the new shared types/utils)
- No automated tests — use `quickstart.md` scenarios after each checkpoint
- Commit after each checkpoint (after each user story phase completes)
