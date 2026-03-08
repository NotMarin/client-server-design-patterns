// Repository Pattern: Abstract interface for product persistence.
// Decouples domain logic from the data source implementation.

import { Product } from "../models/Product";

export interface ProductRepository {
  save(product: Product): void;
  findById(id: string): Product | undefined;
  findAll(): Product[];
  delete(id: string): boolean;
  update(product: Product): void;
}
