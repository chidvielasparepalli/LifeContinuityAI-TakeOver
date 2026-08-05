import { DatabaseSchema, loadDb, saveDb } from "./db";

export interface IEmailRepository {
  createRecord(record: any): Promise<any>;
  getRecordsByUid(uid: string): Promise<any[]>;
  getSettings(uid: string): Promise<any>;
  updateSettings(uid: string, targetKeywords: string): Promise<any>;
  deleteRecord(id: string): Promise<void>;
}

export class JSONEmailRepository implements IEmailRepository {
  async createRecord(record: any): Promise<any> {
    const db = loadDb();
    db.emailRecords.push(record);
    saveDb(db);
    return record;
  }

  async getRecordsByUid(uid: string): Promise<any[]> {
    const db = loadDb();
    return db.emailRecords.filter((r: any) => r.uid === uid);
  }

  async getSettings(uid: string): Promise<any> {
    const db = loadDb();
    return db.checkInSettings[uid] || { uid };
  }

  async updateSettings(uid: string, targetKeywords: string): Promise<any> {
    const db = loadDb();
    if (!db.checkInSettings[uid]) {
      db.checkInSettings[uid] = { uid };
    }
    db.checkInSettings[uid].targetKeywords = targetKeywords || "";
    saveDb(db);
    return db.checkInSettings[uid];
  }

  async deleteRecord(id: string): Promise<void> {
    const db = loadDb();
    db.emailRecords = db.emailRecords.filter((r: any) => r.id !== id);
    saveDb(db);
  }
}
