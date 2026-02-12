/**
 * Context Window Registry
 *
 * Accurate per-provider, per-model context window sizes (INPUT token limits).
 * These are distinct from OUTPUT token limits in tokens.ts.
 *
 * Sources:
 * - Anthropic: https://docs.anthropic.com/en/docs/about-claude/models
 * - OpenAI: https://platform.openai.com/docs/models
 * - Google: https://ai.google.dev/gemini-api/docs/models
 * - Others: Provider documentation as of Feb 2026
 */

/** Default context window when provider/model is unknown */
export const DEFAULT_CONTEXT_WINDOW = 128_000;

/** Maximum output reserve when maxTokens not specified */
export const MAX_DEFAULT_OUTPUT_RESERVE = 64_000;

/** Default output reserve ratio (35% of context) */
export const DEFAULT_OUTPUT_RESERVE_RATIO = 0.35;

/**
 * Per-provider, per-model context window sizes.
 * The "_default" key is the fallback for unknown models within a provider.
 */
export const MODEL_CONTEXT_WINDOWS: Record<string, Record<string, number>> = {
  anthropic: {
    _default: 200_000,
    "claude-opus-4-20250514": 200_000,
    "claude-sonnet-4-20250514": 200_000,
    "claude-3-7-sonnet-20250219": 200_000,
    "claude-3-5-sonnet-20241022": 200_000,
    "claude-3-5-haiku-20241022": 200_000,
    "claude-3-opus-20240229": 200_000,
    "claude-3-sonnet-20240229": 200_000,
    "claude-3-haiku-20240307": 200_000,
  },
  openai: {
    _default: 128_000,
    "gpt-4o": 128_000,
    "gpt-4o-mini": 128_000,
    "gpt-4-turbo": 128_000,
    "gpt-4": 8_192,
    "gpt-3.5-turbo": 16_385,
    o1: 200_000,
    "o1-mini": 128_000,
    "o1-pro": 200_000,
    o3: 200_000,
    "o3-mini": 200_000,
    "o4-mini": 200_000,
    "gpt-4.1": 1_047_576,
    "gpt-4.1-mini": 1_047_576,
    "gpt-4.1-nano": 1_047_576,
    "gpt-5": 1_047_576,
  },
  "google-ai": {
    _default: 1_048_576,
    "gemini-2.5-pro": 1_048_576,
    "gemini-2.5-flash": 1_048_576,
    "gemini-2.0-flash": 1_048_576,
    "gemini-1.5-pro": 2_097_152,
    "gemini-1.5-flash": 1_048_576,
    "gemini-3-flash-preview": 1_048_576,
    "gemini-3-pro-preview": 1_048_576,
  },
  vertex: {
    _default: 1_048_576,
    "gemini-2.5-pro": 1_048_576,
    "gemini-2.5-flash": 1_048_576,
    "gemini-2.0-flash": 1_048_576,
    "gemini-1.5-pro": 2_097_152,
    "gemini-1.5-flash": 1_048_576,
  },
  bedrock: {
    _default: 200_000,
    "anthropic.claude-3-5-sonnet-20241022-v2:0": 200_000,
    "anthropic.claude-3-5-haiku-20241022-v1:0": 200_000,
    "anthropic.claude-3-opus-20240229-v1:0": 200_000,
    "anthropic.claude-3-sonnet-20240229-v1:0": 200_000,
    "anthropic.claude-3-haiku-20240307-v1:0": 200_000,
    "amazon.nova-pro-v1:0": 300_000,
    "amazon.nova-lite-v1:0": 300_000,
  },
  azure: {
    _default: 128_000,
    "gpt-4o": 128_000,
    "gpt-4o-mini": 128_000,
    "gpt-4-turbo": 128_000,
    "gpt-4": 8_192,
  },
  mistral: {
    _default: 128_000,
    "mistral-large-latest": 128_000,
    "mistral-medium-latest": 32_000,
    "mistral-small-latest": 128_000,
    "codestral-latest": 256_000,
  },
  ollama: {
    _default: 128_000,
  },
  litellm: {
    _default: 128_000,
  },
  huggingface: {
    _default: 32_000,
  },
  sagemaker: {
    _default: 128_000,
  },
};

/**
 * Resolve context window size for a provider/model combination.
 *
 * Priority:
 *  1. Exact model match under provider
 *  2. Provider's _default
 *  3. Global DEFAULT_CONTEXT_WINDOW
 */
export function getContextWindowSize(provider: string, model?: string): number {
  const providerWindows = MODEL_CONTEXT_WINDOWS[provider];
  if (!providerWindows) {
    return DEFAULT_CONTEXT_WINDOW;
  }
  if (model && providerWindows[model] !== undefined) {
    return providerWindows[model];
  }
  // Try partial match (model name may be a prefix)
  if (model) {
    for (const [key, value] of Object.entries(providerWindows)) {
      if (key !== "_default" && model.startsWith(key)) {
        return value;
      }
    }
  }
  return providerWindows._default ?? DEFAULT_CONTEXT_WINDOW;
}

/**
 * Calculate output token reserve for a given context window.
 *
 * @param contextWindow - Total context window size
 * @param maxTokens - Explicit maxTokens from user config (if set)
 * @returns Number of tokens reserved for output
 */
export function getOutputReserve(
  contextWindow: number,
  maxTokens?: number,
): number {
  if (maxTokens !== undefined && maxTokens > 0) {
    return maxTokens;
  }
  return Math.min(
    MAX_DEFAULT_OUTPUT_RESERVE,
    Math.ceil(contextWindow * DEFAULT_OUTPUT_RESERVE_RATIO),
  );
}

/**
 * Calculate available input tokens for a given provider/model.
 *
 * available = contextWindow - outputReserve
 */
export function getAvailableInputTokens(
  provider: string,
  model?: string,
  maxTokens?: number,
): number {
  const contextWindow = getContextWindowSize(provider, model);
  const outputReserve = getOutputReserve(contextWindow, maxTokens);
  return contextWindow - outputReserve;
}
