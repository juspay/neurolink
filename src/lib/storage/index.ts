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

export type {
  // Backend types
  StorageBackendType,
  StorageConfig,

  // Base types
  BaseEntity,

  // Thread types
  ThreadStatus,
  StorageThread,
  CreateThreadInput,
  UpdateThreadInput,

  // Message types
  MessageRole,
  MessageType,
  ToolInfo,
  StorageMessage,
  CreateMessageInput,
  UpdateMessageInput,

  // Workflow types
  WorkflowRunStatus,
  StepStatus,
  StepRunResult,
  WorkflowError,
  SuspensionData,
  StorageWorkflowRun,
  SaveWorkflowRunInput,

  // Custom record types
  StorageCustomRecord,
  SetRecordOptions,

  // Query types
  PaginationOptions,
  PaginatedResult,
  FilterOperator,
  FilterCondition,
  QueryFilters,
  SortDirection,
  SortOptions,
  QueryOptions,
  ThreadQueryOptions,
  MessageQueryOptions,
  WorkflowRunQueryOptions,

  // Configuration types
  MigrationOptions,
  StorageInitOptions,
  StorageStats,
  StorageHealthResult,
  PostgresStorageConfig,
  MongoDBStorageConfig,
  LibSQLStorageConfig,
  MemoryStorageConfig,
  RedisStorageConfig,

  // Transaction types
  TransactionIsolationLevel,
  TransactionOptions,
  TransactionContext,

  // Connection pool types
  ConnectionPoolStats,
  ConnectionPoolConfig,

  // Migration types
  Migration,
  AppliedMigration,
  MigrationResult,

  // Factory types
  StorageProviderFactory,
  StorageProviderRegistration,

  // Provider interface
  StorageProvider,
} from "./types.js";

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
export {
  ConnectionPool,
  createConnectionPool,
  type PoolableConnection,
  type ConnectionFactory,
} from "./connectionPool.js";

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
  type TransactionState,
} from "./transactions.js";

// Health checks
export {
  StorageHealthMonitor,
  StorageHealthAggregator,
  createHealthMonitor,
  checkStorageHealth,
  type HealthCheckConfig,
  type HealthCheckStatus,
  type DetailedHealthResult,
  type HealthCheckEntry,
  type HealthCheckCallback,
  type AggregatedHealthStatus,
} from "./healthCheck.js";

// ============================================================================
// Managers (High-level interfaces)
// ============================================================================

export {
  ThreadManager,
  createThreadManager,
  type ThreadManagerOptions,
  type ThreadWithMessages,
  type SimpleMessageInput,
} from "./managers/threadManager.js";

export {
  WorkflowPersistenceManager,
  createWorkflowPersistenceManager,
  type WorkflowPersistenceManagerOptions,
  type StepExecutionInput,
  type WorkflowRunInput,
  type WorkflowRunUpdate,
  type WorkflowAnalytics,
} from "./managers/workflowPersistenceManager.js";

export {
  KeyValueStore,
  createKeyValueStore,
  type KeyValueStoreOptions,
  type SetOptions,
} from "./managers/keyValueStore.js";

// ============================================================================
// Migrations
// ============================================================================

export {
  MigrationRunner,
  createMigrationRunner,
  builtInMigrations,
  type Migration as MigrationDefinition,
  type MigrationContext,
  type MigrationRecord,
  type MigrationStatus,
  type MigrationRunnerOptions,
} from "./migrations/runner.js";

// ============================================================================
// Registry (Factory + Registry Pattern)
// ============================================================================

export {
  StorageRegistry,
  registerBackend,
  unregisterBackend,
  getBackend,
  getAvailableBackends,
  checkStorageHealth as checkRegistryHealth,
  type StorageRegistryEntry,
  type HealthCheckResult,
  type RegistryStats,
  type StorageRegistryEvents,
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
// Extended Types (from types/storageTypes.ts)
// ============================================================================

export type {
  // Backend metadata
  StorageBackendMetadata,
  StorageFeature,

  // Mastra interface
  MastraStorage,

  // Middleware types
  StorageMiddleware,
  CachingMiddlewareConfig,
  EncryptionMiddlewareConfig,
  CompressionMiddlewareConfig,

  // Event types
  StorageEventType,
  StorageEvent,
  StorageEventHandler,

  // File storage types
  FileStorageConfig,

  // S3 storage types
  S3StorageConfig,

  // SQLite storage types
  SQLiteStorageConfig,
} from "./types/storageTypes.js";

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
