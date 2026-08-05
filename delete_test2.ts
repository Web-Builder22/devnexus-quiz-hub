import { db } from './src/db/index.ts';
import { quizzes, questions, options, attempts, answers } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function testDelete() {
  try {
    const all = await db.select().from(quizzes);
    console.log("All quizzes:", all.map(q => q.id));
    if (all.length > 0) {
       console.log("Attempting to delete quiz", all[all.length - 1].id);
       await db.delete(quizzes).where(eq(quizzes.id, all[all.length - 1].id));
       console.log("Delete successful");
    }
  } catch (e) {
    console.error("Delete failed:", e);
  }
}

testDelete();
