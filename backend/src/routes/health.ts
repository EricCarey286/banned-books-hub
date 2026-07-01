// server/routes/health.ts
import { Router, Request, Response, RequestHandler } from 'express';
import { getCacheClient, getCacheStats, cacheExists } from '../cache';

const router = Router();

/**
 * Basic health check
 * GET /health
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const cacheClient = getCacheClient();
  const isRedisConnected = cacheClient?.isOpen ?? false;

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    cache: {
      connected: isRedisConnected,
      type: 'redis',
    },
  });
});

/**
 * Detailed cache health check
 * GET /health/cache
 */
const cacheHealthHandler: RequestHandler = async (req: Request, res: Response) => {
  try {
    const cacheClient = getCacheClient();
    
    if (!cacheClient?.isOpen) {
      res.status(503).json({
        status: 'unhealthy',
        message: 'Redis client not connected',
        connected: false,
      });
      return;
    }

    // Get detailed stats
    const stats = await getCacheStats();
    
    // Test read/write
    const testKey = 'health:test';
    const testValue = { timestamp: Date.now() };
    
    // Try to write
    await cacheClient.setEx(testKey, 10, JSON.stringify(testValue));
    
    // Try to read
    const readValue = await cacheClient.get(testKey);
    const canReadWrite = readValue !== null;
    
    // Clean up
    await cacheClient.del(testKey);

    res.json({
      status: 'healthy',
      connected: true,
      canReadWrite,
      stats: stats || {
        isConnected: true,
        keyCount: 'N/A',
        memoryUsed: 'N/A',
        uptime: 'N/A',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
      connected: false,
      timestamp: new Date().toISOString(),
    });
  }
};

router.get('/cache', cacheHealthHandler);

/**
 * Cache statistics
 * GET /health/cache/stats
 */
 const cacheStateHandler: RequestHandler = async (req: Request, res: Response) => {
  try {
    const stats = await getCacheStats();
    
    if (!stats) {
      res.status(503).json({
        error: 'Unable to get cache statistics',
        connected: false,
      });
      return;
    }

    res.json(stats);
  } catch (error) {
    res.status(503).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      connected: false,
    });
  }
};

router.get('/cache/stats', cacheStateHandler);

export default router;