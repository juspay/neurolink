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
  AnthropicModels,
  VertexModels,
  MistralModels,
  OllamaModels,
  LiteLLMModels,
  HuggingFaceModels,
} from "../constants/enums.js";

/**
 * Provider Registry - registers all providers with the factory
 * This is where we migrate providers one by one to the new pattern
 */
export class ProviderRegistry {
  private static registered = false;
  private static registrationPromise: Promise<void> | null = null;
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
    if (this.registrationPromise) {
      return this.registrationPromise;
    }

    this.registrationPromise = this._doRegister();
    try {
      await this.registrationPromise;
    } catch (error) {
      this.registrationPromise = null; // Allow retry on failure
      throw error;
    }
  }

  /**
   * Internal registration implementation
   */
  private static async _doRegister(): Promise<void> {
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
        AnthropicModels.CLAUDE_SONNET_4_6,
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
        VertexModels.CLAUDE_4_6_SONNET,
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
        process.env.HUGGINGFACE_MODEL ||
          HuggingFaceModels.QWEN_2_5_72B_INSTRUCT,
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
        MistralModels.MISTRAL_LARGE_LATEST,
        ["mistral"],
      );

      // Register Ollama provider
      ProviderFactory.registerProvider(
        AIProviderName.OLLAMA,
        async (modelName?: string) => {
          const { OllamaProvider } = await import("../providers/ollama.js");
          return new OllamaProvider(modelName);
        },
        process.env.OLLAMA_MODEL || OllamaModels.LLAMA3_2_LATEST,
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
        process.env.LITELLM_MODEL || LiteLLMModels.OPENAI_GPT_4O_MINI,
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
        ["openai-compatible", "vllm", "compatible"],
      );

      // Register OpenRouter provider (300+ models from 60+ providers)
      ProviderFactory.registerProvider(
        AIProviderName.OPENROUTER,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: UnknownRecord,
        ) => {
          const { OpenRouterProvider } = await import(
            "../providers/openRouter.js"
          );
          return new OpenRouterProvider(
            modelName,
            sdk as NeuroLink | undefined,
          );
        },
        process.env.OPENROUTER_MODEL || "anthropic/claude-3-5-sonnet",
        ["openrouter", "or"],
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

      // ===== TTS HANDLER REGISTRATION =====
      try {
        // Create handler instance and register explicitly
        const { GoogleTTSHandler } = await import(
          "../adapters/tts/googleTTSHandler.js"
        );
        const { TTSProcessor } = await import("../utils/ttsProcessor.js");

        const googleHandler = new GoogleTTSHandler();
        TTSProcessor.registerHandler("google-ai", googleHandler);
        TTSProcessor.registerHandler("vertex", googleHandler);

        logger.debug("TTS handlers registered successfully", {
          providers: ["google-ai", "vertex"],
        });
      } catch (ttsError) {
        logger.warn(
          "Failed to register TTS handlers - TTS functionality will be unavailable",
          {
            error:
              ttsError instanceof Error ? ttsError.message : String(ttsError),
          },
        );
        // Don't throw - TTS is optional functionality
      }
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
    this.registrationPromise = null;
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
