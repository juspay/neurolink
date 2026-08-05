/**
 * In-turn context guard for Anthropic-shaped agent loops.
 *
 * The direct Anthropic loop (`providers/anthropic/client.ts`) grows a
 * `conversation` array on every step: an assistant message carrying `tool_use`
 * blocks, then a user message carrying the matching `tool_result` blocks. It
 * had no in-turn guard, so a long agentic run overflowed the window mid-loop
 * and lost every completed step.
 *
 * Granularity differs from the OpenAI-compatible shape: there, each tool result
 * is its own message; here, ONE user message carries every `tool_result` for a
 * step. That makes the message the natural batch unit — dropping an assistant
 * `tool_use` message together with its following `tool_result` message can
 * never orphan a block, which Anthropic rejects outright.
 *
 * The reclaim POLICY lives in `loopGuardCore` and is shared with the other
 * provider loops. This module owns only the shape mapping.
 */

import type {
  AnthropicGuardBlock,
  AnthropicGuardMessage,
  LoopGuardEntry,
  LoopGuardPlan,
} from "../types/index.js";
import {
  estimateTokens,
  TOKENS_PER_MESSAGE,
} from "../utils/tokenEstimation.js";
import { generateToolOutputPreview } from "./toolOutputLimits.js";
import { planLoopGuardReclaim } from "./loopGuardCore.js";
import { logger } from "../utils/logger.js";

/** Preview budget for an old tool output. Matches the other loop guards. */
const OLD_TOOL_OUTPUT_PREVIEW_BYTES = 2_048;
const OLD_TOOL_OUTPUT_PREVIEW_LINES = 60;

/** Marker left where dropped history used to be. */
export const ANTHROPIC_ELISION_NOTE =
  "[Earlier tool exchanges were removed to fit the context window.]";

/** Serialize any value to text for estimation. Never throws. */
function toText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return "";
  }
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    // Past V8's string cap: enormous by definition, so charge a large fixed
    // size rather than aborting the estimate and with it the turn.
    return "x".repeat(200_000);
  }
}

function blocksOf(message: AnthropicGuardMessage): AnthropicGuardBlock[] {
  return Array.isArray(message.content) ? message.content : [];
}

function hasBlockType(message: AnthropicGuardMessage, type: string): boolean {
  return blocksOf(message).some((block) => block.type === type);
}

/** Cost of one message including per-message framing. */
function messageTokens(
  message: AnthropicGuardMessage,
  provider?: string,
): number {
  return estimateTokens(toText(message.content), provider) + TOKENS_PER_MESSAGE;
}

/**
 * Rewrite a `tool_result` message so every block's payload is a head/tail
 * preview. `cache_control` and every other block field are preserved — only
 * the payload shrinks.
 */
function previewToolResultMessage(
  message: AnthropicGuardMessage,
): AnthropicGuardMessage {
  if (!Array.isArray(message.content)) {
    return message;
  }
  const content = message.content.map((block) => {
    if (block.type !== "tool_result") {
      return block;
    }
    const text = toText(block.content);
    if (text.length <= OLD_TOOL_OUTPUT_PREVIEW_BYTES) {
      return block;
    }
    const { preview } = generateToolOutputPreview(text, {
      maxBytes: OLD_TOOL_OUTPUT_PREVIEW_BYTES,
      maxLines: OLD_TOOL_OUTPUT_PREVIEW_LINES,
    });
    return { ...block, content: preview };
  });
  return { ...message, content };
}

/** Map the loop's history onto the neutral view the policy operates on. */
function toEntries(
  conversation: readonly AnthropicGuardMessage[],
  provider?: string,
): LoopGuardEntry[] {
  return conversation.map((message) => {
    const tokens = messageTokens(message, provider);
    if (hasBlockType(message, "tool_result")) {
      const previewed = previewToolResultMessage(message);
      const previewTokens = messageTokens(previewed, provider);
      return {
        kind: "toolResult" as const,
        tokens,
        // Only advertise a preview when it actually saves something — an
        // already-small result must fall through to stage 2, not look
        // shrinkable and stall the reclaim.
        ...(previewTokens < tokens ? { previewTokens } : {}),
      };
    }
    if (hasBlockType(message, "tool_use")) {
      return { kind: "toolCall" as const, tokens };
    }
    return { kind: "other" as const, tokens };
  });
}

/**
 * Text-level preview used for an oversized `tool_result` payload. Exposed so
 * the caller can apply it to its OWN block type — this module never rebuilds
 * the caller's messages, which keeps it free of generic-spread assignability
 * problems and of the double type assertions Critical Rule 14 forbids.
 */
export function previewAnthropicToolResultText(text: string): string {
  const { preview } = generateToolOutputPreview(text, {
    maxBytes: OLD_TOOL_OUTPUT_PREVIEW_BYTES,
    maxLines: OLD_TOOL_OUTPUT_PREVIEW_LINES,
  });
  return preview;
}

/** True when this message carries `tool_result` blocks worth previewing. */
export function isAnthropicToolResultMessage(
  message: AnthropicGuardMessage,
): boolean {
  return hasBlockType(message, "tool_result");
}

/**
 * Decide what to reclaim from an Anthropic-shaped agent loop.
 *
 * Returns `undefined` when the loop still fits — the caller must then leave its
 * history byte-identical, because any rewrite invalidates the rolling
 * `cache_control` prefix this path depends on.
 */
export function planAnthropicLoopReclaim(args: {
  conversation: readonly AnthropicGuardMessage[];
  availableInputTokens: number;
  fixedOverheadTokens: number;
  provider?: string;
  observedPromptTokens?: number;
}): LoopGuardPlan | undefined {
  const {
    conversation,
    availableInputTokens,
    fixedOverheadTokens,
    provider,
    observedPromptTokens,
  } = args;

  const entries = toEntries(conversation, provider);

  let calibration = 1;
  if (observedPromptTokens && observedPromptTokens > 0) {
    const rawEstimate =
      fixedOverheadTokens + entries.reduce((sum, e) => sum + e.tokens, 0);
    if (rawEstimate > 0) {
      // Clamped: real tokenizers run up to ~1.3x the char estimate on dense
      // code, and an unbounded ratio would compact the loop into uselessness.
      calibration = Math.min(
        3,
        Math.max(1, observedPromptTokens / rawEstimate),
      );
    }
  }

  const plan = planLoopGuardReclaim(entries, {
    availableInputTokens,
    fixedOverheadTokens,
    calibration,
  });

  if (!plan.fire) {
    return undefined;
  }

  logger.info("[AnthropicLoopGuard] Reclaiming agent-loop context", {
    provider,
    messages: conversation.length,
    toolResultsTruncated: plan.truncate.length,
    messagesDropped: plan.drop.length,
    projectedTokens: plan.projectedTokens,
    calibration,
  });

  return plan;
}
