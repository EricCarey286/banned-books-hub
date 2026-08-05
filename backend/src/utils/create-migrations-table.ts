import { Connection } from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Initialize migrations table in database
 * Called at application startup to ensure table exists
 */
export async function createMigrationsTable(connection: Connection): Promise<void> {
  try {
    // Read schema file
    const schemaPath = path.join(__dirname, 'migrations-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Split by semicolon to handle multiple statements
    const statements = schema
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    // Execute each statement
    for (const statement of statements) {
      await connection.query(statement);
    }

    console.log('✓ Migrations table initialized successfully');
  } catch (err) {
    // Check if error is "table already exists" (which is fine)
    const error = err as any;
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('✓ Migrations table already exists');
      return;
    }

    console.error('Failed to initialize migrations table:', error);
    throw new Error(`Migrations table initialization failed: ${(err as Error).message}`);
  }
}

/**
 * Check if migrations table exists
 */
export async function checkMigrationsTableExists(connection: Connection): Promise<boolean> {
  try {
    await connection.query('SELECT COUNT(*) FROM migrations LIMIT 1');
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Get migrations table status
 */
export async function getMigrationsTableStatus(
  connection: Connection
): Promise<{
  exists: boolean;
  rowCount: number;
  lastMigration?: { version: string; executedAt: string };
}> {
  try {
    const [rows] = (await connection.query('SELECT COUNT(*) as count FROM migrations')) as any;
    const rowCount = rows[0].count;

    let lastMigration;
    if (rowCount > 0) {
      const [lastRows] = (await connection.query(
        'SELECT version, executed_at FROM migrations ORDER BY executed_at DESC LIMIT 1'
      )) as any;
      if (lastRows.length > 0) {
        lastMigration = {
          version: lastRows[0].version,
          executedAt: lastRows[0].executed_at,
        };
      }
    }

    return {
      exists: true,
      rowCount,
      lastMigration,
    };
  } catch (err) {
    return {
      exists: false,
      rowCount: 0,
    };
  }
}
