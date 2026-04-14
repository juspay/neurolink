/**
 * AgentNetwork - Multi-Agent Orchestration for NeuroLink
 *
 * Uses the ai SDK's built-in tool loop: each agent is wrapped as an ai SDK
 * tool, and the network's router is a single neurolink.generate() call with
 * maxSteps. The SDK iterates automatically (tool call → execute → feed result
 * → next call) until the model stops or maxSteps is reached.
 */

import { randomUUID } from "crypto";
import { EventEmitter } from "events";
import { tool } from "ai";
import { z } from "zod";
import type { Tool } from "ai";
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
  ToolPrimitive,
  WorkflowPrimitive,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { ErrorFactory } from "../utils/errorHandling.js";
import { Agent } from "./agent.js";

/**
 * AgentNetwork - Multi-agent orchestration using the ai SDK tool loop
 *
 * Each agent in the network is registered as an ai SDK `tool()`. A single
 * `neurolink.generate()` call with `maxSteps` acts as the router: the model
 * picks which agent tool(s) to call, the SDK executes them and feeds results
 * back, and the loop continues until the model emits `finishReason: "stop"` or
 * maxSteps is exhausted.
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

  // Lazy tool initialization
  private toolsInitialized = false;
  private toolsInitPromise: Promise<void> | null = null;

  constructor(config: AgentNetworkConfig, neurolink: NeuroLink) {
    if (!config.name || typeof config.name !== "string") {
      throw ErrorFactory.invalidConfiguration(
        "name",
        "AgentNetwork config must have a valid name",
      );
    }
    if (!Array.isArray(config.agents) || config.agents.length === 0) {
      throw ErrorFactory.invalidConfiguration(
        "agents",
        "AgentNetwork config must have at least one agent",
      );
    }

    this.id = config.id ?? randomUUID();
    this.name = config.name;
    this.description = config.description;
    this.neurolink = neurolink;
    this.config = config;
    this.emitter = new EventEmitter();

    this.initializeAgents(config);
    this.initializeWorkflows(config);

    logger.info(`[AgentNetwork:${this.id}] Created network: ${this.name}`, {
      agentCount: this.agents.size,
      workflowCount: this.workflows.size,
      toolCount: config.tools?.length || 0,
    });
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

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

  private async initializeTools(): Promise<void> {
    if (!this.config.tools || this.config.tools.length === 0) {
      return;
    }

    try {
      const availableTools = await this.neurolink.getAllAvailableTools();

      for (const toolName of this.config.tools) {
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

  // ============================================================================
  // AGENT-AS-TOOL CONSTRUCTION
  // ============================================================================

  /**
   * Build a Record of ai SDK tools — one per agent in the network.
   * The router model calls these tools to delegate subtasks.
   */
  private buildAgentTools(): Record<string, Tool> {
    const tools: Record<string, Tool> = {};

    for (const [id, agentInstance] of this.agents) {
      // Capture in closure so the async execute below closes over the right values
      const capturedId = id;
      const capturedAgent = agentInstance;

      const schema = z.object({
        task: z.string().describe("The task to delegate to this agent"),
      });

      tools[`agent_${capturedId}`] = tool({
        description: `Agent: ${capturedAgent.name} - ${capturedAgent.description}`,
        inputSchema: schema,
        execute: async (params: z.infer<typeof schema>) => {
          logger.debug(
            `[AgentNetwork:${this.id}] Delegating to agent: ${capturedAgent.name}`,
            { task: params.task.slice(0, 100) },
          );
          const result = await capturedAgent.execute(params.task);
          return {
            agentId: capturedId,
            content: result.content,
            status: result.status,
            error: result.error,
          };
        },
      });
    }

    return tools;
  }

  /**
   * Build the router system prompt that describes all available agents and
   * instructs the model to delegate tasks via agent tools.
   */
  private buildRouterSystemPrompt(): string {
    const agentDescriptions = Array.from(this.agents.values())
      .map((a) => `- agent_${a.id}: ${a.name} — ${a.description}`)
      .join("\n");

    const baseInstructions =
      this.config.router?.instructions ??
      "You are a task orchestrator. Analyze the user's request and delegate to the most appropriate agent(s). You may call multiple agents sequentially if the task requires multiple steps. Once all necessary agents have responded, synthesize their outputs into a final answer.";

    return `${baseInstructions}

Available agents:
${agentDescriptions}

Use the appropriate agent tool(s) to handle the task. Return a clear, complete final answer once all needed agents have completed their work.`;
  }

  /**
   * Build NetworkExecutionTrace steps from generate() toolExecutions.
   */
  private buildTrace(
    toolExecutions:
      | Array<{ name: string; input: Record<string, unknown>; output: unknown }>
      | undefined,
    traceId: string,
    startTime: number,
  ): NetworkExecutionTrace {
    const steps: NetworkExecutionStep[] = (toolExecutions ?? []).map(
      (exec, index) => {
        // Tool name format is "agent_<id>" — extract agent id
        const agentId = exec.name.startsWith("agent_")
          ? exec.name.slice("agent_".length)
          : exec.name;

        const primitive = this.primitives.get(agentId);

        return {
          index,
          primitive: {
            type: primitive?.type ?? "agent",
            id: agentId,
            name: primitive?.name ?? agentId,
          },
          input: exec.input,
          output: exec.output,
          duration: 0, // individual step timing not available from generate()
          timestamp: startTime,
        };
      },
    );

    return {
      traceId,
      steps,
      routingDecisions: [], // routing is implicit in the model's tool calls
      startTime,
      endTime: Date.now(),
    };
  }

  // ============================================================================
  // PUBLIC EXECUTION API
  // ============================================================================

  /**
   * Execute the network with intelligent routing via the ai SDK tool loop.
   *
   * A single `neurolink.generate()` call is issued. The model decides which
   * agent tool(s) to call; the SDK executes them and loops until `stop` or
   * `maxSteps` is reached.
   */
  async execute(
    input: NetworkExecutionInput,
    options?: NetworkExecutionOptions,
  ): Promise<NetworkExecutionResult> {
    const startTime = Date.now();
    const traceId = options?.tracing?.traceId ?? randomUUID();
    const maxSteps = options?.maxSteps ?? this.config.defaults?.maxSteps ?? 10;

    await this.ensureToolsInitialized();

    const message = this.extractMessageContent(input.message);

    logger.info(`[AgentNetwork:${this.id}] Starting execute`, {
      traceId,
      maxSteps,
      agentCount: this.agents.size,
    });

    this.emit("network:start", { traceId, input: message, startTime });

    try {
      const agentTools = this.buildAgentTools();
      const systemPrompt = this.buildRouterSystemPrompt();

      const result = await this.neurolink.generate({
        input: { text: message },
        systemPrompt,
        provider: this.config.router?.provider as string | undefined,
        model: this.config.router?.model,
        maxSteps,
        tools: agentTools,
      } as Parameters<NeuroLink["generate"]>[0]);

      const toolExecutions = (result.toolExecutions ?? []) as Array<{
        name: string;
        input: Record<string, unknown>;
        output: unknown;
      }>;

      const trace = this.buildTrace(toolExecutions, traceId, startTime);

      // Aggregate token usage across all agent tool calls
      const usage = result.usage;
      const totalUsage: NetworkTokenUsage = {
        promptTokens: usage?.input ?? 0,
        completionTokens: usage?.output ?? 0,
        totalTokens: usage?.total ?? 0,
        byAgent: {},
      };

      const executionResult: NetworkExecutionResult = {
        content: result.content || "",
        trace,
        usage: totalUsage,
        status: "completed",
        duration: Date.now() - startTime,
      };

      this.emit("network:complete", { traceId, result: executionResult });
      return executionResult;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.error(`[AgentNetwork:${this.id}] Execution failed`, {
        traceId,
        error: errorMessage,
      });

      const failedResult: NetworkExecutionResult = {
        content: "",
        trace: {
          traceId,
          steps: [],
          routingDecisions: [],
          startTime,
          endTime: Date.now(),
        },
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        status: "error",
        duration: Date.now() - startTime,
        error: errorMessage,
      };

      this.emit("network:error", { traceId, error: errorMessage });
      return failedResult;
    }
  }

  /**
   * Stream network execution using the ai SDK tool loop.
   *
   * Calls `neurolink.stream()` with agent tools. Text chunks, tool calls, and
   * tool results are forwarded as typed NetworkStreamChunk events.
   */
  async *stream(
    input: NetworkExecutionInput,
    options?: NetworkExecutionOptions,
  ): AsyncIterable<NetworkStreamChunk> {
    const startTime = Date.now();
    const traceId = options?.tracing?.traceId ?? randomUUID();
    const maxSteps = options?.maxSteps ?? this.config.defaults?.maxSteps ?? 10;

    await this.ensureToolsInitialized();

    const message = this.extractMessageContent(input.message);

    yield {
      type: "network-start",
      networkId: this.id,
      input: message,
      timestamp: startTime,
      traceId,
    };

    const totalUsage: NetworkTokenUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };
    let finalContent = "";

    try {
      const agentTools = this.buildAgentTools();
      const systemPrompt = this.buildRouterSystemPrompt();

      const streamResult = await this.neurolink.stream({
        input: { text: message },
        systemPrompt,
        provider: this.config.router?.provider as string | undefined,
        model: this.config.router?.model,
        maxSteps,
        tools: agentTools,
      } as Parameters<NeuroLink["stream"]>[0]);

      for await (const chunk of streamResult.stream) {
        if ("content" in chunk && typeof chunk.content === "string") {
          finalContent += chunk.content;
          yield {
            type: "agent-text",
            agentId: this.id,
            content: chunk.content,
            isPartial: true,
            timestamp: Date.now(),
            traceId,
          } as AgentTextChunk;
        } else if ("toolCall" in chunk) {
          const tc = chunk as {
            toolCall?: {
              toolName?: string;
              args?: unknown;
              toolCallId?: string;
            };
          };
          yield {
            type: "agent-tool-call",
            agentId: this.id,
            toolName: tc.toolCall?.toolName ?? "unknown",
            args: tc.toolCall?.args,
            toolCallId: tc.toolCall?.toolCallId ?? `tool-${Date.now()}`,
            timestamp: Date.now(),
            traceId,
          } as AgentToolCallChunk;
        } else if ("toolResult" in chunk) {
          const tr = chunk as {
            toolResult?: {
              toolName?: string;
              toolCallId?: string;
              result?: unknown;
            };
          };
          yield {
            type: "agent-tool-result",
            agentId: this.id,
            toolName: tr.toolResult?.toolName ?? "unknown",
            toolCallId: tr.toolResult?.toolCallId ?? `tool-${Date.now()}`,
            result: tr.toolResult?.result,
            success: true,
            timestamp: Date.now(),
            traceId,
          } as AgentToolResultChunk;
        }
      }

      // Collect final usage if available
      if (streamResult.usage) {
        totalUsage.promptTokens = streamResult.usage.input ?? 0;
        totalUsage.completionTokens = streamResult.usage.output ?? 0;
        totalUsage.totalTokens = streamResult.usage.total ?? 0;
      }

      const trace: NetworkExecutionTrace = {
        traceId,
        steps: [],
        routingDecisions: [],
        startTime,
        endTime: Date.now(),
      };

      yield {
        type: "network-complete",
        result: {
          content: finalContent,
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
      };
    }
  }

  // ============================================================================
  // PUBLIC ACCESSORS
  // ============================================================================

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getAllPrimitives(): Primitive[] {
    return Array.from(this.primitives.values());
  }

  on(event: string, handler: (...args: unknown[]) => void): void {
    this.emitter.on(event, handler);
  }

  off(event: string, handler: (...args: unknown[]) => void): void {
    this.emitter.off(event, handler);
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private extractMessageContent(message: string | CoreMessage[]): string {
    if (typeof message === "string") {
      return message;
    }
    return message.map((m) => m.content).join("\n");
  }

  private emit(event: string, ...args: unknown[]): void {
    this.emitter.emit(event, ...args);
  }
}
