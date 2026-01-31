# Three-Layer Memory System

NeuroLink's Three-Layer Memory System provides a comprehensive, Mastra-inspired memory architecture that enables AI applications to maintain context, recall relevant information semantically, and store structured knowledge about users and entities.

## Overview

The three-layer memory system consists of:

1. **Conversation History Layer** - Persists recent messages with intelligent summarization
2. **Semantic Recall Layer** - Vector-based similarity search for relevant historical context
3. **Working Memory Layer** - Structured knowledge storage (user profiles, preferences, etc.)

```
                                    NeuroLink Memory System
                                           |
                    +----------------------+----------------------+
                    |                      |                      |
            Conversation              Semantic                Working
               History                 Recall                 Memory
                    |                      |                      |
            +-------+-------+       +------+------+       +-------+-------+
            |               |       |             |       |               |
        In-Memory       Redis    Vector Store  Embedder  Template      Schema
                                     |             |       (MD)         (Zod)
                              +------+------+      |
                              |      |      |      |
                           Qdrant  Redis  PGVector  +-- OpenAI
                           Pinecone             +-- Vertex
                                                +-- Mistral
                                                +-- Cohere
                                                +-- Ollama
                                                +-- Bedrock
```

## Quick Start

### Basic Configuration

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
  },
  threeLayerMemory: {
    enabled: true,
    storage: { type: "memory" }, // or "redis"
    conversationHistory: {
      enabled: true,
      lastMessages: 40,
      enableSummarization: true,
      tokenThreshold: 8000,
    },
  },
});
```

### With Semantic Recall

```typescript
const neurolink = new NeuroLink({
  conversationMemory: { enabled: true },
  threeLayerMemory: {
    enabled: true,
    storage: { type: "redis", redis: { url: "redis://localhost:6379" } },
    conversationHistory: { enabled: true, lastMessages: 40 },
    semanticRecall: {
      enabled: true,
      vectorStore: {
        provider: "qdrant",
        config: {
          url: "http://localhost:6333",
          collectionName: "neurolink_memories",
        },
      },
      embedder: {
        provider: "openai",
        model: "text-embedding-3-small",
      },
      topK: 5,
      similarityThreshold: 0.7,
    },
  },
});
```

### With Working Memory

```typescript
const neurolink = new NeuroLink({
  conversationMemory: { enabled: true },
  threeLayerMemory: {
    enabled: true,
    storage: { type: "redis", redis: { url: "redis://localhost:6379" } },
    workingMemory: {
      enabled: true,
      scope: "resource", // Shared across all threads for a user
      template: `# User Profile
- Name: {{name}}
- Role: {{role}}
- Preferences: {{preferences}}
- Goals: {{goals}}`,
    },
  },
});
```

## Dynamic Memory Creation

You can also create the three-layer memory system after NeuroLink instantiation:

```typescript
const neurolink = new NeuroLink({
  conversationMemory: { enabled: true },
});

// Create memory system dynamically
const memoryManager = await neurolink.createThreeLayerMemory({
  enabled: true,
  storage: { type: "memory" },
  conversationHistory: { enabled: true },
  semanticRecall: {
    enabled: true,
    vectorStore: {
      provider: "pinecone",
      config: {
        apiKey: process.env.PINECONE_API_KEY,
        environment: "us-east-1",
        indexName: "neurolink-memory",
        namespace: "default",
      },
    },
    embedder: {
      provider: "cohere",
      model: "embed-v4",
    },
  },
  workingMemory: {
    enabled: true,
    template: "# User Context\n{{context}}",
  },
});
```

## Working Memory Operations

### Get Working Memory

```typescript
// Retrieve current working memory for a user
const workingMemory = await neurolink.getWorkingMemory({
  threadId: "session-123",
  resourceId: "user-456",
});

if (workingMemory) {
  console.log("User profile:", workingMemory);
}
```

### Update Working Memory

```typescript
// Update user preferences
await neurolink.updateWorkingMemory(
  { threadId: "session-123", resourceId: "user-456" },
  {
    name: "Alice",
    preferences: { theme: "dark", language: "en" },
    goals: ["Learn TypeScript", "Build AI apps"],
  },
  "User updated their preferences",
);
```

## Supported Embedding Providers

| Provider    | Model Examples                      | Dimensions | Max Tokens |
| ----------- | ----------------------------------- | ---------- | ---------- |
| **OpenAI**  | text-embedding-3-small, ada-002     | 1536-3072  | 8191       |
| **Vertex**  | text-embedding-004, gecko           | 768        | 2048       |
| **Mistral** | mistral-embed                       | 1024       | 8192       |
| **Cohere**  | embed-v4, embed-english-v3.0        | 384-1024   | 512-128000 |
| **Ollama**  | nomic-embed-text, mxbai-embed-large | 384-1024   | 256-8192   |
| **Bedrock** | titan-embed-text-v1/v2, cohere      | 1024-1536  | 512-8192   |

### OpenAI Configuration

```typescript
embedder: {
  provider: "openai",
  model: "text-embedding-3-small",
  config: {
    apiKey: process.env.OPENAI_API_KEY,
  },
}
```

### Vertex AI Configuration

```typescript
embedder: {
  provider: "vertex",
  model: "text-embedding-004",
  config: {
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
    region: "us-central1",
  },
}
```

### Mistral Configuration

```typescript
embedder: {
  provider: "mistral",
  model: "mistral-embed",
  config: {
    apiKey: process.env.MISTRAL_API_KEY,
  },
}
```

### Cohere Configuration

```typescript
embedder: {
  provider: "cohere",
  model: "embed-v4",
  config: {
    apiKey: process.env.COHERE_API_KEY,
  },
}
```

### Ollama Configuration (Local)

```typescript
embedder: {
  provider: "ollama",
  model: "nomic-embed-text",
  config: {
    baseUrl: "http://localhost:11434",
  },
}
```

### AWS Bedrock Configuration

```typescript
embedder: {
  provider: "bedrock",
  model: "amazon.titan-embed-text-v2:0",
  config: {
    region: "us-east-1",
    // Uses AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY from environment
  },
}
```

## Supported Vector Stores

| Provider     | Description                 | Use Case                      |
| ------------ | --------------------------- | ----------------------------- |
| **memory**   | In-memory storage           | Development, testing          |
| **redis**    | Redis Stack with RediSearch | Production, existing Redis    |
| **qdrant**   | High-performance vector DB  | Production, cloud/self-hosted |
| **pinecone** | Fully managed vector DB     | Production, serverless        |
| **pgvector** | PostgreSQL extension        | Production, existing Postgres |

### Qdrant Configuration

```typescript
vectorStore: {
  provider: "qdrant",
  config: {
    url: "http://localhost:6333",
    apiKey: process.env.QDRANT_API_KEY, // Optional for cloud
    collectionName: "memories",
  },
  dimensions: 1536,
  metric: "cosine",
}
```

### Pinecone Configuration

```typescript
vectorStore: {
  provider: "pinecone",
  config: {
    apiKey: process.env.PINECONE_API_KEY,
    environment: "us-east-1",
    indexName: "neurolink-memory",
    namespace: "production", // Optional namespace scoping
  },
}
```

### Redis Configuration

```typescript
vectorStore: {
  provider: "redis",
  config: {
    url: "redis://localhost:6379",
    password: process.env.REDIS_PASSWORD,
    indexName: "memory_vectors",
  },
}
```

### PGVector Configuration

```typescript
vectorStore: {
  provider: "pgvector",
  config: {
    connectionString: process.env.DATABASE_URL,
    tableName: "memory_embeddings",
    indexType: "hnsw", // or "ivfflat"
  },
}
```

## Memory Scoping

The memory system supports two scoping levels:

### Thread Scope (Default)

Data is isolated to a single conversation/session:

```typescript
{
  threadId: "conversation-123",
  scope: "thread"
}
```

### Resource Scope

Data is shared across all conversations for a user/entity:

```typescript
{
  threadId: "conversation-123",
  resourceId: "user-alice-456",
  scope: "resource"
}
```

## Working Memory Templates

Working memory supports two modes:

### Template Mode (Markdown)

```typescript
workingMemory: {
  enabled: true,
  template: `# User Profile
- Name: {{name}}
- Email: {{email}}
- Timezone: {{timezone}}

## Preferences
- Theme: {{theme}}
- Language: {{language}}

## Context
{{current_context}}`,
}
```

### Schema Mode (Zod)

```typescript
import { z } from "zod";

workingMemory: {
  enabled: true,
  schema: z.object({
    name: z.string(),
    email: z.string().email(),
    preferences: z.object({
      theme: z.enum(["light", "dark"]),
      language: z.string(),
    }),
    goals: z.array(z.string()),
  }),
}
```

## Memory Processors

Apply transformations to retrieved memory context:

```typescript
threeLayerMemory: {
  processors: [
    {
      type: "tokenLimit",
      options: { maxTokens: 4000 },
    },
    {
      type: "roleFilter",
      options: { excludeRoles: ["system", "tool_call", "tool_result"] },
    },
  ],
}
```

## Best Practices

### 1. Choose the Right Embedding Provider

- **OpenAI**: Best quality, cloud-only
- **Cohere**: Excellent multilingual support
- **Vertex**: Good for GCP deployments
- **Ollama**: Best for local/private deployments

### 2. Vector Store Selection

- **Development**: Use `memory` for quick iteration
- **Production with Redis**: Use `redis` if already using Redis
- **Production standalone**: Use `qdrant` or `pinecone`
- **PostgreSQL stack**: Use `pgvector`

### 3. Dimension Matching

Always ensure embedding dimensions match vector store configuration:

```typescript
// OpenAI text-embedding-3-small = 1536 dimensions
embedder: { provider: "openai", model: "text-embedding-3-small" },
vectorStore: { dimensions: 1536 }

// Cohere embed-v4 = 1024 dimensions
embedder: { provider: "cohere", model: "embed-v4" },
vectorStore: { dimensions: 1024 }
```

### 4. Resource Scoping for User Profiles

Use resource scope for working memory to persist user profiles across sessions:

```typescript
workingMemory: {
  enabled: true,
  scope: "resource", // Persists across threads
}
```

### 5. Token Budget Management

Use token-aware retrieval for optimal context assembly:

```typescript
const memoryManager = neurolink.getThreeLayerMemory();
const context = await memoryManager.retrieveWithTokenBudget(
  { threadId: "session-123", resourceId: "user-456" },
  "What are my preferences?",
  50000, // Max token budget
);
```

## Migration from Mem0

If you were using Mem0 integration, migrate to the three-layer memory system:

```typescript
// Old (deprecated)
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    mem0Enabled: true,
    mem0Config: { ... },
  },
});

// New (three-layer memory)
const neurolink = new NeuroLink({
  conversationMemory: { enabled: true },
  threeLayerMemory: {
    enabled: true,
    semanticRecall: {
      enabled: true,
      vectorStore: { provider: "qdrant", config: { ... } },
      embedder: { provider: "openai", model: "text-embedding-3-small" },
    },
  },
});
```

## Implementation Status

> **Feature Status: 100% COMPLETE** | Last Updated: January 31, 2026

| Component                  | Status   | Notes                                    |
| -------------------------- | -------- | ---------------------------------------- |
| Conversation History Layer | Complete | Full summarization support               |
| Semantic Recall Layer      | Complete | All vector stores supported              |
| Working Memory Layer       | Complete | Template and schema modes                |
| OpenAI Embedder            | Complete | text-embedding-3-small/large, ada-002    |
| Vertex Embedder            | Complete | text-embedding-004/005, gecko models     |
| Mistral Embedder           | Complete | mistral-embed                            |
| Cohere Embedder            | Complete | embed-v4, embed-english-v3.0             |
| Ollama Embedder            | Complete | Local embedding models                   |
| Bedrock Embedder           | Complete | Titan and Cohere on Bedrock              |
| In-Memory Vector Store     | Complete | Development use                          |
| Redis Vector Store         | Complete | Production ready                         |
| Qdrant Vector Store        | Complete | Production ready                         |
| Pinecone Vector Store      | Complete | Production ready                         |
| PGVector Store             | Complete | Production ready                         |
| NeuroLink Integration      | Complete | createThreeLayerMemory, getWorkingMemory |
| MemoryCoordinator          | Complete | Core orchestration layer                 |
| MemoryFactory              | Complete | Factory pattern implementation           |
| MemoryRegistry             | Complete | Registry pattern implementation          |
| CLI Integration            | Complete | memory stats/history/clear commands      |
| Test Suite                 | Complete | Unit and integration tests               |

## Additional Resources

- [Memory Types Reference](/docs/api/type-aliases/ThreeLayerMemoryConfig)
- [Vector Store API](/docs/api/type-aliases/VectorStore)
- [Embedder API](/docs/api/type-aliases/Embedder)
