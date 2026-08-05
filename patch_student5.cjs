const fs = require('fs');
let file = fs.readFileSync('src/api/student.ts', 'utf8');

const regex = /studentRouter\.post\('\/attempts', requireAuth, async \(req: AuthRequest, res\) => \{[\s\S]*?\} catch \(error\) \{\s*console\.error\('Error submitting attempt:', error\);\s*return res\.status\(500\)\.json\(\{ error: 'Internal server error' \}\);\s*\}\s*\}\);/;

const replacement = `// Submit a quiz attempt (One-shot submit)
studentRouter.post('/attempts', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    const dbUser = await getOrCreateUser(user.uid || user.sub, user.email || \`\${user.uid || user.sub}@user.local\`);

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
});`;

file = file.replace(regex, replacement);
fs.writeFileSync('src/api/student.ts', file);
