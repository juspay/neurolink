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
  OpenAICompatToolCallWire,
  OpenAICompatToolChoiceWire,
  OpenAICompatUsage,
  OpenAICompatV3CallToolChoice,
  OpenAICompatV3CallTools,
  DeferredUsage,
  Tool,
} from "../types/index.js";
import { sanitizeToolName } from "../mcp/toolConverter.js";
import { resolveSamplingParams } from "../models/modelRegistry.js";
import {
  convertZodToJsonSchema,
  normalizeWireToolSchema,
} from "../utils/schemaConversion.js";
import {
  estimateTokens,
  TOKENS_PER_MESSAGE,
} from "../utils/tokenEstimation.js";

export const stripTrailingSlash = (s: string): string => s.replace(/\/+$/, "");

// OpenAI-compatible wire tool names: first char letter/underscore (some
// chat templates treat a leading digit or hyphen as invalid identifiers),
// then letters/digits/underscore/hyphen, 64 chars total — exactly the
// pattern below, which mirrors sanitizeToolName's output alphabet. MCP
// servers can register names outside it (dots, colons, spaces); sent
// verbatim they make backends reject the tools block or emit tool_calls
// that no longer match the registry.
const WIRE_TOOL_NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_-]{0,63}$/;

/**
 * Build a bijective original ↔ wire tool-name map. Returns undefined when
 * every name is already wire-valid and unreserved (the common case — the
 * wire then uses original names untouched and callers skip all mapping).
 * Sanitized names that collide get a deterministic numeric suffix so the
 * map stays invertible.
 *
 * `reservedWireNames` seeds the collision set with wire names already
 * declared in the request — a mid-turn discovery refresh maps only the
 * newly hydrated subset, and without seeding a hydrated name (sanitized OR
 * wire-valid) could reuse a wire name an earlier tool already claimed,
 * making the reverse mapping ambiguous.
 */
export const buildWireToolNameMaps = (
  names: readonly string[],
  reservedWireNames?: ReadonlySet<string>,
):
  | { toWire: Map<string, string>; fromWire: Map<string, string> }
  | undefined => {
  if (
    names.every(
      (name) => WIRE_TOOL_NAME_RE.test(name) && !reservedWireNames?.has(name),
    )
  ) {
    return undefined;
  }
  const toWire = new Map<string, string>();
  const fromWire = new Map<string, string>();
  for (const name of names) {
    let wire = WIRE_TOOL_NAME_RE.test(name) ? name : sanitizeToolName(name);
    if (fromWire.has(wire) || reservedWireNames?.has(wire)) {
      let suffix = 2;
      let candidate: string;
      do {
        const tail = `_${suffix}`;
        candidate = `${wire.slice(0, 64 - tail.length)}${tail}`;
        suffix++;
      } while (fromWire.has(candidate) || reservedWireNames?.has(candidate));
      wire = candidate;
    }
    toWire.set(name, wire);
    fromWire.set(wire, name);
  }
  return { toWire, fromWire };
};

/**
 * Estimate the input-token cost of a fully-built wire request (messages +
 * tool definitions). Used by the per-request max_tokens fit against a
 * RUNTIME-DISCOVERED context window — deliberately the same char-based
 * estimator the budget pipeline uses, so both layers agree.
 */
export const estimateWireTokens = (
  messages: ReadonlyArray<OpenAICompatChatMessage>,
  tools: OpenAICompatChatTool[] | undefined,
  provider?: string,
): number => {
  let total = 0;
  for (const message of messages) {
    const content =
      typeof message.content === "string"
        ? message.content
        : safeStringify(message.content);
    total += estimateTokens(content, provider) + TOKENS_PER_MESSAGE;
    // tool_calls only exists on the assistant variant of the message union.
    const toolCalls = (message as { tool_calls?: unknown }).tool_calls;
    if (toolCalls) {
      total += estimateTokens(safeStringify(toolCalls), provider);
    }
  }
  if (tools && tools.length > 0) {
    total += estimateTokens(safeStringify(tools), provider);
  }
  return total;
};

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
  toolNameToWire?: Map<string, string>,
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
              // History tool-call names must match the wire `tools` block —
              // forward-map when a wire-name map is in effect.
              const historyName = tc.toolName ?? "";
              toolCalls.push({
                id: tc.toolCallId ?? "",
                type: "function",
                function: {
                  name: toolNameToWire?.get(historyName) ?? historyName,
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
  toolNameToWire?: Map<string, string>,
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
    // OpenAI-compatible endpoints. normalizeWireToolSchema then strips
    // $schema/$defs indirection that proxied backends render into chat
    // templates verbatim (degrading argument generation).
    const parameters = rawSchema
      ? (normalizeWireToolSchema(
          convertZodToJsonSchema(rawSchema as never),
        ) as never)
      : ({ type: "object", properties: {} } as never);
    out.push({
      type: "function",
      function: {
        name: toolNameToWire?.get(name) ?? name,
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
  toolNameToWire?: Map<string, string>,
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
          name: toolNameToWire?.get(t.name) ?? t.name,
          ...(t.description ? { description: t.description } : {}),
          // The AI SDK serializes inputSchema to JSON Schema before
          // doGenerate; normalize the wire form ($ref/$defs inlining,
          // annotation stripping, nullable collapse) for proxied backends.
          parameters: normalizeWireToolSchema(t.inputSchema),
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
  toolNameToWire?: Map<string, string>,
): OpenAICompatToolChoiceWire | undefined => {
  switch (choice.type) {
    case "auto":
    case "none":
    case "required":
      return choice.type;
    case "tool":
      return {
        type: "function",
        function: {
          name: toolNameToWire?.get(choice.toolName) ?? choice.toolName,
        },
      };
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
  toolNameToWire?: Map<string, string>,
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
      return {
        type: "function",
        function: { name: toolNameToWire?.get(c.toolName) ?? c.toolName },
      };
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
  // Registry-driven strip: models that reject sampling params (Sonnet 5 /
  // Opus 4.7+ / Fable 5 families — e.g. Claude served through litellm)
  // must not receive temperature/top_p. Applied in buildBody so the 400
  // one-shot retries, which reuse the built body, inherit the strip.
  const samplingParams = resolveSamplingParams(
    "openai-compatible",
    modelId,
    {
      ...(options.temperature !== undefined && options.temperature !== null
        ? { temperature: options.temperature }
        : {}),
      ...(options.topP !== undefined && options.topP !== null
        ? { topP: options.topP }
        : {}),
    },
    "openaiCompatible.buildBody",
  );
  if (samplingParams.temperature !== undefined) {
    body.temperature = samplingParams.temperature;
  }
  if (samplingParams.topP !== undefined) {
    body.top_p = samplingParams.topP;
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
  // tool_choice is only meaningful alongside a non-empty tools array, and
  // strict OpenAI-compatible backends (probed live on Cerebras 2026-08-27)
  // reject it outright with 400 wrong_api_format when tools are absent:
  // "'tool_choice' is only allowed when 'tools' are specified". Omitting it
  // is behavior-identical on lenient backends.
  if (toolChoice !== undefined && tools && tools.length > 0) {
    body.tool_choice = toolChoice;
  }
  if (responseFormat) {
    body.response_format = responseFormat;
  }
  // Provider-specific extras attached via options.extraBody (the explicit
  // channel from adjustBuildBodyOptions) land verbatim on the wire body.
  // Spread last — a provider that puts a core field here is intentionally
  // overriding it.
  if (options.extraBody) {
    Object.assign(body, options.extraBody);
  }
  return body;
};

export const parseSSEStream = async (
  body: ReadableStream<Uint8Array>,
  onTextDelta: (delta: string) => void,
  onReasoningDelta?: (delta: string) => void,
): Promise<OpenAICompatSSEResult> => {
  const result: OpenAICompatSSEResult = {
    text: "",
    reasoning: "",
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
    if (chunk.id && !result.id) {
      result.id = chunk.id;
    }
    if (chunk.model && !result.model) {
      result.model = chunk.model;
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
    // Reasoner-model deltas: DeepSeek/NIM emit `reasoning_content`, some
    // gateways emit `reasoning`. The AI SDK's openai-compatible wrapper
    // surfaced these automatically; the native client must do the same.
    // `||` (not `??`) so an empty-string reasoning_content falls through to
    // a non-empty `reasoning` field instead of shadowing it.
    const reasoningDelta = delta?.reasoning_content || delta?.reasoning;
    if (reasoningDelta) {
      result.reasoning += reasoningDelta;
      onReasoningDelta?.(reasoningDelta);
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
    responseHeaders?: Record<string, string>;
    url?: string;
  };
  err.statusCode = res.status;
  // Response headers carry rate-limit hints (Retry-After, X-RateLimit-*)
  // that withProviderRetry needs to honor short waits and surface long ones.
  // Allowlisted to just those — attaching every header would let unrelated
  // (potentially sensitive) values like set-cookie or internal routing
  // headers ride along when the error is logged.
  err.responseHeaders = Object.fromEntries(
    [...res.headers.entries()].filter(([key]) => {
      const lower = key.toLowerCase();
      return lower === "retry-after" || lower.startsWith("x-ratelimit-");
    }),
  );
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
  let resolveUsage: (u: DeferredUsage) => void = () => {};
  const usagePromise = new Promise<DeferredUsage>((r) => {
    resolveUsage = r;
  });
  let resolveFinish: (reason: string) => void = () => {};
  const finishPromise = new Promise<string>((r) => {
    resolveFinish = r;
  });
  return { usagePromise, finishPromise, resolveUsage, resolveFinish };
};

export const mergeUsage = (
  a: OpenAICompatUsage | undefined,
  b: OpenAICompatUsage | undefined,
): OpenAICompatUsage | undefined => {
  if (!a) {
    return b;
  }
  if (!b) {
    return a;
  }
  // Sum the nested details too — narrowing to the three flat scalars here
  // silently dropped cached_tokens / reasoning_tokens the first time two
  // steps were merged (single-step streams passed the object through
  // untouched, so the loss only showed up in multi-step tool loops).
  const cachedTokens =
    (a.prompt_tokens_details?.cached_tokens ?? 0) +
    (b.prompt_tokens_details?.cached_tokens ?? 0);
  const reasoningTokens =
    (a.completion_tokens_details?.reasoning_tokens ?? 0) +
    (b.completion_tokens_details?.reasoning_tokens ?? 0);
  // A step that omits total_tokens contributes its prompt+completion sum
  // instead of 0 — otherwise one totals-reporting step next to one that
  // omits it yields a nonzero-but-partial aggregate that downstream
  // consumers trust over their own prompt+completion fallback.
  const stepTotal = (u: OpenAICompatUsage): number =>
    u.total_tokens || (u.prompt_tokens ?? 0) + (u.completion_tokens ?? 0);
  return {
    prompt_tokens: (a.prompt_tokens ?? 0) + (b.prompt_tokens ?? 0),
    completion_tokens: (a.completion_tokens ?? 0) + (b.completion_tokens ?? 0),
    total_tokens: stepTotal(a) + stepTotal(b),
    ...(cachedTokens > 0
      ? { prompt_tokens_details: { cached_tokens: cachedTokens } }
      : {}),
    ...(reasoningTokens > 0
      ? { completion_tokens_details: { reasoning_tokens: reasoningTokens } }
      : {}),
  };
};
