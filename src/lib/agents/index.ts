/**
 * Multi-Agent Networks Module
 *
 * This module provides comprehensive multi-agent orchestration capabilities
 * for NeuroLink, enabling intelligent task routing, agent coordination,
 * and inter-agent communication.
 *
 * @module agents
 *
 * @example Basic Usage
 * ```typescript
 * import { Agent, AgentNetwork, createNetwork } from '@juspay/neurolink';
 *
 * // Create a network with multiple agents
 * const network = await createNetwork({
 *   name: 'Research Team',
 *   agents: [
 *     {
 *       id: 'researcher',
 *       name: 'Research Agent',
 *       description: 'Searches and analyzes information',
 *       instructions: 'You are a research assistant.'
 *     },
 *     {
 *       id: 'writer',
 *       name: 'Content Writer',
 *       description: 'Creates written content',
 *       instructions: 'You are a content writer.'
 *     }
 *   ]
 * }, neurolink);
 *
 * // Execute the network
 * const result = await network.execute({
 *   message: 'Research and write about TypeScript'
 * });
 * ```
 */

// ============================================================================
// Core Classes
// ============================================================================

export { Agent } from "./Agent.js";
export { AgentNetwork } from "./AgentNetwork.js";
export {
  RoutingAgent,
  scorePrimitive,
  selectPrimitiveByHeuristics,
} from "./RoutingAgent.js";

// ============================================================================
// Factory and Registry
// ============================================================================

export {
  AgentFactory,
  getAgentFactory,
  createAgent,
  createNetwork,
  createRoutingAgent,
} from "./AgentFactory.js";

export { AgentRegistry, getAgentRegistry } from "./AgentRegistry.js";

// ============================================================================
// Communication
// ============================================================================

export { MessageBus } from "./communication/MessageBus.js";
export {
  ProtocolManager,
  HandshakeProtocolHandler,
  DelegationProtocolHandler,
  ConsensusProtocolHandler,
  HeartbeatProtocolHandler,
} from "./communication/Protocol.js";

// ============================================================================
// Topologies
// ============================================================================

export { HubSpokeTopology } from "./topologies/HubSpokeTopology.js";
export type { HubSpokeConfig } from "./topologies/HubSpokeTopology.js";

export { MeshTopology } from "./topologies/MeshTopology.js";
export type { MeshConfig } from "./topologies/MeshTopology.js";

export { HierarchicalTopology } from "./topologies/HierarchicalTopology.js";
export type { HierarchicalConfig } from "./topologies/HierarchicalTopology.js";

// ============================================================================
// Errors
// ============================================================================

export {
  AgentError,
  AgentExecutionError,
  AgentNotFoundError,
  RoutingError,
  DelegationError,
  CoordinationError,
  NetworkExecutionError,
  NetworkTimeoutError,
  MaxStepsExceededError,
  MessageDeliveryError,
  ProtocolError,
  ValidationError,
  AgentErrorCodes,
  AgentErrorFactory,
  isAgentError,
  isRetryableAgentError,
  createAgentError,
  wrapAsAgentError,
} from "./errors/agentErrors.js";

// ============================================================================
// Types
// ============================================================================

export type {
  // Token usage type (local definition for agent system)
  TokenUsage as AgentTokenUsage,

  // Agent types
  AgentDefinition,
  AgentInput,
  AgentExecutionOptions,
  AgentResult,
  AgentStatus,
  AgentState,
  AgentInterface,
  AgentType,
  AgentRegistryMetadata,
  AgentFactoryConfig,
  ToolExecution,

  // Network types
  AgentNetworkConfig,
  NetworkExecutionInput,
  NetworkExecutionOptions,
  NetworkExecutionResult,
  NetworkExecutionStatus,
  NetworkExecutionTrace,
  NetworkExecutionStep,
  NetworkTokenUsage,
  NetworkDefaults,
  NetworkMemoryConfig,

  // Primitive types
  NetworkPrimitiveType,
  NetworkPrimitive,
  AgentPrimitive,
  WorkflowPrimitive,
  ToolPrimitive,
  Primitive,
  ExecutionContext,

  // Workflow types
  NetworkWorkflow,
  NetworkWorkflowDefinition,
  WorkflowResult,

  // Routing types
  RouterConfig,
  RoutingDecision,
  RoutingAnalysis,
  AlternativePrimitive,

  // Streaming types
  NetworkStreamChunkType,
  NetworkStreamChunk,
  NetworkStreamChunkBase,
  NetworkStartChunk,
  RoutingStartChunk,
  RoutingDecisionChunk,
  RoutingEndChunk,
  PrimitiveStartChunk,
  PrimitiveEndChunk,
  AgentStartChunk,
  AgentTextChunk,
  AgentCompleteChunk,
  AgentErrorChunk,
  AgentToolCallChunk,
  AgentToolResultChunk,
  NetworkCompleteChunk,
  NetworkErrorChunk,
  AgentStreamChunk,

  // Topology types
  TopologyConfig,
  TopologyType,
  HierarchyLevel,

  // Event types
  AgentNetworkEvents,
  CoreMessage,
  TracingConfig,
  ModelSettingsOverride,

  // Message types
  AgentMessage,
  AgentMessageType,
  MessagePriority,
  MessageHandler,
  MessageSubscription,

  // Protocol types
  ProtocolType,
  ProtocolState,
  HandshakePayload,
  DelegationPayload,
  DelegationResponse,
  ConsensusPayload,
  ConsensusResult,
  HeartbeatPayload,
} from "./types/agentTypes.js";
