/**
 * Abstract base class for all embedding provider implementations
 * Follows NeuroLink's BaseProvider pattern with composition over inheritance
 */

import type {
  BatchEmbedResult,
  EmbedOptions,
  EmbedResult,
  EmbeddingModel,
  EmbeddingProviderConfig,
  EmbeddingProviderHealth,
  EmbeddingProviderName,
} from "../types/embeddingTypes.js";
import { logger } from "../utils/logger.js";

/**
 * Abstract base class for all embedding provider implementations
 * Follows NeuroLink's BaseProvider pattern
 */
export abstract class BaseEmbeddingProvider<
  TConfig extends EmbeddingProviderConfig = EmbeddingProviderConfig,
> {
  protected readonly config: TConfig;
  protected readonly providerName: EmbeddingProviderName;
  protected initialized: boolean = false;

  constructor(config: TConfig, providerName: EmbeddingProviderName) {
    this.config = config;
    this.providerName = providerName;
  }

  // ===================
  // ABSTRACT METHODS (Must be implemented by each provider)
  // ===================

  /**
   * Initialize the provider (e.g., validate API key, set up client)
   */
  abstract initialize(): Promise<void>;

  /**
   * Generate embedding for a single text
   * @param text The text to embed
   * @param options Embedding options
   * @returns Embedding result
   */
  abstract embed(text: string, options?: EmbedOptions): Promise<EmbedResult>;

  /**
   * Generate embeddings for multiple texts in batch
   * @param texts Array of texts to embed
   * @param options Embedding options
   * @returns Batch embedding result
   */
  abstract embedBatch(
    texts: string[],
    options?: EmbedOptions,
  ): Promise<BatchEmbedResult>;

  /**
   * Get available models for this provider
   * @returns Array of available embedding models
   */
  abstract getAvailableModels(): EmbeddingModel[];

  /**
   * Get the default model for this provider
   * @returns Default model name
   */
  abstract getDefaultModel(): string;

  // ===================
  // COMMON METHODS (Shared implementations)
  // ===================

  /**
   * Get provider health status
   * @returns Health status of the provider
   */
  async healthCheck(): Promise<EmbeddingProviderHealth> {
    const startTime = Date.now();
    try {
      // Simple health check by embedding a short test string
      await this.embed("test", { debug: false });
      return {
        healthy: true,
        status: "connected",
        latencyMs: Date.now() - startTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        healthy: false,
        status: "error",
        latencyMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Embed multiple texts with automatic batching
   * Uses the provider's optimal batch size
   * @param texts Array of texts to embed
   * @param options Embedding options
   * @returns Array of embedding vectors
   */
  async embedMany(
    texts: string[],
    options?: EmbedOptions,
  ): Promise<number[][]> {
    const result = await this.embedBatch(texts, options);
    return result.embeddings.map((e) => e.embedding);
  }

  /**
   * Embed a single text and return just the vector
   * @param text Text to embed
   * @param options Embedding options
   * @returns Embedding vector
   */
  async embedText(text: string, options?: EmbedOptions): Promise<number[]> {
    const result = await this.embed(text, options);
    return result.embedding;
  }

  /**
   * Get the provider name
   */
  getProviderName(): EmbeddingProviderName {
    return this.providerName;
  }

  /**
   * Check if provider is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Ensure provider is initialized before operations
   */
  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        `Embedding provider ${this.providerName} not initialized. Call initialize() first.`,
      );
    }
  }

  /**
   * Get model info by name
   * @param modelName Model name to look up
   * @returns Model info or undefined
   */
  getModelInfo(modelName: string): EmbeddingModel | undefined {
    return this.getAvailableModels().find((m) => m.name === modelName);
  }

  /**
   * Get the embedding dimension for a model
   * @param modelName Model name
   * @returns Dimension or undefined
   */
  getModelDimension(modelName?: string): number | undefined {
    const model = modelName || this.getDefaultModel();
    const info = this.getModelInfo(model);
    return info?.dimension;
  }

  /**
   * Validate that texts are not empty and within length limits
   * @param texts Texts to validate
   * @param maxLength Maximum allowed length
   */
  protected validateTexts(texts: string[], maxLength?: number): void {
    if (texts.length === 0) {
      throw new Error("At least one text is required for embedding");
    }

    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      if (typeof text !== "string") {
        throw new Error(`Text at index ${i} is not a string`);
      }
      if (text.trim().length === 0) {
        throw new Error(`Text at index ${i} is empty`);
      }
      if (maxLength && text.length > maxLength) {
        throw new Error(
          `Text at index ${i} exceeds maximum length of ${maxLength} characters`,
        );
      }
    }
  }

  /**
   * Split texts into batches
   * @param texts Array of texts
   * @param batchSize Size of each batch
   * @returns Array of text batches
   */
  protected splitIntoBatches(texts: string[], batchSize: number): string[][] {
    const batches: string[][] = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      batches.push(texts.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Get configuration value with fallback
   */
  protected getConfigValue<T>(key: keyof TConfig, defaultValue: T): T {
    const value = this.config[key];
    return value !== undefined ? (value as T) : defaultValue;
  }

  /**
   * Log debug message if debug mode is enabled
   */
  protected logDebug(message: string, context?: Record<string, unknown>): void {
    if (this.config.debug) {
      logger.debug(`[${this.providerName}] ${message}`, context);
    }
  }

  /**
   * Log info message
   */
  protected logInfo(message: string, context?: Record<string, unknown>): void {
    logger.info(`[${this.providerName}] ${message}`, context);
  }

  /**
   * Log error message
   */
  protected logError(message: string, error?: unknown): void {
    logger.error(`[${this.providerName}] ${message}`, { error });
  }

  /**
   * Create a timeout promise
   * @param ms Timeout in milliseconds
   * @param operation Operation name for error message
   */
  protected createTimeout(ms: number, operation: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${operation} timed out after ${ms}ms`));
      }, ms);
    });
  }

  /**
   * Execute with timeout
   * @param promise Promise to execute
   * @param timeoutMs Timeout in milliseconds
   * @param operation Operation name
   */
  protected async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operation: string,
  ): Promise<T> {
    return Promise.race([promise, this.createTimeout(timeoutMs, operation)]);
  }
}

// Re-export the config type for convenience
export type { EmbeddingProviderConfig };
