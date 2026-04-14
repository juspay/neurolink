/**
 * Agent Integration Tests
 *
 * Integration tests for single agent execution with various configurations,
 * tool usage, streaming, and error handling scenarios.
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
      content: "Generated response from the agent",
      usage: { input: 100, output: 50, total: 150 },
      toolsUsed: [],
      toolExecutions: [],
    }),
    stream: vi.fn().mockResolvedValue({
      stream: (async function* () {
        yield { content: "Streaming " };
        yield { content: "response " };
        yield { content: "complete" };
      })(),
      usage: { input: 100, output: 50, total: 150 },
    }),
    getAllAvailableTools: vi.fn().mockResolvedValue([
      {
        name: "readFile",
        description: "Read contents of a file",
        inputSchema: {
          type: "object",
          properties: { path: { type: "string" } },
        },
      },
      {
        name: "writeFile",
        description: "Write contents to a file",
        inputSchema: {
          type: "object",
          properties: { path: { type: "string" }, content: { type: "string" } },
        },
      },
      {
        name: "websearchGrounding",
        description: "Search the web for information",
        inputSchema: {
          type: "object",
          properties: { query: { type: "string" } },
        },
      },
      {
        name: "calculateMath",
        description: "Perform mathematical calculations",
        inputSchema: {
          type: "object",
          properties: { expression: { type: "string" } },
        },
      },
    ]),
    executeTool: vi
      .fn()
      .mockResolvedValue({ result: "Tool executed successfully" }),
    ...overrides,
  } as unknown as NeuroLink;
}

/**
 * Create a valid agent definition for testing
 */
function createAgentDefinition(
  overrides?: Partial<AgentDefinition>,
): AgentDefinition {
  return {
    id: "test-agent",
    name: "Test Agent",
    description: "A test agent for integration testing",
    instructions:
      "You are a helpful test assistant. Respond to queries accurately.",
    ...overrides,
  };
}

// ============================================================================
// INTEGRATION TESTS: AGENT WITH TOOLS EXECUTION
// ============================================================================

describe("Agent Integration Tests", () => {
  describe("Agent with Tools Execution", () => {
    let neurolink: NeuroLink;
    let agent: Agent;

    beforeEach(() => {
      neurolink = createMockNeuroLink();
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should execute agent with specified tools", async () => {
      agent = new Agent(
        createAgentDefinition({
          tools: ["readFile", "websearchGrounding"],
        }),
        neurolink,
      );

      const result = await agent.execute(
        "Read the config file and search for documentation",
      );

      expect(result.status).toBe("success");
      expect(result.content).toBeDefined();
      expect(neurolink.getAllAvailableTools).toHaveBeenCalled();
      expect(neurolink.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: expect.objectContaining({
            readFile: expect.any(Object),
            websearchGrounding: expect.any(Object),
          }),
        }),
      );
    });

    it("should filter tools to only agent-specified ones", async () => {
      agent = new Agent(
        createAgentDefinition({
          tools: ["readFile"],
        }),
        neurolink,
      );

      await agent.execute("Read a file");

      const generateCall = (neurolink.generate as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(generateCall.tools.readFile).toBeDefined();
      expect(generateCall.tools.writeFile).toBeUndefined();
      expect(generateCall.tools.websearchGrounding).toBeUndefined();
    });

    it("should handle tool execution results in response", async () => {
      (neurolink.generate as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: "I read the file and found the configuration",
        usage: { input: 150, output: 75, total: 225 },
        toolsUsed: ["readFile"],
        toolExecutions: [
          {
            name: "readFile",
            input: { path: "/config.json" },
            output: '{"key": "value"}',
          },
        ],
      });

      agent = new Agent(
        createAgentDefinition({
          tools: ["readFile"],
        }),
        neurolink,
      );

      const result = await agent.execute("Read the config file");

      expect(result.status).toBe("success");
      expect(result.toolsUsed).toContain("readFile");
      expect(result.toolExecutions).toHaveLength(1);
      expect(result.toolExecutions?.[0].toolName).toBe("readFile");
      expect(result.toolExecutions?.[0].args).toEqual({ path: "/config.json" });
    });

    it("should cache tools for subsequent executions", async () => {
      agent = new Agent(
        createAgentDefinition({
          tools: ["readFile"],
        }),
        neurolink,
      );

      await agent.execute("First request");
      await agent.execute("Second request");
      await agent.execute("Third request");

      // getAllAvailableTools should only be called once due to caching
      expect(neurolink.getAllAvailableTools).toHaveBeenCalledTimes(1);
    });

    it("should execute agent without tools when none specified", async () => {
      agent = new Agent(createAgentDefinition(), neurolink);

      await agent.execute("Just chat with me");

      const generateCall = (neurolink.generate as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(generateCall.tools).toBeUndefined();
    });

    it("should handle non-existent tools gracefully", async () => {
      agent = new Agent(
        createAgentDefinition({
          tools: ["nonExistentTool", "readFile"],
        }),
        neurolink,
      );

      const result = await agent.execute("Try to use tools");

      expect(result.status).toBe("success");
      const generateCall = (neurolink.generate as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      // Should only include existing tools
      expect(generateCall.tools.readFile).toBeDefined();
      expect(generateCall.tools.nonExistentTool).toBeUndefined();
    });
  });

  // ============================================================================
  // INTEGRATION TESTS: STREAMING EXECUTION
  // ============================================================================

  describe("Streaming Execution", () => {
    let neurolink: NeuroLink;
    let agent: Agent;

    beforeEach(() => {
      neurolink = createMockNeuroLink();
      agent = new Agent(createAgentDefinition(), neurolink);
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should stream agent execution with proper chunk types", async () => {
      const chunks: unknown[] = [];

      for await (const chunk of agent.stream("Stream a response")) {
        chunks.push(chunk);
      }

      // Should have start, text chunks, and complete
      const chunkTypes = chunks.map((c) => (c as { type: string }).type);
      expect(chunkTypes).toContain("agent-start");
      expect(chunkTypes).toContain("agent-text");
      expect(chunkTypes).toContain("agent-complete");
    });

    it("should accumulate content during streaming", async () => {
      const textChunks: string[] = [];

      for await (const chunk of agent.stream("Stream content")) {
        if ((chunk as { type: string }).type === "agent-text") {
          textChunks.push((chunk as { content: string }).content);
        }
      }

      const fullContent = textChunks.join("");
      expect(fullContent).toBe("Streaming response complete");
    });

    it("should include trace ID in all stream chunks", async () => {
      const traceId = "custom-trace-id-123";
      const chunks: unknown[] = [];

      for await (const chunk of agent.stream("Test", { traceId })) {
        chunks.push(chunk);
      }

      for (const chunk of chunks) {
        expect((chunk as { traceId: string }).traceId).toBe(traceId);
      }
    });

    it("should stream tool calls and results", async () => {
      (neurolink.stream as ReturnType<typeof vi.fn>).mockResolvedValue({
        stream: (async function* () {
          yield { content: "Let me search for that. " };
          yield {
            toolCall: {
              toolName: "websearchGrounding",
              args: { query: "AI trends 2024" },
              toolCallId: "tool-call-1",
            },
          };
          yield {
            toolResult: {
              toolName: "websearchGrounding",
              toolCallId: "tool-call-1",
              result: "Search results...",
              success: true,
            },
          };
          yield { content: "Based on the search results..." };
        })(),
        usage: { input: 200, output: 100, total: 300 },
      });

      agent = new Agent(
        createAgentDefinition({
          tools: ["websearchGrounding"],
        }),
        neurolink,
      );

      const chunks: unknown[] = [];
      for await (const chunk of agent.stream("Search for AI trends")) {
        chunks.push(chunk);
      }

      const chunkTypes = chunks.map((c) => (c as { type: string }).type);
      expect(chunkTypes).toContain("agent-tool-call");
      expect(chunkTypes).toContain("agent-tool-result");

      const toolCallChunk = chunks.find(
        (c) => (c as { type: string }).type === "agent-tool-call",
      ) as { toolName: string; args: unknown };
      expect(toolCallChunk.toolName).toBe("websearchGrounding");
      expect(toolCallChunk.args).toEqual({ query: "AI trends 2024" });
    });

    it("should handle streaming errors gracefully", async () => {
      (neurolink.stream as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Stream connection failed"),
      );

      const chunks: unknown[] = [];
      for await (const chunk of agent.stream("This will fail")) {
        chunks.push(chunk);
      }

      const errorChunk = chunks.find(
        (c) => (c as { type: string }).type === "agent-error",
      ) as { error: string };
      expect(errorChunk).toBeDefined();
      expect(errorChunk.error).toBe("Stream connection failed");
    });

    it("should update execution metrics after streaming", async () => {
      const initialStatus = agent.getStatus();
      expect(initialStatus.executionCount).toBe(0);

      // Consume the entire stream
      for await (const _chunk of agent.stream("Test streaming")) {
        // Consume chunks
      }

      const updatedStatus = agent.getStatus();
      expect(updatedStatus.executionCount).toBe(1);
      expect(updatedStatus.lastExecutionTime).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // INTEGRATION TESTS: SCHEMA VALIDATION
  // ============================================================================

  describe("Schema Validation", () => {
    let neurolink: NeuroLink;

    beforeEach(() => {
      neurolink = createMockNeuroLink();
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should validate structured input against input schema", async () => {
      const inputSchema = z.object({
        query: z.string().min(3),
        maxResults: z.number().positive(),
      });

      const agent = new Agent(
        createAgentDefinition({ inputSchema }),
        neurolink,
      );

      const result = await agent.execute({
        query: "test search",
        maxResults: 10,
      });
      expect(result.status).toBe("success");
    });

    it("should reject invalid structured input", async () => {
      const inputSchema = z.object({
        query: z.string().min(3),
        maxResults: z.number().positive(),
      });

      const agent = new Agent(
        createAgentDefinition({ inputSchema }),
        neurolink,
      );

      const result = await agent.execute({
        query: "ab", // Too short
        maxResults: -5, // Negative
      });

      expect(result.status).toBe("error");
      expect(result.error).toContain("Input validation failed");
    });

    it("should bypass input validation for string input", async () => {
      const inputSchema = z.object({
        query: z.string(),
      });

      const agent = new Agent(
        createAgentDefinition({ inputSchema }),
        neurolink,
      );

      // String input should not be validated against object schema
      const result = await agent.execute("plain string input");
      expect(result.status).toBe("success");
    });

    it("should parse and validate JSON output against output schema", async () => {
      const outputSchema = z.object({
        answer: z.string(),
        confidence: z.number().min(0).max(1),
        sources: z.array(z.string()),
      });

      (neurolink.generate as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: JSON.stringify({
          answer: "The answer is 42",
          confidence: 0.95,
          sources: ["source1.com", "source2.com"],
        }),
        usage: { input: 100, output: 50, total: 150 },
      });

      const agent = new Agent(
        createAgentDefinition({ outputSchema }),
        neurolink,
      );

      const result = await agent.execute("What is the answer?");

      expect(result.status).toBe("success");
      expect(result.object).toEqual({
        answer: "The answer is 42",
        confidence: 0.95,
        sources: ["source1.com", "source2.com"],
      });
    });

    it("should handle invalid output schema gracefully", async () => {
      const outputSchema = z.object({
        answer: z.string(),
        confidence: z.number(),
      });

      (neurolink.generate as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: JSON.stringify({
          answer: "Response",
          // Missing confidence field
        }),
        usage: { input: 100, output: 50, total: 150 },
      });

      const agent = new Agent(
        createAgentDefinition({ outputSchema }),
        neurolink,
      );

      const result = await agent.execute("Test");

      expect(result.status).toBe("success");
      expect(result.object).toBeUndefined(); // Validation failed
      expect(result.content).toBeDefined(); // Raw content still available
    });

    it("should handle non-JSON output with output schema", async () => {
      const outputSchema = z.object({
        answer: z.string(),
      });

      (neurolink.generate as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: "This is not JSON content",
        usage: { input: 100, output: 50, total: 150 },
      });

      const agent = new Agent(
        createAgentDefinition({ outputSchema }),
        neurolink,
      );

      const result = await agent.execute("Test");

      expect(result.status).toBe("success");
      expect(result.object).toBeUndefined();
      expect(result.content).toBe("This is not JSON content");
    });
  });

  // ============================================================================
  // INTEGRATION TESTS: ERROR HANDLING AND RECOVERY
  // ============================================================================

  describe("Error Handling and Recovery", () => {
    let neurolink: NeuroLink;

    beforeEach(() => {
      neurolink = createMockNeuroLink();
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should handle generation failures gracefully", async () => {
      (neurolink.generate as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("API rate limit exceeded"),
      );

      const agent = new Agent(createAgentDefinition(), neurolink);
      const result = await agent.execute("This will fail");

      expect(result.status).toBe("error");
      expect(result.error).toBe("API rate limit exceeded");
      expect(result.content).toBe("");
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it("should handle tool initialization failures", async () => {
      (
        neurolink.getAllAvailableTools as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error("Tool registry unavailable"));

      const agent = new Agent(
        createAgentDefinition({
          tools: ["readFile"],
        }),
        neurolink,
      );

      const result = await agent.execute("Use tools");

      // Should still succeed, just without tools
      expect(result.status).toBe("success");
    });

    it("should track failed executions in metrics", async () => {
      (neurolink.generate as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Network error"),
      );

      const agent = new Agent(createAgentDefinition(), neurolink);

      await agent.execute("Failing request");

      const status = agent.getStatus();
      expect(status.executionCount).toBe(1); // Counts failed executions too
      expect(status.lastExecutionTime).toBeGreaterThanOrEqual(0);
    });

    it("should handle timeout scenarios", async () => {
      (neurolink.generate as ReturnType<typeof vi.fn>).mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Request timeout")), 100),
          ),
      );

      const agent = new Agent(createAgentDefinition(), neurolink);
      const result = await agent.execute("Slow request");

      expect(result.status).toBe("error");
      expect(result.error).toBe("Request timeout");
    });

    it("should preserve partial results on mid-stream failure", async () => {
      (neurolink.stream as ReturnType<typeof vi.fn>).mockResolvedValue({
        stream: (async function* () {
          yield { content: "Starting " };
          yield { content: "response " };
          throw new Error("Connection lost mid-stream");
        })(),
        usage: { input: 100, output: 50, total: 150 },
      });

      const agent = new Agent(createAgentDefinition(), neurolink);
      const chunks: unknown[] = [];

      for await (const chunk of agent.stream("Stream with error")) {
        chunks.push(chunk);
      }

      // Should have captured text before error
      const textChunks = chunks.filter(
        (c) => (c as { type: string }).type === "agent-text",
      );
      expect(textChunks.length).toBeGreaterThan(0);

      // Should have error chunk
      const errorChunk = chunks.find(
        (c) => (c as { type: string }).type === "agent-error",
      );
      expect(errorChunk).toBeDefined();
    });
  });

  // ============================================================================
  // INTEGRATION TESTS: CONTEXT AND OPTIONS
  // ============================================================================

  describe("Context and Options", () => {
    let neurolink: NeuroLink;
    let agent: Agent;

    beforeEach(() => {
      neurolink = createMockNeuroLink();
      agent = new Agent(createAgentDefinition(), neurolink);
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should pass context to generate options", async () => {
      await agent.execute("Test with context", {
        context: {
          userId: "user-123",
          sessionId: "session-456",
          customData: { preference: "detailed" },
        },
      });

      expect(neurolink.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            userId: "user-123",
            sessionId: "session-456",
            customData: { preference: "detailed" },
          }),
        }),
      );
    });

    it("should include agent metadata in context", async () => {
      await agent.execute("Test");

      expect(neurolink.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            agentId: "test-agent",
            agentName: "Test Agent",
          }),
        }),
      );
    });

    it("should override maxSteps from options", async () => {
      await agent.execute("Test", { maxSteps: 25 });

      expect(neurolink.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            agentMaxSteps: 25,
          }),
        }),
      );
    });

    it("should use custom trace ID when provided", async () => {
      const customTraceId = "custom-trace-abc-123";

      await agent.execute("Test", { traceId: customTraceId });

      // Trace ID is included in context
      expect(neurolink.generate).toHaveBeenCalled();
    });

    it("should include system prompt from agent instructions", async () => {
      await agent.execute("Test");

      expect(neurolink.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt:
            "You are a helpful test assistant. Respond to queries accurately.",
        }),
      );
    });

    it("should use agent-specific provider and model", async () => {
      const agentWithProvider = new Agent(
        createAgentDefinition({
          provider: "anthropic",
          model: "claude-3-opus",
        }),
        neurolink,
      );

      await agentWithProvider.execute("Test");

      expect(neurolink.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "anthropic",
          model: "claude-3-opus",
        }),
      );
    });

    it("should use custom temperature setting", async () => {
      const agentWithTemp = new Agent(
        createAgentDefinition({
          temperature: 0.2,
        }),
        neurolink,
      );

      await agentWithTemp.execute("Test");

      expect(neurolink.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.2,
        }),
      );
    });
  });

  // ============================================================================
  // INTEGRATION TESTS: METRICS AND STATUS
  // ============================================================================

  describe("Metrics and Status Tracking", () => {
    let neurolink: NeuroLink;
    let agent: Agent;

    beforeEach(() => {
      neurolink = createMockNeuroLink();
      agent = new Agent(createAgentDefinition(), neurolink);
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should track execution count across multiple calls", async () => {
      await agent.execute("Request 1");
      await agent.execute("Request 2");
      await agent.execute("Request 3");

      const status = agent.getStatus();
      expect(status.executionCount).toBe(3);
    });

    it("should calculate average execution time", async () => {
      await agent.execute("Request 1");
      await agent.execute("Request 2");
      await agent.execute("Request 3");

      const avgTime = agent.getAverageExecutionTime();
      // Average time should be non-negative (can be 0 in fast mocked execution)
      expect(avgTime).toBeGreaterThanOrEqual(0);
    });

    it("should return 0 average time when no executions", () => {
      const avgTime = agent.getAverageExecutionTime();
      expect(avgTime).toBe(0);
    });

    it("should report agent as available", () => {
      const status = agent.getStatus();
      expect(status.available).toBe(true);
    });

    it("should track usage information in results", async () => {
      const result = await agent.execute("Test");

      expect(result.usage).toBeDefined();
      expect(result.usage?.input).toBe(100);
      expect(result.usage?.output).toBe(50);
      expect(result.usage?.total).toBe(150);
    });

    it("should track duration in results", async () => {
      const result = await agent.execute("Test");

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // INTEGRATION TESTS: EVENT HANDLING
  // ============================================================================

  describe("Event Handling", () => {
    let neurolink: NeuroLink;
    let agent: Agent;

    beforeEach(() => {
      neurolink = createMockNeuroLink();
      agent = new Agent(createAgentDefinition(), neurolink);
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should allow subscribing to events", () => {
      const handler = vi.fn();

      expect(() => agent.on("custom-event", handler)).not.toThrow();
    });

    it("should allow unsubscribing from events", () => {
      const handler = vi.fn();

      agent.on("custom-event", handler);
      expect(() => agent.off("custom-event", handler)).not.toThrow();
    });

    it("should not throw when unsubscribing non-existent handler", () => {
      const handler = vi.fn();

      expect(() => agent.off("custom-event", handler)).not.toThrow();
    });
  });
});
