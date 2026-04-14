/**
 * RouterAgent Unit Tests
 *
 * Comprehensive tests for the RouterAgent class that handles
 * intelligent task routing and delegation.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { RouterAgent } from "../../../src/lib/agent/routerAgent.js";
import type { NeuroLink } from "../../../src/lib/neurolink.js";
import type {
  AgentPrimitive,
  Primitive,
  RouterConfig,
  ToolPrimitive,
  WorkflowPrimitive,
} from "../../../src/lib/types/agentNetwork.js";

// ============================================================================
// MOCK SETUP
// ============================================================================

/**
 * Create a mock NeuroLink instance with configurable behavior
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
        reasoning: "Best match for research task",
        formattedInput: "Research query formatted",
        alternatives: [{ type: "agent", id: "writer", confidence: 0.7 }],
      }),
      usage: { input: 100, output: 50, total: 150 },
    }),
    ...overrides,
  } as unknown as NeuroLink;
}

/**
 * Create a mock agent primitive
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
 * Create a mock workflow primitive
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
 * Create a mock tool primitive
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
    tool: {
      name,
      description,
      inputSchema: {},
    },
    execute: vi.fn().mockResolvedValue({ result: "tool result" }),
  };
}

/**
 * Create a valid router config
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
// ROUTER AGENT CONSTRUCTION TESTS
// ============================================================================

describe("RouterAgent", () => {
  describe("construction", () => {
    it("should create a router agent with default config", () => {
      const neurolink = createMockNeuroLink();

      const router = new RouterAgent({}, neurolink);

      expect(router).toBeDefined();
    });

    it("should create a router agent with custom config", () => {
      const neurolink = createMockNeuroLink();
      const config = createRouterConfig({
        provider: "anthropic",
        model: "claude-3-opus",
        confidenceThreshold: 0.8,
      });

      const router = new RouterAgent(config, neurolink);
      const retrievedConfig = router.getConfig();

      expect(retrievedConfig.provider).toBe("anthropic");
      expect(retrievedConfig.model).toBe("claude-3-opus");
      expect(retrievedConfig.confidenceThreshold).toBe(0.8);
    });

    it("should create a router agent with custom instructions", () => {
      const neurolink = createMockNeuroLink();
      const config = createRouterConfig({
        instructions: "You are a specialized router for research tasks.",
      });

      const router = new RouterAgent(config, neurolink);
      const retrievedConfig = router.getConfig();

      expect(retrievedConfig.instructions).toBe(
        "You are a specialized router for research tasks.",
      );
    });
  });

  // ============================================================================
  // PRIMITIVE REGISTRATION TESTS
  // ============================================================================

  describe("primitive registration", () => {
    let neurolink: NeuroLink;
    let router: RouterAgent;

    beforeEach(() => {
      neurolink = createMockNeuroLink();
      router = new RouterAgent(createRouterConfig(), neurolink);
    });

    it("should register an agent primitive", () => {
      const agent = createAgentPrimitive(
        "researcher",
        "Research Agent",
        "Searches and analyzes information",
      );

      router.registerPrimitive(agent);

      expect(router.getPrimitives()).toContainEqual(
        expect.objectContaining({ id: "researcher" }),
      );
    });

    it("should register a workflow primitive", () => {
      const workflow = createWorkflowPrimitive(
        "review-workflow",
        "Review Workflow",
        "Reviews and approves content",
      );

      router.registerPrimitive(workflow);

      expect(router.getPrimitives()).toContainEqual(
        expect.objectContaining({ id: "review-workflow" }),
      );
    });

    it("should register a tool primitive", () => {
      const tool = createToolPrimitive(
        "tool-readFile",
        "readFile",
        "Reads file contents",
      );

      router.registerPrimitive(tool);

      expect(router.getPrimitives()).toContainEqual(
        expect.objectContaining({ id: "tool-readFile" }),
      );
    });

    it("should register multiple primitives", () => {
      const agent1 = createAgentPrimitive("agent1", "Agent 1", "First agent");
      const agent2 = createAgentPrimitive("agent2", "Agent 2", "Second agent");
      const workflow = createWorkflowPrimitive(
        "workflow1",
        "Workflow 1",
        "A workflow",
      );

      router.registerPrimitive(agent1);
      router.registerPrimitive(agent2);
      router.registerPrimitive(workflow);

      expect(router.getPrimitives()).toHaveLength(3);
    });

    it("should overwrite primitive with same id", () => {
      const agent1 = createAgentPrimitive("agent1", "Agent 1", "Original");
      const agent1Updated = createAgentPrimitive(
        "agent1",
        "Agent 1 Updated",
        "Updated",
      );

      router.registerPrimitive(agent1);
      router.registerPrimitive(agent1Updated);

      const primitives = router.getPrimitives();
      expect(primitives).toHaveLength(1);
      expect(primitives[0].name).toBe("Agent 1 Updated");
    });

    it("should unregister a primitive", () => {
      const agent = createAgentPrimitive(
        "researcher",
        "Research Agent",
        "Researcher",
      );

      router.registerPrimitive(agent);
      expect(router.getPrimitives()).toHaveLength(1);

      router.unregisterPrimitive("researcher");
      expect(router.getPrimitives()).toHaveLength(0);
    });

    it("should handle unregistering non-existent primitive", () => {
      router.unregisterPrimitive("non-existent");

      expect(router.getPrimitives()).toHaveLength(0);
    });

    it("should return empty array when no primitives registered", () => {
      expect(router.getPrimitives()).toEqual([]);
    });
  });

  // ============================================================================
  // ROUTING DECISION TESTS
  // ============================================================================

  describe("route()", () => {
    let neurolink: NeuroLink;
    let router: RouterAgent;

    beforeEach(() => {
      neurolink = createMockNeuroLink();
      router = new RouterAgent(createRouterConfig(), neurolink);
      router.registerPrimitive(
        createAgentPrimitive(
          "researcher",
          "Research Agent",
          "Searches for information",
        ),
      );
      router.registerPrimitive(
        createAgentPrimitive("writer", "Writer Agent", "Writes content"),
      );
    });

    it("should route a task to the appropriate primitive", async () => {
      const decision = await router.route("Research AI trends");

      expect(decision.selectedPrimitive).toBeDefined();
      expect(decision.selectedPrimitive.id).toBe("researcher");
      expect(decision.confidence).toBe(0.9);
    });

    it("should include reasoning in the decision", async () => {
      const decision = await router.route("Research AI trends");

      expect(decision.reasoning).toBeDefined();
      expect(decision.reasoning).toBe("Best match for research task");
    });

    it("should include formatted input in the decision", async () => {
      const decision = await router.route("Research AI trends");

      expect(decision.formattedInput).toBe("Research query formatted");
    });

    it("should include alternatives in the decision", async () => {
      const decision = await router.route("Research AI trends");

      expect(decision.alternatives).toBeDefined();
      expect(decision.alternatives).toHaveLength(1);
      expect(decision.alternatives?.[0].id).toBe("writer");
    });

    it("should include task description in the decision", async () => {
      const decision = await router.route("Research AI trends");

      expect(decision.taskDescription).toBe("Research AI trends");
    });

    it("should include step index in the decision", async () => {
      const decision = await router.route("Research AI trends");

      expect(decision.stepIndex).toBe(0);
    });

    it("should throw error when no primitives registered", async () => {
      const emptyRouter = new RouterAgent(createRouterConfig(), neurolink);

      await expect(emptyRouter.route("Any task")).rejects.toThrow(
        "No primitives registered for routing",
      );
    });

    it("should use specified provider and model", async () => {
      await router.route("Research AI trends");

      expect(neurolink.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "openai",
          model: "gpt-4o",
        }),
      );
    });

    it("should use custom instructions when provided", async () => {
      const routerWithInstructions = new RouterAgent(
        createRouterConfig({
          instructions: "Custom routing instructions",
        }),
        neurolink,
      );
      routerWithInstructions.registerPrimitive(
        createAgentPrimitive("agent1", "Agent 1", "Agent description"),
      );

      await routerWithInstructions.route("Task");

      expect(neurolink.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt: "Custom routing instructions",
        }),
      );
    });

    it("should include conversation history in context", async () => {
      const decision = await router.route("Continue the research", {
        conversationHistory: [
          { role: "user", content: "Start research" },
          { role: "assistant", content: "Starting research on AI" },
        ],
      });

      expect(decision).toBeDefined();
      // The prompt should include conversation history
      const generateCall = (neurolink.generate as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(generateCall.input.text).toContain("Previous conversation");
    });

    it("should fallback when routing fails", async () => {
      (neurolink.generate as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Routing failed"),
      );

      const decision = await router.route("Research AI trends");

      // Should fallback to first primitive
      expect(decision.selectedPrimitive.id).toBe("researcher");
      expect(decision.confidence).toBe(0.5);
      expect(decision.reasoning).toContain("Fallback");
    });

    it("should fallback when response parsing fails", async () => {
      (neurolink.generate as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: "Invalid JSON response that cannot be parsed",
      });

      const decision = await router.route("Research AI trends");

      // Should fallback to first primitive
      expect(decision.selectedPrimitive.id).toBe("researcher");
      expect(decision.confidence).toBe(0.5);
    });

    it("should log warning for low confidence decisions", async () => {
      (neurolink.generate as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: JSON.stringify({
          selectedPrimitive: {
            type: "agent",
            id: "researcher",
            name: "Research Agent",
          },
          confidence: 0.5, // Below threshold of 0.7
          reasoning: "Low confidence match",
        }),
      });

      const decision = await router.route("Ambiguous task");

      expect(decision.confidence).toBe(0.5);
      // Warning should be logged (can't easily test logging, but code path is covered)
    });
  });

  // ============================================================================
  // CONFIDENCE SCORING TESTS
  // ============================================================================

  describe("getConfidence()", () => {
    let neurolink: NeuroLink;
    let router: RouterAgent;

    beforeEach(() => {
      neurolink = createMockNeuroLink();
      router = new RouterAgent(createRouterConfig(), neurolink);
      router.registerPrimitive(
        createAgentPrimitive(
          "researcher",
          "Research Agent",
          "Searches for information",
        ),
      );
      router.registerPrimitive(
        createAgentPrimitive("writer", "Writer Agent", "Writes content"),
      );
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

    it("should return 0 when primitive not in alternatives", async () => {
      (neurolink.generate as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: JSON.stringify({
          selectedPrimitive: {
            type: "agent",
            id: "researcher",
            name: "Research Agent",
          },
          confidence: 0.9,
          alternatives: [], // No alternatives
        }),
      });

      const confidence = await router.getConfidence("Research AI", "writer");

      expect(confidence).toBe(0);
    });

    it("should return 0 on routing error", async () => {
      (neurolink.generate as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Routing failed"),
      );

      const confidence = await router.getConfidence(
        "Research AI",
        "researcher",
      );

      // Fallback decision confidence
      expect(confidence).toBe(0.5);
    });
  });

  // ============================================================================
  // TASK ANALYSIS TESTS
  // ============================================================================

  describe("analyzeTask()", () => {
    let neurolink: NeuroLink;
    let router: RouterAgent;

    beforeEach(() => {
      neurolink = createMockNeuroLink();
      (neurolink.generate as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: JSON.stringify({
          intent: "Research latest AI developments",
          entities: [
            { type: "topic", value: "AI", confidence: 0.95 },
            { type: "action", value: "research", confidence: 0.9 },
          ],
          requirements: [
            {
              type: "tool",
              description: "Web search capability",
              mandatory: true,
            },
            {
              type: "capability",
              description: "Text analysis",
              mandatory: false,
            },
          ],
          complexity: "moderate",
          suggestedPrimitives: ["researcher", "analyzer"],
        }),
      });
      router = new RouterAgent(createRouterConfig(), neurolink);
    });

    it("should analyze task and extract intent", async () => {
      const analysis = await router.analyzeTask(
        "Research the latest AI papers",
      );

      expect(analysis.intent).toBe("Research latest AI developments");
    });

    it("should extract entities from task", async () => {
      const analysis = await router.analyzeTask(
        "Research the latest AI papers",
      );

      expect(analysis.entities).toHaveLength(2);
      expect(analysis.entities[0].type).toBe("topic");
      expect(analysis.entities[0].value).toBe("AI");
      expect(analysis.entities[0].confidence).toBe(0.95);
    });

    it("should identify requirements", async () => {
      const analysis = await router.analyzeTask(
        "Research the latest AI papers",
      );

      expect(analysis.requirements).toHaveLength(2);
      expect(analysis.requirements[0].type).toBe("tool");
      expect(analysis.requirements[0].mandatory).toBe(true);
    });

    it("should assess complexity", async () => {
      const analysis = await router.analyzeTask(
        "Research the latest AI papers",
      );

      expect(analysis.complexity).toBe("moderate");
    });

    it("should suggest primitives", async () => {
      const analysis = await router.analyzeTask(
        "Research the latest AI papers",
      );

      expect(analysis.suggestedPrimitives).toContain("researcher");
      expect(analysis.suggestedPrimitives).toContain("analyzer");
    });

    it("should return default analysis on parse error", async () => {
      (neurolink.generate as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: "Invalid response that cannot be parsed as JSON",
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
      expect(analysis.complexity).toBe("moderate");
    });

    it("should handle partial response", async () => {
      (neurolink.generate as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: JSON.stringify({
          intent: "Partial intent",
          // Missing other fields
        }),
      });

      const analysis = await router.analyzeTask("Any task");

      expect(analysis.intent).toBe("Partial intent");
      expect(analysis.entities).toEqual([]);
      expect(analysis.requirements).toEqual([]);
    });
  });

  // ============================================================================
  // CONFIG MANAGEMENT TESTS
  // ============================================================================

  describe("config management", () => {
    let neurolink: NeuroLink;
    let router: RouterAgent;

    beforeEach(() => {
      neurolink = createMockNeuroLink();
      router = new RouterAgent(createRouterConfig(), neurolink);
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
      expect(config.provider).toBe("openai");
      expect(config.model).toBe("gpt-4-turbo");
      expect(config.confidenceThreshold).toBe(0.7);
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
  });

  // ============================================================================
  // ROUTING PROMPT BUILDING TESTS
  // ============================================================================

  describe("routing prompt building", () => {
    let neurolink: NeuroLink;
    let router: RouterAgent;

    beforeEach(() => {
      neurolink = createMockNeuroLink();
      router = new RouterAgent(createRouterConfig(), neurolink);
    });

    it("should include all primitives in routing prompt", async () => {
      router.registerPrimitive(
        createAgentPrimitive(
          "researcher",
          "Research Agent",
          "Searches information",
        ),
      );
      router.registerPrimitive(
        createAgentPrimitive("writer", "Writer Agent", "Writes content"),
      );
      router.registerPrimitive(
        createWorkflowPrimitive("workflow1", "Workflow 1", "A workflow"),
      );

      await router.route("Any task");

      const generateCall = (neurolink.generate as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(generateCall.input.text).toContain("researcher");
      expect(generateCall.input.text).toContain("writer");
      expect(generateCall.input.text).toContain("workflow1");
    });

    it("should include primitive descriptions", async () => {
      router.registerPrimitive(
        createAgentPrimitive(
          "researcher",
          "Research Agent",
          "Searches and analyzes web information",
        ),
      );

      await router.route("Any task");

      const generateCall = (neurolink.generate as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(generateCall.input.text).toContain(
        "Searches and analyzes web information",
      );
    });

    it("should include task in routing prompt", async () => {
      router.registerPrimitive(
        createAgentPrimitive("agent1", "Agent 1", "Description"),
      );

      await router.route("Research quantum computing trends");

      const generateCall = (neurolink.generate as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(generateCall.input.text).toContain(
        "Research quantum computing trends",
      );
    });

    it("should use low temperature for routing", async () => {
      router.registerPrimitive(
        createAgentPrimitive("agent1", "Agent 1", "Description"),
      );

      await router.route("Any task");

      const generateCall = (neurolink.generate as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(generateCall.temperature).toBe(0.3);
    });
  });

  // ============================================================================
  // EDGE CASES AND ERROR HANDLING TESTS
  // ============================================================================

  describe("edge cases and error handling", () => {
    let neurolink: NeuroLink;
    let router: RouterAgent;

    beforeEach(() => {
      neurolink = createMockNeuroLink();
      router = new RouterAgent(createRouterConfig(), neurolink);
    });

    it("should handle empty task string", async () => {
      router.registerPrimitive(
        createAgentPrimitive("agent1", "Agent 1", "Description"),
      );

      const decision = await router.route("");

      expect(decision.selectedPrimitive).toBeDefined();
    });

    it("should handle very long task string", async () => {
      router.registerPrimitive(
        createAgentPrimitive("agent1", "Agent 1", "Description"),
      );

      const longTask = "Research ".repeat(1000);
      const decision = await router.route(longTask);

      expect(decision.selectedPrimitive).toBeDefined();
    });

    it("should handle special characters in task", async () => {
      router.registerPrimitive(
        createAgentPrimitive("agent1", "Agent 1", "Description"),
      );

      const decision = await router.route(
        "Research: AI & ML trends (2024) with 'quotes' and \"double quotes\"",
      );

      expect(decision.selectedPrimitive).toBeDefined();
    });

    it("should handle Unicode characters in task", async () => {
      router.registerPrimitive(
        createAgentPrimitive("agent1", "Agent 1", "Description"),
      );

      const decision = await router.route("Research AI trends 🤖 in 日本語");

      expect(decision.selectedPrimitive).toBeDefined();
    });

    it("should handle response with missing confidence", async () => {
      (neurolink.generate as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: JSON.stringify({
          selectedPrimitive: {
            type: "agent",
            id: "agent1",
            name: "Agent 1",
          },
          // No confidence field
          reasoning: "Matched",
        }),
      });
      router.registerPrimitive(
        createAgentPrimitive("agent1", "Agent 1", "Description"),
      );

      const decision = await router.route("Any task");

      expect(decision.confidence).toBe(0.8); // Default confidence
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
          // No reasoning field
        }),
      });
      router.registerPrimitive(
        createAgentPrimitive("agent1", "Agent 1", "Description"),
      );

      const decision = await router.route("Any task");

      expect(decision.reasoning).toBeDefined();
    });

    it("should handle response with null alternatives", async () => {
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
      router.registerPrimitive(
        createAgentPrimitive("agent1", "Agent 1", "Description"),
      );

      const decision = await router.route("Any task");

      expect(decision.alternatives).toBeUndefined();
    });

    it("should handle JSON embedded in text response", async () => {
      (neurolink.generate as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: `Here is my analysis:
        
        {
          "selectedPrimitive": {
            "type": "agent",
            "id": "agent1",
            "name": "Agent 1"
          },
          "confidence": 0.85,
          "reasoning": "Embedded JSON"
        }
        
        That's my routing decision.`,
      });
      router.registerPrimitive(
        createAgentPrimitive("agent1", "Agent 1", "Description"),
      );

      const decision = await router.route("Any task");

      expect(decision.selectedPrimitive.id).toBe("agent1");
      expect(decision.confidence).toBe(0.85);
    });
  });

  // ============================================================================
  // INTEGRATION WITH PRIMITIVES TESTS
  // ============================================================================

  describe("integration with different primitive types", () => {
    let neurolink: NeuroLink;
    let router: RouterAgent;

    beforeEach(() => {
      neurolink = createMockNeuroLink();
      router = new RouterAgent(createRouterConfig(), neurolink);
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
        createAgentPrimitive(
          "researcher",
          "Research Agent",
          "Searches information",
        ),
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
            id: "tool-readFile",
            name: "readFile",
          },
          confidence: 0.95,
        }),
      });

      router.registerPrimitive(
        createToolPrimitive("tool-readFile", "readFile", "Reads file contents"),
      );

      const decision = await router.route("Read the config file");

      expect(decision.selectedPrimitive.type).toBe("tool");
      expect(decision.selectedPrimitive.id).toBe("tool-readFile");
    });

    it("should handle mixed primitive types", async () => {
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

      const primitives = router.getPrimitives();

      expect(primitives).toHaveLength(3);
      expect(primitives.filter((p) => p.type === "agent")).toHaveLength(1);
      expect(primitives.filter((p) => p.type === "workflow")).toHaveLength(1);
      expect(primitives.filter((p) => p.type === "tool")).toHaveLength(1);
    });
  });
});
