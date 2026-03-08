// Concrete Strategy: Adjusts reorder quantity based on the current month.
// Applies a seasonal multiplier (e.g., higher in December for holiday demand).

import { Product } from "../models/Product";
import { ReorderStrategy } from "./ReorderStrategy";
import { InventoryConfig } from "../config/InventoryConfig";

export class SeasonalReorderStrategy implements ReorderStrategy {
  readonly name = "Seasonal Reorder";

  // Monthly multipliers: index 0 = January, 11 = December
  private readonly seasonalMultipliers: readonly number[] = [
    1.0, 1.0, 1.0, 1.1, 1.1, 1.2, 1.0, 1.0, 1.1, 1.2, 1.5, 2.0,
  ];

  calculateReorderQuantity(_product: Product, currentStock: number): number {
    const config = InventoryConfig.getInstance();
    const month = new Date().getMonth(); // 0-based
    const multiplier = this.seasonalMultipliers[month] ?? 1.0;

    const baseQuantity = config.defaultReorderQuantity;
    const deficit = Math.max(0, config.minStockThreshold - currentStock);

    // Scale the larger of base quantity or deficit by the seasonal factor
    return Math.ceil(Math.max(baseQuantity, deficit) * multiplier);
  }
}
