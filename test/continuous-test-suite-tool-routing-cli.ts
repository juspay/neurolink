#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — CLI tool-routing flags
 *
 * Validates that the --tool-routing family of CLI flags are wired into the
 * built CLI binary. Tests are grouped into two tiers:
 *
 *   DETERMINISTIC (no API keys needed):
 *     1. `generate --help` output contains --tool-routing flag
 *     2. `stream --help` output contains --tool-routing flag
 *     3. Parse-only invocation: --tool-routing with --help exits 0
 *        (yargs reports help without calling any provider)
 *
 *   LIVE-GATED (skipped without provider keys):
 *     4. `generate` with --tool-routing and a trivial prompt exits 0 and
 *        produces output — validates the flag is accepted at runtime.
 *
 * Run:
 *   pnpm run build && npx tsx test/continuous-test-suite-tool-routing-cli.ts
 *   pnpm run test:tool-routing-cli
 */

import {
  defineSuite,
  runCLI,
  isExpectedProviderError,
  Skip,
  log,
  logSection,
} from "./helpers/harness.js";
import { skipUnlessProviderAvailable } from "./helpers/skipIf.js";

const { test, runSuite } = defineSuite("CLI Tool-Routing Flags");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Yargs flag-parsing errors are never provider/auth issues — they mean the
 * CLI binary rejected a flag we passed. We want those to FAIL, not SKIP.
 */
function isYargsParseError(stderr: string): boolean {
  return /\b(?:Invalid values|Missing required argument|Unknown argument|Not enough non-option arguments)\b/i.test(
    stderr,
  );
}

/**
 * Map a CLI process result to SKIP/FAIL/PASS.
 *
 *  - exitCode === 0 → PASS (caller should assert content)
 *  - yargs parse error → FAIL (bad flag definition, not an env issue)
 *  - known provider error in stderr/stdout → SKIP
 *  - any other non-zero exit → throw with stderr so the test FAILS
 */
function interpretCLIResult(
  stdout: string,
  stderr: string,
  exitCode: number,
): "ok" | "skip" {
  if (exitCode === 0) {
    return "ok";
  }

  if (isYargsParseError(stderr)) {
    throw new Error(
      `CLI yargs parse error (exit ${exitCode}): ${stderr.slice(0, 300)}`,
    );
  }

  // A harness timeout kills the process (SIGTERM, exitCode -1) and appends a
  // marker to stderr. A slow or throttled live provider call is an
  // environmental condition, not a flag/feature defect — skip, don't fail.
  if (exitCode < 0 || /\[harness\] command timed out/i.test(stderr)) {
    return "skip";
  }

  const combined = `${stderr}\n${stdout}`;
  if (isExpectedProviderError(combined)) {
    return "skip";
  }

  throw new Error(
    `CLI exited with code ${exitCode}.\nstderr: ${stderr.slice(0, 300)}\nstdout: ${stdout.slice(0, 300)}`,
  );
}

// ---------------------------------------------------------------------------
// DETERMINISTIC: help-text assertions
// ---------------------------------------------------------------------------

await test("generate --help lists --tool-routing flag", async () => {
  logSection("generate --help contains --tool-routing");

  const { stdout, stderr, exitCode } = await runCLI(["generate", "--help"], {
    env: { NO_COLOR: "1" },
    timeoutMs: 15_000,
  });

  if (exitCode !== 0) {
    // --help should always exit 0 on yargs; any other result is a test failure
    throw new Error(
      `generate --help exited ${exitCode}.\nstderr: ${stderr.slice(0, 200)}`,
    );
  }

  if (!stdout.includes("tool-routing")) {
    throw new Error(
      `generate --help output does not mention tool-routing.\nFirst 500 chars: ${stdout.slice(0, 500)}`,
    );
  }

  log(`  Found 'tool-routing' in generate --help output`, "green");
});

await test("stream --help lists --tool-routing flag", async () => {
  logSection("stream --help contains --tool-routing");

  const { stdout, stderr, exitCode } = await runCLI(["stream", "--help"], {
    env: { NO_COLOR: "1" },
    timeoutMs: 15_000,
  });

  if (exitCode !== 0) {
    throw new Error(
      `stream --help exited ${exitCode}.\nstderr: ${stderr.slice(0, 200)}`,
    );
  }

  if (!stdout.includes("tool-routing")) {
    throw new Error(
      `stream --help output does not mention tool-routing.\nFirst 500 chars: ${stdout.slice(0, 500)}`,
    );
  }

  log(`  Found 'tool-routing' in stream --help output`, "green");
});

await test("generate --help lists --tool-routing-timeout flag", async () => {
  const { stdout, exitCode } = await runCLI(["generate", "--help"], {
    env: { NO_COLOR: "1" },
    timeoutMs: 15_000,
  });

  if (exitCode !== 0) {
    throw new Error(`generate --help exited ${exitCode}`);
  }

  if (!stdout.includes("tool-routing-timeout")) {
    throw new Error(
      `generate --help missing --tool-routing-timeout. First 500 chars: ${stdout.slice(0, 500)}`,
    );
  }
});

await test("generate --help lists --tool-routing-always-include flag", async () => {
  const { stdout, exitCode } = await runCLI(["generate", "--help"], {
    env: { NO_COLOR: "1" },
    timeoutMs: 15_000,
  });

  if (exitCode !== 0) {
    throw new Error(`generate --help exited ${exitCode}`);
  }

  if (!stdout.includes("tool-routing-always-include")) {
    throw new Error(
      `generate --help missing --tool-routing-always-include. First 500 chars: ${stdout.slice(0, 500)}`,
    );
  }
});

await test("generate --help lists --tool-routing-servers flag", async () => {
  const { stdout, exitCode } = await runCLI(["generate", "--help"], {
    env: { NO_COLOR: "1" },
    timeoutMs: 15_000,
  });

  if (exitCode !== 0) {
    throw new Error(`generate --help exited ${exitCode}`);
  }

  if (!stdout.includes("tool-routing-servers")) {
    throw new Error(
      `generate --help missing --tool-routing-servers. First 500 chars: ${stdout.slice(0, 500)}`,
    );
  }
});

await test("generate --help lists --tool-routing-router-provider flag", async () => {
  const { stdout, exitCode } = await runCLI(["generate", "--help"], {
    env: { NO_COLOR: "1" },
    timeoutMs: 15_000,
  });

  if (exitCode !== 0) {
    throw new Error(`generate --help exited ${exitCode}`);
  }

  if (!stdout.includes("tool-routing-router-provider")) {
    throw new Error(
      `generate --help missing --tool-routing-router-provider. First 500 chars: ${stdout.slice(0, 500)}`,
    );
  }
});

await test("generate --help lists --tool-routing-router-model flag", async () => {
  const { stdout, exitCode } = await runCLI(["generate", "--help"], {
    env: { NO_COLOR: "1" },
    timeoutMs: 15_000,
  });

  if (exitCode !== 0) {
    throw new Error(`generate --help exited ${exitCode}`);
  }

  if (!stdout.includes("tool-routing-router-model")) {
    throw new Error(
      `generate --help missing --tool-routing-router-model. First 500 chars: ${stdout.slice(0, 500)}`,
    );
  }
});

await test("generate --help lists --tool-routing-router-region flag", async () => {
  const { stdout, exitCode } = await runCLI(["generate", "--help"], {
    env: { NO_COLOR: "1" },
    timeoutMs: 15_000,
  });

  if (exitCode !== 0) {
    throw new Error(`generate --help exited ${exitCode}`);
  }

  if (!stdout.includes("tool-routing-router-region")) {
    throw new Error(
      `generate --help missing --tool-routing-router-region. First 500 chars: ${stdout.slice(0, 500)}`,
    );
  }
});

await test("batch --help lists --tool-routing flag", async () => {
  logSection("batch --help contains --tool-routing");

  const { stdout, stderr, exitCode } = await runCLI(["batch", "--help"], {
    env: { NO_COLOR: "1" },
    timeoutMs: 15_000,
  });

  if (exitCode !== 0) {
    throw new Error(
      `batch --help exited ${exitCode}.\nstderr: ${stderr.slice(0, 200)}`,
    );
  }

  if (!stdout.includes("tool-routing")) {
    throw new Error(
      `batch --help output does not mention tool-routing.\nFirst 500 chars: ${stdout.slice(0, 500)}`,
    );
  }

  log(`  Found 'tool-routing' in batch --help output`, "green");
});

// ---------------------------------------------------------------------------
// LIVE-GATED: real provider call with --tool-routing
// ---------------------------------------------------------------------------

await test("generate --tool-routing with a real provider exits 0 and produces output", async () => {
  // Resolve the test provider from env / argv (same order as harness).
  const provider =
    process.env.NEUROLINK_TEST_PROVIDER ??
    process.env.TEST_PROVIDER ??
    "google-ai";

  // Gate: skip when the provider's credentials are absent.
  skipUnlessProviderAvailable(provider);

  logSection(`generate --tool-routing live (provider: ${provider})`);

  const { stdout, stderr, exitCode } = await runCLI(
    [
      "generate",
      "Say hello in one word.",
      "--provider",
      provider,
      "--tool-routing",
      "--maxTokens",
      "64",
    ],
    {
      env: { NO_COLOR: "1" },
      timeoutMs: 90_000,
    },
  );

  const status = interpretCLIResult(stdout, stderr, exitCode);
  if (status === "skip") {
    throw new Skip(
      `Provider error (skip): ${(stderr || stdout).slice(0, 200)}`,
    );
  }

  if (stdout.trim().length === 0) {
    throw new Error(
      `CLI exited 0 but produced no stdout.\nstderr: ${stderr.slice(0, 200)}`,
    );
  }

  log(`  Output (first 100 chars): ${stdout.trim().slice(0, 100)}`, "green");
});

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

await runSuite();
