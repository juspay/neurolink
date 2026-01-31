/**
 * NeuroLink Workflow System
 *
 * Mastra-inspired workflow engine providing declarative, type-safe orchestration
 * of complex AI operations with features like graph-based execution, conditional
 * branching, parallel execution, loops, checkpoint persistence, and HITL
 * suspend/resume patterns.
 *
 * @module workflow
 *
 * @example
 * ```typescript
 * import {
 *   createWorkflow,
 *   createStep,
 *   WorkflowExecutor,
 *   WorkflowRegistry,
 * } from '@neurolink/sdk/workflow';
 *
 * // Create a workflow using the fluent builder API
 * const workflow = createWorkflow('data-pipeline')
 *   .name('Data Processing Pipeline')
 *   .input(z.object({ url: z.string() }))
 *   .step('fetch', {
 *     execute: async (input, ctx) => {
 *       const data = await fetch(input.url);
 *       return { success: true, data: await data.json() };
 *     }
 *   })
 *   .then('process', {
 *     execute: async (input, ctx) => {
 *       const fetchOutput = ctx.getStepOutput('fetch');
 *       return { success: true, data: processed };
 *     }
 *   })
 *   .parallel([
 *     { id: 'analyze', execute: analyzeData },
 *     { id: 'validate', execute: validateData }
 *   ])
 *   .register();
 *
 * // Execute the workflow
 * const executor = new WorkflowExecutor(neurolink);
 * const result = await executor.execute(workflow, { url: 'https://api.example.com' });
 * ```
 */

// =============================================================================
// Types - Local workflow types (comprehensive)
// =============================================================================

export type {
  // Checkpoint Types
  CheckpointCreatedEvent,
  CheckpointStorage,
  CheckpointStorageConfig,
  // Graph Types
  ConditionalBranch,
  LoopDefinition,
  ParallelGroup,
  // Configuration Types
  RetryConfig,
  // Step Events
  StepCompleteEvent,
  StepConfig,
  StepDefinition,
  StepError,
  StepFailedEvent,
  StepMetadata,
  StepResult,
  StepRetryEvent,
  StepStartEvent,
  // Step Types
  StepStatus,
  SuspensionRequest,
  WorkflowCheckpoint,
  // Workflow Events
  WorkflowCompleteEvent,
  WorkflowContext,
  WorkflowDefinition,
  WorkflowEdge,
  WorkflowEventMap,
  // Event Types
  WorkflowEventType,
  WorkflowExecutionResult,
  WorkflowFailedEvent,
  WorkflowGraph,
  WorkflowStartEvent,
  // Workflow Types
  WorkflowStatus,
  WorkflowSuspendedEvent,
} from "./types/workflowTypes.js";

// =============================================================================
// Errors
// =============================================================================

export {
  BuilderError,
  CheckpointError,
  GraphError,
  RegistryError,
  StepExecutionError,
  SuspensionError as SuspensionErrorBase,
  WorkflowErrorCodes,
  WorkflowExecutionError,
  WorkflowTimeoutError as WorkflowTimeoutErrorBase,
  WorkflowValidationError,
  workflowErrorFactory,
} from "./errors/WorkflowError.js";

// =============================================================================
// Core Components from Main Implementation
// =============================================================================

// Checkpoint Manager
export {
  CheckpointManager,
  createCheckpointManager,
  MemoryCheckpointStorage,
  RedisCheckpointStorage as CheckpointRedisStorage,
} from "./CheckpointManager.js";
// Step Registry
export { StepRegistry } from "./StepRegistry.js";
export type {
  PendingSuspension,
  SuspensionTimeoutHandler,
} from "./SuspendResumeManager.js";
// Suspend/Resume Manager
export {
  createExternalSuspension,
  createHITLSuspension,
  createTimerSuspension,
  SuspendResumeManager,
} from "./SuspendResumeManager.js";
export type { WorkflowInstance } from "./WorkflowFactory.js";
// Workflow Factory
export { WorkflowFactory } from "./WorkflowFactory.js";

// =============================================================================
// Step Types from Main Implementation (steps/ directory)
// =============================================================================

export type {
  ConditionFunction,
  ConditionResult,
  ConditionStepConfig,
  MultiConditionStepConfig,
} from "./steps/ConditionStep.js";
// Condition Step
export {
  createComparisonStep,
  createConditionStepFactory,
  createIfElseStep,
  createMultiConditionStepFactory,
  createNullCheckStep,
  createSwitchStep,
} from "./steps/ConditionStep.js";
export type {
  ApprovalStepConfig,
  EscalationStepConfig,
  HumanActionType,
  HumanInputStepConfig,
  HumanStepResult,
  ReviewStepConfig,
} from "./steps/HumanStep.js";
// Human Step
export {
  createApprovalStep,
  createApprovalStepFactory,
  createConfirmationStep,
  createDangerousActionConfirmation,
  createEscalationStep,
  createEscalationStepFactory,
  createHumanInputStepFactory,
  createHumanStepFactory,
  createInputStep,
  createReviewStep,
  createReviewStepFactory,
} from "./steps/HumanStep.js";
export type {
  DoWhileLoopStepConfig,
  ForEachLoopStepConfig,
  ItemsProviderFunction,
  LoopBodyFunction,
  LoopConditionFunction,
  LoopResult,
  RepeatLoopStepConfig,
} from "./steps/LoopStep.js";
// Loop Step
export {
  createDoUntilLoopStepFactory,
  createDoWhileLoopStepFactory,
  createForEachLoopStepFactory,
  createForEachStep,
  createLoopStepFactory,
  createRepeatLoopStepFactory,
  createRepeatStep,
  createRetryLoopStep,
} from "./steps/LoopStep.js";
export type {
  BatchParallelStepConfig,
  ParallelResult,
  ParallelStepConfig,
  ParallelTaskFunction,
} from "./steps/ParallelStep.js";
// Parallel Step
export {
  createBatchParallelStepFactory,
  createParallelAPIStep,
  createParallelMapStep,
  createParallelStepFactory,
  createScatterGatherStep,
} from "./steps/ParallelStep.js";
export type {
  TransformFunction,
  TransformStepConfig,
} from "./steps/TransformStep.js";
// Transform Step
export {
  createFilterStep,
  createMapStep,
  createOmitStep,
  createPickStep,
  createReduceStep,
  createTransformStepFactory,
} from "./steps/TransformStep.js";
export type {
  ConditionWaitStepConfig,
  ExternalWaitStepConfig,
  TimerWaitStepConfig,
  WaitConditionFunction,
  WaitResult,
} from "./steps/WaitStep.js";
// Wait Step
export {
  createBackoffWaitStep,
  createConditionWaitStepFactory,
  createDelayStep,
  createExternalWaitStepFactory,
  createRateLimitWaitStep,
  createScheduledWaitStep,
  createTimerWaitStepFactory,
  createWaitForStateStep,
  createWaitStepFactory,
  createWaitUntilStep,
} from "./steps/WaitStep.js";

// =============================================================================
// Original Target Implementation Components
// =============================================================================

// Step creation (original target)
export { createStep, Step } from "./step.js";

// Step Helpers (specialized step factory functions from target)
export {
  type AIStepConfig,
  aiStep,
  type ConditionStepConfig as StepHelperConditionConfig,
  conditionStep,
  type HumanStepConfig,
  httpStep,
  humanStep,
  humanStepWithResume,
  type ToolStepConfig,
  toolStep,
  transformStep,
  validateStep,
} from "./stepHelpers.js";

// Graph Utilities
export {
  buildGraph,
  dependsOn,
  detectCycles,
  findCommonAncestors,
  findEndPoints,
  findEntryPoints,
  findForkPoints,
  findLongestPath,
  findMergePoints,
  type GraphNode,
  getAllPredecessors,
  getAllSuccessors,
  getExecutionOrder,
  hasCycles,
  topologicalSort,
  validateGraph,
} from "./utils/graphUtils.js";
// Workflow Builder (original target - camelCase)
export { createWorkflow, WorkflowBuilder } from "./workflowBuilder.js";

// Event Stream (original target)
export {
  createEventStream,
  type EventCallback,
  type EventFilter,
  type Subscription,
  WorkflowEventStream,
} from "./workflowEventStream.js";
// Workflow Executor (original target - camelCase)
// Re-export for convenience
export {
  SuspensionError,
  WorkflowCancelledError,
  WorkflowExecutor,
  WorkflowTimeoutError,
} from "./workflowExecutor.js";
// Workflow Registry (original target - camelCase)
export {
  getWorkflow,
  listWorkflows,
  registerWorkflow,
  WorkflowRegistry,
} from "./workflowRegistry.js";

// Workflow State Manager (original target)
export {
  type CheckpointStorage as StateCheckpointStorage,
  InMemoryCheckpointStorage,
  RedisCheckpointStorage,
  WorkflowStateManager,
} from "./workflowStateManager.js";

// =============================================================================
// Convenience Functions
// =============================================================================

// NOTE: Use the WorkflowBuilder class for creating workflows:
// const workflow = createWorkflow('my-workflow')
//   .name('My Workflow')
//   .step('step1', { execute: async (input, ctx) => ({ success: true, data: input }) })
//   .build();
