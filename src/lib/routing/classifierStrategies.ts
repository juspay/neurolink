/**
 * Classification strategies for the ClassifierRouter.
 *
 * - `classifyHeuristic` — zero-cost, no LLM. Generalizes the existing binary
 *   task classifier scorer (fast vs reasoning) into five difficulty tiers.
 * - `classifyLlm` — runs a cheap "classifier model" via an injected generate
 *   function, asking for a schema-constrained difficulty verdict. Falls back to
 *   the heuristic on any failure.
 * - `classifyJev` — one round trip to a decision model, which answers
 *   difficulty, capabilities, risk and model choice *simultaneously* and
 *   reports a calibrated confidence. Falls back to the heuristic on any
 *   failure or when the verdict is not confident enough to act on.
 */

import { z } from "zod";
import {
  analyzePrompt,
  calculateConfidence,
} from "../utils/taskClassificationUtils.js";
import { withTimeout } from "../utils/async/index.js";
import {
  decisionBooleanConfidence,
  readDecisionBoolean,
  readDecisionChoice,
  readDecisionScore,
} from "../utils/decisionAnswers.js";
import { renderCandidate } from "./modelCatalog.js";
import type {
  ClassifierCandidate,
  ClassifierContextScope,
  ClassifierDecideFn,
  ClassifierDecision,
  ClassifierDifficulty,
  ClassifierGenerateFn,
  ClassifierModelRef,
  ClassifierRouterInput,
  DecisionQuestion,
} from "../types/index.js";

/** Difficulty tiers, ordered easiest → hardest. */
export const CLASSIFIER_DIFFICULTIES: ClassifierDifficulty[] = [
  "trivial",
  "simple",
  "moderate",
  "hard",
  "expert",
];

/**
 * Add capability tags implied by the request shape (vision/tools) to a set the
 * classifier already produced.
 */
function withRequestCapabilities(
  input: ClassifierRouterInput,
  base?: string[],
): string[] | undefined {
  const caps = new Set<string>(base ?? []);
  if (input.requiresVision) {
    caps.add("vision");
  }
  if (input.hasTools) {
    caps.add("tools");
  }
  return caps.size > 0 ? Array.from(caps) : undefined;
}

/**
 * Heuristic classifier — maps the binary fast/reasoning scores plus prompt
 * length into one of five difficulty tiers. Deterministic and dependency-free.
 */
export function classifyHeuristic(
  input: ClassifierRouterInput,
): ClassifierDecision {
  const prompt = input.prompt ?? "";
  const { fastScore, reasoningScore, reasons } = analyzePrompt(prompt);
  const net = reasoningScore - fastScore;
  const len = prompt.trim().length;

  let difficulty: ClassifierDifficulty;
  if (fastScore === 0 && reasoningScore === 0) {
    // No signal — fall back to length as a weak proxy.
    difficulty = len < 80 ? "simple" : len < 400 ? "moderate" : "hard";
  } else if (net <= -2) {
    difficulty = "trivial";
  } else if (net <= 0) {
    difficulty = "simple";
  } else if (net <= 3) {
    difficulty = "moderate";
  } else if (net <= 7) {
    difficulty = "hard";
  } else {
    difficulty = "expert";
  }

  return {
    difficulty,
    confidence: calculateConfidence(fastScore, reasoningScore),
    requiredCapabilities: withRequestCapabilities(input),
    reason: `heuristic: net=${net}, len=${len}${
      reasons.length ? ` (${reasons.slice(0, 3).join("; ")})` : ""
    }`,
  };
}

/** Schema the LLM classifier is forced to answer with. */
const classifierOutputSchema = z.object({
  difficulty: z.enum(["trivial", "simple", "moderate", "hard", "expert"]),
  confidence: z.number().min(0).max(1).optional(),
  requiredCapabilities: z.array(z.string()).optional(),
  suggestedTools: z.array(z.string()).optional(),
  selectedModelId: z.string().optional(),
  reason: z.string().optional(),
});

const CLASSIFIER_SYSTEM_PROMPT = [
  "You are a routing classifier inside an AI gateway.",
  "Classify the user's task by difficulty into EXACTLY one of:",
  "trivial, simple, moderate, hard, expert.",
  "Judge by reasoning depth, number of steps, domain expertise required, and ambiguity.",
  "Greetings/lookups/one-liners are trivial/simple; multi-step analysis, design,",
  "or expert-domain work is hard/expert.",
  'Also list required model capabilities (e.g. "vision", "tools", "reasoning")',
  "and, only if obvious, the names of tools the task needs.",
  "If a list of available models is provided, also set selectedModelId to the",
  "single best model id for this task.",
  "Respond ONLY via the structured schema.",
].join(" ");

/**
 * LLM classifier — asks a cheap model for a schema-constrained verdict.
 * Falls back to the heuristic if the model is unavailable, times out, or
 * returns output that does not match the schema.
 */
export async function classifyLlm(
  input: ClassifierRouterInput,
  generate: ClassifierGenerateFn,
  classifierModel?: ClassifierModelRef,
  timeoutMs?: number,
  candidates?: ClassifierCandidate[],
): Promise<ClassifierDecision> {
  const lines = [
    "Task to classify:",
    '"""',
    (input.prompt ?? "").slice(0, 4000),
    '"""',
    `hasTools=${!!input.hasTools} requiresVision=${!!input.requiresVision}`,
  ];
  if (candidates && candidates.length > 0) {
    lines.push(
      "",
      "Available models — pick the single best `id` for THIS task:",
    );
    for (const c of candidates) {
      const bits = [c.provider + (c.model ? `/${c.model}` : "")];
      if (c.description) {
        bits.push(c.description);
      }
      if (c.tiers && c.tiers.length > 0) {
        bits.push(`tiers: ${c.tiers.join("/")}`);
      }
      if (c.capabilities && c.capabilities.length > 0) {
        bits.push(`caps: ${c.capabilities.join(",")}`);
      }
      lines.push(`- id="${c.id}": ${bits.join(" — ")}`);
    }
    lines.push("", "Set selectedModelId to the chosen id (omit if unsure).");
  }

  // `timeout` lets the provider abort its own request; withTimeout adds a hard
  // wall-clock ceiling so a stalled classifier call can never block the turn.
  // A TimeoutError propagates to ClassifierRouter.classify(), which falls back
  // to the heuristic (fail-open).
  const hardTimeoutMs = timeoutMs ?? 8000;
  const result = await withTimeout(
    generate({
      input: { text: lines.join("\n") },
      systemPrompt: CLASSIFIER_SYSTEM_PROMPT,
      provider: classifierModel?.provider,
      model: classifierModel?.model,
      region: classifierModel?.region,
      temperature: classifierModel?.temperature ?? 0,
      disableTools: true,
      schema: classifierOutputSchema,
      timeout: hardTimeoutMs,
      // Marker consumed by NeuroLink.applyClassifierRouting to prevent the
      // classifier's own generate() call from recursively re-routing.
      context: { __classifierRouted: true },
    }),
    hardTimeoutMs,
    `Classifier LLM call exceeded ${hardTimeoutMs}ms`,
  );

  const parsed = classifierOutputSchema.safeParse(result?.structuredData);
  if (!parsed.success) {
    return classifyHeuristic(input);
  }
  const d = parsed.data;
  return {
    difficulty: d.difficulty,
    confidence: d.confidence ?? 0.7,
    requiredCapabilities: withRequestCapabilities(
      input,
      d.requiredCapabilities,
    ),
    suggestedTools: d.suggestedTools,
    selectedModelId: d.selectedModelId,
    reason: d.reason ?? "llm classifier",
  };
}

/**
 * Rubric handed to the decision model, ordered easiest → hardest. Deliberately
 * about the shape of the work, not about model names: the model never sees a
 * provider or model id, and this file maps its judgement onto the pool.
 */
const JEV_DIFFICULTY_CRITERIA: Record<ClassifierDifficulty, string> = {
  trivial:
    "Mechanical and local: rename a symbol, fix a typo, add an import, run one named command, or answer something already stated in the request.",
  simple:
    "A small localised change or a direct factual answer. One file, one obvious approach.",
  moderate:
    "Ordinary engineering: implement a well-specified change across a few files, write tests, fix a clearly described bug, review a small diff.",
  hard: "Deep reasoning: architecture and design, debugging a failure whose cause is unknown, security analysis, concurrency, refactors spanning several systems.",
  expert:
    "Frontier-level work: ambiguous requirements, novel design with no established pattern, or analysis where a wrong answer is costly and hard to detect.",
};

/**
 * Asked about the ACT, not the subject.
 *
 * This wording matters more than it looks. The obvious phrasing — "the task
 * touches production, money or credentials" — scores very high on ordinary
 * code that merely *concerns* those things ("add a refund endpoint that calls
 * Stripe"), and escalates every such request to the most expensive model. The
 * second sentence is what separates writing the code from running it.
 */
const JEV_RISK_INSTRUCTIONS =
  "Carrying out this request would itself change production, move real money, expose credentials, or alter data that cannot be restored. Writing or testing code that deals with such things, without running it against the real system, does not count.";

/** Above this, risk overrides the tier and skips the confidence thresholds. */
const JEV_RISK_FORCE_THRESHOLD = 0.7;

/**
 * How much context the request needs, narrowest → widest. Ordered, because a
 * decision model places things on a scale reliably and names numbers badly:
 * asking "how many tokens" would get digits read as text, while asking "which
 * of these four descriptions fits" gets a calibrated position.
 */
export const CLASSIFIER_CONTEXT_SCOPES: ClassifierContextScope[] = [
  "current-message",
  "recent-turns",
  "full-conversation",
  "everything",
];

const JEV_CONTEXT_CRITERIA: string[] = [
  "Self-contained. Everything needed to answer is in the request itself; earlier conversation would not change the answer.",
  "Needs the last few exchanges — a follow-up, a correction, or a reference to something just discussed.",
  "Needs the whole conversation, including decisions and constraints established much earlier.",
  "Needs the conversation and every document, file and tool result that has been gathered.",
];

/**
 * Compaction thresholds per context scope, indexed to match
 * {@link CLASSIFIER_CONTEXT_SCOPES}.
 *
 * Every one is at or below the 0.8 default, and that is a hard invariant
 * rather than a tuning choice. Raising a budget lets a request through that
 * the model then rejects for exceeding its window — and `ModelPool` treats a
 * `context_window` error as a PERMANENT cooldown (10 years), so one
 * optimistic guess retires that model for the life of the process. Shrinking
 * a budget merely compacts a little earlier than it had to.
 */
const CONTEXT_SCOPE_THRESHOLD: number[] = [0.45, 0.6, 0.75, 0.8];

/** Below this calibrated confidence the scope reading is ignored entirely. */
const MIN_CONTEXT_SCOPE_CONFIDENCE = 0.5;

/** The default the budget checker uses when nobody passes a threshold. */
const DEFAULT_COMPACTION_THRESHOLD = 0.8;

/**
 * Map a score answer onto a compaction threshold, clamped so it can only ever
 * lower the default.
 */
export function contextScopeToThreshold(index: number): number {
  const clamped = Math.max(
    0,
    Math.min(CONTEXT_SCOPE_THRESHOLD.length - 1, Math.round(index)),
  );
  return Math.min(
    DEFAULT_COMPACTION_THRESHOLD,
    CONTEXT_SCOPE_THRESHOLD[clamped] ?? DEFAULT_COMPACTION_THRESHOLD,
  );
}

/**
 * Default confidence bars. They differ because the two mistakes do not cost
 * the same: routing a simple task to an expensive model wastes money, while
 * routing a hard task to a weak one produces a wrong answer.
 */
const DEFAULT_MIN_UPGRADE_CONFIDENCE = 0.3;
const DEFAULT_MIN_DOWNGRADE_CONFIDENCE = 0.6;

/** The neutral tier a verdict is judged as moving up or down from. */
const NEUTRAL_DIFFICULTY_INDEX = CLASSIFIER_DIFFICULTIES.indexOf("moderate");

/** Narrow an arbitrary option name back onto the difficulty union. */
function isClassifierDifficulty(value: string): value is ClassifierDifficulty {
  return (CLASSIFIER_DIFFICULTIES as string[]).includes(value);
}

/**
 * Decision-model classifier — one request answers difficulty, capabilities,
 * risk and model selection at once.
 *
 * Latency is flat in question count (1 question ~393ms, 400 ~465ms), so the
 * capability questions are effectively free and are asked speculatively even
 * when nothing downstream may need them. This is the opposite of the LLM
 * strategy's economics, where every extra field costs output tokens.
 *
 * Returns the heuristic verdict — never throws — when no decision provider is
 * configured, the call fails, or the answer is not confident enough to act on.
 */
export async function classifyJev(
  input: ClassifierRouterInput,
  decide: ClassifierDecideFn,
  timeoutMs?: number,
  candidates?: ClassifierCandidate[],
  thresholds?: { upgrade?: number; downgrade?: number },
): Promise<ClassifierDecision> {
  const minUpgrade = thresholds?.upgrade ?? DEFAULT_MIN_UPGRADE_CONFIDENCE;
  const minDowngrade =
    thresholds?.downgrade ?? DEFAULT_MIN_DOWNGRADE_CONFIDENCE;

  const questions: Record<string, DecisionQuestion> = {
    difficulty: {
      type: "choice",
      instructions:
        "What kind of work does this request require from an AI coding assistant? Judge by reasoning depth, number of steps, domain expertise, and ambiguity.",
      criteria: JEV_DIFFICULTY_CRITERIA,
    },
    needs_vision: {
      type: "boolean",
      instructions:
        "Does answering this request require looking at an image, screenshot, diagram, or PDF page?",
    },
    needs_tools: {
      type: "boolean",
      instructions:
        "Does this request require running commands, reading or writing files, or calling external services — as opposed to being answerable from the text alone?",
    },
    needs_reasoning: {
      type: "boolean",
      instructions:
        "Does this request require sustained multi-step reasoning before a correct answer can be given?",
    },
    risky: { type: "boolean", instructions: JEV_RISK_INSTRUCTIONS },
    context: {
      type: "score",
      instructions:
        "How much of the earlier conversation does answering this request actually require?",
      criteria: JEV_CONTEXT_CRITERIA,
    },
  };

  // Only ask the model-selection question when there is a pool to choose
  // from; a choice over fewer than two options carries no information.
  const byId = new Map((candidates ?? []).map((c) => [c.id, c]));
  if (byId.size > 1) {
    questions.model = {
      type: "choice",
      instructions:
        "Which of these models is the cheapest one that can still complete this request correctly? A model whose context window cannot hold the request is never the right answer.",
      criteria: Object.fromEntries(
        Array.from(byId.values()).map((c) => [
          c.id,
          renderCandidate(c) || null,
        ]),
      ),
    };
  }

  // Structured state: the decision API accepts JSON, and the extra signals
  // are already assembled by the caller. Sending them costs almost nothing
  // and they are exactly what distinguishes a long tool-using request from a
  // short conversational one.
  const result = await decide({
    state: {
      request: (input.prompt ?? "").slice(0, 8000),
      estimated_input_tokens: input.estimatedInputTokens ?? 0,
      has_tools_available: input.hasTools ?? false,
      request_includes_images: input.requiresVision ?? false,
      caller_requested_thinking: input.thinkingLevel ?? "none",
    },
    questions,
    timeoutMs,
  });
  if (!result) {
    return classifyHeuristic(input);
  }

  // Read first, and keep it separate from everything below. The context
  // judgement is independent of the tier — a trivial request can still depend
  // on the whole conversation, and an expert one can be entirely
  // self-contained — so it is gated on its own calibrated confidence and
  // survives every path on which the difficulty verdict is discarded.
  const contextReading = readDecisionScore(result.answers, "context");
  const contextScope =
    contextReading && contextReading.confidence >= MIN_CONTEXT_SCOPE_CONFIDENCE
      ? CLASSIFIER_CONTEXT_SCOPES[
          Math.max(
            0,
            Math.min(
              CLASSIFIER_CONTEXT_SCOPES.length - 1,
              Math.round(contextReading.score),
            ),
          )
        ]
      : undefined;
  const withContext = (decision: ClassifierDecision): ClassifierDecision =>
    contextScope
      ? {
          ...decision,
          contextScope,
          contextScopeConfidence: contextReading?.confidence,
        }
      : decision;

  const difficulty = readDecisionChoice(result.answers, "difficulty");
  if (!difficulty || !isClassifierDifficulty(difficulty.choice)) {
    return withContext(classifyHeuristic(input));
  }

  // Risk overrides the tier outright and skips the confidence bars — this is
  // the one case that is not a confidence question. It may only ever RAISE
  // the tier, never lower one.
  const risk = readDecisionBoolean(result.answers, "risky") ?? 0;
  const forcedByRisk = risk > JEV_RISK_FORCE_THRESHOLD;
  const wantedIndex = CLASSIFIER_DIFFICULTIES.indexOf(difficulty.choice);
  const effectiveIndex = forcedByRisk
    ? Math.max(wantedIndex, CLASSIFIER_DIFFICULTIES.indexOf("hard"))
    : wantedIndex;

  // Asymmetric gate: a verdict harder than neutral spends more, so it clears
  // the low bar; one easier than neutral spends less, so it clears the high
  // bar. Below the applicable bar the heuristic stands.
  if (!forcedByRisk) {
    const isDowngrade = effectiveIndex < NEUTRAL_DIFFICULTY_INDEX;
    const bar = isDowngrade ? minDowngrade : minUpgrade;
    if (difficulty.confidence < bar) {
      const fallback = classifyHeuristic(input);
      return withContext({
        ...fallback,
        reason: `jev: ${difficulty.choice} @ ${difficulty.confidence.toFixed(2)} below the ${isDowngrade ? "downgrade" : "upgrade"} bar ${bar} — ${fallback.reason}`,
      });
    }
  }

  const capabilities = new Set<string>();
  // A yes/no answer carries no confidence of its own, so require it to be
  // clearly on one side of the coin flip before acting on it.
  const capabilityFor: Record<string, string> = {
    needs_vision: "vision",
    needs_tools: "tools",
    needs_reasoning: "reasoning",
  };
  for (const [id, tag] of Object.entries(capabilityFor)) {
    const probability = readDecisionBoolean(result.answers, id);
    if (
      probability !== undefined &&
      probability > 0.5 &&
      decisionBooleanConfidence(probability) >= 0.4
    ) {
      capabilities.add(tag);
    }
  }

  // The pick is reported WITHOUT a confidence gate here on purpose. Whether a
  // given pick is an upgrade or a downgrade depends on what the difficulty
  // tier would otherwise have chosen, and only the router knows that — so the
  // asymmetric bars are applied there. Gating on the upgrade bar at this point
  // treated every pick as an upgrade, which let a low-confidence pick route a
  // hard task DOWN to a cheap model on a bar meant for the opposite case.
  const picked = readDecisionChoice(result.answers, "model");
  const selectedModelId =
    picked && byId.has(picked.choice) ? picked.choice : undefined;

  const chosen = CLASSIFIER_DIFFICULTIES[
    effectiveIndex
  ] as ClassifierDifficulty;
  return {
    difficulty: chosen,
    confidence: difficulty.confidence,
    requiredCapabilities: withRequestCapabilities(
      input,
      Array.from(capabilities),
    ),
    selectedModelId,
    selectedModelConfidence: selectedModelId ? picked?.confidence : undefined,
    contextScope,
    contextScopeConfidence: contextReading?.confidence,
    reason: forcedByRisk
      ? `jev(${result.model}): ${chosen}, forced by risk ${risk.toFixed(2)} in ${result.latencyMs}ms`
      : `jev(${result.model}): ${chosen} @ ${difficulty.confidence.toFixed(2)} in ${result.latencyMs}ms`,
  };
}
