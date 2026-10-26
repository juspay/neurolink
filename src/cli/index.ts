#!/usr/bin/env node

// Suppress dotenv v17 stdout banner before any imports — it pollutes CLI JSON output
process.env.DOTENV_CONFIG_QUIET = "true";

/**
 * NeuroLink CLI
 *
 * Professional CLI experience with minimal maintenance overhead.
 * Features: Spinners, colors, batch processing, provider testing, rich help
 */

import { existsSync } from "node:fs";
import * as path from "node:path";
import { initializeCliParser } from "./parser.js";
import chalk from "chalk";
import { initializeCliLifecycle, cleanupCliLifecycle } from "./lifecycle.js";
import { loadProcessDotenv } from "../lib/utils/dotenvBootstrap.js";
import { ensureStdinRef } from "./utils/stdinRef.js";
import {
  PROJECT_MCP_CONFIG_FILENAME,
  TRUST_MCP_CONFIG_ENV,
  TRUST_MCP_CONFIG_FLAG,
  formatProjectMcpConfigSummary,
  getProjectMcpConfigTrustStatus,
  getTrustedMcpConfigStorePath,
  recordTrustedProjectMcpConfig,
  setProjectMcpConfigTrustHook,
  summarizeProjectMcpConfig,
} from "../lib/mcp/projectConfigTrust.js";
import type {
  ProjectMcpConfigSummary,
  ProjectMcpConfigTrustStatus,
} from "../lib/types/index.js";

// Clean up pnpm-specific environment variables that cause npm warnings
// These variables are set by pnpm but cause "Unknown env config" warnings in npm
if (process.env.npm_config_verify_deps_before_run) {
  delete process.env.npm_config_verify_deps_before_run;
}
if (process.env.npm_config__jsr_registry) {
  delete process.env.npm_config__jsr_registry;
}

// `--trust-mcp-config` is a global flag consumed here, before yargs sees the
// argument vector: the parser runs with `strictOptions()`, so an option it
// does not know about would otherwise be rejected on every command.
const trustMcpConfigFlag = process.argv.includes(TRUST_MCP_CONFIG_FLAG);
if (trustMcpConfigFlag) {
  process.argv = process.argv.filter(
    (argument) => argument !== TRUST_MCP_CONFIG_FLAG,
  );
}

// Load environment variables from `.env`. The CLI is the one entry point
// that still does this implicitly — a terminal session in a project directory
// is what the file is for. Endpoint-override variables are refused unless the
// file is owned by this user and not group/world-writable; see
// dotenvBootstrap.ts. `NEUROLINK_DOTENV=0` disables the load entirely.
await loadProcessDotenv({ caller: "cli" });

function warn(message: string): void {
  process.stderr.write(chalk.yellow(`${message}\n`));
}

function isHelpOrVersionInvocation(args: string[]): boolean {
  if (args.length === 0) {
    return true;
  }
  return args.some(
    (argument) =>
      argument === "--help" ||
      argument === "-h" ||
      argument === "help" ||
      argument === "--version" ||
      argument === "-V" ||
      argument === "version",
  );
}

function describeUntrusted(
  summary: ProjectMcpConfigSummary,
  status: ProjectMcpConfigTrustStatus,
): string[] {
  return [
    status === "changed"
      ? `This project's ${PROJECT_MCP_CONFIG_FILENAME} has changed since you last trusted it:`
      : `This project has a ${PROJECT_MCP_CONFIG_FILENAME} you have not trusted yet:`,
    ...formatProjectMcpConfigSummary(summary),
    "Loading it starts the commands and connections above with your environment.",
  ];
}

function howToDecide(): string[] {
  return [
    "To continue, either:",
    `  • review the file, then re-run with ${TRUST_MCP_CONFIG_FLAG} (or ${TRUST_MCP_CONFIG_ENV}=1) to trust exactly this content — the hash is remembered in ${getTrustedMcpConfigStorePath()}`,
    `  • or set ${TRUST_MCP_CONFIG_ENV}=0 to run without it`,
    "  • or pass --disable-tools so no MCP server is needed",
  ];
}

async function promptForTrust(
  summary: ProjectMcpConfigSummary,
  status: ProjectMcpConfigTrustStatus,
): Promise<boolean> {
  ensureStdinRef();
  const readline = await import("node:readline/promises");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stderr,
  });
  try {
    process.stderr.write(
      chalk.yellow(`${describeUntrusted(summary, status).join("\n")}\n`),
    );
    const answer = await rl.question(
      "Trust this file and start these servers? [y/N] ",
    );
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

/**
 * Decide, once per invocation, what to do about the working directory's
 * `.mcp-config.json`, and hand that decision to the SDK through its trust
 * hook. The hook only runs when a command actually initialises MCP, so a
 * command that never needs a tool is unaffected, and the decision that does
 * refuse happens before any server is started.
 *
 * A file already recorded in `~/.neurolink/trusted-mcp-configs.json` with the
 * same hash loads silently. Otherwise `--trust-mcp-config` /
 * `NEUROLINK_TRUST_MCP_CONFIG=1` accepts and records it, `=0` ignores it, an
 * interactive terminal is asked, and a non-interactive run that was told
 * nothing refuses with exit status 1 at the moment the file would load.
 */
async function installProjectMcpConfigGate(): Promise<void> {
  if (isHelpOrVersionInvocation(process.argv.slice(2))) {
    return;
  }
  const candidate = path.join(process.cwd(), PROJECT_MCP_CONFIG_FILENAME);
  if (!existsSync(candidate)) {
    return;
  }

  const envValue = process.env[TRUST_MCP_CONFIG_ENV];
  if (envValue === "0" || envValue === "false") {
    setProjectMcpConfigTrustHook(async () => {
      warn(
        `[neurolink] Ignoring ${candidate} (${TRUST_MCP_CONFIG_ENV}=${envValue}).`,
      );
      return null;
    });
    return;
  }

  let summary: ProjectMcpConfigSummary;
  try {
    summary = summarizeProjectMcpConfig(candidate);
  } catch (error) {
    setProjectMcpConfigTrustHook(async () => {
      warn(
        `[neurolink] Not loading ${candidate}: it could not be read (${error instanceof Error ? error.message : String(error)}).`,
      );
      return null;
    });
    return;
  }

  // Nothing to run, nothing to trust: let the loader report the parse error
  // or the empty server list itself.
  if (summary.parseError !== undefined || summary.servers.length === 0) {
    setProjectMcpConfigTrustHook(async () => summary.path);
    return;
  }

  const status = getProjectMcpConfigTrustStatus(summary.path, summary.sha256);
  if (status === "trusted") {
    setProjectMcpConfigTrustHook(async () => summary.path);
    return;
  }

  const accept = (): void => {
    try {
      recordTrustedProjectMcpConfig(summary.path, summary.sha256);
    } catch (error) {
      warn(
        `[neurolink] Trusted ${summary.path} for this run, but could not record it in ${getTrustedMcpConfigStorePath()} (${error instanceof Error ? error.message : String(error)}).`,
      );
    }
    setProjectMcpConfigTrustHook(async () => summary.path);
  };

  if (trustMcpConfigFlag || envValue === "1" || envValue === "true") {
    accept();
    return;
  }

  const interactive = Boolean(process.stdin.isTTY && process.stderr.isTTY);
  if (interactive) {
    if (await promptForTrust(summary, status)) {
      accept();
    } else {
      warn(
        `[neurolink] Not loading ${summary.path}. Re-run with ${TRUST_MCP_CONFIG_FLAG} once you have reviewed it.`,
      );
      setProjectMcpConfigTrustHook(async () => null);
    }
    return;
  }

  setProjectMcpConfigTrustHook(async () => {
    process.stderr.write(
      chalk.red(
        `neurolink: refusing to load an untrusted project MCP configuration.\n`,
      ),
    );
    process.stderr.write(
      `${[...describeUntrusted(summary, status), ...howToDecide()].join("\n")}\n`,
    );
    process.exit(1);
  });
}

await installProjectMcpConfigGate();

// Enhanced CLI with Professional UX
const cli = initializeCliParser();
initializeCliLifecycle(async () => {
  const { flushOpenTelemetry } =
    await import("../lib/services/server/ai/observability/instrumentation.js");
  await flushOpenTelemetry();
});

// Execute CLI
(async () => {
  try {
    // Parse and execute commands
    await cli.parse();
    await cleanupCliLifecycle();
  } catch (error) {
    // Global error handler - should not reach here due to fail() handler
    process.stderr.write(
      chalk.red(`Unexpected CLI _error: ${(error as Error).message}\n`),
    );
    process.exitCode = 1;
    await cleanupCliLifecycle();
    process.exit(1);
  }
})();
