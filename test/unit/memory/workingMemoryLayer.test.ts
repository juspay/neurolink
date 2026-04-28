/**
 * WorkingMemoryLayer Unit Tests
 *
 * Tests for the working memory layer that provides persistent structured storage
 * for user profiles, preferences, and other continuously relevant information.
 *
 * Supports two formats:
 * - Template-based (Markdown): Free-form text with replace semantics
 * - Schema-based (Zod/JSON Schema): Structured JSON with merge semantics
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { WorkingMemoryLayer } from "../../../src/lib/memory/layers/workingMemoryLayer.js";
import type {
  MemoryContext,
  WorkingMemoryStorage,
} from "../../../src/lib/types/memory.js";

// Mock logger
vi.mock("../../../src/lib/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Create mock storage
function createMockStorage(): WorkingMemoryStorage {
  const data = new Map<string, string | Record<string, unknown>>();

  return {
    get: vi.fn(async (resourceId: string, threadId?: string) => {
      const key = threadId ? `${resourceId}:${threadId}` : resourceId;
      return data.get(key) ?? null;
    }),
    set: vi.fn(
      async (
        resourceId: string,
        threadId: string | undefined,
        value: string | Record<string, unknown>,
      ) => {
        const key = threadId ? `${resourceId}:${threadId}` : resourceId;
        data.set(key, value);
      },
    ),
    delete: vi.fn(async (resourceId: string, threadId?: string) => {
      const key = threadId ? `${resourceId}:${threadId}` : resourceId;
      data.delete(key);
    }),
    close: vi.fn(async () => {
      data.clear();
    }),
    // Expose internal data for testing
    _getData: () => data,
  } as WorkingMemoryStorage & {
    _getData: () => Map<string, string | Record<string, unknown>>;
  };
}

describe("WorkingMemoryLayer", () => {
  describe("constructor", () => {
    it("should create layer with template mode by default", () => {
      const storage = createMockStorage();
      const layer = new WorkingMemoryLayer(storage, {
        enabled: true,
        scope: "resource",
      });

      expect(layer.getMode()).toBe("template");
    });

    it("should detect schema mode when Zod schema provided", () => {
      const storage = createMockStorage();
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const layer = new WorkingMemoryLayer(storage, {
        enabled: true,
        schema,
        scope: "resource",
      });

      expect(layer.getMode()).toBe("schema");
    });

    it("should use default template when none provided", () => {
      const storage = createMockStorage();
      const layer = new WorkingMemoryLayer(storage, {
        enabled: true,
        scope: "resource",
      });

      const definition = layer.getDefinition();
      expect(definition.mode).toBe("template");
      expect(typeof definition.definition).toBe("string");
      expect(definition.definition as string).toContain("User Profile");
    });

    it("should use custom template when provided", () => {
      const storage = createMockStorage();
      const customTemplate = "# Custom Template\n- Name: [Unknown]";
      const layer = new WorkingMemoryLayer(storage, {
        enabled: true,
        template: customTemplate,
        scope: "resource",
      });

      const definition = layer.getDefinition();
      expect(definition.definition).toBe(customTemplate);
    });
  });

  describe("template mode", () => {
    let layer: WorkingMemoryLayer;
    let storage: WorkingMemoryStorage & {
      _getData: () => Map<string, string | Record<string, unknown>>;
    };

    beforeEach(() => {
      storage = createMockStorage() as WorkingMemoryStorage & {
        _getData: () => Map<string, string | Record<string, unknown>>;
      };
      layer = new WorkingMemoryLayer(storage, {
        enabled: true,
        mode: "template" as any,
        template: "# User Profile\n- Name: [Unknown]\n- Preferences: [None]",
        scope: "resource",
      });
    });

    it("should store and retrieve string values", async () => {
      const context: MemoryContext = { threadId: "t1", resourceId: "user-1" };
      const newContent =
        "# User Profile\n- Name: Alice\n- Preferences: Dark mode";

      await layer.update(context, newContent);
      const data = await layer.retrieve(context);

      expect(data).toBe(newContent);
    });

    it("should use replace semantics (full content replacement)", async () => {
      const context: MemoryContext = { threadId: "t1", resourceId: "user-1" };

      await layer.update(context, "First content");
      await layer.update(context, "Second content");

      const data = await layer.retrieve(context);
      expect(data).toBe("Second content");
    });

    it("should return default template when no data exists", async () => {
      const context: MemoryContext = { threadId: "t1", resourceId: "user-1" };

      const data = await layer.retrieve(context);

      expect(data).toContain("User Profile");
    });

    it("should isolate data by resource when scope is resource", async () => {
      const context1: MemoryContext = { threadId: "t1", resourceId: "user-1" };
      const context2: MemoryContext = { threadId: "t1", resourceId: "user-2" };

      await layer.update(context1, "User 1 data");
      await layer.update(context2, "User 2 data");

      const data1 = await layer.retrieve(context1);
      const data2 = await layer.retrieve(context2);

      expect(data1).toBe("User 1 data");
      expect(data2).toBe("User 2 data");
    });
  });

  describe("template mode with thread scope", () => {
    let layer: WorkingMemoryLayer;
    let storage: WorkingMemoryStorage;

    beforeEach(() => {
      storage = createMockStorage();
      layer = new WorkingMemoryLayer(storage, {
        enabled: true,
        template: "# Notes",
        scope: "thread",
      });
    });

    it("should isolate data by thread when scope is thread", async () => {
      const context1: MemoryContext = {
        threadId: "thread-1",
        resourceId: "user-1",
      };
      const context2: MemoryContext = {
        threadId: "thread-2",
        resourceId: "user-1",
      };

      await layer.update(context1, "Thread 1 notes");
      await layer.update(context2, "Thread 2 notes");

      const data1 = await layer.retrieve(context1);
      const data2 = await layer.retrieve(context2);

      expect(data1).toBe("Thread 1 notes");
      expect(data2).toBe("Thread 2 notes");
    });
  });

  describe("schema mode", () => {
    let layer: WorkingMemoryLayer;
    let storage: WorkingMemoryStorage;

    const userSchema = z.object({
      name: z.string(),
      age: z.number(),
      preferences: z
        .object({
          theme: z.string(),
          notifications: z.boolean(),
        })
        .optional(),
    });

    beforeEach(() => {
      storage = createMockStorage();
      layer = new WorkingMemoryLayer(storage, {
        enabled: true,
        schema: userSchema,
        scope: "resource",
      });
    });

    it("should store and retrieve object values", async () => {
      const context: MemoryContext = { threadId: "t1", resourceId: "user-1" };
      const userData = { name: "Alice", age: 30 };

      await layer.update(context, userData);
      const data = await layer.retrieve(context);

      expect(data).toEqual(userData);
    });

    it("should use merge semantics (deep merge with existing data)", async () => {
      const context: MemoryContext = { threadId: "t1", resourceId: "user-1" };

      await layer.update(context, { name: "Bob", age: 25 });
      await layer.update(context, { age: 30 });

      const data = await layer.retrieve(context);
      expect(data).toEqual({ name: "Bob", age: 30 });
    });

    it("should deep merge nested objects", async () => {
      const context: MemoryContext = { threadId: "t1", resourceId: "user-1" };

      await layer.update(context, {
        name: "Charlie",
        age: 28,
        preferences: { theme: "dark", notifications: true },
      });
      await layer.update(context, {
        name: "Charlie",
        age: 28,
        preferences: { theme: "light", notifications: true },
      });

      const data = (await layer.retrieve(context)) as Record<string, unknown>;
      expect(data.preferences).toEqual({ theme: "light", notifications: true });
    });

    it("should validate data against schema on update", async () => {
      const context: MemoryContext = { threadId: "t1", resourceId: "user-1" };
      const invalidData = { name: 123, age: "invalid" }; // Invalid types

      await expect(layer.update(context, invalidData as any)).rejects.toThrow();
    });

    it("should return empty object when no data exists", async () => {
      const context: MemoryContext = { threadId: "t1", resourceId: "user-1" };

      const data = await layer.retrieve(context);

      expect(data).toEqual({});
    });
  });

  describe("disabled mode", () => {
    it("should return null when disabled", async () => {
      const storage = createMockStorage();
      const layer = new WorkingMemoryLayer(storage, {
        enabled: false,
        scope: "resource",
      });

      const context: MemoryContext = { threadId: "t1", resourceId: "user-1" };
      const data = await layer.retrieve(context);

      expect(data).toBeNull();
    });

    it("should not store when disabled", async () => {
      const storage = createMockStorage();
      const layer = new WorkingMemoryLayer(storage, {
        enabled: false,
        scope: "resource",
      });

      const context: MemoryContext = { threadId: "t1", resourceId: "user-1" };
      await layer.update(context, "Some data");

      expect(storage.set).not.toHaveBeenCalled();
    });
  });

  describe("clear", () => {
    it("should clear data for context", async () => {
      const storage = createMockStorage();
      const layer = new WorkingMemoryLayer(storage, {
        enabled: true,
        scope: "resource",
      });

      const context: MemoryContext = { threadId: "t1", resourceId: "user-1" };
      await layer.update(context, "Some data");
      await layer.clear(context);

      expect(storage.delete).toHaveBeenCalled();
    });
  });

  describe("getUpdateInstructions", () => {
    it("should return default update instructions", () => {
      const storage = createMockStorage();
      const layer = new WorkingMemoryLayer(storage, {
        enabled: true,
        scope: "resource",
      });

      const instructions = layer.getUpdateInstructions();

      expect(instructions).toContain("updateWorkingMemory");
    });

    it("should return custom update instructions when provided", () => {
      const storage = createMockStorage();
      const customInstructions = "Custom instructions for updating memory";
      const layer = new WorkingMemoryLayer(storage, {
        enabled: true,
        scope: "resource",
        updateInstructions: customInstructions,
      });

      const instructions = layer.getUpdateInstructions();

      expect(instructions).toBe(customInstructions);
    });
  });

  describe("getDefinition", () => {
    it("should return template definition in template mode", () => {
      const storage = createMockStorage();
      const template = "# My Template";
      const layer = new WorkingMemoryLayer(storage, {
        enabled: true,
        template,
        scope: "resource",
      });

      const definition = layer.getDefinition();

      expect(definition.mode).toBe("template");
      expect(definition.definition).toBe(template);
    });

    it("should return JSON schema definition in schema mode", () => {
      const storage = createMockStorage();
      const schema = z.object({
        name: z.string(),
        count: z.number(),
      });
      const layer = new WorkingMemoryLayer(storage, {
        enabled: true,
        schema,
        scope: "resource",
      });

      const definition = layer.getDefinition();

      expect(definition.mode).toBe("schema");
      expect(typeof definition.definition).toBe("object");
      expect((definition.definition as any).type).toBe("object");
      expect((definition.definition as any).properties).toBeDefined();
    });
  });

  describe("formatForPrompt", () => {
    it("should return empty string for null data", () => {
      const storage = createMockStorage();
      const layer = new WorkingMemoryLayer(storage, {
        enabled: true,
        scope: "resource",
      });

      const result = layer.formatForPrompt(null);

      expect(result).toBe("");
    });

    it("should format string data with header", () => {
      const storage = createMockStorage();
      const layer = new WorkingMemoryLayer(storage, {
        enabled: true,
        scope: "resource",
      });

      const result = layer.formatForPrompt("# User Data\n- Name: Alice");

      expect(result).toContain("## Working Memory");
      expect(result).toContain("# User Data");
      expect(result).toContain("Name: Alice");
    });

    it("should format object data as JSON", () => {
      const storage = createMockStorage();
      const layer = new WorkingMemoryLayer(storage, {
        enabled: true,
        scope: "resource",
      });

      const result = layer.formatForPrompt({ name: "Alice", age: 30 });

      expect(result).toContain("## Working Memory");
      expect(result).toContain("```json");
      expect(result).toContain('"name": "Alice"');
      expect(result).toContain('"age": 30');
    });
  });

  describe("close", () => {
    it("should close storage", async () => {
      const storage = createMockStorage();
      const layer = new WorkingMemoryLayer(storage, {
        enabled: true,
        scope: "resource",
      });

      await layer.close();

      expect(storage.close).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should return null when storage.get throws", async () => {
      const storage = createMockStorage();
      (storage.get as any).mockRejectedValueOnce(new Error("Storage error"));

      const layer = new WorkingMemoryLayer(storage, {
        enabled: true,
        scope: "resource",
      });

      const context: MemoryContext = { threadId: "t1", resourceId: "user-1" };
      const data = await layer.retrieve(context);

      expect(data).toBeNull();
    });

    it("should throw when storage.set throws", async () => {
      const storage = createMockStorage();
      (storage.set as any).mockRejectedValueOnce(new Error("Storage error"));

      const layer = new WorkingMemoryLayer(storage, {
        enabled: true,
        scope: "resource",
      });

      const context: MemoryContext = { threadId: "t1", resourceId: "user-1" };

      await expect(layer.update(context, "data")).rejects.toThrow(
        "Storage error",
      );
    });
  });
});
