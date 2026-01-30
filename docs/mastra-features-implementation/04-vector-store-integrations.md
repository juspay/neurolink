# Vector Store Integrations Implementation Guide

> Implementation guide for adding 22+ vector store integrations to NeuroLink, inspired by Mastra's vector store architecture.

## Table of Contents

1. [Overview](#overview)
2. [Architecture Design](#architecture-design)
3. [Abstract MastraVector Interface](#abstract-mastravector-interface)
4. [Common Operations](#common-operations)
5. [Metadata Filtering Patterns](#metadata-filtering-patterns)
6. [File Structure](#file-structure)
7. [Vector Store Implementations](#vector-store-implementations)
8. [Configuration Patterns](#configuration-patterns)
9. [Step-by-Step Implementation Plan](#step-by-step-implementation-plan)
10. [Testing Strategy](#testing-strategy)

---

## Overview

Vector stores are essential for RAG (Retrieval Augmented Generation) applications, semantic search, and AI memory systems. This guide outlines the implementation of 22+ vector store integrations following NeuroLink's established patterns.

### Supported Vector Stores

| Category                | Vector Stores                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| **Cloud-Native**        | Pinecone, Qdrant Cloud, Weaviate Cloud, Astra DB (DataStax), Cloudflare Vectorize, Upstash Vector |
| **Database Extensions** | PostgreSQL/pgvector, MongoDB Atlas Vector Search, Elasticsearch, OpenSearch, Couchbase            |
| **Embedded/Local**      | Chroma, Lance, DuckDB, LibSQL, SQLite-VSS                                                         |
| **Enterprise**          | Azure AI Search, Google Vertex AI Vector Search, AWS OpenSearch Serverless                        |
| **Specialized**         | Milvus, Zilliz, Vespa, Marqo                                                                      |

---

## Architecture Design

### Design Principles

Following NeuroLink's established patterns from the provider system:

1. **Factory + Registry Pattern** - Dynamic registration with lazy loading
2. **Abstract Base Class** - Common interface for all vector stores
3. **Type Safety** - Comprehensive TypeScript types
4. **Composition over Inheritance** - Modular, testable components
5. **Configuration Management** - Environment-based configuration

### Architecture Diagram

```
                    ┌─────────────────────────────┐
                    │       NeuroLink SDK         │
                    └─────────────────────────────┘
                                  │
                    ┌─────────────────────────────┐
                    │     VectorStoreFactory      │
                    │  (Registration & Creation)  │
                    └─────────────────────────────┘
                                  │
                    ┌─────────────────────────────┐
                    │    VectorStoreRegistry      │
                    │   (Dynamic Registration)    │
                    └─────────────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
    ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
    │  Pinecone   │       │   Qdrant    │       │  pgvector   │
    │   Store     │       │   Store     │       │   Store     │
    └─────────────┘       └─────────────┘       └─────────────┘
          │                       │                       │
    ┌─────────────────────────────────────────────────────────┐
    │              BaseVectorStore (Abstract)                 │
    │  - upsert(), query(), delete(), createIndex()          │
    │  - Metadata filtering, batch operations                 │
    └─────────────────────────────────────────────────────────┘
```

---

## Abstract MastraVector Interface

### Core Types

```typescript
// src/lib/types/vectorTypes.ts

import type { JsonValue, UnknownRecord } from "./common.js";

/**
 * Vector store provider names
 */
export enum VectorStoreName {
  PINECONE = "pinecone",
  QDRANT = "qdrant",
  CHROMA = "chroma",
  PGVECTOR = "pgvector",
  MONGODB = "mongodb",
  ELASTICSEARCH = "elasticsearch",
  OPENSEARCH = "opensearch",
  WEAVIATE = "weaviate",
  LANCE = "lance",
  DUCKDB = "duckdb",
  CLOUDFLARE = "cloudflare",
  UPSTASH = "upstash",
  ASTRA = "astra",
  COUCHBASE = "couchbase",
  LIBSQL = "libsql",
  MILVUS = "milvus",
  ZILLIZ = "zilliz",
  AZURE_AI_SEARCH = "azure-ai-search",
  VERTEX_VECTOR = "vertex-vector",
  AWS_OPENSEARCH = "aws-opensearch",
  VESPA = "vespa",
  MARQO = "marqo",
}

/**
 * Similarity metrics for vector search
 */
export type SimilarityMetric = "cosine" | "euclidean" | "dotProduct";

/**
 * Vector record with metadata
 */
export type VectorRecord<TMetadata extends UnknownRecord = UnknownRecord> = {
  /** Unique identifier for the vector */
  id: string;
  /** The embedding vector (array of numbers) */
  vector: number[];
  /** Optional metadata associated with the vector */
  metadata?: TMetadata;
  /** Optional text content that was embedded */
  content?: string;
  /** Optional namespace/collection for organization */
  namespace?: string;
};

/**
 * Query result from vector search
 */
export type VectorQueryResult<TMetadata extends UnknownRecord = UnknownRecord> =
  {
    /** Unique identifier */
    id: string;
    /** Similarity score (higher = more similar for cosine/dotProduct) */
    score: number;
    /** Original vector (if requested) */
    vector?: number[];
    /** Associated metadata */
    metadata?: TMetadata;
    /** Original content (if stored) */
    content?: string;
  };

/**
 * Index configuration for vector stores
 */
export type VectorIndexConfig = {
  /** Index/collection name */
  name: string;
  /** Vector dimension (e.g., 1536 for OpenAI ada-002, 3072 for text-embedding-3-large) */
  dimension: number;
  /** Similarity metric */
  metric?: SimilarityMetric;
  /** Provider-specific configuration */
  config?: UnknownRecord;
};

/**
 * Query options for vector search
 */
export type VectorQueryOptions<
  TMetadata extends UnknownRecord = UnknownRecord,
> = {
  /** Query vector */
  vector: number[];
  /** Number of results to return */
  topK: number;
  /** Minimum similarity score threshold */
  minScore?: number;
  /** Metadata filter */
  filter?: MetadataFilter<TMetadata>;
  /** Include vectors in results */
  includeVectors?: boolean;
  /** Include metadata in results */
  includeMetadata?: boolean;
  /** Namespace to search within */
  namespace?: string;
};

/**
 * Upsert options
 */
export type VectorUpsertOptions = {
  /** Namespace for the vectors */
  namespace?: string;
  /** Batch size for large upserts */
  batchSize?: number;
};

/**
 * Delete options
 */
export type VectorDeleteOptions = {
  /** IDs to delete */
  ids?: string[];
  /** Filter to match records for deletion */
  filter?: MetadataFilter;
  /** Namespace to delete from */
  namespace?: string;
  /** Delete all records (use with caution) */
  deleteAll?: boolean;
};

/**
 * Vector store statistics
 */
export type VectorStoreStats = {
  /** Total number of vectors */
  vectorCount: number;
  /** Index size in bytes (if available) */
  indexSize?: number;
  /** Dimension of vectors */
  dimension?: number;
  /** Number of namespaces */
  namespaceCount?: number;
  /** Provider-specific metrics */
  metrics?: UnknownRecord;
};

/**
 * Vector store health status
 */
export type VectorStoreHealth = {
  /** Whether the store is healthy */
  healthy: boolean;
  /** Store status */
  status: "connected" | "disconnected" | "degraded" | "error";
  /** Response time in ms */
  latencyMs?: number;
  /** Error message if unhealthy */
  error?: string;
  /** Last health check timestamp */
  lastChecked: Date;
};
```

### Metadata Filter Types

```typescript
// src/lib/types/vectorFilterTypes.ts

import type { JsonValue, UnknownRecord } from "./common.js";

/**
 * Comparison operators for metadata filtering
 */
export type ComparisonOperator =
  | "$eq" // Equal
  | "$ne" // Not equal
  | "$gt" // Greater than
  | "$gte" // Greater than or equal
  | "$lt" // Less than
  | "$lte" // Less than or equal
  | "$in" // In array
  | "$nin" // Not in array
  | "$exists" // Field exists
  | "$contains" // String contains
  | "$startsWith" // String starts with
  | "$endsWith"; // String ends with

/**
 * Logical operators for combining filters
 */
export type LogicalOperator = "$and" | "$or" | "$not";

/**
 * Field-level filter condition
 */
export type FieldFilter = {
  [K in ComparisonOperator]?: JsonValue;
};

/**
 * Metadata filter for vector queries
 * Supports nested conditions and logical operators
 */
export type MetadataFilter<TMetadata extends UnknownRecord = UnknownRecord> = {
  [K in keyof TMetadata]?: TMetadata[K] | FieldFilter;
} & {
  $and?: MetadataFilter<TMetadata>[];
  $or?: MetadataFilter<TMetadata>[];
  $not?: MetadataFilter<TMetadata>;
};

/**
 * Example filter usage:
 *
 * // Simple equality
 * { category: "tech" }
 *
 * // Comparison operators
 * { price: { $gte: 100, $lte: 500 } }
 *
 * // Logical operators
 * { $and: [{ category: "tech" }, { status: "active" }] }
 *
 * // Combined
 * {
 *   $or: [
 *     { category: "tech", price: { $lt: 100 } },
 *     { featured: true }
 *   ]
 * }
 */
```

### Abstract Base Class

```typescript
// src/lib/stores/baseVectorStore.ts

import type {
  VectorRecord,
  VectorQueryResult,
  VectorIndexConfig,
  VectorQueryOptions,
  VectorUpsertOptions,
  VectorDeleteOptions,
  VectorStoreStats,
  VectorStoreHealth,
  VectorStoreName,
} from "../types/vectorTypes.js";
import type { MetadataFilter } from "../types/vectorFilterTypes.js";
import type { UnknownRecord } from "../types/common.js";
import { logger } from "../utils/logger.js";

/**
 * Configuration for vector store instances
 */
export type VectorStoreConfig = {
  /** Store name for identification */
  name?: string;
  /** Connection timeout in ms */
  timeout?: number;
  /** Maximum retries for operations */
  maxRetries?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Provider-specific configuration */
  [key: string]: unknown;
};

/**
 * Abstract base class for all vector store implementations
 * Follows NeuroLink's BaseProvider pattern
 */
export abstract class BaseVectorStore<
  TConfig extends VectorStoreConfig = VectorStoreConfig,
> {
  protected readonly config: TConfig;
  protected readonly storeName: VectorStoreName;
  protected initialized: boolean = false;

  constructor(config: TConfig, storeName: VectorStoreName) {
    this.config = config;
    this.storeName = storeName;
  }

  // ===================
  // ABSTRACT METHODS (Must be implemented by each store)
  // ===================

  /**
   * Initialize connection to the vector store
   */
  abstract connect(): Promise<void>;

  /**
   * Close connection to the vector store
   */
  abstract disconnect(): Promise<void>;

  /**
   * Create a new index/collection
   */
  abstract createIndex(config: VectorIndexConfig): Promise<void>;

  /**
   * Delete an index/collection
   */
  abstract deleteIndex(indexName: string): Promise<void>;

  /**
   * List all indexes/collections
   */
  abstract listIndexes(): Promise<string[]>;

  /**
   * Check if an index exists
   */
  abstract indexExists(indexName: string): Promise<boolean>;

  /**
   * Upsert vectors (insert or update)
   */
  abstract upsert<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    records: VectorRecord<TMetadata>[],
    options?: VectorUpsertOptions,
  ): Promise<{ upsertedCount: number }>;

  /**
   * Query vectors by similarity
   */
  abstract query<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    options: VectorQueryOptions<TMetadata>,
  ): Promise<VectorQueryResult<TMetadata>[]>;

  /**
   * Delete vectors
   */
  abstract delete(
    indexName: string,
    options: VectorDeleteOptions,
  ): Promise<{ deletedCount: number }>;

  /**
   * Get index statistics
   */
  abstract getStats(indexName: string): Promise<VectorStoreStats>;

  /**
   * Convert abstract filter to provider-specific format
   */
  protected abstract translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): unknown;

  // ===================
  // COMMON METHODS (Shared implementations)
  // ===================

  /**
   * Get store health status
   */
  async healthCheck(): Promise<VectorStoreHealth> {
    const startTime = Date.now();
    try {
      // Simple connectivity test
      await this.listIndexes();
      return {
        healthy: true,
        status: "connected",
        latencyMs: Date.now() - startTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        healthy: false,
        status: "error",
        latencyMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Upsert in batches for large datasets
   */
  async batchUpsert<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    records: VectorRecord<TMetadata>[],
    options?: VectorUpsertOptions & { batchSize?: number },
  ): Promise<{ upsertedCount: number }> {
    const batchSize = options?.batchSize || 100;
    let totalUpserted = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const result = await this.upsert(indexName, batch, options);
      totalUpserted += result.upsertedCount;

      logger.debug(
        `Batch upsert progress: ${totalUpserted}/${records.length}`,
        {
          store: this.storeName,
          index: indexName,
        },
      );
    }

    return { upsertedCount: totalUpserted };
  }

  /**
   * Query with automatic pagination
   */
  async queryAll<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    options: VectorQueryOptions<TMetadata> & { maxResults?: number },
  ): Promise<VectorQueryResult<TMetadata>[]> {
    const maxResults = options.maxResults || 1000;
    const pageSize = Math.min(options.topK, 100);
    const results: VectorQueryResult<TMetadata>[] = [];

    // Note: Pagination strategy varies by provider
    // This is a simplified implementation
    const queryResults = await this.query(indexName, {
      ...options,
      topK: Math.min(maxResults, pageSize),
    });

    results.push(...queryResults);
    return results.slice(0, maxResults);
  }

  /**
   * Get the store name
   */
  getStoreName(): VectorStoreName {
    return this.storeName;
  }

  /**
   * Check if store is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Ensure store is initialized before operations
   */
  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        `Vector store ${this.storeName} not initialized. Call connect() first.`,
      );
    }
  }

  /**
   * Validate vector dimensions
   */
  protected validateDimensions(
    vectors: number[][],
    expectedDimension?: number,
  ): void {
    if (vectors.length === 0) return;

    const firstDim = vectors[0].length;
    for (const vec of vectors) {
      if (vec.length !== firstDim) {
        throw new Error(
          `Inconsistent vector dimensions: expected ${firstDim}, got ${vec.length}`,
        );
      }
      if (expectedDimension && vec.length !== expectedDimension) {
        throw new Error(
          `Vector dimension mismatch: expected ${expectedDimension}, got ${vec.length}`,
        );
      }
    }
  }
}
```

---

## Common Operations

### Upsert Operation

```typescript
// Usage example
const store = await VectorStoreFactory.createStore(VectorStoreName.PINECONE, {
  apiKey: process.env.PINECONE_API_KEY!,
  environment: process.env.PINECONE_ENVIRONMENT!,
});

await store.connect();

// Single upsert
await store.upsert("my-index", [
  {
    id: "doc-1",
    vector: [0.1, 0.2, 0.3, ...], // 1536 dimensions for OpenAI
    metadata: {
      title: "Introduction to AI",
      category: "technology",
      author: "John Doe",
      createdAt: "2024-01-15",
    },
    content: "Original text content for reference",
  },
]);

// Batch upsert for large datasets
await store.batchUpsert("my-index", records, { batchSize: 100 });
```

### Query Operation

```typescript
// Simple similarity search
const results = await store.query("my-index", {
  vector: queryEmbedding,
  topK: 10,
  includeMetadata: true,
});

// Query with metadata filter
const filteredResults = await store.query("my-index", {
  vector: queryEmbedding,
  topK: 10,
  filter: {
    category: "technology",
    createdAt: { $gte: "2024-01-01" },
  },
  minScore: 0.7,
  includeMetadata: true,
});

// Complex filter with logical operators
const complexResults = await store.query("my-index", {
  vector: queryEmbedding,
  topK: 20,
  filter: {
    $and: [
      { category: { $in: ["technology", "science"] } },
      {
        $or: [{ featured: true }, { views: { $gte: 1000 } }],
      },
    ],
  },
});
```

### Delete Operation

```typescript
// Delete by IDs
await store.delete("my-index", {
  ids: ["doc-1", "doc-2", "doc-3"],
});

// Delete by filter
await store.delete("my-index", {
  filter: {
    category: "deprecated",
    status: "archived",
  },
});

// Delete namespace
await store.delete("my-index", {
  namespace: "old-data",
  deleteAll: true,
});
```

---

## Metadata Filtering Patterns

### Filter Translation Layer

Each vector store has its own query language. We implement a translation layer:

```typescript
// src/lib/stores/filterTranslator.ts

import type {
  MetadataFilter,
  FieldFilter,
} from "../types/vectorFilterTypes.js";

/**
 * Translate abstract filter to Pinecone format
 */
export function translateToPinecone(
  filter: MetadataFilter,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(filter)) {
    if (key === "$and") {
      result["$and"] = (value as MetadataFilter[]).map(translateToPinecone);
    } else if (key === "$or") {
      result["$or"] = (value as MetadataFilter[]).map(translateToPinecone);
    } else if (key === "$not") {
      // Pinecone doesn't have $not, need to transform
      const inner = translateToPinecone(value as MetadataFilter);
      // Convert each condition to its negation
      for (const [k, v] of Object.entries(inner)) {
        result[k] = { $ne: v };
      }
    } else if (isFieldFilter(value)) {
      result[key] = translateFieldFilter(value as FieldFilter);
    } else {
      result[key] = { $eq: value };
    }
  }

  return result;
}

/**
 * Translate abstract filter to Qdrant format
 */
export function translateToQdrant(
  filter: MetadataFilter,
): Record<string, unknown> {
  const conditions: unknown[] = [];

  for (const [key, value] of Object.entries(filter)) {
    if (key === "$and") {
      conditions.push({
        must: (value as MetadataFilter[]).map(translateToQdrant),
      });
    } else if (key === "$or") {
      conditions.push({
        should: (value as MetadataFilter[]).map(translateToQdrant),
      });
    } else if (key === "$not") {
      conditions.push({
        must_not: [translateToQdrant(value as MetadataFilter)],
      });
    } else if (isFieldFilter(value)) {
      conditions.push(translateQdrantFieldFilter(key, value as FieldFilter));
    } else {
      conditions.push({
        key,
        match: { value },
      });
    }
  }

  return conditions.length === 1 ? conditions[0] : { must: conditions };
}

/**
 * Translate abstract filter to pgvector/SQL format
 */
export function translateToPgvector(
  filter: MetadataFilter,
  paramIndex: number = 1,
): { sql: string; params: unknown[]; nextIndex: number } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let currentIndex = paramIndex;

  for (const [key, value] of Object.entries(filter)) {
    if (key === "$and") {
      const subConditions = (value as MetadataFilter[]).map((f) => {
        const result = translateToPgvector(f, currentIndex);
        currentIndex = result.nextIndex;
        params.push(...result.params);
        return `(${result.sql})`;
      });
      conditions.push(subConditions.join(" AND "));
    } else if (key === "$or") {
      const subConditions = (value as MetadataFilter[]).map((f) => {
        const result = translateToPgvector(f, currentIndex);
        currentIndex = result.nextIndex;
        params.push(...result.params);
        return `(${result.sql})`;
      });
      conditions.push(`(${subConditions.join(" OR ")})`);
    } else if (key === "$not") {
      const result = translateToPgvector(value as MetadataFilter, currentIndex);
      currentIndex = result.nextIndex;
      params.push(...result.params);
      conditions.push(`NOT (${result.sql})`);
    } else if (isFieldFilter(value)) {
      const { sql, param, newIndex } = translatePgFieldFilter(
        key,
        value as FieldFilter,
        currentIndex,
      );
      conditions.push(sql);
      params.push(...param);
      currentIndex = newIndex;
    } else {
      conditions.push(`metadata->>'${key}' = $${currentIndex}`);
      params.push(value);
      currentIndex++;
    }
  }

  return {
    sql: conditions.join(" AND "),
    params,
    nextIndex: currentIndex,
  };
}

function isFieldFilter(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const keys = Object.keys(value);
  return keys.some((k) => k.startsWith("$"));
}

function translateFieldFilter(filter: FieldFilter): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [op, val] of Object.entries(filter)) {
    result[op] = val;
  }
  return result;
}

function translateQdrantFieldFilter(
  key: string,
  filter: FieldFilter,
): Record<string, unknown> {
  for (const [op, val] of Object.entries(filter)) {
    switch (op) {
      case "$eq":
        return { key, match: { value: val } };
      case "$ne":
        return { key, match: { value: val, negate: true } };
      case "$gt":
        return { key, range: { gt: val } };
      case "$gte":
        return { key, range: { gte: val } };
      case "$lt":
        return { key, range: { lt: val } };
      case "$lte":
        return { key, range: { lte: val } };
      case "$in":
        return { key, match: { any: val } };
      default:
        return { key, match: { value: val } };
    }
  }
  return {};
}

function translatePgFieldFilter(
  key: string,
  filter: FieldFilter,
  paramIndex: number,
): { sql: string; param: unknown[]; newIndex: number } {
  const params: unknown[] = [];
  let index = paramIndex;

  for (const [op, val] of Object.entries(filter)) {
    switch (op) {
      case "$eq":
        return {
          sql: `metadata->>'${key}' = $${index}`,
          param: [val],
          newIndex: index + 1,
        };
      case "$ne":
        return {
          sql: `metadata->>'${key}' != $${index}`,
          param: [val],
          newIndex: index + 1,
        };
      case "$gt":
        return {
          sql: `(metadata->>'${key}')::numeric > $${index}`,
          param: [val],
          newIndex: index + 1,
        };
      case "$gte":
        return {
          sql: `(metadata->>'${key}')::numeric >= $${index}`,
          param: [val],
          newIndex: index + 1,
        };
      case "$lt":
        return {
          sql: `(metadata->>'${key}')::numeric < $${index}`,
          param: [val],
          newIndex: index + 1,
        };
      case "$lte":
        return {
          sql: `(metadata->>'${key}')::numeric <= $${index}`,
          param: [val],
          newIndex: index + 1,
        };
      case "$in":
        return {
          sql: `metadata->>'${key}' = ANY($${index})`,
          param: [val],
          newIndex: index + 1,
        };
      case "$contains":
        return {
          sql: `metadata->>'${key}' ILIKE $${index}`,
          param: [`%${val}%`],
          newIndex: index + 1,
        };
      default:
        return {
          sql: `metadata->>'${key}' = $${index}`,
          param: [val],
          newIndex: index + 1,
        };
    }
  }

  return { sql: "TRUE", param: [], newIndex: index };
}
```

---

## File Structure

```
src/lib/
├── stores/
│   ├── index.ts                    # Main exports
│   ├── baseVectorStore.ts          # Abstract base class
│   ├── vectorStoreFactory.ts       # Factory pattern
│   ├── vectorStoreRegistry.ts      # Dynamic registration
│   ├── filterTranslator.ts         # Filter translation utilities
│   │
│   ├── cloud/                      # Cloud-native stores
│   │   ├── pinecone.ts
│   │   ├── qdrant.ts
│   │   ├── weaviate.ts
│   │   ├── astradb.ts
│   │   ├── cloudflare.ts
│   │   └── upstash.ts
│   │
│   ├── database/                   # Database extensions
│   │   ├── pgvector.ts
│   │   ├── mongodb.ts
│   │   ├── elasticsearch.ts
│   │   ├── opensearch.ts
│   │   └── couchbase.ts
│   │
│   ├── embedded/                   # Local/embedded stores
│   │   ├── chroma.ts
│   │   ├── lance.ts
│   │   ├── duckdb.ts
│   │   └── libsql.ts
│   │
│   └── enterprise/                 # Enterprise solutions
│       ├── azureAiSearch.ts
│       ├── vertexVector.ts
│       └── awsOpensearch.ts
│
├── types/
│   ├── vectorTypes.ts              # Core vector types
│   └── vectorFilterTypes.ts        # Filter type definitions
│
└── utils/
    └── vectorUtils.ts              # Vector utilities
```

---

## Vector Store Implementations

### 1. Pinecone

```typescript
// src/lib/stores/cloud/pinecone.ts

import {
  Pinecone as PineconeClient,
  type Index,
} from "@pinecone-database/pinecone";
import { BaseVectorStore, type VectorStoreConfig } from "../baseVectorStore.js";
import type {
  VectorRecord,
  VectorQueryResult,
  VectorIndexConfig,
  VectorQueryOptions,
  VectorUpsertOptions,
  VectorDeleteOptions,
  VectorStoreStats,
  VectorStoreName,
} from "../../types/vectorTypes.js";
import type { MetadataFilter } from "../../types/vectorFilterTypes.js";
import type { UnknownRecord } from "../../types/common.js";
import { translateToPinecone } from "../filterTranslator.js";
import { logger } from "../../utils/logger.js";

export type PineconeConfig = VectorStoreConfig & {
  apiKey: string;
  environment?: string; // Legacy, now often inferred from apiKey
  controllerHostUrl?: string;
};

export class PineconeStore extends BaseVectorStore<PineconeConfig> {
  private client: PineconeClient | null = null;
  private indexes: Map<string, Index> = new Map();

  constructor(config: PineconeConfig) {
    super(config, "pinecone" as VectorStoreName);
  }

  async connect(): Promise<void> {
    if (this.initialized) return;

    this.client = new PineconeClient({
      apiKey: this.config.apiKey,
    });

    this.initialized = true;
    logger.info("Pinecone connected successfully");
  }

  async disconnect(): Promise<void> {
    this.indexes.clear();
    this.client = null;
    this.initialized = false;
    logger.info("Pinecone disconnected");
  }

  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    await this.client!.createIndex({
      name: config.name,
      dimension: config.dimension,
      metric: config.metric || "cosine",
      spec: {
        serverless: {
          cloud: "aws",
          region: "us-east-1",
        },
        ...(config.config as object),
      },
    });

    logger.info(`Pinecone index created: ${config.name}`);
  }

  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();
    await this.client!.deleteIndex(indexName);
    this.indexes.delete(indexName);
    logger.info(`Pinecone index deleted: ${indexName}`);
  }

  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();
    const response = await this.client!.listIndexes();
    return response.indexes?.map((i) => i.name) || [];
  }

  async indexExists(indexName: string): Promise<boolean> {
    const indexes = await this.listIndexes();
    return indexes.includes(indexName);
  }

  async upsert<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    records: VectorRecord<TMetadata>[],
    options?: VectorUpsertOptions,
  ): Promise<{ upsertedCount: number }> {
    this.ensureInitialized();

    const index = this.getIndex(indexName);
    const namespace = options?.namespace;

    const vectors = records.map((record) => ({
      id: record.id,
      values: record.vector,
      metadata: record.metadata as Record<string, unknown>,
    }));

    const target = namespace ? index.namespace(namespace) : index;
    await target.upsert(vectors);

    return { upsertedCount: records.length };
  }

  async query<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    options: VectorQueryOptions<TMetadata>,
  ): Promise<VectorQueryResult<TMetadata>[]> {
    this.ensureInitialized();

    const index = this.getIndex(indexName);
    const target = options.namespace
      ? index.namespace(options.namespace)
      : index;

    const queryRequest: Parameters<typeof target.query>[0] = {
      vector: options.vector,
      topK: options.topK,
      includeMetadata: options.includeMetadata ?? true,
      includeValues: options.includeVectors ?? false,
    };

    if (options.filter) {
      queryRequest.filter = translateToPinecone(options.filter) as Record<
        string,
        unknown
      >;
    }

    const response = await target.query(queryRequest);

    return (response.matches || [])
      .filter((match) => !options.minScore || match.score! >= options.minScore)
      .map((match) => ({
        id: match.id,
        score: match.score!,
        vector: match.values,
        metadata: match.metadata as TMetadata,
      }));
  }

  async delete(
    indexName: string,
    options: VectorDeleteOptions,
  ): Promise<{ deletedCount: number }> {
    this.ensureInitialized();

    const index = this.getIndex(indexName);
    const target = options.namespace
      ? index.namespace(options.namespace)
      : index;

    if (options.deleteAll) {
      await target.deleteAll();
      return { deletedCount: -1 }; // Unknown count
    }

    if (options.ids && options.ids.length > 0) {
      await target.deleteMany(options.ids);
      return { deletedCount: options.ids.length };
    }

    if (options.filter) {
      // Pinecone supports filter-based deletion
      await target.deleteMany({
        filter: translateToPinecone(options.filter) as Record<string, unknown>,
      });
      return { deletedCount: -1 }; // Unknown count
    }

    return { deletedCount: 0 };
  }

  async getStats(indexName: string): Promise<VectorStoreStats> {
    this.ensureInitialized();

    const index = this.getIndex(indexName);
    const stats = await index.describeIndexStats();

    return {
      vectorCount: stats.totalRecordCount || 0,
      dimension: stats.dimension,
      namespaceCount: Object.keys(stats.namespaces || {}).length,
      metrics: stats as UnknownRecord,
    };
  }

  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): unknown {
    return translateToPinecone(filter);
  }

  private getIndex(indexName: string): Index {
    if (!this.indexes.has(indexName)) {
      this.indexes.set(indexName, this.client!.Index(indexName));
    }
    return this.indexes.get(indexName)!;
  }
}
```

### 2. Qdrant

```typescript
// src/lib/stores/cloud/qdrant.ts

import { QdrantClient } from "@qdrant/js-client-rest";
import {
  BaseVectorStore,
  type VectorStoreConfig,
} from "../baseVectorStore.js";
import type {
  VectorRecord,
  VectorQueryResult,
  VectorIndexConfig,
  VectorQueryOptions,
  VectorUpsertOptions,
  VectorDeleteOptions,
  VectorStoreStats,
  VectorStoreName,
  SimilarityMetric,
} from "../../types/vectorTypes.js";
import type { MetadataFilter } from "../../types/vectorFilterTypes.js";
import type { UnknownRecord } from "../../types/common.js";
import { translateToQdrant } from "../filterTranslator.js";
import { logger } from "../../utils/logger.js";

export type QdrantConfig = VectorStoreConfig & {
  url: string;
  apiKey?: string;
  https?: boolean;
};

export class QdrantStore extends BaseVectorStore<QdrantConfig> {
  private client: QdrantClient | null = null;

  constructor(config: QdrantConfig) {
    super(config, "qdrant" as VectorStoreName);
  }

  async connect(): Promise<void> {
    if (this.initialized) return;

    this.client = new QdrantClient({
      url: this.config.url,
      apiKey: this.config.apiKey,
    });

    // Test connection
    await this.client.getCollections();

    this.initialized = true;
    logger.info("Qdrant connected successfully");
  }

  async disconnect(): Promise<void> {
    this.client = null;
    this.initialized = false;
    logger.info("Qdrant disconnected");
  }

  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const distance = this.mapMetric(config.metric || "cosine");

    await this.client!.createCollection(config.name, {
      vectors: {
        size: config.dimension,
        distance,
      },
      ...(config.config as object),
    });

    logger.info(`Qdrant collection created: ${config.name}`);
  }

  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();
    await this.client!.deleteCollection(indexName);
    logger.info(`Qdrant collection deleted: ${indexName}`);
  }

  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();
    const response = await this.client!.getCollections();
    return response.collections.map((c) => c.name);
  }

  async indexExists(indexName: string): Promise<boolean> {
    const indexes = await this.listIndexes();
    return indexes.includes(indexName);
  }

  async upsert<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    records: VectorRecord<TMetadata>[],
    _options?: VectorUpsertOptions
  ): Promise<{ upsertedCount: number }> {
    this.ensureInitialized();

    const points = records.map((record, idx) => ({
      id: record.id || idx,
      vector: record.vector,
      payload: {
        ...record.metadata,
        _content: record.content,
      },
    }));

    await this.client!.upsert(indexName, {
      wait: true,
      points,
    });

    return { upsertedCount: records.length };
  }

  async query<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    options: VectorQueryOptions<TMetadata>
  ): Promise<VectorQueryResult<TMetadata>[]> {
    this.ensureInitialized();

    const searchParams: Parameters<typeof this.client!.search>[1] = {
      vector: options.vector,
      limit: options.topK,
      with_payload: options.includeMetadata ?? true,
      with_vector: options.includeVectors ?? false,
    };

    if (options.filter) {
      searchParams.filter = translateToQdrant(options.filter) as any;
    }

    if (options.minScore) {
      searchParams.score_threshold = options.minScore;
    }

    const response = await this.client!.search(indexName, searchParams);

    return response.map((result) => ({
      id: String(result.id),
      score: result.score,
      vector: result.vector as number[] | undefined,
      metadata: result.payload as TMetadata,
      content: (result.payload as any)?._content,
    }));
  }

  async delete(
    indexName: string,
    options: VectorDeleteOptions
  ): Promise<{ deletedCount: number }> {
    this.ensureInitialized();

    if (options.ids && options.ids.length > 0) {
      await this.client!.delete(indexName, {
        wait: true,
        points: options.ids,
      });
      return { deletedCount: options.ids.length };
    }

    if (options.filter) {
      await this.client!.delete(indexName, {
        wait: true,
        filter: translateToQdrant(options.filter) as any,
      });
      return { deletedCount: -1 };
    }

    return { deletedCount: 0 };
  }

  async getStats(indexName: string): Promise<VectorStoreStats> {
    this.ensureInitialized();

    const info = await this.client!.getCollection(indexName);

    return {
      vectorCount: info.points_count || 0,
      dimension: info.config.params.vectors?.size as number,
      metrics: info as unknown as UnknownRecord,
    };
  }

  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>
  ): unknown {
    return translateToQdrant(filter);
  }

  private mapMetric(metric: SimilarityMetric): "Cosine" | "Euclid" | "Dot" {
    switch (metric) {
      case "cosine":
        return "Cosine";
      case "euclidean":
        return "Euclid";
      case "dotProduct":
        return "Dot";
      default:
        return "Cosine";
    }
  }
}
```

### 3. PostgreSQL with pgvector

```typescript
// src/lib/stores/database/pgvector.ts

import { Pool, type PoolConfig } from "pg";
import { BaseVectorStore, type VectorStoreConfig } from "../baseVectorStore.js";
import type {
  VectorRecord,
  VectorQueryResult,
  VectorIndexConfig,
  VectorQueryOptions,
  VectorUpsertOptions,
  VectorDeleteOptions,
  VectorStoreStats,
  VectorStoreName,
  SimilarityMetric,
} from "../../types/vectorTypes.js";
import type { MetadataFilter } from "../../types/vectorFilterTypes.js";
import type { UnknownRecord } from "../../types/common.js";
import { translateToPgvector } from "../filterTranslator.js";
import { logger } from "../../utils/logger.js";

export type PgvectorConfig = VectorStoreConfig & {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean | object;
  schema?: string;
};

export class PgvectorStore extends BaseVectorStore<PgvectorConfig> {
  private pool: Pool | null = null;
  private schema: string;

  constructor(config: PgvectorConfig) {
    super(config, "pgvector" as VectorStoreName);
    this.schema = config.schema || "public";
  }

  async connect(): Promise<void> {
    if (this.initialized) return;

    const poolConfig: PoolConfig = this.config.connectionString
      ? { connectionString: this.config.connectionString }
      : {
          host: this.config.host,
          port: this.config.port || 5432,
          database: this.config.database,
          user: this.config.user,
          password: this.config.password,
          ssl: this.config.ssl,
        };

    this.pool = new Pool(poolConfig);

    // Test connection and ensure pgvector extension
    const client = await this.pool.connect();
    try {
      await client.query("CREATE EXTENSION IF NOT EXISTS vector");
      logger.info("pgvector extension enabled");
    } finally {
      client.release();
    }

    this.initialized = true;
    logger.info("PostgreSQL/pgvector connected successfully");
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
    this.initialized = false;
    logger.info("PostgreSQL/pgvector disconnected");
  }

  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const tableName = this.sanitizeIdentifier(config.name);
    const distanceOp = this.getDistanceOperator(config.metric || "cosine");

    // Create table with vector column
    await this.pool!.query(`
      CREATE TABLE IF NOT EXISTS ${this.schema}.${tableName} (
        id TEXT PRIMARY KEY,
        embedding vector(${config.dimension}),
        content TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create vector index with appropriate operator class
    const indexType =
      config.metric === "dotProduct"
        ? "vector_ip_ops"
        : config.metric === "euclidean"
          ? "vector_l2_ops"
          : "vector_cosine_ops";

    await this.pool!.query(`
      CREATE INDEX IF NOT EXISTS ${tableName}_embedding_idx
      ON ${this.schema}.${tableName}
      USING ivfflat (embedding ${indexType})
      WITH (lists = 100)
    `);

    // Create GIN index for metadata
    await this.pool!.query(`
      CREATE INDEX IF NOT EXISTS ${tableName}_metadata_idx
      ON ${this.schema}.${tableName}
      USING GIN (metadata)
    `);

    logger.info(`pgvector table and indexes created: ${tableName}`);
  }

  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();
    const tableName = this.sanitizeIdentifier(indexName);
    await this.pool!.query(
      `DROP TABLE IF EXISTS ${this.schema}.${tableName} CASCADE`,
    );
    logger.info(`pgvector table deleted: ${tableName}`);
  }

  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    const result = await this.pool!.query(
      `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1
        AND table_type = 'BASE TABLE'
        AND EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = tables.table_schema
            AND table_name = tables.table_name
            AND udt_name = 'vector'
        )
    `,
      [this.schema],
    );

    return result.rows.map((row) => row.table_name);
  }

  async indexExists(indexName: string): Promise<boolean> {
    const indexes = await this.listIndexes();
    return indexes.includes(indexName);
  }

  async upsert<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    records: VectorRecord<TMetadata>[],
    _options?: VectorUpsertOptions,
  ): Promise<{ upsertedCount: number }> {
    this.ensureInitialized();

    const tableName = this.sanitizeIdentifier(indexName);

    for (const record of records) {
      await this.pool!.query(
        `
        INSERT INTO ${this.schema}.${tableName} (id, embedding, content, metadata, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (id) DO UPDATE SET
          embedding = EXCLUDED.embedding,
          content = EXCLUDED.content,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
        `,
        [
          record.id,
          `[${record.vector.join(",")}]`,
          record.content || null,
          JSON.stringify(record.metadata || {}),
        ],
      );
    }

    return { upsertedCount: records.length };
  }

  async query<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    options: VectorQueryOptions<TMetadata>,
  ): Promise<VectorQueryResult<TMetadata>[]> {
    this.ensureInitialized();

    const tableName = this.sanitizeIdentifier(indexName);
    const distanceOp = this.getDistanceOperator("cosine"); // Use configured metric

    let whereClause = "";
    let params: unknown[] = [`[${options.vector.join(",")}]`, options.topK];
    let paramIndex = 3;

    if (options.filter) {
      const filterResult = translateToPgvector(options.filter, paramIndex);
      whereClause = `WHERE ${filterResult.sql}`;
      params.push(...filterResult.params);
    }

    // For cosine similarity, convert distance to similarity score
    const scoreExpression = `1 - (embedding ${distanceOp} $1)`;

    const query = `
      SELECT
        id,
        ${scoreExpression} as score,
        ${options.includeVectors ? "embedding::text as vector," : ""}
        content,
        metadata
      FROM ${this.schema}.${tableName}
      ${whereClause}
      ORDER BY embedding ${distanceOp} $1
      LIMIT $2
    `;

    const result = await this.pool!.query(query, params);

    return result.rows
      .filter((row) => !options.minScore || row.score >= options.minScore)
      .map((row) => ({
        id: row.id,
        score: row.score,
        vector: options.includeVectors
          ? this.parseVector(row.vector)
          : undefined,
        metadata: row.metadata as TMetadata,
        content: row.content,
      }));
  }

  async delete(
    indexName: string,
    options: VectorDeleteOptions,
  ): Promise<{ deletedCount: number }> {
    this.ensureInitialized();

    const tableName = this.sanitizeIdentifier(indexName);

    if (options.deleteAll) {
      const result = await this.pool!.query(
        `DELETE FROM ${this.schema}.${tableName}`,
      );
      return { deletedCount: result.rowCount || 0 };
    }

    if (options.ids && options.ids.length > 0) {
      const result = await this.pool!.query(
        `DELETE FROM ${this.schema}.${tableName} WHERE id = ANY($1)`,
        [options.ids],
      );
      return { deletedCount: result.rowCount || 0 };
    }

    if (options.filter) {
      const filterResult = translateToPgvector(options.filter);
      const result = await this.pool!.query(
        `DELETE FROM ${this.schema}.${tableName} WHERE ${filterResult.sql}`,
        filterResult.params,
      );
      return { deletedCount: result.rowCount || 0 };
    }

    return { deletedCount: 0 };
  }

  async getStats(indexName: string): Promise<VectorStoreStats> {
    this.ensureInitialized();

    const tableName = this.sanitizeIdentifier(indexName);

    const countResult = await this.pool!.query(
      `SELECT COUNT(*) as count FROM ${this.schema}.${tableName}`,
    );

    const dimensionResult = await this.pool!.query(
      `
      SELECT atttypmod - 4 as dimension
      FROM pg_attribute
      WHERE attrelid = $1::regclass
        AND attname = 'embedding'
    `,
      [`${this.schema}.${tableName}`],
    );

    return {
      vectorCount: parseInt(countResult.rows[0].count, 10),
      dimension: dimensionResult.rows[0]?.dimension,
    };
  }

  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): unknown {
    return translateToPgvector(filter);
  }

  private sanitizeIdentifier(name: string): string {
    // Basic SQL injection prevention
    return name.replace(/[^a-zA-Z0-9_]/g, "_");
  }

  private getDistanceOperator(metric: SimilarityMetric): string {
    switch (metric) {
      case "cosine":
        return "<=>"; // Cosine distance
      case "euclidean":
        return "<->"; // L2 distance
      case "dotProduct":
        return "<#>"; // Inner product (negative)
      default:
        return "<=>";
    }
  }

  private parseVector(vectorStr: string): number[] {
    // Parse PostgreSQL vector format "[1,2,3]" to number[]
    return vectorStr
      .replace(/[\[\]]/g, "")
      .split(",")
      .map(Number);
  }
}
```

### 4. Chroma (Embedded)

```typescript
// src/lib/stores/embedded/chroma.ts

import { ChromaClient, Collection } from "chromadb";
import { BaseVectorStore, type VectorStoreConfig } from "../baseVectorStore.js";
import type {
  VectorRecord,
  VectorQueryResult,
  VectorIndexConfig,
  VectorQueryOptions,
  VectorUpsertOptions,
  VectorDeleteOptions,
  VectorStoreStats,
  VectorStoreName,
} from "../../types/vectorTypes.js";
import type { MetadataFilter } from "../../types/vectorFilterTypes.js";
import type { UnknownRecord } from "../../types/common.js";
import { logger } from "../../utils/logger.js";

export type ChromaConfig = VectorStoreConfig & {
  path?: string; // For persistent local storage
  host?: string; // For Chroma server
  port?: number;
  ssl?: boolean;
  tenant?: string;
  database?: string;
};

export class ChromaStore extends BaseVectorStore<ChromaConfig> {
  private client: ChromaClient | null = null;
  private collections: Map<string, Collection> = new Map();

  constructor(config: ChromaConfig) {
    super(config, "chroma" as VectorStoreName);
  }

  async connect(): Promise<void> {
    if (this.initialized) return;

    if (this.config.host) {
      // Connect to Chroma server
      this.client = new ChromaClient({
        path: `${this.config.ssl ? "https" : "http"}://${this.config.host}:${this.config.port || 8000}`,
      });
    } else {
      // Local/embedded mode
      this.client = new ChromaClient({
        path: this.config.path,
      });
    }

    // Test connection
    await this.client.heartbeat();

    this.initialized = true;
    logger.info("Chroma connected successfully");
  }

  async disconnect(): Promise<void> {
    this.collections.clear();
    this.client = null;
    this.initialized = false;
    logger.info("Chroma disconnected");
  }

  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const collection = await this.client!.createCollection({
      name: config.name,
      metadata: {
        dimension: config.dimension,
        metric: config.metric || "cosine",
        ...((config.config as object) || {}),
      },
    });

    this.collections.set(config.name, collection);
    logger.info(`Chroma collection created: ${config.name}`);
  }

  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();
    await this.client!.deleteCollection({ name: indexName });
    this.collections.delete(indexName);
    logger.info(`Chroma collection deleted: ${indexName}`);
  }

  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();
    const collections = await this.client!.listCollections();
    return collections.map((c) => c.name);
  }

  async indexExists(indexName: string): Promise<boolean> {
    const indexes = await this.listIndexes();
    return indexes.includes(indexName);
  }

  async upsert<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    records: VectorRecord<TMetadata>[],
    _options?: VectorUpsertOptions,
  ): Promise<{ upsertedCount: number }> {
    this.ensureInitialized();

    const collection = await this.getCollection(indexName);

    await collection.upsert({
      ids: records.map((r) => r.id),
      embeddings: records.map((r) => r.vector),
      metadatas: records.map(
        (r) => (r.metadata || {}) as Record<string, unknown>,
      ),
      documents: records.map((r) => r.content || ""),
    });

    return { upsertedCount: records.length };
  }

  async query<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    options: VectorQueryOptions<TMetadata>,
  ): Promise<VectorQueryResult<TMetadata>[]> {
    this.ensureInitialized();

    const collection = await this.getCollection(indexName);

    const queryParams: Parameters<typeof collection.query>[0] = {
      queryEmbeddings: [options.vector],
      nResults: options.topK,
      include: ["metadatas", "documents", "distances"],
    };

    if (options.includeVectors) {
      queryParams.include?.push("embeddings");
    }

    if (options.filter) {
      queryParams.where = this.translateFilter(options.filter) as Record<
        string,
        unknown
      >;
    }

    const result = await collection.query(queryParams);

    const results: VectorQueryResult<TMetadata>[] = [];

    for (let i = 0; i < (result.ids[0]?.length || 0); i++) {
      // Chroma returns distances, not similarities
      // For cosine distance, similarity = 1 - distance
      const distance = result.distances?.[0]?.[i] || 0;
      const score = 1 - distance;

      if (options.minScore && score < options.minScore) continue;

      results.push({
        id: result.ids[0][i],
        score,
        vector: options.includeVectors
          ? result.embeddings?.[0]?.[i]
          : undefined,
        metadata: result.metadatas?.[0]?.[i] as TMetadata,
        content: result.documents?.[0]?.[i] || undefined,
      });
    }

    return results;
  }

  async delete(
    indexName: string,
    options: VectorDeleteOptions,
  ): Promise<{ deletedCount: number }> {
    this.ensureInitialized();

    const collection = await this.getCollection(indexName);

    if (options.ids && options.ids.length > 0) {
      await collection.delete({ ids: options.ids });
      return { deletedCount: options.ids.length };
    }

    if (options.filter) {
      await collection.delete({
        where: this.translateFilter(options.filter) as Record<string, unknown>,
      });
      return { deletedCount: -1 };
    }

    return { deletedCount: 0 };
  }

  async getStats(indexName: string): Promise<VectorStoreStats> {
    this.ensureInitialized();

    const collection = await this.getCollection(indexName);
    const count = await collection.count();

    return {
      vectorCount: count,
    };
  }

  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): unknown {
    // Chroma uses a similar filter syntax
    const chromaFilter: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(filter)) {
      if (key === "$and") {
        chromaFilter["$and"] = (value as MetadataFilter[]).map((f) =>
          this.translateFilter(f),
        );
      } else if (key === "$or") {
        chromaFilter["$or"] = (value as MetadataFilter[]).map((f) =>
          this.translateFilter(f),
        );
      } else if (typeof value === "object" && value !== null) {
        chromaFilter[key] = value;
      } else {
        chromaFilter[key] = { $eq: value };
      }
    }

    return chromaFilter;
  }

  private async getCollection(indexName: string): Promise<Collection> {
    if (!this.collections.has(indexName)) {
      const collection = await this.client!.getCollection({ name: indexName });
      this.collections.set(indexName, collection);
    }
    return this.collections.get(indexName)!;
  }
}
```

### 5. MongoDB Atlas Vector Search

```typescript
// src/lib/stores/database/mongodb.ts

import { MongoClient, Collection, Db } from "mongodb";
import { BaseVectorStore, type VectorStoreConfig } from "../baseVectorStore.js";
import type {
  VectorRecord,
  VectorQueryResult,
  VectorIndexConfig,
  VectorQueryOptions,
  VectorUpsertOptions,
  VectorDeleteOptions,
  VectorStoreStats,
  VectorStoreName,
} from "../../types/vectorTypes.js";
import type { MetadataFilter } from "../../types/vectorFilterTypes.js";
import type { UnknownRecord } from "../../types/common.js";
import { logger } from "../../utils/logger.js";

export type MongoDBConfig = VectorStoreConfig & {
  connectionString: string;
  databaseName: string;
};

export class MongoDBVectorStore extends BaseVectorStore<MongoDBConfig> {
  private client: MongoClient | null = null;
  private db: Db | null = null;

  constructor(config: MongoDBConfig) {
    super(config, "mongodb" as VectorStoreName);
  }

  async connect(): Promise<void> {
    if (this.initialized) return;

    this.client = new MongoClient(this.config.connectionString);
    await this.client.connect();
    this.db = this.client.db(this.config.databaseName);

    this.initialized = true;
    logger.info("MongoDB Atlas connected successfully");
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
    this.initialized = false;
    logger.info("MongoDB Atlas disconnected");
  }

  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const collection = this.db!.collection(config.name);

    // Create the collection if it doesn't exist
    await this.db!.createCollection(config.name).catch(() => {
      // Collection may already exist
    });

    // Create Atlas Vector Search index
    // Note: This requires MongoDB Atlas and appropriate permissions
    await this.db!.command({
      createSearchIndexes: config.name,
      indexes: [
        {
          name: "vector_index",
          definition: {
            mappings: {
              dynamic: true,
              fields: {
                embedding: {
                  type: "knnVector",
                  dimensions: config.dimension,
                  similarity: config.metric || "cosine",
                },
              },
            },
          },
        },
      ],
    });

    logger.info(`MongoDB Atlas vector index created: ${config.name}`);
  }

  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();
    await this.db!.collection(indexName).drop();
    logger.info(`MongoDB collection deleted: ${indexName}`);
  }

  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();
    const collections = await this.db!.listCollections().toArray();
    return collections.map((c) => c.name);
  }

  async indexExists(indexName: string): Promise<boolean> {
    const indexes = await this.listIndexes();
    return indexes.includes(indexName);
  }

  async upsert<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    records: VectorRecord<TMetadata>[],
    _options?: VectorUpsertOptions,
  ): Promise<{ upsertedCount: number }> {
    this.ensureInitialized();

    const collection = this.db!.collection(indexName);

    const operations = records.map((record) => ({
      updateOne: {
        filter: { _id: record.id },
        update: {
          $set: {
            embedding: record.vector,
            content: record.content,
            metadata: record.metadata || {},
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        upsert: true,
      },
    }));

    await collection.bulkWrite(operations);
    return { upsertedCount: records.length };
  }

  async query<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    options: VectorQueryOptions<TMetadata>,
  ): Promise<VectorQueryResult<TMetadata>[]> {
    this.ensureInitialized();

    const collection = this.db!.collection(indexName);

    const pipeline: object[] = [
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector: options.vector,
          numCandidates: options.topK * 10,
          limit: options.topK,
        },
      },
      {
        $project: {
          _id: 1,
          content: 1,
          metadata: 1,
          embedding: options.includeVectors ? 1 : 0,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ];

    // Add filter stage if provided
    if (options.filter) {
      pipeline.splice(1, 0, {
        $match: this.translateFilter(options.filter),
      });
    }

    const results = await collection.aggregate(pipeline).toArray();

    return results
      .filter((doc) => !options.minScore || doc.score >= options.minScore)
      .map((doc) => ({
        id: String(doc._id),
        score: doc.score,
        vector: doc.embedding,
        metadata: doc.metadata as TMetadata,
        content: doc.content,
      }));
  }

  async delete(
    indexName: string,
    options: VectorDeleteOptions,
  ): Promise<{ deletedCount: number }> {
    this.ensureInitialized();

    const collection = this.db!.collection(indexName);

    if (options.deleteAll) {
      const result = await collection.deleteMany({});
      return { deletedCount: result.deletedCount };
    }

    if (options.ids && options.ids.length > 0) {
      const result = await collection.deleteMany({
        _id: { $in: options.ids },
      });
      return { deletedCount: result.deletedCount };
    }

    if (options.filter) {
      const result = await collection.deleteMany(
        this.translateFilter(options.filter) as object,
      );
      return { deletedCount: result.deletedCount };
    }

    return { deletedCount: 0 };
  }

  async getStats(indexName: string): Promise<VectorStoreStats> {
    this.ensureInitialized();

    const collection = this.db!.collection(indexName);
    const stats = await collection.stats();

    return {
      vectorCount: stats.count,
      indexSize: stats.totalIndexSize,
    };
  }

  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): unknown {
    const mongoFilter: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(filter)) {
      if (key === "$and" || key === "$or") {
        mongoFilter[key] = (value as MetadataFilter[]).map((f) =>
          this.translateFilter(f),
        );
      } else if (key === "$not") {
        mongoFilter["$nor"] = [this.translateFilter(value as MetadataFilter)];
      } else if (typeof value === "object" && value !== null) {
        // Handle operators
        const fieldFilter: Record<string, unknown> = {};
        for (const [op, val] of Object.entries(value as object)) {
          fieldFilter[`metadata.${key}`] = { [op]: val };
        }
        Object.assign(mongoFilter, fieldFilter);
      } else {
        mongoFilter[`metadata.${key}`] = value;
      }
    }

    return mongoFilter;
  }
}
```

### Additional Store Implementation Stubs

For brevity, here are stub implementations for remaining stores:

```typescript
// src/lib/stores/cloud/weaviate.ts
export class WeaviateStore extends BaseVectorStore<WeaviateConfig> {
  // Implementation similar to Pinecone/Qdrant
  // Uses @weaviate-io/weaviate-client
}

// src/lib/stores/cloud/astradb.ts
export class AstraDBStore extends BaseVectorStore<AstraDBConfig> {
  // Uses @datastax/astra-db-ts
  // DataStax Astra DB (Cassandra-based)
}

// src/lib/stores/cloud/cloudflare.ts
export class CloudflareVectorizeStore extends BaseVectorStore<CloudflareConfig> {
  // Uses Cloudflare Workers/REST API
  // Cloudflare Vectorize
}

// src/lib/stores/cloud/upstash.ts
export class UpstashVectorStore extends BaseVectorStore<UpstashConfig> {
  // Uses @upstash/vector
  // Serverless Redis-based vector store
}

// src/lib/stores/database/elasticsearch.ts
export class ElasticsearchStore extends BaseVectorStore<ElasticsearchConfig> {
  // Uses @elastic/elasticsearch
  // Elasticsearch with dense_vector field type
}

// src/lib/stores/database/opensearch.ts
export class OpenSearchStore extends BaseVectorStore<OpenSearchConfig> {
  // Uses @opensearch-project/opensearch
  // Similar to Elasticsearch
}

// src/lib/stores/database/couchbase.ts
export class CouchbaseStore extends BaseVectorStore<CouchbaseConfig> {
  // Uses couchbase SDK
  // Couchbase Vector Search
}

// src/lib/stores/embedded/lance.ts
export class LanceStore extends BaseVectorStore<LanceConfig> {
  // Uses lancedb
  // Fast columnar vector store
}

// src/lib/stores/embedded/duckdb.ts
export class DuckDBStore extends BaseVectorStore<DuckDBConfig> {
  // Uses duckdb
  // Embedded analytical database with vector support
}

// src/lib/stores/embedded/libsql.ts
export class LibSQLStore extends BaseVectorStore<LibSQLConfig> {
  // Uses @libsql/client
  // SQLite-compatible with vector extensions
}

// src/lib/stores/enterprise/azureAiSearch.ts
export class AzureAISearchStore extends BaseVectorStore<AzureAISearchConfig> {
  // Uses @azure/search-documents
  // Azure Cognitive Search with vector capabilities
}

// src/lib/stores/enterprise/vertexVector.ts
export class VertexVectorStore extends BaseVectorStore<VertexVectorConfig> {
  // Uses @google-cloud/aiplatform
  // Google Vertex AI Matching Engine
}

// src/lib/stores/enterprise/awsOpensearch.ts
export class AWSOpenSearchStore extends BaseVectorStore<AWSOpenSearchConfig> {
  // Uses @opensearch-project/opensearch with AWS auth
  // AWS OpenSearch Serverless
}
```

---

## Configuration Patterns

### Factory Implementation

```typescript
// src/lib/stores/vectorStoreFactory.ts

import type { VectorStoreName } from "../types/vectorTypes.js";
import type { BaseVectorStore, VectorStoreConfig } from "./baseVectorStore.js";
import { logger } from "../utils/logger.js";

type VectorStoreConstructor<TConfig extends VectorStoreConfig> = (
  config: TConfig,
) => Promise<BaseVectorStore<TConfig>>;

/**
 * Factory for creating vector store instances
 * Follows NeuroLink's ProviderFactory pattern
 */
export class VectorStoreFactory {
  private static readonly stores = new Map<
    VectorStoreName,
    {
      constructor: VectorStoreConstructor<any>;
      aliases: string[];
    }
  >();
  private static registered = false;

  /**
   * Register a vector store with the factory
   */
  static registerStore<TConfig extends VectorStoreConfig>(
    name: VectorStoreName,
    constructor: VectorStoreConstructor<TConfig>,
    aliases: string[] = [],
  ): void {
    this.stores.set(name, { constructor, aliases });

    // Register aliases
    aliases.forEach((alias) => {
      this.stores.set(alias as VectorStoreName, { constructor, aliases: [] });
    });

    logger.debug(`Registered vector store: ${name}`);
  }

  /**
   * Create a vector store instance
   */
  static async createStore<TConfig extends VectorStoreConfig>(
    name: VectorStoreName | string,
    config: TConfig,
  ): Promise<BaseVectorStore<TConfig>> {
    await this.ensureRegistered();

    const registration = this.stores.get(name as VectorStoreName);

    if (!registration) {
      throw new Error(
        `Unknown vector store: ${name}. Available stores: ${this.getAvailableStores().join(", ")}`,
      );
    }

    return await registration.constructor(config);
  }

  /**
   * Get list of available stores
   */
  static getAvailableStores(): string[] {
    return Array.from(this.stores.keys());
  }

  /**
   * Check if a store is registered
   */
  static hasStore(name: string): boolean {
    return this.stores.has(name as VectorStoreName);
  }

  /**
   * Ensure all stores are registered
   */
  private static async ensureRegistered(): Promise<void> {
    if (this.registered) return;
    await VectorStoreRegistry.registerAllStores();
    this.registered = true;
  }
}
```

### Registry Implementation

```typescript
// src/lib/stores/vectorStoreRegistry.ts

import { VectorStoreFactory } from "./vectorStoreFactory.js";
import { VectorStoreName } from "../types/vectorTypes.js";
import { logger } from "../utils/logger.js";

/**
 * Registry for all vector store implementations
 * Uses dynamic imports to avoid circular dependencies
 */
export class VectorStoreRegistry {
  private static registered = false;

  static async registerAllStores(): Promise<void> {
    if (this.registered) return;

    try {
      // Cloud stores
      VectorStoreFactory.registerStore(
        VectorStoreName.PINECONE,
        async (config) => {
          const { PineconeStore } = await import("./cloud/pinecone.js");
          return new PineconeStore(config);
        },
        ["pinecone"],
      );

      VectorStoreFactory.registerStore(
        VectorStoreName.QDRANT,
        async (config) => {
          const { QdrantStore } = await import("./cloud/qdrant.js");
          return new QdrantStore(config);
        },
        ["qdrant"],
      );

      VectorStoreFactory.registerStore(
        VectorStoreName.WEAVIATE,
        async (config) => {
          const { WeaviateStore } = await import("./cloud/weaviate.js");
          return new WeaviateStore(config);
        },
        ["weaviate"],
      );

      VectorStoreFactory.registerStore(
        VectorStoreName.CLOUDFLARE,
        async (config) => {
          const { CloudflareVectorizeStore } = await import(
            "./cloud/cloudflare.js"
          );
          return new CloudflareVectorizeStore(config);
        },
        ["cloudflare", "vectorize"],
      );

      VectorStoreFactory.registerStore(
        VectorStoreName.UPSTASH,
        async (config) => {
          const { UpstashVectorStore } = await import("./cloud/upstash.js");
          return new UpstashVectorStore(config);
        },
        ["upstash"],
      );

      VectorStoreFactory.registerStore(
        VectorStoreName.ASTRA,
        async (config) => {
          const { AstraDBStore } = await import("./cloud/astradb.js");
          return new AstraDBStore(config);
        },
        ["astra", "astradb", "datastax"],
      );

      // Database stores
      VectorStoreFactory.registerStore(
        VectorStoreName.PGVECTOR,
        async (config) => {
          const { PgvectorStore } = await import("./database/pgvector.js");
          return new PgvectorStore(config);
        },
        ["pgvector", "postgres", "postgresql"],
      );

      VectorStoreFactory.registerStore(
        VectorStoreName.MONGODB,
        async (config) => {
          const { MongoDBVectorStore } = await import("./database/mongodb.js");
          return new MongoDBVectorStore(config);
        },
        ["mongodb", "mongo", "atlas"],
      );

      VectorStoreFactory.registerStore(
        VectorStoreName.ELASTICSEARCH,
        async (config) => {
          const { ElasticsearchStore } = await import(
            "./database/elasticsearch.js"
          );
          return new ElasticsearchStore(config);
        },
        ["elasticsearch", "elastic"],
      );

      VectorStoreFactory.registerStore(
        VectorStoreName.OPENSEARCH,
        async (config) => {
          const { OpenSearchStore } = await import("./database/opensearch.js");
          return new OpenSearchStore(config);
        },
        ["opensearch"],
      );

      VectorStoreFactory.registerStore(
        VectorStoreName.COUCHBASE,
        async (config) => {
          const { CouchbaseStore } = await import("./database/couchbase.js");
          return new CouchbaseStore(config);
        },
        ["couchbase"],
      );

      // Embedded stores
      VectorStoreFactory.registerStore(
        VectorStoreName.CHROMA,
        async (config) => {
          const { ChromaStore } = await import("./embedded/chroma.js");
          return new ChromaStore(config);
        },
        ["chroma", "chromadb"],
      );

      VectorStoreFactory.registerStore(
        VectorStoreName.LANCE,
        async (config) => {
          const { LanceStore } = await import("./embedded/lance.js");
          return new LanceStore(config);
        },
        ["lance", "lancedb"],
      );

      VectorStoreFactory.registerStore(
        VectorStoreName.DUCKDB,
        async (config) => {
          const { DuckDBStore } = await import("./embedded/duckdb.js");
          return new DuckDBStore(config);
        },
        ["duckdb"],
      );

      VectorStoreFactory.registerStore(
        VectorStoreName.LIBSQL,
        async (config) => {
          const { LibSQLStore } = await import("./embedded/libsql.js");
          return new LibSQLStore(config);
        },
        ["libsql", "turso"],
      );

      // Enterprise stores
      VectorStoreFactory.registerStore(
        VectorStoreName.AZURE_AI_SEARCH,
        async (config) => {
          const { AzureAISearchStore } = await import(
            "./enterprise/azureAiSearch.js"
          );
          return new AzureAISearchStore(config);
        },
        ["azure", "azure-search", "cognitive-search"],
      );

      VectorStoreFactory.registerStore(
        VectorStoreName.VERTEX_VECTOR,
        async (config) => {
          const { VertexVectorStore } = await import(
            "./enterprise/vertexVector.js"
          );
          return new VertexVectorStore(config);
        },
        ["vertex", "vertex-ai", "matching-engine"],
      );

      VectorStoreFactory.registerStore(
        VectorStoreName.AWS_OPENSEARCH,
        async (config) => {
          const { AWSOpenSearchStore } = await import(
            "./enterprise/awsOpensearch.js"
          );
          return new AWSOpenSearchStore(config);
        },
        ["aws-opensearch", "aoss"],
      );

      this.registered = true;
      logger.debug("All vector stores registered successfully");
    } catch (error) {
      logger.error("Failed to register vector stores:", error);
      throw error;
    }
  }

  static isRegistered(): boolean {
    return this.registered;
  }

  static clearRegistrations(): void {
    this.registered = false;
  }
}
```

### Environment Configuration

```typescript
// src/lib/utils/vectorConfig.ts

import type { VectorStoreName } from "../types/vectorTypes.js";

/**
 * Vector store configuration helpers
 */
export const vectorStoreConfigs: Record<
  VectorStoreName,
  {
    envVars: string[];
    requiredEnvVars: string[];
    setupUrl: string;
  }
> = {
  pinecone: {
    envVars: ["PINECONE_API_KEY", "PINECONE_ENVIRONMENT", "PINECONE_INDEX"],
    requiredEnvVars: ["PINECONE_API_KEY"],
    setupUrl: "https://www.pinecone.io/",
  },
  qdrant: {
    envVars: ["QDRANT_URL", "QDRANT_API_KEY"],
    requiredEnvVars: ["QDRANT_URL"],
    setupUrl: "https://qdrant.tech/",
  },
  chroma: {
    envVars: ["CHROMA_HOST", "CHROMA_PORT", "CHROMA_PATH"],
    requiredEnvVars: [],
    setupUrl: "https://www.trychroma.com/",
  },
  pgvector: {
    envVars: [
      "PGVECTOR_CONNECTION_STRING",
      "PGVECTOR_HOST",
      "PGVECTOR_PORT",
      "PGVECTOR_DATABASE",
      "PGVECTOR_USER",
      "PGVECTOR_PASSWORD",
    ],
    requiredEnvVars: [],
    setupUrl: "https://github.com/pgvector/pgvector",
  },
  mongodb: {
    envVars: ["MONGODB_CONNECTION_STRING", "MONGODB_DATABASE"],
    requiredEnvVars: ["MONGODB_CONNECTION_STRING"],
    setupUrl: "https://www.mongodb.com/atlas/database",
  },
  // ... additional configurations
} as Record<VectorStoreName, any>;

/**
 * Get configuration from environment variables
 */
export function getVectorStoreConfigFromEnv(
  store: VectorStoreName,
): Record<string, string | undefined> {
  const config: Record<string, string | undefined> = {};
  const storeConfig = vectorStoreConfigs[store];

  if (storeConfig) {
    for (const envVar of storeConfig.envVars) {
      const key = envVar.replace(/^[A-Z_]+_/, "").toLowerCase();
      config[key] = process.env[envVar];
    }
  }

  return config;
}

/**
 * Validate required environment variables
 */
export function validateVectorStoreEnv(store: VectorStoreName): {
  valid: boolean;
  missing: string[];
} {
  const storeConfig = vectorStoreConfigs[store];
  const missing: string[] = [];

  if (storeConfig) {
    for (const envVar of storeConfig.requiredEnvVars) {
      if (!process.env[envVar]) {
        missing.push(envVar);
      }
    }
  }

  return { valid: missing.length === 0, missing };
}
```

---

## Step-by-Step Implementation Plan

### Phase 1: Foundation (Week 1-2)

1. **Create Type Definitions**
   - [ ] Create `src/lib/types/vectorTypes.ts`
   - [ ] Create `src/lib/types/vectorFilterTypes.ts`
   - [ ] Add exports to `src/lib/types/index.ts`

2. **Implement Base Infrastructure**
   - [ ] Create `src/lib/stores/baseVectorStore.ts`
   - [ ] Create `src/lib/stores/filterTranslator.ts`
   - [ ] Create `src/lib/stores/vectorStoreFactory.ts`
   - [ ] Create `src/lib/stores/vectorStoreRegistry.ts`

3. **Create Directory Structure**
   - [ ] Create `src/lib/stores/cloud/`
   - [ ] Create `src/lib/stores/database/`
   - [ ] Create `src/lib/stores/embedded/`
   - [ ] Create `src/lib/stores/enterprise/`

### Phase 2: Core Implementations (Week 3-4)

4. **Implement Cloud Stores**
   - [ ] Pinecone (primary reference implementation)
   - [ ] Qdrant
   - [ ] Weaviate

5. **Implement Database Stores**
   - [ ] pgvector (PostgreSQL)
   - [ ] MongoDB Atlas
   - [ ] Elasticsearch

6. **Implement Embedded Stores**
   - [ ] Chroma
   - [ ] Lance
   - [ ] DuckDB

### Phase 3: Extended Implementations (Week 5-6)

7. **Cloud Stores**
   - [ ] Cloudflare Vectorize
   - [ ] Upstash Vector
   - [ ] Astra DB

8. **Database Stores**
   - [ ] OpenSearch
   - [ ] Couchbase

9. **Enterprise Stores**
   - [ ] Azure AI Search
   - [ ] Vertex AI Vector Search
   - [ ] AWS OpenSearch Serverless

10. **Embedded Stores**
    - [ ] LibSQL
    - [ ] SQLite-VSS

### Phase 4: Integration & Testing (Week 7-8)

11. **Integration with NeuroLink**
    - [ ] Add vector store support to NeuroLink SDK
    - [ ] Create CLI commands for vector operations
    - [ ] Integration with memory system

12. **Testing**
    - [ ] Unit tests for each store
    - [ ] Integration tests
    - [ ] Performance benchmarks

13. **Documentation**
    - [ ] API documentation
    - [ ] Usage examples
    - [ ] Migration guides

---

## Testing Strategy

### Unit Tests

```typescript
// test/unit/stores/pinecone.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";
import { PineconeStore } from "../../../src/lib/stores/cloud/pinecone.js";

describe("PineconeStore", () => {
  let store: PineconeStore;

  beforeEach(() => {
    store = new PineconeStore({
      apiKey: "test-api-key",
    });
  });

  describe("upsert", () => {
    it("should upsert vectors successfully", async () => {
      // Mock Pinecone client
      const mockUpsert = vi.fn().mockResolvedValue({});
      // ... test implementation
    });
  });

  describe("query", () => {
    it("should query vectors with filters", async () => {
      // ... test implementation
    });

    it("should respect minScore threshold", async () => {
      // ... test implementation
    });
  });

  describe("delete", () => {
    it("should delete by IDs", async () => {
      // ... test implementation
    });

    it("should delete by filter", async () => {
      // ... test implementation
    });
  });
});
```

### Integration Tests

```typescript
// test/integration/stores/vector-stores.test.ts

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { VectorStoreFactory } from "../../../src/lib/stores/vectorStoreFactory.js";
import { VectorStoreName } from "../../../src/lib/types/vectorTypes.js";

describe.each([
  VectorStoreName.PINECONE,
  VectorStoreName.QDRANT,
  VectorStoreName.CHROMA,
  VectorStoreName.PGVECTOR,
])("Vector Store Integration: %s", (storeName) => {
  let store: BaseVectorStore;
  const testIndex = `test-${Date.now()}`;

  beforeAll(async () => {
    store = await VectorStoreFactory.createStore(
      storeName,
      getTestConfig(storeName),
    );
    await store.connect();
    await store.createIndex({
      name: testIndex,
      dimension: 1536,
      metric: "cosine",
    });
  });

  afterAll(async () => {
    await store.deleteIndex(testIndex);
    await store.disconnect();
  });

  it("should upsert and query vectors", async () => {
    const testVector = Array(1536).fill(0.1);

    await store.upsert(testIndex, [
      {
        id: "test-1",
        vector: testVector,
        metadata: { category: "test" },
      },
    ]);

    const results = await store.query(testIndex, {
      vector: testVector,
      topK: 1,
    });

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("test-1");
    expect(results[0].score).toBeGreaterThan(0.9);
  });

  it("should filter by metadata", async () => {
    await store.upsert(testIndex, [
      {
        id: "filter-1",
        vector: Array(1536).fill(0.2),
        metadata: { category: "a", priority: 1 },
      },
      {
        id: "filter-2",
        vector: Array(1536).fill(0.2),
        metadata: { category: "b", priority: 2 },
      },
    ]);

    const results = await store.query(testIndex, {
      vector: Array(1536).fill(0.2),
      topK: 10,
      filter: { category: "a" },
    });

    expect(results.every((r) => r.metadata?.category === "a")).toBe(true);
  });
});
```

---

## Usage Examples

### Basic Usage

```typescript
import { VectorStoreFactory, VectorStoreName } from "neurolink";

// Create a vector store
const store = await VectorStoreFactory.createStore(VectorStoreName.PINECONE, {
  apiKey: process.env.PINECONE_API_KEY!,
});

await store.connect();

// Create an index
await store.createIndex({
  name: "my-vectors",
  dimension: 1536,
  metric: "cosine",
});

// Upsert vectors
await store.upsert("my-vectors", [
  {
    id: "doc-1",
    vector: await embedText("Hello world"),
    metadata: { source: "web", category: "greeting" },
    content: "Hello world",
  },
]);

// Query
const results = await store.query("my-vectors", {
  vector: await embedText("Hi there"),
  topK: 5,
  filter: { category: "greeting" },
});

console.log(results);
```

### RAG Integration

```typescript
import { NeuroLink, VectorStoreFactory, VectorStoreName } from "neurolink";

const neurolink = new NeuroLink({
  provider: "openai",
  model: "gpt-4o",
});

const vectorStore = await VectorStoreFactory.createStore(
  VectorStoreName.PGVECTOR,
  {
    connectionString: process.env.DATABASE_URL!,
  },
);

await vectorStore.connect();

// RAG query
async function ragQuery(question: string) {
  // 1. Embed the question
  const questionEmbedding = await neurolink.embed(question);

  // 2. Query similar documents
  const docs = await vectorStore.query("knowledge-base", {
    vector: questionEmbedding,
    topK: 5,
    minScore: 0.7,
  });

  // 3. Build context
  const context = docs.map((d) => d.content).join("\n\n");

  // 4. Generate answer
  const result = await neurolink.generate({
    prompt: `Based on the following context, answer the question.

Context:
${context}

Question: ${question}

Answer:`,
  });

  return result.text;
}
```

---

## Summary

This implementation guide provides a comprehensive blueprint for adding 22+ vector store integrations to NeuroLink. Key aspects include:

1. **Abstract Interface** - Unified `BaseVectorStore` with common operations
2. **Factory Pattern** - Dynamic store creation following NeuroLink patterns
3. **Type Safety** - Comprehensive TypeScript types for all operations
4. **Metadata Filtering** - Flexible filter translation for each provider
5. **Batch Operations** - Efficient handling of large datasets
6. **Health Monitoring** - Built-in health checks for reliability

The implementation follows NeuroLink's established architectural patterns (factory, registry, dynamic imports) ensuring consistency and maintainability across the codebase.
