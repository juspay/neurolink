/**
 * FileTaskStore — File-based persistence for TaskManager.
 * Used automatically when backend is "node-timeout".
 *
 * Storage layout:
 *   {storePath}                     — tasks.json (all task definitions)
 *   {logsPath}/{taskId}.jsonl       — run log per task (append-only)
 *   Continuation history is in-memory only (lost on restart).
 */

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import {
  appendFile,
  readFile,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { logger } from "../../utils/logger.js";
import { TaskError } from "../errors.js";
import {
  type Task,
  type TasksFile,
  type TaskStatus,
  type TaskRunResult,
  type TaskStore,
  type TaskManagerConfig,
  type ConversationEntry,
  TASK_DEFAULTS,
} from "../../types/taskTypes.js";

export class FileTaskStore implements TaskStore {
  readonly type = "file" as const;
  private storePath: string;
  private logsPath: string;
  private maxRunLogs: number;
  private maxHistoryEntries: number;
  private tasks: Map<string, Task> = new Map();
  /** In-memory only — lost on restart */
  private history: Map<string, ConversationEntry[]> = new Map();
  private flushQueue: Promise<void> = Promise.resolve();

  constructor(config: TaskManagerConfig) {
    this.storePath = config.storePath ?? TASK_DEFAULTS.storePath;
    this.logsPath = config.logsPath ?? TASK_DEFAULTS.logsPath;
    this.maxRunLogs = config.maxRunLogs ?? TASK_DEFAULTS.maxRunLogs;
    this.maxHistoryEntries =
      config.maxHistoryEntries ?? TASK_DEFAULTS.maxHistoryEntries;
  }

  async initialize(): Promise<void> {
    // Ensure directories exist
    mkdirSync(dirname(this.storePath), { recursive: true });
    mkdirSync(this.logsPath, { recursive: true });

    // Load existing tasks
    if (existsSync(this.storePath)) {
      try {
        const raw = readFileSync(this.storePath, "utf-8");
        const data = JSON.parse(raw) as TasksFile;
        for (const [id, task] of Object.entries(data.tasks)) {
          this.tasks.set(id, task);
        }
        logger.info("[TaskStore:File] Loaded tasks", {
          count: this.tasks.size,
        });
      } catch (err) {
        logger.error("[TaskStore:File] Failed to load tasks file", {
          error: String(err),
        });
      }
    }
  }

  async shutdown(): Promise<void> {
    await this.flush();
    this.tasks.clear();
    this.history.clear();
  }

  // ── Task CRUD ───────────────────────────────────────────

  async save(task: Task): Promise<void> {
    this.tasks.set(task.id, task);
    await this.flush();
  }

  async get(taskId: string): Promise<Task | null> {
    return this.tasks.get(taskId) ?? null;
  }

  async list(filter?: { status?: TaskStatus }): Promise<Task[]> {
    let tasks = Array.from(this.tasks.values());

    if (filter?.status) {
      tasks = tasks.filter((t) => t.status === filter.status);
    }

    return tasks.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  async update(taskId: string, updates: Partial<Task>): Promise<Task> {
    const existing = this.tasks.get(taskId);
    if (!existing) {
      throw TaskError.create("TASK_NOT_FOUND", `Task not found: ${taskId}`);
    }

    const updated: Task = {
      ...existing,
      ...updates,
      id: existing.id, // ID is immutable
      updatedAt: new Date().toISOString(),
    };

    this.tasks.set(taskId, updated);
    await this.flush();
    return updated;
  }

  async delete(taskId: string): Promise<void> {
    this.tasks.delete(taskId);
    this.history.delete(taskId);

    // Delete run log file
    const logPath = join(this.logsPath, `${taskId}.jsonl`);
    try {
      await unlink(logPath);
    } catch {
      // File may not exist if task never ran
    }

    await this.flush();
  }

  // ── Run Logs ──────────────────────────────────────────

  async appendRun(taskId: string, run: TaskRunResult): Promise<void> {
    const logPath = join(this.logsPath, `${taskId}.jsonl`);
    mkdirSync(dirname(logPath), { recursive: true });
    await appendFile(logPath, JSON.stringify(run) + "\n", "utf-8");
    await this.pruneRunLog(logPath);
  }

  async getRuns(
    taskId: string,
    options?: { limit?: number; status?: string },
  ): Promise<TaskRunResult[]> {
    const logPath = join(this.logsPath, `${taskId}.jsonl`);

    if (!existsSync(logPath)) {
      return [];
    }

    const content = await readFile(logPath, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);

    let runs = lines.map((line) => JSON.parse(line) as TaskRunResult);

    if (options?.status) {
      runs = runs.filter((r) => r.status === options.status);
    }

    // Return newest first, limited
    runs.reverse();
    const limit = options?.limit ?? 20;
    return runs.slice(0, limit);
  }

  // ── Continuation History (in-memory only) ─────────────

  async appendHistory(
    taskId: string,
    messages: ConversationEntry[],
  ): Promise<void> {
    const existing = this.history.get(taskId) ?? [];
    existing.push(...messages);
    // Trim to keep only the most recent entries, preventing unbounded growth
    if (existing.length > this.maxHistoryEntries) {
      const trimmed = existing.slice(-this.maxHistoryEntries);
      this.history.set(taskId, trimmed);
    } else {
      this.history.set(taskId, existing);
    }
  }

  async getHistory(taskId: string): Promise<ConversationEntry[]> {
    return this.history.get(taskId) ?? [];
  }

  async clearHistory(taskId: string): Promise<void> {
    this.history.delete(taskId);
  }

  // ── Internal ──────────────────────────────────────────

  /** Write all tasks to disk atomically, serialized via promise queue */
  private async flush(): Promise<void> {
    this.flushQueue = this.flushQueue.then(async () => {
      const data: TasksFile = {
        version: 1,
        tasks: Object.fromEntries(this.tasks),
      };

      const dir = dirname(this.storePath);
      mkdirSync(dir, { recursive: true });

      // Write to temp file first, then atomic rename
      const tmpPath = this.storePath + ".tmp";
      await writeFile(tmpPath, JSON.stringify(data, null, 2), "utf-8");
      await rename(tmpPath, this.storePath);
    });
    await this.flushQueue;
  }

  /** Prune run log if it exceeds maxRunLogs entries */
  private async pruneRunLog(logPath: string): Promise<void> {
    try {
      const content = await readFile(logPath, "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);

      if (lines.length > this.maxRunLogs) {
        // Keep the most recent entries
        const trimmed = lines.slice(-this.maxRunLogs);
        await writeFile(logPath, trimmed.join("\n") + "\n", "utf-8");
      }
    } catch {
      // Pruning is best-effort
    }
  }
}
