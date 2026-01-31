/**
 * Vertex AI Embedder
 *
 * Embedder implementation using Google Vertex AI embedding models.
 * Supports text-embedding-004 and other Vertex AI embedding models.
 *
 * @module memory/embedders/vertexEmbedder
 * @since 9.0.0
 */

import type {
  Embedder,
  EmbedderConfig,
  EmbedderModelInfo,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";

/**
 * Vertex AI embedding model specifications
 */
const VERTEX_EMBEDDING_MODELS: Record<
  string,
  { dimensions: number; maxTokens: number }
> = {
  "text-embedding-004": { dimensions: 768, maxTokens: 2048 },
  "text-embedding-005": { dimensions: 768, maxTokens: 2048 },
  "textembedding-gecko@001": { dimensions: 768, maxTokens: 2048 },
  "textembedding-gecko@003": { dimensions: 768, maxTokens: 2048 },
  "textembedding-gecko-multilingual@001": { dimensions: 768, maxTokens: 2048 },
  "text-multilingual-embedding-002": { dimensions: 768, maxTokens: 2048 },
};

/**
 * Default batch size for embedding requests
 */
const DEFAULT_BATCH_SIZE = 100;

/**
 * Vertex AI embedder using the Vertex AI API
 *
 * Prerequisites:
 * - Google Cloud project with Vertex AI API enabled
 * - Authentication via GOOGLE_APPLICATION_CREDENTIALS or gcloud CLI
 * - Project ID via config.projectId or GOOGLE_CLOUD_PROJECT env var
 */
export class VertexEmbedder implements Embedder {
  private config: EmbedderConfig;
  private projectId: string;
  private region: string;
  private modelInfo: EmbedderModelInfo;
  private isInitialized = false;
  private accessToken?: string;
  private tokenExpiry?: number;

  constructor(config: EmbedderConfig) {
    this.config = config;
    this.projectId =
      config.config?.projectId ?? process.env.GOOGLE_CLOUD_PROJECT ?? "";
    this.region = config.config?.region ?? "us-central1";

    const modelSpec = VERTEX_EMBEDDING_MODELS[config.model] ?? {
      dimensions: config.config?.dimensions ?? 768,
      maxTokens: 2048,
    };

    this.modelInfo = {
      provider: "vertex",
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

    if (!this.projectId) {
      throw new Error(
        "Google Cloud Project ID not configured. Set GOOGLE_CLOUD_PROJECT environment variable or provide projectId in config.",
      );
    }

    // Get access token using ADC (Application Default Credentials)
    await this.refreshAccessToken();

    this.isInitialized = true;

    logger.debug("[VertexEmbedder] Initialized", {
      model: this.config.model,
      dimensions: this.modelInfo.dimensions,
      projectId: this.projectId,
      region: this.region,
    });
  }

  /**
   * Refresh the access token using Application Default Credentials
   */
  private async refreshAccessToken(): Promise<void> {
    try {
      // Try to use gcloud CLI for access token (most common local setup)
      const { execSync } = await import("child_process");
      const token = execSync("gcloud auth print-access-token", {
        encoding: "utf-8",
      }).trim();
      this.accessToken = token;
      // Token typically expires in 1 hour, refresh 5 minutes early
      this.tokenExpiry = Date.now() + 55 * 60 * 1000;
    } catch {
      // Fallback: try to use metadata server (for GCP environments)
      try {
        const response = await fetch(
          "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
          {
            headers: { "Metadata-Flavor": "Google" },
          },
        );

        if (response.ok) {
          const data = (await response.json()) as {
            access_token: string;
            expires_in: number;
          };
          this.accessToken = data.access_token;
          this.tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;
        } else {
          throw new Error("Failed to get token from metadata server");
        }
      } catch {
        throw new Error(
          "Failed to authenticate with Google Cloud. Ensure you have run 'gcloud auth login' " +
            "or set GOOGLE_APPLICATION_CREDENTIALS environment variable.",
        );
      }
    }
  }

  /**
   * Ensure access token is valid
   */
  private async ensureValidToken(): Promise<void> {
    if (
      !this.accessToken ||
      !this.tokenExpiry ||
      Date.now() >= this.tokenExpiry
    ) {
      await this.refreshAccessToken();
    }
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

    await this.ensureValidToken();

    const endpoint = `https://${this.region}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.region}/publishers/google/models/${this.config.model}:predict`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({
        instances: [{ content: text }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("[VertexEmbedder] Embedding request failed", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(
        `Vertex AI embedding failed: ${response.status} - ${errorText}`,
      );
    }

    const result = (await response.json()) as {
      predictions: Array<{ embeddings: { values: number[] } }>;
    };

    logger.debug("[VertexEmbedder] Embedded text", {
      model: this.config.model,
      inputLength: text.length,
    });

    return result.predictions[0].embeddings.values;
  }

  /**
   * Embed multiple texts in batch
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    await this.ensureValidToken();

    const batchSize = this.config.batchSize ?? DEFAULT_BATCH_SIZE;
    const results: number[][] = [];

    const endpoint = `https://${this.region}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.region}/publishers/google/models/${this.config.model}:predict`;

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          instances: batch.map((text) => ({ content: text })),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("[VertexEmbedder] Batch embedding request failed", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          batchIndex: i,
          batchSize: batch.length,
        });
        throw new Error(
          `Vertex AI batch embedding failed: ${response.status} - ${errorText}`,
        );
      }

      const result = (await response.json()) as {
        predictions: Array<{ embeddings: { values: number[] } }>;
      };

      const embeddings = result.predictions.map((p) => p.embeddings.values);
      results.push(...embeddings);

      logger.debug("[VertexEmbedder] Embedded batch", {
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
    return { ...this.modelInfo };
  }
}
