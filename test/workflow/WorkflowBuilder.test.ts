/**
 * WorkflowBuilder Tests
 *
 * Tests for the fluent workflow builder API.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { z } from "zod";
import {
  WorkflowBuilder,
  createWorkflow,
  WorkflowRegistry,
} from "../../src/lib/workflow/index.js";

describe("WorkflowBuilder", () => {
  beforeEach(() => {
    // Clear registry before each test
    WorkflowRegistry.getInstance().clear();
  });

  describe("Basic Workflow Creation", () => {
    it("should create a simple workflow with builder API", () => {
      const workflow = createWorkflow("simple-workflow")
        .step("step1", {
          execute: async (input) => ({ result: input }),
        })
        .build();

      expect(workflow).toBeDefined();
      expect(workflow.id).toBe("simple-workflow");
      expect(workflow.name).toBe("simple-workflow");
      expect(workflow.graph.nodes).toHaveLength(1);
      expect(workflow.graph.entryPoint).toBe("step1");
    });

    it("should chain steps with .then()", () => {
      const workflow = createWorkflow("chained-workflow")
        .step("step1", {
          execute: async (input) => ({ value: 1 }),
        })
        .then("step2", {
          execute: async (input) => ({ value: 2 }),
        })
        .then("step3", {
          execute: async (input) => ({ value: 3 }),
        })
        .build();

      expect(workflow.graph.nodes).toHaveLength(3);
      expect(workflow.graph.edges).toHaveLength(2);
      expect(workflow.graph.edges[0]).toEqual({ from: "step1", to: "step2" });
      expect(workflow.graph.edges[1]).toEqual({ from: "step2", to: "step3" });
    });

    it("should add description and version", () => {
      const workflow = createWorkflow("versioned-workflow")
        .description("A test workflow")
        .version("2.0.0")
        .step("step1", {
          execute: async (input) => input,
        })
        .build();

      expect(workflow.description).toBe("A test workflow");
      expect(workflow.version).toBe("2.0.0");
    });
  });

  describe("Input/Output Schemas", () => {
    it("should accept Zod input schema", () => {
      const inputSchema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const workflow = createWorkflow("schema-workflow")
        .input(inputSchema)
        .step("step1", {
          execute: async (input) => input,
        })
        .build();

      expect(workflow.inputSchema).toBe(inputSchema);
    });

    it("should accept Zod output schema", () => {
      const outputSchema = z.object({
        result: z.string(),
      });

      const workflow = createWorkflow("output-schema-workflow")
        .output(outputSchema)
        .step("step1", {
          execute: async (input) => ({ result: "test" }),
        })
        .build();

      expect(workflow.outputSchema).toBe(outputSchema);
    });
  });

  describe("Parallel Execution", () => {
    it("should create parallel step group", () => {
      const workflow = createWorkflow("parallel-workflow")
        .step("init", {
          execute: async (input) => input,
        })
        .parallel([
          {
            id: "parallel1",
            execute: async (input) => ({ branch: 1 }),
          },
          {
            id: "parallel2",
            execute: async (input) => ({ branch: 2 }),
          },
          {
            id: "parallel3",
            execute: async (input) => ({ branch: 3 }),
          },
        ])
        .then("final", {
          execute: async (input) => ({ done: true }),
        })
        .build();

      expect(workflow.graph.nodes).toHaveLength(5);
      expect(workflow.graph.parallelGroups).toHaveLength(1);
      expect(workflow.graph.parallelGroups?.[0].stepIds).toEqual([
        "parallel1",
        "parallel2",
        "parallel3",
      ]);
    });
  });

  describe("Conditional Branching", () => {
    it("should create conditional branches", () => {
      const workflow = createWorkflow("branch-workflow")
        .step("check", {
          execute: async (input) => ({ status: "success" }),
        })
        .branch([
          {
            condition: (ctx) => ctx.stepResults?.check?.data?.status === "success",
            stepId: "success-path",
            execute: async (input) => ({ path: "success" }),
          },
          {
            condition: (ctx) => ctx.stepResults?.check?.data?.status === "failure",
            stepId: "failure-path",
            execute: async (input) => ({ path: "failure" }),
          },
        ], "default-path", {
          execute: async (input) => ({ path: "default" }),
        })
        .build();

      expect(workflow.graph.conditionalBranches).toHaveLength(1);
      expect(workflow.graph.conditionalBranches?.[0].branches).toHaveLength(2);
    });
  });

  describe("Loop Patterns", () => {
    it("should create forEach loop", () => {
      const workflow = createWorkflow("foreach-workflow")
        .forEach(
          "process-items",
          (ctx) => [1, 2, 3, 4, 5],
          {
            execute: async (input) => ({ processed: input }),
          },
        )
        .build();

      expect(workflow.graph.loops).toHaveLength(1);
      expect(workflow.graph.loops?.[0].type).toBe("forEach");
    });

    it("should create doWhile loop", () => {
      let counter = 0;

      const workflow = createWorkflow("dowhile-workflow")
        .doWhile(
          "increment",
          () => counter++ < 5,
          {
            execute: async (input) => ({ count: counter }),
          },
        )
        .build();

      expect(workflow.graph.loops).toHaveLength(1);
      expect(workflow.graph.loops?.[0].type).toBe("doWhile");
    });

    it("should create doUntil loop", () => {
      const workflow = createWorkflow("dountil-workflow")
        .doUntil(
          "wait-until",
          (ctx) => ctx.state?.completed === true,
          {
            execute: async (input) => ({ waiting: true }),
          },
        )
        .build();

      expect(workflow.graph.loops).toHaveLength(1);
      expect(workflow.graph.loops?.[0].type).toBe("doUntil");
    });
  });

  describe("Wait Steps", () => {
    it("should create timer wait step", () => {
      const workflow = createWorkflow("wait-workflow")
        .wait("delay", 1000)
        .step("after-wait", {
          execute: async (input) => ({ done: true }),
        })
        .build();

      expect(workflow.graph.nodes).toHaveLength(2);
      const waitNode = workflow.graph.nodes.find((n) => n.id === "delay");
      expect(waitNode).toBeDefined();
      expect(waitNode?.tags).toContain("wait");
    });
  });

  describe("Human Approval Steps", () => {
    it("should create human approval step", () => {
      const workflow = createWorkflow("approval-workflow")
        .step("prepare", {
          execute: async (input) => ({ ready: true }),
        })
        .humanApproval("get-approval", "Please approve this action")
        .then("execute", {
          execute: async (input) => ({ executed: true }),
        })
        .build();

      expect(workflow.graph.nodes).toHaveLength(3);
      const approvalNode = workflow.graph.nodes.find((n) => n.id === "get-approval");
      expect(approvalNode).toBeDefined();
      expect(approvalNode?.suspendable).toBe(true);
      expect(approvalNode?.tags).toContain("hitl");
    });
  });

  describe("Step Options", () => {
    it("should accept retry configuration", () => {
      const workflow = createWorkflow("retry-workflow")
        .step("flaky-step", {
          execute: async (input) => input,
          retry: {
            maxAttempts: 3,
            backoffMs: 1000,
            backoffMultiplier: 2,
          },
        })
        .build();

      const node = workflow.graph.nodes[0];
      expect(node.retry).toEqual({
        maxAttempts: 3,
        backoffMs: 1000,
        backoffMultiplier: 2,
      });
    });

    it("should accept timeout configuration", () => {
      const workflow = createWorkflow("timeout-workflow")
        .step("slow-step", {
          execute: async (input) => input,
          timeout: 5000,
        })
        .build();

      const node = workflow.graph.nodes[0];
      expect(node.timeout).toBe(5000);
    });

    it("should accept tags", () => {
      const workflow = createWorkflow("tagged-workflow")
        .step("tagged-step", {
          execute: async (input) => input,
          tags: ["important", "critical"],
        })
        .build();

      const node = workflow.graph.nodes[0];
      expect(node.tags).toContain("important");
      expect(node.tags).toContain("critical");
    });
  });

  describe("Build and Register", () => {
    it("should build and register workflow", () => {
      const workflow = createWorkflow("registered-workflow")
        .step("step1", {
          execute: async (input) => input,
        })
        .buildAndRegister();

      const retrieved = WorkflowRegistry.get("registered-workflow");
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe("registered-workflow");
    });

    it("should register with aliases", () => {
      createWorkflow("aliased-workflow")
        .step("step1", {
          execute: async (input) => input,
        })
        .buildAndRegister(["alias1", "alias2"]);

      expect(WorkflowRegistry.get("alias1")).toBeDefined();
      expect(WorkflowRegistry.get("alias2")).toBeDefined();
    });
  });

  describe("Validation", () => {
    it("should throw error for duplicate step IDs", () => {
      expect(() => {
        createWorkflow("duplicate-ids")
          .step("step1", {
            execute: async (input) => input,
          })
          .step("step1", {
            execute: async (input) => input,
          })
          .build();
      }).toThrow();
    });

    it("should throw error for empty workflow", () => {
      expect(() => {
        createWorkflow("empty-workflow").build();
      }).toThrow();
    });
  });

  describe("Complex Workflow Patterns", () => {
    it("should build a complex multi-pattern workflow", () => {
      const workflow = createWorkflow("complex-workflow")
        .description("A complex workflow with multiple patterns")
        .version("1.0.0")
        .input(z.object({ data: z.array(z.number()) }))
        .step("validate", {
          execute: async (input) => ({ valid: true, data: input }),
        })
        .branch([
          {
            condition: (ctx) => ctx.stepResults?.validate?.data?.valid === true,
            stepId: "process-data",
            execute: async (input) => input,
          },
        ], "handle-invalid", {
          execute: async (input) => ({ error: "Invalid data" }),
        })
        .parallel([
          {
            id: "transform-a",
            execute: async (input) => ({ transformed: "A" }),
          },
          {
            id: "transform-b",
            execute: async (input) => ({ transformed: "B" }),
          },
        ])
        .forEach(
          "process-each",
          () => [1, 2, 3],
          { execute: async (item) => ({ item }) },
        )
        .humanApproval("final-approval", "Approve final result")
        .then("complete", {
          execute: async (input) => ({ completed: true }),
        })
        .build();

      expect(workflow.graph.nodes.length).toBeGreaterThan(5);
      expect(workflow.graph.conditionalBranches).toHaveLength(1);
      expect(workflow.graph.parallelGroups).toHaveLength(1);
      expect(workflow.graph.loops).toHaveLength(1);
    });
  });
});
