// Represents a single entry in a patient's clinical history
export interface ClinicalRecord {
  readonly id: string;
  readonly patientId: string;
  readonly doctorId: string;
  readonly date: string;
  readonly diagnosis: string;
  readonly treatment: string;
  readonly notes: string;
}
