/**
 * Model detection utilities for capability checking
 */

import { IMAGE_GENERATION_MODELS } from "../core/constants.js";
import {
  firstModelRule,
  inModelFamily,
} from "../providers/rules/modelFamilies.js";
import { getProviderRules } from "../providers/rules/registry.js";

const GEMINI_REASONING = getProviderRules("gemini").reasoning;
const FAMILY_LABELS = getProviderRules("model-families").modelFamilyLabels;

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
  return inModelFamily("gemini3", modelName);
}

export function isGemini25Model(modelName: string): boolean {
  if (!isValidModelName(modelName)) {
    return false;
  }
  return inModelFamily("gemini25", modelName);
}

export function supportsThinkingConfig(modelName: string): boolean {
  if (!isValidModelName(modelName)) {
    return false;
  }
  return inModelFamily("thinkingConfig", modelName);
}

export function supportsPromptCaching(modelName: string): boolean {
  if (!isValidModelName(modelName)) {
    return false;
  }
  return inModelFamily("promptCaching", modelName);
}

export function getMaxThinkingBudgetTokens(modelName: string): number {
  const budgets = GEMINI_REASONING?.maxBudgetTokens;
  if (!budgets) {
    throw new Error("gemini.json has no reasoning.maxBudgetTokens");
  }
  if (!isValidModelName(modelName)) {
    return budgets.default;
  }
  return firstModelRule(budgets.rules, modelName)?.value ?? budgets.default;
}

// Per-model `thinkingBudget` bounds for the Gemini 2.5 family, confirmed
// against live Vertex responses (gemini.json `reasoning.budgetRanges`; the
// reasons are in `reasoningNotes`). Vertex rejects a budget outside them with
// INVALID_ARGUMENT "thinking_budget is out of range".

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
  const ranges = GEMINI_REASONING?.budgetRanges;
  if (!ranges) {
    throw new Error("gemini.json has no reasoning.budgetRanges");
  }
  const rule = firstModelRule(ranges.rules, modelName);
  return rule ? { min: rule.min, max: rule.max } : ranges.fallback;
}

export function getModelFamily(modelName: string): string {
  if (!FAMILY_LABELS) {
    throw new Error("model-families.json has no modelFamilyLabels");
  }
  if (!isValidModelName(modelName)) {
    return FAMILY_LABELS.default;
  }
  return (
    firstModelRule(FAMILY_LABELS.rules, modelName)?.label ??
    FAMILY_LABELS.default
  );
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

  if (inModelFamily("restrictedOutput", modelName)) {
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
export const RESTRICTED_OUTPUT_TOKEN_LIMIT =
  GEMINI_REASONING?.restrictedOutputTokenLimit ?? 32768;

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
