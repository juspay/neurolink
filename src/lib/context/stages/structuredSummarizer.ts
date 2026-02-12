/**
 * Stage 3: Structured LLM Summarization
 *
 * Uses the structured 9-section prompt to summarize older messages
 * while preserving recent ones.
 */

import type { ChatMessage } from "../../types/conversation.js";
import type {
  SummarizeConfig,
  SummarizeResult,
} from "../../types/contextTypes.js";
import { generateSummary } from "../../utils/conversationMemory.js";
import { randomUUID } from "crypto";

export type {
  SummarizeConfig,
  SummarizeResult,
} from "../../types/contextTypes.js";

export async function summarizeMessages(
  messages: ChatMessage[],
  config?: SummarizeConfig,
): Promise<SummarizeResult> {
  const keepRecentRatio = config?.keepRecentRatio ?? 0.3;

  if (messages.length <= 4) {
    return { summarized: false, messages };
  }

  // Keep the most recent messages unsummarized
  const keepCount = Math.max(4, Math.ceil(messages.length * keepRecentRatio));
  const splitIndex = messages.length - keepCount;

  if (splitIndex <= 0) {
    return { summarized: false, messages };
  }

  const messagesToSummarize = messages.slice(0, splitIndex);
  const recentMessages = messages.slice(splitIndex);

  // Find previous summary if exists
  const previousSummary = messagesToSummarize.find(
    (m) => m.metadata?.isSummary,
  )?.content;

  // Use memory config for summarization if available
  if (config?.memoryConfig) {
    const summaryText = await generateSummary(
      messagesToSummarize,
      config.memoryConfig,
      "[ContextCompactor]",
      previousSummary,
    );

    if (!summaryText) {
      return { summarized: false, messages };
    }

    const summaryMessage: ChatMessage = {
      id: `summary-${randomUUID()}`,
      role: "system",
      content: `Previous conversation summary:\n\n${summaryText}`,
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

  // Without memory config, we can't call LLM
  return { summarized: false, messages };
}
