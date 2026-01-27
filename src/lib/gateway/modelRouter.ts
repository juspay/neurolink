/**
 * Model Router
 *
 * Smart routing logic for directing requests to the optimal provider.
 * Handles direct routing, OpenRouter gateway, and LiteLLM proxy.
 */

import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModelV1 } from "ai";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import { logger } from "../utils/logger.js";
import { LITELLM_CONFIG, OPENROUTER_CONFIG } from "./constants.js";
import {
  ConfigurationError,
  MissingApiKeyError,
  RoutingError,
} from "./errors.js";
import {
  normalizeProviderName,
  parseModelString,
} from "./modelStringParser.js";
import {
  getNeuroLinkProviderName,
  getRoutingStrategy,
  isLiteLLMConfigured,
  isOpenRouterConfigured,
  shouldUseNeuroLinkProvider,
} from "./providerMapper.js";
import { getGlobalFetcher } from "./registryFetcher.js";
import type {
  GatewayModelInfo,
  GatewayOptions,
  RoutingStrategy,
} from "./types.js";

/**
 * Model Router - Smart routing for AI model requests
 *
 * Features:
 * - Parses "provider/model" format
 * - Routes to direct provider SDK when available
 * - Falls back to OpenRouter gateway for unsupported providers
 * - Supports LiteLLM proxy for self-hosted scenarios
 *
 * @example
 * ```typescript
 * const router = new ModelRouter();
 *
 * // Create model with smart routing
 * const model = await router.createModel("anthropic/claude-3-5-sonnet");
 *
 * // Get routing decision
 * const strategy = router.getRoutingStrategy("groq");
 * // Returns "openrouter" since Groq isn't natively supported
 * ```
 */
export class ModelRouter {
  private openRouterClient: ReturnType<typeof createOpenAI> | null = null;
  private litellmClient: ReturnType<typeof createOpenAI> | null = null;

  /**
   * Parse a model string into provider and model name
   *
   * @param modelString - Model string (e.g., "anthropic/claude-3-5-sonnet")
   * @returns Parsed provider and model name
   */
  parseModelString(modelString: string): {
    provider: string;
    modelName: string;
  } {
    return parseModelString(modelString);
  }

  /**
   * Get the optimal routing strategy for a provider
   *
   * @param provider - Provider name
   * @returns Routing strategy
   */
  getRoutingStrategy(provider: string): RoutingStrategy {
    return getRoutingStrategy(provider);
  }

  /**
   * Create a model instance using smart routing
   *
   * @param modelString - Full model string (e.g., "anthropic/claude-3-5-sonnet")
   * @param options - Gateway options
   * @returns AI SDK language model
   */
  async createModel(
    modelString: string,
    options?: GatewayOptions,
  ): Promise<LanguageModelV1> {
    const { provider, modelName } = this.parseModelString(modelString);
    const routing = options?.routing || this.getRoutingStrategy(provider);

    logger.debug(`Routing ${modelString} via ${routing}`, {
      provider,
      modelName,
      routing,
    });

    switch (routing) {
      case "direct":
        return this.createDirectModel(provider, modelName);
      case "openrouter":
        return this.createOpenRouterModel(modelString);
      case "litellm":
        return this.createLiteLLMModel(modelString);
      case "auto":
        return this.createAutoRoutedModel(provider, modelName, modelString);
      default:
        throw new ConfigurationError(`Unknown routing strategy: ${routing}`);
    }
  }

  /**
   * Create model using direct provider SDK (via NeuroLink's existing providers)
   */
  private async createDirectModel(
    provider: string,
    modelName: string,
  ): Promise<LanguageModelV1> {
    const normalized = normalizeProviderName(provider);

    if (!shouldUseNeuroLinkProvider(normalized)) {
      // No direct support or not configured - fall back to OpenRouter
      logger.debug(
        `Provider ${normalized} not available for direct routing, falling back to OpenRouter`,
      );
      return this.createOpenRouterModel(`${provider}/${modelName}`);
    }

    const neuroLinkProvider = getNeuroLinkProviderName(normalized);
    if (!neuroLinkProvider) {
      throw new RoutingError(
        `No NeuroLink provider mapping for ${normalized}`,
        {
          provider: normalized,
          modelString: `${provider}/${modelName}`,
        },
      );
    }

    try {
      // Dynamically import and use NeuroLink's provider factory
      const { ProviderFactory } = await import(
        "../factories/providerFactory.js"
      );
      const aiProvider = await ProviderFactory.createProvider(
        neuroLinkProvider,
        modelName,
      );

      // Use the public getLanguageModel() method to access the AI SDK model
      // All NeuroLink providers implement this through BaseProvider
      const { BaseProvider } = await import("../core/baseProvider.js");

      // Verify the provider is a BaseProvider instance
      if (!(aiProvider instanceof BaseProvider)) {
        throw new Error(
          `Provider ${neuroLinkProvider} is not a BaseProvider instance`,
        );
      }

      // Access the AI SDK model via the public method
      const model = await aiProvider.getLanguageModel();

      logger.debug(
        `Created direct model via NeuroLink provider ${neuroLinkProvider}`,
      );
      return model;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      throw new RoutingError(`Failed to create direct model: ${err.message}`, {
        provider: normalized,
        modelString: `${provider}/${modelName}`,
        strategy: "direct",
        originalError: err,
      });
    }
  }

  /**
   * Create model using OpenRouter gateway
   */
  createOpenRouterModel(modelString: string): LanguageModelV1 {
    if (!this.openRouterClient) {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new MissingApiKeyError("OpenRouter", "OPENROUTER_API_KEY", {
          modelString,
        });
      }

      this.openRouterClient = createOpenAI({
        apiKey,
        baseURL: OPENROUTER_CONFIG.baseUrl,
        fetch: createProxyFetch(),
        headers: {
          "HTTP-Referer": OPENROUTER_CONFIG.referer,
          "X-Title": OPENROUTER_CONFIG.appName,
        },
      });

      logger.debug("Initialized OpenRouter client");
    }

    return this.openRouterClient(modelString);
  }

  /**
   * Create model using LiteLLM proxy
   */
  createLiteLLMModel(modelString: string): LanguageModelV1 {
    if (!this.litellmClient) {
      this.litellmClient = createOpenAI({
        apiKey: LITELLM_CONFIG.defaultApiKey,
        baseURL: LITELLM_CONFIG.baseUrl,
        fetch: createProxyFetch(),
      });

      logger.debug("Initialized LiteLLM client", {
        baseUrl: LITELLM_CONFIG.baseUrl,
      });
    }

    return this.litellmClient(modelString);
  }

  /**
   * Smart auto-routing: try direct first, fall back to gateway
   */
  private async createAutoRoutedModel(
    provider: string,
    modelName: string,
    fullModelString: string,
  ): Promise<LanguageModelV1> {
    // Try direct routing first if available
    if (shouldUseNeuroLinkProvider(provider)) {
      try {
        return await this.createDirectModel(provider, modelName);
      } catch (error) {
        logger.warn(
          `Direct routing failed for ${provider}, falling back to gateway`,
          { error },
        );
      }
    }

    // Fall back to OpenRouter if configured
    if (isOpenRouterConfigured()) {
      return this.createOpenRouterModel(fullModelString);
    }

    // Try LiteLLM as last resort
    if (isLiteLLMConfigured()) {
      return this.createLiteLLMModel(fullModelString);
    }

    throw new ConfigurationError(
      `No routing available for ${fullModelString}. ` +
        `Configure OPENROUTER_API_KEY or set up a direct provider.`,
    );
  }

  /**
   * Get model info from registry
   */
  async getModelInfo(
    modelString: string,
  ): Promise<GatewayModelInfo | undefined> {
    const fetcher = getGlobalFetcher();
    return fetcher.getModel(modelString);
  }

  /**
   * Check if a model supports a specific capability
   */
  async supportsCapability(
    modelString: string,
    capability: keyof GatewayModelInfo["capabilities"],
  ): Promise<boolean> {
    const info = await this.getModelInfo(modelString);
    return info?.capabilities[capability] ?? false;
  }

  /**
   * Get all available models from registry
   */
  async getAvailableModels(): Promise<string[]> {
    const fetcher = getGlobalFetcher();
    const models = await fetcher.getModels();
    return models.map((m) => m.id);
  }

  /**
   * Search models by query
   */
  async searchModels(query: string): Promise<GatewayModelInfo[]> {
    const fetcher = getGlobalFetcher();
    return fetcher.searchModels(query);
  }

  /**
   * Check if OpenRouter client is initialized
   */
  isOpenRouterInitialized(): boolean {
    return this.openRouterClient !== null;
  }

  /**
   * Check if LiteLLM client is initialized
   */
  isLiteLLMInitialized(): boolean {
    return this.litellmClient !== null;
  }

  /**
   * Reset clients (mainly for testing)
   */
  reset(): void {
    this.openRouterClient = null;
    this.litellmClient = null;
  }
}

// Singleton instance for global usage
let globalRouter: ModelRouter | null = null;

/**
 * Get the global model router instance
 */
export function getGlobalRouter(): ModelRouter {
  if (!globalRouter) {
    globalRouter = new ModelRouter();
  }
  return globalRouter;
}

/**
 * Reset the global router (mainly for testing)
 */
export function resetGlobalRouter(): void {
  if (globalRouter) {
    globalRouter.reset();
  }
  globalRouter = null;
}

// Re-export as modelRouter for convenience
export const modelRouter = {
  parseModelString,
  getRoutingStrategy,
  createModel: async (modelString: string, options?: GatewayOptions) =>
    getGlobalRouter().createModel(modelString, options),
  getModelInfo: async (modelString: string) =>
    getGlobalRouter().getModelInfo(modelString),
  supportsCapability: async (
    modelString: string,
    capability: keyof GatewayModelInfo["capabilities"],
  ) => getGlobalRouter().supportsCapability(modelString, capability),
  getAvailableModels: async () => getGlobalRouter().getAvailableModels(),
  searchModels: async (query: string) => getGlobalRouter().searchModels(query),
};
