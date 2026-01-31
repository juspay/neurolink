/**
 * Storage Abstraction Types for NeuroLink
 *
 * This module defines comprehensive type definitions for the unified storage
 * abstraction layer. It provides type-safe interfaces for multiple storage
 * backends including Memory, File, Redis, PostgreSQL, MongoDB, S3, and SQLite.
 *
 * @module storageTypes
 * @since 9.0.0
 */

import type { JsonValue, JsonObject } from "../../types/common.js";

// =============================================================================
// Storage Backend Types
// =============================================================================

/**
 * Supported storage backend types
 */
export type StorageBackendType =
  | "memory"
  | "file"
  | "redis"
  | "postgresql"
  | "mongodb"
  | "s3"
  | "sqlite";

/**
 * Storage backend metadata
 */
export type StorageBackendMetadata = {
  /** Backend type */
  type: StorageBackendType;
  /** Human-readable name */
  name: string;
  /** Supported features */
  features: StorageFeature[];
  /** Whether backend is persistent */
  persistent: boolean;
  /** Whether backend supports distributed access */
  distributed: boolean;
};

/**
 * Storage features that backends may support
 */
export type StorageFeature =
  | "transactions"
  | "ttl"
  | "atomic-operations"
  | "batch-operations"
  | "streaming"
  | "versioning"
  | "encryption"
  | "compression"
  | "migrations";

// =============================================================================
// Base Entity Types
// =============================================================================

/**
 * Base entity with common fields
 */
export type BaseEntity = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Thread represents a conversation context
 */
export type StorageThread = BaseEntity & {
  /** Resource identifier for scoping (e.g., userId, agentId) */
  resourceId: string;
  /** Thread title */
  title?: string;
  /** Custom metadata */
  metadata?: JsonObject;
  /** Status of the thread */
  status?: "active" | "archived" | "deleted";
};

/**
 * Message within a thread
 */
export type StorageMessage = BaseEntity & {
  /** Parent thread ID */
  threadId: string;
  /** Message role */
  role: "user" | "assistant" | "system" | "tool";
  /** Message content */
  content: string;
  /** Content type */
  type?: "text" | "tool-call" | "tool-result";
  /** Tool information (for tool messages) */
  toolInfo?: {
    toolName: string;
    toolCallId?: string;
    args?: JsonObject;
    result?: JsonValue;
  };
  /** Custom metadata */
  metadata?: JsonObject;
};

/**
 * Workflow execution status
 */
export type WorkflowRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "suspended"
  | "cancelled";

/**
 * Individual step execution result
 */
export type StepRunResult = {
  stepId: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  input?: JsonValue;
  output?: JsonValue;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  retryCount?: number;
};

/**
 * Workflow run record
 */
export type StorageWorkflowRun = BaseEntity & {
  /** Workflow identifier */
  workflowId: string;
  /** Current status */
  status: WorkflowRunStatus;
  /** Input data that triggered the workflow */
  triggerData?: JsonObject;
  /** Final output data */
  output?: JsonValue;
  /** Error information if failed */
  error?: {
    code: string;
    message: string;
    details?: JsonObject;
  };
  /** Step results map */
  stepResults?: Record<string, StepRunResult>;
  /** Suspension data (if suspended) */
  suspensionData?: {
    stepId: string;
    reason: string;
    resumeData?: JsonObject;
  };
  /** Resource context */
  resourceId?: string;
  /** Thread context */
  threadId?: string;
};

/**
 * Custom record for generic key-value storage
 */
export type StorageCustomRecord = {
  /** Namespace for grouping records */
  namespace: string;
  /** Unique key within namespace */
  key: string;
  /** JSON value */
  value: JsonValue;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Optional TTL in seconds */
  ttl?: number;
  /** Custom metadata */
  metadata?: JsonObject;
};

// =============================================================================
// Query and Pagination Types
// =============================================================================

/**
 * Pagination options
 */
export type PaginationOptions = {
  /** Number of items per page */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Cursor for cursor-based pagination */
  cursor?: string;
};

/**
 * Paginated result
 */
export type PaginatedResult<T> = {
  /** Result items */
  data: T[];
  /** Total count (if available) */
  total?: number;
  /** Next cursor for pagination */
  nextCursor?: string;
  /** Whether more items exist */
  hasMore: boolean;
};

/**
 * Filter operators for queries
 */
export type FilterOperator =
  | "eq"
  | "ne"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "nin"
  | "contains"
  | "startsWith"
  | "endsWith";

/**
 * Filter condition
 */
export type FilterCondition = {
  field: string;
  operator: FilterOperator;
  value: JsonValue;
};

/**
 * Query filters
 */
export type QueryFilters = {
  conditions?: FilterCondition[];
  /** Logical operator for combining conditions */
  logic?: "and" | "or";
};

/**
 * Sort options
 */
export type SortOptions = {
  field: string;
  direction: "asc" | "desc";
};

/**
 * Query options combining pagination, filters, and sorting
 */
export type QueryOptions = PaginationOptions & {
  filters?: QueryFilters;
  sort?: SortOptions[];
};

/**
 * Thread query options
 */
export type ThreadQueryOptions = QueryOptions & {
  resourceId?: string;
  status?: StorageThread["status"];
};

/**
 * Message query options
 */
export type MessageQueryOptions = QueryOptions & {
  threadId: string;
  role?: StorageMessage["role"];
  type?: StorageMessage["type"];
  /** Date range filter */
  dateRange?: {
    from?: Date;
    to?: Date;
  };
};

/**
 * Workflow run query options
 */
export type WorkflowRunQueryOptions = QueryOptions & {
  workflowId?: string;
  status?: WorkflowRunStatus;
  resourceId?: string;
  threadId?: string;
};

// =============================================================================
// Storage Configuration Types
// =============================================================================

/**
 * Base storage configuration
 */
export type BaseStorageConfig = {
  /** Optional namespace prefix */
  namespace?: string;
  /** Enable debug logging */
  debug?: boolean;
};

/**
 * Memory storage configuration
 */
export type MemoryStorageConfig = BaseStorageConfig & {
  type: "memory";
  /** Maximum number of items to store (for LRU eviction) */
  maxItems?: number;
  /** Maximum memory usage in bytes */
  maxMemory?: number;
};

/**
 * File storage configuration
 */
export type FileStorageConfig = BaseStorageConfig & {
  type: "file";
  /** Base directory for file storage */
  baseDir: string;
  /** File encoding */
  encoding?: BufferEncoding;
  /** Enable atomic writes */
  atomicWrites?: boolean;
  /** File extension for data files */
  extension?: string;
};

/**
 * Redis storage configuration
 */
export type RedisStorageConfig = BaseStorageConfig & {
  type: "redis";
  /** Redis connection URL */
  url?: string;
  /** Redis host */
  host?: string;
  /** Redis port */
  port?: number;
  /** Redis password */
  password?: string;
  /** Redis database number */
  db?: number;
  /** Key prefix for all storage keys */
  keyPrefix?: string;
  /** Default TTL in seconds */
  ttl?: number;
  /** Connection timeout in ms */
  connectTimeout?: number;
  /** Enable TLS */
  tls?: boolean;
};

/**
 * PostgreSQL storage configuration
 */
export type PostgreSQLStorageConfig = BaseStorageConfig & {
  type: "postgresql";
  /** Connection string */
  connectionString?: string;
  /** Host */
  host?: string;
  /** Port */
  port?: number;
  /** Database name */
  database?: string;
  /** Username */
  user?: string;
  /** Password */
  password?: string;
  /** Schema name */
  schema?: string;
  /** Table prefix */
  tablePrefix?: string;
  /** Connection pool size */
  poolSize?: number;
  /** Connection timeout */
  connectionTimeout?: number;
  /** Enable SSL */
  ssl?: boolean | { rejectUnauthorized: boolean };
};

/**
 * MongoDB storage configuration
 */
export type MongoDBStorageConfig = BaseStorageConfig & {
  type: "mongodb";
  /** Connection URL */
  url: string;
  /** Database name */
  database: string;
  /** Collection prefix */
  collectionPrefix?: string;
  /** Connection options */
  options?: {
    maxPoolSize?: number;
    minPoolSize?: number;
    connectTimeoutMS?: number;
    socketTimeoutMS?: number;
  };
};

/**
 * S3 storage configuration
 */
export type S3StorageConfig = BaseStorageConfig & {
  type: "s3";
  /** Bucket name */
  bucket: string;
  /** AWS region */
  region?: string;
  /** S3 endpoint (for S3-compatible services) */
  endpoint?: string;
  /** Access key ID */
  accessKeyId?: string;
  /** Secret access key */
  secretAccessKey?: string;
  /** Key prefix */
  keyPrefix?: string;
  /** Enable server-side encryption */
  serverSideEncryption?: "AES256" | "aws:kms";
  /** KMS key ID for SSE-KMS */
  kmsKeyId?: string;
};

/**
 * SQLite storage configuration
 */
export type SQLiteStorageConfig = BaseStorageConfig & {
  type: "sqlite";
  /** Database file path (use ':memory:' for in-memory) */
  filename: string;
  /** Enable WAL mode */
  wal?: boolean;
  /** Table prefix */
  tablePrefix?: string;
  /** Busy timeout in ms */
  busyTimeout?: number;
};

/**
 * Union of all storage configurations
 */
export type StorageConfig =
  | MemoryStorageConfig
  | FileStorageConfig
  | RedisStorageConfig
  | PostgreSQLStorageConfig
  | MongoDBStorageConfig
  | S3StorageConfig
  | SQLiteStorageConfig;

/**
 * Storage initialization options
 */
export type StorageInitOptions = {
  /** Run migrations on initialization */
  runMigrations?: boolean;
  /** Migration options */
  migrationOptions?: {
    /** Target version (null = latest) */
    targetVersion?: number | null;
    /** Dry run mode */
    dryRun?: boolean;
  };
};

// =============================================================================
// Storage Interface
// =============================================================================

/**
 * Storage statistics
 */
export type StorageStats = {
  threadCount: number;
  messageCount: number;
  workflowRunCount: number;
  customRecordCount: number;
  storageSize?: number; // in bytes, if available
};

/**
 * MastraStorage - Unified storage interface
 *
 * This interface defines all storage operations for NeuroLink.
 * Implementations must provide all methods for the specific backend.
 */
export interface MastraStorage {
  /** Storage backend type */
  readonly type: StorageBackendType;

  // ===== Lifecycle Methods =====

  /**
   * Initialize the storage backend
   * Creates tables/collections, runs migrations if needed
   */
  init(options?: StorageInitOptions): Promise<void>;

  /**
   * Close storage connections
   */
  close(): Promise<void>;

  /**
   * Check if storage is healthy and connected
   */
  healthCheck(): Promise<boolean>;

  // ===== Thread Operations =====

  /**
   * Create a new thread
   */
  createThread(
    thread: Omit<StorageThread, "id" | "createdAt" | "updatedAt">,
  ): Promise<StorageThread>;

  /**
   * Get a thread by ID
   */
  getThread(threadId: string): Promise<StorageThread | null>;

  /**
   * Update a thread
   */
  updateThread(
    threadId: string,
    updates: Partial<Omit<StorageThread, "id" | "createdAt">>,
  ): Promise<StorageThread | null>;

  /**
   * Delete a thread and all its messages
   */
  deleteThread(threadId: string): Promise<boolean>;

  /**
   * List threads with optional filtering and pagination
   */
  listThreads(
    options?: ThreadQueryOptions,
  ): Promise<PaginatedResult<StorageThread>>;

  /**
   * Get threads by resource ID
   */
  getThreadsByResourceId(
    resourceId: string,
    options?: QueryOptions,
  ): Promise<PaginatedResult<StorageThread>>;

  // ===== Message Operations =====

  /**
   * Create a new message in a thread
   */
  createMessage(
    message: Omit<StorageMessage, "id" | "createdAt" | "updatedAt">,
  ): Promise<StorageMessage>;

  /**
   * Create multiple messages in a thread (batch)
   */
  createMessages(
    messages: Omit<StorageMessage, "id" | "createdAt" | "updatedAt">[],
  ): Promise<StorageMessage[]>;

  /**
   * Get a message by ID
   */
  getMessage(messageId: string): Promise<StorageMessage | null>;

  /**
   * Update a message
   */
  updateMessage(
    messageId: string,
    updates: Partial<Omit<StorageMessage, "id" | "threadId" | "createdAt">>,
  ): Promise<StorageMessage | null>;

  /**
   * Delete a message
   */
  deleteMessage(messageId: string): Promise<boolean>;

  /**
   * List messages in a thread
   */
  listMessages(
    options: MessageQueryOptions,
  ): Promise<PaginatedResult<StorageMessage>>;

  /**
   * Get messages by thread ID (convenience method)
   */
  getMessagesByThreadId(
    threadId: string,
    options?: QueryOptions,
  ): Promise<StorageMessage[]>;

  /**
   * Delete all messages in a thread
   */
  deleteMessagesByThreadId(threadId: string): Promise<number>;

  // ===== Workflow Run Operations =====

  /**
   * Save a workflow run (create or update)
   */
  saveWorkflowRun(
    run: Omit<StorageWorkflowRun, "createdAt" | "updatedAt"> & { id?: string },
  ): Promise<StorageWorkflowRun>;

  /**
   * Get a workflow run by ID
   */
  getWorkflowRun(runId: string): Promise<StorageWorkflowRun | null>;

  /**
   * List workflow runs with optional filtering
   */
  listWorkflowRuns(
    options?: WorkflowRunQueryOptions,
  ): Promise<PaginatedResult<StorageWorkflowRun>>;

  /**
   * Update workflow run status
   */
  updateWorkflowRunStatus(
    runId: string,
    status: WorkflowRunStatus,
    output?: JsonValue,
    error?: StorageWorkflowRun["error"],
  ): Promise<StorageWorkflowRun | null>;

  /**
   * Update step result within a workflow run
   */
  updateStepResult(
    runId: string,
    stepId: string,
    result: StepRunResult,
  ): Promise<boolean>;

  /**
   * Get workflow runs by workflow ID
   */
  getWorkflowRunsByWorkflowId(
    workflowId: string,
    options?: QueryOptions,
  ): Promise<PaginatedResult<StorageWorkflowRun>>;

  // ===== Custom Record Operations =====

  /**
   * Set a custom record
   */
  setRecord(
    namespace: string,
    key: string,
    value: JsonValue,
    options?: { ttl?: number; metadata?: JsonObject },
  ): Promise<StorageCustomRecord>;

  /**
   * Get a custom record
   */
  getRecord(namespace: string, key: string): Promise<StorageCustomRecord | null>;

  /**
   * Delete a custom record
   */
  deleteRecord(namespace: string, key: string): Promise<boolean>;

  /**
   * List records in a namespace
   */
  listRecords(
    namespace: string,
    options?: QueryOptions,
  ): Promise<PaginatedResult<StorageCustomRecord>>;

  /**
   * Check if a record exists
   */
  hasRecord(namespace: string, key: string): Promise<boolean>;

  /**
   * Delete all records in a namespace
   */
  deleteNamespace(namespace: string): Promise<number>;

  // ===== Utility Methods =====

  /**
   * Get storage statistics
   */
  getStats(): Promise<StorageStats>;

  /**
   * Clear all data (use with caution)
   */
  clearAll(): Promise<void>;
}

// =============================================================================
// Middleware Types
// =============================================================================

/**
 * Storage middleware interface for intercepting operations
 */
export interface StorageMiddleware {
  /** Middleware name */
  readonly name: string;

  /** Priority (lower = runs first) */
  readonly priority: number;

  /**
   * Transform data before storage
   */
  beforeWrite?(key: string, value: JsonValue): Promise<JsonValue>;

  /**
   * Transform data after retrieval
   */
  afterRead?(key: string, value: JsonValue): Promise<JsonValue>;

  /**
   * Called when middleware is initialized
   */
  init?(): Promise<void>;

  /**
   * Called when middleware is destroyed
   */
  destroy?(): Promise<void>;
}

/**
 * Caching middleware configuration
 */
export type CachingMiddlewareConfig = {
  /** Maximum cache size */
  maxSize?: number;
  /** Default TTL in seconds */
  ttl?: number;
  /** Enable LRU eviction */
  lru?: boolean;
  /** Cache statistics collection */
  stats?: boolean;
};

/**
 * Encryption middleware configuration
 */
export type EncryptionMiddlewareConfig = {
  /** Encryption algorithm */
  algorithm?: "aes-256-gcm" | "aes-256-cbc" | "chacha20-poly1305";
  /** Encryption key (base64 encoded) */
  key: string;
  /** Key derivation function */
  kdf?: "pbkdf2" | "scrypt" | "argon2";
  /** Salt for key derivation */
  salt?: string;
};

/**
 * Compression middleware configuration
 */
export type CompressionMiddlewareConfig = {
  /** Compression algorithm */
  algorithm?: "gzip" | "deflate" | "brotli" | "lz4";
  /** Compression level (1-9) */
  level?: number;
  /** Minimum size to compress (bytes) */
  minSize?: number;
};

// =============================================================================
// Migration Types
// =============================================================================

/**
 * Migration definition
 */
export type Migration = {
  /** Migration version number */
  version: number;
  /** Migration name/description */
  name: string;
  /** Upgrade function */
  up: (storage: MastraStorage) => Promise<void>;
  /** Downgrade function */
  down?: (storage: MastraStorage) => Promise<void>;
};

/**
 * Migration status
 */
export type MigrationStatus = {
  /** Current version */
  currentVersion: number;
  /** Latest available version */
  latestVersion: number;
  /** Pending migrations */
  pending: Migration[];
  /** Applied migrations */
  applied: Array<{
    version: number;
    name: string;
    appliedAt: Date;
  }>;
};

/**
 * Migration result
 */
export type MigrationResult = {
  /** Whether migration succeeded */
  success: boolean;
  /** Migrations that were applied */
  applied: number[];
  /** Any errors that occurred */
  errors?: Array<{
    version: number;
    error: string;
  }>;
};

// =============================================================================
// Event Types
// =============================================================================

/**
 * Storage event types for monitoring and hooks
 */
export type StorageEventType =
  | "storage:init"
  | "storage:close"
  | "storage:error"
  | "thread:create"
  | "thread:update"
  | "thread:delete"
  | "message:create"
  | "message:update"
  | "message:delete"
  | "workflow:create"
  | "workflow:update"
  | "workflow:complete"
  | "workflow:fail"
  | "record:set"
  | "record:delete"
  | "migration:start"
  | "migration:complete"
  | "migration:error";

/**
 * Storage event payload
 */
export type StorageEvent = {
  type: StorageEventType;
  timestamp: Date;
  data?: JsonObject;
  error?: Error;
};

/**
 * Storage event handler
 */
export type StorageEventHandler = (event: StorageEvent) => void | Promise<void>;

// =============================================================================
// Error Types
// =============================================================================

/**
 * Storage error codes
 */
export const StorageErrorCodes = {
  // Connection errors
  CONNECTION_FAILED: "STORAGE_CONNECTION_FAILED",
  CONNECTION_TIMEOUT: "STORAGE_CONNECTION_TIMEOUT",
  CONNECTION_CLOSED: "STORAGE_CONNECTION_CLOSED",

  // Configuration errors
  INVALID_CONFIG: "STORAGE_INVALID_CONFIG",
  MISSING_CONFIG: "STORAGE_MISSING_CONFIG",

  // Operation errors
  NOT_FOUND: "STORAGE_NOT_FOUND",
  ALREADY_EXISTS: "STORAGE_ALREADY_EXISTS",
  VALIDATION_ERROR: "STORAGE_VALIDATION_ERROR",
  OPERATION_FAILED: "STORAGE_OPERATION_FAILED",

  // Permission errors
  PERMISSION_DENIED: "STORAGE_PERMISSION_DENIED",

  // Migration errors
  MIGRATION_FAILED: "STORAGE_MIGRATION_FAILED",
  MIGRATION_VERSION_CONFLICT: "STORAGE_MIGRATION_VERSION_CONFLICT",

  // Backend-specific errors
  BACKEND_ERROR: "STORAGE_BACKEND_ERROR",
  BACKEND_UNAVAILABLE: "STORAGE_BACKEND_UNAVAILABLE",

  // Middleware errors
  MIDDLEWARE_ERROR: "STORAGE_MIDDLEWARE_ERROR",
  ENCRYPTION_ERROR: "STORAGE_ENCRYPTION_ERROR",
  COMPRESSION_ERROR: "STORAGE_COMPRESSION_ERROR",
} as const;

export type StorageErrorCode =
  (typeof StorageErrorCodes)[keyof typeof StorageErrorCodes];
