/**
 * Multi-Server Manager
 *
 * Coordinates multiple MCP servers with load balancing, failover,
 * and unified tool discovery across all registered servers.
 *
 * Features:
 * - Load balancing strategies (round-robin, least-loaded, random)
 * - Health-aware routing
 * - Automatic failover
 * - Unified tool namespace management
 * - Cross-server tool discovery
 *
 * @module mcp/multiServerManager
 * @since 8.39.0
 */

import { EventEmitter } from "events";
import type { MCPServerInfo } from "../types/mcpTypes.js";
import type { JsonObject } from "../types/common.js";
import { logger } from "../utils/logger.js";
import { ErrorFactory } from "../utils/errorHandling.js";

/**
 * Load balancing strategies
 */
export type LoadBalancingStrategy =
  | "round-robin" // Rotate through servers
  | "least-loaded" // Prefer server with fewest active requests
  | "random" // Random selection
  | "weighted" // Weighted random based on priority
  | "failover-only"; // Use primary, failover only on failure

/**
 * Server weight for weighted load balancing
 */
export type ServerWeight = {
  serverId: string;
  weight: number; // 0-100, higher = more traffic
  priority: number; // Lower = higher priority for failover
};

/**
 * Server group definition
 */
export type ServerGroup = {
  /**
   * Group identifier
   */
  id: string;

  /**
   * Human-readable name
   */
  name: string;

  /**
   * Description of the group
   */
  description?: string;

  /**
   * Server IDs in this group
   */
  servers: string[];

  /**
   * Load balancing strategy for this group
   */
  strategy: LoadBalancingStrategy;

  /**
   * Weights for weighted strategy
   */
  weights?: ServerWeight[];

  /**
   * Whether to enable health-aware routing
   */
  healthAware?: boolean;

  /**
   * Minimum healthy servers before alerting
   */
  minHealthyServers?: number;
};

/**
 * Unified tool entry from multiple servers
 */
export type UnifiedTool = {
  /**
   * Tool name
   */
  name: string;

  /**
   * Tool description
   */
  description: string;

  /**
   * Servers that provide this tool
   */
  servers: Array<{
    serverId: string;
    serverName: string;
    inputSchema?: JsonObject;
    priority: number;
  }>;

  /**
   * Whether this tool has naming conflicts
   */
  hasConflict: boolean;

  /**
   * Preferred server for this tool
   */
  preferredServerId?: string;
};

/**
 * Multi-server manager configuration
 */
export type MultiServerManagerConfig = {
  /**
   * Default load balancing strategy
   */
  defaultStrategy?: LoadBalancingStrategy;

  /**
   * Enable health-aware routing by default
   */
  healthAwareRouting?: boolean;

  /**
   * Health check interval in milliseconds
   */
  healthCheckInterval?: number;

  /**
   * Maximum retries on failover
   */
  maxFailoverRetries?: number;

  /**
   * Tool namespace separator
   */
  namespaceSeparator?: string;

  /**
   * Enable automatic tool namespace prefixing
   */
  autoNamespace?: boolean;

  /**
   * Conflict resolution strategy.
   * Reserved for future conflict resolution strategy — currently stored but not
   * consumed by any routing or tool-merge logic.
   */
  conflictResolution?: "first-wins" | "last-wins" | "namespace" | "explicit";
};

/**
 * Server metrics for load balancing
 */
type ServerMetrics = {
  activeRequests: number;
  totalRequests: number;
  completedRequests: number;
  averageResponseTime: number;
  errorRate: number;
  lastHealthCheck?: Date;
  isHealthy: boolean;
};

/**
 * Multi-Server Manager
 *
 * Coordinates multiple MCP servers for unified tool access
 * with load balancing and failover capabilities.
 *
 * @example
 * ```typescript
 * const manager = new MultiServerManager({
 *   defaultStrategy: "round-robin",
 *   healthAwareRouting: true,
 *   autoNamespace: true,
 * });
 *
 * // Add servers
 * manager.addServer(server1Info);
 * manager.addServer(server2Info);
 *
 * // Create a group for redundant servers
 * manager.createGroup({
 *   id: "data-servers",
 *   name: "Data Processing Servers",
 *   servers: ["server1", "server2"],
 *   strategy: "least-loaded",
 * });
 *
 * // Get unified tool list
 * const tools = manager.getUnifiedTools();
 *
 * // Execute with automatic routing
 * const result = await manager.executeTool("readFile", { path: "/data" });
 * ```
 */
export class MultiServerManager extends EventEmitter {
  private config: Required<MultiServerManagerConfig>;
  private servers: Map<string, MCPServerInfo> = new Map();
  private groups: Map<string, ServerGroup> = new Map();
  private metrics: Map<string, ServerMetrics> = new Map();
  private roundRobinCounters: Map<string, number> = new Map();
  private toolPreferences: Map<string, string> = new Map(); // toolName -> preferred serverId

  constructor(config: MultiServerManagerConfig = {}) {
    super();

    this.config = {
      defaultStrategy: config.defaultStrategy ?? "round-robin",
      healthAwareRouting: config.healthAwareRouting ?? true,
      healthCheckInterval: config.healthCheckInterval ?? 30000,
      maxFailoverRetries: config.maxFailoverRetries ?? 3,
      namespaceSeparator: config.namespaceSeparator ?? ".",
      autoNamespace: config.autoNamespace ?? false,
      conflictResolution: config.conflictResolution ?? "first-wins",
    };
  }

  /**
   * Add a server to the manager
   */
  addServer(server: MCPServerInfo): void {
    this.servers.set(server.id, server);

    // Initialize metrics
    this.metrics.set(server.id, {
      activeRequests: 0,
      totalRequests: 0,
      completedRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      isHealthy: server.status === "connected",
    });

    this.emit("serverAdded", { serverId: server.id, server });

    logger.debug(
      `[MultiServerManager] Added server: ${server.id} (${server.name})`,
    );
  }

  /**
   * Remove a server from the manager
   */
  removeServer(serverId: string): boolean {
    const server = this.servers.get(serverId);

    if (!server) {
      return false;
    }

    // Remove from all groups
    for (const [groupId, group] of this.groups) {
      const index = group.servers.indexOf(serverId);
      if (index !== -1) {
        group.servers.splice(index, 1);

        // Remove empty groups
        if (group.servers.length === 0) {
          this.groups.delete(groupId);
          this.roundRobinCounters.delete(groupId);
        }
      }
    }

    this.servers.delete(serverId);
    this.metrics.delete(serverId);

    // Clear tool preferences for this server
    for (const [toolName, preferredServer] of this.toolPreferences) {
      if (preferredServer === serverId) {
        this.toolPreferences.delete(toolName);
      }
    }

    this.emit("serverRemoved", { serverId });

    logger.debug(`[MultiServerManager] Removed server: ${serverId}`);

    return true;
  }

  /**
   * Update server info
   */
  updateServer(serverId: string, updates: Partial<MCPServerInfo>): void {
    const server = this.servers.get(serverId);

    if (!server) {
      throw ErrorFactory.invalidConfiguration(
        "serverId",
        `Server '${serverId}' not found`,
        { serverId },
      );
    }

    const updatedServer = { ...server, ...updates, id: serverId };
    this.servers.set(serverId, updatedServer);

    // Update health status in metrics
    const metrics = this.metrics.get(serverId);
    if (metrics && updates.status !== undefined) {
      metrics.isHealthy = updates.status === "connected";
    }

    this.emit("serverUpdated", { serverId, server: updatedServer });
  }

  /**
   * Create a server group
   */
  createGroup(group: ServerGroup): void {
    // Validate servers exist
    for (const serverId of group.servers) {
      if (!this.servers.has(serverId)) {
        throw ErrorFactory.invalidConfiguration(
          "serverGroup.servers",
          `Server '${serverId}' not found when creating group '${group.id}'`,
          { serverId, groupId: group.id },
        );
      }
    }

    this.groups.set(group.id, group);
    this.roundRobinCounters.set(group.id, 0);

    this.emit("groupCreated", { group });

    logger.debug(
      `[MultiServerManager] Created group: ${group.id} with ${group.servers.length} servers`,
    );
  }

  /**
   * Remove a server group
   */
  removeGroup(groupId: string): boolean {
    const removed = this.groups.delete(groupId);
    if (removed) {
      this.roundRobinCounters.delete(groupId);
      this.emit("groupRemoved", { groupId });
    }
    return removed;
  }

  /**
   * Add a server to a group
   */
  addServerToGroup(serverId: string, groupId: string): void {
    const group = this.groups.get(groupId);

    if (!group) {
      throw ErrorFactory.invalidConfiguration(
        "groupId",
        `Group '${groupId}' not found`,
        { groupId },
      );
    }

    if (!this.servers.has(serverId)) {
      throw ErrorFactory.invalidConfiguration(
        "serverId",
        `Server '${serverId}' not found`,
        { serverId, groupId },
      );
    }

    if (!group.servers.includes(serverId)) {
      group.servers.push(serverId);
      this.emit("serverAddedToGroup", { serverId, groupId });
    }
  }

  /**
   * Remove a server from a group
   */
  removeServerFromGroup(serverId: string, groupId: string): boolean {
    const group = this.groups.get(groupId);

    if (!group) {
      return false;
    }

    const index = group.servers.indexOf(serverId);
    if (index !== -1) {
      group.servers.splice(index, 1);
      this.emit("serverRemovedFromGroup", { serverId, groupId });
      return true;
    }

    return false;
  }

  /**
   * Get unified tool list from all servers
   */
  getUnifiedTools(): UnifiedTool[] {
    const toolMap = new Map<string, UnifiedTool>();

    for (const [serverId, server] of this.servers) {
      const metrics = this.metrics.get(serverId);
      const isHealthy = metrics?.isHealthy ?? true;

      // Skip unhealthy servers in health-aware mode
      if (this.config.healthAwareRouting && !isHealthy) {
        continue;
      }

      for (const tool of server.tools || []) {
        const existingTool = toolMap.get(tool.name);

        if (existingTool) {
          // Tool exists from another server - mark as conflict
          existingTool.hasConflict = true;
          existingTool.servers.push({
            serverId,
            serverName: server.name,
            inputSchema: tool.inputSchema as JsonObject | undefined,
            priority: this.getServerPriority(serverId),
          });
        } else {
          // New tool
          toolMap.set(tool.name, {
            name: tool.name,
            description: tool.description,
            servers: [
              {
                serverId,
                serverName: server.name,
                inputSchema: tool.inputSchema as JsonObject | undefined,
                priority: this.getServerPriority(serverId),
              },
            ],
            hasConflict: false,
            preferredServerId: this.toolPreferences.get(tool.name),
          });
        }
      }
    }

    // Sort servers by priority within each tool
    for (const tool of toolMap.values()) {
      tool.servers.sort((a, b) => a.priority - b.priority);

      // Set preferred server if not already set
      if (!tool.preferredServerId && tool.servers.length > 0) {
        tool.preferredServerId = tool.servers[0].serverId;
      }
    }

    return Array.from(toolMap.values());
  }

  /**
   * Get namespaced tools (server.toolName format)
   */
  getNamespacedTools(): Array<{
    fullName: string;
    toolName: string;
    serverId: string;
    serverName: string;
    description: string;
    inputSchema?: JsonObject;
  }> {
    const tools: Array<{
      fullName: string;
      toolName: string;
      serverId: string;
      serverName: string;
      description: string;
      inputSchema?: JsonObject;
    }> = [];

    for (const [serverId, server] of this.servers) {
      // Skip unhealthy servers in health-aware mode
      if (this.config.healthAwareRouting) {
        const metrics = this.metrics.get(serverId);
        const isHealthy = metrics?.isHealthy ?? true;
        if (!isHealthy) {
          continue;
        }
      }

      for (const tool of server.tools || []) {
        tools.push({
          fullName: `${serverId}${this.config.namespaceSeparator}${tool.name}`,
          toolName: tool.name,
          serverId,
          serverName: server.name,
          description: tool.description,
          inputSchema: tool.inputSchema as JsonObject | undefined,
        });
      }
    }

    return tools;
  }

  /**
   * Set tool preference for routing
   */
  setToolPreference(toolName: string, serverId: string): void {
    if (!this.servers.has(serverId)) {
      throw ErrorFactory.invalidConfiguration(
        "serverId",
        `Server '${serverId}' not found`,
        { serverId, toolName },
      );
    }

    this.toolPreferences.set(toolName, serverId);
    this.emit("toolPreferenceSet", { toolName, serverId });
  }

  /**
   * Clear tool preference
   */
  clearToolPreference(toolName: string): void {
    this.toolPreferences.delete(toolName);
  }

  /**
   * Select a server for a tool using load balancing
   */
  selectServer(
    toolName: string,
    groupId?: string,
  ): { serverId: string; server: MCPServerInfo } | null {
    // Check for tool preference first
    const preferredServerId = this.toolPreferences.get(toolName);
    if (preferredServerId) {
      const server = this.servers.get(preferredServerId);
      const metrics = this.metrics.get(preferredServerId);

      if (server && (!this.config.healthAwareRouting || metrics?.isHealthy)) {
        // Check if server has the tool
        if (server.tools?.some((t) => t.name === toolName)) {
          return { serverId: preferredServerId, server };
        }
      }
    }

    // Get candidate servers (from group or all servers)
    let candidates: string[];

    if (groupId) {
      const group = this.groups.get(groupId);
      if (!group) {
        logger.warn(`[MultiServerManager] Group '${groupId}' not found`);
        return null;
      }
      // Filter group servers to only those that have the requested tool
      candidates = group.servers.filter((serverId) => {
        const server = this.servers.get(serverId);
        return server?.tools?.some((t) => t.name === toolName);
      });
    } else {
      // Find all servers that have this tool
      candidates = [];
      for (const [serverId, server] of this.servers) {
        if (server.tools?.some((t) => t.name === toolName)) {
          candidates.push(serverId);
        }
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    // Filter by health if enabled (prefer group-level flag, fall back to global)
    const healthAware = groupId
      ? (this.groups.get(groupId)?.healthAware ??
        this.config.healthAwareRouting)
      : this.config.healthAwareRouting;
    if (healthAware) {
      candidates = candidates.filter((id) => {
        const metrics = this.metrics.get(id);
        return metrics?.isHealthy ?? true;
      });

      if (candidates.length === 0) {
        logger.warn(
          `[MultiServerManager] No healthy servers available for tool '${toolName}'`,
        );
        return null;
      }
    }

    // Apply load balancing strategy
    const strategy = groupId
      ? (this.groups.get(groupId)?.strategy ?? this.config.defaultStrategy)
      : this.config.defaultStrategy;

    const selectedId = this.applyStrategy(strategy, candidates, groupId);

    if (!selectedId) {
      return null;
    }

    const server = this.servers.get(selectedId);
    return server ? { serverId: selectedId, server } : null;
  }

  /**
   * Apply load balancing strategy
   */
  private applyStrategy(
    strategy: LoadBalancingStrategy,
    candidates: string[],
    groupId?: string,
  ): string | null {
    if (candidates.length === 0) {
      return null;
    }

    if (candidates.length === 1) {
      return candidates[0];
    }

    switch (strategy) {
      case "round-robin": {
        const counterKey = groupId ?? "default";
        const counter = this.roundRobinCounters.get(counterKey) ?? 0;
        const selected = candidates[counter % candidates.length];
        this.roundRobinCounters.set(counterKey, counter + 1);
        return selected;
      }

      case "least-loaded": {
        let minLoad = Infinity;
        let selected = candidates[0];

        for (const serverId of candidates) {
          const metrics = this.metrics.get(serverId);
          const load = metrics?.activeRequests ?? 0;

          if (load < minLoad) {
            minLoad = load;
            selected = serverId;
          }
        }

        return selected;
      }

      case "random": {
        const index = Math.floor(Math.random() * candidates.length);
        return candidates[index];
      }

      case "weighted": {
        if (!groupId) {
          // Fall back to random for non-group selection
          const index = Math.floor(Math.random() * candidates.length);
          return candidates[index];
        }

        const group = this.groups.get(groupId);
        if (!group?.weights) {
          const index = Math.floor(Math.random() * candidates.length);
          return candidates[index];
        }

        // Build effective weights: use configured weight or default of 1 for unlisted candidates
        const DEFAULT_WEIGHT = 1;
        const effectiveWeights = candidates.map((serverId) => {
          const weights = group.weights ?? [];
          const configured = weights.find((w) => w.serverId === serverId);
          return {
            serverId,
            weight: configured?.weight ?? DEFAULT_WEIGHT,
          };
        });

        const totalWeight = effectiveWeights.reduce(
          (sum, w) => sum + w.weight,
          0,
        );

        if (totalWeight === 0) {
          const index = Math.floor(Math.random() * candidates.length);
          return candidates[index];
        }

        let random = Math.random() * totalWeight;

        for (const ew of effectiveWeights) {
          random -= ew.weight;
          if (random <= 0) {
            return ew.serverId;
          }
        }

        return candidates[0];
      }

      case "failover-only": {
        // Return first healthy server by priority
        const serverPriorities = candidates
          .map((id) => ({
            id,
            priority: this.getServerPriority(id, groupId),
          }))
          .sort((a, b) => a.priority - b.priority);

        return serverPriorities[0]?.id ?? null;
      }

      default:
        return candidates[0];
    }
  }

  /**
   * Get server priority (lower = higher priority)
   *
   * @param serverId - The server to look up
   * @param groupId - Optional group to scope the lookup to, avoiding
   *   nondeterministic iteration across all groups.
   */
  private getServerPriority(serverId: string, groupId?: string): number {
    // Scoped lookup: check only the specified group
    if (groupId) {
      const group = this.groups.get(groupId);
      if (group?.weights) {
        const weight = group.weights.find((w) => w.serverId === serverId);
        if (weight) {
          return weight.priority;
        }
      }
    }

    // Fallback: check all groups for weight/priority settings
    for (const group of this.groups.values()) {
      if (group.weights) {
        const weight = group.weights.find((w) => w.serverId === serverId);
        if (weight) {
          return weight.priority;
        }
      }
    }

    // Default priority based on order added
    const serverIds = Array.from(this.servers.keys());
    return serverIds.indexOf(serverId);
  }

  /**
   * Update server metrics
   */
  updateMetrics(serverId: string, updates: Partial<ServerMetrics>): void {
    const metrics = this.metrics.get(serverId);

    if (metrics) {
      Object.assign(metrics, updates);
      this.emit("metricsUpdated", { serverId, metrics: { ...metrics } });
    }
  }

  /**
   * Mark request started
   */
  requestStarted(serverId: string): void {
    const metrics = this.metrics.get(serverId);
    if (metrics) {
      metrics.activeRequests++;
      metrics.totalRequests++;
    }
  }

  /**
   * Mark request completed
   */
  requestCompleted(serverId: string, duration: number, success: boolean): void {
    const metrics = this.metrics.get(serverId);
    if (metrics) {
      metrics.activeRequests = Math.max(0, metrics.activeRequests - 1);
      metrics.completedRequests++;

      // Update average response time using only completed requests
      const totalTime =
        metrics.averageResponseTime * (metrics.completedRequests - 1) +
        duration;
      metrics.averageResponseTime = totalTime / metrics.completedRequests;

      // Update error rate (simple moving average)
      const alpha = 0.1; // Smoothing factor
      metrics.errorRate =
        metrics.errorRate * (1 - alpha) + (success ? 0 : 1) * alpha;
    }
  }

  /**
   * Get all servers
   */
  getServers(): MCPServerInfo[] {
    return Array.from(this.servers.values());
  }

  /**
   * Get server by ID
   */
  getServer(serverId: string): MCPServerInfo | undefined {
    return this.servers.get(serverId);
  }

  /**
   * Get all groups
   */
  getGroups(): ServerGroup[] {
    return Array.from(this.groups.values());
  }

  /**
   * Get group by ID
   */
  getGroup(groupId: string): ServerGroup | undefined {
    return this.groups.get(groupId);
  }

  /**
   * Get server metrics
   */
  getServerMetrics(serverId: string): ServerMetrics | undefined {
    return this.metrics.get(serverId);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, ServerMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalServers: number;
    healthyServers: number;
    totalGroups: number;
    totalTools: number;
    conflictingTools: number;
    totalRequests: number;
    activeRequests: number;
  } {
    let healthyServers = 0;
    let totalRequests = 0;
    let activeRequests = 0;

    for (const metrics of this.metrics.values()) {
      if (metrics.isHealthy) {
        healthyServers++;
      }
      totalRequests += metrics.totalRequests;
      activeRequests += metrics.activeRequests;
    }

    const unifiedTools = this.getUnifiedTools();
    const conflictingTools = unifiedTools.filter((t) => t.hasConflict).length;

    return {
      totalServers: this.servers.size,
      healthyServers,
      totalGroups: this.groups.size,
      totalTools: unifiedTools.length,
      conflictingTools,
      totalRequests,
      activeRequests,
    };
  }
}

/**
 * Global multi-server manager instance
 */
export const globalMultiServerManager = new MultiServerManager();
