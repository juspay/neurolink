/**
 * Reads token usage out of Grok Build's own session streams.
 *
 * Grok Build is xAI's official terminal coding agent (github.com/xai-org/
 * grok-build, Rust, installed from x.ai/cli/install.sh as `grok`). An earlier
 * note in this folder said "grok" named no product, only eight competing npm
 * packages; it had searched npm for a Rust binary that is not distributed
 * there, and is retracted here.
 *
 * Layout, confirmed by running the real binary against a redirected home:
 * `$GROK_HOME/sessions/<url-encoded cwd>/<session-id>/`, defaulting to
 * `~/.grok`. Each session directory holds `updates.jsonl` — the CLI's own
 * documentation calls it the authoritative conversation log — plus
 * `summary.json`, `chat_history.jsonl`, `signals.json` and others. The walk
 * here reads exactly `<group>/<session>/updates.jsonl` and nothing deeper:
 * a session directory can also hold `compaction_checkpoints/`, and a
 * checkpoint that snapshots the stream would otherwise be counted twice.
 *
 * Each line is a JSON-RPC style record. The ones that matter are
 * `method: "_x.ai/session/update"` with `params.update.sessionUpdate ===
 * "turn_completed"`; a completed turn that reached a model carries a `usage`
 * object with `inputTokens`, `outputTokens`, `cachedReadTokens`,
 * `cacheCreationTokens`, `reasoningTokens`, `modelCalls`, a per-model
 * `modelUsage` map and `numTurns`. A turn that failed before any model call
 * carries no `usage` at all, so it excludes itself. `stop_reason` is not an
 * eligibility test: a truncated or interrupted turn with a usage object was
 * still billed.
 *
 * What the numbers MEAN took a second real turn to settle, and the answer is
 * neither "per turn" nor "cumulative" but both, by process:
 *
 *   turn 1 (fresh process)      inputTokens 10141   numTurns 1
 *   turn 2 (`grok -r`, new one) inputTokens 11034   numTurns 1
 *
 * The second record is not 21175, so the usage is not a session-lifetime
 * counter. But the CLI's own persistence code says the figure is the
 * process's live ledger, and computes a turn's cost as live minus the
 * previous live value when the ledger has only grown — a running total within
 * one process, reset when a new process resumes the session. A reader has no
 * process boundary to look at; what it has is `numTurns`, the ledger's own
 * turn counter. Strictly increasing, with every bucket at least as large,
 * means the same ledger, and the turn's usage is the difference from the
 * previous record. Anything else means a fresh ledger, and the whole record
 * counts. Both real records above have numTurns 1, so both count whole, which
 * is the measured truth. The in-process cumulative branch is taken from the
 * CLI's source, not from a measurement — headless `-p` runs are one prompt
 * per process, so no real stream on this machine exercises it.
 *
 * Duplicates: a prompt's terminal record can be re-emitted (the persistence
 * layer folds a late re-emission into the same turn). Dedup is by
 * `prompt_id`, scoped to the session directory — prompt ids are not
 * documented as globally unique — keeping the last record seen. A record
 * with no prompt id is keyed by its line.
 *
 * Cost is `unavailable`: the turn record carries no price, and Grok Build is
 * a subscription product whose custom-model configurations can point at any
 * OpenAI- or Anthropic-compatible endpoint — the real run here used DeepSeek.
 * Cache and reasoning counts are reported as stored; every real sample so far
 * has them at zero, so whether `cachedReadTokens` is a subset of
 * `inputTokens` has not been measured and nothing is subtracted or folded
 * until it has. Reasoning tokens in particular are NOT added to output: on the
 * OpenAI wire they are a subset of completion tokens, and adding them would
 * double count.
 *
 * Not read: the newer per-session `usage.json` the CLI writes from the same
 * ledger. No real run on this machine produced one — the 1.0.13 binary's
 * `grok usage` reports "No usage recorded" for these sessions — and a reader
 * written against a struct definition alone is the guessed-format failure
 * this folder keeps paying for. When a real file exists it belongs here as a
 * fallback for a session with no readable stream, never as an addition.
 */

import { createReadStream } from "fs";
import { createInterface } from "readline";
import { readdir, stat } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import type {
  LocalUsageGrokTurn,
  LocalUsageGrokTurnUsage,
  LocalUsageReader,
  LocalUsageScanError,
  LocalUsageScanOptions,
  LocalUsageScanResult,
  LocalUsageTotals,
} from "../types/index.js";
import { resolveScanCutoffMs } from "./scanWindow.js";

const CLI_ID = "grok" as const;

function grokHome(): string {
  const env = process.env.GROK_HOME;
  return env !== undefined && env.trim().length > 0
    ? env
    : join(homedir(), ".grok");
}

function sessionsRoot(): string {
  return join(grokHome(), "sessions");
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

/** A finite, non-negative safe integer, or 0. */
function count(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0;
}

function isMissing(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "ENOENT"
  );
}

/**
 * Every `<group>/<session>/updates.jsonl`, exactly two levels down. Symlinks
 * are not followed: a linked session directory is either a duplicate of one
 * already in the tree or something outside it, and neither should be read.
 */
async function collectStreams(
  root: string,
  errors: LocalUsageScanError[],
): Promise<string[]> {
  let groups;
  try {
    groups = await readdir(root, { withFileTypes: true });
  } catch (error) {
    if (!isMissing(error)) {
      errors.push({
        cliId: CLI_ID,
        filePath: root,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return [];
  }
  const out: string[] = [];
  for (const group of groups) {
    if (!group.isDirectory()) {
      continue;
    }
    const groupDir = join(root, group.name);
    let sessions;
    try {
      sessions = await readdir(groupDir, { withFileTypes: true });
    } catch (error) {
      if (!isMissing(error)) {
        errors.push({
          cliId: CLI_ID,
          filePath: groupDir,
          message: error instanceof Error ? error.message : String(error),
        });
      }
      continue;
    }
    for (const session of sessions) {
      if (!session.isDirectory()) {
        continue;
      }
      const stream = join(groupDir, session.name, "updates.jsonl");
      try {
        if ((await stat(stream)).isFile()) {
          out.push(stream);
        }
      } catch {
        // A session directory with no stream yet.
      }
    }
  }
  return out;
}

function readTurn(usage: LocalUsageGrokTurnUsage): LocalUsageGrokTurn {
  const models =
    typeof usage.modelUsage === "object" && usage.modelUsage !== null
      ? Object.keys(usage.modelUsage).filter((k) => k.length > 0)
      : [];
  return {
    input: count(usage.inputTokens),
    output: count(usage.outputTokens),
    cacheRead: count(usage.cachedReadTokens),
    cacheCreation: count(usage.cacheCreationTokens),
    calls: count(usage.modelCalls),
    turns: count(usage.numTurns),
    models,
  };
}

/** Whether `next` is the same process ledger as `prev`, grown by a turn. */
function continuesRun(
  prev: LocalUsageGrokTurn,
  next: LocalUsageGrokTurn,
): boolean {
  return (
    next.turns > prev.turns &&
    next.input >= prev.input &&
    next.output >= prev.output &&
    next.cacheRead >= prev.cacheRead &&
    next.cacheCreation >= prev.cacheCreation &&
    next.calls >= prev.calls
  );
}

function completedTurn(parsed: unknown): {
  promptId: string | undefined;
  usage: LocalUsageGrokTurnUsage;
} | null {
  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }
  const record = parsed as { method?: unknown; params?: unknown };
  if (record.method !== "_x.ai/session/update") {
    return null;
  }
  if (typeof record.params !== "object" || record.params === null) {
    return null;
  }
  const update = (record.params as { update?: unknown }).update;
  if (typeof update !== "object" || update === null) {
    return null;
  }
  const u = update as {
    sessionUpdate?: unknown;
    prompt_id?: unknown;
    usage?: unknown;
  };
  if (u.sessionUpdate !== "turn_completed") {
    return null;
  }
  if (typeof u.usage !== "object" || u.usage === null) {
    // Completed without reaching a model — an error before the first call.
    return null;
  }
  return {
    promptId: typeof u.prompt_id === "string" ? u.prompt_id : undefined,
    usage: u.usage as LocalUsageGrokTurnUsage,
  };
}

async function foldStream(
  filePath: string,
  totals: LocalUsageTotals,
  unpriced: Set<string>,
): Promise<void> {
  // Insertion-ordered, so the delta rule below sees turns in the order Grok
  // wrote them, with a re-emitted prompt replacing its earlier record.
  const turns = new Map<string, LocalUsageGrokTurn>();
  const rl = createInterface({
    input: createReadStream(filePath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  try {
    let lineNo = 0;
    for await (const line of rl) {
      lineNo += 1;
      if (!line || line.charCodeAt(0) !== 123 /* '{' */) {
        continue;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        // A stream being appended to ends in a partial line — normal.
        continue;
      }
      const turn = completedTurn(parsed);
      if (turn === null) {
        continue;
      }
      turns.set(turn.promptId ?? `line:${lineNo}`, readTurn(turn.usage));
    }
  } finally {
    rl.close();
  }

  let prev: LocalUsageGrokTurn | undefined;
  for (const turn of turns.values()) {
    const delta =
      prev !== undefined && continuesRun(prev, turn)
        ? {
            input: turn.input - prev.input,
            output: turn.output - prev.output,
            cacheRead: turn.cacheRead - prev.cacheRead,
            cacheCreation: turn.cacheCreation - prev.cacheCreation,
            calls: turn.calls - prev.calls,
          }
        : turn;
    prev = turn;
    const calls = delta.calls > 0 ? delta.calls : 1;
    totals.requests += calls;
    totals.inputTokens += delta.input;
    totals.outputTokens += delta.output;
    totals.cacheReadTokens += delta.cacheRead;
    totals.cacheCreationTokens += delta.cacheCreation;
    totals.unpricedRequests += calls;
    for (const model of turn.models.length > 0 ? turn.models : ["unknown"]) {
      unpriced.add(model);
    }
  }
}

export async function createGrokReader(): Promise<LocalUsageReader> {
  return {
    descriptor: {
      id: CLI_ID,
      displayName: "Grok Build",
      verified: true,
      // Per prompt id within a session, last record wins — a re-emitted
      // terminal replaces the earlier one rather than adding to it.
      dedupStrategy: "last-write-wins",
      costConfidence: "unavailable",
      requiresSqlite: false,
    },

    detect: async () => {
      try {
        return (await stat(sessionsRoot())).isDirectory();
      } catch {
        return false;
      }
    },

    scan: async (
      options?: LocalUsageScanOptions,
    ): Promise<LocalUsageScanResult> => {
      const totals = emptyTotals();
      const errors: LocalUsageScanError[] = [];
      const unpriced = new Set<string>();
      const cutoff = resolveScanCutoffMs(options?.sinceDays);

      let filesScanned = 0;
      for (const file of await collectStreams(sessionsRoot(), errors)) {
        try {
          // One stream is one session, and its mtime is the session's last
          // activity: a session is in or out of the window whole.
          if (cutoff !== undefined && (await stat(file)).mtimeMs < cutoff) {
            continue;
          }
          await foldStream(file, totals, unpriced);
          filesScanned += 1;
        } catch (error) {
          errors.push({
            cliId: CLI_ID,
            filePath: file,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }

      totals.unpricedModels = [...unpriced].sort();
      return { cliId: CLI_ID, totals, filesScanned, errors };
    },
  };
}
