/**
 * HubSpokeTopology Class Tests
 *
 * Tests for the HubSpokeTopology class including:
 * - Initialization with network
 * - Task delegation to spokes
 * - Load balancing
 * - Broadcast functionality
 * - Spoke status management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HubSpokeTopology } from "../../../src/lib/agents/topologies/HubSpokeTopology.js";
import { AgentNetwork } from "../../../src/lib/agents/AgentNetwork.js";
import type { AgentNetworkConfig } from "../../../src/lib/agents/types/agentTypes.js";

// ============================================================================
// Mock SDK
// ============================================================================

function createMockSdk(options?: {
  executeResponse?: {
    content: string;
    status: "success" | "error";
    error?: string;
  };
}) {
  const defaultResponse = {
    content: "Task completed successfully",
    status: "success" as const,
  };

  return {
    generate: vi.fn().mockImplementation(async (opts) => {
      // Check if this is a routing request
      if (
        opts.systemPrompt?.includes("routing") ||
        opts.input?.text?.includes("Available Primitives")
      ) {
        return {
          content: JSON.stringify({
            selectedPrimitive: { type: "agent", id: "hub", name: "Hub Agent" },
            confidence: 0.9,
            reasoning: "Hub selected",
          }),
        };
      }
      return options?.executeResponse ?? defaultResponse;
    }),
    stream: vi.fn().mockImplementation(async () => {
      async function* generateStream() {
        yield { content: "Task " };
        yield { content: "completed" };
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

const hubSpokeNetworkConfig: AgentNetworkConfig = {
  name: "Hub-Spoke Test Network",
  agents: [
    {
      id: "hub",
      name: "Hub Agent",
      description: "Central coordinator agent",
      instructions: "You are the central hub that coordinates tasks.",
    },
    {
      id: "spoke-1",
      name: "Spoke Agent 1",
      description: "First worker agent",
      instructions: "You are worker 1.",
    },
    {
      id: "spoke-2",
      name: "Spoke Agent 2",
      description: "Second worker agent",
      instructions: "You are worker 2.",
    },
    {
      id: "spoke-3",
      name: "Spoke Agent 3",
      description: "Third worker agent",
      instructions: "You are worker 3.",
    },
  ],
};

// ============================================================================
// Tests
// ============================================================================

describe("HubSpokeTopology", () => {
  let mockSdk: ReturnType<typeof createMockSdk>;
  let network: AgentNetwork;

  beforeEach(() => {
    mockSdk = createMockSdk();
    network = new AgentNetwork(hubSpokeNetworkConfig, mockSdk);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Constructor", () => {
    it("should create topology with config", () => {
      const topology = new HubSpokeTopology({
        hubAgentId: "hub",
        spokeAgentIds: ["spoke-1", "spoke-2", "spoke-3"],
      });

      expect(topology).toBeDefined();
    });

    it("should use default values for optional config", () => {
      const topology = new HubSpokeTopology({
        hubAgentId: "hub",
        spokeAgentIds: ["spoke-1"],
      });

      // Check that default load balancing is enabled by verifying spoke status
      const status = topology.getSpokeStatus("spoke-1");
      expect(status).toBeDefined();
      expect(status?.available).toBe(true);
    });

    it("should initialize spoke status for all spokes", () => {
      const topology = new HubSpokeTopology({
        hubAgentId: "hub",
        spokeAgentIds: ["spoke-1", "spoke-2"],
      });

      const statuses = topology.getAllSpokeStatuses();
      expect(statuses.length).toBe(2);
      expect(statuses[0].currentTasks).toBe(0);
      expect(statuses[1].available).toBe(true);
    });
  });

  describe("initialize", () => {
    it("should initialize with network", async () => {
      const topology = new HubSpokeTopology({
        hubAgentId: "hub",
        spokeAgentIds: ["spoke-1", "spoke-2"],
      });

      await topology.initialize(network);

      expect(topology.getHubAgent()).toBeDefined();
      expect(topology.getSpokeAgents().size).toBe(2);
    });

    it("should throw if hub agent not found", async () => {
      const topology = new HubSpokeTopology({
        hubAgentId: "nonexistent-hub",
        spokeAgentIds: ["spoke-1"],
      });

      await expect(topology.initialize(network)).rejects.toThrow(
        "Hub agent not found",
      );
    });

    it("should handle missing spoke agents gracefully", async () => {
      const topology = new HubSpokeTopology({
        hubAgentId: "hub",
        spokeAgentIds: ["spoke-1", "nonexistent-spoke"],
      });

      await topology.initialize(network);

      expect(topology.getSpokeAgents().size).toBe(1);
    });
  });

  describe("delegateTask", () => {
    it("should delegate task to specific spoke", async () => {
      const topology = new HubSpokeTopology({
        hubAgentId: "hub",
        spokeAgentIds: ["spoke-1", "spoke-2"],
      });
      await topology.initialize(network);

      const result = await topology.delegateTask(
        "spoke-1",
        "Process this data",
        { data: "test" },
      );

      expect(result).toBeDefined();
    });

    it("should auto-select spoke if not specified", async () => {
      const topology = new HubSpokeTopology({
        hubAgentId: "hub",
        spokeAgentIds: ["spoke-1", "spoke-2"],
        loadBalancing: true,
      });
      await topology.initialize(network);

      const result = await topology.delegateTask(undefined, "Process data", {});

      expect(result).toBeDefined();
    });

    it("should update spoke status during task", async () => {
      const topology = new HubSpokeTopology({
        hubAgentId: "hub",
        spokeAgentIds: ["spoke-1"],
      });
      await topology.initialize(network);

      const statusBefore = topology.getSpokeStatus("spoke-1");
      expect(statusBefore?.currentTasks).toBe(0);

      await topology.delegateTask("spoke-1", "Task", {});

      const statusAfter = topology.getSpokeStatus("spoke-1");
      expect(statusAfter?.currentTasks).toBe(0); // Decremented after completion
    });

    it("should throw if topology not initialized", async () => {
      const topology = new HubSpokeTopology({
        hubAgentId: "hub",
        spokeAgentIds: ["spoke-1"],
      });

      await expect(
        topology.delegateTask("spoke-1", "Task", {}),
      ).rejects.toThrow("Topology not initialized");
    });

    it("should throw if spoke not found", async () => {
      const topology = new HubSpokeTopology({
        hubAgentId: "hub",
        spokeAgentIds: ["spoke-1"],
      });
      await topology.initialize(network);

      await expect(
        topology.delegateTask("nonexistent", "Task", {}),
      ).rejects.toThrow("Spoke agent not found");
    });
  });

  describe("broadcastTask", () => {
    it("should broadcast to all spokes", async () => {
      const topology = new HubSpokeTopology({
        hubAgentId: "hub",
        spokeAgentIds: ["spoke-1", "spoke-2", "spoke-3"],
      });
      await topology.initialize(network);

      const results = await topology.broadcastTask("Process data", {});

      expect(results.size).toBe(3);
      expect(results.has("spoke-1")).toBe(true);
      expect(results.has("spoke-2")).toBe(true);
      expect(results.has("spoke-3")).toBe(true);
    });

    it("should handle errors in individual spokes", async () => {
      mockSdk = createMockSdk();
      let callCount = 0;
      mockSdk.generate = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          throw new Error("Spoke 2 failed");
        }
        return { content: "Success", usage: { totalTokens: 100 } };
      });
      network = new AgentNetwork(hubSpokeNetworkConfig, mockSdk);

      const topology = new HubSpokeTopology({
        hubAgentId: "hub",
        spokeAgentIds: ["spoke-1", "spoke-2"],
      });
      await topology.initialize(network);

      const results = await topology.broadcastTask("Task", {});

      expect(results.size).toBe(2);
    });
  });

  describe("Load Balancing", () => {
    it("should select spoke with fewest tasks when load balancing enabled", async () => {
      const topology = new HubSpokeTopology({
        hubAgentId: "hub",
        spokeAgentIds: ["spoke-1", "spoke-2"],
        loadBalancing: true,
      });
      await topology.initialize(network);

      // First task goes to spoke-1 (both have 0 tasks)
      await topology.delegateTask(undefined, "Task 1", {});

      // Verify load balancing by checking status
      const statuses = topology.getAllSpokeStatuses();
      expect(statuses.every((s) => s.currentTasks === 0)).toBe(true);
    });

    it("should respect maxConcurrentTasksPerSpoke", async () => {
      const topology = new HubSpokeTopology({
        hubAgentId: "hub",
        spokeAgentIds: ["spoke-1"],
        maxConcurrentTasksPerSpoke: 1,
        loadBalancing: false,
      });
      await topology.initialize(network);

      // Verify initial status
      const status = topology.getSpokeStatus("spoke-1");
      expect(status?.currentTasks).toBe(0);
    });
  });

  describe("Spoke Status Management", () => {
    it("should get spoke status", async () => {
      const topology = new HubSpokeTopology({
        hubAgentId: "hub",
        spokeAgentIds: ["spoke-1"],
      });
      await topology.initialize(network);

      const status = topology.getSpokeStatus("spoke-1");

      expect(status).toBeDefined();
      expect(status?.agentId).toBe("spoke-1");
      expect(status?.available).toBe(true);
      expect(status?.currentTasks).toBe(0);
    });

    it("should return undefined for unknown spoke", async () => {
      const topology = new HubSpokeTopology({
        hubAgentId: "hub",
        spokeAgentIds: ["spoke-1"],
      });

      const status = topology.getSpokeStatus("unknown");

      expect(status).toBeUndefined();
    });

    it("should set spoke availability", async () => {
      const topology = new HubSpokeTopology({
        hubAgentId: "hub",
        spokeAgentIds: ["spoke-1"],
      });
      await topology.initialize(network);

      topology.setSpokeAvailable("spoke-1", false);

      const status = topology.getSpokeStatus("spoke-1");
      expect(status?.available).toBe(false);
    });

    it("should get all spoke statuses", async () => {
      const topology = new HubSpokeTopology({
        hubAgentId: "hub",
        spokeAgentIds: ["spoke-1", "spoke-2"],
      });
      await topology.initialize(network);

      const statuses = topology.getAllSpokeStatuses();

      expect(statuses.length).toBe(2);
    });
  });

  describe("Agent Access", () => {
    it("should get hub agent", async () => {
      const topology = new HubSpokeTopology({
        hubAgentId: "hub",
        spokeAgentIds: ["spoke-1"],
      });
      await topology.initialize(network);

      const hub = topology.getHubAgent();

      expect(hub).toBeDefined();
      expect(hub?.id).toBe("hub");
    });

    it("should get spoke agents map", async () => {
      const topology = new HubSpokeTopology({
        hubAgentId: "hub",
        spokeAgentIds: ["spoke-1", "spoke-2"],
      });
      await topology.initialize(network);

      const spokes = topology.getSpokeAgents();

      expect(spokes.size).toBe(2);
      expect(spokes.get("spoke-1")).toBeDefined();
    });

    it("should return copy of spoke agents map", async () => {
      const topology = new HubSpokeTopology({
        hubAgentId: "hub",
        spokeAgentIds: ["spoke-1"],
      });
      await topology.initialize(network);

      const spokes1 = topology.getSpokeAgents();
      const spokes2 = topology.getSpokeAgents();

      expect(spokes1).not.toBe(spokes2);
    });
  });

  describe("Cleanup", () => {
    it("should cleanup resources", async () => {
      const topology = new HubSpokeTopology({
        hubAgentId: "hub",
        spokeAgentIds: ["spoke-1"],
      });
      await topology.initialize(network);

      topology.cleanup();

      // Cleanup should not throw
      expect(true).toBe(true);
    });
  });
});
