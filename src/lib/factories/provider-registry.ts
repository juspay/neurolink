import { ProviderFactory } from "./provider-factory.js";
// ✅ FINAL CIRCULAR DEPENDENCY FIX: Lazy loading all providers
// Removed all static imports - providers loaded dynamically when needed
// This breaks the circular dependency chain completely
import { AIProviderName, GoogleAIModels, OpenAIModels } from "../core/types.js";
import { logger } from "../utils/logger.js";

/**
 * Configuration options for the provider registry
 */
export interface ProviderRegistryOptions {
  /**
   * Enable loading of manual MCP configurations from .mcp-config.json
   * Should only be true for CLI mode, false for SDK mode
   */
  enableManualMCP?: boolean;
}

/**
 * Provider Registry - registers all providers with the factory
 * This is where we migrate providers one by one to the new pattern
 */
export class ProviderRegistry {
  private static registered = false;
  private static options: ProviderRegistryOptions = {
    enableManualMCP: false, // Default to disabled for safety
  };

  /**
   * Register all providers with the factory
   */
  static async registerAllProviders(): Promise<void> {
    if (this.registered) {
      return;
    }

    try {
      // ✅ LAZY LOADING: Register providers with dynamic import factory functions
      const { ProviderFactory } = await import("./provider-factory.js");

      // Register Google AI Studio Provider (our validated baseline)
      ProviderFactory.registerProvider(
        AIProviderName.GOOGLE_AI,
        async (modelName?: string, providerName?: string, sdk?: any) => {
          const { GoogleAIStudioProvider } = await import(
            "../providers/google-ai-studio.js"
          );
          return new GoogleAIStudioProvider(modelName, sdk);
        },
        GoogleAIModels.GEMINI_2_5_FLASH,
        ["google-ai-studio", "google", "gemini", "google-ai"],
      );

      // Register OpenAI provider
      ProviderFactory.registerProvider(
        AIProviderName.OPENAI,
        async (modelName?: string, providerName?: string, sdk?: any) => {
          const { OpenAIProvider } = await import("../providers/openAI.js");
          return new OpenAIProvider(modelName);
        },
        OpenAIModels.GPT_4O_MINI,
        ["gpt", "chatgpt"],
      );

      // Register Anthropic provider
      ProviderFactory.registerProvider(
        AIProviderName.ANTHROPIC,
        async (modelName?: string, providerName?: string, sdk?: any) => {
          const { AnthropicProvider } = await import(
            "../providers/anthropic.js"
          );
          return new AnthropicProvider(modelName, sdk);
        },
        "claude-3-5-sonnet-20241022",
        ["claude", "anthropic"],
      );

      // Register Amazon Bedrock provider
      ProviderFactory.registerProvider(
        AIProviderName.BEDROCK,
        async (modelName?: string) => {
          const { AmazonBedrockProvider } = await import(
            "../providers/amazon-bedrock.js"
          );
          return new AmazonBedrockProvider(modelName);
        },
        undefined, // Let provider read BEDROCK_MODEL from .env
        ["bedrock", "aws"],
      );

      // Register Azure OpenAI provider
      ProviderFactory.registerProvider(
        AIProviderName.AZURE,
        async (modelName?: string) => {
          const { AzureOpenAIProvider } = await import(
            "../providers/azure-openai.js"
          );
          return new AzureOpenAIProvider(modelName);
        },
        "gpt-4o-mini",
        ["azure", "azure-openai"],
      );

      // Register Google Vertex AI provider
      ProviderFactory.registerProvider(
        AIProviderName.VERTEX,
        async (modelName?: string) => {
          const { GoogleVertexProvider } = await import(
            "../providers/google-vertex.js"
          );
          return new GoogleVertexProvider(modelName);
        },
        "gemini-2.5-pro",
        ["vertex", "google-vertex"],
      );

      // Register Hugging Face provider (Unified Router implementation)
      ProviderFactory.registerProvider(
        AIProviderName.HUGGINGFACE,
        async (modelName?: string) => {
          const { HuggingFaceProvider } = await import(
            "../providers/huggingFace.js"
          );
          return new HuggingFaceProvider(modelName);
        },
        process.env.HUGGINGFACE_MODEL || "microsoft/DialoGPT-medium",
        ["huggingface", "hf"],
      );

      // Register Mistral AI provider
      ProviderFactory.registerProvider(
        AIProviderName.MISTRAL,
        async (modelName?: string, providerName?: string, sdk?: any) => {
          const { MistralProvider } = await import("../providers/mistral.js");
          return new MistralProvider(modelName, sdk);
        },
        "mistral-large-latest",
        ["mistral"],
      );

      // Register Ollama provider
      ProviderFactory.registerProvider(
        AIProviderName.OLLAMA,
        async (modelName?: string) => {
          const { OllamaProvider } = await import("../providers/ollama.js");
          return new OllamaProvider(modelName);
        },
        process.env.OLLAMA_MODEL || "llama3.1:8b",
        ["ollama", "local"],
      );

      logger.debug("All providers registered successfully");
      this.registered = true;
    } catch (error) {
      logger.error("Failed to register providers:", error);
      throw error;
    }
  }

  /**
   * Check if providers are registered
   */
  static isRegistered(): boolean {
    return this.registered;
  }

  /**
   * Clear registrations (for testing)
   */
  static clearRegistrations(): void {
    ProviderFactory.clearRegistrations();
    this.registered = false;
  }

  /**
   * Set registry options (should be called before initialization)
   */
  static setOptions(options: ProviderRegistryOptions): void {
    this.options = { ...this.options, ...options };
    logger.debug("Provider registry options updated:", this.options);
  }

  /**
   * Get current registry options
   */
  static getOptions(): ProviderRegistryOptions {
    return { ...this.options };
  }
}

// Note: Providers are registered explicitly when needed to avoid circular dependencies
