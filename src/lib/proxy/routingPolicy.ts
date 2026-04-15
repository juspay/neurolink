import type {
  ClaudeProxyModelTier,
  FallbackEntry,
  ParsedClaudeRequest,
  ProxyTranslationAttempt,
  ProxyTranslationPlan,
} from "../types/index.js";

export function inferClaudeProxyModelTier(
  modelName: string,
): ClaudeProxyModelTier {
  const normalized = modelName.toLowerCase();
  if (normalized.includes("opus")) {
    return "opus";
  }
  if (normalized.includes("sonnet")) {
    return "sonnet";
  }
  if (normalized.includes("haiku")) {
    return "haiku";
  }
  return "other";
}

/**
 * Build a translation plan for a Claude-compatible proxy request.
 * The plan lists the primary provider followed by eligible fallback targets.
 * All configured fallback entries are always eligible — no contract-based gating.
 * When no fallback chain is configured, an "auto-provider" entry is appended.
 */
export function buildProxyTranslationPlan(
  primary: { provider: string; model?: string },
  fallbackChain: FallbackEntry[],
  requestedModel: string,
  _parsed: ParsedClaudeRequest,
): ProxyTranslationPlan {
  const attempts: ProxyTranslationAttempt[] = [
    {
      provider: primary.provider,
      model: primary.model,
      label: `${primary.provider}/${primary.model ?? "unknown"}`,
    },
  ];

  for (const fallback of fallbackChain) {
    if (
      fallback.provider === primary.provider &&
      fallback.model === primary.model
    ) {
      continue;
    }

    attempts.push({
      provider: fallback.provider,
      model: fallback.model,
      label: `${fallback.provider}/${fallback.model}`,
    });
  }

  // Append auto-provider when no configured fallback chain exists,
  // or when all configured entries were deduped (same as primary).
  if (fallbackChain.length === 0 || attempts.length === 1) {
    attempts.push({ label: "auto-provider" });
  }

  return {
    requestedModel,
    modelTier: inferClaudeProxyModelTier(requestedModel),
    attempts,
    skipped: [],
  };
}

// ---------------------------------------------------------------------------
// Retry-after parsing helper
// ---------------------------------------------------------------------------

/**
 * Parse the retry-after header from an upstream 429 response.
 * Returns milliseconds to wait, or 0 if no valid header present.
 */
export function parseRetryAfterMs(retryAfterHeader: string | null): number {
  if (!retryAfterHeader) {
    return 0;
  }
  const seconds = parseInt(retryAfterHeader, 10);
  if (!Number.isNaN(seconds)) {
    return Math.max(1, seconds) * 1000;
  }
  const date = new Date(retryAfterHeader);
  if (!Number.isNaN(date.getTime())) {
    return Math.max(1000, date.getTime() - Date.now());
  }
  return 0;
}
