/**
 * BullMQ Provider for Task Scheduler
 *
 * Handles Redis/BullMQ integration for persistent task scheduling.
 */

import { Queue, Worker, Job } from "bullmq";
import { createClient } from "redis";
import { logger } from "../../utils/logger.js";
import type { ScheduledTask, TaskRun } from "../types.js";

const TASK_DATA_KEY_PREFIX = "neurolink:scheduler:task:";
const TASK_RUNS_KEY_PREFIX = "neurolink:scheduler:runs:";

// Redis client type from createClient
type RedisClient = ReturnType<typeof createClient>;

export interface BullMQProvider {
  queue: Queue;
  worker: Worker;
  redisClient: RedisClient;
  isAvailable: boolean;
}

export interface JobHandler {
  (taskId: string): Promise<void>;
}

/**
 * Initialize BullMQ with Redis connection
 */
export async function initBullMQ(
  redisUrl: string,
  jobHandler: JobHandler,
): Promise<BullMQProvider | null> {
  try {
    // Create Redis client for persisting task data
    const redisClient = createClient({ url: redisUrl });
    await redisClient.connect();

    const queue = new Queue("neurolink-scheduler", {
      connection: { url: redisUrl },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
      },
    });

    // Test connection (5s timeout)
    await Promise.race([
      queue.waitUntilReady(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Redis timeout")), 5000),
      ),
    ]);

    // Create worker to process jobs
    const worker = new Worker(
      "neurolink-scheduler",
      async (job: Job<{ taskId: string; fullTask?: ScheduledTask }>) => {
        const { taskId } = job.data;
        logger.info(`[BullMQ] Worker processing job for task ${taskId}`);
        await jobHandler(taskId);
      },
      { connection: { url: redisUrl }, concurrency: 3 },
    );

    worker.on("completed", (job) => {
      logger.info(
        `[BullMQ] Worker completed job ${job.id} for task ${job.data?.taskId}`,
      );
    });

    worker.on("failed", (job, err) => {
      logger.error(`[BullMQ] Worker failed job ${job?.id}:`, err);
    });

    logger.info("[BullMQ] Using Redis/BullMQ");

    return { queue, worker, redisClient, isAvailable: true };
  } catch (err) {
    logger.warn("[BullMQ] Redis unavailable:", err);
    return null;
  }
}

/**
 * Schedule a task using BullMQ
 */
export async function scheduleBullMQ(
  queue: Queue,
  task: ScheduledTask,
): Promise<void> {
  const jobData = { taskId: task.id, fullTask: task };

  switch (task.schedule.type) {
    case "at": {
      const target = new Date(task.schedule.value).getTime();
      const delay = target - Date.now();
      if (delay > 0) {
        await queue.add(task.id, jobData, { delay, jobId: task.id });
      }
      break;
    }

    case "every": {
      const ms = parseInterval(String(task.schedule.value));
      await queue.add(task.id, jobData, {
        repeat: { every: ms },
        jobId: `${task.id}-repeat`,
      });
      break;
    }

    case "cron": {
      await queue.add(task.id, jobData, {
        repeat: {
          pattern: String(task.schedule.value),
          tz: task.schedule.timezone,
        },
        jobId: `${task.id}-cron`,
      });
      break;
    }
  }
}

/**
 * Remove a task from BullMQ
 */
export async function removeFromBullMQ(
  queue: Queue,
  taskId: string,
): Promise<void> {
  // Remove repeatable jobs
  const repeatables = await queue.getRepeatableJobs();
  for (const job of repeatables) {
    if (job.name === taskId) {
      await queue.removeRepeatableByKey(job.key);
    }
  }

  // Remove delayed jobs
  const delayed = await queue.getDelayed();
  for (const job of delayed) {
    if (job.data?.taskId === taskId) {
      await job.remove();
    }
  }
}

/**
 * Persist task config to Redis
 */
export async function persistTaskConfig(
  redisClient: RedisClient,
  task: ScheduledTask,
): Promise<void> {
  try {
    const key = `${TASK_DATA_KEY_PREFIX}${task.id}`;
    await redisClient.set(key, JSON.stringify(task));
    logger.debug(`[BullMQ] Persisted config for task ${task.id}`);
  } catch (err) {
    logger.warn(`[BullMQ] Failed to persist config for task ${task.id}:`, err);
  }
}

/**
 * Load task config from Redis
 */
export async function loadTaskConfig(
  redisClient: RedisClient,
  taskId: string,
): Promise<ScheduledTask | null> {
  try {
    const key = `${TASK_DATA_KEY_PREFIX}${taskId}`;
    const data = await redisClient.get(key);
    if (data) {
      const task = JSON.parse(data.toString()) as ScheduledTask;
      logger.debug(`[BullMQ] Loaded config for task ${taskId} from Redis`);
      return task;
    }
  } catch (err) {
    logger.warn(`[BullMQ] Failed to load config for task ${taskId}:`, err);
  }
  return null;
}

/**
 * Delete task config from Redis
 */
export async function deleteTaskConfig(
  redisClient: RedisClient,
  taskId: string,
): Promise<void> {
  try {
    const key = `${TASK_DATA_KEY_PREFIX}${taskId}`;
    await redisClient.del(key);
    logger.debug(`[BullMQ] Deleted config for task ${taskId}`);
  } catch (err) {
    logger.warn(`[BullMQ] Failed to delete config for task ${taskId}:`, err);
  }
}

/**
 * Persist task runs to Redis
 */
export async function persistTaskRuns(
  redisClient: RedisClient,
  task: ScheduledTask,
): Promise<void> {
  try {
    const key = `${TASK_RUNS_KEY_PREFIX}${task.id}`;
    await redisClient.set(key, JSON.stringify(task.runs));
    logger.debug(
      `[BullMQ] Persisted ${task.runs.length} runs for task ${task.id}`,
    );
  } catch (err) {
    logger.warn(`[BullMQ] Failed to persist runs for task ${task.id}:`, err);
  }
}

/**
 * Load task runs from Redis
 */
export async function loadTaskRuns(
  redisClient: RedisClient,
  taskId: string,
): Promise<TaskRun[]> {
  try {
    const key = `${TASK_RUNS_KEY_PREFIX}${taskId}`;
    const data = await redisClient.get(key);
    if (data) {
      const runs = JSON.parse(data.toString()) as TaskRun[];
      logger.debug(
        `[BullMQ] Loaded ${runs.length} runs for task ${taskId} from Redis`,
      );
      return runs;
    }
  } catch (err) {
    logger.warn(`[BullMQ] Failed to load runs for task ${taskId}:`, err);
  }
  return [];
}

/**
 * Delete task runs from Redis
 */
export async function deleteTaskRuns(
  redisClient: RedisClient,
  taskId: string,
): Promise<void> {
  try {
    const key = `${TASK_RUNS_KEY_PREFIX}${taskId}`;
    await redisClient.del(key);
    logger.debug(`[BullMQ] Deleted runs for task ${taskId}`);
  } catch (err) {
    logger.warn(`[BullMQ] Failed to delete runs for task ${taskId}:`, err);
  }
}

/**
 * Clear all task data from Redis
 */
export async function clearAllTaskData(
  redisClient: RedisClient,
): Promise<void> {
  try {
    const runKeys = await redisClient.keys(`${TASK_RUNS_KEY_PREFIX}*`);
    for (const key of runKeys) {
      await redisClient.del(key);
    }
    const taskKeys = await redisClient.keys(`${TASK_DATA_KEY_PREFIX}*`);
    for (const key of taskKeys) {
      await redisClient.del(key);
    }
    logger.info(
      `[BullMQ] Cleared ${runKeys.length} run entries and ${taskKeys.length} task configs from Redis`,
    );
  } catch (err) {
    logger.warn("[BullMQ] Failed to clear task data:", err);
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
