/**
 * Type definitions for Multi-Agent Networks
 *
 * This module provides comprehensive type definitions for the agent system,
 * including agent definitions, network configurations, execution types,
 * streaming events, and routing decisions.
 */

import type { z } from "zod";
import type { AIProviderName } from "../../constants/enums.js";
import type { ToolInfo } from "../../types/tools.js";

/**
 * Token usage for agent operations
 * Note: This is defined locally to match the agent system's expected format.
 * The system-wide TokenUsage type uses different field names (input/output/total).
 */
export interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

// ============================================================================
// Agent Definition Types
// ============================================================================

/**
 * Agent definition for creating agents in a network
 */
export interface AgentDefinition {
  /** Unique identifier for the agent */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description of the agent's capabilities (critical for routing decisions) */
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
}

/**
 * Agent input type - can be a string or structured input
 */
export type AgentInput = string | Record<string, unknown>;

/**
 * Agent execution options
 */
export interface AgentExecutionOptions {
  /** Execution context */
  context?: Record<string, unknown>;

  /** Maximum steps for this execution */
  maxSteps?: number;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Trace ID for correlation */
  traceId?: string;

  /** Thread ID for conversation context */
  threadId?: string;

  /** Resource ID for user/resource scoping */
  resourceId?: string;
}

/**
 * Agent execution result
 */
export interface AgentResult {
  /** Generated content */
  content: string;

  /** Parsed structured output if schema was provided */
  object?: unknown;

  /** Token usage for this execution */
  usage?: TokenUsage;

  /** Tools that were used during execution */
  toolsUsed?: string[];

  /** Detailed tool execution information */
  toolExecutions?: ToolExecution[];

  /** Execution duration in milliseconds */
  duration: number;

  /** Execution status */
  status: "success" | "error" | "partial";

  /** Agent ID that produced this result */
  agentId: string;

  /** Error message if status is 'error' */
  error?: string;
}

/**
 * Tool execution record
 */
export interface ToolExecution {
  /** Tool name */
  name: string;

  /** Tool arguments */
  args: unknown;

  /** Tool result */
  result: unknown;

  /** Execution duration */
  duration: number;

  /** Whether the execution was successful */
  success: boolean;

  /** Error message if failed */
  error?: string;
}

/**
 * Agent status information
 */
export interface AgentStatus {
  /** Agent ID */
  id: string;

  /** Agent name */
  name: string;

  /** Number of times the agent has been executed */
  executionCount: number;

  /** Last execution duration in milliseconds */
  lastExecutionTime?: number;

  /** Whether the agent is available for execution */
  available: boolean;

  /** Current state of the agent */
  state?: AgentState;
}

/**
 * Agent execution state
 */
export type AgentState = "idle" | "executing" | "suspended" | "error";

// ============================================================================
// Network Primitive Types
// ============================================================================

/**
 * Primitive types that can be orchestrated in the network
 */
export type NetworkPrimitiveType = "agent" | "workflow" | "tool";

/**
 * Base primitive type
 */
export interface NetworkPrimitive {
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
}

/**
 * Agent primitive - wraps an Agent instance
 */
export interface AgentPrimitive extends NetworkPrimitive {
  type: "agent";
  agent: AgentInterface;
}

/**
 * Workflow primitive - wraps a workflow
 */
export interface WorkflowPrimitive extends NetworkPrimitive {
  type: "workflow";
  workflow: NetworkWorkflow;
}

/**
 * Tool primitive - wraps a tool
 */
export interface ToolPrimitive extends NetworkPrimitive {
  type: "tool";
  tool: ToolInfo;
  execute: (args: unknown, context?: ExecutionContext) => Promise<unknown>;
}

/**
 * Union type for all primitives
 */
export type Primitive = AgentPrimitive | WorkflowPrimitive | ToolPrimitive;

/**
 * Execution context for tools and primitives
 */
export interface ExecutionContext {
  sessionId?: string;
  traceId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Workflow Types
// ============================================================================

/**
 * Workflow interface for network integration
 */
export interface NetworkWorkflow {
  /** Execute the workflow */
  execute(input: unknown): Promise<WorkflowResult>;
}

/**
 * Workflow definition for network configuration
 */
export interface NetworkWorkflowDefinition {
  /** Unique identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description of the workflow */
  description: string;

  /** Input schema */
  inputSchema?: z.ZodSchema;

  /** Output schema */
  outputSchema?: z.ZodSchema;

  /** The workflow instance */
  workflow: NetworkWorkflow;
}

/**
 * Workflow execution result
 */
export interface WorkflowResult {
  /** Output from the workflow */
  output: unknown;

  /** Duration in milliseconds */
  duration?: number;

  /** Success status */
  success?: boolean;

  /** Error if failed */
  error?: string;
}

// ============================================================================
// Network Configuration Types
// ============================================================================

/**
 * Configuration for creating an agent network
 */
export interface AgentNetworkConfig {
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
  router?: RouterConfig;

  /** Default execution options */
  defaults?: NetworkDefaults;

  /** Memory configuration */
  memory?: NetworkMemoryConfig;

  /** Topology configuration */
  topology?: TopologyConfig;
}

/**
 * Router configuration
 */
export interface RouterConfig {
  /** Provider for the routing agent */
  provider?: AIProviderName | string;

  /** Model for the routing agent */
  model?: string;

  /** Custom routing instructions */
  instructions?: string;

  /** Maximum routing attempts */
  maxAttempts?: number;

  /** Minimum confidence threshold for routing */
  confidenceThreshold?: number;

  /** Fallback agent ID if routing fails */
  fallbackAgentId?: string;
}

/**
 * Default network execution options
 */
export interface NetworkDefaults {
  /** Maximum steps across the network */
  maxSteps?: number;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Default temperature */
  temperature?: number;
}

/**
 * Network memory configuration
 */
export interface NetworkMemoryConfig {
  /** Enable shared memory across agents */
  shared?: boolean;

  /** Memory provider */
  provider?: "in-memory" | "redis";

  /** Memory TTL in seconds */
  ttl?: number;

  /** Redis connection options (if provider is redis) */
  redis?: {
    url?: string;
    host?: string;
    port?: number;
    password?: string;
  };
}

/**
 * Topology configuration for the network
 */
export interface TopologyConfig {
  /** Topology type */
  type: TopologyType;

  /** Hub agent ID for hub-spoke topology */
  hubAgentId?: string;

  /** Hierarchy levels for hierarchical topology */
  hierarchy?: HierarchyLevel[];
}

/**
 * Supported topology types
 */
export type TopologyType =
  | "hub-spoke"
  | "mesh"
  | "hierarchical"
  | "ring"
  | "custom";

/**
 * Hierarchy level definition
 */
export interface HierarchyLevel {
  /** Level name */
  name: string;

  /** Agent IDs at this level */
  agentIds: string[];

  /** Parent level name */
  parent?: string;
}

// ============================================================================
// Network Execution Types
// ============================================================================

/**
 * Input for network execution
 */
export interface NetworkExecutionInput {
  /** The task or message to process */
  message: string | CoreMessage[];

  /** Thread ID for conversation context */
  threadId?: string;

  /** User/resource identifier */
  resourceId?: string;

  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Core message type for conversations
 */
export interface CoreMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Options for network execution
 */
export interface NetworkExecutionOptions {
  /** Maximum execution steps across the network */
  maxSteps?: number;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Enable streaming */
  stream?: boolean;

  /** Tracing configuration */
  tracing?: TracingConfig;

  /** Model settings override */
  modelSettings?: ModelSettingsOverride;

  /** Output schema for structured output */
  outputSchema?: z.ZodSchema;

  /** Additional context passed to primitives */
  context?: Record<string, unknown>;
}

/**
 * Tracing configuration
 */
export interface TracingConfig {
  enabled?: boolean;
  traceId?: string;
  parentSpanId?: string;
}

/**
 * Model settings override
 */
export interface ModelSettingsOverride {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

/**
 * Result of network execution
 */
export interface NetworkExecutionResult {
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

  /** Error message if status is 'error' */
  error?: string;
}

/**
 * Network execution status
 */
export type NetworkExecutionStatus =
  | "completed"
  | "error"
  | "timeout"
  | "cancelled"
  | "partial";

/**
 * Token usage across the network
 */
export interface NetworkTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Execution trace for debugging and monitoring
 */
export interface NetworkExecutionTrace {
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
}

/**
 * Single execution step
 */
export interface NetworkExecutionStep {
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

  /** Timestamp when step started */
  timestamp: number;
}

// ============================================================================
// Routing Types
// ============================================================================

/**
 * Routing decision record
 */
export interface RoutingDecision {
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

  /** Formatted input for the selected primitive */
  formattedInput?: string;

  /** Alternative primitives considered */
  alternatives?: AlternativePrimitive[];
}

/**
 * Alternative primitive in routing decision
 */
export interface AlternativePrimitive {
  type: NetworkPrimitiveType;
  id: string;
  confidence: number;
}

/**
 * Routing analysis result from the router
 */
export interface RoutingAnalysis {
  selectedPrimitive: {
    type: NetworkPrimitiveType;
    id: string;
    name: string;
  };
  confidence: number;
  reasoning: string;
  formattedInput?: string;
  alternatives?: AlternativePrimitive[];
}

// ============================================================================
// Streaming Event Types
// ============================================================================

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
  | "agent-start"
  | "agent-complete"
  | "agent-error"
  | "workflow-step"
  | "network-progress"
  | "network-complete"
  | "network-error";

/**
 * Base streaming chunk
 */
export interface NetworkStreamChunkBase {
  type: NetworkStreamChunkType;
  timestamp: number;
  traceId: string;
  stepIndex?: number;
}

/**
 * Network start event
 */
export interface NetworkStartChunk extends NetworkStreamChunkBase {
  type: "network-start";
  networkId: string;
  input: string;
}

/**
 * Routing start event
 */
export interface RoutingStartChunk extends NetworkStreamChunkBase {
  type: "routing-start";
}

/**
 * Routing decision event
 */
export interface RoutingDecisionChunk extends NetworkStreamChunkBase {
  type: "routing-decision";
  decision: RoutingDecision;
}

/**
 * Routing end event
 */
export interface RoutingEndChunk extends NetworkStreamChunkBase {
  type: "routing-end";
}

/**
 * Primitive start event
 */
export interface PrimitiveStartChunk extends NetworkStreamChunkBase {
  type: "primitive-start";
  primitive: {
    type: NetworkPrimitiveType;
    id: string;
    name: string;
  };
  input: unknown;
}

/**
 * Primitive end event
 */
export interface PrimitiveEndChunk extends NetworkStreamChunkBase {
  type: "primitive-end";
  primitive: {
    type: NetworkPrimitiveType;
    id: string;
    name: string;
  };
  output: unknown;
}

/**
 * Agent start event
 */
export interface AgentStartChunk extends NetworkStreamChunkBase {
  type: "agent-start";
  agentId: string;
}

/**
 * Agent text generation event
 */
export interface AgentTextChunk extends NetworkStreamChunkBase {
  type: "agent-text";
  agentId: string;
  content: string;
  isPartial: boolean;
}

/**
 * Agent complete event
 */
export interface AgentCompleteChunk extends NetworkStreamChunkBase {
  type: "agent-complete";
  agentId: string;
  content: string;
  usage?: TokenUsage;
  duration: number;
}

/**
 * Agent error event
 */
export interface AgentErrorChunk extends NetworkStreamChunkBase {
  type: "agent-error";
  agentId: string;
  error: string;
}

/**
 * Agent tool call event
 */
export interface AgentToolCallChunk extends NetworkStreamChunkBase {
  type: "agent-tool-call";
  agentId: string;
  toolName: string;
  args: unknown;
  toolCallId: string;
}

/**
 * Agent tool result event
 */
export interface AgentToolResultChunk extends NetworkStreamChunkBase {
  type: "agent-tool-result";
  agentId: string;
  toolName: string;
  toolCallId: string;
  result: unknown;
  success: boolean;
}

/**
 * Network complete event
 */
export interface NetworkCompleteChunk extends NetworkStreamChunkBase {
  type: "network-complete";
  result: NetworkExecutionResult;
}

/**
 * Network error event
 */
export interface NetworkErrorChunk extends NetworkStreamChunkBase {
  type: "network-error";
  error: string;
}

/**
 * Union type for all streaming chunks
 */
export type NetworkStreamChunk =
  | NetworkStartChunk
  | RoutingStartChunk
  | RoutingDecisionChunk
  | RoutingEndChunk
  | PrimitiveStartChunk
  | PrimitiveEndChunk
  | AgentStartChunk
  | AgentTextChunk
  | AgentCompleteChunk
  | AgentErrorChunk
  | AgentToolCallChunk
  | AgentToolResultChunk
  | NetworkCompleteChunk
  | NetworkErrorChunk
  | NetworkStreamChunkBase;

/**
 * Agent stream chunk types (for individual agent streaming)
 */
export type AgentStreamChunk =
  | AgentStartChunk
  | AgentTextChunk
  | AgentCompleteChunk
  | AgentErrorChunk
  | AgentToolCallChunk
  | AgentToolResultChunk;

// ============================================================================
// Agent Interface
// ============================================================================

/**
 * Agent interface that defines the contract for agent implementations
 */
export interface AgentInterface extends AgentDefinition {
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
}

// ============================================================================
// Agent Registry Types
// ============================================================================

/**
 * Agent type for registry
 */
export type AgentType = "agent" | "router" | "supervisor" | "coordinator";

/**
 * Agent registry metadata
 */
export interface AgentRegistryMetadata {
  type: AgentType;
  description: string;
  capabilities?: string[];
  defaultModel?: string;
}

/**
 * Agent factory configuration
 */
export interface AgentFactoryConfig extends AgentDefinition {
  sdk?: unknown; // NeuroLink instance
}

// ============================================================================
// Network Events
// ============================================================================

/**
 * Network event types for TypedEventEmitter
 */
export interface AgentNetworkEvents {
  "network:start": [NetworkStartChunk];
  "network:complete": [NetworkCompleteChunk];
  "network:error": [NetworkErrorChunk];
  "routing:start": [RoutingStartChunk];
  "routing:decision": [RoutingDecisionChunk];
  "routing:end": [RoutingEndChunk];
  "primitive:start": [PrimitiveStartChunk];
  "primitive:end": [PrimitiveEndChunk];
  "agent:start": [AgentStartChunk];
  "agent:text": [AgentTextChunk];
  "agent:complete": [AgentCompleteChunk];
  "agent:error": [AgentErrorChunk];
  "agent:tool-call": [AgentToolCallChunk];
  "agent:tool-result": [AgentToolResultChunk];
}

// ============================================================================
// Message Bus Types (for inter-agent communication)
// ============================================================================

/**
 * Message type for inter-agent communication
 */
export interface AgentMessage {
  /** Unique message ID */
  id: string;

  /** Sender agent ID */
  from: string;

  /** Recipient agent ID (or '*' for broadcast) */
  to: string;

  /** Message type */
  type: AgentMessageType;

  /** Message payload */
  payload: unknown;

  /** Timestamp */
  timestamp: number;

  /** Correlation ID for request/response */
  correlationId?: string;

  /** Message priority */
  priority?: MessagePriority;
}

/**
 * Agent message types
 */
export type AgentMessageType =
  | "request"
  | "response"
  | "broadcast"
  | "handshake"
  | "heartbeat"
  | "delegation"
  | "consensus"
  | "error";

/**
 * Message priority levels
 */
export type MessagePriority = "low" | "normal" | "high" | "critical";

/**
 * Message handler type
 */
export type MessageHandler = (message: AgentMessage) => Promise<void>;

/**
 * Message subscription
 */
export interface MessageSubscription {
  topic: string;
  handler: MessageHandler;
  unsubscribe: () => void;
}

// ============================================================================
// Protocol Types
// ============================================================================

/**
 * Protocol types for agent communication
 */
export type ProtocolType =
  | "handshake"
  | "delegation"
  | "consensus"
  | "heartbeat";

/**
 * Protocol state
 */
export interface ProtocolState {
  type: ProtocolType;
  status: "pending" | "active" | "completed" | "failed";
  participants: string[];
  startTime: number;
  endTime?: number;
  data?: Record<string, unknown>;
}

/**
 * Handshake protocol payload
 */
export interface HandshakePayload {
  capabilities: string[];
  agentInfo: {
    id: string;
    name: string;
    type: AgentType;
  };
}

/**
 * Delegation protocol payload
 */
export interface DelegationPayload {
  task: string;
  context: Record<string, unknown>;
  deadline?: number;
  priority?: MessagePriority;
}

/**
 * Delegation response
 */
export interface DelegationResponse {
  accepted: boolean;
  result?: unknown;
  error?: string;
  duration?: number;
}

/**
 * Consensus protocol payload
 */
export interface ConsensusPayload {
  topic: string;
  options: string[];
  votes?: Record<string, string>;
  deadline?: number;
}

/**
 * Consensus result
 */
export interface ConsensusResult {
  topic: string;
  winner: string;
  votes: Record<string, string>;
  unanimous: boolean;
}

/**
 * Heartbeat payload
 */
export interface HeartbeatPayload {
  agentId: string;
  status: AgentState;
  timestamp: number;
  metrics?: {
    executionCount: number;
    lastExecutionTime?: number;
    memoryUsage?: number;
  };
}
