/**
 * OpenTelemetry Bridge
 * Bidirectional context propagation between NeuroLink and OpenTelemetry
 */

import {
  context,
  propagation,
  type SpanContext,
  trace,
} from "@opentelemetry/api";
import type { SpanData } from "./types/spanTypes.js";
import { SpanStatus, type SpanType } from "./types/spanTypes.js";
import { SpanSerializer } from "./utils/spanSerializer.js";

/**
 * Bridge for bidirectional context propagation between
 * NeuroLink's observability system and OpenTelemetry
 */
export class OtelBridge {
  private readonly tracer = trace.getTracer("neurolink-bridge");

  /**
   * Extract trace context from incoming request headers
   */
  extractContext(headers: Record<string, string>): SpanContext | null {
    const extractedContext = propagation.extract(context.active(), headers);
    const spanContext = trace.getSpanContext(extractedContext);
    return spanContext ?? null;
  }

  /**
   * Inject trace context into outgoing request headers
   */
  injectContext(headers: Record<string, string>): Record<string, string> {
    propagation.inject(context.active(), headers);
    return headers;
  }

  /**
   * Create a NeuroLink span from OpenTelemetry context
   */
  createSpanFromOtelContext(
    spanContext: SpanContext,
    type: SpanType,
    name: string,
  ): SpanData {
    return SpanSerializer.createSpan(
      type,
      name,
      {},
      undefined,
      spanContext.traceId,
    );
  }

  /**
   * Wrap a function with OpenTelemetry tracing that also creates NeuroLink spans
   */
  async wrapWithTracing<T>(
    name: string,
    type: SpanType,
    fn: (span: SpanData) => Promise<T>,
    onSpanEnd?: (span: SpanData) => void,
  ): Promise<T> {
    const otelSpan = this.tracer.startSpan(name);
    const neuroLinkSpan = SpanSerializer.createSpan(
      type,
      name,
      {},
      undefined,
      otelSpan.spanContext().traceId,
    );

    try {
      const result = await context.with(
        trace.setSpan(context.active(), otelSpan),
        () => fn(neuroLinkSpan),
      );

      const endedSpan = SpanSerializer.endSpan(neuroLinkSpan, SpanStatus.OK);
      otelSpan.setStatus({ code: 1 }); // OK

      if (onSpanEnd) {
        onSpanEnd(endedSpan);
      }

      return result;
    } catch (error) {
      const endedSpan = SpanSerializer.endSpan(
        neuroLinkSpan,
        SpanStatus.ERROR,
        error instanceof Error ? error.message : String(error),
      );

      otelSpan.setStatus({
        code: 2, // ERROR
        message: error instanceof Error ? error.message : String(error),
      });
      otelSpan.recordException(error as Error);

      if (onSpanEnd) {
        onSpanEnd(endedSpan);
      }

      throw error;
    } finally {
      otelSpan.end();
    }
  }

  /**
   * Convert NeuroLink span to OpenTelemetry span and export
   */
  exportToOtel(span: SpanData): void {
    const otelSpan = this.tracer.startSpan(span.name, {
      startTime: new Date(span.startTime),
      attributes: this.filterAttributes(span.attributes),
    });

    // Add events
    for (const event of span.events) {
      otelSpan.addEvent(
        event.name,
        this.filterEventAttributes(event.attributes),
        new Date(event.timestamp),
      );
    }

    // Set status (map NeuroLink status to OTel status)
    const otelStatusCode = span.status === SpanStatus.ERROR ? 2 : 1;
    otelSpan.setStatus({
      code: otelStatusCode,
      message: span.statusMessage,
    });

    // End span
    if (span.endTime) {
      otelSpan.end(new Date(span.endTime));
    } else {
      otelSpan.end();
    }
  }

  /**
   * Get current trace context for correlation
   */
  getCurrentTraceContext(): { traceId: string; spanId: string } | null {
    const spanContext = trace.getActiveSpan()?.spanContext();
    if (!spanContext) {
      return null;
    }

    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
    };
  }

  /**
   * Filter attributes to only include OTel-compatible types
   */
  private filterAttributes(
    attrs: Record<string, unknown>,
  ): Record<string, string | number | boolean> {
    const result: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(attrs)) {
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        result[key] = value;
      } else if (value !== undefined && value !== null) {
        result[key] = JSON.stringify(value);
      }
    }
    return result;
  }

  /**
   * Filter event attributes
   */
  private filterEventAttributes(
    attrs?: Record<string, unknown>,
  ): Record<string, string | number | boolean> | undefined {
    if (!attrs) {
      return undefined;
    }
    return this.filterAttributes(attrs);
  }
}
