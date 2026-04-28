/**
 * Embedder Factory
 *
 * Factory for creating embedder instances based on configuration.
 * Uses dynamic imports to avoid loading unnecessary dependencies.
 *
 * @module memory/embedders/embedderFactory
 * @since 9.0.0
 */

import type { Embedder, EmbedderConfig } from "../../types/index.js";
import { logger } from "../../utils/logger.js";

/**
 * Create an embedder instance based on configuration
 *
 * @param config - Embedder configuration
 * @returns Promise<Embedder> - Configured embedder instance
 */
export async function createEmbedder(
  config: EmbedderConfig,
): Promise<Embedder> {
  logger.debug("[EmbedderFactory] Creating embedder", {
    provider: config.provider,
    model: config.model,
  });

  switch (config.provider) {
    case "openai": {
      const { OpenAIEmbedder } = await import("./openaiEmbedder.js");
      return new OpenAIEmbedder(config);
    }

    case "vertex": {
      const { VertexEmbedder } = await import("./vertexEmbedder.js");
      return new VertexEmbedder(config);
    }

    case "ollama": {
      const { OllamaEmbedder } = await import("./ollamaEmbedder.js");
      return new OllamaEmbedder(config);
    }

    case "mistral": {
      const { MistralEmbedder } = await import("./mistralEmbedder.js");
      return new MistralEmbedder(config);
    }

    case "cohere": {
      const { CohereEmbedder } = await import("./cohereEmbedder.js");
      return new CohereEmbedder(config);
    }

    case "bedrock": {
      const { BedrockEmbedder } = await import("./bedrockEmbedder.js");
      return new BedrockEmbedder(config);
    }

    default: {
      // Default to OpenAI embedder
      logger.warn(
        `[EmbedderFactory] Unknown provider: ${config.provider}, falling back to OpenAI`,
      );
      const { OpenAIEmbedder } = await import("./openaiEmbedder.js");
      return new OpenAIEmbedder({
        ...config,
        provider: "openai",
        model: config.model || "text-embedding-3-small",
      });
    }
  }
}

/**
 * Get the list of supported embedding providers
 */
export function getSupportedEmbeddingProviders(): string[] {
  return ["openai", "vertex", "ollama", "mistral", "cohere", "bedrock"];
}
