/**
 * Context Budget Checker
 *
 * Pre-generation validation that estimates total input token cost
 * and compares against the model's available input space.
 *
 * This runs BEFORE every LLM call to prevent context overflow.
 */

import { getAvailableInputTokens } from "../constants/contextWindows.js";
import {
  estimateMessagesTokens,
  estimateTokens,
  TOKENS_PER_MESSAGE,
} from "../utils/tokenEstimation.js";
import type {
  BudgetCheckResult,
  BudgetCheckParams,
} from "../types/contextTypes.js";

export type {
  BudgetCheckResult,
  BudgetCheckParams,
} from "../types/contextTypes.js";

/** Default compaction threshold (80% of available input) */
const DEFAULT_COMPACTION_THRESHOLD = 0.8;

/** Estimated tokens per tool definition */
const TOKENS_PER_TOOL_DEFINITION = 200;

/**
 * Check whether a request fits within the model's context budget.
 *
 * Estimates total input tokens from: system prompt + tool definitions +
 * conversation history + current prompt + file attachments, and compares
 * against available input space.
 */
export function checkContextBudget(
  params: BudgetCheckParams,
): BudgetCheckResult {
  const {
    provider,
    model,
    maxTokens,
    systemPrompt,
    conversationMessages,
    currentPrompt,
    toolDefinitions,
    fileAttachments,
    compactionThreshold = DEFAULT_COMPACTION_THRESHOLD,
  } = params;

  const availableInputTokens = getAvailableInputTokens(
    provider,
    model,
    maxTokens,
  );

  // Estimate each category
  const systemPromptTokens = systemPrompt
    ? estimateTokens(systemPrompt, provider) + TOKENS_PER_MESSAGE
    : 0;

  const conversationHistoryTokens = conversationMessages?.length
    ? estimateMessagesTokens(
        conversationMessages as Array<{ role: string; content: string }>,
        provider,
      )
    : 0;

  const currentPromptTokens = currentPrompt
    ? estimateTokens(currentPrompt, provider) + TOKENS_PER_MESSAGE
    : 0;

  const toolDefinitionTokens = toolDefinitions?.length
    ? toolDefinitions.reduce((sum: number, tool: unknown) => {
        try {
          const serialized = JSON.stringify(tool);
          return sum + Math.ceil(serialized.length / 4);
        } catch {
          return sum + TOKENS_PER_TOOL_DEFINITION;
        }
      }, 0)
    : 0;

  const fileAttachmentTokens = fileAttachments?.length
    ? fileAttachments.reduce(
        (sum, file) => sum + estimateTokens(file.content, provider),
        0,
      )
    : 0;

  const estimatedInputTokens =
    systemPromptTokens +
    conversationHistoryTokens +
    currentPromptTokens +
    toolDefinitionTokens +
    fileAttachmentTokens;

  const usageRatio =
    availableInputTokens > 0 ? estimatedInputTokens / availableInputTokens : 1;

  const withinBudget = estimatedInputTokens <= availableInputTokens;
  const shouldCompact = usageRatio >= compactionThreshold;

  return {
    withinBudget,
    estimatedInputTokens,
    availableInputTokens,
    usageRatio,
    shouldCompact,
    breakdown: {
      systemPrompt: systemPromptTokens,
      conversationHistory: conversationHistoryTokens,
      currentPrompt: currentPromptTokens,
      toolDefinitions: toolDefinitionTokens,
      fileAttachments: fileAttachmentTokens,
    },
  };
}
