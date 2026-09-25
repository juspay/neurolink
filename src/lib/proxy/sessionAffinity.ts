const MAX_BOUND_SESSIONS = 5_000;

// Per-record shape is an inline type on the Map's generic parameter rather
// than a named `type` alias: it is a private, single-use implementation
// detail with no external consumer, so it does not belong in
// src/lib/types/ (CLAUDE.md rule 2 targets shared type definitions).
const bindings = new Map<
  string,
  { accountKey: string; lastServedAt: number }
>();

/** Bind a session to the account that just served it, refreshing its idle clock. */
export function bind(sessionId: string, accountKey: string, now: number): void {
  // Delete-then-set moves the entry to the end of Map iteration order, which
  // is what makes that order double as least-recently-bound-first for the
  // cap eviction below.
  bindings.delete(sessionId);
  bindings.set(sessionId, { accountKey, lastServedAt: now });
  if (bindings.size > MAX_BOUND_SESSIONS) {
    const oldestKey = bindings.keys().next().value;
    if (oldestKey !== undefined) {
      bindings.delete(oldestKey);
    }
  }
}

/**
 * The account a session is bound to, or undefined if unbound or idle-expired.
 * A read never refreshes the binding — only a served request (bind) does,
 * since the idle TTL counts from the session's last served request.
 */
export function get(
  sessionId: string,
  now: number,
  idleTtlMs: number,
): string | undefined {
  const record = bindings.get(sessionId);
  if (!record) {
    return undefined;
  }
  if (now - record.lastServedAt > idleTtlMs) {
    bindings.delete(sessionId);
    return undefined;
  }
  return record.accountKey;
}

export function clear(): void {
  bindings.clear();
}

export function size(): number {
  return bindings.size;
}

/**
 * Sessions whose binding has not idle-expired. Expired entries are dropped
 * here as on read, since otherwise they would linger until the cap evicted
 * them.
 */
export function countActive(now: number, idleTtlMs: number): number {
  for (const [sessionId, record] of bindings) {
    if (now - record.lastServedAt > idleTtlMs) {
      bindings.delete(sessionId);
    }
  }
  return bindings.size;
}

export const sessionAffinity = Object.freeze({
  bind,
  get,
  clear,
  size,
  countActive,
});
