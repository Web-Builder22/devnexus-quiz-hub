const fs = require('fs');
let file = fs.readFileSync('src/api/student.ts', 'utf8');

const regex = /studentRouter\.post\('\/quizzes\/:id\/start', requireAuth, async \(req: AuthRequest, res\) => \{[\s\S]*?\} catch \(error\) \{\s*console\.error\('Error starting attempt:', error\);\s*return res\.status\(500\)\.json\(\{ error: 'Internal server error' \}\);\s*\}\s*\}\);/;

const replacement = `// Start an attempt for a quiz
studentRouter.post('/quizzes/:id/start', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const dbUser = await getOrCreateUser(user.uid || user.sub, user.email || \`\${user.uid || user.sub}@user.local\`);
    
    const quizId = parseInt(req.params.id);
    if (isNaN(quizId)) return res.status(400).json({ error: 'Invalid quiz ID' });

    const result = await db.transaction(async (tx) => {
      const quizResult = await tx.select().from(quizzes).where(eq(quizzes.id, quizId));
      if (quizResult.length === 0) return { status: 404, data: { error: 'Quiz not found' } };
      
      const quiz = quizResult[0];
      if (quiz.status === 'draft') return { status: 403, data: { error: 'Quiz is in draft mode.' } };
      if (quiz.status === 'closed' || quiz.isCodeActive === false) {
        return { status: 403, data: { error: 'This quiz code is closed or inactive.' } };
      }
      
      const now = new Date();
      if (quiz.startTime && now < new Date(quiz.startTime)) {
        return { status: 403, data: { error: 'This quiz has not started yet.' } };
      }
      if (quiz.endTime && now > new Date(quiz.endTime)) {
        return { status: 403, data: { error: 'This quiz has ended.' } };
      }
      
      const { participantName } = req.body || {};
      let cleanName: string | null = null;
      if (participantName && typeof participantName === 'string' && participantName.trim()) {
        cleanName = participantName.trim();
        await tx.update(users).set({ displayName: cleanName }).where(eq(users.id, dbUser.id));
      }
      
      let calculatedEndTime: Date | null = null;
      if (quiz.timeLimit) {
        calculatedEndTime = new Date(now.getTime() + quiz.timeLimit * 60000);
      }
      if (quiz.endTime) {
        const globalEndTime = new Date(quiz.endTime);
        if (!calculatedEndTime || globalEndTime < calculatedEndTime) {
          calculatedEndTime = globalEndTime;
        }
      }
      
      const existingAttempts = await tx.select().from(attempts)
        .where(and(eq(attempts.quizId, quizId), eq(attempts.userId, dbUser.id)));
        
      const completedAttemptsCount = existingAttempts.filter(a => a.status === 'submitted' || a.status === 'auto_submitted').length;
      let attempt = existingAttempts.find(a => a.status === 'in_progress');
      let existingAnswers: number[] = [];
      
      if (!attempt) {
        if (completedAttemptsCount >= (quiz.allowedAttempts || 1)) {
          return { status: 403, data: { error: \`You have reached the maximum allowed attempts (\${quiz.allowedAttempts || 1}) for this quiz.\` } };
        }
        
        if (!quiz.isPublic) {
          let joinedAttempt = existingAttempts.find(a => a.status === 'joined');
          if (!joinedAttempt) {
            if (existingAttempts.length > 0) {
               const newAttempt = await tx.insert(attempts).values({
                  quizId,
                  userId: dbUser.id,
                  participantName: cleanName || null,
                  status: 'in_progress',
                  violations: 0,
                  ipAddress: req.ip || '',
                  userAgent: req.headers['user-agent'] || '',
                  startedAt: now,
                  calculatedEndTime
                }).returning();
                attempt = newAttempt[0];
            } else {
               return { status: 403, data: { error: 'This is a private quiz. Please join using the quiz code first.' } };
            }
          }
          if (!attempt && joinedAttempt) {
            const updatedAttempt = await tx.update(attempts).set({
              status: 'in_progress',
              participantName: cleanName || joinedAttempt.participantName || null,
              startedAt: now,
              calculatedEndTime,
              ipAddress: req.ip || '',
              userAgent: req.headers['user-agent'] || ''
            }).where(eq(attempts.id, joinedAttempt.id)).returning();
            attempt = updatedAttempt[0];
          }
        } else {
          const newAttempt = await tx.insert(attempts).values({
            quizId,
            userId: dbUser.id,
            participantName: cleanName || null,
            status: 'in_progress',
            violations: 0,
            ipAddress: req.ip || '',
            userAgent: req.headers['user-agent'] || '',
            startedAt: now,
            calculatedEndTime
          }).returning();
          attempt = newAttempt[0];
        }
      } else {
        if (cleanName) {
          const updatedAttempt = await tx.update(attempts).set({ participantName: cleanName }).where(eq(attempts.id, attempt.id)).returning();
          attempt = updatedAttempt[0];
        }
        const userAnswers = await tx.select().from(answers).where(eq(answers.attemptId, attempt.id));
        existingAnswers = userAnswers.map(a => a.optionId);
      }
      
      return {
        status: 200,
        data: {
          attemptId: attempt.id,
          status: attempt.status,
          violations: attempt.violations,
          existingAnswers,
          calculatedEndTime: attempt.calculatedEndTime
        }
      };
    });
    
    return res.status(result.status).json(result.data);

  } catch (error) {
    console.error('Error starting attempt:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});`;

file = file.replace(regex, replacement);
fs.writeFileSync('src/api/student.ts', file);
