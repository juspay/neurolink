/**
 * Storage Abstraction Types for NeuroLink (Mastra extensions)
 *
 * This module defines additional type definitions for the unified storage
 * abstraction layer that extend or complement the core storage types.
 * It provides type-safe interfaces for multiple storage backends including
 * Memory, File, Redis, PostgreSQL, MongoDB, S3, and SQLite.
 *
 * @module storageMastra
 * @since 9.0.0
 */

import type { JsonValue, JsonObject } from "./common.js";
import type {
  StorageBackendType,
  MastraStorage,
  StorageThread,
  StorageMessage,
  StorageWorkflowRun,
  WorkflowRunStatus,
  StepRunResult,
} from "./storage.js";

// =============================================================================
// Storage Backend Types
// =============================================================================

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
 * PostgreSQL storage configuration (Mastra variant)
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
 * Memory storage configuration (Mastra variant)
 */
export type MastraMemoryStorageConfig = BaseStorageConfig & {
  type: "memory";
  /** Maximum number of items to store (for LRU eviction) */
  maxItems?: number;
  /** Maximum memory usage in bytes */
  maxMemory?: number;
};

/**
 * Redis storage configuration (Mastra variant)
 */
export type MastraRedisStorageConfig = BaseStorageConfig & {
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
 * MongoDB storage configuration (Mastra variant)
 */
export type MastraMongoDBStorageConfig = BaseStorageConfig & {
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
 * Union of all Mastra storage configurations
 */
export type MastraStorageConfig =
  | MastraMemoryStorageConfig
  | FileStorageConfig
  | MastraRedisStorageConfig
  | PostgreSQLStorageConfig
  | MastraMongoDBStorageConfig
  | S3StorageConfig
  | SQLiteStorageConfig;

// =============================================================================
// Migration Types (Mastra variants)
// =============================================================================

/**
 * Migration status
 */
export type MigrationStatus = {
  /** Current version */
  currentVersion: number;
  /** Latest available version */
  latestVersion: number;
  /** Pending migrations */
  pending: MastraMigration[];
  /** Applied migrations */
  applied: Array<{
    version: number;
    name: string;
    appliedAt: Date;
  }>;
};

/**
 * Migration definition (Mastra variant — uses async functions rather than SQL strings)
 */
export type MastraMigration = {
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
 * Migration result (Mastra variant)
 */
export type MastraMigrationResult = {
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
// Middleware Types
// =============================================================================

/**
 * Storage middleware type for intercepting operations
 */
export type StorageMiddleware = {
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
};

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

// =============================================================================
// Middleware Internal Types (moved from implementation files)
// =============================================================================

/**
 * Cache entry used internally by CachingMiddleware.
 * Moved from src/lib/storage/middleware/CachingMiddleware.ts
 */
export type StorageCacheEntry = {
  value: JsonValue;
  expiresAt: number;
  accessedAt: number;
};

/**
 * Cache statistics returned by CachingMiddleware.getStats().
 * Moved from src/lib/storage/middleware/CachingMiddleware.ts
 */
export type StorageCacheStats = {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  hitRate: number;
};

/**
 * Compression algorithm identifiers supported by CompressionMiddleware.
 * Moved from src/lib/storage/middleware/CompressionMiddleware.ts
 */
export type StorageCompressionAlgorithm = "gzip" | "deflate" | "brotli" | "lz4";

/**
 * Compressed payload envelope stored by CompressionMiddleware.
 * Moved from src/lib/storage/middleware/CompressionMiddleware.ts
 */
export type StorageCompressedPayload = {
  __compressed: true;
  algorithm: StorageCompressionAlgorithm;
  data: string;
  originalSize: number;
  compressedSize: number;
};

/**
 * Compression statistics returned by CompressionMiddleware.getStats().
 * Moved from src/lib/storage/middleware/CompressionMiddleware.ts
 */
export type StorageCompressionStats = {
  compressed: number;
  skipped: number;
  totalOriginalSize: number;
  totalCompressedSize: number;
  compressionRatio: number;
};

/**
 * Encryption algorithm identifiers supported by EncryptionMiddleware.
 * Moved from src/lib/storage/middleware/EncryptionMiddleware.ts
 */
export type StorageEncryptionAlgorithm =
  | "aes-256-gcm"
  | "aes-256-cbc"
  | "chacha20-poly1305";

/**
 * Key derivation functions supported by EncryptionMiddleware.
 * Moved from src/lib/storage/middleware/EncryptionMiddleware.ts
 */
export type StorageEncryptionKdf = "pbkdf2" | "scrypt";

/**
 * Encrypted payload envelope stored by EncryptionMiddleware.
 * Moved from src/lib/storage/middleware/EncryptionMiddleware.ts
 */
export type StorageEncryptedPayload = {
  __encrypted: true;
  algorithm: StorageEncryptionAlgorithm;
  iv: string;
  data: string;
  tag?: string; // For authenticated encryption (GCM, ChaCha20)
};

// =============================================================================
// Re-export referenced types to avoid import errors in consumers
// =============================================================================

export type {
  StorageThread,
  StorageMessage,
  StorageWorkflowRun,
  WorkflowRunStatus,
  StepRunResult,
};
