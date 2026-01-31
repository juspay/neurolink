/**
 * Suspend Resume Manager
 *
 * Manages workflow suspension and resumption with HITL (Human-in-the-Loop) integration.
 * Provides coordination between workflow execution and human approval workflows.
 *
 * @module workflow/SuspendResumeManager
 */

import { randomUUID } from "crypto";
import { EventEmitter } from "events";
import type { JsonObject } from "../types/common.js";
import { logger } from "../utils/logger.js";
import type { CheckpointManager } from "./CheckpointManager.js";
import { SuspensionError, WorkflowErrorCodes } from "./errors/WorkflowError.js";
import type {
  SuspensionRequest,
  SuspensionType,
  WorkflowCheckpoint,
  WorkflowExecutionResult,
} from "./types/workflowTypes.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Pending suspension request
 */
export interface PendingSuspension {
  /** Suspension ID */
  id: string;
  /** Checkpoint ID */
  checkpointId: string;
  /** Workflow ID */
  workflowId: string;
  /** Run ID */
  runId: string;
  /** Suspension request details */
  request: SuspensionRequest;
  /** Timestamp when suspended */
  suspendedAt: number;
  /** Callback to resolve when resumed */
  resolve: (resumeData?: Record<string, unknown>) => void;
  /** Callback to reject on error/timeout */
  reject: (error: Error) => void;
  /** Timeout handle */
  timeoutHandle?: NodeJS.Timeout;
}

/**
 * Resume request
 */
export interface ResumeRequest {
  /** Suspension ID */
  suspensionId: string;
  /** Data to resume with */
  resumeData?: Record<string, unknown>;
  /** Whether the suspension was approved (for HITL) */
  approved?: boolean;
  /** Rejection reason if not approved */
  rejectionReason?: string;
}

/**
 * Suspend resume events
 */
export interface SuspendResumeEvents {
  "suspension:created": [PendingSuspension];
  "suspension:resumed": [{ suspensionId: string; resumeData?: Record<string, unknown> }];
  "suspension:rejected": [{ suspensionId: string; reason: string }];
  "suspension:expired": [{ suspensionId: string }];
  "suspension:timeout": [{ suspensionId: string }];
}

/**
 * Manager configuration
 */
export interface SuspendResumeConfig {
  /** Checkpoint manager for persistence */
  checkpointManager: CheckpointManager;
  /** Default timeout for suspensions (ms) */
  defaultTimeout?: number;
  /** Whether to auto-reject on timeout */
  autoRejectOnTimeout?: boolean;
}

// =============================================================================
// Suspend Resume Manager
// =============================================================================

/**
 * SuspendResumeManager - Coordinates workflow suspension and resumption
 *
 * Features:
 * - HITL (Human-in-the-Loop) approval workflows
 * - External system callbacks
 * - Timer-based suspensions
 * - Manual suspension control
 * - Timeout handling with configurable behavior
 *
 * @example
 * ```typescript
 * const manager = new SuspendResumeManager({
 *   checkpointManager: new CheckpointManager({ type: 'memory' }),
 *   defaultTimeout: 300000, // 5 minutes
 * });
 *
 * // Create a suspension
 * const suspension = await manager.createSuspension({
 *   workflowId: 'my-workflow',
 *   runId: 'run-123',
 *   checkpoint,
 *   request: {
 *     reason: 'Requires human approval',
 *     type: 'hitl',
 *   },
 * });
 *
 * // Wait for resumption
 * const resumeData = await manager.waitForResumption(suspension.id);
 *
 * // Or resume manually
 * await manager.resume({
 *   suspensionId: suspension.id,
 *   approved: true,
 *   resumeData: { approved: true },
 * });
 * ```
 */
export class SuspendResumeManager extends EventEmitter {
  private config: SuspendResumeConfig;
  private pendingSuspensions: Map<string, PendingSuspension> = new Map();

  constructor(config: SuspendResumeConfig) {
    super();
    this.config = {
      ...config,
      defaultTimeout: config.defaultTimeout ?? 300000, // 5 minutes
      autoRejectOnTimeout: config.autoRejectOnTimeout ?? true,
    };
  }

  /**
   * Create a suspension
   */
  async createSuspension(params: {
    workflowId: string;
    runId: string;
    checkpoint: WorkflowCheckpoint;
    request: SuspensionRequest;
    timeout?: number;
  }): Promise<PendingSuspension> {
    const suspensionId = randomUUID();
    const now = Date.now();

    // Save checkpoint
    await this.config.checkpointManager.save(params.checkpoint);

    // Calculate expiration
    const timeout =
      (params.timeout ?? params.request.expiresAt) ? params.request.expiresAt! - now : this.config.defaultTimeout!;

    // Create pending suspension
    let resolve: (data?: Record<string, unknown>) => void = () => {};
    let reject: (error: Error) => void = () => {};

    const promise = new Promise<Record<string, unknown> | undefined>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    const suspension: PendingSuspension = {
      id: suspensionId,
      checkpointId: params.checkpoint.id,
      workflowId: params.workflowId,
      runId: params.runId,
      request: {
        ...params.request,
        expiresAt: params.request.expiresAt ?? now + timeout,
        callbackId: params.request.callbackId ?? suspensionId,
      },
      suspendedAt: now,
      resolve,
      reject,
    };

    // Set up timeout
    if (timeout > 0) {
      suspension.timeoutHandle = setTimeout(() => {
        this.handleTimeout(suspensionId);
      }, timeout);
    }

    // Store suspension
    this.pendingSuspensions.set(suspensionId, suspension);

    // Emit event
    this.emit("suspension:created", suspension);

    logger.info(`Created suspension: ${suspensionId}`, {
      workflowId: params.workflowId,
      runId: params.runId,
      type: params.request.type,
      timeout,
    });

    return suspension;
  }

  /**
   * Wait for a suspension to be resumed
   */
  async waitForResumption(suspensionId: string): Promise<Record<string, unknown> | undefined> {
    const suspension = this.pendingSuspensions.get(suspensionId);
    if (!suspension) {
      throw new SuspensionError(`Suspension not found: ${suspensionId}`, WorkflowErrorCodes.SUSPENSION_FAILED, {
        details: { suspensionId },
      });
    }

    return new Promise<Record<string, unknown> | undefined>((resolve, reject) => {
      suspension.resolve = resolve;
      suspension.reject = reject;
    });
  }

  /**
   * Resume a suspended workflow
   */
  async resume(request: ResumeRequest): Promise<void> {
    const suspension = this.pendingSuspensions.get(request.suspensionId);
    if (!suspension) {
      throw new SuspensionError(`Suspension not found: ${request.suspensionId}`, WorkflowErrorCodes.RESUME_FAILED, {
        details: { suspensionId: request.suspensionId },
      });
    }

    // Clear timeout
    if (suspension.timeoutHandle) {
      clearTimeout(suspension.timeoutHandle);
    }

    // Check if approved (for HITL type)
    if (suspension.request.type === "hitl" && request.approved === false) {
      const error = new SuspensionError(
        request.rejectionReason ?? "Suspension rejected by human",
        WorkflowErrorCodes.RESUME_FAILED,
        {
          suspensionType: "hitl",
          details: { reason: request.rejectionReason },
        },
      );

      suspension.reject(error);
      this.pendingSuspensions.delete(request.suspensionId);

      this.emit("suspension:rejected", {
        suspensionId: request.suspensionId,
        reason: request.rejectionReason ?? "Rejected",
      });

      logger.info(`Suspension rejected: ${request.suspensionId}`, {
        reason: request.rejectionReason,
      });

      return;
    }

    // Resume with data
    suspension.resolve(request.resumeData);
    this.pendingSuspensions.delete(request.suspensionId);

    this.emit("suspension:resumed", {
      suspensionId: request.suspensionId,
      resumeData: request.resumeData,
    });

    logger.info(`Suspension resumed: ${request.suspensionId}`, {
      hasResumeData: !!request.resumeData,
    });
  }

  /**
   * Reject a suspension
   */
  async reject(suspensionId: string, reason: string): Promise<void> {
    return this.resume({
      suspensionId,
      approved: false,
      rejectionReason: reason,
    });
  }

  /**
   * Get a pending suspension
   */
  getSuspension(suspensionId: string): PendingSuspension | undefined {
    return this.pendingSuspensions.get(suspensionId);
  }

  /**
   * Get all pending suspensions for a workflow
   */
  getSuspensionsForWorkflow(workflowId: string): PendingSuspension[] {
    return Array.from(this.pendingSuspensions.values()).filter((s) => s.workflowId === workflowId);
  }

  /**
   * Get all pending suspensions for a run
   */
  getSuspensionsForRun(runId: string): PendingSuspension[] {
    return Array.from(this.pendingSuspensions.values()).filter((s) => s.runId === runId);
  }

  /**
   * Get all pending suspensions
   */
  getAllPendingSuspensions(): PendingSuspension[] {
    return Array.from(this.pendingSuspensions.values());
  }

  /**
   * Get pending suspension count
   */
  getPendingCount(): number {
    return this.pendingSuspensions.size;
  }

  /**
   * Cancel a suspension
   */
  async cancel(suspensionId: string): Promise<boolean> {
    const suspension = this.pendingSuspensions.get(suspensionId);
    if (!suspension) {
      return false;
    }

    // Clear timeout
    if (suspension.timeoutHandle) {
      clearTimeout(suspension.timeoutHandle);
    }

    // Reject with cancellation error
    suspension.reject(
      new SuspensionError("Suspension cancelled", WorkflowErrorCodes.SUSPENSION_FAILED, { details: { suspensionId } }),
    );

    this.pendingSuspensions.delete(suspensionId);
    logger.info(`Suspension cancelled: ${suspensionId}`);

    return true;
  }

  /**
   * Cancel all suspensions for a run
   */
  async cancelAll(runId: string): Promise<number> {
    const suspensions = this.getSuspensionsForRun(runId);
    let count = 0;

    for (const suspension of suspensions) {
      if (await this.cancel(suspension.id)) {
        count++;
      }
    }

    return count;
  }

  /**
   * Handle suspension timeout
   */
  private handleTimeout(suspensionId: string): void {
    const suspension = this.pendingSuspensions.get(suspensionId);
    if (!suspension) {
      return;
    }

    this.emit("suspension:timeout", { suspensionId });

    if (this.config.autoRejectOnTimeout) {
      const error = new SuspensionError("Suspension timed out", WorkflowErrorCodes.SUSPENSION_EXPIRED, {
        suspensionType: suspension.request.type,
        details: { suspensionId },
      });

      suspension.reject(error);
      this.pendingSuspensions.delete(suspensionId);

      this.emit("suspension:expired", { suspensionId });

      logger.warn(`Suspension timed out: ${suspensionId}`, {
        workflowId: suspension.workflowId,
        runId: suspension.runId,
      });
    }
  }

  /**
   * Clean up expired suspensions
   */
  async cleanup(): Promise<number> {
    const now = Date.now();
    let count = 0;

    for (const [id, suspension] of this.pendingSuspensions) {
      if (suspension.request.expiresAt && now > suspension.request.expiresAt) {
        this.handleTimeout(id);
        count++;
      }
    }

    return count;
  }

  /**
   * Create HITL (Human-in-the-Loop) suspension
   */
  async createHITLSuspension(params: {
    workflowId: string;
    runId: string;
    checkpoint: WorkflowCheckpoint;
    reason: string;
    timeout?: number;
    metadata?: JsonObject;
  }): Promise<PendingSuspension> {
    return this.createSuspension({
      ...params,
      request: {
        reason: params.reason,
        type: "hitl",
        resumeData: params.metadata,
      },
    });
  }

  /**
   * Create external callback suspension
   */
  async createExternalSuspension(params: {
    workflowId: string;
    runId: string;
    checkpoint: WorkflowCheckpoint;
    reason: string;
    callbackId: string;
    timeout?: number;
  }): Promise<PendingSuspension> {
    return this.createSuspension({
      ...params,
      request: {
        reason: params.reason,
        type: "external",
        callbackId: params.callbackId,
      },
    });
  }

  /**
   * Create timer suspension (delay)
   */
  async createTimerSuspension(params: {
    workflowId: string;
    runId: string;
    checkpoint: WorkflowCheckpoint;
    delayMs: number;
  }): Promise<PendingSuspension> {
    const suspension = await this.createSuspension({
      ...params,
      timeout: params.delayMs,
      request: {
        reason: `Timer delay: ${params.delayMs}ms`,
        type: "timer",
        expiresAt: Date.now() + params.delayMs,
      },
    });

    // Auto-resume after delay
    setTimeout(() => {
      if (this.pendingSuspensions.has(suspension.id)) {
        this.resume({
          suspensionId: suspension.id,
          resumeData: { timerCompleted: true },
        });
      }
    }, params.delayMs);

    return suspension;
  }

  /**
   * Clear all suspensions (for testing)
   */
  clear(): void {
    for (const suspension of this.pendingSuspensions.values()) {
      if (suspension.timeoutHandle) {
        clearTimeout(suspension.timeoutHandle);
      }
    }
    this.pendingSuspensions.clear();
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a suspend resume manager
 */
export function createSuspendResumeManager(config: SuspendResumeConfig): SuspendResumeManager {
  return new SuspendResumeManager(config);
}

// =============================================================================
// Suspension Type Handler Type
// =============================================================================

/**
 * Suspension timeout handler type
 */
export type SuspensionTimeoutHandler = (suspensionId: string) => void | Promise<void>;

// =============================================================================
// Standalone Factory Functions for Suspension Types
// =============================================================================

/**
 * Create a HITL (Human-in-the-Loop) suspension request
 *
 * @param reason - Reason for suspension
 * @param metadata - Additional metadata
 * @param timeoutMs - Timeout in milliseconds
 * @returns SuspensionRequest for HITL
 */
export function createHITLSuspension(reason: string, metadata?: JsonObject, timeoutMs?: number): SuspensionRequest {
  return {
    reason,
    type: "hitl",
    resumeData: metadata,
    expiresAt: timeoutMs ? Date.now() + timeoutMs : undefined,
  };
}

/**
 * Create an external callback suspension request
 *
 * @param reason - Reason for suspension
 * @param callbackId - Callback ID for external systems
 * @param timeoutMs - Timeout in milliseconds
 * @returns SuspensionRequest for external callback
 */
export function createExternalSuspension(reason: string, callbackId: string, timeoutMs?: number): SuspensionRequest {
  return {
    reason,
    type: "external",
    callbackId,
    expiresAt: timeoutMs ? Date.now() + timeoutMs : undefined,
  };
}

/**
 * Create a timer suspension request
 *
 * @param delayMs - Delay in milliseconds
 * @returns SuspensionRequest for timer
 */
export function createTimerSuspension(delayMs: number): SuspensionRequest {
  return {
    reason: `Timer delay: ${delayMs}ms`,
    type: "timer",
    expiresAt: Date.now() + delayMs,
  };
}
