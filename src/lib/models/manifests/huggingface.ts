import type { ProviderModelManifest } from "../../types/index.js";

/**
 * Minimal manifest: huggingface has no MODEL_REGISTRY entries today, so
 * only the provider-wide fallback is known. `functionCalling` is true
 * because the router serves tool-calling models and returns `tool_calls` for
 * them; it previously claimed false, contradicting the wire.
 *
 * Named models can be added here incrementally without touching any
 * consumer — see Task 5 of the model metadata consolidation plan.
 */
export const huggingfaceManifest: ProviderModelManifest = {
  defaultContextWindow: 32000,
  models: {
    _default: {
      aliases: [],
      contextWindow: 32000,
      maxOutputTokens: 32000,
      vision: false,
      functionCalling: true,
    },
  },
};
