/**
 * AWS Bedrock Embedding Provider
 * Implements embedding generation using AWS Bedrock Titan Embeddings
 * Supports Titan Embeddings G1, V2, and multimodal models
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
  type BedrockEmbeddingConfig,
} from "../../types/embeddingTypes.js";

/**
 * Bedrock Embedding Provider Configuration
 */
export type BedrockEmbedderConfig = BedrockEmbeddingConfig;

/**
 * Titan Embeddings response type
 */
type TitanEmbeddingResponse = {
  embedding: number[];
  inputTextTokenCount: number;
};

/**
 * Cohere Embeddings response type (for Cohere models on Bedrock)
 */
type CohereBedrockEmbeddingResponse = {
  embeddings: number[][];
  texts: string[];
};

/**
 * Available Bedrock embedding models
 */
const BEDROCK_EMBEDDING_MODELS: EmbeddingModel[] = [
  {
    name: "amazon.titan-embed-text-v2:0",
    dimension: 1024,
    maxTokens: 8192,
    provider: EmbeddingProviderName.BEDROCK,
    supportsBatch: false,
    description:
      "Titan Text Embeddings V2 - Latest generation with dimension flexibility",
  },
  {
    name: "amazon.titan-embed-text-v1",
    dimension: 1536,
    maxTokens: 8000,
    provider: EmbeddingProviderName.BEDROCK,
    supportsBatch: false,
    description: "Titan Text Embeddings G1 - Production-ready embeddings",
  },
  {
    name: "amazon.titan-embed-image-v1",
    dimension: 1024,
    maxTokens: 128,
    provider: EmbeddingProviderName.BEDROCK,
    supportsBatch: false,
    description: "Titan Multimodal Embeddings - Text and image support",
  },
  {
    name: "cohere.embed-english-v3",
    dimension: 1024,
    maxTokens: 512,
    provider: EmbeddingProviderName.BEDROCK,
    supportsBatch: true,
    description: "Cohere English Embeddings V3 on Bedrock",
  },
  {
    name: "cohere.embed-multilingual-v3",
    dimension: 1024,
    maxTokens: 512,
    provider: EmbeddingProviderName.BEDROCK,
    supportsBatch: true,
    description: "Cohere Multilingual Embeddings V3 on Bedrock",
  },
];

/**
 * Default batch size for Bedrock embeddings
 */
const DEFAULT_BATCH_SIZE = 25;

/**
 * Default timeout in milliseconds
 */
const DEFAULT_TIMEOUT = 60000;

/**
 * AWS Bedrock Embedding Provider
 * Generates embeddings using AWS Bedrock Titan Embeddings
 */
export class BedrockEmbeddingProvider extends BaseEmbeddingProvider<BedrockEmbedderConfig> {
  private region: string;
  private accessKeyId?: string;
  private secretAccessKey?: string;
  private sessionToken?: string;
  private bedrockClient: unknown;

  constructor(config: BedrockEmbedderConfig = {}) {
    super(config, EmbeddingProviderName.BEDROCK);
    this.region =
      config.region ||
      process.env.AWS_REGION ||
      process.env.AWS_DEFAULT_REGION ||
      "us-east-1";
    this.accessKeyId = config.accessKeyId || process.env.AWS_ACCESS_KEY_ID;
    this.secretAccessKey =
      config.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY;
    this.sessionToken = process.env.AWS_SESSION_TOKEN;
  }

  /**
   * Initialize the provider
   */
  async initialize(): Promise<void> {
    if (this.initialized) {return;}

    try {
      // Dynamically import AWS SDK
      const { BedrockRuntimeClient } = await import(
        "@aws-sdk/client-bedrock-runtime"
      );

      const clientConfig: Record<string, unknown> = {
        region: this.region,
      };

      // Use explicit credentials if provided, otherwise rely on default credential chain
      if (this.accessKeyId && this.secretAccessKey) {
        clientConfig.credentials = {
          accessKeyId: this.accessKeyId,
          secretAccessKey: this.secretAccessKey,
          ...(this.sessionToken && { sessionToken: this.sessionToken }),
        };
      }

      this.bedrockClient = new BedrockRuntimeClient(clientConfig);

      // Validate by making a small test request
      await this.embed("test", { debug: false });
      this.initialized = true;
      this.logDebug("Bedrock embedding provider initialized successfully");
    } catch (error) {
      throw new Error(
        `Failed to initialize Bedrock embedding provider: ${error instanceof Error ? error.message : String(error)}`,
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

    if (model.startsWith("cohere.")) {
      // Use Cohere model format
      const response = await this.invokeCohereModel([text], model, options);
      return {
        embedding: response.embeddings[0],
        tokenCount: 0, // Cohere doesn't return token count in Bedrock
        model,
        processingTimeMs: Date.now() - startTime,
      };
    } else {
      // Use Titan model format
      const response = await this.invokeTitanModel(text, model, options);
      return {
        embedding: response.embedding,
        tokenCount: response.inputTextTokenCount,
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

    // Split into batches
    const batches = this.splitIntoBatches(texts, batchSize);

    for (const batch of batches) {
      if (model.startsWith("cohere.")) {
        // Cohere supports batch embedding
        const response = await this.invokeCohereModel(batch, model, options);
        for (const embedding of response.embeddings) {
          embeddings.push({
            embedding,
            tokenCount: 0,
            model,
          });
        }
      } else {
        // Titan requires individual requests
        for (const text of batch) {
          const response = await this.invokeTitanModel(text, model, options);
          embeddings.push({
            embedding: response.embedding,
            tokenCount: response.inputTextTokenCount,
            model,
          });
          totalTokens += response.inputTextTokenCount;
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
    return BEDROCK_EMBEDDING_MODELS;
  }

  /**
   * Get default model
   */
  getDefaultModel(): string {
    return this.config.defaultModel || "amazon.titan-embed-text-v2:0";
  }

  /**
   * Invoke Titan embedding model
   */
  private async invokeTitanModel(
    text: string,
    modelId: string,
    options?: EmbedOptions,
  ): Promise<TitanEmbeddingResponse> {
    const timeout = this.config.timeout || DEFAULT_TIMEOUT;

    const { InvokeModelCommand } = await import(
      "@aws-sdk/client-bedrock-runtime"
    );

    const body: Record<string, unknown> = {
      inputText: text,
    };

    // Titan V2 supports dimension reduction
    if (modelId.includes("titan-embed-text-v2") && options?.dimensions) {
      body.dimensions = options.dimensions;
    }

    // Normalize for V2
    if (modelId.includes("titan-embed-text-v2")) {
      body.normalize = true;
    }

    const command = new InvokeModelCommand({
      modelId,
      body: JSON.stringify(body),
      contentType: "application/json",
      accept: "application/json",
    });

    const client = this.bedrockClient as {
      send: (cmd: unknown) => Promise<{ body: Uint8Array }>;
    };

    const invokePromise = client.send(command);
    const response = await this.withTimeout(
      invokePromise,
      timeout,
      "Bedrock Titan embedding request",
    );

    const responseBody = JSON.parse(
      new TextDecoder().decode(response.body),
    ) as TitanEmbeddingResponse;
    return responseBody;
  }

  /**
   * Invoke Cohere embedding model on Bedrock
   */
  private async invokeCohereModel(
    texts: string[],
    modelId: string,
    options?: EmbedOptions,
  ): Promise<CohereBedrockEmbeddingResponse> {
    const timeout = this.config.timeout || DEFAULT_TIMEOUT;

    const { InvokeModelCommand } = await import(
      "@aws-sdk/client-bedrock-runtime"
    );

    // Map input type
    let inputType = "search_document";
    if (options?.inputType === "query") {
      inputType = "search_query";
    } else if (options?.inputType === "clustering") {
      inputType = "clustering";
    }

    const body = {
      texts,
      input_type: inputType,
      truncate: options?.truncate !== false ? "END" : "NONE",
    };

    const command = new InvokeModelCommand({
      modelId,
      body: JSON.stringify(body),
      contentType: "application/json",
      accept: "application/json",
    });

    const client = this.bedrockClient as {
      send: (cmd: unknown) => Promise<{ body: Uint8Array }>;
    };

    const invokePromise = client.send(command);
    const response = await this.withTimeout(
      invokePromise,
      timeout,
      "Bedrock Cohere embedding request",
    );

    const responseBody = JSON.parse(
      new TextDecoder().decode(response.body),
    ) as CohereBedrockEmbeddingResponse;
    return responseBody;
  }
}

// Export configuration type
export type { BedrockEmbedderConfig as BedrockEmbeddingProviderConfig };
