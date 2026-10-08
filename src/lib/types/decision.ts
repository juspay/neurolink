/**
 * Decision inference types — typed, calibrated judgements from a model that
 * emits no text.
 *
 * `decide` is the third inference type, alongside `generate` and `stream`. A
 * decision model takes one `state` plus a map of named typed questions and
 * returns one typed answer per question, all evaluated in a single parallel
 * pass. TypeSafe's Jev is the first such model; Vercel's AI SDK models the
 * same class separately from `LanguageModelV4`, for the same reason.
 *
 * The vocabulary here is deliberately **provider-neutral**. TypeSafe calls a
 * yes/no question a `noul` and answers it in a field of the same name; both
 * the Vercel AI SDK and Pydantic AI independently renamed that to `boolean` /
 * `probability` when exposing it. This file follows them, and the mapping to
 * a vendor's wire format belongs in that vendor's provider.
 *
 * Names are domain-prefixed `Decision*` to stay globally unique across
 * `src/lib/types/` (CLAUDE.md rule 9). Note `evaluate`/`Evaluation*` is a
 * different, unrelated feature — scoring a generated response with RAGAS.
 */

import type { NeurolinkCredentials } from "./providers.js";

/**
 * Anything a decision model accepts as free-form content. `state` may be a
 * plain string or structured JSON (chat logs, records); `instructions` and
 * `criteria` values likewise.
 */
export type DecisionInput =
  | string
  | number
  | boolean
  | readonly DecisionInput[]
  | { readonly [key: string]: DecisionInput };

/** The content being judged. One shared state per request. */
export type DecisionState = DecisionInput;

/**
 * A yes/no question. Answered with a probability and **no confidence of its
 * own** — gate it on distance from 0.5 via {@link decisionBooleanConfidence}.
 */
export type DecisionBooleanQuestion = {
  type: "boolean";
  instructions: DecisionInput;
  /** Optional descriptions of what a yes and a no mean. */
  criteria?: {
    true?: DecisionInput | null;
    false?: DecisionInput | null;
  };
};

/**
 * Pick one option. `criteria` maps option name → rubric description.
 *
 * The answer carries the full probability distribution, not just the winner,
 * so a single choice question over N options also **ranks** all N.
 */
export type DecisionChoiceQuestion = {
  type: "choice";
  instructions: DecisionInput;
  criteria: Readonly<Record<string, DecisionInput | null>>;
};

/**
 * Rate against an ordered rubric. The answer is the **0-based index**, so a
 * four-level rubric scores 0–3. At least two levels are required.
 */
export type DecisionScoreQuestion = {
  type: "score";
  instructions: DecisionInput;
  criteria: readonly (DecisionInput | null)[];
};

export type DecisionQuestion =
  | DecisionBooleanQuestion
  | DecisionChoiceQuestion
  | DecisionScoreQuestion;

/** Questions keyed by an id you choose; answers return under the same ids. */
export type DecisionQuestionMap = Readonly<Record<string, DecisionQuestion>>;

export type DecisionBooleanAnswer = {
  type: "boolean";
  /** Probability the statement is true, 0–1. */
  probability: number;
};

export type DecisionChoiceAnswer = {
  type: "choice";
  /** The highest-probability option name. */
  choice: string;
  /** Every option mapped to its probability. Key order is not stable. */
  probabilities: Readonly<Record<string, number>>;
  /** Calibrated certainty, 0–1, derived from the distribution. */
  confidence: number;
};

export type DecisionScoreAnswer = {
  type: "score";
  /** Probability-weighted level index; lands between levels. */
  score: number;
  /** Level index (as a string key) → the description supplied. */
  legend: Readonly<Record<string, string>>;
  /** Level index (as a string key) → probability. */
  probabilities: Readonly<Record<string, number>>;
  confidence: number;
};

export type DecisionAnswer =
  | DecisionBooleanAnswer
  | DecisionChoiceAnswer
  | DecisionScoreAnswer;

export type DecisionAnswerMap = Readonly<Record<string, DecisionAnswer>>;

export type DecisionUsage = {
  inputTokens: number;
  outputTokens: number;
};

/** An image or video as the caller supplies it: raw bytes, a file path, or a data URL. */
export type DecisionMediaSource = Buffer | string;

export type DecisionRequest = {
  state: DecisionState;
  questions: DecisionQuestionMap;
  /**
   * Images the model reads alongside `state`. Each is a Buffer, a local file
   * path or a `data:image/…;base64,` URL; an http(s) URL is refused. Only a
   * provider whose descriptor declares `decisionLimits.media` accepts them.
   */
  images?: readonly DecisionMediaSource[];
  /** One video, in the same forms. Sending images as well is allowed. */
  video?: DecisionMediaSource;
  /** Overrides the provider's configured model for this call only. */
  model?: string;
  signal?: AbortSignal;
  /** Overrides the configured timeout for this call only. */
  timeoutMs?: number;
};

export type DecisionResult = {
  /** The RESOLVED model id (e.g. "jev-1.13.0"), not the alias sent. */
  model: string;
  provider: string;
  answers: DecisionAnswerMap;
  usage: DecisionUsage;
  /** Vendor request id, for support escalation. */
  requestId?: string;
  /** Wall-clock round trip measured client-side. */
  latencyMs: number;
  /** Server-side time behind the edge; isolates model time from network. */
  upstreamMs?: number;
  /** Encoded size of the images and video sent. Absent for a text-only request. */
  mediaBytes?: number;
};

/**
 * Input a decision provider can actually read, declared on its descriptor.
 *
 * A request over either limit is refused before any network call with
 * `max_tokens_exceeded`, so no decision is ever made on input the model
 * silently cut off. Every internal consumer already treats that error as
 * "carry on as before".
 */
export type DecisionLimits = {
  /**
   * Estimated tokens of `state` (serialized first when it is not a string)
   * for any model NOT listed in `models` — an alias, a typo, a self-hosted
   * name — so it should be the tightest window the provider has.
   */
  maxStateTokens: number;
  /** Absent when the provider has no cap on questions per request. */
  maxQuestions?: number;
  /**
   * Tokens charged per non-ASCII character. The default estimate assumes ~4
   * characters per token, which holds for English and is several times too
   * generous for other scripts on an English tokenizer. Absent = default
   * estimate for every character.
   */
  nonAsciiTokensPerChar?: number;
  /**
   * Tokens charged per ASCII digit. A tokenizer that reads every digit as its
   * own token makes numbers, ids and timestamps several times longer than the
   * default estimate of four characters per token. Absent = digits are
   * estimated like any other ASCII character.
   */
  digitTokensPerChar?: number;
  /**
   * Tokens charged per ASCII punctuation or symbol character (`,` `.` `{` `"`
   * `:` and the like). The same tokenizers that read each digit alone read most
   * punctuation alone too, so JSON, logs and lists of numbers run far above four
   * characters a token. Absent = punctuation is estimated like any other ASCII
   * character.
   */
  symbolTokensPerChar?: number;
  /**
   * Tokens charged per character outside the Basic Multilingual Plane (emoji
   * and the like), which is counted separately from `nonAsciiTokensPerChar`
   * because it costs about twice as much. Absent = charged at
   * `nonAsciiTokensPerChar`.
   */
  astralTokensPerChar?: number;
  /** Per-model limits, keyed by model id; each field overrides the one above. */
  models?: Readonly<
    Record<string, { maxStateTokens: number; nonAsciiTokensPerChar?: number }>
  >;
  /** What the provider accepts besides text. Absent means text only. */
  media?: DecisionMediaLimits;
  /**
   * True when these figures describe the provider's own server-side ceiling,
   * published so callers can plan against it, and NeuroLink does NOT refuse
   * locally — the server does, with its own `max_tokens_exceeded`. Absent or
   * false means NeuroLink refuses an over-limit request before any network
   * call. `NeuroLink.decisionLimits()` reports the distinction as
   * `enforcedLocally`.
   */
  advisory?: boolean;
};

/**
 * A provider's decision limits resolved for one model — the figure the
 * pre-flight check compares against, flattened from a descriptor's
 * `decisionLimits` with the per-model override applied.
 *
 * Returned by `NeuroLink.decisionLimits()` so a host extending NeuroLink's
 * questions (see {@link DecisionHooks}) can size its additions before the
 * call, instead of discovering the cap when the whole request is refused.
 */
export type DecisionLimitsReading = {
  provider: string;
  model: string;
  maxStateTokens: number;
  /**
   * Absent when the provider caps a request by tokens (or bytes) rather
   * than by question count — TypeSafe and XOR; `Infinity` is never used.
   */
  maxQuestions?: number;
  nonAsciiTokensPerChar?: number;
  /** Tokens charged per ASCII digit; see {@link DecisionLimits.digitTokensPerChar}. */
  digitTokensPerChar?: number;
  /** Tokens charged per ASCII punctuation/symbol; see {@link DecisionLimits.symbolTokensPerChar}. */
  symbolTokensPerChar?: number;
  /** Tokens charged per astral character; see {@link DecisionLimits.astralTokensPerChar}. */
  astralTokensPerChar?: number;
  /** What the provider accepts besides text; absent means text only. */
  media?: DecisionMediaLimits;
  /**
   * Whether NeuroLink itself refuses an over-limit request before any network
   * call (Laya), or merely reports the server's ceiling (TypeSafe).
   */
  enforcedLocally: boolean;
};

/** What `NeuroLink.decisionLimits()` accepts: the same selection `decide()` takes. */
export type DecisionLimitsQuery = {
  /** Provider name or alias; defaults to the configured decision provider. */
  provider?: string;
  /** Defaults to the provider's configured model, then its default model. */
  model?: string;
  credentials?: NeurolinkCredentials;
};

export type DecisionMediaLimits = {
  /** Most images one request may carry. */
  maxImages: number;
  /** Whether a video is accepted (at most one). */
  video: boolean;
  /** Ceiling on the encoded request body, in bytes. */
  maxRequestBytes: number;
};

/** An image's size in pixels, read from its header. */
export type DecisionImageDimensions = { width: number; height: number };

/** Media after preparation: everything is a `data:` URL, ready for the wire. */
export type DecisionPreparedMedia = {
  images: string[];
  video?: string;
  /** Encoded size of every URL above. */
  bytes: number;
};

/**
 * Discriminated by a string literal, not a boolean: the package is also
 * compiled without strictNullChecks, where a boolean discriminant does not
 * narrow.
 */
export type DecisionMediaResult =
  | { status: "prepared"; media: DecisionPreparedMedia | undefined }
  | { status: "refused"; message: string };

export type DecisionMediaKind = "image" | "video";

/** One image or video turned into a data URL, or the reason it could not be. Same literal-discriminant rule as above. */
export type DecisionMediaConversion =
  | { status: "ok"; dataUrl: string }
  | { status: "error"; message: string };

/** A media file read from disk, or the reason it could not be. */
export type DecisionMediaFileRead =
  | { status: "ok"; buffer: Buffer }
  | { status: "error"; message: string };

/**
 * Why a decision call failed, normalised across vendors. TypeSafe alone
 * returns two different error envelopes, so a provider must flatten them.
 */
export type DecisionErrorKind =
  | "authentication"
  | "invalid_request"
  | "max_tokens_exceeded"
  | "rate_limit"
  | "overloaded"
  | "server"
  | "timeout"
  | "network";

export type DecisionError = {
  kind: DecisionErrorKind;
  message: string;
  status?: number;
  requestId?: string;
  /** True when a retry could plausibly succeed. */
  retryable: boolean;
};

/** One entry from a decision provider's model listing. */
export type DecisionModelCard = {
  name: string;
  description: string;
  releaseDate: string;
};

/**
 * Narrowed view of a choice answer, safe to consume without re-narrowing.
 * Returned by the reader helpers so call sites need no type assertion.
 */
export type DecisionChoiceReading = {
  choice: string;
  confidence: number;
  probabilities: Readonly<Record<string, number>>;
  /**
   * Every option ordered by probability, highest first. A choice question is
   * therefore also a ranking — the basis for catalogue selection.
   */
  ranked: readonly { name: string; probability: number }[];
};

export type DecisionScoreReading = {
  score: number;
  confidence: number;
  legend: Readonly<Record<string, string>>;
  probabilities: Readonly<Record<string, number>>;
};

/**
 * What `NeuroLink.decide()` accepts: a decision request plus the usual
 * provider/credential selection every inference type shares.
 */
export type DecisionOptions = DecisionRequest & {
  /**
   * Provider name or alias. Defaults to the first registered provider whose
   * descriptor declares `"decide"` in `inferenceKinds`.
   */
  provider?: string;
  /** Per-call credential overrides, as `generate()` takes. */
  credentials?: NeurolinkCredentials;
};

/**
 * The built-in consumers of the `decide` inference type — one name per place
 * NeuroLink asks a decision model something on its own behalf. Each consumer
 * stamps its request with its site, which is what lets a host's
 * {@link DecisionHooks} tell the calls apart and lets telemetry attribute them.
 *
 * - `routing` — the classifier router (difficulty, capabilities, risk, model, context scope)
 * - `toolRouting` — one yes/no per MCP server
 * - `contextRelevance` — one yes/no per earlier message, compaction stage 0
 * - `summaryGate` — accept or reject a generated summary, compaction stage 3
 * - `ragPlan` — per-query retrieval plan (`RAGPipeline` only)
 */
export type DecisionSite =
  | "routing"
  | "toolRouting"
  | "contextRelevance"
  | "summaryGate"
  | "ragPlan";

/**
 * Options an internal decision site hands its caller: the public
 * {@link DecisionOptions} plus in-process context that never reaches the
 * wire. A bound `NeuroLink.tryDecide` accepts it unchanged; a host wrapping
 * one can read `site` to see which consumer is asking.
 */
export type DecisionCallerOptions = DecisionOptions & {
  /** Which built-in consumer is asking. Unset on a host's own `tryDecide` call. */
  site?: DecisionSite;
  /** The conversation the outer request belongs to. Never sent to the model. */
  sessionId?: string;
  /** The outer request's id. Never sent to the model. */
  requestId?: string;
};

/**
 * What an internal decision site inherits from the `generate()` / `stream()`
 * call it runs inside: the per-call credentials (so the decision goes to the
 * caller's provider account, not the instance's), the abort signal, and the
 * ids a host's {@link DecisionHooks} may want to correlate on.
 */
export type DecisionSiteContext = {
  credentials?: NeurolinkCredentials;
  signal?: AbortSignal;
  sessionId?: string;
  requestId?: string;
};

/** What a site call adds to its decision span beyond the request itself. */
export type DecisionSiteAttributes = {
  site: DecisionSite;
  /** Questions a host's `extendQuestions` hook added; 0 without hooks. */
  hostQuestionCount: number;
};

/**
 * What a {@link DecisionHooks} callback sees before the call: the site, the
 * state NeuroLink is about to send, and NeuroLink's own questions — as
 * copies, so a hook that edits them cannot reach the wire request.
 */
export type DecisionHookContext = {
  site: DecisionSite;
  state: DecisionState;
  /** NeuroLink's own questions for this site, keyed by its own ids. */
  questions: DecisionQuestionMap;
  sessionId?: string;
  requestId?: string;
};

/** What `onAnswers` receives once the decision has returned. */
export type DecisionHookAnswersContext = DecisionHookContext & {
  /**
   * The host's answers, keyed by the ids the host used in `extendQuestions`
   * — the namespacing applied on the wire is undone here. Empty when the
   * host added no questions.
   */
  answers: DecisionAnswerMap;
  /** The whole result, including NeuroLink's own answers under its own ids. */
  result: DecisionResult;
};

/**
 * Ride along on the decision calls NeuroLink already makes.
 *
 * Latency on a decision model is flat in question count, so a host with its
 * own yes/no or choice questions about the same request pays nothing to ask
 * them in the round trip NeuroLink is making anyway — one request per
 * {@link DecisionSite}, never a second. The host's questions are namespaced
 * on the wire so they can never collide with NeuroLink's, capped so they can
 * never push the request past the provider's question limit (which would
 * refuse the whole call and degrade NeuroLink's own routing), and answered
 * back under the host's original ids.
 *
 * Both hooks are fail-open: a hook that throws is logged and the decision
 * proceeds with NeuroLink's own questions, and neither can change what
 * NeuroLink does with its own answers — every value a hook or listener is
 * handed is a copy. Without hooks, the decision payload (state and
 * questions) is exactly what the consumer built; the outer request's
 * per-call `credentials` are still forwarded, so the account and base URL
 * on the wire can differ from the instance's. Hooks are inert without a
 * decision provider: neither runs, and no event fires.
 */
export type DecisionHooks = {
  /**
   * Return extra questions to send with this site's call, or `undefined` to
   * add none. An invalid question is dropped with a warning; questions past
   * the provider's cap are dropped from the end, also with a warning.
   */
  extendQuestions?: (
    context: DecisionHookContext,
  ) =>
    | DecisionQuestionMap
    | undefined
    | Promise<DecisionQuestionMap | undefined>;
  /**
   * Called with the host's answers (under the host's ids) and the full result
   * whenever a site call returns one. Observe-only: it receives a copy, so
   * mutating it cannot reach the answers NeuroLink's own consumer reads.
   */
  onAnswers?: (context: DecisionHookAnswersContext) => void | Promise<void>;
  /**
   * Upper bound, in milliseconds, on each hook call. Both hooks sit on the
   * request path (routing, tool routing, compaction, RAG planning), so a
   * hook that hangs would stall the turn; past this bound the call proceeds
   * as if the hook had returned nothing, with a warning. Default 2000. Must
   * be a finite number from 1 to {@link MAX_DECISION_HOOK_TIMEOUT_MS};
   * anything else (including `Infinity`) falls back to the default with one
   * warning, since a timer given such a delay fires immediately.
   */
  hookTimeoutMs?: number;
};

/** Default bound on a `DecisionHooks` callback, in milliseconds. */
export const DEFAULT_DECISION_HOOK_TIMEOUT_MS = 2000;

/**
 * Largest `hookTimeoutMs` a timer honours (2^31 − 1 ms, about 24.8 days).
 * A delay past it — or `Infinity`, `NaN`, 0, a negative — fires at once,
 * so such a value falls back to the default instead of timing every hook
 * out immediately.
 */
export const MAX_DECISION_HOOK_TIMEOUT_MS = 2_147_483_647;

/**
 * Payload of the `decision:before` event, emitted once per site call. `state`
 * and `questions` are copies: a listener that edits them changes neither
 * the request on the wire nor the consumer's own question objects.
 */
export type DecisionBeforeEvent = {
  site: DecisionSite;
  state: DecisionState;
  /** Everything about to be sent, NeuroLink's own questions plus the host's (namespaced). */
  questions: DecisionQuestionMap;
  hostQuestionCount: number;
  sessionId?: string;
  requestId?: string;
};

/**
 * Payload of the `decision:after` event, emitted once per site call whether
 * or not it produced a result — a decision path that stopped working must
 * stay observable. `result` is null when an emitted call failed; with no
 * decision provider configured, no event fires at all.
 */
export type DecisionAfterEvent = {
  site: DecisionSite;
  /** NeuroLink's own answers, under its own ids. Empty when `result` is null. */
  answers: DecisionAnswerMap;
  /** The host's answers, under the host's original ids. Empty when `result` is null. */
  hostAnswers: DecisionAnswerMap;
  latencyMs: number;
  provider?: string;
  model?: string;
  result: DecisionResult | null;
  sessionId?: string;
  requestId?: string;
};

/**
 * Injected fail-open decision caller — typically a bound `NeuroLink.tryDecide`,
 * which returns `null` on any failure rather than throwing.
 *
 * Every internal consumer of the `decide` inference type takes one of these
 * instead of importing a provider, exactly as the tool router takes a
 * `generateFn`. It is what keeps the consumers provider-import-free, and what
 * makes "no decision provider configured" indistinguishable from "the call
 * failed" at every call site: both are `null`, and both mean *carry on as
 * before*.
 *
 * The options carry a {@link DecisionSite} stamp; a bound `tryDecide` routes
 * a stamped request through the host's {@link DecisionHooks}.
 */
export type DecisionCallerFn = (
  options: DecisionCallerOptions,
) => Promise<DecisionResult | null>;

/**
 * Shared gate for acting on a yes/no answer.
 *
 * A `boolean` answer carries no confidence of its own, so two separate bars
 * apply: which side of the coin flip it fell on, and how far from the flip it
 * landed. Both must be cleared, which is why "probability 0.55" never counts
 * as a yes.
 */
export type DecisionBooleanGate = {
  /** Minimum probability to read the answer as "yes". Default 0.5. */
  minProbability?: number;
  /** Minimum {@link decisionBooleanConfidence} to act at all. Default 0.4. */
  minConfidence?: number;
};

/** The wire family a decide provider speaks. */
export type DecideDialectName = "system-one";

export type DecisionAnswerReading = {
  readonly answers: Readonly<Record<string, DecisionAnswer>>;
  /** Ids of answers the server returned that could not be parsed. */
  readonly dropped: readonly string[];
};

/**
 * How questions are written to, and answers read from, a decide wire. One
 * dialect serves every vendor that speaks the same layout.
 */
export type DecisionDialect = {
  readonly name: DecideDialectName;
  encodeQuestion: (question: DecisionQuestion) => Record<string, unknown>;
  /** `undefined` means the response has no usable answers container. */
  readAnswers: (
    decoded: Readonly<Record<string, unknown>>,
    reportedConfidence: Readonly<Record<string, number>>,
  ) => DecisionAnswerReading | undefined;
};
