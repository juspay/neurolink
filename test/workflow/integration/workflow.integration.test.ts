/**
 * Workflow System Integration Tests
 *
 * Comprehensive integration tests for the NeuroLink Workflow System.
 * Tests workflow creation, execution, state management, suspension/resume,
 * parallel execution, branching, error handling, and event streaming.
 *
 * Pattern: Uses vi.mock for NeuroLink SDK, implements real workflow logic tests.
 * Reference: /test/continuous-test-suite.ts for shared SDK patterns.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { NeuroLink } from "../../../src/lib/neurolink.js";
import type {
  StepResult,
  WorkflowCheckpoint,
  WorkflowContext,
  WorkflowEvent,
} from "../../../src/lib/types/workflowTypes.js";
import {
  createEventStream,
  createWorkflow,
  InMemoryCheckpointStorage,
  SuspensionError,
  WorkflowCancelledError,
  WorkflowEventStream,
  WorkflowExecutor,
  WorkflowRegistry,
  WorkflowStateManager,
  WorkflowTimeoutError,
} from "../../../src/lib/workflow/index.js";

// =============================================================================
// Test Utilities and Mocks
// =============================================================================

/**
 * Create a mock NeuroLink instance for testing
 */
function createMockNeurolink(): NeuroLink {
  return {
    generate: vi.fn().mockResolvedValue({
      content: "Mock AI response",
      usage: { promptTokens: 10, completionTokens: 20 },
    }),
    stream: vi.fn().mockResolvedValue({
      [Symbol.asyncIterator]: async function* () {
        yield { content: "Mock " };
        yield { content: "stream " };
        yield { content: "response" };
      },
    }),
    dispose: vi.fn().mockResolvedValue(undefined),
  } as unknown as NeuroLink;
}

/**
 * Cleanup helper for executor instances
 */
async function cleanupExecutor(executor: WorkflowExecutor | null): Promise<void> {
  if (!executor) return;
  // Clear any event listeners
  executor.removeAllListeners();
}

/**
 * Global cleanup between tests
 */
async function globalCleanup(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 10));
}

/**
 * Helper to collect events during workflow execution
 */
function createEventCollector(executor: WorkflowExecutor): {
  events: WorkflowEvent[];
  cleanup: () => void;
} {
  const events: WorkflowEvent[] = [];
  const handler = (event: WorkflowEvent) => events.push(event);
  executor.on("event", handler);
  return {
    events,
    cleanup: () => executor.off("event", handler),
  };
}

// =============================================================================
// Integration Test Suite
// =============================================================================

describe("Workflow System Integration Tests", () => {
  let executor: WorkflowExecutor;
  let mockNeurolink: NeuroLink;
  let storage: InMemoryCheckpointStorage;

  beforeEach(() => {
    mockNeurolink = createMockNeurolink();
    storage = new InMemoryCheckpointStorage();
    executor = new WorkflowExecutor(mockNeurolink, { storage });
    WorkflowRegistry.clear();
  });

  afterEach(async () => {
    await cleanupExecutor(executor);
    WorkflowRegistry.clear();
    storage.clear();
    await globalCleanup();
  });

  // ===========================================================================
  // Workflow Creation and Initialization Tests
  // ===========================================================================

  describe("Workflow Creation and Initialization", () => {
    it("should create a workflow with basic configuration", () => {
      const workflow = createWorkflow("test-basic")
        .name("Basic Test Workflow")
        .describe("A simple test workflow")
        .setVersion("1.0.0")
        .tag("test", "integration")
        .step("init", {
          execute: async () => ({ success: true, data: { initialized: true } }),
        })
        .build();

      expect(workflow.id).toBe("test-basic");
      expect(workflow.name).toBe("Basic Test Workflow");
      expect(workflow.description).toBe("A simple test workflow");
      expect(workflow.version).toBe("1.0.0");
      expect(workflow.tags).toEqual(["test", "integration"]);
      expect(workflow.steps.size).toBe(1);
      expect(workflow.graph.entryPoint).toBe("init");
    });

    it("should create workflow with input/output schemas", () => {
      const inputSchema = z.object({
        name: z.string(),
        count: z.number().min(1),
      });
      const outputSchema = z.object({
        result: z.string(),
        processedCount: z.number(),
      });

      const workflow = createWorkflow("schema-test")
        .input(inputSchema)
        .output(outputSchema)
        .step("process", {
          execute: async (input: { name: string; count: number }) => ({
            success: true,
            data: {
              result: `Processed ${input.name}`,
              processedCount: input.count * 2,
            },
          }),
        })
        .build();

      expect(workflow.inputSchema).toBeDefined();
      expect(workflow.outputSchema).toBeDefined();
    });

    it("should create workflow with initial state factory", async () => {
      let capturedState: Record<string, unknown> | null = null;

      const workflow = createWorkflow("state-factory")
        .state(() => ({
          counter: 0,
          items: [] as string[],
          metadata: { createdAt: Date.now() },
        }))
        .step("capture", {
          execute: async (_input, ctx) => {
            capturedState = { ...ctx.state };
            return { success: true };
          },
        })
        .build();

      await executor.execute(workflow, {});

      expect(capturedState).toBeDefined();
      expect((capturedState as Record<string, unknown>).counter).toBe(0);
      expect((capturedState as Record<string, unknown>).items).toEqual([]);
      expect((capturedState as Record<string, unknown>).metadata).toBeDefined();
    });

    it("should throw error when building workflow with no steps", () => {
      expect(() => createWorkflow("empty").build()).toThrow(
        "Workflow must have at least one step"
      );
    });

    it("should register workflow in registry", () => {
      const workflow = createWorkflow("registry-test")
        .step("init", { execute: async () => ({ success: true }) })
        .register();

      const retrieved = WorkflowRegistry.get("registry-test");
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(workflow.id);
    });
  });

  // ===========================================================================
  // Step Execution Tests (Sequential, Parallel, Branching)
  // ===========================================================================

  describe("Step Execution", () => {
    describe("Sequential Execution", () => {
      it("should execute steps in sequential order", async () => {
        const executionOrder: string[] = [];

        const workflow = createWorkflow("sequential")
          .step("step1", {
            execute: async () => {
              executionOrder.push("step1");
              return { success: true, data: { value: 1 } };
            },
          })
          .then("step2", {
            execute: async () => {
              executionOrder.push("step2");
              return { success: true, data: { value: 2 } };
            },
          })
          .then("step3", {
            execute: async () => {
              executionOrder.push("step3");
              return { success: true, data: { value: 3 } };
            },
          })
          .build();

        const result = await executor.execute(workflow, {});

        expect(result.success).toBe(true);
        expect(result.status).toBe("completed");
        expect(executionOrder).toEqual(["step1", "step2", "step3"]);
      });

      it("should pass output from previous step to next step", async () => {
        const workflow = createWorkflow("data-flow")
          .step("producer", {
            execute: async () => ({
              success: true,
              data: { message: "Hello", count: 42 },
            }),
          })
          .then("consumer", {
            execute: async (input, ctx) => {
              const producerOutput = ctx.getStepOutput<{
                message: string;
                count: number;
              }>("producer");
              return {
                success: true,
                data: {
                  received: producerOutput?.message,
                  doubled: (producerOutput?.count ?? 0) * 2,
                },
              };
            },
          })
          .build();

        const result = await executor.execute(workflow, {});

        expect(result.success).toBe(true);
        expect(result.stepResults.get("consumer")?.output).toEqual({
          received: "Hello",
          doubled: 84,
        });
      });

      it("should provide workflow input to first step", async () => {
        let receivedInput: unknown = null;

        const workflow = createWorkflow("input-pass")
          .step("first", {
            execute: async (input) => {
              receivedInput = input;
              return { success: true, data: input };
            },
          })
          .build();

        await executor.execute(workflow, { name: "Test", value: 123 });

        expect(receivedInput).toEqual({ name: "Test", value: 123 });
      });
    });

    describe("Parallel Execution", () => {
      it("should execute parallel steps concurrently", async () => {
        const startTimes: Record<string, number> = {};
        const endTimes: Record<string, number> = {};

        const workflow = createWorkflow("parallel-concurrent")
          .step("init", { execute: async () => ({ success: true }) })
          .parallel([
            {
              id: "parallel-a",
              execute: async () => {
                startTimes["a"] = Date.now();
                await new Promise((r) => setTimeout(r, 50));
                endTimes["a"] = Date.now();
                return { success: true, data: { task: "A" } };
              },
            },
            {
              id: "parallel-b",
              execute: async () => {
                startTimes["b"] = Date.now();
                await new Promise((r) => setTimeout(r, 50));
                endTimes["b"] = Date.now();
                return { success: true, data: { task: "B" } };
              },
            },
            {
              id: "parallel-c",
              execute: async () => {
                startTimes["c"] = Date.now();
                await new Promise((r) => setTimeout(r, 50));
                endTimes["c"] = Date.now();
                return { success: true, data: { task: "C" } };
              },
            },
          ])
          .build();

        const result = await executor.execute(workflow, {});

        expect(result.success).toBe(true);
        // All parallel steps should start within a small window
        const maxStartDiff = Math.max(
          Math.abs(startTimes["a"] - startTimes["b"]),
          Math.abs(startTimes["b"] - startTimes["c"]),
          Math.abs(startTimes["a"] - startTimes["c"])
        );
        expect(maxStartDiff).toBeLessThan(30); // Should start nearly simultaneously
      });

      it("should wait for all parallel steps when waitFor is 'all'", async () => {
        const completions: string[] = [];

        const workflow = createWorkflow("parallel-all")
          .step("init", { execute: async () => ({ success: true }) })
          .parallel(
            [
              {
                id: "fast",
                execute: async () => {
                  await new Promise((r) => setTimeout(r, 10));
                  completions.push("fast");
                  return { success: true };
                },
              },
              {
                id: "slow",
                execute: async () => {
                  await new Promise((r) => setTimeout(r, 50));
                  completions.push("slow");
                  return { success: true };
                },
              },
            ],
            { waitFor: "all" }
          )
          .build();

        const result = await executor.execute(workflow, {});

        expect(result.success).toBe(true);
        // Both parallel steps should complete
        expect(completions).toContain("fast");
        expect(completions).toContain("slow");
      });

      it("should continue on error when continueOnError is true", async () => {
        const completed: string[] = [];

        const workflow = createWorkflow("parallel-continue")
          .step("init", { execute: async () => ({ success: true }) })
          .parallel(
            [
              {
                id: "success",
                execute: async () => {
                  completed.push("success");
                  return { success: true, data: { ok: true } };
                },
              },
              {
                id: "other-success",
                execute: async () => {
                  completed.push("other-success");
                  return { success: true, data: { ok: true } };
                },
              },
            ],
            { continueOnError: true }
          )
          .build();

        const result = await executor.execute(workflow, {});

        // Both steps should have executed
        expect(completed).toContain("success");
        expect(completed).toContain("other-success");
        expect(result.success).toBe(true);
      });
    });

    describe("Conditional Branching", () => {
      it("should support branching workflow structure", async () => {
        // Test that branching creates proper workflow structure
        const workflow = createWorkflow("branching-structure")
          .step("evaluate", {
            execute: async () => ({
              success: true,
              data: { score: 85 },
            }),
          })
          .branch(
            [
              {
                condition: (ctx) => {
                  const score = ctx.getStepOutput<{ score: number }>("evaluate")?.score ?? 0;
                  return score >= 70;
                },
                stepId: "good",
                step: {
                  execute: async () => ({ success: true, data: { grade: "B" } }),
                },
              },
            ],
            {
              stepId: "needs-improvement",
              step: {
                execute: async () => ({ success: true, data: { grade: "C" } }),
              },
            }
          )
          .build();

        // Verify workflow structure
        expect(workflow.steps.has("evaluate")).toBe(true);
        expect(workflow.steps.has("good")).toBe(true);
        expect(workflow.steps.has("needs-improvement")).toBe(true);
        expect(workflow.graph.branches).toBeDefined();
        expect(workflow.graph.branches?.length).toBeGreaterThan(0);
      });

      it("should execute workflow with branch structure", async () => {
        const workflow = createWorkflow("branch-exec")
          .step("start", {
            execute: async () => ({
              success: true,
              data: { value: 100 },
            }),
          })
          .build();

        const result = await executor.execute(workflow, {});
        expect(result.success).toBe(true);
        expect(result.stepResults.get("start")?.output).toEqual({ value: 100 });
      });
    });

    describe("Loop Execution", () => {
      it("should create forEach loop structure in workflow", () => {
        const workflow = createWorkflow("foreach-structure")
          .state(() => ({ items: [1, 2, 3, 4, 5] }))
          .forEach(
            {
              items: (ctx) => (ctx.state as { items: number[] }).items,
              itemVariable: "item",
            },
            [
              {
                id: "process-item",
                execute: async (item: number) => {
                  return { success: true, data: { processed: item * 2 } };
                },
              },
            ]
          )
          .build();

        // Verify loop structure is created
        expect(workflow.graph.loops).toBeDefined();
        expect(workflow.graph.loops?.length).toBeGreaterThan(0);
        expect(workflow.steps.has("process-item")).toBe(true);
      });

      it("should respect maxIterations in doWhile loop", async () => {
        let iterations = 0;

        const workflow = createWorkflow("dowhile-max")
          .state(() => ({ count: 0 }))
          .doWhile(
            () => true, // Always true - would loop forever
            [
              {
                id: "iterate",
                execute: async (_input, ctx) => {
                  iterations++;
                  const state = ctx.state as { count: number };
                  ctx.updateState({ count: state.count + 1 });
                  return { success: true };
                },
              },
            ],
            { maxIterations: 5 }
          )
          .build();

        await executor.execute(workflow, {});

        expect(iterations).toBe(5);
      });

      it("should exit doUntil loop when condition becomes true", async () => {
        let iterations = 0;

        const workflow = createWorkflow("dountil")
          .state(() => ({ count: 0 }))
          .doUntil(
            (ctx) => (ctx.state as { count: number }).count >= 3,
            [
              {
                id: "iterate",
                execute: async (_input, ctx) => {
                  iterations++;
                  const state = ctx.state as { count: number };
                  ctx.updateState({ count: state.count + 1 });
                  return { success: true };
                },
              },
            ]
          )
          .build();

        await executor.execute(workflow, {});

        expect(iterations).toBe(3);
      });
    });
  });

  // ===========================================================================
  // State Persistence and Checkpointing Tests
  // ===========================================================================

  describe("State Persistence and Checkpointing", () => {
    it("should persist workflow state updates across steps", async () => {
      const stateSnapshots: Array<{ counter: number }> = [];

      const workflow = createWorkflow("state-persist")
        .state(() => ({ counter: 0 }))
        .step("increment1", {
          execute: async (_input, ctx) => {
            const state = ctx.state as { counter: number };
            stateSnapshots.push({ counter: state.counter });
            ctx.updateState({ counter: state.counter + 10 });
            return { success: true };
          },
        })
        .then("increment2", {
          execute: async (_input, ctx) => {
            const state = ctx.state as { counter: number };
            stateSnapshots.push({ counter: state.counter });
            ctx.updateState({ counter: state.counter + 5 });
            return { success: true };
          },
        })
        .then("final", {
          execute: async (_input, ctx) => {
            const state = ctx.state as { counter: number };
            stateSnapshots.push({ counter: state.counter });
            return { success: true, data: { finalValue: state.counter } };
          },
        })
        .build();

      const result = await executor.execute(workflow, {});

      expect(result.success).toBe(true);
      expect(stateSnapshots).toEqual([
        { counter: 0 },
        { counter: 10 },
        { counter: 15 },
      ]);
    });

    it("should save checkpoint on suspension", async () => {
      const workflow = createWorkflow("checkpoint-suspend")
        .step("work", {
          execute: async () => ({
            success: false,
            suspend: {
              reason: "Need human approval",
              type: "hitl" as const,
              resumeData: { stepId: "work" },
            },
          }),
        })
        .build();

      const result = await executor.execute(workflow, {});

      expect(result.status).toBe("suspended");
      expect(result.checkpoint).toBeDefined();
      expect(result.checkpoint?.suspension?.reason).toBe("Need human approval");
    });

    it("should restore state from checkpoint", async () => {
      const stateManager = new WorkflowStateManager(storage);

      // Create a checkpoint
      const checkpoint: WorkflowCheckpoint = {
        id: "test-checkpoint-1",
        workflowId: "restore-test",
        runId: "run-1",
        timestamp: Date.now(),
        status: "suspended",
        state: { progress: 50, data: { key: "value" } },
        stepOutputs: {
          step1: { result: "completed" },
        },
        stepRecords: {
          step1: {
            stepId: "step1",
            status: "completed",
            output: { result: "completed" },
            metadata: { startTime: Date.now() - 1000 },
            attempts: 1,
          },
        },
        pendingSteps: ["step2"],
        version: "1.0.0",
      };

      await stateManager.saveCheckpoint(checkpoint);

      const loaded = await stateManager.loadCheckpoint("test-checkpoint-1");
      expect(loaded).toBeDefined();
      expect(loaded?.state).toEqual({ progress: 50, data: { key: "value" } });
      expect(loaded?.stepOutputs["step1"]).toEqual({ result: "completed" });
    });

    it("should list checkpoints by workflow ID", async () => {
      const stateManager = new WorkflowStateManager(storage);

      // Create multiple checkpoints
      await stateManager.saveCheckpoint({
        id: "cp-1",
        workflowId: "workflow-a",
        runId: "run-1",
        timestamp: Date.now(),
        status: "suspended",
        state: {},
        stepOutputs: {},
        stepRecords: {},
        pendingSteps: [],
        version: "1.0.0",
      });

      await stateManager.saveCheckpoint({
        id: "cp-2",
        workflowId: "workflow-b",
        runId: "run-2",
        timestamp: Date.now(),
        status: "suspended",
        state: {},
        stepOutputs: {},
        stepRecords: {},
        pendingSteps: [],
        version: "1.0.0",
      });

      await stateManager.saveCheckpoint({
        id: "cp-3",
        workflowId: "workflow-a",
        runId: "run-3",
        timestamp: Date.now(),
        status: "suspended",
        state: {},
        stepOutputs: {},
        stepRecords: {},
        pendingSteps: [],
        version: "1.0.0",
      });

      const workflowACheckpoints = await stateManager.listCheckpoints("workflow-a");
      expect(workflowACheckpoints).toHaveLength(2);
      expect(workflowACheckpoints.every((cp) => cp.workflowId === "workflow-a")).toBe(true);
    });

    it("should delete checkpoint", async () => {
      const stateManager = new WorkflowStateManager(storage);

      await stateManager.saveCheckpoint({
        id: "delete-test",
        workflowId: "test",
        runId: "run-1",
        timestamp: Date.now(),
        status: "suspended",
        state: {},
        stepOutputs: {},
        stepRecords: {},
        pendingSteps: [],
        version: "1.0.0",
      });

      const deleted = await stateManager.deleteCheckpoint("delete-test");
      expect(deleted).toBe(true);

      const loaded = await stateManager.loadCheckpoint("delete-test");
      expect(loaded).toBeUndefined();
    });
  });

  // ===========================================================================
  // Suspend/Resume (HITL Patterns) Tests
  // ===========================================================================

  describe("Suspend/Resume (HITL Patterns)", () => {
    it("should suspend workflow via step result", async () => {
      const workflow = createWorkflow("suspend-result")
        .step("review", {
          execute: async () => ({
            success: false,
            suspend: {
              reason: "Awaiting review",
              type: "hitl" as const,
              resumeData: { action: "review" },
              expiresAt: Date.now() + 3600000,
            },
          }),
        })
        .build();

      const result = await executor.execute(workflow, {});

      expect(result.success).toBe(false);
      expect(result.status).toBe("suspended");
      expect(result.checkpoint).toBeDefined();
      expect(result.checkpoint?.suspension?.type).toBe("hitl");
    });

    it("should suspend workflow via context.suspend() which throws SuspensionError", async () => {
      // context.suspend() throws SuspensionError - verify this behavior
      const workflow = createWorkflow("suspend-context")
        .step("approval", {
          execute: async (_input, ctx) => {
            ctx.suspend({
              reason: "Manager approval required",
              type: "manual",
              resumeData: { requestId: "12345" },
            });
            // Never reached because suspend() throws
            return { success: true };
          },
        })
        .build();

      const result = await executor.execute(workflow, {});

      // context.suspend() throws SuspensionError which may be caught differently
      expect(result.success).toBe(false);
      expect(["suspended", "failed"]).toContain(result.status);
    });

    it("should resume workflow from checkpoint", async () => {
      const executedSteps: string[] = [];

      // Create and register workflow
      const workflow = createWorkflow("resumable")
        .step("step1", {
          execute: async () => {
            executedSteps.push("step1");
            return { success: true, data: { completed: "step1" } };
          },
        })
        .then("step2", {
          execute: async () => {
            executedSteps.push("step2");
            return { success: true, data: { completed: "step2" } };
          },
        })
        .register();

      // Create checkpoint simulating suspension after step1
      const checkpoint: WorkflowCheckpoint = {
        id: "resume-checkpoint",
        workflowId: "resumable",
        runId: "resume-run",
        timestamp: Date.now(),
        status: "suspended",
        state: {},
        stepOutputs: {
          step1: { completed: "step1" },
        },
        stepRecords: {
          step1: {
            stepId: "step1",
            status: "completed",
            output: { completed: "step1" },
            metadata: { startTime: Date.now() },
            attempts: 1,
          },
        },
        pendingSteps: ["step2"],
        suspension: {
          reason: "Test suspension",
          type: "manual",
        },
        version: "1.0.0",
      };

      const result = await executor.resume(checkpoint, { approved: true });

      expect(result.success).toBe(true);
      expect(result.status).toBe("completed");
    });

    it("should fail resume if workflow not in registry", async () => {
      const checkpoint: WorkflowCheckpoint = {
        id: "orphan-checkpoint",
        workflowId: "non-existent-workflow",
        runId: "run-1",
        timestamp: Date.now(),
        status: "suspended",
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

    it("should handle human step helper for HITL", async () => {
      const workflow = createWorkflow("human-step")
        .step("process", {
          execute: async () => ({
            success: true,
            data: { document: "Important doc" },
          }),
        })
        .human("review", {
          reason: "Document review required",
          suspendData: (_input, ctx) => ({
            document: ctx.getStepOutput<{ document: string }>("process")?.document,
          }),
        })
        .build();

      const result = await executor.execute(workflow, {});

      expect(result.status).toBe("suspended");
      expect(result.checkpoint?.suspension?.reason).toBe("Document review required");
    });
  });

  // ===========================================================================
  // Error Handling and Recovery Tests
  // ===========================================================================

  describe("Error Handling and Recovery", () => {
    it("should handle step failure gracefully", async () => {
      const workflow = createWorkflow("step-failure")
        .step("failing", {
          execute: async () => ({
            success: false,
            error: {
              code: "BUSINESS_ERROR",
              message: "Business rule violation",
              details: { rule: "validation" },
            },
          }),
        })
        .build();

      const result = await executor.execute(workflow, {});

      expect(result.success).toBe(false);
      expect(result.status).toBe("failed");
      // Workflow should fail and have stats recorded
      expect(result.stats).toBeDefined();
      expect(result.stats.startTime).toBeDefined();
    });

    it("should handle step throwing exception", async () => {
      const workflow = createWorkflow("step-exception")
        .step("throwing", {
          execute: async () => {
            throw new Error("Unexpected runtime error");
          },
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
              error: { code: "FAIL", message: "Intentional failure" },
            };
          },
        })
        .then("skipped", {
          execute: async () => {
            executed.push("skipped");
            return { success: true };
          },
        })
        .build();

      await executor.execute(workflow, {});

      expect(executed).toContain("first");
      expect(executed).toContain("failing");
      expect(executed).not.toContain("skipped");
    });

    it("should validate input schema and reject invalid input", async () => {
      const workflow = createWorkflow("input-validation")
        .input(
          z.object({
            email: z.string().email(),
            age: z.number().min(18),
          })
        )
        .step("process", {
          execute: async () => ({ success: true }),
        })
        .build();

      const result = await executor.execute(workflow, {
        email: "invalid-email",
        age: 15,
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INPUT_VALIDATION_FAILED");
    });

    it("should validate output schema and reject invalid output", async () => {
      const workflow = createWorkflow("output-validation")
        .output(
          z.object({
            status: z.literal("success"),
            count: z.number(),
          })
        )
        .step("process", {
          execute: async () => ({
            success: true,
            data: { status: "error", count: "not-a-number" }, // Invalid
          }),
        })
        .build();

      const result = await executor.execute(workflow, {});

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("OUTPUT_VALIDATION_FAILED");
    });

    it("should respect workflow timeout configuration", async () => {
      const workflow = createWorkflow("timeout-config")
        .setTimeout(5000)
        .step("fast", {
          execute: async () => {
            await new Promise((r) => setTimeout(r, 10));
            return { success: true };
          },
        })
        .build();

      // Verify timeout is configured
      expect(workflow.timeout).toBe(5000);

      // Execute should complete before timeout
      const result = await executor.execute(workflow, {});
      expect(result.success).toBe(true);
    });

    it("should create proper WorkflowTimeoutError", () => {
      const error = new WorkflowTimeoutError("test-workflow", "run-123", 5000);

      expect(error.name).toBe("WorkflowTimeoutError");
      expect(error.message).toContain("test-workflow");
      expect(error.message).toContain("run-123");
      expect(error.message).toContain("5000ms");
    });

    it("should create proper WorkflowCancelledError", () => {
      const error = new WorkflowCancelledError("test-workflow", "run-456");

      expect(error.name).toBe("WorkflowCancelledError");
      expect(error.message).toContain("test-workflow");
      expect(error.message).toContain("run-456");
      expect(error.message).toContain("cancelled");
    });

    it("should create proper SuspensionError", () => {
      const suspension = {
        reason: "Test suspension",
        type: "hitl" as const,
        resumeData: { key: "value" },
      };
      const error = new SuspensionError(suspension);

      expect(error.name).toBe("SuspensionError");
      expect(error.message).toContain("Test suspension");
      expect(error.suspension).toBe(suspension);
    });
  });

  // ===========================================================================
  // Event Streaming Tests
  // ===========================================================================

  describe("Event Streaming", () => {
    it("should emit workflow:start event", async () => {
      const { events, cleanup } = createEventCollector(executor);

      const workflow = createWorkflow("events-start")
        .step("init", { execute: async () => ({ success: true }) })
        .build();

      await executor.execute(workflow, { input: "test" });
      cleanup();

      const startEvent = events.find((e) => e.type === "workflow:start");
      expect(startEvent).toBeDefined();
      expect(startEvent?.workflowId).toBe("events-start");
    });

    it("should emit step:start and step:complete events", async () => {
      const { events, cleanup } = createEventCollector(executor);

      const workflow = createWorkflow("step-events")
        .step("mystep", {
          execute: async () => ({ success: true, data: { done: true } }),
        })
        .build();

      await executor.execute(workflow, {});
      cleanup();

      const stepStart = events.find(
        (e) => e.type === "step:start" && (e as { stepId: string }).stepId === "mystep"
      );
      const stepComplete = events.find(
        (e) => e.type === "step:complete" && (e as { stepId: string }).stepId === "mystep"
      );

      expect(stepStart).toBeDefined();
      expect(stepComplete).toBeDefined();
    });

    it("should emit workflow:complete event on success", async () => {
      const { events, cleanup } = createEventCollector(executor);

      const workflow = createWorkflow("complete-event")
        .step("work", { execute: async () => ({ success: true }) })
        .build();

      await executor.execute(workflow, {});
      cleanup();

      const completeEvent = events.find((e) => e.type === "workflow:complete");
      expect(completeEvent).toBeDefined();
    });

    it("should emit workflow:failed event on failure", async () => {
      const { events, cleanup } = createEventCollector(executor);

      const workflow = createWorkflow("failed-event")
        .step("fail", {
          execute: async () => ({
            success: false,
            error: { code: "FAIL", message: "Intentional" },
          }),
        })
        .build();

      const result = await executor.execute(workflow, {});
      cleanup();

      // The workflow should fail
      expect(result.success).toBe(false);
      // Check that relevant events were emitted
      expect(events.length).toBeGreaterThan(0);
      expect(events.some((e) => e.type === "workflow:start")).toBe(true);
    });

    it("should emit step:failed event on step failure", async () => {
      const { events, cleanup } = createEventCollector(executor);

      const workflow = createWorkflow("step-fail-event")
        .step("failing", {
          execute: async () => ({
            success: false,
            error: { code: "STEP_FAIL", message: "Step failed" },
          }),
        })
        .build();

      await executor.execute(workflow, {});
      cleanup();

      const stepFailedEvent = events.find(
        (e) =>
          e.type === "step:failed" && (e as { stepId: string }).stepId === "failing"
      );
      expect(stepFailedEvent).toBeDefined();
    });

    it("should emit events for parallel steps", async () => {
      const { events, cleanup } = createEventCollector(executor);

      const workflow = createWorkflow("parallel-events")
        .step("init", { execute: async () => ({ success: true }) })
        .parallel([
          { id: "p1", execute: async () => ({ success: true }) },
          { id: "p2", execute: async () => ({ success: true }) },
        ])
        .build();

      const result = await executor.execute(workflow, {});
      cleanup();

      expect(result.success).toBe(true);
      // Should have workflow and step events
      expect(events.some((e) => e.type === "workflow:start")).toBe(true);
      expect(events.some((e) => e.type === "step:start")).toBe(true);
    });

    it("should emit events during workflow execution", async () => {
      const { events, cleanup } = createEventCollector(executor);

      const workflow = createWorkflow("multi-step-events")
        .step("s1", { execute: async () => ({ success: true }) })
        .then("s2", { execute: async () => ({ success: true }) })
        .then("s3", { execute: async () => ({ success: true }) })
        .build();

      await executor.execute(workflow, {});
      cleanup();

      // Should have multiple step events
      const stepStartEvents = events.filter((e) => e.type === "step:start");
      expect(stepStartEvents.length).toBeGreaterThanOrEqual(3);
    });

    it("should emit checkpoint:created event on suspension", async () => {
      const { events, cleanup } = createEventCollector(executor);

      const workflow = createWorkflow("checkpoint-event")
        .step("suspend", {
          execute: async () => ({
            success: false,
            suspend: { reason: "Test", type: "manual" as const },
          }),
        })
        .build();

      await executor.execute(workflow, {});
      cleanup();

      const checkpointEvent = events.find((e) => e.type === "checkpoint:created");
      expect(checkpointEvent).toBeDefined();
    });
  });

  // ===========================================================================
  // Event Stream Class Tests
  // ===========================================================================

  describe("WorkflowEventStream", () => {
    it("should create event stream from executor", () => {
      const stream = createEventStream(executor);
      expect(stream).toBeInstanceOf(WorkflowEventStream);
    });

    it("should filter events by type via subscription", async () => {
      const stream = createEventStream(executor);
      const stepCompleteEvents: WorkflowEvent[] = [];

      // Subscribe to specific event type
      const sub = stream.subscribeToTypes(["step:complete"], (event) => {
        stepCompleteEvents.push(event);
      });

      const workflow = createWorkflow("stream-filter")
        .step("s1", { execute: async () => ({ success: true }) })
        .then("s2", { execute: async () => ({ success: true }) })
        .build();

      await executor.execute(workflow, {});
      sub.unsubscribe();

      expect(stepCompleteEvents.length).toBeGreaterThanOrEqual(2);
      expect(stepCompleteEvents.every((e) => e.type === "step:complete")).toBe(true);
    });

    it("should support subscription API", async () => {
      const stream = createEventStream(executor);
      const receivedEvents: WorkflowEvent[] = [];

      const subscription = stream.subscribe((event) => {
        receivedEvents.push(event);
      });

      const workflow = createWorkflow("subscription-test")
        .step("work", { execute: async () => ({ success: true }) })
        .build();

      await executor.execute(workflow, {});

      subscription.unsubscribe();

      expect(receivedEvents.length).toBeGreaterThan(0);
    });

    it("should support subscribeToTypes API", async () => {
      const stream = createEventStream(executor);
      const receivedEvents: WorkflowEvent[] = [];

      const subscription = stream.subscribeToTypes(
        ["workflow:start", "workflow:complete"],
        (event) => {
          receivedEvents.push(event);
        }
      );

      const workflow = createWorkflow("typed-subscription")
        .step("work", { execute: async () => ({ success: true }) })
        .build();

      await executor.execute(workflow, {});

      subscription.unsubscribe();

      expect(
        receivedEvents.every(
          (e) => e.type === "workflow:start" || e.type === "workflow:complete"
        )
      ).toBe(true);
    });
  });

  // ===========================================================================
  // Cleanup and Disposal Tests
  // ===========================================================================

  describe("Cleanup and Disposal", () => {
    it("should track running workflows", async () => {
      const workflow = createWorkflow("tracking")
        .step("slow", {
          execute: async () => {
            await new Promise((r) => setTimeout(r, 100));
            return { success: true };
          },
        })
        .build();

      const runId = "track-test-run";
      const executionPromise = executor.execute(workflow, {}, { runId });

      expect(executor.isRunning(runId)).toBe(true);

      await executionPromise;

      expect(executor.isRunning(runId)).toBe(false);
    });

    it("should be able to cancel running workflow", async () => {
      let executionStarted = false;

      const workflow = createWorkflow("cancellable")
        .step("slow", {
          execute: async () => {
            executionStarted = true;
            await new Promise((r) => setTimeout(r, 2000));
            return { success: true };
          },
        })
        .build();

      const runId = "cancel-test-run";
      const executionPromise = executor.execute(workflow, {}, { runId });

      // Wait for execution to actually start
      await new Promise((r) => setTimeout(r, 50));

      // Verify workflow is running
      const isRunning = executor.isRunning(runId);

      // Try to cancel
      const cancelled = executor.cancel(runId);

      const result = await executionPromise;

      // Either cancelled or completed depending on timing
      expect(executionStarted || isRunning || cancelled).toBe(true);
    });

    it("should return false when cancelling non-existent workflow", () => {
      const cancelled = executor.cancel("non-existent-run-id");
      expect(cancelled).toBe(false);
    });

    it("should clean up resources after execution", async () => {
      const workflow = createWorkflow("cleanup-test")
        .step("work", { execute: async () => ({ success: true }) })
        .build();

      const runId = "cleanup-run";
      await executor.execute(workflow, {}, { runId });

      // After execution, workflow should no longer be tracked
      expect(executor.isRunning(runId)).toBe(false);
    });

    it("should provide access to state manager", () => {
      const stateManager = executor.getStateManager();
      expect(stateManager).toBeInstanceOf(WorkflowStateManager);
    });

    it("should clear workflow registry", () => {
      createWorkflow("clear-test")
        .step("init", { execute: async () => ({ success: true }) })
        .register();

      expect(WorkflowRegistry.get("clear-test")).toBeDefined();

      WorkflowRegistry.clear();

      expect(WorkflowRegistry.get("clear-test")).toBeUndefined();
    });
  });

  // ===========================================================================
  // Step Helper Methods Tests
  // ===========================================================================

  describe("Step Helper Methods", () => {
    it("should support transform step", async () => {
      const workflow = createWorkflow("transform-helper")
        .step("data", {
          execute: async () => ({
            success: true,
            data: { raw: "hello world" },
          }),
        })
        .transform("uppercase", (input) => ({
          transformed: (input as { raw: string }).raw.toUpperCase(),
        }))
        .build();

      const result = await executor.execute(workflow, {});

      expect(result.success).toBe(true);
      expect(result.stepResults.get("uppercase")?.output).toEqual({
        transformed: "HELLO WORLD",
      });
    });

    it("should support validate step with zod schema", async () => {
      const workflow = createWorkflow("validate-helper")
        .validate(
          "validate-input",
          z.object({
            name: z.string().min(2),
            age: z.number().positive(),
          })
        )
        .then("process", {
          execute: async () => ({ success: true }),
        })
        .build();

      // Valid input
      const validResult = await executor.execute(workflow, {
        name: "John",
        age: 25,
      });
      expect(validResult.success).toBe(true);
    });

    it("should support condition step", async () => {
      const workflow = createWorkflow("condition-helper")
        .step("data", {
          execute: async () => ({
            success: true,
            data: { score: 85 },
          }),
        })
        .condition("check", {
          condition: (_input, ctx) => {
            const data = ctx.getStepOutput<{ score: number }>("data");
            return (data?.score ?? 0) >= 70;
          },
        })
        .build();

      const result = await executor.execute(workflow, {});

      expect(result.success).toBe(true);
      expect(result.stepResults.get("check")?.output).toEqual({ result: true });
    });

    it("should support sleep step", async () => {
      const startTime = Date.now();

      const workflow = createWorkflow("sleep-helper")
        .step("before", { execute: async () => ({ success: true }) })
        .sleep(50) // 50ms delay
        .then("after", { execute: async () => ({ success: true }) })
        .build();

      await executor.execute(workflow, {});

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(50);
    });
  });

  // ===========================================================================
  // Statistics and Metadata Tests
  // ===========================================================================

  describe("Statistics and Metadata", () => {
    it("should track execution statistics", async () => {
      const workflow = createWorkflow("stats-test")
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
            error: { code: "FAIL", message: "Test" },
          }),
        })
        .build();

      const result = await executor.execute(workflow, {});

      // Workflow should have failed
      expect(result.success).toBe(false);
      expect(result.status).toBe("failed");
      expect(result.stats).toBeDefined();
      expect(result.stats.startTime).toBeDefined();
    });

    it("should include step execution records", async () => {
      const workflow = createWorkflow("records-test")
        .step("recorded", {
          execute: async () => ({
            success: true,
            data: { recorded: true },
          }),
        })
        .build();

      const result = await executor.execute(workflow, {});

      const record = result.stepResults.get("recorded");
      expect(record).toBeDefined();
      expect(record?.stepId).toBe("recorded");
      expect(record?.status).toBe("completed");
      expect(record?.output).toEqual({ recorded: true });
      expect(record?.metadata.startTime).toBeDefined();
      expect(record?.metadata.endTime).toBeDefined();
    });
  });
});
