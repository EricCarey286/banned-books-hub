import { Connection } from 'mysql2/promise';

export interface MigrationRecord {
  id: number;
  version: string;
  description: string;
  migration_file: string;
  executed_at: string;
  executor_id: string | null;
  status: 'pending' | 'success' | 'failed' | 'rolled_back';
  execution_time_ms: number | null;
  error_message: string | null;
  applied_to_env: 'development' | 'production';
  checksum: string | null;
}

export interface MigrationStatistics {
  total: number;
  successful: number;
  failed: number;
  rolled_back: number;
  pending: number;
  by_environment: {
    development: number;
    production: number;
  };
  total_execution_time_ms: number;
}

/**
 * Get migration history (all migrations)
 */
export async function getMigrationHistory(
  connection: Connection,
  limit: number = 100,
  offset: number = 0
): Promise<MigrationRecord[]> {
  const [rows] = await connection.query(
    `SELECT * FROM migrations
     ORDER BY executed_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );

  return rows as MigrationRecord[];
}

/**
 * Get migration by version
 */
export async function getMigrationByVersion(
  connection: Connection,
  version: string
): Promise<MigrationRecord | null> {
  const [rows] = await connection.query(
    'SELECT * FROM migrations WHERE version = ? ORDER BY executed_at DESC LIMIT 1',
    [version]
  ) as any[];

  return rows.length > 0 ? rows[0] : null;
}

/**
 * Get migrations for specific environment
 */
export async function getMigrationsByEnvironment(
  connection: Connection,
  env: 'development' | 'production',
  limit: number = 100
): Promise<MigrationRecord[]> {
  const [rows] = await connection.query(
    `SELECT * FROM migrations
     WHERE applied_to_env = ?
     ORDER BY executed_at DESC
     LIMIT ?`,
    [env, limit]
  );

  return rows as MigrationRecord[];
}

/**
 * Get failed or rolled back migrations
 */
export async function getProblematicMigrations(
  connection: Connection
): Promise<MigrationRecord[]> {
  const [rows] = await connection.query(
    `SELECT * FROM migrations
     WHERE status IN ('failed', 'rolled_back')
     ORDER BY executed_at DESC`
  );

  return rows as MigrationRecord[];
}

/**
 * Get migration statistics
 */
export async function getMigrationStatistics(connection: Connection): Promise<MigrationStatistics> {
  const [statRows] = await connection.query(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
       SUM(CASE WHEN status = 'rolled_back' THEN 1 ELSE 0 END) as rolled_back,
       SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
       SUM(CASE WHEN applied_to_env = 'development' THEN 1 ELSE 0 END) as dev_count,
       SUM(CASE WHEN applied_to_env = 'production' THEN 1 ELSE 0 END) as prod_count,
       COALESCE(SUM(execution_time_ms), 0) as total_execution_time
     FROM migrations`
  ) as any[];

  const stats = statRows[0];

  return {
    total: stats.total || 0,
    successful: stats.successful || 0,
    failed: stats.failed || 0,
    rolled_back: stats.rolled_back || 0,
    pending: stats.pending || 0,
    by_environment: {
      development: stats.dev_count || 0,
      production: stats.prod_count || 0,
    },
    total_execution_time_ms: stats.total_execution_time || 0,
  };
}

/**
 * Get recent migrations (last N)
 */
export async function getRecentMigrations(
  connection: Connection,
  limit: number = 20
): Promise<MigrationRecord[]> {
  const [rows] = await connection.query(
    `SELECT * FROM migrations
     WHERE status = 'success'
     ORDER BY executed_at DESC
     LIMIT ?`,
    [limit]
  );

  return rows as MigrationRecord[];
}

/**
 * Check if migration version has been applied
 */
export async function isMigrationApplied(
  connection: Connection,
  version: string,
  env: 'development' | 'production'
): Promise<boolean> {
  const [rows] = await connection.query(
    'SELECT COUNT(*) as count FROM migrations WHERE version = ? AND applied_to_env = ? AND status = ?',
    [version, env, 'success']
  ) as any[];

  return rows[0].count > 0;
}

/**
 * Get migration execution duration (useful for slow migrations)
 */
export async function getSlowMigrations(
  connection: Connection,
  thresholdMs: number = 30000 // 30 seconds default
): Promise<MigrationRecord[]> {
  const [rows] = await connection.query(
    `SELECT * FROM migrations
     WHERE execution_time_ms > ?
     ORDER BY execution_time_ms DESC`,
    [thresholdMs]
  );

  return rows as MigrationRecord[];
}

/**
 * Get migrations by executor
 */
export async function getMigrationsByExecutor(
  connection: Connection,
  executorId: string
): Promise<MigrationRecord[]> {
  const [rows] = await connection.query(
    `SELECT * FROM migrations
     WHERE executor_id = ?
     ORDER BY executed_at DESC`,
    [executorId]
  );

  return rows as MigrationRecord[];
}

/**
 * Format migration record for API response
 */
export function formatMigrationRecord(record: MigrationRecord): any {
  return {
    version: record.version,
    description: record.description,
    status: record.status,
    executedAt: record.executed_at,
    executorId: record.executor_id,
    executionTimeMs: record.execution_time_ms,
    environment: record.applied_to_env,
    errorMessage: record.error_message,
    file: record.migration_file,
  };
}

/**
 * Format statistics for API response
 */
export function formatStatistics(stats: MigrationStatistics): any {
  return {
    total: stats.total,
    successful: stats.successful,
    failed: stats.failed,
    rolledBack: stats.rolled_back,
    pending: stats.pending,
    byEnvironment: stats.by_environment,
    totalExecutionTimeMs: stats.total_execution_time_ms,
    totalExecutionTimeSec: Math.round(stats.total_execution_time_ms / 1000),
  };
}
