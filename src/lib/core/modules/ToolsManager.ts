import { z } from "zod";
import { createToolEventPayload } from "../toolEvents.js";
import type {
  AIProviderName,
  StandardRecord,
  ToolUtilities,
  ToolArgs,
  ToolEventPayload,
  JsonObject,
} from "../../types/index.js";
import { tracers, ATTR, withSpan } from "../../telemetry/index.js";
import { SpanStatusCode } from "@opentelemetry/api";
import { logger } from "../../utils/logger.js";
import { getKeyCount } from "../../utils/transformationUtils.js";
import { convertJsonSchemaToZod } from "../../utils/schemaConversion.js";
import { generateToolOutputPreview } from "../../context/toolOutputLimits.js";
import type { NeuroLink } from "../../neurolink.js";
import type { Tool } from "../../types/index.js";
import { tool as createAISDKTool, jsonSchema } from "../../utils/tool.js";

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
    options?: Record<string, unknown>,
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
   * BZ-666: Wrap tool execute with output truncation to prevent
   * context overflow when large results flow into the AI SDK accumulator.
   */
  private wrapExecuteWithTruncation(
    toolName: string,
    originalExecute: (params: unknown) => Promise<unknown>,
  ): (params: unknown) => Promise<unknown> {
    return async (params: unknown): Promise<unknown> => {
      const result = await originalExecute(params);
      return this.truncateToolResult(toolName, result);
    };
  }

  /**
   * BZ-666: Apply generateToolOutputPreview to tool results to prevent
   * context overflow when large results flow into the AI SDK accumulator.
   */
  private truncateToolResult(toolName: string, result: unknown): unknown {
    if (result === null || result === undefined) {
      return result;
    }

    // Handle string results directly
    if (typeof result === "string") {
      const { preview, truncated, originalSize } =
        generateToolOutputPreview(result);
      if (truncated) {
        logger.debug(
          `[ToolsManager] Truncated '${toolName}' string output: ${originalSize} bytes → ${Buffer.byteLength(preview, "utf-8")} bytes`,
        );
      }
      return truncated ? preview : result;
    }

    // Handle object results (e.g. readFile returns { content, ... })
    if (typeof result === "object") {
      const obj = result as Record<string, unknown>;
      let nextObj: Record<string, unknown> | null = null;

      // Truncate "content" if present and oversized
      if (typeof obj.content === "string") {
        const { preview, truncated, originalSize } = generateToolOutputPreview(
          obj.content,
        );
        if (truncated) {
          logger.debug(
            `[ToolsManager] Truncated '${toolName}' content field: ${originalSize} bytes → ${Buffer.byteLength(preview, "utf-8")} bytes`,
          );
          nextObj = { ...(nextObj ?? obj), content: preview };
        }
      }

      // Truncate "data" if present and oversized — both fields can coexist
      if (typeof obj.data === "string") {
        const { preview, truncated, originalSize } = generateToolOutputPreview(
          obj.data,
        );
        if (truncated) {
          logger.debug(
            `[ToolsManager] Truncated '${toolName}' data field: ${originalSize} bytes → ${Buffer.byteLength(preview, "utf-8")} bytes`,
          );
          nextObj = { ...(nextObj ?? obj), data: preview };
        }
      }

      if (nextObj) {
        return nextObj;
      }

      // For other objects, check if their JSON serialization is too large.
      // Use UTF-8 byte length, not string length, to match the 50KB budget.
      try {
        const jsonStr = JSON.stringify(result);
        if (Buffer.byteLength(jsonStr, "utf-8") > 51_200) {
          const { preview, truncated, originalSize } =
            generateToolOutputPreview(jsonStr);
          if (truncated) {
            logger.debug(
              `[ToolsManager] Truncated '${toolName}' JSON output: ${originalSize} bytes → ${Buffer.byteLength(preview, "utf-8")} bytes`,
            );
            // Preserve object shape so callers reading structured fields don't
            // get a type surprise. Attach the preview under a sentinel field.
            return {
              _truncated: true,
              _originalSize: originalSize,
              _preview: preview,
            };
          }
        }
      } catch {
        // JSON serialization failed — return as-is
      }
    }

    return result;
  }

  /**
   * Set session context for MCP tools
   */
  setSessionContext(sessionId?: string, userId?: string): void {
    this.sessionId = sessionId;
    this.userId = userId;
  }

  private emitToolEvent(
    eventName: "tool:start" | "tool:end",
    toolName: string,
    payload: Omit<ToolEventPayload, "tool" | "toolName">,
  ): void {
    if (this.neurolink?.getEventEmitter) {
      this.neurolink
        .getEventEmitter()
        .emit(eventName, createToolEventPayload(toolName, payload));
    }
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
    const span = tracers.sdk.startSpan("neurolink.tools.register", {
      attributes: {
        [ATTR.NL_PROVIDER]: this.providerName,
        "tools.custom_count": sdk.customTools.size,
      },
    });

    try {
      // Store custom tools for use in getAllTools()
      this.customTools = sdk.customTools;
      this.toolExecutor = sdk.executeTool.bind(sdk);

      logger.debug(`[${functionTag}] Setting up tool executor for provider`, {
        providerName: this.providerName,
        availableCustomTools: sdk.customTools.size,
        customToolsStored: !!this.customTools,
        toolExecutorStored: !!this.toolExecutor,
      });

      // Note: Tool execution will be handled through getAllTools() -> AI SDK tools
      // The custom tools are converted to AI SDK format in getAllTools() method
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      if (error instanceof Error) {
        span.recordException(error);
      }
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Get all available tools - direct tools are ALWAYS available
   * MCP tools are added when available (without blocking)
   */
  async getAllTools(): Promise<Record<string, Tool>> {
    return withSpan(
      {
        name: "neurolink.tools.getAll",
        tracer: tracers.sdk,
        attributes: {
          [ATTR.NL_PROVIDER]: this.providerName,
        },
      },
      async (span) => {
        // Start with wrapped direct tools that emit events
        const tools: Record<string, Tool> = {};

        // Wrap direct tools with event emission
        await this.processDirectTools(tools);
        const directCount = Object.keys(tools).length;
        span.setAttribute("tools.direct_count", directCount);

        logger.debug(
          `[ToolsManager] getAllTools called for ${this.providerName}`,
          {
            directToolsCount: getKeyCount(this.directTools),
          },
        );

        // Process all tool types using dedicated helper methods
        await this.processCustomTools(tools);
        const customCount = Object.keys(tools).length - directCount;
        span.setAttribute("tools.custom_count", customCount);

        await this.processExternalMCPTools(tools);
        const externalCount =
          Object.keys(tools).length - directCount - customCount;
        span.setAttribute("tools.external_mcp_count", externalCount);

        await this.processMCPTools(tools);
        const totalCount = Object.keys(tools).length;
        span.setAttribute(ATTR.NL_TOOL_COUNT, totalCount);

        // Record tool names for debugging (truncated)
        const toolNames = Object.keys(tools);
        span.setAttribute(
          "tools.names",
          toolNames.slice(0, 20).join(",") +
            (toolNames.length > 20 ? `...+${toolNames.length - 20}` : ""),
        );

        // Log a compact summary instead of full tool list
        logger.debug(
          `[ToolsManager] getAllTools complete: ${toolNames.length} tools available`,
          {
            provider: this.providerName,
            toolCount: toolNames.length,
            toolNames:
              toolNames.length <= 10
                ? toolNames
                : [
                    ...toolNames.slice(0, 10),
                    `... and ${toolNames.length - 10} more`,
                  ],
          },
        );

        return tools;
      },
    );
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
      `[ToolsManager] Loading ${Object.keys(this.directTools).length} direct tools`,
    );

    for (const [toolName, directTool] of Object.entries(this.directTools)) {
      // Wrap the direct tool's execute function with event emission
      if (
        directTool &&
        typeof directTool === "object" &&
        "execute" in directTool
      ) {
        const originalExecute = (
          directTool as { execute: (params: unknown) => Promise<unknown> }
        ).execute;

        // Create a new tool with wrapped execute function (BZ-666/BZ-664 guards applied)
        const guardedExecute = this.wrapExecuteWithTruncation(
          toolName,
          originalExecute,
        );
        tools[toolName] = {
          ...(directTool as Tool),
          execute: async (params: unknown) => {
            const startTime = Date.now();
            this.emitToolEvent("tool:start", toolName, { input: params });

            try {
              const result = await guardedExecute(params);
              this.emitToolEvent("tool:end", toolName, {
                result,
                success: true,
                responseTime: Date.now() - startTime,
              });
              return result;
            } catch (error) {
              const errorMsg =
                error instanceof Error ? error.message : String(error);
              this.emitToolEvent("tool:end", toolName, {
                error: errorMsg,
                success: false,
                responseTime: Date.now() - startTime,
              });
              throw error;
            }
          },
        } as Tool;
      } else {
        // Fallback: include tool as-is if it doesn't have execute function
        tools[toolName] = directTool as Tool;
      }
    }

    // Direct tools processing complete — count already logged at start
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
          // BZ-666/BZ-664: Wrap custom tool execute with guards
          const origExec = (
            tool as { execute?: (p: unknown) => Promise<unknown> }
          ).execute;
          if (origExec) {
            const guarded = this.wrapExecuteWithTruncation(toolName, origExec);
            (tool as Record<string, unknown>).execute = guarded;
          }
          tools[toolName] = tool;
        }
      }
    }

    // Custom tools processing complete — count already logged at start
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
      return;
    }

    try {
      const externalTools = await this.neurolink.getExternalMCPTools();

      let addedCount = 0;
      for (const tool of externalTools) {
        const mcpTool = await this.createExternalMCPTool(tool);
        if (mcpTool && !tools[tool.name]) {
          tools[tool.name] = mcpTool;
          addedCount++;
        }
      }

      logger.debug(`[ToolsManager] External MCP tools loaded`, {
        found: externalTools.length,
        added: addedCount,
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
      /** Per-tool timeout in milliseconds, set at registration time */
      timeoutMs?: number;
      /** Per-tool max retries, set at registration time */
      maxRetries?: number;
    },
  ): Promise<Tool | null> {
    try {
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

      return createAISDKTool<unknown, unknown>({
        description: toolInfo.description || `Tool ${toolName}`,
        inputSchema: finalSchema, // AI SDK v6 uses inputSchema (not parameters)
        execute: async (params: unknown) => {
          const customToolSpan = tracers.sdk.startSpan(
            "neurolink.tools.execute_custom",
            {
              attributes: {
                "tool.name": toolName,
                "tool.type": "custom",
                // Curator P1-3: pure wrapper — duplicates the AI SDK's
                // ai.toolCall observation in Langfuse. Keep the OTel span
                // for internal metrics; filter from Langfuse export.
                "langfuse.internal": true,
              },
            },
          );

          const startTime = Date.now();
          let executionId: string | undefined;

          try {
            // Route through NeuroLink.executeTool() when available for MCP enhancement support
            // (cache, middleware, annotations, circuit breaker, routing)
            if (this.toolExecutor) {
              // Per-tool timeout and retries flow through the customTools map
              // (set at registration via ToolRegistrationOptions).
              // The execute wrapper in registerTool already enforces timeouts,
              // but we also forward them to toolExecutor for MCP-level handling.
              const toolTimeoutMs = toolInfo.timeoutMs;
              const toolMaxRetries = toolInfo.maxRetries;
              const hasRegistrationOptions =
                toolTimeoutMs !== undefined || toolMaxRetries !== undefined;
              const result = await this.toolExecutor(
                toolName,
                params,
                hasRegistrationOptions
                  ? {
                      ...(toolTimeoutMs !== undefined && {
                        timeout: toolTimeoutMs,
                      }),
                      ...(toolMaxRetries !== undefined && {
                        maxRetries: toolMaxRetries,
                      }),
                    }
                  : undefined,
              );

              const convertedResult = this.utilities?.convertToolResult
                ? await this.utilities.convertToolResult(result)
                : result;
              const endTime = Date.now();

              customToolSpan.setAttribute(
                "tool.duration_ms",
                endTime - startTime,
              );

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

              customToolSpan.setAttribute(
                "tool.result.status",
                errorResult ? "error" : "success",
              );
              if (errorResult) {
                customToolSpan.setStatus({
                  code: SpanStatusCode.ERROR,
                  message: `Tool ${toolName} returned isError: true`,
                });
              } else {
                customToolSpan.setStatus({ code: SpanStatusCode.OK });
              }

              return convertedResult;
            }

            // Fallback: direct execution (standalone usage without NeuroLink SDK)
            if (this.neurolink?.emitToolStart) {
              executionId = this.neurolink.emitToolStart(
                toolName,
                params,
                startTime,
              );
            }
            const result = await toolInfo.execute(params as ToolArgs);

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

            // Emit tool end event (success or handled error)
            if (this.neurolink?.emitToolEnd) {
              this.neurolink.emitToolEnd(
                toolName,
                convertedResult,
                errorResult,
                startTime,
                endTime,
                executionId,
              );
            }

            customToolSpan.setAttribute(
              "tool.duration_ms",
              endTime - startTime,
            );
            customToolSpan.setAttribute(
              "tool.result.status",
              errorResult ? "error" : "success",
            );
            if (errorResult) {
              customToolSpan.setStatus({
                code: SpanStatusCode.ERROR,
                message: `Tool ${toolName} returned isError: true`,
              });
            } else {
              customToolSpan.setStatus({ code: SpanStatusCode.OK });
            }

            return convertedResult;
          } catch (error) {
            const endTime = Date.now();
            const errorMsg =
              error instanceof Error ? error.message : String(error);

            // Emit tool end event (error) — only for fallback path
            // When toolExecutor is used, executeTool() handles event emission
            if (!this.toolExecutor && this.neurolink?.emitToolEnd) {
              this.neurolink.emitToolEnd(
                toolName,
                undefined, // no result
                errorMsg,
                startTime,
                endTime,
                executionId,
              );
              logger.debug(
                `Custom tool error: ${toolName} (${endTime - startTime}ms)`,
                { error: errorMsg },
              );
            }

            customToolSpan.setAttribute(
              "tool.duration_ms",
              endTime - startTime,
            );
            customToolSpan.setAttribute("tool.result.status", "error");
            customToolSpan.recordException(
              error instanceof Error ? error : new Error(errorMsg),
            );
            customToolSpan.setStatus({
              code: SpanStatusCode.ERROR,
              message: errorMsg,
            });

            throw error;
          } finally {
            customToolSpan.end();
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

      // BZ-666/BZ-664: Wrap the raw MCP execute with guards before event wrapping
      const rawExecute = async (params: unknown): Promise<unknown> => {
        if (
          this.neurolink &&
          typeof this.neurolink.executeExternalMCPTool === "function"
        ) {
          return this.neurolink.executeExternalMCPTool(
            tool.serverId || "unknown",
            tool.name,
            params as JsonObject,
          );
        }
        throw new Error(
          `Cannot execute external MCP tool: NeuroLink executeExternalMCPTool not available`,
        );
      };
      const guardedExecute = this.wrapExecuteWithTruncation(
        tool.name,
        rawExecute,
      );

      return createAISDKTool<unknown, unknown>({
        description: tool.description || `External MCP tool ${tool.name}`,
        inputSchema: finalSchema, // AI SDK v6 uses inputSchema (not parameters)
        execute: async (params: unknown) => {
          const startTime = Date.now();
          this.emitToolEvent("tool:start", tool.name, { input: params });

          try {
            const result = await guardedExecute(params);
            this.emitToolEvent("tool:end", tool.name, {
              result,
              success: true,
              responseTime: Date.now() - startTime,
            });
            return result;
          } catch (mcpError) {
            const errorMsg =
              mcpError instanceof Error ? mcpError.message : String(mcpError);
            this.emitToolEvent("tool:end", tool.name, {
              error: errorMsg,
              success: false,
              responseTime: Date.now() - startTime,
            });
            logger.error(`External MCP tool failed: ${tool.name}`, {
              serverId: tool.serverId,
              error: errorMsg,
            });
            throw mcpError;
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
