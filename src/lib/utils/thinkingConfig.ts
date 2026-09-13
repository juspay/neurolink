/**
 * ThinkingConfig utility functions for constructing thinking configuration objects.
 *
 * This module provides helper functions to create thinkingConfig objects consistently
 * across the codebase, reducing duplication in CLI and providers.
 */

import type {
  ThinkingLevel,
  ThinkingConfig,
  CreateThinkingConfigOptions,
  NativeThinkingConfig,
} from "../types/index.js";
import {
  getGemini25ThinkingBudgetRange,
  isGemini3Model,
} from "./modelDetection.js";
import { logger } from "./logger.js";

/**
 * Default token budget for thinking operations
 */
export const DEFAULT_THINKING_BUDGET_TOKENS = 10000;

/**
 * Default thinking level for Gemini 3 models
 */
export const DEFAULT_THINKING_LEVEL: ThinkingLevel = "high";

/**
 * Creates a thinkingConfig object from CLI-style options.
 *
 * This helper consolidates the pattern used in CLI command handlers
 * to convert simple CLI flags into the full thinkingConfig structure.
 *
 * @param options - CLI-style options with thinking, thinkingBudget, thinkingLevel
 * @returns ThinkingConfig object or undefined if thinking is not enabled
 *
 * @example
 * ```typescript
 * // From CLI options
 * const config = createThinkingConfig({
 *   thinking: true,
 *   thinkingBudget: 15000,
 *   thinkingLevel: "high"
 * });
 * // Returns: { enabled: true, budgetTokens: 15000, thinkingLevel: "high" }
 * ```
 */
export function createThinkingConfig(
  options: CreateThinkingConfigOptions,
): ThinkingConfig | undefined {
  // Only create config if thinking is explicitly enabled or thinkingLevel is set
  if (!options.thinking && !options.thinkingLevel) {
    return undefined;
  }

  return {
    enabled: true,
    budgetTokens: options.thinkingBudget ?? DEFAULT_THINKING_BUDGET_TOKENS,
    thinkingLevel: options.thinkingLevel,
  };
}

/**
 * Creates a thinkingConfig from record-style options (useful for CLI handlers).
 *
 * This handles the type casting that's commonly needed when working with
 * CLI argument records.
 *
 * @param options - Record-style options from CLI argv
 * @returns ThinkingConfig object or undefined if thinking is not enabled
 *
 * @example
 * ```typescript
 * const config = createThinkingConfigFromRecord(argv as Record<string, unknown>);
 * ```
 */
export function createThinkingConfigFromRecord(
  options: Record<string, unknown>,
): ThinkingConfig | undefined {
  const thinking = options.thinking as boolean | undefined;
  const thinkingLevel = options.thinkingLevel as ThinkingLevel | undefined;
  const thinkingBudget = options.thinkingBudget as number | undefined;

  return createThinkingConfig({
    thinking,
    thinkingLevel,
    thinkingBudget,
  });
}

// Where a ThinkingLevel falls within a model's verified thinkingBudget
// range. This is a design choice (Vertex has no notion of "levels" for
// Gemini 2.5 — only a numeric budget), not a vendor-specified mapping:
// "minimal"/"high" pin the floor/ceiling of the model's own verified range,
// "low"/"medium" split the middle so all four levels stay distinguishable.
const THINKING_LEVEL_FRACTIONS: Record<ThinkingLevel, number> = {
  minimal: 0,
  low: 0.25,
  medium: 0.55,
  high: 1,
};

/**
 * Maps a qualitative ThinkingLevel onto a numeric thinkingBudget within a
 * model's verified [min, max] range (see `getGemini25ThinkingBudgetRange`).
 * Exported for deterministic testing of the level->budget mapping.
 */
export function mapThinkingLevelToBudget(
  level: ThinkingLevel,
  range: { min: number; max: number },
): number {
  const fraction = THINKING_LEVEL_FRACTIONS[level];
  return Math.round(range.min + fraction * (range.max - range.min));
}

// Models for which the "no verified budget range" WARN in
// createNativeThinkingConfig has already fired. Keyed by model name so a
// long-running process (or an agentic loop re-generating against the same
// model) logs the silent-drop once per model instead of once per call.
const warnedNoBudgetRangeModels = new Set<string>();

/**
 * Creates thinkingConfig for native Gemini SDK (not AI SDK).
 *
 * This is used for direct calls to the Gemini SDK where the config
 * structure is different from the AI SDK providerOptions.
 *
 * @param config - The thinkingConfig from options
 * @param modelName - Resolved model id, used to pick the right wire shape.
 *   Gemini 3 accepts `thinkingLevel` directly. Gemini 2.5 rejects that field
 *   with HTTP 400 INVALID_ARGUMENT "thinking_level not supported by this
 *   model" (verified live against Vertex for gemini-2.5-pro, -flash and
 *   -flash-lite) and needs a numeric `thinkingBudget` instead — so when
 *   `modelName` identifies a Gemini 2.5 model, the requested level is
 *   translated into a budget via `mapThinkingLevelToBudget` and
 *   `thinkingLevel` is omitted from the result entirely. Omitting
 *   `modelName` (or passing a Gemini 3 / unrecognized model) preserves the
 *   original behavior of forwarding `thinkingLevel` as-is.
 * @returns NativeThinkingConfig object or undefined
 *
 * @example
 * ```typescript
 * const nativeConfig = createNativeThinkingConfig(options.thinkingConfig, modelName);
 * if (nativeConfig) {
 *   sdkConfig.thinkingConfig = nativeConfig;
 * }
 * ```
 */
export function createNativeThinkingConfig(
  config: ThinkingConfig | undefined,
  modelName?: string,
): NativeThinkingConfig | undefined {
  if (!config?.enabled && !config?.thinkingLevel) {
    return undefined;
  }

  const level = config.thinkingLevel ?? DEFAULT_THINKING_LEVEL;

  if (modelName && !isGemini3Model(modelName)) {
    const budgetRange = getGemini25ThinkingBudgetRange(modelName);
    if (budgetRange) {
      return {
        includeThoughts: true,
        thinkingBudget: mapThinkingLevelToBudget(level, budgetRange),
      };
    }
    // Not a Gemini 3 model and not a Gemini 2.5 model we have a verified
    // budget range for: no evidence this model accepts either parameter, so
    // omit thinkingConfig rather than guess a shape that might itself 400.
    // The caller opted into thinking and gets none of it here, so surface it
    // once per model instead of leaving it indistinguishable from "thinking
    // is off".
    if (!warnedNoBudgetRangeModels.has(modelName)) {
      warnedNoBudgetRangeModels.add(modelName);
      logger.warn(
        `[thinkingConfig] "${modelName}" has no verified Gemini thinkingBudget range; ` +
          "omitting thinkingConfig — requested thinkingLevel is silently disabled.",
      );
    }
    return undefined;
  }

  return {
    includeThoughts: true,
    thinkingLevel: level,
  };
}

/**
 * Checks if thinkingConfig should be applied based on options.
 *
 * @param config - The thinkingConfig from options
 * @returns true if thinking should be enabled
 */
export function shouldEnableThinking(
  config: ThinkingConfig | undefined,
): boolean {
  return Boolean(config?.enabled || config?.thinkingLevel);
}
