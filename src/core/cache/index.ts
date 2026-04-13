/**
 * In-memory TTL cache.
 *
 * Simple Map-based cache with automatic expiration on access.
 * No external dependencies required.
 *
 * Usage:
 *   const cache = new TtlCache();
 *   cache.set("key", data, 60_000);  // 60 seconds
 *   const hit = cache.get<MyType>("key"); // typed result or null
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class TtlCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();

  /**
   * Get a cached value. Returns null if key is missing or expired.
   * Expired entries are auto-evicted on access.
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Store a value with a TTL in milliseconds.
   */
  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Check if a key exists and is not expired.
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete a specific key.
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get the number of entries (including potentially expired ones).
   * For exact count, call `purge()` first.
   */
  get size(): number {
    return this.store.size;
  }

  /**
   * Remove all expired entries from the cache.
   */
  purge(): number {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        removed++;
      }
    }
    return removed;
  }
}

/** Shared cache instance used across the application */
export const cache = new TtlCache();
