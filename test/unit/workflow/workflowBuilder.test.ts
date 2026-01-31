/**
 * WorkflowBuilder Unit Tests
 *
 * Tests the fluent API for constructing workflows including:
 * - Basic workflow creation
 * - Step chaining (step, then, after)
 * - Parallel execution groups
 * - Conditional branches
 * - Input/output schemas
 * - Loop constructs (forEach, doWhile, doUntil)
 * - Validation and error handling
 */

import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  createWorkflow,
  WorkflowBuilder,
} from "../../../src/lib/workflow/workflowBuilder.js";

describe("WorkflowBuilder", () => {
  describe("createWorkflow factory", () => {
    it("should create a new WorkflowBuilder instance", () => {
      const builder = createWorkflow("test-workflow");
      expect(builder).toBeInstanceOf(WorkflowBuilder);
    });
  });

  describe("basic workflow creation", () => {
    it("should create a basic workflow with id, name, and description", () => {
      const workflow = createWorkflow("test-workflow")
        .name("Test Workflow")
        .describe("A test workflow")
        .step("dummy", { execute: async () => ({ success: true }) })
        .build();

      expect(workflow.id).toBe("test-workflow");
      expect(workflow.name).toBe("Test Workflow");
      expect(workflow.description).toBe("A test workflow");
    });

    it("should use id as name if name not set", () => {
      const workflow = createWorkflow("my-workflow")
        .step("step1", { execute: async () => ({ success: true }) })
        .build();

      expect(workflow.name).toBe("my-workflow");
    });

    it("should set version", () => {
      const workflow = createWorkflow("versioned")
        .step("step1", { execute: async () => ({ success: true }) })
        .setVersion("1.2.3")
        .build();

      expect(workflow.version).toBe("1.2.3");
    });

    it("should add tags", () => {
      const workflow = createWorkflow("tagged")
        .step("step1", { execute: async () => ({ success: true }) })
        .tag("ai", "processing", "data")
        .build();

      expect(workflow.tags).toEqual(["ai", "processing", "data"]);
    });

    it("should set timeout", () => {
      const workflow = createWorkflow("timeout")
        .step("step1", { execute: async () => ({ success: true }) })
        .setTimeout(30000)
        .build();

      expect(workflow.timeout).toBe(30000);
    });
  });

  describe("input/output schemas", () => {
    it("should add steps with input/output schemas", () => {
      const inputSchema = z.object({ value: z.number() });
      const outputSchema = z.object({ result: z.number() });

      const workflow = createWorkflow("schema-workflow")
        .input(inputSchema)
        .output(outputSchema)
        .step("double", {
          inputSchema: z.object({ value: z.number() }),
          outputSchema: z.object({ doubled: z.number() }),
          execute: async (input: { value: number }) => ({
            success: true,
            data: { doubled: input.value * 2 },
          }),
        })
        .build();

      expect(workflow.steps.size).toBe(1);
      expect(workflow.inputSchema).toBeDefined();
      expect(workflow.outputSchema).toBeDefined();
    });

    it("should preserve type information through schema methods", () => {
      const workflow = createWorkflow("typed")
        .input(z.object({ x: z.number(), y: z.number() }))
        .output(z.object({ sum: z.number() }))
        .step("add", {
          execute: async (input: { x: number; y: number }) => ({
            success: true,
            data: { sum: input.x + input.y },
          }),
        })
        .build();

      // Type inference should work (compile-time check)
      expect(workflow.inputSchema).toBeDefined();
      expect(workflow.outputSchema).toBeDefined();
    });
  });

  describe("step chaining", () => {
    it("should add a single step", () => {
      const workflow = createWorkflow("single-step")
        .step("step1", {
          execute: async () => ({ success: true, data: "done" }),
        })
        .build();

      expect(workflow.steps.size).toBe(1);
      expect(workflow.steps.has("step1")).toBe(true);
      expect(workflow.graph.entryPoint).toBe("step1");
    });

    it("should create sequential steps with step()", () => {
      const workflow = createWorkflow("sequential-step")
        .step("step1", { execute: async () => ({ success: true, data: 1 }) })
        .step("step2", { execute: async () => ({ success: true, data: 2 }) })
        .build();

      expect(workflow.steps.size).toBe(2);
      expect(workflow.graph.edges.length).toBe(1);
      expect(workflow.graph.edges[0].from).toBe("step1");
      expect(workflow.graph.edges[0].to).toBe("step2");
    });

    it("should create sequential steps with then()", () => {
      const workflow = createWorkflow("sequential-then")
        .step("first", { execute: async () => ({ success: true }) })
        .then("second", { execute: async () => ({ success: true }) })
        .then("third", { execute: async () => ({ success: true }) })
        .build();

      expect(workflow.steps.size).toBe(3);
      expect(workflow.graph.edges.length).toBe(2);

      // Verify edge connections
      const edges = workflow.graph.edges;
      expect(edges.some((e) => e.from === "first" && e.to === "second")).toBe(
        true,
      );
      expect(edges.some((e) => e.from === "second" && e.to === "third")).toBe(
        true,
      );
    });

    it("should create sequential steps with after()", () => {
      const workflow = createWorkflow("sequential-after")
        .step("step1", { execute: async () => ({ success: true, data: 1 }) })
        .after("step2", { execute: async () => ({ success: true, data: 2 }) })
        .build();

      expect(workflow.graph.edges.length).toBe(1);
      expect(workflow.graph.edges[0].from).toBe("step1");
      expect(workflow.graph.edges[0].to).toBe("step2");
    });

    it("should set step name from definition if provided", () => {
      const workflow = createWorkflow("named-step")
        .step("step1", {
          name: "Custom Step Name",
          execute: async () => ({ success: true }),
        })
        .build();

      const step = workflow.steps.get("step1");
      expect(step?.name).toBe("Custom Step Name");
    });

    it("should use step id as name if name not provided", () => {
      const workflow = createWorkflow("default-name")
        .step("my-step-id", {
          execute: async () => ({ success: true }),
        })
        .build();

      const step = workflow.steps.get("my-step-id");
      expect(step?.name).toBe("my-step-id");
    });
  });

  describe("parallel execution", () => {
    it("should create parallel steps", () => {
      const workflow = createWorkflow("parallel")
        .step("start", { execute: async () => ({ success: true }) })
        .parallel([
          {
            id: "parallel1",
            execute: async () => ({ success: true, data: "a" }),
          },
          {
            id: "parallel2",
            execute: async () => ({ success: true, data: "b" }),
          },
        ])
        .build();

      // start + parallel1 + parallel2 + merge point = 4 steps
      expect(workflow.steps.size).toBe(4);
      expect(workflow.steps.has("parallel1")).toBe(true);
      expect(workflow.steps.has("parallel2")).toBe(true);
      expect(workflow.graph.parallelGroups?.length).toBe(1);
    });

    it("should create parallel group with correct configuration", () => {
      const workflow = createWorkflow("parallel-config")
        .parallel(
          [
            { id: "p1", execute: async () => ({ success: true }) },
            { id: "p2", execute: async () => ({ success: true }) },
          ],
          { waitFor: "any", continueOnError: true },
        )
        .build();

      const group = workflow.graph.parallelGroups?.[0];
      expect(group).toBeDefined();
      expect(group?.waitFor).toBe("any");
      expect(group?.continueOnError).toBe(true);
      expect(group?.steps).toContain("p1");
      expect(group?.steps).toContain("p2");
    });

    it("should connect start step to all parallel steps", () => {
      const workflow = createWorkflow("parallel-edges")
        .step("start", { execute: async () => ({ success: true }) })
        .parallel([
          { id: "p1", execute: async () => ({ success: true }) },
          { id: "p2", execute: async () => ({ success: true }) },
          { id: "p3", execute: async () => ({ success: true }) },
        ])
        .build();

      const startEdges = workflow.graph.edges.filter((e) => e.from === "start");
      expect(startEdges.length).toBe(3);
      expect(startEdges.map((e) => e.to).sort()).toEqual(["p1", "p2", "p3"]);
    });

    it("should create merge point after parallel steps", () => {
      const workflow = createWorkflow("parallel-merge")
        .parallel([
          { id: "p1", execute: async () => ({ success: true }) },
          { id: "p2", execute: async () => ({ success: true }) },
        ])
        .then("after-parallel", { execute: async () => ({ success: true }) })
        .build();

      // Check merge point exists
      const mergeSteps = Array.from(workflow.steps.keys()).filter((id) =>
        id.startsWith("merge-"),
      );
      expect(mergeSteps.length).toBe(1);

      // Check edges from parallel steps to merge point
      const group = workflow.graph.parallelGroups?.[0];
      const mergeId = mergeSteps[0];
      const mergeEdges = workflow.graph.edges.filter((e) => e.to === mergeId);
      expect(mergeEdges.length).toBe(2);
    });

    it("should use first parallel step as entry point if no preceding step", () => {
      const workflow = createWorkflow("parallel-entry")
        .parallel([
          { id: "first", execute: async () => ({ success: true }) },
          { id: "second", execute: async () => ({ success: true }) },
        ])
        .build();

      expect(workflow.graph.entryPoint).toBe("first");
    });
  });

  describe("conditional branches", () => {
    it("should create conditional branches", () => {
      const workflow = createWorkflow("branching")
        .step("check", {
          execute: async () => ({ success: true, data: { value: 10 } }),
        })
        .branch([
          {
            condition: (ctx) =>
              (ctx.getStepOutput<{ value: number }>("check")?.value ?? 0) > 5,
            stepId: "high",
            step: { execute: async () => ({ success: true, data: "high" }) },
            label: "high-value",
          },
          {
            condition: (ctx) =>
              (ctx.getStepOutput<{ value: number }>("check")?.value ?? 0) <= 5,
            stepId: "low",
            step: { execute: async () => ({ success: true, data: "low" }) },
            label: "low-value",
          },
        ])
        .build();

      // check + high + low + merge = 4 steps
      expect(workflow.steps.size).toBe(4);
      expect(workflow.graph.branches?.length).toBe(1);
    });

    it("should create branch with default step", () => {
      const workflow = createWorkflow("branch-default")
        .step("check", { execute: async () => ({ success: true }) })
        .branch(
          [
            {
              condition: () => false,
              stepId: "never",
              step: { execute: async () => ({ success: true }) },
            },
          ],
          {
            stepId: "default",
            step: { execute: async () => ({ success: true, data: "default" }) },
          },
        )
        .build();

      const branch = workflow.graph.branches?.[0];
      expect(branch?.defaultTarget).toBe("default");
      expect(workflow.steps.has("default")).toBe(true);
    });

    it("should throw when adding branch without preceding step", () => {
      expect(() => {
        createWorkflow("invalid-branch")
          .branch([
            {
              condition: () => true,
              stepId: "target",
              step: { execute: async () => ({ success: true }) },
            },
          ])
          .build();
      }).toThrow("Cannot add branch without a preceding step");
    });

    it("should connect branch steps to merge point", () => {
      const workflow = createWorkflow("branch-merge")
        .step("start", { execute: async () => ({ success: true }) })
        .branch([
          {
            condition: () => true,
            stepId: "a",
            step: { execute: async () => ({ success: true }) },
          },
          {
            condition: () => false,
            stepId: "b",
            step: { execute: async () => ({ success: true }) },
          },
        ])
        .build();

      // Find merge point
      const mergeSteps = Array.from(workflow.steps.keys()).filter((id) =>
        id.startsWith("merge-branch"),
      );
      expect(mergeSteps.length).toBe(1);

      // Check edges to merge point
      const mergeId = mergeSteps[0];
      const edgesToMerge = workflow.graph.edges.filter((e) => e.to === mergeId);
      expect(edgesToMerge.map((e) => e.from).sort()).toEqual(["a", "b"]);
    });
  });

  describe("loop constructs", () => {
    it("should create forEach loop", () => {
      const workflow = createWorkflow("foreach")
        .step("setup", { execute: async () => ({ success: true }) })
        .forEach(
          {
            items: () => [1, 2, 3],
            itemVariable: "num",
            maxIterations: 10,
          },
          [
            {
              id: "process",
              execute: async (item: number) => ({
                success: true,
                data: item * 2,
              }),
            },
          ],
        )
        .build();

      expect(workflow.graph.loops?.length).toBe(1);
      const loop = workflow.graph.loops?.[0];
      expect(loop?.type).toBe("forEach");
      expect(loop?.itemVariable).toBe("num");
      expect(loop?.maxIterations).toBe(10);
    });

    it("should create doWhile loop", () => {
      const workflow = createWorkflow("dowhile")
        .step("init", { execute: async () => ({ success: true }) })
        .doWhile(
          (ctx) => (ctx.state as { counter: number }).counter < 5,
          [{ id: "increment", execute: async () => ({ success: true }) }],
          {
            maxIterations: 100,
          },
        )
        .build();

      expect(workflow.graph.loops?.length).toBe(1);
      const loop = workflow.graph.loops?.[0];
      expect(loop?.type).toBe("doWhile");
      expect(loop?.maxIterations).toBe(100);
    });

    it("should create doUntil loop", () => {
      const workflow = createWorkflow("dountil")
        .doUntil(
          (ctx) => (ctx.state as { done: boolean }).done === true,
          [{ id: "work", execute: async () => ({ success: true }) }],
          {
            maxIterations: 50,
          },
        )
        .build();

      // doUntil is implemented as doWhile with inverted condition
      expect(workflow.graph.loops?.length).toBe(1);
      const loop = workflow.graph.loops?.[0];
      expect(loop?.type).toBe("doWhile"); // Internal implementation
    });

    it("should connect loop steps sequentially", () => {
      const workflow = createWorkflow("loop-steps")
        .forEach({ items: () => [], itemVariable: "x" }, [
          { id: "step1", execute: async () => ({ success: true }) },
          { id: "step2", execute: async () => ({ success: true }) },
          { id: "step3", execute: async () => ({ success: true }) },
        ])
        .build();

      // Check sequential edges within loop
      const edges = workflow.graph.edges;
      expect(edges.some((e) => e.from === "step1" && e.to === "step2")).toBe(
        true,
      );
      expect(edges.some((e) => e.from === "step2" && e.to === "step3")).toBe(
        true,
      );
    });

    it("should create loop end point", () => {
      const workflow = createWorkflow("loop-end")
        .forEach({ items: () => [1], itemVariable: "i" }, [
          { id: "body", execute: async () => ({ success: true }) },
        ])
        .build();

      // Find end point
      const endSteps = Array.from(workflow.steps.keys()).filter((id) =>
        id.startsWith("end-"),
      );
      expect(endSteps.length).toBe(1);
    });

    it("should use default maxIterations for forEach", () => {
      const workflow = createWorkflow("default-max")
        .forEach({ items: () => [] }, [
          { id: "step", execute: async () => ({ success: true }) },
        ])
        .build();

      const loop = workflow.graph.loops?.[0];
      expect(loop?.maxIterations).toBe(1000);
    });

    it("should use default maxIterations for doWhile", () => {
      const workflow = createWorkflow("default-max-while")
        .doWhile(
          () => false,
          [{ id: "step", execute: async () => ({ success: true }) }],
        )
        .build();

      const loop = workflow.graph.loops?.[0];
      expect(loop?.maxIterations).toBe(100);
    });
  });

  describe("state management", () => {
    it("should set initial state factory", () => {
      const workflow = createWorkflow("stateful")
        .state(() => ({ counter: 0, items: [] as string[] }))
        .step("work", { execute: async () => ({ success: true }) })
        .build();

      expect(workflow.initialState).toBeDefined();
      expect(workflow.initialState?.()).toEqual({ counter: 0, items: [] });
    });
  });

  describe("validation", () => {
    it("should throw when building workflow with no steps", () => {
      expect(() => {
        createWorkflow("empty").build();
      }).toThrow("Workflow must have at least one step");
    });
  });

  describe("build() method", () => {
    it("should return complete workflow definition", () => {
      const workflow = createWorkflow("complete")
        .name("Complete Workflow")
        .describe("A complete workflow definition")
        .setVersion("2.0.0")
        .tag("test")
        .setTimeout(60000)
        .input(z.object({ data: z.string() }))
        .output(z.object({ result: z.string() }))
        .state(() => ({ processed: false }))
        .step("process", {
          execute: async (input: { data: string }) => ({
            success: true,
            data: { result: input.data.toUpperCase() },
          }),
        })
        .build();

      expect(workflow.id).toBe("complete");
      expect(workflow.name).toBe("Complete Workflow");
      expect(workflow.description).toBe("A complete workflow definition");
      expect(workflow.version).toBe("2.0.0");
      expect(workflow.tags).toContain("test");
      expect(workflow.timeout).toBe(60000);
      expect(workflow.inputSchema).toBeDefined();
      expect(workflow.outputSchema).toBeDefined();
      expect(workflow.initialState).toBeDefined();
      expect(workflow.steps.size).toBe(1);
      expect(workflow.graph.entryPoint).toBe("process");
    });

    it("should create graph with correct structure", () => {
      const workflow = createWorkflow("graph-test")
        .step("a", { execute: async () => ({ success: true }) })
        .step("b", { execute: async () => ({ success: true }) })
        .step("c", { execute: async () => ({ success: true }) })
        .build();

      expect(workflow.graph.entryPoint).toBe("a");
      expect(workflow.graph.edges.length).toBe(2);
    });
  });
});
