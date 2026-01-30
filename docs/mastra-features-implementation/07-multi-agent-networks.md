# Multi-Agent Networks Implementation Guide

## Overview

This document provides a comprehensive implementation guide for Mastra-style multi-agent network orchestration in NeuroLink. Agent Networks enable intelligent orchestration where an LLM determines and executes plans automatically, acting as a routing layer that converts natural language to the right primitive (agent, workflow, or tool) with proper input formatting.

### Key Concepts

- **Agent Network**: A smart orchestration layer for multi-agent collaboration
- **Routing Agent**: The coordinator that analyzes tasks and delegates to sub-agents
- **Primitives**: The building blocks (agents, workflows, tools) that can be orchestrated
- **Network Execution**: The process of task analysis, routing, and iterative refinement

## Current NeuroLink Agent Implementation Analysis

### Existing Foundation

NeuroLink already has several foundational components that support agent-like behaviors:

#### 1. Tool Registry and MCP Integration

```typescript
// Location: src/lib/mcp/toolRegistry.ts
export class MCPToolRegistry extends MCPRegistry {
  private tools: Map<string, ToolInfo> = new Map();
  private toolImplementations: Map<string, ToolImplementation> = new Map();

  async executeTool<T = unknown>(
    toolName: string,
    args?: unknown,
    context?: ExecutionContext,
  ): Promise<T>;
}
```

The existing `MCPToolRegistry` provides:

- Tool registration and discovery
- Tool execution with context
- HITL (Human-in-the-Loop) safety integration
- Execution statistics and monitoring

#### 2. Direct Agent Tools

```typescript
// Location: src/lib/agent/directTools.ts
export const directAgentTools = {
  getCurrentTime: tool({...}),
  readFile: tool({...}),
  writeFile: tool({...}),
  listDirectory: tool({...}),
  calculateMath: tool({...}),
  analyzeCSV: tool({...}),
  websearchGrounding: tool({...}),
};
```

These provide built-in agent capabilities for file operations, math, and web search.

#### 3. Provider Orchestration Brain

```typescript
// Location: src/lib/utils/modelRouter.ts, src/lib/utils/taskClassifier.ts
export class ModelRouter {
  route(task: TaskClassification): RouteResult;
}

export class BinaryTaskClassifier {
  classify(prompt: string): TaskClassification;
}
```

The existing orchestration system classifies tasks and routes to appropriate providers.

#### 4. External Server Manager

```typescript
// Location: src/lib/mcp/externalServerManager.ts
export class ExternalServerManager {
  async addServer(
    name: string,
    config: ExternalMCPServerConfig,
  ): Promise<ExternalMCPOperationResult>;
  async executeToolOnServer(
    serverName: string,
    toolName: string,
    args: unknown,
  ): Promise<unknown>;
}
```

Manages external MCP servers and their tools.

### Gaps to Address

1. **No Agent Abstraction**: NeuroLink lacks a formal `Agent` class with identity, instructions, and capabilities
2. **No Network Coordinator**: No routing agent to coordinate multiple agents
3. **No Primitive Selection**: No mechanism to choose between agents, workflows, and tools
4. **Limited Streaming Events**: No network-level streaming for multi-agent execution
5. **No Agent Memory Integration**: No per-agent memory or context sharing

### Existing NeuroLink Features

NeuroLink already has foundational Human-in-the-Loop (HITL) capabilities that can be leveraged for multi-agent networks:

#### HITL Manager (`src/lib/hitl/`)

The existing HITL system provides:

- **HITLManager** (`src/lib/hitl/hitlManager.ts`): Core manager for human-in-the-loop workflows
- **Confirmation Workflows**: Built-in confirmation request handling for tool executions
- **Timeout Handling**: Configurable timeouts for human responses with graceful fallbacks
- **Safety Integration**: HITL safety integration already exists in the tool registry (as noted in line 38)

This existing HITL infrastructure should be integrated with the proposed multi-agent network implementation rather than built from scratch. The Phase 4 "HITL integration" task should extend these existing capabilities for network-level human approval workflows.

## Multi-Agent Network Architecture Design

### Architecture Overview

```
                                    +------------------+
                                    |  Agent Network   |
                                    |    Executor      |
                                    +--------+---------+
                                             |
                          +------------------+------------------+
                          |                                     |
                  +-------v--------+                   +--------v-------+
                  | Routing Agent  |                   | Network Stream |
                  | (Coordinator)  |                   |    Manager     |
                  +-------+--------+                   +--------+-------+
                          |                                     |
         +----------------+----------------+                    |
         |                |                |                    |
+--------v-----+  +-------v------+  +------v-------+   +-------v-------+
|    Agent     |  |   Workflow   |  |     Tool     |   | Streaming     |
|   Registry   |  |   Registry   |  |   Registry   |   | Event Emitter |
+--------------+  +--------------+  +--------------+   +---------------+
```

### Core Components

#### 1. Agent Definition

```typescript
// Types: src/lib/types/agentNetworkTypes.ts

/**
 * Agent definition for the network
 */
export type AgentDefinition = {
  /** Unique identifier for the agent */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description of the agent's capabilities (critical for routing) */
  description: string;

  /** System instructions for the agent */
  instructions: string;

  /** Provider to use for this agent */
  provider?: AIProviderName | string;

  /** Model to use for this agent */
  model?: string;

  /** Tools available to this agent */
  tools?: string[];

  /** Input schema for structured agent input */
  inputSchema?: z.ZodSchema;

  /** Output schema for structured agent output */
  outputSchema?: z.ZodSchema;

  /** Maximum number of steps this agent can take */
  maxSteps?: number;

  /** Temperature for generation */
  temperature?: number;

  /** Whether this agent can delegate to other agents */
  canDelegate?: boolean;

  /** Custom metadata for routing decisions */
  metadata?: Record<string, unknown>;
};

/**
 * Runtime agent instance with execution capabilities
 */
export type Agent = AgentDefinition & {
  /** Execute the agent with given input */
  execute(
    input: AgentInput,
    options?: AgentExecutionOptions,
  ): Promise<AgentResult>;

  /** Stream execution results */
  stream(
    input: AgentInput,
    options?: AgentExecutionOptions,
  ): AsyncIterable<AgentStreamChunk>;

  /** Get agent status */
  getStatus(): AgentStatus;
};
```

#### 2. Network Primitive Types

```typescript
/**
 * Primitive types that can be orchestrated in the network
 */
export type NetworkPrimitiveType = "agent" | "workflow" | "tool";

/**
 * Base primitive type
 */
export type NetworkPrimitive = {
  /** Unique identifier */
  id: string;

  /** Type of primitive */
  type: NetworkPrimitiveType;

  /** Human-readable name */
  name: string;

  /** Description for routing decisions */
  description: string;

  /** Input schema for validation */
  inputSchema?: z.ZodSchema;

  /** Output schema for validation */
  outputSchema?: z.ZodSchema;
};

/**
 * Agent primitive
 */
export type AgentPrimitive = NetworkPrimitive & {
  type: "agent";
  agent: Agent;
};

/**
 * Workflow primitive
 */
export type WorkflowPrimitive = NetworkPrimitive & {
  type: "workflow";
  workflow: NetworkWorkflow;
};

/**
 * Tool primitive
 */
export type ToolPrimitive = NetworkPrimitive & {
  type: "tool";
  tool: ToolInfo;
  execute: (args: unknown, context?: ExecutionContext) => Promise<unknown>;
};

/**
 * Union type for all primitives
 */
export type Primitive = AgentPrimitive | WorkflowPrimitive | ToolPrimitive;
```

#### 3. Network Configuration

```typescript
/**
 * Configuration for creating an agent network
 */
export type AgentNetworkConfig = {
  /** Unique identifier for the network */
  id?: string;

  /** Human-readable name */
  name: string;

  /** Description of the network's purpose */
  description?: string;

  /** Agents in the network */
  agents: AgentDefinition[];

  /** Workflows available in the network */
  workflows?: NetworkWorkflowDefinition[];

  /** Additional tools available to all agents */
  tools?: string[];

  /** Routing agent configuration */
  router?: {
    /** Provider for the routing agent */
    provider?: AIProviderName | string;

    /** Model for the routing agent */
    model?: string;

    /** Custom routing instructions */
    instructions?: string;

    /** Maximum routing attempts */
    maxAttempts?: number;
  };

  /** Default execution options */
  defaults?: {
    maxSteps?: number;
    timeout?: number;
    temperature?: number;
  };

  /** Memory configuration */
  memory?: {
    /** Enable shared memory across agents */
    shared?: boolean;

    /** Memory provider */
    provider?: "in-memory" | "redis";

    /** Memory TTL in seconds */
    ttl?: number;
  };
};
```

#### 4. Network Execution Types

```typescript
/**
 * Input for network execution
 */
export type NetworkExecutionInput = {
  /** The task or message to process */
  message: string | CoreMessage[];

  /** Thread ID for conversation context */
  threadId?: string;

  /** User/resource identifier */
  resourceId?: string;

  /** Additional context */
  context?: Record<string, unknown>;
};

/**
 * Options for network execution
 */
export type NetworkExecutionOptions = {
  /** Maximum execution steps across the network */
  maxSteps?: number;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Enable streaming */
  stream?: boolean;

  /** Tracing configuration */
  tracing?: {
    enabled?: boolean;
    traceId?: string;
    parentSpanId?: string;
  };

  /** Model settings override */
  modelSettings?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };

  /** Output schema for structured output */
  outputSchema?: z.ZodSchema;
};

/**
 * Result of network execution
 */
export type NetworkExecutionResult = {
  /** Final output content */
  content: string;

  /** Structured output if schema was provided */
  object?: unknown;

  /** Execution trace */
  trace: NetworkExecutionTrace;

  /** Token usage across all agents */
  usage: NetworkTokenUsage;

  /** Execution status */
  status: NetworkExecutionStatus;

  /** Time taken in milliseconds */
  duration: number;
};

/**
 * Execution trace for debugging and monitoring
 */
export type NetworkExecutionTrace = {
  /** Unique trace ID */
  traceId: string;

  /** Steps taken during execution */
  steps: NetworkExecutionStep[];

  /** Routing decisions made */
  routingDecisions: RoutingDecision[];

  /** Start timestamp */
  startTime: number;

  /** End timestamp */
  endTime?: number;
};

/**
 * Single execution step
 */
export type NetworkExecutionStep = {
  /** Step index */
  index: number;

  /** Primitive that was executed */
  primitive: {
    type: NetworkPrimitiveType;
    id: string;
    name: string;
  };

  /** Input to the primitive */
  input: unknown;

  /** Output from the primitive */
  output?: unknown;

  /** Error if step failed */
  error?: string;

  /** Duration in milliseconds */
  duration: number;

  /** Token usage for this step */
  usage?: TokenUsage;

  /** Timestamp */
  timestamp: number;
};

/**
 * Routing decision record
 */
export type RoutingDecision = {
  /** Step at which decision was made */
  stepIndex: number;

  /** Task description analyzed */
  taskDescription: string;

  /** Selected primitive */
  selectedPrimitive: {
    type: NetworkPrimitiveType;
    id: string;
    name: string;
  };

  /** Confidence score (0-1) */
  confidence: number;

  /** Reasoning for the decision */
  reasoning: string;

  /** Alternative primitives considered */
  alternatives?: Array<{
    type: NetworkPrimitiveType;
    id: string;
    confidence: number;
  }>;
};
```

#### 5. Streaming Event Types

```typescript
/**
 * Network streaming chunk types
 */
export type NetworkStreamChunkType =
  | "network-start"
  | "routing-start"
  | "routing-decision"
  | "routing-end"
  | "primitive-start"
  | "primitive-progress"
  | "primitive-end"
  | "agent-thinking"
  | "agent-text"
  | "agent-tool-call"
  | "agent-tool-result"
  | "workflow-step"
  | "network-progress"
  | "network-complete"
  | "network-error";

/**
 * Base streaming chunk
 */
export type NetworkStreamChunkBase = {
  type: NetworkStreamChunkType;
  timestamp: number;
  traceId: string;
  stepIndex?: number;
};

/**
 * Network start event
 */
export type NetworkStartChunk = NetworkStreamChunkBase & {
  type: "network-start";
  networkId: string;
  input: string;
};

/**
 * Routing decision event
 */
export type RoutingDecisionChunk = NetworkStreamChunkBase & {
  type: "routing-decision";
  decision: RoutingDecision;
};

/**
 * Primitive start event
 */
export type PrimitiveStartChunk = NetworkStreamChunkBase & {
  type: "primitive-start";
  primitive: {
    type: NetworkPrimitiveType;
    id: string;
    name: string;
  };
  input: unknown;
};

/**
 * Agent text generation event
 */
export type AgentTextChunk = NetworkStreamChunkBase & {
  type: "agent-text";
  agentId: string;
  content: string;
  isPartial: boolean;
};

/**
 * Agent tool call event
 */
export type AgentToolCallChunk = NetworkStreamChunkBase & {
  type: "agent-tool-call";
  agentId: string;
  toolName: string;
  args: unknown;
  toolCallId: string;
};

/**
 * Agent tool result event
 */
export type AgentToolResultChunk = NetworkStreamChunkBase & {
  type: "agent-tool-result";
  agentId: string;
  toolName: string;
  toolCallId: string;
  result: unknown;
  success: boolean;
};

/**
 * Network complete event
 */
export type NetworkCompleteChunk = NetworkStreamChunkBase & {
  type: "network-complete";
  result: NetworkExecutionResult;
};

/**
 * Union type for all streaming chunks
 */
export type NetworkStreamChunk =
  | NetworkStartChunk
  | RoutingDecisionChunk
  | PrimitiveStartChunk
  | AgentTextChunk
  | AgentToolCallChunk
  | AgentToolResultChunk
  | NetworkCompleteChunk
  | NetworkStreamChunkBase;
```

## Implementation Classes

### 1. Agent Class

```typescript
// Location: src/lib/agent/agent.ts

import { z } from "zod";
import { EventEmitter } from "events";
import type { NeuroLink } from "../neurolink.js";
import type {
  AgentDefinition,
  Agent as IAgent,
  AgentInput,
  AgentResult,
  AgentExecutionOptions,
  AgentStreamChunk,
  AgentStatus,
} from "../types/agentNetworkTypes.js";
import { logger } from "../utils/logger.js";

/**
 * Agent implementation that wraps a NeuroLink instance with specialized behavior
 */
export class Agent implements IAgent {
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

  constructor(definition: AgentDefinition, neurolink: NeuroLink) {
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
  }

  /**
   * Execute the agent with given input
   */
  async execute(
    input: AgentInput,
    options?: AgentExecutionOptions,
  ): Promise<AgentResult> {
    const startTime = Date.now();
    this.executionCount++;

    logger.debug(`[Agent:${this.id}] Starting execution`, {
      input: typeof input === "string" ? input.slice(0, 100) : "structured",
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

      // Execute via NeuroLink
      const result = await this.neurolink.generate({
        input: { text: prompt },
        provider: this.provider,
        model: this.model,
        temperature: this.temperature,
        systemPrompt: this.instructions,
        maxSteps: options?.maxSteps ?? this.maxSteps,
        context: {
          agentId: this.id,
          agentName: this.name,
          ...options?.context,
        },
      });

      const duration = Date.now() - startTime;
      this.lastExecutionTime = duration;

      // Parse output if schema provided
      let parsedOutput: unknown = undefined;
      if (this.outputSchema) {
        try {
          parsedOutput = this.outputSchema.parse(JSON.parse(result.content));
        } catch {
          logger.warn(`[Agent:${this.id}] Output schema validation failed`);
        }
      }

      return {
        content: result.content,
        object: parsedOutput,
        usage: result.usage,
        toolsUsed: result.toolsUsed,
        toolExecutions: result.toolExecutions,
        duration,
        status: "success",
        agentId: this.id,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.lastExecutionTime = duration;

      logger.error(`[Agent:${this.id}] Execution failed`, error);

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
      const prompt = this.buildPrompt(input, options?.context);

      const streamResult = await this.neurolink.stream({
        input: { text: prompt },
        provider: this.provider,
        model: this.model,
        temperature: this.temperature,
        systemPrompt: this.instructions,
        maxSteps: options?.maxSteps ?? this.maxSteps,
        context: {
          agentId: this.id,
          agentName: this.name,
          ...options?.context,
        },
      });

      let fullContent = "";

      for await (const chunk of streamResult.stream) {
        if ("content" in chunk) {
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
      }

      yield {
        type: "agent-complete",
        agentId: this.id,
        content: fullContent,
        usage: streamResult.usage,
        duration: Date.now() - startTime,
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
   * Build prompt from input and context
   */
  private buildPrompt(
    input: AgentInput,
    context?: Record<string, unknown>,
  ): string {
    let prompt = typeof input === "string" ? input : JSON.stringify(input);

    if (context) {
      prompt = `Context: ${JSON.stringify(context)}\n\nTask: ${prompt}`;
    }

    return prompt;
  }
}
```

### 2. Agent Network Class

```typescript
// Location: src/lib/agent/agentNetwork.ts

import { z } from "zod";
import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import type { NeuroLink } from "../neurolink.js";
import { Agent } from "./agent.js";
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
} from "../types/agentNetworkTypes.js";
import { logger } from "../utils/logger.js";

/**
 * Routing agent prompt template
 */
const ROUTING_PROMPT = `You are a task routing agent responsible for analyzing tasks and selecting the best primitive to handle them.

Available Primitives:
{{PRIMITIVES}}

Task to route: {{TASK}}

Analyze the task and select the most appropriate primitive. Consider:
1. The primitive's description and capabilities
2. The input requirements
3. The expected output

Respond in JSON format:
{
  "selectedPrimitive": {
    "type": "agent" | "workflow" | "tool",
    "id": "<primitive_id>",
    "name": "<primitive_name>"
  },
  "confidence": <0-1>,
  "reasoning": "<explanation>",
  "formattedInput": "<input for the selected primitive>"
}`;

/**
 * Agent Network for multi-agent orchestration
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

  constructor(config: AgentNetworkConfig, neurolink: NeuroLink) {
    this.id = config.id ?? randomUUID();
    this.name = config.name;
    this.description = config.description;
    this.neurolink = neurolink;
    this.config = config;
    this.emitter = new EventEmitter();

    this.initializeAgents(config);
    this.initializeWorkflows(config);
    this.initializeTools(config);
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
    if (!config.workflows) return;

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
   * Initialize tools from configuration
   */
  private async initializeTools(config: AgentNetworkConfig): Promise<void> {
    if (!config.tools) return;

    const availableTools = await this.neurolink.getAllAvailableTools();

    for (const toolName of config.tools) {
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
          return this.neurolink.executeTool(toolName, args, context);
        },
      };

      this.primitives.set(primitive.id, primitive);
      logger.debug(`[AgentNetwork:${this.id}] Registered tool: ${toolName}`);
    }
  }

  /**
   * Execute the network with intelligent routing
   */
  async execute(
    input: NetworkExecutionInput,
    options?: NetworkExecutionOptions,
  ): Promise<NetworkExecutionResult> {
    const startTime = Date.now();
    const traceId = options?.tracing?.traceId ?? randomUUID();
    const maxSteps = options?.maxSteps ?? this.config.defaults?.maxSteps ?? 10;

    const trace: NetworkExecutionTrace = {
      traceId,
      steps: [],
      routingDecisions: [],
      startTime,
    };

    let currentMessage =
      typeof input.message === "string"
        ? input.message
        : input.message.map((m) => m.content).join("\n");

    let stepIndex = 0;
    let finalResult: string = "";
    let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    logger.info(`[AgentNetwork:${this.id}] Starting execution`, {
      traceId,
      maxSteps,
    });

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

        if (stepResult.usage) {
          totalUsage.promptTokens += stepResult.usage.promptTokens ?? 0;
          totalUsage.completionTokens += stepResult.usage.completionTokens ?? 0;
          totalUsage.totalTokens += stepResult.usage.totalTokens ?? 0;
        }

        // Check if task is complete
        if (await this.isTaskComplete(stepResult.output, currentMessage)) {
          finalResult =
            typeof stepResult.output === "string"
              ? stepResult.output
              : JSON.stringify(stepResult.output);
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

      return {
        content: finalResult,
        trace,
        usage: totalUsage,
        status: "completed",
        duration: Date.now() - startTime,
      };
    } catch (error) {
      trace.endTime = Date.now();

      logger.error(`[AgentNetwork:${this.id}] Execution failed`, error);

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
   * Stream network execution with events
   */
  async *stream(
    input: NetworkExecutionInput,
    options?: NetworkExecutionOptions,
  ): AsyncIterable<NetworkStreamChunk> {
    const startTime = Date.now();
    const traceId = options?.tracing?.traceId ?? randomUUID();
    const maxSteps = options?.maxSteps ?? this.config.defaults?.maxSteps ?? 10;

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

    let currentMessage =
      typeof input.message === "string"
        ? input.message
        : input.message.map((m) => m.content).join("\n");

    let stepIndex = 0;
    const trace: NetworkExecutionTrace = {
      traceId,
      steps: [],
      routingDecisions: [],
      startTime,
    };

    let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
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
              agentOutput += chunk.content;
              yield {
                type: "agent-text",
                agentId: chunk.agentId,
                content: chunk.content,
                isPartial: chunk.isPartial,
                timestamp: chunk.timestamp,
                traceId,
                stepIndex,
              };
            } else if (chunk.type === "agent-tool-call") {
              yield {
                type: "agent-tool-call",
                agentId: chunk.agentId,
                toolName: chunk.toolName,
                args: chunk.args,
                toolCallId: chunk.toolCallId,
                timestamp: chunk.timestamp,
                traceId,
                stepIndex,
              };
            } else if (chunk.type === "agent-tool-result") {
              yield {
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
   * Route task to appropriate primitive
   */
  private async routeTask(
    task: string,
    stepIndex: number,
    traceId: string,
  ): Promise<RoutingDecision> {
    const primitivesDescription = Array.from(this.primitives.values())
      .map(
        (p) =>
          `- ${p.type}: ${p.id} (${p.name})\n  Description: ${p.description}`,
      )
      .join("\n");

    const routingPrompt = ROUTING_PROMPT.replace(
      "{{PRIMITIVES}}",
      primitivesDescription,
    ).replace("{{TASK}}", task);

    try {
      const result = await this.neurolink.generate({
        input: { text: routingPrompt },
        provider: this.config.router?.provider,
        model: this.config.router?.model,
        temperature: 0.3,
        systemPrompt:
          this.config.router?.instructions ??
          "You are a precise task routing agent.",
      });

      const parsed = JSON.parse(result.content);

      return {
        stepIndex,
        taskDescription: task,
        selectedPrimitive: parsed.selectedPrimitive,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
        formattedInput: parsed.formattedInput,
      };
    } catch (error) {
      logger.error(`[AgentNetwork:${this.id}] Routing failed`, error);

      // Fallback to first agent
      const firstAgent = Array.from(this.agents.values())[0];
      return {
        stepIndex,
        taskDescription: task,
        selectedPrimitive: {
          type: "agent",
          id: firstAgent.id,
          name: firstAgent.name,
        },
        confidence: 0.5,
        reasoning: "Fallback to default agent due to routing error",
      };
    }
  }

  /**
   * Execute a primitive
   */
  private async executePrimitive(
    primitive: Primitive,
    input: unknown,
    options?: NetworkExecutionOptions,
  ): Promise<{ output: unknown; error?: string; usage?: TokenUsage }> {
    try {
      switch (primitive.type) {
        case "agent": {
          const agentPrimitive = primitive as AgentPrimitive;
          const result = await agentPrimitive.agent.execute(
            typeof input === "string" ? input : JSON.stringify(input),
            {
              context: options?.context,
              maxSteps: options?.maxSteps,
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
            sessionId: options?.tracing?.traceId,
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
   * Check if task is complete
   */
  private async isTaskComplete(
    output: unknown,
    originalTask: string,
  ): Promise<boolean> {
    // Simple heuristic: if output is non-empty and substantial, consider complete
    if (!output) return false;

    const outputStr =
      typeof output === "string" ? output : JSON.stringify(output);
    return outputStr.length > 50;
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
}
```

### 3. Network Integration with NeuroLink

```typescript
// Addition to: src/lib/neurolink.ts

import { AgentNetwork } from './agent/agentNetwork.js';
import { Agent } from './agent/agent.js';
import type {
  AgentDefinition,
  AgentNetworkConfig,
  NetworkExecutionInput,
  NetworkExecutionOptions,
  NetworkExecutionResult,
  NetworkStreamChunk,
} from './types/agentNetworkTypes.js';

// Add to NeuroLink class:

/**
 * Create an agent from a definition
 */
createAgent(definition: AgentDefinition): Agent {
  return new Agent(definition, this);
}

/**
 * Create an agent network for multi-agent orchestration
 */
createNetwork(config: AgentNetworkConfig): AgentNetwork {
  return new AgentNetwork(config, this);
}

/**
 * Execute an agent network with the given input
 * This is the primary method for multi-agent orchestration
 */
async executeNetwork(
  network: AgentNetwork,
  input: NetworkExecutionInput,
  options?: NetworkExecutionOptions,
): Promise<NetworkExecutionResult> {
  return network.execute(input, options);
}

/**
 * Stream execution of an agent network
 */
async *streamNetwork(
  network: AgentNetwork,
  input: NetworkExecutionInput,
  options?: NetworkExecutionOptions,
): AsyncIterable<NetworkStreamChunk> {
  yield* network.stream(input, options);
}
```

## Usage Examples

### Basic Multi-Agent Network

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Define agents
const researchAgent = {
  id: "researcher",
  name: "Research Agent",
  description: "Searches and analyzes information from the web and files",
  instructions:
    "You are a research assistant. Search for information and provide detailed analysis.",
  tools: ["websearchGrounding", "readFile"],
  maxSteps: 5,
};

const writerAgent = {
  id: "writer",
  name: "Content Writer",
  description: "Creates well-structured written content based on research",
  instructions:
    "You are a content writer. Create engaging, well-structured content.",
  temperature: 0.8,
};

const reviewerAgent = {
  id: "reviewer",
  name: "Quality Reviewer",
  description: "Reviews and improves content quality, grammar, and accuracy",
  instructions:
    "You are a quality reviewer. Check for accuracy, grammar, and suggest improvements.",
  temperature: 0.3,
};

// Create network
const contentNetwork = neurolink.createNetwork({
  name: "Content Creation Network",
  description: "A network for researching, writing, and reviewing content",
  agents: [researchAgent, writerAgent, reviewerAgent],
  router: {
    model: "gpt-4o",
    instructions:
      "Route tasks based on whether they need research, writing, or review.",
  },
  defaults: {
    maxSteps: 15,
  },
});

// Execute the network
const result = await contentNetwork.execute({
  message:
    "Write a blog post about the benefits of TypeScript for enterprise applications",
});

console.log(result.content);
console.log("Steps taken:", result.trace.steps.length);
console.log("Routing decisions:", result.trace.routingDecisions);
```

### Streaming Network Execution

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const network = neurolink.createNetwork({
  name: "Interactive Assistant",
  agents: [
    {
      id: "analyst",
      name: "Data Analyst",
      description: "Analyzes data and provides insights",
      instructions: "Analyze data and provide actionable insights.",
      tools: ["analyzeCSV", "calculateMath"],
    },
    {
      id: "reporter",
      name: "Report Generator",
      description: "Creates formatted reports from analysis results",
      instructions: "Generate clear, formatted reports.",
    },
  ],
});

// Stream execution with real-time events
for await (const chunk of network.stream({
  message: "Analyze the sales.csv file and create a summary report",
})) {
  switch (chunk.type) {
    case "network-start":
      console.log("Network started:", chunk.networkId);
      break;

    case "routing-decision":
      console.log(`Routing to: ${chunk.decision.selectedPrimitive.name}`);
      console.log(`Confidence: ${chunk.decision.confidence}`);
      console.log(`Reasoning: ${chunk.decision.reasoning}`);
      break;

    case "agent-text":
      process.stdout.write(chunk.content);
      break;

    case "agent-tool-call":
      console.log(`\n[Tool Call] ${chunk.toolName}:`, chunk.args);
      break;

    case "agent-tool-result":
      console.log(
        `[Tool Result] ${chunk.toolName}:`,
        chunk.success ? "Success" : "Failed",
      );
      break;

    case "network-complete":
      console.log("\n\nNetwork completed in", chunk.result.duration, "ms");
      break;

    case "network-error":
      console.error("Error:", chunk.error);
      break;
  }
}
```

### Hierarchical Agent Structure

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Create specialized sub-agents
const codeAgent = {
  id: "coder",
  name: "Code Generator",
  description: "Generates and refactors code",
  instructions: "Generate clean, well-documented code.",
  temperature: 0.2,
};

const testAgent = {
  id: "tester",
  name: "Test Writer",
  description: "Writes unit tests and integration tests",
  instructions: "Write comprehensive tests with good coverage.",
  temperature: 0.2,
};

const docAgent = {
  id: "documenter",
  name: "Documentation Writer",
  description: "Creates API documentation and guides",
  instructions: "Write clear, helpful documentation.",
  temperature: 0.5,
};

// Create orchestrator agent that can delegate
const orchestratorAgent = {
  id: "orchestrator",
  name: "Development Orchestrator",
  description: "Coordinates development tasks across code, tests, and docs",
  instructions: `You coordinate development tasks. For each request:
1. Break down the task into sub-tasks
2. Delegate to appropriate specialized agents
3. Combine and validate results`,
  canDelegate: true,
};

// Create hierarchical network
const devNetwork = neurolink.createNetwork({
  name: "Development Team",
  agents: [orchestratorAgent, codeAgent, testAgent, docAgent],
  router: {
    model: "claude-3-7-sonnet-20250219",
    instructions:
      "Route development tasks to the orchestrator first, then specialized agents.",
  },
  memory: {
    shared: true,
    provider: "redis",
    ttl: 3600,
  },
});

// Execute complex development task
const result = await devNetwork.execute({
  message:
    "Create a utility function for date formatting with tests and documentation",
  context: {
    language: "typescript",
    testFramework: "vitest",
  },
});
```

### Network with Workflows

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { z } from "zod";

const neurolink = new NeuroLink();

// Define a workflow for structured data processing
const dataProcessingWorkflow = {
  id: "data-pipeline",
  name: "Data Processing Pipeline",
  description: "Processes and transforms data through multiple stages",
  inputSchema: z.object({
    data: z.array(z.record(z.unknown())),
    transformations: z.array(z.string()),
  }),
  workflow: {
    async execute(input: { data: unknown[]; transformations: string[] }) {
      // Workflow implementation
      let result = input.data;
      for (const transform of input.transformations) {
        // Apply transformations
        result = applyTransformation(result, transform);
      }
      return { output: result };
    },
  },
};

// Create network with agents and workflows
const analysisNetwork = neurolink.createNetwork({
  name: "Data Analysis Network",
  agents: [
    {
      id: "analyst",
      name: "Data Analyst",
      description: "Analyzes data and identifies patterns",
      instructions: "Analyze data for insights and patterns.",
    },
    {
      id: "visualizer",
      name: "Visualization Agent",
      description: "Creates data visualizations and charts",
      instructions: "Create clear, informative visualizations.",
    },
  ],
  workflows: [dataProcessingWorkflow],
  tools: ["analyzeCSV", "calculateMath"],
});
```

## Implementation Plan

### Phase 1: Core Types and Agent Class (Week 1-2)

1. **Create type definitions**
   - Add `src/lib/types/agentNetworkTypes.ts` with all interfaces
   - Export types from `src/lib/types/index.ts`

2. **Implement Agent class**
   - Create `src/lib/agent/agent.ts`
   - Implement execute and stream methods
   - Add input/output schema validation

3. **Add unit tests**
   - Test agent creation and execution
   - Test streaming behavior
   - Test error handling

### Phase 2: Agent Network Core (Week 3-4)

1. **Implement AgentNetwork class**
   - Create `src/lib/agent/agentNetwork.ts`
   - Implement primitive registration
   - Implement routing logic

2. **Add routing agent**
   - Create routing prompt template
   - Implement task analysis
   - Add confidence scoring

3. **Integrate with NeuroLink**
   - Add `createAgent` method
   - Add `createNetwork` method
   - Add `executeNetwork` and `streamNetwork` methods

### Phase 3: Streaming and Events (Week 5-6)

1. **Implement network streaming**
   - Create streaming infrastructure
   - Implement event emitters
   - Add all chunk types

2. **Add progress tracking**
   - Implement execution trace
   - Add step-by-step logging
   - Create routing decision records

3. **Build event handlers**
   - Create typed event system
   - Add subscription methods
   - Implement event filtering

### Phase 4: Advanced Features (Week 7-8)

1. **Add workflow support**
   - Implement workflow primitives
   - Create workflow execution logic
   - Add workflow streaming

2. **Implement memory integration**
   - Add shared memory support
   - Integrate with Redis memory
   - Implement context passing

3. **Add HITL integration**
   - Connect to existing HITL manager
   - Add network-level confirmation
   - Implement delegation approval

### Phase 5: Testing and Documentation (Week 9-10)

1. **Comprehensive testing**
   - Unit tests for all components
   - Integration tests for full networks
   - Performance benchmarks

2. **Documentation**
   - API documentation
   - Usage guides
   - Code examples

3. **CLI integration**
   - Add network commands
   - Implement interactive mode
   - Add progress visualization

## File Structure

```
src/lib/
├── agent/
│   ├── agent.ts                 # Agent class implementation
│   ├── agentNetwork.ts          # AgentNetwork class
│   ├── networkStreamManager.ts  # Streaming management
│   ├── primitiveRegistry.ts     # Primitive registration
│   ├── routingAgent.ts          # Task routing logic
│   └── index.ts                 # Agent exports
├── types/
│   ├── agentNetworkTypes.ts     # All network-related types
│   └── index.ts                 # Updated exports
├── neurolink.ts                 # Updated with network methods
└── ...
```

## Integration Points

### Existing NeuroLink Components

1. **Tool Registry**: Reuse `MCPToolRegistry` for tool primitives
2. **External Server Manager**: Leverage for external tool execution
3. **HITL Manager**: Integrate for human approval workflows
4. **Conversation Memory**: Use for agent context sharing
5. **Provider Factory**: Reuse for agent-specific providers

### New Dependencies

```typescript
// No new external dependencies required
// Uses existing:
// - zod (schema validation)
// - events (event emitter)
// - crypto (UUID generation)
```

## Performance Considerations

1. **Lazy Initialization**: Initialize agents only when needed
2. **Connection Pooling**: Reuse provider connections across agents
3. **Parallel Execution**: Run independent agents in parallel where possible
4. **Memory Management**: Clear agent state after network completion
5. **Timeout Handling**: Implement step-level and network-level timeouts

## Error Handling

1. **Routing Failures**: Fallback to default agent on routing errors
2. **Agent Failures**: Continue with alternative agents or fail gracefully
3. **Tool Failures**: Report errors and allow agent to retry or adapt
4. **Timeout Errors**: Cancel long-running operations with clear feedback
5. **Validation Errors**: Provide detailed schema validation messages

## Monitoring and Observability

1. **Execution Traces**: Full trace of all routing decisions and steps
2. **Token Usage**: Aggregate usage across all agents
3. **Performance Metrics**: Step timing and total duration
4. **Error Tracking**: Detailed error information with context
5. **Langfuse Integration**: Connect to existing observability infrastructure

## References

- [Mastra Agent Network Documentation](https://mastra.ai/reference/agents/network)
- [Mastra vNext Blog Post](https://mastra.ai/blog/vnext-agent-network)
- [NeuroLink Provider Orchestration](../features/provider-orchestration.md)
- [NeuroLink MCP Integration](../advanced/mcp-testing-guide.md)
- [NeuroLink HITL Documentation](../features/hitl.md)
