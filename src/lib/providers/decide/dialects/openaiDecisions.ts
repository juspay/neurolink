import type {
  DecisionAnswer,
  DecisionChoiceQuestion,
  DecisionDialect,
  DecisionInput,
  DecisionQuestion,
  DecisionQuestionMap,
  DecisionScoreQuestion,
} from "../../../types/index.js";
import { asNumber, isRecord } from "../guards.js";

const PROBABILITY_SUM_TOLERANCE = 0.01;
// A sum one tolerance away (0.99, 1.01) lands a rounding error past the
// tolerance in floating point; it is within it.
const SUM_ROUNDING_SLACK = 1e-9;

const text = (value: DecisionInput): string =>
  typeof value === "string" ? value : JSON.stringify(value);

const described = (
  value: DecisionInput | null | undefined,
): { description?: string } =>
  value === null || value === undefined ? {} : { description: text(value) };

function encodeQuestion(question: DecisionQuestion): Record<string, unknown> {
  if (question.type === "boolean") {
    // The wire has no per-side text, so each side joins the instructions.
    const { true: whenTrue, false: whenFalse } = question.criteria ?? {};
    return {
      type: "predicate",
      instructions:
        text(question.instructions) +
        (whenTrue === null || whenTrue === undefined
          ? ""
          : `\n\nAnswer true when: ${text(whenTrue)}`) +
        (whenFalse === null || whenFalse === undefined
          ? ""
          : `\nAnswer false when: ${text(whenFalse)}`),
    };
  }
  if (question.type === "choice") {
    return {
      type: "choice",
      instructions: text(question.instructions),
      choices: Object.entries(question.criteria).map(([value, rubric]) => ({
        value,
        ...described(rubric),
      })),
    };
  }
  if (question.type === "value") {
    // Unreachable through decide(): an entry on this dialect cannot list
    // `value` in its questionTypes, so the pre-flight check refuses it first.
    throw new Error(
      "The openai-decisions dialect has no value question; it writes boolean, choice and score questions only.",
    );
  }
  // The index is the label so a returned `value` and `label` can never
  // disagree about which level it is; the rubric text rides in `description`.
  return {
    type: "score",
    instructions: text(question.instructions),
    levels: question.criteria.map((rubric, index) => ({
      label: String(index),
      ...described(rubric),
    })),
  };
}

const inUnitRange = (value: number): boolean => value >= 0 && value <= 1;

/**
 * The answer's distribution keyed by the keys that were asked, or null unless
 * it names each asked key exactly once, with probabilities that sum to one.
 * The result is in asked order, not the server's.
 */
function readDistribution(
  raw: unknown,
  asked: readonly string[],
  keyOf: (value: unknown) => string | undefined,
): Record<string, number> | null {
  if (!Array.isArray(raw) || raw.length !== asked.length) {
    return null;
  }
  const expected = new Set(asked);
  const seen = new Map<string, number>();
  for (const entry of raw) {
    if (!isRecord(entry)) {
      return null;
    }
    const key = keyOf(entry.value);
    const probability = asNumber(entry.probability);
    if (
      key === undefined ||
      probability === undefined ||
      !inUnitRange(probability) ||
      !expected.has(key) ||
      seen.has(key)
    ) {
      return null;
    }
    seen.set(key, probability);
  }
  let sum = 0;
  for (const probability of seen.values()) {
    sum += probability;
  }
  if (Math.abs(sum - 1) > PROBABILITY_SUM_TOLERANCE + SUM_ROUNDING_SLACK) {
    return null;
  }
  return Object.fromEntries(asked.map((key) => [key, seen.get(key) ?? 0]));
}

const peak = (probabilities: Readonly<Record<string, number>>): number =>
  Math.max(...Object.values(probabilities));

/** The answer's own confidence, else the peak; null when its own is outside 0 to 1. */
function readConfidence(
  raw: unknown,
  probabilities: Readonly<Record<string, number>>,
): number | null {
  const own = asNumber(raw);
  if (own === undefined) {
    return peak(probabilities);
  }
  return inUnitRange(own) ? own : null;
}

function readChoice(
  question: DecisionChoiceQuestion,
  raw: Record<string, unknown>,
): DecisionAnswer | null {
  const options = Object.keys(question.criteria);
  if (typeof raw.choice !== "string" || !options.includes(raw.choice)) {
    return null;
  }
  const probabilities = readDistribution(raw.probabilities, options, (value) =>
    typeof value === "string" ? value : undefined,
  );
  if (!probabilities) {
    return null;
  }
  const confidence = readConfidence(raw.confidence, probabilities);
  return confidence === null
    ? null
    : { type: "choice", choice: raw.choice, confidence, probabilities };
}

function readScore(
  question: DecisionScoreQuestion,
  raw: Record<string, unknown>,
): DecisionAnswer | null {
  const score = asNumber(raw.score);
  const levels = question.criteria.map((_rubric, index) => String(index));
  const probabilities = readDistribution(raw.probabilities, levels, (value) =>
    typeof value === "number" && Number.isInteger(value)
      ? String(value)
      : undefined,
  );
  // The probability-weighted mean of the level indices cannot leave 0 to n-1.
  if (
    score === undefined ||
    score < 0 ||
    score > levels.length - 1 ||
    !probabilities
  ) {
    return null;
  }
  const confidence = readConfidence(raw.confidence, probabilities);
  if (confidence === null) {
    return null;
  }
  return {
    type: "score",
    score,
    confidence,
    legend: Object.fromEntries(
      question.criteria.map((rubric, index) => [
        String(index),
        rubric === null || rubric === undefined ? "" : text(rubric),
      ]),
    ),
    probabilities,
  };
}

function readAnswer(
  question: DecisionQuestion,
  raw: Record<string, unknown>,
): DecisionAnswer | null {
  if (question.type === "boolean") {
    const probability = asNumber(raw.probability);
    return raw.type === "predicate" &&
      probability !== undefined &&
      inUnitRange(probability)
      ? { type: "boolean", probability }
      : null;
  }
  if (question.type === "choice") {
    return raw.type === "choice" ? readChoice(question, raw) : null;
  }
  if (question.type === "value") {
    return null;
  }
  return raw.type === "score" ? readScore(question, raw) : null;
}

/** Number of answers carrying each asked name, so a repeated one can be refused. */
function countAskedNames(
  raw: readonly unknown[],
  asked: DecisionQuestionMap,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of raw) {
    const name = isRecord(item) ? item.name : undefined;
    if (typeof name === "string" && Object.hasOwn(asked, name)) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return counts;
}

export const openaiDecisionsDialect: DecisionDialect = {
  name: "openai-decisions",
  encodeQuestion,
  buildBody: ({ state, questions, model, media }) => {
    const images = media?.images ?? [];
    const stateText = text(state);
    return {
      ...(model === undefined ? {} : { model }),
      input:
        images.length === 0
          ? stateText
          : [
              {
                role: "user",
                content: [
                  ...(stateText === ""
                    ? []
                    : [{ type: "input_text", text: stateText }]),
                  ...images.map((url) => ({
                    type: "input_image",
                    image_url: url,
                  })),
                ],
              },
            ],
      questions: Object.entries(questions).map(([name, question]) => ({
        ...question,
        name,
      })),
    };
  },
  // The wire echoes each question's `name`, and the server's answer is checked
  // against the question asked: one that fails any check is dropped and named,
  // never repaired, so the other answers in the batch survive.
  readAnswers: (decoded, _reportedConfidence, asked) => {
    const raw = decoded.answers;
    if (!Array.isArray(raw)) {
      return undefined;
    }
    const counts = countAskedNames(raw, asked);
    const answers = new Map<string, DecisionAnswer>();
    const dropped: string[] = [];
    const refused: string[] = [];
    raw.forEach((item: unknown, index) => {
      const record = isRecord(item) ? item : undefined;
      const name = typeof record?.name === "string" ? record.name : undefined;
      const question =
        name !== undefined && Object.hasOwn(asked, name)
          ? asked[name]
          : undefined;
      if (!record || name === undefined || !question) {
        dropped.push(`#${index}`);
        return;
      }
      if ((counts.get(name) ?? 0) > 1) {
        if (!dropped.includes(name)) {
          dropped.push(name);
        }
        return;
      }
      if (record.type === "refusal") {
        refused.push(name);
        return;
      }
      const answer = readAnswer(question, record);
      if (answer) {
        answers.set(name, answer);
      } else {
        dropped.push(name);
      }
    });
    return { answers: Object.fromEntries(answers), dropped, refused };
  },
};
