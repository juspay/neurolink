/**
 * AgentFactory Class Tests
 *
 * Tests for the AgentFactory class including:
 * - Singleton pattern
 * - Agent creation
 * - Network creation
 * - Routing agent creation
 * - Validation methods
 * - Convenience functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  AgentFactory,
  getAgentFactory,
  createAgent,
  createNetwork,
  createRoutingAgent,
} from "../../src/lib/agents/AgentFactory.js";
import type {
  AgentDefinition,
  AgentNetworkConfig,
  RouterConfig,
} from "../../src/lib/agents/types/agentTypes.js";

// ============================================================================
// Mock SDK
// ============================================================================

function createMockSdk() {
  return {
    generate: vi.fn().mockResolvedValue({
      content: "Mock response",
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    }),
    stream: vi.fn().mockImplementation(async function* () {
      yield { content: "Mock " };
      yield { content: "stream" };
    }),
  };
}

// ============================================================================
// Test Fixtures
// ============================================================================

const validAgentDefinition: AgentDefinition = {
  id: "test-agent",
  name: "Test Agent",
  description: "A test agent for unit testing",
  instructions: "You are a helpful test assistant.",
};

const validNetworkConfig: AgentNetworkConfig = {
  name: "Test Network",
  agents: [
    {
      id: "agent-1",
      name: "Agent 1",
      description: "First test agent",
      instructions: "You are agent 1.",
    },
    {
      id: "agent-2",
      name: "Agent 2",
      description: "Second test agent",
      instructions: "You are agent 2.",
    },
  ],
};

const validRouterConfig: RouterConfig = {
  model: "gpt-4o",
  confidenceThreshold: 0.7,
};

// ============================================================================
// Tests
// ============================================================================

describe("AgentFactory", () => {
  let mockSdk: ReturnType<typeof createMockSdk>;

  beforeEach(() => {
    mockSdk = createMockSdk();
    AgentFactory.resetInstance();
  });

  afterEach(() => {
    vi.clearAllMocks();
    AgentFactory.resetInstance();
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance", () => {
      const instance1 = AgentFactory.getInstance();
      const instance2 = AgentFactory.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should return instance via getAgentFactory()", () => {
      const instance1 = AgentFactory.getInstance();
      const instance2 = getAgentFactory();

      expect(instance1).toBe(instance2);
    });

    it("should create new instance after reset", () => {
      const instance1 = AgentFactory.getInstance();
      AgentFactory.resetInstance();
      const instance2 = AgentFactory.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe("createAgent", () => {
    it("should create an agent from definition", async () => {
      const factory = AgentFactory.getInstance();

      const agent = await factory.createAgent(validAgentDefinition, mockSdk);

      expect(agent.id).toBe("test-agent");
      expect(agent.name).toBe("Test Agent");
      expect(agent.description).toBe("A test agent for unit testing");
    });

    it("should create agent with full definition", async () => {
      const factory = AgentFactory.getInstance();
      const fullDefinition: AgentDefinition = {
        ...validAgentDefinition,
        provider: "openai",
        model: "gpt-4o-mini",
        tools: ["readFile", "writeFile"],
        maxSteps: 5,
        temperature: 0.5,
        canDelegate: true,
      };

      const agent = await factory.createAgent(fullDefinition, mockSdk);

      expect(agent.provider).toBe("openai");
      expect(agent.model).toBe("gpt-4o-mini");
      expect(agent.tools).toEqual(["readFile", "writeFile"]);
      expect(agent.maxSteps).toBe(5);
      expect(agent.temperature).toBe(0.5);
      expect(agent.canDelegate).toBe(true);
    });
  });

  describe("createAgents", () => {
    it("should create multiple agents", async () => {
      const factory = AgentFactory.getInstance();
      const definitions: AgentDefinition[] = [
        {
          id: "agent-1",
          name: "Agent 1",
          description: "First agent",
          instructions: "You are agent 1.",
        },
        {
          id: "agent-2",
          name: "Agent 2",
          description: "Second agent",
          instructions: "You are agent 2.",
        },
      ];

      const agents = await factory.createAgents(definitions, mockSdk);

      expect(agents.length).toBe(2);
      expect(agents[0].id).toBe("agent-1");
      expect(agents[1].id).toBe("agent-2");
    });

    it("should return empty array for empty definitions", async () => {
      const factory = AgentFactory.getInstance();

      const agents = await factory.createAgents([], mockSdk);

      expect(agents.length).toBe(0);
    });
  });

  describe("createNetwork", () => {
    it("should create a network from config", async () => {
      const factory = AgentFactory.getInstance();

      const network = await factory.createNetwork(validNetworkConfig, mockSdk);

      expect(network.name).toBe("Test Network");
    });

    it("should create network with full config", async () => {
      const factory = AgentFactory.getInstance();
      const fullConfig: AgentNetworkConfig = {
        ...validNetworkConfig,
        id: "test-network-1",
        description: "A test network",
        router: {
          model: "gpt-4o",
          confidenceThreshold: 0.8,
        },
        defaults: {
          maxSteps: 5,
          timeout: 30000,
        },
      };

      const network = await factory.createNetwork(fullConfig, mockSdk);

      expect(network.id).toBe("test-network-1");
      expect(network.description).toBe("A test network");
    });
  });

  describe("createRoutingAgent", () => {
    it("should create a routing agent", async () => {
      const factory = AgentFactory.getInstance();

      const router = await factory.createRoutingAgent(
        validRouterConfig,
        mockSdk,
      );

      const config = router.getConfig();
      expect(config.model).toBe("gpt-4o");
      expect(config.confidenceThreshold).toBe(0.7);
    });

    it("should create routing agent with full config", async () => {
      const factory = AgentFactory.getInstance();
      const fullConfig: RouterConfig = {
        model: "gpt-4o",
        provider: "openai",
        confidenceThreshold: 0.8,
        fallbackAgentId: "default-agent",
        maxAttempts: 5,
      };

      const router = await factory.createRoutingAgent(fullConfig, mockSdk);

      const config = router.getConfig();
      expect(config.fallbackAgentId).toBe("default-agent");
      expect(config.maxAttempts).toBe(5);
    });
  });

  describe("createByType", () => {
    it("should create agent by type", async () => {
      const factory = AgentFactory.getInstance();

      const agent = await factory.createByType(
        "agent",
        validAgentDefinition,
        mockSdk,
      );

      expect(agent.id).toBe("test-agent");
    });

    it("should create router agent by type", async () => {
      const factory = AgentFactory.getInstance();
      const routerDef: AgentDefinition = {
        ...validAgentDefinition,
        id: "router-agent",
      };

      const agent = await factory.createByType("router", routerDef, mockSdk);

      expect(agent.id).toBe("router-agent");
      expect(agent.temperature).toBe(0.3); // Router uses lower temperature
    });
  });

  describe("cloneAgent", () => {
    it("should clone an agent with overrides", async () => {
      const factory = AgentFactory.getInstance();
      const original = await factory.createAgent(validAgentDefinition, mockSdk);

      const clone = factory.cloneAgent(original, {
        name: "Cloned Agent",
        temperature: 0.9,
      });

      expect(clone.id).not.toBe(original.id);
      expect(clone.name).toBe("Cloned Agent");
      expect(clone.temperature).toBe(0.9);
      expect(clone.description).toBe(original.description);
    });
  });

  describe("createSimpleAgent", () => {
    it("should create agent with minimal params", async () => {
      const factory = AgentFactory.getInstance();

      const agent = await factory.createSimpleAgent(
        "simple-agent",
        "Simple Agent",
        "You are a simple assistant.",
        mockSdk,
      );

      expect(agent.id).toBe("simple-agent");
      expect(agent.name).toBe("Simple Agent");
      expect(agent.description).toBe("Agent: Simple Agent");
    });

    it("should create agent with options", async () => {
      const factory = AgentFactory.getInstance();

      const agent = await factory.createSimpleAgent(
        "simple-agent",
        "Simple Agent",
        "You are a simple assistant.",
        mockSdk,
        {
          description: "Custom description",
          temperature: 0.5,
          tools: ["readFile"],
        },
      );

      expect(agent.description).toBe("Custom description");
      expect(agent.temperature).toBe(0.5);
      expect(agent.tools).toEqual(["readFile"]);
    });
  });

  describe("createSimpleNetwork", () => {
    it("should create network with minimal params", async () => {
      const factory = AgentFactory.getInstance();
      const agents = validNetworkConfig.agents;

      const network = await factory.createSimpleNetwork(
        "Simple Network",
        agents,
        mockSdk,
      );

      expect(network.name).toBe("Simple Network");
    });

    it("should create network with options", async () => {
      const factory = AgentFactory.getInstance();
      const agents = validNetworkConfig.agents;

      const network = await factory.createSimpleNetwork(
        "Simple Network",
        agents,
        mockSdk,
        {
          description: "A simple network",
          router: { model: "gpt-4o" },
        },
      );

      expect(network.description).toBe("A simple network");
    });
  });

  describe("validateDefinition", () => {
    it("should validate valid definition", () => {
      const factory = AgentFactory.getInstance();

      const result = factory.validateDefinition(validAgentDefinition);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("should reject missing id", () => {
      const factory = AgentFactory.getInstance();
      const invalid = { ...validAgentDefinition, id: "" };

      const result = factory.validateDefinition(invalid);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Agent ID is required");
    });

    it("should reject missing name", () => {
      const factory = AgentFactory.getInstance();
      const invalid = { ...validAgentDefinition, name: "" };

      const result = factory.validateDefinition(invalid);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Agent name is required");
    });

    it("should reject missing description", () => {
      const factory = AgentFactory.getInstance();
      const invalid = { ...validAgentDefinition, description: "" };

      const result = factory.validateDefinition(invalid);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Agent description is required");
    });

    it("should reject missing instructions", () => {
      const factory = AgentFactory.getInstance();
      const invalid = { ...validAgentDefinition, instructions: "" };

      const result = factory.validateDefinition(invalid);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Agent instructions are required");
    });

    it("should reject invalid maxSteps", () => {
      const factory = AgentFactory.getInstance();
      const invalid = { ...validAgentDefinition, maxSteps: 0 };

      const result = factory.validateDefinition(invalid);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("maxSteps must be between 1 and 100");
    });

    it("should reject maxSteps over 100", () => {
      const factory = AgentFactory.getInstance();
      const invalid = { ...validAgentDefinition, maxSteps: 101 };

      const result = factory.validateDefinition(invalid);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("maxSteps must be between 1 and 100");
    });

    it("should reject negative temperature", () => {
      const factory = AgentFactory.getInstance();
      const invalid = { ...validAgentDefinition, temperature: -0.1 };

      const result = factory.validateDefinition(invalid);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("temperature must be between 0 and 2");
    });

    it("should reject temperature over 2", () => {
      const factory = AgentFactory.getInstance();
      const invalid = { ...validAgentDefinition, temperature: 2.1 };

      const result = factory.validateDefinition(invalid);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("temperature must be between 0 and 2");
    });

    it("should collect multiple errors", () => {
      const factory = AgentFactory.getInstance();
      const invalid = {
        id: "",
        name: "",
        description: "",
        instructions: "",
        maxSteps: 0,
        temperature: -1,
      };

      const result = factory.validateDefinition(invalid);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(4);
    });
  });

  describe("validateNetworkConfig", () => {
    it("should validate valid network config", () => {
      const factory = AgentFactory.getInstance();

      const result = factory.validateNetworkConfig(validNetworkConfig);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("should reject missing name", () => {
      const factory = AgentFactory.getInstance();
      const invalid = { ...validNetworkConfig, name: "" };

      const result = factory.validateNetworkConfig(invalid);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Network name is required");
    });

    it("should reject empty agents array", () => {
      const factory = AgentFactory.getInstance();
      const invalid = { ...validNetworkConfig, agents: [] };

      const result = factory.validateNetworkConfig(invalid);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("At least one agent is required");
    });

    it("should validate agent definitions within network", () => {
      const factory = AgentFactory.getInstance();
      const invalid: AgentNetworkConfig = {
        name: "Invalid Network",
        agents: [
          {
            id: "agent-1",
            name: "",
            description: "Agent 1",
            instructions: "Instructions",
          },
        ],
      };

      const result = factory.validateNetworkConfig(invalid);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes("Agent name is required")),
      ).toBe(true);
    });

    it("should detect duplicate agent IDs", () => {
      const factory = AgentFactory.getInstance();
      const invalid: AgentNetworkConfig = {
        name: "Duplicate Network",
        agents: [
          {
            id: "agent-1",
            name: "Agent 1",
            description: "First agent",
            instructions: "Instructions",
          },
          {
            id: "agent-1",
            name: "Agent 1 Duplicate",
            description: "Duplicate agent",
            instructions: "Instructions",
          },
        ],
      };

      const result = factory.validateNetworkConfig(invalid);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Duplicate agent IDs"))).toBe(
        true,
      );
    });
  });

  describe("Convenience Functions", () => {
    it("createAgent should use factory", async () => {
      const agent = await createAgent(validAgentDefinition, mockSdk);

      expect(agent.id).toBe("test-agent");
    });

    it("createNetwork should use factory", async () => {
      const network = await createNetwork(validNetworkConfig, mockSdk);

      expect(network.name).toBe("Test Network");
    });

    it("createRoutingAgent should use factory", async () => {
      const router = await createRoutingAgent(validRouterConfig, mockSdk);

      const config = router.getConfig();
      expect(config.model).toBe("gpt-4o");
    });
  });
});
