/**
 * NeuroLink MCP Configuration
 * Central registry for all MCP servers following Lighthouse patterns
 * Handles built-in servers only - auto-discovery handled by unified registry
 */

import type { NeuroLinkMCPServer } from "./factory.js";
import { aiCoreServer } from "./servers/ai-providers/ai-core-server.js";
import { utilityServer } from "./servers/utilities/utility-server.js";
import { logger } from "../utils/logger.js";

/**
 * Built-in MCP servers (kept for backward compatibility)
 * Add new servers here as they are created
 */
export const allServers: NeuroLinkMCPServer[] = [
  aiCoreServer,
  utilityServer,
  // Add more servers as they are created
];

/**
 * MCP Configuration following Lighthouse patterns
 * Handles built-in servers - auto-discovery is handled by unified registry
 */
export const mcpConfig = {
  /**
   * Get list of active built-in MCP servers with implemented tools
   */
  getServers: async (): Promise<NeuroLinkMCPServer[]> => {
    const activeServers: NeuroLinkMCPServer[] = [];

    // Include built-in servers with filtering
    for (const server of allServers) {
      const implementedTools: typeof server.tools = {};
      let hasImplementedTools = false;

      for (const toolName in server.tools) {
        const tool = server.tools[toolName];
        // Only include tools that are implemented (default to true if not specified)
        if (tool.isImplemented !== false) {
          implementedTools[toolName] = tool;
          hasImplementedTools = true;
        }
      }

      // Only include servers that have at least one implemented tool
      if (hasImplementedTools) {
        activeServers.push({
          ...server,
          tools: implementedTools,
        });
      }
    }

    logger.debug("[MCP Config] Built-in servers:", {
      total: activeServers.length,
      serverIds: activeServers.map((s) => s.id),
    });

    return activeServers;
  },

  /**
   * Get all available tools across all servers
   */
  getAllTools: async () => {
    const servers = await mcpConfig.getServers();
    const allTools: Array<{
      name: string;
      description: string;
      serverId: string;
      serverTitle: string;
      category?: string;
    }> = [];

    for (const server of servers) {
      for (const toolName in server.tools) {
        const tool = server.tools[toolName];
        allTools.push({
          name: toolName,
          description: tool.description,
          serverId: server.id,
          serverTitle: server.title,
          category: tool.category,
        });
      }
    }

    return allTools;
  },
};
