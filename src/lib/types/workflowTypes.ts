/**
 * Workflow Types for NeuroLink Advanced Workflow System
 *
 * Provides comprehensive type definitions for declarative, type-safe orchestration
 * of complex AI operations with features like graph-based execution, conditional
 * branching, parallel execution, loops, and suspension/resumption.
 *
 * @module workflowTypes
 */

import type { z } from "zod";
import type { JsonObject, JsonValue, UnknownRecord } from "./common.js";

// Forward declaration for NeuroLink (to avoid circular deps)
type NeuroLinkInstance = import("../neurolink.js").NeuroLink;

/**
 * Logger interface for workflow context
 */
export type WorkflowLogger = {
  debug: (message: string, meta?: Record<string, unknown>) => void;
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
};

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
  suspend: (request: SuspensionRequest) => never;
  /** NeuroLink instance for AI operations */
  neurolink: NeuroLinkInstance;
  /** Logger instance */
  logger: WorkflowLogger;
  /** Execution metadata */
  metadata: WorkflowMetadata;
};

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
 * Edge condition for conditional transitions
 */
export type EdgeCondition = {
  type: "expression" | "function" | "always";
  expression?: string;
  evaluate?: (context: WorkflowContext) => boolean | Promise<boolean>;
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
  /** For forEach: static array of items to iterate over */
  items?: unknown[];
  /** For forEach: expression to get items from context */
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

// ==========================================
// Workflow Event Types
// ==========================================

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
 * Workflow failed event
 */
export type WorkflowFailedEvent = WorkflowEventBase & {
  type: "workflow:failed";
  data: { error: WorkflowError };
};

/**
 * Workflow suspended event
 */
export type WorkflowSuspendedEvent = WorkflowEventBase & {
  type: "workflow:suspended";
  data: { suspension: SuspensionRequest };
};

/**
 * Workflow resumed event
 */
export type WorkflowResumedEvent = WorkflowEventBase & {
  type: "workflow:resumed";
  data: { checkpointId: string };
};

/**
 * Workflow cancelled event
 */
export type WorkflowCancelledEvent = WorkflowEventBase & {
  type: "workflow:cancelled";
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
 * Step skipped event
 */
export type StepSkippedEvent = WorkflowEventBase & {
  type: "step:skipped";
  stepId: string;
  stepName: string;
  reason: string;
};

/**
 * Step retry event
 */
export type StepRetryEvent = WorkflowEventBase & {
  type: "step:retry";
  stepId: string;
  stepName: string;
  attempt: number;
  maxAttempts: number;
  delayMs: number;
};

/**
 * Step suspended event
 */
export type StepSuspendedEvent = WorkflowEventBase & {
  type: "step:suspended";
  stepId: string;
  stepName: string;
  suspension: SuspensionRequest;
};

/**
 * Branch evaluated event
 */
export type BranchEvaluatedEvent = WorkflowEventBase & {
  type: "branch:evaluated";
  data: {
    branchId: string;
    selectedTarget: string;
    label?: string;
  };
};

/**
 * Parallel start event
 */
export type ParallelStartEvent = WorkflowEventBase & {
  type: "parallel:start";
  data: {
    groupId: string;
    steps: string[];
  };
};

/**
 * Parallel complete event
 */
export type ParallelCompleteEvent = WorkflowEventBase & {
  type: "parallel:complete";
  data: {
    groupId: string;
  };
};

/**
 * Loop iteration event
 */
export type LoopIterationEvent = WorkflowEventBase & {
  type: "loop:iteration";
  data: {
    loopId: string;
    iteration: number;
    item?: unknown;
  };
};

/**
 * Loop complete event
 */
export type LoopCompleteEvent = WorkflowEventBase & {
  type: "loop:complete";
  data: {
    loopId: string;
    iterations: number;
  };
};

/**
 * Checkpoint created event
 */
export type CheckpointCreatedEvent = WorkflowEventBase & {
  type: "checkpoint:created";
  data: {
    checkpointId: string;
  };
};

/**
 * Checkpoint restored event
 */
export type CheckpointRestoredEvent = WorkflowEventBase & {
  type: "checkpoint:restored";
  data: {
    checkpointId: string;
  };
};

/**
 * Union of all workflow events
 */
export type WorkflowEvent =
  | WorkflowStartEvent
  | WorkflowCompleteEvent
  | WorkflowFailedEvent
  | WorkflowSuspendedEvent
  | WorkflowResumedEvent
  | WorkflowCancelledEvent
  | StepStartEvent
  | StepCompleteEvent
  | StepFailedEvent
  | StepSkippedEvent
  | StepRetryEvent
  | StepSuspendedEvent
  | BranchEvaluatedEvent
  | ParallelStartEvent
  | ParallelCompleteEvent
  | LoopIterationEvent
  | LoopCompleteEvent
  | CheckpointCreatedEvent
  | CheckpointRestoredEvent;

/**
 * Type guard for workflow start event
 */
export function isWorkflowStartEvent(
  event: WorkflowEvent,
): event is WorkflowStartEvent {
  return event.type === "workflow:start";
}

/**
 * Type guard for workflow complete event
 */
export function isWorkflowCompleteEvent(
  event: WorkflowEvent,
): event is WorkflowCompleteEvent {
  return event.type === "workflow:complete";
}

/**
 * Type guard for step complete event
 */
export function isStepCompleteEvent(
  event: WorkflowEvent,
): event is StepCompleteEvent {
  return event.type === "step:complete";
}

/**
 * Type guard for step failed event
 */
export function isStepFailedEvent(
  event: WorkflowEvent,
): event is StepFailedEvent {
  return event.type === "step:failed";
}
