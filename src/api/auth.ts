import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';
import { getOrCreateUser } from '../db/users.ts';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

export const authRouter = Router();

authRouter.post('/signup', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'auth/email-already-in-use' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    const uid = randomUUID();
    const userRole = (role && ['student', 'admin'].includes(role)) ? role : 'student';

    const result = await db.insert(users).values({
      uid,
      email,
      displayName: name,
      passwordHash,
      role: userRole
    }).returning();

    const dbUser = result[0];

    const token = jwt.sign(
      { uid: dbUser.uid, email: dbUser.email, role: dbUser.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    return res.json({ token, user: dbUser });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    const userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const dbUser = userResult[0];

    if (!dbUser || !dbUser.passwordHash) {
      return res.status(401).json({ error: 'auth/invalid-credential' });
    }

    const isValid = await bcrypt.compare(password, dbUser.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'auth/wrong-password' });
    }

    const token = jwt.sign(
      { uid: dbUser.uid, email: dbUser.email, role: dbUser.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    return res.json({ token, user: dbUser });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user role
authRouter.post('/role', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    const { role } = req.body;
    // Allow users to update their own role if uid is not provided (or matches their own), else require admin
    const targetUid = req.body.uid || user.uid;
    
    if (!user || !user.uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const requester = await db.select().from(users).where(eq(users.uid, user.uid)).limit(1);
    const reqUser = requester[0];
    if (!reqUser) return res.status(404).json({ error: 'User not found' });

    if (user.uid !== targetUid && reqUser.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    if (!['student', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const result = await db.update(users)
      .set({ role })
      .where(eq(users.uid, targetUid))
      .returning();
      
    if (!result.length) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    return res.json({
      user: {
        id: result[0].id,
        uid: result[0].uid,
        email: result[0].email,
        role: result[0].role,
        mfaEnabled: result[0].mfaEnabled,
      }
    });
  } catch (error) {
    console.error('Error updating role:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
authRouter.post('/sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    const { role, displayName } = req.body || {};
    if (!user || !user.email) {
      return res.status(400).json({ error: 'Invalid user data' });
    }

    const dbUser = await getOrCreateUser(user.uid, user.email, role, displayName || user.name);
    
    return res.json({
      user: {
        id: dbUser.id,
        uid: dbUser.uid,
        email: dbUser.email,
        role: dbUser.role,
        mfaEnabled: dbUser.mfaEnabled,
      }
    });
  } catch (error) {
    console.error('Error syncing user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
