import type { Person } from "./Person";

export interface Doctor extends Person {
  readonly role: "doctor";
  readonly specialty: string;
  readonly licenseNumber: string;
}
