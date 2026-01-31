/**
 * Protocol Implementation
 *
 * Protocol defines structured communication patterns between agents,
 * including handshake, delegation, consensus, and heartbeat protocols.
 */

import { randomUUID } from "crypto";
import { MessageBus } from "./MessageBus.js";
import type {
  AgentMessage,
  ProtocolType,
  HandshakePayload,
  DelegationPayload,
  DelegationResponse,
  ConsensusPayload,
  ConsensusResult,
  HeartbeatPayload,
  AgentState,
} from "../types/agentTypes.js";
import { ProtocolError } from "../errors/agentErrors.js";
import { logger } from "../../utils/logger.js";

// ============================================================================
// Protocol Handler Interface
// ============================================================================

/**
 * Base interface for protocol handlers
 */
interface ProtocolHandler {
  readonly type: ProtocolType;
  handle(message: AgentMessage): Promise<void>;
}

// ============================================================================
// Handshake Protocol Handler
// ============================================================================

/**
 * Handles handshake protocol for agent discovery and capability exchange
 */
export class HandshakeProtocolHandler implements ProtocolHandler {
  readonly type: ProtocolType = "handshake";
  private bus: MessageBus;
  private knownAgents: Map<
    string,
    { info: HandshakePayload; lastSeen: number }
  > = new Map();
  private responseHandlers: Map<string, (payload: HandshakePayload) => void> =
    new Map();

  constructor(bus: MessageBus) {
    this.bus = bus;
  }

  /**
   * Handle incoming handshake messages
   */
  async handle(message: AgentMessage): Promise<void> {
    const payload = message.payload as HandshakePayload;

    if (message.type === "handshake") {
      // Store agent info
      this.knownAgents.set(message.from, {
        info: payload,
        lastSeen: Date.now(),
      });

      logger.debug("[HandshakeProtocol] Agent registered", {
        agentId: payload.agentInfo.id,
        capabilities: payload.capabilities,
      });

      // If this is a response to our handshake, notify the handler
      if (
        message.correlationId &&
        this.responseHandlers.has(message.correlationId)
      ) {
        const handler = this.responseHandlers.get(message.correlationId)!;
        this.responseHandlers.delete(message.correlationId);
        handler(payload);
      }
    }
  }

  /**
   * Initiate handshake with another agent
   */
  async initiateHandshake(
    fromAgent: string,
    toAgent: string,
    myInfo: HandshakePayload,
  ): Promise<HandshakePayload | null> {
    const correlationId = randomUUID();

    return new Promise((resolve) => {
      // Set up response handler with timeout
      const timeoutId = setTimeout(() => {
        this.responseHandlers.delete(correlationId);
        resolve(null);
      }, 5000);

      this.responseHandlers.set(correlationId, (payload) => {
        clearTimeout(timeoutId);
        resolve(payload);
      });

      // Send handshake request
      this.bus
        .send({
          from: fromAgent,
          to: toAgent,
          type: "handshake",
          payload: myInfo,
          correlationId,
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          this.responseHandlers.delete(correlationId);
          logger.error("[HandshakeProtocol] Failed to send handshake", {
            error,
          });
          resolve(null);
        });
    });
  }

  /**
   * Respond to a handshake
   */
  async respondToHandshake(
    originalMessage: AgentMessage,
    myInfo: HandshakePayload,
  ): Promise<void> {
    await this.bus.respond(originalMessage, myInfo);
  }

  /**
   * Get known agents
   */
  getKnownAgents(): Map<string, { info: HandshakePayload; lastSeen: number }> {
    return new Map(this.knownAgents);
  }

  /**
   * Get agents by capability
   */
  getAgentsByCapability(capability: string): string[] {
    const agents: string[] = [];
    for (const [agentId, data] of this.knownAgents.entries()) {
      if (data.info.capabilities.includes(capability)) {
        agents.push(agentId);
      }
    }
    return agents;
  }
}

// ============================================================================
// Delegation Protocol Handler
// ============================================================================

/**
 * Handles delegation protocol for task delegation between agents
 */
export class DelegationProtocolHandler implements ProtocolHandler {
  readonly type: ProtocolType = "delegation";
  private bus: MessageBus;
  private pendingDelegations: Map<
    string,
    {
      resolve: (response: DelegationResponse) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  > = new Map();

  constructor(bus: MessageBus) {
    this.bus = bus;
  }

  /**
   * Handle incoming delegation messages
   */
  async handle(message: AgentMessage): Promise<void> {
    // This is called by ProtocolManager when a delegation response is received
    if (
      message.correlationId &&
      this.pendingDelegations.has(message.correlationId)
    ) {
      const pending = this.pendingDelegations.get(message.correlationId)!;
      clearTimeout(pending.timeout);
      this.pendingDelegations.delete(message.correlationId);
      pending.resolve(message.payload as DelegationResponse);
    }
  }

  /**
   * Delegate a task to another agent
   */
  async delegateTask(
    fromAgent: string,
    toAgent: string,
    task: string,
    context: Record<string, unknown>,
    options?: {
      timeout?: number;
      priority?: "low" | "normal" | "high" | "critical";
      deadline?: number;
    },
  ): Promise<DelegationResponse> {
    const correlationId = randomUUID();
    const timeout = options?.timeout ?? 60000;

    const payload: DelegationPayload = {
      task,
      context,
      deadline: options?.deadline,
      priority: options?.priority,
    };

    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingDelegations.delete(correlationId);
        reject(
          new ProtocolError("Delegation timeout", {
            protocol: "delegation",
            participants: [fromAgent, toAgent],
          }),
        );
      }, timeout);

      this.pendingDelegations.set(correlationId, {
        resolve,
        reject,
        timeout: timeoutHandle,
      });

      this.bus
        .send({
          from: fromAgent,
          to: toAgent,
          type: "delegation",
          payload,
          correlationId,
          priority: options?.priority,
        })
        .catch((error) => {
          clearTimeout(timeoutHandle);
          this.pendingDelegations.delete(correlationId);
          reject(error);
        });
    });
  }

  /**
   * Accept a delegation
   */
  async acceptDelegation(
    originalMessage: AgentMessage,
    result: unknown,
  ): Promise<void> {
    const response: DelegationResponse = {
      accepted: true,
      result,
    };
    await this.bus.respond(originalMessage, response);
  }

  /**
   * Reject a delegation
   */
  async rejectDelegation(
    originalMessage: AgentMessage,
    reason: string,
  ): Promise<void> {
    const response: DelegationResponse = {
      accepted: false,
      error: reason,
    };
    await this.bus.respond(originalMessage, response);
  }
}

// ============================================================================
// Consensus Protocol Handler
// ============================================================================

/**
 * Handles consensus protocol for distributed decision making
 */
export class ConsensusProtocolHandler implements ProtocolHandler {
  readonly type: ProtocolType = "consensus";
  private bus: MessageBus;
  private activeConsensus: Map<
    string,
    {
      topic: string;
      options: string[];
      votes: Map<string, string>;
      participants: Set<string>;
      deadline: number;
      resolve: (result: ConsensusResult) => void;
    }
  > = new Map();

  constructor(bus: MessageBus) {
    this.bus = bus;
  }

  /**
   * Handle incoming consensus messages
   */
  async handle(message: AgentMessage): Promise<void> {
    const payload = message.payload as ConsensusPayload & { vote?: string };

    // Handle vote submission
    if (payload.vote && message.correlationId) {
      const consensus = this.activeConsensus.get(message.correlationId);
      if (consensus && consensus.participants.has(message.from)) {
        consensus.votes.set(message.from, payload.vote);

        // Check if all votes are in
        if (consensus.votes.size === consensus.participants.size) {
          this.resolveConsensus(message.correlationId);
        }
      }
    }
  }

  /**
   * Start a consensus process
   */
  async startConsensus(
    initiator: string,
    participants: string[],
    topic: string,
    options: string[],
    timeout: number = 30000,
  ): Promise<ConsensusResult> {
    const consensusId = randomUUID();

    return new Promise((resolve, reject) => {
      const deadline = Date.now() + timeout;

      this.activeConsensus.set(consensusId, {
        topic,
        options,
        votes: new Map(),
        participants: new Set(participants),
        deadline,
        resolve,
      });

      // Set timeout
      setTimeout(() => {
        if (this.activeConsensus.has(consensusId)) {
          this.resolveConsensus(consensusId);
        }
      }, timeout);

      // Request votes from all participants
      const payload: ConsensusPayload = {
        topic,
        options,
        deadline,
      };

      const sendPromises = participants.map((participant) =>
        this.bus.send({
          from: initiator,
          to: participant,
          type: "consensus",
          payload,
          correlationId: consensusId,
        }),
      );

      Promise.all(sendPromises).catch((_error) => {
        this.activeConsensus.delete(consensusId);
        reject(
          new ProtocolError("Failed to start consensus", {
            protocol: "consensus",
            participants,
          }),
        );
      });
    });
  }

  /**
   * Submit a vote for a consensus
   */
  async submitVote(
    agentId: string,
    consensusId: string,
    initiator: string,
    vote: string,
  ): Promise<void> {
    await this.bus.send({
      from: agentId,
      to: initiator,
      type: "consensus",
      payload: { vote } as ConsensusPayload & { vote: string },
      correlationId: consensusId,
    });
  }

  /**
   * Resolve a consensus
   */
  private resolveConsensus(consensusId: string): void {
    const consensus = this.activeConsensus.get(consensusId);
    if (!consensus) {
      return;
    }

    this.activeConsensus.delete(consensusId);

    // Count votes
    const voteCounts = new Map<string, number>();
    for (const vote of consensus.votes.values()) {
      voteCounts.set(vote, (voteCounts.get(vote) ?? 0) + 1);
    }

    // Find winner
    let winner = "";
    let maxVotes = 0;
    for (const [option, count] of voteCounts.entries()) {
      if (count > maxVotes) {
        maxVotes = count;
        winner = option;
      }
    }

    // Convert votes map to record
    const votesRecord: Record<string, string> = {};
    for (const [agentId, vote] of consensus.votes.entries()) {
      votesRecord[agentId] = vote;
    }

    const result: ConsensusResult = {
      topic: consensus.topic,
      winner,
      votes: votesRecord,
      unanimous: new Set(consensus.votes.values()).size === 1,
    };

    consensus.resolve(result);

    logger.debug("[ConsensusProtocol] Consensus resolved", {
      topic: consensus.topic,
      winner,
      unanimous: result.unanimous,
    });
  }
}

// ============================================================================
// Heartbeat Protocol Handler
// ============================================================================

/**
 * Handles heartbeat protocol for agent health monitoring
 */
export class HeartbeatProtocolHandler implements ProtocolHandler {
  readonly type: ProtocolType = "heartbeat";
  private bus: MessageBus;
  private agentHealth: Map<
    string,
    {
      payload: HeartbeatPayload;
      lastHeartbeat: number;
    }
  > = new Map();
  private heartbeatInterval: number = 5000;
  private healthThreshold: number = 15000;
  private intervalHandle?: NodeJS.Timeout;

  constructor(
    bus: MessageBus,
    options?: { interval?: number; threshold?: number },
  ) {
    this.bus = bus;
    if (options?.interval) {
      this.heartbeatInterval = options.interval;
    }
    if (options?.threshold) {
      this.healthThreshold = options.threshold;
    }
  }

  /**
   * Handle incoming heartbeat messages
   */
  async handle(message: AgentMessage): Promise<void> {
    const payload = message.payload as HeartbeatPayload;

    this.agentHealth.set(message.from, {
      payload,
      lastHeartbeat: Date.now(),
    });

    logger.debug("[HeartbeatProtocol] Heartbeat received", {
      agentId: payload.agentId,
      status: payload.status,
    });
  }

  /**
   * Start sending heartbeats for an agent
   */
  startHeartbeat(
    agentId: string,
    getStatus: () => {
      status: AgentState;
      executionCount: number;
      lastExecutionTime?: number;
    },
  ): void {
    const sendHeartbeat = async () => {
      const statusInfo = getStatus();
      const payload: HeartbeatPayload = {
        agentId,
        status: statusInfo.status,
        timestamp: Date.now(),
        metrics: {
          executionCount: statusInfo.executionCount,
          lastExecutionTime: statusInfo.lastExecutionTime,
        },
      };

      await this.bus.broadcast(agentId, payload, "heartbeat");
    };

    // Send initial heartbeat
    sendHeartbeat().catch((err) =>
      logger.warn("[HeartbeatProtocol] Failed to send initial heartbeat", {
        err,
      }),
    );

    // Schedule periodic heartbeats
    this.intervalHandle = setInterval(() => {
      sendHeartbeat().catch((err) =>
        logger.warn("[HeartbeatProtocol] Failed to send heartbeat", { err }),
      );
    }, this.heartbeatInterval);
  }

  /**
   * Stop sending heartbeats
   */
  stopHeartbeat(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = undefined;
    }
  }

  /**
   * Check if an agent is healthy
   */
  isAgentHealthy(agentId: string): boolean {
    const health = this.agentHealth.get(agentId);
    if (!health) {
      return false;
    }

    const timeSinceLastHeartbeat = Date.now() - health.lastHeartbeat;
    return timeSinceLastHeartbeat < this.healthThreshold;
  }

  /**
   * Get agent status
   */
  getAgentStatus(agentId: string): HeartbeatPayload | undefined {
    return this.agentHealth.get(agentId)?.payload;
  }

  /**
   * Get all healthy agents
   */
  getHealthyAgents(): string[] {
    const healthy: string[] = [];
    const now = Date.now();

    for (const [agentId, data] of this.agentHealth.entries()) {
      if (now - data.lastHeartbeat < this.healthThreshold) {
        healthy.push(agentId);
      }
    }

    return healthy;
  }

  /**
   * Get all unhealthy agents
   */
  getUnhealthyAgents(): string[] {
    const unhealthy: string[] = [];
    const now = Date.now();

    for (const [agentId, data] of this.agentHealth.entries()) {
      if (now - data.lastHeartbeat >= this.healthThreshold) {
        unhealthy.push(agentId);
      }
    }

    return unhealthy;
  }
}

// ============================================================================
// Protocol Manager
// ============================================================================

/**
 * ProtocolManager coordinates all protocol handlers
 */
export class ProtocolManager {
  private bus: MessageBus;
  private handlers: Map<ProtocolType, ProtocolHandler> = new Map();
  readonly handshake: HandshakeProtocolHandler;
  readonly delegation: DelegationProtocolHandler;
  readonly consensus: ConsensusProtocolHandler;
  readonly heartbeat: HeartbeatProtocolHandler;

  constructor(bus: MessageBus) {
    this.bus = bus;

    // Initialize protocol handlers
    this.handshake = new HandshakeProtocolHandler(bus);
    this.delegation = new DelegationProtocolHandler(bus);
    this.consensus = new ConsensusProtocolHandler(bus);
    this.heartbeat = new HeartbeatProtocolHandler(bus);

    this.handlers.set("handshake", this.handshake);
    this.handlers.set("delegation", this.delegation);
    this.handlers.set("consensus", this.consensus);
    this.handlers.set("heartbeat", this.heartbeat);

    logger.debug("[ProtocolManager] Initialized with all protocol handlers");
  }

  /**
   * Get a protocol handler by type
   */
  getHandler(type: ProtocolType): ProtocolHandler | undefined {
    return this.handlers.get(type);
  }

  /**
   * Route a message to the appropriate protocol handler
   */
  async routeMessage(message: AgentMessage): Promise<void> {
    const protocolType = this.getProtocolType(message.type);
    if (protocolType) {
      const handler = this.handlers.get(protocolType);
      if (handler) {
        await handler.handle(message);
      }
    }
  }

  /**
   * Map message type to protocol type
   */
  private getProtocolType(messageType: string): ProtocolType | undefined {
    const mapping: Record<string, ProtocolType> = {
      handshake: "handshake",
      delegation: "delegation",
      consensus: "consensus",
      heartbeat: "heartbeat",
    };
    return mapping[messageType];
  }

  /**
   * Clean up all protocol handlers
   */
  cleanup(): void {
    this.heartbeat.stopHeartbeat();
  }
}

// ============================================================================
// Exports
// ============================================================================

export type { ProtocolHandler };
