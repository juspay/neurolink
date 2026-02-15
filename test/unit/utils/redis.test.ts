import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Mock the redis module before importing anything that uses it
const mockClient = {
  isOpen: true,
  connect: vi.fn().mockResolvedValue(undefined),
  quit: vi.fn().mockResolvedValue(undefined),
  ping: vi.fn().mockResolvedValue("PONG"),
  on: vi.fn(),
  scan: vi.fn(),
};

vi.mock("redis", () => ({
  createClient: vi.fn(() => mockClient),
}));

// Mock the logger to suppress output
vi.mock("../../../src/lib/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    always: vi.fn(),
  },
}));

import {
  getPooledRedisClient,
  releasePooledRedisClient,
  getPoolStats,
  getNormalizedConfig,
  serializeConversation,
  deserializeConversation,
} from "../../../src/lib/utils/redis.js";
import type {
  RedisStorageConfig,
  RedisConversationObject,
} from "../../../src/lib/types/conversation.js";

// Helper to create a Required<RedisStorageConfig>
function makeConfig(
  overrides: Partial<RedisStorageConfig> = {},
): Required<RedisStorageConfig> {
  return getNormalizedConfig({
    host: "localhost",
    port: 6379,
    db: 0,
    ...overrides,
  });
}

describe("redis utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock client state
    mockClient.isOpen = true;
    mockClient.connect.mockResolvedValue(undefined);
    mockClient.quit.mockResolvedValue(undefined);
  });

  // ── getNormalizedConfig ───────────────────────────────────────────────────

  describe("getNormalizedConfig", () => {
    it("should fill in defaults for empty config", () => {
      const config = getNormalizedConfig({});
      expect(config.host).toBe("localhost");
      expect(config.port).toBe(6379);
      expect(config.db).toBe(0);
      expect(config.password).toBe("");
      expect(config.keyPrefix).toBe("neurolink:conversation:");
      expect(config.ttl).toBe(86400);
      expect(config.connectionOptions.connectTimeout).toBe(30000);
      expect(config.connectionOptions.maxRetriesPerRequest).toBe(3);
    });

    it("should respect provided values", () => {
      const config = getNormalizedConfig({
        host: "redis.example.com",
        port: 6380,
        db: 2,
        password: "secret",
        ttl: 3600,
      });
      expect(config.host).toBe("redis.example.com");
      expect(config.port).toBe(6380);
      expect(config.db).toBe(2);
      expect(config.password).toBe("secret");
      expect(config.ttl).toBe(3600);
    });

    it("should derive userSessionsKeyPrefix from keyPrefix", () => {
      const config = getNormalizedConfig({
        keyPrefix: "myapp:conversation:",
      });
      expect(config.userSessionsKeyPrefix).toBe("myapp:user:sessions:");
    });

    it("should use explicit userSessionsKeyPrefix when provided", () => {
      const config = getNormalizedConfig({
        keyPrefix: "myapp:conversation:",
        userSessionsKeyPrefix: "custom:sessions:",
      });
      expect(config.userSessionsKeyPrefix).toBe("custom:sessions:");
    });

    it("should merge connectionOptions with defaults", () => {
      const config = getNormalizedConfig({
        connectionOptions: {
          connectTimeout: 5000,
        },
      });
      expect(config.connectionOptions.connectTimeout).toBe(5000);
      expect(config.connectionOptions.lazyConnect).toBe(true);
      expect(config.connectionOptions.maxRetriesPerRequest).toBe(3);
    });
  });

  // ── serializeConversation / deserializeConversation ────────────────────────

  describe("serializeConversation / deserializeConversation", () => {
    const validConversation: RedisConversationObject = {
      id: "conv-1",
      title: "Test Conversation",
      sessionId: "session-1",
      userId: "user-1",
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T01:00:00.000Z",
      messages: [
        {
          id: "msg-1",
          role: "user",
          content: "Hello",
        },
        {
          id: "msg-2",
          role: "assistant",
          content: "Hi there!",
        },
      ],
    };

    it("should round-trip a valid conversation object", () => {
      const serialized = serializeConversation(validConversation);
      expect(typeof serialized).toBe("string");

      const deserialized = deserializeConversation(serialized);
      expect(deserialized).not.toBeNull();
      expect(deserialized!.sessionId).toBe("session-1");
      expect(deserialized!.userId).toBe("user-1");
      expect(deserialized!.title).toBe("Test Conversation");
      expect(deserialized!.messages).toHaveLength(2);
      expect(deserialized!.messages[0].role).toBe("user");
      expect(deserialized!.messages[1].content).toBe("Hi there!");
    });

    it("should return null for null input", () => {
      expect(deserializeConversation(null)).toBeNull();
    });

    it("should return null for empty string", () => {
      expect(deserializeConversation("")).toBeNull();
    });

    it("should return null for invalid JSON", () => {
      expect(deserializeConversation("{invalid}")).toBeNull();
    });

    it("should return null for object missing required fields", () => {
      const incomplete = JSON.stringify({ title: "only title" });
      expect(deserializeConversation(incomplete)).toBeNull();
    });

    it("should return null when messages is not an array", () => {
      const bad = JSON.stringify({
        id: "conv-1",
        title: "Test",
        sessionId: "s1",
        userId: "u1",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
        messages: "not-an-array",
      });
      expect(deserializeConversation(bad)).toBeNull();
    });

    it("should return null when messages contain invalid roles", () => {
      const bad = JSON.stringify({
        id: "conv-1",
        title: "Test",
        sessionId: "s1",
        userId: "u1",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
        messages: [{ role: "invalid_role", content: "hello" }],
      });
      expect(deserializeConversation(bad)).toBeNull();
    });

    it("should accept all valid message roles", () => {
      const roles = [
        "user",
        "assistant",
        "system",
        "tool_call",
        "tool_result",
      ] as const;
      for (const role of roles) {
        const conv: RedisConversationObject = {
          ...validConversation,
          messages: [{ id: `msg-${role}`, role, content: `${role} message` }],
        };
        const serialized = serializeConversation(conv);
        const result = deserializeConversation(serialized);
        expect(result).not.toBeNull();
        expect(result!.messages[0].role).toBe(role);
      }
    });
  });

  // ── getPooledRedisClient ──────────────────────────────────────────────────

  describe("getPooledRedisClient", () => {
    const usedConfigs: Required<RedisStorageConfig>[] = [];

    afterEach(async () => {
      // Release all refs for configs used in this test
      for (const config of usedConfigs) {
        const stats = getPoolStats();
        const key = `${config.host}:${config.port}:${config.db}:${config.password ? "auth" : "noauth"}`;
        const entry = stats.find((s) => s.key === key);
        if (entry) {
          for (let i = 0; i < entry.refCount; i++) {
            await releasePooledRedisClient(config);
          }
        }
      }
      usedConfigs.length = 0;
    });

    it("should create a new connection for a new config", async () => {
      const config = makeConfig({ host: "new-host-1", port: 6379, db: 0 });
      usedConfigs.push(config);
      const client = await getPooledRedisClient(config);
      expect(client).toBeDefined();

      const stats = getPoolStats();
      const entry = stats.find((s) => s.key === "new-host-1:6379:0:noauth");
      expect(entry).toBeDefined();
      expect(entry!.refCount).toBe(1);
    });

    it("should reuse existing connection and increment refCount", async () => {
      const config = makeConfig({ host: "reuse-host", port: 6379, db: 0 });
      usedConfigs.push(config);
      await getPooledRedisClient(config);
      await getPooledRedisClient(config);

      const stats = getPoolStats();
      const entry = stats.find((s) => s.key === "reuse-host:6379:0:noauth");
      expect(entry).toBeDefined();
      expect(entry!.refCount).toBe(2);
    });

    it("should deduplicate concurrent getPooledRedisClient calls for the same config", async () => {
      const config = makeConfig({ host: "concurrent-host", port: 6379, db: 0 });
      usedConfigs.push(config);

      // Make connect delay so both calls hit the pending path
      let resolveConnect: (() => void) | null = null;
      mockClient.connect.mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveConnect = resolve;
          }),
      );

      // Start two concurrent calls
      const promise1 = getPooledRedisClient(config);
      const promise2 = getPooledRedisClient(config);

      // Resolve the delayed connect
      resolveConnect?.();

      const [client1, client2] = await Promise.all([promise1, promise2]);
      expect(client1).toBe(client2);

      // RefCount should be 2
      const stats = getPoolStats();
      const entry = stats.find((s) => s.key.startsWith("concurrent-host"));
      expect(entry?.refCount).toBe(2);
    });
  });

  // ── releasePooledRedisClient ──────────────────────────────────────────────

  describe("releasePooledRedisClient", () => {
    it("should decrement refCount on release", async () => {
      const config = makeConfig({ host: "release-host", port: 6379, db: 0 });
      await getPooledRedisClient(config);
      await getPooledRedisClient(config);

      await releasePooledRedisClient(config);

      const stats = getPoolStats();
      const entry = stats.find((s) => s.key === "release-host:6379:0:noauth");
      expect(entry).toBeDefined();
      expect(entry!.refCount).toBe(1);
    });

    it("should close and remove connection when refCount reaches 0", async () => {
      const config = makeConfig({ host: "close-host", port: 6379, db: 0 });
      await getPooledRedisClient(config);

      await releasePooledRedisClient(config);

      const stats = getPoolStats();
      const entry = stats.find((s) => s.key === "close-host:6379:0:noauth");
      expect(entry).toBeUndefined();
      expect(mockClient.quit).toHaveBeenCalled();
    });

    it("should be a no-op for unknown client config", async () => {
      const config = makeConfig({
        host: "nonexistent",
        port: 9999,
        db: 15,
      });
      // Should not throw
      await releasePooledRedisClient(config);
    });
  });

  // ── getPoolStats ──────────────────────────────────────────────────────────

  describe("getPoolStats", () => {
    beforeEach(async () => {
      // Explicitly drain the pool so tests don't depend on prior cleanup
      const stats = getPoolStats();
      for (const entry of stats) {
        const [host, port, db, authFlag] = entry.key.split(":");
        const config = makeConfig({
          host,
          port: parseInt(port),
          db: parseInt(db),
          password: authFlag === "auth" ? "placeholder" : undefined,
        });
        for (let i = 0; i < entry.refCount; i++) {
          await releasePooledRedisClient(config);
        }
      }
    });

    it("should return empty array when no connections exist", () => {
      const stats = getPoolStats();
      expect(Array.isArray(stats)).toBe(true);
      expect(stats).toHaveLength(0);
    });

    it("should return correct structure", async () => {
      const config = makeConfig({ host: "stats-host", port: 6379, db: 0 });
      await getPooledRedisClient(config);

      const stats = getPoolStats();
      const entry = stats.find((s) => s.key === "stats-host:6379:0:noauth");
      expect(entry).toBeDefined();
      expect(typeof entry!.refCount).toBe("number");
      expect(typeof entry!.isOpen).toBe("boolean");

      // Cleanup
      await releasePooledRedisClient(config);
    });
  });
});
