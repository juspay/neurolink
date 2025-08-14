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
  EvaluationData,
} from "./core/types.js";
import { AIProviderFactory } from "./core/factory.js";

import { mcpLogger } from "./utils/logger.js";
import { SYSTEM_LIMITS } from "./core/constants.js";
import pLimit from "p-limit";
import { toolRegistry } from "./mcp/toolRegistry.js";
import { logger } from "./utils/logger.js";
import { getBestProvider } from "./utils/providerUtils.js";
import { ProviderRegistry } from "./factories/providerRegistry.js";
// NEW: Generate function imports
import type { GenerateOptions, GenerateResult } from "./types/generateTypes.js";
import type { StreamOptions, StreamResult } from "./types/streamTypes.js";
// Tool registration imports
import type { SimpleTool } from "./sdk/toolRegistration.js";
import {
  validateTool,
  createMCPServerFromTools,
} from "./sdk/toolRegistration.js";
import type { InMemoryMCPServerConfig } from "./types/mcpTypes.js";
import type { JsonValue, UnknownRecord } from "./types/common.js";
import type { ToolArgs } from "./types/tools.js";
// Factory processing imports
import {
  processFactoryOptions,
  enhanceTextGenerationOptions,
  validateFactoryConfig,
  processStreamingFactoryOptions,
  createCleanStreamOptions,
} from "./utils/factoryProcessing.js";
// Tool detection and execution imports
import type { NeuroLinkExecutionContext } from "./mcp/factory.js";
// Enhanced error handling imports
import {
  ErrorFactory,
  NeuroLinkError,
  withTimeout,
  withRetry,
  isRetriableError,
  logStructuredError,
  CircuitBreaker,
} from "./utils/errorHandling.js";
import { EventEmitter } from "events";
import type { ConversationMemoryConfig } from "./types/conversationTypes.js";
import { ConversationMemoryManager } from "./core/conversationMemoryManager.js";
import {
  applyConversationMemoryDefaults,
  getConversationMessages,
  storeConversationTurn,
} from "./utils/conversationMemoryUtils.js";
import { ExternalServerManager } from "./mcp/externalServerManager.js";
import type {
  ExternalMCPServerConfig,
  ExternalMCPServerInstance,
  ExternalMCPOperationResult,
  ExternalMCPToolInfo,
} from "./types/externalMcp.js";

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
  externalMCPServersCount?: number;
  externalMCPConnectedCount?: number;
  externalMCPFailedCount?: number;
  externalMCPServers?: MCPServerInfo[];
  error?: string;
  [key: string]: unknown; // Add index signature for flexible object access
}

export interface MCPServerInfo {
  id: string;
  name: string;
  source: string;
  status: "connected" | "discovered" | "failed";
  hasServer: boolean;
  metadata?: unknown;
}

import { ContextManager } from "./context/ContextManager.js";
import { defaultContextConfig } from "./context/config.js";
import type { ContextManagerConfig } from "./context/types.js";

// Core types imported from core/types.js

export class NeuroLink {
  private mcpInitialized = false;
  private emitter = new EventEmitter();
  private contextManager: ContextManager | null = null;

  // Tool registration support
  private customTools: Map<string, SimpleTool> = new Map();
  private inMemoryServers: Map<string, InMemoryMCPServerConfig> = new Map();

  // External MCP server management
  private externalServerManager: ExternalServerManager;

  // Enhanced error handling support
  private toolCircuitBreakers: Map<string, CircuitBreaker> = new Map();
  private toolExecutionMetrics: Map<
    string,
    {
      totalExecutions: number;
      successfulExecutions: number;
      failedExecutions: number;
      averageExecutionTime: number;
      lastExecutionTime: number;
    }
  > = new Map();

  /**
   * Helper method to emit tool end event in a consistent way
   * Used by executeTool in both success and error paths
   * @param toolName - Name of the tool
   * @param startTime - Timestamp when tool execution started
   * @param success - Whether the tool execution was successful
   */
  private emitToolEndEvent(
    toolName: string,
    startTime: number,
    success: boolean,
  ): void {
    this.emitter.emit("tool:end", {
      toolName,
      responseTime: Date.now() - startTime,
      success,
      timestamp: Date.now(),
    });
  }
  // Conversation memory support
  private conversationMemory?: ConversationMemoryManager;

  constructor(config?: {
    conversationMemory?: Partial<ConversationMemoryConfig>;
  }) {
    // SDK always disables manual MCP config for security
    ProviderRegistry.setOptions({
      enableManualMCP: false,
    });

    // Initialize conversation memory if enabled
    if (config?.conversationMemory?.enabled) {
      const memoryConfig = applyConversationMemoryDefaults(
        config.conversationMemory,
      );
      this.conversationMemory = new ConversationMemoryManager(memoryConfig);
      logger.info("NeuroLink initialized with conversation memory", {
        maxSessions: memoryConfig.maxSessions,
        maxTurnsPerSession: memoryConfig.maxTurnsPerSession,
      });
    }

    // Initialize external server manager
    this.externalServerManager = new ExternalServerManager({
      maxServers: 20,
      defaultTimeout: 15000,
      enableAutoRestart: true,
      enablePerformanceMonitoring: true,
    });

    // Forward external server events
    this.externalServerManager.on("connected", (event) => {
      this.emitter.emit("externalMCP:serverConnected", event);
    });

    this.externalServerManager.on("disconnected", (event) => {
      this.emitter.emit("externalMCP:serverDisconnected", event);
    });

    this.externalServerManager.on("failed", (event) => {
      this.emitter.emit("externalMCP:serverFailed", event);
    });

    this.externalServerManager.on("toolDiscovered", (event) => {
      this.emitter.emit("externalMCP:toolDiscovered", event);
      // Tools are already registered on server connection, no need to duplicate here
    });

    this.externalServerManager.on("toolRemoved", (event) => {
      this.emitter.emit("externalMCP:toolRemoved", event);
      // Unregister removed tools from main tool registry
      this.unregisterExternalMCPToolFromRegistry(event.toolName);
    });
  }

  /**
   * Initialize MCP registry with enhanced error handling and resource cleanup
   * Uses isolated async context to prevent hanging
   */
  private async initializeMCP(): Promise<void> {
    if (this.mcpInitialized) {
      return;
    }

    // Track memory usage during MCP initialization
    const { MemoryManager } = await import("./utils/performance.js");
    const startMemory = MemoryManager.getMemoryUsageMB();
    const initStartTime = Date.now();

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

      // Monitor memory usage and provide cleanup suggestions
      const endMemory = MemoryManager.getMemoryUsageMB();
      const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
      const initTime = Date.now() - initStartTime;

      mcpLogger.debug("[NeuroLink] MCP initialization completed successfully", {
        initTime: `${initTime}ms`,
        memoryUsed: `${memoryDelta}MB`,
      });

      // Suggest cleanup if initialization used significant memory
      if (memoryDelta > 30) {
        mcpLogger.debug(
          "💡 Memory cleanup suggestion: MCP initialization used significant memory. Consider calling MemoryManager.forceGC() after heavy operations.",
        );
      }
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
  /**
   * Extracts the original prompt text from the provided input.
   * If a string is provided, it returns the string directly.
   * If a GenerateOptions object is provided, it returns the input text from the object.
   * @param optionsOrPrompt The prompt input, either as a string or a GenerateOptions object.
   * @returns The original prompt text as a string.
   */
  private _extractOriginalPrompt(
    optionsOrPrompt: GenerateOptions | string,
  ): string {
    return typeof optionsOrPrompt === "string"
      ? optionsOrPrompt
      : optionsOrPrompt.input.text;
  }

  /**
   * Enables automatic context summarization for the NeuroLink instance.
   * Once enabled, the instance will maintain conversation history and
   * automatically summarize it when it exceeds token limits.
   * @param config Optional configuration to override default summarization settings.
   */
  public enableContextSummarization(
    config?: Partial<ContextManagerConfig>,
  ): void {
    const contextConfig = {
      ...defaultContextConfig,
      ...config,
    };
    // Pass the internal generator function directly, bound to the correct `this` context.
    this.contextManager = new ContextManager(
      this.generateTextInternal.bind(this),
      contextConfig,
    );
    logger.info("[NeuroLink] Automatic context summarization enabled.");
  }

  async generate(
    optionsOrPrompt: GenerateOptions | string,
  ): Promise<GenerateResult> {
    const originalPrompt = this._extractOriginalPrompt(optionsOrPrompt);
    // Convert string prompt to full options
    const options: GenerateOptions =
      typeof optionsOrPrompt === "string"
        ? { input: { text: optionsOrPrompt } }
        : optionsOrPrompt;

    // Validate prompt
    if (!options.input?.text || typeof options.input.text !== "string") {
      throw new Error("Input text is required and must be a non-empty string");
    }

    // Handle Context Management if enabled
    if (this.contextManager) {
      // Get the full context for the prompt without permanently adding the user's turn yet
      options.input.text = this.contextManager.getContextForPrompt(
        "user",
        options.input.text,
      );
    }

    const startTime = Date.now();

    // Emit generation start event
    this.emitter.emit("generation:start", {
      provider: options.provider || "auto",
      timestamp: startTime,
    });

    // Process factory configuration
    const factoryResult = processFactoryOptions(options);

    // Validate factory configuration if present
    if (factoryResult.hasFactoryConfig && options.factoryConfig) {
      const validation = validateFactoryConfig(options.factoryConfig);
      if (!validation.isValid) {
        logger.warn("Invalid factory configuration detected", {
          errors: validation.errors,
        });
        // Continue with warning rather than throwing - graceful degradation
      }
    }

    // Convert to TextGenerationOptions using factory utilities
    const baseOptions: TextGenerationOptions = {
      prompt: options.input.text,
      provider: options.provider as AIProviderName,
      model: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      systemPrompt: options.systemPrompt,
      disableTools: options.disableTools,
      enableAnalytics: options.enableAnalytics,
      enableEvaluation: options.enableEvaluation,
      context: options.context as Record<string, JsonValue> | undefined,
      evaluationDomain: options.evaluationDomain,
      toolUsageContext: options.toolUsageContext,
    };

    // Apply factory enhancement using centralized utilities
    const textOptions = enhanceTextGenerationOptions(
      baseOptions,
      factoryResult,
    );

    // Detect and execute domain-specific tools
    const { toolResults, enhancedPrompt } = await this.detectAndExecuteTools(
      textOptions.prompt || options.input.text,
      factoryResult.domainType,
    );

    // Update prompt with tool results if available
    if (enhancedPrompt !== textOptions.prompt) {
      textOptions.prompt = enhancedPrompt;
      logger.debug("Enhanced prompt with tool results", {
        originalLength: options.input.text.length,
        enhancedLength: enhancedPrompt.length,
        toolResults: toolResults.length,
      });
    }

    // Use redesigned generation logic
    const textResult = await this.generateTextInternal(textOptions);

    // Emit generation completion event
    this.emitter.emit("generation:end", {
      provider: textResult.provider,
      responseTime: Date.now() - startTime,
      toolsUsed: textResult.toolsUsed,
      timestamp: Date.now(),
    });

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
      toolExecutions:
        textResult.toolExecutions?.map((te) => {
          const teRecord = te as UnknownRecord;
          return {
            name: (teRecord.name as string) || "", // ✅ BaseProvider now provides 'name'
            input: (teRecord.input as Record<string, unknown>) || {},
            output: (teRecord.output as unknown) || "success",
            duration: (teRecord.duration as number) || 0,
          };
        }) || [],
      enhancedWithTools: textResult.enhancedWithTools,
      availableTools: textResult.availableTools?.map((tool) => {
        const toolRecord = tool as UnknownRecord;
        return {
          name: tool.name || "",
          description: tool.description || "",
          server: tool.server || "", // ✅ FIX: Include server property
          parameters:
            (toolRecord.parameters as Record<string, unknown>) ||
            (toolRecord.schema as Record<string, unknown>) ||
            {},
        };
      }),
      analytics: textResult.analytics,
      evaluation: textResult.evaluation
        ? {
            ...textResult.evaluation,
            isOffTopic:
              ((textResult.evaluation as UnknownRecord)
                .isOffTopic as boolean) ?? false,
            alertSeverity:
              ((textResult.evaluation as UnknownRecord).alertSeverity as
                | "low"
                | "medium"
                | "high"
                | "none") ?? ("none" as const),
            reasoning:
              ((textResult.evaluation as UnknownRecord).reasoning as string) ??
              "No evaluation provided",
            evaluationModel:
              ((textResult.evaluation as UnknownRecord)
                .evaluationModel as string) ?? "unknown",
            evaluationTime:
              ((textResult.evaluation as UnknownRecord)
                .evaluationTime as number) ?? Date.now(),
            // Include evaluationDomain from original options
            evaluationDomain:
              ((textResult.evaluation as UnknownRecord)
                .evaluationDomain as string) ??
              textOptions.evaluationDomain ??
              factoryResult.domainType,
          }
        : undefined,
    };

    // Add both the user's turn and the AI's response to the permanent history
    if (this.contextManager) {
      await this.contextManager.addTurn("user", originalPrompt);
      await this.contextManager.addTurn("assistant", generateResult.content);
    }

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
   * 1. Initialize conversation memory if enabled
   * 2. Inject conversation history into prompt
   * 3. Try MCP-enhanced generation if available
   * 4. Fall back to direct provider generation
   * 5. Store conversation turn for future context
   */
  private async generateTextInternal(
    options: TextGenerationOptions,
  ): Promise<TextGenerationResult> {
    const startTime = Date.now();
    const functionTag = "NeuroLink.generateTextInternal";

    logger.debug(`[${functionTag}] Starting generation`, {
      provider: options.provider || "auto",
      promptLength: options.prompt?.length || 0,
      hasConversationMemory: !!this.conversationMemory,
    });

    try {
      // Initialize conversation memory if enabled
      if (this.conversationMemory) {
        await this.conversationMemory.initialize();
      }

      // Try MCP-enhanced generation first (if not explicitly disabled)
      if (!options.disableTools) {
        try {
          logger.debug(`[${functionTag}] Attempting MCP generation...`);
          const mcpResult = await this.tryMCPGeneration(options);
          if (mcpResult && mcpResult.content) {
            logger.debug(`[${functionTag}] MCP generation successful`);

            // Store conversation turn
            await storeConversationTurn(
              this.conversationMemory,
              options,
              mcpResult,
            );

            return mcpResult;
          } else {
            logger.debug(
              `[${functionTag}] MCP generation returned empty result:`,
              {
                hasResult: !!mcpResult,
                hasContent: !!(mcpResult && mcpResult.content),
                contentLength: mcpResult?.content?.length || 0,
              },
            );
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

      // Store conversation turn
      await storeConversationTurn(
        this.conversationMemory,
        options,
        directResult,
      );

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
    const startTime = Date.now();

    try {
      // Initialize MCP if needed
      await this.initializeMCP();

      if (!this.mcpInitialized) {
        return null; // Skip MCP if not available
      }

      // Context creation removed - was never used

      // Determine provider
      const providerName =
        options.provider === "auto" || !options.provider
          ? await getBestProvider()
          : options.provider;

      // Get available tools
      const availableTools = await this.getAllAvailableTools();

      // Create tool-aware system prompt
      const enhancedSystemPrompt = this.createToolAwareSystemPrompt(
        options.systemPrompt,
        availableTools,
      );

      // Get conversation messages for context
      const conversationMessages = await getConversationMessages(
        this.conversationMemory,
        options,
      );

      // Create provider and generate
      const provider = await AIProviderFactory.createProvider(
        providerName as AIProviderName,
        options.model,
        !options.disableTools, // Pass disableTools as inverse of enableMCP
        this as unknown as UnknownRecord, // Pass SDK instance
      );

      // Enable tool execution for the provider using BaseProvider method
      provider.setupToolExecutor(
        {
          customTools: this.customTools,
          executeTool: this.executeTool.bind(this),
        },
        functionTag,
      );

      const result = await provider.generate({
        ...options,
        systemPrompt: enhancedSystemPrompt,
        conversationMessages, // Inject conversation history
      });

      const responseTime = Date.now() - startTime;

      // Check if result is meaningful
      if (!result || !result.content || result.content.trim().length === 0) {
        return null; // Let caller fall back to direct generation
      }

      // Return enhanced result with external tool information
      return {
        content: result.content,
        provider: providerName,
        usage: result.usage,
        responseTime,
        toolsUsed: result.toolsUsed || [],
        toolExecutions:
          result.toolExecutions?.map((te) => {
            const teRecord = te as UnknownRecord;
            return {
              toolName: (teRecord.name as string) || "",
              executionTime: (teRecord.duration as number) || 0,
              success: true, // Assume success if tool executed (AI providers handle failures differently)
              serverId: (teRecord.serverId as string) || undefined,
            };
          }) || [],
        enhancedWithTools: true,
        availableTools: availableTools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          server: tool.server,
          category: tool.category,
        })),
        // Include analytics and evaluation from BaseProvider
        analytics: result.analytics,
        evaluation: result.evaluation,
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

        // Get conversation messages for context
        const conversationMessages = await getConversationMessages(
          this.conversationMemory,
          options,
        );

        const provider = await AIProviderFactory.createProvider(
          providerName as AIProviderName,
          options.model,
          !options.disableTools, // Pass disableTools as inverse of enableMCP
          this as unknown as UnknownRecord, // Pass SDK instance
        );

        // Enable tool execution for direct provider generation using BaseProvider method
        provider.setupToolExecutor(
          {
            customTools: this.customTools,
            executeTool: this.executeTool.bind(this),
          },
          functionTag,
        );

        const result = await provider.generate({
          ...options,
          conversationMessages, // Inject conversation history
        });
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
          toolsUsed: result.toolsUsed || [],
          enhancedWithTools: false,
          analytics: result.analytics,
          evaluation: result.evaluation,
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
      .map((tool) => {
        const toolWithSchema = tool as any;
        const schema = (toolWithSchema.inputSchema ||
          toolWithSchema.parameters) as {
          properties?: any;
          required?: string[];
        };
        let params = "";
        if (schema && schema.properties) {
          const requiredParams = new Set(schema.required || []);
          params = Object.entries(schema.properties)
            .map(([key, value]: [string, any]) => {
              const required = requiredParams.has(key) ? " (required)" : "";
              return `  - ${key}: ${value.type}${required}`;
            })
            .join("\n");
        }
        return `- ${tool.name}: ${tool.description} (from ${tool.server})\n${params}`;
      })
      .join("\n\n");

    const toolPrompt = `\n\nYou have access to these additional tools if needed:\n${toolDescriptions}\n\nIMPORTANT: You are a general-purpose AI assistant. Answer all requests directly and creatively. These tools are optional helpers - use them only when they would genuinely improve your response. For creative tasks like storytelling, writing, or general conversation, respond naturally without requiring tools.`;

    return (originalSystemPrompt || "") + toolPrompt;
  }

  /**
   * Execute tools if available through centralized registry
   * Simplified approach without domain detection - relies on tool registry
   */
  private async detectAndExecuteTools(
    prompt: string,
    domainType?: string,
  ): Promise<{ toolResults: unknown[]; enhancedPrompt: string }> {
    const functionTag = "NeuroLink.detectAndExecuteTools";

    try {
      // Simplified: Just return original prompt without complex detection
      // Tools will be available through normal MCP flow when AI decides to use them
      logger.debug(
        `[${functionTag}] Skipping automatic tool execution - relying on centralized registry`,
      );

      return { toolResults: [], enhancedPrompt: prompt };
    } catch (error) {
      logger.error(`[${functionTag}] Tool detection/execution failed`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return { toolResults: [], enhancedPrompt: prompt };
    }
  }

  /**
   * Enhance prompt with tool results (domain-agnostic)
   */
  private enhancePromptWithToolResults(
    prompt: string,
    toolResults: unknown[],
  ): string {
    if (toolResults.length === 0) {
      return prompt;
    }

    let enhancedPrompt = prompt;

    for (const result of toolResults) {
      if (result && typeof result === "object") {
        enhancedPrompt += `\n\nTool Results:\n`;

        // Handle any structured result generically
        try {
          const resultStr =
            typeof result === "string"
              ? result
              : JSON.stringify(result, null, 2);
          enhancedPrompt += resultStr + "\n";
        } catch {
          enhancedPrompt += "Tool execution completed\n";
        }
      }
    }

    return enhancedPrompt;
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

    // Emit stream start event
    this.emitter.emit("stream:start", {
      provider: options.provider || "auto",
      timestamp: startTime,
    });

    // Process factory configuration for streaming
    const factoryResult = processFactoryOptions(options);
    const streamingResult = processStreamingFactoryOptions(options);

    // Validate factory configuration if present
    if (factoryResult.hasFactoryConfig && options.factoryConfig) {
      const validation = validateFactoryConfig(options.factoryConfig);
      if (!validation.isValid) {
        mcpLogger.warn("Invalid factory configuration detected in stream", {
          errors: validation.errors,
        });
        // Continue with warning rather than throwing - graceful degradation
      }
    }

    // Log factory processing results
    if (factoryResult.hasFactoryConfig) {
      mcpLogger.debug(`[${functionTag}] Factory configuration detected`, {
        domainType: factoryResult.domainType,
        enhancementType: factoryResult.enhancementType,
        hasStreamingConfig: streamingResult.hasStreamingConfig,
      });
    }

    // Initialize MCP if needed
    await this.initializeMCP();

    // Context creation removed - was never used

    // Determine provider to use
    const providerName =
      options.provider === "auto" || !options.provider
        ? await getBestProvider()
        : options.provider;

    // Prepare enhanced options for both success and fallback paths
    let enhancedOptions = options;
    if (factoryResult.hasFactoryConfig) {
      enhancedOptions = {
        ...options,
        // Merge contexts instead of overriding to preserve provider-required context
        context: {
          ...(options.context || {}),
          ...(factoryResult.processedContext || {}),
        } as UnknownRecord,
        // Ensure evaluation is enabled when using factory patterns
        enableEvaluation: options.enableEvaluation ?? true,
        // Use domain type for evaluation if available
        evaluationDomain: factoryResult.domainType || options.evaluationDomain,
      };

      mcpLogger.debug(
        `[${functionTag}] Enhanced stream options with factory config`,
        {
          domainType: factoryResult.domainType,
          enhancementType: factoryResult.enhancementType,
          hasProcessedContext: !!factoryResult.processedContext,
        },
      );
    }

    try {
      mcpLogger.debug(`[${functionTag}] Starting MCP-enabled streaming`, {
        provider: providerName,
        prompt: (options.input.text?.substring(0, 100) || "No text") + "...",
      });

      // Create provider using the same factory pattern as generate
      const provider = await AIProviderFactory.createBestProvider(
        providerName,
        options.model,
        true,
        this as unknown as UnknownRecord, // Pass SDK instance
      );

      // Enable tool execution for streaming using BaseProvider method
      provider.setupToolExecutor(
        {
          customTools: this.customTools,
          executeTool: this.executeTool.bind(this),
        },
        functionTag,
      );

      // Create clean options for provider (remove factoryConfig)
      const cleanOptions = createCleanStreamOptions(enhancedOptions);

      // Call the provider's stream method with clean options
      const streamResult = await provider.stream(cleanOptions);

      // Extract the stream from the result
      const stream = streamResult.stream;

      const responseTime = Date.now() - startTime;

      mcpLogger.debug(`[${functionTag}] MCP-enabled streaming completed`, {
        responseTime,
        provider: providerName,
      });

      // Emit stream completion event
      this.emitter.emit("stream:end", {
        provider: providerName,
        responseTime,
      });

      // Convert to StreamResult format - Include analytics and evaluation from provider
      return {
        stream,
        provider: providerName,
        model: options.model,
        usage: streamResult.usage,
        finishReason: streamResult.finishReason,
        toolCalls: streamResult.toolCalls,
        toolResults: streamResult.toolResults,
        analytics: streamResult.analytics,
        evaluation: streamResult.evaluation
          ? {
              ...(streamResult.evaluation as EvaluationData),
              // Include evaluationDomain from factory configuration
              evaluationDomain:
                ((streamResult.evaluation as unknown as UnknownRecord)
                  ?.evaluationDomain as string) ??
                enhancedOptions.evaluationDomain ??
                factoryResult.domainType,
            }
          : undefined,
        metadata: {
          streamId: `neurolink-${Date.now()}`,
          startTime,
          responseTime,
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
        this as unknown as UnknownRecord, // Pass SDK instance
      );

      // Enable tool execution for fallback streaming using BaseProvider method
      provider.setupToolExecutor(
        {
          customTools: this.customTools,
          executeTool: this.executeTool.bind(this),
        },
        functionTag,
      );

      // Create clean options for fallback provider (remove factoryConfig)
      const cleanOptions = createCleanStreamOptions(enhancedOptions);

      const streamResult = await provider.stream(cleanOptions);
      const responseTime = Date.now() - startTime;

      // Emit stream completion event for fallback
      this.emitter.emit("stream:end", {
        provider: providerName,
        responseTime,
        fallback: true,
      });

      return {
        stream: streamResult.stream,
        provider: providerName,
        model: options.model,
        usage: streamResult.usage,
        finishReason: streamResult.finishReason,
        toolCalls: streamResult.toolCalls,
        toolResults: streamResult.toolResults,
        analytics: streamResult.analytics,
        evaluation: streamResult.evaluation
          ? {
              ...(streamResult.evaluation as EvaluationData),
              // Include evaluationDomain in fallback stream
              evaluationDomain:
                ((streamResult.evaluation as unknown as UnknownRecord)
                  ?.evaluationDomain as string) ??
                enhancedOptions.evaluationDomain ??
                factoryResult.domainType,
            }
          : undefined,
        metadata: {
          streamId: `neurolink-${Date.now()}`,
          startTime,
          responseTime,
          fallback: true,
        },
      };
    }
  }

  /**
   * Get the EventEmitter to listen to NeuroLink events
   * @returns EventEmitter instance
   */
  getEventEmitter() {
    return this.emitter;
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
    // Emit tool registration start event
    this.emitter.emit("tools-register:start", {
      toolName: name,
      timestamp: Date.now(),
    });

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

      // Emit tool registration success event
      this.emitter.emit("tools-register:end", {
        toolName: name,
        success: true,
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error(`Failed to register tool ${name}:`, error);
      throw error;
    }
  }

  /**
   * Register multiple tools at once - Supports both object and array formats
   * @param tools - Object mapping tool names to configurations OR Array of tools with names
   *
   * Object format (existing): { toolName: SimpleTool, ... }
   * Array format (Lighthouse compatible): [{ name: string, tool: SimpleTool }, ...]
   */
  registerTools(
    tools:
      | Record<string, SimpleTool>
      | Array<{ name: string; tool: SimpleTool }>,
  ): void {
    if (Array.isArray(tools)) {
      // Handle array format (Lighthouse compatible)
      for (const { name, tool } of tools) {
        this.registerTool(name, tool);
      }
    } else {
      // Handle object format (existing compatibility)
      for (const [name, tool] of Object.entries(tools)) {
        this.registerTool(name, tool);
      }
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
   * Execute a specific tool by name with robust error handling
   * Supports both custom tools and MCP server tools with timeout, retry, and circuit breaker patterns
   * @param toolName - Name of the tool to execute
   * @param params - Parameters to pass to the tool
   * @param options - Execution options
   * @returns Tool execution result
   */
  async executeTool<T = unknown>(
    toolName: string,
    params: unknown = {},
    options?: {
      timeout?: number;
      maxRetries?: number;
      retryDelayMs?: number;
    },
  ): Promise<T> {
    const functionTag = "NeuroLink.executeTool";
    const executionStartTime = Date.now();

    // Debug: Log tool execution attempt
    logger.debug(`[${functionTag}] Tool execution requested:`, {
      toolName,
      params:
        typeof params === "object"
          ? Object.keys(params as any).length + " params"
          : params,
      hasExternalManager: !!this.externalServerManager,
    });

    // Emit tool start event
    this.emitter.emit("tool:start", {
      toolName,
      timestamp: executionStartTime,
    });

    // Set default options
    const finalOptions = {
      timeout: options?.timeout || 30000, // 30 second default timeout
      maxRetries: options?.maxRetries || 2, // Default 2 retries for retriable errors
      retryDelayMs: options?.retryDelayMs || 1000, // 1 second delay between retries
    };

    // Track memory usage for tool execution
    const { MemoryManager } = await import("./utils/performance.js");
    const startMemory = MemoryManager.getMemoryUsageMB();

    // Get or create circuit breaker for this tool
    if (!this.toolCircuitBreakers.has(toolName)) {
      this.toolCircuitBreakers.set(toolName, new CircuitBreaker(5, 60000)); // 5 failures, 1 minute timeout
    }
    const circuitBreaker = this.toolCircuitBreakers.get(toolName)!;

    // Initialize metrics for this tool if not exists
    if (!this.toolExecutionMetrics.has(toolName)) {
      this.toolExecutionMetrics.set(toolName, {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        lastExecutionTime: 0,
      });
    }
    const metrics = this.toolExecutionMetrics.get(toolName)!;
    metrics.totalExecutions++;

    try {
      mcpLogger.debug(`[${functionTag}] Executing tool: ${toolName}`, {
        toolName,
        params,
        options: finalOptions,
        circuitBreakerState: circuitBreaker.getState(),
      });

      // Execute with circuit breaker, timeout, and retry logic
      const result = await circuitBreaker.execute(async () => {
        return await withRetry(
          async () => {
            return await withTimeout(
              this.executeToolInternal<T>(toolName, params, finalOptions),
              finalOptions.timeout,
              ErrorFactory.toolTimeout(toolName, finalOptions.timeout),
            );
          },
          {
            maxAttempts: finalOptions.maxRetries + 1, // +1 for initial attempt
            delayMs: finalOptions.retryDelayMs,
            isRetriable: isRetriableError,
            onRetry: (attempt, error) => {
              mcpLogger.warn(
                `[${functionTag}] Retrying tool execution (attempt ${attempt})`,
                {
                  toolName,
                  error: error.message,
                  attempt,
                },
              );
            },
          },
        );
      });

      // Update success metrics
      const executionTime = Date.now() - executionStartTime;
      metrics.successfulExecutions++;
      metrics.lastExecutionTime = executionTime;
      metrics.averageExecutionTime =
        (metrics.averageExecutionTime * (metrics.successfulExecutions - 1) +
          executionTime) /
        metrics.successfulExecutions;

      // Track memory usage
      const endMemory = MemoryManager.getMemoryUsageMB();
      const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

      if (memoryDelta > 20) {
        mcpLogger.warn(
          `Tool '${toolName}' used excessive memory: ${memoryDelta}MB`,
          {
            toolName,
            memoryDelta,
            executionTime,
          },
        );
      }

      mcpLogger.debug(`[${functionTag}] Tool executed successfully`, {
        toolName,
        executionTime,
        memoryDelta,
        circuitBreakerState: circuitBreaker.getState(),
      });

      // Emit tool end event using the helper method
      this.emitToolEndEvent(toolName, executionStartTime, true);

      return result;
    } catch (error) {
      // Update failure metrics
      metrics.failedExecutions++;
      const executionTime = Date.now() - executionStartTime;

      // Create structured error
      let structuredError: NeuroLinkError;

      if (error instanceof NeuroLinkError) {
        structuredError = error;
      } else if (error instanceof Error) {
        // Categorize the error based on the message
        if (error.message.includes("timeout")) {
          structuredError = ErrorFactory.toolTimeout(
            toolName,
            finalOptions.timeout,
          );
        } else if (error.message.includes("not found")) {
          const availableTools = Array.from(this.customTools.keys());
          structuredError = ErrorFactory.toolNotFound(toolName, availableTools);
        } else if (
          error.message.includes("validation") ||
          error.message.includes("parameter")
        ) {
          structuredError = ErrorFactory.invalidParameters(
            toolName,
            error,
            params,
          );
        } else if (
          error.message.includes("network") ||
          error.message.includes("connection")
        ) {
          structuredError = ErrorFactory.networkError(toolName, error);
        } else {
          structuredError = ErrorFactory.toolExecutionFailed(toolName, error);
        }
      } else {
        structuredError = ErrorFactory.toolExecutionFailed(
          toolName,
          new Error(String(error)),
        );
      }

      // Emit tool end event using the helper method
      this.emitToolEndEvent(toolName, executionStartTime, false);

      // Add execution context to structured error
      structuredError = new NeuroLinkError({
        ...structuredError,
        context: {
          ...structuredError.context,
          executionTime,
          params,
          options: finalOptions,
          circuitBreakerState: circuitBreaker.getState(),
          circuitBreakerFailures: circuitBreaker.getFailureCount(),
          metrics: { ...metrics },
        },
      });

      // Log structured error
      logStructuredError(structuredError);

      throw structuredError;
    }
  }

  /**
   * Internal tool execution method (extracted for better error handling)
   */
  private async executeToolInternal<T = unknown>(
    toolName: string,
    params: unknown,
    options: { timeout: number; maxRetries: number; retryDelayMs: number },
  ): Promise<T> {
    const functionTag = "NeuroLink.executeToolInternal";

    // First check custom tools
    if (this.customTools.has(toolName)) {
      const tool = this.customTools.get(toolName)!;

      // Validate parameters if schema is available
      if (tool.parameters) {
        try {
          tool.parameters.parse(params);
        } catch (validationError) {
          throw ErrorFactory.invalidParameters(
            toolName,
            validationError as Error,
            params,
          );
        }
      }

      const context = {
        sessionId: `direct-execution-${Date.now()}`,
        logger,
      };

      try {
        const result = await tool.execute(params as ToolArgs, context);
        return result as T;
      } catch (error) {
        throw ErrorFactory.toolExecutionFailed(
          toolName,
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }

    // Then check in-memory servers
    for (const [serverId, serverConfig] of this.inMemoryServers.entries()) {
      const server = serverConfig.server;

      if (server && server.tools) {
        const tool =
          server.tools instanceof Map
            ? server.tools.get(toolName)
            : server.tools[toolName];

        if (tool && typeof tool.execute === "function") {
          try {
            const result = await tool.execute(params);

            // Handle MCP-style results
            if (result && typeof result === "object" && "success" in result) {
              if (result.success) {
                return result.data as T;
              } else {
                throw ErrorFactory.toolExecutionFailed(
                  toolName,
                  new Error(result.error || "Tool execution failed"),
                  serverId,
                );
              }
            }

            return result as T;
          } catch (error) {
            throw ErrorFactory.toolExecutionFailed(
              toolName,
              error instanceof Error ? error : new Error(String(error)),
              serverId,
            );
          }
        }
      }
    }

    // Check external MCP servers
    const externalTools = this.externalServerManager.getAllTools();
    const externalTool = externalTools.find((tool) => tool.name === toolName);

    logger.debug(`[${functionTag}] External MCP tool search:`, {
      toolName,
      externalToolsCount: externalTools.length,
      foundTool: !!externalTool,
      isAvailable: externalTool?.isAvailable,
      serverId: externalTool?.serverId,
    });

    if (externalTool && externalTool.isAvailable) {
      try {
        mcpLogger.debug(
          `[${functionTag}] Executing external MCP tool: ${toolName} from ${externalTool.serverId}`,
        );

        const result = await this.externalServerManager.executeTool(
          externalTool.serverId,
          toolName,
          params as Record<string, any>,
          { timeout: options.timeout },
        );

        logger.debug(
          `[${functionTag}] External MCP tool execution successful:`,
          {
            toolName,
            serverId: externalTool.serverId,
            resultType: typeof result,
          },
        );

        return result as T;
      } catch (error) {
        logger.error(`[${functionTag}] External MCP tool execution failed:`, {
          toolName,
          serverId: externalTool.serverId,
          error: error instanceof Error ? error.message : String(error),
        });
        throw ErrorFactory.toolExecutionFailed(
          toolName,
          error instanceof Error ? error : new Error(String(error)),
          externalTool.serverId,
        );
      }
    }

    // If not found in custom tools, in-memory servers, or external servers, try unified registry
    try {
      const context = {
        sessionId: `neurolink-tool-${Date.now()}`,
        userId: "neurolink-user",
      };

      const result = (await toolRegistry.executeTool(
        toolName,
        params,
        context,
      )) as T;

      return result;
    } catch (error) {
      // Check if tool was not found
      if (error instanceof Error && error.message.includes("not found")) {
        const availableTools = await this.getAllAvailableTools();
        throw ErrorFactory.toolNotFound(
          toolName,
          availableTools.map((t) => t.name),
        );
      }

      throw ErrorFactory.toolExecutionFailed(
        toolName,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Get all available tools including custom and in-memory ones
   * @returns Array of available tools with metadata
   */
  async getAllAvailableTools() {
    // Track memory usage for tool listing operations
    const { MemoryManager } = await import("./utils/performance.js");
    const startMemory = MemoryManager.getMemoryUsageMB();

    try {
      // 1. Get MCP server tools (built-in direct tools)
      const mcpToolsRaw = await toolRegistry.listTools();
      const mcpTools = mcpToolsRaw.map((tool) => ({
        ...tool,
        toolName: tool.name, // Add toolName property for compatibility with tests
        serverId:
          tool.serverId === "direct" ? "neurolink-direct" : tool.serverId, // Update serverId for test compatibility
      }));

      // 2. Get custom tools from this NeuroLink instance
      const customTools = Array.from(this.customTools.entries()).map(
        ([name, tool]) => ({
          name,
          toolName: name, // Add toolName property for compatibility with tests
          description: tool.description || "Custom tool",
          serverId: `custom-tool-${name}`, // Match the serverId pattern used in registerTool
          category: "user-defined",
          inputSchema: {},
        }),
      );

      // 3. Get tools from in-memory MCP servers
      const inMemoryTools: Array<{
        name: string;
        toolName: string;
        description: string;
        serverId: string;
        category: string;
        inputSchema: Record<string, unknown>;
      }> = [];

      for (const [serverId, serverConfig] of this.inMemoryServers.entries()) {
        const server = serverConfig.server;
        if (server && server.tools) {
          const tools =
            server.tools instanceof Map
              ? Object.fromEntries(server.tools)
              : server.tools;

          for (const [toolName, toolDef] of Object.entries(tools)) {
            const toolRecord = toolDef as unknown as UnknownRecord;
            inMemoryTools.push({
              name: toolName,
              toolName, // Add toolName property for compatibility with tests
              description:
                (toolRecord.description as string) || "In-memory MCP tool",
              serverId,
              category: serverConfig.category || "mcp-server",
              inputSchema: {},
            });
          }
        }
      }

      // 4. Get external MCP tools
      const externalMCPTools = this.externalServerManager
        .getAllTools()
        .map((tool) => ({
          name: tool.name,
          toolName: tool.name,
          description: tool.description,
          serverId: tool.serverId,
          category: tool.metadata?.category || "external-mcp",
          inputSchema: tool.inputSchema || {},
          isAvailable: tool.isAvailable,
          stats: tool.stats,
        }));

      // 5. Combine all tools with deduplication by name
      const combinedTools = [
        ...mcpTools,
        ...customTools,
        ...inMemoryTools,
        ...externalMCPTools,
      ];

      const uniqueTools = Array.from(
        combinedTools
          .reduce((map, tool) => {
            const key = tool.name;
            if (!map.has(key)) {
              map.set(key, tool);
            }
            return map;
          }, new Map<string, any>())
          .values(),
      );

      mcpLogger.debug("Tool discovery results", {
        mcpTools: mcpTools.length,
        customTools: customTools.length,
        inMemoryTools: inMemoryTools.length,
        externalMCPTools: externalMCPTools.length,
        total: uniqueTools.length,
      });

      // Check memory usage after tool enumeration
      const endMemory = MemoryManager.getMemoryUsageMB();
      const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

      if (memoryDelta > 10) {
        mcpLogger.debug(
          `🔍 Tool listing used ${memoryDelta}MB memory (large tool registry detected)`,
        );
        // Suggest periodic cleanup for large tool registries
        if (uniqueTools.length > 100) {
          mcpLogger.debug(
            "💡 Suggestion: Consider using tool categories or lazy loading for large tool sets",
          );
        }
      }

      return uniqueTools;
    } catch (error) {
      mcpLogger.error("Failed to list available tools", { error });
      return [];
    }
  }

  // ============================================================================
  // PROVIDER DIAGNOSTICS - SDK-First Architecture
  // ============================================================================

  /**
   * Get comprehensive status of all AI providers
   * Primary method for provider health checking and diagnostics
   */
  async getProviderStatus(options?: {
    quiet?: boolean;
  }): Promise<ProviderStatus[]> {
    // Track memory and timing for provider status checks
    const { MemoryManager } = await import("./utils/performance.js");
    const startMemory = MemoryManager.getMemoryUsageMB();

    // Ensure providers are registered before testing
    if (!options?.quiet) {
      mcpLogger.debug("🔍 DEBUG: Initializing MCP for provider status...");
    }
    await this.initializeMCP();
    if (!options?.quiet) {
      mcpLogger.debug("🔍 DEBUG: MCP initialized:", this.mcpInitialized);
    }

    const { AIProviderFactory } = await import("./core/factory.js");
    const { hasProviderEnvVars } = await import("./utils/providerUtils.js");

    const providers = [
      "openai",
      "bedrock",
      "vertex",
      "googleVertex",
      "anthropic",
      "azure",
      "google-ai",
      "huggingface",
      "ollama",
      "mistral",
      "litellm",
    ] as const;

    // Test providers with controlled concurrency
    // This reduces total time from 16s (sequential) to ~3s (parallel) while preventing resource exhaustion
    const limit = pLimit(SYSTEM_LIMITS.DEFAULT_CONCURRENCY_LIMIT);
    const providerTests = providers.map((providerName) =>
      limit(async () => {
        const startTime = Date.now();

        try {
          // Check if provider has required environment variables
          const hasEnvVars = await this.hasProviderEnvVars(providerName);

          if (!hasEnvVars && providerName !== "ollama") {
            return {
              provider: providerName,
              status: "not-configured" as const,
              configured: false,
              authenticated: false,
              error: "Missing required environment variables",
              responseTime: Date.now() - startTime,
            };
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
                (m: UnknownRecord) => m.name === defaultOllamaModel,
              );

              if (modelIsAvailable) {
                return {
                  provider: providerName,
                  status: "working" as const,
                  configured: true,
                  authenticated: true,
                  responseTime: Date.now() - startTime,
                  model: defaultOllamaModel,
                };
              } else {
                return {
                  provider: providerName,
                  status: "failed" as const,
                  configured: true,
                  authenticated: false,
                  error: `Ollama service running but model '${defaultOllamaModel}' not found`,
                  responseTime: Date.now() - startTime,
                };
              }
            } catch (error) {
              return {
                provider: providerName,
                status: "failed" as const,
                configured: false,
                authenticated: false,
                error:
                  error instanceof Error
                    ? error.message
                    : "Ollama service not running",
                responseTime: Date.now() - startTime,
              };
            }
          }

          // Test other providers with actual generation call
          const testTimeout = 5000;
          const testPromise = this.testProviderConnection(providerName);
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(
              () => reject(new Error("Provider test timeout (5s)")),
              testTimeout,
            );
          });

          await Promise.race([testPromise, timeoutPromise]);

          return {
            provider: providerName,
            status: "working" as const,
            configured: true,
            authenticated: true,
            responseTime: Date.now() - startTime,
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          return {
            provider: providerName,
            status: "failed" as const,
            configured: true,
            authenticated: false,
            error: errorMessage,
            responseTime: Date.now() - startTime,
          };
        }
      }),
    );

    // Wait for all provider tests to complete in parallel
    const results = await Promise.all(providerTests);

    // Track memory usage and suggest cleanup if needed
    const endMemory = MemoryManager.getMemoryUsageMB();
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

    if (!options?.quiet && memoryDelta > 20) {
      mcpLogger.debug(
        `🔍 Memory usage: +${memoryDelta}MB (consider cleanup for large operations)`,
      );
    }

    // Suggest garbage collection for large memory increases
    if (memoryDelta > 50) {
      MemoryManager.forceGC();
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
      providerName as AIProviderName,
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
    try {
      // Get built-in tools
      const allTools = await toolRegistry.listTools();

      // Get external MCP server statistics
      const externalStats = this.externalServerManager.getStatistics();
      const externalServers = this.listExternalMCPServers();

      // Calculate totals
      const totalServers =
        1 + externalStats.totalServers + this.inMemoryServers.size; // toolRegistry + external + in-memory
      const availableServers = 1 + externalStats.connectedServers; // toolRegistry always available + connected external
      const totalTools =
        allTools.length + externalStats.totalTools + this.customTools.size;

      // Convert external servers to MCPServerInfo format
      const externalMCPServers: MCPServerInfo[] = externalServers.map(
        (server) => ({
          id: server.serverId,
          name:
            typeof server.config.metadata?.title === "string"
              ? server.config.metadata.title
              : server.serverId,
          source: `external-${server.config.transport}`,
          status: server.status as "connected" | "discovered" | "failed",
          hasServer: server.isHealthy,
          metadata: {
            transport: server.config.transport,
            command: server.config.command,
            toolCount: server.toolCount,
            uptime: server.uptime,
          },
        }),
      );

      return {
        mcpInitialized: this.mcpInitialized,
        totalServers,
        availableServers,
        autoDiscoveredCount: 0, // No auto-discovery for external servers
        totalTools,
        autoDiscoveredServers: [],
        customToolsCount: this.customTools.size,
        inMemoryServersCount: this.inMemoryServers.size,
        externalMCPServersCount: externalStats.totalServers,
        externalMCPConnectedCount: externalStats.connectedServers,
        externalMCPFailedCount: externalStats.failedServers,
        externalMCPServers,
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
        externalMCPServersCount: 0,
        externalMCPConnectedCount: 0,
        externalMCPFailedCount: 0,
        externalMCPServers: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * List all configured MCP servers with their status
   * @returns Promise resolving to array of MCP server information
   */
  async listMCPServers(): Promise<MCPServerInfo[]> {
    const servers: MCPServerInfo[] = [];

    // Add built-in toolRegistry as a server
    servers.push({
      id: "neurolink-direct",
      name: "NeuroLink Built-in Tools",
      source: "built-in",
      status: "connected",
      hasServer: true,
      metadata: {
        type: "direct-tools",
        description:
          "Built-in NeuroLink tools (getCurrentTime, readFile, etc.)",
      },
    });

    // Add in-memory servers
    for (const [serverId, serverConfig] of this.inMemoryServers.entries()) {
      servers.push({
        id: serverId,
        name: serverConfig.server.title || serverId,
        source: "in-memory",
        status: "connected",
        hasServer: true,
        metadata: {
          category: serverConfig.category,
          provider: serverConfig.metadata?.provider,
          version: serverConfig.metadata?.version,
        },
      });
    }

    // Add external MCP servers
    const externalServers = this.listExternalMCPServers();
    for (const server of externalServers) {
      servers.push({
        id: server.serverId,
        name:
          typeof server.config.metadata?.title === "string"
            ? server.config.metadata.title
            : server.serverId,
        source: `external-${server.config.transport}`,
        status: server.status as "connected" | "discovered" | "failed",
        hasServer: server.isHealthy,
        metadata: {
          transport: server.config.transport,
          command: server.config.command,
          toolCount: server.toolCount,
          uptime: server.uptime,
        },
      });
    }

    return servers;
  }

  /**
   * Test connectivity to a specific MCP server
   * @param serverId - ID of the MCP server to test
   * @returns Promise resolving to true if server is reachable
   */
  async testMCPServer(serverId: string): Promise<boolean> {
    try {
      // Test built-in tools
      if (serverId === "neurolink-direct") {
        const tools = await toolRegistry.listTools();
        return tools.length > 0;
      }

      // Test in-memory servers
      if (this.inMemoryServers.has(serverId)) {
        const serverConfig = this.inMemoryServers.get(serverId)!;
        return !!(serverConfig.server && serverConfig.server.tools);
      }

      // Test external MCP servers
      const externalServer = this.externalServerManager.getServer(serverId);
      if (externalServer) {
        return (
          externalServer.status === "connected" &&
          externalServer.client !== null
        );
      }

      return false;
    } catch (error) {
      mcpLogger.error(
        `[NeuroLink] Error testing MCP server ${serverId}:`,
        error,
      );
      return false;
    }
  }

  // ==================== PROVIDER HEALTH CHECKING ====================

  /**
   * Check if a provider has the required environment variables configured
   * @param providerName - Name of the provider to check
   * @returns Promise resolving to true if provider has required env vars
   */
  async hasProviderEnvVars(providerName: string): Promise<boolean> {
    const { ProviderHealthChecker } = await import("./utils/providerHealth.js");

    try {
      const health = await ProviderHealthChecker.checkProviderHealth(
        providerName as AIProviderName,
        { includeConnectivityTest: false, cacheResults: false },
      );
      return health.isConfigured && health.hasApiKey;
    } catch (error) {
      logger.warn(`Provider env var check failed for ${providerName}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Perform comprehensive health check on a specific provider
   * @param providerName - Name of the provider to check
   * @param options - Health check options
   * @returns Promise resolving to detailed health status
   */
  async checkProviderHealth(
    providerName: string,
    options: {
      timeout?: number;
      includeConnectivityTest?: boolean;
      includeModelValidation?: boolean;
      cacheResults?: boolean;
    } = {},
  ): Promise<{
    provider: string;
    isHealthy: boolean;
    isConfigured: boolean;
    hasApiKey: boolean;
    lastChecked: Date;
    error?: string;
    warning?: string;
    responseTime?: number;
    configurationIssues: string[];
    recommendations: string[];
  }> {
    const { ProviderHealthChecker } = await import("./utils/providerHealth.js");

    const health = await ProviderHealthChecker.checkProviderHealth(
      providerName as AIProviderName,
      options,
    );

    return {
      provider: health.provider,
      isHealthy: health.isHealthy,
      isConfigured: health.isConfigured,
      hasApiKey: health.hasApiKey,
      lastChecked: health.lastChecked,
      error: health.error,
      warning: health.warning,
      responseTime: health.responseTime,
      configurationIssues: health.configurationIssues,
      recommendations: health.recommendations,
    };
  }

  /**
   * Check health of all supported providers
   * @param options - Health check options
   * @returns Promise resolving to array of health statuses for all providers
   */
  async checkAllProvidersHealth(
    options: {
      timeout?: number;
      includeConnectivityTest?: boolean;
      includeModelValidation?: boolean;
      cacheResults?: boolean;
    } = {},
  ): Promise<
    Array<{
      provider: string;
      isHealthy: boolean;
      isConfigured: boolean;
      hasApiKey: boolean;
      lastChecked: Date;
      error?: string;
      warning?: string;
      responseTime?: number;
      configurationIssues: string[];
      recommendations: string[];
    }>
  > {
    const { ProviderHealthChecker } = await import("./utils/providerHealth.js");

    const healthStatuses =
      await ProviderHealthChecker.checkAllProvidersHealth(options);

    return healthStatuses.map((health) => ({
      provider: health.provider,
      isHealthy: health.isHealthy,
      isConfigured: health.isConfigured,
      hasApiKey: health.hasApiKey,
      lastChecked: health.lastChecked,
      error: health.error,
      warning: health.warning,
      responseTime: health.responseTime,
      configurationIssues: health.configurationIssues,
      recommendations: health.recommendations,
    }));
  }

  /**
   * Get a summary of provider health across all supported providers
   * @returns Promise resolving to health summary statistics
   */
  async getProviderHealthSummary(): Promise<{
    total: number;
    healthy: number;
    configured: number;
    hasIssues: number;
    healthyProviders: string[];
    unhealthyProviders: string[];
    recommendations: string[];
  }> {
    const { ProviderHealthChecker } = await import("./utils/providerHealth.js");

    const healthStatuses = await ProviderHealthChecker.checkAllProvidersHealth({
      cacheResults: true,
      includeConnectivityTest: false,
    });

    const summary = ProviderHealthChecker.getHealthSummary(healthStatuses);

    // Add recommendations based on the overall health
    const recommendations: string[] = [];

    if (summary.healthy === 0) {
      recommendations.push(
        "No providers are healthy. Check your environment configuration.",
      );
    } else if (summary.healthy < 2) {
      recommendations.push(
        "Consider configuring additional providers for better reliability.",
      );
    }

    if (summary.hasIssues > 0) {
      recommendations.push(
        "Some providers have configuration issues. Run checkAllProvidersHealth() for details.",
      );
    }

    return {
      ...summary,
      recommendations,
    };
  }

  /**
   * Clear provider health cache (useful for re-testing after configuration changes)
   * @param providerName - Optional specific provider to clear cache for
   */
  async clearProviderHealthCache(providerName?: string): Promise<void> {
    const { ProviderHealthChecker } = await import("./utils/providerHealth.js");
    ProviderHealthChecker.clearHealthCache(providerName as AIProviderName);
  }

  // ==================== TOOL EXECUTION DIAGNOSTICS ====================

  /**
   * Get execution metrics for all tools
   * @returns Object with execution metrics for each tool
   */
  getToolExecutionMetrics(): Record<
    string,
    {
      totalExecutions: number;
      successfulExecutions: number;
      failedExecutions: number;
      successRate: number;
      averageExecutionTime: number;
      lastExecutionTime: number;
    }
  > {
    const metrics: Record<
      string,
      {
        totalExecutions: number;
        successfulExecutions: number;
        failedExecutions: number;
        successRate: number;
        averageExecutionTime: number;
        lastExecutionTime: number;
      }
    > = {};

    for (const [toolName, toolMetrics] of this.toolExecutionMetrics.entries()) {
      metrics[toolName] = {
        ...toolMetrics,
        successRate:
          toolMetrics.totalExecutions > 0
            ? toolMetrics.successfulExecutions / toolMetrics.totalExecutions
            : 0,
      };
    }

    return metrics;
  }

  /**
   * Get circuit breaker status for all tools
   * @returns Object with circuit breaker status for each tool
   */
  getToolCircuitBreakerStatus(): Record<
    string,
    {
      state: "closed" | "open" | "half-open";
      failureCount: number;
      isHealthy: boolean;
    }
  > {
    const status: Record<
      string,
      {
        state: "closed" | "open" | "half-open";
        failureCount: number;
        isHealthy: boolean;
      }
    > = {};

    for (const [
      toolName,
      circuitBreaker,
    ] of this.toolCircuitBreakers.entries()) {
      status[toolName] = {
        state: circuitBreaker.getState(),
        failureCount: circuitBreaker.getFailureCount(),
        isHealthy: circuitBreaker.getState() === "closed",
      };
    }

    return status;
  }

  /**
   * Reset circuit breaker for a specific tool
   * @param toolName - Name of the tool to reset circuit breaker for
   */
  resetToolCircuitBreaker(toolName: string): void {
    if (this.toolCircuitBreakers.has(toolName)) {
      // Create a new circuit breaker (effectively resets it)
      this.toolCircuitBreakers.set(toolName, new CircuitBreaker(5, 60000));
      mcpLogger.info(`Circuit breaker reset for tool: ${toolName}`);
    }
  }

  /**
   * Clear all tool execution metrics
   */
  clearToolExecutionMetrics(): void {
    this.toolExecutionMetrics.clear();
    mcpLogger.info("All tool execution metrics cleared");
  }

  /**
   * Get comprehensive tool health report
   * @returns Detailed health report for all tools
   */
  getToolHealthReport(): {
    totalTools: number;
    healthyTools: number;
    unhealthyTools: number;
    tools: Record<
      string,
      {
        name: string;
        isHealthy: boolean;
        metrics: {
          totalExecutions: number;
          successRate: number;
          averageExecutionTime: number;
          lastExecutionTime: number;
        };
        circuitBreaker: {
          state: "closed" | "open" | "half-open";
          failureCount: number;
        };
        issues: string[];
        recommendations: string[];
      }
    >;
  } {
    const tools: Record<
      string,
      {
        name: string;
        isHealthy: boolean;
        metrics: {
          totalExecutions: number;
          successRate: number;
          averageExecutionTime: number;
          lastExecutionTime: number;
        };
        circuitBreaker: {
          state: "closed" | "open" | "half-open";
          failureCount: number;
        };
        issues: string[];
        recommendations: string[];
      }
    > = {};
    let healthyCount = 0;

    // Get all tool names from all sources
    const allToolNames = new Set([
      ...this.customTools.keys(),
      ...Array.from(this.inMemoryServers.values()).flatMap((server) =>
        server.server?.tools ? Object.keys(server.server.tools) : [],
      ),
    ]);

    for (const toolName of allToolNames) {
      const metrics = this.toolExecutionMetrics.get(toolName);
      const circuitBreaker = this.toolCircuitBreakers.get(toolName);

      const successRate = metrics
        ? metrics.totalExecutions > 0
          ? metrics.successfulExecutions / metrics.totalExecutions
          : 0
        : 0;
      const isHealthy =
        (!circuitBreaker || circuitBreaker.getState() === "closed") &&
        successRate >= 0.8;

      if (isHealthy) {
        healthyCount++;
      }

      const issues: string[] = [];
      const recommendations: string[] = [];

      if (circuitBreaker && circuitBreaker.getState() === "open") {
        issues.push("Circuit breaker is open due to repeated failures");
        recommendations.push(
          "Check tool implementation and fix underlying issues",
        );
      }

      if (successRate < 0.8 && metrics && metrics.totalExecutions > 0) {
        issues.push(`Low success rate: ${(successRate * 100).toFixed(1)}%`);
        recommendations.push("Review error logs and improve tool reliability");
      }

      if (metrics && metrics.averageExecutionTime > 10000) {
        issues.push("High average execution time");
        recommendations.push("Optimize tool performance or increase timeout");
      }

      tools[toolName] = {
        name: toolName,
        isHealthy,
        metrics: {
          totalExecutions: metrics?.totalExecutions || 0,
          successRate,
          averageExecutionTime: metrics?.averageExecutionTime || 0,
          lastExecutionTime: metrics?.lastExecutionTime || 0,
        },
        circuitBreaker: {
          state: circuitBreaker?.getState() || "closed",
          failureCount: circuitBreaker?.getFailureCount() || 0,
        },
        issues,
        recommendations,
      };
    }

    return {
      totalTools: allToolNames.size,
      healthyTools: healthyCount,
      unhealthyTools: allToolNames.size - healthyCount,
      tools,
    };
  }
  // ============================================================================
  // CONVERSATION MEMORY PUBLIC API
  // ============================================================================

  /**
   * Get conversation memory statistics (public API)
   */
  async getConversationStats() {
    if (!this.conversationMemory) {
      throw new Error("Conversation memory is not enabled");
    }

    return await this.conversationMemory.getStats();
  }

  /**
   * Clear conversation history for a specific session (public API)
   */
  async clearConversationSession(sessionId: string): Promise<boolean> {
    if (!this.conversationMemory) {
      throw new Error("Conversation memory is not enabled");
    }

    return await this.conversationMemory.clearSession(sessionId);
  }

  /**
   * Clear all conversation history (public API)
   */
  async clearAllConversations(): Promise<void> {
    if (!this.conversationMemory) {
      throw new Error("Conversation memory is not enabled");
    }

    await this.conversationMemory.clearAllSessions();
  }

  // ===== EXTERNAL MCP SERVER METHODS =====

  /**
   * Add an external MCP server
   * Automatically discovers and registers tools from the server
   * @param serverId - Unique identifier for the server
   * @param config - External MCP server configuration
   * @returns Operation result with server instance
   */
  async addExternalMCPServer(
    serverId: string,
    config: ExternalMCPServerConfig,
  ): Promise<ExternalMCPOperationResult<ExternalMCPServerInstance>> {
    try {
      mcpLogger.info(`[NeuroLink] Adding external MCP server: ${serverId}`, {
        command: config.command,
        transport: config.transport,
      });

      const result = await this.externalServerManager.addServer(
        serverId,
        config,
      );

      if (result.success) {
        mcpLogger.info(
          `[NeuroLink] External MCP server added successfully: ${serverId}`,
          {
            toolsDiscovered: result.metadata?.toolsDiscovered || 0,
            duration: result.duration,
          },
        );

        // Emit server added event
        this.emitter.emit("externalMCP:serverAdded", {
          serverId,
          config,
          toolCount: result.metadata?.toolsDiscovered || 0,
          timestamp: Date.now(),
        });
      } else {
        mcpLogger.error(
          `[NeuroLink] Failed to add external MCP server: ${serverId}`,
          {
            error: result.error,
          },
        );
      }

      return result;
    } catch (error) {
      mcpLogger.error(
        `[NeuroLink] Error adding external MCP server: ${serverId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Remove an external MCP server
   * Stops the server and removes all its tools
   * @param serverId - ID of the server to remove
   * @returns Operation result
   */
  async removeExternalMCPServer(
    serverId: string,
  ): Promise<ExternalMCPOperationResult<void>> {
    try {
      mcpLogger.info(`[NeuroLink] Removing external MCP server: ${serverId}`);

      const result = await this.externalServerManager.removeServer(serverId);

      if (result.success) {
        mcpLogger.info(
          `[NeuroLink] External MCP server removed successfully: ${serverId}`,
        );

        // Emit server removed event
        this.emitter.emit("externalMCP:serverRemoved", {
          serverId,
          timestamp: Date.now(),
        });
      } else {
        mcpLogger.error(
          `[NeuroLink] Failed to remove external MCP server: ${serverId}`,
          {
            error: result.error,
          },
        );
      }

      return result;
    } catch (error) {
      mcpLogger.error(
        `[NeuroLink] Error removing external MCP server: ${serverId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * List all external MCP servers
   * @returns Array of server health information
   */
  listExternalMCPServers(): Array<{
    serverId: string;
    status: string;
    toolCount: number;
    uptime: number;
    isHealthy: boolean;
    config: ExternalMCPServerConfig;
  }> {
    const serverStatuses = this.externalServerManager.getServerStatuses();
    const allServers = this.externalServerManager.getAllServers();

    return serverStatuses.map((health) => {
      const server = allServers.get(health.serverId);
      return {
        serverId: health.serverId,
        status: health.status,
        toolCount: health.toolCount,
        uptime: health.performance.uptime,
        isHealthy: health.isHealthy,
        config: server?.config || ({} as ExternalMCPServerConfig),
      };
    });
  }

  /**
   * Get external MCP server status
   * @param serverId - ID of the server
   * @returns Server instance or undefined if not found
   */
  getExternalMCPServer(
    serverId: string,
  ): ExternalMCPServerInstance | undefined {
    return this.externalServerManager.getServer(serverId);
  }

  /**
   * Execute a tool from an external MCP server
   * @param serverId - ID of the server
   * @param toolName - Name of the tool
   * @param parameters - Tool parameters
   * @param options - Execution options
   * @returns Tool execution result
   */
  async executeExternalMCPTool(
    serverId: string,
    toolName: string,
    parameters: Record<string, any>,
    options?: { timeout?: number },
  ): Promise<any> {
    try {
      mcpLogger.debug(
        `[NeuroLink] Executing external MCP tool: ${toolName} on ${serverId}`,
      );

      const result = await this.externalServerManager.executeTool(
        serverId,
        toolName,
        parameters,
        options,
      );

      mcpLogger.debug(
        `[NeuroLink] External MCP tool executed successfully: ${toolName}`,
      );
      return result;
    } catch (error) {
      mcpLogger.error(
        `[NeuroLink] External MCP tool execution failed: ${toolName}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get all tools from external MCP servers
   * @returns Array of external tool information
   */
  getExternalMCPTools(): ExternalMCPToolInfo[] {
    return this.externalServerManager.getAllTools();
  }

  /**
   * Get tools from a specific external MCP server
   * @param serverId - ID of the server
   * @returns Array of tool information for the server
   */
  getExternalMCPServerTools(serverId: string): ExternalMCPToolInfo[] {
    return this.externalServerManager.getServerTools(serverId);
  }

  /**
   * Test connection to an external MCP server
   * @param config - Server configuration to test
   * @returns Test result with connection status
   */
  async testExternalMCPConnection(
    config: ExternalMCPServerConfig,
  ): Promise<{ success: boolean; error?: string; toolCount?: number }> {
    try {
      const { MCPClientFactory } = await import("./mcp/mcpClientFactory.js");

      const testResult = await MCPClientFactory.testConnection(config, 10000);

      return {
        success: testResult.success,
        error: testResult.error,
        toolCount: testResult.capabilities ? 1 : 0, // Basic indication
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get external MCP server manager statistics
   * @returns Statistics about external servers and tools
   */
  getExternalMCPStatistics(): {
    totalServers: number;
    connectedServers: number;
    failedServers: number;
    totalTools: number;
    totalConnections: number;
    totalErrors: number;
  } {
    return this.externalServerManager.getStatistics();
  }

  /**
   * Shutdown all external MCP servers
   * Called automatically on process exit
   */
  async shutdownExternalMCPServers(): Promise<void> {
    try {
      mcpLogger.info("[NeuroLink] Shutting down all external MCP servers...");
      // First, unregister all external MCP tools from the main tool registry
      this.unregisterAllExternalMCPToolsFromRegistry();
      // Then shutdown the external server manager
      await this.externalServerManager.shutdown();
      mcpLogger.info(
        "[NeuroLink] All external MCP servers shut down successfully",
      );
    } catch (error) {
      mcpLogger.error(
        "[NeuroLink] Error shutting down external MCP servers:",
        error,
      );
      throw error;
    }
  }

  /**
   * Convert external MCP tools to Vercel AI SDK tool format
   * This allows AI providers to use external tools directly
   */
  private convertExternalMCPToolsToAISDKFormat(): Record<string, any> {
    const externalTools = this.externalServerManager.getAllTools();
    const aiSDKTools: Record<string, any> = {};

    for (const tool of externalTools) {
      if (tool.isAvailable) {
        // Create tool definition without parameters schema to avoid Zod issues
        // The AI provider will handle parameters dynamically based on the tool description
        const toolDefinition: any = {
          description: tool.description,
          execute: async (args: Record<string, any>) => {
            try {
              mcpLogger.debug(
                `[NeuroLink] Executing external MCP tool via AI SDK: ${tool.name}`,
                { args },
              );
              const result = await this.externalServerManager.executeTool(
                tool.serverId,
                tool.name,
                args,
                { timeout: 30000 },
              );
              mcpLogger.debug(
                `[NeuroLink] External MCP tool execution result: ${tool.name}`,
                {
                  success: !!result,
                  hasData: !!(
                    result &&
                    typeof result === "object" &&
                    "content" in result
                  ),
                },
              );
              return result;
            } catch (error) {
              mcpLogger.error(
                `[NeuroLink] External MCP tool execution failed: ${tool.name}`,
                error,
              );
              throw error;
            }
          },
        };

        // Only add parameters if we have a valid schema - otherwise omit it entirely
        // This prevents Zod schema parsing errors

        aiSDKTools[tool.name] = toolDefinition;
        mcpLogger.debug(
          `[NeuroLink] Converted external MCP tool to AI SDK format: ${tool.name} from server ${tool.serverId}`,
        );
      }
    }

    mcpLogger.info(
      `[NeuroLink] Converted ${Object.keys(aiSDKTools).length} external MCP tools to AI SDK format`,
    );
    return aiSDKTools;
  }

  /**
   * Convert JSON Schema to AI SDK compatible format
   * For now, we'll skip schema validation and let the AI SDK handle parameters dynamically
   */
  private convertJSONSchemaToAISDKFormat(inputSchema: any): any {
    // The simplest approach: don't provide parameters schema
    // This lets the AI SDK handle the tool without schema validation
    // Tools will still work, they just won't have strict parameter validation
    return undefined;
  }

  /**
   * Unregister external MCP tools from a specific server
   */
  private unregisterExternalMCPToolsFromRegistry(serverId: string): void {
    try {
      const externalTools = this.externalServerManager.getServerTools(serverId);

      for (const tool of externalTools) {
        toolRegistry.removeTool(tool.name);
        mcpLogger.debug(
          `[NeuroLink] Unregistered external MCP tool from main registry: ${tool.name}`,
        );
      }
    } catch (error) {
      mcpLogger.error(
        `[NeuroLink] Failed to unregister external MCP tools from registry for server ${serverId}:`,
        error,
      );
    }
  }

  /**
   * Unregister a specific external MCP tool from the main registry
   */
  private unregisterExternalMCPToolFromRegistry(toolName: string): void {
    try {
      toolRegistry.removeTool(toolName);
      mcpLogger.debug(
        `[NeuroLink] Unregistered external MCP tool from main registry: ${toolName}`,
      );
    } catch (error) {
      mcpLogger.error(
        `[NeuroLink] Failed to unregister external MCP tool ${toolName} from registry:`,
        error,
      );
    }
  }

  /**
   * Unregister all external MCP tools from the main registry
   */
  private unregisterAllExternalMCPToolsFromRegistry(): void {
    try {
      const externalTools = this.externalServerManager.getAllTools();

      for (const tool of externalTools) {
        toolRegistry.removeTool(tool.name);
      }

      mcpLogger.debug(
        `[NeuroLink] Unregistered ${externalTools.length} external MCP tools from main registry`,
      );
    } catch (error) {
      mcpLogger.error(
        "[NeuroLink] Failed to unregister all external MCP tools from registry:",
        error,
      );
    }
  }
}

// Create default instance
export const neurolink = new NeuroLink();
export default neurolink;
