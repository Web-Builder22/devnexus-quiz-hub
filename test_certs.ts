import { db } from './src/db/index.ts';
import { certificateTemplates, certificates, quizzes } from './src/db/schema.ts';

async function run() {
  const tpls = await db.select().from(certificateTemplates);
  console.log("Templates:", tpls);
  const certs = await db.select().from(certificates);
  console.log("Certs:", certs);
  const qs = await db.select().from(quizzes);
  console.log("Quizzes:", qs.map(q => ({id: q.id, title: q.title, authorId: q.authorId})));
  process.exit(0);
}
run().catch(console.error);
