#!/usr/bin/env tsx
/**
 * Continuous Test Suite — Storage SDK + CLI Generate/Stream
 *
 * Validates the storage abstraction layer end-to-end via the four canonical
 * NeuroLink entry points: SDK generate, SDK stream, CLI generate, CLI stream.
 *
 * Also exercises the CLI storage subcommands (status, info, health).
 *
 * Run: npx tsx test/continuous-test-suite-storage-sdk-cli.ts
 *      TEST_PROVIDER=vertex TEST_MODEL=gemini-2.5-flash npx tsx test/continuous-test-suite-storage-sdk-cli.ts
 */

import { spawn } from "child_process";
import { NeuroLink } from "../dist/index.js";

// =============================================================================
// Colors + Logging
// =============================================================================

type ColorName =
  | "reset"
  | "bright"
  | "red"
  | "green"
  | "yellow"
  | "blue"
  | "magenta"
  | "cyan";

const colors: Record<ColorName, string> = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message: string, color: ColorName = "reset"): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string): void {
  const bar = "=".repeat(70);
  log(`\n${bar}`, "cyan");
  log(`  ${title}`, "cyan");
  log(bar, "cyan");
}

function logTest(
  name: string,
  status: "PASS" | "FAIL" | "SKIP" | "TESTING",
  details?: string,
): void {
  const icon =
    status === "PASS"
      ? "✅"
      : status === "FAIL"
        ? "❌"
        : status === "SKIP"
          ? "⏭️ "
          : "🔄";
  const color: ColorName =
    status === "PASS"
      ? "green"
      : status === "FAIL"
        ? "red"
        : status === "SKIP"
          ? "yellow"
          : "blue";
  log(`${icon} ${name}${details ? ` — ${details}` : ""}`, color);
}

// =============================================================================
// Test Config
// =============================================================================

const TEST_CONFIG = {
  provider: process.env.TEST_PROVIDER || "vertex",
  model: process.env.TEST_MODEL || "gemini-2.5-flash",
  maxTokens: 50,
  timeout: 90_000,
  interTestDelay: 2_000,
};

// =============================================================================
// Helpers
// =============================================================================

function buildBaseSDKOptions(): { provider: string; model?: string } {
  const opts: { provider: string; model?: string } = {
    provider: TEST_CONFIG.provider,
  };
  if (TEST_CONFIG.model) {
    opts.model = TEST_CONFIG.model;
  }
  return opts;
}

function buildBaseCLIArgs(): string[] {
  const args = [`--provider=${TEST_CONFIG.provider}`];
  if (TEST_CONFIG.model) {
    args.push(`--model=${TEST_CONFIG.model}`);
  }
  return args;
}

function isExpectedProviderError(msg: string): boolean {
  const patterns = [
    "api key",
    "authentication",
    "rate limit",
    "quota",
    "credentials",
    "econnrefused",
    "403",
    "429",
    "billing",
    "permission",
    "not found",
  ];
  const lower = msg.toLowerCase();
  return patterns.some((p) => lower.includes(p));
}

type RunResult = {
  success: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
  chunkCount: number;
};

function runCommand(
  command: string,
  args: string[],
  env: Record<string, string> = {},
): Promise<RunResult> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...env },
    });
    let stdout = "";
    let stderr = "";
    let chunkCount = 0;
    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      resolve({
        success: false,
        code: null,
        stdout,
        stderr: stderr + "\n[timeout]",
        chunkCount,
      });
    }, TEST_CONFIG.timeout);
    proc.stdout?.on("data", (data: Buffer) => {
      stdout += data.toString();
      chunkCount++;
    });
    proc.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        success: code === 0,
        code,
        stdout,
        stderr,
        chunkCount,
      });
    });
  });
}

// =============================================================================
// Tests
// =============================================================================

async function testCLIGenerate(): Promise<boolean | null> {
  logTest("CLI Generate", "TESTING");
  try {
    const result = await runCommand("node", [
      "dist/cli/index.js",
      "generate",
      ...buildBaseCLIArgs(),
      `--max-tokens=${TEST_CONFIG.maxTokens}`,
      "Say hello in exactly 3 words",
    ]);
    if (!result.success) {
      if (isExpectedProviderError(result.stderr)) {
        logTest("CLI Generate", "SKIP", "provider not configured");
        return null;
      }
      logTest(
        "CLI Generate",
        "FAIL",
        `exit ${result.code}: ${result.stderr.slice(0, 200)}`,
      );
      return false;
    }
    if (!result.stdout || result.stdout.trim().length < 3) {
      logTest("CLI Generate", "FAIL", "empty output");
      return false;
    }
    logTest(
      "CLI Generate",
      "PASS",
      `got "${result.stdout.trim().slice(0, 50)}"`,
    );
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isExpectedProviderError(msg)) {
      logTest("CLI Generate", "SKIP", msg);
      return null;
    }
    logTest("CLI Generate", "FAIL", msg);
    return false;
  }
}

async function testCLIStream(): Promise<boolean | null> {
  logTest("CLI Stream", "TESTING");
  try {
    const result = await runCommand("node", [
      "dist/cli/index.js",
      "stream",
      ...buildBaseCLIArgs(),
      `--max-tokens=${TEST_CONFIG.maxTokens}`,
      "Count from 1 to 5",
    ]);
    if (!result.success) {
      if (isExpectedProviderError(result.stderr)) {
        logTest("CLI Stream", "SKIP", "provider not configured");
        return null;
      }
      logTest(
        "CLI Stream",
        "FAIL",
        `exit ${result.code}: ${result.stderr.slice(0, 200)}`,
      );
      return false;
    }
    // Stream should produce multiple chunks
    if (result.chunkCount < 1) {
      logTest("CLI Stream", "FAIL", `no chunks received`);
      return false;
    }
    logTest(
      "CLI Stream",
      "PASS",
      `${result.chunkCount} chunks, "${result.stdout.trim().slice(0, 50)}"`,
    );
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isExpectedProviderError(msg)) {
      logTest("CLI Stream", "SKIP", msg);
      return null;
    }
    logTest("CLI Stream", "FAIL", msg);
    return false;
  }
}

async function testSDKGenerate(sdk: NeuroLink): Promise<boolean | null> {
  logTest("SDK Generate", "TESTING");
  try {
    const result = await sdk.generate({
      input: { text: "Say hello in exactly 3 words" },
      maxTokens: TEST_CONFIG.maxTokens,
      ...buildBaseSDKOptions(),
    });
    if (!result || !result.content || result.content.length < 3) {
      logTest("SDK Generate", "FAIL", "empty content");
      return false;
    }
    logTest(
      "SDK Generate",
      "PASS",
      `[${result.provider}] "${result.content.slice(0, 50)}"`,
    );
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isExpectedProviderError(msg)) {
      logTest("SDK Generate", "SKIP", msg);
      return null;
    }
    logTest("SDK Generate", "FAIL", msg);
    return false;
  }
}

async function testSDKStream(sdk: NeuroLink): Promise<boolean | null> {
  logTest("SDK Stream", "TESTING");
  try {
    const streamResult = await sdk.stream({
      input: { text: "Count from 1 to 5" },
      maxTokens: TEST_CONFIG.maxTokens,
      ...buildBaseSDKOptions(),
    });
    let accumulated = "";
    let chunkCount = 0;
    for await (const chunk of streamResult.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        accumulated += chunk.content;
        chunkCount++;
      }
      if (chunkCount >= 200) {
        break;
      }
    }
    if (chunkCount < 1 || accumulated.length < 3) {
      logTest(
        "SDK Stream",
        "FAIL",
        `${chunkCount} chunks, ${accumulated.length} chars`,
      );
      return false;
    }
    logTest(
      "SDK Stream",
      "PASS",
      `${chunkCount} chunks, "${accumulated.slice(0, 50)}"`,
    );
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isExpectedProviderError(msg)) {
      logTest("SDK Stream", "SKIP", msg);
      return null;
    }
    logTest("SDK Stream", "FAIL", msg);
    return false;
  }
}

async function testCLIStorageInfo(): Promise<boolean> {
  logTest("CLI Storage Info", "TESTING");
  try {
    const result = await runCommand("node", [
      "dist/cli/index.js",
      "storage",
      "info",
    ]);
    if (!result.success) {
      logTest(
        "CLI Storage Info",
        "FAIL",
        `exit ${result.code}: ${result.stderr.slice(0, 200)}`,
      );
      return false;
    }
    // Factory currently registers 5 backends; File/SQLite/S3 are adapter-only
    // (not yet wired into StorageFactory.registerAllAdapters()).
    const backends = ["MEMORY", "POSTGRESQL", "MONGODB", "LIBSQL", "REDIS"];
    const missing = backends.filter(
      (b) => !result.stdout.toUpperCase().includes(b),
    );
    if (missing.length > 0) {
      logTest(
        "CLI Storage Info",
        "FAIL",
        `missing backends: ${missing.join(", ")}`,
      );
      return false;
    }
    logTest(
      "CLI Storage Info",
      "PASS",
      `${backends.length} registered backends listed`,
    );
    return true;
  } catch (err) {
    logTest(
      "CLI Storage Info",
      "FAIL",
      err instanceof Error ? err.message : String(err),
    );
    return false;
  }
}

async function testCLIStorageHealth(): Promise<boolean> {
  logTest("CLI Storage Health (memory)", "TESTING");
  try {
    const result = await runCommand(
      "node",
      ["dist/cli/index.js", "storage", "health"],
      { STORAGE_TYPE: "memory" },
    );
    if (!result.success) {
      logTest(
        "CLI Storage Health (memory)",
        "FAIL",
        `exit ${result.code}: ${result.stderr.slice(0, 200)}`,
      );
      return false;
    }
    if (
      !result.stdout.toLowerCase().includes("healthy") ||
      !result.stdout.toLowerCase().includes("memory")
    ) {
      logTest(
        "CLI Storage Health (memory)",
        "FAIL",
        `unexpected output: ${result.stdout.slice(0, 200)}`,
      );
      return false;
    }
    logTest("CLI Storage Health (memory)", "PASS");
    return true;
  } catch (err) {
    logTest(
      "CLI Storage Health (memory)",
      "FAIL",
      err instanceof Error ? err.message : String(err),
    );
    return false;
  }
}

async function testCLIStorageStatus(): Promise<boolean> {
  logTest("CLI Storage Status (memory)", "TESTING");
  try {
    const result = await runCommand(
      "node",
      ["dist/cli/index.js", "storage", "status"],
      { STORAGE_TYPE: "memory" },
    );
    if (!result.success) {
      logTest(
        "CLI Storage Status (memory)",
        "FAIL",
        `exit ${result.code}: ${result.stderr.slice(0, 200)}`,
      );
      return false;
    }
    // Should show counts for threads, messages, workflows, records
    const sections = ["Threads", "Messages", "Workflows", "Records"];
    const missing = sections.filter((s) => !result.stdout.includes(s));
    if (missing.length > 0) {
      logTest(
        "CLI Storage Status (memory)",
        "FAIL",
        `missing sections: ${missing.join(", ")}`,
      );
      return false;
    }
    logTest("CLI Storage Status (memory)", "PASS");
    return true;
  } catch (err) {
    logTest(
      "CLI Storage Status (memory)",
      "FAIL",
      err instanceof Error ? err.message : String(err),
    );
    return false;
  }
}

async function testSDKStorageDirect(): Promise<boolean> {
  logTest("SDK Storage Direct (createStorage + CRUD)", "TESTING");
  try {
    // Import from the SDK barrel the way a consumer would
    const { createStorage } = await import("../dist/index.js");
    const storage = await createStorage("memory");
    await storage.init();
    const thread = await storage.createThread({
      resourceId: "test-resource",
      title: "Test Thread from SDK",
      metadata: { testRun: true },
      status: "active",
    });
    if (!thread.id) {
      logTest("SDK Storage Direct (createStorage + CRUD)", "FAIL", "no id");
      return false;
    }
    const retrieved = await storage.getThread(thread.id);
    if (!retrieved || retrieved.title !== "Test Thread from SDK") {
      logTest(
        "SDK Storage Direct (createStorage + CRUD)",
        "FAIL",
        "thread mismatch",
      );
      return false;
    }
    const message = await storage.createMessage({
      threadId: thread.id,
      role: "user",
      content: "hello",
    });
    const messages = await storage.getMessagesByThreadId(thread.id);
    if (messages.length !== 1 || messages[0].id !== message.id) {
      logTest(
        "SDK Storage Direct (createStorage + CRUD)",
        "FAIL",
        "message mismatch",
      );
      return false;
    }
    const health = await storage.healthCheck();
    if (!health.healthy) {
      logTest("SDK Storage Direct (createStorage + CRUD)", "FAIL", "unhealthy");
      return false;
    }
    await storage.close();
    logTest(
      "SDK Storage Direct (createStorage + CRUD)",
      "PASS",
      "thread + message + health",
    );
    return true;
  } catch (err) {
    logTest(
      "SDK Storage Direct (createStorage + CRUD)",
      "FAIL",
      err instanceof Error ? err.message : String(err),
    );
    return false;
  }
}

// =============================================================================
// Runner
// =============================================================================

type TestResult = { name: string; result: boolean | null };

async function main(): Promise<void> {
  log(`\nContinuous Test Suite — Storage SDK + CLI Generate/Stream`, "bright");
  log(`Provider: ${TEST_CONFIG.provider}  Model: ${TEST_CONFIG.model}`, "cyan");

  const results: TestResult[] = [];

  logSection("CLI Storage Subcommands (no provider needed)");
  results.push({
    name: "CLI Storage Info",
    result: await testCLIStorageInfo(),
  });
  results.push({
    name: "CLI Storage Health (memory)",
    result: await testCLIStorageHealth(),
  });
  results.push({
    name: "CLI Storage Status (memory)",
    result: await testCLIStorageStatus(),
  });

  logSection("SDK Storage Integration (no provider needed)");
  results.push({
    name: "SDK Storage Direct",
    result: await testSDKStorageDirect(),
  });

  logSection("SDK Generate/Stream (requires provider)");
  const sdk = new NeuroLink();
  try {
    results.push({ name: "SDK Generate", result: await testSDKGenerate(sdk) });
    await new Promise((r) => setTimeout(r, TEST_CONFIG.interTestDelay));
    results.push({ name: "SDK Stream", result: await testSDKStream(sdk) });
  } finally {
    if (typeof sdk.dispose === "function") {
      await sdk.dispose();
    }
  }

  logSection("CLI Generate/Stream (requires provider)");
  results.push({ name: "CLI Generate", result: await testCLIGenerate() });
  await new Promise((r) => setTimeout(r, TEST_CONFIG.interTestDelay));
  results.push({ name: "CLI Stream", result: await testCLIStream() });

  // Summary
  logSection("Summary");
  const passed = results.filter((r) => r.result === true).length;
  const failed = results.filter((r) => r.result === false).length;
  const skipped = results.filter((r) => r.result === null).length;
  log(`Total: ${results.length}`, "cyan");
  log(`  Passed:  ${passed}`, "green");
  log(`  Failed:  ${failed}`, failed > 0 ? "red" : "reset");
  log(`  Skipped: ${skipped}`, skipped > 0 ? "yellow" : "reset");

  if (failed > 0) {
    log("\nFailed tests:", "red");
    for (const r of results) {
      if (r.result === false) {
        log(`  - ${r.name}`, "red");
      }
    }
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  log(`\nFatal: ${err instanceof Error ? err.message : String(err)}`, "red");
  process.exit(1);
});
