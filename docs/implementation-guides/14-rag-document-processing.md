# RAG Document Processing - Implementation Guide

> **User Documentation**: For user-facing documentation, see the [RAG Feature Guide](../features/rag.md).

## Status: 100% Complete

**Last Updated:** January 31, 2026

## Overview

The RAG (Retrieval-Augmented Generation) Document Processing feature provides comprehensive capabilities for processing, chunking, embedding, and retrieving documents for AI-powered applications. This implementation follows NeuroLink's Factory + Registry patterns for consistency and extensibility.

## Components

### 1. Document Loading (`/src/lib/rag/document/`)

- **MDocument**: Fluent document processing class
- **Loaders**: TextLoader, MarkdownLoader, HTMLLoader, JSONLoader, CSVLoader, PDFLoader, WebLoader
- **Functions**: `loadDocument()`, `loadDocuments()`

### 2. Chunking Strategies (`/src/lib/rag/chunkers/` & `/src/lib/rag/chunking/`)

10 chunking strategies available:

| Strategy            | Description                         | Use Cases                   |
| ------------------- | ----------------------------------- | --------------------------- |
| `character`         | Fixed-size character chunks         | Simple text processing      |
| `recursive`         | Ordered separator-based splitting   | General documents (default) |
| `sentence`          | Sentence boundary splitting         | Q&A applications            |
| `token`             | Token-aware splitting               | Model-specific optimization |
| `markdown`          | Header-based markdown splitting     | Documentation               |
| `html`              | Semantic tag-based HTML splitting   | Web content                 |
| `json`              | Object boundary JSON splitting      | Structured data             |
| `latex`             | Section/environment LaTeX splitting | Academic papers             |
| `semantic`          | Semantic similarity-based chunking  | Context-aware splitting     |
| `semantic-markdown` | Semantic similarity + markdown      | Knowledge bases             |

**Factory & Registry Pattern:**

```typescript
import {
  ChunkerFactory,
  ChunkerRegistry,
  createChunker,
} from "@juspay/neurolink";

// Using factory
const chunker = await ChunkerFactory.getInstance().createChunker("markdown", {
  maxSize: 1000,
});

// Using convenience function
const chunker = await createChunker("recursive", { overlap: 100 });

// Using registry
const chunker = await ChunkerRegistry.getInstance().getChunker("semantic-md");
```

### 3. Metadata Extraction (`/src/lib/rag/metadata/`)

**NEW: MetadataExtractorFactory & MetadataExtractorRegistry**

LLM-powered metadata extraction supporting:

- Title extraction
- Summary generation
- Keyword extraction
- Q&A pair generation
- Custom schema extraction

**Extractor Types:**

| Type        | Description                 | Extraction Types |
| ----------- | --------------------------- | ---------------- |
| `llm`       | Full LLM-powered extraction | All types        |
| `title`     | Title-only extraction       | title            |
| `summary`   | Summary-only extraction     | summary          |
| `keywords`  | Keyword-only extraction     | keywords         |
| `questions` | Q&A generation              | questions        |
| `custom`    | Custom schema extraction    | custom           |
| `composite` | Multi-type extraction       | All types        |

**Usage:**

```typescript
import {
  MetadataExtractorFactory,
  createMetadataExtractor,
  metadataExtractorRegistry,
} from "@juspay/neurolink";

// Using factory
const extractor = await MetadataExtractorFactory.getInstance().createExtractor(
  "title",
  {
    provider: "openai",
    modelName: "gpt-4o-mini",
  },
);

// Using convenience function
const extractor = await createMetadataExtractor("keywords");

// Extract metadata
const results = await extractor.extract(chunks, { keywords: true });
```

### 4. Reranking (`/src/lib/rag/reranker/`)

**NEW: RerankerFactory & RerankerRegistry**

Multi-factor scoring system for reranking retrieval results.

**Reranker Types:**

| Type            | Description                     | Requires Model    |
| --------------- | ------------------------------- | ----------------- |
| `llm`           | LLM-powered semantic reranking  | Yes               |
| `cross-encoder` | Cross-encoder relevance scoring | Yes               |
| `cohere`        | Cohere Rerank API               | No (external API) |
| `simple`        | Position + vector score only    | No                |
| `batch`         | Batch LLM reranking             | Yes               |

**Usage:**

```typescript
import {
  RerankerFactory,
  createReranker,
  rerankerFactory,
} from "@juspay/neurolink";

// Set model provider for LLM-based rerankers
rerankerFactory.setModelProvider(aiProvider);

// Create reranker
const reranker = await createReranker("llm", { topK: 5 });

// Rerank results
const reranked = await reranker.rerank(vectorResults, query);
```

### 5. Retrieval (`/src/lib/rag/retrieval/`)

- **Vector Query Tool**: `createVectorQueryTool()` with metadata filtering
- **Hybrid Search**: `createHybridSearch()` combining BM25 + vector
- **In-Memory Stores**: `InMemoryVectorStore`, `InMemoryBM25Index`
- **Fusion Methods**: `reciprocalRankFusion()`, `linearCombination()`

### 6. Graph RAG (`/src/lib/rag/graphRag/`)

Knowledge graph-based retrieval using:

- Node and edge graph structure
- Random walk algorithms
- Semantic similarity thresholds

### 7. RAG Pipeline (`/src/lib/rag/pipeline/`)

Full pipeline orchestration:

```typescript
import { RAGPipeline, createRAGPipeline } from "@juspay/neurolink";

const pipeline = new RAGPipeline({
  embeddingModel: { provider: "openai", modelName: "text-embedding-3-small" },
  generationModel: { provider: "openai", modelName: "gpt-4o-mini" },
});

await pipeline.ingest(["./docs/*.md"]);
const response = await pipeline.query("What are the key features?");
```

### 8. Resilience (`/src/lib/rag/resilience/`)

- **CircuitBreaker**: Fault tolerance pattern
- **RetryHandler**: Configurable retry with backoff

### 9. Error Handling (`/src/lib/rag/errors/`)

Typed errors for all RAG operations:

- `ChunkingError`
- `MetadataExtractionError`
- `EmbeddingError`
- `VectorQueryError`
- `RerankerError`
- `GraphRAGError`
- `PipelineError`
- `RAGCircuitBreakerError`

## Factory + Registry Patterns

All major components follow NeuroLink's Factory + Registry patterns:

| Component           | Factory                    | Registry                    |
| ------------------- | -------------------------- | --------------------------- |
| Chunkers            | `ChunkerFactory`           | `ChunkerRegistry`           |
| Rerankers           | `RerankerFactory`          | `RerankerRegistry`          |
| Metadata Extractors | `MetadataExtractorFactory` | `MetadataExtractorRegistry` |

### Pattern Benefits

1. **Lazy Loading**: Dynamic imports prevent circular dependencies
2. **Singleton Management**: Consistent lifecycle across the SDK
3. **Alias Support**: Multiple names for same component (e.g., 'md' → 'markdown')
4. **Metadata Discovery**: Rich metadata for tooling and documentation
5. **Type Safety**: Full TypeScript support with exported types

## API Reference

### Convenience Functions

```typescript
// Chunkers
import {
  createChunker,
  getAvailableStrategies,
  getChunkerMetadata,
} from "@juspay/neurolink";

// Rerankers
import {
  createReranker,
  getAvailableRerankerTypes,
  getRerankerMetadata,
} from "@juspay/neurolink";

// Metadata Extractors
import {
  createMetadataExtractor,
  getAvailableExtractorTypes,
  getExtractorMetadata,
} from "@juspay/neurolink";

// Document Processing
import { processDocument, getRecommendedStrategy } from "@juspay/neurolink";
```

### Type Exports

```typescript
import type {
  // Chunking
  Chunk,
  ChunkMetadata,
  ChunkerConfig,
  ChunkingStrategy,

  // Metadata
  ExtractParams,
  ExtractionResult,
  MetadataExtractor,
  MetadataExtractorType,
  MetadataExtractorConfig,

  // Reranking
  Reranker,
  RerankerType,
  RerankerConfig,
  RerankResult,
  RerankerOptions,

  // Retrieval
  VectorQueryResult,
  MetadataFilter,
  HybridSearchConfig,

  // Graph RAG
  GraphNode,
  GraphEdge,
  GraphQueryParams,

  // Pipeline
  RAGPipelineConfig,
  RAGResponse,
} from "@juspay/neurolink";
```

## Implementation Notes

### Dynamic Imports

All factory registrations use dynamic imports to avoid circular dependencies:

```typescript
this.registerChunker(
  "markdown",
  async (config?: ChunkerConfig) => {
    const { MarkdownChunker } = await import("./chunkers/MarkdownChunker.js");
    return new MarkdownChunker(config);
  },
  metadata,
);
```

### Error Handling

Use the specialized error classes for proper error identification:

```typescript
import {
  isRAGError,
  isRetryableRAGError,
  isPartialFailure,
} from "@juspay/neurolink";

try {
  await pipeline.ingest(files);
} catch (error) {
  if (isPartialFailure(error)) {
    console.log(
      `Processed ${error.successfulChunks} of ${error.successfulChunks + error.failedChunks}`,
    );
  }
}
```

## Migration from Previous Versions

If upgrading from a version without Factory/Registry patterns:

```typescript
// Old way
import { rerank } from "@juspay/neurolink";
const result = await rerank(results, query, model);

// New way (with factory)
import { createReranker, rerankerFactory } from "@juspay/neurolink";
rerankerFactory.setModelProvider(model);
const reranker = await createReranker("llm");
const result = await reranker.rerank(results, query);

// Direct function still works for backwards compatibility
import { rerank } from "@juspay/neurolink";
const result = await rerank(results, query, model);
```

## RAG Integration with generate()/stream() (v9.2.0)

### Simplified API

The `rag: { files }` option on `generate()` and `stream()` provides automatic RAG pipeline setup:

```typescript
const result = await neurolink.generate({
  prompt: "What is this about?",
  rag: { files: ["./docs/guide.md"], strategy: "markdown", topK: 5 },
});
```

**Implementation:** `src/lib/rag/ragIntegration.ts` exports `prepareRAGTool()` which:

1. Loads files from disk
2. Auto-detects chunking strategy from file extension
3. Chunks content using ChunkerRegistry
4. Generates embeddings (character-frequency hash, 128 dimensions)
5. Stores in InMemoryVectorStore
6. Returns a Vercel AI SDK `Tool` with Zod parameters

**Injection points in `src/lib/neurolink.ts`:**

- `generate()` method (~line 1942): Dynamic import of ragIntegration, tool injection, system prompt append
- `stream()` method (~line 3037): Identical pattern

### Streaming Tool Architecture (v9.2.0)

`BaseProvider.stream()` now centrally pre-merges base tools (MCP/built-in) with user-provided tools (including RAG) into `options.tools` before calling provider-specific `executeStream()`.

**Provider fixes:** All 10 providers updated to use `options.tools || await this.getAllTools()` pattern:

- `openRouter.ts`, `amazonBedrock.ts`, `ollama.ts`, `huggingFace.ts` - explicit fix
- `openAI.ts`, `anthropic.ts`, `mistral.ts`, `litellm.ts` - simplified to use pre-merged tools
- `googleVertex.ts`, `googleAiStudio.ts` - already fixed

### vectorQueryTool Zod Migration (v9.2.0)

`createVectorQueryTool()` now returns Zod schemas for `parameters` instead of raw JSON Schema objects. This ensures compatibility with Vercel AI SDK's `generateText`/`streamText` which require Zod schemas for tool parameter definitions.

### CLI Flags (v9.2.0)

Five new flags on `generate`, `stream`, `batch` commands:

- `--rag-files` (string[]) - File paths to load
- `--rag-strategy` (string) - Chunking strategy
- `--rag-chunk-size` (number) - Max chunk size (default: 1000)
- `--rag-chunk-overlap` (number) - Chunk overlap (default: 200)
- `--rag-top-k` (number) - Top results (default: 5)

### New Exports

```typescript
// Types
export type { RAGConfig } from "./rag/types.js";
export type { RAGPreparedTool } from "./rag/ragIntegration.js";

// Functions
export { prepareRAGTool } from "./rag/ragIntegration.js";
```

### Key Files

| File                                  | Purpose                                |
| ------------------------------------- | -------------------------------------- |
| `src/lib/rag/ragIntegration.ts`       | `prepareRAGTool()` - auto RAG pipeline |
| `src/lib/rag/types.ts`                | `RAGConfig` type definition            |
| `src/lib/types/generateTypes.ts`      | `rag?: RAGConfig` on GenerateOptions   |
| `src/lib/types/streamTypes.ts`        | `rag?: RAGConfig` on StreamOptions     |
| `src/lib/core/baseProvider.ts`        | Central tool merge in stream()         |
| `src/lib/neurolink.ts`                | RAG injection in generate/stream       |
| `src/cli/factories/commandFactory.ts` | CLI --rag-files flags                  |

## Testing

```bash
# Run the full RAG suite (canonical entry point)
pnpm run test:rag

# Run the suite directly with tsx if you want extra logging
npx tsx test/continuous-test-suite-rag.ts
```

> NeuroLink runs all suites via `tsx`; there is no vitest runner. RAG-specific scenarios (chunkers, rerankers, metadata) are exercised by `continuous-test-suite-rag.ts`.

## Related Documentation

- Vector Store Integrations
- Evaluation and Scoring
- Master Implementation Guide
