import jwt from 'jsonwebtoken';
import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';

async function test() {
  await db.insert(users).values({ uid: 'admin2', email: 'admin2@test.com', role: 'admin' }).onConflictDoNothing();

  const token = jwt.sign({ uid: 'admin2', email: 'admin2@test.com' }, process.env.JWT_SECRET || 'fallback_secret');
  
  let res = await fetch('http://localhost:3000/api/v1/quizzes', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Delete Me' })
  });
  const quiz = await res.json();
  console.log('Created quiz:', quiz);

  if (quiz.id) {
    res = await fetch(`http://localhost:3000/api/v1/quizzes/${quiz.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Delete status:', res.status, await res.text());
  }
}
test();
