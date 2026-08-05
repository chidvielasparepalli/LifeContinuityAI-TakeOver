import { DatabaseSchema, loadDb, saveDb } from "./db";

export interface ISettingsRepository {
  // Check-In Settings & Stats
  getCheckInSettings(uid: string): Promise<any | null>;
  updateCheckInSettings(uid: string, settings: any): Promise<any>;
  getCheckInStats(uid: string): Promise<any | null>;
  updateCheckInStats(uid: string, stats: any): Promise<any>;

  // Check-Ins & Check-In Events
  getCheckIns(uid: string): Promise<Record<string, any>>;
  saveCheckIn(uid: string, date: string, entry: any): Promise<any>;
  getCheckInEvents(uid: string): Promise<any[]>;
  addCheckInEvent(event: any): Promise<any>;

  // Sessions (Active Monitoring)
  getSessionsByUid(uid: string): Promise<any[]>;
  addSession(session: any): Promise<any>;
  deleteSession(sessionId: string): Promise<boolean>;

  // Bills (Life Graph)
  getBillsByUid(uid: string): Promise<any[]>;
  getBillById(id: string): Promise<any | null>;
  createBill(bill: any): Promise<any>;
  updateBill(id: string, bill: any): Promise<any>;
  deleteBill(id: string): Promise<boolean>;

  // Appointments (Life Graph)
  getAppointmentsByUid(uid: string): Promise<any[]>;
  getAppointmentById(id: string): Promise<any | null>;
  createAppointment(appt: any): Promise<any>;
  updateAppointment(id: string, appt: any): Promise<any>;
  deleteAppointment(id: string): Promise<boolean>;

  // Continuity Plans (Playbooks)
  getContinuityPlan(uid: string): Promise<any | null>;
  saveContinuityPlan(uid: string, plan: any): Promise<any>;
  deleteContinuityPlan(uid: string): Promise<boolean>;
}

export class JSONSettingsRepository implements ISettingsRepository {
  // Check-In Settings & Stats
  async getCheckInSettings(uid: string): Promise<any | null> {
    const db = loadDb();
    return db.checkInSettings[uid] || null;
  }

  async updateCheckInSettings(uid: string, settings: any): Promise<any> {
    const db = loadDb();
    db.checkInSettings[uid] = { ...db.checkInSettings[uid], ...settings, uid };
    saveDb(db);
    return db.checkInSettings[uid];
  }

  async getCheckInStats(uid: string): Promise<any | null> {
    const db = loadDb();
    return db.checkInStats[uid] || null;
  }

  async updateCheckInStats(uid: string, stats: any): Promise<any> {
    const db = loadDb();
    db.checkInStats[uid] = { ...db.checkInStats[uid], ...stats, uid };
    saveDb(db);
    return db.checkInStats[uid];
  }

  // Check-Ins & Check-In Events
  async getCheckIns(uid: string): Promise<Record<string, any>> {
    const db = loadDb();
    return db.checkIns[uid] || {};
  }

  async saveCheckIn(uid: string, date: string, entry: any): Promise<any> {
    const db = loadDb();
    if (!db.checkIns[uid]) {
      db.checkIns[uid] = {};
    }
    db.checkIns[uid][date] = entry;
    saveDb(db);
    return entry;
  }

  async getCheckInEvents(uid: string): Promise<any[]> {
    const db = loadDb();
    return (db.checkInEvents || []).filter((e: any) => e.uid === uid);
  }

  async addCheckInEvent(event: any): Promise<any> {
    const db = loadDb();
    if (!db.checkInEvents) {
      db.checkInEvents = [];
    }
    db.checkInEvents.push(event);
    saveDb(db);
    return event;
  }

  // Sessions (Active Monitoring)
  async getSessionsByUid(uid: string): Promise<any[]> {
    const db = loadDb();
    return db.sessions.filter((s: any) => s.uid === uid);
  }

  async addSession(session: any): Promise<any> {
    const db = loadDb();
    db.sessions.push(session);
    saveDb(db);
    return session;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const db = loadDb();
    const initialLength = db.sessions.length;
    db.sessions = db.sessions.filter((s: any) => s.id !== sessionId);
    if (db.sessions.length < initialLength) {
      saveDb(db);
      return true;
    }
    return false;
  }

  // Bills (Life Graph)
  async getBillsByUid(uid: string): Promise<any[]> {
    const db = loadDb();
    return db.bills.filter((b: any) => b.uid === uid);
  }

  async getBillById(id: string): Promise<any | null> {
    const db = loadDb();
    const bill = db.bills.find((b: any) => b.id === id);
    return bill || null;
  }

  async createBill(bill: any): Promise<any> {
    const db = loadDb();
    db.bills.push(bill);
    saveDb(db);
    return bill;
  }

  async updateBill(id: string, bill: any): Promise<any> {
    const db = loadDb();
    const index = db.bills.findIndex((b: any) => b.id === id);
    if (index === -1) {
      throw new Error(`Bill not found: ${id}`);
    }
    db.bills[index] = { ...db.bills[index], ...bill, id };
    saveDb(db);
    return db.bills[index];
  }

  async deleteBill(id: string): Promise<boolean> {
    const db = loadDb();
    const initialLength = db.bills.length;
    db.bills = db.bills.filter((b: any) => b.id !== id);
    if (db.bills.length < initialLength) {
      saveDb(db);
      return true;
    }
    return false;
  }

  // Appointments (Life Graph)
  async getAppointmentsByUid(uid: string): Promise<any[]> {
    const db = loadDb();
    return db.appointments.filter((a: any) => a.uid === uid);
  }

  async getAppointmentById(id: string): Promise<any | null> {
    const db = loadDb();
    const appt = db.appointments.find((a: any) => a.id === id);
    return appt || null;
  }

  async createAppointment(appt: any): Promise<any> {
    const db = loadDb();
    db.appointments.push(appt);
    saveDb(db);
    return appt;
  }

  async updateAppointment(id: string, appt: any): Promise<any> {
    const db = loadDb();
    const index = db.appointments.findIndex((a: any) => a.id === id);
    if (index === -1) {
      throw new Error(`Appointment not found: ${id}`);
    }
    db.appointments[index] = { ...db.appointments[index], ...appt, id };
    saveDb(db);
    return db.appointments[index];
  }

  async deleteAppointment(id: string): Promise<boolean> {
    const db = loadDb();
    const initialLength = db.appointments.length;
    db.appointments = db.appointments.filter((a: any) => a.id !== id);
    if (db.appointments.length < initialLength) {
      saveDb(db);
      return true;
    }
    return false;
  }

  // Continuity Plans (Playbooks)
  async getContinuityPlan(uid: string): Promise<any | null> {
    const db = loadDb();
    return db.continuityPlans[uid] || null;
  }

  async saveContinuityPlan(uid: string, plan: any): Promise<any> {
    const db = loadDb();
    db.continuityPlans[uid] = plan;
    saveDb(db);
    return plan;
  }

  async deleteContinuityPlan(uid: string): Promise<boolean> {
    const db = loadDb();
    if (db.continuityPlans[uid]) {
      delete db.continuityPlans[uid];
      saveDb(db);
      return true;
    }
    return false;
  }
}
