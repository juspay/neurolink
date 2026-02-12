# Vector Stores Guide

Learn how to configure and use vector stores for semantic search in RAG pipelines.

> **Since**: v8.44.0 | **Status**: Stable | **Availability**: SDK + CLI

## Overview

Vector stores are the backbone of semantic search in RAG (Retrieval-Augmented Generation) systems. They store document embeddings and enable fast similarity search to find relevant content for your queries.

NeuroLink provides:

- **Abstract VectorStore Interface** - Consistent API for any vector database
- **InMemoryVectorStore** - Built-in store for development and testing
- **Provider-Specific Options** - Native support for Pinecone, pgVector, and Chroma
- **Metadata Filtering** - Rich query syntax for filtering results
- **Hybrid Search Integration** - Combine vector search with BM25 keyword matching

## Quick Start

```typescript
import { InMemoryVectorStore, createVectorQueryTool } from "@juspay/neurolink";

// Create a vector store
const vectorStore = new InMemoryVectorStore();

// Add documents with embeddings
await vectorStore.upsert("my-index", [
  {
    id: "doc-1",
    vector: [0.1, 0.2, 0.3 /* ... embedding values */],
    metadata: { text: "Machine learning fundamentals", topic: "ml" },
  },
  {
    id: "doc-2",
    vector: [0.15, 0.25, 0.35 /* ... embedding values */],
    metadata: { text: "Deep learning architectures", topic: "dl" },
  },
]);

// Query for similar documents
const results = await vectorStore.query({
  indexName: "my-index",
  queryVector: [0.12, 0.22, 0.32 /* ... query embedding */],
  topK: 5,
});

console.log(results);
// [{ id: "doc-1", score: 0.95, text: "...", metadata: {...} }, ...]
```

## Available Vector Stores

### InMemoryVectorStore

The built-in `InMemoryVectorStore` is perfect for development, testing, and small-scale applications.

```typescript
import { InMemoryVectorStore } from "@juspay/neurolink";

const store = new InMemoryVectorStore();
```

**Features:**

- Zero dependencies - works out of the box
- Full metadata filtering support
- Cosine similarity search
- No persistence (data lost on restart)

**When to Use:**

- Development and testing
- Prototyping RAG pipelines
- Small datasets (< 10,000 vectors)
- CI/CD test environments

**Limitations:**

- Not suitable for production with large datasets
- No persistence across restarts
- Memory-bound scaling

### Production Vector Stores

For production deployments, integrate with dedicated vector databases. NeuroLink's `VectorStore` interface is designed to work with any vector database.

#### Pinecone Integration

```typescript
import { Pinecone } from "@pinecone-database/pinecone";
import type { VectorStore } from "@juspay/neurolink";

class PineconeVectorStore implements VectorStore {
  private client: Pinecone;
  private index: ReturnType<Pinecone["index"]>;

  constructor(apiKey: string, indexName: string) {
    this.client = new Pinecone({ apiKey });
    this.index = this.client.index(indexName);
  }

  async query(params: {
    indexName: string;
    queryVector: number[];
    topK?: number;
    filter?: Record<string, unknown>;
    includeVectors?: boolean;
  }) {
    const response = await this.index.query({
      vector: params.queryVector,
      topK: params.topK || 10,
      filter: params.filter,
      includeMetadata: true,
      includeValues: params.includeVectors,
    });

    return response.matches.map((match) => ({
      id: match.id,
      score: match.score,
      text: match.metadata?.text as string,
      metadata: match.metadata,
      vector: match.values,
    }));
  }
}

// Usage
const pineconeStore = new PineconeVectorStore(
  process.env.PINECONE_API_KEY!,
  "my-index",
);
```

#### pgVector Integration

```typescript
import { Pool } from "pg";
import type { VectorStore } from "@juspay/neurolink";

class PgVectorStore implements VectorStore {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async query(params: {
    indexName: string;
    queryVector: number[];
    topK?: number;
    filter?: Record<string, unknown>;
  }) {
    const vectorStr = `[${params.queryVector.join(",")}]`;

    // WARNING: Validate indexName against allowlist before use
    const safeName = params.indexName.replace(/[^a-zA-Z0-9_]/g, "");
    const result = await this.pool.query(
      `
      SELECT id, text, metadata, 
             1 - (embedding <=> $1::vector) as score
      FROM ${safeName}
      ORDER BY embedding <=> $1::vector
      LIMIT $2
    `,
      [vectorStr, params.topK || 10],
    );

    return result.rows.map((row) => ({
      id: row.id,
      score: row.score,
      text: row.text,
      metadata: row.metadata,
    }));
  }
}
```

#### Chroma Integration

```typescript
import { ChromaClient } from "chromadb";
import type { VectorStore } from "@juspay/neurolink";

class ChromaVectorStore implements VectorStore {
  private client: ChromaClient;

  constructor(path?: string) {
    this.client = new ChromaClient({ path });
  }

  async query(params: {
    indexName: string;
    queryVector: number[];
    topK?: number;
    filter?: Record<string, unknown>;
  }) {
    const collection = await this.client.getCollection({
      name: params.indexName,
    });

    const results = await collection.query({
      queryEmbeddings: [params.queryVector],
      nResults: params.topK || 10,
      where: params.filter,
    });

    return (results.ids[0] || []).map((id, i) => ({
      id,
      score: results.distances?.[0]?.[i]
        ? 1 - results.distances[0][i]
        : undefined,
      text: results.documents?.[0]?.[i] || undefined,
      metadata: results.metadatas?.[0]?.[i] || undefined,
    }));
  }
}
```

## Configuration

### VectorStore Interface

All vector stores implement this interface:

```typescript
type VectorStore = {
  query(params: {
    indexName: string;
    queryVector: number[];
    topK?: number;
    filter?: MetadataFilter;
    includeVectors?: boolean;
  }): Promise<VectorQueryResult[]>;
};
```

### VectorQueryResult

Query results follow this structure:

```typescript
type VectorQueryResult = {
  /** Unique identifier */
  id: string;
  /** Text content */
  text?: string;
  /** Similarity/relevance score (0-1) */
  score?: number;
  /** Associated metadata */
  metadata?: Record<string, unknown>;
  /** Embedding vector (if requested) */
  vector?: number[];
};
```

### Provider-Specific Options

Configure provider-specific behavior through `VectorProviderOptions`:

```typescript
type VectorProviderOptions = {
  /** Pinecone options */
  pinecone?: {
    namespace?: string;
    sparseVector?: number[];
  };
  /** pgVector options */
  pgVector?: {
    minScore?: number;
    ef?: number; // HNSW ef_search parameter
    probes?: number; // IVFFlat probes parameter
  };
  /** Chroma options */
  chroma?: {
    where?: Record<string, unknown>;
    whereDocument?: Record<string, unknown>;
  };
};
```

## Usage Examples

### Adding Documents/Chunks

```typescript
import { InMemoryVectorStore } from "@juspay/neurolink";
import { ProviderFactory } from "@juspay/neurolink";

// Create store and get embedding provider
const store = new InMemoryVectorStore();
const embedder = await ProviderFactory.createProvider(
  "openai",
  "text-embedding-3-small",
);

// Prepare documents
const documents = [
  { id: "1", text: "Introduction to machine learning concepts" },
  { id: "2", text: "Neural network architectures and training" },
  { id: "3", text: "Natural language processing techniques" },
];

// Generate embeddings and upsert
const items = await Promise.all(
  documents.map(async (doc) => ({
    id: doc.id,
    vector: await embedder.embed(doc.text),
    metadata: { text: doc.text, source: "tutorial" },
  })),
);

await store.upsert("knowledge-base", items);
```

### Searching with Filters

```typescript
// Basic similarity search
const results = await store.query({
  indexName: "knowledge-base",
  queryVector: await embedder.embed("How do neural networks work?"),
  topK: 5,
});

// Search with metadata filter
const filteredResults = await store.query({
  indexName: "knowledge-base",
  queryVector: await embedder.embed("machine learning basics"),
  topK: 10,
  filter: {
    topic: "ml",
    difficulty: { $in: ["beginner", "intermediate"] },
  },
});
```

### Metadata Filter Syntax

NeuroLink supports MongoDB/Sift-style query operators:

```typescript
// Equality
filter: { topic: "ml" }

// Comparison operators
filter: {
  score: { $gt: 0.8 },        // Greater than
  score: { $gte: 0.8 },       // Greater than or equal
  score: { $lt: 0.5 },        // Less than
  score: { $lte: 0.5 },       // Less than or equal
  status: { $ne: "archived" } // Not equal
}

// Array operators
filter: {
  tags: { $in: ["ml", "ai", "nlp"] },    // Value in array
  category: { $nin: ["draft", "test"] }   // Value not in array
}

// Logical operators
filter: {
  $and: [
    { topic: "ml" },
    { difficulty: "beginner" }
  ]
}

filter: {
  $or: [
    { author: "alice" },
    { author: "bob" }
  ]
}

filter: {
  $not: { status: "draft" }
}

// Special operators
filter: {
  summary: { $exists: true },       // Field exists
  title: { $contains: "guide" },    // String contains
  tags: { $regex: "^ml-" }          // Regex match
}
```

### Using the Vector Query Tool

The `createVectorQueryTool` function creates a tool suitable for AI agents:

```typescript
import { createVectorQueryTool, InMemoryVectorStore } from "@juspay/neurolink";

const vectorStore = new InMemoryVectorStore();
// ... populate with data

const queryTool = createVectorQueryTool(
  {
    id: "knowledge-search",
    description: "Search the knowledge base for relevant information",
    indexName: "docs",
    embeddingModel: {
      provider: "openai",
      modelName: "text-embedding-3-small",
    },
    topK: 10,
    enableFilter: true,
    includeSources: true,
    reranker: {
      model: { provider: "openai", modelName: "gpt-4o-mini" },
      weights: { semantic: 0.5, vector: 0.3, position: 0.2 },
      topK: 5,
    },
  },
  vectorStore,
);

// Use in an agent
const response = await queryTool.execute({
  query: "What are the best practices for RAG?",
  filter: { category: "best-practices" },
  topK: 5,
});

console.log(response.relevantContext);
console.log(response.sources);
```

### Hybrid Search Integration

Combine vector search with BM25 for improved retrieval:

```typescript
import {
  InMemoryVectorStore,
  InMemoryBM25Index,
  createHybridSearch,
} from "@juspay/neurolink";

// Create both indices
const vectorStore = new InMemoryVectorStore();
const bm25Index = new InMemoryBM25Index();

// Add documents to both
const documents = [
  { id: "1", text: "Machine learning fundamentals", metadata: { topic: "ml" } },
  { id: "2", text: "Deep learning architectures", metadata: { topic: "dl" } },
];

// Populate BM25 index
await bm25Index.addDocuments(documents);

// Populate vector store (with embeddings)
await vectorStore.upsert(
  "docs",
  documents.map((doc) => ({
    id: doc.id,
    vector: /* embedding */,
    metadata: { ...doc.metadata, text: doc.text },
  })),
);

// Create hybrid search
const hybridSearch = createHybridSearch({
  vectorStore,
  bm25Index,
  indexName: "docs",
  embeddingModel: {
    provider: "openai",
    modelName: "text-embedding-3-small",
  },
  defaultConfig: {
    fusionMethod: "rrf", // or "linear"
    vectorWeight: 0.5,
    bm25Weight: 0.5,
    topK: 10,
  },
});

// Execute hybrid search
const results = await hybridSearch("neural network training", {
  topK: 5,
  fusionMethod: "rrf",
});
```

## Best Practices

### When to Use Which Store

| Use Case                   | Recommended Store           | Why                               |
| -------------------------- | --------------------------- | --------------------------------- |
| Development/Testing        | `InMemoryVectorStore`       | Zero setup, fast iteration        |
| Small apps (< 10k vectors) | `InMemoryVectorStore`       | Simple, sufficient performance    |
| Medium apps (10k-1M)       | pgVector, Chroma            | Good balance of features and cost |
| Large scale (> 1M vectors) | Pinecone, Weaviate, Qdrant  | Purpose-built for scale           |
| Serverless                 | Pinecone, Supabase pgVector | Managed, auto-scaling             |
| Self-hosted                | pgVector, Chroma, Milvus    | Full control, data locality       |
| Hybrid search required     | Pinecone (sparse-dense)     | Native support for sparse vectors |

### Performance Considerations

1. **Batch Operations**

   ```typescript
   // Good: Batch upsert
   await store.upsert("index", items); // Single call with many items

   // Avoid: Individual upserts
   for (const item of items) {
     await store.upsert("index", [item]); // Many calls
   }
   ```

2. **Index Configuration**
   - For pgVector: Use HNSW index for faster queries at slight accuracy cost
   - For Pinecone: Choose pod type based on query latency requirements
   - For Chroma: Use persistent storage for production

3. **Query Optimization**

   ```typescript
   // Use appropriate topK - don't over-fetch
   const results = await store.query({
     indexName: "docs",
     queryVector: embedding,
     topK: 10, // Only what you need
   });

   // Apply filters to reduce search space
   const filtered = await store.query({
     indexName: "docs",
     queryVector: embedding,
     topK: 10,
     filter: { category: "active" }, // Reduces candidates
   });
   ```

4. **Embedding Dimensions**
   - Smaller dimensions (384, 768) = faster search, lower storage
   - Larger dimensions (1536, 3072) = better accuracy, more resources
   - Match model to use case: `text-embedding-3-small` (1536) vs `text-embedding-3-large` (3072)

### Production Recommendations

1. **Use Managed Services** - Pinecone, Supabase, or cloud-hosted options reduce operational burden

2. **Implement Connection Pooling**

   ```typescript
   // For database-backed stores
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
     max: 20, // Connection pool size
     idleTimeoutMillis: 30000,
   });
   ```

3. **Add Circuit Breakers**

   ```typescript
   import { RAGCircuitBreaker } from "@juspay/neurolink";

   const breaker = new RAGCircuitBreaker("vector-store", {
     failureThreshold: 5,
     resetTimeout: 60000,
   });

   const results = await breaker.execute(
     () => store.query({ indexName: "docs", queryVector: embedding }),
     "query",
   );
   ```

4. **Monitor Performance**

   ```typescript
   const startTime = Date.now();
   const results = await store.query({ ... });
   const queryTime = Date.now() - startTime;

   logger.info("Vector query completed", {
     queryTime,
     resultsCount: results.length,
     indexName: "docs",
   });
   ```

5. **Handle Failures Gracefully**

   ```typescript
   import { RAGRetryHandler } from "@juspay/neurolink";

   const retryHandler = new RAGRetryHandler({
     maxRetries: 3,
     initialDelay: 1000,
     backoffMultiplier: 2,
   });

   const results = await retryHandler.executeWithRetry(() =>
     store.query({ indexName: "docs", queryVector: embedding }),
   );
   ```

## Troubleshooting

| Problem             | Solution                                                             |
| ------------------- | -------------------------------------------------------------------- |
| Empty results       | Verify embeddings are generated with same model used for indexing    |
| Slow queries        | Add appropriate indices; reduce topK; use metadata filters           |
| Memory issues       | Switch from InMemoryVectorStore to a persistent store                |
| Inconsistent scores | Ensure vectors are normalized; check embedding model consistency     |
| Filter not working  | Verify metadata was stored during upsert; check filter syntax        |
| Connection timeouts | Implement connection pooling; add retry logic; check network latency |

## See Also

- [RAG Document Processing Guide](../features/rag.md) - Complete RAG pipeline documentation
- [Hybrid Search](#hybrid-search-integration) - Combining vector and keyword search
- [Reranking Guide](../features/rag.md#reranking) - Improving result relevance
- [Observability Guide](../features/observability.md) - Monitoring RAG operations
- [Resilience Patterns](../features/rag.md#resilience-patterns) - Circuit breakers and retry handling
