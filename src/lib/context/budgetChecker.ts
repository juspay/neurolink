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
  ToolReplayMode,
} from "../types/index.js";
import {
  SpanSerializer,
  SpanType,
  SpanStatus,
  getMetricsAggregator,
} from "../observability/index.js";
import { getActiveTraceContext } from "../telemetry/traceContext.js";
/** Default compaction threshold (80% of available input) */
export const DEFAULT_COMPACTION_THRESHOLD = 0.8;

/**
 * Fraction of the derived history budget actually handed to the compactor.
 * Estimation is char-based and approximate, so the compactor aims slightly
 * under the true ceiling rather than exactly at it.
 */
const HISTORY_BUDGET_SAFETY_FACTOR = 0.95;

/** Estimated tokens per tool definition */
const TOKENS_PER_TOOL_DEFINITION = 200;

/**
 * Tokens one `[called <tool> → ok]` marker line costs. The tool name is the
 * only variable part and is short; a fixed figure keeps the estimate cheap.
 */
const TOKENS_PER_TOOL_MARKER = 12;

/**
 * Estimate the history at the size it will REACH THE MODEL.
 *
 * Tool rows are stored at full size (arguments plus the whole output), but
 * the prompt carries them per `replayToolSteps`: `"marker"` — the default —
 * sends one short line per call and nothing for the result, `"off"` sends
 * nothing, `"full"` sends the stored payload. Counting them at stored size
 * under `"marker"` made the budget check and the summarization trigger see
 * a history several times larger than the prompt, so summarization fired
 * turns before the real prompt was anywhere near the window.
 *
 * Without a mode the rows count at stored size, which is also right for the
 * providers that replay tool rows natively in their own wire shape
 * regardless of the mode (see `replaysToolRowsNatively`).
 */
function estimateHistoryTokens(
  messages: Array<{ role: string; content: unknown }>,
  provider: string,
  mode: ToolReplayMode | undefined,
): number {
  if (mode === undefined || mode === "full") {
    return estimateMessagesTokens(messages, provider);
  }
  const regular = messages.filter(
    (m) => m.role !== "tool_call" && m.role !== "tool_result",
  );
  let total = estimateMessagesTokens(regular, provider);
  if (mode === "marker") {
    // One marker per call; a result adds nothing beyond its call's marker.
    // `result.error` rides along on the marker only as "→ error", so it is
    // not counted either.
    total +=
      messages.filter((m) => m.role === "tool_call").length *
      (TOKENS_PER_TOOL_MARKER + TOKENS_PER_MESSAGE);
  }
  return total;
}

/**
 * Providers whose native history builders replay stored tool rows in their
 * own wire shape whatever `replayToolSteps` says (Claude-on-Vertex, Gemini
 * on Vertex and AI Studio). Their tool rows always reach the model at full
 * size, so the mode must not shrink the estimate for them.
 */
const NATIVE_TOOL_REPLAY_PROVIDERS: ReadonlySet<string> = new Set([
  "vertex",
  "google-ai",
  "google-vertex",
  "googlevertex",
  "google-ai-studio",
]);

function replaysToolRowsNatively(provider: string): boolean {
  return NATIVE_TOOL_REPLAY_PROVIDERS.has(provider.toLowerCase());
}

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
export function resolveHistoryBudget(
  result: BudgetCheckResult,
  compactionThreshold?: number,
): number {
  const { availableInputTokens, breakdown } = result;
  // A per-request threshold says how much of the window this request should
  // occupy. Expressed against the 0.8 default it becomes a pure scale factor,
  // so the default reproduces the previous number EXACTLY (0.8/0.8 = 1) and
  // anything lower shrinks the target. Clamped to at most 1 because this is
  // the "give the model less context" lever, never the "give it more" one —
  // over-filling a window is a hard provider error that ModelPool records as
  // a permanent cooldown.
  const scale =
    compactionThreshold === undefined
      ? 1
      : Math.max(
          0,
          Math.min(1, compactionThreshold / DEFAULT_COMPACTION_THRESHOLD),
        );
  const factor = HISTORY_BUDGET_SAFETY_FACTOR * scale;
  if (!breakdown) {
    return Math.max(0, Math.floor(availableInputTokens * factor));
  }
  const overhead =
    breakdown.systemPrompt +
    breakdown.currentPrompt +
    breakdown.toolDefinitions +
    breakdown.fileAttachments;
  return Math.max(0, Math.floor((availableInputTokens - overhead) * factor));
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
      toolReplayMode,
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
      ? estimateHistoryTokens(
          conversationMessages as Array<{ role: string; content: string }>,
          provider,
          replaysToolRowsNatively(provider) ? undefined : toolReplayMode,
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
        // The threshold this check actually used. `shouldCompact` is
        // meaningless without it once the threshold became per-request:
        // the same usageRatio can be over budget for one request and under
        // it for the next.
        "context.compactionThreshold": compactionThreshold,
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
