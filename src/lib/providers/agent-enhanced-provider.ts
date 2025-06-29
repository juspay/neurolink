/**
 * Agent-Enhanced Provider for NeuroLink CLI
 * Integrates direct tools with AI providers for true agent functionality
 */

import {
  generateText,
  streamText,
  tool,
  type GenerateTextResult,
  type StreamTextResult,
  type ToolSet,
} from "ai";
import { z } from "zod";
import { google, createGoogleGenerativeAI } from "@ai-sdk/google";
import { openai, createOpenAI } from "@ai-sdk/openai";
import { anthropic, createAnthropic } from "@ai-sdk/anthropic";
import {
  directAgentTools,
  getToolsForCategory,
} from "../agent/direct-tools.js";
import type {
  AIProvider,
  TextGenerationOptions,
  StreamTextOptions,
} from "../core/types.js";
import { mcpLogger } from "../mcp/logging.js";
import { parseTimeout } from "../utils/timeout.js";
import { hubBasedRegistry } from '../mcp/unified-mcp-hub-integration.js';
import { globalMCPHub } from '../mcp/mcp-hub.js';

/**
 * Agent configuration options
 */
interface AgentConfig {
  provider: "openai" | "google-ai" | "anthropic";
  model?: string;
  toolCategory?: "basic" | "filesystem" | "utility" | "all";
  maxSteps?: number;
  enableTools?: boolean;
  enableMCP?: boolean;
  mcpInitTimeoutMs?: number; // Timeout for MCP initialization in milliseconds
  toolExecutionTimeout?: number | string; // Timeout for individual tool execution
  requestTimeoutMs?: number; // AI Provider request timeout in milliseconds
  mcpDiscoveryOptions?: {
    searchPaths?: string[];
    configFiles?: string[];
    autoDiscover?: boolean;
  };
}

/**
 * Agent-Enhanced Provider Class
 * Provides AI generation with tool calling capabilities
 * Now includes MCP tool integration alongside direct tools
 */
export class AgentEnhancedProvider implements AIProvider {
  private config: AgentConfig;
  private model: any;
  private mcpInitialized = false;
  private mcpInitializing = false;
  private mcpInitFailed = false;
  private mcpInitPromise: Promise<void> | null = null;

  constructor(config: AgentConfig) {
    // Load timeout from multiple sources (env var, config file, default)
    const defaultTimeout = this.loadTimeoutConfig();

    this.config = {
      maxSteps: 5, // Reduced from 20 to 5 for better reliability
      toolCategory: "all",
      enableTools: true,
      enableMCP: true, // Re-enabled with timeout fixes
      requestTimeoutMs: defaultTimeout,
      mcpDiscoveryOptions: {
        autoDiscover: true,
        searchPaths: [process.cwd()],
        configFiles: [".neuro.config.json", ".mcp-servers.json"],
      },
      ...config,
    };

    // Initialize the AI model based on provider
    this.model = this.createModel();

    // NOTE: MCP initialization is now lazy - happens only when tools are actually needed
    // This prevents constructor timeout issues
  }

  /**
   * Load timeout configuration from multiple sources
   */
  private loadTimeoutConfig(): number {
    // Priority: explicit config > environment variable > neuro config file > default

    // Check environment variable first
    const envTimeout = process.env.AI_REQUEST_TIMEOUT_MS;
    if (envTimeout) {
      const parsed = parseInt(envTimeout, 10);
      if (!isNaN(parsed) && parsed > 0) {
        mcpLogger.debug(`[AgentEnhancedProvider] Using AI request timeout from environment: ${parsed}ms`);
        return parsed;
      }
    }

    // Check neuro config file
    try {
      const configPath = require('path').join(process.cwd(), '.neuro.config.json');
      if (require('fs').existsSync(configPath)) {
        const configData = JSON.parse(require('fs').readFileSync(configPath, 'utf8'));
        const aiTimeout = configData?.globalConfig?.ai?.requestTimeoutMs;
        if (typeof aiTimeout === 'number' && aiTimeout > 0) {
          mcpLogger.debug(`[AgentEnhancedProvider] Using AI request timeout from config file: ${aiTimeout}ms`);
          return aiTimeout;
        }
      }
    } catch (error) {
      mcpLogger.debug(`[AgentEnhancedProvider] Could not load timeout from config file: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Default timeout
    const defaultTimeout = 60000; // 60 seconds
    mcpLogger.debug(`[AgentEnhancedProvider] Using default AI request timeout: ${defaultTimeout}ms`);
    return defaultTimeout;
  }

  /**
   * Create a custom fetch function with timeout support and enhanced error handling
   */
  private createTimeoutFetch() {
    const timeoutMs = this.config.requestTimeoutMs || 60000;

    return async (input: RequestInfo | URL, options: RequestInit = {}) => {
      // Create AbortController for timeout
      const controller = new AbortController();

      // If there's already a signal in options, we need to merge them
      const existingSignal = options.signal;
      if (existingSignal) {
        // If the existing signal is already aborted, don't make the request
        if (existingSignal.aborted) {
          throw new DOMException('Request was aborted', 'AbortError');
        }

        // Listen for the existing signal's abort event
        existingSignal.addEventListener('abort', () => controller.abort());
      }

      const timeoutId = setTimeout(() => {
        mcpLogger.warn(`[AgentEnhancedProvider] Request timeout after ${timeoutMs}ms for URL: ${input}`);
        controller.abort();
      }, timeoutMs);

      try {
        mcpLogger.debug(`[AgentEnhancedProvider] Making request to ${input} with ${timeoutMs}ms timeout`);
        const response = await fetch(input, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        mcpLogger.debug(`[AgentEnhancedProvider] Request completed successfully for ${input}`);
        return response;
      } catch (error: any) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
          const timeoutError = new Error(`Network error: Could not connect to the API endpoint or the request timed out (${timeoutMs}ms)`);
          mcpLogger.error(`[AgentEnhancedProvider] Request timeout for ${input}:`, timeoutError.message);
          throw timeoutError;
        }

        // Log other network errors
        mcpLogger.error(`[AgentEnhancedProvider] Network error for ${input}:`, error.message);
        throw error;
      }
    };
  }

  private createModel() {
    const { provider, model } = this.config;
    const customFetch = this.createTimeoutFetch();

    switch (provider) {
      case "google-ai":
        return createGoogleGenerativeAI({
          apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_AI_API_KEY,
          fetch: customFetch,
        })(model || process.env.GOOGLE_AI_MODEL || "gemini-2.0-flash-exp");
      case "openai":
        return createOpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          fetch: customFetch,
        })(model || process.env.OPENAI_MODEL || "gpt-4o");
      case "anthropic":
        return createAnthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
          fetch: customFetch,
        })(model || process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022");
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Initialize MCP registry with auto-discovery
   */
  private async initializeMCP(): Promise<void> {
    // If already initialized or failed, return immediately
    if (this.mcpInitialized || this.mcpInitFailed) {
      return;
    }

    // If already initializing, wait for that promise to complete
    if (this.mcpInitPromise) {
      await this.mcpInitPromise;
      return;
    }

    // Start new initialization
    this.mcpInitializing = true;
    this.mcpInitPromise = this.doMCPInitialization();

    try {
      await this.mcpInitPromise;
    } finally {
      this.mcpInitPromise = null;
    }
  }

  /**
   * Actual MCP initialization logic with timeout and graceful fallback
   */
  private async doMCPInitialization(): Promise<void> {
    try {
      mcpLogger.info("[AgentEnhancedProvider] Starting MCP initialization with timeout...");

      // Create timeout promise (30 seconds for debugging)
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('MCP initialization timeout (30s)'));
        }, this.config.mcpInitTimeoutMs || 30000);
        // Prevent hanging by unreferencing timeout
        timeoutId.unref();
      });

      // Create initialization promise
      const initPromise = this.initializeMCPSystem();

      // Race between initialization and timeout
      await Promise.race([initPromise, timeoutPromise]);

      mcpLogger.info("[AgentEnhancedProvider] MCP initialization completed successfully");
      this.mcpInitialized = true;
      this.mcpInitFailed = false;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      mcpLogger.warn(`[AgentEnhancedProvider] MCP initialization failed: ${errorMsg}`);
      mcpLogger.info("[AgentEnhancedProvider] Continuing with direct tools only - external MCP tools will be unavailable");

      // Graceful fallback - don't fail the entire provider
      this.mcpInitialized = false;
      this.mcpInitFailed = true;

      // Don't throw - let the provider continue with direct tools
    } finally {
      this.mcpInitializing = false;
    }
  }

  /**
   * Initialize the MCP system with new hub architecture
   */
  private async initializeMCPSystem(): Promise<void> {
    // Initialize hub-based registry with validated auto-discovery
    const { UnifiedMCPRegistry } = await import('../mcp/unified-registry.js');
    const unifiedRegistry = new UnifiedMCPRegistry();

    // Initialize the unified registry (this runs validation and connection)
    await unifiedRegistry.initialize();

    // Get the validated discovered servers for hub integration
    const discoveredServers = (unifiedRegistry as any).autoDiscoveredServers || [];

    mcpLogger.info(`[AgentEnhancedProvider] Found ${discoveredServers.length} validated MCP servers`);

    // Initialize the hub-based registry with validated servers
    await hubBasedRegistry.initialize(discoveredServers);

    mcpLogger.debug("[AgentEnhancedProvider] Hub-based MCP system initialized with validation");
  }

  /**
   * Get combined tools: direct tools + MCP tools
   */
  private async getCombinedTools() {
    const directTools = this.config.enableTools
      ? getToolsForCategory(this.config.toolCategory)
      : {};

    mcpLogger.debug(`[AgentEnhancedProvider] Direct tools count: ${Object.keys(directTools).length}`);

    // If MCP is disabled or failed to initialize, return only direct tools
    if (!this.config.enableMCP || this.mcpInitFailed) {
      mcpLogger.debug("[AgentEnhancedProvider] MCP disabled or not available, returning direct tools only");
      return directTools;
    }

    // Get MCP tools if available (both internal and external)
    let mcpTools = {};
    let externalTools = {};

    try {
      // Skip if MCP failed to initialize or is still initializing
      if (this.mcpInitFailed || this.mcpInitializing || !this.mcpInitialized) {
        mcpLogger.debug("[AgentEnhancedProvider] MCP not ready, returning direct tools only");
        return directTools;
      }

      // Get all tools from hub-based registry (both internal and external)
      const mcpToolInfos = await hubBasedRegistry.listAllTools();
      mcpLogger.debug(`[AgentEnhancedProvider] Hub-based MCP tools found: ${mcpToolInfos.length}`);

      // Convert MCP tools to AI SDK format using tool() wrapper
      for (const toolInfo of mcpToolInfos) {
        // Use server-prefixed tool name to avoid conflicts
        const toolKey = `${toolInfo.server || toolInfo.serverId}_${toolInfo.name}`;

        // Create a proper Zod schema from the input schema
        let parametersSchema;
        try {
          if (toolInfo.inputSchema && typeof toolInfo.inputSchema === 'object' && toolInfo.inputSchema.properties) {
            // Convert JSON Schema to Zod schema
            const schemaProps: any = {};
            const properties = toolInfo.inputSchema.properties;
            const required = toolInfo.inputSchema.required || [];

            for (const [propName, propDef] of Object.entries(properties)) {
              const propSchema = propDef as any;
              if (propSchema.type === 'string') {
                schemaProps[propName] = required.includes(propName)
                  ? z.string().describe(propSchema.description || '')
                  : z.string().optional().describe(propSchema.description || '');
              } else if (propSchema.type === 'number' || propSchema.type === 'integer') {
                schemaProps[propName] = required.includes(propName)
                  ? z.number().describe(propSchema.description || '')
                  : z.number().optional().describe(propSchema.description || '');
              } else if (propSchema.type === 'boolean') {
                schemaProps[propName] = required.includes(propName)
                  ? z.boolean().describe(propSchema.description || '')
                  : z.boolean().optional().describe(propSchema.description || '');
              } else if (propSchema.type === 'array') {
                // Handle array types properly for Google AI compatibility
                const itemSchema = propSchema.items;
                let arrayType;
                if (itemSchema?.type === 'string') {
                  arrayType = z.array(z.string());
                } else if (itemSchema?.type === 'number' || itemSchema?.type === 'integer') {
                  arrayType = z.array(z.number());
                } else if (itemSchema?.type === 'boolean') {
                  arrayType = z.array(z.boolean());
                } else if (itemSchema?.type === 'object' && itemSchema.properties) {
                  // Handle nested objects in arrays
                  const nestedProps: any = {};
                  for (const [nestedPropName, nestedPropDef] of Object.entries(itemSchema.properties)) {
                    const nestedSchema = nestedPropDef as any;
                    if (nestedSchema.type === 'string') {
                      nestedProps[nestedPropName] = z.string().describe(nestedSchema.description || '');
                    } else if (nestedSchema.type === 'number' || nestedSchema.type === 'integer') {
                      nestedProps[nestedPropName] = z.number().describe(nestedSchema.description || '');
                    } else if (nestedSchema.type === 'boolean') {
                      nestedProps[nestedPropName] = z.boolean().describe(nestedSchema.description || '');
                    } else {
                      nestedProps[nestedPropName] = z.any().describe(nestedSchema.description || '');
                    }
                  }
                  arrayType = z.array(z.object(nestedProps));
                } else {
                  // Fallback for arrays without items specification
                  arrayType = z.array(z.any()).describe('Array of items');
                }

                schemaProps[propName] = required.includes(propName)
                  ? arrayType.describe(propSchema.description || '')
                  : arrayType.optional().describe(propSchema.description || '');
              } else {
                schemaProps[propName] = required.includes(propName)
                  ? z.any().describe(propSchema.description || '')
                  : z.any().optional().describe(propSchema.description || '');
              }
            }

            parametersSchema = z.object(schemaProps);
          } else {
            parametersSchema = z.object({});
          }
        } catch (error) {
          mcpLogger.warn(`Failed to parse schema for tool ${toolInfo.name}, using empty schema:`, error);
          parametersSchema = z.object({});
        }

        (mcpTools as any)[toolKey] = tool({
          description: toolInfo.description || `MCP tool: ${toolInfo.name} from ${toolInfo.server || toolInfo.serverId}`,
          parameters: parametersSchema,
          execute: async (args: any) => {
            let timeoutId: NodeJS.Timeout | undefined;

            try {
              // Create timeout controller for tool execution if configured
              const toolTimeout = this.config.toolExecutionTimeout;
              const toolAbortController = toolTimeout
                ? new AbortController()
                : undefined;

              if (toolAbortController && toolTimeout) {
                const timeoutMs = typeof toolTimeout === 'string'
                  ? parseTimeout(toolTimeout)
                  : toolTimeout;
                timeoutId = setTimeout(() => {
                  toolAbortController.abort();
                }, timeoutMs);
              }

              const context: any = {
                sessionId: "cli-session",
                userId: "cli-user",
                secureFS: {
                  readFile: async (path: string, encoding?: string) => {
                    const fs = await import("fs/promises");
                    return encoding
                      ? fs.readFile(path, {
                          encoding: encoding as BufferEncoding,
                        })
                      : fs.readFile(path);
                  },
                  writeFile: async (path: string, content: string | Buffer) => {
                    const fs = await import("fs/promises");
                    await fs.writeFile(path, content);
                  },
                  readdir: async (path: string) => {
                    const fs = await import("fs/promises");
                    return fs.readdir(path);
                  },
                  stat: async (path: string) => {
                    const fs = await import("fs/promises");
                    return fs.stat(path);
                  },
                  mkdir: async (path: string, options?: any) => {
                    const fs = await import("fs/promises");
                    await fs.mkdir(path, options);
                  },
                  exists: async (path: string) => {
                    const fs = await import("fs/promises");
                    try {
                      await fs.access(path);
                      return true;
                    } catch {
                      return false;
                    }
                  },
                },
                path: {
                  join: (...paths: string[]) => {
                    const path = require("path");
                    return path.join(...paths);
                  },
                  resolve: (...paths: string[]) => {
                    const path = require("path");
                    return path.resolve(...paths);
                  },
                  relative: (from: string, to: string) => {
                    const path = require("path");
                    return path.relative(from, to);
                  },
                  dirname: (path: string) => {
                    const pathLib = require("path");
                    return pathLib.dirname(path);
                  },
                  basename: (path: string, ext?: string) => {
                    const pathLib = require("path");
                    return pathLib.basename(path, ext);
                  },
                },
                grantedPermissions: ["read", "write", "execute"],
                log: (level: string, message: string, data?: any) => {
                  const logFn = mcpLogger[
                    level as keyof typeof mcpLogger
                  ] as any;
                  if (typeof logFn === "function") {
                    if (data) {
                      logFn(`${message} ${JSON.stringify(data)}`);
                    } else {
                      logFn(message);
                    }
                  }
                },
              };
              const toolPromise = hubBasedRegistry.executeTool(
                toolInfo.name,
                args,
                context
              );

              let result: any;
              if (toolAbortController) {
                // Race between tool execution and timeout
                result = await Promise.race([
                  toolPromise,
                  new Promise((_, reject) => {
                    toolAbortController.signal.addEventListener("abort", () => {
                      reject(
                        new Error(
                          `Tool ${toolInfo.name} timed out after ${this.config.toolExecutionTimeout}`,
                        ),
                      );
                    });
                  }),
                ]);
              } else {
                result = await toolPromise;
              }

              // Clear timeout if successful
              if (timeoutId) {
                clearTimeout(timeoutId);
              }

              return result.data || result;
            } catch (error: any) {
              // Clear timeout on error
              if (timeoutId) {
                clearTimeout(timeoutId);
              }
              mcpLogger.error(
                `MCP tool ${toolInfo.name} execution failed:`,
                error,
              );
              throw error;
            }
          },
        });
      }

      mcpLogger.debug(`[AgentEnhancedProvider] Loaded ${Object.keys(mcpTools).length} internal MCP tools`);
    } catch (error) {
      mcpLogger.error(
        "[AgentEnhancedProvider] Failed to load MCP tools:",
        error,
      );
    }

    // Combine all tools: direct + internal MCP + external MCP
    const combinedTools = { ...directTools, ...mcpTools, ...externalTools };

    mcpLogger.info(`[AgentEnhancedProvider] Combined tools summary:`);
    mcpLogger.info(`  - Direct tools: ${Object.keys(directTools).length}`);
    mcpLogger.info(`  - Internal MCP tools: ${Object.keys(mcpTools).length}`);
    mcpLogger.info(`  - External MCP tools: ${Object.keys(externalTools).length}`);
    mcpLogger.info(`  - Total tools: ${Object.keys(combinedTools).length}`);

    return combinedTools;
  }

  async generateText(
    optionsOrPrompt: TextGenerationOptions | string,
  ): Promise<GenerateTextResult<ToolSet, unknown> | null> {
    const options =
      typeof optionsOrPrompt === "string"
        ? { prompt: optionsOrPrompt }
        : optionsOrPrompt;

    const {
      prompt,
      temperature = 0.7,
      maxTokens = 1000,
      systemPrompt,
      schema,
      timeout,
    } = options;

    // Initialize MCP if enabled and not already initialized
    if (this.config.enableMCP && !this.mcpInitialized && !this.mcpInitializing && !this.mcpInitFailed) {
      mcpLogger.debug('[AgentEnhancedProvider] Starting lazy MCP initialization for generate-text');
      await this.initializeMCP();
    }

    // Get combined tools (direct + MCP) if enabled
    const tools = this.config.enableTools ? await this.getCombinedTools() : {};

    const log = (msg: string, data?: any) => {
      mcpLogger.info(
        `[AgentEnhancedProvider] ${msg}`,
        data ? JSON.stringify(data, null, 2) : "",
      );
    };

    const optimalMaxSteps = this.getOptimalMaxSteps(prompt);

    log('Starting text generation', {
      prompt: prompt.substring(0, 100),
      toolsCount: Object.keys(tools).length,
      maxSteps: optimalMaxSteps,
      isComplex: optimalMaxSteps > (this.config.maxSteps || 20)
    });

    try {
      // Parse timeout if provided
      let abortSignal: AbortSignal | undefined;
      if (timeout) {
        const timeoutMs =
          typeof timeout === "string" ? parseTimeout(timeout) : timeout;
        if (timeoutMs !== undefined) {
          abortSignal = AbortSignal.timeout(timeoutMs);
        }
      }

      // The AI SDK with maxSteps automatically handles tool calling and result integration
      const result = await generateText({
        model: this.model,
        prompt: systemPrompt
          ? `System: ${systemPrompt}\n\nUser: ${prompt}`
          : prompt,
        tools,
        maxSteps: this.config.maxSteps, // This enables automatic tool calling
        temperature,
        maxTokens,
        toolChoice: this.shouldForceToolUsage(prompt) ? "required" : "auto",
        abortSignal, // Pass abort signal for timeout support
      });

      log("Generation completed", {
        text: result.text?.substring(0, 200),
        finishReason: result.finishReason,
        toolCallsCount: result.toolCalls?.length || 0,
        toolResultsCount: result.toolResults?.length || 0,
        stepsCount: result.steps?.length || 0,
      });

      // Check if tools were called but no final text was generated (common with long-running tools)
      if ((result.finishReason === 'tool-calls' || result.finishReason === 'unknown') && (!result.text || result.text.trim().length === 0) && result.toolResults?.length > 0) {
        log('Tools called but no final text generated, extracting tool results');

        try {
          // Extract tool results and create a comprehensive summary
          let toolResultsSummary = '';

          if (result.toolResults) {
            for (const toolResult of result.toolResults) {
              const resultData = (toolResult as any).result || toolResult;

              // Handle enhanced results with stderr content (sequential thinking)
              if (typeof resultData === 'object' && resultData !== null && resultData.stderrOutput) {
                // This is an enhanced result with stderr content - use the stderr output
                toolResultsSummary += resultData.stderrOutput;
              } else if (typeof resultData === 'object' && resultData !== null && resultData.content && Array.isArray(resultData.content)) {
                // This is an MCP content array result
                for (const contentItem of resultData.content) {
                  if (contentItem.type === 'text' && contentItem.text) {
                    toolResultsSummary += contentItem.text;
                  }
                }
              } else if (typeof resultData === 'string' && resultData.includes('💭')) {
                // This looks like sequential thinking output
                toolResultsSummary += resultData;
              } else if (typeof resultData === 'object' && resultData !== null) {
                if (resultData.success && resultData.items) {
                  // This looks like a filesystem listing
                  toolResultsSummary += `Directory listing for ${resultData.path}:\n`;
                  for (const item of resultData.items) {
                    toolResultsSummary += `- ${item.name} (${item.type})\n`;
                  }
                } else if (resultData.analysis || resultData.conclusion) {
                  // This looks like analysis results
                  toolResultsSummary += resultData.analysis || resultData.conclusion;
                } else {
                  // Generic object response
                  toolResultsSummary += JSON.stringify(resultData, null, 2);
                }
              } else {
                toolResultsSummary += String(resultData);
              }
              toolResultsSummary += "\n\n";
            }
          }

          log("Tool results extracted", {
            summaryLength: toolResultsSummary.length,
            preview: toolResultsSummary.substring(0, 300)
          });

          // For sequential thinking or analysis tools, return the analysis directly
          if (toolResultsSummary.includes('💭') || toolResultsSummary.includes('analysis') || toolResultsSummary.includes('Thought')) {
            return {
              ...result,
              text: toolResultsSummary.trim(),
              finishReason: 'stop'
            };
          } else {
            // For other tools, provide context
            const finalText = `Based on your request: "${prompt}"\n\nHere's the analysis:\n\n${toolResultsSummary.trim()}`;
            return {
              ...result,
              text: finalText,
              finishReason: 'stop'
            };
          }

        } catch (error) {
          log("Error in summary generation", {
            error: error instanceof Error ? error.message : String(error),
          });

          // Fallback: return raw tool results
          const fallbackText = `Tool execution completed. Results:\n${JSON.stringify(result.toolResults, null, 2)}`;
          return {
            ...result,
            text: fallbackText,
            finishReason: "stop",
          };
        }
      }

      // Return the full result - the AI SDK has already handled tool execution and integration
      return result;
    } catch (error: any) {
      // Enhanced error handling for timeout and network issues
      if (error.name === 'AbortError') {
        const timeoutMs = this.config.requestTimeoutMs || 60000;
        const timeoutError = new Error(`Network error: Could not connect to the API endpoint or the request timed out (${timeoutMs}ms)`);
        mcpLogger.error(`[AgentEnhancedProvider] Request timeout during generateText:`, timeoutError.message);
        throw timeoutError;
      }

      // Log detailed error information
      mcpLogger.error("[AgentEnhancedProvider] generateText error:", {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n'), // First 5 lines of stack
        provider: this.config.provider,
        timeout: this.config.requestTimeoutMs
      });

      console.error("[AgentEnhancedProvider] generateText error:", error);
      throw error;
    }
  }

  async streamText(
    optionsOrPrompt: StreamTextOptions | string,
  ): Promise<StreamTextResult<ToolSet, unknown> | null> {
    const options =
      typeof optionsOrPrompt === "string"
        ? { prompt: optionsOrPrompt }
        : optionsOrPrompt;

    const {
      prompt,
      temperature = 0.7,
      maxTokens = 1000,
      systemPrompt,
      timeout,
    } = options;

    // Initialize MCP if enabled and not already initialized
    if (this.config.enableMCP && !this.mcpInitialized && !this.mcpInitializing && !this.mcpInitFailed) {
      mcpLogger.debug('[AgentEnhancedProvider] Starting lazy MCP initialization for stream-text');
      await this.initializeMCP();
    }

    // Get combined tools (direct + MCP) if enabled
    const tools = this.config.enableTools ? await this.getCombinedTools() : {};

    const optimalMaxSteps = this.getOptimalMaxSteps(prompt);

    try {
      // Create manual AbortController for better compatibility
      const controller = new AbortController();
      const timeoutMs = this.config.requestTimeoutMs || 120000; // Increased for complex tool operations like sequential thinking
      const timeoutId = setTimeout(() => {
        mcpLogger.warn(`[AgentEnhancedProvider] StreamText timeout after ${timeoutMs}ms, aborting...`);
        controller.abort();
      }, timeoutMs);

      try {
        const result = await streamText({
          model: this.model,
          prompt: systemPrompt
            ? `System: ${systemPrompt}\n\nUser: ${prompt}`
            : prompt,
          tools,
          maxSteps: optimalMaxSteps, // Dynamic maxSteps for streaming too
          temperature,
          maxTokens,
          toolChoice: this.shouldForceToolUsage(prompt) ? "required" : "auto",
          abortSignal: controller.signal, // Use manual AbortController
        });

        clearTimeout(timeoutId);
        return result;
      } catch (error) {
        clearTimeout(timeoutId);

        // Better error handling for timeout vs other issues
        if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
          throw new Error(`StreamText timeout after ${timeoutMs}ms - consider reducing prompt complexity or maxSteps`);
        }
        throw error;
      }
    } catch (error: any) {
      // Enhanced error handling for timeout and network issues
      if (error.message && error.message.includes('timeout')) {
        mcpLogger.error(`[AgentEnhancedProvider] Request timeout during streamText:`, error.message);
        throw error;
      }

      // Log detailed error information
      mcpLogger.error("[AgentEnhancedProvider] streamText error:", {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n'), // First 5 lines of stack
        provider: this.config.provider,
        timeout: this.config.requestTimeoutMs
      });

      console.error("[AgentEnhancedProvider] streamText error:", error);
      throw error;
    }
  }

  /**
   * Determine optimal maxSteps based on prompt complexity
   * Reduced limits to avoid timeout cascades
   */
  private getOptimalMaxSteps(prompt: string): number {
    const complexPatterns = [
      /sequential thinking/i,
      /analyze.*step.*by.*step/i,
      /think.*through/i,
      /multi.*step/i,
      /comprehensive.*analysis/i,
      /detailed.*plan/i,
      /business.*plan/i,
      /step.*by.*step/i,
    ];

    const isComplex = complexPatterns.some((pattern) => pattern.test(prompt));

    if (isComplex) {
      // Reduced from 25 to 8 to avoid timeout cascades
      return 8;
    }

    // Reduced from 20 to 5 for better reliability
    return this.config.maxSteps || 5;
  }

  /**
   * Determine if we should force tool usage based on prompt patterns
   */
  private shouldForceToolUsage(prompt: string): boolean {
    const forceToolPatterns = [
      /what time is it/i,
      /current time/i,
      /list files/i,
      /read file/i,
      /directory/i,
      /calculate/i,
      /math/i,
      /search for/i,
      /find files/i,
      /sequential thinking/i,
      /use.*thinking/i,
    ];

    return forceToolPatterns.some((pattern) => pattern.test(prompt));
  }

  getCapabilities(): string[] {
    return [
      "text-generation",
      "streaming",
      "tool-calling",
      "agent-functionality",
    ];
  }

  getProviderName(): string {
    return `agent-${this.config.provider}`;
  }

  getModelName(): string {
    return this.config.model || `default-${this.config.provider}-model`;
  }

  /**
   * Test agent functionality
   */
  async testAgentCapabilities(): Promise<{ success: boolean; results: any[] }> {
    const testPrompts = [
      "What time is it right now?",
      "List files in current directory",
      "Calculate 15 * 7",
      "What is the square root of 144?",
    ];

    const results = [];
    let successCount = 0;

    for (const prompt of testPrompts) {
      try {
        console.log(`Testing: "${prompt}"`);
        const result = await this.generateText(prompt);

        if (!result) {
          results.push({
            prompt,
            success: false,
            error: "No result returned from generateText",
          });
          console.log(`❌ No result returned`);
          continue;
        }

        const toolsCalled = result.toolCalls?.length || 0;
        const success = toolsCalled > 0;

        if (success) {
          successCount++;
        }

        results.push({
          prompt,
          success,
          toolsCalled,
          response: result.text.substring(0, 100) + "...",
        });

        console.log(
          `✅ Tools called: ${toolsCalled}, Response: ${result.text.substring(0, 50)}...`,
        );
      } catch (error) {
        results.push({
          prompt,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
        console.log(`❌ Error: ${error}`);
      }
    }

    return {
      success: successCount > 0,
      results,
    };
  }

  /**
   * Create agent-enhanced provider factory
   */
  static createAgent(config: AgentConfig): AgentEnhancedProvider {
    return new AgentEnhancedProvider(config);
  }

  /**
   * Create multiple agent providers for comparison
   */
  static createMultiProviderAgents(): Record<string, AgentEnhancedProvider> {
    const providers: Record<string, AgentEnhancedProvider> = {};

    // Only create providers that have API keys configured
    if (process.env.GOOGLE_AI_API_KEY) {
      providers["google-ai"] = new AgentEnhancedProvider({
        provider: "google-ai",
      });
    }

    if (process.env.OPENAI_API_KEY) {
      providers["openai"] = new AgentEnhancedProvider({ provider: "openai" });
    }

    if (process.env.ANTHROPIC_API_KEY) {
      providers["anthropic"] = new AgentEnhancedProvider({
        provider: "anthropic",
      });
    }

    return providers;
  }
}

/**
 * Helper function to create agent provider
 */
export function createAgentProvider(
  provider: "openai" | "google-ai" | "anthropic",
  options?: Partial<AgentConfig>,
): AgentEnhancedProvider {
  return new AgentEnhancedProvider({
    provider,
    ...options,
  });
}

/**
 * Test all available agent providers
 */
export async function testAllAgentProviders(): Promise<void> {
  console.log("🧪 Testing All Agent Providers\n");

  const providers = AgentEnhancedProvider.createMultiProviderAgents();

  if (Object.keys(providers).length === 0) {
    console.log(
      "❌ No API keys found. Please configure at least one provider.",
    );
    return;
  }

  for (const [name, provider] of Object.entries(providers)) {
    console.log(`\n🔬 Testing ${name.toUpperCase()} Agent Provider:`);
    try {
      const testResult = await provider.testAgentCapabilities();

      if (testResult.success) {
        console.log(`✅ ${name} agent provider working correctly`);
      } else {
        console.log(`❌ ${name} agent provider failed tests`);
      }
    } catch (error) {
      console.log(`❌ ${name} provider error:`, error);
    }
  }
}
