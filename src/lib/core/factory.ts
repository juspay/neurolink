// ✅ CIRCULAR DEPENDENCY FIX: Remove barrel export import
// Providers are now managed via ProviderFactory instead of direct imports
import { ProviderFactory } from "../factories/provider-factory.js";
import { ProviderRegistry } from "../factories/provider-registry.js";
import { getBestProvider } from "../utils/providerUtils.js";
import { logger } from "../utils/logger.js";
import { dynamicModelProvider } from "./dynamic-models.js";
import type {
  AIProvider,
  AIProviderName,
  SupportedModelName,
  TextGenerationOptions,
} from "./types.js";

const componentIdentifier = "aiProviderFactory";

/**
 * Factory for creating AI provider instances with centralized configuration
 */
export class AIProviderFactory {
  /**
   * Normalize provider name using ProviderFactory
   */
  private static normalizeProviderName(providerName: string): string {
    // Use ProviderFactory registration - no more legacy switch statements
    const normalized = ProviderFactory.normalizeProviderName(providerName);
    if (normalized) {
      return normalized;
    }

    // If not found in factory, return as-is (will be handled by factory error handling)
    return providerName.toLowerCase();
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
    sdk?: any,
  ): Promise<AIProvider> {
    const functionTag = "AIawait ProviderFactory.createProvider";

    // Providers are registered via ProviderFactory.initialize() on first use

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

      // COMPREHENSIVE FIX: Disable dynamic model resolution completely until provider is fixed
      // This prevents stale gemini-1.5-pro-latest from overriding correct gemini-2.5-pro defaults
      const resolvedModelName = modelName;
      // COMMENTED OUT: Dynamic model resolution causing 1.5 vs 2.5 Pro issues
      // if (!modelName || modelName === "default") {
      //   try {
      //     const normalizedProvider = this.normalizeProviderName(providerName);
      //     const dynamicModel = dynamicModelProvider.resolveModel(
      //       normalizedProvider,
      //       modelName || undefined,
      //     );
      //     if (dynamicModel) {
      //       resolvedModelName = dynamicModel.id;
      //       logger.debug(`[${functionTag}] Resolved dynamic model`, {
      //         provider: normalizedProvider,
      //         requestedModel: modelName || "default",
      //         resolvedModel: resolvedModelName,
      //         displayName: dynamicModel.displayName,
      //         pricing: dynamicModel.pricing.input,
      //       });
      //     }
      //   } catch (resolveError) {
      //     logger.debug(
      //       `[${functionTag}] Dynamic model resolution failed, using fallback`,
      //       {
      //         error:
      //           resolveError instanceof Error
      //             ? resolveError.message
      //             : String(resolveError),
      //       },
      //     );
      //   }
      // }

      let provider: AIProvider;

      // PURE FACTORY PATTERN: No switch statements - use ProviderFactory exclusively
      const normalizedName = this.normalizeProviderName(providerName);
      const finalModelName =
        resolvedModelName === "default" || resolvedModelName === null
          ? undefined
          : resolvedModelName;

      provider = await ProviderFactory.createProvider(
        normalizedName,
        finalModelName,
        sdk,
      );

      logger.debug(
        componentIdentifier,
        "Pure factory pattern provider created",
        {
          providerName: normalizedName,
          modelName: finalModelName,
          factoryUsed: true,
        },
      );

      // PURE FACTORY PATTERN: All providers handled by ProviderFactory - no switch statements needed

      // Wrap with MCP if enabled
      if (enableMCP) {
        try {
          logger.debug(
            `[${functionTag}] Enabling MCP wrapping for AI integration`,
          );
          const { createMCPAwareProviderV3 } = await import(
            "../providers/function-calling-provider.js"
          );
          provider = createMCPAwareProviderV3(provider, {
            providerName,
            modelName: resolvedModelName || undefined,
            enableMCP: true,
            enableFunctionCalling: true,
          });
          logger.debug(`[${functionTag}] Provider wrapped with MCP support`);
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
        modelName: finalModelName || "default",
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
    const functionTag = "AIawait ProviderFactory.createProviderWithModel";

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
    sdk?: any,
  ): Promise<AIProvider> {
    const functionTag = "AIProviderFactory.createBestProvider";

    try {
      const bestProvider = await getBestProvider(requestedProvider);

      logger.debug(`[${functionTag}] Best provider selected`, {
        requestedProvider: requestedProvider || "auto",
        selectedProvider: bestProvider,
        modelName: modelName || "default",
        enableMCP,
      });

      return await this.createProvider(bestProvider, modelName, enableMCP, sdk);
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
    const functionTag = "AIawait ProviderFactory.createProviderWithFallback";

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
