#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Issue #3 — providerFallback / modelChain absence
 *
 * Curator P2-3: Curator wants either:
 *   (a) a callback `providerFallback(error) -> { provider?, model? } | null`, or
 *   (b) an ordered `modelChain: [m1, m2, m3]`,
 * so it can centrally drive fallback policy when a provider returns
 * MODEL_ACCESS_DENIED. Today neither hook exists.
 *
 * Strategy: REAL LiteLLM with the configured `LITELLM_BASE_URL`. Send a
 *           generate against `CURATOR_LITELLM_DENIED_MODEL` (default
 *           `sonnet-4-5`), pass `providerFallback`/`modelChain` options,
 *           observe whether the callback fires / chain progresses.
 *
 * Run: pnpm run build && npx tsx test/continuous-test-suite-issue-03-fallback-hook.ts
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

function section(t: string): void {
  console.log(
    `\n${colors.cyan}${"=".repeat(72)}\n  ${t}\n${"=".repeat(72)}${colors.reset}`,
  );
}

const DENIED = process.env.CURATOR_LITELLM_DENIED_MODEL ?? "sonnet-4-5";
const ALLOWED = process.env.CURATOR_LITELLM_ALLOWED_MODEL ?? "open-large";

/** Try the option on the public surface; observe whether it has any effect. */
async function test_3_1_providerFallback_callback_ignored(): Promise<void> {
  const testName =
    "3.1 — instance providerFallback callback is invoked on denied model";
  const skip = skipIfEnvMissing("LITELLM_BASE_URL", "LITELLM_API_KEY");
  if (skip) {
    return record(testName, "SKIP", skip);
  }

  let callbackFired = 0;
  let callbackSawError: unknown = undefined;
  // Pass providerFallback at construction; cast to never to bypass missing type.
  const sdk = new NeuroLink({
    providerFallback: async (err: unknown) => {
      callbackFired++;
      callbackSawError = err;
      return { model: ALLOWED };
    },
  } as never);

  try {
    let surfacedError = "";
    try {
      const r = await sdk.generate({
        provider: "litellm",
        model: DENIED,
        input: { text: "Reply: hello" },
        maxTokens: 32,
        disableTools: true,
      } as never);
      // If this path is reached, the call succeeded — either no denial occurred,
      // or fallback secretly succeeded. Inspect.
      record(
        testName,
        callbackFired > 0 ? "PASS" : "FAIL",
        `callbackFired=${callbackFired}; resultModel=${r.model}; resultProvider=${r.provider}`,
      );
      return;
    } catch (err) {
      surfacedError = err instanceof Error ? err.message : String(err);
    }

    if (callbackFired === 0) {
      record(
        testName,
        "FAIL",
        `bug-confirmed: callback never invoked despite real denial. surfacedError=${surfacedError.slice(
          0,
          200,
        )}`,
      );
    } else {
      record(
        testName,
        "PASS",
        `callback fired ${callbackFired}× with error=${(callbackSawError as Error)?.message?.slice(0, 80)}; final error=${surfacedError.slice(0, 80)}`,
      );
    }
  } finally {
    await sdk.shutdown?.().catch(() => {});
  }
}

async function test_3_3_modelChain_ignored(): Promise<void> {
  const testName =
    "3.3 — modelChain: [DENIED, ALLOWED] falls through to ALLOWED";
  const skip = skipIfEnvMissing("LITELLM_BASE_URL", "LITELLM_API_KEY");
  if (skip) {
    return record(testName, "SKIP", skip);
  }

  const sdk = new NeuroLink({
    modelChain: [DENIED, ALLOWED],
  } as never);

  try {
    try {
      // Set model=DENIED explicitly so the chain has something to fall through.
      // If chain works, second model (ALLOWED) is used after first fails.
      const r = await sdk.generate({
        provider: "litellm",
        model: DENIED,
        input: { text: "Reply: hello" },
        maxTokens: 32,
        disableTools: true,
      } as never);
      if (r.model === ALLOWED) {
        record(testName, "PASS", `chain progressed; resultModel=${r.model}`);
      } else {
        record(
          testName,
          "FAIL",
          `chain ignored; resultModel=${r.model} (expected ${ALLOWED})`,
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (isExpectedProviderError(msg)) {
        return record(testName, "SKIP", msg.slice(0, 120));
      }
      record(
        testName,
        "FAIL",
        `bug-confirmed: chain ignored; raw error=${msg.slice(0, 200)}`,
      );
    }
  } finally {
    await sdk.shutdown?.().catch(() => {});
  }
}

async function test_3_5_modelFallback_event_missing(): Promise<void> {
  const testName = "3.5 — model.fallback event fires on chain progression";
  const skip = skipIfEnvMissing("LITELLM_BASE_URL", "LITELLM_API_KEY");
  if (skip) {
    return record(testName, "SKIP", skip);
  }

  const sdk = new NeuroLink({
    modelChain: [DENIED, ALLOWED],
  } as never);

  let events = 0;
  sdk.getEventEmitter().on("model.fallback", () => events++);

  try {
    try {
      await sdk.generate({
        provider: "litellm",
        model: DENIED, // explicit so the chain has something to fall through
        input: { text: "hi" },
        maxTokens: 32,
        disableTools: true,
      } as never);
    } catch {
      /* ignore */
    }
    if (events > 0) {
      record(testName, "PASS", `events=${events}`);
    } else {
      record(testName, "FAIL", `bug-confirmed: events=0 (expected >=1)`);
    }
  } finally {
    await sdk.shutdown?.().catch(() => {});
  }
}

async function test_3_typecheck_publicSurface_misses_options(): Promise<void> {
  const testName =
    "3.0 — type surface: providerFallback/modelChain options absent on public types";
  // We import the published type definitions and check whether the option
  // names appear at all in the constructor / generate / stream option types.
  const fs = await import("node:fs/promises");
  const candidatePaths = [
    "dist/index.d.ts",
    "dist/lib/types/config.d.ts",
    "dist/lib/types/generate.d.ts",
    "dist/lib/types/stream.d.ts",
  ];
  let combined = "";
  for (const p of candidatePaths) {
    try {
      combined += await fs.readFile(p, "utf-8");
    } catch {
      // file may not exist on every build target
    }
  }
  if (!combined) {
    record(testName, "SKIP", "no dist .d.ts files found");
    return;
  }
  const hasProviderFallback = /providerFallback/.test(combined);
  const hasModelChain = /modelChain/.test(combined);
  if (!hasProviderFallback || !hasModelChain) {
    record(
      testName,
      "FAIL",
      `bug-confirmed: providerFallback=${hasProviderFallback} modelChain=${hasModelChain}`,
    );
  } else {
    record(
      testName,
      "PASS",
      `providerFallback=${hasProviderFallback}, modelChain=${hasModelChain}`,
    );
  }
}

async function main(): Promise<void> {
  section("Issue #3 — providerFallback / modelChain hooks absent");
  console.log(
    `   DENIED=${DENIED}  ALLOWED=${ALLOWED}  LITELLM_BASE_URL=${process.env.LITELLM_BASE_URL ?? "(unset)"}\n`,
  );
  await test_3_typecheck_publicSurface_misses_options();
  await test_3_1_providerFallback_callback_ignored();
  await test_3_3_modelChain_ignored();
  await test_3_5_modelFallback_event_missing();
  const passed = results.filter((r) => r.outcome === "PASS").length;
  const failed = results.filter((r) => r.outcome === "FAIL").length;
  const skipped = results.filter((r) => r.outcome === "SKIP").length;
  console.log(
    `\n${colors.bright}Results:${colors.reset} ${passed} passed, ${failed} failed, ${skipped} skipped`,
  );
  process.exit(0); // bug reproduction: failed > 0 is expected
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
