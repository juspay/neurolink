/**
 * SSE Stream Interceptor
 *
 * A zero-overhead TransformStream that taps Anthropic SSE streaming responses
 * to extract telemetry data (token usage, model info, content blocks, thinking
 * blocks, tool use) while passing every byte through to the client unmodified
 * and without delay.
 *
 * The interceptor buffers partial SSE events internally (chunks may split
 * across event boundaries) but never holds back any bytes from the readable
 * side of the stream.
 *
 * Usage:
 *   const { stream, telemetry } = createSSEInterceptor();
 *   upstreamResponse.body.pipeThrough(stream).pipeTo(clientWritable);
 *   const data = await telemetry; // resolves on stream end
 */

import type {
  SSEContentBlock,
  SSEInterceptorOptions,
  SSEInterceptorResult,
  SSETelemetry,
  TelemetryAccumulator,
} from "../types/index.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum accumulated content per block before we stop appending (100 KB). */
const MAX_BLOCK_CONTENT_BYTES = 100 * 1024;

/** Maximum number of events to record in the event log to cap memory usage. */
const MAX_EVENT_LOG_ENTRIES = 5000;
const MAX_EVENT_DATA_BYTES = 2048;
const MAX_RAW_TEXT_BYTES = 1024 * 1024;
const TRUNCATION_MARKER = "...[TRUNCATED]";

// ---------------------------------------------------------------------------
// Internal SSE line parser
// ---------------------------------------------------------------------------

/**
 * Incrementally parse SSE events from a growing buffer of text.
 *
 * SSE events are separated by a blank line (`\n\n`). Each event consists of
 * field lines (`event: ...`, `data: ...`). We consume complete events and
 * return them, leaving any trailing partial event in the buffer.
 */
function extractSSEEvents(buffer: string): {
  events: Array<{ event: string; data: string }>;
  remainder: string;
} {
  const events: Array<{ event: string; data: string }> = [];

  // Split on double-newline boundaries. The last segment may be an
  // incomplete event if the chunk was split mid-event.
  let cursor = 0;

  while (cursor < buffer.length) {
    const boundary = buffer.indexOf("\n\n", cursor);

    if (boundary === -1) {
      // No more complete events — everything from cursor onward is partial.
      break;
    }

    const rawBlock = buffer.slice(cursor, boundary);
    cursor = boundary + 2; // skip past the \n\n

    let eventType = "";
    let dataValue = "";

    const lines = rawBlock.split("\n");
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        eventType = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        dataValue = line.slice(6);
      } else if (line.startsWith("data:")) {
        // handle `data:` with no space (edge case)
        dataValue = line.slice(5);
      }
    }

    if (eventType || dataValue) {
      events.push({ event: eventType, data: dataValue });
    }
  }

  return { events, remainder: buffer.slice(cursor) };
}

// ---------------------------------------------------------------------------
// Telemetry accumulator
// ---------------------------------------------------------------------------

function createAccumulator(captureRawText: boolean): TelemetryAccumulator {
  return {
    messageId: "",
    model: "",
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
    contentBlocks: [],
    blockByteCounts: new Map(),
    stopReason: null,
    stopSequence: null,
    eventCount: 0,
    startTime: Date.now(),
    totalBytesReceived: 0,
    events: [],
    rawTextChunks: captureRawText ? [] : undefined,
    rawTextBytes: 0,
    rawTextTruncated: false,
    eventLogTruncated: false,
  };
}

function utf8ByteLength(input: string): number {
  return Buffer.byteLength(input, "utf8");
}

function truncateUtf8String(input: string, maxBytes: number): string {
  if (utf8ByteLength(input) <= maxBytes) {
    return input;
  }

  const markerBytes = utf8ByteLength(TRUNCATION_MARKER);
  if (maxBytes <= 0 || maxBytes < markerBytes) {
    return "";
  }

  let output = "";
  let usedBytes = 0;
  for (const char of input) {
    const charBytes = utf8ByteLength(char);
    if (usedBytes + charBytes + markerBytes > maxBytes) {
      break;
    }
    output += char;
    usedBytes += charBytes;
  }

  return `${output}${TRUNCATION_MARKER}`;
}

function truncateString(input: string, maxBytes: number): string {
  return truncateUtf8String(input, maxBytes);
}

function appendCappedFragment(
  current: string | undefined,
  fragment: string,
  currentBytes: number,
  maxBytes: number,
): { value: string; nextBytes: number } {
  const fragmentBytes = utf8ByteLength(fragment);
  if (currentBytes >= maxBytes) {
    return {
      value:
        current && current.endsWith(TRUNCATION_MARKER)
          ? current
          : `${current ?? ""}${TRUNCATION_MARKER}`,
      nextBytes: currentBytes + fragmentBytes,
    };
  }

  const remainingBytes = maxBytes - currentBytes;
  const nextBytes = currentBytes + fragmentBytes;
  if (fragmentBytes <= remainingBytes) {
    return {
      value: `${current ?? ""}${fragment}`,
      nextBytes,
    };
  }

  return {
    value: `${current ?? ""}${truncateUtf8String(fragment, remainingBytes)}`,
    nextBytes,
  };
}

function appendRawTextChunk(acc: TelemetryAccumulator, chunk: string): void {
  if (!acc.rawTextChunks || acc.rawTextTruncated) {
    return;
  }

  const remainingBytes = MAX_RAW_TEXT_BYTES - acc.rawTextBytes;
  if (remainingBytes <= 0) {
    acc.rawTextChunks.push(TRUNCATION_MARKER);
    acc.rawTextTruncated = true;
    return;
  }

  const chunkBytes = utf8ByteLength(chunk);
  if (chunkBytes <= remainingBytes) {
    acc.rawTextChunks.push(chunk);
    acc.rawTextBytes += chunkBytes;
    return;
  }

  acc.rawTextChunks.push(truncateUtf8String(chunk, remainingBytes));
  acc.rawTextBytes = MAX_RAW_TEXT_BYTES;
  acc.rawTextTruncated = true;
}

function getBlockContentBytes(block: SSEContentBlock): number {
  return utf8ByteLength(block.text ?? block.thinking ?? block.toolInput ?? "");
}

function finalize(acc: TelemetryAccumulator): SSETelemetry {
  const totalTokens = acc.inputTokens + acc.outputTokens;
  return {
    messageId: acc.messageId,
    model: acc.model,
    usage: {
      inputTokens: acc.inputTokens,
      outputTokens: acc.outputTokens,
      cacheCreationInputTokens: acc.cacheCreationInputTokens,
      cacheReadInputTokens: acc.cacheReadInputTokens,
      totalTokens,
    },
    contentBlocks: acc.contentBlocks,
    stopReason: acc.stopReason,
    stopSequence: acc.stopSequence,
    eventCount: acc.eventCount,
    streamDurationMs: Date.now() - acc.startTime,
    totalBytesReceived: acc.totalBytesReceived,
    events: acc.events,
    ...(acc.rawTextChunks ? { rawText: acc.rawTextChunks.join("") } : {}),
  };
}

// ---------------------------------------------------------------------------
// Event processors
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */

function processMessageStart(acc: TelemetryAccumulator, parsed: any): void {
  const msg = parsed.message;
  if (!msg) {
    return;
  }

  acc.messageId = msg.id ?? "";
  acc.model = msg.model ?? "";

  const usage = msg.usage;
  if (usage) {
    acc.inputTokens += usage.input_tokens ?? 0;
    acc.outputTokens += usage.output_tokens ?? 0;
    acc.cacheCreationInputTokens += usage.cache_creation_input_tokens ?? 0;
    acc.cacheReadInputTokens += usage.cache_read_input_tokens ?? 0;
  }
}

function processContentBlockStart(
  acc: TelemetryAccumulator,
  parsed: any,
): void {
  const index: number = parsed.index ?? 0;
  const block = parsed.content_block;
  if (!block) {
    return;
  }

  const blockType = block.type as SSEContentBlock["type"];

  const entry: SSEContentBlock = { index, type: blockType };

  if (blockType === "text") {
    entry.text = block.text ?? "";
  } else if (blockType === "thinking") {
    entry.thinking = block.thinking ?? "";
  } else if (blockType === "tool_use") {
    entry.toolName = block.name ?? "";
    entry.toolId = block.id ?? "";
    entry.toolInput = "";
  }

  acc.contentBlocks.push(entry);
  acc.blockByteCounts.set(index, getBlockContentBytes(entry));
}

function processContentBlockDelta(
  acc: TelemetryAccumulator,
  parsed: any,
): void {
  const index: number = parsed.index ?? 0;
  const delta = parsed.delta;
  if (!delta) {
    return;
  }

  // Find the matching block
  const block = acc.contentBlocks.find((b) => b.index === index);
  if (!block) {
    return;
  }

  const currentBytes = acc.blockByteCounts.get(index) ?? 0;
  const capped = currentBytes >= MAX_BLOCK_CONTENT_BYTES;

  if (delta.type === "text_delta" && delta.text !== null) {
    const fragment: string = delta.text;
    const updated = appendCappedFragment(
      block.text,
      fragment,
      currentBytes,
      MAX_BLOCK_CONTENT_BYTES,
    );
    acc.blockByteCounts.set(index, updated.nextBytes);
    if (!capped || !block.text?.endsWith(TRUNCATION_MARKER)) {
      block.text = updated.value;
    }
  } else if (delta.type === "thinking_delta" && delta.thinking !== null) {
    const fragment: string = delta.thinking;
    const updated = appendCappedFragment(
      block.thinking,
      fragment,
      currentBytes,
      MAX_BLOCK_CONTENT_BYTES,
    );
    acc.blockByteCounts.set(index, updated.nextBytes);
    if (!capped || !block.thinking?.endsWith(TRUNCATION_MARKER)) {
      block.thinking = updated.value;
    }
  } else if (delta.type === "input_json_delta" && delta.partial_json !== null) {
    const fragment: string = delta.partial_json;
    const updated = appendCappedFragment(
      block.toolInput,
      fragment,
      currentBytes,
      MAX_BLOCK_CONTENT_BYTES,
    );
    acc.blockByteCounts.set(index, updated.nextBytes);
    if (!capped || !block.toolInput?.endsWith(TRUNCATION_MARKER)) {
      block.toolInput = updated.value;
    }
  }
}

function processMessageDelta(acc: TelemetryAccumulator, parsed: any): void {
  const delta = parsed.delta;
  if (delta) {
    acc.stopReason = delta.stop_reason ?? acc.stopReason;
    acc.stopSequence = delta.stop_sequence ?? acc.stopSequence;
  }

  const usage = parsed.usage;
  if (usage) {
    // message_delta provides the final output_tokens count; treat it as
    // additive because message_start reports output_tokens: 0 for the
    // initial placeholder.
    acc.outputTokens += usage.output_tokens ?? 0;
  }
}

/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Dispatch a parsed SSE event to the appropriate handler
// ---------------------------------------------------------------------------

function processEvent(
  acc: TelemetryAccumulator,
  event: { event: string; data: string },
): void {
  acc.eventCount++;

  const now = Date.now();

  // For content_block_delta events, store only the event type to save memory.
  // For all other events, store the full data string.
  // Cap event log to prevent unbounded growth.
  if (acc.events.length < MAX_EVENT_LOG_ENTRIES - 1) {
    if (event.event === "content_block_delta") {
      acc.events.push({ type: event.event, timestamp: now, data: "" });
    } else {
      acc.events.push({
        type: event.event,
        timestamp: now,
        data: truncateString(event.data, MAX_EVENT_DATA_BYTES),
      });
    }
  } else if (!acc.eventLogTruncated) {
    acc.events.push({
      type: "truncated",
      timestamp: now,
      data: TRUNCATION_MARKER,
    });
    acc.eventLogTruncated = true;
  }

  // Skip JSON parsing for events with no data payload
  if (!event.data) {
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(event.data);
  } catch {
    // Malformed JSON — skip silently, bytes already forwarded to client
    return;
  }

  switch (event.event) {
    case "message_start":
      processMessageStart(acc, parsed);
      break;
    case "content_block_start":
      processContentBlockStart(acc, parsed);
      break;
    case "content_block_delta":
      processContentBlockDelta(acc, parsed);
      break;
    case "message_delta":
      processMessageDelta(acc, parsed);
      break;
    // content_block_stop, message_stop, ping — no telemetry to extract
    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create an SSE interceptor that extracts telemetry from an Anthropic
 * streaming response while passing all bytes through unmodified.
 *
 * ```ts
 * const { stream, telemetry } = createSSEInterceptor();
 * upstreamResponse.body
 *   .pipeThrough(stream)
 *   .pipeTo(clientWritable);
 *
 * const data = await telemetry;
 * console.log(data.usage.totalTokens);
 * ```
 */
export function createSSEInterceptor(
  options: SSEInterceptorOptions = {},
): SSEInterceptorResult {
  const captureRawText = options.captureRawText ?? false;
  const acc = createAccumulator(captureRawText);
  let sseBuffer = "";
  let resolved = false;
  const decoder = new TextDecoder();

  let resolveTelemetry: (value: SSETelemetry) => void;
  const telemetryPromise = new Promise<SSETelemetry>((resolve) => {
    resolveTelemetry = resolve;
  });

  /** Resolve the telemetry promise exactly once. */
  function settle(): void {
    if (resolved) {
      return;
    }
    resolved = true;
    resolveTelemetry(finalize(acc));
  }

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      // Forward the raw bytes immediately — zero delay to client.
      controller.enqueue(chunk);

      // Track total bytes received for bandwidth metrics.
      acc.totalBytesReceived += chunk.byteLength;

      // Decode and buffer for SSE parsing.
      const decodedChunk = decoder.decode(chunk, { stream: true });
      appendRawTextChunk(acc, decodedChunk);
      sseBuffer += decodedChunk;

      const { events, remainder } = extractSSEEvents(sseBuffer);
      sseBuffer = remainder;

      for (const event of events) {
        processEvent(acc, event);
      }
    },

    flush() {
      const finalChunk = decoder.decode();
      if (finalChunk) {
        appendRawTextChunk(acc, finalChunk);
        sseBuffer += finalChunk;
      }

      // Process any trailing data left in the buffer (e.g. a final event
      // not followed by a double-newline).
      if (sseBuffer.trim()) {
        const { events } = extractSSEEvents(sseBuffer + "\n\n");
        for (const event of events) {
          processEvent(acc, event);
        }
      }

      settle();
    },
  });

  // Wrap the writable side so we can intercept abort() — which does NOT
  // trigger the TransformStream's flush() or cancel() callbacks.
  const innerWriter = transform.writable.getWriter();

  const writable = new WritableStream<Uint8Array>({
    write(chunk) {
      return innerWriter.write(chunk);
    },

    close() {
      return innerWriter.close();
    },

    abort(reason) {
      settle();
      return innerWriter.abort(reason);
    },
  });

  const stream: TransformStream<Uint8Array, Uint8Array> = {
    readable: transform.readable,
    writable,
  };

  return { stream, telemetry: telemetryPromise };
}
