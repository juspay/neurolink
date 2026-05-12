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

  /** Per-agent credentials override */
  credentials?: Record<string, unknown>;
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
    name: string;
    input: Record<string, unknown>;
    output: unknown;
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

  /** Per-execution credentials override */
  credentials?: Record<string, unknown>;
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
  execute: (args: unknown, context?: AgentExecutionContext) => Promise<unknown>;
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
export type AgentExecutionContext = {
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
  routingDecisions: AgentRoutingDecision[];

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
export type AgentRoutingDecision = {
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
export type AgentInstance = {
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
};

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
  decision: AgentRoutingDecision;
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
  | NetworkErrorChunk;

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
  previousDecisions?: AgentRoutingDecision[];

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

// ============================================================================
// EXTRACTED FROM AGENT FEATURE MODULES (per CLAUDE.md rules 2, 11, 12)
// Types defined here are imported by src/lib/agent/* feature files.
// ============================================================================

// ============================================================================
// From src/lib/agent/communication/message-bus.ts
// ============================================================================

/**
 * Message types for agent communication
 */
export type MessageType =
  | "request" // Request expecting response
  | "response" // Response to request
  | "broadcast" // One-to-many message
  | "direct" // Point-to-point message
  | "event" // Event notification
  | "command"; // Command/instruction

/**
 * Message priority levels
 */
export type MessagePriority = "high" | "normal" | "low";

/**
 * Message structure for agent communication
 */
export type AgentMessage = {
  /** Unique message ID */
  id: string;

  /** Message type */
  type: MessageType;

  /** Topic/channel for the message */
  topic: string;

  /** Sender agent ID */
  senderId: string;

  /** Recipient agent ID (for direct messages) */
  recipientId?: string;

  /** Message payload */
  payload: unknown;

  /** Correlation ID (for request-response) */
  correlationId?: string;

  /** Reply-to topic (for request-response) */
  replyTo?: string;

  /** Message priority */
  priority: MessagePriority;

  /** Timestamp */
  timestamp: number;

  /** Time-to-live in ms (after which message expires) */
  ttl?: number;

  /** Message metadata */
  metadata?: Record<string, unknown>;
};

/**
 * Message handler function type
 */
export type MessageHandler = (message: AgentMessage) => void | Promise<void>;

/**
 * Subscription options
 */
export type SubscriptionOptions = {
  /** Filter messages by sender */
  filterBySender?: string[];

  /** Filter messages by type */
  filterByType?: MessageType[];

  /** Filter messages by priority */
  filterByPriority?: MessagePriority[];

  /** Custom filter function */
  customFilter?: (message: AgentMessage) => boolean;

  /** Maximum messages to receive (-1 for unlimited) */
  maxMessages?: number;
};

/**
 * Message bus configuration
 */
export type MessageBusConfig = {
  /** Maximum messages to retain in history */
  maxHistorySize?: number;

  /** Default message TTL in ms */
  defaultTtl?: number;

  /** Enable message persistence */
  enablePersistence?: boolean;

  /** Dead letter queue for failed messages */
  enableDeadLetterQueue?: boolean;

  /** Request timeout for request-response pattern */
  requestTimeout?: number;
};

// ============================================================================
// From src/lib/agent/communication/protocols.ts
// ============================================================================

/**
 * Protocol state
 */
export type ProtocolState =
  | "initiated"
  | "pending"
  | "active"
  | "completed"
  | "failed"
  | "timeout";

/**
 * Aggregation request payload
 */
export type AggregationRequest = {
  /** Protocol session ID */
  sessionId: string;

  /** Protocol state */
  state: ProtocolState;

  /** Aggregation data */
  data: {
    results: Array<{ agentId: string; result: unknown }>;
    aggregationType: "merge" | "summarize" | "vote" | "custom";
    customAggregator?: string;
  };
};

// ============================================================================
// From src/lib/agent/coordination/coordinator.ts
// ============================================================================

/**
 * Coordination strategy for multi-agent execution
 */
export type CoordinationStrategy =
  | "sequential" // Execute agents one after another
  | "parallel" // Execute independent agents in parallel
  | "pipeline" // Output of one agent feeds into next
  | "roundRobin" // Distribute tasks in round-robin fashion
  | "leastBusy" // Route to least busy agent
  | "custom"; // Custom strategy via callback

/**
 * Configuration for the coordinator
 */
export type CoordinatorConfig = {
  /** Coordination strategy to use */
  strategy: CoordinationStrategy;

  /** Maximum concurrent agent executions (for parallel strategy) */
  maxConcurrency?: number;

  /** Timeout for individual agent execution in ms */
  agentTimeout?: number;

  /** Whether to continue on agent failure */
  continueOnFailure?: boolean;

  /** Custom coordination logic (for custom strategy) */
  customCoordinator?: (
    agents: AgentInstance[],
    task: string,
    context: CoordinationContext,
  ) => Promise<CoordinationResult>;

  /** Retry configuration */
  retry?: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier?: number;
  };
};

/**
 * Context passed during coordination
 */
export type CoordinationContext = AgentExecutionContext & {
  /** Current execution step */
  currentStep: number;

  /** Total expected steps */
  totalSteps?: number;

  /** Results from previous agents */
  previousResults: Map<string, AgentResult>;

  /** Shared state across agents */
  sharedState: Map<string, unknown>;

  /** Coordination metadata */
  metadata: {
    startTime: number;
    strategy: CoordinationStrategy;
    executionId: string;
  };
};

/**
 * Result of a coordinated execution
 */
export type CoordinationResult = {
  /** Whether coordination was successful */
  success: boolean;

  /** Results from all agents */
  agentResults: Map<string, AgentResult>;

  /** Execution steps taken */
  steps: NetworkExecutionStep[];

  /** Final combined output */
  finalOutput?: string;

  /** Any errors encountered */
  errors: Array<{ agentId: string; error: string }>;

  /** Total duration in ms */
  duration: number;

  /** Execution metadata */
  metadata: {
    executionId: string;
    strategy: CoordinationStrategy;
    agentsExecuted: number;
    agentsFailed: number;
  };
};

/**
 * Task assignment for an agent
 */
export type TaskAssignment = {
  /** Agent to execute */
  agent: AgentInstance;

  /** Task input */
  input: string;

  /** Dependencies (agent IDs that must complete first) */
  dependencies?: string[];

  /** Priority (higher = executed first) */
  priority?: number;

  /** Timeout override */
  timeout?: number;
};

// ============================================================================
// From src/lib/agent/coordination/task-distributor.ts
// ============================================================================

/**
 * Distribution strategy for tasks
 */
export type DistributionStrategy =
  | "skillBased" // Match task to agent skills
  | "loadBalanced" // Distribute evenly across agents
  | "priority" // Process highest priority first
  | "affinity" // Route based on agent affinity
  | "broadcast"; // Send to all agents

/**
 * Task priority levels
 */
export type TaskPriority =
  | "critical"
  | "high"
  | "normal"
  | "low"
  | "background";

/**
 * Task definition for distribution
 */
export type DistributableTask = {
  /** Unique task ID */
  id: string;

  /** Task description/input */
  input: string;

  /** Task priority */
  priority: TaskPriority;

  /** Required skills/capabilities */
  requiredSkills?: string[];

  /** Preferred agent (for affinity) */
  preferredAgent?: string;

  /** Task metadata */
  metadata?: Record<string, unknown>;

  /** Deadline timestamp */
  deadline?: number;

  /** Parent task ID (for subtasks) */
  parentTaskId?: string;

  /** Dependencies (task IDs) */
  dependencies?: string[];
};

/**
 * Result of task distribution
 */
export type DistributionResult = {
  /** Task ID */
  taskId: string;

  /** Assigned agent ID */
  agentId: string;

  /** Execution result */
  result?: AgentResult;

  /** Distribution timestamp */
  distributedAt: number;

  /** Completion timestamp */
  completedAt?: number;

  /** Status */
  status: "pending" | "running" | "completed" | "failed";

  /** Error if failed */
  error?: string;
};

/**
 * Agent capability description
 */
export type AgentCapability = {
  /** Agent ID */
  agentId: string;

  /** Skills/capabilities */
  skills: string[];

  /** Current load (0-1) */
  currentLoad: number;

  /** Average response time in ms */
  avgResponseTime: number;

  /** Success rate (0-1) */
  successRate: number;

  /** Affinity tags */
  affinityTags?: string[];
};

/**
 * Task Distributor configuration
 */
export type TaskDistributorConfig = {
  /** Distribution strategy */
  strategy: DistributionStrategy;

  /** Maximum queue size */
  maxQueueSize?: number;

  /** Maximum retries per task */
  maxRetries?: number;

  /** Retry delay in ms */
  retryDelay?: number;

  /** Task timeout in ms */
  taskTimeout?: number;

  /** Enable task decomposition */
  enableDecomposition?: boolean;

  /** Custom skill matcher */
  skillMatcher?: (task: DistributableTask, agent: AgentInstance) => number;
};

// ============================================================================
// From src/lib/agent/orchestration/orchestrator.ts
// ============================================================================

/**
 * Orchestration mode
 */
export type OrchestrationMode =
  | "autonomous" // Network operates independently
  | "supervised" // Human oversight required
  | "collaborative" // Multiple networks work together
  | "hierarchical"; // Parent-child network structure

/**
 * Network state
 */
export type NetworkState =
  | "idle"
  | "initializing"
  | "ready"
  | "executing"
  | "paused"
  | "error"
  | "shutdown";

/**
 * Network info
 */
export type NetworkInfo = {
  id: string;
  name: string;
  state: NetworkState;
  agentCount: number;
  mode: OrchestrationMode;
  createdAt: number;
  lastExecutionAt?: number;
  executionCount: number;
  parentNetworkId?: string;
  childNetworkIds: string[];
};

/**
 * Orchestrator configuration
 */
export type OrchestratorConfig = {
  /** Default orchestration mode */
  defaultMode?: OrchestrationMode;

  /** Maximum concurrent network executions */
  maxConcurrentExecutions?: number;

  /** Default execution timeout */
  defaultTimeout?: number;

  /** Enable hierarchical networks */
  enableHierarchy?: boolean;

  /** Maximum hierarchy depth */
  maxHierarchyDepth?: number;

  /** Enable shared message bus */
  enableSharedMessageBus?: boolean;

  /** Resource limits */
  resourceLimits?: {
    maxNetworks?: number;
    maxAgentsPerNetwork?: number;
    maxTotalAgents?: number;
  };
};

/**
 * Execution request
 */
export type ExecutionRequest = {
  networkId: string;
  input: NetworkExecutionInput;
  options?: NetworkExecutionOptions;
  priority?: "high" | "normal" | "low";
};

// ============================================================================
// From src/lib/agent/orchestration/topology.ts
// ============================================================================

/**
 * Topology type
 */
export type TopologyType = "star" | "mesh" | "hierarchical" | "ring" | "custom";

/**
 * Node in the topology
 */
export type TopologyNode = {
  /** Unique node ID */
  id: string;

  /** Agent ID (maps to agent) */
  agentId: string;

  /** Agent name */
  agentName: string;

  /** Node role in topology */
  role: "coordinator" | "supervisor" | "worker" | "peer";

  /** Connected node IDs */
  connections: string[];

  /** Parent node ID (for hierarchical) */
  parentId?: string;

  /** Child node IDs (for hierarchical) */
  childIds: string[];

  /** Node metadata */
  metadata?: Record<string, unknown>;
};

/**
 * Edge in the topology
 */
export type TopologyEdge = {
  /** Unique edge ID */
  id: string;

  /** Source node ID */
  sourceId: string;

  /** Target node ID */
  targetId: string;

  /** Edge type */
  type: "bidirectional" | "unidirectional";

  /** Communication weight (for routing optimization) */
  weight: number;

  /** Edge metadata */
  metadata?: Record<string, unknown>;
};

/**
 * Topology configuration
 */
export type TopologyConfig = {
  /** Topology type */
  type: TopologyType;

  /** Coordinator agent ID (for star topology) */
  coordinatorId?: string;

  /** Root agent ID (for hierarchical topology) */
  rootId?: string;

  /** Maximum children per node (for hierarchical) */
  maxChildren?: number;

  /** Custom edges (for custom topology) */
  customEdges?: Array<{
    source: string;
    target: string;
    bidirectional?: boolean;
  }>;
};

/**
 * Topology statistics
 */
export type TopologyStats = {
  nodeCount: number;
  edgeCount: number;
  avgConnections: number;
  maxConnections: number;
  minConnections: number;
  diameter: number; // Maximum shortest path
  density: number; // Edge count / max possible edges
};

// ============================================================================
// From src/lib/agent/prompts/routingPrompts.ts
// ============================================================================

/**
 * Options for routing prompt generation
 */
export type RoutingPromptOptions = {
  /** Include alternative primitives in response */
  includeAlternatives?: boolean;

  /** Maximum primitives to include in prompt */
  maxPrimitivesToShow?: number;

  /** Additional context for routing */
  additionalContext?: string;

  /** Conversation history for context */
  conversationHistory?: Array<{ role: string; content: string }>;
};

/**
 * MessageBus subscription record
 */
export type MessageBusSubscription = {
  id: string;
  topic: string;
  handler: MessageHandler;
  options: SubscriptionOptions;
  messageCount: number;
  subscriberId: string;
};

/**
 * Task distributor queue item
 */
export type TaskQueueItem = {
  task: DistributableTask;
  addedAt: number;
  attempts: number;
};
