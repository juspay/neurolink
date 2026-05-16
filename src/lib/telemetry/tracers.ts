import { trace } from "@opentelemetry/api";

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
  sdk: trace.getTracer("neurolink"),
  provider: trace.getTracer("neurolink.provider"),
  generation: trace.getTracer("neurolink.generation"),
  stream: trace.getTracer("neurolink.stream"),
  http: trace.getTracer("neurolink.http"),
  mcp: trace.getTracer("neurolink.mcp"),
  memory: trace.getTracer("neurolink.memory"),
  redis: trace.getTracer("neurolink.redis"),
  factory: trace.getTracer("neurolink.factory"),
  rag: trace.getTracer("neurolink.rag"),
  context: trace.getTracer("neurolink.context"),
  middleware: trace.getTracer("neurolink.middleware"),
  processor: trace.getTracer("neurolink.processor"),
  file: trace.getTracer("neurolink.file"),
  autoresearch: trace.getTracer("neurolink.autoresearch"),
  auth: trace.getTracer("neurolink.auth"),
  workflow: trace.getTracer("neurolink.workflow"),
} as const;
