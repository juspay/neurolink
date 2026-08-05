/**
 * In-turn context guard for the OpenAI-compatible chat-completions loop.
 *
 * `openaiChatCompletionsBase` runs its own hand-written tool loop
 * (`for step < maxSteps` → `streamOneStep` → `executeToolBatch`) and appends an
 * assistant tool-call message plus one `role: "tool"` message per result on
 * every step. Nothing bounded that growth: the loop had no context guard of any
 * kind, so a long agentic run walked into a provider "context length exceeded"
 * after dozens of tool calls and lost every completed step.
 *
 * This is the widest-reach gap in the codebase — the chat-completions base
 * backs LiteLLM, DeepSeek, OpenRouter, NVIDIA NIM, LM Studio, llama.cpp and
 * every `openai-compatible` provider.
 *
 * The reclaim POLICY lives in `loopGuardCore` and is shared with the other
 * provider loops. This module owns only the shape mapping: OpenAI-compatible
 * messages in, neutral entries out, plan applied back.
 */

import type {
  LoopGuardEntry,
  OpenAICompatChatMessage,
} from "../types/index.js";
import {
  estimateTokens,
  TOKENS_PER_MESSAGE,
} from "../utils/tokenEstimation.js";
import { generateToolOutputPreview } from "./toolOutputLimits.js";
import { planLoopGuardReclaim } from "./loopGuardCore.js";
import { logger } from "../utils/logger.js";

/** Preview budget for an old tool output. Matches the AI-SDK guard. */
const OLD_TOOL_OUTPUT_PREVIEW_BYTES = 2_048;
const OLD_TOOL_OUTPUT_PREVIEW_LINES = 60;

/** Marker left where dropped history used to be. */
const ELISION_NOTE =
  "[Earlier tool exchanges were removed to fit the context window.]";

/** Serialize message content to text for estimation. Never throws. */
function contentToText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (content === null || content === undefined) {
    return "";
  }
  try {
    return JSON.stringify(content) ?? "";
  } catch {
    // A payload past V8's string cap is enormous by definition; charge it a
    // large fixed size rather than aborting the estimate and the turn.
    return "x".repeat(200_000);
  }
}

/** Cost of one message, including per-message framing. */
function messageTokens(
  message: OpenAICompatChatMessage,
  provider?: string,
): number {
  let text = contentToText(message.content);
  if (message.role === "assistant" && message.tool_calls) {
    // Tool-call arguments are a first-class cost here: the model's arguments
    // for a Write/Edit-style tool dwarf the message body.
    text += contentToText(message.tool_calls);
  }
  return estimateTokens(text, provider) + TOKENS_PER_MESSAGE;
}

/** Preview cost of a `role: "tool"` message, or undefined when it cannot shrink. */
function previewTokensFor(
  message: OpenAICompatChatMessage,
  provider?: string,
): number | undefined {
  if (message.role !== "tool") {
    return undefined;
  }
  const text = contentToText(message.content);
  if (text.length <= OLD_TOOL_OUTPUT_PREVIEW_BYTES) {
    return undefined;
  }
  const { preview } = generateToolOutputPreview(text, {
    maxBytes: OLD_TOOL_OUTPUT_PREVIEW_BYTES,
    maxLines: OLD_TOOL_OUTPUT_PREVIEW_LINES,
  });
  return estimateTokens(preview, provider) + TOKENS_PER_MESSAGE;
}

/** Map the loop's history onto the neutral view the policy operates on. */
function toEntries(
  conversation: readonly OpenAICompatChatMessage[],
  provider?: string,
): LoopGuardEntry[] {
  return conversation.map((message) => {
    const tokens = messageTokens(message, provider);
    if (message.role === "tool") {
      const previewTokens = previewTokensFor(message, provider);
      return {
        kind: "toolResult" as const,
        tokens,
        ...(previewTokens !== undefined ? { previewTokens } : {}),
      };
    }
    if (message.role === "assistant" && message.tool_calls?.length) {
      return { kind: "toolCall" as const, tokens };
    }
    return { kind: "other" as const, tokens };
  });
}

/**
 * Reclaim context budget from a chat-completions loop's conversation.
 *
 * Returns a NEW array when it acted, or `undefined` when the loop fits and the
 * history must be left byte-identical — any rewrite invalidates the provider's
 * cached prompt prefix, so "no change" has to mean no change.
 *
 * @param observedPromptTokens the provider's reported prompt token count for
 * the previous step, used to calibrate the char-based estimate for free.
 */
export function guardOpenAICompatConversation(args: {
  conversation: OpenAICompatChatMessage[];
  availableInputTokens: number;
  fixedOverheadTokens: number;
  provider?: string;
  observedPromptTokens?: number;
}): OpenAICompatChatMessage[] | undefined {
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

  const truncateSet = new Set(plan.truncate);
  const dropSet = new Set(plan.drop);

  const result: OpenAICompatChatMessage[] = [];
  for (let i = 0; i < conversation.length; i++) {
    if (dropSet.has(i)) {
      continue;
    }
    const message = conversation[i];
    if (truncateSet.has(i) && message.role === "tool") {
      const { preview } = generateToolOutputPreview(
        contentToText(message.content),
        {
          maxBytes: OLD_TOOL_OUTPUT_PREVIEW_BYTES,
          maxLines: OLD_TOOL_OUTPUT_PREVIEW_LINES,
        },
      );
      result.push({ ...message, content: preview });
      continue;
    }
    result.push(message);
  }

  if (dropSet.size > 0) {
    // Place the note where the removed history was, i.e. before the first
    // surviving tool message — never at the end, where a "history was removed"
    // cue would land after the content it refers to.
    let noteIndex = result.findIndex(
      (m) => m.role === "tool" || (m.role === "assistant" && m.tool_calls),
    );
    if (noteIndex < 0) {
      noteIndex = Math.min(1, result.length);
    }
    result.splice(noteIndex, 0, { role: "user", content: ELISION_NOTE });
  }

  logger.info("[OpenAICompatLoopGuard] Reclaimed agent-loop context", {
    provider,
    messagesBefore: conversation.length,
    messagesAfter: result.length,
    toolOutputsTruncated: plan.truncate.length,
    messagesDropped: plan.drop.length,
    projectedTokens: plan.projectedTokens,
    calibration,
  });

  return result;
}
