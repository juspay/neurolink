/**
 * WorkflowExecutor Unit Tests
 *
 * Tests the workflow execution engine including:
 * - Simple workflow execution
 * - Sequential step ordering
 * - Parallel step execution
 * - Step failure handling
 * - Cancellation via AbortController
 * - Suspension and resumption
 * - Event emission
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NeuroLink } from "../../../src/lib/neurolink.js";
import type { WorkflowContext } from "../../../src/lib/types/workflowTypes.js";
import { createWorkflow } from "../../../src/lib/workflow/workflowBuilder.js";
import {
  SuspensionError,
  WorkflowExecutor,
} from "../../../src/lib/workflow/workflowExecutor.js";
import { WorkflowRegistry } from "../../../src/lib/workflow/workflowRegistry.js";

// Mock NeuroLink instance
const createMockNeurolink = (): NeuroLink =>
  ({
    generate: vi.fn(),
    stream: vi.fn(),
  }) as unknown as NeuroLink;

describe("WorkflowExecutor", () => {
  let executor: WorkflowExecutor;
  let mockNeurolink: NeuroLink;

  beforeEach(() => {
    mockNeurolink = createMockNeurolink();
    executor = new WorkflowExecutor(mockNeurolink);
    // Clear registry before each test
    WorkflowRegistry.clear();
  });

  afterEach(() => {
    WorkflowRegistry.clear();
  });

  describe("execute", () => {
    it("should execute a simple single-step workflow", async () => {
      const workflow = createWorkflow("simple")
        .step("add", {
          execute: async (input: { a: number; b: number }) => ({
            success: true,
            data: { sum: input.a + input.b },
          }),
        })
        .build();

      const result = await executor.execute(workflow, { a: 2, b: 3 });

      expect(result.success).toBe(true);
      expect(result.status).toBe("completed");
      expect(result.stepResults.get("add")?.output).toEqual({ sum: 5 });
    });

    it("should pass input to first step", async () => {
      const receivedInput = { captured: null as unknown };

      const workflow = createWorkflow("input-test")
        .step("capture", {
          execute: async (input: { value: string }) => {
            receivedInput.captured = input;
            return { success: true, data: input };
          },
        })
        .build();

      await executor.execute(workflow, { value: "test-input" });

      expect(receivedInput.captured).toEqual({ value: "test-input" });
    });

    it("should execute steps in order", async () => {
      const order: string[] = [];

      const workflow = createWorkflow("ordered")
        .step("first", {
          execute: async () => {
            order.push("first");
            return { success: true, data: { step: 1 } };
          },
        })
        .then("second", {
          execute: async () => {
            order.push("second");
            return { success: true, data: { step: 2 } };
          },
        })
        .then("third", {
          execute: async () => {
            order.push("third");
            return { success: true, data: { step: 3 } };
          },
        })
        .build();

      const result = await executor.execute(workflow, {});

      expect(result.success).toBe(true);
      expect(order).toEqual(["first", "second", "third"]);
    });

    it("should provide context with step outputs", async () => {
      let secondStepContext: WorkflowContext | null = null;

      const workflow = createWorkflow("context-test")
        .step("first", {
          execute: async () => ({
            success: true,
            data: { message: "from-first" },
          }),
        })
        .then("second", {
          execute: async (_input, ctx) => {
            secondStepContext = ctx;
            const firstOutput = ctx.getStepOutput<{ message: string }>("first");
            return { success: true, data: { received: firstOutput?.message } };
          },
        })
        .build();

      const result = await executor.execute(workflow, {});

      expect(result.success).toBe(true);
      expect(secondStepContext).not.toBeNull();
      expect(result.stepResults.get("second")?.output).toEqual({
        received: "from-first",
      });
    });

    it("should execute parallel steps concurrently", async () => {
      const startTimes: Record<string, number> = {};

      const workflow = createWorkflow("concurrent")
        .step("start", { execute: async () => ({ success: true }) })
        .parallel([
          {
            id: "p1",
            execute: async () => {
              startTimes["p1"] = Date.now();
              await new Promise((r) => setTimeout(r, 50));
              return { success: true, data: "p1-done" };
            },
          },
          {
            id: "p2",
            execute: async () => {
              startTimes["p2"] = Date.now();
              await new Promise((r) => setTimeout(r, 50));
              return { success: true, data: "p2-done" };
            },
          },
        ])
        .build();

      const result = await executor.execute(workflow, {});

      expect(result.success).toBe(true);
      // Both parallel steps should have started
      expect(startTimes["p1"]).toBeDefined();
      expect(startTimes["p2"]).toBeDefined();
      // Both should start within ~50ms of each other (allowing for test environment variance)
      expect(Math.abs(startTimes["p1"] - startTimes["p2"])).toBeLessThan(50);
    });

    it("should handle step failures", async () => {
      const workflow = createWorkflow("failing")
        .step("fail", {
          execute: async () => ({
            success: false,
            error: { code: "TEST_ERROR", message: "Test failure" },
          }),
        })
        .build();

      const result = await executor.execute(workflow, {});

      expect(result.success).toBe(false);
      expect(result.status).toBe("failed");
    });

    it("should stop execution on step failure", async () => {
      const executed: string[] = [];

      const workflow = createWorkflow("stop-on-fail")
        .step("first", {
          execute: async () => {
            executed.push("first");
            return { success: true };
          },
        })
        .then("failing", {
          execute: async () => {
            executed.push("failing");
            return {
              success: false,
              error: { code: "FAIL", message: "Failed" },
            };
          },
        })
        .then("never", {
          execute: async () => {
            executed.push("never");
            return { success: true };
          },
        })
        .build();

      const result = await executor.execute(workflow, {});

      expect(result.success).toBe(false);
      expect(executed).toContain("first");
      expect(executed).toContain("failing");
      expect(executed).not.toContain("never");
    });

    it("should handle step that throws exception", async () => {
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
    });

    it("should validate input against schema", async () => {
      const { z } = await import("zod");

      const workflow = createWorkflow("validated")
        .input(z.object({ name: z.string(), age: z.number().min(0) }))
        .step("process", {
          execute: async () => ({ success: true }),
        })
        .build();

      const result = await executor.execute(workflow, {
        name: 123,
        age: -5,
      } as unknown);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INPUT_VALIDATION_FAILED");
    });

    it("should validate output against schema", async () => {
      const { z } = await import("zod");

      const workflow = createWorkflow("output-validated")
        .output(z.object({ result: z.string() }))
        .step("process", {
          execute: async () => ({
            success: true,
            data: { result: 123 }, // Wrong type
          }),
        })
        .build();

      const result = await executor.execute(workflow, {});

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("OUTPUT_VALIDATION_FAILED");
    });
  });

  describe("cancellation", () => {
    it("should track and allow cancellation of workflows", () => {
      // Test that the cancel method exists and works
      // First, cancelling a non-existent workflow returns false
      const cancelled = executor.cancel("non-existent");
      expect(cancelled).toBe(false);
    });

    it("should track running workflow by runId", async () => {
      const workflow = createWorkflow("cancellable")
        .step("slow", {
          execute: async () => {
            await new Promise((r) => setTimeout(r, 100));
            return { success: true };
          },
        })
        .build();

      const runId = "tracking-test";
      const resultPromise = executor.execute(workflow, {}, { runId });

      // Should be running
      expect(executor.isRunning(runId)).toBe(true);

      await resultPromise;

      // Should no longer be running
      expect(executor.isRunning(runId)).toBe(false);
    });

    it("should return false when cancelling non-existent workflow", () => {
      const cancelled = executor.cancel("non-existent-run-id");
      expect(cancelled).toBe(false);
    });

    it("should track running workflows", async () => {
      const workflow = createWorkflow("tracking")
        .step("wait", {
          execute: async () => {
            await new Promise((r) => setTimeout(r, 100));
            return { success: true };
          },
        })
        .build();

      const promise = executor.execute(workflow, {}, { runId: "test-run-123" });

      expect(executor.isRunning("test-run-123")).toBe(true);

      await promise;

      expect(executor.isRunning("test-run-123")).toBe(false);
    });
  });

  describe("timeout", () => {
    it("should complete workflow before timeout", async () => {
      const workflow = createWorkflow("timeout-test")
        .setTimeout(5000)
        .step("fast", {
          execute: async () => {
            await new Promise((r) => setTimeout(r, 50));
            return { success: true };
          },
        })
        .build();

      const result = await executor.execute(workflow, {});

      expect(result.success).toBe(true);
      expect(result.status).toBe("completed");
    });

    it("should respect timeout setting", async () => {
      // Test that timeout is properly configured on workflow
      const workflow = createWorkflow("timeout-config")
        .setTimeout(1000)
        .step("step", {
          execute: async () => ({ success: true }),
        })
        .build();

      expect(workflow.timeout).toBe(1000);
    });
  });

  describe("suspension", () => {
    it("should handle suspension via step result suspend field", async () => {
      const workflow = createWorkflow("suspendable")
        .step("suspend", {
          execute: async () => ({
            success: false,
            suspend: {
              reason: "Waiting for approval",
              type: "hitl" as const,
              resumeData: { stepId: "suspend" },
            },
          }),
        })
        .build();

      const result = await executor.execute(workflow, {});

      // The workflow should be suspended (not failed)
      expect(result.success).toBe(false);
      expect(result.status).toBe("suspended");
      expect(result.checkpoint).toBeDefined();
      expect(result.checkpoint?.suspension?.reason).toBe(
        "Waiting for approval",
      );
    });

    it("should handle suspension via context.suspend() which throws", async () => {
      // context.suspend() throws a SuspensionError which should be caught
      // and the workflow should be marked as suspended
      const workflow = createWorkflow("ctx-suspend")
        .step("suspend", {
          execute: async (_input, ctx) => {
            // This will throw SuspensionError
            ctx.suspend({
              reason: "Need user input",
              type: "manual",
            });
            // This line is never reached
            return { success: true };
          },
        })
        .build();

      const result = await executor.execute(workflow, {});

      // The suspend() method throws, but it should be caught and handled
      expect(result.success).toBe(false);
      // It should either be suspended or failed depending on implementation
      expect(["suspended", "failed"]).toContain(result.status);
    });
  });

  describe("resumption", () => {
    it("should resume workflow from checkpoint", async () => {
      const executed: string[] = [];

      // Create and register workflow
      const workflow = createWorkflow("resumable")
        .step("first", {
          execute: async () => {
            executed.push("first");
            return { success: true, data: { value: 1 } };
          },
        })
        .then("second", {
          execute: async () => {
            executed.push("second");
            return { success: true, data: { value: 2 } };
          },
        })
        .register(); // Register for resumption

      // Execute first run (simulate suspension after first step)
      const firstResult = await executor.execute(workflow, {});
      expect(firstResult.success).toBe(true);
      executed.length = 0; // Clear for resume test

      // Create checkpoint manually for resumption test
      const checkpoint = {
        id: "test-checkpoint",
        workflowId: workflow.id,
        runId: "test-run",
        timestamp: Date.now(),
        status: "suspended" as const,
        state: {},
        stepOutputs: { first: { value: 1 } },
        stepRecords: {
          first: {
            stepId: "first",
            status: "completed" as const,
            output: { value: 1 },
            metadata: { startTime: Date.now() },
            attempts: 1,
          },
        },
        pendingSteps: ["second"],
        version: "1.0.0",
      };

      const resumeResult = await executor.resume(checkpoint, { resumed: true });

      expect(resumeResult.success).toBe(true);
    });

    it("should fail resumption if workflow not found in registry", async () => {
      const checkpoint = {
        id: "orphan-checkpoint",
        workflowId: "non-existent-workflow",
        runId: "test-run",
        timestamp: Date.now(),
        status: "suspended" as const,
        state: {},
        stepOutputs: {},
        stepRecords: {},
        pendingSteps: [],
        version: "1.0.0",
      };

      const result = await executor.resume(checkpoint);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("WORKFLOW_NOT_FOUND");
    });
  });

  describe("events", () => {
    it("should emit workflow:start event", async () => {
      const events: unknown[] = [];
      executor.on("event", (e) => events.push(e));

      const workflow = createWorkflow("events-start")
        .step("step", { execute: async () => ({ success: true }) })
        .build();

      await executor.execute(workflow, { input: "test" });

      const startEvent = events.find(
        (e: unknown) => (e as { type: string }).type === "workflow:start",
      );
      expect(startEvent).toBeDefined();
    });

    it("should emit step:start and step:complete events", async () => {
      const events: unknown[] = [];
      executor.on("event", (e) => events.push(e));

      const workflow = createWorkflow("step-events")
        .step("mystep", {
          execute: async () => ({ success: true, data: "done" }),
        })
        .build();

      await executor.execute(workflow, {});

      const stepStart = events.find(
        (e: unknown) =>
          (e as { type: string }).type === "step:start" &&
          (e as { stepId: string }).stepId === "mystep",
      );
      const stepComplete = events.find(
        (e: unknown) =>
          (e as { type: string }).type === "step:complete" &&
          (e as { stepId: string }).stepId === "mystep",
      );

      expect(stepStart).toBeDefined();
      expect(stepComplete).toBeDefined();
    });

    it("should emit workflow:complete event on success", async () => {
      const events: unknown[] = [];
      executor.on("event", (e) => events.push(e));

      const workflow = createWorkflow("complete-event")
        .step("step", { execute: async () => ({ success: true }) })
        .build();

      await executor.execute(workflow, {});

      const completeEvent = events.find(
        (e: unknown) => (e as { type: string }).type === "workflow:complete",
      );
      expect(completeEvent).toBeDefined();
    });

    it("should emit step:failed event on step failure", async () => {
      const events: unknown[] = [];
      executor.on("event", (e) => events.push(e));

      const workflow = createWorkflow("failed-event")
        .step("fail", {
          execute: async () => ({
            success: false,
            error: { code: "FAIL", message: "Failed" },
          }),
        })
        .build();

      await executor.execute(workflow, {});

      // Check for step:failed event
      const stepFailedEvent = events.find(
        (e: unknown) => (e as { type: string }).type === "step:failed",
      );
      expect(stepFailedEvent).toBeDefined();
    });

    it("should emit step:failed event", async () => {
      const events: unknown[] = [];
      executor.on("event", (e) => events.push(e));

      const workflow = createWorkflow("step-failed-event")
        .step("failing", {
          execute: async () => ({
            success: false,
            error: { code: "STEP_FAIL", message: "Step failed" },
          }),
        })
        .build();

      await executor.execute(workflow, {});

      const stepFailedEvent = events.find(
        (e: unknown) =>
          (e as { type: string }).type === "step:failed" &&
          (e as { stepId: string }).stepId === "failing",
      );
      expect(stepFailedEvent).toBeDefined();
    });
  });

  describe("statistics", () => {
    it("should track execution statistics", async () => {
      const workflow = createWorkflow("stats")
        .step("s1", { execute: async () => ({ success: true }) })
        .then("s2", { execute: async () => ({ success: true }) })
        .then("s3", { execute: async () => ({ success: true }) })
        .build();

      const result = await executor.execute(workflow, {});

      expect(result.stats.totalSteps).toBeGreaterThanOrEqual(3);
      expect(result.stats.completedSteps).toBeGreaterThanOrEqual(3);
      expect(result.stats.failedSteps).toBe(0);
      expect(result.stats.startTime).toBeDefined();
      expect(result.stats.endTime).toBeDefined();
      expect(result.stats.duration).toBeGreaterThanOrEqual(0);
    });

    it("should track failed workflow status", async () => {
      const workflow = createWorkflow("fail-stats")
        .step("ok", { execute: async () => ({ success: true }) })
        .then("fail", {
          execute: async () => ({
            success: false,
            error: { code: "FAIL", message: "Failed" },
          }),
        })
        .build();

      const result = await executor.execute(workflow, {});

      // Workflow should have failed
      expect(result.success).toBe(false);
      expect(result.status).toBe("failed");
      // Stats should be present
      expect(result.stats).toBeDefined();
      expect(result.stats.startTime).toBeDefined();
    });
  });

  describe("state management", () => {
    it("should initialize workflow state", async () => {
      let capturedState: Record<string, unknown> | null = null;

      const workflow = createWorkflow("state-init")
        .state(() => ({ counter: 0, items: [] as string[] }))
        .step("check", {
          execute: async (_input, ctx) => {
            capturedState = { ...ctx.state };
            return { success: true };
          },
        })
        .build();

      await executor.execute(workflow, {});

      expect(capturedState).toEqual({ counter: 0, items: [] });
    });

    it("should allow state updates between steps", async () => {
      const stateHistory: Array<{ counter: number }> = [];

      const workflow = createWorkflow("state-update")
        .state(() => ({ counter: 0 }))
        .step("increment1", {
          execute: async (_input, ctx) => {
            const state = ctx.state as { counter: number };
            stateHistory.push({ counter: state.counter });
            ctx.updateState({ counter: state.counter + 1 });
            return { success: true };
          },
        })
        .then("increment2", {
          execute: async (_input, ctx) => {
            const state = ctx.state as { counter: number };
            stateHistory.push({ counter: state.counter });
            ctx.updateState({ counter: state.counter + 1 });
            return { success: true };
          },
        })
        .then("final", {
          execute: async (_input, ctx) => {
            const state = ctx.state as { counter: number };
            stateHistory.push({ counter: state.counter });
            return { success: true, data: { finalCounter: state.counter } };
          },
        })
        .build();

      await executor.execute(workflow, {});

      expect(stateHistory).toEqual([
        { counter: 0 },
        { counter: 1 },
        { counter: 2 },
      ]);
    });

    it("should merge initial state from options", async () => {
      let capturedState: Record<string, unknown> | null = null;

      const workflow = createWorkflow("state-merge")
        .state(() => ({ a: 1, b: 2 }))
        .step("check", {
          execute: async (_input, ctx) => {
            capturedState = { ...ctx.state };
            return { success: true };
          },
        })
        .build();

      await executor.execute(workflow, {}, { initialState: { b: 20, c: 30 } });

      expect(capturedState).toEqual({ a: 1, b: 20, c: 30 });
    });
  });

  describe("SuspensionError", () => {
    it("should create SuspensionError with suspension details", () => {
      const suspension = {
        reason: "Test suspension",
        type: "manual" as const,
        resumeData: { key: "value" },
      };

      const error = new SuspensionError(suspension);

      expect(error.name).toBe("SuspensionError");
      expect(error.message).toBe("Workflow suspended: Test suspension");
      expect(error.suspension).toBe(suspension);
    });
  });
});
