/**
 * NeuroLink MCP Tool Orchestration Engine
 * Central orchestrator for coordinated tool execution with pipeline management
 * Coordinates factory, registry, context, and AI tools for seamless operation
 * Now with semaphore-based race condition prevention
 */

import type { NeuroLinkExecutionContext, ToolResult } from "./factory.js";
import {
  MCPToolRegistry,
  defaultToolRegistry,
  type ToolExecutionOptions,
} from "./tool-registry.js";
import {
  ContextManager,
  defaultContextManager,
  createExecutionContext,
  type ContextRequest,
} from "./context-manager.js";
import {
  SemaphoreManager,
  defaultSemaphoreManager,
  type SemaphoreResult,
} from "./semaphore-manager.js";
import {
  SessionManager,
  defaultSessionManager,
  type OrchestratorSession,
  type SessionOptions,
} from "./session-manager.js";
import {
  ErrorManager,
  defaultErrorManager,
  ErrorCategory,
  ErrorSeverity,
} from "./error-manager.js";
import {
  HealthMonitor,
  initializeHealthMonitor,
  type HealthMonitorOptions,
} from "./health-monitor.js";
import {
  TransportManager,
  type TransportConfig,
  type TransportManagerOptions,
} from "./transport-manager.js";
import { aiCoreServer } from "./servers/ai-providers/ai-core-server.js";

/**
 * Pipeline execution options
 */
export interface PipelineOptions {
  stopOnError?: boolean;
  parallel?: boolean;
  timeout?: number;
  trackMetrics?: boolean;
  validateInputs?: boolean;
}

/**
 * Tool execution step in a pipeline
 */
export interface PipelineStep {
  toolName: string;
  params: any;
  options?: ToolExecutionOptions;
  dependsOn?: string[]; // Step dependencies for parallel execution
  stepId?: string; // Unique identifier for the step
}

/**
 * Pipeline execution result
 */
export interface PipelineResult {
  success: boolean;
  results: Map<string, ToolResult>;
  errors: Map<string, string>;
  executionTime: number;
  stepsExecuted: number;
  stepsSkipped: number;
  metadata: {
    pipelineId: string;
    sessionId: string;
    timestamp: number;
    parallel: boolean;
  };
}

/**
 * Text generation pipeline result
 */
export interface TextPipelineResult {
  success: boolean;
  text?: string;
  provider?: string;
  model?: string;
  executionTime: number;
  usage?: {
    tokens?: number;
    cost?: number;
  };
  metadata: {
    sessionId: string;
    timestamp: number;
    toolsUsed: string[];
  };
}

/**
 * NeuroLink MCP Tool Orchestrator
 * Central coordination engine for tool execution, pipelines, and AI operations
 */
export class MCPOrchestrator {
  protected registry: MCPToolRegistry;
  protected contextManager: ContextManager;
  protected semaphoreManager: SemaphoreManager;
  protected sessionManager: SessionManager;
  protected errorManager: ErrorManager;
  protected healthMonitor: HealthMonitor | null = null;
  protected transportManager: TransportManager | null = null;
  protected pipelineCounter: number = 0;

  constructor(
    registry?: MCPToolRegistry,
    contextManager?: ContextManager,
    semaphoreManager?: SemaphoreManager,
    sessionManager?: SessionManager,
    errorManager?: ErrorManager,
  ) {
    this.registry = registry || defaultToolRegistry;
    this.contextManager = contextManager || defaultContextManager;
    this.semaphoreManager = semaphoreManager || defaultSemaphoreManager;
    this.sessionManager = sessionManager || defaultSessionManager;
    this.errorManager = errorManager || defaultErrorManager;

    // Initialize with AI Core Server
    this.initializeDefaultServers();
  }

  /**
   * Initialize with default servers (AI Core)
   */
  private async initializeDefaultServers(): Promise<void> {
    try {
      await this.registry.registerServer(aiCoreServer.id, aiCoreServer);
      // Only log in debug mode
      if (process.env.NEUROLINK_DEBUG === "true") {
        console.log("[Orchestrator] Initialized with AI Core Server");
      }
    } catch (error) {
      console.warn("[Orchestrator] Failed to register AI Core Server:", error);
    }
  }

  /**
   * Execute a single tool with full orchestration
   *
   * @param toolName Tool name to execute
   * @param params Tool parameters
   * @param contextRequest Context creation request
   * @param options Execution options
   * @returns Tool execution result
   */
  async executeTool(
    toolName: string,
    params: any,
    contextRequest: ContextRequest = {},
    options: ToolExecutionOptions & { sessionOptions?: SessionOptions } = {},
  ): Promise<ToolResult> {
    // Create execution context
    const context = this.contextManager.createContext(contextRequest);

    // Get or create session for continuous tool calling
    let session: OrchestratorSession | null = null;
    if (context.sessionId) {
      session = await this.sessionManager.getSession(context.sessionId);
    }

    if (!session) {
      // Create new session with options
      session = await this.sessionManager.createSession(
        context,
        options.sessionOptions,
      );
      // Update context with new session ID
      const oldSessionId = context.sessionId;
      context.sessionId = session.id;

      // Remove old context and store updated context in context manager
      if (oldSessionId) {
        this.contextManager.removeContext(oldSessionId);
      }
      // Store the updated context with the new session ID
      this.contextManager.storeContext(context);
    }

    if (process.env.NEUROLINK_DEBUG === "true") {
      console.log(
        `[Orchestrator] Executing tool '${toolName}' in session ${context.sessionId}`,
      );
    }

    // Use semaphore to prevent race conditions for the same tool
    // Each tool gets its own semaphore key to allow parallel execution of different tools
    const semaphoreKey = `tool:${toolName}`;

    const semaphoreResult = await this.semaphoreManager.acquire(
      semaphoreKey,
      async () => {
        try {
          // Add tool to the execution chain
          this.contextManager.addToToolChain(context, toolName);

          // Execute tool through registry
          const result = await this.registry.executeTool(
            toolName,
            params,
            context,
          );

          if (process.env.NEUROLINK_DEBUG === "true") {
            console.log(
              `[Orchestrator] Tool '${toolName}' execution ${(result as ToolResult).success ? "completed" : "failed"}`,
            );
          }

          // Record error if tool execution failed
          if (!(result as ToolResult).success && (result as ToolResult).error) {
            this.errorManager.recordError((result as ToolResult).error, {
              category: ErrorCategory.TOOL_ERROR,
              severity: ErrorSeverity.HIGH,
              sessionId: session.id,
              toolName,
              parameters: params,
              executionContext: context,
            });
          }

          return result;
        } catch (error) {
          // Record unexpected errors
          const errorEntry = await this.errorManager.recordError(error, {
            category: ErrorCategory.TOOL_ERROR,
            severity: ErrorSeverity.CRITICAL,
            sessionId: session.id,
            toolName,
            parameters: params,
            executionContext: context,
          });

          // Return error result
          return {
            success: false,
            data: null,
            error: errorEntry.error,
            usage: {},
          } as ToolResult;
        }
      },
      context,
    );

    // Handle semaphore errors
    if (!semaphoreResult.success) {
      const errorResult = {
        success: false,
        data: null,
        error:
          semaphoreResult.error || new Error("Semaphore acquisition failed"),
        usage: {
          executionTime: semaphoreResult.executionTime,
          waitTime: semaphoreResult.waitTime,
        },
      } as ToolResult;

      // Update session with error result
      await this.sessionManager.updateSession(session.id, errorResult);

      return errorResult;
    }

    const result = semaphoreResult.result as ToolResult;

    // Update session with tool result
    await this.sessionManager.updateSession(session.id, result);

    // Enhance result with session information
    return {
      ...result,
      sessionId: session.id,
      sessionData: {
        toolHistory: session.toolHistory.length,
        state: Object.fromEntries(session.state),
      },
    } as ToolResult;
  }

  /**
   * Execute a pipeline of tools with dependency management
   *
   * @param steps Pipeline steps to execute
   * @param contextRequest Context creation request
   * @param options Pipeline execution options
   * @returns Pipeline execution result
   */
  async executePipeline(
    steps: PipelineStep[],
    contextRequest: ContextRequest = {},
    options: PipelineOptions = {},
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    const pipelineId = this.generatePipelineId();

    const {
      stopOnError = true,
      parallel = false,
      timeout = 60000,
      trackMetrics = true,
      validateInputs = true,
    } = options;

    // Create shared execution context
    const context = this.contextManager.createContext({
      ...contextRequest,
      sessionId: contextRequest.sessionId || pipelineId,
    });

    const results = new Map<string, ToolResult>();
    const errors = new Map<string, string>();
    let stepsExecuted = 0;
    let stepsSkipped = 0;

    console.log(
      `[Orchestrator] Starting pipeline ${pipelineId} with ${steps.length} steps`,
    );

    try {
      if (parallel) {
        // Execute steps in parallel with dependency management
        await this.executeParallelPipeline(steps, context, results, errors, {
          timeout,
          trackMetrics,
          validateInputs,
          stopOnError,
        });
      } else {
        // Execute steps sequentially
        for (const step of steps) {
          const stepId = step.stepId || `step-${stepsExecuted + 1}`;

          try {
            console.log(
              `[Orchestrator] Executing step: ${stepId} (${step.toolName})`,
            );

            // Use semaphore for each tool execution in pipeline
            const semaphoreKey = `tool:${step.toolName}`;
            const semaphoreResult = await this.semaphoreManager.acquire(
              semaphoreKey,
              async () => {
                return await this.registry.executeTool(
                  step.toolName,
                  step.params,
                  context,
                );
              },
              context,
            );

            const stepResult = semaphoreResult.success
              ? semaphoreResult.result
              : {
                  success: false,
                  data: null,
                  error:
                    semaphoreResult.error ||
                    new Error("Semaphore acquisition failed"),
                  usage: {
                    executionTime: semaphoreResult.executionTime,
                    waitTime: semaphoreResult.waitTime,
                  },
                };

            results.set(stepId, stepResult as ToolResult);
            stepsExecuted++;

            if (!(stepResult as ToolResult).success) {
              const error = (stepResult as ToolResult).error;
              const errorMessage =
                error instanceof Error
                  ? error.message
                  : String(error) || "Unknown error";
              errors.set(stepId, errorMessage);

              if (stopOnError) {
                console.error(
                  `[Orchestrator] Pipeline ${pipelineId} stopped due to error in step ${stepId}`,
                );
                break;
              }
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            errors.set(stepId, errorMessage);

            if (stopOnError) {
              console.error(
                `[Orchestrator] Pipeline ${pipelineId} stopped due to exception in step ${stepId}: ${errorMessage}`,
              );
              break;
            }

            stepsSkipped++;
          }
        }
      }

      const executionTime = Date.now() - startTime;
      const success = errors.size === 0 || !stopOnError;

      console.log(
        `[Orchestrator] Pipeline ${pipelineId} completed in ${executionTime}ms - ${success ? "SUCCESS" : "FAILED"}`,
      );

      return {
        success,
        results,
        errors,
        executionTime,
        stepsExecuted,
        stepsSkipped,
        metadata: {
          pipelineId,
          sessionId: context.sessionId,
          timestamp: Date.now(),
          parallel,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      console.error(
        `[Orchestrator] Pipeline ${pipelineId} failed: ${errorMessage}`,
      );

      return {
        success: false,
        results,
        errors: new Map([["pipeline", errorMessage]]),
        executionTime,
        stepsExecuted,
        stepsSkipped,
        metadata: {
          pipelineId,
          sessionId: context.sessionId,
          timestamp: Date.now(),
          parallel,
        },
      };
    }
  }

  /**
   * Execute AI text generation pipeline (high-level convenience method)
   *
   * @param prompt Text prompt for generation
   * @param contextRequest Context creation request
   * @param options Additional generation options
   * @returns Text generation result
   */
  async executeTextPipeline(
    prompt: string,
    contextRequest: ContextRequest = {},
    options: {
      provider?: string;
      model?: string;
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
      customTools?: string[];
    } = {},
  ): Promise<TextPipelineResult> {
    const startTime = Date.now();

    // Create execution context
    const context = this.contextManager.createContext(contextRequest);

    try {
      console.log(
        `[Orchestrator] Starting text pipeline for prompt: "${prompt.substring(0, 50)}..."`,
      );

      // Build pipeline steps
      const steps: PipelineStep[] = [];

      // Step 1: Provider selection (if not specified)
      if (!options.provider) {
        steps.push({
          stepId: "select-provider",
          toolName: "select-provider",
          params: {
            requirements: {
              maxTokens: options.maxTokens,
              costEfficient: true,
            },
          },
        });
      }

      // Step 2: Text generation
      steps.push({
        stepId: "generate-text",
        toolName: "generate-text",
        params: {
          prompt,
          provider: options.provider,
          model: options.model,
          temperature: options.temperature,
          maxTokens: options.maxTokens,
          systemPrompt: options.systemPrompt,
        },
        dependsOn: options.provider ? [] : ["select-provider"],
      });

      // Step 3: Custom tools (if specified)
      if (options.customTools && options.customTools.length > 0) {
        for (const toolName of options.customTools) {
          steps.push({
            stepId: `custom-${toolName}`,
            toolName,
            params: {
              /* tool-specific params */
            },
            dependsOn: ["generate-text"],
          });
        }
      }

      // Execute pipeline
      const pipelineResult = await this.executePipeline(steps, contextRequest, {
        stopOnError: true,
        parallel: false,
        trackMetrics: true,
      });

      const executionTime = Date.now() - startTime;

      // Extract text generation result
      const textResult = pipelineResult.results.get("generate-text");
      const providerResult = pipelineResult.results.get("select-provider");

      if (!textResult || !textResult.success) {
        throw new Error("Text generation failed");
      }

      const toolsUsed = Array.from(pipelineResult.results.keys());

      console.log(
        `[Orchestrator] Text pipeline completed in ${executionTime}ms`,
      );

      return {
        success: true,
        text: textResult.data?.text,
        provider: textResult.data?.provider || providerResult?.data?.provider,
        model: textResult.data?.model,
        executionTime,
        usage: textResult.usage,
        metadata: {
          sessionId: context.sessionId,
          timestamp: Date.now(),
          toolsUsed,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      console.error(`[Orchestrator] Text pipeline failed: ${errorMessage}`);

      return {
        success: false,
        executionTime,
        metadata: {
          sessionId: context.sessionId,
          timestamp: Date.now(),
          toolsUsed: [],
        },
      };
    }
  }

  /**
   * Get orchestrator statistics
   *
   * @returns Comprehensive orchestrator statistics
   */
  getStats(): {
    registry: any;
    context: any;
    session: any;
    error: any;
    health?: any;
    orchestrator: {
      pipelinesExecuted: number;
    };
  } {
    const stats: any = {
      registry: this.registry.getStats(),
      context: this.contextManager.getStats(),
      session: this.sessionManager.getStats(),
      error: this.errorManager.getStats(),
      orchestrator: {
        pipelinesExecuted: this.pipelineCounter,
      },
    };

    if (this.healthMonitor) {
      const healthStatus = this.healthMonitor.getHealthStatus();
      stats.health = {
        servers: Array.from(healthStatus.entries()).map(([id, health]) => ({
          id,
          status: health.status,
          checkCount: health.checkCount,
          errorCount: health.errorCount,
          lastSuccessfulCheck: health.lastSuccessfulCheck,
        })),
      };
    }

    return stats;
  }

  /**
   * Get session by ID
   *
   * @param sessionId Session identifier
   * @param extend Whether to extend session expiration
   * @returns Session or null if not found
   */
  async getSession(
    sessionId: string,
    extend: boolean = true,
  ): Promise<OrchestratorSession | null> {
    return this.sessionManager.getSession(sessionId, extend);
  }

  /**
   * Create a new session for continuous tool calling
   *
   * @param contextRequest Context creation request
   * @param sessionOptions Session configuration options
   * @returns Created session
   */
  async createSession(
    contextRequest: ContextRequest = {},
    sessionOptions?: SessionOptions,
  ): Promise<OrchestratorSession> {
    const context = this.contextManager.createContext(contextRequest);
    return this.sessionManager.createSession(context, sessionOptions);
  }

  /**
   * Set session state value
   *
   * @param sessionId Session identifier
   * @param key State key
   * @param value State value
   * @returns Success status
   */
  async setSessionState(
    sessionId: string,
    key: string,
    value: any,
  ): Promise<boolean> {
    return this.sessionManager.setSessionState(sessionId, key, value) !== null;
  }

  /**
   * Get session state value
   *
   * @param sessionId Session identifier
   * @param key State key
   * @returns State value or undefined
   */
  async getSessionState(sessionId: string, key: string): Promise<any> {
    return this.sessionManager.getSessionState(sessionId, key);
  }

  /**
   * Get all active sessions
   *
   * @returns Array of active sessions
   */
  async getActiveSessions(): Promise<OrchestratorSession[]> {
    return this.sessionManager.getActiveSessions();
  }

  /**
   * Clean up expired sessions
   *
   * @returns Number of sessions cleaned
   */
  async cleanupSessions(): Promise<number> {
    return this.sessionManager.cleanup();
  }

  /**
   * Get error history
   *
   * @param filter Optional filter criteria
   * @returns Filtered error history
   */
  getErrorHistory(filter?: Parameters<ErrorManager["getErrorHistory"]>[0]) {
    return this.errorManager.getErrorHistory(filter);
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorManager.clearHistory();
  }

  /**
   * Get recovery suggestion for last error
   *
   * @param sessionId Optional session ID to get last error from
   * @returns Recovery suggestion or null
   */
  getLastErrorRecovery(sessionId?: string): string | null {
    const filter = sessionId ? { sessionId, limit: 1 } : { limit: 1 };
    const errors = this.errorManager.getErrorHistory(filter);

    if (errors.length > 0) {
      return this.errorManager.getRecoverySuggestion(errors[0]);
    }

    return null;
  }

  /**
   * Initialize health monitoring
   *
   * @param options Health monitor options
   */
  initializeHealthMonitor(options?: HealthMonitorOptions): void {
    this.healthMonitor = initializeHealthMonitor(
      this.registry,
      this.errorManager,
      options,
    );
  }

  /**
   * Start health monitoring for all registered servers
   */
  startHealthMonitoring(): void {
    if (!this.healthMonitor) {
      this.initializeHealthMonitor();
    }
    this.healthMonitor!.startMonitoring();
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(): void {
    this.healthMonitor?.stopMonitoring();
  }

  /**
   * Register recovery callback for a server
   *
   * @param serverId Server ID
   * @param callback Recovery callback
   */
  registerRecoveryCallback(
    serverId: string,
    callback: (serverId: string) => Promise<void>,
  ): void {
    if (!this.healthMonitor) {
      this.initializeHealthMonitor();
    }
    this.healthMonitor!.registerRecoveryCallback(serverId, callback);
  }

  /**
   * Get health status for all servers
   *
   * @returns Map of server health status
   */
  getHealthStatus() {
    return this.healthMonitor?.getHealthStatus() || new Map();
  }

  /**
   * Initialize transport manager for MCP connections
   *
   * @param options Transport manager options
   */
  initializeTransportManager(options?: TransportManagerOptions): void {
    this.transportManager = new TransportManager(this.errorManager, options);
  }

  /**
   * Connect to MCP server using specified transport
   *
   * @param config Transport configuration
   * @returns Connected MCP client
   */
  async connectTransport(config: TransportConfig): Promise<any> {
    if (!this.transportManager) {
      this.initializeTransportManager();
    }
    return this.transportManager!.connect(config);
  }

  /**
   * Disconnect from MCP server
   */
  async disconnectTransport(): Promise<void> {
    await this.transportManager?.disconnect();
  }

  /**
   * Get transport connection status
   */
  getTransportStatus() {
    return (
      this.transportManager?.getStatus() || {
        connected: false,
        type: "stdio" as const,
        reconnectAttempts: 0,
      }
    );
  }

  /**
   * Check if transport is connected
   */
  isTransportConnected(): boolean {
    return this.transportManager?.isConnected() || false;
  }

  /**
   * Execute parallel pipeline with dependency management
   *
   * @private
   */
  private async executeParallelPipeline(
    steps: PipelineStep[],
    context: NeuroLinkExecutionContext,
    results: Map<string, ToolResult>,
    errors: Map<string, string>,
    options: {
      timeout: number;
      trackMetrics: boolean;
      validateInputs: boolean;
      stopOnError: boolean;
    },
  ): Promise<void> {
    // Build dependency graph
    const stepMap = new Map<string, PipelineStep>();
    const dependencyGraph = new Map<string, string[]>();

    for (const step of steps) {
      const stepId = step.stepId || `step-${stepMap.size + 1}`;
      stepMap.set(stepId, { ...step, stepId });
      dependencyGraph.set(stepId, step.dependsOn || []);
    }

    // Execute steps in dependency order
    const completed = new Set<string>();
    const executing = new Set<string>();

    while (completed.size < steps.length) {
      const readySteps = Array.from(stepMap.keys()).filter((stepId) => {
        if (completed.has(stepId) || executing.has(stepId)) {
          return false;
        }
        const dependencies = dependencyGraph.get(stepId) || [];
        return dependencies.every((dep) => completed.has(dep));
      });

      if (readySteps.length === 0) {
        throw new Error("Circular dependency detected in pipeline");
      }

      // Execute ready steps in parallel
      const executePromises = readySteps.map(async (stepId) => {
        executing.add(stepId);
        const step = stepMap.get(stepId)!;

        try {
          // Use semaphore for parallel execution to prevent race conditions
          const semaphoreKey = `tool:${step.toolName}`;
          const semaphoreResult = await this.semaphoreManager.acquire(
            semaphoreKey,
            async () => {
              return await this.registry.executeTool(
                step.toolName,
                step.params,
                context,
              );
            },
            context,
          );

          const result = semaphoreResult.success
            ? semaphoreResult.result
            : {
                success: false,
                data: null,
                error:
                  semaphoreResult.error ||
                  new Error("Semaphore acquisition failed"),
                usage: {
                  executionTime: semaphoreResult.executionTime,
                  waitTime: semaphoreResult.waitTime,
                },
              };

          results.set(stepId, result as ToolResult);

          if (!(result as ToolResult).success) {
            const error = (result as ToolResult).error;
            const errorMessage =
              error instanceof Error
                ? error.message
                : String(error) || "Unknown error";
            errors.set(stepId, errorMessage);
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errors.set(stepId, errorMessage);
        } finally {
          executing.delete(stepId);
          completed.add(stepId);
        }
      });

      await Promise.all(executePromises);

      // Check for errors and stop if configured
      if (options.stopOnError && errors.size > 0) {
        break;
      }
    }
  }

  /**
   * Generate unique pipeline ID
   *
   * @private
   */
  private generatePipelineId(): string {
    this.pipelineCounter++;
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `nlpipe-${timestamp}-${this.pipelineCounter}-${random}`;
  }
}

/**
 * Default orchestrator instance
 * Ready-to-use orchestrator with pre-configured registry and context manager
 */
export const defaultOrchestrator = new MCPOrchestrator();

/**
 * Utility function to execute tool with default orchestrator
 *
 * @param toolName Tool name to execute
 * @param params Tool parameters
 * @param contextRequest Context creation request
 * @param options Execution options
 * @returns Tool execution result
 */
export async function executeTool(
  toolName: string,
  params: any,
  contextRequest?: ContextRequest,
  options?: ToolExecutionOptions,
): Promise<ToolResult> {
  return defaultOrchestrator.executeTool(
    toolName,
    params,
    contextRequest,
    options,
  );
}

/**
 * Utility function to execute text generation pipeline
 *
 * @param prompt Text prompt for generation
 * @param contextRequest Context creation request
 * @param options Generation options
 * @returns Text generation result
 */
export async function executeTextPipeline(
  prompt: string,
  contextRequest?: ContextRequest,
  options?: any,
): Promise<TextPipelineResult> {
  return defaultOrchestrator.executeTextPipeline(
    prompt,
    contextRequest,
    options,
  );
}

/**
 * Utility function to execute pipeline with default orchestrator
 *
 * @param steps Pipeline steps
 * @param contextRequest Context creation request
 * @param options Pipeline options
 * @returns Pipeline execution result
 */
export async function executePipeline(
  steps: PipelineStep[],
  contextRequest?: ContextRequest,
  options?: PipelineOptions,
): Promise<PipelineResult> {
  return defaultOrchestrator.executePipeline(steps, contextRequest, options);
}
