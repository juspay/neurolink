import type { NeuroLinkEvents, TypedEventEmitter } from "./common.js";
import type { JSONSchema7 } from "./middleware.js";
import type {
  LanguageModelV3,
  LanguageModelV3CallOptions,
} from "./middleware.js";
import type { StreamOptions } from "./stream.js";
import type { Tool } from "./tools.js";

export type OpenAICompatChatRole = "system" | "user" | "assistant" | "tool";

export type OpenAICompatTextContent = {
  type: "text";
  text: string;
};

export type OpenAICompatImageURLContent = {
  type: "image_url";
  image_url: { url: string; detail?: "auto" | "low" | "high" };
};

export type OpenAICompatMessageContent =
  | OpenAICompatTextContent
  | OpenAICompatImageURLContent;

export type OpenAICompatToolCallWire = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type OpenAICompatChatMessage =
  | { role: "system"; content: string | OpenAICompatMessageContent[] }
  | { role: "user"; content: string | OpenAICompatMessageContent[] }
  | {
      role: "assistant";
      content?: string | OpenAICompatMessageContent[] | null;
      tool_calls?: OpenAICompatToolCallWire[];
    }
  | {
      role: "tool";
      content: string;
      tool_call_id: string;
    };

export type OpenAICompatChatTool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: JSONSchema7;
    strict?: boolean;
  };
};

export type OpenAICompatToolChoiceWire =
  | "auto"
  | "none"
  | "required"
  | { type: "function"; function: { name: string } };

export type OpenAICompatResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | {
      type: "json_schema";
      json_schema: {
        name: string;
        schema: JSONSchema7;
        description?: string;
        strict?: boolean;
      };
    };

export type OpenAICompatChatRequest = {
  model: string;
  messages: OpenAICompatChatMessage[];
  stream?: boolean;
  stream_options?: { include_usage?: boolean };
  max_tokens?: number;
  max_completion_tokens?: number;
  temperature?: number;
  top_p?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  seed?: number;
  stop?: string[];
  tools?: OpenAICompatChatTool[];
  tool_choice?: OpenAICompatToolChoiceWire;
  response_format?: OpenAICompatResponseFormat;
  parallel_tool_calls?: boolean;
  user?: string;
};

export type OpenAICompatUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  prompt_tokens_details?: {
    cached_tokens?: number;
  };
  completion_tokens_details?: {
    reasoning_tokens?: number;
  };
};

export type OpenAICompatChatChoiceMessage = {
  role: "assistant";
  content?: string | null;
  tool_calls?: OpenAICompatToolCallWire[];
  refusal?: string | null;
};

export type OpenAICompatChatChoice = {
  index: number;
  message: OpenAICompatChatChoiceMessage;
  finish_reason:
    | "stop"
    | "length"
    | "tool_calls"
    | "function_call"
    | "content_filter"
    | null;
};

export type OpenAICompatChatResponse = {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices: OpenAICompatChatChoice[];
  usage?: OpenAICompatUsage;
  system_fingerprint?: string;
};

export type OpenAICompatStreamDelta = {
  role?: OpenAICompatChatRole;
  content?: string | null;
  tool_calls?: Array<{
    index: number;
    id?: string;
    type?: "function";
    function?: {
      name?: string;
      arguments?: string;
    };
  }>;
  refusal?: string | null;
};

export type OpenAICompatStreamChunkChoice = {
  index: number;
  delta: OpenAICompatStreamDelta;
  finish_reason:
    | "stop"
    | "length"
    | "tool_calls"
    | "function_call"
    | "content_filter"
    | null;
};

export type OpenAICompatChatStreamChunk = {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices: OpenAICompatStreamChunkChoice[];
  usage?: OpenAICompatUsage;
};

export type OpenAICompatErrorBody = {
  error?: {
    message?: string;
    type?: string;
    code?: string | number;
    param?: string | null;
  };
};

export type OpenAICompatConfig = {
  provider: string;
  modelId: string;
  baseURL: string;
  apiKey?: string;
  headers?: Record<string, string> | (() => Record<string, string>);
  fetch?: typeof globalThis.fetch;
};

export type OpenAICompatToolWarning = NonNullable<
  Awaited<ReturnType<LanguageModelV3["doGenerate"]>>["warnings"]
>[number];

export type OpenAICompatV3Content = Awaited<
  ReturnType<LanguageModelV3["doGenerate"]>
>["content"][number];

export type OpenAICompatV3FinishReason = Awaited<
  ReturnType<LanguageModelV3["doGenerate"]>
>["finishReason"];

export type OpenAICompatV3Usage = Awaited<
  ReturnType<LanguageModelV3["doGenerate"]>
>["usage"];

export type OpenAICompatV3StreamPart =
  Awaited<
    ReturnType<LanguageModelV3["doStream"]>
  >["stream"] extends ReadableStream<infer P>
    ? P
    : never;

export type OpenAICompatV3CallTools = NonNullable<
  LanguageModelV3CallOptions["tools"]
>;
export type OpenAICompatV3CallToolChoice = NonNullable<
  LanguageModelV3CallOptions["toolChoice"]
>;

export type OpenAICompatUserOrAssistantPart =
  | { type: "text"; text: string }
  | {
      type: "file";
      mediaType: string;
      data: Uint8Array | string | URL;
      filename?: string;
    };

// Internal helpers used inside src/lib/providers/openaiCompatible.ts. Kept
// here to satisfy the no-local-type-alias rule.

export type OpenAICompatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: unknown;
  toolCallId?: string;
  toolName?: string;
};

export type OpenAICompatSSEResult = {
  text: string;
  toolCalls: Map<number, { id: string; name: string; argsBuffered: string }>;
  finishReason:
    | "stop"
    | "length"
    | "tool_calls"
    | "function_call"
    | "content_filter"
    | null;
  usage?: OpenAICompatUsage;
};

export type OpenAICompatStreamChunk = { content: string } | { done: true };

// Per-execution tool record kept internally during the streaming multi-step
// loop. Public shape lives in `ToolExecutionSummary` (src/lib/types/tools.ts).
export type ToolExecutionSummaryInternal = {
  toolCallId: string;
  toolName: string;
  input: unknown;
  output?: unknown;
  error?: string;
  startTime: Date;
  endTime: Date;
};

// Arguments bundle for OpenAICompatibleProvider.runStreamLoop. Kept here per
// the no-local-type-alias rule.
export type StreamLoopArgs = {
  maxSteps: number;
  modelId: string;
  url: string;
  fetchImpl: typeof fetch;
  abortSignal: AbortSignal | undefined;
  options: StreamOptions;
  conversation: OpenAICompatChatMessage[];
  openAITools: OpenAICompatChatTool[] | undefined;
  openAIToolChoice: OpenAICompatToolChoiceWire | undefined;
  toolsRecord: Record<string, Tool>;
  emitter: TypedEventEmitter<NeuroLinkEvents> | undefined;
  toolsUsed: string[];
  toolExecutionSummaries: ToolExecutionSummaryInternal[];
  pushChunk: (chunk: OpenAICompatStreamChunk) => void;
  resolveUsage: (u: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }) => void;
  resolveFinish: (reason: string) => void;
};

export type OpenAICompatBuildBodyArgs = {
  modelId: string;
  messages: OpenAICompatChatMessage[];
  options: {
    maxTokens?: number | null;
    temperature?: number | null;
    topP?: number | null;
    presencePenalty?: number | null;
    frequencyPenalty?: number | null;
    seed?: number | null;
    stopSequences?: string[];
  };
  tools?: OpenAICompatChatTool[];
  toolChoice?: OpenAICompatToolChoiceWire;
  streaming: boolean;
  responseFormat?: OpenAICompatResponseFormat;
};

/**
 * Per-stream lifecycle listeners returned from an OpenAIChatCompletionsProvider
 * subclass's `onStreamStart` hook. Every property is optional — provide only
 * what the subclass cares about. Used by LiteLLM to wire an OTel span around
 * the deferred analytics promises.
 */
export type OpenAICompatStreamLifecycleListeners = {
  /** Fired once the deferred usage promise resolves with the final aggregated token counts. */
  onUsage?: (usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }) => void;
  /**
   * Fired once the deferred finish promise resolves. `reason` is "stop",
   * "length", "tool-calls", "content-filter", or "error". When the loop
   * errored, the upstream cause is passed as `capturedError`.
   */
  onFinish?: (reason: string, capturedError?: unknown) => void;
};
