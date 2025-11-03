import type { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import crypto from 'crypto';

export const auditTrail = (pool: Pool) => async (req: Request, res: Response, next: NextFunction) => {
  // wrap res.json to record sensitive POST actions after response is sent
  const originalJson = res.json.bind(res);
  res.json = async (body: any) => {
    try {
      if (req.method === 'POST' && req.path) {
        const actor = 'nicholas';
        const entryType = 'policy';
        const payload = {
          path: req.path,
          method: req.method,
          status: res.statusCode,
          body: req.body,
          responsePreview: (typeof body === 'object') ? Object.keys(body).slice(0,8) : String(body).slice(0,128)
        };
        const client = await pool.connect();
        try {
          const prev = await client.query('SELECT hash FROM audit_ledger ORDER BY id DESC LIMIT 1');
          const prevHash = prev.rows.length ? prev.rows[0].hash : null;
          const hash = crypto.createHash('sha256').update(JSON.stringify(payload) + (prevHash || '')).digest('hex');
          await client.query(
            'INSERT INTO audit_ledger (entry_type, actor, data, hash, prev_hash) VALUES ($1,$2,$3,$4,$5)',
            [entryType, actor, payload as any, hash, prevHash]
          );
        } finally {
          client.release();
        }
      }
    } catch { /* noop: do not block response */ }
    return originalJson(body);
  };
  return next();
};