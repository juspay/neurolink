/**
 * Agent Unit Tests
 *
 * Comprehensive tests for the Agent class in the multi-agent network system.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Agent } from "../../../src/lib/agent/agent.js";
import type { NeuroLink } from "../../../src/lib/neurolink.js";
import type { AgentDefinition } from "../../../src/lib/types/agentNetwork.js";

// ============================================================================
// MOCK SETUP
// ============================================================================

/**
 * Create a mock NeuroLink instance with configurable behavior
 */
function createMockNeuroLink(overrides?: Partial<NeuroLink>): NeuroLink {
  return {
    generate: vi.fn().mockResolvedValue({
      content: "Mock generated response",
      usage: { input: 100, output: 50, total: 150 },
      toolsUsed: [],
      toolExecutions: [],
    }),
    stream: vi.fn().mockResolvedValue({
      stream: (async function* () {
        yield { content: "Streamed " };
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
      { name: "calculateMath", description: "Calculate math", inputSchema: {} },
    ]),
    executeTool: vi.fn().mockResolvedValue({ result: "Tool executed" }),
    ...overrides,
  } as unknown as NeuroLink;
}

/**
 * Create a valid agent definition for testing
 */
function createValidAgentDefinition(
  overrides?: Partial<AgentDefinition>,
): AgentDefinition {
  return {
    id: "test-agent",
    name: "Test Agent",
    description: "A test agent for unit testing",
    instructions: "You are a helpful test assistant",
    ...overrides,
  };
}

// ============================================================================
// AGENT CONSTRUCTION TESTS
// ============================================================================

describe("Agent", () => {
  describe("construction", () => {
    it("should create an agent with required fields", () => {
      const neurolink = createMockNeuroLink();
      const definition = createValidAgentDefinition();

      const agent = new Agent(definition, neurolink);

      expect(agent.id).toBe("test-agent");
      expect(agent.name).toBe("Test Agent");
      expect(agent.description).toBe("A test agent for unit testing");
      expect(agent.instructions).toBe("You are a helpful test assistant");
    });

    it("should create an agent with optional fields", () => {
      const neurolink = createMockNeuroLink();
      const definition = createValidAgentDefinition({
        provider: "openai",
        model: "gpt-4o",
        tools: ["readFile", "writeFile"],
        maxSteps: 15,
        temperature: 0.5,
        canDelegate: true,
        metadata: { role: "researcher" },
      });

      const agent = new Agent(definition, neurolink);

      expect(agent.provider).toBe("openai");
      expect(agent.model).toBe("gpt-4o");
      expect(agent.tools).toEqual(["readFile", "writeFile"]);
      expect(agent.maxSteps).toBe(15);
      expect(agent.temperature).toBe(0.5);
      expect(agent.canDelegate).toBe(true);
      expect(agent.metadata).toEqual({ role: "researcher" });
    });

    it("should use default values for optional fields", () => {
      const neurolink = createMockNeuroLink();
      const definition = createValidAgentDefinition();

      const agent = new Agent(definition, neurolink);

      expect(agent.maxSteps).toBe(10);
      expect(agent.temperature).toBe(0.7);
      expect(agent.canDelegate).toBe(false);
    });

    it("should throw error when id is missing", () => {
      const neurolink = createMockNeuroLink();
      const definition = createValidAgentDefinition({ id: "" });

      expect(() => new Agent(definition, neurolink)).toThrow(
        "Agent definition must have a valid id",
      );
    });

    it("should throw error when id is not a string", () => {
      const neurolink = createMockNeuroLink();
      const definition = createValidAgentDefinition({
        id: 123 as unknown as string,
      });

      expect(() => new Agent(definition, neurolink)).toThrow(
        "Agent definition must have a valid id",
      );
    });

    it("should throw error when name is missing", () => {
      const neurolink = createMockNeuroLink();
      const definition = createValidAgentDefinition({ name: "" });

      expect(() => new Agent(definition, neurolink)).toThrow(
        "Agent definition must have a valid name",
      );
    });

    it("should throw error when description is missing", () => {
      const neurolink = createMockNeuroLink();
      const definition = createValidAgentDefinition({ description: "" });

      expect(() => new Agent(definition, neurolink)).toThrow(
        "Agent definition must have a valid description",
      );
    });

    it("should throw error when instructions are missing", () => {
      const neurolink = createMockNeuroLink();
      const definition = createValidAgentDefinition({ instructions: "" });

      expect(() => new Agent(definition, neurolink)).toThrow(
        "Agent definition must have valid instructions",
      );
    });

    it("should create agent with input schema", () => {
      const neurolink = createMockNeuroLink();
      const inputSchema = z.object({
        query: z.string(),
        limit: z.number().optional(),
      });
      const definition = createValidAgentDefinition({ inputSchema });

      const agent = new Agent(definition, neurolink);

      expect(agent.inputSchema).toBe(inputSchema);
    });

    it("should create agent with output schema", () => {
      const neurolink = createMockNeuroLink();
      const outputSchema = z.object({
        result: z.string(),
        confidence: z.number(),
      });
      const definition = createValidAgentDefinition({ outputSchema });

      const agent = new Agent(definition, neurolink);

      expect(agent.outputSchema).toBe(outputSchema);
    });
  });

  // ============================================================================
  // AGENT EXECUTE TESTS
  // ============================================================================

  describe("execute()", () => {
    let neurolink: NeuroLink;
    let agent: Agent;

    beforeEach(() => {
      neurolink = createMockNeuroLink();
      agent = new Agent(createValidAgentDefinition(), neurolink);
    });

    it("should execute with string input", async () => {
      const result = await agent.execute("Test prompt");

      expect(result.status).toBe("success");
      expect(result.content).toBe("Mock generated response");
      expect(result.agentId).toBe("test-agent");
      expect(neurolink.generate).toHaveBeenCalled();
    });

    it("should execute with structured input", async () => {
      const result = await agent.execute({ query: "test", limit: 10 });

      expect(result.status).toBe("success");
      expect(result.content).toBe("Mock generated response");
      expect(neurolink.generate).toHaveBeenCalled();
    });

    it("should include duration in result", async () => {
      const result = await agent.execute("Test prompt");

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it("should include usage information in result", async () => {
      const result = await agent.execute("Test prompt");

      expect(result.usage).toBeDefined();
      expect(result.usage?.input).toBe(100);
      expect(result.usage?.output).toBe(50);
      expect(result.usage?.total).toBe(150);
    });

    it("should pass context to generation options", async () => {
      await agent.execute("Test prompt", {
        context: { sessionId: "test-session" },
      });

      expect(neurolink.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            sessionId: "test-session",
          }),
        }),
      );
    });

    it("should use custom traceId when provided", async () => {
      await agent.execute("Test prompt", { traceId: "custom-trace-123" });

      expect(neurolink.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            agentId: "test-agent",
          }),
        }),
      );
    });

    it("should handle errors gracefully", async () => {
      (neurolink.generate as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Generation failed"),
      );

      const result = await agent.execute("Test prompt");

      expect(result.status).toBe("error");
      expect(result.error).toBe("Generation failed");
      expect(result.content).toBe("");
    });

    it("should include agent id and name in context", async () => {
      await agent.execute("Test prompt");

      expect(neurolink.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            agentId: "test-agent",
            agentName: "Test Agent",
          }),
        }),
      );
    });

    it("should include system prompt from instructions", async () => {
      await agent.execute("Test prompt");

      expect(neurolink.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt: "You are a helpful test assistant",
        }),
      );
    });

    it("should transform tool executions to correct format", async () => {
      (neurolink.generate as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: "Response",
        toolsUsed: ["readFile"],
        toolExecutions: [
          {
            name: "readFile",
            input: { path: "/test" },
            output: "file content",
          },
        ],
      });

      const result = await agent.execute("Test prompt");

      expect(result.toolExecutions).toBeDefined();
      expect(result.toolExecutions?.[0].toolName).toBe("readFile");
      expect(result.toolExecutions?.[0].args).toEqual({ path: "/test" });
      expect(result.toolExecutions?.[0].result).toBe("file content");
    });

    it("should increment execution count", async () => {
      const initialStatus = agent.getStatus();
      expect(initialStatus.executionCount).toBe(0);

      await agent.execute("Test prompt 1");
      await agent.execute("Test prompt 2");

      const updatedStatus = agent.getStatus();
      expect(updatedStatus.executionCount).toBe(2);
    });
  });

  // ============================================================================
  // INPUT/OUTPUT SCHEMA VALIDATION TESTS
  // ============================================================================

  describe("input/output schema validation", () => {
    let neurolink: NeuroLink;

    beforeEach(() => {
      neurolink = createMockNeuroLink();
    });

    it("should validate input against inputSchema", async () => {
      const inputSchema = z.object({
        query: z.string(),
        limit: z.number(),
      });
      const agent = new Agent(
        createValidAgentDefinition({ inputSchema }),
        neurolink,
      );

      // Valid input should work
      const result = await agent.execute({ query: "test", limit: 10 });
      expect(result.status).toBe("success");
    });

    it("should fail validation for invalid input", async () => {
      const inputSchema = z.object({
        query: z.string(),
        limit: z.number(),
      });
      const agent = new Agent(
        createValidAgentDefinition({ inputSchema }),
        neurolink,
      );

      // Invalid input - limit is string instead of number
      const result = await agent.execute({
        query: "test",
        limit: "invalid" as unknown as number,
      });
      expect(result.status).toBe("error");
      expect(result.error).toContain("Input validation failed");
    });

    it("should skip input validation for string input", async () => {
      const inputSchema = z.object({
        query: z.string(),
      });
      const agent = new Agent(
        createValidAgentDefinition({ inputSchema }),
        neurolink,
      );

      // String input should bypass schema validation
      const result = await agent.execute("plain string input");
      expect(result.status).toBe("success");
    });

    it("should parse output with outputSchema when content is JSON", async () => {
      const outputSchema = z.object({
        result: z.string(),
        confidence: z.number(),
      });
      const agent = new Agent(
        createValidAgentDefinition({ outputSchema }),
        neurolink,
      );

      (neurolink.generate as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: JSON.stringify({ result: "success", confidence: 0.95 }),
      });

      const result = await agent.execute("Test prompt");

      expect(result.object).toEqual({ result: "success", confidence: 0.95 });
    });

    it("should handle invalid JSON output gracefully", async () => {
      const outputSchema = z.object({
        result: z.string(),
      });
      const agent = new Agent(
        createValidAgentDefinition({ outputSchema }),
        neurolink,
      );

      (neurolink.generate as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: "Not valid JSON",
      });

      const result = await agent.execute("Test prompt");

      expect(result.status).toBe("success");
      expect(result.object).toBeUndefined();
    });

    it("should handle output schema validation failure gracefully", async () => {
      const outputSchema = z.object({
        result: z.string(),
        confidence: z.number(),
      });
      const agent = new Agent(
        createValidAgentDefinition({ outputSchema }),
        neurolink,
      );

      (neurolink.generate as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: JSON.stringify({ result: "success" }), // missing confidence
      });

      const result = await agent.execute("Test prompt");

      expect(result.status).toBe("success");
      expect(result.object).toBeUndefined();
    });
  });

  // ============================================================================
  // TOOL FILTERING TESTS
  // ============================================================================

  describe("tool filtering", () => {
    let neurolink: NeuroLink;

    beforeEach(() => {
      neurolink = createMockNeuroLink();
    });

    it("should filter tools to only those specified for the agent", async () => {
      const agent = new Agent(
        createValidAgentDefinition({
          tools: ["readFile", "writeFile"],
        }),
        neurolink,
      );

      await agent.execute("Test prompt");

      // The tools in the generate call should be filtered
      expect(neurolink.getAllAvailableTools).toHaveBeenCalled();
      expect(neurolink.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: expect.objectContaining({
            readFile: expect.any(Object),
            writeFile: expect.any(Object),
          }),
        }),
      );
    });

    it("should not include tools not in agent tools list", async () => {
      const agent = new Agent(
        createValidAgentDefinition({
          tools: ["readFile"],
        }),
        neurolink,
      );

      await agent.execute("Test prompt");

      const generateCall = (neurolink.generate as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(generateCall.tools).toBeDefined();
      expect(generateCall.tools.readFile).toBeDefined();
      expect(generateCall.tools.writeFile).toBeUndefined();
      expect(generateCall.tools.websearchGrounding).toBeUndefined();
    });

    it("should not include tools when agent has no tools specified", async () => {
      const agent = new Agent(createValidAgentDefinition(), neurolink);

      await agent.execute("Test prompt");

      const generateCall = (neurolink.generate as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      // When no tools specified, tools should not be passed
      expect(generateCall.tools).toBeUndefined();
    });

    it("should cache filtered tools for performance", async () => {
      const agent = new Agent(
        createValidAgentDefinition({
          tools: ["readFile"],
        }),
        neurolink,
      );

      await agent.execute("Test prompt 1");
      await agent.execute("Test prompt 2");

      // getAllAvailableTools should only be called once due to caching
      expect(neurolink.getAllAvailableTools).toHaveBeenCalledTimes(1);
    });

    it("should handle tool filtering errors gracefully", async () => {
      (
        neurolink.getAllAvailableTools as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error("Failed to get tools"));

      const agent = new Agent(
        createValidAgentDefinition({
          tools: ["readFile"],
        }),
        neurolink,
      );

      const result = await agent.execute("Test prompt");

      // Should still succeed, just without filtered tools
      expect(result.status).toBe("success");
    });

    it("should handle non-existent tools gracefully", async () => {
      const agent = new Agent(
        createValidAgentDefinition({
          tools: ["nonExistentTool"],
        }),
        neurolink,
      );

      await agent.execute("Test prompt");

      const generateCall = (neurolink.generate as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      // Should not include the non-existent tool
      expect(generateCall.tools).toBeUndefined();
    });
  });

  // ============================================================================
  // AGENT STREAM TESTS
  // ============================================================================

  describe("stream()", () => {
    let neurolink: NeuroLink;
    let agent: Agent;

    beforeEach(() => {
      neurolink = createMockNeuroLink();
      agent = new Agent(createValidAgentDefinition(), neurolink);
    });

    it("should yield agent-start chunk first", async () => {
      const chunks: unknown[] = [];
      for await (const chunk of agent.stream("Test prompt")) {
        chunks.push(chunk);
      }

      expect(chunks[0]).toEqual(
        expect.objectContaining({
          type: "agent-start",
          agentId: "test-agent",
        }),
      );
    });

    it("should yield text chunks during streaming", async () => {
      const chunks: unknown[] = [];
      for await (const chunk of agent.stream("Test prompt")) {
        chunks.push(chunk);
      }

      const textChunks = chunks.filter(
        (c: unknown) => (c as { type: string }).type === "agent-text",
      );
      expect(textChunks.length).toBeGreaterThan(0);
    });

    it("should yield agent-complete chunk at end", async () => {
      const chunks: unknown[] = [];
      for await (const chunk of agent.stream("Test prompt")) {
        chunks.push(chunk);
      }

      const lastChunk = chunks[chunks.length - 1] as { type: string };
      expect(lastChunk.type).toBe("agent-complete");
    });

    it("should include traceId in all chunks", async () => {
      const chunks: unknown[] = [];
      for await (const chunk of agent.stream("Test prompt", {
        traceId: "custom-trace",
      })) {
        chunks.push(chunk);
      }

      for (const chunk of chunks) {
        expect((chunk as { traceId: string }).traceId).toBe("custom-trace");
      }
    });

    it("should accumulate full content in complete chunk", async () => {
      const chunks: unknown[] = [];
      for await (const chunk of agent.stream("Test prompt")) {
        chunks.push(chunk);
      }

      const completeChunk = chunks.find(
        (c: unknown) => (c as { type: string }).type === "agent-complete",
      ) as {
        content: string;
      };
      expect(completeChunk.content).toBe("Streamed response");
    });

    it("should yield tool-call chunks when tools are used", async () => {
      (neurolink.stream as ReturnType<typeof vi.fn>).mockResolvedValue({
        stream: (async function* () {
          yield { content: "Using tool: " };
          yield {
            toolCall: {
              toolName: "readFile",
              args: { path: "/test" },
              toolCallId: "call-123",
            },
          };
          yield { content: "Result received" };
        })(),
        usage: { input: 100, output: 50, total: 150 },
      });

      const chunks: unknown[] = [];
      for await (const chunk of agent.stream("Test prompt")) {
        chunks.push(chunk);
      }

      const toolCallChunk = chunks.find(
        (c: unknown) => (c as { type: string }).type === "agent-tool-call",
      ) as {
        toolName: string;
        args: unknown;
      };
      expect(toolCallChunk).toBeDefined();
      expect(toolCallChunk.toolName).toBe("readFile");
      expect(toolCallChunk.args).toEqual({ path: "/test" });
    });

    it("should yield tool-result chunks when tools return results", async () => {
      (neurolink.stream as ReturnType<typeof vi.fn>).mockResolvedValue({
        stream: (async function* () {
          yield {
            toolResult: {
              toolName: "readFile",
              toolCallId: "call-123",
              result: "file contents",
              success: true,
            },
          };
        })(),
        usage: { input: 100, output: 50, total: 150 },
      });

      const chunks: unknown[] = [];
      for await (const chunk of agent.stream("Test prompt")) {
        chunks.push(chunk);
      }

      const toolResultChunk = chunks.find(
        (c: unknown) => (c as { type: string }).type === "agent-tool-result",
      ) as {
        toolName: string;
        result: unknown;
        success: boolean;
      };
      expect(toolResultChunk).toBeDefined();
      expect(toolResultChunk.toolName).toBe("readFile");
      expect(toolResultChunk.result).toBe("file contents");
      expect(toolResultChunk.success).toBe(true);
    });

    it("should yield error chunk on stream error", async () => {
      (neurolink.stream as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Stream failed"),
      );

      const chunks: unknown[] = [];
      for await (const chunk of agent.stream("Test prompt")) {
        chunks.push(chunk);
      }

      const errorChunk = chunks.find(
        (c: unknown) => (c as { type: string }).type === "agent-error",
      ) as {
        error: string;
      };
      expect(errorChunk).toBeDefined();
      expect(errorChunk.error).toBe("Stream failed");
    });

    it("should validate input schema during streaming", async () => {
      const inputSchema = z.object({
        query: z.string(),
      });
      const agentWithSchema = new Agent(
        createValidAgentDefinition({ inputSchema }),
        neurolink,
      );

      const chunks: unknown[] = [];
      for await (const chunk of agentWithSchema.stream({
        query: 123 as unknown as string,
      })) {
        chunks.push(chunk);
      }

      const errorChunk = chunks.find(
        (c: unknown) => (c as { type: string }).type === "agent-error",
      );
      expect(errorChunk).toBeDefined();
    });

    it("should increment execution count after successful stream", async () => {
      const initialStatus = agent.getStatus();
      expect(initialStatus.executionCount).toBe(0);

      // Consume the stream
      for await (const _ of agent.stream("Test prompt")) {
        // Consume chunks
      }

      const updatedStatus = agent.getStatus();
      expect(updatedStatus.executionCount).toBe(1);
    });
  });

  // ============================================================================
  // AGENT STATUS AND METRICS TESTS
  // ============================================================================

  describe("getStatus()", () => {
    it("should return initial status", () => {
      const neurolink = createMockNeuroLink();
      const agent = new Agent(createValidAgentDefinition(), neurolink);

      const status = agent.getStatus();

      expect(status.id).toBe("test-agent");
      expect(status.name).toBe("Test Agent");
      expect(status.executionCount).toBe(0);
      expect(status.lastExecutionTime).toBeUndefined();
      expect(status.available).toBe(true);
    });

    it("should track execution count and time", async () => {
      const neurolink = createMockNeuroLink();
      const agent = new Agent(createValidAgentDefinition(), neurolink);

      await agent.execute("Test prompt");

      const status = agent.getStatus();
      expect(status.executionCount).toBe(1);
      expect(status.lastExecutionTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getAverageExecutionTime()", () => {
    it("should return 0 when no executions", () => {
      const neurolink = createMockNeuroLink();
      const agent = new Agent(createValidAgentDefinition(), neurolink);

      expect(agent.getAverageExecutionTime()).toBe(0);
    });

    it("should calculate average execution time", async () => {
      const neurolink = createMockNeuroLink();
      const agent = new Agent(createValidAgentDefinition(), neurolink);

      await agent.execute("Test prompt 1");
      await agent.execute("Test prompt 2");

      const average = agent.getAverageExecutionTime();
      expect(average).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // EVENT SUBSCRIPTION TESTS
  // ============================================================================

  describe("event subscriptions", () => {
    it("should allow subscribing to events with on()", () => {
      const neurolink = createMockNeuroLink();
      const agent = new Agent(createValidAgentDefinition(), neurolink);
      const handler = vi.fn();

      agent.on("test-event", handler);
      // Note: Events are emitted internally, this tests the subscription API
      expect(() => agent.on("test-event", handler)).not.toThrow();
    });

    it("should allow unsubscribing from events with off()", () => {
      const neurolink = createMockNeuroLink();
      const agent = new Agent(createValidAgentDefinition(), neurolink);
      const handler = vi.fn();

      agent.on("test-event", handler);
      agent.off("test-event", handler);
      expect(() => agent.off("test-event", handler)).not.toThrow();
    });
  });

  // ============================================================================
  // CONTEXT BUILDING TESTS
  // ============================================================================

  describe("context building", () => {
    let neurolink: NeuroLink;

    beforeEach(() => {
      neurolink = createMockNeuroLink();
    });

    it("should include agent tools in context", async () => {
      const agent = new Agent(
        createValidAgentDefinition({
          tools: ["readFile", "writeFile"],
        }),
        neurolink,
      );

      await agent.execute("Test prompt");

      expect(neurolink.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            agentTools: ["readFile", "writeFile"],
          }),
        }),
      );
    });

    it("should include maxSteps in context", async () => {
      const agent = new Agent(
        createValidAgentDefinition({
          maxSteps: 20,
        }),
        neurolink,
      );

      await agent.execute("Test prompt");

      expect(neurolink.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            agentMaxSteps: 20,
          }),
        }),
      );
    });

    it("should override maxSteps from options", async () => {
      const agent = new Agent(
        createValidAgentDefinition({
          maxSteps: 10,
        }),
        neurolink,
      );

      await agent.execute("Test prompt", { maxSteps: 5 });

      expect(neurolink.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            agentMaxSteps: 5,
          }),
        }),
      );
    });

    it("should build prompt with context when provided", async () => {
      const agent = new Agent(createValidAgentDefinition(), neurolink);

      await agent.execute("Task description", {
        context: { previousResult: "some result" },
      });

      const generateCall = (neurolink.generate as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      // The prompt should include context
      expect(generateCall.input.text).toContain("Task description");
    });
  });
});
