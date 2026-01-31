/**
 * Workflow System Type Definitions
 *
 * Comprehensive type system for the NeuroLink Workflow Engine.
 * Provides type-safe workflow construction, execution, and state management.
 *
 * @module workflow/types
 */

import type { z } from "zod";
import type { NeuroLink } from "../../neurolink.js";
import type { JsonObject, JsonValue, UnknownRecord } from "../../types/common.js";

// =============================================================================
// Step Status and Workflow Status
// =============================================================================

/**
 * Step execution status
 */
export type StepStatus = "pending" | "running" | "completed" | "failed" | "skipped" | "suspended";

/**
 * Workflow execution status
 */
export type WorkflowStatus = "idle" | "running" | "paused" | "suspended" | "completed" | "failed" | "cancelled";

// =============================================================================
// Retry Configuration
// =============================================================================

/**
 * Retry configuration for steps
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Initial delay in milliseconds */
  initialDelayMs: number;
  /** Maximum delay in milliseconds */
  maxDelayMs: number;
  /** Backoff multiplier for exponential backoff */
  backoffMultiplier: number;
  /** Optional list of error codes that are retryable */
  retryableErrors?: string[];
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

// =============================================================================
// Step Error and Metadata
// =============================================================================

/**
 * Step error information
 */
export interface StepError {
  /** Error code for categorization */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  details?: JsonObject;
  /** Whether the error is retryable */
  retryable?: boolean;
  /** Original error cause */
  cause?: Error;
}

/**
 * Step execution metadata
 */
export interface StepMetadata {
  /** Step execution start time (timestamp) */
  startTime: number;
  /** Step execution end time (timestamp) */
  endTime?: number;
  /** Step execution duration in milliseconds */
  duration?: number;
  /** Number of retry attempts made */
  retryCount?: number;
  /** Tokens used during AI generation */
  tokensUsed?: number;
  /** Provider used for AI operations */
  provider?: string;
  /** Model used for AI operations */
  model?: string;
  /** Custom metadata fields */
  [key: string]: JsonValue | undefined;
}

// =============================================================================
// Suspension Types
// =============================================================================

/**
 * Suspension type for workflow pause
 */
export type SuspensionType = "hitl" | "external" | "timer" | "manual";

/**
 * Suspension request for pausing workflow
 */
export interface SuspensionRequest {
  /** Reason for suspension */
  reason: string;
  /** Type of suspension */
  type: SuspensionType;
  /** Data needed to resume */
  resumeData?: JsonObject;
  /** Expiration timestamp */
  expiresAt?: number;
  /** Callback ID for external systems */
  callbackId?: string;
}

// =============================================================================
// Step Result Types
// =============================================================================

/**
 * Step execution result
 */
export interface StepResult<T = unknown> {
  /** Whether the step succeeded */
  success: boolean;
  /** Step output data */
  data?: T;
  /** Error information if failed */
  error?: StepError;
  /** Execution metadata */
  metadata?: StepMetadata;
  /** Request suspension (for HITL or external wait) */
  suspend?: SuspensionRequest;
}

// =============================================================================
// Workflow Context
// =============================================================================

/**
 * Logger interface for workflow context
 */
export interface WorkflowLogger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

/**
 * Workflow metadata
 */
export interface WorkflowMetadata {
  /** Workflow start time */
  startTime: number;
  /** Current step ID being executed */
  currentStepId?: string;
  /** List of completed step IDs */
  completedSteps: string[];
  /** List of failed step IDs */
  failedSteps: string[];
  /** List of skipped step IDs */
  skippedSteps: string[];
  /** Timestamp when workflow was suspended */
  suspendedAt?: number;
  /** Timestamp when workflow was resumed */
  resumedAt?: number;
  /** Parent workflow ID (for nested workflows) */
  parentWorkflowId?: string;
  /** What triggered this workflow */
  triggeredBy?: string;
  /** Tags for categorization */
  tags?: string[];
}

/**
 * Workflow context passed to steps
 */
export interface WorkflowContext<TGlobalState = UnknownRecord> {
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
  neurolink: NeuroLink;
  /** Logger instance */
  logger: WorkflowLogger;
  /** Execution metadata */
  metadata: WorkflowMetadata;
  /** Current loop item (for forEach loops) */
  loopItem?: unknown;
  /** Current loop index (for forEach loops) */
  loopIndex?: number;
}

// =============================================================================
// Step Definition Types
// =============================================================================

/**
 * Step execute function type
 */
export type StepExecuteFunction<TInput = unknown, TOutput = unknown, TContext = WorkflowContext> = (
  input: TInput,
  context: TContext,
) => Promise<StepResult<TOutput>>;

/**
 * Step definition with input/output schemas
 */
export interface StepDefinition<TInput = unknown, TOutput = unknown, TContext = WorkflowContext> {
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
  execute: StepExecuteFunction<TInput, TOutput, TContext>;
  /** Retry configuration (partial - defaults will be applied at runtime) */
  retry?: Partial<RetryConfig>;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Whether this step can be suspended */
  suspendable?: boolean;
  /** Tags for categorization */
  tags?: string[];
}

// =============================================================================
// Graph Types
// =============================================================================

/**
 * Edge condition types
 */
export type EdgeConditionType = "expression" | "function" | "always";

/**
 * Edge condition for conditional transitions
 */
export interface EdgeCondition {
  /** Type of condition evaluation */
  type: EdgeConditionType;
  /** String expression for evaluation */
  expression?: string;
  /** Function for runtime evaluation */
  evaluate?: (context: WorkflowContext) => boolean | Promise<boolean>;
}

/**
 * Graph edge representing step transition
 */
export interface WorkflowEdge {
  /** Source step ID */
  from: string;
  /** Target step ID */
  to: string;
  /** Optional condition for transition */
  condition?: EdgeCondition;
}

/**
 * Parallel execution group
 */
export interface ParallelGroup {
  /** Group identifier */
  id: string;
  /** Step IDs in this parallel group */
  steps: string[];
  /** Wait for all (AND) or any (OR) to complete */
  waitFor: "all" | "any";
  /** Continue execution even if some steps fail */
  continueOnError?: boolean;
}

/**
 * Conditional branch definition
 */
export interface ConditionalBranch {
  /** Branch identifier */
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
}

/**
 * Loop type
 */
export type LoopType = "forEach" | "doWhile" | "doUntil" | "repeat";

/**
 * Loop definition for iteration
 */
export interface LoopDefinition {
  /** Loop identifier */
  id: string;
  /** Type of loop */
  type: LoopType;
  /** Steps to execute in loop */
  steps: string[];
  /** For forEach: expression to get items */
  itemsExpression?: string;
  /** For forEach: function to get items */
  itemsFunction?: (context: WorkflowContext) => unknown[] | Promise<unknown[]>;
  /** For forEach: variable name for current item */
  itemVariable?: string;
  /** For doWhile/doUntil: condition */
  condition?: EdgeCondition;
  /** For repeat: number of iterations */
  iterations?: number;
  /** Maximum iterations (safety limit) */
  maxIterations?: number;
}

/**
 * Workflow execution graph
 */
export interface WorkflowGraph {
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
}

// =============================================================================
// Workflow Definition
// =============================================================================

/**
 * Workflow definition
 */
export interface WorkflowDefinition<TInput = unknown, TOutput = unknown, TState = UnknownRecord> {
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
}

// =============================================================================
// Workflow Execution Types
// =============================================================================

/**
 * Workflow checkpoint for persistence
 */
export interface WorkflowCheckpoint {
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
}

/**
 * Workflow execution options
 */
export interface WorkflowExecutionOptions {
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
}

/**
 * Workflow execution statistics
 */
export interface WorkflowStats {
  /** Total steps in workflow */
  totalSteps: number;
  /** Number of completed steps */
  completedSteps: number;
  /** Number of failed steps */
  failedSteps: number;
  /** Number of skipped steps */
  skippedSteps: number;
  /** Workflow start time */
  startTime: number;
  /** Workflow end time */
  endTime?: number;
  /** Total execution duration */
  duration?: number;
  /** Total tokens used across all steps */
  totalTokensUsed?: number;
  /** Total retry count */
  retryCount: number;
}

/**
 * Step execution record
 */
export interface StepExecutionRecord {
  /** Step ID */
  stepId: string;
  /** Current status */
  status: StepStatus;
  /** Step input */
  input?: unknown;
  /** Step output */
  output?: unknown;
  /** Error if failed */
  error?: StepError;
  /** Execution metadata */
  metadata: StepMetadata;
  /** Number of attempts made */
  attempts: number;
}

/**
 * Workflow error
 */
export interface WorkflowError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Step ID where error occurred */
  stepId?: string;
  /** Original error cause */
  cause?: Error;
  /** Additional details */
  details?: JsonObject;
}

/**
 * Workflow execution result
 */
export interface WorkflowExecutionResult<TOutput = unknown> {
  /** Whether workflow succeeded */
  success: boolean;
  /** Final workflow status */
  status: WorkflowStatus;
  /** Workflow output */
  output?: TOutput;
  /** Error information if failed */
  error?: WorkflowError;
  /** Execution statistics */
  stats: WorkflowStats;
  /** Checkpoint for resumption (if suspended) */
  checkpoint?: WorkflowCheckpoint;
  /** Step execution details */
  stepResults: Map<string, StepExecutionRecord>;
}

// =============================================================================
// Event Types
// =============================================================================

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
export interface WorkflowEventBase {
  /** Event type */
  type: WorkflowEventType;
  /** Workflow ID */
  workflowId: string;
  /** Run ID */
  runId: string;
  /** Event timestamp */
  timestamp: number;
}

/**
 * Workflow start event
 */
export interface WorkflowStartEvent extends WorkflowEventBase {
  type: "workflow:start";
  input: unknown;
  metadata: WorkflowMetadata;
}

/**
 * Workflow complete event
 */
export interface WorkflowCompleteEvent extends WorkflowEventBase {
  type: "workflow:complete";
  output: unknown;
  stats: WorkflowStats;
}

/**
 * Workflow failed event
 */
export interface WorkflowFailedEvent extends WorkflowEventBase {
  type: "workflow:failed";
  error: WorkflowError;
  stats: WorkflowStats;
}

/**
 * Workflow suspended event
 */
export interface WorkflowSuspendedEvent extends WorkflowEventBase {
  type: "workflow:suspended";
  suspension: SuspensionRequest;
  checkpoint: WorkflowCheckpoint;
}

/**
 * Step start event
 */
export interface StepStartEvent extends WorkflowEventBase {
  type: "step:start";
  stepId: string;
  stepName: string;
  input: unknown;
}

/**
 * Step complete event
 */
export interface StepCompleteEvent extends WorkflowEventBase {
  type: "step:complete";
  stepId: string;
  stepName: string;
  output: unknown;
  duration: number;
}

/**
 * Step failed event
 */
export interface StepFailedEvent extends WorkflowEventBase {
  type: "step:failed";
  stepId: string;
  stepName: string;
  error: StepError;
  willRetry: boolean;
}

/**
 * Step retry event
 */
export interface StepRetryEvent extends WorkflowEventBase {
  type: "step:retry";
  stepId: string;
  stepName: string;
  attempt: number;
  maxAttempts: number;
  delay: number;
}

/**
 * Parallel start event
 */
export interface ParallelStartEvent extends WorkflowEventBase {
  type: "parallel:start";
  groupId: string;
  steps: string[];
}

/**
 * Parallel complete event
 */
export interface ParallelCompleteEvent extends WorkflowEventBase {
  type: "parallel:complete";
  groupId: string;
  completedSteps: string[];
  failedSteps: string[];
}

/**
 * Loop iteration event
 */
export interface LoopIterationEvent extends WorkflowEventBase {
  type: "loop:iteration";
  loopId: string;
  iteration: number;
  item?: unknown;
}

/**
 * Checkpoint created event
 */
export interface CheckpointCreatedEvent extends WorkflowEventBase {
  type: "checkpoint:created";
  checkpointId: string;
  stepId?: string;
}

/**
 * Union of all workflow events
 */
export type WorkflowEvent =
  | WorkflowStartEvent
  | WorkflowCompleteEvent
  | WorkflowFailedEvent
  | WorkflowSuspendedEvent
  | StepStartEvent
  | StepCompleteEvent
  | StepFailedEvent
  | StepRetryEvent
  | ParallelStartEvent
  | ParallelCompleteEvent
  | LoopIterationEvent
  | CheckpointCreatedEvent
  | (WorkflowEventBase & { data?: unknown });

/**
 * Workflow event handler type
 */
export type WorkflowEventHandler<E extends WorkflowEvent = WorkflowEvent> = (event: E) => void | Promise<void>;

/**
 * Workflow event map for typed event emitter
 */
export interface WorkflowEventMap {
  "workflow:start": [WorkflowStartEvent];
  "workflow:complete": [WorkflowCompleteEvent];
  "workflow:failed": [WorkflowFailedEvent];
  "workflow:suspended": [WorkflowSuspendedEvent];
  "step:start": [StepStartEvent];
  "step:complete": [StepCompleteEvent];
  "step:failed": [StepFailedEvent];
  "step:retry": [StepRetryEvent];
  "parallel:start": [ParallelStartEvent];
  "parallel:complete": [ParallelCompleteEvent];
  "loop:iteration": [LoopIterationEvent];
  "checkpoint:created": [CheckpointCreatedEvent];
}

// =============================================================================
// Builder Types
// =============================================================================

/**
 * Step configuration for builder API
 */
export interface StepConfig<TInput = unknown, TOutput = unknown> {
  /** Step name (optional, defaults to id) */
  name?: string;
  /** Step description */
  description?: string;
  /** Input validation schema */
  inputSchema?: z.ZodSchema<TInput>;
  /** Output validation schema */
  outputSchema?: z.ZodSchema<TOutput>;
  /** Step execution handler */
  execute: StepExecuteFunction<TInput, TOutput>;
  /** Retry configuration */
  retry?: Partial<RetryConfig>;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Whether step can be suspended */
  suspendable?: boolean;
  /** Tags for categorization */
  tags?: string[];
}

/**
 * Branch configuration for conditional execution
 */
export interface BranchConfig<TState = UnknownRecord> {
  /** Condition to evaluate */
  condition: (context: WorkflowContext<TState>) => boolean | Promise<boolean>;
  /** Target step ID */
  stepId: string;
  /** Step configuration */
  step: StepConfig;
  /** Optional label for this branch */
  label?: string;
}

/**
 * Parallel step configuration
 */
export interface ParallelStepConfig extends StepConfig {
  /** Step ID (required for parallel steps) */
  id: string;
}

/**
 * ForEach loop configuration
 */
export interface ForEachConfig<TItem = unknown, TState = UnknownRecord> {
  /** Function to get items to iterate over */
  items: (context: WorkflowContext<TState>) => TItem[] | Promise<TItem[]>;
  /** Variable name for current item in context */
  itemVariable?: string;
  /** Maximum iterations (safety limit) */
  maxIterations?: number;
}

/**
 * DoWhile/DoUntil loop configuration
 */
export interface ConditionLoopConfig<TState = UnknownRecord> {
  /** Condition to evaluate */
  condition: (context: WorkflowContext<TState>) => boolean | Promise<boolean>;
  /** Maximum iterations (safety limit) */
  maxIterations?: number;
}

// =============================================================================
// Storage Types
// =============================================================================

/**
 * Checkpoint storage interface
 */
export interface CheckpointStorage {
  /** Save a checkpoint */
  save(checkpoint: WorkflowCheckpoint): Promise<void>;
  /** Load a checkpoint by ID */
  load(checkpointId: string): Promise<WorkflowCheckpoint | null>;
  /** Load the latest checkpoint for a run */
  loadLatest(runId: string): Promise<WorkflowCheckpoint | null>;
  /** List checkpoints for a workflow */
  list(workflowId: string, limit?: number): Promise<WorkflowCheckpoint[]>;
  /** Delete a checkpoint */
  delete(checkpointId: string): Promise<boolean>;
  /** Delete all checkpoints for a run */
  deleteAll(runId: string): Promise<number>;
}

/**
 * In-memory checkpoint storage configuration
 */
export interface MemoryCheckpointConfig {
  type: "memory";
  /** Maximum checkpoints to retain */
  maxCheckpoints?: number;
}

/**
 * Redis checkpoint storage configuration
 */
export interface RedisCheckpointConfig {
  type: "redis";
  /** Redis URL */
  url: string;
  /** Key prefix */
  keyPrefix?: string;
  /** TTL in seconds */
  ttlSeconds?: number;
}

/**
 * Checkpoint storage configuration
 */
export type CheckpointStorageConfig = MemoryCheckpointConfig | RedisCheckpointConfig;
