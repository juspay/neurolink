#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Issue #4 — generation:end emission count
 *
 * Curator P2-4: cost listeners that subscribe to `generation:end` may
 * double-count when both the provider-level emit and the SDK orchestration
 * emit fire for the same call.
 *
 * Strategy: REAL providers; subscribe sdk.on("generation:end", ...);
 *           run a generate and a stream against each configured provider;
 *           record emission count. No mocks.
 *
 * Run: pnpm run build && npx tsx test/continuous-test-suite-issue-04-generation-end-dedup.ts
 */
import "dotenv/config";

import { NeuroLink } from "../dist/index.js";
import {
  isExpectedProviderError,
  skipIfEnvMissing,
} from "./helpers/envGuard.js";

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bright: "\x1b[1m",
};

type Outcome = "PASS" | "FAIL" | "SKIP";
const results: { name: string; outcome: Outcome; detail: string }[] = [];

function record(name: string, outcome: Outcome, detail: string): void {
  results.push({ name, outcome, detail });
  const color =
    outcome === "PASS"
      ? colors.green
      : outcome === "FAIL"
        ? colors.red
        : colors.yellow;
  console.log(`${color}[${outcome}]${colors.reset} ${name} — ${detail}`);
}

function section(title: string): void {
  console.log(
    `\n${colors.cyan}${"=".repeat(72)}\n  ${title}\n${"=".repeat(72)}${colors.reset}`,
  );
}

type ProviderTarget = {
  provider: string;
  envVars: string[];
  modelEnv?: string;
};

const TARGETS: ProviderTarget[] = [
  { provider: "openai", envVars: ["OPENAI_API_KEY"], modelEnv: "OPENAI_MODEL" },
  {
    provider: "vertex",
    envVars: ["GOOGLE_VERTEX_PROJECT", "GOOGLE_AUTH_CLIENT_EMAIL"],
    modelEnv: "VERTEX_MODEL",
  },
  {
    provider: "google-ai-studio",
    envVars: ["GOOGLE_AI_API_KEY"],
    modelEnv: "GOOGLE_AI_MODEL",
  },
  {
    provider: "litellm",
    envVars: ["LITELLM_BASE_URL", "LITELLM_API_KEY", "LITELLM_MODEL"],
    modelEnv: "LITELLM_MODEL",
  },
];

async function countEmissionsForGenerate(
  target: ProviderTarget,
): Promise<void> {
  const testName = `generate / ${target.provider} — generation:end emissions`;
  const skip = skipIfEnvMissing(...target.envVars);
  if (skip) {
    record(testName, "SKIP", skip);
    return;
  }
  const sdk = new NeuroLink();
  const events: unknown[] = [];
  sdk.getEventEmitter().on("generation:end", (e: unknown) => events.push(e));
  try {
    const model = target.modelEnv ? process.env[target.modelEnv] : undefined;
    const result = await sdk.generate({
      provider: target.provider as never,
      ...(model && { model }),
      input: { text: "Reply with the single word: hello" },
      maxTokens: 32,
      disableTools: true,
    } as never);
    const detail = `count=${events.length}; provider=${result.provider}; model=${result.model}`;
    if (events.length === 1) {
      record(testName, "PASS", `expected 1, ${detail}`);
    } else {
      record(testName, "FAIL", `expected 1, got ${events.length}: ${detail}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isExpectedProviderError(msg)) {
      record(testName, "SKIP", msg.slice(0, 120));
    } else {
      record(testName, "FAIL", `unexpected error: ${msg.slice(0, 200)}`);
    }
  } finally {
    await sdk.shutdown?.().catch(() => {});
  }
}

async function countEmissionsForStream(target: ProviderTarget): Promise<void> {
  const testName = `stream  / ${target.provider} — generation:end emissions`;
  const skip = skipIfEnvMissing(...target.envVars);
  if (skip) {
    record(testName, "SKIP", skip);
    return;
  }
  const sdk = new NeuroLink();
  const events: unknown[] = [];
  sdk.getEventEmitter().on("generation:end", (e: unknown) => events.push(e));
  try {
    const model = target.modelEnv ? process.env[target.modelEnv] : undefined;
    const r = await sdk.stream({
      provider: target.provider as never,
      ...(model && { model }),
      input: { text: "Reply with the single word: hello" },
      maxTokens: 32,
      disableTools: true,
    } as never);
    let chunks = 0;
    for await (const _ of r.stream) {
      chunks++;
    }
    // small grace period for any post-stream async emit
    await new Promise((r) => setTimeout(r, 250));
    const detail = `count=${events.length}; chunks=${chunks}; provider=${r.provider}; model=${r.model}`;
    if (events.length === 1) {
      record(testName, "PASS", `expected 1, ${detail}`);
    } else {
      record(testName, "FAIL", `expected 1, got ${events.length}: ${detail}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isExpectedProviderError(msg)) {
      record(testName, "SKIP", msg.slice(0, 120));
    } else {
      record(testName, "FAIL", `unexpected error: ${msg.slice(0, 200)}`);
    }
  } finally {
    await sdk.shutdown?.().catch(() => {});
  }
}

async function main(): Promise<void> {
  section("Issue #4 — generation:end emission count per call (expect 1)");
  for (const t of TARGETS) {
    await countEmissionsForGenerate(t);
    await new Promise((r) => setTimeout(r, 1000));
    await countEmissionsForStream(t);
    await new Promise((r) => setTimeout(r, 1000));
  }
  const passed = results.filter((r) => r.outcome === "PASS").length;
  const failed = results.filter((r) => r.outcome === "FAIL").length;
  const skipped = results.filter((r) => r.outcome === "SKIP").length;
  console.log(
    `\n${colors.bright}Results:${colors.reset} ${passed} passed, ${failed} failed, ${skipped} skipped`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
