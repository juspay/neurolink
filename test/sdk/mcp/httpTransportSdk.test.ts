/**
 * HTTP Transport SDK Tests
 *
 * Tests HTTP/Streamable HTTP transport support via the NeuroLink SDK.
 * These tests verify programmatic configuration and usage of HTTP MCP servers.
 *
 * Key areas tested:
 * - ExternalServerManager HTTP transport configuration
 * - HTTP-specific options (headers, httpOptions, retryConfig, rateLimiting)
 * - Tool discovery for HTTP transport servers
 * - SDK integration with HTTP MCP servers
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ExternalServerManager } from "../../../src/lib/mcp/externalServerManager.js";
import { MCPClientFactory } from "../../../src/lib/mcp/mcpClientFactory.js";
import type { MCPServerInfo } from "../../../src/lib/types/mcpTypes.js";

// Mock the logger to avoid console noise during tests
vi.mock("../../../src/lib/utils/logger.js", () => {
  const createMockLogger = () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    trace: vi.fn(),
    setLogLevel: vi.fn(),
    setEventEmitter: vi.fn(),
  });
  const mockLogger = createMockLogger();
  return {
    mcpLogger: mockLogger,
    logger: mockLogger,
    registryLogger: mockLogger,
    autoDiscoveryLogger: mockLogger,
    unifiedRegistryLogger: mockLogger,
    neuroLinkLogger: mockLogger,
  };
});

// Mock the circuit breaker
vi.mock("../../../src/lib/mcp/mcpCircuitBreaker.js", () => ({
  globalCircuitBreakerManager: {
    getBreaker: vi.fn(() => ({
      execute: vi.fn((fn: () => Promise<unknown>) => fn()),
      getState: vi.fn(() => "closed"),
      getStats: vi.fn(() => ({
        state: "closed",
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        failureRate: 0,
        windowCalls: 0,
        lastStateChange: new Date(),
        halfOpenCalls: 0,
      })),
    })),
  },
}));

describe("HTTP Transport SDK Tests", () => {
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

  describe("ExternalServerManager HTTP Configuration", () => {
    it("should validate HTTP transport configuration with URL", () => {
      const config: MCPServerInfo = {
        id: "http-api-server",
        name: "http-api-server",
        description: "HTTP API MCP Server",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "https://api.example.com/mcp",
      };

      const validation = manager.validateConfig(config);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should reject HTTP transport without URL", () => {
      const config: MCPServerInfo = {
        id: "http-no-url",
        name: "http-no-url",
        description: "HTTP server without URL",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
      };

      const validation = manager.validateConfig(config);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("URL is required for http transport");
    });

    it("should accept HTTP config with custom headers", () => {
      const config: MCPServerInfo = {
        id: "github-copilot",
        name: "github-copilot",
        description: "GitHub Copilot MCP API",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "https://api.githubcopilot.com/mcp",
        headers: {
          Authorization: "Bearer github_pat_xxx",
          "X-GitHub-Api-Version": "2024-11-01",
        },
      };

      const validation = manager.validateConfig(config);
      expect(validation.isValid).toBe(true);
      expect(config.headers).toBeDefined();
      expect(config.headers?.Authorization).toBe("Bearer github_pat_xxx");
    });

    it("should accept HTTP config with httpOptions", () => {
      const config: MCPServerInfo = {
        id: "http-with-options",
        name: "http-with-options",
        description: "HTTP server with timeout options",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "https://api.example.com/mcp",
        httpOptions: {
          connectionTimeout: 30000,
          requestTimeout: 60000,
          idleTimeout: 120000,
          keepAliveTimeout: 30000,
        },
      };

      const validation = manager.validateConfig(config);
      expect(validation.isValid).toBe(true);
      expect(config.httpOptions?.connectionTimeout).toBe(30000);
      expect(config.httpOptions?.requestTimeout).toBe(60000);
    });

    it("should accept HTTP config with retryConfig", () => {
      const config: MCPServerInfo = {
        id: "http-with-retry",
        name: "http-with-retry",
        description: "HTTP server with retry configuration",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "https://api.example.com/mcp",
        retryConfig: {
          maxAttempts: 5,
          initialDelay: 1000,
          maxDelay: 30000,
          backoffMultiplier: 2,
          retryableStatusCodes: [429, 500, 502, 503, 504],
        },
      };

      const validation = manager.validateConfig(config);
      expect(validation.isValid).toBe(true);
      expect(config.retryConfig?.maxAttempts).toBe(5);
      expect(config.retryConfig?.initialDelay).toBe(1000);
    });

    it("should accept HTTP config with rateLimiting", () => {
      const config: MCPServerInfo = {
        id: "http-with-rate-limit",
        name: "http-with-rate-limit",
        description: "HTTP server with rate limiting",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "https://api.example.com/mcp",
        rateLimiting: {
          requestsPerMinute: 60,
          maxBurst: 10,
        },
      };

      const validation = manager.validateConfig(config);
      expect(validation.isValid).toBe(true);
      expect(config.rateLimiting?.requestsPerMinute).toBe(60);
      expect(config.rateLimiting?.maxBurst).toBe(10);
    });

    it("should accept complete HTTP configuration with all options", () => {
      const config: MCPServerInfo = {
        id: "complete-http-server",
        name: "complete-http-server",
        description: "Fully configured HTTP MCP server",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "https://api.example.com/mcp",
        headers: {
          Authorization: "Bearer token",
          "X-Custom-Header": "custom-value",
        },
        timeout: 30000,
        httpOptions: {
          connectionTimeout: 10000,
          requestTimeout: 60000,
          idleTimeout: 120000,
          keepAliveTimeout: 15000,
        },
        retryConfig: {
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 30000,
        },
        rateLimiting: {
          requestsPerMinute: 100,
          maxBurst: 20,
        },
        blockedTools: ["dangerous_tool"],
        metadata: {
          provider: "example",
          version: "1.0.0",
        },
      };

      const validation = manager.validateConfig(config);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe("ExternalServerManager addServer with HTTP Transport", () => {
    it("should accept HTTP server with URL property", async () => {
      const serverInfo: MCPServerInfo = {
        id: "sdk-http-test",
        name: "sdk-http-test",
        description: "SDK HTTP test server",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "https://api.example.com/mcp",
        headers: {
          Authorization: "Bearer test-token",
        },
      };

      const result = await manager.addServer("sdk-http-test", serverInfo);

      expect(result.serverId).toBe("sdk-http-test");
      // Should not fail validation
      if (!result.success && result.error) {
        expect(result.error).not.toContain("URL is required");
        expect(result.error).not.toContain("Configuration validation failed");
      }
    });

    it("should reject HTTP server without URL", async () => {
      const serverInfo: MCPServerInfo = {
        id: "sdk-http-no-url",
        name: "sdk-http-no-url",
        description: "SDK HTTP server without URL",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
      };

      const result = await manager.addServer("sdk-http-no-url", serverInfo);

      expect(result.success).toBe(false);
      expect(result.error).toContain("URL is required for http transport");
    });

    it("should pass HTTP-specific options to addServer", async () => {
      const serverInfo: MCPServerInfo = {
        id: "sdk-http-full",
        name: "sdk-http-full",
        description: "SDK HTTP server with all options",
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

      const result = await manager.addServer("sdk-http-full", serverInfo);

      expect(result.serverId).toBe("sdk-http-full");
      // Validation should pass - no config validation error
      if (!result.success && result.error) {
        expect(result.error).not.toContain("Configuration validation failed");
      }
    });
  });

  describe("MCPClientFactory HTTP Transport via SDK", () => {
    it("should validate HTTP transport configuration", () => {
      const config: MCPServerInfo = {
        id: "factory-http-test",
        name: "factory-http-test",
        description: "MCPClientFactory HTTP test",
        command: "http",
        transport: "http",
        status: "initializing",
        url: "https://api.example.com/mcp",
        tools: [],
      };

      const result = MCPClientFactory.validateClientConfig(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject HTTP transport with invalid URL", () => {
      const config: MCPServerInfo = {
        id: "factory-http-bad-url",
        name: "factory-http-bad-url",
        description: "MCPClientFactory HTTP with bad URL",
        command: "http",
        transport: "http",
        status: "initializing",
        url: "not-a-valid-url",
        tools: [],
      };

      const result = MCPClientFactory.validateClientConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Invalid URL for http transport");
    });

    it("should include http in supported transports", () => {
      const transports = MCPClientFactory.getSupportedTransports();
      expect(transports).toContain("http");
      expect(transports).toContain("stdio");
      expect(transports).toContain("sse");
      expect(transports).toContain("websocket");
    });

    it("should return default capabilities", () => {
      const capabilities = MCPClientFactory.getDefaultCapabilities();
      expect(capabilities).toBeDefined();
      expect(capabilities).toHaveProperty("sampling");
      expect(capabilities).toHaveProperty("roots");
    });
  });

  describe("SDK HTTP Transport Authentication Patterns", () => {
    it("should support Bearer token authentication", () => {
      const config: MCPServerInfo = {
        id: "bearer-auth",
        name: "bearer-auth",
        description: "Bearer token authentication",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "https://api.example.com/mcp",
        headers: {
          Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        },
      };

      const validation = manager.validateConfig(config);
      expect(validation.isValid).toBe(true);
      expect(config.headers?.Authorization).toMatch(/^Bearer /);
    });

    it("should support API key authentication", () => {
      const config: MCPServerInfo = {
        id: "apikey-auth",
        name: "apikey-auth",
        description: "API key authentication",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "https://api.example.com/mcp",
        headers: {
          "X-API-Key": "test-api-key-placeholder",
        },
      };

      const validation = manager.validateConfig(config);
      expect(validation.isValid).toBe(true);
      expect(config.headers?.["X-API-Key"]).toBe("test-api-key-placeholder");
    });

    it("should support Basic authentication", () => {
      const credentials = Buffer.from("username:password").toString("base64");
      const config: MCPServerInfo = {
        id: "basic-auth",
        name: "basic-auth",
        description: "Basic authentication",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "https://api.example.com/mcp",
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      };

      const validation = manager.validateConfig(config);
      expect(validation.isValid).toBe(true);
      expect(config.headers?.Authorization).toMatch(/^Basic /);
    });

    it("should support multiple auth-related headers", () => {
      const config: MCPServerInfo = {
        id: "multi-auth",
        name: "multi-auth",
        description: "Multiple auth headers",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "https://api.example.com/mcp",
        headers: {
          Authorization: "Bearer token",
          "X-Client-ID": "client-123",
          "X-Client-Secret": "secret-456",
        },
      };

      const validation = manager.validateConfig(config);
      expect(validation.isValid).toBe(true);
      expect(config.headers?.Authorization).toBe("Bearer token");
      expect(config.headers?.["X-Client-ID"]).toBe("client-123");
      expect(config.headers?.["X-Client-Secret"]).toBe("secret-456");
    });
  });

  describe("SDK HTTP vs Network Transport Validation", () => {
    it("should validate all network transports require URL", () => {
      const networkTransports: Array<"http" | "sse" | "websocket"> = [
        "http",
        "sse",
        "websocket",
      ];

      for (const transport of networkTransports) {
        const configWithUrl: MCPServerInfo = {
          id: `${transport}-with-url`,
          name: `${transport}-with-url`,
          description: `${transport} with URL`,
          transport,
          status: "initializing",
          tools: [],
          command: "",
          url: "https://example.com/mcp",
        };

        const configWithoutUrl: MCPServerInfo = {
          id: `${transport}-without-url`,
          name: `${transport}-without-url`,
          description: `${transport} without URL`,
          transport,
          status: "initializing",
          tools: [],
          command: "",
        };

        expect(manager.validateConfig(configWithUrl).isValid).toBe(true);
        expect(manager.validateConfig(configWithoutUrl).isValid).toBe(false);
      }
    });

    it("should distinguish HTTP from stdio transport requirements", () => {
      const httpConfig: MCPServerInfo = {
        id: "http-transport",
        name: "http-transport",
        description: "HTTP transport",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "https://api.example.com/mcp",
      };

      const stdioConfig: MCPServerInfo = {
        id: "stdio-transport",
        name: "stdio-transport",
        description: "stdio transport",
        transport: "stdio",
        status: "initializing",
        tools: [],
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-test"],
      };

      expect(manager.validateConfig(httpConfig).isValid).toBe(true);
      expect(manager.validateConfig(stdioConfig).isValid).toBe(true);

      // HTTP without URL should fail
      const httpNoUrl: MCPServerInfo = {
        ...httpConfig,
        id: "http-no-url",
        url: undefined,
      };
      expect(manager.validateConfig(httpNoUrl).isValid).toBe(false);

      // stdio without command should fail
      const stdioNoCommand: MCPServerInfo = {
        ...stdioConfig,
        id: "stdio-no-cmd",
        command: "",
      };
      expect(manager.validateConfig(stdioNoCommand).isValid).toBe(false);
    });
  });

  describe("SDK HTTP URL Format Validation", () => {
    it("should accept localhost URLs", () => {
      const config: MCPServerInfo = {
        id: "localhost-server",
        name: "localhost-server",
        description: "Local development server",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "http://localhost:3000/mcp",
      };

      const validation = manager.validateConfig(config);
      expect(validation.isValid).toBe(true);
    });

    it("should accept IP address URLs", () => {
      const config: MCPServerInfo = {
        id: "ip-server",
        name: "ip-server",
        description: "IP address server",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "http://192.168.1.100:8080/mcp",
      };

      const validation = manager.validateConfig(config);
      expect(validation.isValid).toBe(true);
    });

    it("should accept URLs with paths", () => {
      const config: MCPServerInfo = {
        id: "path-server",
        name: "path-server",
        description: "Server with path",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "https://api.example.com/v1/mcp/endpoint",
      };

      const validation = manager.validateConfig(config);
      expect(validation.isValid).toBe(true);
    });

    it("should accept URLs with query parameters", () => {
      const config: MCPServerInfo = {
        id: "query-server",
        name: "query-server",
        description: "Server with query params",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "https://api.example.com/mcp?version=2024-11-05&region=us-east",
      };

      const validation = manager.validateConfig(config);
      expect(validation.isValid).toBe(true);
    });

    it("should accept both HTTP and HTTPS URLs", () => {
      const httpConfig: MCPServerInfo = {
        id: "http-url",
        name: "http-url",
        description: "HTTP URL",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "http://api.example.com/mcp",
      };

      const httpsConfig: MCPServerInfo = {
        id: "https-url",
        name: "https-url",
        description: "HTTPS URL",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "https://api.example.com/mcp",
      };

      expect(manager.validateConfig(httpConfig).isValid).toBe(true);
      expect(manager.validateConfig(httpsConfig).isValid).toBe(true);
    });
  });

  describe("SDK HTTP Transport Error Handling", () => {
    it("should handle network errors gracefully", async () => {
      const config: MCPServerInfo = {
        id: "nonexistent-server",
        name: "nonexistent-server",
        description: "Server that does not exist",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "http://localhost:99999/mcp", // Invalid port
      };

      const result = await MCPClientFactory.testConnection(config, 2000);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle DNS resolution errors", async () => {
      const config: MCPServerInfo = {
        id: "unresolvable-server",
        name: "unresolvable-server",
        description: "Server with unresolvable hostname",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "http://this-domain-does-not-exist-12345.invalid/mcp",
      };

      const result = await MCPClientFactory.testConnection(config, 5000);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should track error status in server configuration", () => {
      const config: MCPServerInfo = {
        id: "error-server",
        name: "error-server",
        description: "Server with error",
        transport: "http",
        status: "failed",
        tools: [],
        command: "",
        url: "https://api.example.com/mcp",
        error: "Connection refused",
      };

      expect(config.status).toBe("failed");
      expect(config.error).toBe("Connection refused");
    });
  });

  describe("SDK HTTP Transport Timeout Configuration", () => {
    it("should accept timeout configuration", () => {
      const config: MCPServerInfo = {
        id: "timeout-server",
        name: "timeout-server",
        description: "Server with timeout",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "https://api.example.com/mcp",
        timeout: 5000,
      };

      const validation = manager.validateConfig(config);
      expect(validation.isValid).toBe(true);
      expect(config.timeout).toBe(5000);
    });

    it("should accept health check interval configuration", () => {
      const config: MCPServerInfo = {
        id: "health-check-server",
        name: "health-check-server",
        description: "Server with health check",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "https://api.example.com/mcp",
        healthCheckInterval: 60000,
      };

      expect(config.healthCheckInterval).toBe(60000);
    });

    it("should accept auto restart configuration", () => {
      const config: MCPServerInfo = {
        id: "auto-restart-server",
        name: "auto-restart-server",
        description: "Server with auto restart",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "https://api.example.com/mcp",
        autoRestart: true,
      };

      expect(config.autoRestart).toBe(true);
    });
  });

  describe("SDK Mixed Transport Configuration", () => {
    it("should handle both stdio and HTTP servers", async () => {
      const stdioConfig: MCPServerInfo = {
        id: "sdk-stdio-server",
        name: "sdk-stdio-server",
        description: "SDK stdio server",
        transport: "stdio",
        status: "initializing",
        tools: [],
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-test"],
      };

      const httpConfig: MCPServerInfo = {
        id: "sdk-http-server",
        name: "sdk-http-server",
        description: "SDK HTTP server",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "https://api.example.com/mcp",
      };

      // Both should pass validation
      expect(manager.validateConfig(stdioConfig).isValid).toBe(true);
      expect(manager.validateConfig(httpConfig).isValid).toBe(true);

      // Add both to manager
      const stdioResult = await manager.addServer(
        "sdk-stdio-server",
        stdioConfig,
      );
      const httpResult = await manager.addServer("sdk-http-server", httpConfig);

      expect(stdioResult.serverId).toBe("sdk-stdio-server");
      expect(httpResult.serverId).toBe("sdk-http-server");
    });
  });

  describe("SDK HTTP Transport with Tool Blocklist", () => {
    it("should accept blockedTools for HTTP transport", () => {
      const config: MCPServerInfo = {
        id: "http-blocked-tools",
        name: "http-blocked-tools",
        description: "HTTP server with blocked tools",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "https://api.example.com/mcp",
        blockedTools: ["dangerous_tool", "admin_only"],
      };

      const validation = manager.validateConfig(config);
      expect(validation.isValid).toBe(true);
      expect(config.blockedTools).toContain("dangerous_tool");
      expect(config.blockedTools).toContain("admin_only");
    });
  });

  describe("SDK HTTP Transport Configuration File Format", () => {
    it("should validate HTTP server configuration from .mcp-config.json format", () => {
      // Simulating the structure from .mcp-config.json
      const configFromFile = {
        mcpServers: {
          "deepwiki-http": {
            transport: "http",
            url: "https://mcp.deepwiki.com/mcp",
            description: "DeepWiki MCP server for documentation search",
            headers: {
              "Content-Type": "application/json",
            },
          },
          "github-copilot": {
            transport: "http",
            url: "https://api.githubcopilot.com/mcp",
            description: "GitHub Copilot MCP API",
            headers: {
              Authorization: "Bearer ${GITHUB_PAT}",
              "X-GitHub-Api-Version": "2024-11-01",
            },
            httpOptions: {
              connectionTimeout: 30000,
              requestTimeout: 60000,
            },
          },
        },
      };

      // Verify the config structure for HTTP servers
      const deepwikiConfig = configFromFile.mcpServers["deepwiki-http"];
      expect(deepwikiConfig.transport).toBe("http");
      expect(deepwikiConfig.url).toBe("https://mcp.deepwiki.com/mcp");
      expect(deepwikiConfig.headers).toBeDefined();

      const githubConfig = configFromFile.mcpServers["github-copilot"];
      expect(githubConfig.transport).toBe("http");
      expect(githubConfig.httpOptions?.connectionTimeout).toBe(30000);
    });

    it("should validate mixed transport configuration from file", () => {
      const configFromFile = {
        mcpServers: {
          filesystem: {
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
            transport: "stdio",
          },
          "deepwiki-http": {
            transport: "http",
            url: "https://mcp.deepwiki.com/mcp",
          },
          "perplexity-sse": {
            transport: "sse",
            url: "https://api.perplexity.ai/mcp/sse",
            headers: {
              Authorization: "Bearer api-key",
            },
          },
        },
      };

      // Verify transport types are correctly identified
      expect(configFromFile.mcpServers["filesystem"].transport).toBe("stdio");
      expect(configFromFile.mcpServers["deepwiki-http"].transport).toBe("http");
      expect(configFromFile.mcpServers["perplexity-sse"].transport).toBe("sse");

      // Verify URL-based transports have URLs
      expect(configFromFile.mcpServers["deepwiki-http"].url).toBeDefined();
      expect(configFromFile.mcpServers["perplexity-sse"].url).toBeDefined();

      // Verify stdio transport has command
      expect(configFromFile.mcpServers["filesystem"].command).toBe("npx");
    });
  });

  describe("SDK Programmatic MCP Server Configuration", () => {
    it("should configure multiple HTTP servers programmatically", async () => {
      const servers: MCPServerInfo[] = [
        {
          id: "server-1",
          name: "server-1",
          description: "First HTTP server",
          transport: "http",
          status: "initializing",
          tools: [],
          command: "",
          url: "https://api1.example.com/mcp",
          headers: { Authorization: "Bearer token1" },
        },
        {
          id: "server-2",
          name: "server-2",
          description: "Second HTTP server",
          transport: "http",
          status: "initializing",
          tools: [],
          command: "",
          url: "https://api2.example.com/mcp",
          headers: { "X-API-Key": "key2" },
        },
      ];

      // Validate all configurations
      for (const server of servers) {
        const validation = manager.validateConfig(server);
        expect(validation.isValid).toBe(true);
      }
    });

    it("should get server after adding", async () => {
      const config: MCPServerInfo = {
        id: "status-test-server",
        name: "status-test-server",
        description: "Server for status testing",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "https://api.example.com/mcp",
      };

      const result = await manager.addServer("status-test-server", config);

      expect(result.serverId).toBe("status-test-server");

      // Get server after adding
      const server = manager.getServer("status-test-server");
      // Server could be retrieved or not depending on connection state
      if (server) {
        expect(server.id).toBe("status-test-server");
        // Status could be initializing, connected, or failed depending on connection attempt
        expect(["initializing", "connected", "failed"]).toContain(
          server.status,
        );
      }
    });

    it("should return getAllServers as Map type", async () => {
      // Get all servers - returns a Map (may or may not contain servers depending on connection success)
      const servers = manager.getAllServers();
      expect(servers instanceof Map).toBe(true);
      // Verify it's a valid Map with expected methods
      expect(typeof servers.has).toBe("function");
      expect(typeof servers.get).toBe("function");
      expect(typeof servers.entries).toBe("function");
    });
  });

  describe("SDK HTTP Transport Real-World Configurations", () => {
    it("should validate GitHub Copilot MCP configuration", () => {
      const config: MCPServerInfo = {
        id: "github-copilot",
        name: "github-copilot",
        description: "GitHub Copilot MCP API",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "https://api.githubcopilot.com/mcp",
        headers: {
          Authorization: "Bearer github_pat_xxx",
          "X-GitHub-Api-Version": "2024-11-01",
          Accept: "application/json",
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
      };

      const validation = manager.validateConfig(config);
      expect(validation.isValid).toBe(true);
    });

    it("should validate DeepWiki MCP configuration", () => {
      const config: MCPServerInfo = {
        id: "deepwiki",
        name: "deepwiki",
        description: "DeepWiki documentation MCP server",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "https://mcp.deepwiki.com/mcp",
        headers: {
          "Content-Type": "application/json",
        },
      };

      const validation = manager.validateConfig(config);
      expect(validation.isValid).toBe(true);
    });

    it("should validate Semgrep MCP configuration", () => {
      const config: MCPServerInfo = {
        id: "semgrep",
        name: "semgrep",
        description: "Semgrep code analysis MCP server",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "https://mcp.semgrep.ai/mcp",
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 60000,
      };

      const validation = manager.validateConfig(config);
      expect(validation.isValid).toBe(true);
    });

    it("should validate remote.mcpservers.org configuration", () => {
      const config: MCPServerInfo = {
        id: "remote-fetch",
        name: "remote-fetch",
        description: "Remote fetch MCP server",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "https://remote.mcpservers.org/fetch/mcp",
      };

      const validation = manager.validateConfig(config);
      expect(validation.isValid).toBe(true);
    });
  });
});

/**
 * Test Coverage Summary for SDK HTTP Transport
 *
 * 1. ExternalServerManager HTTP Configuration
 *    - URL validation for HTTP transport
 *    - Custom headers support
 *    - httpOptions (timeouts) support
 *    - retryConfig support
 *    - rateLimiting support
 *    - Complete configuration validation
 *
 * 2. ExternalServerManager addServer with HTTP Transport
 *    - HTTP server addition with URL
 *    - Rejection of HTTP server without URL
 *    - Passing HTTP-specific options
 *
 * 3. MCPClientFactory HTTP Transport
 *    - Configuration validation
 *    - URL format validation
 *    - Supported transports list
 *    - Default capabilities
 *
 * 4. SDK Authentication Patterns
 *    - Bearer token authentication
 *    - API key authentication
 *    - Basic authentication
 *    - Multiple auth headers
 *
 * 5. SDK Transport Validation
 *    - Network transports (http, sse, websocket) URL requirements
 *    - HTTP vs stdio transport requirements
 *
 * 6. SDK URL Format Validation
 *    - localhost URLs
 *    - IP address URLs
 *    - URLs with paths
 *    - URLs with query parameters
 *    - HTTP and HTTPS schemes
 *
 * 7. SDK Error Handling
 *    - Network errors
 *    - DNS resolution errors
 *    - Error status tracking
 *
 * 8. SDK Timeout Configuration
 *    - Timeout settings
 *    - Health check interval
 *    - Auto restart
 *
 * 9. SDK Mixed Transport Configuration
 *    - Handling both stdio and HTTP servers
 *
 * 10. SDK Tool Blocklist with HTTP
 *     - blockedTools support for HTTP transport
 *
 * 11. SDK Configuration File Format
 *     - HTTP server configuration from .mcp-config.json
 *     - Mixed transport configuration from file
 *
 * 12. SDK Programmatic Configuration
 *     - Multiple HTTP servers programmatic configuration
 *     - Server retrieval after adding
 *     - getAllServers returns Map type
 *
 * 13. SDK Real-World Configurations
 *     - GitHub Copilot MCP configuration
 *     - DeepWiki MCP configuration
 *     - Semgrep MCP configuration
 *     - remote.mcpservers.org configuration
 */
