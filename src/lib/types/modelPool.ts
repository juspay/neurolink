/**
 * ModelPool types — multi-provider failover with per-member cooldown.
 *
 * A ModelPool holds an ordered list of (provider, model, region) members and
 * selects among them per-turn using a configurable strategy. On provider
 * failure, the pool cools down the failed member and retries with the next
 * available one. Request-scoped context-window errors do not cool members.
 */

/** One candidate provider/model/region tuple in a pool. */
export type ModelPoolMember = {
  provider: string;
  model?: string;
  region?: string;
  /** Relative weight used by the "weighted" strategy. Default: 1. */
  weight?: number;
};

/** Member-selection strategy when picking the next candidate. */
export type ModelPoolStrategy = "priority" | "round-robin" | "weighted";

/**
 * Coarse error class returned by `classifyProviderError`.
 * Drives the cooldown decision inside ModelPool.
 */
export type ProviderErrorClass =
  | "rate_limit"
  | "auth"
  | "context_window"
  | "server"
  | "network"
  | "unknown";

/** Constructor-level configuration for a ModelPool instance. */
export type ModelPoolConfig = {
  /** Ordered list of provider/model/region candidates. */
  members: ModelPoolMember[];
  /**
   * How to pick among available members.
   * - "priority"     — always try the first available member (default).
   * - "round-robin"  — rotate through members in order.
   * - "weighted"     — prefer members with higher weight, varies by cursor.
   */
  strategy?: ModelPoolStrategy;
  /**
   * How long (ms) a failed member stays in cooldown before it is eligible
   * again. Applies to all error classes except context_window.
   * Default: 60_000 (1 minute).
   */
  cooldownMs?: number;
  /**
   * Maximum total attempts across all pool members per call.
   * Default: members.length (try every member once).
   */
  maxAttempts?: number;
};
