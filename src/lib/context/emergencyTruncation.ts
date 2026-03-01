/**
 * Emergency Content Truncation
 *
 * When message-level removal (sliding window) can't fit context into budget,
 * this truncates the CONTENT of the longest messages as a last resort.
 */

import type { ChatMessage } from "../types/conversation.js";
import {
  estimateTokens,
  estimateMessagesTokens,
  truncateToTokenBudget,
} from "../utils/tokenEstimation.js";
import { logger } from "../utils/logger.js";

/**
 * Emergency content truncation: truncate the content of the longest messages
 * to fit within the available token budget.
 *
 * Strategy: Sort messages by content length (descending), truncate each
 * to a proportional share of the available budget until total fits.
 */
export function emergencyContentTruncation(
  messages: ChatMessage[],
  availableTokensForHistory: number,
  breakdown: {
    systemPrompt: number;
    conversationHistory: number;
    currentPrompt: number;
    toolDefinitions: number;
    fileAttachments: number;
  },
  provider?: string,
): ChatMessage[] {
  // Budget available for conversation history specifically
  const historyBudget =
    availableTokensForHistory -
    breakdown.systemPrompt -
    breakdown.currentPrompt -
    breakdown.toolDefinitions -
    breakdown.fileAttachments;

  if (historyBudget <= 0) {
    // No room for history: return empty to guarantee budget safety
    return [];
  }

  const currentHistoryTokens = estimateMessagesTokens(messages, provider);
  if (currentHistoryTokens <= historyBudget) {
    return messages; // Already fits
  }

  // Calculate per-message budgets proportional to original size,
  // but cap large messages to free space for others
  const result = [...messages];
  const reductionNeeded = currentHistoryTokens - historyBudget;
  const reductionRatio = reductionNeeded / currentHistoryTokens;

  // Sort indices by content length descending (truncate biggest first)
  const sortedIndices = result
    .map((msg, idx) => ({ idx, len: msg.content.length }))
    .sort((a, b) => b.len - a.len);

  let tokensSaved = 0;
  for (const { idx } of sortedIndices) {
    if (tokensSaved >= reductionNeeded) {
      break;
    }

    const msg = result[idx];
    // Don't truncate system messages or very short messages
    if (msg.role === "system" || msg.content.length < 200) {
      continue;
    }

    const msgTokens = estimateTokens(msg.content, provider);
    const targetTokens = Math.floor(msgTokens * (1 - reductionRatio - 0.05));

    if (targetTokens < msgTokens && targetTokens > 50) {
      const truncated = truncateToTokenBudget(
        msg.content,
        targetTokens,
        provider,
      );
      if (truncated.truncated) {
        const savedThisMsg =
          msgTokens - estimateTokens(truncated.text, provider);
        tokensSaved += savedThisMsg;
        result[idx] = {
          ...msg,
          content: truncated.text,
          metadata: { ...msg.metadata, truncated: true },
        };
      }
    }
  }

  logger.info("[EmergencyTruncation] Content truncation complete", {
    tokensSaved,
    reductionNeeded,
    messagesModified: result.filter((m, i) => m !== messages[i]).length,
  });

  // Final safety check: guarantee returned history fits budget
  if (estimateMessagesTokens(result, provider) <= historyBudget) {
    return result;
  }

  // Hard fallback: keep newest non-system messages that fit
  const fallback: ChatMessage[] = [];
  for (let i = result.length - 1; i >= 0; i--) {
    const msg = result[i];
    if (msg.role === "system") {
      continue;
    }
    fallback.unshift(msg);
    if (estimateMessagesTokens(fallback, provider) > historyBudget) {
      fallback.shift();
      break;
    }
  }
  return fallback;
}
