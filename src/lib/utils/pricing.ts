import type { TokenUsage } from "../types/analytics.js";

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
  // Anthropic (direct API)
  anthropic: {
    "claude-sonnet-4-5-20250929": {
      input: 3.0 / 1_000_000,
      output: 15.0 / 1_000_000,
      cacheRead: 0.3 / 1_000_000,
      cacheCreation: 3.75 / 1_000_000,
    },
    "claude-opus-4-6": {
      input: 15.0 / 1_000_000,
      output: 75.0 / 1_000_000,
      cacheRead: 1.5 / 1_000_000,
      cacheCreation: 18.75 / 1_000_000,
    },
    "claude-haiku-4-5-20251001": {
      input: 0.8 / 1_000_000,
      output: 4.0 / 1_000_000,
      cacheRead: 0.08 / 1_000_000,
      cacheCreation: 1.0 / 1_000_000,
    },
  },
  // Google Vertex AI (same models, same pricing)
  vertex: {
    "claude-sonnet-4-5@20250929": {
      input: 3.0 / 1_000_000,
      output: 15.0 / 1_000_000,
      cacheRead: 0.3 / 1_000_000,
      cacheCreation: 3.75 / 1_000_000,
    },
    "claude-opus-4-6": {
      input: 15.0 / 1_000_000,
      output: 75.0 / 1_000_000,
      cacheRead: 1.5 / 1_000_000,
      cacheCreation: 18.75 / 1_000_000,
    },
    "claude-haiku-4-5@20251001": {
      input: 0.8 / 1_000_000,
      output: 4.0 / 1_000_000,
      cacheRead: 0.08 / 1_000_000,
      cacheCreation: 1.0 / 1_000_000,
    },
  },
  // OpenAI
  openai: {
    "gpt-4o": { input: 2.5 / 1_000_000, output: 10.0 / 1_000_000 },
    "gpt-4o-mini": { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
    "gpt-4-turbo": { input: 10.0 / 1_000_000, output: 30.0 / 1_000_000 },
    o1: { input: 15.0 / 1_000_000, output: 60.0 / 1_000_000 },
    "o1-mini": { input: 1.1 / 1_000_000, output: 4.4 / 1_000_000 },
  },
  // Google (Gemini)
  google: {
    "gemini-2.0-flash": { input: 0.1 / 1_000_000, output: 0.4 / 1_000_000 },
    "gemini-2.0-pro": { input: 1.25 / 1_000_000, output: 10.0 / 1_000_000 },
    "gemini-1.5-pro": { input: 1.25 / 1_000_000, output: 5.0 / 1_000_000 },
    "gemini-1.5-flash": { input: 0.075 / 1_000_000, output: 0.3 / 1_000_000 },
  },
};

/**
 * Map of normalized provider aliases to canonical PRICING keys.
 * After stripping non-alpha characters, e.g. "google-ai" becomes "googleai".
 */
const PROVIDER_ALIASES: Record<string, string> = {
  googleai: "google",
  googleaistudio: "google",
  anthropic: "anthropic",
  openai: "openai",
  vertex: "vertex",
  google: "google",
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

  const providerPricing = PRICING[normalizedProvider] || PRICING[provider];
  if (!providerPricing) {
    return undefined;
  }

  // Exact match
  if (providerPricing[model]) {
    return providerPricing[model];
  }

  // Longest-prefix match
  const sortedKeys = Object.keys(providerPricing).sort(
    (a, b) => b.length - a.length,
  );
  const key = sortedKeys.find((k) => model.startsWith(k));
  return key ? providerPricing[key] : undefined;
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
 */
export function hasPricing(provider: string, model: string): boolean {
  return findRates(provider, model) !== undefined;
}
