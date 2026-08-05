import { db } from './src/db/index.ts';
import { quizzes, questions, options } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function test() {
  const result = await db.execute('SELECT constraint_name, table_name FROM information_schema.table_constraints WHERE constraint_type = \'FOREIGN KEY\';');
  console.log(result.rows);
}
test();
