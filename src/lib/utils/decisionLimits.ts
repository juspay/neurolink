/**
 * Decision limits — the one place a provider's `decisionLimits` are read and
 * a state's size is estimated against them.
 *
 * `SystemOneDecisionProvider` refuses an over-limit request through these
 * functions, and `NeuroLink.decisionLimits()` / `estimateDecisionStateTokens`
 * expose the same functions to hosts, so what a host measures before the call
 * is exactly what the pre-flight check measures inside it. Two estimators that
 * drift apart would let a host size a state as fitting and then watch it be
 * refused.
 *
 * @module utils/decisionLimits
 */

import type {
  DecisionLimits,
  DecisionLimitsReading,
  DecisionQuestion,
  DecisionQuestionType,
  DecisionState,
  ProviderDescriptor,
} from "../types/index.js";
import {
  CHARS_PER_TOKEN,
  estimateTokens,
  serializeForEstimate,
} from "./tokenEstimation.js";

/**
 * Estimate how many tokens a decision model will read from `state`.
 *
 * `estimateTokens` assumes ~4 characters per token. That holds for English
 * and is several times too generous for other scripts on an English
 * tokenizer, so when the limits declare a `nonAsciiTokensPerChar` rate,
 * non-ASCII characters are counted at it instead. Digits, ASCII punctuation
 * and astral characters (emoji) are each counted separately only when the
 * limits declare a rate for that class — a tokenizer that reads each digit,
 * and most punctuation, on its own makes a number-heavy or JSON-heavy state
 * several times longer than the ~4-characters-per-token estimate suggests. A
 * non-string state is serialized first, as it is on the wire.
 *
 * This is the estimator the pre-flight refusal uses: a state this reports at
 * or under `maxStateTokens` is sent, one over it is refused before any
 * network call.
 */
export function estimateDecisionStateTokens(
  state: DecisionState,
  limits?: Pick<
    DecisionLimits,
    | "nonAsciiTokensPerChar"
    | "digitTokensPerChar"
    | "symbolTokensPerChar"
    | "astralTokensPerChar"
  >,
): number {
  const text = serializeForEstimate(state);
  const nonAsciiTokensPerChar = limits?.nonAsciiTokensPerChar;
  const digit = limits?.digitTokensPerChar;
  const symbol = limits?.symbolTokensPerChar;
  const astral = limits?.astralTokensPerChar;
  if (
    nonAsciiTokensPerChar === undefined &&
    digit === undefined &&
    symbol === undefined &&
    astral === undefined
  ) {
    return estimateTokens(text);
  }
  // Each class of character is counted once, at its own rate. A class with no
  // declared rate stays in the ordinary four-characters-a-token estimate (or,
  // for non-ASCII, at that estimate's per-character rate), so a provider that
  // declares none of the extra rates is estimated exactly as before.
  const isDigit = (c: string) => c >= "0" && c <= "9";
  const isSymbol = (c: string) => /[!-/:-@[-`{-~]/.test(c);
  let digits = 0;
  let symbols = 0;
  let astrals = 0;
  let nonAscii = 0;
  const rest: string[] = [];
  for (const c of text) {
    const code = c.codePointAt(0) ?? 0;
    if (code > 0xffff && astral !== undefined) {
      astrals += 1;
    } else if (code > 0x7f) {
      nonAscii += 1;
    } else if (digit !== undefined && isDigit(c)) {
      digits += 1;
    } else if (symbol !== undefined && isSymbol(c)) {
      symbols += 1;
    } else {
      rest.push(c);
    }
  }
  return (
    estimateTokens(rest.join("")) +
    Math.ceil(digits * (digit ?? 0)) +
    Math.ceil(symbols * (symbol ?? 0)) +
    Math.ceil(astrals * (astral ?? 0)) +
    Math.ceil(nonAscii * (nonAsciiTokensPerChar ?? 1 / CHARS_PER_TOKEN))
  );
}

/**
 * Flatten a descriptor's `decisionLimits` for one model: the per-model entry
 * overrides the base, field by field, and `advisory` becomes
 * `enforcedLocally: false`. Returns null for a descriptor that declares no
 * limits.
 */
export function resolveDecisionLimitsReading(
  descriptor: Pick<ProviderDescriptor, "name" | "decisionLimits">,
  model: string,
): DecisionLimitsReading | null {
  const limits = descriptor.decisionLimits;
  if (!limits) {
    return null;
  }
  const modelLimits = limits.models?.[model];
  const nonAsciiTokensPerChar =
    modelLimits?.nonAsciiTokensPerChar ?? limits.nonAsciiTokensPerChar;
  return {
    provider: descriptor.name,
    model,
    maxStateTokens: modelLimits?.maxStateTokens ?? limits.maxStateTokens,
    // Absent for a provider that caps by tokens or bytes rather than by
    // question count (TypeSafe).
    ...(limits.maxQuestions !== undefined
      ? { maxQuestions: limits.maxQuestions }
      : {}),
    ...(limits.questionTypes !== undefined
      ? { questionTypes: [...limits.questionTypes] }
      : {}),
    ...(limits.maxScoreLevels !== undefined
      ? { maxScoreLevels: limits.maxScoreLevels }
      : {}),
    ...(limits.maxChoiceOptions !== undefined
      ? { maxChoiceOptions: limits.maxChoiceOptions }
      : {}),
    ...(nonAsciiTokensPerChar !== undefined ? { nonAsciiTokensPerChar } : {}),
    // Not model-overridable — `models` only carries `maxStateTokens` and
    // `nonAsciiTokensPerChar` — so these three come from the base limits only.
    ...(limits.digitTokensPerChar !== undefined
      ? { digitTokensPerChar: limits.digitTokensPerChar }
      : {}),
    ...(limits.symbolTokensPerChar !== undefined
      ? { symbolTokensPerChar: limits.symbolTokensPerChar }
      : {}),
    ...(limits.astralTokensPerChar !== undefined
      ? { astralTokensPerChar: limits.astralTokensPerChar }
      : {}),
    ...(limits.media !== undefined ? { media: limits.media } : {}),
    enforcedLocally: limits.advisory !== true,
  };
}

/** What a provider reads when its limits list no `questionTypes`. */
export const DEFAULT_DECISION_QUESTION_TYPES: readonly DecisionQuestionType[] =
  ["boolean", "choice", "score"];

/** The type a question needs a provider to read; a `choice` with `unknown` on needs `choice-unknown`. */
export function decisionQuestionTypeOf(
  question: DecisionQuestion,
): DecisionQuestionType {
  return question.type === "choice" && question.unknown === true
    ? "choice-unknown"
    : question.type;
}

/**
 * Why a provider with these limits cannot be asked `question`, or undefined
 * when it can. Applies whether or not the limits are advisory: a question type
 * the server does not know is refused outright, never answered from a guess.
 * `limits` is null for a provider that declares no limits at all, which reads
 * the default types and has no per-question caps.
 */
export function unsupportedDecisionQuestion(
  question: DecisionQuestion,
  limits: Pick<
    DecisionLimitsReading,
    "questionTypes" | "maxScoreLevels" | "maxChoiceOptions"
  > | null,
): string | undefined {
  const types = limits?.questionTypes ?? DEFAULT_DECISION_QUESTION_TYPES;
  const type = decisionQuestionTypeOf(question);
  if (!types.includes(type)) {
    return type === "choice-unknown"
      ? "a choice with unknown: true is not accepted"
      : `the question type "${type}" is not accepted (accepted: ${types.join(", ")})`;
  }
  if (question.type === "choice") {
    const keys = Object.keys(question.criteria);
    if (question.unknown === true && keys.includes("unknown")) {
      return 'a choice with unknown: true cannot also name an option "unknown"';
    }
    const options = keys.length + (question.unknown === true ? 1 : 0);
    const max = limits?.maxChoiceOptions;
    if (max !== undefined && options > max) {
      return `a choice may have at most ${max} options${question.unknown === true ? ", counting unknown" : ""}; this one has ${options}`;
    }
  }
  if (question.type === "score") {
    const max = limits?.maxScoreLevels;
    if (max !== undefined && question.criteria.length > max) {
      return `a score may have at most ${max} levels; this one has ${question.criteria.length}`;
    }
  }
  return undefined;
}
