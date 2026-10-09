/**
 * NeuroLink Analytics System
 *
 * Provides lightweight analytics tracking for AI provider usage,
 * including tokens, costs, performance metrics, and custom context.
 */

import { logger } from "../utils/logger.js";
import type {
  JsonValue,
  UnknownRecord,
  TokenUsage,
  AnalyticsData,
} from "../types/index.js";

import { extractTokenUsage as extractTokenUsageUtil } from "../utils/tokenUtils.js";
import { calculateCost, hasPricing } from "../utils/pricing.js";

/**
 * Create analytics data structure from AI response
 */
export function createAnalytics(
  provider: string,
  model: string,
  result: unknown,
  responseTime: number,
  context?: Record<string, unknown>,
): AnalyticsData {
  const functionTag = "createAnalytics";

  try {
    // Extract token usage from different result formats
    const tokens = extractTokenUsage(result as UnknownRecord);

    // Estimate cost based on provider and tokens
    const cost = estimateCost(provider, model, tokens);

    // Turn-lifecycle telemetry from native agentic loops (Vertex
    // Gemini/Claude): stopReason / rawFinishReason / stepsUsed ride the
    // provider result; toolCallCount and elapsedMs derive from it.
    const turnResult = result as {
      stopReason?: string;
      rawFinishReason?: string;
      stepsUsed?: number;
      responseTime?: number;
      toolExecutions?: unknown[];
      toolsUsed?: string[];
    };
    const toolCallCount = Array.isArray(turnResult.toolExecutions)
      ? turnResult.toolExecutions.length
      : Array.isArray(turnResult.toolsUsed)
        ? turnResult.toolsUsed.length
        : undefined;

    const analytics: AnalyticsData = {
      provider,
      model,
      tokenUsage: tokens,
      cost,
      requestDuration: responseTime,
      context: context as Record<string, JsonValue> | undefined,
      timestamp: new Date().toISOString(),
      ...(typeof turnResult.stepsUsed === "number" && {
        stepsUsed: turnResult.stepsUsed,
      }),
      ...(toolCallCount !== undefined && { toolCallCount }),
      ...(typeof turnResult.stopReason === "string" && {
        stopReason: turnResult.stopReason,
      }),
      ...(typeof turnResult.responseTime === "number" && {
        elapsedMs: turnResult.responseTime,
      }),
      ...(typeof turnResult.rawFinishReason === "string" && {
        rawFinishReason: turnResult.rawFinishReason,
      }),
    };

    logger.debug(`[${functionTag}] Analytics created`, {
      provider,
      model,
      tokens: tokens.total,
      responseTime,
      cost,
    });

    return analytics;
  } catch (error) {
    logger.error(`[${functionTag}] Failed to create analytics`, { error });

    // Return minimal analytics on error
    return {
      provider,
      model,
      tokenUsage: { input: 0, output: 0, total: 0 },
      requestDuration: responseTime,
      context: context as Record<string, JsonValue> | undefined,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Extract token usage from various AI result formats
 * Delegates to centralized tokenUtils for consistent extraction across providers
 */
function extractTokenUsage(result: UnknownRecord): TokenUsage {
  // Use centralized token extraction utility
  // The utility handles nested usage objects, multiple provider formats,
  // cache tokens, reasoning tokens, and cache savings calculation
  // Cast result to allow extractTokenUsageUtil to handle type normalization
  return extractTokenUsageUtil(
    result.usage as Parameters<typeof extractTokenUsageUtil>[0],
  );
}

/**
 * Estimate cost based on provider, model, and token usage.
 * Uses known per-model rates, including cache tiers. An unpriced model has
 * unknown cost; another model's provider default cannot estimate its bill.
 */
function estimateCost(
  provider: string,
  model: string,
  tokens: TokenUsage,
): number | undefined {
  try {
    // Try the per-model pricing table first (includes cache token rates)
    if (hasPricing(provider, model)) {
      return calculateCost(provider, model, tokens);
    }

    return undefined;
  } catch (error) {
    logger.debug("Cost estimation failed", { provider, model, error });
    return undefined;
  }
}
