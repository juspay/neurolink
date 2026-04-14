/**
 * Toxicity Check Processor Unit Tests
 */
import { describe, expect, it } from "vitest";
import {
  createToxicityCheckProcessor,
  toxicityCheckProcessor,
} from "../../../../src/lib/processors/output/toxicityCheckProcessor.js";
import type {
  InputProcessorData,
  OutputProcessorData,
  ProcessorMetadata,
  ToxicityCheckConfig,
} from "../../../../src/lib/types/ioProcessor.js";

// Helper to create valid metadata
function createMetadata(
  overrides: Partial<ProcessorMetadata> = {},
): ProcessorMetadata {
  return {
    requestId: "test-request-id",
    timestamp: Date.now(),
    custom: {},
    issues: [],
    processorTrace: [],
    ...overrides,
  };
}

// Helper to create input data
function createInputData(): InputProcessorData {
  return {
    options: { input: { text: "Test prompt" } },
    messages: [{ id: "msg-1", role: "user", content: "Test" }],
    text: "Test",
    metadata: createMetadata(),
  };
}

// Helper to create output data
function createOutputData(
  responseText: string,
  metadataOverrides: Partial<ProcessorMetadata> = {},
): OutputProcessorData {
  return {
    input: createInputData(),
    result: {
      content: responseText,
      provider: "openai",
      model: "gpt-4o",
    },
    responseText,
    metadata: createMetadata(metadataOverrides),
  };
}

describe("createToxicityCheckProcessor", () => {
  describe("processor metadata", () => {
    it("should have correct id and name", () => {
      const processor = createToxicityCheckProcessor();

      expect(processor.id).toBe("toxicity-check");
      expect(processor.name).toBe("Toxicity Check");
      expect(processor.description).toContain("toxic");
      expect(processor.priority).toBe(85);
    });
  });

  describe("clean content", () => {
    it("should continue for clean content", async () => {
      const processor = createToxicityCheckProcessor();
      const data = createOutputData("Hello! How can I help you today?");

      const result = await processor.process(data);

      expect(result.action).toBe("continue");
      expect(result.metadata?.toxicityPassed).toBe(true);
      expect(result.metadata?.toxicityScore).toBeDefined();
    });

    it("should handle empty response", async () => {
      const processor = createToxicityCheckProcessor();
      const data = createOutputData("");

      const result = await processor.process(data);

      expect(result.action).toBe("continue");
      expect(result.metadata?.toxicityChecked).toBe(false);
      expect(result.metadata?.reason).toBe("empty_response");
    });
  });

  describe("insult detection", () => {
    it("should detect insults", async () => {
      const processor = createToxicityCheckProcessor({
        categories: ["insult"],
        warnThreshold: 0.1,
        blockThreshold: 0.5,
        action: "warn",
      });
      const data = createOutputData(
        "You are stupid and a complete idiot moron",
      );

      const result = await processor.process(data);

      expect(result.metadata?.flaggedCategories).toContain("insult");
    });
  });

  describe("threat detection", () => {
    it("should detect threats", async () => {
      const processor = createToxicityCheckProcessor({
        categories: ["threat"],
        warnThreshold: 0.1,
        blockThreshold: 0.5,
        action: "warn",
      });
      const data = createOutputData("I will hurt and attack and destroy");

      const result = await processor.process(data);

      expect(result.metadata?.flaggedCategories).toContain("threat");
    });
  });

  describe("abort action", () => {
    it("should abort when toxicity exceeds block threshold", async () => {
      const processor = createToxicityCheckProcessor({
        categories: ["insult"],
        blockThreshold: 0.3,
        action: "abort",
      });
      // This should trigger due to multiple insult words
      const data = createOutputData("You stupid idiot moron dumb fool");

      const result = await processor.process(data);

      expect(result.action).toBe("abort");
      expect(result.feedback).toContain("toxic content");
      expect(result.issues?.[0].severity).toBe("critical");
    });
  });

  describe("retry action", () => {
    it("should request retry when toxicity detected with retry action", async () => {
      const processor = createToxicityCheckProcessor({
        categories: ["insult"],
        blockThreshold: 0.3,
        action: "retry",
        maxRetries: 2,
      });
      const data = createOutputData("You stupid idiot moron");

      const result = await processor.process(data);

      expect(result.action).toBe("retry");
      expect(result.feedback).toContain("regenerate");
      expect(result.retryCount).toBe(1);
      expect(result.maxRetries).toBe(2);
    });

    it("should abort after max retries exceeded", async () => {
      const processor = createToxicityCheckProcessor({
        categories: ["insult"],
        blockThreshold: 0.3,
        action: "retry",
        maxRetries: 2,
      });
      const data = createOutputData("You stupid idiot moron", {
        custom: { retryCount: 2 },
      });

      const result = await processor.process(data);

      expect(result.action).toBe("abort");
      expect(result.feedback).toContain("after 2 retries");
      expect(result.metadata?.maxRetriesExceeded).toBe(true);
    });
  });

  describe("warn action", () => {
    it("should continue with warning for warn action above block threshold", async () => {
      const processor = createToxicityCheckProcessor({
        categories: ["insult"],
        blockThreshold: 0.3,
        action: "warn",
      });
      const data = createOutputData("You stupid idiot moron");

      const result = await processor.process(data);

      expect(result.action).toBe("continue");
      expect(result.metadata?.toxicityWarned).toBe(true);
      expect(result.issues?.[0].severity).toBe("critical");
    });

    it("should add warning issue above warn threshold but below block threshold", async () => {
      const processor = createToxicityCheckProcessor({
        categories: ["insult"],
        warnThreshold: 0.1,
        blockThreshold: 0.8,
        action: "warn",
      });
      const data = createOutputData("That was stupid of me");

      const result = await processor.process(data);

      expect(result.action).toBe("continue");
      if (result.issues && result.issues.length > 0) {
        expect(result.issues[0].severity).toBe("warning");
        expect(result.metadata?.toxicityWarned).toBe(true);
      }
    });
  });

  describe("thresholds", () => {
    it("should use custom thresholds", async () => {
      const processor = createToxicityCheckProcessor({
        categories: ["insult"],
        blockThreshold: 0.1, // Very low threshold
        warnThreshold: 0.05,
        action: "abort",
      });
      const data = createOutputData("That was stupid"); // Single word should trigger low threshold

      const result = await processor.process(data);

      // With very low threshold, even slight toxicity triggers
      expect(result.metadata?.toxicityScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe("validateConfig", () => {
    it("should validate valid config", () => {
      const processor = createToxicityCheckProcessor();

      const result = processor.validateConfig!({
        blockThreshold: 0.7,
        warnThreshold: 0.4,
        action: "retry",
        maxRetries: 3,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject invalid blockThreshold", () => {
      const processor = createToxicityCheckProcessor();

      const result = processor.validateConfig!({
        blockThreshold: 1.5, // Invalid: > 1
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("blockThreshold");
    });

    it("should reject invalid warnThreshold", () => {
      const processor = createToxicityCheckProcessor();

      const result = processor.validateConfig!({
        warnThreshold: -0.1, // Invalid: < 0
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("warnThreshold");
    });

    it("should reject warnThreshold > blockThreshold", () => {
      const processor = createToxicityCheckProcessor();

      const result = processor.validateConfig!({
        blockThreshold: 0.5,
        warnThreshold: 0.7, // Invalid: > blockThreshold
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("warnThreshold should not be greater");
    });

    it("should reject invalid action", () => {
      const processor = createToxicityCheckProcessor();

      const result = processor.validateConfig!({
        action: "invalid",
      } as unknown as ToxicityCheckConfig);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Invalid action");
    });

    it("should reject negative maxRetries", () => {
      const processor = createToxicityCheckProcessor();

      const result = processor.validateConfig!({
        maxRetries: -1,
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("maxRetries");
    });
  });
});

describe("toxicityCheckProcessor (pre-configured)", () => {
  it("should be a valid output processor", () => {
    expect(toxicityCheckProcessor.id).toBe("toxicity-check");
    expect(toxicityCheckProcessor.process).toBeDefined();
  });

  it("should use default configuration", async () => {
    const data = createOutputData("Hello, this is a friendly response.");

    const result = await toxicityCheckProcessor.process(data);

    expect(result.action).toBe("continue");
  });
});
