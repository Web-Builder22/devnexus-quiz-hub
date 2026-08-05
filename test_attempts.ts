import { db } from './src/db/index.ts';
import { attempts, answers, questions } from './src/db/schema.ts';

async function run() {
  const atts = await db.select().from(attempts);
  console.log("Attempts:", atts);
  const qs = await db.select().from(questions);
  console.log("Questions:", qs.map(q => ({id: q.id, quizId: q.quizId, points: q.points})));
  process.exit(0);
}
run().catch(console.error);
