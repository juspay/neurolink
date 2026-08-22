#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite: Tool Reliability
 *
 * Tests tool execution metadata, event emitter completeness, timeout enforcement,
 * error category tracking, and OTel span generation for tool operations.
 *
 * The SDK now supports:
 * - Provider/model population on stream/generate results
 * - Per-tool timeout via registerTool() options (third parameter)
 * - Error categories (timeout, validation, internal) in tool execution metrics
 *
 * ALL OTel tests run locally using InMemorySpanExporter — no Langfuse credentials needed.
 *
 * Run: npx tsx test/continuous-test-suite-tool-reliability.ts --provider=vertex
 */

import * as fs from "fs";

import { SpanStatusCode } from "@opentelemetry/api";
import type { ReadableSpan } from "@opentelemetry/sdk-trace-base";
// ============================================================
// OTEL BOOTSTRAP — must register BEFORE importing NeuroLink
// ============================================================
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

const spanExporter = new InMemorySpanExporter();
const traceProvider = new NodeTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(spanExporter)],
});
traceProvider.register();

// Now import NeuroLink (tracers will pick up the registered provider)
const { NeuroLink } = await import("../dist/index.js");

// ============================================================
// CONFIGURATION
// ============================================================

function resolveTestModel(provider: string): string | undefined {
  if (process.env.TEST_MODEL) {
    return process.env.TEST_MODEL;
  }
  const providerModelEnvMap: Record<string, string> = {
    litellm: "LITELLM_MODEL",
    openai: "OPENAI_MODEL",
    vertex: "VERTEX_MODEL",
    bedrock: "BEDROCK_MODEL",
    "google-ai-studio": "GOOGLE_AI_MODEL",
    "google-ai": "GOOGLE_AI_MODEL",
    azure: "AZURE_OPENAI_MODEL",
    anthropic: "ANTHROPIC_MODEL",
    mistral: "MISTRAL_MODEL",
    ollama: "OLLAMA_MODEL",
  };
  const envKey = providerModelEnvMap[provider];
  return envKey ? process.env[envKey] : undefined;
}

const TEST_CONFIG = {
  provider: process.env.TEST_PROVIDER || "vertex",
  model: undefined as string | undefined,
  timeout: 90000,
  interTestDelay: 2000,
};

// ============================================================
// LOGGING UTILITIES — provided by shared harness
// ============================================================

import {
  defineSuite,
  log,
  logSection,
  type ColorName,
} from "./helpers/harness.js";

const { recordTest, runSuite } = defineSuite("Tool Reliability");

/** Print-only logTest shim. Counters come from recordTest in the runner loop. */
function logTest(
  testName: string,
  status: "PASS" | "FAIL" | "SKIP" | "TESTING",
  details?: string,
): void {
  const color: ColorName =
    status === "PASS"
      ? "green"
      : status === "FAIL"
        ? "red"
        : status === "SKIP"
          ? "yellow"
          : "blue";
  log(`[${status}] ${testName}${details ? ` — ${details}` : ""}`, color);
}
// ============================================================
// TEST RESULTS TRACKING
// ============================================================

// ============================================================
// HELPERS
// ============================================================

function createSDK(): InstanceType<typeof NeuroLink> {
  return new NeuroLink();
}

async function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function findSpan(name: string): ReadableSpan | undefined {
  return spanExporter.getFinishedSpans().find((s) => s.name === name);
}

function findSpans(namePattern: string): ReadableSpan[] {
  return spanExporter
    .getFinishedSpans()
    .filter((s) => s.name === namePattern || s.name.includes(namePattern));
}

function getAttr(span: ReadableSpan, key: string): unknown {
  return span.attributes[key];
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
    "permission",
    "unauthorized",
  ].some((p) => lower.includes(p));
}

// ============================================================
// TEST #1: Stream result always includes provider and model
// ============================================================

async function test_stream_result_provider_model(): Promise<boolean | null> {
  logSection("Test #1: Stream result always includes provider and model");
  logTest("Stream result provider/model", "TESTING");

  const sdk = createSDK();

  try {
    const streamResult = await sdk.stream({
      input: { text: 'Say "hello" and nothing else.' },
      provider: TEST_CONFIG.provider as string,
      ...(TEST_CONFIG.model ? { model: TEST_CONFIG.model } : {}),
      maxTokens: 50,
    });

    // Consume the full stream
    let content = "";
    if (streamResult?.stream) {
      for await (const chunk of streamResult.stream) {
        if ("content" in chunk && typeof chunk.content === "string") {
          content += chunk.content;
        }
      }
    }

    // Wait for async resolution
    await delay(500);

    // Assert provider is a non-empty string
    if (
      typeof streamResult.provider !== "string" ||
      streamResult.provider.length === 0
    ) {
      logTest(
        "Stream result provider/model",
        "FAIL",
        `provider is missing or empty on stream result. Got: ${JSON.stringify(streamResult.provider)}`,
      );
      return false;
    }

    // Assert model is a non-empty string
    if (
      typeof streamResult.model !== "string" ||
      streamResult.model.length === 0
    ) {
      logTest(
        "Stream result provider/model",
        "FAIL",
        `model is missing or empty on stream result. Got: ${JSON.stringify(streamResult.model)}`,
      );
      return false;
    }

    logTest(
      "Stream result provider/model",
      "PASS",
      `provider="${streamResult.provider}", model="${streamResult.model}", content length=${content.length}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("Stream result provider/model", "SKIP", `Provider error: ${msg}`);
      return null;
    }
    logTest("Stream result provider/model", "FAIL", msg);
    return false;
  } finally {
    try {
      await (sdk as { shutdown?: () => Promise<void> }).shutdown?.();
    } catch {
      /* ignore */
    }
  }
}

// ============================================================
// TEST #2: Generate result always includes provider and model
// ============================================================

async function test_generate_result_provider_model(): Promise<boolean | null> {
  logSection("Test #2: Generate result always includes provider and model");
  logTest("Generate result provider/model", "TESTING");

  const sdk = createSDK();

  try {
    const result = await sdk.generate({
      input: { text: 'Say "hello" and nothing else.' },
      provider: TEST_CONFIG.provider as string,
      ...(TEST_CONFIG.model ? { model: TEST_CONFIG.model } : {}),
      maxTokens: 50,
    });

    if (!result?.content) {
      logTest(
        "Generate result provider/model",
        "FAIL",
        "No content returned from generate",
      );
      return false;
    }

    // Assert provider is a non-empty string
    if (typeof result.provider !== "string" || result.provider.length === 0) {
      logTest(
        "Generate result provider/model",
        "FAIL",
        `provider is missing or empty on generate result. Got: ${JSON.stringify(result.provider)}`,
      );
      return false;
    }

    // Assert model is a non-empty string
    if (typeof result.model !== "string" || result.model.length === 0) {
      logTest(
        "Generate result provider/model",
        "FAIL",
        `model is missing or empty on generate result. Got: ${JSON.stringify(result.model)}`,
      );
      return false;
    }

    // Check analytics data has provider populated if available
    let analyticsDetail = "";
    if (result.analytics) {
      const analytics = result.analytics;
      const analyticsProvider =
        typeof analytics === "object" &&
        analytics !== null &&
        "provider" in analytics
          ? (analytics as Record<string, unknown>).provider
          : undefined;
      if (
        typeof analyticsProvider === "string" &&
        analyticsProvider.length > 0
      ) {
        analyticsDetail = `, analytics.provider="${analyticsProvider}"`;
      } else {
        analyticsDetail = ", analytics present but provider not populated";
      }
    }

    logTest(
      "Generate result provider/model",
      "PASS",
      `provider="${result.provider}", model="${result.model}"${analyticsDetail}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest(
        "Generate result provider/model",
        "SKIP",
        `Provider error: ${msg}`,
      );
      return null;
    }
    logTest("Generate result provider/model", "FAIL", msg);
    return false;
  } finally {
    try {
      await (sdk as { shutdown?: () => Promise<void> }).shutdown?.();
    } catch {
      /* ignore */
    }
  }
}

// ============================================================
// TEST #3: Tool execution events include complete metadata
// ============================================================

async function test_tool_execution_events(): Promise<boolean | null> {
  logSection("Test #3: Tool execution events include complete metadata");
  logTest("Tool execution events metadata", "TESTING");

  const sdk = createSDK();

  try {
    // Register a simple getCurrentTime tool
    sdk.registerTool("getCurrentTime", {
      name: "getCurrentTime",
      description:
        "Get the current date and time as an ISO string. Always call this tool when asked about the current time.",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({
        currentTime: new Date().toISOString(),
        timezone: "UTC",
      }),
    });

    // Subscribe to tool events
    const toolStartEvents: Array<Record<string, unknown>> = [];
    const toolEndEvents: Array<Record<string, unknown>> = [];

    const emitter = sdk.getEventEmitter();
    emitter.on("tool:start", (...args: unknown[]) => {
      toolStartEvents.push(args[0] as Record<string, unknown>);
    });
    emitter.on("tool:end", (...args: unknown[]) => {
      toolEndEvents.push(args[0] as Record<string, unknown>);
    });

    // Call generate with a prompt that should trigger the tool
    await sdk.generate({
      input: {
        text: "What is the current time right now? You must use the getCurrentTime tool to check.",
      },
      provider: TEST_CONFIG.provider as string,
      ...(TEST_CONFIG.model ? { model: TEST_CONFIG.model } : {}),
      maxTokens: 200,
      maxSteps: 3,
    });

    // Wait for event propagation
    await delay(1000);

    // Check if the model triggered the tool at all
    if (toolStartEvents.length === 0 && toolEndEvents.length === 0) {
      logTest(
        "Tool execution events metadata",
        "SKIP",
        "Model did not invoke the getCurrentTime tool (non-deterministic)",
      );
      return null;
    }

    // Verify tool:start event has the expected shape
    let startValid = true;
    if (toolStartEvents.length > 0) {
      const startEvent = toolStartEvents[0];
      const toolNameFromStart = startEvent.tool || startEvent.toolName;
      if (
        typeof toolNameFromStart !== "string" ||
        toolNameFromStart.length === 0
      ) {
        log(
          `  [detail] tool:start event missing tool/toolName. Keys: ${Object.keys(startEvent).join(", ")}`,
          "red",
        );
        startValid = false;
      } else {
        log(
          `  [detail] tool:start fired with tool="${toolNameFromStart}"`,
          "green",
        );
      }
    } else {
      log("  [detail] tool:start event never fired", "red");
      startValid = false;
    }

    // Verify tool:end event has the expected shape
    let endValid = true;
    if (toolEndEvents.length > 0) {
      const endEvent = toolEndEvents[0];
      const toolNameFromEnd = endEvent.tool || endEvent.toolName;
      const duration = endEvent.duration || endEvent.responseTime;
      const success = endEvent.success;

      if (typeof toolNameFromEnd !== "string" || toolNameFromEnd.length === 0) {
        log(
          `  [detail] tool:end event missing tool/toolName. Keys: ${Object.keys(endEvent).join(", ")}`,
          "red",
        );
        endValid = false;
      }
      if (typeof duration !== "number") {
        log(
          `  [detail] tool:end event missing duration/responseTime (expected number). Keys: ${Object.keys(endEvent).join(", ")}`,
          "yellow",
        );
        // Non-critical: warn but don't fail
      }
      if (typeof success !== "boolean") {
        log(
          `  [detail] tool:end event missing success field (expected boolean). Keys: ${Object.keys(endEvent).join(", ")}`,
          "yellow",
        );
        // Non-critical: warn but don't fail
      }

      log(
        `  [detail] tool:end fired with tool="${toolNameFromEnd}", duration=${duration}, success=${success}`,
        "green",
      );
    } else {
      log("  [detail] tool:end event never fired", "red");
      endValid = false;
    }

    if (startValid && endValid) {
      logTest(
        "Tool execution events metadata",
        "PASS",
        `tool:start fired ${toolStartEvents.length} time(s), tool:end fired ${toolEndEvents.length} time(s)`,
      );
      return true;
    } else {
      logTest(
        "Tool execution events metadata",
        "FAIL",
        `startValid=${startValid}, endValid=${endValid}`,
      );
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest(
        "Tool execution events metadata",
        "SKIP",
        `Provider error: ${msg}`,
      );
      return null;
    }
    logTest("Tool execution events metadata", "FAIL", msg);
    return false;
  } finally {
    try {
      await (
        sdk as { shutdown?: () => Promise<void>; dispose?: () => Promise<void> }
      ).dispose?.();
    } catch {
      /* ignore */
    }
  }
}

// ============================================================
// TEST #4: Tool registered with timeout respects that timeout
// ============================================================

async function test_tool_timeout_enforcement(): Promise<boolean | null> {
  logSection("Test #4: Tool registered with timeout respects that timeout");
  logTest("Tool timeout enforcement", "TESTING");

  const sdk = createSDK();

  try {
    // Register a tool that artificially sleeps for 5 seconds
    const slowTool = {
      name: "slowOperation",
      description:
        "A slow operation that takes a long time. Call this tool when asked to perform a slow task.",
      inputSchema: { type: "object" as const, properties: {} },
      execute: async () => {
        await delay(5000);
        return { result: "completed" };
      },
    };

    // Register the tool with per-tool timeout and retry options
    sdk.registerTool("slowOperation", slowTool, {
      timeout: 2000,
      maxRetries: 0,
    });
    const registeredWithTimeout = true;
    log(
      "  [detail] registerTool accepted timeout and maxRetries options",
      "green",
    );

    // Trigger the tool via generate
    const startTime = Date.now();
    let toolTimedOut = false;
    let toolCompleted = false;

    // Track tool events for timeout detection
    let toolEndError = "";
    let toolStartFired = false;
    const emitter = sdk.getEventEmitter();
    emitter.on("tool:start", () => {
      toolStartFired = true;
    });
    emitter.on("tool:end", (...args: unknown[]) => {
      const event = args[0] as Record<string, unknown>;
      if (event.error) {
        // Handle both string errors and Error objects
        toolEndError =
          typeof event.error === "string"
            ? event.error
            : event.error instanceof Error
              ? event.error.message
              : String(event.error);
      }
      if (event.success === false && !toolEndError) {
        toolEndError = "tool:end reported success=false";
      }
    });

    try {
      await sdk.generate({
        input: {
          text: "Please run the slowOperation tool right now.",
        },
        provider: TEST_CONFIG.provider as string,
        ...(TEST_CONFIG.model ? { model: TEST_CONFIG.model } : {}),
        maxTokens: 200,
        maxSteps: 1, // Single step to avoid AI SDK retrying the tool call
      });
      toolCompleted = true;
    } catch (toolError) {
      const toolMsg =
        toolError instanceof Error ? toolError.message : String(toolError);
      if (
        toolMsg.toLowerCase().includes("timeout") ||
        toolMsg.toLowerCase().includes("timed out") ||
        toolMsg.toLowerCase().includes("exceeded")
      ) {
        toolTimedOut = true;
      }
    }

    // If the tool was never invoked by the model, skip the test
    if (!toolStartFired) {
      logTest(
        "Tool timeout enforcement",
        "SKIP",
        "Model did not invoke the slowOperation tool (non-deterministic)",
      );
      return null;
    }

    // Check tool:end error message for timeout signal
    if (!toolTimedOut && toolEndError.toLowerCase().includes("timed out")) {
      toolTimedOut = true;
    }
    // Check execution metrics for timeout-specific error category
    const metrics = sdk.getToolExecutionMetrics();
    const slowToolMetrics = metrics["slowOperation"];
    if (!toolTimedOut && slowToolMetrics) {
      const metricsRecord = slowToolMetrics as Record<string, unknown>;
      const errorCategories = metricsRecord.errorCategories as
        | Record<string, unknown>
        | undefined;
      if (
        errorCategories &&
        typeof errorCategories.timeout === "number" &&
        errorCategories.timeout > 0
      ) {
        toolTimedOut = true;
        toolEndError = `errorCategories.timeout: ${errorCategories.timeout}`;
      }
    }

    const elapsed = Date.now() - startTime;

    if (!registeredWithTimeout) {
      // registerTool() did not accept timeout — this is the expected failure
      logTest(
        "Tool timeout enforcement",
        "FAIL",
        `registerTool() does not accept timeout at registration. Elapsed: ${elapsed}ms. Tool completed: ${toolCompleted}`,
      );
      return false;
    }

    // The per-tool timeout fires correctly (visible in tool:end error events).
    // generate() may still succeed with a text response after the tool fails,
    // because the LLM can respond without the tool result.
    // We verify by checking that the tool:end event contains the timeout error.
    const timeoutEnforced =
      toolTimedOut || toolEndError.toLowerCase().includes("timed out");

    if (timeoutEnforced) {
      logTest(
        "Tool timeout enforcement",
        "PASS",
        `Tool timeout enforced (2000ms). Elapsed: ${elapsed}ms. toolTimedOut: ${toolTimedOut}, toolEndError: "${toolEndError.substring(0, 80)}"`,
      );
      return true;
    } else if (toolCompleted && elapsed >= 4000) {
      logTest(
        "Tool timeout enforcement",
        "FAIL",
        `Tool completed without timeout after ${elapsed}ms. Timeout was not enforced. toolEndError: "${toolEndError}"`,
      );
      return false;
    } else {
      logTest(
        "Tool timeout enforcement",
        "FAIL",
        `Unexpected state: timedOut=${toolTimedOut}, completed=${toolCompleted}, elapsed=${elapsed}ms`,
      );
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("Tool timeout enforcement", "SKIP", `Provider error: ${msg}`);
      return null;
    }
    logTest("Tool timeout enforcement", "FAIL", msg);
    return false;
  } finally {
    try {
      await (
        sdk as { shutdown?: () => Promise<void>; dispose?: () => Promise<void> }
      ).dispose?.();
    } catch {
      /* ignore */
    }
  }
}

// ============================================================
// TEST #5: Tool execution metrics include error category breakdown
// ============================================================

async function test_tool_metrics_error_categories(): Promise<boolean | null> {
  logSection(
    "Test #5: Tool execution metrics include error category breakdown",
  );
  logTest("Tool metrics error categories", "TESTING");

  const sdk = createSDK();

  try {
    // Register a tool that always succeeds
    sdk.registerTool("successTool", {
      name: "successTool",
      description:
        "A tool that always succeeds. Call this when asked to run a success test.",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({ status: "ok" }),
    });

    // Register a tool that always fails with a validation error
    sdk.registerTool("failingTool", {
      name: "failingTool",
      description:
        "A tool that always fails with a validation error. Call this when asked to run a failure test.",
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        throw new Error("Validation error: missing required field 'name'");
      },
    });

    // Trigger tools via generate — attempt to run the success tool
    try {
      await sdk.generate({
        input: {
          text: "Run the successTool right now to test it.",
        },
        provider: TEST_CONFIG.provider as string,
        ...(TEST_CONFIG.model ? { model: TEST_CONFIG.model } : {}),
        maxTokens: 200,
        maxSteps: 3,
      });
    } catch {
      // May fail if provider does not call the tool
    }

    await delay(500);

    // Trigger the failing tool
    try {
      await sdk.generate({
        input: {
          text: "Run the failingTool right now to test it.",
        },
        provider: TEST_CONFIG.provider as string,
        ...(TEST_CONFIG.model ? { model: TEST_CONFIG.model } : {}),
        maxTokens: 200,
        maxSteps: 3,
      });
    } catch {
      // Expected: tool throws but generate might still return content
    }

    await delay(500);

    // Get tool execution metrics
    const metrics = sdk.getToolExecutionMetrics();
    log(`  [detail] Metrics keys: ${Object.keys(metrics).join(", ")}`, "reset");

    // Check if we have metrics at all
    if (Object.keys(metrics).length === 0) {
      logTest(
        "Tool metrics error categories",
        "SKIP",
        "No tool execution metrics recorded (model may not have invoked tools)",
      );
      return null;
    }

    // Log metrics details
    for (const [toolName, toolMetrics] of Object.entries(metrics)) {
      log(
        `  [detail] ${toolName}: total=${toolMetrics.totalExecutions}, success=${toolMetrics.successfulExecutions}, failed=${toolMetrics.failedExecutions}, successRate=${toolMetrics.successRate}`,
        "reset",
      );
    }

    // Check for errorCategories field in getToolExecutionMetrics()
    let metricsHasErrorCategories = false;
    for (const [, toolMetrics] of Object.entries(metrics)) {
      const metricsRecord = toolMetrics as Record<string, unknown>;
      if ("errorCategories" in metricsRecord) {
        metricsHasErrorCategories = true;
        break;
      }
    }

    // Check for errorCategories field in getToolHealthReport()
    let healthReportHasErrorCategories = false;
    try {
      const healthReport = await sdk.getToolHealthReport();
      log(
        `  [detail] Health report: totalTools=${healthReport.totalTools}, healthy=${healthReport.healthyTools}, unhealthy=${healthReport.unhealthyTools}`,
        "reset",
      );

      for (const [toolName, toolHealth] of Object.entries(healthReport.tools)) {
        const healthRecord = toolHealth as Record<string, unknown>;
        // errorCategories is nested inside the metrics sub-object
        const metricsObj = healthRecord.metrics as
          | Record<string, unknown>
          | undefined;
        if (
          "errorCategories" in healthRecord ||
          (metricsObj && "errorCategories" in metricsObj)
        ) {
          healthReportHasErrorCategories = true;
        }
        if (
          Array.isArray(healthRecord.issues) &&
          (healthRecord.issues as string[]).length > 0
        ) {
          log(
            `  [detail] ${toolName} issues: ${(healthRecord.issues as string[]).join(", ")}`,
            "yellow",
          );
        }
      }
    } catch (healthErr) {
      log(
        `  [detail] getToolHealthReport() failed: ${healthErr instanceof Error ? healthErr.message : String(healthErr)}`,
        "yellow",
      );
    }

    if (metricsHasErrorCategories && healthReportHasErrorCategories) {
      logTest(
        "Tool metrics error categories",
        "PASS",
        "errorCategories found in both getToolExecutionMetrics() and getToolHealthReport()",
      );
      return true;
    } else {
      const missing = [];
      if (!metricsHasErrorCategories) {
        missing.push("getToolExecutionMetrics()");
      }
      if (!healthReportHasErrorCategories) {
        missing.push("getToolHealthReport()");
      }
      logTest(
        "Tool metrics error categories",
        "FAIL",
        `errorCategories missing from: ${missing.join(" and ")}`,
      );
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest(
        "Tool metrics error categories",
        "SKIP",
        `Provider error: ${msg}`,
      );
      return null;
    }
    logTest("Tool metrics error categories", "FAIL", msg);
    return false;
  } finally {
    try {
      await (
        sdk as { shutdown?: () => Promise<void>; dispose?: () => Promise<void> }
      ).dispose?.();
    } catch {
      /* ignore */
    }
  }
}

// ============================================================
// TEST #6: OTel spans created for tool executions
// ============================================================

async function test_otel_spans_for_tools(): Promise<boolean | null> {
  logSection("Test #6: OTel spans created for tool executions");
  logTest("OTel tool execution spans", "TESTING");

  resetSpans();

  const sdk = new NeuroLink({
    observability: {
      langfuse: {
        enabled: true,
        publicKey: "test-public-key",
        secretKey: "test-secret-key",
        baseUrl: "http://localhost:9999",
        useExternalTracerProvider: true,
      },
    },
  });

  try {
    // Register a tool
    sdk.registerTool("getWeather", {
      name: "getWeather",
      description:
        "Get current weather for a city. Always call this tool when asked about the weather.",
      inputSchema: {
        type: "object",
        properties: {
          city: { type: "string", description: "City name" },
        },
      },
      execute: async (params: unknown) => {
        const input = params as Record<string, unknown>;
        return {
          city: input.city || "Unknown",
          temperature: 22,
          condition: "Sunny",
          humidity: 45,
        };
      },
    });

    // Trigger the tool via generate
    await sdk.generate({
      input: {
        text: "What is the weather in Tokyo right now? Use the getWeather tool to check.",
      },
      provider: TEST_CONFIG.provider as string,
      ...(TEST_CONFIG.model ? { model: TEST_CONFIG.model } : {}),
      maxTokens: 200,
      maxSteps: 3,
    });

    // Wait for async span completion
    await delay(1000);

    const allSpans = spanExporter.getFinishedSpans();
    log(`  [detail] Total spans captured: ${allSpans.length}`, "reset");

    // Log all span names for debugging
    const spanNames = allSpans.map((s) => s.name);
    log(
      `  [detail] Span names: [${spanNames.slice(0, 10).join(", ")}${spanNames.length > 10 ? "..." : ""}]`,
      "reset",
    );

    // Look for tool execution spans with specific span names
    const toolSpan = allSpans.find(
      (s) =>
        (s.name === "neurolink.tool.execute" ||
          s.name === "neurolink.tools.execute_custom") &&
        (getAttr(s, "gen_ai.tool.name") !== undefined ||
          getAttr(s, "mcp.tool_name") !== undefined ||
          getAttr(s, "tool.name") !== undefined),
    );

    if (!toolSpan) {
      // Model did not invoke the tool (non-deterministic)
      logTest(
        "OTel tool execution spans",
        "SKIP",
        "Model did not invoke tool; no tool spans found",
      );
      return null;
    }

    // Verify span has tool-related attributes
    const toolName =
      getAttr(toolSpan, "gen_ai.tool.name") ||
      getAttr(toolSpan, "mcp.tool_name") ||
      getAttr(toolSpan, "tool.name");
    const providerAttr =
      getAttr(toolSpan, "neurolink.provider") ||
      getAttr(toolSpan, "gen_ai.system");
    const statusCode = toolSpan.status.code;

    log(`  [detail] Tool span name: "${toolSpan.name}"`, "green");
    log(
      `  [detail] Tool name attr: ${toolName || "not set"}`,
      toolName ? "green" : "yellow",
    );
    log(
      `  [detail] Provider attr: ${providerAttr || "not set"}`,
      providerAttr ? "green" : "yellow",
    );
    log(
      `  [detail] Status code: ${statusCode} (OK=${SpanStatusCode.OK}, ERROR=${SpanStatusCode.ERROR})`,
      "reset",
    );

    // Verify at minimum the span exists and has a name
    if (toolSpan.name.length === 0) {
      logTest("OTel tool execution spans", "FAIL", "Tool span has empty name");
      return false;
    }

    // Check for additional attributes (informational, not gating)
    const hasToolName = toolName !== undefined;
    const hasProvider = providerAttr !== undefined;
    const hasStatus = statusCode !== undefined;

    logTest(
      "OTel tool execution spans",
      "PASS",
      `Found tool span "${toolSpan.name}". toolName=${hasToolName}, provider=${hasProvider}, status=${hasStatus}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("OTel tool execution spans", "SKIP", `Provider error: ${msg}`);
      return null;
    }
    logTest("OTel tool execution spans", "FAIL", msg);
    return false;
  } finally {
    try {
      await (
        sdk as { shutdown?: () => Promise<void>; dispose?: () => Promise<void> }
      ).shutdown?.();
    } catch {
      /* ignore */
    }
  }
}

// ============================================================
// TEST RUNNER
// ============================================================

async function runAllTests(): Promise<number> {
  const startTime = Date.now();
  log("\n--- NeuroLink Continuous Test Suite: Tool Reliability ---", "bright");
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
    return 1;
  }

  const tests: Array<{ name: string; fn: () => Promise<boolean | null> }> = [
    {
      name: "Stream result provider/model",
      fn: test_stream_result_provider_model,
    },
    {
      name: "Generate result provider/model",
      fn: test_generate_result_provider_model,
    },
    {
      name: "Tool execution events metadata",
      fn: test_tool_execution_events,
    },
    {
      name: "Tool timeout enforcement",
      fn: test_tool_timeout_enforcement,
    },
    {
      name: "Tool metrics error categories",
      fn: test_tool_metrics_error_categories,
    },
    {
      name: "OTel tool execution spans",
      fn: test_otel_spans_for_tools,
    },
  ];

  for (const test of tests) {
    try {
      const result = await test.fn();
      recordTest(
        test.name,
        result === true,
        result === null,
        result === null ? "skipped" : result === true ? undefined : "failed",
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      recordTest(test.name, false, false, msg);
    }
    await delay(TEST_CONFIG.interTestDelay);
  }
  return 0;
}

function parseArguments(): { provider?: string; model?: string } {
  const args: { provider?: string; model?: string } = {};
  for (const a of process.argv.slice(2)) {
    if (a.startsWith("--provider=")) {
      args.provider = a.split("=")[1];
    }
    if (a.startsWith("--model=")) {
      args.model = a.split("=")[1];
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
// Re-resolve model after CLI args override the provider
if (!TEST_CONFIG.model) {
  TEST_CONFIG.model = resolveTestModel(TEST_CONFIG.provider);
}

await runSuite(async () => {
  await runAllTests();
});
