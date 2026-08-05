import { ISettingsRepository } from "../repositories/SettingsRepository";

export class SettingsService {
  constructor(private settingsRepository: ISettingsRepository) {}

  async getLifeGraphData(uid: string) {
    let bills = await this.settingsRepository.getBillsByUid(uid);
    if (bills.length === 0) {
      const defaultBills = [
        {
          id: "bill-1-" + uid + "-" + Math.random().toString(36).substr(2, 5),
          uid,
          name: "PG&E Electricity & Gas",
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          amount: 142.50,
          status: "Pending",
          category: "Upcoming Bills",
          priority: "Medium",
          notes: "Monthly utilities for electricity and gas heating."
        },
        {
          id: "bill-2-" + uid + "-" + Math.random().toString(36).substr(2, 5),
          uid,
          name: "Comcast Xfinity Internet",
          dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          amount: 85.00,
          status: "Pending",
          category: "Upcoming Bills",
          priority: "Low",
          notes: "High-speed broadband internet subscription fee."
        },
        {
          id: "bill-3-" + uid + "-" + Math.random().toString(36).substr(2, 5),
          uid,
          name: "Chase Auto Loan Amortization",
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          amount: 350.00,
          status: "Pending",
          category: "Loans/EMIs",
          priority: "High",
          notes: "Auto-debit loan payment for household vehicle."
        },
        {
          id: "bill-4-" + uid + "-" + Math.random().toString(36).substr(2, 5),
          uid,
          name: "Trinity School Fees",
          dueDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          amount: 400.00,
          status: "Pending",
          category: "School Fees",
          priority: "Medium",
          notes: "Quarterly tuition fee payment."
        }
      ];
      for (const bill of defaultBills) {
        await this.settingsRepository.createBill(bill);
      }
      bills = defaultBills;
    }

    let appointments = await this.settingsRepository.getAppointmentsByUid(uid);
    if (appointments.length === 0) {
      const defaultAppointments = [
        {
          id: "appt-1-" + uid + "-" + Math.random().toString(36).substr(2, 5),
          uid,
          name: "Routine Dental Care & Cleaning",
          date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          time: "10:00 AM",
          status: "Upcoming",
          location: "Apex Dentistry Suite 2B",
          priority: "Medium",
          category: "Medical Consults",
          notes: "Bi-annual teeth cleaning and visual dental exam."
        },
        {
          id: "appt-2-" + uid + "-" + Math.random().toString(36).substr(2, 5),
          uid,
          name: "Kaiser Pediatrician Consult (Emma)",
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          time: "02:30 PM",
          status: "Upcoming",
          location: "Pediatrics Desk A, Kaiser Permanente",
          priority: "High",
          category: "Medical Consults",
          notes: "Routine vaccination and physical growth checkup."
        }
      ];
      for (const appt of defaultAppointments) {
        await this.settingsRepository.createAppointment(appt);
      }
      appointments = defaultAppointments;
    }

    return { bills, appointments };
  }

  // Bills
  async getBills(uid: string) {
    return this.settingsRepository.getBillsByUid(uid);
  }

  async getBill(id: string) {
    return this.settingsRepository.getBillById(id);
  }

  async createBill(bill: any) {
    if (!bill.uid || !bill.name || !bill.dueDate || bill.amount === undefined) {
      throw new Error("Missing billing details");
    }
    const newBill = {
      id: "bill-" + Math.random().toString(36).substr(2, 9),
      status: "Pending",
      category: "Upcoming Bills",
      ...bill
    };
    return this.settingsRepository.createBill(newBill);
  }

  async updateBill(id: string, billDetails: any) {
    return this.settingsRepository.updateBill(id, billDetails);
  }

  async deleteBill(id: string) {
    return this.settingsRepository.deleteBill(id);
  }

  // Appointments
  async getAppointments(uid: string) {
    return this.settingsRepository.getAppointmentsByUid(uid);
  }

  async getAppointment(id: string) {
    return this.settingsRepository.getAppointmentById(id);
  }

  async createAppointment(appt: any) {
    if (!appt.uid || !appt.name || !appt.date || !appt.time) {
      throw new Error("Missing appointment details");
    }
    const newAppt = {
      id: "appt-" + Math.random().toString(36).substr(2, 9),
      status: "Upcoming",
      ...appt
    };
    return this.settingsRepository.createAppointment(newAppt);
  }

  async updateAppointment(id: string, apptDetails: any) {
    return this.settingsRepository.updateAppointment(id, apptDetails);
  }

  async deleteAppointment(id: string) {
    return this.settingsRepository.deleteAppointment(id);
  }

  // Playbooks / Continuity Plans
  async getPlaybook(uid: string) {
    return this.settingsRepository.getContinuityPlan(uid);
  }

  async savePlaybook(uid: string, playbook: any) {
    return this.settingsRepository.saveContinuityPlan(uid, playbook);
  }

  async deletePlaybook(uid: string) {
    return this.settingsRepository.deleteContinuityPlan(uid);
  }
}
