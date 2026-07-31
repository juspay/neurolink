# Vector Store Configuration Reference

This document provides complete environment variable and configuration reference for all 22 NeuroLink vector store adapters.

## Configuration Overview

Each adapter can be configured via:

1. **Environment Variables** - For sensitive credentials
2. **Configuration Objects** - For programmatic setup
3. **Factory Parameters** - When using `VectorStoreFactory.createStore()`

## Cloud-Native Adapters

### Pinecone

```bash
# Required
PINECONE_API_KEY=your-api-key

# Optional
PINECONE_ENVIRONMENT=us-west1-gcp  # Deprecated in serverless
```

```typescript
const store = await VectorStoreFactory.createStore("pinecone", {
  apiKey: process.env.PINECONE_API_KEY,
});
```

**Index Config:**

```typescript
{
  name: "my-index",
  dimension: 1536,
  metric: "cosine",
  spec: {
    serverless: { cloud: "aws", region: "us-east-1" }
  }
}
```

---

### Qdrant

```bash
# For Qdrant Cloud
QDRANT_URL=https://xxx.qdrant.io:6333
QDRANT_API_KEY=your-api-key

# For local
QDRANT_URL=http://localhost:6333
```

```typescript
const store = await VectorStoreFactory.createStore("qdrant", {
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});
```

---

### Weaviate

```bash
# Weaviate Cloud
WEAVIATE_URL=https://your-cluster.weaviate.cloud
WEAVIATE_API_KEY=your-api-key

# Local
WEAVIATE_HOST=http://localhost:8080
```

```typescript
const store = await VectorStoreFactory.createStore("weaviate", {
  host: process.env.WEAVIATE_HOST,
  apiKey: process.env.WEAVIATE_API_KEY,
});
```

---

### Milvus

```bash
MILVUS_HOST=localhost
MILVUS_PORT=19530
MILVUS_TOKEN=your-token  # For Milvus Cloud
```

```typescript
const store = await VectorStoreFactory.createStore("milvus", {
  address: `${process.env.MILVUS_HOST}:${process.env.MILVUS_PORT}`,
  token: process.env.MILVUS_TOKEN,
});
```

---

### Zilliz Cloud

```bash
ZILLIZ_CLOUD_URI=https://xxx.zillizcloud.com
ZILLIZ_CLOUD_TOKEN=your-token
```

```typescript
const store = await VectorStoreFactory.createStore("zilliz", {
  uri: process.env.ZILLIZ_CLOUD_URI,
  token: process.env.ZILLIZ_CLOUD_TOKEN,
});
```

---

### DataStax Astra DB

```bash
ASTRA_DB_APPLICATION_TOKEN=AstraCS:xxx
ASTRA_DB_API_ENDPOINT=https://xxx-us-east1.apps.astra.datastax.com
```

```typescript
const store = await VectorStoreFactory.createStore("astra", {
  token: process.env.ASTRA_DB_APPLICATION_TOKEN,
  endpoint: process.env.ASTRA_DB_API_ENDPOINT,
});
```

---

### Upstash Vector

```bash
UPSTASH_VECTOR_URL=https://xxx.upstash.io
UPSTASH_VECTOR_TOKEN=your-token
```

```typescript
const store = await VectorStoreFactory.createStore("upstash", {
  url: process.env.UPSTASH_VECTOR_URL,
  token: process.env.UPSTASH_VECTOR_TOKEN,
});
```

---

### Cloudflare Vectorize

```bash
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
```

```typescript
const store = await VectorStoreFactory.createStore("cloudflare", {
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  apiToken: process.env.CLOUDFLARE_API_TOKEN,
});
```

---

## Database Adapters

### pgvector (PostgreSQL)

```bash
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DATABASE=vectors
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_SCHEMA=public

# Or connection string
POSTGRES_CONNECTION_STRING=postgresql://user:pass@host:5432/db
```

```typescript
const store = await VectorStoreFactory.createStore("pgvector", {
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || "5432"),
  database: process.env.POSTGRES_DATABASE,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  schema: process.env.POSTGRES_SCHEMA || "public",
  poolSize: 10,
});
```

**Prerequisites:**

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

### MongoDB Atlas

```bash
MONGODB_ATLAS_URI=mongodb+srv://user:pass@cluster.mongodb.net
MONGODB_ATLAS_DATABASE=vectors
```

```typescript
const store = await VectorStoreFactory.createStore("mongodb", {
  connectionUri: process.env.MONGODB_ATLAS_URI,
  databaseName: process.env.MONGODB_ATLAS_DATABASE || "vectors",
});
```

**Prerequisites:**

- Atlas M10+ cluster with Vector Search enabled
- Vector search index created on collection

---

### Elasticsearch

```bash
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_API_KEY=your-api-key  # Optional
ELASTICSEARCH_USERNAME=elastic      # Alternative auth
ELASTICSEARCH_PASSWORD=password
```

```typescript
const store = await VectorStoreFactory.createStore("elasticsearch", {
  node: process.env.ELASTICSEARCH_URL,
  auth: {
    apiKey: process.env.ELASTICSEARCH_API_KEY,
    // Or username/password
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD,
  },
});
```

---

### OpenSearch

```bash
OPENSEARCH_URL=https://localhost:9200
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=admin
```

```typescript
const store = await VectorStoreFactory.createStore("opensearch", {
  node: process.env.OPENSEARCH_URL,
  auth: {
    username: process.env.OPENSEARCH_USERNAME,
    password: process.env.OPENSEARCH_PASSWORD,
  },
});
```

---

### Redis (RediSearch)

```bash
# URL-based
REDIS_URL=redis://localhost:6379

# Or component-based
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=password
REDIS_DATABASE=0
```

```typescript
const store = await VectorStoreFactory.createStore("redis", {
  url: process.env.REDIS_URL,
  // Or
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  database: parseInt(process.env.REDIS_DATABASE || "0"),
  keyPrefix: "neurolink:vector:",
});
```

**Prerequisites:**

- Redis Stack 7.2+ (includes RediSearch)
- Or Redis with RediSearch module

---

### Couchbase

```bash
COUCHBASE_CONNECTION_STRING=couchbase://localhost
COUCHBASE_USERNAME=Administrator
COUCHBASE_PASSWORD=password
COUCHBASE_BUCKET=vectors
```

```typescript
const store = await VectorStoreFactory.createStore("couchbase", {
  connectionString: process.env.COUCHBASE_CONNECTION_STRING,
  username: process.env.COUCHBASE_USERNAME,
  password: process.env.COUCHBASE_PASSWORD,
  bucketName: process.env.COUCHBASE_BUCKET,
});
```

---

## Enterprise Adapters

### Azure AI Search

```bash
AZURE_SEARCH_ENDPOINT=https://your-service.search.windows.net
AZURE_SEARCH_API_KEY=your-admin-key
```

```typescript
const store = await VectorStoreFactory.createStore("azure-ai-search", {
  endpoint: process.env.AZURE_SEARCH_ENDPOINT,
  apiKey: process.env.AZURE_SEARCH_API_KEY,
});
```

---

### Vertex AI Vector Search

```bash
GOOGLE_CLOUD_PROJECT=your-project-id
VERTEX_AI_LOCATION=us-central1
VERTEX_AI_INDEX_ENDPOINT=projects/.../locations/.../indexEndpoints/...
```

```typescript
const store = await VectorStoreFactory.createStore("vertex-vector", {
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.VERTEX_AI_LOCATION,
  indexEndpoint: process.env.VERTEX_AI_INDEX_ENDPOINT,
});
```

**Prerequisites:**

- GCP project with Vertex AI API enabled
- Service account with Vertex AI Admin role

---

## Embedded Adapters

### Chroma

```bash
# Client-server mode
CHROMA_HOST=localhost
CHROMA_PORT=8000

# Or persistent local
CHROMA_PATH=./chroma-data
```

```typescript
// Ephemeral (in-memory)
const store = await VectorStoreFactory.createStore("chroma", {
  ephemeral: true,
});

// Persistent local
const store = await VectorStoreFactory.createStore("chroma", {
  path: "./chroma-data",
});

// Client-server
const store = await VectorStoreFactory.createStore("chroma", {
  url: "http://localhost:8000",
});
```

---

### LanceDB

```bash
# Local storage
LANCEDB_PATH=./lancedb-data

# S3 storage
LANCEDB_URI=s3://bucket/path
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=us-east-1
```

```typescript
// Local
const store = await VectorStoreFactory.createStore("lance", {
  uri: "./lancedb-data",
});

// S3
const store = await VectorStoreFactory.createStore("lance", {
  uri: "s3://my-bucket/lancedb",
  storageOptions: {
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  },
});
```

---

### DuckDB

```bash
DUCKDB_PATH=./duckdb-data/vectors.db
# Or use :memory: for in-memory
```

```typescript
// In-memory
const store = await VectorStoreFactory.createStore("duckdb", {
  databasePath: ":memory:",
  inMemory: true,
});

// Persistent
const store = await VectorStoreFactory.createStore("duckdb", {
  databasePath: "./vectors.duckdb",
});
```

---

### LibSQL / Turso

```bash
# Local mode
LIBSQL_PATH=./libsql/local.db

# Remote (Turso)
LIBSQL_URL=libsql://your-db.turso.io
LIBSQL_AUTH_TOKEN=your-token
```

```typescript
// Local
const store = await VectorStoreFactory.createStore("libsql", {
  mode: "local",
  databasePath: "./local.db",
});

// Remote (Turso)
const store = await VectorStoreFactory.createStore("libsql", {
  mode: "remote",
  url: process.env.LIBSQL_URL,
  authToken: process.env.LIBSQL_AUTH_TOKEN,
});

// Replica (local + sync)
const store = await VectorStoreFactory.createStore("libsql", {
  mode: "replica",
  databasePath: "./replica.db",
  url: process.env.LIBSQL_URL,
  authToken: process.env.LIBSQL_AUTH_TOKEN,
  syncInterval: 60000, // 1 minute
});
```

---

### SQLite-VSS

```bash
SQLITE_VSS_PATH=./sqlite-vss/vectors.db
```

```typescript
// In-memory
const store = await VectorStoreFactory.createStore("sqlite-vss", {
  databasePath: ":memory:",
  inMemory: true,
});

// Persistent
const store = await VectorStoreFactory.createStore("sqlite-vss", {
  databasePath: "./vectors.db",
  walMode: true,
});
```

---

### FAISS

```bash
FAISS_INDEX_PATH=./faiss-data
```

```typescript
const store = await VectorStoreFactory.createStore("faiss", {
  indexPath: "./faiss-data",
  indexType: "flat", // flat, ivf, hnsw, ivf-pq
  metricType: "L2", // L2, IP (inner product)
  useGpu: false, // Requires faiss-gpu
});
```

**Index Types:**

- `flat` - Brute force, most accurate
- `ivf` - Inverted file index, faster
- `hnsw` - Hierarchical navigable small world
- `ivf-pq` - Product quantization, memory efficient

---

## Common Configuration Options

All adapters support these common options:

```typescript
{
  name?: string;           // Store identifier
  timeout?: number;        // Connection timeout (ms)
  maxRetries?: number;     // Max operation retries
  debug?: boolean;         // Enable debug logging
}
```

## Index Configuration

Standard index configuration:

```typescript
interface VectorIndexConfig {
  name: string; // Index name
  dimension: number; // Vector dimension (e.g., 1536)
  metric?: "cosine" | "euclidean" | "dotProduct"; // Distance metric
  config?: Record<string, unknown>; // Provider-specific options
}
```

## Security Best Practices

1. **Never commit credentials** to version control
2. **Use environment variables** for all secrets
3. **Rotate API keys** regularly
4. **Use least-privilege** service accounts
5. **Enable TLS** for all network connections

## See Also

- [TESTING.md](./TESTING.md) - Running tests
- [VERIFICATION.md](./VERIFICATION.md) - Manual verification
