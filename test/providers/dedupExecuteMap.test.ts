import { describe, it, expect, vi } from "vitest";
import { DedupExecuteMap } from "../../src/lib/providers/googleNativeGemini3.js";

/**
 * BZ-3327: Gemini occasionally re-emits an identical tool call across agentic
 * steps even though the prior result is already in history, which produced
 * duplicate tool executions and duplicate reports. DedupExecuteMap caches the
 * result of each {tool name + args} per turn so identical re-requests reuse the
 * previous result instead of re-executing.
 */
describe("DedupExecuteMap — per-turn tool-call dedup (BZ-3327)", () => {
  it("executes the tool on first call and returns its result", async () => {
    const exec = vi.fn(async (args: Record<string, unknown>) => ({ ok: true, args }));
    const map = new DedupExecuteMap();
    map.set("report", exec as never);

    const result = await (map.get("report") as never as typeof exec)(
      { range: "7d" },
      {} as never,
    );

    expect(exec).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: true, args: { range: "7d" } });
  });

  it("reuses the cached result for an identical re-call without re-executing", async () => {
    const exec = vi.fn(async () => ({ value: 42 }));
    const map = new DedupExecuteMap();
    map.set("report", exec as never);
    const run = map.get("report") as never as typeof exec;

    const first = await run({}, {} as never);
    const second = await run({ x: 1 }, {} as never);
    const third = await run({ x: 1 }, {} as never);

    // first call ({}) and the ({x:1}) call execute; the second ({x:1}) is cached
    expect(exec).toHaveBeenCalledTimes(2);
    expect(third).toBe(second);
    expect(first).not.toBe(second);
  });

  it("re-executes when args differ", async () => {
    const exec = vi.fn(async (args: Record<string, unknown>) => ({ args }));
    const map = new DedupExecuteMap();
    map.set("report", exec as never);
    const run = map.get("report") as never as typeof exec;

    await run({ range: "7d" }, {} as never);
    await run({ range: "30d" }, {} as never);

    expect(exec).toHaveBeenCalledTimes(2);
  });

  it("treats identical args with different key order as the same call", async () => {
    const exec = vi.fn(async () => ({ ok: true }));
    const map = new DedupExecuteMap();
    map.set("report", exec as never);
    const run = map.get("report") as never as typeof exec;

    await run({ a: 1, b: { d: 4, c: 3 } }, {} as never);
    await run({ b: { c: 3, d: 4 }, a: 1 }, {} as never);

    expect(exec).toHaveBeenCalledTimes(1);
  });

  it("dedupes per tool name — different tools are independent", async () => {
    const execA = vi.fn(async () => "A");
    const execB = vi.fn(async () => "B");
    const map = new DedupExecuteMap();
    map.set("a", execA as never);
    map.set("b", execB as never);

    await (map.get("a") as never as typeof execA)({}, {} as never);
    await (map.get("b") as never as typeof execB)({}, {} as never);

    expect(execA).toHaveBeenCalledTimes(1);
    expect(execB).toHaveBeenCalledTimes(1);
  });

  it("returns undefined for an unknown tool (no wrapping)", () => {
    const map = new DedupExecuteMap();
    expect(map.get("missing")).toBeUndefined();
  });
});
