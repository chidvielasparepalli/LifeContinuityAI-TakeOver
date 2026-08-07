const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.query(
  'SELECT user_id, last_active_timestamp, current_streak_status FROM emergency_profiles ORDER BY last_active_timestamp DESC NULLS LAST',
  (err, res) => {
    if (err) {
      console.error('Error querying database:', err.message);
    } else {
      console.log('--- EMERGENCY PROFILES STATE ---');
      console.table(res.rows);
    }
    pool.end();
  }
);
