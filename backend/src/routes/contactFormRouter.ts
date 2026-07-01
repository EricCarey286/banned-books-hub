import { Router, Request, Response, NextFunction } from 'express';
import * as contactForm from '../services/contactForm';
import { AppError } from '../utils/helper';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async function(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await contactForm.getMultiple(Number(req.query.page)));
  } catch (err: any) {
    console.error(`Error while getting contact form submissions: `, err.message);
    next(err);
  }
});

//public — no authenticate
router.post('/', async function(req: Request, res: Response, next: NextFunction) {
  const booksArray = req.body;
  const results: any[] = [];

  try {
    if(booksArray.length < 1){
      throw new AppError('Invalid create: request must contain 1 or more entries', 400);
    }

    for (const book of booksArray) {
      const result = await contactForm.create(book);
      results.push(result);
    }

    res.status(200).json({
      message: 'Contact form submitted successfully',
      results,
    });
  } catch (err: any) {
    console.error(`Error while creating a new contact form entry`, err.message);
    next(err);
  }
});

export default router;
