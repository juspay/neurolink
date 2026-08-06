/**
 * In-turn context guard for Gemini-shaped agent loops (native Vertex + AI
 * Studio + Gemini 3).
 *
 * These loops already had `createContextGuard`, but it is **stop-only**: once
 * the projected prompt crosses the threshold it breaks the loop and synthesizes
 * an answer from whatever it has. That avoids a provider rejection, but it also
 * ends the turn early — the model stops doing work it was mid-way through.
 *
 * This module brings them to parity with the other loops: reclaim budget and
 * CONTINUE, falling back to the existing stop only when reclaiming cannot get
 * back under the line. The reclaim policy is shared with every other provider
 * via `loopGuardCore`; this module owns only the Gemini shape mapping.
 *
 * Gemini history is `{ role, parts[] }`, where a part is a `functionCall`
 * (tool invocation) or `functionResponse` (its result). One model turn can
 * carry several `functionCall` parts and the following user turn carries the
 * matching `functionResponse` parts, so the CONTENT is the batch unit —
 * dropping a call turn together with its response turn can never orphan a part,
 * which Gemini rejects.
 */

import type {
  GeminiGuardContent,
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
export const GEMINI_ELISION_NOTE =
  "[Earlier tool exchanges were removed to fit the context window.]";

/** Serialize any value for estimation. Never throws. */
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

function hasPart(content: GeminiGuardContent, key: string): boolean {
  return (
    Array.isArray(content.parts) &&
    content.parts.some(
      (part) => part && typeof part === "object" && key in part,
    )
  );
}

/** True when this content carries tool results worth previewing. */
export function isGeminiToolResponseContent(
  content: GeminiGuardContent,
): boolean {
  return hasPart(content, "functionResponse");
}

/** Head/tail preview for an oversized tool response payload. */
export function previewGeminiToolResponseText(text: string): string {
  const { preview } = generateToolOutputPreview(text, {
    maxBytes: OLD_TOOL_OUTPUT_PREVIEW_BYTES,
    maxLines: OLD_TOOL_OUTPUT_PREVIEW_LINES,
  });
  return preview;
}

function contentTokens(content: GeminiGuardContent, provider?: string): number {
  return estimateTokens(toText(content.parts), provider) + TOKENS_PER_MESSAGE;
}

/** Map Gemini history onto the neutral view the shared policy operates on. */
function toEntries(
  contents: readonly GeminiGuardContent[],
  provider?: string,
): LoopGuardEntry[] {
  return contents.map((content) => {
    const tokens = contentTokens(content, provider);
    if (isGeminiToolResponseContent(content)) {
      // Only advertise a preview when it actually saves something: an
      // already-small response must fall through to stage 2 rather than look
      // shrinkable and stall the reclaim.
      const previewed = toText(content.parts);
      const previewTokens =
        previewed.length > OLD_TOOL_OUTPUT_PREVIEW_BYTES
          ? estimateTokens(previewGeminiToolResponseText(previewed), provider) +
            TOKENS_PER_MESSAGE
          : tokens;
      return {
        kind: "toolResult" as const,
        tokens,
        ...(previewTokens < tokens ? { previewTokens } : {}),
      };
    }
    if (hasPart(content, "functionCall")) {
      return { kind: "toolCall" as const, tokens };
    }
    return { kind: "other" as const, tokens };
  });
}

/**
 * Decide what to reclaim from a Gemini agent loop.
 *
 * Returns `undefined` when the history still fits, in which case the caller
 * must leave it byte-identical — any rewrite invalidates the provider's cached
 * prefix, so "no change" has to mean no change.
 *
 * `observedPromptTokens` must be a count for the payload ABOUT TO BE SENT —
 * every Gemini-shaped loop plans only when its `createContextGuard` trips, and
 * that guard's `projectedNextPromptTokens` is exactly that: the provider's real
 * count for the last request plus the growth measured since. Dividing it by
 * this module's estimate of the current history therefore compares two views of
 * one payload, which is what makes the correction meaningful. A count for an
 * EARLIER request must not be passed here: the loop has appended a model turn
 * and its tool turn since, so the denominator would always be the larger of the
 * two, the ratio would read below 1 and the `Math.max(1, …)` floor would pin
 * calibration at 1 — silently disabling the correction. `planAnthropicLoopReclaim`
 * carries `previousSentEstimate` for callers in that other position.
 */
export function planGeminiLoopReclaim(args: {
  contents: readonly GeminiGuardContent[];
  availableInputTokens: number;
  fixedOverheadTokens?: number;
  provider?: string;
  observedPromptTokens?: number;
}): LoopGuardPlan | undefined {
  const {
    contents,
    availableInputTokens,
    fixedOverheadTokens = 0,
    provider,
    observedPromptTokens,
  } = args;

  const entries = toEntries(contents, provider);

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

  logger.info("[GeminiLoopGuard] Reclaiming agent-loop context", {
    provider,
    contents: contents.length,
    toolResponsesTruncated: plan.truncate.length,
    contentsDropped: plan.drop.length,
    projectedTokens: plan.projectedTokens,
    calibration,
  });

  return plan;
}
