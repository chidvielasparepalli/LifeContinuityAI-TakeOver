import { IAlertRepository } from "../repositories/AlertRepository";

export class NotificationService {
  constructor(private alertRepository: IAlertRepository) {}

  async logAlert(uid: string, event: string, details: string) {
    const alert = {
      id: "alert-" + Math.random().toString(36).substr(2, 9),
      uid,
      timestamp: new Date().toISOString(),
      event,
      details
    };
    return this.alertRepository.createAlert(alert);
  }

  async getAlerts(uid: string) {
    return this.alertRepository.getAlertsByUid(uid);
  }

  async triggerEmergencyNotification(phone: string, message: string) {
    console.log(`[SMS/WHATSAPP SIMULATION LOG] Dispatching alert to ${phone}. Message: "${message}"`);
    return { success: true, timestamp: new Date().toISOString() };
  }
}
