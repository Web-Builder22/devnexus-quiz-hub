const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME,
  port: 5432
});

pool.query("UPDATE users SET role = 'admin' WHERE email = 'mnomi4884@gmail.com'").then(res => {
  console.log("Updated rows:", res.rowCount);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
