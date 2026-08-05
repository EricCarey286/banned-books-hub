# Database Migration CI/CD Pipeline - Manual Setup Guide

**Purpose**: Walk through all manual configuration steps needed to activate the migration system  
**Time Required**: ~30 minutes  
**Prerequisites**: This guide assumes you have admin access to the GitHub repo and can connect to both dev and prod databases

---

## Section 1: Database Setup

### Step 1.1: Create Migrations Table in Development Database

**What**: Initialize the migrations tracking table in your development database  
**Why**: This table records all migration executions, versions, timestamps, and status

```bash
# Option A: Using Railway Database (if on Railway)
railway database psql -e development  # Or mysql depending on your setup

# Option B: Direct MySQL connection
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME
```

**SQL to Execute** (copy the entire block):

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

-- Bootstrap entry for baseline schema
INSERT IGNORE INTO migrations
(version, description, executor_id, status, applied_to_env)
VALUES
('000-baseline', 'Baseline schema before migration system', 'bootstrap', 'success', 'development');
```

**Verify Success**:
```sql
SELECT COUNT(*) FROM migrations;
-- Should return: 1 (the bootstrap entry)

SELECT * FROM migrations;
-- Should show the baseline entry
```

### Step 1.2: Create Migrations Table in Production Database

**What**: Same table setup for production (isolated database)  
**Why**: Production needs its own migration tracking separate from development

**Repeat Step 1.1 for your production database:**

```bash
# Connect to production database
mysql -h $PROD_DB_HOST -P $PROD_DB_PORT -u $PROD_DB_USER -p$PROD_DB_PASSWORD $PROD_DB_NAME
```

**Execute the same SQL as Step 1.1**, but change the bootstrap INSERT to use `'production'`:

```sql
INSERT IGNORE INTO migrations
(version, description, executor_id, status, applied_to_env)
VALUES
('000-baseline', 'Baseline schema before migration system', 'bootstrap', 'success', 'production');
```

---

## Section 2: Environment Variables Configuration

### Step 2.1: Update Backend .env File (Local Development)

**Location**: `backend/.env`

**Add these lines** (if not already present):

```bash
# Migration System Configuration
MIGRATION_TIMEOUT=300
DB_VERSION=10.4
SKIP_MIGRATIONS=false
```

**What each does**:
- `MIGRATION_TIMEOUT`: How many seconds each migration can run before timeout (default 5 minutes)
- `DB_VERSION`: MariaDB version for compatibility checks (used by validator)
- `SKIP_MIGRATIONS`: Set to `true` to disable migrations (useful for testing)

### Step 2.2: Add Environment Variables to Railway (Development Environment)

**Navigate to**: [Railway Dashboard](https://railway.app) → Your Project → Development Service → Variables

**Add these variables**:

```
MIGRATION_TIMEOUT=300
DB_VERSION=10.4
SKIP_MIGRATIONS=false
```

**Verify**:
1. Click "Save" on each variable
2. You should see all 3 variables listed

### Step 2.3: Add Environment Variables to Railway (Production Environment)

**Navigate to**: Railway Dashboard → Your Project → Production Service → Variables

**Add the same variables**:

```
MIGRATION_TIMEOUT=300
DB_VERSION=10.4
SKIP_MIGRATIONS=false
```

---

## Section 3: GitHub Configuration

### Step 3.1: Create GitHub Secrets for Development Database

**Navigate to**: GitHub Repo Settings → Secrets and variables → Actions → Secrets

**Click "New repository secret" and add each**:

| Secret Name | Value | Notes |
|-------------|-------|-------|
| `DEV_DB_HOST` | Your development database host | e.g., `localhost`, `db.railway.internal`, or Railway MySQL host |
| `DEV_DB_PORT` | Your development database port | Usually `3306` |
| `DEV_DB_USER` | Development database username | e.g., `root`, `dev_user` |
| `DEV_DB_PASSWORD` | Development database password | Keep this secure! |
| `DEV_DB_NAME` | Development database name | e.g., `banned_books_dev` |

**How to add**:
1. Click "New repository secret"
2. Enter Name (exactly as shown above)
3. Enter Value
4. Click "Add secret"
5. Repeat for each secret

**Verify**: After adding all 5, you should see them listed (values hidden for security)

### Step 3.2: Configure Production Secrets in GitHub Environment

**This is different** - Production secrets go in a GitHub Environment, not repository secrets

**Navigate to**: GitHub Repo Settings → Environments → Click "New environment"

**Name**: `production-migrations`

**Click "Create environment"**

**Now add secrets to this environment** (same as development, but prefixed with `PROD_`):

| Secret Name | Value |
|-------------|-------|
| `PROD_DB_HOST` | Your production database host |
| `PROD_DB_PORT` | Your production database port (usually `3306`) |
| `PROD_DB_USER` | Production database username |
| `PROD_DB_PASSWORD` | Production database password |
| `PROD_DB_NAME` | Production database name |

**How to add**:
1. In the `production-migrations` environment, scroll down to "Secrets"
2. Click "Add secret"
3. Enter Name and Value
4. Repeat for each secret

### Step 3.3: Configure Protection Rules for Production Environment

**Still in**: GitHub Repo Settings → Environments → `production-migrations`

**Configure Protection Rules**:

1. **Require reviewers**
   - ✅ Check "Require reviewers"
   - Add users or teams who can approve migrations
   - Recommend: Add your team leads or ops team

2. **Deployment branches**
   - ✅ Check "Limit deployment branches to specific branches"
   - Select: `main` (only main branch can deploy to production)

3. **Timeout setting**
   - Set to: 10800 seconds (3 hours) to give time for approval

**Click "Save protection rules"**

---

## Section 4: Verification Steps

### Step 4.1: Verify Database Connection from App

**Start the backend**:

```bash
cd backend
npm run dev
```

**Look for in the logs**:

```
✓ Migrations table initialized successfully
🔄 Initializing migrations system...
🔍 Found X total migrations:
   - 001: test-schema (table)
   - 001: test-procedures (procedure)
✓ Validating migrations...
```

**If you see these messages**: ✅ Database setup is working!

**If you see errors**:
- Check database connection (DB_HOST, DB_USER, DB_PASSWORD)
- Verify migrations table exists: `SELECT COUNT(*) FROM migrations;`
- Check app logs for specific error messages

### Step 4.2: Verify GitHub Secrets are Accessible

**The workflows will automatically use these secrets** (no manual verification needed)

**However, you can check by**:
1. Go to GitHub Actions tab
2. Look for any workflow runs
3. Click on a run
4. If secrets are missing, you'll see error messages like: `undefined is not a function`

### Step 4.3: Verify GitHub Environment Configuration

**Navigate to**: GitHub Repo Settings → Environments → `production-migrations`

**Check**:
- ✅ Environment name is `production-migrations`
- ✅ Secrets listed (DEV_DB_*, PROD_DB_*)
- ✅ Protection rules enabled
- ✅ Require reviewers: enabled with team/users selected
- ✅ Deployment branches: main only

---

## Section 5: Testing the Development Workflow

### Step 5.1: Create a Test Branch

```bash
# Create and checkout a new branch
git checkout -b test/migrations-dev

# Verify you're on the test branch
git branch
# Should show: * test/migrations-dev
```

### Step 5.2: Push to Development Branch

```bash
# Push the test branch to development (this triggers the workflow)
git push -u origin test/migrations-dev

# Create a Pull Request to merge test/migrations-dev → development
# OR just push directly to development if that's your workflow
git push origin HEAD:development
```

### Step 5.3: Watch the GitHub Actions Workflow

**Navigate to**: GitHub Repo → Actions tab

**You should see**:
- Workflow name: "Database Migrations - Development"
- Status: Running (yellow indicator)

**Wait for it to complete** (2-5 minutes)

**Check Results**:
1. ✅ Workflow shows green checkmark = Success
2. ❌ Workflow shows red X = Failed (see logs below)

**View Detailed Logs**:
1. Click on the workflow run
2. Click "Validate & Deploy Migrations" job
3. Expand each step to see output
4. Look for messages like:
   - "✓ Discovering migrations..."
   - "▶️ Deploying migrations to development..."
   - "✅ Migration deployment complete"

### Step 5.4: Verify Migration Applied to Database

```bash
# Connect to development database
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME

# Check migrations table
SELECT version, description, status, executed_at, applied_to_env 
FROM migrations 
ORDER BY executed_at DESC;

# Should show: Both 001-test-schema and 001-test-procedures as 'success'

# Verify the test table exists
SHOW TABLES LIKE 'migration_test';
# Should return: migration_test

# Verify the test function exists
SHOW FUNCTION STATUS WHERE NAME = 'test_age_calculation';
# Should return the function
```

**If you see the migrations recorded and the objects created**: ✅ Development workflow is working!

---

## Section 6: Testing the Production Workflow

### Step 6.1: Prepare a Test Procedure Migration

```bash
# Go to main branch
git checkout main

# Create a new test procedure migration
cat > backend/database/procedures/002-test-prod-functions.up.sql << 'EOF'
-- Migration: 002 - Test Production Functions
-- Author: test
-- Date: 2026-08-05
-- Environment: both
-- Timeout: 10

BEGIN;

CREATE OR REPLACE FUNCTION test_string_concat(str1 VARCHAR(100), str2 VARCHAR(100))
RETURNS VARCHAR(200)
DETERMINISTIC
BEGIN
  RETURN CONCAT(str1, ' ', str2);
END;

COMMIT;
EOF

# Create the down migration
cat > backend/database/procedures/002-test-prod-functions.down.sql << 'EOF'
BEGIN;

DROP FUNCTION IF EXISTS test_string_concat;

COMMIT;
EOF
```

### Step 6.2: Push to Main Branch

```bash
# Commit the test migration
git add backend/database/procedures/002-test-prod-functions.*
git commit -m "test: add production test function"

# Push to main (this triggers the production workflow)
git push origin main
```

### Step 6.3: Watch GitHub Actions Workflow

**Navigate to**: GitHub Actions tab

**You should see**:
- Workflow: "Database Migrations - Production"
- Status: Shows two jobs:
  1. "Discover & Validate Migrations" - Running
  2. "Deploy to Production" - Waiting (yellow, not running yet)

**Wait for validation to complete** (2-3 minutes)

**The second job will show**: "Waiting for approval"

### Step 6.4: Approve the Deployment

**Navigate to**: GitHub Repo → Actions → Database Migrations - Production workflow run

**Or**: Look for an approval notification/email from GitHub

**To approve**:

**Option A: Via GitHub UI**
1. Click on the workflow run
2. Scroll to "Review deployments"
3. Click "Review deployments" button
4. Select "production-migrations" environment
5. Check the radio button next to your name/team
6. Click "Approve"

**Option B: Via GitHub Actions Deployment Section**
1. Go to GitHub Repo → Deployments
2. Find the pending deployment
3. Click "Review deployments"
4. Approve as above

**Result**: The second job will start running immediately after approval

### Step 6.5: Verify Production Deployment

**After approval** (1-2 minutes):

**In GitHub UI**:
- Second job "Deploy to Production" should show green checkmark

**In Production Database**:

```bash
# Connect to production database
mysql -h $PROD_DB_HOST -P $PROD_DB_PORT -u $PROD_DB_USER -p$PROD_DB_PASSWORD $PROD_DB_NAME

# Check migrations table
SELECT version, description, status, executed_at, applied_to_env 
FROM migrations 
WHERE applied_to_env = 'production'
ORDER BY executed_at DESC;

# Should show: 002-test-prod-functions as 'success'

# Verify the function exists
SHOW FUNCTION STATUS WHERE NAME = 'test_string_concat';
```

**If you see the function and migration recorded**: ✅ Production workflow is working!

---

## Section 7: Testing Rejection (Optional but Recommended)

### Step 7.1: Create Another Test Migration

```bash
git checkout main

cat > backend/database/procedures/003-test-rejection.up.sql << 'EOF'
BEGIN;

CREATE OR REPLACE FUNCTION test_rejection()
RETURNS VARCHAR(100)
DETERMINISTIC
BEGIN
  RETURN 'This should be rejected';
END;

COMMIT;
EOF

cat > backend/database/procedures/003-test-rejection.down.sql << 'EOF'
BEGIN;
DROP FUNCTION IF EXISTS test_rejection;
COMMIT;
EOF

git add backend/database/procedures/003-test-rejection.*
git commit -m "test: add rejection test function"
git push origin main
```

### Step 7.2: Reject the Deployment

**Navigate to**: GitHub Actions → Database Migrations - Production → Review deployments

**Click "Reject"** instead of "Approve"

**Result**: The deployment will be canceled

**Verify in Production Database**:

```bash
SELECT * FROM migrations WHERE version = '003-test-rejection';
# Should return: Nothing (migration never executed)

SHOW FUNCTION STATUS WHERE NAME = 'test_rejection';
# Should return: Nothing (function not created)
```

**If the migration is not in the database**: ✅ Rejection workflow is working!

---

## Section 8: Cleanup (Remove Test Migrations)

### Step 8.1: Remove Test Migration Files

```bash
# Go to development branch
git checkout development

# Remove test migrations
rm backend/database/tables/001-test-schema.*
rm backend/database/procedures/001-test-procedures.*
rm backend/database/procedures/002-test-prod-functions.*
rm backend/database/procedures/003-test-rejection.*

# Commit the removal
git add -A
git commit -m "cleanup: remove test migrations"
git push origin development
```

### Step 8.2: Clean Up Test Tables/Functions (Optional)

```bash
# Development database
mysql -h $DEV_DB_HOST ... $DEV_DB_NAME << 'EOF'
DROP TABLE IF EXISTS migration_test;
DROP FUNCTION IF EXISTS test_age_calculation;
DROP FUNCTION IF EXISTS test_string_concat;
DROP FUNCTION IF EXISTS test_rejection;
EOF

# Production database
mysql -h $PROD_DB_HOST ... $PROD_DB_NAME << 'EOF'
DROP FUNCTION IF EXISTS test_string_concat;
DROP FUNCTION IF EXISTS test_rejection;
EOF
```

---

## Section 9: Verification Checklist

**Use this checklist to verify everything is working**:

### Database Setup
- [ ] Development migrations table created
- [ ] Production migrations table created
- [ ] Both tables have bootstrap entry (000-baseline)

### Environment Variables
- [ ] `MIGRATION_TIMEOUT=300` in Railway (dev and prod)
- [ ] `DB_VERSION=10.4` in Railway (dev and prod)
- [ ] `SKIP_MIGRATIONS=false` in Railway (dev and prod)

### GitHub Secrets (Repository)
- [ ] `DEV_DB_HOST` secret created
- [ ] `DEV_DB_PORT` secret created
- [ ] `DEV_DB_USER` secret created
- [ ] `DEV_DB_PASSWORD` secret created
- [ ] `DEV_DB_NAME` secret created

### GitHub Environment `production-migrations`
- [ ] Environment created with correct name
- [ ] `PROD_DB_HOST` secret created
- [ ] `PROD_DB_PORT` secret created
- [ ] `PROD_DB_USER` secret created
- [ ] `PROD_DB_PASSWORD` secret created
- [ ] `PROD_DB_NAME` secret created
- [ ] "Require reviewers" enabled
- [ ] Approvers/teams selected
- [ ] Deployment branches: `main` only

### Workflow Testing
- [ ] Development workflow ran successfully
- [ ] Test table created in development database
- [ ] Test procedure created in development database
- [ ] Production workflow paused for approval
- [ ] Approved deployment succeeded
- [ ] Test procedure created in production database
- [ ] Rejection test blocked deployment

---

## Section 10: Troubleshooting

### Workflow Not Triggering

**Problem**: Push to development but no workflow runs

**Solutions**:
1. Check paths in workflow: must modify `backend/database/**`
2. Verify workflow file exists: `.github/workflows/migrations-dev.yml`
3. Check workflow syntax: GitHub shows error if YAML is invalid
4. Ensure branch names are correct: `development` (not `develop`)

### "Secrets not found" Error in Workflow

**Problem**: Workflow fails with "undefined is not a function"

**Solutions**:
1. Verify secrets are added to GitHub (Settings → Secrets)
2. Verify secret names match exactly (case-sensitive)
3. Verify secrets are in the right place:
   - Repository secrets for `DEV_DB_*`
   - Environment secrets for `PROD_DB_*`
4. Secrets must be referenced as: `${{ secrets.SECRET_NAME }}`

### Database Connection Fails

**Problem**: "Cannot connect to MySQL server"

**Solutions**:
1. Verify credentials are correct
2. Verify database host is accessible from GitHub Actions servers
3. For Railway: Use Railway-provided host (not localhost)
4. Check if database is running: `mysql -h $HOST -u $USER -p$PASSWORD -e "SELECT 1;"`

### Approval Not Appearing

**Problem**: Production workflow never asks for approval

**Solutions**:
1. Verify environment name is exactly: `production-migrations`
2. Verify "Require reviewers" is enabled in environment settings
3. Verify you (or your team) is listed as an approver
4. Verify deployment branch restriction is set to `main`
5. Verify workflow references environment: `environment: production-migrations`

### Migration Not Executing

**Problem**: Workflow succeeds but migration doesn't run

**Solutions**:
1. Check migrations table: `SELECT * FROM migrations WHERE version = '001';`
2. Verify migration file naming: `{VERSION}-{DESCRIPTION}.up.sql`
3. Verify both `.up.sql` and `.down.sql` exist
4. Verify `BEGIN;` and `COMMIT;` are in the files
5. Check workflow logs for validation errors

---

## Quick Reference: Commands

### Database Connection

```bash
# Development
mysql -h localhost -P 3306 -u root -p banned_books_dev

# Production  
mysql -h $PROD_DB_HOST -P $PROD_DB_PORT -u $PROD_DB_USER -p$PROD_DB_PASSWORD $PROD_DB_NAME
```

### Check Migrations Table

```sql
-- View all migrations
SELECT * FROM migrations ORDER BY executed_at DESC;

-- View environment-specific
SELECT * FROM migrations WHERE applied_to_env = 'development';

-- View with summary
SELECT version, description, status, executed_at, applied_to_env 
FROM migrations 
ORDER BY executed_at DESC;
```

### Check Test Objects

```sql
-- Check test table
SHOW TABLES LIKE 'migration_test';
DESCRIBE migration_test;

-- Check test functions
SHOW FUNCTION STATUS WHERE DB = 'banned_books_dev';
SHOW CREATE FUNCTION test_age_calculation;
```

### Start Backend (with Migrations)

```bash
cd backend
SKIP_MIGRATIONS=false npm run dev
```

---

## Next Steps After Setup

Once you've completed all steps and verified everything works:

1. **Remove test migrations** (see Section 8.1)
2. **Create your first real migration** using the format documented in `docs/MIGRATIONS.md`
3. **Push to development** branch to test the workflow
4. **Promote to production** when ready (via main branch → approval gate)
5. **Monitor migrations table** to track all deployments

---

**Setup Complete!** 🎉

Your database migration CI/CD pipeline is now ready to use. Start creating migrations and deploying schema changes through the automated pipeline!

For questions, refer to:
- `docs/MIGRATIONS.md` - Developer guide
- `IMPLEMENTATION_SUMMARY.md` - Technical overview
- GitHub Actions logs - Detailed execution details
