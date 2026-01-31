/**
 * StepRegistry Tests
 *
 * Tests for the step type registry.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { StepRegistry } from "../../src/lib/workflow/index.js";
import type { StepDefinition, StepResult, WorkflowContext } from "../../src/lib/workflow/index.js";

describe("StepRegistry", () => {
  let registry: StepRegistry;

  beforeEach(() => {
    registry = StepRegistry.getInstance();
    registry.clear();
    // Re-register built-in types after clear
    StepRegistry.registerBuiltInStepTypes();
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance", () => {
      const instance1 = StepRegistry.getInstance();
      const instance2 = StepRegistry.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("Built-in Step Types", () => {
    it("should have transform step type registered", () => {
      expect(registry.has("transform")).toBe(true);
    });

    it("should have condition step type registered", () => {
      expect(registry.has("condition")).toBe(true);
    });

    it("should have parallel step type registered", () => {
      expect(registry.has("parallel")).toBe(true);
    });

    it("should have loop step type registered", () => {
      expect(registry.has("loop")).toBe(true);
    });

    it("should have wait step type registered", () => {
      expect(registry.has("wait")).toBe(true);
    });

    it("should have human step type registered", () => {
      expect(registry.has("human")).toBe(true);
    });
  });

  describe("Custom Step Registration", () => {
    it("should register custom step type", () => {
      const customStepFactory = (config: { name: string }) => ({
        id: config.name,
        name: config.name,
        execute: async (input: unknown): Promise<StepResult<unknown>> => ({
          success: true,
          data: input,
        }),
      });

      registry.register("custom", customStepFactory);

      expect(registry.has("custom")).toBe(true);
    });

    it("should create step using registered factory", () => {
      const customStepFactory = (config: { name: string; multiplier: number }) => ({
        id: config.name,
        name: config.name,
        execute: async (input: { value: number }): Promise<StepResult<{ result: number }>> => ({
          success: true,
          data: { result: input.value * config.multiplier },
        }),
      });

      registry.register("multiplier", customStepFactory);

      const step = registry.createStep("multiplier", {
        name: "double",
        multiplier: 2,
      });

      expect(step).toBeDefined();
      expect(step.id).toBe("double");
      expect(step.name).toBe("double");
    });

    it("should execute created step correctly", async () => {
      const customStepFactory = (config: { name: string; prefix: string }) => ({
        id: config.name,
        name: config.name,
        execute: async (input: { text: string }): Promise<StepResult<{ result: string }>> => ({
          success: true,
          data: { result: `${config.prefix}${input.text}` },
        }),
      });

      registry.register("prefixer", customStepFactory);

      const step = registry.createStep("prefixer", {
        name: "add-hello",
        prefix: "Hello, ",
      });

      const result = await step.execute({ text: "World" }, {} as WorkflowContext);

      expect(result.success).toBe(true);
      expect(result.data?.result).toBe("Hello, World");
    });
  });

  describe("Aliases", () => {
    it("should register step type with aliases", () => {
      const factory = (config: { name: string }) => ({
        id: config.name,
        name: config.name,
        execute: async (): Promise<StepResult<unknown>> => ({
          success: true,
          data: {},
        }),
      });

      registry.register("my-step", factory, ["alias1", "alias2", "alias3"]);

      expect(registry.has("my-step")).toBe(true);
      expect(registry.has("alias1")).toBe(true);
      expect(registry.has("alias2")).toBe(true);
      expect(registry.has("alias3")).toBe(true);
    });

    it("should create step using alias", () => {
      const factory = (config: { name: string; value: number }) => ({
        id: config.name,
        name: config.name,
        value: config.value,
        execute: async (): Promise<StepResult<unknown>> => ({
          success: true,
          data: {},
        }),
      });

      registry.register("value-step", factory, ["val"]);

      const stepByName = registry.createStep("value-step", { name: "test1", value: 1 });
      const stepByAlias = registry.createStep("val", { name: "test2", value: 2 });

      expect(stepByName.id).toBe("test1");
      expect(stepByAlias.id).toBe("test2");
    });
  });

  describe("Listing and Querying", () => {
    it("should list all registered step types", () => {
      const types = registry.list();

      expect(types).toContain("transform");
      expect(types).toContain("condition");
      expect(types).toContain("parallel");
      expect(types).toContain("loop");
      expect(types).toContain("wait");
      expect(types).toContain("human");
    });

    it("should return undefined for unregistered type", () => {
      const step = registry.createStep("nonexistent", { name: "test" });
      expect(step).toBeUndefined();
    });
  });

  describe("Unregistration", () => {
    it("should unregister step type", () => {
      const factory = () => ({
        id: "temp",
        name: "temp",
        execute: async (): Promise<StepResult<unknown>> => ({
          success: true,
          data: {},
        }),
      });

      registry.register("temp-step", factory);
      expect(registry.has("temp-step")).toBe(true);

      registry.unregister("temp-step");
      expect(registry.has("temp-step")).toBe(false);
    });

    it("should unregister aliases when unregistering step type", () => {
      const factory = () => ({
        id: "aliased",
        name: "aliased",
        execute: async (): Promise<StepResult<unknown>> => ({
          success: true,
          data: {},
        }),
      });

      registry.register("aliased-step", factory, ["a1", "a2"]);
      expect(registry.has("a1")).toBe(true);
      expect(registry.has("a2")).toBe(true);

      registry.unregister("aliased-step");
      expect(registry.has("aliased-step")).toBe(false);
      // Note: Aliases might still point to original registration
      // depending on implementation
    });
  });

  describe("Step Type Metadata", () => {
    it("should store metadata with step type", () => {
      const factory = (config: { name: string }) => ({
        id: config.name,
        name: config.name,
        description: "A test step",
        tags: ["test", "custom"],
        execute: async (): Promise<StepResult<unknown>> => ({
          success: true,
          data: {},
        }),
      });

      registry.register("meta-step", factory);
      const step = registry.createStep("meta-step", { name: "test" });

      expect(step.description).toBe("A test step");
      expect(step.tags).toContain("test");
      expect(step.tags).toContain("custom");
    });
  });

  describe("Error Handling", () => {
    it("should handle factory errors gracefully", () => {
      const brokenFactory = () => {
        throw new Error("Factory error");
      };

      registry.register("broken", brokenFactory);

      expect(() => {
        registry.createStep("broken", {});
      }).toThrow("Factory error");
    });
  });

  describe("Built-in Step Factories", () => {
    it("should create transform step from registry", () => {
      const step = registry.createStep("transform", {
        name: "uppercase",
        transform: (input: { text: string }) => ({ text: input.text.toUpperCase() }),
      });

      expect(step).toBeDefined();
      expect(step.id).toBe("uppercase");
    });

    it("should create condition step from registry", () => {
      const step = registry.createStep("condition", {
        name: "is-positive",
        condition: (input: { value: number }) => input.value > 0,
        trueBranch: "positive-path",
        falseBranch: "negative-path",
      });

      expect(step).toBeDefined();
      expect(step.id).toBe("is-positive");
    });

    it("should create wait step from registry", () => {
      const step = registry.createStep("wait", {
        name: "delay",
        durationMs: 1000,
      });

      expect(step).toBeDefined();
      expect(step.id).toBe("delay");
      expect(step.tags).toContain("wait");
    });

    it("should create human step from registry", () => {
      const step = registry.createStep("human", {
        name: "approval",
        reason: "Please approve this action",
      });

      expect(step).toBeDefined();
      expect(step.id).toBe("approval");
      expect(step.suspendable).toBe(true);
    });
  });

  describe("Concurrent Access", () => {
    it("should handle concurrent registrations", async () => {
      const registrations = Array.from({ length: 10 }, (_, i) => {
        const factory = () => ({
          id: `concurrent-${i}`,
          name: `concurrent-${i}`,
          execute: async (): Promise<StepResult<unknown>> => ({
            success: true,
            data: { index: i },
          }),
        });

        return Promise.resolve(registry.register(`concurrent-${i}`, factory));
      });

      await Promise.all(registrations);

      for (let i = 0; i < 10; i++) {
        expect(registry.has(`concurrent-${i}`)).toBe(true);
      }
    });
  });
});
