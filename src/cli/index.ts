#!/usr/bin/env node

/**
 * NeuroLink CLI
 *
 * Professional CLI experience with minimal maintenance overhead.
 * Features: Spinners, colors, batch processing, provider testing, rich help
 */

import { initializeCliParser } from "./parser.js";
import chalk from "chalk";

// Clean up pnpm-specific environment variables that cause npm warnings
// These variables are set by pnpm but cause "Unknown env config" warnings in npm
if (process.env.npm_config_verify_deps_before_run) {
  delete process.env.npm_config_verify_deps_before_run;
}
if (process.env.npm_config__jsr_registry) {
  delete process.env.npm_config__jsr_registry;
}

// Load environment variables from .env file
try {
  // Try to import and configure dotenv
  const { config } = await import("dotenv");
  config(); // Load .env from current working directory
} catch {
  // dotenv is not available (dev dependency only) - this is fine for production
  // Environment variables should be set externally in production
}

// Enhanced CLI with Professional UX
// Note: Workflow functionality is accessed via generate/stream commands with --workflow-config option
const cli = initializeCliParser();

// Execute CLI
(async () => {
  try {
    // Parse and execute commands
    await cli.parse();
    await cleanup();
  } catch (error) {
    // Global error handler - should not reach here due to fail() handler
    process.stderr.write(
      chalk.red(`Unexpected CLI _error: ${(error as Error).message}\n`),
    );
    await cleanup();
    process.exit(1);
  }
})();

// Cleanup on exit
process.on("SIGINT", async () => {
  await cleanup();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await cleanup();
  process.exit(0);
});

process.on("beforeExit", async () => {
  await cleanup();
});

async function cleanup() {
  const { flushOpenTelemetry } = await import(
    "../lib/services/server/ai/observability/instrumentation.js"
  );
  await flushOpenTelemetry();
}
