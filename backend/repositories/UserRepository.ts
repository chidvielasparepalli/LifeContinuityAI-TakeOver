import { DatabaseSchema, loadDb, saveDb } from "./db";

export interface IUserRepository {
  create(user: any): Promise<any>;
  getById(uid: string): Promise<any | null>;
  getByEmail(email: string): Promise<any | null>;
  getAll(): Promise<any[]>;
  update(uid: string, user: any): Promise<any>;
  delete(uid: string): Promise<boolean>;
  exists(uid: string): Promise<boolean>;

  createEmergencyProfile(uid: string, profile: any): Promise<any>;
  getEmergencyProfile(uid: string): Promise<any | null>;
  getEmergencyProfileByNomineePhone(phone: string): Promise<any | null>;
  updateEmergencyProfile(uid: string, profile: any): Promise<any>;
  deleteEmergencyProfile(uid: string): Promise<boolean>;
}

export class JSONUserRepository implements IUserRepository {
  async create(user: any): Promise<any> {
    const db = loadDb();
    db.users[user.uid] = user;
    saveDb(db);
    return user;
  }

  async getById(uid: string): Promise<any | null> {
    const db = loadDb();
    return db.users[uid] || null;
  }

  async getByEmail(email: string): Promise<any | null> {
    const db = loadDb();
    const user = Object.values(db.users).find(
      (u: any) => u.email.toLowerCase() === email.toLowerCase()
    );
    return user || null;
  }

  async getAll(): Promise<any[]> {
    const db = loadDb();
    return Object.values(db.users);
  }

  async update(uid: string, user: any): Promise<any> {
    const db = loadDb();
    if (!db.users[uid]) {
      throw new Error(`User not found: ${uid}`);
    }
    db.users[uid] = { ...db.users[uid], ...user, uid };
    saveDb(db);
    return db.users[uid];
  }

  async delete(uid: string): Promise<boolean> {
    const db = loadDb();
    if (db.users[uid]) {
      delete db.users[uid];
      saveDb(db);
      return true;
    }
    return false;
  }

  async exists(uid: string): Promise<boolean> {
    const db = loadDb();
    return !!db.users[uid];
  }

  async createEmergencyProfile(uid: string, profile: any): Promise<any> {
    const db = loadDb();
    db.emergencyProfiles[uid] = { ...profile, uid };
    saveDb(db);
    return db.emergencyProfiles[uid];
  }

  async getEmergencyProfile(uid: string): Promise<any | null> {
    const db = loadDb();
    return db.emergencyProfiles[uid] || null;
  }

  async getEmergencyProfileByNomineePhone(phone: string): Promise<any | null> {
    const db = loadDb();
    const profile = Object.values(db.emergencyProfiles).find(
      (p: any) => p.nomineePhone === phone
    );
    return profile || null;
  }

  async updateEmergencyProfile(uid: string, profile: any): Promise<any> {
    const db = loadDb();
    db.emergencyProfiles[uid] = { ...db.emergencyProfiles[uid], ...profile, uid };
    saveDb(db);
    return db.emergencyProfiles[uid];
  }

  async deleteEmergencyProfile(uid: string): Promise<boolean> {
    const db = loadDb();
    if (db.emergencyProfiles[uid]) {
      delete db.emergencyProfiles[uid];
      saveDb(db);
      return true;
    }
    return false;
  }
}
