/**
 * The set of top-level branches on a `StreamOptions` / `GenerateOptions`
 * / `DynamicOptions` bag that downstream prep stages mutate. Listed here
 * once so the runtime clone (`cloneOptionsForCallIsolation`) and any
 * future test that wants to assert call isolation reference the same
 * source of truth.
 *
 * If you add a new top-level field to `StreamOptions` that gets mutated
 * by prepareStreamOptions / applyStreamOrchestration / RAG/MCP injection
 * / memory retrieval / etc., add it here AND add an entry to
 * `test/helpers/cloneOptions.test.ts` so the isolation guarantee gets
 * exercised.
 *
 * Branches that are deliberately NOT cloned (and why):
 *   - `signal` / `abortSignal` — `AbortSignal` can't be `structuredClone`d
 *     and a shallow copy would strip the listener wiring.
 *   - `tools[name].execute` — function identity is used as a cache key
 *     downstream; cloning would break that.
 *   - schema objects (zod / JSON Schema) — large, frequently frozen,
 *     and not mutated by NeuroLink internals.
 */
export const CLONE_MUTABLE_OPTION_BRANCHES = [
  "input",
  "context",
  "memory",
  "tools",
  "middleware",
  "rag",
  "csvOptions",
  "stt",
  "tts",
] as const;

/**
 * Defensive call-isolation clone for stream() / generate()-shaped inputs.
 *
 * Shallow-clones the top-level options bag plus every branch listed in
 * `CLONE_MUTABLE_OPTION_BRANCHES`. Caller-supplied objects can be reused
 * across calls without accumulating cross-call mutations from
 * prepareStreamOptions, applyStreamOrchestration, memory retrieval, or
 * RAG/MCP tool injection.
 *
 * Unclonable / by-reference values are deliberately kept by-reference —
 * cloning them would either fail outright (`structuredClone(AbortSignal)`)
 * or strip behavior (function identity used as a cache key).
 */
export function cloneOptionsForCallIsolation<T>(options: T): T {
  if (!options || typeof options !== "object") {
    return options;
  }
  const cloned = { ...(options as object) } as T;
  const o = cloned as Record<string, unknown>;
  for (const branch of CLONE_MUTABLE_OPTION_BRANCHES) {
    const value = o[branch];
    if (value && typeof value === "object") {
      o[branch] = Array.isArray(value)
        ? [...(value as unknown[])]
        : { ...(value as Record<string, unknown>) };
    }
  }
  return cloned;
}
