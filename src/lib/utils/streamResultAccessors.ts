/**
 * Helpers that keep lazily-populated StreamResult fields (`toolsUsed`,
 * `toolExecutions`, and any other field a provider defines via
 * `Object.defineProperty` with only a `get`) alive as the result object is
 * re-wrapped or narrowed while it travels from a provider's `stream()`
 * implementation up through BaseProvider and NeuroLink to the caller.
 *
 * A plain object spread (`{ ...result }`) or an object literal that reads
 * `result.someField` invokes any getter on `result` immediately and stores
 * the RETURNED VALUE as a static data property on the copy. For a
 * background-loop stream (native Vertex/Anthropic paths, and any
 * OpenAI-compatible provider that appends to `toolExecutionSummaries` while
 * the consumer drains the stream), that snapshot happens before a single
 * chunk has been pulled — so the copy is permanently frozen at empty/undefined
 * even though the source object goes on to reflect real values as the
 * background loop runs. Re-applying the ORIGINAL property descriptor (not
 * the value it currently returns) keeps the copy lazy: every later read on
 * the copy still calls the same getter, closing over the same live backing
 * state.
 */

/**
 * Re-apply every getter-defined accessor from `source` onto `target`,
 * in place. Plain data properties (arrays copied by reference, primitives)
 * are left untouched — an object spread already preserves those correctly,
 * since copying an array reference keeps observing later `.push()`es.
 */
export function preserveLiveStreamAccessors<T extends object>(
  source: T,
  target: T,
): T {
  for (const key of Object.getOwnPropertyNames(source)) {
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (descriptor && typeof descriptor.get === "function") {
      Object.defineProperty(target, key, descriptor);
    }
  }
  return target;
}

/**
 * Build a `PropertyDescriptorMap` carrying the named fields' descriptors
 * (data or accessor) from `source`, for use with `Object.defineProperties`
 * when constructing a NEW, narrower object at a boundary that lists an
 * explicit field set. Reading `source[key]` directly at such a boundary
 * (`target.toolsUsed = source.toolsUsed`) would invoke a getter immediately;
 * copying the descriptor instead defers that read to whoever accesses the
 * field on `target` later. Keys absent from `source` are omitted, matching
 * how an optional field would be omitted from a manual copy.
 */
export function pickLiveStreamDescriptors(
  source: object,
  keys: readonly string[],
): PropertyDescriptorMap {
  const descriptors: PropertyDescriptorMap = {};
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (descriptor) {
      descriptors[key] = descriptor;
    }
  }
  return descriptors;
}
