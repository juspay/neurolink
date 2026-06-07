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
  OpenRouterModels,
  XaiModels,
  GroqModels,
  CohereModels,
  TogetherAIModels,
  FireworksModels,
  PerplexityModels,
  CloudflareModels,
  VoyageModels,
  JinaModels,
  StabilityModels,
  IdeogramModels,
  RecraftModels,
  ReplicateModels,
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
   * NEW4: per-handler registration outcomes for the realtime voice
   * providers. `"ok"` = registered; any other string = the error message.
   * Empty until the first `registerAllProviders()` call.
   */
  public static realtimeRegistration: Record<string, "ok" | string> = {};

  /**
   * Returns a snapshot of voice provider registration outcomes so callers
   * can detect at runtime which voice handlers are usable. Useful in
   * health-check endpoints and CI startup probes.
   */
  static getRegistrationReport(): { realtime: Record<string, "ok" | string> } {
    return { realtime: { ...this.realtimeRegistration } };
  }

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
            sdk as unknown as NeuroLink | undefined,
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
          sdk?: UnknownRecord,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const ollamaCreds = credentials as NeurolinkCredentials["ollama"];
          const { OllamaProvider } = await import("../providers/ollama.js");
          return new OllamaProvider(
            modelName,
            sdk as unknown as NeuroLink | undefined,
            undefined,
            ollamaCreds,
          );
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
        // OpenRouter retired `anthropic/claude-3-5-sonnet` in late 2025 — see
        // src/lib/providers/openRouter.ts and src/lib/utils/modelChoices.ts
        // for the rationale. Keep the three defaults aligned at the new
        // model (claude-sonnet-4.5) so the registry doesn't override the
        // provider's getDefault.
        process.env.OPENROUTER_MODEL || OpenRouterModels.CLAUDE_SONNET_4_5,
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
      // Register xAI Grok provider
      ProviderFactory.registerProvider(
        AIProviderName.XAI,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: UnknownRecord,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const xaiCreds = credentials as NeurolinkCredentials["xai"];
          const { XaiProvider } = await import("../providers/xai.js");
          return new XaiProvider(
            modelName,
            sdk as unknown as NeuroLink | undefined,
            undefined,
            xaiCreds,
          );
        },
        process.env.XAI_MODEL || XaiModels.GROK_3,
        ["xai", "grok"],
      );

      // Register Groq provider
      ProviderFactory.registerProvider(
        AIProviderName.GROQ,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: UnknownRecord,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const groqCreds = credentials as NeurolinkCredentials["groq"];
          const { GroqProvider } = await import("../providers/groq.js");
          return new GroqProvider(
            modelName,
            sdk as unknown as NeuroLink | undefined,
            undefined,
            groqCreds,
          );
        },
        process.env.GROQ_MODEL || GroqModels.LLAMA_3_3_70B_VERSATILE,
        ["groq"],
      );

      // Register Cohere provider
      ProviderFactory.registerProvider(
        AIProviderName.COHERE,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: UnknownRecord,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const cohereCreds = credentials as NeurolinkCredentials["cohere"];
          const { CohereProvider } = await import("../providers/cohere.js");
          return new CohereProvider(
            modelName,
            sdk as unknown as NeuroLink | undefined,
            undefined,
            cohereCreds,
          );
        },
        process.env.COHERE_MODEL || CohereModels.COMMAND_R_PLUS,
        ["cohere"],
      );

      // Register Together AI provider
      ProviderFactory.registerProvider(
        AIProviderName.TOGETHER_AI,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: UnknownRecord,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const togetherCreds = credentials as NeurolinkCredentials["together"];
          const { TogetherAIProvider } =
            await import("../providers/togetherAi.js");
          return new TogetherAIProvider(
            modelName,
            sdk as unknown as NeuroLink | undefined,
            undefined,
            togetherCreds,
          );
        },
        process.env.TOGETHER_MODEL ||
          TogetherAIModels.LLAMA_3_3_70B_INSTRUCT_TURBO,
        ["together-ai", "together"],
      );

      // Register Fireworks AI provider
      ProviderFactory.registerProvider(
        AIProviderName.FIREWORKS,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: UnknownRecord,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const fireworksCreds =
            credentials as NeurolinkCredentials["fireworks"];
          const { FireworksProvider } =
            await import("../providers/fireworks.js");
          return new FireworksProvider(
            modelName,
            sdk as unknown as NeuroLink | undefined,
            undefined,
            fireworksCreds,
          );
        },
        process.env.FIREWORKS_MODEL || FireworksModels.DEEPSEEK_V4_PRO,
        ["fireworks"],
      );

      // Register Perplexity provider
      ProviderFactory.registerProvider(
        AIProviderName.PERPLEXITY,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: UnknownRecord,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const perplexityCreds =
            credentials as NeurolinkCredentials["perplexity"];
          const { PerplexityProvider } =
            await import("../providers/perplexity.js");
          return new PerplexityProvider(
            modelName,
            sdk as unknown as NeuroLink | undefined,
            undefined,
            perplexityCreds,
          );
        },
        process.env.PERPLEXITY_MODEL || PerplexityModels.SONAR,
        ["perplexity", "pplx"],
      );

      // Register Cloudflare Workers AI provider
      ProviderFactory.registerProvider(
        AIProviderName.CLOUDFLARE,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: UnknownRecord,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const cloudflareCreds =
            credentials as NeurolinkCredentials["cloudflare"];
          const { CloudflareProvider } =
            await import("../providers/cloudflare.js");
          return new CloudflareProvider(
            modelName,
            sdk as unknown as NeuroLink | undefined,
            undefined,
            cloudflareCreds,
          );
        },
        process.env.CLOUDFLARE_MODEL || CloudflareModels.LLAMA_3_3_70B_FAST,
        ["cloudflare", "workers-ai", "cf-ai"],
      );

      // Register Voyage AI embeddings provider
      ProviderFactory.registerProvider(
        AIProviderName.VOYAGE,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: UnknownRecord,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const voyageCreds = credentials as NeurolinkCredentials["voyage"];
          const { VoyageProvider } = await import("../providers/voyage.js");
          return new VoyageProvider(
            modelName,
            sdk as unknown as NeuroLink | undefined,
            undefined,
            voyageCreds,
          );
        },
        process.env.VOYAGE_MODEL || VoyageModels.VOYAGE_3_5,
        ["voyage", "voyage-ai"],
      );

      // Register Jina AI embeddings + reranking provider
      ProviderFactory.registerProvider(
        AIProviderName.JINA,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: UnknownRecord,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const jinaCreds = credentials as NeurolinkCredentials["jina"];
          const { JinaProvider } = await import("../providers/jina.js");
          return new JinaProvider(
            modelName,
            sdk as unknown as NeuroLink | undefined,
            undefined,
            jinaCreds,
          );
        },
        process.env.JINA_MODEL || JinaModels.JINA_EMBEDDINGS_V3,
        ["jina", "jina-ai"],
      );

      // Register Stability AI image-gen provider
      ProviderFactory.registerProvider(
        AIProviderName.STABILITY,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: UnknownRecord,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const stabilityCreds =
            credentials as NeurolinkCredentials["stability"];
          const { StabilityProvider } =
            await import("../providers/stability.js");
          return new StabilityProvider(
            modelName,
            sdk as unknown as NeuroLink | undefined,
            undefined,
            stabilityCreds,
          );
        },
        process.env.STABILITY_MODEL || StabilityModels.STABLE_IMAGE_ULTRA,
        ["stability", "stability-ai", "sd"],
      );

      // Register Ideogram image-gen provider
      ProviderFactory.registerProvider(
        AIProviderName.IDEOGRAM,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: UnknownRecord,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const ideogramCreds = credentials as NeurolinkCredentials["ideogram"];
          const { IdeogramProvider } = await import("../providers/ideogram.js");
          return new IdeogramProvider(
            modelName,
            sdk as unknown as NeuroLink | undefined,
            undefined,
            ideogramCreds,
          );
        },
        process.env.IDEOGRAM_MODEL || IdeogramModels.IDEOGRAM_V3,
        ["ideogram"],
      );

      // Register Replicate LLM provider (multi-modal — also serves video /
      // avatar / music handlers via dedicated processors registered below)
      ProviderFactory.registerProvider(
        AIProviderName.REPLICATE,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: UnknownRecord,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const replicateCreds =
            credentials as NeurolinkCredentials["replicate"];
          const { ReplicateProvider } =
            await import("../providers/replicate.js");
          return new ReplicateProvider(
            modelName,
            sdk as unknown as NeuroLink | undefined,
            undefined,
            replicateCreds,
          );
        },
        process.env.REPLICATE_MODEL || ReplicateModels.LLAMA_3_70B_INSTRUCT,
        ["replicate"],
      );

      // Register Recraft image-gen provider
      ProviderFactory.registerProvider(
        AIProviderName.RECRAFT,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: UnknownRecord,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const recraftCreds = credentials as NeurolinkCredentials["recraft"];
          const { RecraftProvider } = await import("../providers/recraft.js");
          return new RecraftProvider(
            modelName,
            sdk as unknown as NeuroLink | undefined,
            undefined,
            recraftCreds,
          );
        },
        process.env.RECRAFT_MODEL || RecraftModels.RECRAFT_V3,
        ["recraft"],
      );

      logger.debug("All AI providers registered successfully");

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

      // New TTS providers
      try {
        const { TTSProcessor } = await import("../utils/ttsProcessor.js");
        const { OpenAITTS } = await import("../voice/providers/OpenAITTS.js");
        TTSProcessor.registerHandler("openai-tts", new OpenAITTS());
      } catch (err) {
        logger.debug(
          `[ProviderRegistry] openai-tts registration skipped: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      try {
        const { TTSProcessor } = await import("../utils/ttsProcessor.js");
        const { ElevenLabsTTS } =
          await import("../voice/providers/ElevenLabsTTS.js");
        const elevenLabsHandler = new ElevenLabsTTS();
        TTSProcessor.registerHandler("elevenlabs", elevenLabsHandler);
        TTSProcessor.registerHandler("elevenlabs-tts", elevenLabsHandler);
      } catch (err) {
        logger.debug(
          `[ProviderRegistry] elevenlabs registration skipped: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      try {
        const { TTSProcessor } = await import("../utils/ttsProcessor.js");
        const { AzureTTS } = await import("../voice/providers/AzureTTS.js");
        TTSProcessor.registerHandler("azure-tts", new AzureTTS());
      } catch (err) {
        logger.debug(
          `[ProviderRegistry] azure-tts registration skipped: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      // Fish Audio and Cartesia also auto-register via the voice/index.ts
      // barrel side-effect. The supports() guard here keeps registration
      // idempotent across entry points — same handler, no overwrite warning.
      try {
        const { TTSProcessor } = await import("../utils/ttsProcessor.js");
        if (!TTSProcessor.supports("fish-audio")) {
          const { FishAudioTTS } =
            await import("../voice/providers/FishAudioTTS.js");
          TTSProcessor.registerHandler("fish-audio", new FishAudioTTS());
        }
      } catch (err) {
        logger.debug(
          `[ProviderRegistry] fish-audio registration skipped: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      try {
        const { TTSProcessor } = await import("../utils/ttsProcessor.js");
        if (!TTSProcessor.supports("cartesia")) {
          const { CartesiaTTS } =
            await import("../voice/providers/CartesiaTTS.js");
          TTSProcessor.registerHandler("cartesia", new CartesiaTTS());
        }
      } catch (err) {
        logger.debug(
          `[ProviderRegistry] cartesia registration skipped: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      // ===== STT HANDLER REGISTRATION =====
      try {
        const { STTProcessor } = await import("../utils/sttProcessor.js");

        try {
          const { OpenAISTT } = await import("../voice/providers/OpenAISTT.js");
          const openAISTT = new OpenAISTT();
          STTProcessor.registerHandler("whisper", openAISTT);
          STTProcessor.registerHandler("openai-stt", openAISTT);
        } catch (err) {
          logger.debug(
            `[ProviderRegistry] whisper/openai-stt registration skipped: ${err instanceof Error ? err.message : String(err)}`,
          );
        }

        try {
          const { DeepgramSTT } =
            await import("../voice/providers/DeepgramSTT.js");
          STTProcessor.registerHandler("deepgram", new DeepgramSTT());
        } catch (err) {
          logger.debug(
            `[ProviderRegistry] deepgram registration skipped: ${err instanceof Error ? err.message : String(err)}`,
          );
        }

        try {
          const { GoogleSTT } = await import("../voice/providers/GoogleSTT.js");
          STTProcessor.registerHandler("google-stt", new GoogleSTT());
        } catch (err) {
          logger.debug(
            `[ProviderRegistry] google-stt registration skipped: ${err instanceof Error ? err.message : String(err)}`,
          );
        }

        try {
          const { AzureSTT } = await import("../voice/providers/AzureSTT.js");
          STTProcessor.registerHandler("azure-stt", new AzureSTT());
        } catch (err) {
          logger.debug(
            `[ProviderRegistry] azure-stt registration skipped: ${err instanceof Error ? err.message : String(err)}`,
          );
        }

        logger.debug("STT handlers registered successfully", {
          providers: ["whisper", "deepgram", "google-stt", "azure-stt"],
        });
      } catch (sttError) {
        logger.warn(
          "Failed to register STT handlers - STT functionality will be unavailable",
          {
            error:
              sttError instanceof Error ? sttError.message : String(sttError),
          },
        );
      }

      // ===== REALTIME HANDLER REGISTRATION =====
      try {
        const { RealtimeProcessor } =
          await import("../voice/RealtimeVoiceAPI.js");

        // M9 + NEW4: track per-handler registration outcomes so the final
        // log accurately reflects which voice providers succeeded vs which
        // were skipped — instead of unconditionally claiming "registered
        // successfully" or hiding failures at debug level.
        const realtimeOutcomes: Record<string, "ok" | string> = {};

        try {
          const { OpenAIRealtime } =
            await import("../voice/providers/OpenAIRealtime.js");
          RealtimeProcessor.registerHandler(
            "openai-realtime",
            new OpenAIRealtime(),
          );
          realtimeOutcomes["openai-realtime"] = "ok";
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          realtimeOutcomes["openai-realtime"] = msg;
          // M9: promote per-handler failures to error level so users can
          // see which shipped voice provider failed to register at startup.
          logger.error(
            `[ProviderRegistry] openai-realtime registration failed: ${msg}`,
          );
        }

        try {
          const { GeminiLive } =
            await import("../voice/providers/GeminiLive.js");
          RealtimeProcessor.registerHandler("gemini-live", new GeminiLive());
          realtimeOutcomes["gemini-live"] = "ok";
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          realtimeOutcomes["gemini-live"] = msg;
          logger.error(
            `[ProviderRegistry] gemini-live registration failed: ${msg}`,
          );
        }

        // NEW4: report the actual per-handler outcomes instead of an
        // unconditional success log. Stored on the registry so callers can
        // introspect via getRegistrationReport().
        ProviderRegistry.realtimeRegistration = realtimeOutcomes;
        const skipped = Object.entries(realtimeOutcomes).filter(
          ([, v]) => v !== "ok",
        );
        if (skipped.length === 0) {
          logger.info(
            "[ProviderRegistry] Realtime handlers registered: openai-realtime, gemini-live",
          );
        } else {
          logger.warn(
            `[ProviderRegistry] Realtime handlers partial: ${skipped.length} skipped`,
            { outcomes: realtimeOutcomes },
          );
        }
      } catch (realtimeError) {
        logger.warn(
          "Failed to register Realtime handlers - Realtime functionality will be unavailable",
          {
            error:
              realtimeError instanceof Error
                ? realtimeError.message
                : String(realtimeError),
          },
        );
      }

      // ===== VIDEO HANDLER REGISTRATION =====
      try {
        const { VideoProcessor } = await import("../utils/videoProcessor.js");

        try {
          const { VertexVideoHandler } =
            await import("../adapters/video/vertexVideoHandler.js");
          VideoProcessor.registerHandler("vertex", new VertexVideoHandler());
        } catch (err) {
          logger.debug(
            `[ProviderRegistry] vertex video registration skipped: ${err instanceof Error ? err.message : String(err)}`,
          );
        }

        try {
          const { KlingVideoHandler } =
            await import("../adapters/video/klingVideoHandler.js");
          VideoProcessor.registerHandler("kling", new KlingVideoHandler());
        } catch (err) {
          logger.debug(
            `[ProviderRegistry] kling video registration skipped: ${err instanceof Error ? err.message : String(err)}`,
          );
        }

        try {
          const { RunwayVideoHandler } =
            await import("../adapters/video/runwayVideoHandler.js");
          VideoProcessor.registerHandler("runway", new RunwayVideoHandler());
        } catch (err) {
          logger.debug(
            `[ProviderRegistry] runway video registration skipped: ${err instanceof Error ? err.message : String(err)}`,
          );
        }

        try {
          const { ReplicateVideoHandler } =
            await import("../adapters/video/replicateVideoHandler.js");
          VideoProcessor.registerHandler(
            "replicate",
            new ReplicateVideoHandler(),
          );
        } catch (err) {
          logger.debug(
            `[ProviderRegistry] replicate video registration skipped: ${err instanceof Error ? err.message : String(err)}`,
          );
        }

        logger.debug("Video handlers registered");
      } catch (err) {
        logger.warn(
          `[ProviderRegistry] video registration block failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      // ===== AVATAR HANDLER REGISTRATION =====
      try {
        const { AvatarProcessor } = await import("../utils/avatarProcessor.js");

        try {
          const { DIDAvatar } =
            await import("../avatar/providers/DIDAvatar.js");
          AvatarProcessor.registerHandler("d-id", new DIDAvatar());
        } catch (err) {
          logger.debug(
            `[ProviderRegistry] d-id avatar registration skipped: ${err instanceof Error ? err.message : String(err)}`,
          );
        }

        try {
          const { ReplicateAvatar } =
            await import("../avatar/providers/ReplicateAvatar.js");
          const replicateAvatar = new ReplicateAvatar();
          AvatarProcessor.registerHandler("replicate", replicateAvatar);
          AvatarProcessor.registerHandler("musetalk", replicateAvatar);
        } catch (err) {
          logger.debug(
            `[ProviderRegistry] replicate avatar registration skipped: ${err instanceof Error ? err.message : String(err)}`,
          );
        }

        try {
          const { HeyGenAvatar } =
            await import("../avatar/providers/HeyGenAvatar.js");
          AvatarProcessor.registerHandler("heygen", new HeyGenAvatar());
        } catch (err) {
          logger.debug(
            `[ProviderRegistry] heygen avatar registration skipped: ${err instanceof Error ? err.message : String(err)}`,
          );
        }

        logger.debug("Avatar handlers registered");
      } catch (avatarError) {
        logger.warn(
          "Failed to register Avatar handlers - Avatar functionality will be unavailable",
          {
            error:
              avatarError instanceof Error
                ? avatarError.message
                : String(avatarError),
          },
        );
      }

      // ===== MUSIC HANDLER REGISTRATION =====
      try {
        const { MusicProcessor } = await import("../utils/musicProcessor.js");

        try {
          const { BeatovenMusic } =
            await import("../music/providers/BeatovenMusic.js");
          MusicProcessor.registerHandler("beatoven", new BeatovenMusic());
        } catch (err) {
          logger.debug(
            `[ProviderRegistry] beatoven music registration skipped: ${err instanceof Error ? err.message : String(err)}`,
          );
        }

        try {
          const { ReplicateMusic } =
            await import("../music/providers/ReplicateMusic.js");
          const replicateMusic = new ReplicateMusic();
          MusicProcessor.registerHandler("replicate", replicateMusic);
          MusicProcessor.registerHandler("musicgen", replicateMusic);
        } catch (err) {
          logger.debug(
            `[ProviderRegistry] replicate music registration skipped: ${err instanceof Error ? err.message : String(err)}`,
          );
        }

        try {
          const { ElevenLabsMusic } =
            await import("../music/providers/ElevenLabsMusic.js");
          const elevenLabsMusic = new ElevenLabsMusic();
          MusicProcessor.registerHandler("elevenlabs-music", elevenLabsMusic);
          MusicProcessor.registerHandler("elevenlabs-sound", elevenLabsMusic);
        } catch (err) {
          logger.debug(
            `[ProviderRegistry] elevenlabs-music registration skipped: ${err instanceof Error ? err.message : String(err)}`,
          );
        }

        try {
          const { LyriaMusic } =
            await import("../music/providers/LyriaMusic.js");
          MusicProcessor.registerHandler("lyria", new LyriaMusic());
        } catch (err) {
          logger.debug(
            `[ProviderRegistry] lyria music registration skipped: ${err instanceof Error ? err.message : String(err)}`,
          );
        }

        logger.debug("Music handlers registered");
      } catch (musicError) {
        logger.warn(
          "Failed to register Music handlers - Music functionality will be unavailable",
          {
            error:
              musicError instanceof Error
                ? musicError.message
                : String(musicError),
          },
        );
      }

      // Mark registered ONLY after all blocks (AI + voice) attempted, so a
      // subsequent registerAllProviders() call does not short-circuit when an
      // optional handler block silently failed.
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
    this.registrationPromise = null;
    // Reset realtime registration too — otherwise getRegistrationReport()
    // can surface stale data from a previous run if the realtime block
    // failed before reaching `realtimeRegistration = realtimeOutcomes`.
    ProviderRegistry.realtimeRegistration = {};
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
