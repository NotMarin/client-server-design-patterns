// Appointment repository with schedule-related queries

import type { Appointment } from "../models/Appointment";
import { InMemoryRepository } from "./Repository";

export class AppointmentRepository extends InMemoryRepository<Appointment> {
  findByPatientId(patientId: string): Appointment[] {
    return this.findAll().filter((a) => a.patientId === patientId);
  }

  findByDoctorId(doctorId: string): Appointment[] {
    return this.findAll().filter((a) => a.doctorId === doctorId);
  }

  findByDate(date: string): Appointment[] {
    return this.findAll().filter((a) => a.date === date);
  }
}
