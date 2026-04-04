/**
 * In-memory TTL store for arbitrary data.
 * Keyed by string. Auto-expires entries after the configured TTL.
 */

interface StoreEntry<T> {
  data: T;
  createdAt: number;
}

export class TTLStore<T = string> {
  private store = new Map<string, StoreEntry<T>>();
  private ttlMs: number;
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(ttlMs: number = 24 * 60 * 60 * 1000) {
    this.ttlMs = ttlMs;
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }

  put(key: string, data: T): boolean {
    if (this.store.has(key)) {
      return false;
    }
    this.store.set(key, {
      data,
      createdAt: Date.now(),
    });
    return true;
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() - entry.createdAt > this.ttlMs) {
      this.store.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  size(): number {
    return this.store.size;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now - entry.createdAt > this.ttlMs) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}
