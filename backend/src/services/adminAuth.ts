// Admin credential check, session issuing, and CSRF token derivation (FR-004 to FR-007, FR-015).
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { ADMIN_PASSWORD_HASH, ADMIN_USERNAME, JWT_SECRET } from '../utils/env';

export const SESSION_LIFETIME_SECONDS = 24 * 60 * 60;

// Compared against when the username is wrong, so response time does not reveal valid usernames.
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer-not-a-real-password', 12);

function sha256(value: string): Buffer {
  return crypto.createHash('sha256').update(value).digest();
}

export async function verifyAdminCredentials(username: string, password: string): Promise<boolean> {
  const usernameMatches = crypto.timingSafeEqual(sha256(username), sha256(ADMIN_USERNAME));
  const passwordMatches = await bcrypt.compare(
    password,
    usernameMatches ? ADMIN_PASSWORD_HASH : DUMMY_HASH
  );
  return usernameMatches && passwordMatches;
}

export function csrfTokenFor(jti: string): string {
  return crypto.createHmac('sha256', JWT_SECRET).update(`csrf:${jti}`).digest('hex');
}

export function csrfMatches(jti: string, provided: string): boolean {
  const expected = Buffer.from(csrfTokenFor(jti));
  const given = Buffer.from(provided);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

export function issueSession(username: string): { token: string; csrfToken: string } {
  const jti = crypto.randomUUID();
  const token = jwt.sign({ username, role: 'admin', jti }, JWT_SECRET, {
    expiresIn: SESSION_LIFETIME_SECONDS,
  });
  return { token, csrfToken: csrfTokenFor(jti) };
}
