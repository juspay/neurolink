/**
 * LRU+TTL cache for pre-call tool routing decisions, plus session stickiness
 * tracking to reduce turn-to-turn server flapping.
 *
 * The cache is keyed by a caller-supplied string (typically a normalized hash
 * of sessionId + routing query). On a hit the cached exclusion list is
 * returned, skipping the router LLM entirely. On a miss the caller resolves
 * normally, stores the result, and `recordSelection` is called with the
 * selected server ids so stickiness can suppress their exclusion for the next
 * N turns.
 *
 * All operations are synchronous and pure (no I/O). The clock is injected via
 * `now` so tests can control time without `Date.now` side effects.
 */

import type {
  ToolRoutingCacheEntry,
  ToolRoutingCacheOptions,
  ToolRoutingStickiness,
} from "../types/index.js";

const DEFAULT_TTL_MS = 60_000;
const DEFAULT_MAX_ENTRIES = 256;
const DEFAULT_STICKY_TURNS = 3;

/**
 * Internal cap on the number of sessions tracked in the sticky map.
 * Not configurable via public API — avoids unbounded memory growth when many
 * ephemeral session ids are generated. Oldest entry (Map insertion order) is
 * evicted when the cap is reached.
 */
const MAX_STICKY_ENTRIES = 1024;

export class ToolRoutingCache {
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly stickyTurns: number;
  private readonly now: () => number;

  /** Main LRU+TTL store keyed by routing key. */
  private readonly store = new Map<string, ToolRoutingCacheEntry>();
  /** Per-session stickiness tracking keyed by session id. */
  private readonly sticky = new Map<string, ToolRoutingStickiness>();
  /** Monotonic counter for LRU ordering — incremented on each access. */
  private accessCounter = 0;

  constructor(opts: ToolRoutingCacheOptions = {}) {
    // Fall back to defaults for invalid (<=0 or NaN) values so callers cannot
    // accidentally disable the cache by passing bad config.
    const validOrDefault = (v: number | undefined, def: number): number =>
      v !== undefined && Number.isFinite(v) && v > 0 ? v : def;
    this.ttlMs = validOrDefault(opts.ttlMs, DEFAULT_TTL_MS);
    this.maxEntries = validOrDefault(opts.maxEntries, DEFAULT_MAX_ENTRIES);
    this.stickyTurns = validOrDefault(opts.stickyTurns, DEFAULT_STICKY_TURNS);
    this.now = opts.now ?? Date.now;
  }

  /**
   * Returns the cached routing result for the given key, or `undefined` on a
   * miss or expiry. Expired entries are deleted on access (lazy eviction).
   */
  get(
    key: string,
  ): { excludedToolNames: string[]; selectedServerIds: string[] } | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }

    if (this.now() >= entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    // Bump access order for LRU.
    entry.accessOrder = ++this.accessCounter;
    // Return shallow copies so callers cannot mutate cached state.
    return {
      excludedToolNames: [...entry.excludedToolNames],
      selectedServerIds: [...entry.selectedServerIds],
    };
  }

  /**
   * Stores a routing result under the given key. Evicts the least-recently-
   * used entry when the store is at capacity. Silently no-ops on any error
   * (caller is responsible for fail-open behaviour).
   */
  set(
    key: string,
    value: { excludedToolNames: string[]; selectedServerIds: string[] },
  ): void {
    try {
      if (this.store.size >= this.maxEntries && !this.store.has(key)) {
        this.evictLRU();
      }
      // Defensive copies: guard against callers mutating arrays after storing.
      this.store.set(key, {
        excludedToolNames: [...value.excludedToolNames],
        selectedServerIds: [...value.selectedServerIds],
        expiresAt: this.now() + this.ttlMs,
        accessOrder: ++this.accessCounter,
      });
    } catch {
      // Silently no-ops on any error — cache writes are non-fatal.
    }
  }

  /**
   * Records the server ids selected by the router for a session so they stay
   * warm for the next `stickyTurns` turns. Called after a successful
   * (non-cached) routing resolution.
   */
  recordSelection(sessionId: string, serverIds: string[]): void {
    if (!sessionId || serverIds.length === 0) {
      return;
    }
    // Evict the oldest session when at the internal cap (Map preserves insertion
    // order, so the first key is always the oldest).
    if (this.sticky.size >= MAX_STICKY_ENTRIES && !this.sticky.has(sessionId)) {
      const oldestKey = this.sticky.keys().next().value;
      if (oldestKey !== undefined) {
        this.sticky.delete(oldestKey);
      }
    }
    this.sticky.set(sessionId, {
      serverIds: [...serverIds],
      turnsRemaining: this.stickyTurns,
    });
  }

  /**
   * Returns the server ids that should be kept warm (not excluded) for the
   * given session due to stickiness. Decrements the turn counter; when it
   * reaches zero the entry is removed. Returns an empty array when there is no
   * active sticky state for the session.
   */
  getStickyServerIds(sessionId: string): string[] {
    if (!sessionId) {
      return [];
    }
    const entry = this.sticky.get(sessionId);
    if (!entry) {
      return [];
    }

    const ids = [...entry.serverIds];
    if (entry.turnsRemaining <= 1) {
      this.sticky.delete(sessionId);
    } else {
      entry.turnsRemaining -= 1;
    }
    return ids;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Scans the store for the entry with the lowest accessOrder and removes it.
   * O(n) scan is acceptable at the default maxEntries (256); very large caches
   * should consider an O(1) doubly-linked-list approach instead.
   */
  private evictLRU(): void {
    let lruKey: string | undefined;
    let lruOrder = Infinity;
    for (const [key, entry] of this.store) {
      if (entry.accessOrder < lruOrder) {
        lruOrder = entry.accessOrder;
        lruKey = key;
      }
    }
    if (lruKey !== undefined) {
      this.store.delete(lruKey);
    }
  }
}
