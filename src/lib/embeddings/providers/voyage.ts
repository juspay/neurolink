/**
 * Voyage AI Embedding Provider
 * Implements embedding generation using Voyage AI's embedding models
 * Known for excellent retrieval accuracy and long context support
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
  type VoyageEmbeddingConfig,
} from "../../types/embeddingTypes.js";

/**
 * Voyage AI Embedding Provider Configuration
 */
export type VoyageEmbedderConfig = VoyageEmbeddingConfig;

/**
 * Voyage AI API response types
 */
type VoyageEmbeddingResponse = {
  object: string;
  data: Array<{
    object: string;
    index: number;
    embedding: number[];
  }>;
  model: string;
  usage: {
    total_tokens: number;
  };
};

/**
 * Available Voyage AI embedding models
 */
const VOYAGE_EMBEDDING_MODELS: EmbeddingModel[] = [
  {
    name: "voyage-3-large",
    dimension: 1536,
    maxTokens: 32000,
    provider: EmbeddingProviderName.VOYAGE,
    supportsBatch: true,
    costPerMillion: 0.12,
    description: "Best retrieval accuracy with 32K context",
  },
  {
    name: "voyage-3",
    dimension: 1024,
    maxTokens: 32000,
    provider: EmbeddingProviderName.VOYAGE,
    supportsBatch: true,
    costPerMillion: 0.06,
    description: "Balanced quality and cost with long context",
  },
  {
    name: "voyage-3-lite",
    dimension: 512,
    maxTokens: 32000,
    provider: EmbeddingProviderName.VOYAGE,
    supportsBatch: true,
    costPerMillion: 0.02,
    description: "Budget-friendly with long context support",
  },
  {
    name: "voyage-code-2",
    dimension: 1536,
    maxTokens: 16000,
    provider: EmbeddingProviderName.VOYAGE,
    supportsBatch: true,
    costPerMillion: 0.12,
    description: "Optimized for code retrieval and understanding",
  },
  {
    name: "voyage-code-3",
    dimension: 1024,
    maxTokens: 32000,
    provider: EmbeddingProviderName.VOYAGE,
    supportsBatch: true,
    costPerMillion: 0.12,
    description: "Latest code-optimized model with improved accuracy",
  },
  {
    name: "voyage-finance-2",
    dimension: 1024,
    maxTokens: 32000,
    provider: EmbeddingProviderName.VOYAGE,
    supportsBatch: true,
    costPerMillion: 0.12,
    description: "Specialized for financial documents",
  },
  {
    name: "voyage-law-2",
    dimension: 1024,
    maxTokens: 32000,
    provider: EmbeddingProviderName.VOYAGE,
    supportsBatch: true,
    costPerMillion: 0.12,
    description: "Specialized for legal documents",
  },
  {
    name: "voyage-multilingual-2",
    dimension: 1024,
    maxTokens: 32000,
    provider: EmbeddingProviderName.VOYAGE,
    supportsBatch: true,
    costPerMillion: 0.12,
    description: "Multilingual embedding model",
  },
];

/**
 * Default batch size for Voyage AI embeddings
 */
const DEFAULT_BATCH_SIZE = 128;

/**
 * Default timeout in milliseconds
 */
const DEFAULT_TIMEOUT = 60000;

/**
 * Voyage AI Embedding Provider
 * Generates embeddings using Voyage AI's embedding models
 * Features: Best-in-class retrieval accuracy, 32K context, domain-specific models
 */
export class VoyageEmbeddingProvider extends BaseEmbeddingProvider<VoyageEmbedderConfig> {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: VoyageEmbedderConfig = {}) {
    super(config, EmbeddingProviderName.VOYAGE);
    this.apiKey = config.apiKey || process.env.VOYAGE_API_KEY || "";
    this.baseUrl = config.baseUrl || "https://api.voyageai.com/v1";
  }

  /**
   * Initialize the provider
   */
  async initialize(): Promise<void> {
    if (this.initialized) {return;}

    if (!this.apiKey) {
      throw new Error(
        "Voyage API key is required. Set VOYAGE_API_KEY environment variable or provide apiKey in config.",
      );
    }

    // Validate API key by making a small test request
    try {
      await this.embed("test", { debug: false });
      this.initialized = true;
      this.logDebug("Voyage AI embedding provider initialized successfully");
    } catch (error) {
      throw new Error(
        `Failed to initialize Voyage AI embedding provider: ${error instanceof Error ? error.message : String(error)}`,
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
      const response = await this.makeRequest(batch, model, options);

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
    return VOYAGE_EMBEDDING_MODELS;
  }

  /**
   * Get default model
   */
  getDefaultModel(): string {
    return this.config.defaultModel || "voyage-3";
  }

  /**
   * Make API request to Voyage AI
   */
  private async makeRequest(
    input: string[],
    model: string,
    options?: EmbedOptions,
  ): Promise<VoyageEmbeddingResponse> {
    const timeout = this.config.timeout || DEFAULT_TIMEOUT;

    const body: Record<string, unknown> = {
      model,
      input,
    };

    // Add input_type for models that support it
    const inputType = options?.inputType || this.config.inputType;
    if (inputType) {
      body.input_type = inputType;
    }

    // Add truncate parameter
    if (options?.truncate !== undefined || this.config.truncate !== undefined) {
      body.truncation = options?.truncate ?? this.config.truncate ?? true;
    }

    // Add output_dimension for dimension reduction (Voyage supports this)
    if (options?.dimensions) {
      body.output_dimension = options.dimensions;
    }

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
      "Voyage AI embedding request",
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.detail || errorJson.error || errorText;
      } catch {
        errorMessage = errorText;
      }

      if (response.status === 401) {
        throw new Error(`Voyage AI authentication failed: ${errorMessage}`);
      } else if (response.status === 429) {
        throw new Error(`Voyage AI rate limit exceeded: ${errorMessage}`);
      } else if (response.status === 400) {
        throw new Error(`Voyage AI bad request: ${errorMessage}`);
      } else {
        throw new Error(
          `Voyage AI API error (${response.status}): ${errorMessage}`,
        );
      }
    }

    return response.json() as Promise<VoyageEmbeddingResponse>;
  }
}

// Export configuration type
export type { VoyageEmbedderConfig as VoyageEmbeddingProviderConfig };
