/**
 * Agent - Core agent implementation for NeuroLink
 *
 * An Agent wraps a NeuroLink instance with specialized behavior, instructions,
 * and tool restrictions. Agents can be composed into networks for multi-agent
 * orchestration using the agents-as-tools pattern.
 */

import { EventEmitter } from "events";
import type { z } from "zod";
import type { NeuroLink } from "../neurolink.js";
import type {
  AgentDefinition,
  AgentExecutionOptions,
  AgentInput,
  AgentInstance,
  AgentResult,
  AgentStatus,
  AgentStreamChunk,
  GenerateOptions,
  StreamOptions,
} from "../types/index.js";
import { ErrorFactory } from "../utils/errorHandling.js";
import { logger } from "../utils/logger.js";

/**
 * Agent - Wraps a NeuroLink instance with specialized behavior
 *
 * Features:
 * - Custom instructions and persona
 * - Tool restrictions per agent (via toolFilter on generate/stream)
 * - Input/output schema validation
 * - Streaming support
 * - Execution metrics tracking
 *
 * @example
 * ```typescript
 * const agent = new Agent({
 *   id: 'researcher',
 *   name: 'Research Agent',
 *   description: 'Searches and analyzes information',
 *   instructions: 'You are a research assistant...',
 *   tools: ['websearchGrounding', 'readFile'],
 * }, neurolink);
 *
 * const result = await agent.execute('Find information about quantum computing');
 * ```
 */
export class Agent implements AgentInstance {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly instructions: string;
  readonly provider?: string;
  readonly model?: string;
  readonly tools?: string[];
  readonly inputSchema?: z.ZodSchema;
  readonly outputSchema?: z.ZodSchema;
  readonly maxSteps: number;
  readonly temperature: number;
  readonly canDelegate: boolean;
  readonly metadata?: Record<string, unknown>;

  private neurolink: NeuroLink;
  private emitter: EventEmitter;
  private executionCount: number = 0;
  private lastExecutionTime?: number;
  private totalExecutionTime: number = 0;

  constructor(definition: AgentDefinition, neurolink: NeuroLink) {
    // Validate required fields
    if (!definition.id || typeof definition.id !== "string") {
      throw ErrorFactory.invalidConfiguration(
        "AgentDefinition.id",
        "Agent definition must have a valid id",
      );
    }
    if (!definition.name || typeof definition.name !== "string") {
      throw ErrorFactory.invalidConfiguration(
        "AgentDefinition.name",
        "Agent definition must have a valid name",
      );
    }
    if (!definition.description || typeof definition.description !== "string") {
      throw ErrorFactory.invalidConfiguration(
        "AgentDefinition.description",
        "Agent definition must have a valid description",
      );
    }
    if (
      !definition.instructions ||
      typeof definition.instructions !== "string"
    ) {
      throw ErrorFactory.invalidConfiguration(
        "AgentDefinition.instructions",
        "Agent definition must have valid instructions",
      );
    }

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

    this.neurolink = neurolink;
    this.emitter = new EventEmitter();

    logger.debug(`[Agent:${this.id}] Created agent: ${this.name}`, {
      tools: this.tools?.length || 0,
      maxSteps: this.maxSteps,
      canDelegate: this.canDelegate,
    });
  }

  /**
   * Execute the agent with given input
   *
   * @param input - Text input or structured data
   * @param options - Execution options
   * @returns Agent result with content and metadata
   */
  async execute(
    input: AgentInput,
    options?: AgentExecutionOptions,
  ): Promise<AgentResult> {
    const startTime = Date.now();
    this.executionCount++;

    const traceId = options?.traceId ?? `agent-${this.id}-${Date.now()}`;

    logger.debug(`[Agent:${this.id}] Starting execution`, {
      traceId,
      input: typeof input === "string" ? input.slice(0, 100) : "structured",
      executionCount: this.executionCount,
    });

    this.emitter.emit("agent:start", {
      agentId: this.id,
      traceId,
      timestamp: startTime,
    });

    try {
      // Validate input if schema provided
      if (this.inputSchema && typeof input !== "string") {
        const validation = this.inputSchema.safeParse(input);
        if (!validation.success) {
          throw new Error(
            `Input validation failed: ${validation.error.message}`,
          );
        }
      }

      // Build the prompt with agent context
      const prompt = this.buildPrompt(input, options?.context);

      // Build generation options
      const generateOptions = this.buildGenerateOptions(
        prompt,
        options,
        traceId,
      );

      // Execute via NeuroLink
      const result = await this.neurolink.generate(generateOptions);

      const duration = Date.now() - startTime;
      this.lastExecutionTime = duration;
      this.totalExecutionTime += duration;

      // Parse output if schema provided
      let parsedOutput: unknown;
      if (this.outputSchema && result.content) {
        try {
          const parsed = JSON.parse(result.content);
          const validation = this.outputSchema.safeParse(parsed);
          if (validation.success) {
            parsedOutput = validation.data;
          } else {
            logger.warn(`[Agent:${this.id}] Output schema validation failed`, {
              error: validation.error.message,
            });
          }
        } catch {
          logger.warn(`[Agent:${this.id}] Failed to parse output as JSON`);
        }
      }

      logger.debug(`[Agent:${this.id}] Execution completed`, {
        traceId,
        duration,
        contentLength: result.content?.length || 0,
        toolsUsed: result.toolsUsed?.length || 0,
      });

      // Pass through toolExecutions, adding duration (not provided by generate())
      const toolExecutions = result.toolExecutions?.map((te) => ({
        name: te.name,
        input: te.input,
        output: te.output,
        duration: 0,
      }));

      const agentResult: AgentResult = {
        content: result.content || "",
        object: parsedOutput,
        usage: result.usage,
        toolsUsed: result.toolsUsed,
        toolExecutions,
        duration,
        status: "success",
        agentId: this.id,
      };

      this.emitter.emit("agent:complete", {
        agentId: this.id,
        traceId,
        duration,
        result: agentResult,
      });

      return agentResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.lastExecutionTime = duration;

      logger.error(`[Agent:${this.id}] Execution failed`, {
        traceId,
        error: error instanceof Error ? error.message : String(error),
        duration,
      });

      this.emitter.emit("agent:error", {
        agentId: this.id,
        traceId,
        error,
        duration,
      });

      return {
        content: "",
        error: error instanceof Error ? error.message : String(error),
        duration,
        status: "error",
        agentId: this.id,
      };
    }
  }

  /**
   * Stream execution results
   *
   * @param input - Text input or structured data
   * @param options - Execution options
   * @yields Agent stream chunks
   */
  async *stream(
    input: AgentInput,
    options?: AgentExecutionOptions,
  ): AsyncIterable<AgentStreamChunk> {
    const startTime = Date.now();
    const traceId = options?.traceId ?? `agent-${this.id}-${Date.now()}`;

    this.emitter.emit("agent:start", {
      agentId: this.id,
      traceId,
      timestamp: startTime,
    });

    yield {
      type: "agent-start",
      agentId: this.id,
      timestamp: startTime,
      traceId,
    };

    try {
      // Validate input if schema provided
      if (this.inputSchema && typeof input !== "string") {
        const validation = this.inputSchema.safeParse(input);
        if (!validation.success) {
          throw new Error(
            `Input validation failed: ${validation.error.message}`,
          );
        }
      }

      const prompt = this.buildPrompt(input, options?.context);
      const streamOptions = this.buildStreamOptions(prompt, options, traceId);

      // Execute via NeuroLink
      const streamResult = await this.neurolink.stream(streamOptions);

      let fullContent = "";

      for await (const chunk of streamResult.stream) {
        // Handle different chunk types from the stream
        if ("content" in chunk && typeof chunk.content === "string") {
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

        // Handle tool calls if present
        if ("toolCall" in chunk && chunk.toolCall) {
          const toolCall = chunk.toolCall as {
            toolName?: string;
            args?: unknown;
            toolCallId?: string;
          };
          yield {
            type: "agent-tool-call",
            agentId: this.id,
            toolName: toolCall.toolName || "unknown",
            args: toolCall.args,
            toolCallId: toolCall.toolCallId || `tool-${Date.now()}`,
            timestamp: Date.now(),
            traceId,
          };
        }

        // Handle tool results if present
        if ("toolResult" in chunk && chunk.toolResult) {
          const toolResult = chunk.toolResult as {
            toolName?: string;
            toolCallId?: string;
            result?: unknown;
            success?: boolean;
          };
          yield {
            type: "agent-tool-result",
            agentId: this.id,
            toolName: toolResult.toolName || "unknown",
            toolCallId: toolResult.toolCallId || `tool-${Date.now()}`,
            result: toolResult.result,
            success: toolResult.success ?? true,
            timestamp: Date.now(),
            traceId,
          };
        }
      }

      const duration = Date.now() - startTime;
      this.lastExecutionTime = duration;
      this.executionCount++;
      this.totalExecutionTime += duration;

      this.emitter.emit("agent:complete", {
        agentId: this.id,
        traceId,
        duration,
        content: fullContent,
      });

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
      this.emitter.emit("agent:error", {
        agentId: this.id,
        traceId,
        error,
      });

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
      available: true,
    };
  }

  /**
   * Get average execution time
   */
  getAverageExecutionTime(): number {
    if (this.executionCount === 0) {
      return 0;
    }
    return this.totalExecutionTime / this.executionCount;
  }

  /**
   * Subscribe to agent events
   */
  on(event: string, handler: (...args: unknown[]) => void): void {
    this.emitter.on(event, handler);
  }

  /**
   * Unsubscribe from agent events
   */
  off(event: string, handler: (...args: unknown[]) => void): void {
    this.emitter.off(event, handler);
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
      prompt = `Context: ${JSON.stringify(context)}\n\nTask: ${prompt}`;
    }

    return prompt;
  }

  /**
   * Build generation options for NeuroLink.generate()
   *
   * Uses toolFilter to delegate tool restriction to BaseProvider.applyToolFiltering()
   * rather than pre-filtering tools manually.
   */
  private buildGenerateOptions(
    prompt: string,
    options?: AgentExecutionOptions,
    traceId?: string,
  ): GenerateOptions {
    return {
      input: { text: prompt },
      provider: this.provider,
      model: this.model,
      temperature: this.temperature,
      systemPrompt: this.instructions,
      // toolFilter delegates to BaseProvider.applyToolFiltering() natively
      ...(this.tools && this.tools.length > 0 && { toolFilter: this.tools }),
      maxSteps: options?.maxSteps ?? this.maxSteps,
      requestId: traceId,
      context: {
        agentId: this.id,
        agentName: this.name,
        ...options?.context,
      },
    };
  }

  /**
   * Build stream options for NeuroLink.stream()
   *
   * Uses toolFilter to delegate tool restriction to BaseProvider.applyToolFiltering()
   * rather than pre-filtering tools manually.
   */
  private buildStreamOptions(
    prompt: string,
    options?: AgentExecutionOptions,
    traceId?: string,
  ): StreamOptions {
    return {
      input: { text: prompt },
      provider: this.provider,
      model: this.model,
      temperature: this.temperature,
      systemPrompt: this.instructions,
      // toolFilter delegates to BaseProvider.applyToolFiltering() natively
      ...(this.tools && this.tools.length > 0 && { toolFilter: this.tools }),
      maxSteps: options?.maxSteps ?? this.maxSteps,
      context: {
        agentId: this.id,
        agentName: this.name,
        traceId,
        ...options?.context,
      },
    };
  }
}
