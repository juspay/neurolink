/**
 * Reads token usage out of Copilot CLI's local SQLite store.
 *
 * Store: `~/.copilot/session-store.db`. Usage lives on the
 * `assistant_usage_events` table — one INSERT-only row per assistant turn,
 * with `model`, `input_tokens`, `output_tokens`, `cache_read_tokens`,
 * `cache_write_tokens`, `reasoning_tokens` and a `created_at` timestamp
 * (ISO-8601 with a `Z` suffix). Confirmed no duplicate `(session_id,
 * turn_index)` pair exists on a reference machine, so — like OpenCode's
 * `message` table — this needs no dedup logic beyond the table's own
 * uniqueness: every row is counted once, matching the `rowid-high-water-mark`
 * strategy already established for that reader.
 *
 * The same database also holds a JSONL-adjacent `session.shutdown` event with
 * its own `modelMetrics`/`tokenDetails` payload (written to
 * `~/.copilot/session-state/*\/events.jsonl`, not this database). It was
 * deliberately NOT used here: cross-checking real sessions confirmed the two
 * sources report identical totals for the sessions they both cover, so
 * combining them would double-count rather than add coverage. The SQLite
 * table is the sole source; the tradeoff is a disclosed gap for any history
 * that predates the table's introduction.
 *
 * `cache_read_tokens` and `cache_write_tokens` are both SUBSETS of
 * `input_tokens`, not disjoint — confirmed arithmetically against a real
 * `session.shutdown` record (session `c2c38d0b`): `tokenDetails.input.tokenCount
 * = 3`, `cache_write = 24047`, and `usage.inputTokens = 24050` — exactly
 * `3 + 24047`, with nothing left over for a separate additive interpretation.
 * So `inputTokens` here is `input_tokens - cache_read_tokens -
 * cache_write_tokens`, the same style of subtraction `codexReader.ts`,
 * `qwenCodeReader.ts` and `geminiCliReader.ts` make for the same reason: this
 * subsystem's `LocalUsageTotals.inputTokens` + `.cacheReadTokens` must sum to
 * the true prompt size without double-counting. `reasoning_tokens` folds into
 * output — Copilot's own SDK types (`ShutdownModelMetricUsage`) group it
 * alongside `outputTokens` as a further breakdown of output, not a separate
 * accounting bucket.
 *
 * Cost is deliberately `unavailable`. The table's own `request_multiplier`
 * and `total_nano_aiu` columns are Copilot's request-quota accounting, not a
 * USD figure — the SDK's own generated types tag the closest concept,
 * `ShutdownModelMetricUsage.cost`, `@experimental`, and every real sample row
 * on the reference machine had `request_multiplier: 0.0`. Modeling a
 * per-token dollar figure from public list prices would also ignore that
 * Copilot CLI is typically used under a flat-rate Copilot subscription, the
 * same reasoning that keeps Codex's confidence `unavailable`. This holds even
 * when the underlying model is a metered vendor's (e.g. `claude-haiku-4-5` on
 * the reference machine) — Copilot's telemetry layer normalizes across
 * backend vendors into its own accounting convention, and this reader has no
 * way to tell whether a given row was billed by the minute, by the token, or
 * not separately billed at all.
 */

import { stat } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import type {
  LocalUsageCopilotUsageRow,
  LocalUsageReader,
  LocalUsageSqliteDatabase,
  LocalUsageSqliteDatabaseCtor,
  LocalUsageScanError,
  LocalUsageScanOptions,
  LocalUsageScanResult,
  LocalUsageTotals,
} from "../types/index.js";
import { resolveScanCutoffMs } from "./scanWindow.js";

const CLI_ID = "copilot" as const;

function databasePath(): string {
  return join(homedir(), ".copilot", "session-store.db");
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

/**
 * `created_at` is an ISO-8601-with-`Z` text column, so the cutoff needs to be
 * the same shape to sort and compare correctly in SQL. `Infinity`/`undefined`
 * (no filter) becomes the epoch, matching `openCodeReader.ts`'s `?? 0`
 * convention of expressing "unbounded" as "since the earliest possible time"
 * rather than leaving the bound parameter out.
 */
function cutoffIso(sinceDays: number | undefined): string {
  const cutoffMs = resolveScanCutoffMs(sinceDays) ?? 0;
  return new Date(cutoffMs).toISOString();
}

export async function createCopilotCliReader(): Promise<LocalUsageReader> {
  return {
    descriptor: {
      id: CLI_ID,
      displayName: "Copilot CLI",
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

      // `node:sqlite` is experimental and may be absent or change shape — the
      // same lazy, validated import `openCodeReader.ts` uses, so one runtime
      // missing it degrades to a reported failure for this reader alone.
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

      const cutoff = cutoffIso(options?.sinceDays);

      let db: LocalUsageSqliteDatabase | undefined;
      try {
        // Read-only: this is the user's live store and Copilot CLI may be
        // running. Bound parameter, not interpolation — never splice a
        // caller-influenced value into SQL text.
        db = new DatabaseSync(dbPath, { readOnly: true });
        const rows = db
          .prepare(
            "SELECT model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, reasoning_tokens, created_at FROM assistant_usage_events WHERE created_at >= ?",
          )
          .all(cutoff) as LocalUsageCopilotUsageRow[];

        for (const row of rows) {
          const inputTokens = num(row.input_tokens);
          const outputTokens = num(row.output_tokens);
          const cacheRead = num(row.cache_read_tokens);
          const cacheWrite = num(row.cache_write_tokens);
          const reasoning = num(row.reasoning_tokens);
          if (
            inputTokens === 0 &&
            outputTokens === 0 &&
            cacheRead === 0 &&
            cacheWrite === 0 &&
            reasoning === 0
          ) {
            continue;
          }

          totals.requests += 1;
          totals.inputTokens += Math.max(
            0,
            inputTokens - cacheRead - cacheWrite,
          );
          totals.outputTokens += outputTokens + reasoning;
          totals.cacheReadTokens += cacheRead;
          totals.cacheCreationTokens += cacheWrite;
          // Every counted row contributes a name. A null model still raised
          // unpricedRequests, so skipping it here produced a report saying N
          // turns went unpriced while naming fewer than N models — the operator
          // is then chasing a gap the report refuses to identify.
          models.add(row.model ?? "unknown");
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
