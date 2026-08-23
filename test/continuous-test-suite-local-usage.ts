#!/usr/bin/env tsx

/**
 * Continuous Test Suite — Local Usage (Claude Code reader)
 *
 * Every case drives the shipped SDK surface: `readAllLocalUsage`,
 * `getLocalUsageDescriptors` and `createLocalUsageReader` are imported from
 * `../dist/index.js`, the same entry an SDK consumer gets from
 * `@juspay/neurolink`. Nothing is imported out of `src/lib/`, and nothing is
 * stubbed.
 *
 * Two kinds of case here, deliberately:
 *
 *   1. Fixture cases point HOME at a temp directory holding a hand-written
 *      transcript. That is still the public surface — the reader is reached
 *      through `readAllLocalUsage()` — but the input is controlled, which is
 *      the only way to assert the dedup rule exactly. Real transcripts cannot
 *      be made to contain a specific duplicate on demand.
 *
 *   2. Machine cases run against this machine's real `~/.claude/projects` and
 *      SKIP when it is absent, so the suite still proves the reader survives
 *      genuine data at genuine scale (17k+ files, ~10 GB) rather than only the
 *      shapes a fixture author thought of.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { defineSuite, log } from "./helpers/harness.js";

const { test, runSuite } = defineSuite("Local Usage");

const sdk = await import("../dist/index.js");
const { readAllLocalUsage, getLocalUsageDescriptors, createLocalUsageReader } =
  sdk as unknown as {
    readAllLocalUsage: (o?: {
      sinceDays?: number;
    }) => Promise<LocalReportShape>;
    getLocalUsageDescriptors: () => Array<{
      id: string;
      displayName: string;
      verified: boolean;
      dedupStrategy: string;
      costConfidence: string;
      requiresSqlite: boolean;
    }>;
    createLocalUsageReader: (id: string) => Promise<{
      detect: () => Promise<boolean>;
      scan: (o?: { sinceDays?: number }) => Promise<{
        filesScanned: number;
        totals: LocalTotalsShape;
      }>;
    }>;
  };

type LocalTotalsShape = {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  costUsd: number;
  costConfidence: string;
  unpricedRequests: number;
  unpricedModels: string[];
};

type LocalReportShape = {
  generatedAt: string;
  totals: Record<string, LocalTotalsShape | undefined>;
  failures: Array<{ cliId: string; message: string }>;
  notInstalled: string[];
};

function assert(condition: boolean, message: string): void {
  if (!condition) {
    // No payload interpolation here on purpose: `defineSuite` downgrades a
    // thrown error to SKIP when its text looks like a provider error, so an
    // assertion message quoting real content can turn a genuine failure green.
    throw new Error(message);
  }
}

/**
 * Build a temp HOME containing one Claude Code transcript.
 *
 * The layout matches the real one: `~/.claude/projects/<sanitized-cwd>/`, with
 * a nested `subagents/` directory, because subagent transcripts are the large
 * majority of files on a real machine and a reader that skipped them would
 * miss most of the spend.
 */
function writeFixtureHome(lines: string[], subagentLines?: string[]): string {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "nl-localusage-"));
  const project = path.join(home, ".claude", "projects", "-tmp-fixture");
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(
    path.join(project, "session-a.jsonl"),
    lines.join("\n") + "\n",
  );
  if (subagentLines) {
    const nested = path.join(project, "session-a", "subagents");
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(
      path.join(nested, "agent-one.jsonl"),
      subagentLines.join("\n") + "\n",
    );
  }
  return home;
}

function assistantLine(
  id: string,
  model: string,
  usage: Record<string, number>,
): string {
  return JSON.stringify({
    type: "assistant",
    message: { id, model, role: "assistant", usage },
  });
}

async function withHome<T>(home: string, fn: () => Promise<T>): Promise<T> {
  const prev = process.env.HOME;
  const prevProfile = process.env.USERPROFILE;
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  try {
    return await fn();
  } finally {
    if (prev === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prev;
    }
    if (prevProfile === undefined) {
      delete process.env.USERPROFILE;
    } else {
      process.env.USERPROFILE = prevProfile;
    }
    fs.rmSync(home, { recursive: true, force: true });
  }
}

/**
 * Build a temp HOME containing one Codex rollout.
 *
 * Layout matches the real one: `~/.codex/sessions/<yyyy>/<mm>/<dd>/rollout-*.jsonl`,
 * nested by date, so the reader's directory walk is exercised rather than
 * assumed.
 */
function writeCodexFixtureHome(lines: string[]): string {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "nl-codexusage-"));
  const dir = path.join(home, ".codex", "sessions", "2026", "05", "22");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "rollout-2026-05-22T21-39-27-fixture.jsonl"),
    lines.join("\n") + "\n",
  );
  return home;
}

/** One `token_count` event, carrying both counters the real format carries. */
function codexTokenCount(
  cumulative: { input: number; output: number; cached: number },
  perTurn: { input: number; output: number; cached: number },
): string {
  const shape = (t: { input: number; output: number; cached: number }) => ({
    input_tokens: t.input,
    cached_input_tokens: t.cached,
    output_tokens: t.output,
    reasoning_output_tokens: 0,
    total_tokens: t.input + t.output,
  });
  return JSON.stringify({
    timestamp: "2026-05-22T16:11:27.095Z",
    type: "event_msg",
    payload: {
      type: "token_count",
      info: {
        total_token_usage: shape(cumulative),
        last_token_usage: shape(perTurn),
        model_context_window: 258400,
      },
      rate_limits: { limit_id: "codex", plan_type: "prolite" },
    },
  });
}

function codexTurnContext(model: string): string {
  return JSON.stringify({
    timestamp: "2026-05-22T16:11:12.517Z",
    type: "turn_context",
    payload: { turn_id: "t1", model, cwd: "/tmp/fixture" },
  });
}

/**
 * Build a temp HOME containing an OpenCode SQLite store.
 *
 * Written with the same `node:sqlite` the reader uses, so the fixture cannot
 * drift from the shape the reader expects by using a different writer.
 */
async function writeOpenCodeFixtureHome(
  messages: Array<Record<string, unknown>>,
): Promise<string> {
  const { DatabaseSync } = await import("node:sqlite");
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "nl-ocusage-"));
  const dir = path.join(home, ".local", "share", "opencode");
  fs.mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(path.join(dir, "opencode.db"));
  db.exec(
    "CREATE TABLE message (id TEXT, session_id TEXT, time_created INTEGER, time_updated INTEGER, data TEXT)",
  );
  const insert = db.prepare(
    "INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES (?, ?, ?, ?, ?)",
  );
  messages.forEach((m, index) => {
    insert.run(
      `msg_${index}`,
      "ses_fixture",
      Date.now(),
      Date.now(),
      JSON.stringify(m),
    );
  });
  db.close();
  return home;
}

function openCodeMessage(tokens: {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}): Record<string, unknown> {
  return {
    role: "assistant",
    modelID: "claude-opus-4.6",
    providerID: "github-copilot",
    cost: 0,
    tokens: {
      input: tokens.input,
      output: tokens.output,
      reasoning: 0,
      total:
        tokens.input + tokens.output + tokens.cacheRead + tokens.cacheWrite,
      cache: { read: tokens.cacheRead, write: tokens.cacheWrite },
    },
  };
}

async function runAllTests(): Promise<void> {
  await test("the SDK exports the local-usage surface", async () => {
    assert(
      typeof readAllLocalUsage === "function",
      "readAllLocalUsage is not a runtime export of dist/index.js",
    );
    assert(
      typeof getLocalUsageDescriptors === "function",
      "getLocalUsageDescriptors is not a runtime export of dist/index.js",
    );
    const descriptors = getLocalUsageDescriptors();
    const claude = descriptors.find((d) => d.id === "claude-code");
    assert(claude !== undefined, "no claude-code reader is registered");
    assert(
      claude?.dedupStrategy === "message-id-keep-max",
      "the claude-code descriptor does not declare the keep-max dedup strategy",
    );
    log(`registered readers: ${descriptors.map((d) => d.id).join(", ")}`);
  });

  await test("a re-logged turn counts once, at its largest output count", async () => {
    // A resumed session re-writes turns it already logged, and the second
    // copy can carry a HIGHER output count than the first. Summing both
    // double-counts; taking the first under-counts; taking the last is only
    // right by luck. The rule is max-per-id, and this is the case that
    // distinguishes all four.
    // BOTH orderings are present on purpose. With the duplicate pair only
    // ever ascending, keep-max and plain last-write-wins produce identical
    // totals and the case passes against either — it was written that way
    // first and did exactly that. msg_B descends, so last-write-wins scores
    // 30 where keep-max scores 90, and first-write-wins fails on msg_A.
    const home = writeFixtureHome([
      assistantLine("msg_A", "claude-sonnet-4-5", {
        input_tokens: 10,
        output_tokens: 100,
        cache_read_input_tokens: 5,
        cache_creation_input_tokens: 7,
      }),
      // Same id, resumed, LARGER output — defeats first-write-wins.
      assistantLine("msg_A", "claude-sonnet-4-5", {
        input_tokens: 10,
        output_tokens: 250,
        cache_read_input_tokens: 5,
        cache_creation_input_tokens: 7,
      }),
      assistantLine("msg_B", "claude-sonnet-4-5", {
        input_tokens: 3,
        output_tokens: 90,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
      }),
      // Same id, re-logged SMALLER — defeats last-write-wins.
      assistantLine("msg_B", "claude-sonnet-4-5", {
        input_tokens: 3,
        output_tokens: 30,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
      }),
    ]);

    const report = await withHome(home, () =>
      readAllLocalUsage({ sinceDays: Infinity }),
    );
    const totals = report.totals["claude-code"];
    assert(totals !== undefined, "the claude-code reader produced no totals");

    assert(
      totals!.requests === 2,
      `re-logged turn was not deduplicated — expected 2 requests, got ${totals!.requests}`,
    );
    assert(
      totals!.outputTokens === 340,
      `dedup did not keep the largest output count — expected 340, got ${totals!.outputTokens}`,
    );
    log("a resumed turn is counted once, at its largest output count");
  });

  await test("subagent transcripts are counted, not skipped", async () => {
    // On a real machine these outnumber top-level session files roughly 170:1.
    // A reader globbing only <project>/*.jsonl would report a fraction of the
    // real spend while looking perfectly healthy.
    const home = writeFixtureHome(
      [
        assistantLine("msg_TOP", "claude-sonnet-4-5", {
          input_tokens: 1,
          output_tokens: 10,
        }),
      ],
      [
        assistantLine("msg_SUB", "claude-sonnet-4-5", {
          input_tokens: 1,
          output_tokens: 40,
        }),
      ],
    );

    const report = await withHome(home, () =>
      readAllLocalUsage({ sinceDays: Infinity }),
    );
    const totals = report.totals["claude-code"];
    assert(totals !== undefined, "the claude-code reader produced no totals");
    assert(
      totals!.requests === 2,
      `nested subagent transcript was not read — expected 2 requests, got ${totals!.requests}`,
    );
    assert(
      totals!.outputTokens === 50,
      `subagent output tokens were not counted — expected 50, got ${totals!.outputTokens}`,
    );
    log("subagent transcripts under <session>/subagents/ are included");
  });

  await test("non-message record types are skipped, not failed", async () => {
    // A real transcript carries at least eleven `type` values, several with no
    // `message` key at all. Treating those as malformed would turn every
    // ordinary file into an error.
    const home = writeFixtureHome([
      JSON.stringify({ type: "last-prompt", value: "hi" }),
      JSON.stringify({ type: "mode", mode: "default" }),
      JSON.stringify({ type: "permission-mode", mode: "acceptEdits" }),
      JSON.stringify({ type: "file-history-snapshot", files: [] }),
      JSON.stringify({ type: "user", message: { role: "user" } }),
      assistantLine("msg_ONLY", "claude-sonnet-4-5", {
        input_tokens: 2,
        output_tokens: 20,
      }),
      "", // blank line
      "not json at all", // a torn trailing write
    ]);

    const report = await withHome(home, () =>
      readAllLocalUsage({ sinceDays: Infinity }),
    );
    const totals = report.totals["claude-code"];
    assert(totals !== undefined, "the claude-code reader produced no totals");
    assert(
      report.failures.length === 0,
      "metadata records or a torn line were reported as a reader failure",
    );
    assert(
      totals!.requests === 1,
      `non-assistant records were miscounted — expected 1 request, got ${totals!.requests}`,
    );
    log("metadata rows, blank lines and a torn trailing line are tolerated");
  });

  await test("an unpriced model is reported, not silently zeroed", async () => {
    // Claude Code logs an internal "<synthetic>" model that has no rate entry.
    // Its turns are real and must be counted; its cost is unknown and must be
    // declared rather than folded in as $0.
    const home = writeFixtureHome([
      assistantLine("msg_S", "<synthetic>", {
        input_tokens: 5,
        output_tokens: 15,
      }),
    ]);

    const report = await withHome(home, () =>
      readAllLocalUsage({ sinceDays: Infinity }),
    );
    const totals = report.totals["claude-code"];
    assert(totals !== undefined, "the claude-code reader produced no totals");
    assert(
      totals!.requests === 1,
      "a turn on an unpriced model was dropped from the request count",
    );
    assert(
      totals!.unpricedRequests === 1,
      "an unpriced turn was not reported as unpriced",
    );
    assert(
      totals!.unpricedModels.includes("<synthetic>"),
      "the unpriced model was not named in unpricedModels",
    );
    log("unpriced turns are counted and named rather than billed at zero");
  });

  await test("a CLI with no local store is absent, not failed", async () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "nl-localusage-empty-"));
    const report = await withHome(home, () => readAllLocalUsage());
    assert(
      report.failures.length === 0,
      "an uninstalled CLI was reported as a reader failure",
    );
    assert(
      report.notInstalled.includes("claude-code"),
      "an uninstalled CLI was not reported under notInstalled",
    );
    assert(
      report.totals["claude-code"] === undefined,
      "an uninstalled CLI produced totals",
    );
    log("an absent store reports as notInstalled rather than as an error");
  });

  await test("this machine's real transcripts scan coherently", async () => {
    const realProjects = path.join(os.homedir(), ".claude", "projects");
    if (!fs.existsSync(realProjects)) {
      throw new Error("SKIP: no ~/.claude/projects on this machine");
    }

    const reader = await createLocalUsageReader("claude-code");
    assert(await reader.detect(), "detect() denied a store that exists");

    const day = await reader.scan({ sinceDays: 1 });
    const week = await reader.scan({ sinceDays: 7 });

    if (day.totals.requests === 0) {
      throw new Error("SKIP: no Claude Code activity in the last day");
    }

    // Widening the window can only add files, never remove them. A broken
    // mtime filter shows up here as a smaller total for the wider window.
    assert(
      week.filesScanned >= day.filesScanned,
      "a wider time window scanned fewer files than a narrower one",
    );
    assert(
      week.totals.requests >= day.totals.requests,
      "a wider time window produced fewer requests than a narrower one",
    );

    // Internal coherence, on data nobody authored for this test.
    assert(
      day.totals.unpricedRequests <= day.totals.requests,
      "more turns were reported unpriced than were counted at all",
    );
    assert(
      day.totals.unpricedModels.length > 0 === day.totals.unpricedRequests > 0,
      "unpricedModels and unpricedRequests disagree about whether anything was unpriced",
    );
    assert(
      day.totals.costUsd > 0,
      "a day of real priced traffic produced no cost at all",
    );
    assert(
      day.totals.outputTokens > 0 && day.totals.inputTokens >= 0,
      "real traffic produced no output tokens",
    );

    log(
      `real scan: ${day.totals.requests} turns over ${day.filesScanned} files in 1d, ` +
        `${week.totals.requests} over ${week.filesScanned} in 7d`,
    );
  });

  await test("an unreadable project directory is skipped, not fatal", async () => {
    // collectTranscripts swallows readdir failures and returns. That is the
    // right behaviour — one project directory the user cannot read must not
    // cost them the totals from the other eleven thousand files — but it is
    // silent by construction, so nothing would notice if it stopped being
    // true. A scan that aborted here would look identical to a machine with
    // less usage on it.
    const home = writeFixtureHome([
      assistantLine("msg_READABLE", "claude-sonnet-4-5", {
        input_tokens: 7,
        output_tokens: 70,
      }),
    ]);

    const locked = path.join(
      home,
      ".claude",
      "projects",
      "-tmp-locked-project",
    );
    fs.mkdirSync(locked, { recursive: true });
    fs.writeFileSync(
      path.join(locked, "unreachable.jsonl"),
      assistantLine("msg_HIDDEN", "claude-sonnet-4-5", {
        input_tokens: 999,
        output_tokens: 999,
      }) + "\n",
    );
    fs.chmodSync(locked, 0o000);

    // Running as root defeats the permission bit entirely, and a test that
    // silently proves nothing is worse than one that says so.
    let readdirDenied = false;
    try {
      fs.readdirSync(locked);
    } catch {
      readdirDenied = true;
    }
    if (!readdirDenied) {
      fs.chmodSync(locked, 0o755);
      fs.rmSync(home, { recursive: true, force: true });
      throw new Error(
        "SKIP: this process can read a 0o000 directory (running as root?)",
      );
    }

    try {
      // The chmod is restored INSIDE the callback, before withHome's own
      // cleanup runs: a 0o000 directory defeats rmSync too, so leaving it
      // locked turns this case's teardown into an ENOTEMPTY that reads as a
      // failure of the thing under test rather than of the fixture.
      const report = await withHome(home, async () => {
        const scanned = await readAllLocalUsage({ sinceDays: Infinity });
        fs.chmodSync(locked, 0o755);
        return scanned;
      });
      const totals = report.totals["claude-code"];
      assert(
        totals !== undefined,
        "an unreadable directory aborted the whole scan",
      );
      assert(
        report.failures.length === 0,
        "an unreadable directory was reported as a reader failure",
      );
      assert(
        totals!.requests === 1 && totals!.outputTokens === 70,
        "the readable transcript was lost when a sibling directory could not be read",
      );
      log(
        "an unreadable project directory is skipped; the rest of the scan survives",
        "green",
      );
      return true;
    } finally {
      // Restore before cleanup, or rmSync cannot descend either.
      try {
        fs.chmodSync(locked, 0o755);
      } catch {
        // already gone
      }
    }
  });

  await test("Codex: the cumulative counter is used, not a sum of per-turn values", async () => {
    // This is the whole design decision, and the naive implementation is the
    // wrong one. Every token_count event carries a cumulative
    // total_token_usage AND a per-turn last_token_usage; the per-turn value
    // repeats across events within a turn, so summing it double-counts.
    // Measured over 108 real sessions, summing gave 9,191,613,238 tokens
    // against a true 5,653,217,442 — 62.6% over, and 195% on the worst file.
    //
    // The fixture below is built so the two strategies cannot agree:
    //   sum of per-turn : 100 + 200 + 200 + 300 = 800 output
    //   cumulative final: 600 output
    // A reader that sums reports 800. A correct one reports 600.
    const home = writeCodexFixtureHome([
      codexTurnContext("gpt-5.5"),
      codexTokenCount(
        { input: 1000, output: 100, cached: 400 },
        { input: 1000, output: 100, cached: 400 },
      ),
      codexTokenCount(
        { input: 3000, output: 300, cached: 1200 },
        { input: 2000, output: 200, cached: 800 },
      ),
      // Repeated event for the same turn — the cumulative total does not
      // advance, which is exactly what makes summing wrong.
      codexTokenCount(
        { input: 3000, output: 300, cached: 1200 },
        { input: 2000, output: 200, cached: 800 },
      ),
      codexTokenCount(
        { input: 6000, output: 600, cached: 2400 },
        { input: 3000, output: 300, cached: 1200 },
      ),
    ]);

    const report = await withHome(home, () =>
      readAllLocalUsage({ sinceDays: Infinity }),
    );
    const totals = report.totals["codex"];
    assert(totals !== undefined, "the codex reader produced no totals");

    assert(
      totals!.outputTokens === 600,
      `per-turn values were summed instead of using the cumulative counter — expected 600 output, got ${totals!.outputTokens}`,
    );
    // input is reported net of the cached subset: 6000 - 2400.
    assert(
      totals!.inputTokens === 3600 && totals!.cacheReadTokens === 2400,
      `cached tokens were not separated from input — expected 3600/2400, got ${totals!.inputTokens}/${totals!.cacheReadTokens}`,
    );
    // Three of the four events advanced the counter; the repeat did not.
    assert(
      totals!.requests === 3,
      `a repeated token_count event was counted as a billable turn — expected 3, got ${totals!.requests}`,
    );
    log(
      "Codex usage comes from the cumulative counter, with cached split out of input",
      "green",
    );
  });

  await test("Codex: subscription usage reports no invented cost", async () => {
    // Codex is a ChatGPT subscription — the rollouts carry rate_limits.plan_type.
    // A per-token dollar figure would be an invention, so the tokens are real
    // and the cost is declared unavailable rather than quietly zero.
    const home = writeCodexFixtureHome([
      codexTurnContext("gpt-5.5"),
      codexTokenCount(
        { input: 500, output: 50, cached: 100 },
        { input: 500, output: 50, cached: 100 },
      ),
    ]);

    const report = await withHome(home, () =>
      readAllLocalUsage({ sinceDays: Infinity }),
    );
    const totals = report.totals["codex"];
    assert(totals !== undefined, "the codex reader produced no totals");
    assert(
      totals!.costConfidence === "unavailable",
      "a subscription CLI reported a cost confidence other than unavailable",
    );
    assert(totals!.costUsd === 0, "a subscription CLI invented a dollar cost");
    assert(
      totals!.unpricedRequests === totals!.requests,
      "a subscription CLI did not report all of its turns as unpriced",
    );
    assert(
      totals!.unpricedModels.includes("gpt-5.5"),
      "the model behind unpriced subscription turns was not named",
    );
    log(
      "Codex reports real tokens and an explicitly unavailable cost",
      "green",
    );
  });

  await test("Codex: this machine's real rollouts scan coherently", async () => {
    const realSessions = path.join(os.homedir(), ".codex", "sessions");
    if (!fs.existsSync(realSessions)) {
      throw new Error("SKIP: no ~/.codex/sessions on this machine");
    }
    const reader = await createLocalUsageReader("codex");
    assert(await reader.detect(), "detect() denied a store that exists");

    const week = await reader.scan({ sinceDays: 7 });
    const month = await reader.scan({ sinceDays: 30 });

    if (week.totals.requests === 0 && month.totals.requests === 0) {
      throw new Error("SKIP: no Codex activity in the last 30 days");
    }

    assert(
      month.filesScanned >= week.filesScanned,
      "a wider time window scanned fewer rollouts than a narrower one",
    );
    assert(
      month.totals.requests >= week.totals.requests,
      "a wider time window produced fewer turns than a narrower one",
    );
    assert(
      month.totals.costUsd === 0 &&
        month.totals.costConfidence === "unavailable",
      "real Codex rollouts produced an invented cost",
    );
    log(
      `real Codex scan: ${month.totals.requests} turns over ${month.filesScanned} rollouts in 30d`,
      "green",
    );
  });

  await test("OpenCode: cache tokens are disjoint from input, not subtracted", async () => {
    // The convention differs per CLI and cannot be inferred from a sibling
    // reader. Verified across all 4,674 usage-bearing messages on a real
    // store: `total` equals input + output + cache.read + cache.write, so
    // cache is DISJOINT from input here. Codex is the opposite — its
    // `cached_input_tokens` is a SUBSET of `input_tokens` and the reader
    // subtracts it back out.
    //
    // This fixture is built so applying Codex's rule here is visible:
    // subtracting cache from input would report 700 input instead of 1000.
    const home = await writeOpenCodeFixtureHome([
      openCodeMessage({
        input: 1000,
        output: 200,
        cacheRead: 300,
        cacheWrite: 50,
      }),
    ]);

    const report = await withHome(home, () =>
      readAllLocalUsage({ sinceDays: Infinity }),
    );
    const totals = report.totals["opencode"];
    assert(totals !== undefined, "the opencode reader produced no totals");
    assert(
      totals!.inputTokens === 1000,
      `cache was subtracted from input as if this were Codex — expected 1000, got ${totals!.inputTokens}`,
    );
    assert(
      totals!.cacheReadTokens === 300 && totals!.cacheCreationTokens === 50,
      `cache read/write were not carried through — expected 300/50, got ${totals!.cacheReadTokens}/${totals!.cacheCreationTokens}`,
    );
    assert(
      totals!.outputTokens === 200,
      `output tokens were altered — expected 200, got ${totals!.outputTokens}`,
    );
    log(
      "OpenCode cache tokens are added alongside input, not subtracted from it",
      "green",
    );
  });

  await test("OpenCode: assistant rows with no tokens are not counted as turns", async () => {
    // 56 of 4,674 rows on a real store are assistant messages whose token
    // fields are all zero. Counting them inflates the turn count while
    // adding nothing, which makes an average-tokens-per-turn figure wrong
    // without making any total wrong — the kind of error that survives a
    // glance at the headline number.
    const home = await writeOpenCodeFixtureHome([
      openCodeMessage({ input: 10, output: 5, cacheRead: 0, cacheWrite: 0 }),
      openCodeMessage({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }),
      { role: "user", modelID: "claude-opus-4.6", tokens: { input: 999 } },
    ]);

    const report = await withHome(home, () =>
      readAllLocalUsage({ sinceDays: Infinity }),
    );
    const totals = report.totals["opencode"];
    assert(totals !== undefined, "the opencode reader produced no totals");
    assert(
      totals!.requests === 1,
      `empty or non-assistant rows were counted as turns — expected 1, got ${totals!.requests}`,
    );
    assert(
      totals!.inputTokens === 10,
      `a non-assistant row's tokens were counted — expected 10, got ${totals!.inputTokens}`,
    );
    log("empty and non-assistant OpenCode rows are skipped", "green");
  });

  await test("OpenCode: this machine's real store scans coherently", async () => {
    const realDb = path.join(
      os.homedir(),
      ".local",
      "share",
      "opencode",
      "opencode.db",
    );
    if (!fs.existsSync(realDb)) {
      throw new Error("SKIP: no OpenCode store on this machine");
    }
    const reader = await createLocalUsageReader("opencode");
    assert(await reader.detect(), "detect() denied a store that exists");

    const all = await reader.scan({ sinceDays: Infinity });
    if (all.totals.requests === 0) {
      throw new Error("SKIP: OpenCode store has no usage-bearing messages");
    }

    assert(
      all.errors.length === 0,
      "reading the real OpenCode store reported an error",
    );
    assert(
      all.totals.costConfidence === "unavailable" && all.totals.costUsd === 0,
      "OpenCode invented a cost despite reporting none of its own",
    );
    assert(
      all.totals.unpricedRequests === all.totals.requests,
      "not every OpenCode turn was reported as unpriced",
    );
    assert(
      all.totals.unpricedModels.length > 0,
      "no models were named behind the unpriced turns",
    );
    log(
      `real OpenCode scan: ${all.totals.requests} turns, models ${all.totals.unpricedModels.slice(0, 3).join(", ")}`,
      "green",
    );
  });

  await test("repeated scans of the same data agree", async () => {
    // The reader keeps a per-file dedup map. If any of it leaked across calls,
    // a second scan of identical input would drift.
    const home = writeFixtureHome([
      assistantLine("msg_1", "claude-sonnet-4-5", {
        input_tokens: 4,
        output_tokens: 40,
      }),
      assistantLine("msg_2", "claude-sonnet-4-5", {
        input_tokens: 6,
        output_tokens: 60,
      }),
    ]);

    const [first, second] = await withHome(home, async () => [
      await readAllLocalUsage({ sinceDays: Infinity }),
      await readAllLocalUsage({ sinceDays: Infinity }),
    ]);

    assert(
      JSON.stringify(first.totals) === JSON.stringify(second.totals),
      "two scans of identical input produced different totals",
    );
    log("scanning is idempotent across calls");
  });
}

await runSuite(runAllTests);
