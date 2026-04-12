import type {
  ClaudeProxyModelTier,
  CooldownSkippedAccount,
  FallbackEntry,
  ParsedClaudeRequest,
  ProxyTranslationAttempt,
  ProxyTranslationPlan,
  RuntimeAccountState,
} from "../types/index.js";

export type {
  ClaudeProxyModelTier,
  ProxyTranslationAttempt,
  ProxyTranslationPlan,
};

const DEFAULT_COOLDOWN_FLOOR_MS = 1_000;

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
// Simple per-account cooldown
// ---------------------------------------------------------------------------

/**
 * Check whether an account is currently cooling down.
 * Returns the cooldown timestamp if active, null otherwise.
 */
export function getAccountCooldownUntil(
  state: RuntimeAccountState,
  now: number = Date.now(),
): number | null {
  if (state.coolingUntil && state.coolingUntil > now) {
    return state.coolingUntil;
  }
  return null;
}

/**
 * Partition accounts into eligible (no cooldown) and skipped (cooling down).
 */
export function partitionAccountsByCooldown<T extends { key: string }>(
  accounts: T[],
  getState: (account: T) => RuntimeAccountState,
  now: number = Date.now(),
): {
  eligible: T[];
  skipped: CooldownSkippedAccount<T>[];
} {
  const eligible: T[] = [];
  const skipped: CooldownSkippedAccount<T>[] = [];

  for (const account of accounts) {
    const state = getState(account);
    const until = getAccountCooldownUntil(state, now);
    if (until !== null) {
      skipped.push({
        account,
        cooldown: { until, backoffLevel: state.backoffLevel },
      });
      continue;
    }
    eligible.push(account);
  }

  return { eligible, skipped };
}

/**
 * Apply a rate-limit cooldown to an account.
 * Uses simple exponential backoff with a floor and cap.
 */
export function applyRateLimitCooldown(args: {
  state: RuntimeAccountState;
  retryAfterMs?: number;
  now?: number;
  capMs: number;
}): { backoffMs: number } {
  const now = args.now ?? Date.now();
  const baseCooldownMs = Math.max(
    args.retryAfterMs ?? 0,
    DEFAULT_COOLDOWN_FLOOR_MS,
  );
  const backoffMs = Math.min(
    baseCooldownMs * 2 ** args.state.backoffLevel,
    args.capMs,
  );

  args.state.coolingUntil = now + backoffMs;
  args.state.backoffLevel += 1;

  return { backoffMs };
}

/**
 * Clear cooldown state for an account after a successful request.
 */
export function clearAccountCooldown(state: RuntimeAccountState): void {
  state.coolingUntil = undefined;
  state.backoffLevel = 0;
}
