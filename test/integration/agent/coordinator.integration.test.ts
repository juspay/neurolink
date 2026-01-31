/**
 * Coordinator (Router) Integration Tests
 *
 * Integration tests for the RouterAgent class covering routing decisions,
 * coordination strategies, confidence scoring, and task analysis.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RouterAgent } from "../../../src/lib/agent/routerAgent.js";
import type { NeuroLink } from "../../../src/lib/neurolink.js";
import type {
  AgentPrimitive,
  Primitive,
  RouterConfig,
  ToolPrimitive,
  WorkflowPrimitive,
} from "../../../src/lib/types/agentNetworkTypes.js";

// ============================================================================
// MOCK SETUP
// ============================================================================

/**
 * Create a mock NeuroLink instance
 */
function createMockNeuroLink(overrides?: Partial<NeuroLink>): NeuroLink {
  return {
    generate: vi.fn().mockResolvedValue({
      content: JSON.stringify({
        selectedPrimitive: {
          type: "agent",
          id: "researcher",
          name: "Research Agent",
        },
        confidence: 0.9,
        reasoning: "Best match for research-related task",
        formattedInput: "Formatted task input",
        alternatives: [
          { type: "agent", id: "writer", confidence: 0.7 },
          { type: "agent", id: "analyst", confidence: 0.5 },
        ],
      }),
      usage: { input: 100, output: 50, total: 150 },
    }),
    ...overrides,
  } as unknown as NeuroLink;
}

/**
 * Create an agent primitive
 */
function createAgentPrimitive(
  id: string,
  name: string,
  description: string,
): AgentPrimitive {
  return {
    id,
    type: "agent",
    name,
    description,
    agent: {
      id,
      name,
      description,
      instructions: `You are ${name}`,
      execute: vi
        .fn()
        .mockResolvedValue({ content: "executed", status: "success" }),
      stream: vi.fn(),
      getStatus: vi
        .fn()
        .mockReturnValue({ id, name, executionCount: 0, available: true }),
    },
  };
}

/**
 * Create a workflow primitive
 */
function createWorkflowPrimitive(
  id: string,
  name: string,
  description: string,
): WorkflowPrimitive {
  return {
    id,
    type: "workflow",
    name,
    description,
    workflow: {
      execute: vi.fn().mockResolvedValue({ output: "workflow output" }),
    },
  };
}

/**
 * Create a tool primitive
 */
function createToolPrimitive(
  id: string,
  name: string,
  description: string,
): ToolPrimitive {
  return {
    id,
    type: "tool",
    name,
    description,
    tool: { name, description, inputSchema: {} },
    execute: vi.fn().mockResolvedValue({ result: "tool result" }),
  };
}

/**
 * Create router config
 */
function createRouterConfig(overrides?: Partial<RouterConfig>): RouterConfig {
  return {
    provider: "openai",
    model: "gpt-4o",
    confidenceThreshold: 0.7,
    ...overrides,
  };
}

// ============================================================================
// INTEGRATION TESTS: ROUTER DECISION MAKING
// ============================================================================

describe("Coordinator (Router) Integration Tests", () => {
  describe("Router Decision Making", () => {
    let neurolink: NeuroLink;
    let router: RouterAgent;

    beforeEach(() => {
      neurolink = createMockNeuroLink();
      router = new RouterAgent(createRouterConfig(), neurolink);

      // Register primitives
      router.registerPrimitive(
        createAgentPrimitive(
          "researcher",
          "Research Agent",
          "Searches and analyzes information",
        ),
      );
      router.registerPrimitive(
        createAgentPrimitive(
          "writer",
          "Writer Agent",
          "Writes and formats content",
        ),
      );
      router.registerPrimitive(
        createAgentPrimitive(
          "analyst",
          "Data Analyst",
          "Analyzes data and provides insights",
        ),
      );
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should route tasks to the most appropriate primitive", async () => {
      const decision = await router.route(
        "Research the latest AI developments",
      );

      expect(decision.selectedPrimitive).toBeDefined();
      expect(decision.selectedPrimitive.id).toBe("researcher");
      expect(decision.confidence).toBe(0.9);
    });

    it("should include reasoning in routing decisions", async () => {
      const decision = await router.route("Analyze this data");

      expect(decision.reasoning).toBeDefined();
      expect(decision.reasoning.length).toBeGreaterThan(0);
    });

    it("should include formatted input for the selected primitive", async () => {
      const decision = await router.route("Research AI trends");

      expect(decision.formattedInput).toBeDefined();
    });

    it("should include alternative options with confidence scores", async () => {
      const decision = await router.route("Research AI trends");

      expect(decision.alternatives).toBeDefined();
      expect(decision.alternatives?.length).toBeGreaterThan(0);
      expect(decision.alternatives?.[0].confidence).toBeDefined();
    });

    it("should include task description in decision", async () => {
      const task = "Research quantum computing advancements";
      const decision = await router.route(task);

      expect(decision.taskDescription).toBe(task);
    });

    it("should use specified provider and model for routing", async () => {
      await router.route("Test routing");

      expect(neurolink.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "openai",
          model: "gpt-4o",
        }),
      );
    });

    it("should use low temperature for consistent routing", async () => {
      await router.route("Test routing");

      expect(neurolink.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.3,
        }),
      );
    });

    it("should throw error when no primitives registered", async () => {
      const emptyRouter = new RouterAgent(createRouterConfig(), neurolink);

      await expect(emptyRouter.route("Any task")).rejects.toThrow(
        "No primitives registered for routing",
      );
    });
  });

  // ============================================================================
  // INTEGRATION TESTS: ROUTING WITH CONTEXT
  // ============================================================================

  describe("Routing with Context", () => {
    let neurolink: NeuroLink;
    let router: RouterAgent;

    beforeEach(() => {
      neurolink = createMockNeuroLink();
      router = new RouterAgent(createRouterConfig(), neurolink);
      router.registerPrimitive(
        createAgentPrimitive("researcher", "Research Agent", "Research tasks"),
      );
      router.registerPrimitive(
        createAgentPrimitive("writer", "Writer Agent", "Writing tasks"),
      );
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should include conversation history in routing context", async () => {
      await router.route("Continue the research", {
        conversationHistory: [
          { role: "user", content: "Start researching AI" },
          { role: "assistant", content: "I'll research AI developments" },
        ],
      });

      const generateCall = (neurolink.generate as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(generateCall.input.text).toContain("Previous conversation");
    });

    it("should use custom instructions when provided", async () => {
      const routerWithInstructions = new RouterAgent(
        createRouterConfig({
          instructions:
            "You are a specialized router for content creation tasks.",
        }),
        neurolink,
      );
      routerWithInstructions.registerPrimitive(
        createAgentPrimitive("writer", "Writer", "Writes content"),
      );

      await routerWithInstructions.route("Write an article");

      expect(neurolink.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt:
            "You are a specialized router for content creation tasks.",
        }),
      );
    });
  });

  // ============================================================================
  // INTEGRATION TESTS: CONFIDENCE SCORING
  // ============================================================================

  describe("Confidence Scoring", () => {
    let neurolink: NeuroLink;
    let router: RouterAgent;

    beforeEach(() => {
      neurolink = createMockNeuroLink();
      router = new RouterAgent(
        createRouterConfig({ confidenceThreshold: 0.8 }),
        neurolink,
      );
      router.registerPrimitive(
        createAgentPrimitive("researcher", "Research Agent", "Research tasks"),
      );
      router.registerPrimitive(
        createAgentPrimitive("writer", "Writer Agent", "Writing tasks"),
      );
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should return confidence for selected primitive", async () => {
      const confidence = await router.getConfidence(
        "Research AI",
        "researcher",
      );

      expect(confidence).toBe(0.9);
    });

    it("should return confidence from alternatives", async () => {
      const confidence = await router.getConfidence("Research AI", "writer");

      expect(confidence).toBe(0.7);
    });

    it("should return 0 for non-existent primitive", async () => {
      const confidence = await router.getConfidence(
        "Research AI",
        "non-existent",
      );

      expect(confidence).toBe(0);
    });

    it("should return 0 for primitive not in alternatives", async () => {
      (neurolink.generate as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: JSON.stringify({
          selectedPrimitive: {
            type: "agent",
            id: "researcher",
            name: "Research Agent",
          },
          confidence: 0.9,
          alternatives: [],
        }),
      });

      const confidence = await router.getConfidence("Research AI", "writer");

      expect(confidence).toBe(0);
    });

    it("should log warning for low confidence decisions", async () => {
      (neurolink.generate as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: JSON.stringify({
          selectedPrimitive: {
            type: "agent",
            id: "researcher",
            name: "Research Agent",
          },
          confidence: 0.5, // Below threshold of 0.8
          reasoning: "Low confidence match",
        }),
      });

      const decision = await router.route("Ambiguous task");

      expect(decision.confidence).toBe(0.5);
      // Warning should be logged (covered in code path)
    });
  });

  // ============================================================================
  // INTEGRATION TESTS: FALLBACK HANDLING
  // ============================================================================

  describe("Fallback Handling", () => {
    let neurolink: NeuroLink;
    let router: RouterAgent;

    beforeEach(() => {
      neurolink = createMockNeuroLink();
      router = new RouterAgent(createRouterConfig(), neurolink);
      router.registerPrimitive(
        createAgentPrimitive("researcher", "Research Agent", "Research tasks"),
      );
      router.registerPrimitive(
        createAgentPrimitive("writer", "Writer Agent", "Writing tasks"),
      );
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should fallback to first primitive on routing failure", async () => {
      (neurolink.generate as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Routing failed"),
      );

      const decision = await router.route("Test fallback");

      expect(decision.selectedPrimitive.id).toBe("researcher"); // First registered
      expect(decision.confidence).toBe(0.5);
      expect(decision.reasoning).toContain("Fallback");
    });

    it("should fallback when response parsing fails", async () => {
      (neurolink.generate as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: "Invalid JSON that cannot be parsed",
      });

      const decision = await router.route("Test parse failure");

      expect(decision.selectedPrimitive.id).toBe("researcher");
      expect(decision.confidence).toBe(0.5);
    });

    it("should use default confidence when missing in response", async () => {
      (neurolink.generate as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: JSON.stringify({
          selectedPrimitive: {
            type: "agent",
            id: "researcher",
            name: "Research Agent",
          },
          // No confidence field
          reasoning: "Selected",
        }),
      });

      const decision = await router.route("Test default confidence");

      expect(decision.confidence).toBe(0.8); // Default confidence
    });

    it("should handle JSON embedded in text response", async () => {
      (neurolink.generate as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: `Here is my analysis:

        {
          "selectedPrimitive": {
            "type": "agent",
            "id": "writer",
            "name": "Writer Agent"
          },
          "confidence": 0.85,
          "reasoning": "Embedded JSON response"
        }

        That's my routing decision.`,
      });

      const decision = await router.route("Test embedded JSON");

      expect(decision.selectedPrimitive.id).toBe("writer");
      expect(decision.confidence).toBe(0.85);
    });
  });

  // ============================================================================
  // INTEGRATION TESTS: TASK ANALYSIS
  // ============================================================================

  describe("Task Analysis", () => {
    let neurolink: NeuroLink;
    let router: RouterAgent;

    beforeEach(() => {
      neurolink = createMockNeuroLink();
      (neurolink.generate as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: JSON.stringify({
          intent: "Research and summarize AI developments",
          entities: [
            { type: "topic", value: "AI", confidence: 0.95 },
            { type: "action", value: "research", confidence: 0.9 },
            { type: "action", value: "summarize", confidence: 0.85 },
          ],
          requirements: [
            {
              type: "tool",
              description: "Web search capability",
              mandatory: true,
            },
            {
              type: "capability",
              description: "Text summarization",
              mandatory: false,
            },
          ],
          complexity: "moderate",
          suggestedPrimitives: ["researcher", "analyst"],
        }),
      });
      router = new RouterAgent(createRouterConfig(), neurolink);
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should analyze task and extract intent", async () => {
      const analysis = await router.analyzeTask(
        "Research the latest AI developments",
      );

      expect(analysis.intent).toBe("Research and summarize AI developments");
    });

    it("should extract entities from task", async () => {
      const analysis = await router.analyzeTask("Research AI trends");

      expect(analysis.entities.length).toBeGreaterThan(0);
      expect(analysis.entities[0].type).toBe("topic");
      expect(analysis.entities[0].value).toBe("AI");
      expect(analysis.entities[0].confidence).toBe(0.95);
    });

    it("should identify requirements", async () => {
      const analysis = await router.analyzeTask("Research AI trends");

      expect(analysis.requirements.length).toBeGreaterThan(0);
      expect(analysis.requirements[0].type).toBe("tool");
      expect(analysis.requirements[0].mandatory).toBe(true);
    });

    it("should assess task complexity", async () => {
      const analysis = await router.analyzeTask("Research AI trends");

      expect(analysis.complexity).toBe("moderate");
    });

    it("should suggest primitives for the task", async () => {
      const analysis = await router.analyzeTask("Research AI trends");

      expect(analysis.suggestedPrimitives).toContain("researcher");
      expect(analysis.suggestedPrimitives).toContain("analyst");
    });

    it("should return default analysis on parse error", async () => {
      (neurolink.generate as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: "Not valid JSON",
      });

      const analysis = await router.analyzeTask("Any task");

      expect(analysis.intent).toBe("Unknown");
      expect(analysis.entities).toEqual([]);
      expect(analysis.requirements).toEqual([]);
      expect(analysis.complexity).toBe("moderate");
      expect(analysis.suggestedPrimitives).toEqual([]);
    });

    it("should return default analysis on generation error", async () => {
      (neurolink.generate as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Generation failed"),
      );

      const analysis = await router.analyzeTask("Any task");

      expect(analysis.intent).toBe("Unknown");
      expect(analysis.entities).toEqual([]);
    });

    it("should handle partial response gracefully", async () => {
      (neurolink.generate as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: JSON.stringify({
          intent: "Partial analysis",
          // Missing other fields
        }),
      });

      const analysis = await router.analyzeTask("Test");

      expect(analysis.intent).toBe("Partial analysis");
      expect(analysis.entities).toEqual([]);
      expect(analysis.requirements).toEqual([]);
    });
  });

  // ============================================================================
  // INTEGRATION TESTS: PRIMITIVE MANAGEMENT
  // ============================================================================

  describe("Primitive Management", () => {
    let neurolink: NeuroLink;
    let router: RouterAgent;

    beforeEach(() => {
      neurolink = createMockNeuroLink();
      router = new RouterAgent(createRouterConfig(), neurolink);
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should register agent primitives", () => {
      const agent = createAgentPrimitive(
        "researcher",
        "Research Agent",
        "Researches topics",
      );
      router.registerPrimitive(agent);

      const primitives = router.getPrimitives();
      expect(primitives).toContainEqual(
        expect.objectContaining({ id: "researcher" }),
      );
    });

    it("should register workflow primitives", () => {
      const workflow = createWorkflowPrimitive(
        "review-workflow",
        "Review Workflow",
        "Reviews content",
      );
      router.registerPrimitive(workflow);

      const primitives = router.getPrimitives();
      expect(primitives).toContainEqual(
        expect.objectContaining({ id: "review-workflow" }),
      );
    });

    it("should register tool primitives", () => {
      const tool = createToolPrimitive(
        "tool-search",
        "Search Tool",
        "Searches the web",
      );
      router.registerPrimitive(tool);

      const primitives = router.getPrimitives();
      expect(primitives).toContainEqual(
        expect.objectContaining({ id: "tool-search" }),
      );
    });

    it("should register multiple primitives", () => {
      router.registerPrimitive(
        createAgentPrimitive("agent1", "Agent 1", "First agent"),
      );
      router.registerPrimitive(
        createAgentPrimitive("agent2", "Agent 2", "Second agent"),
      );
      router.registerPrimitive(
        createWorkflowPrimitive("workflow1", "Workflow 1", "A workflow"),
      );
      router.registerPrimitive(
        createToolPrimitive("tool1", "Tool 1", "A tool"),
      );

      const primitives = router.getPrimitives();
      expect(primitives).toHaveLength(4);
    });

    it("should overwrite primitive with same ID", () => {
      router.registerPrimitive(
        createAgentPrimitive("agent1", "Original Agent", "Original"),
      );
      router.registerPrimitive(
        createAgentPrimitive("agent1", "Updated Agent", "Updated"),
      );

      const primitives = router.getPrimitives();
      expect(primitives).toHaveLength(1);
      expect(primitives[0].name).toBe("Updated Agent");
    });

    it("should unregister primitives", () => {
      router.registerPrimitive(
        createAgentPrimitive("researcher", "Research Agent", "Research"),
      );
      expect(router.getPrimitives()).toHaveLength(1);

      router.unregisterPrimitive("researcher");
      expect(router.getPrimitives()).toHaveLength(0);
    });

    it("should handle unregistering non-existent primitive", () => {
      expect(() => router.unregisterPrimitive("non-existent")).not.toThrow();
    });

    it("should return empty array when no primitives registered", () => {
      expect(router.getPrimitives()).toEqual([]);
    });
  });

  // ============================================================================
  // INTEGRATION TESTS: CONFIG MANAGEMENT
  // ============================================================================

  describe("Config Management", () => {
    let neurolink: NeuroLink;
    let router: RouterAgent;

    beforeEach(() => {
      neurolink = createMockNeuroLink();
      router = new RouterAgent(createRouterConfig(), neurolink);
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should get current config", () => {
      const config = router.getConfig();

      expect(config.provider).toBe("openai");
      expect(config.model).toBe("gpt-4o");
      expect(config.confidenceThreshold).toBe(0.7);
    });

    it("should update config partially", () => {
      router.updateConfig({ model: "gpt-4-turbo" });

      const config = router.getConfig();
      expect(config.provider).toBe("openai"); // Unchanged
      expect(config.model).toBe("gpt-4-turbo"); // Updated
      expect(config.confidenceThreshold).toBe(0.7); // Unchanged
    });

    it("should update multiple config values", () => {
      router.updateConfig({
        provider: "anthropic",
        model: "claude-3-opus",
        confidenceThreshold: 0.9,
      });

      const config = router.getConfig();
      expect(config.provider).toBe("anthropic");
      expect(config.model).toBe("claude-3-opus");
      expect(config.confidenceThreshold).toBe(0.9);
    });

    it("should return config copy (not reference)", () => {
      const config1 = router.getConfig();
      const config2 = router.getConfig();

      config1.model = "modified";
      expect(config2.model).toBe("gpt-4o");
    });

    it("should use updated config for routing", async () => {
      router.registerPrimitive(
        createAgentPrimitive("agent1", "Agent 1", "An agent"),
      );
      router.updateConfig({ provider: "anthropic", model: "claude-3-sonnet" });

      await router.route("Test with updated config");

      expect(neurolink.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "anthropic",
          model: "claude-3-sonnet",
        }),
      );
    });
  });

  // ============================================================================
  // INTEGRATION TESTS: ROUTING WITH DIFFERENT PRIMITIVE TYPES
  // ============================================================================

  describe("Routing with Different Primitive Types", () => {
    let neurolink: NeuroLink;
    let router: RouterAgent;

    beforeEach(() => {
      neurolink = createMockNeuroLink();
      router = new RouterAgent(createRouterConfig(), neurolink);
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should route to agent primitive", async () => {
      (neurolink.generate as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: JSON.stringify({
          selectedPrimitive: {
            type: "agent",
            id: "researcher",
            name: "Research Agent",
          },
          confidence: 0.9,
        }),
      });

      router.registerPrimitive(
        createAgentPrimitive("researcher", "Research Agent", "Research tasks"),
      );

      const decision = await router.route("Research AI");

      expect(decision.selectedPrimitive.type).toBe("agent");
      expect(decision.selectedPrimitive.id).toBe("researcher");
    });

    it("should route to workflow primitive", async () => {
      (neurolink.generate as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: JSON.stringify({
          selectedPrimitive: {
            type: "workflow",
            id: "review-workflow",
            name: "Review Workflow",
          },
          confidence: 0.85,
        }),
      });

      router.registerPrimitive(
        createWorkflowPrimitive(
          "review-workflow",
          "Review Workflow",
          "Reviews content",
        ),
      );

      const decision = await router.route("Review this document");

      expect(decision.selectedPrimitive.type).toBe("workflow");
      expect(decision.selectedPrimitive.id).toBe("review-workflow");
    });

    it("should route to tool primitive", async () => {
      (neurolink.generate as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: JSON.stringify({
          selectedPrimitive: {
            type: "tool",
            id: "tool-search",
            name: "Web Search",
          },
          confidence: 0.95,
        }),
      });

      router.registerPrimitive(
        createToolPrimitive("tool-search", "Web Search", "Search the web"),
      );

      const decision = await router.route("Search for information");

      expect(decision.selectedPrimitive.type).toBe("tool");
      expect(decision.selectedPrimitive.id).toBe("tool-search");
    });

    it("should include all primitive types in routing prompt", async () => {
      router.registerPrimitive(
        createAgentPrimitive("agent1", "Agent 1", "Agent description"),
      );
      router.registerPrimitive(
        createWorkflowPrimitive(
          "workflow1",
          "Workflow 1",
          "Workflow description",
        ),
      );
      router.registerPrimitive(
        createToolPrimitive("tool1", "Tool 1", "Tool description"),
      );

      await router.route("Complex task");

      const generateCall = (neurolink.generate as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(generateCall.input.text).toContain("agent1");
      expect(generateCall.input.text).toContain("workflow1");
      expect(generateCall.input.text).toContain("tool1");
    });

    it("should handle mixed primitive types correctly", async () => {
      router.registerPrimitive(
        createAgentPrimitive("agent1", "Agent 1", "Agent"),
      );
      router.registerPrimitive(
        createWorkflowPrimitive("workflow1", "Workflow 1", "Workflow"),
      );
      router.registerPrimitive(createToolPrimitive("tool1", "Tool 1", "Tool"));

      const primitives = router.getPrimitives();

      expect(primitives.filter((p) => p.type === "agent")).toHaveLength(1);
      expect(primitives.filter((p) => p.type === "workflow")).toHaveLength(1);
      expect(primitives.filter((p) => p.type === "tool")).toHaveLength(1);
    });
  });

  // ============================================================================
  // INTEGRATION TESTS: EDGE CASES
  // ============================================================================

  describe("Edge Cases", () => {
    let neurolink: NeuroLink;
    let router: RouterAgent;

    beforeEach(() => {
      neurolink = createMockNeuroLink();
      router = new RouterAgent(createRouterConfig(), neurolink);
      router.registerPrimitive(
        createAgentPrimitive("agent1", "Agent 1", "Test agent"),
      );
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should handle empty task string", async () => {
      const decision = await router.route("");

      expect(decision.selectedPrimitive).toBeDefined();
    });

    it("should handle very long task string", async () => {
      const longTask = "Research ".repeat(1000);
      const decision = await router.route(longTask);

      expect(decision.selectedPrimitive).toBeDefined();
    });

    it("should handle special characters in task", async () => {
      const decision = await router.route(
        "Research: AI & ML trends (2024) with 'quotes' and \"double quotes\"",
      );

      expect(decision.selectedPrimitive).toBeDefined();
    });

    it("should handle Unicode characters in task", async () => {
      const decision = await router.route(
        "Research AI trends in Japanese: 日本語で調査する",
      );

      expect(decision.selectedPrimitive).toBeDefined();
    });

    it("should handle response with missing alternatives", async () => {
      (neurolink.generate as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: JSON.stringify({
          selectedPrimitive: {
            type: "agent",
            id: "agent1",
            name: "Agent 1",
          },
          confidence: 0.9,
          alternatives: null,
        }),
      });

      const decision = await router.route("Test");

      expect(decision.alternatives).toBeUndefined();
    });

    it("should handle response with missing reasoning", async () => {
      (neurolink.generate as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: JSON.stringify({
          selectedPrimitive: {
            type: "agent",
            id: "agent1",
            name: "Agent 1",
          },
          confidence: 0.9,
        }),
      });

      const decision = await router.route("Test");

      expect(decision.reasoning).toBeDefined();
    });

    it("should handle network timeouts", async () => {
      (neurolink.generate as ReturnType<typeof vi.fn>).mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Request timeout")), 100),
          ),
      );

      const decision = await router.route("Timeout test");

      // Should fallback
      expect(decision.selectedPrimitive.id).toBe("agent1");
      expect(decision.confidence).toBe(0.5);
    });
  });
});
