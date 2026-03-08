// Strategy Pattern: Interface for reorder algorithms.
// Each strategy calculates the quantity to reorder for a product.

import { Product } from "../models/Product";

export interface ReorderStrategy {
  readonly name: string;

  // Returns the quantity to reorder based on current stock and product context
  calculateReorderQuantity(product: Product, currentStock: number): number;
}
