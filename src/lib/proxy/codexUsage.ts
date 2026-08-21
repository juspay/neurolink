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

import type {
  CodexStreamUsage,
  ProxyCancellableTransformer,
} from "../types/index.js";

const nonNegativeInt = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;

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
  if (!target) {
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
} {
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

  /**
   * Ceiling on the unterminated tail we are willing to hold.
   *
   * `carry` normally holds a fraction of one SSE line, because every newline
   * flushes it. A stream that never sends one — a hung upstream, a
   * non-SSE body relayed by mistake — would otherwise grow it without bound
   * for the life of the request. One `response.completed` event is a few
   * hundred bytes, so a megabyte is far past any real event, and dropping the
   * tail costs at most the usage reading this tap is allowed to miss anyway.
   */
  const CARRY_LIMIT_CHARS = 1024 * 1024;

  const transformer: ProxyCancellableTransformer<Uint8Array, Uint8Array> = {
    transform(chunk, controller) {
      // Bytes go out first and unconditionally: nothing below can delay or
      // alter what the client receives.
      controller.enqueue(chunk);
      try {
        capture?.(chunk);
        carry += decoder.decode(chunk, { stream: true });
        // Keep only the trailing partial line; events are newline-delimited.
        const lastBreak = carry.lastIndexOf("\n");
        if (lastBreak === -1) {
          if (carry.length > CARRY_LIMIT_CHARS) {
            // No line break in a megabyte: this is not the SSE stream we can
            // read. Give up on the tail rather than grow forever.
            carry = "";
          }
          return;
        }
        const complete = carry.slice(0, lastBreak);
        carry = carry.slice(lastBreak + 1);
        const seen = scanCodexSSEForUsage(complete);
        if (seen) {
          latest = seen;
        }
      } catch {
        // Telemetry must never break the relay.
      }
    },
    flush() {
      try {
        const seen = scanCodexSSEForUsage(carry);
        if (seen) {
          latest = seen;
        }
      } catch {
        // ignored — see above
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

  return { stream, usage };
}
