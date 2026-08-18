/** Schema-v1 routing evidence values shared by emitters and offline readers. */
export const PROXY_ACCOUNT_ROUTING_STRATEGIES = [
  "round-robin",
  "fill-first",
] as const;

export const PROXY_ACCOUNT_ROUTING_MODES = [
  "quota",
  "primary",
  "round_robin",
  "single_account",
] as const;

export const PROXY_ACCOUNT_ROUTING_REASONS = [
  "single_account",
  "round_robin",
  "configured_primary",
  "insertion_order",
  "availability",
  "cooldown_recovery",
  "quota_evidence",
  // Retained for backwards-compatible analysis of pre-fix logs. New routing
  // decisions must never select a production request for quota discovery.
  "quota_probe",
  "session_headroom",
  "scoped_headroom",
  "session_reset",
  "weekly_reset",
  "weekly_utilization",
  "scoped_utilization",
] as const;

export const PROXY_ACCOUNT_TYPES = ["oauth", "api_key"] as const;

export const ACCOUNT_COOLING_REASONS = [
  "weekly",
  "session",
  "unified",
  "transient",
  "auth",
] as const;

/**
 * Longest a cooldown may last for each reason, measured from when it was set.
 *
 * A reason names a specific provider window, so it also bounds the wait: a
 * "session" cooldown describes a 5-hour window and can never legitimately run
 * for days. Without a per-reason ceiling a single bogus reset timestamp parks an
 * account for as long as the global 8-day clamp allows — observed in the wild as
 * a 206-hour "session" cooldown. Values carry slack so a genuine window that
 * resets slightly late is not cut short.
 */
export const MAX_COOLDOWN_MS_BY_REASON: Record<string, number> = {
  session: 5 * 60 * 60 * 1000 + 15 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000,
  // No named window bounds this one: it fires when the 5h/7d statuses still read
  // "allowed" and the provider's own Retry-After is the only signal. Generous on
  // purpose — truncating a provider-directed wait just re-hammers the account on
  // a shorter cycle — while still refusing an absurd multi-day park.
  unified: 12 * 60 * 60 * 1000,
  transient: 15 * 60 * 1000,
  auth: 5 * 60 * 1000,
};
