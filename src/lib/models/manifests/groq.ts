import type { ProviderModelManifest } from "../../types/index.js";

/**
 * Minimal manifest: groq has no MODEL_REGISTRY entries today, so
 * only the provider-wide fallback is known. Named models can be added here
 * incrementally without touching any consumer — see Task 5 of the model
 * metadata consolidation plan.
 */
export const groqManifest: ProviderModelManifest = {
  defaultContextWindow: 128000,
  models: {
    _default: {
      aliases: [],
      contextWindow: 128000,
      maxOutputTokens: 64000,
      vision: false,
      functionCalling: false,
    },
  },
};
