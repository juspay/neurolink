/**
 * Shared OpenAI chat-completions wire-format helpers used by providers that
 * talk to an OpenAI-shaped /chat/completions endpoint (openai-compatible,
 * litellm, groq, perplexity, xai, fireworks, togetherAi, cohere, cloudflare,
 * huggingFace, llamaCpp, lmStudio, deepseek, nvidiaNim, and openAI itself).
 *
 * Everything in this module is provider-agnostic: pure functions that convert
 * between NeuroLink-shaped values and the OpenAI wire format, plus the SSE
 * parser + queue primitives a streaming provider needs. Provider classes own
 * their own orchestration (executeStream + runStreamLoop) for now — that
 * extraction is a follow-up PR.
 *
 * Nothing here imports from "ai" or "@ai-sdk/*". The whole point of this
 * module is to be the native replacement for the AI SDK's OpenAI wrapper.
 */

import { createParser, type EventSourceMessage } from "eventsource-parser";
import type {
  OpenAICompatBuildBodyArgs,
  OpenAICompatChatMessage,
  OpenAICompatChatRequest,
  OpenAICompatChatStreamChunk,
  OpenAICompatChatTool,
  OpenAICompatErrorBody,
  OpenAICompatMessage,
  OpenAICompatMessageContent,
  OpenAICompatResponseFormat,
  OpenAICompatSSEResult,
  OpenAICompatStreamChunk,
  OpenAICompatToolCallWire,
  OpenAICompatToolChoiceWire,
  OpenAICompatV3CallToolChoice,
  OpenAICompatV3CallTools,
  Tool,
} from "../types/index.js";
import { convertZodToJsonSchema } from "../utils/schemaConversion.js";

export const stripTrailingSlash = (s: string): string => s.replace(/\/+$/, "");

export const safeStringify = (value: unknown): string => {
  try {
    return JSON.stringify(value ?? "");
  } catch {
    return String(value ?? "");
  }
};

export const stringifyToolInput = (input: unknown): string => {
  if (typeof input === "string") {
    return input;
  }
  try {
    return JSON.stringify(input ?? {});
  } catch {
    return "{}";
  }
};

// V3 tool-result `output` is a tagged union ({type:"text"|"json"|...}).
// Serialize each variant the way an OpenAI-compatible endpoint expects
// to read it as the `content` of a `role: "tool"` message.
export const stringifyToolOutput = (output: unknown): string => {
  if (output === null || output === undefined) {
    return "";
  }
  if (typeof output === "string") {
    return output;
  }
  if (typeof output !== "object") {
    return String(output);
  }
  const o = output as {
    type?: string;
    value?: unknown;
    reason?: string;
  };
  switch (o.type) {
    case "text":
      return typeof o.value === "string" ? o.value : safeStringify(o.value);
    case "json":
      return safeStringify(o.value);
    case "execution-denied":
      return `Tool execution denied${o.reason ? `: ${o.reason}` : ""}`;
    case "error-text":
      return typeof o.value === "string" ? o.value : safeStringify(o.value);
    case "error-json":
      return safeStringify(o.value);
    case "content":
      if (Array.isArray(o.value)) {
        return o.value
          .map((p: unknown) => {
            if (
              p &&
              typeof p === "object" &&
              (p as { type?: string }).type === "text"
            ) {
              return String((p as { text?: string }).text ?? "");
            }
            return "";
          })
          .filter((s) => s.length > 0)
          .join("\n");
      }
      return "";
    default:
      return safeStringify(output);
  }
};

export const imageDataToURL = (data: unknown): string | undefined => {
  if (typeof data === "string") {
    if (data.startsWith("data:") || /^https?:\/\//i.test(data)) {
      return data;
    }
    return `data:image/png;base64,${data}`;
  }
  if (data instanceof URL) {
    return data.toString();
  }
  if (data instanceof Uint8Array) {
    return `data:image/png;base64,${Buffer.from(data).toString("base64")}`;
  }
  return undefined;
};

export const convertContentForOpenAI = (
  content: unknown,
): string | OpenAICompatMessageContent[] => {
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return safeStringify(content);
  }
  const out: OpenAICompatMessageContent[] = [];
  for (const part of content) {
    if (typeof part === "string") {
      out.push({ type: "text", text: part });
      continue;
    }
    if (!part || typeof part !== "object") {
      continue;
    }
    const p = part as { type?: string };
    if (p.type === "text") {
      out.push({
        type: "text",
        text: (part as { text?: string }).text ?? "",
      });
    } else if (p.type === "image" || p.type === "image_url") {
      const data =
        (part as { image?: unknown; data?: unknown; url?: unknown }).image ??
        (part as { data?: unknown }).data ??
        (part as { url?: unknown }).url;
      const url = imageDataToURL(data);
      if (url) {
        out.push({ type: "image_url", image_url: { url } });
      }
    }
  }
  if (out.length === 1 && out[0].type === "text") {
    return out[0].text;
  }
  return out;
};

export const messageBuilderToOpenAI = (
  messages: ReadonlyArray<OpenAICompatMessage>,
): OpenAICompatChatMessage[] => {
  const out: OpenAICompatChatMessage[] = [];
  for (const msg of messages) {
    switch (msg.role) {
      case "system":
        out.push({
          role: "system",
          content:
            typeof msg.content === "string"
              ? msg.content
              : safeStringify(msg.content),
        });
        break;
      case "user":
        out.push({
          role: "user",
          content: convertContentForOpenAI(msg.content),
        });
        break;
      case "assistant": {
        const parts = Array.isArray(msg.content) ? msg.content : [msg.content];
        const text: OpenAICompatMessageContent[] = [];
        const toolCalls: OpenAICompatToolCallWire[] = [];
        for (const part of parts) {
          if (part && typeof part === "object") {
            const p = part as { type?: string };
            if (p.type === "text") {
              text.push({
                type: "text",
                text: (part as { text?: string }).text ?? "",
              });
            } else if (p.type === "tool-call") {
              const tc = part as {
                toolCallId?: string;
                toolName?: string;
                input?: unknown;
              };
              toolCalls.push({
                id: tc.toolCallId ?? "",
                type: "function",
                function: {
                  name: tc.toolName ?? "",
                  arguments: stringifyToolInput(tc.input),
                },
              });
            }
          } else if (typeof part === "string") {
            text.push({ type: "text", text: part });
          }
        }
        const flat =
          text.length === 0
            ? null
            : text.length === 1 && text[0].type === "text"
              ? text[0].text
              : text;
        out.push({
          role: "assistant",
          content: flat,
          ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
        });
        break;
      }
      case "tool": {
        // V3 tool messages carry `{ toolCallId, output }` per content[] entry,
        // not at the top-level. Emit one OpenAI `role: "tool"` message per
        // tool-result part so the model can correlate by tool_call_id.
        if (Array.isArray(msg.content)) {
          for (const part of msg.content) {
            if (!part || typeof part !== "object") {
              continue;
            }
            const p = part as {
              type?: string;
              toolCallId?: string;
              output?: unknown;
            };
            if (p.type === "tool-result") {
              out.push({
                role: "tool",
                tool_call_id: p.toolCallId ?? "",
                content: stringifyToolOutput(p.output),
              });
            }
          }
        } else if (typeof msg.content === "string") {
          out.push({
            role: "tool",
            tool_call_id: msg.toolCallId ?? "",
            content: msg.content,
          });
        }
        break;
      }
    }
  }
  return out;
};

export const buildToolsForOpenAI = (
  tools: Record<string, Tool>,
): OpenAICompatChatTool[] | undefined => {
  const entries = Object.entries(tools);
  if (entries.length === 0) {
    return undefined;
  }
  const out: OpenAICompatChatTool[] = [];
  for (const [name, tool] of entries) {
    const t = tool as {
      description?: string;
      inputSchema?: unknown;
      parameters?: unknown;
    };
    const rawSchema = t.inputSchema ?? t.parameters;
    // tool.inputSchema may be a Zod schema, an AI SDK jsonSchema() wrapper,
    // or plain JSON Schema — convertZodToJsonSchema normalizes all three.
    // Sending raw Zod internals (with `_def`) gets rejected by most
    // OpenAI-compatible endpoints.
    const parameters = rawSchema
      ? (convertZodToJsonSchema(rawSchema as never) as never)
      : ({ type: "object", properties: {} } as never);
    out.push({
      type: "function",
      function: {
        name,
        ...(t.description ? { description: t.description } : {}),
        parameters,
      },
    });
  }
  return out;
};

// V3 → OpenAI conversion helpers used by the non-streaming `doGenerate`
// path that BaseProvider's `generate()` still drives via the AI SDK's
// `generateText`. The streaming path doesn't need these — it consumes
// NeuroLink-shaped options directly.

export const v3ToolsToOpenAI = (
  tools: OpenAICompatV3CallTools | undefined,
): OpenAICompatChatTool[] | undefined => {
  if (!tools || tools.length === 0) {
    return undefined;
  }
  const out: OpenAICompatChatTool[] = [];
  for (const t of tools) {
    if (t.type === "function") {
      out.push({
        type: "function",
        function: {
          name: t.name,
          ...(t.description ? { description: t.description } : {}),
          parameters: t.inputSchema,
          ...(t.strict !== undefined ? { strict: t.strict } : {}),
        },
      });
    }
    // provider-defined V3 tools are silently dropped here — they have no
    // OpenAI chat-completions equivalent.
  }
  return out.length > 0 ? out : undefined;
};

export const v3ToolChoiceToOpenAI = (
  choice: OpenAICompatV3CallToolChoice,
): OpenAICompatToolChoiceWire | undefined => {
  switch (choice.type) {
    case "auto":
    case "none":
    case "required":
      return choice.type;
    case "tool":
      return { type: "function", function: { name: choice.toolName } };
  }
};

export const v3ResponseFormatToOpenAI = (rf: {
  type: "text" | "json";
  schema?: Record<string, unknown>;
  name?: string;
  description?: string;
}): OpenAICompatResponseFormat | undefined => {
  if (rf.type === "text") {
    return { type: "text" };
  }
  if (!rf.schema) {
    return { type: "json_object" };
  }
  return {
    type: "json_schema",
    json_schema: {
      name: rf.name ?? "response",
      schema: rf.schema as never,
      ...(rf.description ? { description: rf.description } : {}),
      strict: true,
    },
  };
};

export const mapNeuroLinkToolChoice = (
  choice: unknown,
): OpenAICompatToolChoiceWire | undefined => {
  if (!choice) {
    return undefined;
  }
  if (choice === "auto" || choice === "none" || choice === "required") {
    return choice;
  }
  if (typeof choice === "object" && choice !== null) {
    const c = choice as { type?: string; toolName?: string };
    if (c.type === "tool" && c.toolName) {
      return { type: "function", function: { name: c.toolName } };
    }
  }
  return undefined;
};

// OpenAI-compatible endpoints (OpenAI, DeepSeek, …) reject
// `response_format: { type: "json_object" }` unless the literal word "json"
// appears somewhere in the messages. The `@ai-sdk/openai-compatible` wrapper
// this client replaced injected that instruction for us; the native client
// must do the same or json_object requests 400.
export const messagesContainJsonWord = (
  messages: ReadonlyArray<OpenAICompatChatMessage>,
): boolean =>
  messages.some((m) => {
    const c = m.content;
    if (typeof c === "string") {
      return /\bjson\b/i.test(c);
    }
    if (Array.isArray(c)) {
      return c.some(
        (part) =>
          typeof (part as { text?: unknown })?.text === "string" &&
          /\bjson\b/i.test((part as { text: string }).text),
      );
    }
    return false;
  });

// Prepends a minimal JSON-instruction system message to the FINAL wire body
// when json_object mode is requested and its messages don't already mention
// "json". Operates on the post-`adjustRequestBody` body so the guard reflects
// whatever a subclass left on the wire (response_format/messages it may have
// rewritten), not an intermediate state. No-op otherwise.
export const ensureJsonWordInBody = (
  body: OpenAICompatChatRequest,
): OpenAICompatChatRequest =>
  body.response_format?.type === "json_object" &&
  !messagesContainJsonWord(body.messages)
    ? {
        ...body,
        messages: [
          {
            role: "system",
            content:
              "Respond with valid JSON only — no prose, no markdown fencing.",
          },
          ...body.messages,
        ],
      }
    : body;

// Reasoning-class OpenAI models (o-series, gpt-5+) reject `max_tokens` and
// require `max_completion_tokens`. The OpenAI + Azure providers use this to
// rename the field on the wire body; third-party OpenAI-compatible endpoints
// keep `max_tokens`, so it is opt-in per provider, never applied by default.
export const requiresMaxCompletionTokens = (modelId: string): boolean =>
  /^(o\d|gpt-5)/i.test(modelId.replace(/^.*\//, ""));

export const buildBody = (
  args: OpenAICompatBuildBodyArgs,
): OpenAICompatChatRequest => {
  const {
    modelId,
    messages,
    options,
    tools,
    toolChoice,
    streaming,
    responseFormat,
  } = args;
  const body: OpenAICompatChatRequest = {
    model: modelId,
    messages,
    ...(streaming ? { stream: true as const } : {}),
    ...(streaming ? { stream_options: { include_usage: true } } : {}),
  };
  if (options.maxTokens !== undefined && options.maxTokens !== null) {
    body.max_tokens = options.maxTokens;
  }
  if (options.temperature !== undefined && options.temperature !== null) {
    body.temperature = options.temperature;
  }
  if (options.topP !== undefined && options.topP !== null) {
    body.top_p = options.topP;
  }
  if (
    options.presencePenalty !== undefined &&
    options.presencePenalty !== null
  ) {
    body.presence_penalty = options.presencePenalty;
  }
  if (
    options.frequencyPenalty !== undefined &&
    options.frequencyPenalty !== null
  ) {
    body.frequency_penalty = options.frequencyPenalty;
  }
  if (options.seed !== undefined && options.seed !== null) {
    body.seed = options.seed;
  }
  if (options.stopSequences && options.stopSequences.length > 0) {
    body.stop = options.stopSequences;
  }
  if (tools) {
    body.tools = tools;
  }
  if (toolChoice !== undefined) {
    body.tool_choice = toolChoice;
  }
  if (responseFormat) {
    body.response_format = responseFormat;
  }
  return body;
};

export const parseSSEStream = async (
  body: ReadableStream<Uint8Array>,
  onTextDelta: (delta: string) => void,
): Promise<OpenAICompatSSEResult> => {
  const result: OpenAICompatSSEResult = {
    text: "",
    toolCalls: new Map(),
    finishReason: null,
    usage: undefined,
  };
  const decoder = new TextDecoder();
  let parseErr: Error | undefined;

  const handleEvent = (msg: EventSourceMessage) => {
    const data = msg.data;
    if (!data || data === "[DONE]") {
      return;
    }
    let chunk: OpenAICompatChatStreamChunk;
    try {
      chunk = JSON.parse(data) as OpenAICompatChatStreamChunk;
    } catch (err) {
      parseErr = err instanceof Error ? err : new Error(String(err));
      return;
    }
    if (chunk.usage) {
      result.usage = chunk.usage;
    }
    const choice = chunk.choices?.[0];
    if (!choice) {
      return;
    }
    const delta = choice.delta;
    if (delta?.content) {
      result.text += delta.content;
      onTextDelta(delta.content);
    }
    if (delta?.tool_calls) {
      for (const tc of delta.tool_calls) {
        let state = result.toolCalls.get(tc.index);
        if (!state) {
          state = {
            id: tc.id ?? `call_${tc.index}_${Date.now()}`,
            name: tc.function?.name ?? "",
            argsBuffered: "",
          };
          result.toolCalls.set(tc.index, state);
        } else if (tc.id) {
          state.id = tc.id;
        }
        if (tc.function?.name) {
          state.name = tc.function.name;
        }
        if (tc.function?.arguments) {
          state.argsBuffered += tc.function.arguments;
        }
      }
    }
    if (choice.finish_reason) {
      result.finishReason = choice.finish_reason;
    }
  };

  const parser = createParser({ onEvent: handleEvent });
  const reader = body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      parser.feed(decoder.decode(value, { stream: true }));
    }
    parser.feed(decoder.decode());
  } finally {
    reader.releaseLock();
  }
  if (parseErr) {
    throw parseErr;
  }
  return result;
};

export const buildAPIError = async (
  url: string,
  body: OpenAICompatChatRequest,
  res: Response,
): Promise<Error> => {
  let bodyText: string | undefined;
  let parsed: OpenAICompatErrorBody | undefined;
  try {
    bodyText = await res.text();
    parsed = bodyText
      ? (JSON.parse(bodyText) as OpenAICompatErrorBody)
      : undefined;
  } catch {
    parsed = undefined;
  }
  const msg =
    parsed?.error?.message ??
    `OpenAI-compatible request failed with status ${res.status}`;
  const err = new Error(msg) as Error & {
    statusCode?: number;
    requestBody?: unknown;
    responseBody?: string;
    url?: string;
  };
  err.statusCode = res.status;
  err.url = url;
  // Redacted summary only — never attach raw prompts, tool definitions, or
  // tool arguments to the thrown error. Anything serialized by upstream
  // logging would leak them otherwise.
  err.requestBody = {
    model: body.model,
    stream: body.stream === true,
    tool_count: body.tools?.length ?? 0,
  };
  if (bodyText !== undefined) {
    err.responseBody = bodyText;
  }
  return err;
};

// Deferred-promise pair for `usage` and `finishReason` so the analytics
// collector resolves with the actual aggregated values after the multi-step
// loop ends, not the zeros they had at result-construction time.
export const createDeferredAnalytics = () => {
  let resolveUsage: (u: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }) => void = () => {};
  const usagePromise = new Promise<{
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }>((r) => {
    resolveUsage = r;
  });
  let resolveFinish: (reason: string) => void = () => {};
  const finishPromise = new Promise<string>((r) => {
    resolveFinish = r;
  });
  return { usagePromise, finishPromise, resolveUsage, resolveFinish };
};

// Single-producer / single-consumer chunk queue. The streaming loop pushes
// `{content}` deltas as they arrive from SSE and a final `{done:true}` when
// it finishes; the consumer's AsyncIterable pulls from `nextChunk()`.
export const createChunkQueue = () => {
  const chunkQueue: OpenAICompatStreamChunk[] = [];
  let pendingResolve: ((chunk: OpenAICompatStreamChunk) => void) | undefined;
  const pushChunk = (c: OpenAICompatStreamChunk) => {
    if (pendingResolve) {
      const r = pendingResolve;
      pendingResolve = undefined;
      r(c);
    } else {
      chunkQueue.push(c);
    }
  };
  const nextChunk = (): Promise<OpenAICompatStreamChunk> =>
    new Promise((resolve) => {
      if (chunkQueue.length > 0) {
        resolve(chunkQueue.shift() as OpenAICompatStreamChunk);
      } else {
        pendingResolve = resolve;
      }
    });
  return { pushChunk, nextChunk };
};

export const mergeUsage = (
  a:
    | {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      }
    | undefined,
  b:
    | {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      }
    | undefined,
):
  | {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    }
  | undefined => {
  if (!a) {
    return b;
  }
  if (!b) {
    return a;
  }
  return {
    prompt_tokens: (a.prompt_tokens ?? 0) + (b.prompt_tokens ?? 0),
    completion_tokens: (a.completion_tokens ?? 0) + (b.completion_tokens ?? 0),
    total_tokens: (a.total_tokens ?? 0) + (b.total_tokens ?? 0),
  };
};
