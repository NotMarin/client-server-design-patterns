// Clinical record repository with patient history queries

import type { ClinicalRecord } from "../models/ClinicalRecord";
import { InMemoryRepository } from "./Repository";

export class ClinicalRecordRepository extends InMemoryRepository<ClinicalRecord> {
  findByPatientId(patientId: string): ClinicalRecord[] {
    return this.findAll().filter((r) => r.patientId === patientId);
  }

  findByDoctorId(doctorId: string): ClinicalRecord[] {
    return this.findAll().filter((r) => r.doctorId === doctorId);
  }
}
