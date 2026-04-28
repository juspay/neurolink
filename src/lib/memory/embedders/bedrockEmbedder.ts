/**
 * Bedrock Embedder
 *
 * Embedder implementation using AWS Bedrock's Titan embedding models.
 * Supports amazon.titan-embed-text-v1, amazon.titan-embed-text-v2, and Cohere models on Bedrock.
 *
 * @module memory/embedders/bedrockEmbedder
 * @since 9.0.0
 */

import type {
  Embedder,
  EmbedderConfig,
  EmbedderModelInfo,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";

/**
 * Bedrock embedding model specifications
 */
const BEDROCK_EMBEDDING_MODELS: Record<
  string,
  { dimensions: number; maxTokens: number }
> = {
  "amazon.titan-embed-text-v1": { dimensions: 1536, maxTokens: 8192 },
  "amazon.titan-embed-text-v2:0": { dimensions: 1024, maxTokens: 8192 },
  "amazon.titan-embed-image-v1": { dimensions: 1024, maxTokens: 128 },
  "cohere.embed-english-v3": { dimensions: 1024, maxTokens: 512 },
  "cohere.embed-multilingual-v3": { dimensions: 1024, maxTokens: 512 },
};

/**
 * Default batch size for embedding requests
 */
const DEFAULT_BATCH_SIZE = 25;

import type { MemoryAWSCredentials } from "../../types/index.js";

/**
 * Bedrock embedder using AWS Bedrock Runtime API
 *
 * Prerequisites:
 * - AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, optionally AWS_SESSION_TOKEN)
 * - AWS region (AWS_REGION or config.region)
 * - Bedrock model access enabled for the chosen model
 */
export class BedrockEmbedder implements Embedder {
  private config: EmbedderConfig;
  private credentials: MemoryAWSCredentials;
  private region: string;
  private modelInfo: EmbedderModelInfo;
  private isInitialized = false;

  constructor(config: EmbedderConfig) {
    this.config = config;
    this.region =
      config.config?.region ?? process.env.AWS_REGION ?? "us-east-1";

    this.credentials = {
      accessKeyId: config.config?.apiKey ?? process.env.AWS_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
      sessionToken: process.env.AWS_SESSION_TOKEN,
    };

    const modelSpec = BEDROCK_EMBEDDING_MODELS[config.model] ?? {
      dimensions: config.config?.dimensions ?? 1536,
      maxTokens: 8192,
    };

    this.modelInfo = {
      provider: "bedrock",
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

    if (!this.credentials.accessKeyId || !this.credentials.secretAccessKey) {
      throw new Error(
        "AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.",
      );
    }

    this.isInitialized = true;

    logger.debug("[BedrockEmbedder] Initialized", {
      model: this.config.model,
      dimensions: this.modelInfo.dimensions,
      region: this.region,
    });
  }

  /**
   * Get the dimensions of the embedding model
   */
  getDimensions(): number {
    return this.modelInfo.dimensions;
  }

  /**
   * Create AWS Signature V4 headers for Bedrock API requests
   */
  private async createSignedHeaders(
    method: string,
    path: string,
    body: string,
  ): Promise<Record<string, string>> {
    const host = `bedrock-runtime.${this.region}.amazonaws.com`;
    const service = "bedrock";
    const datetime = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const date = datetime.slice(0, 8);

    // Create canonical request components
    const canonicalHeaders = [
      `host:${host}`,
      `x-amz-date:${datetime}`,
      this.credentials.sessionToken
        ? `x-amz-security-token:${this.credentials.sessionToken}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const signedHeaders = this.credentials.sessionToken
      ? "host;x-amz-date;x-amz-security-token"
      : "host;x-amz-date";

    // Hash the payload
    const payloadHash = await this.sha256(body);

    // Create canonical request
    const canonicalRequest = [
      method,
      path,
      "", // query string
      canonicalHeaders + "\n",
      signedHeaders,
      payloadHash,
    ].join("\n");

    // Create string to sign
    const credentialScope = `${date}/${this.region}/${service}/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      datetime,
      credentialScope,
      await this.sha256(canonicalRequest),
    ].join("\n");

    // Create signing key
    const signingKey = await this.getSignatureKey(
      this.credentials.secretAccessKey,
      date,
      this.region,
      service,
    );

    // Create signature
    const signature = await this.hmacHex(signingKey, stringToSign);

    // Create authorization header
    const authorization = `AWS4-HMAC-SHA256 Credential=${this.credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Host: host,
      "X-Amz-Date": datetime,
      Authorization: authorization,
    };

    if (this.credentials.sessionToken) {
      headers["X-Amz-Security-Token"] = this.credentials.sessionToken;
    }

    return headers;
  }

  /**
   * SHA256 hash helper
   */
  private async sha256(message: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * HMAC-SHA256 helper
   */
  private async hmac(key: BufferSource, message: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      key,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    return await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
  }

  /**
   * HMAC-SHA256 returning hex string
   */
  private async hmacHex(key: ArrayBuffer, message: string): Promise<string> {
    const result = await this.hmac(key, message);
    return Array.from(new Uint8Array(result))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Get AWS signature key
   */
  private async getSignatureKey(
    secretKey: string,
    date: string,
    region: string,
    service: string,
  ): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const kDate = await this.hmac(encoder.encode(`AWS4${secretKey}`), date);
    const kRegion = await this.hmac(kDate, region);
    const kService = await this.hmac(kRegion, service);
    return await this.hmac(kService, "aws4_request");
  }

  /**
   * Build request body based on model type
   */
  private buildRequestBody(text: string): string {
    // Titan models use inputText
    if (this.config.model.startsWith("amazon.titan")) {
      return JSON.stringify({ inputText: text });
    }

    // Cohere models on Bedrock use texts array
    if (this.config.model.startsWith("cohere.")) {
      return JSON.stringify({
        texts: [text],
        input_type: "search_document",
      });
    }

    // Default to Titan format
    return JSON.stringify({ inputText: text });
  }

  /**
   * Build batch request body based on model type
   */
  private buildBatchRequestBody(texts: string[]): string {
    // Cohere models support batch natively
    if (this.config.model.startsWith("cohere.")) {
      return JSON.stringify({
        texts,
        input_type: "search_document",
      });
    }

    // Titan models don't support batch, so this shouldn't be called
    throw new Error("Batch embedding not supported for this model type");
  }

  /**
   * Parse response based on model type
   */
  private parseResponse(data: unknown): number[] {
    const response = data as Record<string, unknown>;

    // Titan models return embedding directly
    if (response.embedding) {
      return response.embedding as number[];
    }

    // Cohere models return embeddings array
    if (response.embeddings) {
      return (response.embeddings as number[][])[0];
    }

    throw new Error("Unexpected response format from Bedrock");
  }

  /**
   * Parse batch response based on model type
   */
  private parseBatchResponse(data: unknown): number[][] {
    const response = data as Record<string, unknown>;

    // Cohere models return embeddings array
    if (response.embeddings) {
      return response.embeddings as number[][];
    }

    throw new Error("Unexpected batch response format from Bedrock");
  }

  /**
   * Embed a single text
   */
  async embed(text: string): Promise<number[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const path = `/model/${this.config.model}/invoke`;
    const body = this.buildRequestBody(text);

    const headers = await this.createSignedHeaders("POST", path, body);

    const response = await fetch(
      `https://bedrock-runtime.${this.region}.amazonaws.com${path}`,
      {
        method: "POST",
        headers,
        body,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("[BedrockEmbedder] Embedding request failed", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(
        `Bedrock embedding failed: ${response.status} - ${errorText}`,
      );
    }

    const result = await response.json();
    const embedding = this.parseResponse(result);

    logger.debug("[BedrockEmbedder] Embedded text", {
      model: this.config.model,
      inputLength: text.length,
      dimensions: embedding.length,
    });

    return embedding;
  }

  /**
   * Embed multiple texts in batch
   * Note: Titan models don't support batch, so we process sequentially
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const batchSize = this.config.batchSize ?? DEFAULT_BATCH_SIZE;

    // Cohere models on Bedrock support batch natively
    if (this.config.model.startsWith("cohere.")) {
      const results: number[][] = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const path = `/model/${this.config.model}/invoke`;
        const body = this.buildBatchRequestBody(batch);

        const headers = await this.createSignedHeaders("POST", path, body);

        const response = await fetch(
          `https://bedrock-runtime.${this.region}.amazonaws.com${path}`,
          {
            method: "POST",
            headers,
            body,
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          logger.error("[BedrockEmbedder] Batch embedding request failed", {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
            batchIndex: i,
            batchSize: batch.length,
          });
          throw new Error(
            `Bedrock batch embedding failed: ${response.status} - ${errorText}`,
          );
        }

        const result = await response.json();
        const embeddings = this.parseBatchResponse(result);
        results.push(...embeddings);

        logger.debug("[BedrockEmbedder] Embedded batch", {
          model: this.config.model,
          batchIndex: i,
          batchSize: batch.length,
        });
      }

      return results;
    }

    // Titan models: process sequentially
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map((text) => this.embed(text)),
      );

      results.push(...batchResults);

      logger.debug("[BedrockEmbedder] Embedded batch (sequential)", {
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
