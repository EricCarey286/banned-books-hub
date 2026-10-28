// Limits accepted public submissions per address per endpoint (FR-020).
// The check runs before the handler; the count only goes up after the request succeeds,
// so rejected or invalid requests do not use up the allowance.
import { NextFunction, Request, Response } from 'express';
import { getCount, incrementWindow } from '../services/rateCounter';

const MAX_SUBMISSIONS = 10;
const WINDOW_SECONDS = 60 * 60;

export function submissionLimiter(endpoint: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = `submit:${endpoint}:${req.ip ?? 'unknown'}`;

    const count = await getCount(key);
    if (count !== null && count >= MAX_SUBMISSIONS) {
      res.status(429).json({ message: 'Too many submissions. Try again later.' });
      return;
    }

    res.on('finish', () => {
      if (res.statusCode < 300) {
        void incrementWindow(key, WINDOW_SECONDS);
      }
    });
    next();
  };
}
