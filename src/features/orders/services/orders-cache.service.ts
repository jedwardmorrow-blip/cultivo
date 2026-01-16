import type { OrderDetailsCache } from '../types';

class OrdersCacheService {
  private cache: Map<string, OrderDetailsCache> = new Map();
  private readonly TTL = 30000;

  get(orderId: string): OrderDetailsCache | null {
    const cached = this.cache.get(orderId);
    if (!cached) return null;

    const isExpired = Date.now() - cached.loadedAt > this.TTL;
    if (isExpired) {
      this.cache.delete(orderId);
      return null;
    }

    return cached;
  }

  set(orderId: string, data: Omit<OrderDetailsCache, 'loadedAt'>): void {
    this.cache.set(orderId, {
      ...data,
      loadedAt: Date.now(),
    });
  }

  invalidate(orderId: string): void {
    this.cache.delete(orderId);
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  has(orderId: string): boolean {
    return this.cache.has(orderId) && this.get(orderId) !== null;
  }
}

export const ordersCacheService = new OrdersCacheService();
