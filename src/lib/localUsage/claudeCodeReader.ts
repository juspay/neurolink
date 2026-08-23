/**
 * Reads token usage out of Claude Code's own session transcripts.
 *
 * Layout, confirmed on a real machine rather than from documentation:
 * `~/.claude/projects/<sanitized-cwd>/<sessionId>.jsonl`, where the sanitized
 * cwd is the absolute working-directory path with every `/` replaced by `-`.
 *
 * The load-bearing detail is that top-level session transcripts are a tiny
 * minority of the files. On the machine this was written against, 17,439
 * transcripts totalling 9.7 GB broke down as roughly 103 top-level sessions
 * against 17,116 subagent-task transcripts nested under
 * `<sessionId>/subagents/`. A reader that globbed only `<project>/*.jsonl`
 * would miss essentially all of a subagent-heavy user's real spend, so this
 * one recurses.
 *
 * The files are not homogeneous message streams. A single 14,747-line
 * transcript carried eleven distinct `type` values — `assistant`, `user`,
 * `attachment`, `pr-link`, `last-prompt`, `mode`, `permission-mode`,
 * `queue-operation`, `system`, `file-history-delta`, `file-history-snapshot` —
 * several of which have no `message` key at all. Every one of its 6,028
 * `type: "assistant"` lines carried a `message.usage` object, so that filter is
 * safe, but everything else must be skipped rather than treated as malformed.
 */

import { createReadStream } from "fs";
import { createInterface } from "readline";
import { readdir, stat } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import type {
  LocalUsageClaudeRawUsage,
  LocalUsageReader,
  LocalUsageScanError,
  LocalUsageScanOptions,
  LocalUsageScanResult,
  LocalUsageTotals,
} from "../types/index.js";
import { calculateCost, hasPricing } from "../utils/pricing.js";

const CLI_ID = "claude-code" as const;
const DEFAULT_SINCE_DAYS = 30;
const PROVIDER = "anthropic";

function projectsRoot(): string {
  return join(homedir(), ".claude", "projects");
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

/**
 * Every `.jsonl` under the projects root, at any depth.
 *
 * Depth matters here — see the module header. `withFileTypes` avoids a stat
 * per entry, and a directory that cannot be read is skipped rather than
 * aborting the walk: one unreadable project must not cost the other eleven
 * thousand files.
 */
async function collectTranscripts(dir: string, out: string[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectTranscripts(full, out);
    } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      out.push(full);
    }
  }
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * Fold one transcript into `totals`.
 *
 * Read line by line rather than into a string: these files reach tens of
 * megabytes, and a full-history scan opens thousands of them.
 *
 * Dedup is by `message.id`, keeping the LARGEST output count seen for that id.
 * A resumed session re-logs turns it has already written, and the re-logged
 * copy can carry a higher output count than the first — taking the max rather
 * than the first or last is what makes a resumed session total correct instead
 * of either under- or double-counted. The map is per-file and discarded after,
 * so it stays bounded no matter how many files a scan covers.
 */
async function foldTranscript(
  filePath: string,
  totals: LocalUsageTotals,
  unpriced: Set<string>,
): Promise<void> {
  const seen = new Map<
    string,
    {
      model: string;
      input: number;
      output: number;
      read: number;
      create: number;
    }
  >();

  const rl = createInterface({
    input: createReadStream(filePath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  try {
    for await (const line of rl) {
      if (!line || line.charCodeAt(0) !== 123 /* '{' */) {
        continue;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        // A transcript being appended to while we read it ends in a partial
        // line. That is normal, not corruption — skip it.
        continue;
      }
      const record = parsed as {
        type?: string;
        message?: {
          id?: string;
          model?: string;
          usage?: LocalUsageClaudeRawUsage;
        };
      };
      if (record.type !== "assistant" || !record.message?.usage) {
        continue;
      }
      const usage = record.message.usage;
      const id = record.message.id;
      if (typeof id !== "string" || id.length === 0) {
        continue;
      }
      const candidate = {
        model: record.message.model ?? "unknown",
        input: num(usage.input_tokens),
        output: num(usage.output_tokens),
        read: num(usage.cache_read_input_tokens),
        create: num(usage.cache_creation_input_tokens),
      };
      const existing = seen.get(id);
      if (!existing || candidate.output > existing.output) {
        seen.set(id, candidate);
      }
    }
  } finally {
    rl.close();
  }

  for (const turn of seen.values()) {
    totals.requests += 1;
    totals.inputTokens += turn.input;
    totals.outputTokens += turn.output;
    totals.cacheReadTokens += turn.read;
    totals.cacheCreationTokens += turn.create;

    if (hasPricing(PROVIDER, turn.model)) {
      totals.costUsd += calculateCost(PROVIDER, turn.model, {
        input: turn.input,
        output: turn.output,
        total: turn.input + turn.output,
        cacheReadTokens: turn.read,
        cacheCreationTokens: turn.create,
      });
    } else {
      totals.unpricedRequests += 1;
      unpriced.add(turn.model);
    }
  }
}

export async function createClaudeCodeReader(): Promise<LocalUsageReader> {
  return {
    descriptor: {
      id: CLI_ID,
      displayName: "Claude Code",
      verified: true,
      dedupStrategy: "message-id-keep-max",
      costConfidence: "modeled",
      requiresSqlite: false,
    },

    detect: async () => {
      try {
        const info = await stat(projectsRoot());
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
      const unpriced = new Set<string>();

      const files: string[] = [];
      await collectTranscripts(projectsRoot(), files);

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
      const requestedDays = options?.sinceDays ?? DEFAULT_SINCE_DAYS;
      const sinceDays = Number.isNaN(requestedDays) ? 0 : requestedDays;
      const cutoff =
        sinceDays === Infinity
          ? undefined
          : Date.now() - Math.max(0, sinceDays) * 86_400_000;

      let filesScanned = 0;
      for (const file of files) {
        try {
          if (cutoff !== undefined) {
            const info = await stat(file);
            if (info.mtimeMs < cutoff) {
              continue;
            }
          }
          await foldTranscript(file, totals, unpriced);
          filesScanned += 1;
        } catch (error) {
          // One unreadable transcript is a reportable fact, not a reason to
          // lose the totals from every other file in the scan.
          errors.push({
            cliId: CLI_ID,
            filePath: file,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }

      totals.unpricedModels = [...unpriced].sort();
      // Confidence stays "modeled" even when some turns went unpriced, and the
      // distinction matters. "heuristic" means the number itself was estimated
      // — Kiro's byte-count figure, say. Here every dollar in `costUsd` came
      // from a real rate table; what is missing is turns, not accuracy. That
      // incompleteness is already reported precisely by `unpricedRequests` and
      // `unpricedModels` (on this machine: Claude Code's internal
      // "<synthetic>" model), so downgrading the whole row would overstate the
      // doubt and make a genuinely estimated total indistinguishable from this
      // one.
      totals.costUsd = Math.round(totals.costUsd * 1_000_000) / 1_000_000;

      return { cliId: CLI_ID, totals, filesScanned, errors };
    },
  };
}
