/**
 * I/O Processors Integration Tests
 *
 * Comprehensive integration tests for the processor system including:
 * - Input processors (validation, sanitization, normalization, enrichment, transformation)
 * - Output processors (formatting, filtering, redaction, transformation, validation)
 * - Pipeline execution with chained processors
 * - Pipeline presets (security, strict, quality)
 * - Tripwire system validation
 * - Error handling in pipelines
 * - Processor composition
 * - Performance benchmarks
 *
 * @module io-processors.integration.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Core pipeline and registry
import { ProcessorPipeline } from "../../../src/lib/processors/pipeline.js";
import {
  ProcessorRegistry,
  defaultRegistry,
} from "../../../src/lib/processors/registry.js";

// Input processors
import {
  createMessageValidationProcessor,
  createPIIDetectionProcessor,
  createContentModerationProcessor,
  createMemoryRetrievalProcessor,
  createSemanticContextProcessor,
} from "../../../src/lib/processors/input/index.js";

// Output processors
import {
  createResponseValidationProcessor,
  createLengthValidationProcessor,
  createContentFilteringProcessor,
  createToxicityCheckProcessor,
  createMemoryPersistenceProcessor,
} from "../../../src/lib/processors/output/index.js";

// Presets
import {
  defaultPreset,
  securityPreset,
  strictPreset,
  qualityPreset,
  minimalPreset,
  builtInPresets,
  getPreset,
  getPresetNames,
} from "../../../src/lib/processors/presets.js";

// Tripwire system
import {
  TripwireEvaluator,
  commonTripwires,
  createDefaultTripwireEvaluator,
  maxTokensTripwire,
  emptyResponseTripwire,
  repetitionLoopTripwire,
  inputTooLongTripwire,
  tooManyMessagesTripwire,
  responseTooLongTripwire,
  highLatencyTripwire,
} from "../../../src/lib/processors/tripwire.js";

// Utilities
import { initializeDefaultProcessors } from "../../../src/lib/processors/index.js";

// Types
import type {
  InputProcessor,
  InputProcessorData,
  OutputProcessor,
  OutputProcessorData,
  ProcessorMetadata,
  ProcessorConfig,
  TripwireConfig,
} from "../../../src/lib/types/processorTypes.js";

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a valid ProcessorMetadata object for testing
 */
function createMetadata(
  overrides: Partial<ProcessorMetadata> = {},
): ProcessorMetadata {
  return {
    requestId: `test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
    provider: "openai",
    model: "gpt-4o",
    custom: {},
    issues: [],
    processorTrace: [],
    ...overrides,
  };
}

/**
 * Create valid InputProcessorData for testing
 */
function createInputData(
  overrides: Partial<InputProcessorData> = {},
): InputProcessorData {
  return {
    options: { input: { text: "Test prompt" } },
    messages: [{ id: "msg-1", role: "user", content: "Hello, how are you?" }],
    text: "Hello, how are you?",
    metadata: createMetadata(),
    ...overrides,
  };
}

/**
 * Create valid OutputProcessorData for testing
 */
function createOutputData(
  overrides: Partial<OutputProcessorData> = {},
): OutputProcessorData {
  return {
    input: createInputData(),
    result: {
      content: "I am doing well, thank you for asking!",
      provider: "openai",
      model: "gpt-4o",
    },
    responseText: "I am doing well, thank you for asking!",
    metadata: createMetadata(),
    ...overrides,
  };
}

// ============================================================================
// Input Processor Integration Tests
// ============================================================================

describe("Input Processors Integration", () => {
  describe("Message Validation Processor", () => {
    it("should validate messages with default config", async () => {
      const processor = createMessageValidationProcessor();
      const inputData = createInputData();

      const result = await processor.process(inputData);

      expect(result.action).toBe("continue");
      expect(result.data).toBeDefined();
      expect(result.metadata?.validationPassed).toBe(true);
    });

    it("should abort on too short message", async () => {
      const processor = createMessageValidationProcessor({
        minLength: 50,
      });
      const inputData = createInputData({ text: "Hi" });

      const result = await processor.process(inputData);

      expect(result.action).toBe("abort");
      expect(result.feedback).toContain("too short");
    });

    it("should abort on too long message", async () => {
      const processor = createMessageValidationProcessor({
        maxLength: 10,
      });
      const inputData = createInputData({
        text: "This is a very long message that exceeds the limit",
      });

      const result = await processor.process(inputData);

      expect(result.action).toBe("abort");
      expect(result.feedback).toContain("too long");
    });

    it("should abort on too many messages", async () => {
      const processor = createMessageValidationProcessor({
        maxMessages: 2,
      });
      const messages = Array.from({ length: 5 }, (_, i) => ({
        id: `msg-${i}`,
        role: "user" as const,
        content: `Message ${i}`,
      }));
      const inputData = createInputData({ messages });

      const result = await processor.process(inputData);

      expect(result.action).toBe("abort");
      expect(result.feedback).toContain("Too many messages");
    });

    it("should validate custom validator function", async () => {
      const processor = createMessageValidationProcessor({
        customValidator: (data) => {
          const errors: string[] = [];
          const warnings: string[] = [];
          if (!data.text?.includes("please")) {
            warnings.push("Message should include politeness words");
          }
          return { valid: true, errors, warnings };
        },
      });
      const inputData = createInputData({ text: "Give me the answer" });

      const result = await processor.process(inputData);

      expect(result.action).toBe("continue");
      expect(result.issues?.some((i) => i.message.includes("politeness"))).toBe(
        true,
      );
    });

    it("should validate config correctly", () => {
      const processor = createMessageValidationProcessor();

      const validResult = processor.validateConfig!({
        minLength: 10,
        maxLength: 1000,
        maxMessages: 50,
      });
      expect(validResult.valid).toBe(true);

      const invalidResult = processor.validateConfig!({
        minLength: 100,
        maxLength: 10,
      });
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toContain(
        "minLength cannot be greater than maxLength",
      );
    });
  });

  describe("PII Detection Processor", () => {
    it("should detect email addresses and warn by default", async () => {
      const processor = createPIIDetectionProcessor();
      const inputData = createInputData({
        text: "My email is john@example.com",
        messages: [
          {
            id: "msg-1",
            role: "user",
            content: "My email is john@example.com",
          },
        ],
      });

      const result = await processor.process(inputData);

      expect(result.action).toBe("continue");
      expect(result.metadata?.piiDetected).toBe(true);
      expect(result.metadata?.piiWarned).toBe(true);
    });

    it("should detect phone numbers", async () => {
      const processor = createPIIDetectionProcessor({
        detectTypes: ["phone"],
        action: "warn",
      });
      const inputData = createInputData({
        text: "Call me at 555-123-4567",
        messages: [
          { id: "msg-1", role: "user", content: "Call me at 555-123-4567" },
        ],
      });

      const result = await processor.process(inputData);

      expect(result.metadata?.piiDetected).toBe(true);
      expect(result.metadata?.piiTypes).toContain("phone");
    });

    it("should redact PII when configured", async () => {
      const processor = createPIIDetectionProcessor({
        detectTypes: ["email"],
        action: "redact",
        redactionText: "[EMAIL]",
      });
      const inputData = createInputData({
        text: "Contact me at test@example.com please",
        messages: [
          {
            id: "msg-1",
            role: "user",
            content: "Contact me at test@example.com please",
          },
        ],
      });

      const result = await processor.process(inputData);

      expect(result.action).toBe("continue");
      expect(result.data?.text).toContain("[EMAIL]");
      expect(result.data?.text).not.toContain("test@example.com");
      expect(result.metadata?.piiRedacted).toBe(true);
    });

    it("should abort when configured", async () => {
      const processor = createPIIDetectionProcessor({
        detectTypes: ["ssn"],
        action: "abort",
      });
      const inputData = createInputData({
        text: "My SSN is 123-45-6789",
        messages: [
          { id: "msg-1", role: "user", content: "My SSN is 123-45-6789" },
        ],
      });

      const result = await processor.process(inputData);

      expect(result.action).toBe("abort");
      expect(result.feedback).toContain("PII detected");
    });

    it("should support custom patterns", async () => {
      const processor = createPIIDetectionProcessor({
        customPatterns: [
          {
            name: "employee_id",
            pattern: /EMP-\d{6}/gi,
          },
        ],
        action: "warn",
      });
      const inputData = createInputData({
        text: "My employee ID is EMP-123456",
        messages: [
          {
            id: "msg-1",
            role: "user",
            content: "My employee ID is EMP-123456",
          },
        ],
      });

      const result = await processor.process(inputData);

      expect(result.metadata?.piiDetected).toBe(true);
      expect(result.metadata?.piiTypes).toContain("employee_id");
    });

    it("should respect allow list", async () => {
      const processor = createPIIDetectionProcessor({
        detectTypes: ["email"],
        action: "abort",
        allowList: [{ type: "email" }],
      });
      const inputData = createInputData({
        text: "My email is test@example.com",
        messages: [
          {
            id: "msg-1",
            role: "user",
            content: "My email is test@example.com",
          },
        ],
      });

      const result = await processor.process(inputData);

      expect(result.action).toBe("continue");
      expect(result.metadata?.piiDetected).toBe(false);
    });

    it("should detect credit card numbers", async () => {
      const processor = createPIIDetectionProcessor({
        detectTypes: ["credit_card"],
        action: "warn",
      });
      const inputData = createInputData({
        text: "My card is 4111-1111-1111-1111",
        messages: [
          {
            id: "msg-1",
            role: "user",
            content: "My card is 4111-1111-1111-1111",
          },
        ],
      });

      const result = await processor.process(inputData);

      expect(result.metadata?.piiDetected).toBe(true);
      expect(result.metadata?.piiTypes).toContain("credit_card");
    });

    it("should detect IP addresses", async () => {
      const processor = createPIIDetectionProcessor({
        detectTypes: ["ip_address"],
        action: "warn",
      });
      const inputData = createInputData({
        text: "Server is at 192.168.1.100",
        messages: [
          { id: "msg-1", role: "user", content: "Server is at 192.168.1.100" },
        ],
      });

      const result = await processor.process(inputData);

      expect(result.metadata?.piiDetected).toBe(true);
      expect(result.metadata?.piiTypes).toContain("ip_address");
    });
  });

  describe("Content Moderation Processor", () => {
    it("should pass clean content", async () => {
      const processor = createContentModerationProcessor();
      const inputData = createInputData({
        text: "What is the weather like today?",
      });

      const result = await processor.process(inputData);

      expect(result.action).toBe("continue");
    });

    it("should detect blocked words", async () => {
      const processor = createContentModerationProcessor({
        blockedWords: ["banned", "prohibited"],
        blockThreshold: 0.5,
      });
      const inputData = createInputData({
        text: "This message contains banned content",
      });

      const result = await processor.process(inputData);

      expect(result.action).toBe("abort");
    });

    it("should detect blocked patterns", async () => {
      const processor = createContentModerationProcessor({
        blockedPatterns: ["\\bsecret\\s+key\\b"],
        blockThreshold: 0.5,
      });
      const inputData = createInputData({
        text: "Here is my secret key: abc123",
      });

      const result = await processor.process(inputData);

      expect(result.action).toBe("abort");
    });
  });

  describe("Semantic Context Processor", () => {
    it("should process without vector store (pass-through)", async () => {
      const processor = createSemanticContextProcessor();
      const inputData = createInputData();

      const result = await processor.process(inputData);

      expect(result.action).toBe("continue");
    });
  });

  describe("Memory Retrieval Processor", () => {
    it("should process without memory store (pass-through)", async () => {
      const processor = createMemoryRetrievalProcessor();
      const inputData = createInputData();

      const result = await processor.process(inputData);

      expect(result.action).toBe("continue");
    });
  });
});

// ============================================================================
// Output Processor Integration Tests
// ============================================================================

describe("Output Processors Integration", () => {
  describe("Response Validation Processor", () => {
    it("should pass valid response", async () => {
      const processor = createResponseValidationProcessor();
      const outputData = createOutputData();

      const result = await processor.process(outputData);

      expect(result.action).toBe("continue");
    });

    it("should abort on too short response", async () => {
      const processor = createResponseValidationProcessor({
        minLength: 100,
        retryOnFailure: false,
      });
      const outputData = createOutputData({
        responseText: "Hi",
      });

      const result = await processor.process(outputData);

      expect(result.action).toBe("abort");
    });

    it("should retry on short response when configured", async () => {
      const processor = createResponseValidationProcessor({
        minLength: 100,
        retryOnFailure: true,
        maxRetries: 2,
      });
      const outputData = createOutputData({
        responseText: "Short",
      });

      const result = await processor.process(outputData);

      expect(result.action).toBe("retry");
      expect(result.feedback).toContain("too short");
    });

    it("should detect forbidden phrases", async () => {
      const processor = createResponseValidationProcessor({
        forbiddenPhrases: ["I cannot", "I refuse"],
      });
      const outputData = createOutputData({
        responseText: "I cannot help with that request",
      });

      const result = await processor.process(outputData);

      expect(result.action).toBe("abort");
      expect(result.feedback).toContain("Forbidden phrase found");
    });

    it("should verify required phrases", async () => {
      const processor = createResponseValidationProcessor({
        requiredPhrases: ["thank you"],
      });
      const outputData = createOutputData({
        responseText: "Here is your answer",
      });

      const result = await processor.process(outputData);

      expect(result.action).toBe("abort");
      expect(result.feedback).toContain("Required phrase missing");
    });
  });

  describe("Length Validation Processor", () => {
    it("should pass response within bounds", async () => {
      const processor = createLengthValidationProcessor({
        minLength: 5,
        maxLength: 1000,
      });
      const outputData = createOutputData({
        responseText: "This is a normal length response",
      });

      const result = await processor.process(outputData);

      expect(result.action).toBe("continue");
      expect(result.metadata?.lengthValidated).toBe(true);
    });

    it("should truncate when configured", async () => {
      const processor = createLengthValidationProcessor({
        maxLength: 20,
        action: "truncate",
        truncationSuffix: "...",
      });
      const outputData = createOutputData({
        responseText: "This is a very long response that needs to be truncated",
      });

      const result = await processor.process(outputData);

      expect(result.action).toBe("continue");
      expect(result.data?.responseText.length).toBeLessThanOrEqual(20);
      expect(result.data?.responseText.endsWith("...")).toBe(true);
      expect(result.metadata?.truncated).toBe(true);
    });

    it("should retry on too short response", async () => {
      const processor = createLengthValidationProcessor({
        minLength: 100,
        action: "retry",
        maxRetries: 3,
      });
      const outputData = createOutputData({
        responseText: "Too short",
      });

      const result = await processor.process(outputData);

      expect(result.action).toBe("retry");
      expect(result.retryCount).toBe(1);
    });

    it("should abort on too long response when configured", async () => {
      const processor = createLengthValidationProcessor({
        maxLength: 10,
        action: "abort",
      });
      const outputData = createOutputData({
        responseText: "This response is definitely too long",
      });

      const result = await processor.process(outputData);

      expect(result.action).toBe("abort");
    });
  });

  describe("Content Filtering Processor", () => {
    it("should pass clean content", async () => {
      const processor = createContentFilteringProcessor();
      const outputData = createOutputData({
        responseText: "This is a clean response",
      });

      const result = await processor.process(outputData);

      expect(result.action).toBe("continue");
      expect(result.metadata?.contentFiltered).toBe(false);
    });

    it("should redact filtered words", async () => {
      const processor = createContentFilteringProcessor({
        filterWords: ["secret", "confidential"],
        replacementText: "[FILTERED]",
        action: "redact",
      });
      const outputData = createOutputData({
        responseText: "The secret information is confidential",
      });

      const result = await processor.process(outputData);

      expect(result.action).toBe("continue");
      expect(result.data?.responseText).toContain("[FILTERED]");
      expect(result.data?.responseText).not.toContain("secret");
      expect(result.data?.responseText).not.toContain("confidential");
    });

    it("should redact filtered patterns", async () => {
      const processor = createContentFilteringProcessor({
        filterPatterns: ["password\\s*:\\s*\\S+"],
        replacementText: "[CREDENTIALS]",
        action: "redact",
      });
      const outputData = createOutputData({
        responseText: "Your password: abc123xyz",
      });

      const result = await processor.process(outputData);

      expect(result.action).toBe("continue");
      expect(result.data?.responseText).toContain("[CREDENTIALS]");
    });

    it("should abort when configured", async () => {
      const processor = createContentFilteringProcessor({
        filterWords: ["dangerous"],
        action: "abort",
      });
      const outputData = createOutputData({
        responseText: "This contains dangerous information",
      });

      const result = await processor.process(outputData);

      expect(result.action).toBe("abort");
    });

    it("should retry when configured", async () => {
      const processor = createContentFilteringProcessor({
        filterWords: ["inappropriate"],
        action: "retry",
        maxRetries: 2,
      });
      const outputData = createOutputData({
        responseText: "This is inappropriate content",
      });

      const result = await processor.process(outputData);

      expect(result.action).toBe("retry");
    });
  });

  describe("Toxicity Check Processor", () => {
    it("should pass clean content", async () => {
      const processor = createToxicityCheckProcessor();
      const outputData = createOutputData({
        responseText: "This is a friendly and helpful response",
      });

      const result = await processor.process(outputData);

      expect(result.action).toBe("continue");
      expect(result.metadata?.toxicityPassed).toBe(true);
    });

    it("should detect toxic content indicators", async () => {
      const processor = createToxicityCheckProcessor({
        categories: ["insult", "threat"],
        blockThreshold: 0.3,
        action: "abort",
      });
      const outputData = createOutputData({
        responseText: "You are an idiot and a moron who should be destroyed",
      });

      const result = await processor.process(outputData);

      expect(result.action).toBe("abort");
    });

    it("should warn on elevated toxicity", async () => {
      const processor = createToxicityCheckProcessor({
        categories: ["insult"],
        warnThreshold: 0.2,
        blockThreshold: 0.9,
        action: "warn",
      });
      const outputData = createOutputData({
        responseText: "That was a stupid mistake",
      });

      const result = await processor.process(outputData);

      // May be continue with warning or continue without issue
      expect(result.action).toBe("continue");
    });

    it("should retry on toxic content when configured", async () => {
      const processor = createToxicityCheckProcessor({
        categories: ["insult"],
        blockThreshold: 0.2,
        action: "retry",
        maxRetries: 2,
      });
      const outputData = createOutputData({
        responseText: "You fool, you idiot",
      });

      const result = await processor.process(outputData);

      expect(result.action).toBe("retry");
    });

    it("should validate config thresholds", () => {
      const processor = createToxicityCheckProcessor();

      const invalidResult = processor.validateConfig!({
        warnThreshold: 0.9,
        blockThreshold: 0.5,
      });
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toContain(
        "warnThreshold should not be greater than blockThreshold",
      );
    });
  });

  describe("Memory Persistence Processor", () => {
    it("should process without memory store (pass-through)", async () => {
      const processor = createMemoryPersistenceProcessor();
      const outputData = createOutputData();

      const result = await processor.process(outputData);

      expect(result.action).toBe("continue");
    });
  });
});

// ============================================================================
// Pipeline Execution Integration Tests
// ============================================================================

describe("Pipeline Execution Integration", () => {
  describe("Chained Input Processors", () => {
    it("should execute multiple input processors in priority order", async () => {
      const executionOrder: string[] = [];

      const validationProcessor = createMessageValidationProcessor();
      const originalProcess =
        validationProcessor.process.bind(validationProcessor);
      validationProcessor.process = async (data, config) => {
        executionOrder.push("validation");
        return originalProcess(data, config);
      };

      const piiProcessor = createPIIDetectionProcessor();
      const originalPiiProcess = piiProcessor.process.bind(piiProcessor);
      piiProcessor.process = async (data, config) => {
        executionOrder.push("pii");
        return originalPiiProcess(data, config);
      };

      const pipeline = new ProcessorPipeline({
        inputProcessors: [
          { processor: validationProcessor },
          { processor: piiProcessor },
        ],
      });

      const inputData = createInputData();
      await pipeline.processInput(inputData);

      // Validation has priority 90, PII has priority 85
      expect(executionOrder).toEqual(["validation", "pii"]);
    });

    it("should stop on abort and not continue to next processor", async () => {
      const executionOrder: string[] = [];

      const abortingProcessor: InputProcessor = {
        id: "aborter",
        name: "Aborter",
        priority: 100,
        process: async () => {
          executionOrder.push("aborter");
          return { action: "abort", feedback: "Blocked" };
        },
      };

      const neverReachedProcessor: InputProcessor = {
        id: "never-reached",
        name: "Never Reached",
        priority: 50,
        process: async (data) => {
          executionOrder.push("never-reached");
          return { action: "continue", data };
        },
      };

      const pipeline = new ProcessorPipeline({
        inputProcessors: [
          { processor: abortingProcessor },
          { processor: neverReachedProcessor },
        ],
      });

      const result = await pipeline.processInput(createInputData());

      expect(result.action).toBe("abort");
      expect(executionOrder).toEqual(["aborter"]);
      expect(executionOrder).not.toContain("never-reached");
    });

    it("should transform data through the pipeline", async () => {
      const addPrefixProcessor: InputProcessor = {
        id: "add-prefix",
        name: "Add Prefix",
        priority: 100,
        process: async (data) => ({
          action: "continue",
          data: { ...data, text: `[PREFIX] ${data.text}` },
        }),
      };

      const addSuffixProcessor: InputProcessor = {
        id: "add-suffix",
        name: "Add Suffix",
        priority: 50,
        process: async (data) => ({
          action: "continue",
          data: { ...data, text: `${data.text} [SUFFIX]` },
        }),
      };

      const pipeline = new ProcessorPipeline({
        inputProcessors: [
          { processor: addPrefixProcessor },
          { processor: addSuffixProcessor },
        ],
      });

      const result = await pipeline.processInput(
        createInputData({ text: "Hello" }),
      );

      expect(result.action).toBe("continue");
      expect(result.data?.text).toBe("[PREFIX] Hello [SUFFIX]");
    });
  });

  describe("Chained Output Processors", () => {
    it("should execute multiple output processors in priority order", async () => {
      const executionOrder: string[] = [];

      const filterProcessor = createContentFilteringProcessor();
      const originalProcess = filterProcessor.process.bind(filterProcessor);
      filterProcessor.process = async (data, config) => {
        executionOrder.push("filter");
        return originalProcess(data, config);
      };

      const lengthProcessor = createLengthValidationProcessor();
      const originalLengthProcess =
        lengthProcessor.process.bind(lengthProcessor);
      lengthProcessor.process = async (data, config) => {
        executionOrder.push("length");
        return originalLengthProcess(data, config);
      };

      const pipeline = new ProcessorPipeline({
        outputProcessors: [
          { processor: filterProcessor }, // priority 90
          { processor: lengthProcessor }, // priority 70
        ],
      });

      await pipeline.processOutput(createOutputData());

      expect(executionOrder).toEqual(["filter", "length"]);
    });

    it("should handle retry action correctly", async () => {
      let callCount = 0;
      const retryingProcessor: OutputProcessor = {
        id: "retrier",
        name: "Retrier",
        priority: 100,
        process: async () => {
          callCount++;
          return {
            action: "retry",
            feedback: "Please regenerate",
          };
        },
      };

      const pipeline = new ProcessorPipeline({
        outputProcessors: [{ processor: retryingProcessor }],
        settings: { maxTotalRetries: 3 },
      });

      const result = await pipeline.processOutput(createOutputData());

      expect(result.action).toBe("retry");
      expect(result.metadata.custom.retryCount).toBe(1);
    });
  });

  describe("Combined Input and Output Processing", () => {
    it("should process both input and output in sequence", async () => {
      const pipeline = new ProcessorPipeline({
        inputProcessors: [
          { processor: createMessageValidationProcessor() },
          { processor: createPIIDetectionProcessor({ action: "warn" }) },
        ],
        outputProcessors: [
          { processor: createLengthValidationProcessor({ maxLength: 10000 }) },
          { processor: createToxicityCheckProcessor({ action: "warn" }) },
        ],
      });

      const inputData = createInputData({
        text: "What is the weather like?",
      });

      const inputResult = await pipeline.processInput(inputData);
      expect(inputResult.action).toBe("continue");

      const outputData = createOutputData({
        responseText: "The weather is sunny today!",
      });

      const outputResult = await pipeline.processOutput(outputData);
      expect(outputResult.action).toBe("continue");
    });

    it("should accumulate metadata through the pipeline", async () => {
      const metadataProcessor1: InputProcessor = {
        id: "meta1",
        name: "Meta 1",
        priority: 100,
        process: async (data) => ({
          action: "continue",
          data,
          metadata: { step1: "completed" },
        }),
      };

      const metadataProcessor2: InputProcessor = {
        id: "meta2",
        name: "Meta 2",
        priority: 50,
        process: async (data) => ({
          action: "continue",
          data,
          metadata: { step2: "completed" },
        }),
      };

      const pipeline = new ProcessorPipeline({
        inputProcessors: [
          { processor: metadataProcessor1 },
          { processor: metadataProcessor2 },
        ],
        settings: { enableTracing: true },
      });

      const result = await pipeline.processInput(createInputData());

      expect(result.metadata.custom.step1).toBe("completed");
      expect(result.metadata.custom.step2).toBe("completed");
      expect(result.metadata.processorTrace).toHaveLength(2);
    });
  });
});

// ============================================================================
// Pipeline Presets Integration Tests
// ============================================================================

describe("Pipeline Presets Integration", () => {
  let registry: ProcessorRegistry;

  beforeEach(() => {
    registry = new ProcessorRegistry();
    // Register all processors
    registry.registerInputProcessor(createMessageValidationProcessor());
    registry.registerInputProcessor(createPIIDetectionProcessor());
    registry.registerInputProcessor(createContentModerationProcessor());
    registry.registerOutputProcessor(createResponseValidationProcessor());
    registry.registerOutputProcessor(createLengthValidationProcessor());
    registry.registerOutputProcessor(createContentFilteringProcessor());
    registry.registerOutputProcessor(createToxicityCheckProcessor());

    // Register presets
    for (const preset of builtInPresets) {
      registry.registerPreset(preset);
    }
  });

  describe("Default Preset", () => {
    it("should provide basic validation", async () => {
      const presetConfig = registry.buildFromPreset("default");
      expect(presetConfig).toBeDefined();

      const pipeline = new ProcessorPipeline({
        inputProcessors: presetConfig!.inputProcessors,
        outputProcessors: presetConfig!.outputProcessors,
      });

      const inputResult = await pipeline.processInput(createInputData());
      expect(inputResult.action).toBe("continue");

      const outputResult = await pipeline.processOutput(createOutputData());
      expect(outputResult.action).toBe("continue");
    });
  });

  describe("Security Preset", () => {
    it("should detect PII and moderate content", async () => {
      const presetConfig = registry.buildFromPreset("security");
      expect(presetConfig).toBeDefined();

      const pipeline = new ProcessorPipeline({
        inputProcessors: presetConfig!.inputProcessors,
        outputProcessors: presetConfig!.outputProcessors,
      });

      // Test with PII
      const piiInput = createInputData({
        text: "My SSN is 123-45-6789",
        messages: [
          { id: "msg-1", role: "user", content: "My SSN is 123-45-6789" },
        ],
      });

      const inputResult = await pipeline.processInput(piiInput);
      // Security preset uses redact action for PII
      expect(inputResult.action).toBe("continue");
    });
  });

  describe("Strict Preset", () => {
    it("should enforce stricter validation", async () => {
      const presetConfig = registry.buildFromPreset("strict");
      expect(presetConfig).toBeDefined();

      const pipeline = new ProcessorPipeline({
        inputProcessors: presetConfig!.inputProcessors,
        outputProcessors: presetConfig!.outputProcessors,
      });

      // Test with very short input
      const shortInput = createInputData({
        text: "Hi",
      });

      const inputResult = await pipeline.processInput(shortInput);
      // Strict preset requires minLength: 5
      expect(inputResult.action).toBe("abort");
    });
  });

  describe("Quality Preset", () => {
    it("should focus on response quality", async () => {
      const presetConfig = registry.buildFromPreset("quality");
      expect(presetConfig).toBeDefined();

      const pipeline = new ProcessorPipeline({
        inputProcessors: presetConfig!.inputProcessors,
        outputProcessors: presetConfig!.outputProcessors,
      });

      // Test with short response
      const outputData = createOutputData({
        responseText: "OK",
      });

      const outputResult = await pipeline.processOutput(outputData);
      // Quality preset requires minLength: 50 for response
      expect(outputResult.action).toBe("retry");
    });
  });

  describe("Minimal Preset", () => {
    it("should provide lightweight validation", async () => {
      const presetConfig = registry.buildFromPreset("minimal");
      expect(presetConfig).toBeDefined();

      const pipeline = new ProcessorPipeline({
        inputProcessors: presetConfig!.inputProcessors,
        outputProcessors: presetConfig!.outputProcessors,
      });

      expect(presetConfig!.outputProcessors).toHaveLength(0);

      const inputResult = await pipeline.processInput(createInputData());
      expect(inputResult.action).toBe("continue");
    });
  });

  describe("Preset Utilities", () => {
    it("should list all preset names", () => {
      const names = getPresetNames();
      expect(names).toContain("default");
      expect(names).toContain("security");
      expect(names).toContain("strict");
      expect(names).toContain("quality");
      expect(names).toContain("minimal");
    });

    it("should get preset by name", () => {
      const preset = getPreset("security");
      expect(preset).toBeDefined();
      expect(preset?.name).toBe("security");
    });

    it("should return undefined for non-existent preset", () => {
      const preset = getPreset("nonexistent");
      expect(preset).toBeUndefined();
    });
  });
});

// ============================================================================
// Tripwire System Integration Tests
// ============================================================================

describe("Tripwire System Integration", () => {
  describe("TripwireEvaluator", () => {
    it("should create evaluator with common tripwires", () => {
      const evaluator = createDefaultTripwireEvaluator();

      expect(evaluator.count).toBe(commonTripwires.length);
      expect(evaluator.has("max-tokens")).toBe(true);
      expect(evaluator.has("empty-response")).toBe(true);
      expect(evaluator.has("repetition-loop")).toBe(true);
    });

    it("should register custom tripwires", () => {
      const evaluator = new TripwireEvaluator();

      const customTripwire: TripwireConfig = {
        id: "custom-check",
        name: "Custom Check",
        condition: (data) =>
          "responseText" in data &&
          (data.responseText?.includes("forbidden") ?? false),
        action: "abort",
        message: "Response contains forbidden content",
        severity: "error",
      };

      evaluator.register(customTripwire);

      expect(evaluator.has("custom-check")).toBe(true);
      expect(evaluator.get("custom-check")).toBeDefined();
    });

    it("should evaluate tripwires and detect violations", () => {
      const evaluator = createDefaultTripwireEvaluator();

      const emptyOutput = createOutputData({
        responseText: "",
      });

      const result = evaluator.evaluate(emptyOutput);

      expect(result.triggered).toBe(true);
      expect(result.tripwire?.id).toBe("empty-response");
      expect(result.action).toBe("abort");
    });

    it("should not trigger on valid data", () => {
      const evaluator = createDefaultTripwireEvaluator();

      const validOutput = createOutputData({
        responseText: "This is a valid response",
      });

      const result = evaluator.evaluate(validOutput);

      expect(result.triggered).toBe(false);
    });

    it("should evaluate all tripwires and return all violations", () => {
      const evaluator = new TripwireEvaluator();

      evaluator.register({
        id: "check1",
        name: "Check 1",
        condition: () => true,
        action: "warn",
        message: "Check 1 triggered",
        severity: "warning",
      });

      evaluator.register({
        id: "check2",
        name: "Check 2",
        condition: () => true,
        action: "abort",
        message: "Check 2 triggered",
        severity: "error",
      });

      const results = evaluator.evaluateAll(createOutputData());

      expect(results).toHaveLength(2);
      expect(results[0].tripwire?.id).toBe("check1");
      expect(results[1].tripwire?.id).toBe("check2");
    });

    it("should unregister tripwires", () => {
      const evaluator = createDefaultTripwireEvaluator();

      const removed = evaluator.unregister("empty-response");

      expect(removed).toBe(true);
      expect(evaluator.has("empty-response")).toBe(false);
    });

    it("should clear all tripwires", () => {
      const evaluator = createDefaultTripwireEvaluator();

      evaluator.clear();

      expect(evaluator.count).toBe(0);
    });
  });

  describe("Built-in Tripwires", () => {
    it("should detect empty response", () => {
      const result = emptyResponseTripwire.condition(
        createOutputData({ responseText: "" }),
      );
      expect(result).toBe(true);
    });

    it("should detect repetition loops", () => {
      const repetitiveText = Array(50).fill("word").join(" ");
      const result = repetitionLoopTripwire.condition(
        createOutputData({ responseText: repetitiveText }),
      );
      expect(result).toBe(true);
    });

    it("should detect input too long", () => {
      const longText = "x".repeat(60000);
      const result = inputTooLongTripwire.condition(
        createInputData({ text: longText }),
      );
      expect(result).toBe(true);
    });

    it("should detect too many messages", () => {
      const messages = Array.from({ length: 150 }, (_, i) => ({
        id: `msg-${i}`,
        role: "user" as const,
        content: `Message ${i}`,
      }));
      const result = tooManyMessagesTripwire.condition(
        createInputData({ messages }),
      );
      expect(result).toBe(true);
    });

    it("should detect response too long", () => {
      const longResponse = "x".repeat(150000);
      const result = responseTooLongTripwire.condition(
        createOutputData({ responseText: longResponse }),
      );
      expect(result).toBe(true);
    });

    it("should detect high latency", () => {
      const outputWithLatency = createOutputData();
      outputWithLatency.metadata.custom.responseTime = 60000;

      const result = highLatencyTripwire.condition(outputWithLatency);
      expect(result).toBe(true);
    });

    it("should detect max tokens exceeded", () => {
      const outputWithTokens = createOutputData();
      (
        outputWithTokens.result as unknown as { usage: { total: number } }
      ).usage = { total: 150000 };

      const result = maxTokensTripwire.condition(outputWithTokens);
      expect(result).toBe(true);
    });
  });
});

// ============================================================================
// Error Handling Integration Tests
// ============================================================================

describe("Error Handling Integration", () => {
  describe("Pipeline Error Handling", () => {
    it("should handle processor exceptions gracefully", async () => {
      const faultyProcessor: InputProcessor = {
        id: "faulty",
        name: "Faulty Processor",
        priority: 100,
        process: async () => {
          throw new Error("Processor crashed!");
        },
      };

      const pipeline = new ProcessorPipeline({
        inputProcessors: [{ processor: faultyProcessor }],
        settings: { stopOnAbort: true },
      });

      const result = await pipeline.processInput(createInputData());

      expect(result.action).toBe("abort");
      expect(result.feedback[0]).toContain("Processor crashed!");
      expect(result.issues.some((i) => i.category === "processor_error")).toBe(
        true,
      );
    });

    it("should continue processing when stopOnAbort is false", async () => {
      const executionOrder: string[] = [];

      const faultyProcessor: InputProcessor = {
        id: "faulty",
        name: "Faulty Processor",
        priority: 100,
        process: async () => {
          executionOrder.push("faulty");
          throw new Error("Processor crashed!");
        },
      };

      const successProcessor: InputProcessor = {
        id: "success",
        name: "Success Processor",
        priority: 50,
        process: async (data) => {
          executionOrder.push("success");
          return { action: "continue", data };
        },
      };

      const pipeline = new ProcessorPipeline({
        inputProcessors: [
          { processor: faultyProcessor },
          { processor: successProcessor },
        ],
        settings: { stopOnAbort: false },
      });

      const result = await pipeline.processInput(createInputData());

      expect(result.action).toBe("continue");
      expect(executionOrder).toEqual(["faulty", "success"]);
    });

    it("should timeout long-running processors", async () => {
      const slowProcessor: InputProcessor = {
        id: "slow",
        name: "Slow Processor",
        priority: 100,
        process: async () => {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          return { action: "continue" };
        },
      };

      const pipeline = new ProcessorPipeline({
        inputProcessors: [{ processor: slowProcessor }],
        settings: { pipelineTimeout: 100 },
      });

      await expect(pipeline.processInput(createInputData())).rejects.toThrow(
        /timed out/,
      );
    });
  });

  describe("Registry Error Handling", () => {
    it("should throw on duplicate processor registration", () => {
      const registry = new ProcessorRegistry();
      const processor = createMessageValidationProcessor();

      registry.registerInputProcessor(processor);

      expect(() => registry.registerInputProcessor(processor)).toThrow(
        /already registered/,
      );
    });

    it("should allow replacement with replace flag", () => {
      const registry = new ProcessorRegistry();
      const processor = createMessageValidationProcessor();

      registry.registerInputProcessor(processor);
      registry.registerInputProcessor(processor, { replace: true });

      expect(registry.hasInputProcessor(processor.id)).toBe(true);
    });

    it("should handle missing processor in preset gracefully", () => {
      const registry = new ProcessorRegistry();

      // Register preset but not the processors
      registry.registerPreset({
        name: "incomplete",
        description: "Incomplete preset",
        inputProcessors: [{ id: "nonexistent" }],
        outputProcessors: [],
      });

      const presetConfig = registry.buildFromPreset("incomplete");

      expect(presetConfig).toBeDefined();
      expect(presetConfig!.inputProcessors).toHaveLength(0);
    });
  });

  describe("Tripwire Error Handling", () => {
    it("should handle tripwire evaluation errors gracefully", () => {
      const evaluator = new TripwireEvaluator();

      evaluator.register({
        id: "faulty-tripwire",
        name: "Faulty Tripwire",
        condition: () => {
          throw new Error("Evaluation error");
        },
        action: "abort",
        message: "Should not see this",
        severity: "error",
      });

      // Should not throw
      const result = evaluator.evaluate(createOutputData());

      expect(result.triggered).toBe(false);
    });
  });
});

// ============================================================================
// Processor Composition Integration Tests
// ============================================================================

describe("Processor Composition Integration", () => {
  describe("Dynamic Pipeline Configuration", () => {
    it("should add and remove processors dynamically", async () => {
      const pipeline = new ProcessorPipeline();

      const processor1 = createMessageValidationProcessor();
      const processor2 = createPIIDetectionProcessor();

      pipeline.addInputProcessor(processor1);
      expect(pipeline.getInputProcessors()).toHaveLength(1);

      pipeline.addInputProcessor(processor2);
      expect(pipeline.getInputProcessors()).toHaveLength(2);

      pipeline.removeInputProcessor(processor1.id);
      expect(pipeline.getInputProcessors()).toHaveLength(1);
      expect(pipeline.getInputProcessors()[0].processor.id).toBe(processor2.id);
    });

    it("should update settings dynamically", () => {
      const pipeline = new ProcessorPipeline({
        settings: { maxTotalRetries: 3 },
      });

      expect(pipeline.getSettings().maxTotalRetries).toBe(3);

      pipeline.updateSettings({ maxTotalRetries: 5 });

      expect(pipeline.getSettings().maxTotalRetries).toBe(5);
    });

    it("should clear all processors", () => {
      const pipeline = new ProcessorPipeline({
        inputProcessors: [{ processor: createMessageValidationProcessor() }],
        outputProcessors: [{ processor: createLengthValidationProcessor() }],
      });

      expect(pipeline.getInputProcessors()).toHaveLength(1);
      expect(pipeline.getOutputProcessors()).toHaveLength(1);

      pipeline.clear();

      expect(pipeline.getInputProcessors()).toHaveLength(0);
      expect(pipeline.getOutputProcessors()).toHaveLength(0);
    });
  });

  describe("Conditional Processing", () => {
    it("should skip processor when provider condition not met", async () => {
      const processor = createMessageValidationProcessor();
      const spy = vi.spyOn(processor, "process");

      const pipeline = new ProcessorPipeline({
        inputProcessors: [
          {
            processor,
            config: {
              conditions: {
                providers: ["anthropic"],
              },
            },
          },
        ],
      });

      const inputData = createInputData({
        metadata: createMetadata({ provider: "openai" }),
      });

      await pipeline.processInput(inputData);

      expect(spy).not.toHaveBeenCalled();
    });

    it("should run processor when provider condition met", async () => {
      const processor = createMessageValidationProcessor();
      const spy = vi.spyOn(processor, "process");

      const pipeline = new ProcessorPipeline({
        inputProcessors: [
          {
            processor,
            config: {
              conditions: {
                providers: ["openai"],
              },
            },
          },
        ],
      });

      const inputData = createInputData({
        metadata: createMetadata({ provider: "openai" }),
      });

      await pipeline.processInput(inputData);

      expect(spy).toHaveBeenCalled();
    });

    it("should skip processor when model condition not met", async () => {
      const processor = createMessageValidationProcessor();
      const spy = vi.spyOn(processor, "process");

      const pipeline = new ProcessorPipeline({
        inputProcessors: [
          {
            processor,
            config: {
              conditions: {
                models: ["claude-3-opus"],
              },
            },
          },
        ],
      });

      const inputData = createInputData({
        metadata: createMetadata({ model: "gpt-4o" }),
      });

      await pipeline.processInput(inputData);

      expect(spy).not.toHaveBeenCalled();
    });

    it("should skip disabled processors", async () => {
      const processor = createMessageValidationProcessor();
      const spy = vi.spyOn(processor, "process");

      const pipeline = new ProcessorPipeline({
        inputProcessors: [
          {
            processor,
            config: {
              enabled: false,
            },
          },
        ],
      });

      await pipeline.processInput(createInputData());

      expect(spy).not.toHaveBeenCalled();
    });

    it("should support custom condition functions", async () => {
      const processor = createMessageValidationProcessor();
      const spy = vi.spyOn(processor, "process");

      const pipeline = new ProcessorPipeline({
        inputProcessors: [
          {
            processor,
            config: {
              conditions: {
                custom: (metadata) => metadata.custom.runProcessor === true,
              },
            },
          },
        ],
      });

      // Without custom flag - should not run
      await pipeline.processInput(createInputData());
      expect(spy).not.toHaveBeenCalled();

      // With custom flag - should run
      const inputData = createInputData();
      inputData.metadata.custom.runProcessor = true;
      await pipeline.processInput(inputData);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe("Registry Composition", () => {
    it("should build processors from preset", () => {
      const registry = new ProcessorRegistry();

      registry.registerInputProcessor(createMessageValidationProcessor());
      registry.registerInputProcessor(createPIIDetectionProcessor());
      registry.registerOutputProcessor(createLengthValidationProcessor());

      registry.registerPreset({
        name: "custom",
        description: "Custom preset",
        inputProcessors: [
          { id: "message-validation" },
          { id: "pii-detection", config: { config: { action: "redact" } } },
        ],
        outputProcessors: [
          { id: "length-validation", config: { config: { maxLength: 5000 } } },
        ],
      });

      const config = registry.buildFromPreset("custom");

      expect(config).toBeDefined();
      expect(config!.inputProcessors).toHaveLength(2);
      expect(config!.outputProcessors).toHaveLength(1);
    });

    it("should list all registered processors", () => {
      const registry = new ProcessorRegistry();

      registry.registerInputProcessor(createMessageValidationProcessor());
      registry.registerInputProcessor(createPIIDetectionProcessor());
      registry.registerOutputProcessor(createLengthValidationProcessor());

      const list = registry.listProcessors();

      expect(list.input).toHaveLength(2);
      expect(list.output).toHaveLength(1);
      expect(list.input.some((p) => p.id === "message-validation")).toBe(true);
      expect(list.input.some((p) => p.id === "pii-detection")).toBe(true);
      expect(list.output.some((p) => p.id === "length-validation")).toBe(true);
    });

    it("should get registry statistics", () => {
      const registry = new ProcessorRegistry();

      registry.registerInputProcessor(createMessageValidationProcessor());
      registry.registerInputProcessor(createPIIDetectionProcessor());
      registry.registerOutputProcessor(createLengthValidationProcessor());
      registry.registerPreset(defaultPreset);

      const stats = registry.getStats();

      expect(stats.inputProcessorCount).toBe(2);
      expect(stats.outputProcessorCount).toBe(1);
      expect(stats.presetCount).toBe(1);
    });
  });
});

// ============================================================================
// Performance Benchmark Tests
// ============================================================================

describe("Performance Benchmarks", () => {
  describe("Pipeline Execution Performance", () => {
    it("should process input within acceptable time (< 50ms)", async () => {
      const pipeline = new ProcessorPipeline({
        inputProcessors: [
          { processor: createMessageValidationProcessor() },
          { processor: createPIIDetectionProcessor() },
        ],
      });

      const inputData = createInputData({
        text: "This is a test message with email@example.com",
      });

      const startTime = performance.now();
      const result = await pipeline.processInput(inputData);
      const endTime = performance.now();

      expect(result.totalTime).toBeLessThan(50);
      expect(endTime - startTime).toBeLessThan(100);
    });

    it("should process output within acceptable time (< 50ms)", async () => {
      const pipeline = new ProcessorPipeline({
        outputProcessors: [
          { processor: createLengthValidationProcessor() },
          { processor: createContentFilteringProcessor() },
          { processor: createToxicityCheckProcessor() },
        ],
      });

      const outputData = createOutputData({
        responseText: "This is a normal response without any issues",
      });

      const startTime = performance.now();
      const result = await pipeline.processOutput(outputData);
      const endTime = performance.now();

      expect(result.totalTime).toBeLessThan(50);
      expect(endTime - startTime).toBeLessThan(100);
    });

    it("should handle large message arrays efficiently", async () => {
      const pipeline = new ProcessorPipeline({
        inputProcessors: [
          {
            processor: createMessageValidationProcessor({ maxMessages: 1000 }),
          },
        ],
      });

      const messages = Array.from({ length: 500 }, (_, i) => ({
        id: `msg-${i}`,
        role: "user" as const,
        content: `Message ${i} with some content`,
      }));

      const inputData = createInputData({ messages });

      const startTime = performance.now();
      const result = await pipeline.processInput(inputData);
      const endTime = performance.now();

      expect(result.action).toBe("continue");
      expect(endTime - startTime).toBeLessThan(200);
    });

    it("should handle long text efficiently", async () => {
      const pipeline = new ProcessorPipeline({
        inputProcessors: [
          { processor: createPIIDetectionProcessor() },
          { processor: createContentModerationProcessor() },
        ],
      });

      const longText = "This is a test. ".repeat(5000);
      const inputData = createInputData({ text: longText });

      const startTime = performance.now();
      const result = await pipeline.processInput(inputData);
      const endTime = performance.now();

      expect(result.action).toBe("continue");
      expect(endTime - startTime).toBeLessThan(500);
    });
  });

  describe("Tripwire Evaluation Performance", () => {
    it("should evaluate tripwires efficiently", () => {
      const evaluator = createDefaultTripwireEvaluator();
      const outputData = createOutputData();

      const startTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        evaluator.evaluate(outputData);
      }
      const endTime = performance.now();

      // 1000 evaluations should complete in < 100ms
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe("Registry Lookup Performance", () => {
    it("should lookup processors efficiently", () => {
      const registry = new ProcessorRegistry();

      // Register many processors
      for (let i = 0; i < 100; i++) {
        registry.registerInputProcessor({
          id: `input-${i}`,
          name: `Input Processor ${i}`,
          process: async (data) => ({ action: "continue", data }),
        });
        registry.registerOutputProcessor({
          id: `output-${i}`,
          name: `Output Processor ${i}`,
          process: async (data) => ({ action: "continue", data }),
        });
      }

      const startTime = performance.now();
      for (let i = 0; i < 10000; i++) {
        registry.getInputProcessor(`input-${i % 100}`);
        registry.getOutputProcessor(`output-${i % 100}`);
      }
      const endTime = performance.now();

      // 20000 lookups should complete in < 50ms
      expect(endTime - startTime).toBeLessThan(50);
    });
  });
});

// ============================================================================
// Default Registry Integration Tests
// ============================================================================

describe("Default Registry Integration", () => {
  beforeEach(() => {
    // Re-initialize to ensure clean state
    defaultRegistry.clear();
    initializeDefaultProcessors();
  });

  it("should have all built-in input processors registered", () => {
    expect(defaultRegistry.hasInputProcessor("message-validation")).toBe(true);
    expect(defaultRegistry.hasInputProcessor("pii-detection")).toBe(true);
    expect(defaultRegistry.hasInputProcessor("content-moderation")).toBe(true);
    expect(defaultRegistry.hasInputProcessor("memory-retrieval")).toBe(true);
    expect(defaultRegistry.hasInputProcessor("semantic-context")).toBe(true);
  });

  it("should have all built-in output processors registered", () => {
    expect(defaultRegistry.hasOutputProcessor("response-validation")).toBe(
      true,
    );
    expect(defaultRegistry.hasOutputProcessor("length-validation")).toBe(true);
    expect(defaultRegistry.hasOutputProcessor("content-filtering")).toBe(true);
    expect(defaultRegistry.hasOutputProcessor("toxicity-check")).toBe(true);
    expect(defaultRegistry.hasOutputProcessor("memory-persistence")).toBe(true);
  });

  it("should have all built-in presets registered", () => {
    expect(defaultRegistry.getPreset("default")).toBeDefined();
    expect(defaultRegistry.getPreset("security")).toBeDefined();
    expect(defaultRegistry.getPreset("strict")).toBeDefined();
    expect(defaultRegistry.getPreset("quality")).toBeDefined();
    expect(defaultRegistry.getPreset("minimal")).toBeDefined();
  });

  it("should build working pipelines from presets", async () => {
    const securityConfig = defaultRegistry.buildFromPreset("security");
    expect(securityConfig).toBeDefined();

    const pipeline = new ProcessorPipeline({
      inputProcessors: securityConfig!.inputProcessors,
      outputProcessors: securityConfig!.outputProcessors,
    });

    const inputResult = await pipeline.processInput(
      createInputData({ text: "Hello, how are you?" }),
    );
    expect(inputResult.action).toBe("continue");

    const outputResult = await pipeline.processOutput(
      createOutputData({ responseText: "I am doing well!" }),
    );
    expect(outputResult.action).toBe("continue");
  });
});
