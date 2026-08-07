const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.query(
  'SELECT id, user_id, token, is_used, expires_at, created_at FROM nominee_tokens ORDER BY created_at DESC',
  (err, res) => {
    if (err) {
      console.error('Error querying database:', err.message);
    } else {
      console.log('--- NOMINEE TOKENS IN DATABASE ---');
      console.table(res.rows);
    }
    pool.end();
  }
);
