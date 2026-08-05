import { db } from './src/db/index.ts';
import { quizzes } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function testDelete() {
  try {
    const all = await db.select().from(quizzes);
    console.log("All quizzes:", all.map(q => q.id));
    if (all.length > 0) {
       console.log("Attempting to delete quiz", all[0].id);
       await db.delete(quizzes).where(eq(quizzes.id, all[0].id));
       console.log("Delete successful");
    }
  } catch (e) {
    console.error("Delete failed:", e);
  }
}

testDelete();
