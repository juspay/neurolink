/**
 * HeartbeatLoop
 *
 * Core class for autonomous long-running agent loops.
 * Orchestrates iterations with budget management, checkpointing, and goal evaluation.
 */

import { EventEmitter } from "events";
import type {
  HeartbeatLoopConfig,
  LoopSnapshot,
  LoopResult,
  IterationResult,
  ContextMode,
  GoalEvaluator,
  SerializableLoopConfig,
  TriggerConfig,
} from "./loopTypes.js";
import type {
  GenerateOptions,
  GenerateResult,
} from "../types/generateTypes.js";
import type { CheckpointStore } from "./checkpoints/checkpointStore.js";
import { FileCheckpointStore } from "./checkpoints/fileCheckpoint.js";
import { TimerTrigger } from "./triggers/timerTrigger.js";
import { TriggerRegistry } from "./triggers/triggerRegistry.js";
import type { TriggerAdapter } from "./triggers/triggerAdapter.js";
import { CostTracker, BudgetExceededError } from "./costTracker.js";
import { LLMGoalEvaluator } from "./goalEvaluator.js";
import { logger } from "../utils/logger.js";

/**
 * Events emitted by HeartbeatLoop:
 * - tick: Emitted periodically (heartbeat)
 * - iteration: After each iteration completes
 * - checkpoint: After state is checkpointed
 * - error: When an error occurs
 * - escalate: When human escalation is needed
 * - complete: When loop finishes (success or failure)
 * - paused: When loop is paused
 * - cancelled: When loop is cancelled
 * - resumed: When loop resumes from checkpoint
 */
export interface HeartbeatLoopEvents {
  tick: (snapshot: LoopSnapshot) => void;
  iteration: (result: IterationResult) => void;
  checkpoint: (snapshot: LoopSnapshot) => void;
  error: (error: Error, snapshot: LoopSnapshot) => void;
  escalate: (reason: string, snapshot: LoopSnapshot) => void;
  complete: (result: LoopResult) => void;
  paused: (snapshot: LoopSnapshot) => void;
  cancelled: (snapshot: LoopSnapshot) => void;
  resumed: (snapshot: LoopSnapshot) => void;
}

/**
 * Minimal interface for NeuroLink dependencies.
 */
interface NeuroLinkLike {
  generate(options: GenerateOptions): Promise<GenerateResult>;
  emit?(event: string, ...args: unknown[]): boolean;
}

/**
 * Autonomous heartbeat loop for long-running tasks.
 *
 * The loop runs iterations triggered by a TriggerAdapter, executing
 * generate() calls with tool access until the goal is achieved or
 * budgets are exhausted. State is periodically checkpointed for
 * crash recovery.
 *
 * @example
 * ```typescript
 * const loop = new HeartbeatLoop(neurolink, {
 *   goal: "Analyze all files in src/",
 *   maxIterations: 100,
 *   maxDurationMs: 3600000,
 * });
 * const result = await loop.run();
 * ```
 */
export class HeartbeatLoop extends EventEmitter {
  private neurolink: NeuroLinkLike;
  private config: HeartbeatLoopConfig;
  private state: LoopSnapshot;
  private trigger: TriggerAdapter;
  private heartbeatTimer?: NodeJS.Timeout;
  private costTracker: CostTracker;
  private goalEvaluator: GoalEvaluator | null;
  private checkpointStore: CheckpointStore;
  private lastCheckpointTime: number;
  private iterationRunning = false;

  /**
   * Create a new heartbeat loop.
   */
  constructor(neurolink: NeuroLinkLike, config: HeartbeatLoopConfig) {
    super();
    this.neurolink = neurolink;
    this.config = config;
    this.trigger = this.resolveTrigger(config.trigger);
    this.costTracker = new CostTracker(config);
    this.goalEvaluator =
      config.goalEvaluator ?? new LLMGoalEvaluator(neurolink);
    this.checkpointStore = config.checkpointStore ?? new FileCheckpointStore();
    this.state = this.initializeState(config);
    this.lastCheckpointTime = Date.now();
  }

  /**
   * Resolve trigger config to adapter instance.
   */
  private resolveTrigger(
    trigger?: TriggerAdapter | TriggerConfig,
  ): TriggerAdapter {
    if (!trigger) {
      return new TimerTrigger({ intervalMs: 0 });
    }
    if ("start" in trigger) {
      return trigger as TriggerAdapter;
    }
    return TriggerRegistry.create(trigger.type, trigger);
  }

  /**
   * Initialize loop state from configuration.
   */
  private initializeState(config: HeartbeatLoopConfig): LoopSnapshot {
    const now = new Date().toISOString();
    const loopId = config.loopId ?? this.generateLoopId();

    const contextMode: ContextMode = config.contextMode ?? {
      type: "continuation",
    };

    // Build serializable config
    const serializableConfig: SerializableLoopConfig = {
      goal: config.goal,
      contextMode,
      stepOptions: config.stepOptions,
      maxStepsPerIteration: config.maxStepsPerIteration ?? 20,
      maxIterations: config.maxIterations ?? 1000,
      maxDurationMs: config.maxDurationMs ?? 4 * 60 * 60 * 1000, // 4 hours
      maxTotalTokens: config.maxTotalTokens,
      maxTotalCostUsd: config.maxTotalCostUsd,
      heartbeatIntervalMs: config.heartbeatIntervalMs ?? 30000,
      checkpointIntervalMs: config.checkpointIntervalMs ?? 60000,
      maxConsecutiveErrors: config.maxConsecutiveErrors ?? 3,
      hitl: config.hitl,
    };

    // Convert trigger to serializable form if it's a config
    if (config.trigger && !("start" in config.trigger)) {
      serializableConfig.trigger = config.trigger as TriggerConfig;
    }

    return {
      loopId,
      goalText: config.goal,
      status: "running",
      triggerType: this.trigger.type,
      contextMode: contextMode.type,
      iteration: 0,
      totalTokensUsed: 0,
      totalCostUsd: 0,
      elapsedMs: 0,
      startedAt: now,
      lastCheckpointAt: now,
      lastIterationAt: now,
      lastAssistantMessage: "",
      consecutiveErrors: 0,
      errorLog: [],
      conversationId:
        contextMode.type === "continuation" ? `hb-${loopId}` : undefined,
      config: serializableConfig,
    };
  }

  /**
   * Generate a unique loop ID.
   */
  private generateLoopId(): string {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let id = "hb-";
    for (let i = 0; i < 8; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }

  /**
   * Run the heartbeat loop until completion.
   */
  async run(): Promise<LoopResult> {
    this.state.status = "running";
    this.startHeartbeat();

    logger.info("[HeartbeatLoop] Starting", {
      loopId: this.state.loopId,
      goal: this.state.goalText,
      triggerType: this.trigger.type,
    });

    try {
      // The trigger drives the loop - it calls executeIteration() on each tick
      await this.trigger.start(() => this.executeIteration());
    } catch (error) {
      if (this.state.status === "running") {
        await this.handleFatalError(error);
      }
    } finally {
      this.stopHeartbeat();
      await this.trigger.stop();
      await this.checkpoint(); // Final checkpoint
    }

    const result = this.buildResult();

    logger.info("[HeartbeatLoop] Completed", {
      loopId: this.state.loopId,
      status: result.status,
      iterations: result.iteration,
      cost: result.totalCostUsd,
    });

    this.emit("complete", result);
    this.neurolink.emit?.("heartbeat:complete", result);

    return result;
  }

  /**
   * Execute a single iteration - called by trigger adapter on each tick.
   */
  private async executeIteration(): Promise<void> {
    // Prevent overlapping executions
    if (this.iterationRunning) {
      logger.warn("[HeartbeatLoop] Iteration already running, skipping tick", {
        loopId: this.state.loopId,
      });
      return;
    }

    // Check abort signal
    if (this.config.abortSignal?.aborted) {
      this.state.status = "cancelled";
      await this.trigger.stop();
      return;
    }

    // Should we continue?
    if (!this.shouldContinue()) {
      await this.trigger.stop();
      return;
    }

    this.iterationRunning = true;
    this.state.iteration++;
    this.state.lastIterationAt = new Date().toISOString();

    logger.debug("[HeartbeatLoop] Starting iteration", {
      loopId: this.state.loopId,
      iteration: this.state.iteration,
    });

    try {
      // 1. Check budgets
      this.costTracker.assertWithinBudget(this.state);

      // 2. Build iteration prompt
      const prompt = this.buildIterationPrompt();

      // 3. Execute generate() call
      const generateOptions: GenerateOptions = {
        ...this.config.stepOptions,
        input: { text: prompt },
        maxSteps: this.config.maxStepsPerIteration ?? 20,
      };

      // Continuation mode: pass conversationId for persistent context
      if (
        this.state.contextMode === "continuation" &&
        this.state.conversationId
      ) {
        (generateOptions as { conversationId?: string }).conversationId =
          this.state.conversationId;
      }

      const result = await this.neurolink.generate(generateOptions);

      // 4. Track costs
      if (result.usage) {
        this.costTracker.recordUsage({
          promptTokens: result.usage.input ?? 0,
          completionTokens: result.usage.output ?? 0,
          totalTokens: result.usage.total ?? 0,
        });
      }
      this.state.totalTokensUsed = this.costTracker.getTotalTokens();
      this.state.totalCostUsd = this.costTracker.getTotalCostUsd();

      // 5. Evaluate goal (unless evaluator is null)
      if (this.goalEvaluator) {
        const evaluation = await this.goalEvaluator.evaluate(
          this.state.goalText,
          result,
          this.state,
        );

        if (evaluation.isComplete) {
          this.state.status = "completed";
          this.state.goalConfidence = evaluation.confidence;
          this.state.lastAssistantMessage = result.content ?? "";
          this.state.goalProgress = evaluation.progressSummary;
          await this.trigger.stop();
          this.iterationRunning = false;
          return;
        }

        this.state.goalProgress = evaluation.progressSummary;
      }

      this.state.lastAssistantMessage = result.content ?? "";
      this.state.consecutiveErrors = 0;

      // 6. Extract iteration summary for isolated context mode
      if (this.state.contextMode === "isolated") {
        this.state.iterationSummary =
          await this.extractIterationSummary(result);
      }

      // 7. Callback
      const iterationResult: IterationResult = {
        iteration: this.state.iteration,
        result,
        snapshot: { ...this.state },
      };

      await this.config.onIterationComplete?.(iterationResult);
      this.emit("iteration", iterationResult);
      this.neurolink.emit?.("heartbeat:iteration", iterationResult);

      // 8. Checkpoint
      await this.maybeCheckpoint();
    } catch (error) {
      await this.handleIterationError(error);
    } finally {
      this.iterationRunning = false;
    }
  }

  /**
   * Build the iteration prompt based on context mode.
   */
  private buildIterationPrompt(): string {
    const budgetInfo = this.costTracker.getBudgetSummary(this.state);

    if (this.state.contextMode === "isolated") {
      // Isolated: full context in prompt, no conversation history
      return [
        `## Goal\n${this.state.goalText}`,
        this.state.iterationSummary
          ? `## Previous Progress\n${this.state.iterationSummary}`
          : null,
        `## Iteration ${this.state.iteration}`,
        `## Budget Remaining\n${budgetInfo}`,
        `Continue working toward the goal. When complete, clearly state "GOAL_COMPLETE".`,
      ]
        .filter(Boolean)
        .join("\n\n");
    }

    // Continuation: conversation history provides context
    return [
      this.state.iteration === 1
        ? `## Goal\n${this.state.goalText}\n\nWork toward this goal step by step. Use available tools as needed.`
        : `Continue working toward the goal.`,
      this.state.goalProgress
        ? `Progress so far: ${this.state.goalProgress}`
        : null,
      `Budget remaining: ${budgetInfo}`,
      `When the goal is complete, clearly state "GOAL_COMPLETE".`,
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  /**
   * Extract a summary of the iteration result for isolated context mode.
   * In isolated mode, each iteration starts fresh without conversation history,
   * so we need to summarize what was accomplished to maintain continuity.
   */
  private async extractIterationSummary(
    result: GenerateResult,
  ): Promise<string> {
    // Use the goal evaluator's progress summary if available
    if (this.state.goalProgress) {
      return this.state.goalProgress;
    }

    // Fall back to summarizing the result content
    const content = result.content ?? "";
    const maxSummaryLength = 500;

    // Extract key actions and findings from the content
    const lines = content.split("\n").filter((line) => line.trim().length > 0);

    // Look for action items (lines with keywords indicating work done)
    const actionKeywords = [
      "completed",
      "finished",
      "analyzed",
      "created",
      "updated",
      "deleted",
      "found",
      "discovered",
      "identified",
    ];
    const actions = lines.filter((line) =>
      actionKeywords.some((kw) => line.toLowerCase().includes(kw)),
    );

    // If we found actions, use them; otherwise take first few lines
    let summary: string;
    if (actions.length > 0) {
      summary = actions.slice(0, 3).join(" ").trim();
    } else {
      summary = content.slice(0, maxSummaryLength).trim();
    }

    // Truncate if too long
    if (summary.length > maxSummaryLength) {
      summary = summary.slice(0, maxSummaryLength) + "...";
    }

    return summary || `Iteration ${this.state.iteration} completed`;
  }

  /**
   * Handle an error during iteration.
   */
  private async handleIterationError(error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";

    this.state.consecutiveErrors++;
    this.state.errorLog.push({
      iteration: this.state.iteration,
      error: `${errorName}: ${errorMessage}`,
      timestamp: new Date().toISOString(),
    });

    logger.error("[HeartbeatLoop] Iteration error", {
      loopId: this.state.loopId,
      iteration: this.state.iteration,
      error: errorMessage,
      consecutiveErrors: this.state.consecutiveErrors,
    });

    this.emit(
      "error",
      error instanceof Error ? error : new Error(errorMessage),
      this.state,
    );
    this.neurolink.emit?.("heartbeat:error", error, this.state);

    // Check for budget exceeded errors
    if (error instanceof BudgetExceededError) {
      this.state.status =
        error.limitType === "iterations" ? "completed" : "failed";
      await this.checkpoint();
      await this.trigger.stop();
      return;
    }

    // Check max consecutive errors
    const maxErrors = this.config.maxConsecutiveErrors ?? 3;
    if (this.state.consecutiveErrors >= maxErrors) {
      this.state.status = "paused";

      logger.error("[HeartbeatLoop] Max consecutive errors reached, pausing", {
        loopId: this.state.loopId,
        consecutiveErrors: this.state.consecutiveErrors,
      });

      this.emit("escalate", "max consecutive errors reached", this.state);
      this.neurolink.emit?.(
        "heartbeat:escalate",
        "max consecutive errors reached",
        this.state,
      );

      await this.checkpoint();
      await this.trigger.stop();
    }
  }

  /**
   * Handle a fatal error that stops the loop.
   */
  private async handleFatalError(error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error("[HeartbeatLoop] Fatal error", {
      loopId: this.state.loopId,
      error: errorMessage,
    });

    this.state.status = "failed";
    this.state.errorLog.push({
      iteration: this.state.iteration,
      error: `FATAL: ${errorMessage}`,
      timestamp: new Date().toISOString(),
    });

    this.emit(
      "error",
      error instanceof Error ? error : new Error(errorMessage),
      this.state,
    );
    this.neurolink.emit?.("heartbeat:error", error, this.state);
  }

  /**
   * Determine if the loop should continue running.
   */
  private shouldContinue(): boolean {
    if (this.state.status !== "running") {
      return false;
    }
    if (this.config.abortSignal?.aborted) {
      return false;
    }
    return true;
  }

  /**
   * Start the periodic heartbeat timer.
   */
  private startHeartbeat(): void {
    const interval = this.config.heartbeatIntervalMs ?? 30000;

    this.heartbeatTimer = setInterval(() => {
      this.state.elapsedMs = this.costTracker.getElapsedMs();
      this.emit("tick", this.getSnapshot());
      this.neurolink.emit?.("heartbeat:tick", this.getSnapshot());
    }, interval);
  }

  /**
   * Stop the heartbeat timer.
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  /**
   * Save checkpoint if enough time has passed.
   */
  private async maybeCheckpoint(): Promise<void> {
    const interval = this.config.checkpointIntervalMs ?? 60000;
    const now = Date.now();

    if (now - this.lastCheckpointTime >= interval) {
      await this.checkpoint();
    }
  }

  /**
   * Save state to checkpoint store.
   */
  private async checkpoint(): Promise<void> {
    try {
      this.state.lastCheckpointAt = new Date().toISOString();
      await this.checkpointStore.save(this.state);
      this.lastCheckpointTime = Date.now();

      logger.debug("[HeartbeatLoop] Checkpoint saved", {
        loopId: this.state.loopId,
        iteration: this.state.iteration,
      });

      this.emit("checkpoint", this.getSnapshot());
      this.neurolink.emit?.("heartbeat:checkpoint", this.getSnapshot());
    } catch (error) {
      logger.error("[HeartbeatLoop] Checkpoint failed", {
        loopId: this.state.loopId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Build the final loop result.
   */
  private buildResult(): LoopResult {
    const now = new Date().toISOString();

    // Determine final status - exclude "running" as LoopResult status type
    let finalStatus: LoopResult["status"];
    switch (this.state.status) {
      case "completed":
        finalStatus = "completed";
        break;
      case "cancelled":
        finalStatus = "cancelled";
        break;
      case "paused":
        finalStatus = "paused";
        break;
      default:
        finalStatus = "failed";
    }

    return {
      loopId: this.state.loopId,
      status: finalStatus,
      goal: this.state.goalText,
      iteration: this.state.iteration,
      totalTokensUsed: this.state.totalTokensUsed,
      totalCostUsd: this.state.totalCostUsd,
      elapsedMs: this.costTracker.getElapsedMs(),
      startedAt: this.state.startedAt,
      endedAt: now,
      finalMessage: this.state.lastAssistantMessage,
      errorLog: this.state.errorLog,
    };
  }

  // ─── Public Lifecycle Methods ─────────────────────────────────────────────

  /**
   * Pause the loop (resumable).
   */
  async pause(): Promise<LoopSnapshot> {
    if (this.state.status !== "running") {
      return this.getSnapshot();
    }

    this.state.status = "paused";
    await this.trigger.stop();
    await this.checkpoint();

    logger.info("[HeartbeatLoop] Paused", {
      loopId: this.state.loopId,
      iteration: this.state.iteration,
    });

    this.emit("paused", this.getSnapshot());
    this.neurolink.emit?.("heartbeat:paused", this.getSnapshot());

    return this.getSnapshot();
  }

  /**
   * Cancel the loop permanently.
   */
  async cancel(): Promise<LoopSnapshot> {
    this.state.status = "cancelled";
    await this.trigger.stop();
    await this.checkpoint();

    logger.info("[HeartbeatLoop] Cancelled", {
      loopId: this.state.loopId,
      iteration: this.state.iteration,
    });

    this.emit("cancelled", this.getSnapshot());
    this.neurolink.emit?.("heartbeat:cancelled", this.getSnapshot());

    return this.getSnapshot();
  }

  /**
   * Get current snapshot without stopping.
   */
  getSnapshot(): LoopSnapshot {
    return {
      ...this.state,
      elapsedMs: this.costTracker.getElapsedMs(),
    };
  }

  /**
   * Resume a loop from a checkpoint.
   */
  static async resume(
    neurolink: NeuroLinkLike,
    loopId: string,
    store: CheckpointStore,
    overrides?: Partial<HeartbeatLoopConfig>,
  ): Promise<LoopResult> {
    const snapshot = await store.load(loopId);
    if (!snapshot) {
      throw new Error(`No checkpoint found for loop ${loopId}`);
    }

    logger.info("[HeartbeatLoop] Resuming from checkpoint", {
      loopId,
      iteration: snapshot.iteration,
    });

    // Reconstruct config from snapshot
    const config: HeartbeatLoopConfig = {
      ...snapshot.config,
      loopId: snapshot.loopId,
      ...overrides,
    };

    const loop = new HeartbeatLoop(neurolink, config);
    loop.state = {
      ...snapshot,
      status: "running",
    };

    loop.emit("resumed", loop.getSnapshot());
    neurolink.emit?.("heartbeat:resumed", loop.getSnapshot());

    return loop.run();
  }
}
