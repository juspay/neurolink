/**
 *  Task Scheduler Types
 *
 * Schedule types:
 * - "at": One-shot at specific time (ISO 8601)
 * - "every": Recurring interval (e.g., "5m", "1h")
 * - "cron": Cron expression (e.g., "0 9 * * *")
 */
export type ScheduleType = "at" | "every" | "cron";
export type SessionMode = "isolated" | "same-session";
export type TaskStatus = "active" | "completed" | "failed" | "cancelled";

export interface Schedule {
  type: ScheduleType;
  value: string | number;
  timezone?: string;
}

export interface TaskRun {
  runId: string;
  startedAt: number;
  completedAt?: number;
  status: "running" | "completed" | "failed";
  response?: string;
  error?: string;
}

export interface ScheduledTask {
  id: string;
  name: string;
  schedule: Schedule;
  prompt: string;
  sessionMode: SessionMode;
  provider?: string;
  model?: string;
  maxRuns?: number;
  status: TaskStatus;
  runs: TaskRun[];
  createdAt: number;
}

export interface CreateTaskOptions {
  schedule: Schedule;
  prompt: string;
  name?: string;
  sessionMode?: SessionMode;
  provider?: string;
  model?: string;
  maxRuns?: number;
}

export type TaskExecutor = (
  task: ScheduledTask,
  sessionId: string,
) => Promise<{ response?: string }>;

export type TaskExecutorCallback = (
  prompt: string,
  options: {
    provider?: string;
    model?: string;
    sessionId: string;
    systemPrompt?: string;
    tools?: Record<string, unknown>;
  },
) => Promise<{ content?: string }>;

/**
 * Scheduler configuration (for compatibility with existing code)
 */
export interface TaskSchedulerConfig {
  enabled?: boolean;
  store?: "memory" | "redis";
  maxConcurrentRuns?: number;
  maxRunHistory?: number;
  redisConfig?: {
    url?: string;
    host?: string;
    port?: number;
    password?: string;
  };
  defaultProvider?: string;
  defaultModel?: string;
}
