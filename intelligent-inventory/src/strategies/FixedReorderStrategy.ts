// Concrete Strategy: Always reorders a fixed quantity regardless of context

import { Product } from "../models/Product";
import { ReorderStrategy } from "./ReorderStrategy";
import { InventoryConfig } from "../config/InventoryConfig";

export class FixedReorderStrategy implements ReorderStrategy {
  readonly name = "Fixed Reorder";

  calculateReorderQuantity(_product: Product, _currentStock: number): number {
    return InventoryConfig.getInstance().defaultReorderQuantity;
  }
}
