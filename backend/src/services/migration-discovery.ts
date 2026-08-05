import * as fs from 'fs';
import * as path from 'path';

export interface MigrationFile {
  version: string;
  description: string;
  type: 'table' | 'procedure';
  upFile: string;
  downFile: string;
  upPath: string;
  downPath: string;
}

const MIGRATIONS_BASE = path.join(__dirname, '../../database');
const TABLES_DIR = path.join(MIGRATIONS_BASE, 'tables');
const PROCEDURES_DIR = path.join(MIGRATIONS_BASE, 'procedures');

/**
 * Discover all migration files in backend/database/tables and backend/database/procedures
 * Returns migrations sorted by version, tables first, then procedures
 */
export async function discoverMigrations(): Promise<MigrationFile[]> {
  const migrations: MigrationFile[] = [];

  // Discover table migrations
  try {
    const tableMigrations = discoverMigrationsInDirectory(TABLES_DIR, 'table');
    migrations.push(...tableMigrations);
  } catch (err) {
    console.warn(`No table migrations directory found at ${TABLES_DIR}`);
  }

  // Discover procedure migrations
  try {
    const procedureMigrations = discoverMigrationsInDirectory(PROCEDURES_DIR, 'procedure');
    migrations.push(...procedureMigrations);
  } catch (err) {
    console.warn(`No procedures migrations directory found at ${PROCEDURES_DIR}`);
  }

  // Sort by version (tables first, then procedures within same version)
  return migrations.sort((a, b) => {
    const versionCmp = a.version.localeCompare(b.version);
    if (versionCmp !== 0) return versionCmp;
    // Tables before procedures for same version
    return a.type === 'table' ? -1 : 1;
  });
}

function discoverMigrationsInDirectory(
  directory: string,
  type: 'table' | 'procedure'
): MigrationFile[] {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const files = fs.readdirSync(directory).filter((f) => f.endsWith('.up.sql'));
  const migrations: MigrationFile[] = [];

  for (const upFile of files) {
    const downFile = upFile.replace('.up.sql', '.down.sql');
    const downPath = path.join(directory, downFile);

    // Verify corresponding .down.sql exists
    if (!fs.existsSync(downPath)) {
      console.warn(
        `Missing down migration: ${downFile} for ${upFile} in ${directory}`
      );
      continue;
    }

    // Parse version and description from filename
    // Format: {VERSION}-{DESCRIPTION}.up.sql
    const match = upFile.match(/^([^-]+-[^.]+)\.up\.sql$/);
    if (!match) {
      console.warn(`Invalid migration filename: ${upFile}`);
      continue;
    }

    const versionDesc = match[1];
    const parts = versionDesc.split('-');
    const version = parts[0];
    const description = parts.slice(1).join('-');

    migrations.push({
      version,
      description,
      type,
      upFile,
      downFile,
      upPath: path.join(directory, upFile),
      downPath,
    });
  }

  return migrations;
}

/**
 * Verify that a migration file exists and contains required components
 */
export function validateMigrationFile(migration: MigrationFile): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check up file exists
  if (!fs.existsSync(migration.upPath)) {
    errors.push(`Up migration file not found: ${migration.upPath}`);
    return { valid: false, errors };
  }

  // Check down file exists
  if (!fs.existsSync(migration.downPath)) {
    errors.push(`Down migration file not found: ${migration.downPath}`);
    return { valid: false, errors };
  }

  // Check file contains BEGIN/COMMIT
  const upContent = fs.readFileSync(migration.upPath, 'utf-8');
  if (!upContent.includes('BEGIN;')) {
    errors.push(`Up migration missing BEGIN; in ${migration.upFile}`);
  }
  if (!upContent.includes('COMMIT;')) {
    errors.push(`Up migration missing COMMIT; in ${migration.upFile}`);
  }

  const downContent = fs.readFileSync(migration.downPath, 'utf-8');
  if (!downContent.includes('BEGIN;')) {
    errors.push(`Down migration missing BEGIN; in ${migration.downFile}`);
  }
  if (!downContent.includes('COMMIT;')) {
    errors.push(`Down migration missing COMMIT; in ${migration.downFile}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Get checksum of migration file (SHA256 hash of content)
 */
export function getMigrationChecksum(migration: MigrationFile): string {
  const crypto = require('crypto');
  const content = fs.readFileSync(migration.upPath, 'utf-8');
  return crypto.createHash('sha256').update(content).digest('hex');
}
