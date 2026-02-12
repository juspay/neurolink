/**
 * Tool Routes Tests
 * Comprehensive tests for the tool API routes
 */

import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { createToolRoutes } from "../../../../src/lib/server/routes/toolRoutes.js";
import { createMockContext } from "../../../utils/server-test-utils.js";
import type { MCPToolRegistry } from "../../../../src/lib/mcp/toolRegistry.js";

// ============================================
// Test Type Definitions
// ============================================

/**
 * Mock tool definition used in tests
 */
type MockTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  source?: string;
};

/**
 * Mock tool registry interface for testing
 */
type MockToolRegistry = {
  listTools: Mock<() => Promise<MockTool[]>>;
  executeTool: Mock<
    (name: string, args: Record<string, unknown>) => Promise<unknown>
  >;
};

/**
 * Response type for list tools endpoint
 */
type ListToolsResponse = {
  tools: Array<{
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    source: string;
  }>;
  total: number;
};

/**
 * Response type for get tool endpoint
 */
type GetToolResponse = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  source: string;
};

/**
 * Response type for search tools endpoint
 */
type SearchToolsResponse = {
  tools: Array<{
    name: string;
    description: string;
    source: string;
  }>;
  total: number;
  query: string | null;
};

/**
 * Response type for execute tool endpoint
 */
type ExecuteToolResponse = {
  success: boolean;
  data?: unknown;
  error?: string;
  duration: number;
  metadata?: {
    toolName: string;
    sessionId?: string | null;
  };
};

/**
 * Error response structure
 */
type ErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

describe("Tool Routes", () => {
  const basePath = "/api";
  let routes: ReturnType<typeof createToolRoutes>;
  let mockToolRegistry: MockToolRegistry;

  const mockTools: MockTool[] = [
    {
      name: "calculator",
      description: "Perform mathematical calculations",
      inputSchema: {
        type: "object",
        properties: {
          expression: { type: "string" },
        },
        required: ["expression"],
      },
      source: "built-in",
    },
    {
      name: "webSearch",
      description: "Search the web",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
        },
        required: ["query"],
      },
      source: "external",
    },
    {
      name: "fileReader",
      description: "Read file contents",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string" },
        },
        required: ["path"],
      },
      source: "built-in",
    },
  ];

  // Helper that wraps imported createMockContext with local mockToolRegistry
  const createContext = (overrides: Record<string, unknown> = {}) =>
    createMockContext({
      path: `${basePath}/tools`,
      toolRegistry: mockToolRegistry as unknown as MCPToolRegistry,
      ...overrides,
    });

  beforeEach(() => {
    vi.clearAllMocks();
    mockToolRegistry = {
      listTools: vi.fn().mockResolvedValue([...mockTools]),
      executeTool: vi.fn().mockResolvedValue({ result: "42" }),
    };
    routes = createToolRoutes(basePath);
  });

  describe("createToolRoutes", () => {
    it("should create route group with correct prefix", () => {
      expect(routes.prefix).toBe(`${basePath}/tools`);
    });

    it("should create five routes", () => {
      expect(routes.routes.length).toBe(5);
    });

    it("should create list tools route", () => {
      const listRoute = routes.routes.find(
        (r) => r.path === `${basePath}/tools` && r.method === "GET",
      );
      expect(listRoute).toBeDefined();
      expect(listRoute?.tags).toContain("tools");
    });

    it("should create get tool route", () => {
      const getRoute = routes.routes.find(
        (r) => r.path === `${basePath}/tools/:name` && r.method === "GET",
      );
      expect(getRoute).toBeDefined();
    });

    it("should create execute tool route", () => {
      const executeRoute = routes.routes.find(
        (r) => r.path === `${basePath}/tools/execute`,
      );
      expect(executeRoute).toBeDefined();
      expect(executeRoute?.method).toBe("POST");
    });

    it("should create execute tool by name route", () => {
      const executeByNameRoute = routes.routes.find(
        (r) => r.path === `${basePath}/tools/:name/execute`,
      );
      expect(executeByNameRoute).toBeDefined();
      expect(executeByNameRoute?.method).toBe("POST");
    });

    it("should create search tools route", () => {
      const searchRoute = routes.routes.find(
        (r) => r.path === `${basePath}/tools/search`,
      );
      expect(searchRoute).toBeDefined();
      expect(searchRoute?.method).toBe("GET");
    });
  });

  describe("GET /tools", () => {
    it("should return list of all tools", async () => {
      const listRoute = routes.routes.find(
        (r) => r.path === `${basePath}/tools` && r.method === "GET",
      )!;

      const ctx = createContext();
      const result = (await listRoute.handler(ctx)) as ListToolsResponse;

      expect(mockToolRegistry.listTools).toHaveBeenCalled();
      expect(result.tools).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it("should return tool metadata", async () => {
      const listRoute = routes.routes.find(
        (r) => r.path === `${basePath}/tools` && r.method === "GET",
      )!;

      const ctx = createContext();
      const result = (await listRoute.handler(ctx)) as ListToolsResponse;

      const calculator = result.tools.find((t) => t.name === "calculator");
      expect(calculator).toBeDefined();
      expect(calculator!.description).toBe("Perform mathematical calculations");
      expect(calculator!.inputSchema).toBeDefined();
      expect(calculator!.source).toBe("built-in");
    });

    it("should default source to built-in when not specified", async () => {
      const toolsWithoutSource: MockTool[] = [
        { name: "noSource", description: "No source tool", inputSchema: {} },
      ];
      mockToolRegistry.listTools.mockResolvedValueOnce(toolsWithoutSource);

      const listRoute = routes.routes.find(
        (r) => r.path === `${basePath}/tools` && r.method === "GET",
      )!;

      const ctx = createContext();
      const result = (await listRoute.handler(ctx)) as ListToolsResponse;

      expect(result.tools[0].source).toBe("built-in");
    });
  });

  describe("GET /tools/:name", () => {
    it("should return tool details by name", async () => {
      const getRoute = routes.routes.find(
        (r) => r.path === `${basePath}/tools/:name` && r.method === "GET",
      )!;

      const ctx = createContext({
        params: { name: "calculator" },
      });

      const result = (await getRoute.handler(ctx)) as GetToolResponse;

      expect(result.name).toBe("calculator");
      expect(result.description).toBe("Perform mathematical calculations");
      expect(result.inputSchema).toBeDefined();
    });

    it("should return error for non-existent tool", async () => {
      const getRoute = routes.routes.find(
        (r) => r.path === `${basePath}/tools/:name` && r.method === "GET",
      )!;

      const ctx = createContext({
        params: { name: "nonExistent" },
      });

      const result = (await getRoute.handler(ctx)) as ErrorResponse;

      expect(result).toHaveProperty("error");
      expect(result.error.code).toBe("TOOL_NOT_FOUND");
      expect(result.error.message).toContain("nonExistent");
    });

    it("should return validation error for missing name", async () => {
      const getRoute = routes.routes.find(
        (r) => r.path === `${basePath}/tools/:name` && r.method === "GET",
      )!;

      const ctx = createContext({
        params: { name: "" },
      });

      const result = (await getRoute.handler(ctx)) as ErrorResponse;

      expect(result).toHaveProperty("error");
      expect(result.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /tools/execute", () => {
    it("should execute tool successfully", async () => {
      const executeRoute = routes.routes.find(
        (r) => r.path === `${basePath}/tools/execute`,
      )!;

      const ctx = createContext({
        method: "POST",
        body: {
          name: "calculator",
          arguments: { expression: "2 + 2" },
        },
      });

      const result = (await executeRoute.handler(ctx)) as ExecuteToolResponse;

      expect(mockToolRegistry.executeTool).toHaveBeenCalledWith("calculator", {
        expression: "2 + 2",
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ result: "42" });
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it("should return error for non-existent tool", async () => {
      const executeRoute = routes.routes.find(
        (r) => r.path === `${basePath}/tools/execute`,
      )!;

      const ctx = createContext({
        method: "POST",
        body: {
          name: "nonExistent",
          arguments: {},
        },
      });

      const result = (await executeRoute.handler(ctx)) as ExecuteToolResponse;

      expect(result.success).toBe(false);
      expect(result.error).toContain("nonExistent");
    });

    it("should return validation error for missing name", async () => {
      const executeRoute = routes.routes.find(
        (r) => r.path === `${basePath}/tools/execute`,
      )!;

      const ctx = createContext({
        method: "POST",
        body: {
          arguments: { expression: "2 + 2" },
        },
      });

      const result = (await executeRoute.handler(ctx)) as ErrorResponse;

      expect(result).toHaveProperty("error");
      expect(result.error.code).toBe("VALIDATION_ERROR");
    });

    it("should include session and user context", async () => {
      const executeRoute = routes.routes.find(
        (r) => r.path === `${basePath}/tools/execute`,
      )!;

      const ctx = createContext({
        method: "POST",
        body: {
          name: "calculator",
          arguments: { expression: "2 + 2" },
          sessionId: "session-123",
          userId: "user-456",
        },
      });

      const result = (await executeRoute.handler(ctx)) as ExecuteToolResponse;

      expect(result.success).toBe(true);
      expect(result.metadata!.sessionId).toBe("session-123");
    });

    it("should handle tool execution errors", async () => {
      mockToolRegistry.executeTool.mockRejectedValueOnce(
        new Error("Calculation failed"),
      );

      const executeRoute = routes.routes.find(
        (r) => r.path === `${basePath}/tools/execute`,
      )!;

      const ctx = createContext({
        method: "POST",
        body: {
          name: "calculator",
          arguments: { expression: "invalid" },
        },
      });

      const result = (await executeRoute.handler(ctx)) as ExecuteToolResponse;

      expect(result.success).toBe(false);
      expect(result.error).toBe("Calculation failed");
    });

    it("should use default empty arguments when not provided", async () => {
      const executeRoute = routes.routes.find(
        (r) => r.path === `${basePath}/tools/execute`,
      )!;

      const ctx = createContext({
        method: "POST",
        body: {
          name: "calculator",
        },
      });

      const result = (await executeRoute.handler(ctx)) as ExecuteToolResponse;

      expect(mockToolRegistry.executeTool).toHaveBeenCalledWith(
        "calculator",
        {},
      );
      expect(result.success).toBe(true);
    });
  });

  describe("POST /tools/:name/execute", () => {
    it("should execute tool by name in path", async () => {
      const executeByNameRoute = routes.routes.find(
        (r) => r.path === `${basePath}/tools/:name/execute`,
      )!;

      const ctx = createContext({
        method: "POST",
        params: { name: "calculator" },
        body: { expression: "2 + 2" },
      });

      const result = (await executeByNameRoute.handler(
        ctx,
      )) as ExecuteToolResponse;

      expect(mockToolRegistry.executeTool).toHaveBeenCalledWith("calculator", {
        expression: "2 + 2",
      });
      expect(result.success).toBe(true);
    });

    it("should return error for non-existent tool", async () => {
      const executeByNameRoute = routes.routes.find(
        (r) => r.path === `${basePath}/tools/:name/execute`,
      )!;

      const ctx = createContext({
        method: "POST",
        params: { name: "nonExistent" },
        body: {},
      });

      const result = (await executeByNameRoute.handler(
        ctx,
      )) as ExecuteToolResponse;

      expect(result.success).toBe(false);
      expect(result.error).toContain("nonExistent");
    });

    it("should return validation error for missing name", async () => {
      const executeByNameRoute = routes.routes.find(
        (r) => r.path === `${basePath}/tools/:name/execute`,
      )!;

      const ctx = createContext({
        method: "POST",
        params: { name: "" },
        body: { expression: "2 + 2" },
      });

      const result = (await executeByNameRoute.handler(ctx)) as ErrorResponse;

      expect(result).toHaveProperty("error");
      expect(result.error.code).toBe("VALIDATION_ERROR");
    });

    it("should handle empty body as empty arguments", async () => {
      const executeByNameRoute = routes.routes.find(
        (r) => r.path === `${basePath}/tools/:name/execute`,
      )!;

      const ctx = createContext({
        method: "POST",
        params: { name: "calculator" },
        body: undefined,
      });

      const result = (await executeByNameRoute.handler(
        ctx,
      )) as ExecuteToolResponse;

      expect(mockToolRegistry.executeTool).toHaveBeenCalledWith(
        "calculator",
        {},
      );
      expect(result.success).toBe(true);
    });

    it("should include tool name in metadata", async () => {
      const executeByNameRoute = routes.routes.find(
        (r) => r.path === `${basePath}/tools/:name/execute`,
      )!;

      const ctx = createContext({
        method: "POST",
        params: { name: "calculator" },
        body: { expression: "2 + 2" },
      });

      const result = (await executeByNameRoute.handler(
        ctx,
      )) as ExecuteToolResponse;

      expect(result.metadata!.toolName).toBe("calculator");
    });
  });

  describe("GET /tools/search", () => {
    it("should search tools by name", async () => {
      const searchRoute = routes.routes.find(
        (r) => r.path === `${basePath}/tools/search`,
      )!;

      const ctx = createContext({
        query: { q: "calc" },
      });

      const result = (await searchRoute.handler(ctx)) as SearchToolsResponse;

      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].name).toBe("calculator");
      expect(result.query).toBe("calc");
    });

    it("should search tools by description", async () => {
      const searchRoute = routes.routes.find(
        (r) => r.path === `${basePath}/tools/search`,
      )!;

      const ctx = createContext({
        query: { q: "mathematical" },
      });

      const result = (await searchRoute.handler(ctx)) as SearchToolsResponse;

      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].name).toBe("calculator");
    });

    it("should filter by source", async () => {
      const searchRoute = routes.routes.find(
        (r) => r.path === `${basePath}/tools/search`,
      )!;

      const ctx = createContext({
        query: { source: "external" },
      });

      const result = (await searchRoute.handler(ctx)) as SearchToolsResponse;

      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].name).toBe("webSearch");
    });

    it("should filter by source built-in", async () => {
      const searchRoute = routes.routes.find(
        (r) => r.path === `${basePath}/tools/search`,
      )!;

      const ctx = createContext({
        query: { source: "built-in" },
      });

      const result = (await searchRoute.handler(ctx)) as SearchToolsResponse;

      expect(result.tools).toHaveLength(2);
    });

    it("should apply limit", async () => {
      const searchRoute = routes.routes.find(
        (r) => r.path === `${basePath}/tools/search`,
      )!;

      const ctx = createContext({
        query: { limit: "1" },
      });

      const result = (await searchRoute.handler(ctx)) as SearchToolsResponse;

      expect(result.tools).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("should return all tools when no query params", async () => {
      const searchRoute = routes.routes.find(
        (r) => r.path === `${basePath}/tools/search`,
      )!;

      const ctx = createContext({
        query: {},
      });

      const result = (await searchRoute.handler(ctx)) as SearchToolsResponse;

      expect(result.tools).toHaveLength(3);
      expect(result.query).toBeNull();
    });

    it("should combine query and source filters", async () => {
      const searchRoute = routes.routes.find(
        (r) => r.path === `${basePath}/tools/search`,
      )!;

      const ctx = createContext({
        query: { q: "file", source: "built-in" },
      });

      const result = (await searchRoute.handler(ctx)) as SearchToolsResponse;

      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].name).toBe("fileReader");
    });

    it("should be case-insensitive search", async () => {
      const searchRoute = routes.routes.find(
        (r) => r.path === `${basePath}/tools/search`,
      )!;

      const ctx = createContext({
        query: { q: "CALCULATOR" },
      });

      const result = (await searchRoute.handler(ctx)) as SearchToolsResponse;

      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].name).toBe("calculator");
    });

    it("should default limit to 50", async () => {
      // Create many tools
      const manyTools: MockTool[] = Array.from({ length: 100 }, (_, i) => ({
        name: `tool${i}`,
        description: `Tool ${i}`,
        inputSchema: {},
        source: "built-in",
      }));
      mockToolRegistry.listTools.mockResolvedValueOnce(manyTools);

      const searchRoute = routes.routes.find(
        (r) => r.path === `${basePath}/tools/search`,
      )!;

      const ctx = createContext({
        query: {},
      });

      const result = (await searchRoute.handler(ctx)) as SearchToolsResponse;

      expect(result.tools).toHaveLength(50);
    });
  });

  describe("Custom base path", () => {
    it("should use custom base path", () => {
      const customRoutes = createToolRoutes("/v2/api");

      expect(customRoutes.prefix).toBe("/v2/api/tools");
      expect(customRoutes.routes[0].path).toContain("/v2/api/tools");
    });

    it("should use default base path when not provided", () => {
      const defaultRoutes = createToolRoutes();

      expect(defaultRoutes.prefix).toBe("/api/tools");
    });
  });
});
