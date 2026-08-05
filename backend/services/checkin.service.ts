import { ISettingsRepository } from "../repositories/SettingsRepository";
import { IAlertRepository } from "../repositories/AlertRepository";

export class CheckInService {
  constructor(
    private settingsRepository: ISettingsRepository,
    private alertRepository: IAlertRepository
  ) {}

  async getSettings(uid: string) {
    return this.settingsRepository.getCheckInSettings(uid);
  }

  async updateSettings(uid: string, settings: any) {
    return this.settingsRepository.updateCheckInSettings(uid, settings);
  }

  async getStats(uid: string) {
    return this.settingsRepository.getCheckInStats(uid);
  }

  async updateStats(uid: string, stats: any) {
    return this.settingsRepository.updateCheckInStats(uid, stats);
  }

  async getCheckIns(uid: string) {
    return this.settingsRepository.getCheckIns(uid);
  }

  async getCheckInEvents(uid: string) {
    return this.settingsRepository.getCheckInEvents(uid);
  }

  async logCheckInEvent(uid: string, method: string, status: "Success" | "Pending" | "Missed" | "Failed" | "Escalated" = "Success") {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toLocaleTimeString("en-US", { hour12: true });

    let methodLabel = "Check-In";
    if (method === "login") methodLabel = "App Login";
    else if (method === "manualButton") methodLabel = "Manual \"I'm Safe\"";
    else if (method === "pushAction") methodLabel = "Push Notification";
    else if (method === "smsReply") methodLabel = "SMS Reply";
    else if (method === "missed") methodLabel = "Missed Check-In";
    else if (method === "failed") methodLabel = "Failed Check-In";
    else if (method === "escalated") methodLabel = "Escalated Protocol";

    const event = {
      id: "evt-" + Math.random().toString(36).substr(2, 9),
      uid,
      timestamp: now.toISOString(),
      date: dateStr,
      time: timeStr,
      method,
      methodLabel,
      status
    };

    await this.settingsRepository.addCheckInEvent(event);

    return event;
  }

  async recordCheckIn(uid: string, method: string) {
    const todayStr = new Date().toISOString().split("T")[0];
    const checkIns = await this.settingsRepository.getCheckIns(uid);

    // If already checked in today, do nothing (idempotent)
    if (checkIns[todayStr]) {
      return this.settingsRepository.getCheckInStats(uid);
    }

    // Create entry
    const entry = {
      date: todayStr,
      timestamp: new Date().toISOString(),
      method
    };
    await this.settingsRepository.saveCheckIn(uid, todayStr, entry);

    // Update streak metrics
    let stats = await this.settingsRepository.getCheckInStats(uid);
    if (!stats) {
      stats = {
        uid,
        currentStreak: 1,
        longestStreak: 1,
        lastCheckInDate: todayStr,
        lastCheckInTimestamp: new Date().toISOString(),
        status: "Verified",
        lastKnownLocation: null
      };
    } else {
      const lastDateStr = stats.lastCheckInDate;
      let newStreak = stats.currentStreak;

      if (lastDateStr) {
        const lastDate = new Date(lastDateStr);
        const today = new Date(todayStr);
        const diffTime = Math.abs(today.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 1) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }

      stats.currentStreak = newStreak;
      stats.longestStreak = Math.max(stats.longestStreak, newStreak);
      stats.lastCheckInDate = todayStr;
      stats.lastCheckInTimestamp = new Date().toISOString();

      const wasEmergency = stats.status === "EmergencyVerificationActive" || stats.status === "Unverified";
      stats.status = "Verified";

      if (wasEmergency) {
        await this.alertRepository.createAlert({
          id: "alert-" + Math.random().toString(36).substr(2, 9),
          uid,
          timestamp: new Date().toISOString(),
          event: "Emergency Verification Cancelled",
          details: "Check-in received from user. Standing down active emergency state."
        });
      }
    }

    // Populate telemetry
    let batteryLevel = 82;
    let isCharging = false;
    if (method === "login") {
      batteryLevel = 94;
      isCharging = true;
    } else if (method === "smsReply") {
      batteryLevel = 58;
      isCharging = false;
    } else if (method === "pushAction") {
      batteryLevel = 19;
      isCharging = false;
    } else if (method === "manualButton") {
      batteryLevel = 76;
      isCharging = true;
    }

    const existingLoc = stats.lastKnownLocation;
    stats.lastKnownLocation = {
      latitude: existingLoc?.latitude || (37.7749 + (Math.random() - 0.5) * 0.02),
      longitude: existingLoc?.longitude || (-122.4194 + (Math.random() - 0.5) * 0.02),
      timestamp: new Date().toISOString(),
      batteryLevel,
      isCharging
    };

    const updatedStats = await this.settingsRepository.updateCheckInStats(uid, stats);
    
    // Log detailed check-in activity event
    await this.logCheckInEvent(uid, method, "Success");

    return updatedStats;
  }
}
