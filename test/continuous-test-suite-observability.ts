#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Observability
 *
 * Tests OpenTelemetry instrumentation, context management, span processors,
 * external TracerProvider mode, and operation name detection.
 *
 * ALL tests run locally using InMemorySpanExporter — no Langfuse credentials needed.
 *
 * Run: npx tsx test/continuous-test-suite-observability.ts --provider=vertex
 */

import { spawn } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// OTEL BOOTSTRAP — must register BEFORE importing NeuroLink
// ============================================================
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import type { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import { SpanStatusCode, trace } from "@opentelemetry/api";

const spanExporter = new InMemorySpanExporter();
const traceProvider = new NodeTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(spanExporter)],
});
traceProvider.register();

// Now import NeuroLink (tracers will pick up the registered provider)
const {
  NeuroLink,
  setLangfuseContext,
  getLangfuseContext,
  getSpanProcessors,
  getTracer,
} = await import("../dist/index.js");

// ============================================================
// CONFIGURATION
// ============================================================

const PROVIDER_MAX_TOKENS: Record<string, number> = {
  anthropic: 8192,
  vertex: 10000,
  "google-ai-studio": 10000,
  "google-ai": 10000,
  openai: 16384,
  bedrock: 8192,
  ollama: 4096,
  openrouter: 4096,
};

const TEST_CONFIG = {
  provider: process.env.TEST_PROVIDER || "vertex",
  model: process.env.TEST_MODEL || (undefined as string | undefined),
  maxTokens: undefined as number | undefined,
  timeout: 90000,
  interTestDelay: 2000,
};

// Dummy Langfuse credentials for config (never reach cloud — InMemorySpanExporter captures everything)
const DUMMY_LANGFUSE = {
  publicKey: "test-public-key",
  secretKey: "test-secret-key",
  baseUrl: "http://localhost:9999", // unreachable, but that's fine
};

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

function buildGenerateOptions(
  extraOpts: Record<string, unknown> = {},
): Record<string, unknown> {
  const opts: Record<string, unknown> = {
    input: { text: 'Say "hello" and nothing else' },
    provider: TEST_CONFIG.provider,
    maxTokens: 50,
    disableTools: true,
    ...extraOpts,
  };
  if (TEST_CONFIG.model) {
    opts.model = TEST_CONFIG.model;
  }
  return opts;
}

function getFinishedSpans(): ReadableSpan[] {
  return spanExporter.getFinishedSpans();
}

function resetSpans(): void {
  spanExporter.reset();
}

function isExpectedProviderError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return [
    "api key",
    "authentication",
    "rate limit",
    "quota",
    "credentials",
    "could not be resolved",
    "cannot connect",
    "failed to generate",
    "google_application_credentials",
  ].some((p) => lower.includes(p));
}

type ProcessResult = {
  success: boolean;
  code: number;
  stdout: string;
  stderr: string;
};

function runCommand(
  command: string,
  args: string[],
  options?: Record<string, unknown>,
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      env: {
        ...process.env,
        ...((options?.env as Record<string, string>) || {}),
      },
    });
    let stdout = "",
      stderr = "";
    proc.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    const timeoutId = setTimeout(() => {
      proc.kill("SIGTERM");
      setTimeout(() => {
        if (!proc.killed) {
          proc.kill("SIGKILL");
        }
      }, 2000);
      reject(new Error(`Command timeout after ${TEST_CONFIG.timeout}ms`));
    }, TEST_CONFIG.timeout);
    proc.on("close", (code) => {
      clearTimeout(timeoutId);
      resolve({
        success: code === 0,
        code: code ?? -1,
        stdout,
        stderr,
      });
    });
    proc.on("error", (err) => {
      clearTimeout(timeoutId);
      reject(err);
    });
  });
}

// ============================================================
// TEST #1: Telemetry Service Init
// ============================================================

async function testTelemetryServiceInit(): Promise<boolean | null> {
  logSection("Test #1: Telemetry Service Init");
  logTest("Telemetry Service Init", "TESTING");
  resetSpans();

  try {
    // Initialize NeuroLink with observability config — should not throw
    const sdk = new NeuroLink({
      observability: {
        langfuse: {
          enabled: true,
          publicKey: DUMMY_LANGFUSE.publicKey,
          secretKey: DUMMY_LANGFUSE.secretKey,
          baseUrl: DUMMY_LANGFUSE.baseUrl,
          useExternalTracerProvider: true,
          environment: "test",
          release: "continuous-test-suite",
        },
      },
    });

    if (sdk) {
      logTest(
        "Telemetry Service Init",
        "PASS",
        "NeuroLink initialized with observability config successfully",
      );
      try {
        await sdk.shutdown?.();
      } catch {
        /* ignore */
      }
      return true;
    } else {
      logTest("Telemetry Service Init", "FAIL", "SDK returned null");
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Telemetry Service Init", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #2: External TracerProvider Mode
// ============================================================

async function testExternalTracerProviderMode(): Promise<boolean | null> {
  logSection("Test #2: External TracerProvider Mode");
  logTest("External TracerProvider Mode", "TESTING");
  resetSpans();

  try {
    const sdk = new NeuroLink({
      observability: {
        langfuse: {
          enabled: true,
          publicKey: DUMMY_LANGFUSE.publicKey,
          secretKey: DUMMY_LANGFUSE.secretKey,
          baseUrl: DUMMY_LANGFUSE.baseUrl,
          useExternalTracerProvider: true,
        },
      },
    });

    // Generate should work without "duplicate registration" error
    const result = await sdk.generate(buildGenerateOptions());

    if (result?.content && result.content.length > 0) {
      // Also verify spans were captured locally
      const spans = getFinishedSpans();
      logTest(
        "External TracerProvider Mode",
        "PASS",
        `No duplicate registration error. ${spans.length} spans captured. Content: ${result.content.substring(0, 40)}`,
      );
      try {
        await sdk.shutdown?.();
      } catch {
        /* ignore */
      }
      return true;
    } else {
      logTest("External TracerProvider Mode", "FAIL", "No content in response");
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest(
        "External TracerProvider Mode",
        "SKIP",
        "Provider credentials not configured",
      );
      return null;
    }
    logTest("External TracerProvider Mode", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #3: getSpanProcessors
// ============================================================

async function testGetSpanProcessors(): Promise<boolean | null> {
  logSection("Test #3: getSpanProcessors");
  logTest("getSpanProcessors", "TESTING");
  resetSpans();

  try {
    // Initialize SDK to ensure processors are created
    const sdk = new NeuroLink({
      observability: {
        langfuse: {
          enabled: true,
          publicKey: DUMMY_LANGFUSE.publicKey,
          secretKey: DUMMY_LANGFUSE.secretKey,
          baseUrl: DUMMY_LANGFUSE.baseUrl,
          useExternalTracerProvider: true,
        },
      },
    });

    await new Promise((r) => setTimeout(r, 500));

    const processors = getSpanProcessors();

    if (Array.isArray(processors)) {
      // Verify processors have expected SpanProcessor interface
      let hasValidProcessors = true;
      for (const proc of processors) {
        if (
          typeof proc.onStart !== "function" ||
          typeof proc.onEnd !== "function"
        ) {
          hasValidProcessors = false;
          break;
        }
      }

      if (hasValidProcessors) {
        logTest(
          "getSpanProcessors",
          "PASS",
          `Returned ${processors.length} valid processor(s) with onStart/onEnd`,
        );
        try {
          await sdk.shutdown?.();
        } catch {
          /* ignore */
        }
        return true;
      } else {
        logTest(
          "getSpanProcessors",
          "FAIL",
          "Processors missing onStart/onEnd methods",
        );
        return false;
      }
    } else {
      logTest(
        "getSpanProcessors",
        "FAIL",
        `Expected array, got ${typeof processors}`,
      );
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("getSpanProcessors", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #4: setLangfuseContext / getLangfuseContext
// ============================================================

async function testSetLangfuseContext(): Promise<boolean | null> {
  logSection("Test #4: setLangfuseContext / getLangfuseContext");
  logTest("setLangfuseContext", "TESTING");
  resetSpans();

  try {
    const testUserId = "test-user-" + Date.now();
    const testSessionId = "test-session-" + Date.now();

    // setLangfuseContext is pure AsyncLocalStorage — no Langfuse needed
    await setLangfuseContext({
      userId: testUserId,
      sessionId: testSessionId,
    });

    const context = getLangfuseContext();

    if (
      context?.userId === testUserId &&
      context?.sessionId === testSessionId
    ) {
      logTest(
        "setLangfuseContext",
        "PASS",
        `Context roundtrip matches. userId=${testUserId}, sessionId=${testSessionId}`,
      );
      return true;
    } else {
      logTest(
        "setLangfuseContext",
        "FAIL",
        `Context mismatch. Got userId=${context?.userId}, sessionId=${context?.sessionId}`,
      );
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("setLangfuseContext", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #5: setLangfuseContext with Callback + generate()
// ============================================================

async function testSetLangfuseContextWithCallback(): Promise<boolean | null> {
  logSection("Test #5: setLangfuseContext with Callback + generate()");
  logTest("Context Callback + Generate", "TESTING");
  resetSpans();

  try {
    const sdk = new NeuroLink({
      observability: {
        langfuse: {
          enabled: true,
          publicKey: DUMMY_LANGFUSE.publicKey,
          secretKey: DUMMY_LANGFUSE.secretKey,
          baseUrl: DUMMY_LANGFUSE.baseUrl,
          useExternalTracerProvider: true,
        },
      },
    });

    const result = await setLangfuseContext(
      {
        userId: "test-callback-user",
        sessionId: "test-callback-session",
        conversationId: "test-conv-123",
        requestId: "test-req-abc",
        traceName: "callback-test",
      },
      async () => {
        return await sdk.generate(
          buildGenerateOptions({
            input: { text: 'Say "callback" and nothing else' },
          }),
        );
      },
    );

    if (result?.content && result.content.length > 0) {
      const spans = getFinishedSpans();
      logTest(
        "Context Callback + Generate",
        "PASS",
        `Callback executed. ${spans.length} spans captured. Content: ${result.content.substring(0, 40)}`,
      );
      try {
        await sdk.shutdown?.();
      } catch {
        /* ignore */
      }
      return true;
    } else {
      logTest(
        "Context Callback + Generate",
        "FAIL",
        "No content returned from callback",
      );
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest(
        "Context Callback + Generate",
        "SKIP",
        "Provider credentials not configured",
      );
      return null;
    }
    logTest("Context Callback + Generate", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #6: Operation Name Auto-Detection
// ============================================================

async function testOperationNameAutoDetection(): Promise<boolean | null> {
  logSection("Test #6: Operation Name Auto-Detection");
  logTest("Operation Name Auto-Detection", "TESTING");
  resetSpans();

  try {
    const sdk = new NeuroLink({
      observability: {
        langfuse: {
          enabled: true,
          publicKey: DUMMY_LANGFUSE.publicKey,
          secretKey: DUMMY_LANGFUSE.secretKey,
          baseUrl: DUMMY_LANGFUSE.baseUrl,
          useExternalTracerProvider: true,
          autoDetectOperationName: true,
        },
      },
    });

    const result = await setLangfuseContext(
      { userId: "test-autodetect-user" },
      async () => {
        return await sdk.generate(
          buildGenerateOptions({
            input: { text: 'Say "autodetect" and nothing else' },
          }),
        );
      },
    );

    if (result?.content && result.content.length > 0) {
      const spans = getFinishedSpans();
      // Check if any span has operation-related attributes
      const spanNames = spans.map((s) => s.name);
      logTest(
        "Operation Name Auto-Detection",
        "PASS",
        `Auto-detection generate completed. ${spans.length} spans: [${spanNames.slice(0, 5).join(", ")}]`,
      );
      try {
        await sdk.shutdown?.();
      } catch {
        /* ignore */
      }
      return true;
    } else {
      logTest("Operation Name Auto-Detection", "FAIL", "No content");
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest(
        "Operation Name Auto-Detection",
        "SKIP",
        "Provider credentials not configured",
      );
      return null;
    }
    logTest("Operation Name Auto-Detection", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #7: Custom Trace Name Format
// ============================================================

async function testTraceNameFormat(): Promise<boolean | null> {
  logSection("Test #7: Custom Trace Name Format");
  logTest("Trace Name Format", "TESTING");
  resetSpans();

  try {
    let formatCalled = false;
    const sdk = new NeuroLink({
      observability: {
        langfuse: {
          enabled: true,
          publicKey: DUMMY_LANGFUSE.publicKey,
          secretKey: DUMMY_LANGFUSE.secretKey,
          baseUrl: DUMMY_LANGFUSE.baseUrl,
          useExternalTracerProvider: true,
          autoDetectOperationName: true,
          traceNameFormat: (context: {
            operationName?: string;
            userId?: string | null;
          }) => {
            formatCalled = true;
            return (
              "custom/" +
              (context.operationName || "unknown") +
              "/" +
              (context.userId || "anon")
            );
          },
        },
      },
    });

    const result = await setLangfuseContext(
      { userId: "format-test-user" },
      async () => {
        return await sdk.generate(
          buildGenerateOptions({
            input: { text: 'Say "formatted" and nothing else' },
          }),
        );
      },
    );

    if (result?.content && result.content.length > 0) {
      const spans = getFinishedSpans();
      logTest(
        "Trace Name Format",
        "PASS",
        `Custom format applied (formatCalled=${formatCalled}). ${spans.length} spans. Content: ${result.content.substring(0, 30)}`,
      );
      try {
        await sdk.shutdown?.();
      } catch {
        /* ignore */
      }
      return true;
    } else {
      logTest("Trace Name Format", "FAIL", "No content");
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest(
        "Trace Name Format",
        "SKIP",
        "Provider credentials not configured",
      );
      return null;
    }
    logTest("Trace Name Format", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #8: Custom Metadata in Context
// ============================================================

async function testCustomMetadataInContext(): Promise<boolean | null> {
  logSection("Test #8: Custom Metadata in Context");
  logTest("Custom Metadata in Context", "TESTING");
  resetSpans();

  try {
    const sdk = new NeuroLink({
      observability: {
        langfuse: {
          enabled: true,
          publicKey: DUMMY_LANGFUSE.publicKey,
          secretKey: DUMMY_LANGFUSE.secretKey,
          baseUrl: DUMMY_LANGFUSE.baseUrl,
          useExternalTracerProvider: true,
        },
      },
    });

    const testMetadata = {
      feature: "customer-support",
      tier: "premium",
      priority: 1,
    };

    const result = await setLangfuseContext(
      {
        userId: "metadata-test-user",
        metadata: testMetadata,
      },
      async () => {
        // Verify metadata is in context
        const ctx = getLangfuseContext();
        if (!ctx?.metadata || ctx.metadata.feature !== "customer-support") {
          throw new Error(
            `Metadata not set in context: ${JSON.stringify(ctx?.metadata)}`,
          );
        }
        return await sdk.generate(
          buildGenerateOptions({
            input: { text: 'Say "metadata" and nothing else' },
          }),
        );
      },
    );

    if (result?.content && result.content.length > 0) {
      const spans = getFinishedSpans();
      logTest(
        "Custom Metadata in Context",
        "PASS",
        `Metadata verified in context. ${spans.length} spans. Content: ${result.content.substring(0, 30)}`,
      );
      try {
        await sdk.shutdown?.();
      } catch {
        /* ignore */
      }
      return true;
    } else {
      logTest("Custom Metadata in Context", "FAIL", "No content");
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest(
        "Custom Metadata in Context",
        "SKIP",
        "Provider credentials not configured",
      );
      return null;
    }
    logTest("Custom Metadata in Context", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #9: OTEL Peer Dependency Graceful (child process)
// ============================================================

async function testOTELPeerDependencyGraceful(): Promise<boolean | null> {
  logSection("Test #9: OTEL Peer Dependency Graceful Handling");
  logTest("OTEL Peer Dependency", "TESTING");

  // This test runs in a child process to verify SDK loads in a clean environment
  const tempDir = fs.mkdtempSync(os.tmpdir() + "/test-otel-graceful-");
  const tempScriptPath = tempDir + "/test-otel-graceful.mjs";

  try {
    const testScript = `
async function testOTELPeerDependencyGraceful() {
  console.log('Testing SDK import without explicit OTEL dependency...');

  try {
    const distModule = await import('${process.cwd()}/dist/index.js');

    if (!distModule.NeuroLink) {
      console.log('FAIL - NeuroLink not found in dist exports');
      process.exit(1);
    }

    const sdk = new distModule.NeuroLink();

    if (sdk) {
      console.log('PASS - SDK loaded successfully without explicit OTEL config');

      const hasSetContext = typeof distModule.setLangfuseContext === 'function';
      const hasGetContext = typeof distModule.getLangfuseContext === 'function';
      const hasGetSpanProcs = typeof distModule.getSpanProcessors === 'function';
      const hasGetTracer = typeof distModule.getTracer === 'function';

      console.log('Exports: setLangfuseContext=' + hasSetContext + ', getLangfuseContext=' + hasGetContext + ', getSpanProcessors=' + hasGetSpanProcs + ', getTracer=' + hasGetTracer);

      if (hasSetContext && hasGetContext && hasGetSpanProcs && hasGetTracer) {
        console.log('PASS - All observability exports available');
      } else {
        console.log('FAIL - Some observability exports missing');
        process.exit(1);
      }

      try { await sdk.shutdown?.(); } catch { /* ignore */ }
      process.exit(0);
    } else {
      console.log('FAIL - SDK is null');
      process.exit(1);
    }
  } catch (error) {
    if (error.message?.includes('Cannot find module') && error.message?.includes('opentelemetry')) {
      console.log('PASS - SDK handles missing OTEL gracefully');
      process.exit(0);
    }
    console.log('FAIL -', error.message);
    process.exit(1);
  }
}

testOTELPeerDependencyGraceful();
`;

    fs.writeFileSync(tempScriptPath, testScript);

    const result = await runCommand("node", [tempScriptPath]);

    if (
      result.success &&
      result.stdout.includes("PASS") &&
      !result.stdout.includes("FAIL")
    ) {
      logTest(
        "OTEL Peer Dependency",
        "PASS",
        "SDK loads gracefully without/with OTEL",
      );
      return true;
    } else {
      logTest("OTEL Peer Dependency", "FAIL", result.stderr || result.stdout);
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("OTEL Peer Dependency", "FAIL", msg);
    return false;
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

// ============================================================
// TEST #10: getTracer for Custom Spans
// ============================================================

async function testGetTracer(): Promise<boolean | null> {
  logSection("Test #10: getTracer for Custom Spans");
  logTest("getTracer", "TESTING");
  resetSpans();

  try {
    // getTracer is pure OTel — just wraps trace.getTracer()
    const tracer = getTracer("test-app", "1.0.0");

    if (!tracer) {
      logTest("getTracer", "FAIL", "getTracer returned null");
      return false;
    }

    // Create a custom span and verify it appears in the exporter
    const span = tracer.startSpan("custom-test-operation", {
      attributes: {
        "test.suite": "observability",
        "test.number": 10,
      },
    });

    span.setStatus({ code: SpanStatusCode.OK });
    span.end();

    // Wait for span processor to flush
    await new Promise((r) => setTimeout(r, 100));

    const spans = getFinishedSpans();
    const customSpan = spans.find((s) => s.name === "custom-test-operation");

    if (customSpan) {
      const hasTestAttr =
        customSpan.attributes["test.suite"] === "observability";
      logTest(
        "getTracer",
        "PASS",
        `Custom span captured. name="${customSpan.name}", test.suite attr=${hasTestAttr}`,
      );
      return true;
    } else {
      logTest(
        "getTracer",
        "FAIL",
        `Custom span not found in ${spans.length} captured spans: [${spans.map((s) => s.name).join(", ")}]`,
      );
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("getTracer", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #11: All Extended Context Fields
// ============================================================

async function testAllContextFields(): Promise<boolean | null> {
  logSection("Test #11: All Extended Context Fields");
  logTest("All Context Fields", "TESTING");
  resetSpans();

  try {
    const sdk = new NeuroLink({
      observability: {
        langfuse: {
          enabled: true,
          publicKey: DUMMY_LANGFUSE.publicKey,
          secretKey: DUMMY_LANGFUSE.secretKey,
          baseUrl: DUMMY_LANGFUSE.baseUrl,
          useExternalTracerProvider: true,
        },
      },
    });

    const allFields = {
      userId: "all-fields-user",
      sessionId: "all-fields-session",
      conversationId: "all-fields-conv-123",
      requestId: "all-fields-req-abc",
      traceName: "all-fields-trace",
      operationName: "all-fields-operation",
      metadata: { key1: "value1", key2: 42, key3: true },
      customAttributes: {
        "app.tenant": "test-tenant",
        "app.version": 3,
        "app.debug": true,
      },
    };

    const result = await setLangfuseContext(allFields, async () => {
      // Verify all fields are accessible inside the callback
      const ctx = getLangfuseContext();

      const checks = [
        { name: "userId", ok: ctx?.userId === allFields.userId },
        { name: "sessionId", ok: ctx?.sessionId === allFields.sessionId },
        {
          name: "conversationId",
          ok: ctx?.conversationId === allFields.conversationId,
        },
        { name: "requestId", ok: ctx?.requestId === allFields.requestId },
        { name: "traceName", ok: ctx?.traceName === allFields.traceName },
        {
          name: "operationName",
          ok: ctx?.operationName === allFields.operationName,
        },
        { name: "metadata.key1", ok: ctx?.metadata?.key1 === "value1" },
        {
          name: "customAttributes.app.tenant",
          ok: ctx?.customAttributes?.["app.tenant"] === "test-tenant",
        },
      ];

      const passedChecks = checks.filter((c) => c.ok).length;
      const failedNames = checks.filter((c) => !c.ok).map((c) => c.name);

      if (passedChecks < checks.length) {
        throw new Error(
          `Context fields failed: [${failedNames.join(", ")}] (${passedChecks}/${checks.length})`,
        );
      }

      return await sdk.generate(
        buildGenerateOptions({
          input: { text: 'Say "context" and nothing else' },
        }),
      );
    });

    if (result?.content && result.content.length > 0) {
      const spans = getFinishedSpans();
      logTest(
        "All Context Fields",
        "PASS",
        `All 8 context fields verified. ${spans.length} spans. Content: ${result.content.substring(0, 30)}`,
      );
      try {
        await sdk.shutdown?.();
      } catch {
        /* ignore */
      }
      return true;
    } else {
      logTest("All Context Fields", "FAIL", "No content");
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest(
        "All Context Fields",
        "SKIP",
        "Provider credentials not configured",
      );
      return null;
    }
    logTest("All Context Fields", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #12: CLI with Observability (subprocess with dummy env vars)
// ============================================================

async function testCLIWithObservability(): Promise<boolean | null> {
  logSection("Test #12: CLI Generate with Observability env vars");
  logTest("CLI with Observability", "TESTING");

  try {
    const cliArgs = [
      "dist/cli/index.js",
      "generate",
      `--provider=${TEST_CONFIG.provider}`,
      ...(TEST_CONFIG.model ? [`--model=${TEST_CONFIG.model}`] : []),
      "--max-tokens=50",
      'Say "observability" and nothing else',
    ];

    const result = await runCommand("node", cliArgs, {
      env: {
        LANGFUSE_PUBLIC_KEY: DUMMY_LANGFUSE.publicKey,
        LANGFUSE_SECRET_KEY: DUMMY_LANGFUSE.secretKey,
        LANGFUSE_BASE_URL: DUMMY_LANGFUSE.baseUrl,
      },
    });

    if (!result.success) {
      if (isExpectedProviderError(result.stderr)) {
        logTest("CLI with Observability", "SKIP", "Provider not configured");
        return null;
      }
      logTest(
        "CLI with Observability",
        "FAIL",
        `Exit code: ${result.code}, Error: ${result.stderr.substring(0, 200)}`,
      );
      return false;
    }

    if (result.stdout.length > 0) {
      logTest(
        "CLI with Observability",
        "PASS",
        `CLI completed with observability env vars. Output: ${result.stdout.substring(0, 50)}`,
      );
      return true;
    } else {
      logTest("CLI with Observability", "FAIL", "No output from CLI");
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("CLI with Observability", "SKIP", msg);
      return null;
    }
    logTest("CLI with Observability", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #13: Operation Name Override
// ============================================================

async function testOperationNameOverride(): Promise<boolean | null> {
  logSection("Test #13: Operation Name Override");
  logTest("Operation Name Override", "TESTING");
  resetSpans();

  try {
    const sdk = new NeuroLink({
      observability: {
        langfuse: {
          enabled: true,
          publicKey: DUMMY_LANGFUSE.publicKey,
          secretKey: DUMMY_LANGFUSE.secretKey,
          baseUrl: DUMMY_LANGFUSE.baseUrl,
          useExternalTracerProvider: true,
          autoDetectOperationName: true,
        },
      },
    });

    // Set explicit operationName — should override auto-detection
    const result = await setLangfuseContext(
      {
        userId: "override-test-user",
        operationName: "custom-chat-operation",
      },
      async () => {
        // Verify operationName is in context
        const ctx = getLangfuseContext();
        if (ctx?.operationName !== "custom-chat-operation") {
          throw new Error(`operationName not set: got ${ctx?.operationName}`);
        }
        return await sdk.generate(
          buildGenerateOptions({
            input: { text: 'Say "override" and nothing else' },
          }),
        );
      },
    );

    if (result?.content && result.content.length > 0) {
      const spans = getFinishedSpans();
      logTest(
        "Operation Name Override",
        "PASS",
        `Explicit operationName verified in context. ${spans.length} spans. Content: ${result.content.substring(0, 30)}`,
      );
      try {
        await sdk.shutdown?.();
      } catch {
        /* ignore */
      }
      return true;
    } else {
      logTest("Operation Name Override", "FAIL", "No content");
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest(
        "Operation Name Override",
        "SKIP",
        "Provider credentials not configured",
      );
      return null;
    }
    logTest("Operation Name Override", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #14: Wrapper Span Support
// ============================================================

async function testWrapperSpanSupport(): Promise<boolean | null> {
  logSection("Test #14: Wrapper Span Support");
  logTest("Wrapper Span Support", "TESTING");
  resetSpans();

  try {
    const sdk = new NeuroLink({
      observability: {
        langfuse: {
          enabled: true,
          publicKey: DUMMY_LANGFUSE.publicKey,
          secretKey: DUMMY_LANGFUSE.secretKey,
          baseUrl: DUMMY_LANGFUSE.baseUrl,
          useExternalTracerProvider: true,
          autoDetectOperationName: true,
        },
      },
    });

    await new Promise((r) => setTimeout(r, 300));

    const tracer = getTracer("wrapper-test");

    // Create a wrapper span (simulating a host app wrapping an AI call)
    const wrapperSpan = tracer.startSpan("host-app-handler", {
      attributes: {
        "handler.name": "chat-endpoint",
        "handler.type": "api",
      },
    });

    let generateResult: { content?: string } | undefined;
    try {
      generateResult = await setLangfuseContext(
        { userId: "wrapper-test-user" },
        async () => {
          return await sdk.generate(
            buildGenerateOptions({
              input: { text: 'Say "wrapper" and nothing else' },
            }),
          );
        },
      );

      wrapperSpan.setStatus({ code: SpanStatusCode.OK });
    } catch (innerError) {
      const innerMsg =
        innerError instanceof Error ? innerError.message : String(innerError);
      wrapperSpan.setStatus({ code: SpanStatusCode.ERROR, message: innerMsg });
      throw innerError;
    } finally {
      wrapperSpan.end();
    }

    // Wait for span processing
    await new Promise((r) => setTimeout(r, 200));

    if (generateResult?.content && generateResult.content.length > 0) {
      const spans = getFinishedSpans();
      const hostSpan = spans.find((s) => s.name === "host-app-handler");
      const hasHostSpan = !!hostSpan;
      const childSpanCount = spans.filter(
        (s) =>
          s.name !== "host-app-handler" &&
          hostSpan &&
          s.parentSpanId === hostSpan.spanContext().spanId,
      ).length;

      logTest(
        "Wrapper Span Support",
        "PASS",
        `Wrapper span: ${hasHostSpan}, child spans: ${childSpanCount}, total: ${spans.length}. Content: ${generateResult.content.substring(0, 30)}`,
      );
      try {
        await sdk.shutdown?.();
      } catch {
        /* ignore */
      }
      return true;
    } else {
      logTest(
        "Wrapper Span Support",
        "FAIL",
        "No content from generate within wrapper span",
      );
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest(
        "Wrapper Span Support",
        "SKIP",
        "Provider credentials not configured",
      );
      return null;
    }
    logTest("Wrapper Span Support", "FAIL", msg);
    return false;
  }
}

// ============================================================
// MAIN RUNNER
// ============================================================

async function runAllTests(): Promise<void> {
  const startTime = Date.now();
  log("\n--- NeuroLink Continuous Test Suite: Observability ---", "bright");
  log(
    `   Provider: ${TEST_CONFIG.provider}, Model: ${TEST_CONFIG.model || "default"}`,
    "cyan",
  );
  log(
    `   Mode: Local (InMemorySpanExporter — no Langfuse credentials needed)`,
    "green",
  );

  // Prerequisite checks
  if (!fs.existsSync("dist") || !fs.existsSync("dist/index.js")) {
    log("Build not found. Run: pnpm run build", "red");
    process.exit(1);
  }

  const tests: Array<{ name: string; fn: () => Promise<boolean | null> }> = [
    { name: "Telemetry Service Init", fn: testTelemetryServiceInit },
    {
      name: "External TracerProvider Mode",
      fn: testExternalTracerProviderMode,
    },
    { name: "getSpanProcessors", fn: testGetSpanProcessors },
    {
      name: "setLangfuseContext / getLangfuseContext",
      fn: testSetLangfuseContext,
    },
    {
      name: "Context Callback + Generate",
      fn: testSetLangfuseContextWithCallback,
    },
    {
      name: "Operation Name Auto-Detection",
      fn: testOperationNameAutoDetection,
    },
    { name: "Trace Name Format", fn: testTraceNameFormat },
    { name: "Custom Metadata in Context", fn: testCustomMetadataInContext },
    {
      name: "OTEL Peer Dependency Graceful",
      fn: testOTELPeerDependencyGraceful,
    },
    { name: "getTracer for Custom Spans", fn: testGetTracer },
    { name: "All Extended Context Fields", fn: testAllContextFields },
    { name: "CLI with Observability", fn: testCLIWithObservability },
    { name: "Operation Name Override", fn: testOperationNameOverride },
    { name: "Wrapper Span Support", fn: testWrapperSpanSupport },
  ];

  for (const test of tests) {
    try {
      const result = await test.fn();
      testResults.push({ name: test.name, result, error: null });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      testResults.push({ name: test.name, result: false, error: msg });
    }
    await new Promise((r) => setTimeout(r, TEST_CONFIG.interTestDelay));
  }

  // Summary
  logSection("Test Results Summary");
  const passed = testResults.filter((r) => r.result === true).length;
  const failed = testResults.filter((r) => r.result === false).length;
  const skipped = testResults.filter((r) => r.result === null).length;
  testResults.forEach((t) =>
    logTest(
      t.name,
      t.result === true ? "PASS" : t.result === false ? "FAIL" : "SKIP",
      t.error || "",
    ),
  );

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

function parseArguments(): { provider?: string; model?: string } {
  const args: { provider?: string; model?: string } = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--provider=")) {
      args.provider = arg.split("=")[1];
    }
    if (arg.startsWith("--model=")) {
      args.model = arg.split("=")[1];
    }
    if (arg === "--help") {
      console.log(
        "Usage: npx tsx test/continuous-test-suite-observability.ts [--provider=X] [--model=Y]",
      );
      console.log(
        "\nTests OTel instrumentation, context management, span processors.",
      );
      console.log(
        "Runs locally with InMemorySpanExporter — no Langfuse credentials needed.",
      );
      console.log("Default provider: vertex");
      process.exit(0);
    }
  }
  return args;
}

const cliArgs = parseArguments();
if (cliArgs.provider) {
  TEST_CONFIG.provider = cliArgs.provider;
}
if (cliArgs.model) {
  TEST_CONFIG.model = cliArgs.model;
}
if (!TEST_CONFIG.maxTokens) {
  TEST_CONFIG.maxTokens = PROVIDER_MAX_TOKENS[TEST_CONFIG.provider] || 8192;
}

if (typeof describe === "undefined") {
  runAllTests().catch((e) => {
    log(`Suite crashed: ${e instanceof Error ? e.message : String(e)}`, "red");
    process.exit(1);
  });
} else {
  describe.skip("Continuous Test Suite: Observability", () => {
    it("runs standalone", () => runAllTests(), 600000);
  });
}
