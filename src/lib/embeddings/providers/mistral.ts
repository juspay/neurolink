/**
 * Mistral Embedding Provider
 * Implements embedding generation using Mistral AI's embedding models
 * Supports mistral-embed for high-quality embeddings
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
  type MistralEmbeddingConfig,
} from "../../types/embeddingTypes.js";

/**
 * Mistral Embedding Provider Configuration
 */
export type MistralEmbedderConfig = MistralEmbeddingConfig;

/**
 * Mistral API response type
 */
type MistralEmbeddingResponse = {
  id: string;
  object: string;
  data: Array<{
    object: string;
    index: number;
    embedding: number[];
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
};

/**
 * Available Mistral embedding models
 */
const MISTRAL_EMBEDDING_MODELS: EmbeddingModel[] = [
  {
    name: "mistral-embed",
    dimension: 1024,
    maxTokens: 8192,
    provider: EmbeddingProviderName.MISTRAL,
    supportsBatch: true,
    costPerMillion: 0.1,
    description: "Mistral's production embedding model",
  },
];

/**
 * Default batch size for Mistral embeddings
 */
const DEFAULT_BATCH_SIZE = 100;

/**
 * Default timeout in milliseconds
 */
const DEFAULT_TIMEOUT = 60000;

/**
 * Mistral Embedding Provider
 * Generates embeddings using Mistral AI's embedding models
 */
export class MistralEmbeddingProvider extends BaseEmbeddingProvider<MistralEmbedderConfig> {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: MistralEmbedderConfig = {}) {
    super(config, EmbeddingProviderName.MISTRAL);
    this.apiKey = config.apiKey || process.env.MISTRAL_API_KEY || "";
    this.baseUrl = config.baseUrl || "https://api.mistral.ai/v1";
  }

  /**
   * Initialize the provider
   */
  async initialize(): Promise<void> {
    if (this.initialized) {return;}

    if (!this.apiKey) {
      throw new Error(
        "Mistral API key is required. Set MISTRAL_API_KEY environment variable or provide apiKey in config.",
      );
    }

    // Validate API key by making a small test request
    try {
      await this.embed("test", { debug: false });
      this.initialized = true;
      this.logDebug("Mistral embedding provider initialized successfully");
    } catch (error) {
      throw new Error(
        `Failed to initialize Mistral embedding provider: ${error instanceof Error ? error.message : String(error)}`,
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

    const response = await this.makeRequest([text], model);

    return {
      embedding: response.data[0].embedding,
      tokenCount: response.usage.total_tokens,
      model: response.model,
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
    let totalTokens = 0;

    // Split into batches and process
    const batches = this.splitIntoBatches(texts, batchSize);

    for (const batch of batches) {
      const response = await this.makeRequest(batch, model);

      // Sort by index to maintain order
      const sortedData = [...response.data].sort((a, b) => a.index - b.index);

      for (const item of sortedData) {
        embeddings.push({
          embedding: item.embedding,
          tokenCount: Math.floor(response.usage.total_tokens / batch.length),
          model: response.model,
        });
      }

      totalTokens += response.usage.total_tokens;

      if (this.config.debug) {
        this.logDebug(`Processed batch of ${batch.length} texts`, {
          tokensUsed: response.usage.total_tokens,
        });
      }
    }

    return {
      embeddings,
      totalTokens,
      model,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Get available models
   */
  getAvailableModels(): EmbeddingModel[] {
    return MISTRAL_EMBEDDING_MODELS;
  }

  /**
   * Get default model
   */
  getDefaultModel(): string {
    return this.config.defaultModel || "mistral-embed";
  }

  /**
   * Make API request to Mistral
   */
  private async makeRequest(
    input: string[],
    model: string,
  ): Promise<MistralEmbeddingResponse> {
    const timeout = this.config.timeout || DEFAULT_TIMEOUT;

    const body = {
      model,
      input,
      encoding_format: "float",
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      ...this.config.headers,
    };

    const fetchPromise = fetch(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const response = await this.withTimeout(
      fetchPromise,
      timeout,
      "Mistral embedding request",
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage =
          errorJson.message || errorJson.error?.message || errorText;
      } catch {
        errorMessage = errorText;
      }

      if (response.status === 401) {
        throw new Error(`Mistral authentication failed: ${errorMessage}`);
      } else if (response.status === 429) {
        throw new Error(`Mistral rate limit exceeded: ${errorMessage}`);
      } else if (response.status === 400) {
        throw new Error(`Mistral bad request: ${errorMessage}`);
      } else {
        throw new Error(
          `Mistral API error (${response.status}): ${errorMessage}`,
        );
      }
    }

    return response.json() as Promise<MistralEmbeddingResponse>;
  }
}

// Export configuration type
export type { MistralEmbedderConfig as MistralEmbeddingProviderConfig };
