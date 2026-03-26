/**
 * @file Typed error hierarchy for the Evaluation/Scoring System.
 * Uses NeuroLinkFeatureError and createErrorFactory from core infrastructure.
 */

import {
  NeuroLinkFeatureError,
  createErrorFactory,
} from "../../core/infrastructure/index.js";
import type { EnhancedEvaluationContext } from "../../types/evaluationTypes.js";

/**
 * Error codes for the Evaluation feature.
 * These codes help identify specific error scenarios for proper handling.
 */
export const EvaluationErrorCodes = {
  /** The evaluation process itself failed */
  EVALUATION_FAILED: "EVALUATION_FAILED",
  /** Failed to parse the evaluation response from the judge LLM */
  PARSE_ERROR: "PARSE_ERROR",
  /** The requested evaluation strategy was not found in the registry */
  STRATEGY_NOT_FOUND: "STRATEGY_NOT_FOUND",
  /** The AI provider for evaluation failed */
  PROVIDER_ERROR: "PROVIDER_ERROR",
  /** Configuration for evaluation is invalid or missing */
  CONFIGURATION_ERROR: "CONFIGURATION_ERROR",
  /** The custom evaluator function threw an error */
  CUSTOM_EVALUATOR_ERROR: "CUSTOM_EVALUATOR_ERROR",
  /** Batch evaluation failed for one or more items */
  BATCH_EVALUATION_ERROR: "BATCH_EVALUATION_ERROR",
  /** Aggregation of evaluation results failed */
  AGGREGATION_ERROR: "AGGREGATION_ERROR",
  /** Registry operation failed */
  REGISTRY_ERROR: "REGISTRY_ERROR",
  /** Maximum retry attempts exceeded */
  MAX_RETRIES_EXCEEDED: "MAX_RETRIES_EXCEEDED",
  /** Timeout during evaluation */
  TIMEOUT_ERROR: "TIMEOUT_ERROR",
  /** Rate limit hit during evaluation */
  RATE_LIMIT_ERROR: "RATE_LIMIT_ERROR",
} as const;

/**
 * Type for evaluation error codes
 */
export type EvaluationErrorCode =
  (typeof EvaluationErrorCodes)[keyof typeof EvaluationErrorCodes];

/**
 * Factory for creating typed evaluation errors.
 * Uses the createErrorFactory pattern from core infrastructure.
 */
export const evaluationErrors = createErrorFactory(
  "Evaluation",
  EvaluationErrorCodes,
);

/**
 * Extended evaluation context for error details.
 * Provides rich debugging information when errors occur.
 */
export interface EvaluationErrorContext {
  /** Length of the user query (redacted for safety) */
  userQueryLength?: number;
  /** Length of the AI response (redacted for safety) */
  aiResponseLength?: number;
  /** The current attempt number */
  attemptNumber?: number;
  /** Previous evaluation scores if any */
  previousScores?: number[];
  /** The evaluation strategy in use */
  strategy?: string;
  /** The evaluation model being used */
  evaluationModel?: string;
  /** The provider being used */
  provider?: string;
  /** Length of the raw response (redacted for safety) */
  rawResponseLength?: number;
  /** Any additional context */
  additionalContext?: Record<string, unknown>;
}

/**
 * Checks if an error is retryable based on its code.
 * Transient errors (timeout, rate limit, some provider errors) are retryable.
 *
 * @param error - The error to check
 * @returns true if the error is retryable
 */
export function isRetryableEvaluationError(
  error: NeuroLinkFeatureError,
): boolean {
  if (error.retryable) {
    return true;
  }

  const retryableCodes: EvaluationErrorCode[] = [
    EvaluationErrorCodes.TIMEOUT_ERROR,
    EvaluationErrorCodes.RATE_LIMIT_ERROR,
  ];

  return retryableCodes.includes(error.code as EvaluationErrorCode);
}

/**
 * Checks if an error is a NeuroLinkFeatureError from the Evaluation feature.
 *
 * @param error - The error to check
 * @returns true if the error is an evaluation error
 */
export function isEvaluationError(
  error: unknown,
): error is NeuroLinkFeatureError {
  return (
    error instanceof NeuroLinkFeatureError && error.feature === "Evaluation"
  );
}

/**
 * Helper function to create an evaluation failed error with context.
 *
 * @param message - The error message
 * @param context - The evaluation context
 * @param cause - The underlying cause error
 * @returns A typed NeuroLinkFeatureError
 */
export function createEvaluationFailedError(
  message: string,
  context?: EvaluationErrorContext,
  cause?: Error,
): NeuroLinkFeatureError {
  return evaluationErrors.create("EVALUATION_FAILED", message, {
    retryable: false,
    details: {
      evaluationContext: context,
    },
    cause,
  });
}

/**
 * Helper function to create a parse error with raw response.
 *
 * @param rawResponse - The raw response that failed to parse
 * @param cause - The underlying parse error
 * @returns A typed NeuroLinkFeatureError
 */
export function createParseError(
  rawResponse: string,
  cause?: Error,
): NeuroLinkFeatureError {
  return evaluationErrors.create(
    "PARSE_ERROR",
    "Failed to parse evaluation response from judge LLM",
    {
      retryable: false,
      details: {
        rawResponseLength: rawResponse.length,
      },
      cause,
    },
  );
}

/**
 * Helper function to create a strategy not found error.
 *
 * @param strategyName - The name of the strategy that was not found
 * @param availableStrategies - List of available strategies
 * @returns A typed NeuroLinkFeatureError
 */
export function createStrategyNotFoundError(
  strategyName: string,
  availableStrategies: string[] = [],
): NeuroLinkFeatureError {
  return evaluationErrors.create(
    "STRATEGY_NOT_FOUND",
    `Evaluation strategy "${strategyName}" not found in registry`,
    {
      retryable: false,
      details: {
        requestedStrategy: strategyName,
        availableStrategies,
      },
    },
  );
}

/**
 * Helper function to create a provider error.
 *
 * @param message - The error message
 * @param provider - The provider that failed
 * @param cause - The underlying cause error
 * @returns A typed NeuroLinkFeatureError
 */
export function createProviderError(
  message: string,
  provider: string,
  cause?: Error,
  options?: { retryable?: boolean },
): NeuroLinkFeatureError {
  return evaluationErrors.create("PROVIDER_ERROR", message, {
    retryable: options?.retryable ?? false,
    details: {
      provider,
      errorMessage: cause?.message,
    },
    cause,
  });
}

/**
 * Helper function to create a max retries exceeded error.
 *
 * @param attempts - The number of attempts made
 * @param lastScore - The last evaluation score
 * @param threshold - The passing threshold
 * @param context - The evaluation context
 * @returns A typed NeuroLinkFeatureError
 */
export function createMaxRetriesExceededError(
  attempts: number,
  lastScore: number,
  threshold: number,
  context?: EvaluationErrorContext,
): NeuroLinkFeatureError {
  return evaluationErrors.create(
    "MAX_RETRIES_EXCEEDED",
    `Maximum retry attempts (${attempts}) exceeded. Last score: ${lastScore}, threshold: ${threshold}`,
    {
      retryable: false,
      details: {
        attempts,
        lastScore,
        threshold,
        evaluationContext: context,
      },
    },
  );
}

/**
 * Helper function to create a batch evaluation error.
 *
 * @param failedCount - Number of evaluations that failed
 * @param totalCount - Total number of evaluations attempted
 * @param errors - Array of individual errors
 * @returns A typed NeuroLinkFeatureError
 */
export function createBatchEvaluationError(
  failedCount: number,
  totalCount: number,
  errors: Array<{ index: number; error: Error }>,
): NeuroLinkFeatureError {
  return evaluationErrors.create(
    "BATCH_EVALUATION_ERROR",
    `Batch evaluation failed: ${failedCount} of ${totalCount} evaluations failed`,
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
  return evaluationErrors.create("CONFIGURATION_ERROR", message, {
    retryable: false,
    details: {
      configIssue,
    },
  });
}

/**
 * Converts an evaluation context to error context for debugging.
 *
 * @param context - The enhanced evaluation context
 * @returns An EvaluationErrorContext
 */
export function contextToErrorContext(
  context: EnhancedEvaluationContext,
): EvaluationErrorContext {
  return {
    userQueryLength: context.userQuery?.length,
    aiResponseLength: context.aiResponse?.length,
    attemptNumber: context.attemptNumber,
    previousScores: context.previousEvaluations?.map((e) => e.finalScore),
    evaluationModel: undefined, // Will be set by the evaluator
    provider: context.provider,
  };
}
