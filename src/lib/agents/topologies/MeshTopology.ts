/**
 * Mesh Topology Implementation
 *
 * In a mesh topology, all agents can communicate directly with each other.
 * This enables flexible, decentralized collaboration where agents can
 * delegate tasks to any other agent in the network.
 */

import type { Agent } from "../Agent.js";
import type { AgentNetwork } from "../AgentNetwork.js";
import { MessageBus } from "../communication/MessageBus.js";
import { ProtocolManager } from "../communication/Protocol.js";
import type {
  AgentMessage,
  HandshakePayload,
  AgentType,
} from "../types/agentTypes.js";
import { CoordinationError } from "../errors/agentErrors.js";
import { logger } from "../../utils/logger.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Mesh topology configuration
 */
export interface MeshConfig {
  /** IDs of agents in the mesh */
  agentIds: string[];

  /** Enable automatic discovery */
  autoDiscovery?: boolean;

  /** Maximum hops for message routing */
  maxHops?: number;

  /** Enable peer-to-peer task delegation */
  enableP2PDelegation?: boolean;
}

/**
 * Peer information
 */
interface PeerInfo {
  agentId: string;
  capabilities: string[];
  connected: boolean;
  lastSeen: number;
}

/**
 * Routing table entry
 */
interface RoutingEntry {
  targetId: string;
  nextHop: string;
  hops: number;
  lastUpdated: number;
}

// ============================================================================
// Mesh Topology Class
// ============================================================================

/**
 * MeshTopology manages a fully connected agent network
 *
 * @example
 * ```typescript
 * const topology = new MeshTopology({
 *   agentIds: ['agent-1', 'agent-2', 'agent-3'],
 *   autoDiscovery: true,
 *   enableP2PDelegation: true
 * });
 *
 * await topology.initialize(network);
 *
 * // Send message between any two agents
 * await topology.sendMessage('agent-1', 'agent-3', { task: 'process' });
 *
 * // Discover capabilities
 * const caps = topology.findAgentsByCapability('data-analysis');
 * ```
 */
export class MeshTopology {
  private config: MeshConfig;
  private network?: AgentNetwork;
  private agents: Map<string, Agent> = new Map();
  private peers: Map<string, PeerInfo> = new Map();
  private routingTable: Map<string, RoutingEntry> = new Map();
  private bus: MessageBus;
  private protocols: ProtocolManager;

  constructor(config: MeshConfig) {
    this.config = {
      autoDiscovery: true,
      maxHops: 5,
      enableP2PDelegation: true,
      ...config,
    };

    this.bus = new MessageBus();
    this.protocols = new ProtocolManager(this.bus);
  }

  /**
   * Initialize the topology with a network
   */
  async initialize(network: AgentNetwork): Promise<void> {
    this.network = network;

    // Get all agents
    for (const agentId of this.config.agentIds) {
      const agent = network.getAgent(agentId);
      if (agent) {
        this.agents.set(agentId, agent);

        // Initialize peer info
        this.peers.set(agentId, {
          agentId,
          capabilities: this.extractCapabilities(agent),
          connected: true,
          lastSeen: Date.now(),
        });

        // Subscribe to messages
        this.bus.subscribe(agentId, async (message) => {
          await this.handleMessage(agentId, message);
        });
      } else {
        logger.warn(`[MeshTopology] Agent not found: ${agentId}`);
      }
    }

    // Initialize routing table (direct routes for all agents)
    for (const agentId of this.agents.keys()) {
      for (const targetId of this.agents.keys()) {
        if (agentId !== targetId) {
          this.routingTable.set(`${agentId}:${targetId}`, {
            targetId,
            nextHop: targetId, // Direct connection in mesh
            hops: 1,
            lastUpdated: Date.now(),
          });
        }
      }
    }

    // Perform discovery if enabled
    if (this.config.autoDiscovery) {
      await this.performDiscovery();
    }

    logger.debug("[MeshTopology] Initialized", {
      agents: this.agents.size,
    });
  }

  /**
   * Perform capability discovery among agents
   */
  private async performDiscovery(): Promise<void> {
    const agentIds = Array.from(this.agents.keys());

    // Each agent sends handshake to all others
    for (const fromAgent of agentIds) {
      const agent = this.agents.get(fromAgent)!;
      const myInfo: HandshakePayload = {
        capabilities: this.extractCapabilities(agent),
        agentInfo: {
          id: agent.id,
          name: agent.name,
          type: "agent" as AgentType,
        },
      };

      for (const toAgent of agentIds) {
        if (fromAgent !== toAgent) {
          const response = await this.protocols.handshake.initiateHandshake(
            fromAgent,
            toAgent,
            myInfo,
          );

          if (response) {
            const peer = this.peers.get(toAgent);
            if (peer) {
              peer.capabilities = response.capabilities;
              peer.lastSeen = Date.now();
            }
          }
        }
      }
    }

    logger.debug("[MeshTopology] Discovery completed");
  }

  /**
   * Extract capabilities from an agent
   */
  private extractCapabilities(agent: Agent): string[] {
    const caps: string[] = [];

    // Extract from tools
    if (agent.tools) {
      caps.push(...agent.tools);
    }

    // Extract from description keywords
    const descLower = agent.description.toLowerCase();
    const keywords = [
      "analysis",
      "writing",
      "research",
      "coding",
      "review",
      "data",
      "visualization",
      "search",
      "calculation",
    ];
    for (const kw of keywords) {
      if (descLower.includes(kw)) {
        caps.push(kw);
      }
    }

    return [...new Set(caps)];
  }

  /**
   * Send a message between agents
   */
  async sendMessage(
    from: string,
    to: string,
    payload: unknown,
    priority?: "low" | "normal" | "high" | "critical",
  ): Promise<void> {
    if (!this.agents.has(from)) {
      throw new CoordinationError(`Source agent not found: ${from}`);
    }

    if (!this.agents.has(to)) {
      throw new CoordinationError(`Target agent not found: ${to}`);
    }

    await this.bus.send({
      from,
      to,
      type: "request",
      payload,
      priority,
    });
  }

  /**
   * Send a message and wait for response
   */
  async sendAndWait(
    from: string,
    to: string,
    payload: unknown,
    timeout?: number,
  ): Promise<AgentMessage> {
    return this.bus.sendAndWait(
      {
        from,
        to,
        type: "request",
        payload,
      },
      timeout,
    );
  }

  /**
   * Broadcast to all agents in the mesh
   */
  async broadcast(from: string, payload: unknown): Promise<void> {
    await this.bus.broadcast(from, payload);
  }

  /**
   * Delegate a task to another agent
   */
  async delegateTask(
    from: string,
    to: string,
    task: string,
    context: Record<string, unknown>,
  ): Promise<unknown> {
    if (!this.config.enableP2PDelegation) {
      throw new CoordinationError("P2P delegation is disabled");
    }

    const response = await this.protocols.delegation.delegateTask(
      from,
      to,
      task,
      context,
    );

    if (!response.accepted) {
      throw new CoordinationError(response.error ?? "Delegation rejected", {
        participantIds: [from, to],
      });
    }

    return response.result;
  }

  /**
   * Find agents by capability
   */
  findAgentsByCapability(capability: string): string[] {
    const matching: string[] = [];
    for (const [agentId, peer] of this.peers.entries()) {
      if (
        peer.capabilities.some((cap) =>
          cap.toLowerCase().includes(capability.toLowerCase()),
        )
      ) {
        matching.push(agentId);
      }
    }
    return matching;
  }

  /**
   * Get peer info
   */
  getPeerInfo(agentId: string): PeerInfo | undefined {
    return this.peers.get(agentId);
  }

  /**
   * Get all peers
   */
  getAllPeers(): PeerInfo[] {
    return Array.from(this.peers.values());
  }

  /**
   * Get connected peers
   */
  getConnectedPeers(): PeerInfo[] {
    return Array.from(this.peers.values()).filter((p) => p.connected);
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(
    agentId: string,
    message: AgentMessage,
  ): Promise<void> {
    // Update peer last seen
    const peer = this.peers.get(message.from);
    if (peer) {
      peer.lastSeen = Date.now();
    }

    // Route to protocol manager
    await this.protocols.routeMessage(message);

    // Handle delegation requests
    if (message.type === "delegation") {
      const agent = this.agents.get(agentId);
      if (agent) {
        const payload = message.payload as {
          task: string;
          context: Record<string, unknown>;
        };
        try {
          const result = await agent.execute(payload.task, {
            context: payload.context,
          });
          await this.protocols.delegation.acceptDelegation(
            message,
            result.content,
          );
        } catch (error) {
          await this.protocols.delegation.rejectDelegation(
            message,
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    }
  }

  /**
   * Start a consensus among mesh agents
   */
  async startConsensus(
    initiator: string,
    topic: string,
    options: string[],
    timeout?: number,
  ): Promise<{
    winner: string;
    votes: Record<string, string>;
    unanimous: boolean;
  }> {
    const participants = Array.from(this.agents.keys()).filter(
      (id) => id !== initiator,
    );

    const result = await this.protocols.consensus.startConsensus(
      initiator,
      participants,
      topic,
      options,
      timeout,
    );

    return {
      winner: result.winner,
      votes: result.votes,
      unanimous: result.unanimous,
    };
  }

  /**
   * Get routing information
   */
  getRoute(from: string, to: string): RoutingEntry | undefined {
    return this.routingTable.get(`${from}:${to}`);
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.protocols.cleanup();
    this.bus.clear();
  }
}
