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
    reasoning: usage.reasoningTokens,
  };
}
