import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

export interface AuthRequest extends Request {
  user?: DecodedIdToken | any;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    // Try JWT first
    if (token && token.split('.').length === 3) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
        if (decoded && decoded.uid) {
          req.user = decoded;
          return next();
        }
      } catch (jwtError) {
        // Fallthrough to firebase
      }
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    return next();
  } catch (error) {
    console.error('Error verifying Firebase ID token or JWT:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedUser: any = null;

    if (token && token.split('.').length === 3) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
        if (decoded && decoded.uid) {
          decodedUser = decoded;
        }
      } catch (jwtError) {
        // Fallthrough to firebase
      }
    }

    if (!decodedUser) {
      try {
        decodedUser = await adminAuth.verifyIdToken(token);
      } catch (err) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
      }
    }

    if (!decodedUser?.uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.user = decodedUser;

    const userResult = await db.select().from(users).where(eq(users.uid, decodedUser.uid));
    const dbUser = userResult[0];

    if (!dbUser || dbUser.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    return next();
  } catch (error) {
    console.error('Error checking admin role:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
