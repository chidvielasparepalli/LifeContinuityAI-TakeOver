import { ISettingsRepository } from "../repositories/SettingsRepository";

export class MonitoringService {
  constructor(private settingsRepository: ISettingsRepository) {}

  async getSessions(uid: string) {
    return this.settingsRepository.getSessionsByUid(uid);
  }

  async createSession(uid: string, device: string, location: string) {
    const session = {
      id: "sess-" + Math.random().toString(36).substr(2, 9),
      uid,
      device: device || "Unknown Device",
      location: location || "Unknown Location",
      lastActive: new Date().toISOString()
    };
    return this.settingsRepository.addSession(session);
  }

  async revokeSession(sessionId: string) {
    return this.settingsRepository.deleteSession(sessionId);
  }
}
