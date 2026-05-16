import { type Span, SpanKind, SpanStatusCode } from "@opentelemetry/api";
import type { SpanOptions } from "../types/index.js";

export async function withSpan<T>(
  options: SpanOptions,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  const { name, tracer, kind = SpanKind.INTERNAL, attributes } = options;
  return tracer.startActiveSpan(name, { kind }, async (span) => {
    if (attributes) {
      for (const [key, value] of Object.entries(attributes)) {
        if (value !== undefined) {
          span.setAttribute(key, value);
        }
      }
    }
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      if (error instanceof Error) {
        span.recordException(error);
      }
      throw error;
    } finally {
      span.end();
    }
  });
}

export async function withClientSpan<T>(
  options: Omit<SpanOptions, "kind">,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  return withSpan({ ...options, kind: SpanKind.CLIENT }, fn);
}

/**
 * Span wrapper for streaming operations.
 *
 * Unlike {@link withSpan}, which ends the span when `fn` resolves, this
 * helper extends the span's lifetime until the **consumer** of the returned
 * iterable reaches end-of-stream (success), throws (error), or aborts.
 *
 * Required for any operation whose result is a producer (`StreamResult`,
 * `AsyncIterable`-returning function, etc.) — ending the span on `fn`
 * resolution would capture only the setup phase and report zero tokens /
 * meaningless duration.
 *
 * @param options       Span options (name, tracer, attributes, kind).
 * @param fn            Callback that produces the result. Must NOT depend on
 *                      the iterable being consumed before returning.
 * @param getIterable   Selector that picks the `AsyncIterable` out of the
 *                      result for wrapping.
 * @param setIterable   Setter that returns a new result with the iterable
 *                      replaced by the wrapped (span-lifetime-extending)
 *                      iterable. Should be a pure function — clone the
 *                      result rather than mutating in place.
 *
 * @example
 * ```ts
 * return withStreamSpan(
 *   { name: "neurolink.provider.stream", tracer, attributes: {...} },
 *   async () => this.executeStreamInner(options),
 *   (r) => r.stream,
 *   (r, wrapped) => ({ ...r, stream: wrapped }),
 * );
 * ```
 */
export async function withStreamSpan<TResult, TChunk>(
  options: SpanOptions,
  fn: (span: Span) => Promise<TResult>,
  getIterable: (result: TResult) => AsyncIterable<TChunk>,
  setIterable: (result: TResult, wrapped: AsyncGenerator<TChunk>) => TResult,
): Promise<TResult> {
  const { name, tracer, kind = SpanKind.CLIENT, attributes } = options;
  const span = tracer.startSpan(name, { kind });
  if (attributes) {
    for (const [key, value] of Object.entries(attributes)) {
      if (value !== undefined) {
        span.setAttribute(key, value);
      }
    }
  }

  let result: TResult;
  try {
    result = await fn(span);
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    if (error instanceof Error) {
      span.recordException(error);
    }
    span.end();
    throw error;
  }

  // Setup succeeded. Now wrap the iterable so the span ends with the stream.
  const original = getIterable(result);
  let ended = false;
  const endOnce = (status?: {
    code: SpanStatusCode;
    message?: string;
  }): void => {
    if (ended) {
      return;
    }
    ended = true;
    if (status) {
      span.setStatus(status);
    } else {
      span.setStatus({ code: SpanStatusCode.OK });
    }
    span.end();
  };

  // Build an AsyncGenerator (not just an AsyncIterable) so the wrapped
  // value is structurally assignable wherever the original stream type
  // already expected `AsyncGenerator<X>` (e.g. Ollama's executeStream
  // returns `AsyncGenerator<{ content: string }>`).
  const wrapped: AsyncGenerator<TChunk> = (async function* () {
    try {
      for await (const chunk of original) {
        yield chunk;
      }
      endOnce();
    } catch (err) {
      // recordException must come BEFORE span.end() — OTel ignores events
      // on ended spans, so flipping the order silently drops the exception.
      if (err instanceof Error) {
        span.recordException(err);
      }
      endOnce({
        code: SpanStatusCode.ERROR,
        message: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  })();

  return setIterable(result, wrapped);
}

/** Convenience CLIENT-kind alias matching `withClientSpan`. */
export async function withClientStreamSpan<TResult, TChunk>(
  options: Omit<SpanOptions, "kind">,
  fn: (span: Span) => Promise<TResult>,
  getIterable: (result: TResult) => AsyncIterable<TChunk>,
  setIterable: (result: TResult, wrapped: AsyncGenerator<TChunk>) => TResult,
): Promise<TResult> {
  return withStreamSpan(
    { ...options, kind: SpanKind.CLIENT },
    fn,
    getIterable,
    setIterable,
  );
}
