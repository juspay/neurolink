/**
 * RAG Error Types
 *
 * Provides typed errors for all RAG operations including chunking,
 * metadata extraction, embedding, vector queries, and reranking.
 * Uses the NeuroLinkFeatureError pattern for consistency.
 */

import {
  NeuroLinkFeatureError,
  createErrorFactory,
} from "../../core/infrastructure/index.js";
import type { RAGErrorCode } from "../../types/index.js";

/**
 * RAG error codes for all RAG-related operations
 */
export const RAGErrorCodes = {
  // Chunking errors
  CHUNKING_ERROR: "RAG_CHUNKING_ERROR",
  CHUNKING_INVALID_CONFIG: "RAG_CHUNKING_INVALID_CONFIG",
  CHUNKING_STRATEGY_NOT_FOUND: "RAG_CHUNKING_STRATEGY_NOT_FOUND",
  CHUNKING_EMPTY_CONTENT: "RAG_CHUNKING_EMPTY_CONTENT",
  CHUNKING_SIZE_EXCEEDED: "RAG_CHUNKING_SIZE_EXCEEDED",

  // Metadata extraction errors
  METADATA_EXTRACTION_ERROR: "RAG_METADATA_EXTRACTION_ERROR",
  METADATA_EXTRACTION_TIMEOUT: "RAG_METADATA_EXTRACTION_TIMEOUT",
  METADATA_SCHEMA_INVALID: "RAG_METADATA_SCHEMA_INVALID",
  METADATA_EXTRACTOR_NOT_FOUND: "RAG_METADATA_EXTRACTOR_NOT_FOUND",

  // Embedding errors
  EMBEDDING_ERROR: "RAG_EMBEDDING_ERROR",
  EMBEDDING_DIMENSION_MISMATCH: "RAG_EMBEDDING_DIMENSION_MISMATCH",
  EMBEDDING_RATE_LIMIT: "RAG_EMBEDDING_RATE_LIMIT",
  EMBEDDING_PROVIDER_ERROR: "RAG_EMBEDDING_PROVIDER_ERROR",

  // Vector store/query errors
  VECTOR_QUERY_ERROR: "RAG_VECTOR_QUERY_ERROR",
  VECTOR_QUERY_TIMEOUT: "RAG_VECTOR_QUERY_TIMEOUT",
  VECTOR_STORE_UNAVAILABLE: "RAG_VECTOR_STORE_UNAVAILABLE",
  VECTOR_STORE_CONNECTION_ERROR: "RAG_VECTOR_STORE_CONNECTION_ERROR",
  VECTOR_INDEX_NOT_FOUND: "RAG_VECTOR_INDEX_NOT_FOUND",

  // Reranking errors
  RERANKER_ERROR: "RAG_RERANKER_ERROR",
  RERANKER_NOT_FOUND: "RAG_RERANKER_NOT_FOUND",
  RERANKER_API_ERROR: "RAG_RERANKER_API_ERROR",

  // Graph RAG errors
  GRAPH_RAG_ERROR: "RAG_GRAPH_ERROR",
  GRAPH_TRAVERSAL_ERROR: "RAG_GRAPH_TRAVERSAL_ERROR",
  GRAPH_NODE_NOT_FOUND: "RAG_GRAPH_NODE_NOT_FOUND",

  // Pipeline errors
  PIPELINE_ERROR: "RAG_PIPELINE_ERROR",
  PIPELINE_STAGE_FAILED: "RAG_PIPELINE_STAGE_FAILED",
  PIPELINE_PARTIAL_FAILURE: "RAG_PIPELINE_PARTIAL_FAILURE",

  // Circuit breaker errors
  CIRCUIT_BREAKER_OPEN: "RAG_CIRCUIT_BREAKER_OPEN",
  CIRCUIT_BREAKER_HALF_OPEN_LIMIT: "RAG_CIRCUIT_BREAKER_HALF_OPEN_LIMIT",

  // General errors
  OPERATION_TIMEOUT: "RAG_OPERATION_TIMEOUT",
  RETRY_EXHAUSTED: "RAG_RETRY_EXHAUSTED",
  INVALID_CONFIGURATION: "RAG_INVALID_CONFIGURATION",
} as const;

/**
 * RAG error factory using the infrastructure pattern
 */
export const RAGErrorFactory = createErrorFactory("RAG", RAGErrorCodes);

/**
 * Base RAG error class extending NeuroLinkFeatureError
 */
export class RAGError extends NeuroLinkFeatureError {
  constructor(
    message: string,
    code: RAGErrorCode,
    options?: {
      retryable?: boolean;
      details?: Record<string, unknown>;
      cause?: Error;
    },
  ) {
    super(message, code, "RAG", options);
  }
}

/**
 * Chunking-specific error
 */
export class ChunkingError extends RAGError {
  readonly strategy?: string;
  readonly contentLength?: number;

  constructor(
    message: string,
    options?: {
      code?: RAGErrorCode;
      retryable?: boolean;
      details?: Record<string, unknown>;
      cause?: Error;
      strategy?: string;
      contentLength?: number;
    },
  ) {
    super(message, options?.code ?? RAGErrorCodes.CHUNKING_ERROR, {
      retryable: options?.retryable ?? false,
      details: {
        ...options?.details,
        strategy: options?.strategy,
        contentLength: options?.contentLength,
      },
      cause: options?.cause,
    });
    this.strategy = options?.strategy;
    this.contentLength = options?.contentLength;
  }
}

/**
 * Metadata extraction error
 */
export class MetadataExtractionError extends RAGError {
  readonly extractorType?: string;
  readonly chunkId?: string;

  constructor(
    message: string,
    options?: {
      code?: RAGErrorCode;
      retryable?: boolean;
      details?: Record<string, unknown>;
      cause?: Error;
      extractorType?: string;
      chunkId?: string;
    },
  ) {
    super(message, options?.code ?? RAGErrorCodes.METADATA_EXTRACTION_ERROR, {
      retryable: options?.retryable ?? true, // LLM-based extraction is often retryable
      details: {
        ...options?.details,
        extractorType: options?.extractorType,
        chunkId: options?.chunkId,
      },
      cause: options?.cause,
    });
    this.extractorType = options?.extractorType;
    this.chunkId = options?.chunkId;
  }
}

/**
 * Embedding error
 */
export class EmbeddingError extends RAGError {
  readonly provider?: string;
  readonly batchSize?: number;

  constructor(
    message: string,
    options?: {
      code?: RAGErrorCode;
      retryable?: boolean;
      details?: Record<string, unknown>;
      cause?: Error;
      provider?: string;
      batchSize?: number;
    },
  ) {
    super(message, options?.code ?? RAGErrorCodes.EMBEDDING_ERROR, {
      retryable: options?.retryable ?? true, // Embedding operations are typically retryable
      details: {
        ...options?.details,
        provider: options?.provider,
        batchSize: options?.batchSize,
      },
      cause: options?.cause,
    });
    this.provider = options?.provider;
    this.batchSize = options?.batchSize;
  }
}

/**
 * Vector query error
 */
export class VectorQueryError extends RAGError {
  readonly storeType?: string;
  readonly queryLength?: number;
  readonly indexName?: string;

  constructor(
    message: string,
    options?: {
      code?: RAGErrorCode;
      retryable?: boolean;
      details?: Record<string, unknown>;
      cause?: Error;
      storeType?: string;
      queryLength?: number;
      indexName?: string;
    },
  ) {
    super(message, options?.code ?? RAGErrorCodes.VECTOR_QUERY_ERROR, {
      retryable: options?.retryable ?? true,
      details: {
        ...options?.details,
        storeType: options?.storeType,
        queryLength: options?.queryLength,
        indexName: options?.indexName,
      },
      cause: options?.cause,
    });
    this.storeType = options?.storeType;
    this.queryLength = options?.queryLength;
    this.indexName = options?.indexName;
  }
}

/**
 * Reranker error
 */
export class RerankerError extends RAGError {
  readonly rerankerType?: string;
  readonly documentCount?: number;

  constructor(
    message: string,
    options?: {
      code?: RAGErrorCode;
      retryable?: boolean;
      details?: Record<string, unknown>;
      cause?: Error;
      rerankerType?: string;
      documentCount?: number;
    },
  ) {
    super(message, options?.code ?? RAGErrorCodes.RERANKER_ERROR, {
      retryable: options?.retryable ?? true,
      details: {
        ...options?.details,
        rerankerType: options?.rerankerType,
        documentCount: options?.documentCount,
      },
      cause: options?.cause,
    });
    this.rerankerType = options?.rerankerType;
    this.documentCount = options?.documentCount;
  }
}

/**
 * Graph RAG error
 */
export class GraphRAGError extends RAGError {
  readonly traversalStrategy?: string;
  readonly nodeId?: string;

  constructor(
    message: string,
    options?: {
      code?: RAGErrorCode;
      retryable?: boolean;
      details?: Record<string, unknown>;
      cause?: Error;
      traversalStrategy?: string;
      nodeId?: string;
    },
  ) {
    super(message, options?.code ?? RAGErrorCodes.GRAPH_RAG_ERROR, {
      retryable: options?.retryable ?? false,
      details: {
        ...options?.details,
        traversalStrategy: options?.traversalStrategy,
        nodeId: options?.nodeId,
      },
      cause: options?.cause,
    });
    this.traversalStrategy = options?.traversalStrategy;
    this.nodeId = options?.nodeId;
  }
}

/**
 * Pipeline error with partial failure support
 */
export class PipelineError extends RAGError {
  readonly stageName?: string;
  readonly successfulChunks?: number;
  readonly failedChunks?: number;
  readonly partialResults?: unknown[];

  constructor(
    message: string,
    options?: {
      code?: RAGErrorCode;
      retryable?: boolean;
      details?: Record<string, unknown>;
      cause?: Error;
      stageName?: string;
      successfulChunks?: number;
      failedChunks?: number;
      partialResults?: unknown[];
    },
  ) {
    super(message, options?.code ?? RAGErrorCodes.PIPELINE_ERROR, {
      retryable: options?.retryable ?? false,
      details: {
        ...options?.details,
        stageName: options?.stageName,
        successfulChunks: options?.successfulChunks,
        failedChunks: options?.failedChunks,
      },
      cause: options?.cause,
    });
    this.stageName = options?.stageName;
    this.successfulChunks = options?.successfulChunks;
    this.failedChunks = options?.failedChunks;
    this.partialResults = options?.partialResults;
  }

  /**
   * Check if this is a partial failure (some chunks succeeded)
   */
  isPartialFailure(): boolean {
    return (
      this.successfulChunks !== undefined &&
      this.successfulChunks > 0 &&
      this.failedChunks !== undefined &&
      this.failedChunks > 0
    );
  }

  /**
   * Get success rate as a percentage
   */
  getSuccessRate(): number {
    if (
      this.successfulChunks === undefined ||
      this.failedChunks === undefined
    ) {
      return 0;
    }
    const total = this.successfulChunks + this.failedChunks;
    return total > 0 ? (this.successfulChunks / total) * 100 : 0;
  }
}

/**
 * Circuit breaker specific error for RAG operations
 */
export class RAGCircuitBreakerError extends RAGError {
  readonly circuitName?: string;
  readonly nextRetryTime?: Date;

  constructor(
    message: string,
    options?: {
      code?: RAGErrorCode;
      details?: Record<string, unknown>;
      circuitName?: string;
      nextRetryTime?: Date;
    },
  ) {
    super(message, options?.code ?? RAGErrorCodes.CIRCUIT_BREAKER_OPEN, {
      retryable: false, // Circuit breaker errors are not immediately retryable
      details: {
        ...options?.details,
        circuitName: options?.circuitName,
        nextRetryTime: options?.nextRetryTime?.toISOString(),
      },
    });
    this.circuitName = options?.circuitName;
    this.nextRetryTime = options?.nextRetryTime;
  }
}

/**
 * Type guard for RAG errors
 */
export function isRAGError(error: unknown): error is RAGError {
  return error instanceof RAGError;
}

/**
 * Type guard for retryable errors
 */
export function isRetryableRAGError(error: unknown): boolean {
  if (!isRAGError(error)) {
    return false;
  }
  return error.retryable;
}

/**
 * Type guard for partial failure errors
 */
export function isPartialFailure(error: unknown): error is PipelineError {
  return error instanceof PipelineError && error.isPartialFailure();
}
