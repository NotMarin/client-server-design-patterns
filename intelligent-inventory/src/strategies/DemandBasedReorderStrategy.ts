// Concrete Strategy: Calculates reorder quantity based on simulated historical demand.
// Multiplies a demand factor by the deficit to fill above threshold.

import { Product } from "../models/Product";
import { ReorderStrategy } from "./ReorderStrategy";
import { InventoryConfig } from "../config/InventoryConfig";

export class DemandBasedReorderStrategy implements ReorderStrategy {
  readonly name = "Demand-Based Reorder";

  private readonly demandMultiplier: number;

  constructor(demandMultiplier: number = 2.0) {
    this.demandMultiplier = demandMultiplier;
  }

  calculateReorderQuantity(_product: Product, currentStock: number): number {
    const threshold = InventoryConfig.getInstance().minStockThreshold;
    const deficit = Math.max(0, threshold - currentStock);
    // Order enough to cover the deficit scaled by demand factor
    return Math.ceil(deficit * this.demandMultiplier);
  }
}
