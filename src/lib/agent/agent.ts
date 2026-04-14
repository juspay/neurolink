/**
 * Agent - Core agent implementation for NeuroLink
 *
 * An Agent wraps NeuroLink with specialized behavior, instructions, and tools.
 * Agents can be composed into networks for multi-agent orchestration.
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
} from "../types/index.js";
import { logger } from "../utils/logger.js";

/**
 * Agent - Wraps a NeuroLink instance with specialized behavior
 *
 * Features:
 * - Custom instructions and persona
 * - Tool restrictions per agent
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

  // Cached filtered tools for this agent (Bug #3 fix)
  private filteredToolsCache: Record<string, unknown> | null = null;
  private filteredToolsCacheTime: number = 0;
  private static readonly TOOL_CACHE_TTL = 60000; // 1 minute cache

  constructor(definition: AgentDefinition, neurolink: NeuroLink) {
    // Validate required fields
    if (!definition.id || typeof definition.id !== "string") {
      throw new Error("Agent definition must have a valid id");
    }
    if (!definition.name || typeof definition.name !== "string") {
      throw new Error("Agent definition must have a valid name");
    }
    if (!definition.description || typeof definition.description !== "string") {
      throw new Error("Agent definition must have a valid description");
    }
    if (
      !definition.instructions ||
      typeof definition.instructions !== "string"
    ) {
      throw new Error("Agent definition must have valid instructions");
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

      // Build generation options (now async due to tool filtering - Bug #3 fix)
      const generateOptions = await this.buildGenerateOptions(prompt, options);

      // Execute via NeuroLink (type assertion needed for flexible options)
      const result = await this.neurolink.generate(
        generateOptions as Parameters<NeuroLink["generate"]>[0],
      );

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

      // Transform tool executions to match AgentResult format
      const toolExecutions = result.toolExecutions?.map((te) => ({
        toolName: te.name || "unknown",
        args: te.input || {},
        result: te.output,
        success: true,
        duration: 0,
      }));

      return {
        content: result.content || "",
        object: parsedOutput,
        usage: result.usage,
        toolsUsed: result.toolsUsed,
        toolExecutions,
        duration,
        status: "success",
        agentId: this.id,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.lastExecutionTime = duration;

      logger.error(`[Agent:${this.id}] Execution failed`, {
        traceId,
        error: error instanceof Error ? error.message : String(error),
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
      // Build stream options (now async due to tool filtering - Bug #3 fix)
      const streamOptions = await this.buildStreamOptions(prompt, options);

      // Execute via NeuroLink (type assertion needed for flexible options)
      const streamResult = await this.neurolink.stream(
        streamOptions as Parameters<NeuroLink["stream"]>[0],
      );

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
   * Get filtered tools for this agent (Bug #3 fix)
   * Returns only tools that are specified in the agent's tools array
   */
  private async getFilteredTools(): Promise<
    Record<string, unknown> | undefined
  > {
    // If no tools specified, use all available tools (no filtering)
    if (!this.tools || this.tools.length === 0) {
      return undefined;
    }

    // Check cache validity
    const now = Date.now();
    if (
      this.filteredToolsCache &&
      now - this.filteredToolsCacheTime < Agent.TOOL_CACHE_TTL
    ) {
      return this.filteredToolsCache;
    }

    try {
      // Get all available tools from NeuroLink
      const availableTools = await this.neurolink.getAllAvailableTools();

      // Filter to only include tools specified for this agent
      const filteredTools: Record<string, unknown> = {};
      const toolSet = new Set(this.tools);

      for (const tool of availableTools) {
        if (toolSet.has(tool.name)) {
          filteredTools[tool.name] = {
            description: tool.description,
            parameters: tool.inputSchema,
          };
        }
      }

      // Cache the filtered tools
      this.filteredToolsCache = filteredTools;
      this.filteredToolsCacheTime = now;

      logger.debug(`[Agent:${this.id}] Filtered tools`, {
        requested: this.tools.length,
        available: Object.keys(filteredTools).length,
      });

      return Object.keys(filteredTools).length > 0 ? filteredTools : undefined;
    } catch (error) {
      logger.warn(`[Agent:${this.id}] Failed to filter tools`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    }
  }

  /**
   * Build generation options for NeuroLink.generate() (Bug #3 fix)
   *
   * Now properly filters tools to only those specified for this agent.
   */
  private async buildGenerateOptions(
    prompt: string,
    options?: AgentExecutionOptions,
  ): Promise<Record<string, unknown>> {
    // Get filtered tools for this agent
    const tools = await this.getFilteredTools();

    return {
      input: { text: prompt },
      provider: this.provider,
      model: this.model,
      temperature: this.temperature,
      systemPrompt: this.instructions,
      // Include filtered tools if agent has tool restrictions
      ...(tools && { tools }),
      // Note: maxSteps is handled by agent loop, not passed to generate
      context: {
        agentId: this.id,
        agentName: this.name,
        agentTools: this.tools,
        agentMaxSteps: options?.maxSteps ?? this.maxSteps,
        ...options?.context,
      },
    };
  }

  /**
   * Build stream options for NeuroLink.stream() (Bug #3 fix)
   *
   * Now properly filters tools to only those specified for this agent.
   */
  private async buildStreamOptions(
    prompt: string,
    options?: AgentExecutionOptions,
  ): Promise<Record<string, unknown>> {
    // Get filtered tools for this agent
    const tools = await this.getFilteredTools();

    return {
      input: { text: prompt },
      provider: this.provider,
      model: this.model,
      temperature: this.temperature,
      systemPrompt: this.instructions,
      // Include filtered tools if agent has tool restrictions
      ...(tools && { tools }),
      // Note: maxSteps is handled by agent loop, not passed to stream
      context: {
        agentId: this.id,
        agentName: this.name,
        agentTools: this.tools,
        agentMaxSteps: options?.maxSteps ?? this.maxSteps,
        ...options?.context,
      },
    };
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
}
