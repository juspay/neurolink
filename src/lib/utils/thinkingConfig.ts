/**
 * ThinkingConfig utility functions for constructing thinking configuration objects.
 *
 * This module provides helper functions to create thinkingConfig objects consistently
 * across the codebase, reducing duplication in CLI and providers.
 */

/**
 * ThinkingLevel type for Gemini 3 models
 */
export type ThinkingLevel = "minimal" | "low" | "medium" | "high";

/**
 * ThinkingConfig interface matching the SDK's expected structure
 */
export type ThinkingConfig = {
  enabled?: boolean;
  type?: "enabled" | "disabled";
  /** Token budget for thinking (Anthropic models: 5000-100000) */
  budgetTokens?: number;
  /** Thinking level for Gemini 3 models */
  thinkingLevel?: ThinkingLevel;
};

/**
 * Options for creating a thinkingConfig from CLI-style options
 */
export type CreateThinkingConfigOptions = {
  /** Enable thinking mode */
  thinking?: boolean;
  /** Token budget for thinking (defaults to 10000) */
  thinkingBudget?: number;
  /** Thinking level for Gemini 3 models */
  thinkingLevel?: ThinkingLevel;
};

/**
 * Native SDK thinkingConfig structure for Gemini native SDK.
 */
export type NativeThinkingConfig = {
  includeThoughts: boolean;
  thinkingLevel: ThinkingLevel;
};

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

/**
 * Creates thinkingConfig for native Gemini SDK (not AI SDK).
 *
 * This is used for direct calls to the Gemini SDK where the config
 * structure is different from the AI SDK providerOptions.
 *
 * @param config - The thinkingConfig from options
 * @returns NativeThinkingConfig object or undefined
 *
 * @example
 * ```typescript
 * const nativeConfig = createNativeThinkingConfig(options.thinkingConfig);
 * if (nativeConfig) {
 *   sdkConfig.thinkingConfig = nativeConfig;
 * }
 * ```
 */
export function createNativeThinkingConfig(
  config: ThinkingConfig | undefined,
): NativeThinkingConfig | undefined {
  if (!config?.enabled && !config?.thinkingLevel) {
    return undefined;
  }

  return {
    includeThoughts: true,
    thinkingLevel: config.thinkingLevel ?? DEFAULT_THINKING_LEVEL,
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
