# Contract: CI/CD Workflow Interface

**Version**: 1.0

**Purpose**: Define the contract that CI/CD workflows must satisfy to integrate with the migration system.

---

## Workflow Trigger Contract

### Development Branch Workflow

**Triggered By**: Push to `development` branch

**Trigger Pattern**:
```yaml
on:
  push:
    branches:
      - development
    paths:
      - 'backend/migrations/**'
      - '.github/workflows/migrations-dev.yml'
```

**Rationale**: Only run migrations workflow when migration files or workflow itself changes.

### Production Branch Workflow

**Triggered By**: Push to `main` branch (requires approval)

**Trigger Pattern**:
```yaml
on:
  push:
    branches:
      - main
    paths:
      - 'backend/migrations/**'
      - '.github/workflows/migrations-prod.yml'
```

**Approval Gate**: Requires GitHub Environment `production-migrations` with manual approval before deployment.

---

## Workflow Environment Variables Contract

### Input Variables (Required)

Workflows MUST read these variables from environment or workflow inputs:

| Variable | Source | Purpose | Example |
|----------|--------|---------|---------|
| `DB_HOST` | GitHub Secrets (environment-specific) | Database host | `db.railway.internal` |
| `DB_USER` | GitHub Secrets (environment-specific) | Database user | `banned_books_user` |
| `DB_PASSWORD` | GitHub Secrets (environment-specific) | Database password | `[secret]` |
| `DB_NAME` | GitHub Secrets (environment-specific) | Database name | `banned_books_dev` |
| `DB_PORT` | GitHub Secrets (environment-specific) | Database port | `3306` |
| `DB_VERSION` | Environment variable | MariaDB version (for compatibility) | `10.4` |
| `MIGRATION_TIMEOUT` | Environment variable (optional) | Migration timeout in seconds | `300` |
| `EXECUTOR_ID` | Workflow context | Identity applying migration | `github-actions` |

### Secret Naming Convention

GitHub Secrets MUST follow this naming pattern:

```
{ENVIRONMENT}_DB_HOST
{ENVIRONMENT}_DB_USER
{ENVIRONMENT}_DB_PASSWORD
{ENVIRONMENT}_DB_NAME
{ENVIRONMENT}_DB_PORT
```

Example for production environment:
```
PROD_DB_HOST
PROD_DB_USER
PROD_DB_PASSWORD
PROD_DB_NAME
PROD_DB_PORT
```

---

## Workflow Execution Steps Contract

### Step 1: Discover Migrations

**Purpose**: Identify which migrations to apply

**Input**: Git push event (commit SHA, branch)

**Output**: List of new/pending migrations (versions and file paths)

**Process**:
```bash
# Find all .up.sql migration files in backend/migrations/
ls -1 backend/migrations/*.up.sql | sort

# Query migrations table to determine which are already applied
# Compare: committed migrations vs. applied migrations
```

**Contract**: Workflow must accurately identify:
- ✅ Migrations present in git but not yet applied
- ✅ Migrations already applied (skip idempotency check)
- ❌ Migrations applied but now removed from git (warn, do not re-apply)

---

### Step 2: Validate Migrations

**Purpose**: Ensure migration files are valid before application

**Input**: List of pending migrations (from Step 1)

**Output**: Validation report (pass/fail) and list of validated migrations

**Validation Checks** (from migration-file-contract.md):
1. File name matches pattern
2. Both `.up.sql` and `.down.sql` exist
3. Header comment present and valid
4. SQL syntax valid (test parse against MariaDB)
5. SQL compatible with target MariaDB version
6. Transaction wrapping present
7. `.down.sql` reverses `.up.sql`

**Failure Handling**:
- ❌ On validation failure: Stop pipeline, report error to git commit (via GitHub Checks API)
- ❌ Do NOT apply any migrations if validation fails
- ❌ Developer must fix and push new commit to retry

**Success Handling**:
- ✅ Continue to application step

---

### Step 3: Execute Migrations (Development Only)

**Purpose**: Apply validated migrations to development database

**Input**: List of validated migrations

**Output**: Execution report (success/failure per migration)

**Process**:
```bash
for each validated migration:
  1. Begin transaction
  2. Execute migration.up.sql
  3. Record migration metadata (version, status='success', execution_time)
  4. Commit transaction
  5. On error: Rollback transaction, execute migration.down.sql, record status='failed'
```

**Idempotency Check**:
```sql
SELECT COUNT(*) FROM migrations 
WHERE version = '{MIGRATION_VERSION}' 
AND applied_to_env = 'development'
AND status = 'success'
```

If already applied: Skip (idempotent), record in log.

**Timeout Enforcement**:
- Each migration has `MIGRATION_TIMEOUT` (default 300 seconds)
- If migration exceeds timeout: Kill query, rollback, record error

**Success Criteria**:
- ✅ All migrations applied with status='success'
- ✅ Migrations table correctly updated
- ✅ Development database schema matches expected state

**Failure Handling**:
- ❌ If ANY migration fails: Automatic rollback (transaction guarantee)
- ❌ Pipeline halts; developer notified via GitHub Check

---

### Step 4: Verify Schema (Development Only)

**Purpose**: Confirm database schema is correct after migration

**Input**: Expected schema (from migration files)

**Output**: Verification report (pass/fail)

**Process**:
```sql
-- Run sanity checks
SHOW TABLES;
DESCRIBE {TABLE_NAME};
SHOW INDEXES FROM {TABLE_NAME};
```

**Checks**:
- ✅ All expected tables exist
- ✅ All expected columns exist with correct types
- ✅ All expected indexes exist

**Failure Handling**:
- ❌ If verification fails: Alert developers (likely data corruption)
- ⚠️  Do NOT proceed; manual investigation required

---

### Step 5: Approval Gate (Production Only)

**Purpose**: Require manual review before applying migrations to production

**Input**: List of validated migrations

**Gate**: GitHub Environment `production-migrations` with required approvers

**Implementation**:
```yaml
environment:
  name: production-migrations
  url: https://github.com/...  # Link to deployment
  deployment_branch_policy:
    protected_branches: true
```

**Requirements**:
- At least 1 approver from authorized list
- Deployment must wait for approval before proceeding
- Approval/denial logged in GitHub UI

**Approval Workflow**:
1. Workflow pauses at approval step
2. GitHub notifies approvers (via email, Slack, etc.)
3. Approver reviews migration files (via GitHub UI)
4. Approver clicks "Approve" or "Reject"
5. If approved: Workflow continues to production deployment
6. If rejected: Workflow halts; migrations NOT applied

**Metadata Captured**:
- ✅ Who approved (approver identity)
- ✅ When approved (timestamp)
- ✅ Approval comments (if provided)

---

### Step 6: Execute Migrations (Production, Post-Approval)

**Purpose**: Apply validated, approved migrations to production database

**Input**: Approved migrations (from Step 5)

**Output**: Execution report

**Process**: Same as Step 3 (development), but applied to production database.

**Critical Differences from Development**:
- ⚠️  Production timeout may be longer (maintenance window, off-peak)
- ⚠️  Automatic rollback only on failure (manual pause/resume may be needed)
- 📊 Monitoring and alerting during execution (alert ops on status change)
- 📝 Detailed logging to CloudWatch/Railway logs

**Success Criteria**:
- ✅ All migrations applied with status='success' to production database
- ✅ Migrations table updated in production
- ✅ No errors or timeouts

**Failure Handling**:
- ❌ Automatic rollback (transaction guarantee)
- ❌ Alert ops team immediately (PagerDuty, Slack, email)
- ❌ Deployment marked as failed; manual investigation required

---

### Step 7: Notify Results

**Purpose**: Report migration results to developers/ops

**Input**: Execution report from Step 3 or 6

**Output**: GitHub Check status, logs, notifications

**Notifications**:
- ✅ Success: GitHub Check passes, green checkmark on commit
- ❌ Failure: GitHub Check fails, red X on commit, error details in logs

**Log Destinations**:
- GitHub Actions logs (workflow output)
- Rails deployment logs (integration point)
- CloudWatch/Railway logs (long-term retention)

**Metadata Logged**:
- Workflow run URL (link to GitHub Actions)
- Migrations applied (versions, descriptions)
- Execution times (per migration)
- Executor ID (github-actions)
- Approver ID (production only)
- Timestamps (start, end, per-migration)

---

## Exit Code Contract

### Workflow Exit Codes

| Code | Meaning | Action |
|------|---------|--------|
| 0 | All migrations applied successfully | Deployment succeeds |
| 1 | Validation failed | Development: alert developer; Production: block deployment |
| 2 | Execution failed (migration error) | Automatic rollback; alert ops; require manual investigation |
| 3 | Timeout exceeded | Automatic rollback; alert ops; check for slow queries |
| 124 | Workflow timeout (GitHub Actions 6-hour limit) | Very long migration; split into smaller migrations |

---

## Error Reporting Contract

### Error Messages

Workflow MUST report clear, actionable error messages:

```
❌ Migration Validation Failed
Version: 003-add-audit-table
Reason: SQL Parse Error
Details: 
  Line 15: Unexpected keyword 'ALGORITHM' in this context
  Suggestion: Use ALGORITHM=COPY for MariaDB 10.4 compatibility
  
Fix:
  1. Edit backend/migrations/003-add-audit-table.up.sql
  2. Replace ALGORITHM=INPLACE with ALGORITHM=COPY
  3. Push new commit to retry
```

---

## Rollback Emergency Protocol

### Manual Rollback Trigger

If a production migration causes issues:

1. **Operator Action**: Create GitHub issue tagged `[EMERGENCY-ROLLBACK]`
2. **Workflow Trigger**: Manual GitHub Actions workflow run with input `rollback_version=003`
3. **Rollback Process**:
   ```sql
   BEGIN;
   -- Execute migration.003-xxx.down.sql
   UPDATE migrations SET status='rolled_back' WHERE version='003';
   COMMIT;
   ```
4. **Result**: Schema reverted to pre-migration state
5. **Approval**: Team investigates root cause before re-applying

### Constraints

- ❌ No automatic rollback once production deployment succeeds
- ⚠️  Only manual operator intervention can trigger rollback
- 📝 All rollbacks logged in migrations table with `status='rolled_back'`

---

## Summary

CI/CD workflows integrate with the migration system via:
- ✅ Environment variables and GitHub Secrets (input)
- ✅ Migration file discovery and validation (pre-deployment)
- ✅ Database connection and execution (deployment)
- ✅ GitHub Environment approval (production gate)
- ✅ Status reporting and logging (post-deployment)
- ✅ Emergency rollback protocol (disaster recovery)

Each workflow step is independent and can be tested in isolation.
