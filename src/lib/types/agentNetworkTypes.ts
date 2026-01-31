/**
 * Agent Network Types for Multi-Agent Orchestration
 *
 * These types define the core abstractions for NeuroLink's multi-agent system,
 * enabling intelligent routing, agent collaboration, and hierarchical networks.
 */

import type { z } from "zod";
import type { AIProviderName } from "../constants/enums.js";
import type { TokenUsage } from "./analytics.js";

// ============================================================================
// AGENT DEFINITION TYPES
// ============================================================================

/**
 * Agent definition for creating agents in the network
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

  /** Tools available to this agent (tool names) */
  tools?: string[];

  /** Input schema for structured agent input */
  inputSchema?: z.ZodSchema;

  /** Output schema for structured agent output */
  outputSchema?: z.ZodSchema;

  /** Maximum number of steps this agent can take (default: 10) */
  maxSteps?: number;

  /** Temperature for generation (default: 0.7) */
  temperature?: number;

  /** Whether this agent can delegate to other agents (default: false) */
  canDelegate?: boolean;

  /** Custom metadata for routing decisions */
  metadata?: Record<string, unknown>;
};

/**
 * Agent input - can be a string or structured data
 */
export type AgentInput = string | Record<string, unknown>;

/**
 * Result of agent execution
 */
export type AgentResult = {
  /** Generated content */
  content: string;

  /** Structured output if schema was provided */
  object?: unknown;

  /** Token usage for this execution */
  usage?: TokenUsage;

  /** Tools used during execution */
  toolsUsed?: string[];

  /** Detailed tool execution info */
  toolExecutions?: Array<{
    toolName: string;
    args: unknown;
    result: unknown;
    success: boolean;
    duration: number;
  }>;

  /** Execution duration in milliseconds */
  duration: number;

  /** Execution status */
  status: "success" | "error";

  /** Error message if status is error */
  error?: string;

  /** Agent ID that produced this result */
  agentId: string;
};

/**
 * Options for agent execution
 */
export type AgentExecutionOptions = {
  /** Additional context for the agent */
  context?: Record<string, unknown>;

  /** Override max steps for this execution */
  maxSteps?: number;

  /** Trace ID for observability */
  traceId?: string;

  /** Parent span ID for nested tracing */
  parentSpanId?: string;

  /** Timeout in milliseconds */
  timeout?: number;
};

/**
 * Agent status information
 */
export type AgentStatus = {
  /** Agent ID */
  id: string;

  /** Agent name */
  name: string;

  /** Number of executions */
  executionCount: number;

  /** Last execution time in ms */
  lastExecutionTime?: number;

  /** Whether agent is available */
  available: boolean;
};

// ============================================================================
// NETWORK PRIMITIVE TYPES
// ============================================================================

/**
 * Types of primitives that can be orchestrated in the network
 */
export type NetworkPrimitiveType = "agent" | "workflow" | "tool";

/**
 * Base primitive type for all orchestrable components
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
 * Agent as a network primitive
 */
export type AgentPrimitive = NetworkPrimitive & {
  type: "agent";
  /** The agent instance */
  agent: AgentInstance;
};

/**
 * Workflow definition for network integration
 */
export type NetworkWorkflow = {
  /** Execute the workflow with given input */
  execute(input: unknown): Promise<{ output: unknown }>;

  /** Optional streaming support */
  stream?(input: unknown): AsyncIterable<unknown>;
};

/**
 * Workflow definition config
 */
export type NetworkWorkflowDefinition = {
  id: string;
  name: string;
  description: string;
  inputSchema?: z.ZodSchema;
  outputSchema?: z.ZodSchema;
  workflow: NetworkWorkflow;
};

/**
 * Workflow as a network primitive
 */
export type WorkflowPrimitive = NetworkPrimitive & {
  type: "workflow";
  /** The workflow instance */
  workflow: NetworkWorkflow;
};

/**
 * Tool info for network integration
 */
export type NetworkToolInfo = {
  name: string;
  description?: string;
  inputSchema?: unknown;
};

/**
 * Tool as a network primitive
 */
export type ToolPrimitive = NetworkPrimitive & {
  type: "tool";
  /** Tool information */
  tool: NetworkToolInfo;
  /** Execute the tool */
  execute: (args: unknown, context?: ExecutionContext) => Promise<unknown>;
};

/**
 * Union type for all primitives
 */
export type Primitive = AgentPrimitive | WorkflowPrimitive | ToolPrimitive;

// ============================================================================
// NETWORK CONFIGURATION TYPES
// ============================================================================

/**
 * Configuration for creating an agent network
 */
export type AgentNetworkConfig = {
  /** Unique identifier for the network (auto-generated if not provided) */
  id?: string;

  /** Human-readable name */
  name: string;

  /** Description of the network's purpose */
  description?: string;

  /** Agents in the network */
  agents: AgentDefinition[];

  /** Workflows available in the network */
  workflows?: NetworkWorkflowDefinition[];

  /** Additional tools available to all agents (tool names) */
  tools?: string[];

  /** Routing agent configuration */
  router?: RouterConfig;

  /** Default execution options */
  defaults?: NetworkDefaults;

  /** Memory configuration for the network */
  memory?: NetworkMemoryConfig;
};

/**
 * Router configuration
 */
export type RouterConfig = {
  /** Provider for the routing agent */
  provider?: AIProviderName | string;

  /** Model for the routing agent */
  model?: string;

  /** Custom routing instructions */
  instructions?: string;

  /** Maximum routing attempts before fallback */
  maxAttempts?: number;

  /** Confidence threshold for routing (0-1) */
  confidenceThreshold?: number;
};

/**
 * Memory configuration for the network
 */
export type NetworkMemoryConfig = {
  /** Enable shared memory across agents */
  shared?: boolean;

  /** Memory provider */
  provider?: "in-memory" | "redis";

  /** Memory TTL in seconds */
  ttl?: number;

  /** Maximum messages to retain */
  maxMessages?: number;
};

/**
 * Default execution options for the network
 */
export type NetworkDefaults = {
  /** Maximum steps per execution */
  maxSteps?: number;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Default temperature */
  temperature?: number;
};

// ============================================================================
// EXECUTION TYPES
// ============================================================================

/**
 * Execution context passed to primitives
 */
export type ExecutionContext = {
  /** Session ID for memory */
  sessionId?: string;

  /** Trace ID for observability */
  traceId?: string;

  /** Parent span ID */
  parentSpanId?: string;

  /** Additional context data */
  [key: string]: unknown;
};

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
 * Core message format (simplified)
 */
export type CoreMessage = {
  role: "user" | "assistant" | "system";
  content: string;
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

  /** Additional context */
  context?: Record<string, unknown>;

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

  /** Error message if status is error */
  error?: string;
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
 * Single execution step in the trace
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

  /** Formatted input for the selected primitive */
  formattedInput?: string;
};

/**
 * Token usage aggregated across the network
 */
export type NetworkTokenUsage = {
  /** Total prompt tokens */
  promptTokens: number;

  /** Total completion tokens */
  completionTokens: number;

  /** Total tokens */
  totalTokens: number;

  /** Breakdown by agent */
  byAgent?: Record<
    string,
    {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    }
  >;
};

/**
 * Execution status enum
 */
export type NetworkExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "error"
  | "suspended";

// ============================================================================
// RESULT TYPES
// ============================================================================

/**
 * Result from executing a primitive
 */
export type PrimitiveExecutionResult = {
  /** Output from the primitive */
  output: unknown;

  /** Error message if execution failed */
  error?: string;

  /** Token usage */
  usage?: TokenUsage;

  /** Execution duration in ms */
  duration?: number;
};

// ============================================================================
// AGENT INTERFACE
// ============================================================================

/**
 * Interface for agent instances
 */
export interface AgentInstance {
  /** Agent ID */
  readonly id: string;

  /** Agent name */
  readonly name: string;

  /** Agent description */
  readonly description: string;

  /** Agent instructions */
  readonly instructions: string;

  /** Execute the agent */
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
}

// ============================================================================
// STREAMING TYPES
// ============================================================================

/**
 * Agent-specific streaming chunk types
 */
export type AgentStreamChunkType =
  | "agent-start"
  | "agent-thinking"
  | "agent-text"
  | "agent-tool-call"
  | "agent-tool-result"
  | "agent-complete"
  | "agent-error";

/**
 * Agent stream chunk
 */
export type AgentStreamChunk = {
  /** Chunk type */
  type: AgentStreamChunkType;

  /** Agent ID */
  agentId: string;

  /** Timestamp */
  timestamp: number;

  /** Trace ID */
  traceId: string;

  /** Content (for text chunks) */
  content?: string;

  /** Whether content is partial (for text chunks) */
  isPartial?: boolean;

  /** Token usage (for complete chunks) */
  usage?: TokenUsage;

  /** Duration in ms (for complete chunks) */
  duration?: number;

  /** Error message (for error chunks) */
  error?: string;

  /** Tool name (for tool chunks) */
  toolName?: string;

  /** Tool call ID (for tool chunks) */
  toolCallId?: string;

  /** Tool arguments (for tool call chunks) */
  args?: unknown;

  /** Tool result (for tool result chunks) */
  result?: unknown;

  /** Whether tool succeeded (for tool result chunks) */
  success?: boolean;
};

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
 * Base streaming chunk with common fields
 */
export type NetworkStreamChunkBase = {
  /** Chunk type */
  type: NetworkStreamChunkType;

  /** Timestamp */
  timestamp: number;

  /** Trace ID */
  traceId: string;

  /** Current step index */
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
 * Primitive end event
 */
export type PrimitiveEndChunk = NetworkStreamChunkBase & {
  type: "primitive-end";
  primitive: {
    type: NetworkPrimitiveType;
    id: string;
    name: string;
  };
  output: unknown;
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
 * Network error event
 */
export type NetworkErrorChunk = NetworkStreamChunkBase & {
  type: "network-error";
  error: string;
};

/**
 * Union type for all streaming chunks
 */
export type NetworkStreamChunk =
  | NetworkStartChunk
  | RoutingDecisionChunk
  | PrimitiveStartChunk
  | PrimitiveEndChunk
  | AgentTextChunk
  | AgentToolCallChunk
  | AgentToolResultChunk
  | NetworkCompleteChunk
  | NetworkErrorChunk
  | NetworkStreamChunkBase;

// ============================================================================
// TASK ANALYSIS TYPES
// ============================================================================

/**
 * Result of task analysis
 */
export type TaskAnalysis = {
  /** Identified intent of the task */
  intent: string;

  /** Entities extracted from the task */
  entities: Entity[];

  /** Requirements for completing the task */
  requirements: Requirement[];

  /** Task complexity assessment */
  complexity: "simple" | "moderate" | "complex";

  /** Suggested primitives for handling */
  suggestedPrimitives: string[];
};

/**
 * Entity extracted from task
 */
export type Entity = {
  /** Entity type */
  type: string;

  /** Entity value */
  value: string;

  /** Confidence score */
  confidence: number;
};

/**
 * Requirement for task completion
 */
export type Requirement = {
  /** Requirement type */
  type: "tool" | "capability" | "data";

  /** Requirement description */
  description: string;

  /** Whether it's mandatory */
  mandatory: boolean;
};

// ============================================================================
// ROUTING CONTEXT TYPES
// ============================================================================

/**
 * Context for routing decisions
 */
export type RoutingContext = {
  /** Previous routing decisions */
  previousDecisions?: RoutingDecision[];

  /** Conversation history */
  conversationHistory?: CoreMessage[];

  /** User preferences */
  userPreferences?: Record<string, unknown>;

  /** Session context */
  sessionContext?: Record<string, unknown>;
};

// ============================================================================
// HIERARCHICAL NETWORK TYPES
// ============================================================================

/**
 * Configuration for hierarchical networks
 */
export type HierarchicalNetworkConfig = AgentNetworkConfig & {
  /** Maximum nesting depth */
  maxDepth?: number;

  /** Delegation rules for child networks */
  delegationRules?: DelegationRule[];

  /** Supervision mode */
  supervisionMode?: "autonomous" | "supervised" | "collaborative";
};

/**
 * Delegation rule for hierarchical networks
 */
export type DelegationRule = {
  /** Rule condition */
  condition: DelegationCondition;

  /** Target network or agent */
  targetNetwork: string;

  /** Priority (higher = checked first) */
  priority: number;
};

/**
 * Delegation condition types
 */
export type DelegationCondition =
  | { type: "keyword"; keywords: string[] }
  | { type: "complexity"; threshold: "simple" | "moderate" | "complex" }
  | { type: "toolRequired"; tools: string[] }
  | { type: "custom"; evaluator: (task: string) => boolean };

/**
 * Hierarchical execution trace
 */
export type HierarchicalExecutionTrace = NetworkExecutionTrace & {
  /** Parent trace ID if this is a child network */
  parentTraceId?: string;

  /** Child traces */
  childTraces?: HierarchicalExecutionTrace[];

  /** Hierarchy level (0 = root) */
  hierarchyLevel: number;
};

// ============================================================================
// SUPERVISOR TYPES
// ============================================================================

/**
 * Supervisor agent definition
 */
export type SupervisorAgentDefinition = AgentDefinition & {
  /** Supervision policy */
  supervisionPolicy: SupervisionPolicy;
};

/**
 * Supervision policy configuration
 */
export type SupervisionPolicy = {
  /** Confidence below which to review */
  reviewThreshold: number;

  /** Severity above which to escalate */
  escalationThreshold: number;

  /** Maximum retries before escalation */
  maxRetries: number;

  /** Tool names requiring approval */
  requireApprovalFor: string[];
};

/**
 * Supervision options
 */
export type SupervisionOptions = {
  /** Whether to enforce approval */
  enforceApproval?: boolean;

  /** Timeout for approval */
  approvalTimeout?: number;

  /** Fallback behavior on timeout */
  timeoutBehavior?: "reject" | "approve" | "escalate";
};

/**
 * Result of supervised execution
 */
export type SupervisedResult = AgentResult & {
  /** Whether approval was required */
  requiredApproval: boolean;

  /** Approval decision */
  approvalDecision?: ReviewDecision;

  /** Escalation info if escalated */
  escalation?: EscalationResult;
};

/**
 * Review decision by supervisor
 */
export type ReviewDecision = {
  /** Whether approved */
  approved: boolean;

  /** Reason for decision */
  reason: string;

  /** Modifications made */
  modifications?: Record<string, unknown>;

  /** Timestamp */
  timestamp: number;
};

/**
 * Issue requiring escalation
 */
export type EscalationIssue = {
  /** Issue type */
  type: "error" | "confidence" | "policy" | "timeout";

  /** Issue description */
  description: string;

  /** Severity level */
  severity: number;

  /** Context data */
  context: Record<string, unknown>;
};

/**
 * Result of escalation
 */
export type EscalationResult = {
  /** Whether escalation was handled */
  handled: boolean;

  /** Handler that processed escalation */
  handler?: string;

  /** Resolution */
  resolution?: string;

  /** Timestamp */
  timestamp: number;
};

/**
 * Agent action for review
 */
export type AgentAction = {
  /** Action type */
  type: "tool-call" | "generation" | "delegation";

  /** Action details */
  details: Record<string, unknown>;

  /** Associated agent */
  agentId: string;

  /** Timestamp */
  timestamp: number;
};

// ============================================================================
// EVALUATION TYPES
// ============================================================================

/**
 * Evaluation criteria for agent results
 */
export type EvaluationCriteria = {
  /** Check for accuracy */
  accuracy?: boolean;

  /** Check for completeness */
  completeness?: boolean;

  /** Check for relevance */
  relevance?: boolean;

  /** Check for coherence */
  coherence?: boolean;

  /** Custom criteria */
  customCriteria?: string[];
};

/**
 * Evaluation score
 */
export type EvaluationScore = {
  /** Overall score (0-1) */
  overall: number;

  /** Score breakdown */
  breakdown: {
    accuracy?: number;
    completeness?: number;
    relevance?: number;
    coherence?: number;
    [key: string]: number | undefined;
  };

  /** Feedback text */
  feedback: string;
};

/**
 * Improvement suggestion
 */
export type ImprovementSuggestion = {
  /** Suggestion type */
  type: "content" | "format" | "completeness" | "accuracy";

  /** Suggestion description */
  description: string;

  /** Priority (1-5) */
  priority: number;

  /** Specific fix if applicable */
  fix?: string;
};

/**
 * Optimization configuration
 */
export type OptimizationConfig = {
  /** Agent to optimize */
  agent: AgentInstance;

  /** Evaluator instance */
  evaluator: AgentEvaluatorInterface;

  /** Maximum iterations */
  maxIterations: number;

  /** Quality threshold to meet */
  qualityThreshold: number;
};

/**
 * Optimization result
 */
export type OptimizationResult = {
  /** Final result after optimization */
  finalResult: AgentResult;

  /** All iterations */
  iterations: OptimizationIteration[];

  /** Final evaluation score */
  finalScore: EvaluationScore;

  /** Total duration in ms */
  totalDuration: number;
};

/**
 * Single optimization iteration
 */
export type OptimizationIteration = {
  /** Iteration number */
  iteration: number;

  /** Result from this iteration */
  result: AgentResult;

  /** Score for this iteration */
  score: EvaluationScore;

  /** Improvements suggested */
  improvements: ImprovementSuggestion[];
};

/**
 * Optimization streaming chunk
 */
export type OptimizationChunk = {
  /** Chunk type */
  type: "iteration-start" | "iteration-result" | "optimization-complete";

  /** Current iteration */
  iteration: number;

  /** Current score */
  score?: EvaluationScore;

  /** Current result */
  result?: AgentResult;

  /** Final result (for complete) */
  finalResult?: OptimizationResult;
};

/**
 * Agent evaluator interface
 */
export interface AgentEvaluatorInterface {
  /** Evaluate a result */
  evaluate(
    result: AgentResult,
    criteria: EvaluationCriteria,
  ): Promise<EvaluationScore>;

  /** Check if score meets threshold */
  meetsThreshold(score: EvaluationScore, threshold: number): boolean;

  /** Generate improvement suggestions */
  suggest(
    result: AgentResult,
    score: EvaluationScore,
  ): Promise<ImprovementSuggestion[]>;
}

/**
 * Network evaluation metrics
 */
export type NetworkEvaluationMetrics = {
  /** Average routing confidence */
  averageRoutingConfidence: number;

  /** Routing accuracy (if ground truth available) */
  routingAccuracy?: number;

  /** Average agent quality scores */
  averageAgentQuality: number;

  /** Metrics by agent */
  byAgent: Record<
    string,
    {
      executionCount: number;
      averageScore: number;
      averageDuration: number;
    }
  >;
};

/**
 * Evaluated network result
 */
export type EvaluatedNetworkResult = NetworkExecutionResult & {
  /** Evaluation score */
  evaluationScore: EvaluationScore;

  /** Whether optimization was applied */
  optimized: boolean;

  /** Number of optimization iterations */
  optimizationIterations?: number;
};

/**
 * Optimization options for network execution
 */
export type OptimizationOptions = {
  /** Enable optimization */
  enabled?: boolean;

  /** Maximum iterations */
  maxIterations?: number;

  /** Quality threshold */
  qualityThreshold?: number;
};

// ============================================================================
// EVALUATOR CONFIG
// ============================================================================

/**
 * Evaluator configuration
 */
export type EvaluatorConfig = {
  /** Model to use for evaluation */
  model?: string;

  /** Provider for evaluation */
  provider?: AIProviderName | string;

  /** Custom evaluation prompt */
  evaluationPrompt?: string;

  /** Temperature for evaluation */
  temperature?: number;
};
