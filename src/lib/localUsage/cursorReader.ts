/**
 * Reads token usage out of Cursor CLI's local chat store.
 *
 * Store: `~/.cursor/chats/<workspaceHash>/<agentId>/store.db`, one SQLite file
 * per agent session, with two tables:
 *
 *   - `meta`  — a single row whose `value` is **hex-encoded** JSON (not JSON,
 *     and not a blob: a hex *string*), carrying `latestRootBlobId`, `name`,
 *     `createdAt` and `lastUsedModel`.
 *   - `blobs` — a content-addressed store, `id` = SHA-256 of `data`. Some
 *     blobs are UTF-8 JSON messages; the root blob is **protobuf**.
 *
 * **What this reader reports is NOT cumulative spend, and that difference is
 * the whole reason to read this file before trusting the number.** Every other
 * reader here sums per-turn usage across a transcript. Cursor persists no
 * per-turn usage at all: the only counts in the store are a snapshot of the
 * *current context composition* on the newest root blob — how many tokens the
 * system prompt, tools, rules, skills, subagents and conversation each occupy
 * right now. A session with 200 turns and a session with 1 turn produce one
 * snapshot each. Summing across sessions therefore answers "how much context
 * was loaded, last time each session was touched", never "how much was billed".
 * It lands in `inputTokens` because context is what gets sent as input, and it
 * is the honest home for it — but a dashboard adding this to a metered CLI's
 * input tokens is adding two different quantities. The same hazard OpenCode's
 * reader documents for double-counted proxy traffic, one step further.
 *
 * **Why the parse validates itself.** Protobuf field numbers are an internal
 * detail of a closed-source binary that updates itself, so hard-coding "the
 * total is field 5.1" is a claim about a format nobody published. Instead the
 * parser finds the breakdown by *shape* — submessages of exactly
 * `{1: string, 2: string, 3?: varint, 4?: varint}` — sums their token fields,
 * and then requires that sum to appear verbatim as a varint elsewhere in the
 * same message. On the reference store that is
 * 480 + 11592 + 9257 + 6621 + 391 + 143 = 28484, matching the stored 28484
 * exactly, against a 200000 window. If a future Cursor renumbers its fields the
 * shape match still works; if it changes the *structure*, the sum stops
 * matching and the session is reported as an error rather than counted wrong.
 * A reader that cannot tell "I parsed nothing" from "this session used nothing"
 * is the failure this check exists to prevent.
 *
 * Cost is `unavailable`, not zero-with-confidence: Cursor is a subscription and
 * the store records no model-priced turns to derive a figure from.
 */

import { readdir, stat } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import type {
  LocalUsageContextPart,
  LocalUsageReader,
  LocalUsageSqliteDatabase,
  LocalUsageSqliteDatabaseCtor,
  LocalUsageScanError,
  LocalUsageScanOptions,
  LocalUsageScanResult,
  LocalUsageTotals,
  LocalUsageWireField,
} from "../types/index.js";
import { resolveScanCutoffMs } from "./scanWindow.js";

const CLI_ID = "cursor" as const;

function chatsRoot(): string {
  return join(homedir(), ".cursor", "chats");
}

function emptyTotals(): LocalUsageTotals {
  return {
    requests: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    costUsd: 0,
    costConfidence: "unavailable",
    unpricedRequests: 0,
    unpricedModels: [],
  };
}

/**
 * Decode one protobuf message into its top-level fields.
 *
 * Returns `null` rather than throwing on anything malformed — this walks blobs
 * from a third-party binary, so "not the shape I expected" is an ordinary
 * outcome and must not abort a scan of the other sessions.
 */
function decodeMessage(buf: Uint8Array): LocalUsageWireField[] | null {
  const out: LocalUsageWireField[] = [];
  let i = 0;
  const varint = (): number | null => {
    let result = 0;
    let shift = 0;
    while (i < buf.length) {
      // Read then advance, without a non-null assertion: the loop condition
      // makes this in-bounds, but an assertion would keep being true if the
      // condition ever changed, and this parser's whole job is to distrust the
      // bytes it is handed.
      const byte = buf[i];
      i += 1;
      if (byte === undefined) {
        return null;
      }
      // Beyond 2^53 a JS number stops being exact, and a token count that
      // silently loses precision is worse than a refused parse.
      if (shift > 53) {
        return null;
      }
      result += (byte & 0x7f) * Math.pow(2, shift);
      shift += 7;
      if ((byte & 0x80) === 0) {
        return result;
      }
    }
    return null;
  };
  while (i < buf.length) {
    const key = varint();
    if (key === null) {
      return null;
    }
    const field = Math.floor(key / 8);
    const wireType = key % 8;
    if (wireType === 0) {
      const value = varint();
      if (value === null) {
        return null;
      }
      out.push({ field, kind: "varint", value });
    } else if (wireType === 2) {
      const length = varint();
      if (length === null || i + length > buf.length) {
        return null;
      }
      out.push({ field, kind: "bytes", value: buf.subarray(i, i + length) });
      i += length;
    } else if (wireType === 5) {
      i += 4;
    } else if (wireType === 1) {
      i += 8;
    } else {
      // Groups (3/4) are deprecated and absent here; anything else is garbage.
      return null;
    }
    if (i > buf.length) {
      return null;
    }
  }
  return out;
}

const utf8 = new TextDecoder("utf-8", { fatal: true });

/**
 * Match one breakdown entry by shape.
 *
 * Deliberately strict — every field must be one of the four expected numbers
 * with the expected wire type, and fields 1 and 2 must be valid UTF-8. A loose
 * matcher would collect unrelated submessages and inflate the sum, and the sum
 * is the only thing proving the parse found the right structure at all.
 */
function tryParsePart(buf: Uint8Array): LocalUsageContextPart | null {
  const fields = decodeMessage(buf);
  if (fields === null || fields.length === 0) {
    return null;
  }
  let name: string | undefined;
  let sawLabel = false;
  let tokens = 0;
  for (const f of fields) {
    if (f.field === 1 && f.kind === "bytes") {
      try {
        name = utf8.decode(f.value);
      } catch {
        return null;
      }
    } else if (f.field === 2 && f.kind === "bytes") {
      try {
        utf8.decode(f.value);
        sawLabel = true;
      } catch {
        return null;
      }
    } else if (f.field === 3 && f.kind === "varint") {
      tokens = f.value;
    } else if (f.field === 4 && f.kind === "varint") {
      // Character count; read but not reported — it is the denominator behind
      // the ~4.08 chars/token ratio, not a usage figure.
    } else {
      return null;
    }
  }
  if (name === undefined || !sawLabel) {
    return null;
  }
  return { name, tokens };
}

/**
 * Find a breakdown CONTAINER: one message that both holds the entries and
 * states their total.
 *
 * The first version of this searched the whole tree — every shape-matching
 * submessage anywhere became a "part", and the total merely had to appear as
 * some varint somewhere. Both halves were too loose, and the real data proves
 * it rather than hypothesis: this machine's own root blob carries a field 21
 * of `{1: "/Users/…/feat/support-for-ide", 2: "feat/support-for-ide"}`, which
 * is a workspace descriptor and matches the entry shape exactly. Today it is
 * harmless only because it has no field 3, so it contributes 0. Give it one —
 * an entirely ordinary thing for a protobuf message to grow — and the sum
 * inflates; and because a 643-byte blob already holds seventeen distinct
 * varints, "does the sum equal ANY varint in the tree" is a coincidence
 * waiting to be satisfied. The result would be a wrong number that had passed
 * its own validation, which is worse than no number at all.
 *
 * Scoping to a container closes both halves. The entries must be siblings
 * inside one message, and that same message must carry their sum as one of its
 * own varints — which is exactly how Cursor lays it out: the inner message
 * holds the total at field 1, the window at field 2, and the entries as a
 * repeated field 3. A lone shape-match like field 21 can never qualify: it has
 * no varint fields at all, and no entry-shaped children.
 *
 * @returns the container's stated total, or `null` if no message in the tree
 * both contains at least two entries and states their sum.
 */
function findBreakdownTotal(buf: Uint8Array, depth: number): number | null {
  if (depth > 12) {
    return null;
  }
  const fields = decodeMessage(buf);
  if (fields === null) {
    return null;
  }

  const parts: LocalUsageContextPart[] = [];
  for (const f of fields) {
    if (f.kind === "bytes") {
      const part = tryParsePart(f.value);
      if (part !== null) {
        parts.push(part);
      }
    }
  }

  // Two, not one: a single match is far likelier to be an unrelated two-string
  // message than a context breakdown. Safe because Cursor writes its breakdown
  // as a FIXED set — system_prompt, tools, rules, skills, mcp, subagents,
  // summarized_conversation, conversation — all eight present even when a
  // category is empty (mcp and summarized_conversation carried no token field
  // at all on the reference blob). So the count never drops toward one as a
  // session shrinks; a one-entry container would mean the format changed, and
  // that is a case to refuse rather than guess at.
  if (parts.length >= 2) {
    const sum = parts.reduce((acc, p) => acc + p.tokens, 0);
    if (sum > 0) {
      for (const f of fields) {
        if (f.kind === "varint" && f.value === sum) {
          return sum;
        }
      }
    }
  }

  // Not this message — recurse. Depth-first, so a nested container is still
  // found when its parent also holds shape-matching noise.
  for (const f of fields) {
    if (f.kind !== "bytes") {
      continue;
    }
    const found = findBreakdownTotal(f.value, depth + 1);
    if (found !== null) {
      return found;
    }
  }
  return null;
}

/**
 * @returns the session's context-token total, or `null` when the blob holds no
 * breakdown whose entries sum to a total stated alongside them.
 */
export function extractCursorContextTokens(
  rootBlob: Uint8Array,
): number | null {
  return findBreakdownTotal(rootBlob, 0);
}

/** `~/.cursor/chats/<workspaceHash>/<agentId>/store.db`, two levels down. */
async function findStoreDatabases(): Promise<string[]> {
  const root = chatsRoot();
  const found: string[] = [];
  let workspaces: string[];
  try {
    workspaces = await readdir(root);
  } catch {
    return found;
  }
  for (const workspace of workspaces) {
    let agents: string[];
    try {
      agents = await readdir(join(root, workspace));
    } catch {
      continue;
    }
    for (const agent of agents) {
      const dbPath = join(root, workspace, agent, "store.db");
      try {
        const info = await stat(dbPath);
        if (info.isFile()) {
          found.push(dbPath);
        }
      } catch {
        // Not every directory is an agent session.
      }
    }
  }
  return found;
}

export async function createCursorReader(): Promise<LocalUsageReader> {
  return {
    descriptor: {
      id: CLI_ID,
      displayName: "Cursor",
      verified: true,
      // Only the newest root blob per session carries a breakdown; earlier
      // roots in the content-addressed chain hold none. Taking the latest is
      // not a choice between duplicates, it is the only record that exists.
      dedupStrategy: "last-write-wins",
      costConfidence: "unavailable",
      requiresSqlite: true,
      requestUnit: "session-snapshot",
    },

    detect: async () => {
      try {
        const info = await stat(chatsRoot());
        return info.isDirectory();
      } catch {
        return false;
      }
    },

    scan: async (
      options?: LocalUsageScanOptions,
    ): Promise<LocalUsageScanResult> => {
      const totals = emptyTotals();
      const errors: LocalUsageScanError[] = [];

      let DatabaseSync: LocalUsageSqliteDatabaseCtor | undefined;
      try {
        const sqlite: unknown = await import("node:sqlite");
        if (
          typeof sqlite === "object" &&
          sqlite !== null &&
          "DatabaseSync" in sqlite &&
          typeof (sqlite as { DatabaseSync: unknown }).DatabaseSync ===
            "function"
        ) {
          DatabaseSync = (
            sqlite as { DatabaseSync: LocalUsageSqliteDatabaseCtor }
          ).DatabaseSync;
        }
      } catch (error) {
        errors.push({
          cliId: CLI_ID,
          filePath: chatsRoot(),
          message: `node:sqlite unavailable on this runtime: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
        return { cliId: CLI_ID, totals, filesScanned: 0, errors };
      }
      if (!DatabaseSync) {
        errors.push({
          cliId: CLI_ID,
          filePath: chatsRoot(),
          message:
            "node:sqlite did not expose a callable DatabaseSync — the experimental API has likely changed shape",
        });
        return { cliId: CLI_ID, totals, filesScanned: 0, errors };
      }

      const cutoffMs = resolveScanCutoffMs(options?.sinceDays);
      let filesScanned = 0;

      for (const dbPath of await findStoreDatabases()) {
        // Filter on the file, before opening it. Unlike OpenCode there is no
        // per-row timestamp to filter in SQL: one database IS one session.
        if (cutoffMs !== undefined) {
          try {
            const info = await stat(dbPath);
            if (info.mtimeMs < cutoffMs) {
              continue;
            }
          } catch {
            continue;
          }
        }

        let db: LocalUsageSqliteDatabase | undefined;
        try {
          // Read-only: Cursor may be running against this very file.
          db = new DatabaseSync(dbPath, { readOnly: true });
          filesScanned += 1;

          const metaRows = db.prepare("SELECT value FROM meta").all() as Array<{
            value?: unknown;
          }>;
          const rawMeta = metaRows.find(
            (row): row is { value: string } => typeof row.value === "string",
          )?.value;
          if (rawMeta === undefined) {
            continue;
          }
          // Hex-encoded JSON. Validated rather than assumed: a non-hex value
          // decodes to mojibake and would throw inside JSON.parse anyway, but
          // the explicit test says why the buffer conversion is there.
          if (!/^(?:[0-9a-fA-F]{2})+$/.test(rawMeta)) {
            continue;
          }
          let latestRootBlobId: string | undefined;
          try {
            const meta: unknown = JSON.parse(
              Buffer.from(rawMeta, "hex").toString("utf8"),
            );
            if (
              typeof meta === "object" &&
              meta !== null &&
              "latestRootBlobId" in meta &&
              typeof (meta as { latestRootBlobId: unknown })
                .latestRootBlobId === "string"
            ) {
              latestRootBlobId = (meta as { latestRootBlobId: string })
                .latestRootBlobId;
            }
          } catch {
            continue;
          }
          if (latestRootBlobId === undefined) {
            continue;
          }

          const blobRows = db
            .prepare("SELECT data FROM blobs WHERE id = ?")
            .all(latestRootBlobId) as Array<{ data?: unknown }>;
          const blob = blobRows[0]?.data;
          if (!(blob instanceof Uint8Array) || blob.length === 0) {
            continue;
          }

          const contextTokens = extractCursorContextTokens(blob);
          if (contextTokens === null) {
            // Reported, never silently skipped: "no breakdown found" and "this
            // session used nothing" are different facts and must not collapse.
            errors.push({
              cliId: CLI_ID,
              filePath: dbPath,
              message:
                "root blob carried no context breakdown whose parts sum to a stated total — Cursor's on-disk format has likely changed",
            });
            continue;
          }

          // One snapshot per session, not one per turn. See this module's note.
          totals.requests += 1;
          totals.inputTokens += contextTokens;
        } catch (error) {
          errors.push({
            cliId: CLI_ID,
            filePath: dbPath,
            message: error instanceof Error ? error.message : String(error),
          });
        } finally {
          try {
            db?.close();
          } catch {
            // Closing a database that failed to open is not a second failure.
          }
        }
      }

      return { cliId: CLI_ID, totals, filesScanned, errors };
    },
  };
}
