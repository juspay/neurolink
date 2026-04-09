#!/usr/bin/env npx tsx
/**
 * AutoResearch Live Demo — AI agent runs multiple research cycles.
 *
 * The fake training script responds to hyperparameter changes with
 * different metrics. The AI discovers improvements through experimentation.
 *
 * Usage: npx tsx examples/autoresearch/run-demo.ts
 */

import { NeuroLink } from "../../src/lib/neurolink.js";
import {
  resolveConfig,
  validateConfig,
} from "../../src/lib/autoresearch/config.js";
import { ResearchStateStore } from "../../src/lib/autoresearch/stateStore.js";
import { RepoPolicy } from "../../src/lib/autoresearch/repoPolicy.js";
import { ExperimentRunner } from "../../src/lib/autoresearch/runner.js";
import { ResultRecorder } from "../../src/lib/autoresearch/resultRecorder.js";
import { PromptCompiler } from "../../src/lib/autoresearch/promptCompiler.js";
import { createResearchTools } from "../../src/lib/autoresearch/tools.js";
import { readFileSync } from "node:fs";
import { execFileSync, execSync } from "node:child_process";

const REPO = "/tmp/autoresearch-demo";
const NUM_CYCLES = 5;

async function main() {
  console.log("============================================================");
  console.log("  AUTORESEARCH — AI-Powered Research (Multi-Cycle)");
  console.log(`  Running ${NUM_CYCLES} experiment cycles`);
  console.log("============================================================\n");

  // ── Configure ──────────────────────────────────────
  const config = resolveConfig({
    repoPath: REPO,
    mutablePaths: ["train.py"],
    immutablePaths: ["prepare.py", "program.md"],
    runCommand: "python3 train.py",
    metric: {
      name: "val_bpb",
      direction: "lower",
      pattern: "^val_bpb:\\s+([\\d.]+)",
    },
    memoryMetric: {
      name: "peak_vram_mb",
      pattern: "^peak_vram_mb:\\s+([\\d.]+)",
    },
    timeoutMs: 30_000,
  });
  validateConfig(config);

  // ── Initialize ─────────────────────────────────────
  const stateStore = new ResearchStateStore(REPO, config.statePath);
  const repoPolicy = new RepoPolicy(config);
  const runner = new ExperimentRunner(config);
  const recorder = new ResultRecorder(config);
  const promptCompiler = new PromptCompiler(config);

  try {
    execFileSync("git", ["checkout", "-b", "autoresearch/ai-demo"], {
      cwd: REPO,
      stdio: "ignore",
    });
  } catch {
    try {
      execFileSync("git", ["checkout", "autoresearch/ai-demo"], {
        cwd: REPO,
        stdio: "ignore",
      });
    } catch {
      /* */
    }
  }

  let state = await stateStore.initialize("ai-demo", "autoresearch/ai-demo");
  await recorder.ensureResultsFile();

  const neurolink = new NeuroLink();
  const tools = createResearchTools({
    config,
    stateStore,
    repoPolicy,
    runner,
    recorder,
  });
  const systemPrompt = await promptCompiler.buildSystemPrompt();

  console.log(`[SETUP] Provider: vertex | Tools: ${Object.keys(tools).length}`);
  console.log(`[SETUP] Baseline train.py: DEPTH=8, WIDTH=64, LR=0.04`);
  console.log(
    `[SETUP] Known optimum: ~0.921 (DEPTH=6, WIDTH=128, LR=0.03, DROPOUT=0.1, gelu, muon)`,
  );
  console.log();

  // ── Run cycles ─────────────────────────────────────
  for (let cycle = 1; cycle <= NUM_CYCLES; cycle++) {
    console.log(`${"═".repeat(60)}`);
    console.log(`  CYCLE ${cycle}/${NUM_CYCLES}`);
    console.log(`${"═".repeat(60)}`);

    // Reload state and results for fresh context
    state = (await stateStore.load())!;
    const results = await recorder.readAll();
    const cyclePrompt = await promptCompiler.buildCyclePrompt(state, results);

    const startTime = Date.now();

    try {
      const result = await neurolink.generate({
        input: { text: cyclePrompt },
        systemPrompt,
        tools,
        maxSteps: 15,
        provider: "vertex",
        temperature: 0.7,
        maxTokens: 4096,
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      // Show what the AI did
      const toolsUsed = result.toolsUsed || [];
      console.log(`  Tools: ${toolsUsed.join(" → ")}`);

      if (result.content) {
        // Show first 300 chars of reasoning
        const reasoning = result.content.replace(/\n/g, " ").slice(0, 300);
        console.log(`  AI: ${reasoning}`);
      }

      console.log(`  Time: ${elapsed}s`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ERROR: ${msg.slice(0, 200)}`);
    }

    // Show current state after this cycle
    const updatedState = await stateStore.load();
    if (updatedState) {
      console.log(
        `  State: runs=${updatedState.runCount} keeps=${updatedState.keepCount} best=${updatedState.bestMetric ?? "none"} last=${updatedState.lastStatus ?? "none"}`,
      );
    }

    // Show current train.py hyperparams
    try {
      const trainPy = readFileSync(REPO + "/train.py", "utf-8");
      const hpLines = trainPy
        .split("\n")
        .filter((l) =>
          /^(DEPTH|WIDTH|LR|DROPOUT|STEPS|ACTIVATION|OPTIMIZER)\s*=/.test(l),
        );
      console.log(`  Config: ${hpLines.join(" | ")}`);
    } catch {
      /* */
    }

    console.log();
  }

  // ── Final summary ──────────────────────────────────
  console.log("============================================================");
  console.log("  FINAL RESULTS");
  console.log("============================================================\n");

  try {
    const tsv = readFileSync(REPO + "/results.tsv", "utf-8");
    console.log(tsv);
  } catch {
    console.log("(no results)");
  }

  const finalState = await stateStore.load();
  console.log(`Best metric: ${finalState?.bestMetric}`);
  console.log(`Total runs: ${finalState?.runCount}`);
  console.log(`Keeps: ${finalState?.keepCount}`);
  console.log(
    `Keep rate: ${finalState?.runCount ? ((finalState.keepCount / finalState.runCount) * 100).toFixed(0) : 0}%`,
  );
  console.log();

  console.log("Git history:");
  console.log(
    execFileSync("git", ["log", "--oneline", "-10"], {
      cwd: REPO,
      encoding: "utf-8",
    }),
  );

  console.log("Final train.py hyperparameters:");
  const finalTrain = readFileSync(REPO + "/train.py", "utf-8");
  const hpLines = finalTrain
    .split("\n")
    .filter((l) =>
      /^(DEPTH|WIDTH|LR|DROPOUT|STEPS|ACTIVATION|OPTIMIZER)\s*=/.test(l),
    );
  for (const l of hpLines) console.log(`  ${l.trim()}`);

  try {
    await neurolink.dispose();
  } catch {
    /* */
  }

  console.log("\n============================================================");
  console.log("  DONE");
  console.log("============================================================");
}

main().catch((err) => {
  console.error("FATAL:", err.message || err);
  process.exit(1);
});
