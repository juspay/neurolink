import type { ProviderModelManifest } from "../../types/index.js";

/**
 * Minimal manifest: jina has no MODEL_REGISTRY entries today, so
 * only the provider-wide fallback is known. Named models can be added here
 * incrementally without touching any consumer — see Task 5 of the model
 * metadata consolidation plan.
 */
export const jinaManifest: ProviderModelManifest = {
  defaultContextWindow: 8192,
  models: {
    _default: {
      aliases: [],
      contextWindow: 8192,
      maxOutputTokens: 8192,
      vision: false,
      functionCalling: false,
    },
  },
};
