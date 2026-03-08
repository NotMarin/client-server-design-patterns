// Concrete Repository: In-memory storage for products.
// Can be swapped for a database-backed implementation without changing domain code.

import { Product } from "../models/Product";
import { ProductRepository } from "./ProductRepository";

export class InMemoryProductRepository implements ProductRepository {
  private readonly products: Map<string, Product> = new Map();

  save(product: Product): void {
    if (this.products.has(product.id)) {
      throw new Error(`Product with ID "${product.id}" already exists`);
    }
    this.products.set(product.id, product);
  }

  findById(id: string): Product | undefined {
    return this.products.get(id);
  }

  findAll(): Product[] {
    return Array.from(this.products.values());
  }

  delete(id: string): boolean {
    return this.products.delete(id);
  }

  update(product: Product): void {
    if (!this.products.has(product.id)) {
      throw new Error(`Product with ID "${product.id}" not found`);
    }
    this.products.set(product.id, product);
  }
}
