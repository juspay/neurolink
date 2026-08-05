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
import type { BudgetCheckResult, BudgetCheckParams } from "../types/index.js";
import {
  SpanSerializer,
  SpanType,
  SpanStatus,
  getMetricsAggregator,
} from "../observability/index.js";
import { getActiveTraceContext } from "../telemetry/traceContext.js";
/** Default compaction threshold (80% of available input) */
const DEFAULT_COMPACTION_THRESHOLD = 0.8;

/**
 * Fraction of the derived history budget actually handed to the compactor.
 * Estimation is char-based and approximate, so the compactor aims slightly
 * under the true ceiling rather than exactly at it.
 */
const HISTORY_BUDGET_SAFETY_FACTOR = 0.95;

/** Estimated tokens per tool definition */
const TOKENS_PER_TOOL_DEFINITION = 200;

/**
 * Tokens the CONVERSATION HISTORY may occupy, i.e. the model's available input
 * space minus everything that rides alongside it (system prompt, current
 * prompt, tool definitions, file attachments).
 *
 * This is the number the compactor must target. Passing it the undeducted
 * `availableInputTokens` made every stage gate compare history-only tokens
 * against the WHOLE budget, so compaction only engaged once history alone
 * exceeded the entire window — with a large MCP tool set a request could sit
 * far over budget while the compactor reported "nothing to do" and fell through
 * to emergency truncation.
 *
 * Returns 0 when the fixed overhead already exceeds the window; callers must
 * treat that as unrecoverable rather than compacting to an empty history.
 */
export function resolveHistoryBudget(result: BudgetCheckResult): number {
  const { availableInputTokens, breakdown } = result;
  if (!breakdown) {
    return Math.max(
      0,
      Math.floor(availableInputTokens * HISTORY_BUDGET_SAFETY_FACTOR),
    );
  }
  const overhead =
    breakdown.systemPrompt +
    breakdown.currentPrompt +
    breakdown.toolDefinitions +
    breakdown.fileAttachments;
  return Math.max(
    0,
    Math.floor(
      (availableInputTokens - overhead) * HISTORY_BUDGET_SAFETY_FACTOR,
    ),
  );
}

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
  const { traceId, parentSpanId } = getActiveTraceContext();
  const span = SpanSerializer.createSpan(
    SpanType.CONTEXT_COMPACTION,
    "context.budgetCheck",
    {
      "context.operation": "budgetCheck",
    },
    parentSpanId,
    traceId,
  );
  const startTime = Date.now();

  try {
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
      ? toolDefinitions.reduce<number>((sum, tool) => {
          try {
            const serialized = JSON.stringify(tool);
            return sum + estimateTokens(serialized, provider);
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
      availableInputTokens > 0
        ? estimatedInputTokens / availableInputTokens
        : 1;

    const withinBudget = estimatedInputTokens <= availableInputTokens;
    const shouldCompact = usageRatio >= compactionThreshold;

    const result: BudgetCheckResult = {
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

    span.durationMs = Date.now() - startTime;
    const endedSpan = SpanSerializer.endSpan(
      SpanSerializer.updateAttributes(span, {
        "context.budgetUsage": usageRatio,
        "context.triggered": shouldCompact,
        "context.estimatedTokens": estimatedInputTokens,
        "context.availableTokens": availableInputTokens,
      }),
      SpanStatus.OK,
    );
    getMetricsAggregator().recordSpan(endedSpan);

    return result;
  } catch (error) {
    span.durationMs = Date.now() - startTime;
    const endedSpan = SpanSerializer.endSpan(span, SpanStatus.ERROR);
    endedSpan.statusMessage =
      error instanceof Error ? error.message : String(error);
    getMetricsAggregator().recordSpan(endedSpan);
    throw error;
  }
}
