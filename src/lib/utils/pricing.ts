import type { TokenUsage } from "../types/index.js";

/**
 * Per-token pricing data (USD per token). Updated Feb 2026.
 * Sources:
 * - Anthropic: https://www.anthropic.com/pricing
 * - OpenAI: https://openai.com/api/pricing
 * - Google: https://ai.google.dev/pricing
 *
 * Note: Not all supported providers have pricing data. Missing providers
 * (Bedrock, Azure, Mistral, etc.) will return 0 from calculateCost().
 */
const PRICING: Record<
  string,
  Record<
    string,
    {
      input: number;
      output: number;
      cacheRead?: number;
      cacheCreation?: number;
    }
  >
> = {
  // Anthropic (direct API) — updated March 2026
  anthropic: {
    // Claude 4.6 family
    "claude-opus-4-6": {
      input: 5.0 / 1_000_000,
      output: 25.0 / 1_000_000,
      cacheRead: 0.5 / 1_000_000,
      cacheCreation: 6.25 / 1_000_000,
    },
    "claude-sonnet-4-6": {
      input: 3.0 / 1_000_000,
      output: 15.0 / 1_000_000,
      cacheRead: 0.3 / 1_000_000,
      cacheCreation: 3.75 / 1_000_000,
    },
    // Claude 4.5 family
    "claude-sonnet-4-5-20250929": {
      input: 3.0 / 1_000_000,
      output: 15.0 / 1_000_000,
      cacheRead: 0.3 / 1_000_000,
      cacheCreation: 3.75 / 1_000_000,
    },
    "claude-opus-4-5": {
      input: 5.0 / 1_000_000,
      output: 25.0 / 1_000_000,
      cacheRead: 0.5 / 1_000_000,
      cacheCreation: 6.25 / 1_000_000,
    },
    "claude-haiku-4-5-20251001": {
      input: 1.0 / 1_000_000,
      output: 5.0 / 1_000_000,
      cacheRead: 0.1 / 1_000_000,
      cacheCreation: 1.25 / 1_000_000,
    },
    // Claude 4.0/4.1 family
    "claude-opus-4-1": {
      input: 15.0 / 1_000_000,
      output: 75.0 / 1_000_000,
      cacheRead: 1.5 / 1_000_000,
      cacheCreation: 18.75 / 1_000_000,
    },
    "claude-opus-4": {
      input: 15.0 / 1_000_000,
      output: 75.0 / 1_000_000,
      cacheRead: 1.5 / 1_000_000,
      cacheCreation: 18.75 / 1_000_000,
    },
    "claude-sonnet-4": {
      input: 3.0 / 1_000_000,
      output: 15.0 / 1_000_000,
      cacheRead: 0.3 / 1_000_000,
      cacheCreation: 3.75 / 1_000_000,
    },
    // Claude 3.x family
    "claude-3-7-sonnet": {
      input: 3.0 / 1_000_000,
      output: 15.0 / 1_000_000,
      cacheRead: 0.3 / 1_000_000,
      cacheCreation: 3.75 / 1_000_000,
    },
    "claude-3-5-sonnet": {
      input: 3.0 / 1_000_000,
      output: 15.0 / 1_000_000,
      cacheRead: 0.3 / 1_000_000,
      cacheCreation: 3.75 / 1_000_000,
    },
    "claude-3-5-haiku": {
      input: 0.8 / 1_000_000,
      output: 4.0 / 1_000_000,
      cacheRead: 0.08 / 1_000_000,
      cacheCreation: 1.0 / 1_000_000,
    },
    "claude-3-opus": {
      input: 15.0 / 1_000_000,
      output: 75.0 / 1_000_000,
      cacheRead: 1.5 / 1_000_000,
      cacheCreation: 18.75 / 1_000_000,
    },
    "claude-3-sonnet": { input: 3.0 / 1_000_000, output: 15.0 / 1_000_000 },
    "claude-3-haiku": { input: 0.25 / 1_000_000, output: 1.25 / 1_000_000 },
  },
  // Google Vertex AI — Claude models on Vertex (same pricing, @ date suffix)
  vertex: {
    "claude-sonnet-4-6": {
      input: 3.0 / 1_000_000,
      output: 15.0 / 1_000_000,
      cacheRead: 0.3 / 1_000_000,
      cacheCreation: 3.75 / 1_000_000,
    },
    "claude-opus-4-6": {
      input: 5.0 / 1_000_000,
      output: 25.0 / 1_000_000,
      cacheRead: 0.5 / 1_000_000,
      cacheCreation: 6.25 / 1_000_000,
    },
    "claude-sonnet-4-5": {
      input: 3.0 / 1_000_000,
      output: 15.0 / 1_000_000,
      cacheRead: 0.3 / 1_000_000,
      cacheCreation: 3.75 / 1_000_000,
    },
    "claude-opus-4-5": {
      input: 5.0 / 1_000_000,
      output: 25.0 / 1_000_000,
      cacheRead: 0.5 / 1_000_000,
      cacheCreation: 6.25 / 1_000_000,
    },
    "claude-haiku-4-5": {
      input: 1.0 / 1_000_000,
      output: 5.0 / 1_000_000,
      cacheRead: 0.1 / 1_000_000,
      cacheCreation: 1.25 / 1_000_000,
    },
    "claude-3-5-haiku": {
      input: 0.8 / 1_000_000,
      output: 4.0 / 1_000_000,
      cacheRead: 0.08 / 1_000_000,
      cacheCreation: 1.0 / 1_000_000,
    },
    "claude-3-5-sonnet": {
      input: 3.0 / 1_000_000,
      output: 15.0 / 1_000_000,
      cacheRead: 0.3 / 1_000_000,
      cacheCreation: 3.75 / 1_000_000,
    },
  },
  // OpenAI — updated March 2026
  openai: {
    // GPT-5.x family
    "gpt-5.4": { input: 2.5 / 1_000_000, output: 15.0 / 1_000_000 },
    "gpt-5.2": { input: 1.75 / 1_000_000, output: 14.0 / 1_000_000 },
    "gpt-5.1": { input: 0.625 / 1_000_000, output: 5.0 / 1_000_000 },
    "gpt-5.1-codex": { input: 1.25 / 1_000_000, output: 10.0 / 1_000_000 },
    "gpt-5": { input: 1.25 / 1_000_000, output: 10.0 / 1_000_000 },
    "gpt-5-mini": { input: 0.25 / 1_000_000, output: 2.0 / 1_000_000 },
    "gpt-5-nano": { input: 0.05 / 1_000_000, output: 0.4 / 1_000_000 },
    // GPT-4.1 family
    "gpt-4.1": { input: 2.0 / 1_000_000, output: 8.0 / 1_000_000 },
    "gpt-4.1-mini": { input: 0.4 / 1_000_000, output: 1.6 / 1_000_000 },
    "gpt-4.1-nano": { input: 0.1 / 1_000_000, output: 0.4 / 1_000_000 },
    // GPT-4o family
    "gpt-4o": { input: 2.5 / 1_000_000, output: 10.0 / 1_000_000 },
    "gpt-4o-mini": { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
    // o-series reasoning
    o3: { input: 2.0 / 1_000_000, output: 8.0 / 1_000_000 },
    "o3-mini": { input: 1.1 / 1_000_000, output: 4.4 / 1_000_000 },
    "o4-mini": { input: 1.1 / 1_000_000, output: 4.4 / 1_000_000 },
    o1: { input: 15.0 / 1_000_000, output: 60.0 / 1_000_000 },
    "o1-mini": { input: 0.55 / 1_000_000, output: 2.2 / 1_000_000 },
    // Legacy
    "gpt-4-turbo": { input: 10.0 / 1_000_000, output: 30.0 / 1_000_000 },
    "gpt-4": { input: 30.0 / 1_000_000, output: 60.0 / 1_000_000 },
    "gpt-3.5-turbo": { input: 0.5 / 1_000_000, output: 1.0 / 1_000_000 },
  },
  // Google (Gemini) — updated March 2026
  google: {
    // Gemini 3.1 family (all require -preview suffix)
    "gemini-3.1-pro-preview": {
      input: 2.0 / 1_000_000,
      output: 12.0 / 1_000_000,
    },
    "gemini-3.1-flash-lite-preview": {
      input: 0.25 / 1_000_000,
      output: 1.5 / 1_000_000,
    },
    "gemini-3.1-flash-image-preview": {
      input: 0.5 / 1_000_000,
      output: 3.0 / 1_000_000,
    },
    "gemini-3.1-pro-preview-customtools": {
      input: 2.0 / 1_000_000,
      output: 12.0 / 1_000_000,
    },
    // Gemini 3 family
    "gemini-3-flash-preview": {
      input: 0.5 / 1_000_000,
      output: 3.0 / 1_000_000,
    },
    "gemini-3-pro-image-preview": {
      input: 2.0 / 1_000_000,
      output: 12.0 / 1_000_000,
    },
    /** @deprecated SHUT DOWN March 9, 2026. Migrate to gemini-3.1-pro-preview. */
    "gemini-3-pro-preview": {
      input: 2.0 / 1_000_000,
      output: 12.0 / 1_000_000,
    },
    // Gemini 2.5 family
    "gemini-2.5-flash": { input: 0.3 / 1_000_000, output: 2.5 / 1_000_000 },
    "gemini-2.5-pro": { input: 1.25 / 1_000_000, output: 10.0 / 1_000_000 },
    "gemini-2.5-flash-lite": {
      input: 0.1 / 1_000_000,
      output: 0.4 / 1_000_000,
    },
    // Gemini 2.0 family (deprecated June 2026)
    "gemini-2.0-flash": { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
    "gemini-2.0-flash-lite": {
      input: 0.075 / 1_000_000,
      output: 0.3 / 1_000_000,
    },
    // Gemini 1.5 family
    "gemini-1.5-pro": { input: 1.25 / 1_000_000, output: 5.0 / 1_000_000 },
    "gemini-1.5-flash": { input: 0.075 / 1_000_000, output: 0.3 / 1_000_000 },
  },
  // Mistral AI
  mistral: {
    "mistral-large": { input: 2.0 / 1_000_000, output: 6.0 / 1_000_000 },
    "mistral-medium": { input: 2.7 / 1_000_000, output: 8.1 / 1_000_000 },
    "mistral-small": { input: 0.2 / 1_000_000, output: 0.6 / 1_000_000 },
    codestral: { input: 0.3 / 1_000_000, output: 0.9 / 1_000_000 },
    "open-mistral-nemo": {
      input: 0.15 / 1_000_000,
      output: 0.15 / 1_000_000,
    },
  },
  deepseek: {
    "deepseek-chat": {
      input: 0.27 / 1_000_000,
      output: 1.1 / 1_000_000,
      cacheRead: 0.07 / 1_000_000,
    },
    "deepseek-reasoner": {
      input: 0.55 / 1_000_000,
      output: 2.19 / 1_000_000,
      cacheRead: 0.14 / 1_000_000,
    },
  },
  "nvidia-nim": {
    "meta/llama-3.3-70b-instruct": {
      input: 0.4 / 1_000_000,
      output: 0.4 / 1_000_000,
    },
    "meta/llama-3.1-405b-instruct": {
      input: 1.79 / 1_000_000,
      output: 1.79 / 1_000_000,
    },
    "meta/llama-3.1-70b-instruct": {
      input: 0.4 / 1_000_000,
      output: 0.4 / 1_000_000,
    },
    "meta/llama-3.2-90b-vision-instruct": {
      input: 0.5 / 1_000_000,
      output: 0.5 / 1_000_000,
    },
    "nvidia/llama-3.3-nemotron-super-49b-v1": {
      input: 0.3 / 1_000_000,
      output: 0.3 / 1_000_000,
    },
    "deepseek-ai/deepseek-r1": {
      input: 0.55 / 1_000_000,
      output: 2.19 / 1_000_000,
    },
    "mistralai/mixtral-8x22b-instruct-v0.1": {
      input: 0.6 / 1_000_000,
      output: 0.6 / 1_000_000,
    },
    "mistralai/mixtral-8x7b-instruct-v0.1": {
      input: 0.24 / 1_000_000,
      output: 0.24 / 1_000_000,
    },
    "microsoft/phi-4": { input: 0.07 / 1_000_000, output: 0.07 / 1_000_000 },
    "google/gemma-3-27b-it": {
      input: 0.07 / 1_000_000,
      output: 0.07 / 1_000_000,
    },
  },
  "lm-studio": {
    // Local inference — there is no upstream USD price. Reporting a fabricated
    // symbolic rate here misstated spend in analytics/spans, so the rate is
    // explicitly zero. `calculateCost()` returns 0 for zero rates and the CLI
    // / span renderers already treat 0 as "no billable cost" (no $ shown).
    _default: { input: 0, output: 0 },
  },
  llamacpp: {
    _default: { input: 0, output: 0 },
  },
};

/**
 * Map of normalized provider aliases to canonical PRICING keys.
 * After stripping non-alpha characters, e.g. "google-ai" becomes "googleai".
 */
const PROVIDER_ALIASES: Record<string, string> = {
  googleai: "google",
  googleaistudio: "google",
  googlevertex: "vertex",
  anthropic: "anthropic",
  openai: "openai",
  vertex: "vertex",
  google: "google",
  mistral: "mistral",
  mistralai: "mistral",
  azure: "openai",
  azureopenai: "openai",
  bedrock: "anthropic",
  amazonbedrock: "anthropic",
  litellm: "__cross_provider__",
  openrouter: "__cross_provider__",
  openaicompatible: "__cross_provider__",
  deepseek: "deepseek",
  nvidianim: "nvidia-nim",
  nim: "nvidia-nim",
  nvidia: "nvidia-nim",
  lmstudio: "lm-studio",
  llamacpp: "llamacpp",
};

/**
 * Look up per-token rates for a provider/model combination.
 * Normalises the provider name via aliases, then tries an exact model match
 * followed by a longest-prefix match so that e.g. "gpt-4o-2024-08-06"
 * resolves to the "gpt-4o" entry without a false hit on "gpt-4".
 *
 * @returns The rate entry, or undefined when the combination is unknown.
 */
function findRates(
  provider: string,
  model: string,
):
  | {
      input: number;
      output: number;
      cacheRead?: number;
      cacheCreation?: number;
    }
  | undefined {
  const stripped = provider.toLowerCase().replace(/[^a-z]/g, "");
  const normalizedProvider = PROVIDER_ALIASES[stripped] ?? stripped;

  // Proxy providers (LiteLLM, OpenRouter): search all known providers for a model match
  if (normalizedProvider === "__cross_provider__") {
    for (const providerPricing of Object.values(PRICING)) {
      // Exact match
      if (providerPricing[model]) {
        return providerPricing[model];
      }
      const sortedKeys = Object.keys(providerPricing).sort(
        (a, b) => b.length - a.length,
      );
      // model is a prefix of a known key (e.g. "claude-sonnet-4-5" matches "claude-sonnet-4-5-20250929")
      const reverseKey = sortedKeys.find((k) => k.startsWith(model));
      if (reverseKey) {
        return providerPricing[reverseKey];
      }
      // Known key is a prefix of model (e.g. "gpt-4o" matches "gpt-4o-2024-08-06")
      const forwardKey = sortedKeys.find((k) => model.startsWith(k));
      if (forwardKey) {
        return providerPricing[forwardKey];
      }
    }
    return undefined;
  }

  const providerPricing = PRICING[normalizedProvider] || PRICING[provider];
  if (!providerPricing) {
    return undefined;
  }

  // Exact match
  if (providerPricing[model]) {
    return providerPricing[model];
  }

  // Longest-prefix match (skip the synthetic "_default" sentinel below)
  const sortedKeys = Object.keys(providerPricing)
    .filter((k) => k !== "_default")
    .sort((a, b) => b.length - a.length);
  const key = sortedKeys.find((k) => model.startsWith(k));
  if (key) {
    return providerPricing[key];
  }

  // Fallback: Vertex hosts both Claude and Gemini models.
  // If no match found under "vertex", try "google" pricing for Gemini models.
  // (Run BEFORE the provider-level _default fallback so that Vertex Gemini
  // requests get the more specific Google rates rather than a generic Vertex
  // _default if one is ever added.)
  if (normalizedProvider === "vertex" && model.startsWith("gemini")) {
    const googlePricing = PRICING["google"];
    if (googlePricing) {
      if (googlePricing[model]) {
        return googlePricing[model];
      }
      const googleKeys = Object.keys(googlePricing).sort(
        (a, b) => b.length - a.length,
      );
      const googleKey = googleKeys.find((k) => model.startsWith(k));
      if (googleKey) {
        return googlePricing[googleKey];
      }
    }
  }

  // Provider-level fallback: when a pricing table only has _default (or has
  // no entry matching the specific model), use _default. This is mainly for
  // local/symbolic providers (lm-studio, llamacpp) that don't enumerate per-
  // model pricing.
  if (providerPricing["_default"]) {
    return providerPricing["_default"];
  }

  return undefined;
}

/**
 * Calculate the dollar cost of a generate/stream call based on token usage.
 * Returns 0 if the provider/model combination is not in the pricing table.
 */
export function calculateCost(
  provider: string,
  model: string,
  usage: TokenUsage,
): number {
  const rates = findRates(provider, model);
  if (!rates) {
    return 0;
  }

  let cost = 0;
  cost += (usage.input || 0) * rates.input;
  cost += (usage.output || 0) * rates.output;
  if (usage.cacheReadTokens && rates.cacheRead) {
    cost += usage.cacheReadTokens * rates.cacheRead;
  }
  if (usage.cacheCreationTokens && rates.cacheCreation) {
    cost += usage.cacheCreationTokens * rates.cacheCreation;
  }

  return Math.round(cost * 1_000_000) / 1_000_000; // Round to 6 decimal places
}

/**
 * Check if pricing is available for a provider/model combination.
 * Checks the rate table directly instead of computing a cost,
 * so even very cheap models (e.g. gemini-1.5-flash) are detected correctly.
 *
 * Zero-rate entries (the local-provider `_default` for lm-studio / llamacpp)
 * count as "no pricing" — those providers explicitly don't have an upstream
 * USD price, and any caller gated by `hasPricing()` should treat them as
 * non-billable rather than zero-cost-billable.
 */
export function hasPricing(provider: string, model: string): boolean {
  const rates = findRates(provider, model);
  if (!rates) {
    return false;
  }
  return (
    rates.input > 0 ||
    rates.output > 0 ||
    (rates.cacheRead ?? 0) > 0 ||
    (rates.cacheCreation ?? 0) > 0
  );
}
