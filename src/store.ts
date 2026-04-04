/**
 * In-memory TTL store for encrypted instruction payloads.
 * Keyed by instructionHash (bytes32 hex string).
 * Auto-expires entries after the configured TTL.
 * Never decrypts - stores and serves opaque encrypted data.
 */

interface StoreEntry {
  encryptedPayload: string;
  createdAt: number;
}

export class RelayStore {
  private store = new Map<string, StoreEntry>();
  private ttlMs: number;
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(ttlMs: number = 24 * 60 * 60 * 1000) {
    this.ttlMs = ttlMs;

    // Sweep expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }

  put(key: string, encryptedPayload: string): boolean {
    if (this.store.has(key)) {
      return false; // Already exists
    }
    this.store.set(key, {
      encryptedPayload,
      createdAt: Date.now(),
    });
    return true;
  }

  get(key: string): string | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.createdAt > this.ttlMs) {
      this.store.delete(key);
      return null;
    }

    return entry.encryptedPayload;
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
