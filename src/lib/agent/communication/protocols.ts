/**
 * Communication Protocols - Standard protocols for agent communication
 *
 * Defines standard communication patterns and protocols for:
 * - Handshake and discovery
 * - Task delegation
 * - Result aggregation
 * - Consensus building
 * - Error handling and recovery
 */

import { randomUUID } from "crypto";
import type { MessageBus } from "./message-bus.js";
import type { Agent } from "../agent.js";
import { logger } from "../../utils/logger.js";
import type {
  AgentMessage,
  ProtocolType,
  ProtocolPayload,
  HandshakeRequest,
  HandshakeResponse,
  DiscoveryRequest,
  DiscoveryResponse,
  DelegationRequest,
  DelegationResponse,
  ConsensusRequest,
  ConsensusVote,
  HeartbeatPayload,
  ProtocolHandler,
  ProtocolSession,
} from "../../types/index.js";

/**
 * Protocol Manager - Manages protocol handlers and sessions
 */
export class ProtocolManager {
  private messageBus: MessageBus;
  private handlers: Map<ProtocolType, ProtocolHandler> = new Map();
  private sessions: Map<string, ProtocolSession> = new Map();
  private agentId: string;

  constructor(messageBus: MessageBus, agentId: string) {
    this.messageBus = messageBus;
    this.agentId = agentId;

    // Subscribe to protocol topic
    this.messageBus.subscribe(
      "protocol",
      agentId,
      this.handleProtocolMessage.bind(this),
    );

    // Subscribe to direct messages for this agent
    this.messageBus.subscribe(
      `direct:${agentId}`,
      agentId,
      this.handleProtocolMessage.bind(this),
    );

    logger.debug(`[ProtocolManager] Initialized for agent ${agentId}`);
  }

  /**
   * Register a protocol handler
   */
  registerHandler(handler: ProtocolHandler): void {
    this.handlers.set(handler.getProtocol(), handler);
  }

  /**
   * Handle incoming protocol message
   */
  private async handleProtocolMessage(message: AgentMessage): Promise<void> {
    const payload = message.payload as ProtocolPayload;
    if (!payload?.protocol) {
      return;
    }

    const handler = this.handlers.get(payload.protocol);
    if (handler) {
      await handler.handle(message);
    }

    // Update session if exists
    const session = this.sessions.get(payload.sessionId);
    if (session) {
      session.lastActivity = Date.now();
      session.state = payload.state;
    }
  }

  /**
   * Initiate a handshake with another agent
   */
  async handshake(
    targetAgentId: string,
    capabilities: string[],
    timeout?: number,
  ): Promise<HandshakeResponse> {
    const sessionId = randomUUID();
    const request: HandshakeRequest = {
      protocol: "handshake",
      sessionId,
      state: "initiated",
      data: {
        agentId: this.agentId,
        agentName: this.agentId,
        capabilities,
        version: "1.0.0",
      },
    };

    const response = await this.messageBus.request(
      `direct:${targetAgentId}`,
      this.agentId,
      request,
      timeout,
    );

    return response.payload as HandshakeResponse;
  }

  /**
   * Discover available agents
   */
  async discover(
    options?: {
      requiredCapabilities?: string[];
      excludeAgents?: string[];
      maxAgents?: number;
    },
    timeout?: number,
  ): Promise<DiscoveryResponse> {
    const sessionId = randomUUID();
    const request: DiscoveryRequest = {
      protocol: "discovery",
      sessionId,
      state: "initiated",
      data: {
        requiredCapabilities: options?.requiredCapabilities,
        excludeAgents: options?.excludeAgents,
        maxAgents: options?.maxAgents,
      },
    };

    const response = await this.messageBus.request(
      "protocol:discovery",
      this.agentId,
      request,
      timeout,
    );

    return response.payload as DiscoveryResponse;
  }

  /**
   * Delegate a task to another agent
   */
  async delegate(
    targetAgentId: string,
    task: string,
    options?: {
      context?: Record<string, unknown>;
      priority?: "high" | "normal" | "low";
      timeout?: number;
    },
  ): Promise<DelegationResponse> {
    const sessionId = randomUUID();
    const request: DelegationRequest = {
      protocol: "delegation",
      sessionId,
      state: "initiated",
      data: {
        task,
        context: options?.context,
        priority: options?.priority ?? "normal",
        timeout: options?.timeout,
      },
    };

    const session: ProtocolSession = {
      id: sessionId,
      protocol: "delegation",
      state: "initiated",
      startTime: Date.now(),
      lastActivity: Date.now(),
      participants: [this.agentId, targetAgentId],
    };
    this.sessions.set(sessionId, session);

    try {
      const response = await this.messageBus.request(
        `direct:${targetAgentId}`,
        this.agentId,
        request,
        options?.timeout,
      );

      session.state = "completed";
      return response.payload as DelegationResponse;
    } catch (error) {
      session.state = "failed";
      throw error;
    }
  }

  /**
   * Request consensus from multiple agents
   */
  async requestConsensus(
    participants: string[],
    proposal: unknown,
    options?: {
      requiredVotes?: number;
      timeout?: number;
    },
  ): Promise<{ approved: boolean; votes: ConsensusVote[] }> {
    const sessionId = randomUUID();
    const requiredVotes =
      options?.requiredVotes ?? Math.ceil(participants.length / 2);
    const timeout = options?.timeout ?? 30000;

    const session: ProtocolSession = {
      id: sessionId,
      protocol: "consensus",
      state: "initiated",
      startTime: Date.now(),
      lastActivity: Date.now(),
      participants: [this.agentId, ...participants],
      data: {
        votes: [] as ConsensusVote[],
        requiredVotes,
      },
    };
    this.sessions.set(sessionId, session);

    const request: ConsensusRequest = {
      protocol: "consensus",
      sessionId,
      state: "initiated",
      data: {
        proposal,
        participants,
        requiredVotes,
        timeout,
      },
    };

    // Collect votes
    const votes: ConsensusVote[] = [];
    const votePromises = participants.map(async (participantId) => {
      try {
        const response = await this.messageBus.request(
          `direct:${participantId}`,
          this.agentId,
          request,
          timeout,
        );
        const vote = response.payload as ConsensusVote;
        votes.push(vote);
        return vote;
      } catch {
        // Agent didn't respond in time
        return null;
      }
    });

    await Promise.all(votePromises);

    // Count approvals
    const approvals = votes.filter((v) => v?.data?.vote === "approve").length;
    const approved = approvals >= requiredVotes;

    session.state = approved ? "completed" : "failed";
    session.data = { votes, approved };

    return { approved, votes };
  }

  /**
   * Send a heartbeat
   */
  async sendHeartbeat(
    status: "healthy" | "degraded" | "unhealthy",
    load: number,
    uptime: number,
  ): Promise<void> {
    const payload: HeartbeatPayload = {
      protocol: "heartbeat",
      sessionId: randomUUID(),
      state: "active",
      data: {
        agentId: this.agentId,
        status,
        load,
        uptime,
        lastActivity: Date.now(),
      },
    };

    await this.messageBus.publish("protocol:heartbeat", this.agentId, payload);
  }

  /**
   * Get active sessions
   */
  getSessions(): ProtocolSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): ProtocolSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Clean up expired sessions
   */
  cleanupSessions(maxAge: number = 300000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, session] of this.sessions) {
      if (now - session.lastActivity > maxAge) {
        this.sessions.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }
}

/**
 * Handshake Protocol Handler
 */
export class HandshakeProtocolHandler implements ProtocolHandler {
  private agent: Agent;
  private messageBus: MessageBus;
  private acceptedAgents: Set<string> = new Set();

  constructor(agent: Agent, messageBus: MessageBus) {
    this.agent = agent;
    this.messageBus = messageBus;
  }

  getProtocol(): ProtocolType {
    return "handshake";
  }

  async handle(message: AgentMessage): Promise<void> {
    const request = message.payload as HandshakeRequest;
    if (request.state !== "initiated") {
      return;
    }

    // Accept the handshake
    this.acceptedAgents.add(request.data.agentId);

    const response: HandshakeResponse = {
      protocol: "handshake",
      sessionId: request.sessionId,
      state: "completed",
      data: {
        accepted: true,
        agentId: this.agent.id,
        agentName: this.agent.name,
        capabilities: this.agent.tools ?? [],
      },
    };

    await this.messageBus.reply(message, this.agent.id, response);
  }

  getAcceptedAgents(): string[] {
    return Array.from(this.acceptedAgents);
  }
}

/**
 * Delegation Protocol Handler
 */
export class DelegationProtocolHandler implements ProtocolHandler {
  private agent: Agent;
  private messageBus: MessageBus;

  constructor(agent: Agent, messageBus: MessageBus) {
    this.agent = agent;
    this.messageBus = messageBus;
  }

  getProtocol(): ProtocolType {
    return "delegation";
  }

  async handle(message: AgentMessage): Promise<void> {
    const request = message.payload as DelegationRequest;
    if (request.state !== "initiated") {
      return;
    }

    let response: DelegationResponse;

    try {
      // Execute the delegated task
      const result = await this.agent.execute(request.data.task, {
        context: request.data.context,
        timeout: request.data.timeout,
      });

      response = {
        protocol: "delegation",
        sessionId: request.sessionId,
        state: "completed",
        data: {
          accepted: true,
          result,
        },
      };
    } catch (error) {
      response = {
        protocol: "delegation",
        sessionId: request.sessionId,
        state: "failed",
        data: {
          accepted: false,
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }

    await this.messageBus.reply(message, this.agent.id, response);
  }
}

/**
 * Consensus Protocol Handler
 */
export class ConsensusProtocolHandler implements ProtocolHandler {
  private agent: Agent;
  private messageBus: MessageBus;
  private voteDecider?: (proposal: unknown) => "approve" | "reject" | "abstain";

  constructor(
    agent: Agent,
    messageBus: MessageBus,
    voteDecider?: (proposal: unknown) => "approve" | "reject" | "abstain",
  ) {
    this.agent = agent;
    this.messageBus = messageBus;
    this.voteDecider = voteDecider;
  }

  getProtocol(): ProtocolType {
    return "consensus";
  }

  async handle(message: AgentMessage): Promise<void> {
    const request = message.payload as ConsensusRequest;
    if (request.state !== "initiated") {
      return;
    }

    // Determine vote
    let vote: "approve" | "reject" | "abstain";
    if (this.voteDecider) {
      vote = this.voteDecider(request.data.proposal);
    } else {
      // Default: approve
      vote = "approve";
    }

    const response: ConsensusVote = {
      protocol: "consensus",
      sessionId: request.sessionId,
      state: "active",
      data: {
        vote,
        voterId: this.agent.id,
      },
    };

    await this.messageBus.reply(message, this.agent.id, response);
  }

  setVoteDecider(
    decider: (proposal: unknown) => "approve" | "reject" | "abstain",
  ): void {
    this.voteDecider = decider;
  }
}

/**
 * Heartbeat Protocol Handler
 */
export class HeartbeatProtocolHandler implements ProtocolHandler {
  private knownAgents: Map<string, HeartbeatPayload["data"]> = new Map();
  private onAgentStatusChange?: (
    agentId: string,
    status: "healthy" | "degraded" | "unhealthy" | "offline",
  ) => void;

  constructor(
    onAgentStatusChange?: (
      agentId: string,
      status: "healthy" | "degraded" | "unhealthy" | "offline",
    ) => void,
  ) {
    this.onAgentStatusChange = onAgentStatusChange;

    // Start cleanup interval
    setInterval(() => this.checkForOfflineAgents(), 30000);
  }

  getProtocol(): ProtocolType {
    return "heartbeat";
  }

  async handle(message: AgentMessage): Promise<void> {
    const heartbeat = message.payload as HeartbeatPayload;
    const previousStatus = this.knownAgents.get(heartbeat.data.agentId)?.status;

    this.knownAgents.set(heartbeat.data.agentId, heartbeat.data);

    // Notify on status change
    if (previousStatus !== heartbeat.data.status && this.onAgentStatusChange) {
      this.onAgentStatusChange(heartbeat.data.agentId, heartbeat.data.status);
    }
  }

  private checkForOfflineAgents(): void {
    const now = Date.now();
    const offlineThreshold = 60000; // 1 minute

    for (const [agentId, data] of this.knownAgents) {
      if (now - data.lastActivity > offlineThreshold) {
        if (this.onAgentStatusChange) {
          this.onAgentStatusChange(agentId, "offline");
        }
        this.knownAgents.delete(agentId);
      }
    }
  }

  getKnownAgents(): Map<string, HeartbeatPayload["data"]> {
    return new Map(this.knownAgents);
  }

  getAgentStatus(agentId: string): HeartbeatPayload["data"] | undefined {
    return this.knownAgents.get(agentId);
  }
}
