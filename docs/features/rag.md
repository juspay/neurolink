---
title: RAG Document Processing Guide
description: Comprehensive guide for Retrieval-Augmented Generation (RAG) with document chunking, hybrid search, and reranking capabilities
keywords:
  [
    rag,
    chunking,
    embeddings,
    vector-search,
    hybrid-search,
    reranking,
    document-processing,
  ]
---

# RAG Document Processing Guide

> **Since**: v8.44.0 | **Status**: Stable | **Availability**: SDK + CLI

> **Provider Defaults:** When `--provider` (CLI) or `provider` (SDK) is not specified, NeuroLink defaults to **Vertex AI** with **gemini-2.5-flash**. Set the `NEUROLINK_PROVIDER` or `AI_PROVIDER` environment variable to change the default provider.

## Overview

NeuroLink provides enterprise-grade RAG (Retrieval-Augmented Generation) capabilities for building production AI applications:

- **10 Chunking Strategies**: Character, recursive, sentence, token, markdown, HTML, JSON, LaTeX, semantic, and semantic-markdown chunking for any content type
- **Hybrid Search**: Combine BM25 keyword search with vector embeddings using RRF or linear fusion
- **Multi-Factor Reranking**: LLM, cross-encoder, Cohere API, and simple position-based reranking options
- **Factory + Registry Patterns**: Extensible architecture with lazy loading, aliases, and full TypeScript support
- **Resilience Built-In**: Circuit breakers, retry handlers, and comprehensive error handling

## Quick Start

### Basic Document Processing

```typescript
import { loadDocument, createChunker, createReranker } from "@juspay/neurolink";

// Load and chunk a document
const doc = await loadDocument("/path/to/document.md");
const chunker = await createChunker("markdown", {
  maxSize: 1000,
  overlap: 100,
});
const chunks = await chunker.chunk(doc.content);

// Each chunk includes metadata
console.log(chunks[0]);
// {
//   id: "chunk-abc123",
//   text: "## Introduction\n\nThis document covers...",
//   metadata: {
//     documentId: "doc-xyz",
//     chunkIndex: 0,
//     startOffset: 0,
//     endOffset: 847
//   }
// }
```

### Full RAG Pipeline

```typescript
import { RAGPipeline, createRAGPipeline } from "@juspay/neurolink";

const pipeline = new RAGPipeline({
  embeddingModel: { provider: "vertex", modelName: "gemini-2.5-flash" },
  generationModel: { provider: "vertex", modelName: "gemini-2.5-flash" },
});

// Ingest documents
await pipeline.ingest(["./docs/*.md", "./knowledge/**/*.txt"]);

// Query with automatic retrieval and generation
const response = await pipeline.query("What are the key features?");
console.log(response.answer);
console.log(response.sources); // Retrieved chunks with citations
```

## Integration with generate() and stream()

The RAG system integrates seamlessly with NeuroLink's `generate()` and `stream()` APIs through the `createVectorQueryTool`. This allows AI models to automatically query your knowledge base during generation.

### Using RAG with generate()

```typescript
import {
  NeuroLink,
  createVectorQueryTool,
  InMemoryVectorStore,
} from "@juspay/neurolink";

// 1. Set up vector store with your data
const vectorStore = new InMemoryVectorStore();
await vectorStore.upsert("knowledge-base", [
  {
    id: "doc1",
    vector: embedding1,
    metadata: { text: "Your document content..." },
  },
  // ... more documents
]);

// 2. Create the RAG tool
const ragTool = createVectorQueryTool(
  {
    id: "knowledge-search",
    description: "Search the knowledge base for relevant information",
    indexName: "knowledge-base",
    embeddingModel: { provider: "vertex", modelName: "gemini-2.5-flash" },
    topK: 5,
    reranker: {
      model: { provider: "vertex", modelName: "gemini-2.5-flash" },
      topK: 3,
    },
  },
  vectorStore,
);

// 3. Use with generate()
const neurolink = new NeuroLink();
const result = await neurolink.generate({
  input: { text: "What are the key features of our product?" },
  tools: [ragTool],
  provider: "vertex",
  model: "gemini-2.5-flash",
});

console.log(result.content);
console.log(result.toolExecutions); // See RAG tool results
```

### Using RAG with stream()

```typescript
// Same setup as above, then:
const stream = await neurolink.stream({
  input: { text: "Explain our pricing model in detail" },
  tools: [ragTool],
  provider: "vertex",
  model: "gemini-2.5-flash",
});

for await (const chunk of stream) {
  if (chunk.type === "text") {
    process.stdout.write(chunk.content);
  } else if (chunk.type === "tool_call") {
    console.log("RAG tool called:", chunk.toolName);
  }
}
```

### Complete RAG Pipeline Example

This example demonstrates a full RAG pipeline from document loading to AI-powered retrieval:

```typescript
import {
  NeuroLink,
  createVectorQueryTool,
  InMemoryVectorStore,
} from "@juspay/neurolink";
import {
  loadDocument,
  createChunker,
  createMetadataExtractor,
} from "@juspay/neurolink";

// Step 1: Load and chunk documents
const doc = await loadDocument("./docs/product-guide.md");
const chunker = await createChunker("markdown", {
  maxSize: 1000,
  overlap: 100,
  preserveHeaders: true,
});
const chunks = await chunker.chunk(doc.content);

// Step 2: Extract metadata for better retrieval (optional)
const extractor = await createMetadataExtractor("llm", {
  provider: "vertex",
  modelName: "gemini-2.5-flash",
});
const enrichedChunks = await extractor.extract(chunks, {
  summary: true,
  keywords: true,
});

// Step 3: Generate embeddings using the NeuroLink provider
const neurolink = new NeuroLink();

// Helper function to generate embeddings
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (const text of texts) {
    const result = await neurolink.generate({
      input: { text },
      provider: "vertex",
      model: "gemini-2.5-flash",
    });
    // Extract embedding from result (provider-specific)
    embeddings.push(result.embedding || []);
  }
  return embeddings;
}

const embeddings = await generateEmbeddings(enrichedChunks.map((c) => c.text));

// Step 4: Store in vector store
const vectorStore = new InMemoryVectorStore();
await vectorStore.upsert(
  "product-docs",
  enrichedChunks.map((chunk, i) => ({
    id: chunk.id,
    vector: embeddings[i],
    metadata: {
      text: chunk.text,
      summary: chunk.metadata.summary,
      keywords: chunk.metadata.keywords,
      source: "product-guide.md",
    },
  })),
);

// Step 5: Create RAG tool
const ragTool = createVectorQueryTool(
  {
    id: "product-search",
    description: "Search product documentation for answers to user questions",
    indexName: "product-docs",
    embeddingModel: { provider: "vertex", modelName: "gemini-2.5-flash" },
    topK: 5,
    includeSources: true,
    reranker: {
      model: { provider: "vertex", modelName: "gemini-2.5-flash" },
      topK: 3,
      weights: { semantic: 0.6, vector: 0.3, position: 0.1 },
    },
  },
  vectorStore,
);

// Step 6: Use with generate()
const response = await neurolink.generate({
  input: { text: "How do I configure the billing settings?" },
  tools: [ragTool],
  provider: "vertex",
  model: "gemini-2.5-flash",
  systemPrompt: `You are a helpful product assistant. Use the knowledge-search tool 
    to find relevant information before answering questions. Always cite your sources.`,
});

console.log("Answer:", response.content);
console.log(
  "Sources used:",
  response.toolExecutions?.map((t) => t.result?.sources),
);
```

### Configuration Options for createVectorQueryTool

| Option            | Type                                      | Default               | Description                                            |
| ----------------- | ----------------------------------------- | --------------------- | ------------------------------------------------------ |
| `id`              | `string`                                  | `vector-query-{uuid}` | Unique identifier for the tool                         |
| `description`     | `string`                                  | Default description   | Description shown to AI for tool selection             |
| `indexName`       | `string`                                  | **Required**          | Name of the index in the vector store                  |
| `embeddingModel`  | `{ provider: string, modelName: string }` | **Required**          | Embedding model configuration                          |
| `enableFilter`    | `boolean`                                 | `false`               | Enable metadata filtering in queries                   |
| `includeVectors`  | `boolean`                                 | `false`               | Include raw vectors in results                         |
| `includeSources`  | `boolean`                                 | `true`                | Include source documents in response                   |
| `topK`            | `number`                                  | `10`                  | Number of results to retrieve                          |
| `reranker`        | `RerankerConfig`                          | `undefined`           | Optional reranker configuration                        |
| `providerOptions` | `VectorProviderOptions`                   | `undefined`           | Provider-specific options (Pinecone, pgVector, Chroma) |

#### Reranker Configuration

| Option    | Type                                                        | Default                                         | Description                       |
| --------- | ----------------------------------------------------------- | ----------------------------------------------- | --------------------------------- |
| `model`   | `{ provider: string, modelName: string }`                   | **Required**                                    | Model for semantic reranking      |
| `weights` | `{ semantic?: number, vector?: number, position?: number }` | `{ semantic: 0.5, vector: 0.3, position: 0.2 }` | Score weights (must sum to 1.0)   |
| `topK`    | `number`                                                    | Same as tool `topK`                             | Results to return after reranking |

### Event Handling

Listen for tool events during RAG operations to monitor and debug:

```typescript
const neurolink = new NeuroLink();

// Listen for tool execution events
neurolink.on("tool:start", (event) => {
  console.log(`Tool started: ${event.toolName}`);
  console.log(`Parameters:`, event.parameters);
});

neurolink.on("tool:end", (event) => {
  console.log(`Tool completed: ${event.toolName}`);
  console.log(`Success: ${event.success}`);
  console.log(`Response time: ${event.responseTime}ms`);
  if (event.result) {
    console.log(`Results found: ${event.result.totalResults}`);
  }
  if (event.error) {
    console.error(`Error:`, event.error.message);
  }
});

// Listen for generation events
neurolink.on("generation:start", (event) => {
  console.log(`Generation started with provider: ${event.provider}`);
});

neurolink.on("generation:end", (event) => {
  console.log(`Generation completed in ${event.responseTime}ms`);
  console.log(`Tools used: ${event.toolsUsed?.join(", ") || "none"}`);
});

// Execute RAG query with event monitoring
const result = await neurolink.generate({
  input: { text: "What are the system requirements?" },
  tools: [ragTool],
  provider: "vertex",
  model: "gemini-2.5-flash",
});
```

### Dynamic Vector Store Resolution

For multi-tenant applications, you can provide a resolver function instead of a static vector store:

```typescript
const ragTool = createVectorQueryTool(
  {
    id: "tenant-search",
    description: "Search tenant-specific knowledge base",
    indexName: "documents",
    embeddingModel: { provider: "vertex", modelName: "gemini-2.5-flash" },
    topK: 5,
  },
  (context) => {
    // Return different vector stores based on request context
    const tenantId = context.tenantId || "default";
    return getVectorStoreForTenant(tenantId);
  },
);

// The context is passed from generate options
const result = await neurolink.generate({
  input: { text: "Search query" },
  tools: [ragTool],
  context: { tenantId: "tenant-123", userId: "user-456" },
});
```

### Metadata Filtering

Enable metadata filtering for more precise retrieval:

```typescript
const ragTool = createVectorQueryTool(
  {
    id: "filtered-search",
    description: "Search with metadata filters",
    indexName: "knowledge-base",
    embeddingModel: { provider: "vertex", modelName: "gemini-2.5-flash" },
    enableFilter: true, // Enable filter parameter
    topK: 10,
  },
  vectorStore,
);

// The AI can now use filters in its queries
// Example filter syntax supported:
// { category: 'billing' }                    - Exact match
// { date: { $gte: '2024-01-01' } }          - Comparison operators
// { tags: { $in: ['feature', 'guide'] } }   - Array membership
// { $and: [{ type: 'doc' }, { status: 'published' }] } - Logical operators
```

## Chunking Strategies

NeuroLink provides 10 chunking strategies optimized for different content types.

### Available Strategies

| Strategy            | Best For                    | Key Config                             |
| ------------------- | --------------------------- | -------------------------------------- |
| `character`         | Simple text, logs           | `maxSize`, `separator`                 |
| `recursive`         | General documents (default) | `maxSize`, `overlap`, `separators`     |
| `sentence`          | Natural language, Q&A       | `maxSize`, `minSentences`              |
| `token`             | LLM context optimization    | `maxSize` (tokens), `tokenizer`        |
| `markdown`          | Documentation, READMEs      | `preserveHeaders`, `codeBlockHandling` |
| `html`              | Web content                 | `preserveTags`, `removeTags`           |
| `json`              | API responses, config       | `preserveStructure`, `flattenDepth`    |
| `latex`             | Academic papers             | `sectionCommands`, `preserveMath`      |
| `semantic`          | Context-aware splitting     | `similarityThreshold`, `embedder`      |
| `semantic-markdown` | Knowledge bases             | `semanticThreshold`, `embedder`        |

### Strategy Configuration

```typescript
import { createChunker, getAvailableStrategies } from "@juspay/neurolink";

// List all available strategies
const strategies = getAvailableStrategies();
// ['character', 'recursive', 'sentence', 'token', 'markdown', 'html', 'json', 'latex', 'semantic', 'semantic-markdown']

// Recursive chunker (recommended for general use)
const recursiveChunker = await createChunker("recursive", {
  maxSize: 1000,
  overlap: 200,
  separators: ["\n\n", "\n", ". ", " ", ""],
  keepSeparator: true,
});

// Markdown chunker (for documentation)
const markdownChunker = await createChunker("markdown", {
  maxSize: 1000,
  overlap: 100,
  preserveHeaders: true,
  codeBlockHandling: "preserve", // 'preserve' | 'split' | 'remove'
});

// Token chunker (for LLM optimization)
const tokenChunker = await createChunker("token", {
  maxSize: 512, // Max tokens per chunk
  overlap: 50, // Token overlap
  tokenizer: "cl100k_base", // OpenAI tokenizer
});
```

### Content-Type Recommendations

```typescript
import { getRecommendedStrategy } from "@juspay/neurolink";

// Get strategy based on content type
getRecommendedStrategy("text/markdown"); // 'markdown'
getRecommendedStrategy("text/html"); // 'html'
getRecommendedStrategy("application/json"); // 'json'
getRecommendedStrategy("text/x-latex"); // 'latex'
getRecommendedStrategy("text/plain"); // 'recursive'
```

## Hybrid Search

Hybrid search combines BM25 keyword matching with vector similarity for improved retrieval quality.

### How It Works

1. **BM25 Search**: Traditional keyword matching using term frequency and document length normalization
2. **Vector Search**: Semantic similarity using embeddings
3. **Score Fusion**: Combine rankings using RRF or linear combination

### Fusion Methods

#### Reciprocal Rank Fusion (RRF)

RRF is robust to score scale differences and works well in most cases:

```typescript
import { reciprocalRankFusion } from "@juspay/neurolink";

// Combine rankings from multiple sources
const fusedScores = reciprocalRankFusion(
  [vectorRankings, bm25Rankings],
  60, // k parameter (default: 60)
);

// RRF formula: score(d) = sum(1 / (k + rank(d)))
```

#### Linear Combination

Linear combination allows fine-tuning the balance between vector and keyword scores:

```typescript
import { linearCombination } from "@juspay/neurolink";

const combinedScores = linearCombination(
  vectorScores, // Map<string, number>
  bm25Scores, // Map<string, number>
  0.5, // alpha: weight for vector scores (0-1)
);

// Linear formula: score(d) = alpha * vectorScore(d) + (1 - alpha) * bm25Score(d)
```

### Hybrid Search Pipeline

```typescript
import {
  createHybridSearch,
  InMemoryBM25Index,
  InMemoryVectorStore,
} from "@juspay/neurolink";

// Create indices
const bm25Index = new InMemoryBM25Index({ k1: 1.2, b: 0.75 });
const vectorStore = new InMemoryVectorStore();

// Add documents to both indices
const documents = [
  {
    id: "doc1",
    text: "Machine learning fundamentals...",
    metadata: { topic: "ml" },
  },
  {
    id: "doc2",
    text: "Deep learning architectures...",
    metadata: { topic: "dl" },
  },
];

await bm25Index.addDocuments(documents);
await vectorStore.addDocuments(documents);

// Create hybrid search
const hybridSearch = createHybridSearch({
  bm25Index,
  vectorStore,
  fusionMethod: "rrf", // 'rrf' | 'linear'
  alpha: 0.5, // Vector weight (for linear fusion)
  k: 60, // RRF parameter
});

// Execute search
const results = await hybridSearch.search("neural network training", {
  topK: 10,
  filter: { topic: "ml" },
});
```

### BM25 Configuration

```typescript
type BM25Config = {
  k1: number; // Term frequency saturation (default: 1.2)
  b: number; // Document length normalization (default: 0.75)
  lowercase: boolean; // Normalize to lowercase (default: true)
  stemming: boolean; // Apply stemming (default: false)
  stopwords: string[]; // Words to ignore (default: English stopwords)
};
```

## Reranking

Reranking re-scores initial search results for improved relevance.

### Available Reranker Types

| Type            | Description                         | Requires Model | Best For                 |
| --------------- | ----------------------------------- | -------------- | ------------------------ |
| `simple`        | Position + vector score combination | No             | Fast, cost-free baseline |
| `llm`           | LLM semantic relevance scoring      | Yes            | High-quality semantic    |
| `cross-encoder` | Cross-encoder model scoring         | Yes            | Accuracy-focused tasks   |
| `cohere`        | Cohere Rerank API                   | API Key        | Production-grade results |
| `batch`         | Batch LLM processing                | Yes            | Large result sets        |

### Reranker Configuration

```typescript
import { createReranker, getAvailableRerankerTypes } from "@juspay/neurolink";

// List available types
const types = getAvailableRerankerTypes();
// ['simple', 'llm', 'cross-encoder', 'cohere', 'batch']

// Simple reranker (no model required)
const simpleReranker = await createReranker("simple", {
  topK: 10,
  positionWeight: 0.3,
  scoreWeight: 0.7,
});

// LLM reranker (requires model)
const llmReranker = await createReranker("llm", {
  topK: 5,
  model: "gemini-2.5-flash",
  temperature: 0.0,
  batchSize: 5,
});

// Cohere reranker (requires API key)
const cohereReranker = await createReranker("cohere", {
  topK: 10,
  model: "rerank-v3.5",
  maxChunksPerDoc: 10,
});

// Rerank results
const reranked = await simpleReranker.rerank(searchResults, query, { topK: 5 });
```

### Batch Reranking for Large Sets

```typescript
import { batchRerank } from "@juspay/neurolink";

// Process large result sets efficiently
const reranked = await batchRerank(searchResults, query, {
  batchSize: 10,
  parallelBatches: 3,
  model: "gemini-2.5-flash",
  topK: 20,
});
```

## Metadata Extraction

Extract structured metadata from chunks using LLMs.

### Extraction Types

| Type        | Description               | Output                    |
| ----------- | ------------------------- | ------------------------- |
| `title`     | Document/section title    | `string`                  |
| `summary`   | Brief content summary     | `string`                  |
| `keywords`  | Relevant keywords         | `string[]`                |
| `questions` | Q&A pairs for the content | `{question, answer}[]`    |
| `custom`    | Custom schema extraction  | `Record<string, unknown>` |

### Usage

```typescript
import {
  createMetadataExtractor,
  extractMetadata,
  LLMMetadataExtractor,
} from "@juspay/neurolink";

// Using factory
const extractor = await createMetadataExtractor("llm", {
  provider: "vertex",
  modelName: "gemini-2.5-flash",
});

// Extract metadata from chunks
const results = await extractor.extract(chunks, {
  title: true,
  summary: true,
  keywords: true,
  questions: { maxQuestions: 3 },
});

// Results include extracted metadata per chunk
console.log(results[0]);
// {
//   title: "Introduction to Machine Learning",
//   summary: "This section covers the fundamentals...",
//   keywords: ["machine learning", "supervised learning", "classification"],
//   questions: [
//     { question: "What is supervised learning?", answer: "..." }
//   ]
// }
```

## Configuration Reference

### Chunker Configuration

| Option       | Type                      | Default   | Description                        |
| ------------ | ------------------------- | --------- | ---------------------------------- |
| `maxSize`    | `number`                  | `1000`    | Maximum chunk size (chars/tokens)  |
| `overlap`    | `number`                  | `200`     | Overlap between chunks             |
| `minSize`    | `number`                  | `50`      | Minimum chunk size                 |
| `documentId` | `string`                  | auto-UUID | Document identifier for metadata   |
| `metadata`   | `Record<string, unknown>` | `{}`      | Additional metadata for all chunks |

### Reranker Configuration

| Option                  | Type      | Default | Description                     |
| ----------------------- | --------- | ------- | ------------------------------- |
| `topK`                  | `number`  | `10`    | Number of top results to return |
| `minScore`              | `number`  | `0.0`   | Minimum score threshold         |
| `includeOriginalScores` | `boolean` | `false` | Include original scores         |

### Hybrid Search Configuration

| Option         | Type                | Default | Description                 |
| -------------- | ------------------- | ------- | --------------------------- |
| `fusionMethod` | `'rrf' \| 'linear'` | `'rrf'` | Score fusion method         |
| `alpha`        | `number`            | `0.5`   | Vector weight (linear only) |
| `k`            | `number`            | `60`    | RRF k parameter             |
| `topK`         | `number`            | `10`    | Results to return           |

### Environment Variables

| Variable            | Description                | Required |
| ------------------- | -------------------------- | -------- |
| `GOOGLE_API_KEY`    | For Vertex AI (default)    | Yes      |
| `OPENAI_API_KEY`    | For OpenAI provider        | Optional |
| `COHERE_API_KEY`    | For Cohere reranker        | Optional |
| `ANTHROPIC_API_KEY` | For Claude-based reranking | Optional |

## Advanced Usage

### Integration with Observability

Track RAG operations with Langfuse for debugging and optimization:

```typescript
import { setLangfuseContext } from "@juspay/neurolink";
import { RAGPipeline } from "@juspay/neurolink";

const pipeline = new RAGPipeline(config);

await setLangfuseContext(
  {
    userId: "user-123",
    sessionId: "session-456",
    operationName: "rag-query",
    metadata: {
      pipeline: "customer-support",
      chunkingStrategy: "markdown",
    },
  },
  async () => {
    const response = await pipeline.query("How do I reset my password?");
    return response;
  },
);
```

### Integration with Guardrails

Validate RAG inputs and outputs with guardrails:

```typescript
import {
  createGuardrail,
  validateInput,
  validateOutput,
} from "@juspay/neurolink";
import { RAGPipeline } from "@juspay/neurolink";

// Create guardrails for RAG
const inputGuardrail = createGuardrail({
  type: "input",
  rules: [
    { type: "maxLength", value: 1000 },
    { type: "noPersonalInfo", enabled: true },
  ],
});

const outputGuardrail = createGuardrail({
  type: "output",
  rules: [
    { type: "factualOnly", enabled: true },
    { type: "noPII", enabled: true },
  ],
});

// Apply guardrails to RAG pipeline
const validatedQuery = await validateInput(inputGuardrail, query);
const response = await pipeline.query(validatedQuery);
const validatedResponse = await validateOutput(
  outputGuardrail,
  response.answer,
);
```

### Custom Chunker Registration

Extend the chunker registry with custom implementations:

```typescript
import { ChunkerRegistry } from "@juspay/neurolink";
import type { Chunker, ChunkerConfig } from "@juspay/neurolink";

// Define custom chunker
class CustomChunker implements Chunker {
  constructor(private config?: ChunkerConfig) {}

  async chunk(text: string, options?: ChunkerConfig) {
    // Custom chunking logic
    const maxSize = options?.maxSize ?? this.config?.maxSize ?? 500;
    // ... implementation
  }
}

// Register with the registry
ChunkerRegistry.register("custom", CustomChunker, {
  name: "Custom Chunker",
  description: "My custom chunking strategy",
  aliases: ["my-chunker"],
  defaultConfig: { maxSize: 500 },
});

// Now use it
const chunker = await createChunker("custom", { maxSize: 800 });
```

### Graph RAG

Use knowledge graphs for relationship-aware retrieval:

```typescript
import { GraphRAG } from "@juspay/neurolink";

// Create graph with similarity threshold for edge creation
const graphRag = new GraphRAG({
  dimension: 1536, // Embedding dimension
  threshold: 0.7, // Similarity threshold for creating edges
});

// Build graph from chunks and their embeddings
const chunks = [
  { text: "Machine learning basics", metadata: { topic: "ml" } },
  { text: "Neural networks", metadata: { topic: "dl" } },
];
const embeddings = [
  { vector: [0.1, 0.2 /* ... */] },
  { vector: [0.15, 0.25 /* ... */] },
];

graphRag.createGraph(chunks, embeddings);

// Or add nodes incrementally
const nodeId = graphRag.addNode(
  { text: "Deep learning", metadata: { topic: "dl" } },
  { vector: [0.12, 0.22 /* ... */] },
);

// Query with embedding vector using random walk with restart
const results = graphRag.query({
  query: queryEmbedding, // Query embedding vector
  topK: 10,
  randomWalkSteps: 100,
  restartProb: 0.15,
});

// Get graph statistics
const stats = graphRag.getStats();
// { nodeCount: 3, edgeCount: 4, avgDegree: 1.33, threshold: 0.7 }
```

### Resilience Patterns

Use circuit breakers and retry handlers for production reliability:

```typescript
import { RAGCircuitBreaker, RAGRetryHandler } from "@juspay/neurolink";

// Circuit breaker for external API calls
const breaker = new RAGCircuitBreaker("reranker-api", {
  failureThreshold: 5,
  resetTimeout: 60000,
  halfOpenMaxCalls: 3,
  operationTimeout: 30000,
});

// Wrap reranker calls
const result = await breaker.execute(async () => {
  return await cohereReranker.rerank(results, query);
}, "rerank");

// Listen to circuit breaker events
breaker.on("stateChange", ({ oldState, newState, reason }) => {
  console.log(`Circuit breaker: ${oldState} -> ${newState} (${reason})`);
});

// Retry handler with exponential backoff
const retryHandler = new RAGRetryHandler({
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
});

const chunks = await retryHandler.executeWithRetry(async () => {
  return await chunker.chunk(largeDocument);
});
```

## CLI Usage

NeuroLink CLI provides commands for RAG operations.

### Document Processing

```bash
# Chunk a document
neurolink rag chunk ./document.md --strategy markdown --max-size 1000 --overlap 100

# Chunk with output to file
neurolink rag chunk ./document.md -s recursive --format json --output chunks.json

# Process multiple documents (use shell loop)
for file in ./docs/*.md; do neurolink rag chunk "$file" --strategy markdown --format json; done
```

### Index Management

```bash
# Build an index from a document
neurolink rag index ./docs/guide.md --indexName my-docs --provider vertex --model gemini-2.5-flash

# Query an existing index
neurolink rag query "What are the main features?" --indexName my-docs --topK 5 --provider vertex --model gemini-2.5-flash

# Index with Graph RAG enabled
neurolink rag index ./docs/guide.md --indexName my-docs --graph --provider vertex --model gemini-2.5-flash
```

## Simplified RAG API (`rag: { files }`)

> **Since**: v9.2.0 | **Recommended** for most use cases

Instead of manually creating chunkers, vector stores, and tools, pass `rag: { files }` directly to `generate()` or `stream()`. NeuroLink handles the entire pipeline automatically.

### SDK Usage

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Generate with RAG - just pass files
const result = await neurolink.generate({
  prompt: "What are the key features described in the docs?",
  rag: {
    files: ["./docs/guide.md", "./docs/api.md"],
    strategy: "markdown", // Optional: auto-detected from file extension
    chunkSize: 512, // Optional: default 1000
    chunkOverlap: 50, // Optional: default 200
    topK: 5, // Optional: default 5
  },
});

// Stream with RAG - identical API
const stream = await neurolink.stream({
  prompt: "Summarize the architecture",
  rag: { files: ["./docs/architecture.md"] },
});

for await (const chunk of stream.stream) {
  process.stdout.write(chunk);
}
```

### CLI Usage

```bash
# Basic RAG with generate
neurolink generate "What is this about?" --rag-files ./docs/guide.md

# RAG with custom chunking strategy
neurolink generate "Explain the API" --rag-files ./docs/guide.md --rag-strategy markdown --rag-chunk-size 512

# RAG with streaming and multiple files
neurolink stream "Summarize everything" --rag-files ./docs/a.md ./docs/b.md --rag-top-k 10
```

### CLI Flags Reference

| Flag                  | Type       | Default       | Description                                                                                                         |
| --------------------- | ---------- | ------------- | ------------------------------------------------------------------------------------------------------------------- |
| `--rag-files`         | `string[]` | -             | File paths to load for RAG context                                                                                  |
| `--rag-strategy`      | `string`   | auto-detected | Chunking strategy (character, recursive, sentence, token, markdown, html, json, latex, semantic, semantic-markdown) |
| `--rag-chunk-size`    | `number`   | 1000          | Maximum chunk size in characters                                                                                    |
| `--rag-chunk-overlap` | `number`   | 200           | Overlap between adjacent chunks                                                                                     |
| `--rag-top-k`         | `number`   | 5             | Number of top results to retrieve                                                                                   |

### RAGConfig Type

```typescript
type RAGConfig = {
  files: string[]; // Required: file paths to load
  strategy?: ChunkingStrategy; // Default: auto-detected from file extension
  chunkSize?: number; // Default: 1000
  chunkOverlap?: number; // Default: 200
  topK?: number; // Default: 5
  toolName?: string; // Default: "search_knowledge_base"
  toolDescription?: string; // Custom tool description
  embeddingProvider?: string; // Defaults to generation provider
  embeddingModel?: string; // Defaults to provider's default
};
```

### How It Works

1. Files are loaded from disk and auto-detected for chunking strategy (`.md` -> markdown, `.html` -> html, `.json` -> json, etc.)
2. Content is chunked using the selected strategy with configurable size and overlap
3. Chunks are embedded using a simple character-frequency hash (128 dimensions) and stored in an in-memory vector store
4. A `search_knowledge_base` tool is created and injected into the AI model's available tools
5. A system prompt instructs the AI to use the search tool before answering
6. The AI autonomously decides when to search the knowledge base during generation/streaming

### Auto-Detected Strategies by Extension

| Extension                                                                                | Strategy  |
| ---------------------------------------------------------------------------------------- | --------- |
| `.md`, `.mdx`                                                                            | markdown  |
| `.html`, `.htm`                                                                          | html      |
| `.json`                                                                                  | json      |
| `.tex`, `.latex`                                                                         | latex     |
| `.txt`, `.csv`, `.xml`, `.yaml`, `.yml`                                                  | recursive |
| `.ts`, `.js`, `.py`, `.java`, `.go`, `.rs`, `.c`, `.cpp`, `.rb`, `.php`, `.swift`, `.kt` | recursive |

## Best Practices

### Chunking

1. **Match chunk size to model context** - Use token chunker when optimizing for specific LLM context windows
2. **Choose strategy by content type** - Markdown for docs, HTML for web content, JSON for structured data
3. **Use 10-20% overlap** - Prevents context loss at chunk boundaries
4. **Preserve structure when possible** - Format-aware chunkers maintain semantic coherence
5. **Test with your data** - Optimal settings vary by domain and use case

### Reranking

1. **Start with simple reranker** - Fast, free, and often sufficient for basic use cases
2. **Use LLM reranking for quality** - When accuracy matters more than latency
3. **Batch large result sets** - Use batch reranker for 50+ results
4. **Consider cost** - API-based rerankers (Cohere) have per-call costs
5. **Cache reranking results** - Results for the same query/docs can be reused

### Hybrid Search

1. **Start with RRF** - Robust to score scale differences, less tuning needed
2. **Tune alpha for linear fusion** - Start at 0.5, adjust based on evaluation
3. **Keep indices in sync** - Update both BM25 and vector indices together
4. **Filter early** - Apply metadata filters before fusion when possible
5. **Monitor retrieval quality** - Track precision/recall metrics in production

## Troubleshooting

| Problem                       | Solution                                                                 |
| ----------------------------- | ------------------------------------------------------------------------ |
| Empty chunks returned         | Check if `maxSize` is too small for your content; try increasing to 500+ |
| Duplicate content in chunks   | Reduce `overlap` parameter or use a structure-aware chunker              |
| Missing context at boundaries | Increase `overlap` to 15-20% of `maxSize`                                |
| Slow reranking performance    | Switch to `simple` reranker or reduce `topK` before reranking            |
| Poor search quality           | Tune BM25 parameters (`k1`, `b`) or adjust fusion `alpha` weight         |
| Out of memory with large docs | Process documents in batches; use streaming where available              |
| Reranker API timeouts         | Use `CircuitBreaker` wrapper; reduce batch size                          |
| Inconsistent chunk metadata   | Ensure `documentId` is set consistently across processing runs           |

### Debug Logging

```bash
# Enable verbose logging for RAG operations
DEBUG=neurolink:rag:* npx tsx your-script.ts

# Log specific components
DEBUG=neurolink:rag:chunker npx tsx your-script.ts
DEBUG=neurolink:rag:reranker npx tsx your-script.ts
DEBUG=neurolink:rag:hybrid npx tsx your-script.ts
```

## API Reference

### Core Exports

**Document Processing:**

- `loadDocument(path)` - Load a single document
- `loadDocuments(paths)` - Load multiple documents
- `MDocument` - Fluent document processing class
- `processDocument(text, options)` - Process text through chunking and metadata extraction

**Chunking:**

- `createChunker(strategy, config)` - Create a chunker instance
- `ChunkerFactory` - Factory for chunker creation
- `ChunkerRegistry` - Registry with all chunker implementations
- `getAvailableStrategies()` - List available chunking strategies
- `getRecommendedStrategy(contentType)` - Get recommended strategy for content type

**Reranking:**

- `createReranker(type, config)` - Create a reranker instance
- `RerankerFactory` - Factory for reranker creation
- `RerankerRegistry` - Registry with all reranker implementations
- `getAvailableRerankerTypes()` - List available reranker types
- `rerank(results, query, model)` - Direct reranking function
- `batchRerank(results, query, options)` - Batch reranking

**Retrieval:**

- `createHybridSearch(config)` - Create hybrid search instance
- `InMemoryBM25Index` - In-memory BM25 index
- `InMemoryVectorStore` - In-memory vector store
- `reciprocalRankFusion(rankings, k)` - RRF score fusion
- `linearCombination(vectorScores, bm25Scores, alpha)` - Linear score fusion
- `createVectorQueryTool(vectorStore, options)` - Create vector query tool

**Metadata:**

- `createMetadataExtractor(type, config)` - Create metadata extractor
- `LLMMetadataExtractor` - LLM-powered extractor class
- `extractMetadata(chunks, params)` - Extract metadata from chunks

**Pipeline:**

- `RAGPipeline` - Full RAG pipeline class
- `createRAGPipeline(config)` - Create pipeline instance
- `assembleContext(chunks, options)` - Assemble context from chunks
- `formatContextWithCitations(chunks, format)` - Format with citations

**Resilience:**

- `RAGCircuitBreaker` - Circuit breaker pattern for RAG operations
- `RAGRetryHandler` - Retry with exponential backoff and jitter

**Types:**

- `Chunk`, `ChunkMetadata`, `ChunkerConfig`
- `Reranker`, `RerankerConfig`, `RerankerType`
- `HybridSearchOptions`, `BM25Config`
- `RAGPipelineConfig`, `RAGResponse`
- `MetadataExtractor`, `MetadataExtractorConfig`

## See Also

- [RAG Configuration Guide](../rag/CONFIGURATION.md) - Detailed configuration reference
- [RAG Testing Guide](../rag/TESTING.md) - Testing RAG pipelines
- [Observability Guide](./observability.md) - Tracing and monitoring
- [Guardrails Guide](./guardrails.md) - Input/output validation
- [Vector Store Integrations](../guides/vector-stores.md) - Production vector stores
