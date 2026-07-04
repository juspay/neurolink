/**
 * BZ-664 follow-up: the MCP tool result cache must NOT store error results.
 *
 * Caching an error result (isError:true / success:false — e.g. an upstream 403
 * or timeout surfaced as a tool error) replays that identical failure to every
 * caller with the same args for the whole TTL, turning a single transient
 * upstream error into a storm of cached failures and preventing a retry from
 * re-hitting the server once it recovers.
 *
 * These tests drive `executeExternalMCPTool` with a stubbed external server and
 * assert the cache stores successful results but skips error results.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

type CacheLike = {
  cacheResult: (tool: string, args: unknown, result: unknown) => void;
  getCachedResult: (tool: string, args: unknown) => unknown;
};

type NeuroLinkInternals = {
  mcpToolResultCache?: CacheLike;
  externalServerManager: { executeTool: ReturnType<typeof vi.fn> };
};

describe("MCP tool result cache — error results are not cached (BZ-664 follow-up)", () => {
  let instance: unknown;
  let internals: NeuroLinkInternals;
  let cacheSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    const { NeuroLink } = await import("../src/lib/neurolink.js");
    // Empty config => MCP result cache is enabled by default (mcp.cache.enabled !== false).
    instance = new NeuroLink({});
    internals = instance as unknown as NeuroLinkInternals;

    // Spy on the REAL ExternalServerManager.executeTool instead of swapping the
    // whole instance out. Swapping would orphan the manager the constructor built
    // — its process/event listeners would stay attached for the rest of the suite,
    // because afterEach's dispose()/shutdown() would then run against the bare stub.
    // Spying keeps the single real instance, so teardown actually reaches it.
    vi.spyOn(
      internals.externalServerManager as unknown as {
        executeTool: (...args: unknown[]) => unknown;
      },
      "executeTool",
    ).mockResolvedValue(undefined);

    expect(internals.mcpToolResultCache).toBeDefined();
    cacheSpy = vi.spyOn(
      internals.mcpToolResultCache as CacheLike,
      "cacheResult",
    );
  });

  afterEach(async () => {
    // The NeuroLink constructor spins up an ExternalServerManager, event emitters
    // and circuit breakers; dispose the instance so listeners/timers don't leak
    // across the suite. Guarded because the teardown method name is version-tied.
    const disposable = instance as {
      dispose?: () => Promise<void> | void;
      shutdown?: () => Promise<void> | void;
    };
    await disposable.dispose?.();
    await disposable.shutdown?.();
    vi.restoreAllMocks();
  });

  const call = (tool: string, args: Record<string, unknown>) =>
    (
      instance as {
        executeExternalMCPTool: (
          s: string,
          t: string,
          a: Record<string, unknown>,
        ) => Promise<unknown>;
      }
    ).executeExternalMCPTool("srv", tool, args);

  it("does NOT cache a result with isError:true", async () => {
    internals.externalServerManager.executeTool.mockResolvedValue({
      isError: true,
      content: [{ type: "text", text: "Permission denied (403)" }],
    });

    await call("bb_search", { q: "x" });

    expect(cacheSpy).not.toHaveBeenCalled();
  });

  it("does NOT cache a result with success:false", async () => {
    internals.externalServerManager.executeTool.mockResolvedValue({
      success: false,
      content: [{ type: "text", text: "boom" }],
    });

    await call("bb_list", { p: "PROJ" });

    expect(cacheSpy).not.toHaveBeenCalled();
  });

  it("DOES cache a successful result and serves the 2nd identical call from cache", async () => {
    const executeTool = internals.externalServerManager.executeTool;
    executeTool.mockResolvedValue({
      content: [{ type: "text", text: "ok" }],
    });

    const first = await call("bb_get", { path: "a.ts" });
    const second = await call("bb_get", { path: "a.ts" });

    // Proves the cache is functional end-to-end, not just that cacheResult() was
    // invoked: the 2nd identical call must be served from cache, so the external
    // server is hit exactly once and both calls return the same value.
    expect(executeTool).toHaveBeenCalledTimes(1);
    expect(cacheSpy).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it("does NOT cache an undefined result", async () => {
    internals.externalServerManager.executeTool.mockResolvedValue(undefined);

    await call("bb_none", { p: "x" });

    // undefined is a cache-read miss (`cached !== undefined`), so storing it is a
    // dead entry — the write side must skip it to stay symmetric with the read.
    expect(cacheSpy).not.toHaveBeenCalled();
  });

  it("re-executes (does not replay) after an error, so recovery is possible", async () => {
    const executeTool = internals.externalServerManager.executeTool;
    // First call fails (403), second call — same args — succeeds.
    executeTool
      .mockResolvedValueOnce({
        isError: true,
        content: [{ type: "text", text: "403" }],
      })
      .mockResolvedValueOnce({
        content: [{ type: "text", text: "recovered" }],
      });

    const first = await call("bb_get", { path: "b.ts" });
    const second = await call("bb_get", { path: "b.ts" });

    // The error was not cached, so the identical second call re-hit the server
    // and got the recovered result instead of replaying the cached 403.
    expect(executeTool).toHaveBeenCalledTimes(2);
    expect(first).toMatchObject({ isError: true });
    expect(second).toMatchObject({
      content: [{ type: "text", text: "recovered" }],
    });
  });
});
