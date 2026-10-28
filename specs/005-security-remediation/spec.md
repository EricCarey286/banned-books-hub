# Feature Specification: Security Remediation

**Feature Branch**: `005-security-remediation` (no branch created; no `before_specify` hook is registered)

**Created**: 2026-10-28

**Status**: Draft

**Input**: User description: "Fix all of the security and configuration gaps identified in the application review: fallback JWT secret, plain-text admin password, login brute-force protection, admin token exposed to page scripts, spam on public write endpoints, upload type spoofing, internal error leakage, conflicting object-storage configuration, unused dependencies and environment variables, and out-of-date documentation."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The Service Refuses to Run Without a Strong Signing Secret (Priority: P1)

An operator deploys or starts the service. If the secret used to sign admin sessions is missing or too short, the service stops immediately with a clear message instead of running with a publicly known fallback value. This makes it impossible for a misconfigured environment to accept forged admin credentials.

**Why this priority**: This is the only gap that lets an attacker become an administrator without knowing the admin password. A silent fallback is the most dangerous kind of failure because nothing looks broken.

**Independent Test**: Start the service with the signing secret unset, then with a value shorter than 32 characters. Each attempt must fail to start and print a message naming the missing setting. Start it with a valid value and it must run.

**Acceptance Scenarios**:

1. **Given** the signing secret is not set, **When** the service starts, **Then** it exits with a non-zero status and a message naming the missing setting, and it does not accept any requests.
2. **Given** the signing secret is shorter than 32 characters, **When** the service starts, **Then** it exits with a non-zero status and a message stating the minimum length.
3. **Given** a valid signing secret, **When** the service starts, **Then** it runs normally and no code path uses a fallback value.
4. **Given** a token signed with the old fallback value, **When** it is presented to a protected route, **Then** it is rejected.

---

### User Story 2 - Admin Password Is Stored and Checked as a Hash (Priority: P1)

The admin password is no longer kept in readable form in the environment. Operators store a one-way hash of it. At login, the submitted password is checked against the hash in a way that takes the same time whether or not the password is correct, and the service refuses to start if no hash is configured.

**Why this priority**: A readable password in configuration is exposed to anyone who can read the environment (deployment dashboards, logs, backups). Together with Story 1 it closes the path to admin access.

**Independent Test**: Generate a hash for a test password, configure it, and confirm the correct password logs in and an incorrect one does not. Confirm the plain password no longer appears anywhere in the service's configuration or code.

**Acceptance Scenarios**:

1. **Given** a configured password hash, **When** the admin logs in with the correct password, **Then** they receive a session.
2. **Given** a configured password hash, **When** someone logs in with an incorrect password, **Then** they receive the same generic "invalid credentials" response as for an unknown username, with no hint about which part was wrong.
3. **Given** no password hash is configured, **When** the service starts, **Then** it refuses to start and names the missing setting.
4. **Given** the service's configuration, **When** an operator inspects it, **Then** no plain-text admin password is present.

---

### User Story 3 - Repeated Failed Logins Are Blocked (Priority: P1)

Someone guessing the admin password is stopped after a small number of failures from the same address, long before the general request limit would matter. Legitimate admins who mistype a password a few times are not locked out for long.

**Why this priority**: The current general limit allows about 100 guesses per address every 15 minutes, which is enough to guess a weak password over time.

**Independent Test**: Submit five incorrect passwords from one address, then submit the correct password. The sixth attempt must be refused with a "try again later" response and no session is issued until the block expires.

**Acceptance Scenarios**:

1. **Given** five failed login attempts from one address within 15 minutes, **When** a sixth attempt is made from that address, **Then** the attempt is refused with a "too many attempts, try again later" response even if the password is correct.
2. **Given** a blocked address, **When** the block window passes, **Then** login is allowed again.
3. **Given** attempts from a different address, **When** they are made while another address is blocked, **Then** they are not affected.
4. **Given** a successful login, **When** it occurs before the limit is reached, **Then** the failure count for that address is reset.

---

### User Story 4 - Admin Session Is Not Readable by Page Scripts (Priority: P2)

After logging in, the admin's session credential is held in a cookie that page scripts cannot read. A cross-site scripting bug on the site therefore cannot copy the admin session. Logging out clears the cookie on the server side. Admin pages continue to work as before for the admin.

**Why this priority**: Important defense in depth, but it depends on a deployment decision (see Clarification 1) and Stories 1 to 3 already close the most direct paths to admin access.

**Independent Test**: Log in through the admin screen, then inspect what page scripts can read. The session credential must not be visible to scripts. Use the admin dashboard to confirm it still loads data, then log out and confirm protected requests are refused.

**Acceptance Scenarios**:

1. **Given** a successful login, **When** page scripts try to read the stored session credential, **Then** they find nothing.
2. **Given** an active session, **When** the admin opens the dashboard, **Then** protected data loads without the admin re-entering credentials.
3. **Given** an active session, **When** the admin logs out, **Then** the session credential is cleared and protected requests are refused afterwards.
4. **Given** a state-changing request sent from another website using the admin's session, **When** it reaches the service, **Then** it is refused.
5. **Given** tokens stored by the previous version in browser storage, **When** a visitor loads the site after the change, **Then** the old stored token is removed and the visitor is treated as logged out.

---

### User Story 5 - Public Submission Forms Resist Spam (Priority: P2)

Visitors can still suggest a book or send a contact message. Automated bots are stopped by a human-verification challenge and by a stricter per-address limit on each public submission endpoint. The contact endpoint accepts one entry per request, not a batch.

**Why this priority**: Spam fills the admin review queues and the contact inbox. It is annoying rather than a breach, so it ranks below the access fixes.

**Independent Test**: Submit a suggestion without completing the verification challenge and confirm it is refused. Complete the challenge and submit normally. Send eleven valid submissions from one address within an hour and confirm the last is refused. Send a contact request containing two entries and confirm it is refused.

**Acceptance Scenarios**:

1. **Given** a public submission without a valid verification response, **When** it is sent, **Then** it is refused and nothing is stored.
2. **Given** a valid verification response, **When** a suggestion or contact message is sent, **Then** it is stored as it is today.
3. **Given** more than ten public submissions to one endpoint from one address within an hour, **When** another is sent, **Then** it is refused with a "too many submissions" response.
4. **Given** a contact request containing more than one entry, **When** it is sent, **Then** it is refused and nothing is stored.
5. **Given** a contact request containing zero entries, **When** it is sent, **Then** it is refused with the existing validation message.

---

### User Story 6 - Uploaded Images Are Checked by Content (Priority: P2)

When an admin uploads a cover image, the service checks the file's actual contents, not the type the browser declared. Only real JPEG, PNG, WebP, or GIF files are stored. A non-image renamed with an image type is rejected.

**Why this priority**: The current check can be bypassed by sending any file with an image type label, which can store unexpected content in the public image bucket.

**Independent Test**: Upload a real PNG, which succeeds. Upload a text file declared as `image/png`, which is refused. Upload a real JPEG renamed to `.txt` declared as `text/plain`, which is refused.

**Acceptance Scenarios**:

1. **Given** a genuine JPEG, PNG, WebP, or GIF, **When** an admin uploads it, **Then** it is stored and the upload succeeds.
2. **Given** a file whose contents are not one of the allowed types but whose declared type is an image, **When** it is uploaded, **Then** it is refused and nothing is stored.
3. **Given** a file over the size limit, **When** it is uploaded, **Then** it is refused.
4. **Given** an unauthenticated upload, **When** it is sent, **Then** it is refused.

---

### User Story 7 - Visitors Never See Internal Error Details in Production (Priority: P2)

When something goes wrong, visitors see a short, generic message. The full technical detail, including storage-provider errors, goes to the server log only, where operators can read it. Development environments may still show detail to make debugging easier.

**Why this priority**: Error bodies currently reveal storage internals and error structures that help an attacker map the system.

**Independent Test**: Trigger a validation error, a storage error (for example by stopping the storage service in a test environment), and an unexpected server error. In production mode, each response body must contain only a generic message and a status code, and the server log must contain the full detail.

**Acceptance Scenarios**:

1. **Given** a production environment, **When** an upload fails inside the storage service, **Then** the visitor receives a generic "upload failed" message with no storage error details.
2. **Given** a production environment, **When** a validation error occurs, **Then** the visitor receives the validation message and the list of invalid field names, but no stack trace, internal error object, or database message.
3. **Given** any error in production, **When** it is handled, **Then** the full error is written to the server log.

---

### User Story 8 - One Object-Storage Configuration (Priority: P3)

The service uses one object-storage connection, configured from one set of settings, for both uploads and the image links it hands to visitors. Image links point at the same storage host and bucket that uploads go to. A misconfiguration is detected at startup rather than producing broken images.

**Why this priority**: Currently two connections are configured differently, so image links can silently point at the wrong host or bucket. This affects correctness rather than access, so it ranks below the security items.

**Independent Test**: Start the service with the documented settings and confirm that a book's image link resolves to the image uploaded for that book. Start it with the bucket setting missing and confirm the service reports the missing value at startup.

**Acceptance Scenarios**:

1. **Given** the documented storage settings, **When** a book list is requested, **Then** each image link points at the configured storage host and the configured bucket.
2. **Given** an image uploaded through the admin screen, **When** its link is requested, **Then** the link resolves to that image.
3. **Given** a required storage setting is missing, **When** the service starts, **Then** it reports the missing setting by name.
4. **Given** the codebase, **When** it is searched, **Then** there is exactly one place that creates the storage connection.

---

### User Story 9 - Lean Dependencies and Accurate Configuration (Priority: P3)

Packages and environment settings the service does not use are removed. Every setting that remains is documented, and the documentation matches the code.

**Why this priority**: Unused code and misleading documentation waste reviewer attention and cause wrong configuration in new environments. No direct access risk.

**Independent Test**: Search the codebase for each removed package and setting and confirm no references remain. Compare the documented settings against the settings the code reads and confirm they match.

**Acceptance Scenarios**:

1. **Given** the cleaned codebase, **When** dependencies are listed, **Then** every listed package is imported somewhere in the service.
2. **Given** the cleaned configuration template, **When** it is compared with the settings the service reads, **Then** there are no unused entries and no missing entries.
3. **Given** the README, the project guidance file, and the walkthrough, **When** they describe object storage, authentication, and environment settings, **Then** they match the current behavior.

---

### Edge Cases

- What happens when an old token (signed under the previous secret, or stored in browser storage) is presented? It is rejected, and the visitor is shown the login screen.
- How does the system handle a password hash that is malformed? Startup refuses with a message naming the setting; the plain check is never used as a fallback.
- What happens when the failure counter storage is unavailable? Login still works but relies on the general per-address limit; the failure is logged. (Assumption: availability of the counter is preferred to locking out legitimate admins.)
- What happens when a verification challenge service is unreachable? Public submissions are refused with a "try again later" message rather than accepted unverified.
- What happens when a user uploads a valid image whose declared type is `image/jpeg` but whose bytes are PNG? It is accepted only if the bytes are an allowed type; the stored content type is taken from the verified bytes.
- What happens when a cached image link has expired? The service generates a new link on the next request; no visitor sees an expired link for more than the configured link lifetime.
- What happens when an admin logs in from two browsers? Each browser holds its own session; logging out in one does not require the other to be cleared unless the session secret is rotated.

## Requirements *(mandatory)*

### Functional Requirements

**Signing secret (Story 1)**

- **FR-001**: The service MUST refuse to start when the session signing secret is not set.
- **FR-002**: The service MUST refuse to start when the session signing secret is shorter than 32 characters.
- **FR-003**: The service MUST NOT contain any fallback or default value for the session signing secret.

**Admin password (Story 2)**

- **FR-004**: The admin password MUST be stored only as a one-way hash, configured through an environment setting. No plain-text admin password setting may be read by the service.
- **FR-005**: The service MUST refuse to start when the password hash setting is missing or does not parse as a valid hash.
- **FR-006**: Password comparison MUST take the same time for correct and incorrect passwords of the same length, and MUST NOT short-circuit on the first differing character.
- **FR-007**: Login failures for a wrong password and for an unknown username MUST return identical responses.

**Login brute-force protection (Story 3)**

- **FR-008**: Login attempts MUST be limited to five failed attempts per address within a 15-minute window.
- **FR-009**: After the limit is reached, further login attempts from that address MUST be refused for the remainder of the window, including correct passwords, with a "too many attempts" response.
- **FR-010**: A successful login MUST reset the failure count for that address.
- **FR-011**: The login limit MUST apply in addition to, not instead of, the general per-address request limit.

**Session credential (Story 4)**

- **FR-012**: On successful login, the session credential MUST be delivered as a cookie that page scripts cannot read.
- **FR-013**: The session cookie MUST be marked so that it is sent only over secure connections and only for same-site requests. The frontend and API MUST be served from subdomains of one domain (Clarification 1, option B).
- **FR-014**: The service MUST provide a logout action that clears the session cookie.
- **FR-015**: State-changing requests that rely on the session cookie MUST be protected against cross-site request forgery.
- **FR-016**: The admin screen MUST NOT store the session credential in browser storage.
- **FR-017**: On load, the frontend MUST remove any token left in browser storage by the previous version.
- **FR-018**: The session lifetime MUST remain 24 hours unless otherwise specified in Clarification 1 resolution.

**Public submission protection (Story 5)**

- **FR-019**: `POST /suggested_books` and `POST /contact_form` MUST require a valid human-verification response before storing any data.
- **FR-020**: Each public submission endpoint MUST be limited to ten submissions per address per hour, in addition to the general per-address limit.
- **FR-021**: `POST /contact_form` MUST accept exactly one entry per request and refuse requests containing zero or more than one entry.
- **FR-022**: If the verification service cannot be reached, public submissions MUST be refused, not accepted without verification.

**Upload content checking (Story 6)**

- **FR-023**: Uploads MUST be accepted only when the file's leading bytes match JPEG, PNG, WebP, or GIF.
- **FR-024**: The declared file type MUST NOT be used as the basis for acceptance.
- **FR-025**: The stored content type MUST be derived from the verified file contents.
- **FR-026**: The 5 MB upload size limit MUST be retained.

**Error responses (Story 7)**

- **FR-027**: In production mode, error responses MUST contain only a message and, for validation errors, the list of invalid field names.
- **FR-028**: In production mode, error responses MUST NOT include stack traces, storage-provider error objects, or database error text.
- **FR-029**: The full detail of every error MUST be written to the server log.
- **FR-030**: Development mode MAY include error detail in responses.

**Object storage (Story 8)**

- **FR-031**: The service MUST create exactly one object-storage connection, shared by uploads and by image-link generation.
- **FR-032**: Object-storage settings MUST be read from one documented set of environment settings.
- **FR-033**: The service MUST refuse to start when a required object-storage setting is missing.
- **FR-034**: Image links MUST point at the configured storage host and bucket.
- **FR-035**: The storage host and bucket MUST be verified in the deployed development and production environments before this feature is released, and the result recorded in the release notes.

**Dependencies and configuration (Story 9)**

- **FR-036**: The unused session-middleware package and the unused session-secret setting MUST be removed.
- **FR-037**: The password-hashing package MUST be used for the admin password check.
- **FR-038**: The environment template and the environment-variable reference MUST list exactly the settings the service reads.

**Documentation (Story 9)**

- **FR-039**: The README, the project guidance file (`CLAUDE.md`), and the developer walkthrough MUST be updated to describe the new authentication, storage, configuration, and error-handling behavior in the same change.

### Key Entities *(include if feature involves data)*

- **Admin Session**: The proof of a successful admin login. Attributes: issue time, expiry (24 hours), the admin identity. Delivered to the browser as a protected cookie; never stored in readable browser storage.
- **Login Attempt Record**: Per-address count of recent failed admin logins and the start of the current window. Expires after 15 minutes.
- **Submission Rate Record**: Per-address count of recent public submissions per endpoint. Expires after one hour.
- **Admin Password Hash**: The stored one-way representation of the admin password. Provided through configuration; never the plain password.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Starting the service without a valid signing secret fails in 100% of tested cases, and the failure message names the missing or too-short setting.
- **SC-002**: No request that uses a token signed with a previously known or default value is accepted in any test run.
- **SC-003**: The admin password does not appear in plain text in any configuration template, environment reference, or source file.
- **SC-004**: After five failed login attempts from one address, the sixth attempt is refused in 100% of tested cases, including attempts with the correct password.
- **SC-005**: Page-accessible storage holds none of the admin session credential after login, verified across all admin screens.
- **SC-006**: Cross-site state-changing requests carrying the admin session are refused in 100% of tested cases.
- **SC-007**: Public submissions without a valid verification response are stored in 0% of tested cases.
- **SC-008**: The eleventh public submission from one address to the same endpoint within an hour is refused in 100% of tested cases.
- **SC-009**: Contact requests containing more than one entry are refused in 100% of tested cases.
- **SC-010**: Non-image content with an image declared type is refused in 100% of tested cases, and genuine JPEG, PNG, WebP, and GIF files are accepted in 100% of tested cases.
- **SC-011**: In production mode, no error response body in tested cases contains storage-provider or database error text.
- **SC-012**: Every book image link produced in the deployed environments resolves to an existing image in the configured bucket, verified before release.
- **SC-013**: A reviewer can set up a new environment using only the README and the environment template, with no settings left undocumented or unused.

## Clarifications

### Session 2026-10-28

- Q1 (resolved 2026-10-28, revised the same day): The frontend and API are served from subdomains of one domain, and the admin cookie is same-site (option B). Option A was chosen first but fails in Safari, which blocks third-party cookies. See Clarification 1 below.

## Assumptions

- **Scope**: All ten gaps from the review are in scope. Changes are confined to the existing frontend and backend; no new services are added except the human-verification provider and, if needed, the counter storage already provided by Redis.
- **Password migration**: An operator generates the hash from the current admin password once, sets the hash setting in each environment, and then removes the plain password setting. The plain setting is not read after cut-over.
- **Session lifetime**: The 24-hour session lifetime is kept.
- **Login limit storage**: Failed-login counters are stored in the existing Redis cache so they are shared across instances. If Redis is unavailable, the general per-address limit still applies.
- **Public-form payload**: The public forms currently send entries in a list. The frontend is updated, if needed, so each request carries one entry; the user-visible form behavior does not change.
- **Verification provider**: A third-party human-verification service is used. The choice of provider is an implementation decision made during planning, not in this spec.
- **Existing sessions**: Tokens issued before release are invalidated by the new signing secret or by removal from browser storage. Admins log in once after release.
- **Image formats**: Only JPEG, PNG, WebP, and GIF are allowed. Other formats are out of scope.
- **Domain**: One registrable domain is owned by the project, with the frontend on one subdomain and the API on another (for example `app.` and `api.`). The domain name is required before deploy.
- **Deployment verification**: Storage host and bucket checks (FR-035) require access to the Railway environments. They are a release gate, performed by the operator, not by the implementation.
- **Documentation**: The developer walkthrough is currently a working file outside the repository. It is updated in place as part of this feature, and the planning phase decides whether it moves into `docs/`.

### Clarification 1: Session cookie across separate domains

**Context**: FR-012 to FR-016 require the admin session in an HTTP-only cookie. The frontend and the API are deployed on separate Railway domains, which browsers treat as separate sites.

**What we need to know**: Which cookie arrangement should be used? The choice changes the cross-site protection and the deployment work.

**Suggested Answers**:

| Option | Answer | Implications |
|--------|--------|--------------|
| A | Cross-site cookie with CSRF token (Recommended) | Works with the current two-domain deployment. Needs a separate anti-forgery token on state-changing requests. Slightly more code; no infrastructure change. |
| B | Same-site setup via a single domain or proxy route | Strongest cookie protection with no extra token. Requires routing API calls through the frontend domain, which is a deployment change in Railway. |
| C | Keep the token in browser storage | No migration work, but page scripts keep access to the admin session, so this option does not address the XSS gap. Not recommended. |
| Custom | Provide your own answer | Describe the arrangement; it will be recorded in this section and reflected in FR-012 to FR-016. |

**Your choice**: B, same-site subdomains of one domain (answered 2026-10-28). FR-012 to FR-015 apply, with FR-013 requiring a same-site cookie. This needs a custom domain and Railway custom-domain configuration for the frontend and API. The CSRF token from FR-015 stays in place as defense in depth.

## Notes on Verification

Quality checklist results are recorded in `specs/005-security-remediation/checklists/requirements.md`.
