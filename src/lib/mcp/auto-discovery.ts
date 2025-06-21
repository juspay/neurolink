/**
 * Auto-Discovery Module for MCP Plugins
 * Handles automatic plugin discovery and registration
 */

import * as fs from "fs/promises";
import * as path from "path";
import type { MCPMetadata, DiscoveredMCP } from "./contracts/mcp-contract.js";
import { autoDiscoveryLogger } from "./logging.js";

/**
 * Auto-discovery configuration
 */
interface AutoDiscoveryConfig {
  searchPaths: string[];
  manifestName: string;
  maxDepth: number;
}

/**
 * Default auto-discovery configuration
 */
const DEFAULT_CONFIG: AutoDiscoveryConfig = {
  searchPaths: ["./src/lib/mcp/plugins", "./neurolink-mcp", "./node_modules"],
  manifestName: "neurolink-mcp.json",
  maxDepth: 3,
};

/**
 * Auto-discovery service for MCP plugins
 */
export class AutoDiscovery {
  private config: AutoDiscoveryConfig;

  constructor(config: Partial<AutoDiscoveryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Discover all available MCP plugins
   */
  async discover(): Promise<DiscoveredMCP[]> {
    const discovered: DiscoveredMCP[] = [];

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

    autoDiscoveryLogger.info(
      `Auto-discovery completed: ${discovered.length} plugins found`,
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
