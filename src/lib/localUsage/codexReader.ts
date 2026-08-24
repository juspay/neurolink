/**
 * Reads token usage out of Codex's own rollout transcripts.
 *
 * Layout: `~/.codex/sessions/<yyyy>/<mm>/<dd>/rollout-<iso>-<sessionId>.jsonl`.
 * Each line is one of `session_meta`, `turn_context`, `response_item` or
 * `event_msg`; usage lives on `event_msg` records whose `payload.type` is
 * `token_count`.
 *
 * The counter semantics are the whole story here, and they are the opposite of
 * the Claude Code reader's. Every `token_count` event carries BOTH a
 * cumulative `total_token_usage` for the session and a per-turn
 * `last_token_usage`. Summing the per-turn values is the obvious move and it is
 * wrong: measured across all 108 sessions on a real machine, summing yields
 * 9,191,613,238 tokens against a true 5,653,217,442 — an overstatement of
 * 62.6%, and 195% on the worst single session. The per-turn value repeats
 * across events within a turn, so it double-counts.
 *
 * The cumulative counter is authoritative and was monotonic in all 108
 * sessions — it never resets mid-file — so the last one in the file is the
 * session's true total. `Math.max` is still used rather than "last seen",
 * because a counter that is only monotonic in every case observed is not the
 * same as one that is guaranteed to be, and the max costs nothing.
 *
 * Cost is deliberately not computed. Codex is a ChatGPT subscription — the
 * rollouts carry `rate_limits.plan_type` — so a per-token dollar figure would
 * be an invention, not a measurement. The tokens are real; the cost is
 * `unavailable`.
 */

import { createReadStream } from "fs";
import { createInterface } from "readline";
import { readdir, stat } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import type {
  LocalUsageCodexSessionRollup,
  LocalUsageReader,
  LocalUsageScanError,
  LocalUsageScanOptions,
  LocalUsageScanResult,
  LocalUsageTotals,
} from "../types/index.js";
import { resolveScanCutoffMs } from "./scanWindow.js";

const CLI_ID = "codex" as const;

function sessionsRoot(): string {
  return join(homedir(), ".codex", "sessions");
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

async function collectRollouts(dir: string, out: string[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    // One unreadable date directory must not cost the rest of the scan.
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectRollouts(full, out);
    } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      out.push(full);
    }
  }
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * Fold one rollout into a single session-level rollup.
 *
 * `billableEvents` counts only the `token_count` events where the cumulative
 * total actually advanced. Counting every event instead would inherit exactly
 * the repetition that makes summing the per-turn values wrong.
 */
async function readRollout(
  filePath: string,
): Promise<LocalUsageCodexSessionRollup | null> {
  const rl = createInterface({
    input: createReadStream(filePath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let model: string | undefined;
  let bestTotal = -1;
  let best: { input: number; output: number; cached: number } | undefined;
  let previousTotal = -1;
  let billableEvents = 0;

  try {
    for await (const line of rl) {
      // Cheap reject before JSON.parse: these files reach hundreds of MB and
      // most lines are conversation content with no usage on them at all.
      const isTokenCount = line.includes('"token_count"');
      const isTurnContext = line.includes('"turn_context"');
      if (!isTokenCount && !isTurnContext) {
        continue;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        // A rollout being appended to while we read it ends mid-line.
        continue;
      }
      const record = parsed as {
        type?: string;
        payload?: {
          type?: string;
          model?: string;
          info?: { total_token_usage?: Record<string, unknown> };
        };
      };

      if (record.type === "turn_context" && record.payload?.model) {
        // Last one wins: a session can switch models partway through, and the
        // most recent is the better single label for it.
        model = record.payload.model;
        continue;
      }

      if (record.payload?.type !== "token_count") {
        continue;
      }
      const cumulative = record.payload.info?.total_token_usage;
      if (!cumulative) {
        continue;
      }
      const total = num(cumulative.total_tokens);
      if (total > previousTotal) {
        billableEvents += 1;
      }
      previousTotal = total;
      if (total > bestTotal) {
        bestTotal = total;
        best = {
          input: num(cumulative.input_tokens),
          output: num(cumulative.output_tokens),
          cached: num(cumulative.cached_input_tokens),
        };
      }
    }
  } finally {
    rl.close();
  }

  if (!best) {
    return null;
  }
  return { model, billableEvents, ...best };
}

export async function createCodexReader(): Promise<LocalUsageReader> {
  return {
    descriptor: {
      id: CLI_ID,
      displayName: "Codex",
      verified: true,
      dedupStrategy: "session-dag",
      costConfidence: "unavailable",
      requiresSqlite: false,
    },

    detect: async () => {
      try {
        const info = await stat(sessionsRoot());
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
      const models = new Set<string>();

      const files: string[] = [];
      await collectRollouts(sessionsRoot(), files);

      // Only Infinity means "no time filter". A non-positive sinceDays used to
      // leave the cutoff undefined and read EVERYTHING — measured at 17,534
      // files and 35.9s for `sinceDays: 0`, which is the widest possible scan
      // in answer to the narrowest possible request. Zero now means a
      // zero-length window, which is what it reads as.
      // NaN is not a window, and it is the case the previous fix missed:
      // Math.max(0, NaN) is NaN, every comparison against NaN is false, so the
      // filter passes EVERY file. Measured: sinceDays NaN read 17,537 files in
      // 32.8s — the same unbounded sweep this guard exists to prevent, reached
      // by a different door. The old guard caught it with Number.isFinite and
      // the replacement dropped that check.
      const cutoff = resolveScanCutoffMs(options?.sinceDays);

      let filesScanned = 0;
      for (const file of files) {
        try {
          if (cutoff !== undefined) {
            const info = await stat(file);
            if (info.mtimeMs < cutoff) {
              continue;
            }
          }
          const rollup = await readRollout(file);
          filesScanned += 1;
          if (!rollup) {
            continue;
          }
          totals.requests += rollup.billableEvents;
          // `cached_input_tokens` is a SUBSET of `input_tokens` here — verified
          // on all 108 sessions, where input + output == total exactly and
          // cached <= input always. The other readers keep the two disjoint, so
          // the cached portion is subtracted out rather than reported twice; a
          // caller adding inputTokens + cacheReadTokens would otherwise
          // over-count Codex and not the rest.
          totals.inputTokens += Math.max(0, rollup.input - rollup.cached);
          totals.cacheReadTokens += rollup.cached;
          totals.outputTokens += rollup.output;
          if (rollup.model) {
            models.add(rollup.model);
          }
        } catch (error) {
          errors.push({
            cliId: CLI_ID,
            filePath: file,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Every turn is unpriced by construction, not by accident: see the note
      // on this module about Codex being a subscription. Naming the models
      // keeps that legible instead of looking like a lookup that failed.
      totals.unpricedRequests = totals.requests;
      totals.unpricedModels = [...models].sort();

      return { cliId: CLI_ID, totals, filesScanned, errors };
    },
  };
}
