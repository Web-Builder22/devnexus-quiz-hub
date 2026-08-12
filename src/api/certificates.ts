import { Router } from 'express';
import { db } from '../db/index.ts';
import { certificateTemplates, certificates, users, quizzes, attempts, questions } from '../db/schema.ts';
import { eq, and } from 'drizzle-orm';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';
import { getOrCreateUser } from '../db/users.ts';

export const certificatesRouter = Router();

// Get settings for admin
certificatesRouter.get('/settings', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || `${req.user!.uid}@user.local`);
    if (dbUser.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    let settings = await db.select().from(certificateTemplates).where(eq(certificateTemplates.adminId, dbUser.id));
    
    if (settings.length === 0) {
      // Create default
      const defaultLayoutConfig = {
        studentName: { x: 148.5, y: 92, fontSize: 36, color: '#000000', align: 'center', enabled: false, fontStyle: 'italic' },
        studentEmail: { x: 148.5, y: 110, fontSize: 14, color: '#666666', align: 'center', enabled: false },
        quizTitle: { x: 148.5, y: 122, fontSize: 20, color: '#000000', align: 'center', enabled: false, fontStyle: 'bold' },
        score: { x: 47.5, y: 163, fontSize: 14, color: '#000000', align: 'center', enabled: false },
        percentage: { x: 98, y: 163, fontSize: 14, color: '#000000', align: 'center', enabled: false },
        rank: { x: 148.5, y: 163, fontSize: 14, color: '#000000', align: 'center', enabled: false },
        issueDate: { x: 199, y: 163, fontSize: 14, color: '#000000', align: 'center', enabled: false },
        certificateId: { x: 249.5, y: 163, fontSize: 12, color: '#000000', align: 'center', enabled: false }
      };
      
      const newSettings = await db.insert(certificateTemplates).values({
        adminId: dbUser.id,
        enabled: false,
        passingPercentage: 70,
        layoutConfig: defaultLayoutConfig,
        updatedAt: new Date()
      }).returning();
      
      return res.json(newSettings[0]);
    }

    res.json(settings[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update settings for admin
certificatesRouter.post('/settings', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || `${req.user!.uid}@user.local`);
    if (dbUser.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const { enabled, passingPercentage, backgroundImage, layoutConfig } = req.body;
    
    const settings = await db.select().from(certificateTemplates).where(eq(certificateTemplates.adminId, dbUser.id));
    if (settings.length === 0) {
      await db.insert(certificateTemplates).values({
        adminId: dbUser.id,
        enabled,
        passingPercentage,
        backgroundImage,
        layoutConfig,
        updatedAt: new Date()
      });
    } else {
      await db.update(certificateTemplates).set({
        enabled,
        passingPercentage,
        backgroundImage,
        layoutConfig,
        updatedAt: new Date()
      }).where(eq(certificateTemplates.adminId, dbUser.id));
    }
    
    
    if (enabled) {
      // Retroactive issuance for all passed attempts across all admin's quizzes
      const { quizzes, attempts, questions } = await import('../db/schema.ts');
      const { inArray, and, sql } = await import('drizzle-orm');
      const crypto = await import('crypto');

      const adminQuizzes = await db.select().from(quizzes).where(eq(quizzes.authorId, dbUser.id));
      for (const qz of adminQuizzes) {
         let passPct = qz.passingPercentage || passingPercentage || 70;
         const qzAttempts = await db.select().from(attempts).where(and(eq(attempts.quizId, qz.id), inArray(attempts.status, ['submitted', 'auto_submitted'])));
         
         const qs = await db.select().from(questions).where(eq(questions.quizId, qz.id));
         const totalPoints = qs.reduce((sum, q) => sum + q.points, 0);

         const existingCerts = await db.select().from(certificates).where(eq(certificates.quizId, qz.id));
         
         for (const a of qzAttempts) {
            const hasCert = existingCerts.some(c => c.userId === a.userId);
            if (!hasCert) {
               const percentage = totalPoints > 0 ? (a.score / totalPoints) * 100 : 0;
               if (percentage >= passPct) {
                  const certId = crypto.default.randomBytes(8).toString('hex').toUpperCase();
                  await db.insert(certificates).values({
                    userId: a.userId,
                    quizId: qz.id,
                    certificateId: certId
                  }).onConflictDoNothing();
               }
            }
         }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all issued certificates for admin
certificatesRouter.get('/all-issued', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || `${req.user!.uid}@user.local`);
    if (dbUser.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const allCerts = await db.select({
      id: certificates.id,
      certificateId: certificates.certificateId,
      issuedAt: certificates.issuedAt,
      quizId: certificates.quizId,
      quizTitle: quizzes.title,
      studentId: users.id,
      studentName: users.displayName,
      studentEmail: users.email
    }).from(certificates)
      .innerJoin(quizzes, eq(certificates.quizId, quizzes.id))
      .innerJoin(users, eq(certificates.userId, users.id))
      .where(eq(quizzes.authorId, dbUser.id));

    res.json(allCerts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify a certificate publicly by Certificate ID
certificatesRouter.post('/verify', async (req, res) => {
  try {
    const { certificateId } = req.body;
    if (!certificateId) return res.status(400).json({ error: 'Certificate ID is required' });

    const certs = await db.select({
      id: certificates.id,
      certificateId: certificates.certificateId,
      issuedAt: certificates.issuedAt,
      quizTitle: quizzes.title,
      studentName: users.displayName,
      studentEmail: users.email
    }).from(certificates)
      .innerJoin(quizzes, eq(certificates.quizId, quizzes.id))
      .innerJoin(users, eq(certificates.userId, users.id))
      .where(eq(certificates.certificateId, certificateId.trim()));

    if (certs.length === 0) {
      return res.status(404).json({ valid: false, message: 'Certificate not found or invalid' });
    }

    const cert = certs[0];
    res.json({
      valid: true,
      certificate: {
        certificateId: cert.certificateId,
        studentName: cert.studentName || cert.studentEmail.split('@')[0],
        studentEmail: cert.studentEmail,
        quizTitle: cert.quizTitle,
        issuedAt: cert.issuedAt
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Revoke / delete a certificate (admin)
certificatesRouter.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || `${req.user!.uid}@user.local`);
    if (dbUser.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const certId = req.params.id;
    await db.delete(certificates).where(eq(certificates.certificateId, certId));
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get student's certificates
certificatesRouter.get('/my-certificates', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || `${req.user!.uid}@user.local`);

    const myCerts = await db.select({
      id: certificates.id,
      certificateId: certificates.certificateId,
      issuedAt: certificates.issuedAt,
      quizTitle: quizzes.title,
      quizId: certificates.quizId
    }).from(certificates)
      .innerJoin(quizzes, eq(certificates.quizId, quizzes.id))
      .where(and(eq(certificates.userId, dbUser.id), eq(quizzes.resultsReleased, true)));

    res.json(myCerts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get data to generate PDF for a specific certificate
certificatesRouter.get('/:id/download-data', requireAuth, async (req: AuthRequest, res) => {
  try {
    const certId = req.params.id;
    const certs = await db.select().from(certificates).where(eq(certificates.certificateId, certId));
    if (certs.length === 0) return res.status(404).json({ error: 'Certificate not found' });
    const cert = certs[0];

    const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || `${req.user!.uid}@user.local`);

    // Get quiz
    const quizResult = await db.select().from(quizzes).where(eq(quizzes.id, cert.quizId));
    const quiz = quizResult[0];

    // Authorization: Must be the student who owns it, or the admin who created the quiz
    if (dbUser.id !== cert.userId && dbUser.id !== quiz.authorId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Get template
    const tplResult = await db.select().from(certificateTemplates).where(eq(certificateTemplates.adminId, quiz.authorId));
    
    let tpl = tplResult[0];
    if (!tpl) {
       // Create default if missing
       const defaultLayoutConfig = {
        studentName: { x: 148.5, y: 100, fontSize: 24, color: '#000000', align: 'center', enabled: false },
        studentEmail: { x: 148.5, y: 110, fontSize: 14, color: '#666666', align: 'center', enabled: false },
        quizTitle: { x: 148.5, y: 130, fontSize: 18, color: '#000000', align: 'center', enabled: false },
        score: { x: 148.5, y: 150, fontSize: 16, color: '#000000', align: 'center', enabled: false },
        percentage: { x: 148.5, y: 160, fontSize: 16, color: '#000000', align: 'center', enabled: false },
        rank: { x: 148.5, y: 170, fontSize: 16, color: '#000000', align: 'center', enabled: false },
        issueDate: { x: 70, y: 180, fontSize: 14, color: '#000000', align: 'left', enabled: false },
        certificateId: { x: 227, y: 180, fontSize: 10, color: '#666666', align: 'right', enabled: false }
      };
      const newSettings = await db.insert(certificateTemplates).values({
        adminId: quiz.authorId,
        enabled: false,
        passingPercentage: 70,
        layoutConfig: defaultLayoutConfig,
        updatedAt: new Date()
      }).returning();
      tpl = newSettings[0];
    }


    // Get student details
    const studentResult = await db.select().from(users).where(eq(users.id, cert.userId));
    const student = studentResult[0];

    // Get attempt to calculate score/percentage
    const allAttempts = await db.select().from(attempts).where(eq(attempts.quizId, quiz.id));
    const myAttempts = allAttempts.filter((a: any) => a.userId === cert.userId && (a.status === 'submitted' || a.status === 'auto_submitted'));
    const myBest = myAttempts.sort((a: any, b: any) => b.score - a.score)[0];
    
    // Sort all to find rank
    // For simplicity, unique users best score
    const bestScores = new Map();
    for (const a of allAttempts) {
      if (a.status === 'submitted' || a.status === 'auto_submitted') {
         if (!bestScores.has(a.userId) || bestScores.get(a.userId).score < a.score) {
             bestScores.set(a.userId, a);
         }
      }
    }
    const ranked = Array.from(bestScores.values()).sort((a: any, b: any) => b.score - a.score);
    const rank = ranked.findIndex((a: any) => a.userId === cert.userId) + 1;

    // We don't have total points easily without querying questions, but we can if needed.
    const qs = await db.select().from(questions).where(eq(questions.quizId, quiz.id));
    const totalPoints = qs.reduce((sum: number, q: any) => sum + q.points, 0);
    const percentage = totalPoints > 0 ? (myBest.score / totalPoints) * 100 : 0;

    const participantName = myBest?.participantName || student.displayName || student.email.split('@')[0];
    
    // Get Admin
    const adminResult = await db.select().from(users).where(eq(users.id, quiz.authorId));
    const adminUser = adminResult[0];
    const adminName = adminUser?.displayName || adminUser?.email.split('@')[0] || 'Administrator';
    
    res.json({
      template: tpl,
      data: {
        studentName: participantName,
        studentEmail: student.email,
        quizTitle: quiz.title,
        rank: `#${rank}`,
        score: `${myBest.score}`,
        percentage: `${percentage.toFixed(0)}%`,
        issueDate: new Date(cert.issuedAt).toLocaleDateString(),
        certificateId: cert.certificateId,
        adminName: adminName,
        organizationName: 'DevNexus'
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
