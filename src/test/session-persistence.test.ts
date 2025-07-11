/**
 * Session Persistence Tests
 * Verifies session storage, recovery, and lifecycle management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import { SessionManager } from "../lib/mcp/session-manager.js";
import { SessionPersistence } from "../lib/mcp/session-persistence.js";
import type { OrchestratorSession } from "../lib/mcp/session-manager.js";
import type { NeuroLinkExecutionContext } from "../lib/mcp/factory.js";
import { createMockExecutionContext } from "./helpers/test-utilities.js";

// Mock fs module
vi.mock("fs/promises");
vi.mock("fs", () => ({
  existsSync: vi.fn(),
}));

describe("Session Persistence", () => {
  let sessionManager: SessionManager;
  let testContext: NeuroLinkExecutionContext;
  const testDir = ".neurolink/sessions";

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock directory operations
    (fs.mkdir as any).mockResolvedValue(undefined);
    (fs.readdir as any).mockResolvedValue([]);
    (fs.readFile as any).mockRejectedValue({ code: "ENOENT" });
    (fs.writeFile as any).mockResolvedValue(undefined);
    (fs.rename as any).mockResolvedValue(undefined);
    (fs.unlink as any).mockResolvedValue(undefined);

    // Create session manager with persistence
    sessionManager = new SessionManager(
      3600000, // 1 hour TTL
      300000, // 5 min cleanup
      false, // No auto cleanup for tests
      true, // Enable persistence
    );

    // Initialize with persistence
    await sessionManager.initialize({
      directory: testDir,
      snapshotInterval: 1000, // 1 second for tests
      enableChecksum: true,
    });

    // Test context
    testContext = createMockExecutionContext({
      sessionId: "test-session-1",
      userId: "user-123",
      aiProvider: "openai",
      permissions: ["read", "write"],
    });
  });

  afterEach(() => {
    // Clean up any timers
    vi.clearAllTimers();
  });

  describe("Session Creation and Persistence", () => {
    it("should save session to disk on creation", async () => {
      const session = await sessionManager.createSession(testContext);

      expect(session).toBeDefined();
      expect(session.id).toBe("test-session-1");

      // Verify file write was called
      expect(fs.writeFile).toHaveBeenCalled();
      expect(fs.rename).toHaveBeenCalled();

      // Check file path
      const writeCall = (fs.writeFile as any).mock.calls[0];
      expect(writeCall[0]).toContain(".tmp");

      const renameCall = (fs.rename as any).mock.calls[0];
      expect(renameCall[1]).toBe(path.join(testDir, "test-session-1.json"));
    });

    it("should serialize session with checksum", async () => {
      await sessionManager.createSession(testContext);

      const writeCall = (fs.writeFile as any).mock.calls[0];
      const fileContent = JSON.parse(writeCall[1]);

      expect(fileContent.session).toBeDefined();
      expect(fileContent.checksum).toBeDefined();
      expect(fileContent.version).toBe("1.0");
      expect(fileContent.lastSaved).toBeDefined();
    });
  });

  describe("Session Recovery", () => {
    it("should load session from disk if not in memory", async () => {
      const savedSession = {
        session: {
          id: "persisted-session",
          context: testContext,
          toolHistory: [],
          state: [],
          metadata: {},
          createdAt: Date.now(),
          lastActivity: Date.now(),
          expiresAt: Date.now() + 3600000,
        },
        checksum: "mock-checksum",
        version: "1.0",
        lastSaved: Date.now(),
      };

      (fs.readFile as any).mockResolvedValueOnce(JSON.stringify(savedSession));

      const session = await sessionManager.getSession("persisted-session");

      expect(session).toBeDefined();
      expect(session?.id).toBe("persisted-session");
      expect(fs.readFile).toHaveBeenCalledWith(
        path.join(testDir, "persisted-session.json"),
        "utf8",
      );
    });

    it("should restore multiple sessions on startup", async () => {
      const sessions = [
        "session1.json",
        "session2.json",
        "session3.json",
        "not-json.txt", // Should be ignored
      ];

      (fs.readdir as any).mockResolvedValueOnce(sessions);

      // Mock reading each session file
      sessions.forEach((file, index) => {
        if (file.endsWith(".json")) {
          const sessionData = {
            session: {
              id: `session${index + 1}`,
              context: testContext,
              toolHistory: [],
              state: [],
              metadata: {},
              createdAt: Date.now(),
              lastActivity: Date.now(),
              expiresAt: Date.now() + 3600000,
            },
            checksum: "mock-checksum",
            version: "1.0",
            lastSaved: Date.now(),
          };
          (fs.readFile as any).mockResolvedValueOnce(
            JSON.stringify(sessionData),
          );
        }
      });

      // Re-initialize to trigger loading
      const newManager = new SessionManager(3600000, 300000, false, true);
      await newManager.initialize({ directory: testDir });

      // Should have loaded 3 sessions
      const activeSessions = await newManager.getActiveSessions();
      expect(activeSessions).toHaveLength(3);
    });
  });

  describe("Session Updates", () => {
    it("should persist session updates", async () => {
      const session = await sessionManager.createSession(testContext);

      // Clear previous calls
      vi.clearAllMocks();

      // Update session
      await sessionManager.updateSession(session.id, {
        success: true,
        data: { result: "test" },
        usage: { executionTime: 100 },
      });

      // Verify save was called
      expect(fs.writeFile).toHaveBeenCalled();
      expect(fs.rename).toHaveBeenCalled();
    });

    it("should persist state changes", async () => {
      const session = await sessionManager.createSession(testContext);

      // Clear previous calls
      vi.clearAllMocks();

      // Set state
      await sessionManager.setSessionState(session.id, "counter", 42);

      // Verify save was called
      expect(fs.writeFile).toHaveBeenCalled();

      // Check serialized state
      const writeCall = (fs.writeFile as any).mock.calls[0];
      const fileContent = JSON.parse(writeCall[1]);
      expect(fileContent.session.state).toContainEqual(["counter", 42]);
    });
  });

  describe("Session Cleanup", () => {
    it("should delete session file on removal", async () => {
      const session = await sessionManager.createSession(testContext);

      // Remove session
      sessionManager.removeSession(session.id);

      // Verify delete was called
      expect(fs.unlink).toHaveBeenCalledWith(
        path.join(testDir, `${session.id}.json`),
      );
    });

    it("should clean up expired sessions from disk", async () => {
      // Create expired session
      const expiredContext = { ...testContext, sessionId: "expired-session" };
      const session = await sessionManager.createSession(expiredContext, {
        ttl: 1, // 1ms TTL
      });

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Run cleanup
      await sessionManager.cleanup();

      // Verify deletion
      expect(fs.unlink).toHaveBeenCalledWith(
        path.join(testDir, `${session.id}.json`),
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle write failures with retries", async () => {
      // Mock write failures then success
      (fs.writeFile as any)
        .mockRejectedValueOnce(new Error("Write failed"))
        .mockRejectedValueOnce(new Error("Write failed"))
        .mockResolvedValueOnce(undefined);

      const session = await sessionManager.createSession(testContext);

      // Should retry and eventually succeed
      expect(session).toBeDefined();
      expect(fs.writeFile).toHaveBeenCalledTimes(3);
    });

    it("should handle corrupted session files", async () => {
      // Mock corrupted file
      (fs.readFile as any).mockResolvedValueOnce("{ invalid json");

      const session = await sessionManager.getSession("corrupted-session");

      // Should return null for corrupted session
      expect(session).toBeNull();
    });

    it("should verify checksum integrity", async () => {
      const sessionData = {
        session: {
          id: "tampered-session",
          context: testContext,
          toolHistory: [],
          state: [],
          metadata: {},
          createdAt: Date.now(),
          lastActivity: Date.now(),
          expiresAt: Date.now() + 3600000,
        },
        checksum: "invalid-checksum",
        version: "1.0",
        lastSaved: Date.now(),
      };

      (fs.readFile as any).mockResolvedValueOnce(JSON.stringify(sessionData));

      const session = await sessionManager.getSession("tampered-session");

      // Should reject tampered session
      expect(session).toBeNull();
    });
  });

  describe("Snapshot Management", () => {
    it("should perform periodic snapshots", async () => {
      vi.useFakeTimers();

      // Create sessions
      await sessionManager.createSession(testContext);
      await sessionManager.createSession({
        ...testContext,
        sessionId: "session-2",
      });

      // Clear write calls from creation
      vi.clearAllMocks();

      // Advance time to trigger snapshot
      vi.advanceTimersByTime(1100);

      // Wait for async operations
      await vi.runOnlyPendingTimersAsync();

      // Should have saved both sessions
      expect(fs.writeFile).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });
});

describe("SessionPersistence Class", () => {
  let persistence: SessionPersistence;
  let sessionMap: Map<string, OrchestratorSession>;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionMap = new Map();
    persistence = new SessionPersistence(sessionMap, {
      directory: ".test/sessions",
      snapshotInterval: 1000,
      enableChecksum: true,
    });
  });

  it("should handle atomic writes correctly", async () => {
    const session: OrchestratorSession = {
      id: "atomic-test",
      context: createMockExecutionContext({ sessionId: "atomic-test" }),
      toolHistory: [],
      state: new Map([["key", "value"]]),
      metadata: {},
      createdAt: Date.now(),
      lastActivity: Date.now(),
      expiresAt: Date.now() + 3600000,
    };

    (fs.writeFile as any).mockResolvedValue(undefined);
    (fs.rename as any).mockResolvedValue(undefined);

    const result = await persistence.saveSession("atomic-test", session);

    expect(result).toBe(true);
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining(".tmp"),
      expect.any(String),
      "utf8",
    );
    expect(fs.rename).toHaveBeenCalled();
  });

  it("should clean up old session files", async () => {
    const oldFile = "old-session.json";
    const newFile = "new-session.json";

    (fs.readdir as any).mockResolvedValue([oldFile, newFile]);

    // Mock old file stats
    (fs.stat as any).mockImplementation((filepath: string) => {
      if (filepath.includes(oldFile)) {
        return Promise.resolve({
          mtimeMs: Date.now() - 25 * 60 * 60 * 1000, // 25 hours old
        });
      }
      return Promise.resolve({
        mtimeMs: Date.now() - 1 * 60 * 60 * 1000, // 1 hour old
      });
    });

    await persistence.cleanupOldSessions();

    // Should only delete the old file
    expect(fs.unlink).toHaveBeenCalledTimes(1);
    expect(fs.unlink).toHaveBeenCalledWith(expect.stringContaining(oldFile));
  });
});
