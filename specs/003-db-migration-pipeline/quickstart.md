# Quickstart: Database Migration CI/CD Pipeline

**Purpose**: Validate the migration system end-to-end with minimal setup.

**Time**: ~15 minutes

---

## Prerequisites

- Banned Books Hub repository cloned locally
- Backend dependencies installed: `cd backend && npm install`
- Local MariaDB/MySQL running (or Railway tunnel configured)
- Access to development database (credentials in `.env`)

---

## Scenario 1: Create and Apply a Test Migration

This scenario validates the complete happy path: write a migration, validate it, apply it, and verify results.

### Step 1: Create a Test Migration File

```bash
cd backend

# Create migration directory if it doesn't exist
mkdir -p migrations

# Create a simple test migration
cat > migrations/001-test-migration.up.sql << 'EOF'
-- Migration: 001 - Test Migration
-- Author: $(whoami)
-- Date: $(date +%Y-%m-%d)
-- Environment: development
-- Timeout: 10

BEGIN;

CREATE TABLE IF NOT EXISTS migration_test (
  id INT PRIMARY KEY AUTO_INCREMENT,
  test_column VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMIT;
EOF

# Create the corresponding down migration
cat > migrations/001-test-migration.down.sql << 'EOF'
-- Migration: 001 - Test Migration (Rollback)
-- Author: $(whoami)
-- Date: $(date +%Y-%m-%d)
-- Environment: development
-- Timeout: 10

BEGIN;

DROP TABLE IF EXISTS migration_test;

COMMIT;
EOF
```

**Expected Output**: Two files created:
- `backend/migrations/001-test-migration.up.sql`
- `backend/migrations/001-test-migration.down.sql`

### Step 2: Validate the Migration Files

```bash
# List migrations
ls -1 backend/migrations/*.up.sql

# Expected output:
# backend/migrations/001-test-migration.up.sql
```

**Validation Checklist** (see migration-file-contract.md):
- ✅ File name matches pattern: `{VERSION}-{DESCRIPTION}.{up|down}.sql`
- ✅ Both `.up.sql` and `.down.sql` exist
- ✅ Header comment includes author, date, environment, timeout
- ✅ SQL wrapped in `BEGIN;` / `COMMIT;`
- ✅ No syntax errors

### Step 3: Apply the Migration to Development Database

```bash
# Set database connection environment variables
export DB_HOST=localhost
export DB_PORT=3306
export DB_USER=root
export DB_PASSWORD=your_password
export DB_NAME=banned_books_dev

# Run migrations (implementation pending in Phase 2)
# For now, manually execute to validate
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME < migrations/001-test-migration.up.sql
```

**Expected Output**: No errors, migration applied successfully.

### Step 4: Verify Migration in Database

```bash
# Connect to database and verify
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME << EOF
SHOW TABLES LIKE 'migration_test';
DESCRIBE migration_test;
EOF

# Expected output:
# Tables_in_banned_books_dev (migration_test)
# id | int(11) | NO | PRI | NULL | auto_increment
# test_column | varchar(100) | YES | | NULL |
# created_at | timestamp | NO | | CURRENT_TIMESTAMP | on update CURRENT_TIMESTAMP
```

**Verification**: Table created with correct columns and types.

### Step 5: Test Rollback

```bash
# Execute the down migration
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME < migrations/001-test-migration.down.sql

# Verify table no longer exists
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME << EOF
SHOW TABLES LIKE 'migration_test';
EOF

# Expected output: (empty result set - table dropped)
```

**Verification**: Table successfully dropped by rollback migration.

---

## Scenario 2: Create and Apply a Stored Procedure Migration

This scenario validates that stored procedures can be versioned and deployed through the migration system.

### Step 1: Create a Stored Procedure Migration

```bash
# Create procedure migrations directory if it doesn't exist
mkdir -p backend/database/procedures

# Create a stored procedure migration
cat > backend/database/procedures/002-utility-functions.up.sql << 'EOF'
-- Migration: 002 - Utility Functions
-- Author: $(whoami)
-- Date: $(date +%Y-%m-%d)
-- Environment: development
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
EOF

# Create the corresponding down migration
cat > backend/database/procedures/002-utility-functions.down.sql << 'EOF'
BEGIN;

DROP FUNCTION IF EXISTS calculate_age;

COMMIT;
EOF
```

**Expected Output**: Two files created in procedure migrations directory:
- `backend/database/procedures/002-utility-functions.up.sql`
- `backend/database/procedures/002-utility-functions.down.sql`

### Step 2: Validate Procedure Migration

```bash
# List procedure migrations
ls -1 backend/database/procedures/*.up.sql

# Expected output:
# backend/database/procedures/002-utility-functions.up.sql
```

**Validation Checklist**:
- ✅ File in correct directory: `backend/database/procedures/`
- ✅ Both `.up.sql` and `.down.sql` exist
- ✅ Header comment includes all metadata
- ✅ SQL wrapped in `BEGIN;` / `COMMIT;`
- ✅ Uses `CREATE OR REPLACE` (idempotent)

### Step 3: Apply Procedure Migration

```bash
# Apply the procedure migration
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME < backend/database/procedures/002-utility-functions.up.sql

# Expected output: No errors, procedure created successfully
```

### Step 4: Verify Procedure in Database

```bash
# Connect to database and verify the function
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME << 'EOF'
SHOW FUNCTION STATUS WHERE Name = 'calculate_age';
SELECT calculate_age('2000-01-15') as age_calculation;
EOF

# Expected output:
# Function exists and returns calculated age (e.g., 26)
```

### Step 5: Test Procedure Rollback

```bash
# Execute the down migration
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME < backend/database/procedures/002-utility-functions.down.sql

# Verify function no longer exists
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME << 'EOF'
SHOW FUNCTION STATUS WHERE Name = 'calculate_age';
EOF

# Expected output: (empty result set - function dropped)
```

---

## Scenario 3: Folder Structure and Execution Order

This scenario validates that table and procedure migrations are executed in the correct order (tables first, then procedures).

### Step 1: Verify Folder Structure

```bash
# List all migrations by type
ls -1 backend/database/tables/*.up.sql   # Tables first
ls -1 backend/database/procedures/*.up.sql  # Procedures second
```

**Expected Structure**:
```
backend/database/
├── tables/
│   ├── 001-initial-schema.up.sql
│   └── 001-initial-schema.down.sql
└── procedures/
    ├── 001-utility-functions.up.sql
    └── 001-utility-functions.down.sql
```

### Step 2: Verify Execution Order

```bash
# Migration runner discovers and applies in order:
# 1. All table migrations (sorted by version)
# 2. All procedure migrations (sorted by version)
```

**Verification**: Procedures can reference tables created by table migrations without ordering issues.

---

## Scenario 4: Test Idempotency (Prevent Duplicate Execution)

This scenario validates that the same migration cannot be applied twice.

### Step 1: Create Migrations Metadata Table

```bash
# Create the migrations metadata table (see data-model.md)
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME << 'EOF'
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
EOF
```

### Step 2: Record First Execution

```bash
# Apply migration again
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME < migrations/001-test-migration.up.sql

# Record in migrations table
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME << 'EOF'
INSERT INTO migrations 
  (version, description, migration_file, executor_id, status, applied_to_env) 
VALUES 
  ('001', 'Test Migration', 'migrations/001-test-migration.up.sql', 'manual-test', 'success', 'development');
EOF
```

### Step 3: Verify Idempotency

```bash
# Try to apply the same migration again
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME << 'EOF'
SELECT COUNT(*) as already_applied 
FROM migrations 
WHERE version = '001' 
AND applied_to_env = 'development' 
AND status = 'success';
EOF

# Expected output: 1 (migration already applied)

# If attempting to insert duplicate:
# Expected error: Duplicate entry '001-development' for key 'unique_version_env'
```

**Verification**: Idempotency check prevents duplicate execution.

---

## Scenario 5: Test Validation Failure

This scenario validates that invalid migrations are caught before application.

### Step 1: Create an Invalid Migration

```bash
# Create migration with SQL syntax error
cat > migrations/002-invalid-migration.up.sql << 'EOF'
-- Migration: 002 - Invalid Migration
-- Author: test
-- Date: 2026-08-05
-- Environment: development
-- Timeout: 10

BEGIN;

CREATE TABLE invalid_table (
  id INT NOT NULL,
  name VARCHAR(100) REQUIRED  -- Invalid: "REQUIRED" is not a valid SQL keyword
);

COMMIT;
EOF

# Create corresponding down migration
cat > migrations/002-invalid-migration.down.sql << 'EOF'
BEGIN;
DROP TABLE IF EXISTS invalid_table;
COMMIT;
EOF
```

### Step 2: Attempt to Validate

```bash
# Try to parse the invalid SQL
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME < migrations/002-invalid-migration.up.sql

# Expected output: 
# ERROR 1064 (42000): You have an error in your SQL syntax; 
# check the manual that corresponds to your MariaDB server version for the right syntax to use 
# near 'REQUIRED' at line 13
```

**Verification**: SQL syntax error caught before application.

### Step 3: Fix and Retry

```bash
# Fix the invalid migration
cat > migrations/002-invalid-migration.up.sql << 'EOF'
BEGIN;

CREATE TABLE invalid_table (
  id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL
);

COMMIT;
EOF

# Retry validation
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME < migrations/002-invalid-migration.up.sql

# Expected output: (no error - migration now valid)
```

**Verification**: Fixed migration passes validation.

---

## Scenario 6: Test Approval Gate (Production Simulation)

This scenario simulates the production approval gate without modifying production data.

### Prerequisites

- GitHub repository with `main` branch
- GitHub Environment `production-migrations` configured in repository settings
- At least one user configured as approver in the environment

### Steps

1. **Create a test migration**:
   ```bash
   cat > backend/migrations/003-prod-test.up.sql << 'EOF'
   BEGIN;
   CREATE TABLE prod_test (id INT PRIMARY KEY);
   COMMIT;
   EOF
   ```

2. **Push to `development` branch**:
   ```bash
   git checkout -b feature/test-migration
   git add backend/migrations/003-prod-test.*
   git commit -m "test: add production test migration"
   git push origin feature/test-migration
   ```

3. **Open a Pull Request** to `development` branch
   - GitHub Actions `migrations-dev.yml` runs automatically
   - Expected: Validation passes, migration applied to development

4. **Merge to `development` and promote to `main`** (via Pull Request)
   - GitHub Actions `migrations-prod.yml` triggers
   - Expected: Workflow pauses at approval gate

5. **Approval Gate Triggered**:
   - GitHub notifies approvers
   - Approver reviews migration files via GitHub UI
   - Approver clicks "Approve" in GitHub Environment

6. **Production Migration Proceeds**:
   - After approval, workflow resumes
   - Migration applied to production database
   - Migration recorded in production migrations table

**Verification**: Approval gate successfully blocks deployment until manual approval.

---

## Scenario 7: Test Audit Trail

This scenario validates that migration history is correctly recorded.

### Steps

```bash
# Connect to database
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME

# Query migration history
SELECT 
  version, 
  description, 
  executed_at, 
  status, 
  executor_id, 
  applied_to_env 
FROM migrations 
ORDER BY executed_at DESC;

# Expected output (multiple rows from scenarios 1-4):
# version | description | executed_at | status | executor_id | applied_to_env
# 003 | Prod Test | 2026-08-05 12:34:56 | success | github-actions | development
# 002 | Invalid Migration | 2026-08-05 12:33:00 | success | manual-test | development
# 001 | Test Migration | 2026-08-05 12:30:00 | success | manual-test | development
```

**Verification**: Audit trail complete with all metadata (timestamp, executor, status, environment).

---

## Troubleshooting

### Connection Failed

```
ERROR 2003 (HY000): Can't connect to MySQL server on 'localhost' (111)
```

**Fix**: Verify database is running and connection variables are correct:
```bash
echo $DB_HOST $DB_PORT $DB_USER $DB_NAME
```

### Syntax Error in Migration

```
ERROR 1064 (42000): You have an error in your SQL syntax...
```

**Fix**: Review the `.up.sql` file for invalid SQL keywords or missing commas. Use a SQL editor to validate before pushing.

### Permission Denied

```
ERROR 1045 (28000): Access denied for user 'root'@'localhost'
```

**Fix**: Verify database credentials in `.env` are correct and user has CREATE TABLE permissions.

### Duplicate Entry

```
ERROR 1062 (23000): Duplicate entry '001-development' for key 'unique_version_env'
```

**Fix**: This is expected if you try to apply the same migration twice. The idempotency check is working. Delete the migrations metadata entry if you need to retry:
```sql
DELETE FROM migrations WHERE version = '001' AND applied_to_env = 'development';
```

---

## Success Criteria

✅ **All Scenarios Pass**: Migration system is production-ready:
1. Test migration created, applied, and rolled back
2. Stored procedure migration created, applied, and rolled back
3. Folder structure enforces table/procedure separation
4. Idempotency check prevents duplicate execution
5. Invalid migrations caught during validation
6. Approval gate blocks production without authorization
7. Audit trail records all migration history

✅ **End-to-End Flow**: 
- Write migration → Validate → Test on dev → Approve → Deploy to prod → Audit logged

✅ **Performance**: 
- Validation completes in < 30 seconds
- Test migration applies in < 5 seconds
- Rollback automatic on failure

---

## Next Steps

Once all scenarios pass:
1. Proceed to Phase 2 (implementation via `/speckit-tasks`)
2. Implement migration runner (Node.js service)
3. Create GitHub Actions workflows
4. Deploy to production with full approval gate
