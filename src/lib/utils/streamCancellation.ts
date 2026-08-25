/**
 * Out-of-band cancellation for chained async streams.
 *
 * `AsyncGenerator.prototype.return()` is the obvious way to tell a stream its
 * consumer has gone away, and it does not work through a chain of generators.
 * The request is *queued* behind whatever `next()` is already in flight; it
 * cannot interrupt an `await`. A provider stream is wrapped several times
 * (lifecycle in `baseProvider`, MCP and pool wrappers in `neurolink`), and
 * during a pull every one of those layers is parked inside an `await` on the
 * layer below. So none of them can unwind, the innermost source is never
 * closed, and a teardown that waits for that to happen waits forever.
 *
 * This module is the side channel that does work. A wrapper registers a
 * cancel callback on the stream object it returns; the callback closes its own
 * upstream iterator and forwards the request further down. Because these are
 * ordinary function calls rather than generator protocol, they run immediately
 * — no queue, no dependence on any pending `next()` settling.
 *
 * Registration is optional and reading is defensive, so a stream that knows
 * nothing about this behaves exactly as it did before.
 */

const STREAM_CANCEL = Symbol.for("neurolink.streamCancel");

/**
 * Register `cancel` as `stream`'s teardown hook and return the same object.
 *
 * Non-enumerable so the property never shows up in spreads, `JSON.stringify`
 * or logging of a stream handle.
 */
export function attachStreamCancel<S extends object>(
  stream: S,
  cancel: () => void,
): S {
  Object.defineProperty(stream, STREAM_CANCEL, {
    value: cancel,
    enumerable: false,
    configurable: true,
    writable: true,
  });
  return stream;
}

/**
 * Invoke `stream`'s cancel hook if it has one.
 *
 * Never throws. This runs from `finally` blocks during teardown, where the
 * consumer has already stopped listening — an exception here would replace
 * whatever outcome the caller was actually returning with a cleanup error.
 */
export function cancelStream(stream: unknown): void {
  if (stream === null || stream === undefined) {
    return;
  }
  if (typeof stream !== "object" && typeof stream !== "function") {
    return;
  }
  try {
    // The property read is inside the try, not before it. Reading a symbol off
    // an arbitrary object can execute user code — a Proxy trap or a throwing
    // getter — and this function is documented as never throwing because it
    // runs from teardown `finally` blocks, where an exception would replace
    // the outcome the caller was actually returning with a cleanup error.
    const hook = (stream as Record<symbol, unknown>)[STREAM_CANCEL];
    if (typeof hook !== "function") {
      return;
    }
    (hook as () => void)();
  } catch {
    // Teardown is best-effort by definition.
  }
}

/**
 * Close `iterator` without waiting for it and without surfacing a rejection.
 *
 * Deliberately not awaited: on a generator that is parked mid-`await` this
 * promise may never settle, which is the whole failure this module exists to
 * avoid. The call still propagates whenever the iterator can act on it.
 */
export function releaseIterator(iterator: {
  return?: (value?: unknown) => unknown;
}): void {
  if (typeof iterator.return !== "function") {
    return;
  }
  try {
    const result = iterator.return(undefined);
    if (
      result &&
      typeof (result as Promise<unknown>).catch === "function" &&
      typeof (result as Promise<unknown>).then === "function"
    ) {
      void (result as Promise<unknown>).catch(() => {});
    }
  } catch {
    // Best-effort, as above.
  }
}
