/**
 * NeuroLink MCP (Model Context Protocol) Module
 *
 * This module exports the MCP configuration and initialization utilities
 * for use throughout the application, following Lighthouse's patterns.
 */

import { mcpConfig } from "./config.js";
import { getMCPManager, removeMCPManager, MCPManager } from "./manager.js";
import {
  initializeMCPTools,
  getAllAvailableTools,
  initializeServerTools,
} from "./initialize-tools.js";
import { createMCPServer } from "./factory.js";
import { logger } from "../utils/logger.js";
import type { NeuroLinkMCPServer, NeuroLinkMCPTool } from "./factory.js";

// Re-export core components
export { createMCPServer } from "./factory.js";
export { mcpConfig } from "./config.js";
export { getMCPManager, removeMCPManager, MCPManager } from "./manager.js";
export { createMCPClient } from "./client.js";
export {
  initializeMCPTools,
  getAllAvailableTools,
  initializeServerTools,
} from "./initialize-tools.js";

// Re-export types
export type {
  NeuroLinkMCPServer,
  NeuroLinkMCPTool,
  NeuroLinkExecutionContext,
  ToolResult,
  MCPServerCategory,
  MCPServerConfig,
} from "./factory.js";

export type { MCPClientConfig } from "./client.js";

/**
 * MCP utilities for system-wide operations
 */
export const MCPUtils = {
  /**
   * Get a formatted list of all available tools across all registered MCP servers
   * Useful for documentation or configuration UI
   */
  getAvailableTools: async () => {
    const servers: NeuroLinkMCPServer[] = await mcpConfig.getServers();

    return servers.map((server) => ({
      serverId: server.id,
      serverTitle: server.title,
      serverDescription: server.description,
      category: server.category,
      toolCount: Object.keys(server.tools).length,
      tools: Object.entries(server.tools).map(([name, tool]) => ({
        name,
        description: tool.description,
        isImplemented: tool.isImplemented !== false,
      })),
    }));
  },

  /**
   * Function to test connectivity with MCP servers
   * Returns diagnostics about the MCP server initialization status
   */
  testConnectivity: async () => {
    try {
      const servers: NeuroLinkMCPServer[] = await mcpConfig.getServers();

      const results = servers.map((server) => ({
        serverId: server.id,
        serverTitle: server.title,
        status: "connected",
        toolCount: Object.keys(server.tools).length,
        implementedTools: Object.values(server.tools).filter(
          (tool) => tool.isImplemented !== false,
        ).length,
      }));

      const totalToolCount = results.reduce(
        (acc, server) => acc + server.toolCount,
        0,
      );
      const totalImplemented = results.reduce(
        (acc, server) => acc + server.implementedTools,
        0,
      );

      logger.info("[MCP Utils] Connectivity test successful", {
        serverCount: results.length,
        totalToolCount,
        totalImplemented,
      });

      return {
        status: "ok",
        message: `Connected to ${results.length} MCP servers with ${totalToolCount} total tools (${totalImplemented} implemented)`,
        servers: results,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      logger.error("[MCP Utils] Connectivity test failed", {
        error: errorMessage,
      });

      return {
        status: "error",
        message: `Failed to connect to MCP servers: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      };
    }
  },

  /**
   * Get statistics about MCP usage
   */
  getStatistics: async () => {
    const servers = await mcpConfig.getServers();
    const managerStats = MCPManager.getAllStats();

    interface ToolStatsAccumulator {
      totalTools: number;
      implementedTools: number;
      byCategory: Record<string, number>;
    }

    const toolStats = servers.reduce(
      (acc: ToolStatsAccumulator, server: NeuroLinkMCPServer) => {
        const tools = Object.values(server.tools);
        acc.totalTools += tools.length;
        acc.implementedTools += tools.filter(
          (t: NeuroLinkMCPTool) => t.isImplemented !== false,
        ).length;

        // Count by category
        if (server.category) {
          acc.byCategory[server.category] =
            (acc.byCategory[server.category] || 0) + tools.length;
        }

        return acc;
      },
      {
        totalTools: 0,
        implementedTools: 0,
        byCategory: {} as Record<string, number>,
      },
    );

    return {
      servers: {
        total: servers.length,
        byCategory: servers.reduce(
          (acc: Record<string, number>, server: NeuroLinkMCPServer) => {
            const category = server.category || "custom";
            acc[category] = (acc[category] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
      },
      tools: toolStats,
      sessions: managerStats,
    };
  },

  /**
   * Initialize MCP for a session
   * Convenience method that sets up everything needed for a session
   */
  initializeSession: async (
    sessionId: string,
    config?: {
      userId?: string;
      aiProvider?: string;
      modelId?: string;
    },
  ) => {
    // Get or create MCP client for session
    const client = getMCPManager(sessionId, config);

    // Create context for tool execution
    const context: import("./factory.js").NeuroLinkExecutionContext = {
      sessionId,
      userId: config?.userId,
      aiProvider: config?.aiProvider,
      modelId: config?.modelId,
      timestamp: Date.now(),
    };

    // Initialize all tools
    initializeMCPTools(sessionId, client, context);

    // Return session info
    return {
      sessionId,
      client,
      context,
      toolCount: Object.keys(client.getTools()).length,
    };
  },

  /**
   * Clean up a session
   */
  cleanupSession: async (sessionId: string) => {
    return removeMCPManager(sessionId);
  },
};

/**
 * Default export for convenience
 */
export default {
  config: mcpConfig,
  utils: MCPUtils,
  createServer: createMCPServer,
  getManager: getMCPManager,
  removeManager: removeMCPManager,
};
