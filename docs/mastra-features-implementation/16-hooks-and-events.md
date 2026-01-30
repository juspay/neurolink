# Hooks and Events System Implementation Guide

This document provides a complete implementation guide for adding Mastra-style hooks and events to NeuroLink. The hooks system enables non-blocking event handlers, lifecycle callbacks, and a pub/sub pattern for inter-component communication.

## Table of Contents

1. [Overview](#overview)
2. [Current Event System Analysis](#current-event-system-analysis)
3. [Hook System Architecture](#hook-system-architecture)
4. [Available Hooks](#available-hooks)
5. [Pub/Sub System](#pubsub-system)
6. [Lifecycle Callbacks](#lifecycle-callbacks)
7. [TypeScript Types](#typescript-types)
8. [Integration with NeuroLink Components](#integration-with-neurolink-components)
9. [Code Examples](#code-examples)
10. [Step-by-Step Implementation Plan](#step-by-step-implementation-plan)
11. [Testing Strategy](#testing-strategy)

---

## Overview

### What are Hooks?

Hooks are non-blocking event handlers that allow developers to tap into various stages of AI operations without modifying core logic. They enable:

- **Observability**: Monitor generation, tool execution, and workflow progress
- **Side Effects**: Trigger external actions (logging, analytics, notifications)
- **Custom Logic**: Inject behavior at specific lifecycle points
- **Decoupled Architecture**: Loose coupling between components through events

### Mastra Hook Patterns

Mastra provides several hook types that NeuroLink should implement:

| Hook Type        | Purpose                       | Execution Model             |
| ---------------- | ----------------------------- | --------------------------- |
| `onGeneration`   | AI text generation completion | Non-blocking (setImmediate) |
| `onEvaluation`   | Quality evaluation completion | Non-blocking                |
| `onToolCall`     | Tool execution events         | Non-blocking                |
| `onWorkflowStep` | Workflow step completion      | Non-blocking                |
| `onScorerRun`    | Scoring operation completion  | Non-blocking                |

### Design Principles

1. **Non-Blocking Execution**: Hooks use `setImmediate` to avoid blocking the main execution flow
2. **Error Isolation**: Hook errors don't affect main execution
3. **Type Safety**: Full TypeScript support for hook payloads
4. **Composable**: Multiple hooks can be registered for the same event
5. **Ordered Execution**: Hooks execute in registration order with optional priority

---

## Current Event System Analysis

### Existing NeuroLink Event Infrastructure

NeuroLink already has a typed event system using Node.js `EventEmitter`:

**Location**: `/src/lib/types/common.ts`

```typescript
// Existing NeuroLinkEvents type
export type NeuroLinkEvents = {
  // Core tool events
  "tool:start": unknown;
  "tool:end": unknown;

  // Stream events
  "stream:start": unknown;
  "stream:end": unknown;
  "stream:chunk": unknown;
  "stream:complete": unknown;
  "stream:error": unknown;

  // Generation events
  "generation:start": unknown;
  "generation:end": unknown;

  // Response events
  "response:start": unknown;
  "response:end": unknown;

  // External MCP events
  "externalMCP:serverConnected": unknown;
  "externalMCP:serverDisconnected": unknown;
  "externalMCP:serverFailed": unknown;
  "externalMCP:toolDiscovered": unknown;
  "externalMCP:toolRemoved": unknown;

  // HITL events
  "hitl:confirmation-request": unknown;
  "hitl:timeout": unknown;
  "hitl:confirmation-response": unknown;

  // Allow any additional event
  [key: string]: unknown;
};

// TypedEventEmitter interface
export type TypedEventEmitter<TEvents extends Record<string, unknown>> = {
  on<K extends keyof TEvents>(
    event: K,
    listener: (...args: unknown[]) => void,
  ): TypedEventEmitter<TEvents>;
  emit<K extends keyof TEvents>(event: K, ...args: unknown[]): boolean;
  off<K extends keyof TEvents>(
    event: K,
    listener: (...args: unknown[]) => void,
  ): TypedEventEmitter<TEvents>;
  removeAllListeners<K extends keyof TEvents>(
    event?: K,
  ): TypedEventEmitter<TEvents>;
  listenerCount<K extends keyof TEvents>(event: K): number;
  listeners<K extends keyof TEvents>(
    event: K,
  ): Array<(...args: unknown[]) => void>;
};
```

**Usage in NeuroLink**: `/src/lib/neurolink.ts`

```typescript
export class NeuroLink {
  private emitter =
    new EventEmitter() as unknown as TypedEventEmitter<NeuroLinkEvents>;

  // Tool event emission example
  private emitToolEndEvent(
    toolName: string,
    startTime: number,
    success: boolean,
    result?: unknown,
    error?: Error,
  ): void {
    this.emitter.emit("tool:end", {
      toolName,
      responseTime: Date.now() - startTime,
      success,
      timestamp: Date.now(),
      result,
      error,
    });
  }
}
```

### Gaps to Address

1. **No Hook Abstraction**: Events are emitted directly without a hook management layer
2. **Blocking Listeners**: Current listeners execute synchronously
3. **No Priority System**: Listeners execute in registration order only
4. **Limited Payload Types**: Event payloads use `unknown` type
5. **No Lifecycle Callbacks**: Missing `onFinish`, `onError`, `onStepFinish`
6. **No Pub/Sub Pattern**: No topic-based messaging system

---

## Hook System Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        HookManager                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ HookRegistry│  │ HookExecutor│  │ HookSubscriptionManager │ │
│  │             │  │             │  │                         │ │
│  │ - hooks[]   │  │ - execute() │  │ - topics[]              │ │
│  │ - priority  │  │ - parallel  │  │ - subscribers[]         │ │
│  │ - filters   │  │ - setImm.   │  │ - publish()             │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NeuroLink Core                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ GenerationHandler│  │ StreamHandler    │  │ ToolsManager │  │
│  │                  │  │                  │  │              │  │
│  │ - onGeneration() │  │ - onChunk()      │  │ - onTool()   │  │
│  │ - onFinish()     │  │ - onComplete()   │  │ - onError()  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Non-Blocking Execution Pattern

Following Mastra's pattern, hooks execute using `setImmediate` to ensure non-blocking behavior:

```typescript
/**
 * Execute hook in non-blocking manner using setImmediate
 * This ensures hooks don't block the main execution flow
 */
function executeHookNonBlocking<T>(
  hook: HookHandler<T>,
  payload: T,
  context: HookContext,
): void {
  setImmediate(async () => {
    try {
      await hook(payload, context);
    } catch (error) {
      // Log error but don't propagate
      console.error(`Hook execution error:`, error);
      context.onHookError?.(error as Error, hook.name);
    }
  });
}
```

### Hook Registration Pattern

```typescript
type HookRegistration<T = unknown> = {
  /** Unique identifier for this hook */
  id: string;
  /** Hook event type */
  event: HookEventType;
  /** Handler function */
  handler: HookHandler<T>;
  /** Priority (higher = earlier execution) */
  priority?: number;
  /** Optional filter to conditionally execute */
  filter?: HookFilter<T>;
  /** Whether hook runs synchronously (blocking) */
  sync?: boolean;
  /** Error handling behavior */
  onError?: "ignore" | "log" | "throw";
};
```

---

## Available Hooks

### 1. onGeneration Hook

Triggered when AI text generation completes.

```typescript
/**
 * Generation completion hook payload
 */
type GenerationHookPayload = {
  /** Generated content */
  content: string;
  /** AI provider used */
  provider: string;
  /** Model used */
  model: string;
  /** Token usage */
  usage: TokenUsage;
  /** Response time in ms */
  responseTime: number;
  /** Tools used during generation */
  toolsUsed: string[];
  /** Tool executions with details */
  toolExecutions: ToolExecution[];
  /** Original prompt/input */
  input: string;
  /** Session context */
  context?: Record<string, unknown>;
  /** Timestamp */
  timestamp: number;
};

type OnGenerationHook = (
  payload: GenerationHookPayload,
  context: HookContext,
) => void | Promise<void>;
```

**Usage Example**:

```typescript
neurolink.hooks.onGeneration(async (payload, ctx) => {
  // Log generation analytics
  await analytics.track("generation_complete", {
    provider: payload.provider,
    model: payload.model,
    tokens: payload.usage.totalTokens,
    duration: payload.responseTime,
  });
});
```

### 2. onEvaluation Hook

Triggered when quality evaluation completes.

```typescript
/**
 * Evaluation completion hook payload
 */
type EvaluationHookPayload = {
  /** Evaluation scores */
  scores: {
    relevance: number;
    accuracy: number;
    completeness: number;
    overall: number;
    domainAlignment?: number;
    terminologyAccuracy?: number;
    toolEffectiveness?: number;
  };
  /** Evaluation reasoning */
  reasoning: string;
  /** Whether response is off-topic */
  isOffTopic: boolean;
  /** Alert severity */
  alertSeverity: "low" | "medium" | "high";
  /** Original query */
  query: string;
  /** AI response evaluated */
  response: string;
  /** Evaluation model used */
  evaluationModel: string;
  /** Evaluation time in ms */
  evaluationTime: number;
  /** Timestamp */
  timestamp: number;
};

type OnEvaluationHook = (
  payload: EvaluationHookPayload,
  context: HookContext,
) => void | Promise<void>;
```

**Usage Example**:

```typescript
neurolink.hooks.onEvaluation(async (payload, ctx) => {
  if (payload.scores.overall < 5) {
    // Alert on low quality responses
    await alerting.send("low_quality_response", {
      score: payload.scores.overall,
      query: payload.query,
      reasoning: payload.reasoning,
    });
  }
});
```

### 3. onScorerRun Hook

Triggered when a scoring operation completes (for custom scorers).

```typescript
/**
 * Scorer run completion hook payload
 */
type ScorerRunHookPayload = {
  /** Scorer identifier */
  scorerId: string;
  /** Scorer name */
  scorerName: string;
  /** Score value */
  score: number;
  /** Maximum possible score */
  maxScore: number;
  /** Normalized score (0-1) */
  normalizedScore: number;
  /** Scoring criteria used */
  criteria: string[];
  /** Input evaluated */
  input: unknown;
  /** Output evaluated */
  output: unknown;
  /** Execution time in ms */
  executionTime: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Timestamp */
  timestamp: number;
};

type OnScorerRunHook = (
  payload: ScorerRunHookPayload,
  context: HookContext,
) => void | Promise<void>;
```

### 4. onToolCall Hook

Triggered when a tool is executed.

```typescript
/**
 * Tool execution hook payload
 */
type ToolCallHookPayload = {
  /** Event type: start or end */
  type: "tool:start" | "tool:end";
  /** Tool name */
  toolName: string;
  /** Execution ID */
  executionId: string;
  /** Tool input parameters */
  input?: Record<string, unknown>;
  /** Tool result (only for end event) */
  result?: unknown;
  /** Error if tool failed */
  error?: string;
  /** Execution duration (only for end event) */
  duration?: number;
  /** Tool source */
  source: "direct" | "mcp" | "custom";
  /** MCP server ID if applicable */
  serverId?: string;
  /** Timestamp */
  timestamp: number;
};

type OnToolCallHook = (
  payload: ToolCallHookPayload,
  context: HookContext,
) => void | Promise<void>;
```

**Usage Example**:

```typescript
neurolink.hooks.onToolCall(async (payload, ctx) => {
  if (payload.type === "tool:end") {
    await metrics.recordToolExecution({
      tool: payload.toolName,
      success: !payload.error,
      duration: payload.duration,
      server: payload.serverId,
    });
  }
});
```

### 5. onWorkflowStep Hook

Triggered when a workflow step completes (for multi-step agent workflows).

```typescript
/**
 * Workflow step completion hook payload
 */
type WorkflowStepHookPayload = {
  /** Workflow identifier */
  workflowId: string;
  /** Step number */
  stepNumber: number;
  /** Total steps in workflow */
  totalSteps: number;
  /** Step name/identifier */
  stepName: string;
  /** Step type */
  stepType: "generation" | "tool" | "decision" | "loop" | "parallel";
  /** Step input */
  input: unknown;
  /** Step output */
  output: unknown;
  /** Step success status */
  success: boolean;
  /** Error if step failed */
  error?: string;
  /** Step duration in ms */
  duration: number;
  /** Tools used in this step */
  toolsUsed: string[];
  /** Timestamp */
  timestamp: number;
};

type OnWorkflowStepHook = (
  payload: WorkflowStepHookPayload,
  context: HookContext,
) => void | Promise<void>;
```

---

## Pub/Sub System

### Topic-Based Event System

The pub/sub system enables inter-component communication through topic handlers:

```typescript
/**
 * Pub/Sub topic definition
 */
type PubSubTopic<T = unknown> = {
  /** Topic name */
  name: string;
  /** Topic description */
  description?: string;
  /** Payload schema (for validation) */
  schema?: z.ZodType<T>;
  /** Retention policy */
  retention?: "none" | "latest" | "all";
  /** Max subscribers */
  maxSubscribers?: number;
};

/**
 * Pub/Sub manager for event-driven workflows
 */
type PubSubManager = {
  /** Create or get a topic */
  topic<T>(name: string, options?: TopicOptions): Topic<T>;

  /** Subscribe to a topic */
  subscribe<T>(
    topic: string | Topic<T>,
    handler: (message: T, metadata: MessageMetadata) => void | Promise<void>,
  ): Subscription;

  /** Publish to a topic */
  publish<T>(
    topic: string | Topic<T>,
    message: T,
    options?: PublishOptions,
  ): void;

  /** Unsubscribe from a topic */
  unsubscribe(subscription: Subscription): void;

  /** Get topic statistics */
  getTopicStats(topic: string): TopicStats;
};
```

### Built-in Topics

```typescript
/**
 * Built-in NeuroLink topics
 */
const NEUROLINK_TOPICS = {
  // Generation topics
  "neurolink.generation.started": Topic<GenerationStartedPayload>,
  "neurolink.generation.completed": Topic<GenerationCompletedPayload>,
  "neurolink.generation.failed": Topic<GenerationFailedPayload>,

  // Streaming topics
  "neurolink.stream.chunk": Topic<StreamChunkPayload>,
  "neurolink.stream.complete": Topic<StreamCompletePayload>,

  // Tool topics
  "neurolink.tool.called": Topic<ToolCallPayload>,
  "neurolink.tool.completed": Topic<ToolCompletedPayload>,
  "neurolink.tool.failed": Topic<ToolFailedPayload>,

  // Evaluation topics
  "neurolink.evaluation.completed": Topic<EvaluationCompletedPayload>,

  // MCP topics
  "neurolink.mcp.server.connected": Topic<MCPServerConnectedPayload>,
  "neurolink.mcp.server.disconnected": Topic<MCPServerDisconnectedPayload>,
  "neurolink.mcp.tool.discovered": Topic<MCPToolDiscoveredPayload>,

  // HITL topics
  "neurolink.hitl.approval.requested": Topic<HITLApprovalRequestPayload>,
  "neurolink.hitl.approval.granted": Topic<HITLApprovalGrantedPayload>,
  "neurolink.hitl.approval.denied": Topic<HITLApprovalDeniedPayload>,
} as const;
```

### Event-Driven Workflow Example

```typescript
// Create custom topic for domain events
const orderProcessedTopic = neurolink.pubsub.topic<{
  orderId: string;
  status: string;
  amount: number;
}>("app.order.processed");

// Subscribe to handle processed orders
neurolink.pubsub.subscribe(orderProcessedTopic, async (message, meta) => {
  // Trigger AI analysis of order
  const analysis = await neurolink.generate({
    input: { text: `Analyze order ${message.orderId}` },
    provider: "openai",
  });

  // Publish analysis result
  neurolink.pubsub.publish("app.order.analyzed", {
    orderId: message.orderId,
    analysis: analysis.content,
  });
});

// Publish when order is processed
neurolink.pubsub.publish(orderProcessedTopic, {
  orderId: "ORD-123",
  status: "completed",
  amount: 99.99,
});
```

---

## Lifecycle Callbacks

### onFinish Callback

Called when any major operation completes (generation, streaming, workflow).

```typescript
/**
 * Finish callback payload
 */
type FinishCallbackPayload = {
  /** Operation type */
  operationType: "generation" | "stream" | "workflow" | "tool";
  /** Operation ID */
  operationId: string;
  /** Success status */
  success: boolean;
  /** Result data */
  result?: unknown;
  /** Error if failed */
  error?: Error;
  /** Total duration in ms */
  duration: number;
  /** Provider used */
  provider?: string;
  /** Model used */
  model?: string;
  /** Token usage */
  usage?: TokenUsage;
  /** Context metadata */
  context?: Record<string, unknown>;
};

type OnFinishCallback = (
  payload: FinishCallbackPayload,
) => void | Promise<void>;
```

**Usage**:

```typescript
const result = await neurolink.generate({
  input: { text: "Hello world" },
  provider: "openai",
  onFinish: async (payload) => {
    console.log(`Operation ${payload.operationId} completed`);
    console.log(`Duration: ${payload.duration}ms`);
    console.log(`Tokens used: ${payload.usage?.totalTokens}`);
  },
});
```

### onError Callback

Called when any operation encounters an error.

```typescript
/**
 * Error callback payload
 */
type ErrorCallbackPayload = {
  /** Error object */
  error: Error;
  /** Error code */
  code?: string;
  /** Operation type */
  operationType: "generation" | "stream" | "workflow" | "tool";
  /** Operation ID */
  operationId: string;
  /** Recoverable flag */
  recoverable: boolean;
  /** Retry attempt number */
  retryAttempt?: number;
  /** Max retries allowed */
  maxRetries?: number;
  /** Context at time of error */
  context?: Record<string, unknown>;
  /** Timestamp */
  timestamp: number;
};

type OnErrorCallback = (payload: ErrorCallbackPayload) => void | Promise<void>;
```

**Usage**:

```typescript
const result = await neurolink.generate({
  input: { text: "Hello world" },
  provider: "openai",
  onError: async (payload) => {
    await errorReporting.capture(payload.error, {
      operation: payload.operationType,
      code: payload.code,
      recoverable: payload.recoverable,
    });
  },
});
```

### onStepFinish Callback

Called after each step in a multi-step generation with tools.

```typescript
/**
 * Step finish callback payload
 */
type StepFinishCallbackPayload = {
  /** Step number (1-indexed) */
  stepNumber: number;
  /** Step type */
  stepType: "generation" | "tool" | "thinking";
  /** Tool calls made in this step */
  toolCalls?: ToolCall[];
  /** Tool results from this step */
  toolResults?: ToolResult[];
  /** Text generated in this step */
  text?: string;
  /** Thinking content (for extended thinking models) */
  thinking?: string;
  /** Step duration in ms */
  duration: number;
  /** Cumulative token usage */
  usage?: TokenUsage;
  /** Finish reason */
  finishReason?: string;
};

type OnStepFinishCallback = (
  payload: StepFinishCallbackPayload,
) => void | Promise<void>;
```

**Usage**:

```typescript
const result = await neurolink.generate({
  input: { text: "Read the file and summarize it" },
  provider: "anthropic",
  maxSteps: 10,
  onStepFinish: async (payload) => {
    console.log(`Step ${payload.stepNumber}: ${payload.stepType}`);
    if (payload.toolCalls?.length) {
      console.log(
        `Tools called: ${payload.toolCalls.map((t) => t.toolName).join(", ")}`,
      );
    }
  },
});
```

### onChunk Callback (Streaming)

Called for each chunk during streaming operations.

```typescript
/**
 * Chunk callback payload
 */
type ChunkCallbackPayload = {
  /** Chunk type */
  type: "text" | "audio" | "tool_start" | "tool_end" | "thinking";
  /** Text content (for text chunks) */
  content?: string;
  /** Audio data (for audio chunks) */
  audio?: AudioChunk;
  /** Tool call info (for tool chunks) */
  toolCall?: {
    toolName: string;
    toolCallId: string;
    args?: Record<string, unknown>;
  };
  /** Chunk sequence number */
  sequenceNumber: number;
  /** Time since stream start in ms */
  elapsedTime: number;
  /** Cumulative bytes received */
  totalBytes: number;
};

type OnChunkCallback = (payload: ChunkCallbackPayload) => void | Promise<void>;
```

**Usage**:

```typescript
const result = await neurolink.stream({
  input: { text: "Tell me a story" },
  provider: "openai",
  onChunk: (payload) => {
    if (payload.type === "text" && payload.content) {
      process.stdout.write(payload.content);
    }
  },
});
```

---

## TypeScript Types

### Complete Type Definitions

Create a new file at `/src/lib/types/hookTypes.ts`:

```typescript
/**
 * Hook and Event System Type Definitions
 *
 * @module types/hookTypes
 */

import type { TokenUsage } from "./analytics.js";
import type { EvaluationData } from "./evaluation.js";
import type { ToolCall, ToolResult } from "./streamTypes.js";
import type { JsonValue, UnknownRecord } from "./common.js";

// ============================================
// HOOK CONTEXT TYPES
// ============================================

/**
 * Context provided to all hook handlers
 */
export type HookContext = {
  /** Unique request/operation ID */
  requestId: string;
  /** Session ID if available */
  sessionId?: string;
  /** User ID if available */
  userId?: string;
  /** Provider being used */
  provider?: string;
  /** Model being used */
  model?: string;
  /** Additional metadata */
  metadata?: Record<string, JsonValue>;
  /** Hook error handler */
  onHookError?: (error: Error, hookName: string) => void;
  /** Logger instance */
  logger?: {
    debug: (message: string, data?: unknown) => void;
    info: (message: string, data?: unknown) => void;
    warn: (message: string, data?: unknown) => void;
    error: (message: string, data?: unknown) => void;
  };
};

// ============================================
// HOOK EVENT TYPES
// ============================================

/**
 * All available hook event types
 */
export type HookEventType =
  | "generation:start"
  | "generation:complete"
  | "generation:error"
  | "stream:start"
  | "stream:chunk"
  | "stream:complete"
  | "stream:error"
  | "tool:start"
  | "tool:end"
  | "tool:error"
  | "evaluation:complete"
  | "scorer:run"
  | "workflow:step"
  | "workflow:complete"
  | "mcp:server:connect"
  | "mcp:server:disconnect"
  | "mcp:tool:discover"
  | "hitl:request"
  | "hitl:response";

// ============================================
// HOOK PAYLOAD TYPES
// ============================================

/**
 * Generation hook payloads
 */
export type GenerationStartPayload = {
  requestId: string;
  input: string;
  provider: string;
  model: string;
  options: UnknownRecord;
  timestamp: number;
};

export type GenerationCompletePayload = {
  requestId: string;
  content: string;
  provider: string;
  model: string;
  usage: TokenUsage;
  responseTime: number;
  toolsUsed: string[];
  toolExecutions: Array<{
    name: string;
    input: UnknownRecord;
    output: unknown;
    duration: number;
    success: boolean;
  }>;
  finishReason?: string;
  timestamp: number;
};

export type GenerationErrorPayload = {
  requestId: string;
  error: Error;
  code?: string;
  provider: string;
  model: string;
  recoverable: boolean;
  timestamp: number;
};

/**
 * Stream hook payloads
 */
export type StreamStartPayload = {
  streamId: string;
  requestId: string;
  provider: string;
  model: string;
  timestamp: number;
};

export type StreamChunkPayload = {
  streamId: string;
  type: "text" | "audio" | "tool" | "thinking";
  content?: string;
  sequenceNumber: number;
  elapsedTime: number;
  timestamp: number;
};

export type StreamCompletePayload = {
  streamId: string;
  requestId: string;
  totalChunks: number;
  totalBytes: number;
  duration: number;
  usage?: TokenUsage;
  timestamp: number;
};

/**
 * Tool hook payloads
 */
export type ToolStartPayload = {
  executionId: string;
  toolName: string;
  input: UnknownRecord;
  source: "direct" | "mcp" | "custom";
  serverId?: string;
  timestamp: number;
};

export type ToolEndPayload = {
  executionId: string;
  toolName: string;
  input: UnknownRecord;
  result: unknown;
  success: boolean;
  error?: string;
  duration: number;
  source: "direct" | "mcp" | "custom";
  serverId?: string;
  timestamp: number;
};

/**
 * Evaluation hook payload
 */
export type EvaluationCompletePayload = {
  evaluationId: string;
  scores: {
    relevance: number;
    accuracy: number;
    completeness: number;
    overall: number;
    domainAlignment?: number;
    terminologyAccuracy?: number;
    toolEffectiveness?: number;
  };
  reasoning: string;
  isOffTopic: boolean;
  alertSeverity: "low" | "medium" | "high";
  query: string;
  response: string;
  evaluationModel: string;
  evaluationTime: number;
  timestamp: number;
};

/**
 * Scorer run hook payload
 */
export type ScorerRunPayload = {
  scorerId: string;
  scorerName: string;
  score: number;
  maxScore: number;
  normalizedScore: number;
  criteria: string[];
  input: unknown;
  output: unknown;
  executionTime: number;
  metadata?: UnknownRecord;
  timestamp: number;
};

/**
 * Workflow step hook payload
 */
export type WorkflowStepPayload = {
  workflowId: string;
  stepNumber: number;
  totalSteps: number;
  stepName: string;
  stepType: "generation" | "tool" | "decision" | "loop" | "parallel";
  input: unknown;
  output: unknown;
  success: boolean;
  error?: string;
  duration: number;
  toolsUsed: string[];
  timestamp: number;
};

// ============================================
// HOOK HANDLER TYPES
// ============================================

/**
 * Generic hook handler type
 */
export type HookHandler<T> = (
  payload: T,
  context: HookContext,
) => void | Promise<void>;

/**
 * Hook filter function type
 */
export type HookFilter<T> = (
  payload: T,
  context: HookContext,
) => boolean | Promise<boolean>;

/**
 * Hook registration options
 */
export type HookRegistrationOptions<T = unknown> = {
  /** Unique identifier for this hook */
  id: string;
  /** Hook priority (higher = earlier execution) */
  priority?: number;
  /** Filter to conditionally execute */
  filter?: HookFilter<T>;
  /** Run synchronously (blocking) */
  sync?: boolean;
  /** Error handling behavior */
  onError?: "ignore" | "log" | "throw";
};

/**
 * Hook registration result
 */
export type HookRegistration = {
  /** Registration ID */
  id: string;
  /** Event type */
  event: HookEventType;
  /** Priority */
  priority: number;
  /** Unsubscribe function */
  unsubscribe: () => void;
};

// ============================================
// LIFECYCLE CALLBACK TYPES
// ============================================

/**
 * Finish callback payload
 */
export type FinishCallbackPayload = {
  operationType: "generation" | "stream" | "workflow" | "tool";
  operationId: string;
  success: boolean;
  result?: unknown;
  error?: Error;
  duration: number;
  provider?: string;
  model?: string;
  usage?: TokenUsage;
  context?: UnknownRecord;
};

/**
 * Error callback payload
 */
export type ErrorCallbackPayload = {
  error: Error;
  code?: string;
  operationType: "generation" | "stream" | "workflow" | "tool";
  operationId: string;
  recoverable: boolean;
  retryAttempt?: number;
  maxRetries?: number;
  context?: UnknownRecord;
  timestamp: number;
};

/**
 * Step finish callback payload
 */
export type StepFinishCallbackPayload = {
  stepNumber: number;
  stepType: "generation" | "tool" | "thinking";
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  text?: string;
  thinking?: string;
  duration: number;
  usage?: TokenUsage;
  finishReason?: string;
};

/**
 * Chunk callback payload
 */
export type ChunkCallbackPayload = {
  type: "text" | "audio" | "tool_start" | "tool_end" | "thinking";
  content?: string;
  audio?: {
    data: Buffer;
    format: string;
    sampleRate: number;
  };
  toolCall?: {
    toolName: string;
    toolCallId: string;
    args?: UnknownRecord;
  };
  sequenceNumber: number;
  elapsedTime: number;
  totalBytes: number;
};

/**
 * Lifecycle callback types
 */
export type OnFinishCallback = (
  payload: FinishCallbackPayload,
) => void | Promise<void>;
export type OnErrorCallback = (
  payload: ErrorCallbackPayload,
) => void | Promise<void>;
export type OnStepFinishCallback = (
  payload: StepFinishCallbackPayload,
) => void | Promise<void>;
export type OnChunkCallback = (
  payload: ChunkCallbackPayload,
) => void | Promise<void>;

// ============================================
// PUB/SUB TYPES
// ============================================

/**
 * Pub/Sub message metadata
 */
export type MessageMetadata = {
  /** Message ID */
  messageId: string;
  /** Topic name */
  topic: string;
  /** Publish timestamp */
  timestamp: number;
  /** Publisher ID */
  publisherId?: string;
  /** Correlation ID for tracking */
  correlationId?: string;
  /** Custom headers */
  headers?: Record<string, string>;
};

/**
 * Publish options
 */
export type PublishOptions = {
  /** Correlation ID for tracking */
  correlationId?: string;
  /** Custom headers */
  headers?: Record<string, string>;
  /** Delay before delivery (ms) */
  delay?: number;
  /** Time-to-live (ms) */
  ttl?: number;
};

/**
 * Topic options
 */
export type TopicOptions = {
  /** Topic description */
  description?: string;
  /** Retention policy */
  retention?: "none" | "latest" | "all";
  /** Max retained messages */
  maxRetained?: number;
  /** Max subscribers */
  maxSubscribers?: number;
};

/**
 * Subscription object
 */
export type Subscription = {
  /** Subscription ID */
  id: string;
  /** Topic name */
  topic: string;
  /** Unsubscribe function */
  unsubscribe: () => void;
  /** Check if active */
  isActive: () => boolean;
};

/**
 * Topic statistics
 */
export type TopicStats = {
  /** Topic name */
  name: string;
  /** Number of subscribers */
  subscriberCount: number;
  /** Total messages published */
  messageCount: number;
  /** Messages per second (last minute) */
  messagesPerSecond: number;
  /** Retained messages */
  retainedMessages: number;
};

// ============================================
// HOOKS MANAGER INTERFACE
// ============================================

/**
 * Main hooks manager interface
 */
export type HooksManager = {
  // Hook registration methods
  onGeneration(
    handler: HookHandler<GenerationCompletePayload>,
    options?: HookRegistrationOptions<GenerationCompletePayload>,
  ): HookRegistration;

  onGenerationStart(
    handler: HookHandler<GenerationStartPayload>,
    options?: HookRegistrationOptions<GenerationStartPayload>,
  ): HookRegistration;

  onEvaluation(
    handler: HookHandler<EvaluationCompletePayload>,
    options?: HookRegistrationOptions<EvaluationCompletePayload>,
  ): HookRegistration;

  onScorerRun(
    handler: HookHandler<ScorerRunPayload>,
    options?: HookRegistrationOptions<ScorerRunPayload>,
  ): HookRegistration;

  onToolCall(
    handler: HookHandler<ToolStartPayload | ToolEndPayload>,
    options?: HookRegistrationOptions<ToolStartPayload | ToolEndPayload>,
  ): HookRegistration;

  onWorkflowStep(
    handler: HookHandler<WorkflowStepPayload>,
    options?: HookRegistrationOptions<WorkflowStepPayload>,
  ): HookRegistration;

  // Generic hook registration
  on<T>(
    event: HookEventType,
    handler: HookHandler<T>,
    options?: HookRegistrationOptions<T>,
  ): HookRegistration;

  // Hook removal
  off(registration: HookRegistration): void;
  off(event: HookEventType, handlerId: string): void;

  // Hook management
  clear(event?: HookEventType): void;
  listHooks(event?: HookEventType): HookRegistration[];
  getStats(): HookStats;
};

/**
 * Hook statistics
 */
export type HookStats = {
  /** Total registered hooks */
  totalHooks: number;
  /** Hooks by event type */
  hooksByEvent: Record<HookEventType, number>;
  /** Total invocations */
  totalInvocations: number;
  /** Average execution time (ms) */
  averageExecutionTime: number;
  /** Error count */
  errorCount: number;
};

// ============================================
// PUB/SUB MANAGER INTERFACE
// ============================================

/**
 * Pub/Sub manager interface
 */
export type PubSubManager = {
  /** Create or get a topic */
  topic<T>(name: string, options?: TopicOptions): Topic<T>;

  /** Subscribe to a topic */
  subscribe<T>(
    topic: string | Topic<T>,
    handler: (message: T, metadata: MessageMetadata) => void | Promise<void>,
  ): Subscription;

  /** Publish to a topic */
  publish<T>(
    topic: string | Topic<T>,
    message: T,
    options?: PublishOptions,
  ): void;

  /** Unsubscribe from a topic */
  unsubscribe(subscription: Subscription): void;

  /** Get topic statistics */
  getTopicStats(topic: string): TopicStats | undefined;

  /** List all topics */
  listTopics(): string[];

  /** Clear all subscriptions */
  clear(): void;
};

/**
 * Topic object for type-safe pub/sub
 */
export type Topic<T> = {
  readonly name: string;
  readonly options: TopicOptions;
  publish(message: T, options?: PublishOptions): void;
  subscribe(
    handler: (message: T, metadata: MessageMetadata) => void | Promise<void>,
  ): Subscription;
};
```

---

## Integration with NeuroLink Components

### HooksManager Implementation

Create `/src/lib/hooks/hooksManager.ts`:

```typescript
/**
 * Hooks Manager Implementation
 *
 * Provides non-blocking hook execution with priority ordering
 * and error isolation following Mastra patterns.
 *
 * @module hooks/hooksManager
 */

import { EventEmitter } from "events";
import { nanoid } from "nanoid";
import { logger } from "../utils/logger.js";
import type {
  HooksManager,
  HookContext,
  HookEventType,
  HookHandler,
  HookRegistration,
  HookRegistrationOptions,
  HookStats,
  GenerationCompletePayload,
  GenerationStartPayload,
  EvaluationCompletePayload,
  ScorerRunPayload,
  ToolStartPayload,
  ToolEndPayload,
  WorkflowStepPayload,
} from "../types/hookTypes.js";

type RegisteredHook<T = unknown> = {
  id: string;
  event: HookEventType;
  handler: HookHandler<T>;
  priority: number;
  filter?: (payload: T, context: HookContext) => boolean | Promise<boolean>;
  sync: boolean;
  onError: "ignore" | "log" | "throw";
};

/**
 * Hooks Manager - Manages non-blocking event hooks
 */
export class NeuroLinkHooksManager implements HooksManager {
  private hooks: Map<HookEventType, RegisteredHook[]> = new Map();
  private stats = {
    totalInvocations: 0,
    totalExecutionTime: 0,
    errorCount: 0,
  };

  constructor(private emitter?: EventEmitter) {
    if (emitter) {
      this.setupEmitterBridge();
    }
  }

  /**
   * Bridge existing EventEmitter events to hooks
   */
  private setupEmitterBridge(): void {
    if (!this.emitter) return;

    // Bridge tool events
    this.emitter.on("tool:start", (payload) => {
      this.executeHooks("tool:start", payload);
    });

    this.emitter.on("tool:end", (payload) => {
      this.executeHooks("tool:end", payload);
    });

    // Bridge generation events
    this.emitter.on("generation:start", (payload) => {
      this.executeHooks("generation:start", payload);
    });

    this.emitter.on("generation:end", (payload) => {
      this.executeHooks("generation:complete", payload);
    });

    // Bridge stream events
    this.emitter.on("stream:chunk", (payload) => {
      this.executeHooks("stream:chunk", payload);
    });

    this.emitter.on("stream:complete", (payload) => {
      this.executeHooks("stream:complete", payload);
    });
  }

  /**
   * Register a hook for generation completion
   */
  onGeneration(
    handler: HookHandler<GenerationCompletePayload>,
    options?: HookRegistrationOptions<GenerationCompletePayload>,
  ): HookRegistration {
    return this.registerHook("generation:complete", handler, options);
  }

  /**
   * Register a hook for generation start
   */
  onGenerationStart(
    handler: HookHandler<GenerationStartPayload>,
    options?: HookRegistrationOptions<GenerationStartPayload>,
  ): HookRegistration {
    return this.registerHook("generation:start", handler, options);
  }

  /**
   * Register a hook for evaluation completion
   */
  onEvaluation(
    handler: HookHandler<EvaluationCompletePayload>,
    options?: HookRegistrationOptions<EvaluationCompletePayload>,
  ): HookRegistration {
    return this.registerHook("evaluation:complete", handler, options);
  }

  /**
   * Register a hook for scorer runs
   */
  onScorerRun(
    handler: HookHandler<ScorerRunPayload>,
    options?: HookRegistrationOptions<ScorerRunPayload>,
  ): HookRegistration {
    return this.registerHook("scorer:run", handler, options);
  }

  /**
   * Register a hook for tool calls
   */
  onToolCall(
    handler: HookHandler<ToolStartPayload | ToolEndPayload>,
    options?: HookRegistrationOptions<ToolStartPayload | ToolEndPayload>,
  ): HookRegistration {
    // Register for both start and end events
    const startReg = this.registerHook("tool:start", handler, options);
    const endReg = this.registerHook("tool:end", handler, options);

    // Return a combined registration
    return {
      id: startReg.id,
      event: "tool:start", // Primary event
      priority: startReg.priority,
      unsubscribe: () => {
        startReg.unsubscribe();
        endReg.unsubscribe();
      },
    };
  }

  /**
   * Register a hook for workflow steps
   */
  onWorkflowStep(
    handler: HookHandler<WorkflowStepPayload>,
    options?: HookRegistrationOptions<WorkflowStepPayload>,
  ): HookRegistration {
    return this.registerHook("workflow:step", handler, options);
  }

  /**
   * Generic hook registration
   */
  on<T>(
    event: HookEventType,
    handler: HookHandler<T>,
    options?: HookRegistrationOptions<T>,
  ): HookRegistration {
    return this.registerHook(event, handler, options);
  }

  /**
   * Remove a hook registration
   */
  off(
    registrationOrEvent: HookRegistration | HookEventType,
    handlerId?: string,
  ): void {
    if (typeof registrationOrEvent === "string") {
      // Remove by event and handler ID
      const hooks = this.hooks.get(registrationOrEvent);
      if (hooks && handlerId) {
        const index = hooks.findIndex((h) => h.id === handlerId);
        if (index !== -1) {
          hooks.splice(index, 1);
        }
      }
    } else {
      // Remove by registration
      const hooks = this.hooks.get(registrationOrEvent.event);
      if (hooks) {
        const index = hooks.findIndex((h) => h.id === registrationOrEvent.id);
        if (index !== -1) {
          hooks.splice(index, 1);
        }
      }
    }
  }

  /**
   * Clear hooks
   */
  clear(event?: HookEventType): void {
    if (event) {
      this.hooks.delete(event);
    } else {
      this.hooks.clear();
    }
  }

  /**
   * List registered hooks
   */
  listHooks(event?: HookEventType): HookRegistration[] {
    const registrations: HookRegistration[] = [];

    const events = event ? [event] : Array.from(this.hooks.keys());

    for (const evt of events) {
      const hooks = this.hooks.get(evt) || [];
      for (const hook of hooks) {
        registrations.push({
          id: hook.id,
          event: hook.event,
          priority: hook.priority,
          unsubscribe: () =>
            this.off({
              id: hook.id,
              event: hook.event,
              priority: hook.priority,
              unsubscribe: () => {},
            }),
        });
      }
    }

    return registrations;
  }

  /**
   * Get hook statistics
   */
  getStats(): HookStats {
    const hooksByEvent: Record<HookEventType, number> = {} as Record<
      HookEventType,
      number
    >;
    let totalHooks = 0;

    for (const [event, hooks] of this.hooks) {
      hooksByEvent[event] = hooks.length;
      totalHooks += hooks.length;
    }

    return {
      totalHooks,
      hooksByEvent,
      totalInvocations: this.stats.totalInvocations,
      averageExecutionTime:
        this.stats.totalInvocations > 0
          ? this.stats.totalExecutionTime / this.stats.totalInvocations
          : 0,
      errorCount: this.stats.errorCount,
    };
  }

  /**
   * Internal hook registration
   */
  private registerHook<T>(
    event: HookEventType,
    handler: HookHandler<T>,
    options?: HookRegistrationOptions<T>,
  ): HookRegistration {
    const id = options?.id || nanoid();
    const priority = options?.priority ?? 0;

    const registeredHook: RegisteredHook<T> = {
      id,
      event,
      handler,
      priority,
      filter: options?.filter,
      sync: options?.sync ?? false,
      onError: options?.onError ?? "log",
    };

    // Get or create hooks array for this event
    if (!this.hooks.has(event)) {
      this.hooks.set(event, []);
    }

    const hooks = this.hooks.get(event)!;
    hooks.push(registeredHook as RegisteredHook);

    // Sort by priority (higher first)
    hooks.sort((a, b) => b.priority - a.priority);

    logger.debug(`Hook registered: ${id} for event ${event}`, {
      priority,
      sync: registeredHook.sync,
    });

    return {
      id,
      event,
      priority,
      unsubscribe: () =>
        this.off({ id, event, priority, unsubscribe: () => {} }),
    };
  }

  /**
   * Execute hooks for an event
   * Uses setImmediate for non-blocking execution
   */
  async executeHooks<T>(
    event: HookEventType,
    payload: T,
    context?: Partial<HookContext>,
  ): Promise<void> {
    const hooks = this.hooks.get(event);
    if (!hooks || hooks.length === 0) return;

    const fullContext: HookContext = {
      requestId: context?.requestId || nanoid(),
      sessionId: context?.sessionId,
      userId: context?.userId,
      provider: context?.provider,
      model: context?.model,
      metadata: context?.metadata,
      logger,
    };

    for (const hook of hooks) {
      // Apply filter if present
      if (hook.filter) {
        try {
          const shouldRun = await hook.filter(payload, fullContext);
          if (!shouldRun) continue;
        } catch (error) {
          logger.warn(`Hook filter error for ${hook.id}:`, error);
          continue;
        }
      }

      if (hook.sync) {
        // Synchronous execution (blocking)
        await this.executeHookSync(hook, payload, fullContext);
      } else {
        // Non-blocking execution using setImmediate
        this.executeHookNonBlocking(hook, payload, fullContext);
      }
    }
  }

  /**
   * Execute a hook synchronously
   */
  private async executeHookSync<T>(
    hook: RegisteredHook<T>,
    payload: T,
    context: HookContext,
  ): Promise<void> {
    const startTime = Date.now();
    this.stats.totalInvocations++;

    try {
      await hook.handler(payload, context);
      this.stats.totalExecutionTime += Date.now() - startTime;
    } catch (error) {
      this.stats.errorCount++;
      this.handleHookError(hook, error as Error, context);
    }
  }

  /**
   * Execute a hook non-blocking using setImmediate
   */
  private executeHookNonBlocking<T>(
    hook: RegisteredHook<T>,
    payload: T,
    context: HookContext,
  ): void {
    setImmediate(async () => {
      const startTime = Date.now();
      this.stats.totalInvocations++;

      try {
        await hook.handler(payload, context);
        this.stats.totalExecutionTime += Date.now() - startTime;
      } catch (error) {
        this.stats.errorCount++;
        this.handleHookError(hook, error as Error, context);
      }
    });
  }

  /**
   * Handle hook execution errors
   */
  private handleHookError(
    hook: RegisteredHook,
    error: Error,
    context: HookContext,
  ): void {
    switch (hook.onError) {
      case "ignore":
        // Silently ignore
        break;
      case "log":
        logger.error(`Hook execution error [${hook.id}]:`, {
          error: error.message,
          event: hook.event,
          requestId: context.requestId,
        });
        break;
      case "throw":
        throw error;
    }

    // Call context error handler if available
    context.onHookError?.(error, hook.id);
  }
}

// Export singleton factory
export function createHooksManager(emitter?: EventEmitter): HooksManager {
  return new NeuroLinkHooksManager(emitter);
}
```

### Integration with NeuroLink Class

Update `/src/lib/neurolink.ts` to include hooks:

```typescript
// Add to imports
import { createHooksManager } from "./hooks/hooksManager.js";
import { createPubSubManager } from "./hooks/pubsubManager.js";
import type { HooksManager, PubSubManager } from "./types/hookTypes.js";

export class NeuroLink {
  // Add hooks and pubsub managers
  public readonly hooks: HooksManager;
  public readonly pubsub: PubSubManager;

  constructor(config?: NeurolinkConstructorConfig) {
    // ... existing initialization ...

    // Initialize hooks manager with emitter bridge
    this.hooks = createHooksManager(this.emitter as EventEmitter);

    // Initialize pub/sub manager
    this.pubsub = createPubSubManager();

    // ... rest of constructor ...
  }

  // Update generate method to use hooks
  async generate(options: GenerateOptions): Promise<GenerateResult> {
    const requestId = nanoid();
    const startTime = Date.now();

    // Emit generation start hook
    await this.hooks.executeHooks("generation:start", {
      requestId,
      input: options.input.text,
      provider: options.provider || "default",
      model: options.model || "default",
      options,
      timestamp: startTime,
    });

    try {
      const result = await this.executeGeneration(options);

      // Emit generation complete hook
      await this.hooks.executeHooks("generation:complete", {
        requestId,
        content: result.content,
        provider: result.provider || options.provider || "default",
        model: result.model || options.model || "default",
        usage: result.usage || {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
        responseTime: Date.now() - startTime,
        toolsUsed: result.toolsUsed || [],
        toolExecutions: result.toolExecutions || [],
        finishReason: "stop",
        timestamp: Date.now(),
      });

      // Call lifecycle callback if provided
      if (options.onFinish) {
        await options.onFinish({
          operationType: "generation",
          operationId: requestId,
          success: true,
          result,
          duration: Date.now() - startTime,
          provider: result.provider,
          model: result.model,
          usage: result.usage,
        });
      }

      return result;
    } catch (error) {
      // Emit generation error hook
      await this.hooks.executeHooks("generation:error", {
        requestId,
        error: error as Error,
        provider: options.provider || "default",
        model: options.model || "default",
        recoverable: isRetriableError(error),
        timestamp: Date.now(),
      });

      // Call error callback if provided
      if (options.onError) {
        await options.onError({
          error: error as Error,
          operationType: "generation",
          operationId: requestId,
          recoverable: isRetriableError(error),
          timestamp: Date.now(),
        });
      }

      throw error;
    }
  }
}
```

---

## Code Examples

### Example 1: Analytics Integration

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { AnalyticsService } from "./analytics";

const neurolink = new NeuroLink();
const analytics = new AnalyticsService();

// Track all generations
neurolink.hooks.onGeneration(async (payload, ctx) => {
  await analytics.track("ai.generation", {
    requestId: ctx.requestId,
    provider: payload.provider,
    model: payload.model,
    tokens: payload.usage.totalTokens,
    duration: payload.responseTime,
    toolCount: payload.toolsUsed.length,
    userId: ctx.userId,
    sessionId: ctx.sessionId,
  });
});

// Track tool usage
neurolink.hooks.onToolCall(async (payload, ctx) => {
  if ("duration" in payload) {
    // This is an end event
    await analytics.track("ai.tool.execution", {
      tool: payload.toolName,
      success: payload.success,
      duration: payload.duration,
      source: payload.source,
    });
  }
});

// Use with generation
const result = await neurolink.generate({
  input: { text: "Analyze this data" },
  provider: "openai",
  context: {
    userId: "user-123",
    sessionId: "session-456",
  },
});
```

### Example 2: Quality Monitoring

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { AlertingService } from "./alerting";

const neurolink = new NeuroLink();
const alerting = new AlertingService();

// Monitor evaluation quality
neurolink.hooks.onEvaluation(async (payload, ctx) => {
  // Alert on low quality
  if (payload.scores.overall < 5) {
    await alerting.send({
      severity: payload.alertSeverity,
      title: "Low Quality AI Response",
      message: `Score: ${payload.scores.overall}/10 - ${payload.reasoning}`,
      metadata: {
        query: payload.query,
        evaluationModel: payload.evaluationModel,
      },
    });
  }

  // Alert on off-topic responses
  if (payload.isOffTopic) {
    await alerting.send({
      severity: "high",
      title: "Off-Topic AI Response",
      message: `Response was flagged as off-topic`,
      metadata: {
        query: payload.query,
        response: payload.response.substring(0, 200),
      },
    });
  }
});
```

### Example 3: Logging and Debugging

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Debug hook - log all tool executions
neurolink.hooks.onToolCall(
  (payload, ctx) => {
    if ("duration" in payload) {
      ctx.logger?.debug(`Tool executed: ${payload.toolName}`, {
        success: payload.success,
        duration: payload.duration,
        input: payload.input,
        result: payload.success ? payload.result : undefined,
        error: payload.error,
      });
    } else {
      ctx.logger?.debug(`Tool started: ${payload.toolName}`, {
        input: payload.input,
      });
    }
  },
  {
    id: "debug-tool-logger",
    priority: 100, // High priority to log first
  },
);

// Sync hook for critical logging
neurolink.hooks.onGeneration(
  async (payload, ctx) => {
    // This runs synchronously before returning
    console.log(`[SYNC] Generation complete: ${payload.responseTime}ms`);
  },
  {
    id: "sync-logger",
    sync: true, // Run synchronously
  },
);
```

### Example 4: Pub/Sub Workflow

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Define typed topics
const documentAnalyzedTopic = neurolink.pubsub.topic<{
  documentId: string;
  content: string;
  metadata: Record<string, unknown>;
}>("app.document.analyzed");

const summaryGeneratedTopic = neurolink.pubsub.topic<{
  documentId: string;
  summary: string;
}>("app.summary.generated");

// Subscribe to document analysis events
neurolink.pubsub.subscribe(documentAnalyzedTopic, async (message, meta) => {
  console.log(`Processing document ${message.documentId}`);

  // Generate summary using AI
  const result = await neurolink.generate({
    input: { text: `Summarize this document:\n\n${message.content}` },
    provider: "anthropic",
    model: "claude-3-haiku",
  });

  // Publish summary
  summaryGeneratedTopic.publish(
    {
      documentId: message.documentId,
      summary: result.content,
    },
    {
      correlationId: meta.correlationId,
    },
  );
});

// Subscribe to summaries
neurolink.pubsub.subscribe(summaryGeneratedTopic, async (message, meta) => {
  console.log(`Summary for ${message.documentId}: ${message.summary}`);
  // Store summary, send notification, etc.
});

// Trigger workflow
documentAnalyzedTopic.publish({
  documentId: "doc-123",
  content: "Long document content...",
  metadata: { author: "user-1" },
});
```

### Example 5: Lifecycle Callbacks

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Generation with all lifecycle callbacks
const result = await neurolink.generate({
  input: { text: "Write a story about a robot" },
  provider: "openai",
  maxSteps: 5,

  // Called for each step in multi-step generation
  onStepFinish: async (payload) => {
    console.log(`Step ${payload.stepNumber} complete: ${payload.stepType}`);
    if (payload.toolCalls?.length) {
      console.log(
        `  Tools: ${payload.toolCalls.map((t) => t.toolName).join(", ")}`,
      );
    }
    if (payload.thinking) {
      console.log(`  Thinking: ${payload.thinking.substring(0, 100)}...`);
    }
  },

  // Called on completion
  onFinish: async (payload) => {
    console.log(`Generation complete!`);
    console.log(`  Duration: ${payload.duration}ms`);
    console.log(`  Tokens: ${payload.usage?.totalTokens}`);
    console.log(`  Success: ${payload.success}`);
  },

  // Called on error
  onError: async (payload) => {
    console.error(`Generation failed: ${payload.error.message}`);
    console.error(`  Recoverable: ${payload.recoverable}`);
    if (payload.retryAttempt) {
      console.error(
        `  Retry attempt: ${payload.retryAttempt}/${payload.maxRetries}`,
      );
    }
  },
});

// Streaming with chunk callback
const streamResult = await neurolink.stream({
  input: { text: "Tell me a long story" },
  provider: "anthropic",

  onChunk: (payload) => {
    if (payload.type === "text" && payload.content) {
      process.stdout.write(payload.content);
    }
    if (payload.type === "tool_start") {
      console.log(`\n[Tool started: ${payload.toolCall?.toolName}]`);
    }
    if (payload.type === "tool_end") {
      console.log(`[Tool completed]\n`);
    }
  },
});
```

---

## Step-by-Step Implementation Plan

### Phase 1: Core Hook Types (Week 1)

1. **Create hook type definitions**
   - File: `/src/lib/types/hookTypes.ts`
   - Define all payload interfaces
   - Define hook handler types
   - Define registration options

2. **Update type exports**
   - File: `/src/lib/types/index.ts`
   - Export all hook types

### Phase 2: HooksManager Implementation (Week 2)

1. **Implement HooksManager class**
   - File: `/src/lib/hooks/hooksManager.ts`
   - Non-blocking execution with setImmediate
   - Priority-based ordering
   - Error isolation
   - Statistics tracking

2. **Implement hook execution utilities**
   - File: `/src/lib/hooks/hookUtils.ts`
   - Filter execution
   - Context building
   - Error handling

### Phase 3: Pub/Sub Implementation (Week 3)

1. **Implement PubSubManager class**
   - File: `/src/lib/hooks/pubsubManager.ts`
   - Topic management
   - Subscription handling
   - Message routing

2. **Define built-in topics**
   - File: `/src/lib/hooks/topics.ts`
   - NeuroLink internal topics
   - Type-safe topic creators

### Phase 4: Integration (Week 4)

1. **Integrate with NeuroLink class**
   - Update `/src/lib/neurolink.ts`
   - Add hooks property
   - Add pubsub property
   - Emit events at appropriate points

2. **Update GenerationHandler**
   - File: `/src/lib/core/modules/GenerationHandler.ts`
   - Add onStepFinish callback support
   - Emit step events

3. **Update StreamHandler**
   - File: `/src/lib/core/modules/StreamHandler.ts`
   - Add onChunk callback support
   - Emit chunk events

### Phase 5: Options Integration (Week 5)

1. **Update GenerateOptions**
   - File: `/src/lib/types/generateTypes.ts`
   - Add lifecycle callbacks
   - Add hook configuration

2. **Update StreamOptions**
   - File: `/src/lib/types/streamTypes.ts`
   - Add lifecycle callbacks
   - Add hook configuration

### Phase 6: Testing and Documentation (Week 6)

1. **Write unit tests**
   - File: `/test/suites/hooks.test.ts`
   - Test hook registration
   - Test hook execution
   - Test error handling
   - Test pub/sub

2. **Write integration tests**
   - File: `/test/integration/hooks.test.ts`
   - Test with real providers
   - Test lifecycle callbacks

3. **Update documentation**
   - Update `/docs/sdk/api-reference.md`
   - Add hooks guide to `/docs/features/`
   - Add examples

---

## Testing Strategy

### Unit Tests

```typescript
// test/suites/hooks.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHooksManager } from "../../src/lib/hooks/hooksManager";
import type {
  GenerationCompletePayload,
  HookContext,
} from "../../src/lib/types/hookTypes";

describe("HooksManager", () => {
  let hooksManager: ReturnType<typeof createHooksManager>;

  beforeEach(() => {
    hooksManager = createHooksManager();
  });

  describe("Hook Registration", () => {
    it("should register a hook and return registration", () => {
      const handler = vi.fn();
      const registration = hooksManager.onGeneration(handler);

      expect(registration.id).toBeDefined();
      expect(registration.event).toBe("generation:complete");
      expect(registration.unsubscribe).toBeInstanceOf(Function);
    });

    it("should register hooks with custom priority", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      hooksManager.onGeneration(handler1, { id: "low", priority: 1 });
      hooksManager.onGeneration(handler2, { id: "high", priority: 10 });

      const hooks = hooksManager.listHooks("generation:complete");
      expect(hooks[0].id).toBe("high");
      expect(hooks[1].id).toBe("low");
    });
  });

  describe("Hook Execution", () => {
    it("should execute hooks non-blocking by default", async () => {
      const executionOrder: number[] = [];

      hooksManager.onGeneration(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        executionOrder.push(1);
      });

      const payload: GenerationCompletePayload = {
        requestId: "test",
        content: "test content",
        provider: "openai",
        model: "gpt-4",
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        responseTime: 100,
        toolsUsed: [],
        toolExecutions: [],
        timestamp: Date.now(),
      };

      await hooksManager.executeHooks("generation:complete", payload);
      executionOrder.push(2);

      // Hook executes after due to setImmediate
      expect(executionOrder[0]).toBe(2);

      // Wait for hook to complete
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(executionOrder).toContain(1);
    });

    it("should execute sync hooks blocking", async () => {
      const executionOrder: number[] = [];

      hooksManager.onGeneration(
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          executionOrder.push(1);
        },
        { id: "sync-hook", sync: true },
      );

      const payload: GenerationCompletePayload = {
        requestId: "test",
        content: "test content",
        provider: "openai",
        model: "gpt-4",
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        responseTime: 100,
        toolsUsed: [],
        toolExecutions: [],
        timestamp: Date.now(),
      };

      await hooksManager.executeHooks("generation:complete", payload);
      executionOrder.push(2);

      // Sync hook blocks, so 1 should come before 2
      expect(executionOrder).toEqual([1, 2]);
    });

    it("should apply filters before execution", async () => {
      const handler = vi.fn();

      hooksManager.onGeneration(handler, {
        id: "filtered",
        filter: (payload) => payload.provider === "anthropic",
      });

      const openaiPayload: GenerationCompletePayload = {
        requestId: "test",
        content: "test",
        provider: "openai",
        model: "gpt-4",
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        responseTime: 100,
        toolsUsed: [],
        toolExecutions: [],
        timestamp: Date.now(),
      };

      await hooksManager.executeHooks("generation:complete", openaiPayload);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(handler).not.toHaveBeenCalled();

      const anthropicPayload = { ...openaiPayload, provider: "anthropic" };
      await hooksManager.executeHooks("generation:complete", anthropicPayload);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe("Error Handling", () => {
    it("should isolate errors with onError: ignore", async () => {
      const errorHandler = vi.fn().mockRejectedValue(new Error("Test error"));
      const successHandler = vi.fn();

      hooksManager.onGeneration(errorHandler, {
        id: "error",
        onError: "ignore",
      });
      hooksManager.onGeneration(successHandler, {
        id: "success",
        priority: -1,
      });

      const payload: GenerationCompletePayload = {
        requestId: "test",
        content: "test",
        provider: "openai",
        model: "gpt-4",
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        responseTime: 100,
        toolsUsed: [],
        toolExecutions: [],
        timestamp: Date.now(),
      };

      await hooksManager.executeHooks("generation:complete", payload);
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(errorHandler).toHaveBeenCalled();
      expect(successHandler).toHaveBeenCalled();
    });
  });

  describe("Statistics", () => {
    it("should track hook execution statistics", async () => {
      const handler = vi.fn();
      hooksManager.onGeneration(handler, { id: "stats-hook" });

      const payload: GenerationCompletePayload = {
        requestId: "test",
        content: "test",
        provider: "openai",
        model: "gpt-4",
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        responseTime: 100,
        toolsUsed: [],
        toolExecutions: [],
        timestamp: Date.now(),
      };

      await hooksManager.executeHooks("generation:complete", payload);
      await new Promise((resolve) => setTimeout(resolve, 10));

      const stats = hooksManager.getStats();
      expect(stats.totalHooks).toBe(1);
      expect(stats.totalInvocations).toBe(1);
    });
  });
});
```

### Integration Tests

```typescript
// test/integration/hooks.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NeuroLink } from "../../src/lib/neurolink";

describe("NeuroLink Hooks Integration", () => {
  let neurolink: NeuroLink;

  beforeEach(() => {
    neurolink = new NeuroLink();
  });

  afterEach(async () => {
    await neurolink.shutdown();
  });

  it("should call onGeneration hook after generate", async () => {
    const hookHandler = vi.fn();
    neurolink.hooks.onGeneration(hookHandler);

    await neurolink.generate({
      input: { text: "Hello world" },
      provider: "openai",
      model: "gpt-4o-mini",
    });

    // Wait for non-blocking hook
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(hookHandler).toHaveBeenCalledOnce();
    expect(hookHandler.mock.calls[0][0]).toMatchObject({
      content: expect.any(String),
      provider: "openai",
      model: "gpt-4o-mini",
      usage: expect.any(Object),
      responseTime: expect.any(Number),
    });
  });

  it("should call lifecycle callbacks during generate", async () => {
    const onFinish = vi.fn();
    const onStepFinish = vi.fn();

    await neurolink.generate({
      input: { text: "What time is it?" },
      provider: "openai",
      maxSteps: 3,
      onFinish,
      onStepFinish,
    });

    expect(onFinish).toHaveBeenCalledOnce();
    expect(onFinish.mock.calls[0][0]).toMatchObject({
      operationType: "generation",
      success: true,
      duration: expect.any(Number),
    });
  });
});
```

---

## Summary

This implementation guide provides a comprehensive plan for adding Mastra-style hooks and events to NeuroLink. The key features include:

1. **Non-Blocking Hooks**: Using `setImmediate` for hook execution
2. **Type-Safe Events**: Full TypeScript support for all payloads
3. **Priority System**: Ordered hook execution with configurable priority
4. **Lifecycle Callbacks**: `onFinish`, `onError`, `onStepFinish`, `onChunk`
5. **Pub/Sub System**: Topic-based messaging for inter-component communication
6. **Error Isolation**: Hook errors don't affect main execution
7. **Statistics Tracking**: Built-in metrics for monitoring

The implementation follows NeuroLink's existing patterns:

- Factory pattern for manager creation
- Typed EventEmitter bridge
- Middleware-style configuration
- Comprehensive type definitions

Estimated implementation time: 6 weeks with proper testing and documentation.
