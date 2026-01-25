/**
 * Gateway Client
 *
 * Wrapper for OpenRouter and LiteLLM clients with lazy initialization.
 */

import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModelV1 } from "ai";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import { logger } from "../utils/logger.js";
import { LITELLM_CONFIG, OPENROUTER_CONFIG } from "./constants.js";
import { MissingApiKeyError } from "./errors.js";

/**
 * Gateway Client - Manages OpenRouter and LiteLLM connections
 *
 * Features:
 * - Lazy client initialization
 * - Proper header configuration
 * - Environment variable validation
 * - Enterprise proxy support
 *
 * @example
 * ```typescript
 * const client = new GatewayClient();
 *
 * // Create OpenRouter model
 * const model = client.createOpenRouterModel("anthropic/claude-3-5-sonnet");
 *
 * // Create LiteLLM model
 * const localModel = client.createLiteLLMModel("gpt-4");
 * ```
 */
export class GatewayClient {
  private openRouterClient: ReturnType<typeof createOpenAI> | null = null;
  private litellmClient: ReturnType<typeof createOpenAI> | null = null;

  /**
   * Get OpenRouter client (lazy initialization)
   */
  getOpenRouterClient(): ReturnType<typeof createOpenAI> {
    if (!this.openRouterClient) {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new MissingApiKeyError("OpenRouter", "OPENROUTER_API_KEY");
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

      logger.debug("Initialized OpenRouter client", {
        referer: OPENROUTER_CONFIG.referer,
        appName: OPENROUTER_CONFIG.appName,
      });
    }

    return this.openRouterClient;
  }

  /**
   * Get LiteLLM client (lazy initialization)
   */
  getLiteLLMClient(): ReturnType<typeof createOpenAI> {
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

    return this.litellmClient;
  }

  /**
   * Create model via OpenRouter
   */
  createOpenRouterModel(modelString: string): LanguageModelV1 {
    const client = this.getOpenRouterClient();
    return client(modelString);
  }

  /**
   * Create model via LiteLLM
   */
  createLiteLLMModel(modelString: string): LanguageModelV1 {
    const client = this.getLiteLLMClient();
    return client(modelString);
  }

  /**
   * Check if OpenRouter is configured
   */
  isOpenRouterConfigured(): boolean {
    return !!(
      process.env.OPENROUTER_API_KEY &&
      process.env.OPENROUTER_API_KEY.trim().length > 0
    );
  }

  /**
   * Check if LiteLLM is configured
   */
  isLiteLLMConfigured(): boolean {
    return !!(process.env.LITELLM_BASE_URL || process.env.LITELLM_API_KEY);
  }

  /**
   * Reset clients (mainly for testing)
   */
  reset(): void {
    this.openRouterClient = null;
    this.litellmClient = null;
  }
}

// Singleton instance
let globalClient: GatewayClient | null = null;

/**
 * Get the global gateway client instance
 */
export function getGlobalGatewayClient(): GatewayClient {
  if (!globalClient) {
    globalClient = new GatewayClient();
  }
  return globalClient;
}

/**
 * Reset the global client (mainly for testing)
 */
export function resetGlobalGatewayClient(): void {
  if (globalClient) {
    globalClient.reset();
  }
  globalClient = null;
}
