const expressRouter = require('express');
const router = expressRouter.Router();
import * as contactForm from '../services/contactForm';

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/helper';

//get all books
router.get('/', async function(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await contactForm.getMultiple(Number(req.query.page)));
  } catch (err: any) {
    console.error(`Error while submitting contact form: `, err.message);
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
      const result = await contactForm.create(book);
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

export default router;