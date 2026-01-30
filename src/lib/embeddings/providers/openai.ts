/**
 * OpenAI Embedding Provider
 * Implements embedding generation using OpenAI's embedding models
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
  type OpenAIEmbeddingConfig,
} from "../../types/embeddingTypes.js";

/**
 * OpenAI Embedding Provider Configuration
 */
export type OpenAIEmbedderConfig = OpenAIEmbeddingConfig;

/**
 * OpenAI API response types
 */
type OpenAIEmbeddingResponse = {
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
 * Available OpenAI embedding models
 */
const OPENAI_EMBEDDING_MODELS: EmbeddingModel[] = [
  {
    name: "text-embedding-3-small",
    dimension: 1536,
    maxTokens: 8191,
    provider: EmbeddingProviderName.OPENAI,
    supportsBatch: true,
    costPerMillion: 0.02,
    description: "Fast and efficient, supports dimension reduction",
  },
  {
    name: "text-embedding-3-large",
    dimension: 3072,
    maxTokens: 8191,
    provider: EmbeddingProviderName.OPENAI,
    supportsBatch: true,
    costPerMillion: 0.13,
    description: "Highest quality, supports dimension reduction",
  },
  {
    name: "text-embedding-ada-002",
    dimension: 1536,
    maxTokens: 8191,
    provider: EmbeddingProviderName.OPENAI,
    supportsBatch: true,
    costPerMillion: 0.1,
    description: "Legacy model, still widely used",
  },
];

/**
 * Default batch size for OpenAI embeddings
 */
const DEFAULT_BATCH_SIZE = 100;

/**
 * Default timeout in milliseconds
 */
const DEFAULT_TIMEOUT = 60000;

/**
 * OpenAI Embedding Provider
 * Generates embeddings using OpenAI's text-embedding models
 */
export class OpenAIEmbeddingProvider extends BaseEmbeddingProvider<OpenAIEmbedderConfig> {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: OpenAIEmbedderConfig = {}) {
    super(config, EmbeddingProviderName.OPENAI);
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || "";
    this.baseUrl = config.baseUrl || "https://api.openai.com/v1";
  }

  /**
   * Initialize the provider
   */
  async initialize(): Promise<void> {
    if (this.initialized) {return;}

    if (!this.apiKey) {
      throw new Error(
        "OpenAI API key is required. Set OPENAI_API_KEY environment variable or provide apiKey in config.",
      );
    }

    // Validate API key by making a small test request
    try {
      await this.embed("test", { debug: false });
      this.initialized = true;
      this.logDebug("OpenAI embedding provider initialized successfully");
    } catch (error) {
      throw new Error(
        `Failed to initialize OpenAI embedding provider: ${error instanceof Error ? error.message : String(error)}`,
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
    return OPENAI_EMBEDDING_MODELS;
  }

  /**
   * Get default model
   */
  getDefaultModel(): string {
    return this.config.defaultModel || "text-embedding-3-small";
  }

  /**
   * Make API request to OpenAI
   */
  private async makeRequest(
    input: string[],
    model: string,
    options?: EmbedOptions,
  ): Promise<OpenAIEmbeddingResponse> {
    const timeout = this.config.timeout || DEFAULT_TIMEOUT;

    const body: Record<string, unknown> = {
      model,
      input,
    };

    // Add dimensions parameter for models that support it
    if (options?.dimensions && model.includes("text-embedding-3")) {
      body.dimensions = options.dimensions;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      ...this.config.headers,
    };

    if (this.config.organization) {
      headers["OpenAI-Organization"] = this.config.organization;
    }

    const fetchPromise = fetch(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const response = await this.withTimeout(
      fetchPromise,
      timeout,
      "OpenAI embedding request",
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorText;
      } catch {
        errorMessage = errorText;
      }

      if (response.status === 401) {
        throw new Error(`OpenAI authentication failed: ${errorMessage}`);
      } else if (response.status === 429) {
        throw new Error(`OpenAI rate limit exceeded: ${errorMessage}`);
      } else if (response.status === 400) {
        throw new Error(`OpenAI bad request: ${errorMessage}`);
      } else {
        throw new Error(
          `OpenAI API error (${response.status}): ${errorMessage}`,
        );
      }
    }

    return response.json() as Promise<OpenAIEmbeddingResponse>;
  }
}

// Export configuration type
export type { OpenAIEmbedderConfig as OpenAIEmbeddingProviderConfig };
