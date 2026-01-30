/**
 * Google Vertex AI Embedding Provider
 * Implements embedding generation using Google's text-embedding models
 * Supports text-embedding-004 and text-embedding-005
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
  type GoogleEmbeddingConfig,
} from "../../types/embeddingTypes.js";

/**
 * Google Embedding Provider Configuration
 */
export type GoogleEmbedderConfig = GoogleEmbeddingConfig;

/**
 * Google API response types
 */
type GoogleEmbeddingResponse = {
  predictions: Array<{
    embeddings: {
      values: number[];
      statistics?: {
        truncated: boolean;
        token_count: number;
      };
    };
  }>;
  metadata?: {
    billableCharacterCount?: number;
  };
};

/**
 * Google AI Studio response format (Generative Language API)
 */
type GoogleAIStudioEmbeddingResponse = {
  embedding: {
    values: number[];
  };
};

/**
 * Google AI Studio batch response format
 */
type GoogleAIStudioBatchEmbeddingResponse = {
  embeddings: Array<{
    values: number[];
  }>;
};

/**
 * Available Google embedding models
 */
const GOOGLE_EMBEDDING_MODELS: EmbeddingModel[] = [
  {
    name: "text-embedding-004",
    dimension: 768,
    maxTokens: 2048,
    provider: EmbeddingProviderName.GOOGLE,
    supportsBatch: true,
    description: "Google's latest embedding model with excellent quality",
  },
  {
    name: "text-embedding-005",
    dimension: 768,
    maxTokens: 2048,
    provider: EmbeddingProviderName.GOOGLE,
    supportsBatch: true,
    description: "Google's newest embedding model with improved performance",
  },
  {
    name: "textembedding-gecko@003",
    dimension: 768,
    maxTokens: 3072,
    provider: EmbeddingProviderName.GOOGLE,
    supportsBatch: true,
    description: "Vertex AI Gecko embedding model",
  },
  {
    name: "textembedding-gecko-multilingual@001",
    dimension: 768,
    maxTokens: 3072,
    provider: EmbeddingProviderName.GOOGLE,
    supportsBatch: true,
    description: "Multilingual Gecko embedding model",
  },
];

/**
 * Default batch size for Google embeddings
 */
const DEFAULT_BATCH_SIZE = 100;

/**
 * Default timeout in milliseconds
 */
const DEFAULT_TIMEOUT = 60000;

/**
 * Map task type from EmbedOptions to Google's task_type
 */
function mapTaskType(
  inputType?: EmbedOptions["inputType"],
): string | undefined {
  switch (inputType) {
    case "query":
      return "RETRIEVAL_QUERY";
    case "document":
    case "passage":
      return "RETRIEVAL_DOCUMENT";
    case "clustering":
      return "CLUSTERING";
    default:
      return undefined;
  }
}

/**
 * Google Vertex AI Embedding Provider
 * Generates embeddings using Google's text-embedding models
 */
export class GoogleEmbeddingProvider extends BaseEmbeddingProvider<GoogleEmbedderConfig> {
  private apiKey: string;
  private baseUrl: string;
  private useVertexAI: boolean;
  private projectId?: string;
  private location?: string;

  constructor(config: GoogleEmbedderConfig = {}) {
    super(config, EmbeddingProviderName.GOOGLE);
    this.apiKey =
      config.apiKey ||
      process.env.GOOGLE_API_KEY ||
      process.env.GEMINI_API_KEY ||
      "";

    // Determine if using Vertex AI or AI Studio based on config/environment
    this.projectId =
      process.env.GOOGLE_CLOUD_PROJECT || process.env.VERTEX_PROJECT_ID;
    this.location =
      process.env.GOOGLE_CLOUD_LOCATION ||
      process.env.VERTEX_LOCATION ||
      "us-central1";
    this.useVertexAI =
      !!this.projectId && !!process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (this.useVertexAI && this.projectId) {
      // Vertex AI endpoint
      this.baseUrl =
        config.baseUrl ||
        `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models`;
    } else {
      // AI Studio endpoint (Generative Language API)
      this.baseUrl =
        config.baseUrl || "https://generativelanguage.googleapis.com/v1beta";
    }
  }

  /**
   * Initialize the provider
   */
  async initialize(): Promise<void> {
    if (this.initialized) {return;}

    if (!this.apiKey && !this.useVertexAI) {
      throw new Error(
        "Google API key is required. Set GOOGLE_API_KEY or GEMINI_API_KEY environment variable, or provide apiKey in config. " +
          "For Vertex AI, set GOOGLE_CLOUD_PROJECT and GOOGLE_APPLICATION_CREDENTIALS.",
      );
    }

    // Validate by making a small test request
    try {
      await this.embed("test", { debug: false });
      this.initialized = true;
      this.logDebug("Google embedding provider initialized successfully");
    } catch (error) {
      throw new Error(
        `Failed to initialize Google embedding provider: ${error instanceof Error ? error.message : String(error)}`,
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

    if (this.useVertexAI) {
      const response = await this.makeVertexAIRequest([text], model, options);
      const prediction = response.predictions[0];

      return {
        embedding: prediction.embeddings.values,
        tokenCount: prediction.embeddings.statistics?.token_count || 0,
        model,
        processingTimeMs: Date.now() - startTime,
      };
    } else {
      const response = await this.makeAIStudioRequest(text, model, options);

      return {
        embedding: response.embedding.values,
        tokenCount: 0, // AI Studio doesn't provide token count in single embed
        model,
        processingTimeMs: Date.now() - startTime,
      };
    }
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
      if (this.useVertexAI) {
        const response = await this.makeVertexAIRequest(batch, model, options);

        for (const prediction of response.predictions) {
          const tokenCount = prediction.embeddings.statistics?.token_count || 0;
          embeddings.push({
            embedding: prediction.embeddings.values,
            tokenCount,
            model,
          });
          totalTokens += tokenCount;
        }
      } else {
        const response = await this.makeAIStudioBatchRequest(
          batch,
          model,
          options,
        );

        for (const embedding of response.embeddings) {
          embeddings.push({
            embedding: embedding.values,
            tokenCount: 0,
            model,
          });
        }
      }

      if (this.config.debug) {
        this.logDebug(`Processed batch of ${batch.length} texts`);
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
    return GOOGLE_EMBEDDING_MODELS;
  }

  /**
   * Get default model
   */
  getDefaultModel(): string {
    return this.config.defaultModel || "text-embedding-004";
  }

  /**
   * Make API request to Vertex AI
   */
  private async makeVertexAIRequest(
    texts: string[],
    model: string,
    options?: EmbedOptions,
  ): Promise<GoogleEmbeddingResponse> {
    const timeout = this.config.timeout || DEFAULT_TIMEOUT;
    const taskType = options?.inputType
      ? mapTaskType(options.inputType)
      : this.config.taskType;

    const instances = texts.map((text) => ({
      content: text,
      ...(taskType && { task_type: taskType }),
    }));

    const body = {
      instances,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.config.headers,
    };

    // For Vertex AI, we need to get an access token
    // This typically uses Application Default Credentials
    const accessToken = await this.getAccessToken();
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const fetchPromise = fetch(`${this.baseUrl}/${model}:predict`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const response = await this.withTimeout(
      fetchPromise,
      timeout,
      "Google Vertex AI embedding request",
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

      if (response.status === 401 || response.status === 403) {
        throw new Error(`Google authentication failed: ${errorMessage}`);
      } else if (response.status === 429) {
        throw new Error(`Google rate limit exceeded: ${errorMessage}`);
      } else if (response.status === 400) {
        throw new Error(`Google bad request: ${errorMessage}`);
      } else {
        throw new Error(
          `Google API error (${response.status}): ${errorMessage}`,
        );
      }
    }

    return response.json() as Promise<GoogleEmbeddingResponse>;
  }

  /**
   * Make API request to AI Studio (single text)
   */
  private async makeAIStudioRequest(
    text: string,
    model: string,
    options?: EmbedOptions,
  ): Promise<GoogleAIStudioEmbeddingResponse> {
    const timeout = this.config.timeout || DEFAULT_TIMEOUT;
    const taskType = options?.inputType
      ? mapTaskType(options.inputType)
      : this.config.taskType;

    const body: Record<string, unknown> = {
      model: `models/${model}`,
      content: {
        parts: [{ text }],
      },
    };

    if (taskType) {
      body.taskType = taskType;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.config.headers,
    };

    const url = `${this.baseUrl}/models/${model}:embedContent?key=${this.apiKey}`;

    const fetchPromise = fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const response = await this.withTimeout(
      fetchPromise,
      timeout,
      "Google AI Studio embedding request",
    );

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    return response.json() as Promise<GoogleAIStudioEmbeddingResponse>;
  }

  /**
   * Make batch API request to AI Studio
   */
  private async makeAIStudioBatchRequest(
    texts: string[],
    model: string,
    options?: EmbedOptions,
  ): Promise<GoogleAIStudioBatchEmbeddingResponse> {
    const timeout = this.config.timeout || DEFAULT_TIMEOUT;
    const taskType = options?.inputType
      ? mapTaskType(options.inputType)
      : this.config.taskType;

    const requests = texts.map((text) => ({
      model: `models/${model}`,
      content: {
        parts: [{ text }],
      },
      ...(taskType && { taskType }),
    }));

    const body = { requests };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.config.headers,
    };

    const url = `${this.baseUrl}/models/${model}:batchEmbedContents?key=${this.apiKey}`;

    const fetchPromise = fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const response = await this.withTimeout(
      fetchPromise,
      timeout,
      "Google AI Studio batch embedding request",
    );

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    return response.json() as Promise<GoogleAIStudioBatchEmbeddingResponse>;
  }

  /**
   * Handle error response
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    const errorText = await response.text();
    let errorMessage: string;

    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorText;
    } catch {
      errorMessage = errorText;
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error(`Google authentication failed: ${errorMessage}`);
    } else if (response.status === 429) {
      throw new Error(`Google rate limit exceeded: ${errorMessage}`);
    } else if (response.status === 400) {
      throw new Error(`Google bad request: ${errorMessage}`);
    } else {
      throw new Error(`Google API error (${response.status}): ${errorMessage}`);
    }
  }

  /**
   * Get access token for Vertex AI (using Application Default Credentials)
   */
  private async getAccessToken(): Promise<string | null> {
    if (!this.useVertexAI) {
      return null;
    }

    try {
      // Try to get token from gcloud CLI or metadata server
      const { GoogleAuth } = await import("google-auth-library");
      const auth = new GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      });
      const client = await auth.getClient();
      const token = await client.getAccessToken();
      return token.token || null;
    } catch (error) {
      this.logDebug(
        "Failed to get Vertex AI access token, falling back to API key",
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return null;
    }
  }
}

// Export configuration type
export type { GoogleEmbedderConfig as GoogleEmbeddingProviderConfig };
