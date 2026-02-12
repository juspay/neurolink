/**
 * Tools Manager Module
 *
 * Handles all tool registration, discovery, and execution for AI providers.
 * Extracted from BaseProvider to follow Single Responsibility Principle.
 *
 * Responsibilities:
 * - Tool registration (direct, custom, MCP, external MCP)
 * - Tool discovery and aggregation
 * - Tool creation from definitions and schemas
 * - Tool executor setup
 * - Session context management for MCP tools
 * - Event emission wrapping for tool execution
 *
 * @module core/modules/ToolsManager
 */

import type { Tool } from "ai";
import { tool as createAISDKTool, jsonSchema } from "ai";
import { z } from "zod";
import type { AIProviderName, StandardRecord } from "../../types/index.js";
import type { ToolArgs } from "../../types/tools.js";
import type { JsonObject } from "../../types/common.js";
import { logger } from "../../utils/logger.js";
import {
  getKeysAsString,
  getKeyCount,
} from "../../utils/transformationUtils.js";
import { convertJsonSchemaToZod } from "../../utils/schemaConversion.js";
import type { NeuroLink } from "../../neurolink.js";

/**
 * Utility functions interface for ToolsManager
 */
export type ToolUtilities = {
  isZodSchema?: (schema: unknown) => boolean;
  convertToolResult?: (result: unknown) => Promise<unknown>;
  createPermissiveZodSchema?: () => z.ZodSchema;
  fixSchemaForOpenAIStrictMode?: (
    schema: Record<string, unknown>,
  ) => Record<string, unknown>;
};

/**
 * ToolsManager class - Handles all tool management operations
 */
export class ToolsManager {
  // Tool storage
  protected mcpTools?: Record<string, Tool>;
  protected customTools?: Map<string, unknown>;
  protected toolExecutor?: (
    toolName: string,
    params: unknown,
  ) => Promise<unknown>;

  // Session context
  protected sessionId?: string;
  protected userId?: string;

  constructor(
    private readonly providerName: AIProviderName,
    private readonly directTools: Record<string, unknown>,
    private readonly neurolink?: NeuroLink,
    private readonly utilities?: ToolUtilities,
  ) {
    this.mcpTools = {};
  }

  /**
   * Set session context for MCP tools
   */
  setSessionContext(sessionId?: string, userId?: string): void {
    this.sessionId = sessionId;
    this.userId = userId;
  }

  /**
   * Set up tool executor for a provider to enable actual tool execution
   * @param sdk - The NeuroLinkSDK instance for tool execution
   * @param functionTag - Function name for logging
   */
  setupToolExecutor(
    sdk: {
      customTools: Map<string, unknown>;
      executeTool: (toolName: string, params: unknown) => Promise<unknown>;
    },
    functionTag: string,
  ): void {
    // Store custom tools for use in getAllTools()
    this.customTools = sdk.customTools;
    this.toolExecutor = sdk.executeTool;

    logger.debug(`[${functionTag}] Setting up tool executor for provider`, {
      providerName: this.providerName,
      availableCustomTools: sdk.customTools.size,
      customToolsStored: !!this.customTools,
      toolExecutorStored: !!this.toolExecutor,
    });

    // Note: Tool execution will be handled through getAllTools() -> AI SDK tools
    // The custom tools are converted to AI SDK format in getAllTools() method
  }

  /**
   * Get all available tools - direct tools are ALWAYS available
   * MCP tools are added when available (without blocking)
   */
  async getAllTools(): Promise<Record<string, Tool>> {
    // Start with wrapped direct tools that emit events
    const tools: Record<string, Tool> = {};

    // Wrap direct tools with event emission
    await this.processDirectTools(tools);

    logger.debug(`[ToolsManager] getAllTools called for ${this.providerName}`, {
      neurolinkAvailable: !!this.neurolink,
      neurolinkType: typeof this.neurolink,
      directToolsCount: getKeyCount(this.directTools),
    });
    logger.debug(
      `[ToolsManager] Direct tools: ${getKeysAsString(this.directTools)}`,
    );

    // Process all tool types using dedicated helper methods
    await this.processCustomTools(tools);
    await this.processExternalMCPTools(tools);
    await this.processMCPTools(tools);

    logger.debug(
      `[ToolsManager] getAllTools returning tools: ${getKeysAsString(tools)}`,
    );

    return tools;
  }

  /**
   * Get direct tools (built-in agent tools)
   */
  getDirectTools(): Record<string, unknown> {
    return this.directTools;
  }

  /**
   * Get MCP tools
   */
  getMCPTools(): Record<string, Tool> | undefined {
    return this.mcpTools;
  }

  /**
   * Get custom tools
   */
  getCustomTools(): Map<string, unknown> | undefined {
    return this.customTools;
  }

  /**
   * Process direct tools with event emission wrapping
   */
  private async processDirectTools(tools: Record<string, Tool>): Promise<void> {
    if (!this.directTools || Object.keys(this.directTools).length === 0) {
      return;
    }

    logger.debug(
      `Loading ${Object.keys(this.directTools).length} direct tools with event emission`,
    );

    for (const [toolName, directTool] of Object.entries(this.directTools)) {
      logger.debug(`Processing direct tool: ${toolName}`, {
        toolName,
        hasExecute:
          directTool &&
          typeof directTool === "object" &&
          "execute" in directTool,
        hasDescription:
          directTool &&
          typeof directTool === "object" &&
          "description" in directTool,
      });

      // Wrap the direct tool's execute function with event emission
      if (
        directTool &&
        typeof directTool === "object" &&
        "execute" in directTool
      ) {
        const originalExecute = (
          directTool as { execute: (params: unknown) => Promise<unknown> }
        ).execute;

        // Create a new tool with wrapped execute function
        tools[toolName] = {
          ...(directTool as Tool),
          execute: async (params: unknown) => {
            // 🔧 EMIT TOOL START EVENT - Bedrock-compatible format
            if (this.neurolink?.getEventEmitter) {
              const emitter = this.neurolink.getEventEmitter();
              emitter.emit("tool:start", { tool: toolName, input: params });
              logger.debug(`Direct tool:start event emitted for ${toolName}`, {
                toolName,
                input: params,
                hasEmitter: !!emitter,
              });
            }

            try {
              const result = await originalExecute(params);

              // 🔧 EMIT TOOL END EVENT - Bedrock-compatible format
              if (this.neurolink?.getEventEmitter) {
                const emitter = this.neurolink.getEventEmitter();
                emitter.emit("tool:end", { tool: toolName, result });
                logger.debug(`Direct tool:end event emitted for ${toolName}`, {
                  toolName,
                  result:
                    typeof result === "string"
                      ? result.substring(0, 100)
                      : JSON.stringify(result).substring(0, 100),
                  hasEmitter: !!emitter,
                });
              }

              return result;
            } catch (error) {
              // 🔧 EMIT TOOL END EVENT FOR ERROR - Bedrock-compatible format
              if (this.neurolink?.getEventEmitter) {
                const emitter = this.neurolink.getEventEmitter();
                const errorMsg =
                  error instanceof Error ? error.message : String(error);
                emitter.emit("tool:end", { tool: toolName, error: errorMsg });
                logger.debug(
                  `Direct tool:end error event emitted for ${toolName}`,
                  {
                    toolName,
                    error: errorMsg,
                    hasEmitter: !!emitter,
                  },
                );
              }
              throw error;
            }
          },
        } as Tool;
      } else {
        // Fallback: include tool as-is if it doesn't have execute function
        tools[toolName] = directTool as Tool;
      }
    }

    logger.debug(`Direct tools processing complete`, {
      directToolsProcessed: Object.keys(this.directTools).length,
    });
  }

  /**
   * Process custom tools from setupToolExecutor
   */
  private async processCustomTools(tools: Record<string, Tool>): Promise<void> {
    if (!this.customTools || this.customTools.size === 0) {
      return;
    }

    logger.debug(
      `[ToolsManager] Loading ${this.customTools.size} custom tools from setupToolExecutor`,
    );

    for (const [toolName, toolDef] of this.customTools.entries()) {
      logger.debug(`Processing custom tool: ${toolName}`, {
        toolDef: typeof toolDef,
        hasExecute:
          toolDef && typeof toolDef === "object" && "execute" in toolDef,
        hasName: toolDef && typeof toolDef === "object" && "name" in toolDef,
      });

      // Validate tool definition has required execute function
      const toolInfo =
        (toolDef as Record<string, unknown> | undefined) ||
        ({} as Record<string, unknown>);
      if (toolInfo && typeof toolInfo.execute === "function") {
        const tool = await this.createCustomToolFromDefinition(
          toolName,
          toolInfo as {
            execute: (params: ToolArgs) => Promise<unknown>;
            description?: string;
            parameters?: unknown;
            inputSchema?: unknown; // Support MCPExecutableTool format
          },
        );
        if (tool && !tools[toolName]) {
          tools[toolName] = tool;
        }
      }
    }

    logger.debug(`[ToolsManager] Custom tools processing complete`, {
      customToolsProcessed: this.customTools.size,
    });
  }

  /**
   * Process MCP tools integration
   */
  private async processMCPTools(tools: Record<string, Tool>): Promise<void> {
    // MCP tools loading simplified - removed functionCalling dependency
    if (!this.mcpTools) {
      // Set empty tools object - MCP tools are handled at a higher level
      this.mcpTools = {};
    }

    // Add MCP tools if available, but don't overwrite existing direct tools
    // Direct tools (Zod-based) take precedence over MCP tools (JSON Schema)
    if (this.mcpTools) {
      for (const [name, tool] of Object.entries(this.mcpTools)) {
        if (!tools[name]) {
          tools[name] = tool;
        }
      }
    }
  }

  /**
   * Process external MCP tools
   */
  private async processExternalMCPTools(
    tools: Record<string, Tool>,
  ): Promise<void> {
    if (
      !this.neurolink ||
      typeof this.neurolink.getExternalMCPTools !== "function"
    ) {
      logger.debug(`[ToolsManager] No external MCP tool interface available`, {
        hasNeuroLink: !!this.neurolink,
        hasGetExternalMCPTools:
          this.neurolink &&
          typeof this.neurolink.getExternalMCPTools === "function",
      });
      return;
    }

    try {
      logger.debug(
        `[ToolsManager] Loading external MCP tools for ${this.providerName}`,
      );

      const externalTools = await this.neurolink.getExternalMCPTools();
      logger.debug(
        `[ToolsManager] Found ${externalTools.length} external MCP tools`,
      );

      for (const tool of externalTools) {
        const mcpTool = await this.createExternalMCPTool(tool);
        if (mcpTool && !tools[tool.name]) {
          tools[tool.name] = mcpTool;
          logger.debug(
            `[ToolsManager] Successfully added external MCP tool: ${tool.name}`,
          );
        }
      }

      logger.debug(`[ToolsManager] External MCP tools loading complete`, {
        totalToolsAdded: externalTools.length,
      });
    } catch (error) {
      logger.error(
        `[ToolsManager] Failed to load external MCP tools for ${this.providerName}:`,
        error,
      );
      // Not an error - external tools are optional
    }
  }

  /**
   * Create a custom tool from tool definition
   */
  private async createCustomToolFromDefinition(
    toolName: string,
    toolInfo: {
      execute: (params: ToolArgs) => Promise<unknown>;
      description?: string;
      parameters?: unknown;
      inputSchema?: unknown;
    },
  ): Promise<Tool | null> {
    try {
      logger.debug(`[ToolsManager] Converting custom tool: ${toolName}`);

      let finalSchema: z.ZodSchema | ReturnType<typeof jsonSchema>;
      let originalInputSchema: Record<string, unknown> | undefined;

      // Prioritize parameters (Zod), then inputSchema (Zod or JSON Schema)
      if (
        toolInfo.parameters &&
        this.utilities?.isZodSchema?.(toolInfo.parameters)
      ) {
        finalSchema = toolInfo.parameters as z.ZodSchema;
      } else if (
        toolInfo.inputSchema &&
        this.utilities?.isZodSchema?.(toolInfo.inputSchema)
      ) {
        finalSchema = toolInfo.inputSchema as z.ZodSchema;
      } else if (
        toolInfo.inputSchema &&
        typeof toolInfo.inputSchema === "object"
      ) {
        // Use original JSON Schema with jsonSchema() wrapper - NO CONVERSION!
        originalInputSchema = toolInfo.inputSchema as Record<string, unknown>;
        finalSchema = jsonSchema(originalInputSchema);
      } else if (
        toolInfo.parameters &&
        typeof toolInfo.parameters === "object"
      ) {
        finalSchema = convertJsonSchemaToZod(
          toolInfo.parameters as Record<string, unknown>,
        );
      } else {
        finalSchema = z.object({});
      }

      return createAISDKTool({
        description: toolInfo.description || `Tool ${toolName}`,
        parameters: finalSchema,
        execute: async (params) => {
          const startTime = Date.now();
          let executionId: string | undefined;

          if (this.neurolink?.emitToolStart) {
            executionId = this.neurolink.emitToolStart(
              toolName,
              params,
              startTime,
            );
            logger.debug(
              `Custom tool:start emitted via NeuroLink for ${toolName}`,
              {
                toolName,
                executionId,
                input: params,
                hasNativeEmission: true,
              },
            );
          }

          try {
            // 🔧 PARAMETER FLOW TRACING - Before NeuroLink executeTool call
            logger.debug(
              `About to call NeuroLink executeTool for ${toolName}`,
              {
                toolName,
                paramsBeforeExecution: {
                  type: typeof params,
                  isNull: params === null,
                  isUndefined: params === undefined,
                  isEmpty:
                    params &&
                    typeof params === "object" &&
                    Object.keys(params as object).length === 0,
                  keys:
                    params && typeof params === "object"
                      ? Object.keys(params as object)
                      : "NOT_OBJECT",
                  keysLength:
                    params && typeof params === "object"
                      ? Object.keys(params as object).length
                      : 0,
                },
                executorInfo: {
                  hasExecutor: typeof toolInfo.execute === "function",
                  executorType: typeof toolInfo.execute,
                },
                timestamp: Date.now(),
                phase: "BEFORE_NEUROLINK_EXECUTE",
              },
            );

            const result = await toolInfo.execute(params as ToolArgs);

            // 🔧 PARAMETER FLOW TRACING - After NeuroLink executeTool call
            logger.debug(`NeuroLink executeTool completed for ${toolName}`, {
              toolName,
              resultInfo: {
                type: typeof result,
                isNull: result === null,
                isUndefined: result === undefined,
                hasError:
                  result && typeof result === "object" && "error" in result,
              },
              timestamp: Date.now(),
              phase: "AFTER_NEUROLINK_EXECUTE",
            });

            const convertedResult = this.utilities?.convertToolResult
              ? await this.utilities.convertToolResult(result)
              : result;
            const endTime = Date.now();

            let errorResult: string | undefined = undefined;

            if (
              convertedResult &&
              typeof convertedResult === "object" &&
              "isError" in convertedResult &&
              convertedResult.isError
            ) {
              try {
                errorResult = JSON.stringify(convertedResult);
              } catch (error) {
                logger.error(
                  `Failed to serialize error result for ${toolName}`,
                  error,
                );
              }
            }

            // 🔧 NATIVE NEUROLINK EVENT EMISSION - Tool End (Success or Handled Error)
            if (this.neurolink?.emitToolEnd) {
              this.neurolink.emitToolEnd(
                toolName,
                convertedResult,
                errorResult,
                startTime,
                endTime,
                executionId,
              );
              logger.debug(
                `Custom tool:end emitted via NeuroLink for ${toolName}`,
                {
                  toolName,
                  executionId,
                  duration: endTime - startTime,
                  hasResult: convertedResult !== undefined,
                  hasNativeEmission: true,
                },
              );
            }

            return convertedResult;
          } catch (error) {
            const endTime = Date.now();
            const errorMsg =
              error instanceof Error ? error.message : String(error);

            // 🔧 NATIVE NEUROLINK EVENT EMISSION - Tool End (Error)
            if (this.neurolink?.emitToolEnd) {
              this.neurolink.emitToolEnd(
                toolName,
                undefined, // no result
                errorMsg,
                startTime,
                endTime,
                executionId,
              );
              logger.info(
                `Custom tool:end error emitted via NeuroLink for ${toolName}`,
                {
                  toolName,
                  executionId,
                  duration: endTime - startTime,
                  error: errorMsg,
                  hasNativeEmission: true,
                },
              );
            }
            throw error;
          }
        },
      });
    } catch (toolCreationError) {
      logger.error(`Failed to create tool: ${toolName}`, toolCreationError);
      return null;
    }
  }

  /**
   * Create an external MCP tool
   */
  private async createExternalMCPTool(tool: {
    name: string;
    description?: string;
    inputSchema?: StandardRecord;
    serverId?: string;
  }): Promise<Tool | null> {
    try {
      logger.debug(`[ToolsManager] Converting external MCP tool: ${tool.name}`);

      // Use original JSON Schema from MCP tool if available, otherwise use permissive schema
      let finalSchema;
      if (tool.inputSchema && typeof tool.inputSchema === "object") {
        // Clone and fix the schema for OpenAI strict mode compatibility
        const originalSchema = tool.inputSchema as Record<string, unknown>;
        const fixedSchema = this.utilities?.fixSchemaForOpenAIStrictMode
          ? this.utilities.fixSchemaForOpenAIStrictMode(originalSchema)
          : originalSchema;
        finalSchema = jsonSchema(fixedSchema);
      } else {
        finalSchema = this.utilities?.createPermissiveZodSchema
          ? this.utilities.createPermissiveZodSchema()
          : z.object({});
      }

      return createAISDKTool({
        description: tool.description || `External MCP tool ${tool.name}`,
        parameters: finalSchema,
        execute: async (params) => {
          logger.debug(`Executing external MCP tool: ${tool.name}`, {
            toolName: tool.name,
            serverId: tool.serverId,
            params: JSON.stringify(params),
            paramsType: typeof params,
            hasNeurolink: !!this.neurolink,
            hasExecuteFunction:
              this.neurolink &&
              typeof this.neurolink.executeExternalMCPTool === "function",
            timestamp: Date.now(),
          });

          // 🔧 EMIT TOOL START EVENT - Bedrock-compatible format
          if (this.neurolink?.getEventEmitter) {
            const emitter = this.neurolink.getEventEmitter();
            emitter.emit("tool:start", { tool: tool.name, input: params });
            logger.debug(`tool:start event emitted for ${tool.name}`, {
              toolName: tool.name,
              input: params,
              hasEmitter: !!emitter,
            });
          }

          // Execute via NeuroLink's direct tool execution
          if (
            this.neurolink &&
            typeof this.neurolink.executeExternalMCPTool === "function"
          ) {
            try {
              const result = await this.neurolink.executeExternalMCPTool(
                tool.serverId || "unknown",
                tool.name,
                params as JsonObject,
              );

              // 🔧 EMIT TOOL END EVENT - Bedrock-compatible format
              if (this.neurolink?.getEventEmitter) {
                const emitter = this.neurolink.getEventEmitter();
                emitter.emit("tool:end", { tool: tool.name, result });
                logger.debug(`tool:end event emitted for ${tool.name}`, {
                  toolName: tool.name,
                  result:
                    typeof result === "string"
                      ? result.substring(0, 100)
                      : JSON.stringify(result).substring(0, 100),
                  hasEmitter: !!emitter,
                });
              }

              logger.debug(`External MCP tool executed: ${tool.name}`, {
                toolName: tool.name,
                result:
                  typeof result === "string"
                    ? result.substring(0, 200)
                    : JSON.stringify(result).substring(0, 200),
                resultType: typeof result,
                timestamp: Date.now(),
              });

              return result;
            } catch (mcpError) {
              // 🔧 EMIT TOOL END EVENT FOR ERROR - Bedrock-compatible format
              if (this.neurolink?.getEventEmitter) {
                const emitter = this.neurolink.getEventEmitter();
                const errorMsg =
                  mcpError instanceof Error
                    ? mcpError.message
                    : String(mcpError);
                emitter.emit("tool:end", { tool: tool.name, error: errorMsg });
                logger.debug(`tool:end error event emitted for ${tool.name}`, {
                  toolName: tool.name,
                  error: errorMsg,
                  hasEmitter: !!emitter,
                });
              }

              logger.error(`External MCP tool failed: ${tool.name}`, {
                toolName: tool.name,
                serverId: tool.serverId,
                error:
                  mcpError instanceof Error
                    ? mcpError.message
                    : String(mcpError),
                errorStack:
                  mcpError instanceof Error ? mcpError.stack : undefined,
                params: JSON.stringify(params),
                timestamp: Date.now(),
              });
              throw mcpError;
            }
          } else {
            const error = `Cannot execute external MCP tool: NeuroLink executeExternalMCPTool not available`;

            // 🔧 EMIT TOOL END EVENT FOR ERROR - Bedrock-compatible format
            if (this.neurolink?.getEventEmitter) {
              const emitter = this.neurolink.getEventEmitter();
              emitter.emit("tool:end", { tool: tool.name, error });
              logger.debug(`tool:end error event emitted for ${tool.name}`, {
                toolName: tool.name,
                error,
                hasEmitter: !!emitter,
              });
            }

            logger.error(`${error}`, {
              toolName: tool.name,
              hasNeurolink: !!this.neurolink,
              neurolinkType: typeof this.neurolink,
              timestamp: Date.now(),
            });
            throw new Error(error);
          }
        },
      });
    } catch (toolCreationError) {
      logger.error(
        `Failed to create external MCP tool: ${tool.name}`,
        toolCreationError,
      );
      return null;
    }
  }
}
