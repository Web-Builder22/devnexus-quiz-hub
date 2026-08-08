import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 5000, // Close idle connections quickly to avoid dead connections after container freeze
      allowExitOnIdle: true,
    });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();
export const db = drizzle(pool, { schema });

export async function initDbSchema() {
  try {
    const p = createPool();
    await p.query(`
      UPDATE quizzes SET code = UPPER(CONCAT('DEV-', SUBSTRING(MD5(RANDOM()::text), 1, 5))) WHERE code IS NULL OR code = '';
    `);
    console.log('Database schema initialized for quiz codes.');
  } catch (err) {
    console.error('Error initializing DB schema columns:', err);
  }
}
