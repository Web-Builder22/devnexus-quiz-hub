import { Pool } from 'pg';
const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME,
});
pool.query('ALTER TABLE users ADD COLUMN password_hash TEXT;').then(res => {
  console.log("Success");
  process.exit(0);
}).catch(console.error);
