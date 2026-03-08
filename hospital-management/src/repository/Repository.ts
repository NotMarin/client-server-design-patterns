// Repository pattern: abstracts data access behind a consistent CRUD interface
// Current implementation is in-memory; can be swapped for a database without affecting domain logic

export interface Repository<T extends { id: string }> {
  findAll(): T[];
  findById(id: string): T | undefined;
  save(entity: T): void;
  update(id: string, partial: Partial<T>): T | undefined;
  delete(id: string): boolean;
}

// Generic in-memory implementation — serves as the foundation for all repositories
export class InMemoryRepository<
  T extends { id: string },
> implements Repository<T> {
  protected readonly store: Map<string, T> = new Map();

  findAll(): T[] {
    return Array.from(this.store.values());
  }

  findById(id: string): T | undefined {
    return this.store.get(id);
  }

  save(entity: T): void {
    this.store.set(entity.id, entity);
  }

  update(id: string, partial: Partial<T>): T | undefined {
    const existing = this.store.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...partial, id } as T;
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }
}
