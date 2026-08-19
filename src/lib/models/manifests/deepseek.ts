import type { ProviderModelManifest } from "../../types/index.js";

/**
 * Minimal manifest: deepseek has no MODEL_REGISTRY entries today, so
 * only the provider-wide fallback is known. Named models can be added here
 * incrementally without touching any consumer — see Task 5 of the model
 * metadata consolidation plan.
 */
export const deepseekManifest: ProviderModelManifest = {
  defaultContextWindow: 64000,
  models: {
    _default: {
      aliases: [],
      contextWindow: 64000,
      maxOutputTokens: 64000,
      vision: false,
      functionCalling: false,
    },
  },
};
