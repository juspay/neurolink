/**
 * Agent Network Implementation
 *
 * AgentNetwork is the core orchestration class for multi-agent systems.
 * It manages a collection of agents, workflows, and tools, and coordinates
 * task execution through intelligent routing.
 */

import { randomUUID } from "crypto";
import { Agent } from "./Agent.js";
import { RoutingAgent } from "./RoutingAgent.js";
import type {
  AgentNetworkConfig,
  NetworkExecutionInput,
  NetworkExecutionOptions,
  NetworkExecutionResult,
  NetworkStreamChunk,
  Primitive,
  AgentPrimitive,
  WorkflowPrimitive,
  ToolPrimitive,
  RoutingDecision,
  NetworkExecutionStep,
  NetworkExecutionTrace,
  NetworkTokenUsage,
  AgentNetworkEvents,
  CoreMessage,
} from "./types/agentTypes.js";
import {
  NetworkExecutionError,
  NetworkTimeoutError,
  MaxStepsExceededError,
} from "./errors/agentErrors.js";
import { TypedEventEmitter } from "../core/infrastructure/typedEventEmitter.js";
import { logger } from "../utils/logger.js";
import type { ToolInfo } from "../types/tools.js";

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_STEPS = 10;
const DEFAULT_TIMEOUT = 300000; // 5 minutes
const TASK_COMPLETION_MIN_LENGTH = 50;

// ============================================================================
// Agent Network Class
// ============================================================================

/**
 * AgentNetwork for multi-agent orchestration
 *
 * @example
 * ```typescript
 * const network = new AgentNetwork({
 *   name: 'Content Creation Network',
 *   agents: [
 *     { id: 'researcher', name: 'Research Agent', ... },
 *     { id: 'writer', name: 'Content Writer', ... },
 *     { id: 'reviewer', name: 'Quality Reviewer', ... }
 *   ],
 *   router: { model: 'gpt-4o' }
 * }, neurolink);
 *
 * const result = await network.execute({
 *   message: 'Write a blog post about TypeScript'
 * });
 * ```
 */
export class AgentNetwork {
  readonly id: string;
  readonly name: string;
  readonly description?: string;

  private sdk: unknown;
  private agents: Map<string, Agent> = new Map();
  private workflows: Map<string, WorkflowPrimitive> = new Map();
  private primitives: Map<string, Primitive> = new Map();
  private routingAgent: RoutingAgent;
  private emitter: TypedEventEmitter<AgentNetworkEvents>;
  private config: AgentNetworkConfig;
  private toolsInitialized: boolean = false;

  constructor(config: AgentNetworkConfig, sdk: unknown) {
    this.id = config.id ?? randomUUID();
    this.name = config.name;
    this.description = config.description;
    this.sdk = sdk;
    this.config = config;
    this.emitter = new TypedEventEmitter<AgentNetworkEvents>();

    // Initialize routing agent
    this.routingAgent = new RoutingAgent(config.router ?? {}, sdk);

    // Initialize agents
    this.initializeAgents(config);

    // Initialize workflows
    this.initializeWorkflows(config);

    logger.debug(`[AgentNetwork:${this.id}] Created network: ${this.name}`, {
      agentCount: this.agents.size,
      workflowCount: this.workflows.size,
    });
  }

  /**
   * Initialize agents from configuration
   */
  private initializeAgents(config: AgentNetworkConfig): void {
    for (const agentDef of config.agents) {
      const agent = new Agent(agentDef, this.sdk);
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
    if (this.toolsInitialized || !this.config.tools) {
      return;
    }

    const neurolink = this.sdk as {
      getAllAvailableTools: () => Promise<ToolInfo[]>;
      executeTool: (
        name: string,
        args: unknown,
        context?: { sessionId?: string },
      ) => Promise<unknown>;
    };

    try {
      const availableTools = await neurolink.getAllAvailableTools();

      for (const toolName of this.config.tools) {
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
          tool: toolInfo,
          execute: async (args, context) => {
            return neurolink.executeTool(toolName, args, context);
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

    this.toolsInitialized = true;
  }

  /**
   * Execute the network with intelligent routing
   */
  async execute(
    input: NetworkExecutionInput,
    options?: NetworkExecutionOptions,
  ): Promise<NetworkExecutionResult> {
    await this.initializeTools();

    const startTime = Date.now();
    const traceId = options?.tracing?.traceId ?? randomUUID();
    const maxSteps =
      options?.maxSteps ?? this.config.defaults?.maxSteps ?? DEFAULT_MAX_STEPS;
    const timeout =
      options?.timeout ?? this.config.defaults?.timeout ?? DEFAULT_TIMEOUT;

    const trace: NetworkExecutionTrace = {
      traceId,
      steps: [],
      routingDecisions: [],
      startTime,
    };

    const currentMessage = this.extractMessage(input.message);
    const stepIndex = 0;
    const finalResult: string = "";
    const totalUsage: NetworkTokenUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };

    logger.info(`[AgentNetwork:${this.id}] Starting execution`, {
      traceId,
      maxSteps,
      primitiveCount: this.primitives.size,
    });

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new NetworkTimeoutError(timeout, {
            networkId: this.id,
            traceId,
            completedSteps: stepIndex,
          }),
        );
      }, timeout);
    });

    try {
      const executionPromise = this.executeSteps({
        initialMessage: currentMessage,
        input,
        options,
        trace,
        totalUsage,
        maxSteps,
        traceId,
      });

      const result = await Promise.race([executionPromise, timeoutPromise]);

      trace.endTime = Date.now();

      return {
        content: result.content,
        object: result.object,
        trace,
        usage: totalUsage,
        status: "completed",
        duration: Date.now() - startTime,
      };
    } catch (error) {
      trace.endTime = Date.now();

      if (error instanceof NetworkTimeoutError) {
        return {
          content: finalResult,
          trace,
          usage: totalUsage,
          status: "timeout",
          duration: Date.now() - startTime,
          error: error.message,
        };
      }

      if (error instanceof MaxStepsExceededError) {
        return {
          content: finalResult,
          trace,
          usage: totalUsage,
          status: "partial",
          duration: Date.now() - startTime,
          error: error.message,
        };
      }

      logger.error(`[AgentNetwork:${this.id}] Execution failed`, {
        traceId,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        content: "",
        trace,
        usage: totalUsage,
        status: "error",
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Execute steps until completion or max steps reached
   */
  private async executeSteps(params: {
    initialMessage: string;
    input: NetworkExecutionInput;
    options: NetworkExecutionOptions | undefined;
    trace: NetworkExecutionTrace;
    totalUsage: NetworkTokenUsage;
    maxSteps: number;
    traceId: string;
  }): Promise<{ content: string; object?: unknown }> {
    const {
      initialMessage,
      input,
      options,
      trace,
      totalUsage,
      maxSteps,
      traceId,
    } = params;
    let currentMessage = initialMessage;
    let stepIndex = 0;
    let finalResult = "";

    const primitiveArray = Array.from(this.primitives.values());

    while (stepIndex < maxSteps) {
      // Route the task
      const routingDecision = await this.routingAgent.route(
        currentMessage,
        primitiveArray,
        {
          stepIndex,
          traceId,
          context: input.context,
        },
      );

      trace.routingDecisions.push(routingDecision);

      logger.debug(`[AgentNetwork:${this.id}] Routing decision`, {
        step: stepIndex,
        primitive: routingDecision.selectedPrimitive.name,
        confidence: routingDecision.confidence,
      });

      // Get the selected primitive
      const primitive = this.primitives.get(
        routingDecision.selectedPrimitive.id,
      );

      if (!primitive) {
        throw new NetworkExecutionError(
          `Primitive not found: ${routingDecision.selectedPrimitive.id}`,
          { networkId: this.id, traceId },
        );
      }

      // Execute the primitive
      const stepStartTime = Date.now();
      const stepResult = await this.executePrimitive(
        primitive,
        routingDecision.formattedInput ?? currentMessage,
        options,
        traceId,
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

      // Aggregate usage
      if (stepResult.usage) {
        totalUsage.promptTokens += stepResult.usage.promptTokens ?? 0;
        totalUsage.completionTokens += stepResult.usage.completionTokens ?? 0;
        totalUsage.totalTokens += stepResult.usage.totalTokens ?? 0;
      }

      // Check if task is complete
      const outputStr =
        typeof stepResult.output === "string"
          ? stepResult.output
          : JSON.stringify(stepResult.output);

      if (this.isTaskComplete(outputStr, currentMessage)) {
        finalResult = outputStr;
        break;
      }

      // Update message for next iteration
      currentMessage = this.buildContinuationMessage(
        initialMessage,
        stepResult.output,
        trace.steps,
      );
      stepIndex++;
    }

    if (stepIndex >= maxSteps && !finalResult) {
      // Use the last step's output as the result
      const lastStep = trace.steps[trace.steps.length - 1];
      finalResult =
        typeof lastStep?.output === "string"
          ? lastStep.output
          : JSON.stringify(lastStep?.output ?? "");
    }

    return { content: finalResult };
  }

  /**
   * Stream network execution with events
   */
  async *stream(
    input: NetworkExecutionInput,
    options?: NetworkExecutionOptions,
  ): AsyncIterable<NetworkStreamChunk> {
    await this.initializeTools();

    const startTime = Date.now();
    const traceId = options?.tracing?.traceId ?? randomUUID();
    const maxSteps =
      options?.maxSteps ?? this.config.defaults?.maxSteps ?? DEFAULT_MAX_STEPS;

    // Emit network start
    const startChunk: NetworkStreamChunk = {
      type: "network-start",
      networkId: this.id,
      input: this.extractMessage(input.message),
      timestamp: startTime,
      traceId,
    };
    yield startChunk;
    this.emitter.emit("network:start", startChunk as never);

    let currentMessage = this.extractMessage(input.message);
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

    const primitiveArray = Array.from(this.primitives.values());

    try {
      while (stepIndex < maxSteps) {
        // Emit routing start
        yield {
          type: "routing-start",
          timestamp: Date.now(),
          traceId,
          stepIndex,
        };

        // Route the task
        const routingDecision = await this.routingAgent.route(
          currentMessage,
          primitiveArray,
          { stepIndex, traceId, context: input.context },
        );
        trace.routingDecisions.push(routingDecision);

        // Emit routing decision
        const routingChunk: NetworkStreamChunk = {
          type: "routing-decision",
          decision: routingDecision,
          timestamp: Date.now(),
          traceId,
          stepIndex,
        };
        yield routingChunk;
        this.emitter.emit("routing:decision", routingChunk as never);

        // Get the primitive
        const primitive = this.primitives.get(
          routingDecision.selectedPrimitive.id,
        );

        if (!primitive) {
          throw new NetworkExecutionError(
            `Primitive not found: ${routingDecision.selectedPrimitive.id}`,
            { networkId: this.id, traceId },
          );
        }

        // Emit primitive start
        const primitiveStartChunk: NetworkStreamChunk = {
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
        yield primitiveStartChunk;
        this.emitter.emit("primitive:start", primitiveStartChunk as never);

        // Stream primitive execution
        const primitiveInput = routingDecision.formattedInput ?? currentMessage;
        let stepOutput = "";

        if (primitive.type === "agent") {
          const agentPrimitive = primitive as AgentPrimitive;

          for await (const chunk of agentPrimitive.agent.stream(
            primitiveInput,
            { traceId, context: input.context },
          )) {
            if (chunk.type === "agent-text") {
              stepOutput += chunk.content;
              const textChunk: NetworkStreamChunk = {
                type: "agent-text",
                agentId: chunk.agentId,
                content: chunk.content,
                isPartial: chunk.isPartial,
                timestamp: chunk.timestamp,
                traceId,
                stepIndex,
              };
              yield textChunk;
              this.emitter.emit("agent:text", textChunk as never);
            } else if (chunk.type === "agent-tool-call") {
              const toolCallChunk: NetworkStreamChunk = {
                type: "agent-tool-call",
                agentId: chunk.agentId,
                toolName: chunk.toolName,
                args: chunk.args,
                toolCallId: chunk.toolCallId,
                timestamp: chunk.timestamp,
                traceId,
                stepIndex,
              };
              yield toolCallChunk;
              this.emitter.emit("agent:tool-call", toolCallChunk as never);
            } else if (chunk.type === "agent-tool-result") {
              const toolResultChunk: NetworkStreamChunk = {
                type: "agent-tool-result",
                agentId: chunk.agentId,
                toolName: chunk.toolName,
                toolCallId: chunk.toolCallId,
                result: chunk.result,
                success: chunk.success,
                timestamp: chunk.timestamp,
                traceId,
                stepIndex,
              };
              yield toolResultChunk;
              this.emitter.emit("agent:tool-result", toolResultChunk as never);
            } else if (chunk.type === "agent-complete") {
              stepOutput = chunk.content;
              if (chunk.usage) {
                totalUsage.promptTokens += chunk.usage.promptTokens ?? 0;
                totalUsage.completionTokens +=
                  chunk.usage.completionTokens ?? 0;
                totalUsage.totalTokens += chunk.usage.totalTokens ?? 0;
              }
            }
          }

          finalResult = stepOutput;
        } else {
          // Execute non-streaming primitives
          const result = await this.executePrimitive(
            primitive,
            primitiveInput,
            options,
            traceId,
          );
          stepOutput =
            typeof result.output === "string"
              ? result.output
              : JSON.stringify(result.output);
          finalResult = stepOutput;
        }

        // Record step
        trace.steps.push({
          index: stepIndex,
          primitive: {
            type: primitive.type,
            id: primitive.id,
            name: primitive.name,
          },
          input: primitiveInput,
          output: stepOutput,
          duration: 0,
          timestamp: Date.now(),
        });

        // Emit primitive end
        const primitiveEndChunk: NetworkStreamChunk = {
          type: "primitive-end",
          primitive: {
            type: primitive.type,
            id: primitive.id,
            name: primitive.name,
          },
          output: stepOutput,
          timestamp: Date.now(),
          traceId,
          stepIndex,
        };
        yield primitiveEndChunk;
        this.emitter.emit("primitive:end", primitiveEndChunk as never);

        // Check completion
        if (this.isTaskComplete(stepOutput, currentMessage)) {
          break;
        }

        currentMessage = this.buildContinuationMessage(
          this.extractMessage(input.message),
          stepOutput,
          trace.steps,
        );
        stepIndex++;
      }

      trace.endTime = Date.now();

      // Emit network complete
      const completeChunk: NetworkStreamChunk = {
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
      yield completeChunk;
      this.emitter.emit("network:complete", completeChunk as never);
    } catch (error) {
      const errorChunk: NetworkStreamChunk = {
        type: "network-error",
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
        traceId,
        stepIndex,
      };
      yield errorChunk;
      this.emitter.emit("network:error", errorChunk as never);
    }
  }

  /**
   * Execute a primitive
   */
  private async executePrimitive(
    primitive: Primitive,
    input: unknown,
    options?: NetworkExecutionOptions,
    traceId?: string,
  ): Promise<{
    output: unknown;
    error?: string;
    usage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    };
  }> {
    try {
      switch (primitive.type) {
        case "agent": {
          const agentPrimitive = primitive as AgentPrimitive;
          const result = await agentPrimitive.agent.execute(
            typeof input === "string" ? input : JSON.stringify(input),
            {
              context: options?.context,
              maxSteps: options?.maxSteps,
              traceId,
            },
          );
          return { output: result.content, usage: result.usage };
        }

        case "workflow": {
          const workflowPrimitive = primitive as WorkflowPrimitive;
          const result = await workflowPrimitive.workflow.execute(input);
          return { output: result.output };
        }

        case "tool": {
          const toolPrimitive = primitive as ToolPrimitive;
          const result = await toolPrimitive.execute(input, {
            sessionId: traceId,
          });
          return { output: result };
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
      };
    }
  }

  /**
   * Extract message string from input
   */
  private extractMessage(message: string | CoreMessage[]): string {
    if (typeof message === "string") {
      return message;
    }
    return message.map((m) => m.content).join("\n");
  }

  /**
   * Check if task is complete
   */
  private isTaskComplete(output: string, _originalTask: string): boolean {
    if (!output || output.length < TASK_COMPLETION_MIN_LENGTH) {
      return false;
    }

    // Simple heuristic: if output is substantial and doesn't indicate more work needed
    const lowerOutput = output.toLowerCase();
    const continuationPhrases = [
      "need to",
      "next step",
      "continue with",
      "let me",
      "i will",
      "i'll",
      "should also",
      "additionally",
    ];

    // If the output ends with continuation phrases, task may not be complete
    for (const phrase of continuationPhrases) {
      if (
        lowerOutput.endsWith(phrase) ||
        lowerOutput.slice(-50).includes(phrase)
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Build continuation message for next iteration
   */
  private buildContinuationMessage(
    originalTask: string,
    previousOutput: unknown,
    steps: NetworkExecutionStep[],
  ): string {
    const outputStr =
      typeof previousOutput === "string"
        ? previousOutput
        : JSON.stringify(previousOutput);

    const stepsSummary = steps
      .map(
        (s) =>
          `Step ${s.index + 1} (${s.primitive.name}): ${typeof s.output === "string" ? s.output.slice(0, 100) : "completed"}`,
      )
      .join("\n");

    return `Original task: ${originalTask}

Previous steps:
${stepsSummary}

Latest result: ${outputStr}

Continue with the next step or provide the final answer if the task is complete.`;
  }

  /**
   * Get an agent by ID
   */
  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  /**
   * Get all agents
   */
  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get all primitives
   */
  getAllPrimitives(): Primitive[] {
    return Array.from(this.primitives.values());
  }

  /**
   * Add an agent to the network
   */
  addAgent(agent: Agent): void {
    this.agents.set(agent.id, agent);

    const primitive: AgentPrimitive = {
      id: agent.id,
      type: "agent",
      name: agent.name,
      description: agent.description,
      inputSchema: agent.inputSchema,
      outputSchema: agent.outputSchema,
      agent,
    };

    this.primitives.set(agent.id, primitive);
    logger.debug(`[AgentNetwork:${this.id}] Added agent: ${agent.name}`);
  }

  /**
   * Remove an agent from the network
   */
  removeAgent(id: string): boolean {
    const removed = this.agents.delete(id);
    if (removed) {
      this.primitives.delete(id);
      logger.debug(`[AgentNetwork:${this.id}] Removed agent: ${id}`);
    }
    return removed;
  }

  /**
   * Subscribe to network events
   */
  on<K extends keyof AgentNetworkEvents>(
    event: K,
    handler: (...args: AgentNetworkEvents[K]) => void,
  ): this {
    this.emitter.on(event, handler);
    return this;
  }

  /**
   * Unsubscribe from network events
   */
  off<K extends keyof AgentNetworkEvents>(
    event: K,
    handler: (...args: AgentNetworkEvents[K]) => void,
  ): this {
    this.emitter.off(event, handler);
    return this;
  }

  /**
   * Get network configuration
   */
  getConfig(): AgentNetworkConfig {
    return { ...this.config };
  }

  /**
   * Get routing history
   */
  getRoutingHistory(): RoutingDecision[] {
    return this.routingAgent.getHistory();
  }
}
