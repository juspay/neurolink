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
  OllamaModels,
  LiteLLMModels,
  HuggingFaceModels,
  DeepSeekModels,
  NvidiaNimModels,
  OpenRouterModels,
  CohereModels,
  VoyageModels,
  JinaModels,
  StabilityModels,
  IdeogramModels,
  RecraftModels,
  ReplicateModels,
} from "../constants/enums.js";
import { PROVIDER_DESCRIPTORS_BY_NAME } from "./providerDescriptors.js";
import { OPENAI_COMPAT_CATALOG } from "../providers/openaiCompatCatalog.js";
import type { OpenAICompatCredentials } from "../types/index.js";
import { providerChoicesFor } from "./mediaHandlerCatalog.js";

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
   * Flat list of ProviderFactory.registerProvider() calls. Providers load via
   * dynamic import() of ../providers/<module>.js only - never static imports
   * (avoids circular dependencies; see CLAUDE.md).
   *
   * Not registered (by design): index.ts, providerTypeUtils.ts,
   * anthropicBaseProvider.ts (legacy; anthropic.ts is live),
   * googleNativeGemini3.ts (shared helpers). Filename != provider ID
   * (e.g. amazonBedrock -> "bedrock"); static scanners that miss dynamic
   * imports may false-positive (Pattern Analysis #1178).
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
          sdk?: NeuroLink,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const googleAiCreds =
            credentials as NeurolinkCredentials["googleAiStudio"];
          const { GoogleAIStudioProvider } =
            await import("../providers/googleAiStudio/index.js");
          return new GoogleAIStudioProvider(modelName, sdk, googleAiCreds);
        },
        GoogleAIModels.GEMINI_2_5_FLASH,
        ["googleAiStudio", "google", "gemini", "google-ai", "google-ai-studio"],
        PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.GOOGLE_AI),
      );

      // Register OpenAI provider
      ProviderFactory.registerProvider(
        AIProviderName.OPENAI,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: NeuroLink,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const openaiCreds = credentials as NeurolinkCredentials["openai"];
          const { OpenAIProvider } =
            await import("../providers/openAI/index.js");
          return new OpenAIProvider(modelName, sdk, undefined, openaiCreds);
        },
        OpenAIModels.GPT_4O_MINI,
        ["gpt", "chatgpt"],
        PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.OPENAI),
      );

      // Register Anthropic provider
      ProviderFactory.registerProvider(
        AIProviderName.ANTHROPIC,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: NeuroLink,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const anthropicCreds =
            credentials as NeurolinkCredentials["anthropic"];
          const { AnthropicProvider } =
            await import("../providers/anthropic/index.js");
          return new AnthropicProvider(
            modelName,
            sdk,
            undefined,
            anthropicCreds,
          );
        },
        AnthropicModels.CLAUDE_SONNET_4_6,
        ["claude", "anthropic"],
        PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.ANTHROPIC),
      );

      // Register Amazon Bedrock provider
      ProviderFactory.registerProvider(
        AIProviderName.BEDROCK,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: NeuroLink,
          region?: string,
          credentials?: UnknownRecord,
        ) => {
          const bedrockCreds = credentials as NeurolinkCredentials["bedrock"];
          const { AmazonBedrockProvider } =
            await import("../providers/amazonBedrock/index.js");
          return new AmazonBedrockProvider(
            modelName,
            sdk,
            region,
            bedrockCreds,
          );
        },
        undefined, // Let provider read BEDROCK_MODEL from .env
        ["bedrock", "aws"],
        PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.BEDROCK),
      );

      // Register Azure OpenAI provider
      ProviderFactory.registerProvider(
        AIProviderName.AZURE,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: NeuroLink,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const azureCreds = credentials as NeurolinkCredentials["azure"];
          const { AzureOpenAIProvider } =
            await import("../providers/azureOpenai.js");
          return new AzureOpenAIProvider(modelName, sdk, undefined, azureCreds);
        },
        process.env.AZURE_MODEL ||
          process.env.AZURE_OPENAI_MODEL ||
          process.env.AZURE_OPENAI_DEPLOYMENT ||
          process.env.AZURE_OPENAI_DEPLOYMENT_ID ||
          "gpt-4o-mini",
        ["azure", "azureOpenai"],
        PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.AZURE),
      );

      // Register Google Vertex AI provider
      ProviderFactory.registerProvider(
        AIProviderName.VERTEX,
        async (
          modelName?: string,
          providerName?: string,
          sdk?: NeuroLink,
          region?: string,
          credentials?: UnknownRecord,
        ) => {
          const vertexCreds = credentials as NeurolinkCredentials["vertex"];
          const { GoogleVertexProvider } =
            await import("../providers/googleVertex/index.js");
          return new GoogleVertexProvider(
            modelName,
            providerName,
            sdk,
            region,
            vertexCreds,
          );
        },
        VertexModels.CLAUDE_4_6_SONNET,
        ["vertex", "googleVertex"],
        PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.VERTEX),
      );

      // Register Hugging Face provider (Unified Router implementation)
      ProviderFactory.registerProvider(
        AIProviderName.HUGGINGFACE,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: NeuroLink,
          region?: string,
          credentials?: UnknownRecord,
        ) => {
          const hfCreds = credentials as NeurolinkCredentials["huggingFace"];
          const { HuggingFaceProvider } =
            await import("../providers/huggingFace/index.js");
          return new HuggingFaceProvider(modelName, sdk, region, hfCreds);
        },
        process.env.HUGGINGFACE_MODEL ||
          HuggingFaceModels.QWEN_2_5_72B_INSTRUCT,
        ["huggingface", "hf"],
        PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.HUGGINGFACE),
      );

      // Register the config-driven OpenAI-compatible catalog providers
      // (cerebras, groq, xai, together-ai, fireworks, perplexity, mistral,
      // cloudflare).
      // To add a new zero-quirk OpenAI-compatible provider, add one entry to
      // OPENAI_COMPAT_CATALOG (openaiCompatCatalog.ts) — not a new block here.
      for (const entry of OPENAI_COMPAT_CATALOG) {
        ProviderFactory.registerProvider(
          entry.providerName,
          async (
            modelName?: string,
            _providerName?: string,
            sdk?: NeuroLink,
            _region?: string,
            credentials?: UnknownRecord,
          ) => {
            const { ConfiguredOpenAICompatProvider } =
              await import("../providers/configuredOpenAICompat.js");
            return new ConfiguredOpenAICompatProvider(
              entry,
              modelName,
              sdk,
              credentials as OpenAICompatCredentials | undefined,
            );
          },
          entry.registryDefaultModelChecksEnvVar
            ? process.env[entry.modelEnvVar] || entry.registryDefaultModel
            : entry.registryDefaultModel,
          entry.aliases,
          PROVIDER_DESCRIPTORS_BY_NAME.get(entry.providerName),
        );
      }

      // Register Ollama provider
      ProviderFactory.registerProvider(
        AIProviderName.OLLAMA,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: NeuroLink,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const ollamaCreds = credentials as NeurolinkCredentials["ollama"];
          const { OllamaProvider } =
            await import("../providers/ollama/index.js");
          return new OllamaProvider(modelName, sdk, undefined, ollamaCreds);
        },
        process.env.OLLAMA_MODEL || OllamaModels.LLAMA3_2_LATEST,
        ["ollama", "local"],
        PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.OLLAMA),
      );

      // Register LiteLLM provider
      ProviderFactory.registerProvider(
        AIProviderName.LITELLM,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: NeuroLink,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const litellmCreds = credentials as NeurolinkCredentials["litellm"];
          const { LiteLLMProvider } =
            await import("../providers/litellm/index.js");
          return new LiteLLMProvider(modelName, sdk, undefined, litellmCreds);
        },
        process.env.LITELLM_MODEL || LiteLLMModels.OPENAI_GPT_4O_MINI,
        ["litellm"],
        PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.LITELLM),
      );

      // Register OpenAI Compatible provider
      ProviderFactory.registerProvider(
        AIProviderName.OPENAI_COMPATIBLE,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: NeuroLink,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const openaiCompatCreds =
            credentials as NeurolinkCredentials["openaiCompatible"];
          const { OpenAICompatibleProvider } =
            await import("../providers/openaiCompatible/index.js");
          return new OpenAICompatibleProvider(
            modelName,
            sdk,
            undefined,
            openaiCompatCreds,
          );
        },
        process.env.OPENAI_COMPATIBLE_MODEL || undefined, // Enable auto-discovery when no model specified
        ["openai-compatible", "vllm", "compatible"],
        PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.OPENAI_COMPATIBLE),
      );

      // Register OpenRouter provider (300+ models from 60+ providers)
      ProviderFactory.registerProvider(
        AIProviderName.OPENROUTER,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: NeuroLink,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const openrouterCreds =
            credentials as NeurolinkCredentials["openrouter"];
          const { OpenRouterProvider } =
            await import("../providers/openRouter/index.js");
          return new OpenRouterProvider(
            modelName,
            sdk,
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
        PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.OPENROUTER),
      );

      // Register Amazon SageMaker provider
      ProviderFactory.registerProvider(
        AIProviderName.SAGEMAKER,
        async (
          modelName?: string,
          _providerName?: string,
          _sdk?: NeuroLink,
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
        PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.SAGEMAKER),
      );

      // Register DeepSeek provider
      ProviderFactory.registerProvider(
        AIProviderName.DEEPSEEK,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: NeuroLink,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const deepseekCreds = credentials as NeurolinkCredentials["deepseek"];
          const { DeepSeekProvider } = await import("../providers/deepseek.js");
          return new DeepSeekProvider(modelName, sdk, undefined, deepseekCreds);
        },
        process.env.DEEPSEEK_MODEL || DeepSeekModels.DEEPSEEK_CHAT,
        ["deepseek", "ds"],
        PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.DEEPSEEK),
      );

      // Register NVIDIA NIM provider
      ProviderFactory.registerProvider(
        AIProviderName.NVIDIA_NIM,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: NeuroLink,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const nimCreds = credentials as NeurolinkCredentials["nvidiaNim"];
          const { NvidiaNimProvider } =
            await import("../providers/nvidiaNim/index.js");
          return new NvidiaNimProvider(modelName, sdk, undefined, nimCreds);
        },
        process.env.NVIDIA_NIM_MODEL || NvidiaNimModels.LLAMA_3_3_70B_INSTRUCT,
        ["nvidia", "nim", "nvidia-nim"],
        PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.NVIDIA_NIM),
      );

      // Register LM Studio provider (local)
      ProviderFactory.registerProvider(
        AIProviderName.LM_STUDIO,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: NeuroLink,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const lmStudioCreds = credentials as NeurolinkCredentials["lmStudio"];
          const { LMStudioProvider } = await import("../providers/lmStudio.js");
          return new LMStudioProvider(modelName, sdk, undefined, lmStudioCreds);
        },
        process.env.LM_STUDIO_MODEL || undefined,
        ["lmstudio", "lm-studio", "lms"],
        PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.LM_STUDIO),
      );

      // Register llama.cpp provider (local)
      ProviderFactory.registerProvider(
        AIProviderName.LLAMACPP,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: NeuroLink,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const llamaCppCreds = credentials as NeurolinkCredentials["llamacpp"];
          const { LlamaCppProvider } = await import("../providers/llamaCpp.js");
          return new LlamaCppProvider(modelName, sdk, undefined, llamaCppCreds);
        },
        process.env.LLAMACPP_MODEL || undefined,
        ["llamacpp", "llama.cpp", "llama-cpp"],
        PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.LLAMACPP),
      );
      // Register Cohere provider
      ProviderFactory.registerProvider(
        AIProviderName.COHERE,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: NeuroLink,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const cohereCreds = credentials as NeurolinkCredentials["cohere"];
          const { CohereProvider } = await import("../providers/cohere.js");
          return new CohereProvider(modelName, sdk, undefined, cohereCreds);
        },
        process.env.COHERE_MODEL || CohereModels.COMMAND_R_PLUS,
        ["cohere"],
        PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.COHERE),
      );

      // Register Voyage AI embeddings provider
      ProviderFactory.registerProvider(
        AIProviderName.VOYAGE,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: NeuroLink,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const voyageCreds = credentials as NeurolinkCredentials["voyage"];
          const { VoyageProvider } = await import("../providers/voyage.js");
          return new VoyageProvider(modelName, sdk, undefined, voyageCreds);
        },
        process.env.VOYAGE_MODEL || VoyageModels.VOYAGE_3_5,
        ["voyage", "voyage-ai"],
        PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.VOYAGE),
      );

      // Register Jina AI embeddings + reranking provider
      ProviderFactory.registerProvider(
        AIProviderName.JINA,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: NeuroLink,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const jinaCreds = credentials as NeurolinkCredentials["jina"];
          const { JinaProvider } = await import("../providers/jina.js");
          return new JinaProvider(modelName, sdk, undefined, jinaCreds);
        },
        process.env.JINA_MODEL || JinaModels.JINA_EMBEDDINGS_V3,
        ["jina", "jina-ai"],
        PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.JINA),
      );

      // Register Stability AI image-gen provider
      ProviderFactory.registerProvider(
        AIProviderName.STABILITY,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: NeuroLink,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const stabilityCreds =
            credentials as NeurolinkCredentials["stability"];
          const { StabilityProvider } =
            await import("../providers/stability.js");
          return new StabilityProvider(
            modelName,
            sdk,
            undefined,
            stabilityCreds,
          );
        },
        process.env.STABILITY_MODEL || StabilityModels.STABLE_IMAGE_ULTRA,
        ["stability", "stability-ai", "sd"],
        PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.STABILITY),
      );

      // Register Ideogram image-gen provider
      ProviderFactory.registerProvider(
        AIProviderName.IDEOGRAM,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: NeuroLink,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const ideogramCreds = credentials as NeurolinkCredentials["ideogram"];
          const { IdeogramProvider } = await import("../providers/ideogram.js");
          return new IdeogramProvider(modelName, sdk, undefined, ideogramCreds);
        },
        process.env.IDEOGRAM_MODEL || IdeogramModels.IDEOGRAM_V3,
        ["ideogram"],
        PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.IDEOGRAM),
      );

      // Register Replicate LLM provider (multi-modal — also serves video /
      // avatar / music handlers via dedicated processors registered below)
      ProviderFactory.registerProvider(
        AIProviderName.REPLICATE,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: NeuroLink,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const replicateCreds =
            credentials as NeurolinkCredentials["replicate"];
          const { ReplicateProvider } =
            await import("../providers/replicate.js");
          return new ReplicateProvider(
            modelName,
            sdk,
            undefined,
            replicateCreds,
          );
        },
        process.env.REPLICATE_MODEL || ReplicateModels.LLAMA_3_70B_INSTRUCT,
        ["replicate"],
        PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.REPLICATE),
      );

      // Register Recraft image-gen provider
      ProviderFactory.registerProvider(
        AIProviderName.RECRAFT,
        async (
          modelName?: string,
          _providerName?: string,
          sdk?: NeuroLink,
          _region?: string,
          credentials?: UnknownRecord,
        ) => {
          const recraftCreds = credentials as NeurolinkCredentials["recraft"];
          const { RecraftProvider } = await import("../providers/recraft.js");
          return new RecraftProvider(modelName, sdk, undefined, recraftCreds);
        },
        process.env.RECRAFT_MODEL || RecraftModels.RECRAFT_V3,
        ["recraft"],
        PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.RECRAFT),
      );

      logger.debug("All AI providers registered successfully");

      // ===== MEDIA HANDLER REGISTRATION =====
      // Single registration path (Task 11): each ecosystem barrel (voice,
      // adapters/video, avatar, music) owns its own provider-name catalog
      // wiring (MEDIA_HANDLER_CATALOG, Task 8) and exposes an idempotent
      // registerDefault*Handlers() function (Task 10) that constructs and
      // registers every shipped handler whose backing credentials are
      // present in process.env. This block's only job is to invoke each of
      // the six functions via dynamic import — no hand-rolled
      // `new XHandler()` + `registerHandler()` calls live here anymore.
      // Each ecosystem keeps its own try/catch so one broken import can't
      // take down the other five (matches the previous block's isolation).

      // ===== TTS HANDLER REGISTRATION =====
      try {
        const { registerDefaultTTSHandlers } =
          await import("../voice/index.js");
        registerDefaultTTSHandlers();
        logger.debug("TTS handler registration attempted", {
          providers: providerChoicesFor("tts"),
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

      // ===== STT HANDLER REGISTRATION =====
      try {
        const { registerDefaultSTTHandlers } =
          await import("../voice/index.js");
        registerDefaultSTTHandlers();
        logger.debug("STT handler registration attempted", {
          providers: providerChoicesFor("stt"),
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
        const { registerDefaultRealtimeHandlers, RealtimeProcessor } =
          await import("../voice/index.js");
        registerDefaultRealtimeHandlers();

        // M9 + NEW4: registerDefaultRealtimeHandlers() swallows per-handler
        // construction failures internally (it's a shared, idempotent
        // barrel function used by every entry point — see voice/index.ts),
        // so the exact per-handler exception text the old inline block
        // captured is no longer available here. Recover per-name pass/fail
        // via supports() instead so getRegistrationReport() stays truthful
        // for callers that poll it.
        const realtimeNames = providerChoicesFor("realtime");
        const realtimeOutcomes: Record<string, "ok" | string> = {};
        for (const name of realtimeNames) {
          realtimeOutcomes[name] = RealtimeProcessor.supports(name)
            ? "ok"
            : "registration failed or handler unavailable";
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
            `[ProviderRegistry] Realtime handlers registered: ${realtimeNames.join(", ")}`,
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
        const { registerDefaultVideoHandlers } =
          await import("../adapters/video/index.js");
        registerDefaultVideoHandlers();
        logger.debug("Video handler registration attempted", {
          providers: providerChoicesFor("video"),
        });
      } catch (err) {
        logger.warn(
          `[ProviderRegistry] video registration block failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      // ===== AVATAR HANDLER REGISTRATION =====
      try {
        const { registerDefaultAvatarHandlers } =
          await import("../avatar/index.js");
        registerDefaultAvatarHandlers();
        logger.debug("Avatar handler registration attempted", {
          providers: providerChoicesFor("avatar"),
        });
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
        const { registerDefaultMusicHandlers } =
          await import("../music/index.js");
        registerDefaultMusicHandlers();
        logger.debug("Music handler registration attempted", {
          providers: providerChoicesFor("music"),
        });
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
