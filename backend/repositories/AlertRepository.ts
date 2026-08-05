import { DatabaseSchema, loadDb, saveDb } from "./db";

export interface IAlertRepository {
  createAlert(alert: any): Promise<any>;
  getAlertsByUid(uid: string): Promise<any[]>;
}

export class JSONAlertRepository implements IAlertRepository {
  async createAlert(alert: any): Promise<any> {
    const db = loadDb();
    db.securityAlerts.unshift(alert);
    saveDb(db);
    return alert;
  }

  async getAlertsByUid(uid: string): Promise<any[]> {
    const db = loadDb();
    return db.securityAlerts.filter((a: any) => a.uid === uid);
  }
}
