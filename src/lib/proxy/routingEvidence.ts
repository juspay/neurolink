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
  "session_reset",
  "weekly_reset",
  "weekly_utilization",
] as const;

export const PROXY_ACCOUNT_TYPES = ["oauth", "api_key"] as const;

export const ACCOUNT_COOLING_REASONS = [
  "weekly",
  "session",
  "unified",
  "transient",
  "auth",
] as const;
