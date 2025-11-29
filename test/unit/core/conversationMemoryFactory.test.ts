import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    tool: vi.fn(() => ({
      description: "mocked tool",
      parameters: {},
      execute: vi.fn(),
    })),
  };
});

vi.mock("../../../src/lib/agent/directTools", () => ({
  directAgentTools: {},
}));

import {
  createConversationMemoryManager,
  getStorageType,
  getRedisConfigFromEnv,
  getDiskConfigFromEnv,
} from "../../../src/lib/core/conversationMemoryFactory";
import { ConversationMemoryManager } from "../../../src/lib/core/conversationMemoryManager";
import { RedisConversationMemoryManager } from "../../../src/lib/core/redisConversationMemoryManager";
import { DiskConversationMemoryManager } from "../../../src/lib/core/diskConversationMemoryManager";
import type { ConversationMemoryConfig } from "../../../src/lib/types/conversation";

describe("Conversation Memory Factory", () => {
  const baseConfig: ConversationMemoryConfig = { enabled: true };

  beforeEach(() => {
    // Reset environment variables before each test
    delete process.env.STORAGE_TYPE;
    delete process.env.REDIS_HOST;
    delete process.env.DISK_STORAGE_PATH;
  });

  describe("createConversationMemoryManager", () => {
    it("should create an in-memory manager by default", () => {
      const manager = createConversationMemoryManager(baseConfig);
      expect(manager).toBeInstanceOf(ConversationMemoryManager);
    });

    it("should create a Redis manager when storage type is redis", () => {
      process.env.REDIS_HOST = "localhost";
      const manager = createConversationMemoryManager(
        baseConfig,
        "redis",
        getRedisConfigFromEnv(),
      );
      expect(manager).toBeInstanceOf(RedisConversationMemoryManager);
    });

    it("should create a Disk manager when storage type is disk", () => {
      process.env.DISK_STORAGE_PATH = "/tmp/test-storage";
      const manager = createConversationMemoryManager(baseConfig, "disk");
      expect(manager).toBeInstanceOf(DiskConversationMemoryManager);
    });

    it("should throw an error if disk storage is selected without a path", () => {
      expect(() => createConversationMemoryManager(baseConfig, "disk")).toThrow(
        "Disk storage requires a storagePath in the configuration.",
      );
    });
  });

  describe("getStorageType", () => {
    it('should return "memory" by default', () => {
      expect(getStorageType()).toBe("memory");
    });

    it('should return "redis" when environment variable is set', () => {
      process.env.STORAGE_TYPE = "redis";
      expect(getStorageType()).toBe("redis");
    });

    it('should return "disk" when environment variable is set', () => {
      process.env.STORAGE_TYPE = "disk";
      expect(getStorageType()).toBe("disk");
    });

    it("should be case-insensitive", () => {
      process.env.STORAGE_TYPE = "ReDiS";
      expect(getStorageType()).toBe("redis");
    });

    it('should fall back to "memory" for invalid types', () => {
      process.env.STORAGE_TYPE = "invalid-type";
      expect(getStorageType()).toBe("memory");
    });
  });

  describe("getDiskConfigFromEnv", () => {
    it("should read disk configuration from environment variables", () => {
      process.env.DISK_STORAGE_PATH = "/my/path";
      process.env.DISK_STORAGE_FORMAT = "jsonl";
      process.env.DISK_STORAGE_COMPRESSION = "gzip";

      const config = getDiskConfigFromEnv();

      expect(config.storagePath).toBe("/my/path");
      expect(config.format).toBe("jsonl");
      expect(config.compression).toBe("gzip");
    });
  });
});
