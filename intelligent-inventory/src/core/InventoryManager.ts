// Core module: Manages inventory operations and coordinates Observer notifications.
// Acts as the subject in the Observer pattern, notifying alerts on low stock.

import { Product } from "../models/Product";
import { ProductRepository } from "../repositories/ProductRepository";
import { StockObserver } from "../observers/StockObserver";
import { ReorderStrategy } from "../strategies/ReorderStrategy";
import { Supplier, SupplierOrder } from "../adapters/Supplier";
import { InventoryConfig } from "../config/InventoryConfig";

export interface ReorderResult {
  readonly product: Product;
  readonly quantityOrdered: number;
  readonly order: SupplierOrder;
  readonly strategyUsed: string;
}

export class InventoryManager {
  private readonly repository: ProductRepository;
  private readonly observers: StockObserver[] = [];
  private reorderStrategy: ReorderStrategy;
  private supplier: Supplier;

  constructor(
    repository: ProductRepository,
    reorderStrategy: ReorderStrategy,
    supplier: Supplier,
  ) {
    this.repository = repository;
    this.reorderStrategy = reorderStrategy;
    this.supplier = supplier;
  }

  // Observer management: subscribe an alert channel
  addObserver(observer: StockObserver): void {
    this.observers.push(observer);
  }

  removeObserver(observer: StockObserver): void {
    const index = this.observers.indexOf(observer);
    if (index !== -1) {
      this.observers.splice(index, 1);
    }
  }

  // Notify all registered observers about low stock
  private notifyObservers(product: Product, currentStock: number): void {
    const threshold = InventoryConfig.getInstance().minStockThreshold;
    for (const observer of this.observers) {
      observer.update(product, currentStock, threshold);
    }
  }

  // Allows switching the reorder strategy at runtime
  setReorderStrategy(strategy: ReorderStrategy): void {
    console.log(`[INVENTORY] Reorder strategy changed to: ${strategy.name}`);
    this.reorderStrategy = strategy;
  }

  setSupplier(supplier: Supplier): void {
    console.log(`[INVENTORY] Supplier changed to: ${supplier.name}`);
    this.supplier = supplier;
  }

  addProduct(product: Product): void {
    this.repository.save(product);
    console.log(`[INVENTORY] Product registered: ${product.toString()}`);
  }

  getProduct(id: string): Product | undefined {
    return this.repository.findById(id);
  }

  getAllProducts(): Product[] {
    return this.repository.findAll();
  }

  // Updates stock and triggers alerts + reorder if below threshold
  updateStock(productId: string, newQuantity: number): ReorderResult | null {
    const product = this.repository.findById(productId);
    if (!product) {
      throw new Error(`Product "${productId}" not found`);
    }

    product.quantity = newQuantity;
    this.repository.update(product);

    const threshold = InventoryConfig.getInstance().minStockThreshold;

    if (newQuantity < threshold) {
      console.log(
        `[INVENTORY] LOW STOCK detected for "${product.name}" ` +
          `(${newQuantity}/${threshold})`,
      );

      // Notify all observers about the low stock event
      this.notifyObservers(product, newQuantity);

      // Calculate and place automatic reorder
      return this.executeReorder(product, newQuantity);
    }

    return null;
  }

  // Scans all products and triggers reorders for those below threshold
  monitorInventory(): ReorderResult[] {
    const threshold = InventoryConfig.getInstance().minStockThreshold;
    const results: ReorderResult[] = [];

    for (const product of this.repository.findAll()) {
      if (product.quantity < threshold) {
        console.log(
          `[MONITOR] "${product.name}" stock: ${product.quantity} (threshold: ${threshold})`,
        );
        this.notifyObservers(product, product.quantity);
        const result = this.executeReorder(product, product.quantity);
        if (result) {
          results.push(result);
        }
      }
    }

    return results;
  }

  // Uses the current strategy and supplier to place a reorder
  private executeReorder(
    product: Product,
    currentStock: number,
  ): ReorderResult | null {
    const quantity = this.reorderStrategy.calculateReorderQuantity(
      product,
      currentStock,
    );

    if (quantity <= 0) {
      return null;
    }

    console.log(
      `[REORDER] Strategy "${this.reorderStrategy.name}" ` +
        `recommends ordering ${quantity} units of "${product.name}"`,
    );

    const order = this.supplier.placeOrder(product.id, product.name, quantity);

    console.log(
      `[REORDER] Order confirmed from "${order.supplierName}": ` +
        `${order.quantity} units of "${order.productName}"`,
    );

    return {
      product,
      quantityOrdered: order.quantity,
      order,
      strategyUsed: this.reorderStrategy.name,
    };
  }
}
