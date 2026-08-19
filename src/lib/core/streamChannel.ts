import type { StreamChannel } from "../types/index.js";

/**
 * Create a push-based channel bridging a background producer (an agentic
 * tool-calling loop) with an async-iterable consumer, enabling truly
 * incremental streaming: values are yielded to the caller as they arrive
 * rather than being buffered until the producer finishes.
 */
export function createStreamChannel<
  T = { content: string },
>(): StreamChannel<T> {
  const queue: T[] = [];
  let done = false;
  let fatalError: unknown = undefined;
  // Tracked separately from `fatalError`: a producer can legitimately
  // reject with `undefined` (e.g. `throw undefined`), and `fatalError !==
  // undefined` would then be indistinguishable from "no error occurred",
  // closing the stream cleanly instead of surfacing the failure.
  let hasError = false;
  let notify: (() => void) | null = null;

  function wake(): void {
    if (notify) {
      const fn = notify;
      notify = null;
      fn();
    }
  }

  function push(value: T): void {
    if (done) {
      return;
    }
    queue.push(value);
    wake();
  }

  function close(): void {
    done = true;
    wake();
  }

  function error(err: unknown): void {
    done = true;
    fatalError = err;
    hasError = true;
    wake();
  }

  let readIndex = 0;

  async function* iterable(): AsyncIterable<T> {
    try {
      while (true) {
        if (readIndex < queue.length) {
          yield queue[readIndex++];
          // Periodically compact consumed entries to avoid unbounded retention.
          if (readIndex > 1024 && readIndex * 2 >= queue.length) {
            queue.splice(0, readIndex);
            readIndex = 0;
          }
        } else if (done) {
          if (hasError) {
            throw fatalError instanceof Error
              ? fatalError
              : new Error(String(fatalError));
          }
          return;
        } else {
          await new Promise<void>((resolve) => {
            notify = resolve;
          });
        }
      }
    } finally {
      // Consumer stopped reading (disconnect/cancel): stop buffering.
      done = true;
      queue.length = 0;
      notify?.();
    }
  }

  return { push, close, error, iterable: iterable() };
}
