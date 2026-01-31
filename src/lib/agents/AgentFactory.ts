/**
 * Agent Factory Implementation
 *
 * AgentFactory provides factory methods for creating agents, networks, and
 * related components. It follows NeuroLink's BaseFactory pattern for
 * consistent creation patterns with lazy loading.
 */

import { BaseFactory } from "../core/infrastructure/baseFactory.js";
import { Agent } from "./Agent.js";
import { AgentNetwork } from "./AgentNetwork.js";
import { RoutingAgent } from "./RoutingAgent.js";
import type {
  AgentDefinition,
  AgentNetworkConfig,
  RouterConfig,
  AgentType,
} from "./types/agentTypes.js";
import { logger } from "../utils/logger.js";

// ============================================================================
// Factory Configuration Types
// ============================================================================

/**
 * Configuration for creating an agent via factory
 */
interface AgentCreationConfig {
  definition: AgentDefinition;
  sdk: unknown;
}

/**
 * Configuration for creating a network via factory
 */
interface _NetworkCreationConfig {
  config: AgentNetworkConfig;
  sdk: unknown;
}

// ============================================================================
// Agent Factory Class
// ============================================================================

/**
 * AgentFactory for creating agent instances
 *
 * @example
 * ```typescript
 * const factory = AgentFactory.getInstance();
 *
 * // Create an agent
 * const agent = await factory.createAgent({
 *   id: 'researcher',
 *   name: 'Research Agent',
 *   description: 'Searches and analyzes information',
 *   instructions: 'You are a research assistant.'
 * }, neurolink);
 *
 * // Create a network
 * const network = await factory.createNetwork({
 *   name: 'Research Network',
 *   agents: [agentDef1, agentDef2]
 * }, neurolink);
 * ```
 */
export class AgentFactory extends BaseFactory<Agent, AgentCreationConfig> {
  private static instance: AgentFactory | null = null;

  private constructor() {
    super();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AgentFactory {
    if (!AgentFactory.instance) {
      AgentFactory.instance = new AgentFactory();
    }
    return AgentFactory.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  static resetInstance(): void {
    if (AgentFactory.instance) {
      AgentFactory.instance.clear();
      AgentFactory.instance = null;
    }
  }

  /**
   * Register all agent types (called during initialization)
   */
  protected async registerAll(): Promise<void> {
    // Register standard agent factory
    this.register(
      "agent",
      async (config) => {
        if (!config?.definition || !config?.sdk) {
          throw new Error("Agent creation requires definition and sdk");
        }
        return new Agent(config.definition, config.sdk);
      },
      ["standard", "basic", "default"],
      { type: "agent", description: "Standard agent" },
    );

    // Register router agent factory (uses dynamic import for RoutingAgent)
    this.register(
      "router",
      async (config) => {
        if (!config?.definition || !config?.sdk) {
          throw new Error("Router agent creation requires definition and sdk");
        }
        // Router is created differently
        return new Agent(
          {
            ...config.definition,
            temperature: 0.3, // Lower temperature for routing
          },
          config.sdk,
        );
      },
      ["routing", "task-router"],
      { type: "router", description: "Task routing agent" },
    );

    logger.debug("[AgentFactory] Registered agent factories");
  }

  /**
   * Create an agent from definition
   */
  async createAgent(definition: AgentDefinition, sdk: unknown): Promise<Agent> {
    await this.ensureInitialized();

    logger.debug(`[AgentFactory] Creating agent: ${definition.name}`, {
      id: definition.id,
    });

    return new Agent(definition, sdk);
  }

  /**
   * Create multiple agents from definitions
   */
  async createAgents(
    definitions: AgentDefinition[],
    sdk: unknown,
  ): Promise<Agent[]> {
    return Promise.all(definitions.map((def) => this.createAgent(def, sdk)));
  }

  /**
   * Create an agent network
   */
  async createNetwork(
    config: AgentNetworkConfig,
    sdk: unknown,
  ): Promise<AgentNetwork> {
    await this.ensureInitialized();

    logger.debug(`[AgentFactory] Creating network: ${config.name}`, {
      agentCount: config.agents.length,
    });

    return new AgentNetwork(config, sdk);
  }

  /**
   * Create a routing agent
   */
  async createRoutingAgent(
    config: RouterConfig,
    sdk: unknown,
  ): Promise<RoutingAgent> {
    await this.ensureInitialized();

    logger.debug("[AgentFactory] Creating routing agent", {
      model: config.model,
    });

    return new RoutingAgent(config, sdk);
  }

  /**
   * Create an agent of a specific type
   */
  async createByType(
    type: AgentType,
    definition: AgentDefinition,
    sdk: unknown,
  ): Promise<Agent> {
    await this.ensureInitialized();

    const config: AgentCreationConfig = { definition, sdk };
    return this.create(type, config);
  }

  /**
   * Clone an agent with modifications
   */
  cloneAgent(agent: Agent, overrides: Partial<AgentDefinition>): Agent {
    return agent.clone(overrides);
  }

  /**
   * Create a simple agent from minimal configuration
   */
  async createSimpleAgent(
    id: string,
    name: string,
    instructions: string,
    sdk: unknown,
    options?: Partial<AgentDefinition>,
  ): Promise<Agent> {
    const definition: AgentDefinition = {
      id,
      name,
      description: options?.description ?? `Agent: ${name}`,
      instructions,
      ...options,
    };

    return this.createAgent(definition, sdk);
  }

  /**
   * Create a network from agent definitions with default configuration
   */
  async createSimpleNetwork(
    name: string,
    agents: AgentDefinition[],
    sdk: unknown,
    options?: Partial<AgentNetworkConfig>,
  ): Promise<AgentNetwork> {
    const config: AgentNetworkConfig = {
      name,
      agents,
      ...options,
    };

    return this.createNetwork(config, sdk);
  }

  /**
   * Validate an agent definition
   */
  validateDefinition(definition: AgentDefinition): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!definition.id) {
      errors.push("Agent ID is required");
    }

    if (!definition.name) {
      errors.push("Agent name is required");
    }

    if (!definition.description) {
      errors.push("Agent description is required");
    }

    if (!definition.instructions) {
      errors.push("Agent instructions are required");
    }

    if (
      definition.maxSteps !== undefined &&
      (definition.maxSteps < 1 || definition.maxSteps > 100)
    ) {
      errors.push("maxSteps must be between 1 and 100");
    }

    if (
      definition.temperature !== undefined &&
      (definition.temperature < 0 || definition.temperature > 2)
    ) {
      errors.push("temperature must be between 0 and 2");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate a network configuration
   */
  validateNetworkConfig(config: AgentNetworkConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.name) {
      errors.push("Network name is required");
    }

    if (!config.agents || config.agents.length === 0) {
      errors.push("At least one agent is required");
    }

    // Validate each agent definition
    for (const agentDef of config.agents) {
      const agentValidation = this.validateDefinition(agentDef);
      if (!agentValidation.valid) {
        errors.push(
          `Agent "${agentDef.id || agentDef.name || "unknown"}": ${agentValidation.errors.join(", ")}`,
        );
      }
    }

    // Check for duplicate agent IDs
    const agentIds = config.agents.map((a) => a.id);
    const duplicates = agentIds.filter(
      (id, index) => agentIds.indexOf(id) !== index,
    );
    if (duplicates.length > 0) {
      errors.push(`Duplicate agent IDs: ${duplicates.join(", ")}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * Get the AgentFactory singleton instance
 */
export function getAgentFactory(): AgentFactory {
  return AgentFactory.getInstance();
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create an agent using the factory
 */
export async function createAgent(
  definition: AgentDefinition,
  sdk: unknown,
): Promise<Agent> {
  return getAgentFactory().createAgent(definition, sdk);
}

/**
 * Create an agent network using the factory
 */
export async function createNetwork(
  config: AgentNetworkConfig,
  sdk: unknown,
): Promise<AgentNetwork> {
  return getAgentFactory().createNetwork(config, sdk);
}

/**
 * Create a routing agent using the factory
 */
export async function createRoutingAgent(
  config: RouterConfig,
  sdk: unknown,
): Promise<RoutingAgent> {
  return getAgentFactory().createRoutingAgent(config, sdk);
}
