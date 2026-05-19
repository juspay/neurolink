import { randomBytes } from "crypto";
import type {
  ClaudeContentBlock,
  ClaudeErrorResponse,
  ClaudeRequest,
  ClaudeResponse,
  ContentBlockType,
  InternalResult,
  ParsedClaudeRequest,
  SSEContentBlockDelta,
  SSEContentBlockDescriptor,
  SSEContentBlockStart,
  SSEContentBlockStop,
  SSEMessageDelta,
  SSEMessageStart,
  StreamLifecycleState,
} from "../types/index.js";
import { normalizeJsonSchemaObject } from "../utils/schemaConversion.js";
import { jsonSchema, tool } from "../utils/tool.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;

/** Generate a unique message id in the Claude format. */
export function generateMessageId(): string {
  _idCounter += 1;
  const rand = Math.random().toString(36).slice(2, 10);
  return `msg_${Date.now().toString(36)}${rand}${_idCounter}`;
}

/** Generate a Claude-format tool use ID (`toolu_` + 24 random chars). */
export function generateToolUseId(): string {
  return `toolu_${randomBytes(18).toString("base64url").slice(0, 24)}`;
}

/**
 * Reset the internal id counter (useful in tests).
 * @internal
 */
export function _resetIdCounter(): void {
  _idCounter = 0;
}

// ---------------------------------------------------------------------------
// Request parser: Claude -> NeuroLink internal format
// ---------------------------------------------------------------------------

/**
 * Parse an incoming Claude Messages API request into an intermediate
 * representation consumable by NeuroLink's generate/stream pipeline.
 *
 * Handles:
 * - System prompt extraction (string or content-block array)
 * - Message flattening (text + image blocks)
 * - Tool definition conversion
 * - tool_choice mapping
 * - top_p pass-through
 * - thinking configuration
 */
export function parseClaudeRequest(body: ClaudeRequest): ParsedClaudeRequest {
  // --- system prompt ---
  let systemPrompt: string | undefined;
  if (typeof body.system === "string") {
    systemPrompt = body.system;
  } else if (Array.isArray(body.system)) {
    systemPrompt = body.system.map((b) => b.text).join("\n\n");
  }

  // --- messages ---
  // Find the index of the last user message so we can distinguish the
  // current turn from history.  Images from historical messages are kept
  // inline as text references in their conversation message; only images
  // from the latest user message are extracted into the top-level `images`
  // array (which feeds NeuroLink's multimodal pipeline).
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
  // layer translates between Claude's wire format and NeuroLink's internal
  // representation. MessageBuilder is for SDK-side message construction from
  // user inputs (files, images, etc.). Claude's API content blocks (text,
  // image, tool_use, tool_result, thinking) are fully handled here. Document/
  // PDF/CSV blocks do not exist in the Claude API format.
  for (let msgIdx = 0; msgIdx < body.messages.length; msgIdx++) {
    const msg = body.messages[msgIdx];
    const isLatestUserMsg = msgIdx === lastUserMsgIdx;

    if (typeof msg.content === "string") {
      conversationMessages.push({ role: msg.role, content: msg.content });
      if (msg.role === "user") {
        lastUserPrompt = msg.content;
      }
    } else if (Array.isArray(msg.content)) {
      const textParts: string[] = [];
      for (const block of msg.content) {
        if (block.type === "text") {
          textParts.push(block.text);
        } else if (block.type === "image") {
          if (isLatestUserMsg) {
            // Current turn: extract full URI to top-level images for the pipeline
            let imageUri = "";
            if (block.source.type === "base64" && block.source.data) {
              const mediaType = block.source.media_type || "image/png";
              imageUri = `data:${mediaType};base64,${block.source.data}`;
            } else if (block.source.type === "url" && block.source.url) {
              imageUri = block.source.url;
            }
            if (imageUri) {
              images.push(imageUri);
            }
          } else {
            // Historical turn: compact placeholder to avoid bloating the prompt
            textParts.push(`[image: ${block.source.type}]`);
          }
        } else if (block.type === "tool_use") {
          // Preserve assistant tool_use blocks so multi-turn tool
          // conversations retain the full call/result chain.
          const inputStr =
            block.input !== undefined ? JSON.stringify(block.input) : "{}";
          textParts.push(`[tool_use:${block.id}:${block.name}] ${inputStr}`);
        } else if (block.type === "tool_result") {
          const resultContent =
            typeof block.content === "string"
              ? block.content
              : Array.isArray(block.content)
                ? block.content
                    .map((b) => (b.type === "text" ? b.text : `[${b.type}]`))
                    .join("\n")
                : "";
          textParts.push(`[tool_result:${block.tool_use_id}] ${resultContent}`);
        } else if (block.type) {
          // Preserve unknown block types (thinking, document, etc.)
          // so they are visible in translated history instead of silently dropped.
          const { type, ...rest } = block;
          const preview = JSON.stringify(rest);
          const truncated =
            preview.length > 200 ? preview.slice(0, 200) + "…" : preview;
          textParts.push(`[${type}: ${truncated}]`);
        }
      }
      const combined = textParts.join("\n");
      conversationMessages.push({ role: msg.role, content: combined });
      if (msg.role === "user") {
        lastUserPrompt = combined;
      }
    }
  }

  // --- tools ---
  const tools: ParsedClaudeRequest["tools"] = {};
  if (body.tools) {
    for (const t of body.tools) {
      tools[t.name] = tool({
        description: t.description ?? "",
        // Fallback providers consume AI SDK-style tools, not Claude wire-format
        // tool descriptors. Wrap the raw JSON schema once here so every
        // downstream provider sees a canonical `inputSchema` shape.
        inputSchema: jsonSchema(
          normalizeJsonSchemaObject(
            t.input_schema ?? { type: "object" as const },
          ),
        ),
      });
    }
  }

  // --- tool_choice ---
  let toolChoice: ParsedClaudeRequest["toolChoice"];
  let toolChoiceName: string | undefined;
  if (body.tool_choice) {
    switch (body.tool_choice.type) {
      case "auto":
        toolChoice = "auto";
        break;
      case "any":
        toolChoice = "required";
        break;
      case "tool":
        toolChoice = "required";
        toolChoiceName = body.tool_choice.name;
        break;
      case "none":
        toolChoice = "none";
        break;
    }
  }

  // --- thinking ---
  let thinkingConfig: ParsedClaudeRequest["thinkingConfig"];
  if (body.thinking) {
    // Claude thinking types: "enabled" (fixed budget), "adaptive" (auto budget), "disabled"
    const isEnabled =
      body.thinking.type === "enabled" || body.thinking.type === "adaptive";
    thinkingConfig = {
      enabled: isEnabled,
      budgetTokens: body.thinking.budget_tokens,
      // Pass the raw type so providers can map "adaptive" appropriately
      ...(body.thinking.type === "adaptive"
        ? { thinkingLevel: "medium" as const }
        : {}),
    };
  }

  return {
    model: body.model,
    maxTokens: body.max_tokens,
    temperature: body.temperature,
    topP: body.top_p,
    topK: body.top_k,
    systemPrompt,
    stream: body.stream === true,
    prompt: lastUserPrompt,
    images,
    conversationMessages,
    tools,
    toolChoice,
    toolChoiceName,
    thinkingConfig,
    metadata: body.metadata,
    stopSequences: body.stop_sequences,
  };
}

// ---------------------------------------------------------------------------
// Response serializer: NeuroLink result -> Claude response
// ---------------------------------------------------------------------------

/**
 * Map NeuroLink finish-reason strings to Claude stop_reason values.
 */
function mapStopReason(finishReason: string | undefined): string | null {
  switch (finishReason) {
    case "stop":
    case "end_turn":
      return "end_turn";
    case "length":
    case "max_tokens":
      return "max_tokens";
    case "tool-calls":
    case "tool_use":
      return "tool_use";
    case "content_filter":
    case "safety":
      return "stop_sequence"; // closest match
    default:
      return finishReason ?? "end_turn";
  }
}

/**
 * Serialize a NeuroLink GenerateResult into a Claude Messages API response.
 */
export function serializeClaudeResponse(
  result: InternalResult,
  requestModel: string,
): ClaudeResponse {
  const content: ClaudeContentBlock[] = [];
  const inferredFinishReason =
    result.toolCalls &&
    result.toolCalls.length > 0 &&
    (!result.finishReason || result.finishReason === "stop")
      ? "tool_use"
      : result.finishReason;

  // Thinking/reasoning content block (if present)
  if (result.reasoning) {
    content.push({ type: "thinking", thinking: result.reasoning });
  }

  // Text content
  if (result.content) {
    content.push({ type: "text", text: result.content });
  }

  // Tool use blocks — normalize IDs to Claude `toolu_` format
  if (result.toolCalls && result.toolCalls.length > 0) {
    for (const tc of result.toolCalls) {
      const toolInput =
        tc.args ??
        (tc as { parameters?: Record<string, unknown> }).parameters ??
        (tc as { input?: Record<string, unknown> }).input ??
        {};
      content.push({
        type: "tool_use",
        id: generateToolUseId(),
        name: tc.toolName,
        input: toolInput,
      });
    }
  }

  // If no content at all, push an empty text block
  if (content.length === 0) {
    content.push({ type: "text", text: "" });
  }

  return {
    id: generateMessageId(),
    type: "message",
    role: "assistant",
    content,
    model: result.model ?? requestModel,
    stop_reason: mapStopReason(inferredFinishReason),
    stop_sequence: null,
    usage: {
      input_tokens: result.usage?.input ?? 0,
      output_tokens: result.usage?.output ?? 0,
      ...(result.usage?.cacheCreationTokens !== undefined && {
        cache_creation_input_tokens: result.usage.cacheCreationTokens,
      }),
      ...(result.usage?.cacheReadTokens !== undefined && {
        cache_read_input_tokens: result.usage.cacheReadTokens,
      }),
    },
  };
}

// ---------------------------------------------------------------------------
// Error envelope
// ---------------------------------------------------------------------------

/** Map HTTP status codes to Claude error types. */
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
    case 413:
      return "request_too_large";
    case 429:
      return "rate_limit_error";
    case 500:
    case 502:
    case 503:
      return "api_error";
    case 529:
      return "overloaded_error";
    default:
      return "api_error";
  }
}

/**
 * Build a Claude-compatible error envelope.
 */
export function buildClaudeError(
  status: number,
  message: string,
  errorType?: string,
): ClaudeErrorResponse {
  return {
    type: "error",
    error: {
      type: errorType ?? errorTypeFromStatus(status),
      message,
    },
  };
}

// ---------------------------------------------------------------------------
// Streaming SSE state machine
// ---------------------------------------------------------------------------

/**
 * Format a single SSE frame (one `event:` + `data:` pair).
 */
export function formatSSE(eventType: string, data: unknown): string {
  const json = JSON.stringify(data);
  return `event: ${eventType}\ndata: ${json}\n\n`;
}

/**
 * Stateful SSE serializer that emits a well-formed Claude SSE stream.
 *
 * Tracks both lifecycle state (`idle` -> `streaming` -> `done`) and the
 * current content block type (`text`, `thinking`, `tool_use`). Each
 * content block gets a unique, monotonically increasing `blockIndex`.
 *
 * Usage:
 * ```ts
 * const sse = new ClaudeStreamSerializer(requestModel, inputTokens);
 *
 * // Thinking deltas
 * for await (const thought of thinkingStream) {
 *   yield* sse.pushThinkingDelta(thought);
 * }
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
 * yield* sse.finish(outputTokens, finishReason);
 * ```
 */
export class ClaudeStreamSerializer {
  private state: StreamLifecycleState = "idle";
  private currentBlockType: ContentBlockType = null;
  private sawToolUseBlock = false;
  private blockIndex = 0;
  private hasOpenedBlock = false;
  private outputTokens = 0;
  private messageStarted = false;
  private readonly messageId: string;
  private readonly model: string;
  private readonly inputTokens: number;

  constructor(model: string, inputTokens = 0) {
    this.messageId = generateMessageId();
    this.model = model;
    this.inputTokens = inputTokens;
  }

  /** Current lifecycle state (exposed for testing). */
  getState(): StreamLifecycleState {
    return this.state;
  }

  /** Current content block type (exposed for testing). */
  getCurrentBlockType(): ContentBlockType {
    return this.currentBlockType;
  }

  /** Current block index (exposed for testing). */
  getBlockIndex(): number {
    return this.blockIndex;
  }

  /**
   * Emit a ping event frame.  The actual periodic timer is wired in
   * the route handler; this method just formats the SSE frame.
   */
  static pingEvent(): string {
    return formatSSE("ping", { type: "ping" });
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  /**
   * Emit `message_start` and initial ping if not already done.
   */
  private *ensureMessageStarted(): Generator<string> {
    if (this.messageStarted) {
      return;
    }

    const messageStart: SSEMessageStart = {
      type: "message_start",
      message: {
        id: this.messageId,
        type: "message",
        role: "assistant",
        content: [],
        model: this.model,
        stop_reason: null,
        stop_sequence: null,
        usage: {
          input_tokens: this.inputTokens,
          output_tokens: 0,
        },
      },
    };
    yield formatSSE("message_start", messageStart);
    yield formatSSE("ping", { type: "ping" });

    this.messageStarted = true;
    this.state = "streaming";
  }

  /**
   * Close the current content block if one is open.
   */
  private *closeCurrentBlock(): Generator<string> {
    if (this.currentBlockType === null) {
      return;
    }

    yield formatSSE("content_block_stop", {
      type: "content_block_stop",
      index: this.blockIndex,
    } satisfies SSEContentBlockStop);

    this.currentBlockType = null;
  }

  /**
   * Open a new content block of the given type.
   * Increments blockIndex for each new block.
   */
  private *openBlock(descriptor: SSEContentBlockDescriptor): Generator<string> {
    // Close any existing block first
    yield* this.closeCurrentBlock();

    // Increment index for every block after the first.
    // Use a persistent flag instead of checking currentBlockType,
    // because closeCurrentBlock() (and pushToolUse which calls it)
    // resets currentBlockType to null before we get here.
    if (this.hasOpenedBlock) {
      this.blockIndex += 1;
    }
    this.hasOpenedBlock = true;

    const blockStart: SSEContentBlockStart = {
      type: "content_block_start",
      index: this.blockIndex,
      content_block: descriptor,
    };
    yield formatSSE("content_block_start", blockStart);

    this.currentBlockType = descriptor.type as ContentBlockType;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Emit the opening frames: message_start and ping.
   * The first actual content decides which content block opens next.
   */
  *start(): Generator<string> {
    if (this.state !== "idle") {
      return;
    }

    yield* this.ensureMessageStarted();
  }

  /**
   * Push a text delta.  Returns zero or more SSE frames.
   * If currently in a thinking block, the thinking block is closed first.
   */
  *pushDelta(text: string): Generator<string> {
    if (this.state === "done" || this.state === "error") {
      return;
    }

    yield* this.ensureMessageStarted();

    // Transition from thinking/tool_use to text, or start first text block
    if (this.currentBlockType !== "text") {
      yield* this.openBlock({ type: "text", text: "" });
    }

    const delta: SSEContentBlockDelta = {
      type: "content_block_delta",
      index: this.blockIndex,
      delta: { type: "text_delta", text },
    };
    yield formatSSE("content_block_delta", delta);
  }

  /**
   * Push a thinking delta.  Returns zero or more SSE frames.
   * If currently in a text or tool_use block, that block is closed first
   * and a new thinking block is opened.
   */
  *pushThinkingDelta(text: string): Generator<string> {
    if (this.state === "done" || this.state === "error") {
      return;
    }

    yield* this.ensureMessageStarted();

    // Open a thinking block if not already in one
    if (this.currentBlockType !== "thinking") {
      yield* this.openBlock({ type: "thinking", thinking: "" });
    }

    const delta: SSEContentBlockDelta = {
      type: "content_block_delta",
      index: this.blockIndex,
      delta: { type: "thinking_delta", thinking: text },
    };
    yield formatSSE("content_block_delta", delta);
  }

  /**
   * Push a complete tool use block.
   *
   * 1. Closes any open content block
   * 2. Emits `content_block_start` with `{type: "tool_use", id, name}`
   * 3. JSON-stringifies the input, chunks it into ~100 char segments
   * 4. Emits `content_block_delta` with `{type: "input_json_delta", partial_json}` per chunk
   * 5. Emits `content_block_stop`
   */
  *pushToolUse(id: string, name: string, input: unknown): Generator<string> {
    if (this.state === "done" || this.state === "error") {
      return;
    }

    this.sawToolUseBlock = true;
    yield* this.ensureMessageStarted();

    // Open a tool_use block (closes any current block)
    yield* this.openBlock({ type: "tool_use", id, name, input: "" });

    // Serialize and chunk the input JSON
    const jsonStr = JSON.stringify(input ?? {});
    const CHUNK_SIZE = 100;
    for (let i = 0; i < jsonStr.length; i += CHUNK_SIZE) {
      const chunk = jsonStr.slice(i, i + CHUNK_SIZE);
      const delta: SSEContentBlockDelta = {
        type: "content_block_delta",
        index: this.blockIndex,
        delta: { type: "input_json_delta", partial_json: chunk },
      };
      yield formatSSE("content_block_delta", delta);
    }

    // If the input was empty object, still emit at least one delta
    if (jsonStr.length === 0) {
      const delta: SSEContentBlockDelta = {
        type: "content_block_delta",
        index: this.blockIndex,
        delta: { type: "input_json_delta", partial_json: "{}" },
      };
      yield formatSSE("content_block_delta", delta);
    }

    // Close the tool_use block
    yield* this.closeCurrentBlock();
  }

  /**
   * Finalize the stream: content_block_stop, message_delta, message_stop.
   */
  *finish(outputTokens?: number, finishReason?: string): Generator<string> {
    // If we never started (empty response), start first
    if (this.state === "idle") {
      yield* this.ensureMessageStarted();
    }

    if (this.state === "done" || this.state === "error") {
      return;
    }

    this.outputTokens = outputTokens ?? this.outputTokens;
    const resolvedFinishReason =
      this.sawToolUseBlock && (!finishReason || finishReason === "stop")
        ? "tool_use"
        : finishReason;

    // Close any open content block
    yield* this.closeCurrentBlock();

    // message_delta
    const messageDelta: SSEMessageDelta = {
      type: "message_delta",
      delta: {
        stop_reason: mapStopReason(resolvedFinishReason),
        stop_sequence: null,
      },
      usage: { output_tokens: this.outputTokens },
    };
    yield formatSSE("message_delta", messageDelta);

    // message_stop
    yield formatSSE("message_stop", { type: "message_stop" });

    this.state = "done";
  }

  /**
   * Emit an error event.  Transitions to terminal ERROR state.
   */
  *emitError(status: number, message: string): Generator<string> {
    this.state = "error";
    const errorPayload = buildClaudeError(status, message);
    yield formatSSE("error", errorPayload);
  }
}
