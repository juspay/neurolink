/**
 * NeuroLink MCP Tool Initialization
 * Following Lighthouse's pattern for registering MCP server tools with the client
 */

import type { NeuroLinkMCPClient } from "./client.js";
import type {
  NeuroLinkMCPServer,
  NeuroLinkMCPTool,
  NeuroLinkExecutionContext,
} from "./factory.js";
import { mcpConfig } from "./config.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from "zod";
import { logger } from "../utils/logger.js";

/**
 * Sanitize tool name for compatibility
 * Following Lighthouse's pattern of ensuring valid tool names
 */
const sanitizeToolName = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_");
};

/**
 * Check if a schema is a Zod schema
 */
const isZodSchema = (schema: unknown): schema is z.ZodTypeAny => {
  if (typeof schema !== "object" || schema === null) {
    return false;
  }
  return "_def" in schema || "parse" in schema;
};

/**
 * Initialize and register tools from MCP Servers with the MCP client
 * Following Lighthouse's pattern for tool registration
 */
export const initializeMCPTools = async (
  sessionId: string,
  client: NeuroLinkMCPClient,
  context: NeuroLinkExecutionContext,
): Promise<void> => {
  try {
    logger.info(`[MCP Tools] Initializing tools for session: ${sessionId}`);

    // Get all registered servers
    const servers: NeuroLinkMCPServer[] = await mcpConfig.getServers();

    if (!servers || servers.length === 0) {
      logger.warn("[MCP Tools] No MCP servers found to register tools from");
      return;
    }

    let totalToolsRegistered = 0;

    // Process each server
    servers.forEach((server: NeuroLinkMCPServer) => {
      if (!server || !server.id || !server.tools) {
        logger.warn(
          `[MCP Tools] Skipping invalid server configuration: ${JSON.stringify(server)}`,
        );
        return;
      }

      const serverId = server.id;
      logger.info(`[MCP Tools] Registering tools from server: ${serverId}`);

      // Process each tool in the server
      Object.entries(server.tools).forEach(([originalToolName, tool]) => {
        if (!tool || typeof tool.execute !== "function") {
          logger.warn(
            `[MCP Tools] Skipping invalid tool definition for ${originalToolName} in server ${serverId}`,
          );
          return;
        }

        // Create namespaced tool name (serverId_toolName)
        let finalToolName = originalToolName;
        const prefix = `${serverId}_`;
        const maxToolNameLength = 64 - prefix.length;

        // Truncate if necessary
        if (finalToolName.length > maxToolNameLength) {
          finalToolName = finalToolName.substring(0, maxToolNameLength);
          logger.info(
            `[MCP Tools] Truncated tool name: ${originalToolName} -> ${finalToolName}`,
          );
        }

        // Sanitize and combine
        const namespacedToolName = sanitizeToolName(
          `${prefix}${finalToolName}`,
        );

        // Validate final length
        if (namespacedToolName.length > 64) {
          logger.warn(
            `[MCP Tools] Tool name too long after sanitization: ${namespacedToolName}. Skipping.`,
          );
          return;
        }

        // Prepare description
        const description =
          tool.description ||
          `Tool ${originalToolName} from server ${serverId}`;

        // Convert schema if needed
        let schemaForClient: Record<string, unknown> | undefined = undefined;

        if (tool.inputSchema) {
          if (isZodSchema(tool.inputSchema)) {
            try {
              const jsonSchemaOutput = zodToJsonSchema(tool.inputSchema);

              if (
                typeof jsonSchemaOutput === "object" &&
                jsonSchemaOutput !== null &&
                "type" in jsonSchemaOutput &&
                jsonSchemaOutput.type === "object"
              ) {
                schemaForClient = jsonSchemaOutput as Record<string, unknown>;
              } else {
                logger.warn(
                  `[MCP Tools] Converted schema for ${originalToolName} is not a root object type`,
                );
              }
            } catch (schemaError) {
              logger.error(
                `[MCP Tools] Error converting Zod schema for tool ${originalToolName}: ${schemaError}`,
              );
            }
          } else if (
            typeof tool.inputSchema === "object" &&
            tool.inputSchema !== null
          ) {
            if (
              (tool.inputSchema as Record<string, unknown>).type === "object"
            ) {
              schemaForClient = tool.inputSchema as Record<string, unknown>;
            } else {
              logger.warn(
                `[MCP Tools] Input schema for ${originalToolName} is not type 'object'`,
              );
            }
          }
        }

        try {
          // Register tool with client
          client.registerTool(
            namespacedToolName,
            async (_name: string, input: Record<string, unknown>) => {
              // Execute the tool with full context
              const result = await tool.execute(input, context);

              // Convert to Lighthouse-style response
              if (result.success) {
                return {
                  content: [{ text: JSON.stringify(result.data ?? {}) }],
                };
              } else {
                return {
                  content: [
                    { text: `Error: ${result.error || "Unknown error"}` },
                  ],
                  isError: true,
                };
              }
            },
            description,
            schemaForClient,
          );

          logger.debug(`[MCP Tools] Registered tool: ${namespacedToolName}`, {
            serverId,
            originalToolName,
          });

          totalToolsRegistered++;
        } catch (registrationError) {
          logger.error(
            `[MCP Tools] Failed to register tool ${originalToolName} from server ${serverId}: ${registrationError}`,
          );
        }
      });
    });

    logger.info(
      `[MCP Tools] Successfully registered ${totalToolsRegistered} tools for session: ${sessionId}`,
    );
  } catch (error) {
    logger.error(
      `[MCP Tools] Error during tool initialization for session ${sessionId}: ${error}`,
    );
  }
};

/**
 * Get all available tools across all servers
 * Useful for documentation and discovery
 */
export async function getAllAvailableTools(
  inMemoryServers?: Map<string, any>,
): Promise<
  Array<{
    serverId: string;
    serverTitle: string;
    toolName: string;
    namespacedName: string;
    description: string;
    isImplemented: boolean;
  }>
> {
  const tools: Array<{
    serverId: string;
    serverTitle: string;
    toolName: string;
    namespacedName: string;
    description: string;
    isImplemented: boolean;
  }> = [];

  // Add in-memory server tools first
  if (inMemoryServers) {
    for (const [serverId, serverConfig] of inMemoryServers) {
      const server = serverConfig.server;
      if (server && server.tools) {
        // Handle both Map and object formats
        const toolEntries =
          server.tools instanceof Map
            ? Array.from(server.tools.entries())
            : Object.entries(server.tools || {});

        for (const [toolName, toolInfo] of toolEntries as [string, any][]) {
          const prefix = `${serverId}_`;
          const finalToolName =
            toolName.length > 64 - prefix.length
              ? toolName.substring(0, 64 - prefix.length)
              : toolName;
          const namespacedName = sanitizeToolName(`${prefix}${finalToolName}`);

          // Handle different tool info structures
          let description = `Tool from ${serverId}`;
          let isImplemented = true;

          if (toolInfo) {
            // Check if it's a tool info object with description
            if (typeof toolInfo.description === "string") {
              description = toolInfo.description;
            } else if (typeof toolInfo === "function") {
              // It's a raw function, no description available
              description = `${toolName} from ${serverId}`;
            }

            // Check implementation status
            if (typeof toolInfo.isImplemented === "boolean") {
              isImplemented = toolInfo.isImplemented;
            }
          }

          tools.push({
            serverId,
            serverTitle: server.title || serverId,
            toolName,
            namespacedName,
            description,
            isImplemented,
          });
        }
      }
    }
  }

  const servers = await mcpConfig.getServers();

  servers.forEach((server) => {
    Object.entries(server.tools).forEach(([toolName, tool]) => {
      const prefix = `${server.id}_`;
      const finalToolName =
        toolName.length > 64 - prefix.length
          ? toolName.substring(0, 64 - prefix.length)
          : toolName;
      const namespacedName = sanitizeToolName(`${prefix}${finalToolName}`);

      tools.push({
        serverId: server.id,
        serverTitle: server.title,
        toolName,
        namespacedName,
        description: tool.description || "",
        isImplemented: tool.isImplemented !== false,
      });
    });
  });

  return tools;
}

/**
 * Initialize tools for a specific server only
 * Useful for selective tool registration
 */
export async function initializeServerTools(
  serverId: string,
  client: NeuroLinkMCPClient,
  context: NeuroLinkExecutionContext,
): Promise<number> {
  const servers = await mcpConfig.getServers();
  const server = servers.find((s) => s.id === serverId);

  if (!server) {
    logger.warn(`[MCP Tools] Server not found: ${serverId}`);
    return 0;
  }

  let toolsRegistered = 0;

  Object.entries(server.tools).forEach(([toolName, tool]) => {
    if (!tool || typeof tool.execute !== "function") {
      return;
    }

    const prefix = `${serverId}_`;
    const finalToolName =
      toolName.length > 64 - prefix.length
        ? toolName.substring(0, 64 - prefix.length)
        : toolName;
    const namespacedToolName = sanitizeToolName(`${prefix}${finalToolName}`);

    if (namespacedToolName.length > 64) {
      return;
    }

    try {
      client.registerTool(
        namespacedToolName,
        async (_name: string, input: Record<string, unknown>) => {
          const result = await tool.execute(input, context);

          if (result.success) {
            return { content: [{ text: JSON.stringify(result.data ?? {}) }] };
          } else {
            return {
              content: [{ text: `Error: ${result.error || "Unknown error"}` }],
              isError: true,
            };
          }
        },
        tool.description || `Tool ${toolName} from server ${serverId}`,
        tool.inputSchema,
      );

      toolsRegistered++;
    } catch (error) {
      logger.error(`[MCP Tools] Failed to register tool ${toolName}: ${error}`);
    }
  });

  logger.info(
    `[MCP Tools] Registered ${toolsRegistered} tools from server ${serverId}`,
  );
  return toolsRegistered;
}
