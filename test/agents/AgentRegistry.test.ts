/**
 * AgentRegistry Class Tests
 *
 * Tests for the AgentRegistry class including:
 * - Singleton pattern
 * - Agent registration and retrieval
 * - Alias management
 * - Agent type registration
 * - Search and discovery
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  AgentRegistry,
  getAgentRegistry,
} from "../../src/lib/agents/AgentRegistry.js";
import type { AgentDefinition } from "../../src/lib/agents/types/agentTypes.js";

// ============================================================================
// Mock SDK
// ============================================================================

function createMockSdk() {
  return {
    generate: vi.fn().mockResolvedValue({ content: "Mock response" }),
    stream: vi.fn().mockImplementation(async function* () {
      yield { content: "Mock " };
      yield { content: "stream" };
    }),
  };
}

// ============================================================================
// Test Fixtures
// ============================================================================

const testAgentDefinition: AgentDefinition = {
  id: "test-agent",
  name: "Test Agent",
  description: "A test agent for unit testing",
  instructions: "You are a helpful test assistant.",
};

const researcherDefinition: AgentDefinition = {
  id: "researcher",
  name: "Research Agent",
  description: "Searches and analyzes information",
  instructions: "You are a research assistant.",
  tools: ["websearchGrounding"],
};

const writerDefinition: AgentDefinition = {
  id: "writer",
  name: "Content Writer",
  description: "Creates written content and articles",
  instructions: "You are a content writer.",
  temperature: 0.8,
};

// ============================================================================
// Tests
// ============================================================================

describe("AgentRegistry", () => {
  let mockSdk: ReturnType<typeof createMockSdk>;

  beforeEach(() => {
    mockSdk = createMockSdk();
    // Reset singleton before each test
    AgentRegistry.resetInstance();
  });

  afterEach(() => {
    vi.clearAllMocks();
    AgentRegistry.resetInstance();
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance", () => {
      const instance1 = AgentRegistry.getInstance();
      const instance2 = AgentRegistry.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should return instance via getAgentRegistry()", () => {
      const instance1 = AgentRegistry.getInstance();
      const instance2 = getAgentRegistry();

      expect(instance1).toBe(instance2);
    });

    it("should create new instance after reset", () => {
      const instance1 = AgentRegistry.getInstance();
      AgentRegistry.resetInstance();
      const instance2 = AgentRegistry.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe("Agent Registration", () => {
    it("should register an agent", () => {
      const registry = AgentRegistry.getInstance();

      registry.registerAgent(testAgentDefinition);

      expect(registry.hasAgent("test-agent")).toBe(true);
    });

    it("should register agent with aliases", () => {
      const registry = AgentRegistry.getInstance();

      registry.registerAgent(testAgentDefinition, ["test", "helper"]);

      expect(registry.hasAgent("test-agent")).toBe(true);
      expect(registry.hasAgent("test")).toBe(true);
      expect(registry.hasAgent("helper")).toBe(true);
    });

    it("should resolve aliases case-insensitively", () => {
      const registry = AgentRegistry.getInstance();

      registry.registerAgent(testAgentDefinition, ["Test", "HELPER"]);

      expect(registry.resolveAlias("test")).toBe("test-agent");
      expect(registry.resolveAlias("TEST")).toBe("test-agent");
      expect(registry.resolveAlias("Helper")).toBe("test-agent");
    });

    it("should return original ID if no alias found", () => {
      const registry = AgentRegistry.getInstance();

      const resolved = registry.resolveAlias("unknown-agent");

      expect(resolved).toBe("unknown-agent");
    });
  });

  describe("Agent Retrieval", () => {
    it("should get agent by ID", async () => {
      const registry = AgentRegistry.getInstance();
      registry.registerAgent(testAgentDefinition);

      const agent = await registry.getAgent("test-agent", mockSdk);

      expect(agent).toBeDefined();
      expect(agent?.id).toBe("test-agent");
      expect(agent?.name).toBe("Test Agent");
    });

    it("should get agent by alias", async () => {
      const registry = AgentRegistry.getInstance();
      registry.registerAgent(testAgentDefinition, ["helper"]);

      const agent = await registry.getAgent("helper", mockSdk);

      expect(agent).toBeDefined();
      expect(agent?.id).toBe("test-agent");
    });

    it("should return undefined for unknown agent", async () => {
      const registry = AgentRegistry.getInstance();

      const agent = await registry.getAgent("unknown", mockSdk);

      expect(agent).toBeUndefined();
    });

    it("should return same instance for same SDK", async () => {
      const registry = AgentRegistry.getInstance();
      registry.registerAgent(testAgentDefinition);

      const agent1 = await registry.getAgent("test-agent", mockSdk);
      const agent2 = await registry.getAgent("test-agent", mockSdk);

      expect(agent1).toBe(agent2);
    });

    it("should return different instances for different SDKs", async () => {
      const registry = AgentRegistry.getInstance();
      registry.registerAgent(testAgentDefinition);

      const sdk1 = createMockSdk();
      const sdk2 = createMockSdk();

      const agent1 = await registry.getAgent("test-agent", sdk1);
      const agent2 = await registry.getAgent("test-agent", sdk2);

      expect(agent1).not.toBe(agent2);
      expect(agent1?.id).toBe(agent2?.id);
    });
  });

  describe("Agent Definition", () => {
    it("should get agent definition by ID", () => {
      const registry = AgentRegistry.getInstance();
      registry.registerAgent(testAgentDefinition);

      const definition = registry.getAgentDefinition("test-agent");

      expect(definition).toEqual(testAgentDefinition);
    });

    it("should get agent definition by alias", () => {
      const registry = AgentRegistry.getInstance();
      registry.registerAgent(testAgentDefinition, ["helper"]);

      const definition = registry.getAgentDefinition("helper");

      expect(definition).toEqual(testAgentDefinition);
    });

    it("should return undefined for unknown agent definition", () => {
      const registry = AgentRegistry.getInstance();

      const definition = registry.getAgentDefinition("unknown");

      expect(definition).toBeUndefined();
    });
  });

  describe("Listing Agents", () => {
    it("should list all registered agents", () => {
      const registry = AgentRegistry.getInstance();
      registry.registerAgent(researcherDefinition);
      registry.registerAgent(writerDefinition);

      const agents = registry.listAgents();

      expect(agents.length).toBe(2);
      expect(agents.find((a) => a.id === "researcher")).toBeDefined();
      expect(agents.find((a) => a.id === "writer")).toBeDefined();
    });

    it("should list agents with basic info only", () => {
      const registry = AgentRegistry.getInstance();
      registry.registerAgent(researcherDefinition);

      const agents = registry.listAgents();

      expect(agents[0]).toEqual({
        id: "researcher",
        name: "Research Agent",
        description: "Searches and analyzes information",
      });
    });

    it("should list agents by capability", () => {
      const registry = AgentRegistry.getInstance();
      registry.registerAgent(researcherDefinition);
      registry.registerAgent(writerDefinition);

      const researchAgents = registry.listAgentsByCapability("search");

      expect(researchAgents.length).toBe(1);
      expect(researchAgents[0].id).toBe("researcher");
    });
  });

  describe("Finding Agents", () => {
    it("should find agents by ID", () => {
      const registry = AgentRegistry.getInstance();
      registry.registerAgent(researcherDefinition);
      registry.registerAgent(writerDefinition);

      const found = registry.findAgents("researcher");

      expect(found.length).toBe(1);
      expect(found[0].id).toBe("researcher");
    });

    it("should find agents by name", () => {
      const registry = AgentRegistry.getInstance();
      registry.registerAgent(researcherDefinition);
      registry.registerAgent(writerDefinition);

      const found = registry.findAgents("Research");

      expect(found.length).toBe(1);
      expect(found[0].id).toBe("researcher");
    });

    it("should find agents by description", () => {
      const registry = AgentRegistry.getInstance();
      registry.registerAgent(researcherDefinition);
      registry.registerAgent(writerDefinition);

      const found = registry.findAgents("written content");

      expect(found.length).toBe(1);
      expect(found[0].id).toBe("writer");
    });

    it("should find multiple matching agents", () => {
      const registry = AgentRegistry.getInstance();
      registry.registerAgent(researcherDefinition);
      registry.registerAgent(writerDefinition);

      const found = registry.findAgents("agent");

      expect(found.length).toBe(2);
    });

    it("should return empty array for no matches", () => {
      const registry = AgentRegistry.getInstance();
      registry.registerAgent(researcherDefinition);

      const found = registry.findAgents("nonexistent");

      expect(found.length).toBe(0);
    });
  });

  describe("Unregistering Agents", () => {
    it("should unregister an agent", () => {
      const registry = AgentRegistry.getInstance();
      registry.registerAgent(testAgentDefinition);

      const removed = registry.unregisterAgent("test-agent");

      expect(removed).toBe(true);
      expect(registry.hasAgent("test-agent")).toBe(false);
    });

    it("should unregister agent by alias", () => {
      const registry = AgentRegistry.getInstance();
      registry.registerAgent(testAgentDefinition, ["helper"]);

      const removed = registry.unregisterAgent("helper");

      expect(removed).toBe(true);
      expect(registry.hasAgent("test-agent")).toBe(false);
      expect(registry.hasAgent("helper")).toBe(false);
    });

    it("should return false for unknown agent", () => {
      const registry = AgentRegistry.getInstance();

      const removed = registry.unregisterAgent("unknown");

      expect(removed).toBe(false);
    });

    it("should remove all aliases when unregistering", () => {
      const registry = AgentRegistry.getInstance();
      registry.registerAgent(testAgentDefinition, ["test", "helper"]);

      registry.unregisterAgent("test-agent");

      expect(registry.resolveAlias("test")).toBe("test");
      expect(registry.resolveAlias("helper")).toBe("helper");
    });
  });

  describe("Agent Types", () => {
    it("should register agent types on initialization", async () => {
      const registry = AgentRegistry.getInstance();
      // Force initialization
      await registry.getAgent("nonexistent", mockSdk);

      const types = registry.listAgentTypes();

      expect(types).toContain("agent");
      expect(types).toContain("router");
      expect(types).toContain("supervisor");
      expect(types).toContain("coordinator");
    });

    it("should get agent type metadata", async () => {
      const registry = AgentRegistry.getInstance();
      await registry.getAgent("nonexistent", mockSdk);

      const metadata = registry.getAgentTypeMetadata("router");

      expect(metadata).toBeDefined();
      expect(metadata?.type).toBe("router");
      expect(metadata?.capabilities).toContain("routing");
    });
  });

  describe("Batch Operations", () => {
    it("should create multiple agents from definitions", async () => {
      const registry = AgentRegistry.getInstance();
      const definitions = [researcherDefinition, writerDefinition];

      const agents = await registry.createAgents(definitions, mockSdk);

      expect(agents.length).toBe(2);
      expect(agents[0].id).toBe("researcher");
      expect(agents[1].id).toBe("writer");
    });

    it("should register agents during batch creation", async () => {
      const registry = AgentRegistry.getInstance();
      const definitions = [researcherDefinition, writerDefinition];

      await registry.createAgents(definitions, mockSdk);

      expect(registry.hasAgent("researcher")).toBe(true);
      expect(registry.hasAgent("writer")).toBe(true);
    });
  });

  describe("Clear", () => {
    it("should clear all registrations", async () => {
      const registry = AgentRegistry.getInstance();
      registry.registerAgent(researcherDefinition, ["research"]);
      registry.registerAgent(writerDefinition);

      registry.clear();

      expect(registry.hasAgent("researcher")).toBe(false);
      expect(registry.hasAgent("writer")).toBe(false);
      expect(registry.hasAgent("research")).toBe(false);
      expect(registry.listAgents().length).toBe(0);
    });
  });
});
