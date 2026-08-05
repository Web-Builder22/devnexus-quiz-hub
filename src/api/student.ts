import crypto from 'crypto';
import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';
import { db } from '../db/index.ts';
import { users, quizzes, questions, options, attempts, answers, quizActivityLogs, certificates, certificateTemplates } from '../db/schema.ts';
import { eq, and, inArray, desc, sql } from 'drizzle-orm';
import { getOrCreateUser } from '../db/users.ts';

export const studentRouter = Router();

// Record violation
// Record violation
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
        .set({ violations: sql`COALESCE(${attempts.violations}, 0) + 1` })
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
});


// ... existing code for /quizzes/join-by-code and /quizzes

// Start an attempt for a quiz
// Start an attempt for a quiz
studentRouter.post('/quizzes/:id/start', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const dbUser = await getOrCreateUser(user.uid || user.sub, user.email || `${user.uid || user.sub}@user.local`);
    
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
          return { status: 403, data: { error: `You have reached the maximum allowed attempts (${quiz.allowedAttempts || 1}) for this quiz.` } };
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
});

// Sync answers and violations
studentRouter.post('/attempts/:id/sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    const attemptId = parseInt(req.params.id);
    const { selectedOptions, violations, activityLogs } = req.body;
    
    const attemptResult = await db.select().from(attempts).where(eq(attempts.id, attemptId));
    if (attemptResult.length === 0) return res.status(404).json({ error: 'Attempt not found' });
    const attempt = attemptResult[0];
    
    if (attempt.status !== 'in_progress') {
      return res.status(400).json({ error: 'Attempt is already submitted' });
    }

    // Strict backend validation: do not allow sync if more than 30 seconds past calculatedEndTime
    if (attempt.calculatedEndTime) {
      const now = new Date();
      const endTimePlusGrace = new Date(new Date(attempt.calculatedEndTime).getTime() + 30000); // 30s grace period
      if (now > endTimePlusGrace) {
        return res.status(403).json({ error: 'Time limit exceeded. Your quiz was automatically submitted.' });
      }
    }

    // Process options. selectedOptions is array of option IDs
    await db.transaction(async (tx) => {
      if (selectedOptions && Array.isArray(selectedOptions) && selectedOptions.length > 0) {
        await tx.delete(answers).where(eq(answers.attemptId, attemptId));
        const selectedOpts = await tx.select().from(options).where(inArray(options.id, selectedOptions));
        if (selectedOpts.length > 0) {
          const answerRecords = selectedOpts.map(opt => ({
            attemptId,
            questionId: opt.questionId,
            optionId: opt.id
          }));
          await tx.insert(answers).values(answerRecords);
        }
      } else if (selectedOptions && Array.isArray(selectedOptions) && selectedOptions.length === 0) {
        await tx.delete(answers).where(eq(answers.attemptId, attemptId));
      }
    });

    if (violations !== undefined) {
       await db.update(attempts).set({ violations }).where(eq(attempts.id, attemptId));
    }

    if (activityLogs && Array.isArray(activityLogs)) {
       const logs = activityLogs.map(l => ({
         attemptId,
         type: l.type,
         details: l.details || '',
         ipAddress: req.ip,
         userAgent: req.headers['user-agent']
       }));
       if (logs.length > 0) {
         await db.insert(quizActivityLogs).values(logs);
       }
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Error syncing attempt:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

studentRouter.post('/attempts/:id/submit', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const dbUser = await getOrCreateUser(user.uid || user.sub, user.email || `${user.uid || user.sub}@user.local`);
    
    const attemptId = parseInt(req.params.id);
    let { isAutoSubmit, selectedOptions } = req.body;
    
    const attemptResult = await db.select().from(attempts).where(eq(attempts.id, attemptId));
    if (attemptResult.length === 0) return res.status(404).json({ error: 'Attempt not found' });
    const attempt = attemptResult[0];

    if (attempt.userId !== dbUser.id) return res.status(403).json({ error: 'Forbidden' });
    
    if (attempt.status !== 'in_progress') {
      return res.status(400).json({ error: 'Attempt is already submitted' });
    }

    // Validation for time limit on submit
    if (attempt.calculatedEndTime) {
      const now = new Date();
      const endTimePlusGrace = new Date(new Date(attempt.calculatedEndTime).getTime() + 60000); // 60s grace period for submit
      if (now > endTimePlusGrace) {
        // Just auto-submit what was previously synced, ignore new answers
        selectedOptions = []; // Ignore any new selections made past time limit
      }
    }

    if (selectedOptions && Array.isArray(selectedOptions) && selectedOptions.length > 0) {
      await db.transaction(async (tx) => {
        await tx.delete(answers).where(eq(answers.attemptId, attemptId));
        const selectedOpts = await tx.select().from(options).where(inArray(options.id, selectedOptions));
        if (selectedOpts.length > 0) {
          const answerRecords = selectedOpts.map(opt => ({
            attemptId,
            questionId: opt.questionId,
            optionId: opt.id
          }));
          await tx.insert(answers).values(answerRecords);
        }
      });
    }

    const quizId = attempt.quizId;
    const quizQuestions = await db.select().from(questions).where(eq(questions.quizId, quizId));
    const questionIds = quizQuestions.map(q => q.id);
    let allOptions: any[] = [];
    if (questionIds.length > 0) {
       allOptions = await db.select().from(options).where(inArray(options.questionId, questionIds));
    }

    const userAnswers = await db.select().from(answers).where(eq(answers.attemptId, attemptId));
    const dbSelectedOptions = userAnswers.map(a => a.optionId);

    let score = 0;
    for (const q of quizQuestions) {
      const qOptions = allOptions.filter(o => o.questionId === q.id);
      const correctOptionIds = qOptions.filter(o => o.isCorrect).map(o => o.id);
      const userSelectedForQ = dbSelectedOptions.filter(optId => qOptions.some(o => o.id === optId));
      if (
        correctOptionIds.length === userSelectedForQ.length && 
        correctOptionIds.every(id => userSelectedForQ.includes(id))
      ) {
        score += q.points;
      }
    }

    const updated = await db.update(attempts).set({
      score,
      status: isAutoSubmit ? 'auto_submitted' : 'submitted',
      completedAt: new Date()
    }).where(and(eq(attempts.id, attemptId), eq(attempts.status, 'in_progress'))).returning();

    if (updated.length === 0) {
      return res.status(400).json({ error: 'Attempt is already submitted' });
    }
    
    const certQuizResult = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    if (certQuizResult.length > 0) {
      const qz = certQuizResult[0];
      const maxV = (qz.securitySettings as any)?.maxViolations || 2;
      const isSecurityAutoSubmit = updated[0].status === 'auto_submitted' && (updated[0].violations || 0) >= maxV;

      if (!isSecurityAutoSubmit) {
        const tplResult = await db.select().from(certificateTemplates).where(eq(certificateTemplates.adminId, qz.authorId));
        if (tplResult.length > 0) {
          const tpl = tplResult[0];
          if (tpl.enabled) {
            const totalPoints = quizQuestions.reduce((sum, q) => sum + q.points, 0);
            const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0;
            if (percentage >= (tpl.passingPercentage || 0)) {
              const certId = crypto.randomBytes(8).toString('hex').toUpperCase();
              await db.insert(certificates).values({
                userId: dbUser.id,
                quizId: quizId,
                certificateId: certId
              }).onConflictDoNothing();
            }
          }
        }
      }
    }


    return res.status(200).json(updated[0]);

  } catch (error) {
    console.error('Error submitting attempt:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Join quiz by entering quiz code
studentRouter.post('/quizzes/join-by-code', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Quiz code is required' });
    }

    const cleanCode = code.trim().toUpperCase();

    // Find quiz by code
    const quizResult = await db.select().from(quizzes).where(eq(quizzes.code, cleanCode));

    if (quizResult.length === 0) {
      return res.status(404).json({ error: 'Invalid Quiz Code. Please check the code and try again.' });
    }

    const quiz = quizResult[0];

    // Validate quiz status and code active flag
    if (quiz.status === 'draft') {
      return res.status(400).json({ error: 'This quiz is in draft mode and not published yet.' });
    }

    if (quiz.status === 'closed' || quiz.isCodeActive === false) {
      return res.status(400).json({ error: 'This Quiz Code has been closed or disabled by the instructor.' });
    }

    // Get questions count
    const quizQuestions = await db.select().from(questions).where(eq(questions.quizId, quiz.id));

    const user = req.user;
    if (user) {
      const dbUser = await getOrCreateUser(user.uid || user.sub, user.email || `${user.uid || user.sub}@user.local`);
      // Ensure they have an attempt record to mark they have access to this private quiz
      const existingAttempts = await db.select().from(attempts)
        .where(and(eq(attempts.quizId, quiz.id), eq(attempts.userId, dbUser.id)));
      
      if (existingAttempts.length === 0) {
        await db.insert(attempts).values({
          quizId: quiz.id,
          userId: dbUser.id,
          status: 'joined', // Special status indicating they joined but haven't started
          violations: 0
        });
      }
    }

    return res.json({
      valid: true,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        code: quiz.code,
        status: quiz.status,
        timeLimit: quiz.timeLimit,
        questionsCount: quizQuestions.length,
        isCodeActive: quiz.isCodeActive
      }
    });

  } catch (error) {
    console.error('Error joining quiz by code:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all published and active quizzes
studentRouter.get('/quizzes', requireAuth, async (req: AuthRequest, res) => {
  try {
    // Only return public quizzes in the global list. 
    // Private quizzes must be joined by code.
    const publishedQuizzes = await db.select()
      .from(quizzes)
      .where(and(eq(quizzes.status, 'published'), eq(quizzes.isCodeActive, true), eq(quizzes.isPublic, true)))
      .orderBy(desc(quizzes.createdAt));

    return res.json(publishedQuizzes);
  } catch (error) {
    console.error('Error fetching published quizzes:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific quiz without correct answers
studentRouter.get('/quizzes/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const quizId = parseInt(req.params.id);
    if (isNaN(quizId)) return res.status(400).json({ error: 'Invalid quiz ID' });

    const quizResult = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    
    if (quizResult.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const quiz = quizResult[0];

    if (quiz.status === 'draft') {
      return res.status(403).json({ error: 'Quiz is in draft mode.' });
    }

    if (quiz.status === 'closed' || quiz.isCodeActive === false) {
      return res.status(403).json({ error: 'This quiz code is closed or inactive.' });
    }

    const user = req.user;
    if (user) {
      const dbUser = await getOrCreateUser(user.uid || user.sub, user.email || `${user.uid || user.sub}@user.local`);
      if (!quiz.isPublic && quiz.authorId !== dbUser.id) {
        // If private, they must have an attempt record to prove they joined
        const existingAttempts = await db.select().from(attempts)
          .where(and(eq(attempts.quizId, quizId), eq(attempts.userId, dbUser.id)));
        if (existingAttempts.length === 0) {
           return res.status(403).json({ error: 'This is a private quiz. Please join using the quiz code first.' });
        }
      }
    }

    const quizQuestions = await db.select().from(questions).where(eq(questions.quizId, quizId));
    const questionIds = quizQuestions.map(q => q.id);
    let allOptions: any[] = [];
    
    if (questionIds.length > 0) {
       allOptions = await db.select().from(options).where(inArray(options.questionId, questionIds));
    }

    // Attach options to questions but omit isCorrect
    const questionsWithOptions = quizQuestions.map(q => ({
      ...q,
      options: allOptions
        .filter(o => o.questionId === q.id)
        .map(o => ({ id: o.id, content: o.content, questionId: o.questionId })) // strip isCorrect
    }));

    return res.json({
      ...quiz,
      questions: questionsWithOptions
    });

  } catch (error) {
    console.error('Error fetching quiz details:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit a quiz attempt
// Submit a quiz attempt (One-shot submit)
studentRouter.post('/attempts', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    const dbUser = await getOrCreateUser(user.uid || user.sub, user.email || `${user.uid || user.sub}@user.local`);

    const { quizId, selectedOptions } = req.body;
    // selectedOptions: array of option IDs
    if (!quizId || !Array.isArray(selectedOptions)) {
       return res.status(400).json({ error: 'quizId and selectedOptions are required' });
    }

    const result = await db.transaction(async (tx) => {
      const quizResult = await tx.select().from(quizzes).where(eq(quizzes.id, quizId));
      if (quizResult.length === 0) return { status: 404, data: { error: 'Quiz not found' } };
      
      const qz = quizResult[0];
      
      const newAttempt = await tx.insert(attempts).values({
        quizId,
        userId: dbUser.id,
        status: 'submitted',
        violations: 0,
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
        startedAt: new Date(),
        completedAt: new Date()
      }).returning();
      
      const attemptId = newAttempt[0].id;
      
      const quizQuestions = await tx.select().from(questions).where(eq(questions.quizId, quizId));
      const questionIds = quizQuestions.map(q => q.id);
      
      let allOptions: any[] = [];
      if (questionIds.length > 0) {
         allOptions = await tx.select().from(options).where(inArray(options.questionId, questionIds));
      }
      
      let score = 0;
      for (const optId of selectedOptions) {
         const option = allOptions.find(o => o.id === optId);
         if (option && option.isCorrect) {
            const question = quizQuestions.find(q => q.id === option.questionId);
            if (question) {
               score += question.points;
            }
         }
      }
      
      const tplResult = await tx.select().from(certificateTemplates).where(eq(certificateTemplates.adminId, qz.authorId));
      if (tplResult.length > 0) {
        const tpl = tplResult[0];
        if (tpl.enabled) {
          const totalPoints = quizQuestions.reduce((sum, q) => sum + q.points, 0);
          const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0;
          if (percentage >= (tpl.passingPercentage || 0)) {
            const certId = crypto.randomBytes(8).toString('hex').toUpperCase();
            await tx.insert(certificates).values({
              userId: dbUser.id,
              quizId: quizId,
              certificateId: certId
            }).onConflictDoNothing();
          }
        }
      }
      
      if (selectedOptions.length > 0) {
        const answerRecords = selectedOptions.map(optId => ({
          attemptId,
          questionId: allOptions.find(o => o.id === optId)?.questionId,
          optionId: optId
        })).filter(a => a.questionId !== undefined);
        await tx.insert(answers).values(answerRecords);
      }
      
      return { status: 201, data: newAttempt[0] };
    });
    
    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error('Error submitting attempt:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's past attempts
studentRouter.get('/attempts', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    const dbUser = await getOrCreateUser(user.uid || user.sub, user.email || `${user.uid || user.sub}@user.local`);

    const userAttempts = await db.select({
      id: attempts.id,
      score: attempts.score,
      createdAt: attempts.createdAt,
      quizTitle: quizzes.title,
      quizId: quizzes.id,
      status: attempts.status,
      violations: attempts.violations
    })
    .from(attempts)
    .innerJoin(quizzes, eq(attempts.quizId, quizzes.id))
    .where(eq(attempts.userId, dbUser.id))
    .orderBy(desc(attempts.createdAt));

    return res.json(userAttempts);
  } catch (error) {
    console.error('Error fetching attempts:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Review a submitted attempt
studentRouter.get('/attempts/:attemptId/review', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    const dbUser = await getOrCreateUser(user.uid || user.sub, user.email || `${user.uid || user.sub}@user.local`);
    const attemptId = parseInt(req.params.attemptId);
    
    const attemptResult = await db.select().from(attempts).where(eq(attempts.id, attemptId));
    if (attemptResult.length === 0) return res.status(404).json({ error: 'Attempt not found' });
    
    const attempt = attemptResult[0];
    if (attempt.userId !== dbUser.id) return res.status(403).json({ error: 'Forbidden' });
    if (attempt.status !== 'submitted' && attempt.status !== 'auto_submitted') {
      return res.status(400).json({ error: 'Attempt is not submitted yet' });
    }
    
    const quizResult = await db.select().from(quizzes).where(eq(quizzes.id, attempt.quizId));
    if (quizResult.length === 0) return res.status(404).json({ error: 'Quiz not found' });
    const quiz = quizResult[0];
    
    // Check if review is allowed
    const securitySettings = quiz.securitySettings as any;
    const showAnswers = securitySettings?.showCorrectAnswersAfterSubmit === true;
    
    // Fetch quiz questions
    const quizQuestions = await db.select().from(questions).where(eq(questions.quizId, quiz.id));
    const questionIds = quizQuestions.map(q => q.id);
    let allOptions: any[] = [];
    if (questionIds.length > 0) {
      allOptions = await db.select().from(options).where(inArray(options.questionId, questionIds));
    }
    
    // Fetch user answers
    const userAnswers = await db.select().from(answers).where(eq(answers.attemptId, attempt.id));
    const userSelectedOptions = userAnswers.map(a => a.optionId);
    
    const questionsWithOptions = quizQuestions.map(q => ({
      ...q,
      options: allOptions
        .filter(o => o.questionId === q.id)
        .map(o => ({
          id: o.id,
          content: o.content,
          questionId: o.questionId,
          // Only send isCorrect if allowed
          ...(showAnswers ? { isCorrect: o.isCorrect } : {})
        }))
    }));
    
    return res.json({
      attempt,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        questions: questionsWithOptions
      },
      userSelectedOptions,
      showAnswers
    });
    
  } catch (error) {
    console.error('Error fetching review:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
