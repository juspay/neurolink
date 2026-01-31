/**
 * StorageRegistry - Backend Registration and Management
 *
 * Registry class for managing storage backend registrations, providing
 * singleton access to storage instances, and health monitoring.
 *
 * Uses the BaseRegistry pattern from core infrastructure for consistent
 * registry behavior across NeuroLink features.
 *
 * @module StorageRegistry
 * @since 9.0.0
 */

import { TypedEventEmitter } from "../core/infrastructure/typedEventEmitter.js";
import { createErrorFactory } from "../core/infrastructure/baseError.js";
import { logger } from "../utils/logger.js";
import type {
  StorageBackendType,
  MastraStorage,
  StorageBackendMetadata,
  StorageRegistryEntry,
  HealthCheckResult,
  StorageRegistryStats,
  StorageRegistryEvents,
} from "../types/index.js";

// =============================================================================
// Error Factory
// =============================================================================

const RegistryErrors = createErrorFactory("StorageRegistry", {
  NOT_FOUND: "REGISTRY_BACKEND_NOT_FOUND",
  ALREADY_REGISTERED: "REGISTRY_BACKEND_ALREADY_REGISTERED",
  INVALID_REGISTRATION: "REGISTRY_INVALID_REGISTRATION",
  HEALTH_CHECK_FAILED: "REGISTRY_HEALTH_CHECK_FAILED",
  INITIALIZATION_FAILED: "REGISTRY_INITIALIZATION_FAILED",
});

// =============================================================================
// StorageRegistry Class
// =============================================================================

/**
 * StorageRegistry - Manages storage backend registrations
 *
 * Provides:
 * - Backend registration with metadata
 * - Singleton instance management
 * - Health monitoring
 * - Event emission for lifecycle events
 *
 * @example
 * ```typescript
 * // Register a custom adapter
 * StorageRegistry.registerAdapter('custom', {
 *   factory: async () => new CustomStorage(),
 *   metadata: {
 *     type: 'custom',
 *     name: 'Custom Storage',
 *     features: ['transactions'],
 *     persistent: true,
 *     distributed: false
 *   }
 * });
 *
 * // Get adapter instance
 * const storage = await StorageRegistry.getAdapter('custom');
 *
 * // Check health
 * const health = await StorageRegistry.checkHealth('custom');
 * ```
 */
export class StorageRegistry {
  private static instance: StorageRegistry | null = null;
  private entries = new Map<StorageBackendType, StorageRegistryEntry>();
  private aliases = new Map<string, StorageBackendType>();
  private events = new TypedEventEmitter<StorageRegistryEvents>();
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): StorageRegistry {
    if (!StorageRegistry.instance) {
      StorageRegistry.instance = new StorageRegistry();
    }
    return StorageRegistry.instance;
  }

  /**
   * Ensure registry is initialized
   */
  async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }
    if (this.initPromise) {
      return this.initPromise;
    }
    this.initPromise = this.initialize();
    await this.initPromise;
    this.initialized = true;
  }

  /**
   * Initialize registry with default backends
   */
  private async initialize(): Promise<void> {
    logger.debug("[StorageRegistry] Initializing with default backends");

    // Connect to StorageFactory — delegate actual adapter creation there
    const { StorageFactory } = await import("./storageFactory.js");
    await StorageFactory.registerAllAdapters();

    // Register metadata for health monitoring (instances come from StorageFactory)
    const defaults: Array<{
      type: StorageBackendType;
      aliases: string[];
      metadata: Omit<StorageBackendMetadata, "type">;
    }> = [
      {
        type: "memory",
        aliases: ["mem", "in-memory", "inmemory"],
        metadata: {
          name: "In-Memory Storage",
          features: ["atomic-operations", "batch-operations"],
          persistent: false,
          distributed: false,
        },
      },
      {
        type: "file",
        aliases: ["fs", "filesystem", "local"],
        metadata: {
          name: "File System Storage",
          features: ["atomic-operations"],
          persistent: true,
          distributed: false,
        },
      },
      {
        type: "redis",
        aliases: ["rd", "cache"],
        metadata: {
          name: "Redis Storage",
          features: ["ttl", "atomic-operations", "batch-operations"],
          persistent: true,
          distributed: true,
        },
      },
      {
        type: "postgresql",
        aliases: ["postgres", "pg", "psql"],
        metadata: {
          name: "PostgreSQL Storage",
          features: [
            "transactions",
            "atomic-operations",
            "batch-operations",
            "migrations",
          ],
          persistent: true,
          distributed: true,
        },
      },
      {
        type: "mongodb",
        aliases: ["mongo"],
        metadata: {
          name: "MongoDB Storage",
          features: ["batch-operations"],
          persistent: true,
          distributed: true,
        },
      },
      {
        type: "s3",
        aliases: ["aws-s3", "object-storage"],
        metadata: {
          name: "S3 Object Storage",
          features: ["streaming", "versioning", "encryption"],
          persistent: true,
          distributed: true,
        },
      },
      {
        type: "sqlite",
        aliases: ["lite", "libsql"],
        metadata: {
          name: "SQLite Storage",
          features: ["transactions", "atomic-operations", "migrations"],
          persistent: true,
          distributed: false,
        },
      },
    ];

    for (const { type, aliases, metadata } of defaults) {
      this.registerMetadata(type, { ...metadata, type }, aliases);
    }

    logger.debug("[StorageRegistry] Default backends registered");
  }

  /**
   * Register backend metadata without factory
   * Delegates instance creation to StorageFactory at call time
   */
  private registerMetadata(
    type: StorageBackendType,
    metadata: StorageBackendMetadata,
    aliases: string[] = [],
  ): void {
    const existing = this.entries.get(type);

    if (existing?.factory) {
      // Metadata-only update — preserve the existing real factory
      existing.metadata = { ...existing.metadata, ...metadata };
      for (const alias of aliases) {
        this.aliases.set(alias.toLowerCase(), type);
      }
      return;
    }

    this.entries.set(type, {
      // Delegate to StorageFactory so the real adapter is constructed
      factory: async () => {
        const { StorageFactory } = await import("./storageFactory.js");
        return StorageFactory.createAdapter(type);
      },
      metadata,
      registeredAt: new Date(),
    });

    // Register aliases
    for (const alias of aliases) {
      this.aliases.set(alias.toLowerCase(), type);
    }
  }

  /**
   * Register a storage adapter with factory or instance
   */
  static registerAdapter(
    type: StorageBackendType | string,
    options: {
      factory?: () => Promise<MastraStorage>;
      instance?: MastraStorage;
      metadata?: Partial<StorageBackendMetadata>;
      description?: string;
      aliases?: string[];
      override?: boolean;
    },
  ): void {
    const registry = StorageRegistry.getInstance();

    if (!options.factory && !options.instance) {
      throw RegistryErrors.create(
        "INVALID_REGISTRATION",
        `Backend registration requires either 'factory' or 'instance'`,
      );
    }

    const existing = registry.entries.get(type as StorageBackendType);

    if (existing && !options.override) {
      throw RegistryErrors.create(
        "ALREADY_REGISTERED",
        `Backend '${type}' is already registered. Use override: true to replace.`,
      );
    }

    const metadata: StorageBackendMetadata = {
      type: type as StorageBackendType,
      name: options.metadata?.name || options.description || `${type} Storage`,
      features: options.metadata?.features || [],
      persistent: options.metadata?.persistent ?? true,
      distributed: options.metadata?.distributed ?? false,
    };

    // Create factory from instance if provided
    const factory = options.factory || (async () => options.instance!);

    registry.entries.set(type as StorageBackendType, {
      factory,
      metadata,
      instance: options.instance,
      registeredAt: new Date(),
    });

    // Register aliases
    if (options.aliases) {
      for (const alias of options.aliases) {
        registry.aliases.set(alias.toLowerCase(), type as StorageBackendType);
      }
    }

    registry.events.emit(
      "backend:registered",
      type as StorageBackendType,
      metadata,
    );
    logger.debug(`[StorageRegistry] Registered adapter '${type}'`);
  }

  /**
   * Unregister a storage backend
   */
  static unregisterBackend(type: StorageBackendType | string): boolean {
    const registry = StorageRegistry.getInstance();
    const entry = registry.entries.get(type as StorageBackendType);

    if (!entry) {
      return false;
    }

    // Close instance if exists
    if (entry.instance) {
      entry.instance.close().catch((error) => {
        logger.warn(`[StorageRegistry] Error closing ${type} instance:`, error);
      });
    }

    // Remove aliases
    for (const [alias, backendType] of registry.aliases) {
      if (backendType === type) {
        registry.aliases.delete(alias);
      }
    }

    registry.entries.delete(type as StorageBackendType);
    registry.events.emit("backend:unregistered", type as StorageBackendType);
    logger.debug(`[StorageRegistry] Unregistered adapter '${type}'`);

    return true;
  }

  /**
   * Get adapter instance (creates if not exists)
   */
  static async getAdapter(
    type: StorageBackendType | string,
  ): Promise<MastraStorage | undefined> {
    const registry = StorageRegistry.getInstance();
    await registry.ensureInitialized();

    // Resolve alias
    const resolvedType = registry.resolveType(type);
    const entry = registry.entries.get(resolvedType);

    if (!entry) {
      return undefined;
    }

    // Return cached instance if exists
    if (entry.instance) {
      return entry.instance;
    }

    // Create new instance
    try {
      const instance = await entry.factory();
      entry.instance = instance;
      registry.events.emit("instance:created", resolvedType, instance);
      logger.debug(
        `[StorageRegistry] Created adapter instance for '${resolvedType}'`,
      );
      return instance;
    } catch (error) {
      throw RegistryErrors.create(
        "INITIALIZATION_FAILED",
        `Failed to create '${resolvedType}' backend: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  /**
   * Get backend factory function
   */
  static getFactory(
    type: StorageBackendType | string,
  ): (() => Promise<MastraStorage>) | null {
    const registry = StorageRegistry.getInstance();
    const resolvedType = registry.resolveType(type);
    const entry = registry.entries.get(resolvedType);
    return entry?.factory || null;
  }

  /**
   * Get backend metadata
   */
  static getMetadata(
    type: StorageBackendType | string,
  ): StorageBackendMetadata | undefined {
    const registry = StorageRegistry.getInstance();
    const resolvedType = registry.resolveType(type);
    return registry.entries.get(resolvedType)?.metadata;
  }

  /**
   * Get all available backends
   */
  static async getAvailableBackends(): Promise<StorageBackendType[]> {
    const registry = StorageRegistry.getInstance();
    await registry.ensureInitialized();
    return Array.from(registry.entries.keys());
  }

  /**
   * Get all registered aliases
   */
  static getAliases(): Map<string, StorageBackendType> {
    const registry = StorageRegistry.getInstance();
    return new Map(registry.aliases);
  }

  /**
   * Check if backend is registered
   */
  static hasBackend(type: string): boolean {
    const registry = StorageRegistry.getInstance();
    const resolvedType = registry.resolveType(type);
    return registry.entries.has(resolvedType);
  }

  /**
   * Resolve type from alias
   */
  private resolveType(typeOrAlias: string): StorageBackendType {
    const lower = typeOrAlias.toLowerCase();
    return (this.aliases.get(lower) || typeOrAlias) as StorageBackendType;
  }

  /**
   * Check health of a specific backend
   */
  static async checkHealth(
    type: StorageBackendType | string,
  ): Promise<HealthCheckResult> {
    const registry = StorageRegistry.getInstance();
    const resolvedType = registry.resolveType(type);
    const entry = registry.entries.get(resolvedType);

    if (!entry) {
      return {
        type: resolvedType,
        healthy: false,
        error: `Backend '${resolvedType}' not registered`,
        lastChecked: new Date(),
      };
    }

    if (!entry.instance) {
      return {
        type: resolvedType,
        healthy: false,
        error: `Backend '${resolvedType}' has no active instance`,
        lastChecked: new Date(),
      };
    }

    const startTime = Date.now();

    try {
      const healthResult = await entry.instance.healthCheck();
      const healthy = healthResult.healthy;
      const latencyMs = Date.now() - startTime;

      entry.healthy = healthy;
      entry.lastHealthCheck = new Date();

      if (healthy) {
        registry.events.emit("backend:healthy", resolvedType);
      } else {
        registry.events.emit(
          "backend:unhealthy",
          resolvedType,
          new Error("Health check returned false"),
        );
      }

      return {
        type: resolvedType,
        healthy,
        latencyMs,
        lastChecked: entry.lastHealthCheck,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      entry.healthy = false;
      entry.lastHealthCheck = new Date();

      registry.events.emit(
        "backend:unhealthy",
        resolvedType,
        error instanceof Error ? error : new Error(String(error)),
      );

      return {
        type: resolvedType,
        healthy: false,
        latencyMs,
        error: error instanceof Error ? error.message : String(error),
        lastChecked: entry.lastHealthCheck,
      };
    }
  }

  /**
   * Check health of all registered backends with instances
   */
  static async checkAllHealth(): Promise<
    Map<StorageBackendType, HealthCheckResult>
  > {
    const registry = StorageRegistry.getInstance();
    await registry.ensureInitialized();

    const results = new Map<StorageBackendType, HealthCheckResult>();

    for (const [type, entry] of registry.entries) {
      if (entry.instance) {
        const result = await StorageRegistry.checkHealth(type);
        results.set(type, result);
      }
    }

    return results;
  }

  /**
   * Get registry statistics
   */
  static async getStats(): Promise<StorageRegistryStats> {
    const registry = StorageRegistry.getInstance();
    await registry.ensureInitialized();

    let activeInstances = 0;
    let healthyBackends = 0;
    let unhealthyBackends = 0;

    for (const entry of registry.entries.values()) {
      if (entry.instance) {
        activeInstances++;
        if (entry.healthy === true) {
          healthyBackends++;
        } else if (entry.healthy === false) {
          unhealthyBackends++;
        }
      }
    }

    const stats: StorageRegistryStats = {
      totalBackends: registry.entries.size,
      activeInstances,
      healthyBackends,
      unhealthyBackends,
    };
    return stats;
  }

  /**
   * Set cached instance for a backend
   */
  static setInstance(type: StorageBackendType, instance: MastraStorage): void {
    const registry = StorageRegistry.getInstance();
    const entry = registry.entries.get(type);

    if (entry) {
      entry.instance = instance;
      registry.events.emit("instance:created", type, instance);
      logger.debug(`[StorageRegistry] Set instance for '${type}'`);
    }
  }

  /**
   * Clear cached instance for a backend
   */
  static async clearInstance(type: StorageBackendType): Promise<void> {
    const registry = StorageRegistry.getInstance();
    const entry = registry.entries.get(type);

    if (entry?.instance) {
      await entry.instance.close();
      entry.instance = undefined;
      entry.healthy = undefined;
      entry.lastHealthCheck = undefined;
      registry.events.emit("instance:destroyed", type);
      logger.debug(`[StorageRegistry] Cleared instance for '${type}'`);
    }
  }

  /**
   * Clear all cached instances
   */
  static async clearAllInstances(): Promise<void> {
    const registry = StorageRegistry.getInstance();

    for (const [type, entry] of registry.entries) {
      if (entry.instance) {
        await StorageRegistry.clearInstance(type);
      }
    }

    logger.debug("[StorageRegistry] All instances cleared");
  }

  /**
   * Subscribe to registry events
   */
  static on<K extends keyof StorageRegistryEvents>(
    event: K,
    handler: (...args: StorageRegistryEvents[K]) => void,
  ): void {
    const registry = StorageRegistry.getInstance();
    registry.events.on(event, handler);
  }

  /**
   * Unsubscribe from registry events
   */
  static off<K extends keyof StorageRegistryEvents>(
    event: K,
    handler: (...args: StorageRegistryEvents[K]) => void,
  ): void {
    const registry = StorageRegistry.getInstance();
    registry.events.off(event, handler);
  }

  /**
   * Reset registry (for testing)
   */
  static async reset(): Promise<void> {
    const registry = StorageRegistry.getInstance();

    // Clear all instances
    await StorageRegistry.clearAllInstances();

    // Clear entries and aliases
    registry.entries.clear();
    registry.aliases.clear();
    registry.initialized = false;
    registry.initPromise = null;

    // Remove all event listeners
    registry.events.removeAllListeners();

    logger.debug("[StorageRegistry] Registry reset");
  }

  /**
   * Clear registry (alias for reset, synchronous for testing convenience)
   */
  static clear(): void {
    const registry = StorageRegistry.getInstance();

    // Close all instances synchronously (fire and forget)
    for (const entry of registry.entries.values()) {
      if (entry.instance) {
        entry.instance.close().catch(() => {
          /* ignore errors during cleanup */
        });
      }
    }

    // Clear entries and aliases
    registry.entries.clear();
    registry.aliases.clear();
    registry.initialized = false;
    registry.initPromise = null;

    // Remove all event listeners
    registry.events.removeAllListeners();

    logger.debug("[StorageRegistry] Registry cleared");
  }

  /**
   * List all backends with their status
   */
  static async listBackends(): Promise<
    Array<{
      type: StorageBackendType;
      metadata: StorageBackendMetadata;
      hasInstance: boolean;
      healthy?: boolean;
      lastHealthCheck?: Date;
    }>
  > {
    const registry = StorageRegistry.getInstance();
    await registry.ensureInitialized();

    return Array.from(registry.entries.entries()).map(([type, entry]) => ({
      type,
      metadata: entry.metadata,
      hasInstance: !!entry.instance,
      healthy: entry.healthy,
      lastHealthCheck: entry.lastHealthCheck,
    }));
  }
}

// Export convenience methods
export const registerAdapter = StorageRegistry.registerAdapter;
export const unregisterBackend = StorageRegistry.unregisterBackend;
export const getAdapter = StorageRegistry.getAdapter;
export const getAvailableBackends = StorageRegistry.getAvailableBackends;
export const checkStorageHealth = StorageRegistry.checkHealth;
