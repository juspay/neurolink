/**
 * Span Processor
 * Handles span processing before export - enrichment, filtering, and transformation
 * Fills the 9% gap in pattern compliance
 */

import type { SpanAttributes, SpanData } from "./types/index.js";

/**
 * Span processor interface
 * Allows for composable span processing pipelines
 */
export interface SpanProcessor {
  /** Processor name for identification */
  readonly name: string;

  /** Process a span before export, returns null to drop the span */
  process(span: SpanData): SpanData | null;

  /** Optional async processing (for external lookups, etc.) */
  processAsync?(span: SpanData): Promise<SpanData | null>;

  /** Shutdown the processor (cleanup resources) */
  shutdown?(): Promise<void>;
}

/**
 * No-op processor that passes spans through unchanged
 */
export class PassThroughProcessor implements SpanProcessor {
  readonly name = "pass-through";

  process(span: SpanData): SpanData {
    return span;
  }
}

/**
 * Attribute enrichment processor
 * Adds additional attributes to spans based on configuration
 */
export class AttributeEnrichmentProcessor implements SpanProcessor {
  readonly name = "attribute-enrichment";
  private readonly staticAttributes: SpanAttributes;
  private readonly dynamicAttributes: (
    span: SpanData,
  ) => Partial<SpanAttributes>;

  constructor(config: {
    staticAttributes?: SpanAttributes;
    dynamicAttributes?: (span: SpanData) => Partial<SpanAttributes>;
  }) {
    this.staticAttributes = config.staticAttributes ?? {};
    this.dynamicAttributes = config.dynamicAttributes ?? (() => ({}));
  }

  process(span: SpanData): SpanData {
    return {
      ...span,
      attributes: {
        ...this.staticAttributes,
        ...span.attributes,
        ...this.dynamicAttributes(span),
      },
    };
  }
}

/**
 * Filter processor - drops spans based on conditions
 */
export class FilterProcessor implements SpanProcessor {
  readonly name = "filter";
  private readonly predicate: (span: SpanData) => boolean;

  constructor(predicate: (span: SpanData) => boolean) {
    this.predicate = predicate;
  }

  process(span: SpanData): SpanData | null {
    return this.predicate(span) ? span : null;
  }
}

/**
 * Redaction processor - removes sensitive data from spans
 */
export class RedactionProcessor implements SpanProcessor {
  readonly name = "redaction";
  private readonly sensitiveKeys: Set<string>;
  private readonly redactedValue: string;

  constructor(config?: { sensitiveKeys?: string[]; redactedValue?: string }) {
    this.sensitiveKeys = new Set(
      config?.sensitiveKeys ?? [
        "api_key",
        "apiKey",
        "secret",
        "password",
        "token",
        "authorization",
        "credentials",
        "private_key",
        "privateKey",
        "stack",
        "error.stack",
      ],
    );
    this.redactedValue = config?.redactedValue ?? "[REDACTED]";
  }

  process(span: SpanData): SpanData {
    const redactedAttributes: SpanAttributes = {};

    for (const [key, value] of Object.entries(span.attributes)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = Array.from(this.sensitiveKeys).some((sensitiveKey) =>
        lowerKey.includes(sensitiveKey.toLowerCase()),
      );

      if (isSensitive && typeof value === "string") {
        redactedAttributes[key] = this.redactedValue;
      } else if (typeof value === "object" && value !== null) {
        redactedAttributes[key] = this.redactObject(value);
      } else {
        redactedAttributes[key] = value;
      }
    }

    return {
      ...span,
      attributes: redactedAttributes,
    };
  }

  private redactObject(obj: unknown): unknown {
    if (typeof obj !== "object" || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.redactObject(item));
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = Array.from(this.sensitiveKeys).some((sensitiveKey) =>
        lowerKey.includes(sensitiveKey.toLowerCase()),
      );

      if (isSensitive && typeof value === "string") {
        result[key] = this.redactedValue;
      } else if (typeof value === "object" && value !== null) {
        result[key] = this.redactObject(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}

/**
 * Truncation processor - truncates large attribute values
 */
export class TruncationProcessor implements SpanProcessor {
  readonly name = "truncation";
  private readonly maxStringLength: number;
  private readonly maxArrayLength: number;

  constructor(config?: { maxStringLength?: number; maxArrayLength?: number }) {
    this.maxStringLength = config?.maxStringLength ?? 10000;
    this.maxArrayLength = config?.maxArrayLength ?? 100;
  }

  process(span: SpanData): SpanData {
    return {
      ...span,
      attributes: this.truncateAttributes(span.attributes),
    };
  }

  private truncateAttributes(attrs: SpanAttributes): SpanAttributes {
    const result: SpanAttributes = {};

    for (const [key, value] of Object.entries(attrs)) {
      result[key] = this.truncateValue(value);
    }

    return result;
  }

  private truncateValue(value: unknown): unknown {
    if (typeof value === "string" && value.length > this.maxStringLength) {
      return value.substring(0, this.maxStringLength) + "...[truncated]";
    }

    if (Array.isArray(value) && value.length > this.maxArrayLength) {
      return [
        ...value.slice(0, this.maxArrayLength),
        `...[${value.length - this.maxArrayLength} more items]`,
      ];
    }

    if (typeof value === "object" && value !== null) {
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = this.truncateValue(v);
      }
      return result;
    }

    return value;
  }
}

/**
 * Composite processor - chains multiple processors together
 */
export class CompositeProcessor implements SpanProcessor {
  readonly name = "composite";
  private readonly processors: SpanProcessor[];

  constructor(processors: SpanProcessor[]) {
    this.processors = processors;
  }

  process(span: SpanData): SpanData | null {
    let result: SpanData | null = span;

    for (const processor of this.processors) {
      if (result === null) {
        return null;
      }
      result = processor.process(result);
    }

    return result;
  }

  async processAsync(span: SpanData): Promise<SpanData | null> {
    let result: SpanData | null = span;

    for (const processor of this.processors) {
      if (result === null) {
        return null;
      }

      if (processor.processAsync) {
        result = await processor.processAsync(result);
      } else {
        result = processor.process(result);
      }
    }

    return result;
  }

  async shutdown(): Promise<void> {
    await Promise.all(
      this.processors.map((p) =>
        p.shutdown ? p.shutdown() : Promise.resolve(),
      ),
    );
  }
}

/**
 * Batch processor - collects spans and processes them in batches
 */
export class BatchProcessor implements SpanProcessor {
  readonly name = "batch";
  private readonly innerProcessor: SpanProcessor;
  private readonly batchSize: number;
  private readonly flushIntervalMs: number;
  private batch: SpanData[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private onBatchReady?: (spans: SpanData[]) => void;

  constructor(config: {
    processor?: SpanProcessor;
    batchSize?: number;
    flushIntervalMs?: number;
    onBatchReady?: (spans: SpanData[]) => void;
  }) {
    this.innerProcessor = config.processor ?? new PassThroughProcessor();
    this.batchSize = config.batchSize ?? 100;
    this.flushIntervalMs = config.flushIntervalMs ?? 5000;
    this.onBatchReady = config.onBatchReady;

    this.startFlushTimer();
  }

  process(span: SpanData): SpanData | null {
    const processed = this.innerProcessor.process(span);
    if (processed) {
      this.batch.push(processed);

      if (this.batch.length >= this.batchSize) {
        this.flush();
      }
    }
    return processed;
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushIntervalMs);
  }

  // Note: flush() is intentionally synchronous. The onBatchReady callback is
  // typed as `(spans: SpanData[]) => void` — callers must not pass async
  // exporters. If async export is needed, the callback should handle its own
  // error reporting (e.g. fire-and-forget with promise error handlers).
  private flush(): void {
    if (this.batch.length > 0 && this.onBatchReady) {
      const spans = [...this.batch];
      try {
        this.onBatchReady(spans);
        this.batch = [];
      } catch (flushError: unknown) {
        // Keep spans for next flush attempt, but cap backlog growth
        void flushError; // acknowledged — error is expected during exporter outages
        const maxBacklog = this.batchSize * 20;
        if (this.batch.length > maxBacklog) {
          this.batch = this.batch.slice(this.batch.length - maxBacklog);
        }
      }
    }
  }

  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
    if (this.innerProcessor.shutdown) {
      await this.innerProcessor.shutdown();
    }
  }
}

/**
 * Factory for creating span processors
 */
export class SpanProcessorFactory {
  /**
   * Create a standard processor pipeline for production use
   */
  static createProductionPipeline(config?: {
    serviceName?: string;
    environment?: string;
    additionalProcessors?: SpanProcessor[];
  }): CompositeProcessor {
    const processors: SpanProcessor[] = [
      // Add service context
      new AttributeEnrichmentProcessor({
        staticAttributes: {
          "service.name": config?.serviceName ?? "neurolink",
          "deployment.environment": config?.environment ?? "production",
        },
      }),
      // Redact sensitive data
      new RedactionProcessor(),
      // Truncate large values
      new TruncationProcessor(),
    ];

    if (config?.additionalProcessors) {
      processors.push(...config.additionalProcessors);
    }

    return new CompositeProcessor(processors);
  }

  /**
   * Create a minimal processor pipeline for development
   */
  static createDevelopmentPipeline(): CompositeProcessor {
    return new CompositeProcessor([
      new AttributeEnrichmentProcessor({
        staticAttributes: {
          "deployment.environment": "development",
        },
      }),
    ]);
  }
}
