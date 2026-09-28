/**
 * Drives the Anthropic -> Codex response/stream codec against a real upstream
 * `Response`. Mirrors `codexFallback.ts`, inverted: named after its own
 * upstream, an Anthropic-shape engine, by the same convention `codexFallback.ts`
 * is named after Codex.
 *
 * Scope: translation and the pre-commit/post-commit boundary only. Engine
 * selection, OAuth/account selection, retry/cooldown policy and analytics
 * recording are owned by sibling modules and are not this module's concern —
 * it does not touch `src/lib/server/routes/codexProxyRoutes.ts`.
 *
 * SSE parsing note: this direction reads Anthropic-shaped SSE bytes, the same
 * wire shape `preflightAnthropicStream` already buffers before this module
 * ever sees the stream. Rather than duplicating `codexFallback.ts`'s
 * carry/searchFrom scanner (built for the differently-shaped native Codex
 * event vocabulary), this module reuses `extractSSEEvents` — the incremental
 * Anthropic-SSE parser `preflightAnthropicStream` itself is built on — so the
 * preflight-buffered chunks and the live remainder are parsed by the exact
 * same code path. The carry/searchFrom scanner extraction into a shared
 * `sseFrameScanner.ts` remains an explicitly-deferred follow-up either way.
 */

import { preflightAnthropicStream } from "./streamOutcome.js";
import { extractSSEEvents } from "./sseInterceptor.js";
import {
  CodexResponsesStreamSerializer,
  serializeCodexResponse,
} from "./codexResponsesFormat.js";
import {
  CODEX_STREAM_MAX_TOOL_CALLS,
  CODEX_STREAM_SIZE_CEILING_BYTES,
} from "./streamLimits.js";
import type {
  ClaudeResponse,
  ClaudeUsage,
  CodexNativeToolKind,
  CodexResponseEnvelope,
  CodexResponseStream,
  ParsedSSEEvent,
} from "../types/index.js";

/** Empty by default so an existing caller (no `toolKindByName` argument) keeps
 *  treating every tool_use block as a `function` call, unchanged. */
const NO_TOOL_KINDS: ReadonlyMap<string, CodexNativeToolKind> = new Map();

/** A non-2xx reply (either path) or a non-JSON reply (non-streaming path) from
 *  the Anthropic-shape upstream, raised before any Codex frame is sent. */
export class AnthropicFallbackResponseError extends Error {
  readonly status: number;
  readonly responseBody: string;

  constructor(status: number, responseBody: string) {
    super(`Anthropic fallback request returned HTTP ${status}`);
    this.name = "AnthropicFallbackResponseError";
    this.status = status;
    this.responseBody = responseBody;
  }
}

/** A pre-commit or post-commit failure while translating the Anthropic SSE
 *  stream, or a well-formed non-streaming reply this module refuses to
 *  translate (tool calls over `streamLimits.ts`'s count or size ceiling). */
export class AnthropicFallbackStreamError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, message: string, code: string) {
    super(message);
    this.name = "AnthropicFallbackStreamError";
    this.status = status;
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonNegativeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

/** Caps how much unparsed Anthropic SSE text this module will buffer — now
 *  centralized in streamLimits.ts alongside the same ceiling `codexFallback.ts`
 *  applies on the reverse direction, instead of a second local constant. */
const MAX_BUFFER_CHARS = CODEX_STREAM_SIZE_CEILING_BYTES;

/**
 * The streaming driver's per-turn tool-call ceilings. `open` and `addArgs`
 * return the `emitFailure` arguments to end the turn with once a call would
 * pass the count limit or its accumulated argument text the size limit.
 */
function createToolCallCeilings() {
  let opened = 0;
  let argsLength = 0;
  return {
    open() {
      if (opened >= CODEX_STREAM_MAX_TOOL_CALLS) {
        return [
          502,
          "Anthropic fallback stream exceeded the tool-call limit",
          "too_many_tool_calls",
        ] as const;
      }
      opened++;
      argsLength = 0;
      return undefined;
    },
    addArgs(fragment: string) {
      argsLength += fragment.length;
      return argsLength > CODEX_STREAM_SIZE_CEILING_BYTES
        ? ([
            502,
            "Anthropic fallback tool arguments exceeded the size limit",
            "tool_arguments_too_large",
          ] as const)
        : undefined;
    },
  };
}

/**
 * Consume a fully-buffered, non-streaming Anthropic-shape response and
 * translate it into one Codex Responses envelope.
 *
 * No `message_start`/`message_delta` split here: a single JSON object
 * carries the whole turn's usage at once (confirmed against this repo's own
 * `settleFromResponseUsage`, which reads a non-streaming Anthropic body the
 * same way), so the translation delegates straight to `serializeCodexResponse`.
 */
export async function consumeAnthropicFallbackResponse(
  response: Response,
  model: string,
  toolKindByName: ReadonlyMap<string, CodexNativeToolKind> = NO_TOOL_KINDS,
): Promise<CodexResponseEnvelope> {
  if (!response.ok) {
    throw new AnthropicFallbackResponseError(
      response.status,
      await response.text().catch(() => ""),
    );
  }
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text().catch(() => "");
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new AnthropicFallbackResponseError(response.status, text);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AnthropicFallbackResponseError(response.status, text);
  }
  if (
    !isRecord(parsed) ||
    parsed.type !== "message" ||
    !Array.isArray(parsed.content) ||
    !isRecord(parsed.usage)
  ) {
    throw new AnthropicFallbackResponseError(response.status, text);
  }
  const toolUses = parsed.content.filter(
    (block): block is Record<string, unknown> =>
      isRecord(block) && block.type === "tool_use",
  );
  if (toolUses.length > CODEX_STREAM_MAX_TOOL_CALLS) {
    throw new AnthropicFallbackStreamError(
      502,
      "Anthropic fallback response exceeded the tool-call limit",
      "too_many_tool_calls",
    );
  }
  if (
    toolUses.some(
      (block) =>
        JSON.stringify(block.input ?? {}).length >
        CODEX_STREAM_SIZE_CEILING_BYTES,
    )
  ) {
    throw new AnthropicFallbackStreamError(
      502,
      "Anthropic fallback tool arguments exceeded the size limit",
      "tool_arguments_too_large",
    );
  }
  // The same number checks the streaming path applies to message_start, so a
  // malformed count becomes 0 (or is omitted) rather than reaching the totals.
  const usage = parsed.usage;
  const cacheCreate = optionalNumber(usage.cache_creation_input_tokens);
  const cacheRead = optionalNumber(usage.cache_read_input_tokens);
  const result: ClaudeResponse = {
    ...(parsed as ClaudeResponse),
    usage: {
      input_tokens: nonNegativeNumber(usage.input_tokens),
      output_tokens: nonNegativeNumber(usage.output_tokens),
      ...(cacheCreate === undefined
        ? {}
        : { cache_creation_input_tokens: cacheCreate }),
      ...(cacheRead === undefined
        ? {}
        : { cache_read_input_tokens: cacheRead }),
    },
  };
  return serializeCodexResponse(result, model, toolKindByName);
}

/**
 * Translate an Anthropic SSE stream into Codex-shape SSE frames as events
 * arrive. The caller owns error framing downstream and must never retry
 * after any frame has been emitted (mirrors `codexFallback.ts`'s own
 * discipline, `:715-718`).
 */
export async function createAnthropicFallbackStream(
  response: Response,
  model: string,
  toolKindByName: ReadonlyMap<string, CodexNativeToolKind> = NO_TOOL_KINDS,
): Promise<CodexResponseStream> {
  if (!response.ok) {
    throw new AnthropicFallbackResponseError(
      response.status,
      await response.text().catch(() => ""),
    );
  }
  if (!response.body) {
    throw new AnthropicFallbackStreamError(
      502,
      "Anthropic fallback returned an empty stream",
      "empty_response",
    );
  }
  const reader = response.body.getReader();
  let cancellation: Promise<void> | undefined;
  const cancel = (reason?: unknown): Promise<void> => {
    cancellation ??= reader
      .cancel(reason)
      .catch(() => undefined)
      .finally(() => reader.releaseLock());
    return cancellation;
  };

  const preflight = await preflightAnthropicStream(reader);
  if (preflight.kind !== "ready") {
    // Pre-commit: nothing Codex-shaped sent yet. Release the reader and its
    // admission lease before throwing, so a caller that tries the next
    // engine is not blocked by a lease this hop still held.
    await cancel();
    if (preflight.kind === "sse_error") {
      throw new AnthropicFallbackStreamError(
        502,
        preflight.message,
        preflight.errorType,
      );
    }
    if (preflight.kind === "transport_error") {
      throw new AnthropicFallbackStreamError(
        502,
        "Anthropic fallback transport failed before any content",
        "transport_error",
      );
    }
    throw new AnthropicFallbackStreamError(
      502,
      "Anthropic fallback stream ended before any content",
      "empty_response",
    );
  }

  const serializer = new CodexResponsesStreamSerializer(model, toolKindByName);

  async function* frames(): AsyncGenerator<string, CodexResponseEnvelope> {
    yield* serializer.start();
    const decoder = new TextDecoder();
    let buffer = "";
    let capturedInput = 0;
    let capturedOutput = 0;
    let capturedCacheCreate: number | undefined;
    let capturedCacheRead: number | undefined;
    let capturedStopReason: string | null = null;
    // input_json_delta also streams for server_tool_use blocks, which have no
    // Codex function_call to feed; only a tool_use block's fragments count.
    let currentBlockType: string | undefined;
    const ceilings = createToolCallCeilings();

    /** One parsed Anthropic SSE event -> zero or more Codex frames, or the
     *  terminal envelope once `message_stop` (or a failure) is reached. */
    function* processEvent(
      type: string,
      payload: Record<string, unknown>,
    ): Generator<string, CodexResponseEnvelope | undefined> {
      switch (type) {
        case "message_start": {
          const message = payload.message;
          const usage = isRecord(message) ? message.usage : undefined;
          if (isRecord(usage)) {
            capturedInput = nonNegativeNumber(usage.input_tokens);
            capturedCacheCreate = optionalNumber(
              usage.cache_creation_input_tokens,
            );
            capturedCacheRead = optionalNumber(usage.cache_read_input_tokens);
          }
          return undefined;
        }
        case "content_block_start": {
          const block = payload.content_block;
          currentBlockType =
            isRecord(block) && typeof block.type === "string"
              ? block.type
              : undefined;
          if (isRecord(block) && block.type === "tool_use") {
            const overLimit = ceilings.open();
            if (overLimit) {
              return yield* serializer.emitFailure(...overLimit);
            }
            const id = typeof block.id === "string" ? block.id : "";
            const name = typeof block.name === "string" ? block.name : "";
            yield* serializer.openToolCall(id, name);
          }
          // "text" opens lazily on its first delta; "thinking" is dropped by
          // design (ClaudeThinkingBlock carries no signature to preserve).
          return undefined;
        }
        case "content_block_delta": {
          const delta = payload.delta;
          if (!isRecord(delta)) {
            return undefined;
          }
          if (delta.type === "text_delta" && typeof delta.text === "string") {
            yield* serializer.pushDelta(delta.text);
          } else if (
            delta.type === "input_json_delta" &&
            currentBlockType === "tool_use" &&
            typeof delta.partial_json === "string"
          ) {
            // Checked before the fragment is forwarded: the call closes
            // incomplete, never completed with its arguments cut mid-object.
            const overLimit = ceilings.addArgs(delta.partial_json);
            if (overLimit) {
              return yield* serializer.emitFailure(...overLimit);
            }
            yield* serializer.pushToolCallArgsDelta(delta.partial_json);
          }
          // thinking_delta: zero frames.
          return undefined;
        }
        case "content_block_stop": {
          currentBlockType = undefined;
          try {
            yield* serializer.closeToolCall();
          } catch {
            // Malformed tool-call JSON: a named, handled case — never a
            // fallthrough exception. No function_call_arguments.done was
            // emitted, since closeToolCall throws before reaching it.
            return yield* serializer.emitFailure(
              502,
              "Anthropic fallback tool arguments were not valid JSON",
              "invalid_tool_arguments",
            );
          }
          yield* serializer.closeTextBlock();
          return undefined;
        }
        case "message_delta": {
          const delta = payload.delta;
          if (isRecord(delta)) {
            capturedStopReason =
              typeof delta.stop_reason === "string" ? delta.stop_reason : null;
          }
          const usage = payload.usage;
          // Only output_tokens is read here — never input/cache fields.
          // message_delta carries only the running output total; reading
          // cache fields from it would zero cache accounting on every
          // response (that was the original design draft's Blocker).
          if (isRecord(usage) && typeof usage.output_tokens === "number") {
            capturedOutput = usage.output_tokens;
          }
          return undefined;
        }
        case "message_stop":
          return yield* serializer.finish(capturedStopReason, {
            input_tokens: capturedInput,
            output_tokens: capturedOutput,
            ...(capturedCacheCreate === undefined
              ? {}
              : { cache_creation_input_tokens: capturedCacheCreate }),
            ...(capturedCacheRead === undefined
              ? {}
              : { cache_read_input_tokens: capturedCacheRead }),
          } satisfies ClaudeUsage);
        case "error": {
          // A mid-stream upstream error ends the turn: without this case it
          // would fall to default and the client would wait on a stream that
          // never terminates.
          const error = payload.error;
          const code =
            isRecord(error) && typeof error.type === "string"
              ? error.type
              : "upstream_error";
          const message =
            isRecord(error) && typeof error.message === "string"
              ? error.message
              : "Anthropic fallback stream reported an error";
          return yield* serializer.emitFailure(502, message, code);
        }
        // "ping" and any other event type this repo does not name are
        // consumed and produce zero Codex-shape frames.
        default:
          return undefined;
      }
    }

    function* consumeEvents(
      events: ParsedSSEEvent[],
    ): Generator<string, CodexResponseEnvelope | undefined> {
      for (const raw of events) {
        let payload: unknown;
        try {
          payload = JSON.parse(raw.data);
        } catch {
          // A single malformed Anthropic frame is skipped defensively rather
          // than failing the whole turn over one unparsable event.
          continue;
        }
        if (!isRecord(payload)) {
          continue;
        }
        const type =
          typeof payload.type === "string" ? payload.type : raw.event;
        if (!type) {
          continue;
        }
        // After response.created has gone out, any serializer throw must still
        // end the turn with response.failed; emitFailure closes an open item
        // as incomplete without re-validating it.
        let result: CodexResponseEnvelope | undefined;
        try {
          result = yield* processEvent(type, payload);
        } catch {
          return yield* serializer.emitFailure(
            502,
            "Anthropic fallback stream could not be translated",
            "translation_error",
          );
        }
        if (result) {
          return result;
        }
      }
      return undefined;
    }

    try {
      // Preflight's buffered chunks run THROUGH the interpreter first — never
      // replayed raw, unlike the Claude-facing route where upstream shape
      // already equals client shape.
      for (const chunk of preflight.chunks) {
        buffer += decoder.decode(chunk, { stream: true });
      }
      let parsed = extractSSEEvents(buffer);
      buffer = parsed.remainder;
      let result = yield* consumeEvents(parsed.events);
      if (result) {
        return result;
      }

      while (true) {
        let chunk: ReadableStreamReadResult<Uint8Array>;
        try {
          chunk = await reader.read();
        } catch {
          // Post-commit (response.created already flushed): a silent swap is
          // impossible, so this closes the open item incomplete and emits a
          // single response.failed rather than throwing.
          return yield* serializer.emitFailure(
            502,
            "Anthropic fallback stream failed while reading",
            "upstream_read_error",
          );
        }
        buffer += chunk.done
          ? decoder.decode()
          : decoder.decode(chunk.value, { stream: true });
        if (buffer.length > MAX_BUFFER_CHARS) {
          return yield* serializer.emitFailure(
            502,
            "Anthropic fallback translation exceeded the stream limit",
            "stream_too_large",
          );
        }
        parsed = extractSSEEvents(buffer);
        buffer = parsed.remainder;
        result = yield* consumeEvents(parsed.events);
        if (result) {
          return result;
        }
        if (chunk.done) {
          break;
        }
      }
      return yield* serializer.emitFailure(
        502,
        "Anthropic fallback stream ended before message_stop",
        "incomplete_stream",
      );
    } finally {
      await cancel();
    }
  }

  return { frames: frames(), cancel };
}
