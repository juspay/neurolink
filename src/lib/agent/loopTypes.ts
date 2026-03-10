/**
 * Loop Types
 *
 * Type definitions for the Heartbeat Loop system.
 * Includes configuration, state snapshots, evaluation results, and loop results.
 */

import type { TriggerAdapter } from "./triggers/triggerAdapter.js";
import type { CheckpointStore } from "./checkpoints/checkpointStore.js";
import type {
  GenerateOptions,
  GenerateResult,
} from "../types/generateTypes.js";

// ─────────────────────────────────────────────────────────────────────────────
// Goal Evaluation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Result of goal evaluation - determines if the loop should complete.
 */
export type GoalEvaluation = {
  /** Whether the goal has been achieved */
  isComplete: boolean;
  /** Confidence level 0-1 that the goal is complete */
  confidence: number;
  /** One-line summary of progress so far */
  progressSummary: string;
};

/**
 * Interface for custom goal evaluation logic.
 */
export interface GoalEvaluator {
  /**
   * Evaluate whether the goal has been achieved.
   * @param goal - The original goal text
   * @param lastResult - The result from the last iteration
   * @param state - Current loop snapshot
   * @returns Goal evaluation result
   */
  evaluate(
    goal: string,
    lastResult: GenerateResult,
    state: LoopSnapshot,
  ): Promise<GoalEvaluation>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context Modes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Context mode determines how conversation context is handled across iterations.
 */
export type ContextMode =
  | { type: "continuation"; conversationId?: string }
  | { type: "isolated"; summaryFromCheckpoint?: boolean };

// ─────────────────────────────────────────────────────────────────────────────
// Trigger Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shorthand trigger config resolved to TriggerAdapter internally.
 */
export type TriggerConfig =
  | {
      type: "timer";
      intervalMs?: number;
      initialDelayMs?: number;
      interval?: string;
      initialDelay?: string;
    }
  | {
      type: "rabbitmq";
      connectionUrl: string;
      queue: string;
      prefetch?: number;
    }
  | { type: "cron"; schedule: string; timezone?: string }
  | { type: "webhook"; port: number; path?: string; secret?: string }
  | {
      type: "process-watcher";
      target: number | string;
      event: string;
      pollIntervalMs?: number;
    }
  | { type: string; [key: string]: unknown };

// ─────────────────────────────────────────────────────────────────────────────
// HITL Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Human-in-the-loop configuration for escalation.
 */
export interface HITLConfig {
  /** Enable human escalation */
  enabled: boolean;
  /** Auto-escalate after N consecutive errors */
  escalateAfterErrors?: number;
  /** Escalate when model expresses uncertainty */
  escalateOnUncertainty?: boolean;
  /** Tool names requiring human approval */
  approvalRequired?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Heartbeat Loop Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configuration for a heartbeat loop.
 */
export type HeartbeatLoopConfig = {
  // ─── WHAT TO DO ───────────────────────────────────────

  /** Natural language goal — the "north star" for every iteration */
  goal: string;

  /** Custom stop condition. Default: LLM-based goal evaluator */
  goalEvaluator?: GoalEvaluator | null;

  /** Context mode: continuation (default) or isolated */
  contextMode?: ContextMode;

  /** Base options for each generate() call */
  stepOptions?: Partial<GenerateOptions>;

  /** Tool steps within each generate() call (default: 20) */
  maxStepsPerIteration?: number;

  // ─── WHEN TO DO ───────────────────────────────────────

  /** Trigger mechanism. Default: TimerTrigger with intervalMs: 0 (back-to-back) */
  trigger?: TriggerAdapter | TriggerConfig;

  // ─── BUDGETS & BOUNDS ─────────────────────────────────

  /** Hard cap on iterations (default: 1000) */
  maxIterations?: number;

  /** Wall-clock timeout in milliseconds (default: 4 hours) */
  maxDurationMs?: number;

  /** Total token budget across all steps */
  maxTotalTokens?: number;

  /** Dollar cost cap */
  maxTotalCostUsd?: number;

  // ─── HEARTBEAT & OBSERVABILITY ────────────────────────

  /** Event emission interval in milliseconds (default: 30s) */
  heartbeatIntervalMs?: number;

  /** Callback on each heartbeat event */
  onHeartbeat?: (state: LoopSnapshot) => void | Promise<void>;

  /** Callback when an iteration completes */
  onIterationComplete?: (result: IterationResult) => void | Promise<void>;

  // ─── RESILIENCE ───────────────────────────────────────

  /** Checkpoint store for persistence (Redis, filesystem, or custom) */
  checkpointStore?: CheckpointStore;

  /** How often to checkpoint in milliseconds (default: 60s) */
  checkpointIntervalMs?: number;

  /** Errors before pause (default: 3) */
  maxConsecutiveErrors?: number;

  // ─── HUMAN ESCALATION ─────────────────────────────────

  /** Human-in-the-loop configuration */
  hitl?: HITLConfig;

  // ─── CONTROL ──────────────────────────────────────────

  /** AbortSignal for cancellation */
  abortSignal?: AbortSignal;

  /** Loop ID (auto-generated if not provided) */
  loopId?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Loop State (Snapshot)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Serialized configuration for checkpointing.
 * Excludes non-serializable fields like functions and abortSignal.
 */
export type SerializableLoopConfig = Omit<
  HeartbeatLoopConfig,
  | "goalEvaluator"
  | "onHeartbeat"
  | "onIterationComplete"
  | "abortSignal"
  | "trigger"
  | "checkpointStore"
> & {
  trigger?: TriggerConfig;
};

/**
 * Error log entry for tracking failures.
 */
export interface ErrorLogEntry {
  iteration: number;
  error: string;
  timestamp: string;
}

/**
 * Complete state snapshot of a heartbeat loop.
 * Persisted for crash recovery and status queries.
 */
export type LoopSnapshot = {
  loopId: string;
  goalText: string;
  status: "running" | "paused" | "completed" | "failed" | "cancelled";

  // Trigger info
  triggerType: string;

  // Context mode
  contextMode: ContextMode["type"];

  // Progress
  iteration: number;
  totalTokensUsed: number;
  totalCostUsd: number;
  elapsedMs: number;
  startedAt: string;
  lastCheckpointAt: string;
  lastIterationAt: string;

  // Conversation state (continuation mode)
  conversationId?: string;

  // Isolated mode state
  iterationSummary?: string;

  // Last output
  lastAssistantMessage: string;

  // Error tracking
  consecutiveErrors: number;
  errorLog: ErrorLogEntry[];

  // Goal progress
  goalProgress?: string;
  goalConfidence?: number;

  // Serialized config (for resume)
  config: SerializableLoopConfig;
};

// ─────────────────────────────────────────────────────────────────────────────
// Iteration and Loop Results
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Result of a single iteration.
 */
export interface IterationResult {
  iteration: number;
  result: GenerateResult;
  snapshot: LoopSnapshot;
}

/**
 * Final result of a heartbeat loop.
 */
export interface LoopResult {
  loopId: string;
  status: "completed" | "failed" | "cancelled" | "paused";
  goal: string;
  iteration: number;
  totalTokensUsed: number;
  totalCostUsd: number;
  elapsedMs: number;
  startedAt: string;
  endedAt: string;
  finalMessage?: string;
  errorLog: ErrorLogEntry[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Cost Tracking
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Token usage for a single iteration.
 */
export interface IterationUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Cost estimation configuration.
 */
export interface CostConfig {
  modelPricing?: {
    promptPricePer1k: number;
    completionPricePer1k: number;
  };
  customRates?: Record<string, number>;
}

/**
 * Budget summary for display/logging.
 */
export interface BudgetSummary {
  tokensUsed: number;
  tokensRemaining?: number;
  costUsd: number;
  costRemaining?: number;
  iterations: number;
  iterationsRemaining?: number;
  elapsedMs: number;
  timeRemainingMs?: number;
}
