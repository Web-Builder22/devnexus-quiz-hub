const fs = require('fs');
let file = fs.readFileSync('src/api/student.ts', 'utf8');

const regex = /studentRouter\.post\('\/attempts\/:id\/violation', requireAuth, async \(req: AuthRequest, res\) => \{[\s\S]*?\} catch \(err\) \{\s*console\.error\(err\);\s*res\.status\(500\)\.json\(\{ error: 'Internal server error' \}\);\s*\}\s*\}\);/;

const replacement = `// Record violation
studentRouter.post('/attempts/:id/violation', requireAuth, async (req: AuthRequest, res) => {
  try {
    const attemptId = parseInt(req.params.id);
    const { type, details } = req.body;
    if (isNaN(attemptId)) return res.status(400).json({ error: 'Invalid attempt ID' });
    
    const result = await db.transaction(async (tx) => {
      const attemptRes = await tx.select().from(attempts).where(eq(attempts.id, attemptId));
      if (attemptRes.length === 0) return { status: 404, data: { error: 'Attempt not found' } };
      
      const attempt = attemptRes[0];
      await tx.insert(quizActivityLogs).values({
        attemptId,
        type: type || 'security_violation',
        details: details || '',
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || ''
      });
      
      const updatedAttempt = await tx.update(attempts)
        .set({ violations: (attempt.violations || 0) + 1 })
        .where(eq(attempts.id, attemptId))
        .returning();
        
      const quizRes = await tx.select().from(quizzes).where(eq(quizzes.id, attempt.quizId));
      const maxV = (quizRes[0]?.securitySettings as any)?.maxViolations || 2;
      let autoSubmitted = false;
      
      if (updatedAttempt[0].violations >= maxV) {
         await tx.update(attempts).set({ status: 'auto_submitted', completedAt: new Date() }).where(eq(attempts.id, attemptId));
         autoSubmitted = true;
      }
      
      return { status: 200, data: { success: true, violations: updatedAttempt[0].violations, autoSubmitted } };
    });
    
    return res.status(result.status).json(result.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});`;

file = file.replace(regex, replacement);
fs.writeFileSync('src/api/student.ts', file);
