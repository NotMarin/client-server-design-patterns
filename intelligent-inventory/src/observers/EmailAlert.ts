// Concrete Observer: Simulates sending an email alert for low stock

import { Product } from "../models/Product";
import { StockObserver } from "./StockObserver";

export class EmailAlert implements StockObserver {
  update(product: Product, currentStock: number, threshold: number): void {
    console.log(
      `[EMAIL ALERT] Product "${product.name}" (ID: ${product.id}) ` +
        `stock is ${currentStock}, below threshold of ${threshold}. ` +
        `Sending email notification to warehouse manager.`,
    );
  }
}
