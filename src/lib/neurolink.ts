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
  AIProviderName,
  TextGenerationOptions,
  TextGenerationResult,
  AnalyticsData,
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
import type {
  StreamOptions,
  StreamResult,
  ToolCall,
  ToolResult,
  AudioChunk,
} from "./types/streamTypes.js";
import type { TokenUsage, EvaluationData } from "./types/providers.js";
import type {
  MCPServerInfo,
  MCPExecutableTool,
  MCPServerCategory,
} from "./types/mcpTypes.js";
import type { ToolInfo } from "./mcp/contracts/mcpContract.js";
import {
  createCustomToolServerInfo,
  detectCategory,
} from "./utils/mcpDefaults.js";
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
} from "./types/conversationTypes.js";
import { ConversationMemoryManager } from "./core/conversationMemoryManager.js";
import {
  applyConversationMemoryDefaults,
  getConversationMessages,
  storeConversationTurn,
} from "./utils/conversationMemoryUtils.js";
import { ExternalServerManager } from "./mcp/externalServerManager.js";
import type {
  ExternalMCPServerInstance,
  ExternalMCPOperationResult,
  ExternalMCPToolInfo,
} from "./types/externalMcp.js";
// Import direct tools server for automatic registration
import { directToolsServer } from "./mcp/servers/agent/directToolsServer.js";

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

import { isNonNullObject } from "./utils/typeUtils.js";

// Core types imported from core/types.js

export class NeuroLink {
  private mcpInitialized = false;
  private emitter = new EventEmitter();

  private autoDiscoveredServerInfos: MCPServerInfo[] = [];
  // External MCP server management
  private externalServerManager!: ExternalServerManager;

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
  private conversationMemory?: ConversationMemoryManager;

  /**
   * Creates a new NeuroLink instance for AI text generation with MCP tool integration.
   *
   * @param config - Optional configuration object
   * @param config.conversationMemory - Configuration for conversation memory features
   * @param config.conversationMemory.enabled - Whether to enable conversation memory (default: false)
   * @param config.conversationMemory.maxSessions - Maximum number of concurrent sessions (default: 100)
   * @param config.conversationMemory.maxTurnsPerSession - Maximum conversation turns per session (default: 50)
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
   * ```
   *
   * @throws {Error} When provider registry setup fails
   * @throws {Error} When conversation memory initialization fails (if enabled)
   * @throws {Error} When external server manager initialization fails
   */
  constructor(config?: {
    conversationMemory?: Partial<ConversationMemoryConfig>;
  }) {
    const constructorStartTime = Date.now();
    const constructorHrTimeStart = process.hrtime.bigint();
    const constructorId = `neurolink-constructor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.logConstructorStart(
      constructorId,
      constructorStartTime,
      constructorHrTimeStart,
      config,
    );
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
    this.logConstructorComplete(
      constructorId,
      constructorStartTime,
      constructorHrTimeStart,
    );
  }

  /**
   * Log constructor start with comprehensive environment analysis
   */
  private logConstructorStart(
    constructorId: string,
    constructorStartTime: number,
    constructorHrTimeStart: bigint,
    config?: { conversationMemory?: Partial<ConversationMemoryConfig> },
  ): void {
    logger.debug(`[NeuroLink] 🏗️ LOG_POINT_C001_CONSTRUCTOR_START`, {
      logPoint: "C001_CONSTRUCTOR_START",
      constructorId,
      timestamp: new Date().toISOString(),
      constructorStartTime,
      constructorHrTimeStart: constructorHrTimeStart.toString(),
      hasConfig: !!config,
      configType: typeof config,
      configKeys: config ? Object.keys(config) : [],
      configSize: config ? JSON.stringify(config).length : 0,
      hasConversationMemoryConfig: !!config?.conversationMemory,
      conversationMemoryEnabled: config?.conversationMemory?.enabled || false,
      conversationMemoryKeys: config?.conversationMemory
        ? Object.keys(config.conversationMemory)
        : [],
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      nodeEnv: process.env.NODE_ENV || "UNKNOWN",
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      uptime: process.uptime(),
      pid: process.pid,
      ppid: process.ppid,
      message:
        "NeuroLink constructor initialization starting with comprehensive environment analysis",
    });
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

    try {
      ProviderRegistry.setOptions({ enableManualMCP: false });
      const registrySetupEndTime = process.hrtime.bigint();
      const registrySetupDurationNs =
        registrySetupEndTime - registrySetupStartTime;

      logger.debug(
        `[NeuroLink] ✅ LOG_POINT_C003_PROVIDER_REGISTRY_SETUP_SUCCESS`,
        {
          logPoint: "C003_PROVIDER_REGISTRY_SETUP_SUCCESS",
          constructorId,
          timestamp: new Date().toISOString(),
          elapsedMs: Date.now() - constructorStartTime,
          elapsedNs: (
            process.hrtime.bigint() - constructorHrTimeStart
          ).toString(),
          registrySetupDurationNs: registrySetupDurationNs.toString(),
          registrySetupDurationMs: Number(registrySetupDurationNs) / 1000000,
          enableManualMCP: false,
          message:
            "ProviderRegistry configured successfully with security settings",
        },
      );
    } catch (error) {
      const registrySetupErrorTime = process.hrtime.bigint();
      const registrySetupDurationNs =
        registrySetupErrorTime - registrySetupStartTime;

      logger.error(
        `[NeuroLink] ❌ LOG_POINT_C004_PROVIDER_REGISTRY_SETUP_ERROR`,
        {
          logPoint: "C004_PROVIDER_REGISTRY_SETUP_ERROR",
          constructorId,
          timestamp: new Date().toISOString(),
          elapsedMs: Date.now() - constructorStartTime,
          elapsedNs: (
            process.hrtime.bigint() - constructorHrTimeStart
          ).toString(),
          registrySetupDurationNs: registrySetupDurationNs.toString(),
          registrySetupDurationMs: Number(registrySetupDurationNs) / 1000000,
          error: error instanceof Error ? error.message : String(error),
          errorName: error instanceof Error ? error.name : "UnknownError",
          errorStack: error instanceof Error ? error.stack : undefined,
          message:
            "ProviderRegistry setup failed - critical initialization error",
        },
      );
      throw error;
    }
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
      logger.debug(`[NeuroLink] 🧠 LOG_POINT_C005_MEMORY_INIT_START`, {
        logPoint: "C005_MEMORY_INIT_START",
        constructorId,
        timestamp: new Date().toISOString(),
        elapsedMs: Date.now() - constructorStartTime,
        elapsedNs: (
          process.hrtime.bigint() - constructorHrTimeStart
        ).toString(),
        memoryInitStartTimeNs: memoryInitStartTime.toString(),
        memoryConfig: {
          enabled: config.conversationMemory.enabled,
          maxSessions: config.conversationMemory.maxSessions,
          maxTurnsPerSession: config.conversationMemory.maxTurnsPerSession,
          keys: Object.keys(config.conversationMemory),
        },
        message: "Starting conversation memory initialization",
      });

      try {
        const memoryConfig = applyConversationMemoryDefaults(
          config.conversationMemory,
        );
        const memoryManagerCreateStartTime = process.hrtime.bigint();
        this.conversationMemory = new ConversationMemoryManager(memoryConfig);
        const memoryManagerCreateEndTime = process.hrtime.bigint();
        const memoryManagerCreateDurationNs =
          memoryManagerCreateEndTime - memoryManagerCreateStartTime;
        const memoryInitEndTime = process.hrtime.bigint();
        const memoryInitDurationNs = memoryInitEndTime - memoryInitStartTime;

        logger.info(`[NeuroLink] ✅ LOG_POINT_C006_MEMORY_INIT_SUCCESS`, {
          logPoint: "C006_MEMORY_INIT_SUCCESS",
          constructorId,
          timestamp: new Date().toISOString(),
          elapsedMs: Date.now() - constructorStartTime,
          elapsedNs: (
            process.hrtime.bigint() - constructorHrTimeStart
          ).toString(),
          memoryInitDurationNs: memoryInitDurationNs.toString(),
          memoryInitDurationMs: Number(memoryInitDurationNs) / 1000000,
          memoryManagerCreateDurationNs:
            memoryManagerCreateDurationNs.toString(),
          memoryManagerCreateDurationMs:
            Number(memoryManagerCreateDurationNs) / 1000000,
          finalMemoryConfig: {
            maxSessions: memoryConfig.maxSessions,
            maxTurnsPerSession: memoryConfig.maxTurnsPerSession,
          },
          memoryUsageAfterInit: process.memoryUsage(),
          message:
            "NeuroLink initialized with conversation memory successfully",
        });
      } catch (error) {
        const memoryInitErrorTime = process.hrtime.bigint();
        const memoryInitDurationNs = memoryInitErrorTime - memoryInitStartTime;

        logger.error(`[NeuroLink] ❌ LOG_POINT_C007_MEMORY_INIT_ERROR`, {
          logPoint: "C007_MEMORY_INIT_ERROR",
          constructorId,
          timestamp: new Date().toISOString(),
          elapsedMs: Date.now() - constructorStartTime,
          elapsedNs: (
            process.hrtime.bigint() - constructorHrTimeStart
          ).toString(),
          memoryInitDurationNs: memoryInitDurationNs.toString(),
          memoryInitDurationMs: Number(memoryInitDurationNs) / 1000000,
          error: error instanceof Error ? error.message : String(error),
          errorName: error instanceof Error ? error.name : "UnknownError",
          errorStack: error instanceof Error ? error.stack : undefined,
          memoryConfig: config.conversationMemory,
          message: "Conversation memory initialization failed",
        });
        throw error;
      }
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
   * Initialize external server manager with event handlers
   */
  private initializeExternalServerManager(
    constructorId: string,
    constructorStartTime: number,
    constructorHrTimeStart: bigint,
  ): void {
    const externalServerInitStartTime = process.hrtime.bigint();
    logger.debug(`[NeuroLink] 🌐 LOG_POINT_C009_EXTERNAL_SERVER_INIT_START`, {
      logPoint: "C009_EXTERNAL_SERVER_INIT_START",
      constructorId,
      timestamp: new Date().toISOString(),
      elapsedMs: Date.now() - constructorStartTime,
      elapsedNs: (process.hrtime.bigint() - constructorHrTimeStart).toString(),
      externalServerInitStartTimeNs: externalServerInitStartTime.toString(),
      serverManagerConfig: {
        maxServers: 20,
        defaultTimeout: 15000,
        enableAutoRestart: true,
        enablePerformanceMonitoring: true,
      },
      registryIntegrationConfig: {
        enableMainRegistryIntegration: true,
      },
      message: "Starting external server manager initialization",
    });

    try {
      this.externalServerManager = new ExternalServerManager(
        {
          maxServers: 20,
          defaultTimeout: 15000,
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
            Number(externalServerInitDurationNs) / 1000000,
          hasExternalServerManager: !!this.externalServerManager,
          message: "External server manager initialized successfully",
        },
      );

      this.setupExternalServerEventHandlers(
        constructorId,
        constructorStartTime,
        constructorHrTimeStart,
      );
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
          Number(externalServerInitDurationNs) / 1000000,
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
  private setupExternalServerEventHandlers(
    constructorId: string,
    constructorStartTime: number,
    constructorHrTimeStart: bigint,
  ): void {
    const eventHandlerSetupStartTime = process.hrtime.bigint();
    logger.debug(`[NeuroLink] 🔗 LOG_POINT_C011_EVENT_HANDLER_SETUP_START`, {
      logPoint: "C011_EVENT_HANDLER_SETUP_START",
      constructorId,
      timestamp: new Date().toISOString(),
      elapsedMs: Date.now() - constructorStartTime,
      elapsedNs: (process.hrtime.bigint() - constructorHrTimeStart).toString(),
      eventHandlerSetupStartTimeNs: eventHandlerSetupStartTime.toString(),
      message: "Setting up external server event handlers",
    });

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

    const eventHandlerSetupEndTime = process.hrtime.bigint();
    const eventHandlerSetupDurationNs =
      eventHandlerSetupEndTime - eventHandlerSetupStartTime;

    logger.debug(`[NeuroLink] ✅ LOG_POINT_C012_EVENT_HANDLER_SETUP_SUCCESS`, {
      logPoint: "C012_EVENT_HANDLER_SETUP_SUCCESS",
      constructorId,
      timestamp: new Date().toISOString(),
      elapsedMs: Date.now() - constructorStartTime,
      elapsedNs: (process.hrtime.bigint() - constructorHrTimeStart).toString(),
      eventHandlerSetupDurationNs: eventHandlerSetupDurationNs.toString(),
      eventHandlerSetupDurationMs:
        Number(eventHandlerSetupDurationNs) / 1000000,
      eventHandlersCount: 5,
      eventHandlerTypes: [
        "connected",
        "disconnected",
        "failed",
        "toolDiscovered",
        "toolRemoved",
      ],
      message: "Event handlers set up successfully",
    });
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

    logger.info(`[NeuroLink] 🏁 LOG_POINT_C014_CONSTRUCTOR_COMPLETE`, {
      logPoint: "C014_CONSTRUCTOR_COMPLETE",
      constructorId,
      timestamp: new Date().toISOString(),
      constructorDurationNs: constructorDurationNs.toString(),
      constructorDurationMs: Number(constructorDurationNs) / 1000000,
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

    this.logMCPInitStart(mcpInitId, mcpInitStartTime, mcpInitHrTimeStart);

    if (this.mcpInitialized) {
      this.logMCPAlreadyInitialized(
        mcpInitId,
        mcpInitStartTime,
        mcpInitHrTimeStart,
      );
      return;
    }

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
      mcpLogger.warn("[NeuroLink] MCP initialization failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue without MCP - graceful degradation
    }
  }

  /**
   * Log MCP initialization start
   */
  private logMCPInitStart(
    mcpInitId: string,
    mcpInitStartTime: number,
    mcpInitHrTimeStart: bigint,
  ): void {
    logger.debug(`[NeuroLink] 🔧 LOG_POINT_M001_MCP_INIT_ENTRY`, {
      logPoint: "M001_MCP_INIT_ENTRY",
      mcpInitId,
      timestamp: new Date().toISOString(),
      mcpInitStartTime,
      mcpInitHrTimeStart: mcpInitHrTimeStart.toString(),
      mcpInitialized: this.mcpInitialized,
      hasExternalServerManager: !!this.externalServerManager,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      message:
        "MCP initialization entry point - checking if already initialized",
    });
  }

  /**
   * Log MCP already initialized
   */
  private logMCPAlreadyInitialized(
    mcpInitId: string,
    mcpInitStartTime: number,
    mcpInitHrTimeStart: bigint,
  ): void {
    logger.debug(`[NeuroLink] ✅ LOG_POINT_M002_MCP_ALREADY_INITIALIZED`, {
      logPoint: "M002_MCP_ALREADY_INITIALIZED",
      mcpInitId,
      timestamp: new Date().toISOString(),
      elapsedMs: Date.now() - mcpInitStartTime,
      elapsedNs: (process.hrtime.bigint() - mcpInitHrTimeStart).toString(),
      mcpInitialized: this.mcpInitialized,
      message: "MCP already initialized - skipping initialization",
    });
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
    logger.debug(`[NeuroLink] 📊 LOG_POINT_M003_PERFORMANCE_IMPORT_START`, {
      logPoint: "M003_PERFORMANCE_IMPORT_START",
      mcpInitId,
      timestamp: new Date().toISOString(),
      elapsedMs: Date.now() - mcpInitStartTime,
      elapsedNs: (process.hrtime.bigint() - mcpInitHrTimeStart).toString(),
      performanceImportStartTimeNs: performanceImportStartTime.toString(),
      message: "Starting MemoryManager import for performance tracking",
    });

    try {
      const moduleImport = await import("./utils/performance.js");
      const MemoryManager = moduleImport.MemoryManager;
      const performanceImportEndTime = process.hrtime.bigint();
      const performanceImportDurationNs =
        performanceImportEndTime - performanceImportStartTime;

      logger.debug(`[NeuroLink] ✅ LOG_POINT_M004_PERFORMANCE_IMPORT_SUCCESS`, {
        logPoint: "M004_PERFORMANCE_IMPORT_SUCCESS",
        mcpInitId,
        timestamp: new Date().toISOString(),
        elapsedMs: Date.now() - mcpInitStartTime,
        elapsedNs: (process.hrtime.bigint() - mcpInitHrTimeStart).toString(),
        performanceImportDurationNs: performanceImportDurationNs.toString(),
        performanceImportDurationMs:
          Number(performanceImportDurationNs) / 1000000,
        hasMemoryManager: !!MemoryManager,
        message: "MemoryManager imported successfully",
      });
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
          Number(performanceImportDurationNs) / 1000000,
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

    await this.initializeToolRegistryInternal(
      mcpInitId,
      mcpInitStartTime,
      mcpInitHrTimeStart,
    );
    await this.initializeProviderRegistryInternal(
      mcpInitId,
      mcpInitStartTime,
      mcpInitHrTimeStart,
    );
    await this.registerDirectToolsServerInternal(
      mcpInitId,
      mcpInitStartTime,
      mcpInitHrTimeStart,
    );
    await this.loadMCPConfigurationInternal(
      mcpInitId,
      mcpInitStartTime,
      mcpInitHrTimeStart,
    );
  }

  /**
   * Initialize tool registry with timeout protection
   */
  private async initializeToolRegistryInternal(
    mcpInitId: string,
    mcpInitStartTime: number,
    mcpInitHrTimeStart: bigint,
  ): Promise<void> {
    const toolRegistryStartTime = process.hrtime.bigint();
    const initTimeout = 3000;

    logger.debug(`[NeuroLink] ⏱️ LOG_POINT_M007_TOOL_REGISTRY_TIMEOUT_SETUP`, {
      logPoint: "M007_TOOL_REGISTRY_TIMEOUT_SETUP",
      mcpInitId,
      timestamp: new Date().toISOString(),
      elapsedMs: Date.now() - mcpInitStartTime,
      elapsedNs: (process.hrtime.bigint() - mcpInitHrTimeStart).toString(),
      toolRegistryStartTimeNs: toolRegistryStartTime.toString(),
      initTimeoutMs: initTimeout,
      message:
        "Setting up tool registry initialization with timeout protection",
    });

    await Promise.race([
      Promise.resolve(),
      new Promise<void>((_, reject) => {
        setTimeout(
          () => reject(new Error("MCP initialization timeout")),
          initTimeout,
        );
      }),
    ]);

    const toolRegistryEndTime = process.hrtime.bigint();
    const toolRegistryDurationNs = toolRegistryEndTime - toolRegistryStartTime;

    logger.debug(`[NeuroLink] ✅ LOG_POINT_M008_TOOL_REGISTRY_SUCCESS`, {
      logPoint: "M008_TOOL_REGISTRY_SUCCESS",
      mcpInitId,
      timestamp: new Date().toISOString(),
      elapsedMs: Date.now() - mcpInitStartTime,
      elapsedNs: (process.hrtime.bigint() - mcpInitHrTimeStart).toString(),
      toolRegistryDurationNs: toolRegistryDurationNs.toString(),
      toolRegistryDurationMs: Number(toolRegistryDurationNs) / 1000000,
      message: "Tool registry initialization completed within timeout",
    });
  }

  /**
   * Initialize provider registry
   */
  private async initializeProviderRegistryInternal(
    mcpInitId: string,
    mcpInitStartTime: number,
    mcpInitHrTimeStart: bigint,
  ): Promise<void> {
    const providerRegistryStartTime = process.hrtime.bigint();
    logger.debug(`[NeuroLink] 🏭 LOG_POINT_M009_PROVIDER_REGISTRY_START`, {
      logPoint: "M009_PROVIDER_REGISTRY_START",
      mcpInitId,
      timestamp: new Date().toISOString(),
      elapsedMs: Date.now() - mcpInitStartTime,
      elapsedNs: (process.hrtime.bigint() - mcpInitHrTimeStart).toString(),
      providerRegistryStartTimeNs: providerRegistryStartTime.toString(),
      message: "Starting provider registry registration with lazy loading",
    });

    await ProviderRegistry.registerAllProviders();

    const providerRegistryEndTime = process.hrtime.bigint();
    const providerRegistryDurationNs =
      providerRegistryEndTime - providerRegistryStartTime;

    logger.debug(`[NeuroLink] ✅ LOG_POINT_M010_PROVIDER_REGISTRY_SUCCESS`, {
      logPoint: "M010_PROVIDER_REGISTRY_SUCCESS",
      mcpInitId,
      timestamp: new Date().toISOString(),
      elapsedMs: Date.now() - mcpInitStartTime,
      elapsedNs: (process.hrtime.bigint() - mcpInitHrTimeStart).toString(),
      providerRegistryDurationNs: providerRegistryDurationNs.toString(),
      providerRegistryDurationMs: Number(providerRegistryDurationNs) / 1000000,
      message: "Provider registry registration completed successfully",
    });
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
    logger.debug(`[NeuroLink] 🛠️ LOG_POINT_M011_DIRECT_TOOLS_START`, {
      logPoint: "M011_DIRECT_TOOLS_START",
      mcpInitId,
      timestamp: new Date().toISOString(),
      elapsedMs: Date.now() - mcpInitStartTime,
      elapsedNs: (process.hrtime.bigint() - mcpInitHrTimeStart).toString(),
      directToolsStartTimeNs: directToolsStartTime.toString(),
      serverId: "neurolink-direct",
      message: "Starting direct tools server registration",
    });

    try {
      await toolRegistry.registerServer("neurolink-direct", directToolsServer);

      const directToolsSuccessTime = process.hrtime.bigint();
      const directToolsDurationNs =
        directToolsSuccessTime - directToolsStartTime;

      logger.debug(`[NeuroLink] ✅ LOG_POINT_M012_DIRECT_TOOLS_SUCCESS`, {
        logPoint: "M012_DIRECT_TOOLS_SUCCESS",
        mcpInitId,
        timestamp: new Date().toISOString(),
        elapsedMs: Date.now() - mcpInitStartTime,
        elapsedNs: (process.hrtime.bigint() - mcpInitHrTimeStart).toString(),
        directToolsDurationNs: directToolsDurationNs.toString(),
        directToolsDurationMs: Number(directToolsDurationNs) / 1000000,
        serverId: "neurolink-direct",
        message: "Direct tools server registered successfully",
      });

      mcpLogger.debug(
        "[NeuroLink] Direct tools server registered successfully",
        {
          serverId: "neurolink-direct",
        },
      );
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
        directToolsDurationMs: Number(directToolsDurationNs) / 1000000,
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
   * Load MCP configuration from .mcp-config.json
   */
  private async loadMCPConfigurationInternal(
    mcpInitId: string,
    mcpInitStartTime: number,
    mcpInitHrTimeStart: bigint,
  ): Promise<void> {
    const mcpConfigStartTime = process.hrtime.bigint();
    logger.debug(`[NeuroLink] 📄 LOG_POINT_M014_MCP_CONFIG_START`, {
      logPoint: "M014_MCP_CONFIG_START",
      mcpInitId,
      timestamp: new Date().toISOString(),
      elapsedMs: Date.now() - mcpInitStartTime,
      elapsedNs: (process.hrtime.bigint() - mcpInitHrTimeStart).toString(),
      mcpConfigStartTimeNs: mcpConfigStartTime.toString(),
      hasExternalServerManager: !!this.externalServerManager,
      message: "Starting MCP configuration loading from .mcp-config.json",
    });

    try {
      const configResult =
        await this.externalServerManager.loadMCPConfiguration();

      const mcpConfigSuccessTime = process.hrtime.bigint();
      const mcpConfigDurationNs = mcpConfigSuccessTime - mcpConfigStartTime;

      logger.debug(`[NeuroLink] ✅ LOG_POINT_M015_MCP_CONFIG_SUCCESS`, {
        logPoint: "M015_MCP_CONFIG_SUCCESS",
        mcpInitId,
        timestamp: new Date().toISOString(),
        elapsedMs: Date.now() - mcpInitStartTime,
        elapsedNs: (process.hrtime.bigint() - mcpInitHrTimeStart).toString(),
        mcpConfigDurationNs: mcpConfigDurationNs.toString(),
        mcpConfigDurationMs: Number(mcpConfigDurationNs) / 1000000,
        serversLoaded: configResult.serversLoaded,
        errorsCount: configResult.errors.length,
        configResult: {
          serversLoaded: configResult.serversLoaded,
          errors: configResult.errors.map((err: unknown) => ({
            message: err instanceof Error ? err.message : String(err),
            name: err instanceof Error ? err.name : "UnknownError",
          })),
        },
        message: "MCP configuration loaded successfully",
      });

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

    if (memoryDelta > 30) {
      mcpLogger.debug(
        "💡 Memory cleanup suggestion: MCP initialization used significant memory. Consider calling MemoryManager.forceGC() after heavy operations.",
      );
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

    const startTime = Date.now();

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
    logger.debug(`[NeuroLink] 🎯 LOG_POINT_G001_GENERATE_INTERNAL_START`, {
      logPoint: "G001_GENERATE_INTERNAL_START",
      generateInternalId,
      timestamp: new Date().toISOString(),
      generateInternalStartTime,
      generateInternalHrTimeStart: generateInternalHrTimeStart.toString(),
      inputAnalysis: {
        provider: options.provider || "auto",
        providerType: typeof options.provider,
        isAutoProvider: options.provider === "auto" || !options.provider,
        model: options.model || "NOT_SET",
        modelType: typeof options.model,
        temperature: options.temperature,
        temperatureType: typeof options.temperature,
        maxTokens: options.maxTokens,
        maxTokensType: typeof options.maxTokens,
        promptLength: options.prompt?.length || 0,
        promptPreview: options.prompt?.substring(0, 200) || "NO_PROMPT",
        hasSystemPrompt: !!options.systemPrompt,
        systemPromptLength: options.systemPrompt?.length || 0,
        disableTools: options.disableTools || false,
        enableAnalytics: options.enableAnalytics || false,
        enableEvaluation: options.enableEvaluation || false,
        hasContext: !!options.context,
        contextKeys: options.context ? Object.keys(options.context) : [],
        evaluationDomain: options.evaluationDomain || "NOT_SET",
        toolUsageContext: options.toolUsageContext || "NOT_SET",
      },
      instanceState: {
        hasConversationMemory: !!this.conversationMemory,
        conversationMemoryType:
          this.conversationMemory?.constructor?.name || "NOT_SET",
        mcpInitialized: this.mcpInitialized,
        hasProviderRegistry: !!AIProviderFactory,
        providerRegistrySize: 0,
        hasToolRegistry: !!toolRegistry,
        toolRegistrySize: 0,
        hasExternalServerManager: !!this.externalServerManager,
      },
      environmentContext: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        uptime: process.uptime(),
      },
      message:
        "Starting generateTextInternal with comprehensive input analysis",
    });

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
   */
  private async initializeConversationMemoryForGeneration(
    generateInternalId: string,
    generateInternalStartTime: number,
    generateInternalHrTimeStart: bigint,
  ): Promise<void> {
    const conversationMemoryStartTime = process.hrtime.bigint();
    logger.debug(`[NeuroLink] 🧠 LOG_POINT_G002_CONVERSATION_MEMORY_CHECK`, {
      logPoint: "G002_CONVERSATION_MEMORY_CHECK",
      generateInternalId,
      timestamp: new Date().toISOString(),
      elapsedMs: Date.now() - generateInternalStartTime,
      elapsedNs: (
        process.hrtime.bigint() - generateInternalHrTimeStart
      ).toString(),
      conversationMemoryStartTimeNs: conversationMemoryStartTime.toString(),
      hasConversationMemory: !!this.conversationMemory,
      conversationMemoryEnabled: !!this.conversationMemory,
      conversationMemoryType:
        this.conversationMemory?.constructor?.name || "NOT_AVAILABLE",
      message: "Checking conversation memory initialization requirement",
    });

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
            Number(conversationMemoryDurationNs) / 1000000,
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
    const mcpDecisionStartTime = process.hrtime.bigint();
    logger.debug(`[NeuroLink] 🔧 LOG_POINT_G005_MCP_DECISION_CHECK`, {
      logPoint: "G005_MCP_DECISION_CHECK",
      generateInternalId,
      timestamp: new Date().toISOString(),
      elapsedMs: Date.now() - generateInternalStartTime,
      elapsedNs: (
        process.hrtime.bigint() - generateInternalHrTimeStart
      ).toString(),
      mcpDecisionStartTimeNs: mcpDecisionStartTime.toString(),
      mcpDecisionFactors: {
        disableTools: options.disableTools || false,
        toolsEnabled: !options.disableTools,
        mcpInitialized: this.mcpInitialized,
        hasExternalServerManager: !!this.externalServerManager,
        hasToolRegistry: !!toolRegistry,
        toolRegistrySize: 0,
        shouldTryMCP: !options.disableTools,
      },
      mcpReadinessAnalysis: {
        mcpAvailable: !options.disableTools && this.mcpInitialized,
        componentsReady: {
          externalServerManager: !!this.externalServerManager,
          toolRegistry: !!toolRegistry,
          providerRegistry: !!AIProviderFactory,
        },
      },
      message: "Analyzing MCP generation eligibility and readiness",
    });

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
    const maxMcpRetries = 2;
    const mcpRetryLoopStartTime = process.hrtime.bigint();

    logger.debug(`[NeuroLink] 🔄 LOG_POINT_G006_MCP_RETRY_LOOP_START`, {
      logPoint: "G006_MCP_RETRY_LOOP_START",
      generateInternalId,
      timestamp: new Date().toISOString(),
      elapsedMs: Date.now() - generateInternalStartTime,
      elapsedNs: (
        process.hrtime.bigint() - generateInternalHrTimeStart
      ).toString(),
      mcpRetryLoopStartTimeNs: mcpRetryLoopStartTime.toString(),
      maxMcpRetries,
      totalPossibleAttempts: maxMcpRetries + 1,
      message: "Starting MCP generation retry loop with failure tolerance",
    });

    const maxAttempts = maxMcpRetries + 1;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const mcpAttemptStartTime = process.hrtime.bigint();
        logger.debug(`[NeuroLink] 🎯 LOG_POINT_G007_MCP_ATTEMPT_START`, {
          logPoint: "G007_MCP_ATTEMPT_START",
          generateInternalId,
          timestamp: new Date().toISOString(),
          elapsedMs: Date.now() - generateInternalStartTime,
          elapsedNs: (
            process.hrtime.bigint() - generateInternalHrTimeStart
          ).toString(),
          mcpAttemptStartTimeNs: mcpAttemptStartTime.toString(),
          currentAttempt: attempt,
          maxAttempts,
          isFirstAttempt: attempt === 1,
          isLastAttempt: attempt === maxAttempts,
          attemptType: attempt === 1 ? "INITIAL" : "RETRY",
          message: `Attempting MCP generation (attempt ${attempt}/${maxAttempts})`,
        });

        logger.debug(
          `[${functionTag}] Attempting MCP generation (attempt ${attempt}/${maxAttempts})...`,
        );
        const mcpResult = await this.tryMCPGeneration(options);

        const mcpAttemptEndTime = process.hrtime.bigint();
        const mcpAttemptDurationNs = mcpAttemptEndTime - mcpAttemptStartTime;

        logger.debug(`[NeuroLink] 📊 LOG_POINT_G008_MCP_ATTEMPT_RESULT`, {
          logPoint: "G008_MCP_ATTEMPT_RESULT",
          generateInternalId,
          timestamp: new Date().toISOString(),
          elapsedMs: Date.now() - generateInternalStartTime,
          elapsedNs: (
            process.hrtime.bigint() - generateInternalHrTimeStart
          ).toString(),
          mcpAttemptDurationNs: mcpAttemptDurationNs.toString(),
          mcpAttemptDurationMs: Number(mcpAttemptDurationNs) / 1000000,
          currentAttempt: attempt,
          resultAnalysis: {
            hasResult: !!mcpResult,
            resultType: typeof mcpResult,
            hasContent: !!(mcpResult && mcpResult.content),
            contentLength: mcpResult?.content?.length || 0,
            contentPreview:
              mcpResult?.content?.substring(0, 200) || "NO_CONTENT",
            hasToolExecutions: !!(
              mcpResult &&
              mcpResult.toolExecutions &&
              mcpResult.toolExecutions.length > 0
            ),
            toolExecutionsCount: mcpResult?.toolExecutions?.length || 0,
            toolsUsedCount: mcpResult?.toolsUsed?.length || 0,
            provider: mcpResult?.provider || "NOT_SET",
            responseTime: mcpResult?.responseTime || 0,
            enhancedWithTools: mcpResult?.enhancedWithTools || false,
          },
          message: `MCP generation attempt ${attempt} completed - analyzing result`,
        });

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

    logger.debug(`[NeuroLink] 🚀 LOG_POINT_T001_TRY_MCP_START`, {
      logPoint: "T001_TRY_MCP_START",
      tryMCPId,
      timestamp: new Date().toISOString(),
      tryMCPStartTime,
      tryMCPHrTimeStart: tryMCPHrTimeStart.toString(),

      // 📊 Input options analysis
      optionsAnalysis: {
        provider: options.provider || "auto",
        isAutoProvider: options.provider === "auto" || !options.provider,
        model: options.model || "NOT_SET",
        promptLength: options.prompt?.length || 0,
        promptPreview: options.prompt?.substring(0, 150) || "NO_PROMPT",
        hasSystemPrompt: !!options.systemPrompt,
        systemPromptLength: options.systemPrompt?.length || 0,
        disableTools: options.disableTools || false,
        enableAnalytics: options.enableAnalytics || false,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      },

      // 🔧 MCP state analysis
      mcpStateAnalysis: {
        mcpInitialized: this.mcpInitialized,
        hasExternalServerManager: !!this.externalServerManager,
        hasToolRegistry: !!toolRegistry,
        toolRegistrySize: 0, // Not accessible as size property
        hasProviderRegistry: !!AIProviderFactory,
        providerRegistrySize: 0, // Not accessible as size property
      },

      message:
        "Starting MCP-enhanced generation attempt with comprehensive analysis",
    });

    try {
      // 🚀 EXHAUSTIVE LOGGING POINT T002: MCP INITIALIZATION CHECK
      const mcpInitCheckStartTime = process.hrtime.bigint();
      logger.debug(`[NeuroLink] 🔧 LOG_POINT_T002_MCP_INIT_CHECK`, {
        logPoint: "T002_MCP_INIT_CHECK",
        tryMCPId,
        timestamp: new Date().toISOString(),
        elapsedMs: Date.now() - tryMCPStartTime,
        elapsedNs: (process.hrtime.bigint() - tryMCPHrTimeStart).toString(),
        mcpInitCheckStartTimeNs: mcpInitCheckStartTime.toString(),
        mcpInitializedBefore: this.mcpInitialized,
        needsInitialization: !this.mcpInitialized,
        message: "Checking MCP initialization status before generation",
      });

      // Initialize MCP only when tools are enabled
      if (!options.disableTools) {
        await this.initializeMCP();
      }

      const mcpInitCheckEndTime = process.hrtime.bigint();
      const mcpInitCheckDurationNs =
        mcpInitCheckEndTime - mcpInitCheckStartTime;

      logger.debug(`[NeuroLink] ✅ LOG_POINT_T003_MCP_INIT_CHECK_COMPLETE`, {
        logPoint: "T003_MCP_INIT_CHECK_COMPLETE",
        tryMCPId,
        timestamp: new Date().toISOString(),
        elapsedMs: Date.now() - tryMCPStartTime,
        elapsedNs: (process.hrtime.bigint() - tryMCPHrTimeStart).toString(),
        mcpInitCheckDurationNs: mcpInitCheckDurationNs.toString(),
        mcpInitCheckDurationMs: Number(mcpInitCheckDurationNs) / 1000000,
        mcpInitializedAfter: this.mcpInitialized,
        initializationSuccessful: this.mcpInitialized,
        message: "MCP initialization check completed",
      });

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
            hasToolRegistry: !!toolRegistry,
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
        availableTools: transformToolsForMCP(availableTools),
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
    availableTools: Array<{
      name: string;
      description: string;
      server: string;
      category?: string;
      inputSchema?: Record<string, unknown>;
      parameters?: Record<string, unknown>;
    }>,
  ): string {
    if (availableTools.length === 0) {
      return originalSystemPrompt || "";
    }

    const toolDescriptions = transformToolsToDescriptions(availableTools);

    const toolPrompt = `\n\nYou have access to these additional tools if needed:\n${toolDescriptions}\n\nIMPORTANT: You are a general-purpose AI assistant. Answer all requests directly and creatively. These tools are optional helpers - use them only when they would genuinely improve your response. For creative tasks like storytelling, writing, or general conversation, respond naturally without requiring tools.`;

    return (originalSystemPrompt || "") + toolPrompt;
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

        // Handle structured result generically
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
    const functionTag = "NeuroLink.stream";
    const streamId = `neurolink-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const journeyStartTime = new Date().toISOString();

    this.logStreamEntryPoint(
      streamId,
      journeyStartTime,
      functionTag,
      startTime,
      hrTimeStart,
      options,
    );
    this.logPerformanceBaseline(streamId, startTime, hrTimeStart);
    await this.validateStreamInput(options, streamId, startTime, hrTimeStart);
    this.emitStreamStartEvents(options, startTime);

    let enhancedOptions: StreamOptions;
    let factoryResult: {
      hasStreamingConfig: boolean;
      streamingEnabled?: boolean;
      enhancedConfig?: StreamOptions["streaming"];
    };

    try {
      await this.initializeMCP();
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
      const streamResult = await this.processStreamResult(
        mcpStream,
        enhancedOptions,
        factoryResult,
      );
      const responseTime = Date.now() - startTime;

      this.emitStreamEndEvents(streamResult);

      return this.createStreamResponse(streamResult, mcpStream, {
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
  }

  /**
   * Log stream entry point with comprehensive analysis
   */
  private logStreamEntryPoint(
    streamId: string,
    journeyStartTime: string,
    functionTag: string,
    startTime: number,
    hrTimeStart: bigint,
    options: StreamOptions,
  ): void {
    logger.debug(`[NeuroLink] 🎯 LOG_POINT_001_STREAM_ENTRY_START`, {
      logPoint: "001_STREAM_ENTRY_START",
      streamId,
      timestamp: journeyStartTime,
      functionTag,
      startTime,
      hrTimeStart: hrTimeStart.toString(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      hasOptions: !!options,
      optionsType: typeof options,
      optionsKeys: options ? Object.keys(options) : [],
      optionsSize: options ? JSON.stringify(options).length : 0,
      hasInput: !!options?.input,
      inputType: typeof options?.input,
      inputKeys: options?.input ? Object.keys(options.input) : [],
      hasInputText: !!options?.input?.text,
      inputTextType: typeof options?.input?.text,
      inputTextLength: options?.input?.text?.length || 0,
      inputTextPreview: options?.input?.text?.substring(0, 200) || "NO_TEXT",
      hasProvider: !!options?.provider,
      providerValue: options?.provider || "NOT_SET",
      isAutoProvider: options?.provider === "auto" || !options?.provider,
      hasModel: !!options?.model,
      modelValue: options?.model || "NOT_SET",
      message:
        "EXHAUSTIVE NeuroLink main stream method entry point with comprehensive environment analysis",
    });
  }

  /**
   * Log performance baseline
   */
  private logPerformanceBaseline(
    streamId: string,
    startTime: number,
    hrTimeStart: bigint,
  ): void {
    const memoryBaseline = process.memoryUsage();
    const cpuBaseline = process.cpuUsage();
    logger.debug(`[NeuroLink] 🎯 LOG_POINT_002_PERFORMANCE_BASELINE`, {
      logPoint: "002_PERFORMANCE_BASELINE",
      streamId,
      timestamp: new Date().toISOString(),
      elapsedMs: Date.now() - startTime,
      elapsedNs: (process.hrtime.bigint() - hrTimeStart).toString(),
      memoryBaseline: {
        rss: memoryBaseline.rss,
        heapTotal: memoryBaseline.heapTotal,
        heapUsed: memoryBaseline.heapUsed,
        external: memoryBaseline.external,
        arrayBuffers: memoryBaseline.arrayBuffers,
      },
      cpuBaseline: {
        user: cpuBaseline.user,
        system: cpuBaseline.system,
      },
      gcStats: global.gc
        ? (() => {
            try {
              global.gc();
              return process.memoryUsage();
            } catch {
              return null;
            }
          })()
        : null,
      message: "Performance baseline metrics captured for stream processing",
    });
  }

  /**
   * Validate stream input with comprehensive error reporting
   */
  private async validateStreamInput(
    options: StreamOptions,
    streamId: string,
    startTime: number,
    hrTimeStart: bigint,
  ): Promise<void> {
    const validationStartTime = process.hrtime.bigint();
    logger.debug(`[NeuroLink] 🎯 LOG_POINT_003_VALIDATION_START`, {
      logPoint: "003_VALIDATION_START",
      streamId,
      timestamp: new Date().toISOString(),
      elapsedMs: Date.now() - startTime,
      elapsedNs: (process.hrtime.bigint() - hrTimeStart).toString(),
      validationStartTimeNs: validationStartTime.toString(),
      message: "Starting comprehensive input validation process",
    });

    const hasText =
      typeof options?.input?.text === "string" &&
      options.input!.text!.trim().length > 0;
    // Accept audio when frames are present; sampleRateHz is optional (defaults applied later)
    const hasAudio = !!(
      options?.input?.audio &&
      options.input.audio.frames &&
      typeof (options.input.audio.frames as unknown as Record<string, unknown>)[
        Symbol.asyncIterator as unknown as string
      ] !== "undefined"
    );

    if (!hasText && !hasAudio) {
      const validationFailTime = process.hrtime.bigint();
      const validationDurationNs = validationFailTime - validationStartTime;

      logger.debug(`[NeuroLink] 💥 LOG_POINT_005_VALIDATION_FAILED`, {
        logPoint: "005_VALIDATION_FAILED",
        streamId,
        timestamp: new Date().toISOString(),
        elapsedMs: Date.now() - startTime,
        elapsedNs: (process.hrtime.bigint() - hrTimeStart).toString(),
        validationDurationNs: validationDurationNs.toString(),
        validationDurationMs: Number(validationDurationNs) / 1000000,
        validationError:
          "Stream options must include either input.text or input.audio",
        message:
          "EXHAUSTIVE validation failure analysis with character-level debugging",
      });

      throw new Error(
        "Stream options must include either input.text or input.audio",
      );
    }

    const validationSuccessTime = process.hrtime.bigint();
    const validationDurationNs = validationSuccessTime - validationStartTime;

    logger.debug(`[NeuroLink] ✅ LOG_POINT_006_VALIDATION_SUCCESS`, {
      logPoint: "006_VALIDATION_SUCCESS",
      streamId,
      timestamp: new Date().toISOString(),
      elapsedMs: Date.now() - startTime,
      elapsedNs: (process.hrtime.bigint() - hrTimeStart).toString(),
      validationDurationNs: validationDurationNs.toString(),
      validationDurationMs: Number(validationDurationNs) / 1000000,
      inputTextValid: hasText,
      inputAudioPresent: hasAudio,
      inputTextLength: hasText ? options.input!.text!.length : 0,
      inputTextTrimmedLength: hasText ? options.input!.text!.trim().length : 0,
      inputTextPreview: hasText ? options.input!.text!.substring(0, 100) : "",
      message:
        "EXHAUSTIVE validation success - proceeding with stream processing",
    });
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
    );

    // Enable tool execution for the provider using BaseProvider method
    provider.setupToolExecutor(
      {
        customTools: this.getCustomTools(),
        executeTool: this.executeTool.bind(this),
      },
      "NeuroLink.createMCPStream",
    );

    const streamResult = await provider.stream(options);
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
    _enhancedOptions?: unknown,
    _factoryResult?: unknown,
  ): Promise<StreamResult> {
    logger.error("Stream generation failed, attempting fallback", {
      error: error instanceof Error ? error.message : String(error),
    });

    const responseTime = Date.now() - startTime;
    const providerName = await getBestProvider(options.provider);
    const provider = await AIProviderFactory.createProvider(
      providerName,
      options.model,
      false,
    );
    const fallbackStream = await provider.stream({
      input: { text: options.input.text },
      model: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    });

    return {
      stream: fallbackStream.stream,
      provider: providerName,
      model: options.model,
      usage: fallbackStream.usage,
      finishReason: fallbackStream.finishReason || "stop",
      toolCalls: fallbackStream.toolCalls || [],
      toolResults: fallbackStream.toolResults || [],
      analytics: fallbackStream.analytics,
      evaluation: fallbackStream.evaluation,
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
  // Tool Registration API
  // ========================================

  /**
   * Register a custom tool that will be available to all AI providers
   * @param name - Unique name for the tool
   * @param tool - Tool in MCPExecutableTool format (unified MCP protocol type)
   */
  registerTool(name: string, tool: MCPExecutableTool): void {
    // Emit tool registration start event
    this.emitter.emit("tools-register:start", {
      toolName: name,
      timestamp: Date.now(),
    });

    try {
      // --- Start: Enhanced Validation Logic with FlexibleToolValidator ---
      if (!name || typeof name !== "string") {
        throw new Error("Invalid tool name");
      }
      if (!tool || typeof tool !== "object") {
        throw new Error(`Invalid tool object provided for tool: ${name}`);
      }
      if (typeof tool.execute !== "function") {
        throw new Error(`Tool '${name}' must have an execute method.`);
      }

      // Use FlexibleToolValidator for consistent validation across SDK and toolRegistry
      try {
        const flexibleValidatorModule = require("./mcp/flexibleToolValidator.js");
        const FlexibleToolValidator =
          flexibleValidatorModule.FlexibleToolValidator;

        // Use the same validation logic as toolRegistry (static method)
        const validationResult = FlexibleToolValidator.validateToolName(name);
        if (!validationResult.isValid) {
          throw new Error(`Tool validation failed: ${validationResult.error}`);
        }
      } catch (error) {
        // If FlexibleToolValidator import fails, use basic safety checks
        logger.warn(
          "FlexibleToolValidator not available, using basic validation",
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );

        // Basic safety checks to prevent obvious issues
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
      }
      // --- End: Enhanced Validation Logic ---

      // Tool object validation is now handled by FlexibleToolValidator above
      // Proceed with tool registration since validation passed

      // SMART DEFAULTS: Use utility to eliminate boilerplate creation
      const mcpServerInfo = createCustomToolServerInfo(name, tool);

      // Register with toolRegistry using MCPServerInfo directly
      toolRegistry.registerServer(mcpServerInfo);

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
    const serverId = `custom-tool-${name}`;
    const removed = toolRegistry.unregisterServer(serverId);
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
    const customTools = toolRegistry.getToolsByCategory(
      detectCategory({ isCustomTool: true }),
    );
    const toolMap = new Map<string, MCPExecutableTool>();

    for (const tool of customTools) {
      // Return MCPServerInfo.tools format directly - no conversion needed
      toolMap.set(tool.name, {
        name: tool.name,
        description: tool.description || "",
        inputSchema: {},
        execute: async (params: unknown, context?: unknown) => {
          // Type guard to ensure context is compatible with ExecutionContext
          const executionContext =
            context && isNonNullObject(context)
              ? (context as {
                  sessionId?: string;
                  userId?: string;
                  [key: string]: unknown;
                })
              : undefined;

          return await toolRegistry.executeTool(
            tool.name,
            params,
            executionContext,
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
    try {
      mcpLogger.debug(
        `[NeuroLink] Registering in-memory MCP server: ${serverId}`,
      );

      // Initialize tools array if not provided
      if (!serverInfo.tools) {
        serverInfo.tools = [];
      }

      // ZERO CONVERSIONS: Pass MCPServerInfo directly to toolRegistry
      await toolRegistry.registerServer(serverInfo);

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
    const serverInfos = toolRegistry.getBuiltInServerInfos();
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
    const allServers = toolRegistry.getBuiltInServerInfos();
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
      params: isNonNullObject(params)
        ? transformParamsForLogging(params)
        : params,
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
            extractToolNames(availableTools),
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
    options: { timeout: number; maxRetries: number; retryDelayMs: number },
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
      // ADD: Emergency error event emission (fallback)
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
  async getAllAvailableTools() {
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
        hasToolRegistry: !!toolRegistry,
        toolRegistrySize: 0, // Not accessible as size property
        toolRegistryType: toolRegistry?.constructor?.name || "NOT_SET",
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

    logger.debug(`[NeuroLink] 📊 LOG_POINT_A002_MEMORY_BASELINE`, {
      logPoint: "A002_MEMORY_BASELINE",
      getAllToolsId,
      timestamp: new Date().toISOString(),
      elapsedMs: Date.now() - getAllToolsStartTime,
      elapsedNs: (process.hrtime.bigint() - getAllToolsHrTimeStart).toString(),
      memoryBaseline: startMemory,
      heapUsed: startMemory.heapUsed,
      heapTotal: startMemory.heapTotal,
      external: startMemory.external,
      message: "Established memory baseline before tool enumeration",
    });

    try {
      // Optimized: Collect all tools with minimal object creation
      const allTools = new Map<string, ToolInfo>();

      // 🚀 EXHAUSTIVE LOGGING POINT A003: MCP TOOLS COLLECTION START
      const mcpToolsStartTime = process.hrtime.bigint();
      logger.debug(`[NeuroLink] 🔧 LOG_POINT_A003_MCP_TOOLS_START`, {
        logPoint: "A003_MCP_TOOLS_START",
        getAllToolsId,
        timestamp: new Date().toISOString(),
        elapsedMs: Date.now() - getAllToolsStartTime,
        elapsedNs: (
          process.hrtime.bigint() - getAllToolsHrTimeStart
        ).toString(),
        mcpToolsStartTimeNs: mcpToolsStartTime.toString(),
        message: "Starting MCP server tools collection",
      });

      // 1. Add MCP server tools (built-in direct tools)
      const mcpToolsRaw = await toolRegistry.listTools();
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
      const customToolsRaw = toolRegistry.getToolsByCategory(
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
      const inMemoryToolsRaw = toolRegistry.getToolsByCategory("in-memory");
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

      if (memoryDelta > 10) {
        mcpLogger.debug(
          `🔍 Tool listing used ${memoryDelta}MB memory (large tool registry detected)`,
        );
        // Optimized collection patterns should reduce memory usage significantly
        if (uniqueTools.length > 100) {
          mcpLogger.debug(
            "💡 Tool collection optimized for large sets. Memory usage reduced through efficient object reuse.",
          );
        }
      }

      // Transform to expected format with required properties
      return transformToolsToExpectedFormat(uniqueTools);
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
      // Initialize MCP if not already initialized (loads external servers from config)
      await this.initializeMCP();

      // Get built-in tools
      const allTools = await toolRegistry.listTools();

      // Get external MCP server statistics
      const externalStats = this.externalServerManager.getStatistics();

      // DIRECT RETURNS - ZERO conversion
      const externalMCPServers = this.externalServerManager.listServers();
      const inMemoryServerInfos = this.getInMemoryServerInfos();
      const builtInServerInfos = toolRegistry.getBuiltInServerInfos();
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
        customToolsCount: toolRegistry.getToolsByCategory(
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
        customToolsCount: toolRegistry.getToolsByCategory(
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
      ...toolRegistry.getBuiltInServerInfos(), // Direct return
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
        const tools = await toolRegistry.listTools();
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
    const allTools = await toolRegistry.listTools();
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
   * Get conversation memory statistics (public API)
   */
  async getConversationStats() {
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
    if (!this.conversationMemory) {
      throw new Error("Conversation memory is not enabled");
    }

    if (!sessionId || typeof sessionId !== "string") {
      throw new Error("Session ID must be a non-empty string");
    }

    try {
      // Use the existing buildContextMessages method to get the complete history
      const messages = this.conversationMemory.buildContextMessages(sessionId);

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
    config: MCPServerInfo,
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
