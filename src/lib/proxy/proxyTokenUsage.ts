import type { TokenUsage, UsageContext } from "../types/index.js";

/** Convert proxy wire usage into disjoint billing buckets. Codex input already
 * includes cache tokens; reasoning is included in output for both providers.
 * OpenAI's documented formula subtracts both cached_tokens and cache_write_tokens:
 * https://developers.openai.com/api/docs/guides/prompt-caching#monitor-cache-performance
 */
export function proxyTokenUsage(usage: UsageContext): TokenUsage {
  const cached = usage.cacheReadTokens + usage.cacheCreationTokens;
  const input = usage.inputIncludesCachedTokens
    ? Math.max(0, usage.inputTokens - cached)
    : usage.inputTokens;
  return {
    input,
    output: usage.outputTokens,
    total: usage.inputIncludesCachedTokens
      ? usage.inputTokens + usage.outputTokens
      : input + cached + usage.outputTokens,
    cacheReadTokens: usage.cacheReadTokens,
    cacheCreationTokens: usage.cacheCreationTokens,
    // Spread only when present so every existing caller's result keeps its
    // exact old shape (no new `undefined`-valued key to trip deep-equal checks).
    ...(usage.cacheCreation1hTokens !== undefined
      ? { cacheCreation1hTokens: usage.cacheCreation1hTokens }
      : {}),
    reasoning: usage.reasoningTokens,
  };
}

/**
 * Read Anthropic's `usage.cache_creation.ephemeral_1h_input_tokens` — the
 * 1-hour-TTL share of `cache_creation_input_tokens` — from an untyped usage
 * object. Returns undefined when the breakdown is absent (older replies, or a
 * request that wrote no 1h breakpoint), so callers leave the field unset and
 * price exactly as before.
 */
export function readCacheCreation1hTokens(usage: unknown): number | undefined {
  if (typeof usage !== "object" || usage === null) {
    return undefined;
  }
  const breakdown = (usage as { cache_creation?: unknown }).cache_creation;
  if (typeof breakdown !== "object" || breakdown === null) {
    return undefined;
  }
  const raw = (breakdown as { ephemeral_1h_input_tokens?: unknown })
    .ephemeral_1h_input_tokens;
  return typeof raw === "number" && Number.isFinite(raw) && raw >= 0
    ? raw
    : undefined;
}

/**
 * Spread target for a usage literal: the key exists only when a 1h count was
 * observed, so every payload without one keeps its exact old shape.
 */
export function oneHourCacheWriteFields(count: number | undefined): {
  cacheCreation1hTokens?: number;
} {
  return count === undefined ? {} : { cacheCreation1hTokens: count };
}
