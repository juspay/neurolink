/**
 * Tests for Transport Manager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  TransportManager,
  type TransportConfig,
} from "../lib/mcp/transport-manager.js";
import { ErrorManager } from "../lib/mcp/error-manager.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from "child_process";
import { EventEmitter } from "events";

// Mock modules
vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: vi.fn(),
  StdioClientTransport: vi.fn(),
}));

vi.mock("@modelcontextprotocol/sdk/client/sse.js", () => ({
  SSEClientTransport: vi.fn(),
}));

vi.mock("@modelcontextprotocol/sdk/client/streamableHttp.js", () => ({
  HTTPClientTransport: vi.fn(),
  default: vi.fn(),
}));

vi.mock("child_process", () => ({
  spawn: vi.fn(),
}));

vi.mock("reconnecting-eventsource", () => ({
  default: vi.fn(),
}));

describe("TransportManager", () => {
  let transportManager: TransportManager;
  let mockErrorManager: ErrorManager;
  let mockClient: any;
  let mockChildProcess: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock error manager
    mockErrorManager = {
      recordError: vi.fn(),
      getErrors: vi.fn().mockReturnValue([]),
      clearErrors: vi.fn(),
      getErrorStatistics: vi.fn().mockReturnValue({
        totalErrors: 0,
        errorsByCategory: {},
        errorsBySeverity: {},
        errorRate: 0,
      }),
    } as any;

    // Create mock client
    mockClient = {
      connect: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      request: vi.fn().mockResolvedValue({ tools: [] }),
    };

    // Mock Client constructor
    vi.mocked(Client).mockImplementation(() => mockClient);

    // Create mock child process
    mockChildProcess = new EventEmitter();
    mockChildProcess.kill = vi.fn();
    vi.mocked(spawn).mockReturnValue(mockChildProcess as any);

    // Create transport manager
    transportManager = new TransportManager(mockErrorManager, {
      autoReconnect: false, // Disable for most tests
      healthCheckInterval: 0, // Disable health checks for tests
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("stdio transport", () => {
    it("should connect using stdio transport", async () => {
      const config: TransportConfig = {
        type: "stdio",
        command: "node",
        args: ["server.js"],
      };

      const client = await transportManager.connect(config);

      expect(spawn).toHaveBeenCalledWith("node", ["server.js"], {
        cwd: undefined,
        env: process.env,
        stdio: "pipe",
      });
      expect(StdioClientTransport).toHaveBeenCalled();
      expect(mockClient.connect).toHaveBeenCalled();
      expect(client).toBe(mockClient);
      expect(transportManager.isConnected()).toBe(true);
    });

    it("should handle process errors", async () => {
      const config: TransportConfig = {
        type: "stdio",
        command: "node",
        args: ["server.js"],
      };

      await transportManager.connect(config);

      // Simulate process error
      mockChildProcess.emit("error", new Error("Process failed"));

      expect(mockErrorManager.recordError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          severity: "HIGH",
          toolName: "transport-manager",
        }),
      );
    });

    it("should handle process exit with non-zero code", async () => {
      const config: TransportConfig = {
        type: "stdio",
        command: "node",
        args: ["server.js"],
      };

      await transportManager.connect(config);

      // Simulate process exit
      mockChildProcess.emit("exit", 1);

      expect(mockErrorManager.recordError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Process exited with code 1" }),
        expect.objectContaining({
          severity: "HIGH",
          toolName: "transport-manager",
        }),
      );
    });
  });

  describe("SSE transport", () => {
    it("should connect using SSE transport", async () => {
      const config: TransportConfig = {
        type: "sse",
        url: "http://localhost:8080/sse",
        headers: { Authorization: "Bearer token" },
        timeout: 30000,
        maxRetryTime: 60000,
        withCredentials: false,
      };

      const client = await transportManager.connect(config);

      expect(mockClient.connect).toHaveBeenCalled();
      expect(client).toBe(mockClient);
      expect(transportManager.isConnected()).toBe(true);
    });

    it("should use custom SSE configuration", async () => {
      const config: TransportConfig = {
        type: "sse",
        url: "http://localhost:8080/sse",
        timeout: 30000,
        maxRetryTime: 10000,
        withCredentials: true,
      };

      await transportManager.connect(config);

      expect(mockClient.connect).toHaveBeenCalled();
      expect(transportManager.getStatus()).toMatchObject({
        connected: true,
        type: "sse",
      });
    });
  });

  describe("HTTP transport", () => {
    it("should connect using HTTP transport", async () => {
      const config: TransportConfig = {
        type: "http",
        url: "http://localhost:8080/api",
        headers: { "X-API-Key": "test-key" },
        timeout: 30000,
      };

      const client = await transportManager.connect(config);

      expect(mockClient.connect).toHaveBeenCalled();
      expect(client).toBe(mockClient);
      expect(transportManager.isConnected()).toBe(true);
    });

    it("should validate URL format", async () => {
      const config = {
        type: "http" as const,
        url: "not-a-valid-url",
        timeout: 30000,
      };

      await expect(transportManager.connect(config)).rejects.toThrow();
    });
  });

  describe("reconnection logic", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it("should attempt reconnection on connection error", async () => {
      // Enable auto-reconnect
      transportManager = new TransportManager(mockErrorManager, {
        autoReconnect: true,
        maxReconnectAttempts: 3,
        reconnectDelay: 1000,
        healthCheckInterval: 0,
      });

      const config: TransportConfig = {
        type: "stdio",
        command: "node",
        args: ["server.js"],
      };

      await transportManager.connect(config);

      // Reset mock to track reconnection attempts
      mockClient.connect.mockClear();

      // Simulate connection error
      mockChildProcess.emit("error", new Error("Connection lost"));

      // Fast-forward time to trigger reconnection
      await vi.advanceTimersByTimeAsync(2000);

      // Should attempt to reconnect
      expect(mockClient.connect).toHaveBeenCalled();
    });

    it("should use exponential backoff for reconnection", async () => {
      transportManager = new TransportManager(mockErrorManager, {
        autoReconnect: true,
        maxReconnectAttempts: 3,
        reconnectDelay: 1000,
        healthCheckInterval: 0,
      });

      const config: TransportConfig = {
        type: "stdio",
        command: "node",
        args: ["server.js"],
      };

      await transportManager.connect(config);

      // Mock connection to fail on reconnect
      mockClient.connect.mockRejectedValue(new Error("Still failing"));

      // Trigger multiple reconnection attempts
      for (let i = 0; i < 3; i++) {
        mockChildProcess.emit("error", new Error("Connection lost"));
        await vi.advanceTimersByTimeAsync(Math.pow(2, i) * 1000 + 2000);
      }

      const status = transportManager.getStatus();
      expect(status.reconnectAttempts).toBeGreaterThan(0);
    });

    it("should stop reconnecting after max attempts", async () => {
      transportManager = new TransportManager(mockErrorManager, {
        autoReconnect: true,
        maxReconnectAttempts: 2,
        reconnectDelay: 100,
        healthCheckInterval: 0,
      });

      const config: TransportConfig = {
        type: "stdio",
        command: "node",
        args: ["server.js"],
      };

      await transportManager.connect(config);

      // Mock connection to always fail
      mockClient.connect.mockRejectedValue(new Error("Connection failed"));

      // Trigger error
      mockChildProcess.emit("error", new Error("Initial error"));

      // Advance time to allow all reconnection attempts
      await vi.advanceTimersByTimeAsync(10000);

      const status = transportManager.getStatus();
      expect(status.reconnectAttempts).toBeLessThanOrEqual(2);
    });
  });

  describe("health monitoring", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it("should set up health monitoring when enabled", async () => {
      transportManager = new TransportManager(mockErrorManager, {
        autoReconnect: false,
        healthCheckInterval: 5000,
      });

      const config: TransportConfig = {
        type: "stdio",
        command: "node",
        args: ["server.js"],
      };

      await transportManager.connect(config);

      // Health monitor should be set up
      expect(mockClient.request).not.toHaveBeenCalled();

      // Simulate health check
      await vi.advanceTimersByTimeAsync(5000);

      // Should have performed health check
      expect(mockClient.request).toHaveBeenCalledWith(
        { method: "tools/list" },
        expect.anything(), // z.any() is passed, not a function
        { timeout: 5000 },
      );
    });

    it("should trigger reconnection on health check failure", async () => {
      transportManager = new TransportManager(mockErrorManager, {
        autoReconnect: true,
        healthCheckInterval: 5000,
        reconnectDelay: 100,
      });

      const config: TransportConfig = {
        type: "stdio",
        command: "node",
        args: ["server.js"],
      };

      await transportManager.connect(config);

      // Reset mocks to track new calls
      mockClient.connect.mockClear();
      vi.clearAllMocks();

      // Mock health check to fail
      mockClient.request.mockRejectedValue(new Error("Health check failed"));

      // Trigger health check
      await vi.advanceTimersByTimeAsync(5000);

      // Should have recorded error
      expect(mockErrorManager.recordError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          severity: "HIGH",
          toolName: "transport-manager",
        }),
      );

      // Allow time for reconnection attempt (with exponential backoff)
      await vi.advanceTimersByTimeAsync(2000);

      // Should have attempted reconnection
      expect(mockClient.connect).toHaveBeenCalled();
    });
  });

  describe("disconnect", () => {
    it("should properly disconnect and cleanup", async () => {
      const config: TransportConfig = {
        type: "stdio",
        command: "node",
        args: ["server.js"],
      };

      await transportManager.connect(config);
      await transportManager.disconnect();

      expect(mockClient.close).toHaveBeenCalled();
      expect(transportManager.isConnected()).toBe(false);
      expect(transportManager.getClient()).toBeUndefined();
    });

    it("should cancel pending reconnections on disconnect", async () => {
      vi.useFakeTimers();

      transportManager = new TransportManager(mockErrorManager, {
        autoReconnect: true,
        reconnectDelay: 5000,
      });

      const config: TransportConfig = {
        type: "stdio",
        command: "node",
        args: ["server.js"],
      };

      await transportManager.connect(config);

      // Trigger reconnection
      mockChildProcess.emit("error", new Error("Connection lost"));

      // Disconnect before reconnection happens
      await transportManager.disconnect();

      // Advance time
      await vi.advanceTimersByTimeAsync(6000);

      // Should not have attempted reconnection
      expect(mockClient.connect).toHaveBeenCalledTimes(1); // Only initial connection
    });
  });

  describe("status tracking", () => {
    it("should track connection status", async () => {
      const config: TransportConfig = {
        type: "http",
        url: "http://localhost:8080",
        timeout: 30000,
      };

      const initialStatus = transportManager.getStatus();
      expect(initialStatus.connected).toBe(false);

      await transportManager.connect(config);

      const connectedStatus = transportManager.getStatus();
      expect(connectedStatus).toMatchObject({
        connected: true,
        type: "http",
        reconnectAttempts: 0,
      });
      expect(connectedStatus.lastConnected).toBeInstanceOf(Date);
    });

    it("should track errors in status", async () => {
      const config: TransportConfig = {
        type: "stdio",
        command: "node",
        args: ["server.js"],
      };

      await transportManager.connect(config);

      const error = new Error("Test error");
      mockChildProcess.emit("error", error);

      const status = transportManager.getStatus();
      expect(status.lastError).toEqual(error);
    });
  });
});
