/**
 * NeuroLink Direct Tools Server
 * Wraps the agent direct tools as an MCP server for proper registration
 */

import type { Unknown, UnknownRecord } from "../../../types/common.js";
import { z } from "zod";
import { createMCPServer } from "../../factory.js";
import type { NeuroLinkExecutionContext, ToolResult } from "../../factory.js";
import { directAgentTools } from "../../../agent/directTools.js";
import { logger } from "../../../utils/logger.js";
import { shouldDisableBuiltinTools } from "../../../utils/toolUtils.js";

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
 * Only register if built-in tools are not disabled
 */
if (!shouldDisableBuiltinTools()) {
  Object.entries(directAgentTools).forEach(([toolName, toolDef]) => {
    // The toolDef is a Vercel AI SDK Tool object
    // Extract properties from the Tool object
    const toolSpec = (toolDef as UnknownRecord)._spec || toolDef;
    const description =
      typeof toolSpec === "object" &&
      toolSpec &&
      "description" in toolSpec &&
      typeof toolSpec.description === "string"
        ? toolSpec.description
        : `Direct tool: ${toolName}`;
    const inputSchema =
      typeof toolSpec === "object" && toolSpec && "parameters" in toolSpec
        ? toolSpec.parameters
        : undefined;
    const execute =
      typeof toolSpec === "object" && toolSpec && "execute" in toolSpec
        ? toolSpec.execute
        : undefined;

    directToolsServer.registerTool({
      name: toolName,
      description: description,
      category: getToolCategory(toolName),
      inputSchema: inputSchema as z.ZodSchema | undefined,
      isImplemented: true,
      execute: async (
        params: Unknown,
        context: NeuroLinkExecutionContext,
      ): Promise<ToolResult> => {
        const startTime = Date.now();

        try {
          logger.debug(
            `[Direct Tools] Executing ${toolName} with params:`,
            params,
          );

          // Execute the direct tool
          if (!execute || typeof execute !== "function") {
            throw new Error(`Tool ${toolName} has no execute function`);
          }
          const result = await (
            execute as (params: Unknown) => Promise<Unknown>
          )(params);

          // Convert direct tool result to ToolResult format
          if ((result as UnknownRecord)?.success) {
            return {
              success: true,
              data: (result as UnknownRecord).data || result,
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
              error:
                String((result as UnknownRecord)?.error) || "Unknown error",
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
} else {
  logger.info("[Direct Tools] Built-in tools disabled via configuration");
}

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
    case "websearchGrounding":
      return "search";
    default:
      return "utility";
  }
}

// Log successful registration or disable status
if (!shouldDisableBuiltinTools()) {
  logger.info(
    `[Direct Tools] Registered ${Object.keys(directAgentTools).length} direct tools`,
  );
} else {
  logger.info(
    "[Direct Tools] 0 direct tools registered (disabled via environment variable)",
  );
}
