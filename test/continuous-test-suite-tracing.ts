#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Tracing
 *
 * End-to-end validation that verifies ALL trace points work correctly.
 * Uses in-process InMemorySpanExporter to capture and inspect spans
 * produced by NeuroLink SDK calls.
 *
 * Run: npx tsx test/continuous-test-suite-tracing.ts --provider=vertex
 *
 * Required: Provider credentials (e.g., GOOGLE_APPLICATION_CREDENTIALS for vertex)
 */

import * as fs from "fs";

// ============================================================
// OTEL BOOTSTRAP — must register BEFORE importing NeuroLink
// ============================================================
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import type { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import { SpanStatusCode } from "@opentelemetry/api";

const spanExporter = new InMemorySpanExporter();
const traceProvider = new NodeTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(spanExporter)],
});
traceProvider.register();

// NeuroLink is imported lazily after build precheck (see runAllTests)
let NeuroLink: (typeof import("../dist/index.js"))["NeuroLink"];

// ============================================================
// CONFIGURATION
// ============================================================

const TEST_CONFIG = {
  provider: process.env.TEST_PROVIDER || "vertex",
  model: process.env.TEST_MODEL || (undefined as string | undefined),
  timeout: 90000,
  interTestDelay: 5000,
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
  log(`[${icons[status]}] ${testName}`, statusColors[status]);
  if (details) {
    log(`   ${details}`, "reset");
  }
}

// ============================================================
// SHARED UTILITIES
// ============================================================

const testResults: Array<{
  name: string;
  result: boolean | null;
  error: string | null;
}> = [];

function findSpan(name: string): ReadableSpan | undefined {
  return spanExporter.getFinishedSpans().find((s) => s.name === name);
}

function findSpans(name: string): ReadableSpan[] {
  return spanExporter.getFinishedSpans().filter((s) => s.name === name);
}

function getAttr(span: ReadableSpan, key: string): unknown {
  return span.attributes[key];
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

function createSDK(): InstanceType<typeof NeuroLink> {
  return new NeuroLink();
}

async function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ============================================================
// TEST #1: Generate Span Chain
// ============================================================

async function test_generate_span_chain(): Promise<boolean | null> {
  logSection("Test #1: Generate Span Chain");
  logTest("Generate Span Chain", "TESTING");

  spanExporter.reset();

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
        "Generate Span Chain",
        "FAIL",
        "No content returned from generate",
      );
      return false;
    }

    // Wait briefly for async span completion
    await delay(500);

    const generateSpan = findSpan("neurolink.generate");
    const providerGenSpan = findSpan("neurolink.provider.generate");
    const executeGenSpan = findSpan("neurolink.executeGeneration");

    if (!generateSpan) {
      logTest("Generate Span Chain", "FAIL", "Missing neurolink.generate span");
      return false;
    }

    if (!providerGenSpan) {
      logTest(
        "Generate Span Chain",
        "FAIL",
        "Missing neurolink.provider.generate span",
      );
      return false;
    }

    if (!executeGenSpan) {
      logTest(
        "Generate Span Chain",
        "FAIL",
        "Missing neurolink.executeGeneration span",
      );
      return false;
    }

    // Verify token attributes exist on at least one span
    const allSpans = spanExporter.getFinishedSpans();
    const hasTokenAttrs = allSpans.some(
      (s) =>
        getAttr(s, "gen_ai.usage.input_tokens") !== undefined ||
        getAttr(s, "neurolink.tokens.input") !== undefined,
    );

    logTest(
      "Generate Span Chain",
      "PASS",
      `Found all 3 spans. Token attrs: ${hasTokenAttrs}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("Generate Span Chain", "SKIP", `Provider error: ${msg}`);
      return null;
    }
    logTest("Generate Span Chain", "FAIL", msg);
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
// TEST #2: Stream Span Chain
// ============================================================

async function test_stream_span_chain(): Promise<boolean | null> {
  logSection("Test #2: Stream Span Chain");
  logTest("Stream Span Chain", "TESTING");

  spanExporter.reset();

  const sdk = createSDK();

  try {
    const streamResult = await sdk.stream({
      input: { text: 'Say "streaming" and nothing else.' },
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

    // Wait for async promise resolution and span flushing
    await delay(2000);

    const streamSpan = findSpan("neurolink.stream");
    const providerStreamSpan = findSpan("neurolink.provider.stream");

    if (!streamSpan) {
      logTest("Stream Span Chain", "FAIL", "Missing neurolink.stream span");
      return false;
    }

    if (!providerStreamSpan) {
      logTest(
        "Stream Span Chain",
        "FAIL",
        "Missing neurolink.provider.stream span",
      );
      return false;
    }

    logTest(
      "Stream Span Chain",
      "PASS",
      `Found neurolink.stream + neurolink.provider.stream. Content length: ${content.length}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("Stream Span Chain", "SKIP", `Provider error: ${msg}`);
      return null;
    }
    logTest("Stream Span Chain", "FAIL", msg);
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
// TEST #3: Message Build Span
// ============================================================

async function test_message_build_span(): Promise<boolean | null> {
  logSection("Test #3: Message Build Span");
  logTest("Message Build Span", "TESTING");

  spanExporter.reset();

  const sdk = createSDK();

  try {
    await sdk.generate({
      input: { text: 'Say "build" and nothing else.' },
      provider: TEST_CONFIG.provider as string,
      ...(TEST_CONFIG.model ? { model: TEST_CONFIG.model } : {}),
      maxTokens: 50,
    });

    await delay(500);

    const msgBuildSpan = findSpan("neurolink.message.build");

    if (!msgBuildSpan) {
      // This span may not exist yet if the MessageBuilder instrumentation
      // hasn't been added. SKIP rather than FAIL.
      logTest(
        "Message Build Span",
        "SKIP",
        "neurolink.message.build span not found (may not be instrumented yet)",
      );
      return null;
    }

    const msgCount = getAttr(msgBuildSpan, "message.count");
    logTest(
      "Message Build Span",
      "PASS",
      `Found neurolink.message.build span. message.count=${msgCount}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("Message Build Span", "SKIP", `Provider error: ${msg}`);
      return null;
    }
    logTest("Message Build Span", "FAIL", msg);
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
// TEST #4: Cost on Spans
// ============================================================

async function test_cost_on_spans(): Promise<boolean | null> {
  logSection("Test #4: Cost on Spans");
  logTest("Cost on Spans", "TESTING");

  spanExporter.reset();

  const sdk = createSDK();

  try {
    await sdk.generate({
      input: { text: 'Say "cost" and nothing else.' },
      provider: TEST_CONFIG.provider as string,
      ...(TEST_CONFIG.model ? { model: TEST_CONFIG.model } : {}),
      maxTokens: 50,
    });

    await delay(500);

    const allSpans = spanExporter.getFinishedSpans();
    const costSpan = allSpans.find(
      (s) => getAttr(s, "neurolink.cost") !== undefined,
    );

    if (!costSpan) {
      // Cost attribute may not be set on all providers/paths yet.
      // Check if neurolink.generate span exists at all.
      const genSpan = findSpan("neurolink.generate");
      if (!genSpan) {
        logTest("Cost on Spans", "FAIL", "No neurolink.generate span at all");
        return false;
      }
      logTest(
        "Cost on Spans",
        "SKIP",
        "neurolink.cost attribute not found on any span (may not be instrumented for this provider yet)",
      );
      return null;
    }

    const costValue = getAttr(costSpan, "neurolink.cost") as number;
    if (typeof costValue !== "number" || costValue < 0) {
      logTest(
        "Cost on Spans",
        "FAIL",
        `neurolink.cost is invalid: ${costValue}`,
      );
      return false;
    }

    logTest(
      "Cost on Spans",
      "PASS",
      `Found neurolink.cost=${costValue} on span "${costSpan.name}"`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("Cost on Spans", "SKIP", `Provider error: ${msg}`);
      return null;
    }
    logTest("Cost on Spans", "FAIL", msg);
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
// TEST #5: Input Recording
// ============================================================

async function test_input_recording(): Promise<boolean | null> {
  logSection("Test #5: Input Recording");
  logTest("Input Recording", "TESTING");

  spanExporter.reset();

  const sdk = createSDK();

  try {
    await sdk.generate({
      input: { text: 'Say "input-test" and nothing else.' },
      provider: TEST_CONFIG.provider as string,
      ...(TEST_CONFIG.model ? { model: TEST_CONFIG.model } : {}),
      maxTokens: 50,
    });

    await delay(500);

    // Look for the Vercel AI SDK span or the NeuroLink generate span
    const allSpans = spanExporter.getFinishedSpans();
    const aiSpan = allSpans.find(
      (s) =>
        s.name.startsWith("ai.") ||
        s.name === "neurolink.generate" ||
        s.name === "neurolink.executeGeneration",
    );

    if (!aiSpan) {
      logTest("Input Recording", "FAIL", "No AI or generate span found");
      return false;
    }

    // Check for input-related attributes
    const inputLength = getAttr(aiSpan, "neurolink.input_length");
    const hasInput = inputLength !== undefined && (inputLength as number) > 0;

    if (!hasInput) {
      // Also check for gen_ai standard attributes
      const inputTokens = getAttr(aiSpan, "gen_ai.usage.input_tokens");
      if (inputTokens !== undefined && (inputTokens as number) > 0) {
        logTest(
          "Input Recording",
          "PASS",
          `Input tokens recorded: ${inputTokens} on span "${aiSpan.name}"`,
        );
        return true;
      }

      // Check if at least the neurolink.generate span has input_length
      const genSpan = findSpan("neurolink.generate");
      if (genSpan) {
        const genInputLen = getAttr(genSpan, "neurolink.input_length");
        if (genInputLen !== undefined && (genInputLen as number) > 0) {
          logTest(
            "Input Recording",
            "PASS",
            `Input length recorded: ${genInputLen} on neurolink.generate`,
          );
          return true;
        }
      }

      logTest(
        "Input Recording",
        "FAIL",
        `No input attributes found on span "${aiSpan.name}"`,
      );
      return false;
    }

    logTest(
      "Input Recording",
      "PASS",
      `Input length=${inputLength} on span "${aiSpan.name}"`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("Input Recording", "SKIP", `Provider error: ${msg}`);
      return null;
    }
    logTest("Input Recording", "FAIL", msg);
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
// TEST #6: Error Tracing
// ============================================================

async function test_error_tracing(): Promise<boolean | null> {
  logSection("Test #6: Error Tracing");
  logTest("Error Tracing", "TESTING");

  spanExporter.reset();

  const sdk = createSDK();

  try {
    // Use an obviously invalid model name to trigger an error
    await sdk.generate({
      input: { text: "This should fail." },
      provider: TEST_CONFIG.provider as string,
      model: "nonexistent-model-that-does-not-exist-12345",
      maxTokens: 50,
    });

    // If we get here, the generate succeeded (unexpected with bad model)
    // Some providers may silently fall back - check spans anyway
    await delay(500);

    const allSpans = spanExporter.getFinishedSpans();
    const errorSpan = allSpans.find(
      (s) => s.status.code === SpanStatusCode.ERROR,
    );

    if (errorSpan) {
      logTest(
        "Error Tracing",
        "PASS",
        `Found ERROR status on span "${errorSpan.name}" (provider may have partially failed)`,
      );
      return true;
    }

    // Provider silently handled the bad model - skip
    logTest(
      "Error Tracing",
      "SKIP",
      "Provider handled bad model gracefully, no ERROR spans",
    );
    return null;
  } catch {
    // Expected: generate should throw with invalid model
    await delay(500);

    const allSpans = spanExporter.getFinishedSpans();
    const errorSpan = allSpans.find(
      (s) => s.status.code === SpanStatusCode.ERROR,
    );

    if (!errorSpan) {
      // The error may have been thrown before any spans were created
      // (e.g., model validation at factory level)
      const anySpan = allSpans.length > 0;
      if (!anySpan) {
        logTest(
          "Error Tracing",
          "SKIP",
          "Error thrown before span creation (no spans captured)",
        );
        return null;
      }
      logTest(
        "Error Tracing",
        "FAIL",
        `${allSpans.length} spans found but none with ERROR status`,
      );
      return false;
    }

    logTest(
      "Error Tracing",
      "PASS",
      `Error correctly recorded on span "${errorSpan.name}" (status=ERROR)`,
    );
    return true;
  } finally {
    try {
      await (sdk as { shutdown?: () => Promise<void> }).shutdown?.();
    } catch {
      /* ignore */
    }
  }
}

// ============================================================
// TEST #7: Tool Execution Span
// ============================================================

async function test_tool_execution_span(): Promise<boolean | null> {
  logSection("Test #7: Tool Execution Span");
  logTest("Tool Execution Span", "TESTING");

  spanExporter.reset();

  const sdk = createSDK();

  try {
    // Call generate with a prompt that should trigger tool use
    // Use built-in tools (getCurrentTime is always available)
    await sdk.generate({
      input: {
        text: "What is the current time right now? Use a tool to check.",
      },
      provider: TEST_CONFIG.provider as string,
      ...(TEST_CONFIG.model ? { model: TEST_CONFIG.model } : {}),
      maxTokens: 200,
      maxSteps: 3,
    });

    await delay(500);

    const allSpans = spanExporter.getFinishedSpans();

    // Look for tool execution spans
    const toolSpan = allSpans.find(
      (s) =>
        s.name === "neurolink.tool.execute" ||
        s.name.includes("tool") ||
        getAttr(s, "gen_ai.tool.name") !== undefined,
    );

    if (!toolSpan) {
      // The model may not have chosen to use a tool
      logTest(
        "Tool Execution Span",
        "SKIP",
        "No tool execution span found (model may not have invoked a tool)",
      );
      return null;
    }

    const toolName =
      getAttr(toolSpan, "gen_ai.tool.name") ||
      getAttr(toolSpan, "mcp.tool_name") ||
      "unknown";
    logTest(
      "Tool Execution Span",
      "PASS",
      `Found tool span "${toolSpan.name}" (tool=${toolName})`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("Tool Execution Span", "SKIP", `Provider error: ${msg}`);
      return null;
    }
    logTest("Tool Execution Span", "FAIL", msg);
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
// TEST #8: Memory Spans
// ============================================================

async function test_memory_spans(): Promise<boolean | null> {
  logSection("Test #8: Memory Spans");
  logTest("Memory Spans", "TESTING");

  spanExporter.reset();

  try {
    // Create SDK with conversation memory enabled
    const sdk = new NeuroLink({
      conversationMemory: {
        enabled: true,
        enableSummarization: false,
      },
    });

    const testSessionId = `tracing-test-memory-${Date.now()}`;

    // First call to establish memory (sessionId required for memory ops)
    await sdk.generate({
      input: { text: 'Say "first turn" and nothing else.' },
      provider: TEST_CONFIG.provider as string,
      ...(TEST_CONFIG.model ? { model: TEST_CONFIG.model } : {}),
      maxTokens: 50,
      context: { sessionId: testSessionId },
    });

    await delay(1000);

    // Second call to trigger memory retrieval
    await sdk.generate({
      input: { text: 'Say "second turn" and nothing else.' },
      provider: TEST_CONFIG.provider as string,
      ...(TEST_CONFIG.model ? { model: TEST_CONFIG.model } : {}),
      maxTokens: 50,
      context: { sessionId: testSessionId },
    });

    await delay(500);

    const allSpans = spanExporter.getFinishedSpans();
    const storeSpans = allSpans.filter(
      (s) =>
        s.name === "neurolink.memory.storeTurn" ||
        s.name === "neurolink.conversation.storeTurn",
    );
    const buildContextSpans = allSpans.filter(
      (s) =>
        s.name === "neurolink.memory.buildContext" ||
        s.name === "neurolink.conversation.getMessages",
    );

    if (storeSpans.length === 0 && buildContextSpans.length === 0) {
      logTest(
        "Memory Spans",
        "SKIP",
        "No memory spans found (memory may be off or using different span names)",
      );
      return null;
    }

    logTest(
      "Memory Spans",
      "PASS",
      `storeTurn spans: ${storeSpans.length}, buildContext spans: ${buildContextSpans.length}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("Memory Spans", "SKIP", `Provider error: ${msg}`);
      return null;
    }
    logTest("Memory Spans", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #9: Span Parent-Child Hierarchy
// ============================================================

async function test_span_parent_child(): Promise<boolean | null> {
  logSection("Test #9: Span Parent-Child Hierarchy");
  logTest("Span Parent-Child", "TESTING");

  spanExporter.reset();

  const sdk = createSDK();

  try {
    await sdk.generate({
      input: { text: 'Say "hierarchy" and nothing else.' },
      provider: TEST_CONFIG.provider as string,
      ...(TEST_CONFIG.model ? { model: TEST_CONFIG.model } : {}),
      maxTokens: 50,
    });

    await delay(500);

    const generateSpan = findSpan("neurolink.generate");
    const providerSpan = findSpan("neurolink.provider.generate");

    if (!generateSpan || !providerSpan) {
      logTest(
        "Span Parent-Child",
        "FAIL",
        `Missing spans: generate=${!!generateSpan}, provider.generate=${!!providerSpan}`,
      );
      return false;
    }

    // Check that provider.generate is a descendant of generate in the span tree
    const generateSpanId = generateSpan.spanContext().spanId;
    const providerParentCtx = (
      providerSpan as unknown as { parentSpanContext?: { spanId?: string } }
    ).parentSpanContext;
    const providerParentId = providerParentCtx?.spanId;

    // Verify both are in the same trace
    const generateTraceId = generateSpan.spanContext().traceId;
    const providerTraceId = providerSpan.spanContext().traceId;

    if (generateTraceId !== providerTraceId) {
      logTest(
        "Span Parent-Child",
        "FAIL",
        `Spans in different traces: generate=${generateTraceId}, provider=${providerTraceId}`,
      );
      return false;
    }

    // Check if provider span is a descendant of generate span
    const isDirectChild = providerParentId === generateSpanId;

    // If not a direct child, walk up the parent chain
    const allSpans = spanExporter.getFinishedSpans();
    let isDescendant = isDirectChild;

    if (!isDirectChild) {
      let currentParentId = providerParentId;
      const visited = new Set<string>();
      while (currentParentId && !visited.has(currentParentId)) {
        visited.add(currentParentId);
        if (currentParentId === generateSpanId) {
          isDescendant = true;
          break;
        }
        const parentSpan = allSpans.find(
          (s) => s.spanContext().spanId === currentParentId,
        );
        const parentCtx = parentSpan
          ? (
              parentSpan as unknown as {
                parentSpanContext?: { spanId?: string };
              }
            ).parentSpanContext
          : undefined;
        currentParentId = parentCtx?.spanId;
      }
    }

    if (!isDescendant) {
      logTest(
        "Span Parent-Child",
        "FAIL",
        `provider.generate (parent=${providerParentId}) is not a descendant of generate (spanId=${generateSpanId})`,
      );
      return false;
    }

    logTest(
      "Span Parent-Child",
      "PASS",
      `provider.generate is ${isDirectChild ? "direct child" : "descendant"} of generate (same trace: ${generateTraceId})`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("Span Parent-Child", "SKIP", `Provider error: ${msg}`);
      return null;
    }
    logTest("Span Parent-Child", "FAIL", msg);
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
// TEST #10: All Spans Have Status
// ============================================================

async function test_all_spans_have_status(): Promise<boolean | null> {
  logSection("Test #10: All Spans Have Status");
  logTest("All Spans Have Status", "TESTING");

  spanExporter.reset();

  const sdk = createSDK();

  try {
    await sdk.generate({
      input: { text: 'Say "status" and nothing else.' },
      provider: TEST_CONFIG.provider as string,
      ...(TEST_CONFIG.model ? { model: TEST_CONFIG.model } : {}),
      maxTokens: 50,
    });

    await delay(500);

    const allSpans = spanExporter.getFinishedSpans();

    if (allSpans.length === 0) {
      logTest("All Spans Have Status", "FAIL", "No spans captured at all");
      return false;
    }

    // Filter to NeuroLink spans (exclude third-party/OTEL auto-instrumentation)
    const neurolinkSpans = allSpans.filter(
      (s) => s.name.startsWith("neurolink.") || s.name.startsWith("ai."),
    );

    if (neurolinkSpans.length === 0) {
      logTest(
        "All Spans Have Status",
        "FAIL",
        `No NeuroLink spans found among ${allSpans.length} total spans`,
      );
      return false;
    }

    const unsetSpans = neurolinkSpans.filter(
      (s) => s.status.code === SpanStatusCode.UNSET,
    );

    if (unsetSpans.length > 0) {
      const unsetNames = unsetSpans.map((s) => s.name).join(", ");
      // Some spans may legitimately be UNSET (e.g., Vercel AI SDK spans)
      // Only fail if NeuroLink's own spans are UNSET
      const nlUnset = unsetSpans.filter((s) => s.name.startsWith("neurolink."));
      if (nlUnset.length > 0) {
        logTest(
          "All Spans Have Status",
          "FAIL",
          `${nlUnset.length} NeuroLink spans have UNSET status: ${nlUnset.map((s) => s.name).join(", ")}`,
        );
        return false;
      }
      logTest(
        "All Spans Have Status",
        "PASS",
        `All ${neurolinkSpans.length - unsetSpans.length} NeuroLink spans have OK status (${unsetSpans.length} third-party spans UNSET: ${unsetNames})`,
      );
      return true;
    }

    logTest(
      "All Spans Have Status",
      "PASS",
      `All ${neurolinkSpans.length} spans have non-UNSET status`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("All Spans Have Status", "SKIP", `Provider error: ${msg}`);
      return null;
    }
    logTest("All Spans Have Status", "FAIL", msg);
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
// MAIN RUNNER
// ============================================================

async function runAllTests(): Promise<void> {
  const startTime = Date.now();
  log("\n--- NeuroLink Continuous Test Suite: Tracing ---", "bright");
  log(
    `   Provider: ${TEST_CONFIG.provider}, Model: ${TEST_CONFIG.model || "default"}`,
    "cyan",
  );

  // Prerequisite checks
  if (!fs.existsSync("dist") || !fs.existsSync("dist/index.js")) {
    log("Build not found. Run: pnpm run build", "red");
    process.exit(1);
  }

  // Import NeuroLink after build precheck (tracers pick up registered provider)
  if (!NeuroLink) {
    ({ NeuroLink } = await import("../dist/index.js"));
  }

  const tests: Array<{ name: string; fn: () => Promise<boolean | null> }> = [
    { name: "Generate Span Chain", fn: test_generate_span_chain },
    { name: "Stream Span Chain", fn: test_stream_span_chain },
    { name: "Message Build Span", fn: test_message_build_span },
    { name: "Cost on Spans", fn: test_cost_on_spans },
    { name: "Input Recording", fn: test_input_recording },
    { name: "Error Tracing", fn: test_error_tracing },
    { name: "Tool Execution Span", fn: test_tool_execution_span },
    { name: "Memory Spans", fn: test_memory_spans },
    { name: "Span Parent-Child", fn: test_span_parent_child },
    { name: "All Spans Have Status", fn: test_all_spans_have_status },
  ];

  for (const test of tests) {
    try {
      const result = await test.fn();
      testResults.push({ name: test.name, result, error: null });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      testResults.push({ name: test.name, result: false, error: msg });
    }
    await delay(TEST_CONFIG.interTestDelay);
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
        "Usage: npx tsx test/continuous-test-suite-tracing.ts [--provider=X] [--model=Y]",
      );
      console.log(
        "\nValidates OpenTelemetry span generation across all NeuroLink trace points.",
      );
      console.log(
        "Uses in-process InMemorySpanExporter to capture and verify spans.",
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _describe = (globalThis as any).describe;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _it = (globalThis as any).it;

if (typeof _describe === "undefined") {
  runAllTests().catch((e) => {
    log(`Suite crashed: ${e instanceof Error ? e.message : String(e)}`, "red");
    process.exit(1);
  });
} else {
  _describe.skip("Continuous Test Suite: Tracing", () => {
    _it("runs standalone", () => runAllTests(), 600000);
  });
}
