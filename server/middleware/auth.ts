import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'kisan_queue_secret_key_change_in_production';

export interface AuthRequest extends Request {
  user?: {
    _id: string;
    email: string;
    phone?: string;
    role: 'farmer' | 'staff' | 'admin';
    name: string;
    counterNumber?: number;
    status?: 'active' | 'inactive';
    centre?: string;
    shiftStatus?: 'active' | 'break' | 'offline';
  };
}

export function generateToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. No session token provided.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token || token.trim() === '') {
    res.status(401).json({ error: 'Authentication required. Empty token provided.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
      return;
    }
    res.status(401).json({ error: 'Invalid or malformed session token.' });
  }
}

export function requireRole(allowedRoles: Array<'farmer' | 'staff' | 'admin'>) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access forbidden: Insufficient permissions for role "${req.user.role}".`
      });
      return;
    }

    next();
  };
}
