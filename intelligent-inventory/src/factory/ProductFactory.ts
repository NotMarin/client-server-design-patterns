// Factory Method Pattern: Centralizes product creation logic.
// New categories can be added without modifying client code.

import {
  Product,
  ProductCategory,
  ElectronicsProduct,
  FoodProduct,
  ClothingProduct,
  PerishableProduct,
} from "../models/Product";

export interface CreateProductParams {
  readonly id: string;
  readonly name: string;
  readonly category: ProductCategory;
  readonly quantity: number;
  readonly unitPrice: number;
}

export class ProductFactory {
  // Creates a Product subclass based on the given category
  static create(params: CreateProductParams): Product {
    const { category, ...rest } = params;

    switch (category) {
      case ProductCategory.Electronics:
        return new ElectronicsProduct(rest);
      case ProductCategory.Food:
        return new FoodProduct(rest);
      case ProductCategory.Clothing:
        return new ClothingProduct(rest);
      case ProductCategory.Perishable:
        return new PerishableProduct(rest);
      default: {
        const _exhaustive: never = category;
        throw new Error(`Unknown product category: ${_exhaustive}`);
      }
    }
  }
}
