import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';
import { db } from '../db/index.ts';
import { quizzes, questions, options, users } from '../db/schema.ts';
import { eq, desc, inArray } from 'drizzle-orm';
import { getOrCreateUser } from '../db/users.ts';

export const quizzesRouter = Router();

function generateQuizCode(prefix = 'DEV'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let random = '';
  for (let i = 0; i < 5; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${random}`;
}

// Get all quizzes for the current user
quizzesRouter.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const dbUser = await getOrCreateUser(user.uid || user.sub, user.email || `${user.uid || user.sub}@user.local`);
    
    const userQuizzes = await db.select()
      .from(quizzes)
      .where(eq(quizzes.authorId, dbUser.id))
      .orderBy(desc(quizzes.createdAt));

    // Ensure all returned quizzes have a code
    const updatedQuizzes = await Promise.all(userQuizzes.map(async (q) => {
      if (!q.code) {
        const generatedCode = generateQuizCode('DEV');
        await db.update(quizzes).set({ code: generatedCode }).where(eq(quizzes.id, q.id));
        return { ...q, code: generatedCode };
      }
      return q;
    }));

    return res.json(updatedQuizzes);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new quiz with automatic unique quiz code
quizzesRouter.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user || (!user.uid && !user.sub)) {
      return res.status(401).json({ error: 'Unauthorized: Invalid user payload' });
    }
    
    const uid = user.uid || user.sub;
    const email = user.email || `${uid}@user.local`;

    const { title, timeLimit, isPublic, allowedAttempts, startTime, endTime, resultsReleased } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    let dbUser = await getOrCreateUser(uid, email, user.role);
    if (!dbUser) {
      const found = await db.select().from(users).where(eq(users.uid, uid));
      if (found.length > 0) {
        dbUser = found[0];
      }
    }

    if (!dbUser) {
      return res.status(400).json({ error: 'User profile not found. Please log out and sign in again.' });
    }

    // Generate unique quiz code
    let quizCode = generateQuizCode('DEV');
    let attemptsCount = 0;
    while (attemptsCount < 10) {
      const existing = await db.select().from(quizzes).where(eq(quizzes.code, quizCode));
      if (existing.length === 0) break;
      quizCode = generateQuizCode('DEV');
      attemptsCount++;
    }

    const parsedTimeLimit = (timeLimit !== null && timeLimit !== undefined && timeLimit !== '' && !isNaN(Number(timeLimit)))
      ? parseInt(String(timeLimit), 10) 
      : null;

    const parsedAllowedAttempts = (allowedAttempts !== null && allowedAttempts !== undefined && allowedAttempts !== '' && !isNaN(Number(allowedAttempts)))
      ? parseInt(String(allowedAttempts), 10) 
      : 1;

    const newQuiz = await db.insert(quizzes).values({
      title: title.trim(),
      status: 'published', // default to published so code works immediately
      code: quizCode,
      isCodeActive: true,
      isPublic: Boolean(isPublic),
      resultsReleased: resultsReleased === true,
      timeLimit: parsedTimeLimit,
      startTime: startTime ? new Date(startTime) : null,
      endTime: endTime ? new Date(endTime) : null,
      allowedAttempts: parsedAllowedAttempts,
      authorId: dbUser.id,
    }).returning();

    if (!newQuiz || newQuiz.length === 0) {
      return res.status(500).json({ error: 'Failed to create quiz in database' });
    }

    return res.status(201).json(newQuiz[0]);
  } catch (error: any) {
    console.error('Error creating quiz:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

// Toggle quiz code active status or status (Active / Disabled / Closed)
quizzesRouter.patch('/:id/code-status', requireAuth, async (req: AuthRequest, res) => {
  try {
    const quizId = parseInt(req.params.id);
    if (isNaN(quizId)) return res.status(400).json({ error: 'Invalid quiz ID' });

    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const dbUser = await getOrCreateUser(user.uid || user.sub, user.email || `${user.uid || user.sub}@user.local`);
    const quizResult = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    
    if (quizResult.length === 0) return res.status(404).json({ error: 'Quiz not found' });
    if (quizResult[0].authorId !== dbUser.id && dbUser.role !== "admin") {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { isCodeActive, status } = req.body;

    const updatePayload: any = {};
    if (typeof isCodeActive === 'boolean') {
      updatePayload.isCodeActive = isCodeActive;
    }
    if (status) {
      updatePayload.status = status;
    }

    updatePayload.updatedAt = new Date();
    const updated = await db.update(quizzes)
      .set(updatePayload)
      .where(eq(quizzes.id, quizId))
      .returning();

    return res.json(updated[0]);
  } catch (error) {
    console.error('Error toggling code status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Regenerate quiz code for a quiz
quizzesRouter.post('/:id/regenerate-code', requireAuth, async (req: AuthRequest, res) => {
  try {
    const quizId = parseInt(req.params.id);
    if (isNaN(quizId)) return res.status(400).json({ error: 'Invalid quiz ID' });

    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const dbUser = await getOrCreateUser(user.uid || user.sub, user.email || `${user.uid || user.sub}@user.local`);
    const quizResult = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    
    if (quizResult.length === 0) return res.status(404).json({ error: 'Quiz not found' });
    if (quizResult[0].authorId !== dbUser.id && dbUser.role !== "admin") {
      return res.status(403).json({ error: 'Forbidden' });
    }

    let newCode = generateQuizCode('DEV');
    const updated = await db.update(quizzes)
      .set({ code: newCode, isCodeActive: true, updatedAt: new Date() })
      .where(eq(quizzes.id, quizId))
      .returning();

    return res.json(updated[0]);
  } catch (error) {
    console.error('Error regenerating code:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

quizzesRouter.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const quizId = parseInt(req.params.id);
    if (isNaN(quizId)) return res.status(400).json({ error: 'Invalid quiz ID' });
    
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const dbUser = await getOrCreateUser(user.uid || user.sub, user.email || `${user.uid || user.sub}@user.local`);
    const quizResult = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    
    if (quizResult.length === 0) return res.status(404).json({ error: 'Quiz not found' });
    if (quizResult[0].authorId !== dbUser.id && dbUser.role !== "admin") {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { title, timeLimit, status, securitySettings, isPublic, allowedAttempts, startTime, endTime, resultsReleased } = req.body;
    
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (timeLimit !== undefined) updateData.timeLimit = timeLimit;
    if (allowedAttempts !== undefined) updateData.allowedAttempts = allowedAttempts;
    if (status !== undefined) updateData.status = status;
    if (securitySettings !== undefined) updateData.securitySettings = securitySettings;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (startTime !== undefined) updateData.startTime = startTime ? new Date(startTime) : null;
    if (endTime !== undefined) updateData.endTime = endTime ? new Date(endTime) : null;
    if (resultsReleased !== undefined) updateData.resultsReleased = resultsReleased;

    updateData.updatedAt = new Date();
    const updated = await db.update(quizzes)
      .set(updateData)
      .where(eq(quizzes.id, quizId))
      .returning();

    return res.json(updated[0]);
  } catch (error) {
    console.error('Error updating quiz:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific quiz with its questions
quizzesRouter.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const quizId = parseInt(req.params.id);
    if (isNaN(quizId)) return res.status(400).json({ error: 'Invalid quiz ID' });

    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    const dbUser = await getOrCreateUser(user.uid || user.sub, user.email || `${user.uid || user.sub}@user.local`);

    const quizResult = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    
    if (quizResult.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const quiz = quizResult[0];

    // Only allow author or admin to view the quiz
    if (quiz.authorId !== dbUser.id && dbUser.role !== "admin") {
       return res.status(403).json({ error: "Forbidden" });
    }

    // Fetch questions
    const quizQuestions = await db.select().from(questions).where(eq(questions.quizId, quizId));
    
    // Fetch options for these questions
    const questionIds = quizQuestions.map(q => q.id);
    let allOptions: any[] = [];
    
    // We could use an in operator if there are questions
    // Wait, Drizzle inArray requires non-empty array
    if (questionIds.length > 0) {
       allOptions = await db.select().from(options).where(inArray(options.questionId, questionIds));
    }

    // Attach options to questions
    const questionsWithOptions = quizQuestions.map(q => ({
      ...q,
      options: allOptions.filter(o => o.questionId === q.id)
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

// Add a question to a quiz
quizzesRouter.post('/:id/questions', requireAuth, async (req: AuthRequest, res) => {
  try {
    const quizId = parseInt(req.params.id);
    if (isNaN(quizId)) return res.status(400).json({ error: 'Invalid quiz ID' });

    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    const dbUser = await getOrCreateUser(user.uid || user.sub, user.email || `${user.uid || user.sub}@user.local`);

    const quizResult = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    if (quizResult.length === 0) return res.status(404).json({ error: 'Quiz not found' });
    
    if (quizResult[0].authorId !== dbUser.id && dbUser.role !== "admin") {
       return res.status(403).json({ error: 'Forbidden' });
    }

    const { type, content, points, optionsData } = req.body;
    
    if (!content || !type) {
      return res.status(400).json({ error: 'Question content and type are required' });
    }

    // Using transaction would be better, but doing sequentially for now
    const result = await db.transaction(async (tx) => {
      const newQuestion = await tx.insert(questions).values({
      quizId,
      type,
      content,
      points: points || 1
    }).returning();
      const question = newQuestion[0];
      let insertedOptions: any[] = [];
      if (optionsData && Array.isArray(optionsData) && optionsData.length > 0) {
         const optionsToInsert = optionsData.map((opt: any) => ({
           questionId: question.id,
           content: opt.content,
           isCorrect: opt.isCorrect || false
         }));
         insertedOptions = await tx.insert(options).values(optionsToInsert).returning();
      }
      return { ...question, options: insertedOptions };
    });

    return res.status(201).json(result);

  } catch (error) {
    console.error('Error adding question:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a question
quizzesRouter.delete('/:quizId/questions/:questionId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const quizId = parseInt(req.params.quizId);
    const questionId = parseInt(req.params.questionId);
    if (isNaN(quizId) || isNaN(questionId)) return res.status(400).json({ error: 'Invalid ID' });

    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const dbUser = await getOrCreateUser(user.uid || user.sub, user.email || `${user.uid || user.sub}@user.local`);
    const quizResult = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    
    if (quizResult.length === 0) return res.status(404).json({ error: 'Quiz not found' });
    
    if (quizResult[0].authorId !== dbUser.id && dbUser.role !== "admin") {
       return res.status(403).json({ error: 'Forbidden' });
    }

    await db.delete(questions).where(eq(questions.id, questionId));
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting question:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a quiz
quizzesRouter.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const quizId = parseInt(req.params.id);
    if (isNaN(quizId)) return res.status(400).json({ error: 'Invalid quiz ID' });

    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const dbUser = await getOrCreateUser(user.uid || user.sub, user.email || `${user.uid || user.sub}@user.local`);
    const quizResult = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    
    if (quizResult.length === 0) return res.status(404).json({ error: 'Quiz not found' });
    
    if (quizResult[0].authorId !== dbUser.id && dbUser.role !== "admin") {
       return res.status(403).json({ error: "Forbidden" });
    }

    await db.delete(quizzes).where(eq(quizzes.id, quizId));
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
