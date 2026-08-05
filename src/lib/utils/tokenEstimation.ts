/**
 * Token Estimation Utilities
 *
 * Provides character-based token estimation with per-provider adjustment
 * multipliers. Uses the same approach as Continue (gpt-tokenizer baseline
 * + provider multipliers) but without requiring a tokenizer dependency.
 *
 * Multiplier sources: Continue project's getAdjustedTokenCount.ts
 * - Anthropic: 1.23x (Anthropic tokenizer produces ~23% more tokens)
 * - Google (AI Studio / Vertex): 1.18x
 * - Mistral/Codestral: 1.26x
 * - OpenAI/GPT: 1.0x (baseline)
 */

import type { ChatMessage } from "../types/index.js";

/** Characters per token for English text */
export const CHARS_PER_TOKEN = 4;

/** Characters per token for code */
export const CODE_CHARS_PER_TOKEN = 3;

/**
 * Safety margin: additive fraction of baseTokens added to the provider-adjusted estimate.
 * Using additive margin prevents compounding with provider multipliers.
 *
 * Old behavior: baseTokens * providerMultiplier * 1.15  (compounding)
 *   e.g. Anthropic: baseTokens * 1.23 * 1.15 = baseTokens * 1.4145
 * New behavior: baseTokens * providerMultiplier + baseTokens * 0.05  (additive)
 *   e.g. Anthropic: baseTokens * 1.23 + baseTokens * 0.05 = baseTokens * 1.28
 */
export const TOKEN_SAFETY_MARGIN_ADDITIVE = 0.05;

/** @deprecated Use TOKEN_SAFETY_MARGIN_ADDITIVE instead. Kept for backward compatibility. */
export const TOKEN_SAFETY_MARGIN = 1.15;

/** Message framing overhead in tokens (role + delimiters) */
export const TOKENS_PER_MESSAGE = 4;

/** Conversation-level overhead in tokens */
export const TOKENS_PER_CONVERSATION = 24;

/** Image token estimate (flat) */
export const IMAGE_TOKEN_ESTIMATE = 1_024;

/**
 * Chars charged for a value that cannot be serialized for estimation (V8 max
 * string length). Deliberately large: such a value is enormous by definition,
 * and under-charging it would defeat the budget check it feeds.
 */
const OVERSIZED_VALUE_FALLBACK_CHARS = 200_000;

/**
 * Per-provider token multipliers.
 * Applied on top of the base GPT-style character estimate.
 */
const PROVIDER_MULTIPLIERS: Record<string, number> = {
  anthropic: 1.23,
  "google-ai": 1.18,
  vertex: 1.18,
  mistral: 1.26,
  openai: 1.0,
  azure: 1.0,
  bedrock: 1.23, // Bedrock is mostly Anthropic models
  ollama: 1.0,
  litellm: 1.0,
  huggingface: 1.0,
  sagemaker: 1.0,
};

/**
 * Get the token multiplier for a given provider.
 */
export function getProviderMultiplier(provider?: string): number {
  if (!provider) {
    return 1.0;
  }
  return PROVIDER_MULTIPLIERS[provider] ?? 1.0;
}

/**
 * Estimate token count for a string.
 *
 * @param text - Input text
 * @param provider - Optional provider for multiplier adjustment
 * @param isCode - Whether the text is code (uses CODE_CHARS_PER_TOKEN)
 * @returns Estimated token count
 */
export function estimateTokens(
  text: string,
  provider?: string,
  isCode?: boolean,
): number {
  if (!text || text.length === 0) {
    return 0;
  }

  const charsPerToken = isCode ? CODE_CHARS_PER_TOKEN : CHARS_PER_TOKEN;
  const baseTokens = Math.ceil(text.length / charsPerToken);
  const multiplier = getProviderMultiplier(provider);

  // Apply provider multiplier and additive safety margin separately
  // This prevents compounding (e.g. Anthropic: 1.23 * 1.15 = 1.41x was too aggressive)
  const providerAdjusted = baseTokens * multiplier;
  const safetyBuffer = baseTokens * TOKEN_SAFETY_MARGIN_ADDITIVE;

  return Math.ceil(providerAdjusted + safetyBuffer);
}

/**
 * Serialize an arbitrary value for estimation. Never throws: `JSON.stringify`
 * raises RangeError once a value exceeds V8's max string length, and a tool
 * argument blob is exactly the shape that gets there. A payload that large is
 * charged at the fallback size rather than aborting the estimate (and with it
 * the whole turn).
 */
function serializeForEstimate(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return "x".repeat(OVERSIZED_VALUE_FALLBACK_CHARS);
  }
}

/**
 * Estimate token count for a single ChatMessage.
 * Includes message framing overhead.
 *
 * Counts `content` AND `args`. A `tool_call` is persisted with an EMPTY
 * `content` and its entire payload in `args` (see flushPendingToolExecutions),
 * so a content-only estimate scored a 39 KB Write call at ~28 tokens against a
 * real cost near 9,750 — the budget checker, the compaction trigger and the
 * summarization threshold were all blind to the single largest source of
 * context growth in an agentic session.
 *
 * `result` is deliberately NOT counted: `result.result` is re-hydrated FROM
 * `content` at read time (redisConversationMemoryManager), so counting both
 * double-bills the same bytes. Only `result.error`, which has no counterpart in
 * `content`, is included.
 */
export function estimateMessageTokens(
  message: ChatMessage | { role: string; content: unknown },
  provider?: string,
): number {
  let contentStr = "";
  if (message.content) {
    if (typeof message.content === "string") {
      contentStr = message.content;
    } else {
      try {
        contentStr = JSON.stringify(message.content);
      } catch {
        // Fallback for circular references or non-serializable content
        contentStr = String(message.content);
      }
    }
  }
  let total = estimateTokens(contentStr, provider) + TOKENS_PER_MESSAGE;

  const args = (message as ChatMessage).args;
  if (args) {
    total += estimateTokens(serializeForEstimate(args), provider);
  }

  const resultError = (message as ChatMessage).result?.error;
  if (resultError) {
    total += estimateTokens(serializeForEstimate(resultError), provider);
  }

  return total;
}

/**
 * Estimate total token count for an array of messages.
 * Includes conversation-level overhead.
 */
export function estimateMessagesTokens(
  messages: Array<ChatMessage | { role: string; content: unknown }>,
  provider?: string,
): number {
  if (!messages || messages.length === 0) {
    return 0;
  }

  const messageTokens = messages.reduce(
    (sum, msg) => sum + estimateMessageTokens(msg, provider),
    0,
  );

  return messageTokens + TOKENS_PER_CONVERSATION;
}

/**
 * Truncate text to fit within a token budget.
 * Tries to cut at sentence or word boundaries.
 *
 * @param text - Input text
 * @param maxTokens - Maximum tokens allowed
 * @param provider - Optional provider for multiplier
 * @returns Truncated text with "..." suffix if truncated
 */
export function truncateToTokenBudget(
  text: string,
  maxTokens: number,
  provider?: string,
): { text: string; truncated: boolean } {
  if (estimateTokens(text, provider) <= maxTokens) {
    return { text, truncated: false };
  }

  const multiplier = getProviderMultiplier(provider);
  // Use additive safety margin: effective multiplier = multiplier + additive margin
  const effectiveMultiplier = multiplier + TOKEN_SAFETY_MARGIN_ADDITIVE;
  const maxChars = Math.floor(
    (maxTokens / effectiveMultiplier) * CHARS_PER_TOKEN,
  );

  if (maxChars <= 0) {
    return { text: "", truncated: true };
  }

  // Try to cut at sentence boundary
  const candidate = text.slice(0, maxChars);
  const lastSentence = Math.max(
    candidate.lastIndexOf(". "),
    candidate.lastIndexOf("! "),
    candidate.lastIndexOf("? "),
    candidate.lastIndexOf("\n"),
  );

  const cutPoint = lastSentence > maxChars * 0.5 ? lastSentence + 1 : maxChars;
  return { text: text.slice(0, cutPoint) + "...", truncated: true };
}
