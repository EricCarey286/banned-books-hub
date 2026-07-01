// routes/bookRouter.ts
import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import * as books from '../services/books';
import { AppError } from '../utils/helper';
import { authenticate } from '../middleware/auth';
import { getOrSetCacheSWR, deleteCachePattern, deleteCache } from '../cache';
import { getCachedImageUrl, getCachedImageUrls } from '../minioCache';

const router = express.Router();

// Cache TTLs
const BOOK_LIST_TTL = 5 * 60; // 5 minutes
const BOOK_DETAIL_TTL = 60 * 60; // 1 hour
const FEATURED_BOOK_TTL = 15 * 60; // 15 minutes
const SEARCH_TTL = 10 * 60; // 10 minutes

function setHttpCacheHeaders(options: {
  req: Request;
  res: Response;
  etagSource: unknown;
  ttlSeconds: number;
  staleTtlSeconds: number;
  cacheStatus: 'hit' | 'stale' | 'miss' | 'bypass';
}): boolean {
  const { req, res, etagSource, ttlSeconds, staleTtlSeconds, cacheStatus } = options;

  const body = JSON.stringify(etagSource);
  const etag = `W/"${crypto.createHash('sha256').update(body).digest('base64')}"`;

  const staleWhileRevalidate = Math.max(staleTtlSeconds - ttlSeconds, 0);
  res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}, stale-while-revalidate=${staleWhileRevalidate}`);
  res.setHeader('ETag', etag);
  res.setHeader('X-Cache', cacheStatus);

  const ifNoneMatch = req.headers['if-none-match'];
  if (typeof ifNoneMatch === 'string' && ifNoneMatch === etag) {
    res.status(304).end();
    return true;
  }

  return false;
}

/**
 * Helper function to add image URLs to books
 */
async function addImageUrlsToBooks(bookData: any): Promise<any> {
  if (!bookData) return bookData;

  // Handle single book
  if (!Array.isArray(bookData.data)) {
    if (bookData.data?.cover_image) {
      bookData.data.cover_image_url = await getCachedImageUrl(bookData.data.cover_image);
    }
    return bookData;
  }

  // Handle array of books
  const books = bookData.data;
  const imagePaths = books.map((book: any) => book.cover_image).filter(Boolean);
  
  if (imagePaths.length > 0) {
    const imageUrls = await getCachedImageUrls(imagePaths);
    
    // Map URLs back to books
    let urlIndex = 0;
    bookData.data = books.map((book: any) => {
      if (book.cover_image) {
        return {
          ...book,
          cover_image_url: imageUrls[urlIndex++]
        };
      }
      return { ...book, cover_image_url: null };
    });
  }

  return bookData;
}

/**
 * GET /books - Get all books (CACHED)
 */
router.get('/', async function(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Number(req.query.page) || 1;
    const cacheKey = `books:list:page:${page}`;

    const { data: payload, status } = await getOrSetCacheSWR({
      key: cacheKey,
      ttlSeconds: BOOK_LIST_TTL,
      staleTtlSeconds: BOOK_LIST_TTL * 6,
      fetcher: async () => {
        let result = await books.getMultiple(page);
        result = await addImageUrlsToBooks(result);
        return result;
      },
    });

    if (setHttpCacheHeaders({
      req,
      res,
      etagSource: payload,
      ttlSeconds: BOOK_LIST_TTL,
      staleTtlSeconds: BOOK_LIST_TTL * 6,
      cacheStatus: status,
    })) {
      return;
    }

    const cached = status === 'hit' || status === 'stale';
    const source = status === 'miss' || status === 'bypass' ? 'database' : 'redis';
    console.log(`📦 Books list page ${page} status: ${status}`);

    res.json({
      ...payload,
      cached,
      source,
    });
  } catch (err: any) {
    console.error(`Error while getting books`, err.message);
    next(err);
  }
});

/**
 * GET /books/search - Search books (CACHED)
 */
router.get('/search', async function(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const searchTerm = req.query.term;

    if (typeof searchTerm !== 'string' || searchTerm === '' || searchTerm == null) {
      throw new AppError('Invalid search term: must be a string', 400);
    }

    // Create cache key from search term (normalized)
    const normalizedTerm = searchTerm.toLowerCase().trim();
    const cacheKey = `books:search:${normalizedTerm}`;

    const { data: payload, status } = await getOrSetCacheSWR({
      key: cacheKey,
      ttlSeconds: SEARCH_TTL,
      staleTtlSeconds: SEARCH_TTL * 6,
      fetcher: async () => {
        let result = await books.getBook(searchTerm);
        result = await addImageUrlsToBooks(result);
        return result;
      },
    });

    if (setHttpCacheHeaders({
      req,
      res,
      etagSource: payload,
      ttlSeconds: SEARCH_TTL,
      staleTtlSeconds: SEARCH_TTL * 6,
      cacheStatus: status,
    })) {
      return;
    }

    const cached = status === 'hit' || status === 'stale';
    const source = status === 'miss' || status === 'bypass' ? 'database' : 'redis';
    console.log(`📦 Search "${searchTerm}" status: ${status}`);

    res.json({
      ...payload,
      cached,
      source,
    });
  } catch (err: any) {
    console.error(`Error while searching for book(s) containing: ${req.query.term}`, err.message);
    next(err);
  }
});

/**
 * GET /books/featured - Get featured book (CACHED)
 */
router.get('/featured', async function(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cacheKey = 'books:featured';

    const { data: payload, status } = await getOrSetCacheSWR({
      key: cacheKey,
      ttlSeconds: FEATURED_BOOK_TTL,
      staleTtlSeconds: FEATURED_BOOK_TTL * 6,
      fetcher: async () => {
        let result = await books.getFeaturedBook();
        result = await addImageUrlsToBooks(result);
        return result;
      },
    });

    if (setHttpCacheHeaders({
      req,
      res,
      etagSource: payload,
      ttlSeconds: FEATURED_BOOK_TTL,
      staleTtlSeconds: FEATURED_BOOK_TTL * 6,
      cacheStatus: status,
    })) {
      return;
    }

    const cached = status === 'hit' || status === 'stale';
    const source = status === 'miss' || status === 'bypass' ? 'database' : 'redis';
    console.log(`📦 Featured book status: ${status}`);

    res.json({
      ...payload,
      cached,
      source,
    });
  } catch (err: any) {
    console.error('Error while grabbing featured book', err.message);
    next(err);
  }
});

/**
 * POST /books - Create book(s) (INVALIDATES CACHE)
 */
router.post('/', authenticate, async function(req: Request, res: Response, next: NextFunction): Promise<void> {
  const booksArray = req.body;
  const results: any[] = [];

  try {
    if (booksArray.length < 1) {
      throw new AppError('Invalid create: request must contain 1 or more books', 400);
    }

    for (const book of booksArray) {
      const result = await books.create(book);
      results.push(result);
    }

    // Invalidate all book-related caches
    await deleteCachePattern('books:list:*');
    await deleteCachePattern('books:search:*');
    await deleteCache('books:featured');

    console.log('🗑️  Invalidated book list, search, and featured caches');

    res.status(200).json({
      message: 'Books inserted successfully',
      results,
    });
  } catch (err: any) {
    console.error('Error while creating a new book entry', err.message);
    next(err);
  }
});

/**
 * PUT /books/:id - Update book (INVALIDATES CACHE)
 */
router.put('/:id', authenticate, async function(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid ID. ID must be a positive number.' });
      return;
    }

    const result = await books.update(id, req.body);

    // Invalidate caches
    await deleteCachePattern('books:list:*');
    await deleteCachePattern('books:search:*');
    await deleteCache('books:featured');
    await deleteCache(`books:detail:${id}`);

    console.log(`🗑️  Invalidated caches for book ${id}`);

    res.json(result);
  } catch (err: any) {
    console.error(`Error while updating book with id: ${req.params.id}`, err.message);
    next(err);
  }
});

/**
 * DELETE /books/:id - Delete single book (INVALIDATES CACHE)
 */
router.delete('/:id', authenticate, async function(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid ID. ID must be a positive number.' });
      return;
    }

    const result = await books.remove(id);

    // Invalidate caches
    await deleteCachePattern('books:list:*');
    await deleteCachePattern('books:search:*');
    await deleteCache('books:featured');
    await deleteCache(`books:detail:${id}`);

    console.log(`🗑️  Invalidated caches after deleting book ${id}`);

    res.json(result);
  } catch (err: any) {
    console.error(`Error while deleting book with id: ${req.params.id}`, err.message);
    next(err);
  }
});

/**
 * DELETE /books - Delete multiple books (INVALIDATES CACHE)
 */
router.delete('/', authenticate, async function(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0 || ids.some(id => typeof id !== 'number' || id <= 0)) {
      res.status(400).json({ error: "Invalid 'ids' array. Must be a non-empty array of positive numbers." });
      return;
    }

    const result = await books.removeMultiple(ids);

    // Invalidate caches
    await deleteCachePattern('books:list:*');
    await deleteCachePattern('books:search:*');
    await deleteCache('books:featured');
    
    // Invalidate individual book caches
    for (const id of ids) {
      await deleteCache(`books:detail:${id}`);
    }

    console.log(`🗑️  Invalidated caches after deleting ${ids.length} books`);

    res.json(result);
  } catch (err: any) {
    console.error(`Error while deleting books with ids: ${req.body.ids}`, err.message);
    next(err);
  }
});

export default router;