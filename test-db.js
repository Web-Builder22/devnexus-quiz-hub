import { Pool } from 'pg';
const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME,
});
pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1;', ['users']).then(res => {
  console.log(res.rows);
  process.exit(0);
}).catch(console.error);
