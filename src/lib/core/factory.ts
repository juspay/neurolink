// ✅ CIRCULAR DEPENDENCY FIX: Remove barrel export import
// Providers are now managed via ProviderFactory instead of direct imports
import { SpanKind, SpanStatusCode } from "@opentelemetry/api";
import { tracers } from "../telemetry/tracers.js";
import { ProviderFactory } from "../factories/providerFactory.js";
import { ProviderRegistry } from "../factories/providerRegistry.js";
import { getBestProvider } from "../utils/providerUtils.js";
import { logger } from "../utils/logger.js";
import { dynamicModelProvider } from "./dynamicModels.js";
import { withTimeout } from "../utils/errorHandling.js";
import type { AIProvider, SupportedModelName } from "../types/index.js";
import { AIProviderName } from "../constants/enums.js";
import type { UnknownRecord } from "../types/common.js";
import type { ProviderPairResult } from "../types/typeAliases.js";

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
        new Error("Dynamic provider initialization timeout"),
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
    sdk?: UnknownRecord,
    region?: string,
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

          let resolvedModelName = modelName;

          // PRIORITY 1: Check environment variables BEFORE dynamic resolution
          if (!modelName || modelName === "default") {
            logger.debug(
              `[${functionTag}] Checking environment variables for provider: ${providerName}`,
            );

            // Check for provider-specific environment variables first
            if (providerName.toLowerCase().includes("bedrock")) {
              const envModel =
                process.env.BEDROCK_MODEL || process.env.BEDROCK_MODEL_ID;
              if (envModel) {
                resolvedModelName = envModel;
                logger.debug(
                  `[${functionTag}] Environment variable found for Bedrock`,
                  {
                    envVariable: process.env.BEDROCK_MODEL
                      ? "BEDROCK_MODEL"
                      : "BEDROCK_MODEL_ID",
                    resolvedModel: envModel,
                  },
                );
              } else {
                logger.debug(
                  `[${functionTag}] No Bedrock environment variables found (BEDROCK_MODEL, BEDROCK_MODEL_ID)`,
                );
              }
            } else if (providerName.toLowerCase().includes("vertex")) {
              const envModel = process.env.VERTEX_MODEL;
              if (envModel) {
                resolvedModelName = envModel;
                logger.debug(
                  `[${functionTag}] Environment variable found for Vertex`,
                  {
                    envVariable: "VERTEX_MODEL",
                    resolvedModel: envModel,
                  },
                );
              } else {
                logger.debug(
                  `[${functionTag}] No Vertex environment variables found (VERTEX_MODEL)`,
                );
              }
            } else if (providerName.toLowerCase().includes("azure")) {
              const envModel =
                process.env.AZURE_OPENAI_MODEL ||
                process.env.AZURE_OPENAI_DEPLOYMENT ||
                process.env.AZURE_OPENAI_DEPLOYMENT_ID;
              if (envModel) {
                resolvedModelName = envModel;
                logger.debug(
                  `[${functionTag}] Environment variable found for Azure`,
                  {
                    envVariable: process.env.AZURE_OPENAI_MODEL
                      ? "AZURE_OPENAI_MODEL"
                      : process.env.AZURE_OPENAI_DEPLOYMENT
                        ? "AZURE_OPENAI_DEPLOYMENT"
                        : "AZURE_OPENAI_DEPLOYMENT_ID",
                    resolvedModel: envModel,
                  },
                );
              } else {
                logger.debug(
                  `[${functionTag}] No Azure environment variables found (AZURE_OPENAI_MODEL, AZURE_OPENAI_DEPLOYMENT, AZURE_OPENAI_DEPLOYMENT_ID)`,
                );
              }
            } else if (providerName.toLowerCase().includes("openai")) {
              const envModel = process.env.OPENAI_MODEL;
              if (envModel) {
                resolvedModelName = envModel;
                logger.debug(
                  `[${functionTag}] Environment variable found for OpenAI`,
                  {
                    envVariable: "OPENAI_MODEL",
                    resolvedModel: envModel,
                  },
                );
              } else {
                logger.debug(
                  `[${functionTag}] No OpenAI environment variables found (OPENAI_MODEL)`,
                );
              }
            } else if (providerName.toLowerCase().includes("anthropic")) {
              const envModel = process.env.ANTHROPIC_MODEL;
              if (envModel) {
                resolvedModelName = envModel;
                logger.debug(
                  `[${functionTag}] Environment variable found for Anthropic`,
                  {
                    envVariable: "ANTHROPIC_MODEL",
                    resolvedModel: envModel,
                  },
                );
              } else {
                logger.debug(
                  `[${functionTag}] No Anthropic environment variables found (ANTHROPIC_MODEL)`,
                );
              }
            } else if (
              providerName.toLowerCase().includes("google") ||
              providerName.toLowerCase().includes("gemini")
            ) {
              const envModel = process.env.GOOGLE_AI_MODEL;
              if (envModel) {
                resolvedModelName = envModel;
                logger.debug(
                  `[${functionTag}] Environment variable found for Google AI`,
                  {
                    envVariable: "GOOGLE_AI_MODEL",
                    resolvedModel: envModel,
                  },
                );
              } else {
                logger.debug(
                  `[${functionTag}] No Google AI environment variables found (GOOGLE_AI_MODEL)`,
                );
              }
            } else if (providerName.toLowerCase().includes("mistral")) {
              const envModel = process.env.MISTRAL_MODEL;
              if (envModel) {
                resolvedModelName = envModel;
                logger.debug(
                  `[${functionTag}] Environment variable found for Mistral`,
                  {
                    envVariable: "MISTRAL_MODEL",
                    resolvedModel: envModel,
                  },
                );
              } else {
                logger.debug(
                  `[${functionTag}] No Mistral environment variables found (MISTRAL_MODEL)`,
                );
              }
            } else if (providerName.toLowerCase().includes("ollama")) {
              const envModel = process.env.OLLAMA_MODEL;
              if (envModel) {
                resolvedModelName = envModel;
                logger.debug(
                  `[${functionTag}] Environment variable found for Ollama`,
                  {
                    envVariable: "OLLAMA_MODEL",
                    resolvedModel: envModel,
                  },
                );
              } else {
                logger.debug(
                  `[${functionTag}] No Ollama environment variables found (OLLAMA_MODEL)`,
                );
              }
            } else {
              logger.debug(
                `[${functionTag}] Provider ${providerName} - no environment variable check implemented`,
              );
            }
          } else {
            logger.debug(
              `[${functionTag}] Skipping environment variable check - explicit model provided: ${modelName}`,
            );
          }

          // PRIORITY 2: Enable dynamic model resolution only if no env var found
          if (
            (!resolvedModelName || resolvedModelName === "default") &&
            (!modelName || modelName === "default")
          ) {
            logger.debug(
              `[${functionTag}] Attempting dynamic model resolution`,
              {
                currentResolvedModel: resolvedModelName || "none",
                reason:
                  "No environment variable found and no explicit model provided",
              },
            );

            try {
              const normalizedProvider =
                this.normalizeProviderName(providerName);

              // Initialize with timeout protection - won't hang anymore
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

              if (dynamicModel) {
                resolvedModelName = dynamicModel.id;
                logger.debug(`[${functionTag}] Resolved dynamic model`, {
                  provider: normalizedProvider,
                  requestedModel: modelName || "default",
                  resolvedModel: resolvedModelName,
                  displayName: dynamicModel.displayName,
                  pricing: dynamicModel.pricing.input,
                });
              } else {
                logger.debug(
                  `[${functionTag}] Dynamic model resolution returned null`,
                  {
                    provider: normalizedProvider,
                    requestedModel: modelName || "default",
                  },
                );
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
          } else {
            logger.debug(`[${functionTag}] Skipping dynamic model resolution`, {
              resolvedModelName: resolvedModelName || "none",
              reason:
                "Model already resolved from environment variables or explicit parameter",
            });
          }

          // CRITICAL FIX: Initialize providers before using them
          await withTimeout(
            ProviderRegistry.registerAllProviders(),
            30_000,
            new Error("Provider registration timed out"),
          );

          // PURE FACTORY PATTERN: No switch statements - use ProviderFactory exclusively
          const normalizedName = this.normalizeProviderName(providerName);
          const finalModelName =
            resolvedModelName === "default" || resolvedModelName === null
              ? undefined
              : resolvedModelName;

          logger.debug(`[${functionTag}] Final provider configuration`, {
            originalProviderName: providerName,
            normalizedProviderName: normalizedName,
            originalModelName: modelName || "not provided",
            resolvedModelName: resolvedModelName || "not resolved",
            finalModelName: finalModelName || "using provider default",
          });

          // Create provider with enhanced SDK and region support
          const provider = await withTimeout(
            ProviderFactory.createProvider(
              normalizedName,
              finalModelName,
              sdk,
              region,
            ),
            30_000,
            new Error(`Provider creation timed out for ${normalizedName}`),
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
