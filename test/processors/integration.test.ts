/**
 * @file Integration tests for the I/O Processor system
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ProcessorPipeline,
  ProcessorRegistry,
  messageValidationProcessor,
  lengthValidationProcessor,
  createDefaultMetadata,
  defaultPreset,
  strictPreset,
} from "../../src/lib/processors/index.js";
import type {
  InputProcessor,
  OutputProcessor,
  InputProcessorData,
  OutputProcessorData,
  ProcessorMetadata,
  ProcessorResult,
} from "../../src/lib/processors/types.js";

describe("Processor Integration", () => {
  describe("ProcessorRegistry", () => {
    let registry: ProcessorRegistry;

    beforeEach(() => {
      registry = new ProcessorRegistry();
    });

    it("should register and retrieve input processors", () => {
      registry.registerInputProcessor(messageValidationProcessor);

      const registered = registry.getInputProcessor("message-validation");
      expect(registered).toBeDefined();
      expect(registered?.processor.id).toBe("message-validation");
    });

    it("should register and retrieve output processors", () => {
      registry.registerOutputProcessor(lengthValidationProcessor);

      const registered = registry.getOutputProcessor("length-validation");
      expect(registered).toBeDefined();
      expect(registered?.processor.id).toBe("length-validation");
    });

    it("should check for processor existence", () => {
      registry.registerInputProcessor(messageValidationProcessor);

      expect(registry.hasInputProcessor("message-validation")).toBe(true);
      expect(registry.hasInputProcessor("non-existent")).toBe(false);
    });

    it("should unregister processors", () => {
      registry.registerInputProcessor(messageValidationProcessor);
      expect(registry.hasInputProcessor("message-validation")).toBe(true);

      const result = registry.unregisterInputProcessor("message-validation");
      expect(result).toBe(true);
      expect(registry.hasInputProcessor("message-validation")).toBe(false);
    });

    it("should throw on duplicate registration without replace", () => {
      registry.registerInputProcessor(messageValidationProcessor);

      expect(() => {
        registry.registerInputProcessor(messageValidationProcessor);
      }).toThrow();
    });

    it("should allow replacement with replace option", () => {
      registry.registerInputProcessor(messageValidationProcessor);
      registry.registerInputProcessor(messageValidationProcessor, undefined, {
        replace: true,
      });

      expect(registry.hasInputProcessor("message-validation")).toBe(true);
    });

    it("should register and retrieve presets", () => {
      registry.registerInputProcessor(messageValidationProcessor);
      registry.registerOutputProcessor(lengthValidationProcessor);
      registry.registerPreset(defaultPreset);

      const preset = registry.getPreset("default");
      expect(preset).toBeDefined();
      expect(preset?.name).toBe("default");
    });

    it("should build processors from preset", () => {
      registry.registerInputProcessor(messageValidationProcessor);
      registry.registerOutputProcessor(lengthValidationProcessor);
      registry.registerPreset(defaultPreset);

      const built = registry.buildFromPreset("default");
      expect(built.inputProcessors.length).toBeGreaterThan(0);
      expect(built.outputProcessors.length).toBeGreaterThan(0);
    });

    it("should provide registry statistics", () => {
      registry.registerInputProcessor(messageValidationProcessor);
      registry.registerOutputProcessor(lengthValidationProcessor);
      registry.registerPreset(defaultPreset);

      const stats = registry.getStats();
      expect(stats.inputProcessorCount).toBe(1);
      expect(stats.outputProcessorCount).toBe(1);
      expect(stats.presetCount).toBe(1);
    });

    it("should list all processors with summaries", () => {
      registry.registerInputProcessor(messageValidationProcessor);
      registry.registerOutputProcessor(lengthValidationProcessor);

      const list = registry.listProcessors();
      expect(list.input.length).toBe(1);
      expect(list.output.length).toBe(1);
      expect(list.input[0].id).toBe("message-validation");
      expect(list.input[0].name).toBe("Message Validation");
    });

    it("should clear all registrations", () => {
      registry.registerInputProcessor(messageValidationProcessor);
      registry.registerOutputProcessor(lengthValidationProcessor);

      registry.clear();

      expect(registry.hasInputProcessor("message-validation")).toBe(false);
      expect(registry.hasOutputProcessor("length-validation")).toBe(false);
    });
  });

  describe("ProcessorPipeline", () => {
    let pipeline: ProcessorPipeline;

    beforeEach(() => {
      pipeline = new ProcessorPipeline({
        name: "test-pipeline",
        stopOnAbort: true,
      });
    });

    it("should add and list input processors", () => {
      pipeline.addInputProcessor(messageValidationProcessor);

      const processors = pipeline.getInputProcessors();
      expect(processors.length).toBe(1);
      expect(processors[0].processor.id).toBe("message-validation");
    });

    it("should add and list output processors", () => {
      pipeline.addOutputProcessor(lengthValidationProcessor);

      const processors = pipeline.getOutputProcessors();
      expect(processors.length).toBe(1);
      expect(processors[0].processor.id).toBe("length-validation");
    });

    it("should process input data successfully", async () => {
      pipeline.addInputProcessor(messageValidationProcessor);

      const inputData: InputProcessorData = {
        text: "Hello, world!",
      };

      const result = await pipeline.processInput(inputData);

      expect(result.action).toBe("continue");
      expect(result.data?.text).toBe("Hello, world!");
      expect(result.processorsExecuted).toBe(1);
    });

    it("should trim whitespace in message validation", async () => {
      pipeline.addInputProcessor(messageValidationProcessor, {
        config: { trimWhitespace: true },
      });

      const inputData: InputProcessorData = {
        text: "  Hello, world!  ",
      };

      const result = await pipeline.processInput(inputData);

      expect(result.action).toBe("continue");
      expect(result.data?.text).toBe("Hello, world!");
    });

    it("should abort on empty content when required", async () => {
      pipeline.addInputProcessor(messageValidationProcessor, {
        config: { requireContent: true },
      });

      const inputData: InputProcessorData = {
        text: "   ",
      };

      const result = await pipeline.processInput(inputData);

      expect(result.action).toBe("abort");
      expect(result.feedback).toContain("empty");
    });

    it("should process output data successfully", async () => {
      pipeline.addOutputProcessor(lengthValidationProcessor);

      const outputData: OutputProcessorData = {
        responseText: "This is a test response.",
      };

      const result = await pipeline.processOutput(outputData);

      expect(result.action).toBe("continue");
      expect(result.data?.responseText).toBe("This is a test response.");
    });

    it("should truncate long responses with truncate action", async () => {
      pipeline.addOutputProcessor(lengthValidationProcessor, {
        config: { maxLength: 10, action: "truncate" },
      });

      const outputData: OutputProcessorData = {
        responseText: "This is a very long response that exceeds the limit.",
      };

      const result = await pipeline.processOutput(outputData);

      expect(result.action).toBe("continue");
      expect(result.data?.responseText?.length).toBe(10);
    });

    it("should track processor execution in trace", async () => {
      pipeline.addInputProcessor(messageValidationProcessor);

      const inputData: InputProcessorData = {
        text: "Test message",
      };

      const result = await pipeline.processInput(inputData);

      expect(result.metadata.processorTrace.length).toBe(1);
      expect(result.metadata.processorTrace[0].processorId).toBe(
        "message-validation",
      );
      expect(result.metadata.processorTrace[0].action).toBe("continue");
    });

    it("should accumulate issues from processors", async () => {
      pipeline.addOutputProcessor(lengthValidationProcessor, {
        config: { maxLength: 10, action: "truncate" },
      });

      const outputData: OutputProcessorData = {
        responseText: "This is too long and will be truncated with a warning.",
      };

      const result = await pipeline.processOutput(outputData);

      expect(result.metadata.issues.length).toBeGreaterThan(0);
      expect(result.metadata.issues.some((i) => i.category === "quality")).toBe(
        true,
      );
    });

    it("should execute processors in priority order", async () => {
      const executionOrder: string[] = [];

      const lowPriorityProcessor: InputProcessor = {
        id: "low-priority",
        name: "Low Priority",
        description: "Executes last",
        priority: 10,
        async process(data, metadata) {
          executionOrder.push("low");
          return { action: "continue", data, metadata };
        },
      };

      const highPriorityProcessor: InputProcessor = {
        id: "high-priority",
        name: "High Priority",
        description: "Executes first",
        priority: 100,
        async process(data, metadata) {
          executionOrder.push("high");
          return { action: "continue", data, metadata };
        },
      };

      pipeline.addInputProcessor(lowPriorityProcessor);
      pipeline.addInputProcessor(highPriorityProcessor);

      await pipeline.processInput({ text: "test" });

      expect(executionOrder).toEqual(["high", "low"]);
    });

    it("should stop on abort when stopOnAbort is true", async () => {
      const executionOrder: string[] = [];

      const abortingProcessor: InputProcessor = {
        id: "aborting",
        name: "Aborting",
        description: "Aborts processing",
        priority: 100,
        async process(_data, metadata) {
          executionOrder.push("aborting");
          return { action: "abort", feedback: "Aborted", metadata };
        },
      };

      const neverExecuted: InputProcessor = {
        id: "never-executed",
        name: "Never Executed",
        description: "Should not execute",
        priority: 10,
        async process(data, metadata) {
          executionOrder.push("never");
          return { action: "continue", data, metadata };
        },
      };

      pipeline.addInputProcessor(abortingProcessor);
      pipeline.addInputProcessor(neverExecuted);

      const result = await pipeline.processInput({ text: "test" });

      expect(result.action).toBe("abort");
      expect(executionOrder).toEqual(["aborting"]);
    });

    it("should pass metadata through pipeline", async () => {
      pipeline.addInputProcessor(messageValidationProcessor);

      const inputData: InputProcessorData = {
        text: "Test message",
      };

      const result = await pipeline.processInput(inputData, {
        provider: "openai",
        model: "gpt-4",
        sessionId: "test-session",
      });

      expect(result.metadata.provider).toBe("openai");
      expect(result.metadata.model).toBe("gpt-4");
      expect(result.metadata.sessionId).toBe("test-session");
    });

    it("should remove processors by ID", () => {
      pipeline.addInputProcessor(messageValidationProcessor);
      expect(pipeline.getInputProcessors().length).toBe(1);

      const removed = pipeline.removeInputProcessor("message-validation");
      expect(removed).toBe(true);
      expect(pipeline.getInputProcessors().length).toBe(0);
    });

    it("should clear all processors", () => {
      pipeline.addInputProcessor(messageValidationProcessor);
      pipeline.addOutputProcessor(lengthValidationProcessor);

      pipeline.clear();

      expect(pipeline.getInputProcessors().length).toBe(0);
      expect(pipeline.getOutputProcessors().length).toBe(0);
    });
  });

  describe("Type Utilities", () => {
    it("should create default metadata", () => {
      const metadata = createDefaultMetadata();

      expect(metadata.issues).toEqual([]);
      expect(metadata.processorTrace).toEqual([]);
    });

    it("should create default metadata with overrides", () => {
      const metadata = createDefaultMetadata({
        provider: "anthropic",
        sessionId: "test-123",
      });

      expect(metadata.provider).toBe("anthropic");
      expect(metadata.sessionId).toBe("test-123");
      expect(metadata.issues).toEqual([]);
    });
  });

  describe("End-to-End Processing", () => {
    it("should process input and output with full pipeline", async () => {
      const pipeline = new ProcessorPipeline({
        name: "e2e-pipeline",
        stopOnAbort: true,
      });

      pipeline.addInputProcessor(messageValidationProcessor, {
        config: { trimWhitespace: true, minLength: 5 },
      });
      pipeline.addOutputProcessor(lengthValidationProcessor, {
        config: { maxLength: 100, action: "truncate" },
      });

      // Process input
      const inputData: InputProcessorData = {
        text: "  What is the meaning of life?  ",
      };
      const inputResult = await pipeline.processInput(inputData);

      expect(inputResult.action).toBe("continue");
      expect(inputResult.data?.text).toBe("What is the meaning of life?");

      // Simulate AI response
      const outputData: OutputProcessorData = {
        responseText:
          "The meaning of life is a philosophical question concerning the purpose and significance of life or existence in general.",
        originalPrompt: inputResult.data?.text,
      };

      // Process output with metadata from input processing
      const outputResult = await pipeline.processOutput(
        outputData,
        inputResult.metadata,
      );

      expect(outputResult.action).toBe("continue");
      expect(outputResult.data?.responseText.length).toBeLessThanOrEqual(100);
      // Trace includes both input (from passed metadata) and output processor traces
      expect(outputResult.metadata.processorTrace.length).toBe(2);
    });
  });
});
