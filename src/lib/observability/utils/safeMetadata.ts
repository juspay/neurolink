/**
 * Safe metadata filtering for observability exporters.
 *
 * Only these attribute keys are forwarded to third-party backends as trace
 * metadata. User prompts (input), LLM responses (output), error stacks, and
 * any other potentially sensitive data are excluded to prevent PII leaks.
 */

import type { SpanAttributes } from "../types/spanTypes.js";

// Only ai.* keys are forwarded as metadata. Stream metrics (chunk_count,
// content_length) should be accessed via span attributes directly, not via
// metadata sent to third-party backends.
export const SAFE_METADATA_KEYS = new Set([
  "ai.provider",
  "ai.model",
  "ai.temperature",
  "ai.max_tokens",
]);

export function filterSafeMetadata(
  attributes: SpanAttributes,
): Record<string, unknown> {
  const filtered: Record<string, unknown> = {};
  for (const key of SAFE_METADATA_KEYS) {
    if (attributes[key] !== undefined) {
      filtered[key] = attributes[key];
    }
  }
  return filtered;
}
