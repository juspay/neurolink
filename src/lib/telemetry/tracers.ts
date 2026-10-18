import {
  context,
  trace,
  type Context,
  type Exception,
  type Span,
  type SpanOptions,
  type Tracer,
} from "@opentelemetry/api";
import type { GenerationOperation } from "../types/index.js";
import { startTelemetry } from "./telemetryStarter.js";

const PRODUCT_NAME = /neurolink/gi;
const OPERATION_ROOT = /^(?:provider\.)?(generate|stream)(?:\.|$)/;
const TURN_NAME = /^(?:generate|stream)$/;
const operations = new WeakMap<Span, GenerationOperation>();
const nestedOperations = new WeakSet<Span>();
const turnlessTrees = new WeakSet<Span>();

function trackOperation(
  span: Span,
  name: string,
  scope: string,
  parent?: Span,
): Span {
  const root = OPERATION_ROOT.exec(name)?.[1] as
    | GenerationOperation
    | undefined;
  const parentOperation = parent && operations.get(parent);
  // A NeuroLink turn (a sub-agent a direct loop's tool runs) stops the loop's
  // turnless mark, so it and its generations stay nested and leave the
  // trace's input and output to the loop.
  const turnless =
    parent !== undefined &&
    turnlessTrees.has(parent) &&
    !(scope === "sdk" && TURN_NAME.test(name));
  if (root && parentOperation && !turnless) {
    nestedOperations.add(span);
  }
  if (turnless) {
    turnlessTrees.add(span);
  }
  const operation = root ?? parentOperation;
  if (operation) {
    operations.set(span, operation);
  }
  return span;
}

/**
 * @description Reads which public API call the active span belongs to, following the span's ancestry up to a `generate`, `stream`, `provider.generate` or `provider.stream` span.
 * @returns {GenerationOperation | undefined} The enclosing operation, or `undefined` when no such span is active.
 */
export function activeOperation(): GenerationOperation | undefined {
  const span = trace.getSpan(context.active());
  return span && operations.get(span);
}

/**
 * @description Reports whether a `generate` or `stream` span started inside another operation's span tree.
 * @param span {Span} - Span returned by a scrubbed tracer.
 * @returns {boolean} `true` when the span is nested in an enclosing operation, `false` for a trace root.
 */
export function isNestedOperation(span: Span): boolean {
  return nestedOperations.has(span);
}

/**
 * @description Reports whether a span belongs to the tree of a root a direct provider loop opened for itself, so neither a host span nor a NeuroLink turn sits above it.
 * @param span {Span} - Span returned by a scrubbed tracer.
 * @returns {boolean} `true` for that root and the spans started under it, apart from a NeuroLink turn's own subtree; `false` for everything under a host span or a turn.
 */
export function inTurnlessTree(span: Span): boolean {
  return turnlessTrees.has(span);
}

/**
 * @description Marks the root a direct provider loop opened for itself. It names the operation its steps belong to, but no NeuroLink turn sits above it and it records no input or output, so a generation under it is still the top owner of the trace's input and output and `isNestedOperation` stays `false` for it. A NeuroLink `generate` or `stream` turn started inside it, such as a sub-agent run by a tool, is not marked: that turn and its generations stay nested.
 * @param span {Span} - Root span returned by a scrubbed tracer, marked before any child is started.
 * @returns {Span} The same span.
 */
export function markTurnlessRoot(span: Span): Span {
  turnlessTrees.add(span);
  return span;
}

// An Error's name or message may be missing, not a string, or a getter that
// throws; recording the exception must not throw in its place.
function exceptionText(read: () => unknown, fallback: string): string {
  try {
    const value = read();
    return value === undefined || value === null ? fallback : String(value);
  } catch {
    return fallback;
  }
}

function scrubException(exception: Exception): Exception {
  if (!(exception instanceof Error)) {
    return typeof exception === "string"
      ? exception.replace(PRODUCT_NAME, "ai")
      : exception;
  }
  return {
    name: exceptionText(() => exception.name, "Error").replace(
      PRODUCT_NAME,
      "Ai",
    ),
    message: exceptionText(() => exception.message, "").replace(
      PRODUCT_NAME,
      "ai",
    ),
  };
}

function withScrubbedExceptions(span: Span): Span {
  const record = span.recordException.bind(span);
  span.recordException = (exception, time) =>
    record(scrubException(exception), time);
  return span;
}

/**
 * @description Resolves a tracer whose spans record exceptions as type and message only, without stack traces or product-name references that would reach trace backends as event metadata. Exception and status messages have credentials masked, like recorded input and output.
 * @param name {string} - Instrumentation scope name.
 * @returns {Tracer} A tracer delegating to the globally registered provider.
 */
export function scrubbedTracer(name: string): Tracer {
  const inner = trace.getTracer(name);
  return {
    startSpan: (spanName: string, options?: SpanOptions, ctx?: Context) => {
      startTelemetry();
      const span = withScrubbedExceptions(
        inner.startSpan(spanName, options, ctx),
      );
      return trackOperation(
        span,
        spanName,
        name,
        trace.getSpan(ctx ?? context.active()),
      );
    },
    startActiveSpan<F extends (span: Span) => ReturnType<F>>(
      spanName: string,
      arg2?: SpanOptions | F,
      arg3?: Context | F,
      arg4?: F,
    ): ReturnType<F> {
      startTelemetry();
      const fn = [arg4, arg3, arg2].find(
        (arg): arg is F => typeof arg === "function",
      ) as F;
      const options = typeof arg2 === "function" ? undefined : arg2;
      const ctx = typeof arg3 === "function" ? undefined : arg3;
      const parent = trace.getSpan(ctx ?? context.active());
      const wrapped = ((span: Span) =>
        fn(
          trackOperation(withScrubbedExceptions(span), spanName, name, parent),
        )) as F;
      if (ctx) {
        return inner.startActiveSpan(spanName, options ?? {}, ctx, wrapped);
      }
      return options
        ? inner.startActiveSpan(spanName, options, wrapped)
        : inner.startActiveSpan(spanName, wrapped);
    },
  };
}

/**
 * Pre-resolved tracers cached at module load.
 *
 * Module-load timing is intentional and safe: `trace.getTracer(name)` from
 * `@opentelemetry/api` always returns a proxy that defers to whatever
 * `TracerProvider` is registered globally at the moment a span is created.
 * If the OTel SDK initializes *after* this module is imported (the common
 * case — telemetry setup typically runs once at app boot, after lazy
 * imports have already pulled this file), the tracer reference is still
 * valid; spans created via it correctly route to the SDK once registered.
 *
 * Pre-SDK calls produce a noop span — `span.end()` etc. are valid; nothing
 * is exported. This is OTel's documented contract:
 * https://opentelemetry.io/docs/specs/otel/trace/api/#tracerprovider
 *
 * If a future refactor moves to a non-proxy TracerProvider API (e.g. a
 * custom provider where `getTracer` returns the live instance), revisit
 * this file and switch to lazy accessors.
 */
export const tracers = {
  sdk: scrubbedTracer("sdk"),
  provider: scrubbedTracer("provider"),
  generation: scrubbedTracer("generation"),
  decision: scrubbedTracer("decision"),
  stream: scrubbedTracer("stream"),
  http: scrubbedTracer("http"),
  mcp: scrubbedTracer("mcp"),
  memory: scrubbedTracer("memory"),
  redis: scrubbedTracer("redis"),
  factory: scrubbedTracer("factory"),
  rag: scrubbedTracer("rag"),
  context: scrubbedTracer("context"),
  middleware: scrubbedTracer("middleware"),
  processor: scrubbedTracer("processor"),
  file: scrubbedTracer("file"),
  autoresearch: scrubbedTracer("autoresearch"),
  auth: scrubbedTracer("auth"),
  workflow: scrubbedTracer("workflow"),
} as const;
