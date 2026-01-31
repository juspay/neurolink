/**
 * Storage Factory
 *
 * Central factory for creating storage provider instances with dynamic registration.
 * Follows the same Factory + Registry pattern as NeuroLink's ProviderFactory.
 *
 * Key features:
 * - Dynamic provider registration via factory functions
 * - Lazy loading of storage backends to avoid circular dependencies
 * - Support for aliases (e.g., "postgres" -> "postgresql")
 * - Singleton pattern for storage instances (optional)
 */

import { logger } from "../utils/logger.js";
import type {
  StorageProvider,
  StorageBackendType,
  StorageProviderConfig,
  PostgresStorageConfig,
  MongoDBStorageConfig,
  LibSQLStorageConfig,
  MemoryStorageConfig,
  StorageRedisConfig,
} from "../types/index.js";

/**
 * Storage provider factory function type
 */
type StorageProviderFactoryFn = (config?: unknown) => Promise<StorageProvider>;

/**
 * Storage provider registration entry
 */
type StorageProviderEntry = {
  /** Factory function to create provider instance */
  factory: StorageProviderFactoryFn;
  /** Default configuration */
  defaultConfig?: unknown;
  /** Provider aliases */
  aliases: string[];
};

/**
 * StorageFactory - Central factory for storage provider creation
 *
 * Uses dynamic registration pattern to support lazy loading and avoid
 * circular dependencies. All storage backends are loaded on-demand.
 */
export class StorageFactory {
  /** Registered storage providers */
  private static providers = new Map<
    StorageBackendType,
    StorageProviderEntry
  >();

  /** Alias to backend type mapping */
  private static aliases = new Map<string, StorageBackendType>();

  /** Singleton instances (if singleton mode enabled) */
  private static instances = new Map<string, StorageProvider>();

  /** Whether providers have been registered */
  private static registered = false;

  // ============================================================================
  // Registration Methods
  // ============================================================================

  /**
   * Register a storage provider with the factory
   *
   * @param type - Backend type identifier
   * @param factory - Async factory function that creates the provider
   * @param defaultConfig - Optional default configuration
   * @param aliases - Optional aliases for the backend type
   */
  static registerProvider(
    type: StorageBackendType,
    factory: StorageProviderFactoryFn,
    defaultConfig?: unknown,
    aliases: string[] = [],
  ): void {
    this.providers.set(type, {
      factory,
      defaultConfig,
      aliases,
    });

    // Register aliases
    for (const alias of aliases) {
      this.aliases.set(alias.toLowerCase(), type);
    }

    logger.debug(`[StorageFactory] Registered provider: ${type}`, {
      aliases: aliases.length > 0 ? aliases : undefined,
    });
  }

  /**
   * Register all built-in storage providers
   *
   * Uses dynamic imports to avoid circular dependencies and enable
   * lazy loading of storage backends.
   */
  static async registerAllProviders(): Promise<void> {
    if (this.registered) {
      return;
    }

    try {
      // Register Memory Storage (always available)
      this.registerProvider(
        "memory",
        async (config?: unknown) => {
          const { MemoryAdapter } = await import("./adapters/memoryAdapter.js");
          return new MemoryAdapter(config as MemoryStorageConfig | undefined);
        },
        undefined,
        ["mem", "in-memory", "inmemory"],
      );

      // Register PostgreSQL Storage
      this.registerProvider(
        "postgresql",
        async (config?: unknown) => {
          const { PostgresAdapter } =
            await import("./adapters/postgresAdapter.js");
          return new PostgresAdapter(
            config as PostgresStorageConfig | undefined,
          );
        },
        undefined,
        ["postgres", "pg", "psql"],
      );

      // Register MongoDB Storage
      this.registerProvider(
        "mongodb",
        async (config?: unknown) => {
          const { MongoDBAdapter } =
            await import("./adapters/mongodbAdapter.js");
          return new MongoDBAdapter(config as MongoDBStorageConfig | undefined);
        },
        undefined,
        ["mongo", "documentdb"],
      );

      // Register LibSQL Storage
      this.registerProvider(
        "libsql",
        async (config?: unknown) => {
          const { LibSQLAdapter } = await import("./adapters/libsqlAdapter.js");
          return new LibSQLAdapter(config as LibSQLStorageConfig | undefined);
        },
        undefined,
        ["sqlite", "turso", "sql"],
      );

      // Register Redis Storage
      this.registerProvider(
        "redis",
        async (config?: unknown) => {
          const { RedisAdapter } = await import("./adapters/redisAdapter.js");
          return new RedisAdapter(config as StorageRedisConfig | undefined);
        },
        undefined,
        ["ioredis", "cache"],
      );

      logger.debug("[StorageFactory] All providers registered successfully");
      this.registered = true;
    } catch (error) {
      logger.error("[StorageFactory] Failed to register providers:", error);
      throw error;
    }
  }

  // ============================================================================
  // Factory Methods
  // ============================================================================

  /**
   * Create a storage provider instance
   *
   * @param typeOrAlias - Backend type or alias
   * @param config - Provider configuration
   * @returns Storage provider instance
   */
  static async createProvider(
    typeOrAlias: string,
    config?: unknown,
  ): Promise<StorageProvider> {
    // Ensure providers are registered
    await this.registerAllProviders();

    // Resolve alias to backend type
    const type = this.resolveType(typeOrAlias);

    // Get provider entry
    const entry = this.providers.get(type);
    if (!entry) {
      throw new Error(
        `Unknown storage backend: ${typeOrAlias}. ` +
          `Available backends: ${Array.from(this.providers.keys()).join(", ")}`,
      );
    }

    // Merge with default config
    const finalConfig = config ?? entry.defaultConfig;

    // Create provider instance
    logger.debug(`[StorageFactory] Creating provider: ${type}`, {
      hasConfig: !!finalConfig,
    });

    return entry.factory(finalConfig);
  }

  /**
   * Create a storage provider from configuration object
   *
   * @param config - Storage configuration with type and config
   * @returns Storage provider instance
   */
  static async createFromConfig(
    config: StorageProviderConfig,
  ): Promise<StorageProvider> {
    return this.createProvider(config.type, config.config);
  }

  /**
   * Get or create a singleton storage provider instance
   *
   * @param typeOrAlias - Backend type or alias
   * @param config - Provider configuration
   * @param instanceKey - Optional key for multiple instances of same type
   * @returns Storage provider instance
   */
  static async getOrCreate(
    typeOrAlias: string,
    config?: unknown,
    instanceKey?: string,
  ): Promise<StorageProvider> {
    const type = this.resolveType(typeOrAlias);
    const key = instanceKey ? `${type}:${instanceKey}` : type;

    // Return existing instance if available
    const existing = this.instances.get(key);
    if (existing) {
      return existing;
    }

    // Create new instance
    const provider = await this.createProvider(type, config);

    // Store as singleton
    this.instances.set(key, provider);

    return provider;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Resolve alias to backend type
   */
  private static resolveType(typeOrAlias: string): StorageBackendType {
    const normalized = typeOrAlias.toLowerCase();

    // Check if it's a valid backend type
    if (this.providers.has(normalized as StorageBackendType)) {
      return normalized as StorageBackendType;
    }

    // Check aliases
    const resolvedType = this.aliases.get(normalized);
    if (resolvedType) {
      return resolvedType;
    }

    // Return as-is and let the provider lookup fail with a helpful error
    return typeOrAlias as StorageBackendType;
  }

  /**
   * Check if a backend type is registered
   */
  static isRegistered(typeOrAlias: string): boolean {
    const type = this.resolveType(typeOrAlias);
    return this.providers.has(type);
  }

  /**
   * Get all registered backend types
   */
  static getRegisteredTypes(): StorageBackendType[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get all aliases for a backend type
   */
  static getAliases(type: StorageBackendType): string[] {
    const entry = this.providers.get(type);
    return entry?.aliases || [];
  }

  /**
   * Clear all singleton instances
   *
   * Useful for testing or when reconfiguring storage
   */
  static async clearInstances(): Promise<void> {
    // Close all instances
    for (const [key, instance] of this.instances) {
      try {
        await instance.close();
        logger.debug(`[StorageFactory] Closed instance: ${key}`);
      } catch (error) {
        logger.warn(`[StorageFactory] Error closing instance ${key}:`, error);
      }
    }

    this.instances.clear();
  }

  /**
   * Clear all registrations
   *
   * Primarily for testing purposes
   */
  static clearRegistrations(): void {
    this.providers.clear();
    this.aliases.clear();
    this.registered = false;
    logger.debug("[StorageFactory] Cleared all registrations");
  }

  /**
   * Reset factory to initial state
   *
   * Clears both instances and registrations
   */
  static async reset(): Promise<void> {
    await this.clearInstances();
    this.clearRegistrations();
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create a storage provider with automatic registration
 *
 * @param typeOrAlias - Backend type or alias
 * @param config - Provider configuration
 * @returns Storage provider instance
 */
export async function createStorage(
  typeOrAlias: string,
  config?: unknown,
): Promise<StorageProvider> {
  return StorageFactory.createProvider(typeOrAlias, config);
}

/**
 * Create a storage provider from environment configuration
 *
 * Reads STORAGE_TYPE and relevant configuration from environment variables
 *
 * @returns Storage provider instance
 */
export async function createStorageFromEnv(): Promise<StorageProvider> {
  const storageType = process.env.STORAGE_TYPE || "memory";

  switch (storageType.toLowerCase()) {
    case "postgresql":
    case "postgres":
    case "pg": {
      const config: PostgresStorageConfig = {
        connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
        host: process.env.POSTGRES_HOST,
        port: process.env.POSTGRES_PORT
          ? parseInt(process.env.POSTGRES_PORT, 10)
          : undefined,
        database: process.env.POSTGRES_DATABASE || process.env.POSTGRES_DB,
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        schema: process.env.POSTGRES_SCHEMA,
        ssl: process.env.POSTGRES_SSL === "true",
      };
      return StorageFactory.createProvider("postgresql", config);
    }

    case "mongodb":
    case "mongo": {
      const config: MongoDBStorageConfig = {
        uri: process.env.MONGODB_URI || process.env.MONGO_URL || "",
        database: process.env.MONGODB_DATABASE || process.env.MONGO_DB,
        collectionPrefix: process.env.MONGODB_COLLECTION_PREFIX,
      };
      return StorageFactory.createProvider("mongodb", config);
    }

    case "libsql":
    case "sqlite":
    case "turso": {
      const config: LibSQLStorageConfig = {
        url:
          process.env.LIBSQL_URL ||
          process.env.TURSO_DATABASE_URL ||
          "file:local.db",
        authToken:
          process.env.LIBSQL_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN,
        syncUrl: process.env.LIBSQL_SYNC_URL,
      };
      return StorageFactory.createProvider("libsql", config);
    }

    case "redis":
    case "ioredis": {
      const config: StorageRedisConfig = {
        url: process.env.REDIS_URL,
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
          ? parseInt(process.env.REDIS_PORT, 10)
          : undefined,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB
          ? parseInt(process.env.REDIS_DB, 10)
          : undefined,
        keyPrefix: process.env.REDIS_KEY_PREFIX,
        tls: process.env.REDIS_TLS === "true",
      };
      return StorageFactory.createProvider("redis", config);
    }

    case "memory":
    default:
      return StorageFactory.createProvider("memory");
  }
}

/**
 * Get or create a singleton storage instance from environment
 */
export async function getDefaultStorage(): Promise<StorageProvider> {
  return StorageFactory.getOrCreate(
    process.env.STORAGE_TYPE || "memory",
    undefined,
    "default",
  );
}
