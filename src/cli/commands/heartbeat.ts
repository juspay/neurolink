/**
 * Heartbeat Loop CLI Commands for NeuroLink
 *
 * Implements commands for autonomous heartbeat loop execution:
 * - neurolink heartbeat run <goal>    - Run a heartbeat loop with a goal
 * - neurolink heartbeat status <id>   - Get status of a running loop
 * - neurolink heartbeat list          - List all active loops
 * - neurolink heartbeat stop <id>     - Stop a running loop
 * - neurolink heartbeat resume <id>   - Resume a paused loop
 */

import chalk from "chalk";
import ora from "ora";
import type { CommandModule } from "yargs";
import { NeuroLink } from "../../lib/neurolink.js";
import type {
  HeartbeatLoopConfig,
  LoopResult,
  LoopSnapshot,
} from "../../lib/agent/loopTypes.js";
import { FileCheckpointStore } from "../../lib/agent/checkpoints/fileCheckpoint.js";
import { LLMGoalEvaluator } from "../../lib/agent/goalEvaluator.js";
import type { HeartbeatLoop } from "../../lib/agent/heartbeatLoop.js";
import type { BaseCommandArgs } from "../../lib/types/cli.js";

// Registry to track active loops started from CLI
const activeLoops = new Map<
  string,
  { loop: HeartbeatLoop; result?: LoopResult }
>();

/**
 * Parse duration string to milliseconds
 * Supports: "5s", "1m", "2h", "30s"
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+(?:\.\d+)?)(s|m|h)?$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = parseFloat(match[1]);
  const unit = match[2] || "s";

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    default:
      return value;
  }
}

/**
 * Heartbeat CLI command factory
 */
export class HeartbeatCommandFactory {
  static createHeartbeatCommands(): CommandModule {
    return {
      command: "heartbeat <subcommand>",
      describe:
        "Run autonomous heartbeat loops that work toward goals over multiple iterations",
      builder: (yargs) => {
        return yargs
          .command(
            "run <goal>",
            "Run a heartbeat loop with a natural language goal",
            (y) =>
              y
                .positional("goal", {
                  type: "string" as const,
                  description: "Natural language goal for the loop to achieve",
                  demandOption: true,
                })
                .option("max-iterations", {
                  type: "number",
                  description: "Maximum number of iterations (default: 1000)",
                  default: 1000,
                })
                .option("max-duration", {
                  type: "string",
                  description:
                    "Maximum duration like '2h', '30m' (default: 4h)",
                  default: "4h",
                })
                .option("max-cost", {
                  type: "number",
                  description: "Maximum cost in USD",
                })
                .option("interval", {
                  type: "string",
                  description:
                    "Interval between iterations like '0s', '5s', '1m' (default: 0s)",
                  default: "0s",
                })
                .option("provider", {
                  type: "string",
                  description: "AI provider for iterations",
                  alias: "p",
                })
                .option("model", {
                  type: "string",
                  description: "Model for iterations",
                  alias: "m",
                })
                .option("context-mode", {
                  type: "string",
                  choices: ["continuation", "isolated"],
                  description:
                    "Context mode: continuation (default) or isolated",
                  default: "continuation",
                })
                .option("checkpoint", {
                  type: "boolean",
                  description: "Enable checkpointing for crash recovery",
                  default: true,
                })
                .option("output", {
                  type: "string",
                  description: "Save final result to file",
                  alias: "o",
                }),
            async (argv) => {
              await HeartbeatCommandFactory.executeRun(
                argv as BaseCommandArgs & {
                  goal: string;
                  maxIterations: number;
                  maxDuration: string;
                  maxCost?: number;
                  interval: string;
                  provider?: string;
                  model?: string;
                  contextMode: string;
                  checkpoint: boolean;
                  output?: string;
                },
              );
            },
          )
          .command(
            "status <id>",
            "Get the status of a running heartbeat loop",
            (y) =>
              y.positional("id", {
                type: "string" as const,
                description: "Loop ID",
                demandOption: true,
              }),
            async (argv) => {
              await HeartbeatCommandFactory.executeStatus(
                argv as BaseCommandArgs & { id: string },
              );
            },
          )
          .command(
            "list",
            "List all active heartbeat loops",
            (y) => y,
            async () => {
              await HeartbeatCommandFactory.executeList();
            },
          )
          .command(
            "stop <id>",
            "Stop a running heartbeat loop (pause or cancel)",
            (y) =>
              y
                .positional("id", {
                  type: "string" as const,
                  description: "Loop ID",
                  demandOption: true,
                })
                .option("cancel", {
                  type: "boolean",
                  description: "Cancel permanently (default: pause)",
                  default: false,
                }),
            async (argv) => {
              await HeartbeatCommandFactory.executeStop(
                argv as BaseCommandArgs & { id: string; cancel: boolean },
              );
            },
          )
          .command(
            "resume <id>",
            "Resume a paused heartbeat loop from its last checkpoint",
            (y) =>
              y.positional("id", {
                type: "string" as const,
                description: "Loop ID",
                demandOption: true,
              }),
            async (argv) => {
              await HeartbeatCommandFactory.executeResume(
                argv as BaseCommandArgs & { id: string },
              );
            },
          )
          .demandCommand(1, "Please specify a heartbeat subcommand");
      },
      handler: () => {},
    };
  }

  /**
   * Execute a heartbeat loop run
   */
  private static async executeRun(
    args: BaseCommandArgs & {
      goal: string;
      maxIterations: number;
      maxDuration: string;
      maxCost?: number;
      interval: string;
      provider?: string;
      model?: string;
      contextMode: string;
      checkpoint: boolean;
      output?: string;
    },
  ): Promise<void> {
    const spinner = ora("Initializing heartbeat loop...").start();

    try {
      const neurolink = new NeuroLink();

      // Parse duration
      const maxDurationMs = parseDuration(args.maxDuration);
      const intervalMs = parseDuration(args.interval);

      // Build config
      const stepOptions = {
        ...(args.provider && { provider: args.provider }),
        ...(args.model && { model: args.model }),
      };

      const config: HeartbeatLoopConfig = {
        goal: args.goal,
        maxIterations: args.maxIterations,
        maxDurationMs,
        ...(args.maxCost && { maxTotalCostUsd: args.maxCost }),
        trigger:
          intervalMs > 0
            ? { type: "timer", intervalMs }
            : { type: "timer", intervalMs: 0 },
        contextMode: { type: args.contextMode as "continuation" | "isolated" },
        ...(args.checkpoint && { checkpointStore: new FileCheckpointStore() }),
        stepOptions,
        // Create goal evaluator with same provider settings
        goalEvaluator: new LLMGoalEvaluator(neurolink, stepOptions),
      };

      spinner.succeed("Heartbeat loop initialized");
      console.info(chalk.bold("\nGoal:"), chalk.cyan(args.goal));
      console.info(chalk.gray(`Max iterations: ${args.maxIterations}`));
      console.info(chalk.gray(`Max duration: ${args.maxDuration}`));
      console.info(chalk.gray(`Context mode: ${args.contextMode}`));
      console.info(
        chalk.gray(
          `Checkpointing: ${args.checkpoint ? "enabled" : "disabled"}\n`,
        ),
      );

      // Run the heartbeat loop
      const result = await neurolink.heartbeat(config);

      // Display results
      console.info(chalk.bold("\n" + "=".repeat(60)));
      console.info(chalk.bold("Heartbeat Loop Complete\n"));
      console.info(chalk.bold("Status:"), this.formatStatus(result.status));
      console.info(chalk.bold("Iterations:"), result.iteration);
      console.info(chalk.bold("Loop ID:"), result.loopId);

      if (result.totalCostUsd > 0) {
        console.info(chalk.bold("Cost:"), `$${result.totalCostUsd.toFixed(4)}`);
      }
      if (result.totalTokensUsed > 0) {
        console.info(
          chalk.bold("Tokens:"),
          result.totalTokensUsed.toLocaleString(),
        );
      }
      if (result.elapsedMs > 0) {
        const elapsedSec = (result.elapsedMs / 1000).toFixed(1);
        console.info(chalk.bold("Elapsed:"), `${elapsedSec}s`);
      }

      if (result.finalMessage) {
        console.info(chalk.bold("\nResult:\n"));
        console.info(result.finalMessage);
      }

      // Save to file if requested
      if (args.output) {
        const fs = await import("fs");
        const output = {
          ...result,
          finalMessage: result.finalMessage || undefined,
        };
        fs.writeFileSync(args.output, JSON.stringify(output, null, 2));
        console.info(chalk.gray(`\nResult saved to: ${args.output}`));
      }

      // Exit with appropriate code
      if (result.status === "failed") {
        process.exit(1);
      }
    } catch (error) {
      spinner.fail("Heartbeat loop failed");
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`\nError: ${message}`));
      process.exit(1);
    }
  }

  /**
   * Get status of a loop
   */
  private static async executeStatus(
    args: BaseCommandArgs & { id: string },
  ): Promise<void> {
    const entry = activeLoops.get(args.id);

    let snapshot: LoopSnapshot;
    let source = "memory";

    if (entry) {
      // Loop is running in current process
      snapshot = entry.loop.getSnapshot();
    } else {
      // Try to load from checkpoint file
      const checkpointStore = new FileCheckpointStore();
      const loaded = await checkpointStore.load(args.id);

      if (!loaded) {
        console.error(chalk.red(`No loop found with ID: ${args.id}`));
        console.info(
          chalk.gray("Use 'neurolink heartbeat list' to see active loops."),
        );
        process.exit(1);
      }

      snapshot = loaded;
      source = "checkpoint";
    }

    console.info(chalk.bold("\nHeartbeat Loop Status\n"));
    console.info(chalk.bold("Loop ID:"), snapshot.loopId);
    console.info(chalk.bold("Status:"), this.formatStatus(snapshot.status));
    if (source === "checkpoint") {
      console.info(chalk.gray("(loaded from checkpoint file)"));
    }
    console.info(chalk.bold("Goal:"), snapshot.goalText);
    console.info(chalk.bold("Iteration:"), snapshot.iteration);

    if (snapshot.goalProgress) {
      console.info(chalk.bold("Progress:"), snapshot.goalProgress);
    }
    if (snapshot.goalConfidence !== undefined) {
      console.info(
        chalk.bold("Confidence:"),
        `${(snapshot.goalConfidence * 100).toFixed(1)}%`,
      );
    }
    if (snapshot.totalCostUsd > 0) {
      console.info(chalk.bold("Cost:"), `$${snapshot.totalCostUsd.toFixed(4)}`);
    }
    if (snapshot.totalTokensUsed > 0) {
      console.info(
        chalk.bold("Tokens:"),
        snapshot.totalTokensUsed.toLocaleString(),
      );
    }
    if (snapshot.consecutiveErrors > 0) {
      console.info(
        chalk.yellow(`⚠ ${snapshot.consecutiveErrors} consecutive errors`),
      );
    }
  }

  /**
   * List all loops (active + from checkpoints)
   */
  private static async executeList(): Promise<void> {
    const checkpointStore = new FileCheckpointStore();
    const checkpoints = await checkpointStore.list();

    // Combine active loops with checkpoints
    const allLoops = new Map<
      string,
      { status: string; iteration: number; goal: string; source: string }
    >();

    // Add active loops first
    for (const [id, entry] of activeLoops.entries()) {
      const snapshot = entry.loop.getSnapshot();
      allLoops.set(id, {
        status: snapshot.status,
        iteration: snapshot.iteration,
        goal: snapshot.goalText,
        source: "active",
      });
    }

    // Add checkpoints not already in active loops
    for (const checkpoint of checkpoints) {
      if (!allLoops.has(checkpoint.loopId)) {
        allLoops.set(checkpoint.loopId, {
          status: checkpoint.status,
          iteration: 0, // We don't store iteration in CheckpointListing
          goal: checkpoint.goal,
          source: "checkpoint",
        });
      }
    }

    if (allLoops.size === 0) {
      console.info(chalk.gray("No heartbeat loops found."));
      console.info(
        chalk.gray("Use 'neurolink heartbeat run <goal>' to start one."),
      );
      return;
    }

    console.info(chalk.bold("\nHeartbeat Loops\n"));
    console.info(
      chalk.bold(
        `${"Loop ID".padEnd(20)} ${"Status".padEnd(12)} ${"Source".padEnd(12)} Goal`,
      ),
    );
    console.info(chalk.gray("-".repeat(90)));

    for (const [id, loop] of allLoops.entries()) {
      const shortId = id.length > 18 ? id.slice(0, 18) + "..." : id;
      const shortGoal =
        loop.goal.length > 40 ? loop.goal.slice(0, 40) + "..." : loop.goal;

      console.info(
        `${shortId.padEnd(20)} ${this.formatStatus(loop.status).padEnd(12)} ` +
          `${loop.source.padEnd(12)} ${shortGoal}`,
      );
    }
    console.info();
  }

  /**
   * Stop a running loop
   */
  private static async executeStop(
    args: BaseCommandArgs & { id: string; cancel: boolean },
  ): Promise<void> {
    const entry = activeLoops.get(args.id);

    if (!entry) {
      console.error(chalk.red(`No active loop found with ID: ${args.id}`));
      process.exit(1);
    }

    const spinner = ora(
      args.cancel
        ? "Cancelling heartbeat loop..."
        : "Pausing heartbeat loop...",
    ).start();

    try {
      const snapshot = args.cancel
        ? await entry.loop.cancel()
        : await entry.loop.pause();

      spinner.succeed(
        `Loop ${args.cancel ? "cancelled" : "paused"} at iteration ${snapshot.iteration}`,
      );

      if (!args.cancel) {
        console.info(
          chalk.gray(`Resume with: neurolink heartbeat resume ${args.id}`),
        );
      }
    } catch (error) {
      spinner.fail("Failed to stop loop");
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(1);
    }
  }

  /**
   * Resume a paused loop
   */
  private static async executeResume(
    args: BaseCommandArgs & { id: string },
  ): Promise<void> {
    const entry = activeLoops.get(args.id);

    if (!entry) {
      console.error(chalk.red(`No active loop found with ID: ${args.id}`));
      console.info(
        chalk.gray(
          "Note: Loops started in other sessions cannot be resumed from CLI.",
        ),
      );
      process.exit(1);
    }

    const snapshot = entry.loop.getSnapshot();
    if (snapshot.status !== "paused") {
      console.error(chalk.red(`Loop is ${snapshot.status}, not paused`));
      process.exit(1);
    }

    const spinner = ora("Resuming heartbeat loop...").start();

    try {
      // Run in background
      entry.loop.run().then((result: LoopResult) => {
        entry.result = result;
        console.info(
          chalk.green(
            `\n✓ Loop ${args.id} completed with status: ${result.status}`,
          ),
        );
      });

      spinner.succeed(`Loop resumed at iteration ${snapshot.iteration}`);
    } catch (error) {
      spinner.fail("Failed to resume loop");
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(1);
    }
  }

  /**
   * Format status for display
   */
  private static formatStatus(status: string): string {
    switch (status) {
      case "running":
        return chalk.blue("running");
      case "completed":
        return chalk.green("completed");
      case "paused":
        return chalk.yellow("paused");
      case "cancelled":
        return chalk.gray("cancelled");
      case "failed":
        return chalk.red("failed");
      default:
        return status;
    }
  }
}
