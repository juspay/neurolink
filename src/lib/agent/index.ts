/**
 * Agent Module - Multi-Agent Networks for NeuroLink
 *
 * This module provides comprehensive multi-agent orchestration capabilities:
 * - Agent: Individual agent with specialized instructions and tools
 * - AgentNetwork: Multi-agent orchestration with intelligent routing
 * - RouterAgent: Task routing and delegation
 *
 * @example Basic Usage
 * ```typescript
 * import { Agent, AgentNetwork } from '@juspay/neurolink';
 *
 * const neurolink = new NeuroLink();
 *
 * // Create a network with multiple agents
 * const network = neurolink.createNetwork({
 *   name: 'Content Team',
 *   agents: [
 *     { id: 'researcher', name: 'Researcher', description: '...', instructions: '...' },
 *     { id: 'writer', name: 'Writer', description: '...', instructions: '...' }
 *   ]
 * });
 *
 * // Execute the network
 * const result = await network.execute({
 *   message: 'Write an article about AI trends'
 * });
 * ```
 */

// Re-export agent types for convenience
export type {
  // Agent types
  AgentDefinition,
  AgentExecutionOptions,
  AgentInput,
  AgentInstance,
  // Network types
  AgentNetworkConfig,
  AgentPrimitive,
  AgentResult,
  AgentStatus,
  // Streaming types
  AgentStreamChunk,
  AgentStreamChunkType,
  NetworkExecutionInput,
  NetworkExecutionOptions,
  NetworkExecutionResult,
  NetworkExecutionStatus,
  NetworkExecutionStep,
  NetworkExecutionTrace,
  NetworkPrimitive,
  // Primitive types
  NetworkPrimitiveType,
  NetworkStreamChunk,
  NetworkStreamChunkType,
  NetworkTokenUsage,
  NetworkWorkflow,
  NetworkWorkflowDefinition,
  Primitive,
  // Routing types
  RouterConfig,
  RoutingContext,
  RoutingDecision,
  TaskAnalysis,
  ToolPrimitive,
  WorkflowPrimitive,
  // Hierarchical network types
  HierarchicalNetworkConfig,
  HierarchicalExecutionTrace,
  DelegationRule,
  DelegationCondition,
  // Supervisor types
  SupervisorAgentDefinition,
  SupervisionPolicy,
  SupervisionOptions,
  SupervisedResult,
  ReviewDecision,
  EscalationIssue,
  EscalationResult,
  AgentAction,
  // Evaluation types
  EvaluationCriteria,
  EvaluationScore,
  ImprovementSuggestion,
  OptimizationConfig,
  OptimizationResult,
  OptimizationIteration,
  OptimizationChunk,
  AgentEvaluatorInterface,
  EvaluatorConfig,
} from "../types/agentNetworkTypes.js";

// Core agent classes
export { Agent } from "./agent.js";
export { AgentNetwork } from "./agentNetwork.js";
export { RouterAgent } from "./routerAgent.js";

// Direct tools (existing)
export {
  directAgentTools,
  getAvailableToolNames,
  getToolsForCategory,
} from "./directTools.js";

// Routing prompts and utilities
export {
  buildConfidencePrompt,
  buildMultiStepPlanningPrompt,
  buildRoutingPrompt,
  parseRoutingResponse,
  ROUTING_PROMPTS,
} from "./prompts/routingPrompts.js";

// Coordination module
export {
  AgentCoordinator,
  TaskDistributor,
  type CoordinationContext,
  type CoordinationResult,
  type CoordinationStrategy,
  type CoordinatorConfig,
  type TaskAssignment,
  type AgentCapability,
  type DistributableTask,
  type DistributionResult,
  type DistributionStrategy,
  type TaskDistributorConfig,
  type TaskPriority,
} from "./coordination/index.js";

// Communication module
export {
  MessageBus,
  ProtocolManager,
  HandshakeProtocolHandler,
  DelegationProtocolHandler,
  ConsensusProtocolHandler,
  HeartbeatProtocolHandler,
  type AgentMessage,
  type MessageBusConfig,
  type MessageHandler,
  type MessagePriority,
  type MessageType,
  type SubscriptionOptions,
  type ProtocolHandler,
  type ProtocolPayload,
  type ProtocolSession,
  type ProtocolState,
  type ProtocolType,
  type HandshakeRequest,
  type HandshakeResponse,
  type DelegationRequest,
  type DelegationResponse,
  type DiscoveryRequest,
  type DiscoveryResponse,
  type ConsensusRequest,
  type ConsensusVote,
  type HeartbeatPayload,
} from "./communication/index.js";

// Orchestration module
export {
  NetworkOrchestrator,
  NetworkTopology,
  TopologyBuilder,
  type ExecutionRequest,
  type NetworkInfo,
  type NetworkState,
  type OrchestrationMode,
  type OrchestratorConfig,
  type TopologyConfig,
  type TopologyEdge,
  type TopologyNode,
  type TopologyStats,
  type TopologyType,
} from "./orchestration/index.js";

// Supervisor module
export {
  SupervisorAgent,
  createSupervisedAgent,
  type HITLHandler,
  type SupervisionLevel,
  type SupervisorConfig,
} from "./supervisor/index.js";

// Evaluation module
export {
  AgentEvaluator,
  ResultOptimizer,
  createEvaluator,
  createOptimizer,
} from "./evaluation/index.js";
