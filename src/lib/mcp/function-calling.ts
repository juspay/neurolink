/**
 * MCP Function-Calling Integration
 * Converts MCP tools to AI SDK function definitions and handles function calls
 * Enables true AI function calling with discovered MCP tools
 */

import type { Tool } from "ai";
import { tool } from "ai";
import { z } from "zod";
import type {
  NeuroLinkMCPTool,
  ToolResult,
  NeuroLinkExecutionContext,
} from "./factory.js";
import { unifiedRegistry } from "./unified-registry.js";
import { createExecutionContext } from "./context-manager.js";
import { mcpLogger } from "./logging.js";

/**
 * Convert MCP tool to AI SDK function definition
 */
export function mcpToolToAISDKTool(
  tool: NeuroLinkMCPTool,
  serverId: string,
): Tool {
  // Create basic JSON Schema for AI SDK
  const parameters = {
    type: "object" as const,
    properties: {} as Record<string, unknown>,
    required: [] as string[],
  };

  // If we have an input schema, try to extract basic information
  if (tool.inputSchema) {
    try {
      // For now, create a simple schema that accepts any object
      // This could be enhanced with proper Zod-to-JSON-Schema conversion
      parameters.properties = {
        // Generic parameter support
        data: {
          type: "object",
          description: "Tool parameters",
        },
      };
    } catch (error) {
      mcpLogger.warn(
        `[Function-Calling] Failed to convert schema for tool ${tool.name}:`,
        error,
      );
    }
  }

  return {
    description: tool.description,
    parameters,
    execute: async (args: Record<string, unknown>) => {
      // This will be handled by the AI SDK's function calling mechanism
      // We'll implement the actual execution in the provider level
      mcpLogger.debug(
        `[Function-Calling] AI SDK tool executed: ${serverId}.${tool.name}`,
        args,
      );
      return {
        success: true,
        message: "Tool execution handled by MCP integration",
      };
    },
  };
}

/**
 * Get all available MCP tools as AI SDK function definitions
 */
export async function getAvailableFunctionTools(): Promise<{
  tools: Tool[];
  toolMap: Map<string, { serverId: string; toolName: string }>;
}> {
  const functionTag = "getAvailableFunctionTools";
  const tools: Tool[] = [];
  const toolMap = new Map<string, { serverId: string; toolName: string }>();

  try {
    // Add overall timeout for the entire function
    const overallTimeoutMs = process.env.NODE_ENV === "test" ? 30000 : 15000; // 30s for tests, 15s for production
    let overallTimeoutId: NodeJS.Timeout | undefined;

    const overallTimeoutPromise = new Promise<never>((_, reject) => {
      overallTimeoutId = setTimeout(() => {
        mcpLogger.warn(
          `[${functionTag}] Overall timeout reached, returning empty tools`,
        );
        reject(new Error("getAvailableFunctionTools overall timeout"));
      }, overallTimeoutMs);
      // CRITICAL FIX: Unref timeout to prevent event loop hanging
      overallTimeoutId.unref();
    });

    const toolsLoadingPromise = (async () => {
      try {
        // Ensure NeuroLink MCP is initialized first
        const { initializeNeuroLinkMCP } = await import("./initialize.js");
        await initializeNeuroLinkMCP();

        // Ensure unified registry is initialized
        await unifiedRegistry.initialize();

        // Try to activate important servers like filesystem
        mcpLogger.debug(
          `[${functionTag}] Attempting to activate important servers...`,
        );

        try {
          // Get auto-discovered servers
          const autoServers = unifiedRegistry.getAutoDiscoveredServers();

          // Try to activate filesystem server specifically
          for (const server of autoServers) {
            if (server.metadata.name.includes("filesystem")) {
              mcpLogger.debug(
                `[${functionTag}] Activating filesystem server: ${server.metadata.name}`,
              );
              const serverName = server.metadata.name;
              if (typeof serverName === "string" && serverName.length > 0) {
                // @ts-ignore - serverName is verified as string with length > 0 above
                await unifiedRegistry.lazyActivateServer(serverName);
              }
            }
          }
        } catch (error) {
          mcpLogger.debug(
            `[${functionTag}] Error activating servers: ${error}`,
          );
        }

        // Get all tools from unified registry directly
        const allTools = await unifiedRegistry.listAllTools();
        mcpLogger.debug(
          `[${functionTag}] Found ${allTools.length} total tools`,
        );

        // Try to activate servers that have "-tools" entries to get real tools
        const serversToActivate = allTools
          .filter(
            (tool) =>
              tool.name.endsWith("-tools") || tool.name.includes("placeholder"),
          )
          .map((tool) => tool.server);

        mcpLogger.debug(
          `[${functionTag}] Attempting to activate ${serversToActivate.length} servers for real tool discovery`,
        );

        // Activate servers to convert placeholders to real tools
        for (const serverId of [...new Set(serversToActivate)].filter(
          (id): id is string => typeof id === "string" && id !== "unknown",
        )) {
          try {
            mcpLogger.debug(`[${functionTag}] Activating server: ${serverId}`);

            // Get the server entry from auto-discovered or manual servers
            const autoServers = unifiedRegistry.getAutoDiscoveredServers();
            const manualServers = unifiedRegistry.getManualServers();

            const serverEntry =
              autoServers.find((s) => s.metadata.name === serverId) ||
              manualServers.get(serverId);

            if (serverEntry && serverId.length > 0) {
              await unifiedRegistry.lazyActivateServer(serverId);
            } else {
              mcpLogger.debug(
                `[${functionTag}] Server entry not found for: ${serverId || "undefined"}`,
              );
            }
          } catch (error) {
            mcpLogger.debug(
              `[${functionTag}] Failed to activate server ${serverId}:`,
              error,
            );
          }
        }

        // Get tools again after activation
        const activatedTools = await unifiedRegistry.listAllTools();
        mcpLogger.debug(
          `[${functionTag}] Found ${activatedTools.length} total tools after activation`,
        );

        // Filter to get real, individual tools (not placeholder or grouped tools)
        const realTools = activatedTools.filter((toolInfo) => {
          // Skip placeholder tools that weren't activated
          if (
            toolInfo.name.includes("placeholder") &&
            toolInfo.isImplemented === false
          ) {
            return false;
          }

          // Skip grouped "-tools" entries unless they're the only ones available
          if (toolInfo.name.endsWith("-tools")) {
            // Check if we have individual tools from the same server
            const serverTools = activatedTools.filter(
              (t) =>
                t.server === toolInfo.server &&
                !t.name.endsWith("-tools") &&
                !t.name.includes("placeholder"),
            );
            // If we have individual tools, skip the grouped entry
            if (serverTools.length > 0) {
              return false;
            }
            // Otherwise, include the grouped tool (better than nothing)
          }

          // Include all other real tools
          return true;
        });

        mcpLogger.debug(
          `[${functionTag}] Filtered to ${realTools.length} real tools from ${activatedTools.length} total`,
        );

        // Process tools and create function definitions
        for (const toolInfo of realTools) {
          try {
            // Check if tool name already includes server info (e.g., from unified registry)
            let functionName: string;
            let originalFunctionName: string;

            // Convert server name to underscore format to check if it's embedded in tool name
            const serverName =
              typeof toolInfo.serverId === "string"
                ? toolInfo.serverId
                : "unknown";
            const sanitizedServerCheck = serverName.replace(
              /[^a-zA-Z0-9_]/g,
              "_",
            );

            if (
              toolInfo.name.includes(sanitizedServerCheck) ||
              toolInfo.name.endsWith("-tools") ||
              toolInfo.name.startsWith("github_com_") ||
              toolInfo.name.length > 50
            ) {
              // Tool name already includes server info, sanitize and shorten it
              let sanitized = toolInfo.name.replace(/[^a-zA-Z0-9_]/g, "_");

              // Shorten long MCP server names
              if (
                sanitized.startsWith(
                  "github_com_modelcontextprotocol_servers_tree_main_src_",
                )
              ) {
                // Replace the long prefix with just 'mcp_'
                sanitized =
                  "mcp_" +
                  sanitized.substring(
                    "github_com_modelcontextprotocol_servers_tree_main_src_"
                      .length,
                  );
                mcpLogger.debug(
                  `[${functionTag}] Shortened MCP name: ${toolInfo.name} -> ${sanitized}`,
                );
              } else if (
                sanitized.startsWith("github_com_") &&
                sanitized.length > 64
              ) {
                // Shorten other github paths
                const parts = sanitized.split("_");
                // Keep only the meaningful parts (skip github_com)
                sanitized = parts.slice(2).join("_");
                mcpLogger.debug(
                  `[${functionTag}] Shortened github name: ${toolInfo.name} -> ${sanitized}`,
                );
              }

              // If still too long, truncate intelligently
              if (sanitized.length > 64) {
                // Keep the ending part which usually has the actual tool name
                sanitized = sanitized.substring(sanitized.length - 63);
              }

              // Ensure it starts with a letter or underscore (Google AI requirement)
              if (!/^[a-zA-Z_]/.test(sanitized)) {
                sanitized = "_" + sanitized;
              }

              // Final length check after adding prefix
              if (sanitized.length > 64) {
                // For filesystem tools, create a shorter name
                if (sanitized.includes("filesystem")) {
                  const toolPart = sanitized.split("_").pop() || "tool";
                  sanitized = "fs_" + toolPart;
                } else {
                  // Generic truncation from the beginning, keeping the end
                  sanitized = "_" + sanitized.substring(sanitized.length - 63);
                }
              }

              functionName = sanitized;
              originalFunctionName = toolInfo.name;
            } else {
              // Tool name doesn't include server info, create compound name
              const serverName =
                typeof toolInfo.serverId === "string"
                  ? toolInfo.serverId
                  : "unknown";
              const sanitizedServerName = serverName.replace(
                /[^a-zA-Z0-9_]/g,
                "_",
              );
              const sanitizedToolName = toolInfo.name.replace(
                /[^a-zA-Z0-9_]/g,
                "_",
              );

              // Check if it's a filesystem tool from MCP
              if (
                sanitizedServerName.includes("modelcontextprotocol") &&
                sanitizedServerName.includes("filesystem")
              ) {
                functionName = `mcp_${sanitizedToolName}`;
              } else if (sanitizedServerName.length > 40) {
                // For other long server names, use a shortened version
                const serverParts = sanitizedServerName.split("_");
                const shortServer =
                  serverParts.length > 2
                    ? serverParts.slice(-2).join("_")
                    : sanitizedServerName.substring(0, 20);
                functionName = `${shortServer}_${sanitizedToolName}`;
              } else {
                functionName = `${sanitizedServerName}_${sanitizedToolName}`;
              }

              // Ensure it starts with a letter or underscore
              if (!/^[a-zA-Z_]/.test(functionName)) {
                functionName = "_" + functionName;
              }

              // Final length check
              if (functionName.length > 64) {
                // Create a very short version
                functionName = `tool_${sanitizedToolName}`;
                if (functionName.length > 64) {
                  functionName = sanitizedToolName.substring(0, 63);
                  if (!/^[a-zA-Z_]/.test(functionName)) {
                    functionName = "_" + functionName.substring(1);
                  }
                }
              }

              originalFunctionName = `${toolInfo.server || "unknown"}.${toolInfo.name}`;
            }

            // Create AI SDK tool using the proper tool() helper
            const aiTool = tool({
              description:
                toolInfo.description || `Tool from ${toolInfo.server}`,
              parameters: z.object({
                // Create a generic parameter schema for all MCP tools
                input: z
                  .unknown()
                  .optional()
                  .describe("Input parameters for the tool"),
              }),
              execute: async ({ input }: { input?: unknown }) => {
                mcpLogger.debug(
                  `[Function-Calling] AI SDK tool executed: ${functionName}`,
                  { input },
                );

                try {
                  // Execute the actual MCP tool
                  const result = await executeFunctionCall(
                    functionName,
                    (input as Record<string, unknown>) || {},
                  );

                  if (result.success) {
                    return (
                      result.data || {
                        success: true,
                        message: "Tool executed successfully",
                      }
                    );
                  } else {
                    return { error: result.error || "Tool execution failed" };
                  }
                } catch (error) {
                  mcpLogger.error(
                    `[Function-Calling] Tool execution error: ${functionName}`,
                    error,
                  );
                  return {
                    error:
                      error instanceof Error ? error.message : String(error),
                  };
                }
              },
            });

            tools.push(aiTool);

            // Store mapping for execution - CRITICAL: Use sanitized functionName as key
            toolMap.set(functionName, {
              serverId:
                typeof toolInfo.serverId === "string"
                  ? toolInfo.serverId
                  : "unknown",
              toolName: toolInfo.name,
            });

            mcpLogger.debug(
              `[${functionTag}] Converted tool: ${functionName} (original: ${originalFunctionName})`,
            );
          } catch (error) {
            mcpLogger.warn(
              `[${functionTag}] Failed to convert tool ${toolInfo.name}:`,
              error,
            );
          }
        }

        mcpLogger.debug(
          `[${functionTag}] Converted ${tools.length} tools for function calling`,
        );

        // Log the tool names for debugging
        const toolNames = Array.from(toolMap.keys());
        mcpLogger.debug(`[${functionTag}] Tool names:`, toolNames);
        mcpLogger.debug(
          `[${functionTag}] First 5 tool names:`,
          toolNames.slice(0, 5),
        );

        if (overallTimeoutId) {
          clearTimeout(overallTimeoutId);
        }
        return { tools, toolMap };
      } catch (error) {
        if (overallTimeoutId) {
          clearTimeout(overallTimeoutId);
        }
        throw error;
      }
    })();

    return await Promise.race([toolsLoadingPromise, overallTimeoutPromise]);
  } catch (error) {
    mcpLogger.error(`[${functionTag}] Error getting function tools:`, error);
    return { tools: [], toolMap: new Map() };
  }
}

/**
 * Execute MCP tool from AI function call
 */
export async function executeFunctionCall(
  functionName: string,
  parameters: Record<string, unknown>,
  context?: NeuroLinkExecutionContext,
): Promise<ToolResult> {
  const functionTag = "executeFunctionCall";

  try {
    // CRITICAL FIX: Unwrap 'input' parameter if it exists
    // AI function calling wraps parameters in { input: { actualParams } }
    // but MCP tools expect direct parameters
    let actualParameters = parameters;
    if (
      parameters.input &&
      typeof parameters.input === "object" &&
      parameters.input !== null
    ) {
      actualParameters = parameters.input as Record<string, unknown>;
      mcpLogger.debug(
        `[${functionTag}] Unwrapped input parameter for ${functionName}`,
        { original: parameters, unwrapped: actualParameters },
      );
    }

    mcpLogger.debug(
      `[${functionTag}] Executing function call: ${functionName}`,
      { parameters: actualParameters },
    );

    // Create context if not provided
    let finalContext = context;
    if (!finalContext) {
      finalContext = createExecutionContext({
        sessionId: `function-call-${Date.now()}`,
        userId: "ai-function-caller",
        aiProvider: "function-calling",
      });
    }

    // Parse server and tool name from function name
    // First try underscore format (sanitized), then fallback to dot format
    let parts = functionName.split("_");
    let serverId: string = "unknown";
    let toolName: string = functionName;

    if (parts.length >= 2) {
      // Handle underscore format (sanitized names)
      const firstPart = parts[0];
      if (firstPart && typeof firstPart === "string" && firstPart.length > 0) {
        serverId = firstPart as string;
      } else {
        serverId = "unknown";
      }
      toolName = parts.slice(1).join("_"); // Rejoin in case tool name had underscores
    } else {
      // Fallback to dot format for backward compatibility
      parts = functionName.split(".");
      if (parts.length === 2) {
        const parsedServerId = parts[0];
        const parsedToolName = parts[1];
        if (parsedServerId && parsedToolName) {
          serverId = parsedServerId;
          toolName = parsedToolName;
        }
      } else {
        // Can't parse - try executing as-is through unified registry
        mcpLogger.debug(
          `[${functionTag}] Cannot parse function name format: ${functionName}, trying unified registry`,
        );
        const result = await unifiedRegistry.executeTool(
          functionName,
          actualParameters,
          finalContext,
        );
        return result as ToolResult;
      }
    }

    // Handle built-in NeuroLink servers directly
    if (
      serverId === "neurolink-utility" ||
      serverId === "neurolink-ai-core" ||
      serverId === "neurolink_utility" ||
      serverId === "neurolink_ai_core"
    ) {
      mcpLogger.debug(
        `[${functionTag}] Executing built-in tool: ${toolName} from ${serverId}`,
      );

      // Import and execute from default registry
      const { defaultToolRegistry } = await import("./tool-registry.js");
      return await defaultToolRegistry.executeTool(
        toolName,
        actualParameters,
        finalContext,
      );
    }

    // Handle filesystem server with special activation logic
    if (serverId === "filesystem") {
      mcpLogger.debug(
        `[${functionTag}] Executing filesystem tool: ${toolName}`,
      );

      try {
        // First, try to execute through unified registry
        const result = await unifiedRegistry.executeTool(
          functionName,
          actualParameters,
          finalContext,
        );
        if ((result as ToolResult).success) {
          return result as ToolResult;
        }
      } catch {
        mcpLogger.debug(
          `[${functionTag}] Unified registry execution failed for ${functionName}, trying fallback`,
        );
      }

      // Fallback: Try to trigger activation and retry
      try {
        // Force activation by attempting to activate the filesystem server directly
        // This should convert placeholders to real tools
        await unifiedRegistry.initialize();

        // Try a few common activation patterns
        const activationAttempts = [
          `${serverId}.list_directory`,
          `${serverId}.${toolName}`,
          toolName,
        ];

        for (const attempt of activationAttempts) {
          try {
            const result = await unifiedRegistry.executeTool(
              attempt,
              actualParameters,
              finalContext,
            );
            if ((result as ToolResult).success) {
              mcpLogger.debug(
                `[${functionTag}] Filesystem tool executed successfully with: ${attempt}`,
              );
              return result as ToolResult;
            }
          } catch {
            // Continue to next attempt
          }
        }

        // If all attempts fail, return a helpful error
        return {
          success: false,
          error: `Filesystem tool '${toolName}' could not be activated. Available parameters: ${JSON.stringify(actualParameters)}`,
          metadata: {
            functionName,
            timestamp: Date.now(),
            source: "function-calling-filesystem-fallback",
          },
        };
      } catch (fallbackError) {
        mcpLogger.error(
          `[${functionTag}] Filesystem fallback failed:`,
          fallbackError,
        );
        return {
          success: false,
          error: `Filesystem tool execution failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
          metadata: {
            functionName,
            timestamp: Date.now(),
            source: "function-calling-filesystem-fallback",
          },
        };
      }
    }

    // For other tools, use unified registry
    mcpLogger.debug(
      `[${functionTag}] Executing through unified registry: ${functionName}`,
    );
    const result = await unifiedRegistry.executeTool(
      functionName,
      actualParameters,
      finalContext,
    );

    mcpLogger.debug(
      `[${functionTag}] Function call completed: ${functionName}`,
      {
        success: (result as ToolResult).success,
        hasData: !!(result as ToolResult).data,
      },
    );

    return result as ToolResult;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    mcpLogger.error(`[${functionTag}] Function call failed: ${functionName}`, {
      error: errorMessage,
    });

    return {
      success: false,
      error: errorMessage,
      metadata: {
        functionName,
        timestamp: Date.now(),
        source: "function-calling-integration",
      },
    };
  }
}

/**
 * Handle multiple function calls and format results for AI
 */
export async function handleFunctionCalls(
  functionCalls: Array<{
    name: string;
    parameters: Record<string, unknown>;
    id?: string;
  }>,
  context?: NeuroLinkExecutionContext,
): Promise<Array<{ id?: string; result: ToolResult; formattedForAI: string }>> {
  const functionTag = "handleFunctionCalls";
  const results = [];

  mcpLogger.debug(
    `[${functionTag}] Handling ${functionCalls.length} function calls`,
  );

  for (const call of functionCalls) {
    const result = await executeFunctionCall(
      call.name,
      call.parameters,
      context,
    );

    // Format result for AI consumption
    let formattedForAI = "";
    if (result.success) {
      if (typeof result.data === "string") {
        formattedForAI = result.data;
      } else if (result.data) {
        formattedForAI = JSON.stringify(result.data, null, 2);
      } else {
        formattedForAI = "Function executed successfully (no data returned)";
      }
    } else {
      formattedForAI = `Error: ${result.error || "Function execution failed"}`;
    }

    results.push({
      id: call.id,
      result,
      formattedForAI,
    });
  }

  return results;
}

/**
 * Create a subset of tools for specific categories or capabilities
 */
export async function getFunctionToolsForCategory(
  category?: string,
  maxTools?: number,
): Promise<{
  tools: Tool[];
  toolMap: Map<string, { serverId: string; toolName: string }>;
}> {
  const { tools, toolMap } = await getAvailableFunctionTools();

  if (!category) {
    return maxTools
      ? {
          tools: tools.slice(0, maxTools),
          toolMap,
        }
      : { tools, toolMap };
  }

  // Filter by category (simplified - just include all for now)
  const filteredTools = tools;

  return maxTools
    ? {
        tools: filteredTools.slice(0, maxTools),
        toolMap,
      }
    : { tools: filteredTools, toolMap };
}

/**
 * Check if function calling is available
 */
export async function isFunctionCallingAvailable(): Promise<boolean> {
  try {
    const { tools } = await getAvailableFunctionTools();
    return tools.length > 0;
  } catch (error) {
    mcpLogger.warn(
      "[isFunctionCallingAvailable] Failed to check availability:",
      error,
    );
    return false;
  }
}
