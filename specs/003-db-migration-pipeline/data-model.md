# Data Model: Database Migration CI/CD Pipeline

**Date**: 2026-08-05

**Purpose**: Define the data structures that support the migration system.

---

## Folder Structure

### `backend/database/tables/`

Contains SQL migration files for table definitions. Each file uses the migration naming convention:
- `{VERSION}-{DESCRIPTION}.up.sql` — Creates or modifies tables
- `{VERSION}-{DESCRIPTION}.down.sql` — Drops or reverts tables

Example: `001-initial-schema.up.sql` creates the initial table structure; `001-initial-schema.down.sql` drops all tables created by that migration.

### `backend/database/procedures/`

Contains SQL migration files for stored procedures, functions, and triggers. Each file uses the migration naming convention:
- `{VERSION}-{DESCRIPTION}.up.sql` — Creates or replaces procedures/functions
- `{VERSION}-{DESCRIPTION}.down.sql` — Drops procedures/functions

Example: `001-utility-functions.up.sql` creates helper functions; `001-utility-functions.down.sql` drops them.

### Discovery and Ordering

Migrations are discovered and applied in this order:
1. **First**: All table migrations from `backend/database/tables/` (sorted alphabetically by version)
2. **Second**: All procedure migrations from `backend/database/procedures/` (sorted alphabetically by version)

This ensures table structures exist before procedures that reference them are created.

---

## Entities

### 1. Migration Metadata Table

**Table Name**: `migrations`

**Purpose**: Audit log and idempotency guard for all schema migrations.

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `BIGINT AUTO_INCREMENT` | PRIMARY KEY | Unique sequential ID |
| `version` | `VARCHAR(50)` | UNIQUE, NOT NULL | Semantic version or timestamp (e.g., `001`, `20260805-120000-v1`) |
| `description` | `VARCHAR(255)` | NOT NULL | Human-readable description of the migration |
| `migration_file` | `VARCHAR(512)` | NOT NULL | Relative path to migration file in git repo (e.g., `migrations/001-initial-schema.sql`) |
| `executed_at` | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP | When the migration was applied |
| `executor_id` | `VARCHAR(100)` | Nullable | User or service account that applied the migration (e.g., `github-actions`, `ops-team`) |
| `status` | `ENUM('pending', 'success', 'failed', 'rolled_back')` | DEFAULT 'pending' | Current status of the migration |
| `execution_time_ms` | `INT` | Nullable | Time taken to apply migration (milliseconds) |
| `error_message` | `TEXT` | Nullable | Error details if status is `failed` or `rolled_back` |
| `applied_to_env` | `ENUM('development', 'production')` | NOT NULL | Which environment this migration was applied to |
| `checksum` | `VARCHAR(64)` | Nullable | SHA256 hash of migration file (for integrity checking) |
| `created_at` | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP | Metadata creation time |
| `updated_at` | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last update time |

**Indexes**:
- `UNIQUE (version, applied_to_env)` — Prevents duplicate execution in same environment
- `INDEX (executed_at)` — Efficient history queries
- `INDEX (status)` — Query failed/rolled-back migrations
- `INDEX (applied_to_env)` — Environment-specific reports

**Validation Rules**:
- `version` must match migration file naming convention (e.g., `001-description` or `20260805-hhmmss-description`)
- `status` transitions are one-directional: `pending` → `success` OR `pending` → `failed` → `rolled_back`
- `executor_id` required for all status updates (audit trail)
- `execution_time_ms` must be >= 0 if populated
- `checksum` updated each time migration runs (detects file tampering)

---

### 2. Migration File Structure

**Location**: `backend/migrations/`

**File Naming Convention**: `{SEQUENCE|TIMESTAMP}-{DESCRIPTION}.{up|down}.sql`

**Examples**:
- `001-initial-schema.up.sql` / `001-initial-schema.down.sql`
- `002-add-audit-table.up.sql` / `002-add-audit-table.down.sql`
- `20260805-120000-add-indexes.up.sql` / `20260805-120000-add-indexes.down.sql`

**File Structure**:

```sql
-- Migration: {SEQUENCE} - {DESCRIPTION}
-- Author: {DEVELOPER NAME or GITHUB USERNAME}
-- Date: {ISO 8601 DATE}
-- Environment: {development, production, or both}
-- Timeout: {estimated seconds}
-- @slow-migration (optional tag if > 30 seconds)

BEGIN;

-- Migration up (schema changes)
ALTER TABLE books ADD COLUMN isbn13 VARCHAR(13) UNIQUE;
CREATE INDEX idx_isbn13 ON books(isbn13);

COMMIT;
```

**Constraints**:
- Each migration MUST be wrapped in `BEGIN;` / `COMMIT;` for atomicity
- Each file must contain EXACTLY ONE `.up.sql` and ONE `.down.sql` file
- The `.down.sql` MUST perfectly reverse the `.up.sql` changes
- All SQL MUST be MariaDB/MySQL compatible
- Comments must include: description, author, date, environment, timeout estimate
- No DDL (CREATE/ALTER) without corresponding reversal in `.down.sql`

---

### 3. Stored Procedure Migrations

**Location**: `backend/database/procedures/`

**File Structure**: Same naming convention as table migrations, with specialized SQL:

```sql
-- Migration: 001 - Utility Functions
-- Author: alice-dev
-- Date: 2026-08-05
-- Environment: both
-- Timeout: 10

BEGIN;

CREATE OR REPLACE FUNCTION format_isbn(isbn VARCHAR(13)) 
RETURNS VARCHAR(17) 
DETERMINISTIC
BEGIN
  RETURN CONCAT(
    LEFT(isbn, 3), '-',
    SUBSTRING(isbn, 4, 1), '-',
    SUBSTRING(isbn, 5, 5), '-',
    SUBSTRING(isbn, 10, 3), '-',
    RIGHT(isbn, 1)
  );
END;

COMMIT;
```

**Reversal Example** (`.down.sql`):

```sql
BEGIN;

DROP FUNCTION IF EXISTS format_isbn;

COMMIT;
```

**Constraints for Procedures**:
- `CREATE OR REPLACE PROCEDURE/FUNCTION` preferred over `CREATE PROCEDURE` for idempotency
- Procedure `.down.sql` MUST use `DROP PROCEDURE IF EXISTS` (idempotent)
- Procedures must not depend on tables that haven't been created by table migrations
- All procedure names MUST be unique across the database (no namespace isolation)

---

### 4. Migration Validation Rules

**Applied during CI/CD validation phase**:

1. **Syntax Validation**
   - File name matches pattern: `{SEQUENCE|TIMESTAMP}-{DESCRIPTION}.{up|down}.sql`
   - File contains `BEGIN;` and `COMMIT;` for transactional safety
   - No syntax errors (validated by MariaDB test run)

2. **Idempotency Check**
   - No migration with same version already exists in migrations table
   - Checksum of committed file matches expected checksum

3. **Compatibility Check**
   - All SQL keywords compatible with MariaDB version (from `DB_VERSION` env var)
   - No blocking operations on large tables without `@slow-migration` tag
   - ALTER TABLE must not lock table (use `ALGORITHM=INPLACE` when available)
   - For procedures: `CREATE OR REPLACE` used (idempotent) or file uses `DROP IF EXISTS`

4. **Reversibility Check**
   - `.down.sql` file exists and is valid SQL
   - `.down.sql` successfully reverses `.up.sql` (tested on dev database)
   - No data loss in reversal (e.g., no DROP TABLE without corresponding CREATE)
   - For procedures: `.down.sql` uses `DROP PROCEDURE/FUNCTION IF EXISTS`

5. **Dependency Check** (procedures only)
   - Procedures in `backend/database/procedures/` only depend on tables created by migrations in `backend/database/tables/`
   - Procedure migrations execute AFTER table migrations (enforced by migration runner)

---

## Execution Order

Migrations are executed in this sequence:

1. **Table Migrations** (`backend/database/tables/`, sorted by version)
   - Schema definitions, indexes, constraints
   
2. **Procedure Migrations** (`backend/database/procedures/`, sorted by version)
   - Stored procedures, functions, triggers (can reference tables created in step 1)

This ordering ensures all table structures exist before procedures that depend on them are created.

---

## Relationships

```
[Git Repository]
  ├── migrations/ (files)
  │   └── {sequence}-{desc}.{up|down}.sql
  │
└─→ [CI/CD Pipeline]
     │
     ├─→ Validate (syntax, idempotency, compatibility)
     │
     ├─→ [Development Environment]
     │   └─→ Auto-apply to dev database
     │   └─→ Log to migrations table (dev)
     │
     └─→ [Production Environment]
         ├─→ Wait for approval (GitHub Environments)
         │
         └─→ Apply to prod database (on approval)
             └─→ Log to migrations table (prod)
```

---

## State Machine: Migration Status

```
┌─────────┐
│ PENDING │  (Initial state, waiting to execute)
└────┬────┘
     │
     ├─→ Execute UP migration
     │   ├─→ ✅ Success ──→ [SUCCESS]
     │   │                  (Migration applied, logged)
     │   │
     │   └─→ ❌ Error ──→ [FAILED]
     │                    (Automatic rollback triggered)
     │                    └─→ Execute DOWN migration
     │                        ├─→ ✅ Success ──→ [ROLLED_BACK]
     │                        │
     │                        └─→ ❌ Error ──→ [FAILED]
     │                            (Manual intervention required)
     │
     └─→ Skipped (already applied) ──→ [SUCCESS]
                                       (Idempotency check)
```

---

## Audit Trail

All migration operations are logged to the `migrations` table with:
- **Timestamp**: `executed_at`
- **Executor**: `executor_id` (e.g., `github-actions`, `ops-team`)
- **Status**: current state of migration
- **Duration**: `execution_time_ms`
- **Environment**: `applied_to_env` (dev or prod)
- **Error details**: `error_message` (if applicable)

**Query Examples**:
```sql
-- All successful migrations
SELECT version, description, executed_at 
FROM migrations 
WHERE status = 'success' 
ORDER BY executed_at DESC;

-- Failed migrations requiring investigation
SELECT version, description, error_message, executed_at 
FROM migrations 
WHERE status IN ('failed', 'rolled_back') 
ORDER BY executed_at DESC;

-- Migration history for production
SELECT version, description, executor_id, executed_at, execution_time_ms
FROM migrations 
WHERE applied_to_env = 'production' 
ORDER BY executed_at DESC 
LIMIT 20;
```

---

## Initialization

Before the migration system is active:

1. **Create migrations table** (bootstrapped in first deployment):
   ```sql
   CREATE TABLE IF NOT EXISTS migrations (
     id BIGINT AUTO_INCREMENT PRIMARY KEY,
     version VARCHAR(50) UNIQUE NOT NULL,
     description VARCHAR(255) NOT NULL,
     migration_file VARCHAR(512) NOT NULL,
     executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     executor_id VARCHAR(100),
     status ENUM('pending', 'success', 'failed', 'rolled_back') DEFAULT 'pending',
     execution_time_ms INT,
     error_message TEXT,
     applied_to_env ENUM('development', 'production') NOT NULL,
     checksum VARCHAR(64),
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     UNIQUE KEY unique_version_env (version, applied_to_env),
     INDEX idx_executed_at (executed_at),
     INDEX idx_status (status),
     INDEX idx_applied_to_env (applied_to_env)
   );
   ```

2. **Bootstrap query**: Record any pre-existing schema version (if applicable)
   ```sql
   INSERT INTO migrations 
   (version, description, executor_id, status, applied_to_env) 
   VALUES 
   ('000-baseline', 'Baseline schema before migration system', 'bootstrap', 'success', 'development'),
   ('000-baseline', 'Baseline schema before migration system', 'bootstrap', 'success', 'production');
   ```

---

## Performance Considerations

- Migrations table is append-only (write-once after initial insert) → minimal contention
- Indexes on `executed_at` and `applied_to_env` enable fast queries for reporting
- Checksum stored for integrity, not actively validated on every read (lazy validation on migration run)
- Archive old migrations to separate table after 1 year (retention policy TBD)
