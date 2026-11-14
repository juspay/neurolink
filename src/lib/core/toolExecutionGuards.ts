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

import {
  TimeoutError,
  abortSignalOf,
  createPausableDeadline,
  pauseDeadlineOf,
  raceWithAbort,
} from "../utils/async/index.js";
import { isNonNullObject } from "../utils/typeUtils.js";
import type {
  PauseDeadline,
  Tool,
  ToolExecutionGuards,
} from "../types/index.js";

/**
 * Everything a native provider loop wraps around a tool call that the shared
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
    guards.onProgress?.();
    try {
      // `== null` catches both an omitted bound and an explicit `null` — a
      // caller that asked for unbounded tool execution. Testing only for
      // `undefined` would arm a timer with no delay, which fires the deadline
      // immediately.
      if (guards.toolTimeoutMs === undefined || guards.toolTimeoutMs === null) {
        const call = Promise.resolve(
          execute(args, opts as Parameters<typeof execute>[1]),
        );
        return await (guards.abortSignal
          ? raceWithAbort(call, guards.abortSignal)
          : call);
      }
      return await runUnderDeadline(
        name,
        execute,
        args,
        opts,
        guards,
        guards.toolTimeoutMs,
      );
    } finally {
      // In `finally`, not after a successful await: a tool that times out or
      // throws has still consumed real time, and skipping the mark there would
      // leave the watchdog measuring from before the call.
      guards.onProgress?.();
    }
  };
}

/**
 * One guarded call under the per-tool deadline. The call runs with a signal of
 * its own, chained to the loop's (`opts.abortSignal`, `guards.abortSignal`),
 * and the deadline aborts it at the moment it rejects: one timer does both, so
 * the tool, its confirmation and `executeTool`'s attempts stop when the model
 * is told the call timed out, and nothing runs after that. This is what the
 * loop engine's `executeToolCall` already does with its own deadline.
 *
 * The call can pause the deadline (`pauseDeadline`) while it waits for a
 * human confirmation, and resuming keeps the time that was left. The pause
 * chains to the loop's own (`opts.pauseDeadline`): where a guard sits inside
 * the loop engine, as on the Vertex and AI Studio Gemini paths, both bounds
 * stop for the wait.
 */
async function runUnderDeadline(
  name: string,
  execute: NonNullable<Tool["execute"]>,
  args: Record<string, unknown>,
  opts: unknown,
  guards: ToolExecutionGuards,
  timeoutMs: number,
): Promise<unknown> {
  const toolAbort = new AbortController();
  const upstream = new Set(
    [abortSignalOf(opts), guards.abortSignal].filter(
      (signal): signal is AbortSignal => signal !== undefined,
    ),
  );
  const detach: Array<() => void> = [];
  for (const signal of upstream) {
    if (signal.aborted) {
      toolAbort.abort(signal.reason);
      continue;
    }
    const onAbort = (): void => toolAbort.abort(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    detach.push(() => signal.removeEventListener("abort", onAbort));
  }
  // Armed before the call starts, so its pause is in the options the call
  // receives.
  let rejectDeadline: (error: Error) => void = () => undefined;
  const deadline = new Promise<never>((_, reject) => {
    rejectDeadline = reject;
  });
  const clock = createPausableDeadline(timeoutMs, () => {
    const error = new TimeoutError(
      `Tool "${name}" execution timed out after ${timeoutMs}ms`,
      timeoutMs,
    );
    toolAbort.abort(error);
    rejectDeadline(error);
  });
  const outerPause = pauseDeadlineOf(opts);
  const pauseDeadline: PauseDeadline = () => {
    const resumeOwn = clock.pause();
    const resumeOuter = outerPause?.();
    return () => {
      resumeOuter?.();
      resumeOwn();
    };
  };

  const callOpts: unknown = {
    ...(isNonNullObject(opts) ? opts : {}),
    abortSignal: toolAbort.signal,
    pauseDeadline,
  };
  try {
    const call = Promise.resolve(
      execute(args, callOpts as Parameters<typeof execute>[1]),
    );
    const raced = guards.abortSignal
      ? raceWithAbort(call, guards.abortSignal)
      : call;
    // `Promise.race` subscribes to both, so a call that rejects after the
    // deadline already won cannot surface as an unhandled rejection.
    return await Promise.race([raced, deadline]);
  } finally {
    clock.clear();
    for (const off of detach) {
      off();
    }
  }
}
