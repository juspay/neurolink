/**
 * Network Topology - Defines and manages network structure
 *
 * Provides different topology patterns for agent networks:
 * - Star: Central coordinator with peripheral agents
 * - Mesh: All agents can communicate with each other
 * - Hierarchical: Tree structure with supervisors and workers
 * - Ring: Agents form a circular communication pattern
 * - Custom: User-defined topology
 */

import { randomUUID } from "crypto";
import type { Agent } from "../agent.js";
import { logger } from "../../utils/logger.js";
import type {
  TopologyType,
  TopologyNode,
  TopologyEdge,
  TopologyConfig,
  TopologyStats,
} from "../../types/index.js";

/**
 * Network Topology - Manages agent network structure
 */
export class NetworkTopology {
  private nodes: Map<string, TopologyNode> = new Map();
  private edges: Map<string, TopologyEdge> = new Map();
  private config: TopologyConfig;
  private topologyId: string;

  constructor(config: TopologyConfig) {
    this.config = config;
    this.topologyId = randomUUID();

    logger.debug(`[NetworkTopology] Created with type: ${config.type}`);
  }

  /**
   * Build topology from agents
   */
  buildFromAgents(agents: Agent[]): void {
    // Clear existing topology
    this.nodes.clear();
    this.edges.clear();

    // Create nodes for all agents
    for (const agent of agents) {
      this.addNode(agent);
    }

    // Build edges based on topology type
    switch (this.config.type) {
      case "star":
        this.buildStarTopology(agents);
        break;
      case "mesh":
        this.buildMeshTopology(agents);
        break;
      case "hierarchical":
        this.buildHierarchicalTopology(agents);
        break;
      case "ring":
        this.buildRingTopology(agents);
        break;
      case "custom":
        this.buildCustomTopology(agents);
        break;
    }

    logger.info(`[NetworkTopology] Built ${this.config.type} topology`, {
      nodes: this.nodes.size,
      edges: this.edges.size,
    });
  }

  /**
   * Add a node to the topology
   */
  addNode(agent: Agent, role?: TopologyNode["role"]): TopologyNode {
    const node: TopologyNode = {
      id: `node-${agent.id}`,
      agentId: agent.id,
      agentName: agent.name,
      role: role ?? "worker",
      connections: [],
      childIds: [],
    };

    this.nodes.set(node.id, node);
    return node;
  }

  /**
   * Remove a node from the topology
   */
  removeNode(nodeId: string): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return false;
    }

    // Remove all edges connected to this node
    for (const edgeId of [...this.edges.keys()]) {
      const edge = this.edges.get(edgeId)!;
      if (edge.sourceId === nodeId || edge.targetId === nodeId) {
        this.edges.delete(edgeId);
      }
    }

    // Remove from other nodes' connections
    for (const otherNode of this.nodes.values()) {
      otherNode.connections = otherNode.connections.filter(
        (id) => id !== nodeId,
      );
      otherNode.childIds = otherNode.childIds.filter((id) => id !== nodeId);
      if (otherNode.parentId === nodeId) {
        otherNode.parentId = undefined;
      }
    }

    this.nodes.delete(nodeId);
    return true;
  }

  /**
   * Add an edge between nodes
   */
  addEdge(
    sourceId: string,
    targetId: string,
    type: TopologyEdge["type"] = "bidirectional",
    weight: number = 1,
  ): TopologyEdge | undefined {
    const sourceNode = this.nodes.get(sourceId);
    const targetNode = this.nodes.get(targetId);

    if (!sourceNode || !targetNode) {
      logger.warn(`[NetworkTopology] Cannot add edge: node not found`);
      return undefined;
    }

    const edge: TopologyEdge = {
      id: `edge-${sourceId}-${targetId}`,
      sourceId,
      targetId,
      type,
      weight,
    };

    this.edges.set(edge.id, edge);

    // Update node connections
    if (!sourceNode.connections.includes(targetId)) {
      sourceNode.connections.push(targetId);
    }

    if (
      type === "bidirectional" &&
      !targetNode.connections.includes(sourceId)
    ) {
      targetNode.connections.push(sourceId);
    }

    return edge;
  }

  /**
   * Remove an edge
   */
  removeEdge(edgeId: string): boolean {
    const edge = this.edges.get(edgeId);
    if (!edge) {
      return false;
    }

    // Update node connections
    const sourceNode = this.nodes.get(edge.sourceId);
    const targetNode = this.nodes.get(edge.targetId);

    if (sourceNode) {
      sourceNode.connections = sourceNode.connections.filter(
        (id) => id !== edge.targetId,
      );
    }

    if (targetNode && edge.type === "bidirectional") {
      targetNode.connections = targetNode.connections.filter(
        (id) => id !== edge.sourceId,
      );
    }

    this.edges.delete(edgeId);
    return true;
  }

  /**
   * Build star topology (hub and spoke)
   */
  private buildStarTopology(agents: Agent[]): void {
    if (agents.length === 0) {
      return;
    }

    // Find or create coordinator
    let coordinatorNode: TopologyNode | undefined;
    if (this.config.coordinatorId) {
      coordinatorNode = Array.from(this.nodes.values()).find(
        (n) => n.agentId === this.config.coordinatorId,
      );
    }

    if (!coordinatorNode) {
      // Use first agent as coordinator
      coordinatorNode = Array.from(this.nodes.values())[0];
    }

    coordinatorNode.role = "coordinator";

    // Connect all other nodes to coordinator
    for (const node of this.nodes.values()) {
      if (node.id !== coordinatorNode.id) {
        node.role = "worker";
        this.addEdge(coordinatorNode.id, node.id);
      }
    }
  }

  /**
   * Build mesh topology (fully connected)
   */
  private buildMeshTopology(_agents: Agent[]): void {
    const nodeArray = Array.from(this.nodes.values());

    // Connect every node to every other node
    for (let i = 0; i < nodeArray.length; i++) {
      nodeArray[i].role = "peer";
      for (let j = i + 1; j < nodeArray.length; j++) {
        this.addEdge(nodeArray[i].id, nodeArray[j].id);
      }
    }
  }

  /**
   * Build hierarchical topology (tree)
   */
  private buildHierarchicalTopology(agents: Agent[]): void {
    if (agents.length === 0) {
      return;
    }

    const nodeArray = Array.from(this.nodes.values());
    const maxChildren = this.config.maxChildren ?? 3;

    if (maxChildren < 1) {
      throw new Error(
        `[NetworkTopology] maxChildren must be >= 1, got ${maxChildren}. ` +
          `A value of 0 or less would orphan every non-root node because no ` +
          `children can ever be assigned to a parent.`,
      );
    }

    // Find or set root
    let rootNode: TopologyNode | undefined;
    if (this.config.rootId) {
      rootNode = nodeArray.find((n) => n.agentId === this.config.rootId);
    }
    if (!rootNode) {
      rootNode = nodeArray[0];
    }

    rootNode.role = "supervisor";
    const assigned = new Set<string>([rootNode.id]);
    const queue: TopologyNode[] = [rootNode];

    let nodeIndex = 1; // Start from second node

    while (queue.length > 0 && nodeIndex < nodeArray.length) {
      const parent = queue.shift()!;
      let childCount = 0;

      while (childCount < maxChildren && nodeIndex < nodeArray.length) {
        const child = nodeArray[nodeIndex];
        if (!assigned.has(child.id)) {
          // Set parent-child relationship
          child.parentId = parent.id;
          parent.childIds.push(child.id);
          child.role =
            nodeIndex < nodeArray.length - maxChildren
              ? "supervisor"
              : "worker";

          // Add edge
          this.addEdge(parent.id, child.id, "unidirectional");

          assigned.add(child.id);
          queue.push(child);
          childCount++;
        }
        nodeIndex++;
      }
    }
  }

  /**
   * Build ring topology
   */
  private buildRingTopology(_agents: Agent[]): void {
    const nodeArray = Array.from(this.nodes.values());

    if (nodeArray.length === 0) {
      return;
    }

    // Connect each node to the next, and last to first
    for (let i = 0; i < nodeArray.length; i++) {
      nodeArray[i].role = "peer";
      const nextIndex = (i + 1) % nodeArray.length;
      this.addEdge(nodeArray[i].id, nodeArray[nextIndex].id, "unidirectional");
    }
  }

  /**
   * Build custom topology from configuration
   */
  private buildCustomTopology(_agents: Agent[]): void {
    if (!this.config.customEdges) {
      return;
    }

    // Create node lookup by agent ID
    const nodeByAgentId = new Map<string, TopologyNode>();
    for (const node of this.nodes.values()) {
      nodeByAgentId.set(node.agentId, node);
      node.role = "peer";
    }

    // Add custom edges
    for (const edge of this.config.customEdges) {
      const sourceNode = nodeByAgentId.get(edge.source);
      const targetNode = nodeByAgentId.get(edge.target);

      if (sourceNode && targetNode) {
        this.addEdge(
          sourceNode.id,
          targetNode.id,
          edge.bidirectional !== false ? "bidirectional" : "unidirectional",
        );
      }
    }
  }

  /**
   * Get node by ID
   */
  getNode(nodeId: string): TopologyNode | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * Get node by agent ID
   */
  getNodeByAgentId(agentId: string): TopologyNode | undefined {
    for (const node of this.nodes.values()) {
      if (node.agentId === agentId) {
        return node;
      }
    }
    return undefined;
  }

  /**
   * Get all nodes
   */
  getAllNodes(): TopologyNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get all edges
   */
  getAllEdges(): TopologyEdge[] {
    return Array.from(this.edges.values());
  }

  /**
   * Get connected nodes
   */
  getConnectedNodes(nodeId: string): TopologyNode[] {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return [];
    }

    return node.connections
      .map((id) => this.nodes.get(id))
      .filter((n): n is TopologyNode => n !== undefined);
  }

  /**
   * Find shortest path between two nodes (BFS)
   */
  findShortestPath(sourceId: string, targetId: string): string[] | undefined {
    if (sourceId === targetId) {
      return [sourceId];
    }

    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; path: string[] }> = [
      { nodeId: sourceId, path: [sourceId] },
    ];

    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!;
      if (visited.has(nodeId)) {
        continue;
      }
      visited.add(nodeId);

      const node = this.nodes.get(nodeId);
      if (!node) {
        continue;
      }

      for (const connectedId of node.connections) {
        if (connectedId === targetId) {
          return [...path, targetId];
        }

        if (!visited.has(connectedId)) {
          queue.push({ nodeId: connectedId, path: [...path, connectedId] });
        }
      }
    }

    return undefined; // No path found
  }

  /**
   * Check if two nodes are connected (directly or indirectly)
   */
  areConnected(sourceId: string, targetId: string): boolean {
    return this.findShortestPath(sourceId, targetId) !== undefined;
  }

  /**
   * Get nodes by role
   */
  getNodesByRole(role: TopologyNode["role"]): TopologyNode[] {
    return Array.from(this.nodes.values()).filter((n) => n.role === role);
  }

  /**
   * Get coordinator/root node
   */
  getCoordinator(): TopologyNode | undefined {
    return (
      Array.from(this.nodes.values()).find((n) => n.role === "coordinator") ||
      Array.from(this.nodes.values()).find(
        (n) => n.role === "supervisor" && !n.parentId,
      )
    );
  }

  /**
   * Calculate topology statistics
   */
  getStats(): TopologyStats {
    const nodes = Array.from(this.nodes.values());
    const nodeCount = nodes.length;
    const edgeCount = this.edges.size;

    if (nodeCount === 0) {
      return {
        nodeCount: 0,
        edgeCount: 0,
        avgConnections: 0,
        maxConnections: 0,
        minConnections: 0,
        diameter: 0,
        density: 0,
      };
    }

    const connectionCounts = nodes.map((n) => n.connections.length);
    const maxConnections = Math.max(...connectionCounts);
    const minConnections = Math.min(...connectionCounts);
    const avgConnections =
      connectionCounts.reduce((a, b) => a + b, 0) / nodeCount;

    // Calculate diameter (max shortest path)
    let diameter = 0;
    for (const source of nodes) {
      for (const target of nodes) {
        if (source.id !== target.id) {
          const path = this.findShortestPath(source.id, target.id);
          if (path && path.length - 1 > diameter) {
            diameter = path.length - 1;
          }
        }
      }
    }

    // Calculate density
    const maxPossibleEdges = (nodeCount * (nodeCount - 1)) / 2;
    const density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;

    return {
      nodeCount,
      edgeCount,
      avgConnections,
      maxConnections,
      minConnections,
      diameter,
      density,
    };
  }

  /**
   * Export topology as JSON
   */
  toJSON(): {
    id: string;
    type: TopologyType;
    nodes: TopologyNode[];
    edges: TopologyEdge[];
  } {
    return {
      id: this.topologyId,
      type: this.config.type,
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
    };
  }

  /**
   * Import topology from JSON
   */
  fromJSON(data: {
    id?: string;
    type: TopologyType;
    nodes: TopologyNode[];
    edges: TopologyEdge[];
  }): void {
    // Restore the original topology id so round-trips preserve identity
    if (data.id !== undefined) {
      this.topologyId = data.id;
    }

    this.config.type = data.type;
    this.nodes.clear();
    this.edges.clear();

    for (const node of data.nodes) {
      this.nodes.set(node.id, node);
    }

    for (const edge of data.edges) {
      this.edges.set(edge.id, edge);
    }
  }

  /**
   * Get topology type
   */
  getType(): TopologyType {
    return this.config.type;
  }

  /**
   * Get topology ID
   */
  getId(): string {
    return this.topologyId;
  }
}

/**
 * Topology builder for fluent API
 */
export class TopologyBuilder {
  private agents: Agent[] = [];
  private config: TopologyConfig;

  constructor(type: TopologyType) {
    this.config = { type };
  }

  /**
   * Add an agent
   */
  addAgent(agent: Agent): TopologyBuilder {
    this.agents.push(agent);
    return this;
  }

  /**
   * Add multiple agents
   */
  addAgents(agents: Agent[]): TopologyBuilder {
    this.agents.push(...agents);
    return this;
  }

  /**
   * Set coordinator (for star topology)
   */
  setCoordinator(agentId: string): TopologyBuilder {
    this.config.coordinatorId = agentId;
    return this;
  }

  /**
   * Set root (for hierarchical topology)
   */
  setRoot(agentId: string): TopologyBuilder {
    this.config.rootId = agentId;
    return this;
  }

  /**
   * Set max children (for hierarchical topology)
   */
  setMaxChildren(max: number): TopologyBuilder {
    this.config.maxChildren = max;
    return this;
  }

  /**
   * Add custom edge
   */
  addCustomEdge(
    sourceAgentId: string,
    targetAgentId: string,
    bidirectional: boolean = true,
  ): TopologyBuilder {
    if (!this.config.customEdges) {
      this.config.customEdges = [];
    }
    this.config.customEdges.push({
      source: sourceAgentId,
      target: targetAgentId,
      bidirectional,
    });
    return this;
  }

  /**
   * Build the topology
   */
  build(): NetworkTopology {
    const topology = new NetworkTopology(this.config);
    topology.buildFromAgents(this.agents);
    return topology;
  }
}
