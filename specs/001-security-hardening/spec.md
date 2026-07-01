# Feature Specification: Security Hardening

**Feature Branch**: `001-security-hardening`

**Created**: 2026-06-24

**Status**: Draft

**Input**: User description: "Bring all code up to strongest security practices. Include api endpoints, public access points, ui, and integrations with backend services"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin Operations Require Authentication (Priority: P1)

An administrator attempts to add, edit, or delete a book record. The system verifies the
admin's identity before allowing any of these operations to proceed. If no valid login session
exists, the request is rejected and the admin is redirected to login. No data is modified
without a verified identity.

**Why this priority**: This is the most critical security gap in the current system. Unauthenticated
users can currently modify or delete the entire book catalog. Closing this gap prevents
unauthorized data tampering and is the foundation of all other security work.

**Independent Test**: Navigate to the book management API without a login token and attempt to
add, edit, or delete a book. The system must reject each operation. Then log in as admin and
repeat — operations must succeed.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user, **When** they attempt to add a book, **Then** the system
   returns an "authorization required" error and makes no database change.
2. **Given** an unauthenticated user, **When** they attempt to edit a book, **Then** the
   system rejects the request without modifying any record.
3. **Given** an unauthenticated user, **When** they attempt to delete a book, **Then** the
   system rejects the request without removing any record.
4. **Given** a logged-in admin, **When** they perform any book management operation, **Then**
   the operation succeeds normally.

---

### User Story 2 - Secrets Are Never Exposed in Source Code (Priority: P2)

All credentials, service addresses, and signing keys that the application needs to run are
stored in secure configuration outside the codebase. Anyone who reads the source code sees
no passwords, no API keys, and no service URLs with embedded secrets. This includes the
database connection, the image storage service, and the authentication signing key.

**Why this priority**: Hardcoded secrets in source code are exposed to everyone with repository
access and are cached in version control history. Removing them eliminates a class of credential
leakage risk entirely.

**Independent Test**: Search the entire source tree for known secret values (service endpoint
hostnames, key strings). None should appear. Verify the application still starts and connects
to all services correctly when run with a properly configured environment file.

**Acceptance Scenarios**:

1. **Given** the full source code, **When** searched for any external service address or
   credential, **Then** no such values appear — only references to configuration variables.
2. **Given** a missing or empty required secret, **When** the application starts, **Then** it
   either refuses to start or logs a clear error rather than silently using a placeholder value.
3. **Given** a valid environment configuration file, **When** the application starts,
   **Then** all external service connections (database, image storage) succeed normally.

---

### User Story 3 - File Uploads Are Bounded and Type-Validated (Priority: P3)

When an admin uploads a book cover image, the system only accepts files that are actual
images and are within a reasonable size limit. Attempts to upload non-image files or
excessively large files are rejected with a clear error before any data reaches storage.

**Why this priority**: An unbounded file upload is a resource exhaustion attack vector. Allowing
non-image files bypasses content expectations and could introduce unexpected data into storage.

**Independent Test**: Attempt to upload a file larger than the size limit — the system must
reject it. Attempt to upload a non-image file (e.g., a PDF) — the system must reject it.
Upload a valid, small image — it must succeed.

**Acceptance Scenarios**:

1. **Given** an admin uploads an image file exceeding the size limit, **When** the upload is
   submitted, **Then** the server rejects it with a descriptive error before storing anything.
2. **Given** an admin uploads a non-image file, **When** the upload is submitted, **Then**
   the server rejects it with an appropriate error.
3. **Given** an admin uploads a valid image within the size limit, **When** the upload is
   submitted, **Then** the image is stored and the success response is returned.

---

### User Story 4 - Invalid Input Returns Accurate Error Responses (Priority: P4)

When users or integrations submit malformed or incomplete data to the system, the response
clearly indicates what was wrong. Error codes accurately reflect the nature of the problem:
a missing required field reads differently from an unrecognized operation. Integrations can
rely on these error codes to route failures appropriately.

**Why this priority**: Incorrect HTTP status codes mislead consuming clients, make debugging
harder, and mask the difference between client errors and server errors. Fixing this ensures
error semantics can be trusted throughout the system.

**Independent Test**: Submit a book creation request with a missing required field. The
response code must indicate a client input error (not a server capability error). Submit a
book update with a non-existent ID — the response must indicate the resource was not found.

**Acceptance Scenarios**:

1. **Given** a request with a missing or malformed required field, **When** processed,
   **Then** the response indicates a client input problem (not a server error).
2. **Given** a request referencing a resource that does not exist, **When** processed,
   **Then** the response indicates the resource was not found.
3. **Given** a request for an image that does not exist in storage, **When** processed,
   **Then** the response indicates the resource was not found (not "no content").

---

### User Story 5 - Browser Client Sends Only Valid Credentials (Priority: P5)

When a visitor uses the public-facing website, the browser never sends placeholder or
fabricated authorization tokens to the backend. Authentication headers are only included
in requests when the user has a real, active login session. Unauthenticated visitors'
requests arrive at the server without any authorization header.

**Why this priority**: Sending fake/empty tokens on every unauthenticated request creates noise
in access logs, can trigger unintended behavior in auth middleware, and is a code smell that
can mask deeper state management issues in the frontend.

**Independent Test**: Open the browser's developer tools and observe network requests on the
public home page while not logged in. No request should include an `Authorization` header
with a placeholder or empty value. Log in as admin and observe requests to protected
endpoints — they must include a valid bearer token.

**Acceptance Scenarios**:

1. **Given** a visitor is not logged in, **When** they browse the public book list,
   **Then** no `Authorization` header is sent with their requests.
2. **Given** a visitor is not logged in, **When** they submit a book suggestion or contact
   form, **Then** no `Authorization` header is sent.
3. **Given** an admin is logged in, **When** they access the admin dashboard,
   **Then** requests to protected endpoints include a valid bearer token.

---

### Edge Cases

- What happens when an admin's session token expires while they are actively using the
  dashboard — are they gracefully redirected to login?
- What happens when the image storage service is unavailable during an upload attempt — does
  the system return a meaningful error rather than hanging?
- What happens when a bulk delete operation is submitted but no matching records exist —
  does the system report the true outcome rather than a false success?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST require a valid admin session for all book creation, update, and
  deletion operations.
- **FR-002**: The system MUST reject requests to protected endpoints that carry no
  authorization credential, an expired credential, or an invalid credential.
- **FR-003**: The admin login process MUST use a signing key sourced exclusively from
  environment configuration; no default or fallback value may be used in production.
- **FR-004**: The image upload endpoint MUST enforce a maximum file size (5 MB) and reject
  files that exceed it.
- **FR-005**: The image upload endpoint MUST validate that the uploaded file is an image type
  before storing it.
- **FR-006**: All external service addresses and credentials (database, image storage) MUST be
  sourced from environment configuration with no hardcoded fallback values.
- **FR-007**: A missing required field or incorrect field type in a request MUST produce a
  response indicating a client input error.
- **FR-008**: A request for a resource that does not exist (including images) MUST produce a
  response indicating the resource was not found, not a "no content" response.
- **FR-009**: The browser client MUST NOT include an authorization header on requests made
  while the user is not logged in.
- **FR-010**: Configuration initialization MUST occur exactly once at application startup;
  environment variables MUST be available to all modules without re-initialization.
- **FR-011**: Operations that modify multiple records MUST verify the actual outcome and return
  an accurate success or failure response.
- **FR-012**: Debug and diagnostic log output MUST NOT appear in production code paths.

### Key Entities

- **Admin Session**: Represents an authenticated admin's active login. Has a validity window;
  expires after a configured period. Required to authorize any write operation.
- **Upload Constraint**: Defines the rules an uploaded file must satisfy (max size, permitted
  content types) before being accepted.
- **Error Response**: A structured message returned when a request cannot be fulfilled.
  Carries a semantic code (input error, not found, unauthorized, server error) and a
  human-readable reason.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of book creation, update, and deletion requests from unauthenticated
  sources are rejected — zero unauthorized modifications reach the database.
- **SC-002**: Zero secret values (passwords, keys, endpoint URLs) appear anywhere in the
  application source tree.
- **SC-003**: All file upload rejections (oversized or wrong type) occur before any data is
  written to storage — zero invalid files stored.
- **SC-004**: 100% of error responses carry an HTTP status code that accurately classifies
  the failure (client input error, not-found, unauthorized, or server error) — zero responses
  use an incorrect "not implemented" code for validation failures.
- **SC-005**: Zero unauthenticated browser requests include an authorization header of any
  kind when the user is not logged in.
- **SC-006**: All bulk record operations report the actual number of records affected —
  zero false-success responses for operations that changed nothing.

## Assumptions

- The application is deployed on Railway with TLS terminated at the proxy layer; the backend
  itself handles HTTP internally.
- There is a single admin user; multi-user or role-based access control is out of scope for
  this feature.
- The 5 MB file size limit for image uploads is a reasonable default for book cover images;
  it may be made configurable in a future iteration.
- Permitted image content types include JPEG, PNG, GIF, and WebP; other formats are rejected.
- Performance targets for the existing endpoints remain unchanged; this feature does not
  introduce new latency requirements beyond what authentication checks naturally add.
- Automated tests are not in scope for this feature; acceptance is verified through manual
  end-to-end testing against the running application.
- Public read endpoints (browsing the book list, viewing featured books) remain fully public
  and do not require authentication.
