# Research: Database Migration CI/CD Pipeline

**Date**: 2026-08-05

**Purpose**: Resolve technical decisions for database migration pipeline implementation.

---

## Decision 1: Migration Tool Selection

**Research Question**: Which migration tool best fits Banned Books Hub's infrastructure, existing tech stack, and operational model?

### Candidates Evaluated

1. **Flyway** (Java-based, supports SQL/Java migrations)
   - ✅ Pros: Battle-tested, strong community, excellent CLI tooling, MariaDB/MySQL native support
   - ✅ Pros: Supports SQL-only migrations (no Java needed if using pure SQL)
   - ❌ Cons: Requires Java runtime (additional dependency), overkill for small-scale migrations
   - ❌ Cons: CLI-based (not Node.js native)

2. **Liquibase** (Java-based, XML/YAML/JSON/SQL formats)
   - ✅ Pros: Highly flexible, supports multiple formats, strong enterprise backing
   - ❌ Cons: Steep learning curve, XML/YAML setup overhead for simple migrations
   - ❌ Cons: Requires Java runtime, heavier than needed

3. **Custom Node.js Script** (using mysql2 directly)
   - ✅ Pros: No external dependencies, full control, aligns with existing Node.js backend
   - ✅ Pros: Lightweight, can be tested as part of backend test suite
   - ✅ Pros: Integrates seamlessly with existing TypeScript codebase
   - ❌ Cons: Requires building retry logic, error handling, rollback coordination
   - ❌ Cons: Less battle-tested than off-the-shelf solutions

4. **db-migrate** (Node.js-based migration tool)
   - ✅ Pros: Node.js native, good for Node.js projects, SQL files stored in version control
   - ✅ Pros: Simple CLI, no heavy dependencies, MySQL/MariaDB support
   - ⚠️  Cons: Smaller community than Flyway, less active maintenance
   - ⚠️  Cons: Limited feature set vs. Flyway (but sufficient for basic migrations)

5. **TypeORM or Sequelize** (ORM-based migrations)
   - ❌ Cons: Introduces ORM dependency to backend (project uses direct MySQL queries, not ORM)
   - ❌ Cons: Adds unnecessary abstraction layer for schema-only changes
   - ❌ Cons: Would violate Layered Architecture principle (schema changes outside DB layer)

### Decision

**Selected: Custom Node.js Script (simplified, using mysql2)**

**Rationale**:
- Aligns with existing tech stack (TypeScript, Express, Node.js 18+)
- Minimal external dependencies (only uses mysql2, already a project dependency)
- Full control over migration lifecycle, validation, and rollback logic
- Easy to integrate into backend startup sequence and CI/CD workflows
- Team familiarity with backend codebase aids implementation and maintenance
- Can be extended later if needs grow (e.g., migrate to Flyway without rewriting migrations)

**Alternatives Considered & Rejected**:
- Flyway/Liquibase: Require Java runtime (operational overhead), overkill for current project scale
- db-migrate: Good option but smaller community; custom script provides more control with similar effort

**Contingency**: If custom implementation proves too complex during Phase 2, team can pivot to **db-migrate** (Node.js-based) with minimal rework of migration files (SQL format is portable).

---

## Decision 2: CI/CD Platform Integration

**Research Question**: Should we use GitHub Actions or Railway's native CI/CD capabilities?

### Options Evaluated

1. **GitHub Actions** (GitHub-native workflows)
   - ✅ Pros: Already integrated with repo, no additional service to manage
   - ✅ Pros: Can trigger on branch/tag patterns, strong approval workflow support
   - ✅ Pros: Direct access to GitHub environment secrets
   - ⚠️  Cons: Requires defining separate workflows for dev and prod
   - ⚠️  Cons: Approval gate requires GitHub Environment Secrets (additional permissions setup)

2. **Railway Native CI/CD** (Railway's built-in deployment)
   - ✅ Pros: Already configured for app deployments, no new service
   - ✅ Pros: Tight integration with Railway environments (development/production)
   - ❌ Cons: Limited approval workflow support (would need custom solution)
   - ❌ Cons: Less flexible for complex pipeline logic (GitHub Actions is more powerful)

3. **Hybrid: GitHub Actions + Railway** (GitHub triggers, Railway executes)
   - ✅ Pros: Best of both worlds: GitHub workflow logic + Railway deployment
   - ✅ Pros: Approval gate in GitHub, execution managed by Railway
   - ⚠️  Cons: Requires Railway API integration (tokens, webhook setup)

### Decision

**Selected: GitHub Actions (with Railway environment secrets)**

**Rationale**:
- GitHub Actions is already the repo's CI/CD platform (integrates naturally)
- Strong approval workflow support (GitHub Environments + branch protection rules)
- No additional service to manage (Railway already handles app deployment separately)
- Easier to troubleshoot and audit (logs stored in GitHub)
- Team can reuse existing GitHub Actions patterns

**Alternatives Considered & Rejected**:
- Railway Native: Insufficient approval workflow support for production migrations
- Hybrid (GitHub + Railway API): Adds complexity; GitHub Actions alone is sufficient

---

## Decision 3: Approval Workflow Implementation

**Research Question**: How should production migration approvals be implemented?

### Approaches

1. **GitHub Branch Protection Rules + Environment Approval**
   - ✅ Pros: Native GitHub feature, no external service needed
   - ✅ Pros: Integrates with GitHub Actions environments
   - ✅ Pros: Audit trail stored in GitHub
   - ⚠️  Cons: Requires specific user roles configured in GitHub

2. **Custom Railway/External Approval Service**
   - ❌ Cons: Adds operational overhead
   - ❌ Cons: Requires additional service/tool to manage

3. **Manual Production Deployment (scheduled)** (Git tag-based)
   - ⚠️  Cons: Less automated, more manual steps

### Decision

**Selected: GitHub Branch Protection Rules + GitHub Environments**

**Rationale**:
- Native GitHub feature, already familiar to team
- Integrates directly with GitHub Actions (no additional tools)
- Clear audit trail (who approved, when, comments)
- Can be combined with required reviews for extra safety

**Implementation Details**:
- Create GitHub Environment named `production-migrations` with approval requirements
- Configure `main` branch protection rule to require approvals
- GitHub Actions job references the protected environment, blocking deployment until approval

---

## Decision 4: Database-Specific Compatibility

**Research Question**: How should we handle MariaDB vs MySQL compatibility in migrations?

### Approach

**Selected: SQL Standard with MariaDB Extensions (when needed)**

**Rationale**:
- Project uses MariaDB/MySQL; focus on SQL standard syntax for portability
- Use MariaDB-specific features only when necessary (document in migration header comments)
- Validation script will check for compatibility warnings

**Compatibility Rules**:
- All migrations MUST be tested against the MariaDB version in use (confirmed in local environment)
- MariaDB-specific syntax (e.g., `USING` in ALTER TABLE) noted in comments
- Avoid MySQL 8.0+ features not available in MariaDB unless confirmed compatible
- Store MariaDB version in backend `.env` as `DB_VERSION` for reference

---

## Decision 5: Rollback Strategy

**Research Question**: How should automatic rollback be triggered and executed?

### Approach

**Selected: Down Migrations + Transactional Safety**

**Rationale**:
- Every migration file includes a `.down.sql` that reverses the `.up.sql` changes
- Rollback triggered by:
  1. Application error during `.up.sql` execution → automatically run `.down.sql`
  2. Manual trigger via CI/CD job (operator can manually rollback via GitHub Actions)
- Transactions MUST wrap each migration (MariaDB's native transaction support)
- Metadata table marks migration status: `pending`, `success`, `failed`, `rolled_back`

**Safety Guarantees**:
- If `.up.sql` fails mid-execution, MariaDB's transaction rollback handles cleanup
- If `.down.sql` fails, error is logged and manual intervention required (break-glass)
- No partial states: every migration is atomic

---

## Decision 6: Stored Procedure Versioning and Management

**Research Question**: How should stored procedures and functions be versioned and managed through the migration system?

### Approach

**Selected: Separate Directory with CREATE OR REPLACE + Versioned Migrations**

**Rationale**:
- Procedures stored in `backend/database/procedures/` directory (parallel to `backend/database/tables/`)
- Execution order: tables FIRST, then procedures (ensures tables exist when procedures are created)
- Use `CREATE OR REPLACE PROCEDURE/FUNCTION` for idempotent creation
- Use `DROP PROCEDURE/FUNCTION IF EXISTS` for idempotent removal
- Each procedure change is versioned as a migration (procedures treated like any other schema change)

**Folder Structure**:
```
backend/database/
├── tables/              # Table definition migrations
│   ├── 001-initial-schema.up.sql
│   └── 001-initial-schema.down.sql
└── procedures/          # Stored procedure migrations
    ├── 001-utility-functions.up.sql
    └── 001-utility-functions.down.sql
```

**Migration Runner Behavior**:
1. Discover all `.up.sql` files in `backend/database/tables/` → sort by version → apply
2. Discover all `.up.sql` files in `backend/database/procedures/` → sort by version → apply
3. Metadata table tracks all migrations (both table and procedure) with type information

**Contingency**: If procedure interdependencies become complex, can migrate to a stored procedure registry table (not essential for v1).

---

## Decision 7: Timeout and Long-Running Migrations

**Research Question**: How should we handle migrations that take longer than the deployment timeout?

### Approach

**Selected: Configurable Timeout + Explicit Long-Running Migration Support**

**Rationale**:
- Default timeout: 5 minutes per migration (configurable via `MIGRATION_TIMEOUT` env var)
- Migrations exceeding 30 seconds are logged with a warning
- Long-running migrations (table alterations on large tables) can:
  1. Be flagged in comments as `@slow-migration` (documented for operators)
  2. Run during maintenance windows (off-peak)
  3. Use non-blocking techniques (e.g., `ALTER TABLE` with `ALGORITHM=INPLACE` on MariaDB)
- CI/CD timeout is set to `MIGRATION_TIMEOUT + 2 minutes` buffer

---

## Summary of Decisions

| Decision | Selected Option | Key Rationale |
|----------|-----------------|---------------|
| Migration Tool | Custom Node.js Script | Aligns with stack, minimal dependencies, full control |
| CI/CD Platform | GitHub Actions | Already integrated, strong approval workflow support |
| Approval Gate | GitHub Environments + Branch Protection | Native, auditable, team-familiar |
| DB Compatibility | SQL Standard + MariaDB Extensions | Tested locally, documented, portable |
| Rollback Strategy | Down Migrations + Transactions | Atomic, automatic on failure, manual break-glass |
| Procedure Versioning | Separate directory + CREATE OR REPLACE | Idempotent, ordered after tables, version-controlled |
| Timeout Handling | Configurable timeout + warnings | Operational clarity, performance tracking |

---

## Implementation Dependencies

1. **Backend Changes**:
   - New `services/migrations.ts` module (Node.js migration runner)
   - New `backend/migrations/` directory (SQL files)
   - Modified `app.ts` to initialize migration runner

2. **CI/CD Setup**:
   - `.github/workflows/migrations-dev.yml` (development branch, auto-deploy)
   - `.github/workflows/migrations-prod.yml` (main branch, approval-gated)

3. **Environment Variables**:
   - `MIGRATION_TIMEOUT` (default 300 seconds)
   - `DB_VERSION` (for compatibility reference)
   - `SKIP_MIGRATIONS` (optional, to skip in specific environments)

4. **Documentation**:
   - `docs/MIGRATIONS.md` (developer guide for writing/testing migrations)
   - Updated `docs/env-vars.md` (migration-specific vars)
