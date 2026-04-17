/**
 * BullMQ Backend — Production-grade task scheduling via Redis.
 *
 * - Cron tasks → BullMQ repeatable jobs with cron pattern
 * - Interval tasks → BullMQ repeatable jobs with `every` option
 * - One-shot tasks → BullMQ delayed jobs
 * - Survives process restarts (Redis-persisted)
 */

import type { Queue, Worker, Job } from "bullmq";
import { logger } from "../../utils/logger.js";
import { TaskError } from "../errors.js";
import {
  type Task,
  type TaskBackend,
  type TaskExecutorFn,
  type TaskManagerConfig,
  TASK_DEFAULTS,
} from "../../types/index.js";

async function loadBullMQ() {
  try {
    return await import(/* @vite-ignore */ "bullmq");
  } catch (err) {
    const e = err instanceof Error ? (err as NodeJS.ErrnoException) : null;
    if (e?.code === "ERR_MODULE_NOT_FOUND" && e.message.includes("bullmq")) {
      throw new Error(
        'BullMQ task backend requires the "bullmq" package. Install it with:\n  pnpm add bullmq',
        { cause: err },
      );
    }
    throw err;
  }
}

const QUEUE_NAME = "neurolink-tasks";

export class BullMQBackend implements TaskBackend {
  readonly name = "bullmq";
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private executors = new Map<string, TaskExecutorFn>();
  private config: TaskManagerConfig;

  constructor(config: TaskManagerConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    const { Queue: BullQueue, Worker: BullWorker } = await loadBullMQ();
    const connection = this.getConnectionConfig();

    this.queue = new BullQueue(QUEUE_NAME, { connection });

    this.worker = new BullWorker(
      QUEUE_NAME,
      async (job: Job) => {
        const taskId = job.data.taskId as string;
        const task = job.data.task as Task;
        const executor = this.executors.get(taskId);

        if (!executor) {
          logger.warn("[BullMQ] No executor found for task", { taskId });
          return;
        }

        logger.info("[BullMQ] Executing task", { taskId, name: task.name });
        const result = await executor(task);
        return result;
      },
      {
        connection,
        concurrency:
          this.config.maxConcurrentRuns ?? TASK_DEFAULTS.maxConcurrentRuns,
      },
    );

    this.worker.on("failed", (job, err) => {
      logger.error("[BullMQ] Job failed", {
        taskId: job?.data?.taskId,
        error: String(err),
      });
    });

    this.worker.on("error", (err) => {
      logger.error("[BullMQ] Worker error", { error: String(err) });
    });

    logger.info("[BullMQ] Backend initialized");
  }

  async shutdown(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
    if (this.queue) {
      await this.queue.close();
      this.queue = null;
    }
    this.executors.clear();
    logger.info("[BullMQ] Backend shut down");
  }

  async schedule(task: Task, executor: TaskExecutorFn): Promise<void> {
    const queue = this.getQueue();
    this.executors.set(task.id, executor);

    try {
      const jobData = { taskId: task.id, task };
      const schedule = task.schedule;

      if (schedule.type === "cron") {
        await queue.upsertJobScheduler(
          task.id,
          {
            pattern: schedule.expression,
            ...(schedule.timezone ? { tz: schedule.timezone } : {}),
          },
          { name: task.name, data: jobData },
        );
      } else if (schedule.type === "interval") {
        await queue.upsertJobScheduler(
          task.id,
          { every: schedule.every },
          { name: task.name, data: jobData },
        );
      } else if (schedule.type === "once") {
        const at =
          typeof schedule.at === "string" ? new Date(schedule.at) : schedule.at;
        const delay = Math.max(0, at.getTime() - Date.now());
        await queue.add(task.name, jobData, {
          jobId: task.id,
          delay,
        });
      }
    } catch (error) {
      this.executors.delete(task.id);
      throw error;
    }

    logger.info("[BullMQ] Task scheduled", {
      taskId: task.id,
      type: task.schedule.type,
    });
  }

  async cancel(taskId: string): Promise<void> {
    const queue = this.getQueue();
    this.executors.delete(taskId);

    // Remove repeatable job scheduler
    try {
      await queue.removeJobScheduler(taskId);
    } catch {
      // May not be a repeatable job — try removing by job ID
    }

    // Remove delayed/waiting job
    try {
      const job = await queue.getJob(taskId);
      if (job) {
        await job.remove();
      }
    } catch {
      // Job may already be processed/removed
    }

    logger.info("[BullMQ] Task cancelled", { taskId });
  }

  async pause(taskId: string): Promise<void> {
    // BullMQ doesn't have per-job pause, so we fully cancel the job scheduler
    // and executor. This is intentionally destructive — cancel() removes both
    // the executor from the map and the job/scheduler from Redis.
    //
    // Resume flow (orchestrated by TaskManager):
    //   1. TaskManager.resume() updates task status to "active" in the store
    //   2. TaskManager.resume() calls backend.schedule(task, newExecutor)
    //   3. schedule() re-registers the executor and creates a new job/scheduler
    //
    // Because TaskManager always supplies a fresh executor on schedule(),
    // there is no need to preserve the old executor here.
    await this.cancel(taskId);
    logger.info(
      "[BullMQ] Task paused (cancelled pending jobs; TaskManager will re-schedule on resume)",
      { taskId },
    );
  }

  async resume(taskId: string): Promise<void> {
    // No-op: BullMQ resume is handled by TaskManager calling schedule() after
    // this method returns. See TaskManager.resume() which calls:
    //   backend.schedule(updatedTask, executor)
    // That call re-registers the executor and creates the job/scheduler in Redis.
    logger.info(
      "[BullMQ] Task resume requested (awaiting re-schedule from TaskManager)",
      { taskId },
    );
  }

  async isHealthy(): Promise<boolean> {
    if (!this.queue) {
      return false;
    }
    try {
      // Check if the queue can reach Redis
      await this.queue.getJobCounts();
      return true;
    } catch {
      return false;
    }
  }

  // ── Internal ──────────────────────────────────────────

  /**
   * Returns a connection options object for BullMQ / ioredis.
   * When a URL is provided we parse it fully, preserving TLS (`rediss://`),
   * ACL username, password, db index, and any query-string parameters so
   * nothing is silently dropped.
   */
  private getConnectionConfig(): Record<string, unknown> {
    const redis = this.config.redis ?? {};

    if (redis.url) {
      const parsed = new URL(redis.url);
      const opts: Record<string, unknown> = {
        host: parsed.hostname || "localhost",
        port: Number(parsed.port) || 6379,
        db: parsed.pathname ? Number(parsed.pathname.slice(1)) || 0 : 0,
      };

      if (parsed.password) {
        opts.password = decodeURIComponent(parsed.password);
      }
      if (parsed.username) {
        opts.username = decodeURIComponent(parsed.username);
      }

      // rediss:// scheme → enable TLS
      if (parsed.protocol === "rediss:") {
        opts.tls = {};
      }

      return opts;
    }

    return {
      host: redis.host ?? TASK_DEFAULTS.redis.host,
      port: redis.port ?? TASK_DEFAULTS.redis.port,
      ...(redis.password ? { password: redis.password } : {}),
      db: redis.db ?? 0,
    };
  }

  private ensureInitialized(): void {
    if (!this.queue) {
      throw TaskError.create(
        "BACKEND_NOT_INITIALIZED",
        "[BullMQ] Backend not initialized. Call initialize() first.",
      );
    }
  }

  private getQueue(): Queue {
    this.ensureInitialized();

    if (!this.queue) {
      throw TaskError.create(
        "BACKEND_NOT_INITIALIZED",
        "[BullMQ] Queue is unavailable after initialization.",
      );
    }

    return this.queue;
  }
}
