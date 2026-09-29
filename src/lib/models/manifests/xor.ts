import type { ProviderModelManifest } from "../../types/index.js";

/**
 * XOR — the `decide` inference type, not text generation.
 *
 * `contextWindow` is the deployment's maximum prefill, shared by the state,
 * the questions and any images or video. `vision` describes `generate()`
 * input, which XOR does not serve; its image input is `DecisionRequest.images`.
 *
 * `maxOutputTokens` is required by the manifest type but has no honest value
 * for a model that emits no text, so a small non-zero figure is used.
 */
export const xorManifest: ProviderModelManifest = {
  defaultContextWindow: 250_000,
  models: {
    _default: {
      aliases: [],
      contextWindow: 250_000,
      maxOutputTokens: 256,
      vision: false,
      functionCalling: false,
    },
    "xor-1.1": {
      aliases: [],
      displayName: "XOR 1.1",
      contextWindow: 250_000,
      maxOutputTokens: 256,
      vision: false,
      functionCalling: false,
    },
  },
};
