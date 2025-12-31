/**
 * Analytics utility functions for TokenUsage and AnalyticsData
 * Provides helper functions to avoid manual field access patterns
 */

import type { TokenUsage, AnalyticsData } from "../types/index.js";

/**
 * Format token usage as a human-readable string
 */
export function formatTokenUsage(usage: TokenUsage): string {
  let result = `${usage.input} input / ${usage.output} output`;
  if (usage.cacheCreationTokens) {
    result += ` / ${usage.cacheCreationTokens} cache-create`;
  }
  if (usage.cacheReadTokens) {
    result += ` / ${usage.cacheReadTokens} cache-read`;
  }
  if (usage.reasoning) {
    result += ` / ${usage.reasoning} reasoning`;
  }
  return result;
}

/**
 * Calculate cost based on token usage and cost per token
 */
export function calculateTokenCost(
  usage: TokenUsage,
  costPerToken: number,
): number {
  return usage.total * costPerToken;
}

/**
 * Combine multiple token usage objects into a single total
 */
export function combineTokenUsage(usages: TokenUsage[]): TokenUsage {
  return usages.reduce(
    (total, current) => ({
      input: total.input + current.input,
      output: total.output + current.output,
      total: total.total + current.total,
      cacheCreationTokens:
        (total.cacheCreationTokens || 0) + (current.cacheCreationTokens || 0),
      cacheReadTokens:
        (total.cacheReadTokens || 0) + (current.cacheReadTokens || 0),
      reasoning: (total.reasoning || 0) + (current.reasoning || 0),
    }),
    {
      input: 0,
      output: 0,
      total: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      reasoning: 0,
    },
  );
}

/**
 * Format analytics data for display
 */
export function formatAnalyticsForDisplay(analytics: AnalyticsData): string {
  const parts: string[] = [];

  // Provider and model
  parts.push(`Provider: ${analytics.provider}`);
  if (analytics.model) {
    parts.push(`Model: ${analytics.model}`);
  }

  // Token usage
  parts.push(`Tokens: ${formatTokenUsage(analytics.tokenUsage)}`);

  // Cost
  if (analytics.cost !== undefined) {
    parts.push(`Cost: $${analytics.cost.toFixed(5)}`);
  }

  // Duration
  const timeInSeconds = (analytics.requestDuration / 1000).toFixed(1);
  parts.push(`Time: ${timeInSeconds}s`);

  return parts.join(" | ");
}

/**
 * Check if analytics data contains valid token usage
 */
export function hasValidTokenUsage(analytics: AnalyticsData): boolean {
  return !!(
    analytics.tokenUsage &&
    typeof analytics.tokenUsage.input === "number" &&
    typeof analytics.tokenUsage.output === "number" &&
    typeof analytics.tokenUsage.total === "number"
  );
}

/**
 * Extract summary metrics from analytics data
 */
export function getAnalyticsSummary(analytics: AnalyticsData): {
  totalTokens: number;
  costPerToken: number | null;
  requestsPerSecond: number;
} {
  const totalTokens = analytics.tokenUsage.total;
  let costPerToken: number | null = null;

  if (
    analytics.cost !== null &&
    analytics.cost !== undefined &&
    Number.isFinite(analytics.cost) &&
    totalTokens > 0
  ) {
    const computed = analytics.cost / (totalTokens / 1000);
    costPerToken = Number.isFinite(computed) ? computed : null;
  }
  const requestsPerSecond =
    analytics.requestDuration > 0 ? 1000 / analytics.requestDuration : 0;

  return {
    totalTokens,
    costPerToken,
    requestsPerSecond,
  };
}

/**
 * Type guard for token usage
 */
export function isTokenUsage(value: unknown): value is TokenUsage {
  return (
    typeof value === "object" &&
    value !== null &&
    "input" in value &&
    "output" in value &&
    "total" in value &&
    typeof (value as TokenUsage).input === "number" &&
    typeof (value as TokenUsage).output === "number" &&
    typeof (value as TokenUsage).total === "number"
  );
}
