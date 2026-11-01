/**
 * ModelPool runtime — multi-provider failover with per-member cooldown.
 *
 * This module is PURE (no provider imports, no circular dependencies).
 * It works exclusively with provider NAMES + (provider, model, region) tuples;
 * the existing AIProviderFactory creates actual provider instances.
 *
 * Usage:
 *   const pool = new ModelPool({ members: [...], strategy: "round-robin" });
 *   const member = pool.selectNext();
 *   try {
 *     await callProvider(member);
 *     pool.recordSuccess(member);
 *   } catch (err) {
 *     pool.recordFailure(member, classifyProviderError(err));
 *     // try next member ...
 *   }
 */

import type {
  ModelPoolConfig,
  ModelPoolMember,
  ModelPoolStrategy,
  ProviderErrorClass,
} from "../types/index.js";
import {
  AuthenticationError,
  AuthorizationError,
  ModelAccessDeniedError,
} from "../types/index.js";
import { looksLikeModelAccessDenied } from "../utils/providerErrorClassification.js";

// ─────────────────────────────────────────────────────────────────────────────
// Error classification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the HTTP status code embedded in an error object, or undefined.
 */
function extractHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }
  const e = error as Record<string, unknown>;
  if (typeof e.status === "number") {
    return e.status;
  }
  if (typeof e.statusCode === "number") {
    return e.statusCode;
  }
  return undefined;
}

/**
 * Classify a provider error into a coarse `ProviderErrorClass`.
 *
 * Rules (checked in order):
 * 1. HTTP 429 or message pattern → "rate_limit"
 * 2. HTTP 401/403, access-denied pattern, or auth keywords → "auth"
 * 3. Context-window / token-limit message → "context_window"
 * 4. HTTP 5xx or server-error message → "server"
 * 5. Network connectivity error → "network"
 * 6. Everything else → "unknown"
 */
export function classifyProviderError(error: unknown): ProviderErrorClass {
  const status = extractHttpStatus(error);
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null
        ? String((error as Record<string, unknown>).message ?? error)
        : String(error ?? "");
  const lower = msg.toLowerCase();

  // 1. Rate limit
  if (
    status === 429 ||
    /rate.?limit|quota exceeded|too many requests|requests per minute/.test(
      lower,
    )
  ) {
    return "rate_limit";
  }

  // 2. Auth / access denied — also check typed error classes so that a
  //    typed AuthenticationError or ModelAccessDeniedError is classified as
  //    "auth" even when its message doesn't match the regex patterns.
  if (
    status === 401 ||
    status === 403 ||
    error instanceof AuthenticationError ||
    error instanceof AuthorizationError ||
    error instanceof ModelAccessDeniedError ||
    looksLikeModelAccessDenied(error) ||
    /unauthori[sz]ed|forbidden|invalid api.?key|api key|access denied|authentication failed|permission denied|unauthenticated/.test(
      lower,
    )
  ) {
    return "auth";
  }

  // 3. Context window
  if (
    /context.?length|maximum context|token.*exceed|exceeds.*context|too.?long|input.*too.?large/.test(
      lower,
    )
  ) {
    return "context_window";
  }

  // 4. Server error
  if (
    (status !== undefined && status >= 500 && status < 600) ||
    /server error|internal server|overloaded|service unavailable|bad gateway|gateway timeout/.test(
      lower,
    )
  ) {
    return "server";
  }

  // 5. Network
  if (
    /econnreset|etimedout|enotfound|network error|socket hang up|connection refused|connection reset/.test(
      lower,
    )
  ) {
    return "network";
  }

  return "unknown";
}

// ─────────────────────────────────────────────────────────────────────────────
// Cooldown constants
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_COOLDOWN_MS = 60_000; // 1 minute for member health failures

// ─────────────────────────────────────────────────────────────────────────────
// ModelPool
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Multi-provider pool with per-member cooldown and strategy-based selection.
 *
 * All state (cooldowns, cursor) is instance-local and resets on construction.
 * Thread safety is not required — Node.js is single-threaded for async work.
 */
export class ModelPool {
  private readonly config: ModelPoolConfig;
  private readonly strategy: ModelPoolStrategy;
  private readonly cooldownMs: number;
  private readonly state: Map<string, { cooldownUntil: number }>;
  private cursor: number;
  private readonly now: () => number;

  constructor(config: ModelPoolConfig, injectors?: { now?: () => number }) {
    this.config = config;
    this.strategy = config.strategy ?? "priority";
    this.cooldownMs = config.cooldownMs ?? DEFAULT_COOLDOWN_MS;
    this.now = injectors?.now ?? Date.now;
    this.cursor = 0;
    this.state = new Map<string, { cooldownUntil: number }>();
  }

  /**
   * The maximum number of attempts per call (pool config value or member count).
   * Used by callers that drive the retry loop externally.
   */
  get maxAttempts(): number {
    return this.config.maxAttempts ?? this.config.members.length;
  }

  /**
   * Returns a stable string key for a pool member.
   * Format: `${provider}:${model ?? "*"}:${region ?? "*"}`
   */
  memberKey(member: ModelPoolMember): string {
    return `${member.provider}:${member.model ?? "*"}:${member.region ?? "*"}`;
  }

  /** Returns members whose cooldown has expired (or were never cooled). */
  availableMembers(): ModelPoolMember[] {
    const now = this.now();
    return this.config.members.filter((m) => {
      const s = this.state.get(this.memberKey(m));
      return !s || s.cooldownUntil <= now;
    });
  }

  /**
   * Selects the next member to try according to the configured strategy.
   *
   * @param excludedKeys — keys of members already attempted this call.
   * @returns the chosen member, or undefined when all members are exhausted.
   */
  selectNext(excludedKeys?: Set<string>): ModelPoolMember | undefined {
    const candidates = this.availableMembers().filter(
      (m) => !excludedKeys?.has(this.memberKey(m)),
    );
    if (candidates.length === 0) {
      return undefined;
    }

    switch (this.strategy) {
      case "priority":
        return candidates[0];

      case "round-robin": {
        // Advance cursor to the next candidate index in the ORIGINAL list order.
        const allMembers = this.config.members;
        const candidateSet = new Set(candidates.map((m) => this.memberKey(m)));
        // Find the next member starting from cursor that is in candidateSet.
        for (let i = 0; i < allMembers.length; i++) {
          const idx = (this.cursor + i) % allMembers.length;
          const member = allMembers[idx];
          if (candidateSet.has(this.memberKey(member))) {
            // Advance cursor past this pick for the next call.
            this.cursor = (idx + 1) % allMembers.length;
            return member;
          }
        }
        return candidates[0];
      }

      case "weighted": {
        // Deterministic weighted selection: compute cumulative weights, pick
        // by cursor position (mod total weight) so repeated calls rotate.
        const totalWeight = candidates.reduce(
          (sum, m) => sum + (m.weight ?? 1),
          0,
        );
        if (totalWeight <= 0) {
          return candidates[0];
        }
        const pick = this.cursor % totalWeight;
        let accumulated = 0;
        for (const member of candidates) {
          accumulated += member.weight ?? 1;
          if (pick < accumulated) {
            this.cursor = (this.cursor + 1) % Math.max(totalWeight, 1);
            return member;
          }
        }
        // Fallback (floating-point edge case)
        this.cursor = (this.cursor + 1) % Math.max(totalWeight, 1);
        return candidates[candidates.length - 1];
      }

      default:
        return candidates[0];
    }
  }

  /**
   * Records a provider failure, setting a cooldown appropriate for the error class.
   *
   * A context-window error belongs to the request, so it does not change member
   * health. Other classes, including auth, use the configured timed cooldown.
   */
  recordFailure(member: ModelPoolMember, errorClass: ProviderErrorClass): void {
    if (errorClass === "context_window") {
      return;
    }
    this.state.set(this.memberKey(member), {
      cooldownUntil: this.now() + this.cooldownMs,
    });
  }

  /**
   * Records a successful response, clearing any existing cooldown for this member
   * so it remains fully available.
   */
  recordSuccess(member: ModelPoolMember): void {
    this.state.delete(this.memberKey(member));
  }
}
