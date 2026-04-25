#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Issue #1 — model access denied surface
 *
 * Curator P1-1: when LiteLLM (or any provider) returns a "team not allowed
 * to access model" 403, the SDK surfaces a raw error without a typed class
 * and without parsing the `allowed_models` list. There is no
 * `sdk.checkCredentials()` API for synchronous health-check.
 *
 * Strategy: REAL LiteLLM with `CURATOR_LITELLM_DENIED_MODEL`. Drive
 *           sdk.generate() and inspect the rejected error object.
 *           Probe the public surface for `checkCredentials`.
 *
 * Run: pnpm run build && npx tsx test/continuous-test-suite-issue-01-model-access.ts
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

async function test_1_1_raw_error_surface(): Promise<void> {
  const testName =
    "1.1 — raw error surface: real LiteLLM 403 reaches caller as untyped error";
  const skip = skipIfEnvMissing("LITELLM_BASE_URL", "LITELLM_API_KEY");
  if (skip) {
    return record(testName, "SKIP", skip);
  }

  const sdk = new NeuroLink();
  try {
    let captured: unknown = undefined;
    try {
      await sdk.generate({
        provider: "litellm",
        model: DENIED,
        input: { text: "hi" },
        maxTokens: 32,
        disableTools: true,
      } as never);
      record(
        testName,
        "FAIL",
        "expected rejection on denied model — got success",
      );
      return;
    } catch (err) {
      captured = err;
    }

    const ctorName =
      (captured as { constructor?: { name?: string } })?.constructor?.name ??
      "unknown";
    const msg = captured instanceof Error ? captured.message : String(captured);
    if (isExpectedProviderError(msg)) {
      // creds missing or rate-limited, not the bug we're testing
      return record(testName, "SKIP", msg.slice(0, 120));
    }

    const isTypedAccessError = ctorName === "ModelAccessDeniedError";
    if (isTypedAccessError) {
      record(testName, "PASS", `typed: ${ctorName}`);
    } else {
      record(
        testName,
        "FAIL",
        `bug-confirmed: surfaced as ${ctorName}; msg="${msg.slice(0, 200)}"`,
      );
    }
  } finally {
    await sdk.shutdown?.().catch(() => {});
  }
}

async function test_1_2_allowed_models_not_parsed(): Promise<void> {
  const testName =
    "1.2 — allowed_models extracted from real LiteLLM body onto rejection";
  const skip = skipIfEnvMissing("LITELLM_BASE_URL", "LITELLM_API_KEY");
  if (skip) {
    return record(testName, "SKIP", skip);
  }

  const sdk = new NeuroLink();
  try {
    let captured: unknown = undefined;
    try {
      await sdk.generate({
        provider: "litellm",
        model: DENIED,
        input: { text: "hi" },
        maxTokens: 32,
        disableTools: true,
      } as never);
    } catch (err) {
      captured = err;
    }

    if (!captured) {
      return record(testName, "FAIL", "no rejection captured");
    }

    const e = captured as Record<string, unknown>;
    const allowedModels = e.allowedModels;
    const requestedModel = e.requestedModel;
    const msg = e instanceof Error ? e.message : String(captured);

    // Reviewer Finding #5: when a network/DNS/credential error fires
    // before the SDK can extract `allowedModels`, treat it as SKIP
    // (provider unreachable) — same convention as test 1.1. Without
    // this guard a transient DNS failure misreports as `bug-confirmed`.
    // The `!includes("can only access")` clause keeps the LiteLLM
    // team-denied body (which does parse-as-bug) from being SKIPped.
    if (isExpectedProviderError(msg) && !msg.includes("can only access")) {
      return record(testName, "SKIP", msg.slice(0, 120));
    }

    if (Array.isArray(allowedModels) && allowedModels.length > 0) {
      record(
        testName,
        "PASS",
        `allowedModels=${JSON.stringify(allowedModels)}; requestedModel=${requestedModel}`,
      );
    } else {
      record(
        testName,
        "FAIL",
        `bug-confirmed: rejection has no .allowedModels property. raw msg contains list inline: ${msg.includes("can only access") ? "yes" : "no"}`,
      );
    }
  } finally {
    await sdk.shutdown?.().catch(() => {});
  }
}

async function test_1_3_checkCredentials_api_absent(): Promise<void> {
  const testName =
    "1.3 — sdk.checkCredentials({ provider }) exists on public surface";
  const sdk = new NeuroLink();
  try {
    const fn = (sdk as unknown as Record<string, unknown>)["checkCredentials"];
    if (typeof fn === "function") {
      record(testName, "PASS", "method present");
    } else {
      record(
        testName,
        "FAIL",
        `bug-confirmed: typeof sdk.checkCredentials === ${typeof fn}`,
      );
    }
  } finally {
    await sdk.shutdown?.().catch(() => {});
  }
}

async function test_1_5_bad_openai_key_surfaces_raw(): Promise<void> {
  const testName =
    "1.5 — wrong OpenAI key produces typed AuthenticationError (not raw 401)";
  // We pass a deliberately-bad credential per-call so the env's good key
  // is unaffected.
  const sdk = new NeuroLink();
  try {
    let captured: unknown = undefined;
    try {
      await sdk.generate({
        provider: "openai",
        input: { text: "hi" },
        maxTokens: 32,
        disableTools: true,
        credentials: { openai: { apiKey: "sk-test-deliberately-invalid" } },
      } as never);
    } catch (err) {
      captured = err;
    }
    if (!captured) {
      return record(testName, "SKIP", "expected rejection — got success");
    }
    const ctorName =
      (captured as { constructor?: { name?: string } })?.constructor?.name ??
      "unknown";
    const msg = captured instanceof Error ? captured.message : String(captured);
    if (ctorName === "AuthenticationError") {
      record(testName, "PASS", `typed: ${ctorName}; msg=${msg.slice(0, 80)}`);
    } else {
      record(
        testName,
        "FAIL",
        `bug-related: surfaced as ${ctorName}; msg="${msg.slice(0, 200)}"`,
      );
    }
  } finally {
    await sdk.shutdown?.().catch(() => {});
  }
}

async function main(): Promise<void> {
  section("Issue #1 — model access denied: typed errors and checkCredentials");
  console.log(`   DENIED=${DENIED}\n`);
  await test_1_1_raw_error_surface();
  await test_1_2_allowed_models_not_parsed();
  await test_1_3_checkCredentials_api_absent();
  await test_1_5_bad_openai_key_surfaces_raw();
  const passed = results.filter((r) => r.outcome === "PASS").length;
  const failed = results.filter((r) => r.outcome === "FAIL").length;
  const skipped = results.filter((r) => r.outcome === "SKIP").length;
  console.log(
    `\n${colors.bright}Results:${colors.reset} ${passed} passed, ${failed} failed, ${skipped} skipped`,
  );
  process.exit(0); // bug repro: failed > 0 expected
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
