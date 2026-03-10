/**
 * GoalEvaluator
 *
 * Evaluates whether a heartbeat loop's goal has been achieved.
 * Provides both LLM-based and custom evaluation strategies.
 */

import type {
  GoalEvaluator,
  GoalEvaluation,
  LoopSnapshot,
} from "./loopTypes.js";
import type {
  GenerateResult,
  GenerateOptions,
} from "../types/generateTypes.js";

/**
 * LLM-based goal evaluator using a cheap model to assess completion.
 *
 * Uses structured JSON output for reliable parsing.
 * Defaults to Claude 3.5 Sonnet for cost efficiency.
 *
 * @example
 * ```typescript
 * const evaluator = new LLMGoalEvaluator(neurolink, {
 *   provider: "anthropic",
 *   model: "claude-3-5-sonnet-20241022"
 * });
 * const result = await evaluator.evaluate(goal, lastResult, state);
 * ```
 */
export class LLMGoalEvaluator implements GoalEvaluator {
  constructor(
    private neurolink: {
      generate: (options: GenerateOptions) => Promise<GenerateResult>;
    },
    private evalOptions?: { provider?: string; model?: string },
  ) {}

  async evaluate(
    goal: string,
    lastResult: GenerateResult,
    state: LoopSnapshot,
  ): Promise<GoalEvaluation> {
    const promptText = `You are evaluating whether a goal has been achieved.

Goal: "${goal}"
Last response (truncated): "${lastResult.content?.substring(0, 2000) ?? ""}"
Iterations completed: ${state.iteration}
Progress so far: ${state.goalProgress || "Just started"}
Total cost: $${state.totalCostUsd.toFixed(4)}

Respond with JSON only:
{ "isComplete": boolean, "confidence": number (0-1), "progressSummary": "one line describing progress" }`;

    const evaluation = await this.neurolink.generate({
      input: {
        text: promptText,
      },
      provider: this.evalOptions?.provider ?? "google-ai",
      model: this.evalOptions?.model ?? "gemini-2.5-flash",
      output: { format: "json" },
      disableTools: true,
    });

    try {
      const text = evaluation.content ?? "";
      const parsed = JSON.parse(text || "{}") as {
        isComplete?: boolean;
        confidence?: number;
        progressSummary?: string;
      };

      return {
        isComplete: parsed.isComplete ?? false,
        confidence: Math.max(0, Math.min(1, parsed.confidence ?? 0)),
        progressSummary:
          parsed.progressSummary ?? `Completed ${state.iteration} iterations`,
      };
    } catch {
      // Fallback if JSON parsing fails
      const fallbackText = (evaluation.content ?? "").toLowerCase();
      const isComplete =
        fallbackText.includes('"iscomplete": true') ||
        fallbackText.includes("goal_complete") ||
        fallbackText.includes("complete: true");

      return {
        isComplete,
        confidence: isComplete ? 0.8 : 0.3,
        progressSummary: isComplete
          ? "Goal appears to be complete"
          : `Working on iteration ${state.iteration}`,
      };
    }
  }
}

/**
 * Simple keyword-based goal evaluator.
 *
 * Checks if specific keywords appear in the result text.
 * Fast and deterministic - no LLM calls.
 *
 * @example
 * ```typescript
 * const evaluator = new KeywordGoalEvaluator({
 *   completeKeywords: ["DONE", "COMPLETE", "FINISHED"],
 *   requireAll: false
 * });
 * ```
 */
export class KeywordGoalEvaluator implements GoalEvaluator {
  constructor(
    private config: {
      /** Keywords indicating completion (case-insensitive) */
      completeKeywords: string[];
      /** Whether all keywords must be present (default: false = any) */
      requireAll?: boolean;
      /** Custom progress extractor function */
      progressExtractor?: (
        result: GenerateResult,
        state: LoopSnapshot,
      ) => string;
    },
  ) {}

  async evaluate(
    _goal: string,
    lastResult: GenerateResult,
    state: LoopSnapshot,
  ): Promise<GoalEvaluation> {
    const text = lastResult.content?.toUpperCase() ?? "";
    const keywords = this.config.completeKeywords.map((k) => k.toUpperCase());

    let isComplete: boolean;
    if (this.config.requireAll) {
      isComplete = keywords.every((kw) => text.includes(kw));
    } else {
      isComplete = keywords.some((kw) => text.includes(kw));
    }

    const progressSummary = this.config.progressExtractor
      ? this.config.progressExtractor(lastResult, state)
      : isComplete
        ? "Goal completed"
        : `Working on iteration ${state.iteration}`;

    return {
      isComplete,
      confidence: isComplete ? 1.0 : 0.0,
      progressSummary,
    };
  }
}

/**
 * Regex-based goal evaluator.
 *
 * Uses regular expressions to detect goal completion patterns.
 * Most flexible non-LLM evaluator.
 *
 * @example
 * ```typescript
 * const evaluator = new RegexGoalEvaluator({
 *   completePatterns: [/GOAL_COMPLETE/i, /TASK_FINISHED/i],
 *   requireAll: false
 * });
 * ```
 */
export class RegexGoalEvaluator implements GoalEvaluator {
  constructor(
    private config: {
      /** Regex patterns indicating completion */
      completePatterns: RegExp[];
      /** Whether all patterns must match (default: false = any) */
      requireAll?: boolean;
      /** Confidence when pattern matches (default: 1.0) */
      matchConfidence?: number;
    },
  ) {}

  async evaluate(
    _goal: string,
    lastResult: GenerateResult,
    state: LoopSnapshot,
  ): Promise<GoalEvaluation> {
    const text = lastResult.content ?? "";
    const patterns = this.config.completePatterns;

    let isComplete: boolean;
    if (this.config.requireAll) {
      isComplete = patterns.every((pattern) => pattern.test(text));
    } else {
      isComplete = patterns.some((pattern) => pattern.test(text));
    }

    return {
      isComplete,
      confidence: isComplete ? (this.config.matchConfidence ?? 1.0) : 0.0,
      progressSummary: isComplete
        ? "Goal completed"
        : `Completed ${state.iteration} iterations`,
    };
  }
}

/**
 * Composite goal evaluator that combines multiple evaluators.
 *
 * Completion can be determined by "any" or "all" sub-evaluators.
 *
 * @example
 * ```typescript
 * const evaluator = new CompositeGoalEvaluator([
 *   new KeywordGoalEvaluator({ completeKeywords: ["DONE"] }),
 *   new RegexGoalEvaluator({ completePatterns: [/complete/i] })
 * ], { mode: "any" });
 * ```
 */
export class CompositeGoalEvaluator implements GoalEvaluator {
  constructor(
    private evaluators: GoalEvaluator[],
    private config?: { mode?: "any" | "all" },
  ) {}

  async evaluate(
    goal: string,
    lastResult: GenerateResult,
    state: LoopSnapshot,
  ): Promise<GoalEvaluation> {
    const results = await Promise.all(
      this.evaluators.map((e) => e.evaluate(goal, lastResult, state)),
    );

    const mode = this.config?.mode ?? "any";

    let isComplete: boolean;
    if (mode === "any") {
      isComplete = results.some((r) => r.isComplete);
    } else {
      isComplete = results.every((r) => r.isComplete);
    }

    // Average confidence
    const confidence =
      results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

    // Combine progress summaries
    const progressSummary = results
      .map((r) => r.progressSummary)
      .filter((s, i, arr) => arr.indexOf(s) === i) // Deduplicate
      .join("; ");

    return {
      isComplete,
      confidence,
      progressSummary,
    };
  }
}

/**
 * Create a goal evaluator from a simple function.
 *
 * Helper for quick custom evaluators without implementing the interface.
 *
 * @example
 * ```typescript
 * const evaluator = createGoalEvaluator((goal, result, state) => ({
 *   isComplete: result.content?.includes("ALL_FILES_PROCESSED") ?? false,
 *   confidence: 1.0,
 *   progressSummary: `Processed ${state.iteration} batches`
 * }));
 * ```
 */
export function createGoalEvaluator(
  fn: (
    goal: string,
    result: GenerateResult,
    state: LoopSnapshot,
  ) => GoalEvaluation | Promise<GoalEvaluation>,
): GoalEvaluator {
  return {
    evaluate: async (goal, result, state) => {
      const evaluation = fn(goal, result, state);
      return Promise.resolve(evaluation);
    },
  };
}

// Export types
export type { GoalEvaluator, GoalEvaluation };
