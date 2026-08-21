import type Anthropic from "@anthropic-ai/sdk";
import type { Tool } from "./tools.js";
import type {
  NativeFunctionCall,
  NativeToolDeclarationsResult,
} from "./providers.js";

/**
 * One chunk on the engine's stream.
 *
 * `reasoning` is carried alongside `content` rather than instead of it: the
 * providers that emit extended thinking (direct Anthropic, Google AI Studio,
 * Vertex) push a chunk with empty `content` and the thinking delta in
 * `reasoning`, so a channel typed `{ content: string }` alone would drop
 * every thinking delta the moment those providers move onto the engine —
 * silently, since the text path would keep working.
 */
export type AgenticLoopChunk = {
  content: string;
  reasoning?: string;
};

export type AgenticLoopToolCall = {
  id: string;
  name: string;
  args: Record<string, unknown>;
};

export type AgenticLoopUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  reasoningTokens?: number;
};

export type AgenticLoopStepResult<TRaw = unknown> = {
  text: string;
  reasoning?: string;
  toolCalls: AgenticLoopToolCall[];
  usage: AgenticLoopUsage;
  /** Provider's own raw stop/finish-reason string, e.g. "tool_use", "MAX_TOKENS" */
  rawStopReason: string | undefined;
  /** Adapter-private accumulated response data needed by buildToolResultMessages
   *  (e.g. Anthropic's ordered content blocks, Gemini's rawResponseParts). */
  raw: TRaw;
};

export type AgenticLoopToolCallResult = AgenticLoopToolCall & {
  output: unknown;
  error?: string;
  permanentlyFailed?: boolean;
};

export type AgenticLoopStepRequest = { raw: unknown };

export type AgenticLoopReclaimResult<TConversation> = {
  conversation: TConversation;
};

export type AgenticLoopToolFailureBreaker = {
  maxRetries: number;
};

/**
 * DESIGN DECISION — mid-turn tool-discovery hydration (Plan 08 blocker 2,
 * Task 7): resolved by the single optional `resolveToolOnMiss` field below,
 * NOT by a broader `dispatchTools?` full-dispatch override. A full-dispatch
 * override would let an adapter replace the engine's entire per-call
 * dispatch — breaker bookkeeping, execution, toolExecutions aggregation — so
 * every adapter needing hydration would have to reimplement that bookkeeping,
 * and any later engine-level fix to dispatch would silently not apply to the
 * adapters using the override. `resolveToolOnMiss` plugs into the existing
 * dispatch at the one decision point that needs a second lookup, leaving
 * breaker bookkeeping, retries and aggregation engine-owned for every
 * provider, hydrated or not.
 *
 * DESIGN DECISION — originalNameMap propagation (blocker 3): needs ZERO
 * engine or type change. Google's function-name sanitization is a translation
 * concern between the wire (sanitized names out, sanitized names back on
 * tool_call.name) and the engine's shape, which only ever sees plain string
 * names. An adapter that needs the map threads it as a constructor-time
 * closure and translates inside its own `executeStep` /
 * `buildToolResultMessages`, before those names cross the engine boundary.
 *
 * DESIGN DECISION — reserved-step + forced finalization (blocker 1, part 2):
 * stays OUTSIDE `runAgenticLoop`, in Vertex+Claude's own wrapper around
 * `resultPromise`. The reserved step needs no engine change at all — an
 * adapter declaring `maxSteps: requested - 1` means the engine's own loop
 * never touches the reserved slot. The forced call is a one-shot action taken
 * on the RESULT of a turn, not a repeatable step within one, so folding it in
 * would teach the engine a family-specific concept (forced tool_choice, a
 * distinguished terminal tool name) that every other adapter would then carry
 * and never set.
 *
 * DESIGN DECISION — terminal tool-call marking (blocker 1, part 1): needs
 * ZERO engine or type change. An adapter treats a detected terminal call as
 * terminal by omitting it from `toolCalls` and putting its parsed payload in
 * `text`. The engine already ends a turn the moment a step yields zero tool
 * calls, so such a step is indistinguishable from an ordinary final text
 * turn: never looked up in `options.tools`, never reaching TOOL_NOT_FOUND,
 * never counted against the breaker. Proven by a case in the loop-engine
 * suite rather than asserted here.
 */
export type AgenticLoopAdapter<TConversation = unknown, TRaw = unknown> = {
  readonly providerLabel: string;
  readonly maxSteps: number;
  /** Pre-existing per-family flat timeout, used as createTurnClock's deadline default. */
  readonly defaultTurnTimeoutMs?: number;
  readonly stallTimeoutMs?: number;
  /** Set only for adapter instances whose client has the TOOL_NOT_FOUND strike breaker today: both Gemini adapters (AI Studio, Vertex+Gemini) AND the Vertex+Claude call to createAnthropicLoopAdapter — NOT the native-Anthropic call to that same factory, and not Bedrock. See Verified Fact 4. */
  readonly toolFailureBreaker?: AgenticLoopToolFailureBreaker;
  /**
   * Second lookup path, consulted when a tool call names nothing executable
   * in the caller's `options.tools` — used by adapters supporting mid-turn
   * discovery to hydrate a tool the model just found via `search_tools`, or a
   * deferred-catalog tool called by its advertised name, before the engine
   * falls through to TOOL_NOT_FOUND and the breaker strike. See the design
   * decision above for why this is a narrow lookup and not a dispatch
   * override.
   */
  readonly resolveToolOnMiss?: (name: string) =>
    | {
        execute: (
          args: Record<string, unknown>,
          opts: unknown,
        ) => Promise<unknown>;
      }
    | undefined;

  buildStepRequest(
    conversation: TConversation,
    step: number,
  ): AgenticLoopStepRequest;
  executeStep(
    request: AgenticLoopStepRequest,
    channel: { push(chunk: AgenticLoopChunk): void },
    signal: AbortSignal,
  ): Promise<AgenticLoopStepResult<TRaw>>;
  buildToolResultMessages(
    conversation: TConversation,
    stepResult: AgenticLoopStepResult<TRaw>,
    toolResults: AgenticLoopToolCallResult[],
  ): TConversation;
  mapFinishReason(
    rawStopReason: string | undefined,
    hadToolCalls: boolean,
  ): string;

  /** Optional: in-turn context-budget reclaim, called once per step before buildStepRequest. */
  planReclaim?(
    conversation: TConversation,
    step: number,
  ): AgenticLoopReclaimResult<TConversation> | undefined;
  /** Optional: Vertex+Gemini-only single-retry-on-malformed-call. */
  isMalformedStep?(stepResult: AgenticLoopStepResult<TRaw>): boolean;
  buildMalformedRetryNote?(conversation: TConversation): TConversation;
};

/**
 * Construction input for `createAnthropicLoopAdapter`, shared by direct
 * Anthropic and Vertex+Claude.
 *
 * `toolFailureBreaker` is the one field the two call sites must differ on:
 * Vertex+Claude ports the Gemini loops' failure-strike breaker, native
 * Anthropic has never had one, and setting it for both would change native
 * Anthropic's behaviour under the guise of a shared refactor.
 */
export type AnthropicLoopAdapterConfig = {
  client: Pick<Anthropic, "messages">;
  maxSteps: number;
  /**
   * Build one step's request. A closure so the per-turn work the caller
   * already does — system prompt, tool declarations, sampling, thinking
   * config, cache breakpoints — stays where it is rather than moving here.
   */
  buildParams: (
    conversation: Anthropic.Messages.MessageParam[],
    step: number,
  ) => Anthropic.Messages.MessageCreateParams;
  /** The turn's live tool record, used for deferred-catalog resolution. */
  toolsRecord: Record<string, Tool>;
  /**
   * Name of the terminal structured-output tool when one is in play. A call
   * to it ends the turn: its arguments ARE the answer, so it is reported as
   * text and omitted from `toolCalls`, which routes it through the engine's
   * ordinary zero-tool-calls exit.
   */
  finalResultToolName?: string;
  toolFailureBreaker?: AgenticLoopToolFailureBreaker;
  /**
   * In-turn context reclaim, run once per step before the request is built.
   * Returns the rebuilt conversation when it reclaimed, undefined while the
   * request still fits — leaving history byte-identical in the common case so
   * the rolling prompt-cache prefix stays valid.
   *
   * Provider-supplied because the guard decides and the caller mutates in its
   * own concrete types: dropping an assistant tool_use message together with
   * its paired user tool_result is what keeps blocks paired. The loop appends
   * both every step with nothing else bounding growth, so a migration that
   * drops this overflows the window mid-turn.
   */
  planReclaim?: (
    conversation: Anthropic.Messages.MessageParam[],
    step: number,
  ) => Anthropic.Messages.MessageParam[] | undefined;
  /**
   * Calibration feedback for the provider's reclaim guard: the FULL prompt
   * size for the step just made — uncached input plus both cache tiers.
   * Passing input_tokens alone reads a cache-hit step as tiny and lets the
   * guard drift far under the real cost.
   */
  noteObservedPromptTokens?: (promptTokens: number) => void;
  abortSignal?: AbortSignal;
};

/** What one Gemini step produced, carried to `buildToolResultMessages`. */
export type GeminiStepRaw = {
  rawResponseParts: unknown[];
  stepFunctionCalls: NativeFunctionCall[];
};

/** One turn entry in a Gemini conversation: a role plus its content parts. */
export type GeminiTurnContent = {
  role: string;
  parts: unknown[];
};

/**
 * Construction input for `createGeminiLoopAdapter`, shared by Google AI Studio
 * and Vertex Gemini. Both issue `models.generateContentStream` and consume the
 * same response shape, so one adapter serves four hand-rolled loops.
 */
export type GeminiLoopAdapterCoreConfig = {
  /** Used in log lines and generated tool-call ids. */
  providerLabel: string;
  maxSteps: number;
  /** Build one step's request object (model, contents, config). */
  buildRequest: (conversation: GeminiTurnContent[], step: number) => unknown;
  /** Issue the request. Kept injectable so each provider keeps its own client. */
  sendStep: (
    request: unknown,
    signal: AbortSignal,
  ) => Promise<
    AsyncIterable<{
      functionCalls?: NativeFunctionCall[];
      [key: string]: unknown;
    }>
  >;
  /**
   * The turn's live tool record. Mid-turn `search_tools` discovery hydrates
   * into this, which is what both the declaration refresh and
   * `resolveToolOnMiss` read.
   */
  liveTools: Record<string, Tool>;
  /**
   * Declarations built for this turn. Carries `originalNameMap`, which keeps
   * Google's function-name sanitization on the adapter side of the engine
   * boundary.
   */
  declarations?: NativeToolDeclarationsResult;
  toolFailureBreaker?: AgenticLoopToolFailureBreaker;
  /**
   * In-turn context reclaim, run once per step before the request is built.
   * Returns the rebuilt conversation when it reclaimed, undefined when the
   * request still fits.
   *
   * Provider-supplied rather than engine-owned because the two Gemini
   * providers reclaim differently (reclaimAiStudioContext vs
   * reclaimVertexLoopContext) while the engine only decides WHEN to ask. The
   * loops append a model turn plus a tool turn every step with nothing else
   * bounding growth, so a migration that drops this overflows the context
   * window mid-turn and loses every completed step.
   */
  planReclaim?: (
    conversation: GeminiTurnContent[],
    step: number,
  ) => GeminiTurnContent[] | undefined;
  /**
   * Usage feedback for the provider's own context guard, called after each
   * step with that step's real token counts.
   */
  noteUsage?: (inputTokens: number, outputTokens: number) => void;
};

/**
 * Opt in to the single MALFORMED_FUNCTION_CALL retry.
 *
 * Vertex Gemini only. AI Studio has no such retry today (confirmed: zero
 * MALFORMED_FUNCTION_CALL handling in its client), and turning it on there
 * would be a behaviour change disguised as a shared refactor. The engine owns
 * the one-retry budget; this only says whether to ask.
 *
 * A union rather than two independent optional fields because the retry is
 * only worth spending a step on if the re-issued request differs from the one
 * that just failed. `runAgenticLoop` falls back to the unchanged conversation
 * when no note builder is supplied (`buildMalformedRetryNote?.(…) ??
 * conversation`), so enabling the retry without one re-sends a byte-identical
 * request and most often reproduces the same malformed call — a step burned
 * for nothing. Requiring the builder here makes that combination unsayable
 * instead of merely discouraged.
 */
export type GeminiMalformedRetryConfig =
  | {
      enableMalformedRetry: true;
      /**
       * Append the corrective turn that the retry re-issues with.
       * Provider-supplied because the note is written in the provider's own
       * content shape.
       */
      buildMalformedRetryNote: (
        conversation: GeminiTurnContent[],
      ) => GeminiTurnContent[];
    }
  | {
      enableMalformedRetry?: false;
      buildMalformedRetryNote?: never;
    };

export type GeminiLoopAdapterConfig = GeminiLoopAdapterCoreConfig &
  GeminiMalformedRetryConfig;

export type AgenticLoopOptions = {
  tools?: Record<
    string,
    {
      execute?: (
        args: Record<string, unknown>,
        opts: unknown,
      ) => Promise<unknown>;
    }
  >;
  abortSignal?: AbortSignal;
};

export type AgenticLoopResult<TConversation> = {
  text: string;
  toolCalls: AgenticLoopToolCall[];
  /**
   * Every tool dispatch the loop performed, in order, including the ones that
   * failed.
   *
   * `id` and `error` are carried because providers persist tool activity as
   * paired call/result records keyed by the provider's own tool-call id, and
   * a result that failed is stored differently from one that succeeded. A
   * shape with only name/input/output cannot reconstruct either, so a
   * provider migrating its hand-rolled loop onto this engine would have to
   * silently drop both from its history — which is a behaviour change, not a
   * refactor.
   */
  toolExecutions: Array<{
    id: string;
    name: string;
    input: Record<string, unknown>;
    output: unknown;
    error?: string;
  }>;
  usage: AgenticLoopUsage;
  finishReason: string;
  rawStopReason: string | undefined;
  conversation: TConversation;
};
