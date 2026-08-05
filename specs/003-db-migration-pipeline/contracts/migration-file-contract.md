# Contract: Migration File Format

**Version**: 1.0

**Purpose**: Define the contract that all migration files must satisfy for the CI/CD pipeline to process them correctly.

---

## File Naming Contract

### Format

```
{VERSION}-{DESCRIPTION}.{DIRECTION}.sql
```

### Locations

- **Table Migrations**: `backend/database/tables/{VERSION}-{DESCRIPTION}.{DIRECTION}.sql`
- **Procedure Migrations**: `backend/database/procedures/{VERSION}-{DESCRIPTION}.{DIRECTION}.sql`

### Rules

- **VERSION**: Sequential number (`001`, `002`, etc.) OR timestamp (`20260805-120000`)
  - Sequential preferred for readability
  - Timestamp used for concurrent development branches
  - Must be unique across all migrations (both tables and procedures)
  - Must match the `version` value recorded in the migrations table

- **DESCRIPTION**: kebab-case, 3-50 characters
  - Concise, action-oriented (e.g., `add-audit-table`, `create-book-index`, `utility-functions`)
  - No spaces, special characters except hyphens
  - Must match the `description` recorded in the migrations table

- **DIRECTION**: `up` or `down`
  - `up`: Applies schema/procedure changes (forward migration)
  - `down`: Reverses schema/procedure changes (rollback)
  - Each migration requires BOTH a `.up.sql` AND `.down.sql` file

- **EXTENSION**: `.sql` (lowercase, not `.SQL`)

### Examples

✅ Valid (Table Migrations):
- `backend/database/tables/001-initial-schema.up.sql`
- `backend/database/tables/002-add-audit-table.down.sql`
- `backend/database/tables/003-create-book-isbn-index.up.sql`

✅ Valid (Procedure Migrations):
- `backend/database/procedures/001-utility-functions.up.sql`
- `backend/database/procedures/002-audit-procedures.down.sql`
- `backend/database/procedures/20260805-120000-report-functions.up.sql`

❌ Invalid:
- `001_initial_schema.sql` (underscore separator, no direction)
- `add-audit-table.sql` (no version)
- `001-ADD-AUDIT-TABLE.up.sql` (uppercase description)
- `001-add-audit-table.sql` (missing direction)
- `backend/migrations/001-initial.up.sql` (wrong directory - should be in tables/ or procedures/)

---

## File Content Contract

### Header Comment Block (Tables)

Every migration file MUST include a header comment with metadata:

```sql
-- Migration: {VERSION} - {DESCRIPTION}
-- Author: {DEVELOPER NAME or GITHUB USERNAME}
-- Date: {ISO 8601 DATE, e.g., 2026-08-05}
-- Environment: {development|production|both}
-- Timeout: {estimated execution time in seconds}
-- @slow-migration  (optional tag if execution time > 30 seconds)
-- @breaking-change (optional tag if migration is not backward compatible)
```

### Transaction Wrapping

All SQL MUST be wrapped in `BEGIN;` and `COMMIT;`:

```sql
BEGIN;

-- Schema changes here

COMMIT;
```

**Rationale**: Ensures atomicity. If any statement fails, the entire migration is rolled back by the database.

### SQL Dialect

- **Target**: MariaDB 10.4+ (confirmed via `DB_VERSION` env var)
- **Compatibility**: SQL standard syntax preferred
- **Non-portable features**: Document in header comment with `@mariadb-specific` tag
- **Avoid**: MySQL 8.0+ features not available in MariaDB
- **Testing**: Migrations must be tested against the actual MariaDB version in development

### Example Migration

```sql
-- Migration: 002 - Add audit table
-- Author: alice-dev
-- Date: 2026-08-05
-- Environment: both
-- Timeout: 10
-- @slow-migration

BEGIN;

CREATE TABLE audit_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id BIGINT NOT NULL,
  action ENUM('create', 'update', 'delete') NOT NULL,
  changed_by VARCHAR(100) NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  old_values JSON,
  new_values JSON,
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_changed_at (changed_at)
);

COMMIT;
```

### Reversibility Guarantee (Tables)

The `.down.sql` file MUST perfectly reverse the `.up.sql` changes:

- If `.up.sql` creates a table, `.down.sql` must drop it
- If `.up.sql` adds a column, `.down.sql` must remove it
- If `.up.sql` creates an index, `.down.sql` must drop it
- If `.up.sql` inserts data, `.down.sql` must remove it (or be wrapped in a transaction that rolls back)

**Constraint**: No data loss is acceptable in reversal. If a migration modifies data, both `.up.sql` and `.down.sql` must preserve the full state (e.g., use temporary tables or JSON columns to store old values).

### Stored Procedure Migrations

Procedure migrations use `CREATE OR REPLACE PROCEDURE/FUNCTION` for idempotency:

```sql
-- Migration: 001 - Utility Functions
-- Author: dev-team
-- Date: 2026-08-05
-- Environment: both
-- Timeout: 10

BEGIN;

CREATE OR REPLACE FUNCTION calculate_age(birth_date DATE) 
RETURNS INT 
DETERMINISTIC 
BEGIN
  RETURN YEAR(CURDATE()) - YEAR(birth_date) 
    - (DATE_FORMAT(CURDATE(), '%m%d') < DATE_FORMAT(birth_date, '%m%d'));
END;

COMMIT;
```

**Reversal (`.down.sql`)**:

```sql
BEGIN;

DROP FUNCTION IF EXISTS calculate_age;

COMMIT;
```

**Constraints for Procedures**:
- Use `CREATE OR REPLACE` keyword for idempotent creation
- Use `DROP PROCEDURE/FUNCTION IF EXISTS` for idempotent removal
- All procedure definitions must be self-contained (no multi-statement procedures without delimiters)
- Procedures must not depend on tables that haven't been created by table migrations

---

## Location Contract

**Storage Paths**:
- Table migrations: `backend/database/tables/`
- Procedure migrations: `backend/database/procedures/`

**File Listing**: All active migrations discoverable via:
```bash
# Table migrations
ls -1 backend/database/tables/*.up.sql | sort

# Procedure migrations
ls -1 backend/database/procedures/*.up.sql | sort
```

**Execution Order**: Table migrations are applied first (all files in `backend/database/tables/` sorted alphabetically), then procedure migrations (all files in `backend/database/procedures/` sorted alphabetically).

**Validation**: Migration files are read-only once committed to git. Changes require a new migration file (never modify existing files).

---

## Validation Contract

### CI/CD Pipeline Validation Rules

The migration system MUST validate:

1. ✅ **File Name Valid**: Matches `{VERSION}-{DESCRIPTION}.{up|down}.sql` pattern
2. ✅ **Both Directions Exist**: For every `.up.sql`, a corresponding `.down.sql` must exist
3. ✅ **Version Unique**: No duplicate versions in git history
4. ✅ **Header Present**: Valid header comment with author, date, environment
5. ✅ **Transaction Wrapped**: All SQL wrapped in `BEGIN;` / `COMMIT;`
6. ✅ **SQL Syntax Valid**: No parse errors (validated against MariaDB)
7. ✅ **Idempotency**: No migration with this version already executed in target environment
8. ✅ **Reversibility**: `.down.sql` reverses `.up.sql` (tested on dev database clone)
9. ✅ **Compatibility**: All SQL compatible with MariaDB version (from `DB_VERSION`)
10. ✅ **No Prior Execution**: Checksum matches known checksum (file not tampered with)

### Validation Failure Handling

If validation fails:
- ❌ Pipeline blocks deployment to any environment
- ❌ Developer receives error message with specific validation failure reason
- ⚠️  Migration remains in `pending` status in migrations table
- 🔄 Developer must fix migration file and push new commit to retry

---

## Performance Contract

### Execution Time Expectations

- **Default Timeout**: 300 seconds (configurable via `MIGRATION_TIMEOUT`)
- **Warning Threshold**: 30 seconds (migrations exceeding this logged with warning)
- **Slow Migration Tag**: Required for migrations estimated > 30 seconds (`@slow-migration`)

### Example Timeouts

| Operation | Estimated Time | Tag |
|-----------|--------|-----|
| Add index on small table | 2-5 seconds | None |
| Add nullable column | 5-10 seconds | None |
| ALTER TABLE on large table | 30-120 seconds | `@slow-migration` |
| Backfill data across 1M rows | 60-300 seconds | `@slow-migration` |

### Non-Blocking Operations

Migrations SHOULD prefer non-blocking operations:
- `ALTER TABLE ... ALGORITHM=INPLACE` (MariaDB 10.4+) preferred over COPY
- `CREATE INDEX CONCURRENTLY` (if available) preferred over table lock
- Backfill operations in separate transaction after schema change

---

## Error Handling Contract

### Expected Error Messages

Migration files producing these error types are caught and logged:

| Error Type | Cause | Recovery |
|-----------|-------|----------|
| Parse Error | Malformed SQL syntax | Developer fixes SQL and pushes new commit |
| Constraint Violation | Data violates new constraint | Developer adjusts data or modifies migration |
| Timeout | Migration exceeds timeout window | Developer optimizes migration or increases timeout |
| Deadlock | Two migrations competing for lock | Deployment retried automatically |
| Insufficient Privileges | DB user lacks permissions | Operations team updates DB user permissions |

### Rollback Trigger

If migration execution fails:
1. Transaction automatically rolls back (atomic guarantee)
2. `.down.sql` is NOT automatically executed (reversal only on explicit failure)
3. Error message logged to `migrations` table `error_message` column
4. Deployment pipeline halts; manual intervention required

---

## Summary

Migration files are the primary interface to the migration system. They must adhere to:
- ✅ Naming convention (version-description.direction.sql)
- ✅ Header metadata (author, date, environment, timeout)
- ✅ Transaction wrapping (atomic execution)
- ✅ SQL compatibility (MariaDB 10.4+)
- ✅ Reversibility (matching `.down.sql`)
- ✅ Idempotency (cannot run twice)
- ✅ Performance guidelines (timeout, slow-migration tag)
