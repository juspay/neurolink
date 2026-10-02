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
import { estimateTokens, serializeForEstimate } from "./tokenEstimation.js";

/**
 * Estimate how many tokens a decision model will read from `state`.
 *
 * `estimateTokens` assumes ~4 characters per token. That holds for English
 * and is several times too generous for other scripts on an English
 * tokenizer, so when the limits declare a `nonAsciiTokensPerChar` rate,
 * non-ASCII characters are counted at it instead. A non-string state is
 * serialized first, as it is on the wire.
 *
 * This is the estimator the pre-flight refusal uses: a state this reports at
 * or under `maxStateTokens` is sent, one over it is refused before any
 * network call.
 */
export function estimateDecisionStateTokens(
  state: DecisionState,
  limits?: Pick<DecisionLimits, "nonAsciiTokensPerChar">,
): number {
  const text = serializeForEstimate(state);
  const rate = limits?.nonAsciiTokensPerChar;
  if (rate === undefined) {
    return estimateTokens(text);
  }
  const chars = [...text];
  const isAscii = (c: string) => (c.codePointAt(0) ?? 0) <= 0x7f;
  const ascii = chars.filter(isAscii).join("");
  const nonAsciiCount = chars.length - ascii.length;
  return estimateTokens(ascii) + Math.ceil(nonAsciiCount * rate);
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
    ...(limits.media !== undefined ? { media: limits.media } : {}),
    enforcedLocally: limits.advisory !== true,
  };
}
