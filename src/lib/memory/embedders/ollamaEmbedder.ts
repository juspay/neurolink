/**
 * Ollama Embedder
 *
 * Embedder implementation using locally running Ollama models.
 * Supports nomic-embed-text, mxbai-embed-large, all-minilm, and other Ollama embedding models.
 *
 * @module memory/embedders/ollamaEmbedder
 * @since 9.0.0
 */

import type {
  Embedder,
  EmbedderConfig,
  EmbedderModelInfo,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";

/**
 * Ollama embedding model specifications
 * Dimensions may vary based on the specific model pulled
 */
const OLLAMA_EMBEDDING_MODELS: Record<
  string,
  { dimensions: number; maxTokens: number }
> = {
  "nomic-embed-text": { dimensions: 768, maxTokens: 8192 },
  "mxbai-embed-large": { dimensions: 1024, maxTokens: 512 },
  "all-minilm": { dimensions: 384, maxTokens: 256 },
  "snowflake-arctic-embed": { dimensions: 1024, maxTokens: 512 },
  "bge-m3": { dimensions: 1024, maxTokens: 8192 },
  "bge-large": { dimensions: 1024, maxTokens: 512 },
  "paraphrase-multilingual": { dimensions: 768, maxTokens: 128 },
};

/**
 * Default batch size for embedding requests (Ollama processes sequentially)
 */
const DEFAULT_BATCH_SIZE = 10;

/**
 * Ollama embedder using the local Ollama API
 *
 * Prerequisites:
 * - Ollama installed and running locally
 * - Model pulled (e.g., `ollama pull nomic-embed-text`)
 */
export class OllamaEmbedder implements Embedder {
  private config: EmbedderConfig;
  private baseUrl: string;
  private modelInfo: EmbedderModelInfo;
  private isInitialized = false;
  private actualDimensions?: number;

  constructor(config: EmbedderConfig) {
    this.config = config;
    this.baseUrl = config.config?.baseUrl ?? "http://localhost:11434";

    const modelSpec = OLLAMA_EMBEDDING_MODELS[config.model] ?? {
      dimensions: config.config?.dimensions ?? 768,
      maxTokens: 2048,
    };

    this.modelInfo = {
      provider: "ollama",
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

    // Test connection by checking if Ollama is running
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Ollama not responding: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        models: Array<{ name: string }>;
      };

      // Check if the model is available
      const modelExists = data.models.some(
        (m) =>
          m.name === this.config.model ||
          m.name.startsWith(`${this.config.model}:`),
      );

      if (!modelExists) {
        logger.warn(
          `[OllamaEmbedder] Model ${this.config.model} not found locally. ` +
            `Run 'ollama pull ${this.config.model}' to download it.`,
        );
      }

      // Get actual dimensions by making a test embedding
      await this.detectDimensions();

      this.isInitialized = true;

      logger.debug("[OllamaEmbedder] Initialized", {
        model: this.config.model,
        dimensions: this.modelInfo.dimensions,
        baseUrl: this.baseUrl,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("ECONNREFUSED")) {
        throw new Error(
          "Ollama is not running. Start Ollama with 'ollama serve' or install from https://ollama.ai",
          { cause: error },
        );
      }
      throw new Error(`Failed to connect to Ollama: ${errorMessage}`, {
        cause: error,
      });
    }
  }

  /**
   * Detect actual dimensions by making a test embedding
   */
  private async detectDimensions(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.config.model,
          prompt: "test",
        }),
      });

      if (response.ok) {
        const result = (await response.json()) as { embedding: number[] };
        this.actualDimensions = result.embedding.length;
        this.modelInfo.dimensions = this.actualDimensions;
        logger.debug("[OllamaEmbedder] Detected dimensions", {
          model: this.config.model,
          dimensions: this.actualDimensions,
        });
      }
    } catch {
      // Use default dimensions if detection fails
      logger.debug(
        "[OllamaEmbedder] Could not detect dimensions, using default",
      );
    }
  }

  /**
   * Get the dimensions of the embedding model
   */
  getDimensions(): number {
    return this.actualDimensions ?? this.modelInfo.dimensions;
  }

  /**
   * Embed a single text
   */
  async embed(text: string): Promise<number[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.model,
        prompt: text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("[OllamaEmbedder] Embedding request failed", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(
        `Ollama embedding failed: ${response.status} - ${errorText}`,
      );
    }

    const result = (await response.json()) as { embedding: number[] };

    logger.debug("[OllamaEmbedder] Embedded text", {
      model: this.config.model,
      inputLength: text.length,
      dimensions: result.embedding.length,
    });

    return result.embedding;
  }

  /**
   * Embed multiple texts in batch
   * Note: Ollama processes embeddings sequentially, but we can parallelize requests
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const batchSize = this.config.batchSize ?? DEFAULT_BATCH_SIZE;
    const results: number[][] = [];

    // Process in batches with controlled concurrency
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(async (text) => {
          const response = await fetch(`${this.baseUrl}/api/embeddings`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: this.config.model,
              prompt: text,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              `Ollama embedding failed: ${response.status} - ${errorText}`,
            );
          }

          const result = (await response.json()) as { embedding: number[] };
          return result.embedding;
        }),
      );

      results.push(...batchResults);

      logger.debug("[OllamaEmbedder] Embedded batch", {
        model: this.config.model,
        batchIndex: i,
        batchSize: batch.length,
      });
    }

    return results;
  }

  /**
   * Get model information
   */
  getModelInfo(): EmbedderModelInfo {
    return {
      ...this.modelInfo,
      dimensions: this.actualDimensions ?? this.modelInfo.dimensions,
    };
  }
}
