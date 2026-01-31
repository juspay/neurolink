/**
 * Storage Abstraction Module
 *
 * Provides a unified interface for data persistence across multiple backends.
 * Supports PostgreSQL, MongoDB, Redis, LibSQL (SQLite), and in-memory storage.
 *
 * @example
 * ```typescript
 * import { createStorage, StorageFactory } from '@neurolink/storage';
 *
 * // Create a storage provider
 * const storage = await createStorage('postgresql', {
 *   connectionString: 'postgres://localhost/neurolink'
 * });
 *
 * // Initialize and use
 * await storage.init();
 *
 * // Create a thread
 * const thread = await storage.createThread({
 *   resourceId: 'user-123',
 *   title: 'My Conversation'
 * });
 *
 * // Create messages
 * await storage.createMessage({
 *   threadId: thread.id,
 *   role: 'user',
 *   content: 'Hello!'
 * });
 * ```
 */

// ============================================================================
// Core Types
// ============================================================================
// Types are exported from the canonical barrel: src/lib/types/index.ts

// ============================================================================
// Storage Provider Classes
// ============================================================================

// Abstract base class
export { BaseStorageProvider } from "./storageProvider.js";

// Adapters (lazy loaded via factory, but exported for direct use)
export { MemoryAdapter } from "./adapters/memoryAdapter.js";
export { PostgresAdapter } from "./adapters/postgresAdapter.js";
export { MongoDBAdapter } from "./adapters/mongodbAdapter.js";
export { LibSQLAdapter } from "./adapters/libsqlAdapter.js";
export { RedisAdapter } from "./adapters/redisAdapter.js";

// ============================================================================
// Factory
// ============================================================================

export {
  StorageFactory,
  createStorage,
  createStorageFromEnv,
  getDefaultStorage,
} from "./storageFactory.js";

// ============================================================================
// Utilities
// ============================================================================

// Connection pooling
export { ConnectionPool, createConnectionPool } from "./connectionPool.js";

// Transactions
export {
  Transaction,
  TransactionManager,
  TransactionalStorage,
  TransactionError,
  withTransactions,
  isolationLevelToSql,
  isSerializationError,
  wrapDatabaseError,
} from "./transactions.js";

// Health checks
export {
  StorageHealthMonitor,
  StorageHealthAggregator,
  createHealthMonitor,
  checkStorageHealth,
} from "./healthCheck.js";

// ============================================================================
// Managers (High-level interfaces)
// ============================================================================

export {
  ThreadManager,
  createThreadManager,
} from "./managers/threadManager.js";

export {
  WorkflowPersistenceManager,
  createWorkflowPersistenceManager,
} from "./managers/workflowPersistenceManager.js";

export {
  KeyValueStore,
  createKeyValueStore,
} from "./managers/keyValueStore.js";

// ============================================================================
// Migrations
// ============================================================================

export {
  MigrationRunner,
  createMigrationRunner,
  builtInMigrations,
} from "./migrations/runner.js";

// ============================================================================
// Registry (Factory + Registry Pattern)
// ============================================================================

export {
  StorageRegistry,
  registerAdapter,
  unregisterBackend,
  getAdapter,
  getAvailableBackends,
  checkStorageHealth as checkRegistryHealth,
} from "./StorageRegistry.js";

// ============================================================================
// Additional Adapters (from main worktree)
// ============================================================================

export { FileStorageAdapter } from "./adapters/FileStorageAdapter.js";

export { S3StorageAdapter } from "./adapters/S3StorageAdapter.js";

export { SQLiteStorageAdapter } from "./adapters/SQLiteStorageAdapter.js";

// ============================================================================
// Middleware (Caching, Encryption, Compression)
// ============================================================================

export {
  CachingMiddleware,
  createCachingMiddleware,
} from "./middleware/CachingMiddleware.js";

export {
  EncryptionMiddleware,
  createEncryptionMiddleware,
} from "./middleware/EncryptionMiddleware.js";

export {
  CompressionMiddleware,
  createCompressionMiddleware,
} from "./middleware/CompressionMiddleware.js";

// ============================================================================
// Extended Types (from types/storageMastra.ts)
// ============================================================================
// Types are exported from the canonical barrel: src/lib/types/index.ts

// ============================================================================
// Constants
// ============================================================================

/**
 * Default storage type when none specified
 */
export const DEFAULT_STORAGE_TYPE = "memory" as const;

/**
 * All supported storage backend types
 */
export const SUPPORTED_STORAGE_BACKENDS = [
  "memory",
  "file",
  "redis",
  "postgresql",
  "mongodb",
  "s3",
  "sqlite",
  "libsql",
] as const;

/**
 * Check if a storage type is supported
 */
export function isValidStorageType(
  type: string,
): type is (typeof SUPPORTED_STORAGE_BACKENDS)[number] {
  return SUPPORTED_STORAGE_BACKENDS.includes(
    type as (typeof SUPPORTED_STORAGE_BACKENDS)[number],
  );
}

/**
 * Get storage type from environment or use default
 */
export function getStorageTypeFromEnv(): (typeof SUPPORTED_STORAGE_BACKENDS)[number] {
  const envType = process.env.STORAGE_TYPE?.toLowerCase();
  if (envType && isValidStorageType(envType)) {
    return envType;
  }
  return DEFAULT_STORAGE_TYPE;
}
