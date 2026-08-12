import crypto from 'crypto';
import { Router } from 'express';
import { db } from '../db/index.ts';
import { attempts, quizzes, users, quizActivityLogs, certificates, certificateTemplates } from '../db/schema.ts';
import { desc, eq, sql, inArray } from 'drizzle-orm';
import { questions, options, answers } from '../db/schema.ts';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';
import { getOrCreateUser } from '../db/users.ts';

export const analyticsRouter = Router();

// Middleware to ensure admin role
analyticsRouter.use(requireAuth, async (req: AuthRequest, res, next) => {
  if (!req.user?.uid) return res.status(401).json({ error: 'Unauthorized' });
  const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || `${req.user!.uid}@user.local`);
  
  if (!dbUser || (dbUser.role !== 'admin')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
});

analyticsRouter.get('/overview', async (req: AuthRequest, res) => {
  try {
    const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || `${req.user!.uid}@user.local`);
    const totalQuizzesResult = await db.select({ count: sql<number>`count(*)` }).from(quizzes).where(eq(quizzes.authorId, dbUser.id));
    const totalAttemptsResult = await db.select({ count: sql<number>`count(*)` }).from(attempts).innerJoin(quizzes, eq(attempts.quizId, quizzes.id)).where(eq(quizzes.authorId, dbUser.id));
    const totalStudentsResult = await db.select({ count: sql<number>`count(distinct ${attempts.userId})` }).from(attempts).innerJoin(quizzes, eq(attempts.quizId, quizzes.id)).where(eq(quizzes.authorId, dbUser.id));
    const avgScoreResult = await db.select({ avg: sql<number>`avg(${attempts.score})` }).from(attempts).innerJoin(quizzes, eq(attempts.quizId, quizzes.id)).where(eq(quizzes.authorId, dbUser.id));

    res.json({
      totalQuizzes: Number(totalQuizzesResult[0]?.count || 0),
      totalAttempts: Number(totalAttemptsResult[0]?.count || 0),
      totalStudents: Number(totalStudentsResult[0]?.count || 0),
      avgScore: Number(avgScoreResult[0]?.avg || 0).toFixed(1),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

analyticsRouter.get('/quizzes', async (req: AuthRequest, res) => {
  try {
    // Get stats per quiz
    const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || `${req.user!.uid}@user.local`);
    const quizStats = await db
      .select({
        id: quizzes.id,
        title: quizzes.title,
        attemptsCount: sql<number>`count(${attempts.id})`,
        avgScore: sql<number>`avg(${attempts.score})`,
      })
      .from(quizzes)
      .leftJoin(attempts, eq(quizzes.id, attempts.quizId))
      .where(eq(quizzes.authorId, dbUser.id))
      .groupBy(quizzes.id, quizzes.title)
      .orderBy(desc(sql`count(${attempts.id})`));

    res.json(quizStats.map(q => ({
      ...q,
      attemptsCount: Number(q.attemptsCount || 0),
      avgScore: Number(q.avgScore || 0).toFixed(1),
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

analyticsRouter.get('/recent', async (req: AuthRequest, res) => {
  try {
    const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || `${req.user!.uid}@user.local`);
    const recentAttempts = await db
      .select({
        id: attempts.id,
        score: attempts.score,
        createdAt: attempts.createdAt,
        quizTitle: quizzes.title,
        studentName: attempts.participantName,
        studentEmail: users.email,
        studentDisplayName: users.displayName,
        status: attempts.status,
        violations: attempts.violations,
      })
      .from(attempts)
      .innerJoin(quizzes, eq(attempts.quizId, quizzes.id))
      .innerJoin(users, eq(attempts.userId, users.id))
      .where(eq(quizzes.authorId, dbUser.id))
      .orderBy(desc(attempts.createdAt))
      .limit(10);

    res.json(recentAttempts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

analyticsRouter.get('/violations', async (req: AuthRequest, res) => {
  try {
    const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || `${req.user!.uid}@user.local`);
    const violations = await db
      .select({
        id: quizActivityLogs.id,
        type: quizActivityLogs.type,
        details: quizActivityLogs.details,
        snapshotImage: quizActivityLogs.snapshotImage,
        createdAt: quizActivityLogs.createdAt,
        studentEmail: users.email,
        studentDisplayName: users.displayName,
        quizTitle: quizzes.title,
      })
      .from(quizActivityLogs)
      .innerJoin(attempts, eq(quizActivityLogs.attemptId, attempts.id))
      .innerJoin(users, eq(attempts.userId, users.id))
      .innerJoin(quizzes, eq(attempts.quizId, quizzes.id))
      .where(eq(quizzes.authorId, dbUser.id))
      .orderBy(desc(quizActivityLogs.createdAt))
      .limit(20);

    res.json(violations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Export Quiz Results
analyticsRouter.get('/quizzes/:id/export', async (req: AuthRequest, res) => {
  try {
    const quizId = parseInt(req.params.id);
    if (isNaN(quizId)) return res.status(400).json({ error: 'Invalid quiz ID' });
    
    // Get Quiz
    const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || `${req.user!.uid}@user.local`);
    const quizResult = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    if (quizResult.length === 0) return res.status(404).json({ error: 'Quiz not found' });
    const quiz = quizResult[0];
    if (quiz.authorId !== dbUser.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Get Questions for total points
    const quizQuestions = await db.select().from(questions).where(eq(questions.quizId, quizId));
    const totalPoints = quizQuestions.reduce((sum, q) => sum + q.points, 0);

    // We also need options to check correct/incorrect counts per attempt
    const questionIds = quizQuestions.map(q => q.id);
    let allOptions = [];
    if (questionIds.length > 0) {
      allOptions = await db.select().from(options).where(inArray(options.questionId, questionIds));
    }

    // Get all submitted attempts
    const submittedAttempts = await db.select({
      id: attempts.id,
      score: attempts.score,
      status: attempts.status,
      startedAt: attempts.startedAt,
      completedAt: attempts.completedAt,
      studentName: attempts.participantName,
      studentEmail: users.email,
      studentDisplayName: users.displayName
    })
    .from(attempts)
    .innerJoin(users, eq(attempts.userId, users.id))
    .where(sql`${attempts.quizId} = ${quizId} AND ${attempts.status} IN ('submitted', 'auto_submitted')`);

    // Get all answers for these attempts
    let allAnswers = [];
    const attemptIds = submittedAttempts.map(a => a.id);
    if (attemptIds.length > 0) {
      // Split into chunks if needed, but since it's an export we can just fetch all
      allAnswers = await db.select().from(answers).where(inArray(answers.attemptId, attemptIds));
    }

    // Process attempts to calculate correct/incorrect, time taken, rank
    let results = submittedAttempts.map(attempt => {
      let correctAnswersCount = 0;
      let incorrectAnswersCount = 0;

      const attemptAnswers = allAnswers.filter(a => a.attemptId === attempt.id);
      const attemptSelectedOptions = attemptAnswers.map(a => a.optionId);

      for (const q of quizQuestions) {
        const qOptions = allOptions.filter(o => o.questionId === q.id);
        const correctOptionIds = qOptions.filter(o => o.isCorrect).map(o => o.id);
        const userSelectedForQ = attemptSelectedOptions.filter(optId => qOptions.some(o => o.id === optId));
        
        if (userSelectedForQ.length > 0) {
          if (
            correctOptionIds.length === userSelectedForQ.length && 
            correctOptionIds.every(id => userSelectedForQ.includes(id))
          ) {
            correctAnswersCount++;
          } else {
            incorrectAnswersCount++;
          }
        } else {
           // un-answered can be counted as incorrect or omitted. We'll just count as incorrect.
           incorrectAnswersCount++;
        }
      }

      const timeTakenMs = attempt.completedAt && attempt.startedAt ? (new Date(attempt.completedAt).getTime() - new Date(attempt.startedAt).getTime()) : 0;
      
      return {
        ...attempt,
        percentage: totalPoints > 0 ? Math.round((attempt.score / totalPoints) * 100) : 0,
        correctAnswersCount,
        incorrectAnswersCount,
        timeTakenMs
      };
    });

    // Rank logic: sort by score desc, then timeTakenMs asc
    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.timeTakenMs - b.timeTakenMs;
    });

    // Assign ranks (handling ties if needed, but simple 1 to N is fine)
    results = results.map((r, idx) => ({ ...r, rank: idx + 1 }));

    // Check if certificates should be retroactively issued
    let issueCertificates = quiz.issueCertificate;
    let passPct = quiz.passingPercentage || 0;
    
    if (!issueCertificates) {
      const tpls = await db.select().from(certificateTemplates).where(eq(certificateTemplates.adminId, dbUser.id));
      if (tpls.length > 0 && tpls[0].enabled) {
        issueCertificates = true;
        passPct = tpls[0].passingPercentage || 0;
      }
    }

    // Fetch existing certificates
    const existingCerts = await db.select().from(certificates).where(eq(certificates.quizId, quizId));
    
    // Attach certificateId and generate if needed
    for (let r of results) {
      let cert = existingCerts.find((c: any) => c.userId === r.studentId);
      if (cert) {
        r.certificateId = cert.certificateId;
      } else if (issueCertificates && r.percentage >= passPct) {
        // Issue retroactively
        const certId = crypto.randomBytes(8).toString('hex').toUpperCase();
        await db.insert(certificates).values({
          userId: r.studentId,
          quizId: quizId,
          certificateId: certId
        }).onConflictDoNothing();
        r.certificateId = certId;
      }
    }


    res.json({
      quiz: {
        title: quiz.title,
        code: quiz.code || 'N/A',
        createdAt: quiz.createdAt,
        timeLimit: quiz.timeLimit
      },
      results
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});
