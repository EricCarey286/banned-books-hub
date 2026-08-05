import { MigrationFile, validateMigrationFile } from './migration-discovery';
import { Connection } from 'mysql2/promise';
import * as fs from 'fs';

export interface ValidationResult {
  valid: boolean;
  migration: MigrationFile;
  errors: string[];
  warnings: string[];
}

/**
 * Comprehensive migration validation before execution
 */
export async function validateMigration(
  migration: MigrationFile,
  connection: Connection,
  appliedToEnv: string
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. File validation
  const fileValidation = validateMigrationFile(migration);
  if (!fileValidation.valid) {
    errors.push(...fileValidation.errors);
  }

  if (errors.length > 0) {
    return { valid: false, migration, errors, warnings };
  }

  // 2. SQL syntax validation (test parse on database)
  try {
    const upContent = fs.readFileSync(migration.upPath, 'utf-8');

    // Extract SQL from BEGIN...COMMIT
    const sqlMatch = upContent.match(/BEGIN;([\s\S]*?)COMMIT;/);
    if (sqlMatch) {
      const sql = sqlMatch[1].trim();

      // Test-parse the SQL (wrapped in transaction that we rollback)
      try {
        await connection.query('START TRANSACTION');
        await connection.query(sql);
        await connection.query('ROLLBACK');
      } catch (e) {
        errors.push(`SQL syntax error in ${migration.upFile}: ${(e as Error).message}`);
        await connection.query('ROLLBACK').catch(() => {}); // Ensure rollback
      }
    }
  } catch (err) {
    errors.push(`Failed to validate SQL in ${migration.upFile}: ${(err as Error).message}`);
  }

  // 3. Idempotency check (prevent duplicate execution)
  try {
    const [rows] = await connection.query(
      'SELECT COUNT(*) as count FROM migrations WHERE version = ? AND applied_to_env = ? AND status = ?',
      [migration.version, appliedToEnv, 'success']
    ) as any[];

    if (rows[0].count > 0) {
      errors.push(
        `Migration ${migration.version} already applied to ${appliedToEnv} environment`
      );
    }
  } catch (err) {
    warnings.push(`Could not check idempotency (migrations table may not exist yet)`);
  }

  // 4. Check for slow operations
  const upContent = fs.readFileSync(migration.upPath, 'utf-8');
  if (upContent.includes('ALTER TABLE') && !upContent.includes('ALGORITHM=INPLACE')) {
    warnings.push(
      `Migration uses ALTER TABLE without ALGORITHM=INPLACE - may lock table. Use @slow-migration tag if > 30s expected`
    );
  }

  // 5. Reversibility check
  const downContent = fs.readFileSync(migration.downPath, 'utf-8');
  if (!downContent.includes('DROP') && !downContent.includes('DELETE')) {
    warnings.push(
      `Down migration ${migration.downFile} does not appear to reverse changes (no DROP/DELETE found)`
    );
  }

  return {
    valid: errors.length === 0,
    migration,
    errors,
    warnings,
  };
}

/**
 * Validate all migrations before execution
 */
export async function validateAllMigrations(
  migrations: MigrationFile[],
  connection: Connection,
  appliedToEnv: string
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  for (const migration of migrations) {
    const result = await validateMigration(migration, connection, appliedToEnv);
    results.push(result);

    if (!result.valid) {
      console.error(`Validation failed for ${migration.version}: ${result.errors.join('; ')}`);
    }

    if (result.warnings.length > 0) {
      console.warn(`Warnings for ${migration.version}: ${result.warnings.join('; ')}`);
    }
  }

  return results;
}

/**
 * Check if any validations failed
 */
export function hasValidationErrors(results: ValidationResult[]): boolean {
  return results.some((r) => !r.valid);
}
