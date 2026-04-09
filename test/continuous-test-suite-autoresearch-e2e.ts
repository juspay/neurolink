#!/usr/bin/env tsx

/**
 * Continuous Test Suite: AutoResearch E2E (Consumer-Facing)
 *
 * Tests the consumer-facing flow: can a developer configure autoresearch,
 * point it at a real repo, run it, and get measurable improvements?
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
 * Run: npx tsx test/continuous-test-suite-autoresearch-e2e.ts
 */

import { execFileSync, execSync } from "node:child_process";
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
// RESULTS
// ============================================================

const results: Array<{ name: string; ok: boolean | null; error?: string }> = [];

function record(name: string, ok: boolean | null, error?: string): void {
  results.push({ name, ok, error });
  if (ok === true) {
    pass(name, error);
  } else if (ok === false) {
    fail(name, error);
  } else {
    skip(name, error);
  }
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

  // Summary
  const passed = results.filter((r) => r.ok === true).length;
  const failed = results.filter((r) => r.ok === false).length;
  const skipped = results.filter((r) => r.ok === null).length;

  banner("SUMMARY");
  log(`  Total:   ${results.length}`, C.bold);
  log(`  Passed:  ${passed}`, C.green);
  log(`  Failed:  ${failed}`, failed > 0 ? C.red : C.green);
  log(`  Skipped: ${skipped}`, C.yellow);

  if (failed > 0) {
    log("\n  FAILED:", C.red);
    for (const r of results.filter((r) => r.ok === false)) {
      log(`    ${r.name}: ${r.error}`, C.red);
    }
  }

  log("=".repeat(60), C.cyan);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("Fatal:", error);
  cleanup();
  process.exit(2);
});
