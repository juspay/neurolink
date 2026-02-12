/**
 * Agent Routes Tests
 * Comprehensive tests for the agent API routes
 */

import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { createAgentRoutes } from "../../../../src/lib/server/routes/agentRoutes.js";
import { createMockContext } from "../../../utils/server-test-utils.js";
import type { NeuroLink } from "../../../../src/lib/neurolink.js";
import type { MCPToolRegistry } from "../../../../src/lib/mcp/toolRegistry.js";

// ============================================
// Test-specific mock types
// ============================================

/**
 * Mock NeuroLink interface for testing agent routes
 */
type MockNeuroLinkForAgentRoutes = {
  generate: Mock;
  stream?: Mock;
};

/**
 * Mock tool registry interface for testing
 */
type MockToolRegistry = {
  listTools: Mock;
};

/**
 * Agent execute response structure for test assertions
 */
type AgentExecuteTestResponse = {
  content?: string;
  provider?: string;
  model?: string;
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, unknown>;
  }>;
  usage?: {
    input: number;
    output: number;
    total: number;
  };
  error?: {
    code: string;
    message?: string;
  };
};

/**
 * Agent providers list response structure
 */
type AgentProvidersTestResponse = {
  providers: string[];
  total: number;
};

// Mock ProviderFactory
vi.mock("../../../../src/lib/factories/providerFactory.js", () => ({
  ProviderFactory: {
    getAvailableProviders: vi.fn(() => [
      "openai",
      "anthropic",
      "google-ai",
      "bedrock",
      "azure",
      "mistral",
    ]),
  },
}));

describe("Agent Routes", () => {
  const basePath = "/api";
  let routes: ReturnType<typeof createAgentRoutes>;

  beforeEach(() => {
    vi.clearAllMocks();
    routes = createAgentRoutes(basePath);
  });

  describe("createAgentRoutes", () => {
    it("should create route group with correct prefix", () => {
      expect(routes.prefix).toBe(`${basePath}/agent`);
    });

    it("should create three routes", () => {
      expect(routes.routes.length).toBe(3);
    });

    it("should create execute route", () => {
      const executeRoute = routes.routes.find(
        (r) => r.path === `${basePath}/agent/execute`,
      );
      expect(executeRoute).toBeDefined();
      expect(executeRoute?.method).toBe("POST");
      expect(executeRoute?.tags).toContain("agent");
    });

    it("should create stream route", () => {
      const streamRoute = routes.routes.find(
        (r) => r.path === `${basePath}/agent/stream`,
      );
      expect(streamRoute).toBeDefined();
      expect(streamRoute?.method).toBe("POST");
      expect(streamRoute?.streaming?.enabled).toBe(true);
      expect(streamRoute?.tags).toContain("streaming");
    });

    it("should create providers route", () => {
      const providersRoute = routes.routes.find(
        (r) => r.path === `${basePath}/agent/providers`,
      );
      expect(providersRoute).toBeDefined();
      expect(providersRoute?.method).toBe("GET");
      expect(providersRoute?.tags).toContain("providers");
    });
  });

  describe("POST /agent/execute", () => {
    let mockNeuroLink: MockNeuroLinkForAgentRoutes;

    beforeEach(() => {
      mockNeuroLink = {
        generate: vi.fn().mockResolvedValue({
          content: "Generated response",
          provider: "openai",
          model: "gpt-4",
          usage: { input: 10, output: 20, total: 30 },
          toolCalls: [
            {
              toolCallId: "call-1",
              toolName: "testTool",
              args: { param: "value" },
            },
          ],
        }),
      };
    });

    const mockToolRegistry: MockToolRegistry = {
      listTools: vi.fn().mockResolvedValue([]),
    };

    // Helper that wraps imported createMockContext with local mocks
    const createContext = (body: unknown) =>
      createMockContext({
        method: "POST",
        path: `${basePath}/agent/execute`,
        headers: { "content-type": "application/json" },
        body,
        neurolink: mockNeuroLink as unknown as NeuroLink,
        toolRegistry: mockToolRegistry as unknown as MCPToolRegistry,
      });

    it("should execute agent with string input", async () => {
      const executeRoute = routes.routes.find(
        (r) => r.path === `${basePath}/agent/execute`,
      )!;

      const ctx = createContext({
        input: "Hello, AI!",
        provider: "openai",
        model: "gpt-4",
      });

      const result = await executeRoute.handler(ctx);

      expect(mockNeuroLink.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          input: { text: "Hello, AI!" },
          provider: "openai",
          model: "gpt-4",
        }),
      );

      expect(result).toHaveProperty("content", "Generated response");
      expect(result).toHaveProperty("provider", "openai");
      expect(result).toHaveProperty("model", "gpt-4");
    });

    it("should execute agent with object input", async () => {
      const executeRoute = routes.routes.find(
        (r) => r.path === `${basePath}/agent/execute`,
      )!;

      const ctx = createContext({
        input: {
          text: "Describe this image",
          images: ["base64image"],
        },
        provider: "openai",
      });

      const result = await executeRoute.handler(ctx);

      expect(mockNeuroLink.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            text: "Describe this image",
            images: ["base64image"],
          },
        }),
      );

      expect(result).toHaveProperty("content");
    });

    it("should include tool calls in response", async () => {
      const executeRoute = routes.routes.find(
        (r) => r.path === `${basePath}/agent/execute`,
      )!;

      const ctx = createContext({
        input: "Use a tool",
      });

      const result = (await executeRoute.handler(
        ctx,
      )) as AgentExecuteTestResponse;

      expect(result.toolCalls).toBeDefined();
      expect(result.toolCalls![0]).toEqual({
        name: "testTool",
        arguments: { param: "value" },
      });
    });

    it("should include optional parameters", async () => {
      const executeRoute = routes.routes.find(
        (r) => r.path === `${basePath}/agent/execute`,
      )!;

      const ctx = createContext({
        input: "Test",
        systemPrompt: "You are a helpful assistant",
        temperature: 0.7,
        maxTokens: 1000,
        sessionId: "session-123",
        userId: "user-456",
      });

      await executeRoute.handler(ctx);

      expect(mockNeuroLink.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt: "You are a helpful assistant",
          temperature: 0.7,
          maxTokens: 1000,
          context: {
            sessionId: "session-123",
            userId: "user-456",
          },
        }),
      );
    });

    it("should return validation error for missing input", async () => {
      const executeRoute = routes.routes.find(
        (r) => r.path === `${basePath}/agent/execute`,
      )!;

      const ctx = createContext({});

      const result = (await executeRoute.handler(
        ctx,
      )) as AgentExecuteTestResponse;

      expect(result).toHaveProperty("error");
      expect(result.error!.code).toBe("VALIDATION_ERROR");
    });

    it("should return validation error for invalid temperature", async () => {
      const executeRoute = routes.routes.find(
        (r) => r.path === `${basePath}/agent/execute`,
      )!;

      const ctx = createContext({
        input: "Test",
        temperature: 5, // Invalid: should be 0-2
      });

      const result = (await executeRoute.handler(
        ctx,
      )) as AgentExecuteTestResponse;

      expect(result).toHaveProperty("error");
      expect(result.error!.code).toBe("VALIDATION_ERROR");
    });

    it("should include usage information in response", async () => {
      const executeRoute = routes.routes.find(
        (r) => r.path === `${basePath}/agent/execute`,
      )!;

      const ctx = createContext({
        input: "Test",
      });

      const result = (await executeRoute.handler(
        ctx,
      )) as AgentExecuteTestResponse;

      expect(result.usage).toEqual({
        input: 10,
        output: 20,
        total: 30,
      });
    });
  });

  describe("POST /agent/stream", () => {
    let mockNeuroLink: MockNeuroLinkForAgentRoutes;

    beforeEach(() => {
      mockNeuroLink = {
        generate: vi.fn(),
        stream: vi.fn().mockResolvedValue({
          stream: (async function* () {
            yield { text: "chunk1" };
            yield { text: "chunk2" };
            yield { text: "chunk3" };
          })(),
        }),
      };
    });

    const mockToolRegistry: MockToolRegistry = {
      listTools: vi.fn().mockResolvedValue([]),
    };

    // Helper that wraps imported createMockContext with local mocks
    const createContext = (body: unknown) =>
      createMockContext({
        method: "POST",
        path: `${basePath}/agent/stream`,
        headers: { "content-type": "application/json" },
        body,
        neurolink: mockNeuroLink as unknown as NeuroLink,
        toolRegistry: mockToolRegistry as unknown as MCPToolRegistry,
      });

    it("should return stream for valid request", async () => {
      const streamRoute = routes.routes.find(
        (r) => r.path === `${basePath}/agent/stream`,
      )!;

      const ctx = createContext({
        input: "Stream this response",
      });

      const result = await streamRoute.handler(ctx);

      expect(mockNeuroLink.stream).toHaveBeenCalledWith(
        expect.objectContaining({
          input: { text: "Stream this response" },
        }),
      );

      // Result should be the stream
      expect(result).toBeDefined();
    });

    it("should return validation error for invalid request", async () => {
      const streamRoute = routes.routes.find(
        (r) => r.path === `${basePath}/agent/stream`,
      )!;

      const ctx = createContext({});

      const result = (await streamRoute.handler(
        ctx,
      )) as AgentExecuteTestResponse;

      expect(result).toHaveProperty("error");
      expect(result.error!.code).toBe("VALIDATION_ERROR");
    });

    it("should pass all parameters to stream method", async () => {
      const streamRoute = routes.routes.find(
        (r) => r.path === `${basePath}/agent/stream`,
      )!;

      const ctx = createContext({
        input: "Test",
        provider: "anthropic",
        model: "claude-3",
        systemPrompt: "Be helpful",
        temperature: 0.5,
        maxTokens: 500,
      });

      await streamRoute.handler(ctx);

      expect(mockNeuroLink.stream).toHaveBeenCalledWith({
        input: { text: "Test" },
        provider: "anthropic",
        model: "claude-3",
        systemPrompt: "Be helpful",
        temperature: 0.5,
        maxTokens: 500,
      });
    });
  });

  describe("GET /agent/providers", () => {
    // Helper that wraps imported createMockContext with local defaults
    const createContext = () =>
      createMockContext({
        path: `${basePath}/agent/providers`,
      });

    it("should return list of available providers", async () => {
      const providersRoute = routes.routes.find(
        (r) => r.path === `${basePath}/agent/providers`,
      )!;

      const ctx = createContext();
      const result = (await providersRoute.handler(
        ctx,
      )) as AgentProvidersTestResponse;

      expect(result.providers).toContain("openai");
      expect(result.providers).toContain("anthropic");
      expect(result.providers).toContain("google-ai");
      expect(result.total).toBe(6);
    });

    it("should return provider count", async () => {
      const providersRoute = routes.routes.find(
        (r) => r.path === `${basePath}/agent/providers`,
      )!;

      const ctx = createContext();
      const result = (await providersRoute.handler(
        ctx,
      )) as AgentProvidersTestResponse;

      expect(result.total).toBeGreaterThan(0);
      expect(result.total).toBe(result.providers.length);
    });
  });

  describe("Custom base path", () => {
    it("should use custom base path", () => {
      const customRoutes = createAgentRoutes("/v2/api");

      expect(customRoutes.prefix).toBe("/v2/api/agent");
      expect(customRoutes.routes[0].path).toContain("/v2/api/agent");
    });

    it("should use default base path when not provided", () => {
      const defaultRoutes = createAgentRoutes();

      expect(defaultRoutes.prefix).toBe("/api/agent");
    });
  });
});
