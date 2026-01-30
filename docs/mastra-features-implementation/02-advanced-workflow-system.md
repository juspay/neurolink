# Advanced Workflow System Implementation Guide

This document provides a comprehensive implementation guide for adding Mastra-style advanced workflow capabilities to NeuroLink. The workflow system enables declarative, type-safe orchestration of complex AI operations with features like graph-based execution, conditional branching, parallel execution, and suspension/resumption.

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Architecture Design](#2-architecture-design)
3. [Type System Design](#3-type-system-design)
4. [Core Components](#4-core-components)
5. [Fluent Builder API](#5-fluent-builder-api)
6. [Execution Engine](#6-execution-engine)
7. [State Management](#7-state-management)
8. [Event Streaming](#8-event-streaming)
9. [Integration Points](#9-integration-points)
10. [File Structure](#10-file-structure)
11. [Implementation Plan](#11-implementation-plan)
12. [Code Examples](#12-code-examples)

---

## 1. Current State Analysis

### 1.1 Existing NeuroLink Capabilities

NeuroLink currently has foundational components that can support workflow orchestration:

#### Tool Execution System

- **MCPToolRegistry** (`src/lib/mcp/toolRegistry.ts`): Manages tool registration, execution, and lifecycle
- **Tool execution context**: Supports session management, user context, and execution metadata
- **HITL integration**: Human-in-the-loop confirmation for dangerous operations

#### Event System

- **TypedEventEmitter** (`src/lib/types/common.ts`): Typed event emission for tool and generation events
- **NeuroLinkEvents**: Comprehensive event types for tool, stream, and generation lifecycle

#### Provider System

- **ProviderFactory** (`src/lib/factories/providerFactory.ts`): Dynamic provider instantiation with registry pattern
- **Generate/Stream APIs**: Core AI generation with structured output support

#### Middleware System

- **MiddlewareFactory** (`src/lib/middleware/factory.ts`): Pluggable middleware for request/response transformation
- **Analytics and guardrails**: Built-in middleware for monitoring and safety

### 1.2 Gaps to Address

| Feature               | Current State       | Required for Workflows              |
| --------------------- | ------------------- | ----------------------------------- |
| Step orchestration    | None                | Graph-based execution engine        |
| Conditional branching | None                | Branch/condition evaluation         |
| Parallel execution    | Basic (p-limit)     | Coordinated parallel step execution |
| State persistence     | Session memory only | Full workflow state management      |
| Suspension/resumption | None                | Checkpoint and restore capability   |
| Visual graph          | None                | Step dependency DAG                 |

### 1.3 Existing NeuroLink HITL Features

> **Note:** NeuroLink already has Human-in-the-Loop (HITL) infrastructure that should be leveraged for workflow suspension/resumption:

| Component             | Location                           | Description                                             |
| --------------------- | ---------------------------------- | ------------------------------------------------------- |
| **HITLManager**       | `src/lib/hitl/hitlManager.ts`      | Central manager for human approval workflows            |
| **HITLConfirmation**  | `src/lib/hitl/hitlConfirmation.ts` | User confirmation prompts for dangerous tool operations |
| **HITLTypes**         | `src/lib/hitl/types.ts`            | Type definitions for HITL request/response patterns     |
| **Tool Confirmation** | `src/lib/mcp/toolRegistry.ts`      | Built-in tool execution confirmation hooks              |

The workflow suspension feature should integrate with the existing HITL system for consistent user interaction patterns.

---

## 2. Architecture Design

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     NeuroLink Workflow System                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │  Workflow       │    │  Execution      │    │   State     │ │
│  │  Builder API    │───▶│  Engine         │───▶│   Manager   │ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
│         │                       │                      │        │
│         │                       │                      │        │
│  ┌──────▼──────────────────────▼──────────────────────▼──────┐ │
│  │                    Step Registry                           │ │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │ │
│  │  │Step 1│─│Step 2│─│Step 3│ │Step 4│ │Step 5│ │Step N│   │ │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                  │
│  ┌───────────────────────────▼───────────────────────────────┐ │
│  │                   Event Stream                             │ │
│  │  step:start, step:complete, workflow:progress, etc.       │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│              Integration Layer (NeuroLink SDK)                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐ │
│  │  Generate   │ │   Stream    │ │ Tool System │ │ Providers│ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Design Principles

1. **Factory Pattern Consistency**: Follow NeuroLink's existing factory + registry pattern
2. **Type Safety**: Full TypeScript types with Zod schema validation
3. **Event-Driven**: Leverage existing event emitter for workflow progress
4. **Non-Blocking**: Async-first design with proper cancellation support
5. **Serializable State**: Enable persistence and resumption across process boundaries
6. **Provider Agnostic**: Work with any NeuroLink provider

---

## 3. Type System Design

### 3.1 Core Workflow Types

```typescript
// src/lib/types/workflowTypes.ts

import { z } from "zod";
import type { JsonValue, JsonObject, UnknownRecord } from "./common.js";

/**
 * Step execution status
 */
export type StepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "suspended";

/**
 * Workflow execution status
 */
export type WorkflowStatus =
  | "idle"
  | "running"
  | "paused"
  | "suspended"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * Step definition with input/output schemas
 */
export type StepDefinition<
  TInput = unknown,
  TOutput = unknown,
  TContext = WorkflowContext,
> = {
  /** Unique identifier for this step */
  id: string;
  /** Human-readable name */
  name: string;
  /** Step description */
  description?: string;
  /** Zod schema for input validation */
  inputSchema?: z.ZodSchema<TInput>;
  /** Zod schema for output validation */
  outputSchema?: z.ZodSchema<TOutput>;
  /** Step execution function */
  execute: (input: TInput, context: TContext) => Promise<StepResult<TOutput>>;
  /** Retry configuration */
  retry?: RetryConfig;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Whether this step can be suspended */
  suspendable?: boolean;
  /** Tags for categorization */
  tags?: string[];
};

/**
 * Step execution result
 */
export type StepResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: StepError;
  metadata?: StepMetadata;
  /** Request suspension (for HITL or external wait) */
  suspend?: SuspensionRequest;
};

/**
 * Step error information
 */
export type StepError = {
  code: string;
  message: string;
  details?: JsonObject;
  retryable?: boolean;
  cause?: Error;
};

/**
 * Step execution metadata
 */
export type StepMetadata = {
  startTime: number;
  endTime?: number;
  duration?: number;
  retryCount?: number;
  tokensUsed?: number;
  provider?: string;
  model?: string;
  [key: string]: JsonValue | undefined;
};

/**
 * Retry configuration for steps
 */
export type RetryConfig = {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
};

/**
 * Suspension request for pausing workflow
 */
export type SuspensionRequest = {
  /** Reason for suspension */
  reason: string;
  /** Type of suspension */
  type: "hitl" | "external" | "timer" | "manual";
  /** Data needed to resume */
  resumeData?: JsonObject;
  /** Expiration timestamp */
  expiresAt?: number;
  /** Callback ID for external systems */
  callbackId?: string;
};

/**
 * Workflow context passed to steps
 */
export type WorkflowContext<TGlobalState = UnknownRecord> = {
  /** Workflow instance ID */
  workflowId: string;
  /** Workflow definition name */
  workflowName: string;
  /** Current execution run ID */
  runId: string;
  /** Global state accessible to all steps */
  state: TGlobalState;
  /** Step outputs from previous steps */
  stepOutputs: Map<string, unknown>;
  /** Get output from a specific step */
  getStepOutput: <T>(stepId: string) => T | undefined;
  /** Update global state */
  updateState: (updates: Partial<TGlobalState>) => void;
  /** Request workflow suspension */
  suspend: (request: SuspensionRequest) => void;
  /** NeuroLink instance for AI operations */
  neurolink: import("../neurolink.js").NeuroLink;
  /** Logger instance */
  logger: import("./utilities.js").Logger;
  /** Execution metadata */
  metadata: WorkflowMetadata;
};

/**
 * Workflow metadata
 */
export type WorkflowMetadata = {
  startTime: number;
  currentStepId?: string;
  completedSteps: string[];
  failedSteps: string[];
  skippedSteps: string[];
  suspendedAt?: number;
  resumedAt?: number;
  parentWorkflowId?: string;
  triggeredBy?: string;
  tags?: string[];
};

/**
 * Workflow definition
 */
export type WorkflowDefinition<
  TInput = unknown,
  TOutput = unknown,
  TState = UnknownRecord,
> = {
  /** Unique workflow identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Workflow description */
  description?: string;
  /** Version string */
  version?: string;
  /** Input schema for workflow */
  inputSchema?: z.ZodSchema<TInput>;
  /** Output schema for workflow */
  outputSchema?: z.ZodSchema<TOutput>;
  /** Initial state factory */
  initialState?: () => TState;
  /** Step definitions */
  steps: Map<string, StepDefinition>;
  /** Execution graph (step dependencies) */
  graph: WorkflowGraph;
  /** Global timeout in milliseconds */
  timeout?: number;
  /** Tags for categorization */
  tags?: string[];
};

/**
 * Workflow execution graph
 */
export type WorkflowGraph = {
  /** Entry point step ID */
  entryPoint: string;
  /** Step transitions */
  edges: WorkflowEdge[];
  /** Parallel execution groups */
  parallelGroups?: ParallelGroup[];
  /** Conditional branches */
  branches?: ConditionalBranch[];
  /** Loop definitions */
  loops?: LoopDefinition[];
};

/**
 * Graph edge representing step transition
 */
export type WorkflowEdge = {
  from: string;
  to: string;
  condition?: EdgeCondition;
};

/**
 * Edge condition for conditional transitions
 */
export type EdgeCondition = {
  type: "expression" | "function" | "always";
  expression?: string;
  evaluate?: (context: WorkflowContext) => boolean | Promise<boolean>;
};

/**
 * Parallel execution group
 */
export type ParallelGroup = {
  id: string;
  steps: string[];
  /** Wait for all (AND) or any (OR) */
  waitFor: "all" | "any";
  /** Continue on failure */
  continueOnError?: boolean;
};

/**
 * Conditional branch definition
 */
export type ConditionalBranch = {
  id: string;
  /** Step ID where branch starts */
  fromStep: string;
  /** Branch conditions and targets */
  branches: Array<{
    condition: EdgeCondition;
    targetStep: string;
    label?: string;
  }>;
  /** Default branch if no conditions match */
  defaultTarget?: string;
};

/**
 * Loop definition for iteration
 */
export type LoopDefinition = {
  id: string;
  type: "forEach" | "doWhile" | "doUntil" | "repeat";
  /** Steps to execute in loop */
  steps: string[];
  /** For forEach: expression to get items */
  itemsExpression?: string;
  /** For forEach: variable name for current item */
  itemVariable?: string;
  /** For doWhile/doUntil: condition expression */
  condition?: EdgeCondition;
  /** For repeat: number of iterations */
  iterations?: number;
  /** Maximum iterations (safety limit) */
  maxIterations?: number;
};

/**
 * Workflow execution options
 */
export type WorkflowExecutionOptions = {
  /** Run ID (auto-generated if not provided) */
  runId?: string;
  /** Initial state overrides */
  initialState?: UnknownRecord;
  /** Timeout override in milliseconds */
  timeout?: number;
  /** Enable step-level event streaming */
  enableEvents?: boolean;
  /** Resume from checkpoint */
  checkpoint?: WorkflowCheckpoint;
  /** Parent workflow ID (for nested workflows) */
  parentWorkflowId?: string;
  /** Metadata to attach to execution */
  metadata?: UnknownRecord;
};

/**
 * Workflow execution result
 */
export type WorkflowExecutionResult<TOutput = unknown> = {
  success: boolean;
  status: WorkflowStatus;
  output?: TOutput;
  error?: WorkflowError;
  /** Execution statistics */
  stats: WorkflowStats;
  /** Checkpoint for resumption (if suspended) */
  checkpoint?: WorkflowCheckpoint;
  /** Step execution details */
  stepResults: Map<string, StepExecutionRecord>;
};

/**
 * Workflow error
 */
export type WorkflowError = {
  code: string;
  message: string;
  stepId?: string;
  cause?: Error;
  details?: JsonObject;
};

/**
 * Workflow execution statistics
 */
export type WorkflowStats = {
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  skippedSteps: number;
  startTime: number;
  endTime?: number;
  duration?: number;
  totalTokensUsed?: number;
  retryCount: number;
};

/**
 * Step execution record
 */
export type StepExecutionRecord = {
  stepId: string;
  status: StepStatus;
  input?: unknown;
  output?: unknown;
  error?: StepError;
  metadata: StepMetadata;
  attempts: number;
};

/**
 * Workflow checkpoint for persistence
 */
export type WorkflowCheckpoint = {
  /** Checkpoint ID */
  id: string;
  /** Workflow definition ID */
  workflowId: string;
  /** Execution run ID */
  runId: string;
  /** Checkpoint timestamp */
  timestamp: number;
  /** Workflow status at checkpoint */
  status: WorkflowStatus;
  /** Current global state */
  state: UnknownRecord;
  /** Completed step outputs */
  stepOutputs: Record<string, unknown>;
  /** Step execution records */
  stepRecords: Record<string, StepExecutionRecord>;
  /** Next steps to execute */
  pendingSteps: string[];
  /** Suspension info if suspended */
  suspension?: SuspensionRequest;
  /** Version for compatibility */
  version: string;
};
```

### 3.2 Workflow Event Types

```typescript
// src/lib/types/workflowTypes.ts (continued)

/**
 * Workflow event types for streaming
 */
export type WorkflowEventType =
  | "workflow:start"
  | "workflow:complete"
  | "workflow:failed"
  | "workflow:suspended"
  | "workflow:resumed"
  | "workflow:cancelled"
  | "step:start"
  | "step:complete"
  | "step:failed"
  | "step:skipped"
  | "step:retry"
  | "step:suspended"
  | "branch:evaluated"
  | "parallel:start"
  | "parallel:complete"
  | "loop:iteration"
  | "loop:complete"
  | "checkpoint:created"
  | "checkpoint:restored";

/**
 * Base workflow event
 */
export type WorkflowEventBase = {
  type: WorkflowEventType;
  workflowId: string;
  runId: string;
  timestamp: number;
};

/**
 * Workflow start event
 */
export type WorkflowStartEvent = WorkflowEventBase & {
  type: "workflow:start";
  input: unknown;
  metadata: WorkflowMetadata;
};

/**
 * Workflow complete event
 */
export type WorkflowCompleteEvent = WorkflowEventBase & {
  type: "workflow:complete";
  output: unknown;
  stats: WorkflowStats;
};

/**
 * Step start event
 */
export type StepStartEvent = WorkflowEventBase & {
  type: "step:start";
  stepId: string;
  stepName: string;
  input: unknown;
};

/**
 * Step complete event
 */
export type StepCompleteEvent = WorkflowEventBase & {
  type: "step:complete";
  stepId: string;
  stepName: string;
  output: unknown;
  duration: number;
};

/**
 * Step failed event
 */
export type StepFailedEvent = WorkflowEventBase & {
  type: "step:failed";
  stepId: string;
  stepName: string;
  error: StepError;
  willRetry: boolean;
};

/**
 * Union of all workflow events
 */
export type WorkflowEvent =
  | WorkflowStartEvent
  | WorkflowCompleteEvent
  | StepStartEvent
  | StepCompleteEvent
  | StepFailedEvent
  // ... additional event types
  | (WorkflowEventBase & { data?: unknown });
```

---

## 4. Core Components

### 4.1 Step Class

```typescript
// src/lib/workflow/step.ts

import { z } from "zod";
import type {
  StepDefinition,
  StepResult,
  StepError,
  StepMetadata,
  WorkflowContext,
  RetryConfig,
} from "../types/workflowTypes.js";
import { logger } from "../utils/logger.js";

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Step - Represents a single unit of work in a workflow
 *
 * Features:
 * - Input/output schema validation with Zod
 * - Configurable retry with exponential backoff
 * - Timeout support
 * - Suspension capability for HITL
 */
export class Step<TInput = unknown, TOutput = unknown> {
  private definition: StepDefinition<TInput, TOutput>;

  constructor(definition: StepDefinition<TInput, TOutput>) {
    this.definition = {
      ...definition,
      retry: definition.retry ?? DEFAULT_RETRY_CONFIG,
      timeout: definition.timeout ?? 30000,
      suspendable: definition.suspendable ?? false,
    };
  }

  /**
   * Get step ID
   */
  get id(): string {
    return this.definition.id;
  }

  /**
   * Get step name
   */
  get name(): string {
    return this.definition.name;
  }

  /**
   * Get step definition
   */
  getDefinition(): StepDefinition<TInput, TOutput> {
    return { ...this.definition };
  }

  /**
   * Validate input against schema
   */
  validateInput(input: unknown): {
    valid: boolean;
    error?: string;
    data?: TInput;
  } {
    if (!this.definition.inputSchema) {
      return { valid: true, data: input as TInput };
    }

    const result = this.definition.inputSchema.safeParse(input);
    if (result.success) {
      return { valid: true, data: result.data };
    }

    return {
      valid: false,
      error: result.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", "),
    };
  }

  /**
   * Validate output against schema
   */
  validateOutput(output: unknown): {
    valid: boolean;
    error?: string;
    data?: TOutput;
  } {
    if (!this.definition.outputSchema) {
      return { valid: true, data: output as TOutput };
    }

    const result = this.definition.outputSchema.safeParse(output);
    if (result.success) {
      return { valid: true, data: result.data };
    }

    return {
      valid: false,
      error: result.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", "),
    };
  }

  /**
   * Execute the step with retry logic
   */
  async execute(
    input: TInput,
    context: WorkflowContext,
  ): Promise<StepResult<TOutput>> {
    const startTime = Date.now();
    const retryConfig = this.definition.retry!;
    let lastError: StepError | undefined;
    let attempt = 0;

    // Validate input
    const inputValidation = this.validateInput(input);
    if (!inputValidation.valid) {
      return {
        success: false,
        error: {
          code: "INPUT_VALIDATION_FAILED",
          message: `Input validation failed: ${inputValidation.error}`,
          retryable: false,
        },
        metadata: this.createMetadata(startTime, attempt),
      };
    }

    while (attempt < retryConfig.maxAttempts) {
      attempt++;

      try {
        // Execute with timeout
        const result = await this.executeWithTimeout(
          inputValidation.data!,
          context,
        );

        // Validate output if successful
        if (result.success && result.data !== undefined) {
          const outputValidation = this.validateOutput(result.data);
          if (!outputValidation.valid) {
            return {
              success: false,
              error: {
                code: "OUTPUT_VALIDATION_FAILED",
                message: `Output validation failed: ${outputValidation.error}`,
                retryable: false,
              },
              metadata: this.createMetadata(startTime, attempt),
            };
          }
        }

        return {
          ...result,
          metadata: {
            ...result.metadata,
            ...this.createMetadata(startTime, attempt),
          },
        };
      } catch (error) {
        lastError = this.createStepError(error);

        // Check if retryable
        if (!this.isRetryable(lastError, retryConfig)) {
          break;
        }

        // Check if more attempts available
        if (attempt >= retryConfig.maxAttempts) {
          break;
        }

        // Calculate backoff delay
        const delay = Math.min(
          retryConfig.initialDelayMs *
            Math.pow(retryConfig.backoffMultiplier, attempt - 1),
          retryConfig.maxDelayMs,
        );

        logger.warn(
          `Step ${this.id} failed, retrying in ${delay}ms (attempt ${attempt}/${retryConfig.maxAttempts})`,
          {
            error: lastError.message,
          },
        );

        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError ?? {
        code: "UNKNOWN_ERROR",
        message: "Step execution failed",
        retryable: false,
      },
      metadata: this.createMetadata(startTime, attempt),
    };
  }

  /**
   * Execute with timeout wrapper
   */
  private async executeWithTimeout(
    input: TInput,
    context: WorkflowContext,
  ): Promise<StepResult<TOutput>> {
    const timeout = this.definition.timeout!;

    return new Promise<StepResult<TOutput>>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Step ${this.id} timed out after ${timeout}ms`));
      }, timeout);

      this.definition
        .execute(input, context)
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Create step error from unknown error
   */
  private createStepError(error: unknown): StepError {
    if (error instanceof Error) {
      return {
        code: (error as Error & { code?: string }).code ?? "EXECUTION_ERROR",
        message: error.message,
        retryable: true,
        cause: error,
      };
    }

    return {
      code: "EXECUTION_ERROR",
      message: String(error),
      retryable: true,
    };
  }

  /**
   * Check if error is retryable
   */
  private isRetryable(error: StepError, config: RetryConfig): boolean {
    if (!error.retryable) {
      return false;
    }

    if (config.retryableErrors && config.retryableErrors.length > 0) {
      return config.retryableErrors.includes(error.code);
    }

    return true;
  }

  /**
   * Create step metadata
   */
  private createMetadata(startTime: number, retryCount: number): StepMetadata {
    const endTime = Date.now();
    return {
      startTime,
      endTime,
      duration: endTime - startTime,
      retryCount,
    };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Factory function for creating steps
 */
export function createStep<TInput, TOutput>(
  definition: StepDefinition<TInput, TOutput>,
): Step<TInput, TOutput> {
  return new Step(definition);
}
```

### 4.2 Workflow Registry

```typescript
// src/lib/workflow/workflowRegistry.ts

import type { WorkflowDefinition } from "../types/workflowTypes.js";
import { logger } from "../utils/logger.js";

/**
 * WorkflowRegistry - Central registry for workflow definitions
 *
 * Follows NeuroLink's factory + registry pattern used by ProviderFactory
 */
export class WorkflowRegistry {
  private static workflows: Map<string, WorkflowDefinition> = new Map();
  private static initialized = false;

  /**
   * Register a workflow definition
   */
  static register<TInput, TOutput, TState>(
    workflow: WorkflowDefinition<TInput, TOutput, TState>,
  ): void {
    if (this.workflows.has(workflow.id)) {
      logger.warn(`Workflow ${workflow.id} already registered, overwriting`);
    }

    this.workflows.set(workflow.id, workflow as WorkflowDefinition);
    logger.debug(`Registered workflow: ${workflow.id} (${workflow.name})`);
  }

  /**
   * Get a workflow definition by ID
   */
  static get<TInput = unknown, TOutput = unknown, TState = unknown>(
    workflowId: string,
  ): WorkflowDefinition<TInput, TOutput, TState> | undefined {
    return this.workflows.get(workflowId) as
      | WorkflowDefinition<TInput, TOutput, TState>
      | undefined;
  }

  /**
   * Check if workflow exists
   */
  static has(workflowId: string): boolean {
    return this.workflows.has(workflowId);
  }

  /**
   * List all registered workflows
   */
  static list(): Array<{ id: string; name: string; version?: string }> {
    return Array.from(this.workflows.values()).map((w) => ({
      id: w.id,
      name: w.name,
      version: w.version,
    }));
  }

  /**
   * Unregister a workflow
   */
  static unregister(workflowId: string): boolean {
    const removed = this.workflows.delete(workflowId);
    if (removed) {
      logger.debug(`Unregistered workflow: ${workflowId}`);
    }
    return removed;
  }

  /**
   * Clear all registrations (for testing)
   */
  static clear(): void {
    this.workflows.clear();
    this.initialized = false;
  }

  /**
   * Get workflow count
   */
  static count(): number {
    return this.workflows.size;
  }
}
```

---

## 5. Fluent Builder API

### 5.1 WorkflowBuilder Class

````typescript
// src/lib/workflow/workflowBuilder.ts

import { z } from "zod";
import { randomUUID } from "crypto";
import type {
  WorkflowDefinition,
  StepDefinition,
  WorkflowGraph,
  WorkflowEdge,
  ParallelGroup,
  ConditionalBranch,
  LoopDefinition,
  EdgeCondition,
  WorkflowContext,
  StepResult,
} from "../types/workflowTypes.js";
import { Step, createStep } from "./step.js";
import { WorkflowRegistry } from "./workflowRegistry.js";

/**
 * WorkflowBuilder - Fluent API for constructing workflows
 *
 * Provides Mastra-style builder methods:
 * - .then() for sequential execution
 * - .parallel() for concurrent execution
 * - .branch() for conditional paths
 * - .forEach() for iteration over collections
 * - .doWhile() / .doUntil() for conditional loops
 *
 * @example
 * ```typescript
 * const workflow = new WorkflowBuilder("data-pipeline")
 *   .name("Data Processing Pipeline")
 *   .input(z.object({ url: z.string() }))
 *   .output(z.object({ summary: z.string() }))
 *   .step("fetch", {
 *     execute: async (input, ctx) => {
 *       const data = await fetch(input.url);
 *       return { success: true, data: await data.json() };
 *     }
 *   })
 *   .then("process", {
 *     execute: async (input, ctx) => {
 *       const fetchOutput = ctx.getStepOutput<{ data: any }>("fetch");
 *       // Process data...
 *       return { success: true, data: processed };
 *     }
 *   })
 *   .parallel([
 *     { id: "analyze", execute: analyzeData },
 *     { id: "validate", execute: validateData }
 *   ])
 *   .then("summarize", {
 *     execute: async (input, ctx) => {
 *       const result = await ctx.neurolink.generate({
 *         input: { text: "Summarize: " + JSON.stringify(input) },
 *         provider: "openai"
 *       });
 *       return { success: true, data: { summary: result.content } };
 *     }
 *   })
 *   .build();
 * ```
 */
export class WorkflowBuilder<
  TInput = unknown,
  TOutput = unknown,
  TState = Record<string, unknown>,
> {
  private workflowId: string;
  private workflowName: string;
  private description?: string;
  private version?: string;
  private inputSchema?: z.ZodSchema<TInput>;
  private outputSchema?: z.ZodSchema<TOutput>;
  private initialStateFactory?: () => TState;
  private steps: Map<string, StepDefinition> = new Map();
  private edges: WorkflowEdge[] = [];
  private parallelGroups: ParallelGroup[] = [];
  private branches: ConditionalBranch[] = [];
  private loops: LoopDefinition[] = [];
  private entryPoint?: string;
  private currentStepId?: string;
  private timeout?: number;
  private tags: string[] = [];

  constructor(workflowId: string) {
    this.workflowId = workflowId;
    this.workflowName = workflowId;
  }

  /**
   * Set workflow name
   */
  name(name: string): this {
    this.workflowName = name;
    return this;
  }

  /**
   * Set workflow description
   */
  describe(description: string): this {
    this.description = description;
    return this;
  }

  /**
   * Set workflow version
   */
  setVersion(version: string): this {
    this.version = version;
    return this;
  }

  /**
   * Set input schema
   */
  input<T>(schema: z.ZodSchema<T>): WorkflowBuilder<T, TOutput, TState> {
    this.inputSchema = schema as unknown as z.ZodSchema<TInput>;
    return this as unknown as WorkflowBuilder<T, TOutput, TState>;
  }

  /**
   * Set output schema
   */
  output<T>(schema: z.ZodSchema<T>): WorkflowBuilder<TInput, T, TState> {
    this.outputSchema = schema as unknown as z.ZodSchema<TOutput>;
    return this as unknown as WorkflowBuilder<TInput, T, TState>;
  }

  /**
   * Set initial state factory
   */
  state<T extends Record<string, unknown>>(
    factory: () => T,
  ): WorkflowBuilder<TInput, TOutput, T> {
    this.initialStateFactory = factory as unknown as () => TState;
    return this as unknown as WorkflowBuilder<TInput, TOutput, T>;
  }

  /**
   * Set global timeout
   */
  setTimeout(timeoutMs: number): this {
    this.timeout = timeoutMs;
    return this;
  }

  /**
   * Add tags for categorization
   */
  tag(...tags: string[]): this {
    this.tags.push(...tags);
    return this;
  }

  /**
   * Add a step (entry point if first step)
   */
  step<TStepInput = TInput, TStepOutput = unknown>(
    stepId: string,
    definition: Omit<StepDefinition<TStepInput, TStepOutput>, "id" | "name"> & {
      name?: string;
    },
  ): this {
    const stepDef: StepDefinition<TStepInput, TStepOutput> = {
      ...definition,
      id: stepId,
      name: definition.name ?? stepId,
    };

    this.steps.set(stepId, stepDef as StepDefinition);

    // First step becomes entry point
    if (!this.entryPoint) {
      this.entryPoint = stepId;
    }

    // Connect to previous step if exists
    if (this.currentStepId && this.currentStepId !== stepId) {
      this.edges.push({
        from: this.currentStepId,
        to: stepId,
        condition: { type: "always" },
      });
    }

    this.currentStepId = stepId;
    return this;
  }

  /**
   * Add a sequential step after current step
   * Alias for step() to improve readability
   */
  then<TStepInput = unknown, TStepOutput = unknown>(
    stepId: string,
    definition: Omit<StepDefinition<TStepInput, TStepOutput>, "id" | "name"> & {
      name?: string;
    },
  ): this {
    return this.step(stepId, definition);
  }

  /**
   * Add parallel execution group
   */
  parallel(
    steps: Array<
      Omit<StepDefinition, "id" | "name"> & { id: string; name?: string }
    >,
    options: {
      waitFor?: "all" | "any";
      continueOnError?: boolean;
    } = {},
  ): this {
    const groupId = `parallel-${randomUUID().slice(0, 8)}`;
    const stepIds: string[] = [];

    // Register all parallel steps
    for (const stepDef of steps) {
      const fullDef: StepDefinition = {
        ...stepDef,
        name: stepDef.name ?? stepDef.id,
      };
      this.steps.set(stepDef.id, fullDef);
      stepIds.push(stepDef.id);

      // Connect from current step to each parallel step
      if (this.currentStepId) {
        this.edges.push({
          from: this.currentStepId,
          to: stepDef.id,
          condition: { type: "always" },
        });
      }
    }

    // Create parallel group
    this.parallelGroups.push({
      id: groupId,
      steps: stepIds,
      waitFor: options.waitFor ?? "all",
      continueOnError: options.continueOnError ?? false,
    });

    // Create virtual merge point
    const mergePointId = `merge-${groupId}`;
    this.steps.set(mergePointId, {
      id: mergePointId,
      name: `Merge ${groupId}`,
      execute: async () => ({ success: true, data: null }),
    });

    // Connect all parallel steps to merge point
    for (const stepId of stepIds) {
      this.edges.push({
        from: stepId,
        to: mergePointId,
        condition: { type: "always" },
      });
    }

    this.currentStepId = mergePointId;
    return this;
  }

  /**
   * Add conditional branching
   */
  branch(
    branches: Array<{
      condition: (
        context: WorkflowContext<TState>,
      ) => boolean | Promise<boolean>;
      stepId: string;
      step: Omit<StepDefinition, "id" | "name"> & { name?: string };
      label?: string;
    }>,
    defaultStep?: {
      stepId: string;
      step: Omit<StepDefinition, "id" | "name"> & { name?: string };
    },
  ): this {
    if (!this.currentStepId) {
      throw new Error("Cannot add branch without a preceding step");
    }

    const branchId = `branch-${randomUUID().slice(0, 8)}`;
    const branchDef: ConditionalBranch = {
      id: branchId,
      fromStep: this.currentStepId,
      branches: [],
    };

    // Register branch steps and create branch definitions
    for (const branch of branches) {
      const fullDef: StepDefinition = {
        ...branch.step,
        id: branch.stepId,
        name: branch.step.name ?? branch.stepId,
      };
      this.steps.set(branch.stepId, fullDef);

      branchDef.branches.push({
        condition: {
          type: "function",
          evaluate: branch.condition,
        },
        targetStep: branch.stepId,
        label: branch.label,
      });
    }

    // Register default step if provided
    if (defaultStep) {
      const fullDef: StepDefinition = {
        ...defaultStep.step,
        id: defaultStep.stepId,
        name: defaultStep.step.name ?? defaultStep.stepId,
      };
      this.steps.set(defaultStep.stepId, fullDef);
      branchDef.defaultTarget = defaultStep.stepId;
    }

    this.branches.push(branchDef);

    // Create merge point for all branches
    const mergePointId = `merge-${branchId}`;
    this.steps.set(mergePointId, {
      id: mergePointId,
      name: `Merge ${branchId}`,
      execute: async () => ({ success: true, data: null }),
    });

    // Connect all branch targets to merge point
    for (const branch of branches) {
      this.edges.push({
        from: branch.stepId,
        to: mergePointId,
        condition: { type: "always" },
      });
    }
    if (defaultStep) {
      this.edges.push({
        from: defaultStep.stepId,
        to: mergePointId,
        condition: { type: "always" },
      });
    }

    this.currentStepId = mergePointId;
    return this;
  }

  /**
   * Add forEach loop over collection
   */
  forEach<TItem>(
    options: {
      items: (context: WorkflowContext<TState>) => TItem[] | Promise<TItem[]>;
      itemVariable?: string;
      maxIterations?: number;
    },
    steps: Array<
      Omit<StepDefinition<TItem, unknown>, "id" | "name"> & {
        id: string;
        name?: string;
      }
    >,
  ): this {
    const loopId = `foreach-${randomUUID().slice(0, 8)}`;
    const stepIds: string[] = [];

    // Register loop steps
    for (const stepDef of steps) {
      const fullDef: StepDefinition = {
        ...stepDef,
        name: stepDef.name ?? stepDef.id,
      };
      this.steps.set(stepDef.id, fullDef);
      stepIds.push(stepDef.id);
    }

    // Create loop definition
    this.loops.push({
      id: loopId,
      type: "forEach",
      steps: stepIds,
      itemVariable: options.itemVariable ?? "item",
      maxIterations: options.maxIterations ?? 1000,
    });

    // Store items expression as metadata (handled by execution engine)
    // Connect from current step
    if (this.currentStepId && stepIds.length > 0) {
      this.edges.push({
        from: this.currentStepId,
        to: stepIds[0],
        condition: { type: "always" },
      });
    }

    // Connect steps sequentially within loop
    for (let i = 0; i < stepIds.length - 1; i++) {
      this.edges.push({
        from: stepIds[i],
        to: stepIds[i + 1],
        condition: { type: "always" },
      });
    }

    // Create loop end point
    const loopEndId = `end-${loopId}`;
    this.steps.set(loopEndId, {
      id: loopEndId,
      name: `End ${loopId}`,
      execute: async () => ({ success: true, data: null }),
    });

    if (stepIds.length > 0) {
      this.edges.push({
        from: stepIds[stepIds.length - 1],
        to: loopEndId,
        condition: { type: "always" },
      });
    }

    this.currentStepId = loopEndId;
    return this;
  }

  /**
   * Add doWhile loop (execute while condition is true)
   */
  doWhile(
    condition: (context: WorkflowContext<TState>) => boolean | Promise<boolean>,
    steps: Array<
      Omit<StepDefinition, "id" | "name"> & { id: string; name?: string }
    >,
    options: { maxIterations?: number } = {},
  ): this {
    const loopId = `dowhile-${randomUUID().slice(0, 8)}`;
    const stepIds: string[] = [];

    // Register loop steps
    for (const stepDef of steps) {
      const fullDef: StepDefinition = {
        ...stepDef,
        name: stepDef.name ?? stepDef.id,
      };
      this.steps.set(stepDef.id, fullDef);
      stepIds.push(stepDef.id);
    }

    // Create loop definition
    this.loops.push({
      id: loopId,
      type: "doWhile",
      steps: stepIds,
      condition: {
        type: "function",
        evaluate: condition,
      },
      maxIterations: options.maxIterations ?? 100,
    });

    // Connect to loop entry
    if (this.currentStepId && stepIds.length > 0) {
      this.edges.push({
        from: this.currentStepId,
        to: stepIds[0],
        condition: { type: "always" },
      });
    }

    // Connect steps sequentially within loop
    for (let i = 0; i < stepIds.length - 1; i++) {
      this.edges.push({
        from: stepIds[i],
        to: stepIds[i + 1],
        condition: { type: "always" },
      });
    }

    // Create loop end point
    const loopEndId = `end-${loopId}`;
    this.steps.set(loopEndId, {
      id: loopEndId,
      name: `End ${loopId}`,
      execute: async () => ({ success: true, data: null }),
    });

    this.currentStepId = loopEndId;
    return this;
  }

  /**
   * Add doUntil loop (execute until condition becomes true)
   */
  doUntil(
    condition: (context: WorkflowContext<TState>) => boolean | Promise<boolean>,
    steps: Array<
      Omit<StepDefinition, "id" | "name"> & { id: string; name?: string }
    >,
    options: { maxIterations?: number } = {},
  ): this {
    // doUntil is doWhile with inverted condition
    return this.doWhile(async (ctx) => !(await condition(ctx)), steps, options);
  }

  /**
   * Build the workflow definition
   */
  build(): WorkflowDefinition<TInput, TOutput, TState> {
    if (!this.entryPoint) {
      throw new Error("Workflow must have at least one step");
    }

    const graph: WorkflowGraph = {
      entryPoint: this.entryPoint,
      edges: this.edges,
      parallelGroups:
        this.parallelGroups.length > 0 ? this.parallelGroups : undefined,
      branches: this.branches.length > 0 ? this.branches : undefined,
      loops: this.loops.length > 0 ? this.loops : undefined,
    };

    const workflow: WorkflowDefinition<TInput, TOutput, TState> = {
      id: this.workflowId,
      name: this.workflowName,
      description: this.description,
      version: this.version,
      inputSchema: this.inputSchema,
      outputSchema: this.outputSchema,
      initialState: this.initialStateFactory,
      steps: this.steps,
      graph,
      timeout: this.timeout,
      tags: this.tags.length > 0 ? this.tags : undefined,
    };

    return workflow;
  }

  /**
   * Build and register the workflow
   */
  register(): WorkflowDefinition<TInput, TOutput, TState> {
    const workflow = this.build();
    WorkflowRegistry.register(workflow);
    return workflow;
  }
}

/**
 * Factory function for creating workflow builders
 */
export function createWorkflow(workflowId: string): WorkflowBuilder {
  return new WorkflowBuilder(workflowId);
}
````

---

## 6. Execution Engine

### 6.1 WorkflowExecutor Class

```typescript
// src/lib/workflow/workflowExecutor.ts

import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import pLimit from "p-limit";
import type {
  WorkflowDefinition,
  WorkflowExecutionOptions,
  WorkflowExecutionResult,
  WorkflowContext,
  WorkflowStatus,
  WorkflowCheckpoint,
  WorkflowStats,
  StepExecutionRecord,
  StepStatus,
  SuspensionRequest,
  WorkflowEvent,
  WorkflowGraph,
  ParallelGroup,
  ConditionalBranch,
  LoopDefinition,
} from "../types/workflowTypes.js";
import type { UnknownRecord } from "../types/common.js";
import { Step } from "./step.js";
import { WorkflowRegistry } from "./workflowRegistry.js";
import { WorkflowStateManager } from "./workflowStateManager.js";
import type { NeuroLink } from "../neurolink.js";
import { logger } from "../utils/logger.js";

/**
 * WorkflowExecutor - Executes workflow definitions with full lifecycle management
 *
 * Features:
 * - Graph-based step execution
 * - Parallel execution with configurable concurrency
 * - Conditional branching evaluation
 * - Loop execution (forEach, doWhile, doUntil)
 * - Suspension and resumption
 * - Checkpoint creation for persistence
 * - Real-time event streaming
 */
export class WorkflowExecutor extends EventEmitter {
  private neurolink: NeuroLink;
  private stateManager: WorkflowStateManager;
  private defaultConcurrency: number;
  private runningWorkflows: Map<string, AbortController> = new Map();

  constructor(
    neurolink: NeuroLink,
    options: {
      stateManager?: WorkflowStateManager;
      defaultConcurrency?: number;
    } = {},
  ) {
    super();
    this.neurolink = neurolink;
    this.stateManager = options.stateManager ?? new WorkflowStateManager();
    this.defaultConcurrency = options.defaultConcurrency ?? 5;
  }

  /**
   * Execute a workflow by ID
   */
  async execute<TInput, TOutput>(
    workflowId: string,
    input: TInput,
    options: WorkflowExecutionOptions = {},
  ): Promise<WorkflowExecutionResult<TOutput>> {
    const workflow = WorkflowRegistry.get<TInput, TOutput>(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    return this.executeWorkflow(workflow, input, options);
  }

  /**
   * Execute a workflow definition directly
   */
  async executeWorkflow<TInput, TOutput, TState extends UnknownRecord>(
    workflow: WorkflowDefinition<TInput, TOutput, TState>,
    input: TInput,
    options: WorkflowExecutionOptions = {},
  ): Promise<WorkflowExecutionResult<TOutput>> {
    const runId = options.runId ?? randomUUID();
    const startTime = Date.now();
    const abortController = new AbortController();

    // Register running workflow
    this.runningWorkflows.set(runId, abortController);

    // Initialize context
    const context = this.createContext(workflow, runId, input, options);

    // Initialize stats
    const stats: WorkflowStats = {
      totalSteps: workflow.steps.size,
      completedSteps: 0,
      failedSteps: 0,
      skippedSteps: 0,
      startTime,
      retryCount: 0,
    };

    // Step execution records
    const stepResults = new Map<string, StepExecutionRecord>();

    // Emit workflow start event
    this.emitEvent({
      type: "workflow:start",
      workflowId: workflow.id,
      runId,
      timestamp: Date.now(),
      input,
      metadata: context.metadata,
    });

    try {
      // Validate input
      if (workflow.inputSchema) {
        const validation = workflow.inputSchema.safeParse(input);
        if (!validation.success) {
          throw new Error(
            `Input validation failed: ${validation.error.errors.map((e) => e.message).join(", ")}`,
          );
        }
      }

      // Resume from checkpoint if provided
      if (options.checkpoint) {
        await this.restoreFromCheckpoint(context, options.checkpoint);
      }

      // Execute workflow graph
      const result = await this.executeGraph(
        workflow,
        context,
        stats,
        stepResults,
        abortController.signal,
      );

      // Calculate final stats
      stats.endTime = Date.now();
      stats.duration = stats.endTime - startTime;

      // Emit completion event
      this.emitEvent({
        type: "workflow:complete",
        workflowId: workflow.id,
        runId,
        timestamp: Date.now(),
        output: result,
        stats,
      });

      return {
        success: true,
        status: "completed",
        output: result as TOutput,
        stats,
        stepResults,
      };
    } catch (error) {
      stats.endTime = Date.now();
      stats.duration = stats.endTime - startTime;

      // Check for suspension
      if (error instanceof SuspensionError) {
        const checkpoint = await this.createCheckpoint(
          workflow,
          runId,
          context,
          stepResults,
          error.suspension,
        );

        this.emitEvent({
          type: "workflow:suspended",
          workflowId: workflow.id,
          runId,
          timestamp: Date.now(),
          data: { suspension: error.suspension },
        });

        return {
          success: false,
          status: "suspended",
          stats,
          checkpoint,
          stepResults,
        };
      }

      // Handle error
      const workflowError = {
        code: "WORKFLOW_EXECUTION_ERROR",
        message: error instanceof Error ? error.message : String(error),
        cause: error instanceof Error ? error : undefined,
      };

      this.emitEvent({
        type: "workflow:failed",
        workflowId: workflow.id,
        runId,
        timestamp: Date.now(),
        data: { error: workflowError },
      });

      return {
        success: false,
        status: "failed",
        error: workflowError,
        stats,
        stepResults,
      };
    } finally {
      // Cleanup
      this.runningWorkflows.delete(runId);
    }
  }

  /**
   * Cancel a running workflow
   */
  cancel(runId: string): boolean {
    const controller = this.runningWorkflows.get(runId);
    if (controller) {
      controller.abort();
      this.runningWorkflows.delete(runId);
      return true;
    }
    return false;
  }

  /**
   * Resume a suspended workflow
   */
  async resume<TOutput>(
    checkpoint: WorkflowCheckpoint,
    resumeData?: UnknownRecord,
  ): Promise<WorkflowExecutionResult<TOutput>> {
    const workflow = WorkflowRegistry.get(checkpoint.workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${checkpoint.workflowId}`);
    }

    // Merge resume data into checkpoint state
    const mergedCheckpoint: WorkflowCheckpoint = {
      ...checkpoint,
      state: { ...checkpoint.state, ...resumeData },
      suspension: undefined,
    };

    return this.execute(checkpoint.workflowId, checkpoint.state, {
      runId: checkpoint.runId,
      checkpoint: mergedCheckpoint,
    });
  }

  /**
   * Create workflow context
   */
  private createContext<TInput, TOutput, TState extends UnknownRecord>(
    workflow: WorkflowDefinition<TInput, TOutput, TState>,
    runId: string,
    input: TInput,
    options: WorkflowExecutionOptions,
  ): WorkflowContext<TState> {
    const initialState = workflow.initialState?.() ?? ({} as TState);
    const state = { ...initialState, ...options.initialState } as TState;
    const stepOutputs = new Map<string, unknown>();
    let suspensionRequest: SuspensionRequest | undefined;

    return {
      workflowId: workflow.id,
      workflowName: workflow.name,
      runId,
      state,
      stepOutputs,
      getStepOutput: <T>(stepId: string) =>
        stepOutputs.get(stepId) as T | undefined,
      updateState: (updates: Partial<TState>) => {
        Object.assign(state, updates);
      },
      suspend: (request: SuspensionRequest) => {
        suspensionRequest = request;
        throw new SuspensionError(request);
      },
      neurolink: this.neurolink,
      logger,
      metadata: {
        startTime: Date.now(),
        completedSteps: [],
        failedSteps: [],
        skippedSteps: [],
        parentWorkflowId: options.parentWorkflowId,
        triggeredBy: options.metadata?.triggeredBy as string | undefined,
        tags: workflow.tags,
      },
    };
  }

  /**
   * Execute workflow graph
   */
  private async executeGraph<TState extends UnknownRecord>(
    workflow: WorkflowDefinition,
    context: WorkflowContext<TState>,
    stats: WorkflowStats,
    stepResults: Map<string, StepExecutionRecord>,
    signal: AbortSignal,
  ): Promise<unknown> {
    const graph = workflow.graph;
    let currentStepId = graph.entryPoint;
    let result: unknown;

    while (currentStepId) {
      // Check for cancellation
      if (signal.aborted) {
        throw new Error("Workflow cancelled");
      }

      // Check if this is a parallel group
      const parallelGroup = graph.parallelGroups?.find((g) =>
        g.steps.includes(currentStepId!),
      );
      if (parallelGroup) {
        result = await this.executeParallelGroup(
          workflow,
          parallelGroup,
          context,
          stats,
          stepResults,
          signal,
        );
        // Find merge point
        currentStepId = this.findMergePoint(graph, parallelGroup);
        continue;
      }

      // Check if this is a branch point
      const branch = graph.branches?.find((b) => b.fromStep === currentStepId);
      if (branch) {
        const targetStepId = await this.evaluateBranch(branch, context);
        currentStepId = targetStepId;
        continue;
      }

      // Check if this is a loop
      const loop = graph.loops?.find((l) => l.steps.includes(currentStepId!));
      if (loop) {
        result = await this.executeLoop(
          workflow,
          loop,
          context,
          stats,
          stepResults,
          signal,
        );
        // Find loop end point
        currentStepId = this.findLoopEndPoint(graph, loop);
        continue;
      }

      // Execute single step
      const stepDef = workflow.steps.get(currentStepId);
      if (!stepDef) {
        throw new Error(`Step not found: ${currentStepId}`);
      }

      const step = new Step(stepDef);
      const stepInput = this.resolveStepInput(currentStepId, context);

      // Emit step start
      this.emitEvent({
        type: "step:start",
        workflowId: workflow.id,
        runId: context.runId,
        timestamp: Date.now(),
        stepId: currentStepId,
        stepName: step.name,
        input: stepInput,
      });

      const stepResult = await step.execute(stepInput, context);

      // Record step result
      const record: StepExecutionRecord = {
        stepId: currentStepId,
        status: stepResult.success ? "completed" : "failed",
        input: stepInput,
        output: stepResult.data,
        error: stepResult.error,
        metadata: stepResult.metadata ?? { startTime: Date.now() },
        attempts: stepResult.metadata?.retryCount ?? 1,
      };
      stepResults.set(currentStepId, record);

      if (stepResult.success) {
        // Store output for downstream steps
        context.stepOutputs.set(currentStepId, stepResult.data);
        context.metadata.completedSteps.push(currentStepId);
        stats.completedSteps++;
        result = stepResult.data;

        // Emit step complete
        this.emitEvent({
          type: "step:complete",
          workflowId: workflow.id,
          runId: context.runId,
          timestamp: Date.now(),
          stepId: currentStepId,
          stepName: step.name,
          output: stepResult.data,
          duration: stepResult.metadata?.duration ?? 0,
        });
      } else {
        context.metadata.failedSteps.push(currentStepId);
        stats.failedSteps++;

        // Emit step failed
        this.emitEvent({
          type: "step:failed",
          workflowId: workflow.id,
          runId: context.runId,
          timestamp: Date.now(),
          stepId: currentStepId,
          stepName: step.name,
          error: stepResult.error!,
          willRetry: false,
        });

        throw new Error(
          `Step ${currentStepId} failed: ${stepResult.error?.message}`,
        );
      }

      // Find next step
      currentStepId = this.findNextStep(graph, currentStepId, context);
    }

    return result;
  }

  /**
   * Execute parallel group
   */
  private async executeParallelGroup<TState extends UnknownRecord>(
    workflow: WorkflowDefinition,
    group: ParallelGroup,
    context: WorkflowContext<TState>,
    stats: WorkflowStats,
    stepResults: Map<string, StepExecutionRecord>,
    signal: AbortSignal,
  ): Promise<unknown[]> {
    const limit = pLimit(this.defaultConcurrency);

    this.emitEvent({
      type: "parallel:start",
      workflowId: workflow.id,
      runId: context.runId,
      timestamp: Date.now(),
      data: { groupId: group.id, steps: group.steps },
    });

    const promises = group.steps.map((stepId) =>
      limit(async () => {
        if (signal.aborted) {
          throw new Error("Workflow cancelled");
        }

        const stepDef = workflow.steps.get(stepId);
        if (!stepDef) {
          throw new Error(`Step not found: ${stepId}`);
        }

        const step = new Step(stepDef);
        const stepInput = this.resolveStepInput(stepId, context);

        this.emitEvent({
          type: "step:start",
          workflowId: workflow.id,
          runId: context.runId,
          timestamp: Date.now(),
          stepId,
          stepName: step.name,
          input: stepInput,
        });

        const result = await step.execute(stepInput, context);

        const record: StepExecutionRecord = {
          stepId,
          status: result.success ? "completed" : "failed",
          input: stepInput,
          output: result.data,
          error: result.error,
          metadata: result.metadata ?? { startTime: Date.now() },
          attempts: result.metadata?.retryCount ?? 1,
        };
        stepResults.set(stepId, record);

        if (result.success) {
          context.stepOutputs.set(stepId, result.data);
          context.metadata.completedSteps.push(stepId);
          stats.completedSteps++;

          this.emitEvent({
            type: "step:complete",
            workflowId: workflow.id,
            runId: context.runId,
            timestamp: Date.now(),
            stepId,
            stepName: step.name,
            output: result.data,
            duration: result.metadata?.duration ?? 0,
          });
        } else if (!group.continueOnError) {
          throw new Error(`Step ${stepId} failed: ${result.error?.message}`);
        }

        return result.data;
      }),
    );

    const results =
      group.waitFor === "all"
        ? await Promise.all(promises)
        : await Promise.race(promises.map((p) => p.then((r) => [r])));

    this.emitEvent({
      type: "parallel:complete",
      workflowId: workflow.id,
      runId: context.runId,
      timestamp: Date.now(),
      data: { groupId: group.id },
    });

    return Array.isArray(results) ? results : [results];
  }

  /**
   * Evaluate conditional branch
   */
  private async evaluateBranch<TState extends UnknownRecord>(
    branch: ConditionalBranch,
    context: WorkflowContext<TState>,
  ): Promise<string> {
    for (const b of branch.branches) {
      if (b.condition.evaluate) {
        const result = await b.condition.evaluate(context);
        if (result) {
          this.emitEvent({
            type: "branch:evaluated",
            workflowId: context.workflowId,
            runId: context.runId,
            timestamp: Date.now(),
            data: {
              branchId: branch.id,
              selectedTarget: b.targetStep,
              label: b.label,
            },
          });
          return b.targetStep;
        }
      }
    }

    // Return default target or throw
    if (branch.defaultTarget) {
      return branch.defaultTarget;
    }

    throw new Error(`No branch condition matched for ${branch.id}`);
  }

  /**
   * Execute loop
   */
  private async executeLoop<TState extends UnknownRecord>(
    workflow: WorkflowDefinition,
    loop: LoopDefinition,
    context: WorkflowContext<TState>,
    stats: WorkflowStats,
    stepResults: Map<string, StepExecutionRecord>,
    signal: AbortSignal,
  ): Promise<unknown[]> {
    const results: unknown[] = [];
    let iteration = 0;

    switch (loop.type) {
      case "forEach": {
        // For forEach, we would need items from context
        // This is a simplified implementation
        const items = (context.state as UnknownRecord)[
          loop.itemVariable ?? "items"
        ] as unknown[];
        if (!Array.isArray(items)) {
          throw new Error(
            `forEach requires an array in state.${loop.itemVariable ?? "items"}`,
          );
        }

        for (const item of items) {
          if (iteration >= (loop.maxIterations ?? 1000)) {
            logger.warn(`Loop ${loop.id} reached max iterations`);
            break;
          }

          this.emitEvent({
            type: "loop:iteration",
            workflowId: workflow.id,
            runId: context.runId,
            timestamp: Date.now(),
            data: { loopId: loop.id, iteration, item },
          });

          // Set current item in state
          (context.state as UnknownRecord)[loop.itemVariable ?? "item"] = item;

          // Execute loop steps
          for (const stepId of loop.steps) {
            const stepDef = workflow.steps.get(stepId);
            if (!stepDef) continue;

            const step = new Step(stepDef);
            const result = await step.execute(item, context);

            if (!result.success) {
              throw new Error(`Loop step ${stepId} failed`);
            }

            context.stepOutputs.set(stepId, result.data);
            results.push(result.data);
          }

          iteration++;
        }
        break;
      }

      case "doWhile":
      case "doUntil": {
        do {
          if (iteration >= (loop.maxIterations ?? 100)) {
            logger.warn(`Loop ${loop.id} reached max iterations`);
            break;
          }

          this.emitEvent({
            type: "loop:iteration",
            workflowId: workflow.id,
            runId: context.runId,
            timestamp: Date.now(),
            data: { loopId: loop.id, iteration },
          });

          // Execute loop steps
          for (const stepId of loop.steps) {
            const stepDef = workflow.steps.get(stepId);
            if (!stepDef) continue;

            const step = new Step(stepDef);
            const stepInput = this.resolveStepInput(stepId, context);
            const result = await step.execute(stepInput, context);

            if (!result.success) {
              throw new Error(`Loop step ${stepId} failed`);
            }

            context.stepOutputs.set(stepId, result.data);
            results.push(result.data);
          }

          iteration++;

          // Evaluate condition
          if (loop.condition?.evaluate) {
            const shouldContinue = await loop.condition.evaluate(context);
            if (loop.type === "doWhile" && !shouldContinue) break;
            if (loop.type === "doUntil" && shouldContinue) break;
          }
        } while (true);
        break;
      }

      case "repeat": {
        const iterations = loop.iterations ?? 1;
        for (let i = 0; i < iterations; i++) {
          this.emitEvent({
            type: "loop:iteration",
            workflowId: workflow.id,
            runId: context.runId,
            timestamp: Date.now(),
            data: { loopId: loop.id, iteration: i },
          });

          for (const stepId of loop.steps) {
            const stepDef = workflow.steps.get(stepId);
            if (!stepDef) continue;

            const step = new Step(stepDef);
            const stepInput = this.resolveStepInput(stepId, context);
            const result = await step.execute(stepInput, context);

            if (!result.success) {
              throw new Error(`Loop step ${stepId} failed`);
            }

            results.push(result.data);
          }
        }
        break;
      }
    }

    this.emitEvent({
      type: "loop:complete",
      workflowId: workflow.id,
      runId: context.runId,
      timestamp: Date.now(),
      data: { loopId: loop.id, iterations: iteration },
    });

    return results;
  }

  /**
   * Find next step from edges
   */
  private findNextStep<TState extends UnknownRecord>(
    graph: WorkflowGraph,
    currentStepId: string,
    context: WorkflowContext<TState>,
  ): string | undefined {
    const edges = graph.edges.filter((e) => e.from === currentStepId);
    if (edges.length === 0) return undefined;

    // Find first matching edge
    for (const edge of edges) {
      if (!edge.condition || edge.condition.type === "always") {
        return edge.to;
      }
      // Evaluate condition if needed
    }

    return undefined;
  }

  /**
   * Find merge point for parallel group
   */
  private findMergePoint(
    graph: WorkflowGraph,
    group: ParallelGroup,
  ): string | undefined {
    // Find edges from parallel steps
    const targets = new Set<string>();
    for (const stepId of group.steps) {
      const edges = graph.edges.filter((e) => e.from === stepId);
      for (const edge of edges) {
        targets.add(edge.to);
      }
    }

    // Merge point is where all parallel steps converge
    // For simplicity, return the first common target
    return targets.size === 1 ? Array.from(targets)[0] : undefined;
  }

  /**
   * Find loop end point
   */
  private findLoopEndPoint(
    graph: WorkflowGraph,
    loop: LoopDefinition,
  ): string | undefined {
    // Find edge from last loop step
    const lastStepId = loop.steps[loop.steps.length - 1];
    const edges = graph.edges.filter((e) => e.from === lastStepId);
    return edges.length > 0 ? edges[0].to : undefined;
  }

  /**
   * Resolve input for a step
   */
  private resolveStepInput<TState extends UnknownRecord>(
    stepId: string,
    context: WorkflowContext<TState>,
  ): unknown {
    // For simplicity, use the last completed step's output
    // In a real implementation, this would be configurable per step
    const completedSteps = context.metadata.completedSteps;
    if (completedSteps.length > 0) {
      const lastStep = completedSteps[completedSteps.length - 1];
      return context.stepOutputs.get(lastStep);
    }
    return context.state;
  }

  /**
   * Create checkpoint for suspension/persistence
   */
  private async createCheckpoint<TState extends UnknownRecord>(
    workflow: WorkflowDefinition,
    runId: string,
    context: WorkflowContext<TState>,
    stepResults: Map<string, StepExecutionRecord>,
    suspension?: SuspensionRequest,
  ): Promise<WorkflowCheckpoint> {
    const checkpoint: WorkflowCheckpoint = {
      id: randomUUID(),
      workflowId: workflow.id,
      runId,
      timestamp: Date.now(),
      status: suspension ? "suspended" : "paused",
      state: context.state as UnknownRecord,
      stepOutputs: Object.fromEntries(context.stepOutputs),
      stepRecords: Object.fromEntries(stepResults),
      pendingSteps: this.findPendingSteps(workflow, context),
      suspension,
      version: workflow.version ?? "1.0.0",
    };

    // Persist to state manager
    await this.stateManager.saveCheckpoint(checkpoint);

    this.emitEvent({
      type: "checkpoint:created",
      workflowId: workflow.id,
      runId,
      timestamp: Date.now(),
      data: { checkpointId: checkpoint.id },
    });

    return checkpoint;
  }

  /**
   * Restore from checkpoint
   */
  private async restoreFromCheckpoint<TState extends UnknownRecord>(
    context: WorkflowContext<TState>,
    checkpoint: WorkflowCheckpoint,
  ): Promise<void> {
    // Restore state
    Object.assign(context.state, checkpoint.state);

    // Restore step outputs
    for (const [stepId, output] of Object.entries(checkpoint.stepOutputs)) {
      context.stepOutputs.set(stepId, output);
    }

    // Restore metadata
    context.metadata.completedSteps = Object.keys(
      checkpoint.stepRecords,
    ).filter((id) => checkpoint.stepRecords[id].status === "completed");
    context.metadata.resumedAt = Date.now();

    this.emitEvent({
      type: "checkpoint:restored",
      workflowId: context.workflowId,
      runId: context.runId,
      timestamp: Date.now(),
      data: { checkpointId: checkpoint.id },
    });
  }

  /**
   * Find pending steps (not yet executed)
   */
  private findPendingSteps<TState extends UnknownRecord>(
    workflow: WorkflowDefinition,
    context: WorkflowContext<TState>,
  ): string[] {
    const completed = new Set(context.metadata.completedSteps);
    const failed = new Set(context.metadata.failedSteps);
    const skipped = new Set(context.metadata.skippedSteps);

    return Array.from(workflow.steps.keys()).filter(
      (id) => !completed.has(id) && !failed.has(id) && !skipped.has(id),
    );
  }

  /**
   * Emit workflow event
   */
  private emitEvent(event: WorkflowEvent): void {
    this.emit(event.type, event);
    this.emit("workflow:event", event);
  }
}

/**
 * Custom error for workflow suspension
 */
class SuspensionError extends Error {
  suspension: SuspensionRequest;

  constructor(suspension: SuspensionRequest) {
    super(`Workflow suspended: ${suspension.reason}`);
    this.name = "SuspensionError";
    this.suspension = suspension;
  }
}
```

---

## 7. State Management

### 7.1 WorkflowStateManager

```typescript
// src/lib/workflow/workflowStateManager.ts

import type { WorkflowCheckpoint } from "../types/workflowTypes.js";
import { logger } from "../utils/logger.js";

/**
 * Storage adapter interface for checkpoint persistence
 */
export type CheckpointStorage = {
  save(checkpoint: WorkflowCheckpoint): Promise<void>;
  load(checkpointId: string): Promise<WorkflowCheckpoint | undefined>;
  loadByRunId(runId: string): Promise<WorkflowCheckpoint | undefined>;
  list(workflowId?: string): Promise<WorkflowCheckpoint[]>;
  delete(checkpointId: string): Promise<boolean>;
  deleteByRunId(runId: string): Promise<boolean>;
};

/**
 * In-memory checkpoint storage (default)
 */
export class InMemoryCheckpointStorage implements CheckpointStorage {
  private checkpoints: Map<string, WorkflowCheckpoint> = new Map();
  private runIdIndex: Map<string, string> = new Map(); // runId -> checkpointId

  async save(checkpoint: WorkflowCheckpoint): Promise<void> {
    this.checkpoints.set(checkpoint.id, checkpoint);
    this.runIdIndex.set(checkpoint.runId, checkpoint.id);
  }

  async load(checkpointId: string): Promise<WorkflowCheckpoint | undefined> {
    return this.checkpoints.get(checkpointId);
  }

  async loadByRunId(runId: string): Promise<WorkflowCheckpoint | undefined> {
    const checkpointId = this.runIdIndex.get(runId);
    if (checkpointId) {
      return this.checkpoints.get(checkpointId);
    }
    return undefined;
  }

  async list(workflowId?: string): Promise<WorkflowCheckpoint[]> {
    const all = Array.from(this.checkpoints.values());
    if (workflowId) {
      return all.filter((c) => c.workflowId === workflowId);
    }
    return all;
  }

  async delete(checkpointId: string): Promise<boolean> {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (checkpoint) {
      this.runIdIndex.delete(checkpoint.runId);
      return this.checkpoints.delete(checkpointId);
    }
    return false;
  }

  async deleteByRunId(runId: string): Promise<boolean> {
    const checkpointId = this.runIdIndex.get(runId);
    if (checkpointId) {
      this.runIdIndex.delete(runId);
      return this.checkpoints.delete(checkpointId);
    }
    return false;
  }
}

/**
 * Redis checkpoint storage adapter
 */
export class RedisCheckpointStorage implements CheckpointStorage {
  private redisClient: import("redis").RedisClientType;
  private prefix: string;
  private ttlSeconds: number;

  constructor(options: {
    redisClient: import("redis").RedisClientType;
    prefix?: string;
    ttlSeconds?: number;
  }) {
    this.redisClient = options.redisClient;
    this.prefix = options.prefix ?? "neurolink:workflow:checkpoint:";
    this.ttlSeconds = options.ttlSeconds ?? 86400 * 7; // 7 days default
  }

  private key(id: string): string {
    return `${this.prefix}${id}`;
  }

  private runIdKey(runId: string): string {
    return `${this.prefix}runid:${runId}`;
  }

  async save(checkpoint: WorkflowCheckpoint): Promise<void> {
    const data = JSON.stringify(checkpoint);
    await this.redisClient.setEx(
      this.key(checkpoint.id),
      this.ttlSeconds,
      data,
    );
    await this.redisClient.setEx(
      this.runIdKey(checkpoint.runId),
      this.ttlSeconds,
      checkpoint.id,
    );
  }

  async load(checkpointId: string): Promise<WorkflowCheckpoint | undefined> {
    const data = await this.redisClient.get(this.key(checkpointId));
    if (data) {
      return JSON.parse(data) as WorkflowCheckpoint;
    }
    return undefined;
  }

  async loadByRunId(runId: string): Promise<WorkflowCheckpoint | undefined> {
    const checkpointId = await this.redisClient.get(this.runIdKey(runId));
    if (checkpointId) {
      return this.load(checkpointId);
    }
    return undefined;
  }

  async list(workflowId?: string): Promise<WorkflowCheckpoint[]> {
    const keys = await this.redisClient.keys(`${this.prefix}*`);
    const checkpoints: WorkflowCheckpoint[] = [];

    for (const key of keys) {
      if (key.includes(":runid:")) continue;
      const data = await this.redisClient.get(key);
      if (data) {
        const checkpoint = JSON.parse(data) as WorkflowCheckpoint;
        if (!workflowId || checkpoint.workflowId === workflowId) {
          checkpoints.push(checkpoint);
        }
      }
    }

    return checkpoints;
  }

  async delete(checkpointId: string): Promise<boolean> {
    const checkpoint = await this.load(checkpointId);
    if (checkpoint) {
      await this.redisClient.del(this.runIdKey(checkpoint.runId));
    }
    const result = await this.redisClient.del(this.key(checkpointId));
    return result > 0;
  }

  async deleteByRunId(runId: string): Promise<boolean> {
    const checkpointId = await this.redisClient.get(this.runIdKey(runId));
    if (checkpointId) {
      await this.redisClient.del(this.runIdKey(runId));
      return (await this.redisClient.del(this.key(checkpointId))) > 0;
    }
    return false;
  }
}

/**
 * WorkflowStateManager - Manages workflow state and checkpoints
 */
export class WorkflowStateManager {
  private storage: CheckpointStorage;

  constructor(storage?: CheckpointStorage) {
    this.storage = storage ?? new InMemoryCheckpointStorage();
  }

  /**
   * Save a checkpoint
   */
  async saveCheckpoint(checkpoint: WorkflowCheckpoint): Promise<void> {
    await this.storage.save(checkpoint);
    logger.debug(`Saved workflow checkpoint: ${checkpoint.id}`);
  }

  /**
   * Load a checkpoint by ID
   */
  async loadCheckpoint(
    checkpointId: string,
  ): Promise<WorkflowCheckpoint | undefined> {
    return this.storage.load(checkpointId);
  }

  /**
   * Load checkpoint by run ID
   */
  async loadCheckpointByRunId(
    runId: string,
  ): Promise<WorkflowCheckpoint | undefined> {
    return this.storage.loadByRunId(runId);
  }

  /**
   * List checkpoints
   */
  async listCheckpoints(workflowId?: string): Promise<WorkflowCheckpoint[]> {
    return this.storage.list(workflowId);
  }

  /**
   * Delete a checkpoint
   */
  async deleteCheckpoint(checkpointId: string): Promise<boolean> {
    const deleted = await this.storage.delete(checkpointId);
    if (deleted) {
      logger.debug(`Deleted workflow checkpoint: ${checkpointId}`);
    }
    return deleted;
  }

  /**
   * Delete checkpoint by run ID
   */
  async deleteCheckpointByRunId(runId: string): Promise<boolean> {
    return this.storage.deleteByRunId(runId);
  }

  /**
   * Set custom storage adapter
   */
  setStorage(storage: CheckpointStorage): void {
    this.storage = storage;
  }
}
```

---

## 8. Event Streaming

### 8.1 WorkflowEventStream

````typescript
// src/lib/workflow/workflowEventStream.ts

import { EventEmitter } from "events";
import type {
  WorkflowEvent,
  WorkflowEventType,
} from "../types/workflowTypes.js";

/**
 * WorkflowEventStream - Provides async iteration over workflow events
 *
 * Enables real-time streaming of workflow progress:
 *
 * @example
 * ```typescript
 * const executor = new WorkflowExecutor(neurolink);
 * const eventStream = new WorkflowEventStream(executor);
 *
 * // Start workflow execution (non-blocking)
 * const resultPromise = executor.execute("my-workflow", input);
 *
 * // Stream events as they happen
 * for await (const event of eventStream.events()) {
 *   console.log(`[${event.type}] ${event.timestamp}`);
 *   if (event.type === "step:complete") {
 *     console.log(`  Step ${event.stepId} completed`);
 *   }
 * }
 *
 * // Get final result
 * const result = await resultPromise;
 * ```
 */
export class WorkflowEventStream {
  private emitter: EventEmitter;
  private buffer: WorkflowEvent[] = [];
  private resolvers: Array<(value: IteratorResult<WorkflowEvent>) => void> = [];
  private ended = false;
  private filters: Set<WorkflowEventType> | null = null;

  constructor(executor: EventEmitter) {
    this.emitter = executor;
    this.setupListeners();
  }

  /**
   * Filter events by type
   */
  filter(...types: WorkflowEventType[]): this {
    this.filters = new Set(types);
    return this;
  }

  /**
   * Get async iterator for events
   */
  async *events(): AsyncGenerator<WorkflowEvent, void, unknown> {
    while (!this.ended) {
      const event = await this.nextEvent();
      if (event) {
        yield event;
      }
    }

    // Drain remaining buffer
    while (this.buffer.length > 0) {
      yield this.buffer.shift()!;
    }
  }

  /**
   * Subscribe to specific event type
   */
  on(
    type: WorkflowEventType,
    callback: (event: WorkflowEvent) => void,
  ): () => void {
    const handler = (event: WorkflowEvent) => {
      if (event.type === type) {
        callback(event);
      }
    };

    this.emitter.on("workflow:event", handler);

    // Return unsubscribe function
    return () => {
      this.emitter.off("workflow:event", handler);
    };
  }

  /**
   * Wait for workflow completion
   */
  async waitForCompletion(): Promise<WorkflowEvent> {
    return new Promise((resolve) => {
      const handler = (event: WorkflowEvent) => {
        if (
          event.type === "workflow:complete" ||
          event.type === "workflow:failed" ||
          event.type === "workflow:cancelled"
        ) {
          this.emitter.off("workflow:event", handler);
          resolve(event);
        }
      };

      this.emitter.on("workflow:event", handler);
    });
  }

  /**
   * End the event stream
   */
  end(): void {
    this.ended = true;
    // Resolve any pending promises
    for (const resolve of this.resolvers) {
      resolve({ value: undefined, done: true });
    }
    this.resolvers = [];
  }

  /**
   * Setup event listeners
   */
  private setupListeners(): void {
    this.emitter.on("workflow:event", (event: WorkflowEvent) => {
      // Apply filters
      if (this.filters && !this.filters.has(event.type)) {
        return;
      }

      if (this.resolvers.length > 0) {
        const resolve = this.resolvers.shift()!;
        resolve({ value: event, done: false });
      } else {
        this.buffer.push(event);
      }
    });

    // Listen for completion events to end stream
    this.emitter.on("workflow:event", (event: WorkflowEvent) => {
      if (
        event.type === "workflow:complete" ||
        event.type === "workflow:failed" ||
        event.type === "workflow:cancelled"
      ) {
        // Give time for final events to be processed
        setTimeout(() => this.end(), 100);
      }
    });
  }

  /**
   * Get next event (async)
   */
  private nextEvent(): Promise<WorkflowEvent | undefined> {
    if (this.buffer.length > 0) {
      return Promise.resolve(this.buffer.shift());
    }

    if (this.ended) {
      return Promise.resolve(undefined);
    }

    return new Promise((resolve) => {
      this.resolvers.push((result) => {
        resolve(result.done ? undefined : result.value);
      });
    });
  }
}
````

---

## 9. Integration Points

### 9.1 NeuroLink SDK Integration

````typescript
// src/lib/neurolink.ts (additions)

import { WorkflowBuilder, createWorkflow } from "./workflow/workflowBuilder.js";
import { WorkflowExecutor } from "./workflow/workflowExecutor.js";
import { WorkflowRegistry } from "./workflow/workflowRegistry.js";
import { WorkflowEventStream } from "./workflow/workflowEventStream.js";
import {
  WorkflowStateManager,
  RedisCheckpointStorage,
} from "./workflow/workflowStateManager.js";
import type {
  WorkflowDefinition,
  WorkflowExecutionOptions,
  WorkflowExecutionResult,
  WorkflowCheckpoint,
} from "./types/workflowTypes.js";

// Add to NeuroLink class:

export class NeuroLink {
  // ... existing code ...

  private workflowExecutor?: WorkflowExecutor;
  private workflowStateManager?: WorkflowStateManager;

  /**
   * Initialize workflow system
   */
  private initializeWorkflowSystem(): void {
    if (!this.workflowExecutor) {
      // Use Redis storage if conversation memory has Redis configured
      if (this.conversationMemory && "redisClient" in this.conversationMemory) {
        const redisClient = (this.conversationMemory as any).redisClient;
        this.workflowStateManager = new WorkflowStateManager(
          new RedisCheckpointStorage({ redisClient }),
        );
      } else {
        this.workflowStateManager = new WorkflowStateManager();
      }

      this.workflowExecutor = new WorkflowExecutor(this, {
        stateManager: this.workflowStateManager,
      });
    }
  }

  /**
   * Create a new workflow builder
   *
   * @example
   * ```typescript
   * const workflow = neurolink
   *   .workflow("content-pipeline")
   *   .name("Content Generation Pipeline")
   *   .step("research", {
   *     execute: async (input, ctx) => {
   *       const result = await ctx.neurolink.generate({
   *         input: { text: `Research: ${input.topic}` },
   *         provider: "openai"
   *       });
   *       return { success: true, data: { research: result.content } };
   *     }
   *   })
   *   .then("write", {
   *     execute: async (input, ctx) => {
   *       const research = ctx.getStepOutput<{ research: string }>("research");
   *       const result = await ctx.neurolink.generate({
   *         input: { text: `Write article using: ${research?.research}` },
   *         provider: "anthropic"
   *       });
   *       return { success: true, data: { article: result.content } };
   *     }
   *   })
   *   .register();
   * ```
   */
  workflow(workflowId: string): WorkflowBuilder {
    return new WorkflowBuilder(workflowId);
  }

  /**
   * Execute a registered workflow
   *
   * @example
   * ```typescript
   * const result = await neurolink.executeWorkflow("content-pipeline", {
   *   topic: "AI in Healthcare"
   * });
   *
   * console.log(result.output);
   * ```
   */
  async executeWorkflow<TInput, TOutput>(
    workflowId: string,
    input: TInput,
    options: WorkflowExecutionOptions = {},
  ): Promise<WorkflowExecutionResult<TOutput>> {
    this.initializeWorkflowSystem();
    return this.workflowExecutor!.execute<TInput, TOutput>(
      workflowId,
      input,
      options,
    );
  }

  /**
   * Execute a workflow definition directly
   */
  async runWorkflow<TInput, TOutput>(
    workflow: WorkflowDefinition<TInput, TOutput>,
    input: TInput,
    options: WorkflowExecutionOptions = {},
  ): Promise<WorkflowExecutionResult<TOutput>> {
    this.initializeWorkflowSystem();
    return this.workflowExecutor!.executeWorkflow(workflow, input, options);
  }

  /**
   * Resume a suspended workflow
   */
  async resumeWorkflow<TOutput>(
    checkpoint: WorkflowCheckpoint,
    resumeData?: Record<string, unknown>,
  ): Promise<WorkflowExecutionResult<TOutput>> {
    this.initializeWorkflowSystem();
    return this.workflowExecutor!.resume<TOutput>(checkpoint, resumeData);
  }

  /**
   * Cancel a running workflow
   */
  cancelWorkflow(runId: string): boolean {
    this.initializeWorkflowSystem();
    return this.workflowExecutor!.cancel(runId);
  }

  /**
   * Get workflow event stream for real-time updates
   */
  getWorkflowEventStream(): WorkflowEventStream {
    this.initializeWorkflowSystem();
    return new WorkflowEventStream(this.workflowExecutor!);
  }

  /**
   * List registered workflows
   */
  listWorkflows(): Array<{ id: string; name: string; version?: string }> {
    return WorkflowRegistry.list();
  }

  /**
   * Get workflow definition
   */
  getWorkflow<TInput, TOutput>(
    workflowId: string,
  ): WorkflowDefinition<TInput, TOutput> | undefined {
    return WorkflowRegistry.get(workflowId);
  }
}
````

---

## 10. File Structure

```
src/lib/
├── workflow/
│   ├── index.ts                    # Public exports
│   ├── step.ts                     # Step class
│   ├── workflowBuilder.ts          # Fluent builder API
│   ├── workflowRegistry.ts         # Workflow definition registry
│   ├── workflowExecutor.ts         # Execution engine
│   ├── workflowStateManager.ts     # State persistence
│   ├── workflowEventStream.ts      # Event streaming
│   └── utils/
│       ├── graphUtils.ts           # Graph traversal utilities
│       └── conditionEvaluator.ts   # Condition evaluation
├── types/
│   └── workflowTypes.ts            # Type definitions
└── neurolink.ts                    # SDK integration (additions)

test/
└── workflow/
    ├── step.test.ts
    ├── workflowBuilder.test.ts
    ├── workflowExecutor.test.ts
    ├── workflowStateManager.test.ts
    └── integration/
        └── workflow-e2e.test.ts
```

---

## 11. Implementation Plan

### Phase 1: Foundation (Week 1-2)

1. **Create type definitions** (`workflowTypes.ts`)
   - Define all workflow, step, and event types
   - Add Zod integration for schemas
   - Export from `types/index.ts`

2. **Implement Step class** (`step.ts`)
   - Input/output validation
   - Retry logic with exponential backoff
   - Timeout support

3. **Implement WorkflowRegistry** (`workflowRegistry.ts`)
   - Follow ProviderFactory pattern
   - Registration and lookup

### Phase 2: Builder API (Week 2-3)

4. **Implement WorkflowBuilder** (`workflowBuilder.ts`)
   - Basic `.step()` and `.then()` methods
   - `.parallel()` for concurrent execution
   - `.branch()` for conditional paths
   - `.forEach()`, `.doWhile()`, `.doUntil()` for loops

5. **Add validation and error handling**
   - Schema validation at build time
   - Graph validation (no cycles, valid references)

### Phase 3: Execution Engine (Week 3-4)

6. **Implement WorkflowExecutor** (`workflowExecutor.ts`)
   - Graph traversal
   - Parallel execution with p-limit
   - Branch evaluation
   - Loop execution

7. **Implement WorkflowStateManager** (`workflowStateManager.ts`)
   - In-memory storage
   - Redis storage adapter
   - Checkpoint creation and restoration

### Phase 4: Event Streaming (Week 4-5)

8. **Implement WorkflowEventStream** (`workflowEventStream.ts`)
   - Async iteration
   - Event filtering
   - Subscription API

9. **Integrate with NeuroLink SDK**
   - Add workflow methods to NeuroLink class
   - Export from main index

### Phase 5: Testing & Documentation (Week 5-6)

10. **Write comprehensive tests**
    - Unit tests for each component
    - Integration tests for full workflows
    - Edge case testing

11. **Create documentation and examples**
    - API reference
    - Usage examples
    - Migration guide

---

## 12. Code Examples

### 12.1 Simple Sequential Workflow

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { z } from "zod";

const neurolink = new NeuroLink();

// Define workflow
const workflow = neurolink
  .workflow("simple-qa")
  .name("Simple Q&A")
  .input(z.object({ question: z.string() }))
  .output(z.object({ answer: z.string() }))
  .step("generate", {
    execute: async (input, ctx) => {
      const result = await ctx.neurolink.generate({
        input: { text: input.question },
        provider: "openai",
      });
      return { success: true, data: { answer: result.content } };
    },
  })
  .register();

// Execute
const result = await neurolink.executeWorkflow("simple-qa", {
  question: "What is machine learning?",
});

console.log(result.output?.answer);
```

### 12.2 Parallel Processing Workflow

```typescript
const workflow = neurolink
  .workflow("multi-provider-compare")
  .name("Multi-Provider Comparison")
  .input(z.object({ prompt: z.string() }))
  .step("prepare", {
    execute: async (input) => ({
      success: true,
      data: { prompt: input.prompt },
    }),
  })
  .parallel([
    {
      id: "openai",
      execute: async (input, ctx) => {
        const result = await ctx.neurolink.generate({
          input: { text: input.prompt },
          provider: "openai",
        });
        return {
          success: true,
          data: { provider: "openai", response: result.content },
        };
      },
    },
    {
      id: "anthropic",
      execute: async (input, ctx) => {
        const result = await ctx.neurolink.generate({
          input: { text: input.prompt },
          provider: "anthropic",
        });
        return {
          success: true,
          data: { provider: "anthropic", response: result.content },
        };
      },
    },
    {
      id: "vertex",
      execute: async (input, ctx) => {
        const result = await ctx.neurolink.generate({
          input: { text: input.prompt },
          provider: "vertex",
        });
        return {
          success: true,
          data: { provider: "vertex", response: result.content },
        };
      },
    },
  ])
  .then("compare", {
    execute: async (input, ctx) => {
      const responses = [
        ctx.getStepOutput("openai"),
        ctx.getStepOutput("anthropic"),
        ctx.getStepOutput("vertex"),
      ];

      return {
        success: true,
        data: { responses, comparison: "All responses received" },
      };
    },
  })
  .register();
```

### 12.3 Conditional Branching Workflow

```typescript
const workflow = neurolink
  .workflow("content-router")
  .name("Content Type Router")
  .input(
    z.object({ content: z.string(), type: z.enum(["code", "text", "data"]) }),
  )
  .step("analyze", {
    execute: async (input) => ({
      success: true,
      data: { content: input.content, contentType: input.type },
    }),
  })
  .branch(
    [
      {
        condition: (ctx) =>
          ctx.getStepOutput("analyze")?.contentType === "code",
        stepId: "process-code",
        step: {
          execute: async (input, ctx) => {
            const result = await ctx.neurolink.generate({
              input: { text: `Review this code:\n${input.content}` },
              provider: "openai",
              model: "gpt-4o",
            });
            return { success: true, data: { review: result.content } };
          },
        },
        label: "Code Review",
      },
      {
        condition: (ctx) =>
          ctx.getStepOutput("analyze")?.contentType === "text",
        stepId: "process-text",
        step: {
          execute: async (input, ctx) => {
            const result = await ctx.neurolink.generate({
              input: { text: `Summarize:\n${input.content}` },
              provider: "anthropic",
            });
            return { success: true, data: { summary: result.content } };
          },
        },
        label: "Text Summary",
      },
    ],
    {
      stepId: "process-default",
      step: {
        execute: async (input, ctx) => {
          const result = await ctx.neurolink.generate({
            input: { text: `Analyze:\n${input.content}` },
            provider: "vertex",
          });
          return { success: true, data: { analysis: result.content } };
        },
      },
    },
  )
  .register();
```

### 12.4 Loop-Based Workflow

```typescript
const workflow = neurolink
  .workflow("batch-processor")
  .name("Batch Document Processor")
  .input(z.object({ documents: z.array(z.string()) }))
  .state(() => ({ processed: [] as string[], items: [] as string[] }))
  .step("setup", {
    execute: async (input, ctx) => {
      ctx.updateState({ items: input.documents });
      return { success: true, data: input };
    },
  })
  .forEach(
    {
      items: (ctx) => ctx.state.items,
      itemVariable: "document",
      maxIterations: 100,
    },
    [
      {
        id: "process-doc",
        execute: async (document, ctx) => {
          const result = await ctx.neurolink.generate({
            input: { text: `Summarize: ${document}` },
            provider: "openai",
          });

          ctx.state.processed.push(result.content);
          return { success: true, data: { summary: result.content } };
        },
      },
    ],
  )
  .then("finalize", {
    execute: async (input, ctx) => ({
      success: true,
      data: { summaries: ctx.state.processed },
    }),
  })
  .register();
```

### 12.5 Workflow with Suspension (HITL)

```typescript
const workflow = neurolink
  .workflow("approval-workflow")
  .name("Content Approval Workflow")
  .input(z.object({ content: z.string() }))
  .step("generate", {
    suspendable: true,
    execute: async (input, ctx) => {
      const result = await ctx.neurolink.generate({
        input: { text: `Improve this content: ${input.content}` },
        provider: "anthropic",
      });
      return { success: true, data: { draft: result.content } };
    },
  })
  .then("review", {
    suspendable: true,
    execute: async (input, ctx) => {
      const draft = ctx.getStepOutput<{ draft: string }>("generate")?.draft;

      // Request human approval
      ctx.suspend({
        reason: "Content requires human review",
        type: "hitl",
        resumeData: { draft },
        callbackId: `review-${ctx.runId}`,
      });

      // This won't execute until resumed
      return { success: true, data: { approved: true } };
    },
  })
  .then("publish", {
    execute: async (input, ctx) => ({
      success: true,
      data: { published: true, content: ctx.getStepOutput("generate")?.draft },
    }),
  })
  .register();

// Execute with suspension handling
const result = await neurolink.executeWorkflow("approval-workflow", {
  content: "Original content",
});

if (result.status === "suspended" && result.checkpoint) {
  // Later, after human approval...
  const finalResult = await neurolink.resumeWorkflow(result.checkpoint, {
    approved: true,
    feedback: "Looks good!",
  });
}
```

### 12.6 Event Streaming Example

```typescript
const neurolink = new NeuroLink();
const eventStream = neurolink.getWorkflowEventStream();

// Subscribe to specific events
const unsubscribe = eventStream.on("step:complete", (event) => {
  console.log(`Step ${event.stepId} completed in ${event.duration}ms`);
});

// Or iterate over all events
(async () => {
  for await (const event of eventStream.events()) {
    switch (event.type) {
      case "workflow:start":
        console.log("Workflow started");
        break;
      case "step:start":
        console.log(`Starting step: ${event.stepName}`);
        break;
      case "step:complete":
        console.log(`Completed step: ${event.stepName}`);
        break;
      case "workflow:complete":
        console.log("Workflow completed!");
        break;
    }
  }
})();

// Execute workflow (events will stream)
await neurolink.executeWorkflow("my-workflow", { input: "data" });
```

---

## Summary

This implementation guide provides a comprehensive blueprint for adding Mastra-style advanced workflow capabilities to NeuroLink. The design follows NeuroLink's existing patterns:

1. **Factory + Registry Pattern**: WorkflowRegistry mirrors ProviderFactory/ProviderRegistry
2. **Type Safety**: Full TypeScript types with Zod schema validation
3. **Event-Driven**: Leverages existing EventEmitter patterns
4. **Modular Architecture**: Clear separation of concerns

Key features implemented:

- Graph-based execution engine
- Fluent builder API (`.then()`, `.parallel()`, `.branch()`, `.forEach()`)
- Step definitions with input/output schemas
- Conditional branching and loops
- Parallel execution with configurable concurrency
- Suspension and resumption capability
- Workflow state management with Redis support
- Real-time event streaming

The implementation is designed to integrate seamlessly with existing NeuroLink features like providers, tools, and HITL systems.
