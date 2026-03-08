export interface Invoice {
  readonly id: string;
  readonly patientId: string;
  readonly appointmentId: string;
  readonly date: string;
  readonly baseAmount: number;
  readonly discount: number;
  readonly totalAmount: number;
  readonly billingMethod: string;
}
