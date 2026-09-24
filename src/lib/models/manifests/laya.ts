import type { ProviderModelManifest } from "../../types/index.js";

/**
 * Laya — the `decide` inference type, not text generation.
 *
 * `contextWindow` is each checkpoint's encoder window, the whole budget for
 * the state plus one question's instructions and options. `auto` carries the
 * English figure because Laya's router may pick the English checkpoint.
 *
 * `maxOutputTokens` is required by the manifest type but has no honest value
 * for a model that emits no text, so a small non-zero figure is used.
 */
export const layaManifest: ProviderModelManifest = {
  defaultContextWindow: 1024,
  models: {
    _default: {
      aliases: [],
      contextWindow: 1024,
      maxOutputTokens: 256,
      vision: false,
      functionCalling: false,
    },
    "typed-decisions": {
      aliases: [],
      displayName: "Laya (typed decisions)",
      contextWindow: 1024,
      maxOutputTokens: 256,
      vision: false,
      functionCalling: false,
    },
    multilingual: {
      aliases: [],
      displayName: "Laya (multilingual)",
      contextWindow: 1024,
      maxOutputTokens: 256,
      vision: false,
      functionCalling: false,
    },
    english: {
      aliases: [],
      displayName: "Laya (English)",
      contextWindow: 512,
      maxOutputTokens: 256,
      vision: false,
      functionCalling: false,
    },
    auto: {
      aliases: [],
      displayName: "Laya (routed by language)",
      contextWindow: 512,
      maxOutputTokens: 256,
      vision: false,
      functionCalling: false,
    },
  },
};
