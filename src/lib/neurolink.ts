/**
 * NeuroLink - Unified AI Interface with Real MCP Tool Integration
 *
 * Enhanced AI provider system with natural MCP tool access.
 * Uses real MCP infrastructure for    // Initialize MCP with enhanced error handling
    await this.initializeMCP();tool discovery and execution.
 */

import type { AIProviderName } from "./core/types.js";
import { AIProviderFactory } from "./index.js";
import { ContextManager } from "./mcp/context-manager.js";
import { mcpLogger } from "./mcp/logging.js";
import { defaultToolRegistry } from "./mcp/registry.js";
import { defaultUnifiedRegistry } from "./mcp/unified-registry.js";
import { logger } from "./utils/logger.js";
import { getBestProvider } from "./utils/providerUtils.js";

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
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  schema?: any;
  disableTools?: boolean; // NEW: Disable MCP tool integration (tools enabled by default)
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
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
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
          const timer = setTimeout(() => {
            reject(new Error("MCP initialization timeout after 3s"));
          }, initTimeout);
          timer.unref(); // Don't keep process alive
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
        prompt: options.prompt.substring(0, 100) + "...",
        contextId: context.sessionId,
      });

      // Get available tools from default registry (simplified approach)
      let availableTools: Array<{
        name: string;
        description: string;
        server: string;
        category?: string;
      }> = [];
      try {
        // Use defaultToolRegistry directly instead of unified registry to avoid hanging
        const allTools = defaultToolRegistry.listTools();
        availableTools = allTools.map((tool) => ({
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
        undefined,
        true,
      );

      // Generate text with automatic tool detection
      const result = await provider.generateText(
        {
          prompt: options.prompt,
          temperature: options.temperature,
          maxTokens: options.maxTokens,
          systemPrompt: enhancedSystemPrompt,
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

    // Local providers that should not fall back when explicitly requested
    const localProviders = ["ollama"];

    // If specific provider requested, check if we should allow fallback
    const tryProviders = requestedProvider
      ? localProviders.includes(requestedProvider)
        ? [requestedProvider] // No fallback for local providers
        : [
            requestedProvider,
            ...providerPriority.filter((p) => p !== requestedProvider),
          ]
      : providerPriority;

    logger.debug(`[${functionTag}] Starting text generation`, {
      requestedProvider: requestedProvider || "auto",
      tryProviders,
      allowFallback:
        !requestedProvider || !localProviders.includes(requestedProvider),
      promptLength: options.prompt.length,
    });

    let lastError: Error | null = null;

    for (const providerName of tryProviders) {
      try {
        logger.debug(`[${functionTag}] Attempting provider`, {
          provider: providerName,
        });

        const provider = await AIProviderFactory.createProvider(providerName);

        const result = await provider.generateText(
          {
            prompt: options.prompt,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
            systemPrompt: options.systemPrompt,
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
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        lastError = error instanceof Error ? error : new Error(errorMessage);

        logger.debug(`[${functionTag}] Provider failed, trying next`, {
          provider: providerName,
          error: errorMessage,
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

    // Local providers that should not fall back when explicitly requested
    const localProviders = ["ollama"];

    // If specific provider requested, check if we should allow fallback
    const tryProviders = requestedProvider
      ? localProviders.includes(requestedProvider)
        ? [requestedProvider] // No fallback for local providers
        : [
            requestedProvider,
            ...providerPriority.filter((p) => p !== requestedProvider),
          ]
      : providerPriority;

    logger.debug(`[${functionTag}] Starting stream generation`, {
      requestedProvider: requestedProvider || "auto",
      tryProviders,
      allowFallback:
        !requestedProvider || !localProviders.includes(requestedProvider),
      promptLength: options.prompt.length,
    });

    let lastError: Error | null = null;

    for (const providerName of tryProviders) {
      try {
        logger.debug(`[${functionTag}] Attempting provider`, {
          provider: providerName,
        });

        const provider = await AIProviderFactory.createProvider(providerName);

        const result = await provider.streamText({
          prompt: options.prompt,
          temperature: options.temperature,
          maxTokens: options.maxTokens,
          systemPrompt: options.systemPrompt,
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

        logger.debug(`[${functionTag}] Provider failed, trying next`, {
          provider: providerName,
          error: errorMessage,
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
      const provider = await AIProviderFactory.createProvider(providerName);
      await provider.generateText(testPrompt);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get access to the unified MCP registry for tool inspection and management
   */
  getUnifiedRegistry() {
    return defaultUnifiedRegistry;
  }

  /**
   * Initialize MCP and return discovery statistics
   */
  async getMCPStatus() {
    await this.initializeMCP();

    const totalServers = defaultUnifiedRegistry.getTotalServerCount();
    const availableServers = defaultUnifiedRegistry.getAvailableServerCount();
    const autoDiscoveredServers =
      defaultUnifiedRegistry.getAutoDiscoveredServers();
    const allTools = await defaultUnifiedRegistry.listAllTools();

    return {
      mcpInitialized: this.mcpInitialized,
      totalServers,
      availableServers,
      autoDiscoveredCount: autoDiscoveredServers.size,
      totalTools: allTools.length,
      autoDiscoveredServers: Array.from(autoDiscoveredServers.entries()).map(
        ([id, server]) => ({
          id: server.id,
          name: server.config?.name || id,
          source: server.source,
          status: server.status,
          hasServer: !!server.server,
        }),
      ),
    };
  }
}
