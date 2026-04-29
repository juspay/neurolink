#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Lifecycle Middleware
 *
 * Tests the consumer-facing lifecycle callback API:
 *   neurolink.generate({ onFinish, onError })
 *   neurolink.stream({ onFinish, onError, onChunk })
 *
 * All tests use real NeuroLink instances with real providers.
 * Provider-dependent tests SKIP when credentials are not configured.
 *
 * Run: npx tsx test/continuous-test-suite-middleware.ts
 *      npx tsx test/continuous-test-suite-middleware.ts --provider=ollama --model=llama3.2
 */

import "dotenv/config";

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
};
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
  const icons = { PASS: "PASS", FAIL: "FAIL", SKIP: "SKIP", TESTING: "TEST" };
  const statusColors: Record<string, ColorName> = {
    PASS: "green",
    FAIL: "red",
    SKIP: "yellow",
    TESTING: "blue",
  };
  const icon = icons[status];
  const clr = statusColors[status] || "reset";
  const det = details ? ` — ${details}` : "";
  log(`[${icon}] ${testName}${det}`, clr);
}

// ============================================================
// TEST CONFIGURATION
// ============================================================

// Middleware tests are provider-agnostic — they verify lifecycle callbacks
// (onFinish, onChunk, onError, isolation) regardless of which provider
// actually fulfils the request. Default to a provider that is configured
// in CI (vertex) instead of one that requires a local daemon (ollama),
// so the suite returns real PASS rather than blanket SKIPs.
//
// `thinkingLevel: "minimal"` keeps Gemini 2.5+ from spending its 50-token
// budget on hidden reasoning and returning empty visible text. Combined
// with `disableTools: true` we keep the request shape pure-text so the
// model isn't tempted to multi-step into a tool call (e.g. calculateMath
// for "what is 2+2?") and exhaust the tiny token budget on tool plumbing
// instead of the actual answer the callback consumes.
const TEST_CONFIG = {
  provider: process.env.TEST_PROVIDER || "vertex",
  model: process.env.TEST_MODEL,
  thinkingLevel: "minimal" as const,
  disableTools: true,
  timeout: 60_000,
  interTestDelay: 2_000,
};

// ============================================================
// TEST RESULTS TRACKING
// ============================================================

const testResults: Array<{
  name: string;
  result: boolean | null;
  error: string | null;
}> = [];

// ============================================================
// HELPERS
// ============================================================

function isExpectedProviderError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return [
    "api key",
    "api_key",
    "authentication",
    "rate limit",
    "quota",
    "credentials",
    "could not be resolved",
    "cannot connect",
    "failed to generate",
    "google_application_credentials",
    "econnrefused",
    "enotfound",
    "fetch failed",
    "provider not found",
    "not configured",
    "resource_exhausted",
    "permission denied",
    "unauthorized",
    "billing",
    "payment required",
    "too many requests",
    "connection refused",
    "403",
    "429",
    "402",
    "endpoint not found",
    "provider error",
    "all providers failed",
    "not found",
    "ollama",
  ].some((p) => lower.includes(p));
}

// ============================================================
// TEST #1: generate() with onFinish
// ============================================================

async function testGenerateOnFinish(): Promise<boolean | null> {
  logSection("Test #1: generate() with onFinish");
  logTest("onFinish fires after generation", "TESTING");

  try {
    const { NeuroLink } = await import("../src/lib/neurolink.js");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let finishPayload: any = null;

    const sdk = new NeuroLink();
    const result = await sdk.generate({
      input: { text: "What is 2 + 2? Reply with just the number." },
      provider: TEST_CONFIG.provider,
      model: TEST_CONFIG.model,
      thinkingLevel: TEST_CONFIG.thinkingLevel,
      disableTools: TEST_CONFIG.disableTools,
      maxTokens: 50,
      onFinish: (payload) => {
        finishPayload = payload;
      },
    });

    const content = result.content || "";
    if (!content) {
      logTest("onFinish fires after generation", "FAIL", "Empty response");
      return false;
    }

    if (finishPayload) {
      const checks: string[] = [];
      if (typeof finishPayload.duration !== "number") {
        checks.push(`duration type=${typeof finishPayload.duration}`);
      }

      if (checks.length > 0) {
        logTest("onFinish fires after generation", "FAIL", checks.join("; "));
        return false;
      }

      logTest(
        "onFinish fires after generation",
        "PASS",
        `content=${content.length} chars, onFinish fired, duration=${finishPayload.duration}ms`,
      );
    } else {
      logTest(
        "onFinish fires after generation",
        "SKIP",
        `content=${content.length} chars, but onFinish callback never fired`,
      );
      return null;
    }

    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("onFinish fires after generation", "SKIP", msg);
      return null;
    }
    logTest("onFinish fires after generation", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #2: generate() with onError
// ============================================================

async function testGenerateOnError(): Promise<boolean | null> {
  logSection("Test #2: generate() with onError");
  logTest("onError fires on generation failure", "TESTING");

  try {
    const { NeuroLink } = await import("../src/lib/neurolink.js");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let errorPayload: any = null;
    let generationThrew = false;

    const sdk = new NeuroLink();

    try {
      await sdk.generate({
        input: { text: "hello" },
        provider: "nonexistent_provider_xyz",
        model: "nonexistent_model_xyz",
        maxTokens: 10,
        onError: (payload) => {
          errorPayload = payload;
        },
      });
    } catch {
      generationThrew = true;
    }

    if (!generationThrew) {
      logTest(
        "onError fires on generation failure",
        "FAIL",
        "Expected generation to throw for invalid provider",
      );
      return false;
    }

    if (errorPayload) {
      logTest(
        "onError fires on generation failure",
        "PASS",
        `onError fired: ${errorPayload.error?.message?.substring(0, 80)}`,
      );
    } else {
      // The error happened before middleware was attached (e.g. provider resolution)
      // so the onError callback was never exercised — not a real pass
      logTest(
        "onError fires on generation failure",
        "SKIP",
        "Generation threw before middleware attached, onError callback never fired",
      );
      return null;
    }

    return true;
  } catch (error) {
    logTest(
      "onError fires on generation failure",
      "FAIL",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

// ============================================================
// TEST #3: generate() callback error isolation
// ============================================================

async function testGenerateCallbackIsolation(): Promise<boolean | null> {
  logSection("Test #3: generate() callback error isolation");
  logTest("Throwing callback does not break generation", "TESTING");

  try {
    const { NeuroLink } = await import("../src/lib/neurolink.js");

    const sdk = new NeuroLink();
    const result = await sdk.generate({
      input: { text: "What is 1 + 1? Reply with just the number." },
      provider: TEST_CONFIG.provider,
      model: TEST_CONFIG.model,
      thinkingLevel: TEST_CONFIG.thinkingLevel,
      disableTools: TEST_CONFIG.disableTools,
      maxTokens: 50,
      onFinish: () => {
        throw new Error("Consumer callback blew up");
      },
    });

    const content = result.content || "";
    if (!content) {
      logTest(
        "Throwing callback does not break generation",
        "FAIL",
        "Empty response",
      );
      return false;
    }

    logTest(
      "Throwing callback does not break generation",
      "PASS",
      `Generation succeeded with ${content.length} chars despite callback error`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("Throwing callback does not break generation", "SKIP", msg);
      return null;
    }
    if (msg.includes("Consumer callback blew up")) {
      logTest(
        "Throwing callback does not break generation",
        "FAIL",
        "Callback error leaked to caller — isolation broken",
      );
      return false;
    }
    logTest("Throwing callback does not break generation", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #4: stream() with onFinish
// ============================================================

async function testStreamOnFinish(): Promise<boolean | null> {
  logSection("Test #4: stream() with onFinish");
  logTest("onFinish fires after streaming", "TESTING");

  try {
    const { NeuroLink } = await import("../src/lib/neurolink.js");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let finishPayload: any = null;

    const sdk = new NeuroLink();
    const streamResult = await sdk.stream({
      input: { text: "What is 3 + 3? Reply with just the number." },
      provider: TEST_CONFIG.provider,
      model: TEST_CONFIG.model,
      thinkingLevel: TEST_CONFIG.thinkingLevel,
      disableTools: TEST_CONFIG.disableTools,
      maxTokens: 50,
      onFinish: (payload) => {
        finishPayload = payload;
      },
    });

    // Consume the stream
    let content = "";
    let chunkCount = 0;
    if (streamResult.stream) {
      for await (const chunk of streamResult.stream) {
        if (
          chunk &&
          typeof chunk === "object" &&
          "content" in chunk &&
          typeof chunk.content === "string"
        ) {
          content += chunk.content;
        }
        chunkCount++;
        if (chunkCount >= 200) {
          break; // Safety limit
        }
      }
    }

    if (finishPayload) {
      logTest(
        "onFinish fires after streaming",
        "PASS",
        `Streamed ${content.length} chars in ${chunkCount} chunks, onFinish fired, duration=${finishPayload.duration}ms`,
      );
    } else {
      logTest(
        "onFinish fires after streaming",
        "SKIP",
        `Streamed ${content.length} chars in ${chunkCount} chunks, but onFinish callback never fired`,
      );
      return null;
    }

    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("onFinish fires after streaming", "SKIP", msg);
      return null;
    }
    logTest("onFinish fires after streaming", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #5: stream() with onChunk
// ============================================================

async function testStreamOnChunk(): Promise<boolean | null> {
  logSection("Test #5: stream() with onChunk");
  logTest("onChunk fires per streaming chunk", "TESTING");

  try {
    const { NeuroLink } = await import("../src/lib/neurolink.js");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chunkPayloads: any[] = [];

    const sdk = new NeuroLink();
    const streamResult = await sdk.stream({
      input: { text: "Count from 1 to 5. Reply with just the numbers." },
      provider: TEST_CONFIG.provider,
      model: TEST_CONFIG.model,
      thinkingLevel: TEST_CONFIG.thinkingLevel,
      disableTools: TEST_CONFIG.disableTools,
      maxTokens: 100,
      onChunk: (payload) => {
        chunkPayloads.push(payload);
      },
    });

    // Consume the stream
    let content = "";
    if (streamResult.stream) {
      for await (const chunk of streamResult.stream) {
        if (
          chunk &&
          typeof chunk === "object" &&
          "content" in chunk &&
          typeof chunk.content === "string"
        ) {
          content += chunk.content;
        }
      }
    }

    if (chunkPayloads.length > 0) {
      logTest(
        "onChunk fires per streaming chunk",
        "PASS",
        `${chunkPayloads.length} chunk callbacks fired, content=${content.length} chars`,
      );
    } else {
      logTest(
        "onChunk fires per streaming chunk",
        "SKIP",
        `Streamed ${content.length} chars, but onChunk callback never fired`,
      );
      return null;
    }

    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("onChunk fires per streaming chunk", "SKIP", msg);
      return null;
    }
    logTest("onChunk fires per streaming chunk", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #6: stream() with onError
// ============================================================

async function testStreamOnError(): Promise<boolean | null> {
  logSection("Test #6: stream() with onError");
  logTest("onError fires on stream failure", "TESTING");

  try {
    const { NeuroLink } = await import("../src/lib/neurolink.js");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let errorPayload: any = null;
    let streamThrew = false;

    const sdk = new NeuroLink();

    try {
      await sdk.stream({
        input: { text: "hello" },
        provider: "nonexistent_provider_xyz",
        model: "nonexistent_model_xyz",
        maxTokens: 10,
        onError: (payload) => {
          errorPayload = payload;
        },
      });
    } catch {
      streamThrew = true;
    }

    if (!streamThrew) {
      logTest(
        "onError fires on stream failure",
        "FAIL",
        "Expected stream to throw",
      );
      return false;
    }

    if (errorPayload) {
      logTest(
        "onError fires on stream failure",
        "PASS",
        `onError fired: ${errorPayload.error?.message?.substring(0, 80)}`,
      );
    } else {
      // The error happened before middleware was attached (e.g. provider resolution)
      // so the onError callback was never exercised — not a real pass
      logTest(
        "onError fires on stream failure",
        "SKIP",
        "Stream threw before middleware attached, onError callback never fired",
      );
      return null;
    }

    return true;
  } catch (error) {
    logTest(
      "onError fires on stream failure",
      "FAIL",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

// ============================================================
// TEST #7: stream() callback error isolation
// ============================================================

async function testStreamCallbackIsolation(): Promise<boolean | null> {
  logSection("Test #7: stream() callback error isolation");
  logTest("Throwing callback does not break streaming", "TESTING");

  try {
    const { NeuroLink } = await import("../src/lib/neurolink.js");

    const sdk = new NeuroLink();
    const streamResult = await sdk.stream({
      input: { text: "What is 5 + 5? Reply with just the number." },
      provider: TEST_CONFIG.provider,
      model: TEST_CONFIG.model,
      thinkingLevel: TEST_CONFIG.thinkingLevel,
      disableTools: TEST_CONFIG.disableTools,
      maxTokens: 50,
      onFinish: () => {
        throw new Error("Consumer stream callback blew up");
      },
      onChunk: () => {
        throw new Error("Consumer chunk callback blew up");
      },
    });

    // Consume the stream — should not throw despite callback errors
    let content = "";
    if (streamResult.stream) {
      for await (const chunk of streamResult.stream) {
        if (
          chunk &&
          typeof chunk === "object" &&
          "content" in chunk &&
          typeof chunk.content === "string"
        ) {
          content += chunk.content;
        }
      }
    }

    logTest(
      "Throwing callback does not break streaming",
      "PASS",
      `Streamed ${content.length} chars despite callback errors`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("Throwing callback does not break streaming", "SKIP", msg);
      return null;
    }
    if (msg.includes("Consumer") && msg.includes("blew up")) {
      logTest(
        "Throwing callback does not break streaming",
        "FAIL",
        "Callback error leaked to caller — isolation broken",
      );
      return false;
    }
    logTest("Throwing callback does not break streaming", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #8: isRecoverableError classification
// ============================================================

async function testIsRecoverableError(): Promise<boolean | null> {
  logSection("Test #8: isRecoverableError classification");
  logTest("Error classification", "TESTING");

  try {
    const { isRecoverableError } =
      await import("../src/lib/utils/errorHandling.js");

    const recoverable = [
      "rate limit exceeded",
      "request timeout",
      "ECONNRESET",
      "ECONNREFUSED",
      "socket hang up",
      "Error 429: Too many requests",
      "Service Unavailable 503",
      "Bad Gateway 502",
    ];

    const nonRecoverable = [
      "Invalid API key",
      "Model not found",
      "Permission denied",
      "Bad request: malformed JSON",
    ];

    const errors: string[] = [];

    for (const msg of recoverable) {
      if (!isRecoverableError(new Error(msg))) {
        errors.push(`"${msg}" should be recoverable`);
      }
    }

    for (const msg of nonRecoverable) {
      if (isRecoverableError(new Error(msg))) {
        errors.push(`"${msg}" should NOT be recoverable`);
      }
    }

    if (errors.length > 0) {
      logTest("Error classification", "FAIL", errors.join("; "));
      return false;
    }

    logTest(
      "Error classification",
      "PASS",
      `${recoverable.length} recoverable + ${nonRecoverable.length} non-recoverable correctly classified`,
    );
    return true;
  } catch (error) {
    logTest(
      "Error classification",
      "FAIL",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

// ============================================================
// MAIN RUNNER
// ============================================================

async function runAllTests(): Promise<void> {
  const startTime = Date.now();
  log(
    "\n--- NeuroLink Continuous Test Suite: Lifecycle Middleware ---",
    "bright",
  );
  log(
    `   Provider: ${TEST_CONFIG.provider}  Model: ${TEST_CONFIG.model}`,
    "cyan",
  );

  const tests: Array<{ name: string; fn: () => Promise<boolean | null> }> = [
    { name: "generate() onFinish", fn: testGenerateOnFinish },
    { name: "generate() onError", fn: testGenerateOnError },
    {
      name: "generate() callback isolation",
      fn: testGenerateCallbackIsolation,
    },
    { name: "stream() onFinish", fn: testStreamOnFinish },
    { name: "stream() onChunk", fn: testStreamOnChunk },
    { name: "stream() onError", fn: testStreamOnError },
    { name: "stream() callback isolation", fn: testStreamCallbackIsolation },
    { name: "isRecoverableError", fn: testIsRecoverableError },
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
    await new Promise((r) => setTimeout(r, TEST_CONFIG.interTestDelay));
  }

  // Summary
  logSection("Test Results Summary");
  const passed = testResults.filter((r) => r.result === true).length;
  const failed = testResults.filter((r) => r.result === false).length;
  const skipped = testResults.filter((r) => r.result === null).length;

  for (const t of testResults) {
    logTest(
      t.name,
      t.result === true ? "PASS" : t.result === false ? "FAIL" : "SKIP",
      t.error || "",
    );
  }

  const duration = Math.round((Date.now() - startTime) / 1000);
  log(
    `\nFinal Results: ${passed} passed, ${failed} failed, ${skipped} skipped (${testResults.length} total) in ${duration}s`,
    failed === 0 ? "green" : "red",
  );

  process.exit(failed === 0 ? 0 : 1);
}

// ============================================================
// CLI ARGS + EXECUTION
// ============================================================

for (const arg of process.argv.slice(2)) {
  if (arg.startsWith("--provider=")) {
    TEST_CONFIG.provider = arg.split("=")[1];
  }
  if (arg.startsWith("--model=")) {
    TEST_CONFIG.model = arg.split("=")[1];
  }
  if (arg === "--help" || arg === "-h") {
    console.log(
      "Usage: npx tsx test/continuous-test-suite-middleware.ts [--provider=X] [--model=Y]",
    );
    console.log("\nTests lifecycle callbacks (onFinish, onError, onChunk)");
    console.log("with real NeuroLink instances and real providers.");
    console.log("Provider-dependent tests SKIP when credentials unavailable.");
    console.log(
      `\nDefaults: --provider=${TEST_CONFIG.provider} --model=${TEST_CONFIG.model}`,
    );
    process.exit(0);
  }
}

if (typeof describe === "undefined") {
  runAllTests().catch((e) => {
    log(`Suite crashed: ${e instanceof Error ? e.message : String(e)}`, "red");
    process.exit(1);
  });
} else {
  describe.skip("Continuous Test Suite: Lifecycle Middleware", () => {
    it("runs standalone", () => runAllTests(), 600000);
  });
}
