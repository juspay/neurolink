/**
 * Hub-Spoke Topology Implementation
 *
 * In a hub-spoke topology, a central "hub" agent coordinates all communication
 * and task delegation to "spoke" agents. This is ideal for centralized control
 * and clear hierarchical task distribution.
 */

import type { Agent } from "../Agent.js";
import type { AgentNetwork } from "../AgentNetwork.js";
import { MessageBus } from "../communication/MessageBus.js";
import { ProtocolManager } from "../communication/Protocol.js";
import type { AgentMessage, DelegationPayload } from "../types/agentTypes.js";
import { CoordinationError } from "../errors/agentErrors.js";
import { logger } from "../../utils/logger.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Hub-spoke topology configuration
 */
export interface HubSpokeConfig {
  /** ID of the hub agent */
  hubAgentId: string;

  /** IDs of spoke agents */
  spokeAgentIds: string[];

  /** Enable automatic load balancing */
  loadBalancing?: boolean;

  /** Maximum concurrent tasks per spoke */
  maxConcurrentTasksPerSpoke?: number;
}

/**
 * Spoke status
 */
interface SpokeStatus {
  agentId: string;
  currentTasks: number;
  available: boolean;
  lastActivity: number;
}

// ============================================================================
// Hub-Spoke Topology Class
// ============================================================================

/**
 * HubSpokeTopology manages a centralized agent coordination pattern
 *
 * @example
 * ```typescript
 * const topology = new HubSpokeTopology({
 *   hubAgentId: 'coordinator',
 *   spokeAgentIds: ['worker-1', 'worker-2', 'worker-3'],
 *   loadBalancing: true,
 *   maxConcurrentTasksPerSpoke: 3
 * });
 *
 * await topology.initialize(network);
 *
 * // Delegate task through hub
 * const result = await topology.delegateTask(
 *   'worker-1',
 *   'Process this data',
 *   { data: [...] }
 * );
 * ```
 */
export class HubSpokeTopology {
  private config: HubSpokeConfig;
  private network?: AgentNetwork;
  private hubAgent?: Agent;
  private spokeAgents: Map<string, Agent> = new Map();
  private spokeStatus: Map<string, SpokeStatus> = new Map();
  private bus: MessageBus;
  private protocols: ProtocolManager;
  private taskQueue: Array<{
    task: string;
    context: Record<string, unknown>;
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
  }> = [];
  private processing: boolean = false;

  constructor(config: HubSpokeConfig) {
    this.config = {
      loadBalancing: true,
      maxConcurrentTasksPerSpoke: 5,
      ...config,
    };

    this.bus = new MessageBus();
    this.protocols = new ProtocolManager(this.bus);

    // Initialize spoke status
    for (const spokeId of config.spokeAgentIds) {
      this.spokeStatus.set(spokeId, {
        agentId: spokeId,
        currentTasks: 0,
        available: true,
        lastActivity: Date.now(),
      });
    }
  }

  /**
   * Initialize the topology with a network
   */
  async initialize(network: AgentNetwork): Promise<void> {
    this.network = network;

    // Get hub agent
    this.hubAgent = network.getAgent(this.config.hubAgentId);
    if (!this.hubAgent) {
      throw new CoordinationError(
        `Hub agent not found: ${this.config.hubAgentId}`,
        { participantIds: [this.config.hubAgentId] },
      );
    }

    // Get spoke agents
    for (const spokeId of this.config.spokeAgentIds) {
      const agent = network.getAgent(spokeId);
      if (agent) {
        this.spokeAgents.set(spokeId, agent);
      } else {
        logger.warn(`[HubSpokeTopology] Spoke agent not found: ${spokeId}`);
      }
    }

    // Subscribe hub to receive messages from spokes
    this.bus.subscribe(this.config.hubAgentId, async (message) => {
      await this.handleHubMessage(message);
    });

    // Subscribe each spoke
    for (const spokeId of this.spokeAgents.keys()) {
      this.bus.subscribe(spokeId, async (message) => {
        await this.handleSpokeMessage(spokeId, message);
      });
    }

    logger.debug("[HubSpokeTopology] Initialized", {
      hub: this.config.hubAgentId,
      spokes: this.config.spokeAgentIds.length,
    });
  }

  /**
   * Delegate a task to a spoke agent
   */
  async delegateTask(
    targetSpokeId: string | undefined,
    task: string,
    context: Record<string, unknown>,
  ): Promise<unknown> {
    if (!this.network || !this.hubAgent) {
      throw new CoordinationError("Topology not initialized");
    }

    // Determine target spoke
    const spokeId = targetSpokeId ?? this.selectSpoke();
    if (!spokeId) {
      throw new CoordinationError("No available spoke agents");
    }

    const spokeAgent = this.spokeAgents.get(spokeId);
    if (!spokeAgent) {
      throw new CoordinationError(`Spoke agent not found: ${spokeId}`);
    }

    // Update spoke status
    const status = this.spokeStatus.get(spokeId)!;
    status.currentTasks++;
    status.lastActivity = Date.now();

    try {
      // Execute task on spoke agent
      const result = await spokeAgent.execute(task, { context });

      status.currentTasks--;

      if (result.status === "error") {
        throw new Error(result.error ?? "Spoke execution failed");
      }

      return result.content;
    } catch (error) {
      status.currentTasks--;
      throw error;
    }
  }

  /**
   * Broadcast a task to all spokes
   */
  async broadcastTask(
    task: string,
    context: Record<string, unknown>,
  ): Promise<Map<string, unknown>> {
    const results = new Map<string, unknown>();

    const promises = Array.from(this.spokeAgents.entries()).map(
      async ([spokeId, agent]) => {
        try {
          const result = await agent.execute(task, { context });
          results.set(spokeId, result.content);
        } catch (error) {
          results.set(
            spokeId,
            error instanceof Error ? error.message : String(error),
          );
        }
      },
    );

    await Promise.all(promises);
    return results;
  }

  /**
   * Select the best spoke for a task based on load balancing
   */
  private selectSpoke(): string | undefined {
    if (!this.config.loadBalancing) {
      // Return first available spoke
      for (const [spokeId, status] of this.spokeStatus.entries()) {
        if (
          status.available &&
          status.currentTasks < this.config.maxConcurrentTasksPerSpoke!
        ) {
          return spokeId;
        }
      }
      return undefined;
    }

    // Load balancing: select spoke with fewest tasks
    let bestSpoke: string | undefined;
    let minTasks = Infinity;

    for (const [spokeId, status] of this.spokeStatus.entries()) {
      if (
        status.available &&
        status.currentTasks < this.config.maxConcurrentTasksPerSpoke! &&
        status.currentTasks < minTasks
      ) {
        minTasks = status.currentTasks;
        bestSpoke = spokeId;
      }
    }

    return bestSpoke;
  }

  /**
   * Handle message received by hub
   */
  private async handleHubMessage(message: AgentMessage): Promise<void> {
    // Process responses from spokes
    await this.protocols.routeMessage(message);
  }

  /**
   * Handle message received by a spoke
   */
  private async handleSpokeMessage(
    spokeId: string,
    message: AgentMessage,
  ): Promise<void> {
    if (message.type === "delegation") {
      const payload = message.payload as DelegationPayload;
      const spokeAgent = this.spokeAgents.get(spokeId);

      if (spokeAgent) {
        try {
          const result = await spokeAgent.execute(payload.task, {
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
   * Get spoke status
   */
  getSpokeStatus(spokeId: string): SpokeStatus | undefined {
    return this.spokeStatus.get(spokeId);
  }

  /**
   * Get all spoke statuses
   */
  getAllSpokeStatuses(): SpokeStatus[] {
    return Array.from(this.spokeStatus.values());
  }

  /**
   * Set spoke availability
   */
  setSpokeAvailable(spokeId: string, available: boolean): void {
    const status = this.spokeStatus.get(spokeId);
    if (status) {
      status.available = available;
    }
  }

  /**
   * Get hub agent
   */
  getHubAgent(): Agent | undefined {
    return this.hubAgent;
  }

  /**
   * Get spoke agents
   */
  getSpokeAgents(): Map<string, Agent> {
    return new Map(this.spokeAgents);
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.protocols.cleanup();
    this.bus.clear();
    this.taskQueue = [];
  }
}
