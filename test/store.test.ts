import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TTLStore } from "../src/store.js";

describe("TTLStore", () => {
  let store: TTLStore<string>;

  beforeEach(() => {
    store = new TTLStore<string>(1000); // 1 second TTL for testing
  });

  afterEach(() => {
    store.destroy();
  });

  it("stores and retrieves a payload", () => {
    store.put("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "encrypted_data");
    expect(store.get("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")).toBe("encrypted_data");
  });

  it("returns null for non-existent key", () => {
    expect(store.get("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")).toBeNull();
  });

  it("rejects duplicate keys", () => {
    const key = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    expect(store.put(key, "first")).toBe(true);
    expect(store.put(key, "second")).toBe(false);
    expect(store.get(key)).toBe("first");
  });

  it("tracks size correctly", () => {
    expect(store.size()).toBe(0);
    store.put("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "data1");
    expect(store.size()).toBe(1);
    store.put("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", "data2");
    expect(store.size()).toBe(2);
  });

  it("expires entries after TTL", async () => {
    const key = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    store.put(key, "will_expire");
    expect(store.get(key)).toBe("will_expire");

    await new Promise((r) => setTimeout(r, 1100));

    expect(store.get(key)).toBeNull();
  });

  it("has() returns correct status", () => {
    const key = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    expect(store.has(key)).toBe(false);
    store.put(key, "data");
    expect(store.has(key)).toBe(true);
  });
});
