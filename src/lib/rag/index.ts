/**
 * RAG Document Processing Module
 *
 * Provides comprehensive RAG (Retrieval-Augmented Generation) capabilities:
 * - Document loading (text, markdown, HTML, JSON, CSV, PDF, web)
 * - MDocument class for fluent document processing
 * - 10 chunking strategies (character, recursive, sentence, token, markdown, html, json, latex, semantic, semantic-markdown)
 * - LLM-powered metadata extraction (title, summary, keywords, Q&A)
 * - Vector query tools with metadata filtering and reranking
 * - Hybrid search (BM25 + vector fusion)
 * - Graph RAG for knowledge graph-based retrieval
 * - RAG pipeline orchestration
 * - Context assembly and formatting
 * - ChunkerFactory and ChunkerRegistry patterns for extensibility
 * - Error handling and resilience (CircuitBreaker, RetryHandler)
 *
 * @example
 * ```typescript
 * import {
 *   MDocument,
 *   loadDocument,
 *   RAGPipeline,
 *   ChunkerRegistry,
 *   ChunkerFactory,
 *   CircuitBreaker
 * } from '@juspay/neurolink';
 *
 * // Load and process a document
 * const doc = await loadDocument('/path/to/document.md');
 * await doc.chunk({ strategy: 'markdown', config: { maxSize: 1000 } });
 * await doc.embed('openai', 'text-embedding-3-small');
 *
 * // Or use the full RAG pipeline
 * const pipeline = new RAGPipeline({
 *   embeddingModel: { provider: 'openai', modelName: 'text-embedding-3-small' },
 *   generationModel: { provider: 'openai', modelName: 'gpt-4o-mini' }
 * });
 * await pipeline.ingest(['/path/to/docs/*.md']);
 * const response = await pipeline.query('What are the key features?');
 *
 * // Use factory pattern for chunker creation
 * const chunker = await ChunkerFactory.createChunker('semantic', { maxSize: 500 });
 * const chunks = await chunker.chunk(text);
 * ```
 */

export {
  ChunkerFactory,
  chunkerFactory,
  createChunker,
  getAvailableStrategies as getFactoryStrategies,
  getDefaultConfig as getFactoryDefaultConfig,
} from "./ChunkerFactory.js";
// ChunkerFactory and ChunkerRegistry patterns (from main worktree)
export {
  ChunkerRegistry as ChunkerRegistryV2,
  chunkerRegistry,
  getAvailableChunkers,
  getChunker,
  getChunkerMetadata,
} from "./ChunkerRegistry.js";
// Base chunker and chunker implementations (from main worktree)
export * from "./chunkers/index.js";
// Chunking
export {
  CharacterChunker,
  ChunkerRegistry,
  chunkText,
  HTMLChunker,
  JSONChunker,
  LaTeXChunker,
  MarkdownChunker,
  RecursiveChunker,
  SemanticChunker,
  SentenceChunker,
  TokenChunker,
} from "./chunking/index.js";
// Document Processing
export {
  CSVLoader,
  HTMLLoader,
  JSONLoader,
  loadDocument,
  loadDocuments,
  MarkdownLoader,
  MDocument,
  PDFLoader,
  TextLoader,
  WebLoader,
} from "./document/index.js";
// Error handling
export * from "./errors/index.js";
// Graph RAG
export { GraphRAG } from "./graphRag/index.js";
// Metadata Extraction
export {
  createMetadataExtractor,
  extractMetadata,
  getAvailableExtractors,
  getAvailableExtractorTypes,
  getExtractor,
  getExtractorDefaultConfig,
  getExtractorMetadata,
  getRegisteredExtractorMetadata,
  LLMMetadataExtractor,
  // Factory pattern
  MetadataExtractorFactory,
  // Registry pattern
  MetadataExtractorRegistry,
  metadataExtractorFactory,
  metadataExtractorRegistry,
} from "./metadata/index.js";
// Pipeline
export {
  assembleContext,
  createContextWindow,
  createRAGPipeline,
  extractKeySentences,
  formatContextWithCitations,
  orderByDocumentStructure,
  RAGPipeline,
  summarizeContext,
} from "./pipeline/index.js";
// RAG Integration (for generate/stream)
export { prepareRAGTool } from "./ragIntegration.js";
// Reranker
export {
  batchRerank,
  CohereRelevanceScorer,
  CrossEncoderReranker,
  createReranker,
  getAvailableRerankers,
  getAvailableRerankerTypes,
  getRegisteredRerankerMetadata,
  getReranker,
  getRerankerDefaultConfig,
  getRerankerMetadata,
  // Factory pattern
  RerankerFactory,
  // Registry pattern
  RerankerRegistry,
  rerank,
  rerankerFactory,
  rerankerRegistry,
  simpleRerank,
} from "./reranker/index.js";
// Resilience patterns
export * from "./resilience/index.js";
// Retrieval
export {
  createHybridSearch,
  createVectorQueryTool,
  InMemoryBM25Index,
  InMemoryVectorStore,
  linearCombination,
  reciprocalRankFusion,
} from "./retrieval/index.js";
// Vector store adapters (Pinecone, pgvector, Chroma — client-injection)
export * from "./stores/index.js";

// Types
export * from "../types/index.js";

// Convenience functions

import { ChunkerRegistry } from "./chunking/index.js";
import { LLMMetadataExtractor } from "./metadata/index.js";
import type { Chunk, ChunkingStrategy, ExtractParams } from "../types/index.js";

/**
 * Process a document through the full RAG pipeline
 *
 * @param text - Document text to process
 * @param options - Processing options
 * @returns Processed chunks with optional metadata
 */
export async function processDocument(
  text: string,
  options?: {
    /** Chunking strategy (default: recursive) */
    strategy?: ChunkingStrategy;
    /** Maximum chunk size */
    maxSize?: number;
    /** Chunk overlap */
    overlap?: number;
    /** Metadata extraction options */
    extract?: ExtractParams;
    /** Provider for metadata extraction */
    provider?: string;
    /** Model for metadata extraction */
    model?: string;
    /** Custom metadata to add */
    metadata?: Record<string, unknown>;
  },
): Promise<Chunk[]> {
  const {
    strategy = "recursive",
    maxSize = 1000,
    overlap = 200,
    extract,
    provider,
    model,
    metadata = {},
  } = options || {};

  // Chunk the document
  const chunker = ChunkerRegistry.get(strategy);
  const chunks = await chunker.chunk(text, { maxSize, overlap, metadata });

  // Extract metadata if requested
  if (extract) {
    const extractor = new LLMMetadataExtractor({ provider, modelName: model });
    const results = await extractor.extract(chunks, extract);

    // Merge metadata into chunks
    for (let i = 0; i < chunks.length && i < results.length; i++) {
      const result = results[i];
      if (result.title) {
        chunks[i].metadata.title = result.title;
      }
      if (result.summary) {
        chunks[i].metadata.summary = result.summary;
      }
      if (result.keywords) {
        chunks[i].metadata.keywords = result.keywords;
      }
    }
  }

  return chunks;
}

/**
 * Get recommended chunking strategy based on content type
 *
 * @param contentType - MIME type or file extension
 * @returns Recommended chunking strategy
 */
export function getRecommendedStrategy(contentType: string): ChunkingStrategy {
  return ChunkerRegistry.getRecommendedStrategy(contentType);
}

/**
 * Get available chunking strategies
 *
 * @returns Array of available strategy names
 */
export function getAvailableStrategies(): ChunkingStrategy[] {
  return ChunkerRegistry.getAvailableStrategies();
}

/**
 * Get default configuration for a chunking strategy
 *
 * @param strategy - Chunking strategy name
 * @returns Default configuration object
 */
export function getDefaultChunkerConfig(
  strategy: ChunkingStrategy,
): Record<string, unknown> {
  return ChunkerRegistry.getDefaultConfig(strategy);
}
