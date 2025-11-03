import type { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';

export const dbGuard = (pool: Pool) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      return next();
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(503).json({
      success: false,
      phase: process.env.NICHOLAS_PHASE || '11.0',
      message: 'Database is required (Zero Tolerance Policy).',
      error: String(err)
    });
  }
};