/**
 * Model detection utilities for capability checking
 */

import { IMAGE_GENERATION_MODELS } from "../core/constants.js";

/**
 * Check if model name is valid for detection functions
 */
function isValidModelName(modelName: unknown): modelName is string {
  return typeof modelName === "string" && modelName.length > 0;
}

export function isGemini3Model(modelName: string): boolean {
  if (!isValidModelName(modelName)) {
    return false;
  }
  return /^gemini-3(\.\d+)?(-.*)?$/i.test(modelName);
}

export function isGemini25Model(modelName: string): boolean {
  if (!isValidModelName(modelName)) {
    return false;
  }
  return /^gemini-2\.5(-.*)?$/i.test(modelName);
}

export function supportsThinkingConfig(modelName: string): boolean {
  if (!isValidModelName(modelName)) {
    return false;
  }
  const thinkingModels = [
    /^gemini-3/i,
    /^gemini-2\.5-pro/i,
    /^gemini-2\.5-flash/i,
  ];
  return thinkingModels.some((pattern) => pattern.test(modelName));
}

export function supportsPromptCaching(modelName: string): boolean {
  if (!isValidModelName(modelName)) {
    return false;
  }
  const cachingModels = [
    /^gemini-3/i,
    /^gemini-2\.5/i,
    /^gpt-4/i,
    /^claude-3/i,
  ];
  return cachingModels.some((pattern) => pattern.test(modelName));
}

export function getMaxThinkingBudgetTokens(modelName: string): number {
  if (!isValidModelName(modelName)) {
    return 10000;
  }
  if (/^gemini-3(\.\d+)?-pro/i.test(modelName)) {
    return 100000;
  }
  if (/^gemini-3(\.\d+)?-flash/i.test(modelName)) {
    return 50000;
  }
  if (/^gemini-2\.5/i.test(modelName)) {
    return 32000;
  }
  return 10000;
}

// Per-model `thinkingBudget` bounds for the Gemini 2.5 family, confirmed
// against live Vertex generateContent responses (not just vendor docs, which
// have been observed to drift from runtime behavior — see the "known gotcha"
// on Gemini 2.5 Pro's range in public bug reports). Vertex rejects a budget
// outside these bounds with INVALID_ARGUMENT "thinking_budget is out of
// range; supported values are integers from <min> to <max>".
//
// Flash's true floor is 1, but budget:1 measured 0 thoughtsTokenCount — i.e.
// technically accepted but indistinguishable from thinking being off. The
// floor is bumped to 128 (Pro's real floor) here so a "minimal" mapping
// still produces observable thinking. Must precede the plain "flash" pattern
// below — "gemini-2.5-flash-lite" also matches a bare `/^gemini-2\.5-flash/`.
const GEMINI_25_THINKING_BUDGET_RANGES: ReadonlyArray<{
  pattern: RegExp;
  min: number;
  max: number;
}> = [
  { pattern: /^gemini-2\.5-flash-lite/i, min: 512, max: 24576 },
  { pattern: /^gemini-2\.5-flash/i, min: 128, max: 24576 },
  { pattern: /^gemini-2\.5-pro/i, min: 128, max: 32768 },
];

// Bounds safe for any Gemini 2.5 variant not explicitly listed above — the
// intersection of all three known models' verified ranges, so a model we
// haven't named still gets a budget every family member accepts.
const GEMINI_25_FALLBACK_BUDGET_RANGE = { min: 512, max: 24576 };

/**
 * Resolves the Vertex-accepted `thinkingBudget` bounds for a Gemini 2.5
 * model. Returns undefined for anything that isn't a Gemini 2.5 model —
 * Gemini 3 takes `thinkingLevel` directly, and no thinking-budget mapping
 * has been verified for earlier Gemini generations.
 */
export function getGemini25ThinkingBudgetRange(
  modelName: string,
): { min: number; max: number } | undefined {
  if (!isValidModelName(modelName) || !isGemini25Model(modelName)) {
    return undefined;
  }
  for (const { pattern, min, max } of GEMINI_25_THINKING_BUDGET_RANGES) {
    if (pattern.test(modelName)) {
      return { min, max };
    }
  }
  return GEMINI_25_FALLBACK_BUDGET_RANGE;
}

export function getModelFamily(modelName: string): string {
  if (!isValidModelName(modelName)) {
    return "unknown";
  }
  if (/^gemini-3/i.test(modelName)) {
    return "gemini-3";
  }
  if (/^gemini-2\.5/i.test(modelName)) {
    return "gemini-2.5";
  }
  if (/^gemini-2/i.test(modelName)) {
    return "gemini-2";
  }
  if (/^gpt-4/i.test(modelName)) {
    return "gpt-4";
  }
  if (/^claude-3/i.test(modelName)) {
    return "claude-3";
  }
  return "unknown";
}

// Compiled once at module load — hasRestrictedOutputLimit() is called per
// request and previously rebuilt this array on every call.
const IMAGE_MODEL_PATTERNS: ReadonlyArray<RegExp> = IMAGE_GENERATION_MODELS.map(
  (m) => new RegExp(`^${m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"),
);

/**
 * Check if a model has restricted output token limit (32768 max)
 * This applies to:
 * - All Gemini 3 models (gemini-3-flash, gemini-3-pro, etc.)
 * - Image generation models (gemini-2.5-flash-image, gemini-3-pro-image-preview)
 */
export function hasRestrictedOutputLimit(modelName: string): boolean {
  if (!isValidModelName(modelName)) {
    return false;
  }

  // Check for Gemini 3 models (anchored regex for consistency)
  if (/^gemini-3/i.test(modelName)) {
    return true;
  }

  if (IMAGE_MODEL_PATTERNS.some((pattern) => pattern.test(modelName))) {
    return true;
  }

  return false;
}

/**
 * Get the max output tokens for a model (32768 for restricted models)
 */
export const RESTRICTED_OUTPUT_TOKEN_LIMIT = 32768;

/**
 * Normalize an Anthropic-API-style Claude model ID to the Vertex publisher
 * format.
 *
 * The Anthropic API dates models with a trailing dash segment
 * ("claude-haiku-4-5-20251001") while Vertex publisher IDs separate the date
 * with "@" ("claude-haiku-4-5@20251001"). Vertex rejects the dash form with a
 * 404 (verified live against us-east5), so the native Vertex+Claude paths
 * normalize before calling @anthropic-ai/vertex-sdk.
 *
 * Pass-through cases: IDs already in "@" form, bare aliases with no date
 * ("claude-sonnet-4-6" — Vertex resolves these itself), and non-Claude models.
 * Legacy v2-suffixed Vertex IDs ("claude-3-5-sonnet-v2@20241022") have no
 * dash-date equivalent, so those legacy dash IDs stay out of scope: they 404
 * today and still 404 after the transform — no regression either way.
 */
export function toVertexAnthropicModelId(modelName: string): string {
  if (!modelName.startsWith("claude-") || modelName.includes("@")) {
    return modelName;
  }
  const dashDate = modelName.match(/^(claude-[a-z0-9-]+)-(\d{8})$/);
  return dashDate ? `${dashDate[1]}@${dashDate[2]}` : modelName;
}
