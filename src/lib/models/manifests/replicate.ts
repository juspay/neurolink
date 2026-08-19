import type { ProviderModelManifest } from "../../types/index.js";

/**
 * Minimal manifest: replicate has no MODEL_REGISTRY entries today, so
 * only the provider-wide fallback is known. Named models can be added here
 * incrementally without touching any consumer — see Task 5 of the model
 * metadata consolidation plan.
 */
export const replicateManifest: ProviderModelManifest = {
  defaultContextWindow: 32768,
  models: {
    _default: {
      aliases: [],
      contextWindow: 32768,
      maxOutputTokens: 32768,
      vision: false,
      functionCalling: false,
    },
  },
};
