// Simulates an external supplier API with a non-standard interface.
// This represents a third-party system we cannot modify.

export interface ExternalOrderResponse {
  readonly order_id: string;
  readonly item_code: string;
  readonly qty_confirmed: number;
  readonly status: "ACCEPTED" | "REJECTED";
}

export class ExternalSupplierAPI {
  private readonly supplierCode: string;

  constructor(supplierCode: string) {
    this.supplierCode = supplierCode;
  }

  // Third-party method with a different signature than our Supplier interface
  submitPurchaseOrder(
    itemCode: string,
    requestedQty: number,
  ): ExternalOrderResponse {
    console.log(
      `[EXTERNAL API - ${this.supplierCode}] ` +
        `Submitting PO for item "${itemCode}", qty: ${requestedQty}`,
    );

    return {
      order_id: `PO-${this.supplierCode}-${Date.now()}`,
      item_code: itemCode,
      qty_confirmed: requestedQty,
      status: "ACCEPTED",
    };
  }

  // Third-party availability check with different naming conventions
  checkItemAvailability(itemCode: string): boolean {
    console.log(
      `[EXTERNAL API - ${this.supplierCode}] ` +
        `Checking availability for "${itemCode}"`,
    );
    // Simulated: always available
    return true;
  }

  getSupplierCode(): string {
    return this.supplierCode;
  }
}
