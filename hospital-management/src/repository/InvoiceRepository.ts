// Invoice repository

import type { Invoice } from "../models/Invoice";
import { InMemoryRepository } from "./Repository";

export class InvoiceRepository extends InMemoryRepository<Invoice> {
  findByPatientId(patientId: string): Invoice[] {
    return this.findAll().filter((i) => i.patientId === patientId);
  }
}
