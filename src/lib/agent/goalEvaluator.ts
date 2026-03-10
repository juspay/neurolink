/**
 * Goal Evaluator — determines whether a heartbeat loop's goal has been achieved.
 *
 * Two implementations:
 * 1. LLMGoalEvaluator (default): uses a cheap model to assess completion
 * 2. KeywordGoalEvaluator: fast, no-LLM check for deterministic completion signals
 */

import type { GenerateResult } from "../types/generateTypes.js";
import type { GoalEvaluation, GoalEvaluator, LoopSnapshot } from "./loopTypes.js";

// ─── LLM-based evaluator (default) ──────────────────────────────────────────────────

export type LLMGoalEvaluatorOptions = {
  provider?: string;
  model?: string;
};

/**
 * Uses a cheap LLM call to evaluate whether the goal has been achieved.
 * FIX: Design doc used JSON.parse without try/catch — added safe parsing with fallback.
 */
export class LLMGoalEvaluator implements GoalEvaluator {
  constructor(
    private readonly neurolink: import("../neurolink.js").NeuroLink,
    private readonly options: LLMGoalEvaluatorOptions = {},
  ) {}

  async evaluate(
    goal: string,
    lastResult: GenerateResult,
    state: LoopSnapshot,
  ): Promise<GoalEvaluation> {
    const truncatedContent = (lastResult.content ?? "").substring(0, 2000);

    const evaluation = await this.neurolink.generate({
      input: {
        text: [
          `You are evaluating whether a goal has been achieved.`,
          ``,
          `Goal: "${goal}"`,
          `Last response (truncated): "${truncatedContent}"`,
          `Iterations completed: ${state.iteration}`,
          `Progress so far: ${state.goalProgress ?? "Just started"}`,
          `Total cost: $${state.totalCostUsd.toFixed(4)}`,
          ``,
          `Respond with JSON only:`,
          `{ "isComplete": boolean, "confidence": number (0-1), "progressSummary": "one line" }`,
        ].join("\n"),
      },
      provider: this.options.provider ?? "openai",
      model: this.options.model ?? "gpt-4o-mini",
      output: { format: "json" },
      disableTools: true,
    });

    // FIX: Safe JSON parsing with fallback instead of bare JSON.parse
    try {
      const parsed = JSON.parse(evaluation.content) as Partial<GoalEvaluation>;
      return {
        isComplete: Boolean(parsed.isComplete),
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
        progressSummary: typeof parsed.progressSummary === "string"
          ? parsed.progressSummary
          : "Evaluation in progress",
      };
    } catch {
      // Graceful degradation: if LLM returns non-JSON, assume not complete
      return {
        isComplete: false,
        confidence: 0,
        progressSummary: "Could not parse goal evaluation response",
      };
    }
  }
}

// ─── Keyword-based evaluator (no LLM needed) ─────────────────────────────────────

/**
 * Simple keyword-based evaluator.
 * Checks if the last assistant message contains any of the given completion signals.
 *
 * @example
 * ```typescript
 * goalEvaluator: new KeywordGoalEvaluator(["GOAL_COMPLETE", "ALL_FILES_PROCESSED"])
 * ```
 */
export class KeywordGoalEvaluator implements GoalEvaluator {
  constructor(
    private readonly keywords: string[] = ["GOAL_COMPLETE"],
    private readonly progressTemplate = (iteration: number) =>
      `Processed ${iteration} iterations`,
  ) {}

  async evaluate(
    _goal: string,
    lastResult: GenerateResult,
    state: LoopSnapshot,
  ): Promise<GoalEvaluation> {
    const content = lastResult.content ?? "";
    const isComplete = this.keywords.some((kw) => content.includes(kw));

    return {
      isComplete,
      confidence: isComplete ? 1.0 : 0.0,
      progressSummary: this.progressTemplate(state.iteration),
    };
  }
}
