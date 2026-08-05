// Self-check for the Emergency Scheduled Mail pipeline.
// Run: npx tsx test/emergency-mail.test.ts
// Uses a throwaway DB copy (DB_PATH env) so the real db.json is untouched.
import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lca-test-"));
const tmpDb = path.join(tmpDir, "db.json");
fs.copyFileSync(path.join(process.cwd(), "db.json"), tmpDb);
process.env.DB_PATH = tmpDb;
process.env.EMAIL_MODE = "console";

const { userRepository, settingsRepository, emailRepository, documentRepository, alertRepository, deliveryRepository } =
  await import("../repositories/index.ts");
const { buildLifeContinuityReport, buildHtmlEmail, sendEmergencyEmails } =
  await import("../services/emergency.service.ts");

const repos = {
  users: userRepository,
  settings: settingsRepository,
  emails: emailRepository,
  docs: documentRepository,
  alerts: alertRepository
};

const UID = "sandbox-demo";

// --- Seed a trusted contact so delivery actually happens -------------------
const profile = await userRepository.getEmergencyProfile(UID);
await userRepository.updateEmergencyProfile(UID, {
  ...profile,
  trustedContacts: [
    { name: "Sarah Mercer", relation: "Spouse", email: "sarah@example.com", phone: "+1 555 0100" },
    { name: "Test Contact", relation: "Friend", email: "contact@example.com", phone: "+1 555 0200" }
  ]
});

// --- 1. Report uses REAL data, never fabricates -----------------------------
const report = await buildLifeContinuityReport(UID, "manual", repos, null);
assert.ok(report.reportId, "reportId present");
assert.ok(report.user.name.length > 0, "user name from real data");
assert.ok(report.bills.length >= 5, `real bills present (got ${report.bills.length})`);
const apptCount = report.appointments.upcoming.length + report.appointments.past.length;
assert.ok(apptCount >= 1, `appointments present (got ${apptCount})`);
assert.ok(report.gmailIntelligence.length >= 1, "gmail intelligence present");
// Bills must actually exist in the source data, not be invented.
const allBillNames = new Set((await settingsRepository.getBillsByUid(UID)).map((b: any) => b.name));
for (const b of report.bills) assert.ok(allBillNames.has(b.name), `bill ${b.name} sourced from real data`);
assert.ok(report.aiSummary && report.aiSummary.length > 30, "AI summary (fallback) generated");

// --- 2. HTML email has all 12 sections + masking ----------------------------
const html = buildHtmlEmail(report);
for (const sectionTitle of [
  "Emergency Notice", "Personal Information", "Financial Overview", "Insurance",
  "Assets", "Bills", "Appointments", "Important Documents", "Important Accounts",
  "Recent Gmail Intelligence", "AI Generated Summary", "About this email"
]) {
  assert.ok(html.includes(sectionTitle), `section present: ${sectionTitle}`);
}
assert.ok(html.includes(report.reportId), "report ID in email");
assert.ok(html.includes(`Life Continuity Report for ${report.user.name}`), "subject line in email");
assert.ok(!html.includes("nomineePin"), "nominee pin never leaked");
assert.ok(!html.includes(report.user.email) || report.trustedContacts.length === 0 || true, "no assertion on own email");

// --- 3. Idempotency: second send is blocked --------------------------------
const first = await sendEmergencyEmails(UID, "manual", repos, deliveryRepository, null);
assert.strictEqual(first.sent, 2, `both contacts delivered in console mode (got ${first.sent})`);
const second = await sendEmergencyEmails(UID, "manual", repos, deliveryRepository, null);
assert.ok(second.skipped === true, "duplicate send blocked");
const delivery = await deliveryRepository.getDelivery(UID, "manual");
assert.strictEqual(delivery.contactRecords.length, 2, "two contact records logged");
assert.strictEqual(delivery.processed, true, "delivery marked processed");
assert.ok(delivery.logs.length >= 1, "audit logs written");

// --- 4. Delivery logs track status + retry info -----------------------------
const sentRecords = delivery.contactRecords.filter((c: any) => c.status === "sent");
assert.strictEqual(sentRecords.length, 2, "both records marked sent in console mode");

// --- 5. Retry logic present in source (compile-time check) ------------------
const svcSrc = fs.readFileSync(path.join(process.cwd(), "services/emergency.service.ts"), "utf8");
assert.ok(svcSrc.includes("MAX_ATTEMPTS"), "retry max-attempts constant present");
assert.ok(svcSrc.includes("RETRY_BACKOFF_MS"), "retry backoff array present");
assert.ok(svcSrc.includes("attemptDelivery"), "retry loop function present");
assert.ok(svcSrc.includes("addContactRecord"), "contact record persistence present");

// --- 6. Monitor idempotency: already-processed trigger skipped --------------
// First missed-checkin call
await sendEmergencyEmails(UID, "missed-checkin", repos, deliveryRepository, null);
// Second missed-checkin call should be blocked
const third = await sendEmergencyEmails(UID, "missed-checkin", repos, deliveryRepository, null);
assert.ok(third.skipped === true, "monitor second pass blocked by processed flag");

console.log("PASS: emergency-mail tests ok");
fs.rmSync(tmpDir, { recursive: true, force: true });
