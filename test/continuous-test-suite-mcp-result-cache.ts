#!/usr/bin/env tsx

/**
 * Continuous Test Suite — MCP Tool Result Cache Error Skipping (BZ-664 follow-up)
 *
 * The MCP tool result cache must NOT store error results. Caching one
 * (isError:true / success:false — an upstream 403 or timeout surfaced as a tool
 * error) replays that identical failure to every caller with the same args for
 * the whole TTL, turning a single transient upstream error into a storm of
 * cached failures and preventing a retry once the server recovers.
 *
 * Migrated from test/mcpResultCacheErrorSkip.test.ts — see CLAUDE.md: suites run
 * via tsx, not a Vitest runner. That file was referenced by no script, so none
 * of this had been executed since it was written.
 *
 * Run with: npx tsx test/continuous-test-suite-mcp-result-cache.ts
 */

import { NeuroLink } from "../src/lib/neurolink.js";
import { assert, assertEqual, defineSuite } from "./helpers/harness.js";
import { observe, stub, withStubs } from "./helpers/stubs.js";

const { test, runSuite } = defineSuite("MCP Result Cache Error Skipping");

type CacheLike = {
  cacheResult: (tool: string, args: unknown, result: unknown) => void;
  getCachedResult: (tool: string, args: unknown) => unknown;
};

type NeuroLinkInternals = {
  mcpToolResultCache?: CacheLike;
  externalServerManager: { executeTool: (...args: unknown[]) => unknown };
};

type Harness = {
  call: (tool: string, args: Record<string, unknown>) => Promise<unknown>;
  cacheWrites: () => number;
  upstreamCalls: () => number;
};

/**
 * Build a NeuroLink instance whose external MCP server returns `results` in
 * order (the last one repeating), with the cache write path observed.
 *
 * The real `ExternalServerManager.executeTool` is stubbed in place rather than
 * the manager being swapped out: swapping would orphan the manager the
 * constructor built, leaving its process/event listeners attached for the rest
 * of the suite because teardown would then run against the bare stub.
 */
async function withCacheHarness(
  results: unknown[],
  body: (harness: Harness) => Promise<void>,
): Promise<void> {
  // Empty config => the MCP result cache is enabled by default.
  const instance = new NeuroLink({});
  const internals = instance as unknown as NeuroLinkInternals;
  const cache = internals.mcpToolResultCache;
  if (!cache) {
    throw new Error("mcpToolResultCache was not constructed");
  }

  let index = 0;
  const upstream = stub(
    internals.externalServerManager as unknown as Record<string, unknown>,
    "executeTool",
    async () => results[Math.min(index++, results.length - 1)],
  );
  // observe(), not stub(): the real cacheResult must still populate the cache,
  // or the "served from cache" assertion below would fail for the wrong reason.
  const cacheWrite = observe(
    cache as unknown as Record<string, unknown>,
    "cacheResult",
  );

  try {
    return await withStubs([upstream, cacheWrite], () =>
      body({
        call: (tool, args) =>
          (
            instance as unknown as {
              executeExternalMCPTool: (
                s: string,
                t: string,
                a: Record<string, unknown>,
              ) => Promise<unknown>;
            }
          ).executeExternalMCPTool("srv", tool, args),
        cacheWrites: () => cacheWrite.callCount,
        upstreamCalls: () => upstream.callCount,
      }),
    );
  } finally {
    // The constructor spins up an ExternalServerManager, event emitters and
    // circuit breakers; dispose so listeners/timers don't leak across the suite.
    // Guarded because the teardown method name is version-tied.
    const disposable = instance as unknown as {
      dispose?: () => Promise<void> | void;
      shutdown?: () => Promise<void> | void;
    };
    await disposable.dispose?.();
    await disposable.shutdown?.();
  }
}

await test("does NOT cache a result with isError:true", () =>
  withCacheHarness(
    [{ isError: true, content: [{ type: "text", text: "403" }] }],
    async (h) => {
      await h.call("bb_search", { q: "x" });
      assertEqual(h.cacheWrites(), 0, "an isError result must not be cached");
    },
  ));

await test("does NOT cache a result with success:false", () =>
  withCacheHarness(
    [{ success: false, content: [{ type: "text", text: "boom" }] }],
    async (h) => {
      await h.call("bb_list", { p: "PROJ" });
      assertEqual(
        h.cacheWrites(),
        0,
        "a success:false result must not be cached",
      );
    },
  ));

await test("DOES cache a successful result and serves the 2nd identical call from cache", () =>
  withCacheHarness([{ content: [{ type: "text", text: "ok" }] }], async (h) => {
    // Proves the cache is functional end to end, not merely that cacheResult()
    // was invoked: the 2nd identical call must be served from cache, so the
    // external server is hit exactly once and both calls return the same value.
    const first = await h.call("bb_get", { path: "a.ts" });
    const second = await h.call("bb_get", { path: "a.ts" });
    assertEqual(h.upstreamCalls(), 1, "the 2nd call should not reach upstream");
    assertEqual(
      h.cacheWrites(),
      1,
      "the successful result should be cached once",
    );
    assertEqual(
      JSON.stringify(second),
      JSON.stringify(first),
      "the cached value should match the original",
    );
  }));

await test("does NOT cache an undefined result", () =>
  withCacheHarness([undefined], async (h) => {
    // undefined is a cache-read miss (`cached !== undefined`), so storing it is
    // a dead entry — the write side must skip it to stay symmetric with the read.
    await h.call("bb_none", { p: "x" });
    assertEqual(h.cacheWrites(), 0, "undefined must not be cached");
  }));

await test("re-executes (does not replay) after an error, so recovery is possible", () =>
  withCacheHarness(
    [
      { isError: true, content: [{ type: "text", text: "403" }] },
      { content: [{ type: "text", text: "recovered" }] },
    ],
    async (h) => {
      const first = (await h.call("bb_get", { path: "b.ts" })) as {
        isError?: boolean;
      };
      const second = (await h.call("bb_get", { path: "b.ts" })) as {
        content?: Array<{ text?: string }>;
      };
      // The error was not cached, so the identical second call re-hit the server
      // and got the recovered result instead of replaying the cached 403.
      assertEqual(h.upstreamCalls(), 2, "the 2nd call must re-hit upstream");
      assert(
        first?.isError === true,
        "the first call should surface the error",
      );
      assertEqual(
        second?.content?.[0]?.text,
        "recovered",
        "the second call should return the recovered result",
      );
    },
  ));

await runSuite();
