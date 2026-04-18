/**
 * toolEndEmitter — shared helper for emitting `tool:end` events from
 * AI-SDK `onStepFinish` callbacks.
 *
 * Pipeline B (metrics aggregator) listens for `tool:end` on the NeuroLink
 * EventEmitter. When tools are executed by the AI SDK internally (via
 * `generateText` / `streamText`) the SDK calls `onStepFinish` with the
 * completed tool results. Without this helper those results are silently
 * stored but never surfaced as `tool:end` events, leaving Pipeline B with
 * zero tool spans for AI-SDK-driven tool calls (gaps G5 and S2).
 *
 * @module utils/toolEndEmitter
 */

import { createToolEventPayload } from "../core/toolEvents.js";
import type {
  NeuroLinkEvents,
  StepToolResult,
  TypedEventEmitter,
} from "../types/index.js";

/**
 * Emit a `tool:end` event for every completed tool result in an
 * `onStepFinish` callback.
 *
 * @param emitter - The NeuroLink event emitter (obtained via
 *   `neurolink.getEventEmitter()`).  When `undefined` the function is a
 *   no-op so callers need not guard every call site.
 * @param toolResults - The `toolResults` array from `onStepFinish`.  When
 *   `undefined` or empty the function is a no-op.
 */
export function emitToolEndFromStepFinish(
  emitter: TypedEventEmitter<NeuroLinkEvents> | undefined,
  toolResults: StepToolResult[] | undefined,
): void {
  if (!emitter || !toolResults || toolResults.length === 0) {
    return;
  }

  for (const tr of toolResults) {
    const output = tr.output ?? tr.result;
    const isError =
      !!tr.error ||
      (output !== null &&
        output !== undefined &&
        typeof output === "object" &&
        "isError" in output &&
        (output as Record<string, unknown>).isError === true);

    let errorMessage: string | undefined;
    if (isError) {
      if (tr.error) {
        errorMessage = tr.error;
      } else if (output && typeof output === "object") {
        const content = (output as Record<string, unknown>).content;
        if (Array.isArray(content)) {
          const texts = (content as Array<{ type?: string; text?: string }>)
            .filter((c) => c.type === "text" && c.text)
            .map((c) => c.text as string);
          errorMessage =
            texts.length > 0 ? texts.join(" ") : "Tool returned isError: true";
        } else {
          errorMessage = "Tool returned isError: true";
        }
      }
    }

    emitter.emit(
      "tool:end",
      createToolEventPayload(tr.toolName, {
        responseTime: 0,
        success: !isError,
        timestamp: Date.now(),
        result: output,
        error: errorMessage,
      }),
    );
  }
}
