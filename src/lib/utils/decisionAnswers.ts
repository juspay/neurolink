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
  DecisionAnswer,
  DecisionAnswerMap,
  DecisionBooleanGate,
  DecisionChoiceReading,
  DecisionInput,
  DecisionQuestion,
  DecisionResult,
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

/** Namespace for questions a host adds through `decisionHooks.extendQuestions`. */
export const HOST_DECISION_NAMESPACE = "host";

/** Whether a wire id is one the funnel gave a host's question (`host__N`). */
export function isHostDecisionKey(id: string): boolean {
  return id.startsWith(`${HOST_DECISION_NAMESPACE}__`);
}

/**
 * A validated copy of a question a host handed back from `extendQuestions`,
 * or undefined when it is malformed or cannot be copied. The wire carries
 * the copy, never the host's object: a getter, a proxy or a later edit on
 * the host's side can then reach neither the request nor the answers keyed
 * on it. A value `structuredClone` refuses (a proxy, a function-valued
 * field, a throwing getter) is treated as malformed.
 */
export function snapshotDecisionQuestion(
  value: unknown,
): DecisionQuestion | undefined {
  let copy: unknown;
  try {
    copy = structuredClone(value);
  } catch {
    return undefined;
  }
  return isDecisionQuestion(copy) ? copy : undefined;
}

/**
 * `result` without the answers to a host's namespaced questions — what a
 * consumer is handed when the funnel's host-facing steps failed after the
 * wire call had already returned. A null-prototype map, so an own id such
 * as `__proto__` survives the copy.
 */
export function stripHostAnswers(
  result: DecisionResult,
  hostIdByWireId: ReadonlyMap<string, string>,
): DecisionResult {
  if (hostIdByWireId.size === 0) {
    return result;
  }
  const answers: Record<string, DecisionAnswer> = Object.create(null);
  for (const [id, answer] of Object.entries(result.answers)) {
    if (!hostIdByWireId.has(id)) {
      answers[id] = answer;
    }
  }
  return { ...result, answers };
}

const isRecordValue = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Whether `value` is something a decision model accepts as content: a
 * string, number or boolean, or an array or plain object of the same.
 * `null` and `undefined` are not — a question with no instructions is
 * refused by every provider.
 */
function isDecisionInput(value: unknown): value is DecisionInput {
  switch (typeof value) {
    case "string":
    case "boolean":
      return true;
    case "number":
      // NaN and ±Infinity serialise to null and would make the provider
      // reject the whole request, not just this question.
      return Number.isFinite(value);
    case "object":
      if (value === null) {
        return false;
      }
      return Array.isArray(value)
        ? value.every(isDecisionInput)
        : Object.values(value).every(isDecisionInput);
    default:
      return false;
  }
}

/**
 * Runtime check that a value from outside the type system — a host's
 * `extendQuestions` hook — is a well-formed question, so a malformed one
 * is dropped on its own rather than failing the whole request that
 * NeuroLink's own routing depends on.
 *
 * A `choice` needs at least two options and a `score` at least two levels;
 * fewer carries no information, and the servers refuse it anyway.
 */
export function isDecisionQuestion(value: unknown): value is DecisionQuestion {
  try {
    return isWellFormedDecisionQuestion(value);
  } catch {
    // Cyclic or otherwise exotic host input: the walk below can overflow the
    // stack. That drops this question alone rather than failing the request.
    return false;
  }
}

function isWellFormedDecisionQuestion(value: unknown): boolean {
  if (!isRecordValue(value) || !isDecisionInput(value.instructions)) {
    return false;
  }
  switch (value.type) {
    case "boolean": {
      if (value.criteria === undefined) {
        return true;
      }
      if (!isRecordValue(value.criteria)) {
        return false;
      }
      return Object.values(value.criteria).every(
        (side) => side === null || side === undefined || isDecisionInput(side),
      );
    }
    case "choice":
      return (
        isRecordValue(value.criteria) &&
        Object.keys(value.criteria).length >= 2 &&
        Object.values(value.criteria).every(
          (rubric) => rubric === null || isDecisionInput(rubric),
        )
      );
    case "score":
      return (
        Array.isArray(value.criteria) &&
        value.criteria.length >= 2 &&
        value.criteria.every(
          (level) => level === null || isDecisionInput(level),
        )
      );
    default:
      return false;
  }
}
