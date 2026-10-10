import type {
  AdsImageAuditAction,
  AdsImageAuditActionContext,
  DecisionQuestionMap,
} from "../types/index.js";
import { adsImageAuditActionDraftsSchema } from "./schemas.js";
import { hasSupportedAuditGap } from "./scoring.js";
import { ADS_IMAGE_AUDIT_LIMITS as LIMITS } from "../constants/adsImageAudit.js";

/** @internal Ground and review action text; this is not another image inference pass. */
export const reviewAuditActions = async (
  context: AdsImageAuditActionContext,
): Promise<AdsImageAuditAction[]> => {
  const {
    client,
    options,
    stores,
    rubric,
    assessments,
    warnings,
    generateJson,
    progress,
  } = context;
  const checkAbort = () => options.signal?.throwIfAborted();
  const actions: AdsImageAuditAction[] = [];
  let reviewing = false;
  const merchant = assessments.find(
    (assessment) => assessment.store.role === "merchant",
  );
  if (
    merchant?.status === "assessed" &&
    assessments.some(
      (assessment) =>
        assessment.store.role === "competitor" &&
        assessment.status === "assessed",
    )
  ) {
    try {
      checkAbort();
      progress({ stage: "actions", status: "started" });
      const generated = adsImageAuditActionDraftsSchema.parse(
        await generateJson(
          'Draft up to 6 concrete image-creative improvements for the merchant. Return {"actions":' +
            '[{"title":"...","change":"...","criterionId":"rubric ID","competitorStoreId":"competitor ID",' +
            '"rationale":"..."}]}. Each action must cite a criterion with a confident merchant/competitor score gap. ' +
            "Do not invent visible details: scores indicate rubric gaps, not verified descriptions. " +
            "Suggest experiments, not guaranteed gains. Never copy competitor assets, invent endorsements or unsupported product/medical claims. Empty actions is valid.",
          {
            stores,
            rubric,
            assessments: assessments.map(({ ad, ...assessment }) => ({
              ...assessment,
              adId: ad?.id,
            })),
          },
        ),
      );
      progress({ stage: "actions", status: "completed" });
      const supported = generated.actions.filter((action) =>
        hasSupportedAuditGap(action, assessments),
      );
      if (supported.length !== generated.actions.length) {
        warnings.push(
          "Unsupported action citations or uncertain gaps were discarded.",
        );
      }
      if (supported.length > 0) {
        const judgmentQuestions: DecisionQuestionMap = Object.fromEntries(
          supported.flatMap((_action, index) => [
            [
              `relevant_${index}`,
              {
                type: "boolean",
                instructions: `Is action ${index} grounded in the cited rubric gap and relevant to this merchant, without invented visual facts, copied assets, unsupported claims or performance promises?`,
              },
            ],
            [
              `priority_${index}`,
              {
                type: "score",
                instructions: `Prioritize action ${index} as a merchant experiment.`,
                criteria: ["low", "medium", "high"],
              },
            ],
          ]),
        );
        checkAbort();
        reviewing = true;
        progress({ stage: "review", status: "started" });
        const judgment = await client.decide({
          provider: "typesafe",
          model: options.decisionModels?.typesafe,
          questions: judgmentQuestions,
          timeoutMs: LIMITS.inferenceTimeoutMs,
          signal: options.signal,
          state: JSON.stringify({
            stores,
            rubric,
            assessments: assessments.map(({ ad, ...assessment }) => ({
              ...assessment,
              adId: ad?.id,
            })),
            actions: supported,
          }),
        });
        if (judgment.provider !== "typesafe") {
          throw new Error("JEV provider mismatch.");
        }
        for (const [index, draft] of supported.entries()) {
          const relevant = judgment.answers[`relevant_${index}`];
          const priority = judgment.answers[`priority_${index}`];
          if (
            relevant?.type !== "boolean" ||
            !Number.isFinite(relevant.probability) ||
            relevant.probability < 0 ||
            relevant.probability > 1 ||
            priority?.type !== "score" ||
            !Number.isFinite(priority.score) ||
            priority.score < 0 ||
            priority.score > 2 ||
            !Number.isFinite(priority.confidence) ||
            priority.confidence < 0 ||
            priority.confidence > 1
          ) {
            throw new Error("JEV returned invalid judgments.");
          }
          const probabilities = [0, 1, 2].map(
            (value) => priority.probabilities[String(value)],
          );
          if (
            Object.keys(priority.probabilities).length !== 3 ||
            probabilities.some(
              (value) => !Number.isFinite(value) || value < 0 || value > 1,
            ) ||
            Math.abs(probabilities.reduce((sum, value) => sum + value, 0) - 1) >
              0.001 ||
            Math.abs(
              priority.score -
                probabilities.reduce(
                  (sum, value, index) => sum + value * index,
                  0,
                ),
            ) > 0.01
          ) {
            throw new Error("JEV returned an invalid priority distribution.");
          }
          actions.push({
            draft,
            relevanceProbability: relevant.probability,
            priority: priority.score,
            priorityConfidence: priority.confidence,
            status:
              relevant.probability >= LIMITS.minimumRelevanceProbability &&
              priority.confidence >= LIMITS.minimumConfidence
                ? "recommended"
                : "review",
          });
        }
        progress({ stage: "review", status: "completed" });
        actions.sort((left, right) => right.priority - left.priority);
      }
    } catch {
      checkAbort();
      progress({ stage: reviewing ? "review" : "actions", status: "failed" });
      actions.length = 0;
      warnings.push(
        "Action generation or JEV review failed; no unchecked recommendations are presented.",
      );
    }
  } else {
    warnings.push(
      "Merchant and competitor image assessments are required before proposing actions.",
    );
  }

  return actions;
};
