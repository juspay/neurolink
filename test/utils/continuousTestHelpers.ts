/**
 * Shared utilities for all continuous test suites.
 *
 * Provides standardized logging, assertions, CLI helpers, SDK construction,
 * and configuration parsing used by all 14 continuous test suite files.
 *
 * Import this module instead of duplicating boilerplate in each suite.
 */

import { spawn } from "child_process";
import * as path from "path";
import { fileURLToPath } from "url";

// ============================================================
// TYPES
// ============================================================

export interface ProcessResult {
  success: boolean;
  code: number;
  stdout: string;
  stderr: string;
}

export interface TestResult {
  name: string;
  result: boolean | null; // true = PASS, false = FAIL, null = SKIP
  error: string | null;
}

export interface TestConfig {
  provider: string;
  model: string | undefined;
  maxTokens: number | undefined;
  timeout: number;
  interTestDelay: number;
}

export interface ValidationResult {
  passed: boolean;
  details: string[];
}

// ============================================================
// COLORS & LOGGING
// ============================================================

export const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
} as const;

export type ColorName = keyof typeof colors;

export function log(message: string, color: ColorName = "reset"): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

export function logSection(title: string): void {
  log(`\n${"=".repeat(60)}`, "cyan");
  log(`  ${title}`, "cyan");
  log(`${"=".repeat(60)}`, "cyan");
}

export function logTest(
  testName: string,
  status: "PASS" | "FAIL" | "SKIP" | "TESTING",
  details?: string,
): void {
  const icons = {
    PASS: "\u2705",
    FAIL: "\u274C",
    SKIP: "\u23ED\uFE0F",
    TESTING: "\u26A0\uFE0F",
  };
  const statusColors: Record<string, ColorName> = {
    PASS: "green",
    FAIL: "red",
    SKIP: "yellow",
    TESTING: "blue",
  };
  log(`${icons[status]} ${testName}`, statusColors[status]);
  if (details) {
    log(`   ${details}`, "reset");
  }
}

// ============================================================
// CONFIGURATION
// ============================================================

export const PROVIDER_MAX_TOKENS: Record<string, number> = {
  anthropic: 8192,
  vertex: 10000,
  "google-ai-studio": 10000,
  openai: 16384,
  bedrock: 8192,
  ollama: 4096,
  openrouter: 4096,
  azure: 8192,
  mistral: 8192,
  litellm: 8192,
  huggingface: 4096,
  sagemaker: 4096,
};

/**
 * Parse CLI args (--provider, --model, --help) and build test config.
 */
export function buildTestConfig(defaults?: Partial<TestConfig>): TestConfig {
  const config: TestConfig = {
    provider: process.env.TEST_PROVIDER || "vertex",
    model: process.env.TEST_MODEL || undefined,
    maxTokens: undefined,
    timeout: 90000,
    interTestDelay: 7000,
    ...defaults,
  };

  const args = process.argv.slice(2);
  for (const arg of args) {
    if (arg.startsWith("--provider=")) {
      config.provider = arg.split("=")[1];
    } else if (arg.startsWith("--model=")) {
      config.model = arg.split("=")[1];
    } else if (arg === "--help") {
      console.log(
        "Usage: npx tsx test/<suite>.ts --provider=<provider> [--model=<model>]",
      );
      console.log(
        "Providers: vertex, openai, anthropic, google-ai-studio, bedrock, azure, mistral, ollama, litellm, huggingface, sagemaker, openrouter",
      );
      process.exit(0);
    }
  }

  config.maxTokens = PROVIDER_MAX_TOKENS[config.provider] || 8192;
  return config;
}

// ============================================================
// CLI HELPERS
// ============================================================

export function buildBaseCLIArgs(config: TestConfig): string[] {
  const args = [`--provider=${config.provider}`];
  if (config.model) {
    args.push(`--model=${config.model}`);
  }
  return args;
}

export function buildBaseSDKOptions(config: TestConfig): {
  provider: string;
  model?: string;
} {
  const opts: { provider: string; model?: string } = {
    provider: config.provider,
  };
  if (config.model) {
    opts.model = config.model;
  }
  return opts;
}

/**
 * Run a CLI command with timeout.
 */
export function runCommand(
  command: string,
  args: string[],
  options?: { env?: Record<string, string>; timeout?: number },
): Promise<ProcessResult> {
  const timeout = options?.timeout || 90000;
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      env: {
        ...process.env,
        ...(options?.env || {}),
      },
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    proc.stderr.on("data", (d: Buffer) => {
      stderr += d.toString();
    });
    const timeoutId = setTimeout(() => {
      proc.kill("SIGTERM");
      setTimeout(() => {
        if (proc.exitCode === null) {
          proc.kill("SIGKILL");
        }
      }, 2000);
      reject(new Error(`Command timeout after ${timeout}ms`));
    }, timeout);
    proc.on("close", (code: number | null) => {
      clearTimeout(timeoutId);
      resolve({
        success: code === 0,
        code: code ?? -1,
        stdout,
        stderr,
      });
    });
    proc.on("error", (err: Error) => {
      clearTimeout(timeoutId);
      reject(err);
    });
  });
}

// ============================================================
// ASSERTIONS
// ============================================================

/**
 * Assert a condition and return PASS/FAIL.
 * This is the key function that replaces the "always-pass" anti-pattern.
 * The return value is ALWAYS gated on the condition.
 */
export function assertOrFail(
  passed: boolean,
  testName: string,
  passDetails: string,
  failDetails?: string,
): boolean {
  if (passed) {
    logTest(testName, "PASS", passDetails);
    return true;
  }
  logTest(testName, "FAIL", failDetails || passDetails);
  return false;
}

/**
 * Mark a test as SKIP (returns null, NOT true).
 */
export function skipTest(testName: string, reason: string): null {
  logTest(testName, "SKIP", reason);
  return null;
}

/**
 * Validate response content against expected patterns.
 */
export function validateResponseContent(
  response: string,
  expectedPatterns: string[],
  minMatches = 1,
): ValidationResult {
  const lower = response.toLowerCase();
  const found = expectedPatterns.filter((p) => lower.includes(p.toLowerCase()));
  return {
    passed: found.length >= minMatches,
    details: [
      `Found ${found.length}/${expectedPatterns.length} patterns (need ${minMatches})`,
      `Matched: ${found.join(", ") || "none"}`,
    ],
  };
}

/**
 * Check if an error is an expected provider configuration error.
 * TIGHTENED version: only matches auth/billing/config errors, not generic errors.
 */
export function isExpectedProviderError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return [
    "api key",
    "authentication",
    "unauthenticated",
    "rate limit",
    "quota",
    "credentials",
    "billing",
    "permission",
    "cannot connect",
    "econnrefused",
    "connection refused",
    "service unavailable",
    "model not found",
  ].some((p) => lower.includes(p));
}

// ============================================================
// SDK HELPERS
// ============================================================

/**
 * Generate a unique session ID for test isolation.
 */
export function generateTestSessionId(testName: string): string {
  return `test-${testName}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Global cleanup between tests.
 */
export async function globalCleanup(): Promise<void> {
  await new Promise((r) => setTimeout(r, 100));
  if (global.gc) {
    global.gc();
  }
}

/**
 * Delay between tests to avoid rate limits.
 */
export function interTestDelay(config: TestConfig): Promise<void> {
  return new Promise((r) => setTimeout(r, config.interTestDelay));
}

// ============================================================
// TEST RUNNER
// ============================================================

/**
 * Standard test runner used by all suites.
 * Runs tests sequentially, collects results, prints summary.
 */
export async function runAllTests(
  suiteName: string,
  tests: Array<{ name: string; fn: () => Promise<boolean | null> }>,
  config: TestConfig,
): Promise<void> {
  logSection(
    `${suiteName} — Provider: ${config.provider}${config.model ? ` / ${config.model}` : ""}`,
  );

  const results: TestResult[] = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    logSection(`[${i + 1}/${tests.length}] ${test.name}`);

    try {
      const result = await test.fn();
      if (result === true) {
        passed++;
        results.push({ name: test.name, result: true, error: null });
      } else if (result === false) {
        failed++;
        results.push({
          name: test.name,
          result: false,
          error: "Test assertion failed",
        });
      } else {
        skipped++;
        results.push({ name: test.name, result: null, error: null });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (isExpectedProviderError(errorMsg)) {
        skipped++;
        results.push({
          name: test.name,
          result: null,
          error: `Provider error: ${errorMsg}`,
        });
        logTest(
          test.name,
          "SKIP",
          `Provider config error: ${errorMsg.substring(0, 100)}`,
        );
      } else {
        failed++;
        results.push({ name: test.name, result: false, error: errorMsg });
        logTest(
          test.name,
          "FAIL",
          `Unexpected error: ${errorMsg.substring(0, 200)}`,
        );
      }
    }

    // Delay between tests (not after the last one)
    if (i < tests.length - 1) {
      await interTestDelay(config);
    }
  }

  // Summary
  logSection("Results Summary");
  log(
    `Provider: ${config.provider}${config.model ? ` (${config.model})` : ""}`,
    "cyan",
  );
  log(`Passed: ${passed}`, "green");
  log(`Failed: ${failed}`, failed > 0 ? "red" : "green");
  log(`Skipped: ${skipped}`, skipped > 0 ? "yellow" : "green");
  log(`Total: ${tests.length}`, "cyan");

  if (failed > 0) {
    log("\nFailed tests:", "red");
    results
      .filter((r) => r.result === false)
      .forEach((r) => {
        log(`  - ${r.name}: ${r.error}`, "red");
      });
  }

  if (skipped > 0) {
    log("\nSkipped tests:", "yellow");
    results
      .filter((r) => r.result === null)
      .forEach((r) => {
        log(`  - ${r.name}${r.error ? `: ${r.error}` : ""}`, "yellow");
      });
  }

  await globalCleanup();
  process.exit(failed > 0 ? 1 : 0);
}
