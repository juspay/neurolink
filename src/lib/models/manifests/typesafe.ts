import type { ProviderModelManifest } from "../../types/index.js";

/**
 * TypeSafe (Jev) — the `decide` inference type, not text generation.
 *
 * `contextWindow` is genuinely meaningful here: it is the budget for the
 * `state` being judged, measured by bisection at ~33,000 tokens for state
 * plus the longest single question. (A separate, larger ~64,000 ceiling
 * governs state plus ALL questions; the manifest has nowhere to express a
 * second limit, and the tighter one is the safe number to publish.)
 *
 * `maxOutputTokens` is required by the manifest type but has no honest value
 * for a model that emits no text — Jev returns a handful of numbers per
 * question, so a small non-zero figure is the least misleading choice.
 * `functionCalling` and `vision` are false: it has neither.
 */
export const typesafeManifest: ProviderModelManifest = {
  defaultContextWindow: 33000,
  models: {
    _default: {
      aliases: ["jev"],
      contextWindow: 33000,
      maxOutputTokens: 1024,
      vision: false,
      functionCalling: false,
    },
    "jev-latest": {
      aliases: ["jev"],
      displayName: "Jev (latest)",
      contextWindow: 33000,
      maxOutputTokens: 1024,
      vision: false,
      functionCalling: false,
    },
    "jev-preview": {
      aliases: [],
      displayName: "Jev (preview)",
      contextWindow: 33000,
      maxOutputTokens: 1024,
      vision: false,
      functionCalling: false,
    },
  },
};
