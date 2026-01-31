/**
 * Cohere Embedder
 *
 * Embedder implementation using Cohere's embedding models.
 * Supports embed-v4, embed-english-v3.0, embed-multilingual-v3.0, and other Cohere models.
 *
 * @module memory/embedders/cohereEmbedder
 * @since 9.0.0
 */

import type {
  Embedder,
  EmbedderConfig,
  EmbedderModelInfo,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";

/**
 * Cohere embedding model specifications
 */
const COHERE_EMBEDDING_MODELS: Record<
  string,
  { dimensions: number; maxTokens: number }
> = {
  "embed-v4": { dimensions: 1024, maxTokens: 128000 },
  "embed-english-v3.0": { dimensions: 1024, maxTokens: 512 },
  "embed-multilingual-v3.0": { dimensions: 1024, maxTokens: 512 },
  "embed-english-light-v3.0": { dimensions: 384, maxTokens: 512 },
  "embed-multilingual-light-v3.0": { dimensions: 384, maxTokens: 512 },
  "embed-english-v2.0": { dimensions: 4096, maxTokens: 512 },
  "embed-english-light-v2.0": { dimensions: 1024, maxTokens: 512 },
  "embed-multilingual-v2.0": { dimensions: 768, maxTokens: 256 },
};

/**
 * Default batch size for embedding requests
 */
const DEFAULT_BATCH_SIZE = 96;

import type { MemoryCohereInputType } from "../../types/index.js";

/**
 * Cohere embedder using the Cohere API
 *
 * Prerequisites:
 * - Cohere API key (COHERE_API_KEY environment variable or config)
 */
export class CohereEmbedder implements Embedder {
  private config: EmbedderConfig;
  private apiKey: string;
  private baseUrl: string;
  private modelInfo: EmbedderModelInfo;
  private isInitialized = false;
  private inputType: MemoryCohereInputType;

  constructor(config: EmbedderConfig) {
    this.config = config;
    this.apiKey = config.config?.apiKey ?? process.env.COHERE_API_KEY ?? "";
    this.baseUrl = config.config?.baseUrl ?? "https://api.cohere.ai/v1";

    // Default to search_document for storage, can be overridden
    this.inputType =
      ((config.config as Record<string, unknown> | undefined)
        ?.inputType as MemoryCohereInputType) ?? "search_document";

    const modelSpec = COHERE_EMBEDDING_MODELS[config.model] ?? {
      dimensions: config.config?.dimensions ?? 1024,
      maxTokens: 512,
    };

    this.modelInfo = {
      provider: "cohere",
      model: config.model,
      dimensions: modelSpec.dimensions,
      maxTokens: modelSpec.maxTokens,
    };
  }

  /**
   * Initialize the embedder
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (!this.apiKey) {
      throw new Error(
        "Cohere API key not configured. Set COHERE_API_KEY environment variable or provide apiKey in config.",
      );
    }

    this.isInitialized = true;

    logger.debug("[CohereEmbedder] Initialized", {
      model: this.config.model,
      dimensions: this.modelInfo.dimensions,
      baseUrl: this.baseUrl,
      inputType: this.inputType,
    });
  }

  /**
   * Get the dimensions of the embedding model
   */
  getDimensions(): number {
    return this.modelInfo.dimensions;
  }

  /**
   * Embed a single text
   */
  async embed(text: string): Promise<number[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const response = await fetch(`${this.baseUrl}/embed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        texts: [text],
        input_type: this.inputType,
        embedding_types: ["float"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("[CohereEmbedder] Embedding request failed", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(
        `Cohere embedding failed: ${response.status} - ${errorText}`,
      );
    }

    const result = (await response.json()) as {
      embeddings: { float: number[][] };
      meta: { billed_units: { input_tokens: number } };
    };

    logger.debug("[CohereEmbedder] Embedded text", {
      model: this.config.model,
      inputLength: text.length,
      inputTokens: result.meta?.billed_units?.input_tokens,
    });

    return result.embeddings.float[0];
  }

  /**
   * Embed multiple texts in batch
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const batchSize = this.config.batchSize ?? DEFAULT_BATCH_SIZE;
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      const response = await fetch(`${this.baseUrl}/embed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          texts: batch,
          input_type: this.inputType,
          embedding_types: ["float"],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("[CohereEmbedder] Batch embedding request failed", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          batchIndex: i,
          batchSize: batch.length,
        });
        throw new Error(
          `Cohere batch embedding failed: ${response.status} - ${errorText}`,
        );
      }

      const result = (await response.json()) as {
        embeddings: { float: number[][] };
        meta: { billed_units: { input_tokens: number } };
      };

      results.push(...result.embeddings.float);

      logger.debug("[CohereEmbedder] Embedded batch", {
        model: this.config.model,
        batchIndex: i,
        batchSize: batch.length,
        inputTokens: result.meta?.billed_units?.input_tokens,
      });
    }

    return results;
  }

  /**
   * Get model information
   */
  getModelInfo(): EmbedderModelInfo {
    return { ...this.modelInfo };
  }

  /**
   * Set the input type for embeddings
   * Use "search_query" when embedding queries, "search_document" when embedding documents
   */
  setInputType(inputType: MemoryCohereInputType): void {
    this.inputType = inputType;
  }
}
