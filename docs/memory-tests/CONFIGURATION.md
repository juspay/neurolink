# Three-Layer Memory System Configuration Guide

This document details all configuration options for the Three-Layer Memory System.

## Overview

The memory system can be configured at multiple levels:

1. **SDK Configuration** - Programmatic configuration via `NeuroLink` class
2. **Environment Variables** - External configuration for credentials
3. **Configuration Files** - JSON/YAML configuration files
4. **CLI Flags** - Runtime configuration via command line

## Token Budget Configuration

### Default Allocation

| Layer                | Default | Purpose                   |
| -------------------- | ------- | ------------------------- |
| Working Memory       | 15%     | User profile, preferences |
| Conversation History | 60%     | Recent messages           |
| Semantic Recall      | 25%     | Relevant context          |

### Customizing Token Budget

```typescript
import { NeuroLink, MemoryCoordinator } from "neurolink-sdk";

const neurolink = new NeuroLink({
  memory: {
    tokenBudget: {
      total: 8000, // Total tokens for memory
      workingMemory: 0.2, // 20% for user profile
      conversationHistory: 0.55, // 55% for recent messages
      semanticRecall: 0.25, // 25% for semantic search
    },
  },
});
```

### CLI Configuration

```bash
# Set token budget via CLI
neurolink config set memory.tokenBudget.total 8000
neurolink config set memory.tokenBudget.workingMemory 0.20
```

## Embedder Configuration

### OpenAI Embeddings

```typescript
const config = {
  embedder: {
    provider: "openai",
    model: "text-embedding-3-small", // or 'text-embedding-3-large'
    apiKey: process.env.OPENAI_API_KEY,
    dimensions: 1536, // 3072 for large model
    batchSize: 2048,
  },
};
```

**Environment Variables:**

```bash
OPENAI_API_KEY=sk-...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

### Google Vertex AI Embeddings

```typescript
const config = {
  embedder: {
    provider: "vertex",
    model: "textembedding-gecko@003",
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
    location: "us-central1",
    dimensions: 768,
  },
};
```

**Environment Variables:**

```bash
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
VERTEX_LOCATION=us-central1
```

### Cohere Embeddings

```typescript
const config = {
  embedder: {
    provider: "cohere",
    model: "embed-english-v3.0",
    apiKey: process.env.COHERE_API_KEY,
    inputType: "search_document", // or 'search_query'
    dimensions: 1024,
  },
};
```

**Environment Variables:**

```bash
COHERE_API_KEY=...
COHERE_EMBEDDING_MODEL=embed-english-v3.0
```

### Mistral Embeddings

```typescript
const config = {
  embedder: {
    provider: "mistral",
    model: "mistral-embed",
    apiKey: process.env.MISTRAL_API_KEY,
    dimensions: 1024,
  },
};
```

**Environment Variables:**

```bash
MISTRAL_API_KEY=...
```

### Ollama Embeddings (Local)

```typescript
const config = {
  embedder: {
    provider: "ollama",
    model: "nomic-embed-text",
    baseUrl: "http://localhost:11434",
    dimensions: 768,
  },
};
```

**Environment Variables:**

```bash
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

### AWS Bedrock Embeddings

```typescript
const config = {
  embedder: {
    provider: "bedrock",
    model: "amazon.titan-embed-text-v1",
    region: process.env.AWS_REGION,
    dimensions: 1536,
  },
};
```

**Environment Variables:**

```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_BEDROCK_EMBEDDING_MODEL=amazon.titan-embed-text-v1
```

## Vector Store Configuration

### In-Memory Vector Store

```typescript
const config = {
  vectorStore: {
    provider: "memory",
    maxDocuments: 10000,
    similarityMetric: "cosine",
  },
};
```

Best for: Development, testing, small datasets.

### Redis Vector Store

```typescript
const config = {
  vectorStore: {
    provider: "redis",
    url: process.env.REDIS_URL,
    indexName: "neurolink_vectors",
    similarityMetric: "COSINE",
    dimensions: 1536,
    indexOptions: {
      initialCapacity: 10000,
      blockSize: 1024,
    },
  },
};
```

**Environment Variables:**

```bash
REDIS_URL=redis://localhost:6379
REDIS_INDEX_NAME=neurolink_vectors
```

### Qdrant Vector Store

```typescript
const config = {
  vectorStore: {
    provider: "qdrant",
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
    collectionName: "neurolink_collection",
    dimensions: 1536,
    similarityMetric: "Cosine",
    onDiskPayload: true,
    quantization: {
      type: "scalar",
      quantile: 0.99,
    },
  },
};
```

**Environment Variables:**

```bash
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=...
QDRANT_COLLECTION_NAME=neurolink_collection
```

### PostgreSQL pgvector Store

```typescript
const config = {
  vectorStore: {
    provider: "pgvector",
    connectionString: process.env.DATABASE_URL,
    tableName: "neurolink_embeddings",
    dimensions: 1536,
    similarityMetric: "cosine",
    indexType: "ivfflat", // or 'hnsw'
    indexOptions: {
      lists: 100, // for ivfflat
      m: 16, // for hnsw
      efConstruction: 64,
    },
  },
};
```

**Environment Variables:**

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/neurolink
PGVECTOR_TABLE_NAME=neurolink_embeddings
```

### Pinecone Vector Store

```typescript
const config = {
  vectorStore: {
    provider: "pinecone",
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT,
    indexName: "neurolink-index",
    namespace: "default",
    dimensions: 1536,
    metric: "cosine",
    podType: "p1.x1", // or 's1.x1', 'p2.x1'
  },
};
```

**Environment Variables:**

```bash
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX_NAME=neurolink-index
```

## Conversation History Configuration

```typescript
const config = {
  conversationHistory: {
    maxMessages: 40, // Messages before summarization
    summarizationThreshold: 35, // When to trigger summarization
    summaryMaxTokens: 500, // Max tokens for summary
    preserveSystemMessage: true, // Keep system message in history
    includeToolResults: true, // Include tool call results
    timestampFormat: "ISO8601", // Timestamp format
  },
};
```

## Semantic Recall Configuration

```typescript
const config = {
  semanticRecall: {
    topK: 5, // Number of results to retrieve
    similarityThreshold: 0.7, // Minimum similarity score
    maxTokensPerResult: 500, // Truncate long results
    includeMetadata: true, // Include document metadata
    reranking: {
      enabled: true,
      model: "cross-encoder/ms-marco-MiniLM-L-6-v2",
    },
  },
};
```

## Working Memory Configuration

### Template Mode

```typescript
const config = {
  workingMemory: {
    mode: "template",
    template: `
# User Profile: {{name}}

## Preferences
- Language: {{preferences.language}}
- Timezone: {{preferences.timezone}}

## Expertise
{{#each expertise}}
- {{this}}
{{/each}}
    `,
    maxTokens: 1000,
  },
};
```

### Schema Mode

```typescript
import { z } from "zod";

const userSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  preferences: z.object({
    language: z.string(),
    theme: z.enum(["light", "dark"]),
  }),
  expertise: z.array(z.string()),
});

const config = {
  workingMemory: {
    mode: "schema",
    schema: userSchema,
    maxTokens: 1000,
  },
};
```

## Complete Configuration Example

```typescript
import { NeuroLink } from "neurolink-sdk";
import { z } from "zod";

const neurolink = new NeuroLink({
  provider: "openai",
  model: "gpt-4o",

  memory: {
    enabled: true,

    // Token budget
    tokenBudget: {
      total: 8000,
      workingMemory: 0.15,
      conversationHistory: 0.6,
      semanticRecall: 0.25,
    },

    // Embedder
    embedder: {
      provider: "openai",
      model: "text-embedding-3-small",
    },

    // Vector store
    vectorStore: {
      provider: "qdrant",
      url: "http://localhost:6333",
      collectionName: "neurolink",
    },

    // Conversation history
    conversationHistory: {
      maxMessages: 40,
      summarizationThreshold: 35,
    },

    // Semantic recall
    semanticRecall: {
      topK: 5,
      similarityThreshold: 0.7,
    },

    // Working memory
    workingMemory: {
      mode: "schema",
      schema: z.object({
        name: z.string(),
        preferences: z.object({
          language: z.string(),
        }),
      }),
    },
  },
});
```

## Configuration File (neurolink.config.json)

```json
{
  "memory": {
    "enabled": true,
    "tokenBudget": {
      "total": 8000,
      "workingMemory": 0.15,
      "conversationHistory": 0.6,
      "semanticRecall": 0.25
    },
    "embedder": {
      "provider": "openai",
      "model": "text-embedding-3-small"
    },
    "vectorStore": {
      "provider": "redis",
      "indexName": "neurolink_vectors"
    },
    "conversationHistory": {
      "maxMessages": 40
    },
    "semanticRecall": {
      "topK": 5,
      "similarityThreshold": 0.7
    },
    "workingMemory": {
      "mode": "template"
    }
  }
}
```

## Environment Variable Reference

| Variable                          | Description           | Default  |
| --------------------------------- | --------------------- | -------- |
| `NEUROLINK_MEMORY_ENABLED`        | Enable memory system  | `true`   |
| `NEUROLINK_MEMORY_TOKEN_BUDGET`   | Total token budget    | `4000`   |
| `NEUROLINK_EMBEDDER_PROVIDER`     | Embedder provider     | `openai` |
| `NEUROLINK_VECTOR_STORE_PROVIDER` | Vector store provider | `memory` |
| `OPENAI_API_KEY`                  | OpenAI API key        | -        |
| `COHERE_API_KEY`                  | Cohere API key        | -        |
| `MISTRAL_API_KEY`                 | Mistral API key       | -        |
| `REDIS_URL`                       | Redis connection URL  | -        |
| `QDRANT_URL`                      | Qdrant server URL     | -        |
| `DATABASE_URL`                    | PostgreSQL connection | -        |
| `PINECONE_API_KEY`                | Pinecone API key      | -        |

## Related Documentation

- [TESTING.md](./TESTING.md) - How to run tests
- [VERIFICATION.md](./VERIFICATION.md) - Manual verification checklist
- [CLI-COVERAGE.md](./CLI-COVERAGE.md) - CLI command coverage
