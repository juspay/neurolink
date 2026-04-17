/**
 * NeuroLink - Unified AI Interface with Real MCP Tool Integration
 *
 * REDESIGNED FALLBACK CHAIN - NO CIRCULAR DEPENDENCIES
 * Enhanced AI provider system with natural MCP tool access.
 * Uses real MCP infrastructure for tool discovery and execution.
 */

// Load environment variables from .env file (critical for SDK usage)
// Suppress dotenv v17 stdout banner — it pollutes CLI JSON output
try {
  process.env.DOTENV_CONFIG_QUIET = process.env.DOTENV_CONFIG_QUIET ?? "true";
  const { config: dotenvConfig } = await import("dotenv");
  dotenvConfig({ quiet: true });
} catch {
  // Environment variables should be set externally in production
}

import type { Hippocampus } from "@juspay/hippocampus";
import { SpanKind, SpanStatusCode, context, trace } from "@opentelemetry/api";
import { AsyncLocalStorage } from "async_hooks";
import { EventEmitter } from "events";
import pLimit from "p-limit";
import type { AIProviderName } from "./constants/enums.js";
import { ErrorCategory, ErrorSeverity } from "./constants/enums.js";
import {
  CIRCUIT_BREAKER,
  CIRCUIT_BREAKER_RESET_MS,
  MEMORY_THRESHOLDS,
  NANOSECOND_TO_MS_DIVISOR,
  PERFORMANCE_THRESHOLDS,
  PROVIDER_TIMEOUTS,
  RETRY_ATTEMPTS,
  RETRY_DELAYS,
  TOOL_TIMEOUTS,
} from "./constants/index.js";
import { checkContextBudget } from "./context/budgetChecker.js";
import { ContextCompactor } from "./context/contextCompactor.js";
import type {
  CompactionConfig,
  CompactionResult,
  ArtifactStore,
  SpanData,
  ConfirmationResponseEvent,
  HITLConfig,
  ObservabilityConfig,
  TaskManagerConfig,
  WorkflowConfig,
  ToolMiddleware,
  MetricsSummary,
  MCPServerTool,
  MCPToolAnnotations,
  TraceView,
  AuthenticatedContext,
  AuthProviderConfig,
  AuthProviderType,
  MastraAuthProvider,
  JsonObject,
  JsonValue,
  NeuroLinkEvents,
  TypedEventEmitter,
  UnknownRecord,
  MCPEnhancementsConfig,
  NeuroLinkAuthConfig,
  NeurolinkConstructorConfig,
  ChatMessage,
  ConversationMemoryConfig,
  ProviderDetails,
  ExternalMCPOperationResult,
  ExternalMCPServerInstance,
  ExternalMCPToolInfo,
  AdditionalMemoryUser,
  GenerateOptions,
  GenerateResult,
  AnalyticsData,
  EvaluationData,
  NeurolinkCredentials,
  ProviderStatus,
  TextGenerationOptions,
  TextGenerationResult,
  TokenUsage,
  MCPExecutableTool,
  MCPServerCategory,
  MCPServerInfo,
  MCPStatus,
  AudioChunk,
  StreamOptions,
  StreamResult,
  StreamToolCall,
  StreamToolResult,
  ToolExecutionContext,
  ToolExecutionSummary,
  ToolInfo,
  ToolRegistrationOptions,
  BatchOperationResult,
  OrchestrationResult,
  MCPTool,
  RoutingDecision,
  MetricsTraceContext,
} from "./types/index.js";
import { emergencyContentTruncation } from "./context/emergencyTruncation.js";
import {
  getContextOverflowProvider,
  isContextOverflowError,
  parseProviderOverflowDetails,
} from "./context/errorDetection.js";
import { ContextBudgetExceededError } from "./context/errors.js";
import { repairToolPairs } from "./context/toolPairRepair.js";
import { SYSTEM_LIMITS } from "./core/constants.js";
import { ConversationMemoryManager } from "./core/conversationMemoryManager.js";
import { AIProviderFactory } from "./core/factory.js";
import type { RedisConversationMemoryManager } from "./core/redisConversationMemoryManager.js";
import { createToolEventPayload } from "./core/toolEvents.js";
import { ProviderRegistry } from "./factories/providerRegistry.js";
import { FileReferenceRegistry } from "./files/fileReferenceRegistry.js";
import { createFileTools } from "./files/fileTools.js";
import { HITLManager } from "./hitl/hitlManager.js";
import { ToolCallBatcher } from "./mcp/batching/index.js";
// MCP Enhancement modules - wired into core execution path
import { ToolResultCache } from "./mcp/caching/index.js";
import { EnhancedToolDiscovery } from "./mcp/enhancedToolDiscovery.js";
import { ExternalServerManager } from "./mcp/externalServerManager.js";
import {
  McpOutputNormalizer,
  DEFAULT_MAX_MCP_OUTPUT_BYTES,
  DEFAULT_WARN_MCP_OUTPUT_BYTES,
} from "./mcp/mcpOutputNormalizer.js";
import { LocalTempArtifactStore } from "./artifacts/artifactStore.js";
import { ToolRouter } from "./mcp/routing/index.js";
// Import direct tools server for automatic registration
import { directToolsServer } from "./mcp/servers/agent/directToolsServer.js";
import { inferAnnotations, isSafeToRetry } from "./mcp/toolAnnotations.js";
import { MCPToolRegistry } from "./mcp/toolRegistry.js";
import type { HippocampusConfig } from "@juspay/hippocampus";
import { initializeHippocampus } from "./memory/hippocampusInitializer.js";
import { createMemoryRetrievalTools } from "./memory/memoryRetrievalTools.js";
import {
  getMetricsAggregator,
  MetricsAggregator,
} from "./observability/metricsAggregator.js";

import {
  SpanStatus,
  SpanType,
  CircuitBreakerOpenError,
  ConversationMemoryError,
  AuthenticationError,
  AuthorizationError,
  InvalidModelError,
} from "./types/index.js";
import { SpanSerializer } from "./observability/utils/spanSerializer.js";
import {
  flushOpenTelemetry,
  getLangfuseHealthStatus,
  initializeOpenTelemetry,
  isOpenTelemetryInitialized,
  runWithCurrentLangfuseContext,
  setLangfuseContext,
  shutdownOpenTelemetry,
} from "./services/server/ai/observability/instrumentation.js";
import { TaskManager } from "./tasks/taskManager.js";
import { createTaskTools } from "./tasks/tools/taskTools.js";
import { ATTR } from "./telemetry/attributes.js";
import { tracers } from "./telemetry/tracers.js";
// NEW: Generate function imports
import {
  getConversationMessages,
  storeConversationTurn,
} from "./utils/conversationMemory.js";
// Enhanced error handling imports
import {
  CircuitBreaker,
  ERROR_CODES,
  ErrorFactory,
  isAbortError,
  isRetriableError,
  logStructuredError,
  NeuroLinkError,
  withRetry,
  withTimeout,
} from "./utils/errorHandling.js";
// Factory processing imports
import {
  createCleanStreamOptions,
  enhanceTextGenerationOptions,
  processFactoryOptions,
  processStreamingFactoryOptions,
  validateFactoryConfig,
} from "./utils/factoryProcessing.js";
import { logger, mcpLogger } from "./utils/logger.js";
import {
  createCustomToolServerInfo,
  detectCategory,
} from "./utils/mcpDefaults.js";
import { resolveModel } from "./utils/modelAliasResolver.js";
// Import orchestration components
import { ModelRouter } from "./utils/modelRouter.js";
import { getBestProvider } from "./utils/providerUtils.js";
import { NON_RETRYABLE_HTTP_STATUS_CODES } from "./utils/retryability.js";
import { isZodSchema } from "./utils/schemaConversion.js";
import { BinaryTaskClassifier } from "./utils/taskClassifier.js";
// Tool detection and execution imports
// Transformation utilities
import {
  extractToolNames,
  optimizeToolForCollection,
  transformAvailableTools,
  transformParamsForLogging,
  transformToolExecutions,
  transformToolExecutionsForMCP,
  transformToolsForMCP,
  transformToolsToDescriptions,
  transformToolsToExpectedFormat,
} from "./utils/transformationUtils.js";
import { isNonNullObject } from "./utils/typeUtils.js";
import { getWorkflow } from "./workflow/core/workflowRegistry.js";
import { runWorkflow } from "./workflow/core/workflowRunner.js";

/**
 * NL-002: Classify MCP error messages into categories for AI disambiguation.
 * Returns a human-readable error category based on error message content.
 */
function classifyMcpErrorMessage(
  text: string,
):
  | "not_found"
  | "permission_denied"
  | "timeout"
  | "rate_limited"
  | "validation_error"
  | "unknown" {
  const lower = text.toLowerCase();
  if (
    lower.includes("not found") ||
    lower.includes("404") ||
    lower.includes("does not exist") ||
    lower.includes("no such")
  ) {
    return "not_found";
  }
  if (
    lower.includes("permission") ||
    lower.includes("forbidden") ||
    lower.includes("403") ||
    lower.includes("unauthorized") ||
    lower.includes("401") ||
    lower.includes("access denied")
  ) {
    return "permission_denied";
  }
  if (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("deadline exceeded")
  ) {
    return "timeout";
  }
  if (
    lower.includes("rate limit") ||
    lower.includes("429") ||
    lower.includes("too many requests") ||
    lower.includes("throttl")
  ) {
    return "rate_limited";
  }
  if (
    lower.includes("invalid") ||
    lower.includes("validation") ||
    lower.includes("bad request") ||
    lower.includes("400")
  ) {
    return "validation_error";
  }
  return "unknown";
}

function mcpCategoryToErrorCategory(
  mcpCategory: ReturnType<typeof classifyMcpErrorMessage>,
): ErrorCategory {
  switch (mcpCategory) {
    case "not_found":
      return ErrorCategory.VALIDATION;
    case "permission_denied":
      return ErrorCategory.PERMISSION;
    case "timeout":
      return ErrorCategory.TIMEOUT;
    case "rate_limited":
      return ErrorCategory.RESOURCE;
    case "validation_error":
      return ErrorCategory.VALIDATION;
    case "unknown":
      return ErrorCategory.EXECUTION;
  }
}

/**
 * Extract a human-readable error string from an MCP isError result object.
 * Returns an empty string if nothing useful can be extracted.
 */
function extractMcpErrorText(raw: unknown): string {
  try {
    const resultObj =
      typeof raw === "string" ? (JSON.parse(raw) as unknown) : raw;
    if (!resultObj || typeof resultObj !== "object") {
      return "";
    }
    const content = (resultObj as Record<string, unknown>).content;
    if (!Array.isArray(content)) {
      return "";
    }
    const texts = (content as Array<{ type?: string; text?: string }>)
      .filter((c) => c.type === "text" && c.text)
      .map((c) => c.text as string);
    return texts.join(" ").substring(0, 500);
  } catch {
    return "";
  }
}

/**
 * Check if an error is a non-retryable provider error that should immediately
 * stop the retry/fallback chain. These errors represent permanent failures
 * (e.g., model not found, authentication failed) where retrying with the
 * same configuration will never succeed.
 *
 * This prevents wasting tokens and latency on guaranteed-to-fail retries.
 * For example, a NOT_FOUND error for a model causes 6 retries of a 418KB
 * message, wasting ~628,000 tokens and adding 10+ seconds of latency.
 */
function isNonRetryableProviderError(error: unknown): boolean {
  // Check for typed error classes from providers
  if (error instanceof InvalidModelError) {
    return true;
  }
  if (error instanceof AuthenticationError) {
    return true;
  }
  if (error instanceof AuthorizationError) {
    return true;
  }

  // Check for HTTP status codes on error objects (e.g., from Vercel AI SDK)
  if (error && typeof error === "object") {
    const err = error as Record<string, unknown>;
    const status =
      typeof err.status === "number"
        ? err.status
        : typeof err.statusCode === "number"
          ? err.statusCode
          : undefined;

    if (status && NON_RETRYABLE_HTTP_STATUS_CODES.includes(status)) {
      return true;
    }
  }

  // Check error message for NOT_FOUND patterns (catches wrapped errors)
  if (error instanceof Error) {
    const msg = error.message;
    if (
      msg.includes("NOT_FOUND") ||
      msg.includes("Model Not Found") ||
      msg.includes("model not found") ||
      msg.includes("PERMISSION_DENIED") ||
      msg.includes("UNAUTHENTICATED")
    ) {
      return true;
    }
  }

  return false;
}

/**
 * NeuroLink - Universal AI Development Platform
 *
 * Main SDK class providing unified access to 14+ AI providers with enterprise features:
 * - Multi-provider support (OpenAI, Anthropic, Google AI Studio, Google Vertex, AWS Bedrock, etc.)
 * - MCP (Model Context Protocol) tool integration with 58+ external servers
 * - Human-in-the-Loop (HITL) security workflows for regulated industries
 * - Redis-based conversation memory and persistence
 * - Enterprise middleware system for monitoring and control
 * - Automatic provider fallback and retry logic
 * - Streaming with real-time token delivery
 * - Multimodal support (text, images, PDFs, CSV)
 *
 * @category Core
 *
 * @example Basic usage
 * ```typescript
 * import { NeuroLink } from '@juspay/neurolink';
 *
 * const neurolink = new NeuroLink();
 *
 * const result = await neurolink.generate({
 *   input: { text: 'Explain quantum computing' },
 *   provider: 'vertex',
 *   model: 'gemini-3-flash-preview'
 * });
 *
 * console.log(result.content);
 * ```
 *
 * @example With HITL security
 * ```typescript
 * const neurolink = new NeuroLink({
 *   hitl: {
 *     enabled: true,
 *     requireApproval: ['writeFile', 'executeCode'],
 *     confidenceThreshold: 0.85
 *   }
 * });
 * ```
 *
 * @example With Redis memory
 * ```typescript
 * const neurolink = new NeuroLink({
 *   conversationMemory: {
 *     enabled: true,
 *     redis: {
 *       url: 'redis://localhost:6379'
 *     }
 *   }
 * });
 * ```
 *
 * @example With MCP tools
 * ```typescript
 * const neurolink = new NeuroLink();
 *
 * // Discover available tools
 * const tools = await neurolink.getAvailableTools();
 *
 * // Use tools in generation
 * const result = await neurolink.generate({
 *   input: { text: 'Read the README.md file' },
 *   tools: ['readFile']
 * });
 * ```
 *
 * @see {@link GenerateOptions} for generation options
 * @see {@link StreamOptions} for streaming options
 * @see {@link NeurolinkConstructorConfig} for configuration options
 * @since 1.0.0
 */

/**
 * Module-level AsyncLocalStorage for per-request metrics trace context.
 * Eliminates the race condition where overlapping generate/stream calls on the
 * same NeuroLink instance would clobber each other's trace context.
 */
const metricsTraceContextStorage = new AsyncLocalStorage<MetricsTraceContext>();

export class NeuroLink {
  private mcpInitialized = false;
  private mcpSkipped = false;
  private mcpInitPromise: Promise<void> | null = null;
  private emitter =
    new EventEmitter() as unknown as TypedEventEmitter<NeuroLinkEvents>;

  // TaskManager — lazy-initialized on first access via `this.tasks`
  private _taskManager?: TaskManager;
  private _taskManagerConfig?: TaskManagerConfig;

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

  // NL-004: Model alias/deprecation configuration
  private modelAliasConfig?: import("./types/index.js").ModelAliasConfig;

  // Compaction watermark: prevents re-triggering compaction on already-compacted messages
  // Per-session map to avoid cross-session pollution in server mode
  private lastCompactionMessageCount = new Map<string, number>();

  /** Extract sessionId from options context for compaction watermark keying */
  private getCompactionSessionId(options: { context?: unknown }): string {
    return (
      ((options.context as Record<string, unknown> | undefined)
        ?.sessionId as string) || "__default__"
    );
  }

  // MCP Enhancement modules - wired into core execution path
  private mcpToolResultCache?: ToolResultCache;
  private mcpToolRouter?: ToolRouter;
  private mcpToolBatcher?: ToolCallBatcher;
  private mcpEnhancedDiscovery?: EnhancedToolDiscovery;
  private mcpToolMiddlewares: ToolMiddleware[] = [];
  /** Artifact store for externalized MCP tool outputs (set when strategy=externalize). */
  private mcpArtifactStore?: ArtifactStore;
  private _disableToolCacheForCurrentRequest = false;
  private mcpEnhancementsConfig?: MCPEnhancementsConfig;

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
      errorCategories: Record<string, number>;
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
    // Serialize error to string for consumer compatibility (event listeners
    // commonly check `typeof event.error === "string"`).
    this.emitter.emit(
      "tool:end",
      createToolEventPayload(toolName, {
        responseTime: Date.now() - startTime,
        success,
        timestamp: Date.now(),
        result,
        error: error ? error.message : undefined,
      }) as Record<string, unknown>,
    );
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

  // Authentication provider for secure access control
  private authProvider?: MastraAuthProvider;
  private pendingAuthConfig?: NeuroLinkAuthConfig;
  private authInitPromise?: Promise<void>;

  // Per-provider credential overrides (instance-level default)
  private credentials?: NeurolinkCredentials;

  /**
   * Merge instance-level credentials with per-call credentials.
   *
   * Semantics: **deep merge at the provider level.** For each provider key
   * present in both `this.credentials` and `callCredentials`, the per-call
   * fields are merged ON TOP of the instance-level fields, so fields not
   * mentioned in the per-call slice are preserved.
   *
   * Example:
   * ```
   * instance:  { openai: { apiKey: "key1", baseURL: "url1" } }
   * per-call:  { openai: { apiKey: "key2" } }
   * merged:    { openai: { apiKey: "key2", baseURL: "url1" } }   // baseURL preserved
   * ```
   *
   * Providers present only in one source are carried through unchanged.
   * Unrelated providers (not overridden in callCredentials) are carried through
   * from instance credentials unchanged.
   */
  private resolveCredentials(
    callCredentials?: NeurolinkCredentials,
  ): NeurolinkCredentials | undefined {
    if (!this.credentials && !callCredentials) {
      return undefined;
    }
    if (!this.credentials) {
      return callCredentials;
    }
    if (!callCredentials) {
      return this.credentials;
    }

    // Per-provider deep merge: for each provider key in the per-call
    // override, merge its fields on top of the instance-level slice so
    // individual fields (e.g. baseURL) are preserved when only apiKey
    // is overridden per-call.
    const merged = { ...this.credentials } as Record<string, unknown>;
    for (const key of Object.keys(callCredentials)) {
      const instanceSlice = (this.credentials as Record<string, unknown>)[key];
      const callSlice = (callCredentials as Record<string, unknown>)[key];
      if (
        instanceSlice &&
        callSlice &&
        typeof instanceSlice === "object" &&
        typeof callSlice === "object"
      ) {
        merged[key] = {
          ...(instanceSlice as object),
          ...(callSlice as object),
        };
      } else {
        merged[key] = callSlice ?? instanceSlice;
      }
    }
    return merged as NeurolinkCredentials;
  }

  // HITL (Human-in-the-Loop) support
  private hitlManager?: HITLManager;

  // Accumulated cost in USD across all generate() calls on this instance
  private _sessionCostUsd: number = 0;

  // File Reference Registry for lazy on-demand file processing
  private fileRegistry: FileReferenceRegistry;

  // Cached file tools to avoid redundant createFileTools() calls per generate/stream
  private cachedFileTools: ReturnType<typeof createFileTools> | null = null;

  // Memory instance and config
  private memoryInstance?: Hippocampus | null;
  private memorySDKConfig?: HippocampusConfig;

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
      let callbackExecuted = false;
      try {
        const ctx = options.context as Record<string, unknown>;
        // Trigger context scoping if any meaningful Langfuse field is present
        if (
          ctx.userId ||
          ctx.sessionId ||
          ctx.conversationId ||
          ctx.requestId ||
          ctx.traceName ||
          ctx.metadata
        ) {
          // Build customAttributes from top-level metadata string/number/boolean fields
          let customAttributes:
            | Record<string, string | number | boolean>
            | undefined;
          if (ctx.metadata && typeof ctx.metadata === "object") {
            const metaObj = ctx.metadata as Record<string, unknown>;
            const attrs: Record<string, string | number | boolean> = {};
            for (const [k, v] of Object.entries(metaObj)) {
              if (
                typeof v === "string" ||
                typeof v === "number" ||
                typeof v === "boolean"
              ) {
                attrs[k] = v;
              }
            }
            if (Object.keys(attrs).length > 0) {
              customAttributes = attrs;
            }
          }

          return await new Promise<T>((resolve, reject) => {
            setLangfuseContext(
              {
                userId: typeof ctx.userId === "string" ? ctx.userId : null,
                sessionId:
                  typeof ctx.sessionId === "string" ? ctx.sessionId : null,
                conversationId:
                  typeof ctx.conversationId === "string"
                    ? ctx.conversationId
                    : null,
                requestId:
                  typeof ctx.requestId === "string" ? ctx.requestId : null,
                traceName:
                  typeof ctx.traceName === "string" ? ctx.traceName : null,
                metadata:
                  ctx.metadata && typeof ctx.metadata === "object"
                    ? (ctx.metadata as Record<string, unknown>)
                    : null,
                ...(customAttributes !== undefined && { customAttributes }),
              },
              async () => {
                try {
                  callbackExecuted = true;
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
        if (callbackExecuted) {
          // Callback was executed inside Langfuse context but failed — do NOT retry
          // Re-throw to avoid double API calls and preserve error context
          throw error;
        }
        // Langfuse context setup itself failed — graceful degradation, run without context
        logger.warn("Failed to set Langfuse context from options", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return await callback();
  }

  private createMetricsTraceContext(): {
    traceId: string;
    parentSpanId: string;
  } {
    // Attempt to reuse the active OTel trace context so Pipeline B spans
    // land in the same Langfuse trace as Pipeline A spans.
    const activeSpan = trace.getSpan(context.active());
    if (activeSpan) {
      const spanCtx = activeSpan.spanContext();
      // Only use the OTel context if it has a valid trace ID.
      // parentSpanId stores the active span's ID as a parent reference;
      // each Pipeline B span must generate its own unique spanId to comply
      // with the OTel/W3C requirement that spanIds are unique per trace.
      if (
        spanCtx.traceId &&
        spanCtx.traceId !== "00000000000000000000000000000000"
      ) {
        return {
          traceId: spanCtx.traceId,
          parentSpanId: spanCtx.spanId,
        };
      }
    }
    // Fallback: no active OTel context (e.g. standalone Pipeline B usage)
    return {
      traceId: crypto.randomUUID().replace(/-/g, ""),
      parentSpanId: crypto.randomUUID().replace(/-/g, "").substring(0, 16),
    };
  }

  private enforceSessionBudget(maxBudgetUsd?: number): void {
    if (
      maxBudgetUsd === undefined ||
      maxBudgetUsd <= 0 ||
      this._sessionCostUsd < maxBudgetUsd
    ) {
      return;
    }

    throw new NeuroLinkError({
      code: "SESSION_BUDGET_EXCEEDED",
      message: `Session budget exceeded: spent $${this._sessionCostUsd.toFixed(4)} of $${maxBudgetUsd.toFixed(4)} limit`,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.HIGH,
      retriable: false,
      context: {
        spent: this._sessionCostUsd,
        limit: maxBudgetUsd,
      },
    });
  }

  private assertInputText(
    text: string | undefined,
    message: string,
  ): asserts text is string {
    if (!text || typeof text !== "string") {
      throw new Error(message);
    }
  }

  private async applyAuthenticatedRequestContext(options: {
    auth?: { token?: string };
    context?: Record<string, unknown>;
    requestContext?: Record<string, unknown>;
  }): Promise<void> {
    if (options.auth?.token) {
      const { AuthError } = await import("./auth/errors.js");
      await this.ensureAuthProvider();
      if (!this.authProvider) {
        throw AuthError.create(
          "PROVIDER_ERROR",
          "No auth provider configured. Set auth in constructor or via setAuthProvider() before using auth: { token }.",
        );
      }

      let authResult: Awaited<
        ReturnType<MastraAuthProvider["authenticateToken"]>
      >;
      try {
        authResult = await withTimeout(
          this.authProvider.authenticateToken(options.auth.token),
          5000,
          AuthError.create(
            "PROVIDER_ERROR",
            "Auth token validation timed out after 5000ms",
          ),
        );
      } catch (error) {
        if (
          error instanceof Error &&
          "feature" in error &&
          (error as { feature: string }).feature === "Auth"
        ) {
          throw error;
        }
        throw AuthError.create(
          "PROVIDER_ERROR",
          `Auth token validation failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      if (!authResult.valid) {
        throw AuthError.create(
          "INVALID_TOKEN",
          authResult.error || "Token validation failed",
        );
      }
      if (!authResult.user) {
        throw AuthError.create(
          "INVALID_TOKEN",
          "Token validated but no user identity returned",
        );
      }
      if (!authResult.user.id) {
        throw AuthError.create(
          "INVALID_TOKEN",
          "Token validated but user identity missing required 'id' field",
        );
      }

      options.context = {
        ...(options.context || {}),
        userId: authResult.user.id,
        userEmail: authResult.user.email,
        userRoles: authResult.user.roles,
      };
    }

    if (!options.requestContext) {
      return;
    }

    const tokenDerivedFields =
      options.auth?.token && this.authProvider
        ? {
            userId: options.context?.userId,
            userEmail: options.context?.userEmail,
            userRoles: options.context?.userRoles,
          }
        : {};
    options.context = {
      ...(options.context || {}),
      ...options.requestContext,
      ...tokenDerivedFields,
    };
  }

  private applyGenerateLifecycleMiddleware(options: GenerateOptions): void {
    if (!options.onFinish && !options.onError) {
      return;
    }

    options.middleware = {
      ...options.middleware,
      middlewareConfig: {
        ...options.middleware?.middlewareConfig,
        lifecycle: {
          ...options.middleware?.middlewareConfig?.lifecycle,
          enabled: true,
          config: {
            ...options.middleware?.middlewareConfig?.lifecycle?.config,
            ...(options.onFinish !== undefined
              ? { onFinish: options.onFinish }
              : {}),
            ...(options.onError !== undefined
              ? { onError: options.onError }
              : {}),
          },
        },
      },
    };
  }

  private applyStreamLifecycleMiddleware(options: StreamOptions): void {
    if (!options.onFinish && !options.onError && !options.onChunk) {
      return;
    }

    options.middleware = {
      ...options.middleware,
      middlewareConfig: {
        ...options.middleware?.middlewareConfig,
        lifecycle: {
          ...options.middleware?.middlewareConfig?.lifecycle,
          enabled: true,
          config: {
            ...options.middleware?.middlewareConfig?.lifecycle?.config,
            ...(options.onFinish !== undefined
              ? { onFinish: options.onFinish }
              : {}),
            ...(options.onError !== undefined
              ? { onError: options.onError }
              : {}),
            ...(options.onChunk !== undefined
              ? { onChunk: options.onChunk }
              : {}),
          },
        },
      },
    };
  }

  private initializeMemoryConfig(): boolean {
    const memory = this.conversationMemoryConfig?.conversationMemory?.memory;
    if (!memory?.enabled) {
      return false;
    }

    this.memorySDKConfig = memory;
    return true;
  }

  /**
   * Lazy initialization for memory — called during generate/stream.
   */
  private ensureMemoryReady(): Hippocampus | null {
    if (this.memoryInstance !== undefined) {
      return this.memoryInstance;
    }

    if (!this.initializeMemoryConfig()) {
      this.memoryInstance = null;
      return null;
    }

    if (!this.memorySDKConfig) {
      this.memoryInstance = null;
      return null;
    }

    this.memoryInstance = initializeHippocampus(this.memorySDKConfig);
    return this.memoryInstance;
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
  private metricsAggregator: MetricsAggregator = new MetricsAggregator();
  /**
   * Per-request metrics trace context backed by AsyncLocalStorage.
   * Safe for concurrent requests on the same SDK instance.
   * Context is set via metricsTraceContextStorage.run() in generate/stream.
   */
  private get _metricsTraceContext(): MetricsTraceContext | null {
    return metricsTraceContextStorage.getStore() ?? null;
  }

  constructor(config?: NeurolinkConstructorConfig) {
    this.toolRegistry = config?.toolRegistry || new MCPToolRegistry();
    this.fileRegistry = new FileReferenceRegistry();
    this.observabilityConfig = config?.observability;

    // Initialize orchestration setting
    this.enableOrchestration = config?.enableOrchestration ?? false;

    // NL-004: Initialize model alias configuration
    if (config?.modelAliasConfig) {
      this.modelAliasConfig = config.modelAliasConfig;
    }

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
    this.initializeMCPEnhancements(config);
    this.registerFileTools();
    this.registerMemoryRetrievalTools();
    this.initializeLangfuse(
      constructorId,
      constructorStartTime,
      constructorHrTimeStart,
    );
    this.initializeMetricsListeners();
    this.logConstructorComplete(
      constructorId,
      constructorStartTime,
      constructorHrTimeStart,
    );

    // Store auth config for lazy initialization
    if (config?.auth) {
      this.pendingAuthConfig = config.auth;
    }

    // Store per-provider credential overrides
    if (config?.credentials) {
      this.credentials = config.credentials;
    }

    // Store task config for lazy initialization
    this._taskManagerConfig = config?.tasks;

    // Eagerly create TaskManager and register tools if config is provided
    if (this._taskManagerConfig) {
      this._taskManager = new TaskManager(this, this._taskManagerConfig);
      this._taskManager.setEmitter(
        this.emitter as unknown as {
          emit(event: string, ...args: unknown[]): boolean;
        },
      );
      this.registerTaskTools(this._taskManager);
    }
  }

  /**
   * TaskManager — scheduled and self-running tasks.
   * Lazy-initialized on first access. Configurable via constructor `tasks` option.
   * The actual async initialization (Redis connect, backend start) happens
   * lazily inside TaskManager on first operation.
   */
  get tasks(): TaskManager {
    if (!this._taskManager) {
      this._taskManager = new TaskManager(this, this._taskManagerConfig);
      this._taskManager.setEmitter(
        this.emitter as unknown as {
          emit(event: string, ...args: unknown[]): boolean;
        },
      );
      this.registerTaskTools(this._taskManager);
    }
    return this._taskManager;
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

  /**
   * Initialize MCP enhancement modules (cache, router, batcher, discovery).
   * Wires standalone MCP modules into the core SDK execution path.
   */
  private initializeMCPEnhancements(config?: NeurolinkConstructorConfig): void {
    const mcpConfig = config?.mcp;
    this.mcpEnhancementsConfig = mcpConfig;

    // BZ-664: ToolCache — enabled by default to prevent duplicate tool calls.
    // Callers can explicitly opt out via mcp.cache.enabled = false.
    if (mcpConfig?.cache?.enabled !== false) {
      this.mcpToolResultCache = new ToolResultCache({
        ttl: mcpConfig?.cache?.ttl ?? 300_000,
        maxSize: mcpConfig?.cache?.maxSize ?? 500,
        strategy: mcpConfig?.cache?.strategy ?? "lru",
      });
      logger.debug("[NeuroLink] MCP tool result cache initialized", {
        ttl: mcpConfig?.cache?.ttl ?? 300_000,
        maxSize: mcpConfig?.cache?.maxSize ?? 500,
        strategy: mcpConfig?.cache?.strategy ?? "lru",
      });
    }

    // ToolCallBatcher — disabled by default, opt-in
    if (mcpConfig?.batcher?.enabled) {
      this.mcpToolBatcher = new ToolCallBatcher({
        maxBatchSize: mcpConfig.batcher.maxBatchSize ?? 10,
        maxWaitMs: mcpConfig.batcher.maxWaitMs ?? 100,
      });
      // Wire batcher to execute tools via the internal execution path (bypass batcher itself)
      this.mcpToolBatcher.setToolExecutor(
        async (tool: string, args: unknown) => {
          return this.executeToolInternal(tool, args, {
            timeout: TOOL_TIMEOUTS.EXECUTION_DEFAULT_MS,
            maxRetries: RETRY_ATTEMPTS.DEFAULT,
            retryDelayMs: RETRY_DELAYS.BASE_MS,
          });
        },
      );
      logger.debug("[NeuroLink] MCP tool call batcher initialized");
    }

    // EnhancedToolDiscovery — enabled by default
    if (mcpConfig?.discovery?.enabled !== false) {
      this.mcpEnhancedDiscovery = new EnhancedToolDiscovery();
      logger.debug("[NeuroLink] Enhanced tool discovery initialized");
    }

    // Middleware — store from config (empty by default)
    if (mcpConfig?.middleware?.length) {
      this.mcpToolMiddlewares = [...mcpConfig.middleware];
      logger.debug("[NeuroLink] MCP tool middlewares registered", {
        count: this.mcpToolMiddlewares.length,
      });
    }

    // ToolRouter — lazy-initialized when 2+ external servers exist (see addExternalMCPServer)

    // McpOutputNormalizer — active when mcp.outputLimits is configured
    if (mcpConfig?.outputLimits) {
      const strategy = mcpConfig.outputLimits.strategy ?? "externalize";
      const maxBytes =
        mcpConfig.outputLimits.maxBytes ?? DEFAULT_MAX_MCP_OUTPUT_BYTES;
      const warnBytes =
        mcpConfig.outputLimits.warnBytes ?? DEFAULT_WARN_MCP_OUTPUT_BYTES;

      let artifactStore: ArtifactStore | undefined;
      if (strategy === "externalize") {
        artifactStore = new LocalTempArtifactStore();
        this.mcpArtifactStore = artifactStore;
        logger.debug("[NeuroLink] MCP artifact store initialized (local-temp)");
      }

      const normalizer = new McpOutputNormalizer(
        { strategy, maxBytes, warnBytes },
        artifactStore,
      );
      this.externalServerManager.setOutputNormalizer(normalizer);
      logger.debug("[NeuroLink] MCP output normalizer initialized", {
        strategy,
        maxBytes,
        warnBytes,
      });
    }
  }

  /**
   * Register file reference tools with the MCP tool registry.
   *
   * Creates file access tools (list_attached_files, read_file_section,
   * search_in_file, get_file_preview) bound to the FileReferenceRegistry
   * and registers them as direct tools so they're available to LLMs.
   */
  private registerFileTools(): void {
    const fileTools = createFileTools(this.fileRegistry);

    // Use void to handle async registration without blocking constructor
    const registrations = Object.entries(fileTools).map(
      async ([toolName, toolDef]) => {
        const toolId = `direct.${toolName}`;
        const toolInfo: ToolInfo = {
          name: toolName,
          description: toolDef.description || `File tool: ${toolName}`,
          inputSchema: {},
          serverId: "direct",
          category: "built-in" as MCPServerCategory,
        };

        await this.toolRegistry.registerTool(toolId, toolInfo, {
          execute: async (params: unknown) => {
            try {
              const result = await (
                toolDef.execute as (
                  params: unknown,
                  ctx: unknown,
                ) => Promise<unknown>
              )(params, {
                toolCallId: "file-tool",
                messages: [],
              });
              return {
                success: true,
                data: result,
                metadata: { toolName, serverId: "direct", executionTime: 0 },
              };
            } catch (error) {
              // Known limitation: this non-throwing error path returns
              // { success: false } without recording errorCategories in
              // toolExecutionMetrics. These are internal file-tool failures
              // (low frequency), so the risk of metric gaps is minimal.
              // A full fix would require access to the metrics map here,
              // which is not available in the registration closure.
              return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                metadata: { toolName, serverId: "direct", executionTime: 0 },
              };
            }
          },
          description: toolDef.description,
          inputSchema: {},
        });
      },
    );

    // Fire-and-forget: registrations complete before any generate/stream call
    // because those calls await initializeMCP() which is slower
    void Promise.all(registrations).then(() => {
      logger.debug(
        `[NeuroLink] Registered ${Object.keys(fileTools).length} file reference tools`,
      );
    });
  }

  /**
   * Register task management tools bound to a TaskManager instance.
   * Follows the same factory + registry pattern as registerFileTools().
   * Called when TaskManager is created (eagerly or lazily via the `tasks` getter).
   */
  private registerTaskTools(manager: TaskManager): void {
    const taskTools = createTaskTools(manager);

    for (const [toolName, toolDef] of Object.entries(taskTools)) {
      const toolId = `direct.${toolName}`;
      const toolInfo: ToolInfo = {
        name: toolName,
        description: toolDef.description || `Task tool: ${toolName}`,
        inputSchema: {},
        serverId: "direct",
        category: "built-in" as MCPServerCategory,
      };

      // registerTool is async but its core logic is synchronous (Map.set).
      // We fire-and-forget here but tools are available immediately after
      // the synchronous validation + map insertion completes.
      void this.toolRegistry.registerTool(toolId, toolInfo, {
        execute: async (params: unknown) => {
          try {
            const result = await (
              toolDef.execute as (
                params: unknown,
                ctx: unknown,
              ) => Promise<unknown>
            )(params, {
              toolCallId: "task-tool",
              messages: [],
            });
            return {
              success: true,
              data: result,
              metadata: { toolName, serverId: "direct", executionTime: 0 },
            };
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : String(error),
              metadata: { toolName, serverId: "direct", executionTime: 0 },
            };
          }
        },
        description: toolDef.description,
        inputSchema: {},
      });
    }

    logger.debug(
      `[NeuroLink] Registered ${Object.keys(taskTools).length} task tools`,
    );
  }

  /**
   * Register memory retrieval tools that allow the AI to access
   * conversation history, including full tool outputs.
   * Only registered when Redis conversation memory is active.
   */
  private registerMemoryRetrievalTools(): void {
    // Check if conversation memory is configured
    // Memory retrieval tool requires Redis (getSessionRaw) but registration
    // is deferred — the execute handler checks at runtime whether the actual
    // memory manager supports getSessionRaw.
    const memConfig = this.conversationMemoryConfig?.conversationMemory;
    const hasRedisConfig =
      !!memConfig?.redisConfig ||
      (memConfig &&
        "redis" in memConfig &&
        !!(memConfig as { redis?: unknown }).redis) ||
      process.env.STORAGE_TYPE === "redis";
    const hasArtifactStore = !!this.mcpArtifactStore;

    // Register when Redis is configured OR when an artifact store exists.
    // Artifact store alone is sufficient for the artifactId retrieval path —
    // session history retrieval just returns a clear error when Redis is absent.
    if ((!memConfig?.enabled || !hasRedisConfig) && !hasArtifactStore) {
      logger.debug(
        "[NeuroLink] Skipping memory retrieval tools — requires Redis conversation memory or an artifact store",
      );
      return;
    }

    // Extract the canonical tool definition (schema + description) from the
    // memoryRetrievalTools factory. We pass undefined as the memoryManager here
    // because we only need the Zod inputSchema and description at registration
    // time — the actual manager is resolved lazily at execution time.
    const canonicalTools = createMemoryRetrievalTools(
      undefined,
      this.mcpArtifactStore,
    );
    const retrieveContextDef = canonicalTools.retrieve_context;

    // Register via this.registerTool() so the tool ends up in the "user-defined"
    // category inside toolRegistry. getCustomTools() returns that category, which
    // is what ToolsManager reads to build the tool schema sent to the LLM.
    // (Tools registered via toolRegistry.registerTool() directly land in the
    // "built-in" category and are never included in the LLM's tool schema.)
    this.registerTool("retrieve_context", {
      name: "retrieve_context",
      description:
        retrieveContextDef.description ?? "Retrieve context or artifacts",
      // Pass the Zod schema so ToolsManager gives the LLM full parameter types.
      // registerTool() detects isZodSchema on inputSchema and preserves it.
      inputSchema: (retrieveContextDef as unknown as { inputSchema: object })
        .inputSchema,
      execute: async (params: unknown) => {
        // Lazy: conversationMemory is initialized on the first generate() call.
        // When only an artifact store is present (no Redis), memoryManager is
        // undefined — createMemoryRetrievalTools handles that via an explicit guard.
        const memoryManager = this.conversationMemory as
          | import("./core/redisConversationMemoryManager.js").RedisConversationMemoryManager
          | undefined;
        const tools = createMemoryRetrievalTools(
          memoryManager,
          this.mcpArtifactStore,
        );
        // Return the result directly so the LLM receives clean output instead
        // of a nested { success, data, metadata } wrapper.
        // Bounded by TOOL_TIMEOUTS.EXECUTION_DEFAULT_MS so a stalled Redis or
        // filesystem backend never hangs the tool call indefinitely.
        return await withTimeout(
          (
            tools.retrieve_context.execute as (
              params: unknown,
              ctx: unknown,
            ) => Promise<unknown>
          )(params, { toolCallId: "memory-retrieval", messages: [] }),
          TOOL_TIMEOUTS.EXECUTION_DEFAULT_MS,
          ErrorFactory.toolTimeout(
            "retrieve_context",
            TOOL_TIMEOUTS.EXECUTION_DEFAULT_MS,
          ),
        );
      },
    });

    logger.info("[NeuroLink] Memory retrieval tools registered");
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

  /**
   * Format memory context from multiple users into a labeled block.
   */
  private formatMultiUserMemoryContext(
    memories: Map<string, string>,
    currentInput: string,
  ): string {
    const memoryBlocks: string[] = [];
    for (const [label, memory] of memories) {
      memoryBlocks.push(`[${label}]\n${memory}`);
    }
    return `Context from previous conversations:

${memoryBlocks.join("\n\n")}

Current user's request: ${currentInput}`;
  }

  /**
   * Determine whether memory should be read (retrieved) for this call.
   * Respects both the global memory SDK config and per-call overrides.
   */
  private shouldReadMemory(
    perCallMemory: { enabled?: boolean; read?: boolean } | undefined,
    userId: unknown,
  ): boolean {
    if (
      !this.conversationMemoryConfig?.conversationMemory?.memory?.enabled ||
      !userId
    ) {
      return false;
    }
    if (perCallMemory?.enabled === false) {
      return false;
    }
    if (perCallMemory?.read === false) {
      return false;
    }
    return true;
  }

  /**
   * Determine whether memory should be written (stored) for this call.
   * Respects both the global memory SDK config and per-call overrides.
   */
  private shouldWriteMemory(
    perCallMemory: { enabled?: boolean; write?: boolean } | undefined,
    userId: unknown,
    content: string | undefined | null,
  ): boolean {
    if (
      !this.conversationMemoryConfig?.conversationMemory?.memory?.enabled ||
      !userId
    ) {
      return false;
    }
    if (!content?.trim()) {
      return false;
    }
    if (perCallMemory?.enabled === false) {
      return false;
    }
    if (perCallMemory?.write === false) {
      return false;
    }
    return true;
  }

  /**
   * Retrieve condensed memory for a user (and optionally additional users).
   * Returns the input text enhanced with memory context, or unchanged if no memory.
   */
  private async retrieveMemory(
    inputText: string,
    userId: string,
    additionalUsers?: AdditionalMemoryUser[],
  ): Promise<string> {
    const client = this.ensureMemoryReady();
    if (!client) {
      return inputText;
    }

    // Collect all user IDs to read (primary + additional users with read !== false)
    const readableAdditional = (additionalUsers || []).filter(
      (u) => u.read !== false,
    );

    if (readableAdditional.length === 0) {
      // Single user — use original fast path
      const memory = await client.get(userId);
      if (!memory) {
        return inputText;
      }
      return this.formatMemoryContext(memory, inputText);
    }

    // Multi-user: fetch all memories in parallel
    // Build entries with labels for formatting
    const entries = [
      { id: userId, label: "User" },
      ...readableAdditional.map((u) => ({
        id: u.userId,
        label: u.label || u.userId,
      })),
    ];
    const results = await Promise.all(
      entries.map(async (entry) => {
        const memory = await client.get(entry.id);
        return { ...entry, memory } as const;
      }),
    );

    const memories = new Map<string, string>();
    for (const { label, memory } of results) {
      if (memory) {
        memories.set(label, memory);
      }
    }

    if (memories.size === 0) {
      return inputText;
    }

    return this.formatMultiUserMemoryContext(memories, inputText);
  }

  /**
   * Store a conversation turn in memory (non-blocking).
   * Calls add(userId, content) which internally condenses old + new via LLM.
   * Supports additional users with per-user prompt and maxWords overrides.
   */
  private storeMemoryInBackground(
    originalPrompt: string,
    responseContent: string,
    userId: string,
    additionalUsers?: AdditionalMemoryUser[],
  ): void {
    // Preserve AsyncLocalStorage context across setImmediate boundary so that
    // memory writes appear under the originating Langfuse trace instead of
    // becoming orphan spans.
    const wrappedMemoryWrite = runWithCurrentLangfuseContext(async () => {
      try {
        const client = this.ensureMemoryReady();
        if (!client) {
          return;
        }

        const content = `User: ${originalPrompt}\nAssistant: ${responseContent}`;

        // Collect all users to write: primary + additional users with write !== false
        const writeOps: Promise<string>[] = [client.add(userId, content)];

        const writableAdditional = (additionalUsers || []).filter(
          (u) => u.write !== false,
        );
        for (const user of writableAdditional) {
          const addOptions =
            user.prompt || user.maxWords
              ? { prompt: user.prompt, maxWords: user.maxWords }
              : undefined;
          writeOps.push(client.add(user.userId, content, addOptions));
        }

        // withTimeout races against Promise.all — if the timeout fires, the
        // await resolves with an error but the underlying client.add() calls
        // may still complete in the background. This is acceptable: the memory
        // client API (Mem0) doesn't support AbortSignal, and these are
        // fire-and-forget background writes where a stale completion is harmless.
        await withTimeout(
          Promise.all(writeOps),
          30_000,
          new Error("Background memory write timed out after 30s"),
        );
      } catch (error) {
        logger.warn("Memory storage failed:", error);
      }
    });
    setImmediate(wrappedMemoryWrite);
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
          defaultTimeout: Math.max(
            10000,
            Number(process.env.MCP_CLIENT_TIMEOUT) || 60000,
          ),
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

      // Check if we should use external provider mode - bypass enabled check
      const useExternalProvider =
        langfuseConfig?.autoDetectExternalProvider === true ||
        langfuseConfig?.useExternalTracerProvider === true;

      if (langfuseConfig?.enabled || useExternalProvider) {
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
        void initializeOpenTelemetry(langfuseConfig).catch((err) => {
          logger.error("[NeuroLink] OpenTelemetry initialization failed", {
            error: err instanceof Error ? err.message : String(err),
          });
        });

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
    // Skip if already initialized or explicitly skipped — prevents redundant
    // re-init on every generate call.
    if (this.mcpInitialized || this.mcpSkipped) {
      return;
    }

    // Deduplicate concurrent initialization attempts — if an init is already
    // in-flight, coalesce callers onto the same promise instead of running
    // a second parallel initialization.
    if (this.mcpInitPromise) {
      return this.mcpInitPromise;
    }

    // Environment-level kill switch — skip MCP-specific initialization on cold
    // start but always ensure providers are registered exactly once.
    if (process.env.NEUROLINK_SKIP_MCP === "true") {
      this.mcpInitPromise = (async () => {
        await this.initializeProviderRegistryInternal();
        this.mcpSkipped = true;
      })();
      try {
        await this.mcpInitPromise;
      } finally {
        this.mcpInitPromise = null;
      }
      return;
    }

    this.mcpInitPromise = this.performMCPInitializationOnce();
    try {
      await this.mcpInitPromise;
    } finally {
      // Clear the in-flight promise so a future call (e.g. after cleanup/reset)
      // can re-initialize if needed.
      this.mcpInitPromise = null;
    }
  }

  /**
   * Actual one-shot MCP initialization logic. Called at most once per
   * NeuroLink instance lifetime (unless cleanup() resets the flag).
   */
  private async performMCPInitializationOnce(): Promise<void> {
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

          const targetModel = route.model;
          if (targetModel) {
            // Check if the specific routed model is available
            const modelIsAvailable = validModels.some(
              (m) => m.name === targetModel,
            );
            if (!modelIsAvailable) {
              logger.debug("Orchestration provider validation failed", {
                taskType: classification.type,
                routedProvider: route.provider,
                routedModel: route.model,
                reason: `Ollama model '${targetModel}' not found`,
                orchestrationTime: `${Date.now() - startTime}ms`,
              });
              // Fall back to first available model instead of abandoning orchestration
              if (validModels.length > 0) {
                route.model = validModels[0].name;
              } else {
                return {}; // No models at all — preserve existing fallback behavior
              }
            }
          } else if (validModels.length === 0) {
            // No model specified and none available
            logger.debug("Orchestration provider validation failed", {
              taskType: classification.type,
              routedProvider: route.provider,
              routedModel: route.model,
              reason: "No Ollama models available",
              orchestrationTime: `${Date.now() - startTime}ms`,
            });
            return {}; // Return empty object to preserve existing fallback behavior
          } else {
            // No model specified but models are available — use the first one
            route.model = validModels[0].name;
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

          const targetModel = route.model;
          if (targetModel) {
            // Check if the specific routed model is available
            const modelIsAvailable = validModels.some(
              (m) => m.name === targetModel,
            );
            if (!modelIsAvailable) {
              logger.debug("Stream orchestration provider validation failed", {
                taskType: classification.type,
                routedProvider: route.provider,
                routedModel: route.model,
                reason: `Ollama model '${targetModel}' not found`,
                orchestrationTime: `${Date.now() - startTime}ms`,
              });
              // Fall back to first available model instead of abandoning orchestration
              if (validModels.length > 0) {
                route.model = validModels[0].name;
              } else {
                return {}; // No models at all — preserve existing fallback behavior
              }
            }
          } else if (validModels.length === 0) {
            // No model specified and none available
            logger.debug("Stream orchestration provider validation failed", {
              taskType: classification.type,
              routedProvider: route.provider,
              routedModel: route.model,
              reason: "No Ollama models available",
              orchestrationTime: `${Date.now() - startTime}ms`,
            });
            return {}; // Return empty object to preserve existing fallback behavior
          } else {
            // No model specified but models are available — use the first one
            route.model = validModels[0].name;
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
    if (typeof optionsOrPrompt === "string") {
      return optionsOrPrompt;
    }

    // Handle messages format (for workflow compatibility)
    const anyOptions = optionsOrPrompt as {
      messages?: Array<{ content: string | unknown }>;
    };
    if (anyOptions.messages && anyOptions.messages.length > 0) {
      const lastMessage = anyOptions.messages[anyOptions.messages.length - 1];
      return typeof lastMessage.content === "string"
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);
    }

    // Handle input.text format
    return optionsOrPrompt.input?.text || "";
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
    // Check if observability config enables telemetry
    if (this.observabilityConfig?.langfuse?.enabled) {
      return true;
    }
    // Check if OpenTelemetry was initialized (by this or external app)
    return isOpenTelemetryInitialized();
  }

  /**
   * Get comprehensive telemetry status including Langfuse, OTel, and exporter health
   */
  getTelemetryStatus(): {
    enabled: boolean;
    langfuse?: {
      enabled: boolean;
      baseUrl?: string;
      environment?: string;
    };
    openTelemetry?: {
      enabled: boolean;
      endpoint?: string;
      serviceName?: string;
    };
    exporters?: Array<{
      name: string;
      enabled: boolean;
      healthy: boolean;
      pendingSpans: number;
      lastExportTime?: string;
      latencyMs?: number;
      errors?: string[];
    }>;
  } {
    const langfuseConfig = this.observabilityConfig?.langfuse;
    const otelConfig = this.observabilityConfig?.openTelemetry;

    return {
      enabled: this.isTelemetryEnabled(),
      langfuse: langfuseConfig
        ? {
            enabled: langfuseConfig.enabled ?? false,
            baseUrl: langfuseConfig.baseUrl,
            environment: langfuseConfig.environment,
          }
        : undefined,
      openTelemetry: otelConfig
        ? {
            enabled: otelConfig.enabled ?? false,
            endpoint: otelConfig.endpoint,
            serviceName: otelConfig.serviceName,
          }
        : isOpenTelemetryInitialized() ||
            process.env.OTEL_EXPORTER_OTLP_ENDPOINT
          ? {
              enabled: isOpenTelemetryInitialized(),
              endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
              serviceName: process.env.OTEL_SERVICE_NAME,
            }
          : undefined,
      exporters: [],
    };
  }

  /**
   * Get aggregated observability metrics (latency, tokens, cost, success rate)
   */
  getMetrics(): MetricsSummary {
    return this.metricsAggregator.getMetrics();
  }

  /**
   * Get all recorded spans
   */
  getSpans(): SpanData[] {
    return this.metricsAggregator.getSpans();
  }

  /**
   * Get traces (spans grouped by traceId with parent-child hierarchy)
   */
  getTraces(): TraceView[] {
    return this.metricsAggregator.getTraces();
  }

  /**
   * Reset all collected metrics and spans
   */
  resetMetrics(): void {
    this.metricsAggregator.reset();
  }

  /**
   * Record a span for metrics tracking
   */
  recordMetricsSpan(span: SpanData): void {
    this.metricsAggregator.recordSpan(span);
  }

  /**
   * Record a memory operation span to both instance and global metrics aggregators.
   * This ensures memory spans are visible via sdk.getSpans() and getMetricsAggregator().getSpans().
   */
  private recordMemorySpan(
    operationName: string,
    attributes: Record<string, string | number>,
    durationMs: number,
    status: SpanStatus,
    statusMessage?: string,
  ): void {
    const traceCtx = this._metricsTraceContext;
    const span = SpanSerializer.createSpan(
      SpanType.MEMORY,
      operationName,
      attributes,
      traceCtx?.parentSpanId,
      traceCtx?.traceId,
    );
    span.durationMs = durationMs;
    const endedSpan = SpanSerializer.endSpan(span, status);
    if (statusMessage) {
      endedSpan.statusMessage = statusMessage;
    }
    this.metricsAggregator.recordSpan(endedSpan);
    try {
      getMetricsAggregator().recordSpan(endedSpan);
    } catch {
      /* ignore */
    }
  }

  /**
   * Public method to initialize Langfuse observability
   * This method can be called externally to ensure Langfuse is properly initialized
   */
  async initializeLangfuseObservability(): Promise<void> {
    try {
      const langfuseConfig = this.observabilityConfig?.langfuse;

      if (langfuseConfig?.enabled) {
        void initializeOpenTelemetry(langfuseConfig).catch((err) => {
          logger.error("[NeuroLink] OpenTelemetry initialization failed", {
            error: err instanceof Error ? err.message : String(err),
          });
        });

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

      // Shutdown TaskManager
      if (this._taskManager) {
        try {
          await withTimeout(
            this._taskManager.shutdown(),
            5000,
            new Error("TaskManager shutdown timed out"),
          );
        } catch (error) {
          logger.warn("[NeuroLink] TaskManager shutdown error:", error);
        } finally {
          this._taskManager = undefined;
        }
      }

      // Close conversation memory manager (release Redis connections, etc.)
      if (this.conversationMemory?.close) {
        try {
          await this.conversationMemory.close();
          logger.debug("[NeuroLink] Conversation memory shutdown completed");
        } catch (error) {
          logger.warn(
            "[NeuroLink] Conversation memory shutdown failed:",
            error,
          );
        }
      }

      logger.debug("[NeuroLink] Graceful shutdown completed");
      this.credentials = undefined;
    } catch (error) {
      logger.error("[NeuroLink] Shutdown failed:", error);
      throw error;
    }
  }

  /**
   * Initialize event listeners that feed span data to MetricsAggregator.
   * Listens to generation:end, stream:complete, and tool:end events.
   */
  private initializeMetricsListeners(): void {
    this.emitter.on("generation:end", ((...args: unknown[]) => {
      const data = args[0] as Record<string, unknown>;
      // A2 fix: When Pipeline A (AI SDK → @langfuse/otel) already creates a
      // GENERATION observation, skip the Pipeline B span to avoid duplicates.
      // Native providers (Bedrock, Ollama, Gemini 3) do NOT set this flag —
      // Pipeline B remains their only observation source.
      if (data.pipelineAHandled) {
        return;
      }
      try {
        const result = data.result as Record<string, unknown> | undefined;
        const usage = result?.usage as
          | { input?: number; output?: number; total?: number }
          | undefined;
        const analytics = result?.analytics as { cost?: number } | undefined;
        const provider =
          (data.provider as string) ||
          (result?.provider as string) ||
          "unknown";
        const model = (result?.model as string) || "unknown";
        const responseTime = (data.responseTime as number) || 0;
        const traceCtx = this._metricsTraceContext;

        let span = SpanSerializer.createGenerationSpan({
          provider,
          model,
          name: `gen_ai.${provider}.chat`,
          traceId: traceCtx?.traceId,
          input: data.prompt,
          temperature: data.temperature as number | undefined,
          maxTokens: data.maxTokens as number | undefined,
        });
        // Link to the OTel parent span; each Pipeline B span keeps its own
        // unique spanId to comply with OTel/W3C uniqueness requirements.
        if (traceCtx) {
          span.parentSpanId = traceCtx.parentSpanId;
        }
        // Mark failed generations with ERROR status so metrics count them correctly
        const spanStatus =
          data.success === false || data.error
            ? SpanStatus.ERROR
            : SpanStatus.OK;
        span = SpanSerializer.endSpan(
          span,
          spanStatus,
          data.error ? String(data.error) : undefined,
        );
        span.durationMs = responseTime;

        // G2 fix: Check finishReason and escalate to WARNING for partial failures
        const finishReason =
          (result?.finishReason as string | undefined) ??
          (data.finishReason as string | undefined);
        if (finishReason) {
          span.attributes["gen_ai.finish_reason"] = finishReason;
          if (finishReason === "content-filter" || finishReason === "length") {
            span = SpanSerializer.endSpan(
              span,
              SpanStatus.WARNING,
              `Generation stopped: finishReason=${finishReason}`,
            );
          }
        }

        // G6 fix: Record retry count on Pipeline B span
        if (data.retryCount !== undefined) {
          span.attributes["gen_ai.retry_count"] = data.retryCount as number;
        }

        if (usage) {
          span = SpanSerializer.enrichWithTokenUsage(span, {
            promptTokens: usage.input || 0,
            completionTokens: usage.output || 0,
            totalTokens:
              usage.total || (usage.input || 0) + (usage.output || 0),
          });
        }

        if (analytics?.cost && analytics.cost > 0) {
          span = SpanSerializer.enrichWithCost(span, {
            totalCost: analytics.cost,
          });
        } else if (usage && model !== "unknown") {
          // Fallback: compute cost from token usage + built-in pricing
          const tokenTracker = this.metricsAggregator.getTokenTracker();
          const pricing = tokenTracker.getModelPricing(model);
          if (pricing) {
            const inputCost =
              ((usage.input || 0) / 1_000_000) * pricing.inputPricePerMillion;
            const outputCost =
              ((usage.output || 0) / 1_000_000) * pricing.outputPricePerMillion;
            const totalCost = inputCost + outputCost;
            if (totalCost > 0) {
              span = SpanSerializer.enrichWithCost(span, {
                inputCost,
                outputCost,
                totalCost,
              });
            }
          }
        }

        // Record output (truncated for safety)
        const content = (result?.content as string) || (result?.text as string);
        if (content) {
          span = SpanSerializer.updateAttributes(span, {
            output:
              content.length > 5000
                ? content.substring(0, 5000) + "...[truncated]"
                : content,
          });
        }

        this.metricsAggregator.recordSpan(span);
        getMetricsAggregator().recordSpan(span);
      } catch {
        // Non-blocking
      }
    }) as (...args: unknown[]) => void);

    this.emitter.on("stream:complete", ((...args: unknown[]) => {
      const data = args[0] as Record<string, unknown>;
      try {
        const metadata = data.metadata as Record<string, unknown> | undefined;
        const durationMs = (metadata?.durationMs as number) || 0;
        const chunkCount = (metadata?.chunkCount as number) || 0;
        const totalLength = (metadata?.totalLength as number) || 0;
        const provider = (data.provider as string) || "unknown";
        const model = (data.model as string) || "unknown";
        const traceCtx = this._metricsTraceContext;

        let span = SpanSerializer.createGenerationSpan({
          provider,
          model,
          name: `gen_ai.${provider}.stream`,
          traceId: traceCtx?.traceId,
        });
        // Link to the OTel parent span; keep unique spanId per W3C spec.
        if (traceCtx) {
          span.parentSpanId = traceCtx.parentSpanId;
        }
        span = SpanSerializer.endSpan(span, SpanStatus.OK);
        span.durationMs = durationMs;
        span.attributes["stream.chunk_count"] = chunkCount;
        span.attributes["stream.content_length"] = totalLength;

        // S3 fix: Record finishReason on Pipeline B stream span
        const streamFinishReason =
          (metadata?.finishReason as string | undefined) ??
          (data.finishReason as string | undefined);
        if (streamFinishReason) {
          span.attributes["gen_ai.finish_reason"] = streamFinishReason;
          if (
            streamFinishReason === "content-filter" ||
            streamFinishReason === "length"
          ) {
            span = SpanSerializer.endSpan(
              span,
              SpanStatus.WARNING,
              `Stream stopped: finishReason=${streamFinishReason}`,
            );
          }
        }

        // Record stream input prompt
        if (data.prompt) {
          const promptStr = String(data.prompt);
          span = SpanSerializer.updateAttributes(span, {
            input:
              promptStr.length > 5000
                ? promptStr.substring(0, 5000) + "...[truncated]"
                : promptStr,
          });
        }

        // Record streamed output (truncated for safety)
        const streamContent = data.content as string;
        if (streamContent) {
          span = SpanSerializer.updateAttributes(span, {
            output:
              streamContent.length > 5000
                ? streamContent.substring(0, 5000) + "...[truncated]"
                : streamContent,
          });
        }

        // Enrich stream span with token usage if available
        const usage = metadata?.usage as
          | { input?: number; output?: number; total?: number }
          | undefined;
        if (usage) {
          span = SpanSerializer.enrichWithTokenUsage(span, {
            promptTokens: usage.input || 0,
            completionTokens: usage.output || 0,
            totalTokens:
              usage.total || (usage.input || 0) + (usage.output || 0),
          });

          // Compute cost from token usage
          if (model !== "unknown") {
            const tokenTracker = this.metricsAggregator.getTokenTracker();
            const pricing = tokenTracker.getModelPricing(model);
            if (pricing) {
              const inputCost =
                ((usage.input || 0) / 1_000_000) * pricing.inputPricePerMillion;
              const outputCost =
                ((usage.output || 0) / 1_000_000) *
                pricing.outputPricePerMillion;
              const totalCost = inputCost + outputCost;
              if (totalCost > 0) {
                span = SpanSerializer.enrichWithCost(span, {
                  inputCost,
                  outputCost,
                  totalCost,
                });
              }
            }
          }
        }

        this.metricsAggregator.recordSpan(span);
        getMetricsAggregator().recordSpan(span);
      } catch {
        // Non-blocking
      }
    }) as (...args: unknown[]) => void);

    this.emitter.on("tool:end", ((...args: unknown[]) => {
      const data = args[0] as Record<string, unknown>;
      try {
        // Handle both event formats: {toolName} (from emitToolEnd) and {tool} (from executeToolInternal)
        const toolName =
          (data.toolName as string) || (data.tool as string) || "unknown";
        const responseTime =
          (data.responseTime as number) || (data.duration as number) || 0;
        // success is explicit in one format; infer from error presence in the other
        const success =
          data.success !== undefined ? (data.success as boolean) : !data.error;
        const traceCtx = this._metricsTraceContext;

        let span = SpanSerializer.createSpan(
          SpanType.TOOL_CALL,
          `tool.${toolName}`,
          {
            "tool.name": toolName,
            "tool.success": success,
          },
          traceCtx?.parentSpanId,
          traceCtx?.traceId,
        );
        span = SpanSerializer.endSpan(
          span,
          success ? SpanStatus.OK : SpanStatus.ERROR,
        );
        span.durationMs = responseTime;

        if (!success) {
          if (data.error) {
            span.statusMessage = String(data.error);
          } else if (data.result) {
            span.statusMessage = extractMcpErrorText(data.result);
          }
        }

        if (data.result) {
          try {
            span.attributes["tool.result"] = JSON.stringify(
              data.result,
            ).substring(0, 500);
          } catch {
            // Non-blocking
          }
        }

        this.metricsAggregator.recordSpan(span);
        getMetricsAggregator().recordSpan(span);
      } catch {
        // Non-blocking
      }
    }) as (...args: unknown[]) => void);

    this.emitter.on("stream:error", ((...args: unknown[]) => {
      const data = args[0] as Record<string, unknown>;
      try {
        const metadata = data.metadata as Record<string, unknown> | undefined;
        const durationMs = (metadata?.durationMs as number) || 0;
        const chunkCount = (metadata?.chunkCount as number) || 0;
        const errorName = (metadata?.errorName as string) || "UnknownError";
        const errorMessage = (data.content as string) || "Stream error";
        const provider = (data.provider as string) || "unknown";
        const model = (data.model as string) || "unknown";
        const traceCtx = this._metricsTraceContext;

        let span = SpanSerializer.createGenerationSpan({
          provider,
          model,
          name: `gen_ai.${provider}.stream.error`,
          traceId: traceCtx?.traceId,
        });
        // Link to the OTel parent span; keep unique spanId per W3C spec.
        if (traceCtx) {
          span.parentSpanId = traceCtx.parentSpanId;
        }
        span = SpanSerializer.endSpan(span, SpanStatus.ERROR);
        span.durationMs = durationMs;
        span.statusMessage = `${errorName}: ${errorMessage}`;
        span.attributes["stream.chunk_count"] = chunkCount;

        // S7 fix: Distinguish aborts from errors
        const isAbort =
          errorName === "AbortError" ||
          errorMessage.toLowerCase().includes("aborted") ||
          errorMessage.toLowerCase().includes("abort");
        span.attributes["error.type"] = isAbort ? "abort" : errorName;
        if (isAbort) {
          span.attributes["stream.aborted"] = true;
        }

        this.metricsAggregator.recordSpan(span);
        getMetricsAggregator().recordSpan(span);
      } catch {
        // Non-blocking
      }
    }) as (...args: unknown[]) => void);
  }

  /**
   * Generate AI response with comprehensive feature support.
   *
   * Primary method for AI generation with support for all NeuroLink features:
   * - Multi-provider support (14+ providers)
   * - MCP tool integration
   * - Structured JSON output with Zod schemas
   * - Conversation memory (Redis or in-memory)
   * - HITL security workflows
   * - Middleware execution
   * - Multimodal inputs (images, PDFs, CSV)
   *
   * @category Generation
   *
   * @param optionsOrPrompt - Generation options or simple text prompt
   * @param optionsOrPrompt.input - Input text and optional files
   * @param optionsOrPrompt.provider - AI provider name (e.g., 'vertex', 'openai', 'anthropic')
   * @param optionsOrPrompt.model - Model name to use
   * @param optionsOrPrompt.tools - MCP tools to enable for this generation
   * @param optionsOrPrompt.schema - Zod schema for structured output validation
   * @param optionsOrPrompt.temperature - Sampling temperature (0-2, default: 1.0)
   * @param optionsOrPrompt.maxTokens - Maximum tokens to generate
   * @param optionsOrPrompt.thinkingConfig - Extended thinking configuration (thinkingLevel: 'minimal'|'low'|'medium'|'high')
   * @param optionsOrPrompt.context - Context with conversationId and userId for memory
   * @returns Promise resolving to generation result with content and metadata
   *
   * @example Basic text generation
   * ```typescript
   * const result = await neurolink.generate({
   *   input: { text: 'Explain quantum computing' }
   * });
   * console.log(result.content);
   * ```
   *
   * @example With specific provider
   * ```typescript
   * const result = await neurolink.generate({
   *   input: { text: 'Write a poem' },
   *   provider: 'anthropic',
   *   model: 'claude-3-opus'
   * });
   * ```
   *
   * @example With MCP tools
   * ```typescript
   * const result = await neurolink.generate({
   *   input: { text: 'Read README.md and summarize it' },
   *   tools: ['readFile']
   * });
   * ```
   *
   * @example With structured output
   * ```typescript
   * import { z } from 'zod';
   *
   * const schema = z.object({
   *   name: z.string(),
   *   age: z.number(),
   *   city: z.string()
   * });
   *
   * const result = await neurolink.generate({
   *   input: { text: 'Extract person info: John is 30 years old from NYC' },
   *   schema: schema
   * });
   * // result.structuredData is type-safe!
   * ```
   *
   * @example With conversation memory
   * ```typescript
   * const result = await neurolink.generate({
   *   input: { text: 'What did we discuss earlier?' },
   *   context: {
   *     conversationId: 'conv-123',
   *     userId: 'user-456'
   *   }
   * });
   * ```
   *
   * @example With multimodal input
   * ```typescript
   * const result = await neurolink.generate({
   *   input: {
   *     text: 'Describe this image',
   *     images: ['/path/to/image.jpg']
   *   },
   *   provider: 'vertex'
   * });
   * ```
   *
   * @throws {Error} When input text is missing or invalid
   * @throws {Error} When all providers fail to generate content
   * @throws {Error} When structured output validation fails
   * @throws {Error} When HITL approval is denied
   *
   * @see {@link GenerateOptions} for all available options
   * @see {@link GenerateResult} for result structure
   * @see {@link stream} for streaming generation
   * @since 1.0.0
   */
  async generate(
    optionsOrPrompt: GenerateOptions | string,
  ): Promise<GenerateResult> {
    return tracers.sdk.startActiveSpan(
      "neurolink.generate",
      { kind: SpanKind.INTERNAL },
      (generateSpan) =>
        this.executeGenerateWithMetricsContext(optionsOrPrompt, generateSpan),
    );
  }

  private async executeGenerateWithMetricsContext(
    optionsOrPrompt: GenerateOptions | string,
    generateSpan: ReturnType<typeof tracers.sdk.startSpan>,
  ): Promise<GenerateResult> {
    return metricsTraceContextStorage.run(
      this.createMetricsTraceContext(),
      () => this.executeGenerateRequest(optionsOrPrompt, generateSpan),
    );
  }

  private async executeGenerateRequest(
    optionsOrPrompt: GenerateOptions | string,
    generateSpan: ReturnType<typeof tracers.sdk.startSpan>,
  ): Promise<GenerateResult> {
    try {
      const { options, originalPrompt } = await this.prepareGenerateRequest(
        optionsOrPrompt,
        generateSpan,
      );
      const earlyResult = await this.maybeHandleEarlyGenerateResult(
        options,
        generateSpan,
      );
      if (earlyResult) {
        generateSpan.setStatus({ code: SpanStatusCode.OK });
        return earlyResult;
      }

      const result = await this.setLangfuseContextFromOptions(options, () =>
        this.runStandardGenerateRequest(options, originalPrompt, generateSpan),
      );
      generateSpan.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      generateSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });

      // G7 fix: Distinguish context overflow errors with dedicated attributes
      if (error instanceof ContextBudgetExceededError) {
        generateSpan.setAttribute("neurolink.error.type", "context_overflow");
        generateSpan.setAttribute(
          "neurolink.context.estimated_tokens",
          error.estimatedTokens,
        );
        generateSpan.setAttribute(
          "neurolink.context.available_tokens",
          error.availableTokens,
        );
      }

      this.emitGenerateErrorEvent(optionsOrPrompt, error);
      throw error;
    } finally {
      this._disableToolCacheForCurrentRequest = false;
      generateSpan.end();
    }
  }

  private async prepareGenerateRequest(
    optionsOrPrompt: GenerateOptions | string,
    generateSpan: ReturnType<typeof tracers.sdk.startSpan>,
  ): Promise<{
    options: GenerateOptions;
    originalPrompt: string | undefined;
  }> {
    const originalPrompt = this._extractOriginalPrompt(optionsOrPrompt);
    const options: GenerateOptions =
      typeof optionsOrPrompt === "string"
        ? { input: { text: optionsOrPrompt } }
        : { ...optionsOrPrompt };

    options.model = resolveModel(options.model, this.modelAliasConfig);
    this._disableToolCacheForCurrentRequest = !!options.disableToolCache;

    generateSpan.setAttribute(
      "neurolink.provider",
      (options.provider as string) || "default",
    );
    generateSpan.setAttribute("neurolink.model", options.model || "default");
    generateSpan.setAttribute(
      "neurolink.input_length",
      typeof optionsOrPrompt === "string"
        ? optionsOrPrompt.length
        : options.input?.text?.length || 0,
    );
    generateSpan.setAttribute(
      "neurolink.has_tools",
      !!(options.tools && Object.keys(options.tools).length > 0),
    );

    this.assertInputText(
      options.input?.text,
      "Input text is required and must be a non-empty string",
    );
    this.enforceSessionBudget(options.maxBudgetUsd);
    this.applyGenerateLifecycleMiddleware(options);
    await this.applyAuthenticatedRequestContext(options);

    return { options, originalPrompt };
  }

  private async maybeHandleEarlyGenerateResult(
    options: GenerateOptions,
    generateSpan: ReturnType<typeof tracers.sdk.startSpan>,
  ): Promise<GenerateResult | null> {
    if (options.workflow || options.workflowConfig) {
      return this.generateWithWorkflow(options);
    }
    if (options.output?.mode !== "ppt") {
      return null;
    }

    const pptResult = await this.generateWithPPT(options);
    generateSpan.setAttribute(
      "neurolink.output_length",
      pptResult.content?.length ?? 0,
    );
    if (pptResult.analytics) {
      generateSpan.setAttribute(
        "neurolink.tokens.input",
        pptResult.analytics.tokenUsage?.input ?? 0,
      );
      generateSpan.setAttribute(
        "neurolink.tokens.output",
        pptResult.analytics.tokenUsage?.output ?? 0,
      );
      generateSpan.setAttribute(
        "neurolink.cost",
        pptResult.analytics.cost ?? 0,
      );
    }
    generateSpan.setStatus({ code: SpanStatusCode.OK });
    return pptResult;
  }

  private async runStandardGenerateRequest(
    options: GenerateOptions,
    originalPrompt: string | undefined,
    generateSpan: ReturnType<typeof tracers.sdk.startSpan>,
  ): Promise<GenerateResult> {
    const startTime = Date.now();

    await this.maybeApplyGenerateOrchestration(options);
    this.emitter.emit("generation:start", {
      provider: options.provider || "auto",
      timestamp: startTime,
    });
    this.emitter.emit("response:start");
    this.emitter.emit(
      "message",
      `Starting ${options.provider || "auto"} text generation...`,
    );

    const factoryResult = processFactoryOptions(options);
    if (factoryResult.hasFactoryConfig && options.factoryConfig) {
      const validation = validateFactoryConfig(options.factoryConfig);
      if (!validation.isValid) {
        logger.warn("Invalid factory configuration detected", {
          errors: validation.errors,
        });
      }
    }

    await this.prepareGenerateAugmentations(options);
    const textOptions = await this.buildGenerateTextOptions(
      options,
      originalPrompt,
      factoryResult,
    );
    const textResult = await this.generateTextInternal(textOptions);

    return this.finalizeGenerateRequestResult({
      generateSpan,
      options,
      textOptions,
      textResult,
      factoryResult,
      originalPrompt,
      startTime,
    });
  }

  private async maybeApplyGenerateOrchestration(
    options: GenerateOptions,
  ): Promise<void> {
    if (!this.enableOrchestration || options.provider || options.model) {
      return;
    }

    try {
      const orchestratedOptions = await this.applyOrchestration(options);
      logger.debug("Orchestration applied", {
        originalProvider: options.provider || "auto",
        orchestratedProvider: orchestratedOptions.provider,
        orchestratedModel: orchestratedOptions.model,
        prompt: options.input.text.substring(0, 100),
      });
      Object.assign(options, orchestratedOptions);
      if (orchestratedOptions.model) {
        options.model = resolveModel(options.model, this.modelAliasConfig);
      }
    } catch (error) {
      logger.warn("Orchestration failed, continuing with original options", {
        error: error instanceof Error ? error.message : String(error),
        originalProvider: options.provider || "auto",
      });
    }
  }

  private async prepareGenerateAugmentations(
    options: GenerateOptions,
  ): Promise<void> {
    if (options.rag?.files?.length) {
      try {
        const { prepareRAGTool } = await import("./rag/ragIntegration.js");
        const ragResult = await prepareRAGTool(
          options.rag,
          options.provider as string | undefined,
        );

        if (!options.tools) {
          options.tools = {};
        }
        (options.tools as Record<string, unknown>)[ragResult.toolName] =
          ragResult.tool;
        options.systemPrompt =
          (options.systemPrompt || "") +
          [
            `\n\nIMPORTANT: You have a tool called "${ragResult.toolName}" that searches through`,
            `${ragResult.filesLoaded} loaded document(s) containing ${ragResult.chunksIndexed} indexed chunks.`,
            `ALWAYS use the "${ragResult.toolName}" tool FIRST to answer the user's question before using any other tools.`,
            `This tool searches your local knowledge base of pre-loaded documents and is the primary source of truth.`,
            `Do NOT use websearchGrounding or any web search tools when the answer can be found in the loaded documents.`,
          ].join(" ");

        logger.info("[RAG] Tool injected into generate()", {
          toolName: ragResult.toolName,
          filesLoaded: ragResult.filesLoaded,
          chunksIndexed: ragResult.chunksIndexed,
        });
      } catch (error) {
        logger.warn(
          "[RAG] Failed to prepare RAG tool, continuing without RAG",
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }

    if (
      !this.shouldReadMemory(options.memory, options.context?.userId) ||
      !options.context?.userId
    ) {
      return;
    }

    try {
      options.input.text = await this.retrieveMemory(
        options.input.text,
        options.context.userId as string,
        options.memory?.additionalUsers,
      );
      logger.debug("Memory retrieval successful (generate)");
    } catch (error) {
      logger.warn("Memory retrieval failed (generate):", error);
    }
  }

  private async buildGenerateTextOptions(
    options: GenerateOptions,
    originalPrompt: string | undefined,
    factoryResult: ReturnType<typeof processFactoryOptions>,
  ): Promise<TextGenerationOptions> {
    const baseOptions: TextGenerationOptions = {
      prompt: options.input.text,
      provider: options.provider as AIProviderName,
      model: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      systemPrompt: options.systemPrompt,
      schema: options.schema,
      output: options.output,
      tools: options.tools,
      disableTools: options.disableTools,
      toolFilter: options.toolFilter,
      excludeTools: options.excludeTools,
      maxSteps: options.maxSteps,
      toolChoice: options.toolChoice,
      prepareStep: options.prepareStep,
      enableAnalytics: options.enableAnalytics,
      enableEvaluation: options.enableEvaluation,
      context: options.context as Record<string, JsonValue> | undefined,
      evaluationDomain: options.evaluationDomain,
      toolUsageContext: options.toolUsageContext,
      input: options.input,
      region: options.region,
      tts: options.tts,
      fileRegistry: this.fileRegistry,
      timeout: options.timeout,
      abortSignal: options.abortSignal,
      skipToolPromptInjection: options.skipToolPromptInjection,
      middleware: options.middleware,
      conversationMessages: options.conversationMessages,
      credentials: options.credentials,
    };

    const extraContext = options as Record<string, unknown>;
    if (extraContext.sessionId || extraContext.userId) {
      baseOptions.context = {
        ...baseOptions.context,
        ...(extraContext.sessionId && !baseOptions.context?.sessionId
          ? { sessionId: extraContext.sessionId as JsonValue }
          : {}),
        ...(extraContext.userId && !baseOptions.context?.userId
          ? { userId: extraContext.userId as JsonValue }
          : {}),
      };
    }

    const textOptions = enhanceTextGenerationOptions(
      baseOptions,
      factoryResult,
    );
    if (this.conversationMemory) {
      textOptions.conversationMemoryConfig = this.conversationMemory.config;
      textOptions.originalPrompt = originalPrompt;
    }

    const { toolResults, enhancedPrompt } = await this.detectAndExecuteTools(
      textOptions.prompt || options.input.text,
      factoryResult.domainType,
    );
    if (enhancedPrompt !== textOptions.prompt) {
      textOptions.prompt = enhancedPrompt;
      logger.debug("Enhanced prompt with tool results", {
        originalLength: options.input.text.length,
        enhancedLength: enhancedPrompt.length,
        toolResults: toolResults.length,
      });
    }

    return textOptions;
  }

  private finalizeGenerateRequestResult(params: {
    generateSpan: ReturnType<typeof tracers.sdk.startSpan>;
    options: GenerateOptions;
    textOptions: TextGenerationOptions;
    textResult: TextGenerationResult;
    factoryResult: ReturnType<typeof processFactoryOptions>;
    originalPrompt: string | undefined;
    startTime: number;
  }): GenerateResult {
    const {
      generateSpan,
      options,
      textOptions,
      textResult,
      factoryResult,
      originalPrompt,
      startTime,
    } = params;

    this.emitter.emit("generation:end", {
      provider: textResult.provider,
      responseTime: Date.now() - startTime,
      toolsUsed: textResult.toolsUsed,
      timestamp: Date.now(),
      result: textResult,
      prompt:
        options.input?.text || (options as Record<string, unknown>).prompt,
      temperature: textOptions.temperature,
      maxTokens: textOptions.maxTokens,
      // A2 fix: Signal that Pipeline A (AI SDK → @langfuse/otel) already
      // creates a GENERATION observation for this call. The generation:end
      // listener should skip creating a duplicate Pipeline B span.
      pipelineAHandled: true,
    });
    this.emitter.emit("response:end", textResult.content || "");
    this.emitter.emit(
      "message",
      `Generation completed in ${Date.now() - startTime}ms`,
    );

    const generateResult: GenerateResult = {
      content: textResult.content,
      finishReason: textResult.finishReason,
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
      imageOutput: textResult.imageOutput,
      evaluation: textResult.evaluation
        ? {
            ...textResult.evaluation,
            isOffTopic: textResult.evaluation.isOffTopic ?? false,
            alertSeverity:
              textResult.evaluation.alertSeverity ?? ("none" as const),
            reasoning:
              textResult.evaluation.reasoning ?? "No evaluation provided",
            evaluationModel: textResult.evaluation.evaluationModel ?? "unknown",
            evaluationTime: textResult.evaluation.evaluationTime ?? Date.now(),
            evaluationDomain:
              textResult.evaluation.evaluationDomain ??
              textOptions.evaluationDomain ??
              factoryResult.domainType,
          }
        : undefined,
      audio: textResult.audio,
      video: textResult.video,
      ppt: textResult.ppt,
      ...(textResult.retries && { retries: textResult.retries }),
    };

    if (generateResult.analytics?.cost && generateResult.analytics.cost > 0) {
      this._sessionCostUsd += generateResult.analytics.cost;
    }
    this.scheduleGenerateMemoryStorage(options, originalPrompt, generateResult);

    generateSpan.setAttribute(
      "neurolink.output_length",
      generateResult.content?.length || 0,
    );
    generateSpan.setAttribute(
      "neurolink.tokens.input",
      generateResult.usage?.input || 0,
    );
    generateSpan.setAttribute(
      "neurolink.tokens.output",
      generateResult.usage?.output || 0,
    );
    generateSpan.setAttribute(
      "neurolink.finish_reason",
      generateResult.finishReason || "unknown",
    );

    // G3 fix: Record step count and whether max steps was reached
    // Read steps from the raw provider result (textResult), not the flattened DTO
    const stepCount = (textResult as { steps?: unknown[] })?.steps?.length ?? 1;
    const maxSteps = options.maxSteps ?? 200; // DEFAULT_MAX_STEPS
    generateSpan.setAttribute("neurolink.step_count", stepCount);
    generateSpan.setAttribute(
      "neurolink.max_steps_reached",
      stepCount >= maxSteps,
    );

    generateSpan.setAttribute(
      "neurolink.result_provider",
      generateResult.provider || "unknown",
    );
    generateSpan.setAttribute(
      "neurolink.result_model",
      generateResult.model || "unknown",
    );
    generateSpan.setAttribute(
      "generate.retry_count",
      generateResult.retries?.count || 0,
    );
    generateSpan.setStatus({ code: SpanStatusCode.OK });

    return generateResult;
  }

  private emitGenerateErrorEvent(
    optionsOrPrompt: GenerateOptions | string,
    error: unknown,
  ): void {
    const errProvider =
      typeof optionsOrPrompt === "object"
        ? optionsOrPrompt.provider || "unknown"
        : "unknown";
    const errModel =
      typeof optionsOrPrompt === "object"
        ? optionsOrPrompt.model || "unknown"
        : "unknown";

    try {
      this.emitter.emit("generation:end", {
        provider: errProvider,
        model: errModel,
        responseTime: 0,
        error: error instanceof Error ? error.message : String(error),
        success: false,
      });
    } catch (emitError: unknown) {
      void emitError;
    }
  }

  /**
   * Schedule non-blocking memory storage after generate completes.
   */
  private scheduleGenerateMemoryStorage(
    options: GenerateOptions,
    originalPrompt: string | undefined,
    generateResult: GenerateResult,
  ): void {
    // Memory storage
    if (
      this.shouldWriteMemory(
        options.memory,
        options.context?.userId,
        generateResult.content,
      ) &&
      options.context?.userId
    ) {
      this.storeMemoryInBackground(
        originalPrompt ?? "",
        generateResult.content.trim(),
        options.context.userId as string,
        options.memory?.additionalUsers,
      );
    }
  }

  /**
   * Handle PPT generation mode
   */
  private async generateWithPPT(
    options: GenerateOptions,
  ): Promise<GenerateResult> {
    const startTime = Date.now();

    // Dynamic import to avoid circular deps (same pattern as RAG)
    const { generatePresentation } =
      await import("./features/ppt/presentationOrchestrator.js");
    const { extractPPTContext, getEffectivePPTProvider } =
      await import("./features/ppt/utils.js");

    // Get provider instance for content planning
    const requestedProvider = (options.provider || "vertex") as AIProviderName;
    const provider = await AIProviderFactory.createProvider(
      requestedProvider,
      options.model,
      true,
      this as unknown as Record<string, unknown>,
      undefined,
      this.resolveCredentials(options.credentials),
    );

    // Resolve effective PPT provider (may auto-select if current is not PPT-compatible)
    const effectiveProvider = await getEffectivePPTProvider(
      provider,
      requestedProvider as string,
      options.model || "default",
      this,
    );

    // Extract PPT context from options
    const pptContext = extractPPTContext(options);

    // Generate the presentation
    const pptResult = await generatePresentation({
      context: pptContext,
      provider:
        effectiveProvider.provider as import("./types/index.js").AIProvider,
      providerName: effectiveProvider.providerName,
      modelName: effectiveProvider.modelName,
      neurolink: this,
    });

    // Map PPT result to GenerateResult
    return {
      content: `Presentation generated: ${pptResult.filePath} (${pptResult.totalSlides} slides)`,
      finishReason: "stop",
      provider: pptResult.provider || (requestedProvider as string),
      model: pptResult.model || options.model || "default",
      usage: undefined,
      responseTime: Date.now() - startTime,
      ppt: pptResult,
    };
  }

  /**
   * Generate with workflow engine integration
   * Returns both original and processed responses for AB testing
   */
  private async generateWithWorkflow(
    options: GenerateOptions,
  ): Promise<GenerateResult> {
    const workflowStartTime = Date.now();

    logger.debug("[NeuroLink] Executing workflow generation", {
      workflowId: options.workflow,
      hasInlineConfig: !!options.workflowConfig,
      prompt: options.input.text.substring(0, 100),
      startTime: workflowStartTime,
    });

    // Determine workflow configuration
    let workflowConfig: WorkflowConfig | undefined;

    if (options.workflowConfig) {
      // Use inline config
      workflowConfig = options.workflowConfig;
    } else if (options.workflow) {
      // Look up predefined workflow
      workflowConfig = getWorkflow(options.workflow);
      if (!workflowConfig) {
        throw new Error(`Workflow '${options.workflow}' not found in registry`);
      }
    } else {
      throw new Error("Either workflow or workflowConfig must be provided");
    }

    // Execute workflow
    const workflowResult = await runWorkflow(workflowConfig, {
      prompt: options.input.text,
      conversationHistory:
        options.conversationMessages
          ?.filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content:
              typeof m.content === "string"
                ? m.content
                : JSON.stringify(m.content),
          })) ??
        (options.conversationHistory as
          | Array<{ role: "user" | "assistant"; content: string }>
          | undefined),
      timeout: options.timeout as number | undefined,
      verbose: false,
      metadata: options.context as Record<string, JsonValue> | undefined,
    });

    // Build GenerateResult with workflow data
    const generateResult: GenerateResult = {
      // Primary output (backward compatible) - use the original best response
      content: workflowResult.content,

      // Provider info from selected response
      provider:
        workflowResult.selectedResponse?.provider ||
        workflowConfig.models[0]?.provider,
      model:
        workflowResult.selectedResponse?.model ||
        workflowConfig.models[0]?.model,

      // Basic usage info
      usage: workflowResult.usage
        ? {
            input: workflowResult.usage.totalInputTokens,
            output: workflowResult.usage.totalOutputTokens,
            total: workflowResult.usage.totalTokens,
          }
        : undefined,

      // Performance
      responseTime: workflowResult.totalTime,

      // Workflow-specific data
      workflow: {
        originalResponse:
          workflowResult.originalContent || workflowResult.content, // Original unmodified best response
        processedResponse: workflowResult.content, // After conditioning (with metadata)
        ensembleResponses: workflowResult.ensembleResponses.map((r) => ({
          provider: r.provider,
          model: r.model,
          content: r.content,
          responseTime: r.responseTime,
          status: r.status,
          error: r.error,
        })),
        judgeScores: workflowResult.judgeScores
          ? {
              scores: workflowResult.judgeScores.scores,
              reasoning: workflowResult.reasoning,
              selectedModel: `${workflowResult.selectedResponse?.provider}-${workflowResult.selectedResponse?.model}`,
            }
          : undefined,
        selectedModel: `${workflowResult.selectedResponse?.provider}-${workflowResult.selectedResponse?.model}`,
        metrics: {
          totalTime: workflowResult.totalTime,
          ensembleTime: workflowResult.ensembleTime,
          judgeTime: workflowResult.judgeTime,
          conditioningTime: workflowResult.conditioningTime,
        },
        workflowId: workflowResult.workflow,
        workflowName: workflowResult.workflowName,
      },
    };

    logger.debug("[NeuroLink] Workflow generation complete", {
      workflowId: workflowResult.workflow,
      selectedModel: generateResult.workflow?.selectedModel,
      score: workflowResult.score,
      totalTime: workflowResult.totalTime,
    });

    return generateResult;
  }

  /**
   * Stream with workflow engine integration
   * Progressive streaming: yields preliminary response (first model) then final synthesis
   */
  private async streamWithWorkflow(
    options: StreamOptions,
    startTime: number,
  ): Promise<StreamResult> {
    logger.debug("[NeuroLink] Executing workflow streaming (progressive)", {
      workflowId: options.workflow,
      hasInlineConfig: !!options.workflowConfig,
      prompt: options.input.text.substring(0, 100),
    });

    // Determine workflow configuration
    let workflowConfig: WorkflowConfig | undefined;

    if (options.workflowConfig) {
      workflowConfig = options.workflowConfig;
    } else if (options.workflow) {
      workflowConfig = getWorkflow(options.workflow);
      if (!workflowConfig) {
        throw new Error(`Workflow '${options.workflow}' not found in registry`);
      }
    } else {
      throw new Error("Either workflow or workflowConfig must be provided");
    }

    // Import streaming workflow runner
    const { runWorkflowWithStreaming } =
      await import("./workflow/core/workflowRunner.js");

    // Execute workflow with progressive streaming
    const workflowStream = runWorkflowWithStreaming(workflowConfig, {
      prompt: options.input.text,
      conversationHistory:
        options.conversationMessages
          ?.filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content:
              typeof m.content === "string"
                ? m.content
                : JSON.stringify(m.content),
          })) ??
        (options.conversationHistory as
          | Array<{ role: "user" | "assistant"; content: string }>
          | undefined),
      timeout: options.timeout as number | undefined,
      verbose: false,
      metadata: options.context as Record<string, JsonValue> | undefined,
      streaming: true,
    });

    // Store final result for metadata
    let finalResult: Partial<import("./types/index.js").WorkflowResult> | null =
      null;
    let preliminaryTime = 0;

    // Create a generator that yields progressive chunks
    const stream = (async function* (): AsyncGenerator<
      { content: string; type: "preliminary" | "final" },
      void,
      undefined
    > {
      for await (const chunk of workflowStream) {
        if (chunk.type === "preliminary") {
          preliminaryTime = Date.now() - startTime;
          logger.debug("[NeuroLink] Streaming preliminary response", {
            responseTime: preliminaryTime,
            contentLength: chunk.content.length,
          });
          yield {
            content: chunk.content,
            type: "preliminary" as const,
          };
        } else if (chunk.type === "final") {
          finalResult = chunk.partialResult ?? null;
          const finalTime = Date.now() - startTime;
          logger.debug("[NeuroLink] Streaming final synthesis", {
            responseTime: finalTime,
            contentLength: chunk.content.length,
          });
          yield {
            content: chunk.content,
            type: "final" as const,
          };
        }
      }
    })();

    const streamResult: StreamResult = {
      stream,

      // Provider info (will be from final result)
      provider: workflowConfig.models[0]?.provider,
      model: workflowConfig.models[0]?.model,

      // Metadata
      metadata: {
        streamId: `workflow-${workflowConfig.id}-${Date.now()}`,
        startTime,
        responseTime: 0, // Will be updated after stream completes
      },

      // Note: Workflow data will be populated after stream completes
      // For now, return placeholder that will be updated via stream metadata
    };

    // Wrap stream to capture final result and populate metadata
    const originalStream = streamResult.stream;
    streamResult.stream = (async function* () {
      for await (const chunk of originalStream) {
        yield chunk;
      }

      // After stream completes, update result with final workflow data
      if (finalResult) {
        const result = finalResult as Partial<
          import("./types/index.js").WorkflowResult
        >;
        const responseTime = Date.now() - startTime;

        // Update usage if available
        if (result.usage) {
          streamResult.usage = {
            input: result.usage.totalInputTokens,
            output: result.usage.totalOutputTokens,
            total: result.usage.totalTokens,
          };
        }

        // Update metadata
        streamResult.metadata = {
          ...streamResult.metadata,
          totalChunks: 2, // Preliminary + final
          responseTime,
          preliminaryTime,
        };

        // Build workflow data with proper type safety
        const ensembleResponses =
          result.ensembleResponses?.map((r) => ({
            provider: r.provider,
            model: r.model,
            content: r.content,
            responseTime: r.responseTime,
            status: r.status,
            error: r.error,
          })) ?? [];

        const judgeScores = result.judgeScores
          ? {
              scores: result.judgeScores.scores,
              reasoning: result.reasoning ?? "",
              selectedModel: result.selectedResponse
                ? `${result.selectedResponse.provider}-${result.selectedResponse.model}`
                : "unknown",
            }
          : undefined;

        streamResult.workflow = {
          originalResponse: result.originalContent ?? result.content ?? "",
          processedResponse: result.content ?? "",
          ensembleResponses,
          judgeScores,
          selectedModel: result.selectedResponse
            ? `${result.selectedResponse.provider}-${result.selectedResponse.model}`
            : "unknown",
          metrics: {
            totalTime: result.totalTime ?? responseTime,
            ensembleTime: result.ensembleTime ?? 0,
            judgeTime: result.judgeTime,
            conditioningTime: result.conditioningTime,
          },
          workflowId: result.workflow ?? workflowConfig.id,
          workflowName: result.workflowName ?? workflowConfig.name,
        };
      }
    })();

    logger.debug("[NeuroLink] Workflow streaming initialized", {
      workflowId: workflowConfig.id,
    });

    return streamResult;
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

    // NL-004: Resolve model aliases/deprecations before processing
    options.model = resolveModel(options.model, this.modelAliasConfig);

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
    return tracers.sdk.startActiveSpan(
      "neurolink.generateTextInternal",
      { kind: SpanKind.INTERNAL },
      (internalSpan) =>
        this.executeGenerateTextInternalWithSpan(options, internalSpan),
    );
  }

  private async executeGenerateTextInternalWithSpan(
    options: TextGenerationOptions,
    internalSpan: ReturnType<typeof tracers.sdk.startSpan>,
  ): Promise<TextGenerationResult> {
    try {
      const context = this.initializeGenerateTextInternalContext(options);
      internalSpan.setAttribute("neurolink.request_id", context.requestId);
      internalSpan.setAttribute(
        "neurolink.has_conversation_memory",
        !!this.conversationMemory,
      );
      internalSpan.setAttribute(
        "neurolink.provider",
        (options.provider as string) || "auto",
      );
      internalSpan.setAttribute("neurolink.model", options.model || "default");

      this.logGenerateTextInternalStart(
        context.generateInternalId,
        context.generateInternalStartTime,
        context.generateInternalHrTimeStart,
        options,
        context.functionTag,
      );
      this.emitGenerationStartEvents(options);

      return await this.runGenerateTextInternalFlow(
        options,
        internalSpan,
        context,
      );
    } catch (error) {
      internalSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      internalSpan.end();
    }
  }

  private initializeGenerateTextInternalContext(
    options: TextGenerationOptions,
  ): {
    generateInternalId: string;
    generateInternalStartTime: number;
    generateInternalHrTimeStart: bigint;
    functionTag: string;
    requestId: string;
  } {
    const generateInternalId = `generate-internal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const existingRequestId = (
      options.context as Record<string, unknown> | undefined
    )?.requestId;
    const requestId =
      typeof existingRequestId === "string" && existingRequestId
        ? existingRequestId
        : `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    options.context = { ...options.context, requestId };
    return {
      generateInternalId,
      generateInternalStartTime: Date.now(),
      generateInternalHrTimeStart: process.hrtime.bigint(),
      functionTag: "NeuroLink.generateTextInternal",
      requestId,
    };
  }

  private async runGenerateTextInternalFlow(
    options: TextGenerationOptions,
    internalSpan: ReturnType<typeof tracers.sdk.startSpan>,
    context: {
      generateInternalId: string;
      generateInternalStartTime: number;
      generateInternalHrTimeStart: bigint;
      functionTag: string;
      requestId: string;
    },
  ): Promise<TextGenerationResult> {
    try {
      await this.initializeConversationMemoryForGeneration(
        context.generateInternalId,
        context.generateInternalStartTime,
        context.generateInternalHrTimeStart,
      );
      const mcpResult = await this.attemptMCPGeneration(
        options,
        context.generateInternalId,
        context.generateInternalStartTime,
        context.generateInternalHrTimeStart,
        context.functionTag,
      );
      if (mcpResult) {
        return this.finalizeGenerateTextInternalResult({
          path: "mcp",
          result: mcpResult,
          options,
          internalSpan,
          requestId: context.requestId,
          startTime: context.generateInternalStartTime,
        });
      }

      if (options.abortSignal?.aborted) {
        throw new DOMException("The operation was aborted", "AbortError");
      }

      await this.captureOriginalConversationMessagesForRecovery(options);
      const directResult = await this.directProviderGeneration(options);
      logger.debug(`[${context.functionTag}] Direct generation successful`);

      return this.finalizeGenerateTextInternalResult({
        path: "direct",
        result: directResult,
        options,
        internalSpan,
        requestId: context.requestId,
        startTime: context.generateInternalStartTime,
      });
    } catch (error) {
      const recoveredResult = await this.handleGenerateTextInternalFailure(
        options,
        context,
        error,
      );
      if (recoveredResult) {
        return recoveredResult;
      }
      throw error;
    }
  }

  private async captureOriginalConversationMessagesForRecovery(
    options: TextGenerationOptions,
  ): Promise<void> {
    if (!this.conversationMemory) {
      return;
    }

    const originalMessages = await getConversationMessages(
      this.conversationMemory,
      options,
    );
    (
      options as TextGenerationOptions & {
        _originalConversationMessages?: unknown[];
      }
    )._originalConversationMessages = originalMessages
      ? [...originalMessages]
      : undefined;
  }

  private async finalizeGenerateTextInternalResult(params: {
    path: "mcp" | "direct";
    result: TextGenerationResult;
    options: TextGenerationOptions;
    internalSpan: ReturnType<typeof tracers.sdk.startSpan>;
    requestId: string;
    startTime: number;
  }): Promise<TextGenerationResult> {
    const { path, result, options, internalSpan, requestId, startTime } =
      params;

    logger.info(
      `[NeuroLink.generateTextInternal] generate() - COMPLETE SUCCESS${path === "mcp" ? " (MCP path)" : ""}`,
      {
        provider: result.provider,
        model: result.model,
        responseTimeMs: Date.now() - startTime,
        tokensUsed: result.usage?.total || 0,
        toolsUsed: result.toolsUsed?.length || 0,
        ...(result.usage?.cacheCreationTokens !== undefined && {
          cacheCreationTokens: result.usage.cacheCreationTokens,
        }),
        ...(result.usage?.cacheReadTokens !== undefined && {
          cacheReadTokens: result.usage.cacheReadTokens,
        }),
        ...(result.usage?.cacheSavingsPercent !== undefined && {
          cacheSavingsPercent: result.usage.cacheSavingsPercent,
        }),
      },
    );

    const memStoreStart = Date.now();
    try {
      await storeConversationTurn(
        this.conversationMemory,
        options,
        result,
        new Date(startTime),
        requestId,
      );
      this.recordMemorySpan(
        "memory.store",
        { "memory.operation": "store", "memory.path": path },
        Date.now() - memStoreStart,
        SpanStatus.OK,
      );
    } catch (memoryError) {
      this.recordMemorySpan(
        "memory.store",
        { "memory.operation": "store", "memory.path": path },
        Date.now() - memStoreStart,
        SpanStatus.ERROR,
        memoryError instanceof Error
          ? memoryError.message
          : String(memoryError),
      );
    }

    this.emitter.emit("response:end", result.content || "");
    if (path === "direct") {
      this.emitter.emit("message", "Text generation completed successfully");
    }
    internalSpan.setAttribute("neurolink.path", path);
    internalSpan.setAttribute(
      "neurolink.tokens.input",
      result.usage?.input || 0,
    );
    internalSpan.setAttribute(
      "neurolink.tokens.output",
      result.usage?.output || 0,
    );
    internalSpan.setAttribute(
      "neurolink.result_provider",
      result.provider || "unknown",
    );
    internalSpan.setStatus({ code: SpanStatusCode.OK });

    return result;
  }

  private async handleGenerateTextInternalFailure(
    options: TextGenerationOptions,
    context: {
      generateInternalStartTime: number;
      functionTag: string;
      requestId: string;
    },
    error: unknown,
  ): Promise<TextGenerationResult | null> {
    const recoveredResult = await this.tryRecoverGenerateTextOverflow(
      options,
      context.functionTag,
      error,
    );
    if (recoveredResult) {
      return recoveredResult;
    }

    if (isAbortError(error)) {
      logger.info(
        `[${context.functionTag}] Generation aborted — storing conversation turn for title generation`,
        {
          hasMemory: !!this.conversationMemory,
          memoryType: this.conversationMemory?.constructor?.name || "NONE",
          sessionId:
            (options.context as Record<string, unknown>)?.sessionId ||
            "unknown",
        },
      );

      try {
        const abortedResult: TextGenerationResult = {
          content: "[generation was interrupted]",
          provider: options.provider || "unknown",
          model: options.model || "unknown",
          responseTime: Date.now() - context.generateInternalStartTime,
        };
        await withTimeout(
          storeConversationTurn(
            this.conversationMemory,
            options,
            abortedResult,
            new Date(context.generateInternalStartTime),
            context.requestId,
          ),
          5000,
        );
      } catch (storeError) {
        logger.warn(
          `[${context.functionTag}] Failed to store conversation turn after abort`,
          {
            error:
              storeError instanceof Error
                ? storeError.message
                : String(storeError),
          },
        );
      }
    } else {
      logger.error(`[${context.functionTag}] All generation methods failed`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    this.emitter.emit("response:end", "");
    this.emitter.emit(
      "error",
      error instanceof Error ? error : new Error(String(error)),
    );
    return null;
  }

  private async tryRecoverGenerateTextOverflow(
    options: TextGenerationOptions,
    functionTag: string,
    error: unknown,
  ): Promise<TextGenerationResult | null> {
    if (!isContextOverflowError(error) || !this.conversationMemory) {
      return null;
    }

    logger.warn(
      `[${functionTag}] Context overflow detected by provider, attempting smart recovery`,
      {
        error: error instanceof Error ? error.message : String(error),
        overflowProvider: getContextOverflowProvider(error),
      },
    );

    try {
      const actualOverflow = parseProviderOverflowDetails(error);
      const originalMessages =
        (
          options as TextGenerationOptions & {
            _originalConversationMessages?: unknown[];
          }
        )._originalConversationMessages ??
        (await getConversationMessages(this.conversationMemory, options));
      const recoveryBudget = checkContextBudget({
        provider: options.provider || "openai",
        model: options.model,
        maxTokens: options.maxTokens,
        currentPrompt: options.prompt,
        systemPrompt: options.systemPrompt,
      });
      const actualTokens =
        actualOverflow?.actualTokens ?? recoveryBudget.estimatedInputTokens;
      const budgetTokens =
        actualOverflow?.budgetTokens ?? recoveryBudget.availableInputTokens;
      const compactionTarget = Math.floor(budgetTokens * 0.7);
      const requiredReduction =
        actualTokens > 0
          ? (actualTokens - compactionTarget) / actualTokens
          : 0.5;

      const compactor = new ContextCompactor({
        enableSummarize: false,
        enablePrune: true,
        enableDeduplicate: true,
        enableTruncate: true,
        truncationFraction: Math.min(0.9, requiredReduction + 0.15),
      });
      const compactionResult = await compactor.compact(
        originalMessages as import("./types/index.js").ChatMessage[],
        compactionTarget,
        undefined,
        (options.context as Record<string, unknown>)?.requestId as
          | string
          | undefined,
      );

      if (!compactionResult.compacted) {
        return null;
      }

      const repairedResult = repairToolPairs(compactionResult.messages);
      const verifyBudget = checkContextBudget({
        provider: options.provider || "openai",
        model: options.model,
        maxTokens: options.maxTokens,
        systemPrompt: options.systemPrompt,
        currentPrompt: options.prompt,
        conversationMessages: repairedResult.messages as Array<{
          role: string;
          content: string;
        }>,
      });

      if (!verifyBudget.withinBudget) {
        logger.error(
          `[${functionTag}] Recovery compaction insufficient, aborting retry`,
          {
            estimatedTokens: verifyBudget.estimatedInputTokens,
            availableTokens: verifyBudget.availableInputTokens,
          },
        );
        throw new ContextBudgetExceededError(
          `Context overflow recovery failed. Provider rejected at ~${actualTokens} tokens, ` +
            `recovery compaction achieved ${compactionResult.tokensAfter} tokens ` +
            `but budget is ${budgetTokens} tokens.`,
          {
            estimatedTokens: compactionResult.tokensAfter,
            availableTokens: budgetTokens,
            stagesUsed: compactionResult.stagesUsed,
            breakdown: verifyBudget.breakdown,
          },
        );
      }

      logger.info(
        `[${functionTag}] Smart recovery verified, retrying generation`,
        {
          tokensSaved: compactionResult.tokensSaved,
          compactionTarget,
          verifiedTokens: verifyBudget.estimatedInputTokens,
          verifiedBudget: verifyBudget.availableInputTokens,
        },
      );

      return this.directProviderGeneration({
        ...options,
        conversationMessages: repairedResult.messages,
      } as TextGenerationOptions);
    } catch (retryError) {
      if (retryError instanceof ContextBudgetExceededError) {
        throw retryError;
      }
      logger.error(`[${functionTag}] Recovery attempt failed`, {
        error:
          retryError instanceof Error ? retryError.message : String(retryError),
      });
      return null;
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

      try {
        await this.conversationMemory.initialize();
      } catch (err) {
        logger.warn(
          "[NEUROLINK] Redis memory init failed, falling back to in-memory",
          {
            error: err instanceof Error ? err.message : String(err),
            generateInternalId,
          },
        );
        const memCfg = this.conversationMemoryConfig?.conversationMemory;
        this.conversationMemory = new ConversationMemoryManager({
          enabled: true,
          maxSessions: memCfg?.maxSessions ?? 100,
          maxTurnsPerSession: memCfg?.maxTurnsPerSession ?? 50,
        });
        await this.conversationMemory.initialize();
      }

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
    if (
      !options.disableTools &&
      !(options.tts?.enabled && !options.tts?.useAiResponse)
    ) {
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

    // NL-007: Track retry metadata for observability
    const retryErrors: Array<{ code: string; message: string }> = [];
    let retryCount = 0;

    const maxAttempts = maxMcpRetries + 1;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (options.abortSignal?.aborted) {
        logger.debug(
          `[${functionTag}] Abort signal already fired before attempt ${attempt}, stopping retries`,
        );
        throw new DOMException("The operation was aborted", "AbortError");
      }

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
              retryCount,
            },
          );
          // NL-007: Attach retry metadata to result
          if (retryCount > 0) {
            mcpResult.retries = { count: retryCount, errors: retryErrors };
          }
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
        // Immediately propagate AbortError — never retry aborted requests
        if (isAbortError(error)) {
          logger.debug(
            `[${functionTag}] AbortError detected on attempt ${attempt}, stopping retries`,
          );
          throw error;
        }

        // NL-007: Record retry error for observability
        retryCount++;
        const errMsg = error instanceof Error ? error.message : String(error);
        const errCode =
          error instanceof NeuroLinkError
            ? error.code
            : error instanceof Error
              ? error.name
              : "UNKNOWN";
        retryErrors.push({ code: errCode, message: errMsg.substring(0, 500) });

        logger.debug(
          `[${functionTag}] MCP generation failed on attempt ${attempt}/${maxAttempts}`,
          {
            error: errMsg,
            willRetry: attempt < maxAttempts,
            retryCount,
          },
        );

        // Check for non-retryable errors — skip remaining retries immediately
        // NoSuchToolError / InvalidToolArgumentsError from Vercel AI SDK are never
        // retryable — the model hallucinated a tool name or gave bad params, and
        // the same tools would be passed on every retry.
        const isToolError =
          error instanceof Error &&
          (error.name === "AI_NoSuchToolError" ||
            error.name === "AI_InvalidToolArgumentsError" ||
            error.message.includes("NoSuchToolError") ||
            error.message.includes("Model tried to call unavailable tool"));

        const isNonRetryable =
          isContextOverflowError(error) ||
          isToolError ||
          isNonRetryableProviderError(error) ||
          (error instanceof Error &&
            (error as Error & { isRetryable?: boolean }).isRetryable ===
              false) ||
          (error instanceof Error &&
            (error as Error & { statusCode?: number }).statusCode === 400);

        if (isNonRetryable) {
          logger.debug(
            `[${functionTag}] Non-retryable error detected, skipping remaining retries`,
          );
          break;
        }

        if (attempt >= maxAttempts) {
          logger.debug(
            `[${functionTag}] All MCP attempts exhausted, falling back to direct generation`,
          );
          break;
        }

        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, 500);
          if (options.abortSignal) {
            const onAbort = () => {
              clearTimeout(timer);
              resolve();
            };
            options.abortSignal.addEventListener("abort", onAbort, {
              once: true,
            });
          }
        });
        if (options.abortSignal?.aborted) {
          throw new DOMException("The operation was aborted", "AbortError");
        }
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
    if (options.abortSignal?.aborted) {
      throw new DOMException("The operation was aborted", "AbortError");
    }

    // 🚀 EXHAUSTIVE LOGGING POINT T001: TRY MCP GENERATION ENTRY
    const requestId =
      ((options.context as Record<string, unknown>)?.requestId as string) ||
      "unknown";
    const tryMCPId = `try-mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tryMCPStartTime = Date.now();
    const tryMCPHrTimeStart = process.hrtime.bigint();
    const functionTag = "NeuroLink.tryMCPGeneration";

    try {
      const generationContext = await this.prepareMCPGenerationContext(
        options,
        requestId,
        tryMCPId,
        tryMCPStartTime,
        tryMCPHrTimeStart,
      );
      if (!generationContext) {
        return null;
      }

      const conversationMessages = await this.ensureMCPGenerationBudget(
        options,
        requestId,
        generationContext.providerName,
        generationContext.enhancedSystemPrompt,
        generationContext.availableTools,
        generationContext.conversationMessages,
      );

      return this.generateWithMCPProvider({
        options,
        requestId,
        functionTag,
        tryMCPStartTime,
        providerName: generationContext.providerName,
        availableTools: generationContext.availableTools,
        enhancedSystemPrompt: generationContext.enhancedSystemPrompt,
        conversationMessages,
      });
    } catch (error) {
      // Immediately propagate AbortError — never swallow aborted requests
      if (isAbortError(error)) {
        mcpLogger.debug(`[${functionTag}] AbortError detected, rethrowing`);
        throw error;
      }

      // Propagate non-retryable errors (NoSuchToolError, InvalidToolArgumentsError)
      // so the caller's retry loop can detect them and break immediately instead
      // of retrying the same deterministic failure.
      const isToolError =
        error instanceof Error &&
        (error.name === "AI_NoSuchToolError" ||
          error.name === "AI_InvalidToolArgumentsError" ||
          (error.message &&
            (error.message.includes("NoSuchToolError") ||
              error.message.includes("Model tried to call unavailable tool"))));
      if (isToolError) {
        mcpLogger.warn(
          `[${functionTag}] Non-retryable tool error, rethrowing`,
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );
        throw error;
      }

      mcpLogger.warn(`[${functionTag}] MCP generation failed`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return null; // Let caller fall back
    }
  }

  private async prepareMCPGenerationContext(
    options: TextGenerationOptions,
    requestId: string,
    tryMCPId: string,
    tryMCPStartTime: number,
    tryMCPHrTimeStart: bigint,
  ): Promise<{
    providerName: string;
    availableTools: ToolInfo[];
    enhancedSystemPrompt: string;
    conversationMessages: ChatMessage[];
  } | null> {
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
      return null;
    }

    const providerName =
      options.provider === "auto" || !options.provider
        ? await getBestProvider()
        : options.provider;
    let availableTools = await this.getAllAvailableTools();
    const { tools: circuitBreakerFilteredTools, unavailableTools } =
      this.toolRegistry.getAvailableTools(this.toolCircuitBreakers);
    const cbFilteredNames = new Set(
      circuitBreakerFilteredTools.map((tool) => tool.name),
    );
    availableTools = availableTools.filter((tool) =>
      cbFilteredNames.has(tool.name),
    );
    availableTools = this.applyToolInfoFiltering(availableTools, options);

    const targetTool = availableTools.find(
      (tool) =>
        tool.name.includes("SuccessRateSRByTime") ||
        tool.name.includes("juspay-analytics"),
    );
    logger.debug("Available tools for AI prompt generation", {
      toolsCount: availableTools.length,
      toolNames: availableTools.map((tool) => tool.name),
      unavailableToolsCount: unavailableTools.length,
      unavailableTools,
      hasTargetTool: !!targetTool,
      targetToolDetails: targetTool
        ? {
            name: targetTool.name,
            description: targetTool.description,
            server: targetTool.server,
          }
        : null,
    });

    const circuitBreakerNote =
      unavailableTools.length > 0
        ? `\n\nNOTE: The following tools are temporarily unavailable due to repeated failures: ${unavailableTools.join(", ")}. Do not attempt to call these tools.`
        : "";
    const enhancedSystemPrompt = options.skipToolPromptInjection
      ? (options.systemPrompt || "") + circuitBreakerNote
      : this.createToolAwareSystemPrompt(options.systemPrompt, availableTools) +
        circuitBreakerNote;
    logger.debug("Tool-aware system prompt created", {
      requestId,
      originalPromptLength: options.systemPrompt?.length || 0,
      enhancedPromptLength: enhancedSystemPrompt.length,
      skippedToolInjection: !!options.skipToolPromptInjection,
      enhancedPromptPreview: enhancedSystemPrompt.substring(0, 80) + "...",
    });

    logger.debug("[Observability] System prompt metadata", {
      requestId,
      systemPromptLength: enhancedSystemPrompt.length,
      systemPromptHash:
        enhancedSystemPrompt.length > 0
          ? `sha256:${enhancedSystemPrompt.slice(0, 8)}...`
          : "empty",
      hasCustomSystemPrompt: !!options.systemPrompt,
    });

    const conversationMessages = (await getConversationMessages(
      this.conversationMemory,
      options,
    )) as ChatMessage[];
    this.logMCPConversationSummary(requestId, conversationMessages);

    logger.debug("[Observability] Available tools for LLM", {
      requestId,
      toolCount: availableTools.length,
      toolNames: availableTools.map((tool) => tool.name),
    });

    return {
      providerName,
      availableTools,
      enhancedSystemPrompt,
      conversationMessages,
    };
  }

  private logMCPConversationSummary(
    requestId: string,
    conversationMessages: ChatMessage[],
  ): void {
    if (!logger.shouldLog("debug")) {
      return;
    }

    try {
      logger.debug("[Observability] Conversation history summary", {
        requestId,
        messageCount: conversationMessages.length,
        messages: conversationMessages.map((message, index) => {
          let contentLength: number;
          if (typeof message.content === "string") {
            contentLength = message.content.length;
          } else {
            try {
              contentLength = JSON.stringify(message.content).length;
            } catch {
              contentLength = 0;
            }
          }

          return {
            index,
            role: message.role,
            contentLength,
            contentPreview:
              typeof message.content === "string"
                ? message.content.substring(0, 200)
                : "[multimodal]",
          };
        }),
      });
    } catch {
      // Ignore serialization errors in debug logging
    }
  }

  private async ensureMCPGenerationBudget(
    options: TextGenerationOptions,
    requestId: string,
    providerName: string,
    enhancedSystemPrompt: string,
    availableTools: ToolInfo[],
    conversationMessages: ChatMessage[],
  ): Promise<ChatMessage[]> {
    const budgetResult = checkContextBudget({
      provider: providerName,
      model: options.model,
      maxTokens: options.maxTokens,
      systemPrompt: enhancedSystemPrompt,
      conversationMessages: conversationMessages as Array<{
        role: string;
        content: string;
      }>,
      currentPrompt: options.prompt,
      toolDefinitions: availableTools,
    });

    logger.info("[TokenBudget] Token breakdown", {
      requestId,
      system: budgetResult.breakdown?.systemPrompt || 0,
      history: budgetResult.breakdown?.conversationHistory || 0,
      tools: budgetResult.breakdown?.toolDefinitions || 0,
      currentPrompt: budgetResult.breakdown?.currentPrompt || 0,
      files: budgetResult.breakdown?.fileAttachments || 0,
      total: budgetResult.estimatedInputTokens,
      budget: budgetResult.availableInputTokens,
      usagePercent: Math.round(budgetResult.usageRatio * 1000) / 10,
      conversationMessageCount: conversationMessages.length,
      shouldCompact: budgetResult.shouldCompact,
    });

    // Scale timeout for large contexts if caller didn't set one explicitly.
    // Providers read options.timeout via getTimeout(), so setting it here
    // propagates to any downstream provider call.
    if (
      options.timeout === undefined &&
      budgetResult.estimatedInputTokens > 100_000
    ) {
      // >100K → 1.5x, >200K → 2x, >300K → 2.5x (capped at 4x) of 60s base
      const scale =
        1 + Math.floor((budgetResult.estimatedInputTokens - 1) / 100_000) * 0.5;
      const scaledMs = Math.round(60_000 * Math.min(scale, 4));
      options.timeout = scaledMs;
      logger.info("[TokenBudget] Scaled timeout for large context", {
        requestId,
        estimatedTokens: budgetResult.estimatedInputTokens,
        scaledTimeoutMs: scaledMs,
      });
    }

    const compactionSessionId = this.getCompactionSessionId(options);
    const lastCompactionCount =
      this.lastCompactionMessageCount.get(compactionSessionId) ?? 0;
    if (
      !budgetResult.shouldCompact ||
      !this.conversationMemory ||
      conversationMessages.length <= lastCompactionCount
    ) {
      return conversationMessages;
    }

    return this.compactMCPConversationForBudget({
      options,
      requestId,
      providerName,
      enhancedSystemPrompt,
      availableTools,
      conversationMessages,
      availableInputTokens: budgetResult.availableInputTokens,
      usageRatio: budgetResult.usageRatio,
      estimatedInputTokens: budgetResult.estimatedInputTokens,
      compactionSessionId,
    });
  }

  private async compactMCPConversationForBudget(context: {
    options: TextGenerationOptions;
    requestId: string;
    providerName: string;
    enhancedSystemPrompt: string;
    availableTools: ToolInfo[];
    conversationMessages: ChatMessage[];
    availableInputTokens: number;
    usageRatio: number;
    estimatedInputTokens: number;
    compactionSessionId: string;
  }): Promise<ChatMessage[]> {
    const {
      options,
      requestId,
      providerName,
      enhancedSystemPrompt,
      availableTools,
      conversationMessages,
      availableInputTokens,
      usageRatio,
      estimatedInputTokens,
      compactionSessionId,
    } = context;
    logger.info(
      "[NeuroLink] Context budget exceeded, triggering auto-compaction",
      {
        usageRatio,
        estimatedTokens: estimatedInputTokens,
        availableTokens: availableInputTokens,
      },
    );

    const compactor = new ContextCompactor({
      provider: providerName,
      summarizationProvider:
        this.conversationMemoryConfig?.conversationMemory
          ?.summarizationProvider,
      summarizationModel:
        this.conversationMemoryConfig?.conversationMemory?.summarizationModel,
    });

    const compactionResult = await compactor.compact(
      conversationMessages,
      availableInputTokens,
      this.conversationMemoryConfig?.conversationMemory,
      requestId,
    );

    let compactedMessages = conversationMessages;
    if (compactionResult.compacted) {
      const repairedResult = repairToolPairs(compactionResult.messages);
      compactedMessages = repairedResult.messages;
      this.lastCompactionMessageCount.set(
        compactionSessionId,
        compactedMessages.length,
      );
      logger.info("[NeuroLink] Context compacted successfully", {
        stagesUsed: compactionResult.stagesUsed,
        tokensSaved: compactionResult.tokensSaved,
      });
    }

    const postCompactBudget = checkContextBudget({
      provider: providerName,
      model: options.model,
      maxTokens: options.maxTokens,
      systemPrompt: enhancedSystemPrompt,
      conversationMessages: compactedMessages as Array<{
        role: string;
        content: string;
      }>,
      currentPrompt: options.prompt,
      toolDefinitions: availableTools,
    });

    if (postCompactBudget.withinBudget) {
      return compactedMessages;
    }

    const overageRatio = postCompactBudget.usageRatio - 1.0;
    logger.warn(
      "[NeuroLink] Post-compaction still over budget, attempting emergency content truncation",
      {
        requestId,
        estimatedTokens: postCompactBudget.estimatedInputTokens,
        availableTokens: postCompactBudget.availableInputTokens,
        overagePercent: Math.round(overageRatio * 100),
        stagesUsedInCompaction: compactionResult.stagesUsed,
      },
    );

    compactedMessages = emergencyContentTruncation(
      compactedMessages,
      postCompactBudget.availableInputTokens,
      postCompactBudget.breakdown,
      providerName,
    );

    const finalBudget = checkContextBudget({
      provider: providerName,
      model: options.model,
      maxTokens: options.maxTokens,
      systemPrompt: enhancedSystemPrompt,
      conversationMessages: compactedMessages as Array<{
        role: string;
        content: string;
      }>,
      currentPrompt: options.prompt,
      toolDefinitions: availableTools,
    });

    if (!finalBudget.withinBudget) {
      // Clear watermark so handleContextOverflow recovery can re-compact
      this.lastCompactionMessageCount.delete(compactionSessionId);

      throw new ContextBudgetExceededError(
        `Context exceeds model budget after all compaction stages. ` +
          `Estimated: ${finalBudget.estimatedInputTokens} tokens, ` +
          `Budget: ${finalBudget.availableInputTokens} tokens. ` +
          `Conversation is too large to fit in the model's context window.`,
        {
          estimatedTokens: finalBudget.estimatedInputTokens,
          availableTokens: finalBudget.availableInputTokens,
          stagesUsed: compactionResult.stagesUsed,
          breakdown: finalBudget.breakdown,
        },
      );
    }

    return compactedMessages;
  }

  private async generateWithMCPProvider(context: {
    options: TextGenerationOptions;
    requestId: string;
    functionTag: string;
    tryMCPStartTime: number;
    providerName: string;
    availableTools: ToolInfo[];
    enhancedSystemPrompt: string;
    conversationMessages: ChatMessage[];
  }): Promise<TextGenerationResult | null> {
    const {
      options,
      requestId,
      functionTag,
      tryMCPStartTime,
      providerName,
      availableTools,
      enhancedSystemPrompt,
      conversationMessages,
    } = context;
    const provider = await AIProviderFactory.createProvider(
      providerName as AIProviderName,
      options.model,
      !options.disableTools,
      this as unknown as UnknownRecord,
      options.region,
      this.resolveCredentials(options.credentials),
    );

    provider.setTraceContext(this._metricsTraceContext);
    this.emitter.emit("connected");
    this.emitter.emit(
      "message",
      `${providerName} provider initialized successfully`,
    );
    provider.setupToolExecutor(
      {
        customTools: this.getCustomTools(),
        executeTool: (toolName: string, params: unknown) =>
          this.executeTool(toolName, params, {
            disableToolCache: options.disableToolCache,
          }),
      },
      functionTag,
    );

    logger.debug("[Observability] User input to LLM", {
      requestId,
      promptPreview: options.prompt?.substring(0, 200),
      promptLength: options.prompt?.length || 0,
      model: options.model,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      maxSteps: options.maxSteps,
      skipToolPromptInjection: options.skipToolPromptInjection,
    });

    const result = await provider.generate({
      ...options,
      systemPrompt: enhancedSystemPrompt,
      conversationMessages,
    });
    const responseTime = Date.now() - tryMCPStartTime;
    const hasContent = !!(result?.content && result.content.trim().length > 0);
    const hasToolExecutions = !!(
      result?.toolExecutions && result.toolExecutions.length > 0
    );

    mcpLogger.debug(`[${functionTag}] Result validation:`, {
      hasResult: !!result,
      hasContent,
      hasToolExecutions,
      contentLength: result?.content?.length || 0,
      toolExecutionsCount: result?.toolExecutions?.length || 0,
      toolsUsedCount: result?.toolsUsed?.length || 0,
    });

    if (!hasContent && !hasToolExecutions) {
      mcpLogger.debug(
        `[${functionTag}] Result rejected: no content and no tool executions`,
      );
      return null;
    }

    const transformedToolExecutions = transformToolExecutionsForMCP(
      result.toolExecutions,
    );
    mcpLogger.debug(`[${functionTag}] Tool execution transformation:`, {
      originalCount: result?.toolExecutions?.length || 0,
      transformedCount: transformedToolExecutions.length,
      transformedTools: transformedToolExecutions.map((te) => te.toolName),
    });

    return {
      content: result.content || "",
      provider: providerName,
      model: result.model,
      usage: result.usage,
      responseTime,
      finishReason: result.finishReason,
      toolsUsed: result.toolsUsed || [],
      toolExecutions: transformedToolExecutions,
      enhancedWithTools: Boolean(hasToolExecutions),
      availableTools: transformToolsForMCP(
        transformToolsToExpectedFormat(availableTools),
      ),
      audio: result.audio,
      video: result.video,
      ppt: result.ppt,
      imageOutput: result.imageOutput,
      analytics: result.analytics,
      evaluation: result.evaluation,
    };
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
      if (options.abortSignal?.aborted) {
        throw new DOMException("The operation was aborted", "AbortError");
      }

      try {
        logger.debug(`[${functionTag}] Attempting provider: ${providerName}`);

        // Get conversation messages for context (use pre-compacted if provided)
        const optionsWithMessages = options as TextGenerationOptions & {
          conversationMessages?: unknown[];
        };
        let conversationMessages = optionsWithMessages.conversationMessages
          ?.length
          ? optionsWithMessages.conversationMessages
          : await getConversationMessages(this.conversationMemory, options);

        // Pre-generation budget check
        const budgetCheck = checkContextBudget({
          provider: providerName,
          model: options.model,
          maxTokens: options.maxTokens,
          systemPrompt: options.systemPrompt,
          conversationMessages: conversationMessages as Array<{
            role: string;
            content: string;
          }>,
          currentPrompt: options.prompt,
          toolDefinitions: options.tools
            ? Object.values(options.tools)
            : undefined,
        });

        const dpgMessageCount = conversationMessages?.length || 0;
        const dpgCompactionSessionId = this.getCompactionSessionId(options);
        if (
          budgetCheck.shouldCompact &&
          this.conversationMemory &&
          dpgMessageCount >
            (this.lastCompactionMessageCount.get(dpgCompactionSessionId) ?? 0)
        ) {
          const compactor = new ContextCompactor({
            provider: providerName,
            summarizationProvider:
              this.conversationMemoryConfig?.conversationMemory
                ?.summarizationProvider,
            summarizationModel:
              this.conversationMemoryConfig?.conversationMemory
                ?.summarizationModel,
          });
          const compactionResult = await compactor.compact(
            conversationMessages as import("./types/index.js").ChatMessage[],
            budgetCheck.availableInputTokens,
            this.conversationMemoryConfig?.conversationMemory,
            (options.context as Record<string, unknown>)?.requestId as
              | string
              | undefined,
          );
          if (compactionResult.compacted) {
            const repairedResult = repairToolPairs(compactionResult.messages);
            conversationMessages = repairedResult.messages;
            this.lastCompactionMessageCount.set(
              dpgCompactionSessionId,
              conversationMessages.length,
            );
          }

          // POST-COMPACTION BUDGET RE-CHECK (BUG-003 fix)
          const postCompactBudget = checkContextBudget({
            provider: providerName,
            model: options.model,
            maxTokens: options.maxTokens,
            systemPrompt: options.systemPrompt,
            conversationMessages: conversationMessages as Array<{
              role: string;
              content: string;
            }>,
            currentPrompt: options.prompt,
            toolDefinitions: options.tools
              ? Object.values(options.tools)
              : undefined,
          });

          if (!postCompactBudget.withinBudget) {
            logger.warn(
              "[NeuroLink] directProviderGeneration: post-compaction still over budget, emergency truncation",
              {
                estimatedTokens: postCompactBudget.estimatedInputTokens,
                availableTokens: postCompactBudget.availableInputTokens,
                overagePercent: Math.round(
                  (postCompactBudget.usageRatio - 1.0) * 100,
                ),
              },
            );

            conversationMessages = emergencyContentTruncation(
              conversationMessages as import("./types/index.js").ChatMessage[],
              postCompactBudget.availableInputTokens,
              postCompactBudget.breakdown,
              providerName,
            );

            const finalBudget = checkContextBudget({
              provider: providerName,
              model: options.model,
              maxTokens: options.maxTokens,
              systemPrompt: options.systemPrompt,
              conversationMessages: conversationMessages as Array<{
                role: string;
                content: string;
              }>,
              currentPrompt: options.prompt,
              toolDefinitions: options.tools
                ? Object.values(options.tools)
                : undefined,
            });

            if (!finalBudget.withinBudget) {
              // Clear watermark so handleContextOverflow recovery can re-compact
              this.lastCompactionMessageCount.delete(dpgCompactionSessionId);

              throw new ContextBudgetExceededError(
                `Context exceeds model budget after all compaction stages. ` +
                  `Estimated: ${finalBudget.estimatedInputTokens} tokens, ` +
                  `Budget: ${finalBudget.availableInputTokens} tokens.`,
                {
                  estimatedTokens: finalBudget.estimatedInputTokens,
                  availableTokens: finalBudget.availableInputTokens,
                  stagesUsed: compactionResult.stagesUsed,
                  breakdown: finalBudget.breakdown,
                },
              );
            }
          }
        }

        const provider = await AIProviderFactory.createProvider(
          providerName as AIProviderName,
          options.model,
          !options.disableTools, // Pass disableTools as inverse of enableMCP
          this as unknown as UnknownRecord, // Pass SDK instance
          options.region, // Pass region parameter
          this.resolveCredentials(options.credentials),
        );

        // Propagate trace context for parent-child span hierarchy
        provider.setTraceContext(this._metricsTraceContext);

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
            executeTool: (toolName: string, params: unknown) =>
              this.executeTool(toolName, params, {
                disableToolCache: options.disableToolCache,
              }),
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
          finishReason: result.finishReason,
          toolsUsed: result.toolsUsed || [],
          // Map toolExecutions from EnhancedGenerateResult shape ({name,input,output})
          // to TextGenerationResult shape ({toolName,executionTime,success}).
          // Preserve original timing/status when present, fall back to safe defaults.
          toolExecutions: result.toolExecutions?.map((te) => {
            const t = te as Record<string, unknown>;
            return {
              // Spread original fields first so normalized fields take precedence
              ...te,
              toolName: te.name,
              executionTime:
                typeof t.executionTime === "number"
                  ? t.executionTime
                  : typeof t.duration === "number"
                    ? t.duration
                    : 0,
              success:
                typeof t.success === "boolean"
                  ? t.success
                  : t.status === "success",
            };
          }),
          enhancedWithTools: !!result.toolExecutions?.length,
          analytics: result.analytics,
          evaluation: result.evaluation,
          audio: result.audio,
          video: result.video,
          ppt: result.ppt,
          // CRITICAL FIX: Include imageOutput for image generation models
          imageOutput: result.imageOutput,
        };
      } catch (error) {
        // Immediately propagate AbortError — never fall back to next provider on abort
        if (isAbortError(error)) {
          logger.debug(
            `[${functionTag}] AbortError detected on provider ${providerName}, stopping fallback`,
          );
          throw error;
        }

        // Circuit breaker for non-retryable errors (model not found, auth failed, etc.)
        // These errors are permanent — retrying with the same config will always fail
        // and wastes tokens/latency (e.g., 6 retries of 418KB = ~628K wasted tokens)
        if (isNonRetryableProviderError(error)) {
          logger.warn(
            `[${functionTag}] Non-retryable error from provider ${providerName}, stopping fallback chain`,
            {
              error: error instanceof Error ? error.message : String(error),
              errorType:
                error instanceof Error ? error.constructor.name : typeof error,
            },
          );
          throw error instanceof Error ? error : new Error(String(error));
        }

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
  /**
   * Apply per-call tool filtering (whitelist/blacklist) to a ToolInfo array.
   * Used to filter the tool list before building the system prompt.
   */
  private applyToolInfoFiltering(
    tools: ToolInfo[],
    options: { toolFilter?: string[]; excludeTools?: string[] },
  ): ToolInfo[] {
    if (
      (!options.toolFilter || options.toolFilter.length === 0) &&
      (!options.excludeTools || options.excludeTools.length === 0)
    ) {
      return tools;
    }

    let filtered = tools;

    if (options.toolFilter && options.toolFilter.length > 0) {
      const allowSet = new Set(options.toolFilter);
      filtered = filtered.filter((t) => allowSet.has(t.name));
    }

    if (options.excludeTools && options.excludeTools.length > 0) {
      const denySet = new Set(options.excludeTools);
      filtered = filtered.filter((t) => !denySet.has(t.name));
    }

    if (filtered.length !== tools.length) {
      logger.debug(`Tool info filtering applied for system prompt`, {
        beforeCount: tools.length,
        afterCount: filtered.length,
        toolFilter: options.toolFilter,
        excludeTools: options.excludeTools,
      });
    }

    return filtered;
  }

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
  ): Promise<OrchestrationResult> {
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
    return metricsTraceContextStorage.run(
      this.createMetricsTraceContext(),
      () => this.executeStreamRequest({ ...options }),
    );
  }

  private async executeStreamRequest(
    options: StreamOptions,
  ): Promise<StreamResult> {
    const streamSpan = tracers.sdk.startSpan("neurolink.stream", {
      kind: SpanKind.INTERNAL,
      attributes: {
        [ATTR.NL_PROVIDER]: (options.provider as string) || "default",
        [ATTR.GEN_AI_MODEL]: options.model || "default",
        [ATTR.NL_INPUT_LENGTH]: options.input?.text?.length || 0,
        [ATTR.NL_HAS_TOOLS]: !!(
          options.tools && Object.keys(options.tools).length > 0
        ),
        [ATTR.NL_STREAM_MODE]: true,
      },
    });
    const spanStartTime = Date.now();
    this._disableToolCacheForCurrentRequest = !!options.disableToolCache;

    try {
      options.model = resolveModel(options.model, this.modelAliasConfig);

      const startTime = Date.now();
      const hrTimeStart = process.hrtime.bigint();
      const streamId = `neurolink-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const originalPrompt = options.input.text;

      options.fileRegistry = this.fileRegistry;
      await this.validateStreamRequestOptions(options, startTime);

      const workflowResult = await this.maybeHandleWorkflowStreamRequest({
        options,
        startTime,
        streamSpan,
        spanStartTime,
      });
      if (workflowResult) {
        return workflowResult;
      }

      return this.setLangfuseContextFromOptions(options, () =>
        this.runStandardStreamRequest({
          options,
          streamSpan,
          spanStartTime,
          startTime,
          hrTimeStart,
          streamId,
          originalPrompt,
        }),
      );
    } catch (error) {
      streamSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      if (error instanceof Error) {
        streamSpan.recordException(error);
      }
      streamSpan.end();
      throw error;
    }
  }

  private async validateStreamRequestOptions(
    options: StreamOptions,
    startTime: number,
  ): Promise<void> {
    await this.validateStreamInput(options);
    this.enforceSessionBudget(options.maxBudgetUsd);
    await this.applyAuthenticatedRequestContext(options);
    this.emitStreamStartEvents(options, startTime);
    this.applyStreamLifecycleMiddleware(options);
  }

  private async maybeHandleWorkflowStreamRequest(params: {
    options: StreamOptions;
    startTime: number;
    streamSpan: ReturnType<typeof tracers.sdk.startSpan>;
    spanStartTime: number;
  }): Promise<StreamResult | null> {
    if (!params.options.workflow && !params.options.workflowConfig) {
      return null;
    }

    const result = await this.streamWithWorkflow(
      params.options,
      params.startTime,
    );
    const originalWorkflowStream = result.stream;
    const self = this;
    result.stream = (async function* () {
      try {
        for await (const chunk of originalWorkflowStream) {
          yield chunk;
        }
        params.streamSpan.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        params.streamSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error),
        });
        throw error;
      } finally {
        self._disableToolCacheForCurrentRequest = false;
        params.streamSpan.setAttribute(
          "neurolink.response_time_ms",
          Date.now() - params.spanStartTime,
        );
        params.streamSpan.end();
      }
    })();

    return result;
  }

  private async runStandardStreamRequest(params: {
    options: StreamOptions;
    streamSpan: ReturnType<typeof tracers.sdk.startSpan>;
    spanStartTime: number;
    startTime: number;
    hrTimeStart: bigint;
    streamId: string;
    originalPrompt: string;
  }): Promise<StreamResult> {
    const {
      options,
      streamSpan,
      spanStartTime,
      startTime,
      hrTimeStart,
      streamId,
      originalPrompt,
    } = params;

    try {
      const { enhancedOptions, factoryResult } =
        await this.prepareStreamOptions(
          options,
          streamId,
          startTime,
          hrTimeStart,
        );
      const {
        stream: mcpStream,
        provider: providerName,
        usage: streamUsage,
        model: streamModel,
        finishReason: streamFinishReason,
        toolCalls: streamToolCalls,
        toolResults: streamToolResults,
        analytics: streamAnalytics,
      } = await this.createMCPStream(enhancedOptions);
      const streamState = {
        finishReason: streamFinishReason ?? "stop",
        toolCalls: streamToolCalls,
        toolResults: streamToolResults,
      };

      streamSpan.setAttribute(ATTR.NL_PROVIDER, providerName || "unknown");

      let accumulatedContent = "";
      let chunkCount = 0;
      const { eventSequence, cleanup: cleanupListeners } =
        this.setupStreamEventListeners();
      const metadata = {
        fallbackAttempted: false,
        guardrailsBlocked: false,
        error: undefined as string | undefined,
        fallbackProvider: undefined as string | undefined,
        fallbackModel: undefined as string | undefined,
      };

      const self = this;
      const streamStartTime = Date.now();
      const sessionId = (enhancedOptions.context as Record<string, unknown>)
        ?.sessionId as string | undefined;
      const processedStream = (async function* () {
        let streamError: unknown;
        try {
          for await (const chunk of mcpStream) {
            chunkCount++;
            if (
              chunk &&
              "content" in chunk &&
              typeof chunk.content === "string"
            ) {
              accumulatedContent += chunk.content;
              self.emitter.emit("response:chunk", chunk.content);
              self.emitter.emit("stream:chunk", {
                type: "stream:chunk",
                content: chunk.content,
                metadata: {
                  chunkIndex: chunkCount,
                  totalLength: accumulatedContent.length,
                },
                timestamp: Date.now(),
              });
            }
            yield chunk;
          }

          if (
            chunkCount === 0 &&
            !metadata.fallbackAttempted &&
            !enhancedOptions.disableInternalFallback &&
            streamState.toolCalls.length === 0 &&
            streamState.toolResults.length === 0
          ) {
            yield* self.handleStreamFallback(
              metadata,
              streamState,
              originalPrompt,
              enhancedOptions,
              providerName,
              (content: string) => {
                accumulatedContent += content;
              },
            );
          }

          let resolvedUsage = streamUsage;
          if (!resolvedUsage && streamAnalytics) {
            try {
              const resolved = await Promise.resolve(streamAnalytics);
              if (resolved?.tokenUsage) {
                resolvedUsage = resolved.tokenUsage;
              }
            } catch {
              // non-blocking
            }
          }

          self.emitter.emit("stream:complete", {
            type: "stream:complete",
            content: accumulatedContent,
            provider: metadata.fallbackProvider ?? providerName,
            model:
              metadata.fallbackModel ?? streamModel ?? enhancedOptions.model,
            finishReason: streamState.finishReason ?? "stop",
            prompt:
              enhancedOptions.input?.text ||
              (enhancedOptions as Record<string, unknown>).prompt,
            metadata: {
              chunkCount,
              totalLength: accumulatedContent.length,
              durationMs: Date.now() - streamStartTime,
              sessionId,
              usage: resolvedUsage,
              finishReason: streamState.finishReason ?? "stop",
              ...(metadata.fallbackAttempted && {
                primaryProvider: providerName,
                primaryModel: enhancedOptions.model,
                fallback: true,
              }),
            },
            timestamp: Date.now(),
          });
        } catch (error) {
          streamError = error;
          self.emitter.emit("stream:error", {
            type: "stream:error",
            content: error instanceof Error ? error.message : String(error),
            provider: providerName,
            model: enhancedOptions.model,
            metadata: {
              chunkCount,
              totalLength: accumulatedContent.length,
              durationMs: Date.now() - streamStartTime,
              errorName: error instanceof Error ? error.name : "UnknownError",
              sessionId,
            },
            timestamp: Date.now(),
          });
          throw error;
        } finally {
          self._disableToolCacheForCurrentRequest = false;
          cleanupListeners();

          streamSpan.setAttribute(
            "neurolink.response_time_ms",
            Date.now() - spanStartTime,
          );
          streamSpan.setAttribute(
            ATTR.NL_OUTPUT_LENGTH,
            accumulatedContent.length,
          );
          const primaryFailed = !!(metadata.error || streamError);
          streamSpan.setAttribute(
            ATTR.GEN_AI_FINISH_REASON,
            primaryFailed ? "error" : "stop",
          );
          if (metadata.fallbackAttempted) {
            streamSpan.setAttribute("neurolink.fallback_triggered", true);
            if (metadata.fallbackProvider) {
              streamSpan.setAttribute(
                "neurolink.fallback_provider",
                metadata.fallbackProvider,
              );
            }
          }
          if (primaryFailed) {
            streamSpan.setStatus({
              code: SpanStatusCode.ERROR,
              message:
                metadata.error ||
                (streamError instanceof Error
                  ? streamError.message
                  : String(streamError)),
            });
          } else {
            streamSpan.setStatus({ code: SpanStatusCode.OK });
          }
          streamSpan.end();

          if (accumulatedContent.trim()) {
            logger.info(`[NeuroLink.stream] stream() - COMPLETE SUCCESS`, {
              provider: providerName,
              model: enhancedOptions.model,
              responseTimeMs: Date.now() - startTime,
              contentLength: accumulatedContent.length,
              fallback: metadata.fallbackAttempted,
            });
          }

          await self.storeStreamConversationMemory({
            enhancedOptions,
            providerName,
            originalPrompt,
            accumulatedContent,
            startTime,
            eventSequence,
          });
        }
      })();
      const streamResult = await this.processStreamResult(
        processedStream,
        enhancedOptions,
        factoryResult,
      );
      streamResult.finishReason =
        streamState.finishReason || streamResult.finishReason;
      streamResult.toolCalls = streamState.toolCalls;
      streamResult.toolResults = streamState.toolResults;
      if (!streamResult.usage) {
        streamResult.usage = streamUsage;
      }
      if (!streamResult.analytics) {
        streamResult.analytics =
          streamAnalytics instanceof Promise
            ? await streamAnalytics
            : streamAnalytics;
      }

      if (streamResult.analytics?.cost && streamResult.analytics.cost > 0) {
        this._sessionCostUsd += streamResult.analytics.cost;
      }

      this.emitStreamEndEvents(streamResult);

      return this.createStreamResponse(streamResult, processedStream, {
        providerName,
        options,
        startTime,
        responseTime: Date.now() - startTime,
        streamId,
        fallback: metadata.fallbackAttempted,
        guardrailsBlocked: metadata.guardrailsBlocked,
        error: metadata.error,
        events: eventSequence,
      });
    } catch (error) {
      if (options.disableInternalFallback) {
        throw error;
      }
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
   * Prepare stream options: initialize memory, MCP, retrieval, orchestration,
   * Ollama tool auto-disable, factory processing, and tool detection.
   */
  private async prepareStreamOptions(
    options: StreamOptions,
    streamId: string,
    startTime: number,
    hrTimeStart: bigint,
  ): Promise<{
    enhancedOptions: StreamOptions;
    factoryResult: {
      hasStreamingConfig: boolean;
      streamingEnabled?: boolean;
      enhancedConfig?: StreamOptions["streaming"];
    };
  }> {
    // Initialize conversation memory if needed (for lazy loading)
    await this.initializeConversationMemoryForGeneration(
      streamId,
      startTime,
      hrTimeStart,
    );

    // Initialize MCP
    await this.initializeMCP();

    // Memory retrieval
    if (
      this.shouldReadMemory(options.memory, options.context?.userId) &&
      options.context?.userId
    ) {
      try {
        options.input.text = await this.retrieveMemory(
          options.input.text,
          options.context.userId as string,
          options.memory?.additionalUsers,
        );
        logger.debug("Memory retrieval successful");
      } catch (error) {
        logger.warn("Memory retrieval failed:", error);
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

        // Re-resolve model alias in case orchestration returned an alias
        if (orchestratedOptions.model) {
          options.model = resolveModel(options.model, this.modelAliasConfig);
        }
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

    // Auto-disable tools for Ollama models that don't support them
    await this.autoDisableOllamaStreamTools(options);

    // RAG Integration: If rag config is provided, prepare the RAG search tool
    if (options.rag?.files?.length) {
      try {
        const { prepareRAGTool } = await import("./rag/ragIntegration.js");
        const ragResult = await prepareRAGTool(
          options.rag,
          options.provider as string | undefined,
        );

        // Inject the RAG tool into the tools record
        if (!options.tools) {
          options.tools = {};
        }
        (options.tools as Record<string, unknown>)[ragResult.toolName] =
          ragResult.tool;

        // Inject RAG-aware system prompt so the AI uses the RAG tool first
        const ragSystemInstruction = [
          `\n\nIMPORTANT: You have a tool called "${ragResult.toolName}" that searches through`,
          `${ragResult.filesLoaded} loaded document(s) containing ${ragResult.chunksIndexed} indexed chunks.`,
          `ALWAYS use the "${ragResult.toolName}" tool FIRST to answer the user's question before using any other tools.`,
          `This tool searches your local knowledge base of pre-loaded documents and is the primary source of truth.`,
          `Do NOT use websearchGrounding or any web search tools when the answer can be found in the loaded documents.`,
        ].join(" ");
        options.systemPrompt =
          (options.systemPrompt || "") + ragSystemInstruction;

        logger.info("[RAG] Tool injected into stream()", {
          toolName: ragResult.toolName,
          filesLoaded: ragResult.filesLoaded,
          chunksIndexed: ragResult.chunksIndexed,
        });
      } catch (error) {
        logger.warn(
          "[RAG] Failed to prepare RAG tool, continuing without RAG",
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }

    const factoryResult = processStreamingFactoryOptions(options);
    const enhancedOptions = createCleanStreamOptions(options);
    if (options.input?.text) {
      const { toolResults: _toolResults, enhancedPrompt } =
        await this.detectAndExecuteTools(options.input.text, undefined);
      if (enhancedPrompt !== options.input.text) {
        enhancedOptions.input.text = enhancedPrompt;
      }
    }

    return { enhancedOptions, factoryResult };
  }

  /**
   * Auto-disable tools for Ollama models that don't support them (stream mode).
   * Prevents overwhelming smaller models with massive tool descriptions in the system message.
   */
  private async autoDisableOllamaStreamTools(
    options: StreamOptions,
  ): Promise<void> {
    if (
      (options.provider === "ollama" ||
        options.provider?.toLowerCase().includes("ollama")) &&
      !options.disableTools
    ) {
      const { ModelConfigurationManager } =
        await import("./core/modelConfiguration.js");
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
  }

  /**
   * Set up event listeners for stream event capture (tool calls, HITL, UI components).
   * Returns the shared event sequence array and a cleanup function to remove all listeners.
   */
  private setupStreamEventListeners(): {
    eventSequence: Array<{
      type: string;
      seq: number;
      timestamp: number;
      [key: string]: unknown;
    }>;
    cleanup: () => void;
  } {
    const eventSequence: Array<{
      type: string;
      seq: number;
      timestamp: number;
      [key: string]: unknown;
    }> = [];
    let eventSeqCounter = 0;

    const captureEvent = (type: string, data?: unknown) => {
      eventSequence.push({
        type,
        seq: eventSeqCounter++,
        timestamp: Date.now(),
        ...(data && typeof data === "object" ? data : { data }),
      });
    };

    const onResponseChunk = (...args: unknown[]) => {
      const chunk = args[0] as string;
      captureEvent("response:chunk", { content: chunk });
    };
    const onToolStart = (...args: unknown[]) => {
      const data = args[0] as {
        tool?: string;
        toolName?: string;
        timestamp: number;
      };
      captureEvent("tool:start", {
        ...data,
        toolName: data.toolName ?? data.tool,
      });
    };
    const onToolEnd = (...args: unknown[]) => {
      const data = args[0] as {
        tool?: string;
        toolName?: string;
        success?: boolean;
        responseTime?: number;
        duration?: number;
        error?: string;
        result?: { uiComponent?: boolean; [key: string]: unknown };
        [key: string]: unknown;
      };
      const toolName = data.toolName ?? data.tool;
      const responseTime =
        data.responseTime ?? (data.duration as number | undefined);
      const success =
        data.success ?? (data.error !== undefined ? false : undefined);
      const augmented = {
        ...data,
        toolName,
        ...(responseTime !== undefined ? { responseTime } : {}),
        ...(success !== undefined ? { success } : {}),
        ...(data.error !== undefined ? { error: data.error } : {}),
      };
      captureEvent("tool:end", augmented);

      if (augmented.result && augmented.result.uiComponent === true) {
        captureEvent("ui-component", {
          toolName,
          componentData: augmented.result,
          timestamp: Date.now(),
          ...(success !== undefined ? { success } : {}),
          ...(responseTime !== undefined ? { responseTime } : {}),
        });
      }
    };
    const onUIComponent = (...args: unknown[]) => {
      captureEvent("ui-component", args[0]);
    };
    const onHITLRequest = (...args: unknown[]) => {
      captureEvent("hitl:confirmation-request", args[0]);
    };
    const onHITLResponse = (...args: unknown[]) => {
      captureEvent("hitl:confirmation-response", args[0]);
    };

    this.emitter.on("response:chunk", onResponseChunk);
    this.emitter.on("tool:start", onToolStart);
    this.emitter.on("tool:end", onToolEnd);
    this.emitter.on("ui-component", onUIComponent);
    this.emitter.on("hitl:confirmation-request", onHITLRequest);
    this.emitter.on("hitl:confirmation-response", onHITLResponse);

    const cleanup = () => {
      this.emitter.off("response:chunk", onResponseChunk);
      this.emitter.off("tool:start", onToolStart);
      this.emitter.off("tool:end", onToolEnd);
      this.emitter.off("ui-component", onUIComponent);
      this.emitter.off("hitl:confirmation-request", onHITLRequest);
      this.emitter.off("hitl:confirmation-response", onHITLResponse);
    };

    return { eventSequence, cleanup };
  }

  /**
   * Handle fallback when the primary stream returns 0 chunks.
   * Yields chunks from a fallback provider and updates metadata accordingly.
   */
  private async *handleStreamFallback(
    metadata: {
      fallbackAttempted: boolean;
      guardrailsBlocked: boolean;
      error: string | undefined;
      fallbackProvider: string | undefined;
      fallbackModel: string | undefined;
    },
    streamState: {
      finishReason: string;
      toolCalls: StreamToolCall[];
      toolResults: StreamToolResult[];
    },
    originalPrompt: string | undefined,
    enhancedOptions: StreamOptions,
    providerName: string,
    appendContent: (content: string) => void,
  ): AsyncGenerator<
    | { content: string }
    | { type: "audio"; audio: AudioChunk }
    | { type: "image"; imageOutput: { base64: string } }
  > {
    metadata.fallbackAttempted = true;
    const errorMsg =
      "Stream completed with 0 chunks (possible guardrails block)";
    metadata.error = errorMsg;

    // Record a failed-provider span for the primary provider that returned 0 chunks
    try {
      const traceCtx = this._metricsTraceContext;
      let failedSpan = SpanSerializer.createGenerationSpan({
        provider: providerName,
        model: enhancedOptions.model || "unknown",
        name: `gen_ai.${providerName}.stream.failed`,
        traceId: traceCtx?.traceId,
        parentSpanId: traceCtx?.parentSpanId,
      });
      failedSpan = SpanSerializer.endSpan(failedSpan, SpanStatus.ERROR);
      failedSpan.statusMessage = errorMsg;
      failedSpan.durationMs = 0;
      this.metricsAggregator.recordSpan(failedSpan);
      getMetricsAggregator().recordSpan(failedSpan);
    } catch {
      /* non-blocking */
    }

    // BZ-1341: Support fallback provider override via options or env vars
    const optFallbackProvider =
      enhancedOptions.fallbackProvider?.trim() || undefined;
    const optFallbackModel = enhancedOptions.fallbackModel?.trim() || undefined;
    const envFallbackProvider =
      process.env.FALLBACK_PROVIDER?.trim() || undefined;
    const envFallbackModel = process.env.FALLBACK_MODEL?.trim() || undefined;

    const modelConfigRoute = ModelRouter.getFallbackRoute(
      originalPrompt || enhancedOptions.input.text || "",
      {
        provider: providerName,
        model: enhancedOptions.model || "gpt-4o",
        reasoning: "primary failed",
        confidence: 0.5,
      },
      { fallbackStrategy: "auto" },
    );

    const fallbackRoute = {
      ...modelConfigRoute,
      provider:
        optFallbackProvider ?? envFallbackProvider ?? modelConfigRoute.provider,
      model: optFallbackModel ?? envFallbackModel ?? modelConfigRoute.model,
    };

    logger.warn("Retrying with fallback provider", {
      originalProvider: providerName,
      fallbackProvider: fallbackRoute.provider,
      fallbackModel: fallbackRoute.model,
      fallbackSource:
        optFallbackProvider || optFallbackModel
          ? "options"
          : envFallbackProvider || envFallbackModel
            ? "env"
            : "model_config",
      reason: errorMsg,
    });

    try {
      const fallbackProvider = await AIProviderFactory.createProvider(
        fallbackRoute.provider,
        fallbackRoute.model,
        true,
        undefined,
        undefined,
        this.resolveCredentials(enhancedOptions.credentials),
      );

      // Ensure fallback provider can execute tools
      fallbackProvider.setupToolExecutor(
        {
          customTools: this.getCustomTools(),
          executeTool: (toolName: string, params: unknown) =>
            this.executeTool(toolName, params, {
              disableToolCache: enhancedOptions.disableToolCache,
            }),
        },
        "NeuroLink.fallbackStream",
      );

      // Prefer the caller-supplied / compacted conversation messages that were
      // threaded through options.  Only fall back to memory when no explicit
      // history was provided — this preserves caller-supplied empty arrays
      // (which signal "no prior context") and avoids resurrecting stale memory.
      const conversationMessages =
        enhancedOptions.conversationMessages !== undefined
          ? enhancedOptions.conversationMessages
          : await getConversationMessages(this.conversationMemory, {
              prompt: enhancedOptions.input.text,
              context: enhancedOptions.context as Record<string, unknown>,
            } as TextGenerationOptions);

      const fallbackResult = await fallbackProvider.stream({
        ...enhancedOptions,
        model: fallbackRoute.model,
        conversationMessages,
      });
      const fallbackToolCalls = fallbackResult.toolCalls ?? [];
      const fallbackToolResults = fallbackResult.toolResults ?? [];
      if (fallbackToolCalls.length > 0 || fallbackToolResults.length > 0) {
        streamState.toolCalls = fallbackToolCalls;
        streamState.toolResults = fallbackToolResults;
        streamState.finishReason =
          fallbackResult.finishReason ?? streamState.finishReason;
      }

      let fallbackChunkCount = 0;
      for await (const fallbackChunk of fallbackResult.stream) {
        fallbackChunkCount++;
        if (
          fallbackChunk &&
          "content" in fallbackChunk &&
          typeof fallbackChunk.content === "string"
        ) {
          appendContent(fallbackChunk.content);
          this.emitter.emit("response:chunk", fallbackChunk.content);
        }
        yield fallbackChunk;
      }

      if (
        fallbackChunkCount === 0 &&
        fallbackToolCalls.length === 0 &&
        fallbackToolResults.length === 0
      ) {
        throw new Error(
          `Fallback provider ${fallbackRoute.provider} also returned 0 chunks`,
        );
      }

      // Fallback succeeded - likely guardrails blocked primary
      metadata.fallbackProvider = fallbackRoute.provider;
      metadata.fallbackModel = fallbackRoute.model;
      metadata.guardrailsBlocked = true;
    } catch (fallbackError) {
      const fallbackErrorMsg =
        fallbackError instanceof Error
          ? fallbackError.message
          : String(fallbackError);
      metadata.error = `${errorMsg}; Fallback failed: ${fallbackErrorMsg}`;
      logger.error("Fallback provider failed", {
        fallbackProvider: fallbackRoute.provider,
        error: fallbackErrorMsg,
      });
      throw fallbackError;
    }
  }

  /**
   * Store conversation memory after stream consumption is complete (called from finally block).
   * Handles conversation memory storage in the background.
   */
  private async storeStreamConversationMemory(params: {
    enhancedOptions: StreamOptions;
    providerName: string;
    originalPrompt: string | undefined;
    accumulatedContent: string;
    startTime: number;
    eventSequence: Array<{
      type: string;
      seq: number;
      timestamp: number;
      [key: string]: unknown;
    }>;
  }): Promise<void> {
    const {
      enhancedOptions,
      providerName,
      originalPrompt,
      accumulatedContent,
      startTime,
      eventSequence,
    } = params;

    // Guard: skip storing if no meaningful content was produced (no text AND no tool activity)
    const hasToolEvents = eventSequence.some(
      (e) => e.type === "tool:start" || e.type === "tool:end",
    );
    if (!accumulatedContent.trim() && !hasToolEvents) {
      logger.warn(
        "[NeuroLink.stream] Skipping conversation turn storage — no text content or tool activity",
        {
          sessionId: (enhancedOptions.context as Record<string, unknown>)
            ?.sessionId,
        },
      );
      return;
    }

    // Store memory after stream consumption is complete
    if (this.conversationMemory && enhancedOptions.context?.sessionId) {
      const sessionId = (enhancedOptions.context as Record<string, unknown>)
        ?.sessionId as string;
      const userId = (enhancedOptions.context as Record<string, unknown>)
        ?.userId as string;
      let providerDetails: ProviderDetails | undefined;
      if (enhancedOptions.model) {
        providerDetails = {
          provider: providerName,
          model: enhancedOptions.model,
        };
      }

      const memStoreStart = Date.now();
      try {
        await this.conversationMemory.storeConversationTurn({
          sessionId,
          userId,
          userMessage: originalPrompt ?? "",
          aiResponse: accumulatedContent,
          startTimeStamp: new Date(startTime),
          providerDetails,
          enableSummarization: enhancedOptions.enableSummarization,
          events: eventSequence.length > 0 ? eventSequence : undefined,
          requestId: (enhancedOptions.context as Record<string, unknown>)
            ?.requestId as string | undefined,
        });

        this.recordMemorySpan(
          "memory.store",
          { "memory.operation": "store", "memory.path": "stream" },
          Date.now() - memStoreStart,
          SpanStatus.OK,
        );

        logger.debug(
          "[NeuroLink.stream] Stored conversation turn with events",
          {
            sessionId,
            eventCount: eventSequence.length,
            eventTypes: [...new Set(eventSequence.map((e) => e.type))],
          },
        );
      } catch (error) {
        this.recordMemorySpan(
          "memory.store",
          { "memory.operation": "store", "memory.path": "stream" },
          Date.now() - memStoreStart,
          SpanStatus.ERROR,
          error instanceof Error ? error.message : String(error),
        );
        logger.warn("Failed to store stream conversation turn", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (
      this.shouldWriteMemory(
        enhancedOptions.memory,
        enhancedOptions.context?.userId,
        accumulatedContent,
      )
    ) {
      this.storeMemoryInBackground(
        originalPrompt ?? "",
        accumulatedContent.trim(),
        enhancedOptions.context?.userId as string,
        enhancedOptions.memory?.additionalUsers,
      );
    }
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
      typeof (options.input.audio.frames as AsyncIterable<Buffer>)[
        Symbol.asyncIterator
      ] === "function"
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
      | { content: string }
      | { type: "audio"; audio: AudioChunk }
      | { type: "image"; imageOutput: { base64: string } }
    >;
    provider: string;
    usage?: { input: number; output: number; total: number };
    model?: string;
    finishReason?: string;
    toolCalls: StreamToolCall[];
    toolResults: StreamToolResult[];
    analytics?: AnalyticsData | Promise<AnalyticsData>;
  }> {
    // Simplified placeholder - in the actual implementation this would contain the complex MCP stream logic
    const providerName = await getBestProvider(options.provider);
    const provider = await AIProviderFactory.createProvider(
      providerName,
      options.model,
      !options.disableTools, // Pass disableTools as inverse of enableMCP
      this as unknown as UnknownRecord, // Pass SDK instance
      options.region, // Pass region parameter
      this.resolveCredentials(options.credentials),
    );

    // Propagate trace context for parent-child span hierarchy
    provider.setTraceContext(this._metricsTraceContext);

    // Enable tool execution for the provider using BaseProvider method
    provider.setupToolExecutor(
      {
        customTools: this.getCustomTools(),
        executeTool: (toolName: string, params: unknown) =>
          this.executeTool(toolName, params, {
            disableToolCache: options.disableToolCache,
          }),
      },
      "NeuroLink.createMCPStream",
    );

    // 🔧 FIX: Get available tools and create tool-aware system prompt
    // Use SAME pattern as tryMCPGeneration (generate mode)
    let availableTools = await this.getAllAvailableTools();

    // Apply per-call tool filtering for system prompt tool descriptions
    availableTools = this.applyToolInfoFiltering(availableTools, options);

    // Skip tool prompt injection if skipToolPromptInjection is true
    const enhancedSystemPrompt = options.skipToolPromptInjection
      ? options.systemPrompt || ""
      : this.createToolAwareSystemPrompt(options.systemPrompt, availableTools);

    // Get conversation messages for context.
    // If the caller already supplied conversationMessages (e.g. proxy routes
    // forwarding a multi-turn Claude request), honour them — including an
    // explicit empty array, which signals "no prior context". Otherwise fall
    // back to the conversation memory store (interactive CLI / SDK sessions).
    const hasCallerConversationHistory =
      options.conversationMessages !== undefined;
    const resolvedConversationMessages = hasCallerConversationHistory
      ? options.conversationMessages
      : await getConversationMessages(this.conversationMemory, {
          ...options,
          prompt: options.input.text,
          context: options.context,
        } as TextGenerationOptions);
    // Make the resolved messages the single source of truth so downstream
    // consumers (compaction, fallback streams) reuse them instead of
    // reloading from conversationMemory.
    options.conversationMessages = resolvedConversationMessages;
    let conversationMessages = resolvedConversationMessages;

    // Pre-generation budget check for streaming
    const streamBudget = checkContextBudget({
      provider: providerName,
      model: options.model,
      maxTokens: options.maxTokens,
      systemPrompt: enhancedSystemPrompt,
      conversationMessages: conversationMessages as Array<{
        role: string;
        content: string;
      }>,
      currentPrompt: options.input.text,
      toolDefinitions: availableTools,
    });

    const streamMessageCount = conversationMessages?.length || 0;
    const streamCompactionSessionId = this.getCompactionSessionId(options);
    if (
      streamBudget.shouldCompact &&
      (hasCallerConversationHistory || this.conversationMemory) &&
      streamMessageCount >
        (this.lastCompactionMessageCount.get(streamCompactionSessionId) ?? 0)
    ) {
      const compactor = new ContextCompactor({
        provider: providerName,
        summarizationProvider:
          this.conversationMemoryConfig?.conversationMemory
            ?.summarizationProvider,
        summarizationModel:
          this.conversationMemoryConfig?.conversationMemory?.summarizationModel,
      });
      const compactionResult = await compactor.compact(
        conversationMessages as import("./types/index.js").ChatMessage[],
        streamBudget.availableInputTokens,
        this.conversationMemoryConfig?.conversationMemory,
        (options.context as Record<string, unknown> | undefined)?.requestId as
          | string
          | undefined,
      );
      if (compactionResult.compacted) {
        const repairedResult = repairToolPairs(compactionResult.messages);
        conversationMessages = repairedResult.messages;
        // Keep options.conversationMessages in sync so downstream consumers
        // (e.g. handleStreamFallback) use the compacted history rather than
        // re-reading from conversationMemory.
        options.conversationMessages = conversationMessages;
        this.lastCompactionMessageCount.set(
          streamCompactionSessionId,
          conversationMessages.length,
        );
      }

      // POST-COMPACTION BUDGET RE-CHECK (mirrors tryMCPGeneration / directProviderGeneration)
      const postCompactBudget = checkContextBudget({
        provider: providerName,
        model: options.model,
        maxTokens: options.maxTokens,
        systemPrompt: enhancedSystemPrompt,
        conversationMessages: conversationMessages as Array<{
          role: string;
          content: string;
        }>,
        currentPrompt: options.input.text,
        toolDefinitions: availableTools,
      });

      if (!postCompactBudget.withinBudget) {
        logger.warn(
          "[NeuroLink] Stream: post-compaction still over budget, emergency truncation",
          {
            estimatedTokens: postCompactBudget.estimatedInputTokens,
            availableTokens: postCompactBudget.availableInputTokens,
            overagePercent: Math.round(
              (postCompactBudget.usageRatio - 1.0) * 100,
            ),
          },
        );

        conversationMessages = emergencyContentTruncation(
          conversationMessages as import("./types/index.js").ChatMessage[],
          postCompactBudget.availableInputTokens,
          postCompactBudget.breakdown,
          providerName,
        );
        // Keep options in sync after emergency truncation so fallback paths
        // use the truncated history.
        options.conversationMessages = conversationMessages;

        const finalBudget = checkContextBudget({
          provider: providerName,
          model: options.model,
          maxTokens: options.maxTokens,
          systemPrompt: enhancedSystemPrompt,
          conversationMessages: conversationMessages as Array<{
            role: string;
            content: string;
          }>,
          currentPrompt: options.input.text,
          toolDefinitions: availableTools,
        });

        if (!finalBudget.withinBudget) {
          // Clear watermark so handleContextOverflow recovery can re-compact
          this.lastCompactionMessageCount.delete(streamCompactionSessionId);

          throw new ContextBudgetExceededError(
            `Stream context exceeds model budget after all compaction stages. ` +
              `Estimated: ${finalBudget.estimatedInputTokens} tokens, ` +
              `Budget: ${finalBudget.availableInputTokens} tokens.`,
            {
              estimatedTokens: finalBudget.estimatedInputTokens,
              availableTokens: finalBudget.availableInputTokens,
              stagesUsed: compactionResult.stagesUsed,
              breakdown: finalBudget.breakdown,
            },
          );
        }
      }
    }

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

    return {
      stream: streamResult.stream,
      provider: providerName,
      usage: streamResult.usage,
      model: streamResult.model || options.model,
      finishReason: streamResult.finishReason,
      toolCalls: streamResult.toolCalls ?? [],
      toolResults: streamResult.toolResults ?? [],
      analytics: streamResult.analytics,
    };
  }

  /**
   * Process stream result
   */
  private async processStreamResult(
    _stream: AsyncIterable<
      | { content: string }
      | { type: "audio"; audio: AudioChunk }
      | { type: "image"; imageOutput: { base64: string } }
    >,
    _options: StreamOptions,
    _factoryResult: unknown,
  ): Promise<{
    content: string;
    usage?: TokenUsage;
    finishReason: string;
    toolCalls: StreamToolCall[];
    toolResults: StreamToolResult[];
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
      toolCalls: StreamToolCall[];
      toolResults: StreamToolResult[];
      analytics?: AnalyticsData;
      evaluation?: EvaluationData;
    },
    stream: AsyncIterable<
      | { content: string }
      | { type: "audio"; audio: AudioChunk }
      | { type: "image"; imageOutput: { base64: string } }
    >,
    config: {
      providerName: string;
      options: StreamOptions;
      startTime: number;
      responseTime: number;
      streamId: string;
      fallback?: boolean;
      guardrailsBlocked?: boolean;
      error?: string;
      events?: Array<{
        type: string;
        seq: number;
        timestamp: number;
        [key: string]: unknown;
      }>;
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
      events:
        config.events && config.events.length > 0 ? config.events : undefined,
      metadata: {
        streamId: config.streamId,
        startTime: config.startTime,
        responseTime: config.responseTime,
        fallback: config.fallback || false,
        guardrailsBlocked: config.guardrailsBlocked,
        error: config.error,
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

    // S1 fix: Emit stream:error so the Pipeline B listener creates an error span.
    // S8 fix: The old direct SpanSerializer.createGenerationSpan block is removed —
    // the stream:error listener now handles span creation, avoiding duplication.
    try {
      this.emitter.emit("stream:error", {
        content: error instanceof Error ? error.message : String(error),
        metadata: {
          errorName: error instanceof Error ? error.name : "UnknownError",
          durationMs: Date.now() - startTime,
          chunkCount: 0,
        },
        provider: options.provider || "unknown",
        model: options.model || "unknown",
      });
    } catch {
      /* non-blocking */
    }

    const originalPrompt = options.input.text;
    const responseTime = Date.now() - startTime;
    const providerName = await getBestProvider(options.provider);
    const provider = await AIProviderFactory.createProvider(
      providerName,
      options.model,
      true,
      undefined,
      undefined,
      this.resolveCredentials(options.credentials),
    );
    const fallbackStreamResult = await provider.stream({
      input: { text: options.input.text },
      model: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      conversationMessages: options.conversationMessages,
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
        if (fallbackAccumulatedContent.trim()) {
          logger.info(
            `[NeuroLink.handleStreamError] stream() - COMPLETE SUCCESS (fallback)`,
            {
              provider: providerName,
              model: options.model,
              responseTimeMs: Date.now() - startTime,
              contentLength: fallbackAccumulatedContent.length,
            },
          );

          // S6 fix: Emit stream:complete after successful fallback so Pipeline B records it
          try {
            self.emitter.emit("stream:complete", {
              content: fallbackAccumulatedContent,
              provider: providerName,
              model: options.model || "unknown",
              finishReason: "stop",
              metadata: {
                durationMs: Date.now() - startTime,
                chunkCount: 0,
                totalLength: fallbackAccumulatedContent.length,
                isFallback: true,
                finishReason: "stop",
              },
            });
          } catch {
            /* non-blocking */
          }
        }

        // Store memory after fallback stream consumption is complete
        // Guard: skip storing if fallback accumulated content is empty
        if (
          self.conversationMemory &&
          enhancedOptions?.context?.sessionId &&
          fallbackAccumulatedContent.trim()
        ) {
          const sessionId = (
            enhancedOptions?.context as Record<string, unknown>
          )?.sessionId as string;
          const userId = (enhancedOptions?.context as Record<string, unknown>)
            ?.userId as string;
          let providerDetails: ProviderDetails | undefined;
          if (options.model) {
            providerDetails = {
              provider: providerName,
              model: options.model,
            };
          }

          const memStoreStart = Date.now();
          try {
            await self.conversationMemory.storeConversationTurn({
              sessionId: sessionId || (options.context?.sessionId as string),
              userId: userId || (options.context?.userId as string),
              userMessage: originalPrompt ?? "",
              aiResponse: fallbackAccumulatedContent,
              startTimeStamp: new Date(startTime),
              providerDetails,
              enableSummarization: enhancedOptions?.enableSummarization,
              requestId:
                ((
                  enhancedOptions?.context as
                    | Record<string, unknown>
                    | undefined
                )?.requestId as string | undefined) ||
                ((options.context as Record<string, unknown> | undefined)
                  ?.requestId as string | undefined),
            });
            self.recordMemorySpan(
              "memory.store",
              { "memory.operation": "store", "memory.path": "fallback-stream" },
              Date.now() - memStoreStart,
              SpanStatus.OK,
            );
          } catch (error) {
            self.recordMemorySpan(
              "memory.store",
              { "memory.operation": "store", "memory.path": "fallback-stream" },
              Date.now() - memStoreStart,
              SpanStatus.ERROR,
              error instanceof Error ? error.message : String(error),
            );
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
    this.emitter.emit(
      "tool:start",
      createToolEventPayload(toolName, {
        input,
        timestamp: startTime,
        executionId,
      }),
    );

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
    this.emitter.emit(
      "tool:end",
      createToolEventPayload(toolName, {
        result,
        error,
        success,
        responseTime: duration,
        timestamp: endTime,
        duration,
        executionId: finalExecutionId,
      }),
    );

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
  registerTool(
    name: string,
    tool: MCPExecutableTool,
    options?: ToolRegistrationOptions,
  ): void {
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

      // Wrap execute with per-tool timeout if specified at registration.
      // Uses AbortSignal.timeout() composed with any parent signal from the AI SDK.
      // This ensures the timeout works regardless of the execution path
      // (direct executeTool() or AI SDK generateText() tool calling).
      if (
        options?.timeout !== undefined &&
        options.timeout > 0 &&
        Number.isFinite(options.timeout) &&
        typeof convertedTool.execute === "function"
      ) {
        const originalExecute = convertedTool.execute;
        const toolTimeout = options.timeout;
        const toolName = name;
        convertedTool.execute = async (...args: unknown[]) => {
          const timeoutSignal = AbortSignal.timeout(toolTimeout);
          // Compose with any parent abortSignal from ToolExecutionOptions
          const execOptions = args[1] as
            | { abortSignal?: AbortSignal }
            | undefined;
          const parentSignal = execOptions?.abortSignal;
          const composedSignal = parentSignal
            ? AbortSignal.any([parentSignal, timeoutSignal])
            : timeoutSignal;

          // Replace the abortSignal in execution options
          const augmentedContext = {
            ...execOptions,
            abortSignal: composedSignal,
          };

          return Promise.race([
            originalExecute(args[0], augmentedContext),
            new Promise<never>((_, reject) => {
              composedSignal.addEventListener(
                "abort",
                () => {
                  if (timeoutSignal.aborted) {
                    reject(ErrorFactory.toolTimeout(toolName, toolTimeout));
                  } else {
                    reject(
                      new DOMException(
                        "The operation was aborted",
                        "AbortError",
                      ),
                    );
                  }
                },
                { once: true },
              );
            }),
          ]);
        };
      }

      // SMART DEFAULTS: Use utility to eliminate boilerplate creation
      const mcpServerInfo = createCustomToolServerInfo(
        name,
        convertedTool,
        options?.timeout,
        options?.maxRetries,
      );

      // Register with toolRegistry using MCPServerInfo directly
      this.toolRegistry.registerServer(mcpServerInfo);

      // Emit tool registration success event
      this.emitter.emit("tools-register:end", {
        toolName: name,
        success: true,
        timestamp: Date.now(),
        timeoutMs: options?.timeout,
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

  // ==================== MCP Enhancement Public APIs ====================

  /**
   * Register a global tool middleware that runs on every tool execution.
   * Middleware receives the tool, params, context, and a next() function.
   * @param middleware - The middleware function to register
   * @returns this (for chaining)
   */
  useToolMiddleware(
    middleware: import("./types/index.js").ToolMiddleware,
  ): this {
    this.mcpToolMiddlewares.push(middleware);
    logger.debug(
      `[NeuroLink] Registered tool middleware (total: ${this.mcpToolMiddlewares.length})`,
    );
    return this;
  }

  /**
   * Get all registered tool middlewares
   */
  getToolMiddlewares(): import("./types/index.js").ToolMiddleware[] {
    return [...this.mcpToolMiddlewares];
  }

  /**
   * Flush any pending batched tool calls immediately
   */
  async flushToolBatch(): Promise<void> {
    if (this.mcpToolBatcher) {
      await this.mcpToolBatcher.flush();
    }
  }

  /**
   * Get the current MCP enhancements configuration
   */
  getMCPEnhancementsConfig(): MCPEnhancementsConfig | undefined {
    return this.mcpEnhancementsConfig;
  }

  /**
   * Update agentic loop report metadata for a conversation session.
   * Upserts a report entry by reportId — updates existing or adds new.
   * Only supported when using Redis conversation memory.
   *
   * @param sessionId The session identifier
   * @param report The agentic loop report metadata to upsert
   * @param userId Optional user identifier
   * @throws Error if conversation memory is not initialized or is not Redis-backed
   *
   * @example
   * ```typescript
   * await neurolink.updateAgenticLoopReport("session-123", {
   *   reportId: "report-abc",
   *   reportType: "META",
   *   reportStatus: "INPROGRESS",
   * });
   * ```
   */
  async updateAgenticLoopReport(
    sessionId: string,
    report: import("./types/index.js").AgenticLoopReportMetadata,
    userId?: string,
  ): Promise<void> {
    if (!this.conversationMemory) {
      throw new ConversationMemoryError(
        "Conversation memory is not initialized. Enable conversationMemory in NeuroLink options.",
        "CONFIG_ERROR",
      );
    }

    // Check if the memory manager is Redis-backed (has updateAgenticLoopReport method)
    if (
      !("updateAgenticLoopReport" in this.conversationMemory) ||
      typeof this.conversationMemory.updateAgenticLoopReport !== "function"
    ) {
      throw new ConversationMemoryError(
        "updateAgenticLoopReport is only supported with Redis conversation memory.",
        "CONFIG_ERROR",
      );
    }

    await withTimeout(
      (
        this
          .conversationMemory as import("./core/redisConversationMemoryManager.js").RedisConversationMemoryManager
      ).updateAgenticLoopReport(sessionId, userId, report),
      5000,
    );
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
        inputSchema:
          typeof tool.inputSchema === "object" && tool.inputSchema !== null
            ? tool.inputSchema
            : typeof tool.parameters === "object" && tool.parameters !== null
              ? tool.parameters
              : {},
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

    // Inject file reference tools so they reach the Vercel AI SDK's tools parameter.
    // These tools are bound to this.fileRegistry and allow the LLM to read/search
    // files on demand instead of having all file content dumped into the prompt.
    //
    // createFileTools() returns Vercel AI SDK tool() objects with Zod `parameters`.
    // We pass `parameters` as `inputSchema` so processCustomTools() in ToolsManager
    // recognises it as a Zod schema (priority 2) and serialises it correctly for
    // every provider — including Vertex AI which rejects bare `{}` schemas.
    // Cache to avoid redundant allocations per generate/stream call (FRT-6).
    if (!this.cachedFileTools) {
      this.cachedFileTools = createFileTools(this.fileRegistry);
    }
    const fileTools = this.cachedFileTools;
    for (const [toolName, toolDef] of Object.entries(fileTools)) {
      if (!toolMap.has(toolName)) {
        const toolDefRecord = toolDef as Record<string, unknown>;
        const toolParams =
          toolDefRecord.inputSchema ?? toolDefRecord.parameters;
        toolMap.set(toolName, {
          name: toolName,
          description: toolDef.description || `File tool: ${toolName}`,
          inputSchema:
            typeof toolParams === "object" && toolParams !== null
              ? toolParams
              : { type: "object", properties: {} },
          execute: async (params: unknown) => {
            return await (
              toolDef.execute as (
                params: unknown,
                ctx: unknown,
              ) => Promise<unknown>
            )(params, {
              toolCallId: `file-tool-${Date.now()}`,
              messages: [],
            });
          },
        });
      }
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
   * Get all registered in-memory servers as a Map for ID-based lookup.
   *
   * This method is primarily used when you need O(1) lookup by server ID,
   * such as in `testMCPServer()` for checking if a specific server exists.
   *
   * @returns Map of server IDs to MCPServerInfo
   * @see {@link getInMemoryServerInfos} for array-based access (useful for iteration/spreading)
   */
  getInMemoryServers(): Map<string, MCPServerInfo> {
    // Reuse getInMemoryServerInfos() to avoid duplicating filter logic
    const serverInfos = this.getInMemoryServerInfos();
    const serverMap = new Map<string, MCPServerInfo>();

    for (const serverInfo of serverInfos) {
      serverMap.set(serverInfo.id, serverInfo);
    }

    return serverMap;
  }

  /**
   * Get in-memory servers as an array of MCPServerInfo.
   *
   * This method is the canonical source for in-memory server filtering.
   * It fetches from the centralized tool registry and filters servers
   * with the "in-memory" category.
   *
   * Use this method when you need to:
   * - Iterate over all in-memory servers
   * - Spread servers into another array (e.g., in `listMCPServers()`)
   * - Get a count of in-memory servers
   *
   * @returns Array of MCPServerInfo for in-memory servers
   * @see {@link getInMemoryServers} for Map-based access (useful for ID lookups)
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
      /** Disable tool result caching for this call */
      disableToolCache?: boolean;
      /** Bypass the request batcher for this call */
      bypassBatcher?: boolean;
      authContext?: {
        userId?: string;
        sessionId?: string;
        user?: Record<string, unknown>;
        [key: string]: unknown;
      };
    },
  ): Promise<T> {
    if (this.mcpToolBatcher && !options?.bypassBatcher) {
      return this.mcpToolBatcher.execute(toolName, params) as Promise<T>;
    }

    const executionContext = this.createToolExecutionContext(
      toolName,
      params,
      options,
    );
    return tracers.mcp.startActiveSpan(
      "neurolink.tool.execute",
      {
        attributes: {
          "tool.name": toolName,
          "tool.type": executionContext.toolType,
          "tool.input_size": executionContext.inputSize,
          "tool.input_preview": executionContext.truncatedInput,
        },
      },
      (toolSpan) =>
        this.executeToolWithSpan<T>(
          toolName,
          params,
          options,
          executionContext,
          toolSpan,
        ),
    ) as Promise<T>;
  }

  private createToolExecutionContext(
    toolName: string,
    params: unknown,
    options:
      | {
          timeout?: number;
          maxRetries?: number;
          retryDelayMs?: number;
          disableToolCache?: boolean;
          bypassBatcher?: boolean;
          authContext?: {
            userId?: string;
            sessionId?: string;
            user?: Record<string, unknown>;
            [key: string]: unknown;
          };
        }
      | undefined,
  ): {
    functionTag: string;
    executionStartTime: number;
    externalTool:
      | ReturnType<NeuroLink["externalServerManager"]["getAllTools"]>[number]
      | undefined;
    toolType: "mcp" | "custom" | "external";
    inputSize: number;
    truncatedInput: string;
    options: typeof options;
  } {
    const externalTool = this.externalServerManager
      .getAllTools()
      .find((tool) => tool.name === toolName);
    const toolType = externalTool
      ? "mcp"
      : this.getCustomTools().has(toolName)
        ? "custom"
        : "external";
    const inputStr =
      typeof params === "string"
        ? params
        : params
          ? JSON.stringify(params)
          : "";

    return {
      functionTag: "NeuroLink.executeTool",
      executionStartTime: Date.now(),
      externalTool,
      toolType,
      inputSize: inputStr.length,
      truncatedInput:
        inputStr.length > 2048 ? inputStr.substring(0, 2048) : inputStr,
      options,
    };
  }

  private async executeToolWithSpan<T>(
    toolName: string,
    params: unknown,
    options:
      | {
          timeout?: number;
          maxRetries?: number;
          retryDelayMs?: number;
          disableToolCache?: boolean;
          bypassBatcher?: boolean;
          authContext?: {
            userId?: string;
            sessionId?: string;
            user?: Record<string, unknown>;
            [key: string]: unknown;
          };
        }
      | undefined,
    executionContext: ReturnType<NeuroLink["createToolExecutionContext"]>,
    toolSpan: ReturnType<typeof tracers.mcp.startSpan>,
  ): Promise<T> {
    try {
      const prepared = await this.prepareToolExecutionState(
        toolName,
        params,
        options,
        executionContext,
      );
      return await this.runPreparedToolExecution(
        toolName,
        params,
        prepared,
        executionContext,
        toolSpan,
      );
    } catch (outerError) {
      if (!(outerError instanceof NeuroLinkError)) {
        const errMsg =
          outerError instanceof Error ? outerError.message : String(outerError);
        toolSpan.recordException(
          outerError instanceof Error ? outerError : new Error(errMsg),
        );
        toolSpan.setStatus({ code: SpanStatusCode.ERROR, message: errMsg });
      }
      throw outerError;
    } finally {
      toolSpan.end();
    }
  }

  private async prepareToolExecutionState(
    toolName: string,
    params: unknown,
    options:
      | {
          timeout?: number;
          maxRetries?: number;
          retryDelayMs?: number;
          disableToolCache?: boolean;
          bypassBatcher?: boolean;
          authContext?: {
            userId?: string;
            sessionId?: string;
            user?: Record<string, unknown>;
            [key: string]: unknown;
          };
        }
      | undefined,
    executionContext: ReturnType<NeuroLink["createToolExecutionContext"]>,
  ): Promise<{
    finalOptions: {
      timeout: number;
      maxRetries: number;
      retryDelayMs: number;
      authContext:
        | {
            userId?: string;
            sessionId?: string;
            user?: Record<string, unknown>;
            [key: string]: unknown;
          }
        | undefined;
      disableToolCache: boolean | undefined;
    };
    startMemory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
    circuitBreaker: CircuitBreaker;
    breakerKey: string;
    metrics: {
      totalExecutions: number;
      successfulExecutions: number;
      failedExecutions: number;
      averageExecutionTime: number;
      lastExecutionTime: number;
      errorCategories: Record<string, number>;
    };
  }> {
    logger.debug(
      `[${executionContext.functionTag}] Tool execution requested:`,
      {
        toolName,
        params: isNonNullObject(params)
          ? transformParamsForLogging(params)
          : params,
        hasExternalManager: !!this.externalServerManager,
      },
    );
    logger.debug(`Tool execution detailed analysis`, {
      toolName,
      executionStartTime: executionContext.executionStartTime,
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
    this.emitter.emit(
      "tool:start",
      createToolEventPayload(toolName, {
        timestamp: executionContext.executionStartTime,
        input: params,
      }),
    );

    const toolInfo = this.toolRegistry.getToolInfo(toolName);
    const finalOptions = {
      timeout:
        options?.timeout ??
        toolInfo?.tool?.timeoutMs ??
        TOOL_TIMEOUTS.EXECUTION_DEFAULT_MS,
      maxRetries:
        options?.maxRetries ??
        toolInfo?.tool?.maxRetries ??
        RETRY_ATTEMPTS.DEFAULT,
      retryDelayMs: options?.retryDelayMs || RETRY_DELAYS.BASE_MS,
      authContext: options?.authContext,
      disableToolCache: options?.disableToolCache,
    };

    const { MemoryManager } = await import("./utils/performance.js");
    const startMemory = MemoryManager.getMemoryUsageMB();
    const breakerServerId =
      executionContext.externalTool?.serverId ||
      toolInfo?.tool?.serverId ||
      "unknown";
    const breakerKey = `${breakerServerId}.${toolName}`;

    let circuitBreaker = this.toolCircuitBreakers.get(breakerKey);
    if (!circuitBreaker) {
      circuitBreaker = new CircuitBreaker(
        CIRCUIT_BREAKER.FAILURE_THRESHOLD,
        CIRCUIT_BREAKER_RESET_MS,
      );
      this.toolCircuitBreakers.set(breakerKey, circuitBreaker);
    }

    let metrics = this.toolExecutionMetrics.get(toolName);
    if (!metrics) {
      metrics = {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        lastExecutionTime: 0,
        errorCategories: {},
      };
      this.toolExecutionMetrics.set(toolName, metrics);
    }
    metrics.totalExecutions++;

    return {
      finalOptions,
      startMemory,
      circuitBreaker,
      breakerKey,
      metrics,
    };
  }

  private async runPreparedToolExecution<T>(
    toolName: string,
    params: unknown,
    prepared: Awaited<ReturnType<NeuroLink["prepareToolExecutionState"]>>,
    executionContext: ReturnType<NeuroLink["createToolExecutionContext"]>,
    toolSpan: ReturnType<typeof tracers.mcp.startSpan>,
  ): Promise<T> {
    let toolRetryCount = 0;
    try {
      mcpLogger.debug(
        `[${executionContext.functionTag}] Executing tool: ${toolName}`,
        {
          toolName,
          params,
          options: prepared.finalOptions,
          circuitBreakerState: prepared.circuitBreaker.getState(),
        },
      );
      const result: T = await prepared.circuitBreaker.execute(async () => {
        return withRetry(
          async () =>
            withTimeout(
              this.executeToolInternal<T>(
                toolName,
                params,
                prepared.finalOptions,
              ),
              prepared.finalOptions.timeout,
              ErrorFactory.toolTimeout(toolName, prepared.finalOptions.timeout),
            ),
          {
            maxAttempts: prepared.finalOptions.maxRetries + 1,
            delayMs: prepared.finalOptions.retryDelayMs,
            isRetriable: isRetriableError,
            onRetry: (attempt, error) => {
              toolRetryCount = attempt;
              mcpLogger.warn(
                `[${executionContext.functionTag}] Retrying tool execution (attempt ${attempt})`,
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
      toolSpan.setAttribute("tool.retry_count", toolRetryCount);

      return await this.handleSuccessfulToolExecution(
        toolName,
        result,
        prepared,
        executionContext,
        toolSpan,
      );
    } catch (error) {
      // Ensure retry count is recorded even on failure
      toolSpan.setAttribute("tool.retry_count", toolRetryCount);
      return this.handleFailedToolExecution(
        toolName,
        params,
        error,
        prepared,
        executionContext,
        toolSpan,
      );
    }
  }

  private async handleSuccessfulToolExecution<T>(
    toolName: string,
    result: T,
    prepared: Awaited<ReturnType<NeuroLink["prepareToolExecutionState"]>>,
    executionContext: ReturnType<NeuroLink["createToolExecutionContext"]>,
    toolSpan: ReturnType<typeof tracers.mcp.startSpan>,
  ): Promise<T> {
    const executionTime = Date.now() - executionContext.executionStartTime;
    prepared.metrics.successfulExecutions++;
    prepared.metrics.lastExecutionTime = executionTime;
    prepared.metrics.averageExecutionTime =
      (prepared.metrics.averageExecutionTime *
        (prepared.metrics.successfulExecutions - 1) +
        executionTime) /
      prepared.metrics.successfulExecutions;

    const { MemoryManager } = await import("./utils/performance.js");
    const endMemory = MemoryManager.getMemoryUsageMB();
    const memoryDelta = endMemory.heapUsed - prepared.startMemory.heapUsed;
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

    mcpLogger.debug(
      `[${executionContext.functionTag}] Tool executed successfully`,
      {
        toolName,
        executionTime,
        memoryDelta,
        circuitBreakerState: prepared.circuitBreaker.getState(),
      },
    );

    const resultObj =
      result && typeof result === "object"
        ? (result as Record<string, unknown>)
        : undefined;
    const isToolError =
      (resultObj && "isError" in resultObj && resultObj.isError === true) ||
      (resultObj && "success" in resultObj && resultObj.success === false);

    const contentArr = isToolError
      ? (resultObj?.content as
          | Array<{ type?: string; text?: string }>
          | undefined)
      : undefined;
    const errorText = isToolError
      ? contentArr
          ?.filter((content) => content.type === "text" && content.text)
          .map((content) => content.text)
          .join(" ") ||
        (typeof resultObj?.error === "string"
          ? resultObj.error
          : "Unknown error")
      : undefined;

    if (isToolError) {
      try {
        await prepared.circuitBreaker.execute(async () => {
          throw new Error(`Tool ${toolName} returned isError:true`);
        });
      } catch {
        // Expected — intentionally records the failure
      }
      mcpLogger.debug(
        `[${executionContext.functionTag}] Circuit breaker failure recorded for isError result`,
        {
          toolName,
          circuitBreakerState: prepared.circuitBreaker.getState(),
          circuitBreakerFailures: prepared.circuitBreaker.getFailureCount(),
        },
      );

      const errorCategory = classifyMcpErrorMessage(
        errorText ?? "Unknown error",
      );
      const prefix = `[TOOL_ERROR: ${toolName} failed (${errorCategory})] `;

      if (resultObj && Array.isArray(contentArr)) {
        const clonedContent = contentArr.map((content) => ({ ...content }));
        for (const content of clonedContent) {
          if (content.type === "text" && content.text) {
            content.text = prefix + content.text;
            break;
          }
        }
        resultObj.content = clonedContent;
      }

      toolSpan.setAttribute(
        "tool.error.message",
        (errorText ?? "Unknown error").substring(0, 500),
      );
      toolSpan.setAttribute("tool.error.category", errorCategory);
      toolSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: `MCP tool returned isError: ${(errorText ?? "Unknown error").substring(0, 200)}`,
      });

      prepared.metrics.failedExecutions++;
      const prevSuccessful = prepared.metrics.successfulExecutions;
      prepared.metrics.successfulExecutions = Math.max(
        0,
        prepared.metrics.successfulExecutions - 1,
      );
      prepared.metrics.averageExecutionTime =
        prevSuccessful > 1
          ? (prepared.metrics.averageExecutionTime * prevSuccessful -
              executionTime) /
            (prevSuccessful - 1)
          : 0;
      const mappedCategory = mcpCategoryToErrorCategory(errorCategory);
      prepared.metrics.errorCategories[mappedCategory] =
        (prepared.metrics.errorCategories[mappedCategory] || 0) + 1;
    }

    this.emitToolEndEvent(
      toolName,
      executionContext.executionStartTime,
      !isToolError,
      result,
      isToolError && errorText ? new Error(errorText) : undefined,
    );
    toolSpan.setAttribute(
      "tool.result.status",
      isToolError ? "error" : "success",
    );
    toolSpan.setAttribute("tool.duration_ms", executionTime);

    return result;
  }

  private async handleFailedToolExecution<T>(
    toolName: string,
    params: unknown,
    error: unknown,
    prepared: Awaited<ReturnType<NeuroLink["prepareToolExecutionState"]>>,
    executionContext: ReturnType<NeuroLink["createToolExecutionContext"]>,
    toolSpan: ReturnType<typeof tracers.mcp.startSpan>,
  ): Promise<T> {
    prepared.metrics.failedExecutions++;
    const executionTime = Date.now() - executionContext.executionStartTime;

    if (error instanceof CircuitBreakerOpenError) {
      mcpLogger.warn(
        `[${executionContext.functionTag}] Tool blocked by circuit breaker: ${toolName}`,
        {
          toolName,
          breakerState: error.breakerState,
          retryAfter: error.retryAfter,
          retryAfterMs: error.retryAfterMs,
          failureCount: error.failureCount,
          executionTime,
        },
      );
      prepared.metrics.errorCategories[ErrorCategory.EXECUTION] =
        (prepared.metrics.errorCategories[ErrorCategory.EXECUTION] || 0) + 1;

      this.emitToolEndEvent(
        toolName,
        executionContext.executionStartTime,
        false,
        undefined,
        new Error(
          `Circuit breaker open for ${toolName} (state=${error.breakerState}, failures=${error.failureCount})`,
        ),
      );
      toolSpan.setAttribute("tool.result.status", "circuit_breaker_open");
      toolSpan.setAttribute("tool.duration_ms", executionTime);
      toolSpan.setAttribute("tool.circuit_breaker.state", error.breakerState);
      toolSpan.setAttribute(
        "tool.circuit_breaker.retry_after_ms",
        error.retryAfterMs,
      );
      toolSpan.setAttribute(
        "tool.circuit_breaker.failure_count",
        error.failureCount,
      );
      toolSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: `Circuit breaker open for ${toolName}: ${error.message}`,
      });

      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text:
              `TOOL TEMPORARILY UNAVAILABLE: "${toolName}" has been disabled after ` +
              `${error.failureCount} failures. ` +
              `This is a circuit breaker protection — do NOT retry this tool. ` +
              `It will become available again after ${Math.ceil(error.retryAfterMs / 1000)} seconds ` +
              `(at ${error.retryAfter}). ` +
              `Instead, inform the user that the operation failed and suggest trying again later.`,
          },
        ],
      } as T;
    }

    let structuredError: NeuroLinkError;
    if (error instanceof NeuroLinkError) {
      structuredError = error;
    } else if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        structuredError = ErrorFactory.toolTimeout(
          toolName,
          prepared.finalOptions.timeout,
        );
      } else if (error.message.includes("not found")) {
        const availableTools = await this.getAllAvailableTools();
        structuredError = ErrorFactory.toolNotFound(
          toolName,
          extractToolNames(availableTools.map((tool) => ({ name: tool.name }))),
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

    const category = structuredError.category || ErrorCategory.EXECUTION;
    prepared.metrics.errorCategories[category] =
      (prepared.metrics.errorCategories[category] || 0) + 1;

    this.emitToolEndEvent(
      toolName,
      executionContext.executionStartTime,
      false,
      undefined,
      structuredError,
    );
    this.emitter.emit("error", structuredError);

    structuredError = new NeuroLinkError({
      ...structuredError,
      context: {
        ...structuredError.context,
        executionTime,
        params,
        options: prepared.finalOptions,
        circuitBreakerState: prepared.circuitBreaker.getState(),
        circuitBreakerFailures: prepared.circuitBreaker.getFailureCount(),
        metrics: { ...prepared.metrics },
      },
    });

    logStructuredError(structuredError);
    toolSpan.setAttribute("tool.result.status", "error");
    toolSpan.setAttribute("tool.duration_ms", executionTime);
    toolSpan.recordException(structuredError);
    toolSpan.setStatus({
      code: SpanStatusCode.ERROR,
      message: structuredError.message,
    });

    throw structuredError;
  }

  /**
   * Internal tool execution method with MCP enhancements wired in:
   * - ToolCache: check/store cached results for non-destructive tools
   * - ToolRouter: route to best server when same tool exists on multiple servers
   * - Annotations: skip cache for destructive tools, retry safe tools on failure
   * - Middleware: apply global middleware chain before execution
   */
  private async executeToolInternal<T = unknown>(
    toolName: string,
    params: unknown,
    options: {
      timeout: number;
      maxRetries: number;
      retryDelayMs: number;
      disableToolCache?: boolean;
      authContext?: {
        userId?: string;
        sessionId?: string;
        user?: Record<string, unknown>;
        [key: string]: unknown;
      };
    },
  ): Promise<T> {
    const functionTag = "NeuroLink.executeToolInternal";

    // === MCP ENHANCEMENT: Infer annotations for cache/retry decisions ===
    const toolAnnotations = this.getToolAnnotationsForExecution(toolName);
    const isCacheEnabled =
      this.mcpToolResultCache &&
      !options.disableToolCache &&
      !this._disableToolCacheForCurrentRequest &&
      !toolAnnotations?.destructiveHint;
    const toolResultCache = this.mcpToolResultCache;

    // === MCP ENHANCEMENT: Cache check (before execution) ===
    // Scope cache key by auth context to prevent cross-user cache leaks
    const cacheParams =
      options.authContext || this.toolExecutionContext
        ? {
            __args: params,
            __ctx: options.authContext ?? this.toolExecutionContext,
          }
        : params;
    if (isCacheEnabled && toolResultCache) {
      const cached = toolResultCache.getCachedResult(toolName, cacheParams);
      if (cached !== undefined) {
        logger.debug(`[${functionTag}] Cache HIT for tool: ${toolName}`);
        return cached as T;
      }
    }

    // === MCP ENHANCEMENT: Middleware chain wrapper ===
    const executeWithMiddleware = async (
      executeFn: () => Promise<T>,
    ): Promise<T> => {
      if (this.mcpToolMiddlewares.length === 0) {
        return executeFn();
      }

      // Build middleware chain: each middleware calls next() to proceed
      let index = 0;
      const next = async (): Promise<unknown> => {
        if (index < this.mcpToolMiddlewares.length) {
          const middleware = this.mcpToolMiddlewares[index++];
          // Cast to MCPServerTool — middleware only inspects name/description/annotations
          const toolStub = {
            name: toolName,
            description: "",
            inputSchema: {},
            annotations: toolAnnotations,
            execute: async () => ({}),
          } as MCPServerTool;
          // Provide minimal context — elicitation is optional for most middleware
          const middlewareContext = {
            toolMeta: { name: toolName, annotations: toolAnnotations },
          } as unknown as import("./types/index.js").EnhancedExecutionContext;
          return middleware(toolStub, params, middlewareContext, next);
        }
        return executeFn();
      };

      return (await next()) as T;
    };

    // === Execute the tool (with middleware wrapper) ===
    const executeCore = async (): Promise<T> => {
      // Check external MCP servers
      const externalTools = this.externalServerManager.getAllTools();

      // === MCP ENHANCEMENT: ToolRouter for multi-server routing ===
      const matchingTools = externalTools.filter(
        (tool) => tool.name === toolName && tool.isAvailable,
      );

      let externalTool: ExternalMCPToolInfo | undefined;

      if (matchingTools.length > 1 && this.mcpToolRouter) {
        // Multiple servers have this tool — use router to pick the best one
        try {
          const mcpTool: MCPTool = {
            name: toolName,
            description: matchingTools[0].description ?? "",
            serverId: matchingTools[0].serverId,
            inputSchema: {},
          };
          const decision: RoutingDecision = this.mcpToolRouter.route(mcpTool);
          externalTool =
            matchingTools.find((t) => t.serverId === decision.serverId) ||
            matchingTools[0];
          logger.debug(
            `[${functionTag}] Router selected server: ${decision.serverId}`,
            {
              strategy: decision.strategy,
              confidence: decision.confidence,
            },
          );
        } catch (routerError) {
          logger.warn(
            `[${functionTag}] Router failed, falling back to first match`,
            { error: routerError },
          );
          externalTool = matchingTools[0];
        }
      } else {
        externalTool = matchingTools[0];
      }

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

      // Execute via tool registry (custom/built-in tools)
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

        // Check if result indicates a failure and emit error event
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
    };

    // Execute with middleware chain
    try {
      const result = await executeWithMiddleware(executeCore);

      // === MCP ENHANCEMENT: Cache store (after successful execution) ===
      if (isCacheEnabled && toolResultCache && result !== undefined) {
        toolResultCache.cacheResult(toolName, cacheParams, result);
        logger.debug(`[${functionTag}] Cached result for tool: ${toolName}`);
      }

      return result;
    } catch (error) {
      // === MCP ENHANCEMENT: Retry safe tools on failure ===
      const toolStubForRetry = toolAnnotations
        ? ({
            name: toolName,
            description: "",
            annotations: toolAnnotations,
            execute: async () => ({}),
          } as MCPServerTool)
        : undefined;
      if (
        toolStubForRetry &&
        isSafeToRetry(toolStubForRetry) &&
        error instanceof Error &&
        isRetriableError(error)
      ) {
        logger.debug(
          `[${functionTag}] Tool ${toolName} is safe to retry, attempting once more`,
        );
        try {
          const retryResult = await executeWithMiddleware(executeCore);

          // Cache the retry result
          if (isCacheEnabled && toolResultCache && retryResult !== undefined) {
            toolResultCache.cacheResult(toolName, cacheParams, retryResult);
          }

          return retryResult;
        } catch {
          // Retry failed, throw original error
        }
      }

      throw error;
    }
  }

  /**
   * Get tool annotations for execution decisions (cache, retry).
   * Checks cached tool list first, falls back to inference from tool name.
   */
  private getToolAnnotationsForExecution(
    toolName: string,
  ): MCPToolAnnotations | undefined {
    // Check tool cache for stored annotations
    if (this.toolCache?.tools) {
      const tool = this.toolCache.tools.find((t) => t.name === toolName);
      if (tool?.annotations) {
        return tool.annotations as MCPToolAnnotations;
      }
    }
    // Fallback: infer from tool name if annotations are enabled
    if (this.mcpEnhancementsConfig?.annotations?.autoInfer !== false) {
      return inferAnnotations({ name: toolName, description: "" });
    }
    return undefined;
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
          const optimizedTool = optimizeToolForCollection(tool as ToolInfo, {
            category: detectCategory({
              existingCategory:
                typeof tool.metadata?.category === "string"
                  ? tool.metadata.category
                  : undefined,
              isExternal: true,
              serverId: tool.serverId,
            }),
            inputSchema: {},
          });
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

      // === MCP ENHANCEMENT: Auto-infer annotations for all tools ===
      if (this.mcpEnhancementsConfig?.annotations?.autoInfer !== false) {
        for (const tool of uniqueTools) {
          if (!tool.annotations) {
            tool.annotations = inferAnnotations({
              name: tool.name,
              description: tool.description || "",
            });
          }
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

              if (validModels.length > 0) {
                return {
                  provider: providerName,
                  status: "working" as const,
                  configured: true,
                  authenticated: true,
                  responseTime: Date.now() - startTime,
                  model: validModels[0].name,
                };
              } else {
                return {
                  provider: providerName,
                  status: "failed" as const,
                  configured: true,
                  authenticated: false,
                  error: "Ollama service running but no models installed",
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
        {
          includeConnectivityTest: false,
          cacheResults: false,
        },
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
      errorCategories: Record<string, number>;
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
        errorCategories: Record<string, number>;
      }
    > = {};

    for (const [toolName, toolMetrics] of this.toolExecutionMetrics.entries()) {
      metrics[toolName] = {
        ...toolMetrics,
        errorCategories: { ...toolMetrics.errorCategories },
        successRate:
          toolMetrics.totalExecutions > 0
            ? toolMetrics.successfulExecutions / toolMetrics.totalExecutions
            : 0,
      };
    }

    return metrics;
  }

  /**
   * NL-004: Set model alias/deprecation configuration.
   * Models in the alias map will be warned, redirected, or blocked based on their action.
   * @param config - Model alias configuration with aliases map
   */
  setModelAliasConfig(
    config: import("./types/index.js").ModelAliasConfig,
  ): void {
    this.modelAliasConfig = config;
    logger.info(
      `[ModelAlias] Configured ${Object.keys(config.aliases).length} model aliases`,
    );
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
          errorCategories: Record<string, number>;
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
          errorCategories: Record<string, number>;
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
    // Build a lookup from tool name to serverId for composite breaker keys
    const toolServerIdMap = new Map<string, string>();
    for (const tool of allTools) {
      if (!toolServerIdMap.has(tool.name)) {
        toolServerIdMap.set(tool.name, tool.serverId || "unknown");
      }
    }

    for (const toolName of allToolNames) {
      const metrics = this.toolExecutionMetrics.get(toolName);
      const breakerKey = `${toolServerIdMap.get(toolName) || "unknown"}.${toolName}`;
      const circuitBreaker = this.toolCircuitBreakers.get(breakerKey);

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

      if (metrics && metrics.errorCategories) {
        const categories = metrics.errorCategories;
        if (categories[ErrorCategory.TIMEOUT] > 0) {
          issues.push(`Timeout errors: ${categories[ErrorCategory.TIMEOUT]}`);
          recommendations.push(
            "Consider increasing the tool timeout configuration",
          );
        }
        if (categories[ErrorCategory.VALIDATION] > 0) {
          issues.push(
            `Validation errors: ${categories[ErrorCategory.VALIDATION]}`,
          );
          recommendations.push("Review input schemas and parameter validation");
        }
        if (categories[ErrorCategory.NETWORK] > 0) {
          issues.push(`Network errors: ${categories[ErrorCategory.NETWORK]}`);
          recommendations.push(
            "Check network connectivity and endpoint availability",
          );
        }
      }

      tools[toolName] = {
        name: toolName,
        isHealthy,
        metrics: {
          totalExecutions: metrics?.totalExecutions || 0,
          successRate,
          averageExecutionTime: metrics?.averageExecutionTime || 0,
          lastExecutionTime: metrics?.lastExecutionTime || 0,
          errorCategories: metrics?.errorCategories
            ? { ...metrics.errorCategories }
            : {},
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
      throw new NeuroLinkError({
        code: ERROR_CODES.MISSING_CONFIGURATION,
        message: "Conversation memory is not enabled",
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
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
      throw new NeuroLinkError({
        code: ERROR_CODES.MISSING_CONFIGURATION,
        message: "Conversation memory is not enabled",
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    if (!sessionId || typeof sessionId !== "string") {
      throw new NeuroLinkError({
        code: ERROR_CODES.INVALID_PARAMETERS,
        message: "Session ID must be a non-empty string",
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        retriable: false,
        context: { sessionId },
      });
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
      throw new NeuroLinkError({
        code: ERROR_CODES.MISSING_CONFIGURATION,
        message: "Conversation memory is not enabled",
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    this.lastCompactionMessageCount.delete(sessionId);
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
      throw new NeuroLinkError({
        code: ERROR_CODES.MISSING_CONFIGURATION,
        message: "Conversation memory is not enabled",
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    this.lastCompactionMessageCount.clear();
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

  /**
   * Get the raw messages array for a session.
   * Returns the full messages list without context filtering or summarization.
   * @param sessionId - The session ID to retrieve messages for
   * @returns Array of ChatMessage objects, or empty array if session doesn't exist
   */
  async getSessionMessages(
    sessionId: string,
    userId?: string,
  ): Promise<ChatMessage[]> {
    const initId = `get-msgs-init-${Date.now()}`;
    await this.initializeConversationMemoryForGeneration(
      initId,
      Date.now(),
      process.hrtime.bigint(),
    );

    if (!this.conversationMemory) {
      throw new NeuroLinkError({
        code: ERROR_CODES.MISSING_CONFIGURATION,
        message: "Conversation memory is not enabled",
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    if (!sessionId || typeof sessionId !== "string") {
      throw new NeuroLinkError({
        code: ERROR_CODES.INVALID_PARAMETERS,
        message: "Session ID must be a non-empty string",
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        retriable: false,
        context: { sessionId },
      });
    }

    return await this.conversationMemory.getSessionMessages(sessionId, userId);
  }

  /**
   * Replace the entire messages array for a session.
   * @param sessionId - The session ID to update
   * @param messages - The new messages array
   * @param userId - Optional user ID for scoped Redis key lookup
   */
  async setSessionMessages(
    sessionId: string,
    messages: ChatMessage[],
    userId?: string,
  ): Promise<void> {
    const initId = `set-msgs-init-${Date.now()}`;
    await this.initializeConversationMemoryForGeneration(
      initId,
      Date.now(),
      process.hrtime.bigint(),
    );

    if (!this.conversationMemory) {
      throw new NeuroLinkError({
        code: ERROR_CODES.MISSING_CONFIGURATION,
        message: "Conversation memory is not enabled",
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    if (!sessionId || typeof sessionId !== "string") {
      throw new NeuroLinkError({
        code: ERROR_CODES.INVALID_PARAMETERS,
        message: "Session ID must be a non-empty string",
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        retriable: false,
        context: { sessionId },
      });
    }

    await this.conversationMemory.setSessionMessages(
      sessionId,
      messages,
      userId,
    );
  }

  /**
   * Modify the last assistant message in a session using a transformer function.
   * Convenience wrapper around getSessionMessages/setSessionMessages.
   * @param sessionId - The session ID to modify
   * @param transformer - Function that receives the last assistant message content and returns the modified content
   * @param userId - Optional user ID for scoped Redis key lookup
   * @returns true if a message was modified, false if no assistant message was found
   */
  async modifyLastAssistantMessage(
    sessionId: string,
    transformer: (content: string) => string,
    userId?: string,
  ): Promise<boolean> {
    const messages = await this.getSessionMessages(sessionId, userId);

    // Find the last assistant message (searching from the end)
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        messages[i] = {
          ...messages[i],
          content: transformer(messages[i].content),
        };
        await this.setSessionMessages(sessionId, messages, userId);
        return true;
      }
    }

    return false;
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

        // === MCP ENHANCEMENT: Lazy-init ToolRouter when 2+ servers exist ===
        if (this.mcpEnhancementsConfig?.router?.enabled !== false) {
          const servers = this.externalServerManager.listServers();
          if (servers.length >= 2 && !this.mcpToolRouter) {
            this.mcpToolRouter = new ToolRouter({
              strategy:
                this.mcpEnhancementsConfig?.router?.strategy ?? "least-loaded",
              enableAffinity:
                this.mcpEnhancementsConfig?.router?.enableAffinity ?? false,
            });
            // Register all existing servers
            for (const server of servers) {
              this.mcpToolRouter.registerServer(server.id || serverId);
            }
            logger.debug(
              "[NeuroLink] ToolRouter auto-initialized (2+ external servers)",
            );
          } else if (this.mcpToolRouter) {
            this.mcpToolRouter.registerServer(serverId);
          }
        }

        // Emit server added event
        this.emitter.emit("externalMCP:serverAdded", {
          serverId,
          serverName: config.name || serverId,
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

      // Capture the configured name before removal destroys the instance
      const serverName = this.externalServerManager.getServerName(serverId);

      const result = await this.externalServerManager.removeServer(serverId);

      if (result.success) {
        mcpLogger.info(
          `[NeuroLink] External MCP server removed successfully: ${serverId}`,
        );

        // Emit server removed event
        this.emitter.emit("externalMCP:serverRemoved", {
          serverId,
          serverName,
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

      // BZ-664: Check existing ToolResultCache before executing to avoid
      // duplicate identical calls within the same session.
      //
      // Safety guards aligned with executeToolInternal():
      // - Skip destructive tools (destructiveHint annotation)
      // - Scope cache key by serverId (two servers can expose same tool name)
      //   and toolExecutionContext (prevents cross-session/user leaks)
      const toolAnnotations = this.getToolAnnotationsForExecution(toolName);
      const cacheEnabled =
        !!this.mcpToolResultCache &&
        !this._disableToolCacheForCurrentRequest &&
        !toolAnnotations?.destructiveHint;
      const cacheKeyArgs = {
        __serverId: serverId,
        __args: parameters,
        ...(this.toolExecutionContext
          ? { __ctx: this.toolExecutionContext }
          : {}),
      };
      if (cacheEnabled && this.mcpToolResultCache) {
        const cached = this.mcpToolResultCache.getCachedResult(
          toolName,
          cacheKeyArgs,
        );
        if (cached !== undefined) {
          mcpLogger.debug(
            `[NeuroLink] Tool result cache HIT: ${toolName} on ${serverId}`,
          );
          return cached;
        }
      }

      const result = await this.externalServerManager.executeTool(
        serverId,
        toolName,
        parameters,
        options,
      );

      // BZ-664: Store result in cache after successful execution
      if (cacheEnabled && this.mcpToolResultCache) {
        this.mcpToolResultCache.cacheResult(toolName, cacheKeyArgs, result);
      }

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
      const { MCPClientFactory } = await withTimeout(
        import("./mcp/mcpClientFactory.js"),
        10000,
      );

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

  // ===== MCP ENHANCEMENTS SDK METHODS =====

  /**
   * Get the global elicitation manager for interactive tool input
   * Elicitation allows tools to request additional information from users during execution
   * @returns The global ElicitationManager instance
   * @example
   * ```typescript
   * const elicitationManager = neurolink.getElicitationManager();
   *
   * // Register a handler for confirmations
   * elicitationManager.registerHandler(async (request) => {
   *   if (request.type === 'confirmation') {
   *     const answer = await askUser(request.message);
   *     return { confirmed: answer === 'yes' };
   *   }
   * });
   * ```
   */
  async getElicitationManager() {
    // Dynamically import to avoid circular dependencies
    const mod = (await withTimeout(
      import("./mcp/elicitation/index.js"),
      10000,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    )) as any;
    return mod.globalElicitationManager;
  }

  /**
   * Register an elicitation handler for interactive tool input
   * Handlers are called when tools need user input during execution
   * @param handler - Function to handle elicitation requests
   * @example
   * ```typescript
   * neurolink.registerElicitationHandler(async (request) => {
   *   switch (request.type) {
   *     case 'confirmation':
   *       return { confirmed: await confirmWithUser(request.message) };
   *     case 'text':
   *       return { value: await promptUser(request.message) };
   *     case 'select':
   *       return { value: await selectFromOptions(request.options) };
   *   }
   * });
   * ```
   */
  async registerElicitationHandler(
    handler: (request: unknown) => Promise<unknown>,
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const elicitationManager = (await this.getElicitationManager()) as any;
    elicitationManager.registerHandler(handler);
  }

  /**
   * Get the multi-server manager for load balancing and coordination
   * Allows managing multiple MCP servers with failover and load balancing
   * @returns The global MultiServerManager instance
   * @example
   * ```typescript
   * const multiServer = neurolink.getMultiServerManager();
   *
   * // Create a server group with load balancing
   * await multiServer.createServerGroup('ai-tools', {
   *   servers: ['openai-server', 'anthropic-server'],
   *   strategy: 'round-robin'
   * });
   * ```
   */
  async getMultiServerManager() {
    const mod = (await withTimeout(
      import("./mcp/multiServerManager.js"),
      10000,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    )) as any;
    return mod.globalMultiServerManager;
  }

  /**
   * Get the enhanced tool discovery service
   * Provides advanced search, filtering, and compatibility checking for tools
   * @returns EnhancedToolDiscovery instance
   * @example
   * ```typescript
   * const discovery = neurolink.getEnhancedToolDiscovery();
   *
   * // Search for tools by criteria
   * const results = await discovery.searchTools({
   *   category: 'data-processing',
   *   capabilities: ['streaming', 'batch'],
   *   minReliability: 0.9
   * });
   * ```
   */
  async getEnhancedToolDiscovery() {
    const mod = (await withTimeout(
      import("./mcp/enhancedToolDiscovery.js"),
      10000,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    )) as any;
    return new mod.EnhancedToolDiscovery(this.toolRegistry);
  }

  /**
   * Get the MCP registry client for discovering servers from registries
   * Supports multiple registry sources (official, community, custom)
   * @returns The global MCPRegistryClient instance
   * @example
   * ```typescript
   * const registryClient = neurolink.getMCPRegistryClient();
   *
   * // Search for servers
   * const servers = await registryClient.searchServers({
   *   query: 'database',
   *   categories: ['data', 'storage']
   * });
   *
   * // Get a well-known server config
   * const githubServer = registryClient.getWellKnownServer('github');
   * ```
   */
  async getMCPRegistryClient() {
    const mod = (await withTimeout(
      import("./mcp/mcpRegistryClient.js"),
      10000,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    )) as any;
    return mod.globalMCPRegistryClient;
  }

  /**
   * Expose a NeuroLink agent as an MCP tool
   * This allows agents to be called by other systems via MCP
   * @param agent - The agent to expose (must include id, name, description, and execute)
   * @param options - Exposure configuration options (prefix, defaultAnnotations, etc.)
   * @returns The exposed tool definition
   * @example
   * ```typescript
   * const agent = {
   *   id: 'my-agent',
   *   name: 'My Agent',
   *   description: 'An agent that processes data',
   *   execute: async (params) => { ... }
   * };
   * const tool = await neurolink.exposeAgentAsTool(agent, {
   *   prefix: 'agent_'
   * });
   * ```
   */
  async exposeAgentAsTool(
    agent: {
      id: string;
      name: string;
      description: string;
      execute: (params: unknown, context?: unknown) => Promise<unknown>;
    },
    options?: {
      prefix?: string;
      includeMetadataInDescription?: boolean;
      wrapWithContext?: boolean;
      executionTimeout?: number;
      enableLogging?: boolean;
    },
  ) {
    const agentExposure = await withTimeout(
      import("./mcp/agentExposure.js"),
      10000,
    );
    return agentExposure.exposeAgentAsTool(agent, options);
  }

  /**
   * Expose a workflow as an MCP tool
   * This allows workflows to be called by other systems via MCP
   * @param workflow - The workflow to expose (must include id, name, description, and execute)
   * @param options - Exposure configuration options (prefix, defaultAnnotations, etc.)
   * @returns The exposed tool definition
   * @example
   * ```typescript
   * const workflow = {
   *   id: 'data-pipeline',
   *   name: 'Data Pipeline',
   *   description: 'Runs the data processing pipeline',
   *   execute: async (params) => { ... }
   * };
   * const tool = await neurolink.exposeWorkflowAsTool(workflow, {
   *   prefix: 'workflow_'
   * });
   * ```
   */
  async exposeWorkflowAsTool(
    workflow: {
      id: string;
      name: string;
      description: string;
      execute: (params: unknown, context?: unknown) => Promise<unknown>;
      steps?: Array<{ id: string; name: string; description?: string }>;
    },
    options?: {
      prefix?: string;
      includeMetadataInDescription?: boolean;
      wrapWithContext?: boolean;
      executionTimeout?: number;
      enableLogging?: boolean;
    },
  ) {
    const agentExposure = await withTimeout(
      import("./mcp/agentExposure.js"),
      10000,
    );
    return agentExposure.exposeWorkflowAsTool(workflow, options);
  }

  /**
   * Get the tool integration manager for middleware and elicitation
   * Provides advanced tool wrapping with confirmation, timeout, retry, etc.
   * @returns The global ToolIntegrationManager instance
   * @example
   * ```typescript
   * const integration = neurolink.getToolIntegrationManager();
   *
   * // Register a tool with middleware
   * integration.registerTool(myTool, {
   *   timeout: 30000,
   *   retries: 3,
   *   requireConfirmation: true
   * });
   * ```
   */
  async getToolIntegrationManager() {
    const mod = (await withTimeout(
      import("./mcp/toolIntegration.js"),
      10000,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    )) as any;
    return mod.globalToolIntegrationManager;
  }

  /**
   * Convert NeuroLink tools to MCP format
   * Useful for exposing local tools to external MCP clients
   * @param tools - Array of NeuroLink tool definitions
   * @param options - Conversion options
   * @returns Array of MCP-formatted tools
   * @example
   * ```typescript
   * const mcpTools = neurolink.convertToolsToMCPFormat([
   *   { name: 'myTool', description: 'Does something', execute: async () => {} }
   * ]);
   * ```
   */
  async convertToolsToMCPFormat(
    tools: Array<{
      name: string;
      description: string;
      execute?: (params: unknown) => unknown;
    }>,
    options: { namespacePrefix?: string } = {},
  ) {
    const mod = (await withTimeout(
      import("./mcp/toolConverter.js"),
      10000,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    )) as any;
    // Ensure all tools have an execute function (required by NeuroLinkTool)
    const normalizedTools = tools.map((tool) => ({
      ...tool,
      execute:
        tool.execute ??
        (async () => ({
          success: false,
          error: "No execute function provided",
        })),
    }));
    return mod.batchConvertToMCP(normalizedTools, options);
  }

  /**
   * Convert MCP tools to NeuroLink format
   * Useful for importing tools from external MCP servers
   * @param tools - Array of MCP tool definitions
   * @param options - Conversion options
   * @returns Array of NeuroLink-formatted tools
   * @example
   * ```typescript
   * const neurolinkTools = neurolink.convertToolsFromMCPFormat(externalTools, {
   *   removeNamespacePrefix: 'external_'
   * });
   * ```
   */
  async convertToolsFromMCPFormat(
    tools: Array<{ name: string; description: string; inputSchema?: unknown }>,
    options: { removeNamespacePrefix?: string } = {},
  ) {
    const mod = (await withTimeout(
      import("./mcp/toolConverter.js"),
      10000,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    )) as any;
    return mod.batchConvertToNeuroLink(tools, options);
  }

  /**
   * Get tool annotations and safety information
   * Provides insights about tool behavior, safety levels, and retry-ability
   * @param toolName - Name of the tool to analyze
   * @returns Tool annotation summary
   * @example
   * ```typescript
   * const annotations = await neurolink.getToolAnnotations('deleteFile');
   * // Returns: { destructive: true, requiresConfirmation: true, safeToRetry: false }
   * ```
   */
  async getToolAnnotations(toolName: string) {
    const { inferAnnotations, mergeAnnotations, getAnnotationSummary } =
      await withTimeout(import("./mcp/toolAnnotations.js"), 10000);
    const toolInfo = this.toolRegistry.getToolInfo(toolName);
    if (!toolInfo) {
      return null;
    }
    // Check for explicit annotations set on the tool first
    const explicitAnnotations = (toolInfo.tool as Record<string, unknown>)
      .annotations as Record<string, unknown> | undefined;
    // Infer annotations from the tool name/description as fallback
    const inferredAnnotations = inferAnnotations({
      name: toolInfo.tool.name,
      description: toolInfo.tool.description ?? "",
    });
    // Merge: inferred first, then explicit overrides (explicit takes precedence)
    const annotations = mergeAnnotations(
      inferredAnnotations,
      explicitAnnotations,
    );
    return {
      annotations,
      summary: getAnnotationSummary(annotations),
    };
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
      const { initializeConversationMemory } =
        await import("./core/conversationMemoryInitializer.js");

      // Use the integration module to create the appropriate memory manager
      const memoryManager = await initializeConversationMemory(
        this.conversationMemoryConfig,
      );
      // Assign to conversationMemory with proper type to handle both memory manager types
      this.conversationMemory = memoryManager;

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

  // ========================================
  // Evaluation & Scoring API
  // ========================================

  /**
   * Create an evaluation pipeline with the specified configuration or preset.
   * Pipelines orchestrate multiple scorers to evaluate AI responses comprehensively.
   *
   * @param configOrPreset - Pipeline configuration object or preset name
   * @returns Initialized evaluation pipeline
   *
   * @example Using a preset
   * ```typescript
   * const neurolink = new NeuroLink();
   * const pipeline = await neurolink.createEvaluationPipeline('rag');
   * const result = await pipeline.execute({
   *   query: 'What is the capital of France?',
   *   response: 'Paris is the capital of France.',
   *   context: ['France is a country in Europe. Paris is its capital.']
   * });
   * console.log(result.overallScore, result.passed);
   * ```
   *
   * @example Using custom configuration
   * ```typescript
   * const pipeline = await neurolink.createEvaluationPipeline({
   *   name: 'custom-quality',
   *   scorers: [
   *     { id: 'toxicity', config: { threshold: 0.9 } },
   *     { id: 'hallucination', config: { weight: 1.5 } },
   *     { id: 'answer-relevancy' }
   *   ],
   *   aggregation: { method: 'weighted' },
   *   passThreshold: 0.8
   * });
   * ```
   */
  async createEvaluationPipeline(
    configOrPreset:
      | import("./types/index.js").PipelineConfig
      | "safety"
      | "rag"
      | "quality"
      | "comprehensive"
      | "minimal"
      | "summarization"
      | "customerSupport"
      | "codeGeneration",
  ): Promise<
    import("./evaluation/pipeline/evaluationPipeline.js").EvaluationPipeline
  > {
    const { EvaluationPipeline, getPreset } = await withTimeout(
      import("./evaluation/pipeline/index.js"),
      10000,
      ErrorFactory.evaluationTimeout("evaluation module load", 10000),
    );

    let config: import("./types/index.js").PipelineConfig;

    if (typeof configOrPreset === "string") {
      // It's a preset name
      config = getPreset(configOrPreset);
    } else {
      // It's a custom configuration
      config = configOrPreset;
    }

    const pipeline = new EvaluationPipeline(config);
    // Note: withTimeout races the promise but does not abort in-flight LLM calls.
    // Full AbortController propagation into pipeline/scorer internals is planned.
    await withTimeout(
      pipeline.initialize(),
      30000,
      ErrorFactory.evaluationTimeout("pipeline initialization", 30000),
    );

    logger.debug(
      `[NeuroLink] Created evaluation pipeline: ${config.name ?? "custom"}`,
    );

    return pipeline;
  }

  /**
   * Evaluate an AI response using the specified pipeline or scorers.
   * This is a convenience method that creates a pipeline and executes it in one call.
   *
   * @param input - Scorer input containing query, response, and optional context
   * @param options - Evaluation options including pipeline preset or custom scorers
   * @returns Evaluation pipeline result with scores and pass/fail status
   *
   * @example Using a preset
   * ```typescript
   * const neurolink = new NeuroLink();
   * const result = await neurolink.evaluate(
   *   {
   *     query: 'Explain quantum computing',
   *     response: 'Quantum computing uses qubits...'
   *   },
   *   { pipeline: 'quality' }
   * );
   * console.log(`Score: ${result.overallScore}, Passed: ${result.passed}`);
   * ```
   *
   * @example Using specific scorers
   * ```typescript
   * const result = await neurolink.evaluate(
   *   {
   *     query: 'What causes rain?',
   *     response: 'Rain is caused by water vapor...',
   *     context: ['The water cycle involves evaporation...']
   *   },
   *   { scorers: ['hallucination', 'faithfulness', 'answer-relevancy'] }
   * );
   * ```
   *
   * @example Full RAG evaluation
   * ```typescript
   * const result = await neurolink.evaluate(
   *   {
   *     query: 'Who wrote Hamlet?',
   *     response: 'Shakespeare wrote Hamlet in 1600.',
   *     context: ['William Shakespeare wrote Hamlet around 1600-1601.'],
   *     groundTruth: 'William Shakespeare'
   *   },
   *   { pipeline: 'rag' }
   * );
   * ```
   */
  async evaluate(
    input: import("./types/index.js").ScorerInput,
    options?: {
      /** Pipeline preset to use */
      pipeline?:
        | "safety"
        | "rag"
        | "quality"
        | "comprehensive"
        | "minimal"
        | "summarization"
        | "customerSupport"
        | "codeGeneration";
      /** Specific scorers to use (alternative to pipeline) */
      scorers?: string[];
      /** Pass threshold override (0-1) */
      passThreshold?: number;
      /** Execution mode */
      executionMode?: "parallel" | "sequential";
      /** Correlation ID for tracing */
      correlationId?: string;
      /** Overall evaluation timeout in milliseconds */
      timeoutMs?: number;
    },
  ): Promise<import("./types/index.js").PipelineResult> {
    const { EvaluationPipeline, getPreset } = await withTimeout(
      import("./evaluation/pipeline/index.js"),
      10000,
      ErrorFactory.evaluationTimeout("evaluation module load", 10000),
    );

    let config: import("./types/index.js").PipelineConfig;

    // Fail fast on conflicting or empty evaluator selection
    if (options?.pipeline && options?.scorers) {
      throw new Error(
        "Cannot specify both 'pipeline' and 'scorers' options. Use one or the other.",
      );
    }
    if (options?.scorers && options.scorers.length === 0) {
      throw new Error(
        "The 'scorers' array must not be empty. Provide at least one scorer ID or omit the option to use the default 'quality' preset.",
      );
    }

    if (options?.pipeline) {
      // Use preset
      config = { ...getPreset(options.pipeline) };
    } else if (options?.scorers && options.scorers.length > 0) {
      // Use custom scorers
      config = {
        name: "SDK Evaluation",
        description: "Evaluation from NeuroLink SDK",
        scorers: options.scorers.map((id) => ({ id })),
        executionMode: options.executionMode ?? "parallel",
        passThreshold: options.passThreshold ?? 0.7,
      };
    } else {
      // Default to quality preset
      config = getPreset("quality");
    }

    // Apply overrides
    if (options?.passThreshold !== undefined) {
      config.passThreshold = options.passThreshold;
    }
    if (options?.executionMode !== undefined) {
      config.executionMode = options.executionMode;
    }

    const pipeline = new EvaluationPipeline(config);
    await withTimeout(
      pipeline.initialize(),
      30000,
      ErrorFactory.evaluationTimeout("pipeline initialization", 30000),
    );

    const executionTimeoutMs = options?.timeoutMs ?? 60000;
    const result = await withTimeout(
      pipeline.execute(input, {
        correlationId: options?.correlationId,
      }),
      executionTimeoutMs,
      ErrorFactory.evaluationTimeout("pipeline execution", executionTimeoutMs),
    );

    logger.debug(`[NeuroLink] Evaluation completed`, {
      pipeline: config.name,
      overallScore: result.overallScore,
      passed: result.passed,
      scorerCount: result.scores.length,
    });

    return result;
  }

  /**
   * Score a response using a single scorer.
   * Useful for quick, targeted evaluations without the overhead of a full pipeline.
   *
   * @param scorerId - The ID of the scorer to use (e.g., 'toxicity', 'hallucination')
   * @param input - Scorer input containing query, response, and optional context
   * @param config - Optional scorer configuration overrides
   * @returns Score result with value, reasoning, and pass/fail status
   *
   * @example Basic scoring
   * ```typescript
   * const neurolink = new NeuroLink();
   * const result = await neurolink.score('toxicity', {
   *   query: '',
   *   response: 'This is a helpful response about cooking recipes.'
   * });
   * console.log(`Toxicity Score: ${result.score}/10, Passed: ${result.passed}`);
   * ```
   *
   * @example Hallucination detection
   * ```typescript
   * const result = await neurolink.score('hallucination', {
   *   query: 'What year was the Eiffel Tower built?',
   *   response: 'The Eiffel Tower was built in 1889.',
   *   context: ['The Eiffel Tower was constructed from 1887-1889.']
   * });
   * console.log(`Score: ${result.score}, Reasoning: ${result.reasoning}`);
   * ```
   *
   * @example With custom threshold
   * ```typescript
   * const result = await neurolink.score(
   *   'faithfulness',
   *   {
   *     query: 'Summarize the article',
   *     response: 'The article discusses...',
   *     context: ['Article content here...']
   *   },
   *   { threshold: 0.85, weight: 1.5 }
   * );
   * ```
   */
  async score(
    scorerId: string,
    input: import("./types/index.js").ScorerInput,
    config?: import("./types/index.js").ScorerConfig,
  ): Promise<import("./types/index.js").ScoreResult> {
    const { ScorerRegistry } = await withTimeout(
      import("./evaluation/scorers/index.js"),
      10000,
      ErrorFactory.evaluationTimeout("scorer module load", 10000),
    );

    // Ensure built-in scorers are registered
    await withTimeout(
      ScorerRegistry.registerBuiltInScorers(),
      30000,
      ErrorFactory.evaluationTimeout("scorer bootstrap", 30000),
    );

    // Get the scorer
    const scorer = await withTimeout(
      ScorerRegistry.getScorer(scorerId, config),
      30000,
      ErrorFactory.evaluationTimeout(`scorer load: ${scorerId}`, 30000),
    );

    if (!scorer) {
      throw ErrorFactory.scorerNotFound(scorerId);
    }

    // Validate input
    const validation = scorer.validateInput(input);
    if (!validation.valid) {
      throw ErrorFactory.evaluationValidationFailed(
        scorerId,
        validation.errors,
      );
    }

    // Execute scoring
    const result = await withTimeout(
      scorer.score(input),
      60000,
      ErrorFactory.evaluationTimeout("scorer execution", 60000),
    );

    logger.debug(`[NeuroLink] Scoring completed`, {
      scorerId,
      score: result.score,
      passed: result.passed,
      computeTime: result.computeTime,
    });

    return result;
  }

  /**
   * Get a list of all available scorers and their metadata.
   * Useful for discovering what evaluation capabilities are available.
   *
   * @param options - Filter options
   * @returns Array of scorer metadata
   *
   * @example List all scorers
   * ```typescript
   * const neurolink = new NeuroLink();
   * const scorers = await neurolink.getAvailableScorers();
   * for (const scorer of scorers) {
   *   console.log(`${scorer.id}: ${scorer.description} (${scorer.type})`);
   * }
   * ```
   *
   * @example Filter by category
   * ```typescript
   * const safetyScorers = await neurolink.getAvailableScorers({
   *   category: 'safety'
   * });
   * console.log('Safety scorers:', safetyScorers.map(s => s.id));
   * ```
   *
   * @example Filter by type
   * ```typescript
   * const ruleBasedScorers = await neurolink.getAvailableScorers({
   *   type: 'rule'
   * });
   * ```
   */
  async getAvailableScorers(options?: {
    /** Filter by category */
    category?: import("./types/index.js").ScorerCategory;
    /** Filter by type */
    type?: import("./types/index.js").ScorerType;
  }): Promise<import("./types/index.js").ScorerMetadata[]> {
    const { ScorerRegistry } = await withTimeout(
      import("./evaluation/scorers/index.js"),
      10000,
      ErrorFactory.evaluationTimeout("scorer module load", 10000),
    );

    // Ensure built-in scorers are registered
    await withTimeout(
      ScorerRegistry.registerBuiltInScorers(),
      30000,
      ErrorFactory.evaluationTimeout("scorer bootstrap", 30000),
    );

    let scorers = ScorerRegistry.list();

    // Apply filters
    if (options?.category) {
      scorers = scorers.filter((s) => s.category === options.category);
    }
    if (options?.type) {
      scorers = scorers.filter((s) => s.type === options.type);
    }

    return scorers;
  }

  /**
   * Get a list of available evaluation pipeline presets.
   * Presets are pre-configured pipelines for common evaluation scenarios.
   *
   * @returns Array of preset names
   *
   * @example
   * ```typescript
   * const neurolink = new NeuroLink();
   * const presets = await neurolink.getEvaluationPresets();
   * console.log('Available presets:', presets);
   * // Output: ['safety', 'rag', 'quality', 'comprehensive', 'minimal', ...]
   * ```
   */
  async getEvaluationPresets(): Promise<string[]> {
    const { getPresetNames } = await withTimeout(
      import("./evaluation/pipeline/index.js"),
      10000,
      ErrorFactory.evaluationTimeout("evaluation module load", 10000),
    );
    return getPresetNames();
  }

  /**
   * Get details of a specific evaluation preset.
   *
   * @param presetName - Name of the preset
   * @returns Pipeline configuration for the preset
   *
   * @example
   * ```typescript
   * const neurolink = new NeuroLink();
   * const ragPreset = await neurolink.getEvaluationPreset('rag');
   * console.log('RAG preset scorers:', ragPreset.scorers.map(s => s.id));
   * console.log('Pass threshold:', ragPreset.passThreshold);
   * ```
   */
  async getEvaluationPreset(
    presetName:
      | "safety"
      | "rag"
      | "quality"
      | "comprehensive"
      | "minimal"
      | "summarization"
      | "customerSupport"
      | "codeGeneration",
  ): Promise<import("./types/index.js").PipelineConfig> {
    const { getPreset } = await withTimeout(
      import("./evaluation/pipeline/index.js"),
      10000,
      ErrorFactory.evaluationTimeout("evaluation module load", 10000),
    );
    return getPreset(presetName);
  }

  /**
   * Dispose of all resources and cleanup connections
   * Call this method when done using the NeuroLink instance to prevent resource leaks
   * Especially important in test environments where multiple instances are created
   */
  async dispose(): Promise<void> {
    logger.debug("[NeuroLink] Starting disposal of resources...");

    // Clear per-session compaction watermarks
    this.lastCompactionMessageCount.clear();

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

        // Cleanup MCP enhancement modules
        this.mcpToolResultCache?.destroy();
        this.mcpToolRouter?.destroy();
        this.mcpToolBatcher?.destroy();
        this.mcpToolResultCache = undefined;
        this.mcpToolRouter = undefined;
        this.mcpToolBatcher = undefined;
        this.mcpEnhancedDiscovery = undefined;
        this.mcpToolMiddlewares = [];

        logger.debug("[NeuroLink] Maps and caches cleared successfully");
      } catch (error) {
        const err =
          error instanceof Error
            ? error
            : new Error(`Cache cleanup error: ${String(error)}`);
        cleanupErrors.push(err);
        logger.warn("[NeuroLink] Error clearing caches:", error);
      }

      // 5b. Shutdown TaskManager
      if (this._taskManager) {
        try {
          logger.debug("[NeuroLink] Shutting down TaskManager...");
          await withTimeout(
            this._taskManager.shutdown(),
            5000,
            new Error("TaskManager shutdown timed out"),
          );
        } catch (error) {
          logger.warn("[NeuroLink] TaskManager shutdown error:", error);
        } finally {
          this._taskManager = undefined;
        }
      }

      // 6. Reset initialization flags
      try {
        logger.debug("[NeuroLink] Resetting initialization state...");
        this.mcpInitialized = false;
        this.mcpInitPromise = null;
        this.conversationMemoryNeedsInit = false;
        this.credentials = undefined;
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

  // ============================================
  // Internal Access Methods (for Server Adapters)
  // ============================================

  /**
   * Get the tool registry instance
   * Used internally by server adapters for tool management
   * @returns The MCPToolRegistry instance
   */
  getToolRegistry(): MCPToolRegistry {
    return this.toolRegistry;
  }

  /**
   * Manually trigger context compaction for a session.
   * Runs the full 4-stage compaction pipeline.
   */
  async compactSession(
    sessionId: string,
    config?: CompactionConfig,
  ): Promise<CompactionResult | null> {
    if (!this.conversationMemory) {
      return null;
    }

    const messages =
      await this.conversationMemory.buildContextMessages(sessionId);
    if (!messages || messages.length === 0) {
      return null;
    }

    const compactor = new ContextCompactor({
      ...config,
      summarizationProvider:
        config?.summarizationProvider ??
        this.conversationMemoryConfig?.conversationMemory
          ?.summarizationProvider,
      summarizationModel:
        config?.summarizationModel ??
        this.conversationMemoryConfig?.conversationMemory?.summarizationModel,
    });
    // Use actual context window to determine target, not arbitrary heuristic
    const budgetInfo = checkContextBudget({
      provider: config?.provider || "openai",
      conversationMessages: messages as Array<{
        role: string;
        content: string;
      }>,
    });
    // Target 60% of available input tokens — leave room for new messages
    const targetTokens = Math.floor(budgetInfo.availableInputTokens * 0.6);
    const result = await compactor.compact(
      messages,
      targetTokens,
      this.conversationMemoryConfig?.conversationMemory,
    );

    if (result.compacted) {
      repairToolPairs(result.messages);
    }

    return result;
  }

  /**
   * Get context usage statistics for a session.
   * Returns token counts, usage ratio, and breakdown by category.
   */
  async getContextStats(
    sessionId: string,
    provider?: string,
    model?: string,
  ): Promise<{
    estimatedInputTokens: number;
    availableInputTokens: number;
    usageRatio: number;
    shouldCompact: boolean;
    messageCount: number;
  } | null> {
    if (!this.conversationMemory) {
      return null;
    }

    const messages =
      await this.conversationMemory.buildContextMessages(sessionId);
    if (!messages || messages.length === 0) {
      return null;
    }

    const budgetResult = checkContextBudget({
      provider: provider || "openai",
      model,
      conversationMessages: messages as Array<{
        role: string;
        content: string;
      }>,
    });

    return {
      estimatedInputTokens: budgetResult.estimatedInputTokens,
      availableInputTokens: budgetResult.availableInputTokens,
      usageRatio: budgetResult.usageRatio,
      shouldCompact: budgetResult.shouldCompact,
      messageCount: messages.length,
    };
  }

  /**
   * Check if a session needs compaction.
   */
  needsCompaction(
    sessionId: string,
    provider?: string,
    model?: string,
  ): boolean {
    if (!this.conversationMemory) {
      return false;
    }

    const session = (
      this.conversationMemory as ConversationMemoryManager
    ).getSession?.(sessionId);
    if (!session) {
      return false;
    }

    const budgetResult = checkContextBudget({
      provider: provider || "openai",
      model,
      conversationMessages: session.messages as Array<{
        role: string;
        content: string;
      }>,
    });

    return budgetResult.shouldCompact;
  }

  // ============================================================================
  // Authentication Methods
  // ============================================================================

  /**
   * Set the authentication provider for the NeuroLink instance
   *
   * @param config - Auth provider or configuration to create one
   */
  async setAuthProvider(config: NeuroLinkAuthConfig): Promise<void> {
    // Clear any pending lazy-init promise so it does not race with this call.
    this.authInitPromise = undefined;

    await this.initializeAuthProviderFromConfig(config);
  }

  private async initializeAuthProviderFromConfig(
    config: NeuroLinkAuthConfig,
  ): Promise<void> {
    let provider: MastraAuthProvider;
    let providerType: string;

    // Duck-type check: direct MastraAuthProvider instance
    if (
      "authenticateToken" in config &&
      typeof (config as MastraAuthProvider).authenticateToken === "function"
    ) {
      provider = config as MastraAuthProvider;
      providerType = provider.type;
    } else if ("provider" in config) {
      provider = (config as { provider: MastraAuthProvider }).provider;
      providerType = provider.type;
    } else {
      const typedConfig = config as {
        type: AuthProviderType;
        config: AuthProviderConfig;
      };
      const { AuthProviderFactory } =
        await import("./auth/AuthProviderFactory.js");
      provider = await AuthProviderFactory.createProvider(
        typedConfig.type,
        typedConfig.config,
      );
      providerType = typedConfig.type;
    }

    this.authProvider = provider;
    logger.info(`Auth provider set: ${providerType}`);
    this.emitter.emit("auth:provider:set", {
      type: provider.type,
      timestamp: Date.now(),
    });
  }

  /**
   * Get the currently configured authentication provider
   */
  getAuthProvider(): MastraAuthProvider | undefined {
    return this.authProvider;
  }

  /**
   * Lazily initialize the auth provider from pendingAuthConfig.
   * Called on first use (generate/stream with auth token) to avoid
   * async work in the synchronous constructor.
   */
  private async ensureAuthProvider(): Promise<void> {
    if (this.authProvider || !this.pendingAuthConfig) {
      return;
    }
    const pendingAuthConfig = this.pendingAuthConfig;
    this.authInitPromise ??= (async () => {
      try {
        await this.initializeAuthProviderFromConfig(pendingAuthConfig);
        this.pendingAuthConfig = undefined;
      } finally {
        if (
          this.authInitPromise &&
          (this.pendingAuthConfig === undefined ||
            this.pendingAuthConfig === pendingAuthConfig)
        ) {
          this.authInitPromise = undefined;
        }
      }
    })();
    await this.authInitPromise;
  }

  /**
   * Set the current authentication context for request handling.
   *
   * Delegates to the global AuthContextHolder so that auth state is NOT
   * stored as an instance field (which would leak between concurrent requests
   * sharing the same NeuroLink singleton). Prefer `runWithAuthContext()` from
   * `authContext.ts` for proper request-scoped context via AsyncLocalStorage.
   *
   * @param context - The authenticated user context
   */
  async setAuthContext(context: AuthenticatedContext): Promise<void> {
    const { globalAuthContext } = await import("./auth/authContext.js");
    globalAuthContext.set(context);
    logger.debug("Auth context set", {
      userId: context.user.id,
      provider: context.provider,
      sessionId: context.session?.id,
    });
  }

  /**
   * Get the current authentication context.
   *
   * Checks AsyncLocalStorage first, then falls back to the global holder.
   */
  async getAuthContext(): Promise<AuthenticatedContext | undefined> {
    const { getAuthContext: getCtx } = await import("./auth/authContext.js");
    return getCtx();
  }

  /**
   * Clear the current authentication context
   */
  async clearAuthContext(): Promise<void> {
    const { globalAuthContext } = await import("./auth/authContext.js");
    const userId = globalAuthContext.get()?.user.id;
    globalAuthContext.clear();
    if (userId) {
      logger.debug(`Auth context cleared for user: ${userId}`);
    }
  }

  /**
   * Get the external server manager instance
   * Used internally by server adapters for external MCP server management
   * @returns The ExternalServerManager instance
   */
  getExternalServerManager(): ExternalServerManager {
    return this.externalServerManager;
  }
}

// Create default instance
export const neurolink = new NeuroLink();
export default neurolink;
