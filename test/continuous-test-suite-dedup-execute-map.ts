#!/usr/bin/env tsx

/**
 * Continuous Test Suite — DedupExecuteMap (BZ-3327)
 *
 * Gemini occasionally re-emits an identical tool call across agentic steps even
 * though the prior result is already in history, which produced duplicate tool
 * executions and duplicate reports. DedupExecuteMap caches the result of each
 * {tool name + args} per turn so an identical re-request reuses the previous
 * result instead of re-executing.
 *
 * Migrated from test/providers/dedupExecuteMap.test.ts — see CLAUDE.md: suites
 * run via tsx, not a Vitest runner. That file had been dead since the provider
 * modularization turned `providers/googleNativeGemini3.ts` into a directory:
 * its import no longer resolved (ESM has no directory-index fallback), so the
 * file failed to load. It was also wired into no script at all, so nothing
 * reported the breakage. The import now points at the directory's index.
 *
 * Run with: npx tsx test/continuous-test-suite-dedup-execute-map.ts
 */

import { DedupExecuteMap } from "../src/lib/providers/googleNativeGemini3/index.js";
import type { Tool } from "../src/lib/types/index.js";
import { assert, assertEqual, defineSuite } from "./helpers/harness.js";
import { spy } from "./helpers/stubs.js";

const { test, runSuite } = defineSuite("DedupExecuteMap (BZ-3327)");

/** The shape the map stores: an execute(args, ctx) callback. */
type ExecuteFn = (
  args: Record<string, unknown>,
  ctx: unknown,
) => Promise<unknown>;

/** Install a recording execute under `name` and hand back the wrapped one. */
function mapWith(name: string, impl: ExecuteFn) {
  const recorded = spy(impl);
  const map = new DedupExecuteMap();
  map.set(name, recorded.fn as unknown as Tool["execute"]);
  const run = map.get(name) as unknown as ExecuteFn;
  assert(run !== undefined, `map.get("${name}") must return the wrapper`);
  return { map, run, recorded };
}

await test("executes the tool on the first call and returns its result", async () => {
  const { run, recorded } = mapWith("report", async (args) => ({
    ok: true,
    args,
  }));

  const result = await run({ range: "7d" }, {});

  assertEqual(recorded.callCount, 1, "the tool must actually run once");
  assertEqual(
    JSON.stringify(result),
    JSON.stringify({ ok: true, args: { range: "7d" } }),
    "the tool's own result must come back unchanged",
  );
});

await test("reuses the cached result for an identical re-call without re-executing", async () => {
  const { run, recorded } = mapWith("report", async () => ({ value: 42 }));

  const first = await run({}, {});
  const second = await run({ x: 1 }, {});
  const third = await run({ x: 1 }, {});

  assertEqual(
    recorded.callCount,
    2,
    "{} and {x:1} each execute; the repeat of {x:1} must not",
  );
  assert(third === second, "the repeat must return the very same object");
  assert(first !== second, "different args must not share a cached result");
});

await test("re-executes when the args differ", async () => {
  const { run, recorded } = mapWith("report", async (args) => ({ args }));

  await run({ range: "7d" }, {});
  await run({ range: "30d" }, {});

  assertEqual(recorded.callCount, 2, "distinct args must each execute");
});

await test("treats identical args with different key order as the same call", async () => {
  // Gemini does not guarantee key order between re-emissions, so a naive
  // JSON.stringify cache key would miss the duplicate this exists to catch.
  const { run, recorded } = mapWith("report", async () => ({ ok: true }));

  await run({ a: 1, b: { d: 4, c: 3 } }, {});
  await run({ b: { c: 3, d: 4 }, a: 1 }, {});

  assertEqual(
    recorded.callCount,
    1,
    "key order must not change the cache key, nested objects included",
  );
});

await test("dedupes per tool name — different tools stay independent", async () => {
  const a = mapWith("a", async () => "A");
  const execB = spy(async () => "B");
  a.map.set("b", execB.fn as unknown as Tool["execute"]);
  const runB = a.map.get("b") as unknown as ExecuteFn;

  await a.run({}, {});
  await runB({}, {});

  assertEqual(a.recorded.callCount, 1, "tool a must run once");
  assertEqual(
    execB.callCount,
    1,
    "tool b must run too — identical args on a DIFFERENT tool is not a dupe",
  );
});

await test("returns undefined for an unknown tool, with no wrapping", () => {
  const map = new DedupExecuteMap();
  assertEqual(
    map.get("missing"),
    undefined,
    "an absent tool must stay absent rather than become a wrapper",
  );
});

await runSuite();
