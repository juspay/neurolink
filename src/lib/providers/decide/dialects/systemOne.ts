import type {
  DecisionAnswer,
  DecisionDialect,
  DecisionQuestion,
} from "../../../types/index.js";
import { asNumber, asNumberMap, asStringMap, isRecord } from "../guards.js";

/**
 * Last-resort confidence, when no transport reported one.
 *
 * The peak probability is what a calibrated confidence approximates, but it is
 * NOT the same number, so a threshold tuned against a vendor's calibrated
 * figure does not transfer unexamined; an even distribution lands near 1/N
 * rather than 0.
 */
function deriveConfidence(probabilities: Record<string, number>): number {
  const values = Object.values(probabilities);
  return values.length > 0 ? Math.max(...values) : 0;
}

/**
 * Validate one answer off the wire. Returns null rather than throwing so a
 * single malformed answer degrades to "unanswered" instead of failing the
 * whole batch — the batch may hold hundreds of usable answers.
 */
function parseDecisionAnswer(
  raw: unknown,
  reportedConfidence?: number,
): DecisionAnswer | null {
  if (!isRecord(raw)) {
    return null;
  }
  switch (raw.type) {
    // "noul" is the System One wire's own spelling; "boolean" is the neutral
    // one (Vercel's gateway), which renames both the type and the field.
    // Accepting both keeps one parser for every transport.
    case "noul":
    case "boolean": {
      const probability = asNumber(raw.noul) ?? asNumber(raw.probability);
      return probability === undefined
        ? null
        : { type: "boolean", probability };
    }
    case "choice": {
      const probabilities = asNumberMap(raw.probabilities);
      if (typeof raw.choice !== "string" || !probabilities) {
        return null;
      }
      return {
        type: "choice",
        choice: raw.choice,
        confidence:
          asNumber(raw.confidence) ??
          reportedConfidence ??
          deriveConfidence(probabilities),
        probabilities,
      };
    }
    case "score": {
      const score = asNumber(raw.score);
      const legend = asStringMap(raw.legend);
      const probabilities = asNumberMap(raw.probabilities);
      if (score === undefined || !legend || !probabilities) {
        return null;
      }
      return {
        type: "score",
        score,
        confidence:
          asNumber(raw.confidence) ??
          reportedConfidence ??
          deriveConfidence(probabilities),
        legend,
        probabilities,
      };
    }
    default:
      return null;
  }
}

/**
 * The System One wire calls the yes/no primitive `noul`; this codebase and
 * every SDK exposing it call it `boolean`.
 */
function encodeQuestion(question: DecisionQuestion): Record<string, unknown> {
  if (question.type === "boolean") {
    return {
      type: "noul",
      instructions: question.instructions,
      ...(question.criteria ? { criteria: question.criteria } : {}),
    };
  }
  return question;
}

export const systemOneDialect: DecisionDialect = {
  name: "system-one",
  encodeQuestion,
  readAnswers: (decoded, reportedConfidence) => {
    const raw = decoded.answers;
    if (!isRecord(raw)) {
      return undefined;
    }
    const answers: Record<string, DecisionAnswer> = {};
    const dropped: string[] = [];
    for (const [id, value] of Object.entries(raw)) {
      const parsed = parseDecisionAnswer(value, reportedConfidence[id]);
      if (parsed) {
        answers[id] = parsed;
      } else {
        dropped.push(id);
      }
    }
    return { answers, dropped };
  },
};
