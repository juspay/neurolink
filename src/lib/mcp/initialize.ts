/**
 * NeuroLink MCP Initialization System
 * Automatically registers built-in NeuroLink servers with the default registry
 * Ensures built-in tools are always available without manual configuration
 */

import {
  toolRegistry,
  defaultToolRegistry,
  type MCPToolRegistry,
} from "./tool-registry.js";
import { mcpLogger } from "./logging.js";
import { ServiceRegistry } from "../core/service-registry.js";

let isInitialized = false;

/**
 * Initialize NeuroLink MCP system by registering built-in servers
 */
export async function initializeNeuroLinkMCP(
  targetRegistry?: MCPToolRegistry,
): Promise<void> {
  if (isInitialized) {
    return;
  }

  mcpLogger.debug("Initializing built-in MCP servers...");

  try {
    // First, register AIProviderFactory in ServiceRegistry to break circular dependencies
    ServiceRegistry.register("AIProviderFactory", async () => {
      const { AIProviderFactory } = await import("../core/factory.js");
      return AIProviderFactory;
    });
    mcpLogger.debug("Registered AIProviderFactory in ServiceRegistry");

    // Import utility server dynamically to avoid circular dependencies
    const { utilityServer } = await import(
      "./servers/utilities/utility-server.js"
    );

    // Register built-in NeuroLink servers with specified registry (or default)
    const registry = targetRegistry || toolRegistry;
    await registry.registerServer(utilityServer.id, utilityServer);
    mcpLogger.debug(
      `Registered neurolink-utility server with built-in tools in ${targetRegistry ? "target" : "default"} registry`,
    );

    // Now safe to import and register AI core server
    const { aiCoreServer } = await import(
      "./servers/ai-providers/ai-core-server.js"
    );
    await registry.registerServer(aiCoreServer.id, aiCoreServer);
    mcpLogger.debug("Registered neurolink-ai-core server with AI tools");

    // Register direct tools server
    const { directToolsServer } = await import(
      "./servers/agent/direct-tools-server.js"
    );
    await registry.registerServer(directToolsServer.id, directToolsServer);
    mcpLogger.debug("Registered neurolink-direct server with direct tools");

    const stats = await registry.getStats();
    mcpLogger.info(
      `Initialization complete: ${stats.totalServers} servers, ${stats.totalTools} tools available`,
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
