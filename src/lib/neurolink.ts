/**
 * NeuroLink - Unified AI Interface with Real MCP Tool Integration
 *
 * REDESIGNED FALLBACK CHAIN - NO CIRCULAR DEPENDENCIES
 * Enhanced AI provider system with natural MCP tool access.
 * Uses real MCP infrastructure for tool discovery and execution.
 */

// Load environment variables from .env file (critical for SDK usage)
import { config as dotenvConfig } from "dotenv";

try {
  dotenvConfig(); // Load .env from current working directory
} catch (error) {
  // Environment variables should be set externally in production
}

import type {
  AIProviderName,
  TextGenerationOptions,
  TextGenerationResult,
} from "./core/types.js";
import { AIProviderFactory } from "./core/factory.js";
import { ContextManager } from "./mcp/context-manager.js";
import { mcpLogger } from "./mcp/logging.js";
import { toolRegistry } from "./mcp/tool-registry.js";
import { unifiedRegistry } from "./mcp/unified-registry.js";
import { logger } from "./utils/logger.js";
import { getBestProvider } from "./utils/providerUtils-fixed.js";
import { ProviderRegistry } from "./factories/provider-registry.js";
// NEW: Generate function imports
import type {
  GenerateOptions,
  GenerateResult,
} from "./types/generate-types.js";
import type { StreamOptions, StreamResult } from "./types/stream-types.js";
// Tool registration imports
import type { SimpleTool } from "./sdk/tool-registration.js";
import {
  validateTool,
  createMCPServerFromTools,
} from "./sdk/tool-registration.js";
import type { InMemoryMCPServerConfig } from "./types/mcp-types.js";

// Provider and MCP diagnostic types
export interface ProviderStatus {
  provider: string;
  status: "working" | "failed" | "not-configured";
  configured: boolean;
  authenticated: boolean;
  error?: string;
  responseTime?: number;
  model?: string;
}

export interface MCPStatus {
  mcpInitialized: boolean;
  totalServers: number;
  availableServers: number;
  autoDiscoveredCount: number;
  totalTools: number;
  autoDiscoveredServers: MCPServerInfo[];
  customToolsCount: number;
  inMemoryServersCount: number;
  error?: string;
}

export interface MCPServerInfo {
  id: string;
  name: string;
  source: string;
  status: "connected" | "discovered" | "failed";
  hasServer: boolean;
  metadata?: any;
}

// Core types imported from core/types.js

export class NeuroLink {
  private mcpInitialized = false;
  private contextManager: ContextManager;
  // Tool registration support
  private customTools: Map<string, SimpleTool> = new Map();
  private inMemoryServers: Map<string, InMemoryMCPServerConfig> = new Map();

  constructor() {
    // SDK always disables manual MCP config for security
    ProviderRegistry.setOptions({
      enableManualMCP: false,
    });

    this.contextManager = new ContextManager();
  }

  /**
   * Initialize MCP registry with enhanced error handling and resource cleanup
   * Uses isolated async context to prevent hanging
   */
  private async initializeMCP(): Promise<void> {
    if (this.mcpInitialized) {
      return;
    }

    try {
      mcpLogger.debug("[NeuroLink] Starting isolated MCP initialization...");

      // Initialize tool registry with timeout protection
      const initTimeout = 3000; // 3 second timeout
      await Promise.race([
        Promise.resolve(), // toolRegistry doesn't need explicit initialization
        new Promise<void>((_, reject) => {
          setTimeout(
            () => reject(new Error("MCP initialization timeout")),
            initTimeout,
          );
        }),
      ]);

      // Register all providers with lazy loading support
      await ProviderRegistry.registerAllProviders();

      this.mcpInitialized = true;
      mcpLogger.debug("[NeuroLink] MCP initialization completed successfully");
    } catch (error) {
      mcpLogger.warn("[NeuroLink] MCP initialization failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue without MCP - graceful degradation
    }
  }

  /**
   * MAIN ENTRY POINT: Enhanced generate method with new function signature
   * Replaces both generateText and legacy methods
   */
  async generate(
    optionsOrPrompt: GenerateOptions | string,
  ): Promise<GenerateResult> {
    const startTime = Date.now();

    // Convert string prompt to full options
    const options: GenerateOptions =
      typeof optionsOrPrompt === "string"
        ? { input: { text: optionsOrPrompt } }
        : optionsOrPrompt;

    // Validate prompt
    if (!options.input?.text || typeof options.input.text !== "string") {
      throw new Error("Input text is required and must be a non-empty string");
    }

    // Convert to internal TextGenerationOptions for compatibility
    const textOptions: TextGenerationOptions = {
      prompt: options.input.text,
      provider: options.provider as AIProviderName,
      model: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      systemPrompt: options.systemPrompt,
      disableTools: options.disableTools, // FIX: Pass disableTools flag
      // 🔧 FIX: Include analytics and evaluation options!
      enableAnalytics: options.enableAnalytics,
      enableEvaluation: options.enableEvaluation,
      context: options.context,
      evaluationDomain: options.evaluationDomain,
      toolUsageContext: options.toolUsageContext,
    };

    // Use redesigned generation logic
    const textResult = await this.generateTextInternal(textOptions);

    // Convert back to GenerateResult
    const generateResult: GenerateResult = {
      content: textResult.content,
      provider: textResult.provider,
      model: textResult.model,
      usage: textResult.usage
        ? {
            inputTokens: textResult.usage.promptTokens || 0,
            outputTokens: textResult.usage.completionTokens || 0,
            totalTokens: textResult.usage.totalTokens || 0,
          }
        : undefined,
      responseTime: textResult.responseTime,
      toolsUsed: textResult.toolsUsed,
      toolExecutions: textResult.toolExecutions?.map((te: any) => ({
        name: te.toolName || te.name || "",
        input: te.input || {},
        output: te.output || te.result,
        duration: te.executionTime || te.duration || 0,
      })),
      enhancedWithTools: textResult.enhancedWithTools,
      availableTools: textResult.availableTools?.map((tool: any) => ({
        name: tool.name || "",
        description: tool.description || "",
        parameters: tool.parameters || {},
      })),
      analytics: (textResult as any).analytics,
      evaluation: (textResult as any).evaluation,
    };

    return generateResult;
  }

  /**
   * BACKWARD COMPATIBILITY: Legacy generateText method
   * Internally calls generate() and converts result format
   */
  async generateText(
    options: TextGenerationOptions,
  ): Promise<TextGenerationResult> {
    // Validate required parameters for backward compatibility
    if (
      !options.prompt ||
      typeof options.prompt !== "string" ||
      options.prompt.trim() === ""
    ) {
      throw new Error(
        "GenerateText options must include prompt as a non-empty string",
      );
    }

    // Use internal generation method directly
    return await this.generateTextInternal(options);
  }

  /**
   * REDESIGNED INTERNAL GENERATION - NO CIRCULAR DEPENDENCIES
   *
   * This method implements a clean fallback chain:
   * 1. Try MCP-enhanced generation if available
   * 2. Fall back to direct provider generation
   * 3. No recursive calls - each method has a specific purpose
   */
  private async generateTextInternal(
    options: TextGenerationOptions,
  ): Promise<TextGenerationResult> {
    const startTime = Date.now();
    const functionTag = "NeuroLink.generateTextInternal";

    logger.debug(`[${functionTag}] Starting generation`, {
      provider: options.provider || "auto",
      promptLength: options.prompt?.length || 0,
    });

    try {
      // Try MCP-enhanced generation first (if not explicitly disabled)
      if (!options.disableTools) {
        try {
          const mcpResult = await this.tryMCPGeneration(options);
          if (mcpResult && mcpResult.content) {
            logger.debug(`[${functionTag}] MCP generation successful`);
            return mcpResult;
          }
        } catch (error) {
          logger.debug(`[${functionTag}] MCP generation failed, falling back`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Fall back to direct provider generation
      const directResult = await this.directProviderGeneration(options);
      logger.debug(`[${functionTag}] Direct generation successful`);
      return directResult;
    } catch (error) {
      logger.error(`[${functionTag}] All generation methods failed`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Try MCP-enhanced generation (no fallback recursion)
   */
  private async tryMCPGeneration(
    options: TextGenerationOptions,
  ): Promise<TextGenerationResult | null> {
    const functionTag = "NeuroLink.tryMCPGeneration";
    const startTime = Date.now(); // 🔧 FIX: Add proper timing

    try {
      // Initialize MCP if needed
      await this.initializeMCP();

      if (!this.mcpInitialized) {
        return null; // Skip MCP if not available
      }

      // Create execution context
      const context = this.contextManager.createContext({
        sessionId: `neurolink-${Date.now()}`,
        userId: "neurolink-user",
        aiProvider: options.provider || "auto",
      });

      // Determine provider
      const providerName =
        options.provider === "auto" || !options.provider
          ? await getBestProvider()
          : options.provider;

      // Get available tools
      let availableTools: Array<{
        name: string;
        description: string;
        server: string;
        category?: string;
      }> = [];

      try {
        const allTools = await toolRegistry.listTools();
        availableTools = allTools.map((tool: any) => ({
          name: tool.name,
          description: tool.description || "No description available",
          server: tool.server,
          category: tool.category,
        }));
      } catch (error) {
        mcpLogger.warn(`[${functionTag}] Failed to get tools`, { error });
      }

      // Create tool-aware system prompt
      const enhancedSystemPrompt = this.createToolAwareSystemPrompt(
        options.systemPrompt,
        availableTools,
      );

      // Create provider and generate
      const provider = await AIProviderFactory.createProvider(
        providerName as AIProviderName,
        options.model,
        !options.disableTools, // Pass disableTools as inverse of enableMCP
        this, // Pass SDK instance
      );

      const result = await provider.generate({
        ...options,
        systemPrompt: enhancedSystemPrompt,
      });

      const responseTime = Date.now() - startTime; // 🔧 FIX: Proper timing calculation

      // Check if result is meaningful
      if (!result || !result.content || result.content.trim().length === 0) {
        return null; // Let caller fall back to direct generation
      }

      // Return enhanced result
      return {
        content: result.content,
        provider: providerName,
        usage: result.usage,
        responseTime,
        toolsUsed: [],
        enhancedWithTools: true,
        availableTools: availableTools.length > 0 ? availableTools : undefined,
        // 🔧 FIX: Include analytics and evaluation from BaseProvider
        analytics: (result as any).analytics,
        evaluation: (result as any).evaluation,
      };
    } catch (error) {
      mcpLogger.warn(`[${functionTag}] MCP generation failed`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return null; // Let caller fall back
    }
  }

  /**
   * Direct provider generation (no MCP, no recursion)
   */
  private async directProviderGeneration(
    options: TextGenerationOptions,
  ): Promise<TextGenerationResult> {
    const startTime = Date.now();
    const functionTag = "NeuroLink.directProviderGeneration";

    // Define provider priority for fallback
    const providerPriority = [
      "openai",
      "vertex",
      "bedrock",
      "anthropic",
      "azure",
      "google-ai",
      "huggingface",
      "ollama",
    ];

    const requestedProvider =
      options.provider === "auto" ? undefined : options.provider;

    // If specific provider requested, only use that provider (no fallback)
    const tryProviders = requestedProvider
      ? [requestedProvider]
      : providerPriority;

    logger.debug(`[${functionTag}] Starting direct generation`, {
      requestedProvider: requestedProvider || "auto",
      tryProviders,
      allowFallback: !requestedProvider,
    });

    let lastError: Error | null = null;

    // Try each provider in order
    for (const providerName of tryProviders) {
      try {
        logger.debug(`[${functionTag}] Attempting provider: ${providerName}`);

        const provider = await AIProviderFactory.createProvider(
          providerName as AIProviderName,
          options.model,
          !options.disableTools, // Pass disableTools as inverse of enableMCP
          this, // Pass SDK instance
        );

        const result = await provider.generate(options);
        const responseTime = Date.now() - startTime;

        if (!result) {
          throw new Error(`Provider ${providerName} returned null result`);
        }

        logger.debug(`[${functionTag}] Provider ${providerName} succeeded`, {
          responseTime,
          contentLength: result.content?.length || 0,
        });

        return {
          content: result.content || "",
          provider: providerName,
          model: result.model,
          usage: result.usage,
          responseTime,
          toolsUsed: [],
          enhancedWithTools: false,
          analytics: (result as any).analytics,
          evaluation: (result as any).evaluation,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn(`[${functionTag}] Provider ${providerName} failed`, {
          error: lastError.message,
        });
        // Continue to next provider
      }
    }

    // All providers failed
    const responseTime = Date.now() - startTime;
    logger.error(`[${functionTag}] All providers failed`, {
      triedProviders: tryProviders,
      lastError: lastError?.message,
      responseTime,
    });

    throw new Error(
      `Failed to generate text with all providers. Last error: ${lastError?.message || "Unknown error"}`,
    );
  }

  /**
   * Create tool-aware system prompt that informs AI about available tools
   */
  private createToolAwareSystemPrompt(
    originalSystemPrompt: string | undefined,
    availableTools: Array<{
      name: string;
      description: string;
      server: string;
      category?: string;
    }>,
  ): string {
    if (availableTools.length === 0) {
      return originalSystemPrompt || "";
    }

    const toolDescriptions = availableTools
      .map(
        (tool) => `- ${tool.name}: ${tool.description} (from ${tool.server})`,
      )
      .join("\n");

    const toolPrompt = `\n\nAvailable Tools:\n${toolDescriptions}\n\nYou can use these tools when appropriate to enhance your responses.`;

    return (originalSystemPrompt || "") + toolPrompt;
  }

  /**
   * BACKWARD COMPATIBILITY: Legacy streamText method
   * Internally calls stream() and converts result format
   */
  async streamText(
    prompt: string,
    options?: Partial<StreamOptions>,
  ): Promise<AsyncIterable<string>> {
    // Convert legacy format to new StreamOptions
    const streamOptions: StreamOptions = {
      input: { text: prompt },
      ...options,
    };

    // Call the new stream method
    const result = await this.stream(streamOptions);

    // Convert StreamResult to simple string async iterable
    async function* stringStream() {
      for await (const chunk of result.stream) {
        yield chunk.content;
      }
    }

    return stringStream();
  }

  /**
   * PRIMARY METHOD: Stream content using AI (recommended for new code)
   * Future-ready for multi-modal capabilities with current text focus
   */
  async stream(options: StreamOptions): Promise<StreamResult> {
    const startTime = Date.now();
    const functionTag = "NeuroLink.stream";

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

    // Initialize MCP if needed
    await this.initializeMCP();

    // Create execution context for tool operations
    const context = this.contextManager.createContext({
      sessionId: `neurolink-stream-${Date.now()}`,
      userId: "neurolink-user",
      aiProvider: options.provider || "auto",
    });

    // Determine provider to use
    const providerName =
      options.provider === "auto" || !options.provider
        ? await getBestProvider()
        : options.provider;

    try {
      mcpLogger.debug(`[${functionTag}] Starting MCP-enabled streaming`, {
        provider: providerName,
        prompt: (options.input.text?.substring(0, 100) || "No text") + "...",
        contextId: context.sessionId,
      });

      // Create provider using the same factory pattern as generate
      const provider = await AIProviderFactory.createBestProvider(
        providerName,
        options.model,
        true,
        this, // Pass SDK instance
      );

      // Call the provider's stream method directly
      const streamResult = await provider.stream(options);

      // Extract the stream from the result
      const stream = streamResult.stream;

      const responseTime = Date.now() - startTime;

      mcpLogger.debug(`[${functionTag}] MCP-enabled streaming completed`, {
        responseTime,
        provider: providerName,
      });

      // Convert to StreamResult format
      return {
        stream,
        provider: providerName,
        model: options.model,
        metadata: {
          streamId: `neurolink-${Date.now()}`,
          startTime,
        },
      };
    } catch (error) {
      // Fall back to regular streaming if MCP fails
      mcpLogger.warn(
        `[${functionTag}] MCP streaming failed, falling back to regular`,
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );

      // Use factory to create provider without MCP
      const provider = await AIProviderFactory.createBestProvider(
        providerName,
        options.model,
        false, // Disable MCP for fallback
        this, // Pass SDK instance
      );

      const streamResult = await provider.stream(options);
      const responseTime = Date.now() - startTime;

      return {
        stream: streamResult.stream,
        provider: providerName,
        model: options.model,
        metadata: {
          streamId: `neurolink-${Date.now()}`,
          startTime,
          responseTime,
          fallback: true,
        },
      };
    }
  }

  // ========================================
  // Tool Registration API
  // ========================================

  /**
   * Register a custom tool that will be available to all AI providers
   * @param name - Unique name for the tool
   * @param tool - Tool configuration
   */
  registerTool(name: string, tool: SimpleTool): void {
    try {
      // Validate tool configuration
      validateTool(name, tool);

      // Store the tool
      this.customTools.set(name, tool);

      // Convert to MCP server format for integration
      const serverId = `custom-tool-${name}`;
      const mcpServer = createMCPServerFromTools(
        serverId,
        { [name]: tool },
        {
          title: `Custom Tool: ${name}`,
          category: "custom",
        },
      );

      // Store as in-memory server
      this.inMemoryServers.set(serverId, mcpServer);

      logger.info(`Registered custom tool: ${name}`);
    } catch (error) {
      logger.error(`Failed to register tool ${name}:`, error);
      throw error;
    }
  }

  /**
   * Register multiple tools at once
   * @param tools - Object mapping tool names to configurations
   */
  registerTools(tools: Record<string, SimpleTool>): void {
    for (const [name, tool] of Object.entries(tools)) {
      this.registerTool(name, tool);
    }
  }

  /**
   * Unregister a custom tool
   * @param name - Name of the tool to remove
   * @returns true if the tool was removed, false if it didn't exist
   */
  unregisterTool(name: string): boolean {
    const removed = this.customTools.delete(name);
    if (removed) {
      const serverId = `custom-tool-${name}`;
      this.inMemoryServers.delete(serverId);
      logger.info(`Unregistered custom tool: ${name}`);
    }
    return removed;
  }

  /**
   * Get all registered custom tools
   * @returns Map of tool names to configurations
   */
  getCustomTools(): Map<string, SimpleTool> {
    return new Map(this.customTools);
  }

  /**
   * Add an in-memory MCP server (from git diff)
   * Allows registration of pre-instantiated server objects
   * @param serverId - Unique identifier for the server
   * @param config - Server configuration
   */
  async addInMemoryMCPServer(
    serverId: string,
    config: InMemoryMCPServerConfig,
  ): Promise<void> {
    try {
      mcpLogger.debug(
        `[NeuroLink] Registering in-memory MCP server: ${serverId}`,
      );

      // Validate server configuration
      if (!config.server) {
        throw new Error(`Server object is required for ${serverId}`);
      }

      // Store in registry
      this.inMemoryServers.set(serverId, config);

      mcpLogger.info(
        `[NeuroLink] Successfully registered in-memory server: ${serverId}`,
        {
          category: config.category,
          provider: config.metadata?.provider,
          version: config.metadata?.version,
        },
      );
    } catch (error) {
      mcpLogger.error(
        `[NeuroLink] Failed to register in-memory server ${serverId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get all registered in-memory servers
   * @returns Map of server IDs to configurations
   */
  getInMemoryServers(): Map<string, InMemoryMCPServerConfig> {
    return new Map(this.inMemoryServers);
  }

  /**
   * Execute a specific tool by name (from git diff)
   * Supports both custom tools and MCP server tools
   * @param toolName - Name of the tool to execute
   * @param params - Parameters to pass to the tool
   * @param options - Execution options
   * @returns Tool execution result
   */
  async executeTool<T = any>(
    toolName: string,
    params: any = {},
    options?: { timeout?: number },
  ): Promise<T> {
    const functionTag = "NeuroLink.executeTool";

    try {
      mcpLogger.debug(`[${functionTag}] Executing tool: ${toolName}`, {
        toolName,
        params,
        options,
      });

      // First check custom tools
      if (this.customTools.has(toolName)) {
        const tool = this.customTools.get(toolName)!;
        const context = {
          sessionId: `direct-execution-${Date.now()}`,
          logger,
        };

        const startTime = Date.now();
        const result = await tool.execute(params, context);
        const executionTime = Date.now() - startTime;

        mcpLogger.debug(`[${functionTag}] Custom tool executed successfully`, {
          toolName,
          executionTime,
        });

        return result as T;
      }

      // Then check in-memory servers
      for (const [serverId, serverConfig] of this.inMemoryServers.entries()) {
        const server = serverConfig.server;

        // Check if this server has the requested tool
        if (server && server.tools) {
          const tool =
            server.tools instanceof Map
              ? server.tools.get(toolName)
              : server.tools[toolName];

          if (tool && typeof tool.execute === "function") {
            mcpLogger.debug(
              `[${functionTag}] Found tool in in-memory server: ${serverId}`,
            );

            const startTime = Date.now();

            try {
              const result = await tool.execute(params);
              const executionTime = Date.now() - startTime;

              mcpLogger.debug(`[${functionTag}] Tool executed successfully`, {
                toolName,
                serverId,
                executionTime,
              });

              // Handle MCP-style results
              if (result && typeof result === "object" && "success" in result) {
                if (result.success) {
                  return result.data as T;
                } else {
                  throw new Error(result.error || "Tool execution failed");
                }
              }

              return result as T;
            } catch (toolError) {
              mcpLogger.error(`[${functionTag}] Tool execution failed`, {
                toolName,
                serverId,
                error:
                  toolError instanceof Error
                    ? toolError.message
                    : String(toolError),
              });
              throw toolError;
            }
          }
        }
      }

      // If not found in custom tools or in-memory servers, try unified registry
      try {
        // Ensure built-in tools are initialized
        const { initializeNeuroLinkMCP, isNeuroLinkMCPInitialized } =
          await import("./mcp/initialize.js");
        if (!isNeuroLinkMCPInitialized()) {
          mcpLogger.debug(`[${functionTag}] Initializing built-in MCP servers`);
          await initializeNeuroLinkMCP();
        }

        // Create minimal execution context for external tools
        const context = this.contextManager.createContext({
          sessionId: `neurolink-tool-${Date.now()}`,
          userId: "neurolink-user",
          aiProvider: "auto",
        });

        const result = (await unifiedRegistry.executeTool(
          toolName,
          params,
          context,
        )) as T;
        return result;
      } catch (error) {
        mcpLogger.warn(`[${functionTag}] External tool execution failed`, {
          toolName,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      mcpLogger.error(
        `[${functionTag}] Tool execution failed: ${errorMessage}`,
        {
          toolName,
          error: errorMessage,
        },
      );
      throw new Error(`Failed to execute tool '${toolName}': ${errorMessage}`);
    }
  }

  /**
   * Get all available tools including custom and in-memory ones
   * @returns Array of available tools with metadata
   */
  async getAllAvailableTools() {
    const { getAllAvailableTools } = await import("./mcp/initialize-tools.js");
    return getAllAvailableTools(this.inMemoryServers);
  }

  // ============================================================================
  // PROVIDER DIAGNOSTICS - SDK-First Architecture
  // ============================================================================

  /**
   * Get comprehensive status of all AI providers
   * Primary method for provider health checking and diagnostics
   */
  async getProviderStatus(): Promise<ProviderStatus[]> {
    const { AIProviderFactory } = await import("./core/factory.js");
    const { hasProviderEnvVars } = await import("./utils/providerUtils.js");

    const providers = [
      "openai",
      "bedrock",
      "vertex",
      "google-vertex",
      "anthropic",
      "azure",
      "google-ai",
      "huggingface",
      "ollama",
      "mistral",
    ] as const;

    const results: ProviderStatus[] = [];

    for (const providerName of providers) {
      const startTime = Date.now();

      // Check if provider has required environment variables
      const hasEnvVars = await this.hasProviderEnvVars(providerName);

      if (!hasEnvVars && providerName !== "ollama") {
        results.push({
          provider: providerName,
          status: "not-configured",
          configured: false,
          authenticated: false,
          error: "Missing required environment variables",
          responseTime: 0,
        });
        continue;
      }

      // Special handling for Ollama
      if (providerName === "ollama") {
        try {
          const response = await fetch("http://localhost:11434/api/tags", {
            method: "GET",
            signal: AbortSignal.timeout(2000),
          });

          if (!response.ok) {
            throw new Error("Ollama service not responding");
          }

          const { models } = await response.json();
          const defaultOllamaModel = "llama3.2:latest";
          const modelIsAvailable = models.some(
            (m: any) => m.name === defaultOllamaModel,
          );

          if (modelIsAvailable) {
            results.push({
              provider: providerName,
              status: "working",
              configured: true,
              authenticated: true,
              responseTime: Date.now() - startTime,
              model: defaultOllamaModel,
            });
          } else {
            results.push({
              provider: providerName,
              status: "failed",
              configured: true,
              authenticated: false,
              error: `Ollama service running but model '${defaultOllamaModel}' not found`,
              responseTime: Date.now() - startTime,
            });
          }
        } catch (error) {
          results.push({
            provider: providerName,
            status: "failed",
            configured: false,
            authenticated: false,
            error:
              error instanceof Error
                ? error.message
                : "Ollama service not running",
            responseTime: Date.now() - startTime,
          });
        }
        continue;
      }

      // Test other providers with actual generation call
      try {
        const testTimeout = 5000;
        const testPromise = this.testProviderConnection(providerName);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error("Provider test timeout (5s)")),
            testTimeout,
          );
        });

        await Promise.race([testPromise, timeoutPromise]);

        results.push({
          provider: providerName,
          status: "working",
          configured: true,
          authenticated: true,
          responseTime: Date.now() - startTime,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        results.push({
          provider: providerName,
          status: "failed",
          configured: true,
          authenticated: false,
          error: errorMessage,
          responseTime: Date.now() - startTime,
        });
      }
    }

    return results;
  }

  /**
   * Test a specific AI provider's connectivity and authentication
   * @param providerName - Name of the provider to test
   * @returns Promise resolving to true if provider is working
   */
  async testProvider(providerName: string): Promise<boolean> {
    try {
      await this.testProviderConnection(providerName);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Internal method to test provider connection with minimal generation call
   */
  private async testProviderConnection(providerName: string): Promise<void> {
    const { AIProviderFactory } = await import("./core/factory.js");

    const provider = await AIProviderFactory.createProvider(
      providerName as any,
      null,
      false, // Disable MCP for testing
    );

    await provider.generate({
      prompt: "test",
      maxTokens: 1,
      disableTools: true,
    });
  }

  /**
   * Check if a provider has required environment variables configured
   * @param providerName - Name of the provider to check
   * @returns True if provider has required environment variables
   */
  async hasProviderEnvVars(providerName: string): Promise<boolean> {
    const { hasProviderEnvVars } = await import("./utils/providerUtils.js");
    return hasProviderEnvVars(providerName);
  }

  /**
   * Get the best available AI provider based on configuration and availability
   * @param requestedProvider - Optional preferred provider name
   * @returns Promise resolving to the best provider name
   */
  async getBestProvider(requestedProvider?: string): Promise<string> {
    const { getBestProvider } = await import("./utils/providerUtils.js");
    return getBestProvider(requestedProvider);
  }

  /**
   * Get list of all available AI provider names
   * @returns Array of supported provider names
   */
  async getAvailableProviders(): Promise<string[]> {
    const { getAvailableProviders } = await import("./utils/providerUtils.js");
    return getAvailableProviders();
  }

  /**
   * Validate if a provider name is supported
   * @param providerName - Provider name to validate
   * @returns True if provider name is valid
   */
  async isValidProvider(providerName: string): Promise<boolean> {
    const { isValidProvider } = await import("./utils/providerUtils.js");
    return isValidProvider(providerName);
  }

  // ============================================================================
  // MCP DIAGNOSTICS - SDK-First Architecture
  // ============================================================================

  /**
   * Get comprehensive MCP (Model Context Protocol) status information
   * @returns Promise resolving to MCP status details
   */
  async getMCPStatus(): Promise<MCPStatus> {
    const { unifiedRegistry } = await import("./mcp/unified-registry.js");

    try {
      const totalServers = unifiedRegistry.getTotalServerCount();
      const availableServers = unifiedRegistry.getAvailableServerCount();
      const autoDiscoveredServers = unifiedRegistry.getAutoDiscoveredServers();
      const allTools = await unifiedRegistry.listAllTools();

      return {
        mcpInitialized: this.mcpInitialized,
        totalServers,
        availableServers,
        autoDiscoveredCount: autoDiscoveredServers.length,
        totalTools: allTools.length,
        autoDiscoveredServers: autoDiscoveredServers.map((server) => ({
          id: server.metadata.name,
          name: server.metadata.name,
          source: server.source,
          status: "discovered",
          hasServer: true,
        })),
        customToolsCount: this.customTools.size,
        inMemoryServersCount: this.inMemoryServers.size,
      };
    } catch (error) {
      return {
        mcpInitialized: false,
        totalServers: 0,
        availableServers: 0,
        autoDiscoveredCount: 0,
        totalTools: 0,
        autoDiscoveredServers: [],
        customToolsCount: this.customTools.size,
        inMemoryServersCount: this.inMemoryServers.size,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * List all configured MCP servers with their status
   * @returns Promise resolving to array of MCP server information
   */
  async listMCPServers(): Promise<MCPServerInfo[]> {
    const { unifiedRegistry } = await import("./mcp/unified-registry.js");

    try {
      const servers = unifiedRegistry.getAutoDiscoveredServers();
      return servers.map((server) => ({
        id: server.metadata.name,
        name: server.metadata.name,
        source: server.source,
        status: unifiedRegistry.isConnected(server.metadata.name)
          ? "connected"
          : "discovered",
        hasServer: true,
        metadata: server.metadata,
      }));
    } catch (error) {
      logger.warn("Failed to list MCP servers", { error });
      return [];
    }
  }

  /**
   * Test connectivity to a specific MCP server
   * @param serverId - ID of the MCP server to test
   * @returns Promise resolving to true if server is reachable
   */
  async testMCPServer(serverId: string): Promise<boolean> {
    const { unifiedRegistry } = await import("./mcp/unified-registry.js");

    try {
      return unifiedRegistry.isConnected(serverId);
    } catch {
      return false;
    }
  }
}

// Create default instance
export const neurolink = new NeuroLink();
export default neurolink;
