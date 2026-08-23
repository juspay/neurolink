#!/usr/bin/env tsx

/**
 * Continuous Test Suite: AutoResearch E2E (Consumer-Facing)
 *
 * Tests the consumer-facing flow: can a developer configure autoresearch,
 * point it at a real repo, run it, and get measurable improvements?
 *
 * ## Determinism exception (CLAUDE.md rule 15)
 *
 * Autoresearch is a background task system, not something a caller reaches
 * through `generate()` / `stream()`, so there is no public surface to drive.
 * `ResearchWorker` and `executeAutoresearchTick` are imported directly and run
 * against a fixture git repo, which is what makes branch creation, state files
 * and tick behaviour observable at all.
 *
 * No AI provider needed. Uses a deterministic fixture repo where
 * we simulate what the AI does (read file, write fix, commit, run experiment).
 *
 * GROUP 1 -- Pipeline Initialization (3 tests)
 *   Worker creates branch, state file, and tools are registered.
 *
 * GROUP 2 -- Experiment Cycle Mechanics (4 tests)
 *   Write candidate, commit, run experiment, accept/revert flow works
 *   end-to-end through the real tool implementations.
 *
 * GROUP 3 -- Results and Artifacts (3 tests)
 *   Results TSV, state.json, and git history are produced correctly.
 *
 * Run: npx tsx test/continuous-test-suite-autoresearch.ts
 *      pnpm run test:autoresearch
 *
 * The suite has two halves: an E2E half (no AI, runs unconditionally) and
 * a LIVE half (real provider, gated on HAS_PROVIDER — skips cleanly when
 * no provider keys are set). Originally split across
 * continuous-test-suite-autoresearch-e2e.ts + -live.ts; merged in May 2026.
 */

import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FIXTURE_REPO = join(__dirname, ".tmp-autoresearch-e2e-consumer");

// ============================================================
// LOGGING
// ============================================================

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};

function log(msg: string, color = C.reset): void {
  console.log(`${color}${msg}${C.reset}`);
}

function banner(title: string): void {
  log(`\n${"=".repeat(60)}`, C.cyan);
  log(`  ${title}`, C.cyan);
  log("=".repeat(60), C.cyan);
}

function pass(name: string, detail = ""): void {
  const d = detail ? ` -- ${detail}` : "";
  log(`[PASS] ${name}${d}`, C.green);
}

function fail(name: string, detail = ""): void {
  const d = detail ? ` -- ${detail}` : "";
  log(`[FAIL] ${name}${d}`, C.red);
}

function skip(name: string, detail = ""): void {
  const d = detail ? ` -- ${detail}` : "";
  log(`[SKIP] ${name}${d}`, C.yellow);
}

// ============================================================
// RESULTS — delegate to shared harness
// ============================================================

// ---------------------------------------------------------------
// Imports + constants unique to autoresearch-live (the real-provider
// section absorbed from continuous-test-suite-autoresearch-live.ts).
// fs / path / child_process imports already declared above for the e2e
// half; only the live-specific additions appear here.
// ---------------------------------------------------------------
import { EventEmitter } from "node:events";
import { cpSync } from "node:fs";
import { resolve } from "node:path";
import type { Task } from "../src/lib/types/taskTypes.js";

// PROVIDER DETECTION (from autoresearch-live)
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const VERTEX_PROJECT = process.env.GOOGLE_VERTEX_PROJECT;
const VERTEX_LOCATION = process.env.GOOGLE_VERTEX_LOCATION;
const HAS_VERTEX = !!(VERTEX_PROJECT && VERTEX_LOCATION);
const HAS_PROVIDER = !!(HAS_VERTEX || ANTHROPIC_KEY || OPENAI_KEY);

// Determine which provider/model to use (prefer Vertex > Anthropic > OpenAI)
const PROVIDER = HAS_VERTEX ? "vertex" : ANTHROPIC_KEY ? "anthropic" : "openai";
const MODEL = HAS_VERTEX
  ? process.env.VERTEX_MODEL || "gemini-2.5-flash"
  : ANTHROPIC_KEY
    ? process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514"
    : process.env.OPENAI_MODEL || "gpt-4o-mini";

import {
  defineSuite,
  log as harnessLog,
  logSection,
  type ColorName,
  withCaseTimeout,
  isCaseTimeout,
} from "./helpers/harness.js";
import { isExpectedProviderError } from "./helpers/envGuard.js";

const { recordTest, runSuite } = defineSuite("AutoResearch (E2E + Live)");

// ============================================================
// SECTION 1: E2E TESTS — pure simulator harness, no live AI
// ============================================================

function record(name: string, ok: boolean | null, error?: string): void {
  recordTest(name, ok === true, ok === null, error);
}

// ============================================================
// FIXTURE SETUP
// ============================================================

/** Create a fixture repo with a file that has "bugs" (bare console.log in error paths) */
function createFixtureRepo(): void {
  rmSync(FIXTURE_REPO, { recursive: true, force: true });
  mkdirSync(FIXTURE_REPO, { recursive: true });

  // The "source code" to improve — 5 bugs (console.log instead of console.error)
  writeFileSync(
    join(FIXTURE_REPO, "server.ts"),
    `// Simple server with error handling issues
export function handleRequest(req: Request): Response {
  try {
    const body = parseBody(req);
    return new Response(JSON.stringify(body));
  } catch (error) {
    console.log("Request parsing failed:", error);  // BUG: should be console.error
    return new Response("Bad Request", { status: 400 });
  }
}

export function connectDB(url: string): void {
  if (!url) {
    console.log("Database URL is required");  // BUG: should be console.error
    throw new Error("Database URL is required");
  }
  try {
    // connect...
  } catch (error) {
    console.log("Database connection failed:", error);  // BUG: should be console.error
    throw error;
  }
}

export function loadConfig(path: string): Record<string, unknown> {
  try {
    // load config...
    return {};
  } catch (error) {
    console.log("Config load failed:", error);  // BUG: should be console.error
    return {};
  }
}

export function startServer(port: number): void {
  if (port < 0 || port > 65535) {
    console.log("Invalid port:", port);  // BUG: should be console.error
    throw new Error("Invalid port");
  }
  console.log("Server started on port", port);  // OK: this is informational
}

function parseBody(req: Request): unknown {
  return {};
}
`,
    "utf-8",
  );

  // The experiment script — counts bugs and runs tsc-like check
  writeFileSync(
    join(FIXTURE_REPO, "experiment.sh"),
    `#!/bin/bash
set -euo pipefail

# Count console.log in error/catch contexts (simplified: count lines with "console.log" that also have "error" or "failed" or "required" or "Invalid")
bug_count=$(grep -c 'console\\.log.*\\(error\\|failed\\|required\\|Invalid\\)' server.ts 2>/dev/null || echo "0")

# Simple syntax check — file must have balanced braces
open_braces=$(grep -o '{' server.ts | wc -l | tr -d ' ')
close_braces=$(grep -o '}' server.ts | wc -l | tr -d ' ')

if [ "$open_braces" != "$close_braces" ]; then
  echo "syntax_status:    FAIL"
  echo "bug_count:        $bug_count"
  echo "---"
  echo "bug_count:        $bug_count"
  echo "training_seconds: 0.1"
  echo "total_seconds:    0.1"
  echo "peak_vram_mb:     0.0"
  echo "FAIL: Unbalanced braces"
  exit 1
fi

echo "syntax_status:    PASS"
echo "bug_count:        $bug_count"
echo "---"
echo "bug_count:        $bug_count"
echo "training_seconds: 0.1"
echo "total_seconds:    0.1"
echo "peak_vram_mb:     0.0"
`,
    "utf-8",
  );

  // Research program
  writeFileSync(
    join(FIXTURE_REPO, "program.md"),
    `# Fix console.log in error paths
Replace console.log with console.error in catch blocks and error conditions.
The metric "bug_count" counts console.log calls in error contexts (lower is better).
`,
    "utf-8",
  );

  chmodSync(join(FIXTURE_REPO, "experiment.sh"), 0o755);
  const gitOpts = { cwd: FIXTURE_REPO, stdio: "ignore" as const };
  execFileSync("git", ["init"], gitOpts);
  execFileSync("git", ["config", "user.name", "Test"], gitOpts);
  execFileSync("git", ["config", "user.email", "test@test.com"], gitOpts);
  execFileSync("git", ["add", "-A"], gitOpts);
  execFileSync("git", ["commit", "-m", "init"], gitOpts);
}

function cleanup(): void {
  rmSync(FIXTURE_REPO, { recursive: true, force: true });
}

// ============================================================
// Shared worker config factory
// ============================================================

function makeWorkerConfig(tag: string) {
  return {
    tag,
    repoPath: FIXTURE_REPO,
    mutablePaths: ["server.ts"],
    runCommand: "bash experiment.sh",
    metric: {
      name: "bug_count",
      direction: "lower" as const,
      pattern: "^bug_count:\\s+([\\d.]+)",
    },
    programPath: "program.md",
  };
}

// ============================================================
// GROUP 1: Pipeline Initialization
// ============================================================

async function testWorkerInitCreatesBranch(): Promise<void> {
  const name = "Worker.initialize() creates research branch and state file";
  try {
    const { ResearchWorker } =
      await import("../src/lib/autoresearch/worker.js");

    const worker = new ResearchWorker(makeWorkerConfig("e2e-test"));
    await worker.initialize("e2e-test");

    // Check branch was created
    const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: FIXTURE_REPO,
      encoding: "utf-8",
    }).trim();

    if (!branch.startsWith("autoresearch/")) {
      record(name, false, `branch=${branch}, expected autoresearch/*`);
      return;
    }

    // Check state file exists
    const stateDir = join(FIXTURE_REPO, ".autoresearch");
    if (!existsSync(join(stateDir, "state.json"))) {
      record(name, false, "state.json not created");
      return;
    }

    const state = JSON.parse(
      readFileSync(join(stateDir, "state.json"), "utf-8"),
    );
    if (!state.branch || !state.tag) {
      record(name, false, `state missing branch/tag: ${JSON.stringify(state)}`);
      return;
    }

    record(name, true, `branch=${branch}, state.tag=${state.tag}`);
  } catch (error) {
    record(name, false, error instanceof Error ? error.message : String(error));
  }
}

async function testWorkerToolsAreRegistered(): Promise<void> {
  const name = "Worker.getTools() returns 12 research tools";
  try {
    const { ResearchWorker } =
      await import("../src/lib/autoresearch/worker.js");

    const worker = new ResearchWorker(makeWorkerConfig("e2e-tools"));
    const tools = worker.getTools();
    const toolNames = Object.keys(tools);

    const expectedTools = [
      "research_get_context",
      "research_read_file",
      "research_write_candidate",
      "research_diff",
      "research_commit_candidate",
      "research_run_experiment",
      "research_parse_log",
      "research_record",
      "research_accept",
      "research_revert",
      "research_inspect_failure",
      "research_checkpoint",
    ];

    const missing = expectedTools.filter((t) => !toolNames.includes(t));
    if (missing.length > 0) {
      record(name, false, `missing tools: ${missing.join(", ")}`);
      return;
    }

    if (toolNames.length !== 12) {
      record(
        name,
        false,
        `expected 12 tools, got ${toolNames.length}: ${toolNames.join(", ")}`,
      );
      return;
    }

    record(name, true, `${toolNames.length} tools registered`);
  } catch (error) {
    record(name, false, error instanceof Error ? error.message : String(error));
  }
}

async function testBaselineExperimentRuns(): Promise<void> {
  const name = "Experiment script runs and returns baseline metric";
  try {
    const output = execFileSync("bash", ["experiment.sh"], {
      cwd: FIXTURE_REPO,
      encoding: "utf-8",
    });

    const match = output.match(/^bug_count:\s+(\d+)/m);
    if (!match) {
      record(name, false, `no bug_count in output: ${output.slice(0, 200)}`);
      return;
    }

    const count = parseInt(match[1], 10);
    if (count !== 5) {
      record(name, false, `expected 5 bugs at baseline, got ${count}`);
      return;
    }

    record(name, true, `baseline bug_count=${count}`);
  } catch (error) {
    record(name, false, error instanceof Error ? error.message : String(error));
  }
}

// ============================================================
// GROUP 2: Experiment Cycle Mechanics
// ============================================================

async function testWriteCandidateTool(): Promise<void> {
  const name = "research_write_candidate writes file to repo";
  try {
    const { ResearchWorker } =
      await import("../src/lib/autoresearch/worker.js");

    const worker = new ResearchWorker(makeWorkerConfig("e2e-write"));
    const tools = worker.getTools();
    const writeTool = tools.research_write_candidate;

    // Fix one bug: replace first console.log in catch with console.error
    const original = readFileSync(join(FIXTURE_REPO, "server.ts"), "utf-8");
    const fixed = original.replace(
      'console.log("Request parsing failed:", error);  // BUG: should be console.error',
      'console.error("Request parsing failed:", error);  // FIXED',
    );

    const result = await writeTool.execute(
      { path: "server.ts", content: fixed },
      {} as never,
    );
    if (!result || !(result as { success: boolean }).success) {
      record(name, false, `write failed: ${JSON.stringify(result)}`);
      return;
    }

    // Verify file was written
    const written = readFileSync(join(FIXTURE_REPO, "server.ts"), "utf-8");
    if (!written.includes("console.error")) {
      record(name, false, "file does not contain the fix");
      return;
    }

    record(name, true);
  } catch (error) {
    record(name, false, error instanceof Error ? error.message : String(error));
  }
}

async function testCommitCandidateTool(): Promise<void> {
  const name = "research_commit_candidate creates a git commit";
  try {
    const { ResearchWorker } =
      await import("../src/lib/autoresearch/worker.js");

    const worker = new ResearchWorker(makeWorkerConfig("e2e-write"));

    // Must initialize to create state and research branch
    await worker.initialize("e2e-write");

    const tools = worker.getTools();

    // Re-apply our fix (initialize may have switched branches, carrying dirty state)
    const original = readFileSync(join(FIXTURE_REPO, "server.ts"), "utf-8");
    if (!original.includes("console.error")) {
      // Re-apply the fix from the previous test
      const fixed = original.replace(
        'console.log("Request parsing failed:", error);  // BUG: should be console.error',
        'console.error("Request parsing failed:", error);  // FIXED',
      );
      writeFileSync(join(FIXTURE_REPO, "server.ts"), fixed, "utf-8");
    }

    const commitTool = tools.research_commit_candidate;
    const result = await commitTool.execute(
      {
        message: "fix: replace console.log with console.error in handleRequest",
      },
      {} as never,
    );

    if (!result || !(result as { success: boolean }).success) {
      record(name, false, `commit failed: ${JSON.stringify(result)}`);
      return;
    }

    const commitHash = (result as { candidateCommit: string }).candidateCommit;
    if (!commitHash || commitHash.length < 7) {
      record(name, false, `invalid commit hash: ${commitHash}`);
      return;
    }

    // Verify commit exists in git log
    const logOutput = execFileSync("git", ["log", "--oneline", "-1"], {
      cwd: FIXTURE_REPO,
      encoding: "utf-8",
    }).trim();

    if (
      !logOutput.includes("console.log") &&
      !logOutput.includes("handleRequest")
    ) {
      // Commit message may be truncated, just check there's a commit
      if (!logOutput) {
        record(name, false, "no git log output");
        return;
      }
    }

    record(name, true, `commit=${commitHash}`);
  } catch (error) {
    record(name, false, error instanceof Error ? error.message : String(error));
  }
}

async function testRunExperimentTool(): Promise<void> {
  const name = "research_run_experiment executes script and returns metric";
  try {
    const { ResearchWorker } =
      await import("../src/lib/autoresearch/worker.js");

    const worker = new ResearchWorker(makeWorkerConfig("e2e-write"));
    const tools = worker.getTools();
    const runTool = tools.research_run_experiment;

    // research_run_experiment requires a description argument and returns { success, description, summary }
    const result = await runTool.execute(
      { description: "test run after one fix" },
      {} as never,
    );
    const r = result as {
      success: boolean;
      description?: string;
      summary?: {
        metric: number | null;
        crashed: boolean;
        timedOut: boolean;
        memoryValue: number | null;
      };
      error?: string;
    };

    if (!r.success) {
      record(name, false, `run failed: ${r.error || JSON.stringify(result)}`);
      return;
    }

    if (!r.summary) {
      record(name, false, "no summary in result");
      return;
    }

    // We fixed 1 bug, so metric should be 4
    if (r.summary.metric !== 4) {
      record(name, false, `expected metric=4, got ${r.summary.metric}`);
      return;
    }

    record(
      name,
      true,
      `metric=${r.summary.metric}, crashed=${r.summary.crashed}`,
    );
  } catch (error) {
    record(name, false, error instanceof Error ? error.message : String(error));
  }
}

async function testFullCycleAcceptImproved(): Promise<void> {
  const name =
    "Full cycle: write -> commit -> run -> record -> accept (metric improves)";
  try {
    const { ResearchWorker } =
      await import("../src/lib/autoresearch/worker.js");

    // Fresh repo for this test
    createFixtureRepo();

    const worker = new ResearchWorker(makeWorkerConfig("e2e-cycle"));
    await worker.initialize("e2e-cycle");
    const tools = worker.getTools();

    // Step 1: Fix ALL 5 bugs at once
    const original = readFileSync(join(FIXTURE_REPO, "server.ts"), "utf-8");
    const fixed = original.replace(
      /console\.log\((.*?(?:error|failed|required|Invalid).*?)\)/g,
      "console.error($1)",
    );

    await tools.research_write_candidate.execute(
      { path: "server.ts", content: fixed },
      {} as never,
    );

    // Step 2: Commit
    const commitResult = await tools.research_commit_candidate.execute(
      {
        message:
          "fix: replace all console.log with console.error in error paths",
      },
      {} as never,
    );
    if (!(commitResult as { success: boolean }).success) {
      record(name, false, `commit failed: ${JSON.stringify(commitResult)}`);
      return;
    }

    // Step 3: Run experiment — returns { success, description, summary }
    const runResult = await tools.research_run_experiment.execute(
      { description: "fix all 5 console.log bugs" },
      {} as never,
    );
    const rr = runResult as {
      success: boolean;
      summary?: { metric: number | null; crashed: boolean };
    };
    if (!rr.success || !rr.summary) {
      record(name, false, `run failed: ${JSON.stringify(runResult)}`);
      return;
    }
    if (rr.summary.metric !== 0) {
      record(name, false, `expected metric=0, got ${rr.summary.metric}`);
      return;
    }

    // Step 4: Record the result — research_record takes { description }
    const recordResult = await tools.research_record.execute(
      { description: "Fixed all 5 bugs" },
      {} as never,
    );
    if (!(recordResult as { success: boolean }).success) {
      record(name, false, `record failed: ${JSON.stringify(recordResult)}`);
      return;
    }

    // Step 5: Accept the change
    const acceptResult = await tools.research_accept.execute({}, {} as never);
    if (!(acceptResult as { success: boolean }).success) {
      record(name, false, `accept failed: ${JSON.stringify(acceptResult)}`);
      return;
    }

    // Verify state was updated
    const state = JSON.parse(
      readFileSync(join(FIXTURE_REPO, ".autoresearch", "state.json"), "utf-8"),
    );
    if (state.bestMetric !== 0) {
      record(name, false, `expected bestMetric=0, got ${state.bestMetric}`);
      return;
    }
    if (state.keepCount < 1) {
      record(name, false, `expected keepCount>=1, got ${state.keepCount}`);
      return;
    }

    record(
      name,
      true,
      `metric 5->0, bestMetric=${state.bestMetric}, keepCount=${state.keepCount}`,
    );
  } catch (error) {
    record(name, false, error instanceof Error ? error.message : String(error));
  }
}

// ============================================================
// GROUP 3: Results and Artifacts
// ============================================================

async function testResultsTSVCreated(): Promise<void> {
  const name =
    "results.tsv exists with header and data row after accepted cycle";
  try {
    const tsvPath = join(FIXTURE_REPO, "results.tsv");
    if (!existsSync(tsvPath)) {
      record(name, false, "results.tsv not found");
      return;
    }

    const content = readFileSync(tsvPath, "utf-8");
    const lines = content.trim().split("\n");

    if (lines.length < 2) {
      record(
        name,
        false,
        `expected >=2 lines (header + data), got ${lines.length}`,
      );
      return;
    }

    const header = lines[0];
    if (
      !header.includes("commit") ||
      !header.includes("bug_count") ||
      !header.includes("status")
    ) {
      record(name, false, `header missing fields: ${header}`);
      return;
    }

    const dataLine = lines[1];
    if (!dataLine.includes("keep")) {
      record(name, false, `data line missing 'keep' status: ${dataLine}`);
      return;
    }

    record(name, true, `${lines.length} lines (${lines.length - 1} data rows)`);
  } catch (error) {
    record(name, false, error instanceof Error ? error.message : String(error));
  }
}

async function testStateJsonHasCorrectFields(): Promise<void> {
  const name = "state.json tracks branch, tag, bestMetric, keepCount";
  try {
    const statePath = join(FIXTURE_REPO, ".autoresearch", "state.json");
    if (!existsSync(statePath)) {
      record(name, false, "state.json not found");
      return;
    }

    const state = JSON.parse(readFileSync(statePath, "utf-8"));

    const required = [
      "branch",
      "tag",
      "bestMetric",
      "keepCount",
      "runCount",
      "lastStatus",
    ];
    const missing = required.filter((f) => state[f] === undefined);
    if (missing.length > 0) {
      record(name, false, `missing fields: ${missing.join(", ")}`);
      return;
    }

    if (!state.branch.startsWith("autoresearch/")) {
      record(name, false, `branch=${state.branch}`);
      return;
    }

    record(
      name,
      true,
      `tag=${state.tag}, bestMetric=${state.bestMetric}, keepCount=${state.keepCount}`,
    );
  } catch (error) {
    record(name, false, error instanceof Error ? error.message : String(error));
  }
}

async function testGitHistoryShowsCommits(): Promise<void> {
  const name = "Git history contains autoresearch commits on research branch";
  try {
    const logOutput = execFileSync("git", ["log", "--oneline"], {
      cwd: FIXTURE_REPO,
      encoding: "utf-8",
    }).trim();

    const lines = logOutput.split("\n");
    if (lines.length < 2) {
      record(name, false, `expected >=2 commits, got ${lines.length}`);
      return;
    }

    // Should have the init commit and at least one fix commit
    const hasInit = lines.some((l) => l.includes("init"));
    const hasFix = lines.some(
      (l) =>
        l.toLowerCase().includes("fix") || l.toLowerCase().includes("console"),
    );

    if (!hasInit) {
      record(name, false, "no init commit found");
      return;
    }
    if (!hasFix) {
      record(name, false, `no fix commit found in: ${logOutput}`);
      return;
    }

    // Should be on autoresearch branch
    const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: FIXTURE_REPO,
      encoding: "utf-8",
    }).trim();

    if (!branch.startsWith("autoresearch/")) {
      record(name, false, `not on autoresearch branch: ${branch}`);
      return;
    }

    record(name, true, `${lines.length} commits on ${branch}`);
  } catch (error) {
    record(name, false, error instanceof Error ? error.message : String(error));
  }
}

// ============================================================
// MAIN
// ============================================================

// ============================================================
// SECTION 2: LIVE TESTS — real provider invocation
// ============================================================

/** Print-only logTest shim. Counters are driven by recordTest in the runner. */
function logTest(
  testName: string,
  status: "PASS" | "FAIL" | "SKIP" | "TESTING",
  details?: string,
): void {
  const color: ColorName =
    status === "PASS"
      ? "green"
      : status === "FAIL"
        ? "red"
        : status === "SKIP"
          ? "yellow"
          : "blue";
  log(`[${status}] ${testName}${details ? ` — ${details}` : ""}`, color);
}
// ============================================================
// RESULTS
// ============================================================

// ============================================================
// SETUP / TEARDOWN
// ============================================================

const FIXTURE_DIR = resolve(__dirname, "fixtures", "autoresearch");
const REPO_DIR = resolve(__dirname, ".tmp-autoresearch-live-repo");

function setupFixtureRepo(): void {
  if (existsSync(REPO_DIR)) {
    rmSync(REPO_DIR, { recursive: true, force: true });
  }
  mkdirSync(REPO_DIR, { recursive: true });
  cpSync(resolve(FIXTURE_DIR, "train.py"), resolve(REPO_DIR, "train.py"));
  cpSync(
    resolve(FIXTURE_DIR, "program-live.md"),
    resolve(REPO_DIR, "program-live.md"),
  );
  const gitOpts = { cwd: REPO_DIR, stdio: "pipe" as const };
  execFileSync("git", ["init"], gitOpts);
  execFileSync("git", ["config", "user.name", "Test"], gitOpts);
  execFileSync("git", ["config", "user.email", "test@test.com"], gitOpts);
  execFileSync("git", ["add", "-A"], gitOpts);
  execFileSync("git", ["commit", "-m", "initial"], gitOpts);
}

function cleanupFixtureRepo(): void {
  if (existsSync(REPO_DIR)) {
    rmSync(REPO_DIR, { recursive: true, force: true });
  }
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Run a function with a timeout. Rejects if the function doesn't
 * complete in time, AND aborts the underlying work via an
 * AbortController so callers that honor the signal can stop their
 * I/O / subprocess work and clean up handles.
 *
 * Callers receive the signal as the function's argument; if they
 * ignore it, behavior is unchanged from the older signature (outer
 * promise rejects, inner work continues). The autoresearch SDK
 * paths in this file do not yet propagate AbortSignal end-to-end —
 * tracked as a follow-up; the signal still lets the test runner
 * release shared fixture handles.
 */
/**
 * Promises spawned by withTestTimeout that haven't settled yet. Tracked
 * globally so suite teardown can await them — preventing a timed-out test
 * from mutating REPO_DIR (or any other shared fixture) after the suite
 * has moved on. See `awaitInFlightAutoresearchWork()` below.
 */
const inFlightAutoresearchWork = new Set<Promise<unknown>>();

function withTestTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`Test timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    // Wrap fn() in Promise.resolve().then(...) so a synchronous throw
    // from fn (e.g. arg-shape mismatch, immediate `throw` before any
    // await) is converted into a rejected promise — otherwise `inner`
    // would never be assigned, the .finally tracker would never run,
    // and `clearTimeout(timer)` would never fire, leaving the timeout
    // pending for the full deadline.
    const inner = Promise.resolve().then(() => fn(controller.signal));
    // Register the in-flight work so callers awaiting fixture cleanup can
    // join it before reusing REPO_DIR. We always remove on settlement.
    const tracker = inner.finally(() => {
      inFlightAutoresearchWork.delete(tracker);
    });
    inFlightAutoresearchWork.add(tracker);
    inner
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        controller.abort();
        reject(err);
      });
  });
}

/**
 * Wait for every still-pending withTestTimeout call to settle (or error)
 * with a hard deadline. The outer test runner calls this before tearing
 * down the shared fixture so background work doesn't race REPO_DIR
 * cleanup. Returns the count of work items that didn't settle in time.
 */
async function awaitInFlightAutoresearchWork(graceMs: number): Promise<number> {
  if (inFlightAutoresearchWork.size === 0) {
    return 0;
  }
  const promises = Array.from(inFlightAutoresearchWork).map((p) =>
    p.catch(() => undefined),
  );
  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<"timed-out">((resolve) => {
    timer = setTimeout(() => resolve("timed-out"), graceMs);
  });
  const outcome = await Promise.race([
    Promise.all(promises).then(() => "settled" as const),
    deadline,
  ]).finally(() => {
    if (timer) {
      clearTimeout(timer);
    }
  });
  return outcome === "timed-out" ? inFlightAutoresearchWork.size : 0;
}

// ============================================================
// GROUP 1: SDK Path — Direct ResearchWorker with Real Provider
// ============================================================

/** Shared state across Group 1 tests (sequential dependency) */
let g1Worker: Awaited<
  ReturnType<typeof import("../src/lib/autoresearch/worker.js")>
>["ResearchWorker"] extends new (...args: never[]) => infer R
  ? R
  : never;
let g1ExperimentRecord:
  | import("../src/lib/types/autoresearchTypes.js").ExperimentRecord
  | null = null;

async function testG1WorkerInitialize(): Promise<boolean | null> {
  harnessLog(
    "\n--- Group 1.1: ResearchWorker.initialize() creates branch and state with real config ---",
    "bright",
  );
  logTest("ResearchWorker.initialize() creates branch and state", "TESTING");

  if (!HAS_PROVIDER) {
    // Let the group runner be the sole recorder for null-result SKIPs;
    // recordTest here would double-count the skip.
    logTest("Worker initialize", "SKIP", "No API key");
    return null;
  }

  try {
    const { ResearchWorker } =
      await import("../src/lib/autoresearch/worker.js");

    const worker = new ResearchWorker({
      repoPath: REPO_DIR,
      mutablePaths: ["train.py"],
      runCommand: "python3 train.py",
      metric: {
        name: "val_bpb",
        direction: "lower" as const,
        pattern: "val_bpb:\\s+([\\d.]+)",
      },
      programPath: "program-live.md",
      timeoutMs: 30000,
      provider: PROVIDER,
      model: MODEL,
    });

    const state = await worker.initialize("live-test");

    // Store for subsequent tests
    g1Worker = worker as typeof g1Worker;

    const checks: string[] = [];

    // Assert: state file exists
    const statePath = join(REPO_DIR, ".autoresearch", "state.json");
    if (!existsSync(statePath)) {
      checks.push("state.json not found");
    }

    // Assert: phase is "bootstrap" or "propose" (after init, phase advances)
    if (
      state.currentPhase !== "bootstrap" &&
      state.currentPhase !== "propose"
    ) {
      checks.push(`phase=${state.currentPhase}, expected bootstrap or propose`);
    }

    // Assert: git branch is "autoresearch/live-test"
    const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: REPO_DIR,
      encoding: "utf-8",
    }).trim();
    if (branch !== "autoresearch/live-test") {
      checks.push(`branch=${branch}, expected autoresearch/live-test`);
    }

    if (checks.length > 0) {
      logTest("Worker initialize", "FAIL", checks.join("; "));
      return false;
    }

    logTest(
      "ResearchWorker.initialize() creates branch and state",
      "PASS",
      `phase=${state.currentPhase}, branch=${branch}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Worker initialize", "FAIL", msg);
    return false;
  }
}

async function testG1ExperimentCycle(): Promise<boolean | null> {
  harnessLog(
    "\n--- Group 1.2: ResearchWorker.runExperimentCycle() executes with real AI ---",
    "bright",
  );
  logTest("runExperimentCycle with real AI provider", "TESTING");

  if (!HAS_PROVIDER) {
    logTest("Experiment cycle", "SKIP", "No API key");
    return null;
  }

  try {
    const record = await withTestTimeout(
      // Underlying runExperimentCycle does not yet accept an
      // AbortSignal — the timeout still releases shared fixture
      // handles via controller.abort().
      (_signal) =>
        g1Worker.runExperimentCycle(
          "Modify train.py to produce a lower val_bpb",
        ),
      120_000,
    );

    g1ExperimentRecord = record;

    const checks: string[] = [];

    // Assert: valid status
    const validStatuses = ["keep", "discard", "crash", "timeout"];
    if (!validStatuses.includes(record.status)) {
      checks.push(
        `status=${record.status}, expected one of ${validStatuses.join(",")}`,
      );
    }

    // Assert: has a commit hash
    if (
      !record.commit ||
      typeof record.commit !== "string" ||
      record.commit.length === 0
    ) {
      checks.push("commit is empty or missing");
    }

    // Assert: metric is number or null
    if (record.metric !== null && typeof record.metric !== "number") {
      checks.push(
        `metric type=${typeof record.metric}, expected number or null`,
      );
    }

    if (checks.length > 0) {
      logTest("Experiment cycle", "FAIL", checks.join("; "));
      return false;
    }

    logTest(
      "runExperimentCycle with real AI provider",
      "PASS",
      `status=${record.status}, commit=${record.commit.slice(0, 7)}, metric=${record.metric}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    // Transient provider issues (rate-limit, auth, quota, network blip)
    // are environmental, not test regressions — route to SKIP via the
    // same anchored matcher the rest of the suite uses.
    if (isExpectedProviderError(msg)) {
      logTest("Experiment cycle", "SKIP", msg.slice(0, 120));
      return null;
    }
    logTest("Experiment cycle", "FAIL", msg);
    return false;
  }
}

async function testG1GitHistory(): Promise<boolean | null> {
  harnessLog(
    "\n--- Group 1.3: Git branch is on autoresearch/* and has commit(s) ---",
    "bright",
  );
  logTest(
    "Git branch is autoresearch/live-test with at least 1 commit",
    "TESTING",
  );

  if (!HAS_PROVIDER) {
    logTest("Git history", "SKIP", "No API key");
    return null;
  }

  try {
    const checks: string[] = [];

    // Verify we are on the autoresearch branch (created by initialize)
    const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: REPO_DIR,
      encoding: "utf-8",
    }).trim();
    if (branch !== "autoresearch/live-test") {
      checks.push(`branch=${branch}, expected autoresearch/live-test`);
    }

    // Verify at least 1 commit exists (the initial commit)
    const gitLog = execFileSync("git", ["log", "--oneline"], {
      cwd: REPO_DIR,
      encoding: "utf-8",
    }).trim();
    const commitLines = gitLog.split("\n").filter((l) => l.trim().length > 0);

    if (commitLines.length < 1) {
      checks.push(`${commitLines.length} commit(s), expected >= 1`);
    }

    // Verify the experiment record's commit matches a real git hash
    if (g1ExperimentRecord) {
      let commitExists: string;
      try {
        commitExists = execFileSync(
          "git",
          ["cat-file", "-t", g1ExperimentRecord.commit],
          {
            cwd: REPO_DIR,
            encoding: "utf-8",
          },
        ).trim();
      } catch {
        commitExists = "NOT_FOUND";
      }
      if (commitExists === "NOT_FOUND") {
        checks.push(
          `ExperimentRecord.commit=${g1ExperimentRecord.commit} not found in git`,
        );
      }
    }

    if (checks.length > 0) {
      logTest("Git history", "FAIL", checks.join("; "));
      return false;
    }

    logTest(
      "Git branch is autoresearch/live-test with at least 1 commit",
      "PASS",
      `branch=${branch}, ${commitLines.length} commit(s), record commit verified`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Git history", "FAIL", msg);
    return false;
  }
}

async function testG1ResultsTsv(): Promise<boolean | null> {
  harnessLog("\n--- Group 1.4: results.tsv has recorded entry ---", "bright");
  logTest("results.tsv contains at least 1 data row", "TESTING");

  if (!HAS_PROVIDER) {
    logTest("Results TSV", "SKIP", "No API key");
    return null;
  }

  try {
    const tsvPath = join(REPO_DIR, "results.tsv");
    if (!existsSync(tsvPath)) {
      logTest("Results TSV", "FAIL", "results.tsv not found");
      return false;
    }

    const content = readFileSync(tsvPath, "utf-8").trim();
    const lines = content.split("\n");

    // Header + at least 1 data row
    if (lines.length < 2) {
      logTest(
        "Results TSV",
        "FAIL",
        `Only ${lines.length} line(s), expected >= 2 (header + data)`,
      );
      return false;
    }

    // Verify data row contains expected fields
    const dataRow = lines[1];
    const checks: string[] = [];

    // Row should contain a status value
    const validStatuses = ["keep", "discard", "crash", "timeout"];
    const hasStatus = validStatuses.some((s) => dataRow.includes(s));
    if (!hasStatus) {
      checks.push("row missing valid status");
    }

    // Row should contain a commit hash (short hex)
    if (!/[0-9a-f]{7,}/.test(dataRow)) {
      checks.push("row missing commit hash");
    }

    if (checks.length > 0) {
      logTest("Results TSV", "FAIL", checks.join("; "));
      return false;
    }

    logTest(
      "results.tsv contains at least 1 data row",
      "PASS",
      `${lines.length - 1} data row(s)`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Results TSV", "FAIL", msg);
    return false;
  }
}

async function group1_sdkPath(): Promise<void> {
  logSection("GROUP 1: SDK Path — Direct ResearchWorker with Real Provider");

  const tests: Array<{ name: string; fn: () => Promise<boolean | null> }> = [
    { name: "Worker initialize", fn: testG1WorkerInitialize },
    { name: "Experiment cycle", fn: testG1ExperimentCycle },
    { name: "Git history", fn: testG1GitHistory },
    { name: "Results TSV", fn: testG1ResultsTsv },
  ];

  // The remaining tests share state with the prerequisites
  // (g1Worker is set by "Worker initialize"; g1ExperimentRecord is set by
  // "Experiment cycle"). "Git history" and "Results TSV" depend on
  // g1ExperimentRecord, so if EITHER prerequisite fails we cascade-SKIP
  // the dependent tests instead of letting them fail spuriously.
  const PREREQUISITE_NAMES = new Set(["Worker initialize", "Experiment cycle"]);
  let prerequisiteFailed = false;

  for (const test of tests) {
    if (prerequisiteFailed) {
      recordTest(
        `SDK Path — ${test.name}`,
        false,
        true,
        "skipped: prerequisite failed",
      );
      continue;
    }
    try {
      const result = await withCaseTimeout(test.name, test.fn);
      if (result === null) {
        recordTest(`SDK Path — ${test.name}`, false, true, "skip from test fn");
        if (PREREQUISITE_NAMES.has(test.name)) {
          prerequisiteFailed = true;
        }
      } else {
        const passed = result === true;
        recordTest(
          `SDK Path — ${test.name}`,
          passed,
          false,
          passed ? undefined : "failed",
        );
        if (!passed && PREREQUISITE_NAMES.has(test.name)) {
          prerequisiteFailed = true;
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      recordTest(`SDK Path — ${test.name}`, false, false, `Uncaught: ${msg}`);
      if (PREREQUISITE_NAMES.has(test.name)) {
        prerequisiteFailed = true;
      }

      // A case bound is not an ordinary failure: Promise.race cannot cancel, so
      // the abandoned case is still running. Continuing would run the loop's
      // cleanup and inter-case delay underneath live work, and record every
      // remaining case as "not run". Stop at the first one.
      if (isCaseTimeout(error)) {
        log(
          `\n\u{1F6D1} ABORTING: "${test.name}" was abandoned by its timeout and is still executing. ` +
            `Remaining cases are NOT run — this process no longer has clean state.`,
          "red",
        );
        break;
      }
    }
  }
}

// ============================================================
// GROUP 2: TaskManager Path with Real Provider
// ============================================================

/** Shared state across Group 2 tests */
let g2TaskResult: import("../src/lib/types/taskTypes.js").TaskRunResult | null =
  null;
let g2EmittedEvents: string[] = [];

async function testG2ExecuteAutoresearchTick(): Promise<boolean | null> {
  harnessLog(
    "\n--- Group 2.1: Create autoresearch task via TaskManager-like structure ---",
    "bright",
  );
  logTest("executeAutoresearchTick with real NeuroLink instance", "TESTING");

  if (!HAS_PROVIDER) {
    logTest("Execute tick", "SKIP", "No API key");
    return null;
  }

  // Skip MCP server discovery — we only need the generate() path with
  // research tools, not external MCP servers (GitHub etc.) that may
  // fail auth and cause long timeouts. Restore is in the finally below
  // so the env-mutation cleans up regardless of success/failure/return.
  const prevSkipMCP = process.env.NEUROLINK_SKIP_MCP;
  process.env.NEUROLINK_SKIP_MCP = "true";

  try {
    const { executeAutoresearchTick } =
      await import("../src/lib/tasks/autoresearchTaskExecutor.js");
    const { NeuroLink } = await import("../dist/index.js");

    const nl = new NeuroLink();

    const now = new Date().toISOString();
    const task: Task = {
      id: "test_live_001",
      name: "live-test",
      prompt: "Run autonomous ML experiments",
      schedule: { type: "interval", every: 60_000 },
      mode: "isolated",
      type: "autoresearch",
      status: "active",
      autoresearch: {
        tag: "live-test",
        repoPath: REPO_DIR,
        mutablePaths: ["train.py"],
        runCommand: "python3 train.py",
        metric: {
          name: "val_bpb",
          direction: "lower" as const,
          pattern: "val_bpb:\\s+([\\d.]+)",
        },
        provider: PROVIDER,
        model: MODEL,
      },
      tools: true,
      timeout: 120_000,
      retry: { maxAttempts: 1, backoffMs: [1000] },
      runCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    // Create emitter to track events
    const emitter = new EventEmitter();
    g2EmittedEvents = [];
    const trackEvent = (event: string) => {
      emitter.on(event, () => {
        g2EmittedEvents.push(event);
      });
    };
    trackEvent("autoresearch:initialized");
    trackEvent("autoresearch:resumed");
    trackEvent("autoresearch:experiment-started");
    trackEvent("autoresearch:experiment-completed");
    trackEvent("autoresearch:phase-changed");
    trackEvent("autoresearch:state-updated");
    trackEvent("autoresearch:error");

    // The leading `_signal` is intentionally unused: executeAutoresearchTick
    // does not currently honour abort propagation, so wiring it through would
    // be misleading. The withTestTimeout deadline still fires correctly via
    // its own race; matches the runExperimentCycle pattern at ~lines 1037-1039.
    const result = await withTestTimeout(
      (_signal) => executeAutoresearchTick(task, nl, emitter),
      180_000,
    );

    g2TaskResult = result;

    // Both "success" and "error" are valid — the AI might not produce valid changes
    const validStatuses = ["success", "error"];
    if (!validStatuses.includes(result.status)) {
      logTest(
        "Execute tick",
        "FAIL",
        `status=${result.status}, expected success or error`,
      );
      return false;
    }

    logTest(
      "executeAutoresearchTick with real NeuroLink instance",
      "PASS",
      `status=${result.status}, duration=${result.durationMs}ms`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("Execute tick", "SKIP", msg.slice(0, 120));
      return null;
    }
    logTest("Execute tick", "FAIL", msg);
    return false;
  } finally {
    // Single restore path — covers the happy path, the catch, and any
    // future early-return that might be added inside the try.
    if (prevSkipMCP === undefined) {
      delete process.env.NEUROLINK_SKIP_MCP;
    } else {
      process.env.NEUROLINK_SKIP_MCP = prevSkipMCP;
    }
  }
}

async function testG2TaskRunResultFields(): Promise<boolean | null> {
  harnessLog(
    "\n--- Group 2.2: TaskRunResult contains expected fields ---",
    "bright",
  );
  logTest("TaskRunResult has taskId, runId, durationMs, timestamp", "TESTING");

  if (!HAS_PROVIDER) {
    logTest("Result fields", "SKIP", "No API key");
    return null;
  }

  if (!g2TaskResult) {
    logTest("Result fields", "FAIL", "No task result from previous test");
    return false;
  }

  try {
    const result = g2TaskResult;
    const checks: string[] = [];

    // Required fields
    if (!result.taskId) {
      checks.push("missing taskId");
    }
    if (!result.runId) {
      checks.push("missing runId");
    }
    if (typeof result.durationMs !== "number") {
      checks.push(`durationMs type=${typeof result.durationMs}`);
    }
    if (!result.timestamp) {
      checks.push("missing timestamp");
    }

    // If success, check additional fields
    if (result.status === "success") {
      // Output may be empty when the AI's entire response was tool calls
      // (common in autoresearch ticks). We accept empty output if there are tool calls.
      const hasToolCalls = result.toolCalls && result.toolCalls.length > 0;
      if (!result.output && !hasToolCalls) {
        checks.push("success but both output and toolCalls are empty");
      }
      if (result.tokensUsed) {
        if (
          typeof result.tokensUsed.input !== "number" ||
          result.tokensUsed.input <= 0
        ) {
          checks.push(`tokensUsed.input=${result.tokensUsed.input}`);
        }
        if (
          typeof result.tokensUsed.output !== "number" ||
          result.tokensUsed.output <= 0
        ) {
          checks.push(`tokensUsed.output=${result.tokensUsed.output}`);
        }
      }
    }

    if (checks.length > 0) {
      logTest("Result fields", "FAIL", checks.join("; "));
      return false;
    }

    logTest(
      "TaskRunResult has taskId, runId, durationMs, timestamp",
      "PASS",
      `taskId=${result.taskId}, runId=${result.runId}, durationMs=${result.durationMs}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Result fields", "FAIL", msg);
    return false;
  }
}

async function testG2EventsEmitted(): Promise<boolean | null> {
  harnessLog(
    "\n--- Group 2.3: Experiment events are emitted during live run ---",
    "bright",
  );
  logTest(
    "At least autoresearch:initialized or autoresearch:resumed emitted",
    "TESTING",
  );

  if (!HAS_PROVIDER) {
    logTest("Events emitted", "SKIP", "No API key");
    return null;
  }

  try {
    const hasInitOrResume =
      g2EmittedEvents.includes("autoresearch:initialized") ||
      g2EmittedEvents.includes("autoresearch:resumed");

    if (!hasInitOrResume) {
      logTest(
        "Events emitted",
        "FAIL",
        `Events captured: [${g2EmittedEvents.join(", ")}]. Missing initialized/resumed.`,
      );
      return false;
    }

    logTest(
      "At least autoresearch:initialized or autoresearch:resumed emitted",
      "PASS",
      `Events: [${g2EmittedEvents.join(", ")}]`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Events emitted", "FAIL", msg);
    return false;
  }
}

async function group2_taskManagerPath(): Promise<void> {
  logSection("GROUP 2: TaskManager Path with Real Provider");

  const tests: Array<{ name: string; fn: () => Promise<boolean | null> }> = [
    { name: "Execute tick", fn: testG2ExecuteAutoresearchTick },
    { name: "Result fields", fn: testG2TaskRunResultFields },
    { name: "Events emitted", fn: testG2EventsEmitted },
  ];

  // testG2ExecuteAutoresearchTick is the prerequisite — the later
  // tests inspect g2TaskResult / g2EmittedEvents which only get set
  // when the tick runs. Short-circuit the dependents on prerequisite
  // failure to avoid noisy follow-on failures.
  let prerequisiteFailed = false;

  for (const test of tests) {
    if (prerequisiteFailed) {
      recordTest(
        `TaskManager Path — ${test.name}`,
        false,
        true,
        "skipped: prerequisite failed",
      );
      continue;
    }
    try {
      const result = await withCaseTimeout(test.name, test.fn);
      if (result === null) {
        recordTest(
          `TaskManager Path — ${test.name}`,
          false,
          true,
          "skip from test fn",
        );
        if (test.name === "Execute tick") {
          prerequisiteFailed = true;
        }
      } else {
        const passed = result === true;
        recordTest(
          `TaskManager Path — ${test.name}`,
          passed,
          false,
          passed ? undefined : "failed",
        );
        if (!passed && test.name === "Execute tick") {
          prerequisiteFailed = true;
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      recordTest(
        `TaskManager Path — ${test.name}`,
        false,
        false,
        `Uncaught: ${msg}`,
      );
      if (test.name === "Execute tick") {
        prerequisiteFailed = true;
      }
    }
  }
}

// ============================================================
// RUNNER
// ============================================================

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  banner("AUTORESEARCH E2E: Consumer-Facing Tests");
  log(
    `  ${C.dim}Testing: config -> init -> tools -> experiment -> accept -> results${C.reset}`,
  );

  createFixtureRepo();

  try {
    banner("GROUP 1: Pipeline Initialization");
    await testWorkerInitCreatesBranch();

    // Fresh repo for tools test (init changed branch)
    createFixtureRepo();
    await testWorkerToolsAreRegistered();
    await testBaselineExperimentRuns();

    banner("GROUP 2: Experiment Cycle Mechanics");
    // Tests 4-6 share a fixture: write -> commit -> run on the same repo.
    // testWriteCandidateTool applies one fix, testCommitCandidateTool commits it,
    // testRunExperimentTool verifies the metric improved.
    await testWriteCandidateTool();
    await testCommitCandidateTool();
    await testRunExperimentTool();

    // testFullCycleAcceptImproved creates its own fresh repo for a clean full cycle
    await testFullCycleAcceptImproved();

    banner("GROUP 3: Results and Artifacts");
    // These read from the state left by testFullCycleAcceptImproved
    await testResultsTSVCreated();
    await testStateJsonHasCorrectFields();
    await testGitHistoryShowsCommits();
  } finally {
    cleanup();
  }
}

// liveMain — runs the autoresearch-live half (real provider tests). Each
// test inside group1_sdkPath / group2_taskManagerPath checks HAS_PROVIDER
// and skips cleanly when no provider keys are set, so this function is
// safe to call even on environments without API access.
async function liveMain(): Promise<void> {
  if (!HAS_PROVIDER) {
    log(
      "\n  No API key found. AutoResearch live tests will be skipped.",
      C.yellow,
    );
    log(
      "  Set GOOGLE_VERTEX_PROJECT+GOOGLE_VERTEX_LOCATION, ANTHROPIC_API_KEY, or OPENAI_API_KEY to run live tests.",
      C.dim,
    );
  } else {
    log(`\n  Provider: ${PROVIDER}`, C.cyan);
    log(`  Model:    ${MODEL}`, C.cyan);
  }

  setupFixtureRepo();
  log(`\n[SETUP] Fixture repo at: ${REPO_DIR}`, C.blue);

  try {
    await group1_sdkPath();

    // Drain any background work spawned by Group 1 BEFORE resetting the
    // fixture for Group 2 — otherwise setupFixtureRepo()'s rm/clone can
    // race with in-flight file writes from runExperimentCycle and leave
    // Group 2 staring at a half-built repo. The final-cleanup drain in
    // the `finally` block is no longer the only line of defence.
    const orphanedBetween = await awaitInFlightAutoresearchWork(15_000);
    if (orphanedBetween > 0) {
      log(
        `[BETWEEN-GROUPS] ${orphanedBetween} Group-1 background task(s) did not settle within 15s — Group 2 may race fixture state.`,
        C.yellow,
      );
    }

    // Reset fixture between groups
    setupFixtureRepo();

    await group2_taskManagerPath();
  } finally {
    // Drain any background work that was still running when a test timed
    // out — otherwise the upcoming `cleanupFixtureRepo()` can race with
    // file writes from runExperimentCycle / executeAutoresearchTick and
    // leave the next run with a partially-deleted REPO_DIR.
    const orphaned = await awaitInFlightAutoresearchWork(15_000);
    if (orphaned > 0) {
      log(
        `[CLEANUP] ${orphaned} background autoresearch task(s) did not settle within 15s — fixture cleanup may race.`,
        C.yellow,
      );
    }
    log("\n[CLEANUP] Removing fixture repository...", C.blue);
    cleanupFixtureRepo();
  }
}

await runSuite(async () => {
  await main();
  await liveMain();
});
