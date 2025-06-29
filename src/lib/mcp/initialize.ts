/**
 * NeuroLink MCP Initialization System
 * Automatically registers built-in NeuroLink servers with the default registry
 * Ensures built-in tools are always available without manual configuration
 */

import { toolRegistry, defaultToolRegistry } from "./tool-registry.js";
import { mcpLogger } from "./logging.js";

let isInitialized = false;

/**
 * Initialize NeuroLink MCP system by registering built-in servers
 */
export async function initializeNeuroLinkMCP(configPath?: string): Promise<void> {
  if (isInitialized) {
    return;
  }

  mcpLogger.debug("Initializing built-in MCP servers...");

  try {
    // Load configuration to respect enableInternalServers setting
    let config: any = {};
    try {
      const { readFile } = await import("fs/promises");
      const { resolve } = await import("path");
      const configFile = resolve(configPath || ".neuro.config.json");
      const configData = await readFile(configFile, "utf-8");
      config = JSON.parse(configData);
    } catch (error) {
      // Config file not found or invalid - use defaults
      mcpLogger.debug("Config file not found, using defaults for internal servers");
    }

    const enableInternalServers = config.neurolink?.enableInternalServers ?? true;
    const aiCoreConfig = config.neurolink?.aiCore;
    const utilitiesConfig = config.neurolink?.utilities;

    if (!enableInternalServers) {
      mcpLogger.info("Internal servers disabled in configuration");
      isInitialized = true;
      return;
    }

    let registeredServers = 0;

    // Register utility server if enabled
    if (utilitiesConfig?.enabled !== false) {
      const { utilityServer } = await import(
        "./servers/utilities/utility-server.js"
      );
      await toolRegistry.registerServer(utilityServer.id, utilityServer);
      mcpLogger.debug("Registered neurolink-utility server with built-in tools");
      registeredServers++;
    } else {
      mcpLogger.debug("Utility server disabled in configuration");
    }

    // Register AI core server if enabled
    if (aiCoreConfig?.enabled !== false) {
      const { aiCoreServer } = await import('./servers/ai-providers/ai-core-server.js');
      await toolRegistry.registerServer(aiCoreServer.id, aiCoreServer);
      mcpLogger.debug('Registered neurolink-ai-core server with AI tools');
      registeredServers++;
    } else {
      mcpLogger.debug("AI core server disabled in configuration");
    }

    const stats = await toolRegistry.getStats();
    mcpLogger.info(
      `Initialization complete: ${registeredServers} internal servers registered, ${stats.totalTools} tools available`,
    );

    isInitialized = true;
  } catch (error) {
    mcpLogger.error(
      "Failed to initialize built-in servers:",
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}

/**
 * Get initialization status
 */
export function isNeuroLinkMCPInitialized(): boolean {
  return isInitialized;
}

/**
 * Reset initialization status (for testing)
 */
export function resetInitialization(): void {
  isInitialized = false;
  defaultToolRegistry.clear();
}

// Note: Auto-initialization removed to prevent circular dependencies
// Call initializeNeuroLinkMCP() explicitly where needed
