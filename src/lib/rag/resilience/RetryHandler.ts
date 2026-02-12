/**
 * RAG Retry Handler
 *
 * Provides retry logic with exponential backoff and jitter
 * specifically designed for RAG operations including embeddings,
 * vector queries, and LLM-based extraction.
 */

import {
  type RetryOptions as _RetryOptions,
  withRetry,
} from "../../core/infrastructure/index.js";
import { logger } from "../../utils/logger.js";
import {
  EmbeddingError,
  isRetryableRAGError,
  MetadataExtractionError,
  RAGError,
  RAGErrorCodes,
  VectorQueryError,
} from "../errors/RAGError.js";

import type { RAGRetryConfig } from "../../types/ragTypes.js";

export type { RAGRetryConfig } from "../../types/ragTypes.js";

/**
 * Default retry configuration
 */
export const DEFAULT_RAG_RETRY_CONFIG: RAGRetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
  retryableErrorCodes: [
    RAGErrorCodes.EMBEDDING_RATE_LIMIT,
    RAGErrorCodes.VECTOR_QUERY_TIMEOUT,
    RAGErrorCodes.VECTOR_STORE_CONNECTION_ERROR,
    RAGErrorCodes.METADATA_EXTRACTION_TIMEOUT,
    RAGErrorCodes.RERANKER_API_ERROR,
    RAGErrorCodes.OPERATION_TIMEOUT,
  ],
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(attempt: number, config: RAGRetryConfig): number {
  const exponentialDelay =
    config.initialDelay * config.backoffMultiplier ** attempt;
  const delay = Math.min(exponentialDelay, config.maxDelay);

  if (config.jitter) {
    // Add random jitter between 0 and 50% of the delay
    const jitterFactor = 0.5 * Math.random();
    return delay * (1 + jitterFactor);
  }

  return delay;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable based on configuration
 */
export function isRetryable(
  error: unknown,
  config: RAGRetryConfig = DEFAULT_RAG_RETRY_CONFIG,
): boolean {
  // Use custom shouldRetry if provided
  if (config.shouldRetry) {
    return config.shouldRetry(error as Error);
  }

  // Check if it's a RAG error with retryable flag
  if (isRetryableRAGError(error)) {
    return true;
  }

  // Check error code
  if (error instanceof RAGError && config.retryableErrorCodes) {
    if (config.retryableErrorCodes.includes(error.code)) {
      return true;
    }
  }

  // Check for common network/timeout errors
  if (error && typeof error === "object") {
    const errorObj = error as Record<string, unknown>;

    // Timeout errors
    if (
      errorObj.name === "TimeoutError" ||
      errorObj.code === "TIMEOUT" ||
      errorObj.code === "ETIMEDOUT" ||
      errorObj.name === "AbortError"
    ) {
      return true;
    }

    // Network errors
    if (
      errorObj.code === "ECONNRESET" ||
      errorObj.code === "ENOTFOUND" ||
      errorObj.code === "ECONNREFUSED" ||
      errorObj.code === "ECONNABORTED" ||
      errorObj.code === "EPIPE" ||
      errorObj.code === "ENETUNREACH" ||
      errorObj.code === "EHOSTUNREACH"
    ) {
      return true;
    }

    // HTTP status codes
    if (
      typeof errorObj.status === "number" &&
      config.retryableStatusCodes?.includes(errorObj.status)
    ) {
      return true;
    }

    if (
      typeof errorObj.statusCode === "number" &&
      config.retryableStatusCodes?.includes(errorObj.statusCode)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Execute a RAG operation with retry logic
 *
 * Implements exponential backoff with jitter to prevent thundering herd.
 * Only retries on errors that are considered retryable.
 *
 * @param operation - Async operation to execute with retries
 * @param config - Partial retry configuration (merged with defaults)
 * @returns Result of the operation
 * @throws Last error if all retry attempts fail
 */
export async function withRAGRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RAGRetryConfig> = {},
): Promise<T> {
  const mergedConfig: RAGRetryConfig = {
    ...DEFAULT_RAG_RETRY_CONFIG,
    ...config,
  };

  let lastError: unknown;
  let attempt = 0;

  while (attempt <= mergedConfig.maxRetries) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry if this is the last attempt
      if (attempt === mergedConfig.maxRetries) {
        logger.debug(
          `[RAGRetryHandler] All ${mergedConfig.maxRetries} attempts exhausted`,
        );
        break;
      }

      // Check if we should retry this error
      if (!isRetryable(error, mergedConfig)) {
        logger.debug(
          `[RAGRetryHandler] Non-retryable error encountered: ${error instanceof Error ? error.message : String(error)}`,
        );
        break;
      }

      // Calculate delay with backoff and jitter
      const delay = calculateDelay(attempt, mergedConfig);

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.warn(
        `[RAGRetryHandler] Attempt ${attempt + 1}/${mergedConfig.maxRetries + 1} failed: ${errorMessage}. Retrying in ${Math.round(delay)}ms...`,
      );

      await sleep(delay);
      attempt++;
    }
  }

  // Wrap the last error if it's not already a RAG error
  if (lastError instanceof RAGError) {
    throw lastError;
  }

  throw new RAGError(
    `RAG operation failed after ${attempt + 1} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
    RAGErrorCodes.RETRY_EXHAUSTED,
    {
      retryable: false,
      cause: lastError instanceof Error ? lastError : undefined,
      details: {
        totalAttempts: attempt + 1,
        maxRetries: mergedConfig.maxRetries,
      },
    },
  );
}

/**
 * RAG Retry Handler class for more complex retry scenarios
 */
export class RAGRetryHandler {
  private config: RAGRetryConfig;

  constructor(config: Partial<RAGRetryConfig> = {}) {
    this.config = { ...DEFAULT_RAG_RETRY_CONFIG, ...config };
  }

  /**
   * Execute an operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries?: number,
  ): Promise<T> {
    const config =
      maxRetries !== undefined ? { ...this.config, maxRetries } : this.config;
    return withRAGRetry(operation, config);
  }

  /**
   * Execute multiple operations with retry, collecting results
   * Returns successful results and failed operations with their errors
   */
  async executeBatch<T, R>(
    items: T[],
    operation: (item: T, index: number) => Promise<R>,
    options?: {
      concurrency?: number;
      continueOnError?: boolean;
    },
  ): Promise<{
    successful: Array<{ item: T; result: R; index: number }>;
    failed: Array<{ item: T; error: Error; index: number }>;
    successRate: number;
  }> {
    const { concurrency = 5, continueOnError = true } = options ?? {};

    const successful: Array<{ item: T; result: R; index: number }> = [];
    const failed: Array<{ item: T; error: Error; index: number }> = [];

    // Process in batches for concurrency control
    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency);
      const batchPromises = batch.map(async (item, batchIndex) => {
        const index = i + batchIndex;
        try {
          const result = await this.executeWithRetry(() =>
            operation(item, index),
          );
          successful.push({ item, result, index });
        } catch (error) {
          const errorObj =
            error instanceof Error ? error : new Error(String(error));
          failed.push({ item, error: errorObj, index });

          if (!continueOnError) {
            throw error;
          }
        }
      });

      await Promise.all(batchPromises);
    }

    const total = successful.length + failed.length;
    const successRate = total > 0 ? successful.length / total : 0;

    return { successful, failed, successRate };
  }

  /**
   * Get current configuration
   */
  getConfig(): RAGRetryConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RAGRetryConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Specialized retry handler for embedding operations
 */
export class EmbeddingRetryHandler extends RAGRetryHandler {
  constructor(config?: Partial<RAGRetryConfig>) {
    super({
      maxRetries: 5, // More retries for rate-limited embedding APIs
      initialDelay: 2000, // Longer initial delay
      retryableErrorCodes: [
        RAGErrorCodes.EMBEDDING_ERROR,
        RAGErrorCodes.EMBEDDING_RATE_LIMIT,
        RAGErrorCodes.EMBEDDING_PROVIDER_ERROR,
      ],
      shouldRetry: (error) => {
        // Always retry rate limit errors
        if (error instanceof EmbeddingError) {
          return error.retryable;
        }
        return isRetryable(error);
      },
      ...config,
    });
  }
}

/**
 * Specialized retry handler for vector store operations
 */
export class VectorStoreRetryHandler extends RAGRetryHandler {
  constructor(config?: Partial<RAGRetryConfig>) {
    super({
      maxRetries: 3,
      initialDelay: 1000,
      retryableErrorCodes: [
        RAGErrorCodes.VECTOR_QUERY_ERROR,
        RAGErrorCodes.VECTOR_QUERY_TIMEOUT,
        RAGErrorCodes.VECTOR_STORE_UNAVAILABLE,
        RAGErrorCodes.VECTOR_STORE_CONNECTION_ERROR,
      ],
      shouldRetry: (error) => {
        if (error instanceof VectorQueryError) {
          return error.retryable;
        }
        return isRetryable(error);
      },
      ...config,
    });
  }
}

/**
 * Specialized retry handler for metadata extraction
 */
export class MetadataExtractionRetryHandler extends RAGRetryHandler {
  constructor(config?: Partial<RAGRetryConfig>) {
    super({
      maxRetries: 3,
      initialDelay: 1500,
      retryableErrorCodes: [
        RAGErrorCodes.METADATA_EXTRACTION_ERROR,
        RAGErrorCodes.METADATA_EXTRACTION_TIMEOUT,
      ],
      shouldRetry: (error) => {
        if (error instanceof MetadataExtractionError) {
          return error.retryable;
        }
        return isRetryable(error);
      },
      ...config,
    });
  }
}

/**
 * Create a retry handler with the core infrastructure withRetry
 */
export function createRetryHandler(
  config: Partial<RAGRetryConfig> = {},
): (operation: () => Promise<unknown>) => Promise<unknown> {
  const mergedConfig = { ...DEFAULT_RAG_RETRY_CONFIG, ...config };

  return (operation) =>
    withRetry(operation, {
      maxRetries: mergedConfig.maxRetries,
      baseDelayMs: mergedConfig.initialDelay,
      maxDelayMs: mergedConfig.maxDelay,
      shouldRetry: (error) => isRetryable(error, mergedConfig),
    });
}

/**
 * Global retry handlers for common RAG operations
 */
export const embeddingRetryHandler = new EmbeddingRetryHandler();
export const vectorStoreRetryHandler = new VectorStoreRetryHandler();
export const metadataExtractionRetryHandler =
  new MetadataExtractionRetryHandler();
