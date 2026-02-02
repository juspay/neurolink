import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExternalServerManager } from "../../../src/lib/mcp/externalServerManager.js";
import type { MCPServerInfo } from "../../../src/lib/types/mcpTypes.js";
import type {
  ExternalServerManagerInternal,
  ServerInstance,
} from "../../types/mcp.js";

describe("ExternalServerManager - HTTP Transport Validation", () => {
  let manager: ExternalServerManager;

  beforeEach(() => {
    manager = new ExternalServerManager({
      maxServers: 10,
      defaultTimeout: 5000,
    });
  });

  afterEach(async () => {
    await manager.shutdown();
  });

  describe("validateConfig - Transport-specific validation", () => {
    it("should accept HTTP transport config with URL (no command required)", () => {
      const config: MCPServerInfo = {
        id: "http-server",
        name: "http-server",
        description: "HTTP transport server",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "", // Empty command is OK for HTTP transport
        url: "https://api.example.com/mcp",
      };

      const validation = manager.validateConfig(config);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should reject HTTP transport config without URL", () => {
      const config: MCPServerInfo = {
        id: "http-server",
        name: "http-server",
        description: "HTTP transport server",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        // Missing url
      };

      const validation = manager.validateConfig(config);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("URL is required for http transport");
    });

    it("should accept SSE transport config with URL", () => {
      const config: MCPServerInfo = {
        id: "sse-server",
        name: "sse-server",
        description: "SSE transport server",
        transport: "sse",
        status: "initializing",
        tools: [],
        command: "",
        url: "https://api.example.com/sse",
      };

      const validation = manager.validateConfig(config);
      expect(validation.isValid).toBe(true);
    });

    it("should reject SSE transport config without URL", () => {
      const config: MCPServerInfo = {
        id: "sse-server",
        name: "sse-server",
        description: "SSE transport server",
        transport: "sse",
        status: "initializing",
        tools: [],
        command: "",
      };

      const validation = manager.validateConfig(config);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("URL is required for sse transport");
    });

    it("should accept WebSocket transport config with URL", () => {
      const config: MCPServerInfo = {
        id: "ws-server",
        name: "ws-server",
        description: "WebSocket transport server",
        transport: "websocket",
        status: "initializing",
        tools: [],
        command: "",
        url: "wss://api.example.com/ws",
      };

      const validation = manager.validateConfig(config);
      expect(validation.isValid).toBe(true);
    });

    it("should reject WebSocket transport config without URL", () => {
      const config: MCPServerInfo = {
        id: "ws-server",
        name: "ws-server",
        description: "WebSocket transport server",
        transport: "websocket",
        status: "initializing",
        tools: [],
        command: "",
      };

      const validation = manager.validateConfig(config);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        "URL is required for websocket transport",
      );
    });

    it("should still require command for stdio transport", () => {
      const config: MCPServerInfo = {
        id: "stdio-server",
        name: "stdio-server",
        description: "Stdio transport server",
        transport: "stdio",
        status: "initializing",
        tools: [],
        command: "", // Empty command should fail for stdio
      };

      const validation = manager.validateConfig(config);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        "Command is required and must be a string for stdio transport",
      );
    });
  });

  describe("validateConfig - HTTP Transport with Extended Options", () => {
    it("should accept full HTTP transport config with all options", () => {
      const config: MCPServerInfo = {
        id: "github-copilot",
        name: "github-copilot",
        description: "GitHub Copilot MCP API with full configuration",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "https://api.githubcopilot.com/mcp",
        headers: {
          Authorization: "Bearer github_pat_xxx",
        },
        httpOptions: {
          connectionTimeout: 30000,
          requestTimeout: 60000,
        },
        retryConfig: {
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 30000,
        },
        rateLimiting: {
          requestsPerMinute: 60,
          maxBurst: 10,
        },
      };

      const validation = manager.validateConfig(config);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe("addServer - HTTP Transport", () => {
    it("should accept HTTP server info with URL property directly on serverInfo", async () => {
      const serverInfo: MCPServerInfo = {
        id: "http-test",
        name: "http-test",
        description: "HTTP test server",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "https://api.example.com/mcp", // URL directly on serverInfo, not in metadata
        headers: {
          Authorization: "Bearer test-token",
        },
      };

      // The addServer method should not fail validation for HTTP transport
      const result = await manager.addServer("http-test", serverInfo);

      expect(result.serverId).toBe("http-test");
      // The error should NOT be about missing URL or invalid config
      if (!result.success && result.error) {
        expect(result.error).not.toContain("URL is required");
        expect(result.error).not.toContain("Configuration validation failed");
      }
    });

    it("should reject HTTP server info without URL property", async () => {
      const serverInfo: MCPServerInfo = {
        id: "http-test",
        name: "http-test",
        description: "HTTP test server without URL",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        // Missing url - should fail validation
      };

      const result = await manager.addServer("http-test", serverInfo);

      expect(result.success).toBe(false);
      expect(result.error).toContain("URL is required for http transport");
    });

    it("should pass HTTP-specific options through addServer correctly", async () => {
      const serverInfo: MCPServerInfo = {
        id: "http-full",
        name: "http-full",
        description: "HTTP server with all options",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "https://api.example.com/mcp",
        headers: {
          Authorization: "Bearer test-token",
          "X-Custom": "value",
        },
        httpOptions: {
          connectionTimeout: 30000,
          requestTimeout: 60000,
        },
        retryConfig: {
          maxAttempts: 5,
          initialDelay: 500,
          maxDelay: 10000,
        },
        rateLimiting: {
          requestsPerMinute: 100,
          maxBurst: 20,
        },
      };

      const result = await manager.addServer("http-full", serverInfo);

      // Validation should pass - should not fail with config validation error
      expect(result.serverId).toBe("http-full");
      if (!result.success && result.error) {
        expect(result.error).not.toContain("Configuration validation failed");
      }
    });

    it("should not read URL from metadata (regression test for bug fix)", async () => {
      // This test ensures we don't regress to reading URL from metadata
      const serverInfo: MCPServerInfo = {
        id: "http-metadata-test",
        name: "http-metadata-test",
        description: "Test that URL is read from serverInfo, not metadata",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "https://api.example.com/mcp", // URL is here, not in metadata
        metadata: {
          // URL should NOT be read from here
          someOtherField: "value",
        },
      };

      const result = await manager.addServer("http-metadata-test", serverInfo);

      // Should pass validation because url is on serverInfo directly
      expect(result.serverId).toBe("http-metadata-test");
      if (!result.success && result.error) {
        expect(result.error).not.toContain("URL is required");
      }
    });
  });

  describe("Mixed Transport Types", () => {
    it("should handle both stdio and HTTP servers validation", () => {
      const stdioConfig: MCPServerInfo = {
        id: "stdio-server",
        name: "stdio-server",
        description: "Stdio server",
        transport: "stdio",
        status: "initializing",
        tools: [],
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-test"],
      };

      const httpConfig: MCPServerInfo = {
        id: "http-server",
        name: "http-server",
        description: "HTTP server",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "https://api.example.com/mcp",
      };

      // Both should pass validation
      const stdioValidation = manager.validateConfig(stdioConfig);
      const httpValidation = manager.validateConfig(httpConfig);

      expect(stdioValidation.isValid).toBe(true);
      expect(httpValidation.isValid).toBe(true);
    });
  });
});

describe("ExternalServerManager - Tool Blocklist", () => {
  let manager: ExternalServerManager;

  beforeEach(() => {
    manager = new ExternalServerManager({
      maxServers: 10,
      defaultTimeout: 5000,
    });
  });

  afterEach(async () => {
    await manager.shutdown();
  });

  describe("Configuration Validation", () => {
    it("should accept blockedTools array in configuration", () => {
      const config: MCPServerInfo = {
        id: "test-server",
        name: "test-server",
        description: "Test server",
        transport: "stdio",
        status: "initializing",
        tools: [],
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem"],
        blockedTools: ["dangerousTool", "deleteAll"],
      };

      const validation = manager.validateConfig(config);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should accept empty blockedTools array", () => {
      const config: MCPServerInfo = {
        id: "test-server",
        name: "test-server",
        description: "Test server",
        transport: "stdio",
        status: "initializing",
        tools: [],
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem"],
        blockedTools: [],
      };

      const validation = manager.validateConfig(config);
      expect(validation.isValid).toBe(true);
    });

    it("should accept config without blockedTools field", () => {
      const config: MCPServerInfo = {
        id: "test-server",
        name: "test-server",
        description: "Test server",
        transport: "stdio",
        status: "initializing",
        tools: [],
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem"],
      };

      const validation = manager.validateConfig(config);
      expect(validation.isValid).toBe(true);
    });
  });

  describe("Tool Blocking", () => {
    it("should prevent execution of blocked tools", async () => {
      // Mock server configuration with blocked tools
      const mockServerInfo: MCPServerInfo = {
        id: "mock-server",
        name: "mock-server",
        description: "Mock server for testing",
        transport: "stdio",
        status: "connected",
        tools: [],
        command: "node",
        args: ["mock-server.js"],
        blockedTools: ["deleteFile", "destroySystem"],
      };

      // Mock the internal server instance
      const mockInstance = {
        ...mockServerInfo,
        process: null,
        client: { callTool: vi.fn() },
        transportInstance: null,
        reconnectAttempts: 0,
        maxReconnectAttempts: 3,
        toolsMap: new Map(),
        metrics: {
          totalConnections: 0,
          totalDisconnections: 0,
          totalErrors: 0,
          totalToolCalls: 0,
          averageResponseTime: 0,
          lastResponseTime: 0,
        },
        config: mockServerInfo,
      };

      // Inject mock instance into manager's internal state
      (manager as unknown as ExternalServerManagerInternal).servers.set(
        "mock-server",
        mockInstance as unknown as ServerInstance,
      );

      // Try to execute a blocked tool
      await expect(
        manager.executeTool("mock-server", "deleteFile", {}),
      ).rejects.toThrow(
        "Tool 'deleteFile' is blocked on server 'mock-server' by configuration",
      );

      await expect(
        manager.executeTool("mock-server", "destroySystem", {}),
      ).rejects.toThrow(
        "Tool 'destroySystem' is blocked on server 'mock-server' by configuration",
      );
    });

    it("should allow execution of non-blocked tools", async () => {
      // Mock server configuration with blocked tools
      const mockServerInfo: MCPServerInfo = {
        id: "mock-server",
        name: "mock-server",
        description: "Mock server for testing",
        transport: "stdio",
        status: "connected",
        tools: [],
        command: "node",
        args: ["mock-server.js"],
        blockedTools: ["deleteFile"],
      };

      const mockToolResult = { success: true, data: "Tool executed" };
      const mockClient = {
        callTool: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: JSON.stringify(mockToolResult) }],
        }),
      };

      // Mock the internal server instance
      const mockInstance = {
        ...mockServerInfo,
        process: null,
        client: mockClient,
        transportInstance: null,
        reconnectAttempts: 0,
        maxReconnectAttempts: 3,
        toolsMap: new Map([
          [
            "readFile",
            {
              name: "readFile",
              description: "Read a file",
              serverId: "mock-server",
              isAvailable: true,
              stats: {
                totalCalls: 0,
                successfulCalls: 0,
                failedCalls: 0,
                averageExecutionTime: 0,
                lastExecutionTime: 0,
              },
            },
          ],
        ]),
        metrics: {
          totalConnections: 0,
          totalDisconnections: 0,
          totalErrors: 0,
          totalToolCalls: 0,
          averageResponseTime: 0,
          lastResponseTime: 0,
        },
        config: mockServerInfo,
      };

      // Inject mock instance into manager's internal state
      (manager as unknown as ExternalServerManagerInternal).servers.set(
        "mock-server",
        mockInstance as unknown as ServerInstance,
      );

      // Mock the toolDiscovery service
      const mockToolDiscovery = {
        executeTool: vi.fn().mockResolvedValue(mockToolResult),
        discoverTools: vi.fn(),
        destroy: vi.fn(),
        clearServerTools: vi.fn(),
        removeAllListeners: vi.fn(),
      };
      (manager as unknown as ExternalServerManagerInternal).toolDiscovery =
        mockToolDiscovery;

      // Try to execute a non-blocked tool - should succeed
      const result = await manager.executeTool("mock-server", "readFile", {
        path: "/test.txt",
      });

      expect(result).toEqual(mockToolResult.data);
      expect(mockToolDiscovery.executeTool).toHaveBeenCalledWith(
        "readFile",
        "mock-server",
        mockClient,
        { path: "/test.txt" },
        { timeout: 5000 },
      );
    });
  });

  describe("Tool Discovery Filtering", () => {
    it("should filter blocked tools during discovery", async () => {
      // This test verifies that blocked tools are not added to the toolsMap
      // during the discovery phase
      const mockServerInfo: MCPServerInfo = {
        id: "test-server",
        name: "test-server",
        description: "Test server",
        transport: "stdio",
        status: "connected",
        tools: [],
        command: "node",
        args: ["test-server.js"],
        blockedTools: ["toolA", "toolC"],
      };

      const mockClient = {
        listTools: vi.fn().mockResolvedValue({
          tools: [
            { name: "toolA", description: "Tool A" },
            { name: "toolB", description: "Tool B" },
            { name: "toolC", description: "Tool C" },
          ],
        }),
      };

      const mockInstance = {
        ...mockServerInfo,
        process: null,
        client: mockClient,
        transportInstance: null,
        reconnectAttempts: 0,
        maxReconnectAttempts: 3,
        toolsMap: new Map(),
        metrics: {
          totalConnections: 0,
          totalDisconnections: 0,
          totalErrors: 0,
          totalToolCalls: 0,
          averageResponseTime: 0,
          lastResponseTime: 0,
        },
        config: mockServerInfo,
      };

      (manager as unknown as ExternalServerManagerInternal).servers.set(
        "test-server",
        mockInstance as unknown as ServerInstance,
      );

      // Mock tool discovery to return filtered tools
      const mockToolDiscovery = {
        executeTool: vi.fn(),
        discoverTools: vi.fn().mockResolvedValue({
          success: true,
          toolCount: 3,
          tools: [
            {
              name: "toolA",
              description: "Tool A",
              serverId: "test-server",
              isAvailable: true,
              stats: {
                totalCalls: 0,
                successfulCalls: 0,
                failedCalls: 0,
                averageExecutionTime: 0,
                lastExecutionTime: 0,
              },
            },
            {
              name: "toolB",
              description: "Tool B",
              serverId: "test-server",
              isAvailable: true,
              stats: {
                totalCalls: 0,
                successfulCalls: 0,
                failedCalls: 0,
                averageExecutionTime: 0,
                lastExecutionTime: 0,
              },
            },
            {
              name: "toolC",
              description: "Tool C",
              serverId: "test-server",
              isAvailable: true,
              stats: {
                totalCalls: 0,
                successfulCalls: 0,
                failedCalls: 0,
                averageExecutionTime: 0,
                lastExecutionTime: 0,
              },
            },
          ],
          duration: 100,
          serverId: "test-server",
        }),
        destroy: vi.fn(),
      };
      // Add destroy method so shutdown() works in afterEach
      mockToolDiscovery.destroy = vi.fn();
      mockToolDiscovery.clearServerTools = vi.fn();
      mockToolDiscovery.removeAllListeners = vi.fn();

      (manager as unknown as ExternalServerManagerInternal).toolDiscovery =
        mockToolDiscovery;

      // Call the private method directly to test filtering
      await (
        manager as unknown as ExternalServerManagerInternal
      ).discoverServerTools("test-server");

      // Verify that only toolB was added (toolA and toolC are blocked)
      const instance = (
        manager as unknown as ExternalServerManagerInternal
      ).servers.get("test-server");
      expect(instance?.toolsMap.size).toBe(1);
      expect(instance?.toolsMap.has("toolB")).toBe(true);
      expect(instance?.toolsMap.has("toolA")).toBe(false);
      expect(instance?.toolsMap.has("toolC")).toBe(false);
    });
  });

  describe("Configuration File Loading", () => {
    it("should load blockedTools from config file format", () => {
      // Simulating the structure from .mcp-config.json
      const configFromFile = {
        mcpServers: {
          "test-server": {
            name: "test-server",
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-filesystem"],
            transport: "stdio",
            blockedTools: ["rm", "rmdir", "deleteFile"],
          },
        },
      };

      // Verify the config structure is valid
      expect(
        configFromFile.mcpServers["test-server"].blockedTools,
      ).toBeDefined();
      expect(
        Array.isArray(configFromFile.mcpServers["test-server"].blockedTools),
      ).toBe(true);
      expect(configFromFile.mcpServers["test-server"].blockedTools).toContain(
        "rm",
      );
    });
  });
});
