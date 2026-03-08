// Patient-specific repository with domain queries

import type { Patient } from "../models/Patient";
import type { BillingType } from "../models/Patient";
import { InMemoryRepository } from "./Repository";

export class PatientRepository extends InMemoryRepository<Patient> {
  findByBillingType(billingType: BillingType): Patient[] {
    return this.findAll().filter((p) => p.billingType === billingType);
  }

  findByName(name: string): Patient[] {
    const lower = name.toLowerCase();
    return this.findAll().filter((p) => p.name.toLowerCase().includes(lower));
  }
}
