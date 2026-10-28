// Validates required settings before the rest of the app loads (FR-001 to FR-005, FR-033).
// app.ts imports this module right after dotenv, so nothing reads an unvalidated secret.

const REQUIRED = [
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD_HASH',
  'TURNSTILE_SECRET_KEY',
  'MINIO_URL',
  'MINIO_ACCESS_KEY',
  'MINIO_SECRET_KEY',
  'MINIO_BUCKET_NAME',
  'FRONTEND_URL',
  'URL_PREFIX',
] as const;

const MIN_JWT_SECRET_LENGTH = 32;
// bcrypt output: "$2a$", "$2b$", or "$2y$", a two-digit cost, then 53 characters
const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

function findProblems(): string[] {
  const problems: string[] = [];

  for (const name of REQUIRED) {
    if (!process.env[name]) problems.push(`${name} is not set`);
  }

  const secret = process.env.JWT_SECRET ?? '';
  if (!secret) {
    problems.push('JWT_SECRET is not set');
  } else if (secret.length < MIN_JWT_SECRET_LENGTH) {
    problems.push(`JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters`);
  }

  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (hash && !BCRYPT_HASH.test(hash)) {
    problems.push('ADMIN_PASSWORD_HASH is not a valid bcrypt hash (run npm run hash-password)');
  }

  return problems;
}

const problems = findProblems();
if (problems.length > 0) {
  console.error('Refusing to start. Fix these settings:');
  problems.forEach((problem) => console.error(`  - ${problem}`));
  process.exit(1);
}

export const JWT_SECRET = process.env.JWT_SECRET as string;
export const ADMIN_USERNAME = process.env.ADMIN_USERNAME as string;
export const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH as string;
export const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY as string;
export const MINIO_URL = process.env.MINIO_URL as string;
export const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY as string;
export const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY as string;
export const MINIO_BUCKET_NAME = process.env.MINIO_BUCKET_NAME as string;
export const FRONTEND_URL = process.env.FRONTEND_URL as string;
export const URL_PREFIX = process.env.URL_PREFIX as string;
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
