/**
 * Codex (OpenAI Responses) SSE usage tap.
 *
 * The Codex proxy engine relays `upstream.body` to the client untouched and
 * logs before a single byte is read, so no Codex request has ever carried token
 * counts. This module adds a pass-through tap that scrapes `usage` out of the
 * stream without holding back or altering any bytes.
 *
 * ## Safety contract
 *
 * This sits in the hot path of a live proxy, so it is built to be incapable of
 * breaking a stream:
 *
 * - every chunk is enqueued **before** it is inspected;
 * - all parsing runs inside try/catch, and a throw is swallowed;
 * - a stream whose shape is unrecognised resolves `usage` to `null`, which is
 *   exactly today's behaviour (a log with no token fields).
 *
 * The worst case is therefore "no tokens recorded", never a truncated or
 * corrupted response.
 *
 * ## Wire shape
 *
 * **Verified against real traffic.** Captured from a live `codex exec` run
 * through the proxy on 2026-08-21; the trimmed sample is at
 * `test/fixtures/codex-response-usage.sse` and is asserted against in the
 * codex suite. The real shape is
 *
 *   event: response.completed
 *   data: {"type":"response.completed","response":{"usage":{
 *     "input_tokens":N,"output_tokens":M,
 *     "input_tokens_details":{"cached_tokens":K,"cache_write_tokens":W},
 *     "output_tokens_details":{"reasoning_tokens":R}}}}
 *
 * Note that `response.created` arrives first carrying `usage: null`, which is
 * why the scanner keeps the last non-null result rather than the first.
 *
 * It also accepts a `usage` object at the top level of any event and the
 * `prompt_tokens`/`completion_tokens` spellings. A `null` result means "not
 * observed", never "zero tokens".
 */

import { appendFileSync } from "node:fs";
import { extractSSEEvents } from "./sseInterceptor.js";
import { sanitizeForLog } from "../utils/logSanitize.js";

import type {
  CodexStreamUsage,
  CodexStreamEvidence,
  ProxyCancellableTransformer,
} from "../types/index.js";

const nonNegativeInt = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;

function usefulOutputItem(item: unknown): boolean {
  if (!item || typeof item !== "object") {
    return false;
  }
  if ("type" in item) {
    if (item.type === "function_call") {
      return (
        "arguments" in item &&
        typeof item.arguments === "string" &&
        item.arguments.trim().length > 0
      );
    }
    if (item.type === "custom_tool_call") {
      return (
        "input" in item &&
        typeof item.input === "string" &&
        item.input.trim().length > 0
      );
    }
    if (item.type === "output_text") {
      return (
        "text" in item &&
        typeof item.text === "string" &&
        item.text.trim().length > 0
      );
    }
    if (item.type === "refusal") {
      return (
        "refusal" in item &&
        typeof item.refusal === "string" &&
        item.refusal.trim().length > 0
      );
    }
  }
  return (
    "content" in item &&
    Array.isArray(item.content) &&
    item.content.some(usefulOutputItem)
  );
}

/**
 * Pull usage out of one parsed SSE `data:` payload.
 *
 * Returns null when the payload carries no recognisable usage object, so the
 * caller can keep the last non-null result rather than overwriting it with a
 * later event that happens not to carry usage.
 */
export function extractCodexUsage(payload: unknown): CodexStreamUsage | null {
  if (payload === null || typeof payload !== "object") {
    return null;
  }
  const root = payload as Record<string, unknown>;
  const response = root.response as Record<string, unknown> | undefined;

  const usage = (
    response && typeof response === "object" && response.usage
      ? response.usage
      : root.usage
  ) as Record<string, unknown> | undefined;

  if (!usage || typeof usage !== "object") {
    return null;
  }

  const input = usage.input_tokens ?? usage.prompt_tokens;
  const output = usage.output_tokens ?? usage.completion_tokens;
  if (input === undefined && output === undefined) {
    return null;
  }

  const inputDetails = usage.input_tokens_details as
    | Record<string, unknown>
    | undefined;
  const outputDetails = usage.output_tokens_details as
    | Record<string, unknown>
    | undefined;

  return {
    inputTokens: nonNegativeInt(input),
    outputTokens: nonNegativeInt(output),
    cacheReadTokens: nonNegativeInt(inputDetails?.cached_tokens),
    cacheCreationTokens: nonNegativeInt(inputDetails?.cache_write_tokens),
    reasoningTokens: nonNegativeInt(outputDetails?.reasoning_tokens),
  };
}

/**
 * Scan a slice of SSE text for usage, returning the last one found.
 *
 * Exported for tests: it is the whole parsing decision, and driving it through
 * a real Codex stream would need a live ChatGPT subscription.
 */
export function scanCodexSSEForUsage(text: string): CodexStreamUsage | null {
  let found: CodexStreamUsage | null = null;
  for (const line of text.split("\n")) {
    if (!line.startsWith("data:")) {
      continue;
    }
    const raw = line.slice(5).trim();
    if (!raw || raw === "[DONE]") {
      continue;
    }
    try {
      const usage = extractCodexUsage(JSON.parse(raw));
      if (usage) {
        found = usage;
      }
    } catch {
      // Partial or non-JSON payload — the next chunk may complete it. Never
      // let a malformed line escape into the relay.
    }
  }
  return found;
}

/**
 * Maximum bytes written by the opt-in raw capture. One `response.completed`
 * event is a few hundred bytes; 256 KiB is generous and bounds a runaway file.
 */
const CAPTURE_LIMIT_BYTES = 256 * 1024;

/**
 * Opt-in raw capture of one Codex SSE stream, for confirming the `usage` wire
 * shape against real traffic.
 *
 * Off unless `NEUROLINK_PROXY_CODEX_CAPTURE` names a file. It is deliberately
 * env-gated and undocumented in the CLI: the captured bytes are the assistant's
 * actual response, so this is a debugging tool the operator turns on
 * deliberately, not something that runs by default. Capture stops at the first
 * completed stream and is capped.
 */
function createCaptureSink(): ((chunk: Uint8Array) => void) | null {
  const target = process.env.NEUROLINK_PROXY_CODEX_CAPTURE;
  if (!target || process.env.NEUROLINK_PROXY_LOG_SINK === "otel") {
    return null;
  }
  let written = 0;
  let started = false;
  return (chunk: Uint8Array) => {
    if (written >= CAPTURE_LIMIT_BYTES) {
      return;
    }
    try {
      // Append only the new bytes. Rewriting the accumulated buffer on every
      // chunk is quadratic in stream length and runs in a live relay's
      // transform(), so a long response would do hundreds of growing
      // synchronous writes.
      // Slice to the remaining capacity rather than writing the whole chunk.
      // The guard above only says the cap was not ALREADY reached, so a single
      // large chunk arriving at 255 KiB would otherwise land in full and the
      // file would end up far past its bound — the cap has to hold per write,
      // not per stream.
      const remaining = CAPTURE_LIMIT_BYTES - written;
      const slice =
        chunk.byteLength > remaining ? chunk.subarray(0, remaining) : chunk;
      appendFileSync(target, slice, { flag: started ? "a" : "w" });
      started = true;
      written += slice.byteLength;
    } catch {
      // Capture is best-effort telemetry; never let it touch the relay.
    }
  };
}

/**
 * A pass-through TransformStream that reports the usage seen on a Codex SSE
 * stream.
 *
 * `usage` resolves when the stream ends: to the last usage observed, or null if
 * none was. It never rejects.
 */
export function createCodexUsageTap(): {
  stream: TransformStream<Uint8Array, Uint8Array>;
  usage: Promise<CodexStreamUsage | null>;
  evidence: () => CodexStreamEvidence;
} {
  const evidence: CodexStreamEvidence = { completed: false, terminalBytes: 0 };
  let totalBytes = 0;
  const inspectEvidence = (
    events: Array<{ event: string; data: string }>,
  ): void => {
    for (const frame of events) {
      if (frame.data.trim() === "[DONE]") {
        continue;
      }
      try {
        const event = JSON.parse(frame.data) as Record<string, unknown>;
        if (!event || typeof event !== "object") {
          evidence.observationIncomplete = true;
          continue;
        }
        const seen = extractCodexUsage(event);
        if (seen) {
          latest = seen;
        }
        const type = event.type ?? frame.event;
        if (
          (type === "response.output_text.delta" ||
            type === "response.refusal.delta" ||
            type === "response.function_call_arguments.delta") &&
          typeof event.delta === "string" &&
          event.delta.trim().length > 0
        ) {
          if (evidence.firstUsefulOutputAt === undefined) {
            evidence.firstUsefulOutputAt = Date.now();
            evidence.firstUsefulOutputEvent = String(type);
          }
        }
        // Some clients/providers emit complete output items without deltas.
        // Reasoning/control events are not useful client output. Recognize
        // actual tool calls and text only, without inventing an earlier time.
        const usefulItem = usefulOutputItem(event.item);
        const completedResponse = event.response;
        const usefulCompletion =
          type === "response.completed" &&
          completedResponse &&
          typeof completedResponse === "object" &&
          "output" in completedResponse &&
          Array.isArray(completedResponse.output) &&
          completedResponse.output.some(usefulOutputItem);
        const usefulDone =
          (type === "response.output_text.done" &&
            typeof event.text === "string" &&
            event.text.trim().length > 0) ||
          (type === "response.refusal.done" &&
            typeof event.refusal === "string" &&
            event.refusal.trim().length > 0) ||
          (type === "response.function_call_arguments.done" &&
            typeof event.arguments === "string" &&
            event.arguments.trim().length > 0) ||
          (type === "response.custom_tool_call_input.done" &&
            typeof event.input === "string" &&
            event.input.trim().length > 0) ||
          ((type === "response.content_part.added" ||
            type === "response.content_part.done") &&
            usefulOutputItem(event.part));
        const usefulToolDelta =
          type === "response.custom_tool_call_input.delta" &&
          typeof event.delta === "string" &&
          event.delta.trim().length > 0;
        if (
          evidence.firstUsefulOutputAt === undefined &&
          (usefulDone ||
            usefulCompletion ||
            usefulToolDelta ||
            ((type === "response.output_item.added" ||
              type === "response.output_item.done") &&
              usefulItem))
        ) {
          evidence.firstUsefulOutputAt = Date.now();
          evidence.firstUsefulOutputEvent = String(type);
        }
        if (type === "response.completed") {
          evidence.completed = true;
          evidence.terminalBytes = totalBytes;
        } else if (
          type === "error" ||
          type === "response.failed" ||
          type === "response.incomplete"
        ) {
          evidence.errorType = "stream_error";
          const response = event.response;
          const details =
            response && typeof response === "object"
              ? (response as Record<string, unknown>)
              : event;
          const rawError = details.error;
          const error =
            rawError && typeof rawError === "object"
              ? (rawError as Record<string, unknown>)
              : details;
          const incomplete = details.incomplete_details;
          const reason =
            incomplete &&
            typeof incomplete === "object" &&
            "reason" in incomplete
              ? incomplete.reason
              : undefined;
          evidence.errorCode =
            typeof error.code === "string"
              ? sanitizeForLog(error.code).slice(0, 200)
              : typeof reason === "string"
                ? sanitizeForLog(reason).slice(0, 200)
                : String(type);
          evidence.errorMessage =
            typeof error.message === "string"
              ? sanitizeForLog(error.message).slice(0, 200)
              : type === "response.incomplete"
                ? "Codex reported an incomplete response"
                : "Codex reported a stream failure";
          evidence.terminalBytes = totalBytes;
        }
      } catch {
        // Unknown frames cannot establish successful completion.
        evidence.observationIncomplete = true;
      }
    }
  };
  let settleUsage: (value: CodexStreamUsage | null) => void = () => {};
  const usage = new Promise<CodexStreamUsage | null>((resolve) => {
    settleUsage = resolve;
  });
  // flush() and cancel() are mutually exclusive in principle, but a
  // double-settle must be harmless rather than relied upon.
  let settled = false;
  const settle = (value: CodexStreamUsage | null): void => {
    if (settled) {
      return;
    }
    settled = true;
    settleUsage(value);
  };

  const decoder = new TextDecoder();
  const capture = createCaptureSink();
  let carry = "";
  let latest: CodexStreamUsage | null = null;

  // Bound malformed unterminated events without ever withholding relay bytes.
  const CARRY_LIMIT_CHARS = 1024 * 1024;
  let discardingEvent = false;

  const transformer: ProxyCancellableTransformer<Uint8Array, Uint8Array> = {
    transform(chunk, controller) {
      // Bytes go out first and unconditionally: nothing below can delay or
      // alter what the client receives.
      controller.enqueue(chunk);
      totalBytes += chunk.byteLength;
      try {
        capture?.(chunk);
        carry += decoder.decode(chunk, { stream: true });
        if (discardingEvent) {
          const boundary = /\r\n\r\n|\n\n|\r\r/.exec(carry);
          if (!boundary) {
            carry = carry.slice(-3);
            return;
          }
          carry = carry.slice(boundary.index + boundary[0].length);
          discardingEvent = false;
        }
        const { events, remainder } = extractSSEEvents(carry);
        carry = remainder;
        inspectEvidence(events);
        if (carry.length > CARRY_LIMIT_CHARS) {
          evidence.observationIncomplete = true;
          carry = carry.slice(-2);
          discardingEvent = true;
        }
      } catch {
        // Telemetry must never break the relay.
        evidence.observationIncomplete = true;
      }
    },
    flush() {
      // An event without its dispatch delimiter is incomplete on the wire.
      if (discardingEvent || carry.trim()) {
        evidence.observationIncomplete = true;
      }
      settle(latest);
    },
    /**
     * A client hanging up mid-response, or an upstream error, aborts the
     * stream rather than closing it — so flush() never runs. Without this the
     * usage promise would never settle and every aborted request would leak a
     * pending handler. Report whatever was seen before the abort.
     */
    cancel() {
      settle(latest);
    },
  };

  const stream = new TransformStream<Uint8Array, Uint8Array>(transformer);

  return { stream, usage, evidence: () => ({ ...evidence }) };
}
