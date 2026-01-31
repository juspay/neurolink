/**
 * Workflow CLI Commands for NeuroLink
 *
 * Provides CLI commands for managing and executing workflows:
 * - workflow list: List registered workflows
 * - workflow run: Execute a workflow
 * - workflow resume: Resume a suspended workflow
 * - workflow status: Show workflow execution status
 * - workflow checkpoints: Manage workflow checkpoints
 * - workflow visualize: Visualize workflow structure (ASCII)
 *
 * @module cli/commands/workflow
 */

import type { CommandModule, Argv } from "yargs";
import chalk from "chalk";
import ora from "ora";
import { logger } from "../../lib/utils/logger.js";
import { handleError } from "../errorHandler.js";
import type { BaseCommandArgs } from "../../lib/types/cli.js";
import { NeuroLink } from "../../lib/neurolink.js";
import { WorkflowRegistry } from "../../lib/workflow/workflowRegistry.js";
import { WorkflowExecutor } from "../../lib/workflow/workflowExecutor.js";
import {
  WorkflowStateManager,
  InMemoryCheckpointStorage,
} from "../../lib/workflow/workflowStateManager.js";
import type {
  WorkflowDefinition,
  WorkflowCheckpoint,
  WorkflowEvent,
} from "../../lib/types/workflowTypes.js";

/**
 * Workflow command arguments
 */
export type WorkflowCommandArgs = BaseCommandArgs & {
  workflowId?: string;
  input?: string;
  runId?: string;
  checkpointId?: string;
  tag?: string;
  watch?: boolean;
  resumeData?: string;
  all?: boolean;
  timeout?: number;
};

/**
 * WorkflowCommandFactory - Factory for workflow CLI commands
 */
export class WorkflowCommandFactory {
  /**
   * Create the main workflow command with subcommands
   */
  static createWorkflowCommands(): CommandModule {
    return {
      command: "workflow <subcommand>",
      describe: "Manage and execute workflows",
      builder: (yargs) => {
        return yargs
          .command(
            "list",
            "List registered workflows",
            (y) => this.buildListOptions(y),
            (argv) => this.executeList(argv as WorkflowCommandArgs),
          )
          .command(
            "run <workflowId>",
            "Execute a workflow",
            (y) => this.buildRunOptions(y),
            (argv) => this.executeRun(argv as WorkflowCommandArgs),
          )
          .command(
            "resume <checkpointId>",
            "Resume a suspended workflow from checkpoint",
            (y) => this.buildResumeOptions(y),
            (argv) => this.executeResume(argv as WorkflowCommandArgs),
          )
          .command(
            "status <runId>",
            "Show workflow execution status",
            (y) => this.buildStatusOptions(y),
            (argv) => this.executeStatus(argv as WorkflowCommandArgs),
          )
          .command(
            "checkpoints",
            "List workflow checkpoints",
            (y) => this.buildCheckpointsOptions(y),
            (argv) => this.executeCheckpoints(argv as WorkflowCommandArgs),
          )
          .command(
            "visualize <workflowId>",
            "Visualize workflow structure",
            (y) => this.buildVisualizeOptions(y),
            (argv) => this.executeVisualize(argv as WorkflowCommandArgs),
          )
          .command(
            "info <workflowId>",
            "Show detailed workflow information",
            (y) => this.buildInfoOptions(y),
            (argv) => this.executeInfo(argv as WorkflowCommandArgs),
          )
          .command(
            "cancel <runId>",
            "Cancel a running workflow",
            (y) => this.buildCancelOptions(y),
            (argv) => this.executeCancel(argv as WorkflowCommandArgs),
          )
          .command(
            "history <workflowId>",
            "Show execution history for a workflow",
            (y) => this.buildHistoryOptions(y),
            (argv) => this.executeHistory(argv as WorkflowCommandArgs),
          )
          .option("format", {
            choices: ["text", "json", "table"] as const,
            default: "text",
            description: "Output format",
          })
          .option("quiet", {
            type: "boolean",
            alias: "q",
            default: false,
            description: "Suppress non-essential output",
          })
          .demandCommand(1, "Please specify a workflow subcommand")
          .help();
      },
      handler: () => {
        // No-op - subcommands handle execution
      },
    };
  }

  /**
   * Build options for list subcommand
   */
  private static buildListOptions(yargs: Argv): Argv {
    return yargs
      .option("tag", {
        type: "string",
        description: "Filter workflows by tag",
        alias: "t",
      })
      .option("format", {
        choices: ["text", "json", "table"] as const,
        default: "text",
        description: "Output format",
      })
      .example("neurolink workflow list", "List all registered workflows")
      .example(
        "neurolink workflow list --tag data-processing",
        "List workflows with specific tag",
      )
      .example("neurolink workflow list --format json", "Output as JSON");
  }

  /**
   * Build options for run subcommand
   */
  private static buildRunOptions(yargs: Argv): Argv {
    return yargs
      .positional("workflowId", {
        type: "string",
        description: "ID of the workflow to execute",
        demandOption: true,
      })
      .option("input", {
        type: "string",
        alias: "i",
        description: "Input data as JSON string",
      })
      .option("watch", {
        type: "boolean",
        alias: "w",
        default: false,
        description: "Watch workflow events in real-time",
      })
      .option("timeout", {
        type: "number",
        description: "Execution timeout in milliseconds",
        default: 300000,
      })
      .example(
        'neurolink workflow run my-workflow --input \'{"url": "https://example.com"}\'',
        "Run workflow with input",
      )
      .example(
        "neurolink workflow run data-pipeline --watch",
        "Run workflow with event streaming",
      );
  }

  /**
   * Build options for resume subcommand
   */
  private static buildResumeOptions(yargs: Argv): Argv {
    return yargs
      .positional("checkpointId", {
        type: "string",
        description: "ID of the checkpoint to resume from",
        demandOption: true,
      })
      .option("resumeData", {
        type: "string",
        alias: "d",
        description: "Resume data as JSON string (e.g., user approval)",
      })
      .example(
        "neurolink workflow resume checkpoint-abc123",
        "Resume suspended workflow",
      )
      .example(
        "neurolink workflow resume checkpoint-abc123 --resumeData '{\"approved\": true}'",
        "Resume with user input",
      );
  }

  /**
   * Build options for status subcommand
   */
  private static buildStatusOptions(yargs: Argv): Argv {
    return yargs
      .positional("runId", {
        type: "string",
        description: "ID of the workflow run",
        demandOption: true,
      })
      .example(
        "neurolink workflow status run-abc123",
        "Show workflow run status",
      );
  }

  /**
   * Build options for checkpoints subcommand
   */
  private static buildCheckpointsOptions(yargs: Argv): Argv {
    return yargs
      .option("workflowId", {
        type: "string",
        alias: "w",
        description: "Filter by workflow ID",
      })
      .option("all", {
        type: "boolean",
        alias: "a",
        default: false,
        description: "Show all checkpoints (including completed)",
      })
      .example("neurolink workflow checkpoints", "List all checkpoints")
      .example(
        "neurolink workflow checkpoints --workflowId my-workflow",
        "List checkpoints for specific workflow",
      );
  }

  /**
   * Build options for visualize subcommand
   */
  private static buildVisualizeOptions(yargs: Argv): Argv {
    return yargs
      .positional("workflowId", {
        type: "string",
        description: "ID of the workflow to visualize",
        demandOption: true,
      })
      .example(
        "neurolink workflow visualize my-workflow",
        "Show ASCII visualization of workflow",
      );
  }

  /**
   * Build options for info subcommand
   */
  private static buildInfoOptions(yargs: Argv): Argv {
    return yargs
      .positional("workflowId", {
        type: "string",
        description: "ID of the workflow",
        demandOption: true,
      })
      .example(
        "neurolink workflow info my-workflow",
        "Show detailed workflow information",
      );
  }

  /**
   * Build options for cancel subcommand
   */
  private static buildCancelOptions(yargs: Argv): Argv {
    return yargs
      .positional("runId", {
        type: "string",
        description: "ID of the workflow run to cancel",
        demandOption: true,
      })
      .example(
        "neurolink workflow cancel run-abc123",
        "Cancel a running workflow",
      );
  }

  /**
   * Build options for history subcommand
   */
  private static buildHistoryOptions(yargs: Argv): Argv {
    return yargs
      .positional("workflowId", {
        type: "string",
        description: "ID of the workflow to show history for",
        demandOption: true,
      })
      .option("limit", {
        type: "number",
        alias: "n",
        default: 10,
        description: "Maximum number of history entries to show",
      })
      .option("all", {
        type: "boolean",
        alias: "a",
        default: false,
        description: "Show all history entries (including completed)",
      })
      .example(
        "neurolink workflow history my-workflow",
        "Show recent execution history",
      )
      .example(
        "neurolink workflow history my-workflow --limit 20",
        "Show last 20 executions",
      )
      .example(
        "neurolink workflow history my-workflow --all",
        "Show all history entries",
      );
  }

  // ==========================================
  // Command Executors
  // ==========================================

  /**
   * Execute list command
   */
  private static async executeList(argv: WorkflowCommandArgs): Promise<void> {
    try {
      const spinner = argv.quiet ? null : ora("Loading workflows...").start();

      let workflows = WorkflowRegistry.list();

      // Filter by tag if specified
      if (argv.tag) {
        workflows = workflows.filter((w) => w.tags?.includes(argv.tag!));
      }

      if (spinner) {
        spinner.succeed(`Found ${workflows.length} workflow(s)`);
      }

      if (workflows.length === 0) {
        logger.always(
          chalk.yellow(
            "\nNo workflows registered. Create and register workflows using the SDK.",
          ),
        );
        return;
      }

      if (argv.format === "json") {
        logger.always(JSON.stringify(workflows, null, 2));
      } else if (argv.format === "table") {
        logger.always(chalk.bold("\nRegistered Workflows:\n"));
        logger.always(
          "┌─────────────────────┬──────────────────────────┬─────────┬───────┐",
        );
        logger.always(
          "│ ID                  │ Name                     │ Version │ Steps │",
        );
        logger.always(
          "├─────────────────────┼──────────────────────────┼─────────┼───────┤",
        );
        for (const w of workflows) {
          const id = w.id.padEnd(19).slice(0, 19);
          const name = w.name.padEnd(24).slice(0, 24);
          const version = (w.version ?? "-").padEnd(7).slice(0, 7);
          const steps = String(w.stepCount).padStart(5);
          logger.always(`│ ${id} │ ${name} │ ${version} │ ${steps} │`);
        }
        logger.always(
          "└─────────────────────┴──────────────────────────┴─────────┴───────┘",
        );
      } else {
        logger.always(chalk.bold("\nRegistered Workflows:\n"));
        for (const w of workflows) {
          logger.always(
            `${chalk.cyan(w.id)} ${chalk.gray("(" + (w.version ?? "no version") + ")")}`,
          );
          logger.always(`  Name: ${w.name}`);
          if (w.description) {
            logger.always(`  Description: ${chalk.gray(w.description)}`);
          }
          logger.always(`  Steps: ${w.stepCount}`);
          if (w.tags && w.tags.length > 0) {
            logger.always(`  Tags: ${chalk.blue(w.tags.join(", "))}`);
          }
          logger.always("");
        }
      }
    } catch (error) {
      handleError(error as Error, "Workflow list");
    }
  }

  /**
   * Execute run command
   */
  private static async executeRun(argv: WorkflowCommandArgs): Promise<void> {
    try {
      const workflowId = argv.workflowId!;

      // Get workflow from registry
      const workflow = WorkflowRegistry.get(workflowId);
      if (!workflow) {
        logger.always(
          chalk.red(`Workflow "${workflowId}" not found in registry.`),
        );
        logger.always(
          chalk.yellow(
            "Tip: Use 'neurolink workflow list' to see registered workflows.",
          ),
        );
        return;
      }

      // Parse input if provided
      let input: unknown = {};
      if (argv.input) {
        try {
          input = JSON.parse(argv.input);
        } catch {
          logger.always(
            chalk.red("Invalid JSON input. Please provide valid JSON."),
          );
          return;
        }
      }

      const spinner = argv.quiet
        ? null
        : ora(`Executing workflow: ${workflowId}`).start();

      // Create executor
      const neurolink = new NeuroLink();
      const executor = new WorkflowExecutor(neurolink);

      if (argv.watch) {
        // Stream events
        if (spinner) {
          spinner.stop();
        }
        logger.always(chalk.bold(`\nExecuting workflow: ${workflowId}\n`));
        logger.always(chalk.gray("Events:"));

        const eventStream = executor.executeWithEvents(
          workflow as WorkflowDefinition<unknown, unknown>,
          input,
          { timeout: argv.timeout },
        );

        // Consume all events and collect the result
        let result: {
          done?: boolean;
          value:
            | WorkflowEvent
            | import("../../lib/types/workflowTypes.js").WorkflowExecutionResult<unknown>;
        } = { value: {} as WorkflowEvent };

        while (true) {
          result = await eventStream.next();
          if (result.done) {
            break;
          }
          this.displayEvent(result.value as WorkflowEvent);
        }

        // The return value is the WorkflowExecutionResult
        if (result.done && result.value) {
          const executionResult =
            result.value as import("../../lib/types/workflowTypes.js").WorkflowExecutionResult<unknown>;
          this.displayResult(
            {
              success: executionResult.success,
              status: executionResult.status,
              output: executionResult.output,
              error: executionResult.error,
              stats: executionResult.stats,
              checkpoint: executionResult.checkpoint,
            },
            argv,
          );
        }
      } else {
        // Execute without event streaming
        const result = await executor.execute(
          workflow as WorkflowDefinition<unknown, unknown>,
          input,
          { timeout: argv.timeout },
        );

        if (spinner) {
          if (result.success) {
            spinner.succeed(`Workflow completed successfully`);
          } else if (result.status === "suspended") {
            spinner.warn(`Workflow suspended`);
          } else {
            spinner.fail(`Workflow failed`);
          }
        }

        this.displayResult(result, argv);
      }
    } catch (error) {
      handleError(error as Error, "Workflow run");
    }
  }

  /**
   * Execute resume command
   */
  private static async executeResume(argv: WorkflowCommandArgs): Promise<void> {
    try {
      const checkpointId = argv.checkpointId!;
      const spinner = argv.quiet
        ? null
        : ora(`Resuming workflow from checkpoint: ${checkpointId}`).start();

      // Load checkpoint
      const stateManager = new WorkflowStateManager(
        new InMemoryCheckpointStorage(),
      );
      const checkpoint = await stateManager.loadCheckpoint(checkpointId);

      if (!checkpoint) {
        if (spinner) {
          spinner.fail("Checkpoint not found");
        }
        logger.always(chalk.red(`Checkpoint "${checkpointId}" not found.`));
        return;
      }

      // Parse resume data if provided
      let resumeData: Record<string, unknown> | undefined;
      if (argv.resumeData) {
        try {
          resumeData = JSON.parse(argv.resumeData);
        } catch {
          if (spinner) {
            spinner.fail("Invalid resume data");
          }
          logger.always(
            chalk.red("Invalid JSON resume data. Please provide valid JSON."),
          );
          return;
        }
      }

      // Create executor and resume
      const neurolink = new NeuroLink();
      const executor = new WorkflowExecutor(neurolink);

      const result = await executor.resume(checkpoint, resumeData);

      if (spinner) {
        if (result.success) {
          spinner.succeed("Workflow resumed and completed successfully");
        } else if (result.status === "suspended") {
          spinner.warn("Workflow suspended again");
        } else {
          spinner.fail("Workflow failed after resume");
        }
      }

      this.displayResult(result, argv);
    } catch (error) {
      handleError(error as Error, "Workflow resume");
    }
  }

  /**
   * Execute status command
   */
  private static async executeStatus(argv: WorkflowCommandArgs): Promise<void> {
    try {
      const runId = argv.runId!;
      const spinner = argv.quiet
        ? null
        : ora(`Loading status for run: ${runId}`).start();

      // Load checkpoint for the run
      const stateManager = new WorkflowStateManager(
        new InMemoryCheckpointStorage(),
      );
      const checkpoint = await stateManager.loadCheckpointByRunId(runId);

      if (spinner) {
        spinner.stop();
      }

      if (!checkpoint) {
        logger.always(chalk.yellow(`No checkpoint found for run "${runId}".`));
        logger.always(
          chalk.gray(
            "The workflow may have completed without suspension, or the run ID is invalid.",
          ),
        );
        return;
      }

      this.displayCheckpoint(checkpoint, argv);
    } catch (error) {
      handleError(error as Error, "Workflow status");
    }
  }

  /**
   * Execute checkpoints command
   */
  private static async executeCheckpoints(
    argv: WorkflowCommandArgs,
  ): Promise<void> {
    try {
      const spinner = argv.quiet ? null : ora("Loading checkpoints...").start();

      const stateManager = new WorkflowStateManager(
        new InMemoryCheckpointStorage(),
      );
      let checkpoints = await stateManager.listCheckpoints(argv.workflowId);

      // Filter out completed unless --all is specified
      if (!argv.all) {
        checkpoints = checkpoints.filter((c) => c.status === "suspended");
      }

      if (spinner) {
        spinner.succeed(`Found ${checkpoints.length} checkpoint(s)`);
      }

      if (checkpoints.length === 0) {
        logger.always(chalk.yellow("\nNo checkpoints found."));
        return;
      }

      if (argv.format === "json") {
        logger.always(JSON.stringify(checkpoints, null, 2));
      } else {
        logger.always(chalk.bold("\nWorkflow Checkpoints:\n"));
        for (const cp of checkpoints) {
          this.displayCheckpointSummary(cp);
        }
      }
    } catch (error) {
      handleError(error as Error, "Workflow checkpoints");
    }
  }

  /**
   * Execute visualize command
   */
  private static async executeVisualize(
    argv: WorkflowCommandArgs,
  ): Promise<void> {
    try {
      const workflowId = argv.workflowId!;
      const workflow = WorkflowRegistry.get(workflowId);

      if (!workflow) {
        logger.always(
          chalk.red(`Workflow "${workflowId}" not found in registry.`),
        );
        return;
      }

      logger.always(chalk.bold(`\nWorkflow: ${workflow.name}`));
      if (workflow.description) {
        logger.always(chalk.gray(workflow.description));
      }
      logger.always("");

      // Build ASCII visualization
      const visualization = this.buildWorkflowVisualization(
        workflow as WorkflowDefinition,
      );
      logger.always(visualization);
    } catch (error) {
      handleError(error as Error, "Workflow visualize");
    }
  }

  /**
   * Execute info command
   */
  private static async executeInfo(argv: WorkflowCommandArgs): Promise<void> {
    try {
      const workflowId = argv.workflowId!;
      const workflow = WorkflowRegistry.get(workflowId);

      if (!workflow) {
        logger.always(
          chalk.red(`Workflow "${workflowId}" not found in registry.`),
        );
        return;
      }

      if (argv.format === "json") {
        const info = {
          id: workflow.id,
          name: workflow.name,
          description: workflow.description,
          version: workflow.version,
          tags: workflow.tags,
          timeout: workflow.timeout,
          stepCount: workflow.steps.size,
          steps: Array.from(workflow.steps.values()).map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            timeout: s.timeout,
            suspendable: s.suspendable,
          })),
          graph: {
            entryPoint: workflow.graph.entryPoint,
            edgeCount: workflow.graph.edges.length,
            parallelGroups: workflow.graph.parallelGroups?.length ?? 0,
            branches: workflow.graph.branches?.length ?? 0,
            loops: workflow.graph.loops?.length ?? 0,
          },
        };
        logger.always(JSON.stringify(info, null, 2));
      } else {
        logger.always(chalk.bold(`\nWorkflow: ${workflow.name}`));
        logger.always(chalk.gray(`ID: ${workflow.id}`));
        if (workflow.version) {
          logger.always(`Version: ${workflow.version}`);
        }
        if (workflow.description) {
          logger.always(`Description: ${workflow.description}`);
        }
        if (workflow.tags && workflow.tags.length > 0) {
          logger.always(`Tags: ${chalk.blue(workflow.tags.join(", "))}`);
        }
        if (workflow.timeout) {
          logger.always(`Timeout: ${workflow.timeout}ms`);
        }

        logger.always(chalk.bold("\nSteps:"));
        for (const [stepId, step] of workflow.steps) {
          const markers: string[] = [];
          if (stepId === workflow.graph.entryPoint) {
            markers.push(chalk.green("[entry]"));
          }
          if (step.suspendable) {
            markers.push(chalk.yellow("[suspendable]"));
          }
          const markerStr = markers.length > 0 ? " " + markers.join(" ") : "";
          logger.always(`  ${chalk.cyan(stepId)}: ${step.name}${markerStr}`);
          if (step.description) {
            logger.always(`    ${chalk.gray(step.description)}`);
          }
        }

        logger.always(chalk.bold("\nGraph Structure:"));
        logger.always(`  Entry Point: ${workflow.graph.entryPoint}`);
        logger.always(`  Edges: ${workflow.graph.edges.length}`);
        if (workflow.graph.parallelGroups) {
          logger.always(
            `  Parallel Groups: ${workflow.graph.parallelGroups.length}`,
          );
        }
        if (workflow.graph.branches) {
          logger.always(`  Branches: ${workflow.graph.branches.length}`);
        }
        if (workflow.graph.loops) {
          logger.always(`  Loops: ${workflow.graph.loops.length}`);
        }
      }
    } catch (error) {
      handleError(error as Error, "Workflow info");
    }
  }

  /**
   * Execute cancel command
   */
  private static async executeCancel(argv: WorkflowCommandArgs): Promise<void> {
    try {
      const runId = argv.runId!;
      const spinner = argv.quiet
        ? null
        : ora(`Cancelling workflow run: ${runId}`).start();

      // Create executor
      const neurolink = new NeuroLink();
      const executor = new WorkflowExecutor(neurolink);

      // Attempt to cancel the workflow
      const cancelled = executor.cancel(runId);

      if (spinner) {
        if (cancelled) {
          spinner.succeed(`Workflow run "${runId}" has been cancelled`);
        } else {
          spinner.warn(
            `Workflow run "${runId}" was not found or already completed`,
          );
        }
      }

      if (argv.format === "json") {
        logger.always(JSON.stringify({ runId, cancelled }, null, 2));
      } else {
        if (cancelled) {
          logger.always(
            chalk.green(
              `\nWorkflow run "${runId}" has been successfully cancelled.`,
            ),
          );
        } else {
          logger.always(
            chalk.yellow(`\nCould not cancel workflow run "${runId}".`),
          );
          logger.always(
            chalk.gray(
              "The workflow may have already completed, or the run ID is invalid.",
            ),
          );
        }
      }
    } catch (error) {
      handleError(error as Error, "Workflow cancel");
    }
  }

  /**
   * Execute history command
   */
  private static async executeHistory(
    argv: WorkflowCommandArgs,
  ): Promise<void> {
    try {
      const workflowId = argv.workflowId!;
      const limit =
        (argv as WorkflowCommandArgs & { limit?: number }).limit ?? 10;
      const spinner = argv.quiet
        ? null
        : ora(`Loading execution history for: ${workflowId}`).start();

      // Verify workflow exists
      const workflow = WorkflowRegistry.get(workflowId);
      if (!workflow) {
        if (spinner) {
          spinner.fail("Workflow not found");
        }
        logger.always(
          chalk.red(`Workflow "${workflowId}" not found in registry.`),
        );
        return;
      }

      // Load checkpoints for this workflow (history)
      const stateManager = new WorkflowStateManager(
        new InMemoryCheckpointStorage(),
      );
      let checkpoints = await stateManager.listCheckpoints(workflowId);

      // Filter out non-suspended unless --all is specified
      if (!argv.all) {
        // Show all checkpoints for history, but limit the count
      }

      // Sort by timestamp (most recent first)
      checkpoints = checkpoints.sort((a, b) => b.timestamp - a.timestamp);

      // Apply limit
      checkpoints = checkpoints.slice(0, limit);

      if (spinner) {
        spinner.succeed(`Found ${checkpoints.length} execution record(s)`);
      }

      if (checkpoints.length === 0) {
        logger.always(
          chalk.yellow(
            `\nNo execution history found for workflow "${workflowId}".`,
          ),
        );
        logger.always(
          chalk.gray(
            "Execution history is preserved through checkpoints. Run a workflow to create history.",
          ),
        );
        return;
      }

      if (argv.format === "json") {
        const historyData = checkpoints.map((cp) => ({
          runId: cp.runId,
          checkpointId: cp.id,
          status: cp.status,
          timestamp: cp.timestamp,
          pendingSteps: cp.pendingSteps,
          completedSteps: Object.keys(cp.stepRecords).filter(
            (k) => cp.stepRecords[k].status === "completed",
          ),
          suspension: cp.suspension,
        }));
        logger.always(JSON.stringify(historyData, null, 2));
      } else if (argv.format === "table") {
        logger.always(chalk.bold(`\nExecution History: ${workflow.name}\n`));
        logger.always(
          "┌──────────────────────┬─────────────┬─────────────────────────┬─────────┐",
        );
        logger.always(
          "│ Run ID               │ Status      │ Timestamp               │ Steps   │",
        );
        logger.always(
          "├──────────────────────┼─────────────┼─────────────────────────┼─────────┤",
        );
        for (const cp of checkpoints) {
          const runId = cp.runId.slice(0, 20).padEnd(20);
          const status = this.formatStatus(cp.status).padEnd(11);
          const time = new Date(cp.timestamp)
            .toISOString()
            .slice(0, 19)
            .padEnd(23);
          const completed = Object.keys(cp.stepRecords).filter(
            (k) => cp.stepRecords[k].status === "completed",
          ).length;
          const total = workflow.steps.size;
          const steps = `${completed}/${total}`.padStart(7);
          logger.always(`│ ${runId} │ ${status} │ ${time} │ ${steps} │`);
        }
        logger.always(
          "└──────────────────────┴─────────────┴─────────────────────────┴─────────┘",
        );
      } else {
        logger.always(chalk.bold(`\nExecution History: ${workflow.name}\n`));
        for (const cp of checkpoints) {
          const status = this.formatStatus(cp.status);
          const time = new Date(cp.timestamp).toISOString();
          const completed = Object.keys(cp.stepRecords).filter(
            (k) => cp.stepRecords[k].status === "completed",
          ).length;
          const total = workflow.steps.size;

          logger.always(`${chalk.cyan(cp.runId)} ${status}`);
          logger.always(`  Checkpoint: ${cp.id}`);
          logger.always(`  Timestamp: ${chalk.gray(time)}`);
          logger.always(`  Steps: ${completed}/${total} completed`);
          if (cp.suspension) {
            logger.always(
              `  Suspended: ${chalk.yellow(cp.suspension.type)} - ${cp.suspension.reason}`,
            );
          }
          if (cp.pendingSteps.length > 0) {
            logger.always(
              `  Pending: ${chalk.gray(cp.pendingSteps.join(", "))}`,
            );
          }
          logger.always("");
        }

        if (checkpoints.length === limit) {
          logger.always(
            chalk.gray(
              `Showing last ${limit} entries. Use --limit to see more.`,
            ),
          );
        }
      }
    } catch (error) {
      handleError(error as Error, "Workflow history");
    }
  }

  // ==========================================
  // Helper Methods
  // ==========================================

  /**
   * Display a workflow event
   */
  private static displayEvent(event: WorkflowEvent): void {
    const timestamp = new Date(event.timestamp).toISOString().slice(11, 23);
    const prefix = chalk.gray(`[${timestamp}]`);

    switch (event.type) {
      case "workflow:start":
        logger.always(`${prefix} ${chalk.green("START")} Workflow started`);
        break;
      case "workflow:complete":
        logger.always(
          `${prefix} ${chalk.green("COMPLETE")} Workflow completed successfully`,
        );
        break;
      case "workflow:failed":
        logger.always(`${prefix} ${chalk.red("FAILED")} Workflow failed`);
        break;
      case "workflow:suspended":
        logger.always(
          `${prefix} ${chalk.yellow("SUSPENDED")} Workflow suspended`,
        );
        break;
      case "workflow:resumed":
        logger.always(`${prefix} ${chalk.blue("RESUMED")} Workflow resumed`);
        break;
      case "workflow:cancelled":
        logger.always(`${prefix} ${chalk.red("CANCELLED")} Workflow cancelled`);
        break;
      case "step:start":
        logger.always(
          `${prefix} ${chalk.cyan("STEP")} Starting: ${event.stepId}`,
        );
        break;
      case "step:complete":
        logger.always(
          `${prefix} ${chalk.green("STEP")} Completed: ${event.stepId} (${event.duration}ms)`,
        );
        break;
      case "step:failed":
        logger.always(`${prefix} ${chalk.red("STEP")} Failed: ${event.stepId}`);
        break;
      case "step:suspended":
        logger.always(
          `${prefix} ${chalk.yellow("STEP")} Suspended: ${event.stepId}`,
        );
        break;
      case "parallel:start":
        logger.always(
          `${prefix} ${chalk.magenta("PARALLEL")} Starting parallel execution`,
        );
        break;
      case "parallel:complete":
        logger.always(
          `${prefix} ${chalk.magenta("PARALLEL")} Parallel execution complete`,
        );
        break;
      case "loop:iteration":
        logger.always(
          `${prefix} ${chalk.blue("LOOP")} Iteration ${(event as { data: { iteration: number } }).data.iteration}`,
        );
        break;
      case "loop:complete":
        logger.always(`${prefix} ${chalk.blue("LOOP")} Loop complete`);
        break;
      case "branch:evaluated":
        logger.always(`${prefix} ${chalk.yellow("BRANCH")} Evaluated branch`);
        break;
      case "checkpoint:created":
        logger.always(
          `${prefix} ${chalk.gray("CHECKPOINT")} Created checkpoint`,
        );
        break;
      case "checkpoint:restored":
        logger.always(
          `${prefix} ${chalk.gray("CHECKPOINT")} Restored checkpoint`,
        );
        break;
      default:
        logger.always(`${prefix} ${event.type}`);
    }
  }

  /**
   * Display workflow execution result
   */
  private static displayResult(
    result: {
      success: boolean;
      status: string;
      output?: unknown;
      error?: { code: string; message: string };
      stats: {
        totalSteps: number;
        completedSteps: number;
        failedSteps: number;
        duration?: number;
      };
      checkpoint?: WorkflowCheckpoint;
    },
    argv: WorkflowCommandArgs,
  ): void {
    if (argv.format === "json") {
      logger.always(JSON.stringify(result, null, 2));
      return;
    }

    logger.always(chalk.bold("\nExecution Result:"));
    logger.always(`  Status: ${this.formatStatus(result.status)}`);
    logger.always(
      `  Steps: ${result.stats.completedSteps}/${result.stats.totalSteps} completed`,
    );
    if (result.stats.failedSteps > 0) {
      logger.always(`  Failed: ${chalk.red(String(result.stats.failedSteps))}`);
    }
    if (result.stats.duration) {
      logger.always(`  Duration: ${result.stats.duration}ms`);
    }

    if (result.success && result.output) {
      logger.always(chalk.bold("\nOutput:"));
      logger.always(JSON.stringify(result.output, null, 2));
    }

    if (result.error) {
      logger.always(chalk.bold("\nError:"));
      logger.always(`  Code: ${result.error.code}`);
      logger.always(`  Message: ${result.error.message}`);
    }

    if (result.checkpoint && result.status === "suspended") {
      logger.always(chalk.bold("\nCheckpoint:"));
      logger.always(`  ID: ${result.checkpoint.id}`);
      logger.always(
        `  Resume with: neurolink workflow resume ${result.checkpoint.id}`,
      );
      if (result.checkpoint.suspension) {
        logger.always(`  Reason: ${result.checkpoint.suspension.reason}`);
      }
    }
  }

  /**
   * Display a checkpoint in detail
   */
  private static displayCheckpoint(
    checkpoint: WorkflowCheckpoint,
    argv: WorkflowCommandArgs,
  ): void {
    if (argv.format === "json") {
      logger.always(JSON.stringify(checkpoint, null, 2));
      return;
    }

    logger.always(chalk.bold("\nCheckpoint Details:"));
    logger.always(`  ID: ${checkpoint.id}`);
    logger.always(`  Workflow: ${checkpoint.workflowId}`);
    logger.always(`  Run ID: ${checkpoint.runId}`);
    logger.always(`  Status: ${this.formatStatus(checkpoint.status)}`);
    logger.always(`  Created: ${new Date(checkpoint.timestamp).toISOString()}`);
    if (checkpoint.suspension) {
      logger.always(chalk.bold("\nSuspension:"));
      logger.always(`  Type: ${checkpoint.suspension.type}`);
      logger.always(`  Reason: ${checkpoint.suspension.reason}`);
      if (checkpoint.suspension.expiresAt) {
        logger.always(
          `  Expires: ${new Date(checkpoint.suspension.expiresAt).toISOString()}`,
        );
      }
    }
  }

  /**
   * Display a checkpoint summary
   */
  private static displayCheckpointSummary(
    checkpoint: WorkflowCheckpoint,
  ): void {
    const status = this.formatStatus(checkpoint.status);
    const time = new Date(checkpoint.timestamp).toISOString().slice(0, 19);
    logger.always(`${chalk.cyan(checkpoint.id)} ${status} ${chalk.gray(time)}`);
    logger.always(`  Workflow: ${checkpoint.workflowId}`);
    logger.always(`  Run: ${checkpoint.runId}`);
    if (checkpoint.suspension) {
      logger.always(
        `  Suspension: ${checkpoint.suspension.type} - ${checkpoint.suspension.reason}`,
      );
    }
    logger.always("");
  }

  /**
   * Format status with color
   */
  private static formatStatus(status: string): string {
    switch (status) {
      case "completed":
        return chalk.green(status);
      case "running":
        return chalk.blue(status);
      case "suspended":
        return chalk.yellow(status);
      case "failed":
        return chalk.red(status);
      case "cancelled":
        return chalk.red(status);
      default:
        return status;
    }
  }

  /**
   * Build ASCII visualization of workflow
   */
  private static buildWorkflowVisualization(
    workflow: WorkflowDefinition,
  ): string {
    const lines: string[] = [];
    const { graph, steps } = workflow;

    // Build adjacency list
    const adjacency = new Map<string, string[]>();
    for (const edge of graph.edges) {
      if (!adjacency.has(edge.from)) {
        adjacency.set(edge.from, []);
      }
      adjacency.get(edge.from)!.push(edge.to);
    }

    // Visited tracking
    const visited = new Set<string>();

    // Helper to draw a step
    const drawStep = (stepId: string, indent: number): void => {
      if (visited.has(stepId)) {
        lines.push(`${" ".repeat(indent)}${chalk.gray(`(-> ${stepId})`)}`);
        return;
      }
      visited.add(stepId);

      const step = steps.get(stepId);
      const isEntry = stepId === graph.entryPoint;
      const isParallel = graph.parallelGroups?.some((g) =>
        g.steps.includes(stepId),
      );
      const isMerge = stepId.startsWith("merge-") || stepId.startsWith("end-");

      let marker = "[ ]";
      if (isEntry) {
        marker = chalk.green("[>]");
      } else if (isParallel) {
        marker = chalk.magenta("[=]");
      } else if (isMerge) {
        marker = chalk.gray("[*]");
      }

      const name = step?.name ?? stepId;
      lines.push(`${" ".repeat(indent)}${marker} ${chalk.cyan(name)}`);

      // Draw children
      const children = adjacency.get(stepId) ?? [];
      if (children.length === 1) {
        lines.push(`${" ".repeat(indent)}  |`);
        lines.push(`${" ".repeat(indent)}  v`);
        drawStep(children[0], indent);
      } else if (children.length > 1) {
        // Fork
        lines.push(
          `${" ".repeat(indent)}  ${chalk.gray("├" + "─".repeat(children.length * 4))}`,
        );
        for (let i = 0; i < children.length; i++) {
          const branch = i === children.length - 1 ? "└" : "├";
          lines.push(`${" ".repeat(indent)}  ${chalk.gray(branch)}──▶`);
          drawStep(children[i], indent + 6);
        }
      }
    };

    // Start from entry point
    lines.push(chalk.bold("Workflow Graph:"));
    lines.push("");
    drawStep(graph.entryPoint, 2);
    lines.push("");

    // Legend
    lines.push(chalk.bold("Legend:"));
    lines.push(`  ${chalk.green("[>]")} Entry point`);
    lines.push(`  ${chalk.magenta("[=]")} Parallel step`);
    lines.push(`  ${chalk.gray("[*]")} Merge/End point`);
    lines.push(`  [ ] Regular step`);

    return lines.join("\n");
  }
}
