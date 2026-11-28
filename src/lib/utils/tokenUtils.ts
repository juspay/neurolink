/**
 * Centralized token usage extraction utilities
 * Handles multiple provider formats and optional fields
 *
 * Which field holds which count, in priority order, is data:
 * `usageFields` and `usageRebase` in src/lib/providers/rules/usage.json.
 */

import type {
  TokenUsage,
  RawUsageObject,
  TokenExtractionOptions,
  ProviderUsageField,
} from "../types/index.js";
import { getProviderRules } from "../providers/rules/registry.js";
import { valueAtPath } from "../providers/rules/wireUsage.js";

function loadUsageRules() {
  const { usageFields, usageRebase } = getProviderRules("usage");
  if (!usageFields || !usageRebase) {
    throw new Error('usage.json needs "usageFields" and "usageRebase"');
  }
  return { fields: usageFields, rebase: usageRebase };
}
const { fields: FIELDS, rebase: REBASE } = loadUsageRules();

/** The first path in the field's list that holds a usable number. */
function readUsageField(
  usage: RawUsageObject,
  field: ProviderUsageField,
): number | undefined {
  for (const path of field.paths) {
    const value = valueAtPath(usage, path);
    if (typeof value === "number" && (!field.positiveOnly || value > 0)) {
      return value;
    }
  }
  return undefined;
}

/** Input token count (usage.json `usageFields.input`), or 0. */
export function extractInputTokens(usage: RawUsageObject): number {
  return readUsageField(usage, FIELDS.input) ?? 0;
}

/** Output token count (usage.json `usageFields.output`), or 0. */
export function extractOutputTokens(usage: RawUsageObject): number {
  return readUsageField(usage, FIELDS.output) ?? 0;
}

/**
 * Total token count. A literal 0 next to non-zero components means the
 * provider omitted the figure, so only a positive total wins over the sum.
 */
export function extractTotalTokens(
  usage: RawUsageObject,
  input: number,
  output: number,
): number {
  return readUsageField(usage, FIELDS.total) ?? input + output;
}

/** Reasoning/thinking token count, or undefined when absent or zero. */
export function extractReasoningTokens(
  usage: RawUsageObject,
): number | undefined {
  return readUsageField(usage, FIELDS.reasoning);
}

/** Cache-write token count (non-overlapping convention), or undefined. */
export function extractCacheCreationTokens(
  usage: RawUsageObject,
): number | undefined {
  return readUsageField(usage, FIELDS.cacheCreation);
}

/** Cache-read token count (non-overlapping convention), or undefined. */
export function extractCacheReadTokens(
  usage: RawUsageObject,
): number | undefined {
  return readUsageField(usage, FIELDS.cacheRead);
}

/**
 * Cache-read count in the OVERLAPPING convention (OpenAI / DeepSeek / NIM /
 * OpenAI-compatible): a SUBSET already included in the prompt count, so a
 * caller MUST subtract it from `input` to avoid double-counting.
 */
export function extractCachedInputTokensOverlapping(
  usage: RawUsageObject,
): number | undefined {
  return readUsageField(usage, FIELDS.cacheReadIncludedInInput);
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
  let input = extractInputTokens(usage);
  const output = extractOutputTokens(usage);

  // Extract optional token fields
  const reasoning = extractReasoningTokens(usage);
  const cacheCreationTokens = extractCacheCreationTokens(usage);
  let cacheReadTokens = extractCacheReadTokens(usage);

  // Overlapping-convention fallback (OpenAI/DeepSeek/NIM/OpenAI-compatible):
  // when no non-overlapping cache-read field was present, look for the nested
  // `prompt_tokens_details.cached_tokens`. That value is a SUBSET already
  // included in `input`, so we must subtract it from `input` to avoid
  // double-counting (and to let calculateCost apply the cheaper cacheRead rate
  // to the cached portion). Only do this when cached <= input so a malformed
  // response can never produce negative input or inflate the total.
  if (cacheReadTokens === undefined) {
    const overlappingCached = extractCachedInputTokensOverlapping(usage);
    if (overlappingCached !== undefined && overlappingCached <= input) {
      cacheReadTokens = overlappingCached;
      input = Math.max(0, input - overlappingCached);
    }
  }

  // ai@6-shape rebase: when the cache values came ONLY from the ai@6
  // normalized shape (cachedInputTokens / inputTokenDetails.*), the flat
  // input is cache-INCLUSIVE — asLanguageModelUsage reports
  // inputTokens.total = noCache + cacheRead + cacheWrite — so `input` must
  // be rebased onto the uncached portion or calculateCost bills the cached
  // tokens twice (full input rate + cacheRead/cacheCreation rate). The
  // native fields excluded below (cacheReadInputTokens / cacheReadTokens /
  // cacheCreationInputTokens / cacheCreationTokens) follow the
  // non-overlapping convention where input is already the uncached
  // remainder, and the overlapping snake_case shape was already rebased
  // above — neither must be rebased again.
  if (
    (cacheReadTokens !== undefined || cacheCreationTokens !== undefined) &&
    REBASE.unlessAnyPresent.every(
      (path) => valueAtPath(usage, path) === undefined,
    ) &&
    REBASE.whenAnyPresent.some((path) => valueAtPath(usage, path) !== undefined)
  ) {
    const noCacheTokens = valueAtPath(usage, REBASE.uncachedInput);
    if (typeof noCacheTokens === "number") {
      input = noCacheTokens;
    } else {
      const cacheWrite = valueAtPath(usage, REBASE.cacheWrite) as
        | number
        | undefined;
      input = Math.max(0, input - (cacheReadTokens ?? 0) - (cacheWrite ?? 0));
    }
  }

  // Total: prefer the provider-reported figure; the fallback conserves every
  // billed component — cache tokens are additive on top of the (post-rebase)
  // uncached input. Reasoning is already inside `output`, so it is NOT added.
  const total = extractTotalTokens(
    usage,
    input + (cacheReadTokens ?? 0) + (cacheCreationTokens ?? 0),
    output,
  );

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
