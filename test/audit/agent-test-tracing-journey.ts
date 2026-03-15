#!/usr/bin/env npx tsx
/* eslint-disable curly */
import { NeuroLink } from "../../src/lib/neurolink.js";

/**
 * Safe arithmetic evaluator that only supports numbers, +, -, *, /, and parentheses.
 * Replaces `eval()` to prevent arbitrary code execution from model-controlled input.
 */
function safeEvaluate(expr: string): number {
  const tokens: string[] = [];
  const src = expr.replace(/\s+/g, "");
  let i = 0;
  while (i < src.length) {
    if (/[0-9.]/.test(src[i])) {
      let num = "";
      while (i < src.length && /[0-9.]/.test(src[i])) {
        num += src[i++];
      }
      tokens.push(num);
    } else if ("+-*/()".includes(src[i])) {
      tokens.push(src[i++]);
    } else {
      throw new Error(`Invalid character in expression: '${src[i]}'`);
    }
  }

  let pos = 0;
  function peek(): string | undefined {
    return tokens[pos];
  }
  function consume(expected?: string): string {
    const tok = tokens[pos++];
    if (expected !== undefined && tok !== expected)
      throw new Error(`Expected '${expected}', got '${tok}'`);
    return tok;
  }

  // Grammar: expr = term (('+' | '-') term)*
  function parseExpr(): number {
    let val = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = consume();
      const rhs = parseTerm();
      val = op === "+" ? val + rhs : val - rhs;
    }
    return val;
  }

  // term = factor (('*' | '/') factor)*
  function parseTerm(): number {
    let val = parseFactor();
    while (peek() === "*" || peek() === "/") {
      const op = consume();
      const rhs = parseFactor();
      if (op === "/") {
        if (rhs === 0) throw new Error("Division by zero");
        val /= rhs;
      } else {
        val *= rhs;
      }
    }
    return val;
  }

  // factor = '(' expr ')' | number | unary-minus factor
  function parseFactor(): number {
    if (peek() === "(") {
      consume("(");
      const val = parseExpr();
      consume(")");
      return val;
    }
    if (peek() === "-") {
      consume();
      return -parseFactor();
    }
    const tok = consume();
    const num = Number(tok);
    if (isNaN(num)) throw new Error(`Invalid number: '${tok}'`);
    return num;
  }

  const result = parseExpr();
  if (pos < tokens.length)
    throw new Error(`Unexpected token: '${tokens[pos]}'`);
  return result;
}

function printSpan(s: Record<string, unknown>, indent = 0) {
  const pad = " ".repeat(indent);
  const statusLabel =
    s.status === 2 ? "ERROR" : s.status === 1 ? "OK" : "UNSET";
  const duration = s.durationMs !== undefined ? `${s.durationMs}ms` : "-";
  console.log(`${pad}[${s.type}] ${s.name}`);
  console.log(`${pad}  spanId: ${s.spanId}  traceId: ${s.traceId}`);
  if (s.parentSpanId) {
    console.log(`${pad}  parentSpanId: ${s.parentSpanId}`);
  }
  console.log(`${pad}  status: ${statusLabel}  duration: ${duration}`);
  const a = (s.attributes || {}) as Record<string, unknown>;
  if (a["ai.provider"]) {
    console.log(
      `${pad}  provider: ${a["ai.provider"]}  model: ${a["ai.model"]}`,
    );
  }
  if (a["ai.tokens.input"]) {
    console.log(
      `${pad}  tokens: ${a["ai.tokens.input"]} in / ${a["ai.tokens.output"]} out`,
    );
  }
  if (a["ai.cost.total"]) {
    console.log(`${pad}  cost: $${Number(a["ai.cost.total"]).toFixed(6)}`);
  }
  if (a["stream.chunk_count"]) {
    console.log(
      `${pad}  stream: ${a["stream.chunk_count"]} chunks, ${a["stream.content_length"]} chars`,
    );
  }
  if (a["tool.name"]) {
    console.log(
      `${pad}  tool: ${a["tool.name"]} success: ${a["tool.success"]}`,
    );
  }
  if (s.statusMessage) {
    console.log(`${pad}  error: ${String(s.statusMessage).substring(0, 100)}`);
  }
  console.log();
}

async function main() {
  const sdk = new NeuroLink();

  // Register test tools
  sdk.registerTool("get_weather", {
    description: "Get current weather for a city",
    parameters: {
      type: "object" as const,
      properties: { city: { type: "string", description: "City name" } },
      required: ["city"],
    },
    execute: async (args: Record<string, unknown>) => ({
      city: args.city,
      temperature: 22,
      condition: "Sunny",
    }),
  });

  sdk.registerTool("calculate", {
    description: "Calculate a math expression",
    parameters: {
      type: "object" as const,
      properties: { expression: { type: "string" } },
      required: ["expression"],
    },
    execute: async (args: Record<string, unknown>) => ({
      result: safeEvaluate(String(args.expression)),
    }),
  });

  console.log("=".repeat(72));
  console.log("  COMPLETE END-TO-END TRACING JOURNEY");
  console.log("=".repeat(72));

  // JOURNEY 1: generate() with tools
  console.log("\n--- JOURNEY 1: generate() with tool ---");
  const gen1 = await sdk.generate({
    input: { text: "What is the weather in Tokyo? Use the get_weather tool." },
    provider: "vertex",
    model: "gemini-2.5-flash",
  });
  console.log(`Response: ${gen1.content?.substring(0, 100)}`);
  console.log(`Spans after J1: ${sdk.getSpans().length}`);

  // JOURNEY 2: generate() pure LLM
  console.log("\n--- JOURNEY 2: generate() pure LLM, no tools ---");
  const gen2 = await sdk.generate({
    input: { text: "What is the capital of France? One word." },
    provider: "vertex",
    model: "gemini-2.5-flash",
    disableTools: true,
  });
  console.log(`Response: ${gen2.content?.substring(0, 100)}`);
  console.log(`Spans after J2: ${sdk.getSpans().length}`);

  // JOURNEY 3: stream() basic
  console.log("\n--- JOURNEY 3: stream() basic ---");
  const stream1 = await sdk.stream({
    input: { text: "List 3 colors, one per line." },
    provider: "vertex",
    model: "gemini-2.5-flash",
    disableTools: true,
  });
  let content3 = "";
  for await (const chunk of stream1.stream) {
    if (chunk && "content" in chunk && typeof chunk.content === "string") {
      content3 += chunk.content;
    }
  }
  console.log(`Response: ${content3.substring(0, 100)}`);
  console.log(`Spans after J3: ${sdk.getSpans().length}`);

  // JOURNEY 4: stream() with tool
  console.log("\n--- JOURNEY 4: stream() with tool ---");
  const stream2 = await sdk.stream({
    input: { text: "Calculate 7 * 8. Use the calculate tool." },
    provider: "vertex",
    model: "gemini-2.5-flash",
  });
  let content4 = "";
  for await (const chunk of stream2.stream) {
    if (chunk && "content" in chunk && typeof chunk.content === "string") {
      content4 += chunk.content;
    }
  }
  console.log(`Response: ${content4.substring(0, 100)}`);
  console.log(`Spans after J4: ${sdk.getSpans().length}`);

  // JOURNEY 5: Error path
  console.log("\n--- JOURNEY 5: Error path ---");
  try {
    await sdk.generate({
      input: { text: "Hello" },
      provider: "nonexistent" as unknown as string,
      model: "fake",
    });
  } catch (e) {
    console.log(`Error caught: ${(e as Error).message.substring(0, 100)}`);
  }
  console.log(`Spans after J5: ${sdk.getSpans().length}`);

  // PRINT ALL SPANS
  console.log("\n" + "=".repeat(72));
  console.log("  ALL RECORDED SPANS");
  console.log("=".repeat(72) + "\n");
  const allSpans = sdk.getSpans();
  for (const span of allSpans) {
    printSpan(span);
  }

  // PRINT ALL TRACES
  console.log("=".repeat(72));
  console.log("  ALL TRACES (grouped by traceId)");
  console.log("=".repeat(72) + "\n");
  const allTraces = sdk.getTraces();
  for (const trace of allTraces) {
    const statusColor = trace.status === "ok" ? "OK" : "ERROR";
    console.log(
      `TRACE ${trace.traceId} [${statusColor}] — ${trace.spanCount} spans, ${trace.totalDurationMs}ms`,
    );
    console.log("  ROOT:");
    printSpan(trace.rootSpan, 4);
    for (const child of trace.childSpans) {
      console.log("  CHILD:");
      printSpan(child, 4);
    }
    console.log("-".repeat(72));
  }

  // PRINT METRICS DASHBOARD
  console.log("\n" + "=".repeat(72));
  console.log("  METRICS DASHBOARD");
  console.log("=".repeat(72) + "\n");
  const m = sdk.getMetrics();
  console.log(`Total spans:     ${m.totalSpans}`);
  console.log(`Successful:      ${m.successfulSpans}`);
  console.log(`Failed:          ${m.failedSpans}`);
  console.log(`Success rate:    ${(m.successRate * 100).toFixed(1)}%`);
  console.log(`Total cost:      $${m.totalCost?.toFixed(6)}`);
  if (m.latency && m.latency.count > 0) {
    console.log(`Latency p50:     ${m.latency.p50?.toFixed(0)}ms`);
    console.log(`Latency p95:     ${m.latency.p95?.toFixed(0)}ms`);
  }
  if (m.tokens) {
    console.log(`Input tokens:    ${m.tokens.totalInputTokens}`);
    console.log(`Output tokens:   ${m.tokens.totalOutputTokens}`);
  }
  console.log(`\nCost by model:`);
  for (const model of m.costByModel || []) {
    console.log(
      `  ${model.model}: $${model.totalCost.toFixed(6)} (${model.requestCount} req)`,
    );
  }
  console.log(`\nSpan types:`);
  for (const [type, count] of Object.entries(m.spansByType || {})) {
    console.log(`  ${type}: ${count}`);
  }

  // TELEMETRY STATUS
  console.log("\n" + "=".repeat(72));
  console.log("  TELEMETRY STATUS");
  console.log("=".repeat(72) + "\n");
  const status = sdk.getTelemetryStatus();
  console.log(`Enabled:         ${status.enabled}`);
  if (status.langfuse) {
    console.log(`Langfuse:        ${status.langfuse.enabled}`);
  }
  if (status.openTelemetry) {
    console.log(`OpenTelemetry:   ${status.openTelemetry.enabled}`);
  }
  console.log(`Exporters:       ${(status.exporters || []).length}`);

  // ASSERTIONS
  console.log("\n" + "=".repeat(72));
  console.log("  ASSERTIONS");
  console.log("=".repeat(72) + "\n");
  let pass = 0,
    fail = 0;
  function assert(name: string, cond: boolean, detail?: string) {
    if (cond) {
      pass++;
      console.log(`  PASS ${name}`);
    } else {
      fail++;
      console.log(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`);
    }
  }

  assert("Spans recorded", allSpans.length > 0, `got ${allSpans.length}`);
  assert("Traces recorded", allTraces.length > 0, `got ${allTraces.length}`);
  assert("Metrics totalSpans > 0", m.totalSpans > 0, `got ${m.totalSpans}`);
  assert("Metrics successRate > 0", m.successRate > 0, `got ${m.successRate}`);
  assert("getTelemetryStatus works", typeof status.enabled === "boolean");
  assert(
    "Generation spans exist",
    allSpans.some((s) => s.type === "model.generation"),
    `types: ${[...new Set(allSpans.map((s) => s.type))]}`,
  );
  assert(
    "Tool spans exist",
    allSpans.some((s) => s.type === "tool.call"),
    `types: ${[...new Set(allSpans.map((s) => s.type))]}`,
  );
  assert(
    "Stream spans have chunk_count",
    allSpans.some((s) => s.attributes["stream.chunk_count"]),
    "no stream spans with chunk_count",
  );
  assert(
    "Spans have durationMs",
    allSpans.every((s) => s.durationMs !== undefined && s.durationMs >= 0),
    "some spans missing durationMs",
  );
  assert(
    "resetMetrics works",
    (() => {
      sdk.resetMetrics();
      return sdk.getMetrics().totalSpans === 0;
    })(),
    `totalSpans after reset: ${sdk.getMetrics().totalSpans}`,
  );

  console.log(`\n${pass} passed, ${fail} failed out of ${pass + fail}`);
  console.log("\n" + "=".repeat(72));
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
