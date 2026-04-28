/**
 * ThreeLayerMemoryManager Unit Tests
 *
 * Tests for the unified coordinator of the three-layer memory system:
 * 1. Conversation History Layer - Recent messages with summarization
 * 2. Semantic Recall Layer - Vector-based similarity search
 * 3. Working Memory Layer - Structured knowledge storage
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createThreeLayerMemoryManager,
  ThreeLayerMemoryManager,
} from "../../../src/lib/memory/threeLayerMemoryManager.js";
import type { ChatMessage } from "../../../src/lib/types/conversation.js";
import type {
  MemoryContext,
  ThreeLayerMemoryConfig,
} from "../../../src/lib/types/memory.js";

// Mock the dependencies
vi.mock("../../../src/lib/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("../../../src/lib/memory/vectorStores/vectorStoreFactory.js", () => ({
  createVectorStore: vi.fn().mockResolvedValue({
    initialize: vi.fn().mockResolvedValue(undefined),
    ensureCollection: vi.fn().mockResolvedValue(undefined),
    upsert: vi.fn().mockResolvedValue(undefined),
    search: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(0),
    getStats: vi.fn().mockResolvedValue({ vectorCount: 0, dimensions: 1536 }),
    close: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("../../../src/lib/memory/embedders/embedderFactory.js", () => ({
  createEmbedder: vi.fn().mockResolvedValue({
    initialize: vi.fn().mockResolvedValue(undefined),
    getDimensions: vi.fn().mockReturnValue(1536),
    embed: vi.fn().mockResolvedValue(new Array(1536).fill(0.1)),
    embedBatch: vi.fn().mockResolvedValue([new Array(1536).fill(0.1)]),
    getModelInfo: vi.fn().mockReturnValue({
      provider: "openai",
      model: "text-embedding-3-small",
      dimensions: 1536,
      maxTokens: 8191,
    }),
  }),
}));

// Create mock conversation manager
function createMockConversationManager() {
  return {
    buildContextMessages: vi.fn().mockResolvedValue([
      {
        id: "msg-1",
        role: "user",
        content: "Hello",
        timestamp: new Date().toISOString(),
      },
      {
        id: "msg-2",
        role: "assistant",
        content: "Hi there!",
        timestamp: new Date().toISOString(),
      },
    ] as ChatMessage[]),
    storeConversationTurn: vi.fn().mockResolvedValue(undefined),
    clearSession: vi.fn().mockResolvedValue(true),
    getSession: vi.fn().mockReturnValue(null),
  };
}

describe("ThreeLayerMemoryManager", () => {
  describe("constructor", () => {
    it("should create manager with default config", () => {
      const manager = createThreeLayerMemoryManager({});
      expect(manager).toBeDefined();
      expect(manager).toBeInstanceOf(ThreeLayerMemoryManager);
    });

    it("should create manager with enabled: true by default", () => {
      const manager = createThreeLayerMemoryManager({});
      const config = manager.getConfig();
      expect(config.enabled).toBe(true);
    });

    it("should create manager with memory storage by default", () => {
      const manager = createThreeLayerMemoryManager({});
      const config = manager.getConfig();
      expect(config.storage.type).toBe("memory");
    });

    it("should create manager with all layers enabled", () => {
      const manager = createThreeLayerMemoryManager({
        conversationHistory: { enabled: true, lastMessages: 20 },
        workingMemory: { enabled: true, scope: "thread" },
        semanticRecall: {
          enabled: true,
          topK: 5,
          vectorStore: { provider: "memory" },
          embedder: { provider: "openai", model: "text-embedding-3-small" },
        },
      });
      expect(manager).toBeDefined();
    });

    it("should accept custom configuration", () => {
      const config: Partial<ThreeLayerMemoryConfig> = {
        enabled: true,
        storage: { type: "memory" },
        conversationHistory: {
          enabled: true,
          lastMessages: 50,
          enableSummarization: true,
        },
      };

      const manager = createThreeLayerMemoryManager(config);
      const resultConfig = manager.getConfig();

      expect(resultConfig.conversationHistory?.lastMessages).toBe(50);
      expect(resultConfig.conversationHistory?.enableSummarization).toBe(true);
    });
  });

  describe("initialize", () => {
    it("should initialize successfully with conversation manager", async () => {
      const manager = createThreeLayerMemoryManager({
        conversationHistory: { enabled: true },
      });
      const mockConversationManager = createMockConversationManager();

      await expect(
        manager.initialize(mockConversationManager as any),
      ).resolves.not.toThrow();
    });

    it("should not initialize twice", async () => {
      const manager = createThreeLayerMemoryManager({});
      const mockConversationManager = createMockConversationManager();

      await manager.initialize(mockConversationManager as any);
      // Second initialization should be a no-op
      await expect(
        manager.initialize(mockConversationManager as any),
      ).resolves.not.toThrow();
    });

    it("should enable conversation history layer by default", async () => {
      const manager = createThreeLayerMemoryManager({});
      const mockConversationManager = createMockConversationManager();

      await manager.initialize(mockConversationManager as any);

      expect(manager.isLayerEnabled("conversationHistory")).toBe(true);
    });

    it("should not enable semantic recall when not configured", async () => {
      const manager = createThreeLayerMemoryManager({});
      const mockConversationManager = createMockConversationManager();

      await manager.initialize(mockConversationManager as any);

      expect(manager.isLayerEnabled("semanticRecall")).toBe(false);
    });

    it("should not enable working memory when not configured", async () => {
      const manager = createThreeLayerMemoryManager({});
      const mockConversationManager = createMockConversationManager();

      await manager.initialize(mockConversationManager as any);

      expect(manager.isLayerEnabled("workingMemory")).toBe(false);
    });
  });

  describe("retrieve", () => {
    let manager: ThreeLayerMemoryManager;
    let mockConversationManager: ReturnType<
      typeof createMockConversationManager
    >;

    beforeEach(async () => {
      manager = createThreeLayerMemoryManager({
        conversationHistory: { enabled: true, lastMessages: 10 },
      });
      mockConversationManager = createMockConversationManager();
      await manager.initialize(mockConversationManager as any);
    });

    it("should throw if not initialized", async () => {
      const uninitializedManager = createThreeLayerMemoryManager({});
      const context: MemoryContext = { threadId: "test-thread" };

      await expect(uninitializedManager.retrieve(context)).rejects.toThrow(
        "ThreeLayerMemoryManager not initialized",
      );
    });

    it("should retrieve context from conversation history layer", async () => {
      const context: MemoryContext = { threadId: "test-thread" };

      const result = await manager.retrieve(context);

      expect(result.messages.length).toBeGreaterThan(0);
      expect(mockConversationManager.buildContextMessages).toHaveBeenCalledWith(
        "test-thread",
        undefined,
        true,
      );
    });

    it("should include token count in result", async () => {
      const context: MemoryContext = { threadId: "test-thread" };

      const result = await manager.retrieve(context);

      expect(result.tokenCount).toBeDefined();
      expect(typeof result.tokenCount).toBe("number");
    });

    it("should include debug info in result", async () => {
      const context: MemoryContext = { threadId: "test-thread" };

      const result = await manager.retrieve(context);

      expect(result.debug).toBeDefined();
      expect(result.debug?.layerTimings).toBeDefined();
      expect(result.debug?.layerCounts).toBeDefined();
    });

    it("should pass resourceId when provided", async () => {
      const context: MemoryContext = {
        threadId: "test-thread",
        resourceId: "user-123",
      };

      await manager.retrieve(context);

      expect(mockConversationManager.buildContextMessages).toHaveBeenCalledWith(
        "test-thread",
        "user-123",
        true,
      );
    });
  });

  describe("store", () => {
    let manager: ThreeLayerMemoryManager;
    let mockConversationManager: ReturnType<
      typeof createMockConversationManager
    >;

    beforeEach(async () => {
      manager = createThreeLayerMemoryManager({
        conversationHistory: { enabled: true },
      });
      mockConversationManager = createMockConversationManager();
      await manager.initialize(mockConversationManager as any);
    });

    it("should throw if not initialized", async () => {
      const uninitializedManager = createThreeLayerMemoryManager({});
      const context: MemoryContext = { threadId: "test-thread" };

      await expect(
        uninitializedManager.store(context, "Hello", "Hi there!"),
      ).rejects.toThrow("ThreeLayerMemoryManager not initialized");
    });

    it("should store conversation turn", async () => {
      const context: MemoryContext = { threadId: "test-thread" };

      await manager.store(context, "Hello", "Hi there!");

      expect(mockConversationManager.storeConversationTurn).toHaveBeenCalled();
    });

    it("should pass options to store", async () => {
      const context: MemoryContext = { threadId: "test-thread" };
      const options = {
        providerDetails: { provider: "openai", model: "gpt-4" },
      };

      await manager.store(context, "Hello", "Hi there!", options);

      expect(
        mockConversationManager.storeConversationTurn,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: "test-thread",
          userMessage: "Hello",
          aiResponse: "Hi there!",
          providerDetails: options.providerDetails,
        }),
      );
    });
  });

  describe("getOrCreateThread", () => {
    let manager: ThreeLayerMemoryManager;

    beforeEach(async () => {
      manager = createThreeLayerMemoryManager({
        conversationHistory: { enabled: true },
      });
      const mockConversationManager = createMockConversationManager();
      await manager.initialize(mockConversationManager as any);
    });

    it("should return thread with provided id", async () => {
      const thread = await manager.getOrCreateThread("my-thread");

      expect(thread.id).toBe("my-thread");
      expect(thread.title).toBe("New Conversation");
    });

    it("should include resourceId if provided", async () => {
      const thread = await manager.getOrCreateThread("my-thread", "user-123");

      expect(thread.resourceId).toBe("user-123");
    });

    it("should include timestamps", async () => {
      const thread = await manager.getOrCreateThread("my-thread");

      expect(thread.createdAt).toBeDefined();
      expect(thread.updatedAt).toBeDefined();
    });
  });

  describe("listThreads", () => {
    it("should return empty array when conversation history not enabled", async () => {
      const manager = createThreeLayerMemoryManager({
        conversationHistory: { enabled: false },
      });
      const mockConversationManager = createMockConversationManager();
      await manager.initialize(mockConversationManager as any);

      const threads = await manager.listThreads("user-123");

      expect(threads).toEqual([]);
    });
  });

  describe("clearThread", () => {
    let manager: ThreeLayerMemoryManager;
    let mockConversationManager: ReturnType<
      typeof createMockConversationManager
    >;

    beforeEach(async () => {
      manager = createThreeLayerMemoryManager({
        conversationHistory: { enabled: true },
      });
      mockConversationManager = createMockConversationManager();
      await manager.initialize(mockConversationManager as any);
    });

    it("should clear thread from conversation history", async () => {
      await manager.clearThread("test-thread");

      expect(mockConversationManager.clearSession).toHaveBeenCalledWith(
        "test-thread",
        undefined,
      );
    });

    it("should pass resourceId when provided", async () => {
      await manager.clearThread("test-thread", "user-123");

      expect(mockConversationManager.clearSession).toHaveBeenCalledWith(
        "test-thread",
        "user-123",
      );
    });
  });

  describe("isLayerEnabled", () => {
    it("should return correct status for each layer", async () => {
      const manager = createThreeLayerMemoryManager({
        conversationHistory: { enabled: true },
      });
      const mockConversationManager = createMockConversationManager();
      await manager.initialize(mockConversationManager as any);

      expect(manager.isLayerEnabled("conversationHistory")).toBe(true);
      expect(manager.isLayerEnabled("semanticRecall")).toBe(false);
      expect(manager.isLayerEnabled("workingMemory")).toBe(false);
    });
  });

  describe("getWorkingMemoryTool", () => {
    it("should return null when working memory not enabled", async () => {
      const manager = createThreeLayerMemoryManager({});
      const mockConversationManager = createMockConversationManager();
      await manager.initialize(mockConversationManager as any);

      const context: MemoryContext = { threadId: "test-thread" };
      const tool = manager.getWorkingMemoryTool(context);

      expect(tool).toBeNull();
    });
  });

  describe("formatWorkingMemoryForPrompt", () => {
    it("should return empty string for undefined working memory", async () => {
      const manager = createThreeLayerMemoryManager({});
      const mockConversationManager = createMockConversationManager();
      await manager.initialize(mockConversationManager as any);

      const result = manager.formatWorkingMemoryForPrompt(undefined);

      expect(result).toBe("");
    });
  });

  describe("close", () => {
    it("should close all layers and reset initialized state", async () => {
      const manager = createThreeLayerMemoryManager({
        conversationHistory: { enabled: true },
      });
      const mockConversationManager = createMockConversationManager();
      await manager.initialize(mockConversationManager as any);

      await manager.close();

      // Should throw because not initialized after close
      const context: MemoryContext = { threadId: "test-thread" };
      await expect(manager.retrieve(context)).rejects.toThrow(
        "ThreeLayerMemoryManager not initialized",
      );
    });
  });

  describe("getConfig", () => {
    it("should return a copy of the configuration", () => {
      const manager = createThreeLayerMemoryManager({
        conversationHistory: { enabled: true, lastMessages: 30 },
      });

      const config1 = manager.getConfig();
      const config2 = manager.getConfig();

      expect(config1).not.toBe(config2); // Different object references
      expect(config1).toEqual(config2); // Same values
    });
  });
});

describe("createThreeLayerMemoryManager", () => {
  it("should create manager with partial config", () => {
    const manager = createThreeLayerMemoryManager({
      conversationHistory: { lastMessages: 25 },
    });

    expect(manager).toBeDefined();
    const config = manager.getConfig();
    expect(config.conversationHistory?.lastMessages).toBe(25);
  });

  it("should create manager with empty config", () => {
    const manager = createThreeLayerMemoryManager({});

    expect(manager).toBeDefined();
    expect(manager.getConfig().enabled).toBe(true);
  });

  it("should create manager with undefined config", () => {
    const manager = createThreeLayerMemoryManager(undefined);

    expect(manager).toBeDefined();
  });
});
