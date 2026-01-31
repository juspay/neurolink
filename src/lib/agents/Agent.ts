/**
 * Agent Class Implementation
 *
 * Core Agent class that wraps a NeuroLink instance with specialized behavior.
 * Agents are the building blocks of multi-agent networks, providing focused
 * capabilities with clear instructions and optional schema validation.
 */

import { randomUUID } from "crypto";
import type {
  AgentDefinition,
  AgentInterface,
  AgentInput,
  AgentResult,
  AgentExecutionOptions,
  AgentStreamChunk,
  AgentStatus,
  AgentState,
  ToolExecution,
} from "./types/agentTypes.js";
import { AgentExecutionError, ValidationError } from "./errors/agentErrors.js";
import { TypedEventEmitter } from "../core/infrastructure/typedEventEmitter.js";
import { logger } from "../utils/logger.js";
import type { TokenUsage } from "./types/agentTypes.js";

// ============================================================================
// Agent Events
// ============================================================================

/**
 * Events emitted by the Agent
 */
interface AgentEvents {
  "execution:start": [{ agentId: string; input: AgentInput }];
  "execution:complete": [{ agentId: string; result: AgentResult }];
  "execution:error": [{ agentId: string; error: Error }];
  "tool:call": [
    { agentId: string; toolName: string; args: unknown; toolCallId: string },
  ];
  "tool:result": [
    {
      agentId: string;
      toolName: string;
      toolCallId: string;
      result: unknown;
      success: boolean;
    },
  ];
}

// ============================================================================
// Agent Class
// ============================================================================

/**
 * Agent implementation that wraps a NeuroLink instance with specialized behavior
 *
 * @example
 * ```typescript
 * const agent = new Agent({
 *   id: 'researcher',
 *   name: 'Research Agent',
 *   description: 'Searches and analyzes information',
 *   instructions: 'You are a research assistant. Search for information and provide detailed analysis.',
 *   tools: ['websearchGrounding', 'readFile'],
 *   maxSteps: 5
 * }, neurolink);
 *
 * const result = await agent.execute('Find information about TypeScript');
 * ```
 */
export class Agent implements AgentInterface {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly instructions: string;
  readonly provider?: string;
  readonly model?: string;
  readonly tools?: string[];
  readonly inputSchema?: import("zod").ZodSchema;
  readonly outputSchema?: import("zod").ZodSchema;
  readonly maxSteps: number;
  readonly temperature: number;
  readonly canDelegate: boolean;
  readonly metadata?: Record<string, unknown>;

  private sdk: unknown; // NeuroLink instance
  private emitter: TypedEventEmitter<AgentEvents>;
  private executionCount: number = 0;
  private lastExecutionTime?: number;
  private state: AgentState = "idle";
  private toolExecutions: ToolExecution[] = [];

  constructor(definition: AgentDefinition, sdk: unknown) {
    this.id = definition.id;
    this.name = definition.name;
    this.description = definition.description;
    this.instructions = definition.instructions;
    this.provider = definition.provider;
    this.model = definition.model;
    this.tools = definition.tools;
    this.inputSchema = definition.inputSchema;
    this.outputSchema = definition.outputSchema;
    this.maxSteps = definition.maxSteps ?? 10;
    this.temperature = definition.temperature ?? 0.7;
    this.canDelegate = definition.canDelegate ?? false;
    this.metadata = definition.metadata;

    this.sdk = sdk;
    this.emitter = new TypedEventEmitter<AgentEvents>();

    logger.debug(`[Agent:${this.id}] Created agent: ${this.name}`);
  }

  /**
   * Execute the agent with given input
   */
  async execute(
    input: AgentInput,
    options?: AgentExecutionOptions,
  ): Promise<AgentResult> {
    const startTime = Date.now();
    const traceId = options?.traceId ?? `agent-${this.id}-${randomUUID()}`;
    this.executionCount++;
    this.state = "executing";
    this.toolExecutions = [];

    logger.debug(`[Agent:${this.id}] Starting execution`, {
      traceId,
      input: typeof input === "string" ? input.slice(0, 100) : "structured",
    });

    this.emitter.emit("execution:start", { agentId: this.id, input });

    try {
      // Validate input if schema provided
      const validatedInput = this.validateInput(input);

      // Build the prompt with agent context
      const prompt = this.buildPrompt(validatedInput, options?.context);

      // Get the NeuroLink SDK
      const neurolink = this.sdk as {
        generate: (options: {
          input: { text: string };
          provider?: string;
          model?: string;
          temperature?: number;
          systemPrompt?: string;
          maxSteps?: number;
          tools?: string[];
          context?: Record<string, unknown>;
        }) => Promise<{
          content: string;
          usage?: TokenUsage;
          toolsUsed?: string[];
          toolExecutions?: Array<{
            name: string;
            args: unknown;
            result: unknown;
            duration?: number;
            success?: boolean;
            error?: string;
          }>;
        }>;
      };

      // Execute via NeuroLink
      const result = await neurolink.generate({
        input: { text: prompt },
        provider: this.provider,
        model: this.model,
        temperature: this.temperature,
        systemPrompt: this.instructions,
        maxSteps: options?.maxSteps ?? this.maxSteps,
        tools: this.tools,
        context: {
          agentId: this.id,
          agentName: this.name,
          traceId,
          ...options?.context,
        },
      });

      const duration = Date.now() - startTime;
      this.lastExecutionTime = duration;
      this.state = "idle";

      // Parse output if schema provided
      let parsedOutput: unknown = undefined;
      if (this.outputSchema) {
        parsedOutput = this.validateOutput(result.content);
      }

      // Transform tool executions
      if (result.toolExecutions) {
        this.toolExecutions = result.toolExecutions.map((te) => ({
          name: te.name,
          args: te.args,
          result: te.result,
          duration: te.duration ?? 0,
          success: te.success ?? true,
          error: te.error,
        }));
      }

      const agentResult: AgentResult = {
        content: result.content,
        object: parsedOutput,
        usage: result.usage,
        toolsUsed: result.toolsUsed,
        toolExecutions: this.toolExecutions,
        duration,
        status: "success",
        agentId: this.id,
      };

      this.emitter.emit("execution:complete", {
        agentId: this.id,
        result: agentResult,
      });

      logger.debug(`[Agent:${this.id}] Execution completed`, {
        traceId,
        duration,
        toolsUsed: result.toolsUsed?.length ?? 0,
      });

      return agentResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.lastExecutionTime = duration;
      this.state = "error";

      const agentError =
        error instanceof Error
          ? new AgentExecutionError(error.message, {
              cause: error,
              agentId: this.id,
              traceId,
            })
          : new AgentExecutionError(String(error), {
              agentId: this.id,
              traceId,
            });

      logger.error(`[Agent:${this.id}] Execution failed`, {
        traceId,
        error: agentError.message,
        duration,
      });

      this.emitter.emit("execution:error", {
        agentId: this.id,
        error: agentError,
      });

      return {
        content: "",
        error: agentError.message,
        duration,
        status: "error",
        agentId: this.id,
      };
    }
  }

  /**
   * Stream execution results
   */
  async *stream(
    input: AgentInput,
    options?: AgentExecutionOptions,
  ): AsyncIterable<AgentStreamChunk> {
    const startTime = Date.now();
    const traceId = options?.traceId ?? `agent-${this.id}-${randomUUID()}`;
    this.executionCount++;
    this.state = "executing";
    this.toolExecutions = [];

    // Emit start event
    yield {
      type: "agent-start",
      agentId: this.id,
      timestamp: startTime,
      traceId,
    };

    try {
      // Validate input
      const validatedInput = this.validateInput(input);
      const prompt = this.buildPrompt(validatedInput, options?.context);

      // Get the NeuroLink SDK
      const neurolink = this.sdk as {
        stream: (options: {
          input: { text: string };
          provider?: string;
          model?: string;
          temperature?: number;
          systemPrompt?: string;
          maxSteps?: number;
          tools?: string[];
          context?: Record<string, unknown>;
        }) => Promise<{
          stream: AsyncIterable<{
            content?: string;
            toolCall?: {
              name: string;
              args: unknown;
              toolCallId: string;
            };
            toolResult?: {
              name: string;
              toolCallId: string;
              result: unknown;
              success: boolean;
            };
          }>;
          usage?: TokenUsage;
        }>;
      };

      // Stream via NeuroLink
      const streamResult = await neurolink.stream({
        input: { text: prompt },
        provider: this.provider,
        model: this.model,
        temperature: this.temperature,
        systemPrompt: this.instructions,
        maxSteps: options?.maxSteps ?? this.maxSteps,
        tools: this.tools,
        context: {
          agentId: this.id,
          agentName: this.name,
          traceId,
          ...options?.context,
        },
      });

      let fullContent = "";

      for await (const chunk of streamResult.stream) {
        if (chunk.content) {
          fullContent += chunk.content;
          yield {
            type: "agent-text",
            agentId: this.id,
            content: chunk.content,
            isPartial: true,
            timestamp: Date.now(),
            traceId,
          };
        }

        if (chunk.toolCall) {
          yield {
            type: "agent-tool-call",
            agentId: this.id,
            toolName: chunk.toolCall.name,
            args: chunk.toolCall.args,
            toolCallId: chunk.toolCall.toolCallId,
            timestamp: Date.now(),
            traceId,
          };
        }

        if (chunk.toolResult) {
          yield {
            type: "agent-tool-result",
            agentId: this.id,
            toolName: chunk.toolResult.name,
            toolCallId: chunk.toolResult.toolCallId,
            result: chunk.toolResult.result,
            success: chunk.toolResult.success,
            timestamp: Date.now(),
            traceId,
          };
        }
      }

      const duration = Date.now() - startTime;
      this.lastExecutionTime = duration;
      this.state = "idle";

      yield {
        type: "agent-complete",
        agentId: this.id,
        content: fullContent,
        usage: streamResult.usage,
        duration,
        timestamp: Date.now(),
        traceId,
      };
    } catch (error) {
      this.state = "error";

      yield {
        type: "agent-error",
        agentId: this.id,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
        traceId,
      };
    }
  }

  /**
   * Get agent status
   */
  getStatus(): AgentStatus {
    return {
      id: this.id,
      name: this.name,
      executionCount: this.executionCount,
      lastExecutionTime: this.lastExecutionTime,
      available: this.state === "idle",
      state: this.state,
    };
  }

  /**
   * Subscribe to agent events
   */
  on<K extends keyof AgentEvents>(
    event: K,
    listener: (...args: AgentEvents[K]) => void,
  ): this {
    this.emitter.on(event, listener);
    return this;
  }

  /**
   * Unsubscribe from agent events
   */
  off<K extends keyof AgentEvents>(
    event: K,
    listener: (...args: AgentEvents[K]) => void,
  ): this {
    this.emitter.off(event, listener);
    return this;
  }

  /**
   * Validate input against schema
   */
  private validateInput(input: AgentInput): AgentInput {
    if (!this.inputSchema) {
      return input;
    }

    if (typeof input === "string") {
      return input;
    }

    const result = this.inputSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationError(
        `Input validation failed: ${result.error.message}`,
        {
          agentId: this.id,
          validationErrors: result.error.errors.map(
            (e) => `${e.path.join(".")}: ${e.message}`,
          ),
        },
      );
    }

    return result.data;
  }

  /**
   * Validate output against schema
   */
  private validateOutput(content: string): unknown {
    if (!this.outputSchema) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(content);
      const result = this.outputSchema.safeParse(parsed);

      if (!result.success) {
        logger.warn(`[Agent:${this.id}] Output validation failed`, {
          errors: result.error.errors,
        });
        return undefined;
      }

      return result.data;
    } catch (error) {
      logger.warn(`[Agent:${this.id}] Failed to parse output as JSON`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    }
  }

  /**
   * Build prompt from input and context
   */
  private buildPrompt(
    input: AgentInput,
    context?: Record<string, unknown>,
  ): string {
    let prompt = typeof input === "string" ? input : JSON.stringify(input);

    if (context && Object.keys(context).length > 0) {
      const contextStr = Object.entries(context)
        .filter(([key]) => !["agentId", "agentName", "traceId"].includes(key))
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join("\n");

      if (contextStr) {
        prompt = `Context:\n${contextStr}\n\nTask: ${prompt}`;
      }
    }

    return prompt;
  }

  /**
   * Create a copy of the agent with modified properties
   */
  clone(overrides: Partial<AgentDefinition>): Agent {
    return new Agent(
      {
        id: overrides.id ?? `${this.id}-clone-${randomUUID().slice(0, 8)}`,
        name: overrides.name ?? this.name,
        description: overrides.description ?? this.description,
        instructions: overrides.instructions ?? this.instructions,
        provider: overrides.provider ?? this.provider,
        model: overrides.model ?? this.model,
        tools: overrides.tools ?? this.tools,
        inputSchema: overrides.inputSchema ?? this.inputSchema,
        outputSchema: overrides.outputSchema ?? this.outputSchema,
        maxSteps: overrides.maxSteps ?? this.maxSteps,
        temperature: overrides.temperature ?? this.temperature,
        canDelegate: overrides.canDelegate ?? this.canDelegate,
        metadata: { ...this.metadata, ...overrides.metadata },
      },
      this.sdk,
    );
  }

  /**
   * Get the agent definition
   */
  getDefinition(): AgentDefinition {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      instructions: this.instructions,
      provider: this.provider,
      model: this.model,
      tools: this.tools,
      inputSchema: this.inputSchema,
      outputSchema: this.outputSchema,
      maxSteps: this.maxSteps,
      temperature: this.temperature,
      canDelegate: this.canDelegate,
      metadata: this.metadata,
    };
  }
}
