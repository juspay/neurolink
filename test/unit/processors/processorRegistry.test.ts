/**
 * ProcessorRegistry Unit Tests
 *
 * Tests for the central file processor registry:
 * - Registration by MIME type and name
 * - Priority ordering (lower number = higher priority)
 * - Lookup for known and unknown MIME types
 * - canProcess / isSupported delegation
 * - Alias support
 * - Duplicate handling and overwrite behavior
 * - Unregister and clear operations
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProcessorRegistry } from "../../../src/lib/processors/registry/ProcessorRegistry.js";
import type { ProcessedFileBase } from "../../../src/lib/processors/base/types.js";
import type { BaseFileProcessor } from "../../../src/lib/processors/base/BaseFileProcessor.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a minimal mock processor that satisfies BaseFileProcessor shape */
function createMockProcessor(opts: {
  mimeTypes?: string[];
  extensions?: string[];
  supported?: boolean;
}): BaseFileProcessor<ProcessedFileBase> {
  const { mimeTypes = [], extensions = [], supported = true } = opts;
  return {
    getConfig: () => ({
      maxSizeMB: 10,
      timeoutMs: 30000,
      supportedMimeTypes: mimeTypes,
      supportedExtensions: extensions,
      fileTypeName: "mock",
      defaultFilename: "mock.txt",
    }),
    isFileSupported: () => supported,
    processFile: vi.fn(),
  } as unknown as BaseFileProcessor<ProcessedFileBase>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ProcessorRegistry", () => {
  let registry: ProcessorRegistry;

  beforeEach(() => {
    ProcessorRegistry.resetInstance();
    registry = ProcessorRegistry.getInstance();
  });

  afterEach(() => {
    ProcessorRegistry.resetInstance();
  });

  // =========================================================================
  // Singleton behaviour
  // =========================================================================

  describe("singleton", () => {
    it("should return the same instance on repeated calls", () => {
      const a = ProcessorRegistry.getInstance();
      const b = ProcessorRegistry.getInstance();
      expect(a).toBe(b);
    });

    it("should return a fresh instance after resetInstance()", () => {
      const a = ProcessorRegistry.getInstance();
      ProcessorRegistry.resetInstance();
      const b = ProcessorRegistry.getInstance();
      expect(a).not.toBe(b);
    });
  });

  // =========================================================================
  // Registration
  // =========================================================================

  describe("register", () => {
    it("should register a processor by name", () => {
      const proc = createMockProcessor({ mimeTypes: ["text/html"] });
      registry.register({
        name: "html",
        priority: 80,
        processor: proc,
        isSupported: () => true,
      });

      expect(registry.hasProcessor("html")).toBe(true);
      expect(registry.getProcessor("html")).toBeDefined();
    });

    it("should throw on duplicate name when no options provided", () => {
      const proc = createMockProcessor({});
      registry.register({
        name: "dup",
        priority: 10,
        processor: proc,
        isSupported: () => true,
      });
      expect(() =>
        registry.register({
          name: "dup",
          priority: 20,
          processor: proc,
          isSupported: () => true,
        }),
      ).toThrow(/already registered/);
    });

    it("should silently ignore duplicate when allowDuplicates is true", () => {
      const proc1 = createMockProcessor({});
      const proc2 = createMockProcessor({});
      registry.register({
        name: "dup",
        priority: 10,
        processor: proc1,
        isSupported: () => true,
      });
      registry.register(
        {
          name: "dup",
          priority: 20,
          processor: proc2,
          isSupported: () => true,
        },
        { allowDuplicates: true },
      );
      // Original should remain (priority 10)
      expect(registry.getProcessor("dup")?.priority).toBe(10);
    });

    it("should overwrite when overwriteExisting is true", () => {
      const proc1 = createMockProcessor({});
      const proc2 = createMockProcessor({});
      registry.register({
        name: "ow",
        priority: 10,
        processor: proc1,
        isSupported: () => true,
      });
      registry.register(
        { name: "ow", priority: 99, processor: proc2, isSupported: () => true },
        { overwriteExisting: true },
      );
      expect(registry.getProcessor("ow")?.priority).toBe(99);
    });

    it("should validate required fields", () => {
      const proc = createMockProcessor({});
      expect(() =>
        registry.register({
          name: "",
          priority: 10,
          processor: proc,
          isSupported: () => true,
        }),
      ).toThrow(/name is required/);

      expect(() =>
        registry.register({
          name: "valid",
          priority: undefined as unknown as number,
          processor: proc,
          isSupported: () => true,
        }),
      ).toThrow(/priority must be a number/);

      expect(() =>
        registry.register({
          name: "valid",
          priority: 10,
          processor: null as unknown as BaseFileProcessor<ProcessedFileBase>,
          isSupported: () => true,
        }),
      ).toThrow(/Processor instance is required/);

      expect(() =>
        registry.register({
          name: "valid",
          priority: 10,
          processor: proc,
          isSupported: null as unknown as () => boolean,
        }),
      ).toThrow(/isSupported function is required/);
    });

    it("should register aliases", () => {
      const proc = createMockProcessor({});
      registry.register({
        name: "markdown",
        priority: 40,
        processor: proc,
        isSupported: () => true,
        aliases: ["md", "mdx"],
      });
      expect(registry.hasProcessor("md")).toBe(true);
      expect(registry.hasProcessor("mdx")).toBe(true);
      expect(registry.getProcessor("md")?.name).toBe("markdown");
    });

    it("should normalize names to lowercase", () => {
      const proc = createMockProcessor({});
      registry.register({
        name: "HTML",
        priority: 80,
        processor: proc,
        isSupported: () => true,
      });
      expect(registry.hasProcessor("html")).toBe(true);
      expect(registry.hasProcessor("HTML")).toBe(true);
    });
  });

  // =========================================================================
  // Lookup
  // =========================================================================

  describe("findProcessor", () => {
    it("should return null when no processors are registered", () => {
      const match = registry.findProcessor("text/html", "page.html");
      expect(match).toBeNull();
    });

    it("should return the matching processor when isSupported returns true", () => {
      const proc = createMockProcessor({
        mimeTypes: ["text/html"],
        extensions: [".html"],
      });
      registry.register({
        name: "html",
        priority: 80,
        processor: proc,
        isSupported: (mime) => mime === "text/html",
      });
      const match = registry.findProcessor("text/html", "page.html");
      expect(match).not.toBeNull();
      expect(match!.name).toBe("html");
    });

    it("should return null when no processor matches the MIME type", () => {
      const proc = createMockProcessor({ mimeTypes: ["text/html"] });
      registry.register({
        name: "html",
        priority: 80,
        processor: proc,
        isSupported: (mime) => mime === "text/html",
      });
      const match = registry.findProcessor("application/pdf", "doc.pdf");
      expect(match).toBeNull();
    });
  });

  // =========================================================================
  // Priority ordering
  // =========================================================================

  describe("priority ordering", () => {
    it("should return processors sorted by priority (ascending)", () => {
      const lowPriority = createMockProcessor({ mimeTypes: ["text/plain"] });
      const highPriority = createMockProcessor({ mimeTypes: ["text/plain"] });

      registry.register({
        name: "generic-text",
        priority: 110,
        processor: lowPriority,
        isSupported: () => true,
      });
      registry.register({
        name: "markdown",
        priority: 40,
        processor: highPriority,
        isSupported: () => true,
      });

      const matches = registry.findAllProcessors("text/plain", "file.txt");
      expect(matches.length).toBe(2);
      expect(matches[0].name).toBe("markdown");
      expect(matches[1].name).toBe("generic-text");
      expect(matches[0].priority).toBeLessThan(matches[1].priority);
    });

    it("should break priority ties by confidence (descending)", () => {
      // Two processors at same priority, one with exact MIME match, one without
      const exactMatch = createMockProcessor({
        mimeTypes: ["text/csv"],
        extensions: [".csv"],
      });
      const genericMatch = createMockProcessor({
        mimeTypes: [],
        extensions: [],
      });

      registry.register({
        name: "csv-exact",
        priority: 30,
        processor: exactMatch,
        isSupported: () => true,
      });
      registry.register({
        name: "csv-generic",
        priority: 30,
        processor: genericMatch,
        isSupported: () => true,
      });

      const matches = registry.findAllProcessors("text/csv", "data.csv");
      expect(matches.length).toBe(2);
      // Exact MIME match should come first due to higher confidence
      expect(matches[0].name).toBe("csv-exact");
      expect(matches[0].confidence).toBeGreaterThan(matches[1].confidence);
    });
  });

  // =========================================================================
  // isSupported delegation
  // =========================================================================

  describe("isSupported delegation", () => {
    it("should delegate to the registered isSupported function", () => {
      const isSupportedSpy = vi.fn().mockReturnValue(true);
      const proc = createMockProcessor({});
      registry.register({
        name: "custom",
        priority: 50,
        processor: proc,
        isSupported: isSupportedSpy,
      });

      registry.findProcessor("application/json", "data.json");

      expect(isSupportedSpy).toHaveBeenCalledWith(
        "application/json",
        "data.json",
      );
    });

    it("should skip processor if isSupported throws", () => {
      const proc = createMockProcessor({});
      registry.register({
        name: "broken",
        priority: 10,
        processor: proc,
        isSupported: () => {
          throw new Error("boom");
        },
      });
      // Should not throw, just skip the broken processor
      const match = registry.findProcessor("text/plain", "test.txt");
      expect(match).toBeNull();
    });
  });

  // =========================================================================
  // Unregister and clear
  // =========================================================================

  describe("unregister", () => {
    it("should remove a processor by name", () => {
      const proc = createMockProcessor({});
      registry.register({
        name: "temp",
        priority: 10,
        processor: proc,
        isSupported: () => true,
        aliases: ["tmp"],
      });
      expect(registry.hasProcessor("temp")).toBe(true);

      const removed = registry.unregister("temp");
      expect(removed).toBe(true);
      expect(registry.hasProcessor("temp")).toBe(false);
      // Aliases should also be removed
      expect(registry.hasProcessor("tmp")).toBe(false);
    });

    it("should return false when unregistering a non-existent processor", () => {
      expect(registry.unregister("nonexistent")).toBe(false);
    });
  });

  describe("clear", () => {
    it("should remove all processors and aliases", () => {
      const proc = createMockProcessor({});
      registry.register({
        name: "a",
        priority: 10,
        processor: proc,
        isSupported: () => true,
        aliases: ["alias-a"],
      });
      registry.register({
        name: "b",
        priority: 20,
        processor: proc,
        isSupported: () => true,
      });

      registry.clear();

      expect(registry.getSupportedTypes()).toHaveLength(0);
      expect(registry.hasProcessor("a")).toBe(false);
      expect(registry.hasProcessor("alias-a")).toBe(false);
      expect(registry.hasProcessor("b")).toBe(false);
      expect(registry.isInitialized()).toBe(false);
    });
  });

  // =========================================================================
  // Utility methods
  // =========================================================================

  describe("utility methods", () => {
    it("listProcessors should return all registrations", () => {
      const proc = createMockProcessor({});
      registry.register({
        name: "x",
        priority: 1,
        processor: proc,
        isSupported: () => true,
      });
      registry.register({
        name: "y",
        priority: 2,
        processor: proc,
        isSupported: () => true,
      });

      const list = registry.listProcessors();
      expect(list).toHaveLength(2);
    });

    it("getSupportedTypes should return processor names", () => {
      const proc = createMockProcessor({});
      registry.register({
        name: "json",
        priority: 50,
        processor: proc,
        isSupported: () => true,
      });
      registry.register({
        name: "yaml",
        priority: 60,
        processor: proc,
        isSupported: () => true,
      });

      const types = registry.getSupportedTypes();
      expect(types).toContain("json");
      expect(types).toContain("yaml");
    });

    it("markInitialized / isInitialized should track state", () => {
      expect(registry.isInitialized()).toBe(false);
      registry.markInitialized();
      expect(registry.isInitialized()).toBe(true);
    });
  });

  // =========================================================================
  // processWithResult
  // =========================================================================

  describe("processWithResult", () => {
    it("should return unsupported error for unknown MIME type", async () => {
      const result = await registry.processWithResult({
        id: "1",
        name: "file.xyz",
        mimetype: "application/x-unknown",
        size: 100,
      });

      expect(result.type).toBe("unsupported");
      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe("NO_PROCESSOR_FOUND");
      expect(result.error!.supportedTypes).toEqual([]);
    });
  });
});
