import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { JWT_SECRET } from '../utils/env';
import { csrfMatches } from '../services/adminAuth';

export interface AuthRequest extends Request {
  user?: {
    username: string;
    role: string;
    jti: string;
  };
}

export const SESSION_COOKIE = 'admin_session';

// Same-site subdomains (Clarification 1, option B). Secure and HttpOnly keep the token away from page scripts.
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 24 * 60 * 60 * 1000,
};

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return undefined;
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: true, sameSite: 'strict', path: '/' });
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const token = readCookie(req.headers.cookie, SESSION_COOKIE);
  if (!token) {
    res.status(401).json({ message: 'Authorization token required' });
    return;
  }

  let decoded: { username: string; role: string; jti: string };
  try {
    decoded = jwt.verify(token, JWT_SECRET) as { username: string; role: string; jti: string };
  } catch (error) {
    clearSessionCookie(res);
    res.status(401).json({ message: 'Invalid or expired token' });
    return;
  }

  if (!SAFE_METHODS.has(req.method)) {
    const provided = req.headers['x-csrf-token'];
    if (typeof provided !== 'string' || !csrfMatches(decoded.jti, provided)) {
      res.status(403).json({ message: 'Invalid CSRF token' });
      return;
    }
  }

  req.user = decoded;
  next();
};
