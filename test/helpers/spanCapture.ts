/**
 * Real OpenTelemetry capture helper.
 *
 * Registers a NodeTracerProvider with InMemorySpanExporter BEFORE NeuroLink
 * is imported, so production tracers pick it up. InMemorySpanExporter is a
 * standard `@opentelemetry/sdk-trace-base` exporter — captures every span
 * the production code actually emits. Not a mock.
 *
 * IMPORTANT: callers must `installSpanCapture()` BEFORE importing NeuroLink
 * from `dist/`.
 */
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import type { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

export type SpanCapture = {
  finished(): ReadableSpan[];
  byName(name: string): ReadableSpan | undefined;
  allByName(name: string): ReadableSpan[];
  reset(): void;
};

let installed = false;
let exporter: InMemorySpanExporter | null = null;

/**
 * One-shot install: the first call registers a NodeTracerProvider with the
 * shared in-memory exporter; subsequent calls return additional handles to
 * the *same* exporter. That means calling `.reset()` on any handle clears
 * spans for every other handle in the process — keep one handle per suite
 * and reset between tests.
 */
export function installSpanCapture(): SpanCapture {
  if (!installed) {
    exporter = new InMemorySpanExporter();
    const provider = new NodeTracerProvider({
      spanProcessors: [new SimpleSpanProcessor(exporter)],
    });
    provider.register();
    installed = true;
  }
  if (!exporter) {
    throw new Error("span capture not installed");
  }
  // Snapshot the module-level exporter into a local const so the closure
  // doesn't need non-null assertions on every method call.
  const captured = exporter;
  return {
    finished: () => captured.getFinishedSpans(),
    byName: (n) => captured.getFinishedSpans().find((s) => s.name === n),
    allByName: (n) => captured.getFinishedSpans().filter((s) => s.name === n),
    reset: () => captured.reset(),
  };
}

export function dumpAttrs(span: ReadableSpan): Record<string, unknown> {
  return { ...span.attributes };
}
