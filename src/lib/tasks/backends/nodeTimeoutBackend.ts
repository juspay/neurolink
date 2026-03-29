/**
 * NodeTimeout Backend — Development/zero-dependency task scheduling.
 *
 * - Cron tasks → parsed with `croner`, scheduled via setTimeout chains
 * - Interval tasks → setInterval
 * - One-shot tasks → setTimeout
 * - All timers are in-process — lost on restart
 */

import { Cron } from "croner";
import { logger } from "../../utils/logger.js";
import {
  type ScheduledEntry,
  type Task,
  type TaskBackend,
  type TaskExecutorFn,
  type TaskManagerConfig,
  TASK_DEFAULTS,
} from "../../types/taskTypes.js";

export class NodeTimeoutBackend implements TaskBackend {
  readonly name = "node-timeout";
  private scheduled = new Map<string, ScheduledEntry>();
  private paused = new Map<string, ScheduledEntry>();
  private disposed = false;
  private activeRuns = 0;
  private maxConcurrentRuns: number;

  constructor(config: TaskManagerConfig) {
    this.maxConcurrentRuns =
      config.maxConcurrentRuns ?? TASK_DEFAULTS.maxConcurrentRuns;
  }

  async initialize(): Promise<void> {
    logger.info("[NodeTimeout] Backend initialized");
  }

  async shutdown(): Promise<void> {
    this.disposed = true;
    for (const entry of this.scheduled.values()) {
      this.clearEntry(entry);
    }
    this.scheduled.clear();
    this.paused.clear();
    logger.info("[NodeTimeout] Backend shut down");
  }

  async schedule(task: Task, executor: TaskExecutorFn): Promise<void> {
    // Cancel existing schedule for this task if any
    await this.cancel(task.id);

    const entry: ScheduledEntry = { taskId: task.id, executor, task };
    const schedule = task.schedule;

    if (schedule.type === "cron") {
      entry.cronJob = new Cron(
        schedule.expression,
        {
          timezone: schedule.timezone,
          catch: (err) => {
            logger.error("[NodeTimeout] Cron execution error", {
              taskId: task.id,
              error: String(err),
            });
          },
        },
        () => {
          this.executeTask(entry);
        },
      );
    } else if (schedule.type === "interval") {
      // Wait for the first interval tick before executing
      entry.intervalId = setInterval(() => {
        this.executeTask(entry);
      }, schedule.every);
    } else if (schedule.type === "once") {
      const at =
        typeof schedule.at === "string" ? new Date(schedule.at) : schedule.at;
      const delay = Math.max(0, at.getTime() - Date.now());
      entry.timeoutId = setTimeout(() => {
        this.executeTask(entry);
        this.scheduled.delete(task.id);
      }, delay);
    }

    this.scheduled.set(task.id, entry);
    logger.info("[NodeTimeout] Task scheduled", {
      taskId: task.id,
      type: schedule.type,
    });
  }

  async cancel(taskId: string): Promise<void> {
    const entry = this.scheduled.get(taskId);
    if (entry) {
      this.clearEntry(entry);
      this.scheduled.delete(taskId);
    }
    this.paused.delete(taskId);
    logger.debug("[NodeTimeout] Task cancelled", { taskId });
  }

  async pause(taskId: string): Promise<void> {
    const entry = this.scheduled.get(taskId);
    if (!entry) {
      return;
    }

    this.clearEntry(entry);
    this.scheduled.delete(taskId);
    // Save the entry so we can re-schedule on resume
    this.paused.set(taskId, entry);
    logger.info("[NodeTimeout] Task paused", { taskId });
  }

  async resume(taskId: string): Promise<void> {
    const entry = this.paused.get(taskId);
    if (!entry) {
      return;
    }

    this.paused.delete(taskId);
    // Re-schedule with the saved task and executor
    await this.schedule(entry.task, entry.executor);
    logger.info("[NodeTimeout] Task resumed", { taskId });
  }

  async isHealthy(): Promise<boolean> {
    return !this.disposed;
  }

  // ── Internal ──────────────────────────────────────────

  private executeTask(entry: ScheduledEntry): void {
    if (this.activeRuns >= this.maxConcurrentRuns) {
      logger.warn("[NodeTimeout] Max concurrent runs reached, skipping tick", {
        taskId: entry.taskId,
        activeRuns: this.activeRuns,
        maxConcurrentRuns: this.maxConcurrentRuns,
      });
      return;
    }
    this.activeRuns++;
    entry
      .executor(entry.task)
      .catch((err) => {
        logger.error("[NodeTimeout] Task execution failed", {
          taskId: entry.taskId,
          error: String(err),
        });
      })
      .finally(() => {
        this.activeRuns--;
      });
  }

  private clearEntry(entry: ScheduledEntry): void {
    if (entry.cronJob) {
      entry.cronJob.stop();
    }
    if (entry.intervalId !== undefined) {
      clearInterval(entry.intervalId);
    }
    if (entry.timeoutId !== undefined) {
      clearTimeout(entry.timeoutId);
    }
  }
}
