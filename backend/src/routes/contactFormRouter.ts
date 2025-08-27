const expressRouter = require('express');
const router = expressRouter.Router();
import * as contactForm from '../services/contactForm';

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/helper';

//get all forms
router.get('/', async function(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await contactForm.getMultiple(Number(req.query.page)));
  } catch (err: any) {
    console.error(`Error while submitting contact form: `, err.message);
    next(err);
  }
});

//create a form entry
router.post('/', async function(req: Request, res: Response, next: NextFunction) {
  const formsArray = req.body;
  const results: any[] = []; // To collect results for all books

  try {
    //check if body has data
    if(formsArray.length < 1){
      throw new AppError('Invalid create: request must contain 1 or more books', 400); 
    }

    for (const form of formsArray) {
      const result = await contactForm.create(form);
      results.push(result); // Collect the result for each book
    }

    res.status(200).json({
      message: 'Form inserted successfully',
      results, 
    });
  } catch (err: any) {
    console.error(`Error while creating a new form entry`, err.message);
    next(err);
  }
});

//delete an existing form entry
router.delete('/:id', async function(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid ID. ID must be a positive number.' });
    }
    
    res.json(await contactForm.remove(Number(req.params.id)));
  } catch (err: any) {
    console.error(`Error while deleting form with id: ${req.params.id}`, err.message);
    next(err);
  }
});

//delete multiple existing book entries
router.delete("/", async function (req: Request, res: Response, next: NextFunction) {
  try {
    const { ids } = req.body; // Expecting { ids: [1, 2, 3] }

    if (!Array.isArray(ids) || ids.length === 0 || ids.some(id => typeof id !== "number" || id <= 0)) {
      return res.status(400).json({ error: "Invalid 'ids' array. Must be a non-empty array of positive numbers." });
    }

    const result = await contactForm.removeMultiple(ids);
    res.json(result);

  } catch (err: any) {
    console.error(`Error while deleting forms with ids: ${req.body.ids}`, err.message);
    next(err);
  }
});

export default router;