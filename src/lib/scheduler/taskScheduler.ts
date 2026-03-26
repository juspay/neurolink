/**
 * Simple Task Scheduler
 *
 * Single-file scheduler using BullMQ (with Node.js fallback).
 * Providers handle the backend-specific implementations.
 */

import { logger } from "../utils/logger.js";
import type {
  Schedule,
  ScheduledTask,
  TaskRun,
  CreateTaskOptions,
  TaskExecutor,
  TaskExecutorCallback,
} from "./types.js";
import {
  type BullMQProvider,
  type FallbackTimer,
  initBullMQ,
  scheduleBullMQ,
  removeFromBullMQ,
  persistTaskConfig,
  loadTaskConfig,
  deleteTaskConfig,
  persistTaskRuns,
  loadTaskRuns,
  deleteTaskRuns,
  clearAllTaskData,
  scheduleTimer,
  stopTimer,
  stopAllTimers,
} from "./providers/index.js";
import {
  getToolsForCategory,
  getSchedulerTools,
  setTaskSchedulerRef,
} from "../agent/directTools.js";
import type { TaskSchedulerConfig } from "./types.js";

/**
 * Default system prompt for scheduled task execution.
 * Forces AI to actually CALL tools, not just describe what it would do.
 */
export const DEFAULT_SCHEDULER_SYSTEM_PROMPT =
  "You are an AI assistant with TOOL ACCESS. You have tools: writeFile, readFile, listDirectory, and others.\n\n" +
  "MANDATORY RULE - YOU MUST FOLLOW:\n" +
  "When asked to write, append, read, or modify a file, YOU MUST CALL THE TOOL. " +
  "DO NOT write text saying you did it. DO NOT describe the action. " +
  "ACTUALLY INVOKE THE TOOL FUNCTION.\n\n" +
  "WRONG: 'I have appended the content to hello.txt' (just text, no action)\n" +
  "RIGHT: Call writeFile tool with path='hello.txt' and content='...'\n\n" +
  "IF YOU DO NOT CALL THE TOOL, THE TASK FAILS. CALL THE TOOL NOW.";

/**
 * Get Redis URL from config or environment variables.
 */
export function getSchedulerRedisUrl(schedulerConfig?: {
  redisConfig?: { url?: string };
}): string | undefined {
  return (
    schedulerConfig?.redisConfig?.url ||
    process.env.REDIS_URL ||
    (process.env.REDIS_HOST
      ? `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || "6379"}`
      : undefined)
  );
}

/**
 * Default options for task executor.
 */
export interface TaskExecutorDefaults {
  defaultProvider?: string;
  defaultModel?: string;
  systemPrompt?: string;
  tools?: Record<string, unknown>;
}

/**
 * Create default executor options with provided tools.
 */
export function createExecutorDefaults(
  tools: Record<string, unknown>,
  overrides?: Partial<TaskExecutorDefaults>,
): TaskExecutorDefaults {
  return {
    defaultProvider: overrides?.defaultProvider ?? "litellm",
    defaultModel: overrides?.defaultModel ?? "kimi-latest",
    systemPrompt: overrides?.systemPrompt ?? DEFAULT_SCHEDULER_SYSTEM_PROMPT,
    tools,
  };
}

/**
 * Generate function type for task execution.
 */
export type GenerateFunction = (options: {
  input: { text: string };
  systemPrompt?: string;
  provider?: string;
  model?: string;
  sessionId?: string;
  maxSteps?: number;
  tools?: Record<string, unknown>;
}) => Promise<{ content?: string }>;

/**
 * Create and configure a TaskScheduler with all dependencies.
 * Factory function that encapsulates scheduler initialization.
 */
export async function createAndConfigureScheduler(
  generateFn: GenerateFunction,
  schedulerConfig?: TaskSchedulerConfig,
): Promise<TaskScheduler | undefined> {
  try {
    const scheduler = new TaskScheduler(getSchedulerRedisUrl(schedulerConfig));

    const tools = getToolsForCategory("all");
    const schedulerTools = getSchedulerTools();

    await scheduler.setExecutorCallback(
      async (prompt, options) => {
        const result = await generateFn({
          input: { text: prompt },
          systemPrompt: options.systemPrompt,
          provider: options.provider,
          model: options.model,
          sessionId: options.sessionId,
          maxSteps: 5,
          tools: options.tools,
        });
        return { content: result.content };
      },
      createExecutorDefaults(
        { ...tools, ...schedulerTools },
        {
          defaultProvider: schedulerConfig?.defaultProvider,
          defaultModel: schedulerConfig?.defaultModel,
        },
      ),
    );

    setTaskSchedulerRef(scheduler);
    logger.debug(
      "[TaskScheduler] Scheduler created and configured successfully",
    );

    return scheduler;
  } catch (error) {
    logger.warn(
      "[TaskScheduler] Failed to create scheduler; continuing without scheduler",
      { error: error instanceof Error ? error.message : String(error) },
    );
    return undefined;
  }
}

export class TaskScheduler {
  private tasks = new Map<string, ScheduledTask>();
  private callbacks = new Map<string, () => Promise<void>>();
  private running = new Set<string>();
  private executor?: TaskExecutor;

  // Provider instances
  private bullmq: BullMQProvider | null = null;
  private timers = new Map<string, FallbackTimer>();

  // Init promise
  private initReady?: Promise<void>;

  constructor(redisUrl?: string) {
    this.initReady = this.initProviders(redisUrl).catch(() => undefined);
  }

  /**
   * Initialize providers (BullMQ with Redis, or timer fallback)
   */
  private async initProviders(redisUrl?: string): Promise<void> {
    const url =
      redisUrl ||
      process.env.REDIS_URL ||
      `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || "6379"}`;

    // Try BullMQ first
    this.bullmq = await initBullMQ(url, (taskId) => this.handleJob(taskId));

    if (!this.bullmq) {
      logger.warn("[Scheduler] Redis unavailable, using Node.js timers");
    }
  }

  /**
   * Handle a job from BullMQ worker
   */
  private async handleJob(taskId: string): Promise<void> {
    logger.info(`[Scheduler] Worker processing job for task ${taskId}`);

    // If task not in memory, try to restore from Redis
    if (!this.tasks.has(taskId) && this.bullmq) {
      const task = await loadTaskConfig(this.bullmq.redisClient, taskId);
      if (task) {
        const runs = await loadTaskRuns(this.bullmq.redisClient, taskId);
        task.runs = runs;
        this.tasks.set(taskId, task);
        this.callbacks.set(taskId, () => this.execute(taskId));
        logger.info(`[Scheduler] Restored task ${taskId} from Redis`);
      }
    }

    const callback = this.callbacks.get(taskId);
    if (callback) {
      logger.info(
        `[Scheduler] Found callback for task ${taskId}, executing...`,
      );
      await callback();
    } else {
      logger.warn(`[Scheduler] No callback found for task ${taskId}`);
    }
  }

  /**
   * Set the executor function that runs tasks.
   * Also syncs with existing BullMQ jobs if using Redis.
   */
  async setExecutor(executor: TaskExecutor): Promise<void> {
    this.executor = executor;

    // Sync with existing BullMQ jobs (in case of restart)
    if (this.bullmq) {
      await this.syncWithBullMQ();
    }
  }

  /**
   * Set a simplified executor callback.
   * TaskScheduler handles prompt building, context, and session management.
   */
  async setExecutorCallback(
    generateFn: TaskExecutorCallback,
    options?: {
      defaultProvider?: string;
      defaultModel?: string;
      systemPrompt?: string;
      tools?: Record<string, unknown>;
    },
  ): Promise<void> {
    this.executor = async (task, sessionId) => {
      // Guard against empty prompts
      if (!task.prompt || task.prompt.trim() === "") {
        logger.error(
          `[TaskExecutor] Task ${task.id} has empty prompt - skipping`,
        );
        return { response: "Error: Task has empty prompt" };
      }

      // Build enhanced prompt with context for same-session mode
      let enhancedPrompt = task.prompt;

      logger.info(
        `[TaskExecutor] sessionMode=${task.sessionMode}, runs.length=${task.runs.length}, prompt="${task.prompt?.substring(0, 50)}..."`,
      );

      if (task.sessionMode === "same-session" && task.runs.length > 1) {
        const previousRuns = task.runs.slice(1, 4);
        if (previousRuns.length > 0) {
          const contextParts = [
            "=== PREVIOUS RUN CONTEXT ===",
            ...previousRuns.map((run, index) => {
              const lines = [
                `Run #${index + 1} (${new Date(run.startedAt).toISOString()}):`,
              ];
              if (run.status === "completed" && run.response) {
                lines.push(
                  `Result: ${run.response.substring(0, 500)}${run.response.length > 500 ? "..." : ""}`,
                );
              } else if (run.status === "failed" && run.error) {
                lines.push(`Error: ${run.error}`);
              }
              return lines.join("\n");
            }),
            "=== CURRENT TASK ===",
            task.prompt,
          ];
          enhancedPrompt = contextParts.join("\n\n");
          logger.info(
            `[TaskExecutor] Built same-session context, enhancedPrompt length=${enhancedPrompt.length}`,
          );
        }
      } else {
        logger.info(
          `[TaskExecutor] No context built - isolated mode or no previous runs`,
        );
      }

      const result = await generateFn(enhancedPrompt, {
        provider: task.provider || options?.defaultProvider,
        model: task.model || options?.defaultModel,
        sessionId,
        systemPrompt: options?.systemPrompt,
        tools: options?.tools,
      });

      return { response: result.content };
    };

    if (this.bullmq) {
      await this.syncWithBullMQ();
    }
  }

  /**
   * Sync with existing BullMQ jobs after restart
   */
  private async syncWithBullMQ(): Promise<void> {
    if (!this.bullmq) {
      return;
    }

    try {
      logger.info("[Scheduler] Syncing with BullMQ...");

      const repeatableJobs = await this.bullmq.queue.getRepeatableJobs();
      logger.info(`[Scheduler] Found ${repeatableJobs.length} repeatable jobs`);

      for (const job of repeatableJobs) {
        const taskId = job.name;
        if (this.tasks.has(taskId)) {
          continue;
        }

        // Try to load full task config from Redis
        let task = await loadTaskConfig(this.bullmq.redisClient, taskId);

        if (!task) {
          // Fallback: reconstruct from job pattern
          const schedule: Schedule = job.pattern
            ? {
                type: "cron",
                value: job.pattern,
                timezone: job.tz || undefined,
              }
            : { type: "every", value: job.every || 60000 };

          task = {
            id: taskId,
            name: taskId,
            schedule,
            prompt: "",
            sessionMode: "isolated",
            status: "active",
            runs: [],
            createdAt: Date.now(),
          };
          logger.warn(
            `[Scheduler] Task ${taskId} has no stored data - using defaults`,
          );
        } else {
          logger.info(
            `[Scheduler] Recovered full task ${taskId} from Redis, prompt: "${task.prompt?.substring(0, 50)}..."`,
          );
        }

        // Load runs from Redis
        task.runs = await loadTaskRuns(this.bullmq.redisClient, taskId);

        this.tasks.set(taskId, task);
        this.callbacks.set(taskId, () => this.execute(taskId));
        logger.info(`[Scheduler]  Synced repeatable task ${taskId}`);
      }

      const delayedJobs = await this.bullmq.queue.getDelayed();
      logger.info(`[Scheduler] Found ${delayedJobs.length} delayed jobs`);

      for (const job of delayedJobs) {
        const taskId = job.data?.taskId || job.name;
        if (!taskId || this.tasks.has(taskId)) {
          continue;
        }

        let task = await loadTaskConfig(this.bullmq.redisClient, taskId);

        if (!task && job.data?.fullTask) {
          task = job.data.fullTask as ScheduledTask;
        }

        if (!task) {
          const delayMs = job.delay || 0;
          const runAt = Date.now() + delayMs;
          task = {
            id: taskId,
            name: taskId,
            schedule: { type: "at", value: new Date(runAt).toISOString() },
            prompt: "",
            sessionMode: "isolated",
            status: "active",
            runs: [],
            createdAt: Date.now(),
          };
          logger.warn(
            `[Scheduler] Task ${taskId} has no stored data - using defaults`,
          );
        } else {
          logger.info(`[Scheduler] Recovered full task ${taskId} from Redis`);
        }

        task.runs = await loadTaskRuns(this.bullmq.redisClient, taskId);

        this.tasks.set(taskId, task);
        this.callbacks.set(taskId, () => this.execute(taskId));
        logger.info(`[Scheduler]  Synced delayed task ${taskId}`);
      }

      logger.info(
        `[Scheduler]  Sync complete, ${this.tasks.size} tasks in memory`,
      );
    } catch (err) {
      logger.error("[Scheduler]  Failed to sync with BullMQ:", err);
    }
  }

  /**
   * Create and schedule a new task
   */
  async createTask(options: CreateTaskOptions): Promise<ScheduledTask> {
    const task: ScheduledTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: options.name || `Task ${Date.now()}`,
      schedule: options.schedule,
      prompt: options.prompt,
      sessionMode: options.sessionMode || "isolated",
      provider: options.provider,
      model: options.model,
      maxRuns: options.maxRuns,
      status: "active",
      runs: [],
      createdAt: Date.now(),
    };

    // Validate interval
    if (task.schedule.type === "every") {
      const ms = parseInterval(String(task.schedule.value));
      if (ms < 100) {
        throw new Error("Minimum interval is 100ms");
      }
    }

    this.tasks.set(task.id, task);
    this.callbacks.set(task.id, () => this.execute(task.id));

    // Persist to Redis if available
    if (this.bullmq) {
      await persistTaskConfig(this.bullmq.redisClient, task);
    }

    // Schedule with appropriate provider
    await this.schedule(task);

    logger.info(`[Scheduler] Created task ${task.id}`, {
      type: task.schedule.type,
      value: task.schedule.value,
    });

    return task;
  }

  /**
   * Schedule a task with the appropriate provider
   */
  private async schedule(task: ScheduledTask): Promise<void> {
    await this.initReady;

    if (this.bullmq) {
      await scheduleBullMQ(this.bullmq.queue, task);
    } else {
      scheduleTimer(task, (id) => this.execute(id), this.timers);
    }
  }

  /**
   * Execute a task
   */
  private async execute(taskId: string): Promise<void> {
    if (this.running.has(taskId)) {
      logger.warn(`[Scheduler] Task ${taskId} already running, skipping`);
      return;
    }
    this.running.add(taskId);

    try {
      const task = this.tasks.get(taskId);
      if (!task || task.status !== "active") {
        return;
      }
      if (!this.executor) {
        logger.warn("[Scheduler] No executor set");
        return;
      }

      // Check maxRuns
      if (task.maxRuns !== undefined && task.runs.length >= task.maxRuns) {
        task.status = "completed";
        await this.cancelTask(taskId);
        return;
      }

      const runNum = task.runs.length + 1;
      const run: TaskRun = {
        runId: `${taskId}-run-${runNum}`,
        startedAt: Date.now(),
        status: "running",
      };
      task.runs.unshift(run);

      const sessionId =
        task.sessionMode === "isolated"
          ? `task:${taskId}:${runNum}`
          : `task:${taskId}`;

      logger.info(
        `[Scheduler] Executing task ${taskId}, run ${runNum}, sessionMode: ${task.sessionMode}`,
      );

      try {
        const result = await this.executor(task, sessionId);
        run.status = "completed";
        run.response = result.response;
        run.completedAt = Date.now();
      } catch (err) {
        run.status = "failed";
        run.error = err instanceof Error ? err.message : String(err);
        run.completedAt = Date.now();
        logger.error(`[Scheduler] Task ${taskId} failed:`, run.error);
      }

      // Persist runs to Redis
      if (this.bullmq) {
        await persistTaskRuns(this.bullmq.redisClient, task);
      }

      // Handle one-shot completion
      if (task.schedule.type === "at") {
        task.status = run.status === "failed" ? "failed" : "completed";
      }

      // Check maxRuns reached
      if (task.maxRuns !== undefined && task.runs.length >= task.maxRuns) {
        task.status = "completed";
        await this.cancelTask(taskId);
      }
    } finally {
      this.running.delete(taskId);
    }
  }

  /**
   * Cancel a task by ID
   */
  async cancelTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = "cancelled";
    }

    if (this.bullmq) {
      await removeFromBullMQ(this.bullmq.queue, taskId);
      await deleteTaskRuns(this.bullmq.redisClient, taskId);
      await deleteTaskConfig(this.bullmq.redisClient, taskId);
    }

    stopTimer(taskId, this.timers);
    this.callbacks.delete(taskId);
    this.tasks.delete(taskId);

    return true;
  }

  /**
   * Cancel all tasks
   */
  async cancelAllTasks(): Promise<number> {
    const count = this.tasks.size;

    if (this.bullmq) {
      const repeatableJobs = await this.bullmq.queue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        await this.bullmq.queue.removeRepeatableByKey(job.key);
      }
      await this.bullmq.queue.obliterate({ force: true });
      await clearAllTaskData(this.bullmq.redisClient);
    }

    stopAllTimers(this.timers);
    this.tasks.clear();
    this.callbacks.clear();

    return count;
  }

  /**
   * Get a task by ID
   */
  getTask(taskId: string): ScheduledTask | undefined {
    const task = this.tasks.get(taskId);
    return task ? { ...task } : undefined;
  }

  /**
   * List all tasks
   */
  async listTasks(): Promise<ScheduledTask[]> {
    if (this.bullmq) {
      await this.syncWithBullMQ();
    }
    return Array.from(this.tasks.values()).map((t) => ({ ...t }));
  }

  /**
   * Force sync with BullMQ
   */
  async sync(): Promise<void> {
    await this.initReady;
    if (this.bullmq) {
      await this.syncWithBullMQ();
    }
  }

  /**
   * Shutdown scheduler
   */
  async shutdown(): Promise<void> {
    stopAllTimers(this.timers);

    if (this.bullmq) {
      await this.bullmq.worker?.close();
      await this.bullmq.queue?.close();
      await this.bullmq.redisClient?.quit();
    }

    this.tasks.clear();
    this.callbacks.clear();
  }
}

/**
 * Parse interval string to milliseconds
 */
function parseInterval(value: string): number {
  const num = Number(value);
  if (!isNaN(num) && num > 0) {
    return num;
  }

  const match = value
    .trim()
    .toLowerCase()
    .match(/^(\d+(?:\.\d+)?)\s*(s|m|h|d)$/);
  if (!match) {
    throw new Error(`Invalid interval: ${value}`);
  }

  const n = parseFloat(match[1]);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return n * multipliers[unit as keyof typeof multipliers];
}
