import { LangfuseOtelSpanAttributes } from "@langfuse/tracing";
import {
  context,
  type Span,
  SpanKind,
  type SpanStatus,
  SpanStatusCode,
  isSpanContextValid,
  trace,
} from "@opentelemetry/api";
import type {
  GenerationOperation,
  GenerationRecord,
  SpanOptions,
} from "../types/index.js";
import { isAbortError } from "../utils/errorHandling.js";
import { observe, observeGeneration } from "./observation.js";
import { generationName, stepSpanName } from "./observationNames.js";
import { markTurnlessRoot, tracers } from "./tracers.js";

// The thrown value is the caller's, and reading it can throw as well (a
// Proxy, a getter or toString that throws). Failure recording reads it through
// these, and whatever it still cannot record is skipped, so the caller always
// rethrows its own error.
function failureText(error: unknown): string {
  try {
    return String(error instanceof Error ? error.message : error);
  } catch {
    return "unreadable error";
  }
}

function readsAsAbort(error: unknown): boolean {
  try {
    return isAbortError(error);
  } catch {
    return false;
  }
}

export function markFailure(
  span: Span,
  error: unknown,
  expected = false,
): void {
  try {
    recordFailure(span, error, expected);
  } catch {
    // The span keeps whatever was recorded before the value could not be read.
  }
}

function recordFailure(span: Span, error: unknown, expected: boolean): void {
  const message = failureText(error);
  if (readsAsAbort(error)) {
    span.setAttributes({
      [LangfuseOtelSpanAttributes.OBSERVATION_LEVEL]: "WARNING",
      [LangfuseOtelSpanAttributes.OBSERVATION_STATUS_MESSAGE]: message,
    });
    return;
  }
  span.setStatus({ code: SpanStatusCode.ERROR, message });
  if (!expected) {
    span.setAttributes({
      [LangfuseOtelSpanAttributes.OBSERVATION_LEVEL]: "ERROR",
      [LangfuseOtelSpanAttributes.OBSERVATION_STATUS_MESSAGE]: message,
    });
  }
  if (error instanceof Error) {
    span.recordException(error);
  }
}

// A stream result its caller drops without reading it to the end or closing
// it can no longer end its span, so the span is ended here once the result is
// garbage collected. Best effort: collection may come late or never.
const droppedStreams = new FinalizationRegistry<Span>((span) => {
  try {
    if (span.isRecording()) {
      span.setAttributes({
        [LangfuseOtelSpanAttributes.OBSERVATION_LEVEL]: "WARNING",
        [LangfuseOtelSpanAttributes.OBSERVATION_STATUS_MESSAGE]:
          "stream dropped before it was read to the end",
      });
      span.end();
    }
  } catch {
    // A finalizer has no caller to report to.
  }
});

/**
 * @description Ends `span` at WARNING once `stream` is garbage collected while the span is still open, for a stream result whose caller dropped it without reading it to the end or closing it. Best effort: it runs only if and when the collector reclaims `stream`, and a span that already ended is left alone.
 * @param stream {object} - The iterable handed to the caller; `span` must not keep it reachable.
 * @param span {Span} - Span that reading or closing `stream` would have ended.
 * @returns {void} Nothing.
 */
export function endSpanWhenDropped(stream: object, span: Span): void {
  droppedStreams.register(stream, span);
}

function startsOrphanedRoot(options: SpanOptions): boolean {
  if (!options.detached || !options.rootWhenOrphaned) {
    return false;
  }
  const active = trace.getSpan(context.active());
  return !active || !isSpanContextValid(active.spanContext());
}

export async function withSpan<T>(
  options: SpanOptions,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  const {
    name,
    tracer,
    kind = SpanKind.INTERNAL,
    attributes,
    detached,
    observationType,
  } = options;
  const asRoot = startsOrphanedRoot(options);
  const run = async (span: Span): Promise<T> => {
    if (asRoot) {
      markTurnlessRoot(span);
      observe(span, "agent", {});
    } else if (observationType) {
      observe(span, observationType, {});
    }
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
      markFailure(span, error, options.expectedFailure?.(error));
      throw error;
    } finally {
      span.end();
    }
  };
  return detached && !asRoot
    ? run(tracer.startSpan(name, { kind }))
    : tracer.startActiveSpan(name, { kind }, run);
}

export async function withClientSpan<T>(
  options: Omit<SpanOptions, "kind">,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  return withSpan({ ...options, kind: SpanKind.CLIENT }, fn);
}

/**
 * @description Wraps a streaming operation in a span that stays open until the consumer reaches end-of-stream, throws, or closes the iterable, so the span covers the whole stream rather than only its setup.
 * @param options {SpanOptions} - Span name, tracer, kind and initial attributes.
 * @param fn {(span: Span) => Promise<TResult>} - Produces the result; must not depend on the iterable being consumed before returning.
 * @param getIterable {(result: TResult) => AsyncIterable<TChunk>} - Selects the iterable to wrap out of the result.
 * @param setIterable {(result: TResult, wrapped: AsyncIterableIterator<TChunk>) => TResult} - Returns a new result carrying the wrapped iterable; must clone rather than mutate.
 * @returns {Promise<TResult>} The result with its iterable replaced by the span-lifetime-extending one.
 * @example
 * ```ts
 * return withStreamSpan(
 *   { name: "provider.stream", tracer, attributes: {...} },
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
  setIterable: (
    result: TResult,
    wrapped: AsyncIterableIterator<TChunk>,
  ) => TResult,
): Promise<TResult> {
  const {
    name,
    tracer,
    kind = SpanKind.CLIENT,
    attributes,
    detached,
    observationType,
  } = options;
  const asRoot = startsOrphanedRoot(options);
  const span = tracer.startSpan(name, { kind });
  if (asRoot) {
    markTurnlessRoot(span);
    observe(span, "agent", {});
  } else if (observationType) {
    observe(span, observationType, {});
  }
  if (attributes) {
    for (const [key, value] of Object.entries(attributes)) {
      if (value !== undefined) {
        span.setAttribute(key, value);
      }
    }
  }
  const spanContext =
    detached && !asRoot
      ? context.active()
      : trace.setSpan(context.active(), span);

  let result: TResult;
  try {
    result = await context.with(spanContext, () => fn(span));
  } catch (error) {
    markFailure(span, error);
    span.end();
    throw error;
  }

  let iterator: AsyncIterator<TChunk>;
  try {
    iterator = getIterable(result)[Symbol.asyncIterator]();
  } catch (error) {
    markFailure(span, error);
    span.end();
    throw error;
  }
  let ended = false;
  let started = false;
  function end(status?: SpanStatus): void {
    if (ended) {
      return;
    }
    ended = true;
    if (status) {
      span.setStatus(status);
    }
    span.end();
  }
  async function close(): Promise<void> {
    if (ended) {
      return;
    }
    span.setAttributes({
      [LangfuseOtelSpanAttributes.OBSERVATION_LEVEL]: "WARNING",
      [LangfuseOtelSpanAttributes.OBSERVATION_STATUS_MESSAGE]: started
        ? "stream closed early"
        : "stream closed before first chunk",
    });
    end();
    await iterator.return?.();
  }

  const wrapped: AsyncIterableIterator<TChunk> = {
    async next(): Promise<IteratorResult<TChunk>> {
      if (ended) {
        return { done: true, value: undefined };
      }
      started = true;
      try {
        const step = await context.with(spanContext, () => iterator.next());
        if (step.done) {
          end({ code: SpanStatusCode.OK });
          return { done: true, value: undefined };
        }
        return step;
      } catch (err) {
        // A return() that raced this pull has already ended the span.
        if (!ended) {
          markFailure(span, err);
          end();
        }
        throw err;
      }
    },
    async return(): Promise<IteratorResult<TChunk>> {
      await close();
      return { done: true, value: undefined };
    },
    async throw(error: Error): Promise<IteratorResult<TChunk>> {
      const forward = iterator.throw;
      if (ended || forward === undefined) {
        await close();
        throw error;
      }
      try {
        const step = await context.with(spanContext, () =>
          forward.call(iterator, error),
        );
        if (step.done) {
          end({ code: SpanStatusCode.OK });
        }
        return step;
      } catch (err) {
        if (!ended) {
          markFailure(span, err);
          end();
        }
        throw err;
      }
    },
    [Symbol.asyncIterator]() {
      return wrapped;
    },
  };
  endSpanWhenDropped(wrapped, span);

  return setIterable(result, wrapped);
}

/**
 * @description Runs one model request inside a Langfuse generation span, recording the request half before `fn` runs. `fn` records the response half with `observeGeneration`; errors mark the span ERROR.
 * @param request {GenerationRecord} - Provider, model, parameters and input sent.
 * @param fn {(span: Span) => Promise<T>} - Issues the request and returns its result.
 * @returns {Promise<T>} Whatever `fn` resolves to.
 */
export async function withGeneration<T>(
  request: GenerationRecord,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  return withSpan(
    {
      name: generationName(request.operation),
      tracer: tracers.generation,
      kind: SpanKind.CLIENT,
    },
    async (span) => {
      observeGeneration(span, request);
      return fn(span);
    },
  );
}

/** Convenience CLIENT-kind alias matching `withClientSpan`. */
export async function withClientStreamSpan<TResult, TChunk>(
  options: Omit<SpanOptions, "kind">,
  fn: (span: Span) => Promise<TResult>,
  getIterable: (result: TResult) => AsyncIterable<TChunk>,
  setIterable: (
    result: TResult,
    wrapped: AsyncIterableIterator<TChunk>,
  ) => TResult,
): Promise<TResult> {
  return withStreamSpan(
    { ...options, kind: SpanKind.CLIENT },
    fn,
    getIterable,
    setIterable,
  );
}

/**
 * @description Runs `fn` inside a `step` span, for a single model call that belongs to a step outside the shared loop, such as a forced finalization request.
 * @param stepNumber {number} - One-based step number within the turn.
 * @param fn {() => Promise<T>} - The step's work.
 * @returns {Promise<T>} Whatever `fn` resolves to.
 */
export async function withStepSpan<T>(
  stepNumber: number,
  fn: () => Promise<T>,
): Promise<T> {
  return withSpan(
    { name: stepSpanName(), tracer: tracers.sdk },
    async (span) => {
      observe(span, "span", { metadata: { step_index: stepNumber } });
      return fn();
    },
  );
}

/**
 * @description Groups the observations of each agentic loop step under one `step` span. Call `begin` at the top of a step, run the step's model call and tool dispatch through `run`, and `end` when the loop is over; `begin` closes the previous step.
 */
export class StepSpans {
  private current: Span | undefined;
  private root: Span | undefined;

  /**
   * @param operation {GenerationOperation} - Public API the loop serves, naming the root opened when no span is active; inferred from the enclosing span when unset, `generate` when there is none.
   */
  constructor(private readonly operation?: GenerationOperation) {}

  /**
   * @description Closes the previous step and opens `step` under the active span. When no span is active, the first step also opens a `generate` or `stream` root, so a loop run outside NeuroLink and outside any host span stays in one trace instead of starting a trace per step.
   * @param stepNumber {number} - One-based step number within the turn.
   * @returns {void} Nothing.
   */
  begin(stepNumber: number): void {
    this.endStep();
    this.root ??= this.startOrphanedRoot();
    this.current = tracers.sdk.startSpan(
      stepSpanName(),
      { kind: SpanKind.INTERNAL },
      this.root ? trace.setSpan(context.active(), this.root) : undefined,
    );
    observe(this.current, "span", { metadata: { step_index: stepNumber } });
  }

  /**
   * @description Runs `fn` with the open step as the active span, so the observations it creates become the step's children.
   * @param fn {() => T} - Work belonging to the current step.
   * @returns {T} Whatever `fn` returns.
   */
  run<T>(fn: () => T): T {
    const step = this.current;
    return step
      ? context.with(trace.setSpan(context.active(), step), fn)
      : fn();
  }

  /**
   * @description Closes the open step, and the root when this loop opened one.
   * @returns {void} Nothing.
   */
  end(): void {
    this.endStep();
    this.root?.end();
    this.root = undefined;
  }

  private endStep(): void {
    this.current?.end();
    this.current = undefined;
  }

  private startOrphanedRoot(): Span | undefined {
    const active = trace.getSpan(context.active());
    if (active && isSpanContextValid(active.spanContext())) {
      return undefined;
    }
    const root = markTurnlessRoot(
      tracers.sdk.startSpan(generationName(this.operation), {
        kind: SpanKind.INTERNAL,
      }),
    );
    observe(root, "agent", {});
    return root;
  }
}
