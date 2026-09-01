/**
 * Reads token usage out of Hermes Agent's SQLite state store.
 *
 * Hermes Agent is Nous Research's official CLI agent (github.com/NousResearch/
 * hermes-agent), a Python program installed from its own install script — not
 * an npm package. An earlier note in this folder said the opposite ("no
 * official CLI, only an unofficial npm bridge"); it had searched npm for a
 * product that is not distributed there, and is retracted here.
 *
 * Store: `$HERMES_HOME/state.db`, defaulting to `~/.hermes/state.db`, plus one
 * `state.db` per profile under `profiles/<name>/`. SQLite, `schema_version`
 * table (26 when this was written; `PRAGMA user_version` stays 0, so it is
 * not the version to read). Confirmed on a real store produced by running the
 * CLI itself, not inferred from documentation.
 *
 * Two tables carry usage, and they are NOT additive:
 *
 *   sessions            one row per session, with cumulative token columns
 *                       for the PRIMARY task only.
 *   session_model_usage one row per (session, model, billing, task), each
 *                       with its own `api_call_count`, token columns and cost.
 *
 * Measured on the real store: a one-prompt session held a `sessions` row of
 * 10,568 input / 1 output / 1 call, and TWO usage rows — the primary task
 * (`task = ''`, identical numbers) and a `title_generation` task of 248 / 8 /
 * 1 call that the `sessions` aggregate does not include. The usage rows are
 * therefore the complete record of what Hermes actually sent to a provider,
 * and this reader sums them. The `sessions` aggregate is read only for a
 * session that has no usage rows at all (a store older than the migration
 * that introduced the table), and never in addition to them.
 *
 * Cost: Hermes records `estimated_cost_usd` with a `cost_status` of
 * `estimated`, from its own pricing snapshot. That is a modeled figure and is
 * reported as such. `actual_cost_usd` is `NOT NULL DEFAULT 0` on usage rows,
 * so a zero there is a schema default, not evidence of a free call — it is
 * used only when `cost_status` explicitly says the figure is actual. A row
 * with no trustworthy cost is counted as unpriced and its model named.
 *
 * Cache and reasoning columns are reported as stored. Every real sample so far
 * has them at zero, so whether `cache_read_tokens` is a subset of
 * `input_tokens` (OpenAI convention) or disjoint from it (Anthropic
 * convention) has not been measured, and no subtraction or folding is applied
 * until it has. Reasoning tokens are not added to output for the same reason.
 *
 * The time window is a snapshot filter, not an attribution: every row is a
 * cumulative counter, so a session that spans the cutoff is either included
 * whole or excluded whole, keyed on its last activity. Timestamps are epoch
 * SECONDS stored as REAL.
 */

import { readdir, stat } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import type {
  LocalUsageHermesUsageRow,
  LocalUsageReader,
  LocalUsageScanError,
  LocalUsageScanOptions,
  LocalUsageScanResult,
  LocalUsageSqliteDatabase,
  LocalUsageSqliteDatabaseCtor,
  LocalUsageTotals,
} from "../types/index.js";
import { resolveScanCutoffMs } from "./scanWindow.js";

const CLI_ID = "hermes" as const;

function hermesHome(): string {
  const env = process.env.HERMES_HOME;
  return env !== undefined && env.trim().length > 0
    ? env
    : join(homedir(), ".hermes");
}

function emptyTotals(): LocalUsageTotals {
  return {
    requests: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    costUsd: 0,
    costConfidence: "modeled",
    unpricedRequests: 0,
    unpricedModels: [],
  };
}

/** A finite, non-negative number, or 0. NULL and garbage both read as 0. */
function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

/** A finite, non-negative number, or null — for costs, where 0 is a value. */
function amount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

/** The root store plus one per profile. Missing pieces are simply absent. */
async function findStateDatabases(): Promise<string[]> {
  const root = hermesHome();
  const out: string[] = [];
  const rootDb = join(root, "state.db");
  try {
    if ((await stat(rootDb)).isFile()) {
      out.push(rootDb);
    }
  } catch {
    // No root store.
  }
  let profiles: string[];
  try {
    profiles = (await readdir(join(root, "profiles"), { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return out;
  }
  for (const name of profiles) {
    const db = join(root, "profiles", name, "state.db");
    try {
      if ((await stat(db)).isFile()) {
        out.push(db);
      }
    } catch {
      // Profile without a store yet.
    }
  }
  return out;
}

function columnsOf(db: LocalUsageSqliteDatabase, table: string): Set<string> {
  // PRAGMA table_info cannot take a bound parameter; the table names here are
  // fixed identifiers, never user input.
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{
    name?: unknown;
  }>;
  return new Set(
    rows
      .map((row) => row.name)
      .filter((name): name is string => typeof name === "string"),
  );
}

const USAGE_REQUIRED = [
  "session_id",
  "model",
  "api_call_count",
  "input_tokens",
  "output_tokens",
] as const;
const SESSIONS_REQUIRED = [
  "id",
  "started_at",
  "input_tokens",
  "output_tokens",
] as const;
const OPTIONAL_COUNTS = [
  "cache_read_tokens",
  "cache_write_tokens",
  "reasoning_tokens",
] as const;
const OPTIONAL_COST = [
  "estimated_cost_usd",
  "actual_cost_usd",
  "cost_status",
] as const;

/** `col` if the table has it, else a typed default under the same alias. */
function select(
  have: Set<string>,
  col: string,
  fallback: "0" | "NULL",
  alias = col,
): string {
  return have.has(col)
    ? `${alias === col ? col : `${col} AS ${alias}`}`
    : `${fallback} AS ${alias}`;
}

/**
 * Which cost a row is allowed to claim.
 *
 * `cost_status` is provenance, and it governs which column is trusted: an
 * explicit actual/billed status admits `actual_cost_usd`; an explicit
 * estimated status admits `estimated_cost_usd`. Without a status, a POSITIVE
 * estimate is still a computed value rather than a schema default and is
 * accepted; a bare zero is not, because `actual_cost_usd` defaults to 0 on
 * every usage row and would otherwise price every call at nothing.
 */
function rowCost(row: LocalUsageHermesUsageRow): number | null {
  const status =
    typeof row.cost_status === "string" ? row.cost_status.toLowerCase() : "";
  const actual = amount(row.actual_cost_usd);
  const estimated = amount(row.estimated_cost_usd);
  if (status === "actual" || status === "billed") {
    return actual;
  }
  if (status === "estimated") {
    return estimated;
  }
  return estimated !== null && estimated > 0 ? estimated : null;
}

/**
 * `COALESCE` over the timestamp columns a schema actually has. SQLite rejects
 * a one-argument COALESCE outright, and a minimal schema (or a fixture
 * modelled on one) can have exactly one — `started_at` is the only required
 * timestamp — so a single column is emitted bare.
 */
function newestOf(cols: string[]): string {
  const [only] = cols;
  return cols.length === 1 && only !== undefined
    ? only
    : `COALESCE(${cols.join(", ")})`;
}

function foldRow(
  row: LocalUsageHermesUsageRow,
  totals: LocalUsageTotals,
  unpriced: Set<string>,
): void {
  const calls = count(row.api_call_count);
  const input = count(row.input_tokens);
  const output = count(row.output_tokens);
  if (calls === 0 && input + output === 0) {
    // A failed one-shot leaves a session with no calls and no tokens. It is
    // not usage, and counting it as a zero-token request would inflate the
    // request count with attempts that never reached a model.
    return;
  }
  totals.requests += calls > 0 ? calls : 1;
  totals.inputTokens += input;
  totals.outputTokens += output;
  totals.cacheReadTokens += count(row.cache_read_tokens);
  totals.cacheCreationTokens += count(row.cache_write_tokens);
  const cost = rowCost(row);
  if (cost === null) {
    totals.unpricedRequests += calls > 0 ? calls : 1;
    unpriced.add(
      typeof row.model === "string" && row.model ? row.model : "unknown",
    );
  } else {
    totals.costUsd += cost;
  }
}

function readStore(
  db: LocalUsageSqliteDatabase,
  dbPath: string,
  cutoffSeconds: number | undefined,
  totals: LocalUsageTotals,
  unpriced: Set<string>,
  errors: LocalUsageScanError[],
): void {
  const sessionCols = columnsOf(db, "sessions");
  if (sessionCols.size === 0) {
    errors.push({
      cliId: CLI_ID,
      filePath: dbPath,
      message:
        "no sessions table — not a Hermes state store, or one this reader does not understand",
    });
    return;
  }
  const missingSessions = SESSIONS_REQUIRED.filter((c) => !sessionCols.has(c));
  if (missingSessions.length > 0) {
    // Fail closed. Reading a partial schema and reporting a clean zero would
    // look like "no usage" when the truth is "unreadable".
    errors.push({
      cliId: CLI_ID,
      filePath: dbPath,
      message: `sessions table lacks required column(s) ${missingSessions.join(", ")} — Hermes' schema has changed`,
    });
    return;
  }
  const usageCols = columnsOf(db, "session_model_usage");
  const hasUsage =
    usageCols.size > 0 && USAGE_REQUIRED.every((c) => usageCols.has(c));

  // Last activity, in seconds. Sessions know theirs; usage rows fall back to
  // their session's when they carry no `last_seen` of their own.
  const sessionAt = [
    sessionCols.has("last_activity_at") ? "s.last_activity_at" : null,
    sessionCols.has("ended_at") ? "s.ended_at" : null,
    "s.started_at",
  ].filter((c): c is string => c !== null);

  if (hasUsage) {
    const at = [
      usageCols.has("last_seen") ? "u.last_seen" : null,
      usageCols.has("first_seen") ? "u.first_seen" : null,
      ...sessionAt,
    ].filter((c): c is string => c !== null);
    const sql = `SELECT u.session_id, u.model, u.api_call_count, u.input_tokens, u.output_tokens, ${OPTIONAL_COUNTS.map(
      (c) => (usageCols.has(c) ? `u.${c}` : `0 AS ${c}`),
    ).join(", ")}, ${OPTIONAL_COST.map((c) =>
      usageCols.has(c) ? `u.${c}` : `NULL AS ${c}`,
    ).join(
      ", ",
    )}, ${newestOf(at)} AS at FROM session_model_usage u LEFT JOIN sessions s ON s.id = u.session_id`;
    const rows = db.prepare(sql).all() as LocalUsageHermesUsageRow[];
    for (const row of rows) {
      if (cutoffSeconds !== undefined && count(row.at) < cutoffSeconds) {
        continue;
      }
      foldRow(row, totals, unpriced);
    }
  }

  // Sessions with no usage rows: only the aggregate exists for them.
  const orphanFilter = hasUsage
    ? " WHERE NOT EXISTS (SELECT 1 FROM session_model_usage u WHERE u.session_id = s.id)"
    : "";
  const sessionSql = `SELECT s.id AS session_id, ${select(sessionCols, "model", "NULL")}, ${select(
    sessionCols,
    "api_call_count",
    "0",
  )}, s.input_tokens, s.output_tokens, ${OPTIONAL_COUNTS.map((c) =>
    sessionCols.has(c) ? `s.${c}` : `0 AS ${c}`,
  ).join(", ")}, ${OPTIONAL_COST.map((c) =>
    sessionCols.has(c) ? `s.${c}` : `NULL AS ${c}`,
  ).join(", ")}, ${newestOf(sessionAt)} AS at FROM sessions s${orphanFilter}`;
  const sessions = db.prepare(sessionSql).all() as LocalUsageHermesUsageRow[];
  for (const row of sessions) {
    if (cutoffSeconds !== undefined && count(row.at) < cutoffSeconds) {
      continue;
    }
    foldRow(row, totals, unpriced);
  }
}

export async function createHermesReader(): Promise<LocalUsageReader> {
  return {
    descriptor: {
      id: CLI_ID,
      displayName: "Hermes Agent",
      verified: true,
      // One row per (session, model, task): the store already holds each call
      // exactly once, so the only thing to avoid is reading a session's
      // aggregate on top of its rows.
      dedupStrategy: "last-write-wins",
      costConfidence: "modeled",
      requiresSqlite: true,
    },

    detect: async () => (await findStateDatabases()).length > 0,

    scan: async (
      options?: LocalUsageScanOptions,
    ): Promise<LocalUsageScanResult> => {
      const totals = emptyTotals();
      const errors: LocalUsageScanError[] = [];
      const unpriced = new Set<string>();

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
          filePath: hermesHome(),
          message: `node:sqlite unavailable on this runtime: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
        return { cliId: CLI_ID, totals, filesScanned: 0, errors };
      }
      if (!DatabaseSync) {
        errors.push({
          cliId: CLI_ID,
          filePath: hermesHome(),
          message:
            "node:sqlite did not expose a callable DatabaseSync — the experimental API has likely changed shape",
        });
        return { cliId: CLI_ID, totals, filesScanned: 0, errors };
      }

      const cutoffMs = resolveScanCutoffMs(options?.sinceDays);
      const cutoffSeconds =
        cutoffMs === undefined ? undefined : cutoffMs / 1000;

      let filesScanned = 0;
      for (const dbPath of await findStateDatabases()) {
        let db: LocalUsageSqliteDatabase | undefined;
        try {
          // Read-only: Hermes may be writing to this file right now.
          db = new DatabaseSync(dbPath, { readOnly: true });
          filesScanned += 1;
          readStore(db, dbPath, cutoffSeconds, totals, unpriced, errors);
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
            // Already closed, or never opened.
          }
        }
      }

      totals.unpricedModels = [...unpriced].sort();
      return { cliId: CLI_ID, totals, filesScanned, errors };
    },
  };
}
