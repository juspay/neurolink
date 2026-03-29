/**
 * RedisTaskStore — Redis-backed persistence for TaskManager.
 * Used automatically when backend is "bullmq".
 *
 * Key patterns:
 *   neurolink:tasks              (Hash)  — all task definitions
 *   neurolink:task:{id}:runs     (List)  — run log entries (newest first)
 *   neurolink:task:{id}:history  (List)  — continuation mode conversation history
 */

import { createClient } from "redis";
import { logger } from "../../utils/logger.js";
import { TaskError } from "../errors.js";
import {
  type RedisClient,
  type Task,
  type TaskStatus,
  type TaskRunResult,
  type TaskStore,
  type TaskManagerConfig,
  type ConversationEntry,
  TASK_DEFAULTS,
} from "../../types/taskTypes.js";

const KEY_PREFIX = "neurolink:";
const TASKS_HASH = `${KEY_PREFIX}tasks`;

function taskRunsKey(taskId: string): string {
  return `${KEY_PREFIX}task:${taskId}:runs`;
}

function taskHistoryKey(taskId: string): string {
  return `${KEY_PREFIX}task:${taskId}:history`;
}

export class RedisTaskStore implements TaskStore {
  readonly type = "redis" as const;
  private client: RedisClient | null = null;
  private maxRunLogs: number;
  private maxHistoryEntries: number;
  private retentionConfig: Required<typeof TASK_DEFAULTS.retention>;

  constructor(private config: TaskManagerConfig) {
    this.maxRunLogs = config.maxRunLogs ?? TASK_DEFAULTS.maxRunLogs;
    this.maxHistoryEntries =
      config.maxHistoryEntries ?? TASK_DEFAULTS.maxHistoryEntries;
    this.retentionConfig = {
      ...TASK_DEFAULTS.retention,
      ...config.taskRetention,
    };
  }

  async initialize(): Promise<void> {
    const redis = this.config.redis ?? {};
    const url =
      redis.url ??
      `redis://${redis.host ?? TASK_DEFAULTS.redis.host}:${redis.port ?? TASK_DEFAULTS.redis.port}/${redis.db ?? 0}`;

    this.client = createClient({
      url,
      ...(redis.password ? { password: redis.password } : {}),
    });

    this.client.on("error", (err) => {
      logger.error("[TaskStore:Redis] Connection error", {
        error: String(err),
      });
    });

    await this.client.connect();
    logger.info("[TaskStore:Redis] Connected");
  }

  async shutdown(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.quit();
      logger.info("[TaskStore:Redis] Disconnected");
    }
    this.client = null;
  }

  // ── Task CRUD ───────────────────────────────────────────

  async save(task: Task): Promise<void> {
    this.ensureConnected();
    await this.client!.hSet(TASKS_HASH, task.id, JSON.stringify(task));
    this.applyRetentionTTL(task);
  }

  async get(taskId: string): Promise<Task | null> {
    this.ensureConnected();
    const data = await this.client!.hGet(TASKS_HASH, taskId);
    if (!data) {
      return null;
    }
    return JSON.parse(String(data)) as Task;
  }

  async list(filter?: { status?: TaskStatus }): Promise<Task[]> {
    this.ensureConnected();
    const all = await this.client!.hGetAll(TASKS_HASH);
    let tasks = Object.values(all).map((v) => JSON.parse(String(v)) as Task);

    if (filter?.status) {
      tasks = tasks.filter((t) => t.status === filter.status);
    }

    return tasks.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  async update(taskId: string, updates: Partial<Task>): Promise<Task> {
    this.ensureConnected();
    const existing = await this.get(taskId);
    if (!existing) {
      throw TaskError.create("TASK_NOT_FOUND", `Task not found: ${taskId}`);
    }

    const updated: Task = {
      ...existing,
      ...updates,
      id: existing.id, // ID is immutable
      updatedAt: new Date().toISOString(),
    };

    await this.client!.hSet(TASKS_HASH, taskId, JSON.stringify(updated));
    this.applyRetentionTTL(updated);
    return updated;
  }

  async delete(taskId: string): Promise<void> {
    this.ensureConnected();
    await Promise.all([
      this.client!.hDel(TASKS_HASH, taskId),
      this.client!.del(taskRunsKey(taskId)),
      this.client!.del(taskHistoryKey(taskId)),
    ]);
  }

  // ── Run Logs ──────────────────────────────────────────

  async appendRun(taskId: string, run: TaskRunResult): Promise<void> {
    this.ensureConnected();
    const key = taskRunsKey(taskId);
    await this.client!.lPush(key, JSON.stringify(run));
    // Trim to keep only the latest maxRunLogs entries
    await this.client!.lTrim(key, 0, this.maxRunLogs - 1);
  }

  async getRuns(
    taskId: string,
    options?: { limit?: number; status?: string },
  ): Promise<TaskRunResult[]> {
    this.ensureConnected();
    const limit = options?.limit ?? 20;
    const key = taskRunsKey(taskId);
    // When a status filter is applied, we need to fetch more items than `limit`
    // because post-filter may discard many entries. Fetch all (-1) when filtering,
    // otherwise fetch exactly `limit` items.
    const fetchEnd = options?.status ? -1 : limit - 1;
    const items = await this.client!.lRange(key, 0, fetchEnd);

    let runs = items.map((v) => JSON.parse(String(v)) as TaskRunResult);

    if (options?.status) {
      runs = runs.filter((r) => r.status === options.status);
    }

    return runs.slice(0, limit);
  }

  // ── Continuation History ──────────────────────────────

  async appendHistory(
    taskId: string,
    messages: ConversationEntry[],
  ): Promise<void> {
    this.ensureConnected();
    const key = taskHistoryKey(taskId);
    const serialized = messages.map((m) => JSON.stringify(m));
    if (serialized.length > 0) {
      await this.client!.rPush(key, serialized);
      // Trim to keep only the most recent entries, preventing unbounded growth
      await this.client!.lTrim(key, -this.maxHistoryEntries, -1);
    }
  }

  async getHistory(taskId: string): Promise<ConversationEntry[]> {
    this.ensureConnected();
    const key = taskHistoryKey(taskId);
    const items = await this.client!.lRange(key, 0, -1);
    return items.map((v) => JSON.parse(String(v)) as ConversationEntry);
  }

  async clearHistory(taskId: string): Promise<void> {
    this.ensureConnected();
    await this.client!.del(taskHistoryKey(taskId));
  }

  // ── Internal ──────────────────────────────────────────

  private ensureConnected(): void {
    if (!this.client?.isOpen) {
      throw TaskError.create(
        "BACKEND_NOT_INITIALIZED",
        "[TaskStore:Redis] Not connected. Call initialize() first.",
      );
    }
  }

  /**
   * Set Redis TTL on terminal-state tasks so they auto-expire.
   * Active and paused tasks never expire.
   */
  private applyRetentionTTL(task: Task): void {
    // We don't set EXPIRE on the hash field directly (Redis doesn't support per-field TTL).
    // Instead, run logs and history keys get TTL. The task hash field itself must be
    // cleaned up via manual deletion or BullMQ's built-in job cleanup.
    const ttlMap: Record<string, number | undefined> = {
      completed: this.retentionConfig.completedTTL,
      failed: this.retentionConfig.failedTTL,
      cancelled: this.retentionConfig.cancelledTTL,
    };

    const ttlMs = ttlMap[task.status];
    if (ttlMs) {
      const ttlSeconds = Math.ceil(ttlMs / 1000);
      // Set TTL on associated keys
      this.client!.expire(taskRunsKey(task.id), ttlSeconds).catch((err) => {
        logger.debug("[TaskStore:Redis] Failed to set TTL", {
          error: String(err),
        });
      });
      this.client!.expire(taskHistoryKey(task.id), ttlSeconds).catch((err) => {
        logger.debug("[TaskStore:Redis] Failed to set TTL", {
          error: String(err),
        });
      });
    }
  }
}
