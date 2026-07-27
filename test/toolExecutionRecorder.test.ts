/**
 * Vitest tests for the per-call ToolExecutionRecorder (N2).
 *
 * Covers bounded serialization, error-shape detection, wrap idempotency,
 * record caps, fire-and-forget onRecord, legacy conversion, and
 * recorder-vs-legacy resolution.
 *
 * Run:
 *   pnpm exec vitest run test/toolExecutionRecorder.test.ts
 */

import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_TOOL_RESULT_CAPTURE_CHARS,
  ToolExecutionRecorder,
  isErrorShapedToolResult,
  resolveToolExecutionRecords,
  serializeToolResult,
  toToolExecutionRecords,
} from "../src/lib/core/toolExecutionRecorder.js";
import type { Tool } from "../src/lib/types/index.js";

type AnyTool = Tool & {
  execute?: (params: unknown, execOptions?: unknown) => Promise<unknown>;
};

function makeTool(
  execute: (params: unknown, execOptions?: unknown) => Promise<unknown>,
): AnyTool {
  return { description: "t", execute } as unknown as AnyTool;
}

describe("serializeToolResult", () => {
  it("passes short strings through and JSON-stringifies objects", () => {
    expect(serializeToolResult("hello", 100)).toBe("hello");
    expect(serializeToolResult({ a: 1 }, 100)).toBe('{"a":1}');
  });

  it("truncates with an explicit marker", () => {
    const text = "x".repeat(100);
    const out = serializeToolResult(text, 10);
    expect(out.startsWith("x".repeat(10))).toBe(true);
    expect(out).toContain("[truncated 90 chars]");
  });

  it("survives circular objects", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => serializeToolResult(circular, 100)).not.toThrow();
  });
});

describe("isErrorShapedToolResult", () => {
  it("detects MCP isError, error payloads, and failed statuses", () => {
    expect(isErrorShapedToolResult({ isError: true })).toBe(true);
    expect(isErrorShapedToolResult({ error: "boom" })).toBe(true);
    expect(isErrorShapedToolResult({ status: "FAILED" })).toBe(true);
    expect(isErrorShapedToolResult({ status: "success" })).toBe(false);
    expect(isErrorShapedToolResult({ ok: true })).toBe(false);
    expect(isErrorShapedToolResult("plain text")).toBe(false);
  });
});

describe("ToolExecutionRecorder", () => {
  it("records params, bounded result text, timing, and success", async () => {
    const recorder = new ToolExecutionRecorder();
    const tools = recorder.wrapTools({
      search: makeTool(async (params) => ({ echo: params })),
    });
    await (tools.search as AnyTool).execute?.({ q: "x" }, {});
    const records = recorder.getRecords();
    expect(records).toHaveLength(1);
    expect(records[0].toolName).toBe("search");
    expect(records[0].params).toEqual({ q: "x" });
    expect(records[0].resultText).toBe('{"echo":{"q":"x"}}');
    expect(records[0].isError).toBe(false);
    expect(records[0].startedAt).toBeGreaterThan(0);
    expect(records[0].durationMs).toBeGreaterThanOrEqual(0);
  });

  it("records thrown errors as isError and rethrows", async () => {
    const recorder = new ToolExecutionRecorder();
    const tools = recorder.wrapTools({
      broken: makeTool(async () => {
        throw new Error("kaput");
      }),
    });
    await expect((tools.broken as AnyTool).execute?.({}, {})).rejects.toThrow(
      "kaput",
    );
    const [record] = recorder.getRecords();
    expect(record.isError).toBe(true);
    expect(record.resultText).toContain("kaput");
  });

  it("marks error-shaped returns (MCP isError) as failures", async () => {
    const recorder = new ToolExecutionRecorder();
    const tools = recorder.wrapTools({
      mcp: makeTool(async () => ({ isError: true, content: "denied" })),
    });
    await (tools.mcp as AnyTool).execute?.({}, {});
    expect(recorder.getRecords()[0].isError).toBe(true);
  });

  it("caps result text at maxResultChars (default ~8KB)", async () => {
    const recorder = new ToolExecutionRecorder();
    const tools = recorder.wrapTools({
      big: makeTool(async () => "y".repeat(100_000)),
    });
    await (tools.big as AnyTool).execute?.({}, {});
    const [record] = recorder.getRecords();
    expect(record.resultText.length).toBeLessThan(
      DEFAULT_TOOL_RESULT_CAPTURE_CHARS + 64,
    );
    expect(record.resultText).toContain("[truncated");
  });

  it("caps records at maxRecords, dropping oldest first", async () => {
    const recorder = new ToolExecutionRecorder({ maxRecords: 2 });
    const tools = recorder.wrapTools({
      t: makeTool(async (params) => params),
    });
    await (tools.t as AnyTool).execute?.(1, {});
    await (tools.t as AnyTool).execute?.(2, {});
    await (tools.t as AnyTool).execute?.(3, {});
    const records = recorder.getRecords();
    expect(records).toHaveLength(2);
    expect(records.map((r) => r.params)).toEqual([2, 3]);
    expect(recorder.getDroppedCount()).toBe(1);
  });

  it("is idempotent — re-wrapping never double-records", async () => {
    const recorder = new ToolExecutionRecorder();
    const once = recorder.wrapTools({
      t: makeTool(async () => "ok"),
    });
    const twice = recorder.wrapTools(once);
    await (twice.t as AnyTool).execute?.({}, {});
    expect(recorder.getRecords()).toHaveLength(1);
  });

  it("leaves tools without execute untouched", () => {
    const recorder = new ToolExecutionRecorder();
    const providerTool = { description: "provider-executed" } as AnyTool;
    const wrapped = recorder.wrapTools({ g: providerTool });
    expect(wrapped.g).toBe(providerTool);
  });

  it("onRecord fires per record and listener errors never break execution", async () => {
    const onRecord = vi.fn(() => {
      throw new Error("listener boom");
    });
    const recorder = new ToolExecutionRecorder({ onRecord });
    const tools = recorder.wrapTools({
      t: makeTool(async () => "ok"),
    });
    await expect((tools.t as AnyTool).execute?.({}, {})).resolves.toBe("ok");
    expect(onRecord).toHaveBeenCalledTimes(1);
  });

  it("async onRecord rejections are swallowed too", async () => {
    const onRecord = vi.fn(async () => {
      throw new Error("async listener boom");
    });
    const recorder = new ToolExecutionRecorder({ onRecord });
    const tools = recorder.wrapTools({
      t: makeTool(async () => "ok"),
    });
    await expect((tools.t as AnyTool).execute?.({}, {})).resolves.toBe("ok");
    // Let the rejected listener promise settle — must not surface anywhere.
    await new Promise((r) => setTimeout(r, 0));
    expect(recorder.getRecords()).toHaveLength(1);
  });

  it("serializes as {} — captured payloads never ride along with options dumps", async () => {
    const recorder = new ToolExecutionRecorder();
    const tools = recorder.wrapTools({
      t: makeTool(async () => "sensitive-payload"),
    });
    await (tools.t as AnyTool).execute?.({ secret: "value" }, {});
    const options: Record<string, unknown> = { maxSteps: 3 };
    recorder.attachTo(options);
    const dumped = JSON.stringify(options);
    expect(dumped).not.toContain("sensitive-payload");
    expect(dumped).not.toContain("secret");
    expect(JSON.stringify(recorder)).toBe("{}");
    // …while the records stay fully retrievable through the API.
    expect(recorder.getRecords()[0].resultText).toBe("sensitive-payload");
  });

  it("attaches to options, survives spreads, and resolves back", async () => {
    const recorder = new ToolExecutionRecorder();
    const options: Record<string, unknown> = { maxSteps: 3 };
    recorder.attachTo(options);
    const spread = { ...options, temperature: 0.1 };
    expect(ToolExecutionRecorder.from(spread)).toBe(recorder);
  });
});

describe("toToolExecutionRecords (legacy conversion)", () => {
  it("converts {name,input,output} entries with zero timing", () => {
    const records = toToolExecutionRecords([
      { name: "grep", input: { q: "a" }, output: { hits: 2 } },
    ]);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      toolName: "grep",
      params: { q: "a" },
      isError: false,
      startedAt: 0,
      durationMs: 0,
    });
    expect(records[0].resultText).toBe('{"hits":2}');
  });

  it("keeps timing/error info when the legacy entry carries it", () => {
    const [record] = toToolExecutionRecords([
      {
        name: "grep",
        input: {},
        output: { error: "denied" },
        durationMs: 42,
        startedAt: 1000,
      },
    ]);
    expect(record.durationMs).toBe(42);
    expect(record.startedAt).toBe(1000);
    expect(record.isError).toBe(true);
  });

  it("round-trips a canonical record losslessly (resultText preserved)", () => {
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
    expect(record).toMatchObject({
      toolName: "grep",
      params: { q: "x" },
      resultText: "captured result",
      isError: false,
      startedAt: 1000,
      durationMs: 42,
    });
  });
});

describe("resolveToolExecutionRecords", () => {
  it("prefers recorder records; falls back to legacy conversion", async () => {
    const recorder = new ToolExecutionRecorder();
    const options: Record<string, unknown> = {};
    recorder.attachTo(options);
    const tools = recorder.wrapTools({ t: makeTool(async () => "real") });
    await (tools.t as AnyTool).execute?.({}, {});

    const preferred = resolveToolExecutionRecords(options, [
      { name: "legacy", input: {}, output: "old" },
    ]);
    expect(preferred).toHaveLength(1);
    expect(preferred[0].toolName).toBe("t");

    const fallback = resolveToolExecutionRecords({}, [
      { name: "legacy", input: {}, output: "old" },
    ]);
    expect(fallback[0].toolName).toBe("legacy");
  });
});
