const expressRouter = require('express');
const router = expressRouter.Router();
import * as books from '../services/books';
import * as suggestedBooks from '../services/suggestedBooks';

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/helper';

//get all books
router.get('/', async function(req: Request, res: Response, next: NextFunction) {
  console.log('Here');
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

    // Check if term is not a string or empty or null
    if (typeof searchTerm !== 'string' || searchTerm == '' || searchTerm == null) {
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
    //check if body has data
    if(booksArray.length < 1){
      throw new AppError('Invalid create: request must contain 1 or more books', 400); 
    }

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
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid ID. ID must be a positive number.' });
    }

    res.json(await books.update(Number(req.params.id), req.body));
  } catch (err: any) {
    console.error(`Error while updating book with id: ${req.params.id}`, err.message);
    next(err);
  }
});

//delete an existing book entry
router.delete('/:id', async function(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid ID. ID must be a positive number.' });
    }
    
    res.json(await books.remove(Number(req.params.id)));
  } catch (err: any) {
    console.error(`Error while deleting book with id: ${req.params.id}`, err.message);
    next(err);
  }
});

export default router;