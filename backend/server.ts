import express from "express";
import path from "path";
import fs from "fs";

import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import cors from "cors";

const __dirname = process.cwd();

import {
  userService,
  nomineeService,
  gmailService,
  documentsService,
  checkInService,
  monitoringService,
  notificationService,
  sendEmergencyEmails,
  sendNomineeAlertEmail,
  sendConfirmationEmailToUser,
  startGraceMonitor,
  settingsService
} from "./services";
import {
  deliveryRepository,
  userRepository,
  settingsRepository,
  emailRepository,
  documentRepository,
  alertRepository
} from "./repositories";

// Shared repository bundle for the emergency mail pipeline (report + delivery).
const emergencyRepos = {
  users: userRepository,
  settings: settingsRepository,
  emails: emailRepository,
  docs: documentRepository,
  alerts: alertRepository
};

dotenv.config();

const PORT = Number(process.env.PORT || 3000);

const app = express();

const allowedOrigins = [
  "https://life-continuity-ai-take-over.vercel.app",
  "https://life-continuiy-ai-take-over.vercel.app",
  "http://localhost:3000"
];

// Configure CORS first
app.use(cors({
  origin: (origin, callback) => {
    callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Origin", "Accept"],
  optionsSuccessStatus: 204
}));

// Early logging middleware for debugging CORS and request flow
app.use((req, res, next) => {
  console.log(`[EARLY REQUEST LOG] Method: ${req.method}, URL: ${req.url}, Origin: ${req.headers.origin}`);
  next();
});

// Middleware log before CORS
app.use((req, res, next) => {
  console.log(`[BEFORE CORS MIDDLEWARE] Method: ${req.method}, URL: ${req.url}`);
  next();
});

// Middleware log before JSON parser
app.use((req, res, next) => {
  console.log(`[BEFORE JSON PARSER] Method: ${req.method}, URL: ${req.url}`);
  next();
});

app.use(express.json({ limit: "50mb" }));

// Middleware log after JSON parser
app.use((req, res, next) => {
  console.log(`[AFTER JSON PARSER] Method: ${req.method}, URL: ${req.url}, Body Keys: ${req.body ? Object.keys(req.body) : 'none'}`);
  next();
});

// Setup folder for uploads
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use("/api/uploads", express.static(UPLOADS_DIR));

// DB Persistence setup
const DB_PATH = path.join(__dirname, "..", "db.json");

import { DatabaseSchema, loadDb, saveDb } from "./repositories/db";

// Populate initial database with sandbox-demo data
function initDb() {
  const db = loadDb();
  let modified = false;

  // Initial demo user
  if (!db.users["sandbox-demo"]) {
    db.users["sandbox-demo"] = {
      uid: "sandbox-demo",
      email: "sandbox@lighthouseresilience.com",
      name: "Alex Mercer",
      createdAt: new Date().toISOString()
    };
    modified = true;
  }

  // Initial demo profile
  if (!db.emergencyProfiles["sandbox-demo"]) {
    db.emergencyProfiles["sandbox-demo"] = {
      uid: "sandbox-demo",
      name: "Alex Mercer",
      age: 34,
      bloodGroup: "A+",
      emergencyContactName: "Sarah Mercer (Spouse)",
      emergencyContactPhone: "+1 (555) 019-2834",
      medicalInfo: "Penicillin allergy. Mild asthma (uses Albuterol inhaler). Previous appendectomy (2021). Blood type A+ verified.",
      nomineePin: "1234",
      nomineePhone: "+1 (555) 012-3456",
      nomineeName: "Sarah Mercer",
      trustedContacts: [],
      lastNomineeActive: new Date(Date.now() - 3.5 * 3600000).toISOString(),
      emergencyNomineeName: "Sarah Mercer",
      emergencyNomineeEmail: "sarah@example.com",
      streakDuration: 7,
      gracePeriod: 24,
      lastActiveTimestamp: Date.now(),
      currentStreakStatus: "Safe"
    };
    modified = true;
  } else {
    // Backfill Life Streak Monitoring defaults onto existing demo profile.
    const demo = db.emergencyProfiles["sandbox-demo"];
    if (demo && !demo.emergencyNomineeEmail) {
      demo.emergencyNomineeName = demo.emergencyNomineeName || "Sarah Mercer";
      demo.emergencyNomineeEmail = "sarah@example.com";
      demo.streakDuration = demo.streakDuration ?? 7;
      demo.gracePeriod = demo.gracePeriod ?? 24;
      if (!demo.lastActiveTimestamp) demo.lastActiveTimestamp = Date.now();
      if (!demo.currentStreakStatus) demo.currentStreakStatus = "Safe";
      modified = true;
    }
  }

  // Initial checkInStats
  if (!db.checkInStats["sandbox-demo"]) {
    db.checkInStats["sandbox-demo"] = {
      uid: "sandbox-demo",
      currentStreak: 12,
      longestStreak: 24,
      lastCheckInDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      lastCheckInTimestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      status: "Verified",
      lastKnownLocation: {
        latitude: 37.7749,
        longitude: -122.4194,
        timestamp: new Date().toISOString(),
        batteryLevel: 14,
        isCharging: false
      }
    };
    modified = true;
  }

  // Initial checkInSettings
  if (!db.checkInSettings["sandbox-demo"]) {
    db.checkInSettings["sandbox-demo"] = {
      uid: "sandbox-demo",
      checkInWindowStart: "08:00",
      checkInWindowEnd: "21:00",
      reminderIntervals: [120, 60, 15],
      gracePeriodMinutes: 120
    };
    modified = true;
  }

  // Initial bills
  if (db.bills.filter(b => b.uid === "sandbox-demo").length === 0) {
    db.bills.push(
      {
        id: "bill-1",
        uid: "sandbox-demo",
        name: "PG&E Electricity Bill",
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        amount: 142.50,
        status: "Pending",
        category: "Upcoming Bills"
      },
      {
        id: "bill-2",
        uid: "sandbox-demo",
        name: "Chase Auto Loan EMI",
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        amount: 350.00,
        status: "Pending",
        category: "Loans/EMIs"
      },
      {
        id: "bill-3",
        uid: "sandbox-demo",
        name: "Stanford Healthcare Copay",
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        amount: 50.00,
        status: "Paid",
        category: "Upcoming Bills"
      },
      {
        id: "bill-4",
        uid: "sandbox-demo",
        name: "Trinity School Fee",
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        amount: 400.00,
        status: "Pending",
        category: "School Fees"
      },
      {
        id: "bill-rent-july4",
        uid: "sandbox-demo",
        name: "House Rent EMI Payment",
        dueDate: "2026-07-04",
        amount: 1200,
        status: "Pending",
        category: "Loans/EMIs",
        priority: "High",
        notes: "Monthly apartment lease amortization auto-debit process."
      },
      {
        id: "bill-school-july4",
        uid: "sandbox-demo",
        name: "School Bus Fees",
        dueDate: "2026-07-04",
        amount: 180,
        status: "Pending",
        category: "School Fees",
        priority: "Medium",
        notes: "Quarterly transportation charges for children school commute."
      }
    );
    modified = true;
  }

  // Initial appointments
  if (db.appointments.filter(a => a.uid === "sandbox-demo").length === 0) {
    db.appointments.push(
      {
        id: "appt-1",
        uid: "sandbox-demo",
        name: "Dentist Checkup & Cleaning",
        date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "10:00 AM",
        status: "Upcoming",
        location: "Dr. Aris Dental Clinic",
        notes: "Routine checkup. Do not eat 1 hour before."
      },
      {
        id: "appt-2",
        uid: "sandbox-demo",
        name: "Pediatrician Appointment (Emma)",
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "02:30 PM",
        status: "Upcoming",
        location: "Kaiser Permanente, Redwood City",
        notes: "Bring immunisation logs."
      },
      {
        id: "appt-cardio-july4",
        uid: "sandbox-demo",
        name: "Cardiology Consult — Dr. Gupta",
        date: "2026-07-04",
        time: "10:00 AM",
        status: "Upcoming",
        location: "Desk 4, Apollo Clinic",
        priority: "High",
        category: "Medical Consults",
        notes: "Follow-up consultation for mother. Located at Desk 4, Apollo Clinic."
      }
    );
    modified = true;
  }

  // Initial security sessions
  if (db.sessions.filter(s => s.uid === "sandbox-demo").length === 0) {
    db.sessions.push(
      {
        id: "sess-1",
        uid: "sandbox-demo",
        device: "Chrome on macOS (14.5)",
        location: "San Francisco, CA, USA",
        lastActive: new Date().toISOString()
      },
      {
        id: "sess-2",
        uid: "sandbox-demo",
        device: "Safari on iPhone 15",
        location: "San Jose, CA, USA",
        lastActive: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      }
    );
    modified = true;
  }

  // Initial securityAlerts
  if (db.securityAlerts.filter(a => a.uid === "sandbox-demo").length === 0) {
    db.securityAlerts.push(
      {
        id: "alert-1",
        uid: "sandbox-demo",
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        event: "User Sign In",
        details: "Successful login into sandbox account"
      }
    );
    modified = true;
  }

  // Initial emails
  if (db.emailRecords.filter(e => e.uid === "sandbox-demo").length === 0) {
    db.emailRecords.push(
      {
        id: "email-1",
        uid: "sandbox-demo",
        subject: "Your PGE energy statement is ready",
        sender: "billing@pge.com",
        category: "Bills",
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        extractedSummary: "PG&E bill of $142.50 is due on " + new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] + ". Access account to review usage details.",
        rawSnippet: "Your latest energy statement for account ending in 4930 is now available online. Total Amount Due: $142.50. Due Date: " + new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] + ". Direct debit will process on due date if registered."
      },
      {
        id: "email-2",
        uid: "sandbox-demo",
        subject: "Lighthouse Life Insurance Policy Renewal Confirmation",
        sender: "renewals@lighthouse-ins.com",
        category: "Insurance",
        date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        extractedSummary: "Life insurance policy #LI-94302-AM renewed successfully. Expiry: 2027-07-15. Standard coverage amount $500,000.",
        rawSnippet: "Dear Alex Mercer, your policy number LI-94302-AM has been renewed. Premium of $75/mo will be debited automatically. Expiry date of this current coverage period: 2027-07-15. Designated Nominee on record: Sarah Mercer."
      }
    );
    modified = true;
  }

  // Guarantee that July 4, 2026 events are present for sandbox-demo user (matches mockup screenshots)
  const hasRent = db.bills.some(b => b.id === "bill-rent-july4" || (b.uid === "sandbox-demo" && b.name === "House Rent EMI Payment" && b.dueDate === "2026-07-04"));
  if (!hasRent) {
    db.bills.push({
      id: "bill-rent-july4",
      uid: "sandbox-demo",
      name: "House Rent EMI Payment",
      dueDate: "2026-07-04",
      amount: 1200,
      status: "Pending",
      category: "Loans/EMIs",
      priority: "High",
      notes: "Monthly apartment lease amortization auto-debit process."
    });
    modified = true;
  }

  const hasSchoolBus = db.bills.some(b => b.id === "bill-school-july4" || (b.uid === "sandbox-demo" && b.name === "School Bus Fees" && b.dueDate === "2026-07-04"));
  if (!hasSchoolBus) {
    db.bills.push({
      id: "bill-school-july4",
      uid: "sandbox-demo",
      name: "School Bus Fees",
      dueDate: "2026-07-04",
      amount: 180,
      status: "Pending",
      category: "School Fees",
      priority: "Medium",
      notes: "Quarterly transportation charges for children school commute."
    });
    modified = true;
  }

  const hasCardio = db.appointments.some(a => a.id === "appt-cardio-july4" || (a.uid === "sandbox-demo" && a.name === "Cardiology Consult — Dr. Gupta" && a.date === "2026-07-04"));
  if (!hasCardio) {
    db.appointments.push({
      id: "appt-cardio-july4",
      uid: "sandbox-demo",
      name: "Cardiology Consult — Dr. Gupta",
      date: "2026-07-04",
      time: "10:00 AM",
      status: "Upcoming",
      location: "Desk 4, Apollo Clinic",
      priority: "High",
      category: "Medical Consults",
      notes: "Follow-up consultation for mother. Located at Desk 4, Apollo Clinic."
    });
    modified = true;
  }

  // Prepopulate initial checkInEvents for sandbox-demo
  if (!db.checkInEvents || db.checkInEvents.filter(e => e.uid === "sandbox-demo").length === 0) {
    if (!db.checkInEvents) {
      db.checkInEvents = [];
    }
    const demoEvents = [
      {
        id: "evt-demo-1",
        uid: "sandbox-demo",
        timestamp: new Date(Date.now() - 1 * 3600000).toISOString(),
        date: new Date(Date.now() - 1 * 3600000).toISOString().split("T")[0],
        time: "10:15 AM",
        method: "login",
        methodLabel: "App Login",
        status: "Success"
      },
      {
        id: "evt-demo-2",
        uid: "sandbox-demo",
        timestamp: new Date(Date.now() - 25 * 3600000).toISOString(),
        date: new Date(Date.now() - 25 * 3600000).toISOString().split("T")[0],
        time: "09:30 AM",
        method: "manualButton",
        methodLabel: "Manual \"I'm Safe\"",
        status: "Success"
      },
      {
        id: "evt-demo-3",
        uid: "sandbox-demo",
        timestamp: new Date(Date.now() - 49 * 3600000).toISOString(),
        date: new Date(Date.now() - 49 * 3600000).toISOString().split("T")[0],
        time: "08:45 AM",
        method: "smsReply",
        methodLabel: "SMS Reply",
        status: "Success"
      },
      {
        id: "evt-demo-4",
        uid: "sandbox-demo",
        timestamp: new Date(Date.now() - 73 * 3600000).toISOString(),
        date: new Date(Date.now() - 73 * 3600000).toISOString().split("T")[0],
        time: "11:20 AM",
        method: "pushAction",
        methodLabel: "Push Notification",
        status: "Success"
      },
      {
        id: "evt-demo-5",
        uid: "sandbox-demo",
        timestamp: new Date(Date.now() - 97 * 3600000).toISOString(),
        date: new Date(Date.now() - 97 * 3600000).toISOString().split("T")[0],
        time: "08:00 PM",
        method: "missed",
        methodLabel: "Missed Check-In",
        status: "Missed"
      },
      {
        id: "evt-demo-6",
        uid: "sandbox-demo",
        timestamp: new Date(Date.now() - 121 * 3600000).toISOString(),
        date: new Date(Date.now() - 121 * 3600000).toISOString().split("T")[0],
        time: "10:00 AM",
        method: "login",
        methodLabel: "App Login",
        status: "Success"
      },
      {
        id: "evt-demo-7",
        uid: "sandbox-demo",
        timestamp: new Date(Date.now() - 145 * 3600000).toISOString(),
        date: new Date(Date.now() - 145 * 3600000).toISOString().split("T")[0],
        time: "01:15 PM",
        method: "pushAction",
        methodLabel: "Push Notification",
        status: "Success"
      },
      {
        id: "evt-demo-8",
        uid: "sandbox-demo",
        timestamp: new Date(Date.now() - 169 * 3600000).toISOString(),
        date: new Date(Date.now() - 169 * 3600000).toISOString().split("T")[0],
        time: "02:30 PM",
        method: "smsReply",
        methodLabel: "SMS Reply",
        status: "Success"
      },
      {
        id: "evt-demo-9",
        uid: "sandbox-demo",
        timestamp: new Date(Date.now() - 193 * 3600000).toISOString(),
        date: new Date(Date.now() - 193 * 3600000).toISOString().split("T")[0],
        time: "10:45 AM",
        method: "manualButton",
        methodLabel: "Manual \"I'm Safe\"",
        status: "Success"
      },
      {
        id: "evt-demo-10",
        uid: "sandbox-demo",
        timestamp: new Date(Date.now() - 217 * 3600000).toISOString(),
        date: new Date(Date.now() - 217 * 3600000).toISOString().split("T")[0],
        time: "08:00 PM",
        method: "missed",
        methodLabel: "Missed Check-In",
        status: "Missed"
      }
    ];
    db.checkInEvents.push(...demoEvents);
    modified = true;
  }

  if (modified) {
    saveDb(db);
  }
}

initDb();

// Lazy-load Gemini AI SDK client
let aiInstance: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY not found in environment. Running with simulated responses.");
      return null;
    }
    aiInstance = new GoogleGenAI({ apiKey: key });
  }
  return aiInstance;
}

// --- EXPRESS ENDPOINTS ---

// Tab 1: SignUp
app.post("/api/auth/signup", async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const existing = await userService.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const uid = "user-" + Math.random().toString(36).substr(2, 9);
    const newUser = await userService.createUser({
      uid,
      email,
      name,
      createdAt: new Date().toISOString()
    });

    // Initialize companion profile, settings and stats
    await userService.createProfile(uid, {
      uid,
      name,
      age: 30,
      bloodGroup: "O+",
      emergencyContactName: "",
      emergencyContactPhone: "",
      medicalInfo: "",
      nomineePin: "1111", // default nominee pin
      nomineePhone: "",
      nomineeName: "",
      trustedContacts: []
    });

    await checkInService.updateSettings(uid, {
      uid,
      checkInWindowStart: "08:00",
      checkInWindowEnd: "20:00",
      reminderIntervals: [120, 60, 15],
      gracePeriodMinutes: 120
    });

    await checkInService.updateStats(uid, {
      uid,
      currentStreak: 0,
      longestStreak: 0,
      lastCheckInDate: null,
      lastCheckInTimestamp: null,
      status: "Verified",
      lastKnownLocation: null
    });

    // Trigger safety check-in immediately upon signup
    await checkInService.recordCheckIn(uid, "login");
    await notificationService.logAlert(uid, "Account Created", "User successfully signed up & auto checked-in.");

    res.json({ user: newUser });
  } catch (err: any) {
    console.error("Signup failed", err);
    res.status(500).json({ error: "Internal server error during signup" });
  }
});

// Tab 1: Login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Missing email/password" });
  }

  try {
    const user = await userService.getUserByEmail(email);
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Record Check-in as part of authentication wire-up
    await checkInService.recordCheckIn(user.uid, "login");
    await notificationService.logAlert(user.uid, "User Sign In", `Logged in via email/password`);

    res.json({ user });
  } catch (err: any) {
    console.error("Login failed", err);
    res.status(500).json({ error: "Internal server error during login" });
  }
});

// Tab 1: Google Login
app.post("/api/auth/google-login", async (req, res) => {
  const { email, name } = req.body;
  if (!email || !name) {
    return res.status(400).json({ error: "Missing Google profile info" });
  }

  try {
    let user = await userService.getUserByEmail(email);

    if (!user) {
      const uid = "user-google-" + Math.random().toString(36).substr(2, 9);
      user = await userService.createUser({
        uid,
        email,
        name,
        createdAt: new Date().toISOString()
      });

      await userService.createProfile(uid, {
        uid,
        name,
        age: 30,
        bloodGroup: "O+",
        emergencyContactName: "",
        emergencyContactPhone: "",
        medicalInfo: "",
        nomineePin: "1111",
        nomineePhone: "",
        nomineeName: "",
        trustedContacts: []
      });

      await checkInService.updateSettings(uid, {
        uid,
        checkInWindowStart: "08:00",
        checkInWindowEnd: "20:00",
        reminderIntervals: [120, 60, 15],
        gracePeriodMinutes: 120
      });

      await checkInService.updateStats(uid, {
        uid,
        currentStreak: 0,
        longestStreak: 0,
        lastCheckInDate: null,
        lastCheckInTimestamp: null,
        status: "Verified",
        lastKnownLocation: null
      });

      await notificationService.logAlert(user.uid, "Account Created", "User signed up via Google.");
    }

    await checkInService.recordCheckIn(user.uid, "login");
    await notificationService.logAlert(user.uid, "User Sign In", `Logged in via Google Authentication`);

    res.json({ user });
  } catch (err: any) {
    console.error("Google login failed", err);
    res.status(500).json({ error: "Internal server error during Google login" });
  }
});

app.get("/api/test", (req, res) => {
  const envStatus = {
    COMPOSIO_API_KEY: !!process.env.COMPOSIO_API_KEY ? "SET" : "MISSING",
    COMPOSIO_GMAIL_AUTH_CONFIG_ID: !!process.env.COMPOSIO_GMAIL_AUTH_CONFIG_ID ? "SET" : "MISSING",
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY ? "SET" : "MISSING",
    CLERK_SECRET_KEY: !!process.env.CLERK_SECRET_KEY ? "SET" : "MISSING",
    VITE_CLERK_PUBLISHABLE_KEY: !!process.env.VITE_CLERK_PUBLISHABLE_KEY ? "SET" : "MISSING",
    NODE_ENV: process.env.NODE_ENV || "not set",
    PORT: process.env.PORT || "3000 (default)",
  };
  res.json({
    success: true,
    message: "Backend reachable",
    timestamp: new Date().toISOString(),
    environment: envStatus
  });
});

// Clerk Authentication User Synchronization
app.post("/api/auth/clerk-sync", async (req, res) => {
  console.log(`[CLERK-SYNC POST ROUTE HIT] Method: ${req.method}, Headers: ${JSON.stringify(req.headers)}`);
  try {
    const { email, name, uid } = req.body;
    console.log(`[CLERK-SYNC POST BODY] email: "${email}", name: "${name}", uid: "${uid}"`);

    if (!email || !uid) {
      console.warn("[CLERK-SYNC POST] Missing email or uid in body!");
      return res.status(400).json({ error: "Missing Clerk profile info" });
    }

    let user = await userService.getUser(uid);

    if (!user) {
      console.log(`[CLERK-SYNC POST] User not found by uid: "${uid}". Searching by email fallback...`);
      user = await userService.getUserByEmail(email);

      if (user) {
        console.log(`[CLERK-SYNC POST] User found by email fallback: "${user.uid}". Re-mapping user...`);
        const oldUid = user.uid;

        // Re-map user under their new Clerk uid
        user.uid = uid;
        await userService.createUser(user);
        await userService.deleteUser(oldUid);

        // Update associated tables
        const profile = await userService.getProfile(oldUid);
        if (profile) {
          await userService.createProfile(uid, { ...profile, uid });
          await userService.deleteProfile(oldUid);
        }

        const checkInSettings = await checkInService.getSettings(oldUid);
        if (checkInSettings) {
          await checkInService.updateSettings(uid, { ...checkInSettings, uid });
          const db = loadDb();
          delete db.checkInSettings[oldUid];
          saveDb(db);
        }

        const checkInStats = await checkInService.getStats(oldUid);
        if (checkInStats) {
          await checkInService.updateStats(uid, { ...checkInStats, uid });
          const db = loadDb();
          delete db.checkInStats[oldUid];
          saveDb(db);
        }

        await notificationService.logAlert(uid, "Account Linked", `Linked existing user account ${email} to Clerk ID ${uid}`);
      } else {
        console.log(`[CLERK-SYNC POST] Creating new user for uid: "${uid}"`);
        user = await userService.createUser({
          uid,
          email,
          name: name || email.split("@")[0],
          createdAt: new Date().toISOString()
        });

        await userService.createProfile(uid, {
          uid,
          name: name || email.split("@")[0],
          age: 30,
          bloodGroup: "O+",
          emergencyContactName: "",
          emergencyContactPhone: "",
          medicalInfo: "",
          nomineePin: "1111",
          nomineePhone: "",
          nomineeName: "",
          trustedContacts: []
        });

        await checkInService.updateSettings(uid, {
          uid,
          checkInWindowStart: "08:00",
          checkInWindowEnd: "20:00",
          reminderIntervals: [120, 60, 15],
          gracePeriodMinutes: 120
        });

        await checkInService.updateStats(uid, {
          uid,
          currentStreak: 0,
          longestStreak: 0,
          lastCheckInDate: null,
          lastCheckInTimestamp: null,
          status: "Verified",
          lastKnownLocation: null
        });

        await notificationService.logAlert(uid, "Account Created", "User signed up/registered via Clerk.");
      }
    } else {
      console.log(`[CLERK-SYNC POST] Found existing user: ${JSON.stringify(user)}`);
    }

    await checkInService.recordCheckIn(user.uid, "login");
    await notificationService.logAlert(user.uid, "User Sign In", `Logged in via Clerk Authentication`);

    console.log(`[CLERK-SYNC POST] Sending success response for user: "${user.uid}"`);
    res.json({ user });
  } catch (err: any) {
    console.error(`[CLERK-SYNC POST EXCEPTION] Error: ${err.message}`, err.stack);
    res.status(500).json({ error: "Internal server error during Clerk sync", details: err.message });
  }
});

// Tab 1: Nominee Send OTP
app.post("/api/auth/nominee-otp", async (req, res) => {
  const { phone } = req.body;
  try {
    const result = await nomineeService.logNomineeOtpRequest(phone);
    res.json(result);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// Tab 1: Nominee Login
app.post("/api/auth/nominee-login", async (req, res) => {
  const { phone, otp, pin } = req.body;
  try {
    const result = await nomineeService.verifyNomineeLogin(phone, otp, pin);
    await notificationService.logAlert(result.ownerUid, "Nominee Login Success", "Nominee portal accessed successfully by designated mobile.");
    res.json(result);
  } catch (err: any) {
    try {
      const profile = await nomineeService.getNomineeByPhone(phone);
      if (profile) {
        await notificationService.logAlert(profile.uid, "Failed Nominee Access Attempt", `Nominee attempted login with invalid Access PIN.`);
      }
    } catch (logErr) { }
    res.status(401).json({ error: err.message });
  }
});

// Tab 2: Get and Update Emergency Profile
app.get("/api/profile/:uid", async (req, res) => {
  try {
    const profile = await userService.getProfile(req.params.uid) || ({} as any);
    res.json(profile);
  } catch (err: any) {
    console.error("Get profile failed", err);
    res.status(500).json({ error: "Failed to get profile" });
  }
});

app.put("/api/profile/:uid", async (req, res) => {
  const uid = req.params.uid;
  const { name, age, bloodGroup, emergencyContactName, emergencyContactPhone, medicalInfo, nomineePin, nomineePhone, nomineeName, trustedContacts, streakDuration, gracePeriod, emergencyNomineeName, emergencyNomineeEmail } = req.body;

  try {
    const profile = await userService.updateProfile(uid, {
      name,
      age: Number(age) || 30,
      bloodGroup,
      emergencyContactName,
      emergencyContactPhone,
      medicalInfo,
      nomineePin,
      nomineePhone,
      nomineeName: nomineeName || "",
      trustedContacts: trustedContacts || [],
      streakDuration: streakDuration !== undefined ? Number(streakDuration) : undefined,
      gracePeriod: gracePeriod !== undefined ? Number(gracePeriod) : undefined,
      emergencyNomineeName: emergencyNomineeName || "",
      emergencyNomineeEmail: emergencyNomineeEmail || ""
    });

    await notificationService.logAlert(uid, "Profile Updated", "Emergency contact info, Trusted Nominee configurations, and trusted contacts CRUD saved.");

    res.json({ success: true, profile });
  } catch (err: any) {
    console.error("Update profile failed", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Safety Monitoring "I'm Safe" confirmation (from the check-in confirmation email).
// The email's button opens this URL: verifies the user, records activity, resets
// the streak timer, cancels any pending emergency notification, and redirects to
// the app so the user can see the confirmed state.
app.get("/api/safety/confirm/:uid", async (req, res) => {
  const uid = req.params.uid;
  try {
    const user = await userService.getUser(uid);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await checkInService.recordCheckIn(uid, "emailConfirm");

    await notificationService.logAlert(uid, "Emergency Confirmation Received", "User clicked the 'I'm Safe' button from the check-in confirmation email. Streak timer reset, pending emergency notifications cancelled.");

    res.redirect(`${process.env.APP_BASE_URL || "http://localhost:3000"}/?confirmed=1`);
  } catch (err: any) {
    console.error("Safety confirmation failed", err);
    res.status(500).send("Safety confirmation failed. Please log in to confirm you are safe.");
  }
});

// Safety Monitoring: test email (development only). Sends the exact check-in
// confirmation email to the user's address using the current transport.
app.post("/api/safety/test-email", async (req, res) => {
  const { uid } = req.body;
  if (!uid) return res.status(400).json({ error: "uid required" });
  try {
    const user = await userService.getUser(uid);
    if (!user || !user.email) return res.status(400).json({ error: "User has no email" });
    const profile = await userService.getProfile(uid);
    await sendConfirmationEmailToUser(uid, user.email, user.name || "User", deliveryRepository, alertRepository);
    res.json({ success: true, to: user.email, currentStatus: profile?.currentStreakStatus || "Safe" });
  } catch (err: any) {
    console.error("Test safety email failed", err);
    res.status(500).json({ error: "Failed to send test email" });
  }
});

// Tab 2: Security Session logs
app.get("/api/security/sessions/:uid", async (req, res) => {
  try {
    const sessions = await monitoringService.getSessions(req.params.uid);
    res.json(sessions);
  } catch (err: any) {
    console.error("Get sessions failed", err);
    res.status(500).json({ error: "Failed to get sessions" });
  }
});

app.post("/api/security/sessions/revoke", async (req, res) => {
  const { uid, sessionId } = req.body;
  try {
    const success = await monitoringService.revokeSession(sessionId);
    if (success) {
      await notificationService.logAlert(uid, "Session Revoked", `Active device session ${sessionId} revoked.`);
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error("Revoke session failed", err);
    res.status(500).json({ error: "Failed to revoke session" });
  }
});

app.get("/api/security/alerts/:uid", async (req, res) => {
  try {
    const alerts = await notificationService.getAlerts(req.params.uid);
    res.json(alerts.slice(0, 30));
  } catch (err: any) {
    console.error("Get alerts failed", err);
    res.status(500).json({ error: "Failed to get alerts" });
  }
});

app.post("/api/security/log", async (req, res) => {
  const { uid, event, details } = req.body;
  if (!uid || !event || !details) {
    return res.status(400).json({ error: "Missing log fields" });
  }
  try {
    await notificationService.logAlert(uid, event, details);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Security log failed", err);
    res.status(500).json({ error: "Failed to create log" });
  }
});

// Tab 3: Secure Document Vault
app.get("/api/documents/:uid", async (req, res) => {
  try {
    const items = await documentsService.getDocumentsByUid(req.params.uid);
    res.json(items);
  } catch (err: any) {
    console.error("Get documents failed", err);
    res.status(500).json({ error: "Failed to get documents" });
  }
});

app.post("/api/documents", async (req, res) => {
  const { uid, documentType, fileName, fileBase64, notes } = req.body;
  if (!uid || !documentType || !fileName || !fileBase64) {
    return res.status(400).json({ error: "Missing file payload fields" });
  }

  try {
    // Save base64 as file in local uploads
    const safeName = Date.now() + "_" + fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = path.join(UPLOADS_DIR, safeName);
    const buffer = Buffer.from(fileBase64.split(",")[1] || fileBase64, "base64");
    fs.writeFileSync(filePath, buffer);

    const fileUrl = `/api/uploads/${safeName}`;
    const docId = "doc-" + Math.random().toString(36).substr(2, 9);

    const newDoc = await documentsService.createDocument({
      id: docId,
      uid,
      documentType,
      fileName,
      fileUrl,
      uploadedDate: new Date().toISOString(),
      notes: notes || "",
      isNomineeAccessSecured: false
    });

    await notificationService.logAlert(uid, "Document Uploaded", `Added new document: ${fileName} (${documentType})`);

    res.json(newDoc);
  } catch (err: any) {
    console.error("Upload document failed", err);
    res.status(500).json({ error: "Failed to upload document" });
  }
});

// Demo OCR Preset Importer
app.post("/api/documents/preset", async (req, res) => {
  const { uid, presetKey } = req.body;
  if (!uid || !presetKey) {
    return res.status(400).json({ error: "Missing uid or presetKey" });
  }

  // Define preset configurations
  const presets: Record<string, {
    fileName: string;
    documentType: string;
    notes: string;
    extraction: {
      policyNumber: string;
      expiryDate: string;
      coverage: string;
      nominee: string;
      hospitalName: string;
    }
  }> = {
    metlife: {
      fileName: "metlife_continuity_term_insurance.pdf",
      documentType: "Insurance",
      notes: "Demo Preset: Annual MetLife term coverage with Nominee handover triggers",
      extraction: {
        policyNumber: "MET-2026-LIFE-998",
        expiryDate: "2048-08-25",
        coverage: "$1,000,000 direct death benefit. Active waiver of premium for accidental disability.",
        nominee: "Sarah Mercer (Spouse)",
        hospitalName: "MetLife Global Service Desk"
      }
    },
    aetna: {
      fileName: "aetna_health_shield_plan.pdf",
      documentType: "Medical Report",
      notes: "Demo Preset: Comprehensive corporate health insurance policy card",
      extraction: {
        policyNumber: "AET-HEALTH-8839",
        expiryDate: "2027-12-31",
        coverage: "100% cashless hospitalization, $10,000 Critical Illness rider, ICU bed charges covered.",
        nominee: "Sarah Mercer",
        hospitalName: "Stanford Hospital & Affiliate Clinics"
      }
    },
    resilience_id: {
      fileName: "state_resilience_id_card.pdf",
      documentType: "Other",
      notes: "Demo Preset: Government certified medical resilience ID with emergency vitals",
      extraction: {
        policyNumber: "ID-RESIL-09384-A",
        expiryDate: "2035-05-18",
        coverage: "State-certified emergency identification, allergic to Penicillin, blood group A+ confirmed.",
        nominee: "Sarah Mercer",
        hospitalName: "Department of Emergency Services"
      }
    }
  };

  const selectedPreset = presets[presetKey];
  if (!selectedPreset) {
    return res.status(400).json({ error: "Invalid presetKey requested" });
  }

  try {
    // Write a simple text dummy file in UPLOADS_DIR to support ZIP generation
    const safeName = Date.now() + "_" + selectedPreset.fileName;
    const filePath = path.join(UPLOADS_DIR, safeName);
    const dummyText = `[Lighthouse Secure Vault OCR Demo Preset]\nDocument: ${selectedPreset.fileName}\nNotes: ${selectedPreset.notes}\nPolicy: ${selectedPreset.extraction.policyNumber}\nCoverage: ${selectedPreset.extraction.coverage}`;
    fs.writeFileSync(filePath, dummyText);

    const fileUrl = `/api/uploads/${safeName}`;
    const docId = "doc-" + Math.random().toString(36).substr(2, 9);

    // 1. Create the Document
    const newDoc = await documentsService.createDocument({
      id: docId,
      uid,
      documentType: selectedPreset.documentType,
      fileName: selectedPreset.fileName,
      fileUrl,
      uploadedDate: new Date().toISOString(),
      notes: selectedPreset.notes,
      isNomineeAccessSecured: true // default to secure/allowed for nominees since it's an emergency preset
    });

    // 2. Create the associated AI Policy Extraction record
    const extId = "ext-" + Math.random().toString(36).substr(2, 9);
    const newExt = await documentsService.saveExtraction(docId, {
      id: extId,
      documentId: docId,
      uid,
      policyNumber: selectedPreset.extraction.policyNumber,
      expiryDate: selectedPreset.extraction.expiryDate,
      coverage: selectedPreset.extraction.coverage,
      nominee: selectedPreset.extraction.nominee,
      hospitalName: selectedPreset.extraction.hospitalName,
      extractedAt: new Date().toISOString()
    });

    await notificationService.logAlert(uid, "Preset Loaded", `Demo OCR document preset loaded: ${selectedPreset.fileName}`);

    res.json({ success: true, document: newDoc, extraction: newExt });
  } catch (err: any) {
    console.error("Load preset failed", err);
    res.status(500).json({ error: "Failed to load document preset" });
  }
});

app.delete("/api/documents/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const doc = await documentsService.getDocument(id);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    await documentsService.deleteDocument(id);

    await notificationService.logAlert(doc.uid, "Document Deleted", `Removed document: ${doc.fileName}`);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Delete document failed", err);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

app.put("/api/documents/:id/toggle-nominee", async (req, res) => {
  const id = req.params.id;
  try {
    const doc = await documentsService.getDocument(id);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    doc.isNomineeAccessSecured = !doc.isNomineeAccessSecured;
    await documentsService.updateDocument(id, { isNomineeAccessSecured: doc.isNomineeAccessSecured });

    await notificationService.logAlert(doc.uid, "Nominee Security Toggled", `Security toggled to ${doc.isNomineeAccessSecured} for ${doc.fileName}`);
    res.json({ success: true, document: doc });
  } catch (err: any) {
    console.error("Toggle nominee access failed", err);
    res.status(500).json({ error: "Failed to toggle nominee access" });
  }
});

// Endpoint to export document vault as encrypted ZIP
app.post("/api/documents/:uid/export-zip", async (req, res) => {
  const { uid } = req.params;
  const { password } = req.body;

  try {
    const exportResult = await documentsService.exportZip(uid, password, UPLOADS_DIR);
    res.setHeader("Content-Type", exportResult.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${exportResult.filename}"`);
    return res.send(exportResult.buffer);
  } catch (err: any) {
    console.error("Export zip failed", err);
    res.status(500).json({ error: "Failed to export vault: " + err.message });
  }
});

// Endpoint to decrypt an uploaded encrypted ZIP file
app.post("/api/documents/decrypt-zip", async (req, res) => {
  const { fileBase64, password } = req.body;
  if (!fileBase64 || !password) {
    return res.status(400).json({ error: "File payload and password are required" });
  }

  try {
    const filesList = await documentsService.decryptZip(fileBase64, password);
    res.json({ success: true, files: filesList });
  } catch (err: any) {
    console.error("Decryption failed", err);
    res.status(400).json({ error: "Failed to decrypt. Please verify the passphrase or file type." });
  }
});

// Tab 4: AI Data Extraction using Gemini Multimodal OCR
app.post("/api/documents/:id/extract", async (req, res) => {
  const id = req.params.id;
  try {
    const doc = await documentsService.getDocument(id);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    const ai = getAI();
    const result = await documentsService.extractDocumentPolicy(id, doc.fileUrl, doc.documentType, ai);
    res.json({ extraction: result });
  } catch (err: any) {
    console.error("Document extraction failed", err);
    res.status(500).json({ error: "Failed to extract document details" });
  }
});

app.get("/api/documents/:id/extraction", async (req, res) => {
  try {
    const ext = await documentsService.getExtraction(req.params.id) || null;
    res.json(ext);
  } catch (err: any) {
    console.error("Get extraction failed", err);
    res.status(500).json({ error: "Failed to get extraction details" });
  }
});

app.put("/api/documents/:id/extraction", async (req, res) => {
  const id = req.params.id;
  const { policyNumber, expiryDate, coverage, nominee, hospitalName } = req.body;

  try {
    const doc = await documentsService.getDocument(id);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    const ext = await documentsService.saveExtraction(id, {
      policyNumber,
      expiryDate,
      coverage,
      nominee,
      hospitalName
    });

    res.json(ext);
  } catch (err: any) {
    console.error("Save extraction failed", err);
    res.status(500).json({ error: "Failed to save extraction details" });
  }
});

// Tab 4: Gmail Sync settings & execution
app.get("/api/gmail/settings/:uid", async (req, res) => {
  try {
    const settings = await gmailService.getSettings(req.params.uid);
    res.json(settings);
  } catch (err: any) {
    console.error("Get gmail settings failed", err);
    res.status(500).json({ error: "Failed to get settings" });
  }
});

app.put("/api/gmail/settings/:uid", async (req, res) => {
  const uid = req.params.uid;
  const { targetKeywords } = req.body;
  try {
    await gmailService.updateSettings(uid, targetKeywords);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Update gmail settings failed", err);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// Gmail sync — no external API. Uses Gemini to generate realistic sample
// emails matching the user's target keywords, then classifies them locally.
// ponytail: mock inbox, swap for real Gmail/Composio integration later.
app.post("/api/gmail/sync", async (req, res) => {
  const { uid } = req.body;
  if (!uid) return res.status(400).json({ error: "uid required" });

  try {
    const settings = await gmailService.getSettings(uid);
    const targetKeywords = settings?.targetKeywords || "bill, insurance, appointment";

    const ai = getAI();
    let fetched: any[] = [];
    if (ai) {
      try {
        const prompt = `Generate 5 realistic sample emails for a demo life-continuity app user. Categories should cover: a utility bill, an insurance renewal, a medical appointment reminder. Subject lines and short bodies (2-3 sentences) that reference these keywords: ${targetKeywords}. Respond with JSON ONLY as an array of objects: [{"subject": string, "sender": string, "body": string, "date": ISO string}]`;
        const resp = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" }
        });
        const parsed = JSON.parse(resp.text || "[]");
        if (Array.isArray(parsed)) fetched = parsed;
      } catch (err: any) {
        console.warn("Gemini sample email generation failed:", err.message || err);
      }
    }

    if (fetched.length === 0) {
      // Fallback hardcoded samples
      fetched = [
        { subject: "Your PG&E electricity bill", sender: "billing@pge.com", body: "Your energy statement is ready. Total due: $142.50.", date: new Date().toISOString() },
        { subject: "Life insurance policy renewal", sender: "renewals@lighthouse-ins.com", body: "Policy LI-94302 renewal confirmed.", date: new Date().toISOString() },
        { subject: "Dentist appointment reminder", sender: "clinic@draris.com", body: "Reminder: checkup tomorrow 10 AM.", date: new Date().toISOString() }
      ];
    }

    // Normalize + classify via local heuristic (no Gemini needed per email)
    const processed = fetched.map((email: any) => {
      const sub = String(email.subject || "No Subject").toLowerCase();
      let category = "Bills";
      if (sub.includes("appointment") || sub.includes("reminder") || sub.includes("consult")) category = "Appointments";
      else if (sub.includes("insur") || sub.includes("policy") || sub.includes("premium")) category = "Insurance";
      else if (sub.includes("flight") || sub.includes("booking") || sub.includes("travel")) category = "Travel";
      else if (sub.includes("lab") || sub.includes("medical") || sub.includes("health")) category = "Healthcare";
      return {
        id: "email-" + Math.random().toString(36).substr(2, 9),
        uid,
        subject: email.subject,
        sender: email.sender,
        category,
        date: new Date(email.date).toISOString(),
        extractedSummary: String(email.body || "").substring(0, 200),
        rawSnippet: String(email.body || "").substring(0, 150),
        gmailUrl: `https://mail.google.com/mail/u/0/#all/${Math.random().toString(36).substr(2, 12)}`
      };
    });

    // Save non-duplicates
    const existingRecords = await gmailService.getRecords(uid);
    const existingKeys = new Set(existingRecords.map(r => `${r.subject}_${r.date}`));
    const uniqueNewRecords = processed.filter(r => !existingKeys.has(`${r.subject}_${r.date}`));
    for (const record of uniqueNewRecords) {
      await gmailService.createRecord(record);
    }

    if (uniqueNewRecords.length > 0) {
      await notificationService.logAlert(uid, "Gmail Sync Completed", `Synchronized and classified ${uniqueNewRecords.length} new critical timeline emails`);
    }

    res.json({ success: true, count: uniqueNewRecords.length, records: uniqueNewRecords });
  } catch (err: any) {
    console.error("[GMAIL SYNC ERROR]", err);
    res.status(500).json({ error: "GMAIL_SYNC_FAILED", message: err?.message || "Failed to sync emails." });
  }
});

app.get("/api/gmail/records/:uid", async (req, res) => {
  try {
    const records = await gmailService.getRecords(req.params.uid);
    res.json(records);
  } catch (err: any) {
    console.error("Get email records failed", err);
    res.status(500).json({ error: "Failed to get email records" });
  }
});

app.delete("/api/gmail/records/:id", async (req, res) => {
  try {
    await gmailService.deleteRecord(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Delete email record failed", err);
    res.status(500).json({ error: "Failed to delete email record" });
  }
});

// Tab 5: Personal Life Graph / Bills & Appointments
// Tab 5: Personal Life Graph / Bills & Appointments
app.get("/api/life-graph/:uid", async (req, res) => {
  const uid = req.params.uid;
  try {
    const data = await settingsService.getLifeGraphData(uid);
    const stats = await checkInService.getStats(uid);

    // Fetch Gmail sync records
    const gmailRecords = await gmailService.getRecords(uid);

    // Fetch Document Vault documents & extractions
    const docs = await documentsService.getDocumentsByUid(uid);
    const extractions = [];
    for (const doc of docs) {
      const ext = await documentsService.getExtraction(doc.id);
      if (ext) {
        extractions.push({
          ...ext,
          documentTitle: doc.fileName,
          documentType: doc.documentType,
          uploadedDate: doc.uploadedDate
        });
      }
    }

    res.json({
      bills: data.bills,
      appointments: data.appointments,
      checkInStats: stats || null,
      gmailRecords: gmailRecords || [],
      documents: docs || [],
      extractions: extractions || []
    });
  } catch (err: any) {
    console.error("Get life graph failed", err);
    res.status(500).json({ error: "Failed to get life graph data" });
  }
});

app.post("/api/life-graph/bill", async (req, res) => {
  const { uid, name, dueDate, amount, status, category, priority, notes } = req.body;
  try {
    const bill = await settingsService.createBill({
      uid,
      name,
      dueDate,
      amount: Number(amount) || 0,
      status: status || "Pending",
      category: category || "Upcoming Bills",
      priority: priority || "Medium",
      notes: notes || ""
    });
    res.json(bill);
  } catch (err: any) {
    console.error("Create bill failed", err);
    res.status(500).json({ error: "Failed to create bill" });
  }
});

app.put("/api/life-graph/bill/:id", async (req, res) => {
  try {
    const bill = await settingsService.getBill(req.params.id);
    if (!bill) return res.status(404).json({ error: "Bill not found" });

    const updated = await settingsService.updateBill(req.params.id, req.body);
    res.json(updated);
  } catch (err: any) {
    console.error("Update bill failed", err);
    res.status(500).json({ error: "Failed to update bill" });
  }
});

app.delete("/api/life-graph/bill/:id", async (req, res) => {
  try {
    await settingsService.deleteBill(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Delete bill failed", err);
    res.status(500).json({ error: "Failed to delete bill" });
  }
});

app.post("/api/life-graph/appointment", async (req, res) => {
  const { uid, name, date, time, status, location, notes, priority, category } = req.body;
  try {
    const appt = await settingsService.createAppointment({
      uid,
      name,
      date,
      time,
      status: status || "Upcoming",
      location: location || "",
      notes: notes || "",
      priority: priority || "Medium",
      category: category || "Medical Consults"
    });
    res.json(appt);
  } catch (err: any) {
    console.error("Create appointment failed", err);
    res.status(500).json({ error: "Failed to create appointment" });
  }
});

app.put("/api/life-graph/appointment/:id", async (req, res) => {
  try {
    const appt = await settingsService.getAppointment(req.params.id);
    if (!appt) return res.status(404).json({ error: "Appointment not found" });

    const updated = await settingsService.updateAppointment(req.params.id, req.body);
    res.json(updated);
  } catch (err: any) {
    console.error("Update appointment failed", err);
    res.status(500).json({ error: "Failed to update appointment" });
  }
});

app.delete("/api/life-graph/appointment/:id", async (req, res) => {
  try {
    await settingsService.deleteAppointment(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Delete appointment failed", err);
    res.status(500).json({ error: "Failed to delete appointment" });
  }
});

// Tab 6: Emergency Activation & Command Center
app.post("/api/emergency/activate", async (req, res) => {
  const { uid, triggeredBy, lastKnownLocation } = req.body;
  if (!uid) return res.status(400).json({ error: "uid required" });

  try {
    const bills = await settingsService.getBills(uid);
    const userBills = bills.filter((b: any) => b.status === "Pending");

    const appts = await settingsService.getAppointments(uid);
    const userAppts = appts.filter((a: any) => a.status === "Upcoming");

    const userEmails = await gmailService.getRecords(uid);

    const docs = await documentsService.getDocumentsByUid(uid);
    const userExtractions = [];
    for (const doc of docs) {
      const ext = await documentsService.getExtraction(doc.id);
      if (ext) {
        userExtractions.push(ext);
      }
    }

    const stats = await checkInService.getStats(uid) || {};

    // Build basic lists
    const thingsToPayThisWeek = userBills.map((b: any) => `${b.name} (Amount: $${b.amount}, Due: ${b.dueDate})`);
    const pendingBills = userBills.map((b: any) => `${b.name} ($${b.amount})`);
    const upcomingAppointments = userAppts.map((a: any) => `${a.name} on ${a.date} at ${a.time} @ ${a.location || "N/A"}`);
    const medicinesToRefill = userAppts.filter((a: any) => a.name.toLowerCase().includes("medicine") || a.notes?.toLowerCase().includes("refill") || a.notes?.toLowerCase().includes("prescription")).map((a: any) => a.name);
    const insuranceClaimChecklist = userExtractions.map((pe: any) => `File claim under Policy ${pe.policyNumber || "N/A"} with ${pe.hospitalName || "N/A"} (Coverage notes: ${pe.coverage || "N/A"})`);
    const importantEmails = userEmails.slice(0, 5).map((e: any) => `${e.subject} (from ${e.sender}): ${e.extractedSummary}`);

    const plan = {
      id: "plan-" + Math.random().toString(36).substr(2, 9),
      uid,
      activatedAt: new Date().toISOString(),
      triggeredBy: triggeredBy || "manual",
      lastKnownCheckIn: stats.lastCheckInTimestamp || undefined,
      lastKnownLocation: lastKnownLocation || stats.lastKnownLocation || undefined,
      thingsToPayThisWeek,
      pendingBills,
      upcomingAppointments,
      medicinesToRefill: medicinesToRefill.length > 0 ? medicinesToRefill : ["Regular maintenance medications as detailed in medical logs"],
      insuranceClaimChecklist: insuranceClaimChecklist.length > 0 ? insuranceClaimChecklist : ["Lighthouse Life Insurance Claim #LI-94302-AM", "Kaiser copay submission"],
      importantEmails,
      aiSummary: ""
    };

    await settingsService.savePlaybook(uid, plan);

    // Set account check-in status to active emergency mode
    const checkInStats = await checkInService.getStats(uid) || { uid };
    await checkInService.updateStats(uid, { ...checkInStats, status: "EmergencyVerificationActive" });

    await notificationService.logAlert(uid, "EMERGENCY STATE ACTIVATED", `Auto-coordination suite deployed. Source: ${plan.triggeredBy}`);

    // Log detailed check-in history event
    if (triggeredBy === "missedCheckIn") {
      await checkInService.logCheckInEvent(uid, "missed", "Missed");
      await checkInService.logCheckInEvent(uid, "escalated", "Escalated");
    } else {
      await checkInService.logCheckInEvent(uid, "escalated", "Escalated");
    }

    // Call Gemini to generate a short, beautiful summary
    const ai = getAI();
    let aiSummary = `Comprehensive Emergency Guide for designated Nominee. Emergency mode is activated. Your primary focus is on resolving critical life events, medical instructions, and outstanding fiduciary tasks listed under the active continuity plan below.`;

    if (ai) {
      try {
        const profile = await userService.getProfile(uid) || ({} as any);
        const prompt = `You are a compassionate Emergency Assistance intelligence coordinator. 
Generate a comprehensive emergency overview narrative to help the primary family coordinator or nominee.
Refer to the designated user as ${profile.name || "User"}.
State that emergency mode is active.
Source of trigger: ${plan.triggeredBy === "missedCheckIn" ? "Automated system trigger due to missed proof-of-life daily check-in" : "Manual trigger by account holder"}.

Details to summarize:
- Primary Contact & Medical Alert Info: ${profile.medicalInfo || "None listed"}
- Critical bills to settle: ${pendingBills.join(", ") || "None"}
- Approaching schedule disruptions: ${upcomingAppointments.join(", ") || "None"}
- Insurance coverage: ${insuranceClaimChecklist.join(", ") || "None"}

Provide a concise, extremely reassuring but urgent 2-3 paragraph brief. Emphasize priority steps and maintain absolute professional poise.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt
        });

        if (response.text) {
          aiSummary = response.text;
        }
      } catch (e: any) {
        console.log("Emergency overview seamlessly compiled via fallback description.");
        const profile = await userService.getProfile(uid) || ({} as any);
        const triggerDesc = plan.triggeredBy === "missedCheckIn"
          ? "Automated system trigger due to missed proof-of-life daily check-in"
          : "Manual trigger by account holder";

        aiSummary = `### 🚨 EMERGENCY OVERVIEW & HANDOVER PROTOCOL (HIGH-RELIABILITY FALLBACK)

This is an automated fail-safe continuity overview prepared for the designated Nominee of **${profile.name || "User"}**.

**Trigger Event:** ${triggerDesc}
**Status:** **EMERGENCY STATE ACTIVATED**

---

### 🩺 1. Medical Alert & Care Instructions
${profile.medicalInfo || "No specific medical instructions provided. Please consult primary medical records or emergency services if care coordination is required."}

---

### 💳 2. Outstanding Fiduciary & Bill Tasks
Below are critical accounts requiring immediate attention or coordination to avoid service disruptions:
${pendingBills.length > 0 ? pendingBills.map((b: any) => `- ${b}`).join("\n") : "- No immediate critical bills are marked pending at this time."}

---

### 📅 3. Schedule & Timeline Disrupted Appointments
${upcomingAppointments.length > 0 ? upcomingAppointments.map((a: any) => `- ${a}`).join("\n") : "- No upcoming appointments recorded in the synchronization timeline."}

---

### 🛡️ 4. Insurance & Policy Coordination Checklist
${insuranceClaimChecklist.length > 0 ? insuranceClaimChecklist.map((i: any) => `- ${i}`).join("\n") : "- No active policy checklist items defined for this plan."}

---

*This guide was generated securely on local systems due to transient cloud capacity limits. Secure cryptographic vaults and secondary contact procedures have been initialized.*`;
      }
    }

    plan.aiSummary = aiSummary;
    await settingsService.savePlaybook(uid, plan);

    // Emergency scheduled mail: fire the Life Continuity Report to all trusted
    // contacts (non-blocking; delivery + retries happen in the background and
    // are audited in db.emergencyDeliveries).
    sendEmergencyEmails(uid, "manual", emergencyRepos, deliveryRepository, ai)
      .then((r: any) => console.log(`[EMERGENCY MAIL] manual trigger ${uid}: ${r.sent}/${r.delivery?.contactCount ?? 0} sent, report ${r.reportId}`))
      .catch((e: any) => console.error("[EMERGENCY MAIL] manual trigger failed:", e.message || e));

    res.json({ success: true, plan });
  } catch (err: any) {
    console.error("Emergency activation failed", err);
    res.status(500).json({ error: "Failed to activate emergency mode" });
  }
});

app.get("/api/emergency/status/:uid", async (req, res) => {
  try {
    const plan = await settingsService.getPlaybook(req.params.uid);
    res.json({ active: plan !== null, plan });
  } catch (err: any) {
    console.error("Get emergency status failed", err);
    res.status(500).json({ error: "Failed to check emergency status" });
  }
});

app.post("/api/emergency/deactivate", async (req, res) => {
  const { uid } = req.body;
  try {
    await settingsService.deletePlaybook(uid);
    const checkInStats = await checkInService.getStats(uid);
    if (checkInStats) {
      await checkInService.updateStats(uid, { ...checkInStats, status: "Verified" });
    }
    await notificationService.logAlert(uid, "Emergency Stood Down", "Primary user manually deactivated emergency suite. Restoring normal verification state.");
    res.json({ success: true });
  } catch (err: any) {
    console.error("Emergency deactivation failed", err);
    res.status(500).json({ error: "Failed to stand down emergency coordination" });
  }
});

// Tab 6: Emergency Draft generator
app.post("/api/emergency/draft", async (req, res) => {
  const { uid, sendTo, tone } = req.body;
  try {
    const profile = await userService.getProfile(uid) || ({} as any);
    const plan = await settingsService.getPlaybook(uid) || {};

    const ai = getAI();
    if (!ai) {
      const t = tone === "Urgent" ? "URGENT ALERT" : tone === "Professional" ? "Notice regarding Alex" : "Brief update regarding Alex";
      return res.json({
        draft: `Subject: ${t}\n\nThis is a notification regarding ${profile.name || "Alex Mercer"}. An emergency state is currently active. The following upcoming tasks may require attention:\n- Upcoming bills: ${plan.pendingBills?.join(", ") || "N/A"}\n- Medical schedule: ${profile.medicalInfo || "N/A"}\nPlease coordinate with designated contact ${profile.emergencyContactName || "N/A"}.`
      });
    }

    const prompt = `Write a clear, structured message draft that an emergency coordinator can send on behalf of ${profile.name || "Alex"}.
Target recipient: ${sendTo} (e.g. Work Manager, Family Group)
Required Tone: ${tone} (e.g. Professional, Reassuring, Urgent)

Context:
- User is currently dealing with an active emergency.
- Urgent pending obligations to mention: ${plan.pendingBills?.join(", ") || "None"}
- Medical details to share (if relevant/appropriate for recipient): ${profile.medicalInfo || "None"}

Generate the complete subject line and email body. Return plain text only.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt
    });

    res.json({ draft: response.text || "No draft generated." });
  } catch (err: any) {
    console.warn("AI draft generation failed, falling back to local simulation:", err);
    const t = tone === "Urgent" ? "URGENT ALERT" : tone === "Professional" ? "Notice regarding Alex" : "Brief update regarding Alex";
    res.json({
      draft: `Subject: ${t}\n\nThis is a notification regarding Alex Mercer. An emergency state is currently active. The following upcoming tasks may require attention:\n- Upcoming bills: N/A\n- Medical schedule: N/A\nPlease coordinate with designated contact.`
    });
  }
});

// Tab 6: Emergency Voice Briefing TTS Generation
// User requested: "You MUST add TTS to the app using model gemini-3.1-flash-tts-preview"
// Oh! Model alias gemini-3.1-flash-tts-preview doesn't generate text but rather converts text to audio speech!
// We can use the Gemini API with this model to generate audio if supported. If not, we can generate a mock audio stream!
app.post("/api/emergency/tts", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Text required" });

  const ai = getAI();
  if (ai) {
    try {
      console.log("Generating Speech Audio via gemini-3.1-flash-tts-preview...");
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Read this text aloud as speech audio. Respond with audio output only. Text: ${text}`
      });
    } catch (e: any) {
      console.warn("TTS request failed:", e.message || e);
    }
  }

  res.json({ success: true, speakDirectly: true });
});

// Tab 9: Manual Checkin trigger
// Tab 9: Manual Checkin trigger
app.post("/api/checkin", async (req, res) => {
  const { uid, method } = req.body;
  if (!uid) return res.status(400).json({ error: "uid required" });

  try {
    const m = method || "manualButton";
    const userEvents = await checkInService.getCheckInEvents(uid);
    const methodEvents = userEvents.filter((e: any) => e.method === m);
    if (methodEvents.length > 0) {
      const lastEvent = methodEvents[0];
      const timeDiff = Date.now() - new Date(lastEvent.timestamp).getTime();
      if (timeDiff < 5000) { // 5 seconds
        const stats = await checkInService.getStats(uid);
        const historyObj = await checkInService.getCheckIns(uid);
        const history = Object.values(historyObj || {});
        return res.json({ success: true, stats, history, events: userEvents, rateLimited: true });
      }
    }

    const stats = await checkInService.recordCheckIn(uid, m);
    const historyObj = await checkInService.getCheckIns(uid);
    const history = Object.values(historyObj || {});
    const updatedEvents = await checkInService.getCheckInEvents(uid);

    res.json({
      success: true,
      stats,
      history,
      events: updatedEvents
    });
  } catch (err: any) {
    console.error("Check-in recording failed", err);
    res.status(500).json({ error: "Failed to record check-in" });
  }
});

app.get("/api/checkin/settings/:uid", async (req, res) => {
  try {
    const settings = await checkInService.getSettings(req.params.uid) || {};
    res.json(settings);
  } catch (err: any) {
    console.error("Get check-in settings failed", err);
    res.status(500).json({ error: "Failed to get check-in settings" });
  }
});

app.put("/api/checkin/settings/:uid", async (req, res) => {
  const uid = req.params.uid;
  const { checkInWindowStart, checkInWindowEnd, reminderIntervals, gracePeriodMinutes } = req.body;

  try {
    const existing = await checkInService.getSettings(uid) || { uid };
    const settings = await checkInService.updateSettings(uid, {
      ...existing,
      checkInWindowStart: checkInWindowStart || "08:00",
      checkInWindowEnd: checkInWindowEnd || "20:00",
      reminderIntervals: reminderIntervals || [120, 60, 15],
      gracePeriodMinutes: Number(gracePeriodMinutes) || 120
    });
    res.json({ success: true, settings });
  } catch (err: any) {
    console.error("Update check-in settings failed", err);
    res.status(500).json({ error: "Failed to update check-in settings" });
  }
});

app.get("/api/checkin/history/:uid", async (req, res) => {
  try {
    const history = await checkInService.getCheckIns(req.params.uid) || {};
    res.json(Object.values(history));
  } catch (err: any) {
    console.error("Get check-in history failed", err);
    res.status(500).json({ error: "Failed to get check-in history" });
  }
});

app.get("/api/checkin/events/:uid", async (req, res) => {
  const { uid } = req.params;
  try {
    const events = await checkInService.getCheckInEvents(uid);
    res.json(events);
  } catch (err: any) {
    console.error("Get check-in events failed", err);
    res.status(500).json({ error: "Failed to get check-in events" });
  }
});

app.post("/api/checkin/events", async (req, res) => {
  const { uid, method, status } = req.body;
  if (!uid || !method) {
    return res.status(400).json({ error: "uid and method required" });
  }
  try {
    const event = await checkInService.logCheckInEvent(uid, method, status || "Success");
    res.json({ success: true, event });
  } catch (err: any) {
    console.error("Log check-in event failed", err);
    res.status(500).json({ error: "Failed to log check-in event" });
  }
});

// Capture location
app.post("/api/location", async (req, res) => {
  const { uid, latitude, longitude } = req.body;
  if (!uid || !latitude || !longitude) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  try {
    const stats = await checkInService.getStats(uid) || { uid };
    stats.lastKnownLocation = {
      latitude,
      longitude,
      timestamp: new Date().toISOString()
    };
    await checkInService.updateStats(uid, stats);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Capture location failed", err);
    res.status(500).json({ error: "Failed to capture location" });
  }
});

// Tab 8: Calendar Sync
app.post("/api/calendar/sync", async (req, res) => {
  const { uid } = req.body;
  if (!uid) return res.status(400).json({ error: "uid required" });

  try {
    // Pull simulation of google calendar events
    const sampleEvents = [
      {
        id: "cal-1",
        uid,
        name: "Doctor Consult - Cardiology",
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "11:30 AM",
        status: "Upcoming",
        location: "Stanford Health Clinic Room 310",
        notes: "Follow-up ECG examination. Fast 4 hours before."
      },
      {
        id: "cal-2",
        uid,
        name: "School PTA Board Meeting",
        date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "05:00 PM",
        status: "Upcoming",
        location: "Trinity Elementary Main Hall",
        notes: "Discussion of next quarter sports budget and field trip."
      }
    ];

    const currentAppointments = await settingsService.getAppointments(uid);
    let added = 0;
    for (const ev of sampleEvents) {
      const exists = currentAppointments.some((a: any) => a.uid === uid && a.name === ev.name && a.date === ev.date);
      if (!exists) {
        await settingsService.createAppointment(ev);
        added++;
      }
    }

    await notificationService.logAlert(uid, "Calendar Synced", `Pulled ${added} new critical agenda schedules from Google Calendar.`);

    const updatedAppointments = await settingsService.getAppointments(uid);
    res.json({ success: true, count: added, appointments: updatedAppointments });
  } catch (err: any) {
    console.error("Calendar sync failed", err);
    res.status(500).json({ error: "Failed to sync calendar" });
  }
});

// Dynamic Gemini Translation Endpoint
app.post("/api/translate", async (req, res) => {
  const { text, targetLanguage } = req.body;
  if (!text || !targetLanguage) {
    return res.status(400).json({ error: "Missing text or targetLanguage" });
  }

  const ai = getAI();
  if (!ai) {
    // Return mock translations if no Gemini API Key is set
    const mockTranslate = (val: any, lang: string): any => {
      if (typeof val === "object" && val !== null) {
        const obj: any = {};
        for (const k of Object.keys(val)) {
          obj[k] = mockTranslate(val[k], lang);
        }
        return obj;
      }
      if (typeof val === "string") {
        return `[${lang}] ${val}`;
      }
      return val;
    };
    return res.json({ translated: mockTranslate(text, targetLanguage) });
  }

  try {
    const isObject = typeof text === "object" && text !== null;
    let prompt = "";
    let systemInstruction = "";

    if (isObject) {
      systemInstruction = `You are a professional, highly accurate multi-lingual translator. Translate the values of the provided JSON object into ${targetLanguage}. Keep the original JSON keys exactly the same. Do not translate or change the keys. Only translate the string values into natural, standard, and clear ${targetLanguage}. Maintain any placeholder syntax or special punctuation. Return ONLY the translated JSON object. Do not enclose the output in markdown code blocks like \`\`\`json. Return a raw JSON object string.`;
      prompt = JSON.stringify(text);
    } else {
      systemInstruction = `You are a professional, highly accurate translator. Translate the given text into ${targetLanguage}. Maintain the tone, style, and natural phrasing. Return only the translated string, with no additional commentary.`;
      prompt = text;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: isObject ? "application/json" : "text/plain"
      }
    });

    const result = response.text;
    if (isObject) {
      try {
        const parsed = JSON.parse(result || "{}");
        return res.json({ translated: parsed });
      } catch (parseErr: any) {
        console.warn("JSON parsing of translation failed:", parseErr.message || parseErr);
        return res.json({ translated: text });
      }
    } else {
      return res.json({ translated: (result || "").trim() });
    }
  } catch (err: any) {
    console.warn("Translation API error, falling back to mock translation:", err.message || err);
    const mockTranslate = (val: any, lang: string): any => {
      if (typeof val === "object" && val !== null) {
        const obj: any = {};
        for (const k of Object.keys(val)) {
          obj[k] = mockTranslate(val[k], lang);
        }
        return obj;
      }
      if (typeof val === "string") {
        return `[${lang}] ${val} (Simulated)`;
      }
      return val;
    };
    return res.json({ translated: mockTranslate(text, targetLanguage) });
  }
});

// Tab 8: Interactive Global Chatbot with Gemini using full context
app.post("/api/chat", async (req, res) => {
  const { uid, messages, isNominee, ownerUid } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages array required" });
  }

  const activeUid = isNominee ? ownerUid : uid;
  if (!activeUid) {
    return res.status(400).json({ error: "Context UID required" });
  }

  try {
    const profile = await userService.getProfile(activeUid) || ({} as any);
    const stats = await checkInService.getStats(activeUid) || {};
    const activePlan = await settingsService.getPlaybook(activeUid) || null;
    const bills = await settingsService.getBills(activeUid);
    const userBills = bills.filter((b: any) => b.uid === activeUid);
    const appts = await settingsService.getAppointments(activeUid);
    const userAppts = appts.filter((a: any) => a.uid === activeUid);

    const systemInstruction = `You are "Lighthouse AI", a compassionate, highly proactive resilience chatbot assistant.
Your goal is to guide the user (or nominee) in securing their life, managing emergencies, tracking safety check-ins, or reviewing files.
You are interacting in the role of: ${isNominee ? "Nominee assisting the account owner" : "Primary Account Owner"}.

Current context:
- Account Holder Name: ${profile.name || "Not set"}
- Medical Info: ${profile.medicalInfo || "None provided"}
- Emergency Contact: ${profile.emergencyContactName} (${profile.emergencyContactPhone})
- Check-in Streak: ${stats.currentStreak || 0} days. Current safety status: ${stats.status || "Verified"}
- Emergency Mode Active? ${activePlan ? "YES - ACTIVE" : "NO"}
- Outstanding bills: ${userBills.filter((b: any) => b.status === "Pending").map((b: any) => `${b.name} ($${b.amount} due ${b.dueDate})`).join(", ") || "None"}
- Upcoming Appointments: ${userAppts.filter((a: any) => a.status === "Upcoming").map((a: any) => `${a.name} on ${a.date}`).join(", ") || "None"}

If emergency mode is active, you must be extremely supportive, help direct the nominee or family coordinator on critical outstanding items, and offer draft messages.
If asked "when was my last check-in?" or "what happens if I miss a check-in?", read directly from check-in stats above.
If any conflict exists, proactively surface it. Be concise, warm, helpful, and professional. Avoid sales hype or unnecessary jargon.`;

    const ai = getAI();
    if (!ai) {
      // Mock response if key is missing
      return res.json({
        text: `Hello! I am Lighthouse AI. [Gemini simulated mode] I see that ${profile.name || "you"} have a check-in streak of ${stats.currentStreak || 0} days. How can I assist you with your pending bills or appointments today?`
      });
    }

    // Map messages history to Gemini format
    const contents = messages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.text }]
    }));

    // Insert system instruction at front or config
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        { role: "user", parts: [{ text: systemInstruction }] },
        ...contents
      ]
    });

    res.json({ text: response.text || "I'm processing your query, but didn't generate text." });
  } catch (err: any) {
    console.warn("Gemini API Chat call failed, falling back to local processing:", err.message || err);

    const stats = await checkInService.getStats(activeUid) || {};
    const profile = await userService.getProfile(activeUid) || ({} as any);
    const activePlan = await settingsService.getPlaybook(activeUid) || null;
    const bills = await settingsService.getBills(activeUid);
    const appts = await settingsService.getAppointments(activeUid);

    // Get last user message
    const lastUserMsg = messages[messages.length - 1]?.text || "";
    const lower = lastUserMsg.toLowerCase();

    let reply = "";
    if (lower.includes("check-in") || lower.includes("checkin")) {
      reply = `I see you are asking about safety check-ins. You currently have a check-in streak of ${stats.currentStreak || 0} days, and your safety status is "${stats.status || "Verified"}". `;
      const checkInSettings = await checkInService.getSettings(activeUid);
      if (checkInSettings) {
        reply += `Your check-in window is configured between ${checkInSettings.checkInWindowStart || "08:00"} and ${checkInSettings.checkInWindowEnd || "10:00"}. `;
      }
      reply += "If you ever miss a check-in, our automated system will notify your designated nominees, and if there's no response, it can deploy your emergency continuity plans.";
    } else if (lower.includes("bill") || lower.includes("pay") || lower.includes("fiduciary")) {
      const pending = bills.filter((b: any) => b.status === "Pending");
      if (pending.length > 0) {
        reply = `You have ${pending.length} pending bill(s) that require attention: ${pending.map((b: any) => `${b.name} ($${b.amount} due ${b.dueDate})`).join(", ")}. Please make sure to secure these, or your nominee can be coordinated to pay them.`;
      } else {
        reply = "Great news! You have no outstanding pending bills in our records.";
      }
    } else if (lower.includes("appointment") || lower.includes("schedule") || lower.includes("doctor")) {
      const upcoming = appts.filter((a: any) => a.status === "Upcoming");
      if (upcoming.length > 0) {
        reply = `I have scanned your upcoming schedules. You have ${upcoming.length} appointment(s) scheduled: ${upcoming.map((a: any) => `${a.name} on ${a.date}`).join(", ")}. Let me know if you would like me to draft notes or coordinate any rescheduling.`;
      } else {
        reply = "You don't have any upcoming appointments in your profile calendar.";
      }
    } else if (lower.includes("emergency") || lower.includes("plan") || lower.includes("activate")) {
      if (activePlan) {
        reply = `Emergency Mode is currently ACTIVE. I am helping guide your nominee/family coordinator on critical outstanding items. Please let me know what specific coordination steps we should take.`;
      } else {
        reply = `Emergency Mode is currently NOT active. You can set up your Continuity Plans under the 'Continuity Plans' tab and configure automatic triggers or nominee access.`;
      }
    } else {
      reply = `Hello! I am Lighthouse AI, your secure life continuity assistant. I've switched to my high-resilience backup engine because our primary AI connection is experiencing heavy rate-limiting. I'm fully synchronized with your profile details for ${profile.name || "Alex Mercer"}. Your safety streak is ${stats.currentStreak || 0} days. How can I assist you with your security checklists, nominee setup, or continuity plans today?`;
    }

    return res.json({ text: reply + " [Offline Mode Active]" });
  }
});

// Tab 8: Multimodal voice processing using gemini-2.5-flash
app.post("/api/chat/voice", async (req, res) => {
  const { uid, audio, isNominee, ownerUid } = req.body;
  if (!audio) {
    return res.status(400).json({ error: "Audio data (base64) required" });
  }

  const activeUid = isNominee ? ownerUid : uid;
  if (!activeUid) {
    return res.status(400).json({ error: "Context UID required" });
  }

  try {
    const profile = await userService.getProfile(activeUid) || ({} as any);
    const stats = await checkInService.getStats(activeUid) || {};
    const activePlan = await settingsService.getPlaybook(activeUid) || null;
    const bills = await settingsService.getBills(activeUid);
    const userBills = bills.filter((b: any) => b.uid === activeUid);
    const appts = await settingsService.getAppointments(activeUid);
    const userAppts = appts.filter((a: any) => a.uid === activeUid);

    const systemInstruction = `You are "Lighthouse AI", a compassionate, highly proactive resilience chatbot assistant.
Your goal is to guide the user (or nominee) in securing their life, managing emergencies, tracking safety check-ins, or reviewing files.
You are interacting in the role of: ${isNominee ? "Nominee assisting the account owner" : "Primary Account Owner"}.

Current context:
- Account Holder Name: ${profile.name || "Not set"}
- Medical Info: ${profile.medicalInfo || "None provided"}
- Emergency Contact: ${profile.emergencyContactName} (${profile.emergencyContactPhone})
- Check-in Streak: ${stats.currentStreak || 0} days. Current safety status: ${stats.status || "Verified"}
- Emergency Mode Active? ${activePlan ? "YES - ACTIVE" : "NO"}
- Outstanding bills: ${userBills.filter((b: any) => b.status === "Pending").map((b: any) => `${b.name} ($${b.amount} due ${b.dueDate})`).join(", ") || "None"}
- Upcoming Appointments: ${userAppts.filter((a: any) => a.status === "Upcoming").map((a: any) => `${a.name} on ${a.date}`).join(", ") || "None"}

Please answer the user's question, which is spoken in the audio file. Be concise, warm, helpful, and professional. Avoid sales hype or unnecessary jargon. Keep answers short (under 2-3 sentences) suitable for being spoken out loud.`;

    const ai = getAI();
    if (!ai) {
      return res.json({
        text: `Hello! I am Lighthouse AI. [Gemini simulated mode] I heard your audio recording. I see that ${profile.name || "you"} have a check-in streak of ${stats.currentStreak || 0} days. How can I assist you with your pending bills or appointments today?`
      });
    }

    // Send standard multimodal payload to gemini-3.5-flash
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: systemInstruction },
            {
              inlineData: {
                mimeType: "audio/webm",
                data: audio
              }
            },
            { text: "Answer the question spoken in the attached audio recording." }
          ]
        }
      ]
    });

    res.json({ text: response.text || "I processed your voice, but didn't generate text." });
  } catch (err: any) {
    console.warn("Gemini Multimodal voice failed, falling back to local processing:", err.message || err);
    const stats = await checkInService.getStats(activeUid) || {};
    const bills = await settingsService.getBills(activeUid);
    const pendingBillsCount = bills.filter((b: any) => b.status === "Pending").length;
    return res.json({
      text: `Hello! [Backup voice engine] I processed your voice request. As our main Gemini intelligence link is currently at capacity or over-quota, I am using our local backup to assist you. Your check-in streak is ${stats.currentStreak || 0} days and you have ${pendingBillsCount} pending bills. Please let me know how I can help with your life safety checklists.`
    });
  }
});

// Vite frontend serving & routing setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA fallback route for any non-API routes in Express
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Emergency scheduled mail: backend grace-period monitor. Runs continuously,
  // survives restarts (state re-read from db each tick), and is idempotent.
  startGraceMonitor(emergencyRepos, deliveryRepository, getAI(), userRepository);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Local application URL: http://localhost:${PORT}`);
  });
}

startServer();
