// ✅ CIRCULAR DEPENDENCY FIX: Remove barrel export import
// Providers are now managed via ProviderFactory instead of direct imports
import { ProviderFactory } from "../factories/providerFactory.js";
import { ProviderRegistry } from "../factories/providerRegistry.js";
import { getBestProvider } from "../utils/providerUtils.js";
import { logger } from "../utils/logger.js";
import { dynamicModelProvider } from "./dynamicModels.js";
import type {
  AIProvider,
  AIProviderName,
  SupportedModelName,
  TextGenerationOptions,
} from "./types.js";
import type { UnknownRecord } from "../types/common.js";

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
   * Initialize dynamic model provider with timeout protection
   * Prevents hanging on non-responsive endpoints
   */
  private static async initializeDynamicProviderWithTimeout(): Promise<void> {
    const functionTag =
      "AIProviderFactory.initializeDynamicProviderWithTimeout";
    const INIT_TIMEOUT = 10000; // 10 seconds total timeout for initialization

    try {
      // Race the initialization against a timeout
      await Promise.race([
        dynamicModelProvider.initialize(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Dynamic provider initialization timeout")),
            INIT_TIMEOUT,
          ),
        ),
      ]);

      logger.debug(
        `[${functionTag}] Dynamic model provider initialized successfully`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.warn(
        `[${functionTag}] Dynamic model provider initialization failed`,
        {
          error: errorMessage,
          fallback: "Using static model defaults",
        },
      );

      // Don't throw - graceful degradation to static models
      // This ensures the factory continues to work even if dynamic models fail
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
    sdk?: UnknownRecord,
  ): Promise<AIProvider> {
    const functionTag = "AIawait ProviderFactory.createProvider";

    // Providers are registered via ProviderFactory.initialize() on first use

    logger.debug(`[${functionTag}] Provider creation started`, {
      providerName,
      modelName: modelName || "default",
      enableMCP,
    });

    try {
      // DYNAMIC MODEL PROVIDER STATUS (2025): Enhanced with timeout handling
      //
      // ✅ FIXED: Hanging issues resolved with comprehensive timeout implementation
      // - Added robust timeout handling (3s localhost, 5s GitHub, 1s local file)
      // - Implemented health checks for localhost endpoints
      // - Added graceful degradation when all sources fail
      // - Enhanced error handling and logging for debugging
      //
      // The dynamic model provider now provides reliable functionality without hanging

      let resolvedModelName = modelName;

      // Enable dynamic model resolution with timeout-protected initialization
      if (!modelName || modelName === "default") {
        try {
          const normalizedProvider = this.normalizeProviderName(providerName);

          // Initialize with timeout protection - won't hang anymore
          if (dynamicModelProvider.needsRefresh()) {
            await this.initializeDynamicProviderWithTimeout();
          }

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
            `[${functionTag}] Dynamic model resolution failed, using static fallback`,
            {
              error:
                resolveError instanceof Error
                  ? resolveError.message
                  : String(resolveError),
            },
          );
          // Continue with static model name - no functionality loss
        }
      }

      // CRITICAL FIX: Initialize providers before using them
      await ProviderRegistry.registerAllProviders();

      // PURE FACTORY PATTERN: No switch statements - use ProviderFactory exclusively
      const normalizedName = this.normalizeProviderName(providerName);
      const finalModelName =
        resolvedModelName === "default" || resolvedModelName === null
          ? undefined
          : resolvedModelName;

      const provider = await ProviderFactory.createProvider(
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
            `[${functionTag}] MCP wrapping disabled - functionCalling removed`,
          );
          // MCP wrapping simplified - removed functionCalling dependency
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
    sdk?: UnknownRecord,
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
