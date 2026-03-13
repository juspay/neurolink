/**
 * Workflow CLI Commands for NeuroLink
 *
 * Implements commands for workflow management and execution:
 * - neurolink workflow list     - List available predefined workflows
 * - neurolink workflow info <name> - Show details of a workflow
 * - neurolink workflow execute <name> <prompt> - Execute a workflow
 */

import chalk from "chalk";
import ora from "ora";
import type { CommandModule } from "yargs";
import type { WorkflowConfig } from "../../lib/workflow/types.js";
import type { BaseCommandArgs } from "../../lib/types/cli.js";
import type { AIProviderName } from "../../lib/constants/enums.js";

/**
 * All predefined workflow configs keyed by their id.
 * Loaded lazily via dynamic import to avoid circular deps.
 */
async function loadPredefinedWorkflows(): Promise<
  Record<string, WorkflowConfig>
> {
  const [consensus, fallback, adaptive, multiJudge] = await Promise.all([
    import("../../lib/workflow/workflows/consensusWorkflow.js"),
    import("../../lib/workflow/workflows/fallbackWorkflow.js"),
    import("../../lib/workflow/workflows/adaptiveWorkflow.js"),
    import("../../lib/workflow/workflows/multiJudgeWorkflow.js"),
  ]);

  const configs: WorkflowConfig[] = [
    consensus.CONSENSUS_3_WORKFLOW,
    consensus.CONSENSUS_3_FAST_WORKFLOW,
    fallback.FAST_FALLBACK_WORKFLOW,
    fallback.AGGRESSIVE_FALLBACK_WORKFLOW,
    adaptive.QUALITY_MAX_WORKFLOW,
    adaptive.SPEED_FIRST_WORKFLOW,
    adaptive.BALANCED_ADAPTIVE_WORKFLOW,
    multiJudge.MULTI_JUDGE_5_WORKFLOW,
    multiJudge.MULTI_JUDGE_3_WORKFLOW,
  ];

  const map: Record<string, WorkflowConfig> = {};
  for (const cfg of configs) {
    map[cfg.id] = cfg;
  }
  return map;
}

/**
 * Workflow CLI command factory
 */
export class WorkflowCommandFactory {
  static createWorkflowCommands(): CommandModule {
    return {
      command: "workflow <subcommand>",
      describe: "Manage and execute AI workflows",
      builder: (yargs) => {
        return yargs
          .command(
            "list",
            "List available predefined workflows",
            (y) => y,
            async () => {
              await WorkflowCommandFactory.executeList();
            },
          )
          .command(
            "info <name>",
            "Show details of a workflow",
            (y) =>
              y.positional("name", {
                type: "string" as const,
                description: "Workflow name/id",
                demandOption: true,
              }),
            async (argv) => {
              await WorkflowCommandFactory.executeInfo(
                argv as BaseCommandArgs & { name: string },
              );
            },
          )
          .command(
            "execute <name> <prompt>",
            "Execute a workflow with a prompt",
            (y) =>
              y
                .positional("name", {
                  type: "string" as const,
                  description: "Workflow name/id",
                  demandOption: true,
                })
                .positional("prompt", {
                  type: "string" as const,
                  description: "Prompt to send to the workflow",
                  demandOption: true,
                })
                .option("provider", {
                  type: "string",
                  description: "Override AI provider",
                })
                .option("model", {
                  type: "string",
                  description: "Override model name",
                })
                .option("timeout", {
                  type: "number",
                  description: "Execution timeout in milliseconds",
                })
                .option("verbose", {
                  type: "boolean",
                  description: "Enable verbose output",
                  default: false,
                }),
            async (argv) => {
              await WorkflowCommandFactory.executeWorkflow(
                argv as BaseCommandArgs & {
                  name: string;
                  prompt: string;
                  provider?: string;
                  model?: string;
                  timeout?: number;
                  verbose?: boolean;
                },
              );
            },
          )
          .demandCommand(1, "Please specify a workflow subcommand");
      },
      handler: () => {},
    };
  }

  /**
   * List all predefined workflows
   */
  private static async executeList(): Promise<void> {
    const workflows = await loadPredefinedWorkflows();
    const configs = Object.values(workflows);

    console.info(chalk.bold("\nAvailable Workflows:\n"));

    for (const cfg of configs) {
      const tags = cfg.tags?.join(", ") || "";
      console.info(
        `  ${chalk.cyan(cfg.id.padEnd(24))} ${chalk.white(cfg.name)}`,
      );
      console.info(`  ${"".padEnd(24)} ${chalk.gray(cfg.description || "")}`);
      if (tags) {
        console.info(`  ${"".padEnd(24)} ${chalk.gray(`Tags: ${tags}`)}`);
      }
      console.info();
    }

    console.info(chalk.gray(`Total: ${configs.length} workflows`));
  }

  /**
   * Show details of a specific workflow
   */
  private static async executeInfo(
    argv: BaseCommandArgs & { name: string },
  ): Promise<void> {
    const workflows = await loadPredefinedWorkflows();
    const cfg = workflows[argv.name];

    if (!cfg) {
      console.error(chalk.red(`Workflow "${argv.name}" not found.`));
      console.info(
        chalk.gray(`Available: ${Object.keys(workflows).join(", ")}`),
      );
      process.exitCode = 1;
      return;
    }

    console.info(chalk.bold(`\nWorkflow: ${cfg.name}\n`));
    console.info(`  ID:          ${cfg.id}`);
    console.info(`  Type:        ${cfg.type}`);
    console.info(`  Version:     ${cfg.version || "n/a"}`);
    console.info(`  Description: ${cfg.description || "n/a"}`);

    if (cfg.models && cfg.models.length > 0) {
      console.info(`\n  Models:`);
      for (const m of cfg.models) {
        console.info(`    - ${chalk.cyan(m.label || m.model)} (${m.provider})`);
      }
    }

    if (cfg.modelGroups && cfg.modelGroups.length > 0) {
      console.info(`\n  Model Groups:`);
      for (const group of cfg.modelGroups) {
        console.info(`    ${chalk.cyan(group.id)}:`);
        for (const m of group.models) {
          console.info(`      - ${m.label || m.model} (${m.provider})`);
        }
      }
    }

    if (cfg.judge) {
      console.info(`\n  Judge: ${cfg.judge.model} (${cfg.judge.provider})`);
      if (cfg.judge.criteria) {
        console.info(`  Criteria: ${cfg.judge.criteria.join(", ")}`);
      }
    }

    if (cfg.execution) {
      console.info(`\n  Execution:`);
      if (cfg.execution.timeout) {
        console.info(`    Timeout:     ${cfg.execution.timeout}ms`);
      }
      if (cfg.execution.parallelism) {
        console.info(`    Parallelism: ${cfg.execution.parallelism}`);
      }
      if (cfg.execution.minResponses) {
        console.info(`    Min Responses: ${cfg.execution.minResponses}`);
      }
    }

    if (cfg.tags && cfg.tags.length > 0) {
      console.info(`\n  Tags: ${cfg.tags.join(", ")}`);
    }
  }

  /**
   * Execute a workflow
   */
  private static async executeWorkflow(
    argv: BaseCommandArgs & {
      name: string;
      prompt: string;
      provider?: string;
      model?: string;
      timeout?: number;
      verbose?: boolean;
    },
  ): Promise<void> {
    const workflows = await loadPredefinedWorkflows();
    let cfg = workflows[argv.name];

    if (!cfg) {
      console.error(chalk.red(`Workflow "${argv.name}" not found.`));
      console.info(
        chalk.gray(`Available: ${Object.keys(workflows).join(", ")}`),
      );
      process.exitCode = 1;
      return;
    }

    // Apply provider/model overrides if specified
    if (argv.provider || argv.model) {
      cfg = {
        ...cfg,
        models: cfg.models?.map((m) => ({
          ...m,
          provider: (argv.provider as AIProviderName) || m.provider,
          model: argv.model || m.model,
        })),
      };
    }

    const spinner = ora("Executing workflow...").start();

    try {
      const { runWorkflow } =
        await import("../../lib/workflow/core/workflowRunner.js");

      const result = await runWorkflow(cfg, {
        prompt: argv.prompt,
        timeout: argv.timeout,
        verbose: argv.verbose,
      });

      spinner.stop();

      if (result.content) {
        console.info(result.content);
      } else {
        console.info(
          chalk.yellow("Workflow completed but produced no content."),
        );
        if (result.reasoning) {
          console.info(chalk.gray(`Reasoning: ${result.reasoning}`));
        }
      }
    } catch (error) {
      spinner.stop();
      const msg = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Workflow execution failed: ${msg}`));
      process.exitCode = 1;
    }
  }
}
