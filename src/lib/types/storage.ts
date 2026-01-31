/**
 * Storage Abstraction Types
 *
 * Comprehensive type definitions for the unified storage system.
 * Supports multiple backends: PostgreSQL, MongoDB, LibSQL, Memory.
 */

import type { JsonValue, JsonObject } from "./common.js";

// ============================================================================
// Storage Backend Types
// ============================================================================

/**
 * Supported storage backend types
 */
export type StorageBackendType =
  | "memory"
  | "file"
  | "sqlite"
  | "postgresql"
  | "mongodb"
  | "libsql"
  | "redis"
  | "s3";

/**
 * Base entity with common fields for all stored entities
 */
export type BaseEntity = {
  /** Unique identifier */
  id: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
};

// ============================================================================
// Thread Types
// ============================================================================

/**
 * Thread status enumeration
 */
export type ThreadStatus = "active" | "archived" | "deleted";

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
  status?: ThreadStatus;
};

/**
 * Input for creating a new thread
 */
export type CreateThreadInput = Omit<
  StorageThread,
  "id" | "createdAt" | "updatedAt"
>;

/**
 * Input for updating a thread
 */
export type UpdateThreadInput = Partial<
  Omit<StorageThread, "id" | "createdAt">
>;

// ============================================================================
// Message Types
// ============================================================================

/**
 * Message role enumeration
 */
export type MessageRole = "user" | "assistant" | "system" | "tool";

/**
 * Message content type enumeration
 */
export type MessageType = "text" | "tool-call" | "tool-result";

/**
 * Tool information for tool messages
 */
export type StorageToolInfo = {
  /** Name of the tool */
  toolName: string;
  /** Tool call ID */
  toolCallId?: string;
  /** Tool arguments */
  args?: JsonObject;
  /** Tool result */
  result?: JsonValue;
};

/**
 * Message within a thread
 */
export type StorageMessage = BaseEntity & {
  /** Parent thread ID */
  threadId: string;
  /** Message role */
  role: MessageRole;
  /** Message content */
  content: string;
  /** Content type */
  type?: MessageType;
  /** Tool information (for tool messages) */
  toolInfo?: StorageToolInfo;
  /** Custom metadata */
  metadata?: JsonObject;
};

/**
 * Input for creating a new message
 */
export type CreateMessageInput = Omit<
  StorageMessage,
  "id" | "createdAt" | "updatedAt"
>;

/**
 * Input for updating a message
 */
export type UpdateMessageInput = Partial<
  Omit<StorageMessage, "id" | "threadId" | "createdAt">
>;

// ============================================================================
// Workflow Run Types
// ============================================================================

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
 * Step execution status
 */
export type StepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

/**
 * Individual step execution result
 */
export type StepRunResult = {
  /** Step identifier */
  stepId: string;
  /** Step execution status */
  status: StepStatus;
  /** Step input data */
  input?: JsonValue;
  /** Step output data */
  output?: JsonValue;
  /** Error message if failed */
  error?: string;
  /** Execution start time */
  startedAt?: Date;
  /** Execution completion time */
  completedAt?: Date;
  /** Number of retry attempts */
  retryCount?: number;
};

/**
 * Workflow error information
 */
export type StorageWorkflowError = {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Additional error details */
  details?: JsonObject;
};

/**
 * Suspension data for suspended workflows
 */
export type SuspensionData = {
  /** ID of the suspended step */
  stepId: string;
  /** Reason for suspension */
  reason: string;
  /** Data needed to resume */
  resumeData?: JsonObject;
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
  error?: StorageWorkflowError;
  /** Step results map */
  stepResults?: Record<string, StepRunResult>;
  /** Suspension data (if suspended) */
  suspensionData?: SuspensionData;
  /** Resource context */
  resourceId?: string;
  /** Thread context */
  threadId?: string;
};

/**
 * Input for saving a workflow run
 */
export type SaveWorkflowRunInput = Omit<
  StorageWorkflowRun,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
};

// ============================================================================
// Custom Record Types
// ============================================================================

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

/**
 * Options for setting a custom record
 */
export type SetRecordOptions = {
  /** Time-to-live in seconds */
  ttl?: number;
  /** Custom metadata */
  metadata?: JsonObject;
};

// ============================================================================
// Query Types
// ============================================================================

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
  /** Field name to filter on */
  field: string;
  /** Filter operator */
  operator: FilterOperator;
  /** Filter value */
  value: JsonValue;
};

/**
 * Query filters
 */
export type QueryFilters = {
  /** Filter conditions */
  conditions?: FilterCondition[];
  /** Logical operator for combining conditions */
  logic?: "and" | "or";
};

/**
 * Sort direction
 */
export type SortDirection = "asc" | "desc";

/**
 * Sort options
 */
export type SortOptions = {
  /** Field to sort by */
  field: string;
  /** Sort direction */
  direction: SortDirection;
};

/**
 * Query options combining pagination, filters, and sorting
 */
export type StorageQueryOptions = PaginationOptions & {
  /** Query filters */
  filters?: QueryFilters;
  /** Sort options */
  sort?: SortOptions[];
};

/**
 * Thread query options
 */
export type ThreadQueryOptions = StorageQueryOptions & {
  /** Filter by resource ID */
  resourceId?: string;
  /** Filter by thread status */
  status?: ThreadStatus;
};

/**
 * Message query options
 */
export type MessageQueryOptions = StorageQueryOptions & {
  /** Thread ID (required) */
  threadId: string;
  /** Filter by message role */
  role?: MessageRole;
  /** Filter by message type */
  type?: MessageType;
  /** Date range filter */
  dateRange?: {
    from?: Date;
    to?: Date;
  };
};

/**
 * Workflow run query options
 */
export type WorkflowRunQueryOptions = StorageQueryOptions & {
  /** Filter by workflow ID */
  workflowId?: string;
  /** Filter by status */
  status?: WorkflowRunStatus;
  /** Filter by resource ID */
  resourceId?: string;
  /** Filter by thread ID */
  threadId?: string;
};

// ============================================================================
// Storage Configuration Types
// ============================================================================

/**
 * Migration options
 */
export type MigrationOptions = {
  /** Target version (null = latest) */
  targetVersion?: number | null;
  /** Dry run mode */
  dryRun?: boolean;
};

/**
 * Storage initialization options
 */
export type StorageInitOptions = {
  /** Run migrations on initialization */
  runMigrations?: boolean;
  /** Migration options */
  migrationOptions?: MigrationOptions;
};

/**
 * Storage statistics
 */
export type StorageStats = {
  /** Number of threads */
  threadCount: number;
  /** Number of messages */
  messageCount: number;
  /** Number of workflow runs */
  workflowRunCount: number;
  /** Number of custom records */
  customRecordCount: number;
  /** Storage size in bytes (if available) */
  storageSize?: number;
};

/**
 * Storage health check result
 */
export type StorageHealthResult = {
  /** Whether the storage is healthy */
  healthy: boolean;
  /** Backend type */
  backend: StorageBackendType;
  /** Connection latency in milliseconds */
  latencyMs?: number;
  /** Error message if unhealthy */
  error?: string;
  /** Additional details */
  details?: JsonObject;
};

// ============================================================================
// Backend-Specific Configuration Types
// ============================================================================

/**
 * PostgreSQL storage configuration
 */
export type PostgresStorageConfig = {
  /** Connection string or pool config */
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
  /** SSL configuration */
  ssl?: boolean | { rejectUnauthorized?: boolean };
  /** Schema name (default: 'neurolink') */
  schema?: string;
  /** Table prefix (default: '') */
  tablePrefix?: string;
  /** Maximum pool size */
  poolSize?: number;
  /** Connection idle timeout in milliseconds */
  idleTimeoutMs?: number;
  /** Connection timeout in milliseconds */
  connectionTimeoutMs?: number;
};

/**
 * MongoDB storage configuration
 */
export type MongoDBStorageConfig = {
  /** Connection URI */
  uri: string;
  /** Database name */
  database?: string;
  /** Collection prefix (default: '') */
  collectionPrefix?: string;
  /** Maximum pool size */
  maxPoolSize?: number;
  /** Minimum pool size */
  minPoolSize?: number;
  /** Connection timeout in milliseconds */
  connectTimeoutMs?: number;
  /** Socket timeout in milliseconds */
  socketTimeoutMs?: number;
};

/**
 * LibSQL storage configuration
 */
export type LibSQLStorageConfig = {
  /** Database URL (file path or remote URL) */
  url: string;
  /** Auth token for remote databases */
  authToken?: string;
  /** Table prefix */
  tablePrefix?: string;
  /** Sync URL for embedded replicas */
  syncUrl?: string;
  /** Sync interval in milliseconds */
  syncIntervalMs?: number;
};

/**
 * Memory storage configuration
 */
export type MemoryStorageConfig = {
  /** Maximum entries before cleanup */
  maxEntries?: number;
  /** TTL cleanup interval in milliseconds */
  cleanupIntervalMs?: number;
};

/**
 * Redis storage configuration
 */
export type StorageRedisConfig = {
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
  /** Use TLS */
  tls?: boolean;
  /** Key prefix for all keys (default: 'neurolink:') */
  keyPrefix?: string;
  /** Connection timeout in milliseconds */
  connectTimeoutMs?: number;
  /** Command timeout in milliseconds */
  commandTimeoutMs?: number;
  /** Maximum retries */
  maxRetries?: number;
  /** Retry delay in milliseconds */
  retryDelayMs?: number;
};

/**
 * Unified storage configuration
 */
export type StorageProviderConfig =
  | { type: "memory"; config?: MemoryStorageConfig }
  | { type: "postgresql"; config: PostgresStorageConfig }
  | { type: "mongodb"; config: MongoDBStorageConfig }
  | { type: "libsql"; config: LibSQLStorageConfig }
  | { type: "redis"; config: StorageRedisConfig };

// ============================================================================
// Transaction Types
// ============================================================================

/**
 * Transaction isolation level
 */
export type TransactionIsolationLevel =
  | "read_uncommitted"
  | "read_committed"
  | "repeatable_read"
  | "serializable";

/**
 * Transaction options
 */
export type TransactionOptions = {
  /** Isolation level */
  isolationLevel?: TransactionIsolationLevel;
  /** Timeout in milliseconds */
  timeoutMs?: number;
  /** Whether to retry on serialization failure */
  retryOnConflict?: boolean;
  /** Maximum retry attempts */
  maxRetries?: number;
};

/**
 * Transaction context passed to transaction callback
 */
export type TransactionContext = {
  /** Transaction ID */
  transactionId: string;
  /** Commit the transaction */
  commit: () => Promise<void>;
  /** Rollback the transaction */
  rollback: () => Promise<void>;
};

// ============================================================================
// Connection Pool Types
// ============================================================================

/**
 * Connection pool statistics
 */
export type ConnectionPoolStats = {
  /** Total number of connections */
  totalConnections: number;
  /** Number of idle connections */
  idleConnections: number;
  /** Number of active connections */
  activeConnections: number;
  /** Number of pending connection requests */
  pendingRequests: number;
  /** Maximum pool size */
  maxPoolSize: number;
};

/**
 * Connection pool configuration
 */
export type ConnectionPoolConfig = {
  /** Minimum pool size */
  minSize?: number;
  /** Maximum pool size */
  maxSize?: number;
  /** Idle timeout in milliseconds */
  idleTimeoutMs?: number;
  /** Connection timeout in milliseconds */
  acquireTimeoutMs?: number;
  /** Create retry interval in milliseconds */
  createRetryIntervalMs?: number;
  /** Maximum create retries */
  createMaxRetries?: number;
};

// ============================================================================
// Migration Types
// ============================================================================

/**
 * Migration definition
 */
export type Migration = {
  /** Migration version number */
  version: number;
  /** Migration name */
  name: string;
  /** Migration description */
  description?: string;
  /** SQL/commands to apply migration */
  up: string[];
  /** SQL/commands to rollback migration */
  down: string[];
  /** Timestamp when migration was created */
  createdAt?: Date;
};

/**
 * Applied migration record
 */
export type AppliedMigration = {
  /** Migration version */
  version: number;
  /** Migration name */
  name: string;
  /** Timestamp when applied */
  appliedAt: Date;
  /** Checksum of migration content */
  checksum?: string;
};

/**
 * Migration result
 */
export type MigrationResult = {
  /** Whether migration was successful */
  success: boolean;
  /** Migrations applied */
  appliedMigrations: AppliedMigration[];
  /** Current version after migration */
  currentVersion: number;
  /** Error if migration failed */
  error?: string;
};

// ============================================================================
// Storage Factory Types
// ============================================================================

/**
 * Storage provider factory function type
 */
export type StorageProviderFactory<T = unknown> = (
  config?: T,
) => Promise<StorageProvider>;

/**
 * Storage provider registration info
 */
export type StorageProviderRegistration = {
  /** Backend type */
  type: StorageBackendType;
  /** Factory function */
  factory: StorageProviderFactory;
  /** Default configuration */
  defaultConfig?: unknown;
};

// ============================================================================
// Storage Provider Interface
// ============================================================================

/**
 * StorageProvider - Unified storage interface
 *
 * This type defines all storage operations for NeuroLink.
 * Implementations must provide all methods for the specific backend.
 */
export type StorageProvider = {
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
  healthCheck(): Promise<StorageHealthResult>;

  // ===== Thread Operations =====

  /**
   * Create a new thread
   */
  createThread(thread: CreateThreadInput): Promise<StorageThread>;

  /**
   * Get a thread by ID
   */
  getThread(threadId: string): Promise<StorageThread | null>;

  /**
   * Update a thread
   */
  updateThread(
    threadId: string,
    updates: UpdateThreadInput,
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
    options?: StorageQueryOptions,
  ): Promise<PaginatedResult<StorageThread>>;

  // ===== Message Operations =====

  /**
   * Create a new message in a thread
   */
  createMessage(message: CreateMessageInput): Promise<StorageMessage>;

  /**
   * Create multiple messages in a thread (batch)
   */
  createMessages(messages: CreateMessageInput[]): Promise<StorageMessage[]>;

  /**
   * Get a message by ID
   */
  getMessage(messageId: string): Promise<StorageMessage | null>;

  /**
   * Update a message
   */
  updateMessage(
    messageId: string,
    updates: UpdateMessageInput,
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
    options?: StorageQueryOptions,
  ): Promise<StorageMessage[]>;

  /**
   * Delete all messages in a thread
   */
  deleteMessagesByThreadId(threadId: string): Promise<number>;

  // ===== Workflow Run Operations =====

  /**
   * Save a workflow run (create or update)
   */
  saveWorkflowRun(run: SaveWorkflowRunInput): Promise<StorageWorkflowRun>;

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
    error?: StorageWorkflowError,
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
    options?: StorageQueryOptions,
  ): Promise<PaginatedResult<StorageWorkflowRun>>;

  // ===== Custom Record Operations =====

  /**
   * Set a custom record
   */
  setRecord(
    namespace: string,
    key: string,
    value: JsonValue,
    options?: SetRecordOptions,
  ): Promise<StorageCustomRecord>;

  /**
   * Get a custom record
   */
  getRecord(
    namespace: string,
    key: string,
  ): Promise<StorageCustomRecord | null>;

  /**
   * Delete a custom record
   */
  deleteRecord(namespace: string, key: string): Promise<boolean>;

  /**
   * List records in a namespace
   */
  listRecords(
    namespace: string,
    options?: StorageQueryOptions,
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
};

/** Alias: MastraStorage is the same as StorageProvider */
export type MastraStorage = StorageProvider;
