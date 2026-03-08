// Product domain models with strong typing for each category

export enum ProductCategory {
  Electronics = "ELECTRONICS",
  Food = "FOOD",
  Clothing = "CLOTHING",
  Perishable = "PERISHABLE",
}

export interface ProductProps {
  readonly id: string;
  readonly name: string;
  readonly category: ProductCategory;
  quantity: number;
  readonly unitPrice: number;
}

// Base product class with shared behavior
export abstract class Product {
  readonly id: string;
  readonly name: string;
  readonly category: ProductCategory;
  quantity: number;
  readonly unitPrice: number;

  constructor(props: ProductProps) {
    this.id = props.id;
    this.name = props.name;
    this.category = props.category;
    this.quantity = props.quantity;
    this.unitPrice = props.unitPrice;
  }

  // Each category defines its own storage requirements
  abstract getStorageRequirements(): string;

  toString(): string {
    return `[${this.category}] ${this.name} (x${this.quantity}) - $${this.unitPrice}`;
  }
}

export class ElectronicsProduct extends Product {
  constructor(props: Omit<ProductProps, "category">) {
    super({ ...props, category: ProductCategory.Electronics });
  }

  getStorageRequirements(): string {
    return "Dry environment, anti-static packaging required";
  }
}

export class FoodProduct extends Product {
  constructor(props: Omit<ProductProps, "category">) {
    super({ ...props, category: ProductCategory.Food });
  }

  getStorageRequirements(): string {
    return "Temperature-controlled storage, FIFO rotation";
  }
}

export class ClothingProduct extends Product {
  constructor(props: Omit<ProductProps, "category">) {
    super({ ...props, category: ProductCategory.Clothing });
  }

  getStorageRequirements(): string {
    return "Dry environment, protected from moisture";
  }
}

export class PerishableProduct extends Product {
  constructor(props: Omit<ProductProps, "category">) {
    super({ ...props, category: ProductCategory.Perishable });
  }

  getStorageRequirements(): string {
    return "Refrigerated storage (2-8°C), strict expiration tracking";
  }
}
