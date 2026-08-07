import pg from 'pg';
import crypto from 'crypto';
import 'dotenv/config';
import { Composio } from '@composio/core';

const { Pool } = pg;

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function sendNomineeAlert(userId: string, token: string) {
  try {
    // 1. Fetches nominee_name and nominee_email from emergency_profiles
    const profileRes = await pgPool.query(
      'SELECT nominee_name, nominee_email FROM emergency_profiles WHERE user_id = $1',
      [userId]
    );
    const profile = profileRes.rows[0];
    const nomineeName = profile?.nominee_name || 'Nominee';
    const nomineeEmail = profile?.nominee_email;

    if (!nomineeEmail) {
      console.warn(`[sendNomineeAlert] No nominee email configured for user: ${userId}`);
      return;
    }

    // 2. Fetches user name from users
    const userRes = await pgPool.query('SELECT name FROM users WHERE id = $1', [userId]);
    const userName = userRes.rows[0]?.name || 'User';

    // 3. Builds portal URL
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const portalUrl = `${appUrl}/nominee-portal?token=${token}`;

    const subject = `Important — Has ${userName} been heard from?`;
    const body = `Hi ${nomineeName},

This is an automated alert from Life Continuity.

${userName} has not logged into their account within their set check-in period. If something has happened and you need access to their Life Continuity information, please click below:

${portalUrl}

This link expires in 7 days. If ${userName} is fine and simply forgot to check in, please ignore this email.

— Life Continuity Team`;

    // 4. Uses existing Composio Gmail integration to send email
    let sentViaComposio = false;
    if (process.env.COMPOSIO_API_KEY) {
      try {
        const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });
        console.log(`[Composio Gmail] Sending Nominee Alert email via Composio...`);
        await composio.tools.execute('GMAIL_SEND_EMAIL', {
          userId: userId,
          arguments: {
            to: nomineeEmail,
            recipient_email: nomineeEmail,
            subject: subject,
            messageText: body
          },
          dangerouslySkipVersionCheck: true
        });
        sentViaComposio = true;
        console.log(`[Composio Gmail] Nominee Alert successfully sent to: ${nomineeEmail}`);
      } catch (composioErr: any) {
        console.warn(`[Composio Gmail] Send failed: ${composioErr.message || composioErr}. Falling back to standard transport.`);
      }
    }

    if (!sentViaComposio) {
      const emailMode = process.env.EMAIL_MODE || 'console';
      if (emailMode === "resend") {
        try {
          const key = process.env.RESEND_API_KEY;
          if (!key) throw new Error("RESEND_API_KEY missing");
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${key}`
            },
            body: JSON.stringify({
              from: process.env.RESEND_FROM_EMAIL || "LifeContinuity <onboarding@resend.dev>",
              to: [nomineeEmail],
              subject,
              text: body
            })
          });
        } catch (resendErr: any) {
          console.warn(`[EMAIL] Resend failed: ${resendErr.message || resendErr}. Logged to console.`);
        }
      } else {
        console.log(`\n--- AUTOMATED EMAIL SEND (CONSOLE) ---\nTO: ${nomineeEmail}\nSubject: ${subject}\n\n${body}\n--------------------------------------\n`);
      }
    }

    // 5. After sending, INSERT into emergency_deliveries
    await pgPool.query(
      `INSERT INTO emergency_deliveries (user_id, trigger, status, created_at)
       VALUES ($1, 'missed-checkin', 'sent', NOW())`,
      [userId]
    );

    // 6. Console.log
    console.log("Nominee alert email sent to: " + nomineeEmail);
  } catch (err: any) {
    console.error(`[sendNomineeAlert] Error:`, err.message || err);
  }
}

export async function checkInactivityAndAlert(userId: string) {
  try {
    const query = `
      SELECT last_active_timestamp, streak_duration, grace_period, nominee_name, nominee_email, current_streak_status
      FROM emergency_profiles 
      WHERE user_id = $1
    `;
    const profileRes = await pgPool.query(query, [userId]);
    const profile = profileRes.rows[0];

    if (!profile) {
      return;
    }

    const { last_active_timestamp, streak_duration, grace_period, current_streak_status } = profile;

    if (!last_active_timestamp) {
      return;
    }

    const gapMinutes = (Date.now() - new Date(last_active_timestamp).getTime()) / 1000 / 60;

    let threshold = Number(streak_duration || 0) + Number(grace_period || 0);
    if (process.env.TEST_MODE === 'true') {
      threshold = 2;
    }

    if (gapMinutes > threshold) {
      const userRes = await pgPool.query('SELECT name, email FROM users WHERE id = $1', [userId]);
      const user = userRes.rows[0];
      if (!user) return;

      const userEmail = user.email || 'user@example.com';
      const userName = user.name || 'User';

      // Step 1: User inactivity has just exceeded threshold, and they are in Safe/null status.
      // Transition them to Awaiting Confirmation and send check-in confirmation email to user.
      if (current_streak_status !== 'Awaiting Confirmation' && current_streak_status !== 'Emergency Suspected') {
        await pgPool.query(
          `UPDATE emergency_profiles SET current_streak_status = 'Awaiting Confirmation' WHERE user_id = $1`,
          [userId]
        );

        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        const confirmationLink = `${appUrl}/api/safety/confirm/${userId}`;
        const subject = `Check-In Required`;
        const bodyText = `Hi ${userName},

This is a Check-In Required alert from Life Continuity.

We noticed that you have not checked in within your set period. If you are safe, please click the link below to confirm:
${confirmationLink}

IMPORTANT: If you do not check in by clicking the link above, your designated nominee (${profile.nominee_name || 'Nominee'}) will be sent an emergency notification and will be granted access to your Life Continuity profile.

— Life Continuity Team`;

        let sentViaComposio = false;
        if (process.env.COMPOSIO_API_KEY) {
          try {
            const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });
            console.log(`[Composio Gmail] Sending User Safety Check-In email via Composio...`);
            await composio.tools.execute('GMAIL_SEND_EMAIL', {
              userId: userId,
              arguments: {
                to: userEmail,
                recipient_email: userEmail,
                subject: subject,
                messageText: bodyText
              },
              dangerouslySkipVersionCheck: true
            });
            sentViaComposio = true;
            console.log(`[Composio Gmail] User safety check-in successfully sent to: ${userEmail}`);
          } catch (composioErr: any) {
            console.warn(`[Composio Gmail] Send failed: ${composioErr.message || composioErr}. Falling back to standard transport.`);
          }
        }

        if (!sentViaComposio) {
          const emailMode = process.env.EMAIL_MODE || 'console';
          if (emailMode === "resend") {
            try {
              const key = process.env.RESEND_API_KEY;
              if (!key) throw new Error("RESEND_API_KEY missing");
              await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${key}`
                },
                body: JSON.stringify({
                  from: process.env.RESEND_FROM_EMAIL || "LifeContinuity <onboarding@resend.dev>",
                  to: [userEmail],
                  subject,
                  text: bodyText
                })
              });
            } catch (e: any) {
              console.warn(`[EMAIL] Resend user confirmation failed: ${e.message || e}`);
            }
          } else {
            console.log(`\n--- USER SAFETY CONFIRMATION EMAIL (CONSOLE) ---\nTO: ${userEmail}\nSubject: ${subject}\n\n${bodyText}\n------------------------------------------------\n`);
          }
        }

        // Insert into security_alerts
        await pgPool.query(
          `INSERT INTO security_alerts (id, user_id, timestamp, event, details)
           VALUES ($1, $2, NOW(), 'Confirmation Email Sent', $3)`,
          ["alert-" + Math.random().toString(36).substr(2, 9), userId, `Sent check-in confirmation email to ${userEmail}.`]
        );

        console.log("User safety confirmation email sent to: " + userEmail);
      } 
      // Step 2: Already in Awaiting Confirmation status. Verify if confirmation window has expired.
      else if (current_streak_status === 'Awaiting Confirmation') {
        const alertRes = await pgPool.query(
          `SELECT timestamp FROM security_alerts 
           WHERE user_id = $1 AND event = 'Confirmation Email Sent' 
           ORDER BY timestamp DESC LIMIT 1`,
          [userId]
        );
        let confirmationSentTime = 0;
        if (alertRes.rows.length > 0) {
          confirmationSentTime = new Date(alertRes.rows[0].timestamp).getTime();
        }

        const confirmationWindowMinutes = process.env.TEST_MODE === 'true' ? 2 : (12 * 60); // 2 mins in test mode, 12 hours in production
        const elapsedMinutes = (Date.now() - confirmationSentTime) / 1000 / 60;

        if (elapsedMinutes > confirmationWindowMinutes) {
          const tokenQuery = `
            SELECT * FROM nominee_tokens 
            WHERE user_id = $1 
            AND is_used = false 
            AND expires_at > NOW()
          `;
          const tokenRes = await pgPool.query(tokenQuery, [userId]);
          const activeToken = tokenRes.rows[0];

          if (activeToken) {
            return;
          }

          // Transition status to Emergency Suspected
          await pgPool.query(
            `UPDATE emergency_profiles SET current_streak_status = 'Emergency Suspected' WHERE user_id = $1`,
            [userId]
          );

          const token = crypto.randomBytes(32).toString('hex');
          const insertTokenQuery = `
            INSERT INTO nominee_tokens (user_id, token, is_used, expires_at, created_at)
            VALUES ($1, $2, false, NOW() + INTERVAL '7 days', NOW())
          `;
          await pgPool.query(insertTokenQuery, [userId, token]);

          // Log ALERT TRIGGERED BEFORE sending mail
          console.log("ALERT TRIGGERED for userId: " + userId);
          await sendNomineeAlert(userId, token);
        }
      }
    }
  } catch (err: any) {
    console.error(`[checkInactivityAndAlert] Error in backend/inactivity-checker.ts:`, err.message || err);
  }
}
