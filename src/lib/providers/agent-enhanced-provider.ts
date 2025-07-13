/**
 * Agent-Enhanced Provider for NeuroLink CLI
 * Integrates direct tools with AI providers for true agent functionality
 */

import { streamText, tool, generateText as aiGenerate } from "ai";
import type { GenerateResult } from "../types/generate-types.js";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  directAgentTools,
  getToolsForCategory,
} from "../agent/direct-tools.js";
import type {
  AIProvider,
  TextGenerationOptions,
  EnhancedGenerateResult,
  StreamingProgressData,
  ProgressCallback,
} from "../core/types.js";
import {
  StreamingEnhancer,
  StreamingMonitor,
} from "../utils/streaming-utils.js";
import { UnifiedMCPSystem } from "../mcp/unified-mcp.js";
import { mcpLogger } from "../mcp/logging.js";
import { parseTimeout } from "../utils/timeout.js";
import { evaluateResponse } from "../core/evaluation.js";
import { createAnalytics } from "../core/analytics.js";
import { logger } from "../utils/logger.js";
import type { StreamOptions, StreamResult } from "../types/stream-types.js";

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
  private resolvedModelName: string = "default";
  private mcpSystem: UnifiedMCPSystem | null = null;
  private mcpInitialized = false;
  private mcpInitializing = false;
  private mcpInitFailed = false;

  constructor(config: AgentConfig) {
    this.config = {
      maxSteps: 5,
      toolCategory: "all",
      enableTools: true,
      enableMCP: true,
      mcpDiscoveryOptions: {
        autoDiscover: true,
        searchPaths: [process.cwd()],
        configFiles: [".mcp-config.json", ".mcp-servers.json"],
      },
      ...config,
    };

    // Initialize the AI model based on provider and store resolved model name
    this.model = this.createModel();

    // Initialize MCP registry if enabled
    if (this.config.enableMCP) {
      this.initializeMCP();
    }
  }

  private createModel() {
    const { provider, model } = this.config;

    switch (provider) {
      case "google-ai":
        this.resolvedModelName =
          model || process.env.GOOGLE_AI_MODEL || "gemini-2.5-flash";
        return google(this.resolvedModelName);
      case "openai":
        this.resolvedModelName = model || process.env.OPENAI_MODEL || "gpt-4o";
        return openai(this.resolvedModelName);
      case "anthropic":
        this.resolvedModelName =
          model || process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";
        return anthropic(this.resolvedModelName);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Initialize MCP registry with auto-discovery
   */
  private async initializeMCP(): Promise<void> {
    if (this.mcpInitializing || this.mcpInitFailed) {
      return;
    }

    this.mcpInitializing = true;

    try {
      mcpLogger.info("[AgentEnhancedProvider] Initializing MCP integration...");
      this.mcpSystem = new UnifiedMCPSystem({
        configPath:
          this.config.mcpDiscoveryOptions?.configFiles?.[0] ||
          ".mcp-config.json",
        enableExternalServers: true,
        enableInternalServers: true,
        autoInitialize: false,
      });

      // ADD TIMEOUT to prevent hanging forever
      const initPromise = this.mcpSystem.initialize();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(new Error("MCP initialization timeout after 15 seconds")),
          this.config.mcpInitTimeoutMs || 15000,
        ),
      );

      await Promise.race([initPromise, timeoutPromise]);
      this.mcpInitialized = true;
      mcpLogger.info(
        "[AgentEnhancedProvider] MCP integration initialized successfully",
      );
    } catch (error) {
      mcpLogger.error(
        "[AgentEnhancedProvider] Failed to initialize MCP:",
        error,
      );
      this.mcpSystem = null;
      this.mcpInitialized = false;
      this.mcpInitFailed = true;
      // Don't throw - continue with direct tools only
    } finally {
      this.mcpInitializing = false;
    }
  }

  /**
   * Get combined tools: direct tools + MCP tools
   */
  private async getCombinedTools() {
    const directTools = this.config.enableTools
      ? getToolsForCategory(this.config.toolCategory)
      : {};

    // If MCP is disabled or failed to initialize, return only direct tools
    if (!this.config.enableMCP || !this.mcpSystem) {
      return directTools;
    }

    // Get MCP tools if available
    const mcpTools = {};
    try {
      // Skip if MCP failed to initialize or is still initializing
      if (
        this.mcpInitFailed ||
        this.mcpInitializing ||
        !this.mcpInitialized ||
        !this.mcpSystem
      ) {
        return directTools;
      }

      const mcpToolInfos = await this.mcpSystem.listTools();

      // Convert MCP tools to AI SDK format
      for (const toolInfo of mcpToolInfos) {
        const toolKey = `mcp_${toolInfo.name}`;
        (mcpTools as any)[toolKey] = {
          description: toolInfo.description || `MCP tool: ${toolInfo.name}`,
          parameters: toolInfo.inputSchema || {},
          execute: async (args: any) => {
            let timeoutId: NodeJS.Timeout | undefined;

            try {
              // Create timeout controller for tool execution if configured
              const toolTimeout = this.config.toolExecutionTimeout;
              const toolAbortController = toolTimeout
                ? new AbortController()
                : undefined;

              if (toolAbortController && toolTimeout) {
                const timeoutMs =
                  typeof toolTimeout === "string"
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
              const toolPromise = this.mcpSystem!.executeTool(
                toolInfo.name,
                args,
                context,
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
        };
      }

      mcpLogger.info(
        `[AgentEnhancedProvider] Loaded ${Object.keys(mcpTools).length} MCP tools`,
      );
    } catch (error) {
      mcpLogger.error(
        "[AgentEnhancedProvider] Failed to load MCP tools:",
        error,
      );
    }

    return { ...directTools, ...mcpTools };
  }

  /**
   * PRIMARY METHOD: Stream content using AI (recommended for new code)
   * Future-ready for multi-modal capabilities with current text focus
   */
  async stream(
    optionsOrPrompt: StreamOptions | string,
    analysisSchema?: any,
  ): Promise<StreamResult> {
    const functionTag = "AgentEnhancedProvider.stream";
    const startTime = Date.now();

    // Parse parameters - support both string and options object
    const options =
      typeof optionsOrPrompt === "string"
        ? { input: { text: optionsOrPrompt } }
        : optionsOrPrompt;

    // Validate input
    if (
      !options?.input?.text ||
      typeof options.input.text !== "string" ||
      options.input.text.trim() === ""
    ) {
      throw new Error(
        "Stream options must include input.text as a non-empty string",
      );
    }

    // Convert StreamOptions for internal use
    const convertedOptions = {
      prompt: options.input.text,
      provider: options.provider,
      model: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      systemPrompt: options.systemPrompt,
      timeout: options.timeout,
    };

    // Use stream method to get streaming result
    return await this.stream(options);
  }

  async generate(
    optionsOrPrompt: TextGenerationOptions | string,
  ): Promise<GenerateResult> {
    const startTime = Date.now();
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

    // Get combined tools (direct + MCP) if enabled
    const tools = this.config.enableTools ? await this.getCombinedTools() : {};

    const log = (msg: string, data?: any) => {
      mcpLogger.info(
        `[AgentEnhancedProvider] ${msg}`,
        data ? JSON.stringify(data, null, 2) : "",
      );
    };

    log("Starting text generation", {
      prompt: prompt.substring(0, 100),
      toolsCount: Object.keys(tools).length,
      maxSteps: this.config.maxSteps,
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
      const result = await aiGenerate({
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

      // Check if tools were called but no final text was generated
      if (
        result.finishReason === "tool-calls" &&
        !result.text &&
        result.toolResults?.length > 0
      ) {
        log(
          "Tools called but no final text generated, creating summary response",
        );

        try {
          // Extract tool results and create a summary prompt
          let toolResultsSummary = "";

          if (result.toolResults) {
            for (const toolResult of result.toolResults) {
              const resultData = (toolResult as any).result || toolResult;

              // Try to extract meaningful data from the result
              if (typeof resultData === "object" && resultData !== null) {
                if (resultData.success && resultData.items) {
                  // This looks like a filesystem listing
                  toolResultsSummary += `Directory listing for ${resultData.path}:\n`;
                  for (const item of resultData.items) {
                    toolResultsSummary += `- ${item.name} (${item.type})\n`;
                  }
                } else {
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
            preview: toolResultsSummary.substring(0, 200),
          });

          // Create a simple, direct summary
          const finalText = `Based on the user request "${prompt}", here's what I found:\n\n${toolResultsSummary}`;

          log("Final text created", {
            textLength: finalText.length,
            preview: finalText.substring(0, 200),
          });

          // Return result with the formatted text
          return {
            content: finalText,
            provider: this.getProviderName(),
            model: this.getModelName(),
            usage: result.usage
              ? {
                  inputTokens: result.usage.promptTokens,
                  outputTokens: result.usage.completionTokens,
                  totalTokens: result.usage.totalTokens,
                }
              : undefined,
            responseTime: 0,
            toolsUsed: [],
            toolExecutions: [],
            enhancedWithTools: false,
            availableTools: [],
          };
        } catch (error) {
          log("Error in summary generation", {
            error: error instanceof Error ? error.message : String(error),
          });

          // Fallback: return raw tool results
          const fallbackText = `Tool execution completed. Raw results: ${JSON.stringify(result.toolResults, null, 2)}`;
          return {
            content: fallbackText,
            provider: this.getProviderName(),
            model: this.getModelName(),
            usage: result.usage
              ? {
                  inputTokens: result.usage.promptTokens,
                  outputTokens: result.usage.completionTokens,
                  totalTokens: result.usage.totalTokens,
                }
              : undefined,
            responseTime: 0,
            toolsUsed: [],
            toolExecutions: [],
            enhancedWithTools: false,
            availableTools: [],
          };
        }
      }

      // Add analytics if enabled
      if (options.enableAnalytics) {
        (result as any).analytics = createAnalytics(
          this.config.provider,
          this.resolvedModelName,
          result,
          Date.now() - startTime,
          options.context,
        );
      }

      // Add evaluation if enabled
      if (options.enableEvaluation) {
        (result as any).evaluation = await evaluateResponse(
          prompt,
          result.text,
          options.context,
        );
      }

      // Return the full result - the AI SDK has already handled tool execution and integration
      return {
        content: result.text,
        provider: this.getProviderName(),
        model: this.getModelName(),
        usage: result.usage
          ? {
              inputTokens: result.usage.promptTokens,
              outputTokens: result.usage.completionTokens,
              totalTokens: result.usage.totalTokens,
            }
          : undefined,
        responseTime: 0,
        toolsUsed: [],
        toolExecutions: [],
        enhancedWithTools: false,
        availableTools: [],
      };
    } catch (error) {
      console.error("[AgentEnhancedProvider] generate error:", error);
      throw error;
    }
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
        logger.debug(`Testing: "${prompt}"`);
        const result = await this.generate(prompt);

        if (!result) {
          results.push({
            prompt,
            success: false,
            error: "No result returned from generate",
          });
          logger.warn(`❌ No result returned`);
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
          response: result.content.substring(0, 100) + "...",
        });

        logger.debug(
          `✅ Tools called: ${toolsCalled}, Response: ${result.content.substring(0, 50)}...`,
        );
      } catch (error) {
        results.push({
          prompt,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
        logger.error(`❌ Error: ${error}`);
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

  /**
   * Alias for generate() - CLI-SDK consistency
   */

  /**
   * Short alias for generate() - CLI-SDK consistency
   */
  async gen(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: any,
  ): Promise<EnhancedGenerateResult | null> {
    return this.generate(optionsOrPrompt);
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
  logger.info("🧪 Testing All Agent Providers\n");

  const providers = AgentEnhancedProvider.createMultiProviderAgents();

  if (Object.keys(providers).length === 0) {
    logger.warn(
      "❌ No API keys found. Please configure at least one provider.",
    );
    return;
  }

  for (const [name, provider] of Object.entries(providers)) {
    logger.info(`\n🔬 Testing ${name.toUpperCase()} Agent Provider:`);
    try {
      const testResult = await provider.testAgentCapabilities();

      if (testResult.success) {
        logger.info(`✅ ${name} agent provider working correctly`);
      } else {
        logger.warn(`❌ ${name} agent provider failed tests`);
      }
    } catch (error) {
      logger.error(`❌ ${name} provider error:`, error);
    }
  }
}
