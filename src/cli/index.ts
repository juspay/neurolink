#!/usr/bin/env node

// Suppress dotenv v17 stdout banner before any imports — it pollutes CLI JSON output
process.env.DOTENV_CONFIG_QUIET = "true";

/**
 * NeuroLink CLI
 *
 * Professional CLI experience with minimal maintenance overhead.
 * Features: Spinners, colors, batch processing, provider testing, rich help
 */

import { initializeCliParser } from "./parser.js";
import chalk from "chalk";
import { initializeCliLifecycle, cleanupCliLifecycle } from "./lifecycle.js";
import { loadProcessDotenv } from "../lib/utils/dotenvBootstrap.js";

// Clean up pnpm-specific environment variables that cause npm warnings
// These variables are set by pnpm but cause "Unknown env config" warnings in npm
if (process.env.npm_config_verify_deps_before_run) {
  delete process.env.npm_config_verify_deps_before_run;
}
if (process.env.npm_config__jsr_registry) {
  delete process.env.npm_config__jsr_registry;
}

// Load environment variables from .env file. Shared with the SDK entry
// point; see dotenvBootstrap for why DOTENV_CONFIG_PATH has to be honoured
// here too — a suite that drives the built CLI inherits the stripped
// environment, and this is the process that would otherwise undo it.
await loadProcessDotenv();

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
