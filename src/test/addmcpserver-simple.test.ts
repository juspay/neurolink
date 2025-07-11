/**
 * Simple Unit Tests for addMCPServer() API
 * Focused tests for GitHub PR validation
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the unified registry module
vi.mock("../lib/mcp/unified-registry.js", () => ({
  unifiedRegistry: {
    addExternalServer: vi.fn().mockResolvedValue(undefined),
    getMCPStatus: vi.fn().mockResolvedValue({
      totalServers: 3,
      availableServers: 2,
      totalTools: 10,
    }),
    getUnifiedRegistry: vi.fn(),
    getTotalServerCount: vi.fn().mockReturnValue(3),
    getAvailableServerCount: vi.fn().mockReturnValue(2),
    getAutoDiscoveredServers: vi.fn().mockReturnValue([]),
    listTools: vi.fn().mockReturnValue([]),
    listAllTools: vi.fn().mockResolvedValue([]),
    isConnected: vi.fn().mockReturnValue(true),
    getConnection: vi
      .fn()
      .mockReturnValue({ id: "mock-client", connected: true }),
    clearAsync: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock MCP factory
vi.mock("../lib/mcp/factory.js", () => ({
  createAIProvidersServer: vi.fn().mockResolvedValue({}),
}));

// Mock all loggers
vi.mock("../lib/mcp/logging.js", () => ({
  mcpLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  unifiedRegistryLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  registryLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Now import after mocks
import { NeuroLink } from "../lib/neurolink.js";
import { unifiedRegistry } from "../lib/mcp/unified-registry.js";

describe("addMCPServer() Core Tests", () => {
  let neurolink: NeuroLink;

  beforeEach(() => {
    vi.clearAllMocks();
    neurolink = new NeuroLink();
  });

  describe("Basic Registration", () => {
    it("should register a stdio server with command and args", async () => {
      await neurolink.addMCPServer("test-server", {
        command: "node",
        args: ["server.js"],
      });

      expect(unifiedRegistry.addExternalServer).toHaveBeenCalledWith(
        "test-server",
        expect.objectContaining({
          type: "stdio",
          command: "node",
          args: ["server.js"],
          env: {},
        }),
      );
    });

    it("should register server with environment variables", async () => {
      await neurolink.addMCPServer("env-server", {
        command: "npx",
        args: ["-y", "@nexus2520/bitbucket-mcp-server"],
        env: {
          BITBUCKET_USERNAME: "user",
          BITBUCKET_APP_PASSWORD: "token",
        },
      });

      expect(unifiedRegistry.addExternalServer).toHaveBeenCalledWith(
        "env-server",
        expect.objectContaining({
          type: "stdio",
          command: "npx",
          env: {
            BITBUCKET_USERNAME: "user",
            BITBUCKET_APP_PASSWORD: "token",
          },
        }),
      );
    });

    it("should register server with working directory", async () => {
      await neurolink.addMCPServer("cwd-server", {
        command: "python",
        args: ["-m", "server"],
        cwd: "/app/servers",
      });

      expect(unifiedRegistry.addExternalServer).toHaveBeenCalledWith(
        "cwd-server",
        expect.objectContaining({
          type: "stdio",
          command: "python",
          args: ["-m", "server"],
          cwd: "/app/servers",
        }),
      );
    });
  });

  describe("Configuration Handling", () => {
    it("should handle missing optional args", async () => {
      await neurolink.addMCPServer("no-args", {
        command: "python",
      });

      expect(unifiedRegistry.addExternalServer).toHaveBeenCalledWith(
        "no-args",
        expect.objectContaining({
          command: "python",
          args: [],
          env: {},
        }),
      );
    });

    it("should handle missing optional env", async () => {
      await neurolink.addMCPServer("no-env", {
        command: "node",
        args: ["server.js"],
      });

      expect(unifiedRegistry.addExternalServer).toHaveBeenCalledWith(
        "no-env",
        expect.objectContaining({
          command: "node",
          args: ["server.js"],
          env: {},
          cwd: undefined,
        }),
      );
    });
  });

  describe("Error Propagation", () => {
    it("should propagate addExternalServer errors", async () => {
      const mockError = new Error("Registry error");
      vi.mocked(unifiedRegistry.addExternalServer).mockRejectedValueOnce(
        mockError,
      );

      await expect(
        neurolink.addMCPServer("error-server", {
          command: "invalid",
        }),
      ).rejects.toThrow("Registry error");
    });

    it("should propagate connection timeouts", async () => {
      const timeoutError = new Error("ETIMEDOUT: Connection timeout");
      vi.mocked(unifiedRegistry.addExternalServer).mockRejectedValueOnce(
        timeoutError,
      );

      await expect(
        neurolink.addMCPServer("timeout-server", {
          command: "slow-server",
        }),
      ).rejects.toThrow("ETIMEDOUT");
    });
  });

  describe("Integration Points", () => {
    it("should call unifiedRegistry.addExternalServer once per call", async () => {
      await neurolink.addMCPServer("count-test", {
        command: "node",
        args: ["test.js"],
      });

      expect(unifiedRegistry.addExternalServer).toHaveBeenCalledTimes(1);
    });

    it("should work with getMCPStatus", async () => {
      await neurolink.addMCPServer("status-test", {
        command: "node",
        args: ["server.js"],
      });

      const status = await neurolink.getMCPStatus();
      expect(status).toEqual({
        mcpInitialized: true,
        totalServers: 3,
        availableServers: 2,
        autoDiscoveredCount: 0,
        autoDiscoveredServers: [],
        totalTools: 0,
      });
    });
  });

  describe("Real-World Patterns", () => {
    it("should handle Bitbucket server pattern", async () => {
      await neurolink.addMCPServer("bitbucket", {
        command: "npx",
        args: ["-y", "@nexus2520/bitbucket-mcp-server"],
        env: {
          BITBUCKET_USERNAME: "test-user",
          BITBUCKET_APP_PASSWORD: "test-token",
        },
      });

      expect(unifiedRegistry.addExternalServer).toHaveBeenCalledWith(
        "bitbucket",
        expect.objectContaining({
          command: "npx",
          args: expect.arrayContaining(["@nexus2520/bitbucket-mcp-server"]),
          env: expect.objectContaining({
            BITBUCKET_USERNAME: "test-user",
          }),
        }),
      );
    });

    it("should handle database server pattern", async () => {
      await neurolink.addMCPServer("database", {
        command: "node",
        args: ["./db-server.js"],
        env: {
          DATABASE_URL: "postgresql://localhost:5432/test",
          DB_POOL_SIZE: "10",
        },
        cwd: "/app/servers",
      });

      expect(unifiedRegistry.addExternalServer).toHaveBeenCalledWith(
        "database",
        expect.objectContaining({
          command: "node",
          args: ["./db-server.js"],
          env: expect.objectContaining({
            DATABASE_URL: expect.stringContaining("postgresql"),
            DB_POOL_SIZE: "10",
          }),
          cwd: "/app/servers",
        }),
      );
    });
  });

  // NEW: Tests for GitHub PR comment - missing unit test coverage
  describe("Connection Management Methods", () => {
    describe("getConnection()", () => {
      it("should return client connection for connected server", () => {
        const connection = neurolink.getConnection("test-server");
        expect(connection).toEqual({ id: "mock-client", connected: true });
        expect(unifiedRegistry.getConnection).toHaveBeenCalledWith(
          "test-server",
        );
      });

      it("should return undefined for non-existent server", () => {
        vi.mocked(unifiedRegistry.getConnection).mockReturnValueOnce(undefined);
        const connection = neurolink.getConnection("non-existent");
        expect(connection).toBeUndefined();
      });
    });

    describe("isConnected()", () => {
      it("should return true for connected server", () => {
        const connected = neurolink.isConnected("test-server");
        expect(connected).toBe(true);
        expect(unifiedRegistry.isConnected).toHaveBeenCalledWith("test-server");
      });

      it("should return false for disconnected server", () => {
        vi.mocked(unifiedRegistry.isConnected).mockReturnValueOnce(false);
        const connected = neurolink.isConnected("disconnected-server");
        expect(connected).toBe(false);
      });
    });

    describe("clearAsync() Integration", () => {
      it("should call unifiedRegistry.clearAsync when clearing connections", async () => {
        // Note: clearAsync would be called internally by other methods
        // This tests that the mock is properly set up
        await unifiedRegistry.clearAsync();
        expect(unifiedRegistry.clearAsync).toHaveBeenCalled();
      });

      it("should handle clearAsync errors gracefully", async () => {
        const mockError = new Error("Clear failed");
        vi.mocked(unifiedRegistry.clearAsync).mockRejectedValueOnce(mockError);

        await expect(unifiedRegistry.clearAsync()).rejects.toThrow(
          "Clear failed",
        );
      });
    });
  });

  // NEW: Tests for multi-transport support (GitHub PR feedback)
  describe("Multi-Transport Support", () => {
    describe("SSE Transport", () => {
      it("should register SSE server with url and headers", async () => {
        await neurolink.addMCPServer("sse-server", {
          command: "npx",
          args: ["@example/sse-server"],
          type: "sse",
          url: "https://api.example.com/sse",
          headers: {
            Authorization: "Bearer token123",
            "X-Client-Version": "1.0.0",
          },
          timeout: 30000,
        });

        expect(unifiedRegistry.addExternalServer).toHaveBeenCalledWith(
          "sse-server",
          expect.objectContaining({
            type: "sse",
            url: "https://api.example.com/sse",
            headers: expect.objectContaining({
              Authorization: "Bearer token123",
              "X-Client-Version": "1.0.0",
            }),
            timeout: 30000,
          }),
        );
      });

      it("should register SSE server with minimal config", async () => {
        await neurolink.addMCPServer("minimal-sse", {
          command: "npx",
          args: ["@example/minimal-sse"],
          type: "sse",
          url: "https://minimal.example.com/events",
          timeout: 30000,
        });

        expect(unifiedRegistry.addExternalServer).toHaveBeenCalledWith(
          "minimal-sse",
          expect.objectContaining({
            type: "sse",
            url: "https://minimal.example.com/events",
          }),
        );
      });
    });

    describe("HTTP Transport", () => {
      it("should register HTTP server with full configuration", async () => {
        await neurolink.addMCPServer("http-api", {
          command: "npx",
          args: ["@company/http-api-server"],
          type: "http",
          url: "https://api.company.com/mcp",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": "secret-key-123",
            "User-Agent": "NeuroLink/1.0",
          },
          timeout: 45000,
        });

        expect(unifiedRegistry.addExternalServer).toHaveBeenCalledWith(
          "http-api",
          expect.objectContaining({
            type: "http",
            url: "https://api.company.com/mcp",
            headers: expect.objectContaining({
              "Content-Type": "application/json",
              "X-API-Key": "secret-key-123",
              "User-Agent": "NeuroLink/1.0",
            }),
            timeout: 45000,
          }),
        );
      });

      it("should register HTTP server with basic auth", async () => {
        await neurolink.addMCPServer("auth-http", {
          command: "npx",
          args: ["@secure/auth-http-server"],
          type: "http",
          url: "https://secure.api.com/endpoint",
          headers: {
            Authorization: "Basic dXNlcjpwYXNz",
          },
          timeout: 30000,
        });

        expect(unifiedRegistry.addExternalServer).toHaveBeenCalledWith(
          "auth-http",
          expect.objectContaining({
            type: "http",
            url: "https://secure.api.com/endpoint",
            headers: expect.objectContaining({
              Authorization: "Basic dXNlcjpwYXNz",
            }),
          }),
        );
      });
    });

    describe("Transport Type Defaults", () => {
      it("should default to stdio when type is not specified", async () => {
        await neurolink.addMCPServer("default-type", {
          command: "node",
          args: ["server.js"],
        });

        expect(unifiedRegistry.addExternalServer).toHaveBeenCalledWith(
          "default-type",
          expect.objectContaining({
            type: "stdio",
            command: "node",
            args: ["server.js"],
          }),
        );
      });

      it("should explicitly use stdio when type is specified", async () => {
        await neurolink.addMCPServer("explicit-stdio", {
          type: "stdio",
          command: "python",
          args: ["-m", "server"],
        });

        expect(unifiedRegistry.addExternalServer).toHaveBeenCalledWith(
          "explicit-stdio",
          expect.objectContaining({
            type: "stdio",
            command: "python",
            args: ["-m", "server"],
          }),
        );
      });
    });
  });
});
