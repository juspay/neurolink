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
export async function initializeNeuroLinkMCP(): Promise<void> {
  if (isInitialized) {
    return;
  }

  mcpLogger.debug("Initializing built-in MCP servers...");

  try {
    // Import utility server dynamically to avoid circular dependencies
    // Note: AI core server temporarily disabled due to circular dependency issues
    const { utilityServer } = await import(
      "./servers/utilities/utility-server.js"
    );

    // Register built-in NeuroLink servers with default registry
    await toolRegistry.registerServer(utilityServer.id, utilityServer);
    mcpLogger.debug("Registered neurolink-utility server with built-in tools");

    // TODO: Re-enable AI core server once circular dependencies are resolved
    // const { aiCoreServer } = await import('./servers/ai-providers/ai-core-server.js');
    // await toolRegistry.registerServer(aiCoreServer.id, aiCoreServer);
    // mcpLogger.debug('Registered neurolink-ai-core server with AI tools');

    const stats = await toolRegistry.getStats();
    mcpLogger.info(
      `Initialization complete: ${stats.totalServers} server, ${stats.totalTools} tools available`,
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
