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

import { DynamicModelProvider } from "../core/dynamicModels.js";
import { logger } from "../utils/logger.js";

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
  deepseek: {
    _default: 64_000,
    "deepseek-chat": 64_000,
    "deepseek-reasoner": 64_000,
  },
  "nvidia-nim": {
    _default: 128_000,
    "meta/llama-3.3-70b-instruct": 128_000,
    "meta/llama-3.1-405b-instruct": 128_000,
    "meta/llama-3.1-70b-instruct": 128_000,
    "meta/llama-3.2-90b-vision-instruct": 128_000,
    "meta/llama-3.2-11b-vision-instruct": 128_000,
    "nvidia/llama-3.3-nemotron-super-49b-v1": 128_000,
    "nvidia/llama-3.1-nemotron-nano-8b-v1": 128_000,
    "nvidia/llama-3.1-nemotron-70b-instruct": 128_000,
    "deepseek-ai/deepseek-r1": 128_000,
    "deepseek-ai/deepseek-r1-distill-llama-70b": 128_000,
    "mistralai/mixtral-8x22b-instruct-v0.1": 65_536,
    "mistralai/mixtral-8x7b-instruct-v0.1": 32_768,
    "microsoft/phi-4": 16_384,
    "google/gemma-3-27b-it": 8_192,
  },
  "lm-studio": {
    _default: 8_192,
  },
  llamacpp: {
    _default: 8_192,
  },
  anthropic: {
    _default: 200_000,
    // Claude 4.6 (Feb 2026) — 1M context window
    "claude-opus-4-6": 1_000_000,
    "claude-sonnet-4-6": 1_000_000,
    // Claude 4.5
    "claude-opus-4-5-20251101": 200_000,
    "claude-sonnet-4-5-20250929": 200_000,
    "claude-haiku-4-5-20251001": 200_000,
    // Claude 4.x
    "claude-opus-4-1-20250805": 200_000,
    "claude-opus-4-20250514": 200_000,
    "claude-sonnet-4-20250514": 200_000,
    // Claude 3.x
    "claude-3-7-sonnet-20250219": 200_000,
    "claude-3-5-sonnet-20241022": 200_000,
    "claude-3-5-haiku-20241022": 200_000,
    "claude-3-opus-20240229": 200_000,
    "claude-3-sonnet-20240229": 200_000,
    "claude-3-haiku-20240307": 200_000,
  },
  openai: {
    _default: 128_000,
    // GPT-5.4 family — 1.05M context
    "gpt-5.4": 1_050_000,
    "gpt-5.4-mini": 400_000,
    "gpt-5.4-nano": 400_000,
    "gpt-5.4-pro": 1_050_000,
    // GPT-5.x family — 400K context
    "gpt-5.3-codex": 400_000,
    "gpt-5.2": 400_000,
    "gpt-5.2-pro": 400_000,
    "gpt-5.2-codex": 400_000,
    "gpt-5.2-chat-latest": 128_000,
    "gpt-5.1": 400_000,
    "gpt-5.1-codex": 400_000,
    "gpt-5.1-codex-max": 400_000,
    "gpt-5.1-codex-mini": 400_000,
    "gpt-5.1-chat-latest": 128_000,
    "gpt-5": 400_000,
    "gpt-5-mini": 400_000,
    "gpt-5-nano": 400_000,
    "gpt-5-pro": 400_000,
    "gpt-5-codex": 400_000,
    "gpt-5-chat-latest": 128_000,
    // GPT Open Source
    "gpt-oss-120b": 128_000,
    "gpt-oss-20b": 128_000,
    // GPT-4.1 family — 1M context
    "gpt-4.1": 1_047_576,
    "gpt-4.1-mini": 1_047_576,
    "gpt-4.1-nano": 1_047_576,
    // GPT-4o
    "gpt-4o": 128_000,
    "gpt-4o-mini": 128_000,
    // O-series reasoning — 200K context
    o1: 200_000,
    "o1-mini": 128_000,
    "o1-pro": 200_000,
    o3: 200_000,
    "o3-mini": 200_000,
    "o3-pro": 200_000,
    "o4-mini": 200_000,
    // Legacy
    "gpt-4-turbo": 128_000,
    "gpt-4": 8_192,
    "gpt-3.5-turbo": 16_385,
  },
  "google-ai": {
    _default: 1_048_576,
    // Gemini 3.1 Series (all require -preview suffix)
    "gemini-3.1-pro-preview": 1_048_576,
    "gemini-3.1-flash-lite-preview": 1_048_576,
    "gemini-3.1-flash-image-preview": 1_048_576,
    "gemini-3.1-pro-preview-customtools": 1_048_576,
    // Gemini 3 Series
    "gemini-3-flash-preview": 1_048_576,
    "gemini-3-pro-image-preview": 65_536,
    /** @deprecated SHUT DOWN March 9, 2026. Migrate to gemini-3.1-pro-preview. */
    "gemini-3-pro-preview": 1_048_576,
    "gemini-2.5-pro": 1_048_576,
    "gemini-2.5-flash": 1_048_576,
    "gemini-2.5-flash-lite": 1_048_576,
    "gemini-2.5-flash-image": 32_768,
    "gemini-2.0-flash": 1_048_576,
    "gemini-1.5-pro": 2_097_152,
    "gemini-1.5-flash": 1_048_576,
  },
  vertex: {
    _default: 1_048_576,
    // Claude on Vertex
    "claude-opus-4-6": 1_000_000,
    "claude-sonnet-4-6": 1_000_000,
    "claude-sonnet-4-5": 200_000,
    "claude-opus-4-5": 200_000,
    "claude-haiku-4-5": 200_000,
    "claude-sonnet-4": 200_000,
    "claude-sonnet-4-20250514": 200_000,
    "claude-opus-4-20250514": 200_000,
    "claude-opus-4": 200_000,
    // Gemini 3.1 on Vertex (all require -preview suffix)
    "gemini-3.1-pro-preview": 1_048_576,
    "gemini-3.1-flash-lite-preview": 1_048_576,
    "gemini-3.1-flash-image-preview": 1_048_576,
    "gemini-3.1-pro-preview-customtools": 1_048_576,
    // Gemini 3 on Vertex
    "gemini-3-flash-preview": 1_048_576,
    "gemini-3-pro-image-preview": 65_536,
    /** @deprecated SHUT DOWN March 9, 2026. Migrate to gemini-3.1-pro-preview. */
    "gemini-3-pro-preview": 1_048_576,
    // Gemini 2.x on Vertex
    "gemini-2.5-pro": 1_048_576,
    "gemini-2.5-flash": 1_048_576,
    "gemini-2.0-flash": 1_048_576,
    "gemini-1.5-pro": 2_097_152,
    "gemini-1.5-flash": 1_048_576,
  },
  bedrock: {
    _default: 200_000,
    // Claude 4.6
    "anthropic.claude-opus-4-6-v1:0": 1_000_000,
    "anthropic.claude-sonnet-4-6": 1_000_000,
    // Claude 4.5
    "anthropic.claude-opus-4-5-20251124-v1:0": 200_000,
    "anthropic.claude-sonnet-4-5-20250929-v1:0": 200_000,
    "anthropic.claude-haiku-4-5-20251001-v1:0": 200_000,
    // Claude legacy
    "anthropic.claude-3-5-sonnet-20241022-v1:0": 200_000,
    "anthropic.claude-3-5-haiku-20241022-v1:0": 200_000,
    "anthropic.claude-3-opus-20240229-v1:0": 200_000,
    "anthropic.claude-3-sonnet-20240229-v1:0": 200_000,
    "anthropic.claude-3-haiku-20240307-v1:0": 200_000,
    // Amazon Nova
    "amazon.nova-pro-v1:0": 300_000,
    "amazon.nova-lite-v1:0": 300_000,
    "amazon.nova-2-lite-v1:0": 1_000_000,
    // Writer
    "writer.palmyra-x5-v1:0": 1_000_000,
    "writer.palmyra-x4-v1:0": 128_000,
    // NVIDIA
    "nvidia.nemotron-nano-3-30b": 256_000,
  },
  azure: {
    _default: 128_000,
    // GPT-5.4
    "gpt-5.4": 1_050_000,
    "gpt-5.4-mini": 400_000,
    "gpt-5.4-nano": 400_000,
    "gpt-5.4-pro": 1_050_000,
    // GPT-5.x
    "gpt-5.2": 400_000,
    "gpt-5.2-pro": 400_000,
    "gpt-5.2-codex": 400_000,
    "gpt-5.1": 400_000,
    "gpt-5": 400_000,
    "gpt-5-mini": 400_000,
    // GPT-4.1
    "gpt-4.1": 1_047_576,
    "gpt-4.1-mini": 1_047_576,
    // GPT-4o
    "gpt-4o": 128_000,
    "gpt-4o-mini": 128_000,
    // O-series
    o3: 200_000,
    "o3-mini": 200_000,
    "o4-mini": 200_000,
    // Legacy
    "gpt-4-turbo": 128_000,
    "gpt-4": 8_192,
  },
  mistral: {
    _default: 128_000,
    "mistral-large-latest": 256_000,
    "mistral-large-2512": 256_000,
    "mistral-medium-latest": 128_000,
    "mistral-small-latest": 128_000,
    "codestral-latest": 256_000,
    "codestral-2508": 256_000,
    "devstral-2512": 256_000,
    "devstral-small-2512": 256_000,
    "magistral-medium-latest": 128_000,
    "mistral-small-2603": 256_000,
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
    // NVIDIA Nemotron 3 Nano (February 2026) — 1M context
    "nvidia-nemotron-3-nano-30b": 1_000_000,
    // Qwen3 VL — 32K context
    "qwen3-vl-8b-instruct": 32_768,
  },
};

/**
 * Map of provider aliases to canonical MODEL_CONTEXT_WINDOWS keys.
 *
 * Callers reach `getContextWindowSize` via the unnormalized form on
 * `options.provider` (e.g. CLI `--provider lmstudio`, alias `llama.cpp`),
 * and `ProviderFactory.normalizeProviderName` runs only at instantiation —
 * its output never reaches budget calculations. Without this normalization
 * those alias forms miss the table and fall back to `DEFAULT_CONTEXT_WINDOW`,
 * understating the budget for LM Studio / llama.cpp / NVIDIA NIM.
 *
 * The keys here are the result of stripping non-alpha characters, so
 * `lm-studio` -> `lmstudio`, `nvidia-nim` -> `nvidianim`, `llama.cpp` -> `llamacpp`.
 */
const PROVIDER_ALIAS_MAP: Record<string, string> = {
  googleaistudio: "google-ai-studio",
  lmstudio: "lm-studio",
  llamacpp: "llamacpp",
  nvidianim: "nvidia-nim",
  nim: "nvidia-nim",
  nvidia: "nvidia-nim",
  deepseek: "deepseek",
};

function normalizeProviderForLookup(provider: string): string {
  const stripped = provider.toLowerCase().replace(/[^a-z]/g, "");
  // On alias miss, return the *stripped* key — not the raw input — so case /
  // separator variants ("OpenAI", "open-ai", "Vertex AI") still find their
  // table entry under the lowercase canonical key instead of falling through
  // to DEFAULT_CONTEXT_WINDOW.
  return PROVIDER_ALIAS_MAP[stripped] ?? stripped;
}

/**
 * Resolve context window size for a provider/model combination.
 *
 * Priority:
 *  0. Dynamic model registry (DynamicModelProvider) — resolves cross-provider
 *     models (e.g. Claude on Vertex) that the static table cannot handle
 *  1. Exact model match under provider in static registry
 *  2. Prefix match under provider in static registry
 *  3. Provider's _default in static registry
 *  4. Global DEFAULT_CONTEXT_WINDOW
 */
export function getContextWindowSize(provider: string, model?: string): number {
  // Step 0: Check dynamic model registry first.
  // This resolves cases where the runtime provider differs from the model's
  // origin (e.g. Claude running via Vertex would hit Vertex's Gemini default
  // in the static table). The dynamic registry knows the actual model metadata.
  if (model) {
    try {
      const dynamicProvider = DynamicModelProvider.getInstance();
      const modelConfig = dynamicProvider.resolveModel(provider, model);
      if (modelConfig?.contextWindow) {
        logger.debug(
          `[ContextWindow] Resolved via dynamic registry: provider=${provider}, model=${model}, contextWindow=${modelConfig.contextWindow}`,
        );
        return modelConfig.contextWindow;
      }
    } catch {
      // Dynamic registry not initialized yet — fall through to static lookup
    }
  }

  // Static fallback chain — normalize aliases first so "lmstudio" / "llama.cpp" /
  // "nvidianim" find their canonical entries instead of falling back to default.
  const canonical = normalizeProviderForLookup(provider);
  const providerWindows =
    MODEL_CONTEXT_WINDOWS[canonical] ?? MODEL_CONTEXT_WINDOWS[provider];
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
 * Returns the *real* token count that will be reserved for output so callers
 * (`getAvailableInputTokens`, `BudgetChecker`, conversation-memory pruning, file
 * summarisation) compute input budget against the actual outgoing maxTokens.
 *
 * @param contextWindow - Total context window size
 * @param maxTokens - Explicit maxTokens from user config (if set)
 * @returns Number of tokens reserved for output (matches what's sent upstream)
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
