import type { ZodType, ZodTypeDef } from "zod";
import type { Schema } from "ai";
import type { Tool } from "ai";
import type {
  AIProvider,
  TextGenerationOptions,
  EnhancedGenerateResult,
  AnalyticsData,
  AIProviderName,
} from "../core/types.js";
import type { StreamOptions, StreamResult } from "../types/stream-types.js";
import { logger } from "../utils/logger.js";
import { directAgentTools } from "../agent/direct-tools.js";
// Dynamic imports to break circular dependency
// import { evaluateResponse } from "../core/evaluation.js";
// import { getAvailableFunctionTools } from "../mcp/function-calling.js";
// Analytics helper will be dynamically imported when needed

/**
 * Abstract base class for all AI providers
 * Tools are integrated as first-class citizens - always available by default
 */
export abstract class BaseProvider implements AIProvider {
  protected readonly modelName: string;
  protected readonly providerName: AIProviderName;
  protected readonly defaultTimeout: number = 30000; // 30 seconds

  // Tools are ALWAYS part of the provider - no flags, no conditions
  protected readonly directTools = directAgentTools;
  protected mcpTools?: Record<string, Tool>; // MCP tools loaded dynamically when available
  protected sessionId?: string;
  protected userId?: string;
  protected sdk?: any; // Reference to NeuroLink SDK instance for custom tools

  constructor(modelName?: string, providerName?: AIProviderName, sdk?: any) {
    this.modelName = modelName || this.getDefaultModel();
    this.providerName = providerName || this.getProviderName();
    this.sdk = sdk;
  }

  /**
   * Check if this provider supports tool/function calling
   * Override in subclasses to disable tools for specific providers or models
   * @returns true by default, providers can override to return false
   */
  supportsTools(): boolean {
    return true;
  }

  // ===================
  // PUBLIC API METHODS
  // ===================

  /**
   * Primary streaming method - implements AIProvider interface
   * When tools are involved, falls back to generate() with synthetic streaming
   */
  async stream(
    optionsOrPrompt: StreamOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<StreamResult> {
    const options = this.normalizeStreamOptions(optionsOrPrompt);

    // If tools are not disabled AND provider supports tools, use generate() and create synthetic stream
    if (!options.disableTools && this.supportsTools()) {
      try {
        // Convert stream options to text generation options
        const textOptions: TextGenerationOptions = {
          prompt: options.input?.text || "",
          systemPrompt: options.systemPrompt,
          temperature: options.temperature,
          maxTokens: options.maxTokens,
          disableTools: false,
          maxSteps: options.maxSteps || 5,
          provider: options.provider as AIProviderName | undefined,
          model: options.model,
        };

        const result = await this.generate(textOptions, analysisSchema);

        // Create a synthetic stream from the generate result that simulates progressive delivery
        return {
          stream: (async function* () {
            if (result?.content) {
              // Split content into words for more natural streaming
              const words = result.content.split(/(\s+)/); // Keep whitespace
              let buffer = "";

              for (let i = 0; i < words.length; i++) {
                buffer += words[i];

                // Yield chunks of roughly 5-10 words or at punctuation
                const shouldYield =
                  i === words.length - 1 || // Last word
                  buffer.length > 50 || // Buffer getting long
                  /[.!?;,]\s*$/.test(buffer); // End of sentence/clause

                if (shouldYield && buffer.trim()) {
                  yield { content: buffer };
                  buffer = "";

                  // Small delay to simulate streaming (1-10ms)
                  await new Promise((resolve) =>
                    setTimeout(resolve, Math.random() * 9 + 1),
                  );
                }
              }

              // Yield any remaining content
              if (buffer.trim()) {
                yield { content: buffer };
              }
            }
          })(),
          usage: result?.usage,
          provider: result?.provider,
          model: result?.model,
          toolCalls: result?.toolCalls?.map((call) => ({
            toolName: call.toolName,
            parameters: call.args,
            id: call.toolCallId,
          })),
          toolResults: result?.toolResults,
        };
      } catch (error) {
        logger.error(
          `Stream with tools failed for ${this.providerName}:`,
          error,
        );
        throw this.handleProviderError(error);
      }
    }

    // Traditional streaming without tools
    try {
      return await this.executeStream(options, analysisSchema);
    } catch (error) {
      logger.error(`Stream failed for ${this.providerName}:`, error);
      throw this.handleProviderError(error);
    }
  }

  /**
   * Text generation method - implements AIProvider interface
   * Tools are always available unless explicitly disabled
   */
  async generate(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<EnhancedGenerateResult | null> {
    const options = this.normalizeTextOptions(optionsOrPrompt);
    const startTime = Date.now();

    try {
      // Import generateText dynamically to avoid circular dependencies
      const { generateText } = await import("ai");

      // Get ALL available tools (direct + MCP when available)
      const shouldUseTools = !options.disableTools && this.supportsTools();
      const tools = shouldUseTools ? await this.getAllTools() : {};
      logger.debug(
        `[BaseProvider.generate] Tools for ${this.providerName}: ${Object.keys(tools).join(", ")}`,
      );

      // EVERY provider uses Vercel AI SDK - no exceptions
      const model = await this.getAISDKModel(); // This method is now REQUIRED
      const result = await generateText({
        model,
        prompt: options.prompt || options.input?.text || "",
        system: options.systemPrompt,
        tools,
        maxSteps: options.maxSteps || 5,
        toolChoice: shouldUseTools ? "auto" : "none",
        temperature: options.temperature,
        maxTokens: options.maxTokens || 8192,
      });

      // Format the result with tool executions included
      const enhancedResult: EnhancedGenerateResult = {
        content: result.text,
        usage: {
          inputTokens: result.usage?.promptTokens || 0,
          outputTokens: result.usage?.completionTokens || 0,
          totalTokens: result.usage?.totalTokens || 0,
        },
        provider: this.providerName,
        model: this.modelName,
        toolCalls: result.toolCalls as any,
        toolResults: result.toolResults as any,
      };

      // Enhanced result with analytics and evaluation
      return await this.enhanceResult(enhancedResult, options, startTime);
    } catch (error) {
      logger.error(`Generate failed for ${this.providerName}:`, error);
      throw this.handleProviderError(error);
    }
  }
  /**
   * Alias for generate method - implements AIProvider interface
   */
  async gen(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<EnhancedGenerateResult | null> {
    return this.generate(optionsOrPrompt, analysisSchema);
  }

  // ===================
  // ABSTRACT METHODS - MUST BE IMPLEMENTED BY SUBCLASSES
  // ===================

  /**
   * Provider-specific streaming implementation (only used when tools are disabled)
   */
  protected abstract executeStream(
    options: StreamOptions,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<StreamResult>;

  /**
   * Get the provider name
   */
  protected abstract getProviderName(): AIProviderName;

  /**
   * Get the default model for this provider
   */
  protected abstract getDefaultModel(): string;

  /**
   * REQUIRED: Every provider MUST implement this method
   * Returns the Vercel AI SDK model instance for this provider
   */
  protected abstract getAISDKModel(): any | Promise<any>;

  // ===================
  // TOOL MANAGEMENT
  // ===================

  /**
   * Get all available tools - direct tools are ALWAYS available
   * MCP tools are added when available (without blocking)
   */
  protected async getAllTools(): Promise<Record<string, Tool>> {
    const tools: Record<string, Tool> = {
      ...this.directTools, // Always include direct tools
    };

    logger.info(
      `[BaseProvider] getAllTools called, SDK available: ${!!this.sdk}, type: ${typeof this.sdk}`,
    );
    console.log(
      `[BaseProvider] Direct tools: ${Object.keys(this.directTools).join(", ")}`,
    );

    // Add custom tools from SDK if available
    console.log(
      `[BaseProvider] Checking SDK: ${!!this.sdk}, has getInMemoryServers: ${this.sdk && typeof (this.sdk as any).getInMemoryServers}`,
    );
    if (
      this.sdk &&
      typeof (this.sdk as any).getInMemoryServers === "function"
    ) {
      console.log(`[BaseProvider] SDK check passed, loading custom tools`);
      try {
        const inMemoryServers = (this.sdk as any).getInMemoryServers();
        console.log(`[BaseProvider] Got servers:`, inMemoryServers.size);
        logger.debug(
          `[BaseProvider] Loading custom tools from SDK, found ${inMemoryServers.size} servers`,
        );
        if (inMemoryServers && inMemoryServers.size > 0) {
          // Convert in-memory server tools to AI SDK format
          for (const [serverId, serverConfig] of inMemoryServers) {
            const server = serverConfig.server;
            if (server && server.tools) {
              // Handle both Map and object formats
              const toolEntries =
                server.tools instanceof Map
                  ? Array.from(server.tools.entries())
                  : Object.entries(server.tools || {});

              for (const [toolName, toolInfo] of toolEntries as [
                string,
                any,
              ][]) {
                if (toolInfo && typeof toolInfo.execute === "function") {
                  console.log(
                    `[BaseProvider] Converting custom tool: ${toolName}`,
                  );
                  // Convert to AI SDK tool format
                  const { tool: createAISDKTool } = await import("ai");
                  const { z } = await import("zod");

                  tools[toolName] = createAISDKTool({
                    description: toolInfo.description || `Tool ${toolName}`,
                    parameters:
                      toolInfo.inputSchema ||
                      toolInfo.parameters ||
                      z.object({}),
                    execute: async (args) => {
                      const result = await toolInfo.execute(args);
                      // Handle MCP-style results
                      if (
                        result &&
                        typeof result === "object" &&
                        "success" in result
                      ) {
                        if (result.success) {
                          return result.data;
                        } else {
                          throw new Error(
                            result.error || "Tool execution failed",
                          );
                        }
                      }
                      return result;
                    },
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        logger.debug(
          `Failed to load custom tools for ${this.providerName}:`,
          error,
        );
        // Not an error - custom tools are optional
      }
    }

    // Try to load MCP tools if not already loaded
    if (!this.mcpTools) {
      try {
        const { getAvailableFunctionTools } = await import(
          "../mcp/function-calling.js"
        );
        const result = await getAvailableFunctionTools();
        if (result.tools && result.tools.length > 0) {
          this.mcpTools = {};
          for (const tool of result.tools) {
            const toolName = (tool as any).name || "unknown";
            this.mcpTools[toolName] = tool;
          }
        }
      } catch (error) {
        logger.debug(
          `MCP tools not available for ${this.providerName}:`,
          error,
        );
        // Not an error - MCP tools are optional
      }
    }

    // Add MCP tools if available
    if (this.mcpTools) {
      Object.assign(tools, this.mcpTools);
    }

    console.log(
      `[BaseProvider] getAllTools returning tools: ${Object.keys(tools).join(", ")}`,
    );
    return tools;
  }

  /**
   * Set session context for MCP tools
   */
  public setSessionContext(sessionId?: string, userId?: string): void {
    this.sessionId = sessionId;
    this.userId = userId;
  }

  /**
   * Provider-specific error handling
   */
  protected abstract handleProviderError(error: any): Error;
  // ===================
  // TEMPLATE METHODS - COMMON FUNCTIONALITY
  // ===================

  protected normalizeTextOptions(
    optionsOrPrompt: TextGenerationOptions | string,
  ): TextGenerationOptions {
    if (typeof optionsOrPrompt === "string") {
      return {
        prompt: optionsOrPrompt,
        provider: this.providerName,
        model: this.modelName,
      };
    }

    // Handle both prompt and input.text formats
    const prompt = optionsOrPrompt.prompt || optionsOrPrompt.input?.text || "";

    return {
      ...optionsOrPrompt,
      prompt,
      provider: optionsOrPrompt.provider || this.providerName,
      model: optionsOrPrompt.model || this.modelName,
    };
  }

  protected normalizeStreamOptions(
    optionsOrPrompt: StreamOptions | string,
  ): StreamOptions {
    if (typeof optionsOrPrompt === "string") {
      return {
        input: { text: optionsOrPrompt },
        provider: this.providerName,
        model: this.modelName,
      };
    }

    return {
      ...optionsOrPrompt,
      provider: optionsOrPrompt.provider || this.providerName,
      model: optionsOrPrompt.model || this.modelName,
    };
  }

  protected async enhanceResult(
    result: EnhancedGenerateResult,
    options: TextGenerationOptions,
    startTime: number,
  ): Promise<EnhancedGenerateResult> {
    const responseTime = Date.now() - startTime;
    let enhancedResult = { ...result };

    if (options.enableAnalytics) {
      try {
        logger.debug(`Creating analytics for ${this.providerName}...`);
        const analytics = await this.createAnalytics(
          result,
          responseTime,
          options,
        );
        logger.debug(`Analytics created:`, analytics);
        enhancedResult = { ...enhancedResult, analytics };
      } catch (error) {
        logger.warn(
          `Analytics creation failed for ${this.providerName}:`,
          error,
        );
      }
    }

    if (options.enableEvaluation) {
      try {
        const evaluation = await this.createEvaluation(result, options);
        enhancedResult = { ...enhancedResult, evaluation };
      } catch (error) {
        logger.warn(
          `Evaluation creation failed for ${this.providerName}:`,
          error,
        );
      }
    }

    return enhancedResult;
  }

  protected async createAnalytics(
    result: EnhancedGenerateResult,
    responseTime: number,
    options: TextGenerationOptions,
  ): Promise<AnalyticsData> {
    const { createAnalytics } = await import(
      "../providers/analytics-helper.js"
    );
    return createAnalytics(
      this.providerName,
      this.modelName,
      result,
      responseTime,
      options.context,
    );
  }

  protected async createEvaluation(
    result: EnhancedGenerateResult,
    options: TextGenerationOptions,
  ) {
    const { evaluateResponse } = await import("../core/evaluation.js");
    return evaluateResponse(result.content, options.prompt);
  }

  protected validateOptions(options: TextGenerationOptions): void {
    if (!options.prompt || options.prompt.trim().length === 0) {
      throw new Error("Prompt is required and cannot be empty");
    }
  }

  protected getProviderInfo(): { provider: string; model: string } {
    return {
      provider: this.providerName,
      model: this.modelName,
    };
  }
  /**
   * Get timeout value in milliseconds
   */
  public getTimeout(options: TextGenerationOptions | StreamOptions): number {
    if (!options.timeout) {
      return this.defaultTimeout;
    }

    if (typeof options.timeout === "number") {
      return options.timeout;
    }

    // Parse string timeout (e.g., '30s', '2m', '1h')
    const timeoutStr = options.timeout.toLowerCase();
    const value = parseInt(timeoutStr);

    if (timeoutStr.includes("h")) {
      return value * 60 * 60 * 1000;
    } else if (timeoutStr.includes("m")) {
      return value * 60 * 1000;
    } else if (timeoutStr.includes("s")) {
      return value * 1000;
    }

    return this.defaultTimeout;
  }
}
