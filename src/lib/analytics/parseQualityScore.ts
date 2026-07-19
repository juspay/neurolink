/**
 * Safe narrowing of unknown event payloads into AnalyticsQualityScore.
 */

import type { AnalyticsQualityScore } from "../types/index.js";

/**
 * Convert an unknown quality-score payload into AnalyticsQualityScore.
 * Returns undefined for missing, null, or malformed values.
 */
export function parseAnalyticsQualityScore(
  value: unknown,
): AnalyticsQualityScore | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  // Reject NaN/Infinity — typeof NaN === "number"
  if (
    !Number.isFinite(record.overall) ||
    !Number.isFinite(record.relevance) ||
    !Number.isFinite(record.accuracy) ||
    !Number.isFinite(record.completeness)
  ) {
    return undefined;
  }
  return {
    overall: record.overall as number,
    relevance: record.relevance as number,
    accuracy: record.accuracy as number,
    completeness: record.completeness as number,
    ...(typeof record.reasoning === "string"
      ? { reasoning: record.reasoning }
      : {}),
  };
}
