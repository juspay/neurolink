/**
 * TaskManager — Main orchestrator for scheduled and self-running tasks.
 *
 * Manages the full task lifecycle: create, schedule, execute, pause, resume, delete.
 * Auto-selects TaskStore and TaskBackend based on config.
 *
 * Usage:
 *   const neurolink = new NeuroLink({ tasks: { backend: "bullmq" } });
 *   await neurolink.tasks.create({ name: "monitor", prompt: "...", schedule: { type: "interval", every: 60000 } });
 */

import { nanoid } from "nanoid";
import {
  type NeuroLinkExecutable,
  TASK_DEFAULTS,
  type Task,
  type TaskBackend,
  type TaskDefinition,
  type TaskManagerConfig,
  type TaskRunResult,
  type TaskStatus,
  type TaskStore,
} from "../types/taskTypes.js";
import { logger } from "../utils/logger.js";
import { clearWorkerCache } from "./autoresearchTaskExecutor.js";
import { TaskBackendRegistry } from "./backends/taskBackendRegistry.js";
import { TaskError } from "./errors.js";
import { TaskExecutor } from "./taskExecutor.js";

export class TaskManager {
  private config: TaskManagerConfig;
  private store: TaskStore | null = null;
  private backend: TaskBackend | null = null;
  private executor: TaskExecutor | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  /** In-memory callback registry (not serializable to store) */
  private callbacks = new Map<
    string,
    {
      onSuccess?: TaskDefinition["onSuccess"];
      onError?: TaskDefinition["onError"];
      onComplete?: TaskDefinition["onComplete"];
    }
  >();

  /** Emitter reference — set by NeuroLink on integration */
  private emitter?: {
    emit(event: string, ...args: unknown[]): boolean;
  };

  constructor(
    private neurolink: NeuroLinkExecutable,
    config?: TaskManagerConfig,
  ) {
    this.config = { ...config };
  }

  /** Set the event emitter (called by NeuroLink during integration) */
  setEmitter(emitter: {
    emit(event: string, ...args: unknown[]): boolean;
  }): void {
    this.emitter = emitter;
  }

  // ── Initialization ──────────────────────────────────────

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }
    if (this.initPromise) {
      return this.initPromise;
    }
    this.initPromise = this.doInitialize();
    await this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    const backendName = this.config.backend ?? TASK_DEFAULTS.backend;

    // Create store based on backend
    if (backendName === "bullmq") {
      const { RedisTaskStore } = await import("./store/redisTaskStore.js");
      this.store = new RedisTaskStore(this.config);
    } else {
      const { FileTaskStore } = await import("./store/fileTaskStore.js");
      this.store = new FileTaskStore(this.config);
    }

    await this.store.initialize();

    // Create backend
    this.backend = await TaskBackendRegistry.create(backendName, this.config);
    await this.backend.initialize();

    // Create executor (pass emitter for autoresearch lifecycle events)
    this.executor = new TaskExecutor(this.neurolink, this.store, this.emitter);

    // Re-schedule active tasks from store (handles restarts)
    await this.rescheduleActiveTasks();

    this.initialized = true;
    logger.info("[TaskManager] Initialized", {
      backend: backendName,
      store: this.store.type,
    });
  }

  private getStore(): TaskStore {
    if (!this.store) {
      throw TaskError.create(
        "BACKEND_NOT_INITIALIZED",
        "[TaskManager] Store not initialized. Call initialize() first.",
      );
    }

    return this.store;
  }

  private getBackend(): TaskBackend {
    if (!this.backend) {
      throw TaskError.create(
        "BACKEND_NOT_INITIALIZED",
        "[TaskManager] Backend not initialized. Call initialize() first.",
      );
    }

    return this.backend;
  }

  private getExecutor(): TaskExecutor {
    if (!this.executor) {
      throw TaskError.create(
        "BACKEND_NOT_INITIALIZED",
        "[TaskManager] Executor not initialized. Call initialize() first.",
      );
    }

    return this.executor;
  }

  // ── Public API ────────────────────────────────────────

  async create(definition: TaskDefinition): Promise<Task> {
    if (this.config.enabled === false) {
      throw TaskError.create(
        "TASK_DISABLED",
        "TaskManager is disabled. Set tasks.enabled to true in config.",
      );
    }

    await this.ensureInitialized();
    const store = this.getStore();
    const backend = this.getBackend();

    // Enforce maximum task limit to prevent unbounded task creation
    const maxTasks = this.config.maxTasks ?? TASK_DEFAULTS.maxTasks;
    const existingTasks = await store.list();
    if (existingTasks.length >= maxTasks) {
      throw TaskError.create(
        "TASK_LIMIT_REACHED",
        `Task limit reached (${maxTasks}). Delete existing tasks or increase maxTasks config.`,
      );
    }

    const now = new Date().toISOString();

    // Autoresearch validation
    const taskType = definition.type ?? "standard";
    if (taskType === "autoresearch") {
      const ar = definition.autoresearch;
      if (!ar) {
        throw TaskError.create(
          "TASK_VALIDATION_FAILED",
          'Tasks with type "autoresearch" require an autoresearch config.',
        );
      }
      if (
        !ar.repoPath ||
        !ar.runCommand ||
        !ar.mutablePaths?.length ||
        !ar.metric
      ) {
        throw TaskError.create(
          "TASK_VALIDATION_FAILED",
          "Autoresearch config must include repoPath, runCommand, mutablePaths (non-empty), and metric.",
        );
      }
    }
    // Reject autoresearch config on non-autoresearch tasks
    if (definition.autoresearch && taskType !== "autoresearch") {
      throw TaskError.create(
        "TASK_VALIDATION_FAILED",
        'Tasks with autoresearch config must have type "autoresearch".',
      );
    }

    const task: Task = {
      id: `task_${nanoid(12)}`,
      name: definition.name,
      prompt: definition.prompt,
      schedule: definition.schedule,
      mode: definition.mode ?? TASK_DEFAULTS.mode,
      type: taskType,
      status: "active",
      tools: definition.tools ?? TASK_DEFAULTS.tools,
      timeout: definition.timeout ?? TASK_DEFAULTS.timeout,
      retry: {
        maxAttempts:
          definition.retry?.maxAttempts ?? TASK_DEFAULTS.retry.maxAttempts,
        backoffMs: definition.retry?.backoffMs ?? [
          ...TASK_DEFAULTS.retry.backoffMs,
        ],
      },
      runCount: 0,
      createdAt: now,
      updatedAt: now,

      // Optional overrides
      ...(definition.provider ? { provider: definition.provider } : {}),
      ...(definition.model ? { model: definition.model } : {}),
      ...(definition.thinkingLevel
        ? { thinkingLevel: definition.thinkingLevel }
        : {}),
      ...(definition.systemPrompt
        ? { systemPrompt: definition.systemPrompt }
        : {}),
      ...(definition.maxTokens ? { maxTokens: definition.maxTokens } : {}),
      ...(definition.temperature !== undefined
        ? { temperature: definition.temperature }
        : {}),
      ...(definition.maxRuns !== undefined
        ? { maxRuns: definition.maxRuns }
        : {}),
      ...(definition.metadata ? { metadata: definition.metadata } : {}),
      ...(definition.autoresearch
        ? { autoresearch: definition.autoresearch }
        : {}),
    };

    // Generate session ID for continuation mode
    if (task.mode === "continuation") {
      task.sessionId = `session_${nanoid(12)}`;
    }

    // Save to store
    await store.save(task);

    // Register callbacks (in-memory only)
    if (definition.onSuccess || definition.onError || definition.onComplete) {
      this.callbacks.set(task.id, {
        onSuccess: definition.onSuccess,
        onError: definition.onError,
        onComplete: definition.onComplete,
      });
    }

    // Schedule
    try {
      await backend.schedule(task, (t) => this.onTaskTick(t));
    } catch (err) {
      this.callbacks.delete(task.id);
      try {
        await store.delete(task.id);
      } catch (cleanupError) {
        // Deletion failed — task remains persisted as active. Attempt to mark it
        // failed so it reaches a terminal state and operators can identify it.
        logger.error(
          "[TaskManager] Failed to clean up task after schedule error — task may remain persisted as active",
          {
            taskId: task.id,
            scheduleError: String(err),
            cleanupError: String(cleanupError),
          },
        );
        try {
          await store.update(task.id, { status: "failed" as TaskStatus });
        } catch (terminalError) {
          logger.error(
            "[TaskManager] Failed to force task to terminal state — manual cleanup required",
            {
              taskId: task.id,
              error: String(terminalError),
            },
          );
        }
      }
      throw err;
    }

    this.emit("task:created", task);
    logger.info("[TaskManager] Task created", {
      taskId: task.id,
      name: task.name,
      schedule: task.schedule.type,
      mode: task.mode,
    });

    return task;
  }

  async get(taskId: string): Promise<Task | null> {
    await this.ensureInitialized();
    return this.getStore().get(taskId);
  }

  async list(filter?: { status?: TaskStatus }): Promise<Task[]> {
    await this.ensureInitialized();
    return this.getStore().list(filter);
  }

  async update(
    taskId: string,
    updates: Partial<TaskDefinition>,
  ): Promise<Task> {
    await this.ensureInitialized();
    const store = this.getStore();
    const backend = this.getBackend();

    const existing = await store.get(taskId);
    if (!existing) {
      throw TaskError.create("TASK_NOT_FOUND", `Task not found: ${taskId}`);
    }

    // Apply allowed scalar updates via whitelist
    const ALLOWED_UPDATE_FIELDS = [
      "name",
      "prompt",
      "schedule",
      "mode",
      "provider",
      "model",
      "systemPrompt",
      "maxTokens",
      "temperature",
      "timeout",
      "tools",
      "maxRuns",
      "metadata",
      "thinkingLevel",
    ] as const;

    const taskUpdates: Partial<Task> = {};
    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (updates[field] !== undefined) {
        (taskUpdates as Record<string, unknown>)[field] = updates[field];
      }
    }

    const shouldClearHistory =
      updates.mode !== undefined && updates.mode !== "continuation";

    // Special-case: mode changes require sessionId handling
    if (updates.mode !== undefined) {
      if (updates.mode === "continuation" && !existing.sessionId) {
        taskUpdates.sessionId = `session_${nanoid(12)}`;
      } else if (updates.mode !== "continuation") {
        taskUpdates.sessionId = undefined;
      }
    }

    const updated = await store.update(taskId, taskUpdates);

    // Re-schedule if schedule changed and task is active
    if (updates.schedule && updated.status === "active") {
      const attemptedSchedule = updated.schedule;
      await backend.cancel(taskId);
      try {
        await backend.schedule(updated, (t) => this.onTaskTick(t));
      } catch (error) {
        await this.restoreScheduledTask(existing, "update schedule rollback");
        await this.rollbackTaskUpdate(taskId, existing, error);
        throw TaskError.create(
          "SCHEDULE_FAILED",
          `Failed to update schedule for task ${taskId}`,
          {
            cause: error instanceof Error ? error : undefined,
            details: {
              taskId,
              previousSchedule: existing.schedule,
              attemptedSchedule,
            },
          },
        );
      }
    }

    if (shouldClearHistory) {
      try {
        await store.clearHistory(taskId);
      } catch (error) {
        logger.warn(
          "[TaskManager] Failed to clear task history after mode update",
          {
            taskId,
            error: String(error),
          },
        );
      }
    }

    return updated;
  }

  /** Run a task immediately (outside of its schedule) */
  async run(taskId: string): Promise<TaskRunResult> {
    await this.ensureInitialized();

    const task = await this.getStore().get(taskId);
    if (!task) {
      throw TaskError.create("TASK_NOT_FOUND", `Task not found: ${taskId}`);
    }

    return this.onTaskTick(task);
  }

  async pause(taskId: string): Promise<Task> {
    await this.ensureInitialized();
    const store = this.getStore();
    const backend = this.getBackend();

    const task = await store.get(taskId);
    if (!task) {
      throw TaskError.create("TASK_NOT_FOUND", `Task not found: ${taskId}`);
    }
    if (task.status !== "active") {
      throw TaskError.create(
        "INVALID_TASK_STATUS",
        `Cannot pause task with status: ${task.status}`,
      );
    }

    await backend.pause(taskId);

    let updated: Task;
    try {
      updated = await store.update(taskId, { status: "paused" });
    } catch (error) {
      await this.restoreScheduledTask(task, "pause rollback");
      throw error;
    }

    this.emit("task:paused", updated);
    return updated;
  }

  async resume(taskId: string): Promise<Task> {
    await this.ensureInitialized();
    const store = this.getStore();
    const backend = this.getBackend();

    const task = await store.get(taskId);
    if (!task) {
      throw TaskError.create("TASK_NOT_FOUND", `Task not found: ${taskId}`);
    }
    if (task.status !== "paused") {
      throw TaskError.create(
        "INVALID_TASK_STATUS",
        `Cannot resume task with status: ${task.status}`,
      );
    }

    const updated = await store.update(taskId, { status: "active" });

    try {
      await backend.schedule(updated, (t) => this.onTaskTick(t));
    } catch (error) {
      await this.rollbackTaskUpdate(taskId, task, error);
      throw TaskError.create(
        "SCHEDULE_FAILED",
        `Failed to resume task ${taskId}`,
        {
          cause: error instanceof Error ? error : undefined,
          details: { taskId, schedule: task.schedule },
        },
      );
    }

    this.emit("task:resumed", updated);
    return updated;
  }

  async delete(taskId: string): Promise<void> {
    await this.ensureInitialized();
    const backend = this.getBackend();
    const store = this.getStore();

    await backend.cancel(taskId);
    await store.delete(taskId);
    this.callbacks.delete(taskId);

    this.emit("task:deleted", taskId);
  }

  async runs(
    taskId: string,
    options?: { limit?: number; status?: string },
  ): Promise<TaskRunResult[]> {
    await this.ensureInitialized();
    return this.getStore().getRuns(taskId, options);
  }

  async shutdown(): Promise<void> {
    if (this.backend) {
      await this.backend.shutdown();
    }
    if (this.store) {
      await this.store.shutdown();
    }
    this.callbacks.clear();
    clearWorkerCache();
    this.initialized = false;
    this.initPromise = null;
    logger.info("[TaskManager] Shut down");
  }

  /** Check if the backend is healthy */
  async isHealthy(): Promise<boolean> {
    if (!this.backend) {
      return false;
    }
    return this.backend.isHealthy();
  }

  // ── Internal ──────────────────────────────────────────

  private async restoreScheduledTask(
    task: Task,
    reason: string,
  ): Promise<void> {
    if (task.status !== "active") {
      return;
    }

    try {
      await this.getBackend().schedule(task, (t) => this.onTaskTick(t));
      logger.warn("[TaskManager] Restored task schedule after rollback", {
        taskId: task.id,
        reason,
      });
    } catch (restoreError) {
      logger.error(
        "[TaskManager] Failed to restore task schedule during rollback",
        {
          taskId: task.id,
          reason,
          error: String(restoreError),
        },
      );
    }
  }

  private async rollbackTaskUpdate(
    taskId: string,
    previousTask: Task,
    error: unknown,
  ): Promise<Task> {
    try {
      return await this.getStore().update(taskId, previousTask);
    } catch (rollbackError) {
      logger.error(
        "[TaskManager] Failed to roll back task update — store and in-memory state may be diverged; manual reconciliation required",
        {
          taskId,
          originalError: String(error),
          rollbackError: String(rollbackError),
        },
      );
      throw rollbackError;
    }
  }

  /**
   * Called by the backend on each scheduled tick.
   * Executes the task, updates state, fires callbacks/events.
   */
  private async onTaskTick(task: Task): Promise<TaskRunResult> {
    this.emit("task:started", task);
    const store = this.getStore();
    const backend = this.getBackend();
    const executor = this.getExecutor();

    // Re-read latest task state (may have been updated/paused since scheduling)
    const current = await store.get(task.id);
    if (!current || current.status !== "active") {
      logger.debug("[TaskManager] Skipping tick for non-active task", {
        taskId: task.id,
        status: current?.status,
      });
      return {
        taskId: task.id,
        runId: "skipped",
        status: "error",
        error: "Task is not active",
        durationMs: 0,
        timestamp: new Date().toISOString(),
      };
    }

    const result = await executor.execute(current);

    // Log the run
    await store.appendRun(task.id, result);

    // Update task tracking
    const updates: Partial<Task> = {
      runCount: current.runCount + 1,
      lastRunAt: result.timestamp,
    };

    // Check if task should complete
    if (current.maxRuns && current.runCount + 1 >= current.maxRuns) {
      updates.status = "completed";
      await backend.cancel(task.id);
    }

    // Mark successful once tasks as completed
    if (result.status === "success" && current.schedule.type === "once") {
      updates.status = "completed";
      await backend.cancel(task.id);
    }

    // Mark as failed on permanent error
    if (result.status === "error" && current.schedule.type === "once") {
      updates.status = "failed";
    }

    await store.update(task.id, updates);

    // Fire callbacks
    const cbs = this.callbacks.get(task.id);
    if (cbs) {
      try {
        if (result.status === "success" && cbs.onSuccess) {
          await cbs.onSuccess(result);
        }
        if (result.status === "error" && cbs.onError) {
          await cbs.onError({
            taskId: task.id,
            runId: result.runId,
            error: result.error ?? "Unknown error",
            attempt: 1, // Executor handles retries internally and returns final result
            maxAttempts: current.retry.maxAttempts,
            willRetry: false,
            timestamp: result.timestamp,
          });
        }
        if (updates.status === "completed" || updates.status === "failed") {
          const finalTask = await store.get(task.id);
          if (finalTask && cbs.onComplete) {
            await cbs.onComplete(finalTask);
          }
        }
      } catch (cbErr) {
        logger.error("[TaskManager] Callback error", {
          taskId: task.id,
          error: String(cbErr),
        });
      }
    }

    // Emit events
    if (result.status === "success") {
      this.emit("task:completed", result);
    } else {
      this.emit("task:failed", result);
    }

    return result;
  }

  /**
   * Re-schedule all active tasks from store.
   * Called on initialization to handle process restarts.
   */
  private async rescheduleActiveTasks(): Promise<void> {
    const store = this.getStore();
    const backend = this.getBackend();
    const activeTasks = await store.list({ status: "active" });

    for (const task of activeTasks) {
      try {
        await backend.schedule(task, (t) => this.onTaskTick(t));
        logger.debug("[TaskManager] Re-scheduled task", {
          taskId: task.id,
          name: task.name,
        });
      } catch (err) {
        logger.error("[TaskManager] Failed to re-schedule task", {
          taskId: task.id,
          error: String(err),
        });
      }
    }

    if (activeTasks.length > 0) {
      logger.info("[TaskManager] Re-scheduled active tasks", {
        count: activeTasks.length,
      });
    }
  }

  private emit(event: string, ...args: unknown[]): void {
    this.emitter?.emit(event, ...args);
  }
}
