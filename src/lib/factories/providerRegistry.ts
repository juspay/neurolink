import { ProviderFactory } from "./providerFactory.js";
// Lazy loading all providers to avoid circular dependencies
// Removed all static imports - providers loaded dynamically when needed
// This breaks the circular dependency chain completely
import type { ProviderRegistryOptions } from "../types/index.js";
import { logger } from "../utils/logger.js";
import type { UnknownRecord } from "../types/common.js";
import type { NeuroLink } from "../neurolink.js";
import type { MistralProvider as MistralProviderType } from "@ai-sdk/mistral";
import {
  AIProviderName,
  GoogleAIModels,
  OpenAIModels,
} from "../constants/enums.js";

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
      // Register providers with dynamic import factory functions
      const { ProviderFactory } = await import("./providerFactory.js");

      // Register Google AI Studio Provider (our validated baseline)
      ProviderFactory.registerProvider(
        AIProviderName.GOOGLE_AI,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: UnknownRecord,
        ) => {
          const { GoogleAIStudioProvider } = await import(
            "../providers/googleAiStudio.js"
          );
          return new GoogleAIStudioProvider(
            modelName,
            sdk as NeuroLink | undefined,
          );
        },
        GoogleAIModels.GEMINI_2_5_FLASH,
        ["googleAiStudio", "google", "gemini", "google-ai", "google-ai-studio"],
      );

      // Register OpenAI provider
      ProviderFactory.registerProvider(
        AIProviderName.OPENAI,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: UnknownRecord,
        ) => {
          const { OpenAIProvider } = await import("../providers/openAI.js");
          return new OpenAIProvider(modelName, sdk as NeuroLink | undefined);
        },
        OpenAIModels.GPT_4O_MINI,
        ["gpt", "chatgpt"],
      );

      // Register Anthropic provider
      ProviderFactory.registerProvider(
        AIProviderName.ANTHROPIC,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: UnknownRecord,
        ) => {
          const { AnthropicProvider } = await import(
            "../providers/anthropic.js"
          );
          return new AnthropicProvider(modelName, sdk as NeuroLink | undefined);
        },
        "claude-3-5-sonnet-20241022",
        ["claude", "anthropic"],
      );

      // Register Amazon Bedrock provider
      ProviderFactory.registerProvider(
        AIProviderName.BEDROCK,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: UnknownRecord,
          region?: string,
        ) => {
          const { AmazonBedrockProvider } = await import(
            "../providers/amazonBedrock.js"
          );
          return new AmazonBedrockProvider(
            modelName,
            sdk as NeuroLink | undefined,
            region,
          );
        },
        undefined, // Let provider read BEDROCK_MODEL from .env
        ["bedrock", "aws"],
      );

      // Register Azure OpenAI provider
      ProviderFactory.registerProvider(
        AIProviderName.AZURE,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: UnknownRecord,
        ) => {
          const { AzureOpenAIProvider } = await import(
            "../providers/azureOpenai.js"
          );
          return new AzureOpenAIProvider(
            modelName,
            sdk as NeuroLink | undefined,
          );
        },
        process.env.AZURE_MODEL ||
          process.env.AZURE_OPENAI_MODEL ||
          process.env.AZURE_OPENAI_DEPLOYMENT ||
          process.env.AZURE_OPENAI_DEPLOYMENT_ID ||
          "gpt-4o-mini",
        ["azure", "azureOpenai"],
      );

      // Register Google Vertex AI provider
      ProviderFactory.registerProvider(
        AIProviderName.VERTEX,
        async (
          modelName?: string,
          providerName?: string,
          sdk?: UnknownRecord,
          region?: string,
        ) => {
          const { GoogleVertexProvider } = await import(
            "../providers/googleVertex.js"
          );
          return new GoogleVertexProvider(
            modelName,
            providerName,
            sdk as NeuroLink | undefined,
            region,
          );
        },
        "claude-sonnet-4@20250514",
        ["vertex", "googleVertex"],
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
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: UnknownRecord,
        ) => {
          const { MistralProvider } = await import("../providers/mistral.js");
          return new MistralProvider(
            modelName,
            sdk as MistralProviderType | undefined,
          );
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

      // Register LiteLLM provider
      ProviderFactory.registerProvider(
        AIProviderName.LITELLM,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: UnknownRecord,
        ) => {
          const { LiteLLMProvider } = await import("../providers/litellm.js");
          return new LiteLLMProvider(modelName, sdk as NeuroLink | undefined);
        },
        process.env.LITELLM_MODEL || "openai/gpt-4o-mini",
        ["litellm"],
      );

      // Register OpenAI Compatible provider
      ProviderFactory.registerProvider(
        AIProviderName.OPENAI_COMPATIBLE,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: UnknownRecord,
        ) => {
          const { OpenAICompatibleProvider } = await import(
            "../providers/openaiCompatible.js"
          );
          return new OpenAICompatibleProvider(
            modelName,
            sdk as NeuroLink | undefined,
          );
        },
        process.env.OPENAI_COMPATIBLE_MODEL || undefined, // Enable auto-discovery when no model specified
        ["openai-compatible", "openrouter", "vllm", "compatible"],
      );

      // Register Amazon SageMaker provider
      ProviderFactory.registerProvider(
        AIProviderName.SAGEMAKER,
        async (
          modelName?: string,
          _providerName?: string,
          _sdk?: UnknownRecord,
          region?: string,
        ) => {
          const { AmazonSageMakerProvider } = await import(
            "../providers/amazonSagemaker.js"
          );
          return new AmazonSageMakerProvider(modelName, undefined, region);
        },
        process.env.SAGEMAKER_MODEL || "sagemaker-model",
        ["sagemaker", "aws-sagemaker"],
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
