import { db } from './src/db/index.js';
import { certificateTemplates, quizAttempts, quizzes, certificates } from './src/db/schema.js';
import { eq, and, isNull, leftJoin } from 'drizzle-orm';
import crypto from 'crypto';

// Retroactive certificate issue
export async function issueRetroactiveCertificates(adminId: number, passPct: number) {
  try {
    // get all quizzes by this admin
    const adminQuizzes = await db.select().from(quizzes).where(eq(quizzes.authorId, adminId));
    
    for (const qz of adminQuizzes) {
      const qzPassPct = qz.issueCertificate && qz.passingPercentage ? qz.passingPercentage : passPct;
      
      // Get all submitted attempts
      const allAttempts = await db.select().from(quizAttempts).where(eq(quizAttempts.quizId, qz.id));
      const validAttempts = allAttempts.filter(a => a.status === 'submitted' || a.status === 'auto_submitted');
      
      // We need to know max score, but we don't store percentage in attempts directly, only `score`.
      // wait, `percentage` is not in quizAttempts directly... oh wait, `percentage` might not be a column.
    }
  } catch (e) {
  }
}
