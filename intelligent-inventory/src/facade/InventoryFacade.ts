// Facade Pattern: Provides a simplified, unified interface to the inventory system.
// Hides the complexity of factories, repositories, adapters, strategies, and observers.

import { InventoryConfig } from "../config/InventoryConfig";
import { ProductFactory, CreateProductParams } from "../factory/ProductFactory";
import { Product, ProductCategory } from "../models/Product";
import { InMemoryProductRepository } from "../repositories/InMemoryProductRepository";
import { ProductRepository } from "../repositories/ProductRepository";
import { InventoryManager, ReorderResult } from "../core/InventoryManager";
import { StockObserver } from "../observers/StockObserver";
import { EmailAlert } from "../observers/EmailAlert";
import { SMSAlert } from "../observers/SMSAlert";
import { ReorderStrategy } from "../strategies/ReorderStrategy";
import { FixedReorderStrategy } from "../strategies/FixedReorderStrategy";
import { Supplier } from "../adapters/Supplier";
import { SupplierAdapter } from "../adapters/SupplierAdapter";
import { ExternalSupplierAPI } from "../adapters/ExternalSupplierAPI";

export class InventoryFacade {
  private readonly config: InventoryConfig;
  private readonly repository: ProductRepository;
  private readonly manager: InventoryManager;

  constructor(supplier?: Supplier, strategy?: ReorderStrategy) {
    this.config = InventoryConfig.getInstance();

    this.repository = new InMemoryProductRepository();

    // Default supplier via adapter wrapping an external API
    const defaultSupplier =
      supplier ??
      new SupplierAdapter(
        new ExternalSupplierAPI("DEFAULT-SUP"),
        "Default Supplier",
      );

    const defaultStrategy = strategy ?? new FixedReorderStrategy();

    this.manager = new InventoryManager(
      this.repository,
      defaultStrategy,
      defaultSupplier,
    );

    // Register default alert channels
    this.manager.addObserver(new EmailAlert());
    this.manager.addObserver(new SMSAlert());

    console.log(`[FACADE] ${this.config.systemName} initialized`);
    console.log(
      `[FACADE] Min stock threshold: ${this.config.minStockThreshold}`,
    );
  }

  // Simplified product registration using the factory
  registerProduct(
    id: string,
    name: string,
    category: ProductCategory,
    quantity: number,
    unitPrice: number,
  ): Product {
    const params: CreateProductParams = {
      id,
      name,
      category,
      quantity,
      unitPrice,
    };

    const product = ProductFactory.create(params);
    this.manager.addProduct(product);
    return product;
  }

  // Update stock level for a product; triggers alerts and reorder if needed
  updateProductStock(
    productId: string,
    newQuantity: number,
  ): ReorderResult | null {
    return this.manager.updateStock(productId, newQuantity);
  }

  // Scan entire inventory and reorder any products below threshold
  monitorInventory(): ReorderResult[] {
    console.log("\n=== INVENTORY MONITORING SCAN ===");
    const results = this.manager.monitorInventory();
    console.log(`=== SCAN COMPLETE: ${results.length} reorder(s) placed ===\n`);
    return results;
  }

  // Runtime configuration adjustments
  setStockThreshold(threshold: number): void {
    this.config.minStockThreshold = threshold;
    console.log(`[FACADE] Stock threshold updated to: ${threshold}`);
  }

  setReorderQuantity(quantity: number): void {
    this.config.defaultReorderQuantity = quantity;
    console.log(`[FACADE] Default reorder quantity updated to: ${quantity}`);
  }

  // Switch reorder strategy at runtime
  setReorderStrategy(strategy: ReorderStrategy): void {
    this.manager.setReorderStrategy(strategy);
  }

  // Switch supplier at runtime
  setSupplier(supplier: Supplier): void {
    this.manager.setSupplier(supplier);
  }

  // Add a custom alert observer
  addAlertChannel(observer: StockObserver): void {
    this.manager.addObserver(observer);
  }

  // Retrieve product details
  getProduct(id: string): Product | undefined {
    return this.manager.getProduct(id);
  }

  listAllProducts(): Product[] {
    return this.manager.getAllProducts();
  }

  // Print a formatted inventory report
  printInventoryReport(): void {
    const products = this.manager.getAllProducts();
    const threshold = this.config.minStockThreshold;

    console.log("\n========== INVENTORY REPORT ==========");
    console.log(`Total products: ${products.length}`);
    console.log(`Stock threshold: ${threshold}\n`);

    for (const product of products) {
      const status = product.quantity < threshold ? "!! LOW STOCK !!" : "OK";
      console.log(
        `  ${product.toString()} | Storage: ${product.getStorageRequirements()} | Status: ${status}`,
      );
    }

    console.log("=======================================\n");
  }
}
