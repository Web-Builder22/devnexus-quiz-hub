import { db } from './src/db/index.ts';
import { certificates, quizzes } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function run() {
  const myCerts = await db.select({
      id: certificates.id,
      certificateId: certificates.certificateId,
      issuedAt: certificates.issuedAt,
      quizTitle: quizzes.title,
      quizId: certificates.quizId
    }).from(certificates)
      .innerJoin(quizzes, eq(certificates.quizId, quizzes.id))
      .where(eq(certificates.userId, 142)); // 142 is the user

  console.log("My Certs:", myCerts);
  process.exit(0);
}
run().catch(console.error);
