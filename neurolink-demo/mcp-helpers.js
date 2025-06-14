/**
 * MCP Helper Functions for NeuroLink Demo Server
 *
 * This module provides utilities for interacting with MCP servers
 * through the NeuroLink CLI and configuration management.
 */

import { execSync, spawn } from "child_process";
import fs from "fs";
import path from "path";

// MCP configuration file path
const MCP_CONFIG_FILE = path.join(process.cwd(), ".mcp-config.json");

/**
 * Load MCP configuration from .mcp-config.json
 */
export function loadMCPConfig() {
  try {
    if (!fs.existsSync(MCP_CONFIG_FILE)) {
      return { mcpServers: {} };
    }

    const content = fs.readFileSync(MCP_CONFIG_FILE, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error("[MCP] Error loading config:", error.message);
    return { mcpServers: {} };
  }
}

/**
 * Save MCP configuration to .mcp-config.json
 */
export function saveMCPConfig(config) {
  try {
    fs.writeFileSync(MCP_CONFIG_FILE, JSON.stringify(config, null, 2));
    return { success: true };
  } catch (error) {
    console.error("[MCP] Error saving config:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Execute NeuroLink MCP command safely
 */
export function executeMCPCommand(command, args = [], options = {}) {
  try {
    const cliPath = path.join(process.cwd(), "dist/cli/index.js");
    const fullCommand = `node ${cliPath} mcp ${command} ${args.join(" ")}`;

    console.log(`[MCP] Executing: ${fullCommand}`);

    const result = execSync(fullCommand, {
      encoding: "utf8",
      stdio: "pipe",
      timeout: 10000,
      cwd: process.cwd(),
      ...options,
    });

    return {
      success: true,
      output: result.trim(),
      command: fullCommand,
    };
  } catch (error) {
    console.error(`[MCP] Command failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      output: error.stdout?.toString() || "",
      command: `mcp ${command} ${args.join(" ")}`,
    };
  }
}

/**
 * Check if MCP server is running/available
 */
export async function checkServerStatus(serverConfig) {
  try {
    if (serverConfig.transport === "stdio") {
      // For stdio servers, try spawning and connecting
      const child = spawn(serverConfig.command, serverConfig.args || [], {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, ...serverConfig.env },
        cwd: serverConfig.cwd,
      });

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          child.kill();
          resolve({ available: false, reason: "Connection timeout" });
        }, 3000);

        child.on("spawn", () => {
          clearTimeout(timeout);
          child.kill();
          resolve({ available: true, reason: "Connection successful" });
        });

        child.on("error", (error) => {
          clearTimeout(timeout);
          resolve({ available: false, reason: error.message });
        });
      });
    } else if (serverConfig.transport === "sse" && serverConfig.url) {
      // For SSE servers, check URL accessibility
      try {
        const response = await fetch(serverConfig.url, {
          method: "HEAD",
          timeout: 3000,
        });
        return {
          available: response.ok,
          reason: response.ok
            ? "HTTP connection successful"
            : `HTTP ${response.status}`,
        };
      } catch (error) {
        return { available: false, reason: error.message };
      }
    }

    return { available: false, reason: "Unknown transport type" };
  } catch (error) {
    return { available: false, reason: error.message };
  }
}

/**
 * Get list of all configured MCP servers with status
 */
export async function listMCPServersWithStatus() {
  const config = loadMCPConfig();
  const servers = [];

  for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
    const status = await checkServerStatus(serverConfig);

    servers.push({
      name,
      ...serverConfig,
      status: status.available ? "available" : "unavailable",
      statusReason: status.reason,
      lastChecked: new Date().toISOString(),
    });
  }

  return {
    success: true,
    servers,
    totalServers: servers.length,
    availableServers: servers.filter((s) => s.status === "available").length,
  };
}

/**
 * Install a popular MCP server
 */
export function installMCPServer(serverName) {
  const popularServers = {
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

  const serverConfig = popularServers[serverName];
  if (!serverConfig) {
    return {
      success: false,
      error: `Unknown server: ${serverName}. Available: ${Object.keys(popularServers).join(", ")}`,
    };
  }

  try {
    const config = loadMCPConfig();
    config.mcpServers[serverName] = serverConfig;

    const saveResult = saveMCPConfig(config);
    if (!saveResult.success) {
      return saveResult;
    }

    return {
      success: true,
      server: serverConfig,
      message: `MCP server '${serverName}' installed successfully`,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Remove an MCP server
 */
export function removeMCPServer(serverName) {
  try {
    const config = loadMCPConfig();

    if (!config.mcpServers[serverName]) {
      return {
        success: false,
        error: `MCP server '${serverName}' not found`,
      };
    }

    delete config.mcpServers[serverName];

    const saveResult = saveMCPConfig(config);
    if (!saveResult.success) {
      return saveResult;
    }

    return {
      success: true,
      message: `MCP server '${serverName}' removed successfully`,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Test MCP server connectivity using CLI
 */
export function testMCPServer(serverName) {
  const config = loadMCPConfig();

  if (!config.mcpServers[serverName]) {
    return {
      success: false,
      error: `MCP server '${serverName}' not found`,
    };
  }

  // Use CLI test command
  const result = executeMCPCommand("test", [serverName]);

  return {
    ...result,
    serverName,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get tools available from a specific MCP server
 */
export async function getMCPServerTools(serverName) {
  const config = loadMCPConfig();

  if (!config.mcpServers[serverName]) {
    return {
      success: false,
      error: `MCP server '${serverName}' not found`,
    };
  }

  // First test connectivity
  const serverConfig = config.mcpServers[serverName];
  const status = await checkServerStatus(serverConfig);

  if (!status.available) {
    return {
      success: false,
      error: `MCP server '${serverName}' is not available: ${status.reason}`,
    };
  }

  // Try to get tools using CLI (exec would be implemented for actual tool execution)
  return {
    success: true,
    serverName,
    tools: [
      {
        name: "sample-tool",
        description:
          "Sample tool description (tools discovery needs CLI integration)",
        schema: {},
      },
    ],
    message: "Tool discovery needs full MCP client implementation",
  };
}

/**
 * Execute a tool from an MCP server
 */
export function executeMCPTool(serverName, toolName, params = {}) {
  const config = loadMCPConfig();

  if (!config.mcpServers[serverName]) {
    return {
      success: false,
      error: `MCP server '${serverName}' not found`,
    };
  }

  // Use CLI exec command (when implemented)
  const result = executeMCPCommand("exec", [
    serverName,
    toolName,
    "--params",
    JSON.stringify(params),
  ]);

  return {
    ...result,
    serverName,
    toolName,
    params,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Add a custom MCP server
 */
export function addCustomMCPServer(name, command, options = {}) {
  try {
    const config = loadMCPConfig();

    if (config.mcpServers[name]) {
      return {
        success: false,
        error: `MCP server '${name}' already exists`,
      };
    }

    const serverConfig = {
      name,
      command,
      args: options.args || [],
      transport: options.transport || "stdio",
      env: options.env || {},
      cwd: options.cwd || process.cwd(),
    };

    if (options.url) {
      serverConfig.url = options.url;
    }

    config.mcpServers[name] = serverConfig;

    const saveResult = saveMCPConfig(config);
    if (!saveResult.success) {
      return saveResult;
    }

    return {
      success: true,
      server: serverConfig,
      message: `Custom MCP server '${name}' added successfully`,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get MCP system status summary
 */
export async function getMCPSystemStatus() {
  const config = loadMCPConfig();
  const serverCount = Object.keys(config.mcpServers).length;

  if (serverCount === 0) {
    return {
      success: true,
      summary: {
        totalServers: 0,
        availableServers: 0,
        unavailableServers: 0,
        cliAvailable: false,
      },
      message: "No MCP servers configured",
    };
  }

  // Test CLI availability
  let cliAvailable = false;
  try {
    const cliPath = path.join(process.cwd(), "dist/cli/index.js");
    execSync(`node ${cliPath} --version`, { stdio: "pipe", timeout: 3000 });
    cliAvailable = true;
  } catch (error) {
    console.log("[MCP] CLI not available:", error.message);
  }

  // Get server statuses
  const serverList = await listMCPServersWithStatus();

  return {
    success: true,
    summary: {
      totalServers: serverList.totalServers,
      availableServers: serverList.availableServers,
      unavailableServers: serverList.totalServers - serverList.availableServers,
      cliAvailable,
    },
    servers: serverList.servers,
    timestamp: new Date().toISOString(),
  };
}
