/**
 * NeuroLink Analytics System
 *
 * Provides lightweight analytics tracking for AI provider usage,
 * including tokens, costs, performance metrics, and custom context.
 */

import { logger } from "../utils/logger.js";
import type { JsonValue, UnknownRecord } from "../types/common.js";
import { modelConfig } from "./modelConfiguration.js";

export interface AnalyticsData {
  provider: string;
  model: string;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  cost?: number;
  responseTime: number;
  context?: Record<string, JsonValue>;
  timestamp: string;
  // Extended fields from analytics-helper consolidation
  evaluation?: {
    relevanceScore: number;
    accuracyScore: number;
    completenessScore: number;
    overall: number;
    evaluationProvider?: string;
    evaluationTime?: number;
    evaluationAttempt?: number;
  };
  costDetails?: UnknownRecord;
}

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
      tokens,
      cost,
      responseTime,
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
      tokens: { input: 0, output: 0, total: 0 },
      responseTime,
      context: context as Record<string, JsonValue> | undefined,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Extract token usage from various AI result formats
 */
function extractTokenUsage(result: UnknownRecord): {
  input: number;
  output: number;
  total: number;
} {
  // Use properly typed usage object from BaseProvider or direct AI SDK
  if (
    result.usage &&
    typeof result.usage === "object" &&
    result.usage !== null
  ) {
    const usage = result.usage as Record<string, unknown>;

    // Try BaseProvider normalized format first (inputTokens/outputTokens)
    if (
      typeof usage.inputTokens === "number" ||
      typeof usage.outputTokens === "number"
    ) {
      const input =
        typeof usage.inputTokens === "number" ? usage.inputTokens : 0;
      const output =
        typeof usage.outputTokens === "number" ? usage.outputTokens : 0;
      const total =
        typeof usage.totalTokens === "number"
          ? usage.totalTokens
          : input + output;
      return { input, output, total };
    }

    // Try OpenAI/Mistral format (promptTokens/completionTokens)
    if (
      typeof usage.promptTokens === "number" ||
      typeof usage.completionTokens === "number"
    ) {
      const input =
        typeof usage.promptTokens === "number" ? usage.promptTokens : 0;
      const output =
        typeof usage.completionTokens === "number" ? usage.completionTokens : 0;
      const total =
        typeof usage.totalTokens === "number"
          ? usage.totalTokens
          : input + output;
      return { input, output, total };
    }

    // Handle total-only case
    if (typeof usage.totalTokens === "number") {
      return { input: 0, output: 0, total: usage.totalTokens };
    }
  }

  // Fallback for edge cases
  logger.debug("Token extraction failed: unknown usage format", { result });
  return { input: 0, output: 0, total: 0 };
}

/**
 * Estimate cost based on provider, model, and token usage
 */
function estimateCost(
  provider: string,
  model: string,
  tokens: { input: number; output: number; total: number },
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
