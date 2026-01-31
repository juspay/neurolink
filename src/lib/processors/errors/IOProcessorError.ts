/**
 * @file Typed error hierarchy for the I/O Processor System.
 * Uses NeuroLinkFeatureError and createErrorFactory from core infrastructure.
 */

import {
  NeuroLinkFeatureError,
  createErrorFactory,
} from "../../core/infrastructure/index.js";

/**
 * Error codes for the IOProcessor feature.
 * These codes help identify specific error scenarios for proper handling.
 */
export const IOProcessorErrorCodes = {
  /** The processor execution failed */
  PROCESSOR_FAILED: "PROCESSOR_FAILED",
  /** The pipeline execution failed */
  PIPELINE_ERROR: "PIPELINE_ERROR",
  /** Processor registration or lookup failed */
  REGISTRY_ERROR: "REGISTRY_ERROR",
  /** Tripwire evaluation failed */
  TRIPWIRE_ERROR: "TRIPWIRE_ERROR",
  /** Processor configuration validation failed */
  VALIDATION_ERROR: "VALIDATION_ERROR",
  /** Preset not found in registry */
  PRESET_NOT_FOUND: "PRESET_NOT_FOUND",
  /** Processor not found in registry */
  PROCESSOR_NOT_FOUND: "PROCESSOR_NOT_FOUND",
  /** Duplicate processor registration */
  DUPLICATE_PROCESSOR: "DUPLICATE_PROCESSOR",
  /** Processor timeout during execution */
  TIMEOUT_ERROR: "TIMEOUT_ERROR",
  /** Invalid processor configuration */
  CONFIGURATION_ERROR: "CONFIGURATION_ERROR",
  /** Processor abort action triggered */
  ABORT_ERROR: "ABORT_ERROR",
  /** Batch processing failed */
  BATCH_ERROR: "BATCH_ERROR",
} as const;

/**
 * Type for IOProcessor error codes
 */
export type IOProcessorErrorCode =
  (typeof IOProcessorErrorCodes)[keyof typeof IOProcessorErrorCodes];

/**
 * Factory for creating typed IOProcessor errors.
 * Uses the createErrorFactory pattern from core infrastructure.
 */
export const ioProcessorErrors = createErrorFactory(
  "IOProcessor",
  IOProcessorErrorCodes,
);

/**
 * Extended context for processor error details.
 * Provides rich debugging information when errors occur.
 */
export interface IOProcessorErrorContext {
  /** The processor ID that encountered the error */
  processorId?: string;
  /** The processor type (input or output) */
  processorType?: "input" | "output";
  /** The current step in the pipeline */
  pipelineStep?: number;
  /** Total steps in the pipeline */
  totalSteps?: number;
  /** The input data that caused the error (truncated) */
  inputData?: string;
  /** The processor configuration */
  config?: Record<string, unknown>;
  /** Execution time before failure in milliseconds */
  executionTimeMs?: number;
  /** Previous processor results in the pipeline */
  previousResults?: Array<{
    processorId: string;
    action: string;
    executionTimeMs: number;
  }>;
  /** Any additional context */
  additionalContext?: Record<string, unknown>;
}

/**
 * Checks if an error is retryable based on its code.
 * Transient errors (timeout, some processor errors) are retryable.
 *
 * @param error - The error to check
 * @returns true if the error is retryable
 */
export function isRetryableIOProcessorError(
  error: NeuroLinkFeatureError,
): boolean {
  const retryableCodes: IOProcessorErrorCode[] = [
    IOProcessorErrorCodes.TIMEOUT_ERROR,
  ];

  return (
    error.retryable ||
    retryableCodes.includes(error.code as IOProcessorErrorCode)
  );
}

/**
 * Checks if an error is a NeuroLinkFeatureError from the IOProcessor feature.
 *
 * @param error - The error to check
 * @returns true if the error is an IOProcessor error
 */
export function isIOProcessorError(
  error: unknown,
): error is NeuroLinkFeatureError {
  return (
    error instanceof NeuroLinkFeatureError && error.feature === "IOProcessor"
  );
}

/**
 * Helper function to create a processor execution failed error.
 *
 * @param processorId - The ID of the processor that failed
 * @param message - The error message
 * @param context - The processor context
 * @param cause - The underlying cause error
 * @returns A typed NeuroLinkFeatureError
 */
export function createProcessorFailedError(
  processorId: string,
  message: string,
  context?: IOProcessorErrorContext,
  cause?: Error,
): NeuroLinkFeatureError {
  return ioProcessorErrors.create("PROCESSOR_FAILED", message, {
    retryable: false,
    details: {
      processorId,
      processorContext: context,
    },
    cause,
  });
}

/**
 * Helper function to create a pipeline execution error.
 *
 * @param message - The error message
 * @param step - The step at which the pipeline failed
 * @param totalSteps - Total number of steps in the pipeline
 * @param cause - The underlying cause error
 * @returns A typed NeuroLinkFeatureError
 */
export function createPipelineError(
  message: string,
  step: number,
  totalSteps: number,
  cause?: Error,
): NeuroLinkFeatureError {
  return ioProcessorErrors.create("PIPELINE_ERROR", message, {
    retryable: false,
    details: {
      pipelineStep: step,
      totalSteps,
      errorMessage: cause?.message,
    },
    cause,
  });
}

/**
 * Helper function to create a registry error.
 *
 * @param message - The error message
 * @param processorId - The processor ID involved
 * @param operation - The operation that failed (register, lookup, etc.)
 * @returns A typed NeuroLinkFeatureError
 */
export function createRegistryError(
  message: string,
  processorId?: string,
  operation?: "register" | "lookup" | "unregister" | "list",
): NeuroLinkFeatureError {
  return ioProcessorErrors.create("REGISTRY_ERROR", message, {
    retryable: false,
    details: {
      processorId,
      operation,
    },
  });
}

/**
 * Helper function to create a tripwire evaluation error.
 *
 * @param tripwireId - The ID of the tripwire that failed
 * @param message - The error message
 * @param cause - The underlying cause error
 * @returns A typed NeuroLinkFeatureError
 */
export function createTripwireError(
  tripwireId: string,
  message: string,
  cause?: Error,
): NeuroLinkFeatureError {
  return ioProcessorErrors.create("TRIPWIRE_ERROR", message, {
    retryable: false,
    details: {
      tripwireId,
    },
    cause,
  });
}

/**
 * Helper function to create a validation error.
 *
 * @param processorId - The processor ID with invalid config
 * @param validationErrors - Array of validation error messages
 * @returns A typed NeuroLinkFeatureError
 */
export function createValidationError(
  processorId: string,
  validationErrors: string[],
): NeuroLinkFeatureError {
  return ioProcessorErrors.create(
    "VALIDATION_ERROR",
    `Processor "${processorId}" configuration validation failed`,
    {
      retryable: false,
      details: {
        processorId,
        validationErrors,
      },
    },
  );
}

/**
 * Helper function to create a preset not found error.
 *
 * @param presetName - The name of the preset that was not found
 * @param availablePresets - List of available presets
 * @returns A typed NeuroLinkFeatureError
 */
export function createPresetNotFoundError(
  presetName: string,
  availablePresets: string[] = [],
): NeuroLinkFeatureError {
  return ioProcessorErrors.create(
    "PRESET_NOT_FOUND",
    `Processor preset "${presetName}" not found in registry`,
    {
      retryable: false,
      details: {
        requestedPreset: presetName,
        availablePresets,
      },
    },
  );
}

/**
 * Helper function to create a processor not found error.
 *
 * @param processorId - The ID of the processor that was not found
 * @param processorType - The type of processor (input or output)
 * @returns A typed NeuroLinkFeatureError
 */
export function createProcessorNotFoundError(
  processorId: string,
  processorType: "input" | "output",
): NeuroLinkFeatureError {
  return ioProcessorErrors.create(
    "PROCESSOR_NOT_FOUND",
    `${processorType.charAt(0).toUpperCase() + processorType.slice(1)} processor "${processorId}" not found in registry`,
    {
      retryable: false,
      details: {
        processorId,
        processorType,
      },
    },
  );
}

/**
 * Helper function to create a duplicate processor error.
 *
 * @param processorId - The ID of the duplicate processor
 * @param processorType - The type of processor (input or output)
 * @returns A typed NeuroLinkFeatureError
 */
export function createDuplicateProcessorError(
  processorId: string,
  processorType: "input" | "output",
): NeuroLinkFeatureError {
  return ioProcessorErrors.create(
    "DUPLICATE_PROCESSOR",
    `${processorType.charAt(0).toUpperCase() + processorType.slice(1)} processor "${processorId}" is already registered. Use replace: true to override.`,
    {
      retryable: false,
      details: {
        processorId,
        processorType,
        suggestion:
          "Use { replace: true } option to replace the existing processor",
      },
    },
  );
}

/**
 * Helper function to create a timeout error.
 *
 * @param processorId - The ID of the processor that timed out
 * @param timeoutMs - The timeout value in milliseconds
 * @param executionTimeMs - The actual execution time before timeout
 * @returns A typed NeuroLinkFeatureError
 */
export function createTimeoutError(
  processorId: string,
  timeoutMs: number,
  executionTimeMs?: number,
): NeuroLinkFeatureError {
  return ioProcessorErrors.create(
    "TIMEOUT_ERROR",
    `Processor "${processorId}" execution timed out after ${timeoutMs}ms`,
    {
      retryable: true, // Timeouts can be retried
      details: {
        processorId,
        timeoutMs,
        executionTimeMs,
      },
    },
  );
}

/**
 * Helper function to create a configuration error.
 *
 * @param message - The error message
 * @param configIssue - Description of the configuration issue
 * @returns A typed NeuroLinkFeatureError
 */
export function createConfigurationError(
  message: string,
  configIssue: string,
): NeuroLinkFeatureError {
  return ioProcessorErrors.create("CONFIGURATION_ERROR", message, {
    retryable: false,
    details: {
      configIssue,
    },
  });
}

/**
 * Helper function to create an abort error.
 *
 * @param processorId - The ID of the processor that triggered abort
 * @param feedback - Feedback message for the abort
 * @returns A typed NeuroLinkFeatureError
 */
export function createAbortError(
  processorId: string,
  feedback: string,
): NeuroLinkFeatureError {
  return ioProcessorErrors.create(
    "ABORT_ERROR",
    `Pipeline aborted by processor "${processorId}"`,
    {
      retryable: false,
      details: {
        processorId,
        feedback,
      },
    },
  );
}

/**
 * Helper function to create a batch processing error.
 *
 * @param failedCount - Number of items that failed
 * @param totalCount - Total number of items processed
 * @param errors - Array of individual errors
 * @returns A typed NeuroLinkFeatureError
 */
export function createBatchError(
  failedCount: number,
  totalCount: number,
  errors: Array<{ index: number; error: Error }>,
): NeuroLinkFeatureError {
  return ioProcessorErrors.create(
    "BATCH_ERROR",
    `Batch processing failed: ${failedCount} of ${totalCount} items failed`,
    {
      retryable: false,
      details: {
        failedCount,
        totalCount,
        successCount: totalCount - failedCount,
        errors: errors.map((e) => ({
          index: e.index,
          message: e.error.message,
        })),
      },
    },
  );
}
