import type { ProviderModelManifest } from "../../types/index.js";

/**
 * Minimal manifest: conservative floor values pending live verification —
 * Cerebras serves large-context models, but the free tier caps effective
 * context/output well below the architectural maximums, so these defaults
 * stay deliberately modest. Named models can be added incrementally
 * without touching any consumer — same pattern as groq.ts.
 */
export const cerebrasManifest: ProviderModelManifest = {
  defaultContextWindow: 65536,
  models: {
    _default: {
      aliases: [],
      contextWindow: 65536,
      maxOutputTokens: 8192,
      vision: false,
      functionCalling: true,
    },
  },
};
