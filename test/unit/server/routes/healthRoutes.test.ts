/**
 * Health Routes Tests
 * Comprehensive tests for the health check API routes
 */

import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { createHealthRoutes } from "../../../../src/lib/server/routes/healthRoutes.js";
import { createMockContext } from "../../../utils/server-test-utils.js";
import type {
  HealthResponse,
  ReadyResponse,
} from "../../../../src/lib/server/types.js";

// ============================================
// Test-specific type definitions
// ============================================

/** Mock tool registry interface for testing */
type MockToolRegistry = {
  listTools: Mock<[], Promise<MockTool[]>>;
};

/** Mock tool interface */
type MockTool = {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  source?: string;
  serverId?: string;
};

/** Mock external server status */
type MockServerStatus = {
  serverId: string;
  status: string;
  toolCount: number;
};

/** Mock external server manager interface for testing */
type MockExternalServerManager = {
  getServerStatuses: Mock<[], MockServerStatus[]>;
};

/** Mock conversation memory interface */
type MockConversationMemory = {
  constructor: { name: string };
};

/** Mock NeuroLink interface for testing */
type MockNeuroLink = {
  conversationMemory?: MockConversationMemory;
};

/** Liveness response type */
type LivenessResponse = {
  status: string;
  timestamp: string;
};

/** Startup response type */
type StartupResponse = {
  started: boolean;
  timestamp: string;
  services: {
    neurolink: boolean;
    toolsLoaded: number;
    externalServerManager: boolean;
  };
};

/** Detailed health response type */
type DetailedHealthResponse = {
  status: string;
  timestamp: string;
  uptime: number;
  version: string;
  node: {
    version: string;
    platform: string;
    arch: string;
  };
  memory: {
    available: boolean;
    type: string;
    process: {
      heapUsed: number;
      heapTotal: number;
      rss: number;
    };
  };
  tools: {
    total: number;
    bySource: Record<string, number>;
  };
  externalServers: {
    count: number;
    servers: Array<{
      name: string;
      status: string;
      toolCount: number;
    }>;
  };
};

/** Version response type */
type VersionResponse = {
  name: string;
  version: string;
  node: string;
  timestamp: string;
};

describe("Health Routes", () => {
  const basePath = "/api";
  let routes: ReturnType<typeof createHealthRoutes>;
  let mockToolRegistry: MockToolRegistry;
  let mockExternalServerManager: MockExternalServerManager;
  let mockNeuroLink: MockNeuroLink;

  const mockTools = [
    {
      name: "tool1",
      description: "Tool 1",
      inputSchema: {},
      source: "built-in",
    },
    {
      name: "tool2",
      description: "Tool 2",
      inputSchema: {},
      source: "external",
      serverId: "github",
    },
  ];

  // Helper that wraps imported createMockContext with local mocks
  const createContext = (overrides: Record<string, unknown> = {}) =>
    createMockContext({
      path: `${basePath}/health`,
      neurolink: mockNeuroLink as Partial<MockNeuroLink>,
      toolRegistry: mockToolRegistry as Partial<MockToolRegistry>,
      externalServerManager:
        mockExternalServerManager as Partial<MockExternalServerManager>,
      ...overrides,
    });

  beforeEach(() => {
    vi.clearAllMocks();

    mockToolRegistry = {
      listTools: vi.fn().mockResolvedValue([...mockTools]),
    };

    mockExternalServerManager = {
      getServerStatuses: vi.fn().mockReturnValue([
        { serverId: "github", status: "connected", toolCount: 5 },
        { serverId: "postgres", status: "connected", toolCount: 3 },
      ]),
    };

    mockNeuroLink = {
      // The health route uses ctx.neurolink.conversationMemory directly
      conversationMemory: {
        constructor: { name: "RedisMemory" },
      },
    };

    routes = createHealthRoutes(basePath);
  });

  describe("createHealthRoutes", () => {
    it("should create route group with correct prefix", () => {
      expect(routes.prefix).toBe(`${basePath}/health`);
    });

    it("should create six routes", () => {
      expect(routes.routes.length).toBe(6);
    });

    it("should create basic health route", () => {
      const healthRoute = routes.routes.find(
        (r) => r.path === `${basePath}/health`,
      );
      expect(healthRoute).toBeDefined();
      expect(healthRoute?.method).toBe("GET");
      expect(healthRoute?.tags).toContain("health");
    });

    it("should create liveness route", () => {
      const liveRoute = routes.routes.find(
        (r) => r.path === `${basePath}/health/live`,
      );
      expect(liveRoute).toBeDefined();
      expect(liveRoute?.method).toBe("GET");
    });

    it("should create readiness route", () => {
      const readyRoute = routes.routes.find(
        (r) => r.path === `${basePath}/health/ready`,
      );
      expect(readyRoute).toBeDefined();
      expect(readyRoute?.method).toBe("GET");
    });

    it("should create startup route", () => {
      const startupRoute = routes.routes.find(
        (r) => r.path === `${basePath}/health/startup`,
      );
      expect(startupRoute).toBeDefined();
      expect(startupRoute?.method).toBe("GET");
    });

    it("should create detailed health route", () => {
      const detailedRoute = routes.routes.find(
        (r) => r.path === `${basePath}/health/detailed`,
      );
      expect(detailedRoute).toBeDefined();
      expect(detailedRoute?.method).toBe("GET");
    });

    it("should create version route", () => {
      const versionRoute = routes.routes.find(
        (r) => r.path === `${basePath}/version`,
      );
      expect(versionRoute).toBeDefined();
      expect(versionRoute?.method).toBe("GET");
    });
  });

  describe("GET /health", () => {
    it("should return basic health status", async () => {
      const healthRoute = routes.routes.find(
        (r) => r.path === `${basePath}/health`,
      )!;

      const ctx = createContext();
      const result = (await healthRoute.handler(ctx)) as HealthResponse;

      expect(result.status).toBe("ok");
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.version).toBeDefined();
    });

    it("should return ISO timestamp", async () => {
      const healthRoute = routes.routes.find(
        (r) => r.path === `${basePath}/health`,
      )!;

      const ctx = createContext();
      const result = (await healthRoute.handler(ctx)) as HealthResponse;

      // Should be valid ISO timestamp
      const parsedDate = new Date(result.timestamp);
      expect(parsedDate.toISOString()).toBe(result.timestamp);
    });
  });

  describe("GET /health/live", () => {
    it("should return alive status", async () => {
      const liveRoute = routes.routes.find(
        (r) => r.path === `${basePath}/health/live`,
      )!;

      const ctx = createContext();
      const result = (await liveRoute.handler(ctx)) as LivenessResponse;

      expect(result.status).toBe("alive");
      expect(result.timestamp).toBeDefined();
    });

    it("should always return alive when server is running", async () => {
      const liveRoute = routes.routes.find(
        (r) => r.path === `${basePath}/health/live`,
      )!;

      const ctx = createContext();
      const result = (await liveRoute.handler(ctx)) as LivenessResponse;

      // Liveness check is simple - just confirms server responds
      expect(result.status).toBe("alive");
    });
  });

  describe("GET /health/ready", () => {
    it("should return ready status with all services healthy", async () => {
      const readyRoute = routes.routes.find(
        (r) => r.path === `${basePath}/health/ready`,
      )!;

      const ctx = createContext();
      const result = (await readyRoute.handler(ctx)) as ReadyResponse;

      expect(result.ready).toBe(true);
      expect(result.timestamp).toBeDefined();
      expect(result.services.neurolink).toBe(true);
      expect(result.services.tools).toBe(true);
      expect(result.services.externalServers).toBe(true);
    });

    it("should return ready=true when no external servers exist", async () => {
      const ctx = createContext({
        externalServerManager: undefined,
      });

      const readyRoute = routes.routes.find(
        (r) => r.path === `${basePath}/health/ready`,
      )!;

      const result = (await readyRoute.handler(ctx)) as ReadyResponse;

      expect(result.ready).toBe(true);
      expect(result.services.externalServers).toBe(true);
    });

    it("should return ready=false when external server is not connected", async () => {
      mockExternalServerManager.getServerStatuses.mockReturnValueOnce([
        { serverId: "github", status: "connected", toolCount: 5 },
        { serverId: "postgres", status: "failed", toolCount: 0 },
      ]);

      const readyRoute = routes.routes.find(
        (r) => r.path === `${basePath}/health/ready`,
      )!;

      const ctx = createContext();
      const result = (await readyRoute.handler(ctx)) as ReadyResponse;

      expect(result.services.externalServers).toBe(false);
    });

    it("should return ready=true when tools exist but no external manager", async () => {
      const ctx = createContext({
        externalServerManager: undefined,
      });

      const readyRoute = routes.routes.find(
        (r) => r.path === `${basePath}/health/ready`,
      )!;

      const result = (await readyRoute.handler(ctx)) as ReadyResponse;

      expect(result.ready).toBe(true);
      expect(result.services.tools).toBe(true);
    });

    it("should indicate no tools when registry is empty", async () => {
      mockToolRegistry.listTools.mockResolvedValueOnce([]);

      const readyRoute = routes.routes.find(
        (r) => r.path === `${basePath}/health/ready`,
      )!;

      const ctx = createContext({
        externalServerManager: undefined,
      });
      const result = (await readyRoute.handler(ctx)) as ReadyResponse;

      expect(result.services.tools).toBe(false);
    });
  });

  describe("GET /health/startup", () => {
    it("should return startup status", async () => {
      const startupRoute = routes.routes.find(
        (r) => r.path === `${basePath}/health/startup`,
      )!;

      const ctx = createContext();
      const result = (await startupRoute.handler(ctx)) as StartupResponse;

      expect(result.started).toBe(true);
      expect(result.timestamp).toBeDefined();
      expect(result.services.neurolink).toBe(true);
      expect(result.services.toolsLoaded).toBe(2);
      expect(result.services.externalServerManager).toBe(true);
    });

    it("should indicate no external manager when not present", async () => {
      const startupRoute = routes.routes.find(
        (r) => r.path === `${basePath}/health/startup`,
      )!;

      const ctx = createContext({
        externalServerManager: undefined,
      });
      const result = (await startupRoute.handler(ctx)) as StartupResponse;

      expect(result.services.externalServerManager).toBe(false);
    });

    it("should show number of loaded tools", async () => {
      mockToolRegistry.listTools.mockResolvedValueOnce([
        { name: "tool1" },
        { name: "tool2" },
        { name: "tool3" },
      ]);

      const startupRoute = routes.routes.find(
        (r) => r.path === `${basePath}/health/startup`,
      )!;

      const ctx = createContext();
      const result = (await startupRoute.handler(ctx)) as StartupResponse;

      expect(result.services.toolsLoaded).toBe(3);
    });
  });

  describe("GET /health/detailed", () => {
    it("should return detailed health information", async () => {
      const detailedRoute = routes.routes.find(
        (r) => r.path === `${basePath}/health/detailed`,
      )!;

      const ctx = createContext();
      const result = (await detailedRoute.handler(
        ctx,
      )) as DetailedHealthResponse;

      expect(result.status).toBe("ok");
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.version).toBeDefined();
      expect(result.node).toBeDefined();
      expect(result.memory).toBeDefined();
      expect(result.tools).toBeDefined();
      expect(result.externalServers).toBeDefined();
    });

    it("should include node information", async () => {
      const detailedRoute = routes.routes.find(
        (r) => r.path === `${basePath}/health/detailed`,
      )!;

      const ctx = createContext();
      const result = (await detailedRoute.handler(
        ctx,
      )) as DetailedHealthResponse;

      expect(result.node.version).toBeDefined();
      expect(result.node.platform).toBeDefined();
      expect(result.node.arch).toBeDefined();
    });

    it("should include memory information", async () => {
      const detailedRoute = routes.routes.find(
        (r) => r.path === `${basePath}/health/detailed`,
      )!;

      const ctx = createContext();
      const result = (await detailedRoute.handler(
        ctx,
      )) as DetailedHealthResponse;

      expect(result.memory.available).toBe(true);
      expect(result.memory.type).toBe("RedisMemory");
      expect(result.memory.process).toBeDefined();
      expect(result.memory.process.heapUsed).toBeGreaterThanOrEqual(0);
      expect(result.memory.process.heapTotal).toBeGreaterThanOrEqual(0);
      expect(result.memory.process.rss).toBeGreaterThanOrEqual(0);
    });

    it("should group tools by source", async () => {
      const detailedRoute = routes.routes.find(
        (r) => r.path === `${basePath}/health/detailed`,
      )!;

      const ctx = createContext();
      const result = (await detailedRoute.handler(
        ctx,
      )) as DetailedHealthResponse;

      expect(result.tools.total).toBe(2);
      expect(result.tools.bySource["built-in"]).toBe(1);
      // The second tool has source="external" and serverId="github"
      // The code groups by source if it's a string, otherwise by serverId
      // Since source="external", it groups by "external"
      expect(result.tools.bySource["external"]).toBe(1);
    });

    it("should include external server information", async () => {
      const detailedRoute = routes.routes.find(
        (r) => r.path === `${basePath}/health/detailed`,
      )!;

      const ctx = createContext();
      const result = (await detailedRoute.handler(
        ctx,
      )) as DetailedHealthResponse;

      expect(result.externalServers.count).toBe(2);
      expect(result.externalServers.servers).toHaveLength(2);
      expect(result.externalServers.servers[0]).toEqual({
        name: "github",
        status: "connected",
        toolCount: 5,
      });
    });

    it("should handle missing memory", async () => {
      const detailedRoute = routes.routes.find(
        (r) => r.path === `${basePath}/health/detailed`,
      )!;

      // Create context with neurolink that has no conversationMemory
      const ctx = createContext({
        neurolink: { conversationMemory: undefined } as Partial<MockNeuroLink>,
      });
      const result = (await detailedRoute.handler(
        ctx,
      )) as DetailedHealthResponse;

      expect(result.memory.available).toBe(false);
      expect(result.memory.type).toBe("none");
    });

    it("should handle missing external server manager", async () => {
      const detailedRoute = routes.routes.find(
        (r) => r.path === `${basePath}/health/detailed`,
      )!;

      const ctx = createContext({
        externalServerManager: undefined,
      });
      const result = (await detailedRoute.handler(
        ctx,
      )) as DetailedHealthResponse;

      expect(result.externalServers.count).toBe(0);
      expect(result.externalServers.servers).toHaveLength(0);
    });
  });

  describe("GET /version", () => {
    it("should return version information", async () => {
      const versionRoute = routes.routes.find(
        (r) => r.path === `${basePath}/version`,
      )!;

      const ctx = createContext();
      const result = (await versionRoute.handler(ctx)) as VersionResponse;

      expect(result.name).toBe("@juspay/neurolink");
      expect(result.version).toBeDefined();
      expect(result.node).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it("should return node version", async () => {
      const versionRoute = routes.routes.find(
        (r) => r.path === `${basePath}/version`,
      )!;

      const ctx = createContext();
      const result = (await versionRoute.handler(ctx)) as VersionResponse;

      expect(result.node).toMatch(/^v\d+\.\d+\.\d+/);
    });
  });

  describe("Custom base path", () => {
    it("should use custom base path", () => {
      const customRoutes = createHealthRoutes("/v2/api");

      expect(customRoutes.prefix).toBe("/v2/api/health");
      expect(customRoutes.routes[0].path).toContain("/v2/api/health");
    });

    it("should use default base path when not provided", () => {
      const defaultRoutes = createHealthRoutes();

      expect(defaultRoutes.prefix).toBe("/api/health");
    });
  });

  describe("Route Tags", () => {
    it("should have health tag on health routes", () => {
      const healthRoutes = routes.routes.filter(
        (r) => r.path.includes("/health") || r.path.includes("/version"),
      );

      for (const route of healthRoutes) {
        expect(route.tags).toContain("health");
      }
    });

    it("should have version tag on version route", () => {
      const versionRoute = routes.routes.find(
        (r) => r.path === `${basePath}/version`,
      );

      expect(versionRoute?.tags).toContain("version");
    });
  });

  describe("Route Descriptions", () => {
    it("should have descriptions for all routes", () => {
      for (const route of routes.routes) {
        expect(route.description).toBeDefined();
        expect(route.description?.length).toBeGreaterThan(0);
      }
    });
  });
});
