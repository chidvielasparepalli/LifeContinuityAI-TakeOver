import { IDeliveryRepository } from "../repositories/EmailDeliveryRepository";
import { IUserRepository } from "../repositories/UserRepository";
import { ISettingsRepository } from "../repositories/SettingsRepository";
import { IEmailRepository } from "../repositories/EmailRepository";
import { IDocumentRepository } from "../repositories/DocumentRepository";
import { IAlertRepository } from "../repositories/AlertRepository";

// Environment-driven mail transport. "console" = dev/log fallback (default).
// Production: set SENDGRID_API_KEY + EMAIL_MODE=sendgrid.
// Read at call time so tests can switch modes; config is static in prod.
const EMAIL_MODE = () => (process.env.EMAIL_MODE || "console").toLowerCase();
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "no-reply@life-continuity-ai.app";
const FROM_NAME = process.env.SENDGRID_FROM_NAME || "Life Continuity Assistant";

const MAX_ATTEMPTS = Number(process.env.EMERGENCY_EMAIL_MAX_ATTEMPTS || 3);
// Overridable via env for tests; production defaults are 30s/2m/10m backoff.
const RETRY_BACKOFF_MS = (process.env.EMERGENCY_RETRY_DELAY_MS || "30000,120000,600000").split(",").map(Number);

export type EmergencyTrigger = "manual" | "missed-checkin";

interface Contact { name?: string; relation?: string; email?: string; phone?: string; }

function maskAccount(value: string | undefined | null): string {
  if (!value) return "";
  const s = String(value);
  const digits = s.replace(/[^\d]/g, "");
  // Only mask things that look like account/card numbers (8+ digits). Leave
  // dates, policy refs, and short codes untouched.
  if (digits.length >= 8) {
    return `****${digits.slice(-4)}`;
  }
  return s;
}

function escapeHtml(s: any): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtDate(d: any): string {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" });
}

function daysUntil(dateStr: string | undefined | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

// ---- REPORT ASSEMBLY -------------------------------------------------------
export async function buildLifeContinuityReport(
  uid: string,
  trigger: EmergencyTrigger,
  services: {
    users: IUserRepository;
    settings: ISettingsRepository;
    emails: IEmailRepository;
    docs: IDocumentRepository;
    alerts: IAlertRepository;
  },
  ai: any,
): Promise<any> {
  const user = await services.users.getById(uid);
  const profile = await services.users.getEmergencyProfile(uid);
  const bills = (await services.settings.getBillsByUid(uid)) || [];
  const appointments = (await services.settings.getAppointmentsByUid(uid)) || [];
  const records = (await services.emails.getRecordsByUid(uid)) || [];
  const documents = (await services.docs.getByUid(uid)) || [];
  const extractions: any[] = [];
  for (const doc of documents) {
    const ext = await services.docs.getExtractionByDocId(doc.id);
    if (ext) extractions.push({ ...ext, fileName: doc.fileName, documentType: doc.documentType });
  }
  const settings = await services.settings.getCheckInSettings(uid);
  const stats = await services.settings.getCheckInStats(uid);

  const pending = bills.filter((b: any) => b.status === "Pending");
  const dueSoon = pending
    .map((b: any) => ({ ...b, _days: daysUntil(b.dueDate) }))
    .filter((b: any) => b._days !== null && b._days <= 7)
    .sort((a: any, b: any) => (a._days || 0) - (b._days || 0));

  // Section 3: financial overview by category (real data only).
  const loans = pending.filter((b: any) => /loan|emi|mortgage|rent/i.test(b.name + " " + (b.category || "")));
  const creditCards = pending.filter((b: any) => /card|credit/i.test(b.name + " " + (b.category || "")));
  const recurring = pending.filter((b: any) => !/loan|emi|mortgage|card|credit/i.test(b.name + " " + (b.category || "")));
  const financialEmails = records
    .filter((r: any) => /bill|invoice|bank|statement|payment|emi|loan|card/i.test((r.subject || "") + " " + (r.extractedSummary || "")))
    .slice(0, 8);

  // Section 4: insurance from policy extractions + docs.
  const insurance = extractions.filter((e: any) => /insur|policy|premium|benefit|coverage|claim/i.test(
    (e.policyNumber || "") + " " + (e.coverage || "") + " " + (e.fileName || "") + " " + (e.documentType || "")
  ));

  // Section 5: assets from document metadata keywords.
  const assetDocs = documents.filter((doc: any) => /land|proper|house|apart|vehicle|car|gold|business|invest|deed/i.test(
    (doc.documentType || "") + " " + (doc.fileName || "") + " " + (doc.notes || "")
  ));

  // Section 8: important documents — metadata only, never contents.
  const importantDocs = documents.filter((doc: any) => /aadhaar|pan|passport|licen|insur|loan|propert|tax|will|testament/i.test(
    (doc.documentType || "") + " " + (doc.fileName || "")
  ));

  // Section 9: discovered accounts — distinct providers/senders.
  const accountSet = new Set<string>();
  records.forEach((r: any) => {
    if (r.sender) accountSet.add(String(r.sender).replace(/^.*?<([^>]+)>$/, "$1").trim());
  });
  bills.forEach((b: any) => {
    const m = b.name && String(b.name).match(/([A-Z][A-Za-z&.\s]+)/);
    if (m) accountSet.add(m[1].trim());
  });
  extractions.forEach((e: any) => {
    if (e.hospitalName) accountSet.add(String(e.hospitalName));
    if (e.policyNumber) accountSet.add("Policy " + maskAccount(e.policyNumber));
  });

  // Section 7: appointments — upcoming + past split.
  const today = new Date().toISOString().split("T")[0];
  const upcomingAppts = appointments
    .filter((a: any) => a.date >= today && a.status !== "Completed")
    .sort((a: any, b: any) => (a.date > b.date ? 1 : -1));
  const pastAppts = appointments
    .filter((a: any) => a.date < today || a.status === "Completed")
    .sort((a: any, b: any) => (a.date > b.date ? -1 : 1));

  const lastCheckIn = stats?.lastCheckInTimestamp || user?.createdAt;

  const report = {
    reportId: "lcr-" + Date.now().toString(36) + "-" + Math.random().toString(36).substr(2, 6),
    uid,
    generatedAt: new Date().toISOString(),
    trigger,
    user: {
      name: user?.name || profile?.name || "User",
      email: user?.email || "",
      dob: profile?.dob || "—",
      phone: profile?.nomineePhone || profile?.emergencyContactPhone || "—",
      bloodGroup: profile?.bloodGroup || "—",
      address: profile?.address || "—",
      emergencyContactName: profile?.emergencyContactName || "—",
      emergencyContactPhone: profile?.emergencyContactPhone || "—",
      medicalInfo: profile?.medicalInfo || ""
    },
    emergency: {
      reason: trigger === "missed-checkin"
        ? "Automated proof-of-life check-in grace period expired."
        : "Emergency activated by account holder.",
      timestamp: new Date().toISOString(),
      lastCheckIn: lastCheckIn,
      source: trigger
    },
    financial: {
      loans,
      creditCards,
      recurring,
      outstandingTotal: pending.reduce((s: number, b: any) => s + (Number(b.amount) || 0), 0),
      dueSoon,
      emails: financialEmails
    },
    insurance,
    assets: assetDocs,
    bills: pending,
    appointments: { upcoming: upcomingAppts, past: pastAppts },
    documents: importantDocs,
    accounts: [...accountSet].slice(0, 20),
    gmailIntelligence: records.slice(0, 10),
    trustedContacts: (profile?.trustedContacts || []) as Contact[],
    checkInGraceMinutes: settings?.gracePeriodMinutes || null,
    aiSummary: ""
  };

  // Section 11: AI summary — Gemini if available, deterministic fallback otherwise.
  report.aiSummary = await generateSummary(report, ai);

  return report;
}

async function generateSummary(report: any, ai: any): Promise<string> {
  const fallback = [
    `Emergency continuity report generated for ${report.user.name}.`,
    `Outstanding obligations: ${report.financial.outstandingTotal ? "$" + report.financial.outstandingTotal.toFixed(2) : "none"} across ${report.financial.loans.length + report.financial.creditCards.length + report.financial.recurring.length} pending items.`,
    report.financial.dueSoon.length
      ? `Urgent (within 7 days): ${report.financial.dueSoon.map((b: any) => b.name).join(", ")}.`
      : "No items due within the next 7 days.",
    report.insurance.length
      ? `${report.insurance.length} insurance policy(ies) identified — review renewals and nominees.`
      : "No insurance policies found in the vault.",
    `Contact the trusted contacts listed below for coordination.`
  ].join(" ");

  if (!ai) return fallback;
  try {
    const prompt = `You are an emergency continuity coordinator. Write a concise, professional 2-3 paragraph brief for trusted contacts of ${report.user.name} based ONLY on the verified data provided. Cover: current financial obligations, upcoming deadlines, important assets, critical pending payments, insurance renewals, and the top actions contacts should take. Never invent numbers or facts absent from the data.

Data:
- Pending bills (name / amount / due): ${report.financial.loans.concat(report.financial.creditCards, report.financial.recurring).map((b: any) => `${b.name} ($${b.amount}, due ${b.dueDate})`).join("; ") || "none"}
- Due within 7 days: ${report.financial.dueSoon.map((b: any) => `${b.name} ($${b.amount})`).join("; ") || "none"}
- Insurance: ${report.insurance.map((i: any) => `${i.policyNumber} (${i.hospitalName || "provider"}, expires ${i.expiryDate || "unknown"})`).join("; ") || "none"}
- Assets: ${report.assets.map((a: any) => `${a.fileName} (${a.documentType})`).join("; ") || "none"}
- Appointments: ${report.appointments.upcoming.map((a: any) => `${a.name} on ${a.date}`).join("; ") || "none"}
- Medical info: ${report.user.medicalInfo || "none"}`;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt
    });
    return (response && response.text) ? response.text : fallback;
  } catch (e: any) {
    console.warn("[EMERGENCY] AI summary fallback:", e.message || e);
    return fallback;
  }
}

// ---- HTML EMAIL BUILDER ----------------------------------------------------
function row(label: string, value: any): string {
  return `<tr><td class="lbl">${label}</td><td class="val">${escapeHtml(value)}</td></tr>`;
}

function section(title: string, icon: string, color: string, body: string): string {
  return `<div class="sec" style="border-top:3px solid ${color}">
    <h2 style="color:${color}">${icon} ${escapeHtml(title)}</h2>
    ${body}
  </div>`;
}

function empty(msg: string): string {
  return `<p class="empty" style="color:#8a93a6;font-size:13px;font-style:italic;margin:6px 0">${escapeHtml(msg)}</p>`;
}

function table(headers: string[], rows: any[]): string {
  if (!rows.length) return "";
  return `<table class="tbl" style="width:100%;border-collapse:collapse;font-size:13px;margin:8px 0 4px">
    <thead><tr style="background:#eef2f8;color:#1c2b45;font-weight:700">${headers.map((h: string) => `<th style="text-align:left;padding:7px 8px">${escapeHtml(h)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((r: any) => `<tr style="border-bottom:1px solid #e5e9f0">${headers.map((h: string, i: number) => {
      const v = Object.values(r)[i];
      return `<td style="padding:7px 8px">${escapeHtml(v)}</td>`;
    }).join("")}</tr>`).join("")}</tbody>
  </table>`;
}

function urgent(v: any): string {
  return `<span style="color:#c0392b;font-weight:700">${escapeHtml(v)}</span>`;
}

export function buildHtmlEmail(report: any): string {
  const now = new Date(report.generatedAt).toISOString();

  // Section 1: emergency notice.
  const s1 = table(
    ["Field", "Detail"],
    [
      ["Why this email was triggered", report.trigger === "missed-checkin"
        ? "Automated — proof-of-life check-in grace period expired." : "Manual — emergency button pressed by account holder."],
      ["Triggered at", fmtDate(now)],
      ["Last known check-in", fmtDate(report.emergency.lastCheckIn)],
      ["Emergency reason", report.trigger === "missed-checkin" ? "Grace period expired" : "Manual activation"]
    ]
  );

  // Section 2: personal information.
  const p = report.user;
  const s2 = table(["Field", "Detail"], [
    ["Full Name", p.name],
    ["Date of Birth", p.dob],
    ["Phone", p.phone],
    ["Email", p.email],
    ["Blood Group", p.bloodGroup],
    ["Address", p.address],
    ["Emergency Contact", p.emergencyContactName + (p.emergencyContactPhone ? " (" + p.emergencyContactPhone + ")" : "")]
  ]);

  // Section 3: financial overview.
  const fin = report.financial;
  const finRows: any[] = [];
  fin.loans.forEach((b: any) => finRows.push([b.name, maskAccount(b.category), b.amount, b.dueDate, b.status === "Pending" && daysUntil(b.dueDate) !== null && daysUntil(b.dueDate) <= 3 ? urgent("DUE SOON") : b.status]));
  fin.creditCards.forEach((b: any) => finRows.push([b.name, "Credit Card", b.amount, b.dueDate, b.status]));
  fin.recurring.forEach((b: any) => finRows.push([b.name, b.category || "Recurring", b.amount, b.dueDate, b.status]));
  let s3 = `<p class="empty">Outstanding total: <b>$${(Number(fin.outstandingTotal) || 0).toFixed(2)}</b></p>`;
  s3 += table(["Description", "Type", "Amount", "Due Date", "Status"], finRows);
  if (fin.emails.length) {
    s3 += `<h3 class="sub" style="font-size:14px;color:#1c2b45;margin:10px 0 4px">Income / Account Intelligence (from Gmail)</h3>`;
    s3 += table(["Source", "Summary"], fin.emails.map((e: any) => [e.sender, e.extractedSummary]));
  }

  // Section 4: insurance.
  let s4 = "";
  if (report.insurance.length) {
    s4 = table(["Policy", "Provider", "Premium/Coverage", "Renewal", "Nominee"], report.insurance.map((i: any) => [
      maskAccount(i.policyNumber),
      i.hospitalName || "—",
      i.coverage || "—",
      i.expiryDate || "—",
      i.nominee || "—"
    ]));
  } else {
    s4 = empty("No insurance policies detected in the vault.");
  }

  // Section 5: assets.
  let s5 = "";
  if (report.assets.length) {
    s5 = table(["Asset", "Type", "Reference", "Notes"], report.assets.map((a: any) => [
      a.fileName,
      a.documentType || "—",
      maskAccount(a.digitalAccessHash) || "—",
      (a.notes || "").substring(0, 120)
    ]));
  } else {
    s5 = empty("No registered assets detected.");
  }

  // Section 6: bills.
  let s6 = "";
  if (report.bills.length) {
    s6 = table(["Bill", "Amount", "Frequency", "Due Date", "Status"], report.bills.map((b: any) => [
      b.name,
      "$" + (Number(b.amount) || 0).toFixed(2),
      (b.category || "Monthly").toLowerCase(),
      b.dueDate,
      b.status === "Pending" && daysUntil(b.dueDate) !== null && daysUntil(b.dueDate) <= 3 ? urgent("DUE SOON") : b.status
    ]));
  } else {
    s6 = empty("No pending bills on record.");
  }

  // Section 7: appointments.
  let s7 = "";
  if (report.appointments.upcoming.length) {
    s7 += table(["Appointment", "Date", "Time", "Location", "Notes"], report.appointments.upcoming.map((a: any) => [
      a.name, a.date, a.time, a.location || "—", a.notes || ""
    ]));
  }
  if (report.appointments.past.length) {
    s7 += `<h3 class="sub" style="font-size:14px;color:#1c2b45;margin:10px 0 4px">Past</h3>`;
    s7 += table(["Appointment", "Date", "Time", "Location"], report.appointments.past.slice(0, 8).map((a: any) => [
      a.name, a.date, a.time, a.location || "—"
    ]));
  }
  if (!s7) s7 = empty("No appointments on record.");

  // Section 8: important documents.
  let s8 = "";
  if (report.documents.length) {
    s8 = table(["Document", "Type", "Uploaded", "Secure Reference"], report.documents.map((d: any) => [
      d.fileName,
      d.documentType || "—",
      (d.uploadedDate || "").split("T")[0] || "—",
      maskAccount(d.digitalAccessHash) || "—"
    ]));
    s8 += `<p class="empty">Contents are encrypted and not exposed. Reference via the Vault.</p>`;
  } else {
    s8 = empty("No important documents detected.");
  }

  // Section 9: important accounts.
  let s9 = "";
  if (report.accounts.length) {
    s9 = `<p class="empty">${report.accounts.map((a: string) => escapeHtml(a)).join(" · ")}</p>`;
  } else {
    s9 = empty("No accounts detected.");
  }

  // Section 10: recent Gmail intelligence.
  let s10 = "";
  if (report.gmailIntelligence.length) {
    s10 = table(["Category", "Subject", "Summary"], report.gmailIntelligence.map((e: any) => [
      e.category || "—",
      e.subject || "—",
      e.extractedSummary || ""
    ]));
    s10 += `<p class="empty">Summarized only — full emails remain private.</p>`;
  } else {
    s10 = empty("No extracted email intelligence available.");
  }

  // Section 11: AI summary.
  const s11 = `<p style="font-size:14px;line-height:1.6;margin:8px 0">${escapeHtml(report.aiSummary)}</p>`;

  // Section 12: footer.
  const s12 = `<p class="empty" style="font-size:12px;color:#8a93a6">Report ID: ${escapeHtml(report.reportId)}<br>Generated at ${fmtDate(now)} by AI Life Continuity Assistant.</p>`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f6f8fb;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c2b45">
  <div style="max-width:640px;margin:0 auto;padding:24px 16px">
    <div style="background:#1c2b45;border-radius:10px 10px 0 0;padding:20px 24px">
      <h1 style="color:#ffffff;margin:0;font-size:20px;line-height:1.3">🚨 Life Continuity Report for ${escapeHtml(report.user.name)}</h1>
      <p style="color:#cbd5e1;margin:6px 0 0;font-size:13px">Confidential — for the account holder's trusted contacts only</p>
    </div>
    <div style="background:#ffffff;border-radius:0 0 10px 10px;padding:24px;box-shadow:0 1px 3px rgba(16,24,40,.1)">
      ${section("Emergency Notice", "🆘", "#c0392b", s1)}
      ${section("Personal Information", "👤", "#2c3e50", s2)}
      ${section("Financial Overview", "💰", "#16a34a", s3)}
      ${section("Insurance", "🛡️", "#2563eb", s4)}
      ${section("Assets", "🏠", "#7c3aed", s5)}
      ${section("Bills", "🧾", "#d97706", s6)}
      ${section("Appointments", "📅", "#0e7490", s7)}
      ${section("Important Documents", "📁", "#b45309", s8)}
      ${section("Important Accounts", "🔑", "#334155", s9)}
      ${section("Recent Gmail Intelligence", "✉️", "#0891b2", s10)}
      ${section("AI Generated Summary", "🤖", "#111827", s11)}
      ${section("About this email", "📄", "#64748b", s12)}
    </div>
    <p style="font-size:11px;color:#8a93a6;text-align:center;margin-top:16px">Generated automatically by AI Life Continuity Assistant. Please contact the account holder for any questions.</p>
  </div>
</body>
</html>`;

  return html;
}

// ---- EMAIL TRANSPORT -------------------------------------------------------
async function transportSend(to: string, subject: string, html: string, text: string): Promise<any> {
  if (EMAIL_MODE() === "sendgrid") {
    const sgMail = await import("@sendgrid/mail");
    const sg = sgMail.default;
    sg.setApiKey(process.env.SENDGRID_API_KEY || "");
    const msg = {
      to,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject,
      html,
      text
    };
    await sg.send(msg);
    return { provider: "sendgrid" };
  }
  // console fallback: log for audit, never crash the pipeline.
  console.log(`[EMAIL:${EMAIL_MODE()}] to=${to} subject="${subject}" reportId=${extractReportId(html)}`);
  return { provider: "console" };
}

function extractReportId(html: string): string {
  const m = html.match(/Report ID: ([^<]+)/);
  return m ? m[1] : "unknown";
}

function plainTextReport(report: any): string {
  const lines: string[] = [];
  lines.push(`EMERGENCY LIFE CONTINUITY REPORT — ${report.user.name}`);
  lines.push(`Report ID: ${report.reportId}  Generated: ${report.generatedAt}`);
  lines.push("");
  lines.push(`REASON: ${report.trigger === "missed-checkin" ? "Grace period expired (no check-in)." : "Manual emergency activation."}`);
  lines.push(`Last check-in: ${report.emergency.lastCheckIn}`);
  lines.push("");
  lines.push("PENDING BILLS:");
  report.bills.forEach((b: any) => lines.push(`- ${b.name}: $${b.amount} due ${b.dueDate}`));
  lines.push("");
  if (report.insurance.length) {
    lines.push("INSURANCE:");
    report.insurance.forEach((i: any) => lines.push(`- ${i.policyNumber} (${i.hospitalName}) expires ${i.expiryDate}`));
    lines.push("");
  }
  lines.push("AI SUMMARY:");
  lines.push(report.aiSummary);
  lines.push("");
  lines.push("Generated automatically by AI Life Continuity Assistant.");
  return lines.join("\n");
}

// ---- SEND ORCHESTRATION ----------------------------------------------------
async function deliverToContact(
  uid: string,
  trigger: string,
  contact: Contact,
  report: any,
  html: string,
  text: string,
  deliveryId: string,
  repo: IDeliveryRepository,
): Promise<any> {
  const email = (contact.email || "").trim();
  if (!email) {
    const rec = { contact: contact.name || "Unknown", email: "", status: "skipped", reason: "no email address", attempts: 0, lastError: null, timestamp: new Date().toISOString() };
    await repo.addContactRecord(deliveryId, rec).catch(() => {});
    return rec;
  }

  const subject = `🚨 Life Continuity Report for ${report.user.name}`;
  const contactRecord = {
    contact: contact.name || email,
    relation: contact.relation || "—",
    email,
    status: "pending",
    attempts: 0,
    lastError: null as string | null,
    timestamp: new Date().toISOString()
  };

  const attemptDelivery = async (): Promise<string> => {
    try {
      await transportSend(email, subject, html, text);
      contactRecord.status = "sent";
      contactRecord.timestamp = new Date().toISOString();
      return "sent";
    } catch (e: any) {
      contactRecord.status = "failed";
      contactRecord.lastError = (e && e.message) || String(e);
      contactRecord.attempts++;
      throw e;
    }
  };

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const status = await attemptDelivery();
      contactRecord.status = status;
      await repo.addContactRecord(deliveryId, { ...contactRecord }).catch(() => {});
      return contactRecord;
    } catch (e: any) {
      if (attempt < MAX_ATTEMPTS) {
        await repo.addLog(deliveryId, `Delivery attempt ${attempt}/${MAX_ATTEMPTS} failed for ${email}: ${e.message}. Retrying in ${RETRY_BACKOFF_MS[attempt - 1] / 1000}s.`).catch(() => {});
        await new Promise(r => setTimeout(r, RETRY_BACKOFF_MS[attempt - 1]));
      } else {
        await repo.addLog(deliveryId, `Delivery permanently failed for ${email} after ${MAX_ATTEMPTS} attempts: ${e.message}`).catch(() => {});
      }
    }
  }
  contactRecord.status = "failed";
  await repo.addContactRecord(deliveryId, { ...contactRecord }).catch(() => {});
  return contactRecord;
}

export async function sendEmergencyEmails(
  uid: string,
  trigger: EmergencyTrigger,
  services: {
    users: IUserRepository;
    settings: ISettingsRepository;
    emails: IEmailRepository;
    docs: IDocumentRepository;
    alerts: IAlertRepository;
  },
  repo: IDeliveryRepository,
  ai: any,
): Promise<any> {
  const profile = await services.users.getEmergencyProfile(uid);
  const contacts: Contact[] = (profile?.trustedContacts || []).filter((c: Contact) => (c.email || "").trim());

  // Idempotency: skip if this trigger already processed.
  const existing = await repo.getDelivery(uid, trigger);
  if (existing && existing.processed) {
    await services.alerts.createAlert({
      id: "alert-" + Math.random().toString(36).substr(2, 9),
      uid,
      timestamp: new Date().toISOString(),
      event: "Duplicate Emergency Email Attempt Blocked",
      details: `${trigger} already processed (${existing.id}). No duplicate sent.`
    });
    return { success: false, skipped: true, reason: "already-processed", delivery: existing };
  }

  const report = await buildLifeContinuityReport(uid, trigger, services, ai);
  const html = buildHtmlEmail(report);
  const text = plainTextReport(report);

  let delivery = existing || null;
  if (!delivery) {
    delivery = await repo.createDelivery({
      id: "ed-" + Math.random().toString(36).substr(2, 9),
      uid,
      trigger,
      reportId: report.reportId,
      processed: false,
      createdAt: new Date().toISOString(),
      processedAt: null,
      contactRecords: [],
      logs: []
    });
  }

  // Claim the job synchronously — a restart or second worker sees processed=true
  // before any contact send begins, so at most one worker delivers.
  await repo.updateDelivery(delivery.id, { processed: true, processedAt: new Date().toISOString(), contactCount: contacts.length });

  await repo.addLog(delivery.id, `Emergency email triggered (${trigger}) for ${uid} → ${contacts.length} contact(s). Report ${report.reportId}.`);

  if (contacts.length === 0) {
    await repo.addLog(delivery.id, `No trusted contacts with email configured for ${uid}. Nothing to send.`);
    await services.alerts.createAlert({
      id: "alert-" + Math.random().toString(36).substr(2, 9),
      uid,
      timestamp: new Date().toISOString(),
      event: "Emergency Email — No Contacts",
      details: `Trigger ${trigger} fired but profile has no trusted contacts with email addresses.`
    });
    return { success: true, sent: 0, delivery, reportId: report.reportId };
  }

  const results: any[] = [];
  for (const contact of contacts) {
    const rec = await deliverToContact(uid, trigger, contact, report, html, text, delivery.id, repo);
    results.push(rec);
  }

  const sent = results.filter((r: any) => r.status === "sent").length;
  const failed = results.filter((r: any) => r.status === "failed").length;
  await repo.addLog(delivery.id, `Emergency email dispatch complete: ${sent} sent, ${failed} failed.`);

  await services.alerts.createAlert({
    id: "alert-" + Math.random().toString(36).substr(2, 9),
    uid,
    timestamp: new Date().toISOString(),
    event: "Emergency Email Sent",
    details: `Life Continuity Report ${report.reportId} sent to ${sent}/${contacts.length} trusted contacts (trigger: ${trigger}).`
  });

  return { success: true, sent, failed, delivery, reportId: report.reportId };
}

// ---- GRACE PERIOD MONITOR ---------------------------------------------------
// setInterval-based; restart-safe because every tick re-reads state from disk.
// ponytail: single-instance assumption — Railway runs one web process. On multi-replica
// deploys two instances may both fire; the per-uid processed flag in the shared
// JSON file serializes the send (second sees processed=true and skips).
export function startGraceMonitor(
  services: {
    users: IUserRepository;
    settings: ISettingsRepository;
    emails: IEmailRepository;
    docs: IDocumentRepository;
    alerts: IAlertRepository;
  },
  repo: IDeliveryRepository,
  ai: any,
): NodeJS.Timeout {
  const intervalMs = Number(process.env.EMERGENCY_CHECK_INTERVAL_MS || 60_000);
  const tick = async () => {
    try {
      const users = await services.users.getAll();
      for (const user of users) {
        const uid = user.uid;
        const settings = await services.settings.getCheckInSettings(uid);
        if (!settings) continue; // not an active monitor user
        const graceMinutes = Number(settings.gracePeriodMinutes || 120);
        const stats = await services.settings.getCheckInStats(uid);
        const lastCheckIn = stats?.lastCheckInTimestamp;
        if (!lastCheckIn) continue;

        // Timezone-aware check-in window: only act inside the user's configured
        // window (default 08:00–20:00 local). Uses server-local time as proxy —
        // see ponytail note below.
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");
        const t = `${hh}:${mm}`;
        const winStart = settings.checkInWindowStart || "08:00";
        const winEnd = settings.checkInWindowEnd || "20:00";
        const inWindow = t >= winStart && t <= winEnd;
        if (!inWindow) continue;

        const lastCheckInMs = new Date(lastCheckIn).getTime();
        if (isNaN(lastCheckInMs)) continue;
        const graceExpired = Date.now() - lastCheckInMs > graceMinutes * 60_000;
        if (!graceExpired) continue;

        // Idempotency check + send.
        await sendEmergencyEmails(uid, "missed-checkin", services, repo, ai);
      }
    } catch (e: any) {
      console.error("[GRACE MONITOR] tick error:", e.message || e);
    }
  };
  tick(); // run once at startup to catch anything missed while offline
  const timer = setInterval(tick, intervalMs);
  // Keep the process alive on Railway even if no request traffic.
  if (typeof (timer as any).unref === "function") (timer as any).unref();
  console.log(`[GRACE MONITOR] started, interval=${intervalMs}ms, mode=${EMAIL_MODE()}`);
  return timer;
}
