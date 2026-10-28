// Shared, time-windowed counters kept in Redis (login failures, public submissions).
// If Redis is unavailable the counters are skipped and the global rate limit still applies
// (spec assumption: availability is preferred over locking out legitimate admins).
import { getCacheClient } from '../cache';

export async function incrementWindow(key: string, windowSeconds: number): Promise<number | null> {
  const client = getCacheClient();
  if (!client?.isOpen) {
    console.warn(`Rate counter skipped (Redis unavailable): ${key}`);
    return null;
  }

  try {
    const count = await client.incr(key);
    if (count === 1) {
      await client.expire(key, windowSeconds);
    }
    return count;
  } catch (err) {
    console.warn(`Rate counter increment failed for ${key}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

export async function getCount(key: string): Promise<number | null> {
  const client = getCacheClient();
  if (!client?.isOpen) return null;

  try {
    const value = await client.get(key);
    return value === null ? 0 : Number(value);
  } catch (err) {
    console.warn(`Rate counter read failed for ${key}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

export async function resetCount(key: string): Promise<void> {
  const client = getCacheClient();
  if (!client?.isOpen) return;

  try {
    await client.del(key);
  } catch (err) {
    console.warn(`Rate counter reset failed for ${key}:`, err instanceof Error ? err.message : err);
  }
}
