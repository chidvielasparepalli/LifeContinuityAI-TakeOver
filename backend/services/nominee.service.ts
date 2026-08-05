import { INomineeRepository } from "../repositories/NomineeRepository";

export class NomineeService {
  constructor(private nomineeRepository: INomineeRepository) {}

  async getNomineeByPhone(phone: string) {
    if (!phone) throw new Error("Phone number is required");
    return this.nomineeRepository.getByPhone(phone);
  }

  async verifyNomineeLogin(phone: string, otp: string, pin: string) {
    if (!phone || !otp || !pin) {
      throw new Error("Missing credentials");
    }

    if (otp !== "7777") {
      throw new Error("Invalid SMS OTP");
    }

    const profile = await this.nomineeRepository.getByPhone(phone);
    if (!profile) {
      throw new Error("No primary account found designating this phone number as Nominee");
    }

    if (profile.nomineePin !== pin) {
      throw new Error("Invalid Nominee Access PIN");
    }

    // Success! Update activity timestamp.
    await this.nomineeRepository.updateNomineeActivity(profile.uid);

    return {
      role: "nominee",
      ownerUid: profile.uid,
      ownerName: profile.name,
      nomineePhone: phone
    };
  }

  async logNomineeOtpRequest(phone: string) {
    if (!phone) throw new Error("Phone number required");
    const profile = await this.nomineeRepository.getByPhone(phone);
    if (!profile) {
      throw new Error("No primary account found designating this phone number as Nominee");
    }
    console.log(`[SMS OTP TRIGGER] Nominee request phone: ${phone}. OTP sent: 7777`);
    return { success: true, message: "OTP sent to registered phone number. Code: 7777 (Sandbox Demo mode)" };
  }
}
