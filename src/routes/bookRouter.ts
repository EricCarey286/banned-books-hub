const expressRouter = require('express');
const router = expressRouter.Router();
import * as books from '../services/books';

import { Request, Response, NextFunction } from 'express';

class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;

      // Maintain proper stack trace
      Error.captureStackTrace(this, this.constructor);
  }
}

//get all books
router.get('/', async function(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await books.getMultiple(Number(req.query.page)));
  } catch (err: any) {
    console.error(`Error while getting books `, err.message);
    next(err);
  }
});

//get specific book based on a search term
router.get('/search', async function(req: Request, res: Response, next: NextFunction) {
  try {
    const searchTerm = req.query.term;

    // Check if term is not a string
    if (typeof searchTerm !== 'string') {
      throw new AppError('Invalid search term: must be a string', 400);  // Throw an error with a 400 status code
    }
    res.json(await books.getBook(searchTerm));
  } catch (err: any) {
    console.error(`Error while searching for book(s) containing: ${req.query.term} `, err.message);
    next(err);
  }
});

//create a book entry
router.post('/', async function(req: Request, res: Response, next: NextFunction) {
  const booksArray = req.body;
  const results: any[] = []; // To collect results for all books

  try {
    for (const book of booksArray) {
      const result = await books.create(book);
      results.push(result); // Collect the result for each book
    }

    res.status(200).json({
      message: 'Books inserted successfully',
      results, 
    });
  } catch (err: any) {
    console.error(`Error while creating a new book entry`, err.message);
    next(err);
  }
});

//update an existing book entry
router.put('/:id', async function(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await books.update(Number(req.params.id), req.body));
  } catch (err: any) {
    console.error(`Error while updating book with id: ${req.params.id}`, err.message);
    next(err);
  }
});

//delete an existing book entry
router.delete('/:id', async function(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await books.remove(Number(req.params.id)));
  } catch (err: any) {
    console.error(`Error while deleting book with id: ${req.params.id}`, err.message);
    next(err);
  }
});

export default router;