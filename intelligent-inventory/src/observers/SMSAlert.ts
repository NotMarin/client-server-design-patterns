// Concrete Observer: Simulates sending an SMS alert for low stock

import { Product } from "../models/Product";
import { StockObserver } from "./StockObserver";

export class SMSAlert implements StockObserver {
  update(product: Product, currentStock: number, threshold: number): void {
    console.log(
      `[SMS ALERT] Product "${product.name}" (ID: ${product.id}) ` +
        `stock is ${currentStock}, below threshold of ${threshold}. ` +
        `Sending SMS to operations team.`,
    );
  }
}
