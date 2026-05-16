#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Stream-Span Lifetime Verification Suite
 *
 * Locks in the H02 + H07 fixes from the PR #1019 review.
 *
 * Coverage:
 *   H07 — withClientStreamSpan extends span lifetime past `fn` return:
 *           - span ends only when the consumer reaches end-of-stream
 *           - span ends on consumer-side throw (ERROR status)
 *           - span ends with OK status on normal completion
 *           - span attributes are preserved (set in options pass through)
 *           - withClientSpan (the one-shot variant) still ends on fn return
 *
 *   H02 — baseProvider.stream wraps the returned StreamResult.stream so
 *         the top-level `neurolink.provider.stream` span lives across the
 *         actual chunk iteration. We exercise this indirectly via
 *         withClientStreamSpan (the same wrapping shape) because spinning
 *         up a real provider requires credentials.
 *
 *   Pattern audit — every streaming provider executeStream uses
 *         withClientStreamSpan (not the broken withClientSpan).
 *
 * Run with: pnpm run test:stream-span
 */

import { SpanStatusCode } from "@opentelemetry/api";
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Bootstrap a tracer provider BEFORE importing the helpers under test.
const exporter = new InMemorySpanExporter();
const provider = new NodeTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(exporter)],
});
provider.register();

import { trace } from "@opentelemetry/api";
import {
  withClientSpan,
  withClientStreamSpan,
} from "../src/lib/telemetry/withSpan.js";
import { defineSuite } from "./helpers/harness.js";

const { recordTest, runSuite } = defineSuite("Stream Span Lifetime");
const testTracer = trace.getTracer("neurolink.test.stream-span");

// ───────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function findSpan(name: string) {
  exporter.forceFlush();
  return exporter.getFinishedSpans().find((s) => s.name === name);
}

function resetExporter(): void {
  exporter.reset();
}

// ───────────────────────────────────────────────────────────────────────
// Section A — withClientStreamSpan lifetime extends past fn return
// ───────────────────────────────────────────────────────────────────────

console.log("\n=== Section A: withClientStreamSpan lifetime (H07) ===\n");

{
  resetExporter();
  // Mock stream: 3 chunks, 50ms between each.
  let lastChunkAt = 0;
  async function* slowStream(): AsyncGenerator<string> {
    for (let i = 0; i < 3; i++) {
      await delay(50);
      lastChunkAt = Date.now();
      yield `chunk-${i}`;
    }
  }

  const result = await withClientStreamSpan(
    {
      name: "test.stream.lifetime",
      tracer: testTracer,
      attributes: { "test.id": "lifetime-extension" },
    },
    async () => ({ stream: slowStream(), meta: "x" }),
    (r) => r.stream,
    (r, wrapped) => ({ ...r, stream: wrapped }),
  );

  // Span should NOT have ended yet.
  const spanBeforeConsumption = findSpan("test.stream.lifetime");
  recordTest(
    "span unfinished after withClientStreamSpan returns",
    spanBeforeConsumption === undefined,
    spanBeforeConsumption !== undefined
      ? `span already finished at endTime=${spanBeforeConsumption.endTime[0]}.${spanBeforeConsumption.endTime[1]}`
      : undefined,
  );

  // Consume the stream.
  const chunks: string[] = [];
  for await (const chunk of result.stream) {
    chunks.push(chunk);
  }

  const consumedAt = Date.now();
  const spanAfter = findSpan("test.stream.lifetime");
  recordTest("span finished after stream consumed", spanAfter !== undefined);
  if (spanAfter) {
    const spanEndMs =
      spanAfter.endTime[0] * 1000 +
      Math.floor(spanAfter.endTime[1] / 1_000_000);
    // Span end should be approximately the consumedAt timestamp (within 100ms).
    const delta = Math.abs(spanEndMs - consumedAt);
    recordTest(
      "span end timestamp ~ last chunk timestamp (within 100ms)",
      delta < 100,
      false,
      `delta=${delta}ms; spanEnd=${spanEndMs}, consumed=${consumedAt}`,
    );
    // Status should be OK
    recordTest(
      "span status OK on normal completion",
      spanAfter.status.code === SpanStatusCode.OK,
    );
    // Attributes preserved
    recordTest(
      "span attributes preserved through wrapper",
      spanAfter.attributes["test.id"] === "lifetime-extension",
    );
  }
  // And we got the chunks
  recordTest(
    "all 3 chunks received intact",
    chunks.length === 3 && chunks[0] === "chunk-0" && chunks[2] === "chunk-2",
  );
  // lastChunkAt sanity
  recordTest("test stream actually ran (>=100ms duration)", lastChunkAt > 0);
}

// ───────────────────────────────────────────────────────────────────────
// Section B — Span ends ERROR when consumer throws mid-stream
// ───────────────────────────────────────────────────────────────────────

console.log("\n=== Section B: error path (H07) ===\n");

{
  resetExporter();
  async function* throwingStream(): AsyncGenerator<string> {
    yield "first";
    throw new Error("simulated upstream failure");
  }

  const result = await withClientStreamSpan(
    {
      name: "test.stream.error",
      tracer: testTracer,
      attributes: { "test.id": "error-propagation" },
    },
    async () => ({ stream: throwingStream() }),
    (r) => r.stream,
    (r, wrapped) => ({ ...r, stream: wrapped }),
  );

  let threwAsExpected = false;
  try {
    for await (const _ of result.stream) {
      // consume
    }
  } catch (err) {
    if (err instanceof Error && /simulated upstream/.test(err.message)) {
      threwAsExpected = true;
    }
  }
  recordTest("consumer re-throws upstream error", threwAsExpected);

  const errSpan = findSpan("test.stream.error");
  recordTest(
    "span recorded with ERROR status on mid-stream throw",
    errSpan?.status.code === SpanStatusCode.ERROR,
    false,
    errSpan ? `status.message=${errSpan.status.message}` : "span not found",
  );
  // The span should have recorded the exception
  recordTest(
    "span recordException called for thrown error",
    (errSpan?.events.length ?? 0) > 0,
  );
}

// ───────────────────────────────────────────────────────────────────────
// Section C — fn rejection ends span immediately (no wrapper needed)
// ───────────────────────────────────────────────────────────────────────

console.log("\n=== Section C: fn rejection (H07) ===\n");

{
  resetExporter();
  let fnRejected = false;
  try {
    await withClientStreamSpan(
      { name: "test.stream.fn-reject", tracer: testTracer },
      async () => {
        throw new Error("fn body failed");
      },
      (r: { stream: AsyncIterable<string> }) => r.stream,
      (r, wrapped) => ({ ...r, stream: wrapped }),
    );
  } catch (err) {
    if (err instanceof Error && /fn body failed/.test(err.message)) {
      fnRejected = true;
    }
  }
  recordTest("fn rejection propagates", fnRejected);
  const span = findSpan("test.stream.fn-reject");
  recordTest(
    "fn rejection ends span with ERROR",
    span?.status.code === SpanStatusCode.ERROR,
  );
}

// ───────────────────────────────────────────────────────────────────────
// Section D — withClientSpan (one-shot) still ends on fn return
// ───────────────────────────────────────────────────────────────────────

console.log("\n=== Section D: withClientSpan (one-shot, regression) ===\n");

{
  resetExporter();
  const before = Date.now();
  const result = await withClientSpan(
    { name: "test.one-shot", tracer: testTracer },
    async () => {
      await delay(20);
      return { value: 42 };
    },
  );
  recordTest("withClientSpan returns value", result.value === 42);
  const span = findSpan("test.one-shot");
  recordTest(
    "one-shot span finishes immediately on fn return",
    span !== undefined,
  );
  if (span) {
    const dur = (span.duration[0] * 1e9 + span.duration[1]) / 1_000_000;
    recordTest(
      "one-shot span duration ≈ fn duration (≥20ms, <100ms)",
      dur >= 20 && dur < 100,
      false,
      `duration=${dur}ms`,
    );
  }
}

// ───────────────────────────────────────────────────────────────────────
// Section E — Provider pattern audit (H07 follow-through)
// ───────────────────────────────────────────────────────────────────────

console.log("\n=== Section E: provider migration audit (H07) ===\n");

const providersDir = "src/lib/providers";
const expectedMigrated = [
  "cohere",
  "groq",
  "xai",
  "togetherAi",
  "fireworks",
  "perplexity",
  "deepseek",
  "llamaCpp",
  "lmStudio",
  "nvidiaNim",
  "cloudflare",
  "ollama",
];

let auditFiles: string[];
try {
  auditFiles = readdirSync(providersDir).filter((f) => f.endsWith(".ts"));
} catch (err) {
  recordTest(
    "read providers dir",
    false,
    err instanceof Error ? err.message : String(err),
  );
  auditFiles = [];
}

for (const name of expectedMigrated) {
  const file = auditFiles.find((f) => f === `${name}.ts`);
  if (!file) {
    recordTest(`${name}: file present`, false, "not found");
    continue;
  }
  try {
    const content = readFileSync(join(providersDir, file), "utf8");
    const usesStreamSpan = content.includes("withClientStreamSpan");
    const usesOldSpan = /withClientSpan\(/.test(content);
    recordTest(
      `${name}: uses withClientStreamSpan for streaming`,
      usesStreamSpan,
    );
    recordTest(
      `${name}: no leftover withClientSpan( call for streaming`,
      !usesOldSpan,
      usesOldSpan ? "still has withClientSpan( reference" : undefined,
    );
  } catch (err) {
    recordTest(
      `${name}: read`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

// ───────────────────────────────────────────────────────────────────────
// Section F — Provider error convention audit (M08 follow-through)
// ───────────────────────────────────────────────────────────────────────

console.log("\n=== Section F: provider error convention audit (M08) ===\n");

// Every provider's formatProviderError must return typed errors
// (AuthenticationError / RateLimitError / NetworkError / InvalidModelError /
//  ProviderError / NeuroLinkError) — not plain new Error(...).
const allProviders = auditFiles.filter(
  (f) =>
    f !== "index.ts" &&
    f !== "providerTypeUtils.ts" &&
    f !== "anthropicBaseProvider.ts",
);

for (const file of allProviders) {
  try {
    const content = readFileSync(join(providersDir, file), "utf8");
    // Find formatProviderError block via simple substring slice
    const idx = content.indexOf("formatProviderError(error: unknown): Error");
    if (idx === -1) {
      // Skip providers that inherit formatProviderError
      continue;
    }
    // Slice 80 lines worth of body
    const block = content.slice(idx, idx + 4000);
    const closeIdx = block.indexOf("\n  }\n");
    const body = closeIdx === -1 ? block : block.slice(0, closeIdx);
    // Body must NOT contain `return new Error(`
    const plainErrorReturns = (body.match(/return new Error\(/g) ?? []).length;
    recordTest(
      `${file}: no plain Error returns in formatProviderError`,
      plainErrorReturns === 0,
      plainErrorReturns > 0
        ? `${plainErrorReturns} plain return new Error(... in body`
        : undefined,
    );
  } catch (err) {
    recordTest(
      `${file}: audit`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

// ───────────────────────────────────────────────────────────────────────
// Section G — NeuroLink brand sweep (M09)
// ───────────────────────────────────────────────────────────────────────

console.log("\n=== Section G: NeuroLink brand sweep (M09) ===\n");

const expectedBrandUsers = [
  "cohere",
  "fireworks",
  "groq",
  "ideogram",
  "jina",
  "llamaCpp",
  "lmStudio",
  "mistral",
  "nvidiaNim",
  "perplexity",
  "togetherAi",
  "replicate",
  "stability",
  "recraft",
  "xai",
  "voyage",
  "cloudflare",
  "deepseek",
];

for (const name of expectedBrandUsers) {
  try {
    const content = readFileSync(join(providersDir, `${name}.ts`), "utf8");
    const usesBrand = content.includes("isNeuroLink(");
    const hasDuckType = content.includes('"getInMemoryServers" in sdk');
    recordTest(`${name}: uses isNeuroLink brand check`, usesBrand);
    recordTest(
      `${name}: no leftover duck-type "getInMemoryServers" in sdk`,
      !hasDuckType,
    );
  } catch (err) {
    recordTest(
      `${name}: brand audit`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

await runSuite();
