/**
 * AgentNetwork - Multi-Agent Orchestration for NeuroLink
 *
 * Provides intelligent routing and orchestration of multiple agents,
 * workflows, and tools through a centralized routing agent.
 */

import { randomUUID } from "crypto";
import { EventEmitter } from "events";
import type { NeuroLink } from "../neurolink.js";
import type {
  AgentNetworkConfig,
  AgentPrimitive,
  AgentTextChunk,
  AgentToolCallChunk,
  AgentToolResultChunk,
  CoreMessage,
  NetworkExecutionInput,
  NetworkExecutionOptions,
  NetworkExecutionResult,
  NetworkExecutionStep,
  NetworkExecutionTrace,
  NetworkStreamChunk,
  NetworkTokenUsage,
  Primitive,
  PrimitiveExecutionResult,
  AgentRoutingDecision,
  ToolPrimitive,
  WorkflowPrimitive,
  TokenUsage,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { Agent } from "./agent.js";
import { RouterAgent } from "./routerAgent.js";

/**
 * AgentNetwork - Multi-agent orchestration with intelligent routing
 *
 * Features:
 * - Intelligent task routing via LLM-powered router
 * - Support for agents, workflows, and tools as primitives
 * - Iterative execution until task completion
 * - Streaming support with real-time events
 * - Execution tracing and token usage tracking
 *
 * @example
 * ```typescript
 * const network = neurolink.createNetwork({
 *   name: 'Content Team',
 *   agents: [researchAgent, writerAgent, reviewerAgent],
 *   router: { model: 'gpt-4o' }
 * });
 *
 * const result = await network.execute({
 *   message: 'Write an article about AI trends'
 * });
 * ```
 */
export class AgentNetwork {
  readonly id: string;
  readonly name: string;
  readonly description?: string;

  private neurolink: NeuroLink;
  private agents: Map<string, Agent> = new Map();
  private workflows: Map<string, WorkflowPrimitive> = new Map();
  private primitives: Map<string, Primitive> = new Map();
  private emitter: EventEmitter;
  private config: AgentNetworkConfig;

  // Lazy tool initialization (Bug #1 fix)
  private toolsInitialized = false;
  private toolsInitPromise: Promise<void> | null = null;

  // Router agent instance (Bug #2 fix)
  private routerAgent: RouterAgent | null = null;

  constructor(config: AgentNetworkConfig, neurolink: NeuroLink) {
    // Validate required fields
    if (!config.name || typeof config.name !== "string") {
      throw new Error("AgentNetwork config must have a valid name");
    }
    if (!Array.isArray(config.agents) || config.agents.length === 0) {
      throw new Error("AgentNetwork config must have at least one agent");
    }

    this.id = config.id ?? randomUUID();
    this.name = config.name;
    this.description = config.description;
    this.neurolink = neurolink;
    this.config = config;
    this.emitter = new EventEmitter();

    this.initializeAgents(config);
    this.initializeWorkflows(config);
    // Note: tools are initialized lazily when needed

    logger.info(`[AgentNetwork:${this.id}] Created network: ${this.name}`, {
      agentCount: this.agents.size,
      workflowCount: this.workflows.size,
      toolCount: config.tools?.length || 0,
    });
  }

  /**
   * Initialize agents from configuration
   */
  private initializeAgents(config: AgentNetworkConfig): void {
    for (const agentDef of config.agents) {
      const agent = new Agent(agentDef, this.neurolink);
      this.agents.set(agentDef.id, agent);

      const primitive: AgentPrimitive = {
        id: agentDef.id,
        type: "agent",
        name: agentDef.name,
        description: agentDef.description,
        inputSchema: agentDef.inputSchema,
        outputSchema: agentDef.outputSchema,
        agent,
      };

      this.primitives.set(agentDef.id, primitive);
      logger.debug(
        `[AgentNetwork:${this.id}] Registered agent: ${agentDef.name}`,
      );
    }
  }

  /**
   * Initialize workflows from configuration
   */
  private initializeWorkflows(config: AgentNetworkConfig): void {
    if (!config.workflows) {
      return;
    }

    for (const workflowDef of config.workflows) {
      const primitive: WorkflowPrimitive = {
        id: workflowDef.id,
        type: "workflow",
        name: workflowDef.name,
        description: workflowDef.description,
        inputSchema: workflowDef.inputSchema,
        outputSchema: workflowDef.outputSchema,
        workflow: workflowDef.workflow,
      };

      this.workflows.set(workflowDef.id, primitive);
      this.primitives.set(workflowDef.id, primitive);
      logger.debug(
        `[AgentNetwork:${this.id}] Registered workflow: ${workflowDef.name}`,
      );
    }
  }

  /**
   * Initialize tools from configuration (lazy initialization)
   */
  private async initializeTools(): Promise<void> {
    if (!this.config.tools || this.config.tools.length === 0) {
      return;
    }

    try {
      const availableTools = await this.neurolink.getAllAvailableTools();

      for (const toolName of this.config.tools) {
        // Skip if already registered
        if (this.primitives.has(`tool-${toolName}`)) {
          continue;
        }

        const toolInfo = availableTools.find((t) => t.name === toolName);
        if (!toolInfo) {
          logger.warn(`[AgentNetwork:${this.id}] Tool not found: ${toolName}`);
          continue;
        }

        const primitive: ToolPrimitive = {
          id: `tool-${toolName}`,
          type: "tool",
          name: toolName,
          description: toolInfo.description || `Tool: ${toolName}`,
          tool: {
            name: toolName,
            description: toolInfo.description,
            inputSchema: toolInfo.inputSchema,
          },
          execute: async (args) => {
            // Execute tool via NeuroLink's tool registry
            return this.neurolink.executeTool(toolName, args);
          },
        };

        this.primitives.set(primitive.id, primitive);
        logger.debug(`[AgentNetwork:${this.id}] Registered tool: ${toolName}`);
      }
    } catch (error) {
      logger.warn(`[AgentNetwork:${this.id}] Failed to initialize tools`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Ensure tools are initialized before execution (Bug #1 fix)
   * This provides safe lazy initialization that can be awaited multiple times
   */
  private async ensureToolsInitialized(): Promise<void> {
    if (this.toolsInitialized) {
      return;
    }
    if (this.toolsInitPromise) {
      return this.toolsInitPromise;
    }

    this.toolsInitPromise = this.initializeTools();
    await this.toolsInitPromise;
    this.toolsInitialized = true;
  }

  /**
   * Get or create the router agent instance (Bug #2 fix)
   * Uses RouterAgent for consistent routing logic
   */
  private getRouter(): RouterAgent {
    if (!this.routerAgent) {
      this.routerAgent = new RouterAgent(
        {
          provider: this.config.router?.provider,
          model: this.config.router?.model,
          instructions: this.config.router?.instructions,
          confidenceThreshold: this.config.router?.confidenceThreshold,
        },
        this.neurolink,
      );

      // Register all primitives with the router
      for (const primitive of this.primitives.values()) {
        this.routerAgent.registerPrimitive(primitive);
      }
    }
    return this.routerAgent;
  }

  /**
   * Execute the network with intelligent routing
   *
   * @param input - Network execution input
   * @param options - Execution options
   * @returns Network execution result
   */
  async execute(
    input: NetworkExecutionInput,
    options?: NetworkExecutionOptions,
  ): Promise<NetworkExecutionResult> {
    const startTime = Date.now();
    const traceId = options?.tracing?.traceId ?? randomUUID();
    const maxSteps = options?.maxSteps ?? this.config.defaults?.maxSteps ?? 10;

    // Ensure tools are initialized (Bug #1 fix - use lazy init)
    await this.ensureToolsInitialized();

    const trace: NetworkExecutionTrace = {
      traceId,
      steps: [],
      routingDecisions: [],
      startTime,
    };

    let currentMessage = this.extractMessageContent(input.message);
    let stepIndex = 0;
    let finalResult = "";
    const totalUsage: NetworkTokenUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      byAgent: {},
    };

    logger.info(`[AgentNetwork:${this.id}] Starting execution`, {
      traceId,
      maxSteps,
      primitiveCount: this.primitives.size,
    });

    // Emit network start event (Bug #6 fix - use emit method)
    this.emit("network:start", { traceId, input: currentMessage, startTime });

    try {
      while (stepIndex < maxSteps) {
        // Route the task
        const routingDecision = await this.routeTask(
          currentMessage,
          stepIndex,
          traceId,
        );
        trace.routingDecisions.push(routingDecision);

        logger.debug(`[AgentNetwork:${this.id}] Routing decision`, {
          step: stepIndex,
          primitive: routingDecision.selectedPrimitive.name,
          confidence: routingDecision.confidence,
        });

        // Execute the selected primitive
        const primitive = this.primitives.get(
          routingDecision.selectedPrimitive.id,
        );
        if (!primitive) {
          throw new Error(
            `Primitive not found: ${routingDecision.selectedPrimitive.id}`,
          );
        }

        const stepStartTime = Date.now();
        const stepResult = await this.executePrimitive(
          primitive,
          routingDecision.formattedInput ?? currentMessage,
          options,
        );

        const step: NetworkExecutionStep = {
          index: stepIndex,
          primitive: {
            type: primitive.type,
            id: primitive.id,
            name: primitive.name,
          },
          input: routingDecision.formattedInput ?? currentMessage,
          output: stepResult.output,
          error: stepResult.error,
          duration: Date.now() - stepStartTime,
          usage: stepResult.usage,
          timestamp: stepStartTime,
        };

        trace.steps.push(step);

        // Update token usage (Bug #4 fix - normalize token usage format)
        if (stepResult.usage) {
          const normalizedUsage = this.normalizeTokenUsage(stepResult.usage);
          totalUsage.promptTokens += normalizedUsage.input;
          totalUsage.completionTokens += normalizedUsage.output;
          totalUsage.totalTokens += normalizedUsage.total;

          // Track by agent
          if (primitive.type === "agent") {
            if (!totalUsage.byAgent) {
              totalUsage.byAgent = {};
            }
            if (!totalUsage.byAgent[primitive.id]) {
              totalUsage.byAgent[primitive.id] = {
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0,
              };
            }
            totalUsage.byAgent[primitive.id].promptTokens +=
              normalizedUsage.input;
            totalUsage.byAgent[primitive.id].completionTokens +=
              normalizedUsage.output;
            totalUsage.byAgent[primitive.id].totalTokens +=
              normalizedUsage.total;
          }
        }

        // Always track the latest step output so we return *something*
        // even if maxSteps is exhausted before isTaskComplete returns true
        finalResult =
          typeof stepResult.output === "string"
            ? stepResult.output
            : JSON.stringify(stepResult.output);

        // Check if task is complete
        if (await this.isTaskComplete(stepResult.output, currentMessage)) {
          break;
        }

        // Update message for next iteration
        currentMessage = this.buildContinuationMessage(
          currentMessage,
          stepResult.output,
        );
        stepIndex++;
      }

      trace.endTime = Date.now();

      const result: NetworkExecutionResult = {
        content: finalResult,
        trace,
        usage: totalUsage,
        status: "completed",
        duration: Date.now() - startTime,
      };

      // Emit network complete event (Bug #6 fix - use emit method)
      this.emit("network:complete", { traceId, result });

      return result;
    } catch (error) {
      trace.endTime = Date.now();

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.error(`[AgentNetwork:${this.id}] Execution failed`, {
        traceId,
        error: errorMessage,
      });

      const result: NetworkExecutionResult = {
        content: "",
        trace,
        usage: totalUsage,
        status: "error",
        duration: Date.now() - startTime,
        error: errorMessage,
      };

      // Emit network error event (Bug #6 fix - use emit method)
      this.emit("network:error", { traceId, error: errorMessage });

      return result;
    }
  }

  /**
   * Stream network execution with events
   *
   * @param input - Network execution input
   * @param options - Execution options
   * @yields Network stream chunks
   */
  async *stream(
    input: NetworkExecutionInput,
    options?: NetworkExecutionOptions,
  ): AsyncIterable<NetworkStreamChunk> {
    const startTime = Date.now();
    const traceId = options?.tracing?.traceId ?? randomUUID();
    const maxSteps = options?.maxSteps ?? this.config.defaults?.maxSteps ?? 10;

    // Ensure tools are initialized (Bug #1 fix - use lazy init)
    await this.ensureToolsInitialized();

    yield {
      type: "network-start",
      networkId: this.id,
      input:
        typeof input.message === "string"
          ? input.message
          : JSON.stringify(input.message),
      timestamp: startTime,
      traceId,
    };

    let currentMessage = this.extractMessageContent(input.message);
    let stepIndex = 0;
    const trace: NetworkExecutionTrace = {
      traceId,
      steps: [],
      routingDecisions: [],
      startTime,
    };

    const totalUsage: NetworkTokenUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };
    let finalResult = "";

    try {
      while (stepIndex < maxSteps) {
        yield {
          type: "routing-start",
          timestamp: Date.now(),
          traceId,
          stepIndex,
        };

        const routingDecision = await this.routeTask(
          currentMessage,
          stepIndex,
          traceId,
        );
        trace.routingDecisions.push(routingDecision);

        yield {
          type: "routing-decision",
          decision: routingDecision,
          timestamp: Date.now(),
          traceId,
          stepIndex,
        };

        const primitive = this.primitives.get(
          routingDecision.selectedPrimitive.id,
        );
        if (!primitive) {
          throw new Error(
            `Primitive not found: ${routingDecision.selectedPrimitive.id}`,
          );
        }

        yield {
          type: "primitive-start",
          primitive: {
            type: primitive.type,
            id: primitive.id,
            name: primitive.name,
          },
          input: routingDecision.formattedInput ?? currentMessage,
          timestamp: Date.now(),
          traceId,
          stepIndex,
        };

        // Stream primitive execution
        const primitiveInput = routingDecision.formattedInput ?? currentMessage;

        if (primitive.type === "agent") {
          const agentPrimitive = primitive as AgentPrimitive;
          let agentOutput = "";

          for await (const chunk of agentPrimitive.agent.stream(
            primitiveInput,
            {
              traceId,
              context: input.context,
            },
          )) {
            if (chunk.type === "agent-text") {
              agentOutput += chunk.content || "";
              yield {
                type: "agent-text",
                agentId: chunk.agentId,
                content: chunk.content || "",
                isPartial: chunk.isPartial ?? true,
                timestamp: chunk.timestamp,
                traceId,
                stepIndex,
              } as AgentTextChunk;
            } else if (chunk.type === "agent-tool-call") {
              yield {
                type: "agent-tool-call",
                agentId: chunk.agentId,
                toolName: chunk.toolName || "unknown",
                args: chunk.args,
                toolCallId: chunk.toolCallId || `tool-${Date.now()}`,
                timestamp: chunk.timestamp,
                traceId,
                stepIndex,
              } as AgentToolCallChunk;
            } else if (chunk.type === "agent-tool-result") {
              yield {
                type: "agent-tool-result",
                agentId: chunk.agentId,
                toolName: chunk.toolName || "unknown",
                toolCallId: chunk.toolCallId || `tool-${Date.now()}`,
                result: chunk.result,
                success: chunk.success ?? true,
                timestamp: chunk.timestamp,
                traceId,
                stepIndex,
              } as AgentToolResultChunk;
            }
          }

          finalResult = agentOutput;
        } else {
          // Execute non-streaming primitives
          const result = await this.executePrimitive(
            primitive,
            primitiveInput,
            options,
          );
          finalResult =
            typeof result.output === "string"
              ? result.output
              : JSON.stringify(result.output);
        }

        yield {
          type: "primitive-end",
          primitive: {
            type: primitive.type,
            id: primitive.id,
            name: primitive.name,
          },
          output: finalResult,
          timestamp: Date.now(),
          traceId,
          stepIndex,
        };

        // Check completion
        if (await this.isTaskComplete(finalResult, currentMessage)) {
          break;
        }

        currentMessage = this.buildContinuationMessage(
          currentMessage,
          finalResult,
        );
        stepIndex++;
      }

      trace.endTime = Date.now();

      yield {
        type: "network-complete",
        result: {
          content: finalResult,
          trace,
          usage: totalUsage,
          status: "completed",
          duration: Date.now() - startTime,
        },
        timestamp: Date.now(),
        traceId,
      };
    } catch (error) {
      yield {
        type: "network-error",
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
        traceId,
        stepIndex,
      };
    }
  }

  /**
   * Route task to appropriate primitive using RouterAgent (Bug #2 fix)
   * Delegates to RouterAgent for consistent routing logic
   */
  private async routeTask(
    task: string,
    stepIndex: number,
    _traceId: string,
  ): Promise<AgentRoutingDecision> {
    const router = this.getRouter();
    const decision = await router.route(task);

    // Add step index to the decision (RouterAgent returns stepIndex: 0)
    return {
      ...decision,
      stepIndex,
    };
  }

  /**
   * Execute a primitive (agent, workflow, or tool)
   */
  private async executePrimitive(
    primitive: Primitive,
    input: unknown,
    options?: NetworkExecutionOptions,
  ): Promise<PrimitiveExecutionResult> {
    const startTime = Date.now();

    try {
      switch (primitive.type) {
        case "agent": {
          const agentPrimitive = primitive as AgentPrimitive;
          const result = await agentPrimitive.agent.execute(
            typeof input === "string" ? input : JSON.stringify(input),
            {
              context: options?.context,
            },
          );
          return {
            output: result.content,
            usage: result.usage,
            duration: Date.now() - startTime,
          };
        }

        case "workflow": {
          const workflowPrimitive = primitive as WorkflowPrimitive;
          const result = await workflowPrimitive.workflow.execute(input);
          return {
            output: result.output,
            duration: Date.now() - startTime,
          };
        }

        case "tool": {
          const toolPrimitive = primitive as ToolPrimitive;
          const result = await toolPrimitive.execute(input, {
            sessionId: options?.tracing?.traceId,
          });
          return {
            output: result,
            duration: Date.now() - startTime,
          };
        }

        default:
          throw new Error(
            `Unknown primitive type: ${(primitive as Primitive).type}`,
          );
      }
    } catch (error) {
      return {
        output: null,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Normalize token usage from various formats (Bug #4 fix)
   * Handles both TokenUsage (input/output) and legacy (promptTokens/completionTokens) formats
   */
  private normalizeTokenUsage(usage: unknown): TokenUsage {
    if (!usage || typeof usage !== "object") {
      return { input: 0, output: 0, total: 0 };
    }
    const u = usage as Record<string, number>;
    const input = u.input ?? u.promptTokens ?? 0;
    const output = u.output ?? u.completionTokens ?? 0;
    const total = u.total ?? u.totalTokens ?? input + output;
    return { input, output, total };
  }

  /**
   * Check if task is complete based on output (Bug #5 fix)
   * Uses multiple heuristics instead of just character count
   */
  private async isTaskComplete(
    output: unknown,
    _originalTask: string,
  ): Promise<boolean> {
    // Basic checks
    if (!output) {
      return false;
    }

    const outputStr =
      typeof output === "string" ? output : JSON.stringify(output);
    const trimmedOutput = outputStr.trim();

    // Empty or very short output is incomplete
    if (trimmedOutput.length === 0) {
      return false;
    }

    // Check for explicit completion indicators
    const lowerResult = trimmedOutput.toLowerCase();
    const completionIndicators = [
      "task complete",
      "finished",
      "completed successfully",
      "here is the final",
      "the result is",
      "in conclusion",
      "to summarize",
    ];

    if (completionIndicators.some((ind) => lowerResult.includes(ind))) {
      return true;
    }

    // Check for explicit continuation indicators (task NOT complete)
    const continuationIndicators = [
      "i will",
      "let me",
      "i need to",
      "next step",
      "working on",
      "in progress",
      "please wait",
    ];

    if (continuationIndicators.some((ind) => lowerResult.includes(ind))) {
      // If it has continuation indicators but is substantial, it might still be complete
      // if it also contains actual content beyond the indicator
      if (trimmedOutput.length < 200) {
        return false;
      }
    }

    // Require meaningful response length for completion
    // Short acknowledgments are not complete responses
    return trimmedOutput.length > 100;
  }

  /**
   * Build continuation message for next iteration
   */
  private buildContinuationMessage(
    originalTask: string,
    previousOutput: unknown,
  ): string {
    const outputStr =
      typeof previousOutput === "string"
        ? previousOutput
        : JSON.stringify(previousOutput);

    return `Original task: ${originalTask}\n\nPrevious result: ${outputStr}\n\nContinue with the next step or refine the solution.`;
  }

  /**
   * Extract message content from input
   */
  private extractMessageContent(message: string | CoreMessage[]): string {
    if (typeof message === "string") {
      return message;
    }
    return message.map((m) => m.content).join("\n");
  }

  /**
   * Get an agent by ID
   */
  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  /**
   * Get all agents in the network
   */
  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get all primitives in the network
   */
  getAllPrimitives(): Primitive[] {
    return Array.from(this.primitives.values());
  }

  /**
   * Subscribe to network events
   */
  on(event: string, handler: (...args: unknown[]) => void): void {
    this.emitter.on(event, handler);
  }

  /**
   * Unsubscribe from network events
   */
  off(event: string, handler: (...args: unknown[]) => void): void {
    this.emitter.off(event, handler);
  }

  /**
   * Emit a network event
   */
  private emit(event: string, ...args: unknown[]): void {
    this.emitter.emit(event, ...args);
  }
}
