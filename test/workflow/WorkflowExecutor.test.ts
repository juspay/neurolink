/**
 * WorkflowExecutor Tests
 *
 * Tests for the workflow execution engine.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  WorkflowExecutor,
  executeWorkflow,
  resumeWorkflow,
  createWorkflow,
  WorkflowRegistry,
  CheckpointManager,
  MemoryCheckpointStorage,
} from "../../src/lib/workflow/index.js";
import type {
  WorkflowDefinition,
  WorkflowContext,
  StepResult,
  WorkflowEventMap,
} from "../../src/lib/workflow/index.js";

describe("WorkflowExecutor", () => {
  let executor: WorkflowExecutor;

  beforeEach(() => {
    executor = new WorkflowExecutor();
    WorkflowRegistry.getInstance().clear();
  });

  describe("Basic Execution", () => {
    it("should execute a simple single-step workflow", async () => {
      const workflow = createWorkflow<{ value: number }, { result: number }>("simple")
        .step("double", {
          execute: async (input) => ({
            success: true,
            data: { result: (input as { value: number }).value * 2 },
          }),
        })
        .build();

      const result = await executor.execute(workflow, { value: 5 });

      expect(result.success).toBe(true);
      expect(result.status).toBe("completed");
      expect(result.output).toEqual({ result: 10 });
    });

    it("should execute sequential steps in order", async () => {
      const executionOrder: string[] = [];

      const workflow = createWorkflow("sequential")
        .step("step1", {
          execute: async (input) => {
            executionOrder.push("step1");
            return { success: true, data: { step: 1 } };
          },
        })
        .then("step2", {
          execute: async (input) => {
            executionOrder.push("step2");
            return { success: true, data: { step: 2 } };
          },
        })
        .then("step3", {
          execute: async (input) => {
            executionOrder.push("step3");
            return { success: true, data: { step: 3 } };
          },
        })
        .build();

      await executor.execute(workflow, {});

      expect(executionOrder).toEqual(["step1", "step2", "step3"]);
    });

    it("should pass step results through the chain", async () => {
      const workflow = createWorkflow("chain")
        .step("init", {
          execute: async (input) => ({
            success: true,
            data: { value: 1 },
          }),
        })
        .then("increment", {
          execute: async (input, context) => {
            const prev = context.stepResults?.init?.data?.value ?? 0;
            return {
              success: true,
              data: { value: prev + 1 },
            };
          },
        })
        .then("double", {
          execute: async (input, context) => {
            const prev = context.stepResults?.increment?.data?.value ?? 0;
            return {
              success: true,
              data: { value: prev * 2 },
            };
          },
        })
        .build();

      const result = await executor.execute(workflow, {});

      expect(result.success).toBe(true);
      expect(result.stepResults?.double?.data?.value).toBe(4);
    });
  });

  describe("Parallel Execution", () => {
    it("should execute parallel steps concurrently", async () => {
      const startTimes: Record<string, number> = {};
      const endTimes: Record<string, number> = {};

      const workflow = createWorkflow("parallel")
        .step("start", {
          execute: async (input) => ({
            success: true,
            data: { started: true },
          }),
        })
        .parallel([
          {
            id: "slow1",
            execute: async (input) => {
              startTimes.slow1 = Date.now();
              await new Promise((r) => setTimeout(r, 50));
              endTimes.slow1 = Date.now();
              return { success: true, data: { id: "slow1" } };
            },
          },
          {
            id: "slow2",
            execute: async (input) => {
              startTimes.slow2 = Date.now();
              await new Promise((r) => setTimeout(r, 50));
              endTimes.slow2 = Date.now();
              return { success: true, data: { id: "slow2" } };
            },
          },
        ])
        .build();

      const result = await executor.execute(workflow, {});

      expect(result.success).toBe(true);
      // Both should start at nearly the same time (within 20ms)
      expect(Math.abs(startTimes.slow1 - startTimes.slow2)).toBeLessThan(20);
    });

    it("should aggregate parallel step results", async () => {
      const workflow = createWorkflow("parallel-results")
        .parallel([
          {
            id: "branch1",
            execute: async () => ({ success: true, data: { value: 1 } }),
          },
          {
            id: "branch2",
            execute: async () => ({ success: true, data: { value: 2 } }),
          },
          {
            id: "branch3",
            execute: async () => ({ success: true, data: { value: 3 } }),
          },
        ])
        .build();

      const result = await executor.execute(workflow, {});

      expect(result.success).toBe(true);
      expect(result.stepResults?.branch1?.data?.value).toBe(1);
      expect(result.stepResults?.branch2?.data?.value).toBe(2);
      expect(result.stepResults?.branch3?.data?.value).toBe(3);
    });
  });

  describe("Conditional Branching", () => {
    it("should execute correct branch based on condition", async () => {
      const workflow = createWorkflow<{ type: string }>("conditional")
        .step("check", {
          execute: async (input) => ({
            success: true,
            data: { type: (input as { type: string }).type },
          }),
        })
        .branch([
          {
            condition: (ctx) => ctx.stepResults?.check?.data?.type === "A",
            stepId: "handle-a",
            execute: async () => ({ success: true, data: { path: "A" } }),
          },
          {
            condition: (ctx) => ctx.stepResults?.check?.data?.type === "B",
            stepId: "handle-b",
            execute: async () => ({ success: true, data: { path: "B" } }),
          },
        ], "handle-default", {
          execute: async () => ({ success: true, data: { path: "default" } }),
        })
        .build();

      const resultA = await executor.execute(workflow, { type: "A" });
      expect(resultA.stepResults?.["handle-a"]?.data?.path).toBe("A");

      const resultB = await executor.execute(workflow, { type: "B" });
      expect(resultB.stepResults?.["handle-b"]?.data?.path).toBe("B");

      const resultDefault = await executor.execute(workflow, { type: "C" });
      expect(resultDefault.stepResults?.["handle-default"]?.data?.path).toBe("default");
    });
  });

  describe("Loop Execution", () => {
    it("should execute forEach loop", async () => {
      const processedItems: number[] = [];

      const workflow = createWorkflow("foreach")
        .forEach(
          "process-items",
          () => [1, 2, 3, 4, 5],
          {
            execute: async (input, context) => {
              const item = (context as WorkflowContext & { loopItem: number }).loopItem;
              processedItems.push(item);
              return { success: true, data: { item } };
            },
          },
        )
        .build();

      const result = await executor.execute(workflow, {});

      expect(result.success).toBe(true);
      expect(processedItems).toEqual([1, 2, 3, 4, 5]);
    });

    it("should execute doWhile loop until condition is false", async () => {
      let counter = 0;

      const workflow = createWorkflow("dowhile")
        .doWhile(
          "count",
          () => counter < 3,
          {
            execute: async () => {
              counter++;
              return { success: true, data: { count: counter } };
            },
          },
        )
        .build();

      await executor.execute(workflow, {});

      expect(counter).toBe(3);
    });
  });

  describe("Error Handling", () => {
    it("should handle step failure", async () => {
      const workflow = createWorkflow("failing")
        .step("fail", {
          execute: async () => ({
            success: false,
            error: {
              code: "TEST_ERROR",
              message: "Test error",
              retryable: false,
            },
          }),
        })
        .build();

      const result = await executor.execute(workflow, {});

      expect(result.success).toBe(false);
      expect(result.status).toBe("failed");
      expect(result.error?.code).toBe("TEST_ERROR");
    });

    it("should handle thrown exceptions", async () => {
      const workflow = createWorkflow("throwing")
        .step("throw", {
          execute: async () => {
            throw new Error("Unexpected error");
          },
        })
        .build();

      const result = await executor.execute(workflow, {});

      expect(result.success).toBe(false);
      expect(result.status).toBe("failed");
      expect(result.error?.message).toContain("Unexpected error");
    });

    it("should retry failed steps according to config", async () => {
      let attempts = 0;

      const workflow = createWorkflow("retry")
        .step("flaky", {
          retry: {
            maxAttempts: 3,
            backoffMs: 10,
          },
          execute: async () => {
            attempts++;
            if (attempts < 3) {
              return {
                success: false,
                error: {
                  code: "FLAKY_ERROR",
                  message: "Flaky error",
                  retryable: true,
                },
              };
            }
            return { success: true, data: { attempts } };
          },
        })
        .build();

      const result = await executor.execute(workflow, {});

      expect(result.success).toBe(true);
      expect(attempts).toBe(3);
    });
  });

  describe("Events", () => {
    it("should emit workflow events", async () => {
      const events: string[] = [];

      executor.on("workflow:started", () => events.push("started"));
      executor.on("workflow:completed", () => events.push("completed"));
      executor.on("step:started", () => events.push("step:started"));
      executor.on("step:completed", () => events.push("step:completed"));

      const workflow = createWorkflow("events")
        .step("step1", {
          execute: async () => ({ success: true, data: {} }),
        })
        .build();

      await executor.execute(workflow, {});

      expect(events).toContain("started");
      expect(events).toContain("completed");
      expect(events).toContain("step:started");
      expect(events).toContain("step:completed");
    });

    it("should emit failure events on error", async () => {
      const events: string[] = [];

      executor.on("workflow:failed", () => events.push("failed"));
      executor.on("step:failed", () => events.push("step:failed"));

      const workflow = createWorkflow("fail-events")
        .step("fail", {
          execute: async () => ({
            success: false,
            error: { code: "ERR", message: "Error", retryable: false },
          }),
        })
        .build();

      await executor.execute(workflow, {});

      expect(events).toContain("failed");
      expect(events).toContain("step:failed");
    });
  });

  describe("Checkpointing", () => {
    it("should create checkpoints during execution", async () => {
      const storage = new MemoryCheckpointStorage({ maxCheckpoints: 10 });
      const checkpointManager = new CheckpointManager({
        storage,
        autoCheckpoint: true,
      });

      const checkpointExecutor = new WorkflowExecutor({
        checkpointManager,
      });

      const workflow = createWorkflow("checkpointed")
        .step("step1", {
          execute: async () => ({ success: true, data: { step: 1 } }),
        })
        .then("step2", {
          execute: async () => ({ success: true, data: { step: 2 } }),
        })
        .build();

      await checkpointExecutor.execute(workflow, {});

      const checkpoints = await storage.list(workflow.id);
      expect(checkpoints.length).toBeGreaterThan(0);
    });
  });

  describe("Suspension and Resume", () => {
    it("should suspend on HITL step", async () => {
      const workflow = createWorkflow("suspend")
        .step("prepare", {
          execute: async () => ({ success: true, data: { ready: true } }),
        })
        .humanApproval("approval", "Please approve")
        .then("complete", {
          execute: async () => ({ success: true, data: { done: true } }),
        })
        .build();

      const result = await executor.execute(workflow, {});

      expect(result.status).toBe("suspended");
      expect(result.suspensionRequest).toBeDefined();
      expect(result.suspensionRequest?.type).toBe("hitl");
    });

    it("should resume suspended workflow", async () => {
      const storage = new MemoryCheckpointStorage({ maxCheckpoints: 10 });
      const checkpointManager = new CheckpointManager({
        storage,
        autoCheckpoint: true,
      });

      const resumeExecutor = new WorkflowExecutor({
        checkpointManager,
      });

      const workflow = createWorkflow("resume-test")
        .step("prepare", {
          execute: async () => ({ success: true, data: { ready: true } }),
        })
        .humanApproval("approval", "Please approve")
        .then("complete", {
          execute: async () => ({ success: true, data: { done: true } }),
        })
        .build();

      // First execution - should suspend
      const suspendResult = await resumeExecutor.execute(workflow, {});
      expect(suspendResult.status).toBe("suspended");

      // Resume with approval
      const resumeResult = await resumeExecutor.resume(
        workflow,
        suspendResult.executionId,
        {
          completed: true,
          approved: true,
          actionType: "approval",
        },
      );

      expect(resumeResult.status).toBe("completed");
      expect(resumeResult.stepResults?.complete?.data?.done).toBe(true);
    });
  });

  describe("Timeout Handling", () => {
    it("should timeout long-running steps", async () => {
      const workflow = createWorkflow("timeout")
        .step("slow", {
          timeout: 50,
          execute: async () => {
            await new Promise((r) => setTimeout(r, 200));
            return { success: true, data: {} };
          },
        })
        .build();

      const result = await executor.execute(workflow, {});

      expect(result.success).toBe(false);
      expect(result.error?.code).toContain("TIMEOUT");
    });
  });

  describe("Execution Helpers", () => {
    it("should use executeWorkflow helper", async () => {
      const workflow = createWorkflow("helper")
        .step("step1", {
          execute: async (input) => ({
            success: true,
            data: { value: (input as { value: number }).value + 1 },
          }),
        })
        .buildAndRegister();

      const result = await executeWorkflow("helper", { value: 10 });

      expect(result.success).toBe(true);
      expect(result.output?.value).toBe(11);
    });
  });

  describe("Context Access", () => {
    it("should provide access to workflow context in steps", async () => {
      let capturedContext: WorkflowContext | null = null;

      const workflow = createWorkflow("context-access")
        .step("capture", {
          execute: async (input, context) => {
            capturedContext = context;
            return { success: true, data: {} };
          },
        })
        .build();

      await executor.execute(workflow, { testInput: "value" });

      expect(capturedContext).not.toBeNull();
      expect(capturedContext?.workflowId).toBe("context-access");
      expect(capturedContext?.input).toEqual({ testInput: "value" });
    });

    it("should provide state management in context", async () => {
      const workflow = createWorkflow("state-test")
        .step("set-state", {
          execute: async (input, context) => {
            context.state.counter = 0;
            return { success: true, data: {} };
          },
        })
        .then("increment", {
          execute: async (input, context) => {
            context.state.counter++;
            return { success: true, data: { counter: context.state.counter } };
          },
        })
        .then("read-state", {
          execute: async (input, context) => {
            return { success: true, data: { final: context.state.counter } };
          },
        })
        .build();

      const result = await executor.execute(workflow, {});

      expect(result.stepResults?.["read-state"]?.data?.final).toBe(1);
    });
  });
});
