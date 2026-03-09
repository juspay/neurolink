# Heartbeat Loop Design: Autonomous Long-Running Agent Loop

## Status: Proposal (v2)

## Problem

NeuroLink's current loop mechanisms are all bounded and reactive:

1. **Tool-calling loops** (`maxSteps`) — bounded within a single `generate()`/`stream()` call, max 500 steps, no persistence across calls
2. **CLI loop session** — REPL that blocks on human input every turn
3. **Workflow system** — stateless single-shot ensemble, no iteration

There is no way to say: "Run this task autonomously for as long as it takes — hours if needed — with periodic check-ins, crash recovery, and cost controls."

## What We Want

A **heartbeat loop** — an autonomous outer loop that solves two fundamental questions:

1. **When to do** — Trigger mechanism: what starts, resumes, and schedules iterations (timers, queues, external signals)
2. **What to do** — Execution: goal-driven `generate()` calls with tool access, evaluation, and checkpointing

And supports two context modes:

- **Continuation mode** — Resumes an existing conversation, accumulates context across iterations
- **Isolated mode** — Each iteration gets a fresh context with only the goal + checkpoint summary (no conversation bleed)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    WHEN TO DO                            │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Node.js  │  │ RabbitMQ │  │  Cron /  │  │ External│ │
│  │ Timers   │  │ Consumer │  │ Systemd  │  │ Webhook │ │
│  │ (v1 ✓)   │  │ (future) │  │ (future) │  │ (future)│ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │              │              │              │      │
│       └──────┬───────┴──────┬───────┴──────┬───────┘      │
│              ▼              ▼              ▼              │
│         ┌─────────────────────────────────┐              │
│         │      TriggerAdapter interface   │              │
│         │   start() / stop() / onTick()   │              │
│         └──────────────┬──────────────────┘              │
└────────────────────────┼─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│                    WHAT TO DO                            │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │              HeartbeatLoop                       │    │
│  │                                                  │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │    │
│  │  │ GoalEval │  │ CostTrack│  │ Checkpoint   │  │    │
│  │  └──────────┘  └──────────┘  └──────────────┘  │    │
│  │                                                  │    │
│  │  for each tick:                                  │    │
│  │    1. Check budgets (tokens, cost, time)         │    │
│  │    2. Build iteration prompt                     │    │
│  │    3. neurolink.generate() with tools            │    │
│  │    4. Evaluate goal completion                   │    │
│  │    5. Checkpoint state                           │    │
│  │    6. Emit events                                │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  Context Modes:                                          │
│  ┌────────────────┐  ┌─────────────────────────┐        │
│  │ Continuation   │  │ Isolated (future)       │        │
│  │ (shared convID)│  │ (fresh context/iter)    │        │
│  └────────────────┘  └─────────────────────────┘        │
└──────────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│                  MCP TOOL EXPOSURE                       │
│                                                          │
│  Heartbeat loop registered as MCP tools so other agents  │
│  or external systems can start/stop/query loops          │
│                                                          │
│  Tools: start_heartbeat, stop_heartbeat,                 │
│         get_heartbeat_status, list_heartbeats,           │
│         resume_heartbeat                                 │
└──────────────────────────────────────────────────────────┘
```

---

## Existing Infrastructure We Can Leverage

| Component                   | Location                                      | Reuse                                            |
| --------------------------- | --------------------------------------------- | ------------------------------------------------ |
| `generate()` / `stream()`   | `neurolink.ts`                                | Core execution primitive per step                |
| Conversation memory (Redis) | `redisConversationMemoryManager.ts`           | Persist conversation across steps                |
| Context compaction          | `contextCompactor.ts`                         | Keep context from blowing up over hours          |
| Budget checker              | `budgetChecker.ts`                            | Pre-step context validation                      |
| HITL manager                | `hitlManager.ts`                              | Human escalation gate                            |
| Retry/circuit breaker       | `constants/retry.ts`, `constants/timeouts.ts` | Per-step error resilience                        |
| Tool system (MCP)           | `mcp/toolRegistry.ts`                         | Tools available every step                       |
| Tool registration           | `neurolink.registerTool()`                    | Expose heartbeat as MCP tool                     |
| Telemetry/tracing           | `telemetry/`                                  | Observability per step                           |
| EventEmitter                | `neurolink.ts` (extends EventEmitter)         | Heartbeat events                                 |
| Timeout utilities           | `constants/timeouts.ts`                       | `TimeoutUtils.parseTimeout("2h")` already exists |

---

## Part 1: Trigger System — "When To Do"

### TriggerAdapter Interface

All trigger mechanisms implement one interface. The heartbeat loop doesn't care how it gets ticked — it only cares that it does.

```typescript
/**
 * A TriggerAdapter controls WHEN the heartbeat loop executes iterations.
 * The loop itself controls WHAT happens in each iteration.
 */
interface TriggerAdapter {
  /** Unique identifier for this trigger type */
  readonly type: string;

  /**
   * Start the trigger. Calls `onTick()` whenever an iteration should execute.
   * The adapter owns the scheduling — the loop owns the execution.
   */
  start(onTick: () => Promise<void>): Promise<void>;

  /** Stop the trigger. No more ticks after this resolves. */
  stop(): Promise<void>;

  /** Whether the trigger is currently active */
  isActive(): boolean;

  /** Pause ticking without destroying state (e.g., backpressure) */
  pause?(): void;

  /** Resume after pause */
  resume?(): void;
}
```

### v1: Node.js Timer Trigger (Implemented Now)

```typescript
class TimerTrigger implements TriggerAdapter {
  readonly type = "timer";
  private timer?: NodeJS.Timeout;
  private active = false;

  constructor(
    private config: {
      /** Interval between iterations in ms. 0 = run as fast as possible (back-to-back). */
      intervalMs?: number;
      /** Initial delay before first tick */
      initialDelayMs?: number;
    } = {},
  ) {}

  async start(onTick: () => Promise<void>): Promise<void> {
    this.active = true;
    const interval = this.config.intervalMs ?? 0;

    if (this.config.initialDelayMs) {
      await new Promise((r) => setTimeout(r, this.config.initialDelayMs));
    }

    const tick = async () => {
      if (!this.active) return;
      await onTick();
      if (!this.active) return;

      if (interval > 0) {
        this.timer = setTimeout(tick, interval);
      } else {
        // Back-to-back: use setImmediate to avoid starving the event loop
        setImmediate(() => {
          tick();
        });
      }
    };

    await tick(); // First tick immediately (after optional delay)
  }

  async stop(): Promise<void> {
    this.active = false;
    if (this.timer) clearTimeout(this.timer);
  }

  isActive(): boolean {
    return this.active;
  }

  pause(): void {
    this.active = false;
    if (this.timer) clearTimeout(this.timer);
  }
  resume(): void {
    /* re-call start() with stored onTick */
  }
}
```

### Future: RabbitMQ Trigger (Pluggable, Not Implemented)

```typescript
class RabbitMQTrigger implements TriggerAdapter {
  readonly type = "rabbitmq";

  constructor(
    private config: {
      connectionUrl: string;
      queue: string;
      prefetch?: number; // Backpressure: how many messages to buffer
      deadLetterExchange?: string;
    },
  ) {}

  async start(onTick: () => Promise<void>): Promise<void> {
    // Connect to RabbitMQ
    // Consume from queue
    // Each message triggers onTick()
    // Ack after onTick() completes (at-least-once delivery)
    // Nack + requeue on error
  }

  async stop(): Promise<void> {
    // Close channel and connection
  }

  isActive(): boolean {
    /* ... */
  }
}
```

### Future: Webhook Trigger (External HTTP Signal)

```typescript
class WebhookTrigger implements TriggerAdapter {
  readonly type = "webhook";

  constructor(
    private config: {
      /** Port to listen on */
      port: number;
      /** Path for the webhook endpoint */
      path?: string; // default: /heartbeat/tick
      /** Secret for HMAC verification */
      secret?: string;
    },
  ) {}

  async start(onTick: () => Promise<void>): Promise<void> {
    // Start HTTP server
    // POST /heartbeat/tick → onTick()
    // Verify HMAC signature if secret provided
    // Return 200 after iteration completes (synchronous) or 202 (async)
  }

  async stop(): Promise<void> {
    // Close HTTP server
  }

  isActive(): boolean {
    /* ... */
  }
}
```

### Future: Cron / Systemd Timer Trigger

```typescript
class CronTrigger implements TriggerAdapter {
  readonly type = "cron";

  constructor(private config: {
    /** Cron expression (e.g., "*/5 * * * *" for every 5 minutes) */
    schedule: string;
    /** Timezone for cron evaluation */
    timezone?: string;
  }) {}

  // Uses node-cron or similar to schedule ticks
  async start(onTick: () => Promise<void>): Promise<void> { /* ... */ }
  async stop(): Promise<void> { /* ... */ }
  isActive(): boolean { /* ... */ }
}
```

### Future: Process Watcher Trigger

```typescript
class ProcessWatcherTrigger implements TriggerAdapter {
  readonly type = "process-watcher";

  constructor(
    private config: {
      /** PID or process name to watch */
      target: number | string;
      /** What event triggers a tick */
      event: "exit" | "crash" | "high-cpu" | "high-memory";
      /** Polling interval for process status */
      pollIntervalMs?: number;
    },
  ) {}

  async start(onTick: () => Promise<void>): Promise<void> {
    // Poll process status
    // Trigger onTick() when event condition met
  }

  async stop(): Promise<void> {
    /* ... */
  }
  isActive(): boolean {
    /* ... */
  }
}
```

### Trigger Registry

```typescript
class TriggerRegistry {
  private static adapters = new Map<string, TriggerAdapterFactory>();

  /** Register a new trigger type */
  static register(type: string, factory: TriggerAdapterFactory): void {
    this.adapters.set(type, factory);
  }

  /** Create a trigger by type */
  static create(type: string, config: unknown): TriggerAdapter {
    const factory = this.adapters.get(type);
    if (!factory)
      throw new Error(
        `Unknown trigger type: ${type}. Available: ${[...this.adapters.keys()]}`,
      );
    return factory(config);
  }

  /** List available trigger types */
  static available(): string[] {
    return [...this.adapters.keys()];
  }
}

type TriggerAdapterFactory = (config: unknown) => TriggerAdapter;

// Built-in registration
TriggerRegistry.register(
  "timer",
  (config) => new TimerTrigger(config as TimerTriggerConfig),
);
// Users register their own:
TriggerRegistry.register(
  "rabbitmq",
  (config) => new RabbitMQTrigger(config as RabbitMQTriggerConfig),
);
```

---

## Part 2: Execution Engine — "What To Do"

### Context Modes

```typescript
type ContextMode =
  | { type: "continuation"; conversationId?: string } // Accumulate context across iterations
  | { type: "isolated"; summaryFromCheckpoint?: boolean }; // Fresh context each iteration (future)
```

**Continuation mode (v1):** Each iteration appends to the same `conversationId`. The model sees the full (compacted) conversation history. Good for tasks where context builds up — "analyze this codebase" where each iteration explores more files.

**Isolated mode (future):** Each iteration gets a fresh context containing only:

- The goal description
- A summary extracted from the last checkpoint
- Any explicit state the user passes
  Good for stateless recurring tasks — "check production logs every hour and alert if anomalies found."

### Core Type: `HeartbeatLoopConfig`

```typescript
type HeartbeatLoopConfig = {
  // ─── WHAT TO DO ───────────────────────────────────────

  /** Natural language goal — the "north star" for every iteration */
  goal: string;

  /** Custom stop condition. Default: LLM-based goal evaluator */
  goalEvaluator?: GoalEvaluator | null; // null = skip evaluation, rely on budgets

  /** Context mode: continuation (default) or isolated (future) */
  contextMode?: ContextMode;

  /** Base options for each generate() call (provider, model, temperature, tools, etc.) */
  stepOptions?: Partial<GenerateOptions>;

  /** Tool steps within each generate() call (default: 20) */
  maxStepsPerIteration?: number;

  // ─── WHEN TO DO ───────────────────────────────────────

  /** Trigger mechanism. Default: TimerTrigger with intervalMs: 0 (back-to-back) */
  trigger?: TriggerAdapter | TriggerConfig;

  // ─── BUDGETS & BOUNDS ─────────────────────────────────

  maxIterations?: number; // Hard cap (default: 1000)
  maxDurationMs?: number; // Wall-clock timeout (default: 4 hours)
  maxTotalTokens?: number; // Total token budget across all steps
  maxTotalCostUsd?: number; // Dollar cost cap

  // ─── HEARTBEAT & OBSERVABILITY ────────────────────────

  heartbeatIntervalMs?: number; // Event emission interval (default: 30s)
  onHeartbeat?: (state: LoopSnapshot) => void;
  onIterationComplete?: (result: IterationResult) => void | Promise<void>;

  // ─── RESILIENCE ───────────────────────────────────────

  checkpointStore?: CheckpointStore; // Redis, filesystem, or custom
  checkpointIntervalMs?: number; // How often to checkpoint (default: 60s)
  maxConsecutiveErrors?: number; // Errors before pause (default: 3)

  // ─── HUMAN ESCALATION ─────────────────────────────────

  hitl?: {
    enabled: boolean;
    escalateAfterErrors?: number; // Auto-escalate after N consecutive errors
    escalateOnUncertainty?: boolean; // Escalate when model says "I'm not sure"
    approvalRequired?: string[]; // Tool names requiring human approval
  };

  // ─── CONTROL ──────────────────────────────────────────

  abortSignal?: AbortSignal;
};

/** Shorthand trigger config (resolved to TriggerAdapter internally) */
type TriggerConfig =
  | { type: "timer"; intervalMs?: number; initialDelayMs?: number }
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
  | { type: string; [key: string]: unknown }; // Extensible for custom triggers
```

### Core Type: `LoopSnapshot` (Checkpoint State)

```typescript
type LoopSnapshot = {
  loopId: string;
  goalText: string;
  status: "running" | "paused" | "completed" | "failed" | "cancelled";

  // Trigger info
  triggerType: string; // "timer", "rabbitmq", "cron", etc.

  // Context mode
  contextMode: ContextMode["type"]; // "continuation" | "isolated"

  // Progress
  iteration: number;
  totalTokensUsed: number;
  totalCostUsd: number;
  elapsedMs: number;
  startedAt: string; // ISO 8601
  lastCheckpointAt: string;
  lastIterationAt: string;

  // Conversation state (continuation mode)
  conversationId?: string; // Points to memory manager session

  // Isolated mode state
  iterationSummary?: string; // Carried between isolated iterations

  // Last output
  lastAssistantMessage: string; // Summary of last response

  // Error tracking
  consecutiveErrors: number;
  errorLog: Array<{ iteration: number; error: string; timestamp: string }>;

  // Goal progress
  goalProgress?: string; // LLM-assessed progress description
  goalConfidence?: number; // 0-1 confidence that goal is met

  // Serialized config (for resume)
  config: Omit<
    HeartbeatLoopConfig,
    "goalEvaluator" | "onHeartbeat" | "onIterationComplete" | "abortSignal"
  >;
};
```

### Core Loop Logic

```typescript
class HeartbeatLoop {
  private neurolink: NeuroLink;
  private config: HeartbeatLoopConfig;
  private state: LoopSnapshot;
  private trigger: TriggerAdapter;
  private heartbeatTimer?: NodeJS.Timeout;
  private costTracker: CostTracker;
  private goalEvaluator: GoalEvaluator;

  constructor(neurolink: NeuroLink, config: HeartbeatLoopConfig) {
    this.neurolink = neurolink;
    this.config = config;
    this.trigger = this.resolveTrigger(config.trigger);
    this.costTracker = new CostTracker(config);
    this.goalEvaluator =
      config.goalEvaluator ?? new LLMGoalEvaluator(neurolink);
    this.state = this.initializeState(config);
  }

  /** Resolve trigger config to adapter instance */
  private resolveTrigger(
    trigger?: TriggerAdapter | TriggerConfig,
  ): TriggerAdapter {
    if (!trigger) return new TimerTrigger({ intervalMs: 0 });
    if ("start" in trigger) return trigger; // Already an adapter
    return TriggerRegistry.create(trigger.type, trigger);
  }

  async run(): Promise<LoopResult> {
    this.state.status = "running";
    this.startHeartbeat();

    try {
      // The trigger drives the loop — it calls executeIteration() on each tick
      await this.trigger.start(() => this.executeIteration());
    } catch (error) {
      if (this.state.status === "running") {
        await this.handleError(error);
      }
    } finally {
      this.stopHeartbeat();
      await this.trigger.stop();
      await this.checkpoint(); // Final checkpoint
    }

    return this.buildResult();
  }

  /** Single iteration — called by trigger adapter on each tick */
  private async executeIteration(): Promise<void> {
    // 0. Should we continue?
    if (!this.shouldContinue()) {
      await this.trigger.stop();
      return;
    }

    this.state.iteration++;
    this.state.lastIterationAt = new Date().toISOString();

    try {
      // 1. Check budgets
      this.costTracker.assertWithinBudget(this.state);

      // 2. Build iteration prompt (depends on context mode)
      const prompt = this.buildIterationPrompt();

      // 3. Execute one generate() call (with tool loop inside)
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
        generateOptions.conversationId = this.state.conversationId;
      }

      const result = await this.neurolink.generate(generateOptions);

      // 4. Track costs
      this.costTracker.recordUsage(result.usage);
      this.state.totalTokensUsed = this.costTracker.totalTokens;
      this.state.totalCostUsd = this.costTracker.totalCostUsd;

      // 5. Evaluate goal
      if (this.goalEvaluator) {
        const evaluation = await this.goalEvaluator.evaluate(
          this.state.goalText,
          result,
          this.state,
        );

        if (evaluation.isComplete) {
          this.state.status = "completed";
          this.state.goalConfidence = evaluation.confidence;
          this.state.lastAssistantMessage = result.text ?? "";
          await this.trigger.stop();
          return;
        }

        this.state.goalProgress = evaluation.progressSummary;
      }

      this.state.lastAssistantMessage = result.text ?? "";
      this.state.consecutiveErrors = 0;

      // 6. For isolated mode: extract carry-forward summary
      if (this.state.contextMode === "isolated") {
        this.state.iterationSummary =
          await this.extractIterationSummary(result);
      }

      // 7. Checkpoint
      await this.maybeCheckpoint();

      // 8. Callback
      await this.config.onIterationComplete?.({
        iteration: this.state.iteration,
        result,
        snapshot: this.state,
      });
    } catch (error) {
      this.state.consecutiveErrors++;
      this.state.errorLog.push({
        iteration: this.state.iteration,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });

      if (
        this.state.consecutiveErrors >= (this.config.maxConsecutiveErrors ?? 3)
      ) {
        this.state.status = "paused";
        this.neurolink.emit(
          "heartbeat:escalate",
          "max consecutive errors reached",
          this.state,
        );
        await this.checkpoint();
        await this.trigger.stop();
      }
    }
  }

  /** Build prompt based on context mode */
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

  // ─── Lifecycle ──────────────────────────────────────

  /** Resume from checkpoint */
  static async resume(
    neurolink: NeuroLink,
    loopId: string,
    store: CheckpointStore,
    overrides?: Partial<HeartbeatLoopConfig>,
  ): Promise<LoopResult> {
    const snapshot = await store.load(loopId);
    if (!snapshot) throw new Error(`No checkpoint found for loop ${loopId}`);

    const config = { ...snapshot.config, ...overrides } as HeartbeatLoopConfig;
    const loop = new HeartbeatLoop(neurolink, config);
    loop.state = { ...snapshot, status: "running" };
    return loop.run();
  }

  /** Pause the loop (trigger stops, state checkpointed) */
  async pause(): Promise<LoopSnapshot> {
    this.state.status = "paused";
    await this.trigger.stop();
    await this.checkpoint();
    this.neurolink.emit("heartbeat:paused", this.state);
    return this.state;
  }

  /** Cancel the loop permanently */
  async cancel(): Promise<LoopSnapshot> {
    this.state.status = "cancelled";
    await this.trigger.stop();
    await this.checkpoint();
    return this.state;
  }

  /** Get current snapshot without stopping */
  getSnapshot(): Readonly<LoopSnapshot> {
    return {
      ...this.state,
      elapsedMs: Date.now() - new Date(this.state.startedAt).getTime(),
    };
  }
}
```

### Goal Evaluator

```typescript
interface GoalEvaluator {
  evaluate(
    goal: string,
    lastResult: GenerateResult,
    state: LoopSnapshot,
  ): Promise<GoalEvaluation>;
}

type GoalEvaluation = {
  isComplete: boolean;
  confidence: number; // 0-1
  progressSummary: string;
};
```

**Default: LLM-based evaluator** — uses a cheap model to assess whether the goal is met.

```typescript
class LLMGoalEvaluator implements GoalEvaluator {
  constructor(
    private neurolink: NeuroLink,
    private evalOptions?: { provider?: string; model?: string },
  ) {}

  async evaluate(
    goal: string,
    lastResult: GenerateResult,
    state: LoopSnapshot,
  ): Promise<GoalEvaluation> {
    const evaluation = await this.neurolink.generate({
      input: {
        text: `You are evaluating whether a goal has been achieved.

Goal: "${goal}"
Last response (truncated): "${lastResult.text?.substring(0, 2000)}"
Iterations completed: ${state.iteration}
Progress so far: ${state.goalProgress || "Just started"}
Total cost: $${state.totalCostUsd.toFixed(4)}

Respond with JSON only:
{ "isComplete": boolean, "confidence": number (0-1), "progressSummary": "one line" }`,
      },
      provider: this.evalOptions?.provider ?? "openai",
      model: this.evalOptions?.model ?? "gpt-4o-mini",
      output: { format: "json" },
      disableTools: true,
    });

    return JSON.parse(evaluation.text);
  }
}
```

**Custom evaluator — no LLM needed:**

```typescript
const loop = neurolink.heartbeat({
  goal: "Process all files in /data",
  goalEvaluator: {
    evaluate: async (_goal, result, state) => ({
      isComplete: result.text?.includes("ALL_FILES_PROCESSED") ?? false,
      confidence: 1.0,
      progressSummary: `Processed ${state.iteration} batches`,
    }),
  },
});
```

---

## Part 3: MCP Tool Exposure

The heartbeat loop is exposed as MCP tools so that **other AI agents or external systems can orchestrate loops programmatically**. An AI model with tool access can start, stop, query, and resume heartbeat loops.

### Tool Registration

```typescript
// src/lib/agent/heartbeatTools.ts

import { z } from "zod";
import type { NeuroLink } from "../neurolink.js";
import { HeartbeatLoop } from "./heartbeatLoop.js";
import type { HeartbeatLoopConfig, LoopSnapshot } from "./loopTypes.js";

/** Registry of active loops — keyed by loopId */
const activeLoops = new Map<string, HeartbeatLoop>();

export function createHeartbeatTools(neurolink: NeuroLink) {
  return {
    start_heartbeat: {
      name: "start_heartbeat",
      description:
        "Start a new autonomous heartbeat loop that works toward a goal over multiple iterations. " +
        "The loop runs generate() calls repeatedly with tool access, evaluates progress, " +
        "and checkpoints state. Returns the loop ID for status queries and control.",
      parameters: z.object({
        goal: z
          .string()
          .describe("Natural language goal for the loop to achieve"),
        max_iterations: z
          .number()
          .optional()
          .describe("Maximum iterations (default: 1000)"),
        max_duration: z
          .string()
          .optional()
          .describe("Max duration like '2h', '30m' (default: 4h)"),
        max_cost_usd: z.number().optional().describe("Maximum cost in USD"),
        trigger_interval: z
          .string()
          .optional()
          .describe(
            "Interval between iterations like '0s', '5s', '1m' (default: 0 = back-to-back)",
          ),
        provider: z.string().optional().describe("AI provider for iterations"),
        model: z.string().optional().describe("Model for iterations"),
        context_mode: z
          .enum(["continuation", "isolated"])
          .optional()
          .describe("Context mode (default: continuation)"),
      }),
      execute: async (params: {
        goal: string;
        max_iterations?: number;
        max_duration?: string;
        max_cost_usd?: number;
        trigger_interval?: string;
        provider?: string;
        model?: string;
        context_mode?: "continuation" | "isolated";
      }) => {
        const config: HeartbeatLoopConfig = {
          goal: params.goal,
          maxIterations: params.max_iterations,
          maxDurationMs: params.max_duration
            ? TimeoutUtils.parseTimeout(params.max_duration)
            : undefined,
          maxTotalCostUsd: params.max_cost_usd,
          trigger: params.trigger_interval
            ? {
                type: "timer",
                intervalMs: TimeoutUtils.parseTimeout(params.trigger_interval),
              }
            : undefined,
          contextMode: params.context_mode
            ? { type: params.context_mode }
            : undefined,
          stepOptions: {
            ...(params.provider && { provider: params.provider }),
            ...(params.model && { model: params.model }),
          },
        };

        const loop = new HeartbeatLoop(neurolink, config);
        activeLoops.set(loop.getSnapshot().loopId, loop);

        // Run in background — don't await
        loop.run().finally(() => {
          // Keep in registry for status queries, clean up after 1h
          setTimeout(
            () => activeLoops.delete(loop.getSnapshot().loopId),
            3600_000,
          );
        });

        return {
          success: true,
          loopId: loop.getSnapshot().loopId,
          status: "running",
          message: `Heartbeat loop started for goal: "${params.goal}"`,
        };
      },
    },

    get_heartbeat_status: {
      name: "get_heartbeat_status",
      description:
        "Get the current status and progress of a running heartbeat loop. " +
        "Returns iteration count, cost, goal progress, and error information.",
      parameters: z.object({
        loop_id: z.string().describe("The loop ID returned by start_heartbeat"),
      }),
      execute: async (params: { loop_id: string }) => {
        const loop = activeLoops.get(params.loop_id);
        if (!loop) {
          return {
            success: false,
            error: `No active loop found with ID: ${params.loop_id}`,
          };
        }

        const snapshot = loop.getSnapshot();
        return {
          success: true,
          status: snapshot.status,
          iteration: snapshot.iteration,
          goalProgress: snapshot.goalProgress,
          goalConfidence: snapshot.goalConfidence,
          totalCostUsd: snapshot.totalCostUsd,
          totalTokensUsed: snapshot.totalTokensUsed,
          elapsedMs: snapshot.elapsedMs,
          consecutiveErrors: snapshot.consecutiveErrors,
          lastAssistantMessage: snapshot.lastAssistantMessage?.substring(
            0,
            500,
          ),
        };
      },
    },

    stop_heartbeat: {
      name: "stop_heartbeat",
      description:
        "Stop a running heartbeat loop. Can be paused (resumable) or cancelled (permanent).",
      parameters: z.object({
        loop_id: z.string().describe("The loop ID to stop"),
        action: z
          .enum(["pause", "cancel"])
          .describe("Pause (resumable) or cancel (permanent)"),
      }),
      execute: async (params: {
        loop_id: string;
        action: "pause" | "cancel";
      }) => {
        const loop = activeLoops.get(params.loop_id);
        if (!loop) {
          return {
            success: false,
            error: `No active loop found with ID: ${params.loop_id}`,
          };
        }

        const snapshot =
          params.action === "pause" ? await loop.pause() : await loop.cancel();

        return {
          success: true,
          status: snapshot.status,
          iteration: snapshot.iteration,
          message: `Loop ${params.action === "pause" ? "paused" : "cancelled"} at iteration ${snapshot.iteration}`,
        };
      },
    },

    list_heartbeats: {
      name: "list_heartbeats",
      description:
        "List all active and recently completed heartbeat loops with their status.",
      parameters: z.object({}),
      execute: async () => {
        const loops = Array.from(activeLoops.entries()).map(([id, loop]) => {
          const s = loop.getSnapshot();
          return {
            loopId: id,
            goal: s.goalText.substring(0, 100),
            status: s.status,
            iteration: s.iteration,
            costUsd: s.totalCostUsd,
            elapsedMs: s.elapsedMs,
          };
        });
        return { success: true, loops, count: loops.length };
      },
    },

    resume_heartbeat: {
      name: "resume_heartbeat",
      description: "Resume a paused heartbeat loop from its last checkpoint.",
      parameters: z.object({
        loop_id: z.string().describe("The loop ID to resume"),
      }),
      execute: async (params: { loop_id: string }) => {
        const loop = activeLoops.get(params.loop_id);
        if (!loop) {
          return {
            success: false,
            error: `No active loop found with ID: ${params.loop_id}`,
          };
        }

        const snapshot = loop.getSnapshot();
        if (snapshot.status !== "paused") {
          return {
            success: false,
            error: `Loop is ${snapshot.status}, not paused`,
          };
        }

        // Run in background
        loop.run().finally(() => {
          setTimeout(() => activeLoops.delete(params.loop_id), 3600_000);
        });

        return {
          success: true,
          loopId: params.loop_id,
          status: "running",
          resumedAtIteration: snapshot.iteration,
        };
      },
    },
  };
}
```

### Registration in NeuroLink

```typescript
// In neurolink.ts — during initialization or lazily on first heartbeat use
import { createHeartbeatTools } from "./agent/heartbeatTools.js";

// Register heartbeat tools as MCP tools
const heartbeatTools = createHeartbeatTools(this);
for (const [name, tool] of Object.entries(heartbeatTools)) {
  this.registerTool(name, tool);
}
```

### External MCP Server Exposure

The heartbeat tools can also be served as a standalone MCP server for external consumption:

```typescript
// src/lib/agent/heartbeatMcpServer.ts

import { createHeartbeatTools } from "./heartbeatTools.js";
import type { MCPServerInfo } from "../types/mcpTypes.js";

export function createHeartbeatMcpServer(neurolink: NeuroLink): MCPServerInfo {
  const tools = createHeartbeatTools(neurolink);

  return {
    id: "heartbeat-loop",
    name: "NeuroLink Heartbeat Loop",
    description: "Autonomous long-running agent loop management",
    transport: "stdio", // or "http" for remote access
    status: "connected",
    tools: Object.values(tools).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.parameters, // Zod schema auto-converts
      execute: tool.execute,
    })),
  };
}

// Usage: Expose via HTTP for external systems
await neurolink.addExternalMCPServer("heartbeat", {
  transport: "http",
  url: "http://localhost:3001/mcp/heartbeat",
});
```

### MCP Usage Examples

**AI agent starting a background task:**

```
User: "Analyze all 500 TypeScript files in src/ for security vulnerabilities"

AI (via tool call): start_heartbeat({
  goal: "Analyze all TypeScript files in src/ for security vulnerabilities. Read each file, check for OWASP top 10 issues, and compile a report.",
  max_duration: "2h",
  max_cost_usd: 3.00,
  provider: "anthropic",
  model: "claude-sonnet-4-20250514"
})

→ { loopId: "hb-a1b2c3", status: "running" }

// Later...
AI (via tool call): get_heartbeat_status({ loop_id: "hb-a1b2c3" })
→ { status: "running", iteration: 47, goalProgress: "Analyzed 234/500 files, found 12 issues", costUsd: 1.23 }
```

**External system via HTTP MCP:**

```bash
# Start a loop via MCP HTTP transport
curl -X POST http://localhost:3001/mcp/heartbeat \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/call", "params": {"name": "start_heartbeat", "arguments": {"goal": "Monitor logs for anomalies", "trigger_interval": "5m"}}}'
```

---

## Part 4: Checkpoint & Resume

### Checkpoint Store Interface

```typescript
interface CheckpointStore {
  save(snapshot: LoopSnapshot): Promise<void>;
  load(loopId: string): Promise<LoopSnapshot | null>;
  list(filter?: {
    status?: string;
  }): Promise<
    Array<{ loopId: string; status: string; goal: string; updatedAt: string }>
  >;
  delete(loopId: string): Promise<void>;
}
```

### Built-in Implementations

```typescript
// v1: File-based (simple, no dependencies)
class FileCheckpointStore implements CheckpointStore {
  // Stores JSON in .neurolink/checkpoints/{loopId}.json
  constructor(private dir: string = ".neurolink/checkpoints") {}
}

// v1: Redis-based (for production with existing Redis)
class RedisCheckpointStore implements CheckpointStore {
  // Uses existing Redis connection from conversation memory
  constructor(
    private redis: RedisClient,
    private prefix = "neurolink:checkpoint:",
  ) {}
}

// v1: In-memory (for testing)
class InMemoryCheckpointStore implements CheckpointStore {
  private store = new Map<string, LoopSnapshot>();
}
```

---

## Part 5: SDK & CLI API

### SDK API

```typescript
// ─── Start a new heartbeat loop ──────────────────────────
const result = await neurolink.heartbeat({
  goal: "Analyze all TypeScript files in src/ and generate a migration plan to ESM",
  maxDurationMs: 2 * 60 * 60 * 1000,
  maxTotalCostUsd: 5.0,

  // Trigger: back-to-back (default)
  trigger: { type: "timer", intervalMs: 0 },

  // Context: continuation (default)
  contextMode: { type: "continuation" },

  stepOptions: {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
  },

  onHeartbeat: (state) => {
    console.log(
      `[iter ${state.iteration}] ${state.goalProgress} | $${state.totalCostUsd.toFixed(2)}`,
    );
  },
});

// ─── Start with future RabbitMQ trigger ──────────────────
const result = await neurolink.heartbeat({
  goal: "Process incoming documents as they arrive",
  trigger: {
    type: "rabbitmq",
    connectionUrl: "amqp://localhost",
    queue: "documents",
  },
  contextMode: { type: "isolated" }, // Each message = fresh context
});

// ─── Start with cron schedule ────────────────────────────
const result = await neurolink.heartbeat({
  goal: "Check production logs for anomalies and alert if found",
  trigger: { type: "cron", schedule: "*/15 * * * *" }, // Every 15 minutes
  contextMode: { type: "isolated" },
  maxDurationMs: 24 * 60 * 60 * 1000, // Run for 24 hours
});

// ─── Resume a crashed loop ───────────────────────────────
const result = await HeartbeatLoop.resume(
  neurolink,
  "hb-a1b2c3",
  new RedisCheckpointStore(redisClient),
);

// ─── Non-blocking: start and get handle ──────────────────
const loop = neurolink.createHeartbeat({
  goal: "Long running task",
  maxDurationMs: 8 * 60 * 60 * 1000,
});

loop.on("iteration", (result) => console.log(result));
loop.on("complete", (result) => console.log("Done!", result));

const handle = loop.start(); // Returns immediately
// ... later
const snapshot = loop.getSnapshot(); // Check progress
await loop.pause(); // Pause
await loop.cancel(); // Or cancel
```

### CLI API

```bash
# Start a heartbeat loop (back-to-back, continuation mode)
neurolink heartbeat "Refactor all providers to use the new error handling pattern" \
  --max-duration 2h \
  --max-cost 5.00 \
  --provider anthropic \
  --model claude-sonnet-4-20250514

# Start with interval trigger
neurolink heartbeat "Monitor logs for anomalies" \
  --trigger timer \
  --trigger-interval 5m \
  --context-mode isolated \
  --max-duration 24h

# Resume a paused/crashed loop
neurolink heartbeat --resume hb-a1b2c3

# List all loops
neurolink heartbeat --list

# Get status of a specific loop
neurolink heartbeat --status hb-a1b2c3

# Cancel a loop
neurolink heartbeat --cancel hb-a1b2c3

# Checkpoint store selection
neurolink heartbeat "task" --checkpoint-store redis
neurolink heartbeat "task" --checkpoint-store file
```

### Events (via NeuroLink EventEmitter)

```typescript
neurolink.on("heartbeat:tick",       (snapshot: LoopSnapshot) => { ... });
neurolink.on("heartbeat:iteration",  (result: IterationResult) => { ... });
neurolink.on("heartbeat:checkpoint", (snapshot: LoopSnapshot) => { ... });
neurolink.on("heartbeat:error",      (error: Error, snapshot: LoopSnapshot) => { ... });
neurolink.on("heartbeat:escalate",   (reason: string, snapshot: LoopSnapshot) => { ... });
neurolink.on("heartbeat:complete",   (result: LoopResult) => { ... });
neurolink.on("heartbeat:paused",     (snapshot: LoopSnapshot) => { ... });
neurolink.on("heartbeat:cancelled",  (snapshot: LoopSnapshot) => { ... });
neurolink.on("heartbeat:resumed",    (snapshot: LoopSnapshot) => { ... });
```

---

## Part 6: File Structure

```
src/lib/agent/
├── heartbeatLoop.ts          # Core HeartbeatLoop class
├── loopTypes.ts              # All type definitions (config, snapshot, evaluation, etc.)
├── loopState.ts              # LoopSnapshot management, checkpoint serialization
├── goalEvaluator.ts          # GoalEvaluator interface + LLMGoalEvaluator default
├── costTracker.ts            # Token/cost budget enforcement
├── heartbeatTools.ts         # MCP tool definitions (start, stop, status, list, resume)
├── heartbeatMcpServer.ts     # Standalone MCP server for external exposure
├── triggers/
│   ├── triggerAdapter.ts     # TriggerAdapter interface
│   ├── triggerRegistry.ts    # TriggerRegistry for pluggable triggers
│   ├── timerTrigger.ts       # v1: Node.js setTimeout/setImmediate trigger
│   └── README.md             # Guide for implementing custom triggers
├── checkpoints/
│   ├── checkpointStore.ts    # CheckpointStore interface
│   ├── fileCheckpoint.ts     # File-based checkpoint store
│   ├── redisCheckpoint.ts    # Redis-based checkpoint store
│   └── memoryCheckpoint.ts   # In-memory checkpoint store (testing)
└── index.ts                  # Public exports
```

---

## Implementation Effort Estimate

| Component                                                 | Complexity | Lines (est.) | v1 Scope         |
| --------------------------------------------------------- | ---------- | ------------ | ---------------- |
| `loopTypes.ts`                                            | Low        | ~180         | Yes              |
| `costTracker.ts`                                          | Low        | ~100         | Yes              |
| `goalEvaluator.ts`                                        | Medium     | ~150         | Yes              |
| Trigger system (interface + timer + registry)             | Medium     | ~250         | Yes (timer only) |
| `loopState.ts` + checkpoint stores                        | Medium     | ~300         | Yes              |
| `heartbeatLoop.ts`                                        | Medium     | ~400         | Yes              |
| `heartbeatTools.ts` (MCP tools)                           | Medium     | ~250         | Yes              |
| `heartbeatMcpServer.ts`                                   | Low        | ~60          | Yes              |
| CLI command                                               | Low        | ~120         | Yes              |
| Tests                                                     | Medium     | ~500         | Yes              |
| **v1 Total**                                              |            | **~2,310**   |                  |
| Future triggers (RabbitMQ, Cron, Webhook, ProcessWatcher) | Medium     | ~600         | No               |
| Isolated context mode implementation                      | Medium     | ~200         | No               |
| **Full Total**                                            |            | **~3,110**   |                  |

---

## Key Design Decisions

### 1. Trigger/execution separation (When vs What)

The trigger decides WHEN to call `executeIteration()`. The loop decides WHAT to do. This means:

- Swapping `TimerTrigger` for `RabbitMQTrigger` requires zero changes to loop logic
- Custom triggers just implement 3 methods (`start`, `stop`, `isActive`)
- The same loop config works with any trigger type

### 2. MCP tools as first-class interface

Making the heartbeat controllable via MCP tools means:

- **AI agents can start loops** — "start a background task to analyze these files"
- **External systems can orchestrate** — CI pipelines, monitoring systems, webhooks
- **Agents can monitor agents** — one agent checks another's progress
- **Standard MCP clients work** — any MCP-compatible tool gets heartbeat control for free

### 3. Context modes for different workloads

**Continuation** (v1): Good for tasks where knowledge builds up.

- "Refactor this codebase" — each iteration sees what was changed before
- Uses existing conversation memory and compaction

**Isolated** (future): Good for recurring/stateless tasks.

- "Check logs every 15 minutes" — each check is independent
- Carries only a summary from the checkpoint, not full history
- Prevents context pollution from stale iterations

### 4. Trigger registry follows NeuroLink's Factory + Registry pattern

Consistent with `ProviderRegistry`, `ChunkerRegistry`, `RerankerRegistry`, `ProcessorRegistry`. Users register custom triggers the same way they register custom providers.

### 5. One `generate()` per iteration, not one token

Each iteration does a full `generate()` with its own tool loop (`maxStepsPerIteration`). Goal evaluation happens between high-level reasoning steps, not between tool calls. Cost tracking is per-iteration.

### 6. Checkpointing is conversation-ID based

The `conversationId` points to the full conversation in Redis memory. The checkpoint stores only metadata (iteration count, costs, goal progress). Redis memory is required for crash recovery in continuation mode.

---

## Migration Path

Purely additive — no changes to existing APIs:

1. Add `src/lib/agent/` directory with new files
2. Add `heartbeat()` and `createHeartbeat()` methods to `NeuroLink` class
3. Register heartbeat MCP tools during initialization
4. Add `heartbeat` CLI command via `commandFactory.ts`
5. Add heartbeat event types to `NeuroLinkEvents`
6. Export new types from `src/lib/types/index.ts`
7. Register `TimerTrigger` in `TriggerRegistry` as built-in

---

## Future Work (Not in v1)

- **Isolated context mode** — fresh context per iteration with checkpoint summary carry-forward
- **RabbitMQ, Cron, Webhook, ProcessWatcher triggers** — pluggable via TriggerRegistry
- **Parallel agent spawning** — multiple heartbeat loops coordinating toward sub-goals
- **Streaming iterations** — use `stream()` instead of `generate()` for real-time output
- **Sub-goal decomposition** — planner that breaks goal into sub-tasks and spawns child loops
- **Shared scratchpad** — key-value store accessible across iterations beyond conversation memory
- **Loop-to-loop communication** — one heartbeat loop can query another's progress
- **Web dashboard** — real-time visualization of active loops, costs, and progress
