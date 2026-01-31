/**
 * Workflow Error Classes
 *
 * Custom error types for the NeuroLink Workflow System.
 * Follows the NeuroLinkFeatureError pattern from infrastructure.
 *
 * @module workflow/errors
 */

import {
  NeuroLinkFeatureError,
  createErrorFactory,
} from "../../core/infrastructure/index.js";
import type { StepError, WorkflowError as WorkflowErrorType } from "../types/workflowTypes.js";

// =============================================================================
// Error Codes
// =============================================================================

/**
 * Workflow error codes
 */
export const WorkflowErrorCodes = {
  // Validation errors
  VALIDATION_FAILED: "WORKFLOW_VALIDATION_FAILED",
  INPUT_VALIDATION_FAILED: "WORKFLOW_INPUT_VALIDATION_FAILED",
  OUTPUT_VALIDATION_FAILED: "WORKFLOW_OUTPUT_VALIDATION_FAILED",
  SCHEMA_INVALID: "WORKFLOW_SCHEMA_INVALID",

  // Execution errors
  EXECUTION_FAILED: "WORKFLOW_EXECUTION_FAILED",
  STEP_EXECUTION_FAILED: "STEP_EXECUTION_FAILED",
  STEP_TIMEOUT: "STEP_TIMEOUT",
  WORKFLOW_TIMEOUT: "WORKFLOW_TIMEOUT",

  // State errors
  STATE_ERROR: "WORKFLOW_STATE_ERROR",
  STATE_NOT_FOUND: "WORKFLOW_STATE_NOT_FOUND",
  STATE_CORRUPTED: "WORKFLOW_STATE_CORRUPTED",

  // Checkpoint errors
  CHECKPOINT_FAILED: "CHECKPOINT_FAILED",
  CHECKPOINT_NOT_FOUND: "CHECKPOINT_NOT_FOUND",
  CHECKPOINT_CORRUPTED: "CHECKPOINT_CORRUPTED",
  CHECKPOINT_EXPIRED: "CHECKPOINT_EXPIRED",

  // Suspension errors
  SUSPENSION_FAILED: "SUSPENSION_FAILED",
  RESUME_FAILED: "RESUME_FAILED",
  SUSPENSION_EXPIRED: "SUSPENSION_EXPIRED",

  // Graph errors
  GRAPH_INVALID: "WORKFLOW_GRAPH_INVALID",
  CYCLE_DETECTED: "WORKFLOW_CYCLE_DETECTED",
  STEP_NOT_FOUND: "STEP_NOT_FOUND",
  EDGE_INVALID: "EDGE_INVALID",

  // Builder errors
  BUILDER_ERROR: "WORKFLOW_BUILDER_ERROR",
  DUPLICATE_STEP: "DUPLICATE_STEP",
  MISSING_ENTRY_POINT: "MISSING_ENTRY_POINT",

  // Registry errors
  WORKFLOW_NOT_FOUND: "WORKFLOW_NOT_FOUND",
  WORKFLOW_ALREADY_EXISTS: "WORKFLOW_ALREADY_EXISTS",

  // Runtime errors
  CANCELLED: "WORKFLOW_CANCELLED",
  MAX_ITERATIONS_EXCEEDED: "MAX_ITERATIONS_EXCEEDED",
  PARALLEL_EXECUTION_FAILED: "PARALLEL_EXECUTION_FAILED",
  BRANCH_EVALUATION_FAILED: "BRANCH_EVALUATION_FAILED",
} as const;

export type WorkflowErrorCode =
  (typeof WorkflowErrorCodes)[keyof typeof WorkflowErrorCodes];

// =============================================================================
// Error Factory
// =============================================================================

/**
 * Workflow error factory for creating typed errors
 */
export const workflowErrorFactory = createErrorFactory(
  "Workflow",
  WorkflowErrorCodes,
);

// =============================================================================
// Custom Error Classes
// =============================================================================

/**
 * Base workflow error class
 */
export class WorkflowExecutionError extends NeuroLinkFeatureError {
  readonly stepId?: string;
  readonly runId?: string;
  readonly workflowId?: string;

  constructor(
    message: string,
    code: WorkflowErrorCode,
    options?: {
      retryable?: boolean;
      details?: Record<string, unknown>;
      cause?: Error;
      stepId?: string;
      runId?: string;
      workflowId?: string;
    },
  ) {
    super(message, code, "Workflow", {
      retryable: options?.retryable,
      details: options?.details,
      cause: options?.cause,
    });
    this.stepId = options?.stepId;
    this.runId = options?.runId;
    this.workflowId = options?.workflowId;
  }
}

/**
 * Step execution error
 */
export class StepExecutionError extends WorkflowExecutionError {
  readonly stepError?: StepError;
  readonly attempts: number;

  constructor(
    stepId: string,
    message: string,
    options?: {
      stepError?: StepError;
      attempts?: number;
      retryable?: boolean;
      details?: Record<string, unknown>;
      cause?: Error;
      runId?: string;
      workflowId?: string;
    },
  ) {
    super(message, WorkflowErrorCodes.STEP_EXECUTION_FAILED, {
      retryable: options?.retryable ?? options?.stepError?.retryable ?? false,
      details: {
        ...options?.details,
        stepError: options?.stepError,
      },
      cause: options?.cause ?? options?.stepError?.cause,
      stepId,
      runId: options?.runId,
      workflowId: options?.workflowId,
    });
    this.stepError = options?.stepError;
    this.attempts = options?.attempts ?? 1;
  }
}

/**
 * Timeout error
 */
export class WorkflowTimeoutError extends WorkflowExecutionError {
  readonly timeoutMs: number;
  readonly actualDurationMs?: number;

  constructor(
    message: string,
    timeoutMs: number,
    options?: {
      stepId?: string;
      actualDurationMs?: number;
      details?: Record<string, unknown>;
      runId?: string;
      workflowId?: string;
    },
  ) {
    const code = options?.stepId
      ? WorkflowErrorCodes.STEP_TIMEOUT
      : WorkflowErrorCodes.WORKFLOW_TIMEOUT;

    super(message, code, {
      retryable: true,
      details: {
        ...options?.details,
        timeoutMs,
        actualDurationMs: options?.actualDurationMs,
      },
      stepId: options?.stepId,
      runId: options?.runId,
      workflowId: options?.workflowId,
    });
    this.timeoutMs = timeoutMs;
    this.actualDurationMs = options?.actualDurationMs;
  }
}

/**
 * Validation error
 */
export class WorkflowValidationError extends WorkflowExecutionError {
  readonly validationErrors: string[];

  constructor(
    message: string,
    validationErrors: string[],
    code:
      | typeof WorkflowErrorCodes.VALIDATION_FAILED
      | typeof WorkflowErrorCodes.INPUT_VALIDATION_FAILED
      | typeof WorkflowErrorCodes.OUTPUT_VALIDATION_FAILED
      | typeof WorkflowErrorCodes.SCHEMA_INVALID = WorkflowErrorCodes.VALIDATION_FAILED,
    options?: {
      stepId?: string;
      details?: Record<string, unknown>;
      runId?: string;
      workflowId?: string;
    },
  ) {
    super(message, code, {
      retryable: false,
      details: {
        ...options?.details,
        validationErrors,
      },
      stepId: options?.stepId,
      runId: options?.runId,
      workflowId: options?.workflowId,
    });
    this.validationErrors = validationErrors;
  }
}

/**
 * Checkpoint error
 */
export class CheckpointError extends WorkflowExecutionError {
  readonly checkpointId?: string;

  constructor(
    message: string,
    code:
      | typeof WorkflowErrorCodes.CHECKPOINT_FAILED
      | typeof WorkflowErrorCodes.CHECKPOINT_NOT_FOUND
      | typeof WorkflowErrorCodes.CHECKPOINT_CORRUPTED
      | typeof WorkflowErrorCodes.CHECKPOINT_EXPIRED = WorkflowErrorCodes.CHECKPOINT_FAILED,
    options?: {
      checkpointId?: string;
      retryable?: boolean;
      details?: Record<string, unknown>;
      cause?: Error;
      runId?: string;
      workflowId?: string;
    },
  ) {
    super(message, code, {
      retryable: options?.retryable ?? false,
      details: {
        ...options?.details,
        checkpointId: options?.checkpointId,
      },
      cause: options?.cause,
      runId: options?.runId,
      workflowId: options?.workflowId,
    });
    this.checkpointId = options?.checkpointId;
  }
}

/**
 * Suspension error
 */
export class SuspensionError extends WorkflowExecutionError {
  readonly suspensionType?: string;

  constructor(
    message: string,
    code:
      | typeof WorkflowErrorCodes.SUSPENSION_FAILED
      | typeof WorkflowErrorCodes.RESUME_FAILED
      | typeof WorkflowErrorCodes.SUSPENSION_EXPIRED = WorkflowErrorCodes.SUSPENSION_FAILED,
    options?: {
      suspensionType?: string;
      retryable?: boolean;
      details?: Record<string, unknown>;
      cause?: Error;
      stepId?: string;
      runId?: string;
      workflowId?: string;
    },
  ) {
    super(message, code, {
      retryable: options?.retryable ?? false,
      details: {
        ...options?.details,
        suspensionType: options?.suspensionType,
      },
      cause: options?.cause,
      stepId: options?.stepId,
      runId: options?.runId,
      workflowId: options?.workflowId,
    });
    this.suspensionType = options?.suspensionType;
  }
}

/**
 * Graph error
 */
export class GraphError extends WorkflowExecutionError {
  constructor(
    message: string,
    code:
      | typeof WorkflowErrorCodes.GRAPH_INVALID
      | typeof WorkflowErrorCodes.CYCLE_DETECTED
      | typeof WorkflowErrorCodes.STEP_NOT_FOUND
      | typeof WorkflowErrorCodes.EDGE_INVALID = WorkflowErrorCodes.GRAPH_INVALID,
    options?: {
      details?: Record<string, unknown>;
      workflowId?: string;
    },
  ) {
    super(message, code, {
      retryable: false,
      details: options?.details,
      workflowId: options?.workflowId,
    });
  }
}

/**
 * Builder error
 */
export class BuilderError extends WorkflowExecutionError {
  constructor(
    message: string,
    code:
      | typeof WorkflowErrorCodes.BUILDER_ERROR
      | typeof WorkflowErrorCodes.DUPLICATE_STEP
      | typeof WorkflowErrorCodes.MISSING_ENTRY_POINT = WorkflowErrorCodes.BUILDER_ERROR,
    options?: {
      details?: Record<string, unknown>;
      workflowId?: string;
    },
  ) {
    super(message, code, {
      retryable: false,
      details: options?.details,
      workflowId: options?.workflowId,
    });
  }
}

/**
 * Registry error
 */
export class RegistryError extends WorkflowExecutionError {
  constructor(
    message: string,
    code:
      | typeof WorkflowErrorCodes.WORKFLOW_NOT_FOUND
      | typeof WorkflowErrorCodes.WORKFLOW_ALREADY_EXISTS = WorkflowErrorCodes.WORKFLOW_NOT_FOUND,
    options?: {
      details?: Record<string, unknown>;
      workflowId?: string;
    },
  ) {
    super(message, code, {
      retryable: false,
      details: options?.details,
      workflowId: options?.workflowId,
    });
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert step error to workflow error format
 */
export function toWorkflowError(
  stepError: StepError,
  stepId?: string,
): WorkflowErrorType {
  return {
    code: stepError.code,
    message: stepError.message,
    stepId,
    cause: stepError.cause,
    details: stepError.details,
  };
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof WorkflowExecutionError) {
    return error.retryable;
  }
  if (error instanceof Error) {
    const code = (error as Error & { code?: string }).code;
    return code !== undefined && !code.includes("VALIDATION");
  }
  return false;
}

/**
 * Create step error from unknown error
 */
export function createStepError(error: unknown): StepError {
  if (error instanceof Error) {
    return {
      code: (error as Error & { code?: string }).code ?? "EXECUTION_ERROR",
      message: error.message,
      retryable: isRetryableError(error),
      cause: error,
    };
  }

  return {
    code: "EXECUTION_ERROR",
    message: String(error),
    retryable: true,
  };
}
