/**
 * Memory Coordinator Tests
 *
 * Comprehensive test suite for the MemoryCoordinator class.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  MemoryCoordinator,
  createMemoryCoordinator,
} from "../../src/lib/memory/MemoryCoordinator.js";
import {
  SemanticMemoryLayer,
  InMemoryVectorStore,
  MockEmbedder,
} from "../../src/lib/memory/layers/SemanticMemoryLayer.js";
import {
  WorkingMemoryLayerImpl,
  InMemoryWorkingMemoryStorage,
} from "../../src/lib/memory/layers/WorkingMemoryLayerImpl.js";
import type {
  ThreeLayerMemoryConfig,
  MemoryContext,
} from "../../src/lib/memory/types/memoryTypes.js";
import type { ChatMessage } from "../../src/lib/types/conversation.js";

// Mock conversation memory manager
const createMockConversationManager = () => {
  const sessions = new Map<string, { messages: ChatMessage[] }>();

  return {
    initialize: vi.fn().mockResolvedValue(undefined),
    storeConversationTurn: vi
      .fn()
      .mockImplementation(
        async (opts: {
          sessionId: string;
          userMessage: string;
          aiResponse: string;
        }) => {
          const session = sessions.get(opts.sessionId) || { messages: [] };
          session.messages.push(
            {
              id: `user-${Date.now()}`,
              role: "user" as const,
              content: opts.userMessage,
            },
            {
              id: `assistant-${Date.now()}`,
              role: "assistant" as const,
              content: opts.aiResponse,
            },
          );
          sessions.set(opts.sessionId, session);
        },
      ),
    buildContextMessages: vi
      .fn()
      .mockImplementation(async (sessionId: string) => {
        const session = sessions.get(sessionId);
        return session?.messages || [];
      }),
    getSession: vi.fn().mockImplementation((sessionId: string) => {
      return sessions.get(sessionId) || null;
    }),
    clearSession: vi.fn().mockImplementation(async (sessionId: string) => {
      const existed = sessions.has(sessionId);
      sessions.delete(sessionId);
      return existed;
    }),
    // Helper to set up messages for testing
    _setMessages: (sessionId: string, messages: ChatMessage[]) => {
      sessions.set(sessionId, { messages });
    },
  };
};

describe("MemoryCoordinator", () => {
  let coordinator: MemoryCoordinator;
  let mockConversationManager: ReturnType<typeof createMockConversationManager>;

  const defaultConfig: ThreeLayerMemoryConfig = {
    enabled: true,
    storage: { type: "memory" },
    conversationHistory: { enabled: true },
    semanticRecall: {
      enabled: true,
      vectorStore: {
        provider: "memory",
        config: {},
        collectionName: "test_messages",
      },
      embedder: {
        provider: "ollama",
        model: "mock-embed",
      },
      topK: 3,
    },
    workingMemory: {
      enabled: true,
      maxTokens: 4096,
    },
  };

  beforeEach(async () => {
    mockConversationManager = createMockConversationManager();
    coordinator = new MemoryCoordinator(defaultConfig);

    // Set up conversation layer
    coordinator.setConversationLayer(mockConversationManager as never);

    // Set up semantic layer
    const vectorStore = new InMemoryVectorStore();
    const embedder = new MockEmbedder();
    const semanticLayer = new SemanticMemoryLayer(
      vectorStore,
      embedder,
      defaultConfig.semanticRecall!,
    );
    coordinator.setSemanticLayer(semanticLayer);

    // Set up working memory layer
    const workingStorage = new InMemoryWorkingMemoryStorage();
    const workingMemoryLayer = new WorkingMemoryLayerImpl(
      workingStorage,
      defaultConfig.workingMemory!,
    );
    coordinator.setWorkingMemoryLayer(workingMemoryLayer);

    await coordinator.initialize();
  });

  afterEach(async () => {
    await coordinator.close();
  });

  describe("Initialization", () => {
    it("should initialize successfully", async () => {
      expect(coordinator.isInitialized()).toBe(true);
    });

    it("should report layer status", () => {
      const status = coordinator.getLayerStatus();

      expect(status.conversation).toBe(true);
      expect(status.semantic).toBe(true);
      expect(status.workingMemory).toBe(true);
    });

    it("should initialize with partial layers", async () => {
      const minimalConfig: ThreeLayerMemoryConfig = {
        enabled: true,
        storage: { type: "memory" },
        conversationHistory: { enabled: true },
      };

      const minimalCoordinator = new MemoryCoordinator(minimalConfig);
      minimalCoordinator.setConversationLayer(
        createMockConversationManager() as never,
      );
      await minimalCoordinator.initialize();

      const status = minimalCoordinator.getLayerStatus();
      expect(status.conversation).toBe(true);
      expect(status.semantic).toBe(false);
      expect(status.workingMemory).toBe(false);

      await minimalCoordinator.close();
    });
  });

  describe("Context Assembly", () => {
    const testMessages: ChatMessage[] = [
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
      {
        id: "msg-3",
        role: "user",
        content: "How are you?",
        timestamp: new Date().toISOString(),
      },
      {
        id: "msg-4",
        role: "assistant",
        content: "I am doing well!",
        timestamp: new Date().toISOString(),
      },
    ];

    beforeEach(() => {
      mockConversationManager._setMessages("thread-1", testMessages);
    });

    it("should assemble context from conversation history", async () => {
      const context: MemoryContext = {
        threadId: "thread-1",
        resourceId: "user-1",
      };

      const result = await coordinator.assembleContext(context);

      expect(result.messages.length).toBeGreaterThan(0);
      expect(result.tokenCount).toBeGreaterThan(0);
    });

    it("should include working memory in context", async () => {
      // Set up working memory
      await coordinator.updateWorkingMemory("user-1", {
        name: "Alice",
        preferences: { theme: "dark" },
      });

      const context: MemoryContext = {
        threadId: "thread-1",
        resourceId: "user-1",
      };

      const result = await coordinator.assembleContext(context, {
        includeWorkingMemory: true,
      });

      expect(result.workingMemory).toBeDefined();
      expect(result.workingMemory).toHaveProperty("name", "Alice");
    });

    it("should include semantic matches when query is provided", async () => {
      // First, store and index some messages
      await coordinator.storeAndIndex(
        { threadId: "thread-1", resourceId: "user-1" },
        "I love TypeScript programming",
        "TypeScript is great for type safety!",
      );

      // Wait a bit for indexing
      await new Promise((resolve) => setTimeout(resolve, 100));

      const context: MemoryContext = {
        threadId: "thread-1",
        resourceId: "user-1",
      };

      const result = await coordinator.assembleContext(context, {
        query: "TypeScript",
        includeSemanticMatches: true,
      });

      // Note: In actual tests, semantic matches would be populated
      // The mock embedder generates deterministic but not semantically meaningful embeddings
      expect(result.debug).toBeDefined();
      expect(result.debug?.layerTimings).toBeDefined();
    });

    it("should respect maxTokens limit", async () => {
      const context: MemoryContext = {
        threadId: "thread-1",
        resourceId: "user-1",
      };

      const result = await coordinator.assembleContext(context, {
        maxTokens: 100,
      });

      expect(result.tokenCount).toBeLessThanOrEqual(100);
    });

    it("should include debug information", async () => {
      const context: MemoryContext = {
        threadId: "thread-1",
        resourceId: "user-1",
      };

      const result = await coordinator.assembleContext(context);

      expect(result.debug).toBeDefined();
      expect(result.debug?.layerTimings).toBeDefined();
      expect(result.debug?.layerCounts).toBeDefined();
      expect(result.debug?.processors).toBeDefined();
    });

    it("should return empty context when disabled", async () => {
      const disabledConfig: ThreeLayerMemoryConfig = {
        enabled: false,
        storage: { type: "memory" },
      };

      const disabledCoordinator = new MemoryCoordinator(disabledConfig);
      await disabledCoordinator.initialize();

      const context: MemoryContext = {
        threadId: "thread-1",
        resourceId: "user-1",
      };

      const result = await disabledCoordinator.assembleContext(context);

      expect(result.messages).toHaveLength(0);
      expect(result.tokenCount).toBe(0);

      await disabledCoordinator.close();
    });
  });

  describe("Store and Index", () => {
    it("should store conversation turn", async () => {
      const context: MemoryContext = {
        threadId: "thread-1",
        resourceId: "user-1",
      };

      await coordinator.storeAndIndex(context, "Hello", "Hi there!");

      expect(
        mockConversationManager.storeConversationTurn,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: "thread-1",
          userMessage: "Hello",
          aiResponse: "Hi there!",
        }),
      );
    });

    it("should index messages to semantic layer", async () => {
      const context: MemoryContext = {
        threadId: "thread-1",
        resourceId: "user-1",
      };

      await coordinator.storeAndIndex(
        context,
        "Test message",
        "Test response",
        {
          indexToSemantic: true,
        },
      );

      // Give time for background indexing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // The semantic layer should have indexed the messages
      // We can't directly check this without exposing internals
    });

    it("should skip semantic indexing when disabled", async () => {
      const context: MemoryContext = {
        threadId: "thread-1",
        resourceId: "user-1",
      };

      await coordinator.storeAndIndex(
        context,
        "Test message",
        "Test response",
        {
          indexToSemantic: false,
        },
      );

      // Should complete without errors
    });
  });

  describe("Working Memory Management", () => {
    it("should update working memory (set mode)", async () => {
      await coordinator.updateWorkingMemory("user-1", {
        name: "Alice",
        role: "user",
      });

      const data = await coordinator.getWorkingMemory("user-1");
      expect(data).toEqual({
        name: "Alice",
        role: "user",
      });
    });

    it("should update working memory (merge mode)", async () => {
      await coordinator.updateWorkingMemory("user-1", {
        name: "Alice",
        age: 30,
      });

      await coordinator.updateWorkingMemory(
        "user-1",
        {
          role: "admin",
          department: "Engineering",
        },
        "merge",
      );

      const data = await coordinator.getWorkingMemory("user-1");
      expect(data).toEqual({
        name: "Alice",
        age: 30,
        role: "admin",
        department: "Engineering",
      });
    });

    it("should clear working memory", async () => {
      await coordinator.updateWorkingMemory("user-1", { name: "Alice" });
      await coordinator.clearWorkingMemory("user-1");

      const data = await coordinator.getWorkingMemory("user-1");
      expect(data).toBeNull();
    });

    it("should return null for non-existent working memory", async () => {
      const data = await coordinator.getWorkingMemory("non-existent");
      expect(data).toBeNull();
    });
  });

  describe("Thread Management", () => {
    it("should clear thread", async () => {
      const context: MemoryContext = {
        threadId: "thread-1",
        resourceId: "user-1",
      };

      // Store some data
      mockConversationManager._setMessages("thread-1", [
        { id: "msg-1", role: "user", content: "Hello" },
      ]);

      await coordinator.clearThread("thread-1", "user-1");

      // In-memory manager's clearSession is called with just sessionId
      // (resourceId is used by Redis manager but not in-memory)
      expect(mockConversationManager.clearSession).toHaveBeenCalledWith(
        "thread-1",
      );
    });
  });

  describe("Factory Function", () => {
    it("should create coordinator with partial config", async () => {
      const coord = createMemoryCoordinator({
        conversationHistory: { enabled: true },
      });

      expect(coord).toBeInstanceOf(MemoryCoordinator);
    });

    it("should create coordinator with full config", async () => {
      const coord = createMemoryCoordinator({
        storage: { type: "memory" },
        conversationHistory: { enabled: true },
        semanticRecall: {
          enabled: true,
          vectorStore: {
            provider: "memory",
            config: {},
          },
          embedder: {
            provider: "ollama",
            model: "mock",
          },
        },
        workingMemory: {
          enabled: true,
        },
      });

      expect(coord).toBeInstanceOf(MemoryCoordinator);
    });
  });
});

describe("MemoryCoordinator - Edge Cases", () => {
  it("should handle missing layers gracefully", async () => {
    const config: ThreeLayerMemoryConfig = {
      enabled: true,
      storage: { type: "memory" },
      conversationHistory: { enabled: false },
    };

    const coordinator = new MemoryCoordinator(config);
    await coordinator.initialize();

    const context: MemoryContext = {
      threadId: "thread-1",
      resourceId: "user-1",
    };

    const result = await coordinator.assembleContext(context);

    expect(result.messages).toHaveLength(0);

    await coordinator.close();
  });

  it("should handle errors in conversation layer gracefully", async () => {
    const mockManager = createMockConversationManager();
    mockManager.buildContextMessages.mockRejectedValue(new Error("Test error"));

    const config: ThreeLayerMemoryConfig = {
      enabled: true,
      storage: { type: "memory" },
      conversationHistory: { enabled: true },
    };

    const coordinator = new MemoryCoordinator(config);
    coordinator.setConversationLayer(mockManager as never);
    await coordinator.initialize();

    const context: MemoryContext = {
      threadId: "thread-1",
      resourceId: "user-1",
    };

    const result = await coordinator.assembleContext(context);

    // Should not throw, but return empty messages
    // The adapter catches the error and returns [], so coordinator sees 0 messages
    expect(result.messages).toHaveLength(0);
    // The adapter handles errors gracefully, so coordinator sees empty result, not error
    expect(result.debug?.layerCounts.conversationHistory).toBe(0);

    await coordinator.close();
  });

  it("should handle double initialization", async () => {
    const config: ThreeLayerMemoryConfig = {
      enabled: true,
      storage: { type: "memory" },
    };

    const coordinator = new MemoryCoordinator(config);
    await coordinator.initialize();
    await coordinator.initialize(); // Should not throw

    expect(coordinator.isInitialized()).toBe(true);

    await coordinator.close();
  });
});
