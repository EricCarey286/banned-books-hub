# Database Migrations Guide

This guide explains how to create, deploy, and manage database schema changes using the automated migration system.

## Quick Start

### Create a Table Migration

```bash
# 1. Create the up migration
cat > backend/database/tables/002-add-users-table.up.sql << 'EOF'
-- Migration: 002 - Add Users Table
-- Author: your-name
-- Date: 2026-08-05
-- Environment: both
-- Timeout: 10

BEGIN;

CREATE TABLE users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

COMMIT;
EOF

# 2. Create the matching down migration
cat > backend/database/tables/002-add-users-table.down.sql << 'EOF'
-- Migration: 002 - Add Users Table (Rollback)
-- Author: your-name
-- Date: 2026-08-05
-- Environment: both
-- Timeout: 10

BEGIN;

DROP TABLE IF EXISTS users;

COMMIT;
EOF

# 3. Test locally (see Testing section below)
# 4. Commit and push to development branch
git add backend/database/tables/002-add-users-table.*
git commit -m "feat: add users table migration"
git push origin development
```

### Create a Stored Procedure Migration

```bash
# 1. Create the up migration
cat > backend/database/procedures/002-add-user-functions.up.sql << 'EOF'
-- Migration: 002 - Add User Functions
-- Author: your-name
-- Date: 2026-08-05
-- Environment: both
-- Timeout: 10

BEGIN;

CREATE OR REPLACE FUNCTION get_user_age(birth_date DATE)
RETURNS INT
DETERMINISTIC
BEGIN
  RETURN YEAR(CURDATE()) - YEAR(birth_date);
END;

COMMIT;
EOF

# 2. Create the matching down migration
cat > backend/database/procedures/002-add-user-functions.down.sql << 'EOF'
BEGIN;

DROP FUNCTION IF EXISTS get_user_age;

COMMIT;
EOF
```

## File Structure

Migrations are stored in two separate directories to enforce execution order:

```
backend/database/
├── tables/              # Table definitions (applied first)
│   ├── 001-initial-schema.up.sql
│   ├── 001-initial-schema.down.sql
│   ├── 002-add-users-table.up.sql
│   └── 002-add-users-table.down.sql
└── procedures/          # Stored procedures (applied after tables)
    ├── 001-utility-functions.up.sql
    └── 001-utility-functions.down.sql
```

**Execution Order**: All table migrations run first (alphabetically sorted), then all procedure migrations.

## Migration Naming Convention

```
{VERSION}-{DESCRIPTION}.{up|down}.sql
```

### Version

- **Sequential**: `001`, `002`, `003` (preferred for readability)
- **Timestamp**: `20260805-120000` (for concurrent development branches)
- Must be unique across ALL migrations (not just within tables/ or procedures/)

### Description

- kebab-case (lowercase with hyphens)
- 3-50 characters
- Action-oriented: `add-users-table`, `create-audit-function`, `add-indexes`
- NO underscores or spaces

### Examples

✅ Valid:
- `001-initial-schema.up.sql`
- `002-add-users-table.down.sql`
- `003-create-audit-procedures.up.sql`

❌ Invalid:
- `01-initial-schema.up.sql` (version too short)
- `001_initial_schema.up.sql` (underscores instead of hyphens)
- `001-initial-schema.sql` (missing direction: up/down)
- `initial-schema.up.sql` (missing version)

## Migration Format

Every migration file MUST follow this format:

```sql
-- Migration: {VERSION} - {DESCRIPTION}
-- Author: {your-name}
-- Date: {ISO-8601 date}
-- Environment: {development|production|both}
-- Timeout: {estimated seconds}
-- @slow-migration (optional: if execution time > 30 seconds)

BEGIN;

-- Your SQL statements here

COMMIT;
```

### Requirements

- **Header comment**: Must include version, description, author, date, environment, timeout
- **Transaction wrapping**: All SQL must be wrapped in `BEGIN;` and `COMMIT;`
- **Atomic operations**: Either all SQL succeeds or all rolls back
- **Idempotent reversals**: `.down.sql` must perfectly reverse `.up.sql`
- **No partial changes**: If migration fails mid-execution, automatic rollback occurs

### Example: Complete Migration

```sql
-- Migration: 004 - Add Audit Table
-- Author: alice-dev
-- Date: 2026-08-05
-- Environment: both
-- Timeout: 15
-- @slow-migration

BEGIN;

CREATE TABLE audit_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  table_name VARCHAR(50) NOT NULL,
  record_id BIGINT NOT NULL,
  action ENUM('create', 'update', 'delete') NOT NULL,
  changed_by VARCHAR(100),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  old_values JSON,
  new_values JSON,
  INDEX idx_table_record (table_name, record_id),
  INDEX idx_changed_at (changed_at)
);

COMMIT;
```

## Testing Migrations Locally

### 1. Test in Development Database

```bash
# Set environment variables
export DB_HOST=localhost
export DB_PORT=3306
export DB_USER=root
export DB_PASSWORD=your_password
export DB_NAME=banned_books_dev

# Start the backend (migrations auto-run on startup)
cd backend
npm run dev

# Verify in database
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME

# Check migrations table
SELECT * FROM migrations ORDER BY executed_at DESC;

# Verify schema changes
SHOW TABLES;
DESCRIBE your_new_table;
```

### 2. Test Rollback

```bash
# Manually execute the down migration (for testing only)
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME < backend/database/tables/002-add-users-table.down.sql

# Verify table is gone
SHOW TABLES LIKE 'users';  # Should return empty
```

### 3. Idempotency Test

```bash
# Run the same up migration twice
mysql ... < backend/database/tables/002-add-users-table.up.sql
mysql ... < backend/database/tables/002-add-users-table.up.sql

# Should NOT error - migrations are idempotent
# (Handled by migration executor checking migrations table)
```

## Deployment Process

### Development Branch (Auto-Deploy)

1. Create migration file in `backend/database/tables/` or `backend/database/procedures/`
2. Test locally
3. Commit and push to `development` branch:
   ```bash
   git push origin development
   ```
4. GitHub Actions automatically:
   - ✅ Discovers migrations
   - ✅ Validates syntax and structure
   - ✅ Applies to development database
   - ✅ Logs to migrations table
5. Check GitHub Actions logs for success/failure

### Main Branch (Production, Requires Approval)

1. Create and test migration on `development` branch (as above)
2. Create Pull Request to `main` branch
3. Get PR review and approval
4. Merge to `main` branch
5. GitHub Actions pauses at "production-migrations" Environment
6. Wait for authorized approver to review migration details
7. Approver reviews migration files and production impact
8. Approver clicks "Approve" in GitHub deployment
9. Migrations automatically apply to production database
10. Approver can reject if issues detected → deployment blocked

## Validation Rules

All migrations are automatically validated before execution:

1. **File Structure**
   - ✅ File name matches pattern: `{VERSION}-{DESCRIPTION}.{up|down}.sql`
   - ✅ Both `.up.sql` and `.down.sql` exist
   - ✅ Files contain `BEGIN;` and `COMMIT;`

2. **SQL Syntax**
   - ✅ Valid SQL for target MariaDB version
   - ✅ No parse errors (validated via test parse in transaction)
   - ✅ Idempotent operations (safe to run multiple times)

3. **Idempotency**
   - ✅ Migration version not already applied in environment
   - ✅ File checksum matches expected checksum

4. **Performance**
   - ⚠️  Warnings for ALTER TABLE without `ALGORITHM=INPLACE`
   - ⚠️  Slow migrations (> 30 seconds) must be tagged with `@slow-migration`

5. **Reversibility**
   - ✅ Down migration exists and is valid SQL
   - ✅ Down migration successfully reverses up migration

## Common Patterns

### Adding a Column (Non-Nullable with Default)

```sql
BEGIN;

ALTER TABLE books ADD COLUMN isbn13 VARCHAR(13) UNIQUE AFTER isbn10;

COMMIT;
```

Down migration:
```sql
BEGIN;

ALTER TABLE books DROP COLUMN isbn13;

COMMIT;
```

### Creating an Index

```sql
BEGIN;

CREATE INDEX idx_books_isbn ON books(isbn);

COMMIT;
```

Down migration:
```sql
BEGIN;

DROP INDEX idx_books_isbn ON books;

COMMIT;
```

### Creating a Stored Procedure

```sql
BEGIN;

CREATE OR REPLACE FUNCTION format_isbn(isbn VARCHAR(13))
RETURNS VARCHAR(17)
DETERMINISTIC
BEGIN
  RETURN CONCAT(
    LEFT(isbn, 3), '-',
    SUBSTRING(isbn, 4, 1), '-',
    SUBSTRING(isbn, 5, 5)
  );
END;

COMMIT;
```

Down migration:
```sql
BEGIN;

DROP FUNCTION IF EXISTS format_isbn;

COMMIT;
```

## Troubleshooting

### Migration Not Executing

**Problem**: Migration file exists but doesn't run

**Solutions**:
1. Verify file location: `backend/database/tables/` or `backend/database/procedures/`
2. Check naming: `{VERSION}-{DESCRIPTION}.{up|down}.sql`
3. Verify both `.up.sql` and `.down.sql` exist
4. Check for BEGIN/COMMIT wrapping
5. Review GitHub Actions logs for validation errors

### "Already Applied" Error

**Problem**: Cannot run migration - says it's already applied

**Solution**:
- This is intentional (idempotency protection)
- If migration needs changes, create new version: `003-...`
- For testing: `DELETE FROM migrations WHERE version = '002';` (dev only)

### Rollback Failed

**Problem**: Automatic rollback didn't execute

**Solutions**:
1. Verify `.down.sql` file exists
2. Verify `.down.sql` contains valid SQL
3. Check for `DROP IF EXISTS` (idempotent)
4. Verify `.down.sql` has BEGIN/COMMIT wrapping

### Timeout Exceeded

**Problem**: Migration takes too long and times out

**Solutions**:
1. Increase `MIGRATION_TIMEOUT` environment variable (default 300 seconds)
2. Optimize migration SQL (use `ALGORITHM=INPLACE` for ALTER TABLE)
3. Consider backfilling data in separate migration
4. Tag with `@slow-migration` for notification

## Audit Trail

All migrations are logged to the `migrations` table:

```sql
SELECT 
  version,
  description,
  status,
  executed_at,
  executor_id,
  execution_time_ms,
  applied_to_env
FROM migrations
ORDER BY executed_at DESC;
```

**Columns**:
- `version`: Migration version identifier
- `description`: Short description of changes
- `status`: `pending`, `success`, `failed`, `rolled_back`
- `executed_at`: When migration ran
- `executor_id`: Who/what executed (e.g., `github-actions`)
- `execution_time_ms`: How long it took
- `applied_to_env`: `development` or `production`
- `error_message`: If status is `failed` or `rolled_back`

## FAQ

### Can I modify a migration after committing?

**No**. Migrations are immutable once in git. If you need to change something:
1. Create a NEW migration with the fix
2. Write the `.down.sql` to revert the old migration
3. Write the `.up.sql` with the corrected changes

### How do I backfill data?

Use a separate migration that includes INSERT statements within the transaction:

```sql
BEGIN;

ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active';

-- Backfill existing rows
UPDATE users SET status = 'active' WHERE status IS NULL;

COMMIT;
```

### Can I run migrations without deployment?

For testing only:
```bash
export SKIP_MIGRATIONS=true
npm run dev  # Skips migrations
```

For production, migrations only run via GitHub Actions → approval gate.

### What if a migration is slow?

1. Tag with `@slow-migration` in header comment
2. Increase `MIGRATION_TIMEOUT` if needed
3. Consider running during maintenance window
4. Use `ALGORITHM=INPLACE` for ALTER TABLE to avoid table lock

### Can I rollback in production?

Automatic rollback happens on execution failure. For manual rollback:
1. Create a new "fix-forward" migration
2. Apply it through normal approval gate
3. Or: Manual intervention by ops team (contact engineering lead)

## Best Practices

✅ **DO**:
- Write both `.up.sql` and `.down.sql` at the same time
- Test migrations locally before pushing
- Include meaningful description in filename
- Use transactions to ensure atomicity
- Keep migrations focused (one change per migration)
- Document complex operations in comment header

❌ **DON'T**:
- Modify migrations after committing
- Skip transaction wrapping (BEGIN/COMMIT)
- Use stored procedures for schema changes
- Assume `ALGORITHM=INPLACE` available (test first)
- Mix schema and data changes in one migration
- Commit without testing

## Support

For migration issues:
1. Check GitHub Actions logs
2. Review this guide's troubleshooting section
3. Check `migrations` table for error details
4. Contact engineering lead for production issues

---

Last Updated: 2026-08-05  
For complete technical specification: See `specs/003-db-migration-pipeline/`
