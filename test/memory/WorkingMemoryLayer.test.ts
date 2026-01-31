/**
 * Working Memory Layer Tests
 *
 * Comprehensive test suite for the WorkingMemoryLayer class.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  WorkingMemoryLayerImpl,
  InMemoryWorkingMemoryStorage,
  createInMemoryWorkingMemoryLayer,
} from "../../src/lib/memory/layers/WorkingMemoryLayerImpl.js";
import type { WorkingMemoryConfig } from "../../src/lib/memory/types/memoryTypes.js";

describe("WorkingMemoryLayer", () => {
  let workingMemoryLayer: WorkingMemoryLayerImpl;
  let storage: InMemoryWorkingMemoryStorage;

  const defaultConfig: WorkingMemoryConfig = {
    enabled: true,
    scope: "resource",
    maxTokens: 4096,
  };

  beforeEach(async () => {
    storage = new InMemoryWorkingMemoryStorage();
    workingMemoryLayer = new WorkingMemoryLayerImpl(storage, defaultConfig);
    await workingMemoryLayer.initialize();
  });

  afterEach(async () => {
    await workingMemoryLayer.close();
  });

  describe("Initialization", () => {
    it("should initialize successfully", async () => {
      const layer = createInMemoryWorkingMemoryLayer();
      await layer.initialize();

      expect(layer.isEnabled()).toBe(true);
      expect(layer.getLayerType()).toBe("working");

      await layer.close();
    });

    it("should return working as layer type", () => {
      expect(workingMemoryLayer.getLayerType()).toBe("working");
    });

    it("should be disabled when config.enabled is false", async () => {
      const disabledConfig = { ...defaultConfig, enabled: false };
      const layer = new WorkingMemoryLayerImpl(
        new InMemoryWorkingMemoryStorage(),
        disabledConfig,
      );
      await layer.initialize();

      expect(layer.isEnabled()).toBe(false);

      await layer.close();
    });
  });

  describe("Template Mode", () => {
    it("should store template content", async () => {
      const template =
        "# User Profile\n\nName: {{name}}\nPreferences: {{preferences}}";

      await workingMemoryLayer.set("user-1", template);
      const data = await workingMemoryLayer.get("user-1");

      expect(data).not.toBeNull();
      expect(data?.mode).toBe("template");
      expect(data?.template).toBe(template);
    });

    it("should render template with variables", async () => {
      const template = "Hello, {{name}}! Your preference is {{preference}}.";
      await workingMemoryLayer.set("user-1", template);

      const rendered = await workingMemoryLayer.render("user-1", {
        name: "Alice",
        preference: "dark mode",
      });

      expect(rendered).toBe("Hello, Alice! Your preference is dark mode.");
    });

    it("should replace content on subsequent set", async () => {
      await workingMemoryLayer.set("user-1", "First content");
      await workingMemoryLayer.set("user-1", "Second content");

      const data = await workingMemoryLayer.get("user-1");
      expect(data?.template).toBe("Second content");
    });

    it("should track token count for template", async () => {
      const template = "This is a test template with some content.";
      await workingMemoryLayer.set("user-1", template);

      const tokenCount = await workingMemoryLayer.getTokenCount("user-1");
      expect(tokenCount).toBeGreaterThan(0);
    });
  });

  describe("Schema Mode", () => {
    it("should store schema data", async () => {
      const schemaData = {
        name: "Alice",
        age: 30,
        preferences: {
          theme: "dark",
          language: "en",
        },
      };

      await workingMemoryLayer.set("user-1", schemaData);
      const data = await workingMemoryLayer.get("user-1");

      expect(data).not.toBeNull();
      expect(data?.mode).toBe("schema");
      expect(data?.schemaData).toEqual(schemaData);
    });

    it("should merge schema data", async () => {
      const initial = {
        name: "Alice",
        age: 30,
        role: "user",
      };
      const update = {
        role: "admin",
        department: "Engineering",
      };

      await workingMemoryLayer.set("user-1", initial);
      await workingMemoryLayer.merge("user-1", update);

      const data = await workingMemoryLayer.get("user-1");
      expect(data?.schemaData).toEqual({
        name: "Alice",
        age: 30,
        role: "admin",
        department: "Engineering",
      });
    });

    it("should deep merge nested objects", async () => {
      const initial = {
        user: {
          name: "Alice",
          settings: {
            theme: "light",
            notifications: true,
          },
        },
      };
      const update = {
        user: {
          settings: {
            theme: "dark",
          },
        },
      };

      await workingMemoryLayer.set("user-1", initial);
      await workingMemoryLayer.merge("user-1", update);

      const data = await workingMemoryLayer.get("user-1");
      expect(data?.schemaData).toEqual({
        user: {
          name: "Alice",
          settings: {
            theme: "dark",
            notifications: true,
          },
        },
      });
    });

    it("should render schema data as readable text", async () => {
      const schemaData = {
        name: "Alice",
        age: 30,
        skills: ["TypeScript", "Python"],
      };

      await workingMemoryLayer.set("user-1", schemaData);
      const rendered = await workingMemoryLayer.render("user-1");

      expect(rendered).toContain("name: Alice");
      expect(rendered).toContain("age: 30");
      expect(rendered).toContain("skills:");
      expect(rendered).toContain("TypeScript");
      expect(rendered).toContain("Python");
    });
  });

  describe("Token Limits", () => {
    it("should reject content exceeding max tokens", async () => {
      const config: WorkingMemoryConfig = {
        enabled: true,
        maxTokens: 10, // Very low limit
      };
      const layer = new WorkingMemoryLayerImpl(
        new InMemoryWorkingMemoryStorage(),
        config,
      );
      await layer.initialize();

      const longContent =
        "This is a very long content that exceeds the token limit for testing purposes.";

      await expect(layer.set("user-1", longContent)).rejects.toThrow(
        /exceeds maximum token limit/,
      );

      await layer.close();
    });

    it("should reject merged content exceeding max tokens", async () => {
      const config: WorkingMemoryConfig = {
        enabled: true,
        maxTokens: 20, // Very low limit (20 tokens ~ 80 characters)
      };
      const layer = new WorkingMemoryLayerImpl(
        new InMemoryWorkingMemoryStorage(),
        config,
      );
      await layer.initialize();

      await layer.set("user-1", { key1: "short" });

      // This content when merged will exceed 20 tokens (80 chars)
      const largeUpdate = {
        key2: "This is a very long string that definitely exceeds the very small token limit we set for testing purposes",
        key3: "Another field with lots of content to ensure we go over the limit",
      };

      await expect(layer.merge("user-1", largeUpdate)).rejects.toThrow(
        /exceeds maximum token limit/,
      );

      await layer.close();
    });
  });

  describe("Clearing Data", () => {
    it("should clear working memory for a resource", async () => {
      await workingMemoryLayer.set("user-1", "Some content");
      await workingMemoryLayer.set("user-2", "Other content");

      const result = await workingMemoryLayer.clear("user-1");
      expect(result).toBe(true);

      const data1 = await workingMemoryLayer.get("user-1");
      const data2 = await workingMemoryLayer.get("user-2");

      expect(data1).toBeNull();
      expect(data2).not.toBeNull();
    });

    it("should return false when clearing non-existent resource", async () => {
      const result = await workingMemoryLayer.clear("non-existent");
      expect(result).toBe(false);
    });
  });

  describe("Resource Listing", () => {
    it("should list all resources with working memory", async () => {
      await workingMemoryLayer.set("user-1", "Content 1");
      await workingMemoryLayer.set("user-2", "Content 2");
      await workingMemoryLayer.set("user-3", "Content 3");

      const resources = await workingMemoryLayer.listResources();

      expect(resources).toHaveLength(3);
      expect(resources).toContain("user-1");
      expect(resources).toContain("user-2");
      expect(resources).toContain("user-3");
    });
  });

  describe("Get Mode", () => {
    it("should return template mode when template is configured", async () => {
      const config: WorkingMemoryConfig = {
        enabled: true,
        template: "# Template",
      };
      const layer = new WorkingMemoryLayerImpl(
        new InMemoryWorkingMemoryStorage(),
        config,
      );
      await layer.initialize();

      expect(layer.getMode()).toBe("template");

      await layer.close();
    });

    it("should return schema mode when schema is configured", async () => {
      const config: WorkingMemoryConfig = {
        enabled: true,
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
          },
        },
      };
      const layer = new WorkingMemoryLayerImpl(
        new InMemoryWorkingMemoryStorage(),
        config,
      );
      await layer.initialize();

      expect(layer.getMode()).toBe("schema");

      await layer.close();
    });
  });

  describe("Disabled Layer", () => {
    let disabledLayer: WorkingMemoryLayerImpl;

    beforeEach(async () => {
      disabledLayer = new WorkingMemoryLayerImpl(
        new InMemoryWorkingMemoryStorage(),
        { enabled: false },
      );
      await disabledLayer.initialize();
    });

    afterEach(async () => {
      await disabledLayer.close();
    });

    it("should return null on get when disabled", async () => {
      const data = await disabledLayer.get("user-1");
      expect(data).toBeNull();
    });

    it("should no-op on set when disabled", async () => {
      await disabledLayer.set("user-1", "content");
      // Should not throw
    });

    it("should return false on clear when disabled", async () => {
      const result = await disabledLayer.clear("user-1");
      expect(result).toBe(false);
    });

    it("should return empty string on render when disabled", async () => {
      const rendered = await disabledLayer.render("user-1");
      expect(rendered).toBe("");
    });
  });

  describe("Factory Functions", () => {
    it("should create in-memory layer with default config", async () => {
      const layer = createInMemoryWorkingMemoryLayer();
      await layer.initialize();

      expect(layer.isEnabled()).toBe(true);
      expect(layer.getLayerType()).toBe("working");

      await layer.close();
    });

    it("should create in-memory layer with custom config", async () => {
      const layer = createInMemoryWorkingMemoryLayer({
        maxTokens: 8192,
        template: "Custom template",
      });
      await layer.initialize();

      expect(layer.getMode()).toBe("template");

      await layer.close();
    });
  });
});

describe("InMemoryWorkingMemoryStorage", () => {
  let storage: InMemoryWorkingMemoryStorage;

  beforeEach(async () => {
    storage = new InMemoryWorkingMemoryStorage();
    await storage.initialize();
  });

  afterEach(async () => {
    await storage.close();
  });

  it("should store and retrieve data", async () => {
    const data = {
      resourceId: "user-1",
      mode: "template" as const,
      template: "Hello",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await storage.set("user-1", data);
    const retrieved = await storage.get("user-1");

    expect(retrieved).toEqual(data);
  });

  it("should return null for non-existent key", async () => {
    const data = await storage.get("non-existent");
    expect(data).toBeNull();
  });

  it("should delete data", async () => {
    await storage.set("user-1", {
      resourceId: "user-1",
      mode: "template",
      template: "Hello",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const deleted = await storage.delete("user-1");
    expect(deleted).toBe(true);

    const data = await storage.get("user-1");
    expect(data).toBeNull();
  });

  it("should return false when deleting non-existent key", async () => {
    const deleted = await storage.delete("non-existent");
    expect(deleted).toBe(false);
  });

  it("should list all keys", async () => {
    await storage.set("user-1", {
      resourceId: "user-1",
      mode: "template",
      template: "Hello",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await storage.set("user-2", {
      resourceId: "user-2",
      mode: "template",
      template: "World",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const keys = await storage.list();
    expect(keys).toHaveLength(2);
    expect(keys).toContain("user-1");
    expect(keys).toContain("user-2");
  });
});
