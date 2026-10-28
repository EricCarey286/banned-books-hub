// Server-side check of a Cloudflare Turnstile token (FR-019, FR-022). Fails closed on timeout or error.
import { TURNSTILE_SECRET_KEY } from '../utils/env';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TIMEOUT_MS = 5000;

export type VerificationOutcome = 'ok' | 'rejected' | 'unavailable';

export async function verifyTurnstile(token: string, ip: string | undefined): Promise<VerificationOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const body = new URLSearchParams({ secret: TURNSTILE_SECRET_KEY, response: token });
    if (ip) body.set('remoteip', ip);

    const response = await fetch(SITEVERIFY_URL, { method: 'POST', body, signal: controller.signal });
    if (!response.ok) return 'unavailable';

    const data = (await response.json()) as { success?: boolean };
    return data.success === true ? 'ok' : 'rejected';
  } catch (err) {
    console.error('Turnstile verification unavailable:', err instanceof Error ? err.message : err);
    return 'unavailable';
  } finally {
    clearTimeout(timer);
  }
}
