/**
 * Analytics cost helpers.
 *
 * Prefer costs already computed by the telemetry/pricing pipeline
 * (`utils/pricing.calculateCost` / span `ai.cost.total`). This module
 * is a thin compatibility wrapper — it does not maintain a second
 * hardcoded pricing table.
 */

import { calculateCost } from "../utils/pricing.js";

/**
 * Calculate cost from token counts using the canonical SDK pricing table.
 * Returns 0 when the provider/model combination is unknown.
 *
 * Partial model-name matching uses longest-prefix preference inside
 * `calculateCost` / `findRates` — shorter keys (e.g. `gpt-4o`) never
 * win over more specific ones (e.g. `gpt-4o-mini`).
 *
 * @param model - Model name
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @param provider - Provider name (improves rate lookup; defaults to
 *   cross-provider search via openrouter alias)
 * @returns Total cost in USD
 */
export function calculateAdvancedCost(
  model: string | undefined,
  inputTokens: number,
  outputTokens: number,
  provider?: string,
  cacheTokens?: { cacheReadTokens?: number; cacheCreationTokens?: number },
): number {
  if (!model) {
    return 0;
  }

  // When provider is unknown, use the openrouter/litellm cross-provider
  // search path in findRates (PROVIDER_ALIASES → __cross_provider__).
  const resolvedProvider =
    provider && provider.length > 0 ? provider : "openrouter";

  const cacheReadTokens = cacheTokens?.cacheReadTokens ?? 0;
  const cacheCreationTokens = cacheTokens?.cacheCreationTokens ?? 0;
  return calculateCost(resolvedProvider, model, {
    input: inputTokens,
    output: outputTokens,
    total: inputTokens + cacheReadTokens + cacheCreationTokens + outputTokens,
    ...(cacheReadTokens > 0 ? { cacheReadTokens } : {}),
    ...(cacheCreationTokens > 0 ? { cacheCreationTokens } : {}),
  });
}
