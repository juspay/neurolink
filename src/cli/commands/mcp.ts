/**
 * MCP CLI Commands for NeuroLink
 * Implements comprehensive MCP server management commands
 * Part of Phase 4.2 - MCP CLI Commands
 *
 * Enhanced in Phase 8.39.0 with:
 * - neurolink mcp servers - List all MCP servers
 * - neurolink mcp tools - List all available tools
 * - neurolink mcp discover - Enhanced tool discovery
 * - neurolink mcp create-server - Scaffold a new MCP server
 * - neurolink mcp annotate - Add/update tool annotations
 */

import type { CommandModule, Argv } from "yargs";
import type { UnknownRecord } from "../../lib/types/common.js";
import type {
  MCPServerInfo,
  MCPStatus,
  MCPTransportType,
} from "../../lib/types/mcpTypes.js";
import { createExternalServerInfo } from "../../lib/utils/mcpDefaults.js";
import type { MCPCommandArgs } from "../../lib/types/cli.js";
import { NeuroLink } from "../../lib/neurolink.js";
import { logger } from "../../lib/utils/logger.js";
import chalk from "chalk";
import ora from "ora";
import fs from "fs";
import path from "path";
import {
  getAnnotationSummary,
  validateAnnotations,
  mergeAnnotations,
  inferAnnotations,
} from "../../lib/mcp/toolAnnotations.js";
import type { MCPToolAnnotations } from "../../lib/mcp/toolAnnotations.js";
import { withTimeout, ErrorFactory } from "../../lib/utils/errorHandling.js";

// Using MCPCommandArgs from types/cli.ts

/**
 * Response interface for MCP status information returned from the NeuroLink SDK.
 * This interface represents the raw status data that gets converted to CLI-friendly format.
 *
 * @interface MCPStatusResponse
 * @since 7.6.1
 *
 * @example
 * ```typescript
 * const status: MCPStatusResponse = {
 *   autoDiscoveredServers: [
 *     {
 *       name: "filesystem",
 *       id: "fs-server-001",
 *       status: "connected",
 *       source: "claude-desktop"
 *     }
 *   ],
 *   mcpInitialized: true,
 *   totalServers: 3,
 *   availableServers: 2
 * };
 * ```
 */
/**
 * Popular MCP servers registry
 */
const POPULAR_MCP_SERVERS: Record<
  string,
  Pick<MCPServerInfo, "command" | "args" | "env" | "transport" | "description">
> = {
  filesystem: {
    command: "npx",
    args: [
      "-y",
      "@modelcontextprotocol/server-filesystem",
      "/path/to/allowed/files",
    ],
    transport: "stdio",
    description:
      "File system operations (read, write, create, list directories)",
  },
  github: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    env: { GITHUB_PERSONAL_ACCESS_TOKEN: "${GITHUB_PERSONAL_ACCESS_TOKEN}" },
    transport: "stdio",
    description: "GitHub repository management and file operations",
  },
  postgres: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-postgres"],
    env: { DATABASE_URL: "${DATABASE_URL}" },
    transport: "stdio",
    description: "PostgreSQL database query and management",
  },
  sqlite: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-sqlite", "/path/to/database.db"],
    transport: "stdio",
    description: "SQLite database operations and queries",
  },
  brave: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-brave-search"],
    env: { BRAVE_API_KEY: "${BRAVE_API_KEY}" },
    transport: "stdio",
    description: "Brave Search API for web search capabilities",
  },
  puppeteer: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-puppeteer"],
    transport: "stdio",
    description: "Web scraping and browser automation",
  },
  git: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-git"],
    transport: "stdio",
    description: "Git repository operations and version control",
  },
  memory: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-memory"],
    transport: "stdio",
    description: "Persistent memory and knowledge storage",
  },
  bitbucket: {
    command: "npx",
    args: ["-y", "@nexus2520/bitbucket-mcp-server"],
    env: {
      BITBUCKET_USERNAME: "${BITBUCKET_USERNAME}",
      BITBUCKET_TOKEN: "${BITBUCKET_TOKEN}",
      BITBUCKET_BASE_URL: "${BITBUCKET_BASE_URL}",
    },
    transport: "stdio",
    description: "Bitbucket repository management and development workflows",
  },
};

/**
 * MCP CLI command factory
 */
export class MCPCommandFactory {
  /**
   * Create the main MCP command with subcommands
   */
  static createMCPCommands(): CommandModule {
    return {
      command: "mcp <subcommand>",
      describe: "Manage Model Context Protocol (MCP) servers",
      builder: (yargs) => {
        return yargs
          .command(
            "list",
            "List configured MCP servers with status",
            (yargs) => this.buildListOptions(yargs),
            (argv) => this.executeList(argv as MCPCommandArgs),
          )
          .command(
            "servers",
            "List all MCP servers with detailed status",
            (yargs) => this.buildServersOptions(yargs),
            (argv) => this.executeServers(argv as MCPCommandArgs),
          )
          .command(
            "tools",
            "List all available tools across MCP servers",
            (yargs) => this.buildToolsOptions(yargs),
            (argv) => this.executeTools(argv as MCPCommandArgs),
          )
          .command(
            "discover",
            "Discover tools from MCP servers with annotations",
            (yargs) => this.buildDiscoverToolsOptions(yargs),
            (argv) => this.executeDiscoverTools(argv as MCPCommandArgs),
          )
          .command(
            "create-server <name>",
            "Create a new MCP server scaffold",
            (yargs) => this.buildCreateServerOptions(yargs),
            (argv) => this.executeCreateServer(argv as MCPCommandArgs),
          )
          .command(
            "annotate",
            "Add or update annotations for MCP tools",
            (yargs) => this.buildAnnotateOptions(yargs),
            (argv) => this.executeAnnotate(argv as MCPCommandArgs),
          )
          .command(
            "install <server>",
            "Install popular MCP servers",
            (yargs) => this.buildInstallOptions(yargs),
            (argv) => this.executeInstall(argv as MCPCommandArgs),
          )
          .command(
            "add <name> <command>",
            "Add custom MCP server configuration",
            (yargs) => this.buildAddOptions(yargs),
            (argv) => this.executeAdd(argv as MCPCommandArgs),
          )
          .command(
            "test [server]",
            "Test connectivity to MCP servers",
            (yargs) => this.buildTestOptions(yargs),
            (argv) => this.executeTest(argv as MCPCommandArgs),
          )
          .command(
            "exec <server> <tool>",
            "Execute tools from MCP servers",
            (yargs) => this.buildExecOptions(yargs),
            (argv) => this.executeExec(argv as MCPCommandArgs),
          )
          .command(
            "remove <server>",
            "Remove MCP server configuration",
            (yargs) => this.buildRemoveOptions(yargs),
            (argv) => this.executeRemove(argv as MCPCommandArgs),
          )
          .command(this.createRegistryCommand())
          .option("format", {
            choices: ["table", "json", "compact"],
            default: "table",
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
          .demandCommand(1, "Please specify an MCP subcommand")
          .help();
      },
      handler: () => {
        // No-op handler as subcommands handle everything
      },
    };
  }

  /**
   * Create discover command (top-level command)
   */
  static createDiscoverCommand(): CommandModule {
    return {
      command: "discover",
      describe: "Auto-discover MCP servers from various sources",
      builder: (yargs) => {
        return yargs
          .option("auto-install", {
            type: "boolean",
            default: false,
            description: "Automatically install discovered servers",
          })
          .option("source", {
            choices: ["claude-desktop", "vscode", "all"],
            default: "all",
            description: "Source to discover servers from",
          })
          .option("format", {
            choices: ["table", "json", "compact"],
            default: "table",
            description: "Output format",
          })
          .option("quiet", {
            type: "boolean",
            alias: "q",
            default: false,
            description: "Suppress non-essential output",
          })
          .example(
            "neurolink discover",
            "Discover MCP servers from all sources",
          )
          .example(
            "neurolink discover --source claude-desktop",
            "Discover from Claude Desktop only",
          )
          .example(
            "neurolink discover --auto-install",
            "Discover and auto-install servers",
          );
      },
      handler: async (argv) =>
        await MCPCommandFactory.executeDiscover(argv as MCPCommandArgs),
    };
  }

  /**
   * Build options for list command
   */
  private static buildListOptions(yargs: Argv): Argv {
    return yargs
      .option("status", {
        type: "boolean",
        default: false,
        description: "Check server connection status",
      })
      .option("detailed", {
        type: "boolean",
        default: false,
        description: "Show detailed server information",
      })
      .example("neurolink mcp list", "List all configured MCP servers")
      .example(
        "neurolink mcp list --status",
        "List servers with connection status",
      )
      .example(
        "neurolink mcp list --detailed",
        "Show detailed server information",
      );
  }

  /**
   * Build options for install command
   */
  private static buildInstallOptions(yargs: Argv): Argv {
    return yargs
      .positional("server", {
        type: "string",
        description: "Server name to install from popular registry",
        choices: Object.keys(POPULAR_MCP_SERVERS),
        demandOption: true,
      })
      .option("transport", {
        choices: ["stdio", "sse", "websocket"] as MCPTransportType[],
        default: "stdio" as MCPTransportType,
        description: "Transport type for MCP communication",
      })
      .option("args", {
        type: "array",
        description: "Additional arguments for the server command",
      })
      .option("env", {
        type: "string",
        description: "Environment variables as JSON string",
      })
      .example(
        "neurolink mcp install filesystem",
        "Install filesystem MCP server",
      )
      .example("neurolink mcp install github", "Install GitHub MCP server")
      .example(
        "neurolink mcp install postgres",
        "Install PostgreSQL MCP server",
      );
  }

  /**
   * Build options for add command
   */
  private static buildAddOptions(yargs: Argv): Argv {
    return yargs
      .positional("name", {
        type: "string",
        description: "Name for the custom MCP server",
        demandOption: true,
      })
      .positional("command", {
        type: "string",
        description: "Command to execute the MCP server",
        demandOption: true,
      })
      .option("transport", {
        choices: ["stdio", "sse", "websocket"] as MCPTransportType[],
        default: "stdio" as MCPTransportType,
        description: "Transport type for MCP communication",
      })
      .option("args", {
        type: "array",
        description: "Arguments for the server command",
      })
      .option("env", {
        type: "string",
        description: "Environment variables as JSON string",
      })
      .example(
        "neurolink mcp add my-server node",
        "Add custom Node.js MCP server",
      )
      .example(
        "neurolink mcp add api-server python",
        "Add custom Python MCP server",
      );
  }

  /**
   * Build options for test command
   */
  private static buildTestOptions(yargs: Argv): Argv {
    return yargs
      .positional("server", {
        type: "string",
        description:
          "Server name to test (optional - tests all if not specified)",
      })
      .option("timeout", {
        type: "number",
        default: 10000,
        description: "Test timeout in milliseconds",
      })
      .example("neurolink mcp test", "Test all configured servers")
      .example("neurolink mcp test filesystem", "Test specific server")
      .example("neurolink mcp test --timeout 5000", "Test with custom timeout");
  }

  /**
   * Build options for exec command
   */
  private static buildExecOptions(yargs: Argv): Argv {
    return yargs
      .positional("server", {
        type: "string",
        description: "MCP server name",
        demandOption: true,
      })
      .positional("tool", {
        type: "string",
        description: "Tool name to execute",
        demandOption: true,
      })
      .option("params", {
        type: "string",
        description: "Tool parameters as JSON string",
      })
      .example(
        "neurolink mcp exec filesystem read_file",
        "Execute read_file tool",
      )
      .example(
        "neurolink mcp exec github list_repos",
        "Execute GitHub list_repos tool",
      );
  }

  /**
   * Build options for remove command
   */
  private static buildRemoveOptions(yargs: Argv): Argv {
    return yargs
      .positional("server", {
        type: "string",
        description: "Server name to remove",
        demandOption: true,
      })
      .option("force", {
        type: "boolean",
        default: false,
        description: "Force removal without confirmation",
      })
      .example("neurolink mcp remove filesystem", "Remove filesystem server")
      .example(
        "neurolink mcp remove old-server --force",
        "Force remove without confirmation",
      );
  }

  /**
   * Execute list command
   */
  private static async executeList(argv: MCPCommandArgs): Promise<void> {
    try {
      const spinner = argv.quiet ? null : ora("Loading MCP servers...").start();

      // Get configured servers from NeuroLink
      const sdk = new NeuroLink();
      const mcpStatus: MCPStatus = await sdk.getMCPStatus();
      const allServers = await sdk.listMCPServers();

      if (spinner) {
        spinner.succeed(`Found ${allServers.length} MCP servers`);
      }

      if (allServers.length === 0) {
        logger.always(chalk.yellow("No MCP servers configured."));
        logger.always(
          chalk.blue(
            "💡 Use 'neurolink mcp install <server>' to install popular servers",
          ),
        );
        logger.always(
          chalk.blue("💡 Use 'neurolink discover' to find existing servers"),
        );
        return;
      }

      // Format and display results
      if (argv.format === "json") {
        logger.always(JSON.stringify(mcpStatus, null, 2));
      } else if ((argv.format as string) === "compact") {
        const allServers = await sdk.listMCPServers();
        allServers.forEach((server) => {
          const status =
            server.status === "connected" ? chalk.green("✓") : chalk.red("✗");
          logger.always(
            `${status} ${server.name} - ${server.description || "No description"}`,
          );
        });
      } else {
        // Table format
        logger.always(chalk.bold("\n🔧 MCP Servers:\n"));

        const allServers = await sdk.listMCPServers();
        for (const server of allServers) {
          const status =
            server.status === "connected"
              ? chalk.green("CONNECTED")
              : chalk.red("DISCONNECTED");

          logger.always(`${chalk.cyan(server.name)} ${status}`);
          logger.always(`  Command: ${server.command || "Unknown"}`);
          logger.always(`  Tools: ${server.tools?.length || 0} available`);

          if (argv.detailed && server.tools) {
            server.tools.forEach((tool) => {
              logger.always(`    • ${tool.name}: ${tool.description}`);
            });
          }

          if (server.error) {
            logger.always(`  ${chalk.red("Error:")} ${server.error}`);
          }

          logger.always();
        }
      }
    } catch (_error) {
      logger.error(
        chalk.red(`❌ List command failed: ${(_error as Error).message}`),
      );
      process.exit(1);
    }
  }

  /**
   * Execute install command
   */
  private static async executeInstall(argv: MCPCommandArgs): Promise<void> {
    try {
      const serverName = argv.server;
      if (!serverName) {
        logger.error(chalk.red("❌ Server name is required"));
        process.exit(1);
      }
      const serverConfig = POPULAR_MCP_SERVERS[serverName];

      if (!serverConfig) {
        logger.error(chalk.red(`❌ Unknown server: ${serverName}`));
        logger.always(chalk.blue("Available servers:"));
        Object.keys(POPULAR_MCP_SERVERS).forEach((name) => {
          logger.always(
            `  • ${name}: ${POPULAR_MCP_SERVERS[name].description}`,
          );
        });
        process.exit(1);
      }

      const spinner = argv.quiet
        ? null
        : ora(`Installing ${serverName} MCP server...`).start();

      // Parse environment variables if provided
      let env = serverConfig.env;
      if (argv.env) {
        try {
          const parsedEnv = JSON.parse(argv.env);
          env = { ...env, ...parsedEnv } as Record<string, string>;
        } catch (error) {
          if (spinner) {
            spinner.fail();
          }
          logger.error(chalk.red("❌ Invalid JSON in env parameter"));
          logger.error(
            chalk.red(
              `Error details: ${error instanceof Error ? error.message : String(error)}`,
            ),
          );
          process.exit(1);
        }
      }

      const serverInfo = createExternalServerInfo({
        ...serverConfig,
        id: serverName,
        name: serverName,
        env,
      });

      // Add server to NeuroLink - direct usage, zero transformations!
      const sdk = new NeuroLink();
      await sdk.addInMemoryMCPServer(serverName, serverInfo);

      if (spinner) {
        spinner.succeed(
          chalk.green(`✅ Successfully installed ${serverName} MCP server`),
        );
      }

      // Display configuration info
      logger.always(chalk.bold("\n📋 Server Configuration:"));
      logger.always(`Name: ${serverInfo.name}`);
      logger.always(`Command: ${serverInfo.command}`);
      if (serverInfo.args?.length) {
        logger.always(`Args: ${serverInfo.args.join(" ")}`);
      }
      if (serverInfo.env) {
        logger.always(
          `Environment: ${Object.keys(serverInfo.env).length} variables`,
        );
      }
      logger.always(`Transport: ${serverInfo.transport}`);
      logger.always(`Description: ${serverInfo.description}`);

      // Test connection
      logger.always(chalk.blue("\n🔍 Testing connection..."));
      try {
        const rawStatus = await sdk.getMCPStatus();
        const status: MCPStatus = rawStatus;
        const installedServer = status.externalMCPServers?.find(
          (s: MCPServerInfo) => s.name === serverName,
        );
        if (installedServer?.status === "connected") {
          logger.always(chalk.green("✅ Server connected successfully"));
          if (installedServer.tools?.length) {
            logger.always(
              `🛠️  Available tools: ${installedServer.tools.length}`,
            );
          }
        } else {
          logger.always(chalk.yellow("⚠️  Server installed but not connected"));
          if (installedServer?.error) {
            logger.always(chalk.red(`Error: ${installedServer.error}`));
          }
        }
      } catch (testError) {
        logger.always(chalk.yellow("⚠️  Could not test connection"));
        logger.debug(
          `Test connection _error: ${testError instanceof Error ? testError.message : String(testError)}`,
        );
      }
    } catch (_error) {
      logger.error(
        chalk.red(`❌ Install command failed: ${(_error as Error).message}`),
      );
      process.exit(1);
    }
  }

  /**
   * Execute add command
   */
  private static async executeAdd(argv: MCPCommandArgs): Promise<void> {
    try {
      const name = argv.name;
      if (!name) {
        logger.error(chalk.red("❌ Server name is required"));
        process.exit(1);
      }
      const command = argv.command;
      if (!command) {
        logger.error(chalk.red("❌ Command is required"));
        process.exit(1);
      }

      const spinner = argv.quiet
        ? null
        : ora(`Adding custom MCP server: ${name}...`).start();

      // Parse environment variables if provided
      let env: Record<string, string> | undefined;
      if (argv.env) {
        try {
          env = JSON.parse(argv.env) as Record<string, string>;
        } catch (error) {
          if (spinner) {
            spinner.fail();
          }
          logger.error(chalk.red("❌ Invalid JSON in env parameter"));
          logger.error(
            chalk.red(
              `Error details: ${error instanceof Error ? error.message : String(error)}`,
            ),
          );
          process.exit(1);
        }
      }

      const serverInfo = createExternalServerInfo({
        id: name,
        name,
        command,
        args: argv.args,
        env,
        transport:
          (argv.transport as MCPTransportType) || ("stdio" as MCPTransportType),
        description: command,
      });

      // Add server to NeuroLink using MCPServerInfo directly
      const sdk = new NeuroLink();
      await sdk.addInMemoryMCPServer(name, serverInfo);

      if (spinner) {
        spinner.succeed(
          chalk.green(`✅ Successfully added ${name} MCP server`),
        );
      }

      // Display configuration
      logger.always(chalk.bold("\n📋 Server Configuration:"));
      logger.always(`Name: ${serverInfo.name}`);
      logger.always(`Command: ${serverInfo.command}`);
      if (serverInfo.args?.length) {
        logger.always(`Args: ${serverInfo.args.join(" ")}`);
      }
      if (serverInfo.env) {
        logger.always(
          `Environment: ${Object.keys(serverInfo.env).length} variables`,
        );
      }
      logger.always(`Transport: ${serverInfo.transport}`);
    } catch (_error) {
      logger.error(
        chalk.red(`❌ Add command failed: ${(_error as Error).message}`),
      );
      process.exit(1);
    }
  }

  /**
   * Execute test command
   */
  private static async executeTest(argv: MCPCommandArgs): Promise<void> {
    try {
      const targetServer = argv.server;
      const spinner = argv.quiet
        ? null
        : ora("Testing MCP server connections...").start();

      const sdk = new NeuroLink();
      let serversToTest = await sdk.listMCPServers();
      if (targetServer) {
        serversToTest = serversToTest.filter((s) => s.name === targetServer);
        if (serversToTest.length === 0) {
          if (spinner) {
            spinner.fail();
          }
          logger.error(chalk.red(`❌ Server not found: ${targetServer}`));
          process.exit(1);
        }
      }

      if (spinner) {
        spinner.succeed(`Testing ${serversToTest.length} servers`);
      }

      // Display test results
      logger.always(chalk.bold("\n🧪 MCP Server Test Results:\n"));

      for (const server of serversToTest) {
        const status =
          server.status === "connected"
            ? chalk.green("✅ CONNECTED")
            : chalk.red("❌ DISCONNECTED");

        logger.always(`${server.name}: ${status}`);

        if (server.status === "connected") {
          logger.always(`  Tools: ${server.tools?.length || 0} available`);
          if (server.tools?.length) {
            server.tools.slice(0, 3).forEach((tool) => {
              logger.always(`    • ${tool.name}`);
            });
            if (server.tools.length > 3) {
              logger.always(`    ... and ${server.tools.length - 3} more`);
            }
          }
        } else {
          if (server.error) {
            logger.always(`  ${chalk.red("Error:")} ${server.error}`);
          }
          logger.always(
            chalk.yellow(
              "  💡 Try: neurolink mcp remove && neurolink mcp install",
            ),
          );
        }
        logger.always();
      }

      // Summary
      const connected = serversToTest.filter(
        (s) => s.status === "connected",
      ).length;
      const total = serversToTest.length;

      if (connected === total) {
        logger.always(
          chalk.green(`🎉 All ${total} servers connected successfully`),
        );
      } else {
        logger.always(
          chalk.yellow(`⚠️  ${connected}/${total} servers connected`),
        );
      }
    } catch (_error) {
      logger.error(
        chalk.red(`❌ Test command failed: ${(_error as Error).message}`),
      );
      process.exit(1);
    }
  }

  /**
   * Execute exec command
   */
  private static async executeExec(argv: MCPCommandArgs): Promise<void> {
    try {
      const serverName = argv.server;
      if (!serverName) {
        logger.error(chalk.red("❌ Server name is required"));
        process.exit(1);
      }
      const toolName = argv.tool;
      if (!toolName) {
        logger.error(chalk.red("❌ Tool name is required"));
        process.exit(1);
      }

      const spinner = argv.quiet
        ? null
        : ora(`Executing ${toolName} on ${serverName}...`).start();

      // Parse parameters if provided
      let params: UnknownRecord = {};
      if (argv.params) {
        try {
          params = JSON.parse(argv.params);
        } catch (error) {
          if (spinner) {
            spinner.fail();
          }
          logger.error(chalk.red("❌ Invalid JSON in params parameter"));
          logger.error(
            chalk.red(
              `Error details: ${error instanceof Error ? error.message : String(error)}`,
            ),
          );
          process.exit(1);
        }
      }

      const sdk = new NeuroLink();

      // Check if server exists and is connected
      const allServers = await sdk.listMCPServers();
      const server = allServers.find((s) => s.name === serverName);

      if (!server) {
        if (spinner) {
          spinner.fail();
        }
        logger.error(chalk.red(`❌ Server not found: ${serverName}`));
        process.exit(1);
      }

      if (server.status !== "connected") {
        if (spinner) {
          spinner.fail();
        }
        logger.error(chalk.red(`❌ Server not connected: ${serverName}`));
        logger.always(chalk.yellow("💡 Try: neurolink mcp test " + serverName));
        process.exit(1);
      }

      // Check if tool exists
      const tool = server.tools?.find((t) => t.name === toolName);
      if (!tool) {
        if (spinner) {
          spinner.fail();
        }
        logger.error(chalk.red(`❌ Tool not found: ${toolName}`));
        if (server.tools?.length) {
          logger.always(chalk.blue("Available tools:"));
          server.tools.forEach((t) => {
            logger.always(`  • ${t.name}: ${t.description}`);
          });
        }
        process.exit(1);
      }

      // Execute the tool using the NeuroLink MCP tool registry
      try {
        const { toolRegistry } = await import("../../lib/mcp/toolRegistry.js");
        const executionResult = await toolRegistry.executeTool(
          toolName,
          params,
          {
            sessionId: `cli-${Date.now()}`,
            userId: process.env.USER || "cli-user",
            config: {
              domainType: "cli-execution",
              customData: { serverName },
            },
          },
        );

        const result = {
          tool: toolName,
          server: serverName,
          params,
          result: executionResult,
          success: true,
          timestamp: new Date().toISOString(),
        };

        if (spinner) {
          spinner.succeed(chalk.green("✅ Tool executed successfully"));
        }

        // Display results
        if (argv.format === "json") {
          logger.always(JSON.stringify(result, null, 2));
        } else {
          logger.always(chalk.green("🔧 Tool Execution Results:"));
          logger.always(`   Tool: ${chalk.cyan(toolName)}`);
          logger.always(`   Server: ${chalk.cyan(serverName)}`);
          logger.always(
            `   Result: ${JSON.stringify(executionResult, null, 2)}`,
          );
          logger.always(`   Timestamp: ${result.timestamp}`);
        }
      } catch (toolError) {
        const errorMessage =
          toolError instanceof Error ? toolError.message : String(toolError);

        if (spinner) {
          spinner.fail(chalk.red("❌ Tool execution failed"));
        }

        const result = {
          tool: toolName,
          server: serverName,
          params,
          _error: errorMessage,
          success: false,
          timestamp: new Date().toISOString(),
        };

        if (argv.format === "json") {
          logger.always(JSON.stringify(result, null, 2));
        } else {
          logger.error(chalk.red("🔧 Tool Execution Failed:"));
          logger.error(`   Tool: ${chalk.cyan(toolName)}`);
          logger.error(`   Server: ${chalk.cyan(serverName)}`);
          logger.error(`   Error: ${chalk.red(errorMessage)}`);
        }

        process.exit(1);
      }
    } catch (_error) {
      logger.error(
        chalk.red(`❌ Exec command failed: ${(_error as Error).message}`),
      );
      process.exit(1);
    }
  }

  /**
   * Execute remove command
   */
  private static async executeRemove(argv: MCPCommandArgs): Promise<void> {
    try {
      const serverName = argv.server;
      if (!serverName) {
        logger.error(chalk.red("❌ Server name is required"));
        process.exit(1);
      }

      const sdk = new NeuroLink();
      const allServers = await sdk.listMCPServers();
      const server = allServers.find((s) => s.name === serverName);

      if (!server) {
        logger.error(chalk.red(`❌ Server not found: ${serverName}`));
        process.exit(1);
      }

      // Confirmation unless forced
      if (!argv.force) {
        logger.always(
          chalk.yellow(`⚠️  This will remove the MCP server: ${serverName}`),
        );
        logger.always("Use --force flag to confirm removal");
        process.exit(1);
      }

      const spinner = argv.quiet
        ? null
        : ora(`Removing MCP server: ${serverName}...`).start();

      // Remove server using the NeuroLink MCP tool registry
      try {
        const { toolRegistry } = await import("../../lib/mcp/toolRegistry.js");
        const removed = toolRegistry.unregisterServer(serverName);

        if (!removed) {
          throw new Error(
            `Failed to remove server ${serverName} from registry`,
          );
        }

        if (spinner) {
          spinner.succeed(
            chalk.green(`✅ Server ${serverName} removed successfully`),
          );
        }

        logger.always(
          chalk.green(`🗑️  Successfully removed MCP server: ${serverName}`),
        );
        logger.always(
          chalk.gray("   All associated tools have been unregistered"),
        );
      } catch (removalError) {
        const errorMessage =
          removalError instanceof Error
            ? removalError.message
            : String(removalError);

        if (spinner) {
          spinner.fail(chalk.red(`❌ Failed to remove server ${serverName}`));
        }

        logger.error(chalk.red(`❌ Server removal failed: ${errorMessage}`));
        process.exit(1);
      }
    } catch (_error) {
      logger.error(
        chalk.red(`❌ Remove command failed: ${(_error as Error).message}`),
      );
      process.exit(1);
    }
  }

  /**
   * Execute discover command
   */
  private static async executeDiscover(argv: MCPCommandArgs): Promise<void> {
    try {
      const spinner = argv.quiet
        ? null
        : ora("Discovering MCP servers...").start();

      const discovered: MCPServerInfo[] = [];

      // Discover from Claude Desktop
      if (argv.source === "claude-desktop" || argv.source === "all") {
        const claudeServers = await this.discoverFromClaudeDesktop();
        discovered.push(...claudeServers);
      }

      // Discover from VS Code
      if (argv.source === "vscode" || argv.source === "all") {
        const vscodeServers = await this.discoverFromVSCode();
        discovered.push(...vscodeServers);
      }

      if (spinner) {
        spinner.succeed(`Discovered ${discovered.length} MCP servers`);
      }

      if (discovered.length === 0) {
        logger.always(chalk.yellow("No MCP servers discovered."));
        logger.always(
          chalk.blue(
            "💡 Try installing popular servers: neurolink mcp install filesystem",
          ),
        );
        return;
      }

      // Display discovered servers
      if (argv.format === "json") {
        logger.always(JSON.stringify(discovered, null, 2));
      } else {
        logger.always(chalk.bold("\n🔍 Discovered MCP Servers:\n"));

        discovered.forEach((server) => {
          logger.always(`${chalk.cyan(server.name)}`);
          logger.always(`  Command: ${server.command}`);
          logger.always(`  Source: ${server.description || "Unknown"}`);
          logger.always(`  Status: ${server.status}`);
          logger.always();
        });
      }

      // Auto-install if requested
      if (argv.autoInstall && discovered.length > 0) {
        logger.always(chalk.blue("🚀 Auto-installing discovered servers..."));
        const sdk = new NeuroLink();

        for (const server of discovered) {
          try {
            // Use discovered MCPServerInfo directly - zero conversions!
            await sdk.addInMemoryMCPServer(server.name, server);
            logger.always(chalk.green(`✅ Installed ${server.name}`));
          } catch (_error) {
            logger.always(
              chalk.red(
                `❌ Failed to install ${server.name}: ${(_error as Error).message}`,
              ),
            );
          }
        }
      }
    } catch (_error) {
      logger.error(
        chalk.red(`❌ Discover command failed: ${(_error as Error).message}`),
      );
      process.exit(1);
    }
  }

  /**
   * Discover servers from Claude Desktop configuration
   */
  private static async discoverFromClaudeDesktop(): Promise<MCPServerInfo[]> {
    const servers: MCPServerInfo[] = [];

    try {
      // Common Claude Desktop config paths
      const possiblePaths = [
        path.join(
          process.env.HOME || "",
          "Library",
          "Application Support",
          "Claude",
          "claude_desktop_config.json",
        ),
        path.join(
          process.env.APPDATA || "",
          "Claude",
          "claude_desktop_config.json",
        ),
        path.join(
          process.env.HOME || "",
          ".config",
          "claude",
          "claude_desktop_config.json",
        ),
      ];

      for (const configPath of possiblePaths) {
        if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

          if (config.mcpServers) {
            Object.entries(config.mcpServers).forEach(
              ([name, serverConfig]) => {
                const typedConfig = serverConfig as MCPServerInfo;
                // SMART DEFAULTS: Use utility to eliminate manual MCPServerInfo creation
                servers.push(
                  createExternalServerInfo({
                    ...typedConfig,
                    id: name,
                    name,
                    description: "Discovered from Claude Desktop",
                  }),
                );
              },
            );
          }
          break; // Found config file, stop searching
        }
      }
    } catch (error) {
      // Log discovery errors for debugging but don't fail
      logger.debug(
        `Claude Desktop discovery error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return servers;
  }

  /**
   * Discover servers from VS Code configuration
   */
  private static async discoverFromVSCode(): Promise<MCPServerInfo[]> {
    const servers: MCPServerInfo[] = [];

    try {
      // VS Code settings paths
      const possiblePaths = [
        path.join(
          process.env.HOME || "",
          "Library",
          "Application Support",
          "Code",
          "User",
          "settings.json",
        ),
        path.join(process.env.APPDATA || "", "Code", "User", "settings.json"),
        path.join(
          process.env.HOME || "",
          ".config",
          "Code",
          "User",
          "settings.json",
        ),
      ];

      for (const settingsPath of possiblePaths) {
        if (fs.existsSync(settingsPath)) {
          const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));

          // Look for MCP-related extensions or configurations
          if (settings["mcp.servers"]) {
            Object.entries(settings["mcp.servers"]).forEach(
              ([name, serverConfig]) => {
                const config = serverConfig as MCPServerInfo;
                servers.push(
                  createExternalServerInfo({
                    ...config,
                    id: name,
                    name,
                    description: "Discovered from VS Code",
                  }),
                );
              },
            );
          }
          break;
        }
      }
    } catch (error) {
      // Log discovery errors for debugging but don't fail
      logger.debug(
        `VS Code discovery error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return servers;
  }

  // ========================================
  // NEW MCP ENHANCEMENT COMMANDS (Phase 8.39.0)
  // ========================================

  /**
   * Build options for servers command
   */
  private static buildServersOptions(yargs: Argv): Argv {
    return yargs
      .option("status", {
        choices: ["all", "connected", "disconnected", "failed"],
        default: "all",
        description: "Filter servers by status",
      })
      .option("category", {
        type: "string",
        description: "Filter servers by category",
      })
      .option("detailed", {
        type: "boolean",
        default: false,
        description: "Show detailed server information including metrics",
      })
      .example("neurolink mcp servers", "List all MCP servers")
      .example(
        "neurolink mcp servers --status connected",
        "List only connected servers",
      )
      .example(
        "neurolink mcp servers --detailed",
        "Show detailed metrics for each server",
      );
  }

  /**
   * Build options for tools command
   */
  private static buildToolsOptions(yargs: Argv): Argv {
    return yargs
      .option("server", {
        type: "string",
        description: "Filter tools by server ID",
      })
      .option("category", {
        type: "string",
        description: "Filter tools by category",
      })
      .option("tag", {
        type: "array",
        description: "Filter tools by tags",
      })
      .option("safety", {
        choices: ["safe", "moderate", "dangerous"],
        description: "Filter tools by safety level",
      })
      .option("annotations", {
        type: "boolean",
        default: false,
        description: "Show tool annotations",
      })
      .option("search", {
        type: "string",
        description: "Search tools by name or description",
      })
      .example("neurolink mcp tools", "List all available tools")
      .example(
        "neurolink mcp tools --server filesystem",
        "List tools from specific server",
      )
      .example(
        "neurolink mcp tools --safety safe",
        "List only read-only safe tools",
      )
      .example(
        "neurolink mcp tools --annotations",
        "Show tools with their annotations",
      );
  }

  /**
   * Build options for discover tools command
   */
  private static buildDiscoverToolsOptions(yargs: Argv): Argv {
    return yargs
      .option("server", {
        type: "string",
        description: "Specific server to discover tools from",
      })
      .option("infer-annotations", {
        type: "boolean",
        default: true,
        description: "Automatically infer tool annotations",
      })
      .option("verbose", {
        type: "boolean",
        alias: "v",
        default: false,
        description: "Show verbose discovery output",
      })
      .example("neurolink mcp discover", "Discover tools from all servers")
      .example(
        "neurolink mcp discover --server github",
        "Discover tools from specific server",
      );
  }

  /**
   * Build options for create-server command
   */
  private static buildCreateServerOptions(yargs: Argv): Argv {
    return yargs
      .positional("name", {
        type: "string",
        description: "Name for the new MCP server",
        demandOption: true,
      })
      .option("template", {
        choices: ["basic", "typescript", "python"],
        default: "typescript",
        description: "Server template to use",
      })
      .option("output", {
        type: "string",
        alias: "o",
        description: "Output directory (defaults to current directory)",
      })
      .option("tools", {
        type: "array",
        description: "Initial tools to include in the server",
      })
      .option("description", {
        type: "string",
        alias: "d",
        description: "Server description",
      })
      .example(
        "neurolink mcp create-server my-server",
        "Create a new TypeScript MCP server",
      )
      .example(
        "neurolink mcp create-server my-server --template python",
        "Create a Python MCP server",
      )
      .example(
        "neurolink mcp create-server my-server --tools readFile writeFile",
        "Create server with initial tools",
      );
  }

  /**
   * Execute servers command
   */
  private static async executeServers(argv: MCPCommandArgs): Promise<void> {
    try {
      const spinner = argv.quiet ? null : ora("Loading MCP servers...").start();

      const sdk = new NeuroLink();
      let servers = await sdk.listMCPServers();

      // Filter by status
      if (argv.status && argv.status !== "all") {
        servers = servers.filter((s) => s.status === argv.status);
      }

      // Filter by category
      if (argv.category) {
        servers = servers.filter((s) => s.metadata?.category === argv.category);
      }

      if (spinner) {
        spinner.succeed(`Found ${servers.length} MCP servers`);
      }

      if (servers.length === 0) {
        logger.always(chalk.yellow("No MCP servers match the criteria."));
        return;
      }

      // Output formatting
      if (argv.format === "json") {
        logger.always(JSON.stringify(servers, null, 2));
        return;
      }

      logger.always(chalk.bold("\n📡 MCP Servers:\n"));

      for (const server of servers) {
        const statusIcon =
          server.status === "connected"
            ? chalk.green("●")
            : server.status === "failed"
              ? chalk.red("●")
              : chalk.yellow("●");

        const statusText =
          server.status === "connected"
            ? chalk.green(server.status.toUpperCase())
            : server.status === "failed"
              ? chalk.red(server.status.toUpperCase())
              : chalk.yellow(server.status.toUpperCase());

        logger.always(
          `${statusIcon} ${chalk.cyan.bold(server.name)} [${statusText}]`,
        );
        logger.always(`   ID: ${server.id}`);
        logger.always(`   Transport: ${server.transport}`);
        logger.always(
          `   Description: ${server.description || "No description"}`,
        );
        logger.always(`   Tools: ${server.tools?.length || 0} available`);

        if (argv.detailed) {
          if (server.command) {
            logger.always(`   Command: ${server.command}`);
          }
          if (server.url) {
            logger.always(`   URL: ${server.url}`);
          }
          if (server.metadata) {
            logger.always(
              `   Category: ${server.metadata.category || "uncategorized"}`,
            );
            if (server.metadata.version) {
              logger.always(`   Version: ${server.metadata.version}`);
            }
            if (server.metadata.uptime) {
              logger.always(
                `   Uptime: ${Math.round(server.metadata.uptime / 1000)}s`,
              );
            }
          }
          if (server.error) {
            logger.always(`   ${chalk.red("Error:")} ${server.error}`);
          }
        }

        logger.always();
      }

      // Summary
      const connected = servers.filter((s) => s.status === "connected").length;
      const totalTools = servers.reduce(
        (sum, s) => sum + (s.tools?.length || 0),
        0,
      );

      logger.always(chalk.gray("---"));
      logger.always(
        `${chalk.bold("Summary:")} ${connected}/${servers.length} servers connected, ${totalTools} total tools`,
      );
    } catch (error) {
      logger.error(
        chalk.red(
          `Servers command failed: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      process.exit(1);
    }
  }

  /**
   * Execute tools command
   */
  private static async executeTools(argv: MCPCommandArgs): Promise<void> {
    try {
      const spinner = argv.quiet ? null : ora("Loading MCP tools...").start();

      const sdk = new NeuroLink();
      const servers = await sdk.listMCPServers();

      // Collect all tools from all servers
      type ToolWithServer = {
        name: string;
        description: string;
        serverId: string;
        serverName: string;
        inputSchema?: object;
        category?: string;
        annotations?: {
          readOnlyHint?: boolean;
          destructiveHint?: boolean;
          idempotentHint?: boolean;
          requiresConfirmation?: boolean;
          tags?: string[];
        };
      };

      let tools: ToolWithServer[] = [];

      const { inferAnnotations } = await import(
        "../../lib/mcp/toolAnnotations.js"
      );

      for (const server of servers) {
        if (server.status !== "connected") {
          continue;
        }

        for (const tool of server.tools || []) {
          const annotations =
            (tool as { annotations?: Record<string, unknown> }).annotations ??
            inferAnnotations({
              name: tool.name,
              description: tool.description,
            });

          tools.push({
            name: tool.name,
            description: tool.description,
            serverId: server.id,
            serverName: server.name,
            inputSchema: tool.inputSchema,
            category: this.inferToolCategory(tool.name, tool.description),
            annotations,
          });
        }
      }

      // Apply filters
      if (argv.server) {
        tools = tools.filter(
          (t) => t.serverId === argv.server || t.serverName === argv.server,
        );
      }

      if (argv.category) {
        tools = tools.filter((t) => t.category === argv.category);
      }

      if (argv.search) {
        const searchTerm = String(argv.search).toLowerCase();
        tools = tools.filter(
          (t) =>
            t.name.toLowerCase().includes(searchTerm) ||
            t.description.toLowerCase().includes(searchTerm),
        );
      }

      if (argv.safety) {
        tools = tools.filter((t) => {
          switch (argv.safety) {
            case "safe":
              return t.annotations?.readOnlyHint === true;
            case "dangerous":
              return t.annotations?.destructiveHint === true;
            case "moderate":
              return (
                !t.annotations?.readOnlyHint && !t.annotations?.destructiveHint
              );
            default:
              return true;
          }
        });
      }

      if (spinner) {
        spinner.succeed(`Found ${tools.length} tools`);
      }

      if (tools.length === 0) {
        logger.always(chalk.yellow("No tools match the criteria."));
        return;
      }

      // Output formatting
      if (argv.format === "json") {
        logger.always(JSON.stringify(tools, null, 2));
        return;
      }

      logger.always(chalk.bold("\n🔧 MCP Tools:\n"));

      // Group tools by server for better readability
      const toolsByServer = new Map<string, typeof tools>();
      for (const tool of tools) {
        const key = tool.serverName;
        if (!toolsByServer.has(key)) {
          toolsByServer.set(key, []);
        }
        const list = toolsByServer.get(key);
        if (list) {
          list.push(tool);
        }
      }

      for (const [serverName, serverTools] of toolsByServer) {
        logger.always(
          chalk.cyan.bold(`${serverName}`) +
            chalk.gray(` (${serverTools.length} tools)`),
        );

        for (const tool of serverTools) {
          // Safety indicator
          let safetyIcon = "○";
          if (tool.annotations?.destructiveHint) {
            safetyIcon = chalk.red("⚠");
          } else if (tool.annotations?.readOnlyHint) {
            safetyIcon = chalk.green("●");
          } else if (tool.annotations?.idempotentHint) {
            safetyIcon = chalk.blue("◐");
          }

          logger.always(`  ${safetyIcon} ${chalk.white.bold(tool.name)}`);
          logger.always(`    ${chalk.gray(tool.description)}`);

          if (argv.annotations && tool.annotations) {
            const annotationStr = getAnnotationSummary(tool.annotations);
            if (annotationStr !== "[no annotations]") {
              logger.always(`    ${chalk.dim(annotationStr)}`);
            }
          }
        }

        logger.always();
      }

      // Summary
      const safeCount = tools.filter((t) => t.annotations?.readOnlyHint).length;
      const dangerousCount = tools.filter(
        (t) => t.annotations?.destructiveHint,
      ).length;

      logger.always(chalk.gray("---"));
      logger.always(
        `${chalk.bold("Summary:")} ${tools.length} tools (${chalk.green(`${safeCount} safe`)}, ${chalk.red(`${dangerousCount} destructive`)})`,
      );
    } catch (error) {
      logger.error(
        chalk.red(
          `Tools command failed: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      process.exit(1);
    }
  }

  /**
   * Execute discover tools command
   */
  private static async executeDiscoverTools(
    argv: MCPCommandArgs,
  ): Promise<void> {
    try {
      const spinner = argv.quiet
        ? null
        : ora("Discovering MCP tools...").start();

      const sdk = new NeuroLink();
      const servers = await sdk.listMCPServers();

      // Filter to specific server if requested
      let targetServers = servers.filter((s) => s.status === "connected");
      if (argv.server) {
        targetServers = targetServers.filter(
          (s) => s.id === argv.server || s.name === argv.server,
        );

        if (targetServers.length === 0) {
          if (spinner) {
            spinner.fail();
          }
          logger.error(
            chalk.red(`Server not found or not connected: ${argv.server}`),
          );
          process.exit(1);
        }
      }

      if (spinner) {
        spinner.text = `Discovering tools from ${targetServers.length} servers...`;
      }

      // Collect discovery results
      type DiscoveryResult = {
        serverId: string;
        serverName: string;
        toolCount: number;
        tools: Array<{
          name: string;
          description: string;
          annotations: Record<string, unknown>;
        }>;
      };

      const results: DiscoveryResult[] = [];

      for (const server of targetServers) {
        const { inferAnnotations } = await import(
          "../../lib/mcp/toolAnnotations.js"
        );

        const toolsWithAnnotations = (server.tools || []).map((tool) => {
          const existing = (tool as { annotations?: MCPToolAnnotations })
            .annotations;
          const annotations =
            existing ??
            (argv.inferAnnotations !== false
              ? inferAnnotations({
                  name: tool.name,
                  description: tool.description,
                })
              : {});
          return {
            name: tool.name,
            description: tool.description,
            annotations,
          };
        });

        results.push({
          serverId: server.id,
          serverName: server.name,
          toolCount: toolsWithAnnotations.length,
          tools: toolsWithAnnotations,
        });

        if (argv.verbose) {
          logger.always(
            chalk.dim(
              `Discovered ${toolsWithAnnotations.length} tools from ${server.name}`,
            ),
          );
        }
      }

      if (spinner) {
        const totalTools = results.reduce((sum, r) => sum + r.toolCount, 0);
        spinner.succeed(
          `Discovered ${totalTools} tools from ${results.length} servers`,
        );
      }

      // Output formatting
      if (argv.format === "json") {
        logger.always(JSON.stringify(results, null, 2));
        return;
      }

      logger.always(chalk.bold("\n🔍 Tool Discovery Results:\n"));

      for (const result of results) {
        logger.always(
          chalk.cyan.bold(result.serverName) +
            chalk.gray(` [${result.serverId}]`),
        );
        logger.always(`  Tools discovered: ${result.toolCount}`);

        if (argv.verbose && result.tools.length > 0) {
          for (const tool of result.tools) {
            const annotationStr = getAnnotationSummary(
              tool.annotations as Parameters<typeof getAnnotationSummary>[0],
            );
            logger.always(
              `    • ${tool.name}${
                annotationStr !== "[no annotations]"
                  ? ` ${chalk.dim(annotationStr)}`
                  : ""
              }`,
            );
          }
        }

        logger.always();
      }

      // Summary by annotations
      const allTools = results.flatMap((r) => r.tools);
      const safeCount = allTools.filter(
        (t) => t.annotations.readOnlyHint,
      ).length;
      const destructiveCount = allTools.filter(
        (t) => t.annotations.destructiveHint,
      ).length;
      const idempotentCount = allTools.filter(
        (t) => t.annotations.idempotentHint,
      ).length;

      logger.always(chalk.gray("---"));
      logger.always(chalk.bold("Annotation Summary:"));
      logger.always(`  ${chalk.green("Read-only (safe):")} ${safeCount}`);
      logger.always(`  ${chalk.red("Destructive:")} ${destructiveCount}`);
      logger.always(`  ${chalk.blue("Idempotent:")} ${idempotentCount}`);
    } catch (error) {
      logger.error(
        chalk.red(
          `Discover command failed: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      process.exit(1);
    }
  }

  /**
   * Execute create-server command
   */
  private static async executeCreateServer(
    argv: MCPCommandArgs,
  ): Promise<void> {
    try {
      const serverName = argv.name;
      if (!serverName) {
        logger.error(chalk.red("Server name is required"));
        process.exit(1);
      }

      const template = (argv.template as string) || "typescript";
      const outputDir = (argv.output as string) || process.cwd();
      const description =
        (argv.description as string) || `Custom MCP server: ${serverName}`;
      const initialTools = (argv.tools as string[]) || [];

      const spinner = argv.quiet
        ? null
        : ora(`Creating MCP server: ${serverName}...`).start();

      // Create output directory
      const serverDir = path.join(outputDir, serverName);
      if (fs.existsSync(serverDir)) {
        if (spinner) {
          spinner.fail();
        }
        logger.error(chalk.red(`Directory already exists: ${serverDir}`));
        process.exit(1);
      }

      fs.mkdirSync(serverDir, { recursive: true });

      // Generate server files based on template
      if (template === "typescript") {
        await this.generateTypeScriptServer(
          serverDir,
          serverName,
          description,
          initialTools,
        );
      } else if (template === "python") {
        await this.generatePythonServer(
          serverDir,
          serverName,
          description,
          initialTools,
        );
      } else {
        await this.generateBasicServer(
          serverDir,
          serverName,
          description,
          initialTools,
        );
      }

      if (spinner) {
        spinner.succeed(
          chalk.green(`Successfully created MCP server: ${serverName}`),
        );
      }

      logger.always(chalk.bold("\n📁 Server created at:") + ` ${serverDir}`);
      logger.always();
      logger.always(chalk.bold("Next steps:"));
      logger.always(`  1. cd ${serverDir}`);

      if (template === "typescript") {
        logger.always("  2. npm install");
        logger.always("  3. npm run build");
        logger.always("  4. npm start");
      } else if (template === "python") {
        logger.always("  2. pip install -r requirements.txt");
        logger.always("  3. python server.py");
      } else {
        logger.always("  2. node server.js");
      }

      logger.always();
      logger.always(
        chalk.blue(
          "💡 Add to NeuroLink: neurolink mcp add " +
            serverName +
            " node " +
            path.join(serverDir, "dist", "index.js"),
        ),
      );
    } catch (error) {
      logger.error(
        chalk.red(
          `Create server command failed: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      process.exit(1);
    }
  }

  /**
   * Generate TypeScript MCP server
   */
  private static async generateTypeScriptServer(
    serverDir: string,
    serverName: string,
    description: string,
    tools: string[],
  ): Promise<void> {
    // package.json
    const packageJson = {
      name: serverName,
      version: "1.0.0",
      description,
      type: "module",
      main: "dist/index.js",
      scripts: {
        build: "tsc",
        start: "node dist/index.js",
        dev: "tsc --watch",
      },
      dependencies: {
        "@modelcontextprotocol/sdk": "^1.0.0",
      },
      devDependencies: {
        "@types/node": "^20.0.0",
        typescript: "^5.0.0",
      },
    };

    fs.writeFileSync(
      path.join(serverDir, "package.json"),
      JSON.stringify(packageJson, null, 2),
    );

    // tsconfig.json
    const tsConfig = {
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        outDir: "./dist",
        rootDir: "./src",
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        declaration: true,
      },
      include: ["src/**/*"],
    };

    fs.writeFileSync(
      path.join(serverDir, "tsconfig.json"),
      JSON.stringify(tsConfig, null, 2),
    );

    // Create src directory
    fs.mkdirSync(path.join(serverDir, "src"), { recursive: true });

    // Generate tool definitions
    const toolDefs =
      tools.length > 0
        ? `
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
${tools
  .map(
    (toolName) =>
      `        { name: "${toolName}", description: "TODO: Add description for ${toolName}", inputSchema: { type: "object", properties: {}, required: [] } },`,
  )
  .join("\n")}
      ],
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
${tools
  .map(
    (toolName) => `        case "${toolName}":
          // TODO: Implement ${toolName} tool
          return {
            content: [{ type: "text", text: "${toolName} executed successfully" }],
          };`,
  )
  .join("\n")}
        default:
          throw new Error(\`Unknown tool: \${request.params.name}\`);
      }
    });
`
        : `
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "hello",
          description: "A simple hello tool",
          inputSchema: {
            type: "object",
            properties: {
              name: { type: "string", description: "Name to greet" },
            },
            required: ["name"],
          },
        },
      ],
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === "hello") {
        const args = request.params.arguments as { name?: string };
        return {
          content: [{
            type: "text",
            text: \`Hello, \${args.name || "World"}!\`,
          }],
        };
      }
      throw new Error(\`Unknown tool: \${request.params.name}\`);
    });
`;

    // Main server file
    const mainFile = `/**
 * ${serverName} - MCP Server
 * ${description}
 *
 * Generated by NeuroLink CLI
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "${serverName}",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

${toolDefs}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("${serverName} MCP server running on stdio");
}

main().catch(console.error);
`;

    fs.writeFileSync(path.join(serverDir, "src", "index.ts"), mainFile);

    // README.md
    const readme = `# ${serverName}

${description}

## Installation

\`\`\`bash
npm install
npm run build
\`\`\`

## Usage

Add to your NeuroLink configuration:

\`\`\`bash
neurolink mcp add ${serverName} node ${path.join(serverDir, "dist", "index.js")}
\`\`\`

## Development

\`\`\`bash
npm run dev  # Watch mode
npm run build  # Build for production
\`\`\`

## Tools

${tools.length > 0 ? tools.map((t) => `- **${t}**: TODO: Add description`).join("\n") : "- **hello**: A simple hello tool"}
`;

    fs.writeFileSync(path.join(serverDir, "README.md"), readme);
  }

  /**
   * Generate Python MCP server
   */
  private static async generatePythonServer(
    serverDir: string,
    serverName: string,
    description: string,
    tools: string[],
  ): Promise<void> {
    // requirements.txt
    const requirements = `mcp>=1.0.0
`;
    fs.writeFileSync(path.join(serverDir, "requirements.txt"), requirements);

    // Generate tool definitions - Python MCP SDK expects a single @server.call_tool() handler
    // that dispatches on the tool name
    const toolDefs =
      tools.length > 0
        ? (() => {
            const branches = tools
              .map((toolName, index) => {
                const _safeName = toolName.replace(/-/g, "_");
                const keyword = index === 0 ? "if" : "elif";
                return `    ${keyword} name == "${toolName}":
        # TODO: Implement ${toolName} tool
        return [TextContent(type="text", text="${toolName} executed successfully")]`;
              })
              .join("\n");
            return `
@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Handle tool calls."""
${branches}
    else:
        raise ValueError(f"Unknown tool: {name}")
`;
          })()
        : `
@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Handle tool calls."""
    if name == "hello":
        name_arg = arguments.get("name", "World")
        return [TextContent(type="text", text=f"Hello, {name_arg}!")]
    else:
        raise ValueError(f"Unknown tool: {name}")
`;

    const toolListDefs =
      tools.length > 0
        ? tools
            .map(
              (toolName) => `
        Tool(
            name="${toolName}",
            description="TODO: Add description for ${toolName}",
            inputSchema={
                "type": "object",
                "properties": {},
                "required": [],
            },
        ),`,
            )
            .join("\n")
        : `
        Tool(
            name="hello",
            description="A simple hello tool",
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Name to greet"},
                },
                "required": ["name"],
            },
        ),`;

    // Main server file
    const mainFile = `"""
${serverName} - MCP Server
${description}

Generated by NeuroLink CLI
"""

import asyncio
from mcp.server.models import InitializationOptions
from mcp.server import NotificationOptions, Server
from mcp.types import (
    Resource,
    Tool,
    TextContent,
)

server = Server("${serverName}")

@server.list_tools()
async def list_tools() -> list[Tool]:
    """List available tools."""
    return [${toolListDefs}
    ]

${toolDefs}

async def main():
    from mcp.server.stdio import stdio_server
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="${serverName}",
                server_version="1.0.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )

if __name__ == "__main__":
    asyncio.run(main())
`;

    fs.writeFileSync(path.join(serverDir, "server.py"), mainFile);

    // README.md
    const readme = `# ${serverName}

${description}

## Installation

\`\`\`bash
pip install -r requirements.txt
\`\`\`

## Usage

Add to your NeuroLink configuration:

\`\`\`bash
neurolink mcp add ${serverName} python ${path.join(serverDir, "server.py")}
\`\`\`

## Tools

${tools.length > 0 ? tools.map((t) => `- **${t}**: TODO: Add description`).join("\n") : "- **hello**: A simple hello tool"}
`;

    fs.writeFileSync(path.join(serverDir, "README.md"), readme);
  }

  /**
   * Generate basic JavaScript MCP server
   */
  private static async generateBasicServer(
    serverDir: string,
    serverName: string,
    description: string,
    tools: string[],
  ): Promise<void> {
    // package.json
    const packageJson = {
      name: serverName,
      version: "1.0.0",
      description,
      type: "module",
      main: "server.js",
      scripts: {
        start: "node server.js",
      },
      dependencies: {
        "@modelcontextprotocol/sdk": "^1.0.0",
      },
    };

    fs.writeFileSync(
      path.join(serverDir, "package.json"),
      JSON.stringify(packageJson, null, 2),
    );

    // Generate tool handler
    const toolHandler =
      tools.length > 0
        ? `const handlers = {
  ${tools.map((t) => `"${t}": async (args) => ({ type: "text", text: "${t} executed" })`).join(",\n  ")}
};

if (handlers[request.params.name]) {
  return { content: [await handlers[request.params.name](request.params.arguments)] };
}`
        : `if (request.params.name === "hello") {
  const args = request.params.arguments || {};
  return {
    content: [{
      type: "text",
      text: \`Hello, \${args.name || "World"}!\`,
    }],
  };
}`;

    const toolList =
      tools.length > 0
        ? tools.map(
            (t) =>
              `{ name: "${t}", description: "TODO: Add description", inputSchema: { type: "object", properties: {} } }`,
          )
        : [
            `{ name: "hello", description: "A simple hello tool", inputSchema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } }`,
          ];

    // Main server file
    const mainFile = `/**
 * ${serverName} - MCP Server
 * ${description}
 *
 * Generated by NeuroLink CLI
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server(
  { name: "${serverName}", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler({ method: "tools/list" }, async () => ({
  tools: [
    ${toolList.join(",\n    ")}
  ],
}));

server.setRequestHandler({ method: "tools/call" }, async (request) => {
  ${toolHandler}
  throw new Error(\`Unknown tool: \${request.params.name}\`);
});

const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.error("${serverName} MCP server running on stdio");
}).catch(console.error);
`;

    fs.writeFileSync(path.join(serverDir, "server.js"), mainFile);

    // README.md
    const readme = `# ${serverName}

${description}

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`bash
neurolink mcp add ${serverName} node ${path.join(serverDir, "server.js")}
\`\`\`

## Tools

${tools.length > 0 ? tools.map((t) => `- **${t}**: TODO: Add description`).join("\n") : "- **hello**: A simple hello tool"}
`;

    fs.writeFileSync(path.join(serverDir, "README.md"), readme);
  }

  /**
   * Infer tool category from name and description
   */
  private static inferToolCategory(name: string, description: string): string {
    const combined = (name + " " + description).toLowerCase();

    if (combined.includes("git") || combined.includes("commit")) {
      return "version-control";
    }
    if (
      combined.includes("file") ||
      combined.includes("read") ||
      combined.includes("write") ||
      combined.includes("directory")
    ) {
      return "file-system";
    }
    if (
      combined.includes("api") ||
      combined.includes("http") ||
      combined.includes("request") ||
      combined.includes("fetch")
    ) {
      return "api";
    }
    if (
      combined.includes("database") ||
      combined.includes("query") ||
      combined.includes("sql")
    ) {
      return "database";
    }
    if (
      combined.includes("search") ||
      combined.includes("find") ||
      combined.includes("grep")
    ) {
      return "search";
    }
    if (
      combined.includes("auth") ||
      combined.includes("login") ||
      combined.includes("token")
    ) {
      return "authentication";
    }

    return "general";
  }

  // ========================================
  // REGISTRY COMMANDS (Phase 8.39.0)
  // ========================================

  /**
   * Create the registry subcommand
   */
  static createRegistryCommand(): CommandModule {
    return {
      command: "registry <action>",
      describe: "Browse and search the MCP server registry",
      builder: (yargs) => {
        return yargs
          .command(
            "search [query]",
            "Search for MCP servers in the registry",
            (yargs) =>
              yargs
                .positional("query", {
                  type: "string",
                  description: "Search query",
                })
                .option("category", {
                  type: "string",
                  alias: "c",
                  description: "Filter by category",
                })
                .option("tag", {
                  type: "array",
                  alias: "t",
                  description: "Filter by tags",
                })
                .option("verified", {
                  type: "boolean",
                  default: false,
                  description: "Show only verified servers",
                })
                .option("limit", {
                  type: "number",
                  default: 10,
                  description: "Maximum results to show",
                }),
            (argv) => this.executeRegistrySearch(argv as MCPCommandArgs),
          )
          .command(
            "list",
            "List all available servers in the registry",
            (yargs) =>
              yargs
                .option("category", {
                  type: "string",
                  description: "Filter by category",
                })
                .option("limit", {
                  type: "number",
                  default: 25,
                  description: "Maximum results",
                }),
            (argv) => this.executeRegistryList(argv as MCPCommandArgs),
          )
          .command(
            "info <server>",
            "Get detailed information about a server",
            (yargs) =>
              yargs.positional("server", {
                type: "string",
                description: "Server ID to get info for",
                demandOption: true,
              }),
            (argv) => this.executeRegistryInfo(argv as MCPCommandArgs),
          )
          .command(
            "categories",
            "List all server categories",
            () => {},
            () => this.executeRegistryCategories(),
          )
          .command(
            "popular",
            "Show popular MCP servers",
            (yargs) =>
              yargs.option("limit", {
                type: "number",
                default: 10,
                description: "Number of servers to show",
              }),
            (argv) => this.executeRegistryPopular(argv as MCPCommandArgs),
          )
          .demandCommand(1, "Please specify a registry action")
          .help();
      },
      handler: () => {},
    };
  }

  /**
   * Execute registry search
   */
  private static async executeRegistrySearch(
    argv: MCPCommandArgs,
  ): Promise<void> {
    try {
      const { globalMCPRegistryClient } = await import(
        "../../lib/mcp/mcpRegistryClient.js"
      );

      const spinner = argv.quiet ? null : ora("Searching registry...").start();

      const results = await withTimeout(
        globalMCPRegistryClient.search({
          query: argv.query as string | undefined,
          categories: argv.category ? [argv.category as string] : undefined,
          tags: argv.tag as string[] | undefined,
          verifiedOnly: argv.verified as boolean | undefined,
          limit: (argv.limit as number) ?? 10,
        }),
        30_000,
        ErrorFactory.toolTimeout("registrySearch", 30_000),
      );

      if (spinner) {
        spinner.succeed(`Found ${results.totalCount} servers`);
      }

      if (results.entries.length === 0) {
        logger.always(chalk.yellow("No servers found matching your criteria."));
        return;
      }

      if (argv.format === "json") {
        logger.always(JSON.stringify(results.entries, null, 2));
        return;
      }

      logger.always(chalk.bold("\n📦 MCP Server Registry Results:\n"));

      for (const entry of results.entries) {
        const verified = entry.verified ? chalk.green(" ✓") : "";
        logger.always(
          `${chalk.cyan.bold(entry.name)}${verified} (${entry.id})`,
        );
        logger.always(`  ${chalk.gray(entry.description)}`);
        logger.always(
          `  Version: ${entry.version} | Categories: ${entry.categories?.join(", ") ?? "none"}`,
        );
        if (entry.tags?.length) {
          logger.always(`  Tags: ${entry.tags.join(", ")}`);
        }
        logger.always();
      }

      if (results.hasMore) {
        logger.always(
          chalk.dim(
            `Showing ${results.entries.length} of ${results.totalCount} results. Use --limit to see more.`,
          ),
        );
      }
    } catch (error) {
      logger.error(
        chalk.red(
          `Registry search failed: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      process.exit(1);
    }
  }

  /**
   * Execute registry list
   */
  private static async executeRegistryList(
    argv: MCPCommandArgs,
  ): Promise<void> {
    try {
      const { globalMCPRegistryClient } = await import(
        "../../lib/mcp/mcpRegistryClient.js"
      );

      const spinner = argv.quiet ? null : ora("Loading registry...").start();

      const results = await withTimeout(
        globalMCPRegistryClient.search({
          categories: argv.category ? [argv.category as string] : undefined,
          limit: (argv.limit as number) ?? 25,
          sortBy: "name",
          sortDirection: "asc",
        }),
        30_000,
        ErrorFactory.toolTimeout("registrySearch", 30_000),
      );

      if (spinner) {
        spinner.succeed(`Found ${results.totalCount} servers`);
      }

      if (argv.format === "json") {
        logger.always(JSON.stringify(results.entries, null, 2));
        return;
      }

      logger.always(chalk.bold("\n📦 Available MCP Servers:\n"));

      // Group by category
      const byCategory = new Map<string, typeof results.entries>();
      for (const entry of results.entries) {
        const category = entry.categories?.[0] ?? "uncategorized";
        if (!byCategory.has(category)) {
          byCategory.set(category, []);
        }
        const catList = byCategory.get(category);
        if (catList) {
          catList.push(entry);
        }
      }

      for (const [category, entries] of byCategory) {
        logger.always(chalk.yellow.bold(`\n${category.toUpperCase()}`));
        for (const entry of entries) {
          const verified = entry.verified ? chalk.green("✓") : " ";
          logger.always(
            `  ${verified} ${chalk.cyan(entry.id.padEnd(20))} ${entry.description.slice(0, 50)}${entry.description.length > 50 ? "..." : ""}`,
          );
        }
      }
    } catch (error) {
      logger.error(
        chalk.red(
          `Registry list failed: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      process.exit(1);
    }
  }

  /**
   * Execute registry info
   */
  private static async executeRegistryInfo(
    argv: MCPCommandArgs,
  ): Promise<void> {
    try {
      const { globalMCPRegistryClient } = await import(
        "../../lib/mcp/mcpRegistryClient.js"
      );

      const serverId = argv.server as string;
      const entry = await withTimeout(
        globalMCPRegistryClient.getEntry(serverId),
        30_000,
        ErrorFactory.toolTimeout("registryGetEntry", 30_000),
      );

      if (!entry) {
        logger.error(chalk.red(`Server not found: ${serverId}`));
        process.exit(1);
      }

      if (argv.format === "json") {
        logger.always(JSON.stringify(entry, null, 2));
        return;
      }

      logger.always(chalk.bold(`\n📦 ${entry.name}`));
      logger.always(chalk.gray(`ID: ${entry.id}`));
      if (entry.verified) {
        logger.always(chalk.green("✓ Verified"));
      }
      logger.always();
      logger.always(entry.description);
      logger.always();

      logger.always(chalk.bold("Details:"));
      logger.always(`  Version: ${entry.version}`);
      if (entry.author) {
        logger.always(`  Author: ${entry.author}`);
      }
      if (entry.license) {
        logger.always(`  License: ${entry.license}`);
      }
      if (entry.homepage) {
        logger.always(`  Homepage: ${entry.homepage}`);
      }
      if (entry.repository) {
        logger.always(`  Repository: ${entry.repository}`);
      }

      if (entry.categories?.length) {
        logger.always(
          `\n${chalk.bold("Categories:")} ${entry.categories.join(", ")}`,
        );
      }

      if (entry.tags?.length) {
        logger.always(`${chalk.bold("Tags:")} ${entry.tags.join(", ")}`);
      }

      if (entry.transports?.length) {
        logger.always(
          `${chalk.bold("Transports:")} ${entry.transports.join(", ")}`,
        );
      }

      if (entry.tools?.length) {
        logger.always(`\n${chalk.bold("Tools:")} (${entry.tools.length})`);
        for (const tool of entry.tools.slice(0, 10)) {
          logger.always(`  • ${tool}`);
        }
        if (entry.tools.length > 10) {
          logger.always(`  ... and ${entry.tools.length - 10} more`);
        }
      }

      if (entry.requiredEnvVars?.length) {
        logger.always(`\n${chalk.bold("Required Environment Variables:")}`);
        for (const envVar of entry.requiredEnvVars) {
          const isSet = process.env[envVar] ? chalk.green("✓") : chalk.red("✗");
          logger.always(`  ${isSet} ${envVar}`);
        }
      }

      // Installation command
      logger.always(`\n${chalk.bold("Installation:")}`);
      if (entry.npmPackage) {
        logger.always(chalk.cyan(`  neurolink mcp install ${entry.id}`));
        logger.always(chalk.dim(`  or: npx -y ${entry.npmPackage}`));
      } else if (entry.command) {
        logger.always(
          chalk.cyan(`  ${entry.command} ${entry.args?.join(" ") ?? ""}`),
        );
      }
    } catch (error) {
      logger.error(
        chalk.red(
          `Registry info failed: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      process.exit(1);
    }
  }

  /**
   * Execute registry categories
   */
  private static async executeRegistryCategories(): Promise<void> {
    try {
      const { globalMCPRegistryClient } = await import(
        "../../lib/mcp/mcpRegistryClient.js"
      );

      const categories = await withTimeout(
        globalMCPRegistryClient.getCategories(),
        30_000,
        ErrorFactory.toolTimeout("registryGetCategories", 30_000),
      );

      logger.always(chalk.bold("\n📁 Available Categories:\n"));

      for (const category of categories) {
        const entries = await withTimeout(
          globalMCPRegistryClient.getByCategory(category),
          30_000,
          ErrorFactory.toolTimeout("registryGetByCategory", 30_000),
        );
        logger.always(
          `  ${chalk.cyan(category.padEnd(20))} (${entries.length} servers)`,
        );
      }
    } catch (error) {
      logger.error(
        chalk.red(
          `Registry categories failed: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      process.exit(1);
    }
  }

  /**
   * Execute registry popular
   */
  private static async executeRegistryPopular(
    argv: MCPCommandArgs,
  ): Promise<void> {
    try {
      const { globalMCPRegistryClient } = await import(
        "../../lib/mcp/mcpRegistryClient.js"
      );

      const spinner = argv.quiet
        ? null
        : ora("Loading popular servers...").start();

      const entries = await withTimeout(
        globalMCPRegistryClient.getPopularServers((argv.limit as number) ?? 10),
        30_000,
        ErrorFactory.toolTimeout("registryGetPopular", 30_000),
      );

      if (spinner) {
        spinner.succeed(`Top ${entries.length} popular servers`);
      }

      if (argv.format === "json") {
        logger.always(JSON.stringify(entries, null, 2));
        return;
      }

      logger.always(chalk.bold("\n🌟 Popular MCP Servers:\n"));

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const rank = chalk.yellow(`#${i + 1}`);
        const verified = entry.verified ? chalk.green(" ✓") : "";

        logger.always(`${rank} ${chalk.cyan.bold(entry.name)}${verified}`);
        logger.always(`   ${chalk.gray(entry.description)}`);
        logger.always(
          `   ${chalk.dim(`Install: neurolink mcp install ${entry.id}`)}`,
        );
        logger.always();
      }
    } catch (error) {
      logger.error(
        chalk.red(
          `Registry popular failed: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      process.exit(1);
    }
  }

  /**
   * Build options for annotate command
   */
  private static buildAnnotateOptions(yargs: Argv): Argv {
    return yargs
      .option("tool", {
        type: "string",
        alias: "t",
        description: "Tool name to annotate",
      })
      .option("server", {
        type: "string",
        alias: "s",
        description: "Server ID containing the tool",
      })
      .option("annotations", {
        type: "string",
        alias: "a",
        description: "Annotations as JSON string",
      })
      .option("read-only", {
        type: "boolean",
        description: "Set readOnlyHint annotation",
      })
      .option("destructive", {
        type: "boolean",
        description: "Set destructiveHint annotation",
      })
      .option("idempotent", {
        type: "boolean",
        description: "Set idempotentHint annotation",
      })
      .option("requires-confirmation", {
        type: "boolean",
        description: "Set requiresConfirmation annotation",
      })
      .option("tags", {
        type: "array",
        description: "Tags for the tool",
      })
      .option("estimated-duration", {
        type: "number",
        description: "Estimated execution duration in ms",
      })
      .option("rate-limit", {
        type: "number",
        description: "Rate limit hint (calls per minute)",
      })
      .option("cost", {
        type: "number",
        description: "Cost hint (arbitrary units)",
      })
      .option("complexity", {
        choices: ["simple", "medium", "complex"],
        description: "Complexity level",
      })
      .option("security-level", {
        choices: ["public", "internal", "restricted"],
        description: "Security classification",
      })
      .option("audit", {
        type: "boolean",
        description: "Whether tool execution should be audited",
      })
      .option("infer", {
        type: "boolean",
        description: "Infer annotations from tool name/description",
      })
      .option("list", {
        type: "boolean",
        description: "List all tools with their current annotations",
      })
      .option("validate", {
        type: "boolean",
        description: "Validate annotations without applying",
      })
      .example(
        "neurolink mcp annotate --tool readFile --read-only",
        "Mark readFile as read-only",
      )
      .example(
        "neurolink mcp annotate --tool deleteFile --destructive --requires-confirmation",
        "Mark deleteFile as destructive requiring confirmation",
      )
      .example(
        'neurolink mcp annotate --tool myTool --annotations \'{"readOnlyHint": true, "tags": ["data"]}\'',
        "Set custom annotations via JSON",
      )
      .example(
        "neurolink mcp annotate --list",
        "List all tools with annotations",
      )
      .example(
        "neurolink mcp annotate --tool myTool --infer",
        "Infer annotations from tool name/description",
      );
  }

  /**
   * Execute annotate command
   */
  private static async executeAnnotate(argv: MCPCommandArgs): Promise<void> {
    try {
      const sdk = new NeuroLink();
      const servers = await sdk.listMCPServers();

      // List mode - show all tools with annotations
      if (argv.list) {
        const spinner = argv.quiet
          ? null
          : ora("Loading tool annotations...").start();

        type ToolAnnotationInfo = {
          serverName: string;
          serverId: string;
          toolName: string;
          description: string;
          annotations: MCPToolAnnotations;
        };

        const allTools: ToolAnnotationInfo[] = [];

        for (const server of servers) {
          if (server.status !== "connected") {
            continue;
          }

          for (const tool of server.tools || []) {
            const existing = (tool as { annotations?: MCPToolAnnotations })
              .annotations;
            const annotations =
              existing ??
              inferAnnotations({
                name: tool.name,
                description: tool.description,
              });

            allTools.push({
              serverName: server.name,
              serverId: server.id,
              toolName: tool.name,
              description: tool.description,
              annotations,
            });
          }
        }

        if (spinner) {
          spinner.succeed(`Found ${allTools.length} tools`);
        }

        if (argv.format === "json") {
          logger.always(JSON.stringify(allTools, null, 2));
          return;
        }

        logger.always(chalk.bold("\n Tool Annotations:\n"));

        // Group by server
        const byServer = allTools.reduce(
          (acc, tool) => {
            if (!acc[tool.serverId]) {
              acc[tool.serverId] = {
                serverName: tool.serverName,
                tools: [],
              };
            }
            acc[tool.serverId].tools.push(tool);
            return acc;
          },
          {} as Record<
            string,
            { serverName: string; tools: ToolAnnotationInfo[] }
          >,
        );

        for (const [serverId, { serverName, tools }] of Object.entries(
          byServer,
        )) {
          logger.always(chalk.cyan.bold(`\n${serverName} (${serverId}):`));

          for (const tool of tools) {
            const annotationStr = getAnnotationSummary(tool.annotations);

            logger.always(
              `  ${chalk.yellow(tool.toolName)} ${chalk.gray(annotationStr)}`,
            );
            if (argv.detailed) {
              logger.always(`    ${chalk.gray(tool.description)}`);
            }
          }
        }

        logger.always();
        return;
      }

      // Annotate specific tool
      const toolName = argv.tool as string | undefined;

      if (!toolName) {
        logger.error(
          chalk.red(
            "Tool name is required. Use --tool <name> or --list to see all tools.",
          ),
        );
        process.exit(1);
      }

      // Find the tool
      let foundTool: {
        name: string;
        description: string;
        serverId: string;
        serverName: string;
      } | null = null;

      const serverId = argv.server as string | undefined;

      for (const server of servers) {
        if (serverId && server.id !== serverId) {
          continue;
        }

        for (const tool of server.tools || []) {
          if (tool.name === toolName) {
            foundTool = {
              name: tool.name,
              description: tool.description,
              serverId: server.id,
              serverName: server.name,
            };
            break;
          }
        }
        if (foundTool) {
          break;
        }
      }

      if (!foundTool) {
        logger.error(
          chalk.red(
            `Tool '${toolName}' not found.${serverId ? ` Server: ${serverId}` : ""}`,
          ),
        );
        logger.always(
          chalk.yellow(
            "Use 'neurolink mcp annotate --list' to see available tools.",
          ),
        );
        process.exit(1);
      }

      // Build annotations from options
      let annotations: MCPToolAnnotations = {};

      // Parse JSON annotations if provided
      if (argv.annotations) {
        try {
          const parsed = JSON.parse(argv.annotations as string);
          annotations = { ...annotations, ...parsed };
        } catch {
          logger.error(chalk.red("Invalid JSON in --annotations"));
          process.exit(1);
        }
      }

      // Apply individual annotation flags
      if (argv["read-only"] !== undefined) {
        annotations.readOnlyHint = argv["read-only"] as boolean;
      }
      if (argv.destructive !== undefined) {
        annotations.destructiveHint = argv.destructive as boolean;
      }
      if (argv.idempotent !== undefined) {
        annotations.idempotentHint = argv.idempotent as boolean;
      }
      if (argv["requires-confirmation"] !== undefined) {
        annotations.requiresConfirmation = argv[
          "requires-confirmation"
        ] as boolean;
      }
      if (argv.tags) {
        annotations.tags = argv.tags as string[];
      }
      if (argv["estimated-duration"] !== undefined) {
        annotations.estimatedDuration = argv["estimated-duration"] as number;
      }
      if (argv["rate-limit"] !== undefined) {
        annotations.rateLimitHint = argv["rate-limit"] as number;
      }
      if (argv.cost !== undefined) {
        annotations.costHint = argv.cost as number;
      }
      if (argv.complexity) {
        annotations.complexity = argv.complexity as
          | "simple"
          | "medium"
          | "complex";
      }
      if (argv["security-level"]) {
        annotations.securityLevel = argv["security-level"] as
          | "public"
          | "internal"
          | "restricted";
      }
      if (argv.audit !== undefined) {
        annotations.auditRequired = argv.audit as boolean;
      }

      // Infer annotations if requested
      if (argv.infer) {
        const inferred = inferAnnotations({
          name: foundTool.name,
          description: foundTool.description,
        });
        annotations = mergeAnnotations(inferred, annotations);
      }

      // Validate annotations
      const errors = validateAnnotations(annotations);

      if (errors.length > 0) {
        logger.error(chalk.red("Annotation validation errors:"));
        for (const error of errors) {
          logger.error(chalk.red(`  - ${error}`));
        }
        process.exit(1);
      }

      // Validate only mode
      if (argv.validate) {
        logger.always(chalk.green("Annotations are valid:"));
        logger.always(JSON.stringify(annotations, null, 2));
        return;
      }

      // Display the annotations
      logger.always(chalk.bold("\n Tool Annotation Update:\n"));
      logger.always(
        `  Server: ${chalk.cyan(foundTool.serverName)} (${foundTool.serverId})`,
      );
      logger.always(`  Tool: ${chalk.yellow(foundTool.name)}`);
      logger.always(`  Description: ${chalk.gray(foundTool.description)}`);
      logger.always();
      logger.always(chalk.bold("  Annotations:"));

      if (annotations.readOnlyHint !== undefined) {
        logger.always(
          `    readOnlyHint: ${annotations.readOnlyHint ? chalk.green("true") : chalk.red("false")}`,
        );
      }
      if (annotations.destructiveHint !== undefined) {
        logger.always(
          `    destructiveHint: ${annotations.destructiveHint ? chalk.red("true") : chalk.green("false")}`,
        );
      }
      if (annotations.idempotentHint !== undefined) {
        logger.always(
          `    idempotentHint: ${annotations.idempotentHint ? chalk.green("true") : chalk.gray("false")}`,
        );
      }
      if (annotations.requiresConfirmation !== undefined) {
        logger.always(
          `    requiresConfirmation: ${annotations.requiresConfirmation ? chalk.yellow("true") : chalk.gray("false")}`,
        );
      }
      if (annotations.tags?.length) {
        logger.always(`    tags: ${chalk.blue(annotations.tags.join(", "))}`);
      }
      if (annotations.estimatedDuration !== undefined) {
        logger.always(
          `    estimatedDuration: ${annotations.estimatedDuration}ms`,
        );
      }
      if (annotations.rateLimitHint !== undefined) {
        logger.always(
          `    rateLimitHint: ${annotations.rateLimitHint} calls/min`,
        );
      }
      if (annotations.costHint !== undefined) {
        logger.always(`    costHint: ${annotations.costHint}`);
      }
      if (annotations.complexity) {
        logger.always(`    complexity: ${chalk.cyan(annotations.complexity)}`);
      }
      if (annotations.securityLevel) {
        const secColor =
          annotations.securityLevel === "restricted"
            ? chalk.red
            : annotations.securityLevel === "internal"
              ? chalk.yellow
              : chalk.green;
        logger.always(
          `    securityLevel: ${secColor(annotations.securityLevel)}`,
        );
      }
      if (annotations.auditRequired !== undefined) {
        logger.always(
          `    auditRequired: ${annotations.auditRequired ? chalk.yellow("true") : chalk.gray("false")}`,
        );
      }

      logger.always();
      logger.always(
        chalk.gray("  Summary: ") + getAnnotationSummary(annotations),
      );
      logger.always();

      // Note: In a full implementation, this would persist the annotations
      // to a configuration file or database. For now, we just display them.
      logger.always(
        chalk.blue(
          "Note: Annotations displayed above. To persist annotations, add them to your MCP server configuration.",
        ),
      );
      logger.always(
        chalk.gray(
          `Example: Add to your server's tool definition or use environment-specific annotation overrides.`,
        ),
      );
    } catch (error) {
      logger.error(
        chalk.red(
          `Annotate command failed: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      process.exit(1);
    }
  }
}
