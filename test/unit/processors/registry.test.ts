/**
 * ProcessorRegistry Unit Tests
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  defaultRegistry,
  ProcessorRegistry,
} from "../../../src/lib/processors/registry.js";
import type {
  InputProcessor,
  OutputProcessor,
  ProcessorPreset,
} from "../../../src/lib/types/ioProcessor.js";

// Mock processors for testing
const createMockInputProcessor = (
  id: string,
  priority = 50,
): InputProcessor => ({
  id,
  name: `Input Processor ${id}`,
  description: `Test input processor ${id}`,
  priority,
  process: async (data) => ({ action: "continue", data }),
});

const createMockOutputProcessor = (
  id: string,
  priority = 50,
): OutputProcessor => ({
  id,
  name: `Output Processor ${id}`,
  description: `Test output processor ${id}`,
  priority,
  process: async (data) => ({ action: "continue", data }),
});

describe("ProcessorRegistry", () => {
  let registry: ProcessorRegistry;

  beforeEach(() => {
    registry = new ProcessorRegistry();
  });

  describe("registerInputProcessor", () => {
    it("should register a new input processor", () => {
      const processor = createMockInputProcessor("test-input");

      registry.registerInputProcessor(processor);

      expect(registry.hasInputProcessor("test-input")).toBe(true);
      expect(registry.getInputProcessor("test-input")).toBe(processor);
    });

    it("should throw error when registering duplicate without replace flag", () => {
      const processor = createMockInputProcessor("duplicate");

      registry.registerInputProcessor(processor);

      expect(() => {
        registry.registerInputProcessor(processor);
      }).toThrow("already registered");
    });

    it("should allow replacing existing processor with replace flag", () => {
      const processor1 = createMockInputProcessor("replace-test");
      const processor2: InputProcessor = {
        id: "replace-test",
        name: "Updated Name",
        process: async (data) => ({ action: "continue", data }),
      };

      registry.registerInputProcessor(processor1);
      registry.registerInputProcessor(processor2, { replace: true });

      expect(registry.getInputProcessor("replace-test")?.name).toBe(
        "Updated Name",
      );
    });

    it("should accept default config", () => {
      const processor = createMockInputProcessor("with-config");
      const config = { enabled: true, config: { threshold: 0.5 } };

      registry.registerInputProcessor(processor, { defaultConfig: config });

      const entry = registry.getInputProcessorEntry("with-config");
      expect(entry?.defaultConfig).toEqual(config);
    });
  });

  describe("registerOutputProcessor", () => {
    it("should register a new output processor", () => {
      const processor = createMockOutputProcessor("test-output");

      registry.registerOutputProcessor(processor);

      expect(registry.hasOutputProcessor("test-output")).toBe(true);
      expect(registry.getOutputProcessor("test-output")).toBe(processor);
    });

    it("should throw error when registering duplicate without replace flag", () => {
      const processor = createMockOutputProcessor("duplicate");

      registry.registerOutputProcessor(processor);

      expect(() => {
        registry.registerOutputProcessor(processor);
      }).toThrow("already registered");
    });
  });

  describe("getInputProcessor", () => {
    it("should return processor when exists", () => {
      const processor = createMockInputProcessor("findable");
      registry.registerInputProcessor(processor);

      const found = registry.getInputProcessor("findable");

      expect(found).toBe(processor);
    });

    it("should return undefined when not exists", () => {
      const found = registry.getInputProcessor("nonexistent");

      expect(found).toBeUndefined();
    });
  });

  describe("unregisterInputProcessor", () => {
    it("should remove registered processor", () => {
      const processor = createMockInputProcessor("removable");
      registry.registerInputProcessor(processor);

      const result = registry.unregisterInputProcessor("removable");

      expect(result).toBe(true);
      expect(registry.hasInputProcessor("removable")).toBe(false);
    });

    it("should return false for non-existent processor", () => {
      const result = registry.unregisterInputProcessor("nonexistent");

      expect(result).toBe(false);
    });
  });

  describe("unregisterOutputProcessor", () => {
    it("should remove registered processor", () => {
      const processor = createMockOutputProcessor("removable");
      registry.registerOutputProcessor(processor);

      const result = registry.unregisterOutputProcessor("removable");

      expect(result).toBe(true);
      expect(registry.hasOutputProcessor("removable")).toBe(false);
    });
  });

  describe("registerPreset", () => {
    it("should register a preset", () => {
      const preset: ProcessorPreset = {
        name: "test-preset",
        description: "Test preset",
        inputProcessors: [{ id: "input1" }],
        outputProcessors: [{ id: "output1" }],
      };

      registry.registerPreset(preset);

      expect(registry.getPreset("test-preset")).toEqual(preset);
    });
  });

  describe("getPreset", () => {
    it("should return preset when exists", () => {
      const preset: ProcessorPreset = {
        name: "existing",
        description: "Existing preset",
        inputProcessors: [],
        outputProcessors: [],
      };
      registry.registerPreset(preset);

      const found = registry.getPreset("existing");

      expect(found).toEqual(preset);
    });

    it("should return undefined when not exists", () => {
      const found = registry.getPreset("nonexistent");

      expect(found).toBeUndefined();
    });
  });

  describe("getAllPresets", () => {
    it("should return all registered presets", () => {
      const preset1: ProcessorPreset = {
        name: "preset1",
        description: "First",
        inputProcessors: [],
        outputProcessors: [],
      };
      const preset2: ProcessorPreset = {
        name: "preset2",
        description: "Second",
        inputProcessors: [],
        outputProcessors: [],
      };

      registry.registerPreset(preset1);
      registry.registerPreset(preset2);

      const presets = registry.getAllPresets();

      expect(presets).toHaveLength(2);
      expect(presets).toContainEqual(preset1);
      expect(presets).toContainEqual(preset2);
    });
  });

  describe("listProcessors", () => {
    it("should list all registered processors", () => {
      registry.registerInputProcessor(createMockInputProcessor("input1", 80));
      registry.registerInputProcessor(createMockInputProcessor("input2", 60));
      registry.registerOutputProcessor(
        createMockOutputProcessor("output1", 70),
      );

      const list = registry.listProcessors();

      expect(list.input).toHaveLength(2);
      expect(list.output).toHaveLength(1);
      expect(list.input.find((p) => p.id === "input1")?.priority).toBe(80);
    });
  });

  describe("getAllInputProcessors", () => {
    it("should return all input processors", () => {
      const proc1 = createMockInputProcessor("in1");
      const proc2 = createMockInputProcessor("in2");

      registry.registerInputProcessor(proc1);
      registry.registerInputProcessor(proc2);

      const processors = registry.getAllInputProcessors();

      expect(processors).toHaveLength(2);
      expect(processors).toContain(proc1);
      expect(processors).toContain(proc2);
    });
  });

  describe("getAllOutputProcessors", () => {
    it("should return all output processors", () => {
      const proc1 = createMockOutputProcessor("out1");
      const proc2 = createMockOutputProcessor("out2");

      registry.registerOutputProcessor(proc1);
      registry.registerOutputProcessor(proc2);

      const processors = registry.getAllOutputProcessors();

      expect(processors).toHaveLength(2);
    });
  });

  describe("buildFromPreset", () => {
    it("should build processors from preset", () => {
      const inputProc = createMockInputProcessor("preset-input");
      const outputProc = createMockOutputProcessor("preset-output");

      registry.registerInputProcessor(inputProc);
      registry.registerOutputProcessor(outputProc);

      const preset: ProcessorPreset = {
        name: "build-test",
        description: "Build test preset",
        inputProcessors: [{ id: "preset-input" }],
        outputProcessors: [{ id: "preset-output" }],
      };
      registry.registerPreset(preset);

      const built = registry.buildFromPreset("build-test");

      expect(built).toBeDefined();
      expect(built?.inputProcessors).toHaveLength(1);
      expect(built?.inputProcessors[0].processor).toBe(inputProc);
      expect(built?.outputProcessors).toHaveLength(1);
      expect(built?.outputProcessors[0].processor).toBe(outputProc);
    });

    it("should return undefined for non-existent preset", () => {
      const built = registry.buildFromPreset("nonexistent");

      expect(built).toBeUndefined();
    });

    it("should skip missing processors when building from preset", () => {
      const inputProc = createMockInputProcessor("existing");
      registry.registerInputProcessor(inputProc);

      const preset: ProcessorPreset = {
        name: "partial",
        description: "Partial preset",
        inputProcessors: [{ id: "existing" }, { id: "missing" }],
        outputProcessors: [{ id: "also-missing" }],
      };
      registry.registerPreset(preset);

      const built = registry.buildFromPreset("partial");

      expect(built?.inputProcessors).toHaveLength(1);
      expect(built?.outputProcessors).toHaveLength(0);
    });

    it("should use preset config over default config", () => {
      const processor = createMockInputProcessor("configurable");
      registry.registerInputProcessor(processor, {
        defaultConfig: { enabled: true, config: { value: "default" } },
      });

      const preset: ProcessorPreset = {
        name: "custom-config",
        description: "Custom config preset",
        inputProcessors: [
          {
            id: "configurable",
            config: { enabled: false, config: { value: "preset" } },
          },
        ],
        outputProcessors: [],
      };
      registry.registerPreset(preset);

      const built = registry.buildFromPreset("custom-config");

      expect(built?.inputProcessors[0].config?.enabled).toBe(false);
      expect(built?.inputProcessors[0].config?.config).toEqual({
        value: "preset",
      });
    });
  });

  describe("clear", () => {
    it("should clear all registrations", () => {
      registry.registerInputProcessor(createMockInputProcessor("in"));
      registry.registerOutputProcessor(createMockOutputProcessor("out"));
      registry.registerPreset({
        name: "preset",
        description: "Test",
        inputProcessors: [],
        outputProcessors: [],
      });

      registry.clear();

      expect(registry.getStats().inputProcessorCount).toBe(0);
      expect(registry.getStats().outputProcessorCount).toBe(0);
      expect(registry.getStats().presetCount).toBe(0);
    });
  });

  describe("getStats", () => {
    it("should return correct counts", () => {
      registry.registerInputProcessor(createMockInputProcessor("in1"));
      registry.registerInputProcessor(createMockInputProcessor("in2"));
      registry.registerOutputProcessor(createMockOutputProcessor("out1"));
      registry.registerPreset({
        name: "p1",
        description: "Test",
        inputProcessors: [],
        outputProcessors: [],
      });

      const stats = registry.getStats();

      expect(stats.inputProcessorCount).toBe(2);
      expect(stats.outputProcessorCount).toBe(1);
      expect(stats.presetCount).toBe(1);
    });
  });
});

describe("defaultRegistry", () => {
  it("should be a ProcessorRegistry instance", () => {
    expect(defaultRegistry).toBeInstanceOf(ProcessorRegistry);
  });
});
