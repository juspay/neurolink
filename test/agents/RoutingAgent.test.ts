/**
 * RoutingAgent Class Tests
 *
 * Tests for the RoutingAgent class including:
 * - Task routing with LLM analysis
 * - Confidence scoring and thresholds
 * - Fallback mechanisms
 * - History tracking
 * - Utility functions (scorePrimitive, selectPrimitiveByHeuristics)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  RoutingAgent,
  scorePrimitive,
  selectPrimitiveByHeuristics,
} from "../../src/lib/agents/RoutingAgent.js";
import type {
  Primitive,
  RouterConfig,
} from "../../src/lib/agents/types/agentTypes.js";

// ============================================================================
// Mock SDK
// ============================================================================

function createMockSdk(options?: {
  routingResponse?: {
    selectedPrimitive: { type: string; id: string; name: string };
    confidence: number;
    reasoning: string;
    formattedInput?: string;
    alternatives?: Array<{ type: string; id: string; confidence: number }>;
  };
  shouldFail?: boolean;
  errorMessage?: string;
}) {
  const defaultResponse = {
    selectedPrimitive: { type: "agent", id: "agent-1", name: "Agent 1" },
    confidence: 0.9,
    reasoning: "Best match for the task",
    formattedInput: "Processed task",
  };

  return {
    generate: vi.fn().mockImplementation(async () => {
      if (options?.shouldFail) {
        throw new Error(options.errorMessage ?? "Generation failed");
      }
      return {
        content: JSON.stringify(options?.routingResponse ?? defaultResponse),
      };
    }),
  };
}

// ============================================================================
// Test Fixtures
// ============================================================================

const testPrimitives: Primitive[] = [
  {
    type: "agent",
    id: "researcher",
    name: "Research Agent",
    description: "Searches and analyzes information from various sources",
  },
  {
    type: "agent",
    id: "writer",
    name: "Content Writer",
    description: "Creates and edits written content",
  },
  {
    type: "tool",
    id: "calculator",
    name: "Calculator Tool",
    description: "Performs mathematical calculations",
  },
  {
    type: "workflow",
    id: "data-pipeline",
    name: "Data Pipeline",
    description: "Processes and transforms data in multiple steps",
  },
];

const defaultRouterConfig: RouterConfig = {
  model: "gpt-4o",
  confidenceThreshold: 0.7,
};

// ============================================================================
// Tests
// ============================================================================

describe("RoutingAgent", () => {
  let mockSdk: ReturnType<typeof createMockSdk>;

  beforeEach(() => {
    mockSdk = createMockSdk();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Constructor", () => {
    it("should create a routing agent with config", () => {
      const router = new RoutingAgent(defaultRouterConfig, mockSdk);

      const config = router.getConfig();
      expect(config.model).toBe("gpt-4o");
      expect(config.confidenceThreshold).toBe(0.7);
    });

    it("should use default values for optional config", () => {
      const router = new RoutingAgent({}, mockSdk);

      const config = router.getConfig();
      expect(config.maxAttempts).toBe(3);
      expect(config.confidenceThreshold).toBe(0.5);
    });
  });

  describe("route", () => {
    it("should route to single primitive with high confidence", async () => {
      const router = new RoutingAgent(defaultRouterConfig, mockSdk);

      const decision = await router.route("Process data", [testPrimitives[0]]);

      expect(decision.selectedPrimitive.id).toBe("researcher");
      expect(decision.confidence).toBe(1.0);
      expect(decision.reasoning).toBe("Only one primitive available");
    });

    it("should use LLM routing for multiple primitives", async () => {
      mockSdk = createMockSdk({
        routingResponse: {
          selectedPrimitive: {
            type: "agent",
            id: "researcher",
            name: "Research Agent",
          },
          confidence: 0.85,
          reasoning: "Best for research tasks",
        },
      });

      const router = new RoutingAgent(defaultRouterConfig, mockSdk);

      const decision = await router.route("Research AI trends", testPrimitives);

      expect(decision.selectedPrimitive.id).toBe("researcher");
      expect(decision.confidence).toBe(0.85);
      expect(mockSdk.generate).toHaveBeenCalled();
    });

    it("should include routing options in decision", async () => {
      const router = new RoutingAgent(defaultRouterConfig, mockSdk);

      const decision = await router.route("Test task", testPrimitives, {
        stepIndex: 2,
        traceId: "trace-123",
      });

      expect(decision.stepIndex).toBe(2);
    });

    it("should throw error when no primitives available", async () => {
      const router = new RoutingAgent(defaultRouterConfig, mockSdk);

      await expect(router.route("Test", [])).rejects.toThrow(
        "No primitives available for routing",
      );
    });

    it("should handle markdown-wrapped JSON response", async () => {
      mockSdk = createMockSdk();
      mockSdk.generate = vi.fn().mockResolvedValue({
        content:
          "```json\n" +
          JSON.stringify({
            selectedPrimitive: {
              type: "agent",
              id: "researcher",
              name: "Research Agent",
            },
            confidence: 0.9,
            reasoning: "Best match",
          }) +
          "\n```",
      });

      const router = new RoutingAgent(defaultRouterConfig, mockSdk);

      const decision = await router.route("Research task", testPrimitives);

      expect(decision.selectedPrimitive.id).toBe("researcher");
    });
  });

  describe("Confidence Threshold", () => {
    it("should accept routing above threshold", async () => {
      mockSdk = createMockSdk({
        routingResponse: {
          selectedPrimitive: {
            type: "agent",
            id: "researcher",
            name: "Research Agent",
          },
          confidence: 0.8,
          reasoning: "High confidence match",
        },
      });

      const router = new RoutingAgent(
        { ...defaultRouterConfig, confidenceThreshold: 0.7 },
        mockSdk,
      );

      const decision = await router.route("Research AI", testPrimitives);

      expect(decision.confidence).toBe(0.8);
      expect(decision.selectedPrimitive.id).toBe("researcher");
    });

    it("should use fallback when confidence below threshold", async () => {
      mockSdk = createMockSdk({
        routingResponse: {
          selectedPrimitive: {
            type: "agent",
            id: "researcher",
            name: "Research Agent",
          },
          confidence: 0.3,
          reasoning: "Low confidence",
        },
      });

      const router = new RoutingAgent(
        {
          ...defaultRouterConfig,
          confidenceThreshold: 0.7,
          fallbackAgentId: "writer",
        },
        mockSdk,
      );

      const decision = await router.route("Ambiguous task", testPrimitives);

      expect(decision.selectedPrimitive.id).toBe("writer");
      expect(decision.confidence).toBe(0.5);
      expect(decision.reasoning).toContain("Fallback");
    });

    it("should proceed with low confidence if no fallback configured", async () => {
      mockSdk = createMockSdk({
        routingResponse: {
          selectedPrimitive: {
            type: "agent",
            id: "researcher",
            name: "Research Agent",
          },
          confidence: 0.3,
          reasoning: "Low confidence",
        },
      });

      const router = new RoutingAgent(
        { ...defaultRouterConfig, confidenceThreshold: 0.7 },
        mockSdk,
      );

      const decision = await router.route("Task", testPrimitives);

      expect(decision.selectedPrimitive.id).toBe("researcher");
      expect(decision.confidence).toBe(0.3);
    });
  });

  describe("Fallback Mechanism", () => {
    it("should use fallback on routing failure", async () => {
      mockSdk = createMockSdk({ shouldFail: true });

      const router = new RoutingAgent(
        { ...defaultRouterConfig, fallbackAgentId: "writer", maxAttempts: 2 },
        mockSdk,
      );

      const decision = await router.route("Test task", testPrimitives);

      expect(decision.selectedPrimitive.id).toBe("writer");
      expect(decision.confidence).toBe(0.5);
      expect(decision.reasoning).toContain("Fallback");
    });

    it("should prefer agents when no fallback configured", async () => {
      mockSdk = createMockSdk({ shouldFail: true });

      const router = new RoutingAgent(
        { ...defaultRouterConfig, maxAttempts: 1 },
        mockSdk,
      );

      const primitivesWithToolFirst: Primitive[] = [
        { type: "tool", id: "tool-1", name: "Tool 1", description: "A tool" },
        {
          type: "agent",
          id: "agent-1",
          name: "Agent 1",
          description: "An agent",
        },
      ];

      const decision = await router.route("Task", primitivesWithToolFirst);

      expect(decision.selectedPrimitive.type).toBe("agent");
    });

    it("should use first primitive if no agent available", async () => {
      mockSdk = createMockSdk({ shouldFail: true });

      const router = new RoutingAgent(
        { ...defaultRouterConfig, maxAttempts: 1 },
        mockSdk,
      );

      const toolsOnly: Primitive[] = [
        { type: "tool", id: "tool-1", name: "Tool 1", description: "A tool" },
        {
          type: "tool",
          id: "tool-2",
          name: "Tool 2",
          description: "Another tool",
        },
      ];

      const decision = await router.route("Task", toolsOnly);

      expect(decision.selectedPrimitive.id).toBe("tool-1");
    });

    it("should retry on parse error before falling back", async () => {
      let callCount = 0;
      mockSdk.generate = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount < 3) {
          return { content: "invalid json" };
        }
        return {
          content: JSON.stringify({
            selectedPrimitive: {
              type: "agent",
              id: "researcher",
              name: "Research Agent",
            },
            confidence: 0.9,
            reasoning: "Success after retry",
          }),
        };
      });

      const router = new RoutingAgent(
        { ...defaultRouterConfig, maxAttempts: 3 },
        mockSdk,
      );

      const decision = await router.route("Task", testPrimitives);

      expect(decision.selectedPrimitive.id).toBe("researcher");
      expect(mockSdk.generate).toHaveBeenCalledTimes(3);
    });
  });

  describe("History Tracking", () => {
    it("should track routing history", async () => {
      const router = new RoutingAgent(defaultRouterConfig, mockSdk);

      await router.route("Task 1", testPrimitives);
      await router.route("Task 2", testPrimitives);

      const history = router.getHistory();
      expect(history.length).toBe(2);
    });

    it("should clear history", async () => {
      const router = new RoutingAgent(defaultRouterConfig, mockSdk);

      await router.route("Task 1", testPrimitives);
      router.clearHistory();

      const history = router.getHistory();
      expect(history.length).toBe(0);
    });

    it("should return copy of history", async () => {
      const router = new RoutingAgent(defaultRouterConfig, mockSdk);

      await router.route("Task 1", testPrimitives);

      const history1 = router.getHistory();
      const history2 = router.getHistory();

      expect(history1).not.toBe(history2);
      expect(history1).toEqual(history2);
    });
  });

  describe("Configuration", () => {
    it("should update configuration", () => {
      const router = new RoutingAgent(defaultRouterConfig, mockSdk);

      router.updateConfig({ confidenceThreshold: 0.9 });

      const config = router.getConfig();
      expect(config.confidenceThreshold).toBe(0.9);
      expect(config.model).toBe("gpt-4o");
    });

    it("should return copy of config", () => {
      const router = new RoutingAgent(defaultRouterConfig, mockSdk);

      const config1 = router.getConfig();
      const config2 = router.getConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe("Alternatives", () => {
    it("should include alternatives in decision", async () => {
      mockSdk = createMockSdk({
        routingResponse: {
          selectedPrimitive: {
            type: "agent",
            id: "researcher",
            name: "Research Agent",
          },
          confidence: 0.9,
          reasoning: "Best match",
          alternatives: [
            { type: "agent", id: "writer", confidence: 0.7 },
            { type: "tool", id: "calculator", confidence: 0.5 },
          ],
        },
      });

      const router = new RoutingAgent(defaultRouterConfig, mockSdk);

      const decision = await router.route("Complex task", testPrimitives);

      expect(decision.alternatives).toBeDefined();
      expect(decision.alternatives?.length).toBe(2);
      expect(decision.alternatives?.[0].id).toBe("writer");
    });
  });
});

describe("scorePrimitive", () => {
  it("should score based on keyword matches", () => {
    const primitive: Primitive = {
      type: "agent",
      id: "researcher",
      name: "Research Agent",
      description: "Searches and analyzes information",
    };

    const score = scorePrimitive("research information", primitive);

    expect(score).toBeGreaterThan(0);
  });

  it("should give higher score for name matches", () => {
    const primitive: Primitive = {
      type: "agent",
      id: "researcher",
      name: "Research Agent",
      description: "Does things",
    };

    const scoreWithNameMatch = scorePrimitive("research task", primitive);

    const primitive2: Primitive = {
      type: "agent",
      id: "other",
      name: "Other Agent",
      description: "Does research things",
    };

    const scoreWithDescMatch = scorePrimitive("research task", primitive2);

    expect(scoreWithNameMatch).toBeGreaterThan(scoreWithDescMatch);
  });

  it("should boost tools for calculation tasks", () => {
    const tool: Primitive = {
      type: "tool",
      id: "calc",
      name: "Calculator",
      description: "Math tool",
    };

    const score = scorePrimitive("calculate the sum", tool);

    expect(score).toBeGreaterThan(0.2);
  });

  it("should boost agents for analysis tasks", () => {
    const agent: Primitive = {
      type: "agent",
      id: "analyzer",
      name: "Analyzer",
      description: "Analysis tool",
    };

    const score = scorePrimitive("analyze the data", agent);

    expect(score).toBeGreaterThan(0.15);
  });

  it("should boost workflows for process tasks", () => {
    const workflow: Primitive = {
      type: "workflow",
      id: "pipeline",
      name: "Pipeline",
      description: "Data processing",
    };

    const score = scorePrimitive("process the input", workflow);

    expect(score).toBeGreaterThan(0.15);
  });

  it("should cap score at 1.0", () => {
    const primitive: Primitive = {
      type: "agent",
      id: "analyzer",
      name: "Analyze Research Data",
      description:
        "Analyzes research data and provides analysis results with research insights",
    };

    const score = scorePrimitive(
      "analyze research data and provide analysis results",
      primitive,
    );

    expect(score).toBeLessThanOrEqual(1);
  });
});

describe("selectPrimitiveByHeuristics", () => {
  it("should select single primitive with high confidence", () => {
    const primitives: Primitive[] = [
      {
        type: "agent",
        id: "agent-1",
        name: "Agent 1",
        description: "An agent",
      },
    ];

    const result = selectPrimitiveByHeuristics("task", primitives);

    expect(result.primitive.id).toBe("agent-1");
    expect(result.confidence).toBe(1.0);
  });

  it("should select best matching primitive", () => {
    const primitives: Primitive[] = [
      {
        type: "agent",
        id: "writer",
        name: "Writer",
        description: "Writes content",
      },
      {
        type: "agent",
        id: "researcher",
        name: "Research Agent",
        description: "Researches topics",
      },
    ];

    const result = selectPrimitiveByHeuristics(
      "research the topic",
      primitives,
    );

    expect(result.primitive.id).toBe("researcher");
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("should throw error for empty primitives", () => {
    expect(() => selectPrimitiveByHeuristics("task", [])).toThrow(
      "No primitives available",
    );
  });

  it("should return confidence between 0.5 and 0.9", () => {
    const primitives: Primitive[] = [
      {
        type: "agent",
        id: "agent-1",
        name: "Agent 1",
        description: "Does things",
      },
      {
        type: "agent",
        id: "agent-2",
        name: "Agent 2",
        description: "Does other things",
      },
    ];

    const result = selectPrimitiveByHeuristics("unrelated task", primitives);

    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    expect(result.confidence).toBeLessThanOrEqual(0.9);
  });
});
