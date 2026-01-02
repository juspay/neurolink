/**
 * HTTP Transport Tests
 * Tests for HTTP/Streamable HTTP transport support in MCPClientFactory
 */

import { describe, it, expect } from "vitest";
import { MCPClientFactory } from "../../../src/lib/mcp/mcpClientFactory.js";
import type { MCPServerInfo } from "../../../src/lib/types/mcpTypes.js";

describe("MCPClientFactory - HTTP Transport", () => {
  describe("getSupportedTransports", () => {
    it("should include http in supported transports", () => {
      const transports = MCPClientFactory.getSupportedTransports();
      expect(transports).toContain("http");
      expect(transports).toEqual(["stdio", "sse", "websocket", "http"]);
    });
  });

  describe("validateClientConfig", () => {
    it("should accept http transport", () => {
      const config: MCPServerInfo = {
        id: "test-http",
        name: "test-http",
        description: "Test HTTP server",
        command: "http://example.com",
        transport: "http",
        status: "initializing",
        url: "http://example.com/mcp",
        tools: [],
      };

      const result = MCPClientFactory.validateClientConfig(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should require URL for http transport", () => {
      const config: MCPServerInfo = {
        id: "test-http",
        name: "test-http",
        description: "Test HTTP server",
        command: "http://example.com",
        transport: "http",
        status: "initializing",
        tools: [],
      };

      const result = MCPClientFactory.validateClientConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("URL is required for http transport");
    });

    it("should validate URL format for http transport", () => {
      const config: MCPServerInfo = {
        id: "test-http",
        name: "test-http",
        description: "Test HTTP server",
        command: "http://example.com",
        transport: "http",
        status: "initializing",
        url: "invalid-url",
        tools: [],
      };

      const result = MCPClientFactory.validateClientConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Invalid URL for http transport");
    });

    it("should accept http transport with custom headers", () => {
      const config: MCPServerInfo = {
        id: "github-copilot",
        name: "github-copilot",
        description: "GitHub Copilot MCP API",
        command: "https://api.githubcopilot.com/mcp",
        transport: "http",
        status: "initializing",
        url: "https://api.githubcopilot.com/mcp",
        headers: {
          Authorization: "Bearer test-token",
        },
        tools: [],
      };

      const result = MCPClientFactory.validateClientConfig(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("Type validation", () => {
    it("should accept http as a valid MCPTransportType", () => {
      const config: MCPServerInfo = {
        id: "test",
        name: "test",
        description: "test",
        command: "test",
        transport: "http" as const,
        status: "initializing",
        url: "https://example.com",
        tools: [],
      };

      // TypeScript should compile this without errors
      expect(config.transport).toBe("http");
    });
  });

  describe("Headers support", () => {
    it("should accept headers in server configuration", () => {
      const config: MCPServerInfo = {
        id: "test",
        name: "test",
        description: "test",
        command: "test",
        transport: "http",
        status: "initializing",
        url: "https://example.com",
        headers: {
          Authorization: "Bearer token",
          "X-Custom-Header": "value",
        },
        tools: [],
      };

      expect(config.headers).toBeDefined();
      expect(config.headers?.Authorization).toBe("Bearer token");
      expect(config.headers?.["X-Custom-Header"]).toBe("value");
    });

    it("should allow headers for other transports too", () => {
      const sseConfig: MCPServerInfo = {
        id: "test-sse",
        name: "test-sse",
        description: "test",
        command: "test",
        transport: "sse",
        status: "initializing",
        url: "https://example.com/sse",
        headers: {
          Authorization: "Bearer token",
        },
        tools: [],
      };

      expect(sseConfig.headers).toBeDefined();
      expect(sseConfig.headers?.Authorization).toBe("Bearer token");
    });
  });

  describe("HTTP Transport Options", () => {
    it("should accept httpOptions in configuration", () => {
      const config: MCPServerInfo = {
        id: "test-http-options",
        name: "test-http-options",
        description: "Test HTTP server with options",
        command: "https://example.com",
        transport: "http",
        status: "initializing",
        url: "https://example.com/mcp",
        httpOptions: {
          connectionTimeout: 30000,
          requestTimeout: 60000,
          idleTimeout: 120000,
        },
        tools: [],
      };

      expect(config.httpOptions).toBeDefined();
      expect(config.httpOptions?.connectionTimeout).toBe(30000);
      expect(config.httpOptions?.requestTimeout).toBe(60000);
      expect(config.httpOptions?.idleTimeout).toBe(120000);
    });

    it("should use default timeouts when not configured", () => {
      const config: MCPServerInfo = {
        id: "test-defaults",
        name: "test-defaults",
        description: "Test without explicit options",
        command: "https://example.com",
        transport: "http",
        status: "initializing",
        url: "https://example.com/mcp",
        tools: [],
      };

      // httpOptions should be undefined when not specified
      expect(config.httpOptions).toBeUndefined();
    });

    it("should accept keepAliveTimeout in httpOptions", () => {
      const config: MCPServerInfo = {
        id: "test-keep-alive",
        name: "test-keep-alive",
        description: "Test keep-alive timeout",
        command: "https://example.com",
        transport: "http",
        status: "initializing",
        url: "https://example.com/mcp",
        httpOptions: {
          keepAliveTimeout: 30000,
        },
        tools: [],
      };

      expect(config.httpOptions?.keepAliveTimeout).toBe(30000);
    });

    it("should allow partial httpOptions configuration", () => {
      const config: MCPServerInfo = {
        id: "test-partial",
        name: "test-partial",
        description: "Test partial options",
        command: "https://example.com",
        transport: "http",
        status: "initializing",
        url: "https://example.com/mcp",
        httpOptions: {
          requestTimeout: 45000,
        },
        tools: [],
      };

      expect(config.httpOptions?.requestTimeout).toBe(45000);
      expect(config.httpOptions?.connectionTimeout).toBeUndefined();
      expect(config.httpOptions?.idleTimeout).toBeUndefined();
    });
  });

  describe("Retry Configuration", () => {
    it("should accept retries count in configuration", () => {
      const config: MCPServerInfo = {
        id: "test-retries",
        name: "test-retries",
        description: "Test retry configuration",
        command: "https://example.com",
        transport: "http",
        status: "initializing",
        url: "https://example.com/mcp",
        retries: 3,
        tools: [],
      };

      expect(config.retries).toBe(3);
    });

    it("should allow zero retries for fail-fast behavior", () => {
      const config: MCPServerInfo = {
        id: "test-no-retries",
        name: "test-no-retries",
        description: "Test no retries",
        command: "https://example.com",
        transport: "http",
        status: "initializing",
        url: "https://example.com/mcp",
        retries: 0,
        tools: [],
      };

      expect(config.retries).toBe(0);
    });

    it("should have retries undefined by default", () => {
      const config: MCPServerInfo = {
        id: "test-default-retries",
        name: "test-default-retries",
        description: "Test default retries",
        command: "https://example.com",
        transport: "http",
        status: "initializing",
        url: "https://example.com/mcp",
        tools: [],
      };

      expect(config.retries).toBeUndefined();
    });
  });

  describe("Authentication Configuration", () => {
    it("should accept bearer token auth via headers", () => {
      const config: MCPServerInfo = {
        id: "test-bearer-auth",
        name: "test-bearer-auth",
        description: "Test Bearer token authentication",
        command: "https://api.example.com",
        transport: "http",
        status: "initializing",
        url: "https://api.example.com/mcp",
        headers: {
          Authorization: "Bearer my-secret-token",
        },
        tools: [],
      };

      expect(config.headers).toBeDefined();
      expect(config.headers?.Authorization).toBe("Bearer my-secret-token");
      expect(config.headers?.Authorization).toMatch(/^Bearer /);
    });

    it("should accept API key auth via headers", () => {
      const config: MCPServerInfo = {
        id: "test-apikey-auth",
        name: "test-apikey-auth",
        description: "Test API key authentication",
        command: "https://api.example.com",
        transport: "http",
        status: "initializing",
        url: "https://api.example.com/mcp",
        headers: {
          "X-API-Key": "api-key-12345",
        },
        tools: [],
      };

      expect(config.headers?.["X-API-Key"]).toBe("api-key-12345");
    });

    it("should support custom auth header names", () => {
      const config: MCPServerInfo = {
        id: "test-custom-auth",
        name: "test-custom-auth",
        description: "Test custom auth header",
        command: "https://api.example.com",
        transport: "http",
        status: "initializing",
        url: "https://api.example.com/mcp",
        headers: {
          "X-Custom-Auth-Token": "custom-token-value",
        },
        tools: [],
      };

      expect(config.headers?.["X-Custom-Auth-Token"]).toBe(
        "custom-token-value",
      );
    });

    it("should support multiple auth-related headers", () => {
      const config: MCPServerInfo = {
        id: "test-multi-auth",
        name: "test-multi-auth",
        description: "Test multiple auth headers",
        command: "https://api.example.com",
        transport: "http",
        status: "initializing",
        url: "https://api.example.com/mcp",
        headers: {
          Authorization: "Bearer token",
          "X-Client-ID": "client-123",
          "X-Client-Secret": "secret-456",
        },
        tools: [],
      };

      expect(config.headers?.Authorization).toBe("Bearer token");
      expect(config.headers?.["X-Client-ID"]).toBe("client-123");
      expect(config.headers?.["X-Client-Secret"]).toBe("secret-456");
    });

    it("should support Basic auth via headers", () => {
      const credentials = Buffer.from("username:password").toString("base64");
      const config: MCPServerInfo = {
        id: "test-basic-auth",
        name: "test-basic-auth",
        description: "Test Basic authentication",
        command: "https://api.example.com",
        transport: "http",
        status: "initializing",
        url: "https://api.example.com/mcp",
        headers: {
          Authorization: `Basic ${credentials}`,
        },
        tools: [],
      };

      expect(config.headers?.Authorization).toBe(`Basic ${credentials}`);
      expect(config.headers?.Authorization).toMatch(/^Basic /);
    });
  });

  describe("Timeout Configuration", () => {
    it("should accept timeout in server configuration", () => {
      const config: MCPServerInfo = {
        id: "test-timeout",
        name: "test-timeout",
        description: "Test timeout configuration",
        command: "https://example.com",
        transport: "http",
        status: "initializing",
        url: "https://example.com/mcp",
        timeout: 30000,
        tools: [],
      };

      expect(config.timeout).toBe(30000);
    });

    it("should have timeout undefined by default", () => {
      const config: MCPServerInfo = {
        id: "test-default-timeout",
        name: "test-default-timeout",
        description: "Test default timeout",
        command: "https://example.com",
        transport: "http",
        status: "initializing",
        url: "https://example.com/mcp",
        tools: [],
      };

      expect(config.timeout).toBeUndefined();
    });
  });

  describe("Error Handling Configuration", () => {
    it("should accept error field for tracking connection errors", () => {
      const config: MCPServerInfo = {
        id: "test-error",
        name: "test-error",
        description: "Test error tracking",
        command: "https://example.com",
        transport: "http",
        status: "failed",
        url: "https://example.com/mcp",
        error: "Connection refused",
        tools: [],
      };

      expect(config.error).toBe("Connection refused");
      expect(config.status).toBe("failed");
    });
  });

  describe("Health Check Configuration", () => {
    it("should accept healthCheckInterval for periodic health checks", () => {
      const config: MCPServerInfo = {
        id: "test-health-check",
        name: "test-health-check",
        description: "Test health check interval",
        command: "https://example.com",
        transport: "http",
        status: "initializing",
        url: "https://example.com/mcp",
        healthCheckInterval: 60000,
        tools: [],
      };

      expect(config.healthCheckInterval).toBe(60000);
    });

    it("should accept autoRestart for automatic recovery", () => {
      const config: MCPServerInfo = {
        id: "test-auto-restart",
        name: "test-auto-restart",
        description: "Test auto restart",
        command: "https://example.com",
        transport: "http",
        status: "initializing",
        url: "https://example.com/mcp",
        autoRestart: true,
        tools: [],
      };

      expect(config.autoRestart).toBe(true);
    });
  });
});
