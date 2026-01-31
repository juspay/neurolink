/**
 * @file Tests for SDK integration of I/O Processors with NeuroLink class
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NeuroLink } from "../../src/lib/neurolink.js";
import type {
  InputProcessor,
  OutputProcessor,
  InputProcessorData,
  OutputProcessorData,
  ProcessorMetadata,
} from "../../src/lib/processors/types.js";

describe("NeuroLink Processor Integration", () => {
  let neurolink: NeuroLink;

  beforeEach(() => {
    // Create NeuroLink instance without processors enabled
    neurolink = new NeuroLink();
  });

  describe("getProcessorRegistry", () => {
    it("should return the processor registry", () => {
      const registry = neurolink.getProcessorRegistry();

      expect(registry).toBeDefined();
      expect(typeof registry.getStats).toBe("function");
    });

    it("should have built-in processors registered", () => {
      const registry = neurolink.getProcessorRegistry();

      expect(registry.hasInputProcessor("message-validation")).toBe(true);
      expect(registry.hasOutputProcessor("length-validation")).toBe(true);
    });

    it("should have built-in presets registered", () => {
      const registry = neurolink.getProcessorRegistry();

      expect(registry.getPreset("default")).toBeDefined();
      expect(registry.getPreset("strict")).toBeDefined();
      expect(registry.getPreset("quality")).toBeDefined();
      expect(registry.getPreset("minimal")).toBeDefined();
    });
  });

  describe("getProcessorPipeline", () => {
    it("should return undefined when processors not enabled", () => {
      const pipeline = neurolink.getProcessorPipeline();

      expect(pipeline).toBeUndefined();
    });

    it("should return pipeline when processors are enabled", () => {
      neurolink = new NeuroLink({
        processors: {
          enabled: true,
        },
      });

      const pipeline = neurolink.getProcessorPipeline();

      expect(pipeline).toBeDefined();
    });
  });

  describe("createProcessorPipeline", () => {
    it("should create a new pipeline with configuration", () => {
      const pipeline = neurolink.createProcessorPipeline({
        name: "custom-pipeline",
        stopOnAbort: false,
        pipelineTimeoutMs: 10000,
      });

      expect(pipeline).toBeDefined();
      expect(pipeline.getConfig().name).toBe("custom-pipeline");
      expect(pipeline.getConfig().stopOnAbort).toBe(false);
      expect(pipeline.getConfig().pipelineTimeoutMs).toBe(10000);
    });
  });

  describe("setProcessorPreset", () => {
    it("should enable processors and apply preset", () => {
      neurolink.setProcessorPreset("default");

      expect(neurolink.areProcessorsEnabled()).toBe(true);
      expect(neurolink.getProcessorPipeline()).toBeDefined();
    });

    it("should apply different presets", () => {
      neurolink.setProcessorPreset("strict");

      const pipeline = neurolink.getProcessorPipeline();
      expect(pipeline).toBeDefined();

      const inputProcessors = pipeline!.getInputProcessors();
      expect(inputProcessors.length).toBeGreaterThan(0);
    });
  });

  describe("addInputProcessor", () => {
    it("should add custom input processor", () => {
      const customProcessor: InputProcessor = {
        id: "custom-input",
        name: "Custom Input",
        description: "A custom input processor",
        priority: 50,
        async process(data, metadata) {
          return { action: "continue", data, metadata };
        },
      };

      neurolink.addInputProcessor(customProcessor);

      expect(neurolink.areProcessorsEnabled()).toBe(true);
      const registry = neurolink.getProcessorRegistry();
      expect(registry.hasInputProcessor("custom-input")).toBe(true);
    });

    it("should add processor with custom configuration", () => {
      const customProcessor: InputProcessor<{ customOption: string }> = {
        id: "configurable-input",
        name: "Configurable Input",
        description: "A configurable processor",
        priority: 50,
        async process(data, metadata, config) {
          return { action: "continue", data, metadata };
        },
      };

      neurolink.addInputProcessor(customProcessor, {
        config: { customOption: "value" },
      });

      expect(neurolink.areProcessorsEnabled()).toBe(true);
    });
  });

  describe("addOutputProcessor", () => {
    it("should add custom output processor", () => {
      const customProcessor: OutputProcessor = {
        id: "custom-output",
        name: "Custom Output",
        description: "A custom output processor",
        priority: 50,
        async process(data, metadata) {
          return { action: "continue", data, metadata };
        },
      };

      neurolink.addOutputProcessor(customProcessor);

      expect(neurolink.areProcessorsEnabled()).toBe(true);
      const registry = neurolink.getProcessorRegistry();
      expect(registry.hasOutputProcessor("custom-output")).toBe(true);
    });
  });

  describe("setProcessorsEnabled", () => {
    it("should enable processors", () => {
      neurolink.setProcessorPreset("default");
      expect(neurolink.areProcessorsEnabled()).toBe(true);

      neurolink.setProcessorsEnabled(false);
      expect(neurolink.areProcessorsEnabled()).toBe(false);

      neurolink.setProcessorsEnabled(true);
      expect(neurolink.areProcessorsEnabled()).toBe(true);
    });
  });

  describe("processInput", () => {
    it("should process input when pipeline exists", async () => {
      neurolink.setProcessorPreset("default");

      const inputData: InputProcessorData = {
        text: "Hello, world!",
      };

      const result = await neurolink.processInput(inputData);

      expect(result.action).toBe("continue");
      expect(result.data?.text).toBe("Hello, world!");
    });

    it("should return passthrough result when pipeline not set", async () => {
      const inputData: InputProcessorData = {
        text: "Hello, world!",
      };

      const result = await neurolink.processInput(inputData);

      expect(result.action).toBe("continue");
      expect(result.data?.text).toBe("Hello, world!");
      expect(result.processorsExecuted).toBe(0);
    });

    it("should pass metadata through processing", async () => {
      neurolink.setProcessorPreset("default");

      const inputData: InputProcessorData = {
        text: "Test message",
      };

      const result = await neurolink.processInput(inputData, {
        provider: "openai",
        sessionId: "test-session",
      });

      expect(result.metadata.provider).toBe("openai");
      expect(result.metadata.sessionId).toBe("test-session");
    });
  });

  describe("processOutput", () => {
    it("should process output when pipeline exists", async () => {
      neurolink.setProcessorPreset("default");

      const outputData: OutputProcessorData = {
        responseText: "This is a response.",
      };

      const result = await neurolink.processOutput(outputData);

      expect(result.action).toBe("continue");
      expect(result.data?.responseText).toBe("This is a response.");
    });

    it("should return passthrough result when pipeline not set", async () => {
      const outputData: OutputProcessorData = {
        responseText: "This is a response.",
      };

      const result = await neurolink.processOutput(outputData);

      expect(result.action).toBe("continue");
      expect(result.data?.responseText).toBe("This is a response.");
      expect(result.processorsExecuted).toBe(0);
    });
  });

  describe("Constructor with processor config", () => {
    it("should initialize with processors enabled", () => {
      const nl = new NeuroLink({
        processors: {
          enabled: true,
          preset: "default",
        },
      });

      expect(nl.areProcessorsEnabled()).toBe(true);
      expect(nl.getProcessorPipeline()).toBeDefined();
    });

    it("should use specified preset", () => {
      const nl = new NeuroLink({
        processors: {
          enabled: true,
          preset: "strict",
        },
      });

      const pipeline = nl.getProcessorPipeline();
      expect(pipeline).toBeDefined();
    });

    it("should apply pipeline configuration", () => {
      const nl = new NeuroLink({
        processors: {
          enabled: true,
          pipelineConfig: {
            name: "custom-pipeline",
            stopOnAbort: false,
            pipelineTimeoutMs: 5000,
          },
        },
      });

      const pipeline = nl.getProcessorPipeline();
      expect(pipeline?.getConfig().name).toBe("custom-pipeline");
    });
  });

  describe("Custom processor execution", () => {
    it("should execute custom processors in pipeline", async () => {
      let executed = false;

      const customProcessor: InputProcessor = {
        id: "tracking-processor",
        name: "Tracking Processor",
        description: "Tracks execution",
        priority: 100,
        async process(data, metadata) {
          executed = true;
          return {
            action: "continue",
            data: { ...data, text: data.text.toUpperCase() },
            metadata,
          };
        },
      };

      neurolink.addInputProcessor(customProcessor);

      const result = await neurolink.processInput({
        text: "hello",
      });

      expect(executed).toBe(true);
      expect(result.data?.text).toBe("HELLO");
    });
  });
});
