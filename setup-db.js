import pg from 'pg';
import 'dotenv/config';

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const tables = [
  {
    name: 'users',
    query: `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT,
        name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  },
  {
    name: 'emergency_profiles',
    query: `
      CREATE TABLE IF NOT EXISTS emergency_profiles (
        user_id TEXT PRIMARY KEY REFERENCES users(id),
        age TEXT,
        blood_group TEXT,
        medical_info TEXT,
        nominee_name TEXT,
        nominee_email TEXT,
        nominee_phone TEXT,
        nominee_pin TEXT,
        streak_duration INTEGER,
        grace_period INTEGER,
        last_active_timestamp TIMESTAMPTZ,
        current_streak_status TEXT
      );
    `
  },
  {
    name: 'check_ins',
    query: `
      CREATE TABLE IF NOT EXISTS check_ins (
        id SERIAL PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        timestamp TIMESTAMPTZ,
        method TEXT,
        date TEXT
      );
    `
  },
  {
    name: 'check_in_stats',
    query: `
      CREATE TABLE IF NOT EXISTS check_in_stats (
        user_id TEXT PRIMARY KEY REFERENCES users(id),
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        last_check_in_date TEXT,
        status TEXT,
        latitude TEXT,
        longitude TEXT,
        battery_level TEXT,
        is_charging BOOLEAN
      );
    `
  },
  {
    name: 'check_in_settings',
    query: `
      CREATE TABLE IF NOT EXISTS check_in_settings (
        user_id TEXT PRIMARY KEY REFERENCES users(id),
        check_in_window_start TEXT,
        check_in_window_end TEXT,
        reminder_intervals_minutes INTEGER,
        grace_period_minutes INTEGER,
        senders_to_sync TEXT[],
        target_keywords TEXT[]
      );
    `
  },
  {
    name: 'check_in_events',
    query: `
      CREATE TABLE IF NOT EXISTS check_in_events (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        method TEXT,
        method_label TEXT,
        status TEXT,
        timestamp TIMESTAMPTZ DEFAULT NOW()
      );
    `
  },
  {
    name: 'security_alerts',
    query: `
      CREATE TABLE IF NOT EXISTS security_alerts (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        timestamp TIMESTAMPTZ,
        event TEXT,
        details TEXT
      );
    `
  },
  {
    name: 'nominee_tokens',
    query: `
      CREATE TABLE IF NOT EXISTS nominee_tokens (
        id SERIAL PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        token TEXT UNIQUE,
        is_used BOOLEAN DEFAULT false,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  },
  {
    name: 'emergency_deliveries',
    query: `
      CREATE TABLE IF NOT EXISTS emergency_deliveries (
        id SERIAL PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        trigger TEXT,
        report_id TEXT,
        status TEXT,
        activity_log JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  },
  {
    name: 'email_records',
    query: `
      CREATE TABLE IF NOT EXISTS email_records (
        id SERIAL PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        subject TEXT,
        sender TEXT,
        category TEXT,
        sync_date TEXT,
        extracted_summary TEXT,
        raw_snippet TEXT,
        gmail_url TEXT
      );
    `
  },
  {
    name: 'bills',
    query: `
      CREATE TABLE IF NOT EXISTS bills (
        id SERIAL PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        due_date TEXT,
        amount TEXT,
        status TEXT,
        category TEXT,
        priority TEXT,
        notes TEXT
      );
    `
  },
  {
    name: 'appointments',
    query: `
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        name TEXT,
        date TEXT,
        time TEXT,
        location TEXT,
        priority TEXT,
        category TEXT,
        notes TEXT
      );
    `
  },
  {
    name: 'sessions',
    query: `
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        device_info TEXT,
        location TEXT,
        last_active TIMESTAMPTZ
      );
    `
  },
  {
    name: 'continuity_plans',
    query: `
      CREATE TABLE IF NOT EXISTS continuity_plans (
        user_id TEXT PRIMARY KEY REFERENCES users(id),
        plan_data JSONB
      );
    `
  },
  {
    name: 'documents',
    query: `
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        file_path TEXT,
        metadata JSONB
      );
    `
  },
  {
    name: 'policy_extractions',
    query: `
      CREATE TABLE IF NOT EXISTS policy_extractions (
        id SERIAL PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        extracted_data JSONB
      );
    `
  },
  {
    name: 'nominee_access_log',
    query: `
      CREATE TABLE IF NOT EXISTS nominee_access_log (
        id SERIAL PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        nominee_email TEXT,
        accessed_at TIMESTAMPTZ DEFAULT NOW(),
        token_used TEXT
      );
    `
  }
];

async function setup() {
  try {
    await client.connect();
    console.log('Connected to the database.');
    
    for (const table of tables) {
      await client.query(table.query);
      console.log(`Table created or verified: ${table.name}`);
    }
    
    console.log('Setup complete');
  } catch (err) {
    console.error('Error setting up the database:', err);
  } finally {
    await client.end();
  }
}

setup();
