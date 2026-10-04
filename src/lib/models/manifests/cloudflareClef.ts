import type { ProviderModelManifest } from "../../types/index.js";

/**
 * Cloudflare Clef on Workers AI — the `decide` inference type, not text
 * generation, and not the Workers AI text models of the `cloudflare` provider.
 *
 * `contextWindow` is the figure Cloudflare documents (65,536 tokens). The
 * Workers AI endpoint ignores state text past about 2,048 tokens without an
 * error (hosted service or model: unknown), so NeuroLink enforces the limit on
 * the descriptor's `decisionLimits`, not this. `vision` describes `generate()`
 * input, which this provider does not serve; its image input is
 * `DecisionRequest.images`.
 *
 * `maxOutputTokens` is required by the manifest type but has no honest value
 * for a model that emits no text, so a small non-zero figure is used.
 */
export const cloudflareClefManifest: ProviderModelManifest = {
  defaultContextWindow: 65_536,
  models: {
    _default: {
      aliases: [],
      contextWindow: 65_536,
      maxOutputTokens: 256,
      vision: false,
      functionCalling: false,
    },
    clef: {
      aliases: ["@cf/cloudflare/clef"],
      displayName: "Cloudflare Clef (27B)",
      contextWindow: 65_536,
      maxOutputTokens: 256,
      vision: false,
      functionCalling: false,
    },
    "clef-flash": {
      aliases: ["@cf/cloudflare/clef-flash"],
      displayName: "Cloudflare Clef-flash (9B)",
      contextWindow: 65_536,
      maxOutputTokens: 256,
      vision: false,
      functionCalling: false,
    },
  },
};
