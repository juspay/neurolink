/**
 * CostTracker
 *
 * Tracks token usage and costs across iterations.
 * Enforces budget limits for tokens, cost, duration, and iterations.
 */

import type {
  HeartbeatLoopConfig,
  LoopSnapshot,
  BudgetSummary,
  IterationUsage,
} from "./loopTypes.js";

/**
 * Budget exceeded error with details about which limit was hit.
 */
export class BudgetExceededError extends Error {
  constructor(
    public limitType: "iterations" | "duration" | "tokens" | "cost",
    public current: number,
    public limit: number,
  ) {
    super(`Budget exceeded: ${limitType} limit (${current}/${limit})`);
    this.name = "BudgetExceededError";
  }
}

/**
 * Tracks costs and enforces budgets for heartbeat loops.
 *
 * Monitors:
 * - Token usage (input/output)
 * - Estimated cost in USD
 * - Wall-clock duration
 * - Iteration count
 *
 * @example
 * ```typescript
 * const tracker = new CostTracker(config);
 * tracker.recordUsage({ promptTokens: 100, completionTokens: 50 });
 * tracker.assertWithinBudget(snapshot); // throws BudgetExceededError if over
 * ```
 */
export class CostTracker {
  private totalTokens = 0;
  private totalCostUsd = 0;
  private readonly config: HeartbeatLoopConfig;
  private readonly startTime: number;

  // Rough pricing estimates (per 1K tokens) - can be overridden
  private readonly pricing: Record<
    string,
    { prompt: number; completion: number }
  > = {
    "gpt-4o": { prompt: 0.0025, completion: 0.01 },
    "gpt-4o-mini": { prompt: 0.00015, completion: 0.0006 },
    "claude-sonnet-4": { prompt: 0.003, completion: 0.015 },
    "claude-haiku": { prompt: 0.00025, completion: 0.00125 },
    "gemini-2.5-flash": { prompt: 0.0003, completion: 0.0006 },
    default: { prompt: 0.001, completion: 0.003 },
  };

  constructor(config: HeartbeatLoopConfig) {
    this.config = config;
    this.startTime = Date.now();
  }

  /**
   * Record usage from a single iteration.
   */
  recordUsage(usage: IterationUsage): void {
    this.totalTokens += usage.totalTokens;

    // Estimate cost based on model
    const model = this.config.stepOptions?.model || "default";
    const rates = this.pricing[model] || this.pricing.default;

    const promptCost = (usage.promptTokens / 1000) * rates.prompt;
    const completionCost = (usage.completionTokens / 1000) * rates.completion;
    this.totalCostUsd += promptCost + completionCost;
  }

  /**
   * Record arbitrary cost (for custom tracking).
   */
  recordCost(costUsd: number, tokens: number): void {
    this.totalCostUsd += costUsd;
    this.totalTokens += tokens;
  }

  /**
   * Assert that we're within all budget limits.
   * Throws BudgetExceededError if any limit is exceeded.
   */
  assertWithinBudget(state: LoopSnapshot): void {
    // Check iterations
    if (this.config.maxIterations !== undefined) {
      if (state.iteration >= this.config.maxIterations) {
        throw new BudgetExceededError(
          "iterations",
          state.iteration,
          this.config.maxIterations,
        );
      }
    }

    // Check duration
    if (this.config.maxDurationMs !== undefined) {
      const elapsed = Date.now() - this.startTime;
      if (elapsed >= this.config.maxDurationMs) {
        throw new BudgetExceededError(
          "duration",
          elapsed,
          this.config.maxDurationMs,
        );
      }
    }

    // Check tokens
    if (this.config.maxTotalTokens !== undefined) {
      if (this.totalTokens >= this.config.maxTotalTokens) {
        throw new BudgetExceededError(
          "tokens",
          this.totalTokens,
          this.config.maxTotalTokens,
        );
      }
    }

    // Check cost
    if (this.config.maxTotalCostUsd !== undefined) {
      if (this.totalCostUsd >= this.config.maxTotalCostUsd) {
        throw new BudgetExceededError(
          "cost",
          this.totalCostUsd,
          this.config.maxTotalCostUsd,
        );
      }
    }
  }

  /**
   * Check if we're within budget without throwing.
   */
  isWithinBudget(state: LoopSnapshot): boolean {
    try {
      this.assertWithinBudget(state);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the budget limit that would be exceeded next, if any.
   */
  getLimitingFactor(state: LoopSnapshot): {
    type: "iterations" | "duration" | "tokens" | "cost" | null;
    current: number;
    limit: number;
    remaining: number;
  } {
    const checks: Array<{
      type: "iterations" | "duration" | "tokens" | "cost";
      current: number;
      limit?: number;
    }> = [
      {
        type: "iterations",
        current: state.iteration,
        limit: this.config.maxIterations,
      },
      {
        type: "duration",
        current: Date.now() - this.startTime,
        limit: this.config.maxDurationMs,
      },
      {
        type: "tokens",
        current: this.totalTokens,
        limit: this.config.maxTotalTokens,
      },
      {
        type: "cost",
        current: this.totalCostUsd,
        limit: this.config.maxTotalCostUsd,
      },
    ];

    let minRemaining = Infinity;
    let limiting: (typeof checks)[0] | null = null;

    for (const check of checks) {
      if (check.limit === undefined) {
        continue;
      }
      const remaining = check.limit - check.current;
      if (remaining < minRemaining) {
        minRemaining = remaining;
        limiting = check;
      }
    }

    if (!limiting) {
      return { type: null, current: 0, limit: 0, remaining: Infinity };
    }

    return {
      type: limiting.type,
      current: limiting.current,
      limit: limiting.limit!,
      remaining: Math.max(0, minRemaining),
    };
  }

  /**
   * Get a human-readable budget summary.
   */
  getBudgetSummary(state: LoopSnapshot): string {
    const elapsed = Date.now() - this.startTime;
    const parts: string[] = [];

    // Iterations
    if (this.config.maxIterations !== undefined) {
      parts.push(`iter: ${state.iteration}/${this.config.maxIterations}`);
    } else {
      parts.push(`iter: ${state.iteration}`);
    }

    // Duration
    if (this.config.maxDurationMs !== undefined) {
      const remaining = Math.max(0, this.config.maxDurationMs - elapsed);
      parts.push(`time: ${this.formatDuration(remaining)} left`);
    } else {
      parts.push(`time: ${this.formatDuration(elapsed)} elapsed`);
    }

    // Tokens
    if (this.config.maxTotalTokens !== undefined) {
      const remaining = Math.max(
        0,
        this.config.maxTotalTokens - this.totalTokens,
      );
      parts.push(`tok: ${this.formatNumber(remaining)} left`);
    } else {
      parts.push(`tok: ${this.formatNumber(this.totalTokens)}`);
    }

    // Cost
    if (this.config.maxTotalCostUsd !== undefined) {
      const remaining = Math.max(
        0,
        this.config.maxTotalCostUsd - this.totalCostUsd,
      );
      parts.push(`$${remaining.toFixed(2)} left`);
    } else {
      parts.push(`$${this.totalCostUsd.toFixed(2)}`);
    }

    return parts.join(" | ");
  }

  /**
   * Get detailed budget summary object.
   */
  getDetailedSummary(state: LoopSnapshot): BudgetSummary {
    const elapsed = Date.now() - this.startTime;

    return {
      tokensUsed: this.totalTokens,
      tokensRemaining: this.config.maxTotalTokens
        ? Math.max(0, this.config.maxTotalTokens - this.totalTokens)
        : undefined,
      costUsd: this.totalCostUsd,
      costRemaining: this.config.maxTotalCostUsd
        ? Math.max(0, this.config.maxTotalCostUsd - this.totalCostUsd)
        : undefined,
      iterations: state.iteration,
      iterationsRemaining: this.config.maxIterations
        ? Math.max(0, this.config.maxIterations - state.iteration)
        : undefined,
      elapsedMs: elapsed,
      timeRemainingMs: this.config.maxDurationMs
        ? Math.max(0, this.config.maxDurationMs - elapsed)
        : undefined,
    };
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  private formatNumber(n: number): string {
    if (n >= 1000000) {
      return `${(n / 1000000).toFixed(1)}M`;
    }
    if (n >= 1000) {
      return `${(n / 1000).toFixed(1)}K`;
    }
    return n.toString();
  }

  // Getters
  getTotalTokens(): number {
    return this.totalTokens;
  }

  getTotalCostUsd(): number {
    return this.totalCostUsd;
  }

  getElapsedMs(): number {
    return Date.now() - this.startTime;
  }
}
