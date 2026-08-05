import { IUserRepository } from "../repositories/UserRepository";

export class UserService {
  constructor(private userRepository: IUserRepository) {}

  async getUser(uid: string) {
    return this.userRepository.getById(uid);
  }

  async getUserByEmail(email: string) {
    return this.userRepository.getByEmail(email);
  }

  async getAllUsers() {
    return this.userRepository.getAll();
  }

  async createUser(user: any) {
    if (!user.uid) throw new Error("Missing uid for user creation");
    if (!user.email) throw new Error("Missing email for user creation");
    return this.userRepository.create(user);
  }

  async updateUser(uid: string, userDetails: any) {
    return this.userRepository.update(uid, userDetails);
  }

  async deleteUser(uid: string) {
    return this.userRepository.delete(uid);
  }

  async exists(uid: string) {
    return this.userRepository.exists(uid);
  }

  // Emergency Profile Methods
  async getProfile(uid: string) {
    return this.userRepository.getEmergencyProfile(uid);
  }

  async createProfile(uid: string, profile: any) {
    return this.userRepository.createEmergencyProfile(uid, profile);
  }

  async updateProfile(uid: string, profileDetails: any) {
    return this.userRepository.updateEmergencyProfile(uid, profileDetails);
  }

  async deleteProfile(uid: string) {
    return this.userRepository.deleteEmergencyProfile(uid);
  }
}
