/**
 * Local declarations of the tool, schema, message and model-protocol types
 * that used to be re-exported from `ai` and `@ai-sdk/provider`.
 *
 * These are deliberately faithful to the upstream shapes rather than
 * simplified. An earlier attempt declared `Tool` with `unknown` generic
 * defaults and 66 type errors followed, because the upstream defaults are
 * `any` and that is load-bearing: `NeverOptional` resolves its
 * `0 extends 1 & N` branch under `any`, which makes `execute` and
 * `outputSchema` OPTIONAL on a bare `Tool`. That optionality is the only
 * reason a plain `Record<string, Tool>` satisfies `ToolSet`, which this
 * codebase relies on in a dozen places.
 *
 * `any` therefore appears here on purpose and nowhere else. Each use is a
 * reproduction of an upstream generic default, not a loosened annotation.
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- Faithful reproduction of
   upstream generic defaults. `any` here is what makes bare `Tool` and
   `Record<string, Tool>` assignable to `ToolSet`; `unknown` provably breaks it. */

import type { z } from "zod";

// ---------------------------------------------------------------------------
// JSON Schema
// ---------------------------------------------------------------------------

// The real JSON Schema types rather than a hand-rolled copy: callers pass
// values produced by json-schema-aware tooling, and two structurally similar
// but distinct JSONSchema7 declarations do not interoperate.
export type { JSONSchema7, JSONSchema7Definition } from "json-schema";
import type { JSONSchema7 } from "json-schema";

// ---------------------------------------------------------------------------
// Schema algebra
// ---------------------------------------------------------------------------

export type SchemaValidationResult<OBJECT> =
  | { success: true; value: OBJECT }
  | { success: false; error: unknown };

export type Schema<OBJECT = unknown> = {
  readonly _type: OBJECT;
  // Upstream allows a PromiseLike here. Ours does not: JSONSchema7 carries an
  // index signature, so a union with PromiseLike makes every schema
  // structurally ambiguous with a thenable. Nothing in this repo defers a
  // schema, so the narrower type is both correct and unambiguous.
  readonly jsonSchema: JSONSchema7;
  readonly validate?: (
    value: unknown,
  ) =>
    | SchemaValidationResult<OBJECT>
    | PromiseLike<SchemaValidationResult<OBJECT>>;
};

export type LazySchema<OBJECT = unknown> = () => FlexibleSchema<OBJECT>;

export type ZodSchema<OBJECT = unknown> = z.ZodType<OBJECT>;

export type StandardSchema<OBJECT = unknown> = {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (value: unknown) => unknown;
    readonly types?: { readonly input: unknown; readonly output: OBJECT };
  };
};

export type FlexibleSchema<SCHEMA = any> =
  | Schema<SCHEMA>
  | LazySchema<SCHEMA>
  | ZodSchema<SCHEMA>
  | StandardSchema<SCHEMA>;

export type InferSchema<SCHEMA> =
  SCHEMA extends ZodSchema<infer T>
    ? T
    : SCHEMA extends StandardSchema<infer T>
      ? T
      : SCHEMA extends LazySchema<infer T>
        ? T
        : SCHEMA extends Schema<infer T>
          ? T
          : never;

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

export type ToolCallOptions = {
  toolCallId: string;
  messages: ModelMessage[];
  abortSignal?: AbortSignal;
  experimental_context?: unknown;
};

export type ToolExecuteFunction<INPUT, OUTPUT> = (
  input: INPUT,
  options: ToolCallOptions,
) => AsyncIterable<OUTPUT> | PromiseLike<OUTPUT> | OUTPUT;

export type ToolNeedsApprovalFunction<INPUT> = (
  input: INPUT,
  options: ToolCallOptions,
) => boolean | PromiseLike<boolean>;

/**
 * The upstream conditional that decides whether `execute` is required.
 * Under `any` the first branch wins and everything becomes optional, which is
 * what a bare `Tool` relies on.
 */
export type NeverOptional<N, T> = 0 extends 1 & N
  ? Partial<T>
  : [N] extends [never]
    ? Partial<Record<keyof T, undefined>>
    : T;

export type ToolOutputProperties<INPUT, OUTPUT> = NeverOptional<
  OUTPUT,
  | {
      execute: ToolExecuteFunction<INPUT, OUTPUT>;
      outputSchema?: FlexibleSchema<OUTPUT>;
    }
  | { outputSchema: FlexibleSchema<OUTPUT>; execute?: never }
>;

export type Tool<INPUT = any, OUTPUT = any> = {
  description?: string;
  title?: string;
  providerOptions?: Record<string, Record<string, unknown>>;
  inputSchema: FlexibleSchema<INPUT>;
  inputExamples?: Array<{ input: INPUT }>;
  needsApproval?: boolean | ToolNeedsApprovalFunction<INPUT>;
  strict?: boolean;
  onInputStart?: (options: ToolCallOptions) => void | PromiseLike<void>;
  onInputDelta?: (
    options: { inputTextDelta: string } & ToolCallOptions,
  ) => void | PromiseLike<void>;
  onInputAvailable?: (
    options: { input: INPUT } & ToolCallOptions,
  ) => void | PromiseLike<void>;
} & ToolOutputProperties<INPUT, OUTPUT> & {
    toModelOutput?: (options: {
      toolCallId: string;
      input: INPUT;
      output: OUTPUT;
    }) => unknown | PromiseLike<unknown>;
  } & (
    | { type?: undefined | "function" }
    | { type: "dynamic" }
    | {
        type: "provider";
        id: `${string}.${string}`;
        args: Record<string, unknown>;
        supportsDeferredResults?: boolean;
      }
  );

export type ToolSet = Record<
  string,
  (Tool<never, never> | Tool<any, any> | Tool<any, never> | Tool<never, any>) &
    Pick<
      Tool<any, any>,
      | "execute"
      | "onInputAvailable"
      | "onInputStart"
      | "onInputDelta"
      | "needsApproval"
    >
>;

/** Upstream bounds this by `Record<string, unknown>`, not by `ToolSet`. */
export type ToolChoice<TOOLS extends Record<string, unknown>> =
  | "auto"
  | "none"
  | "required"
  | { type: "tool"; toolName: Extract<keyof TOOLS, string> };

export type InferToolInput<TOOL extends Tool> =
  TOOL extends Tool<infer INPUT, any> ? INPUT : never;

export type InferToolOutput<TOOL extends Tool> =
  TOOL extends Tool<any, infer OUTPUT> ? OUTPUT : never;

export type ToolApprovalRequest = {
  type: "tool-approval-request";
  approvalId: string;
  toolCallId: string;
};

export type ToolApprovalResponse = {
  type: "tool-approval-response";
  approvalId: string;
  approved: boolean;
  reason?: string;
  providerExecuted?: boolean;
};

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export type DataContent = string | Uint8Array | ArrayBuffer | Buffer;

export type TextPart = {
  type: "text";
  text: string;
  providerOptions?: Record<string, Record<string, unknown>>;
};

export type ImagePart = {
  type: "image";
  image: DataContent | URL;
  mediaType?: string;
  providerOptions?: Record<string, Record<string, unknown>>;
};

export type FilePart = {
  type: "file";
  data: DataContent | URL;
  filename?: string;
  mediaType: string;
  providerOptions?: Record<string, Record<string, unknown>>;
};

export type ReasoningPart = {
  type: "reasoning";
  text: string;
  providerOptions?: Record<string, Record<string, unknown>>;
};

export type ToolCallPart = {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  input: unknown;
  providerExecuted?: boolean;
  providerOptions?: Record<string, Record<string, unknown>>;
};

export type ToolResultPart = {
  type: "tool-result";
  toolCallId: string;
  toolName: string;
  output: unknown;
  providerExecuted?: boolean;
  providerOptions?: Record<string, Record<string, unknown>>;
};

export type UserContent = string | Array<TextPart | ImagePart | FilePart>;

export type AssistantContent =
  | string
  | Array<
      | TextPart
      | FilePart
      | ReasoningPart
      | ToolCallPart
      | ToolResultPart
      | ToolApprovalRequest
    >;

export type ToolContent = Array<ToolResultPart | ToolApprovalResponse>;

export type SystemModelMessage = {
  role: "system";
  content: string;
  providerOptions?: Record<string, Record<string, unknown>>;
};

export type UserModelMessage = {
  role: "user";
  content: UserContent;
  providerOptions?: Record<string, Record<string, unknown>>;
};

export type AssistantModelMessage = {
  role: "assistant";
  content: AssistantContent;
  providerOptions?: Record<string, Record<string, unknown>>;
};

export type ToolModelMessage = {
  role: "tool";
  content: ToolContent;
  providerOptions?: Record<string, Record<string, unknown>>;
};

export type ModelMessage =
  | SystemModelMessage
  | UserModelMessage
  | AssistantModelMessage
  | ToolModelMessage;

// ---------------------------------------------------------------------------
// Model protocol and generation results
// ---------------------------------------------------------------------------

export type FinishReason =
  | "stop"
  | "length"
  | "content-filter"
  | "tool-calls"
  | "error"
  | "other";

export type LanguageModelUsage = {
  inputTokens: number | undefined;
  outputTokens: number | undefined;
  totalTokens: number | undefined;
  inputTokenDetails?: {
    noCacheTokens?: number | undefined;
    cacheReadTokens?: number | undefined;
    cacheWriteTokens?: number | undefined;
  };
  outputTokenDetails?: {
    textTokens?: number | undefined;
    reasoningTokens?: number | undefined;
  };
  reasoningTokens?: number | undefined;
  cachedInputTokens?: number | undefined;
};

export type LanguageModelRequestMetadata = { body?: unknown };

export type LanguageModelResponseMetadata = {
  id: string;
  timestamp: Date;
  modelId: string;
  headers?: Record<string, string>;
};

export type LanguageModelV3Message = ModelMessage;
export type LanguageModelV3Prompt = ModelMessage[];

export type LanguageModelV3CallOptions = {
  // Typed rather than `unknown`: the evaluation context builder narrows
  // `prompt` by `.role` and reads temperature/maxOutputTokens directly.
  prompt: LanguageModelV3Prompt;
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  stopSequences?: string[];
  seed?: number;
  // Typed entries: the OpenAI wire converters derive their parameter type from
  // this and read `name` / `description` / `inputSchema` off each tool.
  tools?: Array<
    | {
        type: "function";
        name: string;
        description?: string;
        inputSchema?: unknown;
        strict?: boolean;
        providerOptions?: Record<string, Record<string, unknown>>;
      }
    | {
        type: "provider-defined";
        id: string;
        name: string;
        args: Record<string, unknown>;
      }
  >;
  toolChoice?: LanguageModelV3ToolChoice;
  responseFormat?: {
    type: "text" | "json";
    schema?: Record<string, unknown>;
    name?: string;
    description?: string;
  };
  abortSignal?: AbortSignal;
  headers?: Record<string, string | undefined>;
  includeRawChunks?: boolean;
  providerOptions?: Record<string, Record<string, unknown>>;
};

export type LanguageModelV3ToolCall = {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  input: string;
  providerExecuted?: boolean;
};

export type LanguageModelV3Source = {
  type: "source";
  sourceType: string;
  id: string;
  url?: string;
  title?: string;
};

export type LanguageModelV3ToolChoice =
  | { type: "auto" }
  | { type: "none" }
  | { type: "required" }
  | { type: "tool"; toolName: string };

export type LanguageModelV3Content =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
  | { type: "file"; data: unknown; mediaType: string }
  | LanguageModelV3ToolCall
  | LanguageModelV3Source
  | ({ type: "tool-result" } & Record<string, unknown>)
  | ({ type: "tool-approval-request" } & Record<string, unknown>);

/** Per-direction token counts, as the v3 providers report them. */
export type LanguageModelV3TokenCount = {
  total?: number;
  noCache?: number;
  cacheRead?: number;
  cacheWrite?: number;
  text?: number;
  reasoning?: number;
};

export type LanguageModelV3Usage = {
  inputTokens: LanguageModelV3TokenCount;
  outputTokens: LanguageModelV3TokenCount;
};

export type LanguageModelV3FinishReason = {
  unified: FinishReason | string;
  raw?: string;
};

export type LanguageModelV3GenerateResult = {
  content: LanguageModelV3Content[];
  finishReason: LanguageModelV3FinishReason;
  usage: LanguageModelV3Usage;
  warnings?: unknown[];
  request?: unknown;
  response?: unknown;
  providerMetadata?: Record<string, Record<string, unknown>>;
};

/**
 * Discriminated rather than a loose record: consumers switch on `type` and
 * read variant-specific fields (a finish part's usage, a tool-call's input).
 */
export type LanguageModelV3StreamPart =
  | { type: "text-start"; id?: string }
  | { type: "text-delta"; id?: string; delta: string }
  | { type: "text-end"; id?: string }
  | { type: "reasoning-start"; id?: string }
  | { type: "reasoning-delta"; id?: string; delta: string }
  | { type: "reasoning-end"; id?: string }
  | {
      type: "tool-call";
      toolCallId: string;
      toolName: string;
      input: string;
      providerExecuted?: boolean;
    }
  | ({ type: "tool-input-start" } & Record<string, unknown>)
  | ({ type: "tool-input-delta" } & Record<string, unknown>)
  | ({ type: "tool-input-end" } & Record<string, unknown>)
  | ({ type: "tool-result" } & Record<string, unknown>)
  | {
      type: "source";
      sourceType: string;
      id: string;
      url?: string;
      title?: string;
    }
  | ({ type: "file" } & Record<string, unknown>)
  | ({ type: "stream-start" } & Record<string, unknown>)
  | ({ type: "response-metadata" } & Record<string, unknown>)
  | ({ type: "raw" } & Record<string, unknown>)
  | { type: "error"; error: unknown }
  | {
      type: "finish";
      finishReason: LanguageModelV3FinishReason;
      usage: LanguageModelV3Usage;
      providerMetadata?: Record<string, Record<string, unknown>>;
    };

export type LanguageModelV3StreamResult = {
  stream: ReadableStream<LanguageModelV3StreamPart>;
  request?: unknown;
  response?: unknown;
};

export type LanguageModelV3 = {
  readonly specificationVersion: "v3";
  readonly provider: string;
  readonly modelId: string;
  readonly supportedUrls:
    | Record<string, RegExp[]>
    | PromiseLike<Record<string, RegExp[]>>;
  doGenerate(
    options: LanguageModelV3CallOptions,
  ): PromiseLike<LanguageModelV3GenerateResult>;
  doStream(
    options: LanguageModelV3CallOptions,
  ): PromiseLike<LanguageModelV3StreamResult>;
};

export type LanguageModelV3Middleware = {
  readonly specificationVersion: "v3";
  overrideProvider?: (options: { model: LanguageModelV3 }) => string;
  overrideModelId?: (options: { model: LanguageModelV3 }) => string;
  overrideSupportedUrls?: (options: {
    model: LanguageModelV3;
  }) => Record<string, RegExp[]> | PromiseLike<Record<string, RegExp[]>>;
  transformParams?: (options: {
    type: "generate" | "stream";
    params: LanguageModelV3CallOptions;
    model: LanguageModelV3;
  }) => PromiseLike<LanguageModelV3CallOptions>;
  wrapGenerate?: (options: {
    doGenerate: () => PromiseLike<LanguageModelV3GenerateResult>;
    doStream: () => PromiseLike<LanguageModelV3StreamResult>;
    params: LanguageModelV3CallOptions;
    model: LanguageModelV3;
  }) => PromiseLike<LanguageModelV3GenerateResult>;
  wrapStream?: (options: {
    doGenerate: () => PromiseLike<LanguageModelV3GenerateResult>;
    doStream: () => PromiseLike<LanguageModelV3StreamResult>;
    params: LanguageModelV3CallOptions;
    model: LanguageModelV3;
  }) => PromiseLike<LanguageModelV3StreamResult>;
};

export type LanguageModelMiddleware = LanguageModelV3Middleware;

/** Upstream also admits a v2 model and a bare id string. */
export type LanguageModel = string | LanguageModelV3;

export type EmbeddingModel = string | Record<string, unknown>;
export type ImageModel = string | Record<string, unknown>;

export type StepResult<TOOLS extends ToolSet = ToolSet> = {
  readonly stepNumber?: number;
  readonly content: Array<{ type: string } & Record<string, unknown>>;
  readonly text: string;
  readonly reasoning?: unknown;
  readonly reasoningText?: string;
  readonly files?: unknown[];
  readonly sources?: unknown[];
  readonly toolCalls: Array<
    { toolName: string; toolCallId?: string; input?: unknown } & Record<
      string,
      unknown
    >
  >;
  readonly toolResults: Array<
    { toolName?: string; toolCallId?: string; output?: unknown } & Record<
      string,
      unknown
    >
  >;
  readonly stepType?: string;
  readonly finishReason: FinishReason;
  readonly rawFinishReason?: string;
  readonly usage: LanguageModelUsage;
  readonly warnings?: unknown[];
  readonly request?: LanguageModelRequestMetadata;
  readonly response?: LanguageModelResponseMetadata & {
    messages: ModelMessage[];
    body?: unknown;
  };
  readonly providerMetadata?: Record<string, Record<string, unknown>>;
  readonly tools?: TOOLS;
};

export type GenerateTextResult<
  TOOLS extends ToolSet = ToolSet,
  OUTPUT = unknown,
> = StepResult<TOOLS> & {
  readonly steps: Array<StepResult<TOOLS>>;
  readonly totalUsage: LanguageModelUsage;
  readonly experimental_output?: OUTPUT;
};

export type ToolCallRepairFunction<TOOLS extends ToolSet = ToolSet> =
  (options: {
    system: string | undefined;
    messages: ModelMessage[];
    toolCall: LanguageModelV3ToolCall;
    tools: TOOLS;
    inputSchema: (options: { toolName: string }) => JSONSchema7;
    error: Error;
  }) => Promise<LanguageModelV3ToolCall | null>;

export type PrepareStepResult<
  TOOLS extends Record<string, Tool> = Record<string, Tool>,
> = {
  model?: LanguageModel;
  toolChoice?: ToolChoice<TOOLS>;
  activeTools?: Array<keyof TOOLS>;
  system?: string;
  messages?: ModelMessage[];
  providerOptions?: Record<string, Record<string, unknown>>;
  tools?: TOOLS;
};

export type PrepareStepFunction<
  TOOLS extends Record<string, Tool> = Record<string, Tool>,
> = (options: {
  steps: Array<StepResult<ToolSet>>;
  stepNumber: number;
  model: LanguageModel;
  messages: ModelMessage[];
  maxSteps?: number;
  experimental_context?: unknown;
}) =>
  | PrepareStepResult<TOOLS>
  | undefined
  | PromiseLike<PrepareStepResult<TOOLS> | undefined>;
