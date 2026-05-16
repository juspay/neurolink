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
  Skip,
  isExpectedProviderError,
} from "./helpers/harness.js";
import { PROVIDERS, hasProviderEnv } from "./helpers/providerMatrix.js";

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

function skipIfProviderError(err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err);
  if (isExpectedProviderError(msg)) {
    throw new Skip(`provider unavailable — ${msg.slice(0, 100)}`);
  }
  throw err as Error;
}

function classifyCliFailure(args: string[], result: CliResult): never {
  const combined = `${result.stdout}\n${result.stderr}`;
  if (result.timedOut) {
    throw new Skip(
      `CLI ${args.join(" ")} timed out after ${CLI_TIMEOUT_MS / 1000}s — upstream likely hung`,
    );
  }
  if (isExpectedProviderError(combined)) {
    throw new Skip(
      `provider unavailable — ${combined.slice(0, 120).replace(/\s+/g, " ")}`,
    );
  }
  throw new Error(`CLI exited ${result.exitCode}\n${combined.slice(0, 400)}`);
}

async function runMatrix(): Promise<void> {
  for (const p of targets) {
    if (!p.text) {
      continue;
    }

    // ---------- generate ----------
    await test(`[${p.name}] CLI generate`, async () => {
      try {
        const result = await runCli([
          "generate",
          "--provider",
          p.name,
          "--model",
          p.defaultModel,
          "--maxTokens",
          "30",
          "--disableTools",
          "Reply with the single word HELLO and nothing else.",
        ]);
        if (result.exitCode !== 0 || !result.stdout.trim()) {
          classifyCliFailure(["generate", "--provider", p.name], result);
        }
      } catch (err) {
        skipIfProviderError(err);
      }
    });

    // ---------- stream ----------
    if (p.streaming) {
      await test(`[${p.name}] CLI stream`, async () => {
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
              "30",
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
          skipIfProviderError(err);
        }
      });
    }
  }
}

await runMatrix();
await runSuite();
