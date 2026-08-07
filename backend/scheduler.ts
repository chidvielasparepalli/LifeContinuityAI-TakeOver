import cron from 'node-cron';
import pg from 'pg';
import 'dotenv/config';
import { checkInactivityAndAlert } from './inactivity-checker';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

cron.schedule('* * * * *', async () => {
  console.log('Scheduler tick: ' + new Date());
  try {
    const result = await pool.query(
      `SELECT user_id FROM emergency_profiles 
       WHERE last_active_timestamp IS NOT NULL`
    );
    for (const row of result.rows) {
      await checkInactivityAndAlert(row.user_id);
    }
  } catch (err: any) {
    console.error('[Scheduler] Error during tick execution:', err.message || err);
  }
});

console.log("Scheduler started");
