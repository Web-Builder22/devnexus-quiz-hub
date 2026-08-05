import { db } from './src/db/index.ts';
import { certificateTemplates, certificates } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function run() {
  const tpl = await db.select().from(certificateTemplates).where(eq(certificateTemplates.adminId, 1));
  if (tpl.length > 0) {
    const config = tpl[0];
    await db.insert(certificateTemplates).values({
      adminId: 6,
      enabled: true,
      passingPercentage: 70,
      layoutConfig: config.layoutConfig,
      backgroundImage: config.backgroundImage
    }).onConflictDoNothing();
    await db.insert(certificateTemplates).values({
      adminId: 142,
      enabled: true,
      passingPercentage: 70,
      layoutConfig: config.layoutConfig,
      backgroundImage: config.backgroundImage
    }).onConflictDoNothing();
  }
  
  // also let's just generate a certificate for attempt 6 (userId 142, quizId 5)
  await db.insert(certificates).values({
    userId: 142,
    quizId: 5,
    certificateId: 'CERT-12345'
  }).onConflictDoNothing();
  
  console.log("Done");
  process.exit(0);
}
run().catch(console.error);
