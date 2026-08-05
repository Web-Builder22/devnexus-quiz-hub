const fs = require('fs');
let file = fs.readFileSync('src/api/auth.ts', 'utf8');

const regex = /\/\/ Admin only route to update user role[\s\S]*?authRouter\.post\('\/role', requireAuth, async \(req: AuthRequest, res\) => \{[\s\S]*?\} catch \(error\) \{\s*console\.error\('Error updating role:', error\);\s*return res\.status\(500\)\.json\(\{ error: 'Internal server error' \}\);\s*\}\s*\}\);/;

const replacement = `// Update user role
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
});`;

file = file.replace(regex, replacement);
fs.writeFileSync('src/api/auth.ts', file);
