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

export type DecisionRequest = {
  state: DecisionState;
  questions: DecisionQuestionMap;
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
};

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
 * Injected fail-open decision caller — typically a bound `NeuroLink.tryDecide`,
 * which returns `null` on any failure rather than throwing.
 *
 * Every internal consumer of the `decide` inference type takes one of these
 * instead of importing a provider, exactly as the tool router takes a
 * `generateFn`. It is what keeps the consumers provider-import-free, and what
 * makes "no decision provider configured" indistinguishable from "the call
 * failed" at every call site: both are `null`, and both mean *carry on as
 * before*.
 */
export type DecisionCallerFn = (
  options: DecisionOptions,
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
