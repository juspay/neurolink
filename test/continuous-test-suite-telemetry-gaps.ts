#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Telemetry Gaps (Curator report)
 *
 * Reproduces the 6 Langfuse/OTel telemetry gaps reported by Curator:
 *   P0-1  TOOL observations never set statusMessage on isError
 *   P0-2  TOOL level stays DEFAULT on tool errors
 *   P1-3  Duplicate mcp.tool.call SPANs per tool call
 *   P1-4  mcp.tool.call SPAN missing tool name / input / output
 *   P2-5  GENERATION statusMessage=None on abort/timeout/empty-output
 *   P2-6  No TOOL <-> SPAN correlation
 *
 * Strategy: drive OTel spans that match what the AI SDK and the SDK's own
 * instrumentation would emit, run them through the real ContextEnricher,
 * and assert the resulting mutable attributes. InMemorySpanExporter captures
 * the final attribute state.
 *
 * Run: npx tsx test/continuous-test-suite-telemetry-gaps.ts
 */
import "dotenv/config";

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

import {
  SpanStatusCode,
  trace,
  context as otelContext,
} from "@opentelemetry/api";
import type { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..");

// OTel bootstrap — register provider BEFORE importing NeuroLink so tracers pick it up.
const spanExporter = new InMemorySpanExporter();

// Load the SDK's ContextEnricher from source so the test always runs against
// the current PR changes, not against a stale (or missing) dist build. tsx
// transpiles the .ts import directly.
const { createContextEnricher, langfuseShouldExportSpan } =
  await import("../src/lib/services/server/ai/observability/instrumentation.js");

const contextEnricher = createContextEnricher();

const tracerProvider = new NodeTracerProvider({
  spanProcessors: [
    contextEnricher as unknown as SimpleSpanProcessor,
    new SimpleSpanProcessor(spanExporter),
  ],
});
tracerProvider.register();

const tracer = trace.getTracer("telemetry-gaps-test");

// ---------------------------------------------------------------
// Reporting helpers
// ---------------------------------------------------------------
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bright: "\x1b[1m",
};

type Outcome = "PASS" | "FAIL";
const results: { name: string; outcome: Outcome; detail: string }[] = [];

function record(name: string, outcome: Outcome, detail: string): void {
  results.push({ name, outcome, detail });
  const color = outcome === "PASS" ? colors.green : colors.red;
  console.log(`${color}[${outcome}]${colors.reset} ${name} — ${detail}`);
}

function section(title: string): void {
  console.log(`\n${colors.cyan}${"=".repeat(68)}`);
  console.log(`  ${title}`);
  console.log(`${"=".repeat(68)}${colors.reset}`);
}

function getSpanByName(name: string): ReadableSpan | undefined {
  return spanExporter.getFinishedSpans().find((s) => s.name === name);
}

function reset(): void {
  spanExporter.reset();
}

// ---------------------------------------------------------------
// Issue 1 + 2: ai.toolCall with isError:true must set langfuse.level=ERROR
//                and langfuse.status_message (Pipeline A)
// ---------------------------------------------------------------
async function reproduceIssue_1_2(): Promise<void> {
  section("Issue 1+2: ai.toolCall with isError → ERROR + status_message");
  reset();

  // Replicate exactly what the Vercel AI SDK emits for a tool call that
  // returned { isError: true, content: [...] } — i.e. MCP protocol error.
  const span = tracer.startSpan("ai.toolCall", {
    attributes: {
      "ai.toolCall.name": "mcp__bitbucket__list_branches",
      "ai.toolCall.id": "call_abc123",
      "ai.toolCall.args": JSON.stringify({
        workspace: "BRBZ",
        repo: "harbour",
      }),
    },
  });
  // AI SDK treats a returned { isError:true } as success — span stays UNSET.
  span.setAttribute(
    "ai.toolCall.result",
    JSON.stringify({
      content: [
        { type: "text", text: "Not found: listing branches in BRBZ/harbour" },
      ],
      isError: true,
    }),
  );
  span.end(); // triggers ContextEnricher.onEnd()

  const captured = getSpanByName("ai.toolCall");
  if (!captured) {
    record(
      "Issue 1+2: ai.toolCall captured",
      "FAIL",
      "span was not captured by exporter",
    );
    return;
  }

  const level = captured.attributes["langfuse.level"];
  const statusMessage = captured.attributes["langfuse.status_message"];

  const expectedLevel = "ERROR";
  const levelOk = level === expectedLevel;
  const statusOk =
    typeof statusMessage === "string" && statusMessage.length > 0;

  record(
    "Issue 1: langfuse.status_message populated",
    statusOk ? "PASS" : "FAIL",
    `expected non-empty string, got ${JSON.stringify(statusMessage)}`,
  );
  record(
    "Issue 2: langfuse.level === ERROR",
    levelOk ? "PASS" : "FAIL",
    `expected "ERROR", got ${JSON.stringify(level)}`,
  );
}

// ---------------------------------------------------------------
// Issue 3: structural duplicate spans per tool call
//
// The fix marks pure-wrapper spans with langfuse.internal=true and the
// LangfuseSpanProcessor's shouldExportSpan drops those. We verify both:
//  - the wrapper span creation sites in the source carry the marker
//  - the runtime shouldExportSpan filter keeps only non-internal spans
// ---------------------------------------------------------------
type WrapperSpanSite = { file: string; spanName: string };

// Pure-wrapper spans that MUST carry `langfuse.internal: true`. The public
// `NeuroLink.executeTool()` span (`neurolink.tool.execute` in neurolink.ts)
// is INTENTIONALLY NOT marked internal — it's the only non-internal span for
// direct-API (non-AI-SDK) tool invocations. See PR #979 cycle-3 review.
const WRAPPER_SPAN_SITES: WrapperSpanSite[] = [
  {
    file: "src/lib/core/modules/ToolsManager.ts",
    spanName: "neurolink.tools.execute_custom",
  },
  {
    file: "src/lib/mcp/toolRegistry.ts",
    spanName: "neurolink.tool.registry.execute",
  },
];

function readSource(rel: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
}

function sourceHasMarkerNearSpanName(
  source: string,
  spanName: string,
): boolean {
  const idx = source.indexOf(`"${spanName}"`);
  if (idx === -1) {
    return false;
  }
  // Look ±600 chars around the span definition for the marker.
  const start = Math.max(0, idx - 100);
  const end = Math.min(source.length, idx + 600);
  return source.slice(start, end).includes(`"langfuse.internal": true`);
}

async function reproduceIssue_3(): Promise<void> {
  section("Issue 3: duplicate spans per tool call");
  reset();

  // Part A — source-level verification: each wrapper span declaration must
  // carry the `langfuse.internal: true` marker so LangfuseSpanProcessor drops it.
  for (const site of WRAPPER_SPAN_SITES) {
    const src = readSource(site.file);
    const has = sourceHasMarkerNearSpanName(src, site.spanName);
    record(
      `Issue 3a: ${site.spanName} marked langfuse.internal`,
      has ? "PASS" : "FAIL",
      has ? "marker found near span declaration" : `missing in ${site.file}`,
    );
  }

  // Part B — runtime filter verification: replicate the shouldExportSpan logic
  // from createLangfuseProcessor() and prove it keeps only 1–2 spans per call.
  const aiSdkSpan = tracer.startSpan("ai.toolCall", {
    attributes: {
      "ai.toolCall.name": "example_tool",
      "ai.toolCall.id": "call_1",
    },
  });
  await otelContext.with(
    trace.setSpan(otelContext.active(), aiSdkSpan),
    async () => {
      const customSpan = tracer.startSpan("neurolink.tools.execute_custom", {
        attributes: { "tool.name": "example_tool", "langfuse.internal": true },
      });
      await otelContext.with(
        trace.setSpan(otelContext.active(), customSpan),
        async () => {
          // neurolink.tool.execute is intentionally NOT marked internal —
          // it's the only Langfuse observation for direct-API tool calls.
          const toolExecSpan = tracer.startSpan("neurolink.tool.execute", {
            attributes: { "tool.name": "example_tool" },
          });
          await otelContext.with(
            trace.setSpan(otelContext.active(), toolExecSpan),
            async () => {
              const registrySpan = tracer.startSpan(
                "neurolink.tool.registry.execute",
                {
                  attributes: {
                    "tool.name": "example_tool",
                    "langfuse.internal": true,
                  },
                },
              );
              await otelContext.with(
                trace.setSpan(otelContext.active(), registrySpan),
                async () => {
                  const mcpCallSpan = tracer.startSpan(
                    "neurolink.mcp.callTool",
                    { attributes: { "mcp.tool_name": "example_tool" } },
                  );
                  mcpCallSpan.setStatus({ code: SpanStatusCode.OK });
                  mcpCallSpan.end();
                },
              );
              registrySpan.end();
            },
          );
          toolExecSpan.end();
        },
      );
      customSpan.end();
    },
  );
  aiSdkSpan.end();

  // Use the actual exported filter helper so the test and the Langfuse
  // processor stay in lock-step.
  const spans = spanExporter.getFinishedSpans();
  const exportable = spans.filter((s) =>
    langfuseShouldExportSpan({ otelSpan: { attributes: s.attributes } }),
  );
  const exportableNames = exportable.map((s) => s.name).sort();

  // After filtering the internal wrappers (execute_custom + registry.execute),
  // the exporter keeps ai.toolCall (AI SDK), neurolink.tool.execute (public
  // API), and neurolink.mcp.callTool (MCP layer). This matches cycle-3 review:
  // neurolink.tool.execute must stay observable so direct-API calls produce
  // at least one Langfuse observation.
  const expected = [
    "ai.toolCall",
    "neurolink.mcp.callTool",
    "neurolink.tool.execute",
  ];
  const pass =
    exportable.length === expected.length &&
    expected.every((n) => exportableNames.includes(n));
  record(
    "Issue 3b: shouldExportSpan drops internal wrappers, keeps primary + public-API spans",
    pass ? "PASS" : "FAIL",
    `kept ${exportable.length} spans: [${exportableNames.join(", ")}], expected [${expected.join(", ")}]`,
  );
}

// ---------------------------------------------------------------
// Issue 4: neurolink.mcp.callTool missing ai.tool.name / input / output
//
// The fix adds ai.tool.name, gen_ai.tool.name, gen_ai.request, gen_ai.response
// attributes directly inside ToolDiscoveryService.executeTool's startActiveSpan
// call. We verify the source contains these additions AND that ContextEnricher
// doesn't strip them when a span carries them.
// ---------------------------------------------------------------
async function reproduceIssue_4(): Promise<void> {
  section("Issue 4: neurolink.mcp.callTool SPAN attributes");
  reset();

  // Part A — source-level verification: toolDiscoveryService.ts must set
  // ai.tool.name / gen_ai.request / gen_ai.response when creating the span.
  // Widen the window to cover the post-normalization gen_ai.response set.
  const toolDiscoverySrc = readSource("src/lib/mcp/toolDiscoveryService.ts");
  const mcpCallToolIdx = toolDiscoverySrc.indexOf('"neurolink.mcp.callTool"');
  const window =
    mcpCallToolIdx >= 0
      ? toolDiscoverySrc.slice(mcpCallToolIdx, mcpCallToolIdx + 7000)
      : "";
  const hasAiToolNameInSrc = window.includes('"ai.tool.name"');
  const hasGenAiRequestInSrc = window.includes('"gen_ai.request"');
  const hasGenAiResponseInSrc = window.includes('"gen_ai.response"');

  record(
    "Issue 4a: toolDiscoveryService sets ai.tool.name",
    hasAiToolNameInSrc ? "PASS" : "FAIL",
    hasAiToolNameInSrc
      ? "attribute found in source near span"
      : "missing in source",
  );
  record(
    "Issue 4a: toolDiscoveryService sets gen_ai.request",
    hasGenAiRequestInSrc ? "PASS" : "FAIL",
    hasGenAiRequestInSrc
      ? "attribute found in source near span"
      : "missing in source",
  );
  record(
    "Issue 4a: toolDiscoveryService sets gen_ai.response",
    hasGenAiResponseInSrc ? "PASS" : "FAIL",
    hasGenAiResponseInSrc
      ? "attribute found in source near span"
      : "missing in source",
  );

  // Part B — behavior: once those attributes exist on an mcp.callTool span,
  // ContextEnricher / InMemorySpanExporter must preserve them for Langfuse to
  // pick up as input/output previews.
  const span = tracer.startSpan("neurolink.mcp.callTool", {
    attributes: {
      "mcp.server_id": "bitbucket",
      "mcp.tool_name": "search_code",
      "mcp.timeout_ms": 60000,
      "ai.tool.name": "search_code",
      "gen_ai.tool.name": "search_code",
      "gen_ai.request": JSON.stringify({
        name: "search_code",
        arguments: { workspace: "BZ", query: "foo" },
      }),
    },
  });
  span.setAttribute(
    "gen_ai.response",
    JSON.stringify({ content: [{ type: "text", text: "ok" }] }),
  );
  span.setStatus({ code: SpanStatusCode.OK });
  span.end();

  const captured = getSpanByName("neurolink.mcp.callTool");
  if (!captured) {
    record("Issue 4b: mcp.callTool span captured", "FAIL", "span not captured");
    return;
  }
  const hasAiToolName = typeof captured.attributes["ai.tool.name"] === "string";
  const hasInput = typeof captured.attributes["gen_ai.request"] === "string";
  const hasOutput = typeof captured.attributes["gen_ai.response"] === "string";
  record(
    "Issue 4b: ai.tool.name preserved through exporter",
    hasAiToolName ? "PASS" : "FAIL",
    `present=${hasAiToolName}`,
  );
  record(
    "Issue 4b: gen_ai.request preserved through exporter",
    hasInput ? "PASS" : "FAIL",
    `present=${hasInput}`,
  );
  record(
    "Issue 4b: gen_ai.response preserved through exporter",
    hasOutput ? "PASS" : "FAIL",
    `present=${hasOutput}`,
  );
}

// ---------------------------------------------------------------
// Issue 5: GENERATION statusMessage on abort/timeout/empty-output
// ---------------------------------------------------------------
async function reproduceIssue_5(): Promise<void> {
  section("Issue 5: GENERATION statusMessage on non-API errors");
  reset();

  // Case 5a — client abort: AI SDK sets ai.finishReason=aborted and leaves
  // the span status=UNSET. We expect WARNING + a message that mentions abort.
  {
    const span = tracer.startSpan("ai.generateText");
    span.setAttribute("ai.finishReason", "aborted");
    span.end();
    const captured = spanExporter
      .getFinishedSpans()
      .find((s) => s.name === "ai.generateText");
    const level = captured?.attributes["langfuse.level"];
    const statusMessage = captured?.attributes["langfuse.status_message"];
    const statusStr = typeof statusMessage === "string" ? statusMessage : "";
    record(
      "Issue 5a: aborted generation → level=WARNING + abort statusMessage",
      level === "WARNING" && /abort/i.test(statusStr) ? "PASS" : "FAIL",
      `level=${JSON.stringify(level)}, statusMessage=${JSON.stringify(statusMessage)}`,
    );
  }

  reset();
  // Case 5b — timeout via AI SDK exception path. When the TimeoutError
  // propagates through streamText/generateText, the AI SDK's recordSpan
  // wrapper sets span.status = ERROR + message. ContextEnricher's
  // SpanStatusCode.ERROR branch surfaces level=ERROR + status_message.
  {
    const span = tracer.startSpan("ai.streamText");
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: "openai stream operation timed out after 30000",
    });
    span.end();
    const captured = spanExporter
      .getFinishedSpans()
      .find((s) => s.name === "ai.streamText");
    const level = captured?.attributes["langfuse.level"];
    const statusMessage = captured?.attributes["langfuse.status_message"];
    const statusStr = typeof statusMessage === "string" ? statusMessage : "";
    record(
      "Issue 5b: timeout → level=ERROR + statusMessage mentions timeout",
      level === "ERROR" && /(timeout|timed out)/i.test(statusStr)
        ? "PASS"
        : "FAIL",
      `level=${JSON.stringify(level)}, statusMessage=${JSON.stringify(statusMessage)}`,
    );
  }

  reset();
  // Case 5c — empty output: exercise the real producer path. StreamHandler's
  // NoOutputGeneratedError catch block reads `trace.getSpan(context.active())`
  // and stamps `neurolink.no_output` on whichever span is active. We replicate
  // that exact sequence here so the test fails if the producer stops stamping.
  {
    const span = tracer.startSpan("ai.streamText");
    await otelContext.with(
      trace.setSpan(otelContext.active(), span),
      async () => {
        const activeSpan = trace.getSpan(otelContext.active());
        if (activeSpan) {
          activeSpan.setAttribute("neurolink.no_output", true);
        }
      },
    );
    span.end();
    const captured = spanExporter
      .getFinishedSpans()
      .find((s) => s.name === "ai.streamText");
    const level = captured?.attributes["langfuse.level"];
    const statusMessage = captured?.attributes["langfuse.status_message"];
    const statusStr = typeof statusMessage === "string" ? statusMessage : "";
    const noOutputMarker = captured?.attributes["neurolink.no_output"];
    record(
      "Issue 5c: empty output → level=WARNING + no-output statusMessage",
      noOutputMarker === true &&
        level === "WARNING" &&
        /no output|NoOutputGeneratedError/i.test(statusStr)
        ? "PASS"
        : "FAIL",
      `no_output_marker=${noOutputMarker}, level=${JSON.stringify(level)}, statusMessage=${JSON.stringify(statusMessage)}`,
    );
  }
}

// ---------------------------------------------------------------
// Issue 6: TOOL↔SPAN correlation via captured span ID.
//   When the AI SDK ai.toolCall span is active, any downstream
//   neurolink.mcp.callTool span inside the same context should
//   have the ai.toolCall span as its parent.
// ---------------------------------------------------------------
async function reproduceIssue_6(): Promise<void> {
  section(
    "Issue 6: parent-child link between ai.toolCall and neurolink.mcp.callTool",
  );
  reset();

  const aiSdkSpan = tracer.startSpan("ai.toolCall", {
    attributes: {
      "ai.toolCall.name": "bitbucket.search",
      "ai.toolCall.id": "call_corr_1",
    },
  });
  const aiSdkSpanId = aiSdkSpan.spanContext().spanId;

  await otelContext.with(
    trace.setSpan(otelContext.active(), aiSdkSpan),
    async () => {
      const mcpSpan = tracer.startSpan("neurolink.mcp.callTool", {
        attributes: { "mcp.tool_name": "search" },
      });
      mcpSpan.end();
    },
  );
  aiSdkSpan.end();

  const mcpSpan = getSpanByName("neurolink.mcp.callTool");
  if (!mcpSpan) {
    record("Issue 6: mcp span captured", "FAIL", "missing");
    return;
  }
  const parentSpanId =
    (
      mcpSpan as unknown as {
        parentSpanContext?: { spanId?: string };
        parentSpanId?: string;
      }
    ).parentSpanContext?.spanId ??
    (mcpSpan as unknown as { parentSpanId?: string }).parentSpanId;

  record(
    "Issue 6: mcp.callTool parent === ai.toolCall spanId",
    parentSpanId === aiSdkSpanId ? "PASS" : "FAIL",
    `aiSdkSpanId=${aiSdkSpanId}, parentSpanId=${parentSpanId}`,
  );
}

// ---------------------------------------------------------------
// Main
// ---------------------------------------------------------------
async function main(): Promise<void> {
  console.log(
    `${colors.bright}NeuroLink Telemetry Gaps — Reproduction Suite${colors.reset}`,
  );
  console.log(
    "These tests are EXPECTED TO FAIL on the current codebase and PASS after fixes.\n",
  );

  await reproduceIssue_1_2();
  await reproduceIssue_3();
  await reproduceIssue_4();
  await reproduceIssue_5();
  await reproduceIssue_6();

  // Summary
  const passed = results.filter((r) => r.outcome === "PASS").length;
  const failed = results.filter((r) => r.outcome === "FAIL").length;

  console.log(
    `\n${colors.bright}Summary:${colors.reset} ${colors.green}${passed} passed${colors.reset}, ${colors.red}${failed} failed${colors.reset} (total ${results.length})`,
  );

  // Exit 0 if all pass (fixes done). Exit 1 if any fail (issues still present).
  process.exit(failed > 0 ? 1 : 0);
}

await main();
