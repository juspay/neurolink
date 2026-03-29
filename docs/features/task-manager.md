# TaskManager - Scheduled & Self-Running Tasks

## Overview

TaskManager adds scheduled and self-running task capabilities to NeuroLink. It enables AI agents to execute prompts on a schedule (cron, interval, or one-shot), with two execution modes: **Isolated** (fresh context per run) and **Continuation** (preserves conversation history across runs).

The system is available as both an **SDK API** and **CLI commands**, and ships with **built-in tools** so AI agents can self-schedule tasks during conversations.

---

## Core Concepts

### Task

A Task is a unit of scheduled work. It contains:

- A **prompt** (what the AI should do)
- A **schedule** (when to run: cron expression, fixed interval, or one-shot)
- An **execution mode** (isolated or continuation)
- Optional **provider/model overrides**
- Optional **callbacks** for results

### TaskManager

The orchestration layer that manages task lifecycle: creation, scheduling, execution, pausing, resuming, deletion, and logging. Accessed via `neurolink.tasks`.

### Execution Modes

| Mode             | Behavior                                                                               | Use Case                                                     |
| ---------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **Isolated**     | Each run gets a fresh NeuroLink context. No memory of previous runs.                   | One-off checks, stateless monitoring, report generation      |
| **Continuation** | Conversation history is preserved across runs. The AI "remembers" previous executions. | Trend analysis, progressive monitoring, iterative refinement |

### Task Backends

The scheduling/looping mechanism is abstracted behind a `TaskBackend` interface. Two implementations ship by default:

| Backend         | Default  | Requires | Survives Restart | Best For                                              |
| --------------- | -------- | -------- | ---------------- | ----------------------------------------------------- |
| **BullMQ**      | Yes      | Redis    | Yes              | Production, multi-process, reliable scheduling        |
| **NodeTimeout** | Fallback | Nothing  | No               | Development, zero-dependency setups, simple use cases |

### Storage Strategy

Storage is **automatically tied to the backend** — users never configure it separately:

| Backend         | Task Store | Run Logs    | Why                                                                                         |
| --------------- | ---------- | ----------- | ------------------------------------------------------------------------------------------- |
| **BullMQ**      | Redis      | Redis       | Same Redis instance; multi-process safe, survives container restarts, works across replicas |
| **NodeTimeout** | JSON file  | JSONL files | No Redis available; local dev, single process, human-readable for debugging                 |

This means:

- **Production servers** (BullMQ) → everything in Redis → horizontally scalable, no file I/O, container-friendly
- **Local dev / CLI** (NodeTimeout) → JSON files → zero dependencies, inspectable with any text editor

---

## Architecture

Follows NeuroLink's established **Factory + Registry** pattern.

### Directory Structure

```
src/lib/tasks/
  index.ts                          # Public exports
  taskManager.ts                    # TaskManager class (orchestrator)
  taskExecutor.ts                   # Task execution engine
  types.ts                          # Task type definitions
  store/
    taskStore.ts                    # TaskStore interface
    redisTaskStore.ts               # Redis implementation (used with BullMQ backend)
    fileTaskStore.ts                # JSON file implementation (used with NodeTimeout backend)
  backends/
    taskBackend.ts                  # TaskBackend interface
    taskBackendRegistry.ts          # Registry for backend implementations
    bullmqBackend.ts                # BullMQ implementation
    nodeTimeoutBackend.ts           # Node.js setTimeout/setInterval implementation
  tools/
    taskTools.ts                    # Built-in agent tools (createTask, listTasks, etc.)

src/cli/commands/
  task.ts                           # CLI command: `neurolink task`
```

### Component Diagram

```
                       NeuroLink
                          |
                          v
                     TaskManager
                    /          \
                   v            v
            TaskExecutor     TaskStore (interface)
                 |            /            \
                 v           v              v
           TaskBackend    RedisTaskStore   FileTaskStore
           (interface)    (BullMQ mode)   (NodeTimeout mode)
            /        \        |               |
           v          v       v               v
        BullMQ    NodeTimeout Redis    .neurolink/tasks/
       (Redis)   (setTimeout)
```

**Storage auto-selection:** When `backend: "bullmq"`, TaskManager creates a `RedisTaskStore` (task definitions + run logs in Redis). When `backend: "node-timeout"`, it creates a `FileTaskStore` (JSON + JSONL on disk). The `TaskStore` interface abstracts this so all other components are storage-agnostic.

### How It Fits Into NeuroLink

```typescript
// neurolink.ts - new property
class NeuroLink {
  private _taskManager?: TaskManager;

  get tasks(): TaskManager {
    if (!this._taskManager) {
      this._taskManager = new TaskManager(this);
    }
    return this._taskManager;
  }
}
```

---

## Type Definitions

```typescript
// ── Schedule Types ──────────────────────────────────────

type TaskScheduleType = "cron" | "interval" | "once";

type CronSchedule = {
  type: "cron";
  expression: string; // Standard 5-field cron: "0 9 * * *"
  timezone?: string; // IANA timezone: "America/New_York"
};

type IntervalSchedule = {
  type: "interval";
  every: number; // Milliseconds
};

type OnceSchedule = {
  type: "once";
  at: Date | string; // ISO 8601 timestamp or Date object
};

type TaskSchedule = CronSchedule | IntervalSchedule | OnceSchedule;

// ── Execution Mode ──────────────────────────────────────

type TaskExecutionMode = "isolated" | "continuation";

// ── Task Status ─────────────────────────────────────────

type TaskStatus =
  | "pending" // Created but not yet scheduled
  | "active" // Scheduled and running on schedule
  | "paused" // Temporarily stopped
  | "completed" // One-shot task finished, or maxRuns reached
  | "failed" // Permanently failed (exhausted retries)
  | "cancelled"; // Manually deleted

// ── Task Definition (what users provide) ────────────────

type TaskDefinition = {
  name: string;
  prompt: string;
  schedule: TaskSchedule;
  mode?: TaskExecutionMode; // Default: "isolated"

  // Optional overrides
  provider?: string;
  model?: string;
  thinkingLevel?: ThinkingLevel;
  systemPrompt?: string;
  tools?: boolean; // Enable/disable tools for this task. Default: true
  maxTokens?: number;
  temperature?: number;

  // Execution limits
  maxRuns?: number; // Max executions. Omit for unlimited.
  timeout?: number; // Per-run timeout in ms. Default: 120000

  // Retry
  retry?: {
    maxAttempts?: number; // Default: 3
    backoffMs?: number[]; // Default: [30000, 60000, 300000]
  };

  // Callbacks (SDK only)
  onSuccess?: (result: TaskRunResult) => void | Promise<void>;
  onError?: (error: TaskRunError) => void | Promise<void>;
  onComplete?: (task: Task) => void | Promise<void>; // When task reaches terminal state

  // Metadata
  metadata?: Record<string, unknown>;
};

// ── Task (internal, stored) ─────────────────────────────

type Task = {
  id: string; // nanoid
  name: string;
  prompt: string;
  schedule: TaskSchedule;
  mode: TaskExecutionMode;
  status: TaskStatus;

  // Overrides
  provider?: string;
  model?: string;
  thinkingLevel?: ThinkingLevel;
  systemPrompt?: string;
  tools: boolean;
  maxTokens?: number;
  temperature?: number;

  // Limits & retry
  maxRuns?: number;
  timeout: number;
  retry: { maxAttempts: number; backoffMs: number[] };

  // Tracking
  runCount: number;
  lastRunAt?: string; // ISO 8601
  nextRunAt?: string; // ISO 8601
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601

  // Continuation mode state
  sessionId?: string; // Conversation session ID for continuation mode

  // Metadata
  metadata?: Record<string, unknown>;
};

// ── Run Results ─────────────────────────────────────────

type TaskRunResult = {
  taskId: string;
  runId: string;
  status: "success" | "error";
  output?: string; // AI response text
  toolCalls?: Array<{
    name: string;
    input: unknown;
    output: unknown;
  }>;
  tokensUsed?: { input: number; output: number };
  durationMs: number;
  timestamp: string; // ISO 8601
  error?: string;
};

type TaskRunError = {
  taskId: string;
  runId: string;
  error: string;
  attempt: number;
  maxAttempts: number;
  willRetry: boolean;
  timestamp: string;
};

// ── Task Store Interface ────────────────────────────────
// Auto-selected based on backend: BullMQ → RedisTaskStore, NodeTimeout → FileTaskStore

interface TaskStore {
  readonly type: "redis" | "file";

  initialize(): Promise<void>;
  shutdown(): Promise<void>;

  // Task CRUD
  save(task: Task): Promise<void>;
  get(taskId: string): Promise<Task | null>;
  list(filter?: { status?: TaskStatus }): Promise<Task[]>;
  update(taskId: string, updates: Partial<Task>): Promise<Task>;
  delete(taskId: string): Promise<void>;

  // Run log CRUD
  appendRun(taskId: string, run: TaskRunResult): Promise<void>;
  getRuns(
    taskId: string,
    options?: { limit?: number; status?: string },
  ): Promise<TaskRunResult[]>;
}

// RedisTaskStore: stores tasks as Redis hashes, run logs as Redis lists
//   Key patterns: "neurolink:task:{id}" (hash), "neurolink:task:{id}:runs" (list)
//   Auto-prunes run logs via LTRIM to keep latest `maxRunLogs` entries
//
// FileTaskStore: stores tasks in .neurolink/tasks/tasks.json, run logs in .neurolink/tasks/runs/{id}.jsonl
//   Auto-prunes JSONL when file exceeds `runLogMaxSize`, keeping `runLogKeepLines` entries

// ── Backend Interface ───────────────────────────────────

interface TaskBackend {
  readonly name: string;

  initialize(): Promise<void>;
  shutdown(): Promise<void>;

  schedule(task: Task): Promise<void>;
  cancel(taskId: string): Promise<void>;
  pause(taskId: string): Promise<void>;
  resume(taskId: string): Promise<void>;

  isHealthy(): Promise<boolean>;
}

// ── TaskManager Config ──────────────────────────────────

type TaskManagerConfig = {
  enabled?: boolean; // Default: true
  backend?: "bullmq" | "node-timeout"; // Default: "bullmq"

  // BullMQ-specific (also used by RedisTaskStore)
  redis?: {
    host?: string; // Default: "localhost"
    port?: number; // Default: 6379
    password?: string;
    db?: number;
    url?: string; // Alternative: full Redis URL
  };

  // FileTaskStore-specific (only used when backend is "node-timeout")
  storePath?: string; // Default: ".neurolink/tasks/tasks.json"
  logsPath?: string; // Default: ".neurolink/tasks/runs/"

  // Limits
  maxConcurrentRuns?: number; // Default: 5
  maxRunLogs?: number; // Default: 2000 (max run entries per task)

  // Retention (prevents Redis/disk from growing forever)
  taskRetention?: {
    completedTTL?: number; // Auto-delete completed tasks after N ms. Default: 30 days
    failedTTL?: number; // Auto-delete failed tasks after N ms. Default: 7 days
    cancelledTTL?: number; // Auto-delete cancelled tasks after N ms. Default: 7 days
    runLogTTL?: number; // Auto-expire individual run log entries after N ms. Default: 30 days
  };
  // Note: Active and paused tasks never expire. Only terminal-state tasks are subject to TTL.
  // In Redis, TTLs are set via EXPIRE. In FileTaskStore, a periodic sweep removes expired entries.
};
```

---

## SDK API

### Initialization

```typescript
import { NeuroLink } from "@juspay/neurolink";

// TaskManager auto-initializes with defaults (BullMQ + Redis)
const neurolink = new NeuroLink();

// Or configure explicitly
const neurolink = new NeuroLink({
  tasks: {
    enabled: true,
    backend: "bullmq",
    redis: { url: "redis://localhost:6379" },
    maxConcurrentRuns: 5,
  },
});

// Zero-dependency mode (no Redis needed)
const neurolink = new NeuroLink({
  tasks: { backend: "node-timeout" },
});
```

### Creating Tasks

```typescript
// Cron-based isolated task
const dailyReport = await neurolink.tasks.create({
  name: "daily-report",
  prompt: "Generate a daily status report of system health metrics.",
  schedule: {
    type: "cron",
    expression: "0 9 * * *",
    timezone: "America/New_York",
  },
  mode: "isolated",
  provider: "openai",
  model: "gpt-4o",
});

// Interval-based continuation task (AI remembers previous runs)
const monitor = await neurolink.tasks.create({
  name: "api-monitor",
  prompt:
    "Check the API health endpoint and compare with previous observations. Alert if degradation detected.",
  schedule: { type: "interval", every: 5 * 60 * 1000 }, // Every 5 minutes
  mode: "continuation",
  provider: "anthropic",
  model: "claude-sonnet-4-6",
  maxRuns: 100,
  onSuccess: (result) => {
    if (result.output?.includes("ALERT")) {
      sendSlackNotification(result.output);
    }
  },
});

// One-shot task (runs once at a specific time)
const reminder = await neurolink.tasks.create({
  name: "deploy-reminder",
  prompt: "Remind the team about the scheduled deployment.",
  schedule: { type: "once", at: "2026-04-01T14:00:00Z" },
  mode: "isolated",
});
```

### Managing Tasks

```typescript
// List all tasks
const tasks = await neurolink.tasks.list();
const activeTasks = await neurolink.tasks.list({ status: "active" });

// Get a specific task
const task = await neurolink.tasks.get("task_abc123");

// Run immediately (outside of schedule)
const result = await neurolink.tasks.run("task_abc123");

// Pause/Resume
await neurolink.tasks.pause("task_abc123");
await neurolink.tasks.resume("task_abc123");

// Update a task (partial update)
await neurolink.tasks.update("task_abc123", {
  prompt: "Updated prompt text",
  schedule: { type: "interval", every: 10 * 60 * 1000 },
});

// Delete a task
await neurolink.tasks.delete("task_abc123");

// View run history
const runs = await neurolink.tasks.runs("task_abc123", { limit: 20 });

// Shutdown (cleanup all backends gracefully)
await neurolink.tasks.shutdown();
```

---

## CLI Commands

```bash
# ── Create tasks ─────────────────────────────────────────

# Cron schedule
neurolink task create \
  --name "daily-report" \
  --prompt "Generate a daily status report" \
  --cron "0 9 * * *" \
  --timezone "America/New_York" \
  --mode isolated \
  --provider openai \
  --model gpt-4o

# Interval schedule
neurolink task create \
  --name "api-monitor" \
  --prompt "Check API health and compare with previous runs" \
  --every 5m \
  --mode continuation \
  --provider anthropic

# One-shot schedule
neurolink task create \
  --name "reminder" \
  --prompt "Remind about deployment" \
  --at "2026-04-01T14:00:00Z" \
  --mode isolated

# ── Manage tasks ─────────────────────────────────────────

neurolink task list                         # List all tasks
neurolink task list --status active         # Filter by status
neurolink task get <task-id>                # Show task details
neurolink task run <task-id>                # Run immediately
neurolink task pause <task-id>              # Pause scheduling
neurolink task resume <task-id>             # Resume scheduling
neurolink task update <task-id> --prompt "New prompt"
neurolink task delete <task-id>             # Delete task

# ── View logs ────────────────────────────────────────────

neurolink task logs <task-id>               # View recent runs
neurolink task logs <task-id> --limit 50    # View more runs
neurolink task logs <task-id> --status error # Filter by status
```

### CLI Shorthand for Intervals

The `--every` flag accepts human-readable durations:

| Input | Meaning          |
| ----- | ---------------- |
| `30s` | 30 seconds       |
| `5m`  | 5 minutes        |
| `2h`  | 2 hours          |
| `1d`  | 1 day            |
| `500` | 500 milliseconds |

---

## Built-in Agent Tools

These tools are registered as direct agent tools, available to the AI during any conversation. They allow the AI to self-schedule work.

### `createTask`

The AI can schedule follow-up tasks during a conversation.

```
Tool: createTask
Description: Schedule a recurring or one-shot task that runs a prompt on a schedule.
Input:
  name: string          - Human-readable task name
  prompt: string        - The prompt to execute on each run
  schedule: object      - { type: "cron"|"interval"|"once", expression?, every?, at? }
  mode?: string         - "isolated" (default) or "continuation"
Output:
  { taskId, name, status, nextRunAt }
```

**Example AI usage:**

> User: "Monitor my API endpoint every 10 minutes and alert me if it goes down."
> AI calls `createTask` with `{ name: "api-monitor", prompt: "Check https://api.example.com/health ...", schedule: { type: "interval", every: 600000 }, mode: "continuation" }`

### `listTasks`

```
Tool: listTasks
Description: List all scheduled tasks and their current status.
Input:
  status?: string       - Filter by status: "active", "paused", "completed", "failed"
Output:
  Array<{ taskId, name, status, schedule, lastRunAt, nextRunAt, runCount }>
```

### `getTaskRuns`

```
Tool: getTaskRuns
Description: Get the run history of a scheduled task.
Input:
  taskId: string        - The task ID
  limit?: number        - Max results (default: 10)
Output:
  Array<{ runId, status, output, durationMs, timestamp }>
```

### `deleteTask`

```
Tool: deleteTask
Description: Cancel and remove a scheduled task.
Input:
  taskId: string        - The task ID to delete
Output:
  { success: boolean, deletedTask: string }
```

### `runTaskNow`

```
Tool: runTaskNow
Description: Immediately execute a scheduled task outside of its normal schedule.
Input:
  taskId: string        - The task ID to run
Output:
  { runId, status, output, durationMs }
```

---

## Backend Interface & Extensibility

### TaskBackend Interface

All backends implement this interface. To add a new backend (e.g., Agenda, Bree, pg-boss), implement `TaskBackend` and register it.

```typescript
interface TaskBackend {
  readonly name: string;

  /** Initialize the backend (connect to Redis, etc.) */
  initialize(): Promise<void>;

  /** Gracefully shut down */
  shutdown(): Promise<void>;

  /** Schedule a task for execution */
  schedule(task: Task, executor: TaskExecutorFn): Promise<void>;

  /** Cancel a scheduled task */
  cancel(taskId: string): Promise<void>;

  /** Pause a task's schedule */
  pause(taskId: string): Promise<void>;

  /** Resume a paused task */
  resume(taskId: string): Promise<void>;

  /** Check if backend is operational */
  isHealthy(): Promise<boolean>;
}

type TaskExecutorFn = (task: Task) => Promise<TaskRunResult>;
```

### Registering a Custom Backend

```typescript
import { TaskBackendRegistry } from "@juspay/neurolink";

// Register at startup
TaskBackendRegistry.register("pg-boss", async (config) => {
  const { PgBossBackend } = await import("./pgBossBackend.js");
  return new PgBossBackend(config);
});

// Use it
const neurolink = new NeuroLink({
  tasks: { backend: "pg-boss" },
});
```

### BullMQ Backend Details

- Uses `bullmq` `Queue` + `Worker` + `upsertJobScheduler()`
- Cron tasks → BullMQ repeatable jobs
- Interval tasks → BullMQ repeatable jobs with `every` option
- One-shot tasks → BullMQ delayed jobs
- Pause/Resume via task cancellation and re-scheduling through TaskManager
- Survives process restarts (Redis-persisted)
- Configurable concurrency via `maxConcurrentRuns`

### NodeTimeout Backend Details

- Uses `setTimeout` for one-shot, `setInterval` for recurring
- Cron expressions parsed with `croner` library (lightweight, no deps)
- Timers are in-process — lost on restart
- Task definitions persisted to disk via `FileTaskStore` — re-scheduled on startup from file
- Good for: development, testing, single-process deployments

---

## Continuation Mode - How It Works

Continuation mode preserves conversation context across task runs, enabling the AI to build understanding over time.

### Implementation

1. On first run, a new `sessionId` is generated and stored on the Task
2. Each run appends the task's prompt as a user message and the AI's response as an assistant message
3. The conversation messages are stored via NeuroLink's existing memory system (Redis or in-memory)
4. On subsequent runs, the full history is loaded and passed as `conversationMessages` (typed as `ChatMessage[]`) to `generate()`
5. Context compaction kicks in automatically when history exceeds budget

### Example: Progressive Monitoring

```typescript
const monitor = await neurolink.tasks.create({
  name: "trend-watcher",
  prompt:
    "Check current Bitcoin price. Compare with your previous observations. Report any significant trends.",
  schedule: { type: "interval", every: 60 * 60 * 1000 }, // Hourly
  mode: "continuation",
  tools: true, // AI can use websearch, etc.
});
```

**Run 1 output:** "Bitcoin is at $67,234. This is my first observation."
**Run 2 output:** "Bitcoin is at $67,891, up 0.98% from last hour ($67,234)."
**Run 3 output:** "Bitcoin at $68,102. Steady upward trend over 3 hours: $67,234 → $67,891 → $68,102 (+1.29% total)."

The AI maintains awareness of all previous observations without any external state management.

---

## Persistence & Storage

Storage is **automatically tied to the backend** — no separate configuration needed.

### RedisTaskStore (BullMQ backend)

Used automatically when `backend: "bullmq"`. All data lives in Redis alongside BullMQ's job state.

**Redis key patterns:**

| Key                           | Type | Content                                             |
| ----------------------------- | ---- | --------------------------------------------------- |
| `neurolink:tasks`             | Hash | All task definitions (field = taskId, value = JSON) |
| `neurolink:task:{id}:runs`    | List | Run log entries (newest first)                      |
| `neurolink:task:{id}:history` | List | Continuation mode conversation history              |

Run logs auto-pruned via `LTRIM` to keep the latest `maxRunLogs` entries (default 2000). Terminal-state tasks (completed, failed, cancelled) auto-expire via Redis `EXPIRE` based on `taskRetention` config (default: 30 days for completed, 7 days for failed/cancelled). Active and paused tasks **never expire**.

**Production advantages:**

- Multi-process safe (multiple server instances share the same tasks)
- Survives container/process restarts
- No file I/O — works in ephemeral containers (Docker, K8s, serverless)
- Atomic operations for concurrent access

### FileTaskStore (NodeTimeout backend)

Used automatically when `backend: "node-timeout"`. Data stored as human-readable files on disk.

**Task definitions** (`.neurolink/tasks/tasks.json`):

```json
{
  "version": 1,
  "tasks": {
    "task_abc123": {
      "id": "task_abc123",
      "name": "daily-report",
      "prompt": "Generate a daily status report",
      "schedule": { "type": "cron", "expression": "0 9 * * *" },
      "mode": "isolated",
      "status": "active",
      "runCount": 14,
      "lastRunAt": "2026-03-29T09:00:02.341Z",
      "nextRunAt": "2026-03-30T09:00:00.000Z",
      "createdAt": "2026-03-15T10:00:00.000Z",
      "updatedAt": "2026-03-29T09:00:02.341Z"
    }
  }
}
```

**Run logs** (`.neurolink/tasks/runs/<taskId>.jsonl`), one line per run, append-only:

```jsonl
{"runId":"run_001","status":"success","output":"Report generated...","durationMs":4523,"timestamp":"2026-03-29T09:00:02Z"}
{"runId":"run_002","status":"error","error":"Provider timeout","durationMs":120000,"timestamp":"2026-03-30T09:00:00Z"}
```

Auto-pruned when entries exceed `maxRunLogs` (default 2000), keeping the most recent entries.

### Summary

| Data                 | BullMQ (Redis)                     | NodeTimeout (File)                  |
| -------------------- | ---------------------------------- | ----------------------------------- |
| Task definitions     | `neurolink:tasks` hash             | `.neurolink/tasks/tasks.json`       |
| Run history          | `neurolink:task:{id}:runs` list    | `.neurolink/tasks/runs/{id}.jsonl`  |
| Continuation history | `neurolink:task:{id}:history` list | In-memory (lost on restart)         |
| Job scheduling state | Managed by BullMQ in Redis         | In-process timers (lost on restart) |

---

## Configuration via NeuroLink Constructor

```typescript
// Production: BullMQ + Redis (default)
const neurolink = new NeuroLink({
  tasks: {
    enabled: true, // Default: true (core component)
    backend: "bullmq", // Default: "bullmq"
    redis: {
      url: "redis://localhost:6379",
      // or individual fields:
      // host: "localhost",
      // port: 6379,
      // password: "secret",
      // db: 0,
    },
    maxConcurrentRuns: 5, // Default: 5
    maxRunLogs: 2000, // Default: 2000 per task
  },
});

// Development: NodeTimeout + files (zero-dependency)
const neurolink = new NeuroLink({
  tasks: {
    backend: "node-timeout",
    storePath: ".neurolink/tasks/tasks.json", // Only used with node-timeout
    logsPath: ".neurolink/tasks/runs/", // Only used with node-timeout
  },
});
```

### Environment Variable Overrides

> **Note:** The following environment variables are **planned but not yet implemented**. They are not currently read by any code. Configuration should be done programmatically via the `NeuroLink` constructor options until these are wired up.

| Variable                         | Purpose                            | Default                       |
| -------------------------------- | ---------------------------------- | ----------------------------- |
| `NEUROLINK_TASKS_ENABLED`        | Enable/disable TaskManager         | `true`                        |
| `NEUROLINK_TASKS_BACKEND`        | Backend selection                  | `bullmq`                      |
| `NEUROLINK_TASKS_REDIS_URL`      | Redis connection URL (BullMQ)      | `redis://localhost:6379`      |
| `NEUROLINK_TASKS_STORE_PATH`     | File store path (NodeTimeout only) | `.neurolink/tasks/tasks.json` |
| `NEUROLINK_TASKS_MAX_CONCURRENT` | Max concurrent task runs           | `5`                           |

---

## Retry & Error Handling

### Retry Policy

- **Transient errors** (rate limits, network timeouts, 5xx): Auto-retry with exponential backoff
- **Permanent errors** (auth failures, invalid config): Task marked as `failed` immediately
- Default: 3 attempts with backoff at 30s, 60s, 5min

### Error Classification

```typescript
// Transient (will retry)
- Provider rate limit exceeded
- Network timeout
- 5xx server errors
- Redis connection temporarily lost

// Permanent (task fails)
- Invalid API key
- Model not found
- Invalid prompt (empty, too long)
- Task configuration error
```

### One-shot vs Recurring Error Behavior

| Task Type                     | On Transient Error                     | On Permanent Error |
| ----------------------------- | -------------------------------------- | ------------------ |
| One-shot (`once`)             | Retry up to maxAttempts                | Mark as `failed`   |
| Recurring (`cron`/`interval`) | Retry, then skip to next scheduled run | Mark as `failed`   |

---

## Events

TaskManager emits events via NeuroLink's existing `TypedEventEmitter`:

```typescript
neurolink.on("task:created", (task: Task) => { ... });
neurolink.on("task:started", (task: Task, runId: string) => { ... });
neurolink.on("task:completed", (result: TaskRunResult) => { ... });
neurolink.on("task:failed", (error: TaskRunError) => { ... });
neurolink.on("task:paused", (task: Task) => { ... });
neurolink.on("task:resumed", (task: Task) => { ... });
neurolink.on("task:deleted", (taskId: string) => { ... });
```

---

## Implementation Phases

### Phase 1: Core Infrastructure

1. Type definitions (`src/lib/tasks/types.ts`)
2. TaskBackend interface (`src/lib/tasks/backends/taskBackend.ts`)
3. TaskBackendFactory + Registry (`src/lib/tasks/backends/taskBackendFactory.ts`, `taskBackendRegistry.ts`)
4. TaskStore interface (`src/lib/tasks/store/taskStore.ts`)
5. RedisTaskStore (`src/lib/tasks/store/redisTaskStore.ts`)
6. FileTaskStore (`src/lib/tasks/store/fileTaskStore.ts`)

### Phase 2: Backends

7. NodeTimeout backend (`src/lib/tasks/backends/nodeTimeoutBackend.ts`)
8. BullMQ backend (`src/lib/tasks/backends/bullmqBackend.ts`)

### Phase 3: Orchestration

9. TaskExecutor - run engine (`src/lib/tasks/taskExecutor.ts`)
10. TaskManager - main orchestrator (`src/lib/tasks/taskManager.ts`)
11. Integration into NeuroLink class (`src/lib/neurolink.ts`)

### Phase 4: Tools & CLI

12. Built-in agent tools (`src/lib/tasks/tools/taskTools.ts`)
13. Register tools in directAgentTools
14. CLI commands (`src/cli/commands/task.ts`)

### Phase 5: Types & Exports

15. Export types from `src/lib/types/index.ts`
16. Export TaskManager from main SDK entry point

---

## Dependencies

| Package  | Purpose                 | Required By               |
| -------- | ----------------------- | ------------------------- |
| `bullmq` | Production job queue    | BullMQ backend            |
| `croner` | Cron expression parsing | NodeTimeout backend       |
| `nanoid` | Task/Run ID generation  | Core (already in project) |

`bullmq` is the only new required dependency. `croner` is lightweight (~5KB) for cron parsing in the NodeTimeout backend. `ioredis` is a peer dependency of `bullmq`.

---

## Security Considerations

- **BullMQ mode:** Task prompts are stored in Redis. Use Redis AUTH and TLS in production.
- **NodeTimeout mode:** Task prompts are stored in plaintext JSON files on disk. Manage file permissions appropriately.
- Built-in tools respect NeuroLink's existing HITL (Human-In-The-Loop) manager if configured.
- Task creation via AI tools can be disabled: `tools: false` in task config, or globally via `shouldDisableBuiltinTools()`.
- Callbacks (`onSuccess`, `onError`) execute in the same process — do not pass untrusted code.

---

## Comparison with OpenClaw

| Feature             | NeuroLink TaskManager                                | OpenClaw Cron                           |
| ------------------- | ---------------------------------------------------- | --------------------------------------- |
| Scheduling          | Cron, interval, one-shot                             | Cron, interval, one-shot                |
| Execution modes     | Isolated, Continuation                               | Main, Isolated, Current, Custom session |
| Backend             | BullMQ (default), NodeTimeout                        | In-process scheduler                    |
| Persistence         | Redis (BullMQ) or files (NodeTimeout), auto-selected | JSON file                               |
| Delivery            | Callbacks, events                                    | Announce (Slack/Telegram), Webhook      |
| AI self-scheduling  | Built-in tools                                       | System events                           |
| SDK API             | First-class                                          | Gateway API only                        |
| CLI                 | Yes                                                  | Yes                                     |
| Restart survival    | Yes (BullMQ)                                         | Yes (file-based)                        |
| Extensible backends | Yes (Factory + Registry)                             | No                                      |

---

## Example: Multi-Step Workflow via Continuation Tasks

A continuation-mode task can drive an autonomous multi-step workflow. The AI remembers where it left off and progresses through steps on each run.

### Feature Implementation Workflow

This example automates: write doc → review → revise → implement → create PR → resolve comments → push.

```typescript
const featureWorkflow = await neurolink.tasks.create({
  name: "implement-user-auth",
  prompt: `You are implementing a feature: "Add user authentication".

Your workflow steps are:
1. Write a technical design doc (save to docs/auth-design.md)
2. Review the doc for completeness, edge cases, security concerns
3. Make revisions based on your review
4. Implement the code changes based on the final doc
5. Create a PR via GitHub MCP tools
6. Check PR for review comments
7. Address each comment, push fixes, repeat step 6-7 until resolved

Rules:
- Complete ONE step per run. State which step you just finished and which is next.
- Use tools (readFile, writeFile, github) as needed.
- If blocked, explain why and what you need.

Begin from where you left off. Check your previous messages to determine current step.`,
  schedule: { type: "interval", every: 5 * 60 * 1000 }, // Every 5 minutes
  mode: "continuation", // AI remembers all previous runs
  provider: "anthropic",
  model: "claude-sonnet-4-6",
  tools: true, // Enable file ops, GitHub MCP, etc.
  maxRuns: 20, // Safety limit
  onSuccess: (result) => {
    console.log(`[Step completed] ${result.output?.slice(0, 200)}`);
    // Stop early if the AI signals completion
    if (result.output?.includes("ALL STEPS COMPLETE")) {
      neurolink.tasks.pause(result.taskId);
    }
  },
});
```

**How it plays out:**

| Run | AI Behavior                                                                            |
| --- | -------------------------------------------------------------------------------------- |
| 1   | Writes `docs/auth-design.md` using `writeFile` tool. "Step 1 complete. Next: review."  |
| 2   | Reads the doc, identifies gaps. "Step 2 complete: found 3 issues. Next: revise."       |
| 3   | Rewrites sections. "Step 3 complete. Doc is ready. Next: implement."                   |
| 4   | Reads doc, writes code across multiple files. "Step 4 complete. Next: create PR."      |
| 5   | Uses GitHub MCP to create PR. "Step 5 complete. PR #42 created. Next: check comments." |
| 6   | Reads PR comments via GitHub MCP. "2 comments found. Next: address them."              |
| 7   | Pushes fixes, re-checks. "All comments resolved. ALL STEPS COMPLETE."                  |
| —   | `onSuccess` callback detects completion, pauses the task.                              |

Because this is `continuation` mode, the AI has full context of every previous run — it knows what it wrote, what was reviewed, and what comments were left. No external state management needed.

### CLI Equivalent

```bash
neurolink task create \
  --name "implement-user-auth" \
  --prompt "You are implementing a feature: 'Add user authentication'. ..." \
  --every 5m \
  --mode continuation \
  --provider anthropic \
  --model claude-sonnet-4-6 \
  --max-runs 20
```

---

## Existing Code Impact

TaskManager is implemented as a **new module** (`src/lib/tasks/`). Minimal changes to existing code:

| Existing File                  | Change                              | Lines |
| ------------------------------ | ----------------------------------- | ----- |
| `src/lib/neurolink.ts`         | Add `tasks` getter property         | ~10   |
| `src/lib/types/index.ts`       | Re-export task types                | ~2    |
| `src/lib/agent/directTools.ts` | Import and spread task tools        | ~3    |
| `src/cli/index.ts`             | Register `task` CLI command         | ~1    |
| `package.json`                 | Add `bullmq`, `croner` dependencies | ~2    |

Everything else is **new files** in `src/lib/tasks/`. No refactoring, no restructuring of existing code.

---

## FAQ

**Q: Do I need Redis to use TaskManager?**
A: No. Set `backend: "node-timeout"` for a zero-dependency setup. Redis is only required for the BullMQ backend (the default). When using BullMQ, Redis stores both job scheduling state and task definitions/run logs — no file I/O at all.

**Q: Will tasks stay in Redis forever?**
A: No. Active/paused tasks persist as long as they're running. Once a task reaches a terminal state (completed, failed, cancelled), it auto-expires based on `taskRetention` config — defaults: 30 days for completed, 7 days for failed/cancelled. Run logs are capped at `maxRunLogs` (default 2000) per task via `LTRIM`, and individual entries can have a TTL. You can also manually delete tasks via `tasks.delete()` or `neurolink task delete`.

**Q: Can the AI schedule tasks without user intervention?**
A: Yes. The built-in `createTask` tool allows the AI to self-schedule tasks during any conversation. If HITL is enabled, the user will be prompted for approval.

**Q: How does continuation mode handle growing context?**
A: It uses NeuroLink's existing context compaction system. When conversation history exceeds the model's context budget, BudgetChecker triggers automatic summarization.

**Q: Can I use TaskManager in a serverless environment?**
A: The BullMQ backend works in serverless with a persistent Redis instance — no local filesystem needed. The NodeTimeout backend requires a long-running process with filesystem access.

**Q: What happens when I switch backends?**
A: Tasks stored in Redis (BullMQ) and tasks stored on disk (NodeTimeout) are independent. Switching backends does not migrate data. If you need to migrate, use `tasks.list()` on the old backend and `tasks.create()` on the new one.

**Q: How do I monitor task health?**
A: Use `neurolink.tasks.list()` / `neurolink task list` for status overview, `neurolink.tasks.runs(taskId)` / `neurolink task logs <id>` for run history, and subscribe to `task:*` events for real-time monitoring.
