/**
 * Semantic Memory Layer Tests
 *
 * Comprehensive test suite for the SemanticMemoryLayer class.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  SemanticMemoryLayer,
  InMemoryVectorStore,
  MockEmbedder,
  createInMemorySemanticLayer,
} from "../../src/lib/memory/layers/SemanticMemoryLayer.js";
import type {
  SemanticRecallConfig,
  MemoryContext,
} from "../../src/lib/memory/types/memoryTypes.js";
import type { ChatMessage } from "../../src/lib/types/conversation.js";

describe("SemanticMemoryLayer", () => {
  let semanticLayer: SemanticMemoryLayer;
  let vectorStore: InMemoryVectorStore;
  let embedder: MockEmbedder;

  const defaultConfig: SemanticRecallConfig = {
    enabled: true,
    vectorStore: {
      provider: "memory",
      config: {},
      collectionName: "test_messages",
      metric: "cosine",
    },
    embedder: {
      provider: "ollama",
      model: "mock-embed",
    },
    topK: 3,
    similarityThreshold: 0.0, // Low threshold for mock embeddings
  };

  beforeEach(async () => {
    vectorStore = new InMemoryVectorStore();
    embedder = new MockEmbedder(384, "mock-embed");
    semanticLayer = new SemanticMemoryLayer(
      vectorStore,
      embedder,
      defaultConfig,
    );
    await semanticLayer.initialize();
  });

  afterEach(async () => {
    await semanticLayer.close();
  });

  describe("Initialization", () => {
    it("should initialize successfully", async () => {
      const layer = new SemanticMemoryLayer(
        new InMemoryVectorStore(),
        new MockEmbedder(),
        defaultConfig,
      );
      await layer.initialize();
      expect(layer.isEnabled()).toBe(true);
      expect(layer.getLayerType()).toBe("semantic");
      await layer.close();
    });

    it("should return semantic as layer type", () => {
      expect(semanticLayer.getLayerType()).toBe("semantic");
    });

    it("should be disabled when config.enabled is false", async () => {
      const disabledConfig = { ...defaultConfig, enabled: false };
      const layer = new SemanticMemoryLayer(
        new InMemoryVectorStore(),
        new MockEmbedder(),
        disabledConfig,
      );
      await layer.initialize();
      expect(layer.isEnabled()).toBe(false);
      await layer.close();
    });
  });

  describe("Message Indexing", () => {
    it("should index a single message", async () => {
      const message: ChatMessage = {
        id: "msg-1",
        role: "user",
        content: "Hello, how are you?",
        timestamp: new Date().toISOString(),
      };

      await semanticLayer.indexMessage(message, "thread-1", "user-1");

      const stats = await semanticLayer.getStats();
      expect(stats.vectorCount).toBe(1);
    });

    it("should index multiple messages in batch", async () => {
      const messages: ChatMessage[] = [
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
      ];

      await semanticLayer.indexMessages(messages, "thread-1", "user-1");

      const stats = await semanticLayer.getStats();
      expect(stats.vectorCount).toBe(3);
    });

    it("should skip excluded roles", async () => {
      const messages: ChatMessage[] = [
        {
          id: "msg-1",
          role: "user",
          content: "Hello",
          timestamp: new Date().toISOString(),
        },
        {
          id: "msg-2",
          role: "tool_call",
          content: "Tool call",
          timestamp: new Date().toISOString(),
        },
        {
          id: "msg-3",
          role: "tool_result",
          content: "Tool result",
          timestamp: new Date().toISOString(),
        },
      ];

      await semanticLayer.indexMessages(messages, "thread-1", "user-1");

      const stats = await semanticLayer.getStats();
      expect(stats.vectorCount).toBe(1); // Only user message indexed
    });

    it("should skip empty content", async () => {
      const message: ChatMessage = {
        id: "msg-1",
        role: "user",
        content: "   ", // Whitespace only
        timestamp: new Date().toISOString(),
      };

      await semanticLayer.indexMessage(message, "thread-1", "user-1");

      const stats = await semanticLayer.getStats();
      expect(stats.vectorCount).toBe(0);
    });

    it("should skip indexing when disabled", async () => {
      const disabledConfig = { ...defaultConfig, enabled: false };
      const layer = new SemanticMemoryLayer(
        new InMemoryVectorStore(),
        new MockEmbedder(),
        disabledConfig,
      );
      await layer.initialize();

      const message: ChatMessage = {
        id: "msg-1",
        role: "user",
        content: "Hello",
        timestamp: new Date().toISOString(),
      };

      await layer.indexMessage(message, "thread-1");

      const stats = await layer.getStats();
      expect(stats.vectorCount).toBe(0);
      await layer.close();
    });
  });

  describe("Similarity Search", () => {
    const testMessages: ChatMessage[] = [
      {
        id: "msg-1",
        role: "user",
        content: "I love programming in TypeScript",
        timestamp: new Date().toISOString(),
      },
      {
        id: "msg-2",
        role: "assistant",
        content: "TypeScript is great for type safety",
        timestamp: new Date().toISOString(),
      },
      {
        id: "msg-3",
        role: "user",
        content: "What about Python?",
        timestamp: new Date().toISOString(),
      },
      {
        id: "msg-4",
        role: "assistant",
        content: "Python is excellent for data science",
        timestamp: new Date().toISOString(),
      },
      {
        id: "msg-5",
        role: "user",
        content: "I need help with JavaScript",
        timestamp: new Date().toISOString(),
      },
    ];

    beforeEach(async () => {
      await semanticLayer.indexMessages(testMessages, "thread-1", "user-1");
    });

    it("should search for similar messages", async () => {
      const context: MemoryContext = {
        threadId: "thread-1",
        resourceId: "user-1",
      };

      const matches = await semanticLayer.search(
        "TypeScript programming",
        context,
      );

      expect(matches.length).toBeGreaterThan(0);
      expect(matches.length).toBeLessThanOrEqual(3); // topK is 3
    });

    it("should respect topK limit", async () => {
      const context: MemoryContext = { threadId: "thread-1" };

      const matches = await semanticLayer.search("programming", context, {
        topK: 2,
      });

      expect(matches.length).toBeLessThanOrEqual(2);
    });

    it("should return matches with scores", async () => {
      const context: MemoryContext = { threadId: "thread-1" };

      const matches = await semanticLayer.search("TypeScript", context);

      matches.forEach((match) => {
        expect(match.score).toBeGreaterThanOrEqual(0);
        expect(match.score).toBeLessThanOrEqual(1);
        expect(match.message).toBeDefined();
        expect(match.threadId).toBe("thread-1");
      });
    });

    it("should return empty array when disabled", async () => {
      const disabledConfig = { ...defaultConfig, enabled: false };
      const layer = new SemanticMemoryLayer(
        new InMemoryVectorStore(),
        new MockEmbedder(),
        disabledConfig,
      );
      await layer.initialize();

      const context: MemoryContext = { threadId: "thread-1" };
      const matches = await layer.search("TypeScript", context);

      expect(matches).toHaveLength(0);
      await layer.close();
    });

    it("should filter by thread scope", async () => {
      // Index messages in different threads
      const otherThreadMessages: ChatMessage[] = [
        {
          id: "other-1",
          role: "user",
          content: "TypeScript is my favorite",
          timestamp: new Date().toISOString(),
        },
      ];
      await semanticLayer.indexMessages(
        otherThreadMessages,
        "thread-2",
        "user-1",
      );

      const context: MemoryContext = {
        threadId: "thread-1",
        scope: "thread",
      };

      const matches = await semanticLayer.search("TypeScript", context);

      // Should only return matches from thread-1
      matches.forEach((match) => {
        expect(match.threadId).toBe("thread-1");
      });
    });
  });

  describe("Deletion", () => {
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
        content: "Hi",
        timestamp: new Date().toISOString(),
      },
    ];

    beforeEach(async () => {
      await semanticLayer.indexMessages(testMessages, "thread-1", "user-1");
    });

    it("should delete vectors by thread", async () => {
      const initialStats = await semanticLayer.getStats();
      expect(initialStats.vectorCount).toBe(2);

      const deletedCount = await semanticLayer.deleteThread("thread-1");

      expect(deletedCount).toBe(2);
      const finalStats = await semanticLayer.getStats();
      expect(finalStats.vectorCount).toBe(0);
    });

    it("should delete vectors by resource", async () => {
      const initialStats = await semanticLayer.getStats();
      expect(initialStats.vectorCount).toBe(2);

      const deletedCount = await semanticLayer.deleteResource("user-1");

      expect(deletedCount).toBe(2);
      const finalStats = await semanticLayer.getStats();
      expect(finalStats.vectorCount).toBe(0);
    });
  });

  describe("Circuit Breaker", () => {
    it("should track circuit breaker status", () => {
      const status = semanticLayer.getCircuitBreakerStatus();

      expect(status.state).toBe("closed");
      expect(status.failures).toBe(0);
    });

    it("should reset circuit breaker", async () => {
      semanticLayer.resetCircuitBreaker();
      const status = semanticLayer.getCircuitBreakerStatus();

      expect(status.state).toBe("closed");
      expect(status.failures).toBe(0);
    });
  });

  describe("Factory Function", () => {
    it("should create in-memory semantic layer", async () => {
      const layer = createInMemorySemanticLayer();
      await layer.initialize();

      expect(layer.isEnabled()).toBe(true);
      expect(layer.getLayerType()).toBe("semantic");

      await layer.close();
    });

    it("should create layer with custom config", async () => {
      const layer = createInMemorySemanticLayer({
        topK: 5,
        similarityThreshold: 0.8,
      });
      await layer.initialize();

      expect(layer.isEnabled()).toBe(true);

      await layer.close();
    });
  });
});

describe("InMemoryVectorStore", () => {
  let vectorStore: InMemoryVectorStore;

  beforeEach(async () => {
    vectorStore = new InMemoryVectorStore();
    await vectorStore.initialize();
    await vectorStore.ensureCollection({
      name: "test",
      dimensions: 3,
      metric: "cosine",
    });
  });

  afterEach(async () => {
    await vectorStore.close();
  });

  it("should upsert and search vectors", async () => {
    await vectorStore.upsert([
      {
        id: "1",
        vector: [1, 0, 0],
        metadata: {
          messageId: "1",
          threadId: "t1",
          role: "user",
          timestamp: "",
        },
      },
      {
        id: "2",
        vector: [0, 1, 0],
        metadata: {
          messageId: "2",
          threadId: "t1",
          role: "user",
          timestamp: "",
        },
      },
      {
        id: "3",
        vector: [0, 0, 1],
        metadata: {
          messageId: "3",
          threadId: "t1",
          role: "user",
          timestamp: "",
        },
      },
    ]);

    const results = await vectorStore.search({
      vector: [1, 0, 0],
      topK: 2,
    });

    expect(results.length).toBe(2);
    expect(results[0].id).toBe("1"); // Most similar
    expect(results[0].score).toBeCloseTo(1, 1); // Cosine similarity of identical vectors
  });

  it("should apply threshold filter", async () => {
    await vectorStore.upsert([
      {
        id: "1",
        vector: [1, 0, 0],
        metadata: {
          messageId: "1",
          threadId: "t1",
          role: "user",
          timestamp: "",
        },
      },
      {
        id: "2",
        vector: [0, 1, 0],
        metadata: {
          messageId: "2",
          threadId: "t1",
          role: "user",
          timestamp: "",
        },
      },
    ]);

    const results = await vectorStore.search({
      vector: [1, 0, 0],
      topK: 10,
      threshold: 0.9,
    });

    expect(results.length).toBe(1); // Only the identical vector passes
  });

  it("should filter by thread ID", async () => {
    await vectorStore.upsert([
      {
        id: "1",
        vector: [1, 0, 0],
        metadata: {
          messageId: "1",
          threadId: "t1",
          role: "user",
          timestamp: "",
        },
      },
      {
        id: "2",
        vector: [1, 0, 0],
        metadata: {
          messageId: "2",
          threadId: "t2",
          role: "user",
          timestamp: "",
        },
      },
    ]);

    const results = await vectorStore.search({
      vector: [1, 0, 0],
      topK: 10,
      filter: { threadId: "t1" },
    });

    expect(results.length).toBe(1);
    expect(results[0].metadata.threadId).toBe("t1");
  });

  it("should delete vectors by ID", async () => {
    await vectorStore.upsert([
      {
        id: "1",
        vector: [1, 0, 0],
        metadata: {
          messageId: "1",
          threadId: "t1",
          role: "user",
          timestamp: "",
        },
      },
      {
        id: "2",
        vector: [0, 1, 0],
        metadata: {
          messageId: "2",
          threadId: "t1",
          role: "user",
          timestamp: "",
        },
      },
    ]);

    const deleted = await vectorStore.delete({ ids: ["1"] });
    expect(deleted).toBe(1);

    const stats = await vectorStore.getStats();
    expect(stats.vectorCount).toBe(1);
  });

  it("should get stats", async () => {
    await vectorStore.upsert([
      {
        id: "1",
        vector: [1, 0, 0],
        metadata: {
          messageId: "1",
          threadId: "t1",
          role: "user",
          timestamp: "",
        },
      },
    ]);

    const stats = await vectorStore.getStats();
    expect(stats.vectorCount).toBe(1);
    expect(stats.dimensions).toBe(3);
  });
});

describe("MockEmbedder", () => {
  let embedder: MockEmbedder;

  beforeEach(async () => {
    embedder = new MockEmbedder(128, "mock");
    await embedder.initialize();
  });

  afterEach(async () => {
    await embedder.close();
  });

  it("should return correct dimensions", () => {
    expect(embedder.getDimensions()).toBe(128);
  });

  it("should embed text to correct dimensions", async () => {
    const embedding = await embedder.embed("Hello world");

    expect(embedding).toHaveLength(128);
  });

  it("should batch embed texts", async () => {
    const embeddings = await embedder.embedBatch(["Hello", "World", "Test"]);

    expect(embeddings).toHaveLength(3);
    embeddings.forEach((emb) => {
      expect(emb).toHaveLength(128);
    });
  });

  it("should generate deterministic embeddings", async () => {
    const emb1 = await embedder.embed("Hello");
    const emb2 = await embedder.embed("Hello");

    expect(emb1).toEqual(emb2);
  });

  it("should get model info", () => {
    const info = embedder.getModelInfo();

    expect(info.provider).toBe("ollama");
    expect(info.model).toBe("mock");
    expect(info.dimensions).toBe(128);
    expect(info.maxTokens).toBe(8192);
  });
});
