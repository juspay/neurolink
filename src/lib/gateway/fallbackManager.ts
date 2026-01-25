/**
 * Fallback Manager
 *
 * Handles automatic failover with retry logic for model requests.
 * Provides resilience through configurable fallback chains.
 */

import type { LanguageModelV1 } from "ai";
import { logger } from "../utils/logger.js";
import { DEFAULT_FALLBACK_CONFIG } from "./constants.js";
import { FallbackExhaustedError } from "./errors.js";
import { getGlobalRouter } from "./modelRouter.js";
import type {
  FallbackAttempt,
  FallbackConfig,
  FallbackResult,
} from "./types.js";

/**
 * Fallback Manager - Automatic failover for AI model requests
 *
 * Features:
 * - Configurable retry count and delay
 * - Exponential backoff for rate limits
 * - Detailed attempt logging
 * - Error classification for retry decisions
 *
 * @example
 * ```typescript
 * const manager = new FallbackManager();
 *
 * // Execute with fallback
 * const result = await manager.executeWithFallback(
 *   "openai/gpt-4o",
 *   async (model) => {
 *     // Use the model
 *     return await generateText({ model, prompt: "Hello" });
 *   },
 *   { models: ["anthropic/claude-3-5-sonnet"], retries: 2 }
 * );
 * ```
 */
export class FallbackManager {
  private defaultConfig: FallbackConfig;

  constructor(config?: Partial<FallbackConfig>) {
    this.defaultConfig = { ...DEFAULT_FALLBACK_CONFIG, ...config };
  }

  /**
   * Execute a function with fallback support
   *
   * @param primaryModel - Primary model to try first
   * @param operation - Operation to execute with the model
   * @param config - Optional fallback configuration
   * @returns Result with execution details
   */
  async executeWithFallback<T>(
    primaryModel: string,
    operation: (model: LanguageModelV1) => Promise<T>,
    config?: Partial<FallbackConfig>,
  ): Promise<FallbackResult<T>> {
    const fallbackConfig = { ...this.defaultConfig, ...config };
    const allModels = [primaryModel, ...fallbackConfig.models];
    const attempts: FallbackAttempt[] = [];
    const router = getGlobalRouter();

    for (const modelString of allModels) {
      for (let attempt = 1; attempt <= fallbackConfig.retries + 1; attempt++) {
        const startTime = Date.now();

        try {
          logger.debug(`Attempting ${modelString} (attempt ${attempt})`);

          const model = await router.createModel(modelString);
          const result = await this.executeWithTimeout(
            () => operation(model),
            fallbackConfig.timeout,
          );

          attempts.push({
            model: modelString,
            attempt,
            duration: Date.now() - startTime,
          });

          logger.info(`Success with ${modelString} on attempt ${attempt}`);
          return { result, modelUsed: modelString, attempts };
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));

          attempts.push({
            model: modelString,
            attempt,
            error: err,
            duration: Date.now() - startTime,
          });

          logger.warn(
            `${modelString} attempt ${attempt} failed: ${err.message}`,
          );

          // Check if we should retry
          if (attempt <= fallbackConfig.retries && this.isRetriableError(err)) {
            const delay = this.calculateDelay(
              fallbackConfig.retryDelayMs,
              attempt,
              err,
            );
            logger.debug(`Retrying in ${delay}ms`);
            await this.delay(delay);
            continue;
          }

          // Move to next model
          break;
        }
      }
    }

    // All models failed
    const errors = attempts.filter((a) => a.error).map((a) => a.error as Error);

    throw new FallbackExhaustedError(allModels, errors, {
      primaryModel,
    });
  }

  /**
   * Create a model with automatic fallback
   *
   * @param primaryModel - Primary model string
   * @param fallbackModels - Fallback model strings
   * @returns Working language model
   */
  async createModelWithFallback(
    primaryModel: string,
    fallbackModels: string[],
  ): Promise<LanguageModelV1> {
    const allModels = [primaryModel, ...fallbackModels];
    const router = getGlobalRouter();
    const errors: Error[] = [];

    for (const modelString of allModels) {
      try {
        const model = await router.createModel(modelString);
        logger.debug(`Successfully created model: ${modelString}`);
        return model;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.warn(`Failed to create ${modelString}: ${err.message}`);
        errors.push(err);
      }
    }

    throw new FallbackExhaustedError(allModels, errors, { primaryModel });
  }

  /**
   * Check if an error is retriable
   */
  isRetriableError(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Retriable errors
    const retriablePatterns = [
      "rate limit",
      "429",
      "timeout",
      "timed out",
      "503",
      "502",
      "500",
      "overloaded",
      "temporarily unavailable",
      "service unavailable",
      "connection",
      "network",
      "econnreset",
      "econnrefused",
      "etimedout",
    ];

    for (const pattern of retriablePatterns) {
      if (message.includes(pattern)) {
        return true;
      }
    }

    // Non-retriable errors
    const nonRetriablePatterns = [
      "invalid api key",
      "unauthorized",
      "authentication",
      "forbidden",
      "model not found",
      "invalid model",
      "invalid request",
      "bad request",
      "400",
      "401",
      "403",
      "404",
    ];

    for (const pattern of nonRetriablePatterns) {
      if (message.includes(pattern)) {
        return false;
      }
    }

    // Default to retriable for unknown errors
    return true;
  }

  /**
   * Calculate delay with exponential backoff
   */
  private calculateDelay(
    baseDelay: number,
    attempt: number,
    error: Error,
  ): number {
    const message = error.message.toLowerCase();

    // Extra delay for rate limits
    if (message.includes("rate limit") || message.includes("429")) {
      return baseDelay * 2 ** attempt;
    }

    // Standard delay with some backoff
    return baseDelay * attempt;
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeout?: number,
  ): Promise<T> {
    if (!timeout) {
      return operation();
    }

    return Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error(`Operation timed out after ${timeout}ms`)),
          timeout,
        );
      }),
    ]);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton instance for global usage
let globalManager: FallbackManager | null = null;

/**
 * Get the global fallback manager instance
 */
export function getGlobalFallbackManager(): FallbackManager {
  if (!globalManager) {
    globalManager = new FallbackManager();
  }
  return globalManager;
}

/**
 * Reset the global manager (mainly for testing)
 */
export function resetGlobalFallbackManager(): void {
  globalManager = null;
}

// Re-export for convenience
export const fallbackManager = {
  executeWithFallback: async <T>(
    primaryModel: string,
    operation: (model: LanguageModelV1) => Promise<T>,
    config?: Partial<FallbackConfig>,
  ) =>
    getGlobalFallbackManager().executeWithFallback(
      primaryModel,
      operation,
      config,
    ),
  createModelWithFallback: async (
    primaryModel: string,
    fallbackModels: string[],
  ) =>
    getGlobalFallbackManager().createModelWithFallback(
      primaryModel,
      fallbackModels,
    ),
  isRetriableError: (error: Error) =>
    getGlobalFallbackManager().isRetriableError(error),
};
