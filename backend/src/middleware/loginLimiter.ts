// Blocks admin login after repeated failures from one address (FR-008 to FR-010).
// Runs before the password is checked, so a blocked address is refused even with the correct password.
import { NextFunction, Request, Response } from 'express';
import { getCount, incrementWindow, resetCount } from '../services/rateCounter';

const MAX_FAILURES = 5;
const WINDOW_SECONDS = 15 * 60;

function failureKey(req: Request): string {
  return `admin:login:fail:${req.ip ?? 'unknown'}`;
}

export async function loginLimiter(req: Request, res: Response, next: NextFunction): Promise<void> {
  const failures = await getCount(failureKey(req));
  if (failures !== null && failures >= MAX_FAILURES) {
    res.setHeader('Retry-After', String(WINDOW_SECONDS));
    res.status(429).json({ message: 'Too many failed attempts. Try again later.' });
    return;
  }
  next();
}

export async function recordLoginFailure(req: Request): Promise<void> {
  await incrementWindow(failureKey(req), WINDOW_SECONDS);
}

export async function clearLoginFailures(req: Request): Promise<void> {
  await resetCount(failureKey(req));
}
