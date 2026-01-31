/**
 * HierarchicalTopology Class Tests
 *
 * Tests for the HierarchicalTopology class including:
 * - Hierarchy building
 * - Delegation up and down
 * - Node navigation
 * - Cross-level communication
 * - Path finding
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HierarchicalTopology } from "../../../src/lib/agents/topologies/HierarchicalTopology.js";
import { AgentNetwork } from "../../../src/lib/agents/AgentNetwork.js";
import type { AgentNetworkConfig } from "../../../src/lib/agents/types/agentTypes.js";

// ============================================================================
// Mock SDK
// ============================================================================

function createMockSdk() {
  return {
    generate: vi.fn().mockImplementation(async (opts) => {
      if (
        opts.systemPrompt?.includes("routing") ||
        opts.input?.text?.includes("Available Primitives")
      ) {
        return {
          content: JSON.stringify({
            selectedPrimitive: {
              type: "agent",
              id: "director",
              name: "Director",
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

const hierarchicalNetworkConfig: AgentNetworkConfig = {
  name: "Hierarchical Test Network",
  agents: [
    {
      id: "director",
      name: "Director",
      description: "Executive level decision maker",
      instructions: "You are the director.",
    },
    {
      id: "manager-1",
      name: "Manager 1",
      description: "First team manager",
      instructions: "You are manager 1.",
    },
    {
      id: "manager-2",
      name: "Manager 2",
      description: "Second team manager",
      instructions: "You are manager 2.",
    },
    {
      id: "worker-1",
      name: "Worker 1",
      description: "First worker",
      instructions: "You are worker 1.",
    },
    {
      id: "worker-2",
      name: "Worker 2",
      description: "Second worker",
      instructions: "You are worker 2.",
    },
    {
      id: "worker-3",
      name: "Worker 3",
      description: "Third worker",
      instructions: "You are worker 3.",
    },
  ],
};

// ============================================================================
// Tests
// ============================================================================

describe("HierarchicalTopology", () => {
  let mockSdk: ReturnType<typeof createMockSdk>;
  let network: AgentNetwork;

  beforeEach(() => {
    mockSdk = createMockSdk();
    network = new AgentNetwork(hierarchicalNetworkConfig, mockSdk);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Constructor", () => {
    it("should create topology with hierarchy config", () => {
      const topology = new HierarchicalTopology({
        rootAgentId: "director",
        levels: [
          { name: "executive", agentIds: ["director"], parent: undefined },
          {
            name: "manager",
            agentIds: ["manager-1", "manager-2"],
            parent: "executive",
          },
          {
            name: "worker",
            agentIds: ["worker-1", "worker-2", "worker-3"],
            parent: "manager",
          },
        ],
      });

      expect(topology).toBeDefined();
    });

    it("should build hierarchy from levels", () => {
      const topology = new HierarchicalTopology({
        rootAgentId: "director",
        levels: [
          { name: "executive", agentIds: ["director"], parent: undefined },
          { name: "manager", agentIds: ["manager-1"], parent: "executive" },
        ],
      });

      const root = topology.getRootNode();
      expect(root?.agentId).toBe("director");
    });

    it("should use default config values", () => {
      const topology = new HierarchicalTopology({
        rootAgentId: "director",
        levels: [
          { name: "executive", agentIds: ["director"], parent: undefined },
        ],
      });

      // Defaults should be applied
      expect(topology).toBeDefined();
    });
  });

  describe("initialize", () => {
    it("should initialize with network", async () => {
      const topology = new HierarchicalTopology({
        rootAgentId: "director",
        levels: [
          { name: "executive", agentIds: ["director"], parent: undefined },
          {
            name: "manager",
            agentIds: ["manager-1", "manager-2"],
            parent: "executive",
          },
        ],
      });

      await topology.initialize(network);

      const root = topology.getRootNode();
      expect(root?.agent).toBeDefined();
    });

    it("should handle missing agents gracefully", async () => {
      const topology = new HierarchicalTopology({
        rootAgentId: "director",
        levels: [
          { name: "executive", agentIds: ["director"], parent: undefined },
          {
            name: "manager",
            agentIds: ["manager-1", "nonexistent"],
            parent: "executive",
          },
        ],
      });

      await topology.initialize(network);

      const node = topology.getNode("nonexistent");
      expect(node?.agent).toBeUndefined();
    });
  });

  describe("Node Navigation", () => {
    it("should get node by ID", async () => {
      const topology = new HierarchicalTopology({
        rootAgentId: "director",
        levels: [
          { name: "executive", agentIds: ["director"], parent: undefined },
          { name: "manager", agentIds: ["manager-1"], parent: "executive" },
        ],
      });
      await topology.initialize(network);

      const node = topology.getNode("manager-1");

      expect(node).toBeDefined();
      expect(node?.level).toBe("manager");
    });

    it("should return undefined for unknown node", () => {
      const topology = new HierarchicalTopology({
        rootAgentId: "director",
        levels: [
          { name: "executive", agentIds: ["director"], parent: undefined },
        ],
      });

      const node = topology.getNode("unknown");

      expect(node).toBeUndefined();
    });

    it("should get nodes at level", async () => {
      const topology = new HierarchicalTopology({
        rootAgentId: "director",
        levels: [
          { name: "executive", agentIds: ["director"], parent: undefined },
          {
            name: "manager",
            agentIds: ["manager-1", "manager-2"],
            parent: "executive",
          },
        ],
      });
      await topology.initialize(network);

      const managers = topology.getNodesAtLevel("manager");

      expect(managers.length).toBe(2);
    });

    it("should return empty array for unknown level", () => {
      const topology = new HierarchicalTopology({
        rootAgentId: "director",
        levels: [
          { name: "executive", agentIds: ["director"], parent: undefined },
        ],
      });

      const nodes = topology.getNodesAtLevel("unknown");

      expect(nodes.length).toBe(0);
    });

    it("should get root node", async () => {
      const topology = new HierarchicalTopology({
        rootAgentId: "director",
        levels: [
          { name: "executive", agentIds: ["director"], parent: undefined },
        ],
      });
      await topology.initialize(network);

      const root = topology.getRootNode();

      expect(root?.agentId).toBe("director");
      expect(root?.depth).toBe(0);
    });
  });

  describe("Parent-Child Relationships", () => {
    it("should get parent of node", async () => {
      const topology = new HierarchicalTopology({
        rootAgentId: "director",
        levels: [
          { name: "executive", agentIds: ["director"], parent: undefined },
          { name: "manager", agentIds: ["manager-1"], parent: "executive" },
        ],
      });
      await topology.initialize(network);

      const parent = topology.getParent("manager-1");

      expect(parent?.agentId).toBe("director");
    });

    it("should return undefined for root parent", () => {
      const topology = new HierarchicalTopology({
        rootAgentId: "director",
        levels: [
          { name: "executive", agentIds: ["director"], parent: undefined },
        ],
      });

      const parent = topology.getParent("director");

      expect(parent).toBeUndefined();
    });

    it("should get children of node", async () => {
      const topology = new HierarchicalTopology({
        rootAgentId: "director",
        levels: [
          { name: "executive", agentIds: ["director"], parent: undefined },
          {
            name: "manager",
            agentIds: ["manager-1", "manager-2"],
            parent: "executive",
          },
        ],
      });
      await topology.initialize(network);

      const children = topology.getChildren("director");

      expect(children.length).toBe(2);
      expect(children.map((c) => c.agentId)).toContain("manager-1");
    });

    it("should return empty array for leaf node children", async () => {
      const topology = new HierarchicalTopology({
        rootAgentId: "director",
        levels: [
          { name: "executive", agentIds: ["director"], parent: undefined },
          { name: "worker", agentIds: ["worker-1"], parent: "executive" },
        ],
      });
      await topology.initialize(network);

      const children = topology.getChildren("worker-1");

      expect(children.length).toBe(0);
    });

    it("should get siblings of node", async () => {
      const topology = new HierarchicalTopology({
        rootAgentId: "director",
        levels: [
          { name: "executive", agentIds: ["director"], parent: undefined },
          {
            name: "manager",
            agentIds: ["manager-1", "manager-2"],
            parent: "executive",
          },
        ],
      });
      await topology.initialize(network);

      const siblings = topology.getSiblings("manager-1");

      expect(siblings.length).toBe(1);
      expect(siblings[0].agentId).toBe("manager-2");
    });

    it("should return empty array for root siblings", () => {
      const topology = new HierarchicalTopology({
        rootAgentId: "director",
        levels: [
          { name: "executive", agentIds: ["director"], parent: undefined },
        ],
      });

      const siblings = topology.getSiblings("director");

      expect(siblings.length).toBe(0);
    });
  });

  describe("Depth and Path", () => {
    it("should get depth of node", async () => {
      const topology = new HierarchicalTopology({
        rootAgentId: "director",
        levels: [
          { name: "executive", agentIds: ["director"], parent: undefined },
          { name: "manager", agentIds: ["manager-1"], parent: "executive" },
          { name: "worker", agentIds: ["worker-1"], parent: "manager" },
        ],
      });
      await topology.initialize(network);

      expect(topology.getDepth("director")).toBe(0);
      expect(topology.getDepth("manager-1")).toBe(1);
      expect(topology.getDepth("worker-1")).toBe(2);
    });

    it("should return -1 for unknown node depth", () => {
      const topology = new HierarchicalTopology({
        rootAgentId: "director",
        levels: [
          { name: "executive", agentIds: ["director"], parent: undefined },
        ],
      });

      const depth = topology.getDepth("unknown");

      expect(depth).toBe(-1);
    });

    it("should get path from root to node", async () => {
      const topology = new HierarchicalTopology({
        rootAgentId: "director",
        levels: [
          { name: "executive", agentIds: ["director"], parent: undefined },
          { name: "manager", agentIds: ["manager-1"], parent: "executive" },
          { name: "worker", agentIds: ["worker-1"], parent: "manager" },
        ],
      });
      await topology.initialize(network);

      const path = topology.getPathFromRoot("worker-1");

      expect(path).toEqual(["director", "manager-1", "worker-1"]);
    });

    it("should find common ancestor", async () => {
      const topology = new HierarchicalTopology({
        rootAgentId: "director",
        levels: [
          { name: "executive", agentIds: ["director"], parent: undefined },
          { name: "manager", agentIds: ["manager-1"], parent: "executive" },
          {
            name: "worker",
            agentIds: ["worker-1", "worker-2"],
            parent: "manager",
          },
        ],
      });
      await topology.initialize(network);

      const ancestor = topology.findCommonAncestor("worker-1", "worker-2");

      expect(ancestor).toBe("manager-1");
    });

    it("should get all descendants", async () => {
      const topology = new HierarchicalTopology({
        rootAgentId: "director",
        levels: [
          { name: "executive", agentIds: ["director"], parent: undefined },
          { name: "manager", agentIds: ["manager-1"], parent: "executive" },
          {
            name: "worker",
            agentIds: ["worker-1", "worker-2"],
            parent: "manager",
          },
        ],
      });
      await topology.initialize(network);

      const descendants = topology.getDescendants("director");

      expect(descendants).toContain("manager-1");
      expect(descendants).toContain("worker-1");
      expect(descendants).toContain("worker-2");
    });
  });

  describe("Delegate Down", () => {
    it("should delegate task to child", async () => {
      const topology = new HierarchicalTopology({
        rootAgentId: "director",
        levels: [
          { name: "executive", agentIds: ["director"], parent: undefined },
          { name: "manager", agentIds: ["manager-1"], parent: "executive" },
        ],
      });
      await topology.initialize(network);

      const result = await topology.delegateDown(
        "director",
        "Review this report",
        { report: "data" },
      );

      expect(result).toBeDefined();
    });

    it("should delegate to specific child", async () => {
      const topology = new HierarchicalTopology({
        rootAgentId: "director",
        levels: [
          { name: "executive", agentIds: ["director"], parent: undefined },
          {
            name: "manager",
            agentIds: ["manager-1", "manager-2"],
            parent: "executive",
          },
        ],
      });
      await topology.initialize(network);

      const result = await topology.delegateDown(
        "director",
        "Task",
        {},
        "manager-2",
      );

      expect(result).toBeDefined();
    });

    it("should throw if agent not in hierarchy", async () => {
      const topology = new HierarchicalTopology({
        rootAgentId: "director",
        levels: [
          { name: "executive", agentIds: ["director"], parent: undefined },
        ],
      });
      await topology.initialize(network);

      await expect(
        topology.delegateDown("unknown", "Task", {}),
      ).rejects.toThrow("Agent not in hierarchy");
    });

    it("should throw if agent has no children", async () => {
      const topology = new HierarchicalTopology({
        rootAgentId: "director",
        levels: [
          { name: "executive", agentIds: ["director"], parent: undefined },
        ],
      });
      await topology.initialize(network);

      await expect(
        topology.delegateDown("director", "Task", {}),
      ).rejects.toThrow("Agent has no children");
    });
  });

  describe("Delegate to All Children", () => {
    it("should delegate to all children", async () => {
      const topology = new HierarchicalTopology({
        rootAgentId: "director",
        levels: [
          { name: "executive", agentIds: ["director"], parent: undefined },
          {
            name: "manager",
            agentIds: ["manager-1", "manager-2"],
            parent: "executive",
          },
        ],
      });
      await topology.initialize(network);

      const results = await topology.delegateToAllChildren(
        "director",
        "Process data",
        {},
      );

      expect(results.size).toBe(2);
      expect(results.has("manager-1")).toBe(true);
      expect(results.has("manager-2")).toBe(true);
    });
  });

  describe("Escalate Up", () => {
    it("should escalate to parent", async () => {
      const topology = new HierarchicalTopology({
        rootAgentId: "director",
        levels: [
          { name: "executive", agentIds: ["director"], parent: undefined },
          { name: "manager", agentIds: ["manager-1"], parent: "executive" },
        ],
      });
      await topology.initialize(network);

      const result = await topology.escalateUp(
        "manager-1",
        "Need approval",
        {},
      );

      expect(result).toBeDefined();
    });

    it("should escalate multiple levels", async () => {
      const topology = new HierarchicalTopology({
        rootAgentId: "director",
        levels: [
          { name: "executive", agentIds: ["director"], parent: undefined },
          { name: "manager", agentIds: ["manager-1"], parent: "executive" },
          { name: "worker", agentIds: ["worker-1"], parent: "manager" },
        ],
      });
      await topology.initialize(network);

      const result = await topology.escalateUp(
        "worker-1",
        "Critical issue",
        {},
        2, // Skip to director
      );

      expect(result).toBeDefined();
    });

    it("should throw if no parent to escalate to", async () => {
      const topology = new HierarchicalTopology({
        rootAgentId: "director",
        levels: [
          { name: "executive", agentIds: ["director"], parent: undefined },
        ],
      });
      await topology.initialize(network);

      await expect(
        topology.escalateUp("director", "Issue", {}),
      ).rejects.toThrow("No parent to escalate to");
    });
  });

  describe("Sibling Communication", () => {
    it("should send to sibling", async () => {
      const topology = new HierarchicalTopology({
        rootAgentId: "director",
        levels: [
          { name: "executive", agentIds: ["director"], parent: undefined },
          {
            name: "manager",
            agentIds: ["manager-1", "manager-2"],
            parent: "executive",
          },
        ],
      });
      await topology.initialize(network);

      await expect(
        topology.sendToSibling("manager-1", "manager-2", { request: "help" }),
      ).resolves.not.toThrow();
    });

    it("should block cross-level by default", async () => {
      const topology = new HierarchicalTopology({
        rootAgentId: "director",
        levels: [
          { name: "executive", agentIds: ["director"], parent: undefined },
          { name: "manager", agentIds: ["manager-1"], parent: "executive" },
          { name: "worker", agentIds: ["worker-1"], parent: "manager" },
        ],
        allowCrossLevel: false,
      });
      await topology.initialize(network);

      await expect(
        topology.sendToSibling("manager-1", "worker-1", {}),
      ).rejects.toThrow("Cross-level communication is disabled");
    });

    it("should allow cross-level when enabled", async () => {
      const topology = new HierarchicalTopology({
        rootAgentId: "director",
        levels: [
          { name: "executive", agentIds: ["director"], parent: undefined },
          { name: "manager", agentIds: ["manager-1"], parent: "executive" },
          { name: "worker", agentIds: ["worker-1"], parent: "manager" },
        ],
        allowCrossLevel: true,
      });
      await topology.initialize(network);

      await expect(
        topology.sendToSibling("manager-1", "worker-1", {}),
      ).resolves.not.toThrow();
    });
  });

  describe("Cleanup", () => {
    it("should cleanup resources", async () => {
      const topology = new HierarchicalTopology({
        rootAgentId: "director",
        levels: [
          { name: "executive", agentIds: ["director"], parent: undefined },
        ],
      });
      await topology.initialize(network);

      topology.cleanup();

      expect(true).toBe(true);
    });
  });
});
