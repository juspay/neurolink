/**
 * Health Monitoring System Tests
 * Verifies health checks, auto-recovery, and reporting functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  HealthMonitor,
  ConnectionStatus,
  PingHealthCheck,
  ToolListValidationCheck,
  PerformanceCheck,
} from "../lib/mcp/health-monitor.js";
import { MCPToolRegistry } from "../lib/mcp/tool-registry.js";
import {
  ErrorManager,
  ErrorCategory,
  ErrorSeverity,
} from "../lib/mcp/error-manager.js";

describe.skip("Health Monitoring System", () => {
  let healthMonitor: HealthMonitor;
  let registry: MCPToolRegistry;
  let errorManager: ErrorManager;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    registry = new MCPToolRegistry();
    errorManager = new ErrorManager();

    healthMonitor = new HealthMonitor(registry, errorManager, {
      checkInterval: 5000, // 5 seconds for testing
      checkTimeout: 1000,
      maxRecoveryAttempts: 2,
      recoveryDelay: 1000,
      enableAutoRecovery: true,
    });
  });

  afterEach(async () => {
    // 🔧 FIX: Enhanced cleanup to prevent hanging tests
    try {
      healthMonitor.stopMonitoring();
      vi.clearAllTimers();
      vi.useRealTimers();
      vi.restoreAllMocks();
    } catch (error) {
      // Ignore cleanup errors to prevent test failures
    }
  });

  describe("Health Check Strategies", () => {
    it("should perform ping health check successfully", async () => {
      const pingCheck = new PingHealthCheck();

      // Mock successful tool listing
      vi.spyOn(registry, "listTools").mockResolvedValue([
        { name: "test-tool", description: "Test", inputSchema: {} },
      ]);

      const result = await pingCheck.check("test-server", registry);

      expect(result.success).toBe(true);
      expect(result.status).toBe(ConnectionStatus.CONNECTED);
      expect(result.latency).toBeGreaterThan(0);
    });

    it("should handle ping health check failure", async () => {
      const pingCheck = new PingHealthCheck();

      // Mock failed tool listing
      vi.spyOn(registry, "listTools").mockRejectedValue(
        new Error("Connection failed"),
      );

      const result = await pingCheck.check("test-server", registry);

      expect(result.success).toBe(false);
      expect(result.status).toBe(ConnectionStatus.ERROR);
      expect(result.error?.message).toBe("Connection failed");
    });

    it("should validate tool availability", async () => {
      const toolCheck = new ToolListValidationCheck();

      // Mock empty tool list
      vi.spyOn(registry, "listTools").mockResolvedValue([]);

      const result = await toolCheck.check("test-server", registry);

      expect(result.success).toBe(false);
      expect(result.message).toContain("No tools available");
    });

    it("should check performance thresholds", async () => {
      const perfCheck = new PerformanceCheck(500); // 500ms threshold

      // Mock slow response
      vi.spyOn(registry, "listTools").mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve([
                  { name: "tool", description: "Test", inputSchema: {} },
                ]),
              600,
            ),
          ),
      );

      const result = await perfCheck.check("test-server", registry);

      expect(result.success).toBe(true); // Still successful, just slow
      expect(result.message).toContain("Performance degraded");
      expect(result.latency).toBeGreaterThan(500);
    });
  });

  describe("Health Monitoring Lifecycle", () => {
    it("should start and stop monitoring", () => {
      // Mock server list
      vi.spyOn(registry, "listServers").mockReturnValue(["server1", "server2"]);

      healthMonitor.startMonitoring();

      const healthStatus = healthMonitor.getHealthStatus();
      expect(healthStatus.size).toBe(2);
      expect(healthStatus.get("server1")?.status).toBe(
        ConnectionStatus.DISCONNECTED,
      );

      healthMonitor.stopMonitoring();
    });

    it("should perform periodic health checks", async () => {
      // Mock server and successful check
      vi.spyOn(registry, "listServers").mockReturnValue(["test-server"]);
      vi.spyOn(registry, "listTools").mockResolvedValue([
        { name: "tool", description: "Test", inputSchema: {} },
      ]);

      healthMonitor.startMonitoring();

      // 🔧 FIX: Use controlled timer advancement instead of runAllTimersAsync
      vi.advanceTimersByTime(6000); // Past check interval

      // Wait for a short time to allow async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      const serverHealth = healthMonitor.getServerHealth("test-server");
      expect(serverHealth?.checkCount).toBeGreaterThan(0);
      expect(serverHealth?.status).toBe(ConnectionStatus.CONNECTED);
    });

    it("should handle check timeouts", async () => {
      vi.spyOn(registry, "listServers").mockReturnValue(["slow-server"]);

      // Mock slow response that exceeds timeout
      vi.spyOn(registry, "listTools").mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 2000)), // 2s delay, 1s timeout
      );

      const result = await healthMonitor.checkServerHealth("slow-server");

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Health check timeout");
    });
  });

  describe("Auto-Recovery", () => {
    it("should trigger recovery on health check failure", async () => {
      const recoveryCallback = vi.fn().mockResolvedValue(undefined);
      healthMonitor.registerRecoveryCallback(
        "failing-server",
        recoveryCallback,
      );

      // Mock failed check
      vi.spyOn(registry, "listTools").mockRejectedValue(
        new Error("Server down"),
      );

      await healthMonitor.checkServerHealth("failing-server");

      // Fast forward to trigger recovery
      vi.advanceTimersByTime(1500);
      // Wait for recovery to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(recoveryCallback).toHaveBeenCalledWith("failing-server");
    });

    it("should respect maximum recovery attempts", async () => {
      const recoveryCallback = vi.fn().mockResolvedValue(undefined);
      healthMonitor.registerRecoveryCallback(
        "persistent-fail",
        recoveryCallback,
      );

      // Mock persistent failure
      vi.spyOn(registry, "listTools").mockRejectedValue(
        new Error("Persistent failure"),
      );

      // Trigger multiple failures
      for (let i = 0; i < 5; i++) {
        await healthMonitor.checkServerHealth("persistent-fail");
        vi.advanceTimersByTime(1500);
        // Wait for async operations without running all timers
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Should only attempt recovery up to max attempts (2)
      expect(recoveryCallback).toHaveBeenCalledTimes(2);

      const serverHealth = healthMonitor.getServerHealth("persistent-fail");
      expect(serverHealth?.recoveryAttempts).toBe(2);
    });
  });

  describe("Health Reporting", () => {
    beforeEach(async () => {
      // Set up test scenario with mixed server health
      vi.spyOn(registry, "listServers").mockReturnValue([
        "healthy",
        "unhealthy",
        "recovering",
      ]);

      // Mock different server responses
      vi.spyOn(registry, "listTools").mockImplementation(() => {
        const tools = [{ name: "tool", description: "Test", inputSchema: {} }];
        return Promise.resolve(tools);
      });

      healthMonitor.startMonitoring();

      // Simulate health checks
      await healthMonitor.checkServerHealth("healthy");

      // Make unhealthy server fail
      vi.spyOn(registry, "listTools").mockRejectedValueOnce(
        new Error("Server error"),
      );
      await healthMonitor.checkServerHealth("unhealthy");
    });

    it("should generate comprehensive health report", () => {
      const report = healthMonitor.generateHealthReport();

      expect(report.summary.totalServers).toBe(3);
      expect(report.summary.healthyServers).toBeGreaterThan(0);
      expect(report.summary.unhealthyServers).toBeGreaterThan(0);
      expect(report.summary.overallHealth).toBeGreaterThan(0);
      expect(report.summary.overallHealth).toBeLessThanOrEqual(100);

      expect(report.servers).toHaveLength(3);
      expect(report.servers[0]).toHaveProperty("serverId");
      expect(report.servers[0]).toHaveProperty("health");
      expect(report.servers[0]).toHaveProperty("metrics");

      expect(report.trends).toHaveProperty("healthHistory");
      expect(report.trends).toHaveProperty("errorRate");

      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it("should provide real-time health metrics", () => {
      const metrics = healthMonitor.getHealthMetrics();

      expect(["healthy", "degraded", "critical"]).toContain(metrics.status);
      expect(metrics.healthScore).toBeGreaterThanOrEqual(0);
      expect(metrics.healthScore).toBeLessThanOrEqual(100);

      expect(Array.isArray(metrics.activeAlerts)).toBe(true);
      expect(typeof metrics.serverStatuses).toBe("object");
      expect(metrics.performance).toHaveProperty("avgLatency");
      expect(metrics.performance).toHaveProperty("successRate");
    });

    it("should generate appropriate recommendations", () => {
      // Create scenario with poor health
      const mockServers = [
        {
          serverId: "server1",
          status: ConnectionStatus.ERROR,
          health: 20,
          uptime: 50,
          avgLatency: 1500,
          metrics: {
            totalChecks: 10,
            successfulChecks: 2,
            failedChecks: 8,
            recoveryAttempts: 3,
          },
        },
      ];

      const summary = {
        totalServers: 1,
        healthyServers: 0,
        unhealthyServers: 1,
        recoveringServers: 0,
        overallHealth: 20,
      };

      // Access private method for testing
      const recommendations = (healthMonitor as any).generateRecommendations(
        summary,
        mockServers,
      );

      expect(recommendations).toContain(
        expect.stringMatching(/Critical.*below 50%/),
      );
      expect(recommendations).toContain(expect.stringMatching(/High latency/));
      expect(recommendations).toContain(
        expect.stringMatching(/repeated recovery attempts/),
      );
    });
  });

  describe("Error Integration", () => {
    it("should record health check errors in error manager", async () => {
      const recordErrorSpy = vi.spyOn(errorManager, "recordError");

      // Mock failed check
      vi.spyOn(registry, "listTools").mockRejectedValue(
        new Error("Network error"),
      );

      await healthMonitor.checkServerHealth("test-server");

      expect(recordErrorSpy).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          category: ErrorCategory.NETWORK_ERROR,
          severity: ErrorSeverity.HIGH,
          toolName: "health-check-test-server",
        }),
      );
    });

    it("should record recovery errors in error manager", async () => {
      const recordErrorSpy = vi.spyOn(errorManager, "recordError");
      const failingCallback = vi
        .fn()
        .mockRejectedValue(new Error("Recovery failed"));

      healthMonitor.registerRecoveryCallback("test-server", failingCallback);

      // Trigger failed check and recovery
      vi.spyOn(registry, "listTools").mockRejectedValue(
        new Error("Server down"),
      );
      await healthMonitor.checkServerHealth("test-server");

      vi.advanceTimersByTime(1500);
      // Wait for recovery without running all timers
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(recordErrorSpy).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          category: ErrorCategory.UNKNOWN_ERROR,
          severity: ErrorSeverity.CRITICAL,
          toolName: "recovery-test-server",
        }),
      );
    });
  });

  describe("Custom Health Strategies", () => {
    it("should allow adding custom health check strategies", async () => {
      const customStrategy = {
        name: "custom-check",
        check: vi.fn().mockResolvedValue({
          success: true,
          status: ConnectionStatus.CONNECTED,
          message: "Custom check passed",
          timestamp: Date.now(),
        }),
      };

      healthMonitor.addStrategy(customStrategy);

      const result = await healthMonitor.checkServerHealth(
        "test-server",
        "custom-check",
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe("Custom check passed");
      expect(customStrategy.check).toHaveBeenCalledWith(
        "test-server",
        registry,
      );
    });

    it("should handle unknown health check strategy", async () => {
      const result = await healthMonitor.checkServerHealth(
        "test-server",
        "unknown-strategy",
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(
        "Unknown health check strategy: unknown-strategy",
      );
    });
  });
});
