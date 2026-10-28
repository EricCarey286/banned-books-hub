// Requires a valid human-verification token on public writes (FR-019, FR-022).
import { NextFunction, Request, Response } from 'express';
import { verifyTurnstile } from '../services/turnstile';

export async function requireHumanVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers['x-turnstile-token'];
  if (typeof token !== 'string' || token === '') {
    res.status(400).json({ message: 'Human verification is required' });
    return;
  }

  const outcome = await verifyTurnstile(token, req.ip);
  if (outcome === 'rejected') {
    res.status(403).json({ message: 'Human verification failed' });
    return;
  }
  if (outcome === 'unavailable') {
    res.status(503).json({ message: 'Verification is temporarily unavailable. Try again later.' });
    return;
  }
  next();
}
