import fs from "fs";
import path from "path";

export interface DatabaseSchema {
  users: Record<string, any>;
  emergencyProfiles: Record<string, any>;
  securityAlerts: any[];
  documents: any[];
  policyExtractions: any[];
  emailRecords: any[];
  bills: any[];
  appointments: any[];
  checkIns: Record<string, Record<string, any>>; // uid -> { date: entry }
  checkInStats: Record<string, any>;
  checkInSettings: Record<string, any>;
  continuityPlans: Record<string, any>;
  sessions: any[];
  checkInEvents?: any[];
  emergencyDeliveries?: any[];
}

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(process.cwd(), "db.json");

export function loadDb(): DatabaseSchema {
  if (fs.existsSync(DB_PATH)) {
    try {
      const db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
      if (!db.checkInEvents) {
        db.checkInEvents = [];
      }
      if (!db.emergencyDeliveries) {
        db.emergencyDeliveries = [];
      }
      return db;
    } catch (e) {
      console.error("Error reading database file, resetting", e);
    }
  }
  return {
    users: {},
    emergencyProfiles: {},
    securityAlerts: [],
    documents: [],
    policyExtractions: [],
    emailRecords: [],
    bills: [],
    appointments: [],
    checkIns: {},
    checkInStats: {},
    checkInSettings: {},
    continuityPlans: {},
    sessions: [],
    checkInEvents: [],
    emergencyDeliveries: []
  };
}

export function saveDb(db: DatabaseSchema) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}
