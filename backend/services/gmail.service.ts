import { IEmailRepository } from "../repositories/EmailRepository";

export class GmailService {
  constructor(private emailRepository: IEmailRepository) {}

  async getSettings(uid: string) {
    return this.emailRepository.getSettings(uid);
  }

  async updateSettings(uid: string, targetKeywords: string) {
    return this.emailRepository.updateSettings(uid, targetKeywords);
  }

  async getRecords(uid: string) {
    return this.emailRepository.getRecordsByUid(uid);
  }

  async deleteRecord(id: string) {
    return this.emailRepository.deleteRecord(id);
  }

  async createRecord(record: any) {
    return this.emailRepository.createRecord(record);
  }
}
