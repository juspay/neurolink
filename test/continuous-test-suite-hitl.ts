#!/usr/bin/env tsx
/**
 * Continuous Test Suite: HITL (Human-in-the-Loop)
 *
 * Tests HITL interception, approval, rejection, and retry behavior.
` * All tests are generate-driven — the AI calls the tool, HITL intercepts it.
 * Tests SKIP (not FAIL) when the AI does not call the tool (non-deterministic).
 *
 * Run: npx tsx test/continuous-test-suite-hitl.ts
 *      TEST_PROVIDER=anthropic npx tsx test/continuous-test-suite-hitl.ts
 *      TEST_PROVIDER=litellm npx tsx test/continuous-test-suite-hitl.ts
 */

import "dotenv/config";

// HITL tests register tools directly — no MCP servers needed.
// Suppress global MCP config loading to avoid noisy filesystem connection errors.
process.env.NEUROLINK_SKIP_MCP = "true";

import { NeuroLink } from "../dist/index.js";

import { assertDistFresh } from "./helpers/distFreshness.js";

// Fail loudly rather than silently testing a stale build (see distFreshness.ts).
assertDistFresh();

// ============================================================
// CONFIGURATION
// ============================================================

const TEST_CONFIG = {
  provider: process.env.TEST_PROVIDER || "openai",
  model: process.env.TEST_MODEL || undefined,
  timeout: 60_000,
  interTestDelay: 1_000,
};

// Tool name contains "delete" → matches dangerousActions: ["delete"]
const TOOL_NAME = "delete_records";
const HITL_KEYWORD = "delete";

// ============================================================
// LOGGING UTILITIES
// ============================================================

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
} as const;

type ColorName = keyof typeof colors;

function log(message: string, color: ColorName = "reset"): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string): void {
  log(`\n${"=".repeat(60)}`, "cyan");
  log(`  ${title}`, "cyan");
  log(`${"=".repeat(60)}`, "cyan");
}

function logTest(
  testName: string,
  status: "PASS" | "FAIL" | "SKIP" | "TESTING",
  details?: string,
): void {
  const statusColors: Record<string, ColorName> = {
    PASS: "green",
    FAIL: "red",
    SKIP: "yellow",
    TESTING: "blue",
  };
  const det = details ? ` — ${details}` : "";
  log(`[${status}] ${testName}${det}`, statusColors[status] ?? "reset");
}

function isProviderError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return [
    "api key",
    "unauthorized",
    "authentication error",
    "invalid proxy",
    "403",
    "401",
    "not configured",
    "enotfound",
    "fetch failed",
    "connection refused",
    "cannot connect",
    "connect to api",
    "provider error",
    "all providers failed",
    "resource_exhausted",
    "429",
    "ollama",
    "model not found",
    "permission denied",
  ].some((p) => lower.includes(p));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// TEST RESULTS TRACKING
// ============================================================

const testResults: Array<{
  name: string;
  result: boolean | null;
  error: string | null;
}> = [];

// ============================================================
// SHARED: prompt that strongly encourages tool call
// ============================================================

function makePrompt(extra = ""): string {
  return (
    `You must call the ${TOOL_NAME} tool with id=42 right now. ` +
    `Do not explain. Just call the tool immediately. ${extra}`.trim()
  );
}

// ============================================================
// TEST #1: HITL intercepts and approves via generate()
// ============================================================

async function testHITLIntercept(): Promise<boolean | null> {
  logSection("Test #1: HITL intercepts and approves (generate-driven)");
  logTest("HITL intercept + approve", "TESTING");

  const sdk = new NeuroLink({
    hitl: { enabled: true, dangerousActions: [HITL_KEYWORD], timeout: 10_000 },
  });
  const emitter = sdk.getEventEmitter();

  let toolCalled = false;
  let hitlFired = 0;

  sdk.registerTool(TOOL_NAME, {
    name: TOOL_NAME,
    description: `Deletes records from the database by id. Call this tool when asked to delete a record.`,
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Record ID to delete" },
      },
      required: ["id"],
    },
    execute: async () => {
      toolCalled = true;
      return { deleted: true, status: "ok" };
    },
  });

  emitter.on("tool:start", () => {
    toolCalled = true;
  });

  emitter.on("hitl:confirmation-request", (...args: unknown[]) => {
    const event = args[0] as Record<string, unknown>;
    const payload = event.payload as Record<string, unknown>;
    hitlFired++;
    emitter.emit("hitl:confirmation-response", {
      type: "hitl:confirmation-response",
      payload: { confirmationId: payload.confirmationId, approved: true },
    });
  });

  try {
    await sdk.generate({
      input: { text: makePrompt() },
      provider: TEST_CONFIG.provider,
      ...(TEST_CONFIG.model ? { model: TEST_CONFIG.model } : {}),
      maxTokens: 200,
      maxSteps: 5,
    });

    await delay(500);

    if (!toolCalled) {
      logTest("HITL intercept + approve", "SKIP", "AI did not call the tool");
      return null;
    }

    if (hitlFired !== 1) {
      logTest(
        "HITL intercept + approve",
        "FAIL",
        `HITL fired ${hitlFired} times, expected 1`,
      );
      return false;
    }

    logTest(
      "HITL intercept + approve",
      "PASS",
      "AI called tool, HITL fired once and approved",
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isProviderError(msg)) {
      logTest("HITL intercept + approve", "SKIP", `Provider error: ${msg}`);
      return null;
    }
    logTest("HITL intercept + approve", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #2: HITL rejects tool execution via generate()
// ============================================================

async function testHITLReject(): Promise<boolean | null> {
  logSection("Test #2: HITL rejects tool execution (generate-driven)");
  logTest("HITL reject", "TESTING");

  const sdk = new NeuroLink({
    hitl: { enabled: true, dangerousActions: [HITL_KEYWORD], timeout: 10_000 },
  });
  const emitter = sdk.getEventEmitter();

  let toolExecuted = false;
  let hitlFired = 0;

  sdk.registerTool(TOOL_NAME, {
    name: TOOL_NAME,
    description: `Deletes records from the database by id. Call this tool when asked to delete a record.`,
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Record ID to delete" },
      },
      required: ["id"],
    },
    execute: async () => {
      // If HITL correctly rejected, this should never run
      toolExecuted = true;
      return { deleted: true };
    },
  });

  let toolStartFired = false;
  emitter.on("tool:start", () => {
    toolStartFired = true;
  });

  emitter.on("hitl:confirmation-request", (...args: unknown[]) => {
    const event = args[0] as Record<string, unknown>;
    const payload = event.payload as Record<string, unknown>;
    hitlFired++;
    emitter.emit("hitl:confirmation-response", {
      type: "hitl:confirmation-response",
      payload: {
        confirmationId: payload.confirmationId,
        approved: false,
        reason: "rejected by test",
      },
    });
  });

  try {
    await sdk.generate({
      input: { text: makePrompt() },
      provider: TEST_CONFIG.provider,
      ...(TEST_CONFIG.model ? { model: TEST_CONFIG.model } : {}),
      maxTokens: 200,
      maxSteps: 5,
    });

    await delay(500);

    if (!toolStartFired && hitlFired === 0) {
      logTest("HITL reject", "SKIP", "AI did not call the tool");
      return null;
    }

    if (hitlFired !== 1) {
      logTest(
        "HITL reject",
        "FAIL",
        `HITL fired ${hitlFired} times, expected 1`,
      );
      return false;
    }

    if (toolExecuted) {
      logTest(
        "HITL reject",
        "FAIL",
        "Tool execute() ran despite HITL rejection",
      );
      return false;
    }

    logTest(
      "HITL reject",
      "PASS",
      "AI called tool, HITL fired once, execute() was blocked",
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isProviderError(msg)) {
      logTest("HITL reject", "SKIP", `Provider error: ${msg}`);
      return null;
    }
    // generate() may throw when HITL rejects — that's acceptable
    // as long as HITL fired once and tool was never executed
    await delay(500);
    if (hitlFired === 1 && !toolExecuted) {
      logTest(
        "HITL reject",
        "PASS",
        "HITL fired once, tool blocked, generate threw (expected)",
      );
      return true;
    }
    logTest("HITL reject", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #3: HITL fires only once across retries (generate-driven)
// ============================================================

async function testHITLRetryOnce(): Promise<boolean | null> {
  logSection(
    "Test #3: HITL fires only once even when tool retries (generate-driven)",
  );
  logTest("HITL single fire on retry", "TESTING");

  const sdk = new NeuroLink({
    hitl: { enabled: true, dangerousActions: [HITL_KEYWORD], timeout: 10_000 },
  });
  const emitter = sdk.getEventEmitter();

  let callCount = 0;
  let toolStartFired = false;
  let hitlFired = 0;

  sdk.registerTool(
    TOOL_NAME,
    {
      name: TOOL_NAME,
      description: `Deletes records from the database by id. Call this tool when asked to delete a record.`,
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "number", description: "Record ID to delete" },
        },
        required: ["id"],
      },
      execute: async () => {
        callCount++;
        if (callCount === 1) {
          // Slow on first attempt → triggers timeout → withRetry retries
          await new Promise((resolve) => setTimeout(resolve, 10_000));
        }
        return { deleted: true, status: "ok" };
      },
    },
    // tool-level timeout so withRetry kicks in
    { timeout: 500, maxRetries: 2 },
  );

  emitter.on("tool:start", () => {
    toolStartFired = true;
  });

  emitter.on("hitl:confirmation-request", (...args: unknown[]) => {
    const event = args[0] as Record<string, unknown>;
    const payload = event.payload as Record<string, unknown>;
    hitlFired++;
    emitter.emit("hitl:confirmation-response", {
      type: "hitl:confirmation-response",
      payload: { confirmationId: payload.confirmationId, approved: true },
    });
  });

  try {
    await sdk.generate({
      input: { text: makePrompt() },
      provider: TEST_CONFIG.provider,
      ...(TEST_CONFIG.model ? { model: TEST_CONFIG.model } : {}),
      maxTokens: 200,
      maxSteps: 5,
    });

    await delay(500);

    if (!toolStartFired) {
      logTest("HITL single fire on retry", "SKIP", "AI did not call the tool");
      return null;
    }

    if (hitlFired !== 1) {
      logTest(
        "HITL single fire on retry",
        "FAIL",
        `HITL fired ${hitlFired} times, expected 1`,
      );
      return false;
    }

    if (callCount < 2) {
      logTest(
        "HITL single fire on retry",
        "FAIL",
        `tool execute() called ${callCount} times — retry never happened`,
      );
      return false;
    }

    logTest(
      "HITL single fire on retry",
      "PASS",
      `AI called tool, HITL fired once, tool retried ${callCount} times`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isProviderError(msg)) {
      logTest("HITL single fire on retry", "SKIP", `Provider error: ${msg}`);
      return null;
    }
    logTest("HITL single fire on retry", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #4: No HITL rule → tool runs without interception (generate-driven)
// ============================================================

async function testHITLNoRule(): Promise<boolean | null> {
  logSection(
    "Test #4: No HITL rule — tool runs without interception (generate-driven)",
  );
  logTest("No HITL rule", "TESTING");

  // dangerousActions empty → nothing matches → no HITL
  const sdk = new NeuroLink({
    hitl: { enabled: true, dangerousActions: [], timeout: 10_000 },
  });
  const emitter = sdk.getEventEmitter();

  let toolExecuted = false;
  let hitlFired = 0;
  let toolStartFired = false;

  sdk.registerTool(TOOL_NAME, {
    name: TOOL_NAME,
    description: `Deletes records from the database by id. Call this tool when asked to delete a record.`,
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Record ID to delete" },
      },
      required: ["id"],
    },
    execute: async () => {
      toolExecuted = true;
      return { deleted: true, status: "ok" };
    },
  });

  emitter.on("tool:start", () => {
    toolStartFired = true;
  });
  emitter.on("hitl:confirmation-request", () => {
    hitlFired++;
  });

  try {
    await sdk.generate({
      input: { text: makePrompt() },
      provider: TEST_CONFIG.provider,
      ...(TEST_CONFIG.model ? { model: TEST_CONFIG.model } : {}),
      maxTokens: 200,
      maxSteps: 5,
    });

    await delay(500);

    if (!toolStartFired) {
      logTest("No HITL rule", "SKIP", "AI did not call the tool");
      return null;
    }

    if (hitlFired !== 0) {
      logTest(
        "No HITL rule",
        "FAIL",
        `HITL fired ${hitlFired} times, expected 0`,
      );
      return false;
    }

    if (!toolExecuted) {
      logTest(
        "No HITL rule",
        "FAIL",
        "Tool start fired but execute() never ran",
      );
      return false;
    }

    logTest(
      "No HITL rule",
      "PASS",
      "AI called tool, no HITL interception, execute() ran directly",
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isProviderError(msg)) {
      logTest("No HITL rule", "SKIP", `Provider error: ${msg}`);
      return null;
    }
    logTest("No HITL rule", "FAIL", msg);
    return false;
  }
}

// ============================================================
// MAIN RUNNER
// ============================================================

async function runAllTests(): Promise<void> {
  const startTime = Date.now();
  log(`\n--- NeuroLink Continuous Test Suite: HITL ---`, "bright");
  log(
    `Provider: ${TEST_CONFIG.provider}  Model: ${TEST_CONFIG.model || "default"}`,
    "cyan",
  );

  const tests: Array<{ name: string; fn: () => Promise<boolean | null> }> = [
    { name: "HITL intercept + approve", fn: testHITLIntercept },
    { name: "HITL reject", fn: testHITLReject },
    { name: "HITL single fire on retry", fn: testHITLRetryOnce },
    { name: "No HITL rule", fn: testHITLNoRule },
  ];

  for (const test of tests) {
    try {
      const result = await test.fn();
      testResults.push({ name: test.name, result, error: null });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logTest(test.name, "FAIL", `Uncaught: ${msg}`);
      testResults.push({ name: test.name, result: false, error: msg });
    }
    await delay(TEST_CONFIG.interTestDelay);
  }

  logSection("Test Results Summary");
  const passed = testResults.filter((r) => r.result === true).length;
  const failed = testResults.filter((r) => r.result === false).length;
  const skipped = testResults.filter((r) => r.result === null).length;

  for (const t of testResults) {
    logTest(
      t.name,
      t.result === true ? "PASS" : t.result === false ? "FAIL" : "SKIP",
      t.error ?? "",
    );
  }

  const duration = Math.round((Date.now() - startTime) / 1000);
  log(
    `\nFinal Results: ${passed} passed, ${failed} failed, ${skipped} skipped in ${duration}s`,
    failed === 0 ? "green" : "red",
  );

  process.exit(failed === 0 ? 0 : 1);
}

// ============================================================
// ENTRY POINT
// ============================================================

runAllTests().catch((e) => {
  log(`Suite crashed: ${e instanceof Error ? e.message : String(e)}`, "red");
  process.exit(1);
});
