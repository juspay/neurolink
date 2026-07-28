// ✅ CIRCULAR DEPENDENCY FIX: Remove barrel export import
// Providers are now managed via ProviderFactory instead of direct imports
import { SpanKind, SpanStatusCode } from "@opentelemetry/api";
import type { NeuroLink } from "../neurolink.js";
import { tracers } from "../telemetry/tracers.js";
import { ProviderFactory } from "../factories/providerFactory.js";
import { ProviderRegistry } from "../factories/providerRegistry.js";
import { getBestProvider } from "../utils/providerUtils.js";
import { logger } from "../utils/logger.js";
import { dynamicModelProvider } from "./dynamicModels.js";
import { withTimeout, ErrorFactory } from "../utils/errorHandling.js";
import type {
  AIProvider,
  SupportedModelName,
  NeurolinkCredentials,
  ProviderPairResult,
} from "../types/index.js";
import { AIProviderName } from "../constants/enums.js";
const componentIdentifier = "aiProviderFactory";
const factoryTracer = tracers.factory;

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
      await withTimeout(
        dynamicModelProvider.initialize(),
        INIT_TIMEOUT,
        ErrorFactory.toolTimeout("dynamic-provider-init", INIT_TIMEOUT),
      );

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

  private static resolveModelFromEnvironment(
    providerName: string,
    modelName: string | null | undefined,
    functionTag: string,
  ): string | null | undefined {
    if (modelName && modelName !== "default") {
      logger.debug(
        `[${functionTag}] Skipping environment variable check - explicit model provided: ${modelName}`,
      );
      return modelName;
    }

    logger.debug(
      `[${functionTag}] Checking environment variables for provider: ${providerName}`,
    );

    const normalizedProvider = providerName.toLowerCase();
    const envConfigs = [
      {
        match: ["bedrock"],
        label: "Bedrock",
        vars: ["BEDROCK_MODEL", "BEDROCK_MODEL_ID"],
      },
      {
        match: ["vertex"],
        label: "Vertex",
        vars: ["VERTEX_MODEL"],
      },
      {
        match: ["azure"],
        label: "Azure",
        vars: [
          "AZURE_OPENAI_MODEL",
          "AZURE_OPENAI_DEPLOYMENT",
          "AZURE_OPENAI_DEPLOYMENT_ID",
        ],
      },
      {
        match: ["openai", "gpt", "chatgpt", "openai-compat"],
        label: "OpenAI",
        vars: ["OPENAI_MODEL"],
      },
      {
        match: ["anthropic", "claude", "anthropic-claude"],
        label: "Anthropic",
        vars: ["ANTHROPIC_MODEL"],
      },
      {
        match: ["google", "gemini"],
        label: "Google AI",
        vars: ["GOOGLE_AI_MODEL"],
      },
      {
        match: ["mistral"],
        label: "Mistral",
        vars: ["MISTRAL_MODEL"],
      },
      {
        match: ["ollama"],
        label: "Ollama",
        vars: ["OLLAMA_MODEL"],
      },
      {
        match: ["litellm"],
        label: "LiteLLM",
        vars: ["LITELLM_MODEL"],
      },
    ] as const;

    const envConfig = envConfigs.find((config) =>
      config.match.some((match) => normalizedProvider.includes(match)),
    );
    if (!envConfig) {
      logger.debug(
        `[${functionTag}] Provider ${providerName} - no environment variable check implemented`,
      );
      return modelName;
    }

    const matchedVar = envConfig.vars.find((name) => process.env[name]);
    const envModel = matchedVar ? process.env[matchedVar] : undefined;
    if (envModel) {
      logger.debug(
        `[${functionTag}] Environment variable found for ${envConfig.label}`,
        {
          envVariable: matchedVar,
          resolvedModel: envModel,
        },
      );
      return envModel;
    }

    logger.debug(
      `[${functionTag}] No ${envConfig.label} environment variables found (${envConfig.vars.join(", ")})`,
    );
    return modelName;
  }

  private static async resolveDynamicModelName(
    providerName: string,
    modelName: string | null | undefined,
    resolvedModelName: string | null | undefined,
    functionTag: string,
  ): Promise<string | null | undefined> {
    if (
      (resolvedModelName && resolvedModelName !== "default") ||
      (modelName && modelName !== "default")
    ) {
      logger.debug(`[${functionTag}] Skipping dynamic model resolution`, {
        resolvedModelName: resolvedModelName || "none",
        reason:
          "Model already resolved from environment variables or explicit parameter",
      });
      return resolvedModelName;
    }

    logger.debug(`[${functionTag}] Attempting dynamic model resolution`, {
      currentResolvedModel: resolvedModelName || "none",
      reason: "No environment variable found and no explicit model provided",
    });

    try {
      const normalizedProvider = this.normalizeProviderName(providerName);

      if (dynamicModelProvider.needsRefresh()) {
        logger.debug(
          `[${functionTag}] Dynamic model provider needs refresh - initializing`,
        );
        await this.initializeDynamicProviderWithTimeout();
      }

      const dynamicModel = dynamicModelProvider.resolveModel(
        normalizedProvider,
        modelName || undefined,
      );
      if (!dynamicModel) {
        logger.debug(
          `[${functionTag}] Dynamic model resolution returned null`,
          {
            provider: normalizedProvider,
            requestedModel: modelName || "default",
          },
        );
        return resolvedModelName;
      }

      logger.debug(`[${functionTag}] Resolved dynamic model`, {
        provider: normalizedProvider,
        requestedModel: modelName || "default",
        resolvedModel: dynamicModel.id,
        displayName: dynamicModel.displayName,
        pricing: dynamicModel.pricing.input,
      });
      return dynamicModel.id;
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
      return resolvedModelName;
    }
  }

  private static async createResolvedProvider(
    providerName: string,
    resolvedModelName: string | null | undefined,
    sdk: NeuroLink | undefined,
    region: string | undefined,
    functionTag: string,
    credentials?: NeurolinkCredentials,
  ): Promise<{
    normalizedName: string;
    finalModelName: string | undefined;
    provider: AIProvider;
  }> {
    await withTimeout(
      ProviderRegistry.registerAllProviders(),
      30_000,
      ErrorFactory.toolTimeout("provider-registration", 30_000),
    );

    const normalizedName = this.normalizeProviderName(providerName);
    const finalModelName =
      resolvedModelName === "default" || resolvedModelName === null
        ? undefined
        : resolvedModelName;

    logger.debug(`[${functionTag}] Final provider configuration`, {
      originalProviderName: providerName,
      normalizedProviderName: normalizedName,
      resolvedModelName: resolvedModelName || "not resolved",
      finalModelName: finalModelName || "using provider default",
    });

    const provider = await withTimeout(
      ProviderFactory.createProvider(
        normalizedName,
        finalModelName,
        sdk,
        region,
        credentials,
      ),
      30_000,
      ErrorFactory.toolTimeout(`provider-creation:${normalizedName}`, 30_000),
    );

    return { normalizedName, finalModelName, provider };
  }
  /**
   * Create a provider instance for the specified provider type
   * @param providerName - Name of the provider ('vertex', 'bedrock', 'openai')
   * @param modelName - Optional model name override
   * @param enableMCP - Optional flag to enable MCP integration (default: true)
   * @param sdk - SDK instance
   * @param region - Optional region override for cloud providers
   * @returns AIProvider instance
   */
  static async createProvider(
    providerName: string,
    modelName?: string | null,
    enableMCP: boolean = true,
    sdk?: NeuroLink,
    region?: string,
    credentials?: NeurolinkCredentials,
  ): Promise<AIProvider> {
    const functionTag = "AIProviderFactory.createProvider";

    // Providers are registered via ProviderFactory.initialize() on first use

    return factoryTracer.startActiveSpan(
      "neurolink.factory.createProvider",
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          "provider.name": providerName,
          "model.name": modelName || "default",
          "mcp.enabled": enableMCP,
        },
      },
      async (span) => {
        logger.debug(`[${functionTag}] Provider creation started`, {
          providerName,
          modelName: modelName || "default",
          enableMCP,
          environmentVariables: {
            BEDROCK_MODEL: process.env.BEDROCK_MODEL || "not set",
            BEDROCK_MODEL_ID: process.env.BEDROCK_MODEL_ID || "not set",
            VERTEX_MODEL: process.env.VERTEX_MODEL || "not set",
            OPENAI_MODEL: process.env.OPENAI_MODEL || "not set",
          },
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

          let resolvedModelName = this.resolveModelFromEnvironment(
            providerName,
            modelName,
            functionTag,
          );
          resolvedModelName = await this.resolveDynamicModelName(
            providerName,
            modelName,
            resolvedModelName,
            functionTag,
          );
          const { normalizedName, finalModelName, provider } =
            await this.createResolvedProvider(
              providerName,
              resolvedModelName,
              sdk,
              region,
              functionTag,
              credentials,
            );

          // Summary logging in format expected by debugging tools
          logger.debug(
            `[AIProviderFactory] Provider creation completed { providerName: '${normalizedName}', modelName: '${finalModelName}' }`,
          );
          logger.debug(`[AIProviderFactory] Resolved model: ${finalModelName}`);

          logger.debug(
            componentIdentifier,
            "Pure factory pattern provider created",
            {
              providerName: normalizedName,
              modelName: finalModelName,
              factoryUsed: true,
            },
          );

          span.setAttribute("provider.resolved_name", normalizedName);
          if (finalModelName) {
            span.setAttribute("model.resolved_name", finalModelName);
          }

          logger.debug(`[${functionTag}] Provider creation succeeded`, {
            providerName,
            modelName: finalModelName || "default",
            providerType: provider.constructor.name,
            mcpEnabled: enableMCP,
          });

          span.setStatus({ code: SpanStatusCode.OK });
          return provider;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          span.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });
          span.recordException(
            error instanceof Error ? error : new Error(String(error)),
          );

          logger.debug(`[${functionTag}] Provider creation failed`, {
            providerName,
            modelName: modelName || "default",
            error: errorMessage,
          });

          throw error;
        } finally {
          span.end();
        }
      },
    );
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
    sdk?: NeuroLink,
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
  ): Promise<ProviderPairResult<AIProvider>> {
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
