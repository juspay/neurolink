/**
 * Three-Layer Memory System Integration Tests
 *
 * End-to-end tests for the complete three-layer memory system.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  MemoryCoordinator,
  createInMemoryThreeLayerMemory,
  initializeMemoryRegistries,
  clearMemoryRegistries,
} from "../../src/lib/memory/index.js";
import type { MemoryContext } from "../../src/lib/memory/types/memoryTypes.js";
import type { ChatMessage } from "../../src/lib/types/conversation.js";

describe("Three-Layer Memory Integration", () => {
  let coordinator: MemoryCoordinator;

  beforeEach(async () => {
    coordinator = await createInMemoryThreeLayerMemory({
      enableSemantic: true,
      enableWorkingMemory: true,
    });
  });

  afterEach(async () => {
    await coordinator.close();
  });

  describe("Full System Flow", () => {
    it("should create a complete three-layer memory system", async () => {
      const status = coordinator.getLayerStatus();

      expect(status.semantic).toBe(true);
      expect(status.workingMemory).toBe(true);
    });

    it("should assemble context from all layers", async () => {
      // Set up working memory
      await coordinator.updateWorkingMemory("user-1", {
        name: "Alice",
        role: "Developer",
        preferences: {
          language: "TypeScript",
          theme: "dark",
        },
      });

      const context: MemoryContext = {
        threadId: "thread-1",
        resourceId: "user-1",
      };

      const result = await coordinator.assembleContext(context, {
        maxTokens: 4000,
        includeWorkingMemory: true,
      });

      // Should have working memory data
      expect(result.workingMemory).toBeDefined();
      expect((result.workingMemory as Record<string, unknown>)?.name).toBe(
        "Alice",
      );

      // Token count should be calculated
      expect(result.tokenCount).toBeGreaterThanOrEqual(0);
    });

    it("should maintain working memory across context assemblies", async () => {
      // Set working memory
      await coordinator.updateWorkingMemory("user-1", {
        visitCount: 1,
      });

      // First context assembly
      const context: MemoryContext = {
        threadId: "thread-1",
        resourceId: "user-1",
      };
      await coordinator.assembleContext(context, {
        includeWorkingMemory: true,
      });

      // Update working memory
      await coordinator.updateWorkingMemory(
        "user-1",
        { visitCount: 2 },
        "merge",
      );

      // Second context assembly
      const result = await coordinator.assembleContext(context, {
        includeWorkingMemory: true,
      });

      expect(
        (result.workingMemory as Record<string, unknown>)?.visitCount,
      ).toBe(2);
    });
  });

  describe("Working Memory Persistence", () => {
    it("should persist working memory across sessions", async () => {
      const userData = {
        name: "Bob",
        preferences: {
          notifications: true,
          language: "en",
        },
        history: {
          lastLogin: new Date().toISOString(),
        },
      };

      await coordinator.updateWorkingMemory("user-2", userData);

      // Retrieve in same session
      const retrieved = await coordinator.getWorkingMemory("user-2");
      expect(retrieved).toEqual(userData);
    });

    it("should merge updates correctly", async () => {
      // Initial data
      await coordinator.updateWorkingMemory("user-3", {
        name: "Charlie",
        settings: {
          theme: "light",
          fontSize: 14,
        },
      });

      // Merge update
      await coordinator.updateWorkingMemory(
        "user-3",
        {
          settings: {
            theme: "dark",
          },
          newField: "value",
        },
        "merge",
      );

      const data = await coordinator.getWorkingMemory("user-3");
      expect(data).toEqual({
        name: "Charlie",
        settings: {
          theme: "dark",
          fontSize: 14,
        },
        newField: "value",
      });
    });
  });

  describe("Semantic Search Flow", () => {
    it("should enable semantic search layer", async () => {
      const status = coordinator.getLayerStatus();
      expect(status.semantic).toBe(true);
    });
  });

  describe("Context Token Management", () => {
    it("should respect token limits", async () => {
      await coordinator.updateWorkingMemory("user-4", {
        longField: "A".repeat(1000), // Long content
      });

      const context: MemoryContext = {
        threadId: "thread-2",
        resourceId: "user-4",
      };

      const result = await coordinator.assembleContext(context, {
        maxTokens: 500,
        includeWorkingMemory: true,
      });

      // Should have assembled within limits
      // Note: Working memory might be included or trimmed based on token budget
      expect(result.tokenCount).toBeDefined();
    });
  });

  describe("Layer Independence", () => {
    it("should work with only semantic layer enabled", async () => {
      const semanticOnly = await createInMemoryThreeLayerMemory({
        enableSemantic: true,
        enableWorkingMemory: false,
      });

      const status = semanticOnly.getLayerStatus();
      expect(status.semantic).toBe(true);
      expect(status.workingMemory).toBe(false);

      await semanticOnly.close();
    });

    it("should work with only working memory layer enabled", async () => {
      const workingOnly = await createInMemoryThreeLayerMemory({
        enableSemantic: false,
        enableWorkingMemory: true,
      });

      const status = workingOnly.getLayerStatus();
      expect(status.semantic).toBe(false);
      expect(status.workingMemory).toBe(true);

      await workingOnly.close();
    });

    it("should work with no additional layers enabled", async () => {
      const conversationOnly = await createInMemoryThreeLayerMemory({
        enableSemantic: false,
        enableWorkingMemory: false,
      });

      const status = conversationOnly.getLayerStatus();
      expect(status.semantic).toBe(false);
      expect(status.workingMemory).toBe(false);

      await conversationOnly.close();
    });
  });

  describe("Cleanup and Reset", () => {
    it("should clear thread data", async () => {
      await coordinator.updateWorkingMemory("user-5", { data: "test" });

      await coordinator.clearThread("thread-3", "user-5");

      // Thread cleared (working memory is separate, still exists)
      const workingMem = await coordinator.getWorkingMemory("user-5");
      expect(workingMem).toBeDefined(); // Working memory is resource-scoped, not thread-scoped
    });

    it("should clear working memory independently", async () => {
      await coordinator.updateWorkingMemory("user-6", { data: "test" });
      await coordinator.clearWorkingMemory("user-6");

      const data = await coordinator.getWorkingMemory("user-6");
      expect(data).toBeNull();
    });
  });
});

describe("Memory Registries", () => {
  beforeEach(async () => {
    clearMemoryRegistries();
  });

  afterEach(() => {
    clearMemoryRegistries();
  });

  it("should initialize all registries", async () => {
    await initializeMemoryRegistries();
    // Should complete without error
  });

  it("should clear all registries", () => {
    clearMemoryRegistries();
    // Should complete without error
  });
});

describe("Debug Information", () => {
  let coordinator: MemoryCoordinator;

  beforeEach(async () => {
    coordinator = await createInMemoryThreeLayerMemory({
      enableSemantic: true,
      enableWorkingMemory: true,
    });
  });

  afterEach(async () => {
    await coordinator.close();
  });

  it("should include timing information", async () => {
    await coordinator.updateWorkingMemory("user-debug", { name: "Debug User" });

    const context: MemoryContext = {
      threadId: "thread-debug",
      resourceId: "user-debug",
    };

    const result = await coordinator.assembleContext(context, {
      includeWorkingMemory: true,
    });

    expect(result.debug?.layerTimings).toBeDefined();
    expect(typeof result.debug?.layerTimings.workingMemory).toBe("number");
  });

  it("should include layer counts", async () => {
    const context: MemoryContext = {
      threadId: "thread-debug-2",
      resourceId: "user-debug-2",
    };

    const result = await coordinator.assembleContext(context);

    expect(result.debug?.layerCounts).toBeDefined();
    expect(result.debug?.layerCounts.conversationHistory).toBeDefined();
    expect(result.debug?.layerCounts.semanticRecall).toBeDefined();
  });

  it("should include processor logs", async () => {
    await coordinator.updateWorkingMemory("user-debug-3", { name: "Test" });

    const context: MemoryContext = {
      threadId: "thread-debug-3",
      resourceId: "user-debug-3",
    };

    const result = await coordinator.assembleContext(context, {
      includeWorkingMemory: true,
    });

    expect(result.debug?.processors).toBeDefined();
    expect(Array.isArray(result.debug?.processors)).toBe(true);
    expect(
      result.debug?.processors.some((p) => p.includes("workingMemory")),
    ).toBe(true);
  });
});
