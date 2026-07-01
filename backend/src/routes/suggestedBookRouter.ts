import { Router, Request, Response, NextFunction } from 'express';
import * as suggestedBooks from '../services/suggestedBooks';
import { AppError } from '../utils/helper';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async function(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await suggestedBooks.getMultiple(Number(req.query.page)));
  } catch (err: any) {
    console.error(`Error while getting suggested books `, err.message);
    next(err);
  }
});

//suggest a book entry (public — no authenticate)
router.post('/', async function(req: Request, res: Response, next: NextFunction) {
  const booksArray = req.body;
  const results: any[] = [];

  try {
    if(booksArray.length < 1){
      throw new AppError('Invalid create: request must contain 1 or more books', 400);
    }

    for (const book of booksArray) {
      const result = await suggestedBooks.suggest(book);
      results.push(result);
    }

    res.status(200).json({
      message: 'Suggest Books inserted successfully',
      results,
    });
  } catch (err: any) {
    console.error(`Error while creating a new suggested book entry`, err.message);
    next(err);
  }
});

router.delete('/:id', authenticate, async function(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid ID. ID must be a positive number.' });
      return;
    }

    res.json(await suggestedBooks.remove(Number(req.params.id)));
  } catch (err: any) {
    console.error(`Error while deleting suggested book with id: ${req.params.id}`, err.message);
    next(err);
  }
});

router.delete('/', authenticate, async function(req: Request, res: Response, next: NextFunction) {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0 || ids.some(id => typeof id !== 'number' || id <= 0)) {
      res.status(400).json({ error: "Invalid 'ids' array. Must be a non-empty array of positive numbers." });
      return;
    }

    const result = await suggestedBooks.removeMultiple(ids);
    res.json(result);
  } catch (err: any) {
    console.error(`Error while deleting suggested books with ids: ${req.body.ids}`, err.message);
    next(err);
  }
});

export default router;
