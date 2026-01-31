/**
 * CheckpointManager Tests
 *
 * Tests for workflow checkpoint persistence and retrieval.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  CheckpointManager,
  MemoryCheckpointStorage,
  createCheckpointManager,
} from "../../src/lib/workflow/index.js";
import type { WorkflowCheckpoint } from "../../src/lib/workflow/index.js";

describe("CheckpointManager", () => {
  describe("MemoryCheckpointStorage", () => {
    let storage: MemoryCheckpointStorage;

    beforeEach(() => {
      storage = new MemoryCheckpointStorage({ maxCheckpoints: 10 });
    });

    describe("Basic Operations", () => {
      it("should save and retrieve checkpoint", async () => {
        const checkpoint: WorkflowCheckpoint = {
          id: "cp-1",
          workflowId: "test-workflow",
          executionId: "exec-1",
          stepId: "step-1",
          status: "running",
          state: { counter: 1 },
          stepResults: {},
          createdAt: Date.now(),
        };

        await storage.save(checkpoint);
        const retrieved = await storage.get("cp-1");

        expect(retrieved).toEqual(checkpoint);
      });

      it("should return undefined for non-existent checkpoint", async () => {
        const result = await storage.get("nonexistent");
        expect(result).toBeUndefined();
      });

      it("should list checkpoints for workflow", async () => {
        const checkpoints: WorkflowCheckpoint[] = [
          {
            id: "cp-1",
            workflowId: "workflow-1",
            executionId: "exec-1",
            stepId: "step-1",
            status: "running",
            state: {},
            stepResults: {},
            createdAt: Date.now(),
          },
          {
            id: "cp-2",
            workflowId: "workflow-1",
            executionId: "exec-1",
            stepId: "step-2",
            status: "running",
            state: {},
            stepResults: {},
            createdAt: Date.now() + 1000,
          },
          {
            id: "cp-3",
            workflowId: "workflow-2",
            executionId: "exec-2",
            stepId: "step-1",
            status: "running",
            state: {},
            stepResults: {},
            createdAt: Date.now() + 2000,
          },
        ];

        for (const cp of checkpoints) {
          await storage.save(cp);
        }

        const workflow1Checkpoints = await storage.list("workflow-1");
        expect(workflow1Checkpoints).toHaveLength(2);
        expect(workflow1Checkpoints.every((cp) => cp.workflowId === "workflow-1")).toBe(true);
      });

      it("should delete checkpoint", async () => {
        const checkpoint: WorkflowCheckpoint = {
          id: "cp-delete",
          workflowId: "test",
          executionId: "exec-1",
          stepId: "step-1",
          status: "running",
          state: {},
          stepResults: {},
          createdAt: Date.now(),
        };

        await storage.save(checkpoint);
        expect(await storage.get("cp-delete")).toBeDefined();

        await storage.delete("cp-delete");
        expect(await storage.get("cp-delete")).toBeUndefined();
      });

      it("should clear all checkpoints for workflow", async () => {
        const checkpoints: WorkflowCheckpoint[] = [
          {
            id: "cp-a",
            workflowId: "workflow-clear",
            executionId: "exec-1",
            stepId: "step-1",
            status: "running",
            state: {},
            stepResults: {},
            createdAt: Date.now(),
          },
          {
            id: "cp-b",
            workflowId: "workflow-clear",
            executionId: "exec-1",
            stepId: "step-2",
            status: "running",
            state: {},
            stepResults: {},
            createdAt: Date.now() + 1000,
          },
        ];

        for (const cp of checkpoints) {
          await storage.save(cp);
        }

        expect((await storage.list("workflow-clear")).length).toBe(2);

        await storage.clear("workflow-clear");

        expect((await storage.list("workflow-clear")).length).toBe(0);
      });
    });

    describe("Max Checkpoints Limit", () => {
      it("should enforce max checkpoints per workflow", async () => {
        const limitedStorage = new MemoryCheckpointStorage({ maxCheckpoints: 3 });

        for (let i = 0; i < 5; i++) {
          await limitedStorage.save({
            id: `cp-${i}`,
            workflowId: "limited-workflow",
            executionId: "exec-1",
            stepId: `step-${i}`,
            status: "running",
            state: {},
            stepResults: {},
            createdAt: Date.now() + i * 1000,
          });
        }

        const checkpoints = await limitedStorage.list("limited-workflow");
        expect(checkpoints.length).toBeLessThanOrEqual(3);
      });
    });

    describe("Latest Checkpoint", () => {
      it("should retrieve latest checkpoint for execution", async () => {
        const checkpoints: WorkflowCheckpoint[] = [
          {
            id: "cp-old",
            workflowId: "test",
            executionId: "exec-1",
            stepId: "step-1",
            status: "running",
            state: { version: 1 },
            stepResults: {},
            createdAt: Date.now() - 5000,
          },
          {
            id: "cp-middle",
            workflowId: "test",
            executionId: "exec-1",
            stepId: "step-2",
            status: "running",
            state: { version: 2 },
            stepResults: {},
            createdAt: Date.now() - 2000,
          },
          {
            id: "cp-latest",
            workflowId: "test",
            executionId: "exec-1",
            stepId: "step-3",
            status: "running",
            state: { version: 3 },
            stepResults: {},
            createdAt: Date.now(),
          },
        ];

        for (const cp of checkpoints) {
          await storage.save(cp);
        }

        const latest = await storage.getLatest("test", "exec-1");
        expect(latest?.id).toBe("cp-latest");
        expect(latest?.state?.version).toBe(3);
      });
    });
  });

  describe("CheckpointManager", () => {
    let manager: CheckpointManager;
    let storage: MemoryCheckpointStorage;

    beforeEach(() => {
      storage = new MemoryCheckpointStorage({ maxCheckpoints: 10 });
      manager = new CheckpointManager({
        storage,
        autoCheckpoint: false,
      });
    });

    describe("Checkpoint Creation", () => {
      it("should create checkpoint with all required fields", async () => {
        const checkpoint = await manager.createCheckpoint({
          workflowId: "test-workflow",
          executionId: "exec-1",
          stepId: "current-step",
          status: "running",
          state: { data: "test" },
          stepResults: {
            "previous-step": { success: true, data: { result: 1 } },
          },
        });

        expect(checkpoint.id).toBeDefined();
        expect(checkpoint.workflowId).toBe("test-workflow");
        expect(checkpoint.executionId).toBe("exec-1");
        expect(checkpoint.stepId).toBe("current-step");
        expect(checkpoint.status).toBe("running");
        expect(checkpoint.state).toEqual({ data: "test" });
        expect(checkpoint.createdAt).toBeDefined();
      });

      it("should persist checkpoint to storage", async () => {
        const checkpoint = await manager.createCheckpoint({
          workflowId: "persist-test",
          executionId: "exec-1",
          stepId: "step-1",
          status: "running",
          state: {},
          stepResults: {},
        });

        const retrieved = await storage.get(checkpoint.id);
        expect(retrieved).toEqual(checkpoint);
      });
    });

    describe("Checkpoint Retrieval", () => {
      it("should get checkpoint by ID", async () => {
        const created = await manager.createCheckpoint({
          workflowId: "get-test",
          executionId: "exec-1",
          stepId: "step-1",
          status: "running",
          state: { value: 42 },
          stepResults: {},
        });

        const retrieved = await manager.getCheckpoint(created.id);
        expect(retrieved).toEqual(created);
      });

      it("should get latest checkpoint for execution", async () => {
        await manager.createCheckpoint({
          workflowId: "latest-test",
          executionId: "exec-1",
          stepId: "step-1",
          status: "running",
          state: { version: 1 },
          stepResults: {},
        });

        await manager.createCheckpoint({
          workflowId: "latest-test",
          executionId: "exec-1",
          stepId: "step-2",
          status: "running",
          state: { version: 2 },
          stepResults: {},
        });

        const latest = await manager.getLatestCheckpoint("latest-test", "exec-1");
        expect(latest?.state?.version).toBe(2);
      });
    });

    describe("Checkpoint Restoration", () => {
      it("should restore workflow state from checkpoint", async () => {
        const checkpoint = await manager.createCheckpoint({
          workflowId: "restore-test",
          executionId: "exec-1",
          stepId: "step-2",
          status: "running",
          state: { counter: 5, data: [1, 2, 3] },
          stepResults: {
            "step-1": { success: true, data: { initialized: true } },
          },
        });

        const restored = await manager.restoreFromCheckpoint(checkpoint.id);

        expect(restored).toBeDefined();
        expect(restored?.state).toEqual({ counter: 5, data: [1, 2, 3] });
        expect(restored?.stepResults).toHaveProperty("step-1");
        expect(restored?.currentStep).toBe("step-2");
      });

      it("should return undefined for non-existent checkpoint", async () => {
        const restored = await manager.restoreFromCheckpoint("nonexistent");
        expect(restored).toBeUndefined();
      });
    });

    describe("Checkpoint Cleanup", () => {
      it("should delete specific checkpoint", async () => {
        const checkpoint = await manager.createCheckpoint({
          workflowId: "delete-test",
          executionId: "exec-1",
          stepId: "step-1",
          status: "running",
          state: {},
          stepResults: {},
        });

        await manager.deleteCheckpoint(checkpoint.id);

        const retrieved = await manager.getCheckpoint(checkpoint.id);
        expect(retrieved).toBeUndefined();
      });

      it("should clear all checkpoints for workflow", async () => {
        await manager.createCheckpoint({
          workflowId: "clear-test",
          executionId: "exec-1",
          stepId: "step-1",
          status: "running",
          state: {},
          stepResults: {},
        });

        await manager.createCheckpoint({
          workflowId: "clear-test",
          executionId: "exec-1",
          stepId: "step-2",
          status: "running",
          state: {},
          stepResults: {},
        });

        await manager.clearWorkflowCheckpoints("clear-test");

        const checkpoints = await storage.list("clear-test");
        expect(checkpoints.length).toBe(0);
      });
    });

    describe("Auto Checkpoint", () => {
      it("should create checkpoint when auto-checkpoint is enabled", async () => {
        const autoManager = new CheckpointManager({
          storage,
          autoCheckpoint: true,
          checkpointInterval: 1, // Every step
        });

        // Simulate step completion
        await autoManager.onStepComplete({
          workflowId: "auto-test",
          executionId: "exec-1",
          stepId: "step-1",
          status: "running",
          state: { step: 1 },
          stepResults: {
            "step-1": { success: true, data: {} },
          },
        });

        const checkpoints = await storage.list("auto-test");
        expect(checkpoints.length).toBeGreaterThan(0);
      });
    });

    describe("Suspension Checkpoints", () => {
      it("should create suspension checkpoint", async () => {
        const checkpoint = await manager.createSuspensionCheckpoint({
          workflowId: "suspend-test",
          executionId: "exec-1",
          stepId: "approval-step",
          state: { pendingApproval: true },
          stepResults: {},
          suspensionRequest: {
            reason: "Approval required",
            type: "hitl",
            expiresAt: Date.now() + 86400000,
          },
        });

        expect(checkpoint.status).toBe("suspended");
        expect(checkpoint.suspensionRequest).toBeDefined();
        expect(checkpoint.suspensionRequest?.type).toBe("hitl");
      });
    });
  });

  describe("createCheckpointManager", () => {
    it("should create manager with default options", () => {
      const manager = createCheckpointManager();
      expect(manager).toBeInstanceOf(CheckpointManager);
    });

    it("should create manager with custom storage", () => {
      const customStorage = new MemoryCheckpointStorage({ maxCheckpoints: 5 });
      const manager = createCheckpointManager({
        storage: customStorage,
      });
      expect(manager).toBeInstanceOf(CheckpointManager);
    });

    it("should create manager with auto-checkpoint enabled", () => {
      const manager = createCheckpointManager({
        autoCheckpoint: true,
        checkpointInterval: 2,
      });
      expect(manager).toBeInstanceOf(CheckpointManager);
    });
  });

  describe("Checkpoint Data Integrity", () => {
    let storage: MemoryCheckpointStorage;
    let manager: CheckpointManager;

    beforeEach(() => {
      storage = new MemoryCheckpointStorage({ maxCheckpoints: 10 });
      manager = new CheckpointManager({ storage });
    });

    it("should preserve complex state objects", async () => {
      const complexState = {
        nested: {
          deep: {
            value: 42,
          },
        },
        array: [1, 2, { nested: true }],
        date: new Date().toISOString(),
        nullValue: null,
        undefinedValue: undefined,
      };

      const checkpoint = await manager.createCheckpoint({
        workflowId: "complex-state",
        executionId: "exec-1",
        stepId: "step-1",
        status: "running",
        state: complexState,
        stepResults: {},
      });

      const retrieved = await manager.getCheckpoint(checkpoint.id);

      expect(retrieved?.state?.nested?.deep?.value).toBe(42);
      expect(retrieved?.state?.array).toHaveLength(3);
      expect(retrieved?.state?.array?.[2]?.nested).toBe(true);
    });

    it("should preserve step results", async () => {
      const stepResults = {
        "step-1": {
          success: true,
          data: { count: 10 },
          metadata: { duration: 100 },
        },
        "step-2": {
          success: false,
          error: { code: "ERR", message: "Failed" },
        },
      };

      const checkpoint = await manager.createCheckpoint({
        workflowId: "results-test",
        executionId: "exec-1",
        stepId: "step-3",
        status: "running",
        state: {},
        stepResults,
      });

      const retrieved = await manager.getCheckpoint(checkpoint.id);

      expect(retrieved?.stepResults?.["step-1"]?.success).toBe(true);
      expect(retrieved?.stepResults?.["step-1"]?.data?.count).toBe(10);
      expect(retrieved?.stepResults?.["step-2"]?.success).toBe(false);
      expect(retrieved?.stepResults?.["step-2"]?.error?.code).toBe("ERR");
    });
  });

  describe("Concurrent Operations", () => {
    let storage: MemoryCheckpointStorage;
    let manager: CheckpointManager;

    beforeEach(() => {
      storage = new MemoryCheckpointStorage({ maxCheckpoints: 100 });
      manager = new CheckpointManager({ storage });
    });

    it("should handle concurrent checkpoint creation", async () => {
      const promises = Array.from({ length: 20 }, (_, i) =>
        manager.createCheckpoint({
          workflowId: "concurrent-test",
          executionId: "exec-1",
          stepId: `step-${i}`,
          status: "running",
          state: { index: i },
          stepResults: {},
        }),
      );

      const checkpoints = await Promise.all(promises);

      expect(checkpoints).toHaveLength(20);
      const uniqueIds = new Set(checkpoints.map((cp) => cp.id));
      expect(uniqueIds.size).toBe(20);
    });

    it("should handle concurrent reads and writes", async () => {
      // Create initial checkpoints
      for (let i = 0; i < 5; i++) {
        await manager.createCheckpoint({
          workflowId: "rw-test",
          executionId: "exec-1",
          stepId: `step-${i}`,
          status: "running",
          state: { index: i },
          stepResults: {},
        });
      }

      // Concurrent reads and writes
      const operations = [
        manager.createCheckpoint({
          workflowId: "rw-test",
          executionId: "exec-1",
          stepId: "step-5",
          status: "running",
          state: {},
          stepResults: {},
        }),
        storage.list("rw-test"),
        manager.getLatestCheckpoint("rw-test", "exec-1"),
        manager.createCheckpoint({
          workflowId: "rw-test",
          executionId: "exec-1",
          stepId: "step-6",
          status: "running",
          state: {},
          stepResults: {},
        }),
      ];

      const results = await Promise.all(operations);

      expect(results).toHaveLength(4);
    });
  });
});
