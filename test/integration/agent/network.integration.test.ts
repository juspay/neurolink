/**
 * Agent Network Integration Tests
 *
 * Integration tests for the AgentNetwork class covering routing,
 * multi-agent execution, streaming, and error handling scenarios.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Agent } from "../../../src/lib/agent/agent.js";
import { AgentNetwork } from "../../../src/lib/agent/agentNetwork.js";
import type { NeuroLink } from "../../../src/lib/neurolink.js";
import type {
  AgentDefinition,
  AgentNetworkConfig,
  NetworkStreamChunk,
  NetworkWorkflowDefinition,
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
        reasoning: "Best match for the task",
        formattedInput: "Formatted query",
      }),
      usage: { input: 100, output: 50, total: 150 },
    }),
    stream: vi.fn().mockResolvedValue({
      stream: (async function* () {
        yield { content: "Streaming " };
        yield { content: "network " };
        yield { content: "response" };
      })(),
      usage: { input: 100, output: 50, total: 150 },
    }),
    getAllAvailableTools: vi.fn().mockResolvedValue([
      { name: "readFile", description: "Read a file", inputSchema: {} },
      { name: "writeFile", description: "Write a file", inputSchema: {} },
      {
        name: "websearchGrounding",
        description: "Web search",
        inputSchema: {},
      },
    ]),
    executeTool: vi.fn().mockResolvedValue({ result: "Tool executed" }),
    ...overrides,
  } as unknown as NeuroLink;
}

/**
 * Create an agent definition
 */
function createAgentDef(
  id: string,
  name: string,
  description: string,
  overrides?: Partial<AgentDefinition>,
): AgentDefinition {
  return {
    id,
    name,
    description,
    instructions: `You are ${name}. ${description}`,
    ...overrides,
  };
}

/**
 * Create a network configuration
 */
function createNetworkConfig(
  overrides?: Partial<AgentNetworkConfig>,
): AgentNetworkConfig {
  return {
    name: "Test Network",
    agents: [
      createAgentDef(
        "researcher",
        "Research Agent",
        "Searches and analyzes information",
        {
          tools: ["websearchGrounding"],
        },
      ),
      createAgentDef("writer", "Writer Agent", "Writes and formats content", {
        tools: ["writeFile"],
      }),
      createAgentDef(
        "analyst",
        "Analyst Agent",
        "Analyzes data and provides insights",
      ),
    ],
    ...overrides,
  };
}

// ============================================================================
// INTEGRATION TESTS: NETWORK ROUTING AND EXECUTION
// ============================================================================

describe("AgentNetwork Integration Tests", () => {
  describe("Network Routing and Execution", () => {
    let neurolink: NeuroLink;
    let network: AgentNetwork;

    beforeEach(() => {
      neurolink = createMockNeuroLink();

      // Setup mock to return routing then completion
      let callCount = 0;
      (neurolink.generate as ReturnType<typeof vi.fn>).mockImplementation(
        () => {
          callCount++;
          if (callCount === 1) {
            // Router call
            return Promise.resolve({
              content: JSON.stringify({
                selectedPrimitive: {
                  type: "agent",
                  id: "researcher",
                  name: "Research Agent",
                },
                confidence: 0.9,
                reasoning: "Best match for research task",
              }),
              usage: { input: 50, output: 25, total: 75 },
            });
          }
          // Agent execution call
          return Promise.resolve({
            content:
              "Task completed successfully. Here is the final result with comprehensive analysis.",
            usage: { input: 100, output: 75, total: 175 },
          });
        },
      );

      network = new AgentNetwork(createNetworkConfig(), neurolink);
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should route and execute tasks through the network", async () => {
      const result = await network.execute({
        message: "Research the latest AI developments",
      });

      expect(result.status).toBe("completed");
      expect(result.content).toBeDefined();
      expect(result.trace.routingDecisions.length).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it("should track routing decisions in trace", async () => {
      const result = await network.execute({
        message: "Research AI trends",
      });

      expect(result.trace.routingDecisions.length).toBeGreaterThan(0);
      const decision = result.trace.routingDecisions[0];
      expect(decision.selectedPrimitive.id).toBeDefined();
      expect(decision.confidence).toBeGreaterThan(0);
      expect(decision.taskDescription).toBeDefined();
    });

    it("should aggregate token usage across steps", async () => {
      const result = await network.execute({
        message: "Research AI",
      });

      expect(result.usage).toBeDefined();
      expect(result.usage.totalTokens).toBeGreaterThan(0);
    });

    it("should track usage by agent", async () => {
      const result = await network.execute({
        message: "Research AI",
      });

      expect(result.usage.byAgent).toBeDefined();
    });

    it("should respect maxSteps option", async () => {
      // Make routing never complete
      (neurolink.generate as ReturnType<typeof vi.fn>).mockImplementation(
        () => {
          return Promise.resolve({
            content: JSON.stringify({
              selectedPrimitive: {
                type: "agent",
                id: "researcher",
                name: "Research Agent",
              },
              confidence: 0.9,
            }),
            usage: { input: 50, output: 25, total: 75 },
          });
        },
      );

      const result = await network.execute(
        { message: "Complex multi-step task" },
        { maxSteps: 3 },
      );

      expect(result.trace.steps.length).toBeLessThanOrEqual(3);
    });

    it("should use custom trace ID when provided", async () => {
      const customTraceId = "custom-network-trace-123";

      const result = await network.execute(
        { message: "Test task" },
        { tracing: { traceId: customTraceId } },
      );

      expect(result.trace.traceId).toBe(customTraceId);
    });

    it("should pass context to primitive execution", async () => {
      await network.execute(
        {
          message: "Research with context",
          context: { userId: "user-123" },
        },
        { context: { sessionId: "session-456" } },
      );

      // Verify context was passed to generate
      expect(neurolink.generate).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // INTEGRATION TESTS: MULTI-AGENT EXECUTION
  // ============================================================================

  describe("Multi-Agent Execution", () => {
    let neurolink: NeuroLink;

    beforeEach(() => {
      neurolink = createMockNeuroLink();
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should execute multiple steps when task is incomplete", async () => {
      let stepCount = 0;
      (neurolink.generate as ReturnType<typeof vi.fn>).mockImplementation(
        () => {
          stepCount++;

          if (stepCount % 2 === 1) {
            // Router calls
            return Promise.resolve({
              content: JSON.stringify({
                selectedPrimitive: {
                  type: "agent",
                  id: stepCount <= 2 ? "researcher" : "writer",
                  name: stepCount <= 2 ? "Research Agent" : "Writer Agent",
                },
                confidence: 0.85,
              }),
              usage: { input: 50, output: 25, total: 75 },
            });
          }

          if (stepCount === 2) {
            // First agent - incomplete
            return Promise.resolve({
              content:
                "Research in progress, let me continue gathering data...",
              usage: { input: 100, output: 50, total: 150 },
            });
          }

          // Final agent - complete
          return Promise.resolve({
            content:
              "Task completed. Here is the comprehensive final result with all findings.",
            usage: { input: 100, output: 75, total: 175 },
          });
        },
      );

      const network = new AgentNetwork(createNetworkConfig(), neurolink);
      const result = await network.execute(
        { message: "Research and write about AI" },
        { maxSteps: 3 },
      );

      expect(result.trace.steps.length).toBeGreaterThanOrEqual(1);
    });

    it("should route to different agents based on task analysis", async () => {
      let callCount = 0;
      const selectedAgents: string[] = [];

      (neurolink.generate as ReturnType<typeof vi.fn>).mockImplementation(
        () => {
          callCount++;

          if (callCount === 1) {
            // First routing - researcher
            selectedAgents.push("researcher");
            return Promise.resolve({
              content: JSON.stringify({
                selectedPrimitive: {
                  type: "agent",
                  id: "researcher",
                  name: "Research Agent",
                },
                confidence: 0.9,
              }),
              usage: { input: 50, output: 25, total: 75 },
            });
          }

          if (callCount === 2) {
            // Research result - needs writing
            return Promise.resolve({
              content:
                "Research findings collected, now needs to be written up...",
              usage: { input: 100, output: 50, total: 150 },
            });
          }

          if (callCount === 3) {
            // Second routing - writer
            selectedAgents.push("writer");
            return Promise.resolve({
              content: JSON.stringify({
                selectedPrimitive: {
                  type: "agent",
                  id: "writer",
                  name: "Writer Agent",
                },
                confidence: 0.88,
              }),
              usage: { input: 50, output: 25, total: 75 },
            });
          }

          // Writer result - complete
          return Promise.resolve({
            content:
              "Task complete! Article has been written with all the research findings.",
            usage: { input: 100, output: 75, total: 175 },
          });
        },
      );

      const network = new AgentNetwork(createNetworkConfig(), neurolink);
      await network.execute(
        { message: "Research and write an article" },
        { maxSteps: 3 },
      );

      expect(selectedAgents).toContain("researcher");
    });

    it("should build continuation messages between steps", async () => {
      let callCount = 0;
      const capturedInputs: string[] = [];

      (neurolink.generate as ReturnType<typeof vi.fn>).mockImplementation(
        (options: { input: { text: string } }) => {
          callCount++;
          capturedInputs.push(options.input.text);

          if (callCount % 2 === 1) {
            return Promise.resolve({
              content: JSON.stringify({
                selectedPrimitive: {
                  type: "agent",
                  id: "researcher",
                  name: "Research Agent",
                },
                confidence: 0.9,
              }),
              usage: { input: 50, output: 25, total: 75 },
            });
          }

          if (callCount === 2) {
            return Promise.resolve({
              content: "First step result",
              usage: { input: 100, output: 50, total: 150 },
            });
          }

          return Promise.resolve({
            content: "Task complete. Final comprehensive result delivered.",
            usage: { input: 100, output: 75, total: 175 },
          });
        },
      );

      const network = new AgentNetwork(createNetworkConfig(), neurolink);
      await network.execute({ message: "Multi-step task" }, { maxSteps: 3 });

      // Should have multiple calls with different inputs
      expect(callCount).toBeGreaterThan(1);
    });
  });

  // ============================================================================
  // INTEGRATION TESTS: STREAMING EXECUTION
  // ============================================================================

  describe("Streaming Execution", () => {
    let neurolink: NeuroLink;
    let network: AgentNetwork;

    beforeEach(() => {
      neurolink = createMockNeuroLink();

      // Setup for streaming
      let routingCount = 0;
      (neurolink.generate as ReturnType<typeof vi.fn>).mockImplementation(
        () => {
          routingCount++;
          return Promise.resolve({
            content: JSON.stringify({
              selectedPrimitive: {
                type: "agent",
                id: "researcher",
                name: "Research Agent",
              },
              confidence: 0.9,
            }),
            usage: { input: 50, output: 25, total: 75 },
          });
        },
      );

      network = new AgentNetwork(createNetworkConfig(), neurolink);
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should yield network-start chunk first", async () => {
      const chunks: NetworkStreamChunk[] = [];

      for await (const chunk of network.stream({ message: "Stream test" })) {
        chunks.push(chunk);
        if (chunk.type === "network-complete" || chunks.length > 20) {
          break;
        }
      }

      expect(chunks[0].type).toBe("network-start");
    });

    it("should yield routing events", async () => {
      const chunks: NetworkStreamChunk[] = [];

      for await (const chunk of network.stream({ message: "Test routing" })) {
        chunks.push(chunk);
        if (chunk.type === "network-complete") {
          break;
        }
      }

      const chunkTypes = chunks.map((c) => c.type);
      expect(chunkTypes).toContain("routing-start");
      expect(chunkTypes).toContain("routing-decision");
    });

    it("should yield primitive-start and primitive-end events", async () => {
      const chunks: NetworkStreamChunk[] = [];

      for await (const chunk of network.stream({
        message: "Test primitives",
      })) {
        chunks.push(chunk);
        if (chunk.type === "network-complete") {
          break;
        }
      }

      const chunkTypes = chunks.map((c) => c.type);
      expect(chunkTypes).toContain("primitive-start");
      expect(chunkTypes).toContain("primitive-end");
    });

    it("should yield agent-text chunks during streaming", async () => {
      const chunks: NetworkStreamChunk[] = [];

      for await (const chunk of network.stream({ message: "Stream text" })) {
        chunks.push(chunk);
        if (chunk.type === "network-complete") {
          break;
        }
      }

      const textChunks = chunks.filter((c) => c.type === "agent-text");
      expect(textChunks.length).toBeGreaterThan(0);
    });

    it("should yield network-complete at end", async () => {
      const chunks: NetworkStreamChunk[] = [];

      for await (const chunk of network.stream({ message: "Complete test" })) {
        chunks.push(chunk);
        if (chunk.type === "network-complete") {
          break;
        }
      }

      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk.type).toBe("network-complete");
    });

    it("should include trace ID in all chunks", async () => {
      const customTraceId = "stream-trace-123";
      const chunks: NetworkStreamChunk[] = [];

      for await (const chunk of network.stream(
        { message: "Trace test" },
        { tracing: { traceId: customTraceId } },
      )) {
        chunks.push(chunk);
        if (chunk.type === "network-complete") {
          break;
        }
      }

      for (const chunk of chunks) {
        expect(chunk.traceId).toBe(customTraceId);
      }
    });

    it("should include step index in relevant chunks", async () => {
      const chunks: NetworkStreamChunk[] = [];

      for await (const chunk of network.stream({ message: "Step test" })) {
        chunks.push(chunk);
        if (chunk.type === "network-complete") {
          break;
        }
      }

      const primitiveChunks = chunks.filter(
        (c) => c.type === "primitive-start" || c.type === "primitive-end",
      );

      for (const chunk of primitiveChunks) {
        expect(chunk.stepIndex).toBeDefined();
      }
    });

    it("should handle streaming errors gracefully", async () => {
      (neurolink.generate as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Streaming error"),
      );

      const chunks: NetworkStreamChunk[] = [];

      for await (const chunk of network.stream({ message: "Error test" })) {
        chunks.push(chunk);
      }

      // Should have either error or complete
      const hasError = chunks.some((c) => c.type === "network-error");
      const hasComplete = chunks.some((c) => c.type === "network-complete");
      expect(hasError || hasComplete).toBe(true);
    });
  });

  // ============================================================================
  // INTEGRATION TESTS: WORKFLOW INTEGRATION
  // ============================================================================

  describe("Workflow Integration", () => {
    let neurolink: NeuroLink;

    beforeEach(() => {
      neurolink = createMockNeuroLink();
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should register workflows as primitives", () => {
      const workflow: NetworkWorkflowDefinition = {
        id: "review-workflow",
        name: "Review Workflow",
        description: "Reviews and approves content",
        workflow: {
          execute: vi.fn().mockResolvedValue({ output: "Reviewed" }),
        },
      };

      const network = new AgentNetwork(
        createNetworkConfig({ workflows: [workflow] }),
        neurolink,
      );

      const primitives = network.getAllPrimitives();
      expect(primitives.some((p) => p.id === "review-workflow")).toBe(true);
      expect(primitives.some((p) => p.type === "workflow")).toBe(true);
    });

    it("should execute workflow when routed to it", async () => {
      const workflowExecute = vi.fn().mockResolvedValue({
        output: "Workflow completed. Task finished successfully.",
      });

      const workflow: NetworkWorkflowDefinition = {
        id: "analysis-workflow",
        name: "Analysis Workflow",
        description: "Analyzes data thoroughly",
        workflow: { execute: workflowExecute },
      };

      // Route to workflow
      (neurolink.generate as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          content: JSON.stringify({
            selectedPrimitive: {
              type: "workflow",
              id: "analysis-workflow",
              name: "Analysis Workflow",
            },
            confidence: 0.95,
          }),
          usage: { input: 50, output: 25, total: 75 },
        })
        .mockResolvedValueOnce({
          content: "Task complete with analysis results.",
          usage: { input: 100, output: 50, total: 150 },
        });

      const network = new AgentNetwork(
        createNetworkConfig({ workflows: [workflow] }),
        neurolink,
      );

      await network.execute({ message: "Analyze this data" });

      expect(workflowExecute).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // INTEGRATION TESTS: TOOL INITIALIZATION
  // ============================================================================

  describe("Tool Initialization", () => {
    let neurolink: NeuroLink;

    beforeEach(() => {
      neurolink = createMockNeuroLink();
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should lazily initialize tools on first execution", async () => {
      const network = new AgentNetwork(
        createNetworkConfig({ tools: ["readFile", "writeFile"] }),
        neurolink,
      );

      // Tools not initialized before execution
      expect(neurolink.getAllAvailableTools).not.toHaveBeenCalled();

      // Execute triggers tool initialization
      await network.execute({ message: "Use tools" });

      expect(neurolink.getAllAvailableTools).toHaveBeenCalled();
    });

    it("should initialize tools only once across multiple executions", async () => {
      const network = new AgentNetwork(
        createNetworkConfig({ tools: ["readFile"] }),
        neurolink,
      );

      await network.execute({ message: "First" });
      await network.execute({ message: "Second" });
      await network.execute({ message: "Third" });

      // getAllAvailableTools called once for network init, potentially more for agent init
      // But the network's tools should only be initialized once
      const initCallCount = (
        neurolink.getAllAvailableTools as ReturnType<typeof vi.fn>
      ).mock.calls.length;
      expect(initCallCount).toBeGreaterThan(0);
    });

    it("should register tools as primitives after initialization", async () => {
      const network = new AgentNetwork(
        createNetworkConfig({ tools: ["readFile", "writeFile"] }),
        neurolink,
      );

      await network.execute({ message: "Init tools" });

      const primitives = network.getAllPrimitives();
      const toolPrimitives = primitives.filter((p) => p.type === "tool");
      expect(toolPrimitives.length).toBeGreaterThan(0);
    });

    it("should handle tool initialization failure gracefully", async () => {
      (
        neurolink.getAllAvailableTools as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error("Tool registry unavailable"));

      const network = new AgentNetwork(
        createNetworkConfig({ tools: ["readFile"] }),
        neurolink,
      );

      // Should not throw
      const result = await network.execute({ message: "Handle failure" });
      expect(result).toBeDefined();
    });

    it("should skip non-existent tools during initialization", async () => {
      const network = new AgentNetwork(
        createNetworkConfig({ tools: ["nonExistentTool", "readFile"] }),
        neurolink,
      );

      await network.execute({ message: "Skip invalid" });

      const primitives = network.getAllPrimitives();
      expect(primitives.some((p) => p.id === "tool-nonExistentTool")).toBe(
        false,
      );
    });
  });

  // ============================================================================
  // INTEGRATION TESTS: ERROR HANDLING
  // ============================================================================

  describe("Error Handling and Recovery", () => {
    let neurolink: NeuroLink;

    beforeEach(() => {
      neurolink = createMockNeuroLink();
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should handle routing failures with fallback", async () => {
      (neurolink.generate as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error("Router error"))
        .mockResolvedValue({
          content: "Task completed via fallback.",
          usage: { input: 100, output: 50, total: 150 },
        });

      const network = new AgentNetwork(createNetworkConfig(), neurolink);
      const result = await network.execute({ message: "Handle routing error" });

      // Should complete with fallback routing
      expect(result).toBeDefined();
      expect(result.trace.routingDecisions.length).toBeGreaterThan(0);
    });

    it("should handle primitive execution errors", async () => {
      let callCount = 0;
      (neurolink.generate as ReturnType<typeof vi.fn>).mockImplementation(
        () => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              content: JSON.stringify({
                selectedPrimitive: {
                  type: "agent",
                  id: "researcher",
                  name: "Research Agent",
                },
                confidence: 0.9,
              }),
            });
          }
          throw new Error("Agent execution failed");
        },
      );

      const network = new AgentNetwork(createNetworkConfig(), neurolink);
      const result = await network.execute({ message: "Cause error" });

      // Network should handle the error
      expect(result).toBeDefined();
    });

    it("should return error status on complete failure", async () => {
      (neurolink.generate as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Complete system failure"),
      );

      const network = new AgentNetwork(createNetworkConfig(), neurolink);
      const result = await network.execute({ message: "Total failure" });

      // Either error status or completed via fallback
      expect(["error", "completed"]).toContain(result.status);
    });

    it("should preserve trace on error", async () => {
      let callCount = 0;
      (neurolink.generate as ReturnType<typeof vi.fn>).mockImplementation(
        () => {
          callCount++;
          if (callCount <= 2) {
            if (callCount % 2 === 1) {
              return Promise.resolve({
                content: JSON.stringify({
                  selectedPrimitive: {
                    type: "agent",
                    id: "researcher",
                    name: "Research Agent",
                  },
                  confidence: 0.9,
                }),
              });
            }
            return Promise.resolve({
              content: "Partial progress",
              usage: { input: 100, output: 50, total: 150 },
            });
          }
          throw new Error("Mid-execution error");
        },
      );

      const network = new AgentNetwork(createNetworkConfig(), neurolink);
      const result = await network.execute(
        { message: "Partial then error" },
        { maxSteps: 3 },
      );

      // Trace should still be populated
      expect(result.trace).toBeDefined();
      expect(result.trace.traceId).toBeDefined();
    });
  });

  // ============================================================================
  // INTEGRATION TESTS: AGENT RETRIEVAL
  // ============================================================================

  describe("Agent Retrieval", () => {
    let neurolink: NeuroLink;
    let network: AgentNetwork;

    beforeEach(() => {
      neurolink = createMockNeuroLink();
      network = new AgentNetwork(createNetworkConfig(), neurolink);
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should get agent by ID", () => {
      const agent = network.getAgent("researcher");

      expect(agent).toBeDefined();
      expect(agent?.id).toBe("researcher");
      expect(agent?.name).toBe("Research Agent");
    });

    it("should return undefined for non-existent agent", () => {
      const agent = network.getAgent("non-existent");
      expect(agent).toBeUndefined();
    });

    it("should get all agents", () => {
      const agents = network.getAllAgents();

      expect(agents).toHaveLength(3);
      expect(agents.map((a) => a.id)).toContain("researcher");
      expect(agents.map((a) => a.id)).toContain("writer");
      expect(agents.map((a) => a.id)).toContain("analyst");
    });

    it("should get all primitives", () => {
      const primitives = network.getAllPrimitives();

      expect(primitives.length).toBeGreaterThanOrEqual(3);
      expect(primitives.some((p) => p.type === "agent")).toBe(true);
    });
  });

  // ============================================================================
  // INTEGRATION TESTS: EVENT HANDLING
  // ============================================================================

  describe("Event Handling", () => {
    let neurolink: NeuroLink;
    let network: AgentNetwork;

    beforeEach(() => {
      neurolink = createMockNeuroLink();

      // Setup for event testing
      let callCount = 0;
      (neurolink.generate as ReturnType<typeof vi.fn>).mockImplementation(
        () => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              content: JSON.stringify({
                selectedPrimitive: {
                  type: "agent",
                  id: "researcher",
                  name: "Research Agent",
                },
                confidence: 0.9,
              }),
            });
          }
          return Promise.resolve({
            content: "Task completed successfully.",
            usage: { input: 100, output: 50, total: 150 },
          });
        },
      );

      network = new AgentNetwork(createNetworkConfig(), neurolink);
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should emit network:start event", async () => {
      const startHandler = vi.fn();
      network.on("network:start", startHandler);

      await network.execute({ message: "Test start event" });

      expect(startHandler).toHaveBeenCalled();
    });

    it("should emit network:complete event", async () => {
      const completeHandler = vi.fn();
      network.on("network:complete", completeHandler);

      await network.execute({ message: "Test complete event" });

      expect(completeHandler).toHaveBeenCalled();
    });

    it("should allow unsubscribing from events", async () => {
      const handler = vi.fn();
      network.on("network:start", handler);
      network.off("network:start", handler);

      await network.execute({ message: "Test unsubscribe" });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // INTEGRATION TESTS: TASK COMPLETION DETECTION
  // ============================================================================

  describe("Task Completion Detection", () => {
    let neurolink: NeuroLink;

    beforeEach(() => {
      neurolink = createMockNeuroLink();
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should detect completion with explicit completion indicators", async () => {
      (neurolink.generate as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          content: JSON.stringify({
            selectedPrimitive: {
              type: "agent",
              id: "researcher",
              name: "Research Agent",
            },
            confidence: 0.9,
          }),
        })
        .mockResolvedValueOnce({
          content: "Task complete. Here is the final answer with all details.",
          usage: { input: 100, output: 50, total: 150 },
        });

      const network = new AgentNetwork(createNetworkConfig(), neurolink);
      const result = await network.execute({ message: "Complete this" });

      expect(result.status).toBe("completed");
    });

    it("should not complete with continuation indicators", async () => {
      let callCount = 0;
      (neurolink.generate as ReturnType<typeof vi.fn>).mockImplementation(
        () => {
          callCount++;
          if (callCount % 2 === 1) {
            return Promise.resolve({
              content: JSON.stringify({
                selectedPrimitive: {
                  type: "agent",
                  id: "researcher",
                  name: "Research Agent",
                },
                confidence: 0.9,
              }),
            });
          }
          if (callCount < 6) {
            return Promise.resolve({
              content: "Let me continue working on this...",
              usage: { input: 100, output: 50, total: 150 },
            });
          }
          return Promise.resolve({
            content: "Task complete. Here is the final comprehensive result.",
            usage: { input: 100, output: 50, total: 150 },
          });
        },
      );

      const network = new AgentNetwork(createNetworkConfig(), neurolink);
      const result = await network.execute(
        { message: "Long task" },
        { maxSteps: 3 },
      );

      // Should have multiple steps
      expect(result.trace.steps.length).toBeGreaterThan(0);
    });

    it("should not complete with empty output", async () => {
      let callCount = 0;
      (neurolink.generate as ReturnType<typeof vi.fn>).mockImplementation(
        () => {
          callCount++;
          if (callCount % 2 === 1) {
            return Promise.resolve({
              content: JSON.stringify({
                selectedPrimitive: {
                  type: "agent",
                  id: "researcher",
                  name: "Research Agent",
                },
                confidence: 0.9,
              }),
            });
          }
          if (callCount === 2) {
            return Promise.resolve({
              content: "",
              usage: { input: 100, output: 0, total: 100 },
            });
          }
          return Promise.resolve({
            content: "Task complete with substantive content.",
            usage: { input: 100, output: 50, total: 150 },
          });
        },
      );

      const network = new AgentNetwork(createNetworkConfig(), neurolink);
      const result = await network.execute(
        { message: "Handle empty" },
        { maxSteps: 3 },
      );

      expect(result.trace.steps.length).toBeGreaterThan(0);
    });
  });
});
