/**
 * OpenAI Chat Completions API format conversion layer.
 *
 * Provides a request parser (OpenAI -> NeuroLink), a response serializer
 * (NeuroLink -> OpenAI), a streaming SSE state machine, and an error
 * envelope helper.  Together they allow NeuroLink to act as a
 * drop-in OpenAI API proxy.
 *
 * Reference: https://platform.openai.com/docs/api-reference/chat/create
 */

import { jsonSchema, tool } from "../utils/tool.js";
import { randomBytes } from "crypto";
import type {
  ClaudeContentBlock,
  ClaudeMessage,
  ClaudeRequest,
  ClaudeResponse,
  InternalResult,
  OpenAICompletionRequest,
  OpenAICompletionResponse,
  OpenAIErrorResponse,
  OpenAIStreamChunk,
  OpenAIToolCall,
  ParsedOpenAIRequest,
  StreamLifecycleState,
} from "../types/index.js";
import { normalizeJsonSchemaObject } from "../utils/schemaConversion.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a unique chat completion ID in the OpenAI format. */
export function generateChatCompletionId(): string {
  return `chatcmpl-${randomBytes(12).toString("base64url").slice(0, 24)}`;
}

/** Generate an OpenAI-format tool call ID (`call_` + random chars). */
export function generateOpenAIToolCallId(): string {
  return `call_${randomBytes(12).toString("base64url").slice(0, 24)}`;
}

// ---------------------------------------------------------------------------
// Request parser: OpenAI -> NeuroLink internal format
// ---------------------------------------------------------------------------

/**
 * Parse an incoming OpenAI Chat Completions request into an intermediate
 * representation consumable by NeuroLink's generate/stream pipeline.
 *
 * Handles:
 * - System prompt extraction from system messages
 * - Message flattening (text + image parts)
 * - Tool definition conversion
 * - tool_choice mapping
 * - top_p, temperature, max_tokens pass-through
 */
export function parseOpenAIRequest(
  body: OpenAICompletionRequest,
): ParsedOpenAIRequest {
  // --- system prompt ---
  const systemParts: string[] = [];
  for (const msg of body.messages) {
    if (msg.role === "system") {
      systemParts.push(msg.content);
    }
  }
  const systemPrompt =
    systemParts.length > 0 ? systemParts.join("\n\n") : undefined;

  // --- messages ---
  // Find the index of the last user message so we can distinguish the
  // current turn from history.  Images from historical messages are kept
  // inline as text references; only images from the latest user message
  // are extracted into the top-level `images` array.
  const conversationMessages: Array<{ role: string; content: string }> = [];
  const images: string[] = [];
  let lastUserPrompt = "";

  let lastUserMsgIdx = -1;
  for (let i = body.messages.length - 1; i >= 0; i--) {
    if (body.messages[i].role === "user") {
      lastUserMsgIdx = i;
      break;
    }
  }

  // NOTE: This loop intentionally does NOT use MessageBuilder because the proxy
  // layer translates between OpenAI's wire format and NeuroLink's internal
  // representation. MessageBuilder is for SDK-side message construction from
  // user inputs (files, images, etc.).
  for (let msgIdx = 0; msgIdx < body.messages.length; msgIdx++) {
    const msg = body.messages[msgIdx];
    const isLatestUserMsg = msgIdx === lastUserMsgIdx;

    if (msg.role === "system") {
      // System messages are already extracted above; skip them in the
      // conversation history to avoid duplication.
      continue;
    }

    if (msg.role === "user") {
      if (typeof msg.content === "string") {
        conversationMessages.push({ role: msg.role, content: msg.content });
        lastUserPrompt = msg.content;
      } else if (Array.isArray(msg.content)) {
        const textParts: string[] = [];
        for (const part of msg.content) {
          if (part.type === "text") {
            textParts.push(part.text);
          } else if (part.type === "image_url") {
            if (isLatestUserMsg) {
              images.push(part.image_url.url);
            } else {
              textParts.push("[image]");
            }
          }
        }
        const combined = textParts.join("\n");
        conversationMessages.push({ role: msg.role, content: combined });
        lastUserPrompt = combined;
      }
    } else if (msg.role === "assistant") {
      const textParts: string[] = [];
      if (msg.content) {
        textParts.push(msg.content);
      }
      if (msg.tool_calls) {
        for (const tc of msg.tool_calls) {
          textParts.push(
            `[tool_use:${tc.id}:${tc.function.name}] ${tc.function.arguments}`,
          );
        }
      }
      const combined = textParts.join("\n");
      conversationMessages.push({ role: msg.role, content: combined });
    } else if (msg.role === "tool") {
      conversationMessages.push({
        role: "user",
        content: `[tool_result:${msg.tool_call_id}] ${msg.content}`,
      });
    }
  }

  // --- tools ---
  const tools: ParsedOpenAIRequest["tools"] = {};
  if (body.tools) {
    for (const t of body.tools) {
      tools[t.function.name] = tool({
        description: t.function.description ?? "",
        inputSchema: jsonSchema(
          normalizeJsonSchemaObject(
            t.function.parameters ?? { type: "object" as const },
          ),
        ),
      });
    }
  }

  // --- tool_choice ---
  let toolChoice: ParsedOpenAIRequest["toolChoice"];
  let toolChoiceName: string | undefined;
  if (body.tool_choice) {
    if (typeof body.tool_choice === "string") {
      switch (body.tool_choice) {
        case "auto":
          toolChoice = "auto";
          break;
        case "required":
          toolChoice = "required";
          break;
        case "none":
          toolChoice = "none";
          break;
      }
    } else if (
      typeof body.tool_choice === "object" &&
      body.tool_choice.type === "function"
    ) {
      toolChoice = "required";
      toolChoiceName = body.tool_choice.function.name;
    }
  }

  // --- stop sequences ---
  let stopSequences: string[] | undefined;
  if (body.stop) {
    stopSequences = Array.isArray(body.stop) ? body.stop : [body.stop];
  }

  // --- response format ---
  let responseFormat: ParsedOpenAIRequest["responseFormat"];
  if (body.response_format) {
    responseFormat = {
      type: body.response_format.type,
      jsonSchema: body.response_format.json_schema,
    };
  }

  return {
    model: body.model,
    maxTokens: body.max_tokens ?? body.max_completion_tokens ?? 4096,
    temperature: body.temperature,
    topP: body.top_p,
    systemPrompt,
    stream: body.stream === true,
    prompt: lastUserPrompt,
    images,
    conversationMessages,
    tools,
    toolChoice,
    toolChoiceName,
    stopSequences,
    responseFormat,
  };
}

// ---------------------------------------------------------------------------
// Response serializer: NeuroLink result -> OpenAI response
// ---------------------------------------------------------------------------

/**
 * Map NeuroLink finish-reason strings to OpenAI finish_reason values.
 */
function mapFinishReason(
  finishReason: string | undefined,
): "stop" | "tool_calls" | "length" | "content_filter" | null {
  switch (finishReason) {
    case "stop":
    case "end_turn":
      return "stop";
    case "length":
    case "max_tokens":
      return "length";
    case "tool-calls":
    case "tool_use":
      return "tool_calls";
    case "content_filter":
    case "safety":
      return "content_filter";
    default:
      return finishReason ? "stop" : null;
  }
}

/**
 * Serialize a NeuroLink GenerateResult into an OpenAI Chat Completions response.
 */
export function serializeOpenAIResponse(
  result: InternalResult,
  requestModel: string,
): OpenAICompletionResponse {
  const inferredFinishReason =
    result.toolCalls &&
    result.toolCalls.length > 0 &&
    (!result.finishReason || result.finishReason === "stop")
      ? "tool_calls"
      : result.finishReason;

  // Build tool_calls array if present
  let toolCalls: OpenAIToolCall[] | undefined;
  if (result.toolCalls && result.toolCalls.length > 0) {
    toolCalls = result.toolCalls.map((tc) => ({
      id: tc.toolCallId || generateOpenAIToolCallId(),
      type: "function" as const,
      function: {
        name: tc.toolName,
        arguments: JSON.stringify(tc.args ?? {}),
      },
    }));
  }

  // Content is null when only tool calls are present (no text content)
  const content = toolCalls && !result.content ? null : result.content || "";

  return {
    id: generateChatCompletionId(),
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: result.model ?? requestModel,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content,
          ...(toolCalls ? { tool_calls: toolCalls } : {}),
        },
        finish_reason: mapFinishReason(inferredFinishReason),
      },
    ],
    usage: {
      prompt_tokens: result.usage?.input ?? 0,
      completion_tokens: result.usage?.output ?? 0,
      total_tokens: result.usage?.total ?? 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Error envelope
// ---------------------------------------------------------------------------

/** Map HTTP status codes to OpenAI error types. */
function errorTypeFromStatus(status: number): string {
  switch (status) {
    case 400:
      return "invalid_request_error";
    case 401:
      return "authentication_error";
    case 403:
      return "permission_error";
    case 404:
      return "not_found_error";
    case 429:
      return "rate_limit_error";
    default:
      return status >= 500 ? "server_error" : "invalid_request_error";
  }
}

/**
 * Build an OpenAI-compatible error envelope.
 */
export function buildOpenAIError(
  status: number,
  message: string,
): OpenAIErrorResponse {
  return {
    error: {
      message,
      type: errorTypeFromStatus(status),
      code: null,
    },
  };
}

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------

/**
 * Format a single OpenAI SSE frame.
 * OpenAI uses only `data:` lines (no `event:` prefix unlike Claude).
 */
export function formatOpenAISSE(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// ---------------------------------------------------------------------------
// Streaming SSE state machine
// ---------------------------------------------------------------------------

/**
 * Stateful SSE serializer that emits a well-formed OpenAI streaming response.
 *
 * Tracks lifecycle state (`idle` -> `streaming` -> `done`) and the current
 * tool call index for multi-tool streaming.
 *
 * Usage:
 * ```ts
 * const sse = new OpenAIStreamSerializer(requestModel);
 *
 * // Start the stream
 * yield* sse.start();
 *
 * // Text deltas
 * for await (const chunk of textStream) {
 *   yield* sse.pushDelta(chunk);
 * }
 *
 * // Tool use
 * yield* sse.pushToolUse(toolId, toolName, toolInput);
 *
 * // Finalize
 * yield* sse.finish("stop", usage);
 * ```
 */
export class OpenAIStreamSerializer {
  private state: StreamLifecycleState = "idle";
  private readonly id: string;
  private readonly model: string;
  private started = false;
  private toolCallIndex = -1;

  constructor(model: string) {
    this.id = generateChatCompletionId();
    this.model = model;
  }

  /** Current lifecycle state (exposed for testing). */
  getState(): StreamLifecycleState {
    return this.state;
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  private makeChunk(
    delta: OpenAIStreamChunk["choices"][0]["delta"],
    finishReason: string | null = null,
    usage?: OpenAIStreamChunk["usage"],
  ): OpenAIStreamChunk {
    return {
      id: this.id,
      object: "chat.completion.chunk",
      created: Math.floor(Date.now() / 1000),
      model: this.model,
      choices: [
        {
          index: 0,
          delta,
          finish_reason: finishReason,
        },
      ],
      ...(usage ? { usage } : {}),
    };
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Emit the opening frame with `role: "assistant"`.
   */
  *start(): Generator<string> {
    if (this.state !== "idle") {
      return;
    }

    this.started = true;
    this.state = "streaming";

    yield formatOpenAISSE(this.makeChunk({ role: "assistant" }));
  }

  /**
   * Push a text content delta.
   */
  *pushDelta(text: string): Generator<string> {
    if (this.state === "done" || this.state === "error") {
      return;
    }

    if (!this.started) {
      yield* this.start();
    }

    yield formatOpenAISSE(this.makeChunk({ content: text }));
  }

  /**
   * Push the start of a tool call (id, name, empty arguments).
   */
  *pushToolCallStart(id: string, name: string): Generator<string> {
    if (this.state === "done" || this.state === "error") {
      return;
    }

    if (!this.started) {
      yield* this.start();
    }

    this.toolCallIndex += 1;

    yield formatOpenAISSE(
      this.makeChunk({
        tool_calls: [
          {
            index: this.toolCallIndex,
            id,
            type: "function",
            function: { name, arguments: "" },
          },
        ],
      }),
    );
  }

  /**
   * Push an arguments delta for the current tool call.
   */
  *pushToolCallArgDelta(index: number, argsChunk: string): Generator<string> {
    if (this.state === "done" || this.state === "error") {
      return;
    }

    yield formatOpenAISSE(
      this.makeChunk({
        tool_calls: [
          {
            index,
            function: { arguments: argsChunk },
          },
        ],
      }),
    );
  }

  /**
   * Push a complete tool use: emits tool call start followed by chunked
   * argument deltas (~100 chars per chunk).
   */
  *pushToolUse(id: string, name: string, input: unknown): Generator<string> {
    if (this.state === "done" || this.state === "error") {
      return;
    }

    yield* this.pushToolCallStart(id, name);

    const jsonStr = JSON.stringify(input ?? {});
    const CHUNK_SIZE = 100;
    const currentIndex = this.toolCallIndex;

    for (let i = 0; i < jsonStr.length; i += CHUNK_SIZE) {
      const chunk = jsonStr.slice(i, i + CHUNK_SIZE);
      yield* this.pushToolCallArgDelta(currentIndex, chunk);
    }

    // If the input was empty, still emit at least one delta
    if (jsonStr.length === 0) {
      yield* this.pushToolCallArgDelta(currentIndex, "{}");
    }
  }

  /**
   * Finalize the stream: emit finish_reason chunk, then `data: [DONE]`.
   */
  *finish(
    finishReason?: string,
    usage?: { input: number; output: number; total: number },
  ): Generator<string> {
    if (this.state === "idle") {
      yield* this.start();
    }

    if (this.state === "done" || this.state === "error") {
      return;
    }

    const mappedReason = mapFinishReason(finishReason) ?? "stop";
    const usagePayload = usage
      ? {
          prompt_tokens: usage.input,
          completion_tokens: usage.output,
          total_tokens: usage.total,
        }
      : undefined;

    yield formatOpenAISSE(this.makeChunk({}, mappedReason, usagePayload));
    yield "data: [DONE]\n\n";

    this.state = "done";
  }

  /**
   * Emit an error event.  Transitions to terminal ERROR state.
   */
  *emitError(message: string): Generator<string> {
    this.state = "error";
    yield formatOpenAISSE({
      error: { message, type: "server_error" },
    });
  }
}

// ---------------------------------------------------------------------------
// OpenAI <-> Claude (Anthropic) format bridge
// ---------------------------------------------------------------------------

/**
 * Convert an OpenAI Chat Completions request to a Claude Messages API request.
 *
 * Used by the OpenAI proxy endpoint to internally loopback requests targeting
 * Claude models through the proxy's native /v1/messages passthrough path,
 * so they benefit from OAuth account rotation, retry, SSE interception, etc.
 */
export function convertOpenAIToClaudeRequest(
  openai: OpenAICompletionRequest,
): ClaudeRequest {
  // --- system messages ---
  const systemMessages = openai.messages.filter(
    (m) => m.role === "system",
  ) as Array<{
    role: "system";
    content: string;
  }>;
  const system =
    systemMessages.length > 0
      ? systemMessages.map((m) => ({ type: "text" as const, text: m.content }))
      : undefined;

  // --- conversation messages ---
  const messages: ClaudeMessage[] = [];
  for (const msg of openai.messages) {
    if (msg.role === "system") {
      continue;
    }

    if (msg.role === "user") {
      if (typeof msg.content === "string") {
        messages.push({ role: "user", content: msg.content });
      } else if (Array.isArray(msg.content)) {
        const blocks: ClaudeContentBlock[] = msg.content.map((part) => {
          if (part.type === "text") {
            return { type: "text", text: part.text };
          }
          if (part.type === "image_url") {
            return {
              type: "image",
              source: { type: "url" as const, url: part.image_url.url },
            };
          }
          return { type: "text", text: "" };
        });
        messages.push({ role: "user", content: blocks });
      }
    } else if (msg.role === "assistant") {
      const blocks: ClaudeContentBlock[] = [];
      if (msg.content) {
        blocks.push({ type: "text", text: msg.content });
      }
      if (msg.tool_calls) {
        for (const tc of msg.tool_calls) {
          let input: Record<string, unknown>;
          try {
            input = tc.function.arguments
              ? (JSON.parse(tc.function.arguments) as Record<string, unknown>)
              : {};
          } catch {
            input = {};
          }
          blocks.push({
            type: "tool_use",
            id: tc.id,
            name: tc.function.name,
            input,
          });
        }
      }
      messages.push({
        role: "assistant",
        content:
          blocks.length === 1 && blocks[0].type === "text"
            ? blocks[0].text
            : blocks,
      });
    } else if (msg.role === "tool") {
      messages.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: msg.tool_call_id,
            content: msg.content,
          },
        ],
      });
    }
  }

  // --- tools ---
  const tools = openai.tools?.map((t) => ({
    name: t.function.name,
    description: t.function.description || "",
    input_schema: t.function.parameters,
  }));

  // --- tool_choice ---
  let tool_choice: ClaudeRequest["tool_choice"];
  if (openai.tool_choice === "auto") {
    tool_choice = { type: "auto" };
  } else if (openai.tool_choice === "required") {
    tool_choice = { type: "any" };
  } else if (openai.tool_choice === "none") {
    tool_choice = { type: "none" };
  } else if (
    typeof openai.tool_choice === "object" &&
    openai.tool_choice.type === "function"
  ) {
    tool_choice = { type: "tool", name: openai.tool_choice.function.name };
  }

  const result: ClaudeRequest = {
    model: openai.model,
    messages,
    max_tokens: openai.max_tokens ?? openai.max_completion_tokens ?? 4096,
    stream: openai.stream ?? false,
  };

  if (system) {
    result.system = system;
  }
  if (openai.temperature !== undefined) {
    result.temperature = openai.temperature;
  }
  if (openai.top_p !== undefined) {
    result.top_p = openai.top_p;
  }
  if (tools && tools.length > 0) {
    result.tools = tools;
  }
  if (tool_choice) {
    result.tool_choice = tool_choice;
  }
  if (openai.stop) {
    result.stop_sequences = Array.isArray(openai.stop)
      ? openai.stop
      : [openai.stop];
  }

  return result;
}

/**
 * Convert a non-streaming Claude Messages response to an OpenAI Chat
 * Completions response by bridging through {@link InternalResult}.
 */
export function convertClaudeToOpenAIResponse(
  claude: ClaudeResponse,
  requestModel: string,
): OpenAICompletionResponse {
  const content = claude.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  const toolCalls = claude.content
    .filter((b) => b.type === "tool_use")
    .map((b) => {
      const tu = b as {
        type: "tool_use";
        id: string;
        name: string;
        input: Record<string, unknown>;
      };
      return {
        toolCallId: tu.id,
        toolName: tu.name,
        args: tu.input ?? {},
      };
    });

  const internal: InternalResult = {
    content,
    model: claude.model,
    finishReason: claude.stop_reason ?? "end_turn",
    usage: {
      input: claude.usage.input_tokens,
      output: claude.usage.output_tokens,
      total: claude.usage.input_tokens + claude.usage.output_tokens,
    },
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
  };

  return serializeOpenAIResponse(internal, requestModel);
}

/**
 * Create a TransformStream that parses Claude Messages API SSE events from
 * the upstream response and re-emits them as OpenAI Chat Completions SSE
 * frames.
 *
 * Handles the canonical Claude SSE event types:
 *  - message_start       -> emits the opening `role: "assistant"` chunk
 *  - content_block_start -> text block: no-op; tool_use block: emit tool call start
 *  - content_block_delta -> text_delta: emit content delta;
 *                           input_json_delta: emit tool call argument delta
 *  - content_block_stop  -> no-op
 *  - message_delta       -> captures stop_reason and output token usage
 *  - message_stop        -> emits the final `finish_reason` chunk + `[DONE]`
 */
export function createClaudeToOpenAIStreamTransform(
  requestModel: string,
  options: { onError?: (message: string) => void } = {},
): TransformStream<Uint8Array, Uint8Array> {
  const serializer = new OpenAIStreamSerializer(requestModel);
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";

  // Track per-content-block state so we can map Claude's indexed block
  // stream to OpenAI's flat delta stream.
  const blockState = new Map<
    number,
    {
      kind: "text" | "tool_use" | "thinking" | "other";
      toolCallIndex?: number;
    }
  >();

  let stopReason: string | undefined;
  let usage: { input: number; output: number; total: number } | undefined;
  let inputTokens = 0;
  let nextToolCallIndex = 0;
  let finished = false;

  const emit = (
    controller: TransformStreamDefaultController<Uint8Array>,
    gen: Generator<string>,
  ): void => {
    for (const frame of gen) {
      controller.enqueue(encoder.encode(frame));
    }
  };

  const handleEvent = (
    eventName: string,
    dataStr: string,
    controller: TransformStreamDefaultController<Uint8Array>,
  ): void => {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(dataStr) as Record<string, unknown>;
    } catch {
      return;
    }
    if (finished) {
      return;
    }

    switch (eventName) {
      case "message_start": {
        const message = (data.message ?? {}) as {
          usage?: { input_tokens?: number; output_tokens?: number };
        };
        if (message.usage?.input_tokens !== undefined) {
          inputTokens = message.usage.input_tokens;
        }
        emit(controller, serializer.start());
        return;
      }

      case "content_block_start": {
        const index =
          typeof data.index === "number" ? (data.index as number) : 0;
        const block = (data.content_block ?? {}) as {
          type?: string;
          id?: string;
          name?: string;
        };
        if (block.type === "tool_use") {
          const toolCallIndex = nextToolCallIndex++;
          blockState.set(index, { kind: "tool_use", toolCallIndex });
          emit(
            controller,
            serializer.pushToolCallStart(block.id ?? "", block.name ?? ""),
          );
        } else if (block.type === "text") {
          blockState.set(index, { kind: "text" });
        } else if (block.type === "thinking") {
          blockState.set(index, { kind: "thinking" });
        } else {
          blockState.set(index, { kind: "other" });
        }
        return;
      }

      case "content_block_delta": {
        const index =
          typeof data.index === "number" ? (data.index as number) : 0;
        const delta = (data.delta ?? {}) as {
          type?: string;
          text?: string;
          partial_json?: string;
        };
        const state = blockState.get(index);
        if (!state) {
          return;
        }

        if (delta.type === "text_delta" && state.kind === "text") {
          emit(controller, serializer.pushDelta(delta.text ?? ""));
        } else if (
          delta.type === "input_json_delta" &&
          state.kind === "tool_use" &&
          state.toolCallIndex !== undefined
        ) {
          emit(
            controller,
            serializer.pushToolCallArgDelta(
              state.toolCallIndex,
              delta.partial_json ?? "",
            ),
          );
        }
        // thinking_delta is intentionally dropped — OpenAI has no equivalent.
        return;
      }

      case "content_block_stop": {
        // No-op: OpenAI stream has no per-block close event.
        return;
      }

      case "message_delta": {
        const delta = (data.delta ?? {}) as { stop_reason?: string };
        if (delta.stop_reason) {
          stopReason = delta.stop_reason;
        }
        const u = (data.usage ?? {}) as { output_tokens?: number };
        if (u.output_tokens !== undefined) {
          usage = {
            input: inputTokens,
            output: u.output_tokens,
            total: inputTokens + u.output_tokens,
          };
        }
        return;
      }

      case "message_stop": {
        if (!finished) {
          finished = true;
          emit(controller, serializer.finish(stopReason, usage));
        }
        return;
      }

      case "error": {
        const error = (data.error ?? {}) as { message?: unknown };
        const message =
          typeof error.message === "string"
            ? error.message
            : "Anthropic stream failed";
        finished = true;
        options.onError?.(message);
        emit(controller, serializer.emitError(message));
        return;
      }

      default:
        // ping and unknown events are ignored.
        return;
    }
  };

  // Parse any complete SSE events present in `buffer`, mutating it as events
  // are consumed. Shared between the streaming `transform` and the terminal
  // `flush` (after the decoder is drained) so trailing events aren't lost.
  const drainBufferedEvents = (
    controller: TransformStreamDefaultController<Uint8Array>,
  ): void => {
    // Claude SSE events are separated by blank lines (`\n\n`).
    let sepIdx = buffer.indexOf("\n\n");
    while (sepIdx !== -1) {
      const rawEvent = buffer.slice(0, sepIdx);
      buffer = buffer.slice(sepIdx + 2);

      let eventName = "";
      const dataLines: string[] = [];
      for (const line of rawEvent.split("\n")) {
        if (line.startsWith("event:")) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trim());
        }
      }
      if (eventName && dataLines.length > 0) {
        handleEvent(eventName, dataLines.join("\n"), controller);
      }
      sepIdx = buffer.indexOf("\n\n");
    }
  };

  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      drainBufferedEvents(controller);
    },

    flush(controller) {
      // Drain any bytes still held inside the TextDecoder, then re-run the
      // event parser so a complete trailing event that arrived without a
      // closing `\n\n` is not silently lost.
      buffer += decoder.decode();
      drainBufferedEvents(controller);

      // Closing without message_stop is an interrupted stream, not success.
      if (!finished) {
        finished = true;
        const message = "Anthropic stream ended before message_stop";
        options.onError?.(message);
        emit(controller, serializer.emitError(message));
      }
    },
  });
}
