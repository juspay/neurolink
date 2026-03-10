/**
 * CostTracker — enforces token, cost, and time budgets for the heartbeat loop.
 */

import type { TokenUsage } from "../types/analytics.js";
import type { HeartbeatLoopConfig, LoopSnapshot } from "./loopTypes.js";

export class BudgetExceededError extends Error {
  constructor(
    public readonly reason: "tokens" | "cost" | "time" | "iterations",
    message: string,
  ) {
    super(message);
    this.name = "BudgetExceededError";
  }
}

export class CostTracker {
  private _totalTokens = 0;
  private _totalCostUsd = 0;

  constructor(private readonly config: HeartbeatLoopConfig) {}

  get totalTokens(): number {
    return this._totalTokens;
  }

  get totalCostUsd(): number {
    return this._totalCostUsd;
  }

  /**
   * Record usage from a generate() call.
   * GenerateResult.usage contains { input, output, total } token counts.
   * Cost is derived from analytics if available.
   */
  recordUsage(usage: TokenUsage | undefined, costUsd?: number): void {
    if (usage?.total) {
      this._totalTokens += usage.total;
    } else if (usage) {
      this._totalTokens += (usage.input ?? 0) + (usage.output ?? 0);
    }

    if (costUsd && costUsd > 0) {
      this._totalCostUsd += costUsd;
    }
  }

  /**
   * Throw BudgetExceededError if any budget is breached.
   * Called at the top of each iteration before generate().
   */
  assertWithinBudget(state: LoopSnapshot): void {
    const { maxTotalTokens, maxTotalCostUsd, maxDurationMs, maxIterations } =
      this.config;

    if (maxTotalTokens && this._totalTokens >= maxTotalTokens) {
      throw new BudgetExceededError(
        "tokens",
        `Token budget exceeded: used ${this._totalTokens} of ${maxTotalTokens}`,
      );
    }

    if (maxTotalCostUsd && this._totalCostUsd >= maxTotalCostUsd) {
      throw new BudgetExceededError(
        "cost",
        `Cost budget exceeded: spent $${this._totalCostUsd.toFixed(4)} of $${maxTotalCostUsd.toFixed(4)}`,
      );
    }

    if (maxDurationMs) {
      const elapsed = Date.now() - new Date(state.startedAt).getTime();
      if (elapsed >= maxDurationMs) {
        throw new BudgetExceededError(
          "time",
          `Duration budget exceeded: elapsed ${elapsed}ms of ${maxDurationMs}ms`,
        );
      }
    }

    if (maxIterations && state.iteration >= maxIterations) {
      throw new BudgetExceededError(
        "iterations",
        `Iteration budget exceeded: ${state.iteration} of ${maxIterations}`,
      );
    }
  }

  /**
   * Human-readable budget summary for prompts.
   */
  getBudgetSummary(state: LoopSnapshot): string {
    const parts: string[] = [];

    if (this.config.maxTotalCostUsd) {
      const remaining = this.config.maxTotalCostUsd - this._totalCostUsd;
      parts.push(`$${remaining.toFixed(4)} cost remaining`);
    }

    if (this.config.maxTotalTokens) {
      const remaining = this.config.maxTotalTokens - this._totalTokens;
      parts.push(`${remaining.toLocaleString()} tokens remaining`);
    }

    if (this.config.maxIterations) {
      const remaining = this.config.maxIterations - state.iteration;
      parts.push(`${remaining} iterations remaining`);
    }

    if (this.config.maxDurationMs) {
      const elapsed = Date.now() - new Date(state.startedAt).getTime();
      const remaining = Math.max(0, this.config.maxDurationMs - elapsed);
      const mins = Math.round(remaining / 60000);
      parts.push(`~${mins}m time remaining`);
    }

    return parts.length > 0 ? parts.join(", ") : "No budget limits set";
  }
}
