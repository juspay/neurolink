import { trace, context as otelContext } from "@opentelemetry/api";
import type {
  StreamNoOutputSentinel,
  StreamNoOutputSentinelResultLike,
} from "../types/index.js";
import { NoOutputGeneratedError } from "./generationErrors.js";

export async function buildNoOutputSentinel(
  error: unknown,
  result?: StreamNoOutputSentinelResultLike,
  /**
   * Reviewer follow-up: AI SDK v6 wraps the AI SDK's
   * `NoOutputGeneratedError` without preserving the underlying provider
   * error in `error.cause`, and rejects `result.finishReason` /
   * `result.totalUsage` with the wrapped error too. To differentiate
   * content-filter / stop-sequence / provider-crash, providers can
   * capture the upstream error (e.g. via streamText's `onError`
   * callback) and pass it here. When provided, it takes precedence
   * over the AI SDK error for `providerError` and `modelResponseRaw`.
   */
  underlyingError?: unknown,
): Promise<StreamNoOutputSentinel> {
  let finishReason: unknown = "error";
  // Reviewer follow-up: include both AI SDK v4 (promptTokens /
  // completionTokens) and v6 (inputTokens / outputTokens) keys in the
  // default usage so downstream consumers reading either shape see
  // correct zeros instead of `undefined`. Also keep `totalTokens` for
  // back-compat.
  let usage: unknown = {
    promptTokens: 0,
    completionTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  };
  if (result) {
    try {
      if (result.finishReason !== undefined) {
        finishReason = await Promise.resolve(result.finishReason);
      }
    } catch {
      // Expected: AI SDK rejects with the same NoOutputGeneratedError.
    }
    try {
      if (result.totalUsage !== undefined) {
        usage = await Promise.resolve(result.totalUsage);
      }
    } catch {
      // Expected: AI SDK rejects with the same NoOutputGeneratedError.
    }
  }
  // Prefer the provider-captured underlying error for `providerError` /
  // `modelResponseRaw` since the AI SDK NoOutputGeneratedError doesn't
  // carry the actual upstream cause. Fall back to the AI SDK error.
  const messageSource =
    underlyingError instanceof Error
      ? underlyingError
      : underlyingError !== undefined
        ? new Error(String(underlyingError))
        : error instanceof Error
          ? error
          : new Error(String(error));
  const providerError = messageSource.message;
  const causeFromSource = (messageSource as { cause?: unknown }).cause;
  // Reviewer follow-up: guard the `error.cause` access so it doesn't
  // throw a TypeError when `error` is null/undefined (only valid object
  // values can be indexed safely).
  const causeFromError =
    error !== null && typeof error === "object"
      ? (error as { cause?: unknown }).cause
      : undefined;
  const cause =
    causeFromSource !== undefined ? causeFromSource : causeFromError;
  // Reviewer follow-up: always populate `modelResponseRaw` so downstream
  // telemetry consumers can rely on the field being a string. When neither
  // an `underlyingError` nor a `cause` is available, fall back to error
  // name + message so we still carry *something* about what the provider
  // returned.
  const modelResponseRaw =
    cause !== undefined
      ? String(cause).slice(0, 500)
      : `${messageSource.name}: ${messageSource.message}`.slice(0, 500);
  return {
    content: "",
    metadata: {
      noOutput: true,
      errorType: "NoOutputGeneratedError",
      finishReason,
      usage,
      providerError,
      modelResponseRaw,
    },
  };
}

/**
 * Curator P3-6 (round-2): the AI SDK v6 path that sets
 * `NoOutputGeneratedError` does NOT throw it from `result.textStream`
 * iteration — it sets the error as a *promise rejection* on
 * `result.finishReason` / `result.totalUsage` / `result.steps` (see
 * `ai/src/generate-text/stream-text.ts` ~L1078). Providers that only
 * catch errors thrown from `for await (chunk of result.textStream)` will
 * miss the production trigger entirely: the stream completes silently
 * with 0 chunks and the rejection bubbles as an unhandled rejection.
 *
 * This helper surfaces the rejection by awaiting `result.finishReason`
 * after the stream completes. Providers must call this AFTER iterating
 * the textStream when 0 chunks were yielded — the returned sentinel
 * (if non-null) carries the enriched metadata Curator's report needed.
 */
export async function detectPostStreamNoOutput(
  result: StreamNoOutputSentinelResultLike,
  /**
   * Optional provider-captured underlying error (e.g. from streamText's
   * `onError` callback). When provided, the resulting sentinel will carry
   * the real provider error in `providerError` / `modelResponseRaw`
   * instead of the AI SDK's generic "No output generated" message.
   */
  underlyingError?: unknown,
): Promise<{ sentinel: StreamNoOutputSentinel; error: Error } | null> {
  if (result.finishReason === undefined) {
    return null;
  }
  try {
    await Promise.resolve(result.finishReason);
    // No rejection — the stream completed normally with a valid finish
    // reason; this is the empty-but-not-erroring case (e.g. AI SDK
    // recorded a step with no text), not the no-output failure.
    return null;
  } catch (err) {
    if (NoOutputGeneratedError.isInstance(err)) {
      return {
        sentinel: await buildNoOutputSentinel(err, result, underlyingError),
        error: err as Error,
      };
    }
    // Other rejection types (network errors, parse errors) are not the
    // bug-confirmed scenario — let the caller's existing error handling
    // surface them.
    return null;
  }
}

/**
 * Reviewer follow-up: every provider's post-stream NoOutput detect must
 * stamp the active OTel span so Pipeline B (`ContextEnricher.onEnd()` →
 * `applyNonErrorLangfuseLevel`) surfaces a WARNING-level Langfuse
 * observation with the enriched status message. Without this, only
 * `StreamHandler`-based providers produced the rich telemetry; the
 * provider-specific paths (openAI, openaiCompatible, litellm,
 * huggingFace, openRouter, anthropicBaseProvider) yielded the sentinel
 * to direct stream consumers but Pipeline B saw nothing.
 *
 * Stamps three attributes:
 *   - `neurolink.no_output = true` (Pipeline B trigger)
 *   - `langfuse.status_message` (enriched, with finishReason + tokens)
 *   - `neurolink.no_output.finish_reason` (raw finish reason)
 *
 * Safe to call when tracing isn't initialized — silently no-ops.
 */
export function stampNoOutputSpan(sentinel: StreamNoOutputSentinel): void {
  try {
    const activeSpan = trace.getSpan(otelContext.active());
    if (!activeSpan) {
      return;
    }
    activeSpan.setAttribute("neurolink.no_output", true);
    activeSpan.setAttribute(
      "langfuse.status_message",
      buildNoOutputStatusMessage(
        sentinel.metadata.finishReason,
        sentinel.metadata.usage,
      ),
    );
    activeSpan.setAttribute(
      "neurolink.no_output.finish_reason",
      String(sentinel.metadata.finishReason),
    );
  } catch {
    // Tracing not initialized — ignore.
  }
}

/**
 * Build the OTel `langfuse.status_message` summary string for a no-output
 * stream. Used by `StreamHandler.createTextStream` and any future provider
 * that wants to stamp the active span with the same enriched message.
 *
 * Reviewer follow-up: AI SDK v4 used `promptTokens` / `completionTokens`,
 * v6 uses `inputTokens` / `outputTokens`. Read both shapes so the message
 * is correct whichever version surfaced partial usage data.
 */
export function buildNoOutputStatusMessage(
  finishReason: unknown,
  usage: unknown,
): string {
  const u = usage as {
    promptTokens?: number;
    completionTokens?: number;
    inputTokens?: number;
    outputTokens?: number;
  };
  const inputTokens = u?.inputTokens ?? u?.promptTokens ?? 0;
  const outputTokens = u?.outputTokens ?? u?.completionTokens ?? 0;
  return (
    `Stream produced no output (NoOutputGeneratedError): ` +
    `finishReason=${String(finishReason)}, ` +
    `inputTokens=${inputTokens}, ` +
    `outputTokens=${outputTokens}`
  );
}
