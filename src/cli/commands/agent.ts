/**
 * Agent CLI Commands for NeuroLink
 * Implements comprehensive multi-agent orchestration commands
 *
 * Commands:
 * - agent create: Create a new agent definition
 * - agent list: List registered agents
 * - agent execute: Execute a single agent
 * - network create: Create an agent network
 * - network execute: Execute a network
 */

import type { CommandModule, Argv } from "yargs";
import type {
  CliAgentCommandArgs,
  CliNetworkCommandArgs,
  AgentDefinition,
  AgentNetworkConfig,
  NetworkStartChunk,
  RoutingDecisionChunk,
  PrimitiveStartChunk,
  AgentTextChunk,
  AgentToolCallChunk,
  AgentToolResultChunk,
  PrimitiveEndChunk,
  NetworkCompleteChunk,
  NetworkErrorChunk,
} from "../../lib/types/index.js";
import { NeuroLink } from "../../lib/neurolink.js";
import { logger } from "../../lib/utils/logger.js";
import chalk from "chalk";
import ora from "ora";
import fs from "fs";
import path from "path";

// In-memory storage for agents and networks (session-based)
const registeredAgents: Map<string, AgentDefinition> = new Map();
const registeredNetworks: Map<string, AgentNetworkConfig> = new Map();

/**
 * Agent CLI command factory
 */
export class AgentCommandFactory {
  /**
   * Create the main agent command with subcommands
   */
  static createAgentCommands(): CommandModule {
    return {
      command: "agent <subcommand>",
      describe: "Manage AI agents for multi-agent orchestration",
      builder: (yargs) => {
        return yargs
          .command(
            "create",
            "Create a new agent definition",
            (yargs) => this.buildCreateOptions(yargs),
            (argv) => this.executeCreate(argv as CliAgentCommandArgs),
          )
          .command(
            "list",
            "List registered agents",
            (yargs) => this.buildListOptions(yargs),
            (argv) => this.executeList(argv as CliAgentCommandArgs),
          )
          .command(
            "execute <id> <input>",
            "Execute a single agent with given input",
            (yargs) => this.buildExecuteOptions(yargs),
            (argv) => this.executeAgent(argv as CliAgentCommandArgs),
          )
          .command(
            "run <id> <input>",
            "Execute a single agent (alias for execute)",
            (yargs) => this.buildExecuteOptions(yargs),
            (argv) => this.executeAgent(argv as CliAgentCommandArgs),
          )
          .option("format", {
            choices: ["text", "json", "table"],
            default: "text",
            description: "Output format",
          })
          .option("output", {
            type: "string",
            description: "Save output to file",
          })
          .option("quiet", {
            type: "boolean",
            alias: "q",
            default: false,
            description: "Suppress non-essential output",
          })
          .option("debug", {
            type: "boolean",
            default: false,
            description: "Enable debug output",
          })
          .demandCommand(1, "Please specify an agent subcommand")
          .help();
      },
      handler: () => {
        // No-op handler as subcommands handle everything
      },
    };
  }

  /**
   * Create the network command with subcommands
   */
  static createNetworkCommands(): CommandModule {
    return {
      command: "network <subcommand>",
      describe: "Manage agent networks for multi-agent orchestration",
      builder: (yargs) => {
        return yargs
          .command(
            "create",
            "Create a new agent network",
            (yargs) => this.buildNetworkCreateOptions(yargs),
            (argv) => this.executeNetworkCreate(argv as CliNetworkCommandArgs),
          )
          .command(
            "list",
            "List registered networks",
            (yargs) => this.buildNetworkListOptions(yargs),
            (argv) => this.executeNetworkList(argv as CliNetworkCommandArgs),
          )
          .command(
            "execute <id> <input>",
            "Execute an agent network with given input",
            (yargs) => this.buildNetworkExecuteOptions(yargs),
            (argv) => this.executeNetwork(argv as CliNetworkCommandArgs),
          )
          .command(
            "run <id> <input>",
            "Execute an agent network (alias for execute)",
            (yargs) => this.buildNetworkExecuteOptions(yargs),
            (argv) => this.executeNetwork(argv as CliNetworkCommandArgs),
          )
          .option("format", {
            choices: ["text", "json", "table"],
            default: "text",
            description: "Output format",
          })
          .option("output", {
            type: "string",
            description: "Save output to file",
          })
          .option("quiet", {
            type: "boolean",
            alias: "q",
            default: false,
            description: "Suppress non-essential output",
          })
          .option("debug", {
            type: "boolean",
            default: false,
            description: "Enable debug output",
          })
          .demandCommand(1, "Please specify a network subcommand")
          .help();
      },
      handler: () => {
        // No-op handler as subcommands handle everything
      },
    };
  }

  // ============================================================================
  // AGENT COMMAND BUILDERS
  // ============================================================================

  private static buildCreateOptions(yargs: Argv): Argv {
    return yargs
      .option("id", {
        type: "string",
        description: "Unique agent identifier",
        demandOption: true,
      })
      .option("name", {
        type: "string",
        description: "Human-readable agent name",
        demandOption: true,
      })
      .option("description", {
        type: "string",
        description: "Description of agent capabilities (for routing)",
        demandOption: true,
      })
      .option("instructions", {
        type: "string",
        description: "System instructions for the agent",
        demandOption: true,
      })
      .option("provider", {
        type: "string",
        description: "AI provider (e.g., openai, anthropic, vertex)",
      })
      .option("model", {
        type: "string",
        description: "Model to use (e.g., gpt-4o, claude-3-sonnet)",
      })
      .option("tools", {
        type: "array",
        description: "Tools available to the agent",
      })
      .option("maxSteps", {
        type: "number",
        default: 10,
        description: "Maximum execution steps",
      })
      .option("temperature", {
        type: "number",
        default: 0.7,
        description: "Generation temperature (0-1)",
      })
      .option("file", {
        type: "string",
        description: "Load agent definition from JSON file",
      })
      .example(
        '$0 agent create --id researcher --name "Research Agent" --description "Searches and analyzes information" --instructions "You are a research assistant..."',
        "Create a research agent",
      )
      .example(
        "$0 agent create --file agent-config.json",
        "Create agent from config file",
      );
  }

  private static buildListOptions(yargs: Argv): Argv {
    return yargs
      .option("detailed", {
        type: "boolean",
        default: false,
        description: "Show detailed agent information",
      })
      .example("$0 agent list", "List all registered agents")
      .example("$0 agent list --format json", "List agents in JSON format");
  }

  private static buildExecuteOptions(yargs: Argv): Argv {
    return yargs
      .positional("id", {
        type: "string",
        description: "Agent ID to execute",
        demandOption: true,
      })
      .positional("input", {
        type: "string",
        description: "Input prompt for the agent",
        demandOption: true,
      })
      .option("context", {
        type: "string",
        description: "Additional context as JSON",
      })
      .option("maxSteps", {
        type: "number",
        description: "Override maximum steps",
      })
      .option("stream", {
        type: "boolean",
        default: false,
        description: "Stream output in real-time",
      })
      .example(
        '$0 agent execute researcher "Find information about AI trends"',
        "Execute the researcher agent",
      )
      .example(
        '$0 agent run writer "Write a blog post" --stream',
        "Execute with streaming",
      );
  }

  // ============================================================================
  // NETWORK COMMAND BUILDERS
  // ============================================================================

  private static buildNetworkCreateOptions(yargs: Argv): Argv {
    return yargs
      .option("name", {
        type: "string",
        description: "Network name",
        demandOption: true,
      })
      .option("description", {
        type: "string",
        description: "Network description",
      })
      .option("file", {
        type: "string",
        description: "Load network configuration from JSON file",
        demandOption: true,
      })
      .option("routerProvider", {
        type: "string",
        description: "Provider for the routing agent",
      })
      .option("routerModel", {
        type: "string",
        description: "Model for the routing agent",
      })
      .example(
        '$0 network create --name "Content Team" --file network-config.json',
        "Create a content team network",
      );
  }

  private static buildNetworkListOptions(yargs: Argv): Argv {
    return yargs
      .option("detailed", {
        type: "boolean",
        default: false,
        description: "Show detailed network information",
      })
      .example("$0 network list", "List all registered networks")
      .example("$0 network list --format json", "List networks in JSON format");
  }

  private static buildNetworkExecuteOptions(yargs: Argv): Argv {
    return yargs
      .positional("id", {
        type: "string",
        description: "Network ID to execute",
        demandOption: true,
      })
      .positional("input", {
        type: "string",
        description: "Input message for the network",
        demandOption: true,
      })
      .option("context", {
        type: "string",
        description: "Additional context as JSON",
      })
      .option("maxSteps", {
        type: "number",
        default: 10,
        description: "Maximum execution steps",
      })
      .option("timeout", {
        type: "number",
        default: 120000,
        description: "Execution timeout in milliseconds",
      })
      .option("stream", {
        type: "boolean",
        default: false,
        description: "Stream output in real-time",
      })
      .example(
        '$0 network execute content-team "Write an article about AI"',
        "Execute the content team network",
      )
      .example(
        '$0 network run research-team "Analyze market trends" --stream',
        "Execute with streaming",
      );
  }

  // ============================================================================
  // AGENT COMMAND HANDLERS
  // ============================================================================

  private static async executeCreate(argv: CliAgentCommandArgs): Promise<void> {
    const spinner = ora("Creating agent...").start();

    try {
      let definition: AgentDefinition;

      if (argv.file) {
        // Load from file
        const filePath = path.resolve(argv.file);
        if (!fs.existsSync(filePath)) {
          throw new Error(`Agent definition file not found: ${filePath}`);
        }
        const content = fs.readFileSync(filePath, "utf-8");
        definition = JSON.parse(content) as AgentDefinition;
      } else {
        // Build from command line arguments
        definition = {
          id: argv.id!,
          name: argv.name!,
          description: argv.description!,
          instructions: argv.instructions!,
          provider: argv.provider,
          model: argv.model,
          tools: argv.tools as string[],
          maxSteps: argv.maxSteps,
          temperature: argv.temperature,
        };
      }

      // Validate required fields
      if (
        !definition.id ||
        !definition.name ||
        !definition.description ||
        !definition.instructions
      ) {
        throw new Error(
          "Agent definition requires: id, name, description, and instructions",
        );
      }

      // Register the agent
      registeredAgents.set(definition.id, definition);

      spinner.succeed(
        chalk.green(`Agent "${definition.name}" created successfully`),
      );

      if (!argv.quiet) {
        logger.always(chalk.cyan("\nAgent Details:"));
        logger.always(`  ID: ${definition.id}`);
        logger.always(`  Name: ${definition.name}`);
        logger.always(`  Description: ${definition.description}`);
        if (definition.provider) {
          logger.always(`  Provider: ${definition.provider}`);
        }
        if (definition.model) {
          logger.always(`  Model: ${definition.model}`);
        }
        if (definition.tools?.length) {
          logger.always(`  Tools: ${definition.tools.join(", ")}`);
        }
        logger.always(`  Max Steps: ${definition.maxSteps || 10}`);
        logger.always(`  Temperature: ${definition.temperature || 0.7}`);
      }

      if (argv.format === "json") {
        logger.always(JSON.stringify(definition, null, 2));
      }
    } catch (error) {
      spinner.fail(chalk.red("Failed to create agent"));
      logger.error((error as Error).message);
      process.exitCode = 1;
    }
  }

  private static async executeList(argv: CliAgentCommandArgs): Promise<void> {
    try {
      const agents = Array.from(registeredAgents.values());

      if (agents.length === 0) {
        logger.always(
          chalk.yellow(
            "No agents registered. Use 'neurolink agent create' to create one.",
          ),
        );
        return;
      }

      if (argv.format === "json") {
        logger.always(JSON.stringify(agents, null, 2));
        return;
      }

      if (argv.format === "table") {
        const tableData = agents.map((a) => ({
          ID: a.id,
          Name: a.name,
          Provider: a.provider || "default",
          Model: a.model || "default",
          Tools: a.tools?.length || 0,
        }));
        logger.info(JSON.stringify(tableData, null, 2));
        return;
      }

      // Text format
      logger.always(chalk.cyan(`\nRegistered Agents (${agents.length}):\n`));
      for (const agent of agents) {
        logger.always(chalk.bold(`  ${agent.name} (${agent.id})`));
        logger.always(chalk.gray(`    ${agent.description}`));
        if (agent.provider || agent.model) {
          logger.always(
            chalk.gray(
              `    Provider: ${agent.provider || "default"}, Model: ${agent.model || "default"}`,
            ),
          );
        }
        if (agent.tools?.length) {
          logger.always(chalk.gray(`    Tools: ${agent.tools.join(", ")}`));
        }
        logger.always("");
      }
    } catch (error) {
      logger.error(`Failed to list agents: ${(error as Error).message}`);
      process.exitCode = 1;
    }
  }

  private static async executeAgent(argv: CliAgentCommandArgs): Promise<void> {
    const spinner = ora("Executing agent...").start();

    try {
      const agentId = argv.id as string;
      const input = argv.input as string;

      // Get agent definition
      const definition = registeredAgents.get(agentId);
      if (!definition) {
        throw new Error(
          `Agent not found: ${agentId}. Use 'neurolink agent list' to see available agents.`,
        );
      }

      // Parse context if provided
      let context: Record<string, unknown> | undefined;
      if (argv.context) {
        try {
          context = JSON.parse(argv.context);
        } catch {
          throw new Error("Invalid JSON in --context parameter");
        }
      }

      // Create NeuroLink instance and agent
      const neurolink = new NeuroLink();
      const agent = await neurolink.createAgent(definition);

      if (argv.stream) {
        spinner.stop();
        logger.always(
          chalk.cyan(`\n[${definition.name}] Streaming response:\n`),
        );

        // Stream execution
        for await (const chunk of agent.stream(input, {
          context,
          maxSteps: argv.maxSteps,
        })) {
          if (chunk.type === "agent-text" && chunk.content) {
            process.stdout.write(chunk.content);
          } else if (chunk.type === "agent-tool-call" && chunk.toolName) {
            logger.always(chalk.yellow(`\n[Tool: ${chunk.toolName}]`));
          } else if (chunk.type === "agent-tool-result") {
            logger.always(
              chalk.green(
                `[Tool Result: ${chunk.success ? "Success" : "Failed"}]`,
              ),
            );
          } else if (chunk.type === "agent-complete") {
            logger.always(chalk.gray(`\n\nCompleted in ${chunk.duration}ms`));
          } else if (chunk.type === "agent-error") {
            logger.always(chalk.red(`\nError: ${chunk.error}`));
            process.exitCode = 1;
          }
        }
        logger.always("");
      } else {
        // Non-streaming execution
        const result = await agent.execute(input, {
          context,
          maxSteps: argv.maxSteps,
        });

        spinner.succeed(chalk.green("Agent execution completed"));

        if (argv.format === "json") {
          logger.always(JSON.stringify(result, null, 2));
        } else {
          logger.always(chalk.cyan(`\n[${definition.name}] Response:\n`));
          logger.always(result.content);

          if (!argv.quiet && result.toolsUsed?.length) {
            logger.always(
              chalk.gray(`\nTools used: ${result.toolsUsed.join(", ")}`),
            );
          }
          if (!argv.quiet) {
            logger.always(chalk.gray(`\nCompleted in ${result.duration}ms`));
          }
        }

        // Save to file if output specified
        if (argv.output) {
          const output =
            argv.format === "json"
              ? JSON.stringify(result, null, 2)
              : result.content;
          fs.writeFileSync(argv.output, output);
          logger.always(chalk.green(`\nOutput saved to: ${argv.output}`));
        }
      }
    } catch (error) {
      spinner.fail(chalk.red("Agent execution failed"));
      logger.error((error as Error).message);
      process.exitCode = 1;
    }
  }

  // ============================================================================
  // NETWORK COMMAND HANDLERS
  // ============================================================================

  private static async executeNetworkCreate(
    argv: CliNetworkCommandArgs,
  ): Promise<void> {
    const spinner = ora("Creating agent network...").start();

    try {
      if (!argv.file) {
        throw new Error(
          "Network configuration file is required. Use --file to specify.",
        );
      }

      // Load network configuration from file
      const filePath = path.resolve(argv.file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Network configuration file not found: ${filePath}`);
      }
      const content = fs.readFileSync(filePath, "utf-8");
      const config = JSON.parse(content) as AgentNetworkConfig;

      // Override with command line options
      if (argv.name) {
        config.name = argv.name;
      }
      if (argv.description) {
        config.description = argv.description;
      }
      if (argv.routerProvider || argv.routerModel) {
        config.router = config.router || {};
        if (argv.routerProvider) {
          config.router.provider = argv.routerProvider;
        }
        if (argv.routerModel) {
          config.router.model = argv.routerModel;
        }
      }

      // Validate required fields
      if (!config.name || !config.agents || config.agents.length === 0) {
        throw new Error(
          "Network configuration requires: name and at least one agent",
        );
      }

      // Generate ID if not provided
      const networkId =
        config.id || config.name.toLowerCase().replace(/\s+/g, "-");
      config.id = networkId;

      // Register the network
      registeredNetworks.set(networkId, config);

      // Also register individual agents
      for (const agentDef of config.agents) {
        registeredAgents.set(agentDef.id, agentDef);
      }

      spinner.succeed(
        chalk.green(`Network "${config.name}" created successfully`),
      );

      if (!argv.quiet) {
        logger.always(chalk.cyan("\nNetwork Details:"));
        logger.always(`  ID: ${networkId}`);
        logger.always(`  Name: ${config.name}`);
        if (config.description) {
          logger.always(`  Description: ${config.description}`);
        }
        logger.always(`  Agents: ${config.agents.length}`);
        for (const agent of config.agents) {
          logger.always(`    - ${agent.name} (${agent.id})`);
        }
        if (config.router?.provider) {
          logger.always(`  Router Provider: ${config.router.provider}`);
        }
        if (config.router?.model) {
          logger.always(`  Router Model: ${config.router.model}`);
        }
      }

      if (argv.format === "json") {
        logger.always(JSON.stringify(config, null, 2));
      }
    } catch (error) {
      spinner.fail(chalk.red("Failed to create network"));
      logger.error((error as Error).message);
      process.exitCode = 1;
    }
  }

  private static async executeNetworkList(
    argv: CliNetworkCommandArgs,
  ): Promise<void> {
    try {
      const networks = Array.from(registeredNetworks.values());

      if (networks.length === 0) {
        logger.always(
          chalk.yellow(
            "No networks registered. Use 'neurolink network create' to create one.",
          ),
        );
        return;
      }

      if (argv.format === "json") {
        logger.always(JSON.stringify(networks, null, 2));
        return;
      }

      if (argv.format === "table") {
        const tableData = networks.map((n) => ({
          ID: n.id || n.name.toLowerCase().replace(/\s+/g, "-"),
          Name: n.name,
          Agents: n.agents.length,
          Workflows: n.workflows?.length || 0,
          Tools: n.tools?.length || 0,
        }));
        logger.info(JSON.stringify(tableData, null, 2));
        return;
      }

      // Text format
      logger.always(
        chalk.cyan(`\nRegistered Networks (${networks.length}):\n`),
      );
      for (const network of networks) {
        const networkId =
          network.id || network.name.toLowerCase().replace(/\s+/g, "-");
        logger.always(chalk.bold(`  ${network.name} (${networkId})`));
        if (network.description) {
          logger.always(chalk.gray(`    ${network.description}`));
        }
        logger.always(
          chalk.gray(
            `    Agents: ${network.agents.map((a) => a.name).join(", ")}`,
          ),
        );
        if (network.workflows?.length) {
          logger.always(
            chalk.gray(`    Workflows: ${network.workflows.length}`),
          );
        }
        if (network.tools?.length) {
          logger.always(chalk.gray(`    Tools: ${network.tools.join(", ")}`));
        }
        logger.always("");
      }
    } catch (error) {
      logger.error(`Failed to list networks: ${(error as Error).message}`);
      process.exitCode = 1;
    }
  }

  private static async executeNetwork(
    argv: CliNetworkCommandArgs,
  ): Promise<void> {
    const spinner = ora("Executing agent network...").start();

    try {
      const networkId = argv.id as string;
      const input = argv.input as string;

      // Get network configuration
      const config = registeredNetworks.get(networkId);
      if (!config) {
        throw new Error(
          `Network not found: ${networkId}. Use 'neurolink network list' to see available networks.`,
        );
      }

      // Parse context if provided
      let context: Record<string, unknown> | undefined;
      if (argv.context) {
        try {
          context = JSON.parse(argv.context);
        } catch {
          throw new Error("Invalid JSON in --context parameter");
        }
      }

      // Create NeuroLink instance and network
      const neurolink = new NeuroLink();
      const network = await neurolink.createNetwork(config);

      if (argv.stream) {
        spinner.stop();
        logger.always(chalk.cyan(`\n[${config.name}] Streaming execution:\n`));

        // Stream execution
        for await (const chunk of neurolink.streamNetwork(
          network,
          {
            message: input,
            context,
          },
          {
            maxSteps: argv.maxSteps,
            timeout: argv.timeout,
          },
        )) {
          switch (chunk.type) {
            case "network-start": {
              const startChunk = chunk as NetworkStartChunk;
              logger.always(
                chalk.blue(`Network started: ${startChunk.networkId}`),
              );
              break;
            }
            case "routing-decision": {
              const routingChunk = chunk as RoutingDecisionChunk;
              logger.always(
                chalk.yellow(
                  `\nRouting to: ${routingChunk.decision.selectedPrimitive.name}`,
                ),
              );
              logger.always(
                chalk.gray(
                  `  Confidence: ${(routingChunk.decision.confidence * 100).toFixed(0)}%`,
                ),
              );
              logger.always(
                chalk.gray(`  Reasoning: ${routingChunk.decision.reasoning}`),
              );
              break;
            }
            case "primitive-start": {
              const primitiveStartChunk = chunk as PrimitiveStartChunk;
              logger.always(
                chalk.cyan(
                  `\n[${primitiveStartChunk.primitive.name}] Starting...`,
                ),
              );
              break;
            }
            case "agent-text": {
              const textChunk = chunk as AgentTextChunk;
              process.stdout.write(textChunk.content);
              break;
            }
            case "agent-tool-call": {
              const toolCallChunk = chunk as AgentToolCallChunk;
              logger.always(
                chalk.yellow(`\n[Tool: ${toolCallChunk.toolName}]`),
              );
              break;
            }
            case "agent-tool-result": {
              const toolResultChunk = chunk as AgentToolResultChunk;
              logger.always(
                chalk.green(
                  `[Tool Result: ${toolResultChunk.success ? "Success" : "Failed"}]`,
                ),
              );
              break;
            }
            case "primitive-end": {
              const primitiveEndChunk = chunk as PrimitiveEndChunk;
              logger.always(
                chalk.cyan(`\n[${primitiveEndChunk.primitive.name}] Completed`),
              );
              break;
            }
            case "network-complete": {
              const completeChunk = chunk as NetworkCompleteChunk;
              logger.always(
                chalk.green(
                  `\n\nNetwork completed in ${completeChunk.result.duration}ms`,
                ),
              );
              logger.always(
                chalk.gray(
                  `Steps taken: ${completeChunk.result.trace.steps.length}`,
                ),
              );
              break;
            }
            case "network-error": {
              const errorChunk = chunk as NetworkErrorChunk;
              logger.always(chalk.red(`\nNetwork error: ${errorChunk.error}`));
              process.exitCode = 1;
              break;
            }
          }
        }
        logger.always("");
      } else {
        // Non-streaming execution
        const result = await neurolink.executeNetwork(
          network,
          {
            message: input,
            context,
          },
          {
            maxSteps: argv.maxSteps,
            timeout: argv.timeout,
          },
        );

        spinner.succeed(chalk.green("Network execution completed"));

        if (argv.format === "json") {
          logger.always(JSON.stringify(result, null, 2));
        } else {
          logger.always(chalk.cyan(`\n[${config.name}] Result:\n`));
          logger.always(result.content);

          if (!argv.quiet) {
            logger.always(chalk.gray(`\nStatus: ${result.status}`));
            logger.always(chalk.gray(`Duration: ${result.duration}ms`));
            logger.always(chalk.gray(`Steps: ${result.trace.steps.length}`));

            if (result.trace.routingDecisions.length > 0) {
              logger.always(chalk.gray("\nRouting History:"));
              for (const decision of result.trace.routingDecisions) {
                logger.always(
                  chalk.gray(
                    `  ${decision.stepIndex + 1}. ${decision.selectedPrimitive.name} (${(decision.confidence * 100).toFixed(0)}%)`,
                  ),
                );
              }
            }
          }
        }

        // Save to file if output specified
        if (argv.output) {
          const output =
            argv.format === "json"
              ? JSON.stringify(result, null, 2)
              : result.content;
          fs.writeFileSync(argv.output, output);
          logger.always(chalk.green(`\nOutput saved to: ${argv.output}`));
        }
      }
    } catch (error) {
      spinner.fail(chalk.red("Network execution failed"));
      logger.error((error as Error).message);
      process.exitCode = 1;
    }
  }
}
