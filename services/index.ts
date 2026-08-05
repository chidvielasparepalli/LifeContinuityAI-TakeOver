import {
  userRepository,
  documentRepository,
  nomineeRepository,
  emailRepository,
  settingsRepository,
  alertRepository
} from "../repositories";
import { UserService } from "./user.service";
import { NomineeService } from "./nominee.service";
import { GmailService } from "./gmail.service";
import { DocumentsService } from "./documents.service";
import { CheckInService } from "./checkin.service";
import { MonitoringService } from "./monitoring.service";
import { NotificationService } from "./notification.service";
import { SettingsService } from "./settings.service";

export const userService = new UserService(userRepository);
export const nomineeService = new NomineeService(nomineeRepository);
export const gmailService = new GmailService(emailRepository);
export const documentsService = new DocumentsService(documentRepository);
export const notificationService = new NotificationService(alertRepository);
export const checkInService = new CheckInService(settingsRepository, alertRepository);
export const monitoringService = new MonitoringService(settingsRepository);
export const settingsService = new SettingsService(settingsRepository);

export * from "./user.service";
export * from "./nominee.service";
export * from "./gmail.service";
export * from "./documents.service";
export * from "./checkin.service";
export * from "./monitoring.service";
export * from "./notification.service";
export * from "./settings.service";
export * from "./emergency.service";
