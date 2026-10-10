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
 * non-string state is serialized first, as it is on the wire. When the limits
 * declare a `structuredNonAsciiTokensPerChar` rate, a non-string state's
 * non-ASCII characters are charged at it instead, once per `\uXXXX` escape (two
 * for an astral character), because that server reads such a state as
 * ASCII-escaped JSON.
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
    | "structuredNonAsciiTokensPerChar"
  >,
): number {
  const text = serializeForEstimate(state);
  const nonAsciiTokensPerChar = limits?.nonAsciiTokensPerChar;
  const digit = limits?.digitTokensPerChar;
  const symbol = limits?.symbolTokensPerChar;
  const astral = limits?.astralTokensPerChar;
  // Only a non-string state is escaped on the way to the model; a string
  // state reaches it as written.
  const escaped =
    typeof state === "string"
      ? undefined
      : limits?.structuredNonAsciiTokensPerChar;
  if (
    nonAsciiTokensPerChar === undefined &&
    digit === undefined &&
    symbol === undefined &&
    astral === undefined &&
    escaped === undefined
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
  let escapes = 0;
  const rest: string[] = [];
  for (const c of text) {
    const code = c.codePointAt(0) ?? 0;
    if (code > 0x7f && escaped !== undefined) {
      // One `\uXXXX` per UTF-16 code unit: an astral character is a
      // surrogate pair, so it is escaped twice.
      escapes += code > 0xffff ? 2 : 1;
    } else if (code > 0xffff && astral !== undefined) {
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
    Math.ceil(nonAscii * (nonAsciiTokensPerChar ?? 1 / CHARS_PER_TOKEN)) +
    Math.ceil(escapes * (escaped ?? 0))
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
    // question count (TypeSafe, XOR).
    ...(limits.maxQuestions !== undefined
      ? { maxQuestions: limits.maxQuestions }
      : {}),
    ...(nonAsciiTokensPerChar !== undefined ? { nonAsciiTokensPerChar } : {}),
    // Not model-overridable — `models` only carries `maxStateTokens` and
    // `nonAsciiTokensPerChar` — so these four come from the base limits only.
    ...(limits.digitTokensPerChar !== undefined
      ? { digitTokensPerChar: limits.digitTokensPerChar }
      : {}),
    ...(limits.symbolTokensPerChar !== undefined
      ? { symbolTokensPerChar: limits.symbolTokensPerChar }
      : {}),
    ...(limits.astralTokensPerChar !== undefined
      ? { astralTokensPerChar: limits.astralTokensPerChar }
      : {}),
    ...(limits.structuredNonAsciiTokensPerChar !== undefined
      ? {
          structuredNonAsciiTokensPerChar:
            limits.structuredNonAsciiTokensPerChar,
        }
      : {}),
    ...(limits.media !== undefined ? { media: limits.media } : {}),
    enforcedLocally: limits.advisory !== true,
  };
}
