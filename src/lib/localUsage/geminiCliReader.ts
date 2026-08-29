/**
 * Reads token usage out of Gemini CLI's own session transcripts.
 *
 * Layout, confirmed on a real machine (18 files spanning June–August 2026):
 * `~/.gemini/tmp/<projectSlug>/chats/session-<timestamp>-<id>.jsonl`. The
 * sibling `~/.gemini/history/<projectSlug>/` directories are a git-based
 * shadow-history of edited files, not chat logs — no JSONL lives there.
 *
 * Each file is a small append-only patch log rather than one JSON object per
 * line of "the same shape": line 0 is a header (`sessionId`, `projectHash`,
 * `startTime`, `lastUpdated`, `kind`); every line after that is either
 * `{"$set": {...}}` (a partial merge — `messages` on session bootstrap,
 * scalar fields like `lastUpdated`/`summary` afterwards) or a bare message
 * object appended directly. Confirmed on the installed CLI's own bundled
 * source (`@google/gemini-cli` `ChatRecordingService.pushMessage`): a bare
 * append is `appendRecord(msg)` with no wrapper, which is why real transcripts
 * mix both shapes. This reader unwraps `$set.messages[]` (only ever seen once
 * per file, holding the single injected `<session_context>` bootstrap
 * message) and reads bare objects that carry `id`/`type` directly.
 *
 * The installed source also revealed a real double-write race, invisible in
 * this machine's own samples (0 duplicate ids across all 18 files) but
 * reachable on any machine: `recordMessage()` first pushes a `type: "gemini"`
 * message with whatever `tokens` value is already queued (often `null`,
 * before the response's usage metadata has arrived), and
 * `recordMessageTokens()` — called separately once usage arrives — re-pushes
 * the SAME message id with `tokens` now filled in if it finds the last
 * message still token-less. `pushMessage()` unconditionally appends a new
 * line every time it is called, even for an id it has already written. So the
 * same `id` can legitimately appear twice: once without tokens, once with.
 * Dedup here keeps, per id, whichever record has the larger `tokens.total`
 * (a record with no tokens contributes 0), which is correct for both that
 * race and an ordinary resumed-session replay. The map is per-file, mirroring
 * `claudeCodeReader.ts`.
 *
 * `tokens` is `{input, output, cached, thoughts, tool, total}`, and the source
 * (`recordMessageTokens`) maps it straight from the GenAI response's own
 * `usageMetadata` — `input = promptTokenCount`, `output = candidatesTokenCount`,
 * `cached = cachedContentTokenCount`, `thoughts = thoughtsTokenCount`,
 * `tool = toolUsePromptTokenCount`, `total = totalTokenCount`. Real data
 * confirms `total = input + output + thoughts + tool` and that `cached` is a
 * SUBSET of `input`: the one real record with nonzero cache had
 * `input: 12121, cached: 4073`, and `total (12344) = input (12121) + output
 * (1) + thoughts (222)` — cached tokens are not added on top of input, they
 * are already inside it. So `inputTokens` here is `input - cached`, the same
 * subtraction `codexReader.ts` and `qwenCodeReader.ts` make for the same
 * reason: this subsystem's `LocalUsageTotals.inputTokens` +
 * `.cacheReadTokens` must sum to the true prompt size without double-counting.
 * No cache-CREATION concept exists in this API family's usage metadata, so
 * `cacheCreationTokens` stays 0.
 *
 * The write path also nests subagent transcripts one level deeper —
 * `chats/<parentSessionId>/<subagentSessionId>.jsonl`, per the same source —
 * so this reader recurses under `chats/` rather than globbing one level, even
 * though no nested subagent file exists on the machine this was verified
 * against.
 *
 * Cost is deliberately `unavailable`. Gemini CLI supports three genuinely
 * different auth modes with unrelated billing (`gemini-api-key`: metered, and
 * the Flash models specifically have a real free tier; `oauth-personal`: free,
 * rate-limited; `vertex-ai`: billed to a GCP project at negotiated rates), and
 * no session record — not the header, not a message — carries which mode was
 * active when it was written. `settings.json` records only the CURRENT mode,
 * which cannot be projected onto historical sessions. Modeling a per-token
 * dollar figure from the public API price list would misrepresent every
 * free-tier or Vertex-billed session as if it were pay-as-you-go. Concretely,
 * on the reference machine even the majority model logged (`gemini-3.5-flash`,
 * 12 of 14 sampled turns) has no entry in `pricing.ts` at all — only the
 * minority model (`gemini-3-flash-preview`) does — so most real traffic would
 * be unpriced regardless.
 */

import { createReadStream } from "fs";
import { createInterface } from "readline";
import { readdir, stat } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import type {
  LocalUsageGeminiMessageRecord,
  LocalUsageReader,
  LocalUsageScanError,
  LocalUsageScanOptions,
  LocalUsageScanResult,
  LocalUsageTotals,
} from "../types/index.js";
import { resolveScanCutoffMs } from "./scanWindow.js";

const CLI_ID = "gemini-cli" as const;

function tmpRoot(): string {
  return join(homedir(), ".gemini", "tmp");
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

/** Every `chats/` directory, one per project, under `~/.gemini/tmp`. */
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
      // No `chats/` for this project temp dir — nothing recorded yet.
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

/** Pull the message-like objects out of one parsed JSONL line, if any. */
function messagesFromLine(parsed: unknown): LocalUsageGeminiMessageRecord[] {
  if (typeof parsed !== "object" || parsed === null) {
    return [];
  }
  const record = parsed as {
    $set?: { messages?: unknown };
    id?: unknown;
    type?: unknown;
  };
  // `!== undefined` also admits `$set: null`, and reading `.messages` off it
  // throws. So does a null element surviving into the loop, where `msg.type`
  // is read. Either exception escapes to the per-file catch and discards that
  // whole transcript's totals — one malformed line silently costing a file.
  if (record.$set !== undefined) {
    if (typeof record.$set !== "object" || record.$set === null) {
      return [];
    }
    const messages = record.$set.messages;
    return Array.isArray(messages)
      ? (messages.filter(
          (m): m is LocalUsageGeminiMessageRecord =>
            typeof m === "object" && m !== null,
        ) as LocalUsageGeminiMessageRecord[])
      : [];
  }
  if (typeof record.id === "string" && typeof record.type === "string") {
    return [parsed as LocalUsageGeminiMessageRecord];
  }
  return [];
}

/**
 * Dedup is by message `id`, keeping the larger `tokens.total` seen for that
 * id — see the module header for why the same id can legitimately appear
 * twice. The map is per-file and discarded after, bounding memory regardless
 * of how many files a scan covers.
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
    let lineNo = 0;
    for await (const line of rl) {
      lineNo += 1;
      if (lineNo === 1 || !line || line.charCodeAt(0) !== 123 /* '{' */) {
        // Line 0 is the session header, never a message.
        continue;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        continue;
      }
      for (const msg of messagesFromLine(parsed)) {
        if (msg.type !== "gemini" || !msg.tokens) {
          continue;
        }
        const id = msg.id;
        if (typeof id !== "string" || id.length === 0) {
          continue;
        }
        const tokens = msg.tokens;
        const input = num(tokens.input);
        const cached = num(tokens.cached);
        const candidate = {
          model: msg.model ?? "unknown",
          input: Math.max(0, input - cached),
          output: num(tokens.output) + num(tokens.thoughts) + num(tokens.tool),
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
    }
  } finally {
    rl.close();
  }

  for (const turn of seen.values()) {
    totals.requests += 1;
    totals.inputTokens += turn.input;
    totals.outputTokens += turn.output;
    totals.cacheReadTokens += turn.cached;
    totals.unpricedRequests += 1;
    unpriced.add(turn.model);
  }
}

export async function createGeminiCliReader(): Promise<LocalUsageReader> {
  return {
    descriptor: {
      id: CLI_ID,
      displayName: "Gemini CLI",
      verified: true,
      dedupStrategy: "message-id-keep-max",
      costConfidence: "unavailable",
      requiresSqlite: false,
    },

    detect: async () => {
      try {
        const info = await stat(tmpRoot());
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

      const chatsDirs = await collectChatsDirs(tmpRoot(), errors);
      const files: string[] = [];
      for (const dir of chatsDirs) {
        await collectTranscripts(dir, files, errors);
      }

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
