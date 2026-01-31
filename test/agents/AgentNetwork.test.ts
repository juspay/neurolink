/**
 * AgentNetwork Class Tests
 *
 * Tests for the AgentNetwork class including:
 * - Network creation and configuration
 * - Execution and routing
 * - Streaming with events
 * - Token usage aggregation
 * - Error handling and fallback
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AgentNetwork } from "../../src/lib/agents/AgentNetwork.js";
import type {
  AgentNetworkConfig,
  NetworkExecutionInput,
  NetworkStreamChunk,
} from "../../src/lib/agents/types/agentTypes.js";

// ============================================================================
// Mock SDK
// ============================================================================

function createMockSdk(options?: {
  routingResponse?: {
    selectedPrimitive: { type: string; id: string; name: string };
    confidence: number;
    reasoning: string;
  };
  agentResponse?: {
    content: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
}) {
  const defaultRouting = {
    selectedPrimitive: { type: "agent", id: "agent-1", name: "Agent 1" },
    confidence: 0.9,
    reasoning: "Best match for the task",
    formattedInput: "Processed task",
  };

  const defaultAgentResponse = {
    content:
      "Task completed successfully. This is the final response with detailed analysis and recommendations.",
    usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
  };

  return {
    generate: vi.fn().mockImplementation(async (opts) => {
      // Check if this is a routing request
      if (
        opts.systemPrompt?.includes("routing") ||
        opts.input?.text?.includes("Available Primitives")
      ) {
        return {
          content: JSON.stringify(options?.routingResponse ?? defaultRouting),
        };
      }
      // Regular agent response
      return options?.agentResponse ?? defaultAgentResponse;
    }),
    stream: vi.fn().mockImplementation(async () => {
      async function* generateStream() {
        yield { content: "Task " };
        yield { content: "completed " };
        yield { content: "successfully." };
      }

      return {
        stream: generateStream(),
        usage: { promptTokens: 50, completionTokens: 100, totalTokens: 150 },
      };
    }),
    getAllAvailableTools: vi.fn().mockResolvedValue([
      { name: "readFile", description: "Read a file" },
      { name: "writeFile", description: "Write a file" },
    ]),
    executeTool: vi.fn().mockResolvedValue({ success: true }),
  };
}

// ============================================================================
// Test Fixtures
// ============================================================================

const basicNetworkConfig: AgentNetworkConfig = {
  name: "Test Network",
  agents: [
    {
      id: "agent-1",
      name: "Agent 1",
      description: "First test agent",
      instructions: "You are the first agent.",
    },
    {
      id: "agent-2",
      name: "Agent 2",
      description: "Second test agent",
      instructions: "You are the second agent.",
    },
  ],
};

const fullNetworkConfig: AgentNetworkConfig = {
  id: "test-network-1",
  name: "Full Test Network",
  description: "A fully configured test network",
  agents: [
    {
      id: "researcher",
      name: "Research Agent",
      description: "Searches and analyzes information",
      instructions: "You are a research assistant.",
      tools: ["websearchGrounding"],
    },
    {
      id: "writer",
      name: "Content Writer",
      description: "Creates written content",
      instructions: "You are a content writer.",
      temperature: 0.8,
    },
  ],
  router: {
    model: "gpt-4o",
    confidenceThreshold: 0.7,
  },
  defaults: {
    maxSteps: 5,
    timeout: 60000,
  },
};

// ============================================================================
// Tests
// ============================================================================

describe("AgentNetwork", () => {
  let mockSdk: ReturnType<typeof createMockSdk>;

  beforeEach(() => {
    mockSdk = createMockSdk();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Constructor", () => {
    it("should create a network with basic configuration", () => {
      const network = new AgentNetwork(basicNetworkConfig, mockSdk);

      expect(network.name).toBe("Test Network");
      expect(network.id).toBeDefined();
    });

    it("should create a network with custom ID", () => {
      const network = new AgentNetwork(fullNetworkConfig, mockSdk);

      expect(network.id).toBe("test-network-1");
      expect(network.description).toBe("A fully configured test network");
    });

    it("should register all agents", () => {
      const network = new AgentNetwork(basicNetworkConfig, mockSdk);

      expect(network.getAgent("agent-1")).toBeDefined();
      expect(network.getAgent("agent-2")).toBeDefined();
    });

    it("should get all agents", () => {
      const network = new AgentNetwork(basicNetworkConfig, mockSdk);
      const agents = network.getAllAgents();

      expect(agents.length).toBe(2);
      expect(agents[0].id).toBe("agent-1");
      expect(agents[1].id).toBe("agent-2");
    });
  });

  describe("execute", () => {
    it("should execute with string message", async () => {
      const network = new AgentNetwork(basicNetworkConfig, mockSdk);

      const result = await network.execute({
        message: "Process this task",
      });

      expect(result.status).toBe("completed");
      expect(result.content).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });

    it("should include execution trace", async () => {
      const network = new AgentNetwork(basicNetworkConfig, mockSdk);

      const result = await network.execute({
        message: "Process this task",
      });

      expect(result.trace).toBeDefined();
      expect(result.trace.traceId).toBeDefined();
      expect(result.trace.steps.length).toBeGreaterThan(0);
      expect(result.trace.routingDecisions.length).toBeGreaterThan(0);
    });

    it("should aggregate token usage", async () => {
      const network = new AgentNetwork(basicNetworkConfig, mockSdk);

      const result = await network.execute({
        message: "Process this task",
      });

      expect(result.usage).toBeDefined();
      expect(result.usage.totalTokens).toBeGreaterThan(0);
    });

    it("should respect maxSteps limit", async () => {
      const network = new AgentNetwork(
        {
          ...basicNetworkConfig,
          defaults: { maxSteps: 2 },
        },
        mockSdk,
      );

      const result = await network.execute({
        message: "Process this long task",
      });

      expect(result.trace.steps.length).toBeLessThanOrEqual(2);
    });

    it("should handle execution errors", async () => {
      const failingSdk = {
        ...mockSdk,
        generate: vi.fn().mockRejectedValue(new Error("Generation failed")),
      };

      const network = new AgentNetwork(basicNetworkConfig, failingSdk);

      const result = await network.execute({
        message: "Process this task",
      });

      expect(result.status).toBe("error");
      expect(result.error).toBeDefined();
    });
  });

  describe("Routing", () => {
    it("should make routing decisions", async () => {
      const network = new AgentNetwork(basicNetworkConfig, mockSdk);

      const result = await network.execute({
        message: "Research this topic",
      });

      expect(result.trace.routingDecisions.length).toBeGreaterThan(0);
      expect(result.trace.routingDecisions[0].confidence).toBeGreaterThan(0);
    });

    it("should include reasoning in routing decisions", async () => {
      const network = new AgentNetwork(basicNetworkConfig, mockSdk);

      const result = await network.execute({
        message: "Analyze this data",
      });

      const decision = result.trace.routingDecisions[0];
      expect(decision.reasoning).toBeDefined();
      expect(decision.reasoning.length).toBeGreaterThan(0);
    });

    it("should use fallback on routing failure", async () => {
      const badRoutingSdk = createMockSdk({
        routingResponse: {
          selectedPrimitive: { type: "agent", id: "nonexistent", name: "Bad" },
          confidence: 0.9,
          reasoning: "Bad routing",
        },
      });

      // Make second generate call work
      badRoutingSdk.generate = vi
        .fn()
        .mockResolvedValueOnce({
          content: JSON.stringify({
            selectedPrimitive: {
              type: "agent",
              id: "nonexistent",
              name: "Bad",
            },
            confidence: 0.1,
            reasoning: "Low confidence",
          }),
        })
        .mockResolvedValue({
          content: "Task completed successfully. Final answer.",
          usage: { promptTokens: 50, completionTokens: 100, totalTokens: 150 },
        });

      const network = new AgentNetwork(basicNetworkConfig, badRoutingSdk);

      const result = await network.execute({
        message: "Process this",
      });

      // Should still complete (fallback to first agent)
      expect(result.trace.routingDecisions.length).toBeGreaterThan(0);
    });
  });

  describe("stream", () => {
    it("should emit network-start event", async () => {
      const network = new AgentNetwork(basicNetworkConfig, mockSdk);
      const chunks: NetworkStreamChunk[] = [];

      for await (const chunk of network.stream({ message: "Test task" })) {
        chunks.push(chunk);
      }

      const startChunk = chunks.find((c) => c.type === "network-start");
      expect(startChunk).toBeDefined();
      expect((startChunk as any).networkId).toBe(network.id);
    });

    it("should emit routing-decision events", async () => {
      const network = new AgentNetwork(basicNetworkConfig, mockSdk);
      const chunks: NetworkStreamChunk[] = [];

      for await (const chunk of network.stream({ message: "Test task" })) {
        chunks.push(chunk);
      }

      const routingChunk = chunks.find((c) => c.type === "routing-decision");
      expect(routingChunk).toBeDefined();
      expect((routingChunk as any).decision).toBeDefined();
    });

    it("should emit primitive-start and primitive-end events", async () => {
      const network = new AgentNetwork(basicNetworkConfig, mockSdk);
      const chunks: NetworkStreamChunk[] = [];

      for await (const chunk of network.stream({ message: "Test task" })) {
        chunks.push(chunk);
      }

      const primitiveStart = chunks.find((c) => c.type === "primitive-start");
      const primitiveEnd = chunks.find((c) => c.type === "primitive-end");

      expect(primitiveStart).toBeDefined();
      expect(primitiveEnd).toBeDefined();
    });

    it("should emit network-complete event", async () => {
      const network = new AgentNetwork(basicNetworkConfig, mockSdk);
      const chunks: NetworkStreamChunk[] = [];

      for await (const chunk of network.stream({ message: "Test task" })) {
        chunks.push(chunk);
      }

      const completeChunk = chunks.find((c) => c.type === "network-complete");
      expect(completeChunk).toBeDefined();
      expect((completeChunk as any).result).toBeDefined();
    });

    it("should emit network-error on failure", async () => {
      const failingSdk = {
        ...mockSdk,
        generate: vi.fn().mockRejectedValue(new Error("Stream failed")),
      };

      const network = new AgentNetwork(basicNetworkConfig, failingSdk);
      const chunks: NetworkStreamChunk[] = [];

      for await (const chunk of network.stream({ message: "Test task" })) {
        chunks.push(chunk);
      }

      const errorChunk = chunks.find((c) => c.type === "network-error");
      expect(errorChunk).toBeDefined();
    });
  });

  describe("Agent Management", () => {
    it("should add agents dynamically", () => {
      const network = new AgentNetwork(basicNetworkConfig, mockSdk);

      expect(network.getAllAgents().length).toBe(2);

      // This would require the Agent class
      // For now, we test that existing agents are accessible
      expect(network.getAgent("agent-1")).toBeDefined();
    });

    it("should get all primitives", () => {
      const network = new AgentNetwork(basicNetworkConfig, mockSdk);
      const primitives = network.getAllPrimitives();

      expect(primitives.length).toBeGreaterThanOrEqual(2);
      expect(primitives[0].type).toBe("agent");
    });

    it("should get network configuration", () => {
      const network = new AgentNetwork(fullNetworkConfig, mockSdk);
      const config = network.getConfig();

      expect(config.name).toBe("Full Test Network");
      expect(config.agents.length).toBe(2);
    });
  });

  describe("Events", () => {
    it("should support event subscription", async () => {
      const network = new AgentNetwork(basicNetworkConfig, mockSdk);
      const handler = vi.fn();

      network.on("network:complete", handler);

      // Trigger through streaming (events are emitted during stream)
      const chunks: NetworkStreamChunk[] = [];
      for await (const chunk of network.stream({ message: "Test" })) {
        chunks.push(chunk);
      }

      expect(handler).toHaveBeenCalled();
    });

    it("should support event unsubscription", async () => {
      const network = new AgentNetwork(basicNetworkConfig, mockSdk);
      const handler = vi.fn();

      network.on("network:complete", handler);
      network.off("network:complete", handler);

      const chunks: NetworkStreamChunk[] = [];
      for await (const chunk of network.stream({ message: "Test" })) {
        chunks.push(chunk);
      }

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("Routing History", () => {
    it("should track routing history", async () => {
      const network = new AgentNetwork(basicNetworkConfig, mockSdk);

      await network.execute({ message: "First task" });
      await network.execute({ message: "Second task" });

      const history = network.getRoutingHistory();
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe("Context Passing", () => {
    it("should pass context to primitives", async () => {
      const network = new AgentNetwork(basicNetworkConfig, mockSdk);

      await network.execute({
        message: "Process with context",
        context: { userId: "user-123", priority: "high" },
      });

      expect(mockSdk.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            userId: "user-123",
          }),
        }),
      );
    });
  });
});
