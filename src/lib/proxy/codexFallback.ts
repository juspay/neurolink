/**
 * Anthropic Messages API fallback over the pooled Codex Responses transport.
 *
 * This module deliberately contains only wire-format conversion and buffered
 * SSE parsing. Account selection, OAuth, cooldowns, and quota persistence stay
 * in the native Codex proxy handler so fallback traffic follows the same pool
 * rules as a native Codex request.
 */

import { extractCodexUsage } from "./codexUsage.js";
import type {
  ClaudeContentBlock,
  ClaudeRequest,
  CodexContentPart,
  CodexFallbackResult,
  CodexReasoningEffort,
  CodexResponsesInputItem,
  CodexResponsesRequest,
  InternalResult,
} from "../types/index.js";

export class CodexFallbackResponseError extends Error {
  readonly status: number;
  readonly responseBody: string;

  constructor(status: number, responseBody: string) {
    super(`Codex fallback request returned HTTP ${status}`);
    this.name = "CodexFallbackResponseError";
    this.status = status;
    this.responseBody = responseBody;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function buildSystemInstructions(body: ClaudeRequest): string | undefined {
  if (typeof body.system === "string") {
    return body.system || undefined;
  }
  if (Array.isArray(body.system)) {
    const text = body.system
      .map((block) => (typeof block.text === "string" ? block.text : ""))
      .filter(Boolean)
      .join("\n\n");
    return text || undefined;
  }
  return undefined;
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
): CodexContentPart {
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
    messageContent.push(toCodexContentPart(block, role));
  }
  flushMessage();
  return input;
}

/** Convert a Claude Messages request into the ChatGPT Codex Responses shape. */
export function convertClaudeRequestToCodex(
  body: ClaudeRequest,
  model: string,
  reasoningEffort?: CodexReasoningEffort,
): CodexResponsesRequest {
  const input = body.messages.flatMap((message) =>
    convertClaudeMessage(message.role, message.content),
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
      throw new Error(`Codex fallback stream terminated with ${type}`);
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
        input: parsedUsage.inputTokens,
        output: parsedUsage.outputTokens,
        total: parsedUsage.inputTokens + parsedUsage.outputTokens,
        cacheReadTokens: parsedUsage.cacheReadTokens,
        cacheCreationTokens: parsedUsage.cacheCreationTokens,
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
    throw new Error("Codex fallback returned no content or tool calls");
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
