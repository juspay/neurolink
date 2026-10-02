import type { ProviderModelManifest } from "../../types/index.js";

/**
 * Perplexity Decisions API — the `decide` inference type, not text generation,
 * and not the Sonar models of the `perplexity` text provider.
 *
 * `contextWindow` is the documented ceiling on input tokens per request,
 * shared by the state, every question and every image. `vision` describes
 * `generate()` input, which this provider does not serve; its image input is
 * `DecisionRequest.images`.
 *
 * `maxOutputTokens` is required by the manifest type but has no honest value
 * for a model that emits no text, so a small non-zero figure is used.
 */
export const perplexityDeciderManifest: ProviderModelManifest = {
  defaultContextWindow: 262_144,
  models: {
    _default: {
      aliases: [],
      contextWindow: 262_144,
      maxOutputTokens: 256,
      vision: false,
      functionCalling: false,
    },
    "pplx-decider-v1-27b": {
      aliases: [],
      displayName: "Perplexity Decider v1 27B",
      contextWindow: 262_144,
      maxOutputTokens: 256,
      vision: false,
      functionCalling: false,
    },
  },
};
