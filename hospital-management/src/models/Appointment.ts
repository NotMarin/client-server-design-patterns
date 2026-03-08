export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "cancelled"
  | "completed";

export interface Appointment {
  readonly id: string;
  readonly patientId: string;
  readonly doctorId: string;
  readonly date: string;
  readonly reason: string;
  status: AppointmentStatus;
}
