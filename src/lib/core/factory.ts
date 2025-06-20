import {
  GoogleVertexAI,
  AmazonBedrock,
  OpenAI,
  AnthropicProvider,
  AzureOpenAIProvider,
  GoogleAIStudio,
  HuggingFace,
  Ollama,
  MistralAI,
} from "../providers/index.js";
import { getBestProvider } from "../utils/providerUtils.js";
import { logger } from "../utils/logger.js";
import { dynamicModelProvider } from "./dynamic-models.js";
import type {
  AIProvider,
  AIProviderName,
  SupportedModelName,
  TextGenerationOptions,
  StreamTextOptions,
} from "./types.js";

const componentIdentifier = "aiProviderFactory";

/**
 * Factory for creating AI provider instances with centralized configuration
 */
export class AIProviderFactory {
  /**
   * Normalize provider name to match dynamic model registry keys
   */
  private static normalizeProviderName(providerName: string): string {
    switch (providerName.toLowerCase()) {
      case "vertex":
      case "google":
      case "gemini":
        return "google";
      case "bedrock":
      case "amazon":
      case "aws":
        return "bedrock";
      case "openai":
      case "gpt":
        return "openai";
      case "anthropic":
      case "claude":
        return "anthropic";
      case "azure":
      case "azure-openai":
        return "openai"; // Azure uses OpenAI models
      case "google-ai":
      case "google-studio":
        return "google";
      case "huggingface":
      case "hugging-face":
      case "hf":
        return "huggingface";
      case "ollama":
      case "local":
      case "local-ollama":
        return "ollama";
      case "mistral":
      case "mistral-ai":
      case "mistralai":
        return "mistral";
      default:
        return providerName.toLowerCase();
    }
  }
  /**
   * Create a provider instance for the specified provider type
   * @param providerName - Name of the provider ('vertex', 'bedrock', 'openai')
   * @param modelName - Optional model name override
   * @param enableMCP - Optional flag to enable MCP integration (default: true)
   * @returns AIProvider instance
   */
  static async createProvider(
    providerName: string,
    modelName?: string | null,
    enableMCP: boolean = true,
  ): Promise<AIProvider> {
    const functionTag = "AIProviderFactory.createProvider";

    logger.debug(`[${functionTag}] Provider creation started`, {
      providerName,
      modelName: modelName || "default",
      enableMCP,
    });

    try {
      // EMERGENCY FIX: Skip dynamic model provider initialization to prevent hanging
      // TODO: Fix the hanging dynamic model provider.initialize()
      // Initialize dynamic model provider if not already done
      // try {
      //   if (dynamicModelProvider.needsRefresh()) {
      //     // Add timeout to prevent hanging
      //     await Promise.race([
      //       dynamicModelProvider.initialize(),
      //       new Promise((_, reject) =>
      //         setTimeout(() => reject(new Error('Dynamic model provider timeout')), 3000)
      //       )
      //     ]);
      //   }
      // } catch (dynamicError) {
      //   logger.warn(`[${functionTag}] Dynamic model provider initialization failed, using fallback`, {
      //     error: dynamicError instanceof Error ? dynamicError.message : String(dynamicError),
      //   });
      // }

      // Resolve dynamic model if available
      let resolvedModelName = modelName;
      if (!modelName || modelName === "default") {
        try {
          const normalizedProvider = this.normalizeProviderName(providerName);
          const dynamicModel = dynamicModelProvider.resolveModel(
            normalizedProvider,
            modelName || undefined,
          );
          if (dynamicModel) {
            resolvedModelName = dynamicModel.id;
            logger.debug(`[${functionTag}] Resolved dynamic model`, {
              provider: normalizedProvider,
              requestedModel: modelName || "default",
              resolvedModel: resolvedModelName,
              displayName: dynamicModel.displayName,
              pricing: dynamicModel.pricing.input,
            });
          }
        } catch (resolveError) {
          logger.debug(
            `[${functionTag}] Dynamic model resolution failed, using fallback`,
            {
              error:
                resolveError instanceof Error
                  ? resolveError.message
                  : String(resolveError),
            },
          );
        }
      }

      let provider: AIProvider;

      switch (providerName.toLowerCase()) {
        case "vertex":
        case "google":
        case "gemini":
          provider = new GoogleVertexAI(
            resolvedModelName === "default" ? null : resolvedModelName,
          );
          break;
        case "bedrock":
        case "amazon":
        case "aws":
          provider = new AmazonBedrock(
            resolvedModelName === "default" ? null : resolvedModelName,
          );
          break;
        case "openai":
        case "gpt":
          provider = new OpenAI(
            resolvedModelName === "default" ? null : resolvedModelName,
          );
          break;
        case "anthropic":
        case "claude":
          provider = new AnthropicProvider();
          break;
        case "azure":
        case "azure-openai":
          provider = new AzureOpenAIProvider();
          break;
        case "google-ai":
        case "google-studio":
          provider = new GoogleAIStudio(
            resolvedModelName === "default" ? null : resolvedModelName,
          );
          break;
        case "huggingface":
        case "hugging-face":
        case "hf":
          provider = new HuggingFace(
            resolvedModelName === "default" ? null : resolvedModelName,
          );
          break;
        case "ollama":
        case "local":
        case "local-ollama":
          provider = new Ollama(
            resolvedModelName === "default"
              ? undefined
              : resolvedModelName || undefined,
          );
          break;
        case "mistral":
        case "mistral-ai":
        case "mistralai":
          provider = new MistralAI(
            resolvedModelName === "default" ? null : resolvedModelName,
          );
          break;
        default:
          throw new Error(
            `Unknown provider: ${providerName}. Supported providers: vertex, bedrock, openai, anthropic, azure, google-ai, huggingface, ollama, mistral`,
          );
      }

      // Wrap with MCP if enabled
      if (enableMCP) {
        try {
          // TEMPORARY: Disable MCP wrapping to test for hanging issues
          logger.debug(
            `[${functionTag}] MCP wrapping temporarily disabled for debugging`,
          );
          // const { createMCPAwareProviderV3 } = await import("../providers/function-calling-provider.js");
          // provider = createMCPAwareProviderV3(provider, {
          //   providerName,
          //   modelName: resolvedModelName || undefined,
          //   enableMCP: true,
          //   enableFunctionCalling: true,
          // });
          // logger.debug(`[${functionTag}] Provider wrapped with MCP support`);
        } catch (mcpError) {
          logger.warn(
            `[${functionTag}] Failed to wrap with MCP, using base provider`,
            {
              error:
                mcpError instanceof Error ? mcpError.message : String(mcpError),
            },
          );
        }
      }

      logger.debug(`[${functionTag}] Provider creation succeeded`, {
        providerName,
        modelName: modelName || "default",
        providerType: provider.constructor.name,
        mcpEnabled: enableMCP,
      });

      return provider;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.debug(`[${functionTag}] Provider creation failed`, {
        providerName,
        modelName: modelName || "default",
        error: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Create a provider instance with specific provider enum and model
   * @param provider - Provider enum value
   * @param model - Specific model enum value
   * @returns AIProvider instance
   */
  static async createProviderWithModel(
    provider: AIProviderName,
    model: SupportedModelName,
  ): Promise<AIProvider> {
    const functionTag = "AIProviderFactory.createProviderWithModel";

    logger.debug(`[${functionTag}] Provider model creation started`, {
      provider,
      model,
    });

    try {
      const providerInstance = await this.createProvider(provider, model);

      logger.debug(`[${functionTag}] Provider model creation succeeded`, {
        provider,
        model,
        providerType: providerInstance.constructor.name,
      });

      return providerInstance;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.debug(`[${functionTag}] Provider model creation failed`, {
        provider,
        model,
        error: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Create the best available provider automatically
   * @param requestedProvider - Optional preferred provider
   * @param modelName - Optional model name override
   * @param enableMCP - Optional flag to enable MCP integration (default: true)
   * @returns AIProvider instance
   */
  static async createBestProvider(
    requestedProvider?: string,
    modelName?: string | null,
    enableMCP: boolean = true,
  ): Promise<AIProvider> {
    const functionTag = "AIProviderFactory.createBestProvider";

    try {
      const bestProvider = getBestProvider(requestedProvider);

      logger.debug(`[${functionTag}] Best provider selected`, {
        requestedProvider: requestedProvider || "auto",
        selectedProvider: bestProvider,
        modelName: modelName || "default",
        enableMCP,
      });

      return await this.createProvider(bestProvider, modelName, enableMCP);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.debug(`[${functionTag}] Best provider selection failed`, {
        requestedProvider: requestedProvider || "auto",
        error: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Create primary and fallback provider instances
   * @param primaryProvider - Primary provider name
   * @param fallbackProvider - Fallback provider name
   * @param modelName - Optional model name override
   * @param enableMCP - Optional flag to enable MCP integration (default: true)
   * @returns Object with primary and fallback providers
   */
  static async createProviderWithFallback(
    primaryProvider: string,
    fallbackProvider: string,
    modelName?: string | null,
    enableMCP: boolean = true,
  ): Promise<{ primary: AIProvider; fallback: AIProvider }> {
    const functionTag = "AIProviderFactory.createProviderWithFallback";

    logger.debug(`[${functionTag}] Fallback provider setup started`, {
      primaryProvider,
      fallbackProvider,
      modelName: modelName || "default",
      enableMCP,
    });

    try {
      const primary = await this.createProvider(
        primaryProvider,
        modelName,
        enableMCP,
      );
      const fallback = await this.createProvider(
        fallbackProvider,
        modelName,
        enableMCP,
      );

      logger.debug(`[${functionTag}] Fallback provider setup succeeded`, {
        primaryProvider,
        fallbackProvider,
        modelName: modelName || "default",
        enableMCP,
      });

      return { primary, fallback };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.debug(`[${functionTag}] Fallback provider setup failed`, {
        primaryProvider,
        fallbackProvider,
        error: errorMessage,
      });

      throw error;
    }
  }
}

export { componentIdentifier };
