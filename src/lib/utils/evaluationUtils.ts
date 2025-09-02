/**
 * Evaluation utilities for normalizing EvaluationData objects
 * Provides helper functions to handle partial evaluation data and ensure
 * complete EvaluationData objects with safe defaults
 */

import type { EvaluationData } from "../types/evaluation.js";

/**
 * Default values for required EvaluationData fields
 */
const DEFAULT_EVALUATION_DATA: EvaluationData = {
  // Core scores (1-10 scale)
  relevance: 0,
  accuracy: 0,
  completeness: 0,
  overall: 0,

  // Advanced insights
  isOffTopic: false,
  alertSeverity: "none",
  reasoning: "",

  // Metadata
  evaluationModel: "unknown",
  evaluationTime: 0,

  // Enhanced metadata defaults
  evaluationProvider: "unknown",
  evaluationAttempt: 0,
  evaluationConfig: {
    mode: "default",
    fallbackUsed: false,
    costEstimate: 0,
  },
};

/**
 * Normalize partial EvaluationData into a complete EvaluationData object
 * with safe defaults for missing required fields
 */
export function normalizeEvaluationData(
  partial: Partial<EvaluationData>,
): EvaluationData {
  const normalized: EvaluationData = {
    ...DEFAULT_EVALUATION_DATA,
    ...partial,
  };

  // Ensure scores are within valid range (0-10)
  normalized.relevance = Math.max(0, Math.min(10, normalized.relevance));
  normalized.accuracy = Math.max(0, Math.min(10, normalized.accuracy));
  normalized.completeness = Math.max(0, Math.min(10, normalized.completeness));
  normalized.overall = Math.max(0, Math.min(10, normalized.overall));

  // Optional scores
  if (normalized.domainAlignment !== undefined) {
    normalized.domainAlignment = Math.max(
      0,
      Math.min(10, normalized.domainAlignment),
    );
  }
  if (normalized.terminologyAccuracy !== undefined) {
    normalized.terminologyAccuracy = Math.max(
      0,
      Math.min(10, normalized.terminologyAccuracy),
    );
  }
  if (normalized.toolEffectiveness !== undefined) {
    normalized.toolEffectiveness = Math.max(
      0,
      Math.min(10, normalized.toolEffectiveness),
    );
  }

  // Validate alertSeverity enum
  const validSeverities = ["low", "medium", "high", "none"] as const;
  if (!validSeverities.includes(normalized.alertSeverity)) {
    normalized.alertSeverity = "none";
  }

  // Truncate reasoning and suggestedImprovements to enforce length constraints
  normalized.reasoning = truncateString(normalized.reasoning, 150);
  if (normalized.suggestedImprovements) {
    normalized.suggestedImprovements = truncateString(
      normalized.suggestedImprovements,
      100,
    );
  }

  // Ensure evaluationTime is non-negative
  normalized.evaluationTime = Math.max(0, normalized.evaluationTime);

  // Ensure evaluationAttempt is positive
  if (normalized.evaluationAttempt !== undefined) {
    normalized.evaluationAttempt = Math.max(0, normalized.evaluationAttempt);
  }

  // Ensure evaluationConfig has required fields
  if (normalized.evaluationConfig) {
    normalized.evaluationConfig = {
      mode: normalized.evaluationConfig.mode || "default",
      fallbackUsed: Boolean(normalized.evaluationConfig.fallbackUsed),
      costEstimate: Math.max(0, normalized.evaluationConfig.costEstimate || 0),
    };
  }

  return normalized;
}

/**
 * Create a default EvaluationData object for cases where no evaluation was performed
 */
export function createDefaultEvaluationData(
  overrides: Partial<EvaluationData> = {},
): EvaluationData {
  return normalizeEvaluationData({
    ...overrides,
    reasoning: overrides.reasoning || "No evaluation performed",
    evaluationModel: overrides.evaluationModel || "none",
  });
}

/**
 * Check if EvaluationData indicates a successful evaluation
 */
export function isValidEvaluation(evaluation: EvaluationData): boolean {
  return (
    evaluation.evaluationModel !== "unknown" &&
    evaluation.evaluationModel !== "none" &&
    evaluation.reasoning.length > 0 &&
    evaluation.overall > 0
  );
}

/**
 * Create EvaluationData for a failed evaluation attempt
 */
export function createFailedEvaluationData(
  error: string,
  overrides: Partial<EvaluationData> = {},
): EvaluationData {
  return normalizeEvaluationData({
    ...overrides,
    reasoning: `Evaluation failed: ${truncateString(error, 100)}`,
    alertSeverity: "medium",
    evaluationModel: overrides.evaluationModel || "error",
    evaluationConfig: {
      mode: "error",
      fallbackUsed: true,
      costEstimate: 0,
    },
  });
}

/**
 * Helper function to truncate strings to a maximum length
 */
function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - 3) + "...";
}

/**
 * Merge multiple partial evaluation data objects into a normalized result
 */
export function mergeEvaluationData(
  ...partials: Partial<EvaluationData>[]
): EvaluationData {
  const merged = partials.reduce(
    (acc, partial) => ({ ...acc, ...partial }),
    {},
  );
  return normalizeEvaluationData(merged);
}
