#!/usr/bin/env tsx

/**
 * Continuous Test Suite: AutoResearch Live Provider
 *
 * End-to-end tests that exercise the autoresearch system against a
 * real AI provider (Google Vertex AI, Anthropic, or OpenAI). These
 * tests make actual API calls and are slower/non-deterministic by nature.
 *
 * GROUP 1 -- SDK Path: Direct ResearchWorker with Real Provider (4 tests)
 *   Worker initialize with real config, runExperimentCycle with real AI,
 *   git history verification, results.tsv recording.
 *
 * GROUP 2 -- TaskManager Path with Real Provider (3 tests)
 *   executeAutoresearchTick with real NeuroLink, TaskRunResult fields,
 *   experiment event emission.
 *
 * Requires one of:
 *   - GOOGLE_VERTEX_PROJECT + GOOGLE_VERTEX_LOCATION (Vertex AI)
 *   - ANTHROPIC_API_KEY
 *   - OPENAI_API_KEY
 * If no provider key is present, all tests are skipped cleanly.
 *
 * Run: npx tsx test/continuous-test-suite-autoresearch-live.ts
 */

import { execFileSync } from "node:child_process";
import { EventEmitter } from "node:events";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { Task } from "../src/lib/types/taskTypes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================
// PROVIDER DETECTION
// ============================================================

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
    ? "claude-sonnet-4-20250514"
    : "gpt-4o-mini";

// ============================================================
// LOGGING
// ============================================================

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};
type ColorName = keyof typeof colors;

function log(msg: string, color: ColorName = "reset"): void {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function logSection(title: string): void {
  log(`\n${"=".repeat(60)}`, "cyan");
  log(`  ${title}`, "cyan");
  log(`${"=".repeat(60)}`, "cyan");
}

function logTest(
  name: string,
  status: "PASS" | "FAIL" | "SKIP" | "TESTING",
  details?: string,
): void {
  const icons = { PASS: "PASS", FAIL: "FAIL", SKIP: "SKIP", TESTING: "TEST" };
  const clr: Record<string, ColorName> = {
    PASS: "green",
    FAIL: "red",
    SKIP: "yellow",
    TESTING: "blue",
  };
  const det = details ? ` -- ${details}` : "";
  log(`[${icons[status]}] ${name}${det}`, clr[status] || "reset");
}

// ============================================================
// RESULTS
// ============================================================

const testResults: Array<{
  group: string;
  name: string;
  status: "pass" | "fail" | "skip";
  error?: string;
}> = [];

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

/** Run a function with a timeout. Rejects if the function doesn't complete in time. */
function withTestTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Test timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
    fn()
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
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
  logSection(
    "Group 1.1: ResearchWorker.initialize() creates branch and state with real config",
  );
  logTest("ResearchWorker.initialize() creates branch and state", "TESTING");

  if (!HAS_PROVIDER) {
    testResults.push({
      group: "SDK Path",
      name: "Worker initialize",
      status: "skip",
      error: "No API key available",
    });
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
  logSection(
    "Group 1.2: ResearchWorker.runExperimentCycle() executes with real AI",
  );
  logTest("runExperimentCycle with real AI provider", "TESTING");

  if (!HAS_PROVIDER) {
    testResults.push({
      group: "SDK Path",
      name: "Experiment cycle",
      status: "skip",
      error: "No API key available",
    });
    logTest("Experiment cycle", "SKIP", "No API key");
    return null;
  }

  try {
    const record = await withTestTimeout(
      () =>
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
    logTest("Experiment cycle", "FAIL", msg);
    return false;
  }
}

async function testG1GitHistory(): Promise<boolean | null> {
  logSection("Group 1.3: Git branch is on autoresearch/* and has commit(s)");
  logTest(
    "Git branch is autoresearch/live-test with at least 1 commit",
    "TESTING",
  );

  if (!HAS_PROVIDER) {
    testResults.push({
      group: "SDK Path",
      name: "Git history",
      status: "skip",
      error: "No API key available",
    });
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
  logSection("Group 1.4: results.tsv has recorded entry");
  logTest("results.tsv contains at least 1 data row", "TESTING");

  if (!HAS_PROVIDER) {
    testResults.push({
      group: "SDK Path",
      name: "Results TSV",
      status: "skip",
      error: "No API key available",
    });
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

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result === null) {
        // Already pushed skip in the guard
        if (!testResults.some((r) => r.name === test.name)) {
          testResults.push({
            group: "SDK Path",
            name: test.name,
            status: "skip",
            error: "No API key available",
          });
        }
      } else {
        testResults.push({
          group: "SDK Path",
          name: test.name,
          status: result ? "pass" : "fail",
          error: result ? undefined : "Test assertion failed",
        });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      testResults.push({
        group: "SDK Path",
        name: test.name,
        status: "fail",
        error: msg,
      });
      logTest(test.name, "FAIL", `Uncaught: ${msg}`);
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
  logSection(
    "Group 2.1: Create autoresearch task via TaskManager-like structure",
  );
  logTest("executeAutoresearchTick with real NeuroLink instance", "TESTING");

  if (!HAS_PROVIDER) {
    testResults.push({
      group: "TaskManager Path",
      name: "Execute tick",
      status: "skip",
      error: "No API key available",
    });
    logTest("Execute tick", "SKIP", "No API key");
    return null;
  }

  // Skip MCP server discovery — we only need the generate() path with
  // research tools, not external MCP servers (GitHub etc.) that may
  // fail auth and cause long timeouts.
  const prevSkipMCP = process.env.NEUROLINK_SKIP_MCP;
  process.env.NEUROLINK_SKIP_MCP = "true";

  try {
    const { executeAutoresearchTick } =
      await import("../src/lib/tasks/autoresearchTaskExecutor.js");
    const { NeuroLink } = await import("../src/lib/neurolink.js");

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

    const result = await withTestTimeout(
      () => executeAutoresearchTick(task, nl, emitter),
      180_000,
    );

    // Restore env
    if (prevSkipMCP === undefined) {
      delete process.env.NEUROLINK_SKIP_MCP;
    } else {
      process.env.NEUROLINK_SKIP_MCP = prevSkipMCP;
    }

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
    // Restore env on failure too
    if (prevSkipMCP === undefined) {
      delete process.env.NEUROLINK_SKIP_MCP;
    } else {
      process.env.NEUROLINK_SKIP_MCP = prevSkipMCP;
    }

    const msg = error instanceof Error ? error.message : String(error);
    logTest("Execute tick", "FAIL", msg);
    return false;
  }
}

async function testG2TaskRunResultFields(): Promise<boolean | null> {
  logSection("Group 2.2: TaskRunResult contains expected fields");
  logTest("TaskRunResult has taskId, runId, durationMs, timestamp", "TESTING");

  if (!HAS_PROVIDER) {
    testResults.push({
      group: "TaskManager Path",
      name: "Result fields",
      status: "skip",
      error: "No API key available",
    });
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
  logSection("Group 2.3: Experiment events are emitted during live run");
  logTest(
    "At least autoresearch:initialized or autoresearch:resumed emitted",
    "TESTING",
  );

  if (!HAS_PROVIDER) {
    testResults.push({
      group: "TaskManager Path",
      name: "Events emitted",
      status: "skip",
      error: "No API key available",
    });
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

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result === null) {
        if (
          !testResults.some(
            (r) => r.name === test.name && r.group === "TaskManager Path",
          )
        ) {
          testResults.push({
            group: "TaskManager Path",
            name: test.name,
            status: "skip",
            error: "No API key available",
          });
        }
      } else {
        testResults.push({
          group: "TaskManager Path",
          name: test.name,
          status: result ? "pass" : "fail",
          error: result ? undefined : "Test assertion failed",
        });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      testResults.push({
        group: "TaskManager Path",
        name: test.name,
        status: "fail",
        error: msg,
      });
      logTest(test.name, "FAIL", `Uncaught: ${msg}`);
    }
  }
}

// ============================================================
// RUNNER
// ============================================================

(async () => {
  log("\n" + "=".repeat(60), "bright");
  log("  CONTINUOUS TEST SUITE: AUTORESEARCH LIVE PROVIDER", "bright");
  log("=".repeat(60), "bright");

  if (!HAS_PROVIDER) {
    log("\n  No API key found. All tests will be skipped.", "yellow");
    log(
      "  Set GOOGLE_VERTEX_PROJECT+GOOGLE_VERTEX_LOCATION, ANTHROPIC_API_KEY, or OPENAI_API_KEY to run live tests.",
      "dim",
    );
  } else {
    log(`\n  Provider: ${PROVIDER}`, "cyan");
    log(`  Model:    ${MODEL}`, "cyan");
  }

  setupFixtureRepo();
  log(`\n[SETUP] Fixture repo at: ${REPO_DIR}`, "blue");

  try {
    await group1_sdkPath();

    // Reset fixture between groups
    setupFixtureRepo();

    await group2_taskManagerPath();
  } finally {
    log("\n[CLEANUP] Removing fixture repository...", "blue");
    cleanupFixtureRepo();
  }

  // ── Print Summary ──────────────────────────────────────

  const passed = testResults.filter((r) => r.status === "pass").length;
  const failed = testResults.filter((r) => r.status === "fail").length;
  const skipped = testResults.filter((r) => r.status === "skip").length;

  log("\n" + "=".repeat(60), "cyan");
  log("  SUMMARY", "cyan");
  log("=".repeat(60), "cyan");
  log(`  Total:   ${testResults.length}`, "bright");
  log(`  Passed:  ${passed}`, "green");
  log(`  Failed:  ${failed}`, failed > 0 ? "red" : "green");
  log(`  Skipped: ${skipped}`, "yellow");
  log("=".repeat(60), "cyan");

  if (failed > 0) {
    log("\n  FAILED TESTS:", "red");
    for (const r of testResults.filter((r) => r.status === "fail")) {
      log(`    - [${r.group}] ${r.name}: ${r.error || ""}`, "red");
    }
  }

  if (skipped > 0 && passed === 0 && failed === 0) {
    log("\n  All tests skipped (no API key).", "yellow");
  }

  process.exit(failed > 0 ? 1 : 0);
})();
