/**
 * Authentication Middleware
 * Checks if user is authenticated via session
 */
import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = (req.session as any)?.user;
  
  if (!user) {
    return res.status(401).json({ error: 'غير مصرح - يجب تسجيل الدخول' });
  }
  
  // Attach user to request
  (req as any).user = user;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req.session as any)?.user;
  
  if (!user) {
    return res.status(401).json({ error: 'غير مصرح - يجب تسجيل الدخول' });
  }
  
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'صلاحيات غير كافية - Admin فقط' });
  }
  
  // Attach user to request
  (req as any).user = user;
  next();
}
