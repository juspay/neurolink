/**
 * Ollama Embedding Provider
 * Implements embedding generation using local Ollama models
 * Supports nomic-embed-text, mxbai-embed-large, and other embedding models
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
  type OllamaEmbeddingConfig,
} from "../../types/embeddingTypes.js";

/**
 * Ollama Embedding Provider Configuration
 */
export type OllamaEmbedderConfig = OllamaEmbeddingConfig;

/**
 * Ollama API response type
 */
type OllamaEmbeddingResponse = {
  embedding: number[];
  model?: string;
};

/**
 * Ollama batch embeddings response (v0.2.0+)
 */
type OllamaBatchEmbeddingResponse = {
  embeddings: number[][];
  model?: string;
};

/**
 * Available Ollama embedding models
 * Note: Actual availability depends on what's pulled locally
 */
const OLLAMA_EMBEDDING_MODELS: EmbeddingModel[] = [
  {
    name: "nomic-embed-text",
    dimension: 768,
    maxTokens: 8192,
    provider: EmbeddingProviderName.OLLAMA,
    supportsBatch: true,
    description: "High-quality open embedding model with long context",
  },
  {
    name: "mxbai-embed-large",
    dimension: 1024,
    maxTokens: 512,
    provider: EmbeddingProviderName.OLLAMA,
    supportsBatch: true,
    description: "Large embedding model with excellent quality",
  },
  {
    name: "all-minilm",
    dimension: 384,
    maxTokens: 256,
    provider: EmbeddingProviderName.OLLAMA,
    supportsBatch: true,
    description: "Fast and efficient MiniLM embedding model",
  },
  {
    name: "snowflake-arctic-embed",
    dimension: 1024,
    maxTokens: 512,
    provider: EmbeddingProviderName.OLLAMA,
    supportsBatch: true,
    description: "Snowflake Arctic embedding model",
  },
  {
    name: "bge-m3",
    dimension: 1024,
    maxTokens: 8192,
    provider: EmbeddingProviderName.OLLAMA,
    supportsBatch: true,
    description: "BGE-M3 multi-lingual embedding model",
  },
  {
    name: "bge-large",
    dimension: 1024,
    maxTokens: 512,
    provider: EmbeddingProviderName.OLLAMA,
    supportsBatch: true,
    description: "BGE large embedding model",
  },
];

/**
 * Default batch size for Ollama embeddings
 */
const DEFAULT_BATCH_SIZE = 32;

/**
 * Default timeout in milliseconds
 */
const DEFAULT_TIMEOUT = 120000;

/**
 * Ollama Embedding Provider
 * Generates embeddings using local Ollama models
 * Zero cost, private, and fast for local use
 */
export class OllamaEmbeddingProvider extends BaseEmbeddingProvider<OllamaEmbedderConfig> {
  private host: string;
  private ollamaVersion: string | null = null;

  constructor(config: OllamaEmbedderConfig = {}) {
    super(config, EmbeddingProviderName.OLLAMA);
    this.host =
      config.host ||
      config.baseUrl ||
      process.env.OLLAMA_HOST ||
      "http://localhost:11434";
    // Remove trailing slash if present
    if (this.host.endsWith("/")) {
      this.host = this.host.slice(0, -1);
    }
  }

  /**
   * Initialize the provider
   */
  async initialize(): Promise<void> {
    if (this.initialized) {return;}

    // Check if Ollama is running
    try {
      const versionResponse = await fetch(`${this.host}/api/version`, {
        method: "GET",
      });

      if (!versionResponse.ok) {
        throw new Error(`Ollama is not responding at ${this.host}`);
      }

      const versionData = (await versionResponse.json()) as { version: string };
      this.ollamaVersion = versionData.version;
      this.logDebug(`Connected to Ollama ${this.ollamaVersion}`);

      // Validate by making a small test request
      await this.embed("test", { debug: false });
      this.initialized = true;
      this.logDebug("Ollama embedding provider initialized successfully");
    } catch (error) {
      if (error instanceof Error && error.message.includes("ECONNREFUSED")) {
        throw new Error(
          `Ollama is not running at ${this.host}. Start Ollama with 'ollama serve' or set OLLAMA_HOST environment variable.`,
        );
      }
      throw new Error(
        `Failed to initialize Ollama embedding provider: ${error instanceof Error ? error.message : String(error)}`,
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

    const response = await this.makeRequest(text, model, options);

    return {
      embedding: response.embedding,
      tokenCount: 0, // Ollama doesn't provide token count
      model: response.model || model,
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

    // Check if Ollama supports batch embeddings (v0.2.0+)
    const supportsBatch =
      this.ollamaVersion &&
      this.compareVersions(this.ollamaVersion, "0.2.0") >= 0;

    // Split into batches
    const batches = this.splitIntoBatches(texts, batchSize);

    for (const batch of batches) {
      if (supportsBatch && batch.length > 1) {
        // Use batch API
        const response = await this.makeBatchRequest(batch, model, options);

        for (const embedding of response.embeddings) {
          embeddings.push({
            embedding,
            tokenCount: 0,
            model: response.model || model,
          });
        }
      } else {
        // Fall back to individual requests
        for (const text of batch) {
          const response = await this.makeRequest(text, model, options);
          embeddings.push({
            embedding: response.embedding,
            tokenCount: 0,
            model: response.model || model,
          });
        }
      }

      if (this.config.debug) {
        this.logDebug(`Processed batch of ${batch.length} texts`);
      }
    }

    return {
      embeddings,
      totalTokens: 0, // Ollama doesn't provide token counts
      model,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Get available models
   */
  getAvailableModels(): EmbeddingModel[] {
    return OLLAMA_EMBEDDING_MODELS;
  }

  /**
   * Get default model
   */
  getDefaultModel(): string {
    return this.config.defaultModel || "nomic-embed-text";
  }

  /**
   * List locally available embedding models
   */
  async listLocalModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.host}/api/tags`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to list Ollama models");
      }

      const data = (await response.json()) as {
        models: Array<{ name: string }>;
      };
      return data.models.map((m) => m.name);
    } catch (error) {
      this.logError("Failed to list local models", error);
      return [];
    }
  }

  /**
   * Pull a model if not available locally
   */
  async pullModel(modelName: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.host}/api/pull`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: modelName, stream: false }),
      });

      if (!response.ok) {
        throw new Error(`Failed to pull model ${modelName}`);
      }

      this.logInfo(`Successfully pulled model ${modelName}`);
      return true;
    } catch (error) {
      this.logError(`Failed to pull model ${modelName}`, error);
      return false;
    }
  }

  /**
   * Make API request to Ollama (single text)
   */
  private async makeRequest(
    prompt: string,
    model: string,
    _options?: EmbedOptions,
  ): Promise<OllamaEmbeddingResponse> {
    const timeout = this.config.timeout || DEFAULT_TIMEOUT;

    const body = {
      model,
      prompt,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.config.headers,
    };

    const fetchPromise = fetch(`${this.host}/api/embeddings`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const response = await this.withTimeout(
      fetchPromise,
      timeout,
      "Ollama embedding request",
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

      if (response.status === 404) {
        throw new Error(
          `Ollama model '${model}' not found. Pull it with: ollama pull ${model}`,
        );
      } else {
        throw new Error(
          `Ollama API error (${response.status}): ${errorMessage}`,
        );
      }
    }

    return response.json() as Promise<OllamaEmbeddingResponse>;
  }

  /**
   * Make batch API request to Ollama (v0.2.0+)
   */
  private async makeBatchRequest(
    inputs: string[],
    model: string,
    _options?: EmbedOptions,
  ): Promise<OllamaBatchEmbeddingResponse> {
    const timeout = this.config.timeout || DEFAULT_TIMEOUT;

    const body = {
      model,
      input: inputs,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.config.headers,
    };

    const fetchPromise = fetch(`${this.host}/api/embed`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const response = await this.withTimeout(
      fetchPromise,
      timeout,
      "Ollama batch embedding request",
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

      if (response.status === 404) {
        throw new Error(
          `Ollama model '${model}' not found. Pull it with: ollama pull ${model}`,
        );
      } else {
        throw new Error(
          `Ollama API error (${response.status}): ${errorMessage}`,
        );
      }
    }

    return response.json() as Promise<OllamaBatchEmbeddingResponse>;
  }

  /**
   * Compare version strings
   * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split(".").map(Number);
    const parts2 = v2.split(".").map(Number);
    const maxLen = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < maxLen; i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 < p2) {return -1;}
      if (p1 > p2) {return 1;}
    }

    return 0;
  }
}

// Export configuration type
export type { OllamaEmbedderConfig as OllamaEmbeddingProviderConfig };
