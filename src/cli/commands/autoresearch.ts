/**
 * AutoResearch CLI Commands for NeuroLink
 *
 * - neurolink autoresearch init    — Initialize autoresearch for a repo
 * - neurolink autoresearch status  — Show current research state
 * - neurolink autoresearch results — Show experiment results
 * - neurolink autoresearch run-once — Run one experiment cycle
 * - neurolink autoresearch start   — Start a scheduled autoresearch task
 * - neurolink autoresearch pause   — Pause a running autoresearch task
 * - neurolink autoresearch resume  — Resume a paused autoresearch task
 * - neurolink autoresearch stop    — Stop and cancel an autoresearch task
 * - neurolink autoresearch reset   — Reset autoresearch state for a repo
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import chalk from "chalk";
import ora from "ora";
import type { CommandModule } from "yargs";
import type {
  MetricDirection,
  ResearchConfig,
  ResearchState,
} from "../../lib/types/autoresearchTypes.js";
import type { TaskManagerConfig } from "../../lib/types/index.js";
import { TASK_DEFAULTS } from "../../lib/types/index.js";

export class AutoresearchCommandFactory {
  static createAutoresearchCommands(): CommandModule {
    return {
      command: "autoresearch <subcommand>",
      describe: "Run automated AI-driven research experiments",
      builder: (yargs) => {
        return yargs
          .command(
            "init <repoPath>",
            "Initialize autoresearch for a repository",
            (y) =>
              y
                .positional("repoPath", {
                  type: "string" as const,
                  description: "Path to the repository",
                  demandOption: true,
                })
                .option("tag", {
                  type: "string",
                  alias: "t",
                  description: "Run tag (e.g. apr3)",
                  demandOption: true,
                })
                .option("target", {
                  type: "string",
                  default: "train.py",
                  description: "Mutable file(s), comma-separated",
                })
                .option("immutable", {
                  type: "string",
                  default: "",
                  description: "Immutable file(s), comma-separated",
                })
                .option("run-command", {
                  type: "string",
                  description: "Experiment command to execute",
                  demandOption: true,
                })
                .option("metric-name", {
                  type: "string",
                  default: "val_bpb",
                })
                .option("metric-pattern", {
                  type: "string",
                  default: "^val_bpb:\\s+([\\d.]+)",
                })
                .option("metric-direction", {
                  type: "string",
                  choices: ["lower", "higher"] as const,
                  default: "lower",
                })
                .option("timeout", { type: "number", default: 600 })
                .option("provider", { type: "string" })
                .option("model", { type: "string" }),
            async (argv) => {
              await AutoresearchCommandFactory.executeInit(argv as InitArgs);
            },
          )
          .command(
            "status [repoPath]",
            "Show current research state",
            (y) =>
              y
                .positional("repoPath", {
                  type: "string" as const,
                  default: ".",
                })
                .option("format", {
                  type: "string",
                  choices: ["text", "json"] as const,
                  default: "text",
                }),
            async (argv) => {
              await AutoresearchCommandFactory.executeStatus(
                argv as { repoPath: string; format: string },
              );
            },
          )
          .command(
            "results [repoPath]",
            "Show experiment results",
            (y) =>
              y
                .positional("repoPath", {
                  type: "string" as const,
                  default: ".",
                })
                .option("last", { type: "number", default: 20 })
                .option("format", {
                  type: "string",
                  choices: ["text", "json", "table"] as const,
                  default: "table",
                }),
            async (argv) => {
              await AutoresearchCommandFactory.executeResults(
                argv as { repoPath: string; last: number; format: string },
              );
            },
          )
          .command(
            "run-once [repoPath]",
            "Run one experiment cycle",
            (y) =>
              y
                .positional("repoPath", {
                  type: "string" as const,
                  default: ".",
                })
                .option("description", {
                  type: "string",
                  default: "manual run",
                }),
            async (argv) => {
              await AutoresearchCommandFactory.executeRunOnce(
                argv as { repoPath: string; description: string },
              );
            },
          )
          .command(
            "start <repoPath>",
            "Start a scheduled autoresearch task via TaskManager",
            (y) =>
              y
                .positional("repoPath", {
                  type: "string" as const,
                  description: "Path to the repository",
                  demandOption: true,
                })
                .option("interval", {
                  type: "number",
                  default: 300,
                  description: "Interval between ticks in seconds",
                })
                .option("max-runs", {
                  type: "number",
                  description: "Max experiment ticks (omit for unlimited)",
                }),
            async (argv) => {
              await AutoresearchCommandFactory.executeStart(
                argv as {
                  repoPath: string;
                  interval: number;
                  maxRuns?: number;
                },
              );
            },
          )
          .command(
            "pause <taskId>",
            "Pause a running autoresearch task",
            (y) =>
              y.positional("taskId", {
                type: "string" as const,
                description: "Task ID to pause",
                demandOption: true,
              }),
            async (argv) => {
              await AutoresearchCommandFactory.executeLifecycle(
                argv.taskId as string,
                "pause",
              );
            },
          )
          .command(
            "resume <taskId>",
            "Resume a paused autoresearch task",
            (y) =>
              y.positional("taskId", {
                type: "string" as const,
                description: "Task ID to resume",
                demandOption: true,
              }),
            async (argv) => {
              await AutoresearchCommandFactory.executeLifecycle(
                argv.taskId as string,
                "resume",
              );
            },
          )
          .command(
            "stop <taskId>",
            "Stop and cancel an autoresearch task",
            (y) =>
              y.positional("taskId", {
                type: "string" as const,
                description: "Task ID to stop",
                demandOption: true,
              }),
            async (argv) => {
              await AutoresearchCommandFactory.executeLifecycle(
                argv.taskId as string,
                "stop",
              );
            },
          )
          .command(
            "reset [repoPath]",
            "Reset autoresearch state for a repository",
            (y) =>
              y.positional("repoPath", {
                type: "string" as const,
                default: ".",
              }),
            async (argv) => {
              await AutoresearchCommandFactory.executeReset(
                argv.repoPath as string,
              );
            },
          )
          .demandCommand(1, "Please specify an autoresearch subcommand");
      },
      handler: () => {},
    };
  }

  /**
   * Get a direct TaskStore instance for store operations.
   * Respects the same backend selection as TaskManager so both paths
   * read/write the same store (Redis for bullmq, file for node-timeout).
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

  private static async executeInit(argv: InitArgs): Promise<void> {
    const spinner = ora("Initializing autoresearch...").start();
    try {
      const repoPath = resolve(argv.repoPath);
      if (!existsSync(repoPath)) {
        spinner.fail(chalk.red(`Repository not found: ${repoPath}`));
        process.exit(1);
      }

      const { ResearchWorker } =
        await import("../../lib/autoresearch/worker.js");
      const mutablePaths = argv.target
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);
      const immutablePaths = argv.immutable
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);

      const worker = new ResearchWorker({
        repoPath,
        mutablePaths,
        immutablePaths,
        runCommand: argv.runCommand,
        metric: {
          name: argv.metricName,
          direction: argv.metricDirection as MetricDirection,
          pattern: argv.metricPattern,
        },
        timeoutMs: argv.timeout * 1000,
        provider: argv.provider,
        model: argv.model,
      });

      const state = await worker.initialize(argv.tag);

      // Persist config for run-once to read
      const configDir = resolve(repoPath, ".autoresearch");
      mkdirSync(configDir, { recursive: true });
      writeFileSync(
        resolve(configDir, "config.json"),
        JSON.stringify(
          {
            tag: argv.tag,
            mutablePaths,
            immutablePaths,
            runCommand: argv.runCommand,
            metric: {
              name: argv.metricName,
              direction: argv.metricDirection,
              pattern: argv.metricPattern,
            },
            timeoutMs: argv.timeout * 1000,
            provider: argv.provider,
            model: argv.model,
          },
          null,
          2,
        ),
        "utf-8",
      );

      spinner.succeed(chalk.green("Autoresearch initialized"));
      console.info(
        `  Branch: ${state.branch}  Tag: ${argv.tag}  Target: ${mutablePaths.join(", ")}`,
      );
    } catch (error) {
      spinner.fail(chalk.red("Failed to initialize"));
      console.error(
        chalk.red(error instanceof Error ? error.message : String(error)),
      );
      process.exit(1);
    }
  }

  private static async executeStatus(argv: {
    repoPath: string;
    format: string;
  }): Promise<void> {
    const repoPath = resolve(argv.repoPath);
    const statePath = resolve(repoPath, ".autoresearch", "state.json");
    if (!existsSync(statePath)) {
      console.info(
        chalk.yellow(
          "Not initialized. Run `neurolink autoresearch init` first.",
        ),
      );
      return;
    }
    let state: ResearchState;
    try {
      state = JSON.parse(readFileSync(statePath, "utf-8"));
    } catch (err) {
      console.error(chalk.red(`Failed to parse state file: ${statePath}`));
      console.error(
        chalk.dim(err instanceof Error ? err.message : String(err)),
      );
      return;
    }
    if (argv.format === "json") {
      console.info(JSON.stringify(state, null, 2));
      return;
    }
    console.info(
      `  Tag: ${state.tag}  Branch: ${state.branch}  Phase: ${state.currentPhase}`,
    );
    console.info(
      `  Runs: ${state.runCount}  Keeps: ${state.keepCount}  Best: ${state.bestMetric ?? "none"}`,
    );
  }

  private static async executeResults(argv: {
    repoPath: string;
    last: number;
    format: string;
  }): Promise<void> {
    const repoPath = resolve(argv.repoPath);
    const configPath = resolve(repoPath, ".autoresearch", "config.json");
    let resultsPath = resolve(repoPath, "results.tsv");
    if (existsSync(configPath)) {
      try {
        const config = JSON.parse(readFileSync(configPath, "utf-8"));
        if (config.resultsPath) {
          resultsPath = resolve(repoPath, config.resultsPath);
        }
      } catch {
        /* use default */
      }
    }
    if (!existsSync(resultsPath)) {
      console.info(chalk.yellow("No results file."));
      return;
    }
    const lines = readFileSync(resultsPath, "utf-8").trim().split("\n");
    if (lines.length < 2) {
      console.info(chalk.yellow("No results yet."));
      return;
    }
    const rows = lines.slice(1).slice(-argv.last);
    if (argv.format === "json") {
      console.info(
        JSON.stringify(
          rows.map((l) => l.split("\t")),
          null,
          2,
        ),
      );
      return;
    }
    console.info(lines[0]);
    for (const r of rows) {
      console.info(r);
    }
  }

  private static async executeRunOnce(argv: {
    repoPath: string;
    description: string;
  }): Promise<void> {
    const spinner = ora("Running experiment...").start();
    try {
      const repoPath = resolve(argv.repoPath);
      const configPath = resolve(repoPath, ".autoresearch", "config.json");
      if (!existsSync(configPath)) {
        spinner.fail(chalk.red("No config. Run init first."));
        process.exit(1);
      }
      let configRaw: Partial<ResearchConfig>;
      try {
        configRaw = JSON.parse(readFileSync(configPath, "utf-8"));
      } catch (err) {
        spinner.fail(chalk.red(`Failed to parse config: ${configPath}`));
        console.error(
          chalk.dim(err instanceof Error ? err.message : String(err)),
        );
        process.exit(1);
      }
      const { ResearchWorker } =
        await import("../../lib/autoresearch/worker.js");
      if (
        !configRaw.mutablePaths ||
        !configRaw.runCommand ||
        !configRaw.metric
      ) {
        spinner.fail(
          chalk.red(
            "Config missing required fields (mutablePaths, runCommand, metric)",
          ),
        );
        process.exit(1);
      }
      const worker = new ResearchWorker({
        repoPath,
        mutablePaths: configRaw.mutablePaths,
        runCommand: configRaw.runCommand,
        metric: configRaw.metric,
        ...configRaw,
      });
      await worker.resume();
      const record = await worker.runExperimentCycle(argv.description);
      const c =
        record.status === "keep"
          ? "green"
          : record.status === "discard"
            ? "yellow"
            : "red";
      spinner.succeed(
        chalk[c](
          `${record.status}: metric=${record.metric ?? "N/A"} commit=${record.commit}`,
        ),
      );
    } catch (error) {
      spinner.fail(
        chalk.red(error instanceof Error ? error.message : String(error)),
      );
      process.exit(1);
    }
  }

  /**
   * Start a scheduled autoresearch task via TaskManager.
   * Reads config.json from .autoresearch/ and creates a TaskManager task.
   */
  private static async executeStart(argv: {
    repoPath: string;
    interval: number;
    maxRuns?: number;
  }): Promise<void> {
    const spinner = ora("Starting autoresearch task...").start();
    try {
      const repoPath = resolve(argv.repoPath);
      const configPath = resolve(repoPath, ".autoresearch", "config.json");
      if (!existsSync(configPath)) {
        spinner.fail(
          chalk.red("No config. Run `neurolink autoresearch init` first."),
        );
        process.exit(1);
      }
      let configRaw: Partial<ResearchConfig>;
      try {
        configRaw = JSON.parse(readFileSync(configPath, "utf-8"));
      } catch (err) {
        spinner.fail(chalk.red(`Failed to parse config: ${configPath}`));
        console.error(
          chalk.dim(err instanceof Error ? err.message : String(err)),
        );
        process.exit(1);
      }

      // Dynamic import to avoid pulling NeuroLink into CLI cold path
      const { nanoid } = await import("nanoid");

      if (
        !configRaw.mutablePaths ||
        !configRaw.runCommand ||
        !configRaw.metric
      ) {
        spinner.fail(
          chalk.red(
            "Config missing required fields (mutablePaths, runCommand, metric)",
          ),
        );
        process.exit(1);
      }

      const store = await AutoresearchCommandFactory.getStore();

      const now = new Date().toISOString();
      const task = {
        id: `task_${nanoid(12)}`,
        name: `autoresearch-${repoPath.split("/").pop()}`,
        prompt: "Autonomous ML experiment loop",
        schedule: { type: "interval" as const, every: argv.interval * 1000 },
        mode: "isolated" as const,
        type: "autoresearch" as const,
        status: "active" as const,
        tools: true,
        timeout: configRaw.timeoutMs ?? 600_000,
        retry: { maxAttempts: 1, backoffMs: [60_000] },
        runCount: 0,
        createdAt: now,
        updatedAt: now,
        autoresearch: {
          repoPath,
          mutablePaths: configRaw.mutablePaths,
          runCommand: configRaw.runCommand,
          metric: configRaw.metric,
          ...(configRaw.immutablePaths?.length
            ? { immutablePaths: configRaw.immutablePaths }
            : {}),
          ...(configRaw.programPath
            ? { programPath: configRaw.programPath }
            : {}),
          ...(configRaw.resultsPath
            ? { resultsPath: configRaw.resultsPath }
            : {}),
          ...(configRaw.statePath ? { statePath: configRaw.statePath } : {}),
          ...(configRaw.logPath ? { logPath: configRaw.logPath } : {}),
          ...(configRaw.branchPrefix
            ? { branchPrefix: configRaw.branchPrefix }
            : {}),
          ...(configRaw.memoryMetric
            ? { memoryMetric: configRaw.memoryMetric }
            : {}),
          ...(configRaw.timeoutMs ? { timeoutMs: configRaw.timeoutMs } : {}),
          ...(configRaw.provider ? { provider: configRaw.provider } : {}),
          ...(configRaw.model ? { model: configRaw.model } : {}),
          ...(configRaw.thinkingLevel
            ? { thinkingLevel: configRaw.thinkingLevel }
            : {}),
          ...(configRaw.maxExperiments
            ? { maxExperiments: configRaw.maxExperiments }
            : {}),
        },
        ...(argv.maxRuns ? { maxRuns: argv.maxRuns } : {}),
      };

      await store.save(task);
      await store.shutdown();

      spinner.succeed(chalk.green(`Autoresearch task created: ${task.id}`));
      console.info(
        `  Interval: ${argv.interval}s  Max runs: ${argv.maxRuns ?? "unlimited"}`,
      );
      console.info(
        chalk.dim(
          "  Note: Start the task worker with `neurolink task start` to begin execution.",
        ),
      );
    } catch (error) {
      spinner.fail(
        chalk.red(error instanceof Error ? error.message : String(error)),
      );
      process.exit(1);
    }
  }

  /**
   * Lifecycle operations: pause, resume, stop.
   * Reads from the file task store and updates task status.
   */
  private static async executeLifecycle(
    taskId: string,
    action: "pause" | "resume" | "stop",
  ): Promise<void> {
    const spinner = ora(`${action}ing task ${taskId}...`).start();
    try {
      const store = await AutoresearchCommandFactory.getStore();

      const task = await store.get(taskId);
      if (!task) {
        spinner.fail(chalk.red(`Task not found: ${taskId}`));
        process.exit(1);
      }
      if (task.type !== "autoresearch") {
        spinner.fail(
          chalk.red(
            `Task ${taskId} is not an autoresearch task (type: ${task.type})`,
          ),
        );
        process.exit(1);
      }

      let newStatus: string;
      if (action === "pause") {
        if (task.status !== "active") {
          spinner.fail(
            chalk.red(`Cannot pause task with status: ${task.status}`),
          );
          process.exit(1);
        }
        newStatus = "paused";
      } else if (action === "resume") {
        if (task.status !== "paused") {
          spinner.fail(
            chalk.red(`Cannot resume task with status: ${task.status}`),
          );
          process.exit(1);
        }
        newStatus = "active";
      } else {
        // stop
        newStatus = "cancelled";
      }

      await store.update(taskId, {
        status: newStatus as "active" | "paused" | "cancelled",
      });
      await store.shutdown();

      spinner.succeed(chalk.green(`Task ${taskId} → ${newStatus}`));
    } catch (error) {
      spinner.fail(
        chalk.red(error instanceof Error ? error.message : String(error)),
      );
      process.exit(1);
    }
  }

  /**
   * Reset autoresearch state by removing the .autoresearch directory.
   */
  private static async executeReset(repoPath: string): Promise<void> {
    const resolved = resolve(repoPath);
    const arDir = resolve(resolved, ".autoresearch");
    if (!existsSync(arDir)) {
      console.info(chalk.yellow("No .autoresearch directory found."));
      return;
    }
    rmSync(arDir, { recursive: true, force: true });
    console.info(chalk.green(`Reset autoresearch state for ${resolved}`));
  }
}

type InitArgs = {
  repoPath: string;
  tag: string;
  target: string;
  immutable: string;
  runCommand: string;
  metricName: string;
  metricPattern: string;
  metricDirection: string;
  timeout: number;
  provider?: string;
  model?: string;
};
