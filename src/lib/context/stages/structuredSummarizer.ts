/**
 * Stage 3: Structured LLM Summarization
 *
 * Uses the structured 10-section prompt to summarize older messages
 * while preserving recent ones.
 */

import { randomUUID } from "crypto";
import type {
  SummarizeConfig,
  SummarizeResult,
} from "../../types/contextTypes.js";
import type {
  ChatMessage,
  ConversationMemoryConfig,
} from "../../types/conversation.js";
import { generateSummary } from "../../utils/conversationMemory.js";
import { estimateTokens } from "../../utils/tokenEstimation.js";
import { logger } from "../../utils/logger.js";

export type {
  SummarizeConfig,
  SummarizeResult,
} from "../../types/contextTypes.js";

/**
 * Find the split index using token counting — walk backward from the end,
 * accumulating token counts until we've reserved `targetRecentTokens` worth
 * of recent content. Everything before the split index gets summarized.
 */
function findSplitIndexByTokens(
  messages: ChatMessage[],
  targetRecentTokens: number,
  provider?: string,
): number {
  let recentTokens = 0;
  let splitIndex = messages.length;

  for (let i = messages.length - 1; i >= 0; i--) {
    const content =
      typeof messages[i].content === "string"
        ? messages[i].content
        : JSON.stringify(messages[i].content);
    const msgTokens = estimateTokens(content, provider);
    if (recentTokens + msgTokens > targetRecentTokens) {
      splitIndex = i + 1;
      break;
    }
    recentTokens += msgTokens;
  }

  // Ensure at least one message is summarized
  return Math.max(1, splitIndex);
}

export async function summarizeMessages(
  messages: ChatMessage[],
  config?: SummarizeConfig,
): Promise<SummarizeResult> {
  const keepRecentRatio = config?.keepRecentRatio ?? 0.3;

  if (messages.length <= 4) {
    return { summarized: false, messages };
  }

  // Determine split point: prefer token-based when a target budget is available,
  // fall back to message-count-based split for backward compatibility.
  let splitIndex: number;
  if (config?.targetTokens && config.targetTokens > 0) {
    // Keep `keepRecentRatio` fraction of the target budget as recent context
    const targetRecentTokens = Math.floor(
      config.targetTokens * keepRecentRatio,
    );
    // NOTE: config.provider is the summarization provider, not the generation
    // provider. Ideally we'd use the generation/budget provider for accurate
    // token estimation, but SummarizeConfig doesn't carry a separate
    // budgetProvider field. This is a known design limitation.
    splitIndex = findSplitIndexByTokens(
      messages,
      targetRecentTokens,
      config.provider,
    );
  } else {
    // Legacy: message-count-based split
    const keepCount = Math.max(4, Math.ceil(messages.length * keepRecentRatio));
    splitIndex = messages.length - keepCount;
  }

  // Clamp so at least the last message is always preserved (never summarize everything)
  splitIndex = Math.min(splitIndex, messages.length - 1);

  if (splitIndex <= 0) {
    return { summarized: false, messages };
  }

  const messagesToSummarize = messages.slice(0, splitIndex);
  const recentMessages = messages.slice(splitIndex);

  // Find previous summary if exists
  const previousSummary = messagesToSummarize.find(
    (m) => m.metadata?.isSummary,
  )?.content;

  // Build effective memory config: use provided memoryConfig, or construct from provider/model
  const effectiveMemoryConfig: Partial<ConversationMemoryConfig> =
    config?.memoryConfig ? { ...config.memoryConfig } : {};

  // Fill in summarization provider/model from compactor config if not already set
  if (!effectiveMemoryConfig.summarizationProvider && config?.provider) {
    effectiveMemoryConfig.summarizationProvider = config.provider;
  }
  if (!effectiveMemoryConfig.summarizationModel && config?.model) {
    effectiveMemoryConfig.summarizationModel = config.model;
  }

  // Only skip if there's genuinely no provider available
  if (
    !effectiveMemoryConfig.summarizationProvider &&
    !effectiveMemoryConfig.summarizationModel
  ) {
    logger.debug(
      "[ContextCompactor] Stage 3 skipped: no summarization provider or model available",
    );
    return { summarized: false, messages };
  }

  const summaryText = await generateSummary(
    messagesToSummarize,
    effectiveMemoryConfig,
    "[ContextCompactor]",
    previousSummary,
  );

  if (!summaryText) {
    return { summarized: false, messages };
  }

  const summaryMessage: ChatMessage = {
    id: `summary-${randomUUID()}`,
    role: "user",
    content: `[Previous conversation summary]:\n\n${summaryText}`,
    timestamp: new Date().toISOString(),
    metadata: {
      isSummary: true,
      summarizesFrom: messagesToSummarize[0]?.id,
      summarizesTo: messagesToSummarize[messagesToSummarize.length - 1]?.id,
    },
  };

  return {
    summarized: true,
    messages: [summaryMessage, ...recentMessages],
    summaryText,
  };
}
