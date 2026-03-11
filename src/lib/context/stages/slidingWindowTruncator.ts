/**
 * Stage 4: Sliding Window Truncation
 *
 * Non-destructive fallback: tags oldest messages as truncated
 * instead of deleting them. Always preserves first message pair.
 * Removes messages in pairs to maintain role alternation.
 *
 * Features:
 * - Adaptive truncation (PERF-001): calculates fraction from actual overage
 *   instead of fixed 50%, with iterative refinement up to 3 passes.
 * - Small conversation handling (BUG-005): for <= 4 messages, truncates
 *   message content proportionally instead of returning no-op.
 */

import type { ChatMessage } from "../../types/conversation.js";
import type {
  TruncationConfig,
  TruncationResult,
} from "../../types/contextTypes.js";
import {
  estimateTokens,
  estimateMessagesTokens,
  truncateToTokenBudget,
} from "../../utils/tokenEstimation.js";
import { logger } from "../../utils/logger.js";
import { randomUUID } from "crypto";

export type {
  TruncationConfig,
  TruncationResult,
} from "../../types/contextTypes.js";

const TRUNCATION_MARKER_CONTENT =
  "[Earlier conversation history was truncated to fit within context limits]";

function validateRoleAlternation(messages: ChatMessage[]): void {
  for (let i = 1; i < messages.length; i++) {
    if (
      messages[i].role === messages[i - 1].role &&
      messages[i].role !== "system"
    ) {
      logger.warn(
        `[SlidingWindowTruncator] Role alternation broken at index ${i}: consecutive "${messages[i].role}" messages`,
      );
    }
  }
}

/**
 * For conversations with <= 4 messages that exceed token budget,
 * truncate the CONTENT of the longest messages rather than removing messages.
 *
 * Strategy:
 * 1. Calculate each message's proportional share of the token budget
 * 2. Truncate messages that exceed their share using truncateToTokenBudget()
 * 3. Never truncate messages below 200 tokens (preserve minimum context)
 */
function truncateSmallConversation(
  messages: ChatMessage[],
  config?: TruncationConfig,
): TruncationResult {
  // If no target tokens provided, we can't do content truncation
  if (!config?.targetTokens) {
    return { truncated: false, messages, messagesRemoved: 0 };
  }

  const provider = config.provider;
  const targetTokens = config.targetTokens;
  const currentTokens = estimateMessagesTokens(messages, provider);

  if (currentTokens <= targetTokens) {
    return { truncated: false, messages, messagesRemoved: 0 };
  }

  const MINIMUM_MSG_TOKENS = 200;
  const FRAMING_OVERHEAD = 24 + messages.length * 4; // conversation + per-message overhead

  // Available budget for actual content
  const contentBudget = targetTokens - FRAMING_OVERHEAD;
  if (contentBudget <= 0) {
    return { truncated: false, messages, messagesRemoved: 0 };
  }

  // Calculate current content tokens per message
  const msgTokens = messages.map((msg) =>
    estimateTokens(msg.content, provider),
  );
  const totalContentTokens = msgTokens.reduce((sum, t) => sum + t, 0);

  // Each message gets a proportional share of the content budget
  const result = [...messages];
  let totalSaved = 0;

  for (let i = 0; i < result.length; i++) {
    const msg = result[i];
    // Don't truncate system/summary messages
    if (msg.role === "system" || msg.metadata?.isSummary) {
      continue;
    }

    const proportionalBudget = Math.floor(
      (msgTokens[i] / totalContentTokens) * contentBudget,
    );
    const msgBudget = Math.max(MINIMUM_MSG_TOKENS, proportionalBudget);

    if (msgTokens[i] > msgBudget) {
      const truncated = truncateToTokenBudget(msg.content, msgBudget, provider);
      if (truncated.truncated) {
        totalSaved += msgTokens[i] - estimateTokens(truncated.text, provider);
        result[i] = {
          ...msg,
          content: truncated.text,
          metadata: { ...msg.metadata, truncated: true },
        };
      }
    }
  }

  if (totalSaved > 0) {
    const finalTokens = estimateMessagesTokens(result, provider);
    logger.info("[Truncation] Small conversation content truncated", {
      messageCount: messages.length,
      tokensSaved: totalSaved,
      targetTokens,
      finalTokens,
    });
    return {
      truncated: finalTokens <= targetTokens,
      messages: result,
      messagesRemoved: 0, // No messages removed, only content truncated
    };
  }

  return { truncated: false, messages, messagesRemoved: 0 };
}

export function truncateWithSlidingWindow(
  messages: ChatMessage[],
  config?: TruncationConfig,
): TruncationResult {
  if (messages.length <= 4) {
    // Delegate to content truncation for small conversations (BUG-005)
    return truncateSmallConversation(messages, config);
  }

  // ADAPTIVE MODE: calculate fraction from actual overage (PERF-001)
  let fraction: number;
  if (
    config?.currentTokens &&
    config?.targetTokens &&
    config.currentTokens > config.targetTokens
  ) {
    const overageRatio =
      (config.currentTokens - config.targetTokens) / config.currentTokens;
    const buffer = config?.adaptiveBuffer ?? 0.15;
    // Required fraction = overage ratio + buffer, clamped to [0.1, 0.9]
    fraction = Math.min(0.9, Math.max(0.1, overageRatio + buffer));

    logger.info("[Truncation] Adaptive fraction calculated", {
      currentTokens: config.currentTokens,
      targetTokens: config.targetTokens,
      overageRatio: Math.round(overageRatio * 100),
      fraction: Math.round(fraction * 100),
    });
  } else {
    // Fallback to configured or default fraction
    fraction = config?.fraction ?? 0.5;
  }

  // Always preserve first user-assistant pair
  const firstPair = messages.slice(0, 2);
  const remainingMessages = messages.slice(2);

  // ITERATIVE: if first pass isn't enough, increase fraction
  const maxIterations = config?.maxIterations ?? 3;
  let currentFraction = fraction;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const removeCount = Math.floor(remainingMessages.length * currentFraction);
    const evenRemoveCount = removeCount - (removeCount % 2);

    if (evenRemoveCount <= 0) {
      break;
    }

    const keptAfterTruncation = remainingMessages.slice(evenRemoveCount);

    // Insert a truncation marker with machine-readable metadata so
    // effectiveHistory.ts can detect it via isTruncationMarker /
    // truncationId and removeTruncationTags can rewind it.
    const truncId = randomUUID();
    const marker: ChatMessage = {
      id: `truncation-marker-${truncId}`,
      role: "user",
      content: TRUNCATION_MARKER_CONTENT,
      isTruncationMarker: true,
      truncationId: truncId,
    };

    const candidateMessages = [...firstPair, marker, ...keptAfterTruncation];

    validateRoleAlternation(candidateMessages);

    // If we have token targets, verify the result fits
    if (config?.targetTokens) {
      const candidateTokens = estimateMessagesTokens(
        candidateMessages,
        config.provider,
      );
      if (candidateTokens <= config.targetTokens) {
        return {
          truncated: true,
          messages: candidateMessages,
          messagesRemoved: evenRemoveCount,
        };
      }
      // Not enough -- increase fraction by 25% for next iteration
      currentFraction = Math.min(0.95, currentFraction + 0.25);
      continue;
    }

    // No token targets -- single-pass with calculated fraction
    return {
      truncated: true,
      messages: candidateMessages,
      messagesRemoved: evenRemoveCount,
    };
  }

  // All iterations exhausted -- return best effort (most aggressive truncation)
  const maxRemove = Math.floor(remainingMessages.length * 0.95);
  const evenMaxRemove = maxRemove - (maxRemove % 2);
  if (evenMaxRemove > 0) {
    const keptMessages = remainingMessages.slice(evenMaxRemove);

    // Insert a truncation marker (see iterative block above)
    const fallbackTruncId = randomUUID();
    const fallbackMarker: ChatMessage = {
      id: `truncation-marker-${fallbackTruncId}`,
      role: "user",
      content: TRUNCATION_MARKER_CONTENT,
      isTruncationMarker: true,
      truncationId: fallbackTruncId,
    };

    const fallbackMessages = [...firstPair, fallbackMarker, ...keptMessages];
    validateRoleAlternation(fallbackMessages);

    return {
      truncated: true,
      messages: fallbackMessages,
      messagesRemoved: evenMaxRemove,
    };
  }

  return { truncated: false, messages, messagesRemoved: 0 };
}
