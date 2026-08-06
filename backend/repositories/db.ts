import fs from "fs";
import path from "path";

export interface EmergencyProfile {
  // Life Streak Monitoring
  emergencyNomineeName: string;
  emergencyNomineeEmail: string;
  streakDuration: number; // in days
  gracePeriod: number; // in hours
  lastActiveTimestamp: number; // unix timestamp
  currentStreakStatus: 'Safe' | 'Awaiting Confirmation' | 'Emergency Suspected';
  confirmationSentTimestamp?: number;
  statusChangedAt?: number; // unix timestamp of last state transition (audit/display)
  // Legacy profile fields (persisted on the same record)
  uid?: string;
  name?: string;
  age?: number;
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  medicalInfo?: string;
  nomineePin?: string;
  nomineePhone?: string;
  nomineeName?: string;
  trustedContacts?: any[];
  lastNomineeActive?: string;
}

export interface DatabaseSchema {
  users: Record<string, any>;
  emergencyProfiles: Record<string, EmergencyProfile>;
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
