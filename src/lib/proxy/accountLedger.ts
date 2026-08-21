/**
 * Per-account token and cost totals, read incrementally from the proxy's own
 * request log.
 *
 * `~/.neurolink/logs` runs to hundreds of megabytes, so a polled endpoint
 * cannot re-read it per request. This keeps a per-file cursor and only ever
 * reads bytes appended since the last call.
 *
 * ## Why this is not built on proxyAnalysis.ts
 *
 * That module always re-reads whole files and sweeps the lifecycle, attempts
 * and debug streams too. Attempts carry one row per retry for the same
 * requestId, so folding them in would multiply a retried request's tokens by
 * its retry count.
 *
 * ## Correctness rules this file exists to enforce
 *
 * - **Only `proxy-<date>.jsonl`.** Never attempts/lifecycle/debug.
 * - **Dedupe by requestId.** A request can be logged twice: once when the
 *   response headers are known and again when a streamed body finishes and its
 *   token counts arrive (the Codex engine does exactly this). Totals are
 *   derived from a requestId-keyed map, never by adding up raw lines.
 * - **Only advance the cursor to the last complete newline**, so a line still
 *   being appended is re-read whole next time rather than parsed truncated.
 * - **A shrinking file means delete-and-recreate**, not truncation — the writer
 *   only appends. Reset the cursor rather than reporting corruption.
 */

import { homedir } from "node:os";
import { join } from "node:path";
import { calculateCost, hasPricing } from "../utils/pricing.js";
import type {
  CliAccountUsageTotals,
  ProxyLedgerEntry,
  ProxyLedgerFileCursor,
} from "../types/index.js";

/** Same pattern proxyAnalysis.ts uses, deliberately duplicated as a constant. */
const REQUEST_FILE_PATTERN = /^proxy-\d{4}-\d{2}-\d{2}\.jsonl$/;

/**
 * Account types written by the Anthropic pool. The request log is shared with
 * the Codex engine, and an operator can use the same email for both, so rows
 * must be filtered by engine before being attributed to an Anthropic account.
 */
const ANTHROPIC_ACCOUNT_TYPES = new Set(["oauth", "api_key"]);

const cursors = new Map<string, ProxyLedgerFileCursor>();

function getLogsDir(): string {
  return join(homedir(), ".neurolink", "logs");
}

function finiteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : 0;
}

/**
 * Provider to price against, given a log row.
 *
 * The Anthropic pool never sets `provider` on its records, so the account type
 * is the only signal for the overwhelming majority of rows.
 */
function resolveProvider(entry: ProxyLedgerEntry): string {
  if (entry.provider) {
    return entry.provider;
  }
  if (ANTHROPIC_ACCOUNT_TYPES.has(entry.accountType)) {
    return "anthropic";
  }
  if (entry.accountType === "codex-oauth") {
    return "openai";
  }
  // Translation and unknown rows can have landed anywhere; the cross-provider
  // lookup finds the model wherever it lives rather than guessing a vendor.
  return "openai-compatible";
}

/**
 * Read newly appended lines and fold them into the file's requestId map.
 *
 * `node:fs` is imported dynamically rather than statically: this module is
 * reachable from the bundled SDK, whose browser build stubs `node:fs` and has
 * no `readSync`, so a static import fails the bundle outright.
 */
async function advanceCursor(
  fileName: string,
  cursor: ProxyLedgerFileCursor,
): Promise<void> {
  const { closeSync, openSync, readSync, statSync } = await import("node:fs");
  const path = join(getLogsDir(), fileName);

  let size: number;
  try {
    size = statSync(path).size;
  } catch {
    // Retention deleted the file. Its accumulated totals are the final answer
    // for that day and can never be recomputed, so freeze rather than drop.
    return;
  }

  if (size < cursor.size) {
    // Only reachable via delete-and-recreate; the writer appends in place.
    cursor.offset = 0;
    cursor.entries.clear();
  }
  cursor.size = size;
  if (size <= cursor.offset) {
    return;
  }

  let chunk: Buffer;
  const fd = openSync(path, "r");
  try {
    const length = size - cursor.offset;
    chunk = Buffer.alloc(length);
    readSync(fd, chunk, 0, length, cursor.offset);
  } finally {
    closeSync(fd);
  }

  const text = chunk.toString("utf8");
  const lastBreak = text.lastIndexOf("\n");
  if (lastBreak === -1) {
    // A partial line with no terminator yet; leave the cursor where it is.
    return;
  }
  cursor.offset += Buffer.byteLength(text.slice(0, lastBreak + 1), "utf8");

  for (const line of text.slice(0, lastBreak).split("\n")) {
    if (!line.trim()) {
      continue;
    }
    let record: Record<string, unknown>;
    try {
      record = JSON.parse(line) as Record<string, unknown>;
    } catch {
      continue;
    }
    const requestId = record.requestId;
    const account = record.account;
    if (typeof requestId !== "string" || typeof account !== "string") {
      continue;
    }
    if (!account) {
      continue;
    }
    // requestId can come straight from a client-supplied X-Request-ID header,
    // so it is not guaranteed unique across genuinely separate requests. Keying
    // on the triple means two distinct calls that collide on id but differ in
    // account or model are still counted separately; a true re-log of the same
    // request keeps the same triple and merges.
    const entryKey = `${requestId}\u0000${account}\u0000${
      typeof record.model === "string" ? record.model : ""
    }`;
    const next: ProxyLedgerEntry = {
      account,
      accountType:
        typeof record.accountType === "string" ? record.accountType : "",
      model: typeof record.model === "string" ? record.model : "",
      provider:
        typeof record.provider === "string" ? record.provider : undefined,
      inputTokens: finiteNumber(record.inputTokens),
      outputTokens: finiteNumber(record.outputTokens),
      cacheReadTokens: finiteNumber(record.cacheReadTokens),
      cacheCreationTokens: finiteNumber(record.cacheCreationTokens),
    };
    // A later record for the same request enriches the earlier one — it must
    // replace it, never add to it. But token fields take the MAX rather than
    // the newer value: a request can be re-logged with no token fields at all
    // (a terminal error recorded after a successful response), and letting
    // those zeros win would silently erase real usage.
    //
    // The catch is that the key is not guaranteed unique. requestId can come
    // straight from a client-supplied X-Request-ID, so a fixed correlation
    // header or an idempotency wrapper produces N genuinely distinct requests
    // that agree on id, account and model. Merging those undercounts by a
    // factor of N.
    //
    // What separates the two cases is usage. The re-log this dedup exists for
    // is an *enrichment*: the Codex engine writes once when the response
    // headers are known, carrying no tokens, and again when the stream ends,
    // carrying them all. No writer ever emits two token-bearing lines for one
    // request — the Anthropic engine's terminal log is guarded by a per-request
    // flag, and retries go to a separate attempts file this reader never opens.
    // So a second line that carries its own usage is a second request, and
    // takes its own slot.
    const slotKey = resolveSlotKey(cursor, entryKey, next);
    const previous = cursor.entries.get(slotKey);
    cursor.entries.set(
      slotKey,
      previous
        ? {
            ...previous,
            ...next,
            inputTokens: Math.max(previous.inputTokens, next.inputTokens),
            outputTokens: Math.max(previous.outputTokens, next.outputTokens),
            cacheReadTokens: Math.max(
              previous.cacheReadTokens,
              next.cacheReadTokens,
            ),
            cacheCreationTokens: Math.max(
              previous.cacheCreationTokens,
              next.cacheCreationTokens,
            ),
            // Likewise keep a real model name over a placeholder.
            model:
              next.model && next.model !== "-" ? next.model : previous.model,
          }
        : next,
    );
  }
}

/** Whether a log record carries any usage at all. */
function hasUsage(entry: ProxyLedgerEntry): boolean {
  return (
    entry.inputTokens > 0 ||
    entry.outputTokens > 0 ||
    entry.cacheReadTokens > 0 ||
    entry.cacheCreationTokens > 0
  );
}

/**
 * Where this record belongs: the existing slot for its id, or a fresh one.
 *
 * Returns `entryKey` for the first record with that id, and for any later
 * record that looks like a re-log of it. A later record that reports its own,
 * different usage is a separate request that merely collided on a
 * client-supplied id, so it gets the next free numbered slot instead.
 */
function resolveSlotKey(
  cursor: ProxyLedgerFileCursor,
  entryKey: string,
  next: ProxyLedgerEntry,
): string {
  const base = cursor.entries.get(entryKey);
  if (!base || !hasUsage(next)) {
    return entryKey;
  }
  let slot = entryKey;
  let occupant: ProxyLedgerEntry | undefined = base;
  let index = 1;
  while (occupant) {
    if (!hasUsage(occupant)) {
      return slot;
    }
    index += 1;
    slot = `${entryKey}\u0000#${index}`;
    occupant = cursor.entries.get(slot);
  }
  return slot;
}

/** UTC date stamp of the log file the totals cover. */
export function currentUsageDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function emptyTotals(): CliAccountUsageTotals {
  return {
    requests: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    costUsd: 0,
    unpricedRequests: 0,
    unpricedModels: [],
  };
}

/**
 * Token and cost totals for one UTC day, keyed by bare account label.
 *
 * Only Anthropic-pool rows are attributed, so a Codex account sharing a label
 * with an Anthropic one cannot contribute its tokens to the wrong row.
 */
export async function readAccountUsage(
  date = currentUsageDate(),
): Promise<Map<string, CliAccountUsageTotals>> {
  const fileName = `proxy-${date}.jsonl`;
  if (!REQUEST_FILE_PATTERN.test(fileName)) {
    return new Map();
  }

  // Only the current day is ever read, so anything else is a stale cursor
  // holding one object per requestId seen that day. Without this the map grows
  // for the life of the process.
  for (const key of cursors.keys()) {
    if (key !== fileName) {
      cursors.delete(key);
    }
  }

  let cursor = cursors.get(fileName);
  if (!cursor) {
    cursor = { offset: 0, size: 0, entries: new Map() };
    cursors.set(fileName, cursor);
  }
  await advanceCursor(fileName, cursor);

  const totals = new Map<string, CliAccountUsageTotals>();
  const unpriced = new Map<string, Set<string>>();

  for (const entry of cursor.entries.values()) {
    if (!ANTHROPIC_ACCOUNT_TYPES.has(entry.accountType)) {
      continue;
    }
    const row = totals.get(entry.account) ?? emptyTotals();
    row.requests += 1;
    row.inputTokens += entry.inputTokens;
    row.outputTokens += entry.outputTokens;
    row.cacheReadTokens += entry.cacheReadTokens;
    row.cacheCreationTokens += entry.cacheCreationTokens;

    const provider = resolveProvider(entry);
    if (entry.model && entry.model !== "-") {
      if (hasPricing(provider, entry.model)) {
        row.costUsd += calculateCost(provider, entry.model, {
          input: entry.inputTokens,
          output: entry.outputTokens,
          total: entry.inputTokens + entry.outputTokens,
          cacheReadTokens: entry.cacheReadTokens,
          cacheCreationTokens: entry.cacheCreationTokens,
        });
      } else {
        row.unpricedRequests += 1;
        const seen = unpriced.get(entry.account) ?? new Set<string>();
        seen.add(entry.model);
        unpriced.set(entry.account, seen);
      }
    }
    totals.set(entry.account, row);
  }

  for (const [account, row] of totals) {
    row.costUsd = Number(row.costUsd.toFixed(6));
    row.unpricedModels = [...(unpriced.get(account) ?? [])].sort();
  }
  return totals;
}

/** Drop all cached cursors. Exported for tests, which vary HOME per case. */
export function resetAccountLedgerCache(): void {
  cursors.clear();
}
