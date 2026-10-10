import type { ProviderModelManifest } from "../../types/index.js";

/**
 * Mostly-minimal manifest: vertex has no MODEL_REGISTRY entries, so the
 * provider-wide fallback covers every model not named here. Named models can
 * be added incrementally without touching any consumer — see Task 5 of the
 * model metadata consolidation plan.
 *
 * The Gemini 2.5 rows exist for their output ceiling: PROVIDER_MAX_TOKENS
 * (core/constants.ts) — the table getSafeMaxTokens() reads — takes its
 * per-model keys from this manifest, so without them a Vertex Gemini 2.5
 * call capped at the provider default of 64,000 instead of the models' real
 * 65,536 (the same figure google-ai.ts carries for these ids). No
 * pricingPerMTok: Vertex bills on its own price list, and pricing.ts keeps
 * its own Vertex rows.
 */
export const vertexManifest: ProviderModelManifest = {
  defaultContextWindow: 1048576,
  models: {
    "gemini-2.5-pro": {
      aliases: [],
      displayName: "Gemini 2.5 Pro",
      contextWindow: 1048576,
      maxOutputTokens: 65536,
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
    },
    "gemini-2.5-flash": {
      aliases: [],
      displayName: "Gemini 2.5 Flash",
      contextWindow: 1048576,
      maxOutputTokens: 65536,
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
    },
    "gemini-2.5-flash-lite": {
      aliases: [],
      displayName: "Gemini 2.5 Flash-Lite",
      contextWindow: 1048576,
      maxOutputTokens: 65536,
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
    },
    _default: {
      aliases: [],
      contextWindow: 1048576,
      maxOutputTokens: 64000,
      // Measured against live Vertex, every served model in this project —
      // gemini-2.5-flash / -pro / -flash-lite, claude-sonnet-4-6 and
      // claude-sonnet-4-5@20250929 — accepted image and PDF input and
      // returned tool calls. Declaring false here contradicted the wire.
      vision: true,
      functionCalling: true,
    },
  },
};
