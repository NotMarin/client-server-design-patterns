import type { Person } from "./Person";

// Billing types determine the strategy used for invoicing
export type BillingType = "private" | "insurance" | "agreement";

export interface Patient extends Person {
  readonly role: "patient";
  readonly dateOfBirth: string;
  readonly billingType: BillingType;
  readonly insuranceId?: string;
}
