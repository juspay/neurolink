/**
 * SuspendResumeManager Tests
 *
 * Tests for workflow suspension and resumption with HITL support.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  SuspendResumeManager,
  createHITLSuspension,
  createExternalSuspension,
  createTimerSuspension,
} from "../../src/lib/workflow/index.js";
import type { SuspensionRequest } from "../../src/lib/workflow/index.js";

describe("SuspendResumeManager", () => {
  let manager: SuspendResumeManager;

  beforeEach(() => {
    manager = new SuspendResumeManager();
    vi.useFakeTimers();
  });

  afterEach(() => {
    manager.dispose();
    vi.useRealTimers();
  });

  describe("Basic Suspension", () => {
    it("should register a suspension request", async () => {
      const request: SuspensionRequest = {
        reason: "Approval required",
        type: "hitl",
        expiresAt: Date.now() + 60000,
      };

      const suspensionId = await manager.registerSuspension(
        "workflow-1",
        "exec-1",
        "step-1",
        request,
      );

      expect(suspensionId).toBeDefined();
      expect(typeof suspensionId).toBe("string");
    });

    it("should track pending suspensions", async () => {
      const request: SuspensionRequest = {
        reason: "Test suspension",
        type: "hitl",
        expiresAt: Date.now() + 60000,
      };

      const suspensionId = await manager.registerSuspension(
        "workflow-1",
        "exec-1",
        "step-1",
        request,
      );

      const pending = manager.getPendingSuspension(suspensionId);

      expect(pending).toBeDefined();
      expect(pending?.workflowId).toBe("workflow-1");
      expect(pending?.executionId).toBe("exec-1");
      expect(pending?.stepId).toBe("step-1");
      expect(pending?.request.reason).toBe("Test suspension");
    });

    it("should list suspensions for workflow", async () => {
      await manager.registerSuspension("workflow-1", "exec-1", "step-1", {
        reason: "Suspension 1",
        type: "hitl",
        expiresAt: Date.now() + 60000,
      });

      await manager.registerSuspension("workflow-1", "exec-2", "step-2", {
        reason: "Suspension 2",
        type: "hitl",
        expiresAt: Date.now() + 60000,
      });

      await manager.registerSuspension("workflow-2", "exec-3", "step-1", {
        reason: "Different workflow",
        type: "hitl",
        expiresAt: Date.now() + 60000,
      });

      const workflow1Suspensions = manager.listSuspensions("workflow-1");

      expect(workflow1Suspensions).toHaveLength(2);
      expect(workflow1Suspensions.every((s) => s.workflowId === "workflow-1")).toBe(true);
    });
  });

  describe("Resumption", () => {
    it("should resume suspension with data", async () => {
      const suspensionId = await manager.registerSuspension(
        "workflow-1",
        "exec-1",
        "approval-step",
        {
          reason: "Approval required",
          type: "hitl",
          expiresAt: Date.now() + 60000,
        },
      );

      const resumeData = {
        approved: true,
        approver: "user@example.com",
        comment: "Looks good!",
      };

      const result = await manager.resume(suspensionId, resumeData);

      expect(result.success).toBe(true);
      expect(result.resumeData).toEqual(resumeData);
    });

    it("should remove suspension after resume", async () => {
      const suspensionId = await manager.registerSuspension(
        "workflow-1",
        "exec-1",
        "step-1",
        {
          reason: "Test",
          type: "hitl",
          expiresAt: Date.now() + 60000,
        },
      );

      await manager.resume(suspensionId, { done: true });

      const pending = manager.getPendingSuspension(suspensionId);
      expect(pending).toBeUndefined();
    });

    it("should fail to resume non-existent suspension", async () => {
      const result = await manager.resume("nonexistent", { data: true });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should fail to resume already resumed suspension", async () => {
      const suspensionId = await manager.registerSuspension(
        "workflow-1",
        "exec-1",
        "step-1",
        {
          reason: "Test",
          type: "hitl",
          expiresAt: Date.now() + 60000,
        },
      );

      // First resume
      await manager.resume(suspensionId, { first: true });

      // Second resume attempt
      const result = await manager.resume(suspensionId, { second: true });

      expect(result.success).toBe(false);
    });
  });

  describe("Rejection", () => {
    it("should reject suspension with reason", async () => {
      const suspensionId = await manager.registerSuspension(
        "workflow-1",
        "exec-1",
        "approval-step",
        {
          reason: "Approval required",
          type: "hitl",
          expiresAt: Date.now() + 60000,
        },
      );

      const result = await manager.reject(suspensionId, "Request denied");

      expect(result.success).toBe(true);
      expect(result.rejected).toBe(true);
      expect(result.reason).toBe("Request denied");
    });

    it("should remove suspension after rejection", async () => {
      const suspensionId = await manager.registerSuspension(
        "workflow-1",
        "exec-1",
        "step-1",
        {
          reason: "Test",
          type: "hitl",
          expiresAt: Date.now() + 60000,
        },
      );

      await manager.reject(suspensionId, "Rejected");

      const pending = manager.getPendingSuspension(suspensionId);
      expect(pending).toBeUndefined();
    });
  });

  describe("Timeout Handling", () => {
    it("should timeout expired suspensions", async () => {
      const timeoutHandler = vi.fn();

      const managerWithTimeout = new SuspendResumeManager({
        onTimeout: timeoutHandler,
      });

      await managerWithTimeout.registerSuspension(
        "workflow-1",
        "exec-1",
        "step-1",
        {
          reason: "Test",
          type: "hitl",
          expiresAt: Date.now() + 1000, // Expires in 1 second
        },
      );

      // Fast-forward time
      vi.advanceTimersByTime(2000);

      // Check for expired suspensions
      await managerWithTimeout.checkExpiredSuspensions();

      expect(timeoutHandler).toHaveBeenCalled();

      managerWithTimeout.dispose();
    });

    it("should not timeout non-expired suspensions", async () => {
      const timeoutHandler = vi.fn();

      const managerWithTimeout = new SuspendResumeManager({
        onTimeout: timeoutHandler,
      });

      await managerWithTimeout.registerSuspension(
        "workflow-1",
        "exec-1",
        "step-1",
        {
          reason: "Test",
          type: "hitl",
          expiresAt: Date.now() + 60000, // Expires in 60 seconds
        },
      );

      // Fast-forward less than expiry
      vi.advanceTimersByTime(30000);

      await managerWithTimeout.checkExpiredSuspensions();

      expect(timeoutHandler).not.toHaveBeenCalled();

      managerWithTimeout.dispose();
    });
  });

  describe("Suspension Types", () => {
    it("should handle HITL suspension type", async () => {
      const suspensionId = await manager.registerSuspension(
        "workflow-1",
        "exec-1",
        "approval-step",
        {
          reason: "Human approval required",
          type: "hitl",
          resumeData: {
            actionType: "approval",
            approvers: ["admin@example.com"],
          },
          expiresAt: Date.now() + 86400000,
        },
      );

      const pending = manager.getPendingSuspension(suspensionId);

      expect(pending?.request.type).toBe("hitl");
      expect(pending?.request.resumeData?.actionType).toBe("approval");
    });

    it("should handle external suspension type", async () => {
      const suspensionId = await manager.registerSuspension(
        "workflow-1",
        "exec-1",
        "webhook-step",
        {
          reason: "Waiting for webhook",
          type: "external",
          callbackId: "webhook-123",
          expiresAt: Date.now() + 3600000,
        },
      );

      const pending = manager.getPendingSuspension(suspensionId);

      expect(pending?.request.type).toBe("external");
      expect(pending?.request.callbackId).toBe("webhook-123");
    });

    it("should handle timer suspension type", async () => {
      const suspensionId = await manager.registerSuspension(
        "workflow-1",
        "exec-1",
        "wait-step",
        {
          reason: "Scheduled delay",
          type: "timer",
          expiresAt: Date.now() + 300000,
        },
      );

      const pending = manager.getPendingSuspension(suspensionId);

      expect(pending?.request.type).toBe("timer");
    });
  });

  describe("Events", () => {
    it("should emit suspension registered event", async () => {
      const handler = vi.fn();
      manager.on("suspension:registered", handler);

      await manager.registerSuspension("workflow-1", "exec-1", "step-1", {
        reason: "Test",
        type: "hitl",
        expiresAt: Date.now() + 60000,
      });

      expect(handler).toHaveBeenCalled();
    });

    it("should emit suspension resumed event", async () => {
      const handler = vi.fn();
      manager.on("suspension:resumed", handler);

      const suspensionId = await manager.registerSuspension(
        "workflow-1",
        "exec-1",
        "step-1",
        {
          reason: "Test",
          type: "hitl",
          expiresAt: Date.now() + 60000,
        },
      );

      await manager.resume(suspensionId, { approved: true });

      expect(handler).toHaveBeenCalled();
    });

    it("should emit suspension rejected event", async () => {
      const handler = vi.fn();
      manager.on("suspension:rejected", handler);

      const suspensionId = await manager.registerSuspension(
        "workflow-1",
        "exec-1",
        "step-1",
        {
          reason: "Test",
          type: "hitl",
          expiresAt: Date.now() + 60000,
        },
      );

      await manager.reject(suspensionId, "Denied");

      expect(handler).toHaveBeenCalled();
    });

    it("should emit suspension timeout event", async () => {
      const handler = vi.fn();
      manager.on("suspension:timeout", handler);

      await manager.registerSuspension("workflow-1", "exec-1", "step-1", {
        reason: "Test",
        type: "hitl",
        expiresAt: Date.now() + 1000,
      });

      vi.advanceTimersByTime(2000);
      await manager.checkExpiredSuspensions();

      expect(handler).toHaveBeenCalled();
    });
  });

  describe("Cleanup", () => {
    it("should cancel pending suspension", async () => {
      const suspensionId = await manager.registerSuspension(
        "workflow-1",
        "exec-1",
        "step-1",
        {
          reason: "Test",
          type: "hitl",
          expiresAt: Date.now() + 60000,
        },
      );

      await manager.cancel(suspensionId);

      const pending = manager.getPendingSuspension(suspensionId);
      expect(pending).toBeUndefined();
    });

    it("should clear all suspensions for workflow", async () => {
      await manager.registerSuspension("workflow-1", "exec-1", "step-1", {
        reason: "Suspension 1",
        type: "hitl",
        expiresAt: Date.now() + 60000,
      });

      await manager.registerSuspension("workflow-1", "exec-2", "step-2", {
        reason: "Suspension 2",
        type: "hitl",
        expiresAt: Date.now() + 60000,
      });

      await manager.clearWorkflowSuspensions("workflow-1");

      const remaining = manager.listSuspensions("workflow-1");
      expect(remaining).toHaveLength(0);
    });

    it("should dispose manager and clear all suspensions", () => {
      manager.dispose();

      // Verify manager is disposed (no suspensions should be tracked)
      const allSuspensions = manager.listAllSuspensions();
      expect(allSuspensions).toHaveLength(0);
    });
  });
});

describe("Suspension Helper Functions", () => {
  describe("createHITLSuspension", () => {
    it("should create HITL suspension request", () => {
      const suspension = createHITLSuspension(
        "Approval required for deployment",
        {
          actionType: "approval",
          approvers: ["admin@example.com", "manager@example.com"],
        },
        86400000, // 24 hours
      );

      expect(suspension.reason).toBe("Approval required for deployment");
      expect(suspension.type).toBe("hitl");
      expect(suspension.resumeData?.actionType).toBe("approval");
      expect(suspension.resumeData?.approvers).toHaveLength(2);
      expect(suspension.expiresAt).toBeGreaterThan(Date.now());
    });

    it("should use default timeout if not specified", () => {
      const suspension = createHITLSuspension("Test", {});

      expect(suspension.expiresAt).toBeDefined();
      expect(suspension.expiresAt).toBeGreaterThan(Date.now());
    });
  });

  describe("createExternalSuspension", () => {
    it("should create external suspension request", () => {
      const suspension = createExternalSuspension(
        "Waiting for payment confirmation",
        "payment-webhook-456",
        3600000, // 1 hour
      );

      expect(suspension.reason).toBe("Waiting for payment confirmation");
      expect(suspension.type).toBe("external");
      expect(suspension.callbackId).toBe("payment-webhook-456");
      expect(suspension.expiresAt).toBeGreaterThan(Date.now());
    });
  });

  describe("createTimerSuspension", () => {
    it("should create timer suspension request", () => {
      const suspension = createTimerSuspension(
        "Scheduled delay",
        300000, // 5 minutes
      );

      expect(suspension.reason).toBe("Scheduled delay");
      expect(suspension.type).toBe("timer");
      expect(suspension.expiresAt).toBeDefined();
    });
  });
});

describe("Resume Data Validation", () => {
  let manager: SuspendResumeManager;

  beforeEach(() => {
    manager = new SuspendResumeManager();
  });

  afterEach(() => {
    manager.dispose();
  });

  it("should accept valid resume data for approval", async () => {
    const suspensionId = await manager.registerSuspension(
      "workflow-1",
      "exec-1",
      "approval-step",
      {
        reason: "Approval",
        type: "hitl",
        resumeData: { actionType: "approval" },
        expiresAt: Date.now() + 60000,
      },
    );

    const result = await manager.resume(suspensionId, {
      approved: true,
      approver: "admin@example.com",
    });

    expect(result.success).toBe(true);
  });

  it("should accept complex resume data", async () => {
    const suspensionId = await manager.registerSuspension(
      "workflow-1",
      "exec-1",
      "input-step",
      {
        reason: "User input required",
        type: "hitl",
        resumeData: { actionType: "input" },
        expiresAt: Date.now() + 60000,
      },
    );

    const complexData = {
      formData: {
        name: "John Doe",
        email: "john@example.com",
        preferences: {
          notifications: true,
          theme: "dark",
        },
      },
      metadata: {
        submittedAt: Date.now(),
        source: "web",
      },
    };

    const result = await manager.resume(suspensionId, complexData);

    expect(result.success).toBe(true);
    expect(result.resumeData).toEqual(complexData);
  });
});
