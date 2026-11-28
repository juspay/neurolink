/**
 * Extended-thinking budget limits, from the `thinkingLimits` block in
 * `src/lib/providers/rules/<id>.json`.
 */
import type { ProviderThinkingLimits } from "../../types/index.js";
import { getProviderRules } from "./registry.js";

/** A provider's thinking limits; throws when its rules file has none. */
export function getThinkingLimits(id: string): ProviderThinkingLimits {
  const limits = getProviderRules(id).thinkingLimits;
  if (!limits) {
    throw new Error(
      `Provider rules file "${id}.json" has no thinkingLimits block`,
    );
  }
  return limits;
}
