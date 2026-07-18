import type {
  AnthropicStreamPreflightResult,
  ParsedSSEEvent,
  StreamTerminalOutcome,
  StreamTerminalOutcomeTracker,
} from "../types/index.js";
import { extractSSEEvents } from "./sseInterceptor.js";

const STREAM_PREFLIGHT_MAX_BYTES = 64 * 1024;
const STREAM_PREFLIGHT_MAX_CHUNKS = 32;

function parseSSEError(data: string): {
  errorType: string;
  message: string;
} {
  try {
    const parsed = JSON.parse(data) as {
      type?: string;
      error?: { type?: string; message?: string };
      message?: string;
    };
    return {
      errorType: parsed.error?.type ?? parsed.type ?? "stream_error",
      message: parsed.error?.message ?? parsed.message ?? "Upstream SSE error",
    };
  } catch {
    return {
      errorType: "stream_error",
      message: data.trim() || "Upstream SSE error",
    };
  }
}

function isSSEErrorEvent(event: ParsedSSEEvent): boolean {
  if (event.event === "error") {
    return true;
  }
  try {
    const parsed = JSON.parse(event.data) as {
      type?: string;
      error?: unknown;
    };
    return parsed.type === "error" || parsed.error !== undefined;
  } catch {
    return false;
  }
}

/** Hold only pre-commit SSE frames so immediate upstream errors remain retryable. */
export async function preflightAnthropicStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): Promise<AnthropicStreamPreflightResult> {
  const decoder = new TextDecoder();
  const chunks: Uint8Array[] = [];
  let parseBuffer = "";
  let totalBytes = 0;

  while (
    totalBytes < STREAM_PREFLIGHT_MAX_BYTES &&
    chunks.length < STREAM_PREFLIGHT_MAX_CHUNKS
  ) {
    let result: ReadableStreamReadResult<Uint8Array>;
    try {
      result = await reader.read();
    } catch (error) {
      return { kind: "transport_error", chunks, error };
    }
    if (result.done) {
      parseBuffer += decoder.decode();
      const { events } = extractSSEEvents(parseBuffer);
      const errorEvent = events.find(isSSEErrorEvent);
      if (errorEvent) {
        return { kind: "sse_error", chunks, ...parseSSEError(errorEvent.data) };
      }
      return chunks.length > 0
        ? { kind: "ready", chunks }
        : { kind: "empty", chunks };
    }
    if (!result.value || result.value.length === 0) {
      continue;
    }
    chunks.push(result.value);
    totalBytes += result.value.byteLength;
    parseBuffer += decoder.decode(result.value, { stream: true });
    const parsed = extractSSEEvents(parseBuffer);
    parseBuffer = parsed.remainder;
    for (const event of parsed.events) {
      if (isSSEErrorEvent(event)) {
        return { kind: "sse_error", chunks, ...parseSSEError(event.data) };
      }
      if (event.event !== "ping" && (event.event || event.data)) {
        return { kind: "ready", chunks };
      }
    }
  }

  return chunks.length > 0
    ? { kind: "ready", chunks }
    : { kind: "empty", chunks };
}

export function createStreamTerminalOutcomeTracker(): StreamTerminalOutcomeTracker {
  let settled = false;
  let resolveOutcome!: (outcome: StreamTerminalOutcome) => void;
  const outcome = new Promise<StreamTerminalOutcome>((resolve) => {
    resolveOutcome = resolve;
  });

  const settle = (value: StreamTerminalOutcome): void => {
    if (settled) {
      return;
    }
    settled = true;
    resolveOutcome(value);
  };

  return {
    outcome,
    complete: () => settle({ kind: "completed" }),
    fail: (message) => settle({ kind: "upstream_error", message }),
    cancel: () => settle({ kind: "client_cancelled" }),
  };
}

export function mergeStreamTerminalOutcome(
  outcome: StreamTerminalOutcome,
  sseErrorMessage?: string,
): StreamTerminalOutcome {
  if (outcome.kind === "completed" && sseErrorMessage) {
    return { kind: "upstream_error", message: sseErrorMessage };
  }
  return outcome;
}
