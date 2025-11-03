import type { Request, Response, NextFunction } from 'express';

// Lightweight placeholder. In production, verify JWT signature or HMAC.
// Here we only enforce presence of an API key to keep the blueprint simple.
export const authGuard = (req: Request, res: Response, next: NextFunction) => {
  const key = req.headers['x-api-key'] || process.env.API_KEY;
  if (!key) {
    return res.status(401).json({ success: false, message: 'Missing API key.' });
  }
  return next();
};