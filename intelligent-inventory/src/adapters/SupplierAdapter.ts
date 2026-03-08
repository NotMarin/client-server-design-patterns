// Adapter Pattern: Wraps the ExternalSupplierAPI to conform to our Supplier interface.
// Translates between the external API's protocol and our internal contract.

import { Supplier, SupplierOrder } from "./Supplier";
import { ExternalSupplierAPI } from "./ExternalSupplierAPI";

export class SupplierAdapter implements Supplier {
  private readonly externalApi: ExternalSupplierAPI;
  readonly name: string;

  constructor(externalApi: ExternalSupplierAPI, name: string) {
    this.externalApi = externalApi;
    this.name = name;
  }

  placeOrder(
    productId: string,
    productName: string,
    quantity: number,
  ): SupplierOrder {
    // Delegate to the external API, adapting parameter names
    const response = this.externalApi.submitPurchaseOrder(productId, quantity);

    if (response.status !== "ACCEPTED") {
      throw new Error(
        `Supplier "${this.name}" rejected order for product ${productId}`,
      );
    }

    return {
      productId,
      productName,
      quantity: response.qty_confirmed,
      supplierName: this.name,
    };
  }

  isAvailable(productId: string): boolean {
    return this.externalApi.checkItemAvailability(productId);
  }
}
