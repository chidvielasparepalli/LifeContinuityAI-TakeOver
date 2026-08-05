import { DatabaseSchema, loadDb, saveDb } from "./db";

export interface INomineeRepository {
  getByPhone(phone: string): Promise<any | null>;
  updateNomineeActivity(ownerUid: string): Promise<any>;
}

export class JSONNomineeRepository implements INomineeRepository {
  async getByPhone(phone: string): Promise<any | null> {
    const db = loadDb();
    const profile = Object.values(db.emergencyProfiles).find(
      (p: any) => p.nomineePhone === phone
    );
    return profile || null;
  }

  async updateNomineeActivity(ownerUid: string): Promise<any> {
    const db = loadDb();
    if (db.emergencyProfiles[ownerUid]) {
      db.emergencyProfiles[ownerUid].lastNomineeActive = new Date().toISOString();
      saveDb(db);
      return db.emergencyProfiles[ownerUid];
    }
    throw new Error(`Profile not found for user: ${ownerUid}`);
  }
}
