/**
 * Mistral Embedder
 *
 * Embedder implementation using Mistral AI's embedding models.
 * Supports mistral-embed and other Mistral embedding models.
 *
 * @module memory/embedders/mistralEmbedder
 * @since 9.0.0
 */

import type {
  Embedder,
  EmbedderConfig,
  EmbedderModelInfo,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";

/**
 * Mistral embedding model specifications
 */
const MISTRAL_EMBEDDING_MODELS: Record<
  string,
  { dimensions: number; maxTokens: number }
> = {
  "mistral-embed": { dimensions: 1024, maxTokens: 8192 },
};

/**
 * Default batch size for embedding requests
 */
const DEFAULT_BATCH_SIZE = 50;

/**
 * Mistral embedder using the Mistral AI API
 *
 * Prerequisites:
 * - Mistral AI API key (MISTRAL_API_KEY environment variable or config)
 */
export class MistralEmbedder implements Embedder {
  private config: EmbedderConfig;
  private apiKey: string;
  private baseUrl: string;
  private modelInfo: EmbedderModelInfo;
  private isInitialized = false;

  constructor(config: EmbedderConfig) {
    this.config = config;
    this.apiKey = config.config?.apiKey ?? process.env.MISTRAL_API_KEY ?? "";
    this.baseUrl = config.config?.baseUrl ?? "https://api.mistral.ai/v1";

    const modelSpec = MISTRAL_EMBEDDING_MODELS[config.model] ?? {
      dimensions: config.config?.dimensions ?? 1024,
      maxTokens: 8192,
    };

    this.modelInfo = {
      provider: "mistral",
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
        "Mistral API key not configured. Set MISTRAL_API_KEY environment variable or provide apiKey in config.",
      );
    }

    this.isInitialized = true;

    logger.debug("[MistralEmbedder] Initialized", {
      model: this.config.model,
      dimensions: this.modelInfo.dimensions,
      baseUrl: this.baseUrl,
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

    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        input: [text],
        encoding_format: "float",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("[MistralEmbedder] Embedding request failed", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(
        `Mistral embedding failed: ${response.status} - ${errorText}`,
      );
    }

    const result = (await response.json()) as {
      data: Array<{ embedding: number[]; index: number }>;
      usage: { prompt_tokens: number; total_tokens: number };
    };

    logger.debug("[MistralEmbedder] Embedded text", {
      model: this.config.model,
      inputLength: text.length,
      promptTokens: result.usage?.prompt_tokens,
    });

    return result.data[0].embedding;
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

      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          input: batch,
          encoding_format: "float",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("[MistralEmbedder] Batch embedding request failed", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          batchIndex: i,
          batchSize: batch.length,
        });
        throw new Error(
          `Mistral batch embedding failed: ${response.status} - ${errorText}`,
        );
      }

      const result = (await response.json()) as {
        data: Array<{ embedding: number[]; index: number }>;
        usage: { prompt_tokens: number; total_tokens: number };
      };

      // Sort by index to maintain order
      const sortedEmbeddings = result.data
        .sort((a, b) => a.index - b.index)
        .map((d) => d.embedding);

      results.push(...sortedEmbeddings);

      logger.debug("[MistralEmbedder] Embedded batch", {
        model: this.config.model,
        batchIndex: i,
        batchSize: batch.length,
        promptTokens: result.usage?.prompt_tokens,
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
}
