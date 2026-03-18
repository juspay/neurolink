---
title: "Embeddings"
description: Generate vector embeddings for semantic search, RAG pipelines, and similarity comparison using OpenAI, Google AI Studio, Google Vertex, and Amazon Bedrock
keywords:
  [
    embeddings,
    vector-embeddings,
    semantic-search,
    similarity,
    rag,
    text-embedding,
    embed,
    embedMany,
  ]
---

# Embeddings

> **Status**: Stable | **Availability**: SDK + CLI + Server

## Overview

Embeddings convert text into dense numerical vectors that capture semantic meaning. Two texts with similar meanings produce vectors that are close together in the embedding space, enabling use cases like:

- **Semantic search** -- find documents by meaning rather than exact keyword match
- **RAG pipelines** -- retrieve relevant context before generating answers
- **Similarity comparison** -- measure how related two pieces of text are
- **Clustering and classification** -- group or categorize text automatically

NeuroLink exposes embeddings through two provider methods (`embed()` and `embedMany()`), two server endpoints, and indirectly through the CLI's RAG commands. All implementations delegate to the Vercel AI SDK or native provider APIs.

## Quick Start

```typescript
import { ProviderFactory } from "@juspay/neurolink";

const provider = await ProviderFactory.createProvider("openai");
const vector = await provider.embed("How do I reset my password?");
// vector: number[] -- e.g., 1536 dimensions for text-embedding-3-small
```

## Provider Support

Four providers implement native embedding support. All other providers throw a descriptive error when `embed()` or `embedMany()` is called (see [Unsupported Providers](#unsupported-providers) below).

| Provider         | Default Model                  | Env Override                | Dimensions |
| ---------------- | ------------------------------ | --------------------------- | ---------- |
| OpenAI           | `text-embedding-3-small`       | `OPENAI_EMBEDDING_MODEL`    | 1536       |
| Google AI Studio | `gemini-embedding-001`         | `GOOGLE_AI_EMBEDDING_MODEL` | 3072       |
| Google Vertex    | `text-embedding-004`           | `VERTEX_EMBEDDING_MODEL`    | 768        |
| Amazon Bedrock   | `amazon.titan-embed-text-v2:0` | `BEDROCK_EMBEDDING_MODEL`   | 1024       |

Google AI Studio and Google Vertex also accept `GOOGLE_EMBEDDING_MODEL` as a shared fallback environment variable.

Amazon Bedrock also accepts `AWS_EMBEDDING_MODEL` as an alternative environment variable.

## SDK API

### `provider.embed(text, modelName?)`

Generate an embedding vector for a single text string.

**Parameters:**

| Name        | Type     | Required | Description                                            |
| ----------- | -------- | -------- | ------------------------------------------------------ |
| `text`      | `string` | Yes      | The text to embed                                      |
| `modelName` | `string` | No       | Override the default embedding model for this provider |

**Returns:** `Promise<number[]>` -- the embedding vector.

```typescript
import { ProviderFactory } from "@juspay/neurolink";

// Use the provider's default embedding model
const provider = await ProviderFactory.createProvider("googleAiStudio");
const embedding = await provider.embed("NeuroLink supports 12+ AI providers");
console.log(embedding.length); // 3072

// Override the model
const embedding2 = await provider.embed(
  "Custom model example",
  "gemini-embedding-001",
);
```

### `provider.embedMany(texts, modelName?)`

Generate embedding vectors for multiple texts in a single batch. The Vercel AI SDK automatically handles chunking for models that impose batch-size limits. Amazon Bedrock processes each text individually via `Promise.all` because the Titan Embed API accepts one input at a time.

**Parameters:**

| Name        | Type       | Required | Description                                            |
| ----------- | ---------- | -------- | ------------------------------------------------------ |
| `texts`     | `string[]` | Yes      | The texts to embed                                     |
| `modelName` | `string`   | No       | Override the default embedding model for this provider |

**Returns:** `Promise<number[][]>` -- one embedding vector per input text.

```typescript
import { ProviderFactory } from "@juspay/neurolink";

const provider = await ProviderFactory.createProvider("openai");
const embeddings = await provider.embedMany([
  "First document about authentication",
  "Second document about billing",
  "Third document about deployment",
]);
console.log(embeddings.length); // 3
console.log(embeddings[0].length); // 1536
```

## Server API

The NeuroLink server exposes two embedding endpoints under the `/api/agent` route group. Both default to the `openai` provider when `provider` is omitted.

### `POST /api/agent/embed`

Generate an embedding for a single text.

**Request body:**

```json
{
  "text": "How do I configure billing?",
  "provider": "openai",
  "model": "text-embedding-3-small"
}
```

| Field      | Type     | Required | Description                                      |
| ---------- | -------- | -------- | ------------------------------------------------ |
| `text`     | `string` | Yes      | Non-empty text to embed                          |
| `provider` | `string` | No       | Provider name (default: `"openai"`)              |
| `model`    | `string` | No       | Embedding model name (default: provider default) |

**Response (200):**

```json
{
  "embedding": [0.0123, -0.0456, 0.0789, "..."],
  "provider": "openai",
  "model": "text-embedding-3-small",
  "dimension": 1536
}
```

### `POST /api/agent/embed-many`

Generate embeddings for multiple texts in one request.

**Request body:**

```json
{
  "texts": ["First document", "Second document", "Third document"],
  "provider": "vertex",
  "model": "text-embedding-004"
}
```

| Field      | Type       | Required | Description                                      |
| ---------- | ---------- | -------- | ------------------------------------------------ |
| `texts`    | `string[]` | Yes      | 1 to 2048 non-empty strings                      |
| `provider` | `string`   | No       | Provider name (default: `"openai"`)              |
| `model`    | `string`   | No       | Embedding model name (default: provider default) |

**Response (200):**

```json
{
  "embeddings": [
    [0.012, -0.045, "..."],
    [0.034, -0.067, "..."],
    [0.056, -0.089, "..."]
  ],
  "provider": "vertex",
  "model": "text-embedding-004",
  "count": 3,
  "dimension": 768
}
```

**Error response (validation failure):**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": [
      { "path": "text", "message": "Text is required", "code": "too_small" }
    ]
  },
  "metadata": {
    "timestamp": "2025-05-01T12:00:00.000Z",
    "requestId": "req-abc123"
  }
}
```

**Error response (provider failure):**

```json
{
  "error": {
    "code": "EXECUTION_FAILED",
    "message": "Embedding generation is not supported by the anthropic provider. Supported providers: openai, vertex/google, bedrock."
  },
  "metadata": {
    "timestamp": "2025-05-01T12:00:00.000Z"
  }
}
```

## Unsupported Providers

Calling `embed()` or `embedMany()` on a provider that does not implement embeddings throws an `Error` with a message listing the supported providers and example models:

```
Embedding generation is not supported by the anthropic provider.
Supported providers: openai, vertex/google, bedrock.
Use an embedding model like text-embedding-3-small (OpenAI),
text-embedding-004 (Vertex), or amazon.titan-embed-text-v2:0 (Bedrock).
```

Providers that currently do **not** support embeddings include: Anthropic, Mistral, LiteLLM, Ollama, Hugging Face, Azure OpenAI, and SageMaker. To generate embeddings when using one of these providers for text generation, create a second provider instance from a supported embedding provider:

```typescript
import { ProviderFactory } from "@juspay/neurolink";

// Use Anthropic for generation
const chatProvider = await ProviderFactory.createProvider("anthropic");

// Use OpenAI for embeddings
const embedProvider = await ProviderFactory.createProvider("openai");
const vector = await embedProvider.embed("Text to embed");
```

## CLI Usage

There is no standalone `neurolink embed` CLI command. Embeddings are used indirectly through the RAG CLI commands, which handle embedding generation automatically during document indexing and querying:

```bash
# Index documents (generates embeddings internally)
neurolink rag index ./docs/guide.md --indexName my-docs --provider vertex

# Query with automatic embedding of the query string
neurolink rag query "What are the main features?" --indexName my-docs --provider vertex
```

The RAG commands select an appropriate embedding model based on the configured provider. You can override the model with `--model`:

```bash
neurolink rag index ./docs/guide.md \
  --indexName my-docs \
  --provider openai \
  --model text-embedding-3-large
```

The embedding model resolution order for RAG commands is:

1. `--model` flag (if the value matches an embedding model pattern)
2. `NEUROLINK_EMBEDDING_MODEL` environment variable
3. Provider-specific environment variable (e.g., `VERTEX_EMBEDDING_MODEL`)
4. Provider's default embedding model
5. Fallback to OpenAI `text-embedding-3-small`

## Integration with RAG

Embeddings are a foundational building block for RAG pipelines. NeuroLink's simplified RAG API (`rag: { files }`) handles embedding generation internally, so you do not need to call `embed()` directly:

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "What are the key features?" },
  rag: {
    files: ["./docs/guide.md"],
    chunkSize: 512,
    topK: 5,
  },
});
```

For full control over the embedding and retrieval steps, use `createVectorQueryTool` with explicit `embed()` calls:

```typescript
import {
  NeuroLink,
  createVectorQueryTool,
  InMemoryVectorStore,
  ProviderFactory,
} from "@juspay/neurolink";

// Generate embeddings manually
const embedProvider = await ProviderFactory.createProvider("openai");
const vectors = await embedProvider.embedMany([
  "Document about authentication",
  "Document about billing",
]);

// Store in a vector store
const store = new InMemoryVectorStore();
await store.upsert("knowledge", [
  {
    id: "doc1",
    vector: vectors[0],
    metadata: { text: "Document about authentication" },
  },
  {
    id: "doc2",
    vector: vectors[1],
    metadata: { text: "Document about billing" },
  },
]);

// Create a query tool and use it with generate()
const ragTool = createVectorQueryTool(
  {
    id: "knowledge-search",
    description: "Search the knowledge base",
    indexName: "knowledge",
    embeddingModel: { provider: "openai", modelName: "text-embedding-3-small" },
    topK: 5,
  },
  store,
);

const neurolink = new NeuroLink();
const result = await neurolink.generate({
  input: { text: "How does authentication work?" },
  tools: { [ragTool.name]: ragTool },
});
```

For more details on RAG pipelines, see the [RAG Document Processing Guide](./rag.md).

## Environment Variables

| Variable                    | Provider(s)                     | Description                                                             |
| --------------------------- | ------------------------------- | ----------------------------------------------------------------------- |
| `OPENAI_EMBEDDING_MODEL`    | OpenAI                          | Override OpenAI default embedding model                                 |
| `GOOGLE_AI_EMBEDDING_MODEL` | Google AI Studio                | Override AI Studio default embedding model                              |
| `VERTEX_EMBEDDING_MODEL`    | Google Vertex                   | Override Vertex default embedding model (default: `text-embedding-004`) |
| `GOOGLE_EMBEDDING_MODEL`    | Google AI Studio, Google Vertex | Shared fallback for Google providers                                    |
| `BEDROCK_EMBEDDING_MODEL`   | Amazon Bedrock                  | Override Bedrock default embedding model                                |
| `AWS_EMBEDDING_MODEL`       | Amazon Bedrock                  | Alternative Bedrock env var                                             |
| `NEUROLINK_EMBEDDING_MODEL` | All (CLI RAG only)              | Global override for RAG CLI commands                                    |

## Key Files

| File                                   | Purpose                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------ |
| `src/lib/core/baseProvider.ts`         | Default `embed()` / `embedMany()` stubs                                        |
| `src/lib/providers/openAI.ts`          | OpenAI embedding implementation                                                |
| `src/lib/providers/googleAiStudio.ts`  | Google AI Studio embedding implementation                                      |
| `src/lib/providers/googleVertex.ts`    | Google Vertex embedding implementation                                         |
| `src/lib/providers/amazonBedrock.ts`   | Amazon Bedrock embedding implementation                                        |
| `src/lib/server/routes/agentRoutes.ts` | Server `/embed` and `/embed-many` routes                                       |
| `src/lib/server/utils/validation.ts`   | `EmbedRequestSchema`, `EmbedManyRequestSchema`                                 |
| `src/lib/server/types.ts`              | `EmbedRequest`, `EmbedResponse`, `EmbedManyRequest`, `EmbedManyResponse` types |
| `src/lib/types/providers.ts`           | `AIProvider` type with embedding methods                                       |

## See Also

- [RAG Document Processing Guide](./rag.md) -- end-to-end RAG pipelines using embeddings
- [SDK API Reference](../sdk/api-reference.md) -- SDK API reference
