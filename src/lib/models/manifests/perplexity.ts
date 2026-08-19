import type { ProviderModelManifest } from "../../types/index.js";

/**
 * Minimal manifest: perplexity has no MODEL_REGISTRY entries today, so
 * only the provider-wide fallback is known. Named models can be added here
 * incrementally without touching any consumer — see Task 5 of the model
 * metadata consolidation plan.
 */
export const perplexityManifest: ProviderModelManifest = {
  defaultContextWindow: 127000,
  models: {
    _default: {
      aliases: [],
      contextWindow: 127000,
      maxOutputTokens: 64000,
      vision: false,
      functionCalling: false,
    },
  },
};
