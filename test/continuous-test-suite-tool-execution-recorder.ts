#!/usr/bin/env tsx

/**
 * Continuous Test Suite — ToolExecutionRecorder (N2)
 *
 * Bounded serialization, error-shape detection, wrap idempotency, record caps,
 * fire-and-forget onRecord, legacy conversion, and recorder-vs-legacy
 * resolution.
 *
 * Migrated from test/toolExecutionRecorder.test.ts — see CLAUDE.md: suites run
 * via tsx, not a Vitest runner.
 *
 * Run with: npx tsx test/continuous-test-suite-tool-execution-recorder.ts
 */

import {
  DEFAULT_TOOL_RESULT_CAPTURE_CHARS,
  ToolExecutionRecorder,
  isErrorShapedToolResult,
  resolveToolExecutionRecords,
  serializeToolResult,
  toToolExecutionRecords,
} from "../src/lib/core/toolExecutionRecorder.js";
import type { Tool } from "../src/lib/types/index.js";
import { assert, assertEqual, defineSuite } from "./helpers/harness.js";
import { spy } from "./helpers/stubs.js";

const { test, runSuite } = defineSuite("ToolExecutionRecorder (N2)");

type AnyTool = Tool & {
  execute?: (params: unknown, execOptions?: unknown) => Promise<unknown>;
};

const makeTool = (
  execute: (params: unknown, execOptions?: unknown) => Promise<unknown>,
): AnyTool => ({ description: "t", execute }) as unknown as AnyTool;

const assertDeepEqual = (a: unknown, b: unknown, msg: string): void =>
  assertEqual(JSON.stringify(a), JSON.stringify(b), msg);

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Vitest's toMatchObject, which is a RECURSIVE subset match — a nested object
 * in `subset` constrains only the keys it names, not the whole nested value.
 * A shallow per-key compare would be stricter than the assertions being ported.
 *
 * Returns the first mismatching key path, or null when everything matched.
 */
function firstMismatch(
  actual: unknown,
  subset: Record<string, unknown>,
  path = "",
): string | null {
  if (!isPlainObject(actual)) {
    return path || "<root>";
  }
  for (const [key, expected] of Object.entries(subset)) {
    const here = path ? `${path}.${key}` : key;
    if (isPlainObject(expected)) {
      const deeper = firstMismatch(actual[key], expected, here);
      if (deeper) {
        return deeper;
      }
    } else if (JSON.stringify(actual[key]) !== JSON.stringify(expected)) {
      return here;
    }
  }
  return null;
}

/**
 * NOTE: the path alone is reported, never the values. The harness downgrades
 * any assertion message matching isExpectedProviderError to SKIP instead of
 * FAIL, so embedding a captured payload here could turn a real failure into a
 * silent skip — captured tool results are exactly the kind of text that trips it.
 */
function assertMatches(
  actual: Record<string, unknown>,
  subset: Record<string, unknown>,
  msg: string,
): void {
  const mismatch = firstMismatch(actual, subset);
  assert(mismatch === null, `${msg} — mismatch at ${mismatch}`);
}

/** Await `p`, returning the rejection reason (or undefined if it resolved). */
async function rejection(p: Promise<unknown> | undefined): Promise<unknown> {
  try {
    await p;
    return undefined;
  } catch (error) {
    return error;
  }
}

// ---------------------------------------------------------------------------
// serializeToolResult
// ---------------------------------------------------------------------------

await test("serializeToolResult passes short strings through and JSON-stringifies objects", () => {
  assertEqual(
    serializeToolResult("hello", 100),
    "hello",
    "strings pass through",
  );
  assertEqual(
    serializeToolResult({ a: 1 }, 100),
    '{"a":1}',
    "objects are stringified",
  );
});

await test("serializeToolResult truncates with an explicit marker", () => {
  const out = serializeToolResult("x".repeat(100), 10);
  assert(out.startsWith("x".repeat(10)), "the retained prefix must be intact");
  assert(
    out.includes("[truncated 90 chars]"),
    `truncation must be announced, got: ${out}`,
  );
});

await test("serializeToolResult survives circular objects", () => {
  const circular: Record<string, unknown> = {};
  circular.self = circular;
  let threw: unknown;
  try {
    serializeToolResult(circular, 100);
  } catch (error) {
    threw = error;
  }
  assertEqual(threw, undefined, "a circular payload must not throw");
});

// ---------------------------------------------------------------------------
// isErrorShapedToolResult
// ---------------------------------------------------------------------------

await test("isErrorShapedToolResult detects MCP isError, error payloads and failed statuses", () => {
  assertEqual(isErrorShapedToolResult({ isError: true }), true, "MCP isError");
  assertEqual(
    isErrorShapedToolResult({ error: "boom" }),
    true,
    "error payload",
  );
  assertEqual(
    isErrorShapedToolResult({ status: "FAILED" }),
    true,
    "FAILED status",
  );
  assertEqual(
    isErrorShapedToolResult({ status: "success" }),
    false,
    "a success status is not an error",
  );
  assertEqual(
    isErrorShapedToolResult({ ok: true }),
    false,
    "ok is not an error",
  );
  assertEqual(
    isErrorShapedToolResult("plain text"),
    false,
    "a bare string is not an error",
  );
});

// ---------------------------------------------------------------------------
// ToolExecutionRecorder
// ---------------------------------------------------------------------------

await test("records params, bounded result text, timing and success", async () => {
  const recorder = new ToolExecutionRecorder();
  const tools = recorder.wrapTools({
    search: makeTool(async (params) => ({ echo: params })),
  });
  await (tools.search as AnyTool).execute?.({ q: "x" }, {});

  const records = recorder.getRecords();
  assertEqual(records.length, 1, "one execution, one record");
  assertEqual(records[0].toolName, "search", "the tool name must be recorded");
  assertDeepEqual(records[0].params, { q: "x" }, "params must be recorded");
  assertEqual(
    records[0].resultText,
    '{"echo":{"q":"x"}}',
    "the result must be serialized",
  );
  assertEqual(records[0].isError, false, "a clean run is not an error");
  assert(records[0].startedAt > 0, "startedAt must be a real timestamp");
  assert(records[0].durationMs >= 0, "durationMs must be non-negative");
});

await test("records a thrown error as isError and still rethrows", async () => {
  const recorder = new ToolExecutionRecorder();
  const tools = recorder.wrapTools({
    broken: makeTool(async () => {
      throw new Error("kaput");
    }),
  });

  const error = await rejection((tools.broken as AnyTool).execute?.({}, {}));
  assert(
    error instanceof Error && error.message.includes("kaput"),
    "recording must not swallow the error",
  );
  const [record] = recorder.getRecords();
  assertEqual(record.isError, true, "the record must be marked an error");
  assert(
    record.resultText.includes("kaput"),
    "the error text must be captured",
  );
});

await test("marks error-shaped returns (MCP isError) as failures", async () => {
  const recorder = new ToolExecutionRecorder();
  const tools = recorder.wrapTools({
    mcp: makeTool(async () => ({ isError: true, content: "denied" })),
  });
  await (tools.mcp as AnyTool).execute?.({}, {});
  assertEqual(
    recorder.getRecords()[0].isError,
    true,
    "a returned error shape counts as a failure, not just a throw",
  );
});

await test("caps result text at maxResultChars", async () => {
  const recorder = new ToolExecutionRecorder();
  const tools = recorder.wrapTools({
    big: makeTool(async () => "y".repeat(100_000)),
  });
  await (tools.big as AnyTool).execute?.({}, {});

  const [record] = recorder.getRecords();
  assert(
    record.resultText.length < DEFAULT_TOOL_RESULT_CAPTURE_CHARS + 64,
    `a 100KB result must be capped, got ${record.resultText.length} chars`,
  );
  assert(
    record.resultText.includes("[truncated"),
    "truncation must be announced",
  );
});

await test("caps records at maxRecords, dropping the oldest first", async () => {
  const recorder = new ToolExecutionRecorder({ maxRecords: 2 });
  const tools = recorder.wrapTools({ t: makeTool(async (params) => params) });
  await (tools.t as AnyTool).execute?.(1, {});
  await (tools.t as AnyTool).execute?.(2, {});
  await (tools.t as AnyTool).execute?.(3, {});

  const records = recorder.getRecords();
  assertEqual(records.length, 2, "the cap must hold");
  assertDeepEqual(
    records.map((r) => r.params),
    [2, 3],
    "the OLDEST must be dropped, not the newest",
  );
  assertEqual(recorder.getDroppedCount(), 1, "the drop must be counted");
});

await test("wrapping is idempotent — re-wrapping never double-records", async () => {
  const recorder = new ToolExecutionRecorder();
  const once = recorder.wrapTools({ t: makeTool(async () => "ok") });
  const twice = recorder.wrapTools(once);
  await (twice.t as AnyTool).execute?.({}, {});
  assertEqual(
    recorder.getRecords().length,
    1,
    "a doubly-wrapped tool must still record exactly once",
  );
});

await test("leaves tools without execute untouched", () => {
  const recorder = new ToolExecutionRecorder();
  const providerTool = { description: "provider-executed" } as AnyTool;
  const wrapped = recorder.wrapTools({ g: providerTool });
  assert(
    wrapped.g === providerTool,
    "a provider-executed tool must be the very same object, not a wrapper",
  );
});

await test("onRecord fires per record and a throwing listener never breaks execution", async () => {
  const onRecord = spy(() => {
    throw new Error("listener boom");
  });
  const recorder = new ToolExecutionRecorder({ onRecord: onRecord.fn });
  const tools = recorder.wrapTools({ t: makeTool(async () => "ok") });

  const result = await (tools.t as AnyTool).execute?.({}, {});
  assertEqual(result, "ok", "the tool result must survive a broken listener");
  assertEqual(onRecord.callCount, 1, "the listener must fire once per record");
});

await test("an async onRecord rejection is swallowed too", async () => {
  const onRecord = spy(async () => {
    throw new Error("async listener boom");
  });
  const recorder = new ToolExecutionRecorder({ onRecord: onRecord.fn });
  const tools = recorder.wrapTools({ t: makeTool(async () => "ok") });

  const result = await (tools.t as AnyTool).execute?.({}, {});
  assertEqual(result, "ok", "the tool result must survive");
  // Let the rejected listener promise settle — it must not surface anywhere.
  await new Promise((r) => setTimeout(r, 0));
  assertEqual(recorder.getRecords().length, 1, "the record must still exist");
});

await test("serializes as {} — captured payloads never ride along in options dumps", async () => {
  const recorder = new ToolExecutionRecorder();
  const tools = recorder.wrapTools({
    t: makeTool(async () => "sensitive-payload"),
  });
  await (tools.t as AnyTool).execute?.({ secret: "value" }, {});

  const options: Record<string, unknown> = { maxSteps: 3 };
  recorder.attachTo(options);
  const dumped = JSON.stringify(options);

  assert(
    !dumped.includes("sensitive-payload"),
    "captured results must not leak into an options dump",
  );
  assert(!dumped.includes("secret"), "captured params must not leak either");
  assertEqual(
    JSON.stringify(recorder),
    "{}",
    "the recorder itself serializes empty",
  );
  assertEqual(
    recorder.getRecords()[0].resultText,
    "sensitive-payload",
    "…while the records stay fully retrievable through the API",
  );
});

await test("attaches to options, survives a spread, and resolves back", async () => {
  const recorder = new ToolExecutionRecorder();
  const options: Record<string, unknown> = { maxSteps: 3 };
  recorder.attachTo(options);
  const spread = { ...options, temperature: 0.1 };
  assert(
    ToolExecutionRecorder.from(spread) === recorder,
    "the recorder must survive an object spread and resolve to the same instance",
  );
});

// ---------------------------------------------------------------------------
// toToolExecutionRecords (legacy conversion)
// ---------------------------------------------------------------------------

await test("converts legacy {name,input,output} entries with zero timing", () => {
  const records = toToolExecutionRecords([
    { name: "grep", input: { q: "a" }, output: { hits: 2 } },
  ]);
  assertEqual(records.length, 1, "one entry in, one record out");
  assertMatches(
    records[0] as unknown as Record<string, unknown>,
    {
      toolName: "grep",
      params: { q: "a" },
      isError: false,
      startedAt: 0,
      durationMs: 0,
    },
    "legacy conversion",
  );
  assertEqual(records[0].resultText, '{"hits":2}', "the output is serialized");
});

await test("keeps timing and error info when the legacy entry carries it", () => {
  const [record] = toToolExecutionRecords([
    {
      name: "grep",
      input: {},
      output: { error: "denied" },
      durationMs: 42,
      startedAt: 1000,
    },
  ]);
  assertEqual(record.durationMs, 42, "durationMs must be preserved");
  assertEqual(record.startedAt, 1000, "startedAt must be preserved");
  assertEqual(record.isError, true, "an error-shaped output must be detected");
});

await test("round-trips a canonical record losslessly", () => {
  const canonical = {
    toolName: "grep",
    params: { q: "x" },
    resultText: "captured result",
    isError: false,
    startedAt: 1000,
    durationMs: 42,
    // Legacy fields riding along from the internal pass-through paths.
    executionTime: 42,
    success: true,
  };
  const [record] = toToolExecutionRecords([canonical]);
  assertMatches(
    record as unknown as Record<string, unknown>,
    {
      toolName: "grep",
      params: { q: "x" },
      resultText: "captured result",
      isError: false,
      startedAt: 1000,
      durationMs: 42,
    },
    "canonical round-trip",
  );
});

// ---------------------------------------------------------------------------
// resolveToolExecutionRecords
// ---------------------------------------------------------------------------

await test("prefers recorder records and falls back to legacy conversion", async () => {
  const recorder = new ToolExecutionRecorder();
  const options: Record<string, unknown> = {};
  recorder.attachTo(options);
  const tools = recorder.wrapTools({ t: makeTool(async () => "real") });
  await (tools.t as AnyTool).execute?.({}, {});

  const preferred = resolveToolExecutionRecords(options, [
    { name: "legacy", input: {}, output: "old" },
  ]);
  assertEqual(preferred.length, 1, "the recorder's records win outright");
  assertEqual(preferred[0].toolName, "t", "…and legacy entries are ignored");

  const fallback = resolveToolExecutionRecords({}, [
    { name: "legacy", input: {}, output: "old" },
  ]);
  assertEqual(
    fallback[0].toolName,
    "legacy",
    "with no recorder attached, legacy entries are converted",
  );
});

await runSuite();
