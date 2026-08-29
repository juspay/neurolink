/**
 * Reads token usage out of Qwen Code's own session transcripts.
 *
 * Layout, confirmed on a real machine: `~/.qwen/projects/<sanitized-cwd>/chats/
 * <sessionId>.jsonl`, where the sanitized cwd is the absolute working-directory
 * path with every `/` replaced by `-` — the same convention Claude Code uses
 * for its own `~/.claude/projects` layout, which is unsurprising since Qwen
 * Code's chat-recording model traces back to the same lineage as Gemini CLI's.
 * `~/.qwen/projects/<slug>/` also holds a sibling `memory/` directory with a
 * `MEMORY.md` file and no JSONL, so the walk below is scoped to `chats/`
 * specifically rather than the whole project directory.
 *
 * The bundled CLI (`@qwen-code/qwen-code`, installed copy inspected directly)
 * references `parentSessionId` the same way Gemini CLI's engine does for
 * subagent transcripts, so this reader recurses under each project's `chats/`
 * directory at any depth rather than globbing one level — the same lesson
 * `claudeCodeReader.ts` already paid for.
 *
 * Each line is a flat record with `type`, `uuid`, and (for `type: "assistant"`)
 * a `model` and `usageMetadata` object shaped like Google's GenAI
 * `usageMetadata`: `promptTokenCount`, `candidatesTokenCount`,
 * `thoughtsTokenCount`, `totalTokenCount`, `cachedContentTokenCount`. On a real
 * machine, `totalTokenCount` equalled `promptTokenCount + candidatesTokenCount
 * + thoughtsTokenCount` exactly across all 21 real assistant records sampled —
 * so `thoughtsTokenCount` is additive into output, not a separate bucket.
 *
 * `cachedContentTokenCount` is a SUBSET of `promptTokenCount`, not disjoint —
 * confirmed by reading the installed CLI's own converters rather than
 * inferring from samples, because every real sample on this machine had zero
 * cache tokens. `buildAnthropicUsageMetadata` in
 * `chunks/anthropicContentGenerator-*.js` and the OpenAI-compatible converter
 * in `chunks/chunk-*.js` both derive `cachedContentTokenCount` from the
 * upstream response's own cache-read field and leave `promptTokenCount` as the
 * upstream's full prompt count — the cached portion is never added on top. So
 * `inputTokens` here is `prompt - cached`, matching the convention this
 * subsystem's `LocalUsageTotals` type expects (`inputTokens` +
 * `cacheReadTokens` must sum to the true prompt size without double-counting),
 * the same subtraction `codexReader.ts` does for the same reason.
 *
 * Cost is deliberately `unavailable`. Two independent reasons, either one
 * sufficient on its own: (1) no provider identifier is logged alongside the
 * model name, and Qwen Code is pluggable to arbitrary OpenAI- or
 * Anthropic-compatible backends — on the machine this was written against, the
 * model names logged were `claude-sonnet-4-5` and `claude-haiku-4-5`, i.e. this
 * particular install was routed through a custom/litellm endpoint rather than
 * Alibaba's own Qwen models, so even the model name does not reliably identify
 * a vendor to price against; (2) Qwen Code's own hosted models are commonly
 * used via a subscription/OAuth flow rather than metered API keys, the same
 * situation that keeps Codex's confidence `unavailable`.
 */

import { createReadStream } from "fs";
import { createInterface } from "readline";
import { readdir, stat } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import type {
  LocalUsageQwenRawUsage,
  LocalUsageReader,
  LocalUsageScanError,
  LocalUsageScanOptions,
  LocalUsageScanResult,
  LocalUsageTotals,
} from "../types/index.js";
import { resolveScanCutoffMs } from "./scanWindow.js";

const CLI_ID = "qwen-code" as const;

function projectsRoot(): string {
  return join(homedir(), ".qwen", "projects");
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
 * A scan that cannot read a directory must say so.
 *
 * Swallowing every readdir failure made an unreadable tree indistinguishable
 * from an empty one: the report showed zero usage, no failure entry, and an
 * operator with a permissions problem had nothing to look at. ENOENT stays
 * silent because a missing root legitimately means "nothing recorded yet";
 * anything else is a real failure and is surfaced.
 */
function isMissing(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "ENOENT"
  );
}

/** Every `chats/` directory, one per project, under the Qwen projects root. */
async function collectChatsDirs(
  root: string,
  errors: LocalUsageScanError[],
): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
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
  const dirs: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const chatsDir = join(root, entry.name, "chats");
    try {
      const info = await stat(chatsDir);
      if (info.isDirectory()) {
        dirs.push(chatsDir);
      }
    } catch {
      // No `chats/` for this project — nothing recorded yet.
    }
  }
  return dirs;
}

/** Every `.jsonl` transcript at any depth under a `chats/` directory. */
async function collectTranscripts(
  dir: string,
  out: string[],
  errors: LocalUsageScanError[],
): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (!isMissing(error)) {
      errors.push({
        cliId: CLI_ID,
        filePath: dir,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectTranscripts(full, out, errors);
    } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      out.push(full);
    }
  }
}

/**
 * Dedup is by `uuid`, keeping the LARGEST total-token count seen for that id
 * — the same "resumed session re-logs a turn" protection `claudeCodeReader.ts`
 * uses, applied here on the off chance a resumed Qwen session does the same.
 * The map is per-file and discarded after, so it stays bounded regardless of
 * how many files a scan covers.
 */
async function foldTranscript(
  filePath: string,
  totals: LocalUsageTotals,
  unpriced: Set<string>,
): Promise<void> {
  const seen = new Map<
    string,
    { model: string; input: number; output: number; cached: number }
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
        uuid?: string;
        model?: string;
        usageMetadata?: LocalUsageQwenRawUsage;
      };
      if (record.type !== "assistant" || !record.usageMetadata) {
        continue;
      }
      const id = record.uuid;
      if (typeof id !== "string" || id.length === 0) {
        continue;
      }
      const usage = record.usageMetadata;
      const prompt = num(usage.promptTokenCount);
      const cached = num(usage.cachedContentTokenCount);
      const candidate = {
        model: record.model ?? "unknown",
        input: Math.max(0, prompt - cached),
        output: num(usage.candidatesTokenCount) + num(usage.thoughtsTokenCount),
        cached,
      };
      const existing = seen.get(id);
      // Cached tokens are part of the raw prompt, so a record can carry more
      // total usage and still lose on input+output alone — keep-max would then
      // keep the smaller of two duplicates.
      const candidateTotal =
        candidate.input + candidate.output + candidate.cached;
      const existingTotal = existing
        ? existing.input + existing.output + existing.cached
        : -1;
      if (!existing || candidateTotal > existingTotal) {
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
    totals.cacheReadTokens += turn.cached;
    // Cost is unavailable for this reader (see module header), so every turn
    // is unpriced by construction rather than by a failed lookup.
    totals.unpricedRequests += 1;
    unpriced.add(turn.model);
  }
}

export async function createQwenCodeReader(): Promise<LocalUsageReader> {
  return {
    descriptor: {
      id: CLI_ID,
      displayName: "Qwen Code",
      verified: true,
      dedupStrategy: "message-id-keep-max",
      costConfidence: "unavailable",
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

      const chatsDirs = await collectChatsDirs(projectsRoot(), errors);
      const files: string[] = [];
      for (const dir of chatsDirs) {
        await collectTranscripts(dir, files, errors);
      }

      // Only Infinity means "no time filter" — see scanWindow.ts. A cutoff of
      // `undefined` reads everything; any finite number is an mtime floor.
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

      return { cliId: CLI_ID, totals, filesScanned, errors };
    },
  };
}
