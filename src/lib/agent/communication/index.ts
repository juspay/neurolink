/**
 * Agent Communication Module
 *
 * Provides communication infrastructure for multi-agent networks.
 */

export {
  MessageBus,
  type AgentMessage,
  type MessageBusConfig,
  type MessageHandler,
  type MessagePriority,
  type MessageType,
  type SubscriptionOptions,
} from "./message-bus.js";

export {
  ConsensusProtocolHandler,
  DelegationProtocolHandler,
  HandshakeProtocolHandler,
  HeartbeatProtocolHandler,
  ProtocolManager,
  type AggregationRequest,
  type ConsensusRequest,
  type ConsensusVote,
  type DelegationRequest,
  type DelegationResponse,
  type DiscoveryRequest,
  type DiscoveryResponse,
  type HandshakeRequest,
  type HandshakeResponse,
  type HeartbeatPayload,
  type ProtocolHandler,
  type ProtocolPayload,
  type ProtocolSession,
  type ProtocolState,
  type ProtocolType,
} from "./protocols.js";
