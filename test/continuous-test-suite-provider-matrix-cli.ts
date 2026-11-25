#!/usr/bin/env tsx
import "dotenv/config";
/**
 * Continuous Test Suite: Provider Capability Matrix (CLI)
 *
 * The CLI mirror of `continuous-test-suite-provider-matrix.ts`. Spawns
 * `node dist/cli/index.js` for every provider in `PROVIDERS` and exercises
 * the two end-user commands every chat provider must support: `generate`
 * (single response) and `stream` (token-by-token output). Embed providers
 * are skipped because the CLI doesn't expose an `embed` command.
 *
 * The point isn't to repeat what the SDK matrix already proves about
 * provider correctness — it's to catch CLI-only regressions: argument
 * parsing, env var loading, exit codes, dist-bundling drift between the
 * library and the binary, and any provider whose CLI choice list is out
 * of sync with the SDK factory.
 *
 * Run:  npx tsx test/continuous-test-suite-provider-matrix-cli.ts
 *       npx tsx test/continuous-test-suite-provider-matrix-cli.ts --provider=openai
 *       npx tsx test/continuous-test-suite-provider-matrix-cli.ts --provider=vertex,anthropic
 */

import { spawn } from "node:child_process";
import {
  defineSuite,
  log,
  logSection,
  Skip,
  isExpectedProviderError,
} from "./helpers/harness.js";
import {
  coverageLines,
  coverageOf,
  isExpectedLive,
  noteQuietSkip,
  noteRetired,
  recordCell,
  retiredEntry,
  settleCell,
} from "./helpers/liveGate.js";
import { PROVIDERS, hasProviderEnv } from "./helpers/providerMatrix.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

// This suite spawns `dist/cli/index.js`, so a stale dist means it silently
// exercises an old binary — and the whole point of the suite is to catch
// CLI-only drift between the library and that binary, which is exactly what a
// stale dist hides. Its SDK sibling (continuous-test-suite-provider-matrix.ts)
// has always guarded this; this one did not.
// The CLI bundle is named explicitly: the directory-wide check takes the
// newest mtime anywhere under dist/, so a freshly written dist/index.js would
// keep it quiet while dist/cli/index.js — the thing this suite actually
// spawns — stayed stale from a partial build.
assertDistFresh({ entrypoints: ["dist/cli/index.js"] });

const { test, runSuite, opts } = defineSuite(
  "Provider Capability Matrix (CLI)",
);

const requested =
  opts.provider !== undefined
    ? opts.provider.split(",").map((s) => s.trim())
    : null;

const targets = Object.values(PROVIDERS).filter((p) => {
  if (requested && requested.length > 0) {
    return requested.includes(p.name);
  }
  return hasProviderEnv(p.name);
});

if (targets.length === 0) {
  console.log("\n  No providers selected. Either:");
  console.log("    • Set provider env vars (e.g. OPENAI_API_KEY)");
  console.log("    • Pass --provider=name1,name2 to force-include");
  console.log();
}

const CLI_BIN = "dist/cli/index.js";
const CLI_TIMEOUT_MS = 120_000;

type CliResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};

/**
 * Deliberately NOT `runCLI` from helpers/harness.js. That helper returns
 * `ProcessResult`, which is `{ stdout, stderr, exitCode }` and has no way to
 * say a run was killed for exceeding its deadline. This suite needs that
 * distinction: a provider that hangs is a SKIP in a nightly sweep, not a
 * failure, and folding it into a plain non-zero exit would turn every wedged
 * upstream into red. Deduplicating these means teaching `runCommand` to
 * surface a timeout flag — a shared-helper change affecting every suite that
 * uses it, not a local import swap.
 */
function runCli(args: string[]): Promise<CliResult> {
  return new Promise((resolve) => {
    const child = spawn("node", [CLI_BIN, ...args], {
      env: { ...process.env, FORCE_COLOR: "0" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, CLI_TIMEOUT_MS);
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        exitCode: code ?? -1,
        stdout,
        stderr,
        timedOut,
      });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        exitCode: -1,
        stdout,
        stderr: stderr + String(err),
        timedOut,
      });
    });
  });
}

/**
 * One cell of the CLI matrix. The body's own catch hands its error to
 * `settleCell` (test/helpers/liveGate.ts): a keyed provider answering with a
 * credential, account or rate-limit error FAILS unless the allowlist excuses
 * it, exactly as in the SDK matrix. A body that returns has passed.
 */
function cell(
  providerName: string,
  label: string,
  body: () => Promise<void>,
): Promise<void> {
  return test(label, async () => {
    await body();
    recordCell(providerName, "passed");
  });
}

/**
 * The final throw below deliberately does NOT embed any of `combined` (CLI
 * stdout/stderr). CLAUDE.md warns that quoting provider output into a thrown
 * message can turn a real failure into a silent SKIP, because
 * `isExpectedProviderError()` re-applies to the message text in
 * `defineSuite`'s `test()`. A truncated prefix does not make that safe:
 * `API_KEY_PATTERN` in `test/helpers/envGuard.ts` ends with a
 * `(?=$|[^A-Za-z0-9])` lookahead, so cutting the string can itself create a
 * match — e.g. text ending "...api_key" is a non-match in the full string
 * when followed by another alphanumeric character, but becomes a match once
 * truncated right after "api_key", because `$` now sits there. Describe the
 * discrepancy without quoting the payload instead.
 */
function classifyCliFailure(args: string[], result: CliResult): never {
  const combined = `${result.stdout}\n${result.stderr}`;
  if (result.timedOut) {
    throw new Skip(
      `CLI ${args.join(" ")} timed out after ${CLI_TIMEOUT_MS / 1000}s — upstream likely hung`,
    );
  }
  if (isExpectedProviderError(combined)) {
    // Not a Skip: the catch around the cell passes it to settleCell, which
    // decides from the provider and the error whether it is a skip, an
    // allowlisted failure or a FAIL. The whole text goes through, uncut.
    throw new Error(combined);
  }
  throw new Error(
    `CLI ${args.join(" ")} exited ${result.exitCode} with unexpected output ` +
      `(stdout ${result.stdout.length} chars, stderr ${result.stderr.length} chars)`,
  );
}

async function runMatrix(): Promise<void> {
  for (const p of targets) {
    if (!p.text) {
      continue;
    }

    // A retired provider's account is known dead; see LIVE_GATE_RETIRED.
    const retired = retiredEntry(p.name);
    if (retired) {
      noteRetired(p.name);
      await test(`[${p.name}] not run: retired from the nightly on ${retired.retired}`, () => {
        throw new Skip(retired.reason);
      });
      continue;
    }

    // A provider with no secret and no recorded live run has nothing to prove;
    // spawning the CLI for it only logs an ERROR for the key it was never given.
    if (!isExpectedLive(p.name)) {
      noteQuietSkip(p.name);
      await test(`[${p.name}] not run: no secret and no live evidence`, () => {
        throw new Skip(`set ${p.envVars[0]} to run it`);
      });
      continue;
    }

    // ---------- generate ----------
    await cell(p.name, `[${p.name}] CLI generate`, async () => {
      try {
        const result = await runCli([
          "generate",
          "--provider",
          p.name,
          "--model",
          p.defaultModel,
          "--maxTokens",
          "200",
          "--disableTools",
          "Reply with the single word HELLO and nothing else.",
        ]);
        if (result.exitCode !== 0 || !result.stdout.trim()) {
          classifyCliFailure(["generate", "--provider", p.name], result);
        }
      } catch (err) {
        settleCell(p.name, err);
      }
    });

    // ---------- stream ----------
    if (p.streaming) {
      await cell(p.name, `[${p.name}] CLI stream`, async () => {
        try {
          let lastResult: CliResult | null = null;
          for (let attempt = 1; attempt <= 2; attempt++) {
            const result = await runCli([
              "stream",
              "--provider",
              p.name,
              "--model",
              p.defaultModel,
              "--maxTokens",
              "200",
              "--disableTools",
              "Count from 1 to 3.",
            ]);
            lastResult = result;
            if (result.exitCode === 0 && result.stdout.trim().length > 0) {
              return;
            }
          }
          if (lastResult) {
            classifyCliFailure(["stream", "--provider", p.name], lastResult);
          }
        } catch (err) {
          settleCell(p.name, err);
        }
      });
    }
  }

  logSection("Live gate coverage");
  for (const line of coverageLines(
    coverageOf(targets.map((target) => target.name)),
  )) {
    log(`  ${line}`, "blue");
  }
}

await runMatrix();
await runSuite();
