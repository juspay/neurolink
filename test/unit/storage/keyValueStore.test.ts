/**
 * Key-Value Store Unit Tests
 *
 * Tests for high-level key-value storage including:
 * - Basic get/set operations
 * - TTL and expiration
 * - Namespace isolation
 * - Batch operations
 * - Type safety
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { KeyValueStore } from "../../../src/lib/storage/managers/keyValueStore.js";
import { MemoryAdapter } from "../../../src/lib/storage/adapters/memoryAdapter.js";
import type { StorageProvider } from "../../../src/lib/types/index.js";

describe("KeyValueStore", () => {
  let storage: StorageProvider;
  let kv: KeyValueStore;

  beforeEach(async () => {
    storage = new MemoryAdapter();
    await storage.init();
    kv = new KeyValueStore(storage);
  });

  afterEach(async () => {
    await storage.close();
  });

  describe("Basic Operations", () => {
    it("should set and get a value", async () => {
      await kv.set("key1", { data: "value" });
      const value = await kv.get("key1");

      expect(value).toEqual({ data: "value" });
    });

    it("should return null for non-existent key", async () => {
      const value = await kv.get("non-existent");
      expect(value).toBeNull();
    });

    it("should set and get string value", async () => {
      await kv.set("string-key", "simple string");
      const value = await kv.get<string>("string-key");

      expect(value).toBe("simple string");
    });

    it("should set and get number value", async () => {
      await kv.set("number-key", 42);
      const value = await kv.get<number>("number-key");

      expect(value).toBe(42);
    });

    it("should set and get boolean value", async () => {
      await kv.set("bool-key", true);
      const value = await kv.get<boolean>("bool-key");

      expect(value).toBe(true);
    });

    it("should set and get array value", async () => {
      const array = [1, 2, 3, 4, 5];
      await kv.set("array-key", array);
      const value = await kv.get<number[]>("array-key");

      expect(value).toEqual(array);
    });

    it("should set and get complex object", async () => {
      const obj = {
        name: "Test",
        age: 30,
        nested: {
          field: "value",
        },
        items: [1, 2, 3],
      };

      await kv.set("object-key", obj);
      const value = await kv.get<typeof obj>("object-key");

      expect(value).toEqual(obj);
    });

    it("should delete a key", async () => {
      await kv.set("key1", "value");
      const deleted = await kv.delete("key1");

      expect(deleted).toBe(true);

      const value = await kv.get("key1");
      expect(value).toBeNull();
    });

    it("should return false when deleting non-existent key", async () => {
      const deleted = await kv.delete("non-existent");
      expect(deleted).toBe(false);
    });

    it("should check if key exists", async () => {
      await kv.set("key1", "value");

      const exists = await kv.has("key1");
      expect(exists).toBe(true);

      const notExists = await kv.has("key2");
      expect(notExists).toBe(false);
    });
  });

  describe("Metadata Operations", () => {
    it("should get value with metadata", async () => {
      await kv.set("key1", "value", {
        metadata: { tag: "test", version: 1 },
      });

      const result = await kv.getWithMetadata<string>("key1");

      expect(result).not.toBeNull();
      expect(result?.value).toBe("value");
      expect(result?.metadata).toEqual({ tag: "test", version: 1 });
      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.updatedAt).toBeInstanceOf(Date);
    });

    it("should return null metadata for non-existent key", async () => {
      const result = await kv.getWithMetadata("non-existent");
      expect(result).toBeNull();
    });

    it("should update value and metadata", async () => {
      await kv.set("key1", "value1", { metadata: { version: 1 } });
      await kv.set("key1", "value2", { metadata: { version: 2 } });

      const result = await kv.getWithMetadata<string>("key1");

      expect(result?.value).toBe("value2");
      expect(result?.metadata).toEqual({ version: 2 });
    });
  });

  describe("TTL Operations", () => {
    it("should set value with TTL", async () => {
      vi.useFakeTimers();

      await kv.set("ttl-key", "value", { ttl: 2 }); // 2 seconds

      let value = await kv.get("ttl-key");
      expect(value).toBe("value");

      // Fast-forward 3 seconds
      vi.advanceTimersByTime(3000);

      value = await kv.get("ttl-key");
      expect(value).toBeNull();

      vi.useRealTimers();
    });

    it("should use default TTL when configured", async () => {
      const kvWithDefault = new KeyValueStore(storage, {
        defaultTtlSeconds: 5,
      });

      vi.useFakeTimers();

      await kvWithDefault.set("key1", "value");

      const result = await kvWithDefault.getWithMetadata("key1");
      expect(result).not.toBeNull();

      vi.useRealTimers();
    });

    it("should override default TTL", async () => {
      const kvWithDefault = new KeyValueStore(storage, {
        defaultTtlSeconds: 10,
      });

      vi.useFakeTimers();

      await kvWithDefault.set("key1", "value", { ttl: 2 });

      let value = await kvWithDefault.get("key1");
      expect(value).toBe("value");

      vi.advanceTimersByTime(3000);

      value = await kvWithDefault.get("key1");
      expect(value).toBeNull();

      vi.useRealTimers();
    });
  });

  describe("Namespace Operations", () => {
    it("should use default namespace", async () => {
      await kv.set("key1", "value");

      const keys = await kv.keys();
      expect(keys).toContain("key1");
    });

    it("should isolate values in different namespaces", async () => {
      const kv1 = new KeyValueStore(storage, { namespace: "ns1" });
      const kv2 = new KeyValueStore(storage, { namespace: "ns2" });

      await kv1.set("key1", "value1");
      await kv2.set("key1", "value2");

      const value1 = await kv1.get("key1");
      const value2 = await kv2.get("key1");

      expect(value1).toBe("value1");
      expect(value2).toBe("value2");
    });

    it("should list keys in namespace", async () => {
      await kv.set("key1", "value1");
      await kv.set("key2", "value2");
      await kv.set("key3", "value3");

      const keys = await kv.keys();

      expect(keys).toHaveLength(3);
      expect(keys).toContain("key1");
      expect(keys).toContain("key2");
      expect(keys).toContain("key3");
    });

    it("should list all records in namespace", async () => {
      await kv.set("key1", "value1");
      await kv.set("key2", "value2");

      const records = await kv.list();

      expect(records).toHaveLength(2);
      expect(records.map((r) => r.key)).toContain("key1");
      expect(records.map((r) => r.key)).toContain("key2");
    });

    it("should clear namespace", async () => {
      const kv1 = new KeyValueStore(storage, { namespace: "ns1" });
      const kv2 = new KeyValueStore(storage, { namespace: "ns2" });

      await kv1.set("key1", "value1");
      await kv1.set("key2", "value2");
      await kv2.set("key1", "value3");

      const count = await kv1.clear();
      expect(count).toBe(2);

      const keys1 = await kv1.keys();
      expect(keys1).toHaveLength(0);

      const keys2 = await kv2.keys();
      expect(keys2).toHaveLength(1);
    });
  });

  describe("Batch Operations", () => {
    it("should set multiple values", async () => {
      await kv.setMany({
        key1: "value1",
        key2: "value2",
        key3: "value3",
      });

      const value1 = await kv.get("key1");
      const value2 = await kv.get("key2");
      const value3 = await kv.get("key3");

      expect(value1).toBe("value1");
      expect(value2).toBe("value2");
      expect(value3).toBe("value3");
    });

    it("should get multiple values", async () => {
      await kv.set("key1", "value1");
      await kv.set("key2", "value2");
      await kv.set("key3", "value3");

      const values = await kv.getMany(["key1", "key2", "key3", "key4"]);

      expect(values).toEqual({
        key1: "value1",
        key2: "value2",
        key3: "value3",
        key4: null,
      });
    });

    it("should delete multiple keys", async () => {
      await kv.set("key1", "value1");
      await kv.set("key2", "value2");
      await kv.set("key3", "value3");

      const count = await kv.deleteMany(["key1", "key2"]);
      expect(count).toBe(2);

      const value1 = await kv.get("key1");
      const value2 = await kv.get("key2");
      const value3 = await kv.get("key3");

      expect(value1).toBeNull();
      expect(value2).toBeNull();
      expect(value3).toBe("value3");
    });
  });

  describe("Key Prefix", () => {
    it("should use key prefix", async () => {
      const kvWithPrefix = new KeyValueStore(storage, { keyPrefix: "app:" });

      await kvWithPrefix.set("key1", "value");

      const value = await kvWithPrefix.get("key1");
      expect(value).toBe("value");
    });

    it("should isolate prefixed keys", async () => {
      const kv1 = new KeyValueStore(storage, {
        namespace: "ns",
        keyPrefix: "prefix1:",
      });
      const kv2 = new KeyValueStore(storage, {
        namespace: "ns",
        keyPrefix: "prefix2:",
      });

      await kv1.set("key", "value1");
      await kv2.set("key", "value2");

      const value1 = await kv1.get("key");
      const value2 = await kv2.get("key");

      expect(value1).toBe("value1");
      expect(value2).toBe("value2");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty string as key", async () => {
      await kv.set("", "empty key value");
      const value = await kv.get("");

      expect(value).toBe("empty key value");
    });

    it("should handle special characters in keys", async () => {
      const specialKey = "key/with:special@chars#test";
      await kv.set(specialKey, "value");

      const value = await kv.get(specialKey);
      expect(value).toBe("value");
    });

    it("should handle very long keys", async () => {
      const longKey = "k".repeat(1000);
      await kv.set(longKey, "value");

      const value = await kv.get(longKey);
      expect(value).toBe("value");
    });

    it("should handle deeply nested objects", async () => {
      const deep = {
        level1: {
          level2: {
            level3: {
              level4: {
                value: "deep",
              },
            },
          },
        },
      };

      await kv.set("deep", deep);
      const value = await kv.get("deep");

      expect(value).toEqual(deep);
    });

    it("should handle null and undefined values", async () => {
      await kv.set("null-key", null);
      await kv.set("undefined-key", undefined);

      const nullValue = await kv.get("null-key");
      const undefinedValue = await kv.get("undefined-key");

      expect(nullValue).toBeNull();
      expect(undefinedValue).toBeUndefined();
    });

    it("should handle large arrays", async () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      await kv.set("large-array", largeArray);

      const value = await kv.get<number[]>("large-array");
      expect(value).toHaveLength(10000);
      expect(value?.[0]).toBe(0);
      expect(value?.[9999]).toBe(9999);
    });

    it("should handle empty objects", async () => {
      await kv.set("empty", {});
      const value = await kv.get("empty");

      expect(value).toEqual({});
    });

    it("should handle empty arrays", async () => {
      await kv.set("empty-array", []);
      const value = await kv.get("empty-array");

      expect(value).toEqual([]);
    });
  });

  describe("Concurrent Operations", () => {
    it("should handle concurrent sets", async () => {
      const promises = Array.from({ length: 100 }, (_, i) =>
        kv.set(`key${i}`, `value${i}`),
      );

      await Promise.all(promises);

      const keys = await kv.keys();
      expect(keys).toHaveLength(100);
    });

    it("should handle concurrent gets", async () => {
      await kv.set("key", "value");

      const promises = Array.from({ length: 100 }, () => kv.get("key"));

      const results = await Promise.all(promises);

      expect(results.every((r) => r === "value")).toBe(true);
    });

    it("should handle concurrent deletes", async () => {
      await kv.set("key", "value");

      const promises = Array.from({ length: 10 }, () => kv.delete("key"));

      const results = await Promise.all(promises);

      // First delete succeeds, rest fail
      expect(results.filter((r) => r === true)).toHaveLength(1);
      expect(results.filter((r) => r === false)).toHaveLength(9);
    });
  });

  describe("Type Safety", () => {
    it("should preserve type information", async () => {
      interface User {
        id: number;
        name: string;
        email: string;
      }

      const user: User = {
        id: 1,
        name: "John Doe",
        email: "john@example.com",
      };

      await kv.set("user", user);
      const retrieved = await kv.get<User>("user");

      expect(retrieved).toEqual(user);
      expect(retrieved?.id).toBe(1);
      expect(retrieved?.name).toBe("John Doe");
    });

    it("should handle union types", async () => {
      type Status = "pending" | "completed" | "failed";

      const status: Status = "completed";
      await kv.set("status", status);

      const retrieved = await kv.get<Status>("status");
      expect(retrieved).toBe("completed");
    });
  });

  describe("Pagination", () => {
    it("should paginate list results", async () => {
      for (let i = 0; i < 20; i++) {
        await kv.set(`key${i}`, `value${i}`);
      }

      const page1 = await kv.list({ limit: 10 });
      expect(page1).toHaveLength(10);

      const page2 = await kv.list({ limit: 10, offset: 10 });
      expect(page2).toHaveLength(10);

      // Ensure different records
      const page1Keys = page1.map((r) => r.key);
      const page2Keys = page2.map((r) => r.key);
      const overlap = page1Keys.filter((k) => page2Keys.includes(k));
      expect(overlap).toHaveLength(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle storage errors gracefully", async () => {
      await storage.close();

      // Operations should throw after storage is closed
      await expect(kv.set("key", "value")).rejects.toThrow();
    });
  });
});
