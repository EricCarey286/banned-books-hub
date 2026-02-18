// server/cache.ts
import { createClient, RedisClientType } from 'redis';

type RedisClient = RedisClientType<any, any, any>;

let redisClient: RedisClient | null = null;

type CacheEnvelope<T> = {
  v: T;
  ts: number;
};

const swrRefreshes = new Map<string, Promise<void>>();

interface CacheOptions {
  url?: string;
  maxReconnectAttempts?: number;
  reconnectDelayMs?: number;
}

/**
 * Initialize Redis cache connection
 * @param options - Configuration options for Redis client
 */
export async function initializeCache(options: CacheOptions = {}): Promise<void> {
  const {
    url = process.env.REDIS_URL || 'redis://localhost:6379',
    maxReconnectAttempts = 10,
    reconnectDelayMs = 3000,
  } = options;

  try {
    redisClient = createClient({
      url,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > maxReconnectAttempts) {
            console.error('Redis reconnection failed after max attempts');
            return new Error('Redis max reconnection attempts reached');
          }
          return Math.min(retries * 100, reconnectDelayMs);
        },
      },
    });

    redisClient.on('error', (err: Error) => {
      console.error('Redis Client Error:', err.message);
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis Client Connected');
    });

    redisClient.on('reconnecting', () => {
      console.log('🔄 Redis Client Reconnecting...');
    });

    redisClient.on('ready', () => {
      console.log('✨ Redis Client Ready');
    });

    await redisClient.connect();
    console.log('🚀 Redis cache initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Redis:', error instanceof Error ? error.message : error);
    // App continues to work without cache
    redisClient = null;
  }
}

/**
 * Check if Redis client is connected and ready
 */
function isClientReady(): boolean {
  return redisClient?.isOpen ?? false;
}

/**
 * Get cached data by key
 * @param key - Cache key
 * @returns Parsed data or null if not found/error
 */
export async function getCache<T = any>(key: string): Promise<T | null> {
  if (!isClientReady()) {
    console.warn('Redis client not ready, skipping cache get');
    return null;
  }

  try {
    const data = await redisClient!.get(key);
    if (!data) return null;

    return JSON.parse(data) as T;
  } catch (error) {
    console.error(`Cache get error for key "${key}":`, error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Set cached data with TTL
 * @param key - Cache key
 * @param data - Data to cache (will be JSON stringified)
 * @param ttl - Time to live in seconds (default: 300)
 * @returns Success boolean
 */
export async function setCache<T = any>(
  key: string,
  data: T,
  ttl: number = 300
): Promise<boolean> {
  if (!isClientReady()) {
    console.warn('Redis client not ready, skipping cache set');
    return false;
  }

  if (ttl <= 0) {
    console.warn(`Invalid TTL ${ttl} for key "${key}", must be positive`);
    return false;
  }

  try {
    const serialized = JSON.stringify(data);
    await redisClient!.setEx(key, ttl, serialized);
    return true;
  } catch (error) {
    console.error(`Cache set error for key "${key}":`, error instanceof Error ? error.message : error);
    return false;
  }
}

async function getCacheEnvelope<T>(key: string): Promise<CacheEnvelope<T> | null> {
  if (!isClientReady()) return null;

  try {
    const data = await redisClient!.get(key);
    if (!data) return null;
    return JSON.parse(data) as CacheEnvelope<T>;
  } catch (error) {
    console.error(`Cache get error for key "${key}":`, error instanceof Error ? error.message : error);
    return null;
  }
}

async function setCacheEnvelope<T>(key: string, value: T, ttl: number): Promise<boolean> {
  if (!isClientReady()) return false;
  if (ttl <= 0) return false;

  try {
    const envelope: CacheEnvelope<T> = { v: value, ts: Date.now() };
    await redisClient!.setEx(key, ttl, JSON.stringify(envelope));
    return true;
  } catch (error) {
    console.error(`Cache set error for key "${key}":`, error instanceof Error ? error.message : error);
    return false;
  }
}

export type CacheSWRStatus = 'hit' | 'stale' | 'miss' | 'bypass';

export async function getOrSetCacheSWR<T>(options: {
  key: string;
  ttlSeconds: number;
  staleTtlSeconds: number;
  fetcher: () => Promise<T>;
}): Promise<{ data: T; status: CacheSWRStatus }> {
  const { key, ttlSeconds, staleTtlSeconds, fetcher } = options;

  if (!isClientReady()) {
    return { data: await fetcher(), status: 'bypass' };
  }

  const fresh = await getCacheEnvelope<T>(key);
  if (fresh) {
    return { data: fresh.v, status: 'hit' };
  }

  const staleKey = `${key}:stale`;
  const stale = await getCacheEnvelope<T>(staleKey);

  if (stale) {
    if (!swrRefreshes.has(key)) {
      const refreshPromise = (async () => {
        try {
          const newValue = await fetcher();
          await setCacheEnvelope(key, newValue, ttlSeconds);
          await setCacheEnvelope(staleKey, newValue, staleTtlSeconds);
        } catch (error) {
          console.error(`Cache SWR refresh error for key "${key}":`, error instanceof Error ? error.message : error);
        } finally {
          swrRefreshes.delete(key);
        }
      })();

      swrRefreshes.set(key, refreshPromise);
    }

    return { data: stale.v, status: 'stale' };
  }

  const data = await fetcher();
  await setCacheEnvelope(key, data, ttlSeconds);
  await setCacheEnvelope(staleKey, data, staleTtlSeconds);
  return { data, status: 'miss' };
}

/**
 * Delete cached data by key
 * @param key - Cache key to delete
 * @returns Success boolean
 */
export async function deleteCache(key: string): Promise<boolean> {
  if (!isClientReady()) {
    console.warn('Redis client not ready, skipping cache delete');
    return false;
  }

  try {
    await redisClient!.del(key);
    return true;
  } catch (error) {
    console.error(`Cache delete error for key "${key}":`, error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Delete all keys matching a pattern
 * @param pattern - Redis key pattern (e.g., 'books:*')
 * @returns Success boolean
 */
export async function deleteCachePattern(pattern: string): Promise<boolean> {
  if (!isClientReady()) {
    console.warn('Redis client not ready, skipping pattern delete');
    return false;
  }

  try {
    let deletedCount = 0;
    const batch: string[] = [];

    for await (const key of redisClient!.scanIterator({ MATCH: pattern, COUNT: 500 }) as AsyncIterable<string>) {
      batch.push(key.toString());

      if (batch.length >= 500) {
        const results = await Promise.all(batch.map(k => redisClient!.del(k)));
        deletedCount += results.reduce((sum, n) => sum + n, 0);
        batch.length = 0;
      }
    }

    if (batch.length > 0) {
      const results = await Promise.all(batch.map(k => redisClient!.del(k)));
      deletedCount += results.reduce((sum, n) => sum + n, 0);
    }

    if (deletedCount > 0) {
      console.log(`🗑️  Deleted ${deletedCount} cache keys matching pattern "${pattern}"`);
    }

    return true;
  } catch (error) {
    console.error(`Cache pattern delete error for pattern "${pattern}":`, error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Get multiple cached values at once
 * @param keys - Array of cache keys
 * @returns Array of parsed values (null for missing keys)
 */
export async function getCacheMulti<T = any>(keys: string[]): Promise<(T | null)[]> {
  if (!isClientReady() || keys.length === 0) {
    return keys.map(() => null);
  }

  try {
    const values = await redisClient!.mGet(keys);
    return values.map(value => {
      if (!value) return null;
      try {
        return JSON.parse(value) as T;
      } catch {
        return null;
      }
    });
  } catch (error) {
    console.error('Cache multi-get error:', error instanceof Error ? error.message : error);
    return keys.map(() => null);
  }
}

/**
 * Check if a key exists in cache
 * @param key - Cache key to check
 * @returns True if key exists
 */
export async function cacheExists(key: string): Promise<boolean> {
  if (!isClientReady()) return false;

  try {
    const exists = await redisClient!.exists(key);
    return exists === 1;
  } catch (error) {
    console.error(`Cache exists error for key "${key}":`, error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Get remaining TTL for a key
 * @param key - Cache key
 * @returns Remaining seconds (-1 if no expiry, -2 if key doesn't exist)
 */
export async function getCacheTTL(key: string): Promise<number> {
  if (!isClientReady()) return -2;

  try {
    return await redisClient!.ttl(key);
  } catch (error) {
    console.error(`Cache TTL error for key "${key}":`, error instanceof Error ? error.message : error);
    return -2;
  }
}

/**
 * Get the Redis client instance (use with caution)
 * @returns Redis client or null
 */
export function getCacheClient(): RedisClient | null {
  return redisClient;
}

/**
 * Gracefully close Redis connection
 */
export async function closeCache(): Promise<void> {
  if (redisClient?.isOpen) {
    try {
      await redisClient.quit();
      console.log('👋 Redis connection closed gracefully');
    } catch (error) {
      console.error('Error closing Redis connection:', error instanceof Error ? error.message : error);
    }
  }
}

export interface CacheStats {
  isConnected: boolean;
  keyCount: number;
  memoryUsed: string;
  uptime: number;
}

/**
 * Get cache statistics
 * @returns Cache statistics object
 */
export async function getCacheStats(): Promise<CacheStats | null> {
  if (!isClientReady()) {
    return {
      isConnected: false,
      keyCount: 0,
      memoryUsed: '0',
      uptime: 0,
    };
  }

  try {
    const info = await redisClient!.info('stats');
    const dbSize = await redisClient!.dbSize();
    
    return {
      isConnected: true,
      keyCount: dbSize,
      memoryUsed: info.match(/used_memory_human:(.+)/)?.[1]?.trim() || '0',
      uptime: parseInt(info.match(/uptime_in_seconds:(\d+)/)?.[1] || '0'),
    };
  } catch (error) {
    console.error('Error getting cache stats:', error instanceof Error ? error.message : error);
    return null;
  }
}