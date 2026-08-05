import { JSONUserRepository } from "./UserRepository";
import { JSONDocumentRepository } from "./DocumentRepository";
import { JSONNomineeRepository } from "./NomineeRepository";
import { JSONEmailRepository } from "./EmailRepository";
import { JSONSettingsRepository } from "./SettingsRepository";
import { JSONAlertRepository } from "./AlertRepository";
import { JSONDeliveryRepository } from "./EmailDeliveryRepository";

export const userRepository = new JSONUserRepository();
export const documentRepository = new JSONDocumentRepository();
export const nomineeRepository = new JSONNomineeRepository();
export const emailRepository = new JSONEmailRepository();
export const settingsRepository = new JSONSettingsRepository();
export const alertRepository = new JSONAlertRepository();
export const deliveryRepository = new JSONDeliveryRepository();

export * from "./db";
export * from "./UserRepository";
export * from "./DocumentRepository";
export * from "./NomineeRepository";
export * from "./EmailRepository";
export * from "./SettingsRepository";
export * from "./AlertRepository";
export * from "./EmailDeliveryRepository";
