// Adapter Pattern: Uniform supplier interface.
// All supplier adapters implement this contract so the system
// is decoupled from any specific supplier's API.

export interface SupplierOrder {
  readonly productId: string;
  readonly productName: string;
  readonly quantity: number;
  readonly supplierName: string;
}

export interface Supplier {
  readonly name: string;

  // Places a reorder with the supplier and returns confirmed order details
  placeOrder(
    productId: string,
    productName: string,
    quantity: number,
  ): SupplierOrder;

  // Checks if the supplier can fulfill the requested product
  isAvailable(productId: string): boolean;
}
