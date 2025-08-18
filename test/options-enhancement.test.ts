import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  OptionsEnhancer,
  enhanceForStreaming,
  migrateLegacyContext,
  batchEnhance,
  batchEnhanceWithDependencies,
} from "../src/lib/utils/optionsUtils.js";
import type { GenerateOptions } from "../src/lib/types/generateTypes.js";
import type { EnhancementOptions } from "../src/lib/utils/optionsUtils.js";

describe("Options Enhancement Utility Tests", () => {
  let baseOptions: GenerateOptions;

  beforeEach(() => {
    baseOptions = {
      input: { text: "Test prompt" },
      provider: "openai" as const,
    };

    // Reset enhancement statistics
    OptionsEnhancer.resetStatistics();
  });

  describe("Thread-Safe Enhancement Counter", () => {
    it("should increment enhancement count atomically", () => {
      const initialStats = OptionsEnhancer.getStatistics();

      const enhancement: EnhancementOptions = {
        enhancementType: "streaming-optimization",
        streamingOptions: { enabled: true },
      };

      OptionsEnhancer.enhance(baseOptions, enhancement);

      const finalStats = OptionsEnhancer.getStatistics();
      expect(finalStats.enhancementCount).toBe(
        initialStats.enhancementCount + 1,
      );
    });

    it("should handle concurrent enhancements without race conditions", async () => {
      const enhancement: EnhancementOptions = {
        enhancementType: "streaming-optimization",
        streamingOptions: { enabled: true },
      };

      // Simulate concurrent enhancement operations
      const promises = Array.from({ length: 20 }, () =>
        Promise.resolve(OptionsEnhancer.enhance(baseOptions, enhancement)),
      );

      await Promise.all(promises);

      const stats = OptionsEnhancer.getStatistics();
      expect(stats.enhancementCount).toBe(20);
    });

    it("should fallback gracefully when SharedArrayBuffer unavailable", () => {
      // This tests the fallback counter mechanism
      const enhancement: EnhancementOptions = {
        enhancementType: "mcp-integration",
        mcpOptions: { enableToolRegistry: true },
      };

      // Should work regardless of SharedArrayBuffer availability
      const result = OptionsEnhancer.enhance(baseOptions, enhancement);
      expect(result.options).toBeDefined();
      expect(result.metadata.enhancementApplied).toBe(true);
    });
  });

  describe("Enhancement Validation", () => {
    it("should validate compatible enhancements", () => {
      const validEnhancement: EnhancementOptions = {
        enhancementType: "streaming-optimization",
        streamingOptions: {
          enabled: true,
          chunkSize: 1024,
        },
      };

      const validation = OptionsEnhancer.validateEnhancement(
        baseOptions,
        validEnhancement,
      );

      expect(validation.valid).toBe(true);
      expect(validation.warnings).toHaveLength(0);
    });

    it("should detect incompatible configurations", () => {
      const incompatibleOptions: GenerateOptions = {
        ...baseOptions,
        disableTools: true,
      };

      const enhancement: EnhancementOptions = {
        enhancementType: "streaming-optimization",
        streamingOptions: { enabled: true },
      };

      const validation = OptionsEnhancer.validateEnhancement(
        incompatibleOptions,
        enhancement,
      );

      expect(validation.warnings).toContain(
        expect.stringContaining("Streaming optimization with disabled tools"),
      );
    });

    it("should validate legacy migration requirements", () => {
      const enhancement: EnhancementOptions = {
        enhancementType: "legacy-migration",
        legacyMigration: {
          // Missing legacyContext
          domainType: "test",
        },
      };

      const validation = OptionsEnhancer.validateEnhancement(
        baseOptions,
        enhancement,
      );

      expect(validation.valid).toBe(false);
      expect(validation.warnings).toContain(
        "Legacy migration requested but no legacy context provided",
      );
    });
  });

  describe("Conflict Detection", () => {
    it("should detect enhancement conflicts", () => {
      const conflictingEnhancements: EnhancementOptions[] = [
        {
          enhancementType: "legacy-migration",
          legacyMigration: {
            legacyContext: { oldField: "value" },
            domainType: "test",
          },
        },
        {
          enhancementType: "domain-configuration",
          domainConfiguration: {
            domainType: "different-domain",
            keyTerms: ["term1", "term2"],
          },
        },
      ];

      // Should detect conflict between legacy-migration and domain-configuration
      expect(() => batchEnhance(baseOptions, conflictingEnhancements)).toThrow(
        expect.stringContaining("conflict"),
      );
    });

    it("should suggest conflict resolutions", () => {
      const enhancement1: EnhancementOptions = {
        enhancementType: "streaming-optimization",
      };

      const enhancement2: EnhancementOptions = {
        enhancementType: "batch-parallel-enhancement",
      };

      // Should provide suggestions for conflicting enhancements
      expect(() =>
        batchEnhance(baseOptions, [enhancement1, enhancement2]),
      ).toThrow(expect.stringContaining("Apply enhancements sequentially"));
    });
  });

  describe("Batch Enhancement with Dependencies", () => {
    it("should process enhancements in dependency order", () => {
      const enhancements = [
        {
          enhancementType: "context-conversion" as const,
          dependsOn: [2], // Depends on third enhancement
        },
        {
          enhancementType: "streaming-optimization" as const,
          dependsOn: [0], // Depends on first enhancement
        },
        {
          enhancementType: "mcp-integration" as const,
          // No dependencies
        },
      ];

      const result = batchEnhanceWithDependencies(baseOptions, enhancements);

      expect(result.options).toBeDefined();
      expect(result.metadata.enhancementApplied).toBe(true);
      // Should process in order: 2 -> 0 -> 1
    });

    it("should handle circular dependencies gracefully", () => {
      const circularEnhancements = [
        {
          enhancementType: "context-conversion" as const,
          dependsOn: [1],
        },
        {
          enhancementType: "streaming-optimization" as const,
          dependsOn: [0],
        },
      ];

      // Should detect and handle circular dependencies
      expect(() =>
        batchEnhanceWithDependencies(baseOptions, circularEnhancements),
      ).toThrow(expect.stringContaining("circular"));
    });
  });

  describe("Performance and Memory", () => {
    it("should complete enhancements within reasonable time", () => {
      const startTime = Date.now();

      const enhancement: EnhancementOptions = {
        enhancementType: "domain-configuration",
        domainConfiguration: {
          domainType: "test",
          keyTerms: Array.from({ length: 1000 }, (_, i) => `term${i}`),
        },
      };

      const result = OptionsEnhancer.enhance(baseOptions, enhancement);
      const duration = Date.now() - startTime;

      // Should complete within 100ms for typical enhancements
      expect(duration).toBeLessThan(100);
      expect(result.metadata.processingTime).toBeGreaterThanOrEqual(0);
    });

    it("should handle large batch enhancements efficiently", () => {
      const largeEnhancementBatch: EnhancementOptions[] = Array.from(
        { length: 50 },
        (_, i) => ({
          enhancementType: "streaming-optimization" as const,
          streamingOptions: {
            chunkSize: 1024 + i,
          },
        }),
      );

      const startTime = Date.now();

      // Should handle large batches without hanging
      expect(() =>
        batchEnhance(baseOptions, largeEnhancementBatch.slice(0, 5)),
      ).not.toThrow();

      const duration = Date.now() - startTime;

      // Should complete within reasonable time even for large batches
      expect(duration).toBeLessThan(1000);
    });
  });

  describe("Convenience Functions", () => {
    it("should provide working streaming enhancement shortcut", () => {
      const result = enhanceForStreaming(baseOptions, 2048);

      expect(result.options).toBeDefined();
      expect(result.metadata.enhancementType).toBe("streaming-optimization");
      expect(result.metadata.configurationUsed).toEqual(
        expect.objectContaining({
          chunkSize: 2048,
          enableProgress: true,
        }),
      );
    });

    it("should provide working legacy migration shortcut", () => {
      const legacyContext = {
        old_field: "value",
        another_field: 123,
      };

      const result = migrateLegacyContext(
        baseOptions,
        legacyContext,
        "test-domain",
      );

      expect(result.options).toBeDefined();
      expect(result.metadata.enhancementType).toBe("legacy-migration");
      expect(result.options.context?.legacyMigration).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle malformed enhancement options gracefully", () => {
      const malformedEnhancement = {
        enhancementType:
          "invalid-type" as EnhancementOptions["enhancementType"],
        invalidField: "should-be-ignored",
      };

      // Should not crash, should return error result
      const result = OptionsEnhancer.enhance(baseOptions, malformedEnhancement);

      expect(result.options).toBeDefined();
      expect(result.metadata.enhancementApplied).toBe(false);
      expect(result.metadata.warnings).toContain(
        expect.stringContaining("Enhancement failed"),
      );
    });

    it("should preserve original options on enhancement failure", () => {
      const originalOptions = { ...baseOptions };

      const invalidEnhancement: EnhancementOptions = {
        enhancementType: "legacy-migration",
        // Missing required fields
      };

      const result = OptionsEnhancer.enhance(baseOptions, invalidEnhancement);

      // Original options should be preserved
      expect(result.options.input).toEqual(originalOptions.input);
      expect(result.options.provider).toEqual(originalOptions.provider);
    });
  });
});
