/**
 * Server Adapters Integration Tests
 * Comprehensive integration tests for all server adapter implementations
 *
 * Tests verify:
 * - Framework adapters (Hono, Express, Fastify, Koa)
 * - Route generation for each framework
 * - Request/response transformation
 * - Middleware integration
 * - OpenAPI 3.1 generation
 * - Authentication middleware
 * - Error handling across frameworks
 * - Framework parity validation
 *
 * @module test/server/integration/server-adapters.integration.test
 */

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { NeuroLink } from "../../../src/lib/neurolink.js";
import type {
  MiddlewareDefinition,
  RouteDefinition,
  ServerAdapterConfig,
  ServerContext,
  ServerFramework,
} from "../../../src/lib/server/types.js";
import {
  ServerAdapterFactory,
  createServer,
} from "../../../src/lib/server/factory/serverAdapterFactory.js";
import { BaseServerAdapter } from "../../../src/lib/server/abstract/baseServerAdapter.js";
import {
  createAuthMiddleware,
  createRoleMiddleware,
  type AuthConfig,
  type AuthResult,
} from "../../../src/lib/server/middleware/auth.js";
import {
  AuthenticationError,
  InvalidAuthenticationError,
} from "../../../src/lib/server/errors.js";
import {
  createRateLimitMiddleware,
  createSlidingWindowRateLimitMiddleware,
  InMemoryRateLimitStore,
  RateLimitError,
} from "../../../src/lib/server/middleware/rateLimit.js";
import {
  createCacheMiddleware,
  createCacheInvalidator,
  InMemoryCacheStore,
} from "../../../src/lib/server/middleware/cache.js";
import {
  createRequestValidationMiddleware,
  createFieldValidator,
  ValidationError,
} from "../../../src/lib/server/middleware/validation.js";
import {
  createTimingMiddleware,
  createRequestIdMiddleware,
  createErrorHandlingMiddleware,
  createSecurityHeadersMiddleware,
  createLoggingMiddleware,
} from "../../../src/lib/server/middleware/common.js";
import {
  createAllRoutes,
  createAgentRoutes,
  createToolRoutes,
  createMCPRoutes,
  createMemoryRoutes,
  createHealthRoutes,
  registerAllRoutes,
} from "../../../src/lib/server/routes/index.js";
import {
  OpenAPIGenerator,
  createOpenAPIGenerator,
  generateOpenAPISpec,
  generateOpenAPIFromConfig,
  type OpenAPISpec,
} from "../../../src/lib/server/openapi/generator.js";
import { z } from "zod";
import {
  validateRequest,
  validateParams,
  validateQuery,
  createErrorResponse,
  AgentExecuteRequestSchema,
  ToolExecuteRequestSchema,
} from "../../../src/lib/server/utils/validation.js";

// Mock the logger to avoid noise in tests
vi.mock("../../../src/lib/utils/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock @hono/node-server for Hono adapter
vi.mock("@hono/node-server", () => ({
  serve: vi.fn(() => ({
    close: vi.fn((cb) => cb?.()),
  })),
}));

// Mock express module
const mockExpressApp = {
  use: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
  options: vi.fn(),
  listen: vi.fn((port: number, host: string, callback: () => void) => {
    callback();
    return {
      close: vi.fn((cb?: () => void) => cb?.()),
    };
  }),
};

const mockExpress = vi.fn(() => mockExpressApp);
mockExpress.json = vi.fn(() => vi.fn());
mockExpress.urlencoded = vi.fn(() => vi.fn());

vi.mock("express", () => ({
  default: mockExpress,
}));

vi.mock("cors", () => ({
  default: vi.fn(() => vi.fn()),
}));

vi.mock("express-rate-limit", () => ({
  default: vi.fn(() => vi.fn()),
}));

// Mock Fastify
const mockFastifyInstance = {
  addHook: vi.fn(),
  setErrorHandler: vi.fn(),
  setNotFoundHandler: vi.fn(),
  route: vi.fn(),
  hasRoute: vi.fn().mockReturnValue(false),
  register: vi.fn().mockResolvedValue(undefined),
  listen: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
};

vi.mock("fastify", () => ({
  default: vi.fn(() => mockFastifyInstance),
}));

vi.mock("@fastify/cors", () => ({
  default: vi.fn(),
}));

vi.mock("@fastify/rate-limit", () => ({
  default: vi.fn(),
}));

// Mock Koa
const mockKoaApp = {
  use: vi.fn(),
  listen: vi.fn((port: number, host: string, callback: () => void) => {
    callback();
    return {
      close: vi.fn((cb?: () => void) => cb?.()),
    };
  }),
};

const mockKoaRouter = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
  options: vi.fn(),
  routes: vi.fn(() => vi.fn()),
  allowedMethods: vi.fn(() => vi.fn()),
};

vi.mock("koa", () => ({
  default: vi.fn(() => mockKoaApp),
}));

vi.mock("@koa/router", () => ({
  default: vi.fn(() => mockKoaRouter),
}));

vi.mock("@koa/cors", () => ({
  default: vi.fn(() => vi.fn()),
}));

vi.mock("koa-bodyparser", () => ({
  default: vi.fn(() => vi.fn()),
}));

// ============================================
// Test Setup - Mock NeuroLink and Dependencies
// ============================================

const createMockNeuroLink = () => {
  const mockToolRegistry = {
    listTools: vi.fn().mockResolvedValue([
      { name: "testTool", description: "A test tool", inputSchema: {} },
      {
        name: "anotherTool",
        description: "Another tool",
        inputSchema: { type: "object" },
      },
    ]),
    executeTool: vi.fn().mockResolvedValue({ result: "success" }),
    getTool: vi
      .fn()
      .mockResolvedValue({ name: "testTool", description: "A test tool" }),
  };

  const mockExternalServerManager = {
    getServerStatuses: vi.fn().mockReturnValue([
      {
        serverId: "server1",
        name: "GitHub",
        status: "connected",
        toolCount: 5,
      },
      { serverId: "server2", name: "Slack", status: "connected", toolCount: 3 },
    ]),
    getServerStatus: vi
      .fn()
      .mockReturnValue({ serverId: "server1", status: "connected" }),
  };

  return {
    getToolRegistry: vi.fn().mockReturnValue(mockToolRegistry),
    getExternalServerManager: vi
      .fn()
      .mockReturnValue(mockExternalServerManager),
    generate: vi.fn().mockResolvedValue({
      content: "Generated response",
      provider: "openai",
      model: "gpt-4",
      usage: { input: 10, output: 20, total: 30 },
      finishReason: "stop",
    }),
    stream: vi.fn().mockResolvedValue({
      stream: (async function* () {
        yield { text: "chunk1" };
        yield { text: "chunk2" };
        yield { text: "chunk3" };
      })(),
    }),
    getConversationMemory: vi.fn().mockReturnValue(null),
    toolRegistry: mockToolRegistry,
    externalServerManager: mockExternalServerManager,
  };
};

// ============================================
// Test Suites
// ============================================

describe("Server Adapters Integration Tests", () => {
  let mockNeuroLink: ReturnType<typeof createMockNeuroLink>;
  const frameworks: ServerFramework[] = ["hono", "express", "fastify", "koa"];

  beforeEach(() => {
    vi.clearAllMocks();
    mockNeuroLink = createMockNeuroLink();
  });

  // ============================================
  // 1. Framework Adapter Tests
  // ============================================
  describe("1. Framework Adapters", () => {
    describe("ServerAdapterFactory", () => {
      it("should create Hono adapter", async () => {
        const adapter = await ServerAdapterFactory.create({
          framework: "hono",
          neurolink: mockNeuroLink as unknown as NeuroLink,
        });
        expect(adapter).toBeDefined();
        expect(adapter).toBeInstanceOf(BaseServerAdapter);
      });

      it("should create Express adapter", async () => {
        const adapter = await ServerAdapterFactory.create({
          framework: "express",
          neurolink: mockNeuroLink as unknown as NeuroLink,
        });
        expect(adapter).toBeDefined();
        expect(adapter).toBeInstanceOf(BaseServerAdapter);
      });

      it("should create Fastify adapter", async () => {
        const adapter = await ServerAdapterFactory.create({
          framework: "fastify",
          neurolink: mockNeuroLink as unknown as NeuroLink,
        });
        expect(adapter).toBeDefined();
        expect(adapter).toBeInstanceOf(BaseServerAdapter);
      });

      it("should create Koa adapter", async () => {
        const adapter = await ServerAdapterFactory.create({
          framework: "koa",
          neurolink: mockNeuroLink as unknown as NeuroLink,
        });
        expect(adapter).toBeDefined();
        expect(adapter).toBeInstanceOf(BaseServerAdapter);
      });

      it("should throw error for unknown framework", async () => {
        await expect(
          ServerAdapterFactory.create({
            framework: "unknown" as ServerFramework,
            neurolink: mockNeuroLink as unknown as NeuroLink,
          }),
        ).rejects.toThrow(/Unknown framework/);
      });

      it("should use convenience methods to create adapters", async () => {
        const honoAdapter = await ServerAdapterFactory.createHono(
          mockNeuroLink as unknown as NeuroLink,
        );
        const expressAdapter = await ServerAdapterFactory.createExpress(
          mockNeuroLink as unknown as NeuroLink,
        );
        const fastifyAdapter = await ServerAdapterFactory.createFastify(
          mockNeuroLink as unknown as NeuroLink,
        );
        const koaAdapter = await ServerAdapterFactory.createKoa(
          mockNeuroLink as unknown as NeuroLink,
        );

        expect(honoAdapter).toBeInstanceOf(BaseServerAdapter);
        expect(expressAdapter).toBeInstanceOf(BaseServerAdapter);
        expect(fastifyAdapter).toBeInstanceOf(BaseServerAdapter);
        expect(koaAdapter).toBeInstanceOf(BaseServerAdapter);
      });

      it("should verify supported frameworks", () => {
        expect(ServerAdapterFactory.isSupported("hono")).toBe(true);
        expect(ServerAdapterFactory.isSupported("express")).toBe(true);
        expect(ServerAdapterFactory.isSupported("fastify")).toBe(true);
        expect(ServerAdapterFactory.isSupported("koa")).toBe(true);
        expect(ServerAdapterFactory.isSupported("unknown")).toBe(false);
      });

      it("should return list of supported frameworks with descriptions", () => {
        const supported = ServerAdapterFactory.getSupportedFrameworks();
        expect(supported).toHaveLength(4);
        expect(supported.map((s) => s.framework)).toEqual([
          "hono",
          "express",
          "fastify",
          "koa",
        ]);
        expect(supported.every((s) => s.status === "available")).toBe(true);
        expect(supported.every((s) => s.description.length > 0)).toBe(true);
      });

      it("should return Hono as recommended framework", () => {
        expect(ServerAdapterFactory.getRecommendedFramework()).toBe("hono");
      });
    });

    describe("createServer helper function", () => {
      it("should create server with default framework (Hono)", async () => {
        const server = await createServer(
          mockNeuroLink as unknown as NeuroLink,
        );
        expect(server).toBeInstanceOf(BaseServerAdapter);
      });

      it("should create server with specified framework", async () => {
        const server = await createServer(
          mockNeuroLink as unknown as NeuroLink,
          {
            framework: "express",
          },
        );
        expect(server).toBeInstanceOf(BaseServerAdapter);
      });

      it("should create server with custom config", async () => {
        const server = await createServer(
          mockNeuroLink as unknown as NeuroLink,
          {
            framework: "hono",
            config: { port: 4000, host: "127.0.0.1" },
          },
        );
        const config = server.getConfig();
        expect(config.port).toBe(4000);
        expect(config.host).toBe("127.0.0.1");
      });
    });
  });

  // ============================================
  // 2. Route Generation Tests
  // ============================================
  describe("2. Route Generation", () => {
    describe("Route Builders", () => {
      it("should create all standard routes", () => {
        const routes = createAllRoutes("/api");
        expect(routes.length).toBe(5); // agent, tools, mcp, memory, health
        expect(routes.map((r) => r.prefix)).toContain("/api/agent");
        expect(routes.map((r) => r.prefix)).toContain("/api/tools");
        expect(routes.map((r) => r.prefix)).toContain("/api/mcp");
        expect(routes.map((r) => r.prefix)).toContain("/api/memory");
        expect(routes.map((r) => r.prefix)).toContain("/api/health");
      });

      it("should create agent routes with execute and stream endpoints", () => {
        const agentRoutes = createAgentRoutes("/api");
        expect(agentRoutes.routes.some((r) => r.path.includes("execute"))).toBe(
          true,
        );
        expect(agentRoutes.routes.some((r) => r.path.includes("stream"))).toBe(
          true,
        );
        expect(
          agentRoutes.routes.some((r) => r.path.includes("providers")),
        ).toBe(true);
      });

      it("should create tool routes with list and execute endpoints", () => {
        const toolRoutes = createToolRoutes("/api");
        expect(
          toolRoutes.routes.some(
            (r) => r.method === "GET" && r.path === "/api/tools",
          ),
        ).toBe(true);
        expect(
          toolRoutes.routes.some((r) => r.path.includes(":name/execute")),
        ).toBe(true);
      });

      it("should create MCP routes for server management", () => {
        const mcpRoutes = createMCPRoutes("/api");
        expect(mcpRoutes.routes.some((r) => r.path.includes("servers"))).toBe(
          true,
        );
      });

      it("should create memory routes for session management", () => {
        const memoryRoutes = createMemoryRoutes("/api");
        expect(
          memoryRoutes.routes.some((r) => r.path.includes("sessions")),
        ).toBe(true);
      });

      it("should create health routes", () => {
        const healthRoutes = createHealthRoutes("/api");
        expect(healthRoutes.routes.some((r) => r.path === "/api/health")).toBe(
          true,
        );
        // Health routes are prefixed with /health, so ready is at /api/health/ready
        expect(
          healthRoutes.routes.some((r) => r.path === "/api/health/ready"),
        ).toBe(true);
      });
    });

    describe("Route Registration with Adapters", () => {
      for (const framework of frameworks) {
        it(`should register all routes with ${framework} adapter`, async () => {
          const adapter = await ServerAdapterFactory.create({
            framework,
            neurolink: mockNeuroLink as unknown as NeuroLink,
            config: { disableBuiltInHealth: true }, // Avoid duplicates
          });

          await adapter.initialize();
          registerAllRoutes(adapter, "/api");

          const routes = adapter.listRoutes();
          expect(routes.length).toBeGreaterThan(10);
        });
      }

      it("should register route groups with custom prefix", async () => {
        const adapter = await ServerAdapterFactory.createHono(
          mockNeuroLink as unknown as NeuroLink,
        );
        await adapter.initialize();

        adapter.registerRouteGroup({
          prefix: "/v2/api",
          routes: [
            {
              method: "GET",
              path: "/custom",
              handler: async () => ({ custom: true }),
            },
            {
              method: "POST",
              path: "/custom",
              handler: async () => ({ created: true }),
            },
          ],
        });

        const routes = adapter.listRoutes();
        expect(
          routes.some((r) => r.path === "/v2/api/custom" && r.method === "GET"),
        ).toBe(true);
        expect(
          routes.some(
            (r) => r.path === "/v2/api/custom" && r.method === "POST",
          ),
        ).toBe(true);
      });
    });
  });

  // ============================================
  // 3. Request/Response Transformation Tests
  // ============================================
  describe("3. Request/Response Transformation", () => {
    describe("Request Validation", () => {
      it("should validate agent execute request", () => {
        const validRequest = { input: "Hello", provider: "openai" };
        // validateRequest signature: (schema, data, requestId?)
        const result = validateRequest(AgentExecuteRequestSchema, validRequest);
        expect(result.success).toBe(true);
      });

      it("should reject invalid agent execute request", () => {
        const invalidRequest = { provider: "openai" }; // Missing input
        const result = validateRequest(
          AgentExecuteRequestSchema,
          invalidRequest,
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeDefined();
        }
      });

      it("should validate tool execute request", () => {
        const validRequest = { name: "testTool", arguments: { key: "value" } };
        const result = validateRequest(ToolExecuteRequestSchema, validRequest);
        expect(result.success).toBe(true);
      });

      it("should validate params with schema", () => {
        const params = { id: "123" };
        const paramsSchema = z.object({ id: z.string() });
        const result = validateParams(paramsSchema, params);
        expect(result.success).toBe(true);
      });

      it("should validate query parameters", () => {
        const query = { limit: "10", offset: "0" };
        const querySchema = z.object({
          limit: z.string().optional(),
          offset: z.string().optional(),
        });
        const result = validateQuery(querySchema, query);
        expect(result.success).toBe(true);
      });
    });

    describe("Error Response Creation", () => {
      it("should create standardized error response", () => {
        const error = createErrorResponse("VALIDATION_ERROR", "Invalid input", {
          field: "input",
        });
        expect(error.error.code).toBe("VALIDATION_ERROR");
        expect(error.error.message).toBe("Invalid input");
        expect(error.error.details?.field).toBe("input");
        expect(error.metadata?.timestamp).toBeDefined();
      });
    });

    describe("Field Validation", () => {
      it("should create field validator function", () => {
        // createFieldValidator(fieldName, rules) returns a validation function
        const validator = createFieldValidator("email", {
          type: "string",
          minLength: 1,
        });
        expect(validator).toBeDefined();
        expect(typeof validator).toBe("function");
      });
    });
  });

  // ============================================
  // 4. Middleware Integration Tests
  // ============================================
  describe("4. Middleware Integration", () => {
    describe("Authentication Middleware", () => {
      it("should create bearer auth middleware", () => {
        const authMiddleware = createAuthMiddleware({
          type: "bearer",
          validate: async (token) => {
            if (token === "valid-token") {
              return { id: "user1", email: "user@example.com" };
            }
            return null;
          },
        });
        expect(authMiddleware.name).toBe("authentication");
        expect(authMiddleware.order).toBe(10);
      });

      it("should create API key auth middleware", () => {
        const authMiddleware = createAuthMiddleware({
          type: "api-key",
          headerName: "x-api-key",
          validate: async (key) => {
            if (key === "valid-api-key") {
              return { id: "api-user" };
            }
            return null;
          },
        });
        expect(authMiddleware.name).toBe("authentication");
      });

      it("should create basic auth middleware", () => {
        const authMiddleware = createAuthMiddleware({
          type: "basic",
          validate: async (credentials) => {
            const decoded = Buffer.from(credentials, "base64").toString();
            const [username, password] = decoded.split(":");
            if (username === "admin" && password === "secret") {
              return { id: "admin", roles: ["admin"] };
            }
            return null;
          },
        });
        expect(authMiddleware.name).toBe("authentication");
      });

      it("should support custom token extractor", () => {
        const authMiddleware = createAuthMiddleware({
          type: "custom",
          extractToken: (ctx) => ctx.headers["x-custom-auth"] || null,
          validate: async (token) => {
            if (token === "custom-token") {
              return { id: "custom-user" };
            }
            return null;
          },
        });
        expect(authMiddleware.name).toBe("authentication");
      });

      it("should support skip paths", () => {
        const authMiddleware = createAuthMiddleware({
          type: "bearer",
          validate: async () => null,
          skipPaths: ["/api/health", "/api/ready", "/public"],
        });
        expect(authMiddleware.excludePaths).toContain("/api/health");
        expect(authMiddleware.excludePaths).toContain("/api/ready");
        expect(authMiddleware.excludePaths).toContain("/public");
      });
    });

    describe("Role-Based Access Control", () => {
      it("should create role middleware requiring any role", () => {
        const roleMiddleware = createRoleMiddleware({
          requiredRoles: ["admin", "moderator"],
          requireAll: false,
        });
        expect(roleMiddleware.name).toBe("role-check");
        expect(roleMiddleware.order).toBe(11);
      });

      it("should create role middleware requiring all roles", () => {
        const roleMiddleware = createRoleMiddleware({
          requiredRoles: ["admin", "superuser"],
          requireAll: true,
        });
        expect(roleMiddleware.name).toBe("role-check");
      });
    });

    describe("Rate Limiting Middleware", () => {
      it("should create rate limit middleware", () => {
        const rateLimitMiddleware = createRateLimitMiddleware({
          windowMs: 60000,
          maxRequests: 100,
          keyGenerator: (ctx) => ctx.headers["x-forwarded-for"] || "unknown",
        });
        expect(rateLimitMiddleware.name).toBe("rate-limit");
      });

      it("should create sliding window rate limit middleware", () => {
        const slidingMiddleware = createSlidingWindowRateLimitMiddleware({
          windowMs: 60000,
          maxRequests: 100,
        });
        expect(slidingMiddleware.name).toBe("sliding-window-rate-limit");
      });

      it("should use in-memory rate limit store", () => {
        const store = new InMemoryRateLimitStore();
        expect(store.increment).toBeDefined();
        expect(store.reset).toBeDefined();
        expect(store.get).toBeDefined();
      });
    });

    describe("Cache Middleware", () => {
      it("should create cache middleware", () => {
        const cacheMiddleware = createCacheMiddleware({
          ttlMs: 300000,
          keyGenerator: (ctx) => `${ctx.method}:${ctx.path}`,
        });
        expect(cacheMiddleware.name).toBe("cache");
      });

      it("should create cache invalidator", () => {
        const store = new InMemoryCacheStore();
        const invalidator = createCacheInvalidator(store);
        expect(invalidator).toBeDefined();
      });

      it("should use in-memory cache store", () => {
        const store = new InMemoryCacheStore();
        expect(store.get).toBeDefined();
        expect(store.set).toBeDefined();
        expect(store.delete).toBeDefined();
        expect(store.clear).toBeDefined();
      });
    });

    describe("Validation Middleware", () => {
      it("should create request validation middleware", () => {
        const validationMiddleware = createRequestValidationMiddleware({
          body: {
            type: "object",
            properties: {
              name: { type: "string" },
            },
            required: ["name"],
          },
        });
        expect(validationMiddleware.name).toBe("request-validation");
      });
    });

    describe("Common Middleware", () => {
      it("should create timing middleware", () => {
        const timingMiddleware = createTimingMiddleware();
        expect(timingMiddleware.name).toBe("timing");
      });

      it("should create request ID middleware", () => {
        const requestIdMiddleware = createRequestIdMiddleware();
        expect(requestIdMiddleware.name).toBe("request-id");
      });

      it("should create error handling middleware", () => {
        const errorMiddleware = createErrorHandlingMiddleware();
        expect(errorMiddleware.name).toBe("error-handling");
      });

      it("should create security headers middleware", () => {
        const securityMiddleware = createSecurityHeadersMiddleware();
        expect(securityMiddleware.name).toBe("security-headers");
      });

      it("should create logging middleware", () => {
        const loggingMiddleware = createLoggingMiddleware({
          includeBody: true,
          includeResponse: true,
        });
        expect(loggingMiddleware.name).toBe("logging");
      });
    });

    describe("Middleware Registration with Adapters", () => {
      for (const framework of frameworks) {
        it(`should register multiple middleware with ${framework} adapter`, async () => {
          const adapter = await ServerAdapterFactory.create({
            framework,
            neurolink: mockNeuroLink as unknown as NeuroLink,
          });

          await adapter.initialize();

          const authMiddleware = createAuthMiddleware({
            type: "bearer",
            validate: async (token) => (token ? { id: "user" } : null),
            skipPaths: ["/api/health"],
          });

          const rateLimitMiddleware = createRateLimitMiddleware({
            windowMs: 60000,
            maxRequests: 100,
          });

          adapter.registerMiddleware(authMiddleware);
          adapter.registerMiddleware(rateLimitMiddleware);

          const status = adapter.getStatus();
          expect(status.middlewares).toBeGreaterThanOrEqual(4); // Built-in + custom
        });
      }
    });
  });

  // ============================================
  // 5. OpenAPI 3.1 Generation Tests
  // ============================================
  describe("5. OpenAPI 3.1 Generation", () => {
    describe("OpenAPI Generator", () => {
      it("should generate OpenAPI 3.1 spec", () => {
        const generator = new OpenAPIGenerator();
        const spec = generator.generate();

        expect(spec.openapi).toBe("3.1.0");
        expect(spec.info).toBeDefined();
        expect(spec.paths).toBeDefined();
        expect(spec.components).toBeDefined();
      });

      it("should generate spec with custom info", () => {
        const generator = new OpenAPIGenerator({
          info: {
            title: "Custom API",
            version: "2.0.0",
            description: "A custom API",
          },
        });
        const spec = generator.generate();

        expect(spec.info.title).toBe("Custom API");
        expect(spec.info.version).toBe("2.0.0");
      });

      it("should generate spec with custom servers", () => {
        const generator = new OpenAPIGenerator({
          servers: [
            { url: "https://api.example.com", description: "Production" },
            { url: "https://staging.example.com", description: "Staging" },
          ],
        });
        const spec = generator.generate();

        expect(spec.servers).toHaveLength(2);
        expect(spec.servers[0].url).toBe("https://api.example.com");
      });

      it("should include security schemes when configured", () => {
        const generator = new OpenAPIGenerator({ includeSecurity: true });
        const spec = generator.generate();

        expect(spec.components.securitySchemes).toBeDefined();
        expect(spec.components.securitySchemes?.bearerAuth).toBeDefined();
        expect(spec.components.securitySchemes?.apiKeyAuth).toBeDefined();
        expect(spec.security).toBeDefined();
      });

      it("should add routes to generator", () => {
        const generator = new OpenAPIGenerator();

        generator.addRoute({
          method: "GET",
          path: "/api/custom",
          handler: async () => ({}),
          description: "Custom endpoint",
          tags: ["custom"],
        });

        generator.addRoutes([
          {
            method: "POST",
            path: "/api/create",
            handler: async () => ({}),
            description: "Create endpoint",
          },
        ]);

        const spec = generator.generate();
        expect(spec.paths["/api/custom"]).toBeDefined();
        expect(spec.paths["/api/create"]).toBeDefined();
      });

      it("should convert path parameters to OpenAPI format", () => {
        const generator = new OpenAPIGenerator();

        generator.addRoute({
          method: "GET",
          path: "/api/users/:id/posts/:postId",
          handler: async () => ({}),
        });

        const spec = generator.generate();
        expect(spec.paths["/api/users/{id}/posts/{postId}"]).toBeDefined();
      });

      it("should include request schema for POST/PUT/PATCH", () => {
        const generator = new OpenAPIGenerator();

        generator.addRoute({
          method: "POST",
          path: "/api/create",
          handler: async () => ({}),
          requestSchema: {
            type: "object",
            properties: { name: { type: "string" } },
            required: ["name"],
          },
        });

        const spec = generator.generate();
        expect(spec.paths["/api/create"].post.requestBody).toBeDefined();
      });

      it("should include response schema", () => {
        const generator = new OpenAPIGenerator();

        generator.addRoute({
          method: "GET",
          path: "/api/item",
          handler: async () => ({}),
          responseSchema: {
            type: "object",
            properties: { id: { type: "string" } },
          },
        });

        const spec = generator.generate();
        expect(spec.paths["/api/item"].get.responses["200"]).toBeDefined();
      });

      it("should handle streaming routes", () => {
        const generator = new OpenAPIGenerator();

        generator.addRoute({
          method: "POST",
          path: "/api/stream",
          handler: async () => ({}),
          streaming: { enabled: true },
        });

        const spec = generator.generate();
        expect(
          spec.paths["/api/stream"].post.responses["200"].content[
            "text/event-stream"
          ],
        ).toBeDefined();
      });

      it("should add custom tags", () => {
        const generator = new OpenAPIGenerator({
          additionalTags: [{ name: "custom", description: "Custom endpoints" }],
        });
        const spec = generator.generate();

        const customTag = spec.tags.find(
          (t: { name: string }) => t.name === "custom",
        );
        expect(customTag).toBeDefined();
      });

      it("should add custom schemas", () => {
        const generator = new OpenAPIGenerator({
          customSchemas: {
            CustomType: {
              type: "object",
              properties: { value: { type: "string" } },
            },
          },
        });
        const spec = generator.generate();

        expect(spec.components.schemas.CustomType).toBeDefined();
      });

      it("should generate JSON output", () => {
        const generator = new OpenAPIGenerator();
        const json = generator.toJSON();
        const parsed = JSON.parse(json);

        expect(parsed.openapi).toBe("3.1.0");
      });

      it("should generate YAML output", () => {
        const generator = new OpenAPIGenerator();
        const yaml = generator.toYAML();

        expect(yaml).toContain("openapi:");
        expect(yaml).toContain("3.1.0");
      });
    });

    describe("OpenAPI Factory Functions", () => {
      it("should create generator with factory function", () => {
        const generator = createOpenAPIGenerator({ basePath: "/v2" });
        expect(generator).toBeInstanceOf(OpenAPIGenerator);
      });

      it("should generate spec from routes", () => {
        const routes: RouteDefinition[] = [
          { method: "GET", path: "/api/test", handler: async () => ({}) },
        ];
        const spec = generateOpenAPISpec(routes);

        expect(spec.paths["/api/test"]).toBeDefined();
      });

      it("should generate spec from server config", () => {
        const config: ServerAdapterConfig = {
          port: 3000,
          host: "localhost",
          basePath: "/api",
        };
        const spec = generateOpenAPIFromConfig(config);

        expect(spec.servers[0].url).toBe("http://localhost:3000");
      });
    });
  });

  // ============================================
  // 6. Error Handling Tests
  // ============================================
  describe("6. Error Handling", () => {
    describe("Error Types", () => {
      it("should create AuthenticationError", () => {
        const error = new AuthenticationError("Authentication required");
        expect(error.code).toBe("SERVER_ADAPTER_AUTH_REQUIRED");
        expect(error.message).toBe("Authentication required");
        expect(error.name).toBe("AuthenticationError");
      });

      it("should create InvalidAuthenticationError", () => {
        const error = new InvalidAuthenticationError("Token is invalid");
        expect(error.code).toBe("SERVER_ADAPTER_AUTH_INVALID");
        expect(error.message).toBe("Token is invalid");
        expect(error.name).toBe("InvalidAuthenticationError");
      });

      it("should create RateLimitError", () => {
        // RateLimitError constructor: (retryAfterMs, message?, requestId?)
        const error = new RateLimitError(60000, "Too many requests");
        expect(error.message).toBe("Too many requests");
        expect(error.retryAfterMs).toBe(60000);
      });

      it("should create ValidationError", () => {
        // ValidationError constructor: (errors[], requestId?)
        const error = new ValidationError([
          { field: "name", message: "Name is required" },
        ]);
        expect(error.message).toContain("Name is required");
        expect(error.errors).toHaveLength(1);
      });
    });

    describe("Error Handling in Adapters", () => {
      for (const framework of frameworks) {
        it(`should handle errors in ${framework} adapter`, async () => {
          const adapter = await ServerAdapterFactory.create({
            framework,
            neurolink: mockNeuroLink as unknown as NeuroLink,
          });

          await adapter.initialize();

          const errorHandler = vi.fn();
          adapter.on("error", errorHandler);

          // Register a route that throws
          adapter.registerRoute({
            method: "GET",
            path: "/api/error",
            handler: async () => {
              throw new Error("Test error");
            },
          });

          const routes = adapter.listRoutes();
          expect(routes.some((r) => r.path === "/api/error")).toBe(true);
        });
      }
    });
  });

  // ============================================
  // 7. Framework Parity Validation Tests
  // ============================================
  describe("7. Framework Parity Validation", () => {
    describe("Configuration Parity", () => {
      it("should apply same default config across all frameworks", async () => {
        const configs: Record<
          string,
          ReturnType<BaseServerAdapter["getConfig"]>
        > = {};

        for (const framework of frameworks) {
          const adapter = await ServerAdapterFactory.create({
            framework,
            neurolink: mockNeuroLink as unknown as NeuroLink,
          });
          configs[framework] = adapter.getConfig();
        }

        // All adapters should have same default port
        expect(new Set(Object.values(configs).map((c) => c.port)).size).toBe(1);

        // All adapters should have same default host
        expect(new Set(Object.values(configs).map((c) => c.host)).size).toBe(1);

        // All adapters should have same default basePath
        expect(
          new Set(Object.values(configs).map((c) => c.basePath)).size,
        ).toBe(1);
      });

      it("should accept same config shape across all frameworks", async () => {
        const config: ServerAdapterConfig = {
          port: 4000,
          host: "127.0.0.1",
          basePath: "/v2/api",
          cors: { enabled: true, origins: ["https://example.com"] },
          rateLimit: { enabled: true, maxRequests: 50 },
          bodyParser: { enabled: true, jsonLimit: "5mb" },
          logging: { enabled: true, level: "debug" },
          timeout: 60000,
        };

        for (const framework of frameworks) {
          const adapter = await ServerAdapterFactory.create({
            framework,
            neurolink: mockNeuroLink as unknown as NeuroLink,
            config,
          });
          const appliedConfig = adapter.getConfig();

          expect(appliedConfig.port).toBe(4000);
          expect(appliedConfig.host).toBe("127.0.0.1");
          expect(appliedConfig.basePath).toBe("/v2/api");
          expect(appliedConfig.cors.origins).toContain("https://example.com");
          expect(appliedConfig.rateLimit.maxRequests).toBe(50);
        }
      });
    });

    describe("Route Registration Parity", () => {
      it("should register same routes across all frameworks", async () => {
        const routeCounts: Record<string, number> = {};

        for (const framework of frameworks) {
          const adapter = await ServerAdapterFactory.create({
            framework,
            neurolink: mockNeuroLink as unknown as NeuroLink,
          });
          await adapter.initialize();

          const routes = adapter.listRoutes();
          routeCounts[framework] = routes.length;
        }

        // All frameworks should have same number of built-in routes
        const counts = Object.values(routeCounts);
        expect(new Set(counts).size).toBe(1);
      });

      it("should support same HTTP methods across all frameworks", async () => {
        const methods: Array<RouteDefinition["method"]> = [
          "GET",
          "POST",
          "PUT",
          "DELETE",
          "PATCH",
        ];

        for (const framework of frameworks) {
          const adapter = await ServerAdapterFactory.create({
            framework,
            neurolink: mockNeuroLink as unknown as NeuroLink,
          });
          await adapter.initialize();

          for (const method of methods) {
            adapter.registerRoute({
              method,
              path: `/api/test-${method.toLowerCase()}`,
              handler: async () => ({ method }),
            });
          }

          const routes = adapter.listRoutes();
          for (const method of methods) {
            const route = routes.find(
              (r) => r.method === method && r.path.includes("test-"),
            );
            expect(route).toBeDefined();
          }
        }
      });
    });

    describe("Status Parity", () => {
      it("should return same status structure across all frameworks", async () => {
        for (const framework of frameworks) {
          const adapter = await ServerAdapterFactory.create({
            framework,
            neurolink: mockNeuroLink as unknown as NeuroLink,
          });
          await adapter.initialize();

          const status = adapter.getStatus();

          expect(status).toHaveProperty("running");
          expect(status).toHaveProperty("port");
          expect(status).toHaveProperty("host");
          expect(status).toHaveProperty("uptime");
          expect(status).toHaveProperty("routes");
          expect(status).toHaveProperty("middlewares");

          expect(typeof status.running).toBe("boolean");
          expect(typeof status.port).toBe("number");
          expect(typeof status.host).toBe("string");
          expect(typeof status.uptime).toBe("number");
          expect(typeof status.routes).toBe("number");
          expect(typeof status.middlewares).toBe("number");
        }
      });
    });

    describe("Event Parity", () => {
      it("should emit same events across all frameworks", async () => {
        for (const framework of frameworks) {
          const adapter = await ServerAdapterFactory.create({
            framework,
            neurolink: mockNeuroLink as unknown as NeuroLink,
          });

          const initHandler = vi.fn();
          adapter.on("initialized", initHandler);

          await adapter.initialize();

          expect(initHandler).toHaveBeenCalledWith(
            expect.objectContaining({
              routeCount: expect.any(Number),
              middlewareCount: expect.any(Number),
            }),
          );
        }
      });

      it("should emit started/stopped events across all frameworks", async () => {
        for (const framework of frameworks) {
          const adapter = await ServerAdapterFactory.create({
            framework,
            neurolink: mockNeuroLink as unknown as NeuroLink,
          });
          await adapter.initialize();

          const startHandler = vi.fn();
          const stopHandler = vi.fn();

          adapter.on("started", startHandler);
          adapter.on("stopped", stopHandler);

          await adapter.start();
          expect(startHandler).toHaveBeenCalledWith(
            expect.objectContaining({
              port: expect.any(Number),
              host: expect.any(String),
              timestamp: expect.any(Date),
            }),
          );

          await adapter.stop();
          expect(stopHandler).toHaveBeenCalledWith(
            expect.objectContaining({
              uptime: expect.any(Number),
              timestamp: expect.any(Date),
            }),
          );
        }
      });
    });
  });

  // ============================================
  // 8. Streaming Integration Tests
  // ============================================
  describe("8. Streaming Integration", () => {
    for (const framework of frameworks) {
      describe(`${framework} streaming`, () => {
        it("should register streaming route", async () => {
          const adapter = await ServerAdapterFactory.create({
            framework,
            neurolink: mockNeuroLink as unknown as NeuroLink,
          });
          await adapter.initialize();

          adapter.registerRoute({
            method: "POST",
            path: "/api/stream",
            streaming: { enabled: true, contentType: "text/event-stream" },
            handler: async function* () {
              yield { chunk: 1 };
              yield { chunk: 2 };
              yield { chunk: 3 };
            },
          });

          const routes = adapter.listRoutes();
          const streamRoute = routes.find((r) => r.path === "/api/stream");

          expect(streamRoute).toBeDefined();
          expect(streamRoute?.streaming?.enabled).toBe(true);
        });

        it("should support async iterable handlers", async () => {
          const adapter = await ServerAdapterFactory.create({
            framework,
            neurolink: mockNeuroLink as unknown as NeuroLink,
          });
          await adapter.initialize();

          adapter.registerRoute({
            method: "GET",
            path: "/api/async-stream",
            streaming: { enabled: true },
            handler: async () => {
              return (async function* () {
                for (let i = 0; i < 5; i++) {
                  yield { index: i, timestamp: Date.now() };
                }
              })();
            },
          });

          const routes = adapter.listRoutes();
          expect(routes.some((r) => r.path === "/api/async-stream")).toBe(true);
        });
      });
    }
  });

  // ============================================
  // 9. Lifecycle Management Tests
  // ============================================
  describe("9. Lifecycle Management", () => {
    for (const framework of frameworks) {
      describe(`${framework} lifecycle`, () => {
        let adapter: BaseServerAdapter;

        beforeEach(async () => {
          adapter = await ServerAdapterFactory.create({
            framework,
            neurolink: mockNeuroLink as unknown as NeuroLink,
          });
        });

        afterEach(async () => {
          try {
            // Only stop if the server is actually running
            const status = adapter.getStatus();
            if (status.running) {
              await adapter.stop();
            }
          } catch {
            // Ignore cleanup errors
          }
        });

        it("should initialize successfully", async () => {
          await adapter.initialize();
          const status = adapter.getStatus();
          expect(status.routes).toBeGreaterThan(0);
        });

        it("should start successfully", async () => {
          await adapter.initialize();
          await adapter.start();
          expect(adapter.getStatus().running).toBe(true);
        });

        it("should not start twice", async () => {
          await adapter.initialize();
          await adapter.start();
          // Attempting to start a running server should throw an error
          await expect(adapter.start()).rejects.toThrow();
        });

        it("should stop successfully", async () => {
          await adapter.initialize();
          await adapter.start();
          await adapter.stop();
          expect(adapter.getStatus().running).toBe(false);
        });

        it("should not stop when not running", async () => {
          await adapter.initialize();
          // stop() is idempotent - calling it when server is not running should return gracefully
          await expect(adapter.stop()).resolves.toBeUndefined();
        });

        it("should track uptime", async () => {
          await adapter.initialize();
          await adapter.start();
          await new Promise((resolve) => setTimeout(resolve, 50));
          const status = adapter.getStatus();
          expect(status.uptime).toBeGreaterThan(0);
        });

        it("should provide framework instance", async () => {
          await adapter.initialize();
          const instance = adapter.getFrameworkInstance();
          expect(instance).toBeDefined();
        });
      });
    }
  });

  // ============================================
  // 10. Context and Metadata Tests
  // ============================================
  describe("10. Context and Metadata", () => {
    for (const framework of frameworks) {
      it(`should create proper context in ${framework}`, async () => {
        const adapter = await ServerAdapterFactory.create({
          framework,
          neurolink: mockNeuroLink as unknown as NeuroLink,
        });
        await adapter.initialize();

        let capturedContext: ServerContext | null = null;

        adapter.registerRoute({
          method: "GET",
          path: "/api/context-test",
          handler: async (ctx) => {
            capturedContext = ctx;
            return {
              hasNeurolink: !!ctx.neurolink,
              hasToolRegistry: !!ctx.toolRegistry,
              hasTimestamp: typeof ctx.timestamp === "number",
              hasRequestId: typeof ctx.requestId === "string",
            };
          },
        });

        const routes = adapter.listRoutes();
        expect(routes.some((r) => r.path === "/api/context-test")).toBe(true);
      });
    }
  });
});
