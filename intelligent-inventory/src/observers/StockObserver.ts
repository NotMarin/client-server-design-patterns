// Observer Pattern: Interface for stock alert observers.
// Any new alert channel implements this contract.

import { Product } from "../models/Product";

export interface StockObserver {
  // Called when a product's stock falls below the configured threshold
  update(product: Product, currentStock: number, threshold: number): void;
}
