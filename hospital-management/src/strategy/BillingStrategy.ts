// Strategy pattern: encapsulates billing algorithms for different patient types
// New billing methods can be added by implementing BillingStrategy

export interface BillingResult {
  readonly baseAmount: number;
  readonly discount: number;
  readonly totalAmount: number;
  readonly method: string;
}

// Each billing strategy calculates costs differently
export interface BillingStrategy {
  readonly name: string;
  calculate(baseAmount: number): BillingResult;
}

// Full price — no insurance or agreement
export class PrivateBilling implements BillingStrategy {
  readonly name = "private";

  calculate(baseAmount: number): BillingResult {
    return {
      baseAmount,
      discount: 0,
      totalAmount: baseAmount,
      method: "Private - Full payment",
    };
  }
}

// Insurance covers a percentage of the cost
export class InsuranceBilling implements BillingStrategy {
  readonly name = "insurance";
  private readonly coveragePercentage: number;

  constructor(coveragePercentage: number = 80) {
    this.coveragePercentage = coveragePercentage;
  }

  calculate(baseAmount: number): BillingResult {
    const discount = baseAmount * (this.coveragePercentage / 100);
    return {
      baseAmount,
      discount,
      totalAmount: baseAmount - discount,
      method: `Insurance - ${this.coveragePercentage}% coverage`,
    };
  }
}

// Institutional agreement with a fixed discount
export class AgreementBilling implements BillingStrategy {
  readonly name = "agreement";
  private readonly discountPercentage: number;

  constructor(discountPercentage: number = 50) {
    this.discountPercentage = discountPercentage;
  }

  calculate(baseAmount: number): BillingResult {
    const discount = baseAmount * (this.discountPercentage / 100);
    return {
      baseAmount,
      discount,
      totalAmount: baseAmount - discount,
      method: `Agreement - ${this.discountPercentage}% discount`,
    };
  }
}

// Context class that delegates to the current strategy
export class BillingContext {
  private strategy: BillingStrategy;

  constructor(strategy: BillingStrategy) {
    this.strategy = strategy;
  }

  setStrategy(strategy: BillingStrategy): void {
    this.strategy = strategy;
  }

  calculateBill(baseAmount: number): BillingResult {
    return this.strategy.calculate(baseAmount);
  }
}
