/**
 * Anthropic Messages API fallback over the pooled Codex Responses transport.
 *
 * This module deliberately contains only wire-format conversion and buffered
 * SSE parsing. Account selection, OAuth, cooldowns, and quota persistence stay
 * in the native Codex proxy handler so fallback traffic follows the same pool
 * rules as a native Codex request.
 */

import { createHash } from "node:crypto";
import { ClaudeStreamSerializer, generateToolUseId } from "./claudeFormat.js";
import { classifyProxyFailureCode } from "./proxyFailureDetails.js";
import { extractCodexUsage } from "./codexUsage.js";
import { proxyTokenUsage } from "./proxyTokenUsage.js";
import { sanitizeForLog } from "../utils/logSanitize.js";
import type {
  ClaudeContentBlock,
  ClaudeRequest,
  CodexContentPart,
  CodexFallbackResult,
  CodexFallbackStream,
  CodexReasoningEffort,
  CodexResponsesInputItem,
  CodexResponsesRequest,
  InternalResult,
} from "../types/index.js";

export class CodexFallbackResponseError extends Error {
  readonly status: number;
  readonly responseBody: string;
  readonly code?: string;
  readonly retryable?: boolean;

  constructor(status: number, responseBody: string) {
    super(`Codex fallback request returned HTTP ${status}`);
    this.name = "CodexFallbackResponseError";
    this.status = status;
    this.responseBody = responseBody;
    try {
      const payload: unknown = JSON.parse(responseBody);
      if (isRecord(payload)) {
        const detail = streamFailureDetails(payload, "http_error");
        this.code = detail.code;
        this.retryable = detail.retryable;
        if (detail.message) {
          this.message = detail.message;
        }
      }
    } catch {
      // Non-JSON upstream responses retain the HTTP status without exposing HTML.
    }
  }
}

/** A provider terminal event, preserved through the format adapter. */
export class CodexFallbackStreamError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryable?: boolean;
  readonly usage?: CodexFallbackResult["usage"];

  constructor(
    payload: Record<string, unknown>,
    eventType: string,
    usage?: CodexFallbackResult["usage"],
  ) {
    const detail = streamFailureDetails(payload, eventType);
    super(
      detail.message ?? `Codex fallback stream terminated with ${eventType}`,
    );
    this.name = "CodexFallbackStreamError";
    this.code = detail.code;
    this.status = detail.status;
    this.retryable = detail.retryable;
    const observed = extractCodexUsage(payload);
    this.usage = observed
      ? {
          ...proxyTokenUsage({
            inputTokens: observed.inputTokens,
            outputTokens: observed.outputTokens,
            reasoningTokens: observed.reasoningTokensObserved
              ? observed.reasoningTokens
              : undefined,
            cacheReadTokens: observed.cacheReadTokens,
            cacheCreationTokens: observed.cacheCreationTokens,
            inputIncludesCachedTokens: true,
          }),
          inputTokensObserved: observed.inputTokensObserved,
          outputTokensObserved: observed.outputTokensObserved,
          cacheReadTokensObserved: observed.cacheReadTokensObserved,
          cacheCreationTokensObserved: observed.cacheCreationTokensObserved,
        }
      : usage;
  }
}

function streamFailureDetails(
  payload: Record<string, unknown>,
  eventType: string,
) {
  const response = isRecord(payload.response) ? payload.response : payload;
  const error = isRecord(response.error) ? response.error : response;
  const incomplete = isRecord(response.incomplete_details)
    ? response.incomplete_details
    : {};
  const code = sanitizeForLog(
    asNonEmptyString(error.code) ??
      asNonEmptyString(incomplete.reason) ??
      eventType,
    200,
  );
  const known = classifyProxyFailureCode(code);
  return {
    code,
    status: known.status ?? 502,
    retryable:
      known.retryable ??
      (typeof error.retryable === "boolean" ? error.retryable : undefined),
    message:
      typeof error.message === "string"
        ? sanitizeForLog(error.message, 500)
        : undefined,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function buildSystemInstructions(body: ClaudeRequest): string | undefined {
  const instructions: string[] = [];
  if (typeof body.system === "string") {
    if (body.system) {
      instructions.push(body.system);
    }
  } else if (Array.isArray(body.system)) {
    const text = body.system
      .map((block) => (typeof block.text === "string" ? block.text : ""))
      .filter(Boolean)
      .join("\n\n");
    if (text) {
      instructions.push(text);
    }
  }
  for (const message of body.messages) {
    // Claude's public Messages type restricts message roles to user/assistant,
    // but Claude Code can emit an inline system message for context-management
    // edits. Preserve its text as instructions instead of sending a non-leading
    // system item to the Codex conversation input.
    if ((message.role as string) !== "system") {
      continue;
    }
    const text =
      typeof message.content === "string"
        ? message.content
        : message.content
            .map((block) => (block.type === "text" ? block.text : ""))
            .filter(Boolean)
            .join("\n");
    if (text) {
      instructions.push(text);
    }
  }
  return instructions.length > 0 ? instructions.join("\n\n") : undefined;
}

function imageUrlForBlock(
  block: Extract<ClaudeContentBlock, { type: "image" }>,
): string | undefined {
  if (block.source.type === "url" && block.source.url) {
    return block.source.url;
  }
  if (block.source.type === "base64" && block.source.data) {
    return `data:${block.source.media_type ?? "image/png"};base64,${block.source.data}`;
  }
  return undefined;
}

function flattenClaudeContent(content: string | ClaudeContentBlock[]): string {
  if (typeof content === "string") {
    return content;
  }

  return content
    .map((block) => {
      switch (block.type) {
        case "text":
          return block.text;
        case "thinking":
          return block.thinking;
        case "image":
          return "[image attachment]";
        case "tool_use":
          return `[tool call ${block.name}] ${JSON.stringify(block.input ?? {})}`;
        case "tool_result":
          return flattenClaudeContent(block.content);
      }
    })
    .join("\n");
}

function toCodexContentPart(
  block: Exclude<ClaudeContentBlock, { type: "tool_use" | "tool_result" }>,
  role: "user" | "assistant",
): CodexContentPart | undefined {
  const textType = role === "assistant" ? "output_text" : "input_text";
  switch (block.type) {
    case "text":
      return { type: textType, text: block.text };
    case "thinking":
      return { type: textType, text: block.thinking };
    case "image": {
      const imageUrl = imageUrlForBlock(block);
      if (role === "user" && imageUrl) {
        return { type: "input_image", image_url: imageUrl };
      }
      return { type: textType, text: "[image attachment]" };
    }
  }
}

function convertClaudeMessage(
  role: "user" | "assistant",
  content: string | ClaudeContentBlock[],
): CodexResponsesInputItem[] {
  if (typeof content === "string") {
    return [
      {
        role,
        content: [
          {
            type: role === "assistant" ? "output_text" : "input_text",
            text: content,
          },
        ],
      },
    ];
  }

  const input: CodexResponsesInputItem[] = [];
  let messageContent: CodexContentPart[] = [];
  const flushMessage = (): void => {
    if (messageContent.length === 0) {
      return;
    }
    input.push({ role, content: messageContent });
    messageContent = [];
  };

  for (const block of content) {
    if (block.type === "tool_use") {
      flushMessage();
      input.push({
        type: "function_call",
        call_id: block.id,
        name: block.name,
        arguments: JSON.stringify(block.input ?? {}),
      });
      continue;
    }
    if (block.type === "tool_result") {
      flushMessage();
      input.push({
        type: "function_call_output",
        call_id: block.tool_use_id,
        output: flattenClaudeContent(block.content),
      });
      continue;
    }
    // Claude Code context-management messages can contain `tool_addition`
    // blocks. The live tool definitions are already carried by `body.tools`;
    // these history markers must not become undefined array entries because
    // JSON encodes array undefined values as null and Codex rejects them.
    if ((block.type as string) === "tool_addition") {
      continue;
    }
    const contentPart = toCodexContentPart(block, role);
    if (contentPart) {
      messageContent.push(contentPart);
    }
  }
  flushMessage();
  return input;
}

/**
 * Routing key that pins a request to the cache already holding its prefix.
 *
 * Anthropic caching is explicit — the client marks breakpoints and the provider
 * honours them. OpenAI caching is automatic: a prefix is reused only when the
 * request lands on infrastructure already holding it, and `prompt_cache_key` is
 * what pins a request to one. Without it this hop takes its chances on routing,
 * which is the worst case for a fallback that arrives in bursts separated by
 * long gaps.
 *
 * The key must therefore describe the *prefix*, not the caller. Keying it by
 * session id gives every session a private namespace, so N agents that share
 * one system prompt and tool set each pay that shared prefix in full rather
 * than paying it once — the cost is linear in fan-out width and invisible,
 * because each request looks individually well-behaved. Across 42 captured
 * fallback bodies the prefixes collapse to 10 distinct values, the largest
 * shared by 12 requests belonging to different sessions.
 *
 * So derive the key from the prefix itself: the instructions and the tool
 * declarations, which are exactly the leading bytes the upstream caches and
 * the only part stable across a conversation's turns. Identical prefixes then
 * share one cache across sessions and subagents, a prefix that genuinely
 * differs still gets its own key so nothing unrelated contends, and turns
 * within one session keep sharing a key because neither input changes between
 * them.
 *
 * A request carrying neither instructions nor tools has no prefix worth
 * pinning, and falls back to the session id so its turns at least stay
 * together. With neither available the field is omitted rather than filled
 * with something shared: a key common to every request would pin unrelated
 * prefixes onto one cache instead of separating them.
 *
 * The digest covers only content already sent upstream in `instructions` and
 * `tools`; no account, device or session identifier reaches the wire.
 */
export function codexPromptCacheKey(body: ClaudeRequest): string | undefined {
  const prefix = codexCachePrefix(body);
  if (prefix !== undefined) {
    return createHash("sha256").update(prefix).digest("hex");
  }
  const sessionId = codexSessionId(body);
  if (sessionId !== undefined) {
    return createHash("sha256").update(sessionId).digest("hex");
  }
  return undefined;
}

/**
 * How much of the instructions the key covers.
 *
 * Claude Code's system prompt is not byte-stable: measured across live 16,722
 * character prompts, the first 14,768 characters (88.3%) are identical and the
 * divergence sits in a trailing session-memory section that is rewritten every
 * turn. Hashing the whole thing therefore produces a fresh key per request —
 * the opposite of pinning. Hashing a bounded head instead tracks the part the
 * upstream can actually reuse, since its cache is built forward from the first
 * token.
 *
 * 8192 is below the observed divergence point with margin, and the error is
 * asymmetric: too long only costs sharing, while too short pins genuinely
 * unrelated prefixes onto one cache where they evict each other.
 *
 * The bound only helps a prompt long enough to have a tail beyond it. A
 * shorter prompt is hashed whole, so a churning section inside it would move
 * the key every turn — where keying by session used to hold still. Measured on
 * the same corpus, that does not happen: 85 of 92 prompts carrying a system
 * block sit under this bound, and within a session they resolve to a handful
 * of keys rather than one per request (28 requests to 4 keys, 17 to 2, 31 to
 * 2) — those are distinct agents, not one agent churning. Identifying the
 * stable section structurally would remove the assumption, and is worth doing
 * if a prompt ever proves otherwise.
 */
const CACHE_KEY_PREFIX_CHARS = 8192;

/**
 * The leading, turn-stable bytes of a Codex request: a bounded head of the
 * instructions plus the tool names, which distinguish one agent's tool surface
 * from another's when their instructions open identically. Descriptions and
 * schemas are deliberately left out — they sit behind the instructions in the
 * prefix, so two requests agreeing on this much already share a cacheable head
 * worth routing together.
 */
function codexCachePrefix(body: ClaudeRequest): string | undefined {
  const head = (buildSystemInstructions(body) ?? "").slice(
    0,
    CACHE_KEY_PREFIX_CHARS,
  );
  const toolNames = (body.tools ?? []).map((tool) => tool.name).join("\u0000");
  if (!head && !toolNames) {
    return undefined;
  }
  return `${head}\u0001${toolNames}`;
}

/** Claude Code carries its session id inside `metadata.user_id`. */
function codexSessionId(body: ClaudeRequest): string | undefined {
  const raw = body.metadata?.user_id;
  if (typeof raw !== "string" || raw.length === 0) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return undefined;
  }
  const fields = parsed as Record<string, unknown>;
  const sessionId = fields.session_id ?? fields.parent_session_id;
  return typeof sessionId === "string" && sessionId.length > 0
    ? sessionId
    : undefined;
}

/** Convert a Claude Messages request into the ChatGPT Codex Responses shape. */
export function convertClaudeRequestToCodex(
  body: ClaudeRequest,
  model: string,
  reasoningEffort?: CodexReasoningEffort,
): CodexResponsesRequest {
  const input = body.messages.flatMap((message) =>
    (message.role as string) === "system"
      ? []
      : convertClaudeMessage(message.role, message.content),
  );
  const request: CodexResponsesRequest = {
    model,
    input,
    stream: true,
    // ChatGPT's backend rejects requests unless this is explicitly false.
    store: false,
    ...(reasoningEffort !== undefined
      ? { reasoning: { effort: reasoningEffort } }
      : {}),
  };

  const promptCacheKey = codexPromptCacheKey(body);
  if (promptCacheKey) {
    request.prompt_cache_key = promptCacheKey;
  }

  const instructions = buildSystemInstructions(body);
  if (instructions) {
    request.instructions = instructions;
  }
  if (body.tools && body.tools.length > 0) {
    request.tools = body.tools.map((tool) => ({
      type: "function",
      name: tool.name,
      ...(tool.description ? { description: tool.description } : {}),
      parameters: tool.input_schema,
    }));
  }
  if (body.tool_choice) {
    switch (body.tool_choice.type) {
      case "any":
        request.tool_choice = "required";
        break;
      case "tool":
        request.tool_choice = { type: "function", name: body.tool_choice.name };
        break;
      default:
        request.tool_choice = body.tool_choice.type;
        break;
    }
  }
  // The ChatGPT Codex backend is not the public Responses API. In particular,
  // it rejects `max_output_tokens`, and its model-owned sampling controls do
  // not map safely from Anthropic's `temperature` or `top_p`. Omit all three
  // so the backend uses its supported defaults instead of rejecting fallback
  // traffic before it can be served.
  return request;
}

function parseFunctionArguments(value: unknown): Record<string, unknown> {
  if (isRecord(value)) {
    return value;
  }
  if (typeof value !== "string") {
    throw new Error("Codex fallback function call is missing JSON arguments");
  }
  try {
    const parsed: unknown = JSON.parse(value || "{}");
    if (!isRecord(parsed)) {
      throw new Error("not an object");
    }
    return parsed;
  } catch {
    throw new Error(
      "Codex fallback function call returned invalid JSON arguments",
    );
  }
}

function outputTextFromItem(value: unknown): string {
  if (
    !isRecord(value) ||
    value.type !== "message" ||
    !Array.isArray(value.content)
  ) {
    return "";
  }
  return value.content
    .filter(isRecord)
    .filter((part) => part.type === "output_text")
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("");
}

function addFunctionCall(
  item: Record<string, unknown>,
  toolCalls: Map<string, NonNullable<InternalResult["toolCalls"]>[number]>,
): void {
  if (item.type !== "function_call") {
    return;
  }
  const callId = asNonEmptyString(item.call_id);
  const name = asNonEmptyString(item.name);
  if (!callId || !name) {
    throw new Error("Codex fallback function call is missing an id or name");
  }
  toolCalls.set(callId, {
    toolCallId: callId,
    toolName: name,
    args: parseFunctionArguments(item.arguments),
  });
}

function parseSSEPayloads(
  sse: string,
): Array<{ event?: string; payload: Record<string, unknown> }> {
  const frames = sse.replace(/\r\n?/g, "\n").split("\n\n");
  const parsed: Array<{ event?: string; payload: Record<string, unknown> }> =
    [];

  for (const frame of frames) {
    if (!frame.trim()) {
      continue;
    }
    let event: string | undefined;
    const data: string[] = [];
    for (const line of frame.split("\n")) {
      if (!line || line.startsWith(":")) {
        continue;
      }
      if (line.startsWith("event:")) {
        event = line.slice("event:".length).trim();
        continue;
      }
      if (line.startsWith("data:")) {
        data.push(line.slice("data:".length).trimStart());
        continue;
      }
      if (line.startsWith("id:") || line.startsWith("retry:")) {
        continue;
      }
      // SSE permits extension fields that this parser does not consume.
      continue;
    }
    if (data.length === 0) {
      continue;
    }
    const raw = data.join("\n").trim();
    if (raw === "[DONE]") {
      continue;
    }
    try {
      const payload: unknown = JSON.parse(raw);
      if (!isRecord(payload)) {
        throw new Error("not an object");
      }
      parsed.push({ event, payload });
    } catch {
      throw new Error("Codex fallback stream contains malformed JSON");
    }
  }

  return parsed;
}

function responseStatus(payload: Record<string, unknown>): string | undefined {
  const response = payload.response;
  return isRecord(response) ? asNonEmptyString(response.status) : undefined;
}

function outputTextFromResponse(payload: Record<string, unknown>): string {
  const response = payload.response;
  if (!isRecord(response) || !Array.isArray(response.output)) {
    return "";
  }
  return response.output.map(outputTextFromItem).join("");
}

/**
 * Parse a complete Codex Responses SSE stream before emitting Claude output.
 *
 * A missing terminal event, malformed JSON, terminal error, or empty response
 * is rejected. That makes it safe for the caller to try the next configured
 * fallback without ever replaying output already sent to a client.
 */
export function parseCodexFallbackSSE(sse: string): CodexFallbackResult {
  const payloads = parseSSEPayloads(sse);
  const toolCalls = new Map<
    string,
    NonNullable<InternalResult["toolCalls"]>[number]
  >();
  let textFromDeltas = "";
  let textFromCompletedItems = "";
  let textFromResponse = "";
  let usage: CodexFallbackResult["usage"];
  let sawCompleted = false;

  for (const { event, payload } of payloads) {
    const type = asNonEmptyString(payload.type) ?? event;
    if (!type) {
      throw new Error("Codex fallback stream event is missing a type");
    }
    if (
      type === "error" ||
      type === "response.failed" ||
      type === "response.incomplete"
    ) {
      throw new CodexFallbackStreamError(payload, type, usage);
    }
    if (type === "response.output_text.delta") {
      if (typeof payload.delta !== "string") {
        throw new Error("Codex fallback text delta is malformed");
      }
      textFromDeltas += payload.delta;
      continue;
    }
    if (type === "response.output_item.done") {
      if (!isRecord(payload.item)) {
        throw new Error("Codex fallback output item is malformed");
      }
      addFunctionCall(payload.item, toolCalls);
      textFromCompletedItems += outputTextFromItem(payload.item);
      continue;
    }
    if (type !== "response.completed") {
      continue;
    }

    if (sawCompleted) {
      throw new Error(
        "Codex fallback stream emitted more than one completion event",
      );
    }
    sawCompleted = true;
    const status = responseStatus(payload);
    if (status !== "completed") {
      throw new Error(
        `Codex fallback stream completed with unexpected status ${status ?? "unknown"}`,
      );
    }
    const parsedUsage = extractCodexUsage(payload);
    if (parsedUsage) {
      usage = {
        ...proxyTokenUsage({
          inputTokens: parsedUsage.inputTokens,
          outputTokens: parsedUsage.outputTokens,
          reasoningTokens: parsedUsage.reasoningTokensObserved
            ? parsedUsage.reasoningTokens
            : undefined,
          cacheReadTokens: parsedUsage.cacheReadTokens,
          cacheCreationTokens: parsedUsage.cacheCreationTokens,
          inputIncludesCachedTokens: true,
        }),
        inputTokensObserved: parsedUsage.inputTokensObserved,
        outputTokensObserved: parsedUsage.outputTokensObserved,
        cacheReadTokensObserved: parsedUsage.cacheReadTokensObserved,
        cacheCreationTokensObserved: parsedUsage.cacheCreationTokensObserved,
      };
    }
    textFromResponse = outputTextFromResponse(payload);
  }

  if (!sawCompleted) {
    throw new Error("Codex fallback stream ended before response.completed");
  }
  const text = textFromDeltas || textFromCompletedItems || textFromResponse;
  const resolvedToolCalls = [...toolCalls.values()];
  if (!text && resolvedToolCalls.length === 0) {
    throw new CodexFallbackStreamError(
      {
        code: "empty_response",
        message: "Codex fallback returned no content or tool calls",
      },
      "empty_response",
      usage,
    );
  }
  return {
    text,
    toolCalls: resolvedToolCalls,
    ...(usage ? { usage } : {}),
    finishReason: resolvedToolCalls.length > 0 ? "tool_use" : "end_turn",
  };
}

/** Consume and validate a native Codex response before producing Claude output. */
export async function consumeCodexFallbackResponse(
  response: Response,
): Promise<CodexFallbackResult> {
  if (!response.ok) {
    throw new CodexFallbackResponseError(
      response.status,
      await response.text().catch(() => ""),
    );
  }
  if (!response.body) {
    throw new Error("Codex fallback returned an empty stream");
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("text/event-stream")) {
    // Consume it before failing so the underlying connection can be reused.
    await response.text().catch(() => "");
    throw new Error("Codex fallback returned a non-SSE response");
  }
  return parseCodexFallbackSSE(await response.text());
}

/**
 * Translate a Codex stream as events arrive. A completed tool call is emitted
 * once its arguments validate; text does not wait for response.completed.
 * The caller owns error framing and must never retry after emitting output.
 */
export async function createCodexFallbackStream(
  response: Response,
  model: string,
): Promise<CodexFallbackStream> {
  if (!response.ok) {
    throw new CodexFallbackResponseError(
      response.status,
      await response.text().catch(() => ""),
    );
  }
  if (
    !response.body ||
    !(response.headers.get("content-type") ?? "")
      .toLowerCase()
      .includes("text/event-stream")
  ) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error("Codex fallback returned a non-SSE or empty response");
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
  async function* frames(): AsyncGenerator<string, CodexFallbackResult> {
    const serializer = new ClaudeStreamSerializer(model);
    const decoder = new TextDecoder();
    const toolCalls = new Map<
      string,
      NonNullable<InternalResult["toolCalls"]>[number]
    >();
    const emittedTools = new Set<string>();
    const emittedTextItems = new Set<number>();
    const textParts: string[] = [];
    let textLength = 0;
    let toolChars = 0;
    let carry = "";
    let searchFrom = 0;
    let completed = false;
    let usage: CodexFallbackResult["usage"];
    const maxChars = 16 * 1024 * 1024;
    function* text(value: string, index: number): Generator<string> {
      if (!value) {
        return;
      }
      textLength += value.length;
      if (textLength > maxChars) {
        throw new Error("Codex fallback output exceeded the stream limit");
      }
      textParts.push(value);
      emittedTextItems.add(index);
      yield* serializer.pushDelta(value);
    }
    function* item(value: unknown, index: number): Generator<string> {
      if (!isRecord(value)) {
        throw new Error("Codex fallback output item is malformed");
      }
      if (value.type === "function_call") {
        const id = asNonEmptyString(value.call_id);
        if (!id || !emittedTools.has(id)) {
          toolChars += JSON.stringify(value).length;
          if (toolChars > maxChars || toolCalls.size >= 4096) {
            throw new Error("Codex fallback tools exceeded the stream limit");
          }
          addFunctionCall(value, toolCalls);
          const call = id ? toolCalls.get(id) : undefined;
          if (id && call) {
            emittedTools.add(id);
            yield* serializer.pushToolUse(
              generateToolUseId(),
              call.toolName,
              call.args,
            );
          }
        }
      }
      if (!emittedTextItems.has(index)) {
        yield* text(outputTextFromItem(value), index);
      }
    }
    function* event(frame: string): Generator<string> {
      for (const { event: eventName, payload } of parseSSEPayloads(frame)) {
        const type = asNonEmptyString(payload.type) ?? eventName;
        if (!type) {
          throw new Error("Codex fallback stream event is missing a type");
        }
        if (completed) {
          throw new Error(
            "Codex fallback stream emitted events after completion",
          );
        }
        if (
          type === "error" ||
          type === "response.failed" ||
          type === "response.incomplete"
        ) {
          throw new CodexFallbackStreamError(payload, type, usage);
        }
        const index =
          typeof payload.output_index === "number" ? payload.output_index : 0;
        if (type === "response.output_text.delta") {
          if (typeof payload.delta !== "string") {
            throw new Error("Codex fallback text delta is malformed");
          }
          yield* text(payload.delta, index);
        } else if (type === "response.output_item.done") {
          if (!isRecord(payload.item)) {
            throw new Error("Codex fallback output item is malformed");
          }
          yield* item(payload.item, index);
        } else if (type === "response.completed") {
          if (responseStatus(payload) !== "completed") {
            throw new Error("Codex fallback response did not complete");
          }
          completed = true;
          const parsedUsage = extractCodexUsage(payload);
          if (parsedUsage) {
            usage = {
              ...proxyTokenUsage({
                inputTokens: parsedUsage.inputTokens,
                outputTokens: parsedUsage.outputTokens,
                reasoningTokens: parsedUsage.reasoningTokensObserved
                  ? parsedUsage.reasoningTokens
                  : undefined,
                cacheReadTokens: parsedUsage.cacheReadTokens,
                cacheCreationTokens: parsedUsage.cacheCreationTokens,
                inputIncludesCachedTokens: true,
              }),
              inputTokensObserved: parsedUsage.inputTokensObserved,
              outputTokensObserved: parsedUsage.outputTokensObserved,
              cacheReadTokensObserved: parsedUsage.cacheReadTokensObserved,
              cacheCreationTokensObserved:
                parsedUsage.cacheCreationTokensObserved,
            };
          }
          const responseBody = payload.response;
          if (isRecord(responseBody) && Array.isArray(responseBody.output)) {
            for (const [i, output] of responseBody.output.entries()) {
              yield* item(output, i);
            }
          }
        }
      }
    }
    try {
      yield* serializer.start();
      while (true) {
        let chunk: ReadableStreamReadResult<Uint8Array>;
        try {
          chunk = await reader.read();
        } catch (err) {
          // A premature stream close after a complete SSE stream (but before
          // the zero-length terminator) rejects here. If response.completed
          // already landed, treat the close as a normal end-of-stream rather
          // than failing a fully successful turn; otherwise this is genuine
          // truncation and must still fail visibly.
          if (completed) {
            break;
          }
          throw err;
        }
        carry += decoder.decode(chunk.value, { stream: !chunk.done });
        // Search only new bytes plus the boundary overlap. Long tool payloads
        // split over many chunks must not rescan their accumulated prefix.
        const boundary = /\r?\n\r?\n/g;
        boundary.lastIndex = searchFrom;
        let match: RegExpExecArray | null;
        while ((match = boundary.exec(carry)) !== null) {
          if (match.index > maxChars) {
            throw new Error("Codex fallback event exceeded the stream limit");
          }
          yield* event(carry.slice(0, match.index));
          carry = carry.slice(match.index + match[0].length);
          boundary.lastIndex = 0;
        }
        if (carry.length > maxChars) {
          throw new Error("Codex fallback event exceeded the stream limit");
        }
        searchFrom = Math.max(0, carry.length - 3);
        if (chunk.done) {
          break;
        }
      }
      if (carry.trim()) {
        yield* event(carry);
      }
      if (!completed) {
        throw new Error(
          "Codex fallback stream ended before response.completed",
        );
      }
      if (textLength === 0 && toolCalls.size === 0) {
        throw new CodexFallbackStreamError(
          {
            code: "empty_response",
            message: "Codex fallback returned no content or tool calls",
          },
          "empty_response",
          usage,
        );
      }
      const finishReason = toolCalls.size > 0 ? "tool_use" : "end_turn";
      // A count Codex never reported is omitted rather than sent as 0: this is
      // what the Claude client reads, and a zero there is indistinguishable
      // from an observed cache miss. `proxyTokenUsage` floors an absent count
      // to 0, so the observation flags are the only thing that still knows.
      yield* serializer.finish(usage?.output, finishReason, {
        input_tokens: usage?.input,
        cache_read_input_tokens: usage?.cacheReadTokensObserved
          ? usage.cacheReadTokens
          : undefined,
        cache_creation_input_tokens: usage?.cacheCreationTokensObserved
          ? usage.cacheCreationTokens
          : undefined,
      });
      return {
        text: textParts.join(""),
        toolCalls: [...toolCalls.values()],
        finishReason,
        ...(usage ? { usage } : {}),
      };
    } finally {
      await cancel();
      reader.releaseLock();
    }
  }
  return { frames: frames(), cancel };
}
