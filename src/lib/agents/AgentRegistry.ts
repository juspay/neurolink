/**
 * Agent Registry Implementation
 *
 * AgentRegistry provides a centralized registry for managing agent types
 * and their metadata. It follows NeuroLink's BaseRegistry pattern for
 * consistent registration and discovery.
 */

import { BaseRegistry } from "../core/infrastructure/baseRegistry.js";
import type {
  AgentType,
  AgentRegistryMetadata,
  AgentDefinition,
} from "./types/agentTypes.js";
import { Agent } from "./Agent.js";
import { logger } from "../utils/logger.js";

// ============================================================================
// Agent Registry Types
// ============================================================================

/**
 * Registered agent entry
 */
interface _RegisteredAgent {
  definition: AgentDefinition;
  instance?: Agent;
}

// ============================================================================
// Agent Registry Class
// ============================================================================

/**
 * AgentRegistry for managing agent types and instances
 *
 * @example
 * ```typescript
 * const registry = AgentRegistry.getInstance();
 *
 * // Register an agent
 * registry.registerAgent({
 *   id: 'researcher',
 *   name: 'Research Agent',
 *   description: 'Searches and analyzes information',
 *   instructions: 'You are a research assistant.'
 * });
 *
 * // Get agent by ID
 * const agent = await registry.getAgent('researcher', neurolink);
 * ```
 */
export class AgentRegistry extends BaseRegistry<Agent, AgentRegistryMetadata> {
  private static instance: AgentRegistry | null = null;
  private agentDefinitions: Map<string, AgentDefinition> = new Map();
  private agentInstances: Map<string, Map<unknown, Agent>> = new Map(); // Per-SDK instances
  private aliasMap: Map<string, string> = new Map();

  private constructor() {
    super();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  static resetInstance(): void {
    if (AgentRegistry.instance) {
      AgentRegistry.instance.clear();
      AgentRegistry.instance = null;
    }
  }

  /**
   * Register all default agent types (called during initialization)
   */
  protected async registerAll(): Promise<void> {
    // Register built-in agent types
    this.registerAgentType("agent", {
      type: "agent",
      description: "Standard agent with execution and streaming capabilities",
      capabilities: ["execute", "stream", "tools"],
      defaultModel: "gpt-4o-mini",
    });

    this.registerAgentType("router", {
      type: "router",
      description: "Routing agent for task analysis and delegation",
      capabilities: ["routing", "analysis"],
      defaultModel: "gpt-4o",
    });

    this.registerAgentType("supervisor", {
      type: "supervisor",
      description: "Supervisor agent for oversight and approval",
      capabilities: ["oversight", "approval", "hitl"],
      defaultModel: "gpt-4o",
    });

    this.registerAgentType("coordinator", {
      type: "coordinator",
      description: "Coordinator agent for multi-agent orchestration",
      capabilities: ["coordination", "scheduling", "load-balancing"],
      defaultModel: "gpt-4o",
    });

    logger.debug("[AgentRegistry] Registered default agent types");
  }

  /**
   * Register an agent type
   */
  registerAgentType(type: AgentType, metadata: AgentRegistryMetadata): void {
    this.register(
      type,
      async () => {
        throw new Error(
          `Cannot create agent from type alone. Use registerAgent() and getAgent().`,
        );
      },
      metadata,
    );
  }

  /**
   * Register an agent definition
   */
  registerAgent(definition: AgentDefinition, aliases: string[] = []): void {
    this.agentDefinitions.set(definition.id, definition);

    // Register aliases
    for (const alias of aliases) {
      this.aliasMap.set(alias.toLowerCase(), definition.id);
    }

    logger.debug(
      `[AgentRegistry] Registered agent: ${definition.name} (${definition.id})`,
      { aliases },
    );
  }

  /**
   * Get an agent instance by ID
   */
  async getAgent(id: string, sdk: unknown): Promise<Agent | undefined> {
    await this.ensureInitialized();

    // Resolve alias
    const resolvedId = this.resolveAlias(id);
    const definition = this.agentDefinitions.get(resolvedId);

    if (!definition) {
      return undefined;
    }

    // Check for existing instance for this SDK
    let sdkInstances = this.agentInstances.get(resolvedId);
    if (!sdkInstances) {
      sdkInstances = new Map();
      this.agentInstances.set(resolvedId, sdkInstances);
    }

    // Return existing instance if available
    if (sdkInstances.has(sdk)) {
      return sdkInstances.get(sdk);
    }

    // Create new instance
    const agent = new Agent(definition, sdk);
    sdkInstances.set(sdk, agent);

    return agent;
  }

  /**
   * Get agent definition by ID
   */
  getAgentDefinition(id: string): AgentDefinition | undefined {
    const resolvedId = this.resolveAlias(id);
    return this.agentDefinitions.get(resolvedId);
  }

  /**
   * Check if an agent is registered
   */
  hasAgent(id: string): boolean {
    const resolvedId = this.resolveAlias(id);
    return this.agentDefinitions.has(resolvedId);
  }

  /**
   * Resolve an alias to an agent ID
   */
  resolveAlias(idOrAlias: string): string {
    return this.aliasMap.get(idOrAlias.toLowerCase()) || idOrAlias;
  }

  /**
   * List all registered agents
   */
  listAgents(): Array<{ id: string; name: string; description: string }> {
    return Array.from(this.agentDefinitions.values()).map((def) => ({
      id: def.id,
      name: def.name,
      description: def.description,
    }));
  }

  /**
   * List agents by capability
   */
  listAgentsByCapability(capability: string): AgentDefinition[] {
    return Array.from(this.agentDefinitions.values()).filter((def) => {
      // Check if description mentions the capability
      return def.description.toLowerCase().includes(capability.toLowerCase());
    });
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(id: string): boolean {
    const resolvedId = this.resolveAlias(id);
    const removed = this.agentDefinitions.delete(resolvedId);

    if (removed) {
      // Remove instances
      this.agentInstances.delete(resolvedId);

      // Remove aliases
      for (const [alias, agentId] of this.aliasMap.entries()) {
        if (agentId === resolvedId) {
          this.aliasMap.delete(alias);
        }
      }

      logger.debug(`[AgentRegistry] Unregistered agent: ${id}`);
    }

    return removed;
  }

  /**
   * Clear all registrations
   */
  override clear(): void {
    super.clear();
    this.agentDefinitions.clear();
    this.agentInstances.clear();
    this.aliasMap.clear();
  }

  /**
   * Get agent type metadata
   */
  getAgentTypeMetadata(type: AgentType): AgentRegistryMetadata | undefined {
    const entry = this.items.get(type);
    return entry?.metadata;
  }

  /**
   * List all agent types
   */
  listAgentTypes(): AgentType[] {
    return Array.from(this.items.keys()) as AgentType[];
  }

  /**
   * Create multiple agents from definitions
   */
  async createAgents(
    definitions: AgentDefinition[],
    sdk: unknown,
  ): Promise<Agent[]> {
    const agents: Agent[] = [];

    for (const definition of definitions) {
      this.registerAgent(definition);
      const agent = await this.getAgent(definition.id, sdk);
      if (agent) {
        agents.push(agent);
      }
    }

    return agents;
  }

  /**
   * Find agents matching a query
   */
  findAgents(query: string): AgentDefinition[] {
    const queryLower = query.toLowerCase();

    return Array.from(this.agentDefinitions.values()).filter((def) => {
      return (
        def.id.toLowerCase().includes(queryLower) ||
        def.name.toLowerCase().includes(queryLower) ||
        def.description.toLowerCase().includes(queryLower)
      );
    });
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * Get the AgentRegistry singleton instance
 */
export function getAgentRegistry(): AgentRegistry {
  return AgentRegistry.getInstance();
}
