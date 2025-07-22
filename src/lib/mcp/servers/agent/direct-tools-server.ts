/**
 * NeuroLink Direct Tools Server
 * Wraps the agent direct tools as an MCP server for proper registration
 */

import { createMCPServer } from "../../factory.js";
import type { NeuroLinkExecutionContext, ToolResult } from "../../factory.js";
import { directAgentTools } from "../../../agent/direct-tools.js";
import { logger } from "../../../utils/logger.js";

/**
 * Direct Tools Server - Agent direct tools for immediate use
 */
export const directToolsServer = createMCPServer({
  id: "neurolink-direct",
  title: "NeuroLink Direct Tools Server",
  description: "Provides direct agent tools for immediate execution",
  category: "integrations",
  version: "1.0.0",
});

/**
 * Wrap each direct tool and register it with the server
 */
Object.entries(directAgentTools).forEach(([toolName, toolDef]) => {
  // The toolDef is a Vercel AI SDK Tool object
  // Extract properties from the Tool object
  const toolSpec = (toolDef as any)._spec || toolDef;
  const description = toolSpec.description || `Direct tool: ${toolName}`;
  const inputSchema = toolSpec.parameters;
  const execute = toolSpec.execute;

  directToolsServer.registerTool({
    name: toolName,
    description: description,
    category: getToolCategory(toolName),
    inputSchema: inputSchema,
    isImplemented: true,
    execute: async (
      params: any,
      context: NeuroLinkExecutionContext,
    ): Promise<ToolResult> => {
      const startTime = Date.now();

      try {
        logger.debug(
          `[Direct Tools] Executing ${toolName} with params:`,
          params,
        );

        // Execute the direct tool
        const result = await execute(params);

        // Convert direct tool result to ToolResult format
        if (result.success) {
          return {
            success: true,
            data: result,
            usage: {
              executionTime: Date.now() - startTime,
            },
            metadata: {
              toolName,
              serverId: "neurolink-direct",
              sessionId: context.sessionId,
            },
          };
        } else {
          return {
            success: false,
            data: null,
            error: result.error || "Unknown error",
            usage: {
              executionTime: Date.now() - startTime,
            },
            metadata: {
              toolName,
              serverId: "neurolink-direct",
              sessionId: context.sessionId,
            },
          };
        }
      } catch (error) {
        logger.error(`[Direct Tools] Error executing ${toolName}:`, error);

        return {
          success: false,
          data: null,
          error: error instanceof Error ? error.message : String(error),
          usage: {
            executionTime: Date.now() - startTime,
          },
          metadata: {
            toolName,
            serverId: "neurolink-direct",
            sessionId: context.sessionId,
          },
        };
      }
    },
  });
});

/**
 * Get tool category based on tool name
 */
function getToolCategory(toolName: string): string {
  switch (toolName) {
    case "getCurrentTime":
      return "time";
    case "calculateMath":
      return "math";
    case "readFile":
    case "writeFile":
    case "listDirectory":
    case "searchFiles":
      return "filesystem";
    default:
      return "utility";
  }
}

// Log successful registration
logger.info(
  `[Direct Tools] Registered ${Object.keys(directAgentTools).length} direct tools`,
);
