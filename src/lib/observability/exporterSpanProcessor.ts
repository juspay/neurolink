import { getPropagatedAttributesFromContext } from "@langfuse/core";
import { type Context, SpanStatusCode } from "@opentelemetry/api";
import type {
  ReadableSpan,
  Span,
  SpanProcessor as OtelSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import {
  INTERNAL_SPAN_ATTRIBUTE,
  MAX_REMEMBERED_SPANS,
  PROXY_TRACER_SCOPE,
} from "../constants/telemetry.js";
import type {
  ExporterSpanProcessorOptions,
  LegacyReadableSpan,
  SpanData,
  SpanScope,
} from "../types/index.js";
import { SpanStatus, SpanType } from "../types/index.js";
import { logger } from "../utils/logger.js";
import type { ExporterRegistry } from "./exporterRegistry.js";
import { getExporterRegistry } from "./exporterRegistry.js";

const LANGFUSE_OBSERVATION_TYPE = "langfuse.observation.type";
const GEN_AI_OBSERVATION_TYPE = "gen_ai.observation.type";
const GEN_AI_OPERATION = "gen_ai.operation.name";

const OBSERVATION_SPAN_TYPES: Record<string, SpanType> = {
  agent: SpanType.AGENT_RUN,
  tool: SpanType.TOOL_CALL,
  chain: SpanType.WORKFLOW_STEP,
  retriever: SpanType.RETRIEVAL,
  evaluator: SpanType.EVALUATION,
  embedding: SpanType.EMBEDDING,
};

// OpenTelemetry SDK 1.x spans expose `parentSpanId` and `instrumentationLibrary`;
// 2.x replaced them with `parentSpanContext` and `instrumentationScope`.
function legacy(span: ReadableSpan): LegacyReadableSpan {
  return span as ReadableSpan & LegacyReadableSpan;
}

function parentIdOf(span: ReadableSpan): string | undefined {
  return span.parentSpanContext?.spanId ?? legacy(span).parentSpanId;
}

function scopeOf(span: ReadableSpan): SpanScope | undefined {
  const scope =
    span.instrumentationScope ?? legacy(span).instrumentationLibrary;
  return (
    scope && {
      name: scope.name,
      ...(scope.version && { version: scope.version }),
    }
  );
}

function isObservation(span: ReadableSpan): boolean {
  return (
    span.attributes[LANGFUSE_OBSERVATION_TYPE] !== undefined ||
    span.attributes[GEN_AI_OBSERVATION_TYPE] !== undefined ||
    // The proxy writes gen_ai.* keys on its spans for collectors; of those
    // spans only the ones it marks with observe() are observations.
    (scopeOf(span)?.name !== PROXY_TRACER_SCOPE &&
      Object.keys(span.attributes).some((key) => key.startsWith("gen_ai.")))
  );
}

// Only observations are exported, whatever tracer scope they come from: a
// scope name is not NeuroLink's alone (a host can create a tracer called
// "http" or "rag"), and the helper spans of NeuroLink's own tracers (http,
// mcp, memory, file and the rest) were never sent. Wrapper spans marked
// internal are never exported, observation or not.
function isExported(span: ReadableSpan): boolean {
  return (
    span.attributes[INTERNAL_SPAN_ATTRIBUTE] !== true && isObservation(span)
  );
}

function spanTypeOf(span: ReadableSpan): SpanType {
  const observationType = String(
    span.attributes[LANGFUSE_OBSERVATION_TYPE] ?? "",
  ).toLowerCase();
  if (observationType === "generation") {
    return span.attributes[GEN_AI_OPERATION] === "decide"
      ? SpanType.MODEL_DECISION
      : SpanType.MODEL_GENERATION;
  }
  return OBSERVATION_SPAN_TYPES[observationType] ?? SpanType.CUSTOM;
}

const STATUS_BY_CODE: Record<SpanStatusCode, SpanStatus> = {
  [SpanStatusCode.UNSET]: SpanStatus.UNSET,
  [SpanStatusCode.OK]: SpanStatus.OK,
  [SpanStatusCode.ERROR]: SpanStatus.ERROR,
};

function toMillis(time: ReadableSpan["startTime"]): number {
  return time[0] * 1_000 + time[1] / 1_000_000;
}

function toIso(time: ReadableSpan["startTime"]): string {
  return new Date(toMillis(time)).toISOString();
}

function toNanos(time: ReadableSpan["startTime"]): string {
  return (BigInt(time[0]) * 1_000_000_000n + BigInt(time[1])).toString();
}

function toSpanData(span: ReadableSpan, parentSpanId?: string): SpanData {
  const { traceId, spanId } = span.spanContext();
  const scope = scopeOf(span);
  return {
    spanId,
    traceId,
    ...(parentSpanId && { parentSpanId }),
    type: spanTypeOf(span),
    name: span.name,
    startTime: toIso(span.startTime),
    endTime: toIso(span.endTime),
    startTimeUnixNano: toNanos(span.startTime),
    endTimeUnixNano: toNanos(span.endTime),
    durationMs: toMillis(span.duration),
    kind: span.kind,
    ...(span.resource?.attributes && {
      resource: { ...span.resource.attributes },
    }),
    ...(scope && { scope }),
    status: STATUS_BY_CODE[span.status.code],
    ...(span.status.message && { statusMessage: span.status.message }),
    attributes: { ...span.attributes },
    events: span.events.map((event) => ({
      name: event.name,
      timestamp: toIso(event.time),
      timestampUnixNano: toNanos(event.time),
      ...(event.attributes && { attributes: { ...event.attributes } }),
    })),
    links: span.links.map((link) => ({
      traceId: link.context.traceId,
      spanId: link.context.spanId,
      ...(link.attributes && { attributes: { ...link.attributes } }),
    })),
  };
}

/**
 * @description OpenTelemetry span processor that turns every observation span into `SpanData` and hands it to an `ExporterRegistry`, so one instrumentation feeds Langfuse, Datadog, Sentry and every other registered exporter. Spans that are not observations (health checks, auth, middleware, NeuroLink's helper spans), wrapper spans marked `langfuse.internal` and spans from other libraries are skipped and their children are re-parented onto the nearest exported ancestor. `shutdown()` shuts the registry's exporters down, as it always did, unless the processor was created to leave them running. Parent ids are read from OpenTelemetry SDK 2.x (`parentSpanContext`) and 1.x (`parentSpanId`) spans alike. At most `MAX_REMEMBERED_SPANS` open and ended spans are remembered for re-parenting; an ancestor of a span that is still open is kept past that limit. Delivery never blocks the span's thread, and a span that cannot be converted is skipped without throwing into the code that ended it.
 */
export class ExporterSpanProcessor implements OtelSpanProcessor {
  private readonly open = new Map<string, ReadableSpan>();
  private readonly ended = new Map<
    string,
    { parentSpanId?: string; exported: boolean }
  >();
  // Holds per span id: one for each child that is open or still holds its own
  // children. An ended span with holds stays resolvable, and keeps its parent
  // held, until the last open descendant ends, however many unrelated spans
  // end in between.
  private readonly pins = new Map<string, number>();
  private evictionLogged = false;

  /**
   * @description Creates a processor bound to a registry.
   * @param registry {ExporterRegistry} - Registry that receives every exported span.
   * @param shutsDownExporters {boolean} - Whether `shutdown()` also shuts down the registry's exporters; defaults to `true`. Pass `false` for a host provider that is shut down and rebuilt while the exporters stay shared.
   */
  constructor(
    private readonly registry: ExporterRegistry,
    private readonly shutsDownExporters = true,
  ) {}

  /**
   * @description Copies the propagated Langfuse trace attributes (user, session, trace name, tags, metadata) from the parent context onto the new span and remembers it until it ends.
   * @param span {Span} - Span that just started.
   * @param parentContext {Context} - Context the span was started in.
   * @returns {void} Nothing.
   */
  onStart(span: Span, parentContext: Context): void {
    try {
      span.setAttributes(getPropagatedAttributesFromContext(parentContext));
      this.open.set(span.spanContext().spanId, span);
      this.hold(parentIdOf(span));
      if (this.open.size > MAX_REMEMBERED_SPANS) {
        this.evictOldestOpen();
      }
    } catch (error) {
      this.contain("start", span.name, error);
    }
  }

  /**
   * @description Exports an ended observation span without waiting for the exporters.
   * @param span {ReadableSpan} - Span that just ended.
   * @returns {void} Nothing.
   */
  onEnd(span: ReadableSpan): void {
    try {
      const { spanId } = span.spanContext();
      const exported = isExported(span);
      // Resolved before this span lets go of its ancestors, which the next
      // trim may then drop.
      const parentSpanId = exported
        ? this.nearestExportedAncestor(span)
        : undefined;
      if (this.open.delete(spanId) && !this.pins.has(spanId)) {
        this.release(parentIdOf(span));
      }
      this.remember(spanId, parentIdOf(span), exported);
      if (!exported) {
        return;
      }
      void this.exportQuietly(toSpanData(span, parentSpanId));
    } catch (error) {
      this.contain("end", span.name, error);
    }
  }

  /**
   * @description Flushes every exporter in the registry.
   * @returns {Promise<void>} Resolves when all exporters have flushed.
   */
  forceFlush(): Promise<void> {
    return this.registry.flushAll();
  }

  /**
   * @description Shuts down every exporter in the registry, or only flushes them when the processor was created to leave them running.
   * @returns {Promise<void>} Resolves when the exporters have shut down or flushed.
   */
  shutdown(): Promise<void> {
    return this.shutsDownExporters
      ? this.registry.shutdownAll()
      : this.registry.flushAll();
  }

  // Telemetry must not fail the code that created the span: the SDK calls
  // these hooks from span.start() and span.end() without a guard.
  private contain(stage: string, spanName: string, error: unknown): void {
    logger.debug(`[ExporterSpanProcessor] Could not process span on ${stage}`, {
      span: spanName,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  private async exportQuietly(spanData: SpanData): Promise<void> {
    try {
      await this.registry.exportToAll(spanData);
    } catch (error) {
      logger.debug("[ExporterSpanProcessor] Export failed", {
        spanId: spanData.spanId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // An open span holds its parent from its start; an ended span holds its
  // parent while it has holds of its own. The first hold on an ended span
  // therefore takes a hold on its parent, and so on up the chain.
  private hold(spanId: string | undefined): void {
    for (let current = spanId; current; ) {
      const held = this.pins.get(current) ?? 0;
      this.pins.set(current, held + 1);
      if (held > 0 || this.open.has(current)) {
        return;
      }
      current = this.ended.get(current)?.parentSpanId;
    }
  }

  // The last hold on an ended span releases its hold on its parent.
  private release(spanId: string | undefined): void {
    for (let current = spanId; current; ) {
      const remaining = (this.pins.get(current) ?? 0) - 1;
      if (remaining > 0) {
        this.pins.set(current, remaining);
        return;
      }
      this.pins.delete(current);
      if (this.open.has(current)) {
        return;
      }
      current = this.ended.get(current)?.parentSpanId;
    }
  }

  // The oldest open span, usually a long-lived root, moves to the ended map
  // with what its descendants need, instead of vanishing and orphaning them.
  private evictOldestOpen(): void {
    const oldest = this.open.entries().next().value;
    if (oldest === undefined) {
      return;
    }
    const [spanId, live] = oldest;
    this.open.delete(spanId);
    this.remember(spanId, parentIdOf(live), isExported(live));
    if (!this.pins.has(spanId)) {
      this.release(parentIdOf(live));
    }
    if (!this.evictionLogged) {
      this.evictionLogged = true;
      logger.debug(
        `[ExporterSpanProcessor] More than ${MAX_REMEMBERED_SPANS} spans are open; the oldest are remembered only for re-parenting`,
      );
    }
  }

  private remember(
    spanId: string,
    parentSpanId: string | undefined,
    exported: boolean,
  ): void {
    this.ended.delete(spanId);
    this.ended.set(spanId, { parentSpanId, exported });
    this.trimEnded();
  }

  // Drops the oldest entries that no open span descends from; a pinned entry
  // goes to the back so the next trim does not meet it first again.
  private trimEnded(): void {
    for (
      let attempts = this.ended.size;
      this.ended.size > MAX_REMEMBERED_SPANS && attempts > 0;
      attempts -= 1
    ) {
      const oldest = this.ended.entries().next().value;
      if (oldest === undefined) {
        return;
      }
      const [spanId, entry] = oldest;
      this.ended.delete(spanId);
      if (this.pins.has(spanId)) {
        this.ended.set(spanId, entry);
      }
    }
  }

  private nearestExportedAncestor(span: ReadableSpan): string | undefined {
    let candidate = parentIdOf(span);
    while (candidate) {
      const live = this.open.get(candidate);
      if (live) {
        if (isExported(live)) {
          return candidate;
        }
        candidate = parentIdOf(live);
        continue;
      }
      const finished = this.ended.get(candidate);
      if (!finished) {
        return undefined;
      }
      if (finished.exported) {
        return candidate;
      }
      candidate = finished.parentSpanId;
    }
    return undefined;
  }
}

/**
 * @description Creates a span processor that feeds NeuroLink's observation spans to an exporter registry. Add it to a host `TracerProvider` to deliver spans through the registered exporters (such as `LangfuseExporter`) instead of `LangfuseSpanProcessor`. Shutting that provider down shuts the registry's exporters down; pass `{ shutdownExporters: false }` to flush them and leave them running, so a provider the host rebuilds keeps exporting.
 * @param registry {ExporterRegistry} - Registry to export to; defaults to the process-wide registry.
 * @param options {ExporterSpanProcessorOptions} - `shutdownExporters` (default `true`) says whether the processor's `shutdown()` also shuts down the registry's exporters.
 * @returns {ExporterSpanProcessor} A processor ready to be added to a TracerProvider.
 * @example
 * const provider = new NodeTracerProvider({ spanProcessors: [createExporterSpanProcessor()] });
 * @example
 * // A host provider that is shut down and rebuilt over the same exporters
 * const processor = createExporterSpanProcessor(getExporterRegistry(), { shutdownExporters: false });
 */
export function createExporterSpanProcessor(
  registry: ExporterRegistry = getExporterRegistry(),
  options: ExporterSpanProcessorOptions = {},
): ExporterSpanProcessor {
  return new ExporterSpanProcessor(registry, options.shutdownExporters ?? true);
}
