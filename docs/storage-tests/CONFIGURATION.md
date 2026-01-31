# Storage Configuration Reference

This document details all configuration options for the NeuroLink Storage Abstraction system.

## Overview

The Storage Abstraction supports multiple backends through a unified configuration interface. Configuration can be provided via:

1. Direct configuration objects
2. Environment variables
3. Configuration files

## Quick Start

```typescript
import { createStorage, StorageFactory } from "neurolink/storage";

// Simple creation with defaults
const storage = await createStorage("memory");

// With configuration
const storage = await createStorage("memory", {
  maxEntries: 10000,
  cleanupIntervalMs: 60000,
});

// From environment
const storage = await createStorageFromEnv();
```

## Backend-Specific Configuration

### Memory Adapter

In-memory storage for development and testing.

```typescript
interface MemoryAdapterConfig {
  /** Maximum number of entries before eviction */
  maxEntries?: number; // Default: 10000

  /** Cleanup interval in milliseconds */
  cleanupIntervalMs?: number; // Default: 60000

  /** Enable LRU eviction */
  enableLRU?: boolean; // Default: true

  /** Enable compression for large values */
  enableCompression?: boolean; // Default: false
}
```

**Example:**

```typescript
const storage = await createStorage("memory", {
  maxEntries: 5000,
  cleanupIntervalMs: 30000,
  enableLRU: true,
});
```

### LibSQL/SQLite Adapter

SQLite-based storage via LibSQL.

```typescript
interface LibSQLAdapterConfig {
  /** Database URL (file path or remote URL) */
  url: string;

  /** Auth token for Turso/remote connections */
  authToken?: string;

  /** Sync URL for embedded replicas */
  syncUrl?: string;

  /** Sync interval in milliseconds */
  syncInterval?: number; // Default: 60000

  /** Encryption key for at-rest encryption */
  encryptionKey?: string;

  /** Journal mode (WAL, DELETE, TRUNCATE, MEMORY) */
  journalMode?: string; // Default: 'WAL'

  /** Busy timeout in milliseconds */
  busyTimeout?: number; // Default: 5000
}
```

**Examples:**

```typescript
// Local SQLite file
const storage = await createStorage("libsql", {
  url: "file:./data/neurolink.db",
  journalMode: "WAL",
});

// In-memory SQLite
const storage = await createStorage("libsql", {
  url: "file::memory:",
});

// Turso cloud
const storage = await createStorage("libsql", {
  url: "libsql://your-database.turso.io",
  authToken: process.env.LIBSQL_AUTH_TOKEN,
});

// Embedded replica
const storage = await createStorage("libsql", {
  url: "file:./data/local-replica.db",
  syncUrl: "libsql://your-database.turso.io",
  authToken: process.env.LIBSQL_AUTH_TOKEN,
  syncInterval: 30000,
});
```

### PostgreSQL Adapter

Full-featured relational storage.

```typescript
interface PostgreSQLAdapterConfig {
  /** Connection string */
  connectionString: string;

  /** Enable SSL/TLS */
  ssl?: boolean | object;

  /** Connection pool size */
  poolSize?: number; // Default: 10

  /** Idle connection timeout in ms */
  idleTimeoutMs?: number; // Default: 30000

  /** Connection acquisition timeout in ms */
  connectionTimeoutMs?: number; // Default: 10000

  /** Statement timeout in ms */
  statementTimeout?: number; // Default: 60000

  /** Schema name */
  schema?: string; // Default: 'public'

  /** Table prefix */
  tablePrefix?: string; // Default: 'neurolink_'
}
```

**Examples:**

```typescript
// Basic connection
const storage = await createStorage("postgresql", {
  connectionString: "postgresql://user:password@localhost:5432/neurolink",
});

// With SSL and pool configuration
const storage = await createStorage("postgresql", {
  connectionString: "postgresql://user:password@db.example.com:5432/neurolink",
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync("./certs/ca.pem"),
  },
  poolSize: 20,
  idleTimeoutMs: 60000,
});

// AWS RDS
const storage = await createStorage("postgresql", {
  connectionString: `postgresql://${process.env.RDS_USER}:${process.env.RDS_PASSWORD}@${process.env.RDS_HOST}:5432/neurolink`,
  ssl: { rejectUnauthorized: true },
});
```

### MongoDB Adapter

Document-oriented storage.

```typescript
interface MongoDBAdapterConfig {
  /** MongoDB connection string */
  connectionString: string;

  /** Database name */
  database?: string; // Default: 'neurolink'

  /** Maximum pool size */
  maxPoolSize?: number; // Default: 10

  /** Minimum pool size */
  minPoolSize?: number; // Default: 2

  /** Server selection timeout in ms */
  serverSelectionTimeoutMS?: number; // Default: 5000

  /** Socket timeout in ms */
  socketTimeoutMS?: number; // Default: 30000

  /** Connection timeout in ms */
  connectTimeoutMS?: number; // Default: 10000

  /** Enable retry writes */
  retryWrites?: boolean; // Default: true

  /** Enable retry reads */
  retryReads?: boolean; // Default: true

  /** Collection prefix */
  collectionPrefix?: string; // Default: 'neurolink_'
}
```

**Examples:**

```typescript
// Local MongoDB
const storage = await createStorage("mongodb", {
  connectionString: "mongodb://localhost:27017/neurolink",
});

// MongoDB Atlas
const storage = await createStorage("mongodb", {
  connectionString: `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster.mongodb.net/neurolink?retryWrites=true&w=majority`,
});

// Replica set
const storage = await createStorage("mongodb", {
  connectionString:
    "mongodb://mongo1:27017,mongo2:27017,mongo3:27017/neurolink?replicaSet=rs0",
  maxPoolSize: 20,
});
```

### Redis Adapter

High-performance key-value storage.

```typescript
interface RedisAdapterConfig {
  /** Redis host */
  host?: string; // Default: 'localhost'

  /** Redis port */
  port?: number; // Default: 6379

  /** Redis password */
  password?: string;

  /** Database number */
  db?: number; // Default: 0

  /** Key prefix */
  keyPrefix?: string; // Default: 'neurolink:'

  /** Max retries per request */
  maxRetriesPerRequest?: number; // Default: 3

  /** Enable ready check */
  enableReadyCheck?: boolean; // Default: true

  /** Connect timeout in ms */
  connectTimeout?: number; // Default: 10000

  /** Command timeout in ms */
  commandTimeout?: number; // Default: 5000

  /** Enable TLS */
  tls?: object;

  /** Cluster configuration */
  cluster?: RedisClusterConfig;

  /** Sentinel configuration */
  sentinel?: RedisSentinelConfig;
}
```

**Examples:**

```typescript
// Simple connection
const storage = await createStorage("redis", {
  host: "localhost",
  port: 6379,
  db: 0,
});

// With authentication
const storage = await createStorage("redis", {
  host: "redis.example.com",
  port: 6379,
  password: process.env.REDIS_PASSWORD,
  tls: {},
});

// Redis Cluster
const storage = await createStorage("redis", {
  cluster: {
    nodes: [
      { host: "redis-1", port: 7000 },
      { host: "redis-2", port: 7001 },
      { host: "redis-3", port: 7002 },
    ],
    redisOptions: {
      password: process.env.REDIS_PASSWORD,
    },
  },
});

// Redis Sentinel
const storage = await createStorage("redis", {
  sentinel: {
    sentinels: [
      { host: "sentinel-1", port: 26379 },
      { host: "sentinel-2", port: 26379 },
    ],
    name: "mymaster",
    password: process.env.REDIS_PASSWORD,
  },
});
```

### S3 Adapter

Object storage for large data.

```typescript
interface S3AdapterConfig {
  /** S3 bucket name */
  bucket: string;

  /** AWS region */
  region?: string; // Default: 'us-east-1'

  /** Key prefix */
  prefix?: string; // Default: 'storage/'

  /** AWS access key ID */
  accessKeyId?: string;

  /** AWS secret access key */
  secretAccessKey?: string;

  /** Custom endpoint (for MinIO, etc.) */
  endpoint?: string;

  /** Force path style (for MinIO) */
  forcePathStyle?: boolean; // Default: false

  /** Server-side encryption */
  serverSideEncryption?: "AES256" | "aws:kms";

  /** KMS key ID for encryption */
  kmsKeyId?: string;
}
```

**Examples:**

```typescript
// AWS S3
const storage = await createStorage("s3", {
  bucket: "my-neurolink-bucket",
  region: "us-west-2",
  // Uses default AWS credentials chain
});

// With explicit credentials
const storage = await createStorage("s3", {
  bucket: "my-neurolink-bucket",
  region: "us-west-2",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// MinIO (S3-compatible)
const storage = await createStorage("s3", {
  bucket: "neurolink",
  endpoint: "http://localhost:9000",
  accessKeyId: "minioadmin",
  secretAccessKey: "minioadmin",
  forcePathStyle: true,
});

// With encryption
const storage = await createStorage("s3", {
  bucket: "secure-bucket",
  region: "us-east-1",
  serverSideEncryption: "aws:kms",
  kmsKeyId: "arn:aws:kms:us-east-1:123456789:key/key-id",
});
```

## Environment Variables

All configurations can be set via environment variables:

| Variable                    | Description               | Example                               |
| --------------------------- | ------------------------- | ------------------------------------- |
| `STORAGE_TYPE`              | Backend type              | `memory`, `postgresql`, `mongodb`     |
| `STORAGE_CONNECTION_STRING` | Generic connection string | `postgresql://...`                    |
| `POSTGRESQL_URL`            | PostgreSQL connection     | `postgresql://user:pass@host:5432/db` |
| `MONGODB_URL`               | MongoDB connection        | `mongodb://host:27017/db`             |
| `REDIS_URL`                 | Redis connection          | `redis://host:6379/0`                 |
| `REDIS_HOST`                | Redis host                | `localhost`                           |
| `REDIS_PORT`                | Redis port                | `6379`                                |
| `REDIS_PASSWORD`            | Redis password            | `secret`                              |
| `LIBSQL_URL`                | LibSQL/Turso URL          | `libsql://db.turso.io`                |
| `LIBSQL_AUTH_TOKEN`         | Turso auth token          | `token...`                            |
| `AWS_ACCESS_KEY_ID`         | AWS access key            | `AKIA...`                             |
| `AWS_SECRET_ACCESS_KEY`     | AWS secret key            | `secret...`                           |
| `S3_BUCKET`                 | S3 bucket name            | `my-bucket`                           |
| `S3_REGION`                 | S3 region                 | `us-east-1`                           |

## Middleware Configuration

### Caching Middleware

```typescript
interface CachingConfig {
  enabled: boolean;
  strategy: "LRU" | "LFU" | "FIFO";
  maxSize: number;
  ttl: number; // milliseconds
  updateAgeOnGet: boolean;
}
```

### Encryption Middleware

```typescript
interface EncryptionConfig {
  enabled: boolean;
  algorithm: "aes-256-gcm" | "chacha20-poly1305";
  keySource: "environment" | "file" | "kms" | "vault";
  keyEnvVar?: string;
  keyFilePath?: string;
  kmsKeyId?: string;
  fieldLevelEncryption?: boolean;
  encryptFields?: string[];
}
```

### Compression Middleware

```typescript
interface CompressionConfig {
  enabled: boolean;
  algorithm: "gzip" | "brotli" | "lz4" | "zstd";
  level: number;
  minSizeToCompress: number; // bytes
}
```

## Complete Configuration Example

```typescript
import { createStorage, withMiddleware } from "neurolink/storage";

const storage = await createStorage("postgresql", {
  connectionString: process.env.DATABASE_URL,
  poolSize: 20,
  ssl: true,
});

const enhancedStorage = withMiddleware(storage, {
  caching: {
    enabled: true,
    strategy: "LRU",
    maxSize: 10000,
    ttl: 300000,
  },
  encryption: {
    enabled: true,
    algorithm: "aes-256-gcm",
    keySource: "environment",
    keyEnvVar: "STORAGE_ENCRYPTION_KEY",
  },
  compression: {
    enabled: true,
    algorithm: "brotli",
    level: 4,
    minSizeToCompress: 1024,
  },
});
```

## Configuration Best Practices

1. **Use environment variables** for sensitive data (passwords, keys)
2. **Enable connection pooling** for production databases
3. **Set appropriate timeouts** to prevent hanging connections
4. **Use SSL/TLS** for remote connections
5. **Configure retry logic** for resilience
6. **Monitor connection pool metrics** in production
