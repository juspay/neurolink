import type { ProviderModelManifest } from "../../types/index.js";

/**
 * Minimal manifest: ideogram has no MODEL_REGISTRY entries today, so
 * only the provider-wide fallback is known. Named models can be added here
 * incrementally without touching any consumer — see Task 5 of the model
 * metadata consolidation plan.
 */
export const ideogramManifest: ProviderModelManifest = {
  defaultContextWindow: 2000,
  models: {
    _default: {
      aliases: [],
      contextWindow: 2000,
      maxOutputTokens: 2000,
      vision: false,
      functionCalling: false,
    },
  },
};
