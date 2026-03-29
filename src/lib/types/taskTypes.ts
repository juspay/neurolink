/**
 * Type definitions for the NeuroLink TaskManager system.
 *
 * TaskManager provides scheduled and self-running task capabilities,
 * enabling AI agents to execute prompts on cron, interval, or one-shot schedules.
 */

import type { Cron } from "croner";
import type { createClient } from "redis";
import type { ThinkingLevel } from "./configTypes.js";

// ── Schedule Types ──────────────────────────────────────

export type TaskScheduleType = "cron" | "interval" | "once";

export type CronSchedule = {
  type: "cron";
  /** Standard 5-field cron expression, e.g. "0 9 * * *" */
  expression: string;
  /** IANA timezone, e.g. "America/New_York" */
  timezone?: string;
};

export type IntervalSchedule = {
  type: "interval";
  /** Interval in milliseconds */
  every: number;
};

export type OnceSchedule = {
  type: "once";
  /** ISO 8601 timestamp or Date object */
  at: Date | string;
};

export type TaskSchedule = CronSchedule | IntervalSchedule | OnceSchedule;

// ── Execution Mode ──────────────────────────────────────

/**
 * - "isolated": Each run gets a fresh context. No memory of previous runs.
 * - "continuation": Conversation history is preserved across runs.
 */
export type TaskExecutionMode = "isolated" | "continuation";

// ── Task Status ─────────────────────────────────────────

export type TaskStatus =
  | "pending"
  | "active"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

// ── Task Definition (user-provided input) ───────────────

export type TaskDefinition = {
  name: string;
  prompt: string;
  schedule: TaskSchedule;
  mode?: TaskExecutionMode;

  // Provider overrides
  provider?: string;
  model?: string;
  thinkingLevel?: ThinkingLevel;
  systemPrompt?: string;
  /** Enable/disable tools for this task. Default: true */
  tools?: boolean;
  maxTokens?: number;
  temperature?: number;

  // Execution limits
  /** Max number of executions. Omit for unlimited. */
  maxRuns?: number;
  /** Per-run timeout in ms. Default: 120000 */
  timeout?: number;

  // Retry
  retry?: {
    /** Default: 3 */
    maxAttempts?: number;
    /** Default: [30000, 60000, 300000] */
    backoffMs?: number[];
  };

  // Callbacks (SDK only — not serialized to store)
  onSuccess?: (result: TaskRunResult) => void | Promise<void>;
  onError?: (error: TaskRunError) => void | Promise<void>;
  /** Called when task reaches a terminal state (completed, failed, cancelled) */
  onComplete?: (task: Task) => void | Promise<void>;

  metadata?: Record<string, unknown>;
};

// ── Task (internal, stored representation) ──────────────

export type Task = {
  id: string;
  name: string;
  prompt: string;
  schedule: TaskSchedule;
  mode: TaskExecutionMode;
  status: TaskStatus;

  // Provider overrides
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
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
  updatedAt: string;

  /** Conversation session ID for continuation mode */
  sessionId?: string;

  metadata?: Record<string, unknown>;
};

/** Shape of the tasks.json file used by FileTaskStore */
export type TasksFile = {
  version: number;
  tasks: Record<string, Task>;
};

// ── Run Results ─────────────────────────────────────────

export type TaskRunResult = {
  taskId: string;
  runId: string;
  status: "success" | "error";
  /** AI response text */
  output?: string;
  toolCalls?: Array<{
    name: string;
    input: unknown;
    output: unknown;
  }>;
  tokensUsed?: { input: number; output: number };
  durationMs: number;
  /** ISO 8601 */
  timestamp: string;
  error?: string;
};

export type TaskRunError = {
  taskId: string;
  runId: string;
  error: string;
  attempt: number;
  maxAttempts: number;
  willRetry: boolean;
  /** ISO 8601 */
  timestamp: string;
};

// ── Task Store Interface ────────────────────────────────

/**
 * Abstracts task persistence. Auto-selected based on backend:
 * - BullMQ → RedisTaskStore
 * - NodeTimeout → FileTaskStore
 */
export interface TaskStore {
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

  // Continuation mode conversation history
  appendHistory(taskId: string, messages: ConversationEntry[]): Promise<void>;
  getHistory(taskId: string): Promise<ConversationEntry[]>;
  clearHistory(taskId: string): Promise<void>;
}

// ── Continuation Mode Types ─────────────────────────────

export type ConversationEntry = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

// ── Task Backend Interface ──────────────────────────────

export type TaskExecutorFn = (task: Task) => Promise<TaskRunResult>;

/**
 * Abstracts the scheduling/looping mechanism.
 * Implementations: BullMQ (production), NodeTimeout (development).
 */
export interface TaskBackend {
  readonly name: string;

  initialize(): Promise<void>;
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

// ── Redis Store Types ───────────────────────────────────

/** Redis client type used by RedisTaskStore */
export type RedisClient = ReturnType<typeof createClient>;

// ── Executor Types ──────────────────────────────────────

/** Minimal interface for the NeuroLink SDK methods needed by TaskExecutor */
export type NeuroLinkExecutable = {
  generate(optionsOrPrompt: unknown): Promise<{
    content: string;
    toolExecutions?: Array<{ name: string; input: unknown; output: unknown }>;
    usage?: {
      input?: number;
      output?: number;
    };
  }>;
};

// ── Node Timeout Backend Types ──────────────────────────

/** Internal scheduling entry used by NodeTimeoutBackend */
export type ScheduledEntry = {
  taskId: string;
  executor: TaskExecutorFn;
  task: Task;
  // One of these will be set depending on schedule type
  cronJob?: Cron;
  intervalId?: ReturnType<typeof setInterval>;
  timeoutId?: ReturnType<typeof setTimeout>;
};

// ── Task Backend Factory Types ──────────────────────────

export type TaskBackendName = "bullmq" | "node-timeout";

export type TaskBackendFactoryFn = (
  config: TaskManagerConfig,
) => Promise<TaskBackend>;

// ── TaskManager Config ──────────────────────────────────

export type TaskRetentionConfig = {
  /** Auto-delete completed tasks after N ms. Default: 30 days */
  completedTTL?: number;
  /** Auto-delete failed tasks after N ms. Default: 7 days */
  failedTTL?: number;
  /** Auto-delete cancelled tasks after N ms. Default: 7 days */
  cancelledTTL?: number;
  /** Auto-expire individual run log entries after N ms. Default: 30 days */
  runLogTTL?: number;
};

export type TaskManagerConfig = {
  /** Default: true */
  enabled?: boolean;
  /** Default: "bullmq" */
  backend?: TaskBackendName;

  // BullMQ / RedisTaskStore config
  redis?: {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    /** Alternative: full Redis URL */
    url?: string;
  };

  // FileTaskStore config (only used when backend is "node-timeout")
  /** Default: ".neurolink/tasks/tasks.json" */
  storePath?: string;
  /** Default: ".neurolink/tasks/runs/" */
  logsPath?: string;

  // Limits
  /** Maximum number of tasks that can exist at once. Default: 100 */
  maxTasks?: number;
  /** Default: 5 */
  maxConcurrentRuns?: number;
  /** Max run log entries per task. Default: 2000 */
  maxRunLogs?: number;
  /** Max continuation history entries per task. Default: 200 (100 exchanges) */
  maxHistoryEntries?: number;

  // Retention (prevents storage from growing forever)
  taskRetention?: TaskRetentionConfig;
};

// ── Defaults ────────────────────────────────────────────

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const TASK_DEFAULTS = {
  enabled: true,
  maxTasks: 100,
  backend: "bullmq" as TaskBackendName,
  mode: "isolated" as TaskExecutionMode,
  timeout: 120_000,
  maxConcurrentRuns: 5,
  maxRunLogs: 2000,
  maxHistoryEntries: 200,
  tools: true,
  retry: {
    maxAttempts: 3,
    backoffMs: [30_000, 60_000, 300_000],
  },
  storePath: ".neurolink/tasks/tasks.json",
  logsPath: ".neurolink/tasks/runs/",
  redis: {
    host: "localhost",
    port: 6379,
  },
  retention: {
    completedTTL: THIRTY_DAYS_MS,
    failedTTL: SEVEN_DAYS_MS,
    cancelledTTL: SEVEN_DAYS_MS,
    runLogTTL: THIRTY_DAYS_MS,
  },
} as const;

// ── CLI Worker Types ───────────────────────────────────

/** State persisted by the CLI task worker daemon */
export type WorkerState = {
  pid: number;
  startedAt: string;
  logFile: string;
};
