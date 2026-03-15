/**
 * Braintrust Exporter
 * Exports spans to Braintrust AI evaluation platform
 */

import { logger } from "../../utils/logger.js";
import type {
  BraintrustExporterConfig,
  ExporterHealthStatus,
  ExportResult,
  SpanData,
} from "../types/index.js";
import { BaseExporter } from "./baseExporter.js";

/**
 * Braintrust exporter for AI evaluation and scoring
 * Supports project logs and evaluation metrics
 */
export class BraintrustExporter extends BaseExporter {
  private readonly apiKey: string;
  private readonly projectName: string;
  private readonly endpoint: string;

  constructor(config: BraintrustExporterConfig) {
    super("braintrust", config);
    this.apiKey = config.apiKey;
    this.projectName = config.projectName;
    this.endpoint = config.endpoint ?? "https://api.braintrust.dev";
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Verify API key
    try {
      const response = await fetch(`${this.endpoint}/v1/project`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });

      if (!response.ok) {
        throw new Error(
          `Braintrust initialization failed: ${response.statusText}`,
        );
      }
    } catch (error) {
      logger.warn(
        "[Braintrust] Could not verify API connection:",
        error instanceof Error ? error.message : error,
      );
    }

    this.initialized = true;
    this.startFlushInterval(this.config.flushIntervalMs ?? 5000);
  }

  async exportSpan(span: SpanData): Promise<ExportResult> {
    const startTime = Date.now();

    try {
      const log = this.convertToBraintrustLog(span);

      const response = await fetch(
        `${this.endpoint}/v1/project_logs/${this.projectName}/insert`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({ events: [log] }),
        },
      );

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      return this.createSuccessResult(1, Date.now() - startTime);
    } catch (error) {
      return this.createFailureResult(
        [span.spanId],
        error instanceof Error ? error.message : String(error),
        Date.now() - startTime,
      );
    }
  }

  async exportBatch(spans: SpanData[]): Promise<ExportResult> {
    const startTime = Date.now();

    try {
      const events = spans.map((s) => this.convertToBraintrustLog(s));

      const response = await fetch(
        `${this.endpoint}/v1/project_logs/${this.projectName}/insert`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({ events }),
        },
      );

      if (!response.ok) {
        throw new Error(`Batch export failed: ${response.statusText}`);
      }

      return this.createSuccessResult(spans.length, Date.now() - startTime);
    } catch (error) {
      return this.createFailureResult(
        spans.map((s) => s.spanId),
        error instanceof Error ? error.message : String(error),
        Date.now() - startTime,
      );
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length > 0) {
      const spans = [...this.buffer];
      this.buffer = [];
      await this.exportBatch(spans);
    }
  }

  async shutdown(): Promise<void> {
    await this.flush();
    this.stopFlushInterval();
    this.initialized = false;
  }

  async healthCheck(): Promise<ExporterHealthStatus> {
    try {
      await this.withRetry(() => this.ping(), "health check");
      return this.createHealthStatus(true);
    } catch {
      return this.createHealthStatus(false, ["Health check failed"]);
    }
  }

  /**
   * Verify connectivity to Braintrust API
   */
  protected async ping(): Promise<void> {
    const response = await fetch(`${this.endpoint}/v1/project`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });

    if (!response.ok) {
      throw new Error(`Braintrust API unreachable: ${response.status}`);
    }
  }

  /**
   * Convert span to Braintrust log format
   */
  private convertToBraintrustLog(span: SpanData): Record<string, unknown> {
    return {
      project_name: this.projectName,
      id: span.spanId,
      span_id: span.spanId,
      root_span_id: span.parentSpanId ? undefined : span.spanId,
      span_parents: span.parentSpanId ? [span.parentSpanId] : [],
      input: span.attributes["input"],
      output: span.attributes["output"],
      expected: span.attributes["expected"],
      scores: span.attributes["scores"],
      metadata: {
        // Pick only safe, non-PII attributes for metadata (avoid leaking input/output)
        ...(span.attributes["ai.provider"] !== undefined && {
          "ai.provider": span.attributes["ai.provider"],
        }),
        ...(span.attributes["ai.model"] !== undefined && {
          "ai.model": span.attributes["ai.model"],
        }),
        // Explicit fields placed after spread so they always win
        provider: span.attributes["ai.provider"],
        model: span.attributes["ai.model"],
        type: span.type,
        status: span.status,
        statusMessage: span.statusMessage,
      },
      metrics: {
        tokens: span.attributes["ai.tokens.total"],
        prompt_tokens: span.attributes["ai.tokens.input"],
        completion_tokens: span.attributes["ai.tokens.output"],
        cost: span.attributes["ai.cost.total"],
        duration_ms: span.durationMs,
      },
      created: span.startTime,
      end_time: span.endTime,
    };
  }
}
