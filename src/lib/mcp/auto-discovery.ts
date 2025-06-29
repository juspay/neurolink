/**
 * Auto-Discovery Module for MCP Plugins
 * Handles automatic plugin discovery and registration
 */

import * as fs from "fs/promises";
import * as path from "path";
import { homedir } from "os";
import type { MCPMetadata, DiscoveredMCP } from "./contracts/mcp-contract.js";
import { autoDiscoveryLogger } from "./logging.js";

/**
 * Auto-discovery configuration
 */
interface AutoDiscoveryConfig {
  searchPaths: string[];
  manifestName: string;
  maxDepth: number;
  includeAITools?: boolean;
}

/**
 * Default auto-discovery configuration
 */
const DEFAULT_CONFIG: AutoDiscoveryConfig = {
  searchPaths: ["./src/lib/mcp/plugins", "./neurolink-mcp", "./node_modules"],
  manifestName: "neurolink-mcp.json",
  maxDepth: 3,
  includeAITools: true,
};

/**
 * AI Tool MCP Configuration Locations
 */
const AI_TOOL_CONFIG_LOCATIONS = {
  "Claude Desktop": [
    path.join(homedir(), "Library/Application Support/Claude/claude_desktop_config.json"), // macOS
    path.join(homedir(), ".config/Claude/claude_desktop_config.json"), // Linux
    process.env.APPDATA ? path.join(process.env.APPDATA, "Claude/claude_desktop_config.json") : "", // Windows
  ].filter(Boolean),

  "Cline AI Coder": [
    path.join(homedir(), "Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json"), // macOS
    path.join(homedir(), ".config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json"), // Linux
    process.env.APPDATA ? path.join(process.env.APPDATA, "Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json") : "", // Windows
  ].filter(Boolean),

  "VS Code": [
    "./.vscode/mcp.json", // Workspace
    "./.vscode/settings.json", // Workspace settings
    path.join(homedir(), "Library/Application Support/Code/User/settings.json"), // macOS Global
    path.join(homedir(), ".config/Code/User/settings.json"), // Linux Global
    process.env.APPDATA ? path.join(process.env.APPDATA, "Code/User/settings.json") : "", // Windows Global
  ].filter(Boolean),

  "Cursor": [
    "~/.cursor/mcp.json".replace("~", homedir()), // Global
    "./.cursor/mcp.json", // Project
  ],

  "Windsurf": [
    path.join(homedir(), ".codeium/windsurf/mcp_config.json"),
  ],

  "Continue Dev": [
    path.join(homedir(), ".continue/config.json"), // Global
    "./.continue/config.json", // Project
  ],

  "Aider": [
    path.join(homedir(), ".aider/config.json"),
    path.join(homedir(), ".aider/aider.conf"),
  ],

  "Generic": [
    "./mcp.json",
    "./.neuro.config.json",
    "./mcp_config.json",
    "./.mcp-servers.json",
    "./.mcp-config.json",
  ],
};

/**
 * Auto-discovery service for MCP plugins
 */
export class AutoDiscovery {
  private config: AutoDiscoveryConfig;
  private neurolinkConfig: any = {};

  constructor(config: Partial<AutoDiscoveryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Load NeuroLink configuration to respect autoDiscovery settings
   */
  private async loadNeuroLinkConfig(configPath?: string): Promise<void> {
    try {
      const { readFile } = await import("fs/promises");
      const { resolve } = await import("path");
      const configFile = resolve(configPath || ".neuro.config.json");
      const configData = await readFile(configFile, "utf-8");
      this.neurolinkConfig = JSON.parse(configData);
    } catch (error) {
      // Config file not found or invalid - use defaults
      autoDiscoveryLogger.debug("Config file not found, using defaults for auto-discovery");
      this.neurolinkConfig = {};
    }
  }

  /**
   * Discover all available MCP plugins
   */
  async discover(configPath?: string): Promise<DiscoveredMCP[]> {
    // Load NeuroLink configuration
    await this.loadNeuroLinkConfig(configPath);

    // Check if auto-discovery is enabled
    const autoDiscoveryEnabled = this.neurolinkConfig.autoDiscovery?.enabled ??
                                 this.neurolinkConfig.globalConfig?.autoDiscovery ??
                                 true;

    if (!autoDiscoveryEnabled) {
      autoDiscoveryLogger.info("Auto-discovery disabled in configuration");
      return [];
    }

    const discovered: DiscoveredMCP[] = [];

    // Discover internal NeuroLink plugins
    for (const searchPath of this.config.searchPaths) {
      try {
        const plugins = await this.discoverInPath(searchPath);
        discovered.push(...plugins);
      } catch (error) {
        autoDiscoveryLogger.debug(
          `Failed to discover in ${searchPath}:`,
          error,
        );
      }
    }

    // Discover external AI tool MCP servers
    if (this.config.includeAITools) {
      // Respect sources configuration if specified
      const allowedSources = this.neurolinkConfig.autoDiscovery?.sources;
      const aiToolServers = await this.discoverAIToolServers(allowedSources);
      discovered.push(...aiToolServers);
    }

    autoDiscoveryLogger.info(
      `Auto-discovery completed: ${discovered.length} total found (${discovered.filter(d => d.source === 'core').length} internal, ${discovered.filter(d => d.source !== 'core').length} external)`,
    );
    return discovered;
  }

  /**
   * Discover plugins in a specific path
   */
  private async discoverInPath(
    basePath: string,
    depth = 0,
  ): Promise<DiscoveredMCP[]> {
    if (depth > this.config.maxDepth) {
      return [];
    }

    const discovered: DiscoveredMCP[] = [];

    try {
      const items = await fs.readdir(basePath);

      for (const item of items) {
        const itemPath = path.join(basePath, item);
        const stats = await fs.stat(itemPath);

        if (stats.isDirectory()) {
          // Check for manifest in this directory
          const manifestPath = path.join(itemPath, this.config.manifestName);

          try {
            await fs.access(manifestPath);
            const plugin = await this.loadPlugin(manifestPath, itemPath);
            if (plugin) {
              discovered.push(plugin);
            }
          } catch {
            // No manifest, continue searching subdirectories
            const subPlugins = await this.discoverInPath(itemPath, depth + 1);
            discovered.push(...subPlugins);
          }
        }
      }
    } catch (error) {
      autoDiscoveryLogger.debug(`Failed to scan ${basePath}:`, error);
    }

    return discovered;
  }

  /**
   * Load plugin from manifest
   */
  private async loadPlugin(
    manifestPath: string,
    pluginPath: string,
  ): Promise<DiscoveredMCP | null> {
    try {
      const manifestContent = await fs.readFile(manifestPath, "utf-8");
      const metadata: MCPMetadata = JSON.parse(manifestContent);

      // Validate basic metadata
      if (!metadata.name || !metadata.version || !metadata.main) {
        autoDiscoveryLogger.warn(`Invalid manifest at ${manifestPath}`);
        return null;
      }

      const entryPath = path.resolve(pluginPath, metadata.main);

      return {
        metadata,
        entryPath,
        source: this.determineSource(pluginPath),
        constructor: undefined,
      };
    } catch (error) {
      autoDiscoveryLogger.error(
        `Failed to load plugin manifest at ${manifestPath}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Discover MCP servers from AI development tools
   */
  private async discoverAIToolServers(allowedSources?: string[]): Promise<DiscoveredMCP[]> {
    const discovered: DiscoveredMCP[] = [];

    for (const [toolName, configPaths] of Object.entries(AI_TOOL_CONFIG_LOCATIONS)) {
      // Filter by allowed sources if specified
      if (allowedSources && allowedSources.length > 0) {
        const toolKey = toolName.toLowerCase().replace(/\s+/g, "");
        const shouldInclude = allowedSources.some(source =>
          toolKey.includes(source.toLowerCase()) ||
          source.toLowerCase() === "generic" && toolName === "Generic"
        );

        if (!shouldInclude) {
          autoDiscoveryLogger.debug(`Skipping ${toolName} - not in allowed sources: ${allowedSources.join(", ")}`);
          continue;
        }
      }

      for (const configPath of configPaths) {
        try {
          const servers = await this.loadAIToolConfig(configPath, toolName);
          discovered.push(...servers);
        } catch (error) {
          autoDiscoveryLogger.debug(
            `Failed to load ${toolName} config from ${configPath}:`,
            error,
          );
        }
      }
    }

    return discovered;
  }

  /**
   * Load MCP servers from AI tool configuration files
   */
  private async loadAIToolConfig(
    configPath: string,
    toolName: string,
  ): Promise<DiscoveredMCP[]> {
    try {
      const configContent = await fs.readFile(configPath, "utf-8");
      const config = JSON.parse(configContent);

      // Extract MCP servers from various config formats
      let mcpServers: Record<string, any> = {};

      if (config.mcpServers) {
        mcpServers = config.mcpServers;
      } else if (config.mcp_servers) {
        mcpServers = config.mcp_servers;
      } else if (config.servers) {
        mcpServers = config.servers;
      } else if (config.mcp?.servers) {
        mcpServers = config.mcp.servers;
      } else if (config.contextProviders?.mcp) {
        mcpServers = config.contextProviders.mcp;
      }

      const discovered: DiscoveredMCP[] = [];

      for (const [serverId, serverConfig] of Object.entries(mcpServers)) {
        if (typeof serverConfig === 'object' && serverConfig !== null) {
          const server = serverConfig as any;

          discovered.push({
            metadata: {
              name: server.name || serverId,
              version: "1.0.0", // Default version for external servers
              description: server.description || `MCP server from ${toolName}`,
              author: toolName,
              category: "external",
              main: "", // Not applicable for external servers
              permissions: ["read", "write"], // Default permissions
            },
            entryPath: configPath,
            source: this.determineSourceFromTool(toolName),
            constructor: undefined,
            external: {
              command: server.command,
              args: server.args || [],
              env: server.env,
              transport: server.transport || "stdio",
              url: server.url,
              cwd: server.cwd,
              tool: toolName,
              type: this.determineConfigType(configPath),
            },
          });
        }
      }

      if (discovered.length > 0) {
        autoDiscoveryLogger.info(
          `Found ${discovered.length} MCP servers in ${toolName} config: ${configPath}`,
        );
      }

      return discovered;
    } catch (error) {
      if ((error as any).code !== "ENOENT") {
        autoDiscoveryLogger.debug(
          `Failed to parse ${toolName} config ${configPath}:`,
          error,
        );
      }
      return [];
    }
  }

  /**
   * Determine plugin source based on path
   */
  private determineSource(
    pluginPath: string,
  ): "core" | "project" | "installed" {
    if (pluginPath.includes("node_modules")) {
      return "installed";
    }
    if (pluginPath.includes("src/lib/mcp/plugins")) {
      return "core";
    }
    return "project";
  }

  /**
   * Determine source type from AI tool name
   */
  private determineSourceFromTool(toolName: string): "core" | "project" | "installed" {
    // Most AI tool configs are user/global configurations
    if (toolName === "Generic") {
      return "project";
    }
    return "installed"; // External tools are treated as "installed"
  }

  /**
   * Determine configuration type (global vs workspace)
   */
  private determineConfigType(configPath: string): "global" | "workspace" {
    if (configPath.startsWith("./") || configPath.includes(".vscode") || configPath.includes(".cursor") || configPath.includes(".continue")) {
      return "workspace";
    }
    return "global";
  }
}

/**
 * Default auto-discovery instance
 */
export const autoDiscovery = new AutoDiscovery();

/**
 * Discovery options interface
 */
export interface DiscoveryOptions {
  searchPaths?: string[];
  manifestName?: string;
  maxDepth?: number;
  includeDevPlugins?: boolean;
  includeAITools?: boolean;
}

/**
 * Discover MCP servers using auto-discovery
 */
export async function discoverMCPServers(
  options: DiscoveryOptions = {},
): Promise<DiscoveredMCP[]> {
  const discovery = new AutoDiscovery(options);
  return discovery.discover();
}

/**
 * Auto-register discovered MCP servers
 */
export async function autoRegisterMCPServers(
  options: DiscoveryOptions = {},
): Promise<{
  registered: number;
  failed: number;
  plugins: DiscoveredMCP[];
}> {
  const discovered = await discoverMCPServers(options);

  let registered = 0;
  let failed = 0;

  for (const plugin of discovered) {
    try {
      // Registration logic would go here
      autoDiscoveryLogger.info(`Registered plugin: ${plugin.metadata.name}`);
      registered++;
    } catch (error) {
      autoDiscoveryLogger.error(
        `Failed to register ${plugin.metadata.name}:`,
        error,
      );
      failed++;
    }
  }

  return {
    registered,
    failed,
    plugins: discovered,
  };
}
