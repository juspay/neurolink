/**
 * HuggingFace Embedding Provider
 * Implements embedding generation using HuggingFace Inference API
 * Supports sentence-transformers and other embedding models
 */

import {
  BaseEmbeddingProvider,
  type EmbeddingProviderConfig,
} from "../baseEmbeddingProvider.js";
import {
  EmbeddingProviderName,
  type BatchEmbedResult,
  type EmbedOptions,
  type EmbedResult,
  type EmbeddingModel,
  type HuggingFaceEmbeddingConfig,
} from "../../types/embeddingTypes.js";

/**
 * HuggingFace Embedding Provider Configuration
 */
export type HuggingFaceEmbedderConfig = HuggingFaceEmbeddingConfig;

/**
 * HuggingFace API response type
 * Can be a 1D array (single text) or 2D array (batch)
 */
type HuggingFaceEmbeddingResponse = number[] | number[][];

/**
 * Available HuggingFace embedding models
 * These are popular sentence-transformers models
 */
const HUGGINGFACE_EMBEDDING_MODELS: EmbeddingModel[] = [
  {
    name: "sentence-transformers/all-MiniLM-L6-v2",
    dimension: 384,
    maxTokens: 256,
    provider: EmbeddingProviderName.HUGGINGFACE,
    supportsBatch: true,
    description: "Fast and efficient, good for general use",
  },
  {
    name: "sentence-transformers/all-mpnet-base-v2",
    dimension: 768,
    maxTokens: 384,
    provider: EmbeddingProviderName.HUGGINGFACE,
    supportsBatch: true,
    description: "Higher quality, best general-purpose model",
  },
  {
    name: "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
    dimension: 384,
    maxTokens: 128,
    provider: EmbeddingProviderName.HUGGINGFACE,
    supportsBatch: true,
    description: "Multilingual support, 50+ languages",
  },
  {
    name: "sentence-transformers/multi-qa-MiniLM-L6-cos-v1",
    dimension: 384,
    maxTokens: 512,
    provider: EmbeddingProviderName.HUGGINGFACE,
    supportsBatch: true,
    description: "Optimized for semantic search and QA",
  },
  {
    name: "BAAI/bge-small-en-v1.5",
    dimension: 384,
    maxTokens: 512,
    provider: EmbeddingProviderName.HUGGINGFACE,
    supportsBatch: true,
    description: "BGE model, excellent for retrieval",
  },
  {
    name: "BAAI/bge-base-en-v1.5",
    dimension: 768,
    maxTokens: 512,
    provider: EmbeddingProviderName.HUGGINGFACE,
    supportsBatch: true,
    description: "BGE model, higher quality retrieval",
  },
  {
    name: "BAAI/bge-large-en-v1.5",
    dimension: 1024,
    maxTokens: 512,
    provider: EmbeddingProviderName.HUGGINGFACE,
    supportsBatch: true,
    description: "BGE large model, best quality",
  },
  {
    name: "thenlper/gte-small",
    dimension: 384,
    maxTokens: 512,
    provider: EmbeddingProviderName.HUGGINGFACE,
    supportsBatch: true,
    description: "GTE model, efficient and accurate",
  },
  {
    name: "thenlper/gte-base",
    dimension: 768,
    maxTokens: 512,
    provider: EmbeddingProviderName.HUGGINGFACE,
    supportsBatch: true,
    description: "GTE model, balanced quality and speed",
  },
  {
    name: "intfloat/e5-small-v2",
    dimension: 384,
    maxTokens: 512,
    provider: EmbeddingProviderName.HUGGINGFACE,
    supportsBatch: true,
    description: "E5 model, great for asymmetric tasks",
  },
  {
    name: "intfloat/e5-base-v2",
    dimension: 768,
    maxTokens: 512,
    provider: EmbeddingProviderName.HUGGINGFACE,
    supportsBatch: true,
    description: "E5 model, higher quality",
  },
];

/**
 * Default batch size for HuggingFace embeddings
 */
const DEFAULT_BATCH_SIZE = 32;

/**
 * Default timeout in milliseconds
 */
const DEFAULT_TIMEOUT = 120000; // Longer timeout for model loading

/**
 * HuggingFace Embedding Provider
 * Generates embeddings using HuggingFace Inference API
 */
export class HuggingFaceEmbeddingProvider extends BaseEmbeddingProvider<HuggingFaceEmbedderConfig> {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: HuggingFaceEmbedderConfig = {}) {
    super(config, EmbeddingProviderName.HUGGINGFACE);
    this.apiKey =
      config.apiKey ||
      process.env.HUGGINGFACE_API_KEY ||
      process.env.HF_TOKEN ||
      "";
    this.baseUrl =
      config.baseUrl ||
      "https://api-inference.huggingface.co/pipeline/feature-extraction";
  }

  /**
   * Initialize the provider
   */
  async initialize(): Promise<void> {
    if (this.initialized) {return;}

    if (!this.apiKey) {
      throw new Error(
        "HuggingFace API key is required. Set HUGGINGFACE_API_KEY or HF_TOKEN environment variable, or provide apiKey in config.",
      );
    }

    // Validate API key by making a small test request
    try {
      await this.embed("test", { debug: false });
      this.initialized = true;
      this.logDebug("HuggingFace embedding provider initialized successfully");
    } catch (error) {
      throw new Error(
        `Failed to initialize HuggingFace embedding provider: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Generate embedding for a single text
   */
  async embed(text: string, options?: EmbedOptions): Promise<EmbedResult> {
    this.validateTexts([text]);

    const model = options?.model || this.getDefaultModel();
    const startTime = Date.now();

    const response = await this.makeRequest([text], model, options);

    // Response can be 1D or 2D array
    const embedding =
      Array.isArray(response[0]) && typeof response[0][0] === "number"
        ? (response as number[][])[0]
        : (response as number[]);

    return {
      embedding,
      tokenCount: 0, // HuggingFace doesn't provide token count
      model,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async embedBatch(
    texts: string[],
    options?: EmbedOptions,
  ): Promise<BatchEmbedResult> {
    this.validateTexts(texts);

    const model = options?.model || this.getDefaultModel();
    const batchSize = options?.batchSize || DEFAULT_BATCH_SIZE;
    const startTime = Date.now();

    const embeddings: EmbedResult[] = [];

    // Split into batches and process
    const batches = this.splitIntoBatches(texts, batchSize);

    for (const batch of batches) {
      const response = await this.makeRequest(batch, model, options);

      // Handle response - could be 2D array for batch
      const batchEmbeddings = this.extractEmbeddings(response, batch.length);

      for (const embedding of batchEmbeddings) {
        embeddings.push({
          embedding,
          tokenCount: 0,
          model,
        });
      }

      if (this.config.debug) {
        this.logDebug(`Processed batch of ${batch.length} texts`);
      }
    }

    return {
      embeddings,
      totalTokens: 0, // HuggingFace doesn't provide token counts
      model,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Get available models
   */
  getAvailableModels(): EmbeddingModel[] {
    return HUGGINGFACE_EMBEDDING_MODELS;
  }

  /**
   * Get default model
   */
  getDefaultModel(): string {
    return this.config.defaultModel || "sentence-transformers/all-MiniLM-L6-v2";
  }

  /**
   * Extract embeddings from response
   */
  private extractEmbeddings(
    response: HuggingFaceEmbeddingResponse,
    expectedCount: number,
  ): number[][] {
    // If response is already a 2D array
    if (
      Array.isArray(response) &&
      Array.isArray(response[0]) &&
      typeof response[0][0] === "number"
    ) {
      return response as number[][];
    }

    // If response is 1D array (single embedding)
    if (Array.isArray(response) && typeof response[0] === "number") {
      return [response as number[]];
    }

    // Handle nested structure from some models
    if (Array.isArray(response) && expectedCount === 1) {
      // Flatten if needed for single text
      const flat = this.flattenEmbedding(response);
      return [flat];
    }

    throw new Error("Unexpected HuggingFace response format");
  }

  /**
   * Flatten potentially nested embedding
   */
  private flattenEmbedding(arr: unknown): number[] {
    if (!Array.isArray(arr)) {
      throw new Error("Expected array for embedding");
    }

    // If it's a simple 1D array of numbers
    if (arr.every((item) => typeof item === "number")) {
      return arr as number[];
    }

    // If it's nested, take the first level that contains numbers
    if (Array.isArray(arr[0])) {
      // Mean pooling for nested arrays (e.g., token-level embeddings)
      const nested = arr as number[][];
      if (nested.length === 0 || nested[0].length === 0) {
        throw new Error("Empty embedding array");
      }

      // Simple mean pooling
      const dim = nested[0].length;
      const result = new Array(dim).fill(0);
      for (const vec of nested) {
        for (let i = 0; i < dim; i++) {
          result[i] += vec[i];
        }
      }
      return result.map((v) => v / nested.length);
    }

    throw new Error("Unexpected embedding structure");
  }

  /**
   * Make API request to HuggingFace
   */
  private async makeRequest(
    inputs: string[],
    model: string,
    options?: EmbedOptions,
  ): Promise<HuggingFaceEmbeddingResponse> {
    const timeout = this.config.timeout || DEFAULT_TIMEOUT;
    const waitForModel = this.config.waitForModel ?? true;

    // Prepare input based on batch size
    const input = inputs.length === 1 ? inputs[0] : inputs;

    const body: Record<string, unknown> = {
      inputs: input,
      options: {
        wait_for_model: waitForModel,
      },
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      ...this.config.headers,
    };

    const url = `${this.baseUrl}/${model}`;

    const fetchPromise = fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const response = await this.withTimeout(
      fetchPromise,
      timeout,
      "HuggingFace embedding request",
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorText;
      } catch {
        errorMessage = errorText;
      }

      if (response.status === 401) {
        throw new Error(`HuggingFace authentication failed: ${errorMessage}`);
      } else if (response.status === 429) {
        throw new Error(`HuggingFace rate limit exceeded: ${errorMessage}`);
      } else if (response.status === 503) {
        throw new Error(
          `HuggingFace model is loading, please try again: ${errorMessage}`,
        );
      } else if (response.status === 400) {
        throw new Error(`HuggingFace bad request: ${errorMessage}`);
      } else {
        throw new Error(
          `HuggingFace API error (${response.status}): ${errorMessage}`,
        );
      }
    }

    return response.json() as Promise<HuggingFaceEmbeddingResponse>;
  }
}

// Export configuration type
export type { HuggingFaceEmbedderConfig as HuggingFaceEmbeddingProviderConfig };
