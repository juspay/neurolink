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
import { logger } from "../utils/logger.js";
import { TaskBackendRegistry } from "./backends/taskBackendRegistry.js";
import { TaskError } from "./errors.js";
import { TaskExecutor } from "./taskExecutor.js";
import {
  type NeuroLinkExecutable,
  type Task,
  type TaskBackend,
  type TaskDefinition,
  type TaskManagerConfig,
  type TaskRunResult,
  type TaskStatus,
  type TaskStore,
  TASK_DEFAULTS,
} from "../types/taskTypes.js";

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

    // Create executor
    this.executor = new TaskExecutor(this.neurolink, this.store);

    // Re-schedule active tasks from store (handles restarts)
    await this.rescheduleActiveTasks();

    this.initialized = true;
    logger.info("[TaskManager] Initialized", {
      backend: backendName,
      store: this.store.type,
    });
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

    // Enforce maximum task limit to prevent unbounded task creation
    const maxTasks = this.config.maxTasks ?? TASK_DEFAULTS.maxTasks;
    const existingTasks = await this.store!.list();
    if (existingTasks.length >= maxTasks) {
      throw TaskError.create(
        "TASK_LIMIT_REACHED",
        `Task limit reached (${maxTasks}). Delete existing tasks or increase maxTasks config.`,
      );
    }

    const now = new Date().toISOString();
    const task: Task = {
      id: `task_${nanoid(12)}`,
      name: definition.name,
      prompt: definition.prompt,
      schedule: definition.schedule,
      mode: definition.mode ?? TASK_DEFAULTS.mode,
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
    };

    // Generate session ID for continuation mode
    if (task.mode === "continuation") {
      task.sessionId = `session_${nanoid(12)}`;
    }

    // Save to store
    await this.store!.save(task);

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
      await this.backend!.schedule(task, (t) => this.onTaskTick(t));
    } catch (err) {
      await this.store!.delete(task.id);
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
    return this.store!.get(taskId);
  }

  async list(filter?: { status?: TaskStatus }): Promise<Task[]> {
    await this.ensureInitialized();
    return this.store!.list(filter);
  }

  async update(
    taskId: string,
    updates: Partial<TaskDefinition>,
  ): Promise<Task> {
    await this.ensureInitialized();

    const existing = await this.store!.get(taskId);
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

    // Special-case: mode changes require sessionId handling
    if (updates.mode !== undefined) {
      if (updates.mode === "continuation" && !existing.sessionId) {
        taskUpdates.sessionId = `session_${nanoid(12)}`;
      } else if (updates.mode !== "continuation") {
        taskUpdates.sessionId = undefined;
        await this.store!.clearHistory(taskId);
      }
    }

    const updated = await this.store!.update(taskId, taskUpdates);

    // Re-schedule if schedule changed and task is active
    if (updates.schedule && updated.status === "active") {
      await this.backend!.cancel(taskId);
      await this.backend!.schedule(updated, (t) => this.onTaskTick(t));
    }

    return updated;
  }

  /** Run a task immediately (outside of its schedule) */
  async run(taskId: string): Promise<TaskRunResult> {
    await this.ensureInitialized();

    const task = await this.store!.get(taskId);
    if (!task) {
      throw TaskError.create("TASK_NOT_FOUND", `Task not found: ${taskId}`);
    }

    return this.onTaskTick(task);
  }

  async pause(taskId: string): Promise<Task> {
    await this.ensureInitialized();

    const task = await this.store!.get(taskId);
    if (!task) {
      throw TaskError.create("TASK_NOT_FOUND", `Task not found: ${taskId}`);
    }
    if (task.status !== "active") {
      throw TaskError.create(
        "INVALID_TASK_STATUS",
        `Cannot pause task with status: ${task.status}`,
      );
    }

    await this.backend!.pause(taskId);
    const updated = await this.store!.update(taskId, { status: "paused" });

    this.emit("task:paused", updated);
    return updated;
  }

  async resume(taskId: string): Promise<Task> {
    await this.ensureInitialized();

    const task = await this.store!.get(taskId);
    if (!task) {
      throw TaskError.create("TASK_NOT_FOUND", `Task not found: ${taskId}`);
    }
    if (task.status !== "paused") {
      throw TaskError.create(
        "INVALID_TASK_STATUS",
        `Cannot resume task with status: ${task.status}`,
      );
    }

    const updated = await this.store!.update(taskId, { status: "active" });
    await this.backend!.schedule(updated, (t) => this.onTaskTick(t));

    this.emit("task:resumed", updated);
    return updated;
  }

  async delete(taskId: string): Promise<void> {
    await this.ensureInitialized();

    await this.backend!.cancel(taskId);
    await this.store!.delete(taskId);
    this.callbacks.delete(taskId);

    this.emit("task:deleted", taskId);
  }

  async runs(
    taskId: string,
    options?: { limit?: number; status?: string },
  ): Promise<TaskRunResult[]> {
    await this.ensureInitialized();
    return this.store!.getRuns(taskId, options);
  }

  async shutdown(): Promise<void> {
    if (this.backend) {
      await this.backend.shutdown();
    }
    if (this.store) {
      await this.store.shutdown();
    }
    this.callbacks.clear();
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

  /**
   * Called by the backend on each scheduled tick.
   * Executes the task, updates state, fires callbacks/events.
   */
  private async onTaskTick(task: Task): Promise<TaskRunResult> {
    this.emit("task:started", task);

    // Re-read latest task state (may have been updated/paused since scheduling)
    const current = await this.store!.get(task.id);
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

    const result = await this.executor!.execute(current);

    // Log the run
    await this.store!.appendRun(task.id, result);

    // Update task tracking
    const updates: Partial<Task> = {
      runCount: current.runCount + 1,
      lastRunAt: result.timestamp,
    };

    // Check if task should complete
    if (current.maxRuns && current.runCount + 1 >= current.maxRuns) {
      updates.status = "completed";
      await this.backend!.cancel(task.id);
    }

    // Mark successful once tasks as completed
    if (result.status === "success" && current.schedule.type === "once") {
      updates.status = "completed";
      await this.backend!.cancel(task.id);
    }

    // Mark as failed on permanent error
    if (result.status === "error" && current.schedule.type === "once") {
      updates.status = "failed";
    }

    await this.store!.update(task.id, updates);

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
          const finalTask = await this.store!.get(task.id);
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
    const activeTasks = await this.store!.list({ status: "active" });

    for (const task of activeTasks) {
      try {
        await this.backend!.schedule(task, (t) => this.onTaskTick(t));
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
