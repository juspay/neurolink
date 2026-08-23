/**
 * Reads token usage out of OpenCode's local SQLite store.
 *
 * Store: `~/.local/share/opencode/opencode.db` (NOT `~/.config/opencode`,
 * which holds only configuration). Usage lives on the `message` table, whose
 * `data` column is a JSON blob carrying `role`, `modelID`, `providerID`,
 * `cost` and a `tokens` object.
 *
 * Two things the real data settled, both of which would corrupt totals
 * silently if assumed instead of checked.
 *
 * **Cache is DISJOINT from input here.** Measured across all 4,674
 * usage-bearing messages on a reference machine, `total` equals
 * `input + output + cache.read + cache.write` — never `input + output` alone
 * unless cache happened to be zero. This is the opposite of Codex, where
 * `cached_input_tokens` is a SUBSET of `input_tokens` and has to be subtracted
 * back out. Three readers now, three conventions; none of them is safe to
 * infer from the others.
 *
 * **OpenCode's own `cost` field is not usable.** It was 0 in all 4,674
 * messages, while the provider mix spanned `github-copilot` (a subscription),
 * `openai` (metered) and `neurolink` (this proxy). A single cost figure for
 * that mixture would be wrong whichever way it was computed, so tokens are
 * reported and cost is declared `unavailable` rather than invented or
 * quietly zeroed.
 *
 * Worth knowing for anyone summing sources: traffic OpenCode sent through the
 * NeuroLink proxy appears under `providerID: "neurolink"` here AND in the
 * proxy's own ledger. The two are independent measurements of the same
 * requests, not additive. On the reference machine that was 41 messages and
 * ~772k tokens against 458M total, so it is small — but it is not zero, and a
 * dashboard adding local usage to proxy usage double-counts exactly that
 * slice.
 */

import { stat } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import type {
  LocalUsageReader,
  LocalUsageSqliteDatabase,
  LocalUsageSqliteDatabaseCtor,
  LocalUsageScanError,
  LocalUsageScanOptions,
  LocalUsageScanResult,
  LocalUsageTotals,
} from "../types/index.js";

const CLI_ID = "opencode" as const;
const DEFAULT_SINCE_DAYS = 30;

function databasePath(): string {
  return join(homedir(), ".local", "share", "opencode", "opencode.db");
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

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export async function createOpenCodeReader(): Promise<LocalUsageReader> {
  return {
    descriptor: {
      id: CLI_ID,
      displayName: "OpenCode",
      verified: true,
      dedupStrategy: "rowid-high-water-mark",
      costConfidence: "unavailable",
      requiresSqlite: true,
    },

    detect: async () => {
      try {
        const info = await stat(databasePath());
        return info.isFile();
      } catch {
        return false;
      }
    },

    scan: async (
      options?: LocalUsageScanOptions,
    ): Promise<LocalUsageScanResult> => {
      const totals = emptyTotals();
      const errors: LocalUsageScanError[] = [];
      const models = new Set<string>();
      const dbPath = databasePath();

      // `node:sqlite` is built in from Node 22 but still flagged experimental,
      // so it can be absent or change shape. Imported lazily and behind a
      // try/catch: a runtime without it must degrade to a reported failure for
      // this one reader, not take down a scan of all the others.
      let DatabaseSync: LocalUsageSqliteDatabaseCtor | undefined;
      try {
        const sqlite: unknown = await import("node:sqlite");
        // Validated, not asserted. The module is experimental and may change
        // shape between Node releases; a cast would let a changed export sail
        // through and fail later as an unrelated TypeError deep in the scan.
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
          filePath: dbPath,
          message: `node:sqlite unavailable on this runtime: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
        return { cliId: CLI_ID, totals, filesScanned: 0, errors };
      }
      if (!DatabaseSync) {
        errors.push({
          cliId: CLI_ID,
          filePath: dbPath,
          message:
            "node:sqlite did not expose a callable DatabaseSync — the experimental API has likely changed shape",
        });
        return { cliId: CLI_ID, totals, filesScanned: 0, errors };
      }

      const sinceDays = options?.sinceDays ?? DEFAULT_SINCE_DAYS;
      const cutoffMs =
        Number.isFinite(sinceDays) && sinceDays > 0
          ? Date.now() - sinceDays * 86_400_000
          : 0;

      let db: LocalUsageSqliteDatabase | undefined;
      try {
        // Read-only: this is the user's live store and OpenCode may be running.
        db = new DatabaseSync(dbPath, { readOnly: true });
        // Filtered in SQL rather than in JS. `time_created` is epoch ms, and
        // the table holds thousands of rows whose `data` blobs are large — the
        // point of the time window is not reading them at all.
        const rows = db
          .prepare(`SELECT data FROM message WHERE time_created >= ${cutoffMs}`)
          .all() as Array<{ data?: string }>;

        for (const row of rows) {
          if (typeof row.data !== "string") {
            continue;
          }
          let parsed: unknown;
          try {
            parsed = JSON.parse(row.data);
          } catch {
            continue;
          }
          const message = parsed as {
            role?: string;
            modelID?: string;
            tokens?: {
              input?: number;
              output?: number;
              reasoning?: number;
              cache?: { read?: number; write?: number };
            };
          };
          const tokens = message.tokens;
          if (!tokens || message.role !== "assistant") {
            continue;
          }
          const input = num(tokens.input);
          const output = num(tokens.output);
          const cacheRead = num(tokens.cache?.read);
          const cacheWrite = num(tokens.cache?.write);
          if (
            input === 0 &&
            output === 0 &&
            cacheRead === 0 &&
            cacheWrite === 0
          ) {
            continue;
          }

          totals.requests += 1;
          // Added as-is: cache is disjoint from input in this store. See the
          // note on this module — Codex is the other way round.
          totals.inputTokens += input;
          totals.outputTokens += output;
          totals.cacheReadTokens += cacheRead;
          totals.cacheCreationTokens += cacheWrite;
          if (message.modelID) {
            models.add(message.modelID);
          }
        }
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

      // Unpriced by construction rather than by a failed lookup — see the note
      // on this module about the mixed subscription/metered provider set.
      totals.unpricedRequests = totals.requests;
      totals.unpricedModels = [...models].sort();

      return {
        cliId: CLI_ID,
        totals,
        filesScanned: totals.requests > 0 || errors.length === 0 ? 1 : 0,
        errors,
      };
    },
  };
}
