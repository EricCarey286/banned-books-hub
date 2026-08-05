import { MigrationFile, getMigrationChecksum } from './migration-discovery';
import { Connection, Pool } from 'mysql2/promise';
import * as fs from 'fs';
import * as crypto from 'crypto';

export interface ExecutionResult {
  migration: MigrationFile;
  success: boolean;
  error?: string;
  executionTimeMs: number;
  rolledBack: boolean;
}

const DEFAULT_TIMEOUT_MS = 300000; // 5 minutes

/**
 * Execute a single migration
 */
export async function executeMigration(
  migration: MigrationFile,
  connection: Connection,
  appliedToEnv: string,
  executorId: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<ExecutionResult> {
  const startTime = Date.now();
  let rolledBack = false;

  try {
    // Check idempotency first
    const [rows] = await connection.query(
      'SELECT COUNT(*) as count FROM migrations WHERE version = ? AND applied_to_env = ? AND status = ?',
      [migration.version, appliedToEnv, 'success']
    ) as any[];

    if (rows[0].count > 0) {
      console.log(`Migration ${migration.version} already applied, skipping (idempotent)`);
      return {
        migration,
        success: true,
        executionTimeMs: 0,
        rolledBack: false,
      };
    }

    // Read migration SQL
    const upContent = fs.readFileSync(migration.upPath, 'utf-8');
    const downContent = fs.readFileSync(migration.downPath, 'utf-8');

    // Extract SQL from BEGIN...COMMIT
    const upMatch = upContent.match(/BEGIN;([\s\S]*?)COMMIT;/);
    if (!upMatch) {
      throw new Error(`Invalid migration format: missing BEGIN/COMMIT in ${migration.upFile}`);
    }

    const upSql = upMatch[1].trim();
    const checksum = crypto.createHash('sha256').update(upContent).digest('hex');

    // Begin transaction and execute migration
    await connection.beginTransaction();

    try {
      // Split SQL by semicolon (handle multiple statements)
      const statements = upSql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        await connection.query(statement);
      }

      // Record metadata (while in transaction)
      const executionTime = Date.now() - startTime;

      if (executionTime > timeoutMs) {
        throw new Error(`Migration exceeded timeout: ${executionTime}ms > ${timeoutMs}ms`);
      }

      await connection.query(
        `INSERT INTO migrations
         (version, description, migration_file, executor_id, status, execution_time_ms, applied_to_env, checksum)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          migration.version,
          migration.description,
          migration.upFile,
          executorId,
          'success',
          executionTime,
          appliedToEnv,
          checksum,
        ]
      );

      await connection.commit();

      console.log(
        `Migration ${migration.version} applied successfully in ${executionTime}ms`
      );

      return {
        migration,
        success: true,
        executionTimeMs: executionTime,
        rolledBack: false,
      };
    } catch (err) {
      // Rollback on error
      await connection.rollback().catch(() => {});

      console.error(`Migration ${migration.version} failed: ${(err as Error).message}`);

      // Attempt automatic rollback using .down.sql
      try {
        await executeRollback(migration, connection, appliedToEnv, executorId);
        rolledBack = true;
      } catch (rollbackErr) {
        console.error(
          `Rollback for ${migration.version} failed: ${(rollbackErr as Error).message}`
        );
      }

      throw err;
    }
  } catch (err) {
    const executionTime = Date.now() - startTime;
    const errorMsg = (err as Error).message;

    // Record failure in metadata
    try {
      await connection.query(
        `INSERT INTO migrations
         (version, description, migration_file, executor_id, status, execution_time_ms, error_message, applied_to_env)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          migration.version,
          migration.description,
          migration.upFile,
          executorId,
          rolledBack ? 'rolled_back' : 'failed',
          executionTime,
          errorMsg,
          appliedToEnv,
        ]
      );
    } catch (metaErr) {
      console.error(`Failed to record migration failure: ${(metaErr as Error).message}`);
    }

    return {
      migration,
      success: false,
      error: errorMsg,
      executionTimeMs: executionTime,
      rolledBack,
    };
  }
}

/**
 * Execute rollback migration
 */
async function executeRollback(
  migration: MigrationFile,
  connection: Connection,
  appliedToEnv: string,
  executorId: string
): Promise<void> {
  const downContent = fs.readFileSync(migration.downPath, 'utf-8');

  // Extract SQL from BEGIN...COMMIT
  const downMatch = downContent.match(/BEGIN;([\s\S]*?)COMMIT;/);
  if (!downMatch) {
    throw new Error(`Invalid rollback format: missing BEGIN/COMMIT in ${migration.downFile}`);
  }

  const downSql = downMatch[1].trim();

  await connection.beginTransaction();

  try {
    // Split SQL by semicolon
    const statements = downSql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      await connection.query(statement);
    }

    // Update metadata to mark as rolled back
    await connection.query(
      `UPDATE migrations SET status = ? WHERE version = ? AND applied_to_env = ?`,
      ['rolled_back', migration.version, appliedToEnv]
    );

    await connection.commit();

    console.log(`Rollback for migration ${migration.version} completed successfully`);
  } catch (err) {
    await connection.rollback().catch(() => {});
    throw new Error(`Rollback SQL failed: ${(err as Error).message}`);
  }
}

/**
 * Execute multiple migrations in sequence
 */
export async function executeMigrations(
  migrations: MigrationFile[],
  connection: Connection,
  appliedToEnv: string,
  executorId: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<ExecutionResult[]> {
  const results: ExecutionResult[] = [];

  for (const migration of migrations) {
    const result = await executeMigration(
      migration,
      connection,
      appliedToEnv,
      executorId,
      timeoutMs
    );
    results.push(result);

    if (!result.success) {
      console.error(`Stopping migration execution due to failure in ${migration.version}`);
      break;
    }
  }

  return results;
}

/**
 * Get execution summary
 */
export function getSummary(results: ExecutionResult[]): {
  total: number;
  successful: number;
  failed: number;
  rolledBack: number;
  totalTimeMs: number;
} {
  return {
    total: results.length,
    successful: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    rolledBack: results.filter((r) => r.rolledBack).length,
    totalTimeMs: results.reduce((sum, r) => sum + r.executionTimeMs, 0),
  };
}
