/**
 * NeuroLink - Unified AI Interface with Real MCP Tool Integration
 *
 * Enhanced AI provider system with natural MCP tool access.
 * Uses real MCP infrastructure for tool discovery and execution.
 */

import type { AIProviderName } from "./core/types.js";
import { AIProviderFactory } from "./index.js";
import { ContextManager } from "./mcp/context-manager.js";
import { mcpLogger } from "./mcp/logging.js";
import { toolRegistry } from "./mcp/tool-registry.js";
import { unifiedRegistry } from "./mcp/unified-registry.js";
import { logger } from "./utils/logger.js";
import { getBestProvider } from "./utils/providerUtils-fixed.js";
import { TimeoutError } from "./utils/timeout.js";

export interface TextGenerationOptions {
  prompt: string;
  provider?:
    | "openai"
    | "bedrock"
    | "vertex"
    | "anthropic"
    | "azure"
    | "google-ai"
    | "huggingface"
    | "ollama"
    | "mistral"
    | "auto";
  model?: string; // NEW: Specific model to use
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  schema?: any;
  timeout?: number | string; // NEW: Optional timeout (e.g., 30000, '30s', '2m', '1h')
  disableTools?: boolean; // NEW: Disable MCP tool integration (tools enabled by default)
  // NEW: Analytics and Evaluation Support
  enableAnalytics?: boolean; // Default: false - Usage tracking
  enableEvaluation?: boolean; // Default: false - AI quality scoring
  context?: Record<string, any>; // Default: undefined - Custom context

  // NEW: Lighthouse-Compatible Domain-Aware Evaluation
  evaluationDomain?: string; // Domain expertise (e.g., "general AI assistant", "D2C analytics expert")
  toolUsageContext?: string; // Tools/MCPs used in this interaction
  conversationHistory?: Array<{ role: string; content: string }>; // Previous conversation context
}

export interface StreamTextOptions {
  prompt: string;
  provider?:
    | "openai"
    | "bedrock"
    | "vertex"
    | "anthropic"
    | "azure"
    | "google-ai"
    | "huggingface"
    | "ollama"
    | "mistral"
    | "auto";
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  schema?: any;
  timeout?: number | string;
  disableTools?: boolean;
  // NEW: Analytics and Evaluation Support
  enableAnalytics?: boolean;
  enableEvaluation?: boolean;
  context?: Record<string, any>;
}

export interface TextGenerationResult {
  content: string;
  provider?: string;
  model?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  responseTime?: number;
  toolsUsed?: string[];
  toolExecutions?: Array<{
    toolName: string;
    executionTime: number;
    success: boolean;
    serverId?: string;
  }>;
  enhancedWithTools?: boolean;
  availableTools?: Array<{
    name: string;
    description: string;
    server: string;
    category?: string;
  }>;
}

export class NeuroLink {
  private mcpInitialized = false;
  private contextManager: ContextManager;

  constructor() {
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

      // Use Promise.race with aggressive timeout and isolated context
      const initTimeout = 3000; // 3 seconds max (reduced from 5)
      const mcpInitPromise = Promise.race([
        this.doIsolatedMCPInitialization(),
        new Promise<void>((_, reject) => {
          setTimeout(() => {
            reject(new Error("MCP initialization timeout after 3s"));
          }, initTimeout);
        }),
      ]);

      await mcpInitPromise;

      this.mcpInitialized = true;
      mcpLogger.debug(
        "[NeuroLink] MCP tool integration initialized successfully",
      );
    } catch (error) {
      mcpLogger.warn(
        "[NeuroLink] MCP initialization failed, continuing without tools:",
        error,
      );
      // Mark as initialized to prevent infinite retries
      this.mcpInitialized = true;
    }
  }

  /**
   * Isolated MCP initialization to prevent context-dependent hanging
   */
  private async doIsolatedMCPInitialization(): Promise<void> {
    try {
      // Initialize only the essential built-in tools without complex registry
      mcpLogger.debug("[NeuroLink] Initializing essential MCP tools...");

      // Use dynamic import in isolated context to avoid circular dependencies
      const { initializeNeuroLinkMCP, isNeuroLinkMCPInitialized } =
        await import("./mcp/initialize.js");

      // Only initialize if not already done
      if (!isNeuroLinkMCPInitialized()) {
        await initializeNeuroLinkMCP();
      }

      mcpLogger.debug(
        "[NeuroLink] Essential MCP tools initialized successfully",
      );
    } catch (error) {
      mcpLogger.warn("[NeuroLink] Isolated MCP initialization failed:", error);
      throw error;
    }
  }

  /**
   * Generate text using the best available AI provider with automatic fallback
   * Tools are ENABLED BY DEFAULT for natural AI behavior
   */
  async generateText(
    options: TextGenerationOptions,
  ): Promise<TextGenerationResult> {
    // 🔧 FIX: Add input validation
    if (
      !options ||
      typeof options.prompt !== "string" ||
      options.prompt.trim() === ""
    ) {
      throw new Error(
        "options.prompt is required and must be a non-empty string",
      );
    }

    // Tools are DEFAULT behavior unless explicitly disabled
    if (options.disableTools === true) {
      return this.generateTextRegular(options);
    }
    // Default: Generate with tools (natural AI behavior)
    return this.generateTextWithTools(options);
  }

  /**
   * Generate text with real MCP tool integration using automatic detection
   */
  private async generateTextWithTools(
    options: TextGenerationOptions,
  ): Promise<TextGenerationResult> {
    const startTime = Date.now();
    const functionTag = "NeuroLink.generateTextWithTools";

    // Initialize MCP if needed
    await this.initializeMCP();

    // Create execution context for tool operations
    const context = this.contextManager.createContext({
      sessionId: `neurolink-${Date.now()}`,
      userId: "neurolink-user",
      aiProvider: options.provider || "auto",
    });

    // Determine provider to use
    const providerName =
      options.provider === "auto" || !options.provider
        ? await getBestProvider()
        : options.provider;

    try {
      mcpLogger.debug(`[${functionTag}] Starting MCP-enabled generation`, {
        provider: providerName,
        prompt: (options.prompt?.substring(0, 100) || "No prompt") + "...",
        contextId: context.sessionId,
      });

      // Get available tools from tool registry (simplified approach)
      let availableTools: Array<{
        name: string;
        description: string;
        server: string;
        category?: string;
      }> = [];
      try {
        // Use toolRegistry directly instead of unified registry to avoid hanging
        const allTools = await toolRegistry.listTools();
        availableTools = allTools.map((tool: any) => ({
          name: tool.name,
          description: tool.description || "No description available",
          server: tool.server,
          category: tool.category,
        }));

        mcpLogger.debug(
          `[${functionTag}] Found ${availableTools.length} available tools from default registry`,
          {
            tools: availableTools.map((t) => t.name),
          },
        );
      } catch (error) {
        mcpLogger.warn(`[${functionTag}] Failed to get available tools`, {
          error,
        });
      }

      // Create tool-aware system prompt
      const enhancedSystemPrompt = this.createToolAwareSystemPrompt(
        options.systemPrompt,
        availableTools,
      );

      // Create provider with MCP enabled using best provider function
      const provider = await AIProviderFactory.createBestProvider(
        providerName,
        options.model,
        true,
      );

      // Generate text with automatic tool detection
      const result = await provider.generateText(
        {
          prompt: options.prompt,
          temperature: options.temperature,
          maxTokens: options.maxTokens,
          systemPrompt: enhancedSystemPrompt,
          timeout: options.timeout,
          // NEW: Pass enhancement options
          enableAnalytics: options.enableAnalytics,
          enableEvaluation: options.enableEvaluation,
          context: options.context,
          // NEW: Lighthouse-compatible domain-aware evaluation
          evaluationDomain: options.evaluationDomain,
          toolUsageContext: options.toolUsageContext,
          conversationHistory: options.conversationHistory,
        },
        options.schema,
      );

      if (!result) {
        throw new Error("No response received from AI provider");
      }

      const responseTime = Date.now() - startTime;

      // Extract MCP metadata if available
      const metadata = (result as any).metadata || {};

      mcpLogger.debug(`[${functionTag}] MCP-enabled generation completed`, {
        responseTime,
        toolsUsed: metadata.toolsUsed || [],
        enhancedWithTools: metadata.enhancedWithTools || false,
        availableToolsCount: availableTools.length,
      });

      // Check if we actually got content
      if (!result.text || result.text.trim() === "") {
        mcpLogger.warn(
          `[${functionTag}] Empty response from provider, attempting fallback`,
          {
            provider: providerName,
            hasText: !!result.text,
            textLength: result.text?.length || 0,
          },
        );

        // Fall back to regular generation if MCP generation returns empty
        return this.generateTextRegular(options);
      }

      return {
        content: result.text,
        provider: providerName,
        usage: result.usage,
        responseTime,
        toolsUsed: metadata.toolsUsed || [],
        enhancedWithTools: metadata.enhancedWithTools || false,
        availableTools: availableTools.length > 0 ? availableTools : undefined,
        // NEW: Preserve enhancement data from provider
        ...(result.analytics && { analytics: result.analytics }),
        ...(result.evaluation && { evaluation: result.evaluation }),
      };
    } catch (error) {
      // Fall back to regular generation if MCP fails
      mcpLogger.warn(
        `[${functionTag}] MCP generation failed, falling back to regular`,
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );

      return this.generateTextRegular(options);
    }
  }

  /**
   * Regular text generation (existing logic)
   */
  private async generateTextRegular(
    options: TextGenerationOptions,
  ): Promise<TextGenerationResult> {
    const startTime = Date.now();
    const functionTag = "NeuroLink.generateTextRegular";

    // Define fallback provider priority order
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
      ? [requestedProvider] // Only use the requested provider, no fallback
      : providerPriority;

    logger.debug(`[${functionTag}] Starting text generation`, {
      requestedProvider: requestedProvider || "auto",
      tryProviders,
      allowFallback: !requestedProvider,
      promptLength: options.prompt?.length || 0,
    });

    let lastError: Error | null = null;

    for (const providerName of tryProviders) {
      try {
        logger.debug(`[${functionTag}] Attempting provider`, {
          provider: providerName,
        });

        const provider = await AIProviderFactory.createProvider(
          providerName,
          options.model,
          false, // Explicitly disable MCP when tools are disabled
        );

        const result = await provider.generateText(
          {
            prompt: options.prompt,
            model: options.model,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
            systemPrompt: options.systemPrompt,
            timeout: options.timeout,
            // NEW: Pass enhancement options
            enableAnalytics: options.enableAnalytics,
            enableEvaluation: options.enableEvaluation,
            context: options.context,
            // NEW: Lighthouse-compatible domain-aware evaluation
            evaluationDomain: options.evaluationDomain,
            toolUsageContext: options.toolUsageContext,
            conversationHistory: options.conversationHistory,
          },
          options.schema,
        );

        if (!result) {
          throw new Error("No response received from AI provider");
        }

        // Check if we actually got content
        if (!result.text || result.text.trim() === "") {
          logger.warn(`[${functionTag}] Empty response from provider`, {
            provider: providerName,
            hasText: !!result.text,
            textLength: result.text?.length || 0,
          });

          // Continue to next provider if available
          throw new Error(`Empty response from ${providerName}`);
        }

        const responseTime = Date.now() - startTime;

        logger.debug(`[${functionTag}] Provider succeeded`, {
          provider: providerName,
          responseTime,
          usage: result.usage,
        });

        return {
          content: result.text,
          provider: providerName,
          usage: result.usage,
          responseTime,
          // NEW: Preserve enhancement data from provider
          ...(result.analytics && { analytics: result.analytics }),
          ...(result.evaluation && { evaluation: result.evaluation }),
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        lastError = error instanceof Error ? error : new Error(errorMessage);

        // Special handling for timeout errors
        if (error instanceof TimeoutError) {
          logger.warn(`[${functionTag}] Provider timed out`, {
            provider: providerName,
            timeout: error.timeout,
            operation: error.operation,
          });
        }

        logger.debug(`[${functionTag}] Provider failed, trying next`, {
          provider: providerName,
          error: errorMessage,
          isTimeout: error instanceof TimeoutError,
          remainingProviders: tryProviders.slice(
            tryProviders.indexOf(providerName) + 1,
          ),
        });

        // Continue to next provider
        continue;
      }
    }

    // All providers failed
    logger.debug(`[${functionTag}] All providers failed`, {
      triedProviders: tryProviders,
      lastError: lastError?.message,
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
    const basePrompt =
      originalSystemPrompt || "You are a helpful AI assistant.";

    if (availableTools.length === 0) {
      return basePrompt;
    }

    const toolDescriptions = availableTools
      .map((tool) => `- ${tool.name}: ${tool.description}`)
      .join("\n");

    return `${basePrompt}

Available tools that can be used when relevant:

${toolDescriptions}

You can mention these capabilities when they're relevant to user questions. For example:
- For time questions: "I can get the current time"
- For provider questions: "I can check AI provider status"
- For tool questions: "I can list available tools"

Note: Tool integration is currently in development. Please provide helpful responses based on your knowledge while mentioning tool capabilities when relevant.`;
  }

  /**
   * Generate streaming text using the best available AI provider with automatic fallback
   */
  async generateTextStream(
    options: StreamTextOptions,
  ): Promise<AsyncIterable<{ content: string }>> {
    const functionTag = "NeuroLink.generateTextStream";

    // Define fallback provider priority order
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
      ? [requestedProvider] // Only use the requested provider, no fallback
      : providerPriority;

    logger.debug(`[${functionTag}] Starting stream generation`, {
      requestedProvider: requestedProvider || "auto",
      tryProviders,
      allowFallback: !requestedProvider,
      promptLength: options.prompt.length,
    });

    let lastError: Error | null = null;

    for (const providerName of tryProviders) {
      try {
        logger.debug(`[${functionTag}] Attempting provider`, {
          provider: providerName,
        });

        const provider = await AIProviderFactory.createProvider(
          providerName,
          options.model,
          false, // Explicitly disable MCP when tools are disabled
        );

        const result = await provider.streamText({
          prompt: options.prompt,
          model: options.model,
          temperature: options.temperature,
          maxTokens: options.maxTokens,
          systemPrompt: options.systemPrompt,
          timeout: options.timeout,
        });

        if (!result) {
          throw new Error("No stream response received from AI provider");
        }

        logger.debug(`[${functionTag}] Provider succeeded`, {
          provider: providerName,
        });

        // Convert the AI SDK stream to our expected format
        async function* convertStream() {
          if (result && result.textStream) {
            for await (const chunk of result.textStream) {
              yield { content: chunk };
            }
          }
        }

        return convertStream();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        lastError = error instanceof Error ? error : new Error(errorMessage);

        // Special handling for timeout errors
        if (error instanceof TimeoutError) {
          logger.warn(`[${functionTag}] Provider timed out`, {
            provider: providerName,
            timeout: error.timeout,
            operation: error.operation,
          });
        }

        logger.debug(`[${functionTag}] Provider failed, trying next`, {
          provider: providerName,
          error: errorMessage,
          isTimeout: error instanceof TimeoutError,
          remainingProviders: tryProviders.slice(
            tryProviders.indexOf(providerName) + 1,
          ),
        });

        // Continue to next provider
        continue;
      }
    }

    // All providers failed
    logger.debug(`[${functionTag}] All providers failed`, {
      triedProviders: tryProviders,
      lastError: lastError?.message,
    });

    throw new Error(
      `Failed to stream text with all providers. Last error: ${lastError?.message || "Unknown error"}`,
    );
  }

  /**
   * Get the best available AI provider
   */
  async getBestProvider(): Promise<string> {
    return await getBestProvider();
  }

  /**
   * Test a specific provider
   */
  async testProvider(
    providerName: AIProviderName,
    testPrompt: string = "test",
  ): Promise<boolean> {
    try {
      const provider = await AIProviderFactory.createProvider(
        providerName,
        null,
        false,
      ); // Disable MCP for simple testing
      await provider.generateText({
        prompt: testPrompt,
        enableAnalytics: false,
        enableEvaluation: false,
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get access to the unified MCP registry for tool inspection and management
   */
  getUnifiedRegistry() {
    return unifiedRegistry;
  }

  /**
   * Initialize MCP and return discovery statistics
   */
  async getMCPStatus() {
    await this.initializeMCP();

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
    };
  }

  /**
   * Add a new MCP server programmatically
   *
   * Allows dynamic registration of MCP servers at runtime for enhanced
   * tool ecosystem management. Perfect for integrating external services
   * like Bitbucket, Slack, databases, etc.
   *
   * @param serverId - Unique identifier for the server (e.g., 'bitbucket', 'slack-api')
   * @param config - Server configuration with command and execution parameters
   * @returns Promise that resolves when server is successfully added and connected
   *
   * @example
   * ```typescript
   * // Add Bitbucket MCP server
   * await neurolink.addMCPServer('bitbucket', {
   *   command: 'npx',
   *   args: ['-y', '@nexus2520/bitbucket-mcp-server'],
   *   env: {
   *     BITBUCKET_USERNAME: 'your-username',
   *     BITBUCKET_APP_PASSWORD: 'your-app-password'
   *   }
   * });
   *
   * // Add custom database connector
   * await neurolink.addMCPServer('database', {
   *   command: 'node',
   *   args: ['./custom-db-mcp-server.js'],
   *   env: { DB_CONNECTION_STRING: 'postgresql://...' }
   * });
   * ```
   */
  async addMCPServer(
    serverId: string,
    config: {
      command: string;
      args?: string[];
      env?: Record<string, string>;
      cwd?: string;
      type?: "stdio" | "sse" | "http"; // Transport type (default: stdio)
      url?: string; // Required for SSE/HTTP transports
      headers?: Record<string, string>; // Optional headers for SSE/HTTP
      timeout?: number; // Connection timeout for SSE/HTTP
    },
  ): Promise<void> {
    const functionTag = "NeuroLink.addMCPServer";

    mcpLogger.info(`[${functionTag}] Adding MCP server: ${serverId}`, {
      command: config.command,
      argsCount: config.args?.length || 0,
      hasEnv: Object.keys(config.env || {}).length > 0,
    });

    try {
      // Ensure MCP is initialized
      await this.initializeMCP();

      // Add server to unified registry with configurable transport type
      const transportType = config.type || "stdio";

      // Validate URL requirement for non-stdio transports
      if (
        (transportType === "sse" || transportType === "http") &&
        !config.url
      ) {
        throw new Error(
          `URL is required for ${transportType} transport. Please provide config.url for server '${serverId}'.`,
        );
      }
      const transportConfig: any = {
        type: transportType,
        ...(transportType === "stdio" && {
          command: config.command,
          args: config.args || [],
          env: config.env || {},
          cwd: config.cwd,
        }),
        ...(transportType === "sse" && {
          url: config.url,
          headers: config.headers,
          timeout: config.timeout,
        }),
        ...(transportType === "http" && {
          url: config.url,
          headers: config.headers,
          timeout: config.timeout,
        }),
      };

      await unifiedRegistry.addExternalServer(serverId, transportConfig);

      // Check if server is actually connected vs just registered
      const isConnected = unifiedRegistry.isConnected(serverId);
      if (isConnected) {
        mcpLogger.info(
          `[${functionTag}] Successfully connected to MCP server: ${serverId}`,
        );
      } else {
        mcpLogger.info(
          `[${functionTag}] MCP server registered: ${serverId} (connection failed, but server available for retry)`,
        );
      }
    } catch (error) {
      mcpLogger.error(
        `[${functionTag}] Failed to add MCP server: ${serverId}`,
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      const newError = new Error(
        `Failed to add MCP server '${serverId}': ${error instanceof Error ? error.message : String(error)}`,
      );
      if (error instanceof Error && error.stack) {
        newError.stack = `${newError.stack}\nCaused by: ${error.stack}`;
      }
      throw newError;
    }
  }

  /**
   * Alias for generateText() - CLI-SDK consistency
   * @param options - Text generation options
   * @returns Promise resolving to text generation result
   */
  async generate(
    options: TextGenerationOptions,
  ): Promise<TextGenerationResult> {
    return this.generateText(options);
  }

  /**
   * Short alias for generateText() - CLI-SDK consistency
   * @param options - Text generation options
   * @returns Promise resolving to text generation result
   */
  async gen(options: TextGenerationOptions): Promise<TextGenerationResult> {
    return this.generateText(options);
  }

  /**
   * Get the connection client for a specific MCP server
   * @param serverId - The ID of the server to get connection for
   * @returns Client connection object or undefined if not connected
   */
  getConnection(serverId: string) {
    return unifiedRegistry.getConnection(serverId);
  }

  /**
   * Check if a specific MCP server is currently connected
   * @param serverId - The ID of the server to check
   * @returns True if server is connected, false otherwise
   */
  isConnected(serverId: string): boolean {
    return unifiedRegistry.isConnected(serverId);
  }
}
