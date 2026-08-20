/**
 * Request-scoped peer-sharing context and the counters the rate gates read.
 *
 * The grant serving a borrowed request has to be visible deep inside the routing
 * path — account selection filters on it, and settlement bills against it — but
 * threading it through every call site of a 9,000-line route module would touch
 * everything and be wrong the first time someone added a code path. An
 * `AsyncLocalStorage` scope is the narrower change: the gate establishes it once
 * per request, and anything downstream in the same async chain (including the
 * `.then()` that settles a finished stream) can ask for it.
 *
 * Requests without a grant — the node's own client on loopback — run with no
 * context at all, so `getShareContext()` returning `undefined` is the normal,
 * hot case and means "this is my own traffic".
 *
 * @module proxy/shareContext
 */

import { AsyncLocalStorage } from "node:async_hooks";
import type {
  ProxyShareGrantCounters,
  ProxyShareRequestContext,
} from "../types/index.js";

const storage = new AsyncLocalStorage<ProxyShareRequestContext>();

const counters = new Map<string, ProxyShareGrantCounters>();

const RATE_WINDOW_MS = 60_000;

function getCounters(grantId: string): ProxyShareGrantCounters {
  let entry = counters.get(grantId);
  if (!entry) {
    entry = { timestamps: [], inFlight: 0 };
    counters.set(grantId, entry);
  }
  return entry;
}

/** Drop timestamps that have aged out of the one-minute window. */
function prune(entry: ProxyShareGrantCounters, now: number): void {
  if (entry.timestamps.length === 0) {
    return;
  }
  const cutoff = now - RATE_WINDOW_MS;
  let firstLive = 0;
  while (
    firstLive < entry.timestamps.length &&
    entry.timestamps[firstLive] <= cutoff
  ) {
    firstLive += 1;
  }
  if (firstLive > 0) {
    entry.timestamps.splice(0, firstLive);
  }
}

/** Read the counters a policy evaluation needs, without mutating them. */
export function readShareCounters(
  grantId: string,
  now: number = Date.now(),
): { requestsInLastMinute: number; inFlight: number } {
  const entry = counters.get(grantId);
  if (!entry) {
    return { requestsInLastMinute: 0, inFlight: 0 };
  }
  prune(entry, now);
  return {
    requestsInLastMinute: entry.timestamps.length,
    inFlight: entry.inFlight,
  };
}

/**
 * Claim a concurrency slot and record the request against the rate window.
 * Returns the release function; it is idempotent because a request can end more
 * than one way (normal return, thrown error, client disconnect) and double
 * release would let a grant exceed its concurrency ceiling.
 */
export function acquireShareSlot(
  grantId: string,
  now: number = Date.now(),
): () => void {
  const entry = getCounters(grantId);
  prune(entry, now);
  entry.timestamps.push(now);
  entry.inFlight += 1;
  let released = false;
  return () => {
    if (released) {
      return;
    }
    released = true;
    entry.inFlight = Math.max(0, entry.inFlight - 1);
  };
}

/** Run `fn` with the grant visible to everything downstream. */
export function runWithShareContext<T>(
  context: ProxyShareRequestContext,
  fn: () => T,
): T {
  return storage.run(context, fn);
}

/** The grant serving the current request, or undefined for the node's own traffic. */
export function getShareContext(): ProxyShareRequestContext | undefined {
  return storage.getStore();
}

/** True when the current request is borrowed rather than the node's own. */
export function isBorrowedRequest(): boolean {
  return storage.getStore() !== undefined;
}

/** Drop all counters. Test isolation only. */
export function resetShareCountersForTests(): void {
  counters.clear();
}
