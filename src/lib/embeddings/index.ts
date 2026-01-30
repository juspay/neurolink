/**
 * Embeddings Module - Main Exports
 * Provides unified access to multiple embedding providers
 */

// Re-export types for convenience
export type {
  BatchEmbedResult,
  BedrockEmbeddingConfig,
  CohereEmbeddingConfig,
  EmbedOptions,
  EmbedResult,
  EmbeddingModel,
  EmbeddingProviderConfig,
  EmbeddingProviderHealth,
  GoogleEmbeddingConfig,
  HuggingFaceEmbeddingConfig,
  MistralEmbeddingConfig,
  OllamaEmbeddingConfig,
  OpenAIEmbeddingConfig,
  VoyageEmbeddingConfig,
} from "../types/embeddingTypes.js";

export {
  EMBEDDING_MODELS,
  EMBEDDING_PRESETS,
  EmbeddingProviderName,
  getEmbeddingModelInfo,
  getModelsForProvider,
} from "../types/embeddingTypes.js";

// Core exports
export {
  BaseEmbeddingProvider,
  type EmbeddingProviderConfig as BaseEmbeddingProviderConfig,
} from "./baseEmbeddingProvider.js";

// Provider implementations
export {
  OpenAIEmbeddingProvider,
  type OpenAIEmbeddingProviderConfig,
} from "./providers/openai.js";
export {
  CohereEmbeddingProvider,
  type CohereEmbeddingProviderConfig,
} from "./providers/cohere.js";
export {
  VoyageEmbeddingProvider,
  type VoyageEmbeddingProviderConfig,
} from "./providers/voyage.js";
export {
  GoogleEmbeddingProvider,
  type GoogleEmbeddingProviderConfig,
} from "./providers/google.js";
export {
  HuggingFaceEmbeddingProvider,
  type HuggingFaceEmbeddingProviderConfig,
} from "./providers/huggingface.js";
export {
  OllamaEmbeddingProvider,
  type OllamaEmbeddingProviderConfig,
} from "./providers/ollama.js";
export {
  BedrockEmbeddingProvider,
  type BedrockEmbeddingProviderConfig,
} from "./providers/bedrock.js";
export {
  MistralEmbeddingProvider,
  type MistralEmbeddingProviderConfig,
} from "./providers/mistral.js";

// Factory and Registry
export { EmbeddingProviderFactory } from "./embeddingProviderFactory.js";
export { EmbeddingProviderRegistry } from "./embeddingProviderRegistry.js";

/**
 * Convenience function to create an embedding provider
 * @param provider Provider name or alias
 * @param config Provider configuration
 * @returns Initialized embedding provider
 */
export async function createEmbeddingProvider(
  provider: string,
  config: EmbeddingProviderConfig = {},
) {
  const { EmbeddingProviderFactory } = await import(
    "./embeddingProviderFactory.js"
  );
  const instance = await EmbeddingProviderFactory.createProvider(
    provider,
    config,
  );
  await instance.initialize();
  return instance;
}

/**
 * Convenience function to embed text using a specific provider
 * @param text Text to embed
 * @param provider Provider name (default: openai)
 * @param options Embedding options
 * @returns Embedding vector
 */
export async function embedText(
  text: string,
  provider: string = "openai",
  options?: EmbedOptions,
): Promise<number[]> {
  const instance = await createEmbeddingProvider(provider);
  const result = await instance.embed(text, options);
  return result.embedding;
}

/**
 * Convenience function to embed multiple texts
 * @param texts Array of texts to embed
 * @param provider Provider name (default: openai)
 * @param options Embedding options
 * @returns Array of embedding vectors
 */
export async function embedTexts(
  texts: string[],
  provider: string = "openai",
  options?: EmbedOptions,
): Promise<number[][]> {
  const instance = await createEmbeddingProvider(provider);
  const result = await instance.embedBatch(texts, options);
  return result.embeddings.map((e) => e.embedding);
}

// Import types for convenience functions
import type {
  EmbedOptions,
  EmbeddingProviderConfig,
} from "../types/embeddingTypes.js";
