/**
 * Centralized token usage extraction utilities
 * Handles multiple provider formats and optional fields
 *
 * Consolidates token extraction logic from:
 * - GenerationHandler.ts
 * - analytics.ts
 * - streamAnalytics.ts
 */

import type { TokenUsage } from "../types/analytics.js";

/**
 * Raw usage object that may come from various AI providers
 * Supports multiple naming conventions and nested structures
 */
export type RawUsageObject = {
  // BaseProvider normalized format
  input?: number;
  output?: number;
  total?: number;

  // AI SDK format
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;

  // OpenAI/Mistral format
  promptTokens?: number;
  completionTokens?: number;

  // Anthropic-style cache tokens
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
  // Alternative cache token naming
  cacheCreationTokens?: number;
  cacheReadTokens?: number;

  // OpenAI o1/Anthropic reasoning tokens
  reasoningTokens?: number;
  reasoning?: number;
  // Snake case variant (some APIs)
  reasoning_tokens?: number;
  // Google/other provider thinking tokens
  thinkingTokens?: number;

  // Nested usage object (some providers wrap usage)
  usage?: RawUsageObject;
};

/**
 * Options for token extraction behavior
 */
export type TokenExtractionOptions = {
  /**
   * Whether to calculate cache savings percentage
   * @default true
   */
  calculateCacheSavings?: boolean;

  /**
   * How to handle missing optional fields
   * - "zero": Return 0 for missing optional fields
   * - "undefined": Return undefined for missing optional fields (default)
   */
  missingOptionalBehavior?: "zero" | "undefined";
};

/**
 * Extract input token count from various provider formats
 * Priority: input > inputTokens > promptTokens
 */
export function extractInputTokens(usage: RawUsageObject): number {
  if (typeof usage.input === "number") {
    return usage.input;
  }
  if (typeof usage.inputTokens === "number") {
    return usage.inputTokens;
  }
  if (typeof usage.promptTokens === "number") {
    return usage.promptTokens;
  }
  return 0;
}

/**
 * Extract output token count from various provider formats
 * Priority: output > outputTokens > completionTokens
 */
export function extractOutputTokens(usage: RawUsageObject): number {
  if (typeof usage.output === "number") {
    return usage.output;
  }
  if (typeof usage.outputTokens === "number") {
    return usage.outputTokens;
  }
  if (typeof usage.completionTokens === "number") {
    return usage.completionTokens;
  }
  return 0;
}

/**
 * Extract total token count from various provider formats
 * Falls back to input + output if total is not provided
 */
export function extractTotalTokens(
  usage: RawUsageObject,
  input: number,
  output: number,
): number {
  if (typeof usage.total === "number") {
    return usage.total;
  }
  if (typeof usage.totalTokens === "number") {
    return usage.totalTokens;
  }
  return input + output;
}

/**
 * Extract reasoning/thinking token count from various provider formats
 * Supports: reasoningTokens, thinkingTokens, reasoning_tokens, reasoning
 */
export function extractReasoningTokens(
  usage: RawUsageObject,
): number | undefined {
  if (typeof usage.reasoningTokens === "number" && usage.reasoningTokens > 0) {
    return usage.reasoningTokens;
  }
  if (typeof usage.thinkingTokens === "number" && usage.thinkingTokens > 0) {
    return usage.thinkingTokens;
  }
  if (
    typeof usage.reasoning_tokens === "number" &&
    usage.reasoning_tokens > 0
  ) {
    return usage.reasoning_tokens;
  }
  if (typeof usage.reasoning === "number" && usage.reasoning > 0) {
    return usage.reasoning;
  }
  return undefined;
}

/**
 * Extract cache creation token count from various provider formats
 * Supports: cacheCreationInputTokens, cacheCreationTokens
 */
export function extractCacheCreationTokens(
  usage: RawUsageObject,
): number | undefined {
  if (
    typeof usage.cacheCreationInputTokens === "number" &&
    usage.cacheCreationInputTokens > 0
  ) {
    return usage.cacheCreationInputTokens;
  }
  if (
    typeof usage.cacheCreationTokens === "number" &&
    usage.cacheCreationTokens > 0
  ) {
    return usage.cacheCreationTokens;
  }
  return undefined;
}

/**
 * Extract cache read token count from various provider formats
 * Supports: cacheReadInputTokens, cacheReadTokens
 */
export function extractCacheReadTokens(
  usage: RawUsageObject,
): number | undefined {
  if (
    typeof usage.cacheReadInputTokens === "number" &&
    usage.cacheReadInputTokens > 0
  ) {
    return usage.cacheReadInputTokens;
  }
  if (typeof usage.cacheReadTokens === "number" && usage.cacheReadTokens > 0) {
    return usage.cacheReadTokens;
  }
  return undefined;
}

/**
 * Calculate cache savings percentage
 *
 * This represents the percentage of input tokens served from cache.
 * For Anthropic, cache read tokens cost 0.1x, so actual cost savings = cacheSavingsPercent * 0.9
 * For other providers, cost savings may vary based on their cache pricing.
 *
 * @param cacheReadTokens Number of tokens read from cache
 * @param inputTokens Number of non-cached input tokens
 * @returns Percentage of tokens served from cache (0-100), or undefined if no cache usage
 */
export function calculateCacheSavingsPercent(
  cacheReadTokens: number | undefined,
  inputTokens: number,
): number | undefined {
  if (cacheReadTokens === undefined || cacheReadTokens <= 0) {
    return undefined;
  }

  const totalInputWithCache = inputTokens + cacheReadTokens;
  if (totalInputWithCache <= 0) {
    return undefined;
  }

  return Math.round((cacheReadTokens / totalInputWithCache) * 100);
}

/**
 * Extract token usage from various provider response formats
 *
 * Handles multiple input formats:
 * - BaseProvider normalized format (input/output/total)
 * - AI SDK format (inputTokens/outputTokens/totalTokens)
 * - OpenAI/Mistral format (promptTokens/completionTokens)
 * - Nested usage objects
 *
 * Also extracts optional fields:
 * - Cache creation and read tokens (Anthropic-style)
 * - Reasoning/thinking tokens (OpenAI o1, Anthropic, Google)
 * - Cache savings percentage
 *
 * @param result Raw usage object from provider response
 * @param options Extraction options
 * @returns Normalized TokenUsage object
 */
export function extractTokenUsage(
  result: RawUsageObject | undefined | null,
  options: TokenExtractionOptions = {},
): TokenUsage {
  const {
    calculateCacheSavings = true,
    missingOptionalBehavior = "undefined",
  } = options;

  // Handle null/undefined input
  if (!result) {
    return { input: 0, output: 0, total: 0 };
  }

  // Handle nested usage object (some providers wrap usage in a usage property)
  const usage: RawUsageObject =
    result.usage && typeof result.usage === "object" ? result.usage : result;

  // Extract base token counts
  const input = extractInputTokens(usage);
  const output = extractOutputTokens(usage);
  const total = extractTotalTokens(usage, input, output);

  // Extract optional token fields
  const reasoning = extractReasoningTokens(usage);
  const cacheCreationTokens = extractCacheCreationTokens(usage);
  const cacheReadTokens = extractCacheReadTokens(usage);

  // Calculate cache savings if enabled
  const cacheSavingsPercent = calculateCacheSavings
    ? calculateCacheSavingsPercent(cacheReadTokens, input)
    : undefined;

  // Build result object
  const tokenUsage: TokenUsage = {
    input,
    output,
    total,
  };

  // Add optional fields based on behavior setting
  if (missingOptionalBehavior === "zero") {
    tokenUsage.cacheCreationTokens = cacheCreationTokens ?? 0;
    tokenUsage.cacheReadTokens = cacheReadTokens ?? 0;
    tokenUsage.reasoning = reasoning ?? 0;
    tokenUsage.cacheSavingsPercent = cacheSavingsPercent ?? 0;
  } else {
    // Only include optional fields if they have values
    if (cacheCreationTokens !== undefined) {
      tokenUsage.cacheCreationTokens = cacheCreationTokens;
    }
    if (cacheReadTokens !== undefined) {
      tokenUsage.cacheReadTokens = cacheReadTokens;
    }
    if (reasoning !== undefined) {
      tokenUsage.reasoning = reasoning;
    }
    if (cacheSavingsPercent !== undefined) {
      tokenUsage.cacheSavingsPercent = cacheSavingsPercent;
    }
  }

  return tokenUsage;
}

/**
 * Create a default/empty TokenUsage object
 * Useful for error handling and fallback scenarios
 */
export function createEmptyTokenUsage(): TokenUsage {
  return {
    input: 0,
    output: 0,
    total: 0,
  };
}

/**
 * Check if a TokenUsage object has any non-zero values
 */
export function hasTokenUsage(usage: TokenUsage): boolean {
  return usage.input > 0 || usage.output > 0 || usage.total > 0;
}

/**
 * Merge two TokenUsage objects by summing their values
 * Useful for aggregating usage across multiple calls
 */
export function mergeTokenUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  const merged: TokenUsage = {
    input: a.input + b.input,
    output: a.output + b.output,
    total: a.total + b.total,
  };

  // Merge optional fields if present in either
  const cacheCreationTokens =
    (a.cacheCreationTokens ?? 0) + (b.cacheCreationTokens ?? 0);
  const cacheReadTokens = (a.cacheReadTokens ?? 0) + (b.cacheReadTokens ?? 0);
  const reasoning = (a.reasoning ?? 0) + (b.reasoning ?? 0);

  if (cacheCreationTokens > 0) {
    merged.cacheCreationTokens = cacheCreationTokens;
  }
  if (cacheReadTokens > 0) {
    merged.cacheReadTokens = cacheReadTokens;
  }
  if (reasoning > 0) {
    merged.reasoning = reasoning;
  }

  // Recalculate cache savings for merged usage
  const cacheSavingsPercent = calculateCacheSavingsPercent(
    merged.cacheReadTokens,
    merged.input,
  );
  if (cacheSavingsPercent !== undefined) {
    merged.cacheSavingsPercent = cacheSavingsPercent;
  }

  return merged;
}
