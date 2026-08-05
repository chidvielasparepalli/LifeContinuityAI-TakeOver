import { DatabaseSchema, loadDb, saveDb } from "./db";

export interface IDeliveryRepository {
  getDelivery(uid: string, trigger: string): Promise<any | null>;
  getDeliveries(): Promise<any[]>;
  createDelivery(delivery: any): Promise<any>;
  updateDelivery(id: string, patch: any): Promise<any>;
  addContactRecord(deliveryId: string, record: any): Promise<any>;
  addLog(deliveryId: string, message: string, level?: string): Promise<void>;
}

export class JSONDeliveryRepository implements IDeliveryRepository {
  async getDelivery(uid: string, trigger: string): Promise<any | null> {
    const db = loadDb();
    const found = (db.emergencyDeliveries || []).find(
      (d: any) => d.uid === uid && d.trigger === trigger
    );
    return found || null;
  }

  async getDeliveries(): Promise<any[]> {
    const db = loadDb();
    return db.emergencyDeliveries || [];
  }

  async createDelivery(delivery: any): Promise<any> {
    const db = loadDb();
    if (!db.emergencyDeliveries) {
      db.emergencyDeliveries = [];
    }
    db.emergencyDeliveries.push(delivery);
    saveDb(db);
    return delivery;
  }

  async updateDelivery(id: string, patch: any): Promise<any> {
    const db = loadDb();
    const idx = (db.emergencyDeliveries || []).findIndex((d: any) => d.id === id);
    if (idx === -1) throw new Error(`Delivery not found: ${id}`);
    db.emergencyDeliveries[idx] = { ...db.emergencyDeliveries[idx], ...patch };
    saveDb(db);
    return db.emergencyDeliveries[idx];
  }

  async addContactRecord(deliveryId: string, record: any): Promise<any> {
    const db = loadDb();
    const delivery = (db.emergencyDeliveries || []).find((d: any) => d.id === deliveryId);
    if (!delivery) throw new Error(`Delivery not found: ${deliveryId}`);
    delivery.contactRecords = delivery.contactRecords || [];
    delivery.contactRecords.push(record);
    saveDb(db);
    return record;
  }

  async addLog(deliveryId: string, message: string, level: string = "info"): Promise<void> {
    const db = loadDb();
    const delivery = (db.emergencyDeliveries || []).find((d: any) => d.id === deliveryId);
    if (delivery) {
      delivery.logs = delivery.logs || [];
      delivery.logs.push({ level, message, timestamp: new Date().toISOString() });
      saveDb(db);
    }
  }
}
