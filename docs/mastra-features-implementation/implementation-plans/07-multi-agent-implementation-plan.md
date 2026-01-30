# Multi-Agent Networks Implementation Plan

**Version**: 1.0.0
**Created**: January 2026
**Last Updated**: January 2026
**Status**: Planning
**Reference Document**: `../07-multi-agent-networks.md`

---

## Executive Summary

This document provides a detailed, phased implementation plan for adding Mastra-style multi-agent network orchestration to NeuroLink. The implementation builds on NeuroLink's existing foundation (MCPToolRegistry, provider orchestration, HITL integration) to create a comprehensive agent abstraction layer with intelligent routing, hierarchical networks, and inter-agent communication.

### Key Deliverables

1. **Agent Abstraction**: Formal `Agent` class with identity, instructions, and specialized capabilities
2. **Agent Network**: Multi-agent orchestration with routing agent for task delegation
3. **Network Primitives**: Support for agents, workflows, and tools as orchestrable primitives
4. **Communication Protocol**: Structured inter-agent message passing
5. **Streaming Events**: Real-time visibility into network execution

### Timeline Overview

| Phase   | Duration | Description                        |
| ------- | -------- | ---------------------------------- |
| Phase 1 | 2 weeks  | Agent Network Types and Interfaces |
| Phase 2 | 3 weeks  | Router Agent Implementation        |
| Phase 3 | 3 weeks  | Orchestrator Pattern               |
| Phase 4 | 2 weeks  | Evaluator-Optimizer Pattern        |
| Phase 5 | 2 weeks  | Hierarchical Agent Networks        |
| Phase 6 | 2 weeks  | Agent Communication Protocol       |
| Phase 7 | 2 weeks  | Testing and Examples               |

**Total Estimated Duration**: 16 weeks (4 months)

---

## Prerequisites and Dependencies

### Required Dependencies (Must Complete Before Starting)

| Dependency              | Source          | Status      | Notes                                        |
| ----------------------- | --------------- | ----------- | -------------------------------------------- |
| Enhanced Type System    | Phase 1 Roadmap | Required    | Type definitions for workflows, streaming    |
| Streaming Architecture  | Phase 1 Roadmap | Required    | Stream event types and transformers          |
| Hooks and Events System | Phase 1 Roadmap | Required    | Lifecycle hooks for agent execution          |
| Workflow System (Basic) | Phase 2 Roadmap | Recommended | WorkflowPrimitive support benefits from this |

### Existing NeuroLink Components to Leverage

| Component                      | Location                                         | Usage                           |
| ------------------------------ | ------------------------------------------------ | ------------------------------- |
| MCPToolRegistry                | `src/lib/mcp/toolRegistry.ts`                    | Tool registration and execution |
| ExternalServerManager          | `src/lib/mcp/externalServerManager.ts`           | External MCP server tools       |
| HITLManager                    | `src/lib/hitl/hitlManager.ts`                    | Human-in-the-loop approval      |
| ConversationMemoryManager      | `src/lib/core/conversationMemoryManager.ts`      | Agent memory                    |
| RedisConversationMemoryManager | `src/lib/core/redisConversationMemoryManager.ts` | Distributed memory              |
| ModelRouter                    | `src/lib/utils/modelRouter.ts`                   | Task routing logic              |
| BinaryTaskClassifier           | `src/lib/utils/taskClassifier.ts`                | Task classification             |
| ProviderFactory                | `src/lib/factories/providerFactory.ts`           | Dynamic provider loading        |
| ErrorFactory                   | `src/lib/utils/errorHandling.ts`                 | Typed error handling            |

### Existing NeuroLink Features

#### Human-in-the-Loop (HITL) System

NeuroLink already has a comprehensive HITL implementation in `src/lib/hitl/` that can be leveraged for multi-agent supervision and approval workflows:

| Component              | Location                      | Description                                                   |
| ---------------------- | ----------------------------- | ------------------------------------------------------------- |
| HITLManager            | `src/lib/hitl/hitlManager.ts` | Central manager for human-in-the-loop operations              |
| Confirmation Workflows | `src/lib/hitl/`               | Request human confirmation before executing sensitive actions |
| Statistics Tracking    | `src/lib/hitl/`               | Track approval rates, response times, and rejection reasons   |
| Audit Logging          | `src/lib/hitl/`               | Maintain audit trail of all HITL decisions for compliance     |

**Key HITL Capabilities:**

- Request human approval before tool execution
- Timeout handling for approval requests
- Approval/rejection with optional feedback
- Integration with agent execution flow
- Support for async and streaming contexts

**Integration Points for Multi-Agent:**

- SupervisorAgent can use HITLManager for approval workflows
- HierarchicalNetwork can leverage HITL for escalation
- Agent communication can trigger HITL confirmations for sensitive operations

### External Dependencies (Already in NeuroLink)

```typescript
// No new external dependencies required
// Uses existing:
import { z } from "zod"; // Schema validation
import { EventEmitter } from "events"; // Event system
import { randomUUID } from "crypto"; // UUID generation
```

### Environment Requirements

- Node.js 18+ (already required by NeuroLink)
- TypeScript 5.0+ (already required)
- Existing AI provider API keys configured

---

## Phase 1: Agent Network Types and Interfaces

**Duration**: 2 weeks
**Effort**: Medium
**Team Size**: 1 developer

### Objectives

- Define comprehensive TypeScript types for the agent network system
- Ensure type safety across all agent operations
- Maintain consistency with existing NeuroLink type patterns

### Deliverables

#### 1.1 Core Type Definitions

**File**: `src/lib/types/agentNetworkTypes.ts`

```typescript
// Agent definition and instance types
export type AgentDefinition = { ... };
export type Agent = AgentDefinition & { ... };
export type AgentInput = { ... };
export type AgentResult = { ... };
export type AgentExecutionOptions = { ... };
export type AgentStatus = { ... };

// Network primitive types
export type NetworkPrimitiveType = 'agent' | 'workflow' | 'tool';
export type NetworkPrimitive = { ... };
export type AgentPrimitive = NetworkPrimitive & { ... };
export type WorkflowPrimitive = NetworkPrimitive & { ... };
export type ToolPrimitive = NetworkPrimitive & { ... };
export type Primitive = AgentPrimitive | WorkflowPrimitive | ToolPrimitive;

// Network configuration
export type AgentNetworkConfig = { ... };
export type RouterConfig = { ... };
export type NetworkMemoryConfig = { ... };
export type NetworkDefaults = { ... };

// Execution types
export type NetworkExecutionInput = { ... };
export type NetworkExecutionOptions = { ... };
export type NetworkExecutionResult = { ... };
export type NetworkExecutionTrace = { ... };
export type NetworkExecutionStep = { ... };
export type RoutingDecision = { ... };

// Streaming types
export type NetworkStreamChunkType = 'network-start' | 'routing-decision' | ...;
export type NetworkStreamChunkBase = { ... };
export type NetworkStartChunk = NetworkStreamChunkBase & { ... };
export type RoutingDecisionChunk = NetworkStreamChunkBase & { ... };
// ... all streaming chunk types
export type NetworkStreamChunk = NetworkStartChunk | RoutingDecisionChunk | ...;

// Token usage aggregation
export type NetworkTokenUsage = { ... };

// Execution status
export type NetworkExecutionStatus = 'pending' | 'running' | 'completed' | 'error' | 'suspended';
```

#### 1.2 Agent Stream Types

**File**: `src/lib/types/agentStreamTypes.ts`

```typescript
// Agent-specific streaming types
export type AgentStreamChunkType =
  | "agent-start"
  | "agent-thinking"
  | "agent-text"
  | "agent-tool-call"
  | "agent-tool-result"
  | "agent-complete"
  | "agent-error";

export type AgentStreamChunk = {
  type: AgentStreamChunkType;
  agentId: string;
  timestamp: number;
  traceId: string;
  // Type-specific properties
};
```

#### 1.3 Type Exports

**Update**: `src/lib/types/index.ts`

```typescript
// Add agent network type exports
export * from "./agentNetworkTypes.js";
export * from "./agentStreamTypes.js";
```

### Tasks

| Task  | Description                                       | Estimate | Dependencies |
| ----- | ------------------------------------------------- | -------- | ------------ |
| 1.1.1 | Create `agentNetworkTypes.ts` with all interfaces | 3 days   | None         |
| 1.1.2 | Create `agentStreamTypes.ts` for streaming        | 1 day    | 1.1.1        |
| 1.1.3 | Create Zod schemas for runtime validation         | 2 days   | 1.1.1        |
| 1.1.4 | Update `types/index.ts` with exports              | 0.5 days | 1.1.1, 1.1.2 |
| 1.1.5 | Write type-level tests (tsd)                      | 1 day    | 1.1.1-1.1.4  |
| 1.1.6 | Documentation and JSDoc comments                  | 1 day    | 1.1.1-1.1.5  |

### Acceptance Criteria

- [ ] All type definitions compile without errors
- [ ] Types are consistent with existing NeuroLink patterns
- [ ] Zod schemas match TypeScript interfaces
- [ ] JSDoc comments on all public types
- [ ] Type-level tests pass
- [ ] No `any` types in public interfaces

### File Structure After Phase 1

```
src/lib/types/
├── agentNetworkTypes.ts    # NEW: Core agent network types
├── agentStreamTypes.ts     # NEW: Agent streaming types
├── index.ts                # MODIFIED: Add exports
└── ... (existing files)
```

---

## Phase 2: Router Agent Implementation

**Duration**: 3 weeks
**Effort**: High
**Team Size**: 1-2 developers
**Dependencies**: Phase 1

### Objectives

- Implement the core routing agent that analyzes tasks and selects appropriate primitives
- Build task analysis and confidence scoring
- Create routing prompt templates for different scenarios

### Deliverables

#### 2.1 Router Agent Class

**File**: `src/lib/agent/routerAgent.ts`

```typescript
/**
 * Router Agent - Analyzes tasks and routes to appropriate primitives
 */
export class RouterAgent {
  private neurolink: NeuroLink;
  private config: RouterConfig;
  private primitives: Map<string, Primitive>;

  constructor(config: RouterConfig, neurolink: NeuroLink);

  /**
   * Route a task to the most appropriate primitive
   */
  async route(task: string, context?: RoutingContext): Promise<RoutingDecision>;

  /**
   * Get routing confidence for a specific primitive
   */
  async getConfidence(task: string, primitiveId: string): Promise<number>;

  /**
   * Register primitives available for routing
   */
  registerPrimitive(primitive: Primitive): void;

  /**
   * Get all registered primitives
   */
  getPrimitives(): Primitive[];
}
```

#### 2.2 Routing Prompt Templates

**File**: `src/lib/agent/prompts/routingPrompts.ts`

```typescript
/**
 * Prompt templates for routing decisions
 */
export const ROUTING_PROMPTS = {
  TASK_ANALYSIS: `...`,
  PRIMITIVE_SELECTION: `...`,
  CONFIDENCE_EVALUATION: `...`,
  MULTI_STEP_PLANNING: `...`,
};

/**
 * Build routing prompt with primitives and task
 */
export function buildRoutingPrompt(
  task: string,
  primitives: Primitive[],
  options?: RoutingPromptOptions,
): string;

/**
 * Parse routing response from LLM
 */
export function parseRoutingResponse(response: string): RoutingDecision | null;
```

#### 2.3 Task Analyzer

**File**: `src/lib/agent/taskAnalyzer.ts`

```typescript
/**
 * Task Analyzer - Extracts intent and requirements from tasks
 */
export class TaskAnalyzer {
  /**
   * Analyze task to extract intent, entities, and requirements
   */
  async analyze(task: string): Promise<TaskAnalysis>;

  /**
   * Determine if task requires multiple steps
   */
  isMultiStep(analysis: TaskAnalysis): boolean;

  /**
   * Extract tool requirements from task
   */
  getRequiredTools(analysis: TaskAnalysis): string[];
}

export type TaskAnalysis = {
  intent: string;
  entities: Entity[];
  requirements: Requirement[];
  complexity: "simple" | "moderate" | "complex";
  suggestedPrimitives: string[];
};
```

### Tasks

| Task  | Description                                    | Estimate | Dependencies |
| ----- | ---------------------------------------------- | -------- | ------------ |
| 2.1.1 | Create `RouterAgent` class skeleton            | 1 day    | Phase 1      |
| 2.1.2 | Implement primitive registration               | 1 day    | 2.1.1        |
| 2.1.3 | Create routing prompt templates                | 2 days   | 2.1.1        |
| 2.1.4 | Implement `route()` method                     | 3 days   | 2.1.2, 2.1.3 |
| 2.1.5 | Implement confidence scoring                   | 2 days   | 2.1.4        |
| 2.1.6 | Create `TaskAnalyzer` class                    | 2 days   | 2.1.1        |
| 2.1.7 | Integrate with existing `BinaryTaskClassifier` | 1 day    | 2.1.6        |
| 2.1.8 | Add fallback routing logic                     | 1 day    | 2.1.4        |
| 2.1.9 | Unit tests for router                          | 2 days   | 2.1.1-2.1.8  |

### Acceptance Criteria

- [ ] Router correctly selects primitives based on task description
- [ ] Confidence scores are between 0 and 1
- [ ] Fallback to default agent on routing errors
- [ ] Routing decisions include reasoning
- [ ] Integration with existing task classifier works
- [ ] Unit test coverage >80%

### File Structure After Phase 2

```
src/lib/agent/
├── routerAgent.ts          # NEW: Router agent implementation
├── taskAnalyzer.ts         # NEW: Task analysis utilities
├── prompts/
│   └── routingPrompts.ts   # NEW: Routing prompt templates
├── directTools.ts          # EXISTING
└── index.ts                # NEW: Agent module exports
```

---

## Phase 3: Orchestrator Pattern

**Duration**: 3 weeks
**Effort**: High
**Team Size**: 2 developers
**Dependencies**: Phase 1, Phase 2

### Objectives

- Implement the core `Agent` class with execute and stream capabilities
- Build `AgentNetwork` for multi-agent orchestration
- Create primitive execution engine

### Deliverables

#### 3.1 Agent Class

**File**: `src/lib/agent/agent.ts`

```typescript
/**
 * Agent - Wraps NeuroLink with specialized behavior
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
  private executionCount: number;
  private lastExecutionTime?: number;

  constructor(definition: AgentDefinition, neurolink: NeuroLink);

  /**
   * Execute the agent with given input
   */
  async execute(
    input: AgentInput,
    options?: AgentExecutionOptions,
  ): Promise<AgentResult>;

  /**
   * Stream execution results
   */
  async *stream(
    input: AgentInput,
    options?: AgentExecutionOptions,
  ): AsyncIterable<AgentStreamChunk>;

  /**
   * Get agent status
   */
  getStatus(): AgentStatus;

  /**
   * Build prompt from input and context
   */
  private buildPrompt(
    input: AgentInput,
    context?: Record<string, unknown>,
  ): string;
}
```

#### 3.2 Agent Network Class

**File**: `src/lib/agent/agentNetwork.ts`

```typescript
/**
 * AgentNetwork - Multi-agent orchestration
 */
export class AgentNetwork {
  readonly id: string;
  readonly name: string;
  readonly description?: string;

  private neurolink: NeuroLink;
  private agents: Map<string, Agent>;
  private workflows: Map<string, WorkflowPrimitive>;
  private primitives: Map<string, Primitive>;
  private router: RouterAgent;
  private emitter: EventEmitter;
  private config: AgentNetworkConfig;

  constructor(config: AgentNetworkConfig, neurolink: NeuroLink);

  /**
   * Execute the network with intelligent routing
   */
  async execute(
    input: NetworkExecutionInput,
    options?: NetworkExecutionOptions,
  ): Promise<NetworkExecutionResult>;

  /**
   * Stream network execution with events
   */
  async *stream(
    input: NetworkExecutionInput,
    options?: NetworkExecutionOptions,
  ): AsyncIterable<NetworkStreamChunk>;

  /**
   * Execute a single primitive
   */
  private async executePrimitive(
    primitive: Primitive,
    input: unknown,
    options?: NetworkExecutionOptions,
  ): Promise<PrimitiveExecutionResult>;

  /**
   * Check if task is complete
   */
  private async isTaskComplete(
    output: unknown,
    originalTask: string,
  ): Promise<boolean>;

  /**
   * Get agent by ID
   */
  getAgent(id: string): Agent | undefined;

  /**
   * Get all agents
   */
  getAllAgents(): Agent[];

  /**
   * Get all primitives
   */
  getAllPrimitives(): Primitive[];

  /**
   * Subscribe to network events
   */
  on(event: string, handler: (...args: unknown[]) => void): void;

  /**
   * Unsubscribe from network events
   */
  off(event: string, handler: (...args: unknown[]) => void): void;
}
```

#### 3.3 Primitive Executor

**File**: `src/lib/agent/primitiveExecutor.ts`

```typescript
/**
 * PrimitiveExecutor - Executes different primitive types
 */
export class PrimitiveExecutor {
  private neurolink: NeuroLink;
  private hitlManager?: HITLManager;

  constructor(neurolink: NeuroLink, hitlManager?: HITLManager);

  /**
   * Execute any primitive type
   */
  async execute(
    primitive: Primitive,
    input: unknown,
    context?: ExecutionContext,
  ): Promise<PrimitiveExecutionResult>;

  /**
   * Execute an agent primitive
   */
  private async executeAgent(
    primitive: AgentPrimitive,
    input: unknown,
    context?: ExecutionContext,
  ): Promise<PrimitiveExecutionResult>;

  /**
   * Execute a workflow primitive
   */
  private async executeWorkflow(
    primitive: WorkflowPrimitive,
    input: unknown,
    context?: ExecutionContext,
  ): Promise<PrimitiveExecutionResult>;

  /**
   * Execute a tool primitive
   */
  private async executeTool(
    primitive: ToolPrimitive,
    input: unknown,
    context?: ExecutionContext,
  ): Promise<PrimitiveExecutionResult>;
}
```

#### 3.4 NeuroLink Integration

**Update**: `src/lib/neurolink.ts`

```typescript
// Add to NeuroLink class:

/**
 * Create an agent from a definition
 */
createAgent(definition: AgentDefinition): Agent;

/**
 * Create an agent network for multi-agent orchestration
 */
createNetwork(config: AgentNetworkConfig): AgentNetwork;

/**
 * Execute an agent network
 */
async executeNetwork(
  network: AgentNetwork,
  input: NetworkExecutionInput,
  options?: NetworkExecutionOptions,
): Promise<NetworkExecutionResult>;

/**
 * Stream execution of an agent network
 */
async *streamNetwork(
  network: AgentNetwork,
  input: NetworkExecutionInput,
  options?: NetworkExecutionOptions,
): AsyncIterable<NetworkStreamChunk>;
```

### Tasks

| Task  | Description                          | Estimate | Dependencies   |
| ----- | ------------------------------------ | -------- | -------------- |
| 3.1.1 | Create `Agent` class skeleton        | 1 day    | Phase 2        |
| 3.1.2 | Implement `Agent.execute()`          | 2 days   | 3.1.1          |
| 3.1.3 | Implement `Agent.stream()`           | 2 days   | 3.1.2          |
| 3.1.4 | Add input/output schema validation   | 1 day    | 3.1.2          |
| 3.2.1 | Create `AgentNetwork` class skeleton | 1 day    | 3.1.1          |
| 3.2.2 | Implement primitive registration     | 1 day    | 3.2.1          |
| 3.2.3 | Integrate `RouterAgent`              | 1 day    | 3.2.1, Phase 2 |
| 3.2.4 | Implement `AgentNetwork.execute()`   | 3 days   | 3.2.2, 3.2.3   |
| 3.2.5 | Implement `AgentNetwork.stream()`    | 2 days   | 3.2.4          |
| 3.3.1 | Create `PrimitiveExecutor`           | 2 days   | 3.1.1          |
| 3.3.2 | Integrate HITL for tool execution    | 1 day    | 3.3.1          |
| 3.4.1 | Add methods to NeuroLink class       | 1 day    | 3.1.1-3.3.2    |
| 3.4.2 | Integration tests                    | 3 days   | 3.4.1          |

### Acceptance Criteria

- [ ] Agents can execute tasks independently
- [ ] Agent networks route tasks to correct agents
- [ ] Streaming provides real-time execution visibility
- [ ] HITL integration works for tool execution
- [ ] NeuroLink API methods function correctly
- [ ] Integration test coverage >75%

### File Structure After Phase 3

```
src/lib/agent/
├── agent.ts                # NEW: Agent class
├── agentNetwork.ts         # NEW: Agent network class
├── primitiveExecutor.ts    # NEW: Primitive execution
├── routerAgent.ts          # Phase 2
├── taskAnalyzer.ts         # Phase 2
├── prompts/
│   └── routingPrompts.ts   # Phase 2
├── directTools.ts          # EXISTING
└── index.ts                # MODIFIED: Add exports

src/lib/neurolink.ts        # MODIFIED: Add agent methods
```

---

## Phase 4: Evaluator-Optimizer Pattern

**Duration**: 2 weeks
**Effort**: Medium
**Team Size**: 1-2 developers
**Dependencies**: Phase 3

### Objectives

- Add result evaluation capabilities to agents
- Implement iterative optimization based on quality scores
- Create feedback loop for continuous improvement

### Deliverables

#### 4.1 Agent Evaluator

**File**: `src/lib/agent/agentEvaluator.ts`

```typescript
/**
 * AgentEvaluator - Evaluates agent execution results
 */
export class AgentEvaluator {
  private neurolink: NeuroLink;
  private evaluationModel?: string;

  constructor(neurolink: NeuroLink, config?: EvaluatorConfig);

  /**
   * Evaluate an agent result against criteria
   */
  async evaluate(
    result: AgentResult,
    criteria: EvaluationCriteria,
  ): Promise<EvaluationScore>;

  /**
   * Check if result meets quality threshold
   */
  meetsThreshold(score: EvaluationScore, threshold: number): boolean;

  /**
   * Generate improvement suggestions
   */
  async suggest(
    result: AgentResult,
    score: EvaluationScore,
  ): Promise<ImprovementSuggestion[]>;
}

export type EvaluationCriteria = {
  accuracy?: boolean;
  completeness?: boolean;
  relevance?: boolean;
  coherence?: boolean;
  customCriteria?: string[];
};

export type EvaluationScore = {
  overall: number; // 0-1
  breakdown: {
    accuracy?: number;
    completeness?: number;
    relevance?: number;
    coherence?: number;
    [key: string]: number | undefined;
  };
  feedback: string;
};
```

#### 4.2 Optimization Loop

**File**: `src/lib/agent/optimizationLoop.ts`

```typescript
/**
 * OptimizationLoop - Iterative refinement of agent results
 */
export class OptimizationLoop {
  private agent: Agent;
  private evaluator: AgentEvaluator;
  private maxIterations: number;
  private qualityThreshold: number;

  constructor(config: OptimizationConfig);

  /**
   * Run optimization loop until quality threshold met
   */
  async optimize(
    input: AgentInput,
    criteria: EvaluationCriteria,
  ): Promise<OptimizationResult>;

  /**
   * Stream optimization iterations
   */
  async *streamOptimize(
    input: AgentInput,
    criteria: EvaluationCriteria,
  ): AsyncIterable<OptimizationChunk>;
}

export type OptimizationResult = {
  finalResult: AgentResult;
  iterations: OptimizationIteration[];
  finalScore: EvaluationScore;
  totalDuration: number;
};

export type OptimizationIteration = {
  iteration: number;
  result: AgentResult;
  score: EvaluationScore;
  improvements: ImprovementSuggestion[];
};
```

#### 4.3 Network Evaluation

**Update**: `src/lib/agent/agentNetwork.ts`

```typescript
// Add to AgentNetwork class:

/**
 * Execute with evaluation and optimization
 */
async executeWithEvaluation(
  input: NetworkExecutionInput,
  criteria: EvaluationCriteria,
  options?: NetworkExecutionOptions & OptimizationOptions,
): Promise<EvaluatedNetworkResult>;

/**
 * Get evaluation metrics for the network
 */
getEvaluationMetrics(): NetworkEvaluationMetrics;
```

### Tasks

| Task  | Description                      | Estimate | Dependencies |
| ----- | -------------------------------- | -------- | ------------ |
| 4.1.1 | Create `AgentEvaluator` class    | 2 days   | Phase 3      |
| 4.1.2 | Implement evaluation prompts     | 1 day    | 4.1.1        |
| 4.1.3 | Implement scoring logic          | 2 days   | 4.1.1        |
| 4.2.1 | Create `OptimizationLoop` class  | 2 days   | 4.1.1        |
| 4.2.2 | Implement iteration logic        | 2 days   | 4.2.1        |
| 4.2.3 | Add streaming support            | 1 day    | 4.2.2        |
| 4.3.1 | Add evaluation to `AgentNetwork` | 1 day    | 4.1.1, 4.2.1 |
| 4.3.2 | Unit tests                       | 2 days   | 4.1.1-4.3.1  |

### Acceptance Criteria

- [ ] Evaluation scores reflect result quality
- [ ] Optimization loop improves results iteratively
- [ ] Quality threshold stops optimization when met
- [ ] Streaming provides visibility into iterations
- [ ] Integration with existing evaluation system
- [ ] Unit test coverage >80%

### File Structure After Phase 4

```
src/lib/agent/
├── agent.ts
├── agentNetwork.ts         # MODIFIED: Add evaluation
├── agentEvaluator.ts       # NEW: Evaluation logic
├── optimizationLoop.ts     # NEW: Iterative optimization
├── primitiveExecutor.ts
├── routerAgent.ts
├── taskAnalyzer.ts
├── prompts/
│   ├── routingPrompts.ts
│   └── evaluationPrompts.ts # NEW: Evaluation prompts
├── directTools.ts
└── index.ts
```

---

## Phase 5: Hierarchical Agent Networks

**Duration**: 2 weeks
**Effort**: Medium-High
**Team Size**: 1-2 developers
**Dependencies**: Phase 3, Phase 4

### Objectives

- Enable agents to contain sub-networks
- Implement delegation and supervision patterns
- Create hierarchical execution traces

### Deliverables

#### 5.1 Hierarchical Network Support

**File**: `src/lib/agent/hierarchicalNetwork.ts`

```typescript
/**
 * HierarchicalNetwork - Nested agent network support
 */
export class HierarchicalNetwork extends AgentNetwork {
  private parentNetwork?: AgentNetwork;
  private childNetworks: Map<string, AgentNetwork>;
  private hierarchyLevel: number;

  constructor(
    config: HierarchicalNetworkConfig,
    neurolink: NeuroLink,
    parent?: AgentNetwork,
  );

  /**
   * Create a child network
   */
  createChildNetwork(config: AgentNetworkConfig): AgentNetwork;

  /**
   * Delegate task to child network
   */
  async delegateToChild(
    networkId: string,
    input: NetworkExecutionInput,
    options?: NetworkExecutionOptions,
  ): Promise<NetworkExecutionResult>;

  /**
   * Get hierarchy path for tracing
   */
  getHierarchyPath(): string[];

  /**
   * Get aggregated execution trace
   */
  getAggregatedTrace(): HierarchicalExecutionTrace;
}

export type HierarchicalNetworkConfig = AgentNetworkConfig & {
  maxDepth?: number;
  delegationRules?: DelegationRule[];
  supervisionMode?: "autonomous" | "supervised" | "collaborative";
};
```

#### 5.2 Supervisor Agent

**File**: `src/lib/agent/supervisorAgent.ts`

```typescript
/**
 * SupervisorAgent - Oversees child agents and networks
 */
export class SupervisorAgent extends Agent {
  private supervisedAgents: Map<string, Agent>;
  private supervisedNetworks: Map<string, AgentNetwork>;
  private supervisionPolicy: SupervisionPolicy;

  constructor(definition: SupervisorAgentDefinition, neurolink: NeuroLink);

  /**
   * Supervise an agent execution
   */
  async supervise(
    agent: Agent,
    input: AgentInput,
    options?: SupervisionOptions,
  ): Promise<SupervisedResult>;

  /**
   * Approve or reject agent action
   */
  async review(action: AgentAction): Promise<ReviewDecision>;

  /**
   * Escalate to parent supervisor
   */
  async escalate(issue: EscalationIssue): Promise<EscalationResult>;
}

export type SupervisionPolicy = {
  reviewThreshold: number; // Confidence below which to review
  escalationThreshold: number; // Severity above which to escalate
  maxRetries: number;
  requireApprovalFor: string[]; // Tool names requiring approval
};
```

#### 5.3 Delegation Rules

**File**: `src/lib/agent/delegationRules.ts`

```typescript
/**
 * Delegation rule definitions
 */
export type DelegationRule = {
  condition: DelegationCondition;
  targetNetwork: string;
  priority: number;
};

export type DelegationCondition =
  | { type: "keyword"; keywords: string[] }
  | { type: "complexity"; threshold: "simple" | "moderate" | "complex" }
  | { type: "toolRequired"; tools: string[] }
  | { type: "custom"; evaluator: (task: string) => boolean };

/**
 * Evaluate delegation rules
 */
export function evaluateDelegationRules(
  task: string,
  rules: DelegationRule[],
): DelegationRule | null;
```

### Tasks

| Task  | Description                        | Estimate | Dependencies |
| ----- | ---------------------------------- | -------- | ------------ |
| 5.1.1 | Create `HierarchicalNetwork` class | 2 days   | Phase 3      |
| 5.1.2 | Implement child network creation   | 1 day    | 5.1.1        |
| 5.1.3 | Implement delegation logic         | 2 days   | 5.1.2        |
| 5.1.4 | Add hierarchical tracing           | 1 day    | 5.1.3        |
| 5.2.1 | Create `SupervisorAgent` class     | 2 days   | 5.1.1        |
| 5.2.2 | Implement supervision logic        | 2 days   | 5.2.1        |
| 5.3.1 | Create delegation rule system      | 1 day    | 5.1.1        |
| 5.3.2 | Unit tests                         | 2 days   | 5.1.1-5.3.1  |

### Acceptance Criteria

- [ ] Networks can contain child networks
- [ ] Delegation follows defined rules
- [ ] Supervisor can review and approve actions
- [ ] Execution traces show full hierarchy
- [ ] Max depth prevents infinite nesting
- [ ] Unit test coverage >75%

### File Structure After Phase 5

```
src/lib/agent/
├── agent.ts
├── agentNetwork.ts
├── hierarchicalNetwork.ts   # NEW: Nested networks
├── supervisorAgent.ts       # NEW: Supervision
├── delegationRules.ts       # NEW: Delegation logic
├── agentEvaluator.ts
├── optimizationLoop.ts
├── primitiveExecutor.ts
├── routerAgent.ts
├── taskAnalyzer.ts
├── prompts/
│   ├── routingPrompts.ts
│   ├── evaluationPrompts.ts
│   └── supervisionPrompts.ts # NEW: Supervision prompts
├── directTools.ts
└── index.ts
```

---

## Phase 6: Agent Communication Protocol

**Duration**: 2 weeks
**Effort**: Medium
**Team Size**: 1-2 developers
**Dependencies**: Phase 3, Phase 5

### Objectives

- Define structured message format for inter-agent communication
- Implement message passing and queuing
- Create conversation management for multi-agent dialogues

### Deliverables

#### 6.1 Message Types

**File**: `src/lib/agent/communication/messageTypes.ts`

```typescript
/**
 * Inter-agent message types
 */
export type AgentMessage = {
  id: string;
  from: string; // Agent ID
  to: string; // Agent ID or 'broadcast'
  type: MessageType;
  payload: MessagePayload;
  timestamp: number;
  replyTo?: string; // For threaded conversations
  metadata?: MessageMetadata;
};

export type MessageType =
  | "request" // Request agent to perform task
  | "response" // Response to request
  | "notification" // Informational, no response expected
  | "query" // Ask for information
  | "handoff" // Transfer task to another agent
  | "feedback"; // Feedback on previous response

export type MessagePayload = {
  content: string;
  data?: unknown;
  context?: Record<string, unknown>;
};

export type MessageMetadata = {
  priority?: "low" | "normal" | "high" | "urgent";
  ttl?: number; // Time-to-live in ms
  conversationId?: string;
};
```

#### 6.2 Message Bus

**File**: `src/lib/agent/communication/messageBus.ts`

```typescript
/**
 * MessageBus - Central hub for inter-agent communication
 */
export class MessageBus {
  private subscribers: Map<string, Set<MessageHandler>>;
  private messageQueue: AgentMessage[];
  private processingInterval?: NodeJS.Timeout;

  constructor(config?: MessageBusConfig);

  /**
   * Send message to specific agent
   */
  send(message: AgentMessage): Promise<void>;

  /**
   * Broadcast message to all agents
   */
  broadcast(
    from: string,
    payload: MessagePayload,
    options?: BroadcastOptions,
  ): Promise<void>;

  /**
   * Subscribe to messages for an agent
   */
  subscribe(agentId: string, handler: MessageHandler): () => void;

  /**
   * Request-response pattern
   */
  async request(
    from: string,
    to: string,
    payload: MessagePayload,
    timeout?: number,
  ): Promise<AgentMessage>;

  /**
   * Get message history for conversation
   */
  getConversationHistory(conversationId: string): AgentMessage[];
}

export type MessageHandler = (message: AgentMessage) => void | Promise<void>;
```

#### 6.3 Conversation Manager

**File**: `src/lib/agent/communication/conversationManager.ts`

```typescript
/**
 * ConversationManager - Manages multi-agent dialogues
 */
export class ConversationManager {
  private conversations: Map<string, Conversation>;
  private messageBus: MessageBus;

  constructor(messageBus: MessageBus);

  /**
   * Start a new conversation
   */
  startConversation(participants: string[], topic?: string): Conversation;

  /**
   * Add message to conversation
   */
  addMessage(conversationId: string, message: AgentMessage): void;

  /**
   * Get conversation summary
   */
  summarize(conversationId: string): Promise<ConversationSummary>;

  /**
   * End conversation
   */
  endConversation(conversationId: string): ConversationResult;
}

export type Conversation = {
  id: string;
  participants: string[];
  topic?: string;
  messages: AgentMessage[];
  startTime: number;
  status: "active" | "paused" | "ended";
};
```

#### 6.4 Network Integration

**Update**: `src/lib/agent/agentNetwork.ts`

```typescript
// Add to AgentNetwork class:

private messageBus: MessageBus;
private conversationManager: ConversationManager;

/**
 * Enable inter-agent communication
 */
enableCommunication(config?: CommunicationConfig): void;

/**
 * Get message bus for direct access
 */
getMessageBus(): MessageBus;

/**
 * Get conversation manager
 */
getConversationManager(): ConversationManager;
```

### Tasks

| Task  | Description                     | Estimate | Dependencies |
| ----- | ------------------------------- | -------- | ------------ |
| 6.1.1 | Define message types            | 1 day    | Phase 3      |
| 6.2.1 | Create `MessageBus` class       | 2 days   | 6.1.1        |
| 6.2.2 | Implement send/subscribe        | 1 day    | 6.2.1        |
| 6.2.3 | Implement request-response      | 1 day    | 6.2.2        |
| 6.3.1 | Create `ConversationManager`    | 2 days   | 6.2.1        |
| 6.3.2 | Implement conversation tracking | 1 day    | 6.3.1        |
| 6.3.3 | Add summarization               | 1 day    | 6.3.2        |
| 6.4.1 | Integrate with `AgentNetwork`   | 1 day    | 6.2.1, 6.3.1 |
| 6.4.2 | Unit tests                      | 2 days   | 6.1.1-6.4.1  |

### Acceptance Criteria

- [ ] Messages delivered between agents
- [ ] Request-response pattern works with timeout
- [ ] Conversations tracked with history
- [ ] Broadcast reaches all subscribed agents
- [ ] Integration with AgentNetwork seamless
- [ ] Unit test coverage >80%

### File Structure After Phase 6

```
src/lib/agent/
├── agent.ts
├── agentNetwork.ts         # MODIFIED: Add communication
├── hierarchicalNetwork.ts
├── supervisorAgent.ts
├── delegationRules.ts
├── agentEvaluator.ts
├── optimizationLoop.ts
├── primitiveExecutor.ts
├── routerAgent.ts
├── taskAnalyzer.ts
├── communication/          # NEW: Communication module
│   ├── messageTypes.ts
│   ├── messageBus.ts
│   ├── conversationManager.ts
│   └── index.ts
├── prompts/
│   ├── routingPrompts.ts
│   ├── evaluationPrompts.ts
│   └── supervisionPrompts.ts
├── directTools.ts
└── index.ts
```

---

## Phase 7: Testing and Examples

**Duration**: 2 weeks
**Effort**: Medium
**Team Size**: 1-2 developers
**Dependencies**: All previous phases

### Objectives

- Comprehensive test coverage for all components
- Create example implementations for common use cases
- Documentation and API reference

### Deliverables

#### 7.1 Unit Tests

**Directory**: `test/agent/`

```typescript
// Test files
test/agent/
├── agent.test.ts           # Agent class tests
├── agentNetwork.test.ts    # AgentNetwork tests
├── routerAgent.test.ts     # RouterAgent tests
├── primitiveExecutor.test.ts
├── agentEvaluator.test.ts
├── optimizationLoop.test.ts
├── hierarchicalNetwork.test.ts
├── supervisorAgent.test.ts
├── messageBus.test.ts
└── conversationManager.test.ts
```

#### 7.2 Integration Tests

**Directory**: `test/integration/agent/`

```typescript
// Integration test files
test/integration/agent/
├── networkExecution.test.ts    # Full network execution
├── multiAgentStreaming.test.ts # Streaming tests
├── hierarchicalExecution.test.ts
├── agentCommunication.test.ts
└── evaluationOptimization.test.ts
```

#### 7.3 Example Implementations

**Directory**: `examples/agent-networks/`

```typescript
// Example files
examples/agent-networks/
├── basic-network.ts            # Simple 2-agent network
├── content-pipeline.ts         # Research + Write + Review
├── coding-assistant.ts         # Code + Test + Document
├── customer-support.ts         # Triage + Specialist routing
├── hierarchical-team.ts        # Manager + Team structure
├── collaborative-analysis.ts   # Multiple analysts converging
└── README.md                   # Usage guide
```

#### 7.4 Documentation

**Files to Create/Update**:

```markdown
docs/
├── features/
│ └── multi-agent-networks.md # Feature documentation
├── sdk/
│ └── api-reference.md # UPDATED: Add agent APIs
└── examples/
└── agent-networks.md # Example walkthroughs
```

### Tasks

| Task  | Description                        | Estimate | Dependencies |
| ----- | ---------------------------------- | -------- | ------------ |
| 7.1.1 | Write unit tests for Agent         | 1 day    | Phase 3      |
| 7.1.2 | Write unit tests for AgentNetwork  | 1 day    | Phase 3      |
| 7.1.3 | Write unit tests for RouterAgent   | 1 day    | Phase 2      |
| 7.1.4 | Write unit tests for evaluation    | 1 day    | Phase 4      |
| 7.1.5 | Write unit tests for hierarchical  | 1 day    | Phase 5      |
| 7.1.6 | Write unit tests for communication | 1 day    | Phase 6      |
| 7.2.1 | Write integration tests            | 2 days   | 7.1.1-7.1.6  |
| 7.3.1 | Create basic examples              | 2 days   | All phases   |
| 7.3.2 | Create advanced examples           | 1 day    | 7.3.1        |
| 7.4.1 | Write feature documentation        | 1 day    | All phases   |
| 7.4.2 | Update API reference               | 1 day    | 7.4.1        |

### Acceptance Criteria

- [ ] Unit test coverage >80% for all components
- [ ] Integration tests pass consistently
- [ ] All examples run without errors
- [ ] Documentation is complete and accurate
- [ ] API reference includes all public methods
- [ ] Examples cover common use cases

### Test Coverage Targets

| Component           | Target Coverage |
| ------------------- | --------------- |
| Agent               | 85%             |
| AgentNetwork        | 80%             |
| RouterAgent         | 85%             |
| PrimitiveExecutor   | 80%             |
| AgentEvaluator      | 80%             |
| OptimizationLoop    | 75%             |
| HierarchicalNetwork | 75%             |
| SupervisorAgent     | 75%             |
| MessageBus          | 85%             |
| ConversationManager | 80%             |

---

## Estimated Effort Summary

### Effort by Phase

| Phase                           | Duration     | Developer-Weeks | Complexity  |
| ------------------------------- | ------------ | --------------- | ----------- |
| Phase 1: Types and Interfaces   | 2 weeks      | 2               | Low         |
| Phase 2: Router Agent           | 3 weeks      | 4.5             | High        |
| Phase 3: Orchestrator Pattern   | 3 weeks      | 6               | High        |
| Phase 4: Evaluator-Optimizer    | 2 weeks      | 3               | Medium      |
| Phase 5: Hierarchical Networks  | 2 weeks      | 3               | Medium-High |
| Phase 6: Communication Protocol | 2 weeks      | 3               | Medium      |
| Phase 7: Testing and Examples   | 2 weeks      | 3               | Medium      |
| **Total**                       | **16 weeks** | **24.5**        |             |

### Team Recommendations

| Phase   | Recommended Team Size | Skills Required                 |
| ------- | --------------------- | ------------------------------- |
| Phase 1 | 1 developer           | TypeScript, type design         |
| Phase 2 | 1-2 developers        | TypeScript, LLM prompting       |
| Phase 3 | 2 developers          | TypeScript, async patterns      |
| Phase 4 | 1-2 developers        | TypeScript, evaluation concepts |
| Phase 5 | 1-2 developers        | TypeScript, hierarchy patterns  |
| Phase 6 | 1-2 developers        | TypeScript, messaging patterns  |
| Phase 7 | 1-2 developers        | Testing, documentation          |

### Parallel Work Opportunities

Phases that can be worked on in parallel (after dependencies met):

- **Phase 4 + Phase 5**: Can start Phase 5 after Phase 3, parallel with Phase 4
- **Phase 5 + Phase 6**: Can be developed in parallel if team allows
- **Phase 7**: Testing can begin for completed components

---

## Performance Considerations

### Runtime Performance

| Concern                    | Mitigation                                          |
| -------------------------- | --------------------------------------------------- |
| **Routing latency**        | Cache routing decisions for similar tasks           |
| **Agent initialization**   | Lazy initialization of agents                       |
| **Memory usage**           | Limit conversation history, implement summarization |
| **Streaming overhead**     | Efficient event serialization                       |
| **Message bus throughput** | Batch message processing, configurable queue size   |

### Scalability

| Aspect                 | Approach                                  |
| ---------------------- | ----------------------------------------- |
| **Large networks**     | Hierarchical decomposition, delegation    |
| **High concurrency**   | Agent pooling, parallel execution limits  |
| **Long-running tasks** | Timeout configuration, suspension support |
| **Memory scaling**     | Redis-backed state, configurable TTL      |

### Optimization Strategies

1. **Connection Pooling**: Reuse provider connections across agents
2. **Prompt Caching**: Cache routing and evaluation prompts
3. **Result Caching**: Cache deterministic tool results
4. **Lazy Loading**: Load agent definitions on first use
5. **Batch Operations**: Batch multiple tool calls when possible

### Benchmarks to Implement

```typescript
// Performance benchmarks
test/benchmarks/agent/
├── routingLatency.bench.ts     // Routing decision time
├── networkThroughput.bench.ts  // Messages per second
├── memoryUsage.bench.ts        // Memory under load
├── streamingPerformance.bench.ts
└── hierarchyDepth.bench.ts
```

### Performance Targets

| Metric                   | Target        |
| ------------------------ | ------------- |
| Routing decision latency | <200ms        |
| Agent initialization     | <100ms        |
| Message delivery         | <10ms (local) |
| Streaming first token    | <500ms        |
| Memory per agent         | <10MB         |

---

## Risk Assessment

### Technical Risks

| Risk                    | Probability | Impact | Mitigation                            |
| ----------------------- | ----------- | ------ | ------------------------------------- |
| **Routing accuracy**    | Medium      | High   | Multiple routing strategies, fallback |
| **Circular delegation** | Low         | High   | Max delegation depth, cycle detection |
| **Memory leaks**        | Medium      | Medium | Proper cleanup, resource limits       |
| **Token exhaustion**    | Medium      | Medium | Token budgets per agent/network       |
| **Provider failures**   | Low         | Medium | Existing failover mechanisms          |

### Integration Risks

| Risk                        | Probability | Impact | Mitigation                           |
| --------------------------- | ----------- | ------ | ------------------------------------ |
| **Breaking existing API**   | Low         | High   | Additive-only changes, feature flags |
| **Type conflicts**          | Low         | Medium | Careful type organization            |
| **Memory system conflicts** | Medium      | Medium | Clear separation of concerns         |

### Mitigation Strategies

1. **Feature Flags**: All new features behind flags initially
2. **Gradual Rollout**: Start with basic network, add features incrementally
3. **Extensive Testing**: Integration tests for all combinations
4. **Monitoring**: Observability hooks for production debugging
5. **Documentation**: Clear migration guides

---

## Success Metrics

### Functional Metrics

| Metric                     | Target | Measurement                     |
| -------------------------- | ------ | ------------------------------- |
| **Routing accuracy**       | >90%   | Correct primitive selection     |
| **Task completion**        | >95%   | Networks complete without error |
| **Evaluation correlation** | >0.8   | Score vs human judgment         |

### Quality Metrics

| Metric            | Target | Measurement                |
| ----------------- | ------ | -------------------------- |
| **Test coverage** | >80%   | Jest coverage report       |
| **Type coverage** | 100%   | No `any` in public API     |
| **Documentation** | 100%   | All public APIs documented |

### Adoption Metrics

| Metric                 | Target | Measurement           |
| ---------------------- | ------ | --------------------- |
| **Example completion** | 100%   | All examples work     |
| **API usability**      | <30min | Time to first network |

---

## Appendix A: Complete File Structure

```
src/lib/
├── agent/                          # NEW DIRECTORY
│   ├── index.ts                    # Module exports
│   ├── agent.ts                    # Agent class
│   ├── agentNetwork.ts             # AgentNetwork class
│   ├── hierarchicalNetwork.ts      # Nested networks
│   ├── supervisorAgent.ts          # Supervision
│   ├── routerAgent.ts              # Task routing
│   ├── taskAnalyzer.ts             # Task analysis
│   ├── primitiveExecutor.ts        # Primitive execution
│   ├── agentEvaluator.ts           # Result evaluation
│   ├── optimizationLoop.ts         # Iterative refinement
│   ├── delegationRules.ts          # Delegation logic
│   ├── directTools.ts              # EXISTING: Built-in tools
│   ├── communication/              # Inter-agent communication
│   │   ├── index.ts
│   │   ├── messageTypes.ts
│   │   ├── messageBus.ts
│   │   └── conversationManager.ts
│   └── prompts/                    # LLM prompts
│       ├── routingPrompts.ts
│       ├── evaluationPrompts.ts
│       └── supervisionPrompts.ts
├── types/
│   ├── agentNetworkTypes.ts        # NEW: Agent network types
│   ├── agentStreamTypes.ts         # NEW: Agent streaming types
│   └── index.ts                    # MODIFIED: Add exports
├── neurolink.ts                    # MODIFIED: Add agent methods
└── ...

test/
├── agent/                          # NEW: Unit tests
│   ├── agent.test.ts
│   ├── agentNetwork.test.ts
│   └── ...
└── integration/
    └── agent/                      # NEW: Integration tests
        ├── networkExecution.test.ts
        └── ...

examples/
└── agent-networks/                 # NEW: Examples
    ├── basic-network.ts
    ├── content-pipeline.ts
    └── README.md

docs/
├── features/
│   └── multi-agent-networks.md     # NEW: Feature docs
└── mastra-features-implementation/
    └── implementation-plans/
        └── 07-multi-agent-implementation-plan.md  # THIS FILE
```

---

## Appendix B: API Summary

### NeuroLink Methods

```typescript
class NeuroLink {
  // Create an agent from a definition
  createAgent(definition: AgentDefinition): Agent;

  // Create an agent network for multi-agent orchestration
  createNetwork(config: AgentNetworkConfig): AgentNetwork;

  // Execute an agent network
  async executeNetwork(
    network: AgentNetwork,
    input: NetworkExecutionInput,
    options?: NetworkExecutionOptions,
  ): Promise<NetworkExecutionResult>;

  // Stream execution of an agent network
  async *streamNetwork(
    network: AgentNetwork,
    input: NetworkExecutionInput,
    options?: NetworkExecutionOptions,
  ): AsyncIterable<NetworkStreamChunk>;
}
```

### Agent Class

```typescript
class Agent {
  readonly id: string;
  readonly name: string;
  readonly description: string;

  async execute(
    input: AgentInput,
    options?: AgentExecutionOptions,
  ): Promise<AgentResult>;
  async *stream(
    input: AgentInput,
    options?: AgentExecutionOptions,
  ): AsyncIterable<AgentStreamChunk>;
  getStatus(): AgentStatus;
}
```

### AgentNetwork Class

```typescript
class AgentNetwork {
  readonly id: string;
  readonly name: string;

  async execute(
    input: NetworkExecutionInput,
    options?: NetworkExecutionOptions,
  ): Promise<NetworkExecutionResult>;
  async *stream(
    input: NetworkExecutionInput,
    options?: NetworkExecutionOptions,
  ): AsyncIterable<NetworkStreamChunk>;

  getAgent(id: string): Agent | undefined;
  getAllAgents(): Agent[];
  getAllPrimitives(): Primitive[];

  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
}
```

---

---

## Research-Based Enhancements

This section incorporates findings from comprehensive research into modern agent frameworks, communication protocols, and multi-agent orchestration patterns.

---

## Agent Framework Comparison Insights

Based on extensive research of LangGraph, AutoGen, CrewAI, and other leading frameworks, we can derive key patterns that should inform our implementation.

### LangGraph Patterns to Adopt

LangGraph has emerged as the industry standard for graph-based agent orchestration. Key patterns:

**1. State-Based Graph Architecture**

```typescript
// LangGraph-inspired state machine pattern
type GraphState = {
  messages: Message[];
  currentAgent: string;
  toolResults: Map<string, unknown>;
  metadata: Record<string, unknown>;
};

// Nodes represent agent actions
type GraphNode = (state: GraphState) => Promise<Partial<GraphState>>;

// Edges define transitions
type EdgeCondition = (state: GraphState) => string | string[];
```

**2. ReAct Pattern Implementation**

LangGraph's ReAct (Reasoning + Acting) pattern is the most widely adopted:

```typescript
// ReAct loop: Reason → Act → Observe → Repeat
type ReActAgent = {
  // Tight coupling between reasoning and action
  reason(context: Context): Promise<Thought>;
  act(thought: Thought): Promise<Action>;
  observe(action: Action): Promise<Observation>;

  // Loop until confident answer
  execute(input: string): Promise<Result>;
};
```

**3. Durable Execution with Checkpointing**

```typescript
// LangGraph's persistence model
type CheckpointConfig = {
  // Persistence layer
  checkpointer: "memory" | "redis" | "postgres";

  // Automatic state saving after each node
  saveAfterNodes: boolean;

  // Human-in-the-loop interrupt points
  interruptBefore?: string[];
  interruptAfter?: string[];
};
```

**Key LangGraph Features to Implement:**

- Graph-based workflows with explicit State, Nodes, and Edges
- Built-in checkpointing for long-running processes
- Human-in-the-loop with `interrupt_before` and `interrupt_after`
- OpenTelemetry integration for observability
- Support for cycles and loops in execution graphs

### CrewAI Patterns to Adopt

CrewAI excels at role-based multi-agent systems with 60% Fortune 500 adoption:

**1. Role-Based Agent Design**

```typescript
// CrewAI-inspired role definitions
type CrewRole = {
  role: string; // "Senior Research Analyst"
  goal: string; // "Uncover cutting-edge developments"
  backstory: string; // Detailed character background
  tools: Tool[]; // Available capabilities
  allowDelegation: boolean;
  verbose: boolean;
};

// Crew = Team of specialized agents
type Crew = {
  agents: Agent[];
  tasks: Task[];
  process: "sequential" | "hierarchical" | "consensual";
  manager?: Agent; // For hierarchical process
};
```

**2. Task-Centric Execution**

```typescript
// CrewAI task definition pattern
type CrewTask = {
  description: string;
  expectedOutput: string;
  agent: Agent; // Assigned agent
  context?: Task[]; // Dependencies
  tools?: Tool[]; // Task-specific tools
  asyncExecution?: boolean;
  humanInput?: boolean;
};
```

**3. Memory Architecture (ChromaDB + SQLite)**

```typescript
// CrewAI memory layers
type CrewMemory = {
  // Short-term: ChromaDB vectors
  shortTerm: {
    type: "chromadb";
    embeddingModel: string;
    collectionName: string;
  };

  // Long-term: SQLite for task results
  longTerm: {
    type: "sqlite";
    path: string;
    retention: number; // days
  };

  // Entity memory via embeddings
  entityMemory: {
    enabled: boolean;
    extractEntities: boolean;
  };
};
```

**Key CrewAI Features to Implement:**

- Role-based agent personas with backstories
- Sequential, hierarchical, and consensual execution models
- Task-centric workflow definition
- Manager agent for hierarchical coordination
- Built-in delegation between agents

### AutoGen/Microsoft Agent Framework Patterns

AutoGen v0.4 introduces the Actor Model for multi-agent systems:

**1. Actor Model Architecture**

```typescript
// AutoGen-inspired actor pattern
type AgentActor = {
  // Identity
  id: string;
  name: string;

  // Message handling (Actor pattern)
  receive(message: Message): Promise<void>;

  // State management
  getState(): AgentState;
  setState(state: Partial<AgentState>): void;

  // Communication
  send(target: string, message: Message): Promise<void>;
  broadcast(message: Message): Promise<void>;
};
```

**2. Orchestration Patterns from AutoGen**

| Pattern        | Description                     | Use Case                   |
| -------------- | ------------------------------- | -------------------------- |
| **Sequential** | Step-by-step workflows          | Document processing        |
| **Concurrent** | Parallel agent execution        | Independent analysis       |
| **Group Chat** | Collaborative discussions       | Brainstorming, consensus   |
| **Handoff**    | Responsibility transfer         | Escalation, specialization |
| **Magentic**   | Manager coordinates specialists | Complex projects           |

**3. Three-Layer API Design**

```typescript
// AutoGen's layered architecture
// Layer 1: Core API - Low-level primitives
type CoreAPI = {
  createAgent(config: AgentConfig): Agent;
  sendMessage(from: string, to: string, message: Message): Promise<void>;
  createRuntime(options: RuntimeOptions): Runtime;
};

// Layer 2: AgentChat API - Rapid prototyping
type AgentChatAPI = {
  createGroupChat(agents: Agent[], config: GroupChatConfig): GroupChat;
  createConversation(agents: Agent[]): Conversation;
};

// Layer 3: Extensions API - Plugin system
type ExtensionsAPI = {
  registerCapability(name: string, capability: Capability): void;
  getCapability(name: string): Capability | undefined;
};
```

### Google ADK Patterns

Google's Agent Development Kit introduces event-driven architecture:

**1. Ask-Yield Pattern**

```typescript
// ADK's bidirectional communication
type AskYieldRunner = {
  // Runner asks for next action
  ask(): Promise<AgentResponse>;

  // Execution yields results back
  yield(result: ExecutionResult): void;

  // Event streaming
  stream(): AsyncIterable<AgentEvent>;
};
```

**2. Workflow Agent Types**

```typescript
// ADK deterministic agents
class SequentialAgent extends BaseAgent {
  async execute(agents: Agent[]): Promise<Result> {
    for (const agent of agents) {
      await agent.execute();
    }
  }
}

class ParallelAgent extends BaseAgent {
  async execute(agents: Agent[]): Promise<Result[]> {
    return Promise.all(agents.map((a) => a.execute()));
  }
}

class LoopAgent extends BaseAgent {
  async execute(agent: Agent, condition: Condition): Promise<Result> {
    while (await condition.evaluate()) {
      await agent.execute();
    }
  }
}
```

---

## A2A Protocol Considerations

Google's Agent-to-Agent (A2A) protocol, launched April 2025 with 50+ technology partners, represents the emerging standard for agent interoperability.

### A2A Protocol Overview

| Aspect         | Description                                             |
| -------------- | ------------------------------------------------------- |
| **Purpose**    | Open standard for agent interoperability across vendors |
| **Governance** | Linux Foundation project                                |
| **Adoption**   | Microsoft, Salesforce, and 50+ partners                 |
| **Focus**      | Agent-to-agent coordination (complementary to MCP)      |

### A2A Core Features

**1. Agent Card (Capability Discovery)**

```typescript
// A2A Agent Card - JSON-based capability advertisement
type AgentCard = {
  // Identity
  id: string;
  name: string;
  description: string;
  version: string;

  // Capabilities
  capabilities: {
    tools: ToolCapability[];
    skills: SkillCapability[];
    modalities: ("text" | "image" | "audio" | "video")[];
  };

  // Communication
  endpoint: string;
  authentication: AuthConfig;
  protocols: ("http" | "websocket" | "grpc")[];

  // Metadata
  provider: string;
  pricing?: PricingInfo;
  rateLimit?: RateLimitInfo;
};
```

**2. Task Lifecycle Management**

```typescript
// A2A task states
type A2ATaskState =
  | "submitted" // Task received
  | "working" // Agent processing
  | "input-required" // Waiting for human/agent input
  | "completed" // Successfully finished
  | "failed" // Error occurred
  | "cancelled"; // Externally cancelled

// Task management
type A2ATask = {
  id: string;
  state: A2ATaskState;
  input: TaskInput;
  output?: TaskOutput;
  artifacts?: Artifact[];
  history: TaskHistoryEntry[];

  // Long-running support
  progress?: number;
  estimatedCompletion?: Date;
};
```

**3. Enterprise Security**

```typescript
// OpenAPI-aligned authentication
type A2AAuth = {
  // Standard OAuth2
  oauth2?: {
    tokenUrl: string;
    scopes: string[];
  };

  // API Key
  apiKey?: {
    header: string;
    prefix?: string;
  };

  // mTLS for enterprise
  mtls?: {
    required: boolean;
    certificateAuthority: string;
  };
};
```

### MCP vs A2A: Complementary Roles

| Aspect         | MCP (Model Context Protocol)    | A2A (Agent-to-Agent)             |
| -------------- | ------------------------------- | -------------------------------- |
| **Focus**      | Model-tool interactions         | Agent-to-agent coordination      |
| **Scope**      | External tools and data sources | Cross-system agent collaboration |
| **Example**    | Agent ↔ Database               | Order Agent ↔ Supplier Agent    |
| **Transport**  | stdio, HTTP, SSE, WebSocket     | HTTP, WebSocket, gRPC            |
| **Governance** | Linux Foundation (Dec 2025)     | Linux Foundation (April 2025)    |

### Recommended Hybrid Approach

```typescript
// NeuroLink hybrid MCP + A2A architecture
type HybridCommunication = {
  // MCP for tool connections
  mcp: {
    servers: MCPServerConfig[];
    transport: MCPTransportType;
  };

  // A2A for agent coordination
  a2a: {
    agentCard: AgentCard;
    discovery: "static" | "registry" | "broadcast";
    remoteAgents: RemoteAgentConfig[];
  };
};

// Unified communication layer
class CommunicationHub {
  // Internal agents use MessageBus
  private messageBus: MessageBus;

  // External tools use MCP
  private mcpClient: MCPClient;

  // Remote agents use A2A
  private a2aClient: A2AClient;

  async send(target: CommunicationTarget, message: Message): Promise<void> {
    if (target.type === "internal") {
      return this.messageBus.send(target.agentId, message);
    } else if (target.type === "tool") {
      return this.mcpClient.callTool(target.toolId, message);
    } else if (target.type === "remote-agent") {
      return this.a2aClient.submitTask(target.agentCard, message);
    }
  }
}
```

### A2A Implementation Phases

| Phase       | Scope                                | Timeline |
| ----------- | ------------------------------------ | -------- |
| **Phase 1** | Agent Card definition and publishing | Month 1  |
| **Phase 2** | Basic task submission and retrieval  | Month 2  |
| **Phase 3** | Long-running task support            | Month 3  |
| **Phase 4** | Discovery and registry integration   | Month 4  |

---

## Mastra Agent Network Patterns

Mastra's Agent Network provides sophisticated multi-agent orchestration patterns that should inform our implementation.

### Agent Network Architecture

```typescript
// Mastra Agent Network structure
type AgentNetwork = {
  // Primitives
  agents: Agent[];
  workflows: Workflow[];
  tools: Tool[];

  // Orchestration
  router: RouterAgent;
  executionStrategy: "llm-driven" | "rule-based" | "hybrid";

  // State
  taskHistory: TaskHistoryEntry[];
  completionDetector: CompletionDetector;
};

// Network execution
const result = await network.run({
  input: "Write a blog post about AI trends",
  maxIterations: 10,
  streaming: true,
});
```

### Smart Routing Based on Conversation Context

```typescript
// Mastra routing decision
type RoutingDecision = {
  // Selected primitive
  primitiveId: string;
  primitiveType: "agent" | "workflow" | "tool";

  // Routing rationale
  confidence: number;
  reasoning: string;

  // Context used
  conversationSummary: string;
  relevantHistory: HistoryEntry[];
};

// Router prompt pattern
const ROUTER_PROMPT = `
You are a routing agent. Analyze the user's request and select
the most appropriate primitive to handle it.

Available primitives:
{{primitives}}

Task history:
{{taskHistory}}

User request: {{request}}

Select the primitive that best matches this request and explain why.
`;
```

### Task History and Completion Detection

```typescript
// Task history tracking
type TaskHistoryEntry = {
  id: string;
  timestamp: number;
  primitive: {
    id: string;
    type: "agent" | "workflow" | "tool";
  };
  input: string;
  output: string;
  duration: number;
  tokenUsage: TokenUsage;
};

// Completion detection
type CompletionDetector = {
  // Strategies
  strategy: "llm-judgment" | "output-pattern" | "explicit-signal";

  // For LLM judgment
  completionPrompt?: string;
  confidenceThreshold?: number;

  // For pattern matching
  completionPatterns?: RegExp[];

  // Check if task is complete
  isComplete(history: TaskHistoryEntry[]): Promise<boolean>;
};
```

### Nested Streaming Support

```typescript
// Mastra's nested streaming pattern
async function* streamNetworkExecution(
  network: AgentNetwork,
  input: NetworkInput,
): AsyncIterable<NetworkStreamChunk> {
  yield { type: "network-start", timestamp: Date.now() };

  while (!(await network.completionDetector.isComplete(network.taskHistory))) {
    const decision = await network.router.route(input, network.taskHistory);
    yield { type: "routing-decision", decision };

    const primitive = network.getPrimitive(decision.primitiveId);

    // Nested streaming from primitive
    if (primitive.type === "agent") {
      for await (const chunk of primitive.stream(input)) {
        yield { type: "agent-chunk", agentId: primitive.id, chunk };
      }
    } else if (primitive.type === "workflow") {
      for await (const chunk of primitive.stream(input)) {
        yield { type: "workflow-chunk", workflowId: primitive.id, chunk };
      }
    }
  }

  yield { type: "network-complete", result: network.getResult() };
}
```

### Mastra Workflow Fluent API

```typescript
// Mastra's fluent workflow API
const workflow = new Workflow({ name: "content-pipeline" })
  .step("research", researchStep)
  .then("draft", draftStep)
  .branch({
    condition: (ctx) => ctx.draft.quality > 0.8,
    positive: "publish",
    negative: "revise",
  })
  .parallel(["notify-author", "update-analytics"])
  .onError("log-error")
  .onComplete("cleanup");

// Step definition
const researchStep = createStep({
  id: "research",
  inputSchema: z.object({ topic: z.string() }),
  outputSchema: z.object({ findings: z.array(z.string()) }),
  execute: async (ctx) => {
    const findings = await researchAgent.execute(ctx.input.topic);
    return { findings };
  },
});
```

---

## Updated Orchestration Patterns

Based on research findings, here are enhanced orchestration patterns for NeuroLink.

### Pattern 1: Enhanced Orchestrator-Workers

```typescript
// Evolved from Anthropic + CrewAI patterns
type OrchestratorWorkersConfig = {
  // Orchestrator configuration
  orchestrator: {
    agent: Agent;
    planningStrategy: "upfront" | "iterative" | "hybrid";
    maxSubtasks: number;
  };

  // Worker pool
  workers: {
    agents: Map<string, Agent>;
    selectionStrategy: "round-robin" | "least-loaded" | "best-fit";
    maxConcurrent: number;
  };

  // Result aggregation
  aggregation: {
    strategy: "concat" | "merge" | "summarize" | "custom";
    customAggregator?: (results: Result[]) => Result;
  };
};

// Implementation
class OrchestratorWorkersNetwork {
  async execute(task: string): Promise<Result> {
    // 1. Orchestrator creates plan
    const plan = await this.orchestrator.plan(task);

    // 2. Distribute to workers
    const workerTasks = this.distributeToWorkers(plan.subtasks);

    // 3. Execute in parallel (respecting maxConcurrent)
    const results = await this.executeWorkerTasks(workerTasks);

    // 4. Aggregate results
    const aggregated = await this.aggregate(results);

    // 5. Orchestrator synthesizes final answer
    return this.orchestrator.synthesize(aggregated);
  }
}
```

### Pattern 2: Hierarchical with Supervision

```typescript
// CrewAI hierarchical + AutoGen supervision
type HierarchicalConfig = {
  // Manager at top
  manager: {
    agent: Agent;
    supervisionPolicy: SupervisionPolicy;
  };

  // Team leads in middle
  teamLeads: Map<
    string,
    {
      agent: Agent;
      team: Agent[];
      domain: string;
    }
  >;

  // Escalation rules
  escalation: {
    confidenceThreshold: number;
    complexityThreshold: number;
    errorThreshold: number;
  };
};

// Supervision policy
type SupervisionPolicy = {
  reviewThreshold: number; // Confidence below which to review
  escalationThreshold: number; // Severity above which to escalate
  requireApprovalFor: string[]; // Tool names requiring approval
  maxRetries: number;
};
```

### Pattern 3: Scatter-Gather with Consensus

```typescript
// Parallel execution with result consensus
type ScatterGatherConfig = {
  // Scatter configuration
  scatter: {
    agents: Agent[];
    inputTransform?: (input: string) => Map<string, string>;
    maxParallel: number;
  };

  // Gather configuration
  gather: {
    strategy: "first" | "all" | "majority" | "consensus";
    consensusThreshold?: number; // For majority/consensus
    timeout: number;
  };

  // Conflict resolution
  conflictResolution: {
    strategy: "voting" | "arbitration" | "synthesis";
    arbitrator?: Agent; // For arbitration strategy
  };
};

// Consensus implementation
class ScatterGatherNetwork {
  async executeWithConsensus(task: string): Promise<Result> {
    // Scatter to all agents
    const promises = this.agents.map((a) => a.execute(task));
    const results = await Promise.all(promises);

    // Check for consensus
    const consensus = this.findConsensus(results);
    if (consensus.agreement >= this.consensusThreshold) {
      return consensus.result;
    }

    // Resolve conflicts
    return this.resolveConflicts(results);
  }
}
```

### Pattern 4: Evaluator-Optimizer Loop

```typescript
// Anthropic's evaluator-optimizer pattern
type EvaluatorOptimizerConfig = {
  // Generator agent
  generator: Agent;

  // Evaluator agent (can be same or different)
  evaluator: Agent;

  // Optimization parameters
  optimization: {
    maxIterations: number;
    qualityThreshold: number;
    criteria: EvaluationCriteria[];
  };

  // Improvement strategy
  improvement: {
    strategy: "feedback" | "exemplars" | "chain-of-thought";
    feedbackPrompt?: string;
  };
};

// Implementation
class EvaluatorOptimizerLoop {
  async optimize(task: string): Promise<OptimizedResult> {
    let result = await this.generator.execute(task);

    for (let i = 0; i < this.maxIterations; i++) {
      // Evaluate
      const score = await this.evaluator.evaluate(result, this.criteria);

      if (score.overall >= this.qualityThreshold) {
        return { result, iterations: i + 1, finalScore: score };
      }

      // Generate improvement feedback
      const feedback = await this.evaluator.suggest(result, score);

      // Regenerate with feedback
      result = await this.generator.execute(task, { feedback });
    }

    return { result, iterations: this.maxIterations, finalScore: score };
  }
}
```

### Pattern 5: Event-Driven Pipeline

```typescript
// Google ADK + Mastra event-driven pattern
type EventDrivenPipelineConfig = {
  // Pipeline stages
  stages: Map<string, PipelineStage>;

  // Event routing
  events: {
    [eventName: string]: string[]; // Event → Stage IDs
  };

  // Error handling
  errorHandling: {
    strategy: "halt" | "skip" | "retry" | "fallback";
    fallbackStage?: string;
    maxRetries?: number;
  };
};

type PipelineStage = {
  id: string;
  agent: Agent;
  inputEvents: string[];
  outputEvents: string[];
  transform?: (input: unknown) => unknown;
};

// Implementation
class EventDrivenPipeline {
  async execute(initialEvent: Event): Promise<Result> {
    const eventQueue: Event[] = [initialEvent];
    const results: Map<string, unknown> = new Map();

    while (eventQueue.length > 0) {
      const event = eventQueue.shift()!;
      const stages = this.getStagesForEvent(event.type);

      for (const stage of stages) {
        const result = await stage.agent.execute(event.data);
        results.set(stage.id, result);

        // Emit output events
        for (const outputEvent of stage.outputEvents) {
          eventQueue.push({ type: outputEvent, data: result });
        }
      }
    }

    return this.aggregateResults(results);
  }
}
```

---

## Communication Protocol Design

### Unified Communication Architecture

Based on MCP, A2A, and internal message bus patterns, here is the unified communication design.

```typescript
// Unified communication layer
type CommunicationLayer = {
  // Internal communication (MessageBus)
  internal: {
    bus: MessageBus;
    conversationManager: ConversationManager;
  };

  // Tool communication (MCP)
  tools: {
    mcpClient: MCPClient;
    mcpServer?: MCPServer; // If exposing our tools
  };

  // Remote agent communication (A2A)
  remoteAgents: {
    a2aClient: A2AClient;
    agentCard: AgentCard;
    registry?: AgentRegistry;
  };
};
```

### Internal Communication (MessageBus)

```typescript
// Enhanced message types
type AgentMessage = {
  id: string;
  from: string; // Agent ID
  to: string | "broadcast";
  type: MessageType;
  payload: MessagePayload;
  timestamp: number;
  replyTo?: string; // For threaded conversations
  correlation?: string; // For request-response tracking
  metadata?: MessageMetadata;
};

type MessageType =
  | "request" // Request agent to perform task
  | "response" // Response to request
  | "notification" // Informational, no response expected
  | "query" // Ask for information
  | "handoff" // Transfer task to another agent
  | "feedback" // Feedback on previous response
  | "heartbeat" // Health check
  | "state-sync"; // Synchronize state between agents

// Message routing
type MessageRouter = {
  // Direct routing
  route(message: AgentMessage): Promise<string[]>; // Returns recipient IDs

  // Topic-based routing
  subscribe(agentId: string, topics: string[]): void;
  publish(topic: string, message: AgentMessage): Promise<void>;

  // Load balancing
  selectRecipient(
    candidates: string[],
    strategy: "round-robin" | "least-loaded" | "random",
  ): string;
};
```

### MCP Integration Enhancement

```typescript
// Enhanced MCP client for agent communication
type EnhancedMCPClient = {
  // Standard tool calling
  callTool(toolId: string, args: unknown): Promise<unknown>;
  listTools(): Promise<Tool[]>;

  // Agent-as-tool pattern
  registerAgentAsTool(agent: Agent): Tool;

  // Batch operations
  callToolsBatch(calls: ToolCall[]): Promise<ToolResult[]>;

  // Streaming support
  streamTool(toolId: string, args: unknown): AsyncIterable<ToolChunk>;
};

// MCP server to expose NeuroLink agents
type NeuroLinkMCPServer = {
  // Expose agents as tools
  exposeAgent(agent: Agent, options?: ExposeOptions): void;

  // Expose workflows as tools
  exposeWorkflow(workflow: Workflow, options?: ExposeOptions): void;

  // Expose network as single tool
  exposeNetwork(network: AgentNetwork, options?: ExposeOptions): void;

  // Server lifecycle
  start(port: number): Promise<void>;
  stop(): Promise<void>;
};
```

### A2A Protocol Integration

```typescript
// A2A client for remote agent communication
type A2AClient = {
  // Discovery
  discoverAgents(query: DiscoveryQuery): Promise<AgentCard[]>;
  getAgentCard(agentId: string): Promise<AgentCard>;

  // Task management
  submitTask(agent: AgentCard, task: TaskInput): Promise<A2ATask>;
  getTaskStatus(taskId: string): Promise<A2ATask>;
  cancelTask(taskId: string): Promise<void>;

  // Streaming
  streamTask(agent: AgentCard, task: TaskInput): AsyncIterable<TaskEvent>;

  // Authentication
  authenticate(agent: AgentCard): Promise<AuthToken>;
};

// A2A server to receive tasks from remote agents
type A2AServer = {
  // Publish our agent card
  publishAgentCard(card: AgentCard): Promise<void>;

  // Handle incoming tasks
  onTask(handler: (task: A2ATask) => Promise<TaskResult>): void;

  // Long-running task support
  updateTaskStatus(taskId: string, status: TaskStatus): Promise<void>;
  addTaskArtifact(taskId: string, artifact: Artifact): Promise<void>;
};
```

### Protocol Bridge

```typescript
// Bridge between internal messages, MCP, and A2A
class ProtocolBridge {
  // Unified send interface
  async send(target: Target, message: Message): Promise<Response> {
    switch (target.protocol) {
      case "internal":
        return this.sendInternal(target, message);
      case "mcp":
        return this.sendMCP(target, message);
      case "a2a":
        return this.sendA2A(target, message);
    }
  }

  // Protocol translation
  translateToMCP(message: AgentMessage): MCPToolCall {
    return {
      name: message.payload.action,
      arguments: message.payload.data,
    };
  }

  translateToA2A(message: AgentMessage): A2ATask {
    return {
      id: message.id,
      input: {
        type: "text",
        content: message.payload.content,
      },
      metadata: message.metadata,
    };
  }

  translateFromMCP(result: MCPResult): AgentMessage {
    return {
      id: randomUUID(),
      type: "response",
      payload: { content: result.content, data: result.data },
      timestamp: Date.now(),
    };
  }

  translateFromA2A(task: A2ATask): AgentMessage {
    return {
      id: task.id,
      type: "response",
      payload: { content: task.output?.content, data: task.artifacts },
      timestamp: Date.now(),
    };
  }
}
```

### Communication Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NeuroLink Agent Network                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐        ┌──────────────┐        ┌──────────┐           │
│  │  Agent   │◄──────►│  MessageBus  │◄──────►│  Agent   │           │
│  │    A     │        │   (Internal) │        │    B     │           │
│  └──────────┘        └──────┬───────┘        └──────────┘           │
│                             │                                        │
│                      ┌──────▼───────┐                               │
│                      │   Protocol   │                               │
│                      │    Bridge    │                               │
│                      └──────┬───────┘                               │
│                             │                                        │
│              ┌──────────────┼──────────────┐                        │
│              │              │              │                        │
│       ┌──────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐                │
│       │  MCP Client │ │ MCP Server│ │ A2A Client  │                │
│       └──────┬──────┘ └─────┬─────┘ └──────┬──────┘                │
│              │              │              │                        │
└──────────────┼──────────────┼──────────────┼────────────────────────┘
               │              │              │
               ▼              ▼              ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ External │   │ External │   │  Remote  │
        │   MCP    │   │  Client  │   │  Agent   │
        │ Servers  │   │(MCP Host)│   │ (A2A)    │
        └──────────┘   └──────────┘   └──────────┘
```

### Implementation Priority

| Feature               | Priority | Phase        |
| --------------------- | -------- | ------------ |
| Internal MessageBus   | High     | Phase 6      |
| MCP tool integration  | High     | Existing     |
| MCP server capability | Medium   | Post Phase 7 |
| A2A client (basic)    | Medium   | Post Phase 7 |
| A2A server capability | Low      | Future       |
| Protocol bridge       | Medium   | Post Phase 7 |

---

## Document History

| Version | Date       | Author         | Changes                                                                                                                                                                                           |
| ------- | ---------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0.0   | 2026-01-22 | NeuroLink Team | Initial implementation plan                                                                                                                                                                       |
| 1.1.0   | 2026-01-23 | NeuroLink Team | Added research-based enhancements: Agent Framework Comparison Insights, A2A Protocol Considerations, Mastra Agent Network Patterns, Updated Orchestration Patterns, Communication Protocol Design |
