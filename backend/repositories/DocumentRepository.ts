import { DatabaseSchema, loadDb, saveDb } from "./db";

export interface IDocumentRepository {
  create(doc: any): Promise<any>;
  getById(id: string): Promise<any | null>;
  getByUid(uid: string): Promise<any[]>;
  getAll(): Promise<any[]>;
  update(id: string, doc: any): Promise<any>;
  delete(id: string): Promise<boolean>;
  
  createExtraction(extraction: any): Promise<any>;
  getExtractionByDocId(docId: string): Promise<any | null>;
  updateExtraction(docId: string, extraction: any): Promise<any>;
}

export class JSONDocumentRepository implements IDocumentRepository {
  async create(doc: any): Promise<any> {
    const db = loadDb();
    db.documents.push(doc);
    saveDb(db);
    return doc;
  }

  async getById(id: string): Promise<any | null> {
    const db = loadDb();
    const doc = db.documents.find((d: any) => d.id === id);
    return doc || null;
  }

  async getByUid(uid: string): Promise<any[]> {
    const db = loadDb();
    return db.documents.filter((d: any) => d.uid === uid);
  }

  async getAll(): Promise<any[]> {
    const db = loadDb();
    return db.documents;
  }

  async update(id: string, doc: any): Promise<any> {
    const db = loadDb();
    const index = db.documents.findIndex((d: any) => d.id === id);
    if (index === -1) {
      throw new Error(`Document not found: ${id}`);
    }
    db.documents[index] = { ...db.documents[index], ...doc, id };
    saveDb(db);
    return db.documents[index];
  }

  async delete(id: string): Promise<boolean> {
    const db = loadDb();
    const initialLength = db.documents.length;
    db.documents = db.documents.filter((d: any) => d.id !== id);
    if (db.documents.length < initialLength) {
      // Also delete related extraction if exists
      db.policyExtractions = db.policyExtractions.filter((e: any) => e.documentId !== id);
      saveDb(db);
      return true;
    }
    return false;
  }

  async createExtraction(extraction: any): Promise<any> {
    const db = loadDb();
    db.policyExtractions.push(extraction);
    saveDb(db);
    return extraction;
  }

  async getExtractionByDocId(docId: string): Promise<any | null> {
    const db = loadDb();
    const extraction = db.policyExtractions.find((e: any) => e.documentId === docId);
    return extraction || null;
  }

  async updateExtraction(docId: string, extraction: any): Promise<any> {
    const db = loadDb();
    const index = db.policyExtractions.findIndex((e: any) => e.documentId === docId);
    if (index === -1) {
      // Create it if not exists
      const newExtraction = { ...extraction, documentId: docId };
      db.policyExtractions.push(newExtraction);
      saveDb(db);
      return newExtraction;
    }
    db.policyExtractions[index] = { ...db.policyExtractions[index], ...extraction, documentId: docId };
    saveDb(db);
    return db.policyExtractions[index];
  }
}
