/**
 * Tool Router - Routes tool calls to appropriate MCP servers
 * Based on tool categories, annotations, and server capabilities
 *
 * Provides intelligent routing strategies for multi-server MCP environments:
 * - Round-robin for even distribution
 * - Least-loaded for optimal performance
 * - Capability-based for specialized servers
 * - Affinity-based for session consistency
 */

import { EventEmitter } from "events";
import type { ToolInfo } from "../../types/tools.js";
import { ErrorFactory } from "../../utils/errorHandling.js";
import type { MCPToolAnnotations } from "../mcpServerBase.js";

/**
 * Routing strategy types
 */
export type RoutingStrategy =
  | "round-robin" // Distribute evenly across servers
  | "least-loaded" // Route to server with fewest active connections
  | "capability-based" // Route based on server capabilities/features
  | "affinity" // Route based on session/user affinity
  | "priority" // Route based on server priority weights
  | "random"; // Random selection for load distribution

/**
 * Server routing weight configuration
 */
export type ServerWeight = {
  serverId: string;
  weight: number; // 0-100, higher = more traffic
  capabilities?: string[];
};

/**
 * Category to server mapping
 */
export type CategoryMapping = {
  category: string;
  serverIds: string[];
  priority?: number;
};

/**
 * Affinity rule for session-based routing
 */
export type AffinityRule = {
  key: string; // e.g., "sessionId", "userId"
  serverId: string;
  expiresAt?: number;
};

/**
 * Tool Router configuration
 */
export type ToolRouterConfig = {
  /**
   * Primary routing strategy
   */
  strategy: RoutingStrategy;

  /**
   * Enable session/user affinity for consistent routing
   */
  enableAffinity?: boolean;

  /**
   * Category to server mapping for capability-based routing
   */
  categoryMapping?: Record<string, string[]>;

  /**
   * Server weights for priority-based routing
   */
  serverWeights?: ServerWeight[];

  /**
   * Fallback strategy if primary fails
   */
  fallbackStrategy?: RoutingStrategy;

  /**
   * Maximum retries for failed routes
   */
  maxRetries?: number;

  /**
   * Health check interval in milliseconds
   */
  healthCheckInterval?: number;

  /**
   * Affinity TTL in milliseconds (default: 30 minutes)
   */
  affinityTtl?: number;
};

/**
 * Routing decision result
 */
export type RoutingDecision = {
  serverId: string;
  strategy: RoutingStrategy;
  confidence: number; // 0-1, how confident the router is in this decision
  alternates?: string[]; // Fallback servers
  reason?: string;
};

/**
 * Tool Router events
 */
export type ToolRouterEvents = {
  routeDecision: {
    toolName: string;
    decision: RoutingDecision;
  };
  routeFailed: {
    toolName: string;
    error: Error;
    attemptedServers: string[];
  };
  affinitySet: {
    key: string;
    serverId: string;
  };
  affinityExpired: {
    key: string;
  };
  healthUpdate: {
    serverId: string;
    healthy: boolean;
  };
};

/**
 * MCP Tool type with annotations
 */
export type MCPTool = ToolInfo & {
  annotations?: MCPToolAnnotations;
  serverId?: string;
  category?: string;
};

/**
 * Default router configuration for common use cases
 */
export const DEFAULT_ROUTER_CONFIG: ToolRouterConfig = {
  strategy: "least-loaded",
  enableAffinity: false,
  maxRetries: 3,
  healthCheckInterval: 30000,
  affinityTtl: 30 * 60 * 1000,
};

/**
 * Tool Router - Intelligent routing for MCP tool calls
 *
 * @example
 * ```typescript
 * const router = new ToolRouter({
 *   strategy: 'least-loaded',
 *   enableAffinity: true,
 *   categoryMapping: {
 *     'database': ['db-server-1', 'db-server-2'],
 *     'ai': ['ai-server-primary', 'ai-server-secondary'],
 *   },
 * });
 *
 * const decision = router.route(tool, { sessionId: 'user-123' });
 * console.log(`Routing to: ${decision.serverId}`);
 * ```
 */
export class ToolRouter extends EventEmitter {
  private config: Required<ToolRouterConfig>;
  private roundRobinIndex: Map<string, number> = new Map();
  private serverLoads: Map<string, number> = new Map();
  private affinityRules: Map<string, AffinityRule> = new Map();
  private healthStatus: Map<string, boolean> = new Map();
  private availableServers: Set<string> = new Set();
  private affinityCleanupTimer?: ReturnType<typeof setInterval>;

  constructor(config: ToolRouterConfig = DEFAULT_ROUTER_CONFIG) {
    super();

    this.config = {
      strategy: config.strategy ?? "least-loaded",
      enableAffinity: config.enableAffinity ?? false,
      categoryMapping: config.categoryMapping ?? {},
      serverWeights: config.serverWeights ?? [],
      fallbackStrategy: config.fallbackStrategy ?? "round-robin",
      maxRetries: config.maxRetries ?? 3,
      healthCheckInterval: config.healthCheckInterval ?? 30000,
      affinityTtl: config.affinityTtl ?? 30 * 60 * 1000, // 30 minutes
    };

    if (this.config.enableAffinity) {
      this.affinityCleanupTimer = setInterval(() => {
        this.cleanupExpiredAffinities();
      }, this.config.healthCheckInterval);
      if (this.affinityCleanupTimer.unref) {
        this.affinityCleanupTimer.unref();
      }
    }
  }

  destroy(): void {
    if (this.affinityCleanupTimer) {
      clearInterval(this.affinityCleanupTimer);
      this.affinityCleanupTimer = undefined;
    }
    this.affinityRules.clear();
  }

  private cleanupExpiredAffinities(): void {
    const now = Date.now();
    for (const [key, rule] of this.affinityRules) {
      if (rule.expiresAt && rule.expiresAt <= now) {
        this.affinityRules.delete(key);
        this.emit("affinityExpired", { key });
      }
    }
  }

  /**
   * Register a server as available for routing
   */
  registerServer(serverId: string, capabilities?: string[]): void {
    this.availableServers.add(serverId);
    this.healthStatus.set(serverId, true);
    this.serverLoads.set(serverId, 0);

    // Update category mapping if capabilities provided
    if (capabilities) {
      for (const capability of capabilities) {
        if (!this.config.categoryMapping[capability]) {
          this.config.categoryMapping[capability] = [];
        }
        if (!this.config.categoryMapping[capability].includes(serverId)) {
          this.config.categoryMapping[capability].push(serverId);
        }
      }
    }
  }

  /**
   * Unregister a server from routing
   */
  unregisterServer(serverId: string): void {
    this.availableServers.delete(serverId);
    this.healthStatus.delete(serverId);
    this.serverLoads.delete(serverId);
    // Reset all round-robin indices since any tool may have been
    // routed to the removed server. Keys are `rr-${toolName}`.
    this.roundRobinIndex.clear();

    // Remove from category mappings
    for (const category of Object.keys(this.config.categoryMapping)) {
      const servers = this.config.categoryMapping[category];
      const index = servers.indexOf(serverId);
      if (index !== -1) {
        servers.splice(index, 1);
      }
    }
  }

  /**
   * Route a tool call to the best server
   */
  route(
    tool: MCPTool,
    context?: { sessionId?: string; userId?: string },
  ): RoutingDecision {
    // Check affinity first if enabled
    if (this.config.enableAffinity && context) {
      const affinityKey = context.sessionId ?? context.userId;
      if (affinityKey) {
        const affinityRule = this.affinityRules.get(affinityKey);
        if (affinityRule && this.isServerHealthy(affinityRule.serverId)) {
          if (!affinityRule.expiresAt || affinityRule.expiresAt > Date.now()) {
            return {
              serverId: affinityRule.serverId,
              strategy: "affinity",
              confidence: 1.0,
              reason: `Affinity match for ${affinityKey}`,
            };
          } else {
            this.affinityRules.delete(affinityKey);
            this.emit("affinityExpired", { key: affinityKey });
          }
        }
      }
    }

    // Get candidate servers
    const candidates = this.getCandidateServers(tool);

    if (candidates.length === 0) {
      const routeError = ErrorFactory.toolExecutionFailed(
        tool.name,
        new Error(
          `No healthy servers available (strategy: ${this.config.strategy}, registered: ${this.availableServers.size})`,
        ),
      );
      this.emit("routeFailed", {
        toolName: tool.name,
        error: routeError,
        attemptedServers: Array.from(this.availableServers),
      });
      throw routeError;
    }

    // Apply routing strategy
    const decision = this.applyStrategy(this.config.strategy, tool, candidates);

    // Set affinity if enabled
    if (this.config.enableAffinity && context) {
      const affinityKey = context.sessionId ?? context.userId;
      if (affinityKey) {
        this.setAffinity(affinityKey, decision.serverId);
      }
    }

    this.emit("routeDecision", { toolName: tool.name, decision });

    return decision;
  }

  /**
   * Route by tool category
   */
  routeByCategory(tool: MCPTool, category: string): string[] {
    const servers = this.config.categoryMapping[category] ?? [];
    return servers.filter((s) => this.isServerHealthy(s));
  }

  /**
   * Route by tool annotation hints
   */
  routeByAnnotation(tool: MCPTool): string[] {
    if (!tool.annotations) {
      return Array.from(this.availableServers).filter((s) =>
        this.isServerHealthy(s),
      );
    }

    // Route destructive tools to primary servers only (check before readOnlyHint
    // so that a tool with both flags is still restricted to primary servers)
    if (tool.annotations.destructiveHint) {
      const primaryServers = this.config.serverWeights
        .filter((sw) => sw.weight >= 50)
        .map((sw) => sw.serverId)
        .filter((s) => this.isServerHealthy(s));

      if (primaryServers.length > 0) {
        return primaryServers;
      }
    }

    // Route read-only tools to any healthy server
    if (tool.annotations.readOnlyHint) {
      return Array.from(this.availableServers).filter((s) =>
        this.isServerHealthy(s),
      );
    }

    // Route idempotent tools preferring cached servers
    if (tool.annotations.idempotentHint) {
      const cachedServers = this.config.categoryMapping["caching"] ?? [];
      const healthyCached = cachedServers.filter((s) =>
        this.isServerHealthy(s),
      );
      if (healthyCached.length > 0) {
        return healthyCached;
      }
    }

    return Array.from(this.availableServers).filter((s) =>
      this.isServerHealthy(s),
    );
  }

  /**
   * Route by required capabilities
   */
  routeByCapability(tool: MCPTool, requiredCapabilities: string[]): string[] {
    const matchingServers: string[] = [];

    for (const serverId of this.availableServers) {
      if (!this.isServerHealthy(serverId)) {
        continue;
      }

      // Check if server has all required capabilities
      let hasAll = true;
      for (const capability of requiredCapabilities) {
        const serversWithCapability =
          this.config.categoryMapping[capability] ?? [];
        if (!serversWithCapability.includes(serverId)) {
          hasAll = false;
          break;
        }
      }

      if (hasAll) {
        matchingServers.push(serverId);
      }
    }

    return matchingServers;
  }

  /**
   * Update server load for least-loaded routing
   */
  updateServerLoad(serverId: string, delta: number): void {
    const currentLoad = this.serverLoads.get(serverId) ?? 0;
    this.serverLoads.set(serverId, Math.max(0, currentLoad + delta));
  }

  /**
   * Update server health status
   */
  updateHealthStatus(serverId: string, healthy: boolean): void {
    const previousStatus = this.healthStatus.get(serverId);
    this.healthStatus.set(serverId, healthy);

    if (previousStatus !== healthy) {
      this.emit("healthUpdate", { serverId, healthy });
    }
  }

  /**
   * Set session/user affinity
   */
  setAffinity(key: string, serverId: string): void {
    this.affinityRules.set(key, {
      key,
      serverId,
      expiresAt: Date.now() + this.config.affinityTtl,
    });
    this.emit("affinitySet", { key, serverId });
  }

  /**
   * Clear affinity for a key
   */
  clearAffinity(key: string): void {
    this.affinityRules.delete(key);
  }

  /**
   * Get current routing statistics
   */
  getStats(): {
    availableServers: number;
    healthyServers: number;
    activeAffinities: number;
    serverLoads: Record<string, number>;
  } {
    const healthyCount = Array.from(this.healthStatus.values()).filter(
      (h) => h,
    ).length;

    return {
      availableServers: this.availableServers.size,
      healthyServers: healthyCount,
      activeAffinities: this.affinityRules.size,
      serverLoads: Object.fromEntries(this.serverLoads),
    };
  }

  // ==================== Private Methods ====================

  private getCandidateServers(tool: MCPTool): string[] {
    // If tool has a specific server, use only that
    if (tool.serverId && this.isServerHealthy(tool.serverId)) {
      return [tool.serverId];
    }

    // Check category mapping
    if (tool.category) {
      const categoryServers = this.routeByCategory(tool, tool.category);
      if (categoryServers.length > 0) {
        return categoryServers;
      }
    }

    // Check annotation-based routing
    const annotationServers = this.routeByAnnotation(tool);
    if (annotationServers.length > 0) {
      return annotationServers;
    }

    // Fall back to all healthy servers
    return Array.from(this.availableServers).filter((s) =>
      this.isServerHealthy(s),
    );
  }

  private applyStrategy(
    strategy: RoutingStrategy,
    tool: MCPTool,
    candidates: string[],
  ): RoutingDecision {
    switch (strategy) {
      case "round-robin":
        return this.roundRobinSelect(tool.name, candidates);

      case "least-loaded":
        return this.leastLoadedSelect(candidates);

      case "capability-based":
        return this.capabilityBasedSelect(tool, candidates);

      case "priority":
        return this.prioritySelect(candidates);

      case "random":
        return this.randomSelect(candidates);

      case "affinity":
        // Affinity is handled at the top of route(), fall back to round-robin
        return this.roundRobinSelect(tool.name, candidates);

      default:
        return this.roundRobinSelect(tool.name, candidates);
    }
  }

  private roundRobinSelect(
    toolName: string,
    candidates: string[],
  ): RoutingDecision {
    const key = `rr-${toolName}`;
    const currentIndex = this.roundRobinIndex.get(key) ?? 0;
    const selectedIndex = currentIndex % candidates.length;
    this.roundRobinIndex.set(key, currentIndex + 1);

    return {
      serverId: candidates[selectedIndex],
      strategy: "round-robin",
      confidence: 0.8,
      alternates: candidates.filter((_, i) => i !== selectedIndex),
      reason: `Round-robin selection (index ${selectedIndex})`,
    };
  }

  private leastLoadedSelect(candidates: string[]): RoutingDecision {
    let minLoad = Infinity;
    let selectedServer = candidates[0];

    for (const serverId of candidates) {
      const load = this.serverLoads.get(serverId) ?? 0;
      if (load < minLoad) {
        minLoad = load;
        selectedServer = serverId;
      }
    }

    return {
      serverId: selectedServer,
      strategy: "least-loaded",
      confidence: 0.9,
      alternates: candidates.filter((s) => s !== selectedServer),
      reason: `Least loaded server (load: ${minLoad})`,
    };
  }

  private capabilityBasedSelect(
    tool: MCPTool,
    candidates: string[],
  ): RoutingDecision {
    // Score each candidate based on capability match
    const scores: Array<{ serverId: string; score: number }> = [];

    for (const serverId of candidates) {
      let score = 1;

      // Check weight
      const weight = this.config.serverWeights.find(
        (sw) => sw.serverId === serverId,
      );
      if (weight) {
        score += weight.weight / 100;
      }

      // Check capability match
      if (tool.category) {
        const categoryServers = this.config.categoryMapping[tool.category];
        if (categoryServers?.includes(serverId)) {
          score += 0.5;
        }
      }

      scores.push({ serverId, score });
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    return {
      serverId: scores[0].serverId,
      strategy: "capability-based",
      confidence: Math.min(1, scores[0].score / 2),
      alternates: scores.slice(1).map((s) => s.serverId),
      reason: `Capability score: ${scores[0].score.toFixed(2)}`,
    };
  }

  private prioritySelect(candidates: string[]): RoutingDecision {
    // Sort by weight
    const weighted = candidates
      .map((serverId) => {
        const weight =
          this.config.serverWeights.find((sw) => sw.serverId === serverId)
            ?.weight ?? 50;
        return { serverId, weight };
      })
      .sort((a, b) => b.weight - a.weight);

    return {
      serverId: weighted[0].serverId,
      strategy: "priority",
      confidence: weighted[0].weight / 100,
      alternates: weighted.slice(1).map((w) => w.serverId),
      reason: `Priority weight: ${weighted[0].weight}`,
    };
  }

  private randomSelect(candidates: string[]): RoutingDecision {
    const randomIndex = Math.floor(Math.random() * candidates.length);

    return {
      serverId: candidates[randomIndex],
      strategy: "random",
      confidence: 0.5,
      alternates: candidates.filter((_, i) => i !== randomIndex),
      reason: "Random selection",
    };
  }

  private isServerHealthy(serverId: string): boolean {
    return (
      this.availableServers.has(serverId) &&
      (this.healthStatus.get(serverId) ?? false)
    );
  }
}

/**
 * Factory function to create a ToolRouter instance
 */
export const createToolRouter = (config: ToolRouterConfig): ToolRouter =>
  new ToolRouter(config);
