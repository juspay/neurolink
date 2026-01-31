/**
 * Key-Value Store
 *
 * High-level key-value storage interface built on top of the storage abstraction.
 * Provides a simple, type-safe API for storing and retrieving data.
 *
 * Features:
 * - Type-safe get/set operations
 * - TTL support for automatic expiration
 * - Namespace isolation
 * - Batch operations
 * - JSON serialization/deserialization
 */

import type { JsonValue, JsonObject } from "../../types/index.js";
import type {
  StorageProvider,
  StorageCustomRecord,
  SetRecordOptions,
  StorageQueryOptions,
  PaginatedResult,
  KeyValueStoreOptions,
  SetOptions,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";

/**
 * Key-Value Store
 *
 * Provides a simple key-value interface for storing data.
 */
export class KeyValueStore {
  private storage: StorageProvider;
  private options: Required<KeyValueStoreOptions>;

  constructor(storage: StorageProvider, options?: KeyValueStoreOptions) {
    this.storage = storage;
    this.options = {
      namespace: options?.namespace || "kv",
      defaultTtlSeconds: options?.defaultTtlSeconds || 0, // 0 = no expiration
      keyPrefix: options?.keyPrefix || "",
    };
  }

  /**
   * Get the full key with prefix
   */
  private getKey(key: string): string {
    return this.options.keyPrefix ? `${this.options.keyPrefix}${key}` : key;
  }

  // ============================================================================
  // Basic Operations
  // ============================================================================

  /**
   * Get a value by key
   */
  async get<T = JsonValue>(key: string): Promise<T | null> {
    const record = await this.storage.getRecord(
      this.options.namespace,
      this.getKey(key),
    );

    if (!record) {
      return null;
    }
    return record.value as T;
  }

  /**
   * Get a value with its metadata
   */
  async getWithMetadata<T = JsonValue>(
    key: string,
  ): Promise<{
    value: T;
    metadata?: JsonObject;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    const record = await this.storage.getRecord(
      this.options.namespace,
      this.getKey(key),
    );

    if (!record) {
      return null;
    }

    return {
      value: record.value as T,
      metadata: record.metadata,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  /**
   * Set a value
   */
  async set<T extends JsonValue>(
    key: string,
    value: T,
    options?: SetOptions,
  ): Promise<void> {
    const setOptions: SetRecordOptions = {
      ttl: options?.ttl || this.options.defaultTtlSeconds || undefined,
      metadata: options?.metadata,
    };

    await this.storage.setRecord(
      this.options.namespace,
      this.getKey(key),
      value,
      setOptions,
    );

    logger.debug("[KeyValueStore] Set value", {
      key,
      namespace: this.options.namespace,
    });
  }

  /**
   * Set a value with TTL
   */
  async setWithTtl<T extends JsonValue>(
    key: string,
    value: T,
    ttlSeconds: number,
    metadata?: JsonObject,
  ): Promise<void> {
    return this.set(key, value, { ttl: ttlSeconds, metadata });
  }

  /**
   * Delete a value
   */
  async delete(key: string): Promise<boolean> {
    const deleted = await this.storage.deleteRecord(
      this.options.namespace,
      this.getKey(key),
    );

    if (deleted) {
      logger.debug("[KeyValueStore] Deleted value", {
        key,
        namespace: this.options.namespace,
      });
    }

    return deleted;
  }

  /**
   * Check if a key exists
   */
  async has(key: string): Promise<boolean> {
    return this.storage.hasRecord(this.options.namespace, this.getKey(key));
  }

  // ============================================================================
  // Batch Operations
  // ============================================================================

  /**
   * Get multiple values by keys
   */
  async getMany<T = JsonValue>(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();

    // Fetch all in parallel
    const promises = keys.map(async (key) => {
      const value = await this.get<T>(key);
      if (value !== null) {
        results.set(key, value);
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Set multiple values
   */
  async setMany<T extends JsonValue>(
    entries: Array<{ key: string; value: T; options?: SetOptions }>,
  ): Promise<void> {
    const promises = entries.map((entry) =>
      this.set(entry.key, entry.value, entry.options),
    );

    await Promise.all(promises);
  }

  /**
   * Delete multiple keys
   */
  async deleteMany(keys: string[]): Promise<number> {
    let deleted = 0;

    const promises = keys.map(async (key) => {
      const success = await this.delete(key);
      if (success) {
        deleted++;
      }
    });

    await Promise.all(promises);
    return deleted;
  }

  // ============================================================================
  // List Operations
  // ============================================================================

  /**
   * List all keys in the namespace
   */
  async keys(options?: StorageQueryOptions): Promise<string[]> {
    const result = await this.storage.listRecords(
      this.options.namespace,
      options,
    );

    return result.data.map((record) => {
      // Remove prefix if present
      const key = record.key;
      if (this.options.keyPrefix && key.startsWith(this.options.keyPrefix)) {
        return key.slice(this.options.keyPrefix.length);
      }
      return key;
    });
  }

  /**
   * List all values in the namespace
   */
  async values<T = JsonValue>(options?: StorageQueryOptions): Promise<T[]> {
    const result = await this.storage.listRecords(
      this.options.namespace,
      options,
    );
    return result.data.map((record) => record.value as T);
  }

  /**
   * List all entries (key-value pairs) in the namespace
   */
  async entries<T = JsonValue>(
    options?: StorageQueryOptions,
  ): Promise<Array<{ key: string; value: T }>> {
    const result = await this.storage.listRecords(
      this.options.namespace,
      options,
    );

    return result.data.map((record) => {
      let key = record.key;
      if (this.options.keyPrefix && key.startsWith(this.options.keyPrefix)) {
        key = key.slice(this.options.keyPrefix.length);
      }
      return { key, value: record.value as T };
    });
  }

  /**
   * Get paginated records
   */
  async list(
    options?: StorageQueryOptions,
  ): Promise<PaginatedResult<StorageCustomRecord>> {
    return this.storage.listRecords(this.options.namespace, options);
  }

  // ============================================================================
  // Utility Operations
  // ============================================================================

  /**
   * Clear all data in the namespace
   */
  async clear(): Promise<number> {
    const deleted = await this.storage.deleteNamespace(this.options.namespace);
    logger.warn("[KeyValueStore] Cleared namespace", {
      namespace: this.options.namespace,
      deleted,
    });
    return deleted;
  }

  /**
   * Get the count of entries in the namespace
   */
  async count(): Promise<number> {
    const result = await this.storage.listRecords(this.options.namespace, {
      limit: 1,
    });
    return result.total ?? 0;
  }

  /**
   * Get or set a value (cache pattern)
   */
  async getOrSet<T extends JsonValue>(
    key: string,
    factory: () => Promise<T>,
    options?: SetOptions,
  ): Promise<T> {
    const existing = await this.get<T>(key);
    if (existing !== null) {
      return existing;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Increment a numeric value
   */
  async increment(key: string, delta = 1): Promise<number> {
    const current = await this.get<number>(key);
    const newValue = (current || 0) + delta;
    await this.set(key, newValue);
    return newValue;
  }

  /**
   * Decrement a numeric value
   */
  async decrement(key: string, delta = 1): Promise<number> {
    return this.increment(key, -delta);
  }

  /**
   * Append to an array value
   */
  async append<T extends JsonValue>(key: string, ...items: T[]): Promise<T[]> {
    const current = await this.get<T[]>(key);
    const newArray = [...(current || []), ...items];
    await this.set(key, newArray);
    return newArray;
  }

  /**
   * Update a value using a transformation function
   */
  async update<T extends JsonValue>(
    key: string,
    updater: (current: T | null) => T,
  ): Promise<T> {
    const current = await this.get<T>(key);
    const newValue = updater(current);
    await this.set(key, newValue);
    return newValue;
  }

  // ============================================================================
  // Namespace Operations
  // ============================================================================

  /**
   * Create a scoped store with a different namespace
   */
  withNamespace(namespace: string): KeyValueStore {
    return new KeyValueStore(this.storage, {
      ...this.options,
      namespace,
    });
  }

  /**
   * Create a scoped store with a key prefix
   */
  withPrefix(prefix: string): KeyValueStore {
    return new KeyValueStore(this.storage, {
      ...this.options,
      keyPrefix: this.options.keyPrefix + prefix,
    });
  }
}

/**
 * Create a key-value store for a storage provider
 */
export function createKeyValueStore(
  storage: StorageProvider,
  options?: KeyValueStoreOptions,
): KeyValueStore {
  return new KeyValueStore(storage, options);
}
