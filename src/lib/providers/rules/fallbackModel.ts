/**
 * A provider's default and fallback models, from the `defaultModel` and
 * `fallbackModel` fields in `src/lib/providers/rules/<id>.json`.
 */
import { getProviderRules } from "./registry.js";

/** The provider's fallback model; throws when its rules file has none. */
export function getFallbackModel(id: string): string {
  const model = getProviderRules(id).fallbackModel;
  if (!model) {
    throw new Error(`Provider rules file "${id}.json" has no fallbackModel`);
  }
  return model;
}

/** The provider's default model; throws when its rules file has none. */
export function getDefaultModel(id: string): string {
  const model = getProviderRules(id).defaultModel;
  if (!model) {
    throw new Error(`Provider rules file "${id}.json" has no defaultModel`);
  }
  return model;
}
