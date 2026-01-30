/**
 * Type definitions for Embedding Providers
 * Following NeuroLink's established patterns from the provider system
 */

/**
 * Embedding provider names
 * Enum following NeuroLink's AIProviderName pattern
 */
export enum EmbeddingProviderName {
  OPENAI = "openai",
  COHERE = "cohere",
  VOYAGE = "voyage",
  GOOGLE = "google",
  HUGGINGFACE = "huggingface",
  OLLAMA = "ollama",
  MISTRAL = "mistral",
  BEDROCK = "bedrock",
}

/**
 * Embedding model information
 */
export type EmbeddingModel = {
  /** Model identifier */
  name: string;
  /** Output dimension of embeddings */
  dimension: number;
  /** Maximum input tokens */
  maxTokens: number;
  /** Provider name */
  provider: EmbeddingProviderName;
  /** Whether the model supports batch operations */
  supportsBatch?: boolean;
  /** Cost per million tokens (if applicable) */
  costPerMillion?: number;
  /** Model description */
  description?: string;
};

/**
 * Options for embedding operations
 */
export type EmbedOptions = {
  /** Specific model to use */
  model?: string;
  /** Batch size for batch operations */
  batchSize?: number;
  /** Whether to truncate long inputs */
  truncate?: boolean;
  /** Desired output dimensions (for models that support dimension reduction) */
  dimensions?: number;
  /** Input type hint for models that support it */
  inputType?: "query" | "document" | "passage" | "clustering";
  /** Enable debug logging */
  debug?: boolean;
};

/**
 * Result of a single embedding operation
 */
export type EmbedResult = {
  /** The embedding vector */
  embedding: number[];
  /** Number of tokens used */
  tokenCount: number;
  /** Model used for embedding */
  model: string;
  /** Processing time in ms */
  processingTimeMs?: number;
};

/**
 * Result of a batch embedding operation
 */
export type BatchEmbedResult = {
  /** Array of embedding results */
  embeddings: EmbedResult[];
  /** Total tokens used across all embeddings */
  totalTokens: number;
  /** Model used */
  model: string;
  /** Total processing time in ms */
  processingTimeMs?: number;
};

/**
 * Configuration for embedding providers
 */
export type EmbeddingProviderConfig = {
  /** API key for the provider */
  apiKey?: string;
  /** Base URL for API requests (for self-hosted or proxy) */
  baseUrl?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum retries for failed requests */
  maxRetries?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Custom headers for API requests */
  headers?: Record<string, string>;
};

/**
 * OpenAI-specific configuration
 */
export type OpenAIEmbeddingConfig = EmbeddingProviderConfig & {
  /** Organization ID for OpenAI */
  organization?: string;
  /** Default model to use */
  defaultModel?: string;
};

/**
 * Cohere-specific configuration
 */
export type CohereEmbeddingConfig = EmbeddingProviderConfig & {
  /** Default model to use */
  defaultModel?: string;
  /** Embedding type (search_document, search_query, classification, clustering) */
  inputType?:
    | "search_document"
    | "search_query"
    | "classification"
    | "clustering";
  /** Truncation strategy */
  truncate?: "NONE" | "START" | "END";
};

/**
 * Voyage AI-specific configuration
 */
export type VoyageEmbeddingConfig = EmbeddingProviderConfig & {
  /** Default model to use */
  defaultModel?: string;
  /** Input type hint */
  inputType?: "query" | "document";
  /** Whether to truncate long inputs */
  truncate?: boolean;
};

/**
 * Google-specific configuration
 */
export type GoogleEmbeddingConfig = EmbeddingProviderConfig & {
  /** Default model to use */
  defaultModel?: string;
  /** Task type hint */
  taskType?:
    | "RETRIEVAL_DOCUMENT"
    | "RETRIEVAL_QUERY"
    | "SEMANTIC_SIMILARITY"
    | "CLASSIFICATION"
    | "CLUSTERING";
};

/**
 * Ollama-specific configuration
 */
export type OllamaEmbeddingConfig = EmbeddingProviderConfig & {
  /** Ollama host URL */
  host?: string;
  /** Default model to use */
  defaultModel?: string;
};

/**
 * HuggingFace-specific configuration
 */
export type HuggingFaceEmbeddingConfig = EmbeddingProviderConfig & {
  /** Default model to use (e.g., "sentence-transformers/all-MiniLM-L6-v2") */
  defaultModel?: string;
  /** Whether to wait for model to load */
  waitForModel?: boolean;
};

/**
 * AWS Bedrock-specific configuration
 */
export type BedrockEmbeddingConfig = EmbeddingProviderConfig & {
  /** AWS region */
  region?: string;
  /** AWS access key ID */
  accessKeyId?: string;
  /** AWS secret access key */
  secretAccessKey?: string;
  /** Default model to use */
  defaultModel?: string;
};

/**
 * Mistral-specific configuration
 */
export type MistralEmbeddingConfig = EmbeddingProviderConfig & {
  /** Default model to use */
  defaultModel?: string;
};

/**
 * Embedding provider health status
 */
export type EmbeddingProviderHealth = {
  /** Whether the provider is healthy */
  healthy: boolean;
  /** Provider status */
  status: "connected" | "disconnected" | "degraded" | "error";
  /** Response time in ms */
  latencyMs?: number;
  /** Error message if unhealthy */
  error?: string;
  /** Last health check timestamp */
  lastChecked: Date;
};

/**
 * Embedding presets for common use cases
 */
export const EMBEDDING_PRESETS = {
  /** Best quality, higher cost */
  quality: {
    provider: EmbeddingProviderName.COHERE,
    model: "embed-v4",
    dimensions: 1024,
  },
  /** Balanced quality and cost */
  balanced: {
    provider: EmbeddingProviderName.OPENAI,
    model: "text-embedding-3-small",
    dimensions: 1536,
  },
  /** Budget-friendly option */
  budget: {
    provider: EmbeddingProviderName.OPENAI,
    model: "text-embedding-3-small",
    dimensions: 512,
  },
  /** Multilingual support */
  multilingual: {
    provider: EmbeddingProviderName.COHERE,
    model: "embed-v4",
    dimensions: 1024,
  },
  /** Optimized for code */
  code: {
    provider: EmbeddingProviderName.VOYAGE,
    model: "voyage-code-2",
    dimensions: 1536,
  },
  /** Long document support */
  longContext: {
    provider: EmbeddingProviderName.VOYAGE,
    model: "voyage-3-large",
    dimensions: 1536,
  },
  /** Local/self-hosted */
  local: {
    provider: EmbeddingProviderName.OLLAMA,
    model: "nomic-embed-text",
    dimensions: 768,
  },
} as const;

/**
 * Well-known embedding models with their specifications
 */
export const EMBEDDING_MODELS: Record<string, EmbeddingModel> = {
  // OpenAI Models
  "text-embedding-3-small": {
    name: "text-embedding-3-small",
    dimension: 1536,
    maxTokens: 8191,
    provider: EmbeddingProviderName.OPENAI,
    supportsBatch: true,
    costPerMillion: 0.02,
    description: "Fast and efficient embedding model",
  },
  "text-embedding-3-large": {
    name: "text-embedding-3-large",
    dimension: 3072,
    maxTokens: 8191,
    provider: EmbeddingProviderName.OPENAI,
    supportsBatch: true,
    costPerMillion: 0.13,
    description: "High quality embedding model",
  },
  "text-embedding-ada-002": {
    name: "text-embedding-ada-002",
    dimension: 1536,
    maxTokens: 8191,
    provider: EmbeddingProviderName.OPENAI,
    supportsBatch: true,
    costPerMillion: 0.1,
    description: "Legacy embedding model",
  },

  // Cohere Models
  "embed-v4": {
    name: "embed-v4",
    dimension: 1024,
    maxTokens: 512,
    provider: EmbeddingProviderName.COHERE,
    supportsBatch: true,
    costPerMillion: 0.1,
    description: "Latest Cohere embedding model with best MTEB scores",
  },
  "embed-english-v3.0": {
    name: "embed-english-v3.0",
    dimension: 1024,
    maxTokens: 512,
    provider: EmbeddingProviderName.COHERE,
    supportsBatch: true,
    costPerMillion: 0.1,
    description: "English-optimized embedding model",
  },
  "embed-multilingual-v3.0": {
    name: "embed-multilingual-v3.0",
    dimension: 1024,
    maxTokens: 512,
    provider: EmbeddingProviderName.COHERE,
    supportsBatch: true,
    costPerMillion: 0.1,
    description: "Multilingual embedding model",
  },

  // Voyage AI Models
  "voyage-3-large": {
    name: "voyage-3-large",
    dimension: 1536,
    maxTokens: 32000,
    provider: EmbeddingProviderName.VOYAGE,
    supportsBatch: true,
    costPerMillion: 0.12,
    description: "Best retrieval accuracy with 32K context",
  },
  "voyage-3": {
    name: "voyage-3",
    dimension: 1024,
    maxTokens: 32000,
    provider: EmbeddingProviderName.VOYAGE,
    supportsBatch: true,
    costPerMillion: 0.06,
    description: "Balanced quality and cost",
  },
  "voyage-code-2": {
    name: "voyage-code-2",
    dimension: 1536,
    maxTokens: 16000,
    provider: EmbeddingProviderName.VOYAGE,
    supportsBatch: true,
    costPerMillion: 0.12,
    description: "Code-optimized embedding model",
  },
  "voyage-3-lite": {
    name: "voyage-3-lite",
    dimension: 512,
    maxTokens: 32000,
    provider: EmbeddingProviderName.VOYAGE,
    supportsBatch: true,
    costPerMillion: 0.02,
    description: "Budget-friendly with long context",
  },

  // Google Models
  "text-embedding-004": {
    name: "text-embedding-004",
    dimension: 768,
    maxTokens: 2048,
    provider: EmbeddingProviderName.GOOGLE,
    supportsBatch: true,
    description: "Google's latest embedding model",
  },

  // Mistral Models
  "mistral-embed": {
    name: "mistral-embed",
    dimension: 1024,
    maxTokens: 8192,
    provider: EmbeddingProviderName.MISTRAL,
    supportsBatch: true,
    costPerMillion: 0.1,
    description: "Mistral's embedding model",
  },
};

/**
 * Get embedding model info by name
 */
export function getEmbeddingModelInfo(
  modelName: string,
): EmbeddingModel | undefined {
  return EMBEDDING_MODELS[modelName];
}

/**
 * Get all models for a specific provider
 */
export function getModelsForProvider(
  provider: EmbeddingProviderName,
): EmbeddingModel[] {
  return Object.values(EMBEDDING_MODELS).filter((m) => m.provider === provider);
}
