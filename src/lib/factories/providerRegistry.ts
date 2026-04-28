import { ProviderFactory } from "./providerFactory.js";
// Lazy loading all providers to avoid circular dependencies
// Removed all static imports - providers loaded dynamically when needed
// This breaks the circular dependency chain completely
import type {
  NeurolinkCredentials,
  ProviderRegistryOptions,
  UnknownRecord,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
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
  DeepSeekModels,
  NvidiaNimModels,
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
   *
   * This method is a flat list of 13 provider registrations. Each registration
   * is self-contained and extracting helpers would add indirection without
   * reducing complexity — the function is long because there are many providers,
   * not because any single registration is complex.
   */
  // eslint-disable-next-line max-lines-per-function
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
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const googleAiCreds =
            credentials as NeurolinkCredentials["googleAiStudio"];
          const { GoogleAIStudioProvider } =
            await import("../providers/googleAiStudio.js");
          return new GoogleAIStudioProvider(
            modelName,
            sdk as unknown as NeuroLink | undefined,
            googleAiCreds,
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
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const openaiCreds = credentials as NeurolinkCredentials["openai"];
          const { OpenAIProvider } = await import("../providers/openAI.js");
          return new OpenAIProvider(
            modelName,
            sdk as unknown as NeuroLink | undefined,
            undefined,
            openaiCreds,
          );
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
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const anthropicCreds =
            credentials as NeurolinkCredentials["anthropic"];
          const { AnthropicProvider } =
            await import("../providers/anthropic.js");
          return new AnthropicProvider(
            modelName,
            sdk as unknown as NeuroLink | undefined,
            undefined,
            anthropicCreds,
          );
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
          credentials?: UnknownRecord,
        ) => {
          const bedrockCreds = credentials as NeurolinkCredentials["bedrock"];
          const { AmazonBedrockProvider } =
            await import("../providers/amazonBedrock.js");
          return new AmazonBedrockProvider(
            modelName,
            sdk as unknown as NeuroLink | undefined,
            region,
            bedrockCreds,
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
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const azureCreds = credentials as NeurolinkCredentials["azure"];
          const { AzureOpenAIProvider } =
            await import("../providers/azureOpenai.js");
          return new AzureOpenAIProvider(
            modelName,
            sdk as unknown as NeuroLink | undefined,
            undefined,
            azureCreds,
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
          credentials?: UnknownRecord,
        ) => {
          const vertexCreds = credentials as NeurolinkCredentials["vertex"];
          const { GoogleVertexProvider } =
            await import("../providers/googleVertex.js");
          return new GoogleVertexProvider(
            modelName,
            providerName,
            sdk as unknown as NeuroLink | undefined,
            region,
            vertexCreds,
          );
        },
        VertexModels.CLAUDE_4_6_SONNET,
        ["vertex", "googleVertex"],
      );

      // Register Hugging Face provider (Unified Router implementation)
      ProviderFactory.registerProvider(
        AIProviderName.HUGGINGFACE,
        async (
          modelName?: string,
          _providerName?: string,
          _sdk?: UnknownRecord,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const hfCreds = credentials as NeurolinkCredentials["huggingFace"];
          const { HuggingFaceProvider } =
            await import("../providers/huggingFace.js");
          return new HuggingFaceProvider(modelName, undefined, hfCreds);
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
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const mistralCreds = credentials as NeurolinkCredentials["mistral"];
          const { MistralProvider } = await import("../providers/mistral.js");
          return new MistralProvider(
            modelName,
            sdk as unknown as MistralProviderType | undefined,
            undefined,
            mistralCreds,
          );
        },
        MistralModels.MISTRAL_LARGE_LATEST,
        ["mistral"],
      );

      // Register Ollama provider
      ProviderFactory.registerProvider(
        AIProviderName.OLLAMA,
        async (
          modelName?: string,
          _providerName?: string,
          _sdk?: UnknownRecord,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const ollamaCreds = credentials as NeurolinkCredentials["ollama"];
          const { OllamaProvider } = await import("../providers/ollama.js");
          return new OllamaProvider(modelName, ollamaCreds);
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
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const litellmCreds = credentials as NeurolinkCredentials["litellm"];
          const { LiteLLMProvider } = await import("../providers/litellm.js");
          return new LiteLLMProvider(
            modelName,
            sdk as unknown as NeuroLink | undefined,
            undefined,
            litellmCreds,
          );
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
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const openaiCompatCreds =
            credentials as NeurolinkCredentials["openaiCompatible"];
          const { OpenAICompatibleProvider } =
            await import("../providers/openaiCompatible.js");
          return new OpenAICompatibleProvider(
            modelName,
            sdk as unknown as NeuroLink | undefined,
            undefined,
            openaiCompatCreds,
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
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const openrouterCreds =
            credentials as NeurolinkCredentials["openrouter"];
          const { OpenRouterProvider } =
            await import("../providers/openRouter.js");
          return new OpenRouterProvider(
            modelName,
            sdk as unknown as NeuroLink | undefined,
            undefined,
            openrouterCreds,
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
          credentials?: UnknownRecord,
        ) => {
          const sagemakerCreds =
            credentials as NeurolinkCredentials["sagemaker"];
          const { AmazonSageMakerProvider } =
            await import("../providers/amazonSagemaker.js");
          return new AmazonSageMakerProvider(
            modelName,
            undefined,
            region,
            undefined,
            sagemakerCreds,
          );
        },
        process.env.SAGEMAKER_MODEL || "sagemaker-model",
        ["sagemaker", "aws-sagemaker"],
      );

      // Register DeepSeek provider
      ProviderFactory.registerProvider(
        AIProviderName.DEEPSEEK,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: UnknownRecord,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const deepseekCreds = credentials as NeurolinkCredentials["deepseek"];
          const { DeepSeekProvider } = await import("../providers/deepseek.js");
          return new DeepSeekProvider(
            modelName,
            sdk as unknown as NeuroLink | undefined,
            undefined,
            deepseekCreds,
          );
        },
        process.env.DEEPSEEK_MODEL || DeepSeekModels.DEEPSEEK_CHAT,
        ["deepseek", "ds"],
      );

      // Register NVIDIA NIM provider
      ProviderFactory.registerProvider(
        AIProviderName.NVIDIA_NIM,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: UnknownRecord,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const nimCreds = credentials as NeurolinkCredentials["nvidiaNim"];
          const { NvidiaNimProvider } =
            await import("../providers/nvidiaNim.js");
          return new NvidiaNimProvider(
            modelName,
            sdk as unknown as NeuroLink | undefined,
            undefined,
            nimCreds,
          );
        },
        process.env.NVIDIA_NIM_MODEL || NvidiaNimModels.LLAMA_3_3_70B_INSTRUCT,
        ["nvidia", "nim", "nvidia-nim"],
      );

      // Register LM Studio provider (local)
      ProviderFactory.registerProvider(
        AIProviderName.LM_STUDIO,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: UnknownRecord,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const lmStudioCreds = credentials as NeurolinkCredentials["lmStudio"];
          const { LMStudioProvider } = await import("../providers/lmStudio.js");
          return new LMStudioProvider(
            modelName,
            sdk as unknown as NeuroLink | undefined,
            undefined,
            lmStudioCreds,
          );
        },
        process.env.LM_STUDIO_MODEL || undefined,
        ["lmstudio", "lm-studio", "lms"],
      );

      // Register llama.cpp provider (local)
      ProviderFactory.registerProvider(
        AIProviderName.LLAMACPP,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: UnknownRecord,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const llamaCppCreds = credentials as NeurolinkCredentials["llamacpp"];
          const { LlamaCppProvider } = await import("../providers/llamaCpp.js");
          return new LlamaCppProvider(
            modelName,
            sdk as unknown as NeuroLink | undefined,
            undefined,
            llamaCppCreds,
          );
        },
        process.env.LLAMACPP_MODEL || undefined,
        ["llamacpp", "llama.cpp", "llama-cpp"],
      );

      logger.debug("All providers registered successfully");
      this.registered = true;

      // ===== TTS HANDLER REGISTRATION =====
      try {
        // Create handler instance and register explicitly
        const { GoogleTTSHandler } =
          await import("../adapters/tts/googleTTSHandler.js");
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
