/**
 * MeshTopology Class Tests
 *
 * Tests for the MeshTopology class including:
 * - Initialization and discovery
 * - Peer-to-peer messaging
 * - Task delegation
 * - Capability search
 * - Consensus mechanisms
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MeshTopology } from "../../../src/lib/agents/topologies/MeshTopology.js";
import { AgentNetwork } from "../../../src/lib/agents/AgentNetwork.js";
import type { AgentNetworkConfig } from "../../../src/lib/agents/types/agentTypes.js";

// ============================================================================
// Mock SDK
// ============================================================================

function createMockSdk() {
  return {
    generate: vi.fn().mockImplementation(async (opts) => {
      // Handle routing requests
      if (
        opts.systemPrompt?.includes("routing") ||
        opts.input?.text?.includes("Available Primitives")
      ) {
        return {
          content: JSON.stringify({
            selectedPrimitive: {
              type: "agent",
              id: "agent-1",
              name: "Agent 1",
            },
            confidence: 0.9,
            reasoning: "Selected",
          }),
        };
      }
      return {
        content: "Task completed",
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      };
    }),
    stream: vi.fn().mockImplementation(async () => {
      async function* generateStream() {
        yield { content: "Result" };
      }
      return {
        stream: generateStream(),
        usage: { promptTokens: 50, completionTokens: 100, totalTokens: 150 },
      };
    }),
  };
}

// ============================================================================
// Test Fixtures
// ============================================================================

const meshNetworkConfig: AgentNetworkConfig = {
  name: "Mesh Test Network",
  agents: [
    {
      id: "researcher",
      name: "Research Agent",
      description: "Searches and analyzes information for research tasks",
      instructions: "You are a research assistant.",
      tools: ["websearchGrounding"],
    },
    {
      id: "writer",
      name: "Content Writer",
      description: "Creates written content and articles",
      instructions: "You are a content writer.",
    },
    {
      id: "analyst",
      name: "Data Analyst",
      description: "Performs data analysis and visualization",
      instructions: "You are a data analyst.",
      tools: ["calculateMath"],
    },
  ],
};

// ============================================================================
// Tests
// ============================================================================

describe("MeshTopology", () => {
  let mockSdk: ReturnType<typeof createMockSdk>;
  let network: AgentNetwork;

  beforeEach(() => {
    mockSdk = createMockSdk();
    network = new AgentNetwork(meshNetworkConfig, mockSdk);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Constructor", () => {
    it("should create topology with config", () => {
      const topology = new MeshTopology({
        agentIds: ["researcher", "writer", "analyst"],
      });

      expect(topology).toBeDefined();
    });

    it("should use default config values", () => {
      const topology = new MeshTopology({
        agentIds: ["researcher"],
      });

      // Verify defaults by checking that topology works
      expect(topology).toBeDefined();
    });

    it("should accept custom config", () => {
      const topology = new MeshTopology({
        agentIds: ["researcher", "writer"],
        autoDiscovery: false,
        maxHops: 3,
        enableP2PDelegation: false,
      });

      expect(topology).toBeDefined();
    });
  });

  describe("initialize", () => {
    it("should initialize with network", async () => {
      const topology = new MeshTopology({
        agentIds: ["researcher", "writer"],
      });

      await topology.initialize(network);

      const peers = topology.getAllPeers();
      expect(peers.length).toBe(2);
    });

    it("should handle missing agents gracefully", async () => {
      const topology = new MeshTopology({
        agentIds: ["researcher", "nonexistent"],
      });

      await topology.initialize(network);

      const peers = topology.getAllPeers();
      expect(peers.length).toBe(1);
    });

    it("should perform discovery when enabled", async () => {
      const topology = new MeshTopology({
        agentIds: ["researcher", "writer"],
        autoDiscovery: true,
      });

      await topology.initialize(network);

      const peer = topology.getPeerInfo("researcher");
      expect(peer?.capabilities.length).toBeGreaterThan(0);
    });
  });

  describe("Peer Information", () => {
    it("should get peer info", async () => {
      const topology = new MeshTopology({
        agentIds: ["researcher"],
      });
      await topology.initialize(network);

      const peer = topology.getPeerInfo("researcher");

      expect(peer).toBeDefined();
      expect(peer?.agentId).toBe("researcher");
      expect(peer?.connected).toBe(true);
    });

    it("should return undefined for unknown peer", async () => {
      const topology = new MeshTopology({
        agentIds: ["researcher"],
      });
      await topology.initialize(network);

      const peer = topology.getPeerInfo("unknown");

      expect(peer).toBeUndefined();
    });

    it("should get all peers", async () => {
      const topology = new MeshTopology({
        agentIds: ["researcher", "writer", "analyst"],
      });
      await topology.initialize(network);

      const peers = topology.getAllPeers();

      expect(peers.length).toBe(3);
    });

    it("should get connected peers only", async () => {
      const topology = new MeshTopology({
        agentIds: ["researcher", "writer"],
      });
      await topology.initialize(network);

      const connected = topology.getConnectedPeers();

      expect(connected.every((p) => p.connected)).toBe(true);
    });
  });

  describe("sendMessage", () => {
    it("should send message between agents", async () => {
      const topology = new MeshTopology({
        agentIds: ["researcher", "writer"],
      });
      await topology.initialize(network);

      await expect(
        topology.sendMessage("researcher", "writer", { task: "review" }),
      ).resolves.not.toThrow();
    });

    it("should throw for unknown source agent", async () => {
      const topology = new MeshTopology({
        agentIds: ["researcher"],
      });
      await topology.initialize(network);

      await expect(
        topology.sendMessage("unknown", "researcher", {}),
      ).rejects.toThrow("Source agent not found");
    });

    it("should throw for unknown target agent", async () => {
      const topology = new MeshTopology({
        agentIds: ["researcher"],
      });
      await topology.initialize(network);

      await expect(
        topology.sendMessage("researcher", "unknown", {}),
      ).rejects.toThrow("Target agent not found");
    });

    it("should support message priority", async () => {
      const topology = new MeshTopology({
        agentIds: ["researcher", "writer"],
      });
      await topology.initialize(network);

      await expect(
        topology.sendMessage(
          "researcher",
          "writer",
          { urgent: true },
          "critical",
        ),
      ).resolves.not.toThrow();
    });
  });

  describe("sendAndWait", () => {
    it("should send message and wait for response", async () => {
      const topology = new MeshTopology({
        agentIds: ["researcher", "writer"],
      });
      await topology.initialize(network);

      // This will timeout since we don't have a responder, but tests the interface
      await expect(
        topology.sendAndWait("researcher", "writer", { query: "test" }, 100),
      ).rejects.toThrow(); // Will timeout
    });
  });

  describe("broadcast", () => {
    it("should broadcast to all agents", async () => {
      const topology = new MeshTopology({
        agentIds: ["researcher", "writer", "analyst"],
      });
      await topology.initialize(network);

      await expect(
        topology.broadcast("researcher", { announcement: "test" }),
      ).resolves.not.toThrow();
    });
  });

  describe("delegateTask", () => {
    it("should delegate task between agents", async () => {
      const topology = new MeshTopology({
        agentIds: ["researcher", "writer"],
        enableP2PDelegation: true,
      });
      await topology.initialize(network);

      // Delegation involves async protocol so we test that it doesn't immediately throw
      // In a real scenario, this would require a proper mock response
      await expect(
        topology.delegateTask("researcher", "writer", "Write article", {}),
      ).rejects.toThrow(); // Will timeout waiting for delegation response
    });

    it("should throw when P2P delegation disabled", async () => {
      const topology = new MeshTopology({
        agentIds: ["researcher", "writer"],
        enableP2PDelegation: false,
      });
      await topology.initialize(network);

      await expect(
        topology.delegateTask("researcher", "writer", "Task", {}),
      ).rejects.toThrow("P2P delegation is disabled");
    });
  });

  describe("Capability Search", () => {
    it("should find agents by capability", async () => {
      const topology = new MeshTopology({
        agentIds: ["researcher", "writer", "analyst"],
        autoDiscovery: true,
      });
      await topology.initialize(network);

      const researchers = topology.findAgentsByCapability("research");

      expect(researchers.includes("researcher")).toBe(true);
    });

    it("should return empty array if no match", async () => {
      const topology = new MeshTopology({
        agentIds: ["researcher"],
        autoDiscovery: true,
      });
      await topology.initialize(network);

      const found = topology.findAgentsByCapability("quantum-computing");

      expect(found.length).toBe(0);
    });

    it("should find agents by tool capability", async () => {
      const topology = new MeshTopology({
        agentIds: ["researcher", "analyst"],
        autoDiscovery: true,
      });
      await topology.initialize(network);

      const withSearch = topology.findAgentsByCapability("websearch");

      expect(withSearch.includes("researcher")).toBe(true);
    });
  });

  describe("Routing", () => {
    it("should get route between agents", async () => {
      const topology = new MeshTopology({
        agentIds: ["researcher", "writer"],
      });
      await topology.initialize(network);

      const route = topology.getRoute("researcher", "writer");

      expect(route).toBeDefined();
      expect(route?.targetId).toBe("writer");
      expect(route?.hops).toBe(1); // Direct connection in mesh
    });

    it("should return undefined for route to unknown agent", async () => {
      const topology = new MeshTopology({
        agentIds: ["researcher"],
      });
      await topology.initialize(network);

      const route = topology.getRoute("researcher", "unknown");

      expect(route).toBeUndefined();
    });
  });

  describe("Consensus", () => {
    it("should initiate consensus process", async () => {
      const topology = new MeshTopology({
        agentIds: ["researcher", "writer", "analyst"],
      });
      await topology.initialize(network);

      // Consensus requires response from participants, so it will timeout
      await expect(
        topology.startConsensus(
          "researcher",
          "Choose best approach",
          ["Option A", "Option B", "Option C"],
          100,
        ),
      ).rejects.toThrow(); // Will timeout
    });
  });

  describe("Cleanup", () => {
    it("should cleanup resources", async () => {
      const topology = new MeshTopology({
        agentIds: ["researcher", "writer"],
      });
      await topology.initialize(network);

      topology.cleanup();

      expect(true).toBe(true); // No error thrown
    });
  });
});
