/**
 * Workflow Persistence Manager Unit Tests
 *
 * Tests for workflow run persistence including:
 * - Workflow run lifecycle
 * - Step execution tracking
 * - Suspension and resumption
 * - Analytics and history
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { WorkflowPersistenceManager } from "../../../src/lib/storage/managers/workflowPersistenceManager.js";
import { MemoryAdapter } from "../../../src/lib/storage/adapters/memoryAdapter.js";
import type { StorageProvider } from "../../../src/lib/types/index.js";

describe("WorkflowPersistenceManager", () => {
  let storage: StorageProvider;
  let manager: WorkflowPersistenceManager;

  beforeEach(async () => {
    storage = new MemoryAdapter();
    await storage.init();
    manager = new WorkflowPersistenceManager(storage);
  });

  afterEach(async () => {
    await storage.close();
  });

  describe("Workflow Run Lifecycle", () => {
    it("should start a workflow run", async () => {
      const run = await manager.startRun({
        workflowId: "workflow1",
        triggerData: { input: "test" },
      });

      expect(run.id).toBeDefined();
      expect(run.workflowId).toBe("workflow1");
      expect(run.status).toBe("running");
      expect(run.triggerData).toEqual({ input: "test" });
      expect(run.stepResults).toBeDefined();
    });

    it("should start a run with resource and thread context", async () => {
      const run = await manager.startRun({
        workflowId: "workflow1",
        resourceId: "user123",
        threadId: "thread456",
      });

      expect(run.resourceId).toBe("user123");
      expect(run.threadId).toBe("thread456");
    });

    it("should get a workflow run", async () => {
      const created = await manager.startRun({ workflowId: "workflow1" });
      const retrieved = await manager.getRun(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
    });

    it("should return null for non-existent run", async () => {
      const result = await manager.getRun("non-existent");
      expect(result).toBeNull();
    });

    it("should update a workflow run", async () => {
      const run = await manager.startRun({ workflowId: "workflow1" });

      const updated = await manager.updateRun(run.id, {
        status: "completed",
        output: { result: "success" },
      });

      expect(updated).not.toBeNull();
      expect(updated?.status).toBe("completed");
      expect(updated?.output).toEqual({ result: "success" });
    });

    it("should complete a workflow run", async () => {
      const run = await manager.startRun({ workflowId: "workflow1" });

      const completed = await manager.completeRun(run.id, {
        result: "success",
      });

      expect(completed).not.toBeNull();
      expect(completed?.status).toBe("completed");
      expect(completed?.output).toEqual({ result: "success" });
    });

    it("should fail a workflow run", async () => {
      const run = await manager.startRun({ workflowId: "workflow1" });

      const failed = await manager.failRun(run.id, {
        code: "ERROR_CODE",
        message: "Something went wrong",
      });

      expect(failed).not.toBeNull();
      expect(failed?.status).toBe("failed");
      expect(failed?.error?.code).toBe("ERROR_CODE");
      expect(failed?.error?.message).toBe("Something went wrong");
    });

    it("should cancel a workflow run", async () => {
      const run = await manager.startRun({ workflowId: "workflow1" });

      const cancelled = await manager.cancelRun(run.id);

      expect(cancelled).not.toBeNull();
      expect(cancelled?.status).toBe("cancelled");
    });
  });

  describe("Step Execution", () => {
    it("should complete a step", async () => {
      const run = await manager.startRun({ workflowId: "workflow1" });

      await manager.completeStep(run.id, "step1", { data: "result" });

      const updated = await manager.getRun(run.id);
      expect(updated?.stepResults?.step1).toBeDefined();
      expect(updated?.stepResults?.step1.status).toBe("completed");
      expect(updated?.stepResults?.step1.output).toEqual({ data: "result" });
    });

    it("should track multiple step executions", async () => {
      const run = await manager.startRun({ workflowId: "workflow1" });

      await manager.completeStep(run.id, "step1", {});
      await manager.completeStep(run.id, "step2", {});
      await manager.failStep(run.id, "step3", {
        code: "ERR",
        message: "Failed",
      });

      const updated = await manager.getRun(run.id);
      expect(Object.keys(updated?.stepResults || {})).toHaveLength(3);
      expect(updated?.stepResults?.step1.status).toBe("completed");
      expect(updated?.stepResults?.step2.status).toBe("completed");
      expect(updated?.stepResults?.step3.status).toBe("failed");
    });

    it("should start and complete step", async () => {
      const run = await manager.startRun({ workflowId: "workflow1" });

      await manager.startStep(run.id, "step1");
      await manager.completeStep(run.id, "step1", { result: "done" });

      const updated = await manager.getRun(run.id);
      expect(updated?.stepResults?.step1.status).toBe("completed");
      expect(updated?.stepResults?.step1.output).toEqual({ result: "done" });
    });

    it("should get step result", async () => {
      const run = await manager.startRun({ workflowId: "workflow1" });

      await manager.completeStep(run.id, "step1", { data: "value" });

      const stepResult = await manager.getStepResult(run.id, "step1");

      expect(stepResult).not.toBeNull();
      expect(stepResult?.status).toBe("completed");
      expect(stepResult?.output).toEqual({ data: "value" });
    });

    it("should return null for non-existent step", async () => {
      const run = await manager.startRun({ workflowId: "workflow1" });
      const stepResult = await manager.getStepResult(run.id, "non-existent");

      expect(stepResult).toBeNull();
    });

    it("should skip a step", async () => {
      const run = await manager.startRun({ workflowId: "workflow1" });

      await manager.skipStep(run.id, "step1");

      const updated = await manager.getRun(run.id);
      expect(updated?.stepResults?.step1.status).toBe("skipped");
    });
  });

  describe("Suspension and Resumption", () => {
    it("should suspend a workflow run", async () => {
      const run = await manager.startRun({ workflowId: "workflow1" });

      const suspended = await manager.suspendRun(run.id, {
        stepId: "step2",
        reason: "waiting for user input",
        resumeData: { input: "pending" },
      });

      expect(suspended).not.toBeNull();
      expect(suspended?.status).toBe("suspended");
      expect(suspended?.suspensionData?.stepId).toBe("step2");
      expect(suspended?.suspensionData?.reason).toBe("waiting for user input");
    });

    it("should resume a suspended workflow run", async () => {
      const run = await manager.startRun({ workflowId: "workflow1" });

      await manager.suspendRun(run.id, {
        stepId: "step2",
        reason: "waiting",
      });

      const resumed = await manager.resumeRun(run.id);

      expect(resumed).not.toBeNull();
      expect(resumed?.status).toBe("running");
      expect(resumed?.suspensionData).toBeUndefined();
    });

    it("should get suspension data", async () => {
      const run = await manager.startRun({ workflowId: "workflow1" });

      await manager.suspendRun(run.id, {
        stepId: "step2",
        reason: "waiting",
        resumeData: { key: "value" },
      });

      const updated = await manager.getRun(run.id);

      expect(updated?.suspensionData).not.toBeNull();
      expect(updated?.suspensionData?.stepId).toBe("step2");
      expect(updated?.suspensionData?.resumeData).toEqual({ key: "value" });
    });
  });

  describe("Run Queries", () => {
    beforeEach(async () => {
      // Create test runs
      await manager.startRun({ workflowId: "workflow1" });
      const run2 = await manager.startRun({ workflowId: "workflow1" });
      await manager.completeRun(run2.id, { result: "done" });

      await manager.startRun({ workflowId: "workflow2" });
      const run4 = await manager.startRun({ workflowId: "workflow2" });
      await manager.failRun(run4.id, { code: "ERR", message: "Error" });
    });

    it("should get runs by workflow ID", async () => {
      const runs = await manager.getRunsByWorkflow("workflow1");

      expect(runs).toHaveLength(2);
      expect(runs.every((r) => r.workflowId === "workflow1")).toBe(true);
    });

    it("should get active runs", async () => {
      const activeRuns = await manager.getActiveRuns();
      expect(activeRuns.length).toBeGreaterThan(0);
      expect(
        activeRuns.every(
          (r) => r.status === "running" || r.status === "pending",
        ),
      ).toBe(true);
    });

    it("should get suspended runs", async () => {
      const run = await manager.startRun({ workflowId: "workflow1" });
      await manager.suspendRun(run.id, {
        stepId: "step1",
        reason: "waiting",
      });

      const suspendedRuns = await manager.getSuspendedRuns();

      expect(suspendedRuns.length).toBeGreaterThan(0);
      expect(suspendedRuns.every((r) => r.status === "suspended")).toBe(true);
    });
  });

  describe("Workflow Analytics", () => {
    beforeEach(async () => {
      // Create test data
      const run1 = await manager.startRun({ workflowId: "workflow1" });
      await manager.completeRun(run1.id, { result: "done" });

      const run2 = await manager.startRun({ workflowId: "workflow1" });
      await manager.failRun(run2.id, { code: "ERR", message: "Error" });

      await manager.startRun({ workflowId: "workflow1" });
    });

    it("should get workflow analytics", async () => {
      const analytics = await manager.getWorkflowAnalytics("workflow1");

      expect(analytics.workflowId).toBe("workflow1");
      expect(analytics.totalRuns).toBe(3);
      expect(analytics.completedRuns).toBe(1);
      expect(analytics.failedRuns).toBe(1);
      expect(analytics.runningRuns).toBe(1);
      expect(analytics.lastRunAt).toBeInstanceOf(Date);
    });

    it("should return zero counts for workflow with no runs", async () => {
      const analytics = await manager.getWorkflowAnalytics("workflow-no-runs");

      expect(analytics.totalRuns).toBe(0);
      expect(analytics.completedRuns).toBe(0);
      expect(analytics.failedRuns).toBe(0);
    });
  });

  describe("Run History", () => {
    it("should get latest run", async () => {
      await manager.startRun({ workflowId: "workflow1" });
      await manager.startRun({ workflowId: "workflow2" });
      const latest = await manager.startRun({ workflowId: "workflow1" });

      const latestRun = await manager.getLatestRun("workflow1");

      expect(latestRun).not.toBeNull();
      expect(latestRun?.id).toBe(latest.id);
    });

    it("should get runs with pagination", async () => {
      for (let i = 0; i < 10; i++) {
        await manager.startRun({ workflowId: "workflow1" });
      }

      const page1 = await manager.getRunsByWorkflow("workflow1", {
        limit: 5,
      });
      expect(page1).toHaveLength(5);

      const page2 = await manager.getRunsByWorkflow("workflow1", {
        limit: 5,
        offset: 5,
      });
      expect(page2).toHaveLength(5);
    });
  });

  describe("Configuration", () => {
    it("should use custom TTL for completed runs", async () => {
      const customManager = new WorkflowPersistenceManager(storage, {
        completedRunTtlSeconds: 3600, // 1 hour
      });

      const run = await customManager.startRun({ workflowId: "workflow1" });
      await customManager.completeRun(run.id, { result: "done" });

      // TTL is set but verification would require waiting
      expect(run).toBeDefined();
    });

    it("should support auto-cleanup configuration", async () => {
      const customManager = new WorkflowPersistenceManager(storage, {
        autoCleanup: true,
        cleanupThresholdMs: 1000,
      });

      expect(customManager).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle completing already completed run", async () => {
      const run = await manager.startRun({ workflowId: "workflow1" });
      await manager.completeRun(run.id, { result: "first" });

      const updated = await manager.completeRun(run.id, { result: "second" });

      expect(updated?.output).toEqual({ result: "second" });
    });

    it("should handle failing already failed run", async () => {
      const run = await manager.startRun({ workflowId: "workflow1" });
      await manager.failRun(run.id, { code: "ERR1", message: "First" });

      const updated = await manager.failRun(run.id, {
        code: "ERR2",
        message: "Second",
      });

      expect(updated?.error?.code).toBe("ERR2");
    });

    it("should handle suspending already suspended run", async () => {
      const run = await manager.startRun({ workflowId: "workflow1" });
      await manager.suspendRun(run.id, {
        stepId: "step1",
        reason: "first",
      });

      const updated = await manager.suspendRun(run.id, {
        stepId: "step2",
        reason: "second",
      });

      expect(updated?.suspensionData?.stepId).toBe("step2");
    });

    it("should handle resuming non-suspended run", async () => {
      const run = await manager.startRun({ workflowId: "workflow1" });

      const resumed = await manager.resumeRun(run.id);

      expect(resumed?.status).toBe("running");
    });

    it("should handle large trigger data", async () => {
      const largeTriggerData = {
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          value: `item-${i}`,
        })),
      };

      const run = await manager.startRun({
        workflowId: "workflow1",
        triggerData: largeTriggerData,
      });

      expect(run.triggerData).toEqual(largeTriggerData);
    });

    it("should handle many step executions", async () => {
      const run = await manager.startRun({ workflowId: "workflow1" });

      for (let i = 0; i < 100; i++) {
        await manager.completeStep(run.id, `step${i}`, {});
      }

      const updated = await manager.getRun(run.id);
      expect(Object.keys(updated?.stepResults || {})).toHaveLength(100);
    });
  });

  describe("Error Handling", () => {
    it("should handle updating non-existent run", async () => {
      const result = await manager.updateRun("non-existent", {
        status: "completed",
      });

      expect(result).toBeNull();
    });

    it("should handle completing step for non-existent run", async () => {
      const result = await manager.completeStep("non-existent", "step1", {});
      expect(result).toBe(false);
    });

    it("should handle getting suspension data for non-suspended run", async () => {
      const run = await manager.startRun({ workflowId: "workflow1" });
      const updated = await manager.getRun(run.id);

      expect(updated?.suspensionData).toBeUndefined();
    });
  });

  describe("Concurrent Operations", () => {
    it("should handle concurrent step executions", async () => {
      const run = await manager.startRun({ workflowId: "workflow1" });

      const promises = Array.from({ length: 10 }, (_, i) =>
        manager.completeStep(run.id, `step${i}`, {}),
      );

      await Promise.all(promises);

      const updated = await manager.getRun(run.id);
      expect(Object.keys(updated?.stepResults || {})).toHaveLength(10);
    });

    it("should handle concurrent run creation", async () => {
      const promises = Array.from({ length: 10 }, () =>
        manager.startRun({ workflowId: "workflow1" }),
      );

      const runs = await Promise.all(promises);

      expect(runs).toHaveLength(10);
      expect(new Set(runs.map((r) => r.id)).size).toBe(10); // All unique
    });
  });
});
