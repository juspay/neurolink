/**
 * Hierarchical Topology Implementation
 *
 * In a hierarchical topology, agents are organized in a tree structure
 * with clear parent-child relationships. This is ideal for complex
 * organizational structures with delegation chains.
 */

import type { Agent } from "../Agent.js";
import type { AgentNetwork } from "../AgentNetwork.js";
import { MessageBus } from "../communication/MessageBus.js";
import { ProtocolManager } from "../communication/Protocol.js";
import type { AgentMessage, HierarchyLevel } from "../types/agentTypes.js";
import { CoordinationError } from "../errors/agentErrors.js";
import { logger } from "../../utils/logger.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Hierarchical topology configuration
 */
export interface HierarchicalConfig {
  /** Root agent ID */
  rootAgentId: string;

  /** Hierarchy levels */
  levels: HierarchyLevel[];

  /** Allow cross-level communication */
  allowCrossLevel?: boolean;

  /** Enable automatic escalation */
  autoEscalation?: boolean;

  /** Escalation threshold (confidence) */
  escalationThreshold?: number;
}

/**
 * Node in the hierarchy
 */
interface HierarchyNode {
  agentId: string;
  agent?: Agent;
  level: string;
  parent?: string;
  children: string[];
  depth: number;
}

// ============================================================================
// Hierarchical Topology Class
// ============================================================================

/**
 * HierarchicalTopology manages a tree-structured agent network
 *
 * @example
 * ```typescript
 * const topology = new HierarchicalTopology({
 *   rootAgentId: 'director',
 *   levels: [
 *     { name: 'executive', agentIds: ['director'], parent: undefined },
 *     { name: 'manager', agentIds: ['mgr-1', 'mgr-2'], parent: 'executive' },
 *     { name: 'worker', agentIds: ['worker-1', 'worker-2', 'worker-3'], parent: 'manager' }
 *   ],
 *   autoEscalation: true,
 *   escalationThreshold: 0.5
 * });
 *
 * await topology.initialize(network);
 *
 * // Delegate down the hierarchy
 * await topology.delegateDown('director', 'Process this task');
 *
 * // Escalate up the hierarchy
 * await topology.escalateUp('worker-1', 'Need approval for this');
 * ```
 */
export class HierarchicalTopology {
  private config: HierarchicalConfig;
  private network?: AgentNetwork;
  private nodes: Map<string, HierarchyNode> = new Map();
  private levelToAgents: Map<string, string[]> = new Map();
  private bus: MessageBus;
  private protocols: ProtocolManager;

  constructor(config: HierarchicalConfig) {
    this.config = {
      allowCrossLevel: false,
      autoEscalation: true,
      escalationThreshold: 0.5,
      ...config,
    };

    this.bus = new MessageBus();
    this.protocols = new ProtocolManager(this.bus);

    // Build hierarchy from configuration
    this.buildHierarchy(config.levels);
  }

  /**
   * Build the hierarchy structure from levels
   */
  private buildHierarchy(levels: HierarchyLevel[]): void {
    // First pass: create nodes
    let depth = 0;
    for (const level of levels) {
      this.levelToAgents.set(level.name, level.agentIds);

      for (const agentId of level.agentIds) {
        this.nodes.set(agentId, {
          agentId,
          level: level.name,
          parent: undefined, // Will be set in second pass
          children: [],
          depth,
        });
      }
      depth++;
    }

    // Second pass: establish parent-child relationships
    for (const level of levels) {
      if (level.parent) {
        const parentAgents = this.levelToAgents.get(level.parent);
        if (parentAgents && parentAgents.length > 0) {
          // Distribute children among parents
          const childrenPerParent = Math.ceil(
            level.agentIds.length / parentAgents.length,
          );

          for (let i = 0; i < level.agentIds.length; i++) {
            const childId = level.agentIds[i];
            const parentIndex = Math.floor(i / childrenPerParent);
            const parentId =
              parentAgents[Math.min(parentIndex, parentAgents.length - 1)];

            const childNode = this.nodes.get(childId)!;
            const parentNode = this.nodes.get(parentId)!;

            childNode.parent = parentId;
            parentNode.children.push(childId);
          }
        }
      }
    }
  }

  /**
   * Initialize the topology with a network
   */
  async initialize(network: AgentNetwork): Promise<void> {
    this.network = network;

    // Get agents for all nodes
    for (const [agentId, node] of this.nodes.entries()) {
      const agent = network.getAgent(agentId);
      if (agent) {
        node.agent = agent;

        // Subscribe to messages
        this.bus.subscribe(agentId, async (message) => {
          await this.handleMessage(agentId, message);
        });
      } else {
        logger.warn(`[HierarchicalTopology] Agent not found: ${agentId}`);
      }
    }

    logger.debug("[HierarchicalTopology] Initialized", {
      levels: this.config.levels.length,
      totalAgents: this.nodes.size,
    });
  }

  /**
   * Delegate a task down the hierarchy
   */
  async delegateDown(
    fromAgentId: string,
    task: string,
    context?: Record<string, unknown>,
    targetChildId?: string,
  ): Promise<unknown> {
    const fromNode = this.nodes.get(fromAgentId);
    if (!fromNode) {
      throw new CoordinationError(`Agent not in hierarchy: ${fromAgentId}`);
    }

    if (fromNode.children.length === 0) {
      throw new CoordinationError(`Agent has no children: ${fromAgentId}`);
    }

    // Select target child
    const childId = targetChildId ?? this.selectChild(fromNode);
    if (!childId) {
      throw new CoordinationError("No available child agents");
    }

    const childNode = this.nodes.get(childId)!;
    if (!childNode.agent) {
      throw new CoordinationError(`Child agent not available: ${childId}`);
    }

    logger.debug("[HierarchicalTopology] Delegating down", {
      from: fromAgentId,
      to: childId,
    });

    const result = await childNode.agent.execute(task, {
      context: context ?? {},
    });

    if (result.status === "error") {
      throw new Error(result.error ?? "Delegation failed");
    }

    return result.content;
  }

  /**
   * Delegate a task to all children
   */
  async delegateToAllChildren(
    fromAgentId: string,
    task: string,
    context?: Record<string, unknown>,
  ): Promise<Map<string, unknown>> {
    const fromNode = this.nodes.get(fromAgentId);
    if (!fromNode) {
      throw new CoordinationError(`Agent not in hierarchy: ${fromAgentId}`);
    }

    const results = new Map<string, unknown>();

    const promises = fromNode.children.map(async (childId) => {
      const childNode = this.nodes.get(childId)!;
      if (childNode.agent) {
        try {
          const result = await childNode.agent.execute(task, {
            context: context ?? {},
          });
          results.set(childId, result.content);
        } catch (error) {
          results.set(
            childId,
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Escalate a task up the hierarchy
   */
  async escalateUp(
    fromAgentId: string,
    issue: string,
    context?: Record<string, unknown>,
    levels: number = 1,
  ): Promise<unknown> {
    const fromNode = this.nodes.get(fromAgentId);
    if (!fromNode) {
      throw new CoordinationError(`Agent not in hierarchy: ${fromAgentId}`);
    }

    // Find target parent
    let targetNode = fromNode;
    for (let i = 0; i < levels; i++) {
      if (!targetNode.parent) {
        break;
      }
      targetNode = this.nodes.get(targetNode.parent)!;
    }

    if (targetNode === fromNode) {
      throw new CoordinationError("No parent to escalate to");
    }

    if (!targetNode.agent) {
      throw new CoordinationError(
        `Parent agent not available: ${targetNode.agentId}`,
      );
    }

    logger.debug("[HierarchicalTopology] Escalating up", {
      from: fromAgentId,
      to: targetNode.agentId,
      levels,
    });

    const escalationPrompt = `Escalation from ${fromAgentId}: ${issue}`;
    const result = await targetNode.agent.execute(escalationPrompt, {
      context: {
        ...context,
        escalatedFrom: fromAgentId,
        escalationLevel: levels,
      },
    });

    if (result.status === "error") {
      throw new Error(result.error ?? "Escalation failed");
    }

    return result.content;
  }

  /**
   * Send a message to a sibling agent
   */
  async sendToSibling(
    fromAgentId: string,
    toAgentId: string,
    payload: unknown,
  ): Promise<void> {
    const fromNode = this.nodes.get(fromAgentId);
    const toNode = this.nodes.get(toAgentId);

    if (!fromNode || !toNode) {
      throw new CoordinationError("Agent not in hierarchy");
    }

    if (fromNode.parent !== toNode.parent) {
      if (!this.config.allowCrossLevel) {
        throw new CoordinationError("Cross-level communication is disabled");
      }
    }

    await this.bus.send({
      from: fromAgentId,
      to: toAgentId,
      type: "request",
      payload,
    });
  }

  /**
   * Select a child agent for delegation
   */
  private selectChild(node: HierarchyNode): string | undefined {
    // Simple round-robin for now
    // Could be enhanced with load balancing
    if (node.children.length === 0) {
      return undefined;
    }
    return node.children[0];
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(
    agentId: string,
    message: AgentMessage,
  ): Promise<void> {
    await this.protocols.routeMessage(message);

    // Handle delegation
    if (message.type === "delegation") {
      const node = this.nodes.get(agentId);
      if (node?.agent) {
        const payload = message.payload as {
          task: string;
          context: Record<string, unknown>;
        };
        try {
          const result = await node.agent.execute(payload.task, {
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
   * Get node info
   */
  getNode(agentId: string): HierarchyNode | undefined {
    return this.nodes.get(agentId);
  }

  /**
   * Get all nodes at a level
   */
  getNodesAtLevel(level: string): HierarchyNode[] {
    const agentIds = this.levelToAgents.get(level);
    if (!agentIds) {
      return [];
    }

    return agentIds
      .map((id) => this.nodes.get(id))
      .filter((node): node is HierarchyNode => node !== undefined);
  }

  /**
   * Get root node
   */
  getRootNode(): HierarchyNode | undefined {
    return this.nodes.get(this.config.rootAgentId);
  }

  /**
   * Get parent of an agent
   */
  getParent(agentId: string): HierarchyNode | undefined {
    const node = this.nodes.get(agentId);
    if (!node?.parent) {
      return undefined;
    }
    return this.nodes.get(node.parent);
  }

  /**
   * Get children of an agent
   */
  getChildren(agentId: string): HierarchyNode[] {
    const node = this.nodes.get(agentId);
    if (!node) {
      return [];
    }

    return node.children
      .map((id) => this.nodes.get(id))
      .filter((n): n is HierarchyNode => n !== undefined);
  }

  /**
   * Get siblings of an agent
   */
  getSiblings(agentId: string): HierarchyNode[] {
    const node = this.nodes.get(agentId);
    if (!node?.parent) {
      return [];
    }

    const parentNode = this.nodes.get(node.parent);
    if (!parentNode) {
      return [];
    }

    return parentNode.children
      .filter((id) => id !== agentId)
      .map((id) => this.nodes.get(id))
      .filter((n): n is HierarchyNode => n !== undefined);
  }

  /**
   * Get depth of an agent in the hierarchy
   */
  getDepth(agentId: string): number {
    const node = this.nodes.get(agentId);
    return node?.depth ?? -1;
  }

  /**
   * Get path from root to agent
   */
  getPathFromRoot(agentId: string): string[] {
    const path: string[] = [];
    let current = this.nodes.get(agentId);

    while (current) {
      path.unshift(current.agentId);
      current = current.parent ? this.nodes.get(current.parent) : undefined;
    }

    return path;
  }

  /**
   * Find common ancestor of two agents
   */
  findCommonAncestor(agentId1: string, agentId2: string): string | undefined {
    const path1 = this.getPathFromRoot(agentId1);
    const path2 = this.getPathFromRoot(agentId2);

    let commonAncestor: string | undefined;

    for (let i = 0; i < Math.min(path1.length, path2.length); i++) {
      if (path1[i] === path2[i]) {
        commonAncestor = path1[i];
      } else {
        break;
      }
    }

    return commonAncestor;
  }

  /**
   * Get all descendants of an agent
   */
  getDescendants(agentId: string): string[] {
    const descendants: string[] = [];
    const queue = [...(this.nodes.get(agentId)?.children ?? [])];

    while (queue.length > 0) {
      const current = queue.shift()!;
      descendants.push(current);

      const node = this.nodes.get(current);
      if (node) {
        queue.push(...node.children);
      }
    }

    return descendants;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.protocols.cleanup();
    this.bus.clear();
  }
}
