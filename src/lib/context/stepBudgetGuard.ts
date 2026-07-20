/**
 * Per-step context budget guard for the AI-SDK agent loop.
 *
 * Pre-call budgeting (`checkContextBudget` + compaction) runs ONCE before
 * dispatch and only sees the input/session conversation. The AI-SDK tool loop
 * then appends assistant turns and tool results on every step — growth the
 * pre-call pipeline never sees, which is how long agentic runs overflow the
 * model's real context window mid-loop (provider 400s after dozens of tool
 * calls). The googleVertex native loops already guard this via
 * `createContextGuard`; this module brings the AI-SDK path (every provider
 * that delegates to `generateText`) to parity — and goes one step further:
 * instead of stopping the loop, it deterministically reclaims budget so the
 * loop can CONTINUE.
 *
 * Wired in `GenerationHandler.callGenerateText` through
 * `experimental_prepareStep`, whose result may replace the step's `messages`.
 * The guard operates on `ModelMessage[]` natively (no lossy ChatMessage
 * round-trip) and never makes LLM calls:
 *
 *   Stage 1 — truncate OLD tool outputs to head/tail previews
 *             (`generateToolOutputPreview`), oldest first, outside the
 *             protected recent tail.
 *   Stage 2 — drop the oldest complete tool exchanges (assistant tool-call
 *             message + its following tool-result messages, as a unit, so
 *             call/result pairing stays intact), replacing them with a single
 *             elision note.
 *
 * The system prompt and tool definitions ride OUTSIDE the step messages (the
 * handler hoists system into generateText's `system` option), so their cost is
 * passed in as `fixedOverheadTokens`. The first user message (the task) and
 * the most recent messages are never touched.
 */

import type { ModelMessage, StepBudgetGuardConfig } from "../types/index.js";
import { DEFAULT_CONTEXT_GUARD_RATIO } from "../core/constants.js";
import { getAvailableInputTokens } from "../constants/contextWindows.js";
import {
  estimateTokens,
  TOKENS_PER_MESSAGE,
} from "../utils/tokenEstimation.js";
import { generateToolOutputPreview } from "./toolOutputLimits.js";
import { logger } from "../utils/logger.js";

/** Estimated tokens for a tool definition that fails to serialize. */
const TOKENS_PER_TOOL_DEFINITION = 200;

/** Messages at the end of the conversation the guard never modifies. */
const PROTECTED_TAIL_MESSAGES = 4;

/** Stage-1 preview budget for an old tool output (bytes). */
const OLD_TOOL_OUTPUT_PREVIEW_BYTES = 2_048;

/** Stage-1 preview budget for an old tool output (lines). */
const OLD_TOOL_OUTPUT_PREVIEW_LINES = 60;

/**
 * Serialize any ModelMessage content to text for estimation. Tool-call args
 * and tool-result outputs are JSON-stringified; unserializable values fall
 * back to a fixed-size placeholder so estimation never throws.
 */
function contentToText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  try {
    return JSON.stringify(content) ?? "";
  } catch {
    return "x".repeat(TOKENS_PER_TOOL_DEFINITION * 4);
  }
}

/** Estimate the token cost of a step's message array. */
export function estimateStepMessagesTokens(
  messages: readonly ModelMessage[],
  provider?: string,
): number {
  let total = 0;
  for (const message of messages) {
    total +=
      estimateTokens(contentToText(message.content), provider) +
      TOKENS_PER_MESSAGE;
  }
  return total;
}

/**
 * Estimate the fixed per-request overhead: hoisted system prompt + tool
 * definitions. Mirrors `checkContextBudget`'s categories for the pieces that
 * do not live in the step messages.
 */
export function estimateFixedOverheadTokens(
  system: unknown,
  tools: Record<string, unknown> | undefined,
  provider?: string,
): number {
  let total = system
    ? estimateTokens(contentToText(system), provider) + TOKENS_PER_MESSAGE
    : 0;
  for (const tool of Object.values(tools ?? {})) {
    try {
      total += estimateTokens(JSON.stringify(tool) ?? "", provider);
    } catch {
      total += TOKENS_PER_TOOL_DEFINITION;
    }
  }
  return total;
}

/**
 * Serialize a ToolResultOutput to the text the MODEL should see in a preview.
 * Variant-aware: `text`/`error-text` carry their payload in `.value` directly —
 * stringifying the wrapper would put escaped `{"type":"text","value":…}` JSON
 * in front of the model instead of the actual output. `json`/`error-json`/
 * `content` serialize their value; unknown shapes fall back to the wrapper.
 */
function toolResultOutputToText(output: unknown): string {
  const variant = output as { type?: string; value?: unknown } | undefined;
  if (variant && typeof variant === "object" && "type" in variant) {
    if (
      (variant.type === "text" || variant.type === "error-text") &&
      typeof variant.value === "string"
    ) {
      return variant.value;
    }
    if (
      variant.type === "json" ||
      variant.type === "error-json" ||
      variant.type === "content"
    ) {
      return contentToText(variant.value);
    }
  }
  return contentToText(output);
}

/** True when the message is an assistant message that issues tool calls. */
function isToolCallAssistantMessage(message: ModelMessage): boolean {
  return (
    message.role === "assistant" &&
    Array.isArray(message.content) &&
    message.content.some(
      (part) => (part as { type?: string })?.type === "tool-call",
    )
  );
}

/**
 * Stage 1: replace large tool-result outputs outside the protected tail with
 * head/tail previews. Returns the new array plus how many outputs shrank.
 */
function truncateOldToolOutputs(messages: ModelMessage[]): {
  messages: ModelMessage[];
  truncated: number;
} {
  const cutoff = Math.max(0, messages.length - PROTECTED_TAIL_MESSAGES);
  let truncated = 0;

  const next = messages.map((message, index) => {
    if (index >= cutoff || message.role !== "tool") {
      return message;
    }
    if (!Array.isArray(message.content)) {
      return message;
    }
    let changed = false;
    const content = message.content.map((part) => {
      const resultPart = part as {
        type?: string;
        toolCallId?: string;
        toolName?: string;
        output?: unknown;
      };
      if (resultPart?.type !== "tool-result") {
        return part;
      }
      const serialized = toolResultOutputToText(resultPart.output);
      if (serialized.length <= OLD_TOOL_OUTPUT_PREVIEW_BYTES) {
        return part;
      }
      const { preview } = generateToolOutputPreview(serialized, {
        maxBytes: OLD_TOOL_OUTPUT_PREVIEW_BYTES,
        maxLines: OLD_TOOL_OUTPUT_PREVIEW_LINES,
      });
      changed = true;
      truncated += 1;
      return {
        ...resultPart,
        output: { type: "text", value: preview },
      };
    });
    return changed ? ({ ...message, content } as ModelMessage) : message;
  });

  return { messages: next, truncated };
}

/**
 * Stage 2: drop the oldest complete tool exchanges — an assistant tool-call
 * message together with ALL directly-following `tool` messages — until the
 * estimate fits or only the protected head/tail remains. The first
 * non-assistant message run (the task) is never dropped. A single elision
 * note replaces everything removed so the model knows history was elided.
 */
function dropOldestToolExchanges(
  messages: ModelMessage[],
  budgetTokens: number,
  fixedOverheadTokens: number,
  provider?: string,
): { messages: ModelMessage[]; droppedExchanges: number } {
  const result = [...messages];
  let droppedExchanges = 0;

  // Running-total accounting: estimate each message ONCE, keep the estimates
  // array in lockstep with `result`, and subtract dropped blocks — instead of
  // re-estimating the whole array on every iteration (O(n²) with many drops).
  const estimates = result.map(
    (message) =>
      estimateTokens(contentToText(message.content), provider) +
      TOKENS_PER_MESSAGE,
  );
  let currentTokens =
    fixedOverheadTokens + estimates.reduce((sum, tokens) => sum + tokens, 0);

  while (currentTokens > budgetTokens) {
    // Find the FIRST (oldest) droppable exchange outside the protected tail.
    const tailStart = Math.max(0, result.length - PROTECTED_TAIL_MESSAGES);
    let exchangeStart = -1;
    for (let i = 0; i < tailStart; i++) {
      if (isToolCallAssistantMessage(result[i])) {
        exchangeStart = i;
        break;
      }
    }
    if (exchangeStart === -1) {
      break; // nothing left the guard is allowed to drop
    }
    let exchangeEnd = exchangeStart + 1;
    while (exchangeEnd < result.length && result[exchangeEnd].role === "tool") {
      exchangeEnd++;
    }
    if (exchangeEnd > tailStart) {
      // The oldest remaining exchange bleeds into the protected tail. Because
      // the scan is oldest-first, every exchange after this one STARTS inside
      // the tail (this one's result chain reaches it), and every exchange
      // before it was already dropped by earlier iterations — so there is
      // nothing else the guard may remove. Stop.
      break;
    }
    const dropped = estimates
      .slice(exchangeStart, exchangeEnd)
      .reduce((sum, tokens) => sum + tokens, 0);
    result.splice(exchangeStart, exchangeEnd - exchangeStart);
    estimates.splice(exchangeStart, exchangeEnd - exchangeStart);
    currentTokens -= dropped;
    droppedExchanges++;
  }

  if (droppedExchanges > 0) {
    // Insert one elision note where history was removed: after the leading
    // non-exchange messages (typically the first user/task message), but
    // never after the protected tail — when every droppable exchange was
    // removed, an uncapped scan would append the note at the END, where the
    // "history was removed" cue lands after the content it refers to.
    let noteIndex = 0;
    while (
      noteIndex < result.length &&
      !isToolCallAssistantMessage(result[noteIndex])
    ) {
      noteIndex++;
    }
    const tailBoundary = Math.max(0, result.length - PROTECTED_TAIL_MESSAGES);
    result.splice(Math.min(noteIndex, tailBoundary), 0, {
      role: "user",
      content: [
        {
          type: "text",
          text: `[context truncated: ${droppedExchanges} earlier tool exchange(s) were removed to fit the model's context window. Continue from the remaining context.]`,
        },
      ],
    } as ModelMessage);
  }

  return { messages: result, droppedExchanges };
}

/**
 * Create a per-step budget guard. Returns a function that, given the step's
 * messages, returns a compacted replacement array when the projected request
 * exceeds the threshold — or `undefined` when no change is needed.
 */
export function createStepBudgetGuard(config: StepBudgetGuardConfig) {
  const {
    provider,
    model,
    maxTokens,
    fixedOverheadTokens = 0,
    getFixedOverheadTokens,
    thresholdRatio = DEFAULT_CONTEXT_GUARD_RATIO,
  } = config;

  const availableInput = getAvailableInputTokens(provider, model, maxTokens);
  const thresholdTokens = Math.floor(availableInput * thresholdRatio);

  return function guardStepMessages(
    messages: readonly ModelMessage[],
  ): ModelMessage[] | undefined {
    // Resolve overhead per invocation: the tool set can GROW mid-loop
    // (search_tools hydration adds discovered tools between steps), so a
    // once-captured value would undercount later steps.
    const overheadTokens = getFixedOverheadTokens?.() ?? fixedOverheadTokens;
    const estimate =
      overheadTokens + estimateStepMessagesTokens(messages, provider);
    // Logger Guard: per-step diagnostics for debugging why a long run does
    // (or does not) trigger compaction — gated so nothing is serialized when
    // debug logging is off.
    if (logger.shouldLog("debug")) {
      logger.debug("[StepBudgetGuard] step estimate", {
        provider,
        model,
        messageCount: messages.length,
        estimatedTokens: estimate,
        thresholdTokens,
        willCompact: estimate > thresholdTokens,
      });
    }
    if (estimate <= thresholdTokens) {
      return undefined;
    }

    // Stage 1: shrink old tool outputs to previews.
    const stage1 = truncateOldToolOutputs([...messages]);
    let compacted = stage1.messages;
    let newEstimate =
      overheadTokens + estimateStepMessagesTokens(compacted, provider);

    // Stage 2: drop oldest complete tool exchanges if still over.
    let droppedExchanges = 0;
    if (newEstimate > thresholdTokens) {
      const stage2 = dropOldestToolExchanges(
        compacted,
        thresholdTokens,
        overheadTokens,
        provider,
      );
      compacted = stage2.messages;
      droppedExchanges = stage2.droppedExchanges;
      newEstimate =
        overheadTokens + estimateStepMessagesTokens(compacted, provider);
    }

    if (stage1.truncated === 0 && droppedExchanges === 0) {
      return undefined; // nothing actionable (already all-protected)
    }

    logger.info("[StepBudgetGuard] Compacted agent-loop step messages", {
      provider,
      model,
      estimatedTokens: estimate,
      thresholdTokens,
      afterTokens: newEstimate,
      toolOutputsTruncated: stage1.truncated,
      exchangesDropped: droppedExchanges,
    });
    return compacted;
  };
}
