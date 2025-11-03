import type { Request, Response, NextFunction } from 'express';

export const zeroMockGuard = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.ZERO_TOLERANCE !== 'true') {
    return res.status(412).json({
      success: false,
      message: 'Zero-Mock Policy must be active (ZERO_TOLERANCE=true).'
    });
  }
  // naive anti-mock: disallow query/body fields that hint mock/demo
  const suspect = JSON.stringify({ q: req.query, b: req.body }).toLowerCase();
  if (suspect.includes('mock') || suspect.includes('demo') || suspect.includes('faker')) {
    return res.status(400).json({ success: false, message: 'Mock/Demo keywords are not allowed in requests.' });
  }
  return next();
};