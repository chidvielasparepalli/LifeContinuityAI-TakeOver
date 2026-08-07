const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection FAILED:', err.message);
  } else {
    console.log('Database connection SUCCESS:', res.rows[0]);
  }
  pool.end();
});
