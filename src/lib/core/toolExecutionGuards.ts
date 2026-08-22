/**
 * Guards applied around a single tool execution inside a native provider loop.
 *
 * Lives here rather than beside any one provider because it is used by all of
 * them: both Vertex+Claude loops call it directly, and the Gemini paths reach
 * it through `buildDedupedEngineTools`. It previously sat in
 * `providers/googleNativeGemini3/utils.ts`, which meant the Anthropic loops
 * imported a tool-execution primitive out of a Gemini module — accurate about
 * where it was written, misleading about what depends on it.
 *
 * Nothing in here is provider-specific: it takes an executor and a guards
 * object and returns a wrapped executor.
 */

import { raceWithAbort, withTimeout } from "../utils/async/index.js";
import type { Tool, ToolExecutionGuards } from "../types/index.js";

/**
 * Mid-turn tool sync for the native Gemini loops that build their snapshot
 * via buildNativeToolDeclarations. `search_tools` (tools.discovery) hydrates
 * discovered tools into the live record between steps; without this refresh
 * they stay invisible to the rest of the turn and every call dies as
 * TOOL_NOT_FOUND. Mutates the snapshot in place — the request config holds
 * `toolsConfig` by reference — and returns true when anything was added.
 */
/**
 * Everything a native Gemini loop wraps around a tool call that the shared
 * engine does not do itself.
 *
 * Order matters. `raceWithAbort` sits INSIDE `withTimeout` so a turn-level
 * abort is observed the moment it fires rather than after the tool settles,
 * and the timeout still bounds a tool that neither settles nor honours its
 * signal. The progress pings bracket the await because the stall watchdog is
 * a whole-turn interval comparing wall-clock against the last progress mark —
 * without them a legitimately slow tool reads as a stalled turn and is killed.
 *
 * Exported because a tool hydrated MID-TURN has to be wrapped the same way as
 * one declared up front; keeping this inline made the discovered tool the one
 * executor in the system that ran raw.
 */
export function guardToolExecutor(
  name: string,
  execute: NonNullable<Tool["execute"]>,
  guards: ToolExecutionGuards,
): (args: Record<string, unknown>, opts: unknown) => Promise<unknown> {
  return async (args: Record<string, unknown>, opts: unknown) => {
    const invoke = () =>
      Promise.resolve(execute(args, opts as Parameters<typeof execute>[1]));
    // The span wraps the CALL, not the guard: a timeout or an abort is a fact
    // about this tool invocation and belongs inside its observation.
    const wrapInSpan = guards.withToolSpan;
    const call = wrapInSpan ? () => wrapInSpan(name, invoke) : invoke;
    guards.onProgress?.();
    try {
      const raced = guards.abortSignal
        ? raceWithAbort(call(), guards.abortSignal)
        : call();
      return await (guards.toolTimeoutMs === undefined
        ? raced
        : withTimeout(
            raced,
            guards.toolTimeoutMs,
            `Tool "${name}" execution timed out after ${guards.toolTimeoutMs}ms`,
          ));
    } finally {
      // In `finally`, not after a successful await: a tool that times out or
      // throws has still consumed real time, and skipping the mark there would
      // leave the watchdog measuring from before the call.
      guards.onProgress?.();
    }
  };
}
