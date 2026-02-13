# NeuroLink RAG Integration

NeuroLink provides built-in RAG (Retrieval-Augmented Generation) for document-grounded AI responses.

## Quick Start

The simplest way to use RAG:

```typescript
const result = await neurolink.generate({
  prompt: "What are the main features?",
  rag: {
    files: ["./docs/README.md", "./docs/features.md"],
  },
});

console.log(result.content);
```

NeuroLink automatically:

1. Loads the files
2. Chunks them appropriately
3. Creates embeddings
4. Stores in a vector index
5. Provides a `search_knowledge_base` tool to the AI
6. Returns grounded responses

## RAG Configuration

```typescript
const result = await neurolink.generate({
  prompt: "Explain the architecture",
  rag: {
    files: ["./docs/architecture.md"],

    // Chunking (note: chunkSize/chunkOverlap are RAG config fields;
    // they map to maxSize/overlap in the underlying chunker API)
    strategy: "markdown", // Auto-detected if omitted
    chunkSize: 512, // Characters per chunk
    chunkOverlap: 50, // Overlap between chunks

    // Retrieval
    topK: 5, // Results to retrieve

    // Tool customization
    toolName: "search_docs",
    toolDescription: "Search the documentation",

    // Embedding (optional)
    embeddingProvider: "openai",
    embeddingModel: "text-embedding-3-small",
  },
});
```

## Chunking Strategies

| Strategy            | Best For          | Description                |
| ------------------- | ----------------- | -------------------------- |
| `character`         | Simple text, logs | Fixed character count      |
| `recursive`         | General documents | Hierarchical by separators |
| `sentence`          | Prose, articles   | Sentence boundaries        |
| `token`             | LLM optimization  | Token-count based          |
| `markdown`          | Documentation     | Header/code-aware          |
| `html`              | Web content       | Element-aware              |
| `json`              | API responses     | Structure-preserving       |
| `latex`             | Academic papers   | Section/equation aware     |
| `semantic`          | Context-aware     | Similarity-based           |
| `semantic-markdown` | Technical docs    | Semantic + markdown        |

```typescript
// Markdown for documentation
const markdownResult = await neurolink.generate({
  prompt: "How do I configure providers?",
  rag: {
    files: ["./docs/providers.md"],
    strategy: "markdown",
    chunkSize: 1000,
  },
});

// Semantic for general text
const semanticResult = await neurolink.generate({
  prompt: "Summarize the research findings",
  rag: {
    files: ["./papers/research.pdf"],
    strategy: "semantic",
    chunkSize: 500,
  },
});

// JSON for structured data
const jsonResult = await neurolink.generate({
  prompt: "What endpoints are available?",
  rag: {
    files: ["./api/openapi.json"],
    strategy: "json",
  },
});
```

## Streaming with RAG

```typescript
const result = await neurolink.stream({
  prompt: "Explain the setup process in detail",
  rag: {
    files: ["./docs/setup.md", "./docs/configuration.md"],
    topK: 10,
  },
});

for await (const chunk of result.stream) {
  if ("content" in chunk) {
    process.stdout.write(chunk.content);
  }
}
```

## CLI Usage

```bash
# Basic RAG
neurolink generate "What features exist?" --rag-files ./docs/features.md

# Multiple files
neurolink generate "Compare approaches" --rag-files ./docs/a.md --rag-files ./docs/b.md

# With options
neurolink generate "Explain" \
  --rag-files ./docs/guide.md \
  --rag-strategy markdown \
  --rag-chunk-size 512 \
  --rag-top-k 10

# Streaming with RAG
neurolink stream "Detail the architecture" --rag-files ./docs/arch.md
```

## Advanced: Manual RAG Pipeline

For full control, use the RAG components directly:

### Chunking

```typescript
import { createChunker, MDocument } from "@juspay/neurolink";

// Create chunker
const chunker = createChunker("markdown", {
  maxSize: 512,
  overlap: 50,
});

// Chunk a document
const doc = new MDocument({
  content: documentText,
  type: "text",
});

const chunks = await chunker.chunk(doc);
console.log(`Created ${chunks.length} chunks`);
```

### Vector Store

```typescript
import { InMemoryVectorStore } from "@juspay/neurolink";

// Create vector store
const vectorStore = new InMemoryVectorStore();

// Add chunks with embeddings
for (const chunk of chunks) {
  const embedding = await getEmbedding(chunk.text);
  await vectorStore.add({
    id: chunk.id,
    content: chunk.text,
    embedding,
    metadata: chunk.metadata,
  });
}

// Query
const results = await vectorStore.search(queryEmbedding, { topK: 5 });
```

### Hybrid Search

Combine BM25 (keyword) with vector search:

```typescript
import {
  createHybridSearch,
  InMemoryBM25Index,
  reciprocalRankFusion,
} from "@juspay/neurolink";

// Build BM25 index
const bm25Index = new InMemoryBM25Index();
await bm25Index.addDocuments(chunks.map((c) => c.text));

// Create hybrid search
const hybridSearch = createHybridSearch({
  bm25Index,
  vectorStore,
  fusionMethod: "rrf", // or 'linear'
  bm25Weight: 0.3,
  vectorWeight: 0.7,
});

// Search
const results = await hybridSearch.search(query, { topK: 20 });
```

### Reranking

Improve relevance with rerankers:

```typescript
import { createReranker } from "@juspay/neurolink";

// Simple reranker (no LLM)
const reranker = createReranker("simple", {
  weights: {
    keywordMatch: 0.4,
    positionBoost: 0.3,
    lengthPenalty: 0.3,
  },
});

// LLM reranker
const llmReranker = createReranker("llm", {
  model: "gpt-4o-mini",
  batchSize: 10,
});

// Rerank results
const reranked = await reranker.rerank(query, searchResults, { topK: 5 });
```

### Complete Pipeline

```typescript
import {
  createChunker,
  createHybridSearch,
  createReranker,
  InMemoryBM25Index,
  InMemoryVectorStore,
  MDocument,
  loadDocument,
} from "@juspay/neurolink";

// Helper: generate embedding using your preferred provider
async function getEmbedding(text: string): Promise<number[]> {
  const embeddingResult = await neurolink.embed({ input: { text } });
  return embeddingResult.embedding;
}

async function ragPipeline(filePaths: string[], query: string) {
  // 1. Load and chunk documents
  const chunker = createChunker("markdown", { maxSize: 512 });
  const allChunks = [];

  for (const path of filePaths) {
    const doc = await loadDocument(path);
    const chunks = await chunker.chunk(doc);
    allChunks.push(...chunks);
  }

  // 2. Build indices
  const bm25Index = new InMemoryBM25Index();
  const vectorStore = new InMemoryVectorStore();

  for (const chunk of allChunks) {
    await bm25Index.addDocument(chunk.text);
    const embedding = await getEmbedding(chunk.text);
    await vectorStore.add({
      id: chunk.id,
      content: chunk.text,
      embedding,
      metadata: chunk.metadata,
    });
  }

  // 3. Hybrid search
  const hybridSearch = createHybridSearch({
    bm25Index,
    vectorStore,
    fusionMethod: "rrf",
  });

  const queryEmbedding = await getEmbedding(query);
  const results = await hybridSearch.search(query, { topK: 20 });

  // 4. Rerank
  const reranker = createReranker("simple");
  const reranked = await reranker.rerank(query, results, { topK: 5 });

  // 5. Generate with context
  const context = reranked.map((r) => r.content).join("\n\n");

  const response = await neurolink.generate({
    prompt: `Context:\n${context}\n\nQuestion: ${query}`,
    systemPrompt: "Answer based only on the provided context.",
  });

  return response.content;
}
```

## Vector Query Tool

Create a reusable RAG tool:

```typescript
import { createVectorQueryTool } from "@juspay/neurolink";

const ragTool = createVectorQueryTool(
  {
    id: "search_knowledge_base",
    description: "Search internal documentation",
    indexName: "docs",
    embeddingModel: { provider: "openai", modelName: "text-embedding-3-small" },
    topK: 5,
  },
  vectorStore,
);

// Use in generation
const result = await neurolink.generate({
  input: { text: "How do I configure authentication?" },
  tools: { [ragTool.name]: ragTool },
});
```

## Supported Vector Stores

NeuroLink supports multiple vector store adapters, including:

| Store                 | Type              | Use Case                |
| --------------------- | ----------------- | ----------------------- |
| `InMemoryVectorStore` | In-memory         | Development, testing    |
| Pinecone              | Cloud             | Production, serverless  |
| Qdrant                | Self-hosted/Cloud | High performance        |
| pgvector              | PostgreSQL        | Existing Postgres infra |
| Chroma                | Local/Cloud       | Easy setup              |
| Weaviate              | Cloud             | Semantic search         |
| Milvus/Zilliz         | Cloud             | Large scale             |
| Redis                 | In-memory         | Fast retrieval          |
| Elasticsearch         | Distributed       | Hybrid search           |
| MongoDB Atlas         | Cloud             | Existing MongoDB        |

```typescript
// Example: Pinecone
import { PineconeVectorStore } from "@juspay/neurolink";

const vectorStore = new PineconeVectorStore({
  apiKey: process.env.PINECONE_API_KEY,
  indexName: "my-index",
  namespace: "docs",
});
```

## Embedding Providers

When `embeddingProvider` is not specified, NeuroLink uses your generation provider.

```typescript
// Explicit embedding configuration
const result = await neurolink.generate({
  prompt: "Question",
  rag: {
    files: ["./docs/guide.md"],
    embeddingProvider: "openai",
    embeddingModel: "text-embedding-3-large",
  },
});
```

**Available embedding models:**

- OpenAI: `text-embedding-3-small`, `text-embedding-3-large`
- Vertex: `textembedding-gecko`, `text-embedding-004`
- Cohere: `embed-english-v3.0`
- Hugging Face: Various models

## Best Practices

1. **Choose appropriate chunk size**: 256-512 for precise retrieval, 1000+ for context
2. **Use strategy matching content**: `markdown` for docs, `semantic` for articles
3. **Set adequate overlap**: 10-20% of chunk size
4. **Tune topK**: Start with 5, increase if missing context
5. **Use hybrid search**: Combines keyword + semantic for better results
6. **Consider reranking**: Improves relevance for final results

## Next Steps

- Memory - Conversation history
- Tools - MCP integration
- Advanced features - Workflows
