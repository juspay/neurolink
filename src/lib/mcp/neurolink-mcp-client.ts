/**
 * NeuroLink MCP Client with Automatic Tool Detection
 * Implements automatic tool execution based on prompt analysis
 * Following Lighthouse's pattern of prompt-based tool invocation
 */

import { EventEmitter } from "events";
import type { AIProvider, TextGenerationOptions } from "../core/types.js";
import type {
  NeuroLinkMCPTool,
  ToolResult,
  NeuroLinkExecutionContext,
} from "./factory.js";
import { logger } from "../utils/logger.js";
import { v4 as uuidv4 } from "uuid";
import { DEFAULT_MAX_TOKENS } from "../core/constants.js";

/**
 * Tool Detection Pattern
 */
interface ToolDetectionPattern {
  patterns: RegExp[];
  toolName: string;
  paramExtractor?: (prompt: string) => Record<string, unknown>;
}

/**
 * Tool Execution Result
 */
interface ToolExecutionResult {
  toolName: string;
  result: ToolResult;
  executionTime: number;
}

/**
 * MCP Client Configuration
 */
export interface NeuroLinkMCPClientConfig {
  provider: AIProvider;
  providerName?: string;
  modelName?: string;
  sessionId?: string;
  userId?: string;
  organizationId?: string;
}

/**
 * NeuroLink MCP Client with Automatic Tool Detection
 */
export class NeuroLinkMCPClient extends EventEmitter {
  private provider: AIProvider;
  private tools: Map<string, NeuroLinkMCPTool> = new Map();
  private toolPatterns: ToolDetectionPattern[] = [];
  private config: NeuroLinkMCPClientConfig;
  private sessionId: string;
  private executionCount = 0;

  constructor(config: NeuroLinkMCPClientConfig) {
    super();
    this.provider = config.provider;
    this.config = config;
    this.sessionId = config.sessionId || uuidv4();

    this.initializeDefaultPatterns();

    logger.info(
      `[NeuroLink MCP Client] Initialized with automatic tool detection`,
      {
        sessionId: this.sessionId,
        provider: config.providerName,
        model: config.modelName,
      },
    );
  }

  /**
   * Initialize default tool detection patterns
   */
  private initializeDefaultPatterns(): void {
    // NO HARDCODED PATTERNS! Let AI decide which tools to use
    // This is TRUE automatic tool detection
  }

  /**
   * Register a tool with automatic detection patterns
   */
  registerTool(tool: NeuroLinkMCPTool, patterns?: ToolDetectionPattern): void {
    this.tools.set(tool.name, tool);

    // Add custom patterns if provided
    if (patterns) {
      this.toolPatterns.push(patterns);
    }

    logger.debug(`[NeuroLink MCP Client] Registered tool: ${tool.name}`, {
      hasPatterns: !!patterns,
      sessionId: this.sessionId,
    });

    this.emit("tool:registered", { toolName: tool.name });
  }

  /**
   * Extract tool parameters using AI
   * No hardcoded patterns - let AI figure out the parameters
   */
  private async extractToolParameters(
    toolName: string,
    tool: NeuroLinkMCPTool,
    prompt: string,
  ): Promise<Record<string, unknown>> {
    // If the tool has no input schema, no parameters needed
    if (!tool.inputSchema) {
      return {};
    }

    // Get the schema information
    let schemaDescription = "";
    try {
      // Convert schema to a readable format
      if (typeof tool.inputSchema === "object" && tool.inputSchema !== null) {
        schemaDescription = JSON.stringify(tool.inputSchema, null, 2);
      }
    } catch (error) {
      logger.warn(
        `[NeuroLink MCP Client] Could not serialize schema for ${toolName}`,
      );
      return {};
    }

    // Ask AI to extract parameters
    const extractionPrompt = `Extract the parameters needed for the tool "${toolName}" from the user prompt.

Tool: ${toolName}
Description: ${tool.description}
Input Schema: ${schemaDescription}

User prompt: "${prompt}"

Instructions:
1. Analyze the user prompt to extract values for the tool parameters
2. Return ONLY a JSON object with the extracted parameters
3. If a parameter cannot be extracted from the prompt, omit it or use a reasonable default
4. Make sure the JSON is valid and matches the schema

Examples:
- Prompt: "What's the weather in New York?" → {"location": "New York"}
- Prompt: "Calculate 5 + 3" → {"expression": "5 + 3"}
- Prompt: "What time is it?" → {} (no parameters needed)

Response (JSON object only):`;

    try {
      const response = await this.provider.generate({
        prompt: extractionPrompt,
        temperature: 0,
        maxTokens: 200,
      });

      if (response?.content) {
        // Extract JSON object from response
        const match = response.content.match(/\{([^}]*)\}/);
        if (match) {
          try {
            const params = JSON.parse(match[0]);
            logger.debug(
              `[NeuroLink MCP Client] Extracted parameters for ${toolName}`,
              params,
            );
            return params;
          } catch (parseError) {
            logger.error(
              `[NeuroLink MCP Client] Failed to parse parameters`,
              parseError,
            );
          }
        }
      }
    } catch (error) {
      logger.error(
        `[NeuroLink MCP Client] Failed to extract parameters with AI`,
        error,
      );
    }

    return {};
  }

  /**
   * Analyze prompt to detect required tools
   * TRUE AUTOMATIC DETECTION - AI decides which tools to use
   */
  private async analyzePrompt(prompt: string): Promise<string[]> {
    const detectedTools: string[] = [];

    // No patterns! Always use AI to detect tools
    if (this.tools.size > 0) {
      const toolList = Array.from(this.tools.values()).map((tool) => ({
        name: tool.name,
        description: tool.description,
      }));

      const analysisPrompt = `Analyze this user prompt and determine which tools should be used to answer it properly.

User prompt: "${prompt}"

Available tools:
${toolList.map((t) => `- ${t.name}: ${t.description}`).join("\n")}

Instructions:
1. Analyze what the user is asking for
2. Determine which tools would be helpful to answer the question
3. Return ONLY a JSON array of tool names that should be used
4. If no tools are needed, return an empty array []
5. Be selective - only choose tools that are directly relevant

Examples:
- "What time is it?" → ["neurolink-utility_get-current-time"]
- "Calculate 5 + 3" → ["neurolink-utility_calculator"]
- "What is the capital of France?" → []
- "What's the weather in NYC?" → ["neurolink-utility_get-weather"]

Response (JSON array only):`;

      try {
        const response = await this.provider.generate({
          prompt: analysisPrompt,
          temperature: 0,
          maxTokens: 200,
        });

        if (response?.content) {
          // Extract JSON array from response
          const match = response.content.match(/\[([^\]]*)\]/);
          if (match) {
            try {
              const toolNames = JSON.parse(match[0]);
              // Filter to only include tools that actually exist
              const validTools = toolNames.filter((name: string) => {
                // Check exact match first
                if (this.tools.has(name)) {
                  return true;
                }
                // Check for partial matches (e.g., "get-current-time" matches "neurolink-utility_get-current-time")
                for (const [registeredName] of this.tools) {
                  if (
                    registeredName.endsWith(`_${name}`) ||
                    registeredName.includes(name)
                  ) {
                    // Replace with the full registered name
                    const index = toolNames.indexOf(name);
                    if (index !== -1) {
                      toolNames[index] = registeredName;
                    }
                    return true;
                  }
                }
                return false;
              });
              detectedTools.push(...validTools);
            } catch (parseError) {
              logger.error(
                `[NeuroLink MCP Client] Failed to parse tool names`,
                parseError,
              );
            }
          }
        }
      } catch (error) {
        logger.error(
          `[NeuroLink MCP Client] Failed to analyze prompt with AI`,
          error,
        );
      }
    }

    logger.info(`[NeuroLink MCP Client] AI detected tools for prompt`, {
      prompt: prompt.substring(0, 50),
      detectedTools,
      sessionId: this.sessionId,
    });

    return detectedTools;
  }

  /**
   * Execute detected tools
   */
  private async executeTools(
    toolNames: string[],
    prompt: string,
  ): Promise<ToolExecutionResult[]> {
    const results: ToolExecutionResult[] = [];

    for (const toolName of toolNames) {
      const tool = this.tools.get(toolName);
      if (!tool) {
        logger.warn(`[NeuroLink MCP Client] Tool not found: ${toolName}`);
        continue;
      }

      // Extract parameters for the tool using AI
      const params = await this.extractToolParameters(toolName, tool, prompt);

      // Create execution context
      const context: NeuroLinkExecutionContext = {
        sessionId: this.sessionId,
        userId: this.config.userId || "anonymous",
        organizationId: this.config.organizationId || "default",
        aiProvider: this.config.providerName || "unknown",
        modelId: this.config.modelName,
        timestamp: Date.now(),
        // Required properties
        secureFS: {
          readFile: async () => {
            throw new Error("secureFS not configured");
          },
          writeFile: async () => {
            throw new Error("secureFS not configured");
          },
          readdir: async () => {
            throw new Error("secureFS not configured");
          },
          stat: async () => {
            throw new Error("secureFS not configured");
          },
          mkdir: async () => {
            throw new Error("secureFS not configured");
          },
          exists: async () => false,
        },
        path: {
          join: (...paths: string[]) => require("path").join(...paths),
          resolve: (...paths: string[]) => require("path").resolve(...paths),
          relative: (from: string, to: string) =>
            require("path").relative(from, to),
          dirname: (path: string) => require("path").dirname(path),
          basename: (path: string, ext?: string) =>
            require("path").basename(path, ext),
        },
        grantedPermissions: [],
        log: console.log,
      };

      // Emit tool start event
      this.executionCount++;
      const executionId = `exec-${this.executionCount}`;
      this.emit("tool:start", {
        executionId,
        toolName,
        params,
      });

      const startTime = Date.now();

      try {
        // Execute the tool
        const result = await tool.execute(params, context);
        const executionTime = Date.now() - startTime;

        results.push({
          toolName,
          result,
          executionTime,
        });

        // Emit tool end event
        this.emit("tool:end", {
          executionId,
          toolName,
          result,
          executionTime,
        });

        logger.info(`[NeuroLink MCP Client] Tool executed successfully`, {
          toolName,
          executionTime,
          success: result.success,
        });
      } catch (error) {
        const executionTime = Date.now() - startTime;
        const errorResult: ToolResult = {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };

        results.push({
          toolName,
          result: errorResult,
          executionTime,
        });

        // Emit tool error event
        this.emit("tool:error", {
          executionId,
          toolName,
          error: errorResult.error,
          executionTime,
        });

        logger.error(`[NeuroLink MCP Client] Tool execution failed`, {
          toolName,
          error: errorResult.error,
          executionTime,
        });
      }
    }

    return results;
  }

  /**
   * Generate response with tool results incorporated
   */
  private async generateResponse(
    prompt: string,
    toolResults: ToolExecutionResult[],
  ): Promise<string> {
    // If no tools were used, generate regular response
    if (toolResults.length === 0) {
      const response = await this.provider.generate({ prompt });
      return response?.content || "";
    }

    // Extract human-readable results from tool executions
    const toolResultsText = toolResults
      .map((tr) => {
        if (tr.result.success && tr.result.data) {
          // Check if tool result has a displayString or other human-readable format
          const data = tr.result.data as any;

          // For time tool, use the displayString
          if (data.displayString) {
            return data.displayString;
          }

          // For other tools, try to extract meaningful text
          if (data.formatted) {
            return data.formatted;
          }

          // For complex results, create a summary
          if (typeof data === "object") {
            // Try to find the most relevant field
            if (data.result) {
              return String(data.result);
            }
            if (data.output) {
              return String(data.output);
            }
            if (data.text) {
              return String(data.text);
            }
            if (data.value) {
              return String(data.value);
            }

            // For time-specific fields
            if (data.localTime) {
              return `The current time is ${data.localTime} in ${data.actualTimezone || data.requestedTimezone}`;
            }
          }

          // Fallback to stringified result
          return JSON.stringify(data);
        } else {
          return `Tool ${tr.toolName} failed: ${tr.result.error}`;
        }
      })
      .join("\n");

    // For single tool results with displayString, return directly
    if (toolResults.length === 1) {
      const toolResult = toolResults[0];
      if (toolResult.result.success && toolResult.result.data) {
        const data = toolResult.result.data as any;
        if (data.displayString) {
          return data.displayString;
        }
      }
    }

    // For more complex queries, let the AI incorporate the results
    const enhancedPrompt = `User question: ${prompt}

Tool results: ${toolResultsText}

Please provide a natural response based on the tool results.`;

    // Generate final response
    const response = await this.provider.generate({
      prompt: enhancedPrompt,
      temperature: 0.7,
      maxTokens: DEFAULT_MAX_TOKENS,
    });

    return response?.content || toolResultsText;
  }

  /**
   * Send a prompt and automatically execute any needed tools
   */
  async sendPrompt(prompt: string): Promise<string> {
    logger.info(
      `[NeuroLink MCP Client] Processing prompt with automatic tool detection`,
      {
        prompt: prompt.substring(0, 100),
        sessionId: this.sessionId,
      },
    );

    // Step 1: Analyze prompt for tool needs
    const toolsNeeded = await this.analyzePrompt(prompt);

    // Step 2: Execute tools if needed
    const toolResults = await this.executeTools(toolsNeeded, prompt);

    // Step 3: Generate response with tool results
    const response = await this.generateResponse(prompt, toolResults);

    return response;
  }

  /**
   * Get registered tools
   */
  getTools(): Record<string, { description?: string; inputSchema?: unknown }> {
    const tools: Record<
      string,
      { description?: string; inputSchema?: unknown }
    > = {};

    for (const [name, tool] of this.tools) {
      tools[name] = {
        description: tool.description,
        inputSchema: tool.inputSchema,
      };
    }

    return tools;
  }

  /**
   * Get session statistics
   */
  getStats() {
    return {
      sessionId: this.sessionId,
      toolCount: this.tools.size,
      patternCount: this.toolPatterns.length,
      executionCount: this.executionCount,
      provider: this.config.providerName,
      model: this.config.modelName,
    };
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    this.tools.clear();
    this.toolPatterns = [];
    this.removeAllListeners();

    logger.info(`[NeuroLink MCP Client] Cleaned up session ${this.sessionId}`);
  }
}

/**
 * Create a new NeuroLink MCP Client instance
 */
export function createNeuroLinkMCPClient(
  config: NeuroLinkMCPClientConfig,
): NeuroLinkMCPClient {
  return new NeuroLinkMCPClient(config);
}
