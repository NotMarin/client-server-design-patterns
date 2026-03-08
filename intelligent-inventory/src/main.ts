// Entry point: Demonstrates all design patterns working together.

import { InventoryFacade } from "./facade/InventoryFacade";
import { ProductCategory } from "./models/Product";
import { DemandBasedReorderStrategy } from "./strategies/DemandBasedReorderStrategy";
import { SeasonalReorderStrategy } from "./strategies/SeasonalReorderStrategy";
import { SupplierAdapter } from "./adapters/SupplierAdapter";
import { ExternalSupplierAPI } from "./adapters/ExternalSupplierAPI";
import { StockObserver } from "./observers/StockObserver";
import { Product } from "./models/Product";

// --- Custom observer to demonstrate extensibility ---
class SlackAlert implements StockObserver {
  update(product: Product, currentStock: number, threshold: number): void {
    console.log(
      `[SLACK ALERT] #inventory-alerts: "${product.name}" ` +
        `has ${currentStock} units (threshold: ${threshold})`,
    );
  }
}

function main(): void {
  console.log("============================================");
  console.log("   INTELLIGENT INVENTORY SYSTEM - DEMO");
  console.log("============================================\n");

  // 1. Initialize the system via Facade (simplifies setup)
  console.log("--- Step 1: System Initialization (Facade + Singleton) ---");
  const inventory = new InventoryFacade();

  // 2. Register products using Factory Method through Facade
  console.log("\n--- Step 2: Register Products (Factory Method) ---");
  inventory.registerProduct(
    "E001",
    "Laptop HP ProBook",
    ProductCategory.Electronics,
    25,
    899.99,
  );
  inventory.registerProduct(
    "F001",
    "Organic Milk 1L",
    ProductCategory.Food,
    8,
    3.5,
  );
  inventory.registerProduct(
    "C001",
    "Winter Jacket",
    ProductCategory.Clothing,
    15,
    120.0,
  );
  inventory.registerProduct(
    "P001",
    "Fresh Salmon 500g",
    ProductCategory.Perishable,
    5,
    12.99,
  );
  inventory.registerProduct(
    "E002",
    "USB-C Cable",
    ProductCategory.Electronics,
    50,
    9.99,
  );

  // 3. Print initial inventory report
  console.log("\n--- Step 3: Initial Inventory Report ---");
  inventory.printInventoryReport();

  // 4. Add a custom Slack observer (Observer extensibility)
  console.log("--- Step 4: Add Slack Alert Channel (Observer) ---");
  inventory.addAlertChannel(new SlackAlert());
  console.log("[DEMO] Slack alert channel added\n");

  // 5. Monitor inventory - detects products below threshold
  console.log("--- Step 5: Automatic Monitoring (Observer + Strategy) ---");
  const monitorResults = inventory.monitorInventory();
  console.log(`Reorders placed: ${monitorResults.length}`);

  // 6. Simulate stock drop triggering alerts and reorder
  console.log("\n--- Step 6: Stock Update with Alert Trigger ---");
  inventory.updateProductStock("E001", 3);

  // 7. Switch to demand-based strategy at runtime (Strategy)
  console.log("\n--- Step 7: Change Reorder Strategy (Strategy Pattern) ---");
  inventory.setReorderStrategy(new DemandBasedReorderStrategy(2.5));
  inventory.updateProductStock("C001", 4);

  // 8. Switch to seasonal strategy (e.g., for December)
  console.log("\n--- Step 8: Seasonal Strategy ---");
  inventory.setReorderStrategy(new SeasonalReorderStrategy());
  inventory.updateProductStock("E002", 7);

  // 9. Switch supplier at runtime (Adapter)
  console.log("\n--- Step 9: Change Supplier (Adapter Pattern) ---");
  const newSupplier = new SupplierAdapter(
    new ExternalSupplierAPI("PREMIUM-SUP"),
    "Premium Global Supplies",
  );
  inventory.setSupplier(newSupplier);
  inventory.updateProductStock("F001", 2);

  // 10. Adjust configuration at runtime (Singleton)
  console.log("\n--- Step 10: Runtime Configuration Change (Singleton) ---");
  inventory.setStockThreshold(15);
  inventory.setReorderQuantity(100);

  // 11. Final monitoring with new configuration
  console.log("\n--- Step 11: Final Monitoring with Updated Config ---");
  inventory.monitorInventory();

  // 12. Final report
  console.log("--- Step 12: Final Inventory Report ---");
  inventory.printInventoryReport();

  console.log("============================================");
  console.log("   DEMO COMPLETE");
  console.log("============================================");
}

main();
