/**
 * Workflow System Integration Tests
 *
 * End-to-end tests for the complete workflow system.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { z } from "zod";
import {
  // Core
  createWorkflow,
  WorkflowExecutor,
  WorkflowRegistry,
  WorkflowFactory,
  StepRegistry,
  CheckpointManager,
  MemoryCheckpointStorage,
  SuspendResumeManager,
  // Steps
  createMapStep,
  createFilterStep,
  createIfElseStep,
  createParallelMapStep,
  createForEachStep,
  createDelayStep,
  createApprovalStep,
  // Types
  executeWorkflow,
  resumeWorkflow,
} from "../../src/lib/workflow/index.js";

describe("Workflow System Integration", () => {
  beforeEach(() => {
    WorkflowRegistry.getInstance().clear();
    StepRegistry.getInstance().clear();
    StepRegistry.registerBuiltInStepTypes();
  });

  describe("End-to-End Workflow Execution", () => {
    it("should execute a complete data processing workflow", async () => {
      // Define workflow
      const workflow = createWorkflow<{ numbers: number[] }, { result: number }>("data-processing")
        .description("Process and aggregate numbers")
        .input(z.object({ numbers: z.array(z.number()) }))
        .output(z.object({ result: z.number() }))
        .step("validate", {
          execute: async (input) => {
            const data = input as { numbers: number[] };
            if (!Array.isArray(data.numbers)) {
              return {
                success: false,
                error: { code: "INVALID_INPUT", message: "Numbers must be an array", retryable: false },
              };
            }
            return { success: true, data: { numbers: data.numbers, valid: true } };
          },
        })
        .then("filter-positives", {
          execute: async (input, context) => {
            const numbers = context.stepResults?.validate?.data?.numbers as number[];
            const positives = numbers.filter((n) => n > 0);
            return { success: true, data: { numbers: positives } };
          },
        })
        .then("double", {
          execute: async (input, context) => {
            const numbers = context.stepResults?.["filter-positives"]?.data?.numbers as number[];
            const doubled = numbers.map((n) => n * 2);
            return { success: true, data: { numbers: doubled } };
          },
        })
        .then("sum", {
          execute: async (input, context) => {
            const numbers = context.stepResults?.double?.data?.numbers as number[];
            const result = numbers.reduce((a, b) => a + b, 0);
            return { success: true, data: { result } };
          },
        })
        .build();

      const executor = new WorkflowExecutor();
      const result = await executor.execute(workflow, { numbers: [-1, 2, -3, 4, 5] });

      expect(result.success).toBe(true);
      expect(result.output?.result).toBe(22); // (2 + 4 + 5) * 2 = 22
    });

    it("should execute workflow with conditional branching", async () => {
      const workflow = createWorkflow<{ type: string; value: number }, { result: string }>("conditional-flow")
        .step("analyze", {
          execute: async (input) => {
            const data = input as { type: string; value: number };
            return { success: true, data: { type: data.type, value: data.value } };
          },
        })
        .branch([
          {
            condition: (ctx) => ctx.stepResults?.analyze?.data?.type === "multiply",
            stepId: "multiply-path",
            execute: async (input, context) => {
              const value = context.stepResults?.analyze?.data?.value as number;
              return { success: true, data: { result: `Multiplied: ${value * 2}` } };
            },
          },
          {
            condition: (ctx) => ctx.stepResults?.analyze?.data?.type === "add",
            stepId: "add-path",
            execute: async (input, context) => {
              const value = context.stepResults?.analyze?.data?.value as number;
              return { success: true, data: { result: `Added: ${value + 10}` } };
            },
          },
        ], "default-path", {
          execute: async (input, context) => {
            const value = context.stepResults?.analyze?.data?.value as number;
            return { success: true, data: { result: `Default: ${value}` } };
          },
        })
        .build();

      const executor = new WorkflowExecutor();

      const multiplyResult = await executor.execute(workflow, { type: "multiply", value: 5 });
      expect(multiplyResult.output?.result).toBe("Multiplied: 10");

      const addResult = await executor.execute(workflow, { type: "add", value: 5 });
      expect(addResult.output?.result).toBe("Added: 15");

      const defaultResult = await executor.execute(workflow, { type: "unknown", value: 5 });
      expect(defaultResult.output?.result).toBe("Default: 5");
    });

    it("should execute workflow with parallel processing", async () => {
      const workflow = createWorkflow<{ items: string[] }, { results: string[] }>("parallel-flow")
        .step("prepare", {
          execute: async (input) => {
            return { success: true, data: input };
          },
        })
        .parallel([
          {
            id: "uppercase",
            execute: async (input, context) => {
              const items = context.input?.items as string[];
              return { success: true, data: { processed: items.map((i) => i.toUpperCase()) } };
            },
          },
          {
            id: "reverse",
            execute: async (input, context) => {
              const items = context.input?.items as string[];
              return { success: true, data: { processed: items.map((i) => i.split("").reverse().join("")) } };
            },
          },
          {
            id: "length",
            execute: async (input, context) => {
              const items = context.input?.items as string[];
              return { success: true, data: { processed: items.map((i) => i.length.toString()) } };
            },
          },
        ])
        .then("combine", {
          execute: async (input, context) => {
            const uppercase = context.stepResults?.uppercase?.data?.processed as string[];
            const reverse = context.stepResults?.reverse?.data?.processed as string[];
            const length = context.stepResults?.length?.data?.processed as string[];
            return {
              success: true,
              data: { results: [...uppercase, ...reverse, ...length] },
            };
          },
        })
        .build();

      const executor = new WorkflowExecutor();
      const result = await executor.execute(workflow, { items: ["hello", "world"] });

      expect(result.success).toBe(true);
      expect(result.output?.results).toContain("HELLO");
      expect(result.output?.results).toContain("WORLD");
      expect(result.output?.results).toContain("olleh");
      expect(result.output?.results).toContain("dlrow");
      expect(result.output?.results).toContain("5");
    });

    it("should execute workflow with loop iteration", async () => {
      const workflow = createWorkflow<{ items: number[] }, { sum: number }>("loop-flow")
        .forEach(
          "process-items",
          (ctx) => ctx.input?.items as number[],
          {
            execute: async (input, context) => {
              const item = (context as any).loopItem as number;
              return { success: true, data: { processed: item * 2 } };
            },
          },
        )
        .then("aggregate", {
          execute: async (input, context) => {
            const loopResult = context.stepResults?.["process-items"]?.data;
            // Sum all processed values
            const sum = (loopResult as any)?.iterations?.reduce(
              (acc: number, iter: { data?: { processed: number } }) =>
                acc + (iter.data?.processed ?? 0),
              0,
            ) ?? 0;
            return { success: true, data: { sum } };
          },
        })
        .build();

      const executor = new WorkflowExecutor();
      const result = await executor.execute(workflow, { items: [1, 2, 3, 4, 5] });

      expect(result.success).toBe(true);
      expect(result.output?.sum).toBe(30); // (1+2+3+4+5) * 2 = 30
    });
  });

  describe("Checkpoint and Resume", () => {
    it("should checkpoint and resume workflow", async () => {
      const storage = new MemoryCheckpointStorage({ maxCheckpoints: 10 });
      const checkpointManager = new CheckpointManager({
        storage,
        autoCheckpoint: true,
      });

      const executor = new WorkflowExecutor({ checkpointManager });

      // Workflow that suspends for approval
      const workflow = createWorkflow<{ amount: number }, { approved: boolean }>("approval-flow")
        .step("validate-amount", {
          execute: async (input) => {
            const data = input as { amount: number };
            return { success: true, data: { amount: data.amount, needsApproval: data.amount > 1000 } };
          },
        })
        .humanApproval("manager-approval", "Amount exceeds $1000, needs manager approval")
        .then("complete", {
          execute: async (input, context) => {
            return { success: true, data: { approved: true } };
          },
        })
        .build();

      // Execute - should suspend at approval step
      const suspendedResult = await executor.execute(workflow, { amount: 5000 });

      expect(suspendedResult.status).toBe("suspended");
      expect(suspendedResult.suspensionRequest).toBeDefined();

      // Verify checkpoint was created
      const checkpoints = await storage.list(workflow.id);
      expect(checkpoints.length).toBeGreaterThan(0);

      // Resume with approval
      const resumedResult = await executor.resume(
        workflow,
        suspendedResult.executionId,
        {
          completed: true,
          approved: true,
          actionType: "approval",
          actor: "manager@example.com",
        },
      );

      expect(resumedResult.status).toBe("completed");
      expect(resumedResult.success).toBe(true);
    });
  });

  describe("Error Handling and Recovery", () => {
    it("should handle step failures with retry", async () => {
      let attempts = 0;

      const workflow = createWorkflow("retry-workflow")
        .step("flaky-operation", {
          retry: {
            maxAttempts: 3,
            backoffMs: 10,
            backoffMultiplier: 1,
          },
          execute: async () => {
            attempts++;
            if (attempts < 3) {
              throw new Error(`Attempt ${attempts} failed`);
            }
            return { success: true, data: { attempts } };
          },
        })
        .build();

      const executor = new WorkflowExecutor();
      const result = await executor.execute(workflow, {});

      expect(result.success).toBe(true);
      expect(attempts).toBe(3);
    });

    it("should fail after max retries", async () => {
      let attempts = 0;

      const workflow = createWorkflow("fail-workflow")
        .step("always-fails", {
          retry: {
            maxAttempts: 3,
            backoffMs: 10,
          },
          execute: async () => {
            attempts++;
            throw new Error("Always fails");
          },
        })
        .build();

      const executor = new WorkflowExecutor();
      const result = await executor.execute(workflow, {});

      expect(result.success).toBe(false);
      expect(attempts).toBe(3);
    });

    it("should not retry non-retryable errors", async () => {
      let attempts = 0;

      const workflow = createWorkflow("non-retryable")
        .step("validation-error", {
          retry: {
            maxAttempts: 3,
            backoffMs: 10,
          },
          execute: async () => {
            attempts++;
            return {
              success: false,
              error: {
                code: "VALIDATION_ERROR",
                message: "Invalid input",
                retryable: false,
              },
            };
          },
        })
        .build();

      const executor = new WorkflowExecutor();
      const result = await executor.execute(workflow, {});

      expect(result.success).toBe(false);
      expect(attempts).toBe(1); // Should not retry
    });
  });

  describe("Workflow Registry Integration", () => {
    it("should register and execute workflow by name", async () => {
      createWorkflow<{ x: number }, { result: number }>("registered-workflow")
        .step("compute", {
          execute: async (input) => {
            const data = input as { x: number };
            return { success: true, data: { result: data.x * 10 } };
          },
        })
        .buildAndRegister();

      const result = await executeWorkflow("registered-workflow", { x: 5 });

      expect(result.success).toBe(true);
      expect(result.output?.result).toBe(50);
    });

    it("should list registered workflows", () => {
      createWorkflow("workflow-a").step("a", { execute: async () => ({ success: true, data: {} }) }).buildAndRegister();
      createWorkflow("workflow-b").step("b", { execute: async () => ({ success: true, data: {} }) }).buildAndRegister();
      createWorkflow("workflow-c").step("c", { execute: async () => ({ success: true, data: {} }) }).buildAndRegister();

      const workflows = WorkflowRegistry.list();

      expect(workflows).toContain("workflow-a");
      expect(workflows).toContain("workflow-b");
      expect(workflows).toContain("workflow-c");
    });
  });

  describe("Complex Real-World Scenarios", () => {
    it("should execute order processing workflow", async () => {
      interface Order {
        id: string;
        items: Array<{ productId: string; quantity: number; price: number }>;
        customerId: string;
      }

      interface OrderResult {
        orderId: string;
        total: number;
        status: string;
      }

      const workflow = createWorkflow<Order, OrderResult>("order-processing")
        .description("Process customer order with validation and pricing")
        // Step 1: Validate order
        .step("validate-order", {
          execute: async (input) => {
            const order = input as Order;
            if (!order.id || !order.items?.length) {
              return {
                success: false,
                error: { code: "INVALID_ORDER", message: "Invalid order", retryable: false },
              };
            }
            return { success: true, data: { order, valid: true } };
          },
        })
        // Step 2: Calculate totals
        .then("calculate-totals", {
          execute: async (input, context) => {
            const order = context.stepResults?.["validate-order"]?.data?.order as Order;
            const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
            const tax = subtotal * 0.1;
            const total = subtotal + tax;
            return { success: true, data: { subtotal, tax, total } };
          },
        })
        // Step 3: Check inventory (parallel for all items)
        .parallel([
          {
            id: "check-inventory",
            execute: async (input, context) => {
              // Simulate inventory check
              const order = context.stepResults?.["validate-order"]?.data?.order as Order;
              const available = order.items.map((item) => ({
                productId: item.productId,
                available: true,
              }));
              return { success: true, data: { inventory: available } };
            },
          },
          {
            id: "validate-customer",
            execute: async (input, context) => {
              // Simulate customer validation
              const order = context.stepResults?.["validate-order"]?.data?.order as Order;
              return {
                success: true,
                data: { customerId: order.customerId, valid: true },
              };
            },
          },
        ])
        // Step 4: Finalize order
        .then("finalize", {
          execute: async (input, context) => {
            const order = context.stepResults?.["validate-order"]?.data?.order as Order;
            const totals = context.stepResults?.["calculate-totals"]?.data;
            return {
              success: true,
              data: {
                orderId: order.id,
                total: totals?.total,
                status: "completed",
              },
            };
          },
        })
        .build();

      const executor = new WorkflowExecutor();
      const result = await executor.execute(workflow, {
        id: "ORD-001",
        customerId: "CUST-123",
        items: [
          { productId: "PROD-A", quantity: 2, price: 25.0 },
          { productId: "PROD-B", quantity: 1, price: 50.0 },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.output?.orderId).toBe("ORD-001");
      expect(result.output?.total).toBe(110); // (2*25 + 50) * 1.1 = 110
      expect(result.output?.status).toBe("completed");
    });

    it("should execute content moderation workflow with HITL", async () => {
      const storage = new MemoryCheckpointStorage({ maxCheckpoints: 10 });
      const checkpointManager = new CheckpointManager({ storage, autoCheckpoint: true });
      const executor = new WorkflowExecutor({ checkpointManager });

      const workflow = createWorkflow<{ content: string }, { status: string }>("content-moderation")
        // Auto-check content
        .step("auto-check", {
          execute: async (input) => {
            const data = input as { content: string };
            const flagged = data.content.toLowerCase().includes("flagged");
            return { success: true, data: { content: data.content, flagged } };
          },
        })
        // Branch based on auto-check result
        .branch([
          {
            condition: (ctx) => ctx.stepResults?.["auto-check"]?.data?.flagged === true,
            stepId: "needs-review",
            execute: async () => ({ success: true, data: { status: "pending_review" } }),
          },
        ], "auto-approved", {
          execute: async () => ({ success: true, data: { status: "approved" } }),
        })
        .build();

      // Test auto-approved path
      const safeResult = await executor.execute(workflow, { content: "This is safe content" });
      expect(safeResult.output?.status).toBe("approved");

      // Test flagged path
      const flaggedResult = await executor.execute(workflow, { content: "This is flagged content" });
      expect(flaggedResult.output?.status).toBe("pending_review");
    });
  });

  describe("Event System Integration", () => {
    it("should emit events throughout workflow execution", async () => {
      const events: string[] = [];

      const executor = new WorkflowExecutor();

      executor.on("workflow:started", () => events.push("workflow:started"));
      executor.on("workflow:completed", () => events.push("workflow:completed"));
      executor.on("step:started", (e) => events.push(`step:started:${e.stepId}`));
      executor.on("step:completed", (e) => events.push(`step:completed:${e.stepId}`));

      const workflow = createWorkflow("event-workflow")
        .step("step1", { execute: async () => ({ success: true, data: {} }) })
        .then("step2", { execute: async () => ({ success: true, data: {} }) })
        .build();

      await executor.execute(workflow, {});

      expect(events).toContain("workflow:started");
      expect(events).toContain("workflow:completed");
      expect(events).toContain("step:started:step1");
      expect(events).toContain("step:completed:step1");
      expect(events).toContain("step:started:step2");
      expect(events).toContain("step:completed:step2");
    });
  });

  describe("State Management", () => {
    it("should maintain state across steps", async () => {
      const workflow = createWorkflow("state-workflow")
        .step("init-state", {
          execute: async (input, context) => {
            context.state.counter = 0;
            context.state.items = [];
            return { success: true, data: {} };
          },
        })
        .then("increment", {
          execute: async (input, context) => {
            context.state.counter++;
            context.state.items.push("item1");
            return { success: true, data: {} };
          },
        })
        .then("increment-again", {
          execute: async (input, context) => {
            context.state.counter++;
            context.state.items.push("item2");
            return { success: true, data: {} };
          },
        })
        .then("read-state", {
          execute: async (input, context) => {
            return {
              success: true,
              data: {
                counter: context.state.counter,
                items: context.state.items,
              },
            };
          },
        })
        .build();

      const executor = new WorkflowExecutor();
      const result = await executor.execute(workflow, {});

      expect(result.success).toBe(true);
      expect(result.stepResults?.["read-state"]?.data?.counter).toBe(2);
      expect(result.stepResults?.["read-state"]?.data?.items).toEqual(["item1", "item2"]);
    });
  });
});
