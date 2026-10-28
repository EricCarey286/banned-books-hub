// Admin login, logout, session validation (FR-004 to FR-016).
import { NextFunction, Request, Response, Router } from 'express';
import { authenticate, AuthRequest, SESSION_COOKIE, SESSION_COOKIE_OPTIONS, clearSessionCookie } from '../middleware/auth';
import { clearLoginFailures, loginLimiter, recordLoginFailure } from '../middleware/loginLimiter';
import { csrfTokenFor, issueSession, verifyAdminCredentials } from '../services/adminAuth';

const router = Router();

router.post('/login', loginLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body ?? {};
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
      res.status(400).json({ message: 'Username and password are required' });
      return;
    }

    const valid = await verifyAdminCredentials(username, password);
    if (!valid) {
      await recordLoginFailure(req);
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    await clearLoginFailures(req);
    const { token, csrfToken } = issueSession(username);
    res.cookie(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
    res.json({ success: true, message: 'Logged in successfully', csrfToken });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', authenticate, (req: AuthRequest, res: Response) => {
  clearSessionCookie(res);
  res.json({ success: true, message: 'Logged out' });
});

router.get('/validate', authenticate, (req: AuthRequest, res: Response) => {
  res.json({
    valid: true,
    user: { username: req.user?.username, role: req.user?.role },
    csrfToken: csrfTokenFor(req.user!.jti),
  });
});

router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  res.json({
    message: 'Welcome to the admin panel',
    user: { username: req.user?.username, role: req.user?.role },
  });
});

export default router;
