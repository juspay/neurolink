/**
 * Classification strategies for the ClassifierRouter.
 *
 * - `classifyHeuristic` — zero-cost, no LLM. Generalizes the existing binary
 *   task classifier scorer (fast vs reasoning) into five difficulty tiers.
 * - `classifyLlm` — runs a cheap "classifier model" via an injected generate
 *   function, asking for a schema-constrained difficulty verdict. Falls back to
 *   the heuristic on any failure.
 */

import { z } from "zod";
import {
  analyzePrompt,
  calculateConfidence,
} from "../utils/taskClassificationUtils.js";
import { withTimeout } from "../utils/async/index.js";
import type {
  ClassifierCandidate,
  ClassifierDecision,
  ClassifierDifficulty,
  ClassifierGenerateFn,
  ClassifierModelRef,
  ClassifierRouterInput,
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
