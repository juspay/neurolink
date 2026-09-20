/**
 * Readers for a decision model's answer map.
 *
 * Every reader validates at runtime and returns `undefined` for a missing id
 * **or** a type mismatch, so no call site needs a type assertion (CLAUDE.md
 * rule 14) and "no opinion" stays distinguishable from "an opinion of 0".
 *
 * @module utils/decisionAnswers
 */

import type {
  DecisionAnswerMap,
  DecisionBooleanGate,
  DecisionChoiceReading,
  DecisionScoreReading,
  ProviderDescriptor,
} from "../types/index.js";
import { DEFAULT_INFERENCE_KINDS } from "../types/index.js";

/**
 * Read a yes/no answer as a probability.
 *
 * Returns undefined when the id is absent or the answer was a different
 * type — a caller can therefore tell "not answered" from "answered 0".
 */
export function readDecisionBoolean(
  answers: DecisionAnswerMap,
  id: string,
): number | undefined {
  const answer = answers[id];
  return answer?.type === "boolean" ? answer.probability : undefined;
}

/**
 * Read a choice answer, including the full ranking.
 *
 * `ranked` is the distribution sorted highest-first. This is what makes one
 * choice question over N options a ranking of all N — the basis for picking
 * from a large catalogue in a single request.
 */
export function readDecisionChoice(
  answers: DecisionAnswerMap,
  id: string,
): DecisionChoiceReading | undefined {
  const answer = answers[id];
  if (answer?.type !== "choice") {
    return undefined;
  }
  const { choice, confidence, probabilities } = answer;
  const ranked = Object.entries(probabilities)
    .map(([name, probability]) => ({ name, probability }))
    .sort((a, b) => b.probability - a.probability);
  return { choice, confidence, probabilities, ranked };
}

export function readDecisionScore(
  answers: DecisionAnswerMap,
  id: string,
): DecisionScoreReading | undefined {
  const answer = answers[id];
  if (answer?.type !== "score") {
    return undefined;
  }
  const { score, confidence, legend, probabilities } = answer;
  return { score, confidence, legend, probabilities };
}

/**
 * A yes/no answer carries no confidence of its own, so certainty has to be
 * inferred from how far the probability sits from a coin flip. 0.5 → 0, and
 * 0 or 1 → 1.
 */
export function decisionBooleanConfidence(probability: number): number {
  return Math.abs(probability - 0.5) * 2;
}

/** Whether a descriptor declares support for a given inference type. */
export function servesInferenceKind(
  descriptor: Pick<ProviderDescriptor, "inferenceKinds">,
  kind: "generate" | "stream" | "decide",
): boolean {
  return (descriptor.inferenceKinds ?? DEFAULT_INFERENCE_KINDS).includes(kind);
}

/** Default bars for {@link gateDecisionBoolean}. */
const DEFAULT_BOOLEAN_MIN_PROBABILITY = 0.5;
const DEFAULT_BOOLEAN_MIN_CONFIDENCE = 0.4;

/**
 * Read a yes/no answer as an actionable decision, or `undefined` when there
 * is not enough signal to act.
 *
 * Three outcomes, and keeping them distinct is the whole point: `true` (a
 * confident yes), `false` (a confident no), and `undefined` (unanswered, the
 * wrong type, or too close to a coin flip). Every consumer of the `decide`
 * inference type needs exactly this, so the bars live here rather than being
 * re-invented — inconsistently — at each call site.
 */
export function gateDecisionBoolean(
  answers: DecisionAnswerMap,
  id: string,
  gate?: DecisionBooleanGate,
): boolean | undefined {
  const probability = readDecisionBoolean(answers, id);
  if (probability === undefined) {
    return undefined;
  }
  const minConfidence = gate?.minConfidence ?? DEFAULT_BOOLEAN_MIN_CONFIDENCE;
  if (decisionBooleanConfidence(probability) < minConfidence) {
    return undefined;
  }
  return (
    probability >= (gate?.minProbability ?? DEFAULT_BOOLEAN_MIN_PROBABILITY)
  );
}

/**
 * Build a question id that survives a round trip.
 *
 * Question ids are the only thing tying an answer back to what it was asked
 * about, and a batch mixes heterogeneous questions (one per server, one per
 * message, plus gates), so the namespace prefix is what demultiplexes them.
 * The index — not the subject's own name — is the key, because ids from the
 * wild (server ids, model ids, file paths) are not guaranteed to be distinct
 * after any normalisation the wire might apply.
 */
export function decisionKey(namespace: string, index: number): string {
  return `${namespace}__${index}`;
}
