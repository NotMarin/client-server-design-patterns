// Singleton Pattern: Centralized configuration for the inventory system.
// Ensures all modules share the same configuration instance.

export class InventoryConfig {
  private static instance: InventoryConfig | null = null;

  private _minStockThreshold: number;
  private _defaultReorderQuantity: number;
  private _systemName: string;

  private constructor() {
    this._minStockThreshold = 10;
    this._defaultReorderQuantity = 50;
    this._systemName = "Intelligent Inventory System";
  }

  // Returns the single shared instance, creating it on first access
  static getInstance(): InventoryConfig {
    if (!InventoryConfig.instance) {
      InventoryConfig.instance = new InventoryConfig();
    }
    return InventoryConfig.instance;
  }

  get minStockThreshold(): number {
    return this._minStockThreshold;
  }

  // Allows runtime adjustment of the stock threshold
  set minStockThreshold(value: number) {
    if (value < 0) {
      throw new Error("Stock threshold cannot be negative");
    }
    this._minStockThreshold = value;
  }

  get defaultReorderQuantity(): number {
    return this._defaultReorderQuantity;
  }

  set defaultReorderQuantity(value: number) {
    if (value <= 0) {
      throw new Error("Reorder quantity must be positive");
    }
    this._defaultReorderQuantity = value;
  }

  get systemName(): string {
    return this._systemName;
  }
}
