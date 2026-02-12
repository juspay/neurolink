# RAG Processing - Configuration Guide

This document provides comprehensive configuration options for the RAG (Retrieval-Augmented Generation) processing system in NeuroLink.

## Overview

The RAG processing system consists of three main components:

1. **Chunkers** - Split documents into smaller, processable segments
2. **Rerankers** - Re-score and re-order search results for relevance
3. **Hybrid Search** - Combine BM25 and vector search for improved retrieval

---

## Chunker Configuration

### Available Chunking Strategies

| Strategy            | Description                       | Best For                    |
| ------------------- | --------------------------------- | --------------------------- |
| `character`         | Fixed-size character splits       | Simple text, logs           |
| `recursive`         | Paragraph/sentence-aware splits   | General documents           |
| `sentence`          | Sentence boundary splitting       | Natural language text       |
| `token`             | Token-based (GPT tokenizer)       | LLM context optimization    |
| `markdown`          | Header-aware markdown parsing     | Documentation, README files |
| `html`              | HTML tag-aware splitting          | Web content                 |
| `json`              | JSON structure-aware              | API responses, config files |
| `latex`             | LaTeX section-aware               | Academic papers             |
| `semantic-markdown` | Semantic markdown with embeddings | Technical documentation     |

### Common Configuration Options

```typescript
type ChunkerConfig = {
  // Maximum chunk size (characters or tokens)
  maxSize: number; // Default: 1000

  // Overlap between chunks (characters or tokens)
  overlap: number; // Default: 100

  // Minimum chunk size (avoid tiny chunks)
  minSize?: number; // Default: 10

  // Document ID for metadata tracking
  documentId?: string; // Default: auto-generated UUID

  // Additional metadata to attach to chunks
  metadata?: Record<string, unknown>;

  // Whether to preserve metadata from source document
  preserveMetadata?: boolean; // Default: true
};
```

### Strategy-Specific Configuration

#### Character Chunker

```typescript
const config = {
  maxSize: 1000, // Max characters per chunk
  overlap: 100, // Character overlap between chunks
  separator: "", // No separator (split by character count)
};
```

#### Recursive Chunker

```typescript
const config = {
  maxSize: 1000,
  overlap: 100,
  separators: ["\n\n", "\n", ". ", " ", ""], // Priority order
  keepSeparators: true, // Keep separators in output chunks
};
```

#### Sentence Chunker

```typescript
const config = {
  maxSize: 1000, // Max characters per chunk
  overlap: 1, // Overlap in sentences (not characters)
  minSentences: 1, // Minimum sentences per chunk
  maxSentences: 10, // Maximum sentences per chunk
};
```

#### Token Chunker

```typescript
const config = {
  maxSize: 512, // Max tokens per chunk
  overlap: 50, // Token overlap
  tokenizer: "cl100k_base", // OpenAI tokenizer
};
```

#### Markdown Chunker

```typescript
const config = {
  maxSize: 1000,
  overlap: 100,
  preserveHeaders: true, // Include parent headers in chunks
  codeBlockHandling: "preserve", // 'preserve' | 'split' | 'remove'
};
```

#### HTML Chunker

```typescript
const config = {
  maxSize: 1000,
  overlap: 100,
  preserveTags: ["p", "div", "section", "article"],
  removeTags: ["script", "style", "nav", "footer"],
  extractText: true, // Strip HTML tags from output
};
```

#### JSON Chunker

```typescript
const config = {
  maxSize: 500,
  preserveStructure: true, // Keep valid JSON in chunks
  flattenDepth: 2, // Max nesting depth before flattening
  arrayHandling: "split", // 'split' | 'preserve'
};
```

#### LaTeX Chunker

```typescript
const config = {
  maxSize: 1000,
  overlap: 100,
  sectionCommands: ["\\section", "\\subsection", "\\chapter"],
  preserveMath: true, // Keep math environments intact
  includeComments: false, // Strip LaTeX comments
};
```

#### Semantic Markdown Chunker

```typescript
const config = {
  maxSize: 500,
  overlap: 100,
  semanticThreshold: 0.7, // Similarity threshold for merging
  embedder: "openai", // Embedding provider
};
```

### Usage Examples

```typescript
import { createChunker, getAvailableStrategies } from "@juspay/neurolink";

// List available strategies
const strategies = getAvailableStrategies();
console.log(strategies); // ['character', 'recursive', ...]

// Create a chunker with configuration
const chunker = await createChunker("recursive", {
  maxSize: 500,
  overlap: 50,
});

// Chunk a document
const chunks = await chunker.chunk(documentText, {
  maxSize: 500,
  overlap: 50,
});

// Each chunk has structure:
// {
//   id: string,
//   text: string,
//   metadata: {
//     documentId: string,
//     chunkIndex: number,
//     startOffset: number,
//     endOffset: number,
//     ...customMetadata
//   }
// }
```

---

## Reranker Configuration

### Available Reranker Types

| Type            | Description                   | Requires Model | Use Case                |
| --------------- | ----------------------------- | -------------- | ----------------------- |
| `simple`        | Position + vector score combo | No             | Fast, no-cost reranking |
| `llm`           | LLM semantic scoring          | Yes            | High-quality semantic   |
| `cross-encoder` | Cross-encoder model           | Yes            | Accuracy-focused        |
| `cohere`        | Cohere Rerank API             | Yes (API key)  | Production-grade        |
| `batch`         | Batch LLM reranking           | Yes            | Large result sets       |

### Common Configuration Options

```typescript
type RerankerConfig = {
  // Number of top results to return
  topK: number; // Default: 10

  // Minimum score threshold
  minScore?: number; // Default: 0.0

  // Include original scores in output
  includeOriginalScores?: boolean; // Default: false
};
```

### Type-Specific Configuration

#### Simple Reranker

```typescript
const config = {
  topK: 10,
  positionWeight: 0.3, // Weight for position in results
  scoreWeight: 0.7, // Weight for original vector score
};
```

#### LLM Reranker

```typescript
const config = {
  topK: 5,
  model: "gpt-4",
  temperature: 0.0,
  prompt: "Rate relevance of this passage to the query (0-1):",
  batchSize: 5, // Process in batches
};
```

#### Cross-Encoder Reranker

```typescript
const config = {
  topK: 10,
  model: "cross-encoder/ms-marco-MiniLM-L-12-v2",
  normalize: true, // Normalize scores to 0-1
};
```

#### Cohere Reranker

```typescript
const config = {
  topK: 10,
  model: "rerank-english-v2.0",
  maxChunksPerDoc: 10,
  returnDocuments: false,
};
```

#### Batch Reranker

```typescript
const config = {
  topK: 20,
  batchSize: 10, // Documents per LLM call
  parallelBatches: 3, // Concurrent batches
  model: "gpt-3.5-turbo",
};
```

### Usage Examples

```typescript
import { createReranker, getAvailableRerankerTypes } from "@juspay/neurolink";

// List available types
const types = getAvailableRerankerTypes();
console.log(types); // ['simple', 'llm', 'cross-encoder', 'cohere', 'batch']

// Create a simple reranker (no model required)
const reranker = await createReranker("simple", { topK: 5 });

// Rerank search results
const reranked = await reranker.rerank(searchResults, query, { topK: 5 });

// Each result has structure:
// {
//   id: string,
//   text: string,
//   score: number,
//   originalScore?: number,
//   metadata?: Record<string, unknown>
// }
```

---

## Hybrid Search Configuration

### BM25 Index Configuration

```typescript
type BM25Config = {
  // BM25 parameters
  k1: number; // Default: 1.2 (term frequency saturation)
  b: number; // Default: 0.75 (document length normalization)

  // Preprocessing
  lowercase: boolean; // Default: true
  stemming: boolean; // Default: false
  stopwords: string[]; // Default: English stopwords
};
```

### Fusion Methods

#### Reciprocal Rank Fusion (RRF)

```typescript
import { reciprocalRankFusion } from "@juspay/neurolink";

const fusedScores = reciprocalRankFusion(
  [vectorRankings, bm25Rankings],
  60, // k parameter (default: 60)
);
```

#### Linear Combination

```typescript
import { linearCombination } from "@juspay/neurolink";

const combinedScores = linearCombination(
  vectorScores, // Map<string, number>
  bm25Scores, // Map<string, number>
  0.5, // alpha: weight for vector scores (0-1)
);
```

### Hybrid Search Pipeline

```typescript
import { createHybridSearch, InMemoryBM25Index } from "@juspay/neurolink";

// Create BM25 index
const bm25Index = new InMemoryBM25Index({ k1: 1.2, b: 0.75 });

// Add documents
await bm25Index.addDocuments([
  { id: "doc1", text: "Document content...", metadata: {} },
  // ...
]);

// Create hybrid search
const hybridSearch = createHybridSearch({
  bm25Index,
  vectorStore, // Your vector store instance
  fusionMethod: "rrf", // 'rrf' | 'linear'
  alpha: 0.5, // Vector weight (for linear fusion)
  k: 60, // RRF parameter
});

// Execute hybrid search
const results = await hybridSearch.search(query, {
  topK: 10,
  filter: { category: "technical" },
});
```

---

## Resilience Configuration

The RAG system includes resilience patterns to handle failures gracefully.

### Circuit Breaker Configuration

Circuit breakers prevent cascading failures by stopping operations when error rates are too high.

```typescript
type RAGCircuitBreakerConfig = {
  // Number of failures before opening circuit
  failureThreshold: number; // Default: 5

  // Time in ms before attempting reset
  resetTimeout: number; // Default: 60000 (1 minute)

  // Max calls allowed in half-open state
  halfOpenMaxCalls: number; // Default: 3

  // Operation timeout in ms
  operationTimeout: number; // Default: 30000 (30 seconds)

  // Minimum calls before calculating failure rate
  minimumCallsBeforeCalculation: number; // Default: 10

  // Time window for statistics in ms
  statisticsWindowSize: number; // Default: 300000 (5 minutes)
};
```

#### Circuit Breaker Usage

```typescript
import {
  getCircuitBreaker,
  executeWithCircuitBreaker,
} from "@juspay/neurolink";

// Create a circuit breaker for vector queries
const breaker = getCircuitBreaker("vector-queries", {
  failureThreshold: 3,
  resetTimeout: 30000,
});

// Execute operation with circuit breaker protection
const result = await breaker.execute(async () => {
  return await vectorStore.query(embedding, { topK: 10 });
}, "vector-query");

// Or use the convenience function
const result = await executeWithCircuitBreaker(
  "embedding-service",
  () => embeddingProvider.embed(text),
  "embedding",
  { failureThreshold: 5 },
);

// Get circuit breaker statistics
const stats = breaker.getStats();
// {
//   state: 'closed' | 'open' | 'half-open',
//   totalCalls: number,
//   failureRate: number,
//   averageLatency: number,
//   p95Latency: number,
//   ...
// }
```

### Retry Handler Configuration

Retry handlers provide automatic retries with exponential backoff for transient failures.

```typescript
type RAGRetryConfig = {
  // Maximum number of retry attempts
  maxRetries: number; // Default: 3

  // Initial delay in ms
  initialDelay: number; // Default: 1000

  // Maximum delay in ms
  maxDelay: number; // Default: 30000

  // Backoff multiplier
  backoffMultiplier: number; // Default: 2

  // Whether to add jitter
  jitter: boolean; // Default: true

  // Retryable HTTP status codes
  retryableStatusCodes?: number[]; // Default: [408, 429, 500, 502, 503, 504]
};
```

#### Retry Handler Usage

```typescript
import {
  withRAGRetry,
  RAGRetryHandler,
  embeddingRetryHandler,
  vectorStoreRetryHandler,
} from "@juspay/neurolink";

// Simple retry wrapper
const result = await withRAGRetry(() => embeddingProvider.embed(text), {
  maxRetries: 5,
  initialDelay: 2000,
});

// Use specialized retry handlers
const embedding = await embeddingRetryHandler.executeWithRetry(() =>
  embeddingProvider.embed(text),
);

const queryResult = await vectorStoreRetryHandler.executeWithRetry(() =>
  vectorStore.query(embedding),
);

// Batch operations with retry
const handler = new RAGRetryHandler({ maxRetries: 3 });
const results = await handler.executeBatch(
  documents,
  async (doc, index) => await processDocument(doc),
  { concurrency: 5, continueOnError: true },
);
// Returns: { successful: [...], failed: [...], successRate: number }
```

#### Specialized Retry Handlers

| Handler                          | maxRetries | initialDelay | Use Case                      |
| -------------------------------- | ---------- | ------------ | ----------------------------- |
| `embeddingRetryHandler`          | 5          | 2000ms       | Embedding API rate limits     |
| `vectorStoreRetryHandler`        | 3          | 1000ms       | Vector store operations       |
| `metadataExtractionRetryHandler` | 3          | 1500ms       | LLM-based metadata extraction |

---

## Metadata Extraction Configuration

The RAG system supports extracting metadata from document chunks using LLMs.

### Extractor Types

| Type        | Description                       | Output                    |
| ----------- | --------------------------------- | ------------------------- |
| `title`     | Extract document title            | `string`                  |
| `summary`   | Generate chunk summary            | `string`                  |
| `keywords`  | Extract relevant keywords         | `string[]`                |
| `questions` | Generate Q&A pairs for retrieval  | `{question, answer}[]`    |
| `custom`    | Custom schema extraction with Zod | `Record<string, unknown>` |

### Base Extractor Configuration

```typescript
type BaseExtractorConfig = {
  // Language model to use
  modelName?: string; // e.g., "gpt-4", "claude-3-sonnet"

  // Provider for the model
  provider?: string; // e.g., "openai", "anthropic"

  // Custom prompt template
  promptTemplate?: string;

  // Maximum tokens for LLM response
  maxTokens?: number;

  // Temperature for LLM generation
  temperature?: number;
};
```

### Title Extractor

```typescript
const titleConfig = {
  modelName: "gpt-4",
  nodes: 5, // Number of nodes to analyze
  nodeTemplate: "Extract the main topic from: {text}",
  combineTemplate: "Combine these topics into a title: {topics}",
};
```

### Summary Extractor

```typescript
const summaryConfig = {
  modelName: "gpt-3.5-turbo",
  summaryTypes: ["current", "previous", "next"], // Context-aware summaries
  maxWords: 100, // Maximum summary length
};
```

### Keyword Extractor

```typescript
const keywordConfig = {
  modelName: "gpt-3.5-turbo",
  maxKeywords: 10, // Maximum keywords to extract
  minRelevance: 0.5, // Minimum relevance score (0-1)
};
```

### Question-Answer Extractor

```typescript
const questionConfig = {
  modelName: "gpt-4",
  numQuestions: 5, // Number of Q&A pairs
  includeAnswers: true, // Include answers in output
  embeddingOnly: false, // Generate full questions vs embedding-optimized
};
```

### Usage Example

```typescript
import { MDocument } from "@juspay/neurolink";

const doc = new MDocument(content, { type: "markdown" });

// Chunk with metadata extraction
const chunks = await doc.chunk({
  strategy: "recursive",
  config: { maxSize: 1000, overlap: 100 },
  extract: {
    title: true,
    summary: { maxWords: 50 },
    keywords: { maxKeywords: 5 },
    questions: { numQuestions: 3 },
  },
});

// Each chunk now includes extracted metadata:
// {
//   id: string,
//   text: string,
//   metadata: {
//     title: "Extracted Title",
//     summary: "Brief summary...",
//     keywords: ["keyword1", "keyword2"],
//     ...
//   }
// }
```

---

## Pipeline Configuration

### Full RAG Pipeline

```typescript
import {
  createChunker,
  createReranker,
  createHybridSearch,
} from "@juspay/neurolink";

// 1. Configure chunker
const chunker = await createChunker("recursive", {
  maxSize: 500,
  overlap: 50,
});

// 2. Configure reranker
const reranker = await createReranker("simple", {
  topK: 5,
});

// 3. Configure hybrid search
const hybridSearch = createHybridSearch({
  bm25Index,
  vectorStore,
  fusionMethod: "rrf",
});

// 4. Process documents
const chunks = await chunker.chunk(document);

// 5. Index chunks (implementation depends on your vector store)
await vectorStore.addDocuments(chunks);
await bm25Index.addDocuments(chunks);

// 6. Search and rerank
const searchResults = await hybridSearch.search(query, { topK: 20 });
const finalResults = await reranker.rerank(searchResults, query, { topK: 5 });
```

---

## Environment Variables

| Variable            | Description                | Required |
| ------------------- | -------------------------- | -------- |
| `OPENAI_API_KEY`    | For LLM/semantic reranking | Optional |
| `COHERE_API_KEY`    | For Cohere reranker        | Optional |
| `ANTHROPIC_API_KEY` | For Claude-based reranking | Optional |

---

## Best Practices

### Chunking

1. **Match chunk size to context window** - Use token chunker for LLMs
2. **Choose strategy by content type** - Markdown for docs, HTML for web
3. **Use overlap for continuity** - 10-20% overlap prevents context loss
4. **Preserve structure** - Use format-aware chunkers when possible

### Reranking

1. **Start simple** - Simple reranker is fast and often sufficient
2. **Use LLM reranking for quality** - When accuracy matters more than speed
3. **Batch for efficiency** - Use batch reranker for large result sets
4. **Consider cost** - API-based rerankers have per-call costs

### Hybrid Search

1. **Balance weights** - Start with 0.5 alpha and tune based on results
2. **RRF is robust** - Less sensitive to score scale differences
3. **Index incrementally** - Update both BM25 and vector indices together
4. **Filter early** - Apply metadata filters before fusion when possible

---

## Troubleshooting

### Common Issues

1. **Empty chunks** - Check if maxSize is too small for content
2. **Overlapping content** - Reduce overlap parameter
3. **Missing context** - Increase chunk size or overlap
4. **Slow reranking** - Use simple reranker or reduce topK
5. **Poor search quality** - Tune BM25 parameters (k1, b)

### Debug Logging

```bash
# Enable verbose logging
DEBUG=neurolink:rag:* npx tsx your-script.ts
```

---

## API Reference

For complete API documentation, see the TypeScript definitions in:

- `src/lib/rag/types.ts` - Core type definitions
- `src/lib/rag/ChunkerFactory.ts` - Chunker factory API
- `src/lib/rag/reranker/RerankerFactory.ts` - Reranker factory API
- `src/lib/rag/retrieval/hybridSearch.ts` - Hybrid search API

## See Also

- [RAG Feature Guide](../features/rag.md) - Main RAG documentation with quick start and overview
- [RAG Testing Guide](./testing) - How to run RAG tests
- [RAG API Reference](../sdk/api-reference) - API documentation
