/**
 * Registry for all embedding provider implementations
 * Uses dynamic imports to avoid circular dependencies
 * Following NeuroLink's ProviderRegistry pattern
 */

import { EmbeddingProviderName } from "../types/embeddingTypes.js";
import { logger } from "../utils/logger.js";
import type { OpenAIEmbeddingConfig } from "../types/embeddingTypes.js";
import type { CohereEmbeddingConfig } from "../types/embeddingTypes.js";
import type { VoyageEmbeddingConfig } from "../types/embeddingTypes.js";
import type { GoogleEmbeddingConfig } from "../types/embeddingTypes.js";
import type { HuggingFaceEmbeddingConfig } from "../types/embeddingTypes.js";
import type { OllamaEmbeddingConfig } from "../types/embeddingTypes.js";
import type { BedrockEmbeddingConfig } from "../types/embeddingTypes.js";
import type { MistralEmbeddingConfig } from "../types/embeddingTypes.js";
import { EmbeddingProviderFactory } from "./embeddingProviderFactory.js";

/**
 * Registry for all embedding provider implementations
 * Uses dynamic imports to avoid circular dependencies
 */
export class EmbeddingProviderRegistry {
  private static registered = false;

  /**
   * Register all embedding providers with the factory
   * Uses dynamic imports to prevent circular dependency issues
   */
  static async registerAllProviders(): Promise<void> {
    if (EmbeddingProviderRegistry.registered) {
      return;
    }

    try {
      // ========================================
      // Primary Embedding Providers
      // ========================================

      // OpenAI - Most widely used embedding provider
      EmbeddingProviderFactory.registerProvider(
        EmbeddingProviderName.OPENAI,
        async (config) => {
          const { OpenAIEmbeddingProvider } = await import(
            "./providers/openai.js"
          );
          return new OpenAIEmbeddingProvider(config as OpenAIEmbeddingConfig);
        },
        ["openai", "openai-embedding", "ada", "text-embedding"],
      );

      // Cohere - Best MTEB scores, excellent multilingual support
      EmbeddingProviderFactory.registerProvider(
        EmbeddingProviderName.COHERE,
        async (config) => {
          const { CohereEmbeddingProvider } = await import(
            "./providers/cohere.js"
          );
          return new CohereEmbeddingProvider(config as CohereEmbeddingConfig);
        },
        ["cohere", "cohere-embedding", "embed-v4"],
      );

      // Voyage AI - Best retrieval accuracy, long context support
      EmbeddingProviderFactory.registerProvider(
        EmbeddingProviderName.VOYAGE,
        async (config) => {
          const { VoyageEmbeddingProvider } = await import(
            "./providers/voyage.js"
          );
          return new VoyageEmbeddingProvider(config as VoyageEmbeddingConfig);
        },
        ["voyage", "voyage-ai", "voyageai", "voyage-embedding"],
      );

      // ========================================
      // Additional Embedding Providers
      // ========================================

      // Google - Vertex AI and AI Studio embeddings
      EmbeddingProviderFactory.registerProvider(
        EmbeddingProviderName.GOOGLE,
        async (config) => {
          const { GoogleEmbeddingProvider } = await import(
            "./providers/google.js"
          );
          return new GoogleEmbeddingProvider(config as GoogleEmbeddingConfig);
        },
        [
          "google",
          "google-embedding",
          "vertex",
          "vertex-ai",
          "gemini-embed",
          "text-embedding-004",
        ],
      );

      // HuggingFace - Open-source models via Inference API
      EmbeddingProviderFactory.registerProvider(
        EmbeddingProviderName.HUGGINGFACE,
        async (config) => {
          const { HuggingFaceEmbeddingProvider } = await import(
            "./providers/huggingface.js"
          );
          return new HuggingFaceEmbeddingProvider(
            config as HuggingFaceEmbeddingConfig,
          );
        },
        [
          "huggingface",
          "hf",
          "huggingface-embedding",
          "sentence-transformers",
          "bge",
          "gte",
          "e5",
        ],
      );

      // Ollama - Local embeddings with zero cost
      EmbeddingProviderFactory.registerProvider(
        EmbeddingProviderName.OLLAMA,
        async (config) => {
          const { OllamaEmbeddingProvider } = await import(
            "./providers/ollama.js"
          );
          return new OllamaEmbeddingProvider(config as OllamaEmbeddingConfig);
        },
        [
          "ollama",
          "ollama-embedding",
          "local",
          "nomic-embed-text",
          "mxbai-embed",
        ],
      );

      // AWS Bedrock - Titan and Cohere embeddings on AWS
      EmbeddingProviderFactory.registerProvider(
        EmbeddingProviderName.BEDROCK,
        async (config) => {
          const { BedrockEmbeddingProvider } = await import(
            "./providers/bedrock.js"
          );
          return new BedrockEmbeddingProvider(config as BedrockEmbeddingConfig);
        },
        ["bedrock", "aws", "aws-bedrock", "titan-embed", "amazon-titan"],
      );

      // Mistral - High-quality European AI embeddings
      EmbeddingProviderFactory.registerProvider(
        EmbeddingProviderName.MISTRAL,
        async (config) => {
          const { MistralEmbeddingProvider } = await import(
            "./providers/mistral.js"
          );
          return new MistralEmbeddingProvider(config as MistralEmbeddingConfig);
        },
        ["mistral", "mistral-ai", "mistral-embedding", "mistral-embed"],
      );

      // Mark registration as complete
      EmbeddingProviderRegistry.registered = true;
      EmbeddingProviderFactory.markAsRegistered();

      logger.debug("All embedding providers registered successfully", {
        providers: EmbeddingProviderFactory.getAvailableProviders(),
      });
    } catch (error) {
      logger.error("Failed to register embedding providers", { error });
      throw error;
    }
  }

  /**
   * Check if providers have been registered
   */
  static isRegistered(): boolean {
    return EmbeddingProviderRegistry.registered;
  }

  /**
   * Clear all registrations (for testing)
   */
  static clearRegistrations(): void {
    EmbeddingProviderRegistry.registered = false;
    EmbeddingProviderFactory.clearRegistrations();
  }

  /**
   * Register a single provider manually
   * Useful for adding custom providers at runtime
   */
  static async registerProvider(
    name: EmbeddingProviderName | string,
    importPath: string,
    className: string,
    aliases: string[] = [],
  ): Promise<void> {
    EmbeddingProviderFactory.registerProvider(
      name,
      async (config) => {
        const module = await import(importPath);
        const ProviderClass = module[className];
        return new ProviderClass(config);
      },
      aliases,
    );
  }
}
