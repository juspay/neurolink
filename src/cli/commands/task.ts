/**
 * Task CLI Commands for NeuroLink
 *
 * Implements commands for task scheduling and management:
 * - neurolink task create   — Create a scheduled task (pure store write, exits immediately)
 * - neurolink task list     — List all tasks
 * - neurolink task get      — Show task details
 * - neurolink task run      — Run a task immediately
 * - neurolink task pause    — Pause a task
 * - neurolink task resume   — Resume a paused task
 * - neurolink task update   — Update a task
 * - neurolink task delete   — Delete a task
 * - neurolink task logs     — View run history
 * - neurolink task start    — Start worker (keeps process alive for scheduled tasks)
 * - neurolink task stop     — Stop a running daemon worker
 * - neurolink task status   — Show worker status
 */

import { spawn } from "node:child_process";
import { openSync } from "node:fs";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import chalk from "chalk";
import { nanoid } from "nanoid";
import ora from "ora";
import type { CommandModule } from "yargs";
import type {
  Task,
  TaskSchedule,
  TaskStatus,
  TaskManagerConfig,
  TaskExecutionMode,
  WorkerState,
} from "../../lib/types/taskTypes.js";
import { TASK_DEFAULTS } from "../../lib/types/taskTypes.js";
import {
  StateFileManager,
  isProcessRunning,
  formatUptime,
  getNeuroLinkDir,
  ensureStateDir,
} from "../utils/serverUtils.js";

const workerState = new StateFileManager<WorkerState>("task-worker-state.json");

/**
 * Parse human-readable duration to milliseconds.
 * Supports: 30s, 5m, 2h, 1d, or raw ms number.
 */
function parseDuration(input: string): number {
  const match = input.match(/^(\d+(?:\.\d+)?)\s*(s|m|h|d)?$/i);
  if (!match) {
    const num = Number(input);
    if (isNaN(num)) {
      throw new Error(`Invalid duration: "${input}"`);
    }
    return num;
  }

  const value = parseFloat(match[1]);
  const unit = (match[2] ?? "").toLowerCase();

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      return value;
  }
}

export class TaskCommandFactory {
  static createTaskCommands(): CommandModule {
    return {
      command: "task <subcommand>",
      describe: "Manage scheduled and self-running tasks",
      builder: (yargs) => {
        return yargs
          .command(
            "create",
            "Create a scheduled task",
            (y) =>
              y
                .option("name", {
                  type: "string",
                  description: "Task name",
                  demandOption: true,
                })
                .option("prompt", {
                  type: "string",
                  description: "Prompt to execute on each run",
                  demandOption: true,
                })
                .option("cron", {
                  type: "string",
                  description:
                    'Cron expression (e.g. "0 9 * * *"). Mutually exclusive with --every and --at.',
                })
                .option("timezone", {
                  type: "string",
                  description:
                    'IANA timezone for cron (e.g. "America/New_York")',
                })
                .option("every", {
                  type: "string",
                  description:
                    "Interval duration (e.g. 30s, 5m, 2h, 1d). Mutually exclusive with --cron and --at.",
                })
                .option("at", {
                  type: "string",
                  description:
                    "ISO 8601 timestamp for one-shot (e.g. 2026-04-01T14:00:00Z). Mutually exclusive with --cron and --every.",
                })
                .option("mode", {
                  type: "string",
                  choices: ["isolated", "continuation"],
                  default: "isolated",
                  description:
                    '"isolated" = fresh context per run. "continuation" = preserves history across runs.',
                })
                .option("provider", {
                  type: "string",
                  description: "AI provider override",
                })
                .option("model", {
                  type: "string",
                  description: "Model override",
                })
                .option("max-runs", {
                  type: "number",
                  description: "Maximum number of executions",
                })
                .option("max-tokens", {
                  type: "number",
                  description: "Max tokens per AI response",
                })
                .option("temperature", {
                  type: "number",
                  description: "Temperature (0-2)",
                })
                .option("system-prompt", {
                  type: "string",
                  description: "System prompt override",
                })
                .check((argv) => {
                  const scheduleFlags = [argv.cron, argv.every, argv.at].filter(
                    Boolean,
                  );
                  if (scheduleFlags.length === 0) {
                    throw new Error(
                      "Must specify one of: --cron, --every, or --at",
                    );
                  }
                  if (scheduleFlags.length > 1) {
                    throw new Error(
                      "Only one of --cron, --every, or --at can be used",
                    );
                  }
                  return true;
                }),
            async (argv) => {
              await TaskCommandFactory.executeCreate(argv as CreateArgs);
            },
          )
          .command(
            "list",
            "List all tasks",
            (y) =>
              y.option("status", {
                type: "string",
                choices: [
                  "active",
                  "paused",
                  "completed",
                  "failed",
                  "cancelled",
                  "pending",
                ],
                description: "Filter by status",
              }),
            async (argv) => {
              await TaskCommandFactory.executeList(argv as { status?: string });
            },
          )
          .command(
            "get <task-id>",
            "Show details of a task",
            (y) =>
              y.positional("task-id", {
                type: "string" as const,
                description: "Task ID",
                demandOption: true,
              }),
            async (argv) => {
              await TaskCommandFactory.executeGet(argv as { taskId: string });
            },
          )
          .command(
            "run <task-id>",
            "Run a task immediately",
            (y) =>
              y.positional("task-id", {
                type: "string" as const,
                description: "Task ID",
                demandOption: true,
              }),
            async (argv) => {
              await TaskCommandFactory.executeRun(argv as { taskId: string });
            },
          )
          .command(
            "pause <task-id>",
            "Pause a scheduled task",
            (y) =>
              y.positional("task-id", {
                type: "string" as const,
                description: "Task ID",
                demandOption: true,
              }),
            async (argv) => {
              await TaskCommandFactory.executePause(argv as { taskId: string });
            },
          )
          .command(
            "resume <task-id>",
            "Resume a paused task",
            (y) =>
              y.positional("task-id", {
                type: "string" as const,
                description: "Task ID",
                demandOption: true,
              }),
            async (argv) => {
              await TaskCommandFactory.executeResume(
                argv as { taskId: string },
              );
            },
          )
          .command(
            "update <task-id>",
            "Update a task",
            (y) =>
              y
                .positional("task-id", {
                  type: "string" as const,
                  description: "Task ID",
                  demandOption: true,
                })
                .option("prompt", { type: "string", description: "New prompt" })
                .option("cron", {
                  type: "string",
                  description: "New cron expression",
                })
                .option("every", {
                  type: "string",
                  description: "New interval duration",
                })
                .option("at", {
                  type: "string",
                  description: "New one-shot timestamp",
                })
                .option("mode", {
                  type: "string",
                  choices: ["isolated", "continuation"],
                  description: "New execution mode",
                }),
            async (argv) => {
              await TaskCommandFactory.executeUpdate(argv as UpdateArgs);
            },
          )
          .command(
            "delete <task-id>",
            "Delete a task",
            (y) =>
              y.positional("task-id", {
                type: "string" as const,
                description: "Task ID",
                demandOption: true,
              }),
            async (argv) => {
              await TaskCommandFactory.executeDelete(
                argv as { taskId: string },
              );
            },
          )
          .command(
            "logs <task-id>",
            "View run history for a task",
            (y) =>
              y
                .positional("task-id", {
                  type: "string" as const,
                  description: "Task ID",
                  demandOption: true,
                })
                .option("limit", {
                  type: "number",
                  default: 20,
                  description: "Max entries to show",
                })
                .option("status", {
                  type: "string",
                  choices: ["success", "error"],
                  description: "Filter by run status",
                })
                .option("full", {
                  type: "boolean",
                  default: false,
                  description: "Show full output (no truncation)",
                }),
            async (argv) => {
              await TaskCommandFactory.executeLogs(argv as LogsArgs);
            },
          )
          .command(
            "start",
            "Start task worker — keeps process alive to execute scheduled tasks",
            (y) =>
              y.option("daemon", {
                type: "boolean",
                alias: "d",
                default: false,
                description:
                  "Run worker as a background daemon (detached process)",
              }),
            async (argv) => {
              await TaskCommandFactory.executeStart(
                argv as { daemon: boolean },
              );
            },
          )
          .command(
            "stop",
            "Stop the background task worker daemon",
            () => {},
            async () => {
              await TaskCommandFactory.executeStop();
            },
          )
          .command(
            "status",
            "Show task worker status",
            () => {},
            async () => {
              await TaskCommandFactory.executeStatus();
            },
          )
          .command({
            // Hidden subcommand — spawned by `task start --daemon`
            command: "_worker",
            describe: false,
            handler: async () => {
              await TaskCommandFactory.executeWorkerProcess();
            },
          })
          .demandCommand(1, "Please specify a task subcommand");
      },
      handler: () => {},
    };
  }

  // ── Helpers ──────────────────────────────────────────────

  /**
   * Get a full NeuroLink instance (with MCP, tools, providers).
   * Used only by commands that execute AI: run, start/_worker.
   */
  private static async getNeuroLink() {
    const { NeuroLink } = await import("../../lib/neurolink.js");
    return new NeuroLink();
  }

  /**
   * Get a direct TaskStore instance for pure store operations.
   * Bypasses NeuroLink entirely — no MCP, no providers, no tools.
   * Respects the same backend selection as TaskManager so both paths
   * read/write the same store (Redis for bullmq, file for node-timeout).
   *
   * Used by all management commands: create, list, get, delete, logs, pause, resume, update.
   */
  private static async getStore(config?: TaskManagerConfig) {
    const backendName = config?.backend ?? TASK_DEFAULTS.backend;

    if (backendName === "bullmq") {
      const { RedisTaskStore } =
        await import("../../lib/tasks/store/redisTaskStore.js");
      const store = new RedisTaskStore(config ?? {});
      await store.initialize();
      return store;
    }

    const { FileTaskStore } =
      await import("../../lib/tasks/store/fileTaskStore.js");
    const store = new FileTaskStore(config ?? {});
    await store.initialize();
    return store;
  }

  /** Attach event listeners and keep the process alive for scheduled task execution */
  private static enterWorkerMode(
    neurolink: {
      getEventEmitter():
        | { on(event: string, fn: (...args: unknown[]) => void): void }
        | undefined;
    },
    manager: { shutdown(): Promise<void> },
  ): void {
    console.info(
      chalk.gray("  Worker running. Tasks will auto-execute on schedule."),
    );
    console.info(chalk.gray("  Press Ctrl+C to stop.\n"));

    // Log task events in real-time via the public API
    const emitter = neurolink.getEventEmitter();
    if (emitter) {
      emitter.on("task:completed", (result: unknown) => {
        const r = result as {
          taskId: string;
          output?: string;
          durationMs?: number;
        };
        const preview = r.output
          ? r.output.length > 120
            ? r.output.slice(0, 120).replace(/\n/g, " ") + "..."
            : r.output.replace(/\n/g, " ")
          : "(no output)";
        console.info(
          `  ${chalk.green("✔")} ${chalk.dim(new Date().toLocaleTimeString())} ${chalk.cyan(r.taskId)} — ${r.durationMs}ms`,
        );
        console.info(`    ${chalk.gray(preview)}`);
      });
      emitter.on("task:failed", (result: unknown) => {
        const r = result as { taskId: string; error?: string };
        console.info(
          `  ${chalk.red("✘")} ${chalk.dim(new Date().toLocaleTimeString())} ${chalk.cyan(r.taskId)} — ${chalk.red(r.error?.slice(0, 100) || "unknown error")}`,
        );
      });
    }

    // Graceful shutdown on Ctrl+C
    const shutdown = async () => {
      console.info(chalk.yellow("\n  Shutting down..."));
      await manager.shutdown();
      // Clean up worker state if we are the daemon
      const state = workerState.load();
      if (state && state.pid === process.pid) {
        workerState.clear();
      }
      process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  }

  // ── Command Handlers ────────────────────────────────────

  /**
   * Create — pure store write, no NeuroLink needed.
   * Builds the Task object directly, saves to the task store, exits immediately.
   */
  private static async executeCreate(argv: CreateArgs): Promise<void> {
    const spinner = ora("Creating task...").start();

    try {
      // Build schedule
      let schedule: TaskSchedule;
      if (argv.cron) {
        schedule = {
          type: "cron",
          expression: argv.cron,
          ...(argv.timezone ? { timezone: argv.timezone } : {}),
        };
      } else if (argv.every) {
        schedule = { type: "interval", every: parseDuration(argv.every) };
      } else {
        schedule = { type: "once", at: argv.at! };
      }

      const now = new Date().toISOString();
      const mode = (argv.mode as TaskExecutionMode) ?? TASK_DEFAULTS.mode;

      const task: Task = {
        id: `task_${nanoid(12)}`,
        name: argv.name,
        prompt: argv.prompt,
        schedule,
        mode,
        status: "active",
        tools: TASK_DEFAULTS.tools,
        timeout: TASK_DEFAULTS.timeout,
        retry: {
          maxAttempts: TASK_DEFAULTS.retry.maxAttempts,
          backoffMs: [...TASK_DEFAULTS.retry.backoffMs],
        },
        runCount: 0,
        createdAt: now,
        updatedAt: now,
        ...(mode === "continuation"
          ? { sessionId: `session_${nanoid(12)}` }
          : {}),
        ...(argv.provider ? { provider: argv.provider } : {}),
        ...(argv.model ? { model: argv.model } : {}),
        ...(argv.maxRuns ? { maxRuns: argv.maxRuns } : {}),
        ...(argv.maxTokens ? { maxTokens: argv.maxTokens } : {}),
        ...(argv.temperature !== undefined
          ? { temperature: argv.temperature }
          : {}),
        ...(argv.systemPrompt ? { systemPrompt: argv.systemPrompt } : {}),
      };

      // Write directly to store — no NeuroLink, no MCP, no providers
      const store = await TaskCommandFactory.getStore();
      await store.save(task);
      await store.shutdown();

      spinner.succeed(chalk.green("Task created"));
      console.info();
      console.info(`  ${chalk.bold("ID:")}       ${task.id}`);
      console.info(`  ${chalk.bold("Name:")}     ${task.name}`);
      console.info(`  ${chalk.bold("Status:")}   ${task.status}`);
      console.info(`  ${chalk.bold("Mode:")}     ${task.mode}`);
      console.info(
        `  ${chalk.bold("Schedule:")} ${formatSchedule(task.schedule)}`,
      );
      console.info();
      console.info(
        chalk.dim(
          "  Run `neurolink task start` to start the worker and execute scheduled tasks.",
        ),
      );
    } catch (error) {
      spinner.fail(chalk.red("Failed to create task"));
      console.error(
        chalk.red(error instanceof Error ? error.message : String(error)),
      );
      process.exit(1);
    }
  }

  private static async executeList(argv: { status?: string }): Promise<void> {
    const spinner = ora("Loading tasks...").start();

    try {
      const store = await TaskCommandFactory.getStore();
      const tasks = await store.list(
        argv.status ? { status: argv.status as TaskStatus } : undefined,
      );

      spinner.stop();

      if (tasks.length === 0) {
        console.info(chalk.dim("No tasks found."));
        await store.shutdown();
        return;
      }

      // Show worker status inline
      const state = workerState.load();
      const workerRunning = state ? isProcessRunning(state.pid) : false;

      console.info(
        chalk.bold(
          `\nTasks (${tasks.length})  ${workerRunning ? chalk.green("● worker running") : chalk.dim("○ worker stopped")}:\n`,
        ),
      );

      for (const task of tasks) {
        const statusColor =
          task.status === "active"
            ? chalk.green
            : task.status === "paused"
              ? chalk.yellow
              : task.status === "failed"
                ? chalk.red
                : chalk.dim;

        console.info(`  ${chalk.bold(task.name)} ${chalk.dim(`(${task.id})`)}`);
        console.info(
          `    Status: ${statusColor(task.status)}  |  Mode: ${task.mode}  |  Runs: ${task.runCount}  |  Schedule: ${formatSchedule(task.schedule)}`,
        );
        if (task.lastRunAt) {
          console.info(`    Last run: ${chalk.dim(task.lastRunAt)}`);
        }
        console.info();
      }

      await store.shutdown();
    } catch (error) {
      spinner.fail(chalk.red("Failed to list tasks"));
      console.error(
        chalk.red(error instanceof Error ? error.message : String(error)),
      );
      process.exit(1);
    }
  }

  private static async executeGet(argv: { taskId: string }): Promise<void> {
    try {
      const store = await TaskCommandFactory.getStore();
      const task = await store.get(argv.taskId);

      if (!task) {
        console.info(chalk.red(`Task not found: ${argv.taskId}`));
        await store.shutdown();
        process.exit(1);
        return;
      }

      console.info();
      console.info(`  ${chalk.bold("ID:")}           ${task.id}`);
      console.info(`  ${chalk.bold("Name:")}         ${task.name}`);
      console.info(`  ${chalk.bold("Status:")}       ${task.status}`);
      console.info(`  ${chalk.bold("Mode:")}         ${task.mode}`);
      console.info(
        `  ${chalk.bold("Schedule:")}     ${formatSchedule(task.schedule)}`,
      );
      console.info(`  ${chalk.bold("Run count:")}    ${task.runCount}`);
      if (task.maxRuns) {
        console.info(`  ${chalk.bold("Max runs:")}     ${task.maxRuns}`);
      }
      if (task.provider) {
        console.info(`  ${chalk.bold("Provider:")}     ${task.provider}`);
      }
      if (task.model) {
        console.info(`  ${chalk.bold("Model:")}        ${task.model}`);
      }
      if (task.lastRunAt) {
        console.info(`  ${chalk.bold("Last run:")}     ${task.lastRunAt}`);
      }
      console.info(`  ${chalk.bold("Created:")}      ${task.createdAt}`);
      console.info(`  ${chalk.bold("Updated:")}      ${task.updatedAt}`);
      console.info(
        `  ${chalk.bold("Prompt:")}       ${task.prompt.slice(0, 200)}${task.prompt.length > 200 ? "..." : ""}`,
      );
      console.info();

      await store.shutdown();
    } catch (error) {
      console.error(
        chalk.red(error instanceof Error ? error.message : String(error)),
      );
      process.exit(1);
    }
  }

  private static async executeRun(argv: { taskId: string }): Promise<void> {
    const spinner = ora("Running task...").start();

    try {
      const neurolink = await TaskCommandFactory.getNeuroLink();
      const manager = neurolink.tasks;
      const result = await manager.run(argv.taskId);

      if (result.status === "success") {
        spinner.succeed(
          chalk.green(`Task completed in ${result.durationMs}ms`),
        );
        if (result.output) {
          console.info(`\n${result.output}\n`);
        }
      } else {
        spinner.fail(chalk.red(`Task failed: ${result.error}`));
      }

      await manager.shutdown();
    } catch (error) {
      spinner.fail(chalk.red("Failed to run task"));
      console.error(
        chalk.red(error instanceof Error ? error.message : String(error)),
      );
      process.exit(1);
    }
  }

  private static async executePause(argv: { taskId: string }): Promise<void> {
    try {
      const store = await TaskCommandFactory.getStore();
      const task = await store.get(argv.taskId);
      if (!task) {
        console.error(chalk.red(`Task not found: ${argv.taskId}`));
        await store.shutdown();
        process.exit(1);
        return;
      }
      if (task.status !== "active") {
        console.error(
          chalk.red(`Cannot pause task with status: ${task.status}`),
        );
        await store.shutdown();
        process.exit(1);
        return;
      }
      const updated = await store.update(argv.taskId, { status: "paused" });
      console.info(chalk.yellow(`Task "${updated.name}" paused.`));
      await store.shutdown();
    } catch (error) {
      console.error(
        chalk.red(error instanceof Error ? error.message : String(error)),
      );
      process.exit(1);
    }
  }

  private static async executeResume(argv: { taskId: string }): Promise<void> {
    try {
      const store = await TaskCommandFactory.getStore();
      const task = await store.get(argv.taskId);
      if (!task) {
        console.error(chalk.red(`Task not found: ${argv.taskId}`));
        await store.shutdown();
        process.exit(1);
        return;
      }
      if (task.status !== "paused") {
        console.error(
          chalk.red(`Cannot resume task with status: ${task.status}`),
        );
        await store.shutdown();
        process.exit(1);
        return;
      }
      const updated = await store.update(argv.taskId, { status: "active" });
      console.info(chalk.green(`Task "${updated.name}" resumed.`));
      await store.shutdown();
    } catch (error) {
      console.error(
        chalk.red(error instanceof Error ? error.message : String(error)),
      );
      process.exit(1);
    }
  }

  private static async executeUpdate(argv: UpdateArgs): Promise<void> {
    try {
      const store = await TaskCommandFactory.getStore();

      // Validate mutual exclusivity of schedule flags
      const scheduleFlags = [argv.cron, argv.every, argv.at].filter(Boolean);
      if (scheduleFlags.length > 1) {
        console.error(
          chalk.red("Only one of --cron, --every, or --at can be used"),
        );
        await store.shutdown();
        process.exit(1);
        return;
      }

      const updates: Record<string, unknown> = {};
      if (argv.prompt) {
        updates.prompt = argv.prompt;
      }
      if (argv.mode) {
        updates.mode = argv.mode;
      }

      // Build schedule if any schedule flag is provided
      if (argv.cron) {
        updates.schedule = { type: "cron", expression: argv.cron };
      } else if (argv.every) {
        updates.schedule = {
          type: "interval",
          every: parseDuration(argv.every),
        };
      } else if (argv.at) {
        updates.schedule = { type: "once", at: argv.at };
      }

      if (Object.keys(updates).length === 0) {
        console.info(chalk.yellow("No updates specified."));
        await store.shutdown();
        return;
      }

      const task = await store.update(argv.taskId, updates);
      console.info(chalk.green(`Task "${task.name}" updated.`));
      await store.shutdown();
    } catch (error) {
      console.error(
        chalk.red(error instanceof Error ? error.message : String(error)),
      );
      process.exit(1);
    }
  }

  private static async executeDelete(argv: { taskId: string }): Promise<void> {
    try {
      const store = await TaskCommandFactory.getStore();
      await store.delete(argv.taskId);
      console.info(chalk.green(`Task ${argv.taskId} deleted.`));
      await store.shutdown();
    } catch (error) {
      console.error(
        chalk.red(error instanceof Error ? error.message : String(error)),
      );
      process.exit(1);
    }
  }

  private static async executeLogs(argv: LogsArgs): Promise<void> {
    try {
      const store = await TaskCommandFactory.getStore();
      const runs = await store.getRuns(argv.taskId, {
        limit: argv.limit,
        status: argv.status,
      });

      if (runs.length === 0) {
        console.info(chalk.dim("No runs found."));
        await store.shutdown();
        return;
      }

      console.info(chalk.bold(`\nRun history (${runs.length}):\n`));

      for (const run of runs) {
        const statusIcon =
          run.status === "success" ? chalk.green("✓") : chalk.red("✗");
        const duration = `${run.durationMs}ms`;

        console.info(
          `  ${statusIcon} ${chalk.dim(run.runId)}  ${chalk.dim(run.timestamp)}  ${duration}`,
        );
        if (run.error) {
          console.info(`    ${chalk.red(run.error)}`);
        }
        if (run.output) {
          if (argv.full) {
            console.info(`    ${run.output}`);
          } else {
            const preview =
              run.output.length > 120
                ? run.output.slice(0, 120) + "..."
                : run.output;
            console.info(`    ${chalk.dim(preview)}`);
          }
        }
      }
      console.info();

      await store.shutdown();
    } catch (error) {
      console.error(
        chalk.red(error instanceof Error ? error.message : String(error)),
      );
      process.exit(1);
    }
  }

  // ── Start / Stop / Status ──────────────────────────────

  private static async executeStart(argv: { daemon: boolean }): Promise<void> {
    // Check if daemon is already running
    const existing = workerState.load();
    if (existing && isProcessRunning(existing.pid)) {
      console.info(
        chalk.yellow(
          `Worker already running (PID ${existing.pid}, started ${existing.startedAt}).`,
        ),
      );
      console.info(chalk.dim("  Run `neurolink task stop` to stop it first."));
      return;
    }

    if (argv.daemon) {
      // Spawn detached worker process
      await TaskCommandFactory.spawnDaemon();
    } else {
      // Foreground worker
      await TaskCommandFactory.runForegroundWorker();
    }
  }

  private static async executeStop(): Promise<void> {
    const state = workerState.load();

    if (!state) {
      console.info(chalk.dim("No worker daemon is running."));
      return;
    }

    if (!isProcessRunning(state.pid)) {
      console.info(chalk.dim("Worker daemon is not running (stale state)."));
      workerState.clear();
      return;
    }

    try {
      process.kill(state.pid, "SIGTERM");
      console.info(chalk.green(`Worker daemon stopped (PID ${state.pid}).`));
      console.info(chalk.dim(`  Logs: ${state.logFile}`));
      workerState.clear();
    } catch (error) {
      console.error(
        chalk.red(
          `Failed to stop worker: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  private static async executeStatus(): Promise<void> {
    const state = workerState.load();

    if (!state) {
      console.info(chalk.dim("No worker daemon registered."));
      console.info(
        chalk.dim("  Run `neurolink task start --daemon` to start one."),
      );
      return;
    }

    const running = isProcessRunning(state.pid);

    console.info();
    console.info(
      `  ${chalk.bold("Status:")}   ${running ? chalk.green("● running") : chalk.red("✘ stopped")}`,
    );
    console.info(`  ${chalk.bold("PID:")}      ${state.pid}`);
    console.info(`  ${chalk.bold("Started:")}  ${state.startedAt}`);
    if (running) {
      const uptimeMs = Date.now() - new Date(state.startedAt).getTime();
      console.info(`  ${chalk.bold("Uptime:")}   ${formatUptime(uptimeMs)}`);
    }
    console.info(`  ${chalk.bold("Logs:")}     ${state.logFile}`);
    console.info();

    if (!running) {
      workerState.clear();
    }
  }

  // ── Daemon Spawn ───────────────────────────────────────

  private static async spawnDaemon(): Promise<void> {
    const entryScript = process.argv[1];
    if (!entryScript) {
      console.error(chalk.red("Cannot determine CLI entry point."));
      process.exit(1);
      return;
    }

    // Set up log file
    ensureStateDir();
    const logsDir = join(getNeuroLinkDir(), "logs");
    mkdirSync(logsDir, { recursive: true });
    const logFile = join(logsDir, "task-worker.log");
    const logFd = openSync(logFile, "a");

    const args = [entryScript, "task", "_worker"];

    const child = spawn(process.execPath, args, {
      detached: true,
      stdio: ["ignore", logFd, logFd],
      cwd: process.cwd(),
      env: { ...process.env },
    });

    child.unref();

    const pid = child.pid;
    if (!pid) {
      console.error(chalk.red("Failed to spawn worker daemon."));
      process.exit(1);
      return;
    }

    workerState.save({
      pid,
      startedAt: new Date().toISOString(),
      logFile,
    });

    console.info(chalk.green(`Worker daemon started (PID ${pid}).`));
    console.info(chalk.dim(`  Logs: ${logFile}`));
    console.info(chalk.dim("  Run `neurolink task stop` to stop it."));
    console.info(chalk.dim("  Run `neurolink task status` to check on it."));
  }

  // ── Foreground Worker ──────────────────────────────────

  private static async runForegroundWorker(): Promise<void> {
    const neurolink = await TaskCommandFactory.getNeuroLink();
    const manager = neurolink.tasks;

    // Trigger initialization and list active tasks
    const tasks = await manager.list({ status: "active" });

    console.info(chalk.bold("\n  NeuroLink Task Worker"));
    console.info(chalk.gray("  ─────────────────────────────────"));
    console.info(`  Active tasks: ${chalk.cyan(String(tasks.length))}`);
    for (const t of tasks) {
      console.info(
        `    ${chalk.gray("•")} ${t.name} (${chalk.dim(t.id)}) — ${formatSchedule(t.schedule)}`,
      );
    }
    if (tasks.length === 0) {
      console.info(
        chalk.yellow(
          "\n  No active tasks. Create one first with: neurolink task create",
        ),
      );
      await manager.shutdown();
      return;
    }
    console.info();

    TaskCommandFactory.enterWorkerMode(neurolink, manager);
    await new Promise(() => {}); // Block forever until Ctrl+C
  }

  // ── Hidden _worker process (spawned by --daemon) ───────

  private static async executeWorkerProcess(): Promise<void> {
    // This runs in the detached child process
    const neurolink = await TaskCommandFactory.getNeuroLink();
    const manager = neurolink.tasks;

    const tasks = await manager.list({ status: "active" });
    console.info(
      `[task-worker] Started at ${new Date().toISOString()}, active tasks: ${tasks.length}`,
    );
    for (const t of tasks) {
      console.info(
        `[task-worker]   ${t.name} (${t.id}) — ${formatSchedule(t.schedule)}`,
      );
    }

    if (tasks.length === 0) {
      console.info("[task-worker] No active tasks, exiting.");
      workerState.clear();
      await manager.shutdown();
      return;
    }

    // Listen for task events (logged to file since stdio goes to log)
    const emitter = neurolink.getEventEmitter();
    if (emitter) {
      emitter.on("task:completed", (result: unknown) => {
        const r = result as {
          taskId: string;
          output?: string;
          durationMs?: number;
        };
        const preview = r.output
          ? r.output.length > 200
            ? r.output.slice(0, 200) + "..."
            : r.output
          : "(no output)";
        console.info(
          `[task-worker] ✔ ${new Date().toISOString()} ${r.taskId} — ${r.durationMs}ms — ${preview}`,
        );
      });
      emitter.on("task:failed", (result: unknown) => {
        const r = result as { taskId: string; error?: string };
        console.error(
          `[task-worker] ✘ ${new Date().toISOString()} ${r.taskId} — ${r.error?.slice(0, 200) || "unknown error"}`,
        );
      });
    }

    // Graceful shutdown
    const shutdown = async () => {
      console.info(
        `[task-worker] Shutting down at ${new Date().toISOString()}`,
      );
      await manager.shutdown();
      workerState.clear();
      process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    // Block forever
    await new Promise(() => {});
  }
}

// ── Helpers ─────────────────────────────────────────────

function formatSchedule(schedule: TaskSchedule): string {
  if (schedule.type === "cron") {
    return `cron "${schedule.expression}"${schedule.timezone ? ` (${schedule.timezone})` : ""}`;
  }
  if (schedule.type === "interval") {
    return `every ${formatDuration(schedule.every)}`;
  }
  return `once at ${typeof schedule.at === "string" ? schedule.at : schedule.at.toISOString()}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60_000) {
    return `${ms / 1000}s`;
  }
  if (ms < 3_600_000) {
    return `${ms / 60_000}m`;
  }
  if (ms < 86_400_000) {
    return `${ms / 3_600_000}h`;
  }
  return `${ms / 86_400_000}d`;
}

// ── Arg Types ───────────────────────────────────────────

type CreateArgs = {
  name: string;
  prompt: string;
  cron?: string;
  timezone?: string;
  every?: string;
  at?: string;
  mode: string;
  provider?: string;
  model?: string;
  maxRuns?: number;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
};

type UpdateArgs = {
  taskId: string;
  prompt?: string;
  cron?: string;
  every?: string;
  at?: string;
  mode?: string;
};

type LogsArgs = {
  taskId: string;
  limit: number;
  status?: string;
  full?: boolean;
};
