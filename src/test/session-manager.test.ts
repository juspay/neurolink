/**
 * NeuroLink MCP Session Manager Tests
 * Comprehensive test suite for session management and state persistence
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createMockExecutionContext } from "./helpers/test-utilities.js";
import { SessionManager } from "../lib/mcp/session-manager.js";
import type {
  NeuroLinkExecutionContext,
  ToolResult,
} from "../lib/mcp/factory.js";

describe("SessionManager", () => {
  let sessionManager: SessionManager;
  let mockContext: NeuroLinkExecutionContext;

  beforeEach(() => {
    // Create session manager with short TTL for testing
    sessionManager = new SessionManager(5000, 1000, false); // 5s TTL, 1s cleanup, no auto-cleanup
    mockContext = createMockExecutionContext({
      sessionId: "test-session-123",
      userId: "test-user",
      timestamp: Date.now(),
      permissions: ["read", "write"],
    });
  });

  afterEach(() => {
    sessionManager.stopAutoCleanup();
    sessionManager.clearAll();
  });

  describe("Session Creation", () => {
    it("should create a new session with default options", () => {
      const session = sessionManager.createSession(mockContext);

      expect(session).toBeDefined();
      expect(session.id).toMatch(/^nlsess-/);
      expect(session.context.sessionId).toBe(session.id);
      expect(session.toolHistory).toEqual([]);
      expect(session.state).toBeInstanceOf(Map);
      expect(session.createdAt).toBeLessThanOrEqual(Date.now());
      expect(session.expiresAt).toBeGreaterThan(Date.now());
    });

    it("should create session with custom TTL", () => {
      const customTTL = 10000; // 10 seconds
      const session = sessionManager.createSession(mockContext, {
        ttl: customTTL,
      });

      const expectedExpiry = session.createdAt + customTTL;
      expect(session.expiresAt).toBe(expectedExpiry);
    });

    it("should create session with metadata", () => {
      const metadata = {
        userAgent: "TestAgent/1.0",
        origin: "test-origin",
        tags: ["test", "automated"],
      };

      const session = sessionManager.createSession(mockContext, { metadata });

      expect(session.metadata).toEqual(metadata);
    });

    it("should use custom session ID when tagged", () => {
      const customContext = {
        ...mockContext,
        sessionId: "custom-session-id",
      };

      const session = sessionManager.createSession(customContext, {
        metadata: { tags: ["custom-id"] },
      });

      expect(session.id).toBe("custom-session-id");
    });
  });

  describe("Session Retrieval", () => {
    it("should retrieve an existing session", () => {
      const created = sessionManager.createSession(mockContext);
      const retrieved = sessionManager.getSession(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.context).toEqual(created.context);
    });

    it("should return null for non-existent session", () => {
      const retrieved = sessionManager.getSession("non-existent-id");
      expect(retrieved).toBeNull();
    });

    it("should extend session expiration when requested", async () => {
      const session = sessionManager.createSession(mockContext);
      const originalExpiry = session.expiresAt;

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Get session with extension
      const retrieved = sessionManager.getSession(session.id, true);
      expect(retrieved?.expiresAt).toBeGreaterThan(originalExpiry);
    });

    it("should not extend session expiration when not requested", async () => {
      const session = sessionManager.createSession(mockContext);
      const originalExpiry = session.expiresAt;

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Get session without extension
      const retrieved = sessionManager.getSession(session.id, false);
      expect(retrieved?.expiresAt).toBe(originalExpiry);
    });

    it("should remove expired sessions", async () => {
      // Create session with very short TTL
      const session = sessionManager.createSession(mockContext, { ttl: 100 });

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      const retrieved = sessionManager.getSession(session.id);
      expect(retrieved).toBeNull();
    });
  });

  describe("Session Updates", () => {
    it("should update session with tool results", async () => {
      const session = sessionManager.createSession(mockContext);
      const toolResult: ToolResult = {
        success: true,
        data: { message: "test result" },
        usage: { executionTime: 100 },
      };

      // Add small delay to ensure timestamps differ
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = sessionManager.updateSession(session.id, toolResult);

      expect(updated).toBeDefined();
      expect(updated?.toolHistory).toHaveLength(1);
      expect(updated?.toolHistory[0]).toEqual(toolResult);
      expect(updated?.lastActivity).toBeGreaterThan(session.createdAt);
    });

    it("should accumulate multiple tool results", () => {
      const session = sessionManager.createSession(mockContext);
      const results: ToolResult[] = [
        { success: true, data: { step: 1 } },
        { success: true, data: { step: 2 } },
        { success: false, error: new Error("test error") },
      ];

      results.forEach((result) => {
        sessionManager.updateSession(session.id, result);
      });

      const final = sessionManager.getSession(session.id);
      expect(final?.toolHistory).toHaveLength(3);
      expect(final?.toolHistory).toEqual(results);
    });
  });

  describe("Session State Management", () => {
    it("should set and get session state", () => {
      const session = sessionManager.createSession(mockContext);

      sessionManager.setSessionState(session.id, "counter", 0);
      sessionManager.setSessionState(session.id, "config", { debug: true });

      expect(sessionManager.getSessionState(session.id, "counter")).toBe(0);
      expect(sessionManager.getSessionState(session.id, "config")).toEqual({
        debug: true,
      });
    });

    it("should update existing state values", () => {
      const session = sessionManager.createSession(mockContext);

      sessionManager.setSessionState(session.id, "counter", 0);
      sessionManager.setSessionState(session.id, "counter", 5);

      expect(sessionManager.getSessionState(session.id, "counter")).toBe(5);
    });

    it("should return undefined for non-existent state keys", () => {
      const session = sessionManager.createSession(mockContext);

      expect(
        sessionManager.getSessionState(session.id, "unknown"),
      ).toBeUndefined();
    });

    it("should return false when setting state for non-existent session", () => {
      const result = sessionManager.setSessionState(
        "non-existent",
        "key",
        "value",
      );
      expect(result).toBe(false);
    });
  });

  describe("Session Cleanup", () => {
    it("should clean up expired sessions", async () => {
      // Create sessions with different TTLs
      const shortLived = sessionManager.createSession(mockContext, {
        ttl: 100,
      });
      const longLived = sessionManager.createSession(mockContext, {
        ttl: 5000,
      });

      // Wait for short-lived to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      const cleaned = sessionManager.cleanup();
      expect(cleaned).toBe(1);

      // Verify short-lived is gone, long-lived remains
      expect(sessionManager.getSession(shortLived.id)).toBeNull();
      expect(sessionManager.getSession(longLived.id)).toBeDefined();
    });

    it("should run automatic cleanup when enabled", async () => {
      // Create manager with auto-cleanup
      const autoManager = new SessionManager(100, 200, true); // 100ms TTL, 200ms cleanup

      try {
        autoManager.createSession(mockContext);
        expect(autoManager.getStats().activeSessions).toBe(1);

        // Wait for cleanup to run
        await new Promise((resolve) => setTimeout(resolve, 350));

        expect(autoManager.getStats().activeSessions).toBe(0);
        expect(autoManager.getStats().totalSessionsExpired).toBeGreaterThan(0);
      } finally {
        autoManager.stopAutoCleanup();
      }
    });
  });

  describe("Session Removal", () => {
    it("should remove a specific session", () => {
      const session = sessionManager.createSession(mockContext);

      const removed = sessionManager.removeSession(session.id);
      expect(removed).toBe(true);

      expect(sessionManager.getSession(session.id)).toBeNull();
    });

    it("should return false when removing non-existent session", () => {
      const removed = sessionManager.removeSession("non-existent");
      expect(removed).toBe(false);
    });

    it("should clear all sessions", () => {
      // Create multiple sessions
      sessionManager.createSession(mockContext);
      sessionManager.createSession(mockContext);
      sessionManager.createSession(mockContext);

      expect(sessionManager.getStats().activeSessions).toBe(3);

      sessionManager.clearAll();

      expect(sessionManager.getStats().activeSessions).toBe(0);
      expect(sessionManager.getActiveSessions()).toHaveLength(0);
    });
  });

  describe("Statistics", () => {
    it("should track session statistics correctly", () => {
      const stats = sessionManager.getStats();
      expect(stats.totalSessionsCreated).toBe(0);

      // Create sessions
      const session1 = sessionManager.createSession(mockContext);
      const session2 = sessionManager.createSession(mockContext);

      // Update with tool results
      sessionManager.updateSession(session1.id, { success: true, data: {} });
      sessionManager.updateSession(session1.id, { success: true, data: {} });
      sessionManager.updateSession(session2.id, { success: true, data: {} });

      const newStats = sessionManager.getStats();
      expect(newStats.totalSessionsCreated).toBe(2);
      expect(newStats.activeSessions).toBe(2);
      expect(newStats.averageToolsPerSession).toBe(1.5);
      expect(newStats.peakConcurrentSessions).toBe(2);
    });

    it("should track average session duration", async () => {
      const session = sessionManager.createSession(mockContext, { ttl: 100 });

      // Wait a bit to have measurable duration
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Update to ensure lastActivity is updated
      sessionManager.updateSession(session.id, { success: true, data: {} });

      // Remove session
      sessionManager.removeSession(session.id);

      const stats = sessionManager.getStats();
      expect(stats.averageSessionDuration).toBeGreaterThan(0);
      expect(stats.totalSessionsExpired).toBe(1);
    });
  });

  describe("Active Sessions", () => {
    it("should return all active sessions", async () => {
      const session1 = sessionManager.createSession(mockContext);
      const session2 = sessionManager.createSession(mockContext);

      const active = await sessionManager.getActiveSessions();
      expect(active).toHaveLength(2);
      expect(active.map((s) => s.id)).toContain(session1.id);
      expect(active.map((s) => s.id)).toContain(session2.id);
    });

    it("should clean up expired sessions before returning active ones", async () => {
      // Create mix of expired and active sessions
      sessionManager.createSession(mockContext, { ttl: 50 });
      const active = sessionManager.createSession(mockContext, { ttl: 5000 });

      // Wait for first to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      const activeSessions = await sessionManager.getActiveSessions();
      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0].id).toBe(active.id);
    });
  });
});
