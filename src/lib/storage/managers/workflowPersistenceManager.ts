/**
 * Workflow Persistence Manager
 *
 * Manages workflow run persistence for durable workflow execution.
 * Supports workflow state snapshots, step results, and suspension/resumption.
 *
 * Features:
 * - Workflow run lifecycle management
 * - Step result tracking
 * - Workflow suspension and resumption
 * - Run history and analytics
 * - Error tracking and recovery
 */

import type { JsonValue } from "../../types/index.js";
import type {
  StorageProvider,
  StorageWorkflowRun,
  SaveWorkflowRunInput,
  WorkflowRunQueryOptions,
  PaginatedResult,
  WorkflowRunStatus,
  StorageWorkflowError,
  StepRunResult,
  SuspensionData,
  WorkflowPersistenceManagerOptions,
  WorkflowRunInput,
  WorkflowRunUpdate,
  StorageWorkflowAnalytics,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";

/**
 * Workflow Persistence Manager
 *
 * Provides durable workflow state management for long-running and suspendable workflows.
 */
export class WorkflowPersistenceManager {
  private storage: StorageProvider;
  private options: Required<WorkflowPersistenceManagerOptions>;

  constructor(
    storage: StorageProvider,
    options?: WorkflowPersistenceManagerOptions,
  ) {
    this.storage = storage;
    this.options = {
      completedRunTtlSeconds:
        options?.completedRunTtlSeconds || 7 * 24 * 60 * 60, // 7 days
      autoCleanup: options?.autoCleanup || false,
      cleanupThresholdMs:
        options?.cleanupThresholdMs || 30 * 24 * 60 * 60 * 1000, // 30 days
    };
  }

  // ============================================================================
  // Workflow Run Lifecycle
  // ============================================================================

  /**
   * Start a new workflow run
   */
  async startRun(input: WorkflowRunInput): Promise<StorageWorkflowRun> {
    const runInput: SaveWorkflowRunInput = {
      workflowId: input.workflowId,
      status: "running",
      triggerData: input.triggerData,
      resourceId: input.resourceId,
      threadId: input.threadId,
      stepResults: {},
    };

    const run = await this.storage.saveWorkflowRun(runInput);
    logger.debug("[WorkflowPersistence] Started run", {
      runId: run.id,
      workflowId: input.workflowId,
    });

    return run;
  }

  /**
   * Get a workflow run by ID
   */
  async getRun(runId: string): Promise<StorageWorkflowRun | null> {
    return this.storage.getWorkflowRun(runId);
  }

  /**
   * Update a workflow run
   */
  async updateRun(
    runId: string,
    update: WorkflowRunUpdate,
  ): Promise<StorageWorkflowRun | null> {
    const existing = await this.storage.getWorkflowRun(runId);
    if (!existing) {
      return null;
    }

    const runInput: SaveWorkflowRunInput = {
      ...existing,
      status: update.status || existing.status,
      output: update.output !== undefined ? update.output : existing.output,
      error: update.error || existing.error,
      suspensionData: update.suspensionData || existing.suspensionData,
    };

    return this.storage.saveWorkflowRun(runInput);
  }

  /**
   * Complete a workflow run successfully
   */
  async completeRun(
    runId: string,
    output?: JsonValue,
  ): Promise<StorageWorkflowRun | null> {
    const run = await this.storage.updateWorkflowRunStatus(
      runId,
      "completed",
      output,
    );

    if (run) {
      logger.debug("[WorkflowPersistence] Completed run", { runId });
    }

    return run;
  }

  /**
   * Fail a workflow run
   */
  async failRun(
    runId: string,
    error: StorageWorkflowError,
  ): Promise<StorageWorkflowRun | null> {
    const run = await this.storage.updateWorkflowRunStatus(
      runId,
      "failed",
      undefined,
      error,
    );

    if (run) {
      logger.warn("[WorkflowPersistence] Failed run", {
        runId,
        error: error.message,
      });
    }

    return run;
  }

  /**
   * Cancel a workflow run
   */
  async cancelRun(runId: string): Promise<StorageWorkflowRun | null> {
    const run = await this.storage.updateWorkflowRunStatus(runId, "cancelled");

    if (run) {
      logger.debug("[WorkflowPersistence] Cancelled run", { runId });
    }

    return run;
  }

  // ============================================================================
  // Step Management
  // ============================================================================

  /**
   * Record step start
   */
  async startStep(runId: string, stepId: string): Promise<boolean> {
    const result: StepRunResult = {
      stepId,
      status: "running",
      startedAt: new Date(),
    };

    return this.storage.updateStepResult(runId, stepId, result);
  }

  /**
   * Record step completion
   */
  async completeStep(
    runId: string,
    stepId: string,
    output?: JsonValue,
  ): Promise<boolean> {
    const run = await this.storage.getWorkflowRun(runId);
    if (!run) {
      return false;
    }

    const existingStep = run.stepResults?.[stepId];
    const result: StepRunResult = {
      stepId,
      status: "completed",
      startedAt: existingStep?.startedAt || new Date(),
      completedAt: new Date(),
      output,
    };

    return this.storage.updateStepResult(runId, stepId, result);
  }

  /**
   * Record step failure
   */
  async failStep(
    runId: string,
    stepId: string,
    error: StorageWorkflowError,
  ): Promise<boolean> {
    const run = await this.storage.getWorkflowRun(runId);
    if (!run) {
      return false;
    }

    const existingStep = run.stepResults?.[stepId];
    const result: StepRunResult = {
      stepId,
      status: "failed",
      startedAt: existingStep?.startedAt || new Date(),
      completedAt: new Date(),
      error: error.message,
    };

    return this.storage.updateStepResult(runId, stepId, result);
  }

  /**
   * Skip a step
   */
  async skipStep(
    runId: string,
    stepId: string,
    reason?: string,
  ): Promise<boolean> {
    const result: StepRunResult = {
      stepId,
      status: "skipped",
      completedAt: new Date(),
      output: reason ? { reason } : undefined,
    };

    return this.storage.updateStepResult(runId, stepId, result);
  }

  /**
   * Get step result
   */
  async getStepResult(
    runId: string,
    stepId: string,
  ): Promise<StepRunResult | null> {
    const run = await this.storage.getWorkflowRun(runId);
    if (!run) {
      return null;
    }

    return run.stepResults?.[stepId] || null;
  }

  /**
   * Get all step results for a run
   */
  async getAllStepResults(
    runId: string,
  ): Promise<Record<string, StepRunResult> | null> {
    const run = await this.storage.getWorkflowRun(runId);
    if (!run) {
      return null;
    }

    return run.stepResults || {};
  }

  // ============================================================================
  // Suspension and Resumption
  // ============================================================================

  /**
   * Suspend a workflow run
   */
  async suspendRun(
    runId: string,
    suspensionData: SuspensionData,
  ): Promise<StorageWorkflowRun | null> {
    const existing = await this.storage.getWorkflowRun(runId);
    if (!existing) {
      return null;
    }

    const runInput: SaveWorkflowRunInput = {
      ...existing,
      status: "suspended",
      suspensionData,
    };

    const run = await this.storage.saveWorkflowRun(runInput);

    logger.debug("[WorkflowPersistence] Suspended run", {
      runId,
      stepId: suspensionData.stepId,
      reason: suspensionData.reason,
    });

    return run;
  }

  /**
   * Resume a suspended workflow run
   */
  async resumeRun(
    runId: string,
    resumePayload?: JsonValue,
  ): Promise<StorageWorkflowRun | null> {
    const existing = await this.storage.getWorkflowRun(runId);
    if (!existing || existing.status !== "suspended") {
      return null;
    }

    // Update suspension data with resume payload
    const suspensionData = existing.suspensionData
      ? {
          ...existing.suspensionData,
          resumePayload,
          resumedAt: new Date().toISOString(),
        }
      : undefined;

    const runInput: SaveWorkflowRunInput = {
      ...existing,
      status: "running",
      suspensionData,
    };

    const run = await this.storage.saveWorkflowRun(runInput);

    logger.debug("[WorkflowPersistence] Resumed run", { runId });

    return run;
  }

  /**
   * Get suspended runs for a workflow
   */
  async getSuspendedRuns(workflowId?: string): Promise<StorageWorkflowRun[]> {
    const result = await this.storage.listWorkflowRuns({
      workflowId,
      status: "suspended",
    });
    return result.data;
  }

  // ============================================================================
  // Querying
  // ============================================================================

  /**
   * List workflow runs with filters
   */
  async listRuns(
    options?: WorkflowRunQueryOptions,
  ): Promise<PaginatedResult<StorageWorkflowRun>> {
    return this.storage.listWorkflowRuns(options);
  }

  /**
   * Get runs for a specific workflow
   */
  async getRunsByWorkflow(
    workflowId: string,
    status?: WorkflowRunStatus,
  ): Promise<StorageWorkflowRun[]> {
    const result = await this.storage.listWorkflowRuns({
      workflowId,
      status,
    });
    return result.data;
  }

  /**
   * Get runs for a resource
   */
  async getRunsByResource(resourceId: string): Promise<StorageWorkflowRun[]> {
    const result = await this.storage.listWorkflowRuns({ resourceId });
    return result.data;
  }

  /**
   * Get runs for a thread
   */
  async getRunsByThread(threadId: string): Promise<StorageWorkflowRun[]> {
    const result = await this.storage.listWorkflowRuns({ threadId });
    return result.data;
  }

  /**
   * Get the latest run for a workflow
   */
  async getLatestRun(workflowId: string): Promise<StorageWorkflowRun | null> {
    const result = await this.storage.listWorkflowRuns({
      workflowId,
      limit: 1,
    });
    return result.data[0] || null;
  }

  /**
   * Get active (running/pending) runs
   */
  async getActiveRuns(workflowId?: string): Promise<StorageWorkflowRun[]> {
    const [running, pending] = await Promise.all([
      this.storage.listWorkflowRuns({ workflowId, status: "running" }),
      this.storage.listWorkflowRuns({ workflowId, status: "pending" }),
    ]);

    return [...running.data, ...pending.data];
  }

  // ============================================================================
  // Analytics
  // ============================================================================

  /**
   * Get workflow analytics
   */
  async getStorageWorkflowAnalytics(
    workflowId: string,
  ): Promise<StorageWorkflowAnalytics> {
    const allRuns = await this.storage.listWorkflowRuns({ workflowId });

    const completed = allRuns.data.filter((r) => r.status === "completed");
    const failed = allRuns.data.filter((r) => r.status === "failed");
    const pending = allRuns.data.filter((r) => r.status === "pending");
    const running = allRuns.data.filter((r) => r.status === "running");

    // Calculate average duration for completed runs
    let averageDurationMs: number | undefined;
    if (completed.length > 0) {
      const durations = completed.map((r) => {
        const start = r.createdAt.getTime();
        const end = r.updatedAt.getTime();
        return end - start;
      });
      averageDurationMs =
        durations.reduce((a, b) => a + b, 0) / durations.length;
    }

    // Get last run time
    const lastRunAt =
      allRuns.data.length > 0 ? allRuns.data[0].createdAt : undefined;

    return {
      workflowId,
      totalRuns: allRuns.total ?? 0,
      completedRuns: completed.length,
      failedRuns: failed.length,
      pendingRuns: pending.length,
      runningRuns: running.length,
      averageDurationMs,
      lastRunAt,
    };
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Cleanup old completed runs
   */
  async cleanupOldRuns(): Promise<number> {
    if (!this.options.autoCleanup) {
      return 0;
    }

    const threshold = new Date(Date.now() - this.options.cleanupThresholdMs);
    const result = await this.storage.listWorkflowRuns({ status: "completed" });

    let deleted = 0;
    for (const run of result.data) {
      if (run.updatedAt < threshold) {
        // We can't directly delete runs, but we could mark them or use custom records
        // For now, just log - actual deletion would require extending the storage interface
        deleted++;
      }
    }

    if (deleted > 0) {
      logger.info("[WorkflowPersistence] Identified old runs for cleanup", {
        count: deleted,
      });
    }

    return deleted;
  }

  /**
   * Cleanup stale running runs (possibly crashed)
   */
  async cleanupStaleRuns(
    staleThresholdMs: number,
  ): Promise<StorageWorkflowRun[]> {
    const threshold = new Date(Date.now() - staleThresholdMs);
    const result = await this.storage.listWorkflowRuns({ status: "running" });

    const staleRuns: StorageWorkflowRun[] = [];
    for (const run of result.data) {
      if (run.updatedAt < threshold) {
        const updated = await this.failRun(run.id, {
          code: "STALE_RUN",
          message: "Run marked as failed due to inactivity",
        });
        if (updated) {
          staleRuns.push(updated);
        }
      }
    }

    if (staleRuns.length > 0) {
      logger.warn("[WorkflowPersistence] Cleaned up stale runs", {
        count: staleRuns.length,
      });
    }

    return staleRuns;
  }
}

/**
 * Create a workflow persistence manager for a storage provider
 */
export function createWorkflowPersistenceManager(
  storage: StorageProvider,
  options?: WorkflowPersistenceManagerOptions,
): WorkflowPersistenceManager {
  return new WorkflowPersistenceManager(storage, options);
}
