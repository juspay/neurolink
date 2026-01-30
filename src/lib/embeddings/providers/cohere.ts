/**
 * Cohere Embedding Provider
 * Implements embedding generation using Cohere's embed models
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
  type CohereEmbeddingConfig,
} from "../../types/embeddingTypes.js";

/**
 * Cohere Embedding Provider Configuration
 */
export type CohereEmbedderConfig = CohereEmbeddingConfig;

/**
 * Cohere API response types
 */
type CohereEmbeddingResponse = {
  id: string;
  embeddings: number[][];
  texts: string[];
  meta: {
    api_version: {
      version: string;
    };
    billed_units?: {
      input_tokens?: number;
    };
  };
};

/**
 * Cohere embedding v2 response (for newer API)
 */
type CohereEmbeddingV2Response = {
  id: string;
  embeddings: {
    float?: number[][];
    int8?: number[][];
    uint8?: number[][];
    binary?: number[][];
    ubinary?: number[][];
  };
  texts: string[];
  meta?: {
    api_version?: {
      version: string;
    };
    billed_units?: {
      input_tokens?: number;
    };
  };
};

/**
 * Available Cohere embedding models
 */
const COHERE_EMBEDDING_MODELS: EmbeddingModel[] = [
  {
    name: "embed-v4",
    dimension: 1024,
    maxTokens: 512,
    provider: EmbeddingProviderName.COHERE,
    supportsBatch: true,
    costPerMillion: 0.1,
    description: "Latest Cohere model with best MTEB scores",
  },
  {
    name: "embed-english-v3.0",
    dimension: 1024,
    maxTokens: 512,
    provider: EmbeddingProviderName.COHERE,
    supportsBatch: true,
    costPerMillion: 0.1,
    description: "English-optimized embedding model",
  },
  {
    name: "embed-multilingual-v3.0",
    dimension: 1024,
    maxTokens: 512,
    provider: EmbeddingProviderName.COHERE,
    supportsBatch: true,
    costPerMillion: 0.1,
    description: "Multilingual embedding model supporting 100+ languages",
  },
  {
    name: "embed-english-light-v3.0",
    dimension: 384,
    maxTokens: 512,
    provider: EmbeddingProviderName.COHERE,
    supportsBatch: true,
    costPerMillion: 0.05,
    description: "Lightweight English embedding model",
  },
  {
    name: "embed-multilingual-light-v3.0",
    dimension: 384,
    maxTokens: 512,
    provider: EmbeddingProviderName.COHERE,
    supportsBatch: true,
    costPerMillion: 0.05,
    description: "Lightweight multilingual embedding model",
  },
];

/**
 * Default batch size for Cohere embeddings
 */
const DEFAULT_BATCH_SIZE = 96;

/**
 * Default timeout in milliseconds
 */
const DEFAULT_TIMEOUT = 60000;

/**
 * Map EmbedOptions inputType to Cohere input_type
 */
function mapInputType(
  inputType?: EmbedOptions["inputType"],
): "search_document" | "search_query" | "classification" | "clustering" {
  switch (inputType) {
    case "query":
      return "search_query";
    case "document":
    case "passage":
      return "search_document";
    case "clustering":
      return "clustering";
    default:
      return "search_document";
  }
}

/**
 * Cohere Embedding Provider
 * Generates embeddings using Cohere's embed models
 */
export class CohereEmbeddingProvider extends BaseEmbeddingProvider<CohereEmbedderConfig> {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: CohereEmbedderConfig = {}) {
    super(config, EmbeddingProviderName.COHERE);
    this.apiKey = config.apiKey || process.env.COHERE_API_KEY || "";
    this.baseUrl = config.baseUrl || "https://api.cohere.ai/v1";
  }

  /**
   * Initialize the provider
   */
  async initialize(): Promise<void> {
    if (this.initialized) {return;}

    if (!this.apiKey) {
      throw new Error(
        "Cohere API key is required. Set COHERE_API_KEY environment variable or provide apiKey in config.",
      );
    }

    // Validate API key by making a small test request
    try {
      await this.embed("test", { debug: false });
      this.initialized = true;
      this.logDebug("Cohere embedding provider initialized successfully");
    } catch (error) {
      throw new Error(
        `Failed to initialize Cohere embedding provider: ${error instanceof Error ? error.message : String(error)}`,
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
    const embeddings = this.extractEmbeddings(response);

    return {
      embedding: embeddings[0],
      tokenCount: response.meta?.billed_units?.input_tokens || 0,
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
    let totalTokens = 0;

    // Split into batches and process
    const batches = this.splitIntoBatches(texts, batchSize);

    for (const batch of batches) {
      const response = await this.makeRequest(batch, model, options);
      const batchEmbeddings = this.extractEmbeddings(response);
      const batchTokens = response.meta?.billed_units?.input_tokens || 0;

      for (const embedding of batchEmbeddings) {
        embeddings.push({
          embedding,
          tokenCount: Math.floor(batchTokens / batch.length),
          model,
        });
      }

      totalTokens += batchTokens;

      if (this.config.debug) {
        this.logDebug(`Processed batch of ${batch.length} texts`, {
          tokensUsed: batchTokens,
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
    return COHERE_EMBEDDING_MODELS;
  }

  /**
   * Get default model
   */
  getDefaultModel(): string {
    return this.config.defaultModel || "embed-v4";
  }

  /**
   * Extract embeddings from response (handles both v1 and v2 formats)
   */
  private extractEmbeddings(
    response: CohereEmbeddingResponse | CohereEmbeddingV2Response,
  ): number[][] {
    // Check for v2 response format
    if ("embeddings" in response && typeof response.embeddings === "object") {
      const embedObj =
        response.embeddings as CohereEmbeddingV2Response["embeddings"];
      if (embedObj && !Array.isArray(embedObj)) {
        // V2 format with embedding types
        return embedObj.float || embedObj.int8 || embedObj.uint8 || [];
      }
    }

    // V1 format - embeddings is directly an array
    if (Array.isArray(response.embeddings)) {
      return response.embeddings;
    }

    throw new Error("Unexpected Cohere response format");
  }

  /**
   * Make API request to Cohere
   */
  private async makeRequest(
    texts: string[],
    model: string,
    options?: EmbedOptions,
  ): Promise<CohereEmbeddingResponse | CohereEmbeddingV2Response> {
    const timeout = this.config.timeout || DEFAULT_TIMEOUT;

    const inputType = options?.inputType
      ? mapInputType(options.inputType)
      : this.config.inputType || "search_document";

    const body: Record<string, unknown> = {
      model,
      texts,
      input_type: inputType,
      embedding_types: ["float"],
    };

    // Add truncate parameter if specified
    if (options?.truncate !== undefined || this.config.truncate) {
      body.truncate =
        options?.truncate !== false ? this.config.truncate || "END" : "NONE";
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      ...this.config.headers,
    };

    const fetchPromise = fetch(`${this.baseUrl}/embed`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const response = await this.withTimeout(
      fetchPromise,
      timeout,
      "Cohere embedding request",
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorText;
      } catch {
        errorMessage = errorText;
      }

      if (response.status === 401) {
        throw new Error(`Cohere authentication failed: ${errorMessage}`);
      } else if (response.status === 429) {
        throw new Error(`Cohere rate limit exceeded: ${errorMessage}`);
      } else if (response.status === 400) {
        throw new Error(`Cohere bad request: ${errorMessage}`);
      } else {
        throw new Error(
          `Cohere API error (${response.status}): ${errorMessage}`,
        );
      }
    }

    return response.json() as Promise<
      CohereEmbeddingResponse | CohereEmbeddingV2Response
    >;
  }
}

// Export configuration type
export type { CohereEmbedderConfig as CohereEmbeddingProviderConfig };
