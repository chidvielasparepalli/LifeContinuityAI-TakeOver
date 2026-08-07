import fs from 'fs';
import path from 'path';
import pg from 'pg';
import 'dotenv/config';

const { Client } = pg;

const dbPath = path.join(process.cwd(), 'db.json');
if (!fs.existsSync(dbPath)) {
  console.error('db.json not found!');
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function migrateUsers() {
  const users = db.users || {};
  for (const [uid, user] of Object.entries(users)) {
    const query = `
      INSERT INTO users (id, email, name, created_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO NOTHING
    `;
    await client.query(query, [
      user.uid || uid,
      user.email,
      user.name,
      user.createdAt ? new Date(user.createdAt) : new Date()
    ]);
  }
  console.log('Migrated: users');
}

async function migrateEmergencyProfiles() {
  const profiles = db.emergencyProfiles || {};
  for (const [userId, profile] of Object.entries(profiles)) {
    const query = `
      INSERT INTO emergency_profiles (
        user_id, age, blood_group, medical_info, nominee_name, nominee_email,
        nominee_phone, nominee_pin, streak_duration, grace_period,
        last_active_timestamp, current_streak_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (user_id) DO NOTHING
    `;
    
    const nomineeName = profile.emergencyNomineeName || profile.nomineeName || null;
    const nomineeEmail = profile.emergencyNomineeEmail || null;
    const nomineePhone = profile.nomineePhone || null;
    const nomineePin = profile.nomineePin || null;
    const lastActive = profile.lastActiveTimestamp ? new Date(Number(profile.lastActiveTimestamp)) : null;
    
    await client.query(query, [
      profile.uid || userId,
      profile.age ? String(profile.age) : null,
      profile.bloodGroup || null,
      profile.medicalInfo || null,
      nomineeName,
      nomineeEmail,
      nomineePhone,
      nomineePin,
      profile.streakDuration !== undefined ? Number(profile.streakDuration) : null,
      profile.gracePeriod !== undefined ? Number(profile.gracePeriod) : null,
      lastActive,
      profile.currentStreakStatus || null
    ]);
  }
  console.log('Migrated: emergencyProfiles');
}

async function migrateCheckIns() {
  const checkIns = db.checkIns || {};
  for (const [userId, datesObj] of Object.entries(checkIns)) {
    for (const [dateKey, checkIn] of Object.entries(datesObj)) {
      const query = `
        INSERT INTO check_ins (user_id, timestamp, method, date)
        VALUES ($1, $2, $3, $4)
      `;
      await client.query(query, [
        userId,
        checkIn.timestamp ? new Date(checkIn.timestamp) : null,
        checkIn.method || null,
        checkIn.date || dateKey
      ]);
    }
  }
  console.log('Migrated: checkIns');
}

async function migrateCheckInStats() {
  const stats = db.checkInStats || {};
  for (const [userId, stat] of Object.entries(stats)) {
    const query = `
      INSERT INTO check_in_stats (
        user_id, current_streak, longest_streak, last_check_in_date, status,
        latitude, longitude, battery_level, is_charging
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (user_id) DO NOTHING
    `;
    const loc = stat.lastKnownLocation || {};
    await client.query(query, [
      stat.uid || userId,
      stat.currentStreak !== undefined ? Number(stat.currentStreak) : 0,
      stat.longestStreak !== undefined ? Number(stat.longestStreak) : 0,
      stat.lastCheckInDate || null,
      stat.status || null,
      loc.latitude !== undefined ? String(loc.latitude) : null,
      loc.longitude !== undefined ? String(loc.longitude) : null,
      loc.batteryLevel !== undefined ? String(loc.batteryLevel) : null,
      loc.isCharging !== undefined ? Boolean(loc.isCharging) : null
    ]);
  }
  console.log('Migrated: checkInStats');
}

async function migrateCheckInSettings() {
  const settings = db.checkInSettings || {};
  for (const [userId, setting] of Object.entries(settings)) {
    const query = `
      INSERT INTO check_in_settings (
        user_id, check_in_window_start, check_in_window_end,
        reminder_intervals_minutes, grace_period_minutes,
        senders_to_sync, target_keywords
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id) DO NOTHING
    `;
    
    const reminderInt = (setting.reminderIntervals && setting.reminderIntervals.length > 0)
      ? Number(setting.reminderIntervals[0])
      : null;
      
    let sendersArray = [];
    if (Array.isArray(setting.sendersToSync)) {
      sendersArray = setting.sendersToSync;
    } else if (typeof setting.sendersToSync === 'string') {
      sendersArray = setting.sendersToSync.split(',').map(s => s.trim()).filter(Boolean);
    }
    
    let keywordsArray = [];
    if (Array.isArray(setting.targetKeywords)) {
      keywordsArray = setting.targetKeywords;
    } else if (typeof setting.targetKeywords === 'string') {
      keywordsArray = setting.targetKeywords.split(',').map(k => k.trim()).filter(Boolean);
    }
    
    await client.query(query, [
      setting.uid || userId,
      setting.checkInWindowStart || null,
      setting.checkInWindowEnd || null,
      reminderInt,
      setting.gracePeriodMinutes !== undefined ? Number(setting.gracePeriodMinutes) : null,
      sendersArray,
      keywordsArray
    ]);
  }
  console.log('Migrated: checkInSettings');
}

async function migrateCheckInEvents() {
  const events = db.checkInEvents || [];
  for (const event of events) {
    const query = `
      INSERT INTO check_in_events (id, user_id, method, method_label, status, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO NOTHING
    `;
    await client.query(query, [
      event.id,
      event.uid,
      event.method || null,
      event.methodLabel || null,
      event.status || null,
      event.timestamp ? new Date(event.timestamp) : new Date()
    ]);
  }
  console.log('Migrated: checkInEvents');
}

async function migrateSecurityAlerts() {
  const alerts = db.securityAlerts || [];
  for (const alert of alerts) {
    const query = `
      INSERT INTO security_alerts (id, user_id, timestamp, event, details)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO NOTHING
    `;
    await client.query(query, [
      alert.id,
      alert.uid,
      alert.timestamp ? new Date(alert.timestamp) : null,
      alert.event || null,
      alert.details || null
    ]);
  }
  console.log('Migrated: securityAlerts');
}

async function migrateEmergencyDeliveries() {
  const deliveries = db.emergencyDeliveries || [];
  for (const delivery of deliveries) {
    const query = `
      INSERT INTO emergency_deliveries (user_id, trigger, report_id, status, activity_log, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    const status = delivery.processed ? 'Processed' : 'Pending';
    const activityLog = {
      logs: delivery.logs || [],
      contactRecords: delivery.contactRecords || [],
      contactCount: delivery.contactCount || 0,
      stringId: delivery.id
    };
    await client.query(query, [
      delivery.uid,
      delivery.trigger || null,
      delivery.reportId || null,
      status,
      JSON.stringify(activityLog),
      delivery.createdAt ? new Date(delivery.createdAt) : new Date()
    ]);
  }
  console.log('Migrated: emergencyDeliveries');
}

async function migrateEmailRecords() {
  const emails = db.emailRecords || [];
  for (const email of emails) {
    const query = `
      INSERT INTO email_records (
        user_id, subject, sender, category, sync_date, extracted_summary, raw_snippet, gmail_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    await client.query(query, [
      email.uid,
      email.subject || null,
      email.sender || null,
      email.category || null,
      email.date || null,
      email.extractedSummary || null,
      email.rawSnippet || null,
      email.gmailUrl || null
    ]);
  }
  console.log('Migrated: emailRecords');
}

async function migrateBills() {
  const bills = db.bills || [];
  for (const bill of bills) {
    const query = `
      INSERT INTO bills (user_id, due_date, amount, status, category, priority, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    await client.query(query, [
      bill.uid,
      bill.dueDate || null,
      bill.amount !== undefined ? String(bill.amount) : null,
      bill.status || null,
      bill.category || null,
      bill.priority || null,
      bill.notes || null
    ]);
  }
  console.log('Migrated: bills');
}

async function migrateAppointments() {
  const appts = db.appointments || [];
  for (const appt of appts) {
    const query = `
      INSERT INTO appointments (user_id, name, date, time, location, priority, category, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    await client.query(query, [
      appt.uid,
      appt.name || null,
      appt.date || null,
      appt.time || null,
      appt.location || null,
      appt.priority || null,
      appt.category || null,
      appt.notes || null
    ]);
  }
  console.log('Migrated: appointments');
}

async function migrateSessions() {
  const sessions = db.sessions || [];
  for (const sess of sessions) {
    const query = `
      INSERT INTO sessions (user_id, device_info, location, last_active)
      VALUES ($1, $2, $3, $4)
    `;
    await client.query(query, [
      sess.uid,
      sess.device || null,
      sess.location || null,
      sess.lastActive ? new Date(sess.lastActive) : null
    ]);
  }
  console.log('Migrated: sessions');
}

async function migrateNomineeTokens() {
  const tokens = db.nomineeTokens || [];
  for (const tok of tokens) {
    const query = `
      INSERT INTO nominee_tokens (user_id, token, is_used, expires_at, created_at)
      VALUES ($1, $2, $3, $4, $5)
    `;
    await client.query(query, [
      tok.userId || tok.uid,
      tok.token,
      tok.isUsed !== undefined ? Boolean(tok.isUsed) : false,
      tok.expiresAt ? new Date(tok.expiresAt) : null,
      tok.createdAt ? new Date(tok.createdAt) : new Date()
    ]);
  }
  console.log('Migrated: nomineeTokens');
}

async function migrateDocuments() {
  const docs = db.documents || [];
  for (const doc of docs) {
    const query = `
      INSERT INTO documents (user_id, file_path, metadata)
      VALUES ($1, $2, $3)
    `;
    await client.query(query, [
      doc.uid || doc.userId,
      doc.filePath || doc.file_path,
      JSON.stringify(doc.metadata || {})
    ]);
  }
  console.log('Migrated: documents');
}

async function migratePolicyExtractions() {
  const extractions = db.policyExtractions || [];
  for (const ext of extractions) {
    const query = `
      INSERT INTO policy_extractions (user_id, extracted_data)
      VALUES ($1, $2)
    `;
    await client.query(query, [
      ext.uid || ext.userId,
      JSON.stringify(ext.extractedData || ext.extracted_data || {})
    ]);
  }
  console.log('Migrated: policyExtractions');
}

async function migrateContinuityPlans() {
  const plans = db.continuityPlans || {};
  for (const [userId, plan] of Object.entries(plans)) {
    const query = `
      INSERT INTO continuity_plans (user_id, plan_data)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO NOTHING
    `;
    await client.query(query, [
      userId,
      JSON.stringify(plan || {})
    ]);
  }
  console.log('Migrated: continuityPlans');
}

async function run() {
  try {
    await client.connect();
    console.log('Connected to target database.');

    await migrateUsers();
    await migrateEmergencyProfiles();
    await migrateCheckIns();
    await migrateCheckInStats();
    await migrateCheckInSettings();
    await migrateCheckInEvents();
    await migrateSecurityAlerts();
    await migrateEmergencyDeliveries();
    await migrateEmailRecords();
    await migrateBills();
    await migrateAppointments();
    await migrateSessions();
    await migrateNomineeTokens();
    await migrateDocuments();
    await migratePolicyExtractions();
    await migrateContinuityPlans();

    console.log('FULL MIGRATION COMPLETE');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

run();
