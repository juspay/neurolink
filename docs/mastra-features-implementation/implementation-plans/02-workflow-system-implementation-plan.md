# Advanced Workflow System Implementation Plan

**Version**: 1.0.0
**Created**: January 2026
**Status**: Planning
**Reference Document**: `../02-advanced-workflow-system.md`

---

## Executive Summary

This document provides a detailed phased implementation plan for adding Mastra-style advanced workflow capabilities to NeuroLink. The workflow system enables declarative, type-safe orchestration of complex AI operations with features like graph-based execution, conditional branching, parallel execution, loops, and suspension/resumption.

### Estimated Total Duration: 6-8 weeks

### Estimated Total Effort: 200-280 developer hours

---

## Table of Contents

1. [Prerequisites and Dependencies](#1-prerequisites-and-dependencies)
2. [Phase 1: Core Workflow Types and Interfaces](#2-phase-1-core-workflow-types-and-interfaces)
3. [Phase 2: Step Builder Implementation](#3-phase-2-step-builder-implementation)
4. [Phase 3: Workflow Engine](#4-phase-3-workflow-engine)
5. [Phase 4: Suspension/Resumption System](#5-phase-4-suspensionresumption-system)
6. [Phase 5: Workflow Persistence](#6-phase-5-workflow-persistence)
7. [Phase 6: CLI Commands and Testing](#7-phase-6-cli-commands-and-testing)
8. [Effort Summary](#8-effort-summary)
9. [Risk Assessment](#9-risk-assessment)
10. [Success Criteria and Validation](#10-success-criteria-and-validation)

---

## 1. Prerequisites and Dependencies

### 1.1 Required Existing Components

The workflow system depends on several existing NeuroLink components:

| Component             | Location                                | Purpose                                  | Status     |
| --------------------- | --------------------------------------- | ---------------------------------------- | ---------- |
| **ProviderFactory**   | `src/lib/factories/providerFactory.ts`  | Provider instantiation pattern to follow | Production |
| **ProviderRegistry**  | `src/lib/factories/providerRegistry.ts` | Registry pattern to follow               | Production |
| **TypedEventEmitter** | `src/lib/types/common.ts`               | Event emission for workflow events       | Production |
| **MCPToolRegistry**   | `src/lib/mcp/toolRegistry.ts`           | Tool integration within steps            | Production |
| **NeuroLink class**   | `src/lib/neurolink.ts`                  | SDK integration point                    | Production |
| **p-limit**           | `package.json`                          | Parallel execution concurrency           | Installed  |
| **Zod**               | `package.json`                          | Schema validation                        | Installed  |
| **Redis client**      | Optional                                | Checkpoint persistence                   | Optional   |

### 1.2 External Dependencies to Add

```json
{
  "dependencies": {
    "graphlib": "^2.1.8" // Optional: For advanced graph operations
  },
  "devDependencies": {
    "@types/graphlib": "^2.1.12"
  }
}
```

**Note**: The `graphlib` dependency is optional. A lightweight internal implementation can be used for basic DAG operations.

### 1.3 Prerequisites Checklist

Before starting implementation, verify:

- [ ] NeuroLink SDK builds successfully (`pnpm run build`)
- [ ] All existing tests pass (`pnpm test`)
- [ ] TypeScript types compile cleanly (`pnpm run check`)
- [ ] Understanding of Factory + Registry pattern (see `00-neurolink-architecture-patterns.md`)
- [ ] Understanding of NeuroLink's event system (`TypedEventEmitter`)
- [ ] Redis environment available for testing persistence (optional)

### 1.4 Development Environment Setup

```bash
# Clone and setup
cd neurolink
pnpm install

# Verify existing functionality
pnpm run check
pnpm test

# Create workflow directory structure
mkdir -p src/lib/workflow
mkdir -p src/lib/workflow/utils
mkdir -p test/workflow
mkdir -p test/workflow/integration
```

---

## 2. Phase 1: Core Workflow Types and Interfaces

### 2.1 Overview

**Duration**: 1 week (40-48 hours)
**Effort**: 40-48 developer hours
**Deliverables**: Complete type system for workflow orchestration

### 2.2 Tasks

#### Task 1.1: Create Core Type Definitions (16-20 hours)

**File**: `src/lib/types/workflowTypes.ts`

Create comprehensive type definitions following NeuroLink's type organization patterns:

```typescript
// Types to implement:
// - StepStatus, WorkflowStatus
// - StepDefinition<TInput, TOutput, TContext>
// - StepResult<T>
// - StepError, StepMetadata
// - RetryConfig
// - SuspensionRequest
// - WorkflowContext<TGlobalState>
// - WorkflowMetadata
// - WorkflowDefinition<TInput, TOutput, TState>
// - WorkflowGraph, WorkflowEdge, EdgeCondition
// - ParallelGroup, ConditionalBranch, LoopDefinition
// - WorkflowExecutionOptions, WorkflowExecutionResult
// - WorkflowCheckpoint
// - WorkflowStats, StepExecutionRecord
```

**Implementation Checklist**:

- [ ] Define `StepStatus` type (`"pending" | "running" | "completed" | "failed" | "skipped" | "suspended"`)
- [ ] Define `WorkflowStatus` type (`"idle" | "running" | "paused" | "suspended" | "completed" | "failed" | "cancelled"`)
- [ ] Define `StepDefinition` with generics for input/output/context
- [ ] Define `StepResult` with success, data, error, metadata, suspend fields
- [ ] Define `StepError` with code, message, details, retryable, cause
- [ ] Define `RetryConfig` with maxAttempts, delays, backoff
- [ ] Define `SuspensionRequest` for HITL and external waits
- [ ] Define `WorkflowContext` with state, stepOutputs, helpers
- [ ] Define `WorkflowDefinition` with graph structure
- [ ] Define graph types: `WorkflowGraph`, `WorkflowEdge`, `EdgeCondition`
- [ ] Define execution constructs: `ParallelGroup`, `ConditionalBranch`, `LoopDefinition`
- [ ] Define `WorkflowCheckpoint` for persistence
- [ ] Add JSDoc documentation for all types

#### Task 1.2: Create Workflow Event Types (8-10 hours)

**File**: `src/lib/types/workflowTypes.ts` (continued)

Define event types for real-time workflow streaming:

```typescript
// Event types to implement:
// - WorkflowEventType (union of all event type strings)
// - WorkflowEventBase
// - WorkflowStartEvent, WorkflowCompleteEvent, WorkflowFailedEvent
// - StepStartEvent, StepCompleteEvent, StepFailedEvent, StepSkippedEvent
// - BranchEvaluatedEvent
// - ParallelStartEvent, ParallelCompleteEvent
// - LoopIterationEvent, LoopCompleteEvent
// - CheckpointCreatedEvent, CheckpointRestoredEvent
// - WorkflowEvent (union type)
```

**Implementation Checklist**:

- [ ] Define `WorkflowEventType` string literal union
- [ ] Define base event type with workflowId, runId, timestamp
- [ ] Define workflow lifecycle events (start, complete, failed, suspended, resumed, cancelled)
- [ ] Define step lifecycle events (start, complete, failed, skipped, retry, suspended)
- [ ] Define control flow events (branch:evaluated, parallel:start/complete, loop:iteration/complete)
- [ ] Define persistence events (checkpoint:created, checkpoint:restored)
- [ ] Create union type `WorkflowEvent` for all events
- [ ] Add type guards for event discrimination

#### Task 1.3: Export Types from Index (4-6 hours)

**File**: `src/lib/types/index.ts`

Update the main types index to export workflow types:

```typescript
// Add to existing exports
export * from "./workflowTypes.js";
```

**Implementation Checklist**:

- [ ] Add export statement to `src/lib/types/index.ts`
- [ ] Verify no circular dependencies
- [ ] Run type checking (`pnpm run check`)
- [ ] Update any conflicting type names

#### Task 1.4: Create Workflow Module Index (4-6 hours)

**File**: `src/lib/workflow/index.ts`

Create the public export interface for the workflow module:

```typescript
// Public exports for workflow module
export { Step, createStep } from "./step.js";
export { WorkflowBuilder, createWorkflow } from "./workflowBuilder.js";
export { WorkflowRegistry } from "./workflowRegistry.js";
export { WorkflowExecutor } from "./workflowExecutor.js";
export {
  WorkflowStateManager,
  InMemoryCheckpointStorage,
  RedisCheckpointStorage,
} from "./workflowStateManager.js";
export { WorkflowEventStream } from "./workflowEventStream.js";

// Re-export types
export type {
  StepDefinition,
  StepResult,
  WorkflowDefinition,
  WorkflowContext,
  WorkflowCheckpoint,
  WorkflowExecutionOptions,
  WorkflowExecutionResult,
  WorkflowEvent,
} from "../types/workflowTypes.js";
```

**Implementation Checklist**:

- [ ] Create placeholder `index.ts` with exports (update as components are implemented)
- [ ] Follow NeuroLink's export patterns
- [ ] Verify module resolution works

#### Task 1.5: Documentation (8-10 hours)

- [ ] Add inline JSDoc for all public types
- [ ] Create type reference documentation
- [ ] Add usage examples in comments

### 2.3 Phase 1 Deliverables

| Deliverable    | File                             | Description               |
| -------------- | -------------------------------- | ------------------------- |
| Workflow Types | `src/lib/types/workflowTypes.ts` | Complete type definitions |
| Type Exports   | `src/lib/types/index.ts`         | Updated type exports      |
| Module Index   | `src/lib/workflow/index.ts`      | Public API exports        |

### 2.4 Phase 1 Exit Criteria

- [ ] All types compile without errors
- [ ] No circular dependency warnings
- [ ] Types are importable from `@juspay/neurolink`
- [ ] JSDoc documentation complete

---

## 3. Phase 2: Step Builder Implementation

### 3.1 Overview

**Duration**: 1.5 weeks (48-56 hours)
**Effort**: 48-56 developer hours
**Deliverables**: Step class, WorkflowBuilder, WorkflowRegistry

### 3.2 Tasks

#### Task 2.1: Implement Step Class (16-20 hours)

**File**: `src/lib/workflow/step.ts`

Implement the core Step class for executing individual workflow steps:

```typescript
// Step class features:
// - Input/output schema validation with Zod
// - Configurable retry with exponential backoff
// - Timeout support
// - Suspension capability for HITL
// - Metadata tracking
```

**Implementation Checklist**:

- [ ] Create `Step<TInput, TOutput>` class
- [ ] Implement constructor with default retry config
- [ ] Implement `validateInput()` method using Zod safeParse
- [ ] Implement `validateOutput()` method using Zod safeParse
- [ ] Implement `execute()` method with retry logic
- [ ] Implement `executeWithTimeout()` private method
- [ ] Implement exponential backoff calculation
- [ ] Implement `createStepError()` for error normalization
- [ ] Implement `isRetryable()` check
- [ ] Implement `createMetadata()` for execution stats
- [ ] Create `createStep()` factory function
- [ ] Add comprehensive logging
- [ ] Write unit tests

**Default Configuration**:

```typescript
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};
```

#### Task 2.2: Implement WorkflowRegistry (8-12 hours)

**File**: `src/lib/workflow/workflowRegistry.ts`

Implement the central registry for workflow definitions, following the ProviderFactory pattern:

```typescript
// WorkflowRegistry features:
// - Static workflow registration
// - Lookup by ID
// - List all workflows
// - Unregister workflows
// - Clear for testing
```

**Implementation Checklist**:

- [ ] Create `WorkflowRegistry` static class
- [ ] Implement `register<TInput, TOutput, TState>()` method
- [ ] Implement `get<TInput, TOutput, TState>()` method with generics
- [ ] Implement `has()` method
- [ ] Implement `list()` method returning id, name, version
- [ ] Implement `unregister()` method
- [ ] Implement `clear()` method for testing
- [ ] Implement `count()` method
- [ ] Add logging for registration events
- [ ] Write unit tests

#### Task 2.3: Implement WorkflowBuilder (20-24 hours)

**File**: `src/lib/workflow/workflowBuilder.ts`

Implement the fluent builder API for constructing workflows:

```typescript
// WorkflowBuilder fluent API:
// - .name(), .describe(), .setVersion()
// - .input(), .output() with Zod schemas
// - .state() for initial state factory
// - .setTimeout(), .tag()
// - .step() for adding steps
// - .then() for sequential steps
// - .parallel() for concurrent execution
// - .branch() for conditional paths
// - .forEach() for collection iteration
// - .doWhile(), .doUntil() for conditional loops
// - .build() to create WorkflowDefinition
// - .register() to build and register
```

**Implementation Checklist**:

- [ ] Create `WorkflowBuilder<TInput, TOutput, TState>` class
- [ ] Implement constructor with workflowId
- [ ] Implement `name()` method
- [ ] Implement `describe()` method
- [ ] Implement `setVersion()` method
- [ ] Implement `input<T>()` method with type inference
- [ ] Implement `output<T>()` method with type inference
- [ ] Implement `state<T>()` method with type inference
- [ ] Implement `setTimeout()` method
- [ ] Implement `tag()` method
- [ ] Implement `step()` method for adding steps
- [ ] Implement `then()` method (alias for step with edge)
- [ ] Implement `parallel()` method with options
- [ ] Implement `branch()` method with conditions
- [ ] Implement `forEach()` method for collections
- [ ] Implement `doWhile()` method with condition
- [ ] Implement `doUntil()` method (inverted doWhile)
- [ ] Implement `build()` method to create definition
- [ ] Implement `register()` method to build and register
- [ ] Add graph edge management
- [ ] Create merge points for parallel/branch
- [ ] Create `createWorkflow()` factory function
- [ ] Write unit tests

**Key Implementation Details**:

```typescript
// Parallel groups create merge points
const mergePointId = `merge-${groupId}`;
this.steps.set(mergePointId, {
  id: mergePointId,
  name: `Merge ${groupId}`,
  execute: async () => ({ success: true, data: null }),
});

// Branch conditions use function evaluation
branches: Array<{
  condition: (context: WorkflowContext<TState>) => boolean | Promise<boolean>;
  targetStep: string;
  label?: string;
}>;
```

#### Task 2.4: Validation Utilities (4-8 hours)

**File**: `src/lib/workflow/utils/graphUtils.ts`

Implement graph validation utilities:

**Implementation Checklist**:

- [ ] Implement `validateGraph()` function for cycle detection
- [ ] Implement `findEntryPoints()` function
- [ ] Implement `findEndPoints()` function
- [ ] Implement `topologicalSort()` for execution ordering
- [ ] Add validation for orphan steps
- [ ] Add validation for invalid step references
- [ ] Write unit tests

### 3.3 Phase 2 Deliverables

| Deliverable      | File                                    | Description               |
| ---------------- | --------------------------------------- | ------------------------- |
| Step Class       | `src/lib/workflow/step.ts`              | Step execution with retry |
| WorkflowRegistry | `src/lib/workflow/workflowRegistry.ts`  | Workflow registration     |
| WorkflowBuilder  | `src/lib/workflow/workflowBuilder.ts`   | Fluent builder API        |
| Graph Utils      | `src/lib/workflow/utils/graphUtils.ts`  | Graph validation          |
| Unit Tests       | `test/workflow/step.test.ts`            | Step tests                |
| Unit Tests       | `test/workflow/workflowBuilder.test.ts` | Builder tests             |

### 3.4 Phase 2 Exit Criteria

- [ ] Step class executes with retry and timeout
- [ ] WorkflowBuilder produces valid WorkflowDefinition
- [ ] WorkflowRegistry registers and retrieves workflows
- [ ] All unit tests pass
- [ ] Graph validation detects cycles and invalid references

---

## 4. Phase 3: Workflow Engine

### 4.1 Overview

**Duration**: 2 weeks (64-80 hours)
**Effort**: 64-80 developer hours
**Deliverables**: WorkflowExecutor with full execution capabilities

### 4.2 Tasks

#### Task 3.1: Core Executor Implementation (24-32 hours)

**File**: `src/lib/workflow/workflowExecutor.ts`

Implement the main execution engine:

```typescript
// WorkflowExecutor features:
// - Execute workflow by ID or definition
// - Graph-based step execution
// - Context management
// - Step result recording
// - Event emission
// - Cancellation support
```

**Implementation Checklist**:

- [ ] Create `WorkflowExecutor` class extending EventEmitter
- [ ] Implement constructor with NeuroLink and options
- [ ] Implement `execute()` method (by workflow ID)
- [ ] Implement `executeWorkflow()` method (by definition)
- [ ] Implement `createContext()` for workflow context
- [ ] Implement `executeGraph()` for graph traversal
- [ ] Implement step execution with event emission
- [ ] Implement `cancel()` method with AbortController
- [ ] Implement `findNextStep()` for graph traversal
- [ ] Implement `resolveStepInput()` for data flow
- [ ] Track running workflows with runId
- [ ] Emit workflow lifecycle events
- [ ] Emit step lifecycle events
- [ ] Handle timeouts at workflow level
- [ ] Write unit tests

**Context Creation**:

```typescript
private createContext<TInput, TOutput, TState>(
  workflow: WorkflowDefinition<TInput, TOutput, TState>,
  runId: string,
  input: TInput,
  options: WorkflowExecutionOptions
): WorkflowContext<TState> {
  return {
    workflowId: workflow.id,
    workflowName: workflow.name,
    runId,
    state: initialState,
    stepOutputs: new Map(),
    getStepOutput: <T>(stepId: string) => stepOutputs.get(stepId) as T,
    updateState: (updates) => Object.assign(state, updates),
    suspend: (request) => { throw new SuspensionError(request); },
    neurolink: this.neurolink,
    logger,
    metadata: { startTime: Date.now(), ... },
  };
}
```

#### Task 3.2: Parallel Execution (12-16 hours)

**File**: `src/lib/workflow/workflowExecutor.ts` (continued)

Implement parallel step execution:

**Implementation Checklist**:

- [ ] Implement `executeParallelGroup()` method
- [ ] Use p-limit for concurrency control
- [ ] Support `waitFor: "all" | "any"` options
- [ ] Support `continueOnError` option
- [ ] Emit parallel:start and parallel:complete events
- [ ] Implement `findMergePoint()` for graph navigation
- [ ] Handle partial failures
- [ ] Aggregate results from parallel steps
- [ ] Write unit tests for parallel execution

**Parallel Execution Pattern**:

```typescript
const limit = pLimit(this.defaultConcurrency);
const promises = group.steps.map((stepId) =>
  limit(async () => {
    // Execute step with signal for cancellation
    const step = new Step(workflow.steps.get(stepId)!);
    return step.execute(input, context);
  }),
);

const results =
  group.waitFor === "all"
    ? await Promise.all(promises)
    : await Promise.race(promises.map((p) => p.then((r) => [r])));
```

#### Task 3.3: Conditional Branching (12-16 hours)

**File**: `src/lib/workflow/workflowExecutor.ts` (continued)

Implement conditional branch evaluation:

**Implementation Checklist**:

- [ ] Implement `evaluateBranch()` method
- [ ] Support function-based conditions
- [ ] Support expression-based conditions (optional)
- [ ] Handle async condition evaluation
- [ ] Return target step ID
- [ ] Handle default branch when no conditions match
- [ ] Emit branch:evaluated events
- [ ] Write unit tests for branching

**Branch Evaluation Pattern**:

```typescript
private async evaluateBranch<TState>(
  branch: ConditionalBranch,
  context: WorkflowContext<TState>
): Promise<string> {
  for (const b of branch.branches) {
    if (b.condition.evaluate) {
      const result = await b.condition.evaluate(context);
      if (result) {
        this.emitEvent({ type: "branch:evaluated", ... });
        return b.targetStep;
      }
    }
  }
  if (branch.defaultTarget) return branch.defaultTarget;
  throw new Error(`No branch condition matched for ${branch.id}`);
}
```

#### Task 3.4: Loop Execution (16-20 hours)

**File**: `src/lib/workflow/workflowExecutor.ts` (continued)

Implement loop constructs:

**Implementation Checklist**:

- [ ] Implement `executeLoop()` method
- [ ] Support `forEach` loop type
- [ ] Support `doWhile` loop type
- [ ] Support `doUntil` loop type
- [ ] Support `repeat` loop type (fixed iterations)
- [ ] Implement max iterations safety limit
- [ ] Handle loop variable in context
- [ ] Emit loop:iteration events
- [ ] Emit loop:complete events
- [ ] Implement `findLoopEndPoint()` for graph navigation
- [ ] Write unit tests for each loop type

**Loop Execution Pattern**:

```typescript
switch (loop.type) {
  case "forEach": {
    const items = context.state[loop.itemVariable] as unknown[];
    for (const item of items) {
      if (iteration >= loop.maxIterations) break;
      context.state[loop.itemVariable] = item;
      // Execute loop steps
      iteration++;
    }
    break;
  }
  case "doWhile": {
    do {
      // Execute loop steps
      iteration++;
      const shouldContinue = await loop.condition.evaluate(context);
      if (!shouldContinue) break;
    } while (iteration < loop.maxIterations);
    break;
  }
}
```

### 4.3 Phase 3 Deliverables

| Deliverable       | File                                             | Description               |
| ----------------- | ------------------------------------------------ | ------------------------- |
| WorkflowExecutor  | `src/lib/workflow/workflowExecutor.ts`           | Complete execution engine |
| Unit Tests        | `test/workflow/workflowExecutor.test.ts`         | Executor tests            |
| Integration Tests | `test/workflow/integration/workflow-e2e.test.ts` | End-to-end tests          |

### 4.4 Phase 3 Exit Criteria

- [ ] Sequential workflows execute correctly
- [ ] Parallel workflows execute with proper concurrency
- [ ] Conditional branching evaluates correctly
- [ ] All loop types execute correctly
- [ ] Cancellation works via AbortController
- [ ] Events emit at correct lifecycle points
- [ ] All tests pass

---

## 5. Phase 4: Suspension/Resumption System

### 5.1 Overview

**Duration**: 1 week (32-40 hours)
**Effort**: 32-40 developer hours
**Deliverables**: Complete suspension and resumption capability

### 5.2 Tasks

#### Task 4.1: SuspensionError Implementation (4-6 hours)

**File**: `src/lib/workflow/workflowExecutor.ts`

Implement the custom error class for suspension:

```typescript
class SuspensionError extends Error {
  suspension: SuspensionRequest;

  constructor(suspension: SuspensionRequest) {
    super(`Workflow suspended: ${suspension.reason}`);
    this.name = "SuspensionError";
    this.suspension = suspension;
  }
}
```

**Implementation Checklist**:

- [ ] Create `SuspensionError` class
- [ ] Implement suspension request capture
- [ ] Handle suspension in executor catch block
- [ ] Create checkpoint on suspension
- [ ] Emit workflow:suspended event

#### Task 4.2: Checkpoint Creation (12-16 hours)

**File**: `src/lib/workflow/workflowExecutor.ts` (continued)

Implement checkpoint creation for workflow state:

**Implementation Checklist**:

- [ ] Implement `createCheckpoint()` method
- [ ] Capture current workflow state
- [ ] Capture completed step outputs
- [ ] Capture step execution records
- [ ] Capture pending steps list
- [ ] Include suspension information
- [ ] Add version for compatibility
- [ ] Emit checkpoint:created event
- [ ] Write unit tests

**Checkpoint Structure**:

```typescript
const checkpoint: WorkflowCheckpoint = {
  id: randomUUID(),
  workflowId: workflow.id,
  runId,
  timestamp: Date.now(),
  status: suspension ? "suspended" : "paused",
  state: context.state,
  stepOutputs: Object.fromEntries(context.stepOutputs),
  stepRecords: Object.fromEntries(stepResults),
  pendingSteps: this.findPendingSteps(workflow, context),
  suspension,
  version: workflow.version ?? "1.0.0",
};
```

#### Task 4.3: Resume Implementation (12-16 hours)

**File**: `src/lib/workflow/workflowExecutor.ts` (continued)

Implement workflow resumption from checkpoint:

**Implementation Checklist**:

- [ ] Implement `resume()` method
- [ ] Validate checkpoint workflow exists
- [ ] Merge resume data into checkpoint state
- [ ] Call `restoreFromCheckpoint()` during execution
- [ ] Implement `restoreFromCheckpoint()` method
- [ ] Restore state to context
- [ ] Restore step outputs
- [ ] Update metadata with resumedAt
- [ ] Emit checkpoint:restored event
- [ ] Emit workflow:resumed event
- [ ] Continue execution from pending steps
- [ ] Write unit tests for resume scenarios

**Resume Pattern**:

```typescript
async resume<TOutput>(
  checkpoint: WorkflowCheckpoint,
  resumeData?: UnknownRecord
): Promise<WorkflowExecutionResult<TOutput>> {
  const workflow = WorkflowRegistry.get(checkpoint.workflowId);
  if (!workflow) throw new Error(`Workflow not found: ${checkpoint.workflowId}`);

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
```

#### Task 4.4: HITL Integration (4-6 hours)

Ensure suspension works with existing HITL system:

**Implementation Checklist**:

- [ ] Document HITL suspension type
- [ ] Support callbackId for external callbacks
- [ ] Support expiresAt for timeout handling
- [ ] Add examples for HITL suspension patterns
- [ ] Write integration test with HITL

### 5.3 Phase 4 Deliverables

| Deliverable         | File                                   | Description             |
| ------------------- | -------------------------------------- | ----------------------- |
| SuspensionError     | `src/lib/workflow/workflowExecutor.ts` | Suspension error class  |
| Checkpoint Creation | `src/lib/workflow/workflowExecutor.ts` | createCheckpoint method |
| Resume Capability   | `src/lib/workflow/workflowExecutor.ts` | resume method           |
| Unit Tests          | `test/workflow/suspension.test.ts`     | Suspension tests        |

### 5.4 Phase 4 Exit Criteria

- [ ] Workflows can request suspension via context.suspend()
- [ ] Checkpoints capture complete workflow state
- [ ] Workflows resume correctly from checkpoints
- [ ] Resume data merges into state correctly
- [ ] Events emit for suspension/resumption lifecycle
- [ ] HITL scenarios work correctly

---

## 6. Phase 5: Workflow Persistence

### 6.1 Overview

**Duration**: 1 week (32-40 hours)
**Effort**: 32-40 developer hours
**Deliverables**: WorkflowStateManager with multiple storage backends

### 6.2 Tasks

#### Task 5.1: CheckpointStorage Interface (4-6 hours)

**File**: `src/lib/workflow/workflowStateManager.ts`

Define the storage adapter interface:

```typescript
export type CheckpointStorage = {
  save(checkpoint: WorkflowCheckpoint): Promise<void>;
  load(checkpointId: string): Promise<WorkflowCheckpoint | undefined>;
  loadByRunId(runId: string): Promise<WorkflowCheckpoint | undefined>;
  list(workflowId?: string): Promise<WorkflowCheckpoint[]>;
  delete(checkpointId: string): Promise<boolean>;
  deleteByRunId(runId: string): Promise<boolean>;
};
```

**Implementation Checklist**:

- [ ] Define `CheckpointStorage` interface
- [ ] Document method contracts
- [ ] Add JSDoc for implementers

#### Task 5.2: InMemoryCheckpointStorage (8-10 hours)

**File**: `src/lib/workflow/workflowStateManager.ts` (continued)

Implement in-memory storage for development:

**Implementation Checklist**:

- [ ] Create `InMemoryCheckpointStorage` class
- [ ] Implement `save()` with Map storage
- [ ] Implement `load()` by checkpoint ID
- [ ] Implement `loadByRunId()` with index
- [ ] Implement `list()` with optional filter
- [ ] Implement `delete()` by checkpoint ID
- [ ] Implement `deleteByRunId()`
- [ ] Maintain runId -> checkpointId index
- [ ] Write unit tests

#### Task 5.3: RedisCheckpointStorage (12-16 hours)

**File**: `src/lib/workflow/workflowStateManager.ts` (continued)

Implement Redis storage for production:

**Implementation Checklist**:

- [ ] Create `RedisCheckpointStorage` class
- [ ] Accept Redis client in constructor
- [ ] Configure key prefix (default: `neurolink:workflow:checkpoint:`)
- [ ] Configure TTL (default: 7 days)
- [ ] Implement `save()` with setEx
- [ ] Implement `load()` with get and parse
- [ ] Implement `loadByRunId()` with index key
- [ ] Implement `list()` with key scanning
- [ ] Implement `delete()` with cleanup
- [ ] Implement `deleteByRunId()`
- [ ] Handle JSON serialization/deserialization
- [ ] Write unit tests with Redis mock

**Redis Key Structure**:

```
neurolink:workflow:checkpoint:{checkpointId}  -> JSON checkpoint
neurolink:workflow:checkpoint:runid:{runId}   -> checkpointId
```

#### Task 5.4: WorkflowStateManager (8-12 hours)

**File**: `src/lib/workflow/workflowStateManager.ts` (continued)

Implement the state manager facade:

**Implementation Checklist**:

- [ ] Create `WorkflowStateManager` class
- [ ] Accept optional storage in constructor
- [ ] Default to InMemoryCheckpointStorage
- [ ] Implement `saveCheckpoint()` with logging
- [ ] Implement `loadCheckpoint()` by ID
- [ ] Implement `loadCheckpointByRunId()`
- [ ] Implement `listCheckpoints()` with filter
- [ ] Implement `deleteCheckpoint()`
- [ ] Implement `deleteCheckpointByRunId()`
- [ ] Implement `setStorage()` for runtime swap
- [ ] Write unit tests

### 6.3 Phase 5 Deliverables

| Deliverable       | File                                         | Description                 |
| ----------------- | -------------------------------------------- | --------------------------- |
| Storage Interface | `src/lib/workflow/workflowStateManager.ts`   | CheckpointStorage interface |
| In-Memory Storage | `src/lib/workflow/workflowStateManager.ts`   | InMemoryCheckpointStorage   |
| Redis Storage     | `src/lib/workflow/workflowStateManager.ts`   | RedisCheckpointStorage      |
| State Manager     | `src/lib/workflow/workflowStateManager.ts`   | WorkflowStateManager facade |
| Unit Tests        | `test/workflow/workflowStateManager.test.ts` | Storage tests               |

### 6.4 Phase 5 Exit Criteria

- [ ] In-memory storage works for development
- [ ] Redis storage works for production
- [ ] Storage can be swapped at runtime
- [ ] Checkpoints persist correctly
- [ ] Checkpoints restore correctly
- [ ] TTL expiration works for Redis
- [ ] All storage tests pass

---

## 7. Phase 6: CLI Commands and Testing

### 7.1 Overview

**Duration**: 1.5 weeks (48-56 hours)
**Effort**: 48-56 developer hours
**Deliverables**: CLI commands, event streaming, SDK integration, comprehensive tests

### 7.2 Tasks

#### Task 6.1: WorkflowEventStream (12-16 hours)

**File**: `src/lib/workflow/workflowEventStream.ts`

Implement async event streaming:

**Implementation Checklist**:

- [ ] Create `WorkflowEventStream` class
- [ ] Accept EventEmitter (executor) in constructor
- [ ] Implement `filter()` method for event types
- [ ] Implement `events()` async generator
- [ ] Implement `on()` subscription method
- [ ] Implement `waitForCompletion()` method
- [ ] Implement `end()` method
- [ ] Setup internal event listeners
- [ ] Handle event buffering
- [ ] Handle stream termination
- [ ] Write unit tests

**Async Iterator Pattern**:

```typescript
async *events(): AsyncGenerator<WorkflowEvent, void, unknown> {
  while (!this.ended) {
    const event = await this.nextEvent();
    if (event) yield event;
  }
  // Drain remaining buffer
  while (this.buffer.length > 0) {
    yield this.buffer.shift()!;
  }
}
```

#### Task 6.2: SDK Integration (8-12 hours)

**File**: `src/lib/neurolink.ts`

Add workflow methods to NeuroLink class:

**Implementation Checklist**:

- [ ] Add private `workflowExecutor` and `workflowStateManager` fields
- [ ] Implement `initializeWorkflowSystem()` private method
- [ ] Auto-detect Redis from conversation memory for storage
- [ ] Implement `workflow()` method returning WorkflowBuilder
- [ ] Implement `executeWorkflow()` method
- [ ] Implement `runWorkflow()` method (direct definition)
- [ ] Implement `resumeWorkflow()` method
- [ ] Implement `cancelWorkflow()` method
- [ ] Implement `getWorkflowEventStream()` method
- [ ] Implement `listWorkflows()` method
- [ ] Implement `getWorkflow()` method
- [ ] Add exports to main index.ts
- [ ] Write integration tests

#### Task 6.3: CLI Commands (16-20 hours)

**Files**: `src/cli/commands/workflow.ts`, `src/cli/commands/workflow/*.ts`

Implement CLI commands for workflows:

**Commands to Implement**:

```bash
neurolink workflow list                    # List registered workflows
neurolink workflow run <id> --input <json> # Run a workflow
neurolink workflow status <runId>          # Get workflow status
neurolink workflow resume <checkpointId>   # Resume suspended workflow
neurolink workflow cancel <runId>          # Cancel running workflow
neurolink workflow history <workflowId>    # Show execution history
```

**Implementation Checklist**:

- [ ] Create `workflow` command group
- [ ] Implement `workflow list` command
- [ ] Implement `workflow run` command with JSON input
- [ ] Implement `workflow status` command
- [ ] Implement `workflow resume` command
- [ ] Implement `workflow cancel` command
- [ ] Implement `workflow history` command (optional)
- [ ] Add progress indicators for long-running workflows
- [ ] Add event streaming output option
- [ ] Register commands in CLI index
- [ ] Write CLI tests

#### Task 6.4: Comprehensive Testing (12-16 hours)

**Files**: `test/workflow/*.test.ts`, `test/workflow/integration/*.test.ts`

Write comprehensive test suite:

**Test Categories**:

1. **Unit Tests** (per component)
   - [ ] `step.test.ts` - Step execution, retry, timeout, validation
   - [ ] `workflowBuilder.test.ts` - Builder API, graph construction
   - [ ] `workflowRegistry.test.ts` - Registration, lookup, list
   - [ ] `workflowExecutor.test.ts` - Execution, parallel, branch, loop
   - [ ] `workflowStateManager.test.ts` - Storage adapters
   - [ ] `workflowEventStream.test.ts` - Event streaming

2. **Integration Tests**
   - [ ] `workflow-sequential.test.ts` - Sequential workflow execution
   - [ ] `workflow-parallel.test.ts` - Parallel execution scenarios
   - [ ] `workflow-branching.test.ts` - Conditional branching
   - [ ] `workflow-loops.test.ts` - Loop execution (forEach, doWhile, etc.)
   - [ ] `workflow-suspension.test.ts` - Suspension and resumption
   - [ ] `workflow-persistence.test.ts` - Checkpoint persistence
   - [ ] `workflow-ai.test.ts` - Integration with AI providers

3. **Edge Case Tests**
   - [ ] Empty workflows
   - [ ] Single step workflows
   - [ ] Deeply nested workflows (if supported)
   - [ ] Maximum iteration limits
   - [ ] Timeout handling
   - [ ] Cancellation mid-execution
   - [ ] Concurrent workflow execution
   - [ ] Error propagation

### 7.3 Phase 6 Deliverables

| Deliverable       | File                                      | Description            |
| ----------------- | ----------------------------------------- | ---------------------- |
| Event Stream      | `src/lib/workflow/workflowEventStream.ts` | Async event iteration  |
| SDK Integration   | `src/lib/neurolink.ts`                    | Workflow methods added |
| CLI Commands      | `src/cli/commands/workflow.ts`            | Workflow CLI           |
| Unit Tests        | `test/workflow/*.test.ts`                 | Component tests        |
| Integration Tests | `test/workflow/integration/*.test.ts`     | E2E tests              |

### 7.4 Phase 6 Exit Criteria

- [ ] Event streaming works with async iteration
- [ ] SDK methods work correctly
- [ ] CLI commands function properly
- [ ] Unit test coverage > 80%
- [ ] Integration tests pass
- [ ] Edge cases handled
- [ ] Documentation complete

---

## 8. Effort Summary

### 8.1 Phase-by-Phase Breakdown

| Phase     | Description                        | Duration      | Effort (Hours) |
| --------- | ---------------------------------- | ------------- | -------------- |
| 1         | Core Workflow Types and Interfaces | 1 week        | 40-48          |
| 2         | Step Builder Implementation        | 1.5 weeks     | 48-56          |
| 3         | Workflow Engine                    | 2 weeks       | 64-80          |
| 4         | Suspension/Resumption System       | 1 week        | 32-40          |
| 5         | Workflow Persistence               | 1 week        | 32-40          |
| 6         | CLI Commands and Testing           | 1.5 weeks     | 48-56          |
| **Total** |                                    | **6-8 weeks** | **264-320**    |

### 8.2 Resource Requirements

| Role                        | FTE  | Duration  | Notes               |
| --------------------------- | ---- | --------- | ------------------- |
| Senior TypeScript Developer | 1.0  | 6-8 weeks | Core implementation |
| QA Engineer                 | 0.5  | 4-6 weeks | Testing phases      |
| Technical Writer            | 0.25 | 2 weeks   | Documentation       |

### 8.3 Milestone Schedule

| Milestone                | Target Date | Deliverables            |
| ------------------------ | ----------- | ----------------------- |
| M1: Types Complete       | Week 1      | All type definitions    |
| M2: Builder Complete     | Week 2.5    | Step, Builder, Registry |
| M3: Engine Complete      | Week 4.5    | Full execution engine   |
| M4: Suspension Complete  | Week 5.5    | Checkpoint/resume       |
| M5: Persistence Complete | Week 6.5    | Storage backends        |
| M6: Release Ready        | Week 8      | CLI, tests, docs        |

---

## 9. Risk Assessment

### 9.1 Technical Risks

| Risk                                       | Probability | Impact | Mitigation                                                                        |
| ------------------------------------------ | ----------- | ------ | --------------------------------------------------------------------------------- |
| **Graph cycle detection bugs**             | Medium      | High   | Implement comprehensive validation, use established algorithms (Kahn's algorithm) |
| **Parallel execution race conditions**     | Medium      | High   | Extensive concurrency testing, use proven p-limit library                         |
| **State serialization issues**             | Medium      | Medium | Validate JSON serialization, test with complex state objects                      |
| **Memory leaks in long-running workflows** | Low         | High   | Profile memory usage, implement proper cleanup                                    |
| **Event ordering issues**                  | Medium      | Medium | Use synchronous event emission, test ordering guarantees                          |
| **Circular dependency in module imports**  | Low         | High   | Follow existing dynamic import patterns strictly                                  |
| **Redis connection failures**              | Low         | Medium | Implement retry logic, graceful fallback to in-memory                             |

### 9.2 Integration Risks

| Risk                                    | Probability | Impact   | Mitigation                                       |
| --------------------------------------- | ----------- | -------- | ------------------------------------------------ |
| **Breaking existing SDK API**           | Low         | Critical | No changes to existing public API, additive only |
| **Performance regression**              | Medium      | Medium   | Benchmark before/after, optimize hot paths       |
| **Incompatibility with existing tools** | Low         | Medium   | Integration tests with MCPToolRegistry           |
| **Provider-specific issues in steps**   | Medium      | Medium   | Test with multiple providers                     |

### 9.3 Project Risks

| Risk                          | Probability | Impact | Mitigation                                                 |
| ----------------------------- | ----------- | ------ | ---------------------------------------------------------- |
| **Scope creep**               | High        | Medium | Strict adherence to reference document, defer enhancements |
| **Underestimated complexity** | Medium      | Medium | Buffer time in estimates, prioritize core features         |
| **Documentation lag**         | Medium      | Low    | Document as you go, code reviews include docs              |

### 9.4 Risk Monitoring

- Weekly risk review during implementation
- Automated test coverage reporting
- Performance benchmarking at each phase completion
- Code review with senior engineers

---

## 10. Success Criteria and Validation

### 10.1 Functional Criteria

#### Core Functionality

- [ ] Sequential workflows execute correctly
- [ ] Parallel workflows execute with proper concurrency limits
- [ ] Conditional branching evaluates correctly based on context
- [ ] forEach loops iterate over collections correctly
- [ ] doWhile/doUntil loops respect conditions and max iterations
- [ ] Workflows can be suspended and resumed
- [ ] Checkpoints persist to in-memory and Redis storage
- [ ] Event streaming provides real-time workflow updates

#### API Completeness

- [ ] WorkflowBuilder fluent API matches reference document
- [ ] All workflow methods available on NeuroLink class
- [ ] CLI commands work for all workflow operations
- [ ] Types exported from main package entry

#### Compatibility

- [ ] Existing SDK functionality unchanged
- [ ] All existing tests continue to pass
- [ ] No circular dependencies introduced
- [ ] Works with all supported providers

### 10.2 Non-Functional Criteria

#### Performance

- [ ] Simple workflow executes in < 100ms overhead (excluding AI calls)
- [ ] Parallel execution completes in reasonable time with concurrency
- [ ] Checkpoint save/load < 50ms for typical state sizes
- [ ] Event emission adds < 1ms overhead per event

#### Reliability

- [ ] Zero memory leaks in 1000-workflow stress test
- [ ] Graceful handling of all error conditions
- [ ] Proper cleanup on cancellation
- [ ] Redis connection loss handled gracefully

#### Quality

- [ ] Unit test coverage > 80%
- [ ] Integration test coverage > 60%
- [ ] TypeScript strict mode passes
- [ ] No ESLint errors
- [ ] All JSDoc documentation complete

### 10.3 Validation Test Suite

Create acceptance tests for each major feature:

```typescript
// test/workflow/acceptance/workflow-acceptance.test.ts

describe("Workflow System Acceptance Tests", () => {
  describe("Sequential Execution", () => {
    it("executes steps in order", async () => {
      /* ... */
    });
    it("passes data between steps", async () => {
      /* ... */
    });
    it("handles step failures correctly", async () => {
      /* ... */
    });
  });

  describe("Parallel Execution", () => {
    it("executes parallel steps concurrently", async () => {
      /* ... */
    });
    it("respects concurrency limits", async () => {
      /* ... */
    });
    it("waits for all steps when waitFor=all", async () => {
      /* ... */
    });
    it("returns first result when waitFor=any", async () => {
      /* ... */
    });
  });

  describe("Conditional Branching", () => {
    it("evaluates branch conditions correctly", async () => {
      /* ... */
    });
    it("takes default branch when no conditions match", async () => {
      /* ... */
    });
    it("emits branch:evaluated events", async () => {
      /* ... */
    });
  });

  describe("Loops", () => {
    it("forEach iterates over collections", async () => {
      /* ... */
    });
    it("doWhile continues while condition is true", async () => {
      /* ... */
    });
    it("doUntil stops when condition becomes true", async () => {
      /* ... */
    });
    it("respects max iteration limits", async () => {
      /* ... */
    });
  });

  describe("Suspension/Resumption", () => {
    it("suspends workflow on context.suspend()", async () => {
      /* ... */
    });
    it("creates valid checkpoint on suspension", async () => {
      /* ... */
    });
    it("resumes from checkpoint correctly", async () => {
      /* ... */
    });
    it("merges resume data into state", async () => {
      /* ... */
    });
  });

  describe("Persistence", () => {
    it("saves checkpoints to in-memory storage", async () => {
      /* ... */
    });
    it("saves checkpoints to Redis storage", async () => {
      /* ... */
    });
    it("loads checkpoints by ID", async () => {
      /* ... */
    });
    it("loads checkpoints by runId", async () => {
      /* ... */
    });
  });

  describe("Event Streaming", () => {
    it("emits workflow:start on execution start", async () => {
      /* ... */
    });
    it("emits step:start and step:complete for each step", async () => {
      /* ... */
    });
    it("emits workflow:complete on success", async () => {
      /* ... */
    });
    it("supports async iteration over events", async () => {
      /* ... */
    });
  });

  describe("AI Integration", () => {
    it("executes steps with AI generation", async () => {
      /* ... */
    });
    it("supports multiple providers in parallel steps", async () => {
      /* ... */
    });
    it("handles provider failures gracefully", async () => {
      /* ... */
    });
  });
});
```

### 10.4 Sign-Off Checklist

Before declaring the implementation complete:

- [ ] All acceptance tests pass
- [ ] Performance benchmarks meet criteria
- [ ] Code review completed by senior engineer
- [ ] Documentation reviewed for accuracy
- [ ] No critical or high-priority bugs open
- [ ] Release notes prepared
- [ ] Migration guide available (if needed)
- [ ] Example workflows documented
- [ ] CLI help text accurate and complete

---

## 11. Industry Workflow Patterns

### 11.1 Patterns from Temporal

Temporal is the industry-leading durable execution platform with the following key patterns that inform our design:

**Event History and Replay Mechanism**

```typescript
// Temporal's core concept: Commands checked against event history for resumption
// This pattern inspires our checkpoint system
type WorkflowEventHistory = {
  events: WorkflowEvent[];
  lastEventId: number;
  version: string;
};

// Replay allows workflows to recover from any point
class WorkflowReplayer {
  async replay(history: WorkflowEventHistory): Promise<WorkflowContext> {
    for (const event of history.events) {
      await this.applyEvent(event);
    }
    return this.context;
  }
}
```

**Determinism Requirement**

Temporal requires workflow code to be deterministic (no random numbers, system clocks, or unmanaged external calls). This enables reliable replay. For NeuroLink, we adopt a softer approach:

```typescript
// NeuroLink WorkflowContext provides deterministic helpers
type WorkflowContext<TState> = {
  // Use context methods instead of global functions
  now(): number; // Reproducible timestamp from checkpoint
  random(): number; // Seeded random for replay
  uuid(): string; // Deterministic UUID generation

  // External calls wrapped for replay
  callExternal<T>(key: string, fn: () => Promise<T>): Promise<T>;
};
```

**Workers and Task Queues**

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  NeuroLink      │────▶│   Task Queue    │────▶│    Workers      │
│  Workflow       │     │  (In-Memory/    │     │  (Step         │
│  Engine         │     │   Redis)        │     │   Executors)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                                               │
         │              Event History                    │
         └───────────────────────────────────────────────┘
```

### 11.2 Patterns from Inngest

Inngest's event-driven durable execution patterns are highly relevant for NeuroLink's TypeScript-first approach:

**Step-Based Durable Execution**

```typescript
// Inngest pattern: Steps automatically checkpoint and retry
const workflow = neurolink.createWorkflow({
  name: "document-processing",
  steps: [
    {
      id: "extract",
      execute: async (ctx) => {
        // Checkpoint created after this step completes
        const result = await extractContent(ctx.input.document);
        return { extracted: result };
      },
      retry: { maxAttempts: 3, backoff: "exponential" },
    },
    {
      id: "generate",
      execute: async (ctx) => {
        // If workflow resumes, ctx.steps.extract is already available
        const response = await neurolink.generate({
          prompt: `Summarize: ${ctx.steps.extract.extracted}`,
          provider: "anthropic",
        });
        return { summary: response.text };
      },
    },
  ],
});
```

**Flow Control Primitives**

```typescript
// Inngest-inspired flow control for NeuroLink
type FlowControlOptions = {
  // Concurrency limiting
  concurrency?: {
    limit: number;
    key?: string; // Per-key limiting (e.g., per user)
  };

  // Rate limiting
  rateLimit?: {
    limit: number;
    period: string; // '1m', '1h', '1d'
  };

  // Debouncing
  debounce?: {
    period: string;
    key?: string;
  };

  // Priority
  priority?: number; // Higher = executed first
};
```

### 11.3 Patterns from Prefect

Prefect 3.0's Python-native approach provides patterns for dynamic workflows:

**Native Control Flow**

```typescript
// Prefect-inspired: Use native TypeScript control flow
const dynamicWorkflow = neurolink.createWorkflow({
  name: "dynamic-processing",
  execute: async (ctx) => {
    const items = await fetchItems(ctx.input.source);

    // Native loops with automatic tracking
    for (const item of items) {
      await ctx.runStep(`process-${item.id}`, async () => {
        return processItem(item);
      });
    }

    // Native conditionals
    if (ctx.state.requiresReview) {
      await ctx.suspend({ reason: "manual-review" });
    }

    return ctx.state.results;
  },
});
```

**Durable Execution with Result Caching**

```typescript
// Prefect pattern: Results persisted automatically, exactly-once execution
type StepExecutionOptions = {
  // Cache result for this duration
  cacheExpiry?: string; // '1h', '1d', 'never'

  // Skip if result exists
  cacheKey?: (input: unknown) => string;

  // Force re-execution
  forceRefresh?: boolean;
};
```

### 11.4 Patterns from AWS Step Functions

Step Functions patterns for enterprise workflows:

**State Types**

| State Type   | NeuroLink Equivalent     | Description           |
| ------------ | ------------------------ | --------------------- |
| Task         | `step()`                 | Single unit of work   |
| Choice       | `branch()`               | Conditional branching |
| Parallel     | `parallel()`             | Concurrent execution  |
| Map          | `forEach()`              | Dynamic iteration     |
| Pass         | Transform step           | Data transformation   |
| Wait         | `suspend()` with timeout | Pause execution       |
| Succeed/Fail | Terminal steps           | End states            |

**Wait for Task Token Pattern**

```typescript
// Step Functions callback pattern for NeuroLink
const callbackWorkflow = neurolink.createWorkflow({
  steps: [
    {
      id: "initiate-external",
      execute: async (ctx) => {
        // Create callback token
        const token = ctx.createCallbackToken();

        // Send to external system
        await externalSystem.startProcess({
          callbackUrl: `${API_URL}/workflow/callback/${token}`,
          data: ctx.input,
        });

        // Suspend waiting for callback (up to 1 year, no compute charges)
        return ctx.suspend({
          type: "callback",
          token,
          expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
        });
      },
    },
  ],
});

// Resume endpoint
app.post("/workflow/callback/:token", async (req, res) => {
  await neurolink.resumeWorkflowByToken(req.params.token, req.body);
});
```

---

## 12. Mastra Workflow Insights

### 12.1 Mastra Workflow Architecture

Mastra's workflow system provides specific patterns we should adopt:

**Graph-Based State Machine**

```typescript
// Mastra pattern: Workflows as graph-based state machines
const workflow = new Workflow({
  name: "document-processor",
  steps: {
    extract: new Step({
      execute: async (ctx) => ({ text: extracted }),
    }),
    analyze: new Step({
      execute: async (ctx) => ({ analysis: result }),
    }),
    store: new Step({
      execute: async (ctx) => ({ stored: true }),
    }),
  },
});

// Fluent control flow API
workflow
  .step("extract")
  .then("analyze")
  .branch({
    positive: "approve",
    negative: "reject",
  })
  .parallel(["notify", "log"]);
```

**Step Definition Pattern**

```typescript
// Mastra Step class with full type safety
export class Step<TInput = unknown, TOutput = unknown> {
  constructor(config: {
    id: string;
    execute: (ctx: StepContext<TInput>) => Promise<TOutput>;
    inputSchema?: z.ZodType<TInput>;
    outputSchema?: z.ZodType<TOutput>;
    retry?: RetryConfig;
    timeout?: number;
  }) {}
}

// Type inference from schemas
const typedStep = new Step({
  id: 'extract-entities',
  inputSchema: z.object({ text: z.string() }),
  outputSchema: z.object({
    entities: z.array(z.object({
      name: z.string(),
      type: z.enum(['person', 'org', 'location'])
    }))
  }),
  execute: async (ctx) => {
    // ctx.input is typed as { text: string }
    // return type must match outputSchema
    return { entities: [...] };
  }
});
```

### 12.2 Mastra Suspend/Resume Pattern

**HITL Integration in Workflows**

```typescript
// Mastra's built-in suspend/resume for human input
const reviewWorkflow = new Workflow({
  steps: {
    generate: generateStep,
    approve: new HumanApprovalStep({
      prompt: "Please approve the generated content",
      timeout: "24h",
      channels: ["slack", "email"], // Multi-channel notification
    }),
    publish: publishStep,
  },
});

// Resume after human approval
await workflow.resume(workflowId, {
  approved: true,
  feedback: "Looks good!",
});
```

**Suspension Types**

```typescript
// Different suspension reasons require different handling
type SuspensionType =
  | { type: "human-approval"; prompt: string; timeout: string }
  | { type: "external-callback"; callbackUrl: string; token: string }
  | { type: "scheduled"; resumeAt: number }
  | { type: "manual"; reason: string };

// Context-aware suspension
const step = {
  execute: async (ctx) => {
    if (ctx.input.confidenceScore < 0.8) {
      return ctx.suspend({
        type: "human-approval",
        prompt: `Low confidence (${ctx.input.confidenceScore}). Please review.`,
        timeout: "4h",
      });
    }
    return { approved: true };
  },
};
```

### 12.3 Mastra Agent Network Integration

**Multi-Agent Workflows**

```typescript
// Mastra's Agent Network for dynamic agent coordination
const network = agent.network({
  agents: [researchAgent, writerAgent, editorAgent],
  workflows: [reviewWorkflow],
  tools: [searchTool, publishTool],
});

// LLM determines and executes the plan automatically
const result = await network.run("Write a blog post about AI trends");

// NeuroLink equivalent pattern
const agentWorkflow = neurolink.createWorkflow({
  name: "multi-agent-research",
  agents: {
    researcher: researchAgent,
    writer: writerAgent,
    editor: editorAgent,
  },
  execute: async (ctx) => {
    // Research phase
    const research = await ctx.agents.researcher.generate(
      `Research: ${ctx.input.topic}`,
    );

    // Writing phase
    const draft = await ctx.agents.writer.generate(
      `Write article based on: ${research.text}`,
    );

    // Editing phase
    const final = await ctx.agents.editor.generate(
      `Edit and improve: ${draft.text}`,
    );

    return { article: final.text };
  },
});
```

### 12.4 Mastra Event-Driven Architecture

**Pub/Sub Pattern**

```typescript
// Mastra's event-driven architecture
mastra.on("workflow:step:complete", ({ workflow, step, result }) => {
  // Handle step completion
  logger.info(`Step ${step.id} completed`, result);
});

mastra.on("workflow:suspended", ({ workflow, suspension }) => {
  // Notify appropriate channels
  notificationService.send({
    type: suspension.type,
    workflowId: workflow.id,
    message: suspension.prompt,
  });
});

// NeuroLink WorkflowExecutor event emission
class WorkflowExecutor extends TypedEventEmitter<WorkflowEvents> {
  private emitStepComplete(stepId: string, result: StepResult): void {
    this.emit("step:complete", {
      workflowId: this.currentWorkflow.id,
      runId: this.currentRunId,
      stepId,
      result,
      timestamp: Date.now(),
    });
  }
}
```

---

## 13. Durable Execution Best Practices

### 13.1 Checkpointing Strategy

**When to Create Checkpoints**

```typescript
// Checkpoint after each step completion (Temporal/Inngest pattern)
class WorkflowExecutor {
  private async executeStep(
    step: Step,
    context: WorkflowContext,
  ): Promise<StepResult> {
    const startTime = Date.now();

    try {
      // Execute the step
      const result = await step.execute(context);

      // Create checkpoint AFTER successful completion
      const checkpoint = await this.createCheckpoint({
        status: "step-completed",
        completedStep: step.id,
        stepResult: result,
        context: this.serializeContext(context),
      });

      // Emit checkpoint event
      this.emit("checkpoint:created", { checkpoint, step: step.id });

      return result;
    } catch (error) {
      // Create error checkpoint for debugging
      await this.createCheckpoint({
        status: "step-failed",
        failedStep: step.id,
        error: this.serializeError(error),
        context: this.serializeContext(context),
      });

      throw error;
    }
  }
}
```

**Checkpoint Structure**

```typescript
type WorkflowCheckpoint = {
  id: string;
  workflowId: string;
  runId: string;
  version: string;
  timestamp: number;

  // Execution state
  status: CheckpointStatus;
  currentStep?: string;
  completedSteps: string[];
  pendingSteps: string[];

  // Data state
  state: Record<string, unknown>;
  stepOutputs: Record<string, unknown>;

  // For suspension
  suspension?: SuspensionRequest;

  // For resumption
  resumeData?: Record<string, unknown>;

  // Debugging
  eventHistory: WorkflowEvent[];
  errorHistory: StepError[];
};
```

**Incremental vs Full Checkpoints**

```typescript
// Strategy: Full checkpoint every N steps, incremental otherwise
class CheckpointStrategy {
  private stepsSinceFullCheckpoint = 0;
  private readonly FULL_CHECKPOINT_INTERVAL = 10;

  shouldCreateFullCheckpoint(): boolean {
    this.stepsSinceFullCheckpoint++;
    if (this.stepsSinceFullCheckpoint >= this.FULL_CHECKPOINT_INTERVAL) {
      this.stepsSinceFullCheckpoint = 0;
      return true;
    }
    return false;
  }

  async createCheckpoint(
    context: WorkflowContext,
  ): Promise<WorkflowCheckpoint> {
    if (this.shouldCreateFullCheckpoint()) {
      return this.createFullCheckpoint(context);
    }
    return this.createIncrementalCheckpoint(context);
  }
}
```

### 13.2 Saga Pattern Implementation

**Compensating Transactions for Multi-Provider Operations**

```typescript
// Saga pattern for operations spanning multiple AI providers
type SagaStep<T> = {
  execute: () => Promise<T>;
  compensate: (result: T) => Promise<void>;
  name: string;
};

class WorkflowSaga {
  private completedSteps: Array<{ step: SagaStep<unknown>; result: unknown }> =
    [];

  async run<T>(steps: SagaStep<T>[]): Promise<T[]> {
    const results: T[] = [];

    try {
      for (const step of steps) {
        const result = await step.execute();
        this.completedSteps.push({ step, result });
        results.push(result);
      }
      return results;
    } catch (error) {
      // Compensate in reverse order
      await this.compensate();
      throw error;
    }
  }

  private async compensate(): Promise<void> {
    for (const { step, result } of this.completedSteps.reverse()) {
      try {
        await step.compensate(result);
      } catch (compensateError) {
        // Log but continue compensating other steps
        console.error(`Compensation failed for ${step.name}:`, compensateError);
      }
    }
  }
}

// Usage in NeuroLink
const multiProviderSaga = new WorkflowSaga();
await multiProviderSaga.run([
  {
    name: "transcribe",
    execute: () => neurolink.generate({ provider: "openai" /* ... */ }),
    compensate: (result) => deleteTranscription(result.id),
  },
  {
    name: "translate",
    execute: () => neurolink.generate({ provider: "anthropic" /* ... */ }),
    compensate: (result) => deleteTranslation(result.id),
  },
  {
    name: "summarize",
    execute: () => neurolink.generate({ provider: "google" /* ... */ }),
    compensate: (result) => deleteSummary(result.id),
  },
]);
```

### 13.3 Idempotency and Exactly-Once Execution

**Idempotency Keys**

```typescript
// Every step execution should be idempotent
type IdempotentStep = {
  id: string;
  idempotencyKey: (input: unknown) => string;
  execute: (ctx: StepContext) => Promise<unknown>;
};

class IdempotentExecutor {
  private executionCache: Map<string, unknown> = new Map();

  async executeIdempotent(
    step: IdempotentStep,
    input: unknown,
    context: StepContext,
  ): Promise<unknown> {
    const key = step.idempotencyKey(input);

    // Check cache first
    if (this.executionCache.has(key)) {
      return this.executionCache.get(key);
    }

    // Check persistent storage
    const cached = await this.storage.get(key);
    if (cached) {
      this.executionCache.set(key, cached);
      return cached;
    }

    // Execute and cache
    const result = await step.execute(context);
    await this.storage.set(key, result);
    this.executionCache.set(key, result);

    return result;
  }
}
```

**Deduplication Strategy**

```typescript
// Prevent duplicate workflow executions
class WorkflowDeduplicator {
  async checkAndLock(workflowId: string, input: unknown): Promise<boolean> {
    const inputHash = this.hashInput(input);
    const lockKey = `workflow:lock:${workflowId}:${inputHash}`;

    // Try to acquire lock (Redis SETNX pattern)
    const acquired = await this.storage.setIfNotExists(lockKey, {
      timestamp: Date.now(),
      expiresAt: Date.now() + 60000, // 1 minute lock
    });

    if (!acquired) {
      // Check if existing execution is still active
      const existing = await this.storage.get(lockKey);
      if (existing && existing.expiresAt > Date.now()) {
        return false; // Duplicate, skip execution
      }
      // Lock expired, try to reacquire
      return this.checkAndLock(workflowId, input);
    }

    return true; // Lock acquired, proceed with execution
  }
}
```

### 13.4 Retry and Backoff Strategies

**Exponential Backoff with Jitter**

```typescript
// Industry-standard retry with jitter to prevent thundering herd
class RetryStrategy {
  calculateDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay =
      config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
    const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);

    // Add jitter (0-25% of delay)
    const jitter = cappedDelay * 0.25 * Math.random();

    return cappedDelay + jitter;
  }

  shouldRetry(error: unknown, attempt: number, config: RetryConfig): boolean {
    if (attempt >= config.maxAttempts) return false;

    // Check if error is retryable
    if (error instanceof NonRetryableError) return false;
    if (error instanceof RateLimitError) return true;
    if (error instanceof TemporaryError) return true;

    // Default: retry on network errors
    return this.isNetworkError(error);
  }
}
```

**Circuit Breaker Pattern**

```typescript
// Prevent cascade failures in step execution
class StepCircuitBreaker {
  private failures = 0;
  private lastFailure?: number;
  private state: "closed" | "open" | "half-open" = "closed";

  private readonly threshold = 5;
  private readonly resetTimeout = 30000; // 30 seconds

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - (this.lastFailure || 0) > this.resetTimeout) {
        this.state = "half-open";
      } else {
        throw new CircuitBreakerOpenError();
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = "closed";
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.threshold) {
      this.state = "open";
    }
  }
}
```

---

## 14. Updated Architecture

### 14.1 Refined Architecture Based on Research

Based on the research findings from Temporal, Inngest, Prefect, Mastra, and NeuroLink's streaming evolution, here is the refined architecture:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         WORKFLOW SYSTEM ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                     PUBLIC API LAYER                                │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │ │
│  │  │ WorkflowBuilder │  │  NeuroLink      │  │  CLI Commands   │    │ │
│  │  │ (Fluent API)    │  │  .workflow()    │  │  workflow run   │    │ │
│  │  │ .step().then()  │  │  .executeWF()   │  │  workflow resume│    │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘    │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                    │                                     │
│  ┌────────────────────────────────▼────────────────────────────────────┐│
│  │                    ORCHESTRATION LAYER                               ││
│  │  ┌──────────────────────────────────────────────────────────────┐   ││
│  │  │                  WorkflowExecutor                             │   ││
│  │  │  ┌────────────┐  ┌────────────┐  ┌────────────┐              │   ││
│  │  │  │ Graph      │  │ Context    │  │ Event      │              │   ││
│  │  │  │ Traversal  │  │ Manager    │  │ Emitter    │              │   ││
│  │  │  └────────────┘  └────────────┘  └────────────┘              │   ││
│  │  └──────────────────────────────────────────────────────────────┘   ││
│  │                              │                                       ││
│  │  ┌───────────────────────────▼───────────────────────────────────┐  ││
│  │  │                EXECUTION STRATEGIES                            │  ││
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │  ││
│  │  │  │Sequential│ │ Parallel │ │  Branch  │ │      Loop        │  │  ││
│  │  │  │ Executor │ │ Executor │ │ Evaluator│ │   (forEach/      │  │  ││
│  │  │  │          │ │(p-limit) │ │          │ │    doWhile)      │  │  ││
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │  ││
│  │  └───────────────────────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                    │                                     │
│  ┌────────────────────────────────▼────────────────────────────────────┐│
│  │                     DURABILITY LAYER                                 ││
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   ││
│  │  │  Checkpoint      │  │   Suspension     │  │   Saga           │   ││
│  │  │  Manager         │  │   Handler        │  │   Coordinator    │   ││
│  │  │  - Full/Incr     │  │   - HITL         │  │   - Compensate   │   ││
│  │  │  - Event History │  │   - Callback     │  │   - Rollback     │   ││
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘   ││
│  │                                                                      ││
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   ││
│  │  │  Idempotency     │  │   Retry          │  │   Circuit        │   ││
│  │  │  Controller      │  │   Strategy       │  │   Breaker        │   ││
│  │  │  - Dedup Keys    │  │   - Exp Backoff  │  │   - Failure      │   ││
│  │  │  - Result Cache  │  │   - Jitter       │  │     Threshold    │   ││
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘   ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                    │                                     │
│  ┌────────────────────────────────▼────────────────────────────────────┐│
│  │                       STORAGE LAYER                                  ││
│  │  ┌────────────────────────────────────────────────────────────────┐ ││
│  │  │                  WorkflowStateManager                          │ ││
│  │  │  ┌──────────────────┐  ┌──────────────────────────────────┐   │ ││
│  │  │  │  CheckpointStorage │ │    Implementations               │   │ ││
│  │  │  │  Interface         │ │  ┌───────────┐ ┌───────────────┐ │   │ ││
│  │  │  │  - save()          │ │  │ InMemory  │ │ Redis         │ │   │ ││
│  │  │  │  - load()          │ │  │ (Dev)     │ │ (Production)  │ │   │ ││
│  │  │  │  - list()          │ │  └───────────┘ └───────────────┘ │   │ ││
│  │  │  └────────────────────┘ └──────────────────────────────────┘   │ ││
│  │  └────────────────────────────────────────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                    │                                     │
│  ┌────────────────────────────────▼────────────────────────────────────┐│
│  │                    INTEGRATION LAYER                                 ││
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐    ││
│  │  │ NeuroLink  │  │ MCP Tool   │  │ Memory     │  │ Streaming  │    ││
│  │  │ Providers  │  │ Registry   │  │ System     │  │ Handler    │    ││
│  │  │ (AI Gen)   │  │ (Tools)    │  │ (Redis)    │  │ (Events)   │    ││
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘    ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

### 14.2 Key Architectural Decisions

Based on research findings, these architectural decisions are finalized:

| Decision                | Choice                       | Rationale                                         |
| ----------------------- | ---------------------------- | ------------------------------------------------- |
| **Execution Model**     | Workflow-as-Code             | TypeScript-native like Mastra; better DX than DSL |
| **Checkpoint Strategy** | Step-level, Full+Incremental | Balance between durability and performance        |
| **Parallel Execution**  | p-limit library              | Already in NeuroLink, proven concurrency control  |
| **Event System**        | TypedEventEmitter            | Existing pattern in NeuroLink, type-safe          |
| **Storage Default**     | In-memory with Redis option  | Fast development, production-ready option         |
| **Saga Support**        | Optional add-on              | Not all workflows need compensation               |
| **Determinism**         | Soft enforcement             | Provide helpers, don't require strict determinism |

### 14.3 Streaming Integration

Leveraging NeuroLink's streaming evolution for workflow event streaming:

```typescript
// Pattern from NeuroLink's StreamHandler
class WorkflowEventStream {
  private buffer: WorkflowEvent[] = [];
  private ended = false;
  private waitingResolve?: (event: WorkflowEvent | null) => void;

  constructor(private executor: WorkflowExecutor) {
    // Subscribe to executor events
    executor.on("*", (event) => {
      if (this.filter(event)) {
        if (this.waitingResolve) {
          this.waitingResolve(event);
          this.waitingResolve = undefined;
        } else {
          this.buffer.push(event);
        }
      }
    });
  }

  // Async generator pattern from NeuroLink streaming
  async *events(): AsyncGenerator<WorkflowEvent, void, unknown> {
    while (!this.ended) {
      const event = await this.nextEvent();
      if (event) yield event;
    }
    // Drain remaining buffer
    while (this.buffer.length > 0) {
      yield this.buffer.shift()!;
    }
  }

  private nextEvent(): Promise<WorkflowEvent | null> {
    if (this.buffer.length > 0) {
      return Promise.resolve(this.buffer.shift()!);
    }
    return new Promise((resolve) => {
      this.waitingResolve = resolve;
    });
  }
}
```

### 14.4 Updated Phase Implementation Order

Based on research, the implementation phases are refined:

**Phase 1: Core Types and Interfaces** (Original)

- No changes required

**Phase 2: Step Builder Implementation** (Original)

- Add idempotency key support to Step class
- Add circuit breaker integration

**Phase 2.5: Durability Primitives** (NEW)

- Implement CheckpointManager with full/incremental strategy
- Implement IdempotencyController
- Implement RetryStrategy with exponential backoff and jitter
- Implement basic CircuitBreaker

**Phase 3: Workflow Engine** (Enhanced)

- Add saga coordination support
- Implement callback token pattern for external systems
- Add deterministic helpers to WorkflowContext

**Phase 4: Suspension/Resumption System** (Enhanced)

- Add multi-channel notification support (Mastra pattern)
- Add callback URL/token pattern (Step Functions pattern)
- Add scheduled resumption

**Phase 5: Workflow Persistence** (Original)

- No major changes

**Phase 6: CLI Commands and Testing** (Enhanced)

- Add workflow event streaming to CLI
- Add saga testing utilities

### 14.5 API Design Refinements

**Enhanced WorkflowBuilder API**

```typescript
// Refined fluent API based on research
const workflow = neurolink
  .workflow("document-processor")
  .name("Document Processor")
  .describe("Process and analyze documents with AI")
  .input(
    z.object({
      documentUrl: z.string().url(),
      analysisType: z.enum(["summary", "entities", "sentiment"]),
    }),
  )
  .output(
    z.object({
      result: z.string(),
      confidence: z.number(),
    }),
  )

  // Steps with full configuration
  .step("fetch", {
    execute: async (ctx) => {
      const doc = await fetch(ctx.input.documentUrl);
      return { content: await doc.text() };
    },
    retry: { maxAttempts: 3, backoff: "exponential" },
    timeout: 30000,
    idempotencyKey: (input) => `fetch:${input.documentUrl}`,
  })

  // Sequential step
  .then("analyze", {
    execute: async (ctx) => {
      const result = await ctx.neurolink.generate({
        prompt: `Analyze: ${ctx.steps.fetch.content}`,
        provider: "anthropic",
      });
      return { analysis: result.text };
    },
  })

  // Conditional branching
  .branch({
    condition: (ctx) => ctx.state.requiresReview,
    branches: {
      true: "human-review",
      false: "auto-approve",
    },
  })

  // Human-in-the-loop step
  .step("human-review", {
    execute: async (ctx) => {
      return ctx.suspend({
        type: "human-approval",
        prompt: "Please review the analysis",
        timeout: "24h",
        channels: ["slack", "email"],
      });
    },
  })

  // Parallel execution
  .parallel(["notify-user", "update-database"], {
    concurrency: 2,
    continueOnError: false,
  })

  // Register workflow
  .register();
```

**Enhanced StepContext**

```typescript
type StepContext<TState = unknown> = {
  // Basic context
  workflowId: string;
  runId: string;
  stepId: string;

  // Input and state
  input: TState;
  state: TState;
  steps: Record<string, unknown>; // Previous step outputs

  // NeuroLink integration
  neurolink: NeuroLink;

  // Deterministic helpers (Temporal-inspired)
  now(): number;
  random(): number;
  uuid(): string;

  // Suspension (Mastra-inspired)
  suspend(request: SuspensionRequest): never;

  // Callback tokens (Step Functions-inspired)
  createCallbackToken(): string;

  // State management
  updateState(updates: Partial<TState>): void;
  getStepOutput<T>(stepId: string): T | undefined;

  // Saga support
  registerCompensation(fn: () => Promise<void>): void;

  // Logging
  logger: Logger;
};
```

### 14.6 Updated Effort Estimates

Based on the additional components from research:

| Phase                      | Original Hours | Updated Hours | Delta      |
| -------------------------- | -------------- | ------------- | ---------- |
| 1: Core Types              | 40-48          | 40-48         | 0          |
| 2: Step Builder            | 48-56          | 56-64         | +8         |
| 2.5: Durability Primitives | N/A            | 24-32         | NEW        |
| 3: Workflow Engine         | 64-80          | 72-88         | +8         |
| 4: Suspension/Resumption   | 32-40          | 40-48         | +8         |
| 5: Persistence             | 32-40          | 32-40         | 0          |
| 6: CLI and Testing         | 48-56          | 56-64         | +8         |
| **Total**                  | **264-320**    | **320-384**   | **+56-64** |

**Updated Timeline: 7-9 weeks** (from 6-8 weeks)

---

## Appendix A: File Structure Summary

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
│       └── conditionEvaluator.ts   # Condition evaluation (optional)
├── types/
│   ├── index.ts                    # Updated exports
│   └── workflowTypes.ts            # Workflow type definitions
└── neurolink.ts                    # SDK integration (additions)

src/cli/
└── commands/
    └── workflow.ts                 # Workflow CLI commands

test/
└── workflow/
    ├── step.test.ts
    ├── workflowBuilder.test.ts
    ├── workflowRegistry.test.ts
    ├── workflowExecutor.test.ts
    ├── workflowStateManager.test.ts
    ├── workflowEventStream.test.ts
    ├── acceptance/
    │   └── workflow-acceptance.test.ts
    └── integration/
        ├── workflow-sequential.test.ts
        ├── workflow-parallel.test.ts
        ├── workflow-branching.test.ts
        ├── workflow-loops.test.ts
        ├── workflow-suspension.test.ts
        └── workflow-ai.test.ts
```

---

## Appendix B: Reference Documentation

| Document               | Location                                   | Purpose                        |
| ---------------------- | ------------------------------------------ | ------------------------------ |
| Workflow System Guide  | `../02-advanced-workflow-system.md`        | Complete feature specification |
| Architecture Patterns  | `../00-neurolink-architecture-patterns.md` | Design patterns to follow      |
| Implementation Roadmap | `../20-implementation-roadmap.md`          | Overall project roadmap        |
| Type System Patterns   | `../patterns/02-type-system-patterns.md`   | Type organization patterns     |

---

## Appendix C: Quick Reference Commands

```bash
# Development
pnpm run build          # Full build
pnpm run build:cli      # CLI only
pnpm run check          # Type checking
pnpm run lint           # Linting
pnpm run format         # Format code

# Testing
pnpm test               # Run all tests
pnpm run test:run       # CI mode
pnpm test src/lib/workflow  # Workflow tests only
pnpm test --coverage    # Coverage report

# Validation
pnpm run validate:all   # Full validation pipeline
```

---

**Document Status**: Planning (Updated with Research Findings)
**Next Review Date**: Prior to Phase 1 kickoff
**Owner**: NeuroLink Engineering Team

---

## Appendix D: Research Sources

This implementation plan was updated based on comprehensive research documented in:

### Primary Research Documents

| Document                     | Location                                                | Key Insights                                     |
| ---------------------------- | ------------------------------------------------------- | ------------------------------------------------ |
| Workflow Engines Research    | `../research/online/09-workflow-engines-research.md`    | Temporal, Inngest, Prefect patterns; Saga; HITL  |
| Mastra Architecture Research | `../research/online/01-mastra-architecture-research.md` | Mastra design philosophy; workflow API patterns  |
| Streaming Evolution          | `../research/git-history/09-streaming-evolution.md`     | NeuroLink streaming patterns for event streaming |

### External Sources Referenced

**Durable Execution Engines:**

- [Temporal.io](https://temporal.io/) - Industry-leading durable execution platform
- [Restate.dev](https://www.restate.dev/) - Modern durable execution engine
- [Inngest](https://www.inngest.com/) - Event-driven durable execution platform
- [Trigger.dev](https://trigger.dev/) - Developer-friendly background jobs

**Data Orchestration:**

- [Apache Airflow](https://airflow.apache.org/) - Workflow orchestration for data pipelines
- [Prefect](https://www.prefect.io/) - Python-native workflow orchestration
- [Dagster](https://dagster.io/) - Asset-centric data orchestration

**Cloud Services:**

- [AWS Step Functions](https://docs.aws.amazon.com/step-functions/) - Visual workflow service
- [AWS Lambda Durable Functions](https://docs.aws.amazon.com/lambda/latest/dg/durable-functions.html) - Serverless durable execution

**Architectural Patterns:**

- [Saga Pattern (Microservices.io)](https://microservices.io/patterns/data/saga.html)
- [Event Sourcing (Azure)](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing)
- [CQRS Pattern (Azure)](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs)

**Mastra Framework:**

- [Mastra Documentation](https://mastra.ai/docs)
- [Mastra GitHub](https://github.com/mastra-ai/mastra)
- [Why We're All-In on MCP](https://mastra.ai/blog/mastra-mcp)

### Key Patterns Adopted

1. **From Temporal**: Event history replay, determinism helpers, worker/task queue model
2. **From Inngest**: Step-based checkpointing, flow control primitives, TypeScript-first design
3. **From Prefect**: Native control flow, result caching, durable execution
4. **From Mastra**: Fluent workflow API, suspend/resume patterns, agent network integration
5. **From Step Functions**: Callback token pattern, wait states, state machine types
6. **From NeuroLink Streaming**: AsyncGenerator patterns, event buffering, progress tracking
