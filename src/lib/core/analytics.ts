/**
 * NeuroLink Analytics System
 *
 * Provides lightweight analytics tracking for AI provider usage,
 * including tokens, costs, performance metrics, and custom context.
 */

import { logger } from "../utils/logger.js";
import type { JsonValue, UnknownRecord } from "../types/common.js";
import { modelConfig } from "./modelConfiguration.js";
import type { TokenUsage, AnalyticsData } from "../types/analytics.js";
import { extractTokenUsage as extractTokenUsageUtil } from "../utils/tokenUtils.js";

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

    const analytics: AnalyticsData = {
      provider,
      model,
      tokenUsage: tokens,
      cost,
      requestDuration: responseTime,
      context: context as Record<string, JsonValue> | undefined,
      timestamp: new Date().toISOString(),
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
 * Estimate cost based on provider, model, and token usage
 */
function estimateCost(
  provider: string,
  model: string,
  tokens: TokenUsage,
): number | undefined {
  try {
    // Use the new configuration system instead of hardcoded costs
    const costInfo = modelConfig.getCostInfo(provider.toLowerCase(), model);
    if (!costInfo) {
      return undefined;
    }

    // Calculate cost using the configuration system
    const inputCost = (tokens.input / 1000) * costInfo.input;
    const outputCost = (tokens.output / 1000) * costInfo.output;

    return Math.round((inputCost + outputCost) * 100000) / 100000; // Round to 5 decimal places
  } catch (error) {
    logger.debug("Cost estimation failed", { provider, model, error });
    return undefined;
  }
}
