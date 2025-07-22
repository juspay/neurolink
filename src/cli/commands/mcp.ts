#!/usr/bin/env node

/**
 * MCP Server Management Commands
 * Real MCP server connectivity and management
 */

import type { Argv } from "yargs";
import ora from "ora";
import chalk from "chalk";
import fs from "fs";
import { spawn } from "child_process";
import path from "path";
import { discoverMCPServers } from "../../lib/mcp/auto-discovery.js";
import { unifiedRegistry } from "../../lib/mcp/unified-registry.js";
import { ContextManager } from "../../lib/mcp/context-manager.js";
import { MCPOrchestrator } from "../../lib/mcp/orchestrator.js";
import type { DiscoveryOptions } from "../../lib/mcp/auto-discovery.js";
import { initializeNeuroLinkMCP } from "../../lib/mcp/initialize.js";
import { mcpLogger, setGlobalMCPLogLevel } from "../../lib/mcp/logging.js";
// import type { LogLevel } from "../../lib/mcp/logging.js"; // Commented out as unused
import { defaultTimeoutManager } from "../../lib/utils/timeout-manager.js";

// MCP Server Configuration
interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  transport: "stdio" | "sse";
  url?: string; // for SSE transport
}

interface MCPConfigFile {
  mcpServers: Record<string, MCPServerConfig>;
}

// Default MCP config file location
const MCP_CONFIG_FILE = path.join(process.cwd(), ".mcp-config.json");

// Load MCP configuration
function loadMCPConfig(): MCPConfigFile {
  if (!fs.existsSync(MCP_CONFIG_FILE)) {
    return { mcpServers: {} };
  }

  try {
    const content = fs.readFileSync(MCP_CONFIG_FILE, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Invalid MCP config file: ${(error as Error).message}`);
  }
}

// Save MCP configuration
function saveMCPConfig(config: MCPConfigFile): void {
  fs.writeFileSync(MCP_CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Check if MCP server process is running
async function checkMCPServerStatus(
  serverConfig: MCPServerConfig,
): Promise<boolean> {
  try {
    if (serverConfig.transport === "stdio") {
      // For stdio servers, use timeout manager for proper cleanup
      const result = await defaultTimeoutManager.wrapMCPOperation(
        async () => {
          const child = spawn(serverConfig.command, serverConfig.args || [], {
            stdio: ["pipe", "pipe", "pipe"],
            env: { ...process.env, ...serverConfig.env },
            cwd: serverConfig.cwd,
          });

          return new Promise<boolean>((resolve, reject) => {
            child.on("spawn", () => {
              child.kill();
              resolve(true);
            });

            child.on("error", (error) => {
              reject(error);
            });

            child.on("exit", (code) => {
              if (code === null) {
                // Process was terminated (expected for quick check)
                resolve(true);
              } else {
                resolve(false);
              }
            });
          });
        },
        "server-status-check",
        10000, // 10 seconds timeout for server status check
      );

      return result.success && result.data === true;
    } else if (serverConfig.transport === "sse" && serverConfig.url) {
      // For SSE servers, check if URL is accessible with timeout
      const result = await defaultTimeoutManager.wrapMCPOperation(
        async () => {
          if (!serverConfig.url) {
            throw new Error("SSE URL not configured");
          }
          const response = await fetch(serverConfig.url, { method: "HEAD" });
          return response.ok;
        },
        "sse-status-check",
        10000, // 10 seconds timeout for SSE check
      );

      return result.success && result.data === true;
    }

    return false;
  } catch {
    return false;
  }
}

// Connect to MCP server and get capabilities
async function getMCPServerCapabilities(
  serverConfig: MCPServerConfig,
): Promise<any> {
  if (serverConfig.transport === "stdio") {
    // Use timeout manager for proper cleanup and longer timeout
    const result = await defaultTimeoutManager.wrapMCPOperation(
      async () => {
        const child = spawn(serverConfig.command, serverConfig.args || [], {
          stdio: ["pipe", "pipe", "pipe"],
          env: { ...process.env, ...serverConfig.env },
          cwd: serverConfig.cwd,
        });

        return new Promise<any>((resolve, reject) => {
          let responseData = "";

          child.stdout?.on("data", (data) => {
            responseData += data.toString();

            // Look for JSON-RPC response
            try {
              const lines = responseData.split("\n");
              for (const line of lines) {
                if (line.trim() && line.includes('"result"')) {
                  const response = JSON.parse(line.trim());
                  if (response.result && response.result.capabilities) {
                    child.kill();
                    resolve(response.result);
                    return;
                  }
                }
              }
            } catch {
              // Continue parsing
            }
          });

          child.on("spawn", () => {
            // Send initialize request
            const initRequest = {
              jsonrpc: "2.0",
              id: 1,
              method: "initialize",
              params: {
                protocolVersion: "2024-11-05",
                capabilities: {},
                clientInfo: {
                  name: "neurolink-cli",
                  version: "1.0.0",
                },
              },
            };

            child.stdin?.write(JSON.stringify(initRequest) + "\n");
          });

          child.on("error", (error) => {
            reject(error);
          });
        });
      },
      "server-capabilities-check",
      15000, // 15 seconds timeout for capabilities check
    );

    if (result.success) {
      return result.data;
    } else {
      throw result.error || new Error("Failed to get MCP server capabilities");
    }
  }

  throw new Error("SSE transport not yet implemented for capabilities");
}

// List available tools from MCP server
async function listMCPServerTools(
  serverConfig: MCPServerConfig,
): Promise<any[]> {
  if (serverConfig.transport === "stdio") {
    // Use timeout manager for proper cleanup and longer timeout
    const result = await defaultTimeoutManager.wrapMCPOperation(
      async () => {
        const child = spawn(serverConfig.command, serverConfig.args || [], {
          stdio: ["pipe", "pipe", "pipe"],
          env: { ...process.env, ...serverConfig.env },
          cwd: serverConfig.cwd,
        });

        return new Promise<any[]>((resolve, reject) => {
          let responseData = "";
          // let initialized = false; // Commented out as unused

          child.stdout?.on("data", (data) => {
            responseData += data.toString();

            try {
              const lines = responseData.split("\n");
              for (const line of lines) {
                if (line.trim() && line.includes('"result"')) {
                  const response = JSON.parse(line.trim());

                  if (response.id === 1 && response.result.capabilities) {
                    // Initialize successful, now list tools
                    // initialized = true; // Commented out as unused
                    const listToolsRequest = {
                      jsonrpc: "2.0",
                      id: 2,
                      method: "tools/list",
                      params: {},
                    };
                    child.stdin?.write(JSON.stringify(listToolsRequest) + "\n");
                  } else if (response.id === 2 && response.result.tools) {
                    child.kill();
                    resolve(response.result.tools);
                    return;
                  }
                }
              }
            } catch {
              // Continue parsing
            }
          });

          child.on("spawn", () => {
            // Send initialize request first
            const initRequest = {
              jsonrpc: "2.0",
              id: 1,
              method: "initialize",
              params: {
                protocolVersion: "2024-11-05",
                capabilities: {},
                clientInfo: {
                  name: "neurolink-cli",
                  version: "1.0.0",
                },
              },
            };

            child.stdin?.write(JSON.stringify(initRequest) + "\n");
          });

          child.on("error", (error) => {
            reject(error);
          });
        });
      },
      "server-tools-list",
      15000, // 15 seconds timeout for tool listing
    );

    if (result.success) {
      return result.data || [];
    } else {
      throw result.error || new Error("Failed to list MCP server tools");
    }
  }

  throw new Error("SSE transport not yet implemented for tool listing");
}

// Execute tool on MCP server
export async function executeMCPTool(
  serverConfig: MCPServerConfig,
  toolName: string,
  toolParams: any,
): Promise<any> {
  if (serverConfig.transport === "stdio") {
    // Use timeout manager for proper cleanup and configurable timeout
    const result = await defaultTimeoutManager.wrapMCPOperation(
      async () => {
        const child = spawn(serverConfig.command, serverConfig.args || [], {
          stdio: ["pipe", "pipe", "pipe"],
          env: { ...process.env, ...serverConfig.env },
          cwd: serverConfig.cwd,
        });

        return new Promise<any>((resolve, reject) => {
          let responseData = "";
          // let initialized = false; // Commented out as unused

          child.stdout?.on("data", (data) => {
            responseData += data.toString();

            try {
              const lines = responseData.split("\n");
              for (const line of lines) {
                if (line.trim() && line.includes('"result"')) {
                  const response = JSON.parse(line.trim());

                  if (response.id === 1 && response.result.capabilities) {
                    // Initialize successful, now execute tool
                    // initialized = true; // Commented out as unused
                    const toolCallRequest = {
                      jsonrpc: "2.0",
                      id: 2,
                      method: "tools/call",
                      params: {
                        name: toolName,
                        arguments: toolParams,
                      },
                    };
                    child.stdin?.write(JSON.stringify(toolCallRequest) + "\n");
                  } else if (response.id === 2) {
                    child.kill();
                    if (response.result) {
                      resolve(response.result);
                    } else if (response.error) {
                      reject(
                        new Error(
                          `MCP Error: ${response.error.message || "Unknown error"}`,
                        ),
                      );
                    } else {
                      reject(new Error("Unknown MCP response format"));
                    }
                    return;
                  }
                } else if (line.trim() && line.includes('"error"')) {
                  const response = JSON.parse(line.trim());
                  if (response.error) {
                    child.kill();
                    reject(
                      new Error(
                        `MCP Error: ${response.error.message || "Unknown error"}`,
                      ),
                    );
                    return;
                  }
                }
              }
            } catch {
              // Continue parsing
            }
          });

          child.stderr?.on("data", (data) => {
            console.error(chalk.red(`MCP Server Error: ${data.toString()}`));
          });

          child.on("spawn", () => {
            // Send initialize request first
            const initRequest = {
              jsonrpc: "2.0",
              id: 1,
              method: "initialize",
              params: {
                protocolVersion: "2024-11-05",
                capabilities: {},
                clientInfo: {
                  name: "neurolink-cli",
                  version: "1.0.0",
                },
              },
            };

            child.stdin?.write(JSON.stringify(initRequest) + "\n");
          });

          child.on("error", (error) => {
            reject(error);
          });
        });
      },
      "tool-execution",
      30000, // 30 seconds timeout for tool execution (longer than others)
    );

    if (result.success) {
      return result.data;
    } else {
      throw result.error || new Error("Failed to execute MCP tool");
    }
  }

  throw new Error("SSE transport not yet implemented for tool execution");
}

/**
 * Display discovery results in table format
 */
function _displayTable(discoveryResult: any) {
  console.log(
    chalk.green(`\n📋 Found ${discoveryResult.discovered.length} MCP servers:`),
  );
  console.log(chalk.gray("─".repeat(80)));

  discoveryResult.discovered.forEach((server: any, index: number) => {
    const sourceIcon = getSourceIcon(server.source.tool);
    const typeColor =
      server.source.type === "global"
        ? chalk.blue
        : server.source.type === "workspace"
          ? chalk.green
          : chalk.gray;

    console.log(
      `${chalk.white(`${index + 1}.`)} ${sourceIcon} ${chalk.cyan(server.id)}`,
    );
    console.log(`   ${chalk.gray("Title:")} ${server.title}`);
    console.log(
      `   ${chalk.gray("Source:")} ${server.source.tool} ${typeColor(`(${server.source.type})`)}`,
    );
    console.log(
      `   ${chalk.gray("Command:")} ${server.command} ${server.args?.join(" ") || ""}`,
    );
    console.log(`   ${chalk.gray("Config:")} ${server.configPath}`);

    if (server.env && Object.keys(server.env).length > 0) {
      console.log(
        `   ${chalk.gray("Environment:")} ${Object.keys(server.env).length} variable(s)`,
      );
    }

    console.log();
  });

  // Display statistics
  console.log(chalk.blue("📊 Discovery Statistics:"));
  console.log(
    `   ${chalk.gray("Execution time:")} ${discoveryResult.stats.executionTime}ms`,
  );
  console.log(
    `   ${chalk.gray("Config files found:")} ${discoveryResult.stats.configFilesFound}`,
  );
  console.log(
    `   ${chalk.gray("Servers discovered:")} ${discoveryResult.stats.serversDiscovered}`,
  );
  console.log(
    `   ${chalk.gray("Duplicates removed:")} ${discoveryResult.stats.duplicatesRemoved}`,
  );

  // Display sources
  if (discoveryResult.sources.length > 0) {
    console.log(chalk.blue("\n🎯 Search Sources:"));
    const sourcesByTool = discoveryResult.sources.reduce(
      (acc: any, source: any) => {
        acc[source.tool] = (acc[source.tool] || 0) + 1;
        return acc;
      },
      {},
    );

    Object.entries(sourcesByTool).forEach(([tool, count]) => {
      const icon = getSourceIcon(tool);
      console.log(`   ${icon} ${tool}: ${count} location(s)`);
    });
  }
}

/**
 * Display discovery results in summary format
 */
function _displaySummary(discoveryResult: any) {
  console.log(chalk.green(`\n📊 Discovery Summary`));
  console.log(chalk.gray("==================="));

  console.log(
    `${chalk.cyan("Total servers found:")} ${discoveryResult.discovered.length}`,
  );
  console.log(
    `${chalk.cyan("Execution time:")} ${discoveryResult.stats.executionTime}ms`,
  );
  console.log(
    `${chalk.cyan("Config files found:")} ${discoveryResult.stats.configFilesFound}`,
  );
  console.log(
    `${chalk.cyan("Duplicates removed:")} ${discoveryResult.stats.duplicatesRemoved}`,
  );

  // Group by source tool
  const serversByTool = discoveryResult.discovered.reduce(
    (acc: any, server: any) => {
      const tool = server.source.tool;
      acc[tool] = (acc[tool] || 0) + 1;
      return acc;
    },
    {},
  );

  if (Object.keys(serversByTool).length > 0) {
    console.log(chalk.blue("\n🔧 Servers by Tool:"));
    Object.entries(serversByTool).forEach(([tool, count]) => {
      const icon = getSourceIcon(tool);
      console.log(`   ${icon} ${tool}: ${count} server(s)`);
    });
  }

  // Group by type
  const serversByType = discoveryResult.discovered.reduce(
    (acc: any, server: any) => {
      const type = server.source.type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    },
    {},
  );

  if (Object.keys(serversByType).length > 0) {
    console.log(chalk.blue("\n📍 Servers by Type:"));
    Object.entries(serversByType).forEach(([type, count]) => {
      const typeColor =
        type === "global"
          ? chalk.blue
          : type === "workspace"
            ? chalk.green
            : chalk.gray;
      console.log(`   ${typeColor(`${type}:`)} ${count} server(s)`);
    });
  }
}

/**
 * Get icon for source tool
 */
function getSourceIcon(tool: string): string {
  const icons: Record<string, string> = {
    "Claude Desktop": "🤖",
    "VS Code": "📝",
    Cursor: "🖱️",
    Windsurf: "🏄",
    "Roo Code": "🦘",
    Generic: "⚙️",
    "Cline AI Coder": "🔧",
    "Continue Dev": "🔄",
    Aider: "🛠️",
  };

  return icons[tool] || "🔧";
}

/**
 * Get icon for source type
 */
function getSourceTypeIcon(sourceType: string): string {
  const icons: Record<string, string> = {
    manual: "📝",
    auto: "🔍",
    default: "⚙️",
  };

  return icons[sourceType] || "❓";
}

/**
 * Get icon for server status
 */
function _getStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    available: "✅",
    unavailable: "❌",
    unknown: "❓",
  };

  return icons[status] || "❓";
}

// Export the tool execution function for use in other parts of the CLI
export async function mcpExecuteTool(
  serverName: string,
  toolName: string,
  toolParams: any,
): Promise<any> {
  // First try unified registry (includes built-in NeuroLink servers)
  try {
    await unifiedRegistry.initialize();

    const orchestrator = new MCPOrchestrator(unifiedRegistry);
    const result = await orchestrator.executeTool(
      toolName,
      toolParams,
      {
        sessionId: `cli-${Date.now()}`,
        userId: "cli-user",
        aiProvider: "unified-mcp",
      },
      {
        preferredSource: "default", // Try built-in servers first
        fallbackEnabled: true,
        validateBeforeExecution: true,
        timeoutMs: 30000,
      },
    );

    if (result.success) {
      return result.data;
    }
  } catch (error) {
    mcpLogger.debug(
      "[mcpExecuteTool] Unified registry failed, trying manual config:",
      {
        error: error instanceof Error ? error.message : String(error),
        serverName,
        toolName: toolName,
      },
    );
  }

  // Fallback to manual configuration (legacy behavior)
  const config = loadMCPConfig();
  const serverConfig = config.mcpServers[serverName];

  if (!serverConfig) {
    throw new Error(`MCP server '${serverName}' not found`);
  }

  const result = await executeMCPTool(serverConfig, toolName, toolParams);

  mcpLogger.debug("[mcpExecuteTool] Tool executed via manual config:", {
    serverName,
    toolName,
    hasResult: !!result,
    resultType: typeof result,
  });

  // Extract the text content from MCP result format
  if (result.content && Array.isArray(result.content)) {
    const textContent = result.content.find(
      (item: any) => item.type === "text",
    );
    if (textContent) {
      return JSON.parse(textContent.text);
    }
  }

  return result;
}

// MCP Commands for yargs
export function addMCPCommands(yargs: Argv): Argv {
  return yargs.command(
    "mcp <subcommand>",
    "Manage MCP (Model Context Protocol) servers",
    (yargsBuilder) => {
      yargsBuilder
        .usage("Usage: $0 mcp <subcommand> [options]")

        // List MCP servers
        .command(
          "list",
          "List configured MCP servers",
          (y) =>
            y
              .usage("Usage: $0 mcp list [options]")
              .option("status", {
                type: "boolean",
                description: "Check server status",
              })
              .example("$0 mcp list", "List all MCP servers")
              .example(
                "$0 mcp list --status",
                "List servers with status check",
              ),
          async (argv) => {
            const config = loadMCPConfig();
            const servers = Object.entries(config.mcpServers);

            if (servers.length === 0) {
              console.log(chalk.yellow("📭 No MCP servers configured"));
              console.log(
                chalk.blue(
                  "💡 Add a server with: neurolink mcp add <name> <command>",
                ),
              );
              return;
            }

            console.log(
              chalk.blue(`📋 Configured MCP servers (${servers.length}):\n`),
            );

            for (const [name, serverConfig] of servers) {
              console.log(chalk.bold(`🔧 ${name}`));
              console.log(
                `   Command: ${serverConfig.command} ${(serverConfig.args || []).join(" ")}`,
              );
              console.log(`   Transport: ${serverConfig.transport}`);

              if (argv.status) {
                const spinner = ora(`Checking ${name}...`).start();
                try {
                  const isRunning = await checkMCPServerStatus(serverConfig);
                  if (isRunning) {
                    spinner.succeed(`${name}: ${chalk.green("✅ Available")}`);
                  } else {
                    spinner.fail(`${name}: ${chalk.red("❌ Not available")}`);
                  }
                } catch (error) {
                  spinner.fail(
                    `${name}: ${chalk.red("❌ Error")} - ${(error as Error).message}`,
                  );
                }
              }

              console.log(); // Empty line
            }
          },
        )

        // Add MCP server
        .command(
          "add <name> <command>",
          "Add a new MCP server",
          (y) =>
            y
              .usage("Usage: $0 mcp add <name> <command> [options]")
              .positional("name", {
                type: "string",
                description: "Server name",
                demandOption: true,
              })
              .positional("command", {
                type: "string",
                description: "Command to run server",
                demandOption: true,
              })
              .option("args", {
                type: "array",
                description: "Command arguments",
              })
              .option("transport", {
                choices: ["stdio", "sse"],
                default: "stdio",
                description: "Transport type",
              })
              .option("url", {
                type: "string",
                description: "URL for SSE transport",
              })
              .option("env", {
                type: "string",
                description: "Environment variables (JSON)",
              })
              .option("cwd", {
                type: "string",
                description: "Working directory",
              })
              .example(
                '$0 mcp add filesystem "npx @modelcontextprotocol/server-filesystem"',
                "Add filesystem server",
              )
              .example(
                '$0 mcp add github "npx @modelcontextprotocol/server-github"',
                "Add GitHub server",
              ),
          async (argv) => {
            const config = loadMCPConfig();

            const serverConfig: MCPServerConfig = {
              name: argv.name as string,
              command: argv.command as string,
              args: (argv.args as string[]) || [],
              transport: argv.transport as "stdio" | "sse",
              url: argv.url,
              cwd: argv.cwd,
            };

            if (argv.env) {
              try {
                serverConfig.env = JSON.parse(argv.env);
              } catch (error) {
                console.error(
                  chalk.red("❌ Invalid JSON for environment variables"),
                );
                process.exit(1);
              }
            }

            config.mcpServers[argv.name as string] = serverConfig;
            saveMCPConfig(config);

            console.log(chalk.green(`✅ Added MCP server: ${argv.name}`));
            console.log(
              chalk.blue(`💡 Test it with: neurolink mcp test ${argv.name}`),
            );
          },
        )

        // Remove MCP server
        .command(
          "remove <name>",
          "Remove an MCP server",
          (y) =>
            y
              .usage("Usage: $0 mcp remove <name>")
              .positional("name", {
                type: "string",
                description: "Server name to remove",
                demandOption: true,
              })
              .example("$0 mcp remove filesystem", "Remove filesystem server"),
          async (argv) => {
            const config = loadMCPConfig();

            if (!config.mcpServers[argv.name as string]) {
              console.error(
                chalk.red(`❌ MCP server '${argv.name}' not found`),
              );
              process.exit(1);
            }

            delete config.mcpServers[argv.name as string];
            saveMCPConfig(config);

            console.log(chalk.green(`✅ Removed MCP server: ${argv.name}`));
          },
        )

        // Test MCP server
        .command(
          "test <name>",
          "Test connection to an MCP server",
          (y) =>
            y
              .usage("Usage: $0 mcp test <name>")
              .positional("name", {
                type: "string",
                description: "Server name to test",
                demandOption: true,
              })
              .example("$0 mcp test filesystem", "Test filesystem server"),
          async (argv) => {
            const config = loadMCPConfig();
            const serverConfig = config.mcpServers[argv.name as string];

            if (!serverConfig) {
              console.error(
                chalk.red(`❌ MCP server '${argv.name}' not found`),
              );
              process.exit(1);
            }

            console.log(chalk.blue(`🔍 Testing MCP server: ${argv.name}\n`));

            const spinner = ora("Connecting...").start();

            try {
              // Test basic connectivity
              const isRunning = await checkMCPServerStatus(serverConfig);
              if (!isRunning) {
                spinner.fail(chalk.red("❌ Server not available"));
                return;
              }

              spinner.text = "Getting capabilities...";
              const capabilities = await getMCPServerCapabilities(serverConfig);

              spinner.text = "Listing tools...";
              const tools = await listMCPServerTools(serverConfig);

              spinner.succeed(chalk.green("✅ Connection successful!"));

              console.log(chalk.blue("\n📋 Server Capabilities:"));
              console.log(
                `   Protocol Version: ${capabilities.protocolVersion || "Unknown"}`,
              );
              if (capabilities.capabilities.tools) {
                console.log(`   Tools: ✅ Supported`);
              }
              if (capabilities.capabilities.resources) {
                console.log(`   Resources: ✅ Supported`);
              }

              console.log(chalk.blue("\n🛠️  Available Tools:"));
              if (tools.length === 0) {
                console.log("   No tools available");
              } else {
                tools.forEach((tool: any) => {
                  console.log(
                    `   • ${tool.name}: ${tool.description || "No description"}`,
                  );
                });
              }
            } catch (error) {
              spinner.fail(chalk.red("❌ Connection failed"));
              console.error(chalk.red(`Error: ${(error as Error).message}`));
            }
          },
        )

        // Install popular MCP servers
        .command(
          "install <server>",
          "Install popular MCP servers",
          (y) =>
            y
              .usage("Usage: $0 mcp install <server>")
              .positional("server", {
                type: "string",
                choices: [
                  "filesystem",
                  "github",
                  "postgres",
                  "brave-search",
                  "puppeteer",
                ],
                description: "Server to install",
                demandOption: true,
              })
              .example("$0 mcp install filesystem", "Install filesystem server")
              .example("$0 mcp install github", "Install GitHub server"),
          async (argv) => {
            const serverName = argv.server as string;
            const config = loadMCPConfig();

            // Pre-configured popular MCP servers
            const serverConfigs: Record<string, MCPServerConfig> = {
              filesystem: {
                name: "filesystem",
                command: "npx",
                args: ["-y", "@modelcontextprotocol/server-filesystem", "/"],
                transport: "stdio",
              },
              github: {
                name: "github",
                command: "npx",
                args: ["-y", "@modelcontextprotocol/server-github"],
                transport: "stdio",
              },
              postgres: {
                name: "postgres",
                command: "npx",
                args: ["-y", "@modelcontextprotocol/server-postgres"],
                transport: "stdio",
              },
              "brave-search": {
                name: "brave-search",
                command: "npx",
                args: ["-y", "@modelcontextprotocol/server-brave-search"],
                transport: "stdio",
              },
              puppeteer: {
                name: "puppeteer",
                command: "npx",
                args: ["-y", "@modelcontextprotocol/server-puppeteer"],
                transport: "stdio",
              },
            };

            const serverConfig = serverConfigs[serverName];
            if (!serverConfig) {
              console.error(chalk.red(`❌ Unknown server: ${serverName}`));
              process.exit(1);
            }

            console.log(chalk.blue(`📦 Installing MCP server: ${serverName}`));

            config.mcpServers[serverName] = serverConfig;
            saveMCPConfig(config);

            console.log(chalk.green(`✅ Installed MCP server: ${serverName}`));
            console.log(
              chalk.blue(`💡 Test it with: neurolink mcp test ${serverName}`),
            );
          },
        )

        // Execute tool from MCP server
        .command(
          "exec <server> <tool>",
          "Execute a tool from an MCP server",
          (y) =>
            y
              .usage("Usage: $0 mcp exec <server> <tool> [options]")
              .positional("server", {
                type: "string",
                description: "Server name",
                demandOption: true,
              })
              .positional("tool", {
                type: "string",
                description: "Tool name",
                demandOption: true,
              })
              .option("params", {
                type: "string",
                description: "Tool parameters (JSON)",
              })
              .example(
                '$0 mcp exec filesystem read_file --params \'{"path": "README.md"}\'',
                "Read file using filesystem server",
              ),
          async (argv) => {
            const config = loadMCPConfig();
            const serverConfig = config.mcpServers[argv.server as string];

            if (!serverConfig) {
              console.error(
                chalk.red(`❌ MCP server '${argv.server}' not found`),
              );
              process.exit(1);
            }

            let params = {};
            if (argv.params) {
              try {
                params = JSON.parse(argv.params);
              } catch (error) {
                console.error(chalk.red("❌ Invalid JSON for parameters"));
                process.exit(1);
              }
            }

            console.log(
              chalk.blue(
                `🔧 Executing tool: ${argv.tool} on server: ${argv.server}`,
              ),
            );

            const spinner = ora("Executing tool...").start();

            try {
              const result = await executeMCPTool(
                serverConfig,
                argv.tool as string,
                params,
              );

              spinner.succeed(chalk.green("✅ Tool executed successfully!"));

              console.log(chalk.blue("\n📋 Result:"));
              if (result.content) {
                // Handle different content types
                if (Array.isArray(result.content)) {
                  result.content.forEach((item: any) => {
                    if (item.type === "text") {
                      console.log(item.text);
                    } else {
                      console.log(JSON.stringify(item, null, 2));
                    }
                  });
                } else {
                  console.log(JSON.stringify(result.content, null, 2));
                }
              } else {
                console.log(JSON.stringify(result, null, 2));
              }
            } catch (error) {
              spinner.fail(chalk.red("❌ Tool execution failed"));
              console.error(chalk.red(`Error: ${(error as Error).message}`));
              process.exit(1);
            }
          },
        )

        // Enhanced unified list command
        .command(
          "list-all",
          "List servers from all sources (manual + auto + default)",
          (y) =>
            y
              .usage("Usage: $0 mcp list-all [options]")
              .option("source", {
                type: "string",
                choices: ["manual", "auto", "default", "all"],
                default: "all",
                description: "Filter by source type",
              })
              .option("format", {
                type: "string",
                choices: ["table", "json"],
                default: "table",
                description: "Output format",
              })
              .option("refresh", {
                type: "boolean",
                description: "Force refresh auto-discovery cache",
              })
              .example("$0 mcp list-all", "List all servers from all sources")
              .example(
                "$0 mcp list-all --source auto",
                "List only auto-discovered servers",
              )
              .example(
                "$0 mcp list-all --refresh",
                "Refresh auto-discovery and list all",
              ),
          async (argv) => {
            console.log(chalk.blue("🌐 NeuroLink Unified MCP Registry"));
            console.log(chalk.gray("==================================="));

            const spinner = ora("Initializing NeuroLink MCP...").start();

            try {
              // Initialize built-in NeuroLink servers first - register in unified registry
              await initializeNeuroLinkMCP(unifiedRegistry);

              // Initialize unified registry
              spinner.text = "Initializing unified registry...";
              await unifiedRegistry.initialize();

              // Force refresh if requested
              if (argv.refresh) {
                spinner.text = "Refreshing auto-discovery...";
                await unifiedRegistry.refresh();
              }

              spinner.succeed(chalk.green("Registry initialized!"));

              // Get servers based on source filter
              const servers = unifiedRegistry.list();
              const filteredServers =
                argv.source === "all"
                  ? servers
                  : servers.filter((s) => s.source === argv.source);

              if (filteredServers.length === 0) {
                console.log(
                  chalk.yellow(
                    `\n📭 No servers found from source: ${argv.source}`,
                  ),
                );
                return;
              }

              if (argv.format === "json") {
                console.log(JSON.stringify(filteredServers, null, 2));
                return;
              }

              // Table format
              console.log(
                chalk.green(`\n📋 Found ${filteredServers.length} servers:`),
              );
              console.log(chalk.gray("─".repeat(80)));

              filteredServers.forEach((server, index) => {
                const sourceIcon = getSourceTypeIcon(
                  String(server.source || "unknown"),
                );
                console.log(
                  `${chalk.white(`${index + 1}.`)} ${sourceIcon} ${chalk.cyan(server.metadata.name)}`,
                );
                console.log(
                  `   ${chalk.gray("Version:")} ${String(server.metadata.version || "unknown")}`,
                );
                console.log(`   ${chalk.gray("Source:")} ${server.source}`);
                console.log(`   ${chalk.gray("Entry:")} ${server.entryPath}`);
                if (server.metadata.description) {
                  console.log(
                    `   ${chalk.gray("Description:")} ${server.metadata.description}`,
                  );
                }

                // Add spacing between entries
                if (index < filteredServers.length - 1) {
                  console.log();
                }
              });

              // Display statistics
              const stats = await unifiedRegistry.getDetailedStats();
              console.log(chalk.blue("📊 Registry Statistics:"));
              console.log(`   ${chalk.gray("Total plugins:")} ${stats.total}`);
              console.log(
                `   ${chalk.gray("Manual servers:")} ${stats.manual?.servers || 0}`,
              );
              console.log(
                `   ${chalk.gray("Auto-discovered:")} ${stats.auto?.servers || 0}`,
              );
              console.log(
                `   ${chalk.gray("Total tools:")} ${stats.tools || 0}`,
              );
            } catch (error) {
              spinner.fail(chalk.red("Registry initialization failed"));
              console.error(
                chalk.red(
                  `Error: ${error instanceof Error ? error.message : String(error)}`,
                ),
              );
              process.exit(1);
            }
          },
        )

        // Enhanced tool execution with unified registry
        .command(
          "run <tool>",
          "Execute a tool using unified registry (auto-fallback)",
          (y) =>
            y
              .usage("Usage: $0 mcp run <tool> [options]")
              .positional("tool", {
                type: "string",
                description: "Tool name to execute",
                demandOption: true,
              })
              .option("params", {
                type: "string",
                description: "Tool parameters (JSON)",
              })
              .option("source", {
                type: "string",
                choices: ["manual", "auto", "default"],
                description: "Preferred source (with fallback)",
              })
              .option("no-fallback", {
                type: "boolean",
                description: "Disable fallback to other sources",
              })
              .example(
                '$0 mcp run generate --params \'{"prompt": "Hello world"}\'',
                "Run tool with fallback",
              )
              .example(
                '$0 mcp run read_file --params \'{"path": "README.md"}\' --source manual',
                "Prefer manual config",
              ),
          async (argv) => {
            console.log(chalk.blue(`🚀 Executing tool: ${argv.tool}`));

            const spinner = ora("Initializing NeuroLink MCP...").start();

            try {
              // Initialize built-in NeuroLink servers first - register in unified registry
              await initializeNeuroLinkMCP(unifiedRegistry);

              // Initialize unified registry
              spinner.text = "Initializing unified registry...";
              await unifiedRegistry.initialize();

              let params = {};
              if (argv.params) {
                try {
                  params = JSON.parse(argv.params);
                } catch (error) {
                  spinner.fail(chalk.red("❌ Invalid JSON for parameters"));
                  process.exit(1);
                }
              }

              // Create execution context
              const contextManager = new ContextManager();
              const context = contextManager.createContext({
                sessionId: `cli-${Date.now()}`,
                userId: "cli-user",
                aiProvider: "unified-mcp",
              });

              const executionOptions = {
                preferredSource: argv.source as
                  | "manual"
                  | "auto"
                  | "default"
                  | "all",
                fallbackEnabled: !argv["no-fallback"],
                validateBeforeExecution: true,
                timeoutMs: 30000,
              };

              spinner.text = "Executing tool...";
              const orchestrator = new MCPOrchestrator(unifiedRegistry);
              const result = await orchestrator.executeTool(
                argv.tool as string,
                params,
                {
                  sessionId: `cli-${Date.now()}`,
                  userId: "cli-user",
                },
                executionOptions,
              );

              if (result.success) {
                spinner.succeed(chalk.green("✅ Tool executed successfully!"));

                console.log(chalk.blue("\n📋 Result:"));
                if (result.data) {
                  console.log(JSON.stringify(result.data, null, 2));
                } else {
                  console.log("No data returned");
                }

                if (result.metadata) {
                  console.log(chalk.gray("\n🔧 Execution Details:"));
                  console.log(`   Tool: ${result.metadata.toolName}`);
                  console.log(
                    `   Server: ${result.metadata.serverId || "unknown"}`,
                  );
                  console.log(
                    `   Execution time: ${result.metadata.executionTime}ms`,
                  );
                  console.log(`   Session: ${result.metadata.sessionId}`);
                }
              } else {
                spinner.fail(chalk.red("❌ Tool execution failed"));
                console.error(chalk.red(`Error: ${result.error}`));
                process.exit(1);
              }
            } catch (error) {
              spinner.fail(chalk.red("❌ Execution failed"));
              console.error(
                chalk.red(
                  `Error: ${error instanceof Error ? error.message : String(error)}`,
                ),
              );
              process.exit(1);
            }
          },
        )

        // Configuration management commands
        .command(
          "config <action>",
          "Manage unified registry configuration",
          (y) =>
            y
              .usage("Usage: $0 mcp config <action> [options]")
              .command("show", "Show current configuration", {}, async () => {
                try {
                  await unifiedRegistry.initialize();

                  console.log(chalk.blue("🔧 Unified Registry Configuration"));
                  console.log(chalk.gray("================================"));

                  const stats = await unifiedRegistry.getDetailedStats();
                  console.log(`Total servers: ${stats.total}`);
                  console.log("\nBy Source:");
                  Object.entries(stats.bySource).forEach(([source, count]) => {
                    console.log(`  ${source}: ${count}`);
                  });
                  console.log("\nBy Type:");
                  Object.entries(stats.byType).forEach(([type, count]) => {
                    console.log(`  ${type}: ${count}`);
                  });
                } catch (error) {
                  console.error(
                    chalk.red(
                      `Error: ${error instanceof Error ? error.message : String(error)}`,
                    ),
                  );
                  process.exit(1);
                }
              })
              .command(
                "enable-auto-discovery",
                "Enable auto-discovery",
                {},
                async () => {
                  try {
                    await unifiedRegistry.initialize();
                    unifiedRegistry.setAutoDiscovery(true);
                    console.log(chalk.green("✅ Auto-discovery enabled"));
                  } catch (error) {
                    console.error(
                      chalk.red(
                        `Error: ${error instanceof Error ? error.message : String(error)}`,
                      ),
                    );
                    process.exit(1);
                  }
                },
              )
              .command(
                "disable-auto-discovery",
                "Disable auto-discovery",
                {},
                async () => {
                  try {
                    await unifiedRegistry.initialize();
                    unifiedRegistry.setAutoDiscovery(false);
                    console.log(chalk.green("✅ Auto-discovery disabled"));
                  } catch (error) {
                    console.error(
                      chalk.red(
                        `Error: ${error instanceof Error ? error.message : String(error)}`,
                      ),
                    );
                    process.exit(1);
                  }
                },
              )
              .command(
                "set-sources <sources>",
                "Set preferred auto-discovery sources",
                (y) =>
                  y.positional("sources", {
                    type: "string",
                    description: "Comma-separated source list",
                    demandOption: true,
                  }),
                async (argv) => {
                  try {
                    await unifiedRegistry.initialize();
                    const sources = (argv.sources as string)
                      .split(",")
                      .map((s) => s.trim());
                    // Note: Source preference configuration not yet implemented
                    console.log(
                      chalk.yellow(
                        `⚠️  Source preference configuration not yet implemented`,
                      ),
                    );
                    console.log(
                      chalk.blue(`   Requested sources: ${sources.join(", ")}`),
                    );
                  } catch (error) {
                    console.error(
                      chalk.red(
                        `Error: ${error instanceof Error ? error.message : String(error)}`,
                      ),
                    );
                    process.exit(1);
                  }
                },
              )
              .command(
                "set-log-level <level>",
                "Set MCP logging verbosity",
                (y) =>
                  y.positional("level", {
                    type: "string",
                    choices: ["silent", "error", "warn", "info", "debug"],
                    description: "Log level to set",
                    demandOption: true,
                  }),
                async (argv) => {
                  try {
                    const level = argv.level as string;
                    // Note: LogLevel is a type, not an enum
                    // 'silent' is not a valid LogLevel, default to 'error' for minimal output
                    const logLevel =
                      level === "silent"
                        ? ("error" as const) // Use 'error' for minimal output
                        : level === "error"
                          ? ("error" as const)
                          : level === "warn"
                            ? ("warn" as const)
                            : level === "info"
                              ? ("info" as const)
                              : ("debug" as const);

                    setGlobalMCPLogLevel(logLevel);
                    console.log(
                      chalk.green(`✅ MCP log level set to: ${level}`),
                    );
                    console.log(
                      chalk.gray(
                        "This affects auto-discovery, registry operations, and tool execution logging",
                      ),
                    );
                  } catch (error) {
                    console.error(
                      chalk.red(
                        `Error: ${error instanceof Error ? error.message : String(error)}`,
                      ),
                    );
                    process.exit(1);
                  }
                },
              )
              .example("$0 mcp config show", "Show current configuration")
              .example(
                "$0 mcp config enable-auto-discovery",
                "Enable auto-discovery",
              )
              .example(
                '$0 mcp config set-sources "claude,vscode,cursor"',
                "Set preferred sources",
              )
              .example(
                "$0 mcp config set-log-level debug",
                "Enable debug logging for troubleshooting",
              ),
        )

        // Discover MCP servers from all AI tools
        .command(
          ["discover [options]", "d [options]"],
          "Discover MCP servers from all AI development tools",
          (y) =>
            y
              .usage("Usage: $0 mcp discover [options]")
              .option("format", {
                alias: "f",
                type: "string",
                choices: ["table", "json", "yaml", "summary"],
                default: "table",
                description: "Output format",
              })
              .option("include-inactive", {
                type: "boolean",
                default: true,
                description: "Include servers that may not be currently active",
              })
              .option("preferred-tools", {
                type: "string",
                description: "Prioritize specific tools (comma-separated)",
              })
              .option("workspace-only", {
                type: "boolean",
                description: "Search only workspace/project configurations",
              })
              .option("global-only", {
                type: "boolean",
                description: "Search only global configurations",
              })
              .example("$0 mcp discover", "Discover all MCP servers")
              .example("$0 mcp d --format json", "Export as JSON (using alias)")
              .example(
                '$0 mcp discover --preferred-tools "claude,cursor"',
                "Prioritize specific tools",
              ),
          async (argv) => {
            console.log(chalk.blue("🔍 NeuroLink MCP Server Discovery"));
            console.log(chalk.gray("====================================="));

            const options: DiscoveryOptions = {
              includeDevPlugins: argv["include-inactive"] as boolean,
              // Additional search paths if needed
              searchPaths: [
                "./src/lib/mcp/plugins",
                "./neurolink-mcp",
                "./node_modules",
              ],
            };

            const spinner = ora("Discovering MCP servers...").start();

            try {
              mcpLogger.debug("[MCP Discovery] Starting server discovery:", {
                includeDevPlugins: options.includeDevPlugins,
                searchPaths: options.searchPaths,
              });

              const discoveredPlugins = await discoverMCPServers(options);

              mcpLogger.info("[MCP Discovery] Discovery completed:", {
                pluginsFound: discoveredPlugins.length,
              });

              spinner.succeed(chalk.green("Discovery completed!"));

              if (discoveredPlugins.length === 0) {
                console.log(chalk.yellow("\n📭 No MCP servers found"));
                console.log(chalk.gray("\n💡 Tips for finding MCP servers:"));
                console.log(
                  chalk.gray(
                    "  • Make sure you have Claude Desktop, VS Code, or Cursor with MCP configurations",
                  ),
                );
                console.log(
                  chalk.gray(
                    "  • Check that MCP configuration files exist in their expected locations",
                  ),
                );
                console.log(
                  chalk.gray(
                    "  • Run with 'neurolink mcp discover' to search all locations",
                  ),
                );
                return;
              }

              // Display results based on format
              if (argv.format === "json") {
                console.log(JSON.stringify(discoveredPlugins, null, 2));
                return;
              }

              if (argv.format === "yaml") {
                // Simple YAML output
                console.log("discovered:");
                discoveredPlugins.forEach((plugin) => {
                  console.log(`  - name: ${plugin.metadata.name}`);
                  console.log(`    version: ${plugin.metadata.version}`);
                  console.log(`    source: ${plugin.source}`);
                  console.log(`    entryPath: ${plugin.entryPath}`);
                  if (plugin.metadata.description) {
                    console.log(
                      `    description: ${plugin.metadata.description}`,
                    );
                  }
                });
                return;
              }

              // Default format - show simple list
              console.log(
                chalk.green(
                  `\n📋 Found ${discoveredPlugins.length} MCP plugins:`,
                ),
              );
              console.log(chalk.gray("─".repeat(80)));

              discoveredPlugins.forEach((plugin, index) => {
                console.log(
                  `${chalk.white(`${index + 1}.`)} ${chalk.cyan(plugin.metadata.name)} v${plugin.metadata.version}`,
                );
                console.log(`   ${chalk.gray("Source:")} ${plugin.source}`);
                console.log(`   ${chalk.gray("Entry:")} ${plugin.entryPath}`);
                if (plugin.metadata.description) {
                  console.log(
                    `   ${chalk.gray("Description:")} ${plugin.metadata.description}`,
                  );
                }
                console.log();
              });
            } catch (error) {
              mcpLogger.error("[MCP Discovery] Discovery failed:", {
                error: error instanceof Error ? error.message : String(error),
                options,
              });
              spinner.fail(chalk.red("Discovery failed"));
              console.error(
                chalk.red(
                  `Error: ${error instanceof Error ? error.message : String(error)}`,
                ),
              );
              process.exit(1);
            }
          },
        )

        // Add debug command for tool registry diagnostics
        .command(
          "debug",
          "Debug MCP tool registry state and diagnose issues",
          (yargs) => {
            return yargs.option("verbose", {
              type: "boolean",
              default: false,
              description: "Show detailed debug information",
            });
          },
          async (argv) => {
            console.log(chalk.blue("🔍 MCP Tool Registry Debug"));
            console.log(chalk.gray("=============================\n"));

            try {
              // Initialize built-in servers
              console.log(chalk.cyan("🔧 Initializing Built-in Servers..."));
              await initializeNeuroLinkMCP(unifiedRegistry);

              // Initialize unified registry
              console.log(chalk.cyan("🌐 Initializing Unified Registry..."));
              await unifiedRegistry.initialize();
              const registry = unifiedRegistry;

              // Check built-in tools
              console.log(chalk.green("\n📦 Built-in Tools:"));
              const builtInTools = await registry.listTools();
              if (builtInTools.length === 0) {
                console.log(chalk.red("  ❌ No built-in tools found"));
              } else {
                builtInTools.forEach((tool: any) => {
                  console.log(
                    `  ✅ ${tool.name} (${tool.serverId || "unknown server"})`,
                  );
                  if (argv.verbose && tool.description) {
                    console.log(`     └─ ${tool.description}`);
                  }
                });
              }

              // Check external servers
              console.log(chalk.green("\n🌐 External Servers:"));
              const allTools = await registry.listAllTools();
              const externalTools = allTools.filter((t: any) => t.isExternal);

              if (externalTools.length === 0) {
                console.log(chalk.yellow("  ⚠️ No external servers connected"));
              } else {
                const serverGroups = externalTools.reduce(
                  (acc: Record<string, any[]>, tool: any) => {
                    const server = tool.serverId || "unknown";
                    if (!acc[server]) {
                      acc[server] = [];
                    }
                    acc[server].push(tool);
                    return acc;
                  },
                  {} as Record<string, any[]>,
                );

                Object.entries(serverGroups).forEach(
                  ([server, tools]: [string, any[]]) => {
                    console.log(`  🔧 ${server} (${tools.length} tools)`);
                    if (argv.verbose) {
                      tools.forEach((tool: any) => {
                        console.log(`     └─ ${tool.name}`);
                      });
                    }
                  },
                );
              }

              // Test specific tool execution
              console.log(chalk.green("\n🧪 Testing 'get-current-time' Tool:"));
              try {
                const result = await registry.executeTool("get-current-time");
                console.log(chalk.green("  ✅ Success:"));
                if (argv.verbose) {
                  console.log(JSON.stringify(result, null, 4));
                } else {
                  console.log(`  └─ Tool executed successfully`);
                }
              } catch (error: any) {
                console.log(chalk.red("  ❌ Failed:"));
                console.log(`  └─ ${error.message}`);

                if (argv.verbose) {
                  console.log(chalk.gray("\n📋 Debug Details:"));
                  console.log(`     Error Type: ${error.constructor.name}`);
                  console.log(`     Stack: ${error.stack}`);
                }
              }

              // Summary
              console.log(chalk.green(`\n📊 Summary:`));
              console.log(`  Built-in tools: ${builtInTools.length}`);
              console.log(`  External tools: ${externalTools.length}`);
              console.log(`  Total tools: ${allTools.length}`);
            } catch (error: any) {
              console.error(chalk.red("❌ Debug failed:"));
              console.error(`   ${error.message}`);
              if (argv.verbose) {
                console.error(error.stack);
              }
              process.exit(1);
            }
          },
        )

        .demandCommand(1, "Please specify an MCP subcommand")
        .example("$0 mcp list", "List configured MCP servers")
        .example("$0 mcp discover", "Discover MCP servers from all tools")
        .example("$0 mcp debug", "Debug tool registry state")
        .example("$0 mcp install filesystem", "Install filesystem MCP server")
        .example("$0 mcp test filesystem", "Test filesystem server connection");
    },
  );
}
