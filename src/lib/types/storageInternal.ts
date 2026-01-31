/**
 * Storage Internal Types
 *
 * Canonical type definitions for storage subsystem internals:
 * connection pooling, migrations, registry, managers, health checks,
 * and transactions.
 *
 * All types migrated here from src/lib/storage/ per
 * ESLint rule neurolink/no-type-export-outside-types.
 */

import type { JsonValue, JsonObject } from "./common.js";
import type {
  StorageProvider,
  StorageHealthResult,
  StorageBackendType,
  StorageWorkflowError,
  WorkflowRunStatus,
  SuspensionData,
  StorageThread,
  StorageMessage,
  StorageCustomRecord,
  StorageWorkflowRun,
  MessageRole,
  MastraStorage,
} from "./storage.js";
import type {
  MastraStorageConfig,
  StorageBackendMetadata,
} from "./storageMastra.js";

// =============================================================================
// Connection Pool Internal Types
// =============================================================================

/**
 * Generic poolable connection contract
 */
export type PoolableConnection = {
  /** Check if connection is valid */
  isValid(): Promise<boolean>;
  /** Close the connection */
  close(): Promise<void>;
};

/**
 * Connection factory for creating new connections
 */
export type ConnectionFactory<T extends PoolableConnection> = () => Promise<T>;

// =============================================================================
// Migration Runner Types
// =============================================================================

/**
 * Migration context passed to migration up/down functions
 */
export type MigrationContext = {
  /** Storage provider */
  storage: StorageProvider;
  /** Execute raw SQL (for SQL backends) */
  executeSql?: (sql: string, params?: unknown[]) => Promise<unknown>;
  /** Log function */
  log: (message: string, data?: Record<string, unknown>) => void;
};

/**
 * Migration definition with functional up/down callbacks
 * (distinct from the SQL-string-based Migration type in storage.ts)
 */
export type MigrationDefinition = {
  /** Migration version (semver or numeric) */
  version: string;
  /** Migration name */
  name: string;
  /** Migration description */
  description?: string;
  /** Apply the migration */
  up: (context: MigrationContext) => Promise<void>;
  /** Revert the migration */
  down?: (context: MigrationContext) => Promise<void>;
};

/**
 * Migration record stored in the database
 */
export type MigrationRecord = {
  version: string;
  name: string;
  appliedAt: Date;
  checksum?: string;
};

/**
 * Migration runner status report
 * (renamed from MigrationStatus to avoid collision with storageMastra.MigrationStatus)
 */
export type MigrationRunnerStatus = {
  applied: MigrationRecord[];
  pending: MigrationDefinition[];
  current: string | null;
};

/**
 * Migration runner options
 */
export type MigrationRunnerOptions = {
  /** Namespace for migration records */
  namespace?: string;
  /** Lock timeout in milliseconds */
  lockTimeoutMs?: number;
  /** Whether to run in dry mode (no changes) */
  dryRun?: boolean;
};

// =============================================================================
// Storage Registry Types
// =============================================================================

/**
 * Storage registry entry with extended metadata
 */
export type StorageRegistryEntry = {
  /** Factory function to create storage instance */
  factory: () => Promise<MastraStorage>;
  /** Backend metadata */
  metadata: StorageBackendMetadata;
  /** Cached instance (singleton pattern) */
  instance?: MastraStorage;
  /** Instance configuration */
  config?: MastraStorageConfig;
  /** Health status */
  healthy?: boolean;
  /** Last health check timestamp */
  lastHealthCheck?: Date;
  /** Registration timestamp */
  registeredAt: Date;
};

/**
 * Health check result returned by StorageRegistry.checkHealth
 */
export type HealthCheckResult = {
  type: StorageBackendType;
  healthy: boolean;
  latencyMs?: number;
  error?: string;
  lastChecked: Date;
};

/**
 * Storage registry statistics
 * (renamed from RegistryStats to avoid collision with workflow.RegistryStats)
 */
export type StorageRegistryStats = {
  totalBackends: number;
  activeInstances: number;
  healthyBackends: number;
  unhealthyBackends: number;
};

/**
 * Storage registry events map
 */
export type StorageRegistryEvents = {
  "backend:registered": [StorageBackendType, StorageBackendMetadata];
  "backend:unregistered": [StorageBackendType];
  "backend:healthy": [StorageBackendType];
  "backend:unhealthy": [StorageBackendType, Error];
  "instance:created": [StorageBackendType, MastraStorage];
  "instance:destroyed": [StorageBackendType];
};

// =============================================================================
// Key-Value Store Types
// =============================================================================

/**
 * Key-value store options
 */
export type KeyValueStoreOptions = {
  /** Default namespace for keys */
  namespace?: string;
  /** Default TTL in seconds */
  defaultTtlSeconds?: number;
  /** Prefix for all keys */
  keyPrefix?: string;
};

/**
 * Set options for individual key-value operations
 */
export type SetOptions = {
  /** TTL in seconds */
  ttl?: number;
  /** Additional metadata */
  metadata?: JsonObject;
};

// =============================================================================
// Thread Manager Types
// =============================================================================

/**
 * Thread manager options
 */
export type ThreadManagerOptions = {
  /** Default resource ID for threads without explicit resource */
  defaultResourceId?: string;
  /** Maximum messages to retrieve by default */
  defaultMessageLimit?: number;
  /** Whether to auto-archive threads after inactivity */
  autoArchive?: boolean;
  /** Inactivity threshold for auto-archive (ms) */
  archiveThresholdMs?: number;
};

/**
 * Thread with its messages combined
 */
export type ThreadWithMessages = {
  thread: StorageThread;
  messages: StorageMessage[];
};

/**
 * Simple message input for adding messages
 */
export type SimpleMessageInput = {
  role: MessageRole;
  content: string;
  metadata?: JsonObject;
};

// =============================================================================
// Workflow Persistence Manager Types
// =============================================================================

/**
 * Workflow persistence manager options
 */
export type WorkflowPersistenceManagerOptions = {
  /** Default TTL for completed runs (seconds) */
  completedRunTtlSeconds?: number;
  /** Whether to auto-cleanup old runs */
  autoCleanup?: boolean;
  /** Cleanup threshold (ms) - delete runs older than this */
  cleanupThresholdMs?: number;
};

/**
 * Step execution input for recording step state
 */
export type StepExecutionInput = {
  stepId: string;
  status: "running" | "completed" | "failed" | "skipped";
  startedAt?: Date;
  completedAt?: Date;
  output?: JsonValue;
  error?: StorageWorkflowError;
};

/**
 * Workflow run input for starting a new run
 */
export type WorkflowRunInput = {
  workflowId: string;
  triggerData?: JsonObject;
  resourceId?: string;
  threadId?: string;
};

/**
 * Workflow run update payload
 */
export type WorkflowRunUpdate = {
  status?: WorkflowRunStatus;
  output?: JsonValue;
  error?: StorageWorkflowError;
  suspensionData?: SuspensionData;
};

/**
 * Workflow analytics for a specific workflow
 * (renamed from WorkflowAnalytics to avoid collision with workflow.WorkflowAnalytics)
 */
export type StorageWorkflowAnalytics = {
  workflowId: string;
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  pendingRuns: number;
  runningRuns: number;
  averageDurationMs?: number;
  lastRunAt?: Date;
};

// =============================================================================
// Health Check Types
// =============================================================================

/**
 * Health check configuration for StorageHealthMonitor
 */
export type HealthCheckConfig = {
  /** Check interval in milliseconds */
  intervalMs?: number;
  /** Timeout for health check in milliseconds */
  timeoutMs?: number;
  /** Number of consecutive failures before unhealthy */
  failureThreshold?: number;
  /** Number of consecutive successes before healthy */
  successThreshold?: number;
  /** Enable automatic health checks */
  enabled?: boolean;
};

/**
 * Health check status enumeration
 */
export type HealthCheckStatus =
  | "healthy"
  | "unhealthy"
  | "degraded"
  | "unknown";

/**
 * Single health check history entry
 */
export type HealthCheckEntry = {
  /** Timestamp */
  timestamp: Date;
  /** Was healthy */
  healthy: boolean;
  /** Latency in milliseconds */
  latencyMs?: number;
  /** Error if unhealthy */
  error?: string;
};

/**
 * Detailed health check result with history and statistics
 */
export type DetailedHealthResult = StorageHealthResult & {
  /** Health status */
  status: HealthCheckStatus;
  /** Last check timestamp */
  lastCheck: Date;
  /** Consecutive failures */
  consecutiveFailures: number;
  /** Consecutive successes */
  consecutiveSuccesses: number;
  /** Average latency over recent checks */
  averageLatencyMs?: number;
  /** Health check history */
  history: HealthCheckEntry[];
};

/**
 * Health check callback signature
 */
export type HealthCheckCallback = (result: DetailedHealthResult) => void;

/**
 * Aggregated health status from multiple storage providers
 */
export type AggregatedHealthStatus = {
  /** Overall status */
  overallStatus: HealthCheckStatus;
  /** Individual storage statuses */
  storages: Record<string, DetailedHealthResult>;
  /** Count of healthy storages */
  healthyCount: number;
  /** Count of unhealthy storages */
  unhealthyCount: number;
  /** Count of degraded storages */
  degradedCount: number;
  /** Average latency across all storages */
  averageLatencyMs?: number;
  /** Timestamp */
  timestamp: Date;
};

// =============================================================================
// Transaction Types
// =============================================================================

/**
 * Transaction lifecycle state
 */
export type TransactionState =
  | "pending"
  | "active"
  | "committed"
  | "rolledback";

// =============================================================================
// Adapter-Internal Types (moved from implementation files)
// =============================================================================

/**
 * Minimal S3 client contract used internally by S3StorageAdapter.
 * Moved from src/lib/storage/adapters/S3StorageAdapter.ts
 */
export type StorageS3Client = {
  send(command: unknown): Promise<unknown>;
};

/**
 * Minimal better-sqlite3 / sql.js database contract used internally
 * by SQLiteStorageAdapter.
 * Moved from src/lib/storage/adapters/SQLiteStorageAdapter.ts
 */
export type StorageSQLiteDatabase = {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...params: unknown[]): { changes: number };
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  };
  close(): void;
};

/**
 * In-memory file storage data structure used by FileStorageAdapter.
 * Moved from src/lib/storage/adapters/FileStorageAdapter.ts (was `StorageData`).
 */
export type StorageFileData = {
  threads: Record<string, StorageThread>;
  messages: Record<string, StorageMessage>;
  workflowRuns: Record<string, StorageWorkflowRun>;
  customRecords: Record<string, StorageCustomRecord>;
  metadata: {
    version: number;
    createdAt: string;
    updatedAt: string;
  };
};

/**
 * MongoDB document type for threads.
 * Moved from src/lib/storage/adapters/mongodbAdapter.ts
 */
export type StorageMongoThreadDocument = {
  _id: string;
  resourceId: string;
  title?: string;
  metadata?: JsonObject;
  status?: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * MongoDB document type for messages.
 * Moved from src/lib/storage/adapters/mongodbAdapter.ts
 */
export type StorageMongoMessageDocument = {
  _id: string;
  threadId: string;
  role: string;
  content: string;
  type?: string;
  toolInfo?: JsonObject;
  metadata?: JsonObject;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * MongoDB document type for workflow runs.
 * Moved from src/lib/storage/adapters/mongodbAdapter.ts
 */
export type StorageMongoWorkflowRunDocument = {
  _id: string;
  workflowId: string;
  status: string;
  triggerData?: JsonObject;
  output?: JsonValue;
  error?: JsonObject;
  stepResults?: Record<string, unknown>;
  suspensionData?: JsonObject;
  resourceId?: string;
  threadId?: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * MongoDB document type for custom records.
 * Moved from src/lib/storage/adapters/mongodbAdapter.ts
 */
export type StorageMongoCustomRecordDocument = {
  _id: string; // Format: "namespace:key"
  namespace: string;
  key: string;
  value: JsonValue;
  metadata?: JsonObject;
  ttl?: number;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Storage provider factory function type.
 * Moved from src/lib/storage/storageFactory.ts
 */
export type StorageProviderFactoryFn = (
  config?: unknown,
) => Promise<StorageProvider>;

/**
 * Storage provider registration entry.
 * Moved from src/lib/storage/storageFactory.ts
 */
export type StorageProviderEntry = {
  /** Factory function to create provider instance */
  factory: StorageProviderFactoryFn;
  /** Default configuration */
  defaultConfig?: unknown;
  /** Provider aliases */
  aliases: string[];
};

// =============================================================================
// Lazy-referenced concrete class types (moved from implementation files)
// =============================================================================

/**
 * Type alias for KeyValueStore, used where a lazy dynamic import is needed.
 * Moved from src/lib/workflow/core/workflowRegistry.ts
 */
export type StorageKeyValueStore =
  import("../storage/managers/keyValueStore.js").KeyValueStore;

/**
 * Structural contract for a KV store used in token storage.
 * Mirrors the public API surface of KeyValueStore consumed by StorageTokenStorage.
 * Moved from src/lib/mcp/auth/tokenStorage.ts
 */
export type StorageKVStoreContract = {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, options?: unknown): Promise<void>;
  delete(key: string): Promise<boolean>;
  has(key: string): Promise<boolean>;
  clear(): Promise<number>;
};
