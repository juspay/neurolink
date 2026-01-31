/**
 * Agent Class Tests
 *
 * Tests for the core Agent class including:
 * - Agent creation and configuration
 * - Execution and streaming
 * - Input/output validation
 * - Error handling
 * - Status reporting
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Agent } from "../../src/lib/agents/Agent.js";
import type {
  AgentDefinition,
  AgentResult,
} from "../../src/lib/agents/types/agentTypes.js";
import { z } from "zod";

// ============================================================================
// Mock SDK
// ============================================================================

function createMockSdk(options?: {
  generateResponse?: Partial<{
    content: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    toolsUsed: string[];
  }>;
  streamChunks?: Array<{ content?: string }>;
  shouldFail?: boolean;
  errorMessage?: string;
}) {
  return {
    generate: vi.fn().mockImplementation(async () => {
      if (options?.shouldFail) {
        throw new Error(options.errorMessage ?? "Mock generation error");
      }
      return {
        content: options?.generateResponse?.content ?? "Mock response",
        usage: options?.generateResponse?.usage ?? {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
        toolsUsed: options?.generateResponse?.toolsUsed ?? [],
      };
    }),
    stream: vi.fn().mockImplementation(async () => {
      const chunks = options?.streamChunks ?? [
        { content: "Hello " },
        { content: "world!" },
      ];

      async function* generateStream() {
        for (const chunk of chunks) {
          yield chunk;
        }
      }

      return {
        stream: generateStream(),
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
      };
    }),
  };
}

// ============================================================================
// Test Fixtures
// ============================================================================

const basicAgentDefinition: AgentDefinition = {
  id: "test-agent",
  name: "Test Agent",
  description: "A test agent for unit testing",
  instructions: "You are a helpful test assistant.",
};

const fullAgentDefinition: AgentDefinition = {
  id: "full-agent",
  name: "Full Test Agent",
  description: "A fully configured test agent",
  instructions: "You are a comprehensive test assistant.",
  provider: "openai",
  model: "gpt-4o-mini",
  tools: ["readFile", "writeFile"],
  maxSteps: 5,
  temperature: 0.5,
  canDelegate: true,
  metadata: { category: "testing" },
};

// ============================================================================
// Tests
// ============================================================================

describe("Agent", () => {
  let mockSdk: ReturnType<typeof createMockSdk>;

  beforeEach(() => {
    mockSdk = createMockSdk();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Constructor", () => {
    it("should create an agent with basic definition", () => {
      const agent = new Agent(basicAgentDefinition, mockSdk);

      expect(agent.id).toBe("test-agent");
      expect(agent.name).toBe("Test Agent");
      expect(agent.description).toBe("A test agent for unit testing");
      expect(agent.instructions).toBe("You are a helpful test assistant.");
    });

    it("should create an agent with full definition", () => {
      const agent = new Agent(fullAgentDefinition, mockSdk);

      expect(agent.id).toBe("full-agent");
      expect(agent.provider).toBe("openai");
      expect(agent.model).toBe("gpt-4o-mini");
      expect(agent.tools).toEqual(["readFile", "writeFile"]);
      expect(agent.maxSteps).toBe(5);
      expect(agent.temperature).toBe(0.5);
      expect(agent.canDelegate).toBe(true);
      expect(agent.metadata).toEqual({ category: "testing" });
    });

    it("should use default values for optional properties", () => {
      const agent = new Agent(basicAgentDefinition, mockSdk);

      expect(agent.maxSteps).toBe(10);
      expect(agent.temperature).toBe(0.7);
      expect(agent.canDelegate).toBe(false);
    });
  });

  describe("execute", () => {
    it("should execute with string input", async () => {
      const agent = new Agent(basicAgentDefinition, mockSdk);
      const result = await agent.execute("Hello, agent!");

      expect(result.status).toBe("success");
      expect(result.content).toBe("Mock response");
      expect(result.agentId).toBe("test-agent");
      expect(result.duration).toBeGreaterThan(0);
    });

    it("should execute with structured input", async () => {
      const agent = new Agent(basicAgentDefinition, mockSdk);
      const result = await agent.execute({ task: "analyze", data: [1, 2, 3] });

      expect(result.status).toBe("success");
      expect(mockSdk.generate).toHaveBeenCalled();
    });

    it("should include context in prompt", async () => {
      const agent = new Agent(basicAgentDefinition, mockSdk);
      await agent.execute("Hello", {
        context: { userId: "user-123", sessionId: "sess-456" },
      });

      const callArgs = mockSdk.generate.mock.calls[0][0];
      expect(callArgs.context.userId).toBe("user-123");
      expect(callArgs.context.sessionId).toBe("sess-456");
    });

    it("should handle execution errors gracefully", async () => {
      const failingSdk = createMockSdk({
        shouldFail: true,
        errorMessage: "Provider unavailable",
      });

      const agent = new Agent(basicAgentDefinition, failingSdk);
      const result = await agent.execute("Hello");

      expect(result.status).toBe("error");
      expect(result.error).toBe("Provider unavailable");
      expect(result.content).toBe("");
    });

    it("should return usage information", async () => {
      const agent = new Agent(basicAgentDefinition, mockSdk);
      const result = await agent.execute("Hello");

      expect(result.usage).toBeDefined();
      expect(result.usage?.promptTokens).toBe(10);
      expect(result.usage?.completionTokens).toBe(20);
      expect(result.usage?.totalTokens).toBe(30);
    });

    it("should track execution count", async () => {
      const agent = new Agent(basicAgentDefinition, mockSdk);

      await agent.execute("First");
      await agent.execute("Second");
      await agent.execute("Third");

      const status = agent.getStatus();
      expect(status.executionCount).toBe(3);
    });
  });

  describe("Input Validation", () => {
    it("should validate input against schema", async () => {
      const agentWithSchema: AgentDefinition = {
        ...basicAgentDefinition,
        inputSchema: z.object({
          name: z.string(),
          age: z.number(),
        }),
      };

      const agent = new Agent(agentWithSchema, mockSdk);

      // Valid input should succeed
      const result = await agent.execute({ name: "John", age: 30 });
      expect(result.status).toBe("success");
    });

    it("should reject invalid input", async () => {
      const agentWithSchema: AgentDefinition = {
        ...basicAgentDefinition,
        inputSchema: z.object({
          name: z.string(),
          age: z.number(),
        }),
      };

      const agent = new Agent(agentWithSchema, mockSdk);

      // Invalid input should fail
      const result = await agent.execute({ name: "John", age: "invalid" });
      expect(result.status).toBe("error");
      expect(result.error).toContain("validation");
    });

    it("should allow string input even with schema", async () => {
      const agentWithSchema: AgentDefinition = {
        ...basicAgentDefinition,
        inputSchema: z.object({
          name: z.string(),
        }),
      };

      const agent = new Agent(agentWithSchema, mockSdk);

      // String input should bypass schema validation
      const result = await agent.execute("Simple string input");
      expect(result.status).toBe("success");
    });
  });

  describe("Output Validation", () => {
    it("should parse output against schema", async () => {
      const sdkWithJsonResponse = createMockSdk({
        generateResponse: {
          content: JSON.stringify({ answer: 42 }),
        },
      });

      const agentWithSchema: AgentDefinition = {
        ...basicAgentDefinition,
        outputSchema: z.object({
          answer: z.number(),
        }),
      };

      const agent = new Agent(agentWithSchema, sdkWithJsonResponse);
      const result = await agent.execute("What is the answer?");

      expect(result.object).toEqual({ answer: 42 });
    });

    it("should handle non-JSON output gracefully", async () => {
      const sdkWithTextResponse = createMockSdk({
        generateResponse: {
          content: "This is not JSON",
        },
      });

      const agentWithSchema: AgentDefinition = {
        ...basicAgentDefinition,
        outputSchema: z.object({
          answer: z.number(),
        }),
      };

      const agent = new Agent(agentWithSchema, sdkWithTextResponse);
      const result = await agent.execute("What is the answer?");

      expect(result.status).toBe("success");
      expect(result.object).toBeUndefined();
      expect(result.content).toBe("This is not JSON");
    });
  });

  describe("stream", () => {
    it("should stream execution results", async () => {
      const agent = new Agent(basicAgentDefinition, mockSdk);
      const chunks: Array<{ type: string; content?: string }> = [];

      for await (const chunk of agent.stream("Hello")) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].type).toBe("agent-start");
      expect(chunks[chunks.length - 1].type).toBe("agent-complete");
    });

    it("should emit text chunks during streaming", async () => {
      const agent = new Agent(basicAgentDefinition, mockSdk);
      const textChunks: string[] = [];

      for await (const chunk of agent.stream("Hello")) {
        if (chunk.type === "agent-text" && "content" in chunk) {
          textChunks.push(chunk.content);
        }
      }

      expect(textChunks).toEqual(["Hello ", "world!"]);
    });

    it("should emit error chunk on failure", async () => {
      const failingSdk = createMockSdk({ shouldFail: true });
      const agent = new Agent(basicAgentDefinition, failingSdk);

      const chunks: Array<{ type: string }> = [];
      for await (const chunk of agent.stream("Hello")) {
        chunks.push(chunk);
      }

      const errorChunk = chunks.find((c) => c.type === "agent-error");
      expect(errorChunk).toBeDefined();
    });
  });

  describe("getStatus", () => {
    it("should return agent status", () => {
      const agent = new Agent(basicAgentDefinition, mockSdk);
      const status = agent.getStatus();

      expect(status.id).toBe("test-agent");
      expect(status.name).toBe("Test Agent");
      expect(status.executionCount).toBe(0);
      expect(status.available).toBe(true);
      expect(status.state).toBe("idle");
    });

    it("should update status after execution", async () => {
      const agent = new Agent(basicAgentDefinition, mockSdk);

      await agent.execute("Hello");
      const status = agent.getStatus();

      expect(status.executionCount).toBe(1);
      expect(status.lastExecutionTime).toBeDefined();
      expect(status.lastExecutionTime).toBeGreaterThan(0);
    });
  });

  describe("clone", () => {
    it("should create a copy with overrides", () => {
      const agent = new Agent(basicAgentDefinition, mockSdk);
      const clone = agent.clone({
        name: "Cloned Agent",
        temperature: 0.9,
      });

      expect(clone.id).not.toBe(agent.id);
      expect(clone.name).toBe("Cloned Agent");
      expect(clone.temperature).toBe(0.9);
      expect(clone.description).toBe(agent.description);
    });
  });

  describe("getDefinition", () => {
    it("should return the agent definition", () => {
      const agent = new Agent(fullAgentDefinition, mockSdk);
      const definition = agent.getDefinition();

      expect(definition.id).toBe("full-agent");
      expect(definition.name).toBe("Full Test Agent");
      expect(definition.provider).toBe("openai");
      expect(definition.tools).toEqual(["readFile", "writeFile"]);
    });
  });

  describe("Events", () => {
    it("should emit execution:start event", async () => {
      const agent = new Agent(basicAgentDefinition, mockSdk);
      const handler = vi.fn();

      agent.on("execution:start", handler);
      await agent.execute("Hello");

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: "test-agent",
          input: "Hello",
        }),
      );
    });

    it("should emit execution:complete event", async () => {
      const agent = new Agent(basicAgentDefinition, mockSdk);
      const handler = vi.fn();

      agent.on("execution:complete", handler);
      await agent.execute("Hello");

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: "test-agent",
          result: expect.objectContaining({
            status: "success",
          }),
        }),
      );
    });

    it("should emit execution:error event on failure", async () => {
      const failingSdk = createMockSdk({ shouldFail: true });
      const agent = new Agent(basicAgentDefinition, failingSdk);
      const handler = vi.fn();

      agent.on("execution:error", handler);
      await agent.execute("Hello");

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: "test-agent",
          error: expect.any(Error),
        }),
      );
    });

    it("should support unsubscribing from events", async () => {
      const agent = new Agent(basicAgentDefinition, mockSdk);
      const handler = vi.fn();

      agent.on("execution:start", handler);
      agent.off("execution:start", handler);
      await agent.execute("Hello");

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
