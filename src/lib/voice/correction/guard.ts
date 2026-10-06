/**
 * Decision-model guard for dictionary substitutions.
 *
 * An alias is usually an ordinary word as well ("part" is how engines hear a
 * name that sounds like it), so applying the dictionary blindly rewrites the
 * literal word every time it is said. The guard asks a decision model, in one
 * request, one question per candidate: did the speaker mean the term, or the
 * word as written?
 *
 * Why a `choice` and not a yes/no: a boolean "is this the name X?" question
 * was measured to be leading — it said yes to nearly everything. A choice
 * between the term and the literal reading, each with its own rubric,
 * discriminates: "my name is part" → the term at 97%, "part of the plan" →
 * literal. Answers are matched by position (`candidate__N`), never by the
 * alias text, so an alias the wire normalises cannot misroute an answer.
 *
 * Fail-open, like every other `decide` consumer: with no decision provider,
 * on timeout (default 4 s) or on any error the dictionary is applied as is,
 * and each record says why in `note`.
 *
 * @module voice/correction/guard
 */

import { decisionKey } from "../../utils/decisionAnswers.js";
import { TimeoutError, withTimeout } from "../../utils/async/withTimeout.js";
import { logger } from "../../utils/logger.js";
import type {
  DecisionQuestion,
  STTCorrectionDeps,
  STTDecisionRecord,
  STTDictionaryCandidate,
} from "../../types/index.js";

/** Namespace for the per-candidate questions. */
const CANDIDATE_NAMESPACE = "candidate";

/** Default guard timeout; on expiry the dictionary is applied as is. */
export const DEFAULT_DECIDE_TIMEOUT_MS = 4000;

/** Sent as `context` when the caller gave none. */
const DEFAULT_CONTEXT =
  "Speech transcript; names and product terms are often misheard.";

/**
 * Upper bound on the transcript sent as state. Decision providers declare
 * state windows (some well under 1,000 tokens); an over-limit request is
 * refused before any network call and the guard fails open, so a long
 * transcript costs nothing but the decision — still, the words around a
 * candidate carry the signal, and a bounded state keeps the request cheap.
 */
const MAX_STATE_CHARS = 4000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const finiteNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

function candidateQuestion(
  candidate: STTDictionaryCandidate,
): DecisionQuestion {
  const { entry, heard } = candidate;
  const meaning = entry.meaning?.trim();
  return {
    type: "choice",
    instructions: `The speech recognizer wrote "${heard}". Which did the speaker mean?`,
    criteria: {
      term: `the term "${entry.term.trim()}"${meaning ? `: ${meaning}` : ""}`,
      literal: `"${heard}" as an ordinary word or other name, meant literally`,
    },
  };
}

/**
 * Read one choice answer without trusting its shape: the deps type hands the
 * answer map over as `unknown`, and a provider may omit an id or answer with
 * a different type. Returns undefined when there is no usable term/literal
 * verdict.
 */
function readTermOrLiteral(
  answer: unknown,
):
  | { choice: "term" | "literal"; probability?: number; confidence?: number }
  | undefined {
  if (
    !isRecord(answer) ||
    (answer.type !== undefined && answer.type !== "choice")
  ) {
    return undefined;
  }
  const probabilities = isRecord(answer.probabilities)
    ? answer.probabilities
    : {};
  const pTerm = finiteNumber(probabilities.term);
  const pLiteral = finiteNumber(probabilities.literal);
  let choice: "term" | "literal" | undefined;
  if (answer.choice === "term" || answer.choice === "literal") {
    choice = answer.choice;
  } else if (pTerm !== undefined || pLiteral !== undefined) {
    // No winner named, but a distribution: take its argmax.
    const term = pTerm ?? 1 - (pLiteral ?? 0);
    const literal = pLiteral ?? 1 - term;
    choice = term >= literal ? "term" : "literal";
  }
  if (!choice) {
    return undefined;
  }
  const probability =
    choice === "term"
      ? (pTerm ?? (pLiteral !== undefined ? 1 - pLiteral : undefined))
      : (pLiteral ?? (pTerm !== undefined ? 1 - pTerm : undefined));
  return { choice, probability, confidence: finiteNumber(answer.confidence) };
}

/**
 * Judge every candidate in one decision request. Returns one record per
 * candidate, in candidate order; a candidate the guard could not judge is
 * recorded as `"term"` with a `note` saying why, so `applyDictionary` applies
 * it exactly as it would without a guard.
 */
export async function decideCandidates(
  text: string,
  candidates: readonly STTDictionaryCandidate[],
  decide: STTCorrectionDeps["decide"] | undefined,
  options?: { context?: string; timeoutMs?: number },
): Promise<STTDecisionRecord[]> {
  if (candidates.length === 0) {
    return [];
  }
  const asIs = (note: string): STTDecisionRecord[] =>
    candidates.map((candidate) => ({
      heard: candidate.heard,
      term: candidate.entry.term.trim(),
      choice: "term",
      note,
    }));

  if (typeof decide !== "function") {
    return asIs("no decision provider");
  }

  const questions: Record<string, DecisionQuestion> = {};
  candidates.forEach((candidate, index) => {
    questions[decisionKey(CANDIDATE_NAMESPACE, index)] =
      candidateQuestion(candidate);
  });

  const timeoutMs =
    options?.timeoutMs && options.timeoutMs > 0
      ? options.timeoutMs
      : DEFAULT_DECIDE_TIMEOUT_MS;

  let result: Awaited<ReturnType<STTCorrectionDeps["decide"]>>;
  try {
    // The provider gets the timeout too, but the race is what guarantees it:
    // a decide implementation that ignores `timeoutMs` must not stall the
    // transcript.
    result = await withTimeout(
      decide({
        state: {
          transcript: text.slice(0, MAX_STATE_CHARS),
          context: options?.context?.trim() || DEFAULT_CONTEXT,
        },
        questions,
        timeoutMs,
      }),
      timeoutMs,
    );
  } catch (error) {
    const timedOut = error instanceof TimeoutError;
    logger.debug("[transcribe] decision guard failed open", {
      candidates: candidates.length,
      timedOut,
    });
    return asIs(timedOut ? "decision timed out" : "decision unavailable");
  }

  // `tryDecide` returns null both when no decision provider is configured and
  // when the call failed; the two are indistinguishable from here.
  if (!result || !isRecord(result.answers)) {
    return asIs("decision unavailable");
  }
  const answers = result.answers;

  return candidates.map((candidate, index) => {
    const verdict = readTermOrLiteral(
      answers[decisionKey(CANDIDATE_NAMESPACE, index)],
    );
    const record: STTDecisionRecord = {
      heard: candidate.heard,
      term: candidate.entry.term.trim(),
      choice: verdict?.choice ?? "term",
    };
    if (verdict?.probability !== undefined) {
      record.probability = verdict.probability;
    }
    if (verdict?.confidence !== undefined) {
      record.confidence = verdict.confidence;
    }
    if (!verdict) {
      record.note = "no answer · applied as is";
    }
    return record;
  });
}
