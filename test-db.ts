import { db } from './src/db/index.ts';
import { quizzes } from './src/db/schema.ts';
async function test() {
  const all = await db.select().from(quizzes);
  console.log(all[all.length - 1]);
  process.exit(0);
}
test();
