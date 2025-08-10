/**
 * MCP CLI Commands for NeuroLink
 * Implements comprehensive MCP server management commands
 * Part of Phase 4.2 - MCP CLI Commands
 */

import type { CommandModule, Argv } from "yargs";
import type { UnknownRecord, JsonValue } from "../../lib/types/common.js";
import type {
  InMemoryMCPServerConfig,
  MCPServerStatus,
  MCPDiscoveredServer,
  MCPServerConfig,
  MCPServerRegistryEntry,
  MCPTransportType,
} from "../../lib/types/mcpTypes.js";
import type { MCPCommandArgs } from "../../lib/types/cli.js";
import { NeuroLink } from "../../lib/neurolink.js";
import { logger } from "../../lib/utils/logger.js";
import chalk from "chalk";
import ora from "ora";
import fs from "fs";
import path from "path";

// Using MCPCommandArgs from types/cli.ts

/**
 * MCP server configuration interface for CLI
 */
interface CLIMCPServerConfig {
  name: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  transport: "stdio" | "sse" | "ws";
  description?: string;
  url?: string;
  installed: boolean;
  status: "connected" | "disconnected" | "error" | "unknown";
  tools?: Array<{
    name: string;
    description: string;
  }>;
  lastError?: string;
}

/**
 * Extended MCP status for CLI with server list
 */
interface CLIMCPStatus {
  mcpInitialized: boolean;
  totalServers: number;
  availableServers: number;
  autoDiscoveredCount: number;
  totalTools: number;
  customToolsCount: number;
  inMemoryServersCount: number;
  error?: string;
  servers: Array<{
    name: string;
    connected: boolean;
    command?: string;
    description?: string;
    tools?: Array<{
      name: string;
      description: string;
    }>;
    error?: string;
  }>;
}

/**
 * Popular MCP servers registry
 */
const POPULAR_MCP_SERVERS: Record<
  string,
  Omit<CLIMCPServerConfig, "name" | "installed" | "status">
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
 * Convert SDK MCPStatus to CLI format with server list
 */
function convertMCPStatusForCLI(
  status: { [key: string]: unknown }, // Use flexible object type
  sdk: NeuroLink,
): CLIMCPStatus {
  // Create server list from in-memory servers and discovered servers
  const servers: CLIMCPStatus["servers"] = [];

  // Add in-memory servers
  const inMemoryServers = sdk.getInMemoryServers();
  inMemoryServers.forEach((config, name) => {
    servers.push({
      name,
      connected: true, // In-memory servers are always "connected"
      description: config.server?.title || "In-memory MCP server",
      tools: [], // Could extract from config.server.tools if needed
    });
  });

  // Add auto-discovered servers
  if (
    status.autoDiscoveredServers &&
    Array.isArray(status.autoDiscoveredServers)
  ) {
    status.autoDiscoveredServers.forEach(
      (server: { [key: string]: unknown }) => {
        servers.push({
          name: (server.name as string) || (server.id as string),
          connected: (server.status as string) === "connected",
          description: server.source
            ? `Auto-discovered from ${server.source as string}`
            : `Auto-discovered server`,
          tools: [],
          error:
            (server.status as string) === "failed"
              ? "Connection failed"
              : undefined,
        });
      },
    );
  }

  return {
    mcpInitialized: status.mcpInitialized as boolean,
    totalServers: status.totalServers as number,
    availableServers: status.availableServers as number,
    autoDiscoveredCount: status.autoDiscoveredCount as number,
    totalTools: status.totalTools as number,
    customToolsCount: status.customToolsCount as number,
    inMemoryServersCount: status.inMemoryServersCount as number,
    error: status.error as string | undefined,
    servers,
  };
}

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
        choices: ["stdio", "sse", "ws"],
        default: "stdio",
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
        choices: ["stdio", "sse", "ws"],
        default: "stdio",
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
      const rawMcpStatus = await sdk.getMCPStatus();
      const mcpStatus = convertMCPStatusForCLI(rawMcpStatus, sdk);

      if (spinner) {
        spinner.succeed(`Found ${mcpStatus.servers.length} MCP servers`);
      }

      if (mcpStatus.servers.length === 0) {
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
      } else if (argv.format && (argv.format as string) === "compact") {
        mcpStatus.servers.forEach((server) => {
          const status = server.connected ? chalk.green("✓") : chalk.red("✗");
          logger.always(
            `${status} ${server.name} - ${server.description || "No description"}`,
          );
        });
      } else {
        // Table format
        logger.always(chalk.bold("\n🔧 MCP Servers:\n"));

        for (const server of mcpStatus.servers) {
          const status = server.connected
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
    } catch (error) {
      logger.error(
        chalk.red(`❌ List command failed: ${(error as Error).message}`),
      );
      process.exit(1);
    }
  }

  /**
   * Execute install command
   */
  private static async executeInstall(argv: MCPCommandArgs): Promise<void> {
    try {
      const serverName = argv.server!;
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
          process.exit(1);
        }
      }

      // Create server configuration
      const config: CLIMCPServerConfig = {
        name: serverName,
        command: serverConfig.command,
        args: (argv.args as string[]) || serverConfig.args,
        env,
        transport:
          (argv.transport &&
            (argv.transport === "websocket"
              ? "ws"
              : (argv.transport as "stdio" | "sse" | "ws"))) ||
          (serverConfig.transport as "stdio" | "sse" | "ws"),
        description: serverConfig.description,
        installed: true,
        status: "unknown",
      };

      // Add server to NeuroLink (using in-memory MCP server for now)
      const sdk = new NeuroLink();
      await sdk.addInMemoryMCPServer(serverName, {
        server: {
          title: serverConfig.description,
          tools: {}, // Empty tools for external servers
          description: serverConfig.description,
        },
        metadata: {
          command: config.command,
          args: config.args,
          env: config.env,
          transport: config.transport,
        },
      });

      if (spinner) {
        spinner.succeed(
          chalk.green(`✅ Successfully installed ${serverName} MCP server`),
        );
      }

      // Display configuration info
      logger.always(chalk.bold("\n📋 Server Configuration:"));
      logger.always(`Name: ${config.name}`);
      logger.always(`Command: ${config.command}`);
      if (config.args?.length) {
        logger.always(`Args: ${config.args.join(" ")}`);
      }
      if (config.env) {
        logger.always(
          `Environment: ${Object.keys(config.env).length} variables`,
        );
      }
      logger.always(`Transport: ${config.transport}`);
      logger.always(`Description: ${config.description}`);

      // Test connection
      logger.always(chalk.blue("\n🔍 Testing connection..."));
      try {
        const rawStatus = await sdk.getMCPStatus();
        const status = convertMCPStatusForCLI(rawStatus, sdk);
        const installedServer = status.servers.find(
          (s) => s.name === serverName,
        );
        if (installedServer?.connected) {
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
      }
    } catch (error) {
      logger.error(
        chalk.red(`❌ Install command failed: ${(error as Error).message}`),
      );
      process.exit(1);
    }
  }

  /**
   * Execute add command
   */
  private static async executeAdd(argv: MCPCommandArgs): Promise<void> {
    try {
      const name = argv.name!;
      const command = argv.command!;

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
          process.exit(1);
        }
      }

      // Create server configuration
      const config: CLIMCPServerConfig = {
        name,
        command,
        args: argv.args as string[],
        env,
        transport:
          (argv.transport === "websocket"
            ? "ws"
            : (argv.transport as "stdio" | "sse" | "ws")) || "stdio",
        installed: true,
        status: "unknown",
      };

      // Add server to NeuroLink
      const sdk = new NeuroLink();
      await sdk.addInMemoryMCPServer(name, {
        server: {
          title: name,
          tools: {}, // Empty tools for external servers
          description: `Custom MCP server: ${command}`,
        },
        metadata: {
          command: config.command,
          args: config.args,
          env: config.env,
          transport: config.transport,
        },
      });

      if (spinner) {
        spinner.succeed(
          chalk.green(`✅ Successfully added ${name} MCP server`),
        );
      }

      // Display configuration
      logger.always(chalk.bold("\n📋 Server Configuration:"));
      logger.always(`Name: ${config.name}`);
      logger.always(`Command: ${config.command}`);
      if (config.args?.length) {
        logger.always(`Args: ${config.args.join(" ")}`);
      }
      if (config.env) {
        logger.always(
          `Environment: ${Object.keys(config.env).length} variables`,
        );
      }
      logger.always(`Transport: ${config.transport}`);
    } catch (error) {
      logger.error(
        chalk.red(`❌ Add command failed: ${(error as Error).message}`),
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
      const rawMcpStatus = await sdk.getMCPStatus();
      const mcpStatus = convertMCPStatusForCLI(rawMcpStatus, sdk);

      let serversToTest = mcpStatus.servers;
      if (targetServer) {
        serversToTest = mcpStatus.servers.filter(
          (s) => s.name === targetServer,
        );
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
        const status = server.connected
          ? chalk.green("✅ CONNECTED")
          : chalk.red("❌ DISCONNECTED");

        logger.always(`${server.name}: ${status}`);

        if (server.connected) {
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
      const connected = serversToTest.filter((s) => s.connected).length;
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
    } catch (error) {
      logger.error(
        chalk.red(`❌ Test command failed: ${(error as Error).message}`),
      );
      process.exit(1);
    }
  }

  /**
   * Execute exec command
   */
  private static async executeExec(argv: MCPCommandArgs): Promise<void> {
    try {
      const serverName = argv.server!;
      const toolName = argv.tool!;

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
          process.exit(1);
        }
      }

      const sdk = new NeuroLink();

      // Check if server exists and is connected
      const rawMcpStatus = await sdk.getMCPStatus();
      const mcpStatus = convertMCPStatusForCLI(rawMcpStatus, sdk);
      const server = mcpStatus.servers.find((s) => s.name === serverName);

      if (!server) {
        if (spinner) {
          spinner.fail();
        }
        logger.error(chalk.red(`❌ Server not found: ${serverName}`));
        process.exit(1);
      }

      if (!server.connected) {
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
          error: errorMessage,
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
    } catch (error) {
      logger.error(
        chalk.red(`❌ Exec command failed: ${(error as Error).message}`),
      );
      process.exit(1);
    }
  }

  /**
   * Execute remove command
   */
  private static async executeRemove(argv: MCPCommandArgs): Promise<void> {
    try {
      const serverName = argv.server!;

      const sdk = new NeuroLink();
      const rawMcpStatus = await sdk.getMCPStatus();
      const mcpStatus = convertMCPStatusForCLI(rawMcpStatus, sdk);
      const server = mcpStatus.servers.find((s) => s.name === serverName);

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
    } catch (error) {
      logger.error(
        chalk.red(`❌ Remove command failed: ${(error as Error).message}`),
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

      const discovered: CLIMCPServerConfig[] = [];

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
            await sdk.addInMemoryMCPServer(server.name, {
              server: {
                title: server.name,
                tools: {},
                description: server.description,
              },
              metadata: {
                command: server.command,
                args: server.args,
                env: server.env,
                transport: server.transport,
              },
            });
            logger.always(chalk.green(`✅ Installed ${server.name}`));
          } catch (error) {
            logger.always(
              chalk.red(
                `❌ Failed to install ${server.name}: ${(error as Error).message}`,
              ),
            );
          }
        }
      }
    } catch (error) {
      logger.error(
        chalk.red(`❌ Discover command failed: ${(error as Error).message}`),
      );
      process.exit(1);
    }
  }

  /**
   * Discover servers from Claude Desktop configuration
   */
  private static async discoverFromClaudeDesktop(): Promise<
    CLIMCPServerConfig[]
  > {
    const servers: CLIMCPServerConfig[] = [];

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
                const config = serverConfig as MCPServerConfig;
                servers.push({
                  name,
                  command: config.command,
                  args: config.args,
                  env: config.env,
                  transport: "stdio",
                  description: "Discovered from Claude Desktop",
                  installed: false,
                  status: "unknown",
                });
              },
            );
          }
          break; // Found config file, stop searching
        }
      }
    } catch (error) {
      // Ignore errors in discovery
    }

    return servers;
  }

  /**
   * Discover servers from VS Code configuration
   */
  private static async discoverFromVSCode(): Promise<CLIMCPServerConfig[]> {
    const servers: CLIMCPServerConfig[] = [];

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
                const config = serverConfig as MCPServerConfig;
                servers.push({
                  name,
                  command: config.command || "unknown",
                  args: config.args,
                  env: config.env,
                  transport: "stdio",
                  description: "Discovered from VS Code",
                  installed: false,
                  status: "unknown",
                });
              },
            );
          }
          break;
        }
      }
    } catch (error) {
      // Ignore errors in discovery
    }

    return servers;
  }
}
