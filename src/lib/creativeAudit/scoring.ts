import type { DecisionAnswerMap } from "../types/index.js";
import { ADS_IMAGE_AUDIT_LIMITS as LIMITS } from "../constants/adsImageAudit.js";
import type {
  AdsImageAuditRubric,
  AdsImageAuditRating,
  AdsImageAuditAssessment,
  AdsImageAuditActionDraft,
} from "../types/index.js";

/** Recalculate scores from a validated probability distribution; never trust a raw percentage. */
export const readAuditRatings = (
  answers: DecisionAnswerMap,
  rubric: AdsImageAuditRubric,
): AdsImageAuditRating[] =>
  rubric.criteria.map((criterion) => {
    const answer = answers[criterion.id];
    if (
      answer?.type !== "score" ||
      !Number.isFinite(answer.confidence) ||
      answer.confidence < 0 ||
      answer.confidence > 1
    ) {
      throw new Error("XOR did not return a valid rubric score.");
    }
    const probabilities = criterion.levels.map(
      (_level, index) => answer.probabilities[String(index)],
    );
    if (
      Object.keys(answer.probabilities).length !== criterion.levels.length ||
      probabilities.some(
        (value) => !Number.isFinite(value) || value < 0 || value > 1,
      ) ||
      Math.abs(probabilities.reduce((sum, value) => sum + value, 0) - 1) > 0.001
    ) {
      throw new Error("XOR returned an invalid probability distribution.");
    }
    const expected = probabilities.reduce(
      (sum, probability, index) => sum + probability * index,
      0,
    );
    if (
      !Number.isFinite(answer.score) ||
      Math.abs(answer.score - expected) > 0.01
    ) {
      throw new Error("XOR score does not match its probability distribution.");
    }
    return {
      criterionId: criterion.id,
      percent: Math.round((expected / (criterion.levels.length - 1)) * 100),
      confidence: answer.confidence,
      probabilities,
    };
  });

export const weightedAuditPercent = (
  ratings: AdsImageAuditRating[],
  rubric: AdsImageAuditRubric,
): number => {
  const totalWeight = rubric.criteria.reduce(
    (sum, criterion) => sum + criterion.weight,
    0,
  );
  return Math.round(
    rubric.criteria.reduce((sum, criterion) => {
      const rating = ratings.find(
        (value) => value.criterionId === criterion.id,
      );
      if (!rating) {
        throw new Error("Assessment omitted a rubric criterion.");
      }
      return sum + rating.percent * criterion.weight;
    }, 0) / totalWeight,
  );
};

/** Actions must cite an actually assessed competitor and a sufficiently confident measured gap. */
export const hasSupportedAuditGap = (
  action: AdsImageAuditActionDraft,
  assessments: AdsImageAuditAssessment[],
): boolean => {
  const merchant = assessments.find(
    (assessment) => assessment.store.role === "merchant",
  );
  const competitor = assessments.find(
    (assessment) =>
      assessment.store.role === "competitor" &&
      assessment.store.id === action.competitorStoreId,
  );
  if (merchant?.status !== "assessed" || competitor?.status !== "assessed") {
    return false;
  }
  const baseline = merchant.ratings.find(
    (rating) => rating.criterionId === action.criterionId,
  );
  const benchmark = competitor.ratings.find(
    (rating) => rating.criterionId === action.criterionId,
  );
  return (
    baseline !== undefined &&
    benchmark !== undefined &&
    baseline.confidence >= LIMITS.minimumConfidence &&
    benchmark.confidence >= LIMITS.minimumConfidence &&
    benchmark.percent - baseline.percent >= LIMITS.minimumGapPercent
  );
};
