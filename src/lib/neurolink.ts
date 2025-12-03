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
} catch {
  // Environment variables should be set externally in production
}

import type {
  TextGenerationOptions,
  TextGenerationResult,
  AnalyticsData,
  ProviderStatus,
} from "./types/index.js";
import { AIProviderFactory } from "./core/factory.js";
import { isNonNullObject } from "./utils/typeUtils.js";
import { isZodSchema } from "./utils/schemaConversion.js";
import type { MemoryClient } from "mem0ai";
import { AIProviderName } from "./constants/enums.js";
import { mcpLogger } from "./utils/logger.js";
import { SYSTEM_LIMITS } from "./core/constants.js";
import {
  NANOSECOND_TO_MS_DIVISOR,
  TOOL_TIMEOUTS,
  RETRY_ATTEMPTS,
  RETRY_DELAYS,
  CIRCUIT_BREAKER,
  CIRCUIT_BREAKER_RESET_MS,
  MEMORY_THRESHOLDS,
  PROVIDER_TIMEOUTS,
  PERFORMANCE_THRESHOLDS,
} from "./constants/index.js";
import pLimit from "p-limit";
import { MCPToolRegistry } from "./mcp/toolRegistry.js";
import { logger } from "./utils/logger.js";
import { getBestProvider } from "./utils/providerUtils.js";
import { ProviderRegistry } from "./factories/providerRegistry.js";
// NEW: Generate function imports
import type { GenerateOptions, GenerateResult } from "./types/generateTypes.js";
import type {
  StreamOptions,
  StreamResult,
  ToolCall,
  ToolResult,
  AudioChunk,
} from "./types/streamTypes.js";
import type { TokenUsage, EvaluationData } from "./types/index.js";
import type {
  MCPExecutableTool,
  MCPServerCategory,
  MCPServerInfo,
  MCPStatus,
} from "./types/mcpTypes.js";
import type { ToolInfo } from "./types/tools.js";
import type { NeuroLinkEvents, TypedEventEmitter } from "./types/common.js";
import {
  createCustomToolServerInfo,
  detectCategory,
} from "./utils/mcpDefaults.js";
import type {
  ToolExecutionContext,
  ToolExecutionSummary,
} from "./types/tools.js";
import type { JsonValue, JsonObject, UnknownRecord } from "./types/common.js";
import type {
  ToolExecutionResult,
  BatchOperationResult,
} from "./types/typeAliases.js";
// Factory processing imports
import {
  processFactoryOptions,
  enhanceTextGenerationOptions,
  validateFactoryConfig,
  processStreamingFactoryOptions,
  createCleanStreamOptions,
} from "./utils/factoryProcessing.js";
// Tool detection and execution imports
// Transformation utilities
import {
  transformToolExecutions,
  transformToolExecutionsForMCP,
  transformAvailableTools,
  transformToolsForMCP,
  transformToolsToExpectedFormat,
  transformToolsToDescriptions,
  extractToolNames,
  transformParamsForLogging,
  optimizeToolForCollection,
} from "./utils/transformationUtils.js";
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
import type {
  ConversationMemoryConfig,
  ChatMessage,
} from "./types/conversation.js";
import { ConversationMemoryManager } from "./core/conversationMemoryManager.js";
import { RedisConversationMemoryManager } from "./core/redisConversationMemoryManager.js";
import {
  getConversationMessages,
  storeConversationTurn,
} from "./utils/conversationMemory.js";
import { ExternalServerManager } from "./mcp/externalServerManager.js";
import type {
  HITLConfig,
  ConfirmationResponseEvent,
} from "./types/hitlTypes.js";
import { HITLManager } from "./hitl/hitlManager.js";
import type {
  ExternalMCPServerInstance,
  ExternalMCPOperationResult,
  ExternalMCPToolInfo,
} from "./types/externalMcp.js";
// Import direct tools server for automatic registration
import { directToolsServer } from "./mcp/servers/agent/directToolsServer.js";
// Import orchestration components
import { ModelRouter } from "./utils/modelRouter.js";
import { BinaryTaskClassifier } from "./utils/taskClassifier.js";
import {
  initializeOpenTelemetry,
  shutdownOpenTelemetry,
  flushOpenTelemetry,
  getLangfuseHealthStatus,
  setLangfuseContext,
} from "./services/server/ai/observability/instrumentation.js";
import type { ObservabilityConfig } from "./types/observability.js";
import type { NeurolinkConstructorConfig } from "./types/configTypes.js";

import { initializeMem0, type Mem0Config } from "./memory/mem0Initializer.js";

export class NeuroLink {
  private mcpInitialized = false;
  private emitter =
    new EventEmitter() as unknown as TypedEventEmitter<NeuroLinkEvents>;

  private toolRegistry: MCPToolRegistry;

  private autoDiscoveredServerInfos: MCPServerInfo[] = [];
  // External MCP server management
  private externalServerManager!: ExternalServerManager;

  // Cache for available tools to improve performance
  private toolCache: {
    tools: ToolInfo[];
    timestamp: number;
  } | null = null;
  private readonly toolCacheDuration: number;

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

  private currentStreamToolExecutions: ToolExecutionContext[] = [];
  private toolExecutionHistory: ToolExecutionSummary[] = [];
  private activeToolExecutions: Map<string, ToolExecutionContext> = new Map();

  /**
   * Helper method to emit tool end event in a consistent way
   * Used by executeTool in both success and error paths
   * @param toolName - Name of the tool
   * @param startTime - Timestamp when tool execution started
   * @param success - Whether the tool execution was successful
   * @param result - The result of the tool execution (optional)
   * @param error - The error if execution failed (optional)
   */
  private emitToolEndEvent(
    toolName: string,
    startTime: number,
    success: boolean,
    result?: unknown,
    error?: Error,
  ): void {
    // Emit tool end event (NeuroLink format - enhanced with result/error)
    this.emitter.emit("tool:end", {
      toolName,
      responseTime: Date.now() - startTime,
      success,
      timestamp: Date.now(),
      result: result, // Enhanced: include actual result
      error: error, // Enhanced: include error if present
    });

    // ADD: Bedrock-compatible tool:end event (positional parameters)
    this.emitter.emit("tool:end", toolName, success ? result : error);
  }
  // Conversation memory support
  public conversationMemory?:
    | ConversationMemoryManager
    | RedisConversationMemoryManager
    | null;
  private conversationMemoryNeedsInit = false;
  private conversationMemoryConfig?: {
    conversationMemory?: Partial<ConversationMemoryConfig>;
  };

  // Add orchestration property
  private enableOrchestration: boolean;

  // HITL (Human-in-the-Loop) support
  private hitlManager?: HITLManager;

  // Mem0 memory instance and config for conversation context
  private mem0Instance?: MemoryClient | null;
  private mem0Config?: Mem0Config;

  /**
   * Extract and set Langfuse context from options with proper async scoping
   */
  private async setLangfuseContextFromOptions<T>(
    options: { context?: unknown },
    callback: () => Promise<T>,
  ): Promise<T> {
    if (
      options.context &&
      typeof options.context === "object" &&
      options.context !== null
    ) {
      try {
        const ctx = options.context as Record<string, unknown>;
        if (ctx.userId || ctx.sessionId) {
          return await new Promise<T>((resolve, reject) => {
            setLangfuseContext(
              {
                userId: typeof ctx.userId === "string" ? ctx.userId : null,
                sessionId:
                  typeof ctx.sessionId === "string" ? ctx.sessionId : null,
              },
              async () => {
                try {
                  const result = await callback();
                  resolve(result);
                } catch (error) {
                  reject(error);
                }
              },
            );
          });
        }
      } catch (error) {
        logger.warn("Failed to set Langfuse context from options", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return await callback();
  }

  /**
   * Simple sync config setup for mem0
   */
  private initializeMem0Config(): boolean {
    const config = this.conversationMemoryConfig?.conversationMemory;
    if (!config?.mem0Enabled) {
      return false;
    }

    this.mem0Config = config.mem0Config;
    return true;
  }

  /**
   * Async initialization called during generate/stream
   */
  private async ensureMem0Ready(): Promise<MemoryClient | null> {
    if (this.mem0Instance !== undefined) {
      return this.mem0Instance;
    }

    if (!this.initializeMem0Config()) {
      this.mem0Instance = null;
      return null;
    }

    if (!this.mem0Config) {
      this.mem0Instance = null;
      return null;
    }

    this.mem0Instance = await initializeMem0(this.mem0Config);
    return this.mem0Instance;
  }
  /**
   * Context storage for tool execution
   * This context will be merged with any runtime context passed by the AI model
   */
  private toolExecutionContext?: Record<string, unknown>;

  /**
   * Creates a new NeuroLink instance for AI text generation with MCP tool integration.
   *
   * @param config - Optional configuration object
   * @param config.conversationMemory - Configuration for conversation memory features
   * @param config.conversationMemory.enabled - Whether to enable conversation memory (default: false)
   * @param config.conversationMemory.maxSessions - Maximum number of concurrent sessions (default: 100)
   * @param config.conversationMemory.maxTurnsPerSession - Maximum conversation turns per session (default: 50)
   * @param config.enableOrchestration - Whether to enable smart model orchestration (default: false)
   * @param config.hitl - Configuration for Human-in-the-Loop safety features
   * @param config.hitl.enabled - Whether to enable HITL tool confirmation (default: false)
   * @param config.hitl.dangerousActions - Keywords that trigger confirmation (default: ['delete', 'remove', 'drop'])
   * @param config.hitl.timeout - Confirmation timeout in milliseconds (default: 30000)
   * @param config.hitl.allowArgumentModification - Allow users to modify tool parameters (default: true)
   * @param config.toolRegistry - Optional tool registry instance for advanced use cases (default: new MCPToolRegistry())
   *
   * @example
   * ```typescript
   * // Basic usage
   * const neurolink = new NeuroLink();
   *
   * // With conversation memory
   * const neurolink = new NeuroLink({
   *   conversationMemory: {
   *     enabled: true,
   *     maxSessions: 50,
   *     maxTurnsPerSession: 20
   *   }
   * });
   *
   * // With orchestration enabled
   * const neurolink = new NeuroLink({
   *   enableOrchestration: true
   * });
   *
   * // With HITL safety features
   * const neurolink = new NeuroLink({
   *   hitl: {
   *     enabled: true,
   *     dangerousActions: ['delete', 'remove', 'drop', 'truncate'],
   *     timeout: 30000,
   *     allowArgumentModification: true
   *   }
   * });
   * ```
   *
   * @throws {Error} When provider registry setup fails
   * @throws {Error} When conversation memory initialization fails (if enabled)
   * @throws {Error} When external server manager initialization fails
   * @throws {Error} When HITL configuration is invalid (if enabled)
   */
  private observabilityConfig?: ObservabilityConfig;

  constructor(config?: NeurolinkConstructorConfig) {
    this.toolRegistry = config?.toolRegistry || new MCPToolRegistry();
    this.observabilityConfig = config?.observability;

    // Initialize orchestration setting
    this.enableOrchestration = config?.enableOrchestration ?? false;

    logger.setEventEmitter(this.emitter);

    // Read tool cache duration from environment variables, with a default
    const cacheDurationEnv = process.env.NEUROLINK_TOOL_CACHE_DURATION;
    this.toolCacheDuration = cacheDurationEnv
      ? parseInt(cacheDurationEnv, 10)
      : 20000;

    const constructorStartTime = Date.now();
    const constructorHrTimeStart = process.hrtime.bigint();
    const constructorId = `neurolink-constructor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.initializeProviderRegistry(
      constructorId,
      constructorStartTime,
      constructorHrTimeStart,
    );
    this.initializeConversationMemory(
      config,
      constructorId,
      constructorStartTime,
      constructorHrTimeStart,
    );
    this.initializeExternalServerManager(
      constructorId,
      constructorStartTime,
      constructorHrTimeStart,
    );
    this.initializeHITL(
      config,
      constructorId,
      constructorStartTime,
      constructorHrTimeStart,
    );
    this.initializeLangfuse(
      constructorId,
      constructorStartTime,
      constructorHrTimeStart,
    );
    this.logConstructorComplete(
      constructorId,
      constructorStartTime,
      constructorHrTimeStart,
    );
  }

  /**
   * Initialize provider registry with security settings
   */
  private initializeProviderRegistry(
    constructorId: string,
    constructorStartTime: number,
    constructorHrTimeStart: bigint,
  ): void {
    const registrySetupStartTime = process.hrtime.bigint();
    logger.debug(
      `[NeuroLink] 🏗️ LOG_POINT_C002_PROVIDER_REGISTRY_SETUP_START`,
      {
        logPoint: "C002_PROVIDER_REGISTRY_SETUP_START",
        constructorId,
        timestamp: new Date().toISOString(),
        elapsedMs: Date.now() - constructorStartTime,
        elapsedNs: (
          process.hrtime.bigint() - constructorHrTimeStart
        ).toString(),
        registrySetupStartTimeNs: registrySetupStartTime.toString(),
        message: "Starting ProviderRegistry configuration for security",
      },
    );

    ProviderRegistry.setOptions({ enableManualMCP: false });
  }

  /**
   * Initialize conversation memory if enabled
   */
  private initializeConversationMemory(
    config:
      | { conversationMemory?: Partial<ConversationMemoryConfig> }
      | undefined,
    constructorId: string,
    constructorStartTime: number,
    constructorHrTimeStart: bigint,
  ): void {
    if (config?.conversationMemory?.enabled) {
      const memoryInitStartTime = process.hrtime.bigint();

      // Store config for later use and set flag for lazy initialization
      this.conversationMemoryConfig = config;
      this.conversationMemoryNeedsInit = true;

      const memoryInitEndTime = process.hrtime.bigint();
      const memoryInitDurationNs = memoryInitEndTime - memoryInitStartTime;
      logger.debug(
        `[NeuroLink] ✅ LOG_POINT_C006_MEMORY_INIT_FLAG_SET_SUCCESS`,
        {
          logPoint: "C006_MEMORY_INIT_FLAG_SET_SUCCESS",
          constructorId,
          timestamp: new Date().toISOString(),
          elapsedMs: Date.now() - constructorStartTime,
          elapsedNs: (
            process.hrtime.bigint() - constructorHrTimeStart
          ).toString(),
          memoryInitDurationNs: memoryInitDurationNs.toString(),
          memoryInitDurationMs:
            Number(memoryInitDurationNs) / NANOSECOND_TO_MS_DIVISOR,
          message:
            "Conversation memory initialization flag set successfully for lazy loading",
        },
      );
    } else {
      logger.debug(`[NeuroLink] 🚫 LOG_POINT_C008_MEMORY_DISABLED`, {
        logPoint: "C008_MEMORY_DISABLED",
        constructorId,
        timestamp: new Date().toISOString(),
        elapsedMs: Date.now() - constructorStartTime,
        elapsedNs: (
          process.hrtime.bigint() - constructorHrTimeStart
        ).toString(),
        hasConfig: !!config,
        hasMemoryConfig: !!config?.conversationMemory,
        memoryEnabled: config?.conversationMemory?.enabled || false,
        reason: !config
          ? "NO_CONFIG"
          : !config.conversationMemory
            ? "NO_MEMORY_CONFIG"
            : !config.conversationMemory.enabled
              ? "MEMORY_DISABLED"
              : "UNKNOWN",
        message: "Conversation memory not enabled - skipping initialization",
      });
    }
  }

  /**
   * Initialize HITL (Human-in-the-Loop) if enabled
   */
  private initializeHITL(
    config:
      | {
          conversationMemory?: Partial<ConversationMemoryConfig>;
          enableOrchestration?: boolean;
          hitl?: HITLConfig;
        }
      | undefined,
    constructorId: string,
    constructorStartTime: number,
    constructorHrTimeStart: bigint,
  ): void {
    if (config?.hitl?.enabled) {
      const hitlInitStartTime = process.hrtime.bigint();
      logger.debug(`[NeuroLink] 🛡️ LOG_POINT_C015_HITL_INIT_START`, {
        logPoint: "C015_HITL_INIT_START",
        constructorId,
        timestamp: new Date().toISOString(),
        elapsedMs: Date.now() - constructorStartTime,
        elapsedNs: (
          process.hrtime.bigint() - constructorHrTimeStart
        ).toString(),
        hitlInitStartTimeNs: hitlInitStartTime.toString(),
        hitlConfig: {
          enabled: config.hitl.enabled,
          dangerousActions: config.hitl.dangerousActions || [],
          timeout: config.hitl.timeout || 30000,
          allowArgumentModification:
            config.hitl.allowArgumentModification ?? true,
          auditLogging: config.hitl.auditLogging ?? false,
        },
        message: "Starting HITL (Human-in-the-Loop) initialization",
      });

      try {
        // Initialize HITL manager
        this.hitlManager = new HITLManager(config.hitl);

        // Inject HITL manager into tool registry
        this.toolRegistry.setHITLManager(this.hitlManager);

        // Inject HITL manager into external server manager
        this.externalServerManager.setHITLManager(this.hitlManager);

        // Set up HITL event forwarding to main emitter
        this.setupHITLEventForwarding();

        const hitlInitEndTime = process.hrtime.bigint();
        const hitlInitDurationNs = hitlInitEndTime - hitlInitStartTime;

        logger.debug(`[NeuroLink] ✅ LOG_POINT_C016_HITL_INIT_SUCCESS`, {
          logPoint: "C016_HITL_INIT_SUCCESS",
          constructorId,
          timestamp: new Date().toISOString(),
          elapsedMs: Date.now() - constructorStartTime,
          elapsedNs: (
            process.hrtime.bigint() - constructorHrTimeStart
          ).toString(),
          hitlInitDurationNs: hitlInitDurationNs.toString(),
          hitlInitDurationMs:
            Number(hitlInitDurationNs) / NANOSECOND_TO_MS_DIVISOR,
          hasHitlManager: !!this.hitlManager,
          message: "HITL (Human-in-the-Loop) initialized successfully",
        });

        logger.info(`[NeuroLink] HITL safety features enabled`, {
          dangerousActions: config.hitl.dangerousActions?.length || 0,
          timeout: config.hitl.timeout || 30000,
          allowArgumentModification:
            config.hitl.allowArgumentModification ?? true,
          auditLogging: config.hitl.auditLogging ?? false,
        });
      } catch (error) {
        const hitlInitErrorTime = process.hrtime.bigint();
        const hitlInitDurationNs = hitlInitErrorTime - hitlInitStartTime;

        logger.error(`[NeuroLink] ❌ LOG_POINT_C017_HITL_INIT_ERROR`, {
          logPoint: "C017_HITL_INIT_ERROR",
          constructorId,
          timestamp: new Date().toISOString(),
          elapsedMs: Date.now() - constructorStartTime,
          elapsedNs: (
            process.hrtime.bigint() - constructorHrTimeStart
          ).toString(),
          hitlInitDurationNs: hitlInitDurationNs.toString(),
          hitlInitDurationMs:
            Number(hitlInitDurationNs) / NANOSECOND_TO_MS_DIVISOR,
          error: error instanceof Error ? error.message : String(error),
          errorName: error instanceof Error ? error.name : "UnknownError",
          errorStack: error instanceof Error ? error.stack : undefined,
          message: "HITL (Human-in-the-Loop) initialization failed",
        });
        throw error;
      }
    } else {
      logger.debug(`[NeuroLink] 🚫 LOG_POINT_C018_HITL_DISABLED`, {
        logPoint: "C018_HITL_DISABLED",
        constructorId,
        timestamp: new Date().toISOString(),
        elapsedMs: Date.now() - constructorStartTime,
        elapsedNs: (
          process.hrtime.bigint() - constructorHrTimeStart
        ).toString(),
        hasConfig: !!config,
        hasHitlConfig: !!config?.hitl,
        hitlEnabled: config?.hitl?.enabled || false,
        reason: !config
          ? "NO_CONFIG"
          : !config.hitl
            ? "NO_HITL_CONFIG"
            : !config.hitl.enabled
              ? "HITL_DISABLED"
              : "UNKNOWN",
        message:
          "HITL (Human-in-the-Loop) not enabled - skipping initialization",
      });
    }
  }

  /** Format memory context for prompt inclusion */
  private formatMemoryContext(
    memoryContext: string,
    currentInput: string,
  ): string {
    return `Context from previous conversations:

${memoryContext}

Current user's request: ${currentInput}`;
  }

  /** Extract memory context from search results */
  private extractMemoryContext(memories: Array<{ memory?: string }>): string {
    return memories
      .map((m) => m.memory || "")
      .filter(Boolean)
      .join("\n");
  }

  /** Store conversation turn in mem0 */
  private async storeMem0ConversationTurn(
    mem0: MemoryClient,
    userContent: string,
    aiResponse: string,
    userId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    // Store both user message and AI response for better context extraction
    const conversationTurn = [
      { role: "user" as const, content: userContent },
      { role: "assistant" as const, content: aiResponse },
    ];

    await mem0.add(conversationTurn, {
      user_id: userId,
      metadata,
      infer: true,
      async_mode: true,
    });
  }

  /**
   * Set up HITL event forwarding to main emitter
   */
  private setupHITLEventForwarding(): void {
    if (!this.hitlManager) {
      return;
    }

    // Forward HITL confirmation requests to main emitter
    this.hitlManager.on("hitl:confirmation-request", (event) => {
      logger.debug("Forwarding HITL confirmation request", {
        confirmationId: event.payload?.confirmationId,
        toolName: event.payload?.toolName,
      });
      this.emitter.emit("hitl:confirmation-request", event);
    });

    // Forward HITL timeout events to main emitter
    this.hitlManager.on("hitl:timeout", (event) => {
      logger.debug("Forwarding HITL timeout event", {
        confirmationId: event.payload?.confirmationId,
        toolName: event.payload?.toolName,
      });
      this.emitter.emit("hitl:timeout", event);
    });

    // Listen for confirmation responses from main emitter and forward to HITL manager
    this.emitter.on("hitl:confirmation-response", (event) => {
      const typedEvent = event as ConfirmationResponseEvent;
      logger.debug("Received HITL confirmation response", {
        confirmationId: typedEvent.payload?.confirmationId,
        approved: typedEvent.payload?.approved,
      });
      // Forward to HITL manager
      this.hitlManager?.emit("hitl:confirmation-response", typedEvent);
    });

    logger.debug("HITL event forwarding configured successfully");
  }

  /**
   * Initialize external server manager with event handlers
   */
  private initializeExternalServerManager(
    constructorId: string,
    constructorStartTime: number,
    constructorHrTimeStart: bigint,
  ): void {
    const externalServerInitStartTime = process.hrtime.bigint();

    try {
      this.externalServerManager = new ExternalServerManager(
        {
          maxServers: 20,
          defaultTimeout: 30000, // Increased from 15s to 30s for proxy latency (e.g., LiteLLM)
          enableAutoRestart: true,
          enablePerformanceMonitoring: true,
        },
        {
          enableMainRegistryIntegration: true,
        },
      );

      const externalServerInitEndTime = process.hrtime.bigint();
      const externalServerInitDurationNs =
        externalServerInitEndTime - externalServerInitStartTime;

      logger.debug(
        `[NeuroLink] ✅ LOG_POINT_C010_EXTERNAL_SERVER_INIT_SUCCESS`,
        {
          logPoint: "C010_EXTERNAL_SERVER_INIT_SUCCESS",
          constructorId,
          timestamp: new Date().toISOString(),
          elapsedMs: Date.now() - constructorStartTime,
          elapsedNs: (
            process.hrtime.bigint() - constructorHrTimeStart
          ).toString(),
          externalServerInitDurationNs: externalServerInitDurationNs.toString(),
          externalServerInitDurationMs:
            Number(externalServerInitDurationNs) / NANOSECOND_TO_MS_DIVISOR,
          hasExternalServerManager: !!this.externalServerManager,
          message: "External server manager initialized successfully",
        },
      );

      this.setupExternalServerEventHandlers(constructorId);
    } catch (error) {
      const externalServerInitErrorTime = process.hrtime.bigint();
      const externalServerInitDurationNs =
        externalServerInitErrorTime - externalServerInitStartTime;

      logger.error(`[NeuroLink] ❌ LOG_POINT_C013_EXTERNAL_SERVER_INIT_ERROR`, {
        logPoint: "C013_EXTERNAL_SERVER_INIT_ERROR",
        constructorId,
        timestamp: new Date().toISOString(),
        elapsedMs: Date.now() - constructorStartTime,
        elapsedNs: (
          process.hrtime.bigint() - constructorHrTimeStart
        ).toString(),
        externalServerInitDurationNs: externalServerInitDurationNs.toString(),
        externalServerInitDurationMs:
          Number(externalServerInitDurationNs) / NANOSECOND_TO_MS_DIVISOR,
        error: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorStack: error instanceof Error ? error.stack : undefined,
        message: "External server manager initialization failed",
      });
      throw error;
    }
  }

  /**
   * Setup event handlers for external server manager
   */
  private setupExternalServerEventHandlers(constructorId: string): void {
    this.externalServerManager.on("connected", (event) => {
      logger.debug(`[NeuroLink] 🔗 EXTERNAL_SERVER_EVENT_CONNECTED`, {
        constructorId,
        eventType: "connected",
        event,
        timestamp: new Date().toISOString(),
        message: "External MCP server connected event received",
      });
      this.emitter.emit("externalMCP:serverConnected", event);
    });

    this.externalServerManager.on("disconnected", (event) => {
      logger.debug(`[NeuroLink] 🔗 EXTERNAL_SERVER_EVENT_DISCONNECTED`, {
        constructorId,
        eventType: "disconnected",
        event,
        timestamp: new Date().toISOString(),
        message: "External MCP server disconnected event received",
      });
      this.emitter.emit("externalMCP:serverDisconnected", event);
    });

    this.externalServerManager.on("failed", (event) => {
      logger.warn(`[NeuroLink] 🔗 EXTERNAL_SERVER_EVENT_FAILED`, {
        constructorId,
        eventType: "failed",
        event,
        timestamp: new Date().toISOString(),
        message: "External MCP server failed event received",
      });
      this.emitter.emit("externalMCP:serverFailed", event);
    });

    this.externalServerManager.on("toolDiscovered", (event) => {
      logger.debug(`[NeuroLink] 🔗 EXTERNAL_SERVER_EVENT_TOOL_DISCOVERED`, {
        constructorId,
        eventType: "toolDiscovered",
        toolName: event.toolName,
        serverId: event.serverId,
        timestamp: new Date().toISOString(),
        message: "External MCP tool discovered event received",
      });
      this.emitter.emit("externalMCP:toolDiscovered", event);
    });

    this.externalServerManager.on("toolRemoved", (event) => {
      logger.debug(`[NeuroLink] 🔗 EXTERNAL_SERVER_EVENT_TOOL_REMOVED`, {
        constructorId,
        eventType: "toolRemoved",
        toolName: event.toolName,
        serverId: event.serverId,
        timestamp: new Date().toISOString(),
        message: "External MCP tool removed event received",
      });
      this.emitter.emit("externalMCP:toolRemoved", event);
      this.unregisterExternalMCPToolFromRegistry(event.toolName);
    });
  }

  /**
   * Initialize Langfuse observability for AI operations tracking
   */
  private initializeLangfuse(
    constructorId: string,
    constructorStartTime: number,
    constructorHrTimeStart: bigint,
  ): void {
    const langfuseInitStartTime = process.hrtime.bigint();

    try {
      const langfuseConfig = this.observabilityConfig?.langfuse;

      if (langfuseConfig?.enabled) {
        logger.debug(`[NeuroLink] 📊 LOG_POINT_C019_LANGFUSE_INIT_START`, {
          logPoint: "C019_LANGFUSE_INIT_START",
          constructorId,
          timestamp: new Date().toISOString(),
          elapsedMs: Date.now() - constructorStartTime,
          elapsedNs: (
            process.hrtime.bigint() - constructorHrTimeStart
          ).toString(),
          langfuseInitStartTimeNs: langfuseInitStartTime.toString(),
          message: "Starting Langfuse observability initialization",
        });

        // Initialize OpenTelemetry (sets defaults from config)
        initializeOpenTelemetry(langfuseConfig);

        const healthStatus = getLangfuseHealthStatus();
        const langfuseInitDurationNs =
          process.hrtime.bigint() - langfuseInitStartTime;

        if (
          healthStatus.initialized &&
          healthStatus.hasProcessor &&
          healthStatus.isHealthy
        ) {
          logger.debug(`[NeuroLink] ✅ LOG_POINT_C020_LANGFUSE_INIT_SUCCESS`, {
            logPoint: "C020_LANGFUSE_INIT_SUCCESS",
            constructorId,
            timestamp: new Date().toISOString(),
            elapsedMs: Date.now() - constructorStartTime,
            elapsedNs: (
              process.hrtime.bigint() - constructorHrTimeStart
            ).toString(),
            langfuseInitDurationNs: langfuseInitDurationNs.toString(),
            langfuseInitDurationMs: Number(langfuseInitDurationNs) / 1_000_000,
            healthStatus,
            message: "Langfuse observability initialized successfully",
          });
        } else {
          logger.warn(`[NeuroLink] ⚠️ LOG_POINT_C021_LANGFUSE_INIT_WARNING`, {
            logPoint: "C021_LANGFUSE_INIT_WARNING",
            constructorId,
            timestamp: new Date().toISOString(),
            elapsedMs: Date.now() - constructorStartTime,
            elapsedNs: (
              process.hrtime.bigint() - constructorHrTimeStart
            ).toString(),
            langfuseInitDurationNs: langfuseInitDurationNs.toString(),
            healthStatus,
            message: "Langfuse initialized but not healthy",
          });
        }
      } else {
        logger.debug(`[NeuroLink] 🚫 LOG_POINT_C022_LANGFUSE_DISABLED`, {
          logPoint: "C022_LANGFUSE_DISABLED",
          constructorId,
          timestamp: new Date().toISOString(),
          elapsedMs: Date.now() - constructorStartTime,
          elapsedNs: (
            process.hrtime.bigint() - constructorHrTimeStart
          ).toString(),
          message:
            "Langfuse observability not enabled - skipping initialization",
        });
      }
    } catch (error) {
      const langfuseInitErrorDurationNs =
        process.hrtime.bigint() - langfuseInitStartTime;

      logger.error(`[NeuroLink] ❌ LOG_POINT_C023_LANGFUSE_INIT_ERROR`, {
        logPoint: "C023_LANGFUSE_INIT_ERROR",
        constructorId,
        timestamp: new Date().toISOString(),
        elapsedMs: Date.now() - constructorStartTime,
        elapsedNs: (
          process.hrtime.bigint() - constructorHrTimeStart
        ).toString(),
        langfuseInitDurationNs: langfuseInitErrorDurationNs.toString(),
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        message: "Langfuse observability initialization failed",
      });
    }
  }

  /**
   * Log constructor completion with final state summary
   */
  private logConstructorComplete(
    constructorId: string,
    constructorStartTime: number,
    constructorHrTimeStart: bigint,
  ): void {
    const constructorEndTime = process.hrtime.bigint();
    const constructorDurationNs = constructorEndTime - constructorHrTimeStart;

    logger.debug(`🏁 LOG_POINT_C014_CONSTRUCTOR_COMPLETE`, {
      logPoint: "C014_CONSTRUCTOR_COMPLETE",
      constructorId,
      timestamp: new Date().toISOString(),
      constructorDurationNs: constructorDurationNs.toString(),
      constructorDurationMs:
        Number(constructorDurationNs) / NANOSECOND_TO_MS_DIVISOR,
      totalElapsedMs: Date.now() - constructorStartTime,
      finalState: {
        hasConversationMemory: !!this.conversationMemory,
        hasExternalServerManager: !!this.externalServerManager,
        hasEmitter: !!this.emitter,
        mcpInitialized: this.mcpInitialized,
        toolCircuitBreakersCount: this.toolCircuitBreakers.size,
        toolExecutionMetricsCount: this.toolExecutionMetrics.size,
      },
      finalMemoryUsage: process.memoryUsage(),
      finalCpuUsage: process.cpuUsage(),
      message:
        "NeuroLink constructor completed successfully with all components initialized",
    });
  }

  /**
   * Initialize MCP registry with enhanced error handling and resource cleanup
   * Uses isolated async context to prevent hanging
   */
  private async initializeMCP(): Promise<void> {
    const mcpInitId = `mcp-init-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const mcpInitStartTime = Date.now();
    const mcpInitHrTimeStart = process.hrtime.bigint();

    const MemoryManager = await this.importPerformanceManager(
      mcpInitId,
      mcpInitStartTime,
      mcpInitHrTimeStart,
    );
    const startMemory = MemoryManager
      ? MemoryManager.getMemoryUsageMB()
      : { heapUsed: 0, heapTotal: 0, rss: 0, external: 0 };

    try {
      await this.performMCPInitialization(
        mcpInitId,
        mcpInitStartTime,
        mcpInitHrTimeStart,
        startMemory,
      );
      this.mcpInitialized = true;
      this.logMCPInitComplete(startMemory, MemoryManager, mcpInitStartTime);
    } catch (error) {
      const initializationTime = Date.now() - mcpInitStartTime;
      const initializationTimeNs = process.hrtime.bigint() - mcpInitHrTimeStart;

      mcpLogger.warn("[NeuroLink] MCP initialization failed", {
        mcpInitId,
        error: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorStack: error instanceof Error ? error.stack : undefined,
        initializationTime,
        initializationTimeNs: initializationTimeNs.toString(),
        initializationPhase: "performMCPInitialization",
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString(),
        gracefulDegradation: true,
      });
      // Continue without MCP - graceful degradation
    }
  }

  /**
   * Import performance manager with error handling
   */
  private async importPerformanceManager(
    mcpInitId: string,
    mcpInitStartTime: number,
    mcpInitHrTimeStart: bigint,
  ): Promise<
    typeof import("./utils/performance.js").MemoryManager | undefined
  > {
    const performanceImportStartTime = process.hrtime.bigint();

    try {
      const moduleImport = await import("./utils/performance.js");
      const MemoryManager = moduleImport.MemoryManager;
      return MemoryManager;
    } catch (error) {
      const performanceImportErrorTime = process.hrtime.bigint();
      const performanceImportDurationNs =
        performanceImportErrorTime - performanceImportStartTime;

      logger.warn(`[NeuroLink] ⚠️ LOG_POINT_M005_PERFORMANCE_IMPORT_ERROR`, {
        logPoint: "M005_PERFORMANCE_IMPORT_ERROR",
        mcpInitId,
        timestamp: new Date().toISOString(),
        elapsedMs: Date.now() - mcpInitStartTime,
        elapsedNs: (process.hrtime.bigint() - mcpInitHrTimeStart).toString(),
        performanceImportDurationNs: performanceImportDurationNs.toString(),
        performanceImportDurationMs:
          Number(performanceImportDurationNs) / NANOSECOND_TO_MS_DIVISOR,
        error: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : "UnknownError",
        message:
          "MemoryManager import failed - continuing without performance tracking",
      });
      return undefined;
    }
  }

  /**
   * Perform main MCP initialization logic
   */
  private async performMCPInitialization(
    mcpInitId: string,
    mcpInitStartTime: number,
    mcpInitHrTimeStart: bigint,
    startMemory: {
      heapUsed: number;
      heapTotal: number;
      rss: number;
      external: number;
    },
  ): Promise<void> {
    logger.info(`[NeuroLink] 🚀 LOG_POINT_M006_MCP_MAIN_INIT_START`, {
      logPoint: "M006_MCP_MAIN_INIT_START",
      mcpInitId,
      timestamp: new Date().toISOString(),
      elapsedMs: Date.now() - mcpInitStartTime,
      elapsedNs: (process.hrtime.bigint() - mcpInitHrTimeStart).toString(),
      startMemory,
      message: "Starting isolated MCP initialization process",
    });

    mcpLogger.debug("[NeuroLink] Starting isolated MCP initialization...");

    await this.initializeToolRegistryInternal();
    await this.initializeProviderRegistryInternal();
    await this.registerDirectToolsServerInternal(
      mcpInitId,
      mcpInitStartTime,
      mcpInitHrTimeStart,
    );
    await this.loadMCPConfigurationInternal();
  }

  /**
   * Initialize tool registry with timeout protection
   */
  private async initializeToolRegistryInternal(): Promise<void> {
    const initTimeout = 3000;

    await Promise.race([
      Promise.resolve(),
      new Promise<void>((_, reject) => {
        setTimeout(
          () => reject(new Error("MCP initialization timeout")),
          initTimeout,
        );
      }),
    ]);
  }

  /**
   * Initialize provider registry
   */
  private async initializeProviderRegistryInternal(): Promise<void> {
    await ProviderRegistry.registerAllProviders();
  }

  /**
   * Register direct tools server
   */
  private async registerDirectToolsServerInternal(
    mcpInitId: string,
    mcpInitStartTime: number,
    mcpInitHrTimeStart: bigint,
  ): Promise<void> {
    const directToolsStartTime = process.hrtime.bigint();

    try {
      if (process.env.NEUROLINK_DISABLE_DIRECT_TOOLS === "true") {
        mcpLogger.debug(
          "Direct tools server are disabled via environment variable.",
        );
      } else {
        await this.toolRegistry.registerServer(
          "neurolink-direct",
          directToolsServer,
        );

        mcpLogger.debug(
          "[NeuroLink] Direct tools server registered successfully",
          {
            serverId: "neurolink-direct",
          },
        );
      }
    } catch (error) {
      const directToolsErrorTime = process.hrtime.bigint();
      const directToolsDurationNs = directToolsErrorTime - directToolsStartTime;

      logger.warn(`[NeuroLink] ⚠️ LOG_POINT_M013_DIRECT_TOOLS_ERROR`, {
        logPoint: "M013_DIRECT_TOOLS_ERROR",
        mcpInitId,
        timestamp: new Date().toISOString(),
        elapsedMs: Date.now() - mcpInitStartTime,
        elapsedNs: (process.hrtime.bigint() - mcpInitHrTimeStart).toString(),
        directToolsDurationNs: directToolsDurationNs.toString(),
        directToolsDurationMs:
          Number(directToolsDurationNs) / NANOSECOND_TO_MS_DIVISOR,
        error: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorStack: error instanceof Error ? error.stack : undefined,
        serverId: "neurolink-direct",
        message: "Direct tools server registration failed but continuing",
      });

      mcpLogger.warn("[NeuroLink] Failed to register direct tools server", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Load MCP configuration from .mcp-config.json with parallel loading for improved performance
   */
  private async loadMCPConfigurationInternal(): Promise<void> {
    try {
      const configResult =
        await this.externalServerManager.loadMCPConfiguration(
          undefined, // Use default config path
          { parallel: true }, // Enable parallel loading
        );

      mcpLogger.debug("[NeuroLink] MCP configuration loaded successfully", {
        serversLoaded: configResult.serversLoaded,
        errors: configResult.errors.length,
      });

      if (configResult.errors.length > 0) {
        mcpLogger.warn("[NeuroLink] Some MCP servers failed to load", {
          errors: configResult.errors,
        });
      }
    } catch (configError) {
      mcpLogger.warn("[NeuroLink] MCP configuration loading failed", {
        error:
          configError instanceof Error
            ? configError.message
            : String(configError),
      });
    }
  }

  /**
   * Log MCP initialization completion
   */
  private logMCPInitComplete(
    startMemory: {
      heapUsed: number;
      heapTotal: number;
      rss: number;
      external: number;
    },
    MemoryManager:
      | typeof import("./utils/performance.js").MemoryManager
      | undefined,
    mcpInitStartTime: number,
  ): void {
    const endMemory = MemoryManager
      ? MemoryManager.getMemoryUsageMB()
      : { heapUsed: 0, heapTotal: 0, rss: 0, external: 0 };
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
    const initTime = Date.now() - mcpInitStartTime;

    mcpLogger.debug("[NeuroLink] MCP initialization completed successfully", {
      initTime: `${initTime}ms`,
      memoryUsed: `${memoryDelta}MB`,
    });

    if (memoryDelta > MEMORY_THRESHOLDS.MODERATE_USAGE_MB) {
      mcpLogger.debug(
        "💡 Memory cleanup suggestion: MCP initialization used significant memory. Consider calling MemoryManager.forceGC() after heavy operations.",
      );
    }
  }

  /**
   * Apply orchestration to determine optimal provider and model
   * @param options - Original GenerateOptions
   * @returns Modified options with orchestrated provider marked in context, or empty object if validation fails
   */
  private async applyOrchestration(
    options: GenerateOptions,
  ): Promise<Partial<GenerateOptions>> {
    const startTime = Date.now();

    try {
      // Ensure input.text exists before proceeding
      if (!options.input?.text || typeof options.input.text !== "string") {
        logger.debug("Orchestration skipped - no valid input text", {
          hasInput: !!options.input,
          hasText: !!options.input?.text,
          textType: typeof options.input?.text,
        });
        return {}; // Return empty object to preserve existing fallback behavior
      }

      // Compute classification once to avoid duplicate calls
      const classification = BinaryTaskClassifier.classify(options.input.text);

      // Use the model router to get the optimal route
      const route = ModelRouter.route(options.input.text);

      // Validate that the routed provider is available and configured
      const isProviderAvailable = await this.hasProviderEnvVars(route.provider);

      if (!isProviderAvailable && route.provider !== "ollama") {
        logger.debug("Orchestration provider validation failed", {
          taskType: classification.type,
          routedProvider: route.provider,
          routedModel: route.model,
          reason: "Provider not configured or missing environment variables",
          orchestrationTime: `${Date.now() - startTime}ms`,
        });
        return {}; // Return empty object to preserve existing fallback behavior
      }

      // For Ollama, check if service is running and model is available
      if (route.provider === "ollama") {
        try {
          const response = await fetch("http://localhost:11434/api/tags", {
            method: "GET",
            signal: AbortSignal.timeout(2000),
          });

          if (!response.ok) {
            logger.debug("Orchestration provider validation failed", {
              taskType: classification.type,
              routedProvider: route.provider,
              routedModel: route.model,
              reason: "Ollama service not responding",
              orchestrationTime: `${Date.now() - startTime}ms`,
            });
            return {}; // Return empty object to preserve existing fallback behavior
          }

          const responseData = await response.json();
          const models = responseData?.models;

          // Runtime-safe guard: ensure models is an array with valid objects
          if (!Array.isArray(models)) {
            logger.warn("Ollama API returned invalid models format", {
              responseData,
              modelsType: typeof models,
            });
            return {}; // Return empty object for fallback behavior
          }

          // Filter and validate models before comparison
          const validModels = models.filter(
            (m): m is { name: string } =>
              m && typeof m === "object" && typeof m.name === "string",
          );

          const targetModel = route.model || "llama3.2:latest";
          const modelIsAvailable = validModels.some(
            (m) => m.name === targetModel,
          );

          if (!modelIsAvailable) {
            logger.debug("Orchestration provider validation failed", {
              taskType: classification.type,
              routedProvider: route.provider,
              routedModel: route.model,
              reason: `Ollama model '${route.model || "llama3.2:latest"}' not found`,
              orchestrationTime: `${Date.now() - startTime}ms`,
            });
            return {}; // Return empty object to preserve existing fallback behavior
          }
        } catch (error) {
          logger.debug("Orchestration provider validation failed", {
            taskType: classification.type,
            routedProvider: route.provider,
            routedModel: route.model,
            reason:
              error instanceof Error
                ? error.message
                : "Ollama service check failed",
            orchestrationTime: `${Date.now() - startTime}ms`,
          });
          return {}; // Return empty object to preserve existing fallback behavior
        }
      }

      logger.debug("Orchestration route determined", {
        taskType: classification.type,
        selectedProvider: route.provider,
        selectedModel: route.model,
        confidence: route.confidence,
        reasoning: route.reasoning,
        orchestrationTime: `${Date.now() - startTime}ms`,
      });

      // Mark preferred provider in context instead of directly setting provider
      // This preserves global fallback behavior while indicating orchestration preference
      return {
        model: route.model,
        context: {
          ...(options.context || {}),
          __orchestratedPreferredProvider: route.provider,
        },
      };
    } catch (error) {
      logger.error("Orchestration failed", {
        error: error instanceof Error ? error.message : String(error),
        orchestrationTime: `${Date.now() - startTime}ms`,
      });
      throw error;
    }
  }

  /**
   * Apply orchestration to determine optimal provider and model for streaming
   * @param options - Original StreamOptions
   * @returns Modified options with orchestrated provider marked in context, or empty object if validation fails
   */
  private async applyStreamOrchestration(
    options: StreamOptions,
  ): Promise<Partial<StreamOptions>> {
    const startTime = Date.now();

    try {
      // Ensure input.text exists before proceeding
      if (!options.input?.text || typeof options.input.text !== "string") {
        logger.debug("Stream orchestration skipped - no valid input text", {
          hasInput: !!options.input,
          hasText: !!options.input?.text,
          textType: typeof options.input?.text,
        });
        return {}; // Return empty object to preserve existing fallback behavior
      }

      // Compute classification once to avoid duplicate calls
      const classification = BinaryTaskClassifier.classify(options.input.text);

      // Use the model router to get the optimal route
      const route = ModelRouter.route(options.input.text);

      // Validate that the routed provider is available and configured
      const isProviderAvailable = await this.hasProviderEnvVars(route.provider);

      if (!isProviderAvailable && route.provider !== "ollama") {
        logger.debug("Stream orchestration provider validation failed", {
          taskType: classification.type,
          routedProvider: route.provider,
          routedModel: route.model,
          reason: "Provider not configured or missing environment variables",
          orchestrationTime: `${Date.now() - startTime}ms`,
        });
        return {}; // Return empty object to preserve existing fallback behavior
      }

      // For Ollama, check if service is running and model is available
      if (route.provider === "ollama") {
        try {
          const response = await fetch("http://localhost:11434/api/tags", {
            method: "GET",
            signal: AbortSignal.timeout(2000),
          });

          if (!response.ok) {
            logger.debug("Stream orchestration provider validation failed", {
              taskType: classification.type,
              routedProvider: route.provider,
              routedModel: route.model,
              reason: "Ollama service not responding",
              orchestrationTime: `${Date.now() - startTime}ms`,
            });
            return {}; // Return empty object to preserve existing fallback behavior
          }

          const responseData = await response.json();
          const models = responseData?.models;

          // Runtime-safe guard: ensure models is an array with valid objects
          if (!Array.isArray(models)) {
            logger.warn("Ollama API returned invalid models format in stream", {
              responseData,
              modelsType: typeof models,
            });
            return {}; // Return empty object for fallback behavior
          }

          // Filter and validate models before comparison
          const validModels = models.filter(
            (m): m is { name: string } =>
              m && typeof m === "object" && typeof m.name === "string",
          );

          const targetModel = route.model || "llama3.2:latest";
          const modelIsAvailable = validModels.some(
            (m) => m.name === targetModel,
          );

          if (!modelIsAvailable) {
            logger.debug("Stream orchestration provider validation failed", {
              taskType: classification.type,
              routedProvider: route.provider,
              routedModel: route.model,
              reason: `Ollama model '${route.model || "llama3.2:latest"}' not found`,
              orchestrationTime: `${Date.now() - startTime}ms`,
            });
            return {}; // Return empty object to preserve existing fallback behavior
          }
        } catch (error) {
          logger.debug("Stream orchestration provider validation failed", {
            taskType: classification.type,
            routedProvider: route.provider,
            routedModel: route.model,
            reason:
              error instanceof Error
                ? error.message
                : "Ollama service check failed",
            orchestrationTime: `${Date.now() - startTime}ms`,
          });
          return {}; // Return empty object to preserve existing fallback behavior
        }
      }

      logger.debug("Stream orchestration route determined", {
        taskType: classification.type,
        selectedProvider: route.provider,
        selectedModel: route.model,
        confidence: route.confidence,
        reasoning: route.reasoning,
        orchestrationTime: `${Date.now() - startTime}ms`,
      });

      // Mark preferred provider in context instead of directly setting provider
      // This preserves global fallback behavior while indicating orchestration preference
      return {
        model: route.model,
        context: {
          ...(options.context || {}),
          __orchestratedPreferredProvider: route.provider,
        },
      };
    } catch (error) {
      logger.error("Stream orchestration failed", {
        error: error instanceof Error ? error.message : String(error),
        orchestrationTime: `${Date.now() - startTime}ms`,
      });
      throw error;
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
   * Generate AI content using the best available provider with MCP tool integration.
   * This is the primary method for text generation with full feature support.
   *
   * @param optionsOrPrompt - Either a string prompt or a comprehensive GenerateOptions object
   * @param optionsOrPrompt.input - Input configuration object
   * @param optionsOrPrompt.input.text - The text prompt to send to the AI (required)
   * @param optionsOrPrompt.provider - AI provider to use ('auto', 'openai', 'anthropic', etc.)
   * @param optionsOrPrompt.model - Specific model to use (e.g., 'gpt-4', 'claude-3-opus')
   * @param optionsOrPrompt.temperature - Randomness in response (0.0 = deterministic, 2.0 = very random)
   * @param optionsOrPrompt.maxTokens - Maximum tokens in response
   * @param optionsOrPrompt.systemPrompt - System message to set AI behavior
   * @param optionsOrPrompt.disableTools - Whether to disable MCP tool usage
   * @param optionsOrPrompt.enableAnalytics - Whether to include usage analytics
   * @param optionsOrPrompt.enableEvaluation - Whether to include response quality evaluation
   * @param optionsOrPrompt.context - Additional context for the request
   * @param optionsOrPrompt.evaluationDomain - Domain for specialized evaluation
   * @param optionsOrPrompt.toolUsageContext - Context for tool usage decisions
   *
   * @returns Promise resolving to GenerateResult with content, usage data, and optional analytics
   *
   * @example
   * ```typescript
   * // Simple usage with string prompt
   * const result = await neurolink.generate("What is artificial intelligence?");
   * console.log(result.content);
   *
   * // Advanced usage with options
   * const result = await neurolink.generate({
   *   input: { text: "Explain quantum computing" },
   *   provider: "openai",
   *   model: "gpt-4",
   *   temperature: 0.7,
   *   maxTokens: 500,
   *   enableAnalytics: true,
   *   enableEvaluation: true,
   *   context: { domain: "science", level: "intermediate" }
   * });
   *
   * // Access analytics and evaluation data
   * console.log(result.analytics?.usage);
   * console.log(result.evaluation?.relevance);
   * ```
   *
   * @throws {Error} When input text is missing or invalid
   * @throws {Error} When all providers fail to generate content
   * @throws {Error} When conversation memory operations fail (if enabled)
   */

  /**
   * Get observability configuration
   */
  getObservabilityConfig(): ObservabilityConfig | undefined {
    return this.observabilityConfig;
  }

  /**
   * Check if Langfuse telemetry is enabled
   * Centralized utility to avoid duplication across providers
   */
  isTelemetryEnabled(): boolean {
    return this.observabilityConfig?.langfuse?.enabled || false;
  }

  /**
   * Public method to initialize Langfuse observability
   * This method can be called externally to ensure Langfuse is properly initialized
   */
  async initializeLangfuseObservability(): Promise<void> {
    try {
      const langfuseConfig = this.observabilityConfig?.langfuse;

      if (langfuseConfig?.enabled) {
        initializeOpenTelemetry(langfuseConfig);

        logger.debug(
          "[NeuroLink] Langfuse observability initialized via public method",
        );
      } else {
        logger.debug(
          "[NeuroLink] Langfuse not enabled, skipping initialization",
        );
      }
    } catch (error) {
      logger.warn(
        "[NeuroLink] Failed to initialize Langfuse observability:",
        error,
      );
    }
  }

  /**
   * Gracefully shutdown NeuroLink and all MCP connections
   */
  async shutdown(): Promise<void> {
    try {
      logger.debug("[NeuroLink] Starting graceful shutdown");

      try {
        await flushOpenTelemetry();
        await shutdownOpenTelemetry();
        logger.debug("[NeuroLink] OpenTelemetry shutdown completed");
      } catch (error) {
        logger.warn("[NeuroLink] OpenTelemetry shutdown failed:", error);
      }

      if (this.externalServerManager) {
        try {
          await this.externalServerManager.shutdown();
          logger.debug("[NeuroLink] MCP servers shutdown completed");
        } catch (error) {
          logger.warn("[NeuroLink] MCP servers shutdown failed:", error);
        }
      }

      logger.debug("[NeuroLink] Graceful shutdown completed");
    } catch (error) {
      logger.error("[NeuroLink] Shutdown failed:", error);
      throw error;
    }
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

    // Set session and user IDs from context for Langfuse spans and execute with proper async scoping
    return await this.setLangfuseContextFromOptions(options, async () => {
      if (
        this.conversationMemoryConfig?.conversationMemory?.mem0Enabled &&
        options.context?.userId
      ) {
        try {
          const mem0 = await this.ensureMem0Ready();
          if (!mem0) {
            logger.debug(
              "Mem0 not available, continuing without memory retrieval",
            );
          } else {
            const memories = await mem0.search(options.input.text, {
              user_id: options.context.userId as string,
              limit: 5,
            });

            if (memories && memories.length > 0) {
              // Enhance the input with memory context
              const memoryContext = this.extractMemoryContext(memories);

              options.input.text = this.formatMemoryContext(
                memoryContext,
                options.input.text,
              );
            }
          }
        } catch (error) {
          logger.warn("Mem0 memory retrieval failed:", error);
        }
      }

      const startTime = Date.now();

      // Apply orchestration if enabled and no specific provider/model requested
      if (this.enableOrchestration && !options.provider && !options.model) {
        try {
          const orchestratedOptions = await this.applyOrchestration(options);
          logger.debug("Orchestration applied", {
            originalProvider: options.provider || "auto",
            orchestratedProvider: orchestratedOptions.provider,
            orchestratedModel: orchestratedOptions.model,
            prompt: options.input.text.substring(0, 100),
          });

          // Use orchestrated options
          Object.assign(options, orchestratedOptions);
        } catch (error) {
          logger.warn(
            "Orchestration failed, continuing with original options",
            {
              error: error instanceof Error ? error.message : String(error),
              originalProvider: options.provider || "auto",
            },
          );
          // Continue with original options if orchestration fails
        }
      }

      // Emit generation start event (NeuroLink format - keep existing)
      this.emitter.emit("generation:start", {
        provider: options.provider || "auto",
        timestamp: startTime,
      });

      // ADD: Bedrock-compatible response:start event
      this.emitter.emit("response:start");

      // ADD: Bedrock-compatible message event
      this.emitter.emit(
        "message",
        `Starting ${options.provider || "auto"} text generation...`,
      );

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

      // 🔧 CRITICAL FIX: Convert to TextGenerationOptions while preserving the input object for multimodal support
      const baseOptions: TextGenerationOptions = {
        prompt: options.input.text,
        provider: options.provider as AIProviderName,
        model: options.model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        systemPrompt: options.systemPrompt,
        schema: options.schema,
        output: options.output,
        disableTools: options.disableTools,
        enableAnalytics: options.enableAnalytics,
        enableEvaluation: options.enableEvaluation,
        context: options.context as Record<string, JsonValue> | undefined,
        evaluationDomain: options.evaluationDomain,
        toolUsageContext: options.toolUsageContext,
        input: options.input, // This includes text, images, and content arrays
        region: options.region,
      };

      // Apply factory enhancement using centralized utilities
      const textOptions = enhanceTextGenerationOptions(
        baseOptions,
        factoryResult,
      );

      // Pass conversation memory config if available
      if (this.conversationMemory) {
        textOptions.conversationMemoryConfig = this.conversationMemory.config;
        // Include original prompt for context summarization
        textOptions.originalPrompt = originalPrompt;
      }

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

      // Emit generation completion event (NeuroLink format - enhanced with content)
      this.emitter.emit("generation:end", {
        provider: textResult.provider,
        responseTime: Date.now() - startTime,
        toolsUsed: textResult.toolsUsed,
        timestamp: Date.now(),
        result: textResult, // Enhanced: include full result
      });

      // ADD: Bedrock-compatible response:end event with content
      this.emitter.emit("response:end", textResult.content || "");

      // ADD: Bedrock-compatible message event
      this.emitter.emit(
        "message",
        `Generation completed in ${Date.now() - startTime}ms`,
      );

      // Convert back to GenerateResult
      const generateResult: GenerateResult = {
        content: textResult.content,
        provider: textResult.provider,
        model: textResult.model,
        usage: textResult.usage
          ? {
              input: textResult.usage.input || 0,
              output: textResult.usage.output || 0,
              total: textResult.usage.total || 0,
            }
          : undefined,
        responseTime: textResult.responseTime,
        toolsUsed: textResult.toolsUsed,
        toolExecutions: transformToolExecutions(textResult.toolExecutions),
        enhancedWithTools: textResult.enhancedWithTools,
        availableTools: transformAvailableTools(textResult.availableTools),
        analytics: textResult.analytics,
        evaluation: textResult.evaluation
          ? {
              ...textResult.evaluation,
              isOffTopic:
                ((textResult.evaluation as unknown as UnknownRecord)
                  .isOffTopic as boolean) ?? false,
              alertSeverity:
                ((textResult.evaluation as unknown as UnknownRecord)
                  .alertSeverity as "low" | "medium" | "high" | "none") ??
                ("none" as const),
              reasoning:
                ((textResult.evaluation as unknown as UnknownRecord)
                  .reasoning as string) ?? "No evaluation provided",
              evaluationModel:
                ((textResult.evaluation as unknown as UnknownRecord)
                  .evaluationModel as string) ?? "unknown",
              evaluationTime:
                ((textResult.evaluation as unknown as UnknownRecord)
                  .evaluationTime as number) ?? Date.now(),
              // Include evaluationDomain from original options
              evaluationDomain:
                ((textResult.evaluation as unknown as UnknownRecord)
                  .evaluationDomain as string) ??
                textOptions.evaluationDomain ??
                factoryResult.domainType,
            }
          : undefined,
      };

      if (
        this.conversationMemoryConfig?.conversationMemory?.mem0Enabled &&
        options.context?.userId &&
        generateResult.content
      ) {
        // Non-blocking memory storage - run in background
        setImmediate(async () => {
          try {
            const mem0 = await this.ensureMem0Ready();
            if (mem0) {
              await this.storeMem0ConversationTurn(
                mem0,
                originalPrompt,
                generateResult.content,
                options.context?.userId as string,
                {
                  timestamp: new Date().toISOString(),
                  provider: generateResult.provider,
                  model: generateResult.model,
                  type: "conversation_turn",
                },
              );
            }
          } catch (error) {
            // Non-blocking: Log error but don't fail the generation
            logger.warn("Mem0 memory storage failed:", error);
          }
        });
      }

      return generateResult;
    });
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
    const generateInternalId = `generate-internal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const generateInternalStartTime = Date.now();
    const generateInternalHrTimeStart = process.hrtime.bigint();
    const functionTag = "NeuroLink.generateTextInternal";

    this.logGenerateTextInternalStart(
      generateInternalId,
      generateInternalStartTime,
      generateInternalHrTimeStart,
      options,
      functionTag,
    );
    this.emitGenerationStartEvents(options);

    try {
      await this.initializeConversationMemoryForGeneration(
        generateInternalId,
        generateInternalStartTime,
        generateInternalHrTimeStart,
      );
      const mcpResult = await this.attemptMCPGeneration(
        options,
        generateInternalId,
        generateInternalStartTime,
        generateInternalHrTimeStart,
        functionTag,
      );

      if (mcpResult) {
        await storeConversationTurn(
          this.conversationMemory,
          options,
          mcpResult,
          new Date(generateInternalStartTime),
        );
        this.emitter.emit("response:end", mcpResult.content || "");
        return mcpResult;
      }

      const directResult = await this.directProviderGeneration(options);
      logger.debug(`[${functionTag}] Direct generation successful`);

      await storeConversationTurn(
        this.conversationMemory,
        options,
        directResult,
        new Date(generateInternalStartTime),
      );
      this.emitter.emit("response:end", directResult.content || "");
      this.emitter.emit("message", `Text generation completed successfully`);

      return directResult;
    } catch (error) {
      logger.error(`[${functionTag}] All generation methods failed`, {
        error: error instanceof Error ? error.message : String(error),
      });

      this.emitter.emit("response:end", "");
      this.emitter.emit(
        "error",
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Log generateTextInternal start with comprehensive analysis
   */
  private logGenerateTextInternalStart(
    generateInternalId: string,
    generateInternalStartTime: number,
    generateInternalHrTimeStart: bigint,
    options: TextGenerationOptions,
    functionTag: string,
  ): void {
    logger.debug(`[${functionTag}] Starting generation`, {
      provider: options.provider || "auto",
      promptLength: options.prompt?.length || 0,
      hasConversationMemory: !!this.conversationMemory,
    });
  }

  /**
   * Emit generation start events
   */
  private emitGenerationStartEvents(options: TextGenerationOptions): void {
    this.emitter.emit("response:start");
    this.emitter.emit(
      "message",
      `Starting ${options.provider || "auto"} text generation (internal)...`,
    );
  }

  /**
   * Initialize conversation memory for generation
   * Lazily initializes memory if needed from constructor flags
   */
  private async initializeConversationMemoryForGeneration(
    generateInternalId: string,
    generateInternalStartTime: number,
    generateInternalHrTimeStart: bigint,
  ): Promise<void> {
    const conversationMemoryStartTime = process.hrtime.bigint();

    // Handle lazy initialization if needed
    if (this.conversationMemoryNeedsInit && this.conversationMemoryConfig) {
      await this.lazyInitializeConversationMemory(
        generateInternalId,
        generateInternalStartTime,
        generateInternalHrTimeStart,
      );
    }

    // Normal initialization for already created memory manager
    if (this.conversationMemory) {
      logger.debug(
        `[NeuroLink] 🧠 LOG_POINT_G003_CONVERSATION_MEMORY_INIT_START`,
        {
          logPoint: "G003_CONVERSATION_MEMORY_INIT_START",
          generateInternalId,
          timestamp: new Date().toISOString(),
          elapsedMs: Date.now() - generateInternalStartTime,
          elapsedNs: (
            process.hrtime.bigint() - generateInternalHrTimeStart
          ).toString(),
          message: "Starting conversation memory initialization",
        },
      );

      await this.conversationMemory.initialize();

      const conversationMemoryEndTime = process.hrtime.bigint();
      const conversationMemoryDurationNs =
        conversationMemoryEndTime - conversationMemoryStartTime;

      logger.debug(
        `[NeuroLink] ✅ LOG_POINT_G004_CONVERSATION_MEMORY_INIT_SUCCESS`,
        {
          logPoint: "G004_CONVERSATION_MEMORY_INIT_SUCCESS",
          generateInternalId,
          timestamp: new Date().toISOString(),
          elapsedMs: Date.now() - generateInternalStartTime,
          elapsedNs: (
            process.hrtime.bigint() - generateInternalHrTimeStart
          ).toString(),
          conversationMemoryDurationNs: conversationMemoryDurationNs.toString(),
          conversationMemoryDurationMs:
            Number(conversationMemoryDurationNs) / NANOSECOND_TO_MS_DIVISOR,
          message: "Conversation memory initialization completed successfully",
        },
      );
    }
  }

  /**
   * Attempt MCP generation with retry logic
   */
  private async attemptMCPGeneration(
    options: TextGenerationOptions,
    generateInternalId: string,
    generateInternalStartTime: number,
    generateInternalHrTimeStart: bigint,
    functionTag: string,
  ): Promise<TextGenerationResult | null> {
    if (!options.disableTools) {
      return await this.performMCPGenerationRetries(
        options,
        generateInternalId,
        generateInternalStartTime,
        generateInternalHrTimeStart,
        functionTag,
      );
    }

    return null;
  }

  /**
   * Perform MCP generation with retry logic
   */
  private async performMCPGenerationRetries(
    options: TextGenerationOptions,
    generateInternalId: string,
    generateInternalStartTime: number,
    generateInternalHrTimeStart: bigint,
    functionTag: string,
  ): Promise<TextGenerationResult | null> {
    const maxMcpRetries = RETRY_ATTEMPTS.QUICK;

    const maxAttempts = maxMcpRetries + 1;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        logger.debug(
          `[${functionTag}] Attempting MCP generation (attempt ${attempt}/${maxAttempts})...`,
        );
        const mcpResult = await this.tryMCPGeneration(options);

        if (
          mcpResult &&
          (mcpResult.content ||
            (mcpResult.toolExecutions && mcpResult.toolExecutions.length > 0))
        ) {
          logger.debug(
            `[${functionTag}] MCP generation successful on attempt ${attempt}`,
            {
              contentLength: mcpResult.content?.length || 0,
              toolsUsed: mcpResult.toolsUsed?.length || 0,
              toolExecutions: mcpResult.toolExecutions?.length || 0,
            },
          );
          return mcpResult;
        } else {
          logger.debug(
            `[${functionTag}] MCP generation returned empty result on attempt ${attempt}`,
            {
              hasResult: !!mcpResult,
              hasContent: !!(mcpResult && mcpResult.content),
              contentLength: mcpResult?.content?.length || 0,
              toolExecutions: mcpResult?.toolExecutions?.length || 0,
            },
          );
        }
      } catch (error) {
        logger.debug(
          `[${functionTag}] MCP generation failed on attempt ${attempt}/${maxAttempts}`,
          {
            error: error instanceof Error ? error.message : String(error),
            willRetry: attempt < maxAttempts,
          },
        );

        if (attempt >= maxAttempts) {
          logger.debug(
            `[${functionTag}] All MCP attempts exhausted, falling back to direct generation`,
          );
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return null;
  }

  /**
   * Try MCP-enhanced generation (no fallback recursion)
   */
  private async tryMCPGeneration(
    options: TextGenerationOptions,
  ): Promise<TextGenerationResult | null> {
    // 🚀 EXHAUSTIVE LOGGING POINT T001: TRY MCP GENERATION ENTRY
    const tryMCPId = `try-mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tryMCPStartTime = Date.now();
    const tryMCPHrTimeStart = process.hrtime.bigint();
    const functionTag = "NeuroLink.tryMCPGeneration";

    try {
      // Initialize MCP if needed
      await this.initializeMCP();

      if (!this.mcpInitialized) {
        logger.warn(`[NeuroLink] ⚠️ LOG_POINT_T004_MCP_NOT_AVAILABLE`, {
          logPoint: "T004_MCP_NOT_AVAILABLE",
          tryMCPId,
          timestamp: new Date().toISOString(),
          elapsedMs: Date.now() - tryMCPStartTime,
          elapsedNs: (process.hrtime.bigint() - tryMCPHrTimeStart).toString(),
          mcpInitialized: this.mcpInitialized,
          mcpComponents: {
            hasExternalServerManager: !!this.externalServerManager,
            hasToolRegistry: !!this.toolRegistry,
            hasProviderRegistry: !!AIProviderFactory,
          },
          fallbackReason: "MCP_NOT_INITIALIZED",
          message:
            "MCP not available - returning null for fallback to direct generation",
        });
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
      const targetTool = availableTools.find(
        (t) =>
          t.name.includes("SuccessRateSRByTime") ||
          t.name.includes("juspay-analytics"),
      );
      logger.debug("Available tools for AI prompt generation", {
        toolsCount: availableTools.length,
        toolNames: availableTools.map((t) => t.name),
        hasTargetTool: !!targetTool,
        targetToolDetails: targetTool
          ? {
              name: targetTool.name,
              description: targetTool.description,
              server: targetTool.server,
            }
          : null,
      });

      // Create tool-aware system prompt
      const enhancedSystemPrompt = this.createToolAwareSystemPrompt(
        options.systemPrompt,
        availableTools,
      );
      logger.debug("Tool-aware system prompt created", {
        originalPromptLength: options.systemPrompt?.length || 0,
        enhancedPromptLength: enhancedSystemPrompt.length,
        enhancedPromptPreview: enhancedSystemPrompt.substring(0, 500) + "...",
      });

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
        options.region, // Pass region parameter
      );

      // ADD: Emit connection events for all providers (Bedrock-compatible)
      this.emitter.emit("connected");
      this.emitter.emit(
        "message",
        `${providerName} provider initialized successfully`,
      );

      // Enable tool execution for the provider using BaseProvider method
      provider.setupToolExecutor(
        {
          customTools: this.getCustomTools(),
          executeTool: this.executeTool.bind(this),
        },
        functionTag,
      );

      const result = await provider.generate({
        ...options,
        systemPrompt: enhancedSystemPrompt,
        conversationMessages, // Inject conversation history
      });

      const responseTime = Date.now() - tryMCPStartTime;

      // Enhanced result validation - consider tool executions as valid results
      const hasContent =
        result && result.content && result.content.trim().length > 0;
      const hasToolExecutions =
        result && result.toolExecutions && result.toolExecutions.length > 0;

      // Log detailed result analysis for debugging
      mcpLogger.debug(`[${functionTag}] Result validation:`, {
        hasResult: !!result,
        hasContent,
        hasToolExecutions,
        contentLength: result?.content?.length || 0,
        toolExecutionsCount: result?.toolExecutions?.length || 0,
        toolsUsedCount: result?.toolsUsed?.length || 0,
      });

      // Accept result if it has content OR successful tool executions
      if (!hasContent && !hasToolExecutions) {
        mcpLogger.debug(
          `[${functionTag}] Result rejected: no content and no tool executions`,
        );
        return null; // Let caller fall back to direct generation
      }

      // Transform tool executions with enhanced preservation
      const transformedToolExecutions = transformToolExecutionsForMCP(
        result.toolExecutions,
      );

      // Log transformation results
      mcpLogger.debug(`[${functionTag}] Tool execution transformation:`, {
        originalCount: result?.toolExecutions?.length || 0,
        transformedCount: transformedToolExecutions.length,
        transformedTools: transformedToolExecutions.map((te) => te.toolName),
      });

      // Return enhanced result with preserved tool information
      return {
        content: result.content || "", // Ensure content is never undefined
        provider: providerName,
        usage: result.usage,
        responseTime,
        toolsUsed: result.toolsUsed || [],
        toolExecutions: transformedToolExecutions,
        enhancedWithTools: Boolean(hasToolExecutions), // Mark as enhanced if tools were actually used
        availableTools: transformToolsForMCP(
          transformToolsToExpectedFormat(availableTools),
        ),
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

    // Check for orchestrated preferred provider in context
    const preferredOrchestrated =
      options.context &&
      typeof options.context === "object" &&
      "__orchestratedPreferredProvider" in options.context
        ? (options.context as { __orchestratedPreferredProvider?: string })
            .__orchestratedPreferredProvider
        : undefined;

    // Build provider list with orchestrated preference first, then fallback to full list
    const tryProviders = preferredOrchestrated
      ? [
          preferredOrchestrated,
          ...providerPriority.filter((p) => p !== preferredOrchestrated),
        ]
      : requestedProvider
        ? [requestedProvider]
        : providerPriority;

    logger.debug(`[${functionTag}] Starting direct generation`, {
      requestedProvider: requestedProvider || "auto",
      preferredOrchestrated: preferredOrchestrated || "none",
      tryProviders,
      allowFallback: !requestedProvider || !!preferredOrchestrated,
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
          options.region,
        );

        // ADD: Emit connection events for successful provider creation (Bedrock-compatible)
        this.emitter.emit("connected");
        this.emitter.emit(
          "message",
          `${providerName} provider initialized successfully`,
        );

        // Enable tool execution for direct provider generation using BaseProvider method
        provider.setupToolExecutor(
          {
            customTools: this.getCustomTools(),
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
    availableTools: ToolInfo[],
  ): string {
    // AI prompt generation with tool analysis and structured logging
    const promptGenerationData = {
      originalPromptLength: originalSystemPrompt?.length || 0,
      availableToolsCount: availableTools.length,
      hasOriginalPrompt: !!originalSystemPrompt,
    };

    logger.debug(
      "AI prompt generation with tool schemas",
      promptGenerationData,
    );

    if (availableTools.length === 0) {
      logger.debug("No tools available - returning original prompt");
      return originalSystemPrompt || "";
    }

    const toolDescriptions = transformToolsToDescriptions(
      availableTools.map((t) => ({
        name: t.name,
        description: t.description ?? "",
        server: t.serverId ?? "unknown",
        inputSchema: t.inputSchema,
      })),
    );

    const transformationResult = {
      toolDescriptionsLength: toolDescriptions.length,
      toolDescriptionsCharCount: toolDescriptions.length,
      hasDescriptions: toolDescriptions.length > 0,
    };

    logger.debug(
      "Tool descriptions transformation completed",
      transformationResult,
    );

    const toolPrompt = `\n\nYou have access to these additional tools if needed:\n${toolDescriptions}\n\nIMPORTANT: You are a general-purpose AI assistant. Answer all requests directly and creatively. These tools are optional helpers - use them only when they would genuinely improve your response. For creative tasks like storytelling, writing, or general conversation, respond naturally without requiring tools.`;

    const finalPrompt = (originalSystemPrompt || "") + toolPrompt;

    const finalPromptData = {
      originalPromptLength: originalSystemPrompt?.length || 0,
      toolPromptLength: toolPrompt.length,
      finalPromptLength: finalPrompt.length,
      promptEnhanced: toolPrompt.length > 0,
    };

    logger.debug("AI prompt generation completed", finalPromptData);

    return finalPrompt;
  }

  /**
   * Execute tools if available through centralized registry
   * Simplified approach without domain detection - relies on tool registry
   */
  private async detectAndExecuteTools(
    prompt: string,
    _domainType?: string,
  ): Promise<ToolExecutionResult> {
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

    // Convert StreamResult to simple string async iterable (filter text events only)
    async function* stringStream() {
      for await (const evt of result.stream as AsyncIterable<unknown>) {
        const anyEvt = evt as Record<string, unknown>;
        if (anyEvt && typeof anyEvt === "object" && "content" in anyEvt) {
          const content = anyEvt.content as string;
          if (typeof content === "string") {
            yield content;
          }
        }
      }
    }

    return stringStream();
  }

  /**
   * Stream AI-generated content in real-time using the best available provider.
   * This method provides real-time streaming of AI responses with full MCP tool integration.
   *
   * @param options - Stream configuration options
   * @param options.input - Input configuration object
   * @param options.input.text - The text prompt to send to the AI (required)
   * @param options.provider - AI provider to use ('auto', 'openai', 'anthropic', etc.)
   * @param options.model - Specific model to use (e.g., 'gpt-4', 'claude-3-opus')
   * @param options.temperature - Randomness in response (0.0 = deterministic, 2.0 = very random)
   * @param options.maxTokens - Maximum tokens in response
   * @param options.systemPrompt - System message to set AI behavior
   * @param options.disableTools - Whether to disable MCP tool usage
   * @param options.enableAnalytics - Whether to include usage analytics
   * @param options.enableEvaluation - Whether to include response quality evaluation
   * @param options.context - Additional context for the request
   * @param options.evaluationDomain - Domain for specialized evaluation
   *
   * @returns Promise resolving to StreamResult with an async iterable stream
   *
   * @example
   * ```typescript
   * // Basic streaming usage
   * const result = await neurolink.stream({
   *   input: { text: "Tell me a story about space exploration" }
   * });
   *
   * // Consume the stream
   * for await (const chunk of result.stream) {
   *   process.stdout.write(chunk.content);
   * }
   *
   * // Advanced streaming with options
   * const result = await neurolink.stream({
   *   input: { text: "Explain machine learning" },
   *   provider: "openai",
   *   model: "gpt-4",
   *   temperature: 0.7,
   *   enableAnalytics: true,
   *   context: { domain: "education", audience: "beginners" }
   * });
   *
   * // Access metadata and analytics
   * console.log(result.provider);
   * console.log(result.analytics?.usage);
   * ```
   *
   * @throws {Error} When input text is missing or invalid
   * @throws {Error} When all providers fail to generate content
   * @throws {Error} When conversation memory operations fail (if enabled)
   */
  async stream(options: StreamOptions): Promise<StreamResult> {
    const startTime = Date.now();
    const hrTimeStart = process.hrtime.bigint();
    const streamId = `neurolink-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const originalPrompt = options.input.text; // Store the original prompt for memory storage

    await this.validateStreamInput(options);
    this.emitStreamStartEvents(options, startTime);

    // Set session and user IDs from context for Langfuse spans and execute with proper async scoping
    return await this.setLangfuseContextFromOptions(options, async () => {
      let enhancedOptions: StreamOptions;
      let factoryResult: {
        hasStreamingConfig: boolean;
        streamingEnabled?: boolean;
        enhancedConfig?: StreamOptions["streaming"];
      };

      try {
        // Initialize conversation memory if needed (for lazy loading)
        await this.initializeConversationMemoryForGeneration(
          streamId,
          startTime,
          hrTimeStart,
        );

        // Initialize MCP
        await this.initializeMCP();
        const _originalPrompt = options.input.text;

        if (
          this.conversationMemoryConfig?.conversationMemory?.mem0Enabled &&
          options.context?.userId
        ) {
          try {
            const mem0 = await this.ensureMem0Ready();
            if (!mem0) {
              // Continue without memories if mem0 is not available
              logger.debug(
                "Mem0 not available, continuing without memory retrieval",
              );
            } else {
              const memories = await mem0.search(options.input.text, {
                user_id: options.context.userId as string,
                limit: 5,
              });

              if (memories && memories.length > 0) {
                // Enhance the input with memory context
                const memoryContext = this.extractMemoryContext(memories);

                options.input.text = this.formatMemoryContext(
                  memoryContext,
                  options.input.text,
                );
              }
            }
          } catch (error) {
            // Non-blocking: Log error but continue with streaming
            logger.warn("Mem0 memory retrieval failed:", error);
          }
        }

        // Apply orchestration if enabled and no specific provider/model requested
        if (this.enableOrchestration && !options.provider && !options.model) {
          try {
            const orchestratedOptions =
              await this.applyStreamOrchestration(options);
            logger.debug("Stream orchestration applied", {
              originalProvider: options.provider || "auto",
              orchestratedProvider: orchestratedOptions.provider,
              orchestratedModel: orchestratedOptions.model,
              prompt: options.input.text?.substring(0, 100),
            });

            // Use orchestrated options
            Object.assign(options, orchestratedOptions);
          } catch (error) {
            logger.warn(
              "Stream orchestration failed, continuing with original options",
              {
                error: error instanceof Error ? error.message : String(error),
                originalProvider: options.provider || "auto",
              },
            );
            // Continue with original options if orchestration fails
          }
        }

        // 🔧 AUTO-DISABLE TOOLS: For Ollama models that don't support tools (same logic as generate())
        // This prevents overwhelming smaller models with massive tool descriptions in the system message
        if (
          (options.provider === "ollama" ||
            options.provider?.toLowerCase().includes("ollama")) &&
          !options.disableTools
        ) {
          const { ModelConfigurationManager } = await import(
            "./core/modelConfiguration.js"
          );
          const modelConfig = ModelConfigurationManager.getInstance();
          const ollamaConfig = modelConfig.getProviderConfiguration("ollama");
          const toolCapableModels =
            (ollamaConfig?.modelBehavior?.toolCapableModels as string[]) || [];

          // Only disable tools if we have explicit evidence the model doesn't support them
          // If toolCapableModels is empty or model is not specified, don't make assumptions
          const modelName = options.model;
          if (toolCapableModels.length > 0 && modelName) {
            const modelSupportsTools = toolCapableModels.some((capableModel) =>
              modelName.toLowerCase().includes(capableModel.toLowerCase()),
            );
            if (!modelSupportsTools) {
              options.disableTools = true;
              logger.debug(
                "Auto-disabled tools for Ollama model that doesn't support them (stream)",
                {
                  model: options.model,
                  toolCapableModels: toolCapableModels.slice(0, 3), // Show first 3 for brevity
                },
              );
            }
          }
        }

        factoryResult = processStreamingFactoryOptions(options);
        enhancedOptions = createCleanStreamOptions(options);
        if (options.input?.text) {
          const { toolResults: _toolResults, enhancedPrompt } =
            await this.detectAndExecuteTools(options.input.text, undefined);
          if (enhancedPrompt !== options.input.text) {
            enhancedOptions.input.text = enhancedPrompt;
          }
        }

        const { stream: mcpStream, provider: providerName } =
          await this.createMCPStream(enhancedOptions);

        // Create a wrapper around the stream that accumulates content
        let accumulatedContent = "";

        const processedStream = (async function* (self: NeuroLink) {
          try {
            for await (const chunk of mcpStream) {
              if (
                chunk &&
                "content" in chunk &&
                typeof chunk.content === "string"
              ) {
                accumulatedContent += chunk.content;
                // Emit chunk event for compatibility
                self.emitter.emit("response:chunk", chunk.content);
              }
              yield chunk; // Preserve original streaming behavior
            }
          } finally {
            // Store memory after stream consumption is complete
            if (self.conversationMemory && enhancedOptions.context?.sessionId) {
              const sessionId = (
                enhancedOptions.context as Record<string, unknown>
              )?.sessionId as string;
              const userId = (
                enhancedOptions.context as Record<string, unknown>
              )?.userId as string;

              try {
                await self.conversationMemory.storeConversationTurn(
                  sessionId,
                  userId,
                  originalPrompt ?? "",
                  accumulatedContent,
                  new Date(startTime),
                );

                logger.debug("Stream conversation turn stored", {
                  sessionId,
                  userInputLength: originalPrompt?.length ?? 0,
                  responseLength: accumulatedContent.length,
                });
              } catch (error) {
                logger.warn("Failed to store stream conversation turn", {
                  error: error instanceof Error ? error.message : String(error),
                });
              }
            }

            if (
              self.conversationMemoryConfig?.conversationMemory?.mem0Enabled &&
              enhancedOptions.context?.userId &&
              accumulatedContent.trim()
            ) {
              // Non-blocking memory storage - run in background
              setImmediate(async () => {
                try {
                  const mem0 = await self.ensureMem0Ready();
                  if (mem0) {
                    await self.storeMem0ConversationTurn(
                      mem0,
                      originalPrompt,
                      accumulatedContent.trim(),
                      enhancedOptions.context?.userId as string,
                      {
                        timestamp: new Date().toISOString(),
                        type: "conversation_turn_stream",
                      },
                    );
                  }
                } catch (error) {
                  logger.warn("Mem0 memory storage failed:", error);
                }
              });
            }
          }
        })(this);
        const streamResult = await this.processStreamResult(
          mcpStream,
          enhancedOptions,
          factoryResult,
        );
        const responseTime = Date.now() - startTime;

        this.emitStreamEndEvents(streamResult);

        return this.createStreamResponse(streamResult, processedStream, {
          providerName,
          options,
          startTime,
          responseTime,
          streamId,
          fallback: false,
        });
      } catch (error) {
        return this.handleStreamError(
          error,
          options,
          startTime,
          streamId,
          undefined,
          undefined,
        );
      }
    });
  }

  /**
   * Validate stream input with comprehensive error reporting
   */
  private async validateStreamInput(options: StreamOptions): Promise<void> {
    const validationStartTime = process.hrtime.bigint();
    logger.debug(`[NeuroLink] 🎯 LOG_POINT_003_VALIDATION_START`, {
      logPoint: "003_VALIDATION_START",
      validationStartTimeNs: validationStartTime.toString(),
      message: "Starting comprehensive input validation process",
    });

    const hasText =
      typeof options?.input?.text === "string" &&
      options.input.text.trim().length > 0;
    // Accept audio when frames are present; sampleRateHz is optional (defaults applied later)
    const hasAudio = !!(
      options?.input?.audio &&
      options.input.audio.frames &&
      typeof (options.input.audio.frames as unknown as Record<string, unknown>)[
        Symbol.asyncIterator as unknown as string
      ] !== "undefined"
    );

    if (!hasText && !hasAudio) {
      throw new Error(
        "Stream options must include either input.text or input.audio",
      );
    }
  }

  /**
   * Emit stream start events
   */
  private emitStreamStartEvents(
    options: StreamOptions,
    startTime: number,
  ): void {
    this.emitter.emit("stream:start", {
      provider: options.provider || "auto",
      timestamp: startTime,
    });
    this.emitter.emit("response:start");
    this.emitter.emit(
      "message",
      `Starting ${options.provider || "auto"} stream...`,
    );
  }

  /**
   * Create MCP stream
   */
  private async createMCPStream(options: StreamOptions): Promise<{
    stream: AsyncIterable<
      { content: string } | { type: "audio"; audio: AudioChunk }
    >;
    provider: string;
  }> {
    // Simplified placeholder - in the actual implementation this would contain the complex MCP stream logic
    const providerName = await getBestProvider(options.provider);
    const provider = await AIProviderFactory.createProvider(
      providerName,
      options.model,
      !options.disableTools, // Pass disableTools as inverse of enableMCP
      this as unknown as UnknownRecord, // Pass SDK instance
      options.region, // Pass region parameter
    );

    // Enable tool execution for the provider using BaseProvider method
    provider.setupToolExecutor(
      {
        customTools: this.getCustomTools(),
        executeTool: this.executeTool.bind(this),
      },
      "NeuroLink.createMCPStream",
    );

    // 🔧 FIX: Get available tools and create tool-aware system prompt
    // Use SAME pattern as tryMCPGeneration (generate mode)
    const availableTools = await this.getAllAvailableTools();
    const enhancedSystemPrompt = this.createToolAwareSystemPrompt(
      options.systemPrompt,
      availableTools,
    );

    // Get conversation messages for context
    const conversationMessages = await getConversationMessages(
      this.conversationMemory,
      {
        prompt: options.input.text,
        context: options.context as Record<string, unknown>,
      } as TextGenerationOptions,
    );

    // 🔧 FIX: Pass enhanced system prompt to real streaming
    // Tools will be accessed through the streamText call in executeStream
    const streamResult = await provider.stream({
      ...options,
      systemPrompt: enhancedSystemPrompt, // Use enhanced prompt with tool descriptions
      conversationMessages,
    });

    logger.debug("[createMCPStream] Stream created successfully", {
      provider: providerName,
      systemPromptPassedLength: enhancedSystemPrompt.length,
    });

    return { stream: streamResult.stream, provider: providerName };
  }

  /**
   * Process stream result
   */
  private async processStreamResult(
    _stream: AsyncIterable<
      { content: string } | { type: "audio"; audio: AudioChunk }
    >,
    _options: StreamOptions,
    _factoryResult: unknown,
  ): Promise<{
    content: string;
    usage?: TokenUsage;
    finishReason: string;
    toolCalls: ToolCall[];
    toolResults: ToolResult[];
    analytics?: AnalyticsData;
    evaluation?: EvaluationData;
  }> {
    // Simplified placeholder - in the actual implementation this would process the stream
    return {
      content: "",
      usage: undefined,
      finishReason: "stop",
      toolCalls: [],
      toolResults: [],
      analytics: undefined,
      evaluation: undefined,
    };
  }

  /**
   * Emit stream end events
   */
  private emitStreamEndEvents(streamResult: { content?: string }): void {
    this.emitter.emit("stream:end", {
      responseTime: Date.now(),
      timestamp: Date.now(),
    });
    this.emitter.emit("response:end", streamResult.content || "");
  }

  /**
   * Create stream response
   */
  private createStreamResponse(
    streamResult: {
      content: string;
      usage?: TokenUsage;
      finishReason: string;
      toolCalls: ToolCall[];
      toolResults: ToolResult[];
      analytics?: AnalyticsData;
      evaluation?: EvaluationData;
    },
    stream: AsyncIterable<
      { content: string } | { type: "audio"; audio: AudioChunk }
    >,
    config: {
      providerName: string;
      options: StreamOptions;
      startTime: number;
      responseTime: number;
      streamId: string;
      fallback?: boolean;
    },
  ): StreamResult {
    return {
      stream,
      provider: config.providerName,
      model: config.options.model,
      usage: streamResult.usage,
      finishReason: streamResult.finishReason,
      toolCalls: streamResult.toolCalls,
      toolResults: streamResult.toolResults,
      analytics: streamResult.analytics,
      evaluation: streamResult.evaluation,
      metadata: {
        streamId: config.streamId,
        startTime: config.startTime,
        responseTime: config.responseTime,
        fallback: config.fallback || false,
      },
    };
  }

  /**
   * Handle stream error with fallback
   */
  private async handleStreamError(
    error: unknown,
    options: StreamOptions,
    startTime: number,
    streamId: string,
    enhancedOptions?: StreamOptions,
    _factoryResult?: unknown,
  ): Promise<StreamResult> {
    logger.error("Stream generation failed, attempting fallback", {
      error: error instanceof Error ? error.message : String(error),
    });

    const originalPrompt = options.input.text;
    const responseTime = Date.now() - startTime;
    const providerName = await getBestProvider(options.provider);
    const provider = await AIProviderFactory.createProvider(
      providerName,
      options.model,
    );
    const fallbackStreamResult = await provider.stream({
      input: { text: options.input.text },
      model: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    });

    // Create a wrapper around the fallback stream that accumulates content
    let fallbackAccumulatedContent = "";

    const fallbackProcessedStream = (async function* (self: NeuroLink) {
      try {
        for await (const chunk of fallbackStreamResult.stream) {
          if (
            chunk &&
            "content" in chunk &&
            typeof chunk.content === "string"
          ) {
            fallbackAccumulatedContent += chunk.content;
            // Emit chunk event
            self.emitter.emit("response:chunk", chunk.content);
          }
          yield chunk; // Preserve original streaming behavior
        }
      } finally {
        // Store memory after fallback stream consumption is complete
        if (self.conversationMemory && enhancedOptions?.context?.sessionId) {
          const sessionId = (
            enhancedOptions?.context as Record<string, unknown>
          )?.sessionId as string;
          const userId = (enhancedOptions?.context as Record<string, unknown>)
            ?.userId as string;

          try {
            await self.conversationMemory.storeConversationTurn(
              sessionId || (options.context?.sessionId as string),
              userId || (options.context?.userId as string),
              originalPrompt ?? "",
              fallbackAccumulatedContent,
              new Date(startTime),
            );

            logger.debug("Fallback stream conversation turn stored", {
              sessionId: sessionId || options.context?.sessionId,
              userInputLength: originalPrompt?.length ?? 0,
              responseLength: fallbackAccumulatedContent.length,
            });
          } catch (error) {
            logger.warn("Failed to store fallback stream conversation turn", {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }
    })(this);

    return {
      stream: fallbackProcessedStream,
      provider: providerName,
      model: options.model,
      usage: fallbackStreamResult.usage,
      finishReason: fallbackStreamResult.finishReason || "stop",
      toolCalls: fallbackStreamResult.toolCalls || [],
      toolResults: fallbackStreamResult.toolResults || [],
      analytics: fallbackStreamResult.analytics,
      evaluation: fallbackStreamResult.evaluation,
      metadata: {
        streamId,
        startTime,
        responseTime,
        fallback: true,
      },
    };
  }

  /**
   * Get the EventEmitter instance to listen to NeuroLink events for real-time monitoring and debugging.
   * This method provides access to the internal event system that emits events during AI generation,
   * tool execution, streaming, and other operations for comprehensive observability.
   *
   * @returns EventEmitter instance that emits various NeuroLink operation events
   *
   * @example
   * ```typescript
   * // Basic event listening setup
   * const neurolink = new NeuroLink();
   * const emitter = neurolink.getEventEmitter();
   *
   * // Listen to generation events
   * emitter.on('generation:start', (event) => {
   *   console.log(`Generation started with provider: ${event.provider}`);
   *   console.log(`Started at: ${new Date(event.timestamp)}`);
   * });
   *
   * emitter.on('generation:end', (event) => {
   *   console.log(`Generation completed in ${event.responseTime}ms`);
   *   console.log(`Tools used: ${event.toolsUsed?.length || 0}`);
   * });
   *
   * // Listen to streaming events
   * emitter.on('stream:start', (event) => {
   *   console.log(`Streaming started with provider: ${event.provider}`);
   * });
   *
   * emitter.on('stream:end', (event) => {
   *   console.log(`Streaming completed in ${event.responseTime}ms`);
   *   if (event.fallback) console.log('Used fallback streaming');
   * });
   *
   * // Listen to tool execution events
   * emitter.on('tool:start', (event) => {
   *   console.log(`Tool execution started: ${event.toolName}`);
   * });
   *
   * emitter.on('tool:end', (event) => {
   *   console.log(`Tool ${event.toolName} ${event.success ? 'succeeded' : 'failed'}`);
   *   console.log(`Execution time: ${event.responseTime}ms`);
   * });
   *
   * // Listen to tool registration events
   * emitter.on('tools-register:start', (event) => {
   *   console.log(`Registering tool: ${event.toolName}`);
   * });
   *
   * emitter.on('tools-register:end', (event) => {
   *   console.log(`Tool registration ${event.success ? 'succeeded' : 'failed'}: ${event.toolName}`);
   * });
   *
   * // Listen to external MCP server events
   * emitter.on('externalMCP:serverConnected', (event) => {
   *   console.log(`External MCP server connected: ${event.serverId}`);
   *   console.log(`Tools available: ${event.toolCount || 0}`);
   * });
   *
   * emitter.on('externalMCP:serverDisconnected', (event) => {
   *   console.log(`External MCP server disconnected: ${event.serverId}`);
   *   console.log(`Reason: ${event.reason || 'Unknown'}`);
   * });
   *
   * emitter.on('externalMCP:toolDiscovered', (event) => {
   *   console.log(`New tool discovered: ${event.toolName} from ${event.serverId}`);
   * });
   *
   * // Advanced usage with error handling
   * emitter.on('error', (error) => {
   *   console.error('NeuroLink error:', error);
   * });
   *
   * // Clean up event listeners when done
   * function cleanup() {
   *   emitter.removeAllListeners();
   * }
   *
   * process.on('SIGINT', cleanup);
   * process.on('SIGTERM', cleanup);
   * ```
   *
   * @example
   * ```typescript
   * // Advanced monitoring with metrics collection
   * const neurolink = new NeuroLink();
   * const emitter = neurolink.getEventEmitter();
   * const metrics = {
   *   generations: 0,
   *   totalResponseTime: 0,
   *   toolExecutions: 0,
   *   failures: 0
   * };
   *
   * // Collect performance metrics
   * emitter.on('generation:end', (event) => {
   *   metrics.generations++;
   *   metrics.totalResponseTime += event.responseTime;
   *   metrics.toolExecutions += event.toolsUsed?.length || 0;
   * });
   *
   * emitter.on('tool:end', (event) => {
   *   if (!event.success) {
   *     metrics.failures++;
   *   }
   * });
   *
   * // Log metrics every 10 seconds
   * setInterval(() => {
   *   const avgResponseTime = metrics.generations > 0
   *     ? metrics.totalResponseTime / metrics.generations
   *     : 0;
   *
   *   console.log('NeuroLink Metrics:', {
   *     totalGenerations: metrics.generations,
   *     averageResponseTime: `${avgResponseTime.toFixed(2)}ms`,
   *     totalToolExecutions: metrics.toolExecutions,
   *     failureRate: `${((metrics.failures / (metrics.toolExecutions || 1)) * 100).toFixed(2)}%`
   *   });
   * }, 10000);
   * ```
   *
   * **Available Events:**
   *
   * **Generation Events:**
   * - `generation:start` - Fired when text generation begins
   *   - `{ provider: string, timestamp: number }`
   * - `generation:end` - Fired when text generation completes
   *   - `{ provider: string, responseTime: number, toolsUsed?: string[], timestamp: number }`
   *
   * **Streaming Events:**
   * - `stream:start` - Fired when streaming begins
   *   - `{ provider: string, timestamp: number }`
   * - `stream:end` - Fired when streaming completes
   *   - `{ provider: string, responseTime: number, fallback?: boolean }`
   *
   * **Tool Events:**
   * - `tool:start` - Fired when tool execution begins
   *   - `{ toolName: string, timestamp: number }`
   * - `tool:end` - Fired when tool execution completes
   *   - `{ toolName: string, responseTime: number, success: boolean, timestamp: number }`
   * - `tools-register:start` - Fired when tool registration begins
   *   - `{ toolName: string, timestamp: number }`
   * - `tools-register:end` - Fired when tool registration completes
   *   - `{ toolName: string, success: boolean, timestamp: number }`
   *
   * **External MCP Events:**
   * - `externalMCP:serverConnected` - Fired when external MCP server connects
   *   - `{ serverId: string, toolCount?: number, timestamp: number }`
   * - `externalMCP:serverDisconnected` - Fired when external MCP server disconnects
   *   - `{ serverId: string, reason?: string, timestamp: number }`
   * - `externalMCP:serverFailed` - Fired when external MCP server fails
   *   - `{ serverId: string, error: string, timestamp: number }`
   * - `externalMCP:toolDiscovered` - Fired when external MCP tool is discovered
   *   - `{ toolName: string, serverId: string, timestamp: number }`
   * - `externalMCP:toolRemoved` - Fired when external MCP tool is removed
   *   - `{ toolName: string, serverId: string, timestamp: number }`
   * - `externalMCP:serverAdded` - Fired when external MCP server is added
   *   - `{ serverId: string, config: MCPServerInfo, toolCount: number, timestamp: number }`
   * - `externalMCP:serverRemoved` - Fired when external MCP server is removed
   *   - `{ serverId: string, timestamp: number }`
   *
   * **Error Events:**
   * - `error` - Fired when an error occurs
   *   - `{ error: Error, context?: object }`
   *
   * @throws {Error} This method does not throw errors as it returns the internal EventEmitter
   *
   * @since 1.0.0
   * @see {@link https://nodejs.org/api/events.html} Node.js EventEmitter documentation
   * @see {@link NeuroLink.generate} for events related to text generation
   * @see {@link NeuroLink.stream} for events related to streaming
   * @see {@link NeuroLink.executeTool} for events related to tool execution
   */
  getEventEmitter() {
    return this.emitter;
  }

  // ========================================
  // ENHANCED: Tool Event Emission API
  // ========================================

  // TODO: Add ToolExecutionEvent utility methods in future version
  // Will provide structured event format for consistent tool event processing

  /**
   * Emit tool start event with execution tracking
   * @param toolName - Name of the tool being executed
   * @param input - Input parameters for the tool
   * @param startTime - Timestamp when execution started
   * @returns executionId for tracking this specific execution
   */
  emitToolStart(
    toolName: string,
    input: unknown,
    startTime: number = Date.now(),
  ): string {
    const executionId = `${toolName}-${startTime}-${Math.random().toString(36).substr(2, 9)}`;

    // Create execution context for tracking
    const context: ToolExecutionContext = {
      executionId,
      tool: toolName,
      startTime,
      metadata: {
        inputType: typeof input,
        hasInput: input !== undefined && input !== null,
      },
    };

    // Store in active executions
    this.activeToolExecutions.set(executionId, context);
    this.currentStreamToolExecutions.push(context);

    // Emit event (NeuroLinkEvents format for compatibility)
    this.emitter.emit("tool:start", {
      tool: toolName,
      input,
      timestamp: startTime,
      executionId,
    });

    logger.debug(`tool:start emitted for ${toolName}`, {
      toolName,
      executionId,
      timestamp: startTime,
      inputProvided: input !== undefined,
    });

    return executionId;
  }

  /**
   * Emit tool end event with execution summary
   * @param toolName - Name of the tool that finished
   * @param result - Result from the tool execution
   * @param error - Error message if execution failed
   * @param startTime - When execution started
   * @param endTime - When execution finished
   * @param executionId - Optional execution ID for tracking
   */
  emitToolEnd(
    toolName: string,
    result?: unknown,
    error?: string,
    startTime?: number,
    endTime: number = Date.now(),
    executionId?: string,
  ): void {
    const actualStartTime = startTime || endTime - 1000; // Fallback if no start time
    const duration = endTime - actualStartTime;
    const success = !error;

    // Find execution context or create fallback
    let context: ToolExecutionContext | undefined;
    if (executionId) {
      context = this.activeToolExecutions.get(executionId);
    } else {
      // Find by tool name (fallback for executions without ID tracking)
      context = Array.from(this.activeToolExecutions.values()).find(
        (ctx) => ctx.tool === toolName && !ctx.endTime,
      );
    }

    const finalExecutionId =
      executionId ||
      context?.executionId ||
      `${toolName}-${actualStartTime}-fallback-${Math.random().toString(36).substr(2, 9)}`;

    // Update execution context
    if (context) {
      context.endTime = endTime;
      context.result = result;
      context.error = error;
      this.activeToolExecutions.delete(context.executionId);
    }

    // Create execution summary
    const summary: ToolExecutionSummary = {
      tool: toolName,
      startTime: actualStartTime,
      endTime,
      duration,
      success,
      result,
      error,
      executionId: finalExecutionId,
      metadata: {
        toolCategory: "custom", // Default, can be overridden
      },
    };

    // Store in history
    this.toolExecutionHistory.push(summary);

    // Emit event (NeuroLinkEvents format for compatibility)
    this.emitter.emit("tool:end", {
      tool: toolName,
      result,
      error,
      timestamp: endTime,
      duration,
      executionId: finalExecutionId,
    });

    logger.debug(`tool:end emitted for ${toolName}`, {
      toolName,
      executionId: finalExecutionId,
      duration,
      success,
      hasResult: result !== undefined,
      hasError: !!error,
    });
  }

  /**
   * Get current tool execution contexts for stream metadata
   */
  getCurrentToolExecutions(): ToolExecutionContext[] {
    return [...this.currentStreamToolExecutions];
  }

  /**
   * Get tool execution history
   */
  getToolExecutionHistory(): ToolExecutionSummary[] {
    return [...this.toolExecutionHistory];
  }

  /**
   * Clear current stream tool executions (called at stream start)
   */
  clearCurrentStreamExecutions(): void {
    this.currentStreamToolExecutions = [];
  }

  // TODO: Add getToolExecutionEvents() method in future version
  // Will return properly formatted ToolExecutionEvent objects for structured event processing

  // ========================================
  // Tool Registration API
  // ========================================

  /**
   * Register a custom tool that will be available to all AI providers
   * @param name - Unique name for the tool
   * @param tool - Tool in MCPExecutableTool format (unified MCP protocol type)
   */
  registerTool(name: string, tool: MCPExecutableTool): void {
    this.invalidateToolCache(); // Invalidate cache when a tool is registered
    // Emit tool registration start event
    this.emitter.emit("tools-register:start", {
      toolName: name,
      timestamp: Date.now(),
    });

    try {
      if (!name || typeof name !== "string") {
        throw new Error("Invalid tool name");
      }
      if (!tool || typeof tool !== "object") {
        throw new Error(`Invalid tool object provided for tool: ${name}`);
      }
      if (typeof tool.execute !== "function") {
        throw new Error(`Tool '${name}' must have an execute method.`);
      }

      if (name.trim() === "") {
        throw new Error("Tool name cannot be empty");
      }
      if (name.length > 100) {
        throw new Error("Tool name is too long (maximum 100 characters)");
      }
      // eslint-disable-next-line no-control-regex
      if (/[\x00-\x1F\x7F]/.test(name)) {
        throw new Error("Tool name contains invalid control characters");
      }

      // Proceed with tool registration since validation passed

      // Convert tool to proper MCPExecutableTool format with schema conversion
      const convertedTool: MCPExecutableTool = {
        name: tool.name || name,
        description: tool.description || name,
        execute: tool.execute,
        inputSchema: (() => {
          // Check if tool has 'parameters' field (SDK SimpleTool format)
          if ("parameters" in tool && tool.parameters) {
            if (isZodSchema(tool.parameters)) {
              return tool.parameters as object;
            }
            // If it's already a JSON Schema object, return as-is
            if (typeof tool.parameters === "object") {
              return tool.parameters as object;
            }
          }
          // Fall back to existing inputSchema or empty object
          const fallbackSchema = tool.inputSchema || {};
          return fallbackSchema;
        })(),
      };

      // SMART DEFAULTS: Use utility to eliminate boilerplate creation
      const mcpServerInfo = createCustomToolServerInfo(name, convertedTool);

      // Register with toolRegistry using MCPServerInfo directly
      this.toolRegistry.registerServer(mcpServerInfo);

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
   * Set the context that will be passed to tools during execution
   * This context will be merged with any runtime context passed by the AI model
   * @param context - Context object containing session info, tokens, shop data, etc.
   */
  setToolContext(context: Record<string, unknown>): void {
    this.toolExecutionContext = { ...context };

    logger.debug("Tool execution context updated", {
      sessionId: context.sessionId,
      contextKeys: Object.keys(context),
      hasJuspayToken: !!context.juspayToken,
      hasShopId: !!context.shopId,
    });
  }

  /**
   * Get the current tool execution context
   * @returns Current context or undefined if not set
   */
  getToolContext(): Record<string, unknown> | undefined {
    return this.toolExecutionContext
      ? { ...this.toolExecutionContext }
      : undefined;
  }

  /**
   * Clear the tool execution context
   */
  clearToolContext(): void {
    this.toolExecutionContext = undefined;
    logger.debug("Tool execution context cleared");
  }

  /**
   * Register multiple tools at once - Supports both object and array formats
   * @param tools - Object mapping tool names to MCPExecutableTool format OR Array of tools with names
   *
   * Object format (existing): { toolName: MCPExecutableTool, ... }
   * Array format (Lighthouse compatible): [{ name: string, tool: MCPExecutableTool }, ...]
   */
  registerTools(
    tools:
      | Record<string, MCPExecutableTool>
      | Array<{ name: string; tool: MCPExecutableTool }>,
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
    this.invalidateToolCache(); // Invalidate cache when a tool is unregistered
    const serverId = `custom-tool-${name}`;
    const removed = this.toolRegistry.unregisterServer(serverId);
    if (removed) {
      logger.info(`Unregistered custom tool: ${name}`);
    }
    return removed;
  }

  /**
   * Get all registered custom tools
   * @returns Map of tool names to MCPExecutableTool format
   */
  getCustomTools(): Map<string, MCPExecutableTool> {
    // Get tools from toolRegistry with smart category detection
    const customTools = this.toolRegistry.getToolsByCategory(
      detectCategory({ isCustomTool: true }),
    );
    const toolMap = new Map<string, MCPExecutableTool>();

    for (const tool of customTools) {
      const effectiveSchema = tool.inputSchema || tool.parameters;
      logger.debug(`Processing tool schema for Claude`, {
        toolName: tool.name,
        hasDescription: !!tool.description,
        description: tool.description,
        hasParameters: !!tool.parameters,
        parametersType: typeof tool.parameters,
        parametersKeys:
          tool.parameters && typeof tool.parameters === "object"
            ? Object.keys(tool.parameters)
            : "NOT_OBJECT",
        hasInputSchema: !!tool.inputSchema,
        inputSchemaType: typeof tool.inputSchema,
        inputSchemaKeys:
          tool.inputSchema && typeof tool.inputSchema === "object"
            ? Object.keys(tool.inputSchema)
            : "NOT_OBJECT",
        hasEffectiveSchema: !!effectiveSchema,
        effectiveSchemaType: typeof effectiveSchema,
        effectiveSchemaHasProperties: !!(
          effectiveSchema as Record<string, unknown>
        )?.properties,
        effectiveSchemaHasRequired: !!(
          effectiveSchema as Record<string, unknown>
        )?.required,
        originalInputSchema: tool.inputSchema,
        phase: "AFTER_SCHEMA_FIX",
        timestamp: Date.now(),
      });

      // Return MCPServerInfo.tools format directly - no conversion needed
      toolMap.set(tool.name, {
        name: tool.name,
        description: tool.description || "",
        inputSchema: tool.inputSchema || tool.parameters || {},
        execute: async (params: unknown, context?: unknown) => {
          // CONTEXT MERGING: Combine all available contexts for maximum information
          const storedContext = this.toolExecutionContext || {};
          const runtimeContext =
            context && isNonNullObject(context)
              ? (context as Record<string, unknown>)
              : {};

          // Merge contexts with runtime context taking precedence
          // This ensures we have the richest possible context for tool execution
          const executionContext = {
            ...storedContext, // Base context from setToolContext (session, tokens, etc.)
            ...runtimeContext, // Runtime context from AI model (if any)
            // Ensure we always have at least a sessionId for tracing
            sessionId:
              runtimeContext.sessionId ||
              storedContext.sessionId ||
              `fallback-${Date.now()}`,
          };

          // Enhanced logging for context debugging
          logger.debug("Tool execution context merged", {
            toolName: tool.name,
            storedContextKeys: Object.keys(storedContext),
            runtimeContextKeys: Object.keys(runtimeContext),
            finalContextKeys: Object.keys(executionContext),
            hasJuspayToken: !!(executionContext as Record<string, unknown>)
              .juspayToken,
            hasShopId: !!(executionContext as Record<string, unknown>).shopId,
            sessionId: executionContext.sessionId,
          });

          return await this.toolRegistry.executeTool(
            tool.name,
            params,
            executionContext as Record<string, unknown>,
          );
        },
      });
    }

    return toolMap;
  }

  /**
   * Add an in-memory MCP server (from git diff)
   * Allows registration of pre-instantiated server objects
   * @param serverId - Unique identifier for the server
   * @param serverInfo - Server configuration
   */
  async addInMemoryMCPServer(
    serverId: string,
    serverInfo: MCPServerInfo,
  ): Promise<void> {
    this.invalidateToolCache(); // Invalidate cache when a server is added
    try {
      mcpLogger.debug(
        `[NeuroLink] Registering in-memory MCP server: ${serverId}`,
      );

      // Initialize tools array if not provided
      if (!serverInfo.tools) {
        serverInfo.tools = [];
      }

      // ZERO CONVERSIONS: Pass MCPServerInfo directly to toolRegistry
      await this.toolRegistry.registerServer(serverInfo);

      mcpLogger.info(
        `[NeuroLink] Successfully registered in-memory server: ${serverId}`,
        {
          category: serverInfo.metadata?.category,
          provider: serverInfo.metadata?.provider,
          version: serverInfo.metadata?.version,
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
   * @returns Map of server IDs to MCPServerInfo
   */
  getInMemoryServers(): Map<string, MCPServerInfo> {
    // Get in-memory servers from toolRegistry
    const serverInfos = this.toolRegistry.getBuiltInServerInfos();
    const serverMap = new Map<string, MCPServerInfo>();

    for (const serverInfo of serverInfos) {
      if (
        detectCategory({
          existingCategory: serverInfo.metadata?.category,
          serverId: serverInfo.id,
        }) === "in-memory"
      ) {
        serverMap.set(serverInfo.id, serverInfo);
      }
    }

    return serverMap;
  }

  /**
   * Get in-memory servers as MCPServerInfo - ZERO conversion needed
   * Now fetches from centralized tool registry instead of local duplication
   * @returns Array of MCPServerInfo
   */
  getInMemoryServerInfos(): MCPServerInfo[] {
    // Get in-memory servers from centralized tool registry
    const allServers = this.toolRegistry.getBuiltInServerInfos();
    return allServers.filter(
      (server) =>
        detectCategory({
          existingCategory: server.metadata?.category,
          serverId: server.id,
        }) === "in-memory",
    );
  }

  /**
   * Get auto-discovered servers as MCPServerInfo - ZERO conversion needed
   * @returns Array of MCPServerInfo
   */
  getAutoDiscoveredServerInfos(): MCPServerInfo[] {
    return this.autoDiscoveredServerInfos;
  }

  /**
   * Execute a specific tool by name with robust error handling
   * Supports both custom tools and MCP server tools with timeout, retry, and circuit breaker patterns
   * @param toolName - Name of the tool to execute
   * @param params - Parameters to pass to the tool
   * @param options - Execution options including optional authentication context
   * @returns Tool execution result
   */
  async executeTool<T = unknown>(
    toolName: string,
    params: unknown = {},
    options?: {
      timeout?: number;
      maxRetries?: number;
      retryDelayMs?: number;
      authContext?: {
        userId?: string;
        sessionId?: string;
        user?: Record<string, unknown>;
        [key: string]: unknown;
      };
    },
  ): Promise<T> {
    const functionTag = "NeuroLink.executeTool";
    const executionStartTime = Date.now();

    // Debug: Log tool execution attempt
    logger.debug(`[${functionTag}] Tool execution requested:`, {
      toolName,
      params: isNonNullObject(params)
        ? transformParamsForLogging(params)
        : params,
      hasExternalManager: !!this.externalServerManager,
    });

    // 🔧 PARAMETER TRACE: Log tool execution details for debugging
    logger.debug(`Tool execution detailed analysis`, {
      toolName,
      executionStartTime,
      paramsAnalysis: {
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
      isTargetTool: toolName === "juspay-analytics_SuccessRateSRByTime",
      options,
      hasExternalManager: !!this.externalServerManager,
    });

    // Emit tool start event (NeuroLink format - keep existing)
    this.emitter.emit("tool:start", {
      toolName,
      timestamp: executionStartTime,
      input: params, // Enhanced: add input parameters
    });

    // ADD: Bedrock-compatible tool:start event (positional parameters)
    this.emitter.emit("tool:start", toolName, params);

    // Set default options
    const finalOptions = {
      timeout: options?.timeout || TOOL_TIMEOUTS.EXECUTION_DEFAULT_MS, // 30 second default timeout
      maxRetries: options?.maxRetries || RETRY_ATTEMPTS.DEFAULT, // Default 2 retries for retriable errors
      retryDelayMs: options?.retryDelayMs || RETRY_DELAYS.BASE_MS, // 1 second delay between retries
      authContext: options?.authContext, // Pass through authentication context
    };

    // Track memory usage for tool execution
    const { MemoryManager } = await import("./utils/performance.js");
    const startMemory = MemoryManager.getMemoryUsageMB();

    // Get or create circuit breaker for this tool
    if (!this.toolCircuitBreakers.has(toolName)) {
      this.toolCircuitBreakers.set(
        toolName,
        new CircuitBreaker(
          CIRCUIT_BREAKER.FAILURE_THRESHOLD,
          CIRCUIT_BREAKER_RESET_MS,
        ),
      );
    }
    const circuitBreaker = this.toolCircuitBreakers.get(toolName);

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
    const metrics = this.toolExecutionMetrics.get(toolName);
    if (metrics) {
      metrics.totalExecutions++;
    }

    try {
      mcpLogger.debug(`[${functionTag}] Executing tool: ${toolName}`, {
        toolName,
        params,
        options: finalOptions,
        circuitBreakerState: circuitBreaker?.getState(),
      });

      // Execute with circuit breaker, timeout, and retry logic
      if (!circuitBreaker) {
        throw new Error(
          `Circuit breaker not initialized for tool: ${toolName}`,
        );
      }
      const result: T = await circuitBreaker.execute(async () => {
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
      if (metrics) {
        metrics.successfulExecutions++;
        metrics.lastExecutionTime = executionTime;
        metrics.averageExecutionTime =
          (metrics.averageExecutionTime * (metrics.successfulExecutions - 1) +
            executionTime) /
          metrics.successfulExecutions;
      }

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
        circuitBreakerState: circuitBreaker?.getState(),
      });

      // Emit tool end event using the helper method
      this.emitToolEndEvent(toolName, executionStartTime, true, result);

      return result;
    } catch (error) {
      // Update failure metrics
      if (metrics) {
        metrics.failedExecutions++;
      }
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
          const availableTools = await this.getAllAvailableTools();
          structuredError = ErrorFactory.toolNotFound(
            toolName,
            extractToolNames(availableTools.map((t) => ({ name: t.name }))),
          );
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

      // ADD: Centralized error event emission
      this.emitter.emit("error", structuredError);

      // Emit tool end event using the helper method
      this.emitToolEndEvent(
        toolName,
        executionStartTime,
        false,
        undefined,
        structuredError,
      );

      // Add execution context to structured error
      structuredError = new NeuroLinkError({
        ...structuredError,
        context: {
          ...structuredError.context,
          executionTime,
          params,
          options: finalOptions,
          circuitBreakerState: circuitBreaker?.getState(),
          circuitBreakerFailures: circuitBreaker?.getFailureCount(),
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
    options: {
      timeout: number;
      maxRetries: number;
      retryDelayMs: number;
      authContext?: {
        userId?: string;
        sessionId?: string;
        user?: Record<string, unknown>;
        [key: string]: unknown;
      };
    },
  ): Promise<T> {
    const functionTag = "NeuroLink.executeToolInternal";

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
          params as JsonObject,
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

    try {
      const storedContext = this.toolExecutionContext || {};
      const passedAuthContext = options.authContext || {};

      const context = {
        ...storedContext,
        ...passedAuthContext,
      };

      logger.debug(`[Using merged context for unified registry tool:`, {
        toolName,
        storedContextKeys: Object.keys(storedContext),
        finalContextKeys: Object.keys(context),
      });

      const result = (await this.toolRegistry.executeTool(
        toolName,
        params,
        context,
      )) as T;

      // ADD: Check if result indicates a failure and emit error event
      if (
        result &&
        typeof result === "object" &&
        "success" in result &&
        result.success === false
      ) {
        const errorMessage =
          (result as { error?: string }).error || "Tool execution failed";
        const errorToEmit = new Error(errorMessage);
        this.emitter.emit("error", errorToEmit);
      }

      return result;
    } catch (error) {
      const errorToEmit =
        error instanceof Error ? error : new Error(String(error));
      this.emitter.emit("error", errorToEmit);

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
  private invalidateToolCache(): void {
    this.toolCache = null;
    logger.debug("Tool cache invalidated");
  }

  async getAllAvailableTools(): Promise<ToolInfo[]> {
    // Return from cache if available and not stale
    if (
      this.toolCache &&
      Date.now() - this.toolCache.timestamp < this.toolCacheDuration
    ) {
      logger.debug("Returning available tools from cache");
      return this.toolCache.tools;
    }

    // 🚀 EXHAUSTIVE LOGGING POINT A001: GET ALL AVAILABLE TOOLS ENTRY
    const getAllToolsId = `get-all-tools-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const getAllToolsStartTime = Date.now();
    const getAllToolsHrTimeStart = process.hrtime.bigint();

    logger.debug(`[NeuroLink] 🛠️ LOG_POINT_A001_GET_ALL_TOOLS_START`, {
      logPoint: "A001_GET_ALL_TOOLS_START",
      getAllToolsId,
      timestamp: new Date().toISOString(),
      getAllToolsStartTime,
      getAllToolsHrTimeStart: getAllToolsHrTimeStart.toString(),

      // 🔧 Tool registry state
      toolRegistryState: {
        hasToolRegistry: !!this.toolRegistry,
        toolRegistrySize: 0, // Not accessible as size property
        toolRegistryType: this.toolRegistry?.constructor?.name || "NOT_SET",
        hasExternalServerManager: !!this.externalServerManager,
        externalServerManagerType:
          this.externalServerManager?.constructor?.name || "NOT_SET",
      },

      // 🌐 MCP state
      mcpState: {
        mcpInitialized: this.mcpInitialized,
        hasProviderRegistry: !!AIProviderFactory,
        providerRegistrySize: 0, // Not accessible as size property
      },

      message: "Starting comprehensive tool discovery across all sources",
    });

    // Track memory usage for tool listing operations
    const { MemoryManager } = await import("./utils/performance.js");
    const startMemory = MemoryManager.getMemoryUsageMB();

    try {
      // Optimized: Collect all tools with minimal object creation
      const allTools = new Map<string, ToolInfo>();

      // 1. Add MCP server tools (built-in direct tools)
      const mcpToolsRaw = await this.toolRegistry.listTools();
      for (const tool of mcpToolsRaw) {
        if (!allTools.has(tool.name)) {
          const optimizedTool = optimizeToolForCollection(tool, {
            serverId:
              tool.serverId === "direct" ? "neurolink-direct" : tool.serverId,
          });
          allTools.set(tool.name, optimizedTool);
        }
      }

      // 2. Add custom tools from this NeuroLink instance
      const customToolsRaw = this.toolRegistry.getToolsByCategory(
        detectCategory({ isCustomTool: true }),
      );
      for (const tool of customToolsRaw) {
        if (!allTools.has(tool.name)) {
          const optimizedTool = optimizeToolForCollection(tool, {
            description: "Custom tool",
            serverId: `custom-tool-${tool.name}`,
            category: detectCategory({
              isCustomTool: true,
              serverId: tool.serverId,
            }),
            inputSchema: {},
          });
          allTools.set(tool.name, optimizedTool);
        }
      }

      // 3. Add tools from in-memory MCP servers
      const inMemoryToolsRaw =
        this.toolRegistry.getToolsByCategory("in-memory");
      for (const tool of inMemoryToolsRaw) {
        if (!allTools.has(tool.name)) {
          const optimizedTool = optimizeToolForCollection(tool, {
            description: "In-memory MCP tool",
            serverId: "unknown",
            category: "in-memory" as MCPServerCategory,
            inputSchema: {},
          });
          allTools.set(tool.name, optimizedTool);
        }
      }

      // 4. Add external MCP tools
      const externalMCPToolsRaw = this.externalServerManager.getAllTools();
      for (const tool of externalMCPToolsRaw) {
        if (!allTools.has(tool.name)) {
          const optimizedTool = optimizeToolForCollection(
            tool as unknown as ToolInfo,
            {
              category: detectCategory({
                existingCategory:
                  typeof tool.metadata?.category === "string"
                    ? tool.metadata.category
                    : undefined,
                isExternal: true,
                serverId: tool.serverId,
              }),
              inputSchema: {},
            },
          );
          allTools.set(tool.name, optimizedTool);
        }
      }

      const uniqueTools = Array.from(allTools.values());

      mcpLogger.debug("Tool discovery results", {
        mcpTools: mcpToolsRaw.length,
        customTools: customToolsRaw.length,
        inMemoryTools: inMemoryToolsRaw.length,
        externalMCPTools: externalMCPToolsRaw.length,
        total: uniqueTools.length,
      });

      // Check memory usage after tool enumeration
      const endMemory = MemoryManager.getMemoryUsageMB();
      const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

      if (memoryDelta > MEMORY_THRESHOLDS.LOW_USAGE_MB) {
        mcpLogger.debug(
          `🔍 Tool listing used ${memoryDelta}MB memory (large tool registry detected)`,
        );
        // Optimized collection patterns should reduce memory usage significantly
        if (uniqueTools.length > PERFORMANCE_THRESHOLDS.LARGE_TOOL_COLLECTION) {
          mcpLogger.debug(
            "💡 Tool collection optimized for large sets. Memory usage reduced through efficient object reuse.",
          );
        }
      }

      // Return canonical ToolInfo[]; defer presentation transforms to call sites
      const tools: ToolInfo[] = uniqueTools;

      // Update the cache
      this.toolCache = {
        tools,
        timestamp: Date.now(),
      };

      return tools;
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

    // Keep references to prevent unused variable warnings
    void AIProviderFactory;
    void hasProviderEnvVars;

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
                signal: AbortSignal.timeout(PROVIDER_TIMEOUTS.AUTH_MS),
              });

              if (!response.ok) {
                throw new Error("Ollama service not responding");
              }

              const responseData = await response.json();
              const models = responseData?.models;
              const defaultOllamaModel = "llama3.2:latest";

              // Runtime-safe guard: ensure models is an array with valid objects
              if (!Array.isArray(models)) {
                logger.warn(
                  "Ollama API returned invalid models format in testProvider",
                  {
                    responseData,
                    modelsType: typeof models,
                  },
                );
                throw new Error("Invalid models format from Ollama API");
              }

              // Filter and validate models before comparison
              const validModels = models.filter(
                (m): m is { name: string } =>
                  m && typeof m === "object" && typeof m.name === "string",
              );

              const modelIsAvailable = validModels.some(
                (m) => m.name === defaultOllamaModel,
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
      // Initialize MCP if not already initialized (loads external servers from config)
      await this.initializeMCP();

      // Get built-in tools
      const allTools = await this.toolRegistry.listTools();

      // Get external MCP server statistics
      const externalStats = this.externalServerManager.getStatistics();

      // DIRECT RETURNS - ZERO conversion
      const externalMCPServers = this.externalServerManager.listServers();
      const inMemoryServerInfos = this.getInMemoryServerInfos();
      const builtInServerInfos = this.toolRegistry.getBuiltInServerInfos();
      const autoDiscoveredServerInfos = this.getAutoDiscoveredServerInfos();

      // Calculate totals
      const totalServers =
        externalMCPServers.length +
        inMemoryServerInfos.length +
        builtInServerInfos.length +
        autoDiscoveredServerInfos.length;
      const availableServers =
        externalStats.connectedServers +
        inMemoryServerInfos.length +
        builtInServerInfos.length; // in-memory and built-in always available
      const totalTools = allTools.length + externalStats.totalTools;

      return {
        mcpInitialized: this.mcpInitialized,
        totalServers,
        availableServers,
        autoDiscoveredCount: autoDiscoveredServerInfos.length,
        totalTools,
        autoDiscoveredServers: autoDiscoveredServerInfos,
        customToolsCount: this.toolRegistry.getToolsByCategory(
          detectCategory({ isCustomTool: true }),
        ).length,
        inMemoryServersCount: inMemoryServerInfos.length,
        externalMCPServersCount: externalMCPServers.length,
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
        customToolsCount: this.toolRegistry.getToolsByCategory(
          detectCategory({ isCustomTool: true }),
        ).length,
        inMemoryServersCount: 0,
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
    // DIRECT RETURNS - ZERO conversion logic
    return [
      ...this.externalServerManager.listServers(), // Direct return
      ...this.getInMemoryServerInfos(), // Direct return
      ...this.toolRegistry.getBuiltInServerInfos(), // Direct return
      ...this.getAutoDiscoveredServerInfos(), // Direct return
    ];
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
        const tools = await this.toolRegistry.listTools();
        return tools.length > 0;
      }

      // Test in-memory servers
      const inMemoryServers = this.getInMemoryServers();
      if (inMemoryServers.has(serverId)) {
        const serverInfo = inMemoryServers.get(serverId);
        return !!(serverInfo?.tools && serverInfo.tools.length > 0);
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
      this.toolCircuitBreakers.set(
        toolName,
        new CircuitBreaker(
          CIRCUIT_BREAKER.FAILURE_THRESHOLD,
          CIRCUIT_BREAKER_RESET_MS,
        ),
      );
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
  async getToolHealthReport(): Promise<{
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
  }> {
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

    // Get all tool names from toolRegistry
    const allTools = await this.toolRegistry.listTools();
    const allToolNames = new Set(allTools.map((tool) => tool.name));

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
   * Initialize conversation memory if enabled (public method for explicit initialization)
   * This is useful for testing or when you want to ensure conversation memory is ready
   * @returns Promise resolving to true if initialization was successful, false otherwise
   */
  async ensureConversationMemoryInitialized(): Promise<boolean> {
    try {
      const initId = `manual-init-${Date.now()}`;
      await this.initializeConversationMemoryForGeneration(
        initId,
        Date.now(),
        process.hrtime.bigint(),
      );
      return !!this.conversationMemory;
    } catch (error) {
      logger.error("Failed to initialize conversation memory", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Get conversation memory statistics (public API)
   */
  async getConversationStats() {
    // First ensure memory is initialized
    const initId = `stats-init-${Date.now()}`;
    await this.initializeConversationMemoryForGeneration(
      initId,
      Date.now(),
      process.hrtime.bigint(),
    );

    if (!this.conversationMemory) {
      throw new Error("Conversation memory is not enabled");
    }

    return await this.conversationMemory.getStats();
  }

  /**
   * Get complete conversation history for a specific session (public API)
   * @param sessionId - The session ID to retrieve history for
   * @returns Array of ChatMessage objects in chronological order, or empty array if session doesn't exist
   */
  async getConversationHistory(sessionId: string): Promise<ChatMessage[]> {
    // First ensure memory is initialized
    const initId = `history-init-${Date.now()}`;
    await this.initializeConversationMemoryForGeneration(
      initId,
      Date.now(),
      process.hrtime.bigint(),
    );

    if (!this.conversationMemory) {
      throw new Error("Conversation memory is not enabled");
    }

    if (!sessionId || typeof sessionId !== "string") {
      throw new Error("Session ID must be a non-empty string");
    }

    try {
      // Use the existing buildContextMessages method to get the complete history
      const messages =
        await this.conversationMemory.buildContextMessages(sessionId);

      logger.debug("Retrieved conversation history", {
        sessionId,
        messageCount: messages.length,
        turnCount: messages.length / 2, // Each turn = user + assistant message
      });

      return messages;
    } catch (error) {
      logger.error("Failed to retrieve conversation history", {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Return empty array for graceful handling of missing sessions
      return [];
    }
  }

  /**
   * Clear conversation history for a specific session (public API)
   */
  async clearConversationSession(sessionId: string): Promise<boolean> {
    // First ensure memory is initialized
    const initId = `clear-session-init-${Date.now()}`;
    await this.initializeConversationMemoryForGeneration(
      initId,
      Date.now(),
      process.hrtime.bigint(),
    );

    if (!this.conversationMemory) {
      throw new Error("Conversation memory is not enabled");
    }

    return await this.conversationMemory.clearSession(sessionId);
  }

  /**
   * Clear all conversation history (public API)
   */
  async clearAllConversations(): Promise<void> {
    // First ensure memory is initialized
    const initId = `clear-all-init-${Date.now()}`;
    await this.initializeConversationMemoryForGeneration(
      initId,
      Date.now(),
      process.hrtime.bigint(),
    );

    if (!this.conversationMemory) {
      throw new Error("Conversation memory is not enabled");
    }

    await this.conversationMemory.clearAllSessions();
  }
  /**
   * Store tool executions in conversation memory if enabled and Redis is configured
   * @param sessionId - Session identifier
   * @param userId - User identifier (optional)
   * @param toolCalls - Array of tool calls
   * @param toolResults - Array of tool results
   * @param currentTime - Date when the tool execution occurred (optional)
   * @returns Promise resolving when storage is complete
   */
  async storeToolExecutions(
    sessionId: string,
    userId: string | undefined,
    toolCalls: Array<{
      toolCallId?: string;
      toolName?: string;
      args?: Record<string, unknown>;
      [key: string]: unknown;
    }>,
    toolResults: Array<{
      toolCallId?: string;
      result?: unknown;
      error?: string;
      [key: string]: unknown;
    }>,
    currentTime?: Date,
  ): Promise<void> {
    // Check if tools are not empty
    const hasToolData =
      (toolCalls && toolCalls.length > 0) ||
      (toolResults && toolResults.length > 0);

    if (!hasToolData) {
      logger.debug("Tool execution storage skipped", {
        hasToolData,
        toolCallsCount: toolCalls?.length || 0,
        toolResultsCount: toolResults?.length || 0,
      });
      return;
    }

    // Type guard to ensure it's Redis conversation memory manager
    const redisMemory = this
      .conversationMemory as RedisConversationMemoryManager;

    try {
      await redisMemory.storeToolExecution(
        sessionId,
        userId,
        toolCalls,
        toolResults,
        currentTime,
      );
    } catch (error) {
      logger.warn("Failed to store tool executions", {
        sessionId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - tool storage failures shouldn't break generation
    }
  }

  /**
   * Check if tool execution storage is available
   * @returns boolean indicating if Redis storage is configured and available
   */
  isToolExecutionStorageAvailable(): boolean {
    const isRedisStorage = process.env.STORAGE_TYPE === "redis";
    const hasRedisConversationMemory =
      this.conversationMemory &&
      this.conversationMemory.constructor.name ===
        "RedisConversationMemoryManager";

    return !!(isRedisStorage && hasRedisConversationMemory);
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
    config: MCPServerInfo,
  ): Promise<ExternalMCPOperationResult<ExternalMCPServerInstance>> {
    this.invalidateToolCache(); // Invalidate cache when an external server is added
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
    this.invalidateToolCache(); // Invalidate cache when an external server is removed
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
    config: MCPServerInfo;
  }> {
    const serverStatuses = this.externalServerManager.getServerStatuses();
    const allServers = this.externalServerManager.listServers();

    return serverStatuses.map((health) => {
      const server = allServers.find((s) => s.id === health.serverId);
      return {
        serverId: health.serverId,
        status: health.status,
        toolCount: health.toolCount,
        uptime: health.performance.uptime,
        isHealthy: health.isHealthy,
        config: server || ({} as MCPServerInfo),
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
    parameters: JsonObject,
    options?: { timeout?: number },
  ): Promise<unknown> {
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
    config: MCPServerInfo,
  ): Promise<BatchOperationResult> {
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
  private convertExternalMCPToolsToAISDKFormat(): Record<string, unknown> {
    const externalTools = this.externalServerManager.getAllTools();
    const aiSDKTools: Record<string, unknown> = {};

    for (const tool of externalTools) {
      if (tool.isAvailable) {
        // Create tool definition without parameters schema to avoid Zod issues
        // The AI provider will handle parameters dynamically based on the tool description
        const toolDefinition = {
          description: tool.description,
          execute: async (params: Record<string, unknown>) => {
            try {
              mcpLogger.debug(
                `[NeuroLink] Executing external MCP tool via AI SDK: ${tool.name}`,
                { params },
              );
              const result = await this.externalServerManager.executeTool(
                tool.serverId,
                tool.name,
                params as JsonObject,
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
  private convertJSONSchemaToAISDKFormat(_inputSchema: unknown): unknown {
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
        this.toolRegistry.removeTool(tool.name);
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
      this.toolRegistry.removeTool(toolName);
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
   * Lazily initialize conversation memory when needed
   * This is called the first time a generate or stream operation is performed
   */
  private async lazyInitializeConversationMemory(
    generateInternalId: string,
    generateInternalStartTime: number,
    generateInternalHrTimeStart: bigint,
  ): Promise<void> {
    try {
      // Import the integration module
      const { initializeConversationMemory } = await import(
        "./core/conversationMemoryInitializer.js"
      );

      // Use the integration module to create the appropriate memory manager
      const memoryManagerCreateStartTime = process.hrtime.bigint();
      const memoryManager = await initializeConversationMemory(
        this.conversationMemoryConfig,
      );
      // Assign to conversationMemory with proper type to handle both memory manager types
      this.conversationMemory = memoryManager;

      const memoryManagerCreateEndTime = process.hrtime.bigint();
      const memoryManagerCreateDurationNs =
        memoryManagerCreateEndTime - memoryManagerCreateStartTime;

      logger.info(`[NeuroLink] ✅ LOG_POINT_G004_MEMORY_LAZY_INIT_SUCCESS`, {
        logPoint: "G004_MEMORY_LAZY_INIT_SUCCESS",
        generateInternalId,
        timestamp: new Date().toISOString(),
        elapsedMs: Date.now() - generateInternalStartTime,
        elapsedNs: (
          process.hrtime.bigint() - generateInternalHrTimeStart
        ).toString(),
        memoryManagerCreateDurationNs: memoryManagerCreateDurationNs.toString(),
        memoryManagerCreateDurationMs:
          Number(memoryManagerCreateDurationNs) / 1000000,
        storageType: process.env.STORAGE_TYPE || "memory",
        message:
          "Lazy conversation memory initialization completed successfully",
      });

      // Reset the lazy init flag since we've now initialized
      this.conversationMemoryNeedsInit = false;
    } catch (error) {
      logger.error(`[NeuroLink] ❌ LOG_POINT_G005_MEMORY_LAZY_INIT_ERROR`, {
        logPoint: "G005_MEMORY_LAZY_INIT_ERROR",
        generateInternalId,
        timestamp: new Date().toISOString(),
        elapsedMs: Date.now() - generateInternalStartTime,
        elapsedNs: (
          process.hrtime.bigint() - generateInternalHrTimeStart
        ).toString(),
        error: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorStack: error instanceof Error ? error.stack : undefined,
        message: "Lazy conversation memory initialization failed",
      });
      throw error;
    }
  }

  /**
   * Unregister all external MCP tools from the main registry
   */
  private unregisterAllExternalMCPToolsFromRegistry(): void {
    try {
      const externalTools = this.externalServerManager.getAllTools();

      for (const tool of externalTools) {
        this.toolRegistry.removeTool(tool.name);
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

  /**
   * Dispose of all resources and cleanup connections
   * Call this method when done using the NeuroLink instance to prevent resource leaks
   * Especially important in test environments where multiple instances are created
   */
  async dispose(): Promise<void> {
    logger.debug("[NeuroLink] Starting disposal of resources...");

    const cleanupErrors: Error[] = [];

    try {
      // 1. Flush and shutdown OpenTelemetry
      try {
        logger.debug("[NeuroLink] Flushing and shutting down OpenTelemetry...");
        await flushOpenTelemetry();
        await shutdownOpenTelemetry();
        logger.debug("[NeuroLink] OpenTelemetry shutdown successfully");
      } catch (error) {
        const err =
          error instanceof Error
            ? error
            : new Error(`OpenTelemetry shutdown error: ${String(error)}`);
        cleanupErrors.push(err);
        logger.warn("[NeuroLink] Error shutting down OpenTelemetry:", error);
      }

      // 2. Shutdown external MCP server connections
      if (this.externalServerManager) {
        try {
          logger.debug("[NeuroLink] Shutting down external MCP servers...");
          await this.externalServerManager.shutdown();
          logger.debug(
            "[NeuroLink] External MCP servers shutdown successfully",
          );
        } catch (error) {
          const err =
            error instanceof Error
              ? error
              : new Error(`External server shutdown error: ${String(error)}`);
          cleanupErrors.push(err);
          logger.warn(
            "[NeuroLink] Error shutting down external MCP servers:",
            error,
          );
        }
      }

      // 3. Clear all event listeners to prevent memory leaks
      if (this.emitter) {
        try {
          logger.debug("[NeuroLink] Removing all event listeners...");
          this.emitter.removeAllListeners();
          logger.clearEventEmitter();
          logger.debug("[NeuroLink] Event listeners removed successfully");
        } catch (error) {
          const err =
            error instanceof Error
              ? error
              : new Error(`Event emitter cleanup error: ${String(error)}`);
          cleanupErrors.push(err);
          logger.warn("[NeuroLink] Error removing event listeners:", error);
        }
      }

      // 4. Clear all circuit breakers
      if (this.toolCircuitBreakers && this.toolCircuitBreakers.size > 0) {
        try {
          logger.debug(
            `[NeuroLink] Clearing ${this.toolCircuitBreakers.size} circuit breakers...`,
          );
          this.toolCircuitBreakers.clear();
          logger.debug("[NeuroLink] Circuit breakers cleared successfully");
        } catch (error) {
          const err =
            error instanceof Error
              ? error
              : new Error(`Circuit breaker cleanup error: ${String(error)}`);
          cleanupErrors.push(err);
          logger.warn("[NeuroLink] Error clearing circuit breakers:", error);
        }
      }

      // 5. Clear all Maps and caches
      try {
        logger.debug("[NeuroLink] Clearing maps and caches...");

        if (this.toolExecutionMetrics) {
          this.toolExecutionMetrics.clear();
        }

        if (this.activeToolExecutions) {
          this.activeToolExecutions.clear();
        }

        if (this.currentStreamToolExecutions) {
          this.currentStreamToolExecutions.length = 0;
        }

        if (this.toolExecutionHistory) {
          this.toolExecutionHistory.length = 0;
        }

        // Clear tool cache
        if (this.toolCache) {
          this.toolCache.tools = [];
          this.toolCache.timestamp = 0;
        }

        logger.debug("[NeuroLink] Maps and caches cleared successfully");
      } catch (error) {
        const err =
          error instanceof Error
            ? error
            : new Error(`Cache cleanup error: ${String(error)}`);
        cleanupErrors.push(err);
        logger.warn("[NeuroLink] Error clearing caches:", error);
      }

      // 6. Reset initialization flags
      try {
        logger.debug("[NeuroLink] Resetting initialization state...");
        this.mcpInitialized = false;
        this.conversationMemoryNeedsInit = false;
        logger.debug("[NeuroLink] Initialization state reset successfully");
      } catch (error) {
        const err =
          error instanceof Error
            ? error
            : new Error(`State reset error: ${String(error)}`);
        cleanupErrors.push(err);
        logger.warn("[NeuroLink] Error resetting state:", error);
      }

      // 6. Log completion
      if (cleanupErrors.length === 0) {
        logger.debug("[NeuroLink] ✅ Resource disposal completed successfully");
      } else {
        logger.warn(
          `[NeuroLink] ⚠️ Resource disposal completed with ${cleanupErrors.length} errors`,
          {
            errors: cleanupErrors.map((e) => e.message),
          },
        );
      }
    } catch (error) {
      logger.error("[NeuroLink] Critical error during disposal:", error);
      throw error;
    }
  }
}

// Create default instance
export const neurolink = new NeuroLink();
export default neurolink;
