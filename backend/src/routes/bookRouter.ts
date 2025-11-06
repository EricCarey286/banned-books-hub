// routes/bookRouter.ts
import express, { Request, Response, NextFunction } from 'express';
import * as books from '../services/books';
import { AppError } from '../utils/helper';
import { getCache, setCache, deleteCachePattern, deleteCache } from '../cache.ts';
import { getCachedImageUrl, getCachedImageUrls } from '../minioCache.ts';

const router = express.Router();

// Cache TTLs
const BOOK_LIST_TTL = 5 * 60; // 5 minutes
const BOOK_DETAIL_TTL = 60 * 60; // 1 hour
const FEATURED_BOOK_TTL = 15 * 60; // 15 minutes
const SEARCH_TTL = 10 * 60; // 10 minutes

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

    // Try cache first
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      console.log(`📦 Cache HIT: books list page ${page}`);
      res.json({
        ...cachedData,
        cached: true,
        source: 'redis'
      });
      return;
    }

    console.log(`💾 Cache MISS: books list page ${page}`);

    // Get from database
    let result = await books.getMultiple(page);

    // Add MinIO image URLs
    result = await addImageUrlsToBooks(result);

    // Cache the result
    await setCache(cacheKey, result, BOOK_LIST_TTL);

    res.json({
      ...result,
      cached: false,
      source: 'database'
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

    // Try cache first
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      console.log(`📦 Cache HIT: search for "${searchTerm}"`);
      res.json({
        ...cachedData,
        cached: true,
        source: 'redis'
      });
      return;
    }

    console.log(`💾 Cache MISS: search for "${searchTerm}"`);

    // Get from database
    let result = await books.getBook(searchTerm);

    // Add MinIO image URLs
    result = await addImageUrlsToBooks(result);

    // Cache the result
    await setCache(cacheKey, result, SEARCH_TTL);

    res.json({
      ...result,
      cached: false,
      source: 'database'
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

    // Try cache first
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      console.log('📦 Cache HIT: featured book');
      res.json({
        ...cachedData,
        cached: true,
        source: 'redis'
      });
      return;
    }

    console.log('💾 Cache MISS: featured book');

    // Get from database
    let result = await books.getFeaturedBook();

    // Add MinIO image URLs
    result = await addImageUrlsToBooks(result);

    // Cache the result
    await setCache(cacheKey, result, FEATURED_BOOK_TTL);

    res.json({
      ...result,
      cached: false,
      source: 'database'
    });
  } catch (err: any) {
    console.error('Error while grabbing featured book', err.message);
    next(err);
  }
});

/**
 * POST /books - Create book(s) (INVALIDATES CACHE)
 */
router.post('/', async function(req: Request, res: Response, next: NextFunction): Promise<void> {
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
router.put('/:id', async function(req: Request, res: Response, next: NextFunction): Promise<void> {
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
router.delete('/:id', async function(req: Request, res: Response, next: NextFunction): Promise<void> {
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
router.delete('/', async function(req: Request, res: Response, next: NextFunction): Promise<void> {
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