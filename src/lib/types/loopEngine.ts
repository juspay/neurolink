import type Anthropic from "@anthropic-ai/sdk";
import type { Span } from "@opentelemetry/api";
import type { Tool } from "./tools.js";
import type {
  CollectedChunkResult,
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

export type AgenticLoopStepRequest = {
  raw: unknown;
  /**
   * Tools that became callable while this step's request was being built —
   * mid-turn discovery hydrating a name the model had already tried.
   *
   * The engine clears each one's failure strikes before dispatching, because
   * TOOL_NOT_FOUND strikes accrued while a tool was deferred are snapshot
   * artifacts rather than real failures. Clearing them at the miss-resolution
   * path instead would be too late: the breaker is consulted BEFORE the
   * lookup, so a tool already at the strike limit is refused without the
   * resolution path ever running.
   */
  hydratedToolNames?: string[];
};

export type AgenticLoopReclaimResult<TConversation> = {
  conversation?: TConversation;
  /**
   * End the turn now, BEFORE this step's request is issued.
   *
   * A context guard does two things, and only one of them is "reclaim". When
   * dropping old exchanges buys enough room the turn continues; when it does
   * not, the guard has to stop rather than step into a provider rejection
   * that would lose every completed step. Nothing else can express that: the
   * hook returns a conversation, and an adapter cannot break the engine's
   * loop.
   *
   * Aborting the caller's own signal from inside this hook does NOT work as a
   * substitute — the engine checks for an abort at the TOP of the step, above
   * this call, so the request would still be issued and the stop would not
   * take effect until the following step.
   */
  stop?: boolean;
};

export type AgenticLoopToolFailureBreaker = {
  maxRetries: number;
  /**
   * Count CONSECUTIVE failures rather than lifetime ones: a clean result
   * clears the strike count for that tool.
   *
   * Off by default because the two behaviours diverge for a tool that fails
   * intermittently, and the providers already on this engine accumulate. What
   * it protects is the argument-dependent soft error — a file-not-found on one
   * path, fine on the next — which under lifetime counting disables a working
   * tool for the rest of the turn.
   */
  consecutive?: boolean;
  /**
   * Decide whether a RESOLVED tool result is really a failure.
   *
   * Some tools report failure without throwing: MCP `isError` payloads, a
   * proxy-blocked call returning `{ error }`. Counting only thrown errors lets
   * the model grind on one of those for the entire step budget. Returning a
   * non-empty string strikes the breaker exactly as a throw does; returning
   * undefined leaves the result a success.
   *
   * Off by default — a provider whose loop never inspected results this way
   * must not start doing so as a side effect of migrating.
   */
  classifyResultFailure?: (output: unknown) => string | undefined;
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
  //
  // NOTE — turn deadlines and stall detection are deliberately NOT adapter
  // fields.
  //
  // `defaultTurnTimeoutMs` and `stallTimeoutMs` used to be declared here and
  // were read by nothing: `runAgenticLoop` has no turn clock, and no adapter
  // ever set them. Leaving them in place was worse than omitting them,
  // because the natural move when migrating a provider that HAS a turn clock
  // (Vertex) is to set them and assume the engine honours it — which would
  // silently drop the deadline and the stall detection from that turn.
  //
  // Both belong to the caller, which already owns the clock and can compose
  // its abort into the `abortSignal` it passes, and can reset a stall timer
  // as it drains the engine's stream. That keeps one implementation of the
  // behaviour rather than a second, weaker one inside the engine.
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
  /**
   * `step` is the engine's own zero-based step index, not a count of times
   * this hook ran. Adapters persist tool activity keyed by it, and the two
   * numbers diverge: a malformed-call retry `continue`s before this hook is
   * reached and still consumes a step, so an adapter counting its own
   * invocations drifts by exactly the number of retries and mislabels every
   * row after the first one.
   */
  buildToolResultMessages(
    conversation: TConversation,
    stepResult: AgenticLoopStepResult<TRaw>,
    toolResults: AgenticLoopToolCallResult[],
    step: number,
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
  buildMalformedRetryNote?(
    conversation: TConversation,
    step: number,
  ): TConversation;
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
  /**
   * Called with the terminal tool's payload when one was actually detected.
   *
   * The caller cannot infer this from the turn's result. A structured turn
   * ends with the payload in `text` when the model called the terminal tool,
   * and with ordinary prose in `text` when it ignored the instruction and
   * answered directly — the two are indistinguishable downstream, yet they
   * are handled differently: the payload is delivered as the answer, while
   * prose is delivered from the caller's own buffer. Comparing strings to
   * tell them apart would be guesswork, so the adapter says which happened.
   */
  onTerminalResult?: (text: string) => void;
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

/**
 * The three things a native Gemini loop wraps around every tool call that the
 * shared engine does not do itself.
 *
 * All optional, and the whole object is optional, because the two Gemini
 * providers differ here: Vertex bounds tool execution and runs a stall
 * watchdog, AI Studio does neither. Passing nothing leaves an executor exactly
 * as the caller supplied it, so this cannot quietly give AI Studio behaviour
 * its hand-rolled loops never had.
 */
export type GeminiToolExecutionGuards = {
  /** Upper bound on a single execute(); omit for no bound. */
  toolTimeoutMs?: number;
  /**
   * Turn-level abort, raced against the call so a deadline or caller cancel is
   * observed immediately instead of after the tool settles.
   */
  abortSignal?: AbortSignal;
  /**
   * Stall-watchdog ping, called either side of the await. The watchdog is a
   * whole-turn interval measuring wall-clock since the last mark, so a
   * legitimately slow tool reads as a stalled turn without this.
   */
  onProgress?: () => void;
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
  ) => AgenticLoopReclaimResult<GeminiTurnContent[]> | undefined;
  /**
   * Usage feedback for the provider's own context guard, called after each
   * step with that step's real token counts.
   */
  noteUsage?: (inputTokens: number, outputTokens: number) => void;
  /**
   * Name of the terminal structured-output tool when one is in play. A call
   * to it ends the turn: its arguments ARE the answer, so it is reported as
   * text and omitted from `toolCalls`, which routes it through the engine's
   * ordinary zero-tool-calls exit — never dispatched, never counted against
   * the breaker, never recorded as a tool execution.
   */
  finalResultToolName?: string;
  /**
   * Called with the terminal tool's payload when one was actually detected.
   *
   * The caller cannot infer this from the turn's result: a structured turn
   * ends with the payload in `text` when the model called the terminal tool,
   * and with ordinary prose in `text` when it answered directly instead, and
   * those two are indistinguishable downstream while being handled
   * differently. Comparing strings to tell them apart would be guesswork.
   */
  onTerminalResult?: (text: string) => void;
  /**
   * Fold one step's raw stream into the shape the adapter reports.
   *
   * Defaults to `collectStreamChunksIncremental`, which is what AI Studio and
   * any provider sharing the googleNativeGemini3 helpers want. Vertex does
   * NOT share them: its loop drains the stream itself, folding cumulative
   * usage counts as deltas and capturing thought signatures in its own way,
   * and that behaviour is characterized rather than incidental.
   *
   * So the collector is a hook rather than a hard-coded call. A provider
   * whose drain differs supplies its own and keeps its measured behaviour;
   * one that matches the shared helper passes nothing.
   */
  collectStep?: (
    stream: unknown,
    channel: { push(chunk: AgenticLoopChunk): void },
  ) => Promise<CollectedChunkResult>;
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
        step: number,
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
  /**
   * Span the per-step provider retry annotates, via
   * `withProviderRetry(..., span, ...)` — it records
   * `gen_ai.provider.total_attempts` on every completed step, retried or not.
   *
   * Caller-supplied rather than read from the ambient context inside the
   * engine. Reading it here would hand the attribute to every provider on the
   * engine, including ones whose hand-rolled loops never emitted it, and a
   * refactor that silently ADDS observable behaviour is the same defect as one
   * that silently drops it. Today only the direct Anthropic loops set this,
   * because only they threaded a span before moving onto the engine.
   */
  span?: Span;
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
