/**
 * @file Contains the logic for mapping raw evaluation results to the structured EvaluationData type.
 */

import type {
  EnhancedEvaluationContext,
  EvaluationResult,
} from "../types/evaluationTypes.js";
import type { EvaluationData } from "../types/evaluation.js";

/**
 * Maps a raw `EvaluationResult` to the structured `EvaluationData` format.
 * This includes calculating derived fields like `isOffTopic` and `alertSeverity`.
 *
 * @param result The raw `EvaluationResult` from the evaluator.
 * @param threshold The score threshold to determine if the evaluation is passing.
 * @param offTopicThreshold The score below which a response is considered off-topic.
 * @param highSeverityThreshold The score below which a failing response is high severity.
 * @returns A structured `EvaluationData` object.
 */
export function mapToEvaluationData(
  evalContext: EnhancedEvaluationContext,
  result: EvaluationResult,
  threshold: number,
  offTopicThreshold: number = 5,
  highSeverityThreshold: number = 4,
): EvaluationData {
  const isPassing = result.finalScore >= threshold;
  return {
    relevance: result.relevanceScore,
    accuracy: result.accuracyScore,
    completeness: result.completenessScore,
    overall: result.finalScore,
    isOffTopic: result.finalScore < offTopicThreshold,
    alertSeverity: isPassing
      ? "none"
      : result.finalScore < highSeverityThreshold
        ? "high"
        : "medium",
    reasoning: result.reasoning,
    suggestedImprovements: result.suggestedImprovements,
    evaluationModel: result.evaluationModel,
    evaluationTime: result.evaluationTime,
    evaluationAttempt: result.attemptNumber,
    responseContent: evalContext.aiResponse,
    queryContent: evalContext.userQuery,
  };
}
